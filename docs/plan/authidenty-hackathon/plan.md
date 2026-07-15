# Implementation Plan: Authidenty Build Week Submission

Date: 2026-07-15
Deadline: 2026-07-21 5:00 PM PT / 2026-07-22 9:00 AM KST
Planning status: Draft before external review

## Outcome

Deliver one complete, reproducible journey:

```text
register passkey
  -> acknowledge one-time Recovery Code
  -> sign in with passkey
  -> encounter lost-device failure
  -> receive GPT-5.6 diagnosis and server-approved path
  -> verify Recovery Code outside the model
  -> receive one-time Re-enrollment Grant
  -> register replacement passkey
  -> revoke reported lost credential and rotate code
  -> sign in with replacement passkey
```

The submission succeeds only if that journey works without a hidden admin action, manual database edit, model authorization, or identity-document/biometric collection.

## Strategy Decision

### Candidate A: Security-core critical path

Extend the existing layered monolith from persistence outward. Implement transactional repository primitives first, then Authentication, Application Session, Recovery Code, Re-enrollment Grant, replacement ceremony, model grounding/fallback, UI, and one browser test. Optional features remain gated behind the green journey.

### Candidate B: Demo-first orchestration

Build every screen and scripted state first, then connect real APIs and security state later. This produces visible progress quickly but encourages fixture responses, privileged shortcuts, and late rewrites around one-time state.

### Candidate C: Recovery-resilience platform

Implement multiple credentials, synced/device-bound readiness, another-device authentication, recovery codes, contacts, cooldowns, notifications, and full credential management. It best resembles a mature product but cannot be completed and explained reliably within the hackathon window.

### Scoring

Scores are 1–5, where higher is better. For risk/complexity and effort/cost, a smaller safer implementation receives the higher score.

| Criterion | A: Security core | B: Demo first | C: Resilience platform |
|---|---:|---:|---:|
| Requirements coverage | 5 | 3 | 5 |
| Domain/security fit | 5 | 2 | 5 |
| Risk and complexity | 5 | 2 | 2 |
| Incremental verification and rollback | 5 | 3 | 3 |
| Effort and cost | 4 | 5 | 1 |
| **Total** | **24** | **15** | **16** |

### Selected Strategy

Choose Candidate A. Graft Candidate B's judge-focused state presentation only after each server transition exists. Graft Candidate C's Recovery Readiness metadata and second-passkey recommendation only if the critical browser journey is green.

## Product and Security Architecture

```text
Browser / authenticator
        |
        | WebAuthn registration or assertion
        v
Next.js route handlers
        |
        +--> passkey services --> credential repository
        |
        +--> recovery policy --> code/grant/session repositories
        |           |
        |           +--> deterministic allowed Recovery Actions
        |                           |
        |                           v
        +------------------> GPT-5.6 Recovery Guide
                                    |
                                    +--> explanation only
```

Authorization-changing operations remain in deterministic services and database transactions. The Recovery Guide has no tools or repositories.

## Delivery Gates

| Gate | Pass condition | Work blocked until pass |
|---|---|---|
| G1: Persistence | Migration and one-time repository tests pass | Authentication/recovery routes |
| G2: Authentication | Register and sign in through API and browser | Account-bound recovery entry |
| G3: Recovery authorization | Code can issue exactly one scoped grant; replay/races fail | Re-enrollment routes |
| G4: Replacement | New credential works; old reported credential fails | Visual polish and optional features |
| G5: Model boundary | Live or mocked GPT plus deterministic fallback pass policy tests | Recording |
| G6: Submission | Lint, tests, build, browser journey, secret scan, fixed-origin run pass | Final submission |

## Implementation Workstreams

### 1. Database and repository invariants

Create migration `002_authentication_recovery` without changing migration 001.

Add or extend storage for:

- credential status and revocation timestamp;
- credential lookup, counter, backup state, and last-used update;
- opaque Application Session token digests and expiry;
- Recovery Code digest/version/status (`active`, `reserved`, `redeemed`), reservation owner/expiry, and rotation metadata;
- Recovery Attempt Throttle state;
- Recovery Transaction status and reported credential;
- Re-enrollment Grant digest, user/purpose binding, expiry, and consumption;
- Recovery Notification outbox record.

Quality gate:

- repository tests cover expiry, cross-account rejection, concurrent/repeated consumption, code rotation, and credential state transitions;
- no plaintext secret column exists;
- down migration restores the prior schema for disposable development data.

### 2. Passkey Authentication and Application Session

Add:

- `authentication-service.ts` mirroring registration dependency-injection patterns;
- `POST /api/passkeys/authenticate/options`;
- `POST /api/passkeys/authenticate/verify`;
- active-credential lookup and strict SimpleWebAuthn verification;
- atomic credential-use update;
- opaque Application Session cookie and validation helper;
- sign-in component and normalized WebAuthn failure mapping.

Public behavior:

- unknown account/credential/revoked states return generic sign-in failure;
- cancellation and timeout remain retryable diagnostic states;
- Application Session is issued only after verified Authentication.

### 3. Recovery Readiness and Recovery Code

After first registration:

- generate a high-entropy Recovery Code;
- display it once with copy/download and acknowledgment;
- persist a versioned keyed digest only;
- show deterministic Recovery Readiness from credential backup state and factor presence.

Implement dedicated candidate verification:

- code never appears in model input, conversation history, application logs, or public audit data;
- attempts are throttled;
- successful verification atomically reserves the code to one Recovery Transaction and issues at most one active Re-enrollment Grant;
- replacement success atomically redeems and rotates the code;
- grant/transaction expiry releases the reservation through a tested policy without changing credentials;
- repeated, concurrent, and cross-account attempts fail.

This reserve-authorize-complete sequence prevents a failed WebAuthn prompt from permanently consuming the only Recovery Factor. The recorded path must not use reset or manual edits.

### 4. Re-enrollment and Credential Lifecycle

Add dedicated routes and service:

- `POST /api/recovery/reenroll/options`;
- `POST /api/recovery/reenroll/verify`;
- grant validation and one-time consumption;
- strict replacement WebAuthn verification;
- replacement credential creation;
- reported credential revocation only after success;
- Recovery Code rotation and one-time display;
- Recovery Notification outbox record;
- completion receipt.

Do not modify the ordinary unauthenticated registration conflict rule.

### 5. Grounded GPT-5.6 Recovery Guide

Keep `gpt-5.6` or pin `gpt-5.6-sol`. Do not create an Ultra API model name.

Change the model input from user-selected failure alone to a server policy projection:

```text
failureCode
anotherPasskeyPermitted
recoveryCodeConfigured
recoveryTransactionState
allowedActions
bounded user description/history
```

Deterministic policy computes the complete Recovery Action set. The model returns tentative diagnosis, plain-language guidance, and optional prioritization within that set. Re-intersect its output on the server and keep a safe alternative visible.

Add deterministic fallback for:

- missing API key;
- timeout/network error;
- refusal;
- schema or semantic validation failure;
- empty safe action set.

Evaluate low versus medium reasoning on 8–12 fixed scenarios. Measure allowed-action coverage, forbidden approval/identity claims, schema success, fallback success, and p50/p95 latency. Keep low unless medium materially improves correctness within demo latency.

### 6. Journey UI

Replace the registration-only local switch with a small flow controller or route/state model:

1. Setup
2. Save Recovery Code
3. Sign in
4. Diagnose
5. Security authorization
6. Replacement passkey
7. Completion receipt
8. Replacement sign-in

Extend the current design system:

- journey rail for stage visibility;
- separate Recovery Guide and Security Authorization Panel;
- server-owned Recovery Action buttons;
- masked credential receipt with active/revoked status;
- model fallback label;
- mobile linear layout, keyboard focus, screen-reader announcements, reduced motion.

No full redesign before G4 passes.

### 7. Verification and Evidence

Automated checks:

- repository/service/route tests for every security transition;
- strict expected Origin/Host and JSON content-type tests for state-changing routes;
- prompt-injection and model-output boundary tests;
- secret/redaction tests;
- lint, TypeScript/build, dependency audit, and public-history secret scan;
- browser virtual-authenticator journey covering replacement and rejection of the old credential.

Manual checks:

- final host RP ID/origin;
- real Windows Hello or equivalent ceremony where available;
- live GPT-5.6 response model and latency;
- model-disabled fallback;
- mobile viewport, keyboard, focus, and reduced motion;
- screenshots with disposable state only.

## Sol Ultra Work Allocation

Ultra accelerates independent work; it does not remove dependency gates.

### Good parallel tasks

- read-only code exploration and library/API checks;
- UX, architecture, and Red Team reviews;
- independent repository, service, and UI tests after interfaces are fixed;
- README, Devpost story, demo script, and screenshot checklist after behavior is stable;
- browser accessibility and security scans on an already-integrated build.

### Keep sequential

- migration before repository implementation;
- repository contracts before services;
- Authentication before account-bound recovery;
- Recovery Code verification before Re-enrollment Grant use;
- replacement verification before revocation;
- integrated browser journey before visual polish and recording.

### Agent-edit rule

Assign one agent one bounded file group. Do not let multiple agents edit the same schema, repository, auth service, or journey controller concurrently. The root agent integrates and runs the gate checks after each batch.

## Commit Sequence

Each commit stays small, uses an English message, and passes its focused tests.

1. `test(db): specify authentication and recovery invariants`
2. `feat(db): add authentication and recovery state`
3. `feat(auth): verify passkey sign-in`
4. `feat(auth): issue application sessions`
5. `feat(ui): add returning-user passkey sign-in`
6. `feat(recovery): issue one-time recovery codes`
7. `feat(recovery): authorize replacement enrollment`
8. `feat(auth): revoke lost passkey credentials`
9. `feat(recovery): ground GPT guidance in policy state`
10. `feat(ui): complete the recovery journey`
11. `test(e2e): cover lost-device passkey recovery`
12. `docs: prepare the Build Week submission`

Commits may be combined only when the smaller commit cannot build or test independently. Do not rewrite unrelated existing history.

## Calendar Plan

### July 15 KST: planning and evidence baseline

- Complete research, spec, threat model, API/DB/flow design, and QA scenarios.
- Preserve the 22-test baseline and current clean `main` state.
- Confirm API key availability without exposing it.

### July 16 KST: Authentication gate

- Decide the final evidence environment first: persistent single-instance SQLite host if already available, otherwise verified localhost recording. Public deployment is optional.
- Migration/repository primitives for credential status and Application Session.
- Authentication service, routes, tests, and sign-in UI.
- Browser register-to-sign-in verification.
- Cut line: if sign-in is not green by end of day, defer backup-state UI and all optional work.

### July 17 KST: Recovery authorization gate

- Recovery Code issuance, digest storage, acknowledgment, throttle, redemption.
- Re-enrollment Grant issuance/consumption and tests.
- Replacement registration and revocation transaction.
- Cut line: no social recovery, email delivery, or second-passkey management.

### July 18 KST: Integrated journey and GPT gate

- Wire real failure state into Recovery Transaction and Recovery Guide.
- Add allowed-action projection and deterministic fallback.
- Complete browser journey with replacement sign-in and old-credential rejection.
- Cut line: if multi-turn chat destabilizes the journey, reduce to one diagnostic turn plus deterministic follow-up screens.

### July 19 KST: UX, accessibility, deployment

- Verify the already-selected evidence host and RP configuration; do not start a late database migration for a public URL.
- Extend current design across all states; mobile and accessibility pass.
- Run security/dependency checks and resolve critical/high findings.
- Capture development screenshots and one live-model proof.
- Cut line: if persistent deployment is unstable, record a fully verified localhost run and keep the public repository runnable; do not fake hosting or notification delivery.

### July 20 KST: Recording and submission materials

- Rehearse to a 2:45 target.
- Record full journey, model role, and security boundary.
- Update README architecture, limitations, sources, and Codex evidence.
- Draft final Devpost fields and captions.

### July 21 KST: buffer and early submit

- Run clean-install checks, tests, build, browser journey, secret/history scan.
- Watch the final video once without developer context.
- Push final small commits and submit early enough for upload/form failures.
- Make only blocker fixes after submission; avoid feature additions.

## Cut List in Priority Order

If time slips, remove work in this order:

1. Recovery Readiness visualization.
2. Authenticated second-passkey management.
3. Another-device live demonstration.
4. Multi-turn Recovery Guide; retain one structured diagnostic turn.
5. Delivered notifications; retain an honestly labeled outbox record.
6. Public deployment; retain a runnable repository and verified localhost video if rules permit.

Never cut passkey Authentication, deterministic Recovery Code verification, one-time Re-enrollment Grant, replacement enrollment, credential revocation, replacement sign-in, or the explicit model boundary.

## Demo Script Outline

1. “Losing a device should not mean uploading a passport.”
2. Register a passkey and save a Recovery Code.
3. Sign in normally; identify the credential as active.
4. Trigger the lost-device path and describe the problem.
5. Show GPT-5.6 diagnosing the failure and choosing only server-permitted actions.
6. Show that the code is entered in Security Authorization, not the chat.
7. Verify the code, show the expiring one-purpose grant, and create a replacement passkey.
8. Show the lost credential revoked, code rotated, notification recorded, and replacement sign-in succeeding.
9. Close with the boundary: “The model explains recovery. Cryptography authorizes it.”

## Open Decisions Before Implementation

- Exact grant and Application Session lifetimes within the recommended short ranges.
- Evidence environment: persistent single-instance host if already available, otherwise fixed localhost origin for the recorded run.
- Whether the only-credential demo can deterministically identify the credential to revoke without adding a selection screen.
- Whether live GPT-5.6 access is available early enough to capture verified evidence before final recording.

Recommended defaults: 10-minute Recovery Transaction/grant window with reservation release on expiry, 30-minute Application Session, revoke the only original credential in the disposable demo account, verify live-model access on July 16, and retain deterministic fallback.
