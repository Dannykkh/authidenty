# Research Synthesis: Authidenty Hackathon

Research date: 2026-07-15

## Summary

- The existing code already has complete passkey registration, SQLite credential persistence, and a policy-bounded GPT-5.6 recovery-guidance slice. It lacks returning-user authentication, application sessions, independent recovery authorization, credential lifecycle operations, and authorized re-enrollment.
- Standards and platform practice favor avoiding recovery through synced or additional passkeys, then using deterministic preconfigured recovery factors when every authenticator is unavailable.
- The smallest defensible catastrophic-loss prototype is a high-entropy, single-use recovery code stored only as a server-side digest and redeemed for a short-lived, one-purpose re-enrollment grant.
- GPT-5.6 should interpret failure context and explain server-approved paths. It must not see recovery secrets, decide identity, mint sessions or grants, revoke credentials, or authorize WebAuthn registration.
- `gpt-5.6-sol` is the flagship model; `gpt-5.6` routes to it. Ultra is a Codex parallel-agent/reasoning mode, not an Authidenty Responses API model identifier.
- Conversational consistency is unsuitable as a standalone authenticator. Cross-topic instability, material false-accept and false-reject rates, privacy-sensitive behavioral templates, and LLM imitation make it a post-MVP shadow-mode research signal at most.
- Mature platforms expose alternate factors, credential backup state, removal of lost credentials, recovery notifications, and sometimes deliberate delay or permanent loss. Authidenty's differentiation is a coherent, privacy-preserving diagnosis-to-ceremony experience.

## Existing Codebase

The project should be extended in its current layered structure:

- `src/features`: browser flow components.
- `src/app/api`: thin validated route handlers.
- `src/server/passkeys`: WebAuthn ceremony services.
- `src/server/recovery`: model and recovery policy boundaries.
- `src/server/db`: transactional single-use persistence.

The database already accepts `authentication` challenges and stores credential counters and `last_used_at`. Existing tests passed all 7 files and 22 cases during research. The extension should preserve injected verifier/model dependencies, Zod boundaries, strict RP/origin checks, minimal persistence, and small verified commits.

Detailed findings: [research/codebase.md](research/codebase.md)

## Standards and OpenAI Guidance

### Recovery hierarchy

1. Authenticate with a synced passkey on another device.
2. Authenticate with another registered platform passkey or hardware key.
3. If all passkeys are unavailable, verify a deterministic independent recovery factor.
4. Issue a short-lived re-enrollment grant scoped only to one replacement credential.
5. Register the replacement, suspend or revoke the reported lost credential, rotate recovery material, and notify the user.

NIST recovery-code guidance supports at least 64 random bits, server-side hashed storage, throttling, single use, replacement after use, and recovery notification. A single-code hackathon demonstration must not be marketed as NIST AAL2 compliant.

### GPT-5.6 role

Use the Responses API with `gpt-5.6` or explicit `gpt-5.6-sol`, standard mode, and low or medium reasoning effort for interactive guidance. Evaluate latency and scenario success before changing the existing low setting. Use higher effort, pro mode, or Codex Ultra for development review only when representative tests show a gain.

Structured Outputs constrain shape, not semantic correctness. Every model result remains server-validated and maps only to actions already authorized by deterministic policy.

Detailed findings: [research/web.md](research/web.md)

## Academic Evidence

Stylometry contains an identity signal but does not meet a safe recovery boundary. A directly relevant continuous-authentication study reported 12.42% equal error rate for 500-character blocks. Cross-domain neural authorship verification does not generalize consistently, while continuous multimodal research depends on longer, richer behavior than a distressed recovery conversation. Behavioral templates also create privacy and replay risks.

Decision:

- Standalone conversational authentication: rejected.
- Hidden score that lowers recovery requirements or blocks users: rejected.
- Consent-based shadow-mode research after the hackathon: deferred.
- MVP authorization path: omitted.

Detailed findings: [research/academic.md](research/academic.md)

## Competitor and Product Patterns

Apple, Google, Microsoft, and GitHub all emphasize preconfigured alternate methods, synced or multiple authenticators, explicit lost-credential management, and recovery methods separate from normal sign-in. Google may delay recovery when no other second step remains; GitHub explicitly permits permanent account loss when all recovery methods are gone. This reinforces the need for a safe terminal state rather than an LLM override.

Authidenty's distinct product surface should visually separate:

- **Agent diagnosis:** probable failure, questions, explanation, and server-supplied options.
- **Security authorization:** verified factor, grant expiry, credential change, and notification status.

Detailed findings: [research/competitors.md](research/competitors.md)

## GitHub References

The bounded external repository search timed out twice, so no repository-specific claim is used. Implementation should inspect the locally installed SimpleWebAuthn 13.3 types and official examples immediately before coding. External examples must not define recovery policy.

Status: [research/github.md](research/github.md)

## Recommended Hackathon Scope

### Required

1. Passkey sign-in and authenticated session.
2. One-time recovery-code generation, display, digest storage, throttled verification, and rotation.
3. One-time, short-lived re-enrollment grant.
4. Replacement-passkey registration and lost-credential suspension/revocation.
5. GPT-5.6 diagnosis grounded in actual WebAuthn failure and server policy state.
6. Complete browser journey, deterministic fallback, tests, security evidence, screenshots, and three-minute video.

### Optional after the critical path

- Add a second passkey from an authenticated session.
- Show backup eligibility/state and a recovery-readiness indicator.
- Demonstrate cross-device authentication.
- Add recovery notification UI or a local notification outbox.

### Excluded from submission authorization

- Conversational-style identity verification.
- Raw identity documents, biometric samples, or durable conversational profiles.
- Recovery contacts or social recovery.
- LLM tool calls that mutate authentication state.
- Claims of NIST certification, identity proofing, or universal account recovery.

## Open Questions

- Fix the final HTTPS deployment hostname before final credential creation and recording because WebAuthn credentials are RP-bound.
- Choose immediate revocation or suspended status for the reported lost credential; immediate revocation is the simplest demo default.
- Choose username-first or discoverable usernameless sign-in; username-first best matches the current code but needs generic responses to reduce account enumeration.
- Decide whether the video shows both the preferred alternate-passkey path and the catastrophic recovery-code path, or only the latter within the three-minute limit.
