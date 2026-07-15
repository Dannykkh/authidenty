# Web Research: Authidenty Hackathon

Research date: 2026-07-15

Scope: three time-sensitive topics, limited to two authoritative primary sources per topic. This is implementation research for a hackathon prototype, not a claim of NIST certification or production security assurance.

## Executive Findings

1. The best recovery experience is to avoid a recovery ceremony whenever possible. Synced multi-device passkeys, a second registered platform passkey, or a roaming security key can survive or route around loss of one device.
2. If all passkeys are unavailable, recovery must remain an independent, deterministic authorization ceremony. GPT-5.6 can diagnose and explain the path, but it must never verify recovery secrets, decide identity, unlock an account, or issue credentials.
3. Authidenty can demonstrate secure account-control recovery without collecting raw identity documents or biometric samples. The clearest prototype uses a server-issued, high-entropy, one-time recovery code, throttling, notifications, and explicit invalidation of lost credentials.
4. The documented flagship API model is `gpt-5.6-sol`, and the `gpt-5.6` alias routes to it. `Ultra` is not a documented API model identifier; official guidance describes Ultra as a Codex multi-agent mode. The application must not invent identifiers such as `gpt-5.6-sol-ultra`.

## Topic 1: WebAuthn, Multi-Device Passkeys, and Recovery

### Standards findings

WebAuthn Level 3 distinguishes a credential's permanent backup eligibility (`BE`) from its current backup state (`BS`). A backup-eligible credential is a multi-device credential. The relying party is advised to retain the latest flags and can use them to identify an account that is vulnerable to single-device loss. The specification recommends registering additional authenticators and/or establishing a recovery path for single-device credentials. It also recommends allowing multiple credentials on one account rather than depending on a single authenticator.

This yields three distinct paths that should not be conflated in the product:

| Situation | Correct path | Authidenty behavior |
|---|---|---|
| The passkey is synced and available on another device | Normal WebAuthn authentication | Explain how to use the other device or passkey provider; no account recovery or new identity check |
| A second platform passkey or roaming security key exists | Normal WebAuthn authentication with that credential | Sign in, then register a replacement passkey and remove the lost credential |
| Every registered passkey is unavailable | Account recovery followed by credential binding | Invoke a deterministic recovery factor; only after authorization, create a new passkey and invalidate or suspend lost credentials |

The FIDO Alliance warns that recovery can become the weakest point in a passkey deployment. Its guidance says synced passkeys can survive device loss through the passkey provider, while device-bound passkeys should be backed by another authenticator. A recovery mechanism should not be weaker than the credential being recovered, and old credentials need an explicit invalidation path after re-registration.

### Recommended implementation consequences

- Store the credential ID, public key, signature counter, transports, device type, and latest backup state. Never store a WebAuthn private key.
- Make the first post-registration recommendation conditional:
  - if the credential is single-device or not backed up, ask the user to add a second passkey/security key and generate an offline recovery code;
  - if it is currently backed up, still offer another credential for users who want provider-independent resilience.
- Present “Use a passkey from another device” before “Recover account.” Cross-device authentication is still authentication, not recovery.
- After an authorized lost-device flow, mark the reported credential as suspended or revoke it, register the replacement, rotate the recovery code, and send a recovery notification.
- Do not claim that the relying party backs up passkeys. For synced passkeys, backup and restoration belong to the authenticator/passkey-provider ecosystem; the relying party only observes WebAuthn backup signals.

### Sources

1. [W3C Web Authentication: An API for Accessing Public Key Credentials — Level 3](https://www.w3.org/TR/webauthn-3/) — backup eligibility/state, multiple credentials, credential loss, and relying-party guidance.
2. [FIDO Alliance: Displace Password + OTP Authentication with Passkeys](https://fidoalliance.org/white-paper-displace-password-otp-authentication-with-passkeys/) — deployment and recovery guidance for synced and device-bound passkeys.

## Topic 2: Recovery Without Raw Identity Documents or Biometrics

### Standards findings

NIST SP 800-63B-4 recognizes four recovery classes: saved recovery codes, issued recovery codes, recovery contacts, and repeated identity proofing. Repeated identity proofing is therefore one option, not the only recovery method. For accounts that were not identity-proofed, NIST explicitly permits recovery through saved/issued recovery codes or recovery contacts.

For a saved recovery code, NIST requires at least 64 bits from an approved random generator, hashed server-side storage, throttled verification, single use, and replacement after use. Every recovery event must generate a notification. NIST's AAL2 recovery pattern is stronger than a single code: two codes obtained through different methods, one recovery code plus an already-bound single-factor authenticator, or repeated identity proofing.

NIST SP 800-63A-4 separately requires data minimization: personal information processing must be limited to what is necessary, and collected information must be protected in transit and at rest. It also recommends binding at least two separate means of authentication to reduce recovery frequency. These principles support a pseudonymous, account-control product that does not purport to prove a person's civil identity.

### Recommended Authidenty ceremony

```text
User reports lost device
        |
        v
Recovery agent receives only redacted failure/context signals
        |
        v
Server chooses an allowed recovery path from policy
        |
        v
Deterministic endpoint verifies independent recovery factor(s)
        |
        v
Short-lived, single-purpose re-enrollment grant
        |
        v
Register replacement passkey
        |
        v
Suspend/revoke reported credential, rotate code, notify user
```

### Prototype boundary and honest claim

- Preferred three-minute demo: a second/synced passkey authorizes the session, then GPT-5.6 guides replacement of the lost credential. This preserves passkey-level authorization and is the strongest, shortest path.
- Catastrophic-loss demo fallback: one high-entropy offline recovery code authorizes a narrowly scoped re-enrollment grant. This is understandable and feasible for Build Week, but a one-code prototype must not be described as NIST AAL2-compliant.
- A production-oriented extension would add a second independent method, such as an issued code sent to a pre-verified recovery address or a recovery contact, plus cooldown and anomaly review.
- The recovery code must never be sent to GPT-5.6, written to logs, or stored in plaintext. The LLM receives only facts such as `recovery_code_available: true` and the deterministic verification result.
- Do not collect conversational style as a secret. At most, treat it as a non-dispositive risk signal that changes explanation or escalation, never authorization.
- Do not market Authidenty as “proving who a person is.” The defensible hackathon claim is “recovering control of an existing account without uploading identity documents or biometric samples.”

### Sources

1. [NIST SP 800-63B-4: Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html) — recovery methods, recovery-code requirements, AAL-specific recovery, notifications, and compromised-authenticator invalidation.
2. [NIST SP 800-63A-4: Identity Proofing and Enrollment](https://pages.nist.gov/800-63-4/sp800-63a.html) — data minimization, privacy/security requirements, and encouragement to bind two separate authentication means.

## Topic 3: GPT-5.6 Sol, Reasoning, Ultra, and Structured Outputs

### Current documented model surface

OpenAI's current model guidance documents the following API identifiers:

- `gpt-5.6-sol`: flagship capability.
- `gpt-5.6-terra`: lower-cost balance of capability and price.
- `gpt-5.6-luna`: efficient high-volume workloads.
- `gpt-5.6`: an alias that routes to `gpt-5.6-sol`.

GPT-5.6 supports reasoning efforts `none`, `low`, `medium`, `high`, `xhigh`, and `max`. The guide recommends choosing by representative evaluation rather than assuming the highest effort is always best. It also documents `reasoning.mode: "pro"` as a mode on the selected GPT-5.6 model, not a separate model slug.

The same guide describes Responses API multi-agent beta as similar to “ultra mode in Codex.” Therefore:

- Sol is a model (`gpt-5.6-sol`).
- Ultra is a Codex multi-agent/product mode, not a documented Authidenty API model identifier.
- Using Codex Ultra may accelerate implementation tasks that split cleanly into independent workstreams, but it does not change the model string or security contract of Authidenty's recovery-agent API.
- Do not configure `model: "ultra"`, `model: "gpt-5.6-ultra"`, or `model: "gpt-5.6-sol-ultra"` unless future official API documentation explicitly publishes such an identifier.

### Structured Outputs guidance

OpenAI recommends Structured Outputs over JSON mode when schema adherence is needed. In the Responses API, the recovery agent should return a strict JSON Schema through `text.format`. The schema should expose a small, reviewable policy vocabulary, for example:

```text
diagnosis_code
user_explanation
allowed_next_step
required_factor
security_notice
needs_human_review
```

Structured Outputs constrain syntax and enum values, but they do not make the content semantically correct. OpenAI's guide warns that structured responses can still contain mistakes or hallucinated values when input does not fit the schema, and refusals require explicit handling. Consequently:

- Validate the parsed object again on the server.
- Map `allowed_next_step` to a server-owned allowlist.
- Never let model output directly mint a session, set `recovery_authorized`, revoke a credential, or start passkey registration.
- Treat refusal, timeout, schema failure, and ambiguous diagnosis as a deterministic safe fallback that shows non-AI recovery options.
- Keep the security decision outside the model even when using `max`, pro mode, or multi-agent mode. More reasoning changes quality/latency/cost; it does not create an authorization guarantee.

### Recommended model configuration for the hackathon

| Use | Recommendation | Rationale |
|---|---|---|
| Building and reviewing the project | Codex with `gpt-5.6-sol`; use Ultra only for genuinely separable research, implementation, and review work | Development acceleration is separate from application runtime |
| Interactive recovery guidance | Responses API with `gpt-5.6` or explicit `gpt-5.6-sol`, standard mode, `low` or `medium` effort | The task is bounded and latency matters; evaluate both efforts on fixed scenarios |
| Final adversarial/security review | Sol with `high`, `xhigh`, `max`, or pro mode only if an eval shows a material gain | Quality-first review can tolerate higher latency and cost |
| Authorization and credential issuance | Deterministic application code only | No model mode is an authentication factor or policy enforcement mechanism |

For the final submission, pin the exact chosen model in configuration or expose it through a validated environment variable, record the actual response model in test evidence, and keep a non-LLM fallback so the demo remains usable if the API is unavailable.

### Sources

1. [OpenAI: Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model) — model names, alias behavior, reasoning efforts, pro mode, and the distinction between Responses multi-agent beta and Codex Ultra mode.
2. [OpenAI: Structured Model Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — strict JSON Schema, Responses API usage, refusal handling, and semantic-error caveats.

## Consolidated Decision for the Build Week Plan

The recommended submission is a two-level recovery story rather than an LLM identity-verification experiment:

1. **Prevent recovery:** register a synced passkey plus a second credential or security key; show backup state and readiness in the UI.
2. **Recover account control:** if all credentials are lost, use a deterministic, single-use recovery factor to issue a short-lived re-enrollment grant.
3. **Use GPT-5.6 where it is material:** translate WebAuthn failures and policy state into understandable, context-sensitive guidance and select only among server-supplied next-step descriptions.
4. **Keep the security boundary visible:** visually separate the agent's recommendation from the server's authorization result in the demo and architecture diagram.

This positioning is both more defensible and more demonstrable than “the LLM recognizes you by conversation.” It addresses everyday authentication frustration while preserving the principle that recovery must not be weaker than login.
