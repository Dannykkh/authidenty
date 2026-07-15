# Authidenty

Authidenty is a passkey-first login layer with a GPT-5.6 recovery agent. It aims to remove code-typing fatigue and make account recovery understandable without collecting raw identity documents or biometrics.

This project is being built for OpenAI Build Week in the **Apps for everyday life** category.

## Why this exists

Identity checks often fail at the worst moment: a phone is lost, a one-time code never arrives, or a recovery flow asks for a photo of an identity document. Our [initial user research](docs/reddit-research/report-2026-07-15.md) found three recurring complaints:

- repeated authentication interrupts ordinary tasks;
- losing a device can turn into an account lockout;
- uploading identity documents or biometric images creates lasting privacy risk.

Authidenty separates authentication from explanation. WebAuthn credentials will prove possession of a trusted authenticator. The recovery agent will interpret allow-listed failure signals, explain the next safe step, and guide re-enrollment. The model will never decide whether a user is the account owner or override a failed security check.

## Project status

The repository currently contains the running application shell. Product features will land in small, reviewable commits.

| Milestone | Status |
| --- | --- |
| Next.js, TypeScript, and Tailwind foundation | Complete |
| Passkey registration and sign-in | Next |
| Credential persistence | Planned |
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

The first prototype will use:

- Next.js 16 with the App Router;
- React 19 and TypeScript;
- Tailwind CSS 4;
- SimpleWebAuthn for passkey ceremonies;
- SQLite for local credential storage, with a clear path to Postgres;
- the OpenAI Responses API with [`gpt-5.6`](https://developers.openai.com/api/docs/guides/latest-model) for recovery guidance.

## Security boundaries

- Store public-key credentials and account metadata only.
- Never store raw identity documents, face images, fingerprints, or voiceprints.
- Keep the LLM outside the authentication decision.
- Give the recovery agent structured, allow-listed error context instead of unrestricted logs.
- Require an independent cryptographic recovery factor before re-enrollment.
- Record recovery actions without placing secrets or personal evidence in model prompts.

These are design constraints for the upcoming implementation, not claims about the current application shell.

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the current checks:

```bash
npm run lint
npm run build
```

## Built with Codex

Codex owns the product implementation for this hackathon. It initialized the Git repository, connected the GitHub remote, generated the first Next.js shell, wrote the project documentation, and ran the install, lint, build, and HTTP smoke checks.

The working method is intentionally visible in the history:

1. make one bounded change;
2. verify it with an external signal such as a build or HTTP response;
3. commit it with a clear English message;
4. add the next product capability.

The runtime recovery agent and the coding agent serve different roles. Codex builds and tests the application. GPT-5.6 will power the in-product recovery conversation.
