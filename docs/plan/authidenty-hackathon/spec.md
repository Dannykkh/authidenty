# Feature Spec: Authidenty Hackathon Completion

> Superseded on 2026-07-16 by [relay-mvp.md](relay-mvp.md). Retained as historical planning evidence for the original recovery-focused direction.

Status: Ready for detailed design
Date: 2026-07-15

## Overview

Authidenty is a passkey-first login and account-control recovery layer for OpenAI Build Week. It replaces repeated OTP entry with WebAuthn and uses GPT-5.6 to diagnose opaque passkey failures, ask safe diagnostic questions, and explain only the recovery paths that deterministic server policy already permits.

GPT-5.6 is not an authenticator. A passkey or independent recovery factor proves account control. The model never receives recovery secrets and cannot authorize access, issue sessions or grants, register or revoke credentials, or override policy.

## Context Map

### Shared Premises

- Goal: complete a credible lost-device-to-new-passkey experience without identity-document or biometric uploads.
- Industry: consumer digital identity and account access.
- Scope: submission-ready hackathon MVP, not a production identity provider or identity-proofing service.
- Success: a judge can see a returning user sign in, lose access, receive useful GPT-5.6 guidance, prove account control independently, replace the passkey, and sign in again within a three-minute demonstration.

### Stakeholders

| Role | Description | Planned section |
|---|---|---|
| Account holder | Uses passkeys and may lose a device or credential | sections 02–06 |
| Relying-party operator | Owns recovery policy, credential state, and audit evidence | sections 01, 03, 04, 07 |
| Security reviewer | Verifies that model output cannot change authorization | sections 01, 03, 04, 05, 07 |
| Hackathon judge | Evaluates implementation, design, impact, and idea quality | sections 06–07 |

### Ecosystem Map

| System | Audience | Integration | Planned section |
|---|---|---|---|
| Browser/platform authenticator | Account holder | WebAuthn through SimpleWebAuthn | sections 02, 04, 06, 07 |
| Authidenty Next.js relying party | All roles | Built-in application and API routes | sections 01–07 |
| SQLite | Relying-party operator | Local persistent credential and ceremony state | sections 01, 03, 04, 07 |
| OpenAI Responses API | Account holder | GPT-5.6 Structured Outputs for guidance only | sections 05, 07 |
| HTTPS deployment | Judge and account holder | Fixed WebAuthn origin and RP ID | section 07 |
| GitHub and Devpost | Judge | Public source, documentation, and submission | section 07 |

### Existing Environment

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4.
- SimpleWebAuthn 13.3 browser/server packages.
- SQLite through better-sqlite3 with SQL migrations and typed repository functions.
- OpenAI SDK 6.47 using the Responses API and Zod Structured Outputs.
- Vitest with 22 passing tests across 7 files at research time.
- Implemented: passkey registration, strict RP checks, public credential storage, bounded GPT-5.6 recovery guidance, and the first editorial UI.
- Missing: passkey sign-in, authenticated session, recovery-code lifecycle, re-enrollment authorization, credential revocation, and the complete browser journey.

## Problem Statement

| ID | Core problem | Impact | Priority | Planned section |
|---|---|---|---|---|
| P1 | The current product cannot authenticate a returning user or complete recovery. | It remains a registration-and-chat proof of concept rather than a coherent product. | Required | sections 02, 03, 04, 06 |
| P2 | Recovery can become weaker than passkey sign-in or demand excessive personal evidence. | Attackers gain an easier path or legitimate users surrender sensitive data. | Required | sections 01, 03, 04, 07 |
| P3 | Passkey failures are opaque and alternate paths are fragmented. | Users cannot distinguish retry, another-device authentication, and true account recovery. | Important | sections 05–06 |
| P4 | An LLM can be mistaken for an identity decision-maker. | The product creates a security flaw and loses credibility. | Required | sections 03, 05, 07 |

## Product Principles

1. Avoid recovery when another valid passkey can perform normal authentication.
2. Keep account recovery independent, deterministic, and no weaker than the chosen prototype boundary.
3. Give GPT-5.6 real diagnostic context but no secret, privileged tool, or authorization output.
4. Collect the minimum data needed for account control; do not claim civil-identity proof.
5. Make terminal states honest. If every configured factor is gone, the model cannot manufacture access.
6. Show the security boundary in the interface and demo rather than hiding it in documentation.

## Scope

### Required MVP

#### 1. Passkey authentication

- Support returning-user, username-first authentication with `startAuthentication` and server verification.
- Generate and consume short-lived, one-time authentication challenges.
- Look up the submitted credential by ID and verify that it belongs to the expected account.
- Require the configured RP ID, origin, and user verification.
- Update the credential counter and `last_used_at` transactionally after success, accounting for multi-device credential behavior.
- Issue a short-lived Secure, HttpOnly, SameSite application-session cookie.
- Return generic public failure messages to reduce account enumeration.

#### 2. Recovery readiness

- Generate a high-entropy saved recovery code after the initial passkey registration.
- Display the plaintext code once and require acknowledgment before leaving the setup-complete state.
- Store only a versioned server-side digest and metadata, never the plaintext.
- Allow the user to download or copy it locally without sending it to GPT-5.6.
- Expose passkey backup state and explain whether another credential is recommended.

#### 3. Recovery diagnosis and policy planning

- Start recovery from a real or deliberately simulated WebAuthn failure category.
- Bind the recovery conversation to a short-lived recovery transaction without making it an authenticated session.
- Give GPT-5.6 only allow-listed failure context, boolean availability facts, bounded conversation text, and server-supplied allowed actions.
- Use Structured Outputs and reject any output outside the server-owned schema.
- Provide a deterministic fallback when the model times out, refuses, fails schema validation, or is not configured.
- Never send recovery-code contents, private keys, identity documents, biometrics, or internal risk details to the model.

#### 4. Independent recovery authorization

- Verify the recovery code in a dedicated deterministic endpoint.
- Throttle attempts and return public errors that do not reveal account or code state unnecessarily.
- Reserve the code atomically to one Recovery Transaction after successful verification and issue at most one active grant for that transaction.
- Mark the code redeemed only when replacement enrollment succeeds; release an expired reservation through a tested policy so a failed WebAuthn prompt does not permanently strand the Account Holder.
- Issue a short-lived, single-purpose Re-enrollment Grant containing an opaque nonce, user binding, purpose, issue time, expiry, and consumed state.
- Do not convert the grant into a general application session.

#### 5. Replacement passkey and credential lifecycle

- Provide separate re-enrollment options and verification routes that require the grant.
- Reuse the strict registration ceremony and store only public credential data.
- Consume the re-enrollment grant exactly once.
- Revoke the credential reported lost only after replacement registration succeeds.
- Rotate the recovery code after successful recovery.
- Create a notification/audit-outbox record showing that recovery occurred without storing conversation text or secrets.
- Permit sign-in with the replacement passkey and reject the revoked credential.

#### 6. Submission experience

- Present explicit screens or states for register, recovery-code acknowledgment, sign in, failure diagnosis, recovery-code verification, replacement enrollment, completion, and replacement sign-in.
- Visually distinguish “Agent diagnosis” from “Security authorization.”
- Show credential status, grant expiry, and recovery notification evidence in a judge-readable way.
- Preserve the existing editorial visual direction and responsive/accessibility behavior.
- Capture development screenshots, a final walkthrough, and a three-minute-or-shorter demo video.
- Update the English README, architecture explanation, security claims, setup instructions, and Codex development evidence.

### Optional Only After the Required Journey Is Green

- Add a second passkey from an authenticated session.
- Demonstrate a synced or another-device passkey path that avoids catastrophic recovery.
- Show a recovery-readiness score based only on deterministic factor availability and backup state.
- Add a local notification viewer or audit timeline beyond the single recovery event.

### Explicitly Excluded

- Conversational-style authentication or a hidden authorship score that changes access.
- Raw identity documents, face/voice/fingerprint samples, or stored writing profiles.
- Recovery contacts, social recovery, Shamir secret sharing, or help-desk override.
- Email-only or SMS-only recovery as the authorization factor.
- LLM tools that mutate sessions, grants, credentials, recovery factors, or account state.
- Claims of NIST certification, AAL2 compliance, biometric authentication, or civil-identity verification.
- Production scaling, multi-tenant identity-provider administration, billing, and complete compliance implementation.

## Model Configuration

- Runtime model: `gpt-5.6` alias or explicit `gpt-5.6-sol`; never invent an `ultra` model slug.
- Runtime reasoning: start with `low`; evaluate `medium` on fixed recovery scenarios and adopt it only if guidance quality materially improves within acceptable latency.
- Development: Codex with GPT-5.6 Sol; Ultra may parallelize independent research, review, test, and documentation tasks.
- Security: higher reasoning, pro mode, or Ultra never changes the authorization boundary.
- Privacy: `store: false`, stable privacy-preserving `safety_identifier`, bounded input, no secret content, and no recovery-conversation persistence.

## State Model

### Credential status

`active → revoked`

- Initial and replacement credentials begin `active`.
- A credential reported lost remains active until a replacement is successfully verified, then becomes `revoked`.
- Revoked credentials cannot authenticate and remain only for minimal audit evidence.

### Recovery factor status

`active → reserved → redeemed → replaced`, or `reserved → active` after tested expiry release

- The server stores only the active digest and metadata.
- Successful verification atomically reserves it to one Recovery Transaction and creates at most one active Re-enrollment Grant.
- Successful replacement atomically redeems it and creates a new plaintext code shown once.
- Expired authorization releases the reservation according to a tested policy without creating an Application Session or changing credentials.

### Re-enrollment grant status

`issued → consumed` or `issued → expired`

- Grants authorize only replacement registration.
- Grant consumption and credential creation must not permit replay or cross-account use.

### Recovery transaction status

`diagnosing → factor_required → authorized → enrolling → completed`

- `diagnosing` contains only bounded non-secret context.
- `authorized` means deterministic recovery-factor verification succeeded, not that GPT recognized the user.
- A failed or abandoned transaction expires without changing account control.

## Security and Privacy Requirements

- Use independent cookies with distinct names, paths, purposes, and lifetimes for WebAuthn ceremony, application session, recovery conversation, and re-enrollment authorization.
- Use Secure cookies outside localhost, HttpOnly for server-only state, and SameSite appropriate to the same-origin application.
- Enforce expected Origin/Host and JSON content type on every state-changing API; do not rely on SameSite alone.
- Use constant-shape public responses and generic text where practical to reduce account enumeration.
- Rate-limit authentication, recovery guidance, and recovery-factor verification separately.
- Use an immediate transaction for every one-time consume operation.
- Never log recovery codes, WebAuthn challenge secrets, cookie values, OpenAI API keys, or raw model conversation content.
- Validate all client and model input with Zod; treat model output as untrusted external input.
- Provide no model tools in the MVP recovery call.
- Fix the deployment hostname before final credential creation and recording.
- Notify the account after successful recovery and credential revocation.
- Keep the public claim to account-control recovery, not identity proofing.

## Failure Behavior

| Failure | Required behavior |
|---|---|
| WebAuthn unsupported | Explain browser/device requirements and offer only configured alternatives |
| Prompt cancelled or timed out | Allow retry and offer recovery diagnosis without claiming credential loss |
| Credential not found or revoked | Return a generic authentication failure and safe recovery entry |
| Wrong or expired challenge | Consume safely, reject, and require a new ceremony |
| Wrong recovery code | Return a generic rejection, increment throttling state, and never call GPT with the code |
| Redeemed recovery code | Reject replay and do not issue another grant |
| Expired or consumed re-enrollment grant | Reject replacement registration and require a new authorized recovery |
| OpenAI unavailable/refusal/schema error | Show deterministic server-owned next steps and keep recovery usable |
| Replacement enrollment fails | Keep the old credential state unchanged and allow a new authorized attempt within policy |
| No configured recovery factor remains | Explain that self-service recovery is unavailable; never bypass policy |

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Account enumeration | High | Medium | Generic responses, normalized route behavior, bounded timing differences |
| Recovery-code brute force | High | Medium | High entropy, digest storage, rate limits, attempt tracking, one-time redemption |
| Grant replay or scope confusion | Critical | Medium | Opaque nonce, short expiry, purpose binding, transactional consume, separate cookie |
| Credential counter mishandling | High | Medium | Follow SimpleWebAuthn verified output and test multi-device counter cases |
| Model prompt injection | Medium | Medium | Separate instructions and untrusted JSON, no tools, strict schema and allowlist |
| Model outage during demo | Medium | Medium | Deterministic fallback and prerecorded final run if live environment is unstable |
| RP ID/origin mismatch | High | Medium | Freeze HTTPS hostname and verify on the exact recording origin |
| Lost credential revoked too early | High | Low | Revoke only after replacement credential verification succeeds |
| Recovery code exposed in logs/model | Critical | Low | Never place code in model request or logs; focused tests and redaction review |
| Behavioral-authentication scope creep | High | Medium | Keep it explicitly excluded from authorization and submission claims |
| Hackathon scope overrun | High | Medium | Gate all optional work behind the complete green browser journey |

## Test Scenarios

### Passkey authentication

| Case | Input/action | Expected result |
|---|---|---|
| Successful sign-in | Active credential, valid challenge, correct RP/origin, user verification | 200, authenticated session cookie, counter/last-used updated |
| Unknown username | Authentication options request | Generic response with no public account-existence signal |
| Unknown credential | Assertion with unrecognized credential ID | Generic 401; no session |
| Revoked credential | Valid assertion from revoked credential | Generic 401; no session |
| Expired challenge | Otherwise valid assertion after expiry | 400/401; challenge consumed; no replay |
| Wrong RP/origin or failed user verification | Invalid assertion | Verification rejected; no session |
| Multi-device counter behavior | Backed-up credential with allowed counter behavior | Valid result follows library policy without false revocation |

### Recovery-code lifecycle

| Case | Input/action | Expected result |
|---|---|---|
| Initial issuance | First credential registered | Plaintext shown once; only digest persists |
| Correct code | Active code and valid recovery transaction | Code reserved to that transaction; one short re-enrollment grant issued |
| Wrong code | Invalid candidate | Generic rejection; attempt recorded; no grant |
| Brute-force attempts | Repeated invalid candidates | Throttled response; GPT never receives candidates |
| Concurrent reservation | Same valid code submitted twice | Exactly one Recovery Transaction reserves it; at most one active grant |
| Expired reservation | Grant expires without replacement | Reservation is released by tested policy; no credential/session state changes |
| Replay after completion | Redeemed code used again | Rejected; no new grant |

### Re-enrollment and revocation

| Case | Input/action | Expected result |
|---|---|---|
| No grant | Existing account requests replacement registration | Rejected |
| Valid grant | Correct replacement ceremony | New active credential stored; grant consumed; reported lost credential revoked; code rotated; notification recorded |
| Cross-account grant | Grant for user A used on user B | Rejected without state change |
| Expired/consumed grant | Replacement request | Rejected; no credential stored |
| Enrollment verification fails | Bad WebAuthn response | Lost credential remains unchanged; no grant privilege expansion |
| Replacement sign-in | New credential assertion | Authenticated session issued |
| Old credential sign-in | Revoked credential assertion | Rejected |

### GPT-5.6 recovery guidance

| Case | Input/action | Expected result |
|---|---|---|
| Device lost, code available | Allow-listed failure and boolean factor state | Tentative diagnosis plus only server-allowed recovery-code path |
| Another passkey available | Allow-listed state | Normal authentication recommended before account recovery |
| Prompt injection in message | User asks model to approve access or reveal policy | Request treated as data; output remains within schema and allowed actions |
| Secret entered by user | Text resembles a recovery code | Client/server warn or reject/redact; value never intentionally sent to model |
| Refusal or schema failure | Non-parseable or refused response | Deterministic fallback shown; no authorization state changes |
| Model timeout/unconfigured key | API unavailable | Clear non-AI path remains available |

### Browser and submission journey

| Case | User journey | Expected result |
|---|---|---|
| Full critical path | Register → save code → sign in → report loss → get guidance → redeem code → enroll replacement → sign in | Complete without manual DB edits or hidden privileged steps |
| Mobile viewport | Full UI at narrow width | No horizontal overflow; readable states; controls remain reachable |
| Keyboard/reduced motion | Navigate and submit without pointer; reduced-motion enabled | Visible focus, semantic labels, no required animation |
| Model unavailable | Run recovery with API intentionally disabled | Security ceremony remains demonstrable through labeled fallback |

## Acceptance Criteria

- All required MVP transitions work through public UI and API routes without manual database modification.
- Unit and route tests cover one-time state, replay, account binding, cookie separation, and model policy boundaries.
- A browser-level test with a virtual authenticator completes the critical path.
- State-changing route tests reject untrusted Origin/Host and unsupported content types.
- `npm run lint`, `npm test`, and `npm run build` pass.
- A live GPT-5.6 request is verified with a configured key, or the submission clearly discloses if only the fallback was recorded.
- The final README and demo never claim that conversational behavior, the LLM, or an uploaded identity artifact authenticated the user.
- The demo video is three minutes or shorter and visibly covers problem, working product, GPT-5.6 role, security boundary, and result.

## Evidence Sources

- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [FIDO Alliance passkey deployment guidance](https://fidoalliance.org/white-paper-displace-password-otp-authentication-with-passkeys/)
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OpenAI: Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Research synthesis](research.md)
