# Authidenty

Authidenty is a passkey-first login layer being built with a GPT-5.6 recovery agent. It replaces code-typing fatigue with device-bound credentials and aims to make account recovery understandable without collecting raw identity documents or biometrics.

This project is being built for OpenAI Build Week in the **Apps for everyday life** category.

## Why this exists

Identity checks often fail at the worst moment: a phone is lost, a one-time code never arrives, or a recovery flow asks for a photo of an identity document. Our [initial user research](docs/reddit-research/report-2026-07-15.md) found three recurring complaints:

- repeated authentication interrupts ordinary tasks;
- losing a device can turn into an account lockout;
- uploading identity documents or biometric images creates lasting privacy risk.

Authidenty separates authentication from explanation. WebAuthn credentials prove possession of a trusted authenticator. The planned recovery agent will interpret allow-listed failure signals, explain the next safe step, and guide re-enrollment. The model will never decide whether a user is the account owner or override a failed security check.

## Project status

Passkey registration now works end to end. The browser creates a credential through WebAuthn, the server verifies the ceremony, and SQLite stores only the reusable public credential fields.

| Milestone | Status |
| --- | --- |
| Next.js, TypeScript, and Tailwind foundation | Complete |
| Passkey registration | Complete |
| SQLite credential persistence | Complete |
| Passkey sign-in | Next |
| GPT-5.6 recovery-agent route | Planned |
| Secure re-enrollment conversation | Planned |

## Intended architecture

```text
Browser authenticator
        |
        | WebAuthn ceremony
        v
Next.js authentication routes ----> Credential database
        |
        | allow-listed failure context, no raw identity evidence
        v
GPT-5.6 recovery agent ----> explanation and approved recovery actions
```

The prototype uses:

- Next.js 16 with the App Router;
- React 19 and TypeScript;
- Tailwind CSS 4;
- SimpleWebAuthn for passkey ceremonies;
- SQLite for local credential storage, with a clear path to Postgres;
- the OpenAI Responses API with [`gpt-5.6`](https://developers.openai.com/api/docs/guides/latest-model) for the planned recovery guidance.

Current passkey routes:

| Route | Purpose |
| --- | --- |
| `POST /api/passkeys/register/options` | Validate the profile, create an opaque WebAuthn user ID, and issue a short-lived challenge. |
| `POST /api/passkeys/register/verify` | Consume the one-time challenge, verify the attestation, and store the public credential. |

## Security boundaries

- Store public-key credentials and minimal account metadata only.
- Never store raw identity documents, face images, fingerprints, or voiceprints.
- Keep the LLM outside the authentication decision.
- Give the recovery agent structured, allow-listed error context instead of unrestricted logs.
- Require an independent cryptographic recovery factor before re-enrollment.
- Record recovery actions without placing secrets or personal evidence in model prompts.

The registration implementation already enforces the storage boundary, opaque WebAuthn user IDs, expiring single-use challenges, user verification, strict relying-party checks, and authenticated re-enrollment as a future requirement. The recovery-specific boundaries remain requirements for the next implementation stages.

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer

Install dependencies and start the development server:

```bash
npm ci
npm run test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Enter a display name and email address, select **Create passkey**, and approve the prompt from the device. A current browser and a device authenticator such as Windows Hello, Touch ID, or a security key are required.

Development uses safe localhost defaults. To make the relying-party and database configuration explicit, copy `.env.example` to `.env.local`:

```dotenv
AUTHIDENTY_DB_PATH=.data/authidenty.db
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

Production requires both WebAuthn values. `WEBAUTHN_ORIGIN` must be HTTPS outside localhost and its hostname must match `WEBAUTHN_RP_ID`.

Run the current checks:

```bash
npm run lint
npm run test
npm run build
```

## Built with Codex

Codex owns the product implementation for this hackathon. It initialized the Git repository, connected the GitHub remote, generated the Next.js experience, designed the SQLite schema, implemented the registration ceremony, and wrote the project documentation.

The working method is intentionally visible in the history:

1. make one bounded change;
2. start with a failing test for security-sensitive server behavior;
3. verify it with an external signal such as a test, build, HTTP response, or browser ceremony;
4. commit it with a clear English message;
5. add the next product capability.

The current registration flow was checked with unit tests, API smoke tests, and a Chromium virtual WebAuthn authenticator that created and verified a real public-key credential.

The runtime recovery agent and the coding agent serve different roles. Codex builds and tests the application. GPT-5.6 will power the in-product recovery conversation.
