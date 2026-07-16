# Flow Diagrams Index

These diagrams define the expected process before implementation. Node IDs are stable identifiers used by the implementation sections and later flow verification.

| Diagram | Purpose | Primary actors |
|---|---|---|
| `conversational-continuity.mmd` | Different-question response matching, bounded GPT-5.6 vector comparison, candidate reveal, and OTP device proof | Returning person, Authidenty, GPT-5.6 |
| `private-identity-relay.mmd` | Opaque approval request, PII-free GPT classification, private challenge routing, OTP verification, and minimal receipt | Relying service, account holder, Authidenty, GPT-5.6 |
| `passkey-setup-authentication.mmd` | Initial passkey creation, one-time Recovery Code display, and returning-user sign-in | Account holder, browser, Authidenty |
| `recovery-diagnosis.mmd` | Failure classification, policy projection, GPT guidance, and deterministic fallback | Account holder, Authidenty, GPT-5.6 |
| `recovery-code-authorization.mmd` | Independent Recovery Code verification, throttling, reservation, and scoped grant issuance | Account holder, Authidenty, SQLite |
| `replacement-passkey-completion.mmd` | Replacement registration, atomic credential lifecycle changes, code rotation, and proof by normal sign-in | Account holder, authenticator, Authidenty, SQLite |

## Cross-Diagram State Boundaries

- `conversational-continuity.mmd` is the active Build Week demo baseline approved on 2026-07-17.
- `private-identity-relay.mmd` remains historical and implemented; the recovery diagrams may supply later passkey components.
- A relay handle selects one account but does not authenticate it; only successful completion of the configured factor can issue a Verification Receipt.
- GPT classification cannot call the notification adapter, resolve the Identity Vault, verify a challenge, or issue a receipt.

- `PasskeySetupComplete` leads to `AuthStart` for normal access.
- `AuthFailure` may lead to `RecoveryStart`, but an authentication failure never authorizes recovery.
- `FactorRequired` leads to `CodeSubmit` only when server policy reports a configured Recovery Factor.
- `GrantIssued` leads to `GrantCheck`; no GPT output can create this transition.
- `CompletionReceipt` leads back to `AuthStart` so the replacement credential proves itself through ordinary Authentication.

## Verification Rule

Implementation may rename internal functions, but every node and branch in these diagrams must have a corresponding route, service, repository transition, UI state, or explicit excluded/deferred decision. Any added state-changing API must first be added to `api-spec.md` and the relevant diagram.
