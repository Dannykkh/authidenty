# Domain Dictionary Delta: Authidenty Hackathon

Created: 2026-07-15
Master: `docs/domain-dictionary.md`

## v1 Draft

- ADD Account Holder, Passkey Credential, Authenticator, Authentication, and Application Session.
- ADD Account Recovery, Recovery Transaction, Recovery Factor, Recovery Code, and Recovery Guide.
- ADD Re-enrollment Grant, Re-enrollment, Credential Status, Backup State, and Identity Proofing.
- REFINE “recovery agent” as a compatible code term while making “Recovery Guide” the product term.
- SEPARATE Application Session, Recovery Transaction, WebAuthn ceremony state, and Re-enrollment Grant.
- PROHIBIT “AI authentication,” “prove who you are,” and treating conversational style as a recovery factor.

## Global Seed

- inferred-skip: no `general.md` global dictionary exists and creating a new global dictionary was not requested.
- inferred-skip: Authidenty-specific recovery wording remains project-local until it is reused and independently confirmed.

## v1 → v2

- ADD Recovery Readiness (Domain Research, UX, Process).
- ADD Recovery Action (UX, Process).
- ADD Security Authorization Panel (UX).
- ADD Ceremony State (Architecture, Technical).
- ADD Recovery Attempt Throttle (Red Team, Technical).
- ADD Recovery Notification (Red Team, Technical).
- REFINE Recovery Factor as preconfigured and deterministic.
- REFINE Application Session as created only after Authentication.
- REFINE Re-enrollment Grant with account, purpose, expiry, and one-time bindings.
- REFINE Account Recovery to begin only when normal Authentication is unavailable.
- No CONFLICT items were reported.

## v2 → v3

- accepted-by-default: all six ADD items align with the spec and current architecture.
- accepted-by-default: Recovery Factor, Application Session, Re-enrollment Grant, and Account Recovery refinements make existing security boundaries more precise.
- inferred: `recoveryAgent` remains an accepted code name during the MVP while Recovery Guide is the product term.
- unresolved-conflict: none.

## Global Dictionary Sync

- inferred-skip: a new global `general.md` dictionary was not created because global memory updates were not requested.
- inferred-skip: Authidenty-specific UI terms remain project-local.
