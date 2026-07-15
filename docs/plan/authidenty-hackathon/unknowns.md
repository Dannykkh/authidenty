# Blindspot and Unknowns Map

## Known Knowns

- Authidenty is an OpenAI Build Week prototype in the Apps for everyday life category.
- Passkey registration, SQLite public-credential storage, and bounded GPT-5.6 guidance already work.
- The model cannot authenticate, authorize recovery, issue a session, verify a secret, revoke a credential, or approve re-enrollment.
- The product will not collect raw identity documents, biometric samples, or conversational identity profiles.
- The submission deadline is July 21, 2026 at 5:00 PM PT.
- The core demo must fit within three minutes and show a complete product experience.

## Known Unknowns

- Final HTTPS deployment hostname and therefore production RP ID/origin.
- Whether the live demo account will use a synced or virtual device-bound passkey.
- Whether live GPT-5.6 latency and credentials will be reliable during recording.
- Exact submission wording and video timing after the end-to-end flow exists.

## Unknown Knowns

- [inferred] The user values removing authentication frustration but does not want weaker privacy or security.
- [inferred] A visible explanation of what the AI can and cannot do is part of the product value.
- [inferred] The existing editorial, high-contrast visual direction should be extended instead of redesigned.
- [inferred] The hackathon score matters more than production scale, certification, or a complete identity-provider feature set.

## Unknown Unknowns

- Browser and platform differences in discoverable credentials, passkey backup flags, and counter behavior.
- Account-enumeration leakage through username-first sign-in and recovery responses.
- Race conditions when a recovery code or re-enrollment grant is redeemed concurrently.
- Confusion between authentication-session, recovery-conversation, ceremony, and re-enrollment cookies.
- RP binding failure if the deployment hostname changes after credentials are created.
- Live model refusal, timeout, schema failure, or unavailable API access during the demo.
- A user closing the WebAuthn prompt and entering recovery without an account-bound failure state.

## Architecture-Changing Questions and Defaults

1. **Primary catastrophic-loss factor:** recovery code or trusted device?
   Default: one-time recovery code. It is the shortest independent ceremony and does not require multi-device management first.
2. **Lost credential lifecycle:** revoke or suspend?
   Default: revoke immediately after replacement registration succeeds. It is easiest to explain and verify in a prototype.
3. **Sign-in discovery:** username-first or usernameless?
   Default: username-first to match the current repository, with generic public responses and normalized timing where practical.
4. **Model outage behavior:** block recovery guidance or provide a fallback?
   Default: show deterministic server-owned recovery options and label the model as unavailable; never block the security ceremony.
5. **Final host:** which HTTPS origin?
   Default: choose and freeze one deployment hostname before final browser verification; local development remains `localhost`.
6. **Conversational consistency:** include as a visualization?
   Default: omit from the submission. It adds security and explanation burden without completing the critical journey.

## Blocking Assessment

No live question is required before planning. Every unresolved item has a conservative and reversible hackathon default. The deployment hostname must be resolved before final WebAuthn credentials and recording, not before implementation.
