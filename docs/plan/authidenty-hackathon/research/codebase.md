# Authidenty Codebase Research

## Scope and Method

This review followed the project discovery order: `codemap/index.md`, category indexes, `README.md`, the kickoff handoff, the active feature spec, then eight representative implementation or test files. It also searched the source tree for authentication and recovery signals, inspected recent commit history, and ran the existing test suite.

Verification result on 2026-07-15: `npm test` passed all 7 test files and all 22 tests.

## Current Implemented Boundary

Authidenty is no longer a hello-world scaffold. It currently implements two coherent slices:

1. Passkey registration from browser ceremony through server verification and SQLite persistence.
2. Policy-bounded recovery guidance from a browser conversation through a GPT-5.6 Structured Output response.

The application does not yet authenticate a returning user, create an authenticated application session, authorize account recovery, or allow a replacement passkey to be enrolled. The current recovery experience explains possible next steps, but every returned action is display-only.

### Implemented registration flow

- `src/features/passkeys/components/passkey-registration.tsx` collects a display name and email address, requests registration options, invokes `startRegistration`, and verifies the browser response.
- `src/app/api/passkeys/register/options/route.ts` and `src/app/api/passkeys/register/verify/route.ts` are the two registration endpoints identified by the route index.
- `src/server/passkeys/registration-service.ts` normalizes the profile, creates an opaque WebAuthn user ID, requires a discoverable credential and user verification, stores a five-minute challenge, consumes it once, verifies origin and RP ID, and persists the public credential fields.
- `src/server/db/passkey-repository.ts` provides typed user, challenge, and credential persistence operations.
- `src/server/db/migrations/001_initial.up.sql` already permits both `registration` and `authentication` challenge types. It also contains credential counter and `last_used_at` columns, so the schema anticipated sign-in even though repository and service operations are not implemented.
- Registration deliberately rejects an existing account that already has a credential. This is an important current security boundary: there is no unauthenticated path to add another passkey.

### Implemented recovery-guidance flow

- `src/features/recovery/components/recovery-agent.tsx` posts a selected failure code, message, and bounded history to `/api/recovery/agent`; its returned actions are rendered as labels rather than executed.
- `src/server/recovery/recovery-agent.ts` limits input to five known failure codes, six prior messages, and 500 characters per message. It validates output against three fields and four server-owned action values.
- `src/server/recovery/openai-recovery-model.ts` uses `gpt-5.6`, low reasoning effort, Structured Outputs, `store: false`, a hashed safety identifier, no tools, and explicit instructions that the model cannot authenticate or approve re-enrollment.
- `src/app/api/recovery/agent/route.ts` creates a short-lived strict HttpOnly recovery cookie used only to derive the safety identifier. It does not bind the conversation to an account, authorization state, or recovery transaction.
- Neither recovery conversation text nor identity evidence is persisted.

## Missing Work for the Complete Demo

### 1. Passkey sign-in

The route map contains no authentication-options or authentication-verification endpoints, and the source contains no `startAuthentication` or `verifyAuthenticationResponse` use.

Required work:

- Add an authentication service parallel to `registration-service.ts`.
- Generate authentication options for a normalized username or a discoverable-credential flow.
- Store and consume an `authentication` challenge using the existing challenge table.
- Look up the submitted credential by credential ID and ensure it belongs to the expected user.
- Verify the assertion with strict RP ID, origin, and user verification requirements.
- Atomically update the signature counter and `last_used_at` after successful verification.
- Issue an authenticated application session in a Secure, HttpOnly, SameSite cookie.
- Add browser UI using `startAuthentication`, including mapped WebAuthn failure codes that can open the recovery experience with real failure context.

### 2. Independent recovery authorization

The recovery model only recommends `use_recovery_factor`; there is no recovery factor table, issuance, hashing, verification, expiration, attempt limit, or redemption logic.

For the hackathon, the smallest defensible path is a server-issued single-use recovery code:

- Generate it after initial passkey registration and display it once.
- Store only a slow hash or keyed digest, never the plaintext code.
- Bind it to one user and one recovery purpose.
- Consume it transactionally and irreversibly.
- Add expiration or an explicit replacement lifecycle and a small attempt limit.
- After redemption, issue a short-lived, single-purpose re-enrollment grant rather than a general authenticated session.

A trusted second device is a strong alternative, but it depends on sign-in plus multi-credential management and is a larger demo path. Delegated recovery and behavioral consistency add still more state, abuse controls, and explanation burden. They should remain researched alternatives rather than the critical path.

### 3. Cryptographically authorized re-enrollment

Current registration correctly blocks accounts that already have a credential. Re-enrollment therefore needs a separate authorization boundary, not a relaxation of `findOrCreateUser`.

Required work:

- Add a short-lived re-enrollment grant with a one-time nonce, user ID, purpose, issue time, expiry, and consumed time.
- Issue the grant only after a recovery factor is verified or an existing authenticated passkey session authorizes adding a device.
- Add dedicated re-enrollment options and verify routes that require and consume this grant.
- Reuse the strict registration verification settings and public credential persistence logic.
- Decide whether the lost credential is retained, quarantined, or revoked; the demo should make that result visible and deterministic.
- Prevent replay, cross-account use, and using a recovery grant for ordinary session authentication.

### 4. End-to-end product state

The current primary UI is registration-first and switches locally into recovery guidance. A complete submission needs explicit states for register, sign in, failed sign in, verify recovery code, enroll replacement, and completion.

The smallest coherent demo journey is:

```text
register passkey
  -> receive recovery code once
  -> sign in successfully
  -> simulate lost device / passkey unavailable
  -> GPT-5.6 diagnoses and recommends an allowed path
  -> verify the independent recovery code on the server
  -> consume a re-enrollment grant
  -> register a replacement passkey
  -> sign in with the replacement
```

The model should remain outside every transition that changes authorization. It may explain state and choose labels from a server-provided action set, but the server must own recovery factor verification, grant issuance, credential changes, and session creation.

## Existing Conventions to Preserve

Eight recurring codebase patterns should guide implementation:

1. **Layered slices:** browser components live under `src/features`, App Router handlers under `src/app/api`, domain logic under `src/server`, and storage operations under `src/server/db`.
2. **Schema-first boundaries:** Zod validates external JSON and model output before domain use.
3. **Dependency injection for security tests:** registration accepts a verifier and recovery accepts a model interface, making important decisions testable without network or authenticators.
4. **Single-use persisted ceremonies:** WebAuthn challenges are database-backed, short-lived, scoped by ceremony type, and consumed before verification completes.
5. **Strict WebAuthn policy:** RP ID, origin, user verification, opaque user handles, and non-identifying attestation are explicit.
6. **Minimal persistence:** only public credential material and minimal account metadata are stored; model conversation content is not stored.
7. **Policy-bounded model use:** structured allow-listed output, no tools, no security decision, short context, and privacy-preserving request settings.
8. **Small verified commits:** history progresses from schema to repository to routes to UI to documentation, with English commit messages and tests around security-sensitive services.

New services should expose plain typed functions, accept time and verifier dependencies where useful, keep route handlers thin, and place transactional one-time state changes in the repository layer.

## Test Baseline and Needed Coverage

Existing tests cover:

- schema constraints and migration shape;
- challenge expiry and one-time consumption;
- credential field round-tripping;
- relying-party configuration;
- registration option privacy and verification;
- rejection of unauthenticated re-enrollment;
- recovery request and model-output validation;
- GPT-5.6 request privacy and instruction boundaries;
- recovery route validation and service failure behavior.

The passing 22-test baseline is useful, but it does not exercise any returning-user authentication or authorized recovery transition.

Add tests in the same sequence as implementation:

1. Repository tests for credential lookup, counter update, recovery factor redemption, grant issue/consume, expiry, and replay.
2. Authentication-service tests for correct credential selection, wrong user, wrong RP/origin, missing or expired challenge, failed user verification, counter behavior, and one-time challenge use.
3. Recovery authorization tests for wrong code, repeated attempts, cross-account use, successful one-time redemption, expired grant, and grant replay.
4. Re-enrollment tests proving an existing account still cannot add a credential without a valid grant and can do so exactly once with one.
5. Route tests for cookie attributes, generic error messages, malformed payloads, and no leakage of account existence or recovery secrets.
6. One browser-level journey using a virtual WebAuthn authenticator for registration, sign-in, simulated loss, recovery authorization, replacement enrollment, and replacement sign-in.

## Likely Extension Points

### Database and repository

- Add a second migration rather than editing `001_initial.up.sql` after it has shipped in history.
- Extend `CredentialRecord` only with fields needed by authentication and lifecycle state.
- Add `findCredentialById`, an atomic counter/last-used update, and explicit credential status or revocation operations.
- Add narrowly scoped repositories for hashed recovery factors, re-enrollment grants, and authenticated sessions. Each one-time consume operation should use an immediate transaction, following `consumeChallenge`.

### Passkey server layer

- Create `src/server/passkeys/authentication-service.ts` beside the registration service.
- Extract shared credential persistence or WebAuthn mapping only after duplication is real; the existing registration service is small and stable.
- Add a dedicated re-enrollment service or an explicit authorized mode with a strongly typed grant. Do not add a boolean such as `skipConflictCheck` to the public registration input.

### API layer

- Add `/api/passkeys/authenticate/options` and `/api/passkeys/authenticate/verify`.
- Add server-owned recovery factor and re-enrollment endpoints under `/api/recovery`; do not turn the LLM route into a privileged command endpoint.
- Keep separate cookies for authentication ceremony, application session, recovery conversation, and re-enrollment authorization, with narrow paths and expirations.

### Browser layer

- Add a sign-in component beside `passkey-registration.tsx` and a small parent flow controller for screen state.
- Convert verified WebAuthn failures into the existing recovery failure-code vocabulary server-side or through a strict client mapping.
- Make recovery actions real navigation choices backed by server state; do not execute model-provided strings as URLs or commands.
- Preserve the current direct, privacy-specific copy and its explicit security boundary.

## Risks and Open Questions

Nine implementation risks require explicit treatment:

1. **Account enumeration:** username-first sign-in, registration conflicts, and recovery-factor responses can reveal whether an account exists unless public messages and timing are normalized.
2. **Counter correctness:** authentication must update counters atomically and account for multi-device passkeys whose counters may not behave like single-device credentials.
3. **Session confusion:** ceremony cookies, authenticated sessions, recovery conversations, and enrollment grants need distinct names, purposes, paths, and lifetimes.
4. **Recovery replay:** recovery factors and grants must be single-use under concurrent requests, not only checked and later deleted in separate operations.
5. **Privilege expansion:** a recovery grant must authorize only replacement enrollment, never general sign-in or arbitrary credential management.
6. **Credential lifecycle ambiguity:** the plan must decide what happens to the lost credential and communicate it in the demo.
7. **Guidance/action mismatch:** the LLM currently suggests actions the product cannot execute, which risks a dead-end demo until server-owned recovery screens exist.
8. **Live-model availability:** current automated tests mock the model boundary; a live GPT-5.6 call still depends on deployment credentials, latency, and model access, so a controlled demo fallback is needed without misrepresenting it as a live result.
9. **Deployment RP binding:** the final HTTPS hostname determines RP ID and origin. Changing hosts after credentials are created invalidates the demo credentials and can disrupt recording.

Open decisions that affect implementation order:

- Recovery code versus trusted-device authorization for the primary demo. Codebase evidence favors the recovery code because trusted-device recovery requires the full multi-credential management surface first.
- Whether successful recovery revokes the old credential immediately or marks it lost. Immediate revocation is simplest to explain but needs a credential status field and deterministic test setup.
- Whether sign-in is username-first or usernameless. Username-first is easier to demo and aligns with current user lookup, but requires stronger account-enumeration controls.
- Which deployment hostname will be fixed before final browser verification and recording.

## Codebase Recommendation

Proceed by extending the existing architecture rather than refactoring it. The shortest safe sequence is repository primitives, passkey sign-in service and routes, sign-in UI, recovery-code lifecycle, one-time re-enrollment grant, replacement registration, then a single browser journey. Behavioral consistency should not enter the critical implementation path; the current server and data model have no safe decision boundary for it, and it adds no capability required to complete the lost-device-to-new-passkey story.

No additional codebase research is required before planning. A short follow-up inspection should occur only immediately before implementation to read the local Next.js 16 route-handler documentation required by `AGENTS.md` and the exact SimpleWebAuthn authentication API types installed in `node_modules`.
