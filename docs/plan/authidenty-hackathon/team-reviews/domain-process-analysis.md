# Domain Process Analysis

Execution note: bounded background synthesis exceeded the planning time box, so the main context completed the process analysis from the approved inputs without fresh research.

## 1. Initial Setup and Recovery Readiness

- Purpose: establish an active Passkey Credential and an independent Recovery Factor before loss.
- Actor: Account Holder; system creates credential metadata and Recovery Code.
- Preconditions: no existing credential for the account; supported authenticator.
- Process: verify registration ceremony, store public credential, generate Recovery Code, show once, require acknowledgment, store only digest.
- Output: active credential, active Recovery Code, Recovery Readiness summary.
- Exceptions: unsupported browser, duplicate account, failed verification, user leaves before acknowledgment.

## 2. Routine Authentication

- Purpose: prove control of an active Passkey Credential and create an Application Session.
- Actor: Account Holder and authenticator.
- Preconditions: active credential, matching RP ID/origin.
- Process: issue authentication challenge, verify assertion and user verification, update credential use state, create Application Session.
- Output: signed-in state.
- Exceptions: missing/revoked credential, timeout, cancellation, wrong RP/origin, invalid counter result.

## 3. Failure Diagnosis

- Purpose: turn an opaque WebAuthn failure into an understandable next step without changing authorization.
- Actor: Account Holder, server policy, Recovery Guide.
- Preconditions: normalized failure code and a new Recovery Transaction.
- Process: server computes allowed Recovery Actions; GPT-5.6 explains likely cause and those actions; server validates output or returns deterministic fallback.
- Output: diagnosis plus a server-owned navigation choice.
- Exceptions: prompt injection, secret-like input, model refusal/timeout/schema failure, no permitted self-service path.

## 4. Alternate-Passkey Path

- Purpose: avoid Account Recovery when another active credential can authenticate.
- Actor: Account Holder and another authenticator.
- Preconditions: another passkey may be available.
- Process: return to normal Authentication, sign in, optionally add replacement, then revoke the lost credential.
- Output: Application Session and repaired credential set.
- Exceptions: the alternate credential is unavailable or revoked; transition to true Account Recovery without implying prior authorization.

## 5. Recovery Code Verification

- Purpose: deterministically authorize one replacement ceremony after catastrophic credential loss.
- Actor: Account Holder and server policy; GPT-5.6 is excluded.
- Preconditions: active Recovery Transaction and active Recovery Code digest.
- Process: accept candidate in dedicated form, apply throttle, verify digest, atomically redeem, issue account- and purpose-bound Re-enrollment Grant.
- Output: short-lived one-time grant.
- Exceptions: wrong code, throttle, concurrent redemption, replay, expired transaction, no factor.

## 6. Re-enrollment

- Purpose: register one replacement Passkey Credential under the grant.
- Actor: Account Holder, authenticator, server.
- Preconditions: valid unconsumed Re-enrollment Grant.
- Process: issue dedicated registration challenge, verify replacement credential, atomically store it and consume the grant.
- Output: new active Passkey Credential.
- Exceptions: expired/consumed/cross-account grant, registration failure, duplicate credential. Failure does not revoke the old credential.

## 7. Credential Revocation, Code Rotation, and Notification

- Purpose: close the lost-device threat and restore future Recovery Readiness.
- Actor: server and Account Holder.
- Preconditions: replacement credential verified.
- Process: revoke the explicitly reported lost credential, generate a new Recovery Code, record Recovery Notification, show completion receipt and new code once.
- Output: replacement active, lost credential revoked, new recovery factor active, notification recorded.
- Exceptions: ambiguous lost credential, rotation failure, outbox failure. Completion must not overclaim delivered notification.

## 8. Submission Operations

- Purpose: produce reproducible evidence on the exact WebAuthn origin.
- Actor: builder and judge.
- Preconditions: fixed HTTPS hostname, disposable demo account, configured model key or labeled fallback.
- Process: run checks, reset disposable state, capture screenshots, record critical path, rotate exposed secrets, push public repository, submit video and project story.
- Output: runnable repository and three-minute demonstration.
- Exceptions: model latency, host change, ephemeral database, accidental secret capture, video overrun.

## State Authority Matrix

| Actor/component | Diagnose | Verify factor | Issue grant | Register credential | Revoke credential | Create Application Session |
|---|---:|---:|---:|---:|---:|---:|
| Account Holder | Supplies context | Supplies candidate | No | Approves authenticator prompt | Selects reported lost credential | Initiates sign-in |
| Recovery Guide | Explains | No | No | No | No | No |
| Server policy/service | Selects allowed path | Yes | Yes | Authorizes and verifies | Yes | Yes after Authentication |
| Authenticator | Produces WebAuthn response | No | No | Creates private/public key pair | No | Proves credential control |

## Prioritized Missing Process Suggestions

| Priority | Process | Decision |
|---|---|---|
| Required | Recovery Code acknowledgment and rotation | Add to critical path |
| Required | Explicit lost-credential selection | Add before revocation; demo may preselect the only credential |
| Required | Model outage/refusal fallback | Add with identical policy requirements |
| Recommended | Pending recovery resume after grant expiry | Document as production follow-up; avoid expanding MVP state unless time remains |
| Optional | Authenticated second-passkey management | Add only after E2E journey passes |
| Deferred | Recovery contacts/social recovery | Exclude from hackathon |

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Recovery Readiness | Availability of independent active methods that can avoid or authorize Account Recovery | Covers setup and post-recovery restoration |
| ADD | Recovery Action | Server-owned navigation option permitted for the current Recovery Transaction | Separates product action from model prose |
| REFINE | Account Recovery | Begins only when normal Authentication with another active Passkey Credential is unavailable | Prevents overusing recovery language |
