# Section 03: Recovery Authorization

## Background

Authidenty currently verifies an initial passkey and offers a stateless GPT-5.6 recovery conversation. It does not issue an independent recovery factor, bind diagnosis to server state, throttle factor attempts, or authorize replacement enrollment. This section adds those missing authorization controls without treating GPT output as proof of account control.

The security boundary is deliberate: a Recovery Code proves possession of a saved account-control factor; a Recovery Transaction supplies short-lived workflow context; and a Re-enrollment Grant authorizes only one replacement-passkey ceremony. None of these states is an Application Session.

This section owns initial Recovery Code issuance, Recovery Transaction start/status, deterministic code verification, atomic reservation, throttling, and one scoped grant. Replacement registration, credential revocation, and code rotation belong to section 04. GPT policy projection and fallback wording belong to section 05.

## Requirements

- Issue one high-entropy Recovery Code only after the first passkey attestation verifies.
- Return the initial plaintext code once and persist only a versioned keyed digest.
- Bind recovery work to a ten-minute Recovery Transaction cookie without authenticating the user, and expose only sanitized status and server-owned Recovery Actions.
- Accept Recovery Code candidates only at `POST /api/recovery/code/verify`.
- Normalize and digest candidates deterministically; never use a plain unsalted hash.
- Throttle by keyed account and client buckets without storing raw usernames or IP addresses.
- Reserve an active code and create exactly one active Re-enrollment Grant in one immediate transaction.
- Keep the code `reserved`, not `redeemed`, until section 04 completes replacement registration.
- Issue a ten-minute, single-purpose grant cookie scoped to re-enrollment routes.
- Return generic public errors for invalid, absent, redeemed, cross-account, or expired state.
- Never send a code, digest, grant token, cookie, throttle key, or internal account result to GPT-5.6.
- Enforce same-origin, expected Host, JSON content type, `Cache-Control: no-store`, and secret-safe logging on all applicable routes.

## Dependencies

- Requires: section 01 migration and repository contracts.
- Can run in parallel with: section 02 after section 01 tests pass and shared contracts are frozen.
- Blocks: sections 04, 05, 06, and 07.
- Consumes: `recovery_codes`, `recovery_transactions`, `reenrollment_grants`, and `recovery_rate_limits` from migration 002.
- Does not consume or create: `application_sessions`.

## Flow Diagram Nodes and Branches

- **Diagram**: `flow-diagrams/recovery-code-authorization.mmd`.
- `CodeSubmit`: the dedicated form posts a code outside chat.
- `TransactionCheck`: resolve the Recovery Transaction from the recovery cookie and verify status, subject, and expiry.
- `RestartRecovery`: reject a missing, expired, or mismatched transaction and require `/api/recovery/start`.
- `ThrottleCheck`: evaluate subject/client buckets before any factor comparison.
- `Throttled`: return a bounded retry time without revealing factor state.
- `DigestCandidate`: normalize the candidate and calculate its versioned keyed digest.
- `CodeMatch`: compare only against the transaction user's current active code.
- `RecordFailure`: increment throttle state for every non-match or unusable factor result.
- `GenericReject`: return the same public response for malformed, wrong, redeemed, revoked, or cross-user input.
- `BeginImmediate`: enter the repository's SQLite immediate transaction.
- `ReservationAvailable`: recheck that code and transaction retain the expected prior states.
- `RollbackConflict`: roll back replay or race conflicts without issuing a second grant.
- `ReserveCode`: transition `active` to `reserved` and bind the code to this transaction.
- `CreateGrant`: persist one active purpose-bound grant digest.
- `CommitAuthorization`: commit all authorization state or none of it.
- `SetGrantCookie`: return only the raw grant token in the scoped HttpOnly cookie.
- `GrantIssued`: section 04 may now start replacement registration.

The initial-registration diagram also assigns `IssueRecoveryCode` here: successful attestation persistence and first code-digest insertion must be one transaction before the one-time plaintext response is sent.

## Current Libraries and Constraints

| Library | Version | Use in this section |
|---|---:|---|
| Next.js App Router | 16.2.10 | Node-runtime API routes, cookies, and no-store responses |
| TypeScript | 5.x | Explicit domain result and error unions |
| Zod | 4.4.3 | Request, failure-code, and public response validation |
| `better-sqlite3` | 12.11.1 | Immediate authorization transactions and rate-limit state |
| `@simplewebauthn/server` | 13.3.2 | Existing verified registration result feeding initial issuance |
| Node `crypto` | Node 20+ | CSPRNG values, SHA-256 bearer digests, and HMAC code digests |
| Vitest | 4.1.10 | Service, route, concurrency, expiry, and secret-boundary tests |

Use the installed Next.js documentation under `node_modules/next/dist/docs/` before editing route handlers. Preserve the existing Node runtime because SQLite and Node crypto are not Edge-runtime dependencies.

## Detailed Implementation

### Recovery Code format and digest

Create `recovery-code.ts` as the only module allowed to format or digest Recovery Codes.

- Generate 16 unbiased Crockford Base32 characters from `randomBytes`, formatted as four groups of four.
- Exclude ambiguous presentation characters and accept lowercase plus optional ASCII hyphens/spaces on input.
- Normalize by trimming, removing ASCII separators, and uppercasing; reject any other character or a length other than 16.
- The 16-character alphabet carries 80 bits before formatting; never reduce it to numeric-only or dictionary words.
- Calculate `HMAC-SHA-256(key_v1, UTF8("authidenty-recovery:v1:" + normalizedCode))`.
- Persist the 32-byte digest with `digest_version = 1`; never persist the formatted or normalized plaintext.
- Require `AUTHIDENTY_RECOVERY_DIGEST_KEY` to decode to at least 32 random bytes outside tests. Tests inject a fixed key through a function argument, not a checked-in environment secret.
- Compare digests through the repository lookup and fixed-length buffers; never log candidates or include them in thrown messages.

Bearer cookies use independent random 32-byte base64url tokens. Persist `SHA-256(token)` only. If `recovery_transactions.id` is used as its lookup key under the section-01 schema, store the digest encoding as that ID and return the raw token only in `authidenty_recovery`.

### Initial code issuance

Extend `finishPasskeyRegistration` after WebAuthn verification:

- Generate the plaintext code in service memory, calculate its versioned keyed digest, and pass both verified public credential data and the digest to section 01's `completeInitialRegistration` transaction.
- Reject an existing credential or current code as `RegistrationConflictError`; never rotate an existing factor through initial setup.
- Return the credential summary and `{ code, displayOnce: true, readiness: "recovery-code-configured" }` exactly as `api-spec.md` defines, then clear the registration cookie on every terminal verification result.

If credential or code insertion fails, both insertions roll back and the route returns generic `VERIFICATION_FAILED`. Do not retry issuance after the response is lost: the client must restart the disposable setup flow, because no read endpoint can recover plaintext.

Add `Cache-Control: no-store` and `Pragma: no-cache` to the successful response. UI acknowledgment and copy/download behavior are section 06; this service only guarantees one-time delivery.

### Start Recovery Transaction

Implement `POST /api/recovery/start` with a Zod request containing normalized username and the lowercase `FailureCode` union from `api-spec.md`.

- Reject cross-origin, unexpected Host, or non-JSON requests before parsing; normalize the username exactly as registration and authentication do.
- Evaluate the keyed start throttle, resolve the account internally, and compute policy facts from active credentials and the current factor.
- For an eligible account, generate a raw token, persist only its digest-bound `diagnosing` transaction, and give it a ten-minute expiry.
- Return only failure code, expiry, status, and Recovery Actions. Unknown/ineligible accounts use the same public family and comparable work; perfect timing equalization is not claimed.
- Set `authidenty_recovery` as `HttpOnly`, `SameSite=Strict`, `Path=/api/recovery`, ten-minute `Max-Age`, and `Secure` outside localhost.

The transaction may progress from `diagnosing` to `factor_required` when the deterministic policy projection is created. The route must never set `reported_credential_id` based on untrusted client input. In the one-credential demo, section 04 selects the sole prior active credential only after authorization.

### Sanitized status

Implement `GET /api/recovery/status` without accepting an identifier in the query string or body.

- Resolve the cookie token digest, require an unexpired transaction, and opportunistically expire state or release reservations only through section 01's tested policy.
- Return `status`, complete server-owned `allowedActions`, and `expiresAt` only; never return identity, factor, attempt, credential, model, or grant details.
- Return generic `RECOVERY_TRANSACTION_INVALID` with `401` for missing, expired, malformed, or unknown cookies.
- Apply `Cache-Control: no-store` to success and failure.

### Keyed throttle

Derive `subjectKeyDigest = HMAC(key_v1, "subject:" + normalizedUsername)` and `clientKeyDigest = HMAC(key_v1, "client:" + trustedClientKey)`. Use a deployment-approved remote address source; never trust arbitrary forwarded headers. In local development, use a stable local bucket.

Use a fixed prototype policy and test its exact boundaries:

- five failed code attempts per 15-minute window;
- after the fifth failure, lock the pair for 15 minutes;
- cap `retryAfterSeconds` between 1 and 900;
- increment malformed and non-matching candidates identically after a valid transaction is resolved;
- reset the matching pair after successful atomic authorization;
- do not reveal whether the subject bucket, client bucket, account, or factor caused throttling.

The policy is a hackathon control, not a production abuse-prevention claim. A production system would add distributed IP/device/network defenses.

### Atomic verification and reservation

Implement `authorizeRecoveryWithCode` as a service boundary over the section-01 immediate repository transaction:

1. Resolve the transaction digest and require `factor_required`, correct user binding, future expiry, and an allowed throttle state.
2. Normalize/digest the candidate, query only that user's current active code, and record the same typed failure on every miss.
3. Generate a raw 32-byte grant token and pass only its SHA-256 digest into `transaction(...).immediate()`.
4. Recheck transaction and code state/user, then update exactly one code from `active` to `reserved` with `reserved_at`.
5. Bind `recovery_code_id`, set the transaction `authorized`, and insert one same-user, ten-minute `replacement_passkey` grant.
6. Reset the successful throttle bucket, commit, and only then return the raw grant token and expiry.

Every state update includes its expected prior status and checks `changes === 1`. Unique-index or stale-state conflicts map to a typed replay result and roll back. Never issue a grant before commit or retry a conflicting transaction with a new grant.

### Grant cookie and public response

`POST /api/recovery/code/verify` accepts only `{ code: string }`; Zod strips nothing silently and rejects extra keys so chat/history cannot share the endpoint.

On success, set `authidenty_reenrollment` with `HttpOnly`, `SameSite=Strict`, `Path=/api/recovery/reenroll`, ten-minute `Max-Age`, and `Secure` outside localhost. Return `authorized`, `status`, `nextAction`, and `expiresAt`. Do not set `authidenty_session`, expose the grant in JSON, or mark the code redeemed.

| Status | Public code | Internal cases collapsed |
|---:|---|---|
| 400 | `INVALID_RECOVERY_CODE` | Malformed, wrong, inactive, redeemed, revoked, or cross-account code |
| 401 | `RECOVERY_TRANSACTION_INVALID` | Missing, unknown, expired, or wrong-state transaction |
| 409 | `RECOVERY_ALREADY_AUTHORIZED` | Existing active grant, reserved code, or concurrent winner |
| 429 | `RECOVERY_CODE_THROTTLED` | Subject/client limit with bounded retry time |
| 503 | `RECOVERY_UNAVAILABLE` | Safe configuration or database failure without secret detail |

All route logs contain route name, correlation ID, and internal error class only. Never log request bodies, cookies, HMAC inputs, digests, database rows, or model content.

### GPT isolation contract

Recovery Code text must never reach `recovery-agent.ts`, `openai-recovery-model.ts`, OpenAI request construction, chat history, analytics, or notification records. Section 03 exposes only a sanitized Recovery Action projection for section 05. GPT-5.6 cannot call the verification service, write transaction status, reserve a code, create a grant, or alter throttling.

Add a regression test that uses a recognizable candidate and spies on the model adapter/logger; neither may observe it. If the user pastes code-like text into chat, section 05 must reject or redact it before any model call, but authorization still occurs only in this section's dedicated endpoint.

## Test Scenarios

### Service and repository integration

| Case | Setup/action | Expected result |
|---|---|---|
| Initial issuance | First valid attestation | Credential and digest persist atomically; plaintext appears once |
| Initial persistence fault | Force code insert failure | Neither credential nor code persists |
| Correct code | Active code and valid transaction | Code reserved; transaction authorized; exactly one active grant |
| Wrong or malformed code | Valid transaction | Same typed invalid result; failure count increments; no grant |
| Cross-account code | User A transaction, user B code | Generic invalid result; neither account changes |
| Concurrent valid submits | Two calls against one active code | One success, one conflict; one reservation and one grant total |
| Replay | Submit after authorization | `RECOVERY_ALREADY_AUTHORIZED`; no second grant |
| Expired transaction | Correct code after expiry | Invalid transaction; code remains active; no grant |
| Threshold | Five failures in window | Fifth records lock; subsequent call returns bounded retry time |
| Reservation expiry | Grant expires before enrollment | Tested cleanup releases code to active without a session or credential change |

### Route and boundary tests

| Case | Request | Expected result |
|---|---|---|
| Start recovery | Valid JSON and same origin | `200`, sanitized shape, recovery cookie only |
| Unknown username | Syntactically valid unknown account | Generic start behavior with no account/factor metadata |
| Status resume | Valid transaction cookie | Sanitized status/actions/expiry only |
| Missing transaction | Status or code verification | Generic `401`; no state change |
| Successful verification | Correct code | `200`, grant cookie path is re-enrollment only; no session cookie |
| Wrong content type | State-changing POST | `415`; body is not processed |
| Cross-origin/Host | State-changing POST | Rejected before secret-bearing body processing |
| Cache safety | Code issuance or verification | `Cache-Control: no-store`; code issuance also has `Pragma: no-cache` |
| Model isolation | Recognizable code candidate | Model and logger spies never receive candidate, digest, or cookie |
| Error uniformity | Wrong, redeemed, revoked, cross-user candidates | Same status/code/message family |

## TDD Implementation Strategy

### Phase 1: Red

- Add pure code/digest tests plus registration tests for atomic first issuance and the one-time response.
- Add service tests for expiry, wrong user, throttle boundaries, replay, race, and rollback.
- Add route tests for cookie separation, headers, generic errors, Origin/Host, media type, secret-safe logging, and model isolation.
- Confirm every new test fails for the intended missing behavior before implementation.

### Phase 2: Green

- Implement the pure code/digest module and injected configuration, then integrate atomic initial issuance.
- Implement start/status routes, throttle evaluation, and failure recording.
- Implement atomic reserve-and-grant authorization, then set the scoped cookie only after commit.
- Run focused tests after each smallest change; do not add section-04 replacement behavior.

### Phase 3: Refactor

- Consolidate cookie/header/error helpers inside the recovery module and map typed domain errors once at route boundaries.
- Review all logs, snapshots, fixtures, and assertion messages for candidate or bearer leakage.
- Run the full existing registration and recovery-agent suites to catch regressions.

## Quality Gate

- [ ] Initial credential and Recovery Code digest are committed atomically.
- [ ] Plaintext Recovery Code is returned once and is absent from schema, logs, model calls, and later reads.
- [ ] Recovery start/status expose no account, credential, factor, or throttle metadata.
- [ ] Wrong, malformed, inactive, redeemed, revoked, and cross-user factors share generic public errors.
- [ ] Five-attempt throttle and bounded retry behavior pass with an injected clock.
- [ ] Concurrent valid submissions produce one reservation and at most one active grant.
- [ ] Grant cookie is HttpOnly, Strict, re-enrollment-path scoped, short-lived, and never an Application Session.
- [ ] Same-origin, expected Host, JSON content type, and no-store behavior are route-tested.
- [ ] Existing passkey registration and recovery-agent tests still pass.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] Every assigned flow node and branch has a service/repository/route test or explicit boundary assertion.

## Risks and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| Plaintext code leaks through response logging | Critical | No body logging, recognizable-secret regression test, no-store headers | Disable issuance route and revoke prototype code digests |
| Offline guessing after database theft | High | 80-bit code plus versioned server-side HMAC key | Rotate digest key/version and reissue disposable demo accounts |
| Concurrent replay creates two grants | Critical | Immediate transaction, expected-state updates, partial unique indexes | Roll back the authorization service commit; preserve unreserved codes |
| Throttle locks out the demo | Medium | Injected clock, bounded fixed policy, disposable seeded accounts | Clear only throttle rows in the disposable demo database |
| Unknown-account behavior leaks timing | High | Generic shapes, keyed dummy work, comparable route path, explicit non-production claim | Remove public recovery entry until uniform behavior is restored |
| Cookie scope confusion grants general access | Critical | Separate names, paths, digests, and service types; negative session test | Clear grant cookies and revoke active grants |
| Registration response is lost after commit | Medium | Acknowledge one-time nature; disposable setup restart policy | Delete the disposable incomplete account and register again |

## Acceptance Criteria

- [ ] A newly registered disposable account receives one saved Recovery Code while SQLite contains only its keyed digest.
- [ ] A recovery start creates a ten-minute, non-authenticated transaction and a sanitized resumable status.
- [ ] A correct code reserves exactly one factor to exactly one transaction and creates exactly one scoped grant.
- [ ] Failed, throttled, replayed, expired, and cross-account attempts leave credential and session state unchanged.
- [ ] The old code remains reserved until section 04 either completes recovery or tested expiry policy releases it.
- [ ] No code or bearer secret reaches GPT-5.6, logs, telemetry, notification data, or public errors.
- [ ] The public API and cookie behavior match `api-spec.md` and the recovery authorization flow diagram.
- [ ] All Test Scenarios and Quality Gate items pass without manual database edits.

## Exact Files to Create or Modify

- `src/server/recovery/recovery-code.ts` — format, normalize, generate, and HMAC Recovery Codes.
- `src/server/recovery/recovery-code.test.ts` — pure code and digest tests.
- `src/server/recovery/recovery-service.ts` — start, status, throttle, and authorization orchestration.
- `src/server/recovery/recovery-service.test.ts` — state, expiry, replay, race, and isolation tests.
- `src/server/recovery/recovery-http.ts` — recovery-owned Origin/Host, JSON, cookie, cache, and error helpers.
- `src/server/passkeys/registration-service.ts` — atomic first-code issuance after verified attestation.
- `src/server/passkeys/registration-service.test.ts` — issuance, atomic rollback, and one-time result tests.
- `src/app/api/passkeys/register/verify/route.ts` — one-time Recovery Code response and no-cache headers.
- `src/app/api/passkeys/register/verify/route.test.ts` — registration response, cookie clearing, and secret-cache tests.
- `src/app/api/recovery/start/route.ts` — create a bounded Recovery Transaction.
- `src/app/api/recovery/start/route.test.ts` — generic start, cookie, throttle, and request-security tests.
- `src/app/api/recovery/status/route.ts` — return sanitized resumable state.
- `src/app/api/recovery/status/route.test.ts` — expiry and no-metadata response tests.
- `src/app/api/recovery/code/verify/route.ts` — deterministic factor verification and grant-cookie response.
- `src/app/api/recovery/code/verify/route.test.ts` — success, generic failure, replay, throttle, and cookie-separation tests.

Section 01 owns changes to migration and repository files. If those contracts need a new state, column, or index, update `db-schema.md`, `api-spec.md`, the diagram, and section 01 before implementation rather than hiding schema changes in this section.
