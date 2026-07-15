# API Specification: Authidenty Hackathon MVP

Status: Implementation contract
Date: 2026-07-15
Base path: `/api`

## Contract Principles

- Every state-changing route is same-origin only, validates the expected `Origin` and `Host`, and accepts `Content-Type: application/json` unless the request has no body.
- Public authentication and recovery errors are deliberately generic. Detailed reasons may be recorded only as non-secret internal codes.
- Cookies are opaque random tokens. Persistent storage contains only token digests.
- WebAuthn ceremonies, Application Sessions, Recovery Transactions, and Re-enrollment Grants use separate cookies and cannot substitute for one another.
- Recovery Code candidates are accepted only by `/api/recovery/code/verify`. They never enter GPT input, chat history, logs, analytics, or notification records.
- The server computes the complete set of allowed Recovery Actions. GPT-5.6 may explain or prioritize that set but cannot add an action.
- All timestamps are ISO 8601 UTC strings in public JSON. Secret values are returned only when explicitly marked one-time.

## Shared Types

```ts
type FailureCode =
  | "prompt_cancelled"
  | "prompt_timed_out"
  | "credential_unavailable"
  | "device_lost"
  | "browser_unsupported"
  | "unknown_failure";

type RecoveryAction =
  | "retry_passkey"
  | "use_another_passkey"
  | "verify_recovery_code"
  | "create_replacement_passkey"
  | "restart_recovery"
  | "self_service_unavailable";

type ApiError = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};
```

## Cookie Matrix

| Cookie | Path | Default lifetime | Purpose | May authorize |
|---|---|---:|---|---|
| `authidenty_registration` | `/api/passkeys/register` | 5 minutes | Initial registration ceremony lookup | Initial credential verification only |
| `authidenty_authentication` | `/api/passkeys/authenticate` | 5 minutes | Authentication challenge lookup | Assertion verification only |
| `authidenty_session` | `/` | 30 minutes | Application Session lookup | Authenticated application actions only |
| `authidenty_recovery` | `/api/recovery` | 10 minutes | Recovery Transaction lookup | Diagnosis and factor verification context only |
| `authidenty_reenrollment` | `/api/recovery/reenroll` | 10 minutes | Re-enrollment Grant lookup | Replacement passkey ceremony only |

All cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` outside localhost. Expired, consumed, or mismatched server records invalidate a cookie even if the browser still sends it.

## Registration

### POST `/api/passkeys/register/options`

Starts the existing initial registration ceremony. It does not add a credential to an existing account.

Request:

```json
{
  "username": "demo@example.com",
  "displayName": "Demo User"
}
```

Response `200`: `PublicKeyCredentialCreationOptionsJSON` from SimpleWebAuthn and the `authidenty_registration` cookie.

Errors:

| Status | Code | Meaning |
|---:|---|---|
| 400 | `INVALID_PROFILE` | Invalid normalized username or display name |
| 409 | `ACCOUNT_REQUIRES_SIGN_IN` | Existing account must use an authenticated credential-management flow |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | JSON content type missing |
| 500 | `REGISTRATION_UNAVAILABLE` | Safe generic server failure |

### POST `/api/passkeys/register/verify`

Verifies the attestation response, stores the public credential, creates the first Recovery Code digest, and returns the plaintext Recovery Code once.

Request: `RegistrationResponseJSON` from SimpleWebAuthn.

Response `200`:

```json
{
  "verified": true,
  "username": "demo@example.com",
  "credential": {
    "idSuffix": "a91f",
    "backedUp": true,
    "deviceType": "multiDevice",
    "status": "active"
  },
  "recovery": {
    "code": "A3F7-K9QM-2WXT-8N4P",
    "displayOnce": true,
    "readiness": "recovery-code-configured"
  }
}
```

The response clears `authidenty_registration`. The `recovery.code` value must never be returned by another read endpoint.

Errors: `REGISTRATION_SESSION_MISSING`, `REGISTRATION_SESSION_EXPIRED`, or generic `VERIFICATION_FAILED`, all `400`.

## Passkey Authentication

### POST `/api/passkeys/authenticate/options`

Creates a short-lived authentication challenge for a username-first sign-in.

Request:

```json
{ "username": "demo@example.com" }
```

Response `200`: `PublicKeyCredentialRequestOptionsJSON` and the `authidenty_authentication` cookie. The allow-credentials list contains only active credentials for the matched account. Unknown accounts receive a normalized public failure contract without exposing database details.

Errors:

| Status | Code | Public message |
|---:|---|---|
| 400 | `INVALID_SIGN_IN_REQUEST` | Enter a valid account identifier. |
| 401 | `SIGN_IN_FAILED` | Passkey sign-in could not be started. |
| 429 | `SIGN_IN_THROTTLED` | Try again later. |

### POST `/api/passkeys/authenticate/verify`

Verifies an assertion against the stored challenge, active credential, expected account, RP ID, origin, and required user verification. It consumes the challenge, updates credential use state, and issues an Application Session atomically.

Request: `AuthenticationResponseJSON` from SimpleWebAuthn.

Response `200`:

```json
{
  "verified": true,
  "account": {
    "username": "demo@example.com",
    "displayName": "Demo User"
  },
  "credential": {
    "idSuffix": "a91f",
    "status": "active",
    "lastUsedAt": "2026-07-15T07:00:00.000Z"
  }
}
```

The response sets `authidenty_session` and clears `authidenty_authentication`.

Errors:

| Status | Code | Behavior |
|---:|---|---|
| 400 | `AUTHENTICATION_SESSION_INVALID` | Missing, expired, already consumed, or malformed ceremony |
| 401 | `SIGN_IN_FAILED` | Unknown, wrong-account, revoked, or invalid credential; no session |
| 429 | `SIGN_IN_THROTTLED` | No verification attempt while throttled |

### POST `/api/session/logout`

Requires no request body. Revokes the current Application Session record when present and always clears `authidenty_session`.

Response `204`: no body. Repeated logout is idempotent.

## Recovery Transaction and Guidance

### POST `/api/recovery/start`

Starts a short-lived Recovery Transaction after a real or deliberately simulated sign-in failure. This is not authentication.

Request:

```json
{
  "username": "demo@example.com",
  "failureCode": "device_lost"
}
```

Response `200`:

```json
{
  "started": true,
  "failureCode": "device_lost",
  "status": "diagnosing",
  "allowedActions": ["use_another_passkey", "verify_recovery_code"],
  "expiresAt": "2026-07-15T07:10:00.000Z"
}
```

The response sets `authidenty_recovery`. Unknown accounts use a generic safe response and never expose factor configuration. The private server projection may contain a decoy state solely to equalize public behavior.

Errors: `INVALID_RECOVERY_REQUEST` (`400`), `RECOVERY_THROTTLED` (`429`), and `RECOVERY_UNAVAILABLE` (`503`).

### POST `/api/recovery/agent`

Explains the current server-owned policy projection. The route looks up the Recovery Transaction from its cookie; the client cannot submit `allowedActions` or factor availability.

Request:

```json
{
  "message": "My laptop was lost and the passkey prompt is unavailable.",
  "history": [
    { "role": "assistant", "content": "Do you still have another registered device?" },
    { "role": "user", "content": "No." }
  ]
}
```

Response `200`:

```json
{
  "diagnosis": "The registered passkey is probably unavailable with the lost device.",
  "guidance": "Use the saved Recovery Code in the separate Security Authorization step.",
  "actions": ["verify_recovery_code"],
  "source": "gpt-5.6",
  "boundary": "Guidance only. Server policy controls re-enrollment."
}
```

`source` is `gpt-5.6` or `deterministic-fallback`. After schema validation, the server intersects model actions with the complete policy set and restores any mandatory safe alternative that the model omitted.

Errors: `INVALID_RECOVERY_CONTEXT` (`400`) or `RECOVERY_TRANSACTION_INVALID` (`401`). Model absence, timeout, refusal, or invalid output returns the successful fallback shape instead of blocking recovery.

### GET `/api/recovery/status`

Returns a sanitized resumable state for the Recovery Transaction. It never returns account existence, code metadata, token values, internal risk data, or conversation content.

Response `200`:

```json
{
  "status": "factor_required",
  "allowedActions": ["verify_recovery_code"],
  "expiresAt": "2026-07-15T07:10:00.000Z"
}
```

Errors: generic `RECOVERY_TRANSACTION_INVALID` (`401`).

## Deterministic Recovery Authorization

### POST `/api/recovery/code/verify`

Accepts the candidate only in this endpoint. A successful request reserves the active Recovery Code to the current Recovery Transaction and creates one Re-enrollment Grant.

Request:

```json
{ "code": "A3F7-K9QM-2WXT-8N4P" }
```

Response `200`:

```json
{
  "authorized": true,
  "status": "authorized",
  "nextAction": "create_replacement_passkey",
  "expiresAt": "2026-07-15T07:10:00.000Z"
}
```

The response sets `authidenty_reenrollment`. It does not set `authidenty_session` and does not mark the Recovery Code redeemed yet.

Errors:

| Status | Code | Behavior |
|---:|---|---|
| 400 | `INVALID_RECOVERY_CODE` | Generic wrong, malformed, redeemed, or unbound response |
| 401 | `RECOVERY_TRANSACTION_INVALID` | Missing, expired, or wrong transaction |
| 409 | `RECOVERY_ALREADY_AUTHORIZED` | Transaction already owns an active grant; no second grant |
| 429 | `RECOVERY_CODE_THROTTLED` | Includes bounded `retryAfterSeconds` |

Concurrent valid submissions produce exactly one successful reservation and at most one active grant.

## Replacement Passkey

### POST `/api/recovery/reenroll/options`

Validates the Re-enrollment Grant and creates a replacement-registration challenge bound to its user and purpose.

Request: `{}`.

Response `200`: `PublicKeyCredentialCreationOptionsJSON`. Existing active credential IDs are excluded. The response never exposes account profile or credential inventory.

Errors: generic `REENROLLMENT_NOT_AUTHORIZED` (`401`) or `REENROLLMENT_UNAVAILABLE` (`503`).

### POST `/api/recovery/reenroll/verify`

Verifies the replacement attestation and completes all state changes in one database transaction: insert replacement credential, consume grant, complete Recovery Transaction, revoke the reported lost credential, redeem the old Recovery Code, create a new code digest, and write notification records.

Request: `RegistrationResponseJSON` from SimpleWebAuthn.

Response `200`:

```json
{
  "verified": true,
  "recoveryCode": {
    "code": "Q8JV-4M2R-K7WT-9P3C",
    "displayOnce": true
  },
  "receipt": {
    "replacementCredential": { "idSuffix": "b42e", "status": "active" },
    "revokedCredential": { "idSuffix": "a91f", "status": "revoked" },
    "recoveredAt": "2026-07-15T07:05:00.000Z",
    "notifications": ["recovery_completed", "credential_revoked"]
  }
}
```

The response clears `authidenty_reenrollment`. It does not issue an Application Session; the user proves the replacement works through normal passkey sign-in.

Errors:

| Status | Code | State guarantee |
|---:|---|---|
| 400 | `REENROLLMENT_VERIFICATION_FAILED` | No new credential, revocation, code redemption, or notification |
| 401 | `REENROLLMENT_NOT_AUTHORIZED` | Missing, expired, consumed, wrong-user, or wrong-purpose grant |
| 409 | `CREDENTIAL_ALREADY_REGISTERED` | No partial state changes |

## Security Headers and Cache Policy

- All API responses use `Cache-Control: no-store`.
- Recovery Code and completion responses additionally use `Pragma: no-cache` and must not be included in client telemetry.
- State-changing route middleware rejects cross-origin requests before reading secret-bearing bodies.
- API error logging records route, internal error class, and correlation ID only; never request bodies or cookie values.

## Deferred APIs

The MVP deliberately omits authenticated second-passkey management, Recovery Code rotation outside a completed recovery, email/SMS delivery, recovery contacts, identity-document upload, administrative override, and behavioral-authentication scoring. Adding an endpoint during implementation requires updating this specification before code is merged.
