# UX Analysis

## Critical Findings

1. **The product must distinguish guidance from authorization at every state.** The current Recovery Guide renders approved actions beneath the chat, but there is no separate server-verification surface. Add a visually distinct Security Authorization panel that states what factor is required, whether it was verified, and what limited action is now permitted.
2. **Every model action must lead somewhere real.** Display-only labels create a dead-end demo. Render server-owned buttons whose destinations are chosen from deterministic recovery state; model text cannot create URLs or trigger privileged actions.
3. **Recovery-code setup must be a first-class ceremony.** Showing the code after initial registration without acknowledgment risks a user skipping the only catastrophic-loss method. Show it once, offer copy/download, require explicit acknowledgment, and explain that Authidenty cannot display it later.
4. **The recorded path must be a real product path.** A “simulate lost device” control may choose a known demo condition, but it must enter the same Recovery Transaction and endpoints as a real WebAuthn failure. Do not add a bypass that marks the user authorized.
5. **Failure and terminal states need direct language.** If no Recovery Factor exists, say self-service recovery is unavailable. GPT must not offer generic reassurance or imply that support can override policy.

## Important Findings

1. Replace the current local `showRecovery` switch with a small state-driven journey shell: setup, code acknowledgment, sign in, diagnose, verify, replace, complete. Browser back/reload should not silently invent or retain authorization.
2. Start recovery with the actual normalized WebAuthn failure code where available. Let the user edit the description, but do not require them to diagnose the platform error themselves.
3. Keep normal another-device authentication ahead of Account Recovery. The UI should say “Use another passkey” rather than “Recover” when a credential may still be available.
4. The one-time code form should repeat that the value is verified by Authidenty and never sent to GPT-5.6. Do not echo the full code after submission or include it in the conversation timeline.
5. Completion must provide a security receipt: replacement credential active, reported lost credential revoked, Recovery Code rotated, and notification recorded. Mask credential identifiers.
6. The model-unavailable fallback should preserve the same visual hierarchy and permitted actions. Label it as server guidance so the demo remains honest.
7. Preserve keyboard focus across state transitions, announce async status with `aria-live`, associate error messages with fields, and avoid color-only distinctions between the Recovery Guide and deterministic verification.
8. On mobile, keep the active action above supporting architecture evidence. Judges should not need horizontal comparison to understand the boundary.

## Nice-to-Have Findings

1. Show Recovery Readiness after setup using only deterministic evidence: number of active credentials, backup state, and whether a Recovery Code exists.
2. Add a compact “Why this path?” disclosure that shows the allow-listed facts used by policy without exposing internal anti-abuse signals.
3. Allow an authenticated user to add a second Passkey Credential after the critical journey is complete.

## Three-Minute Judge Journey

| Time | Product moment | Judging evidence |
|---|---|---|
| 0:00–0:25 | Problem and existing passkey setup | Impact and complete product context |
| 0:25–0:55 | Successful passkey sign-in | Working WebAuthn implementation |
| 0:55–1:25 | Lost-device failure and GPT diagnosis | Material GPT-5.6 use and design clarity |
| 1:25–2:05 | Recovery Code verified and grant shown | Deterministic security boundary |
| 2:05–2:35 | Replacement passkey and revocation receipt | Complete recovery outcome |
| 2:35–2:55 | Sign in with replacement; old credential rejected | Technical credibility and impact |
| 2:55–3:00 | One-line Codex/build evidence | Build Week alignment |

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Security Authorization Panel | UI region that displays deterministic factor, grant, and credential state separately from model guidance | The visible trust boundary is central to usability and judging |
| ADD | Recovery Action | A server-owned navigation option available in the current Recovery Transaction | Prevents model-generated actions from being treated as commands |
