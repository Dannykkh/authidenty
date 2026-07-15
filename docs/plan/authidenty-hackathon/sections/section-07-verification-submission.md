# Section 07: Verification and Submission

## Background

Authidenty is credible only if the complete account-control journey works on one fixed WebAuthn origin, negative security paths are externally verified, and the submission explains GPT-5.6's useful but non-authorizing role. This section freezes behavior, runs the release gates, captures non-sensitive evidence, and prepares the English repository and Devpost materials.

## Requirements

- Choose the evidence environment before recording new credentials: a stable single-instance persistent SQLite host if already available, otherwise a fixed localhost origin when hackathon rules permit it.
- Complete the critical path with no database edits, hidden admin actions, or fixture-only state.
- Run repository, service, route, browser, accessibility, build, and secret/history checks.
- Verify both live GPT-5.6 guidance and the deterministic fallback, or disclose clearly if live access is unavailable.
- Demonstrate replay rejection, replacement sign-in, and revoked-credential rejection.
- Capture only disposable accounts, masked credential suffixes, and non-secret state.
- Produce an English README, architecture/security explanation, Codex build narrative, concise demo script, and Devpost-ready evidence.
- Submit a video no longer than three minutes and leave a buffer before the deadline.

## Dependencies

- Requires: sections 01–06 complete and behavior frozen.
- Blocks: final Build Week submission only.

## Flow Diagram Nodes

- **Diagrams**: every file in `flow-diagrams/`.
- **Nodes**: the full cross-diagram path from `SetupStart` to `Authenticated`, `RecoveryStart` to `FactorRequired`, `CodeSubmit` to `GrantIssued`, and `GrantCheck` to `RecoveryProven`.
- **Branches**: every invalid/expired/replay/model-failure branch must have an automated or recorded manual check. Terminal states must never lead to authorization without a valid transition.

## Reference Libraries and Tools

| Tool/library | Version | Purpose |
|---|---:|---|
| Vitest | 4.1.10 | Unit, repository, service, and route verification |
| Next.js | 16.2.10 | Production build and server run |
| Browser WebAuthn/virtual authenticator | Current stable | Critical-path browser verification |
| SimpleWebAuthn | 13.3.x | WebAuthn ceremony behavior |
| Git | Installed workspace version | Small commits and public-history review |
| TermSnap | Workspace integration | Development screenshots excluded from Git |

Use official OpenAI, W3C WebAuthn, NIST SP 800-63B-4, FIDO, Build Week, and Devpost sources for factual claims. Do not claim certification or a production assurance level.

## Implementation Details

### Evidence environment decision

Decide on July 16 before creating credentials for the final walkthrough:

1. Prefer an already available HTTPS host with one persistent application instance and durable SQLite storage.
2. If no such host is stable, use a fixed localhost origin for the recorded run if rules allow it.
3. Configure one exact `AUTHIDENTY_RP_ID`, `AUTHIDENTY_ORIGIN`, database path, and OpenAI model.
4. Verify Origin/Host rejection and browser WebAuthn behavior on that exact origin.
5. Do not start a late SQLite-to-Postgres migration merely to obtain a public URL.

Document the selected environment and limitations in README. A public deployment is optional; a reproducible product is not.

### Automated gate

Run from a clean dependency state where practical:

```text
npm run lint
npm test
npm run build
```

Add a browser-level test using a virtual authenticator if the chosen browser framework is stable within the remaining time. The critical test must register, acknowledge the code, sign in, start recovery, run live or fallback guidance, authorize with the code, replace the passkey, sign in with the replacement, and reject the revoked credential. If the browser framework cannot safely export or select two virtual credentials, retain service/route proof for old-credential rejection and document the boundary instead of faking it.

Test route middleware against wrong Origin, wrong Host, wrong content type, missing cookies, expired state, replay, and cross-account binding. Capture a log stream during secret-marker tests and assert that code, cookie, token, API-key, and raw conversation markers do not appear.

### Model evidence

Verify one live Responses API request early, with the configured model returned or recorded from safe metadata. Run the fixed evaluation set from section 05 at low and medium reasoning and keep low unless medium clearly improves correctness within acceptable p95 latency.

Record the fallback path by disabling model access in a controlled local run. Label it as fallback. Never represent canned output as a live model response.

### Manual usability and accessibility pass

Check desktop and narrow mobile viewport for:

- no horizontal overflow;
- keyboard-only completion and visible focus;
- programmatic labels and error association;
- `aria-live` updates that do not repeat secrets;
- reduced-motion behavior;
- agent versus Security Authorization distinction without color alone;
- readable code acknowledgment and grant expiry;
- no full credential IDs or secret values after one-time screens.

Verify actual font loading and form-control colors, including browser autofill and dark-mode system behavior where relevant.

### Evidence capture

Use a disposable account and rotated Recovery Codes. Before each screenshot, inspect the frame for code plaintext, email addresses not intended for publication, tokens, terminal environment values, and full credential IDs. Screenshots under `.termsnap/` stay excluded by `.gitignore`.

Capture at minimum:

1. running initial skeleton or early implementation state;
2. passkey setup and one-time code state with secret redacted or disposable;
3. normal signed-in state;
4. GPT-5.6 diagnosis with visible guidance boundary;
5. separate Security Authorization state without the code visible;
6. replacement receipt showing masked active/revoked credentials;
7. passing checks and final mobile view.

### README and submission package

Update the English README with:

- problem and “Apps for everyday life” fit;
- complete working journey;
- architecture diagram and deterministic authorization boundary;
- exact GPT-5.6 contribution and fallback behavior;
- local setup, required environment variables, fixed-origin constraints, migration behavior, and commands;
- privacy statement: no identity documents, raw biometrics, private keys, Recovery Code plaintext persistence, or writing profiles;
- limitations: account-control recovery prototype, one saved code, disposable one-credential demo, no production assurance/certification claim;
- test evidence and how Codex was used for research, design, implementation, review, and verification.

Keep citations close to security and model claims. Do not market conversational behavior as identity proof.

### Demo script and timing

Target 2:45, leaving 15 seconds of upload tolerance:

1. Problem, 15 seconds: losing a device should not require uploading a passport.
2. Setup/sign-in, 35 seconds: passkey, saved Recovery Code, normal Authentication.
3. Failure/GPT, 35 seconds: lost-device diagnosis and server-owned allowed path.
4. Authorization/replacement, 55 seconds: enter code outside chat, show scoped grant, create replacement.
5. Proof/boundary, 25 seconds: revoked old credential, rotated code, replacement sign-in, deterministic fallback mention.

Use the closing line: “The model explains recovery. Cryptography authorizes it.”

### Git and deadline discipline

Keep the planned small English commits. Before pushing, review `git status`, staged diff, generated files, `.gitignore`, and public history for secrets. Submit by July 21 rather than waiting for the July 21 5:00 PM PT deadline window. After submission, make only blocker fixes.

## Test Scenarios

### Critical browser journey

| Case | Action | Expected result |
|---|---|---|
| Complete path | Register through replacement sign-in | No hidden state edits; all visible stages complete |
| Model unavailable | Repeat diagnosis with key disabled | Deterministic fallback; authorization still works |
| Grant replay | Re-submit completion | Rejected; no second credential/code |
| Code replay | Use redeemed code | Generic rejection; no grant |
| Revoked credential | Try old assertion | Generic 401; no session |
| Fixed-origin mismatch | Run on unexpected origin | Ceremony or route rejected safely |

### Accessibility and layout

| Case | Action | Expected result |
|---|---|---|
| Keyboard only | Complete every control | Logical focus order and visible focus |
| Narrow viewport | 320–375px width | No horizontal overflow or hidden primary action |
| Reduced motion | Enable preference | No required motion; state remains clear |
| Screen reader semantics | Inspect fields/status | Labels, errors, headings, and live regions are meaningful |

### Submission integrity

| Case | Check | Expected result |
|---|---|---|
| Clean install/build | Install and run commands from README | Documented project starts and builds |
| Secret scan | Worktree and public Git history | No keys, code plaintext, tokens, or private data |
| Screenshot review | Inspect every published frame | Disposable/masked content only |
| Claim review | Search README/video copy | No LLM-authentication, identity-proof, certification, or AAL2 claim |
| Video timing | Exported final video | At most three minutes and understandable without narration context |

## Implementation Strategy

### Phase 1: Red

- Write the browser journey and negative route tests before final UI polish.
- Create a submission checklist with explicit failing gates.
- Time the unedited walkthrough to find scope cuts early.

### Phase 2: Green

- Fix only blockers to the critical path, verification commands, accessibility, and evidence.
- Capture one reproducible live-model run and one fallback run.
- Complete README and submission fields from verified behavior.

### Phase 3: Refactor

- Remove obsolete fixtures, debug routes, unsafe logs, and dead experimental copy.
- Tighten the demo to 2:45 without hiding security transitions.
- Run all gates again from the final commit.

## Quality Gate

- [ ] `npm run lint`, `npm test`, and `npm run build` pass on the final commit.
- [ ] The critical path succeeds on the exact evidence origin.
- [ ] Replay, expiry, cross-origin, cross-account, and revoked-credential checks pass.
- [ ] Live GPT-5.6 evidence or an explicit limitation is documented; fallback passes.
- [ ] Accessibility and mobile checks pass.
- [ ] Worktree, staged diff, history, screenshots, and logs contain no secrets.
- [ ] README setup is reproducible and all claims match implementation.
- [ ] Video is no longer than three minutes.
- [ ] All flow nodes and branches have implementation/test evidence.

## Risk and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| Public host loses SQLite state | High | Choose persistent single instance early | Record verified fixed-localhost run and disclose deployment limitation |
| Live model fails during recording | Medium | Tested deterministic fallback and earlier safe evidence | Use fallback transparently; do not fake live output |
| Screenshot exposes a code | Critical | Disposable codes, frame review, rotate after capture | Delete capture and rotate code before recapturing |
| Last-minute feature breaks critical path | High | Freeze behavior after section 06 | Revert only the unverified feature commit |
| Video exceeds limit | High | Rehearse at 2:45 and cut optional explanation | Re-export shortened verified take |

## Acceptance Criteria

- [ ] A judge can follow the full journey in under three minutes.
- [ ] Automated and manual evidence proves model usefulness and deterministic authorization separation.
- [ ] The repository builds from its English README and contains no sensitive artifacts.
- [ ] The selected evidence origin, model status, fallback, and prototype limitations are honest.
- [ ] All Test Scenarios and Quality Gate items pass.

## Files to Create or Modify

- `tests/e2e/authidenty-recovery.spec.ts` or equivalent — critical browser journey.
- Browser test configuration and package script if the framework is adopted.
- `README.md` — final English product, architecture, setup, security, evidence, and Codex narrative.
- `docs/demo-script.md` — timed narration and screen actions.
- `docs/submission-checklist.md` — Devpost fields, evidence, and final gates.
- `docs/architecture.md` or README section — concise trust-boundary diagram.
- Existing route/service tests — final negative and secret-marker coverage.

Any behavior change discovered during verification must update `spec.md`, `api-spec.md`, and the relevant flow diagram before implementation.
