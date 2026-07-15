# Section 04: Replacement Passkey Lifecycle

## Background

Recovery is not complete when a Recovery Code matches. The user must create a new passkey through a strict WebAuthn ceremony, after which Authidenty atomically consumes the scoped authorization, revokes the lost credential, rotates the Recovery Code, records notification evidence, and requires a normal sign-in with the replacement. Until verification succeeds, existing credential and code state remain unchanged.

## Requirements

- Require an active, unexpired, user-bound Re-enrollment Grant for both replacement routes.
- Keep re-enrollment challenges separate from initial registration and Authentication challenges.
- Reuse strict RP ID, origin, and required user-verification checks.
- Exclude existing credential IDs from replacement options.
- Consume the grant exactly once and reject cross-account or wrong-purpose use.
- Revoke the reported lost credential only after the replacement attestation verifies.
- Complete credential insertion, grant consumption, transaction completion, revocation, code redemption/rotation, and notification insertion in one immediate SQLite transaction.
- Return the new Recovery Code plaintext once and no Application Session.
- Prove success by signing in through ordinary Authentication with the replacement credential.

## Dependencies

- Requires: section 02 passkey Authentication and section 03 recovery authorization.
- Blocks: sections 06 and 07.

## Flow Diagram Nodes

- **Diagram**: `flow-diagrams/replacement-passkey-completion.mmd`.
- **Nodes**: `GrantCheck`, `ReplacementPrompt`, `BeginCompletion`, `InsertReplacement`, `ConsumeGrant`, `RevokeLost`, `RedeemAndRotate`, `WriteNotifications`, `CommitCompletion`, `CompletionReceipt`, `ReplacementSignIn`, and `RecoveryProven`.
- **Branches**:
  - `GrantValid` — invalid authorization reaches `ReenrollReject` with no account change.
  - `ReplacementValid` — failed verification reaches `KeepOriginalState` and may retry only within policy.
  - `RecheckState` — any stale or mismatched state reaches `RollbackCompletion`.
  - `ReplacementWorks` — only a valid ordinary assertion proves the new passkey works.

## Reference Libraries

| Library | Version | Purpose |
|---|---:|---|
| `@simplewebauthn/server` | 13.3.2 | Replacement options and attestation verification |
| `@simplewebauthn/browser` | 13.3.0 | Platform passkey creation prompt |
| `better-sqlite3` | 12.11.1 | Atomic completion transaction |
| Zod | 4.4.3 | Route and state validation |
| Vitest | 4.1.10 | Service, route, and transaction tests |

Before implementation, inspect installed SimpleWebAuthn 13.3 types for `generateRegistrationOptions`, `verifyRegistrationResponse`, and credential fields.

## Implementation Details

### Re-enrollment service

Create `reenrollment-service.ts` with injected database, relying-party configuration, clock, random-token generator, code generator/digester, and optional WebAuthn verifier. Do not reuse the public initial-registration entry function because its account-conflict rule is intentionally different.

`beginReplacementRegistration` must:

1. Digest and resolve the `authidenty_reenrollment` cookie token.
2. Verify grant status `active`, purpose `replace_passkey`, matching Recovery Transaction/user, and unexpired transaction/grant/code reservation.
3. Load the user only from the grant binding, never from request JSON.
4. Generate registration options using the existing opaque WebAuthn user ID, `attestationType: "none"`, required resident key, and required user verification.
5. Put existing active credential IDs in `excludeCredentials`.
6. Store a five-minute `reenrollment` challenge bound to the same user and grant context.

`finishReplacementRegistration` consumes the ceremony challenge before verification so it cannot replay. If verification fails, return a typed failure while leaving the grant usable until its original expiry; issue a new challenge for the next attempt.

### Lost-credential selection

For the hackathon's disposable one-credential account, after deterministic Recovery Code authorization the server may bind the sole prior active credential as `reported_credential_id`. If zero or more than one eligible prior credential exists, do not guess: require a future authorized selection flow or return a typed unsupported state. Never accept an arbitrary credential ID before factor verification.

### Atomic completion

After WebAuthn verification succeeds, pass only verified public credential fields and the in-memory new code digest/plaintext pair to the repository completion transaction. Recheck every expected status inside that transaction.

All changes either commit together or none commit:

- insert the replacement credential as `active`;
- consume the Re-enrollment Grant;
- mark the Recovery Transaction `completed`;
- revoke the bound lost credential and set `revoked_at`;
- mark the reserved Recovery Code `redeemed`;
- insert exactly one new active Recovery Code digest;
- insert `recovery_completed` and `credential_revoked` notification records.

The completion function returns masked metadata plus the new plaintext code held only in memory. It clears the grant cookie. It does not set `authidenty_session`; the following screen starts normal Authentication.

### Routes

Implement the exact contracts in `api-spec.md`:

- `POST /api/recovery/reenroll/options` accepts `{}` and returns creation options.
- `POST /api/recovery/reenroll/verify` accepts `RegistrationResponseJSON` and returns the one-time code and receipt.

Both routes run on Node, require JSON, validate Origin/Host before body parsing, return `Cache-Control: no-store`, and use generic public authorization errors. The verify response also uses `Pragma: no-cache`. Never log request bodies, cookies, challenge values, or new codes.

### Completion receipt

Expose only suffixes and statuses:

- replacement credential suffix and `active`;
- revoked credential suffix and `revoked`;
- recovery timestamp;
- notification event names;
- new Recovery Code once.

Do not expose public keys, full credential IDs, internal row IDs, code digests, or correlation tokens.

## Test Scenarios

### Options and authorization

| Case | Input | Expected result |
|---|---|---|
| Active grant | Correct cookie and matching active state | 200 options, existing IDs excluded, challenge stored |
| No cookie | Empty request | 401 `REENROLLMENT_NOT_AUTHORIZED` |
| Expired grant | Matching digest after expiry | 401; no challenge |
| Cross-account state | Grant and transaction user mismatch | 401; no challenge or state change |
| Wrong purpose | Non-replacement grant | 401; no challenge |

### Verification and completion

| Case | Input | Expected result |
|---|---|---|
| Valid replacement | Verified attestation and current state | One atomic completion, one-time new code, receipt, cookie cleared |
| Invalid attestation | Bad challenge/origin/RP/user verification | 400; original credential/code/grant state unchanged except consumed challenge |
| Grant replay | Successful verify submitted twice | Second request rejected; no second credential/code |
| Credential conflict | Existing credential ID | 409; all completion changes rolled back |
| Recheck expiry | Grant expires between WebAuthn verification and transaction | 401; no state changes |
| Notification failure | Inject repository failure | Entire completion rolls back |
| Multiple old credentials | More than one eligible prior credential | Typed unsupported state; none revoked |
| Replacement sign-in | Normal assertion with new credential | Application Session issued |
| Revoked sign-in | Assertion with prior credential | Generic 401; no session |

### HTTP security

| Case | Input | Expected result |
|---|---|---|
| Cross-origin | Wrong Origin/Host | Rejected before body parsing |
| Wrong media type | Form or text body | 415 |
| Secret logging probe | Unique code and cookie values | Values absent from captured logs |

## Implementation Strategy

### Phase 1: Red

- Write service tests with injected verifier and clock for every grant/challenge/completion branch.
- Add route tests for cookies, headers, generic errors, and no Application Session.
- Add repository fault-injection tests proving full rollback.

### Phase 2: Green

- Implement grant-bound options and verification service.
- Add both routes and the minimal client call used later by section 06.
- Complete the disposable one-credential path only; do not add an unplanned credential manager.

### Phase 3: Refactor

- Share strict WebAuthn option fields and relying-party validation without weakening initial registration rules.
- Ensure public receipt mapping cannot leak database records.
- Run replacement sign-in and revoked-credential regression tests.

## Quality Gate

- [ ] Every successful ceremony consumes exactly one challenge.
- [ ] Grant validation is user-, transaction-, purpose-, status-, and expiry-bound.
- [ ] Failed verification never revokes a credential or redeems a code.
- [ ] Completion transaction has fault-injection rollback coverage.
- [ ] New Recovery Code is returned once and stored only as a digest.
- [ ] No Application Session is issued by recovery routes.
- [ ] Replacement sign-in succeeds and old credential sign-in fails.
- [ ] New or changed routes match `api-spec.md`.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.

## Risk and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| Lost credential revoked before replacement is durable | Critical | Revoke only inside verified completion transaction | Roll back transaction and retain original state |
| Grant reused for multiple credentials | Critical | Expected-status consume plus unique active-grant index | Disable routes and expire outstanding prototype grants |
| Wrong credential selected for revocation | High | Limit MVP to exactly one eligible previous credential | Abort completion and require a future selection design |
| New code exposed after response | High | No-store headers, no telemetry, digest-only persistence | Revoke generated code and repeat authorized recovery |

## Acceptance Criteria

- [ ] An authorized disposable user creates one replacement passkey without an admin action.
- [ ] One transaction performs credential insertion, authorization consumption, revocation, code rotation, and notifications.
- [ ] Every invalid, expired, replayed, or conflicting case leaves account-control state safe.
- [ ] Completion visibly returns masked active/revoked states and the new code once.
- [ ] The replacement passes normal Authentication and the revoked credential cannot sign in.
- [ ] All Test Scenarios and Quality Gate items pass.

## Files to Create or Modify

- `src/server/passkeys/reenrollment-service.ts` — grant-bound options and verification.
- `src/server/passkeys/reenrollment-service.test.ts` — ceremony and completion tests.
- `src/server/db/recovery-repository.ts` — atomic completion operation from section 01.
- `src/server/db/recovery-repository.test.ts` — rollback and replay coverage.
- `src/app/api/recovery/reenroll/options/route.ts` — replacement options route.
- `src/app/api/recovery/reenroll/options/route.test.ts` — route authorization tests.
- `src/app/api/recovery/reenroll/verify/route.ts` — replacement verification route.
- `src/app/api/recovery/reenroll/verify/route.test.ts` — response, cookie, and rollback tests.

Any additional API must be added to `api-spec.md` before implementation.
