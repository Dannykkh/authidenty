# Red Team Analysis

Execution note: the bounded background review timed out twice, so the main planning context performed the mandatory Red Team pass from the spec, research, dictionary, and inspected code.

## Critical Findings

1. **A Recovery Code can become a password with worse handling.** If its plaintext appears in logs, model input, analytics, screenshots, browser persistence, or a downloadable filename, the privacy story fails. Generate with approved randomness, show once, store only a versioned keyed digest, and test log/model exclusion.
2. **A Re-enrollment Grant is an account-takeover token.** A broad cookie path, long expiry, cross-account username input, client-readable claims, or replay can convert it into a general credential-issuance capability. Bind internal user ID, purpose, nonce, expiry, and one-time consumption; use a narrow HttpOnly cookie and dedicated routes.
3. **Recovery Code verification and replacement enrollment are not one atomic network transaction.** An attacker can redeem a code and race enrollment, or a legitimate user can fail after redemption. Permit a bounded grant lifetime and make each grant single-use, but do not revoke the old credential until the new one is verified.
4. **Account enumeration is already present in registration behavior.** The existing conflict message reveals that an email has a passkey. Username-first authentication and recovery add more signals. Public messages and status codes need a deliberate demo policy; a hackathon cannot fully normalize timing, so document the residual risk.
5. **A “simulate lost device” button can secretly bypass the security claim.** It may choose a failure condition, but it cannot set factor verification, issue a grant, or modify credential state. The recorded path must use the same public endpoints as the real path.
6. **Model output can be schema-valid and still dangerous.** An allowed action may be inappropriate for the server state or text may claim approval. The server must pass the allowed action set, intersect the returned values again, and prepend/append deterministic boundary text rather than trusting prose alone.
7. **The model-unavailable fallback can accidentally become a weaker path.** It must expose the exact same deterministic ceremonies and requirements, not a “continue anyway” mode.
8. **Credential counter logic can reject valid synced passkeys or miss clone signals.** Use the installed SimpleWebAuthn verification contract and stored backup/device metadata. Do not implement home-grown counter security.

## Important Findings

1. Cookie names alone do not create isolation. Validate path, expiry, SameSite, Secure, HttpOnly, rotation, clearing, and which route reads each cookie.
2. Recovery throttling keyed only by account enables denial of service; keyed only by IP permits distributed guessing. The prototype needs bounded account-plus-client throttling and honest production limitations.
3. A recovery code shown in a screenshot used for hackathon evidence is a real secret if the demo database persists. Use disposable demo accounts and reset or rotate all shown codes after capture.
4. The notification outbox is evidence, not user notification delivery. README and video must not imply email/SMS delivery if none exists.
5. Immediate credential revocation requires a reliable target credential. If the user cannot identify which device was lost, revoke only the explicitly selected credential or present the prototype assumption.
6. Recovery completion must rotate and display a new Recovery Code. Otherwise the account becomes unrecoverable after one successful event.
7. An expired grant after code redemption creates a stranded attempt. Define whether the user receives a newly rotated code only after completion; the original code should not be consumed without a recoverable retry policy. Recommended MVP: successful code verification redeems the code and grants a short bounded enrollment window; if it expires, require operator reset for the disposable demo and document the production design gap, or retain a server-side pending-recovery mechanism that can reissue within a strict window without the code.
8. SQLite single-instance assumptions may break on serverless deployments with ephemeral files or multiple instances. Choose a compatible persistent host or replace storage before deploying; do not discover this during recording.
9. The OpenAI safety identifier and recovery cookie must not be presented as user authentication. They are abuse-correlation context only.
10. A public repository can leak `.data`, `.env.local`, recovery screenshots, or recorded identifiers. Verify ignore rules and run a secret/history scan before submission.

## Scope and Schedule Attacks

- Adding conversational consistency consumes evaluation time, creates sensitive templates, and distracts from the missing end-to-end flow. Reject it for the submission.
- Adding recovery contacts, email delivery, multiple environments, or a production rate-limit provider before the browser journey passes is scope failure.
- Visual redesign before authentication and re-enrollment work is green is schedule failure; extend the current system.
- A live-model-only demo is fragile. Record a verified live call early, but keep the deterministic fallback demonstrable.
- Building every recovery route before repository one-time primitives are tested invites late security rewrites. Sequence from persistence outward.

## Risk Matrix

| Risk | Probability | Impact | Required mitigation |
|---|---|---|---|
| Recovery Code exposure | Medium | Critical | One-time display, digest storage, redaction tests, disposable demo state |
| Grant replay/cross-account use | Medium | Critical | Account/purpose binding, short expiry, transactional consume |
| Account enumeration | High | High | Generic responses and documented residual timing limits |
| Concurrent code redemption | Medium | Critical | Immediate transaction and unique consumed state |
| Premature credential revocation | Medium | High | Revoke only after replacement verification |
| Model prompt injection/false claim | Medium | High | No tools, server allowed-actions intersection, deterministic boundary copy |
| Model outage | Medium | Medium | Same-policy deterministic fallback |
| RP ID/origin mismatch | Medium | High | Freeze host before credential creation and recording |
| Ephemeral/serverless SQLite | Medium | High | Select persistent compatible deployment before final integration |
| Demo secret committed or recorded | Medium | Critical | Ignore rules, history scan, rotate disposable credentials |
| Schedule overrun | High | High | Critical-path gate; optional work only after E2E green |

## Kill Conditions

- Do not submit a flow that can enroll a replacement credential without a deterministic Recovery Factor or active passkey.
- Do not claim a live GPT-5.6 result if the recorded response is fixture data.
- Do not claim identity proofing, AAL2 compliance, delivered notifications, or universal recovery.
- Do not add a hidden admin or demo bypass to make the video succeed.

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Recovery Attempt Throttle | Server state limiting Recovery Factor guesses across account and client signals | Distinguishes abuse control from Account Recovery state |
| ADD | Recovery Notification | An account-control alert recorded or delivered after recovery; an outbox record is not the same as delivery | Prevents submission overclaiming |
| REFINE | Recovery Transaction | A non-authorized diagnostic workflow that may later reference, but never itself replace, deterministic factor verification | Prevents transaction-state privilege confusion |
