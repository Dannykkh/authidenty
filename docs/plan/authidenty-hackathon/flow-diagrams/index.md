# Flow Diagrams Index

These diagrams define the expected process before implementation. Node IDs are stable identifiers used by the implementation sections and later flow verification.

| Diagram | Purpose | Primary actors |
|---|---|---|
| `passkey-setup-authentication.mmd` | Initial passkey creation, one-time Recovery Code display, and returning-user sign-in | Account holder, browser, Authidenty |
| `recovery-diagnosis.mmd` | Failure classification, policy projection, GPT guidance, and deterministic fallback | Account holder, Authidenty, GPT-5.6 |
| `recovery-code-authorization.mmd` | Independent Recovery Code verification, throttling, reservation, and scoped grant issuance | Account holder, Authidenty, SQLite |
| `replacement-passkey-completion.mmd` | Replacement registration, atomic credential lifecycle changes, code rotation, and proof by normal sign-in | Account holder, authenticator, Authidenty, SQLite |

## Cross-Diagram State Boundaries

- `PasskeySetupComplete` leads to `AuthStart` for normal access.
- `AuthFailure` may lead to `RecoveryStart`, but an authentication failure never authorizes recovery.
- `FactorRequired` leads to `CodeSubmit` only when server policy reports a configured Recovery Factor.
- `GrantIssued` leads to `GrantCheck`; no GPT output can create this transition.
- `CompletionReceipt` leads back to `AuthStart` so the replacement credential proves itself through ordinary Authentication.

## Verification Rule

Implementation may rename internal functions, but every node and branch in these diagrams must have a corresponding route, service, repository transition, UI state, or explicit excluded/deferred decision. Any added state-changing API must first be added to `api-spec.md` and the relevant diagram.
