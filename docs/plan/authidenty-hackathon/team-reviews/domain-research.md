# Domain Research: Consumer Account Authentication and Recovery

## Domain Complexity

- Level: HIGH
- Why: account recovery controls credential issuance and is an adversarial security boundary. A mistake can cause account takeover or permanent lockout. The prototype avoids regulated identity proofing, but still handles authentication, recovery secrets, and model-mediated guidance.
- Research boundary: Step 5 already covered W3C WebAuthn, FIDO deployment guidance, NIST recovery guidance, OpenAI model/Structured Outputs documentation, academic behavioral-authentication evidence, and platform product patterns. No fresh web research was performed here.

## Standards and Security Guidance

| Name | Relevance | Source |
|---|---|---|
| W3C WebAuthn Level 3 | Credential ceremonies, backup state, counters, RP/origin binding, multiple credentials | [research.md](../research.md) and [web.md](../research/web.md) |
| FIDO passkey deployment guidance | Synced versus device-bound credentials and recovery weakness | [web.md](../research/web.md) |
| NIST SP 800-63B-4 | Saved recovery-code entropy, digest storage, throttling, one-time use, replacement, notification | [web.md](../research/web.md) |
| OpenAI GPT-5.6 guidance | Sol model identity, reasoning selection, Ultra distinction, safety identifier | [web.md](../research/web.md) |
| OpenAI Structured Outputs | Schema conformance, refusal handling, semantic validation limits | [web.md](../research/web.md) |

## Existing Solutions and APIs

| Name | Type | Relevance | Source |
|---|---|---|---|
| SimpleWebAuthn 13.3 | WebAuthn browser/server library | Already powers strict registration and should power authentication/re-enrollment | Local package and [codebase.md](../research/codebase.md) |
| Browser WebAuthn API | Platform API | Performs public-key creation and assertion ceremonies | W3C mapping in [web.md](../research/web.md) |
| OpenAI Responses API | Model API | Bounded diagnostic guidance with Structured Outputs | [web.md](../research/web.md) |
| SQLite immediate transactions | Local persistence | Supports atomic code/grant consumption for the prototype | Existing repository pattern in [codebase.md](../research/codebase.md) |
| Platform passkey providers | Authenticator ecosystem | Synced passkeys may avoid recovery; RP observes state but does not own backup | [competitors.md](../research/competitors.md) |

## Process Implications for the Domain Process Expert

1. Separate setup readiness, routine authentication, account recovery, and credential lifecycle management.
2. Require recovery methods to be configured and acknowledged before loss; do not invent recovery evidence after lockout.
3. Prefer another active passkey before starting Account Recovery.
4. Treat the Recovery Guide as diagnostic support and the Recovery Factor as the deterministic authorization input.
5. Define safe terminal states for unavailable factors, expired attempts, and abandoned ceremonies.
6. Revoke the reported lost Passkey Credential only after replacement verification succeeds, then notify the Account Holder.
7. Include the operational submission process because deployment origin and recording are part of WebAuthn correctness.

## Technical Implications for the Domain Technical Expert

1. Use separate typed state and cookies for authentication ceremony, Application Session, Recovery Transaction, and Re-enrollment Grant.
2. Put one-time consumption, attempt accounting, code rotation, and credential status changes inside immediate database transactions.
3. Store recovery-code digests with version and pepper/key-management assumptions; never expose plaintext to the model, logs, or persistent storage.
4. Verify credential ownership, status, RP ID, origin, user verification, and counter semantics on every authentication.
5. Use a second migration rather than rewriting the shipped initial schema.
6. Treat Structured Outputs as untrusted; map to server-supplied allowed actions and implement a deterministic fallback.
7. Pin and verify the final HTTPS RP ID/origin before end-to-end recording.

## Explicitly Skipped and Follow-up Needed

- Production NIST assurance certification and repeated identity proofing: outside the hackathon claim.
- Social recovery, recovery contacts, email/SMS recovery, and behavioral biometrics: outside the critical path.
- Broad external repository review: bounded GitHub research timed out; inspect local SimpleWebAuthn types and official examples just before implementation.
- Production rate-limit infrastructure and key management: document the boundary and implement local deterministic controls suitable for the prototype.

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Recovery Readiness | The set of active independent methods that can prevent or authorize Account Recovery | Needed to distinguish prevention from recovery execution |
| REFINE | Recovery Factor | A preconfigured independent proof verified only by deterministic server policy | Clarifies that a factor exists before lockout and never includes model confidence |
