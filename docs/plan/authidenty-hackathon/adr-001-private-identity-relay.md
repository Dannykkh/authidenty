# ADR-001: Pivot Authidenty to a Private Identity Relay

- Status: Accepted
- Date: 2026-07-16
- Decision maker: Project owner

> Historical note: [ADR-002](adr-002-conversational-continuity.md) supersedes this as the active Build Week demo direction. The relay module remains implemented in the repository.

## Context

The original Authidenty prototype combined passkey registration with GPT-guided account recovery. The project owner identified a broader recurring problem: services and AI agents repeatedly ask people to disclose a phone number, name, or birth date before initiating authentication.

Conversational identity matching was considered as a way to find the account without those fields. Research and threat review rejected conversational similarity as a cryptographic key or authorization factor because it is probabilistic, observable, hard to revoke, and unsafe for unconstrained 1:N account identification.

The accepted product goal is narrower and stronger: let a relying service request proof from a previously enrolled person without receiving that person's contact details. Authidenty privately routes the challenge and returns a minimal verification receipt.

## Options

| Option | Product fit | Security risk | MVP effort | Weighted result |
|---|---:|---:|---:|---:|
| A. Conversation-derived identity unlocks a PII vault | 3/5 | 1/5 | 1/5 | 1.8/5 |
| B. Opaque relay handle routes SMS OTP | 4/5 | 3/5 | 4/5 | 3.7/5 |
| C. Opaque relay handle routes passkey approval, with controlled OTP fallback | 5/5 | 5/5 | 3/5 | 4.5/5 |

Weights: product fit 40%, security 40%, MVP effort 20%. A higher security score means lower residual risk; a higher effort score means easier delivery.

## Decision

Choose option C as the product architecture. Deliver option B as the first end-to-end demo slice while retaining passkeys as the target approval factor.

The first slice will:

1. accept an opaque relay handle and a bounded action description from a relying service;
2. use GPT-5.6 Structured Outputs to classify and explain the action without PII or model tools;
3. combine model output with deterministic server policy, never allowing the model to lower declared risk;
4. retrieve an encrypted phone destination only inside the notification boundary;
5. send a simulated OTP during development;
6. verify the OTP outside the model; and
7. return a minimal, pseudonymous verification receipt.

Passkey approval will replace or strengthen the simulated OTP path after the relay contract is stable.

## Security Boundary

- GPT never receives a phone number, legal name, birth date, OTP, vault key, or full account record.
- GPT produces typed interpretation only. It cannot send a challenge, verify a factor, or issue a receipt.
- The behavior or language of the claimant is not an authenticator.
- The relying service receives no contact destination and no raw identity attribute.
- The notification adapter is the only application component allowed to obtain a decrypted phone number.
- A missing, refused, malformed, or unavailable model response fails to a conservative server-owned policy.
- Real SMS delivery remains deferred until abuse limits, provider credentials, and delivery evidence are configured.

## Consequences

### Positive

- Repeated PII entry is removed from the relying-service experience.
- The model has a useful language task without becoming a security authority.
- Contact data and model data have separate trust boundaries.
- The same relay contract can later support passkey, push, SMS, or recovery-code approval.
- AI agents can request approval for arbitrary human-readable actions and receive a minimal result.

### Negative

- Initial enrollment still requires independent verification of the contact destination and passkey.
- SMS providers and carriers necessarily see the delivery destination.
- An opaque relay handle must be protected from enumeration and abuse.
- The first demo uses simulated delivery and cannot claim production identity proofing or SMS delivery.

### Rejected claims

- Authidenty does not prove civil identity.
- Authidenty does not authenticate a person from writing style.
- `store: false` does not mean model input was never transmitted or retained in abuse-monitoring logs.
- A verification receipt proves completion of the configured account-control challenge, not the truth of arbitrary personal attributes.
