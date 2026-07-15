# Research Decision

## Selected

- Codebase: yes — registration and recovery guidance already exist; the plan must extend rather than recreate them.
- Web: yes — WebAuthn recovery, current OpenAI model guidance, and authentication security standards are time-sensitive and high risk.
- GitHub: yes — reference implementations can reduce uncertainty around passkey authentication and account recovery ceremonies.
- Academic: yes — behavioral authorship verification was proposed as an alternative signal and requires evidence on accuracy and attack resistance.
- Competitors: yes — platform passkey and account-recovery experiences define user expectations and expose differentiation opportunities.

## Research Topics

1. Passkey account recovery and multi-device credential patterns in 2026.
2. GPT-5.6 Sol and reasoning-level selection for bounded recovery guidance.
3. Secure recovery alternatives without identity documents or biometrics.
4. Behavioral consistency and authorship verification as non-dispositive risk signals.
5. Consumer account recovery UX patterns used by platform authenticators and identity providers.

## Assumptions

- [inferred] This is a hackathon prototype, not a production identity provider or standards-compliant identity assurance service.
- [inferred] A server-issued, single-use recovery code is the default independent authorization factor for the demo.
- [inferred] Behavioral analysis remains an optional experiment and cannot grant access.
- [inferred] SQLite and the existing modular Next.js application remain appropriate through submission.

## Questions Deferred

- Whether to demonstrate recovery with a printed recovery code or a second trusted device.
- Whether a behavioral consistency visualization adds enough judging value to justify its test and explanation burden.
- Which deployment environment will host the final WebAuthn demo.
