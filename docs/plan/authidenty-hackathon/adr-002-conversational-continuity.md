# ADR-002: Use Conversational Continuity for Candidate Selection

- Status: Accepted
- Date: 2026-07-17
- Decision maker: Project owner
- Supersedes: ADR-001 as the active Build Week demo direction

## Context

The project owner returned to the original hypothesis: recognize an enrolled person from patterns that persist across answers to different questions, then avoid asking for the person's name and phone number again.

The security objection remains valid. Writing style is probabilistic, observable, imitable, and subject to drift. It is not a cryptographic secret and must not create an authenticated session by itself.

The accepted boundary is:

1. conversational continuity selects the most likely enrolled profile;
2. a strong match may reveal the display name and masked enrolled destination;
3. a possession factor sent to the enrolled destination completes verification;
4. a weak match reveals no candidate identity or challenge route.

## Decision

Implement a research prototype with three layers:

1. **Derived style profile** — store a small, explainable numerical vector rather than raw enrollment answers.
2. **Candidate selection** — rank active profiles deterministically, then ask GPT-5.6 Sol to compare only the best enrolled vector with the returning vector.
3. **Device proof** — verify a short-lived, single-use OTP outside the model.

The combined match score is server-owned. GPT cannot access the identity vault, decrypt the phone, send a code, verify a code, or create an authenticated session.

## Data Boundary

| Data | SQLite | GPT-5.6 Sol | Public response |
| --- | --- | --- | --- |
| Raw answer sentences | No | No | No |
| Derived style vector | Yes | Yes, best candidate pair only | No |
| Display name | Yes | No | Strong match only |
| Raw phone number | Encrypted | No | No |
| Masked phone | Challenge record | No | Strong match only |
| OTP | HMAC digest only | No | Development preview only |

## Consequences

### Positive

- The visible demo directly tests the original identity-friction hypothesis.
- GPT-5.6 has a bounded task over non-PII numerical features.
- Returning users do not type their name or phone number before candidate selection.
- Weak matches do not leak account identity or phone suffixes.
- The final verification decision remains outside the model.

### Negative

- The approach can produce false accepts and false rejects.
- Style may change with language, mood, disability, assistive tools, device, or context.
- A determined attacker may imitate observed writing habits.
- 1:N ranking increases account-enumeration and privacy risk compared with 1:1 confirmation.
- The server still stores identity data and must protect enrollment, encryption keys, and notification access.

## Rejected Claims

- Conversational continuity is not a biometric secret.
- The LLM does not prove legal identity or humanness.
- A match score is not an authentication result.
- Encryption at rest does not mean the server never processes the phone number.
- Simulated SMS does not prove phone ownership or production delivery.
