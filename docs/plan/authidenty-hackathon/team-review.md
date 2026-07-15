# Team Review Summary

## Industry Context

- Industry: consumer account authentication and recovery.
- Domain complexity: high security impact, but no identity-proofing or regulated assurance claim.
- UX, architecture, Red Team, domain-process, and domain-technical reviews were time-boxed. Background reviews that exceeded the time box were completed in the main planning context from the same approved files.

## Critical Findings

1. **The complete journey is the product.** Registration and chat alone do not satisfy the hackathon's coherent-experience criterion. Authentication, Recovery Factor verification, replacement enrollment, revocation, and replacement sign-in are mandatory.
2. **Guidance and authorization require separate state and UI.** Recovery Guide output cannot be confused with deterministic factor verification, Re-enrollment Grant state, or credential changes.
3. **Every one-time transition must be transactional.** Recovery Code redemption and Re-enrollment Grant consumption must resist replay and concurrent use.
4. **Every recovery object must be account- and purpose-bound.** The browser cannot select an account after authorization, and the grant cannot become an Application Session.
5. **Replacement registration cannot relax existing conflict checks.** Dedicated routes and service logic must require the grant.
6. **Revocation occurs only after replacement verification succeeds.** Premature revocation can strand the Account Holder.
7. **Recovery secrets must never reach GPT, logs, analytics, screenshots, or persistence in plaintext.** Disposable demo accounts and post-capture rotation are required.
8. **Schema-valid model output is still untrusted.** The server supplies and rechecks allowed Recovery Actions, enforces deterministic boundary text, and provides an identical-policy fallback.
9. **The recorded path cannot contain a demo authorization bypass.** Simulation may trigger a real failure path but cannot mint state or modify the database directly.
10. **Deployment is part of correctness.** Freeze one persistent HTTPS host and RP ID/origin before final credentials and recording.

## Important Findings

- Add migration 002 rather than editing historical schema.
- Use opaque, digest-backed Application Sessions with separate cookies and lifetimes.
- Use Recovery Readiness based only on active credentials, backup state, and configured Recovery Factor.
- Normalize account/credential/code failure responses and document residual timing risk.
- Add database-backed prototype throttling for authentication, GPT calls, and code verification.
- Rotate the Recovery Code and show it once after successful recovery.
- Record a Recovery Notification outbox event but do not claim delivery.
- Keep the current visual system and add a journey rail, Security Authorization Panel, and completion receipt.
- Preserve keyboard, screen-reader, mobile, reduced-motion, and non-color state cues.
- Keep runtime GPT reasoning low unless fixed-scenario evaluation proves medium is worth the latency.

## Nice-to-Have

- Authenticated addition of a second Passkey Credential.
- Another-device path demonstrating how recovery can be avoided.
- Deterministic Recovery Readiness indicator.
- Model latency/fallback evidence for the submission.

## Dismissed or Deferred

- Conversational-style authentication: rejected because of error, cross-topic, privacy, and mimicry risk.
- Recovery contacts and social recovery: useful but too large for the critical path.
- Email/SMS delivery: excluded as an authorization factor and deferred as notification transport.
- Production distributed rate limiting, multi-region storage, certification, and identity proofing: outside the honest prototype claim.
- Full visual redesign: rejected because the current direction is distinctive and functional.

## Domain Decisions

- accepted-by-default: one-time saved Recovery Code is the primary catastrophic-loss factor for the demo.
- accepted-by-default: another active passkey uses normal Authentication before Account Recovery.
- accepted-by-default: reported lost credential is revoked only after replacement succeeds.
- accepted-by-default: safe terminal state when no configured factor remains.
- deferred-by-default: pending-recovery resume after grant expiry is documented as a production gap unless implementation proves it necessary for demo reliability.

## Dictionary Changes

- accepted-by-default: Recovery Readiness, Recovery Action, Security Authorization Panel, Ceremony State, Recovery Attempt Throttle, and Recovery Notification.
- accepted-by-default: refined Recovery Factor, Application Session, Re-enrollment Grant, and Account Recovery definitions.
- unresolved-conflict: none.

## Global Dictionary Sync

- inferred-skip: no global dictionary write; a new global dictionary was not requested.

## Impact on Plan

- Sequence implementation from migration and repository one-time primitives outward to services, routes, UI, and one browser journey.
- Gate all optional work behind a green critical path.
- Add a deployment decision before final browser verification, screenshots, and recording.
- Include a public-claims checklist so the submission does not overstate identity proofing, AAL compliance, notification delivery, or live-model evidence.
