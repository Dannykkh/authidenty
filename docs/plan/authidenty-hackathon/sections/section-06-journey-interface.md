# Section 06: Eight-Stage Journey Interface

## Background

The current page is a polished registration proof of concept. `PasskeyRegistration` owns a local switch that replaces the registration panel with `RecoveryAgent`, but the product has no returning-user sign-in, Recovery Code acknowledgment, deterministic authorization panel, replacement ceremony, or completion proof.

This section integrates the public contracts from sections 02 through 05 into one judge-readable product journey. The interface must help an anxious account holder complete recovery while making a security reviewer's central fact visible: GPT-5.6 explains server-approved options, while passkeys and the independent Recovery Code authorize state changes.

## Requirements

- Replace the registration-only local switch with an explicit eight-stage journey controller: Setup, Save Recovery Code, Sign in, Diagnose, Security authorization, Replacement passkey, Completion receipt, and Replacement sign-in.
- Drive every transition from a successful public API response or an explicit user navigation action; never infer authorization from GPT output or client state.
- Keep the Recovery Guide and Security Authorization Panel visually, semantically, and structurally separate.
- Display initial and rotated Recovery Codes once, require acknowledgment, and never place them in URLs, browser storage, chat, analytics, or logs.
- Support normal returning-user passkey Authentication before offering catastrophic recovery.
- Show GPT-5.6 guidance, deterministic fallback labeling, and server-owned Recovery Action buttons without presenting the model as an authenticator.
- Show Re-enrollment Grant purpose and expiry while treating server validation as authoritative.
- Complete replacement enrollment, show masked active/revoked credential states, then require normal passkey sign-in to prove recovery.
- Use generic account, credential, code, and grant errors that do not disclose sensitive state.
- Work at mobile widths, with keyboard-only input, screen readers, reduced motion, and WebAuthn-unavailable states.

## Dependencies

- Requires: section 02 passkey Authentication and Application Sessions.
- Requires: section 03 Recovery Code issuance, Recovery Transactions, throttling, and grants.
- Requires: section 04 replacement ceremony, atomic completion, code rotation, and receipt.
- Requires: section 05 server-owned Recovery Actions, GPT-5.6 guidance, and deterministic fallback.
- Blocks: section 07 verification, evidence capture, and submission.

## Flow Diagram Nodes

This section implements every account-holder-facing state and transition in all four core diagrams.

- **Diagram**: `flow-diagrams/passkey-setup-authentication.mmd`.
  - **Nodes**: `SetupStart`, `ProfileInput`, `RegisterPrompt`, `SetupError`, `SetupRetry`, `AcknowledgeCode`, `PasskeySetupComplete`, `AuthStart`, `UsernameInput`, `AuthPrompt`, `AuthFailure`, and `Authenticated`.
  - **Branches**: `ProfileValid`, `AttestationValid`, and `AssertionValid` render safe errors or advance only from API success.
- **Diagram**: `flow-diagrams/recovery-diagnosis.mmd`.
  - **Nodes**: `RecoveryStart`, `FailureInput`, `PreferAuthentication`, `CollectDescription`, `RejectSecret`, `ShowGuidance`, `NoSelfService`, `TerminalNoBypass`, and `FactorRequired`.
  - **Branches**: `AnotherPasskey`, `FactorConfigured`, `SecretLike`, and `ModelValid` are explained without exposing private policy state.
- **Diagram**: `flow-diagrams/recovery-code-authorization.mmd`.
  - **Nodes**: `CodeSubmit`, `RestartRecovery`, `Throttled`, `GenericReject`, `SetGrantCookie`, and `GrantIssued`.
  - **Branches**: transaction, throttle, match, and reservation failures map to bounded public recovery states.
- **Diagram**: `flow-diagrams/replacement-passkey-completion.mmd`.
  - **Nodes**: `GrantCheck`, `ReenrollReject`, `ReplacementPrompt`, `KeepOriginalState`, `CompletionReceipt`, `ReplacementSignIn`, `PostRecoveryFailure`, and `RecoveryProven`.
  - **Branches**: grant and attestation failure preserve original state; replacement proof succeeds only through normal Authentication.

## Reference Libraries

| Library | Version | Purpose |
|---|---:|---|
| Next.js | 16.2.10 | App Router page and client boundary |
| React | 19.2.4 | Typed journey state and accessible interaction |
| Tailwind CSS | 4.x | Existing token-driven editorial styling |
| `@simplewebauthn/browser` | 13.3.0 | Registration and Authentication browser ceremonies |
| Vitest | 4.1.10 | Component/controller contract tests |

## Implementation Details

### Journey controller

Create a top-level client component that owns navigation state but not security authority. Use a discriminated union rather than independent booleans:

```ts
type JourneyState =
  | { stage: "setup" }
  | { stage: "save-code"; username: string; code: string; context: "initial" | "rotated" }
  | { stage: "sign-in"; username?: string; mode: "initial" | "replacement" }
  | { stage: "diagnose"; username: string; failureCode: FailureCode }
  | { stage: "authorize"; expiresAt: string }
  | { stage: "replace"; expiresAt: string }
  | { stage: "receipt"; receipt: CompletionReceipt; code: string }
  | { stage: "complete"; account: PublicAccountSummary };
```

Do not encode Recovery Transaction, grant, session, or code values into this type. Opaque HttpOnly cookies and server records remain authoritative. Keep recovery resumption limited to sanitized `GET /api/recovery/status`; a browser refresh must never restore a plaintext code.

Render a persistent journey rail using the user-facing labels above. Mark the current stage with `aria-current="step"`, completed stages with text as well as color, and future stages as unavailable. The rail explains progress; it is not free-form navigation across security gates.

### Stage 1: Setup

Refactor the existing registration component without weakening its capability check or WebAuthn error mapping. Submit profile data to `POST /api/passkeys/register/options`, call `startRegistration`, and submit the result to `POST /api/passkeys/register/verify`.

On verification success, move directly to Save Recovery Code using the one-time response. On failure, remain in Setup, clear busy state, focus the error summary, and offer a retry. Existing accounts receive the generic contract response; the UI must not reveal whether an account or credential exists.

### Stage 2: Save Recovery Code

Present the code in a dedicated security panel, never inside the Recovery Guide. Include:

- copy through the Clipboard API with an explicit success announcement;
- download through a transient in-memory `Blob`, with no network request;
- guidance to store it offline and not paste it into chat;
- a required acknowledgment control stating that the code will not be shown again;
- a Continue to sign in action disabled until acknowledgment.

Hold plaintext only in component memory. Do not use `localStorage`, `sessionStorage`, query strings, form defaults, analytics, or error reporting. Add a `beforeunload` warning while an unacknowledged code is visible. If the page reloads, show an honest terminal message that the one-time value cannot be reconstructed; do not invent a read API or display a fixture.

The Completion receipt repeats this pattern for the rotated code before replacement sign-in. Clear the plaintext from journey state immediately after acknowledgment and transition.

### Stage 3: Sign in

Create a username-first form that calls `POST /api/passkeys/authenticate/options`, passes the options to `startAuthentication`, then sends the assertion to `POST /api/passkeys/authenticate/verify`.

Normal success shows the signed-in terminal state. A replacement-mode success shows Recovery proven. A generic `SIGN_IN_FAILED` result offers Retry and Start recovery without claiming whether the account, passkey, device, or assertion caused the failure. Prompt cancellation remains retryable and must not automatically begin recovery.

### Stage 4: Diagnose

Start with `POST /api/recovery/start` using the normalized username and an allow-listed failure code. Then render the bounded Recovery Guide and call `POST /api/recovery/agent` with message/history only.

Label output as either `GPT-5.6 guidance` or `Deterministic fallback`. Show the response boundary beside every result: guidance does not verify identity, approve access, issue a grant, or change credentials. Render server-returned Recovery Actions as buttons outside the message transcript.

Action behavior is fixed:

- `retry_passkey` and `use_another_passkey` return to normal Sign in;
- `verify_recovery_code` enters Security authorization;
- `restart_recovery` starts a new Recovery Transaction;
- `self_service_unavailable` ends honestly with no bypass;
- `create_replacement_passkey` is never accepted from this pre-authorization stage.

If text resembles a Recovery Code or other secret, keep it out of the transcript, announce the warning, and move focus to the dedicated authorization form.

### Stage 5: Security authorization

Use a separate bordered region titled `Security authorization`, with neutral ink until the server verifies the factor. State that the code is checked by Authidenty and is not sent to GPT-5.6.

Submit only to `POST /api/recovery/code/verify`. On success, render a safe-state label, the grant purpose `Create one replacement passkey`, and the server-provided expiry. Then advance to Replacement passkey. On `INVALID_RECOVERY_CODE`, preserve generic copy and clear the input. On `RECOVERY_CODE_THROTTLED`, disable submission for the bounded retry interval while leaving restart guidance visible.

### Stage 6: Replacement passkey

Show the grant expiry as an informative countdown based on `expiresAt`; the client clock never authorizes a ceremony. Request options from `POST /api/recovery/reenroll/options`, call `startRegistration`, and send the attestation to `POST /api/recovery/reenroll/verify`.

If the prompt closes or verification fails while the grant remains valid, offer a fresh options request. If the server returns `REENROLLMENT_NOT_AUTHORIZED`, disable enrollment and offer Restart recovery. Never claim the original credential was revoked before the verify response returns a completion receipt.

### Stages 7 and 8: Receipt and proof

The Completion receipt shows only masked suffixes, statuses, recovery time, and notification event names. Use the safe-state token for server-verified `active` and `revoked` results, never for model output. Show the rotated Recovery Code once and require the same acknowledgment used after initial setup.

After acknowledgment, clear the code and enter Replacement sign-in. Use the ordinary Authentication endpoints and `startAuthentication`; do not treat the completion receipt or grant as an Application Session. Success marks Recovery proven. Failure remains a generic sign-in failure with retry and safe restart options.

### API integration contract

| Stage | Endpoint | UI success transition |
|---|---|---|
| Setup | `POST /api/passkeys/register/options`, `/verify` | Save Recovery Code |
| Sign in | `POST /api/passkeys/authenticate/options`, `/verify` | Signed in or Recovery proven |
| Diagnose | `POST /api/recovery/start`, `/agent`; `GET /api/recovery/status` | Server-approved action |
| Security authorization | `POST /api/recovery/code/verify` | Replacement passkey |
| Replacement | `POST /api/recovery/reenroll/options`, `/verify` | Completion receipt |
| Session exit | `POST /api/session/logout` | Sign in |

All mutations use JSON and same-origin cookies. The client parses only documented public fields, maps unknown errors to a generic message, and never renders raw server exceptions. Any new endpoint must be added to `api-spec.md` and the relevant flow diagram before implementation.

### Visual system and responsive behavior

Keep `page-shell`, the `90rem` maximum, one-pixel editorial grid, near-square panels, and the existing 700ms first reveal. Add `--safe-state: oklch(0.52 0.12 155)` and use it only for deterministic server-verified state. Do not add blue-purple gradients, glass panels, drop-shadow cards, or a dense dashboard.

Desktop uses an asymmetric narrative/rail column and active ceremony column. Mobile becomes one linear column with state summary before the primary action. Name component containers such as `journey` and `ceremony`; use container queries for component rearrangement and media queries only for page-level composition. Keep controls at least 44px high and prevent horizontal overflow at 320px.

Use short `opacity` and `transform` transitions for stage changes and retain View Transitions only as progressive enhancement. Under `prefers-reduced-motion: reduce`, remove all required animation and smooth scrolling. Information hierarchy, focus movement, and success/error meaning must remain intact.

### Accessibility and public error behavior

- Use one `h1`, stage `h2` headings, semantic `form`, `fieldset`, `legend`, `ol`, and `status` regions.
- Move focus to the new stage heading after a successful transition and to the error summary after a failed submit.
- Associate every field error with `aria-describedby`; use `role="alert"` for blocking errors and polite live regions for progress, copy success, and countdown changes.
- Provide visible `:focus-visible` treatment and preserve DOM order as keyboard order.
- Disable a button only while its request is in flight or a server-supplied retry window is active; expose the reason in nearby text.
- Pair every state color with `Guidance`, `Server verified`, `Expired`, `Active`, or `Revoked` text.
- Map unknown account, invalid credential, wrong or redeemed code, expired transaction, and invalid grant to the documented generic public message.
- Never echo Recovery Codes, cookie values, full credential IDs, raw model payloads, or internal correlation details.

## Test Scenarios

### Journey transitions and trust boundary

| Case | Input | Expected result |
|---|---|---|
| Full critical path | Setup through replacement sign-in | Eight stages complete without manual database action |
| Agent suggests replacement early | Forged `create_replacement_passkey` action | UI rejects or ignores it before grant authorization |
| Model unavailable | Agent response source is fallback | Same safe action path remains usable and visibly labeled |
| Normal alternate passkey | Guidance allows another passkey | Return to Sign in; no Recovery Code requested |
| No self-service factor | Terminal server action | Honest stop; no authorization or replacement control |

### One-time secrets and expiry

| Case | Input | Expected result |
|---|---|---|
| Initial code response | Registration verify success | Code shown once; Continue disabled until acknowledgment |
| Copy/download | User activates either control | In-memory value copied/downloaded; accessible confirmation |
| Refresh during reveal | Reload before acknowledgment | Code not restored from storage or another API |
| Rotated code | Completion response | Same one-time acknowledgment behavior before sign-in |
| Grant expires on screen | Server expiry passes | Replacement disabled on server rejection; restart offered |
| Prompt closes before expiry | WebAuthn `NotAllowedError` | Retry with a new options request; no false revocation claim |

### Errors, accessibility, and layout

| Case | Input | Expected result |
|---|---|---|
| Unknown account or revoked credential | Authentication failure | Same generic message and safe actions |
| Wrong, redeemed, or malformed code | Recovery verification failure | Same generic rejection; secret input cleared |
| Throttled code | 429 with retry interval | Submission disabled temporarily; countdown announced sparingly |
| Keyboard only | Complete every stage without pointer | Logical order, visible focus, reachable WebAuthn controls |
| Screen reader | Stage and async state changes | Heading focus and semantic live announcements |
| Reduced motion | Preference enabled | No required animation or smooth scrolling |
| Narrow viewport | 320px width | No horizontal overflow; rail and controls remain readable |
| Unsupported WebAuthn | Capability check false | Clear compatible-browser guidance; no broken ceremony button |

## Implementation Strategy

### Phase 1: Red

- Extract pure journey transition and public-error mapping functions and write table tests first.
- Add component tests for acknowledgment gating, prohibited action filtering, grant expiry presentation, and one-time code cleanup.
- Add accessibility assertions for labels, alerts, stage focus, pressed/disabled states, and keyboard order.
- Add a browser-level test outline using a virtual authenticator before wiring the UI.

### Phase 2: Green

- Create the journey controller and eight minimal stage components using the existing API contracts.
- Integrate real SimpleWebAuthn prompts and HttpOnly-cookie-backed routes; do not use fixtures in the critical path.
- Make the complete lost-device journey work before adding optional readiness or credential-management views.

### Phase 3: Refactor

- Share ceremony status, API parsing, error copy, code reveal, and focus-management primitives without merging trust regions.
- Consolidate tokens and container styles in `globals.css` while preserving the existing visual identity.
- Remove the old registration/recovery boolean switch and dead component state.
- Run the full journey at desktop, mobile, keyboard-only, reduced-motion, model-live, and model-disabled settings.

## Quality Gate

- [ ] Every stage transition is covered by a test and backed by a documented API response or explicit navigation.
- [ ] Recovery Guide and Security Authorization remain separate in DOM structure, labels, color semantics, and copy.
- [ ] Neither initial nor rotated Recovery Code appears in persistent browser storage, URLs, chat, telemetry, or captured errors.
- [ ] GPT/fallback output cannot create or display a replacement-enrollment state before server authorization.
- [ ] Grant expiry and retry behavior match server responses rather than client-clock assumptions.
- [ ] Replacement sign-in uses normal Authentication and proves the new credential.
- [ ] Mobile, keyboard, screen-reader, reduced-motion, and unsupported-WebAuthn scenarios pass.
- [ ] Every UI call matches `api-spec.md`; any new API is documented before code is merged.
- [ ] All mapped flow nodes have a visible state, interaction, error, or explicit terminal outcome.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass without regressions.

## Risk and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| Client state appears to authorize recovery | Critical | Cookies/server status own authority; controller only renders responses | Disable recovery navigation and retain sign-in/setup |
| One-time code leaks through persistence or tooling | Critical | Memory-only state, no telemetry, targeted secret tests | Revoke affected disposable code and disable reveal build |
| UI advances before atomic completion | High | Advance only on verified receipt response | Return to replacement stage with original state intact |
| Client countdown disagrees with server | Medium | Treat countdown as informative and map 401 authoritatively | Hide countdown; retain server-driven expiry message |
| Generic errors make recovery confusing | Medium | Pair generic security copy with concrete safe next actions | Use deterministic support/restart copy without extra detail |
| Eight stages overwhelm mobile users | Medium | Linear layout, one active action, persistent progress text | Collapse completed rail entries while retaining current step |
| Visual polish destabilizes critical path | Medium | Freeze contracts and green journey before refinement | Revert presentation-only commit; retain functional components |

## Acceptance Criteria

- [ ] A new disposable user registers, saves the one-time Recovery Code, and signs in with a passkey.
- [ ] A failed or simulated lost-device sign-in enters visibly non-authorizing GPT-5.6 or fallback guidance.
- [ ] The Recovery Code is entered only in Security authorization and yields a visible, purpose-bound temporary grant.
- [ ] The user creates a replacement passkey, sees masked active/revoked states, saves the rotated code, and signs in normally.
- [ ] Unknown/revoked credentials, invalid codes, expired grants, replay, and model failure never expose private state or create a privileged UI state.
- [ ] The full journey works at mobile width and with keyboard-only and reduced-motion settings.
- [ ] All Test Scenarios and Quality Gate items pass.

## Files to Create or Modify

- `src/app/page.tsx` — render the integrated journey shell instead of registration only.
- `src/app/globals.css` — add safe-state, journey containers, stage transitions, and responsive/accessibility styles.
- `src/features/journey/components/authidenty-journey.tsx` — typed eight-stage controller and focus transitions.
- `src/features/journey/components/journey-rail.tsx` — accessible progress presentation.
- `src/features/journey/journey-state.ts` and `.test.ts` — pure transitions, guards, and forbidden-state tests.
- `src/features/passkeys/components/passkey-registration.tsx` — return one-time setup result to the controller.
- `src/features/passkeys/components/passkey-sign-in.tsx` — username-first normal and replacement Authentication.
- `src/features/recovery/components/recovery-agent.tsx` — transaction-bound guide and server-owned action controls.
- `src/features/recovery/components/recovery-code-reveal.tsx` — memory-only reveal, copy/download, and acknowledgment.
- `src/features/recovery/components/security-authorization.tsx` — deterministic factor form and grant presentation.
- `src/features/recovery/components/replacement-passkey.tsx` — grant-bound replacement ceremony.
- `src/features/recovery/components/completion-receipt.tsx` — masked credential outcome and rotated code reveal.
- `src/features/journey/public-errors.ts` and `.test.ts` — documented generic mappings and enumeration-resistant copy tests.

Any additional state-changing endpoint must be added to `api-spec.md` and the relevant flow diagram before implementation.
