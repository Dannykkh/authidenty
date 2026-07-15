# Section 02: Passkey Authentication

## Background

Authidenty can register a public passkey credential but cannot authenticate a returning Account Holder. This section adds username-first WebAuthn Authentication, an opaque server-backed Application Session, logout, and a focused sign-in UI. It extends the existing registration patterns instead of replacing them.

Authentication is the only ordinary path that creates an Application Session. A Recovery Transaction, Recovery Code, GPT response, or Re-enrollment Grant must never call the session issuer.

## Requirements

- Implement `POST /api/passkeys/authenticate/options` and `POST /api/passkeys/authenticate/verify` exactly as defined in `api-spec.md`.
- Generate five-minute, single-use Authentication challenges for active credentials only.
- Verify the assertion against the expected account, challenge, RP ID, exact origin, and required user verification.
- Reject unknown, wrong-account, revoked, expired, malformed, and replayed credentials with generic public errors.
- Persist the verified counter, device type, backup state, and `last_used_at` without inventing counter rules outside SimpleWebAuthn.
- Issue a 30-minute, digest-backed Application Session only after successful cryptographic verification.
- Implement idempotent `POST /api/session/logout` and clear the session cookie on every outcome.
- Enforce same-origin/host checks, media type, `Cache-Control: no-store`, and cookie separation.
- Add a returning-user UI whose hook owns WebAuthn and HTTP orchestration while components own rendering only.
- Preserve initial registration and do not add recovery authorization in this section.

## Dependencies

- Requires: section 01 migration 002 and the credential, challenge, and session repository contracts.
- Blocks: sections 04, 06, and 07.
- May run beside section 03 only after shared repository and HTTP-helper interfaces are fixed; neither worker edits the other's routes or services.

## Flow Diagram Nodes

- **Diagram**: `flow-diagrams/passkey-setup-authentication.mmd`.
- **Owned nodes**:
  - `AuthStart` — render the returning-user entry state.
  - `UsernameInput` — collect and normalize the account identifier.
  - `AuthOptions` — generate options and bind a challenge to the Authentication cookie.
  - `AuthPrompt` — call `startAuthentication` in the browser.
  - `AssertionValid` — check ceremony, credential ownership/status, signature, RP ID, origin, and user verification.
  - `UpdateCredentialUse` — consume the challenge and persist verified credential metadata.
  - `IssueSession` — persist a token digest and set the Application Session cookie.
  - `Authenticated` — show a signed-in receipt without exposing credential material.
- **Branches**:
  - `AssertionValid -- No --> AuthFailure` — one generic failure surface with retry and recovery entry actions.
  - `AssertionValid -- Yes --> UpdateCredentialUse` — only a verified assertion can enter the success transaction.
- `AuthFailure` may navigate to section 05 recovery diagnosis, but it conveys no authorization state.

## Reference Libraries

| Library | Version | Purpose |
|---|---:|---|
| `@simplewebauthn/browser` | 13.3.0 | `startAuthentication` and browser error classification |
| `@simplewebauthn/server` | 13.3.2 | Options generation, assertion verification, and verified counter/backup fields |
| Next.js | 16.2.10 | App Router route handlers, `NextRequest`, and `NextResponse` cookies |
| React | 19.2.4 | Sign-in state and accessible rendering |
| Zod | 4.4.3 | Username and internal result validation |
| `better-sqlite3` | 12.11.1 | Immediate success transaction |
| Vitest | 4.1.10 | Service, route, cookie, and hook-boundary tests |

Before implementation, read the installed Next.js route-handler guide under `node_modules/next/dist/docs/` and the installed SimpleWebAuthn authentication declarations. Use the 13.3.2 `credential` input shape and `authenticationInfo` result; do not copy a pre-v13 authenticator example.

## Implementation Details

### Authentication service boundary

Create `authentication-service.ts` beside `registration-service.ts`. Keep route parsing and cookie attributes outside the service. Export typed begin/finish functions plus narrow public error classes; never return raw repository records.

`beginPasskeyAuthentication` must:

1. Normalize a trimmed, lower-case email through Zod.
2. Resolve the user and list active credentials only.
3. Return one typed generic start failure when the user is absent or has no active credential.
4. Call `generateAuthenticationOptions` with the configured RP ID, `userVerification: "required"`, a 120-second browser timeout, and `allowCredentials` containing only `{ id, transports }`.
5. Store the challenge with the route-generated opaque ceremony ID, expected user, type `authentication`, and `now + 300` expiry.
6. Return only the public options.

`finishPasskeyAuthentication` must:

1. Resolve the unconsumed challenge without deleting it yet; reject a missing, expired, or wrong-type record.
2. Find `response.id` as an active credential belonging to the challenge user; do not fall back to an ID-only lookup.
3. Call `verifyAuthenticationResponse` with the submitted response, stored challenge, configured exact origin and RP ID, stored credential `{ id, publicKey, counter, transports }`, and `requireUserVerification: true`.
4. Require `verified === true`, `authenticationInfo.credentialID === stored id`, and the expected verified RP ID/origin.
5. Generate at least 32 random bytes for the Application Session bearer, digest it for storage, and prepare a 30-minute expiry.
6. Enter one immediate database transaction that conditionally deletes the still-current challenge, conditionally updates the still-active credential from the expected prior counter, and inserts the session digest.
7. Roll back all three success mutations if any conditional write changes anything other than one row or session insertion fails.
8. Return the plaintext bearer only to the route layer along with the sanitized account and credential suffix.

WebAuthn verification is asynchronous and occurs before the database transaction. Concurrent verifications can therefore compute, but only one can delete the expected challenge and commit. The loser returns `AUTHENTICATION_SESSION_INVALID` and issues no session.

### Counter and credential metadata

Pass the stored counter to SimpleWebAuthn and persist `authenticationInfo.newCounter` exactly after a verified result. Also persist `credentialDeviceType`, `credentialBackedUp`, and `last_used_at = now` in the same success transaction.

Do not add a blanket `newCounter > oldCounter` rule. Multi-device credentials can legitimately report zero; SimpleWebAuthn applies its supported counter semantics. The conditional database update must still include the previously read counter, user ID, credential ID, and `status = 'active'` to prevent a stale verification from overwriting concurrent use or revocation.

### Application Session service

Create a small `application-session-service.ts` under `src/server/auth/`. It may generate, digest, resolve, and revoke session bearers through `session-repository.ts`; it must not accept recovery or grant tokens. Use constant-time digest comparison where comparison occurs outside indexed lookup.

Session resolution requires a matching digest, `revoked_at IS NULL`, and `expires_at > now`. Logout hashes the presented bearer, revokes a matching live row idempotently, and discloses no existence result. Do not put username, user ID, expiry, or authorization claims in the cookie value.

### Route request guards

Create `src/server/http/same-origin-json.ts` as the shared request guard. Its fixed contract is available to later sections, but this section owns the file.

For every state-changing route:

- resolve the configured relying party first;
- require `Origin` to equal `relyingParty.origin` exactly;
- require `Host` to equal `new URL(relyingParty.origin).host`, including the configured port;
- reject missing or mismatched values before reading a body;
- require a media type beginning with `application/json` for routes with JSON bodies;
- return `415 UNSUPPORTED_MEDIA_TYPE` for a body route with another media type;
- return a generic `403 REQUEST_ORIGIN_REJECTED` for origin or host failure;
- set `Cache-Control: no-store` on success and error responses;
- log only route, safe internal error class, and correlation ID.

Logout has no body and therefore skips the content-type check, but it still requires the origin/host guard.

### Authentication routes and cookies

`POST /api/passkeys/authenticate/options` generates a random ceremony ID in the route, calls the begin service, and sets:

`authidenty_authentication`: `HttpOnly`, `SameSite=Strict`, `Path=/api/passkeys/authenticate`, `Max-Age=300`, and `Secure` when the configured origin is HTTPS.

Return `INVALID_SIGN_IN_REQUEST` for invalid input, `SIGN_IN_FAILED` for unknown/no-active account state, and `SIGN_IN_THROTTLED` only when a real authentication throttle is implemented. Do not return factor counts, user IDs, display names, or credential IDs from options failures.

`POST /api/passkeys/authenticate/verify` reads only `authidenty_authentication`, parses an `AuthenticationResponseJSON`, and calls the finish service. On success it sets:

`authidenty_session`: the plaintext random bearer, `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age=1800`, and `Secure` on HTTPS.

The route clears the Authentication cookie on every terminal verify result with the identical name, path, SameSite, HttpOnly, and Secure attributes. It returns only the account display fields, credential ID suffix, status, and ISO `lastUsedAt` defined in `api-spec.md`.

Map missing, expired, consumed, and race-lost ceremonies to `AUTHENTICATION_SESSION_INVALID` (`400`). Map unknown, wrong-account, revoked, malformed, signature, origin, RP, and user-verification failures to `SIGN_IN_FAILED` (`401`). These public mappings must not include library messages.

`POST /api/session/logout` reads only `authidenty_session`, attempts idempotent revocation when present, clears that cookie with `Path=/`, and always returns `204`. A Recovery Transaction or Re-enrollment Grant cookie cannot be accepted as a session.

### UI and hook boundary

Create `use-passkey-authentication.ts` as a client hook. It owns the options fetch, `startAuthentication({ optionsJSON })`, verification fetch, busy phases, and mapping of `WebAuthnError` to safe user guidance. It returns state plus `signIn(username)` and `reset()`; it does not render, store cookies, call recovery APIs, or contain model logic.

Create `passkey-sign-in.tsx` as a presentational form using `autocomplete="username webauthn"`, an `aria-live` status region, visible focus, disabled busy states, and explicit retry/recovery actions. Treat `NotAllowedError` as cancelled/timed-out guidance, unsupported WebAuthn as a capability explanation, and all server verification failures as the generic sign-in message.

Create a minimal `passkey-access.tsx` owner for register/sign-in view selection and render it from `page.tsx`. Keep recovery navigation as a callback boundary for sections 05–06. Do not merge registration and authentication network logic into one hook.

## Test Scenarios

### Service and persistence

| Case | Input | Expected result |
|---|---|---|
| Begin success | Known user with two active credentials | Options include only both active IDs; challenge stored for expected user |
| Unknown/no active | Unknown username or only revoked credentials | Same typed generic start failure; no challenge |
| Verify success | Valid assertion and current challenge | Challenge consumed, metadata updated, one session inserted |
| Wrong account | Credential ID owned by another user | Generic failure; challenge/session/credential state unchanged |
| Revoked credential | Assertion references revoked credential | Generic failure; no verifier call or session |
| Replay/race | Same challenge finishes twice | Exactly one commit and one session |
| Session insert failure | Valid assertion with injected insert error | Challenge and credential update roll back |
| Multi-device zero | Stored and verified counters are zero | Library-verified result succeeds; last-used and backup fields update |
| Counter conflict | Credential counter changes after verification snapshot | Success transaction rolls back; new ceremony required |

### Route, cookie, and UI

| Case | Action | Expected result |
|---|---|---|
| Wrong/missing origin or host | POST any owned route | Generic 403 before body/service work |
| Wrong media type | POST options or verify | 415; no challenge or session |
| Successful verify | Valid route request | Session cookie has exact flags; ceremony cookie cleared; no-store header |
| Failed verify | Invalid assertion | Generic error; ceremony cookie cleared; no session cookie |
| Logout twice | Same or absent session | Both return 204 and clear `Path=/` cookie |
| Prompt cancelled | Browser throws `NotAllowedError` | Retry guidance; no claim that the device is lost |
| Keyboard flow | Username, submit, retry, recovery link | Logical focus order and announced status |

## Implementation Strategy

### Phase 1: Red

- Add service tests with injected generator/verifier and deterministic time/random values.
- Add transaction tests for race, rollback, revoked credential, and multi-device counter cases.
- Add route tests for request guards, public error mapping, cookie separation, and cache headers.
- Add hook/component tests for busy, cancelled, unsupported, failure, and success states.

### Phase 2: Green

- Implement repository primitives and the success unit of work first.
- Implement service begin/finish functions with injected verifier seams.
- Add shared request guards, then options, verify, and logout routes.
- Add the hook and minimal returning-user view last.

### Phase 3: Refactor

- Centralize cookie constants and response helpers without weakening route-specific paths.
- Remove duplicate error mapping while keeping public and internal errors separate.
- Run registration and recovery-agent regression tests before changing the page entry component.

## Quality Gate

- [ ] Installed Next.js and SimpleWebAuthn 13.3 APIs were checked before coding.
- [ ] Every success mutation is in one immediate transaction with conditional writes.
- [ ] Counter-zero multi-device and stale-counter race tests pass.
- [ ] Only Authentication issues `authidenty_session`; its digest alone is persisted.
- [ ] Origin, host, JSON content type, no-store, cookie path, expiry, and Secure behavior are tested.
- [ ] Public failures contain no credential, account, library, signature, RP, or origin detail.
- [ ] Logout is idempotent and cannot consume a recovery or re-enrollment cookie.
- [ ] Registration still works and its ceremony cookie remains isolated.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] Every owned flow node and branch has a service, route, UI state, or test.

## Risk and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| Session issued after stale/replayed assertion | Critical | Conditional challenge delete and session insert in one immediate transaction | Disable verify route and revert auth/session commits; registration remains available |
| Counter logic rejects synced passkeys | High | Delegate semantics to SimpleWebAuthn and test zero counters | Revert custom metadata rule; never reset stored counter manually |
| Cross-account credential lookup | Critical | Query by credential ID, expected user, and active status | Disable sign-in until ownership test is green |
| Cookie scope confusion | High | Exact cookie matrix and negative substitution tests | Clear affected cookies and rotate prototype session records |
| Username enumeration | Medium | Generic errors, no metadata, bounded timing review | Remove username-first public demo or add a decoy-options strategy in a spec revision |

## Acceptance Criteria

- [ ] A registered user signs in with an active passkey and receives one 30-minute Application Session.
- [ ] The challenge is one-time and a replay or concurrent finish cannot issue a second session.
- [ ] Unknown, wrong-account, revoked, expired, and invalid assertions create no session and disclose only generic errors.
- [ ] Verified credential counter, device type, backup state, and last-used time persist atomically with session creation.
- [ ] Logout revokes the stored session and is repeatable without revealing prior state.
- [ ] The returning-user UI supports success, retry, unsupported, and recovery-entry states with keyboard access.
- [ ] All Test Scenarios and Quality Gate items pass.

## Files to Create or Modify

- `src/server/passkeys/authentication-service.ts` — options and assertion orchestration.
- `src/server/passkeys/authentication-service.test.ts` — verification, ownership, counter, and race tests.
- `src/server/auth/application-session-service.ts` — opaque session lifecycle.
- `src/server/auth/application-session-service.test.ts` — resolve, expiry, and idempotent revoke tests.
- `src/server/http/same-origin-json.ts` — exact Origin/Host, media-type, and no-store helpers.
- `src/server/http/same-origin-json.test.ts` — missing/mismatch and localhost/HTTPS cases.
- `src/server/db/passkey-repository.ts` — active authentication lookup and conditional challenge/metadata writes.
- `src/server/db/passkey-repository.test.ts` — authentication repository invariants.
- `src/server/db/session-repository.ts` — session insert, resolve, and revoke calls used here.
- `src/app/api/passkeys/authenticate/options/route.ts` — Authentication options endpoint.
- `src/app/api/passkeys/authenticate/options/route.test.ts` — request, error, and ceremony-cookie contract.
- `src/app/api/passkeys/authenticate/verify/route.ts` — assertion endpoint and session-cookie issuance.
- `src/app/api/passkeys/authenticate/verify/route.test.ts` — error mapping and cookie isolation.
- `src/app/api/session/logout/route.ts` — idempotent session revocation.
- `src/app/api/session/logout/route.test.ts` — repeated and absent-session behavior.
- `src/features/passkeys/hooks/use-passkey-authentication.ts` — browser/API orchestration.
- `src/features/passkeys/components/passkey-sign-in.tsx` — accessible sign-in states.
- `src/features/passkeys/components/passkey-access.tsx` — minimal register/sign-in view owner.
- `src/features/passkeys/components/passkey-registration.tsx` — accept wrapper navigation callbacks only.
- `src/app/page.tsx` — render the access wrapper.

Any changed public status, error code, cookie, or route must update `api-spec.md` and the flow diagram before implementation is merged.
