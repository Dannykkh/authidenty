# GitHub Reference Research

## Status

The bounded GitHub reference search timed out twice before producing a reliable source review. No repository-specific implementation claim is used in the plan as a result.

## Conservative Decision

- Preserve the installed SimpleWebAuthn 13.3 API surface and inspect its local types and official documentation immediately before implementing authentication verification.
- Extend the project's tested registration pattern instead of copying an external account-recovery implementation.
- Treat repository examples as illustrative only; recovery-code issuance, one-time redemption, scoped grants, credential revocation, and session cookies must be designed against the project's own threat model and verified standards.

## Follow-up Needed

- Inspect the official SimpleWebAuthn repository examples for `generateAuthenticationOptions`, `verifyAuthenticationResponse`, and credential counter persistence.
- Inspect at most one maintained Next.js passkey example for route-handler and cookie mechanics, without importing its recovery policy.
- Complete this narrow follow-up during implementation preparation; it does not block strategy selection because the local codebase and primary standards already define the required security boundaries.
