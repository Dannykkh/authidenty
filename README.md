# Authidenty

Authidenty is a private identity relay for human approval. An AI service can ask an enrolled person to approve an action without repeatedly collecting that person's phone number, legal name, birth date, identity document, or biometric.

Built for OpenAI Build Week in the **Apps for Your Life** category.

## The idea

Sending another SMS is not the innovation. Changing who learns the phone number is.

A relying service sends Authidenty an opaque relay handle and a bounded description of the action. GPT-5.6 converts the action into a typed, human-readable purpose and risk suggestion. Server policy chooses the final risk and required factor, Authidenty privately routes a challenge to the enrolled destination, and the service receives a short-lived pseudonymous receipt instead of personal data.

```text
AI service                    Authidenty                         Human device
    |                             |                                   |
    | opaque handle + action      |                                   |
    |---------------------------->|                                   |
    |                             | GPT-5.6 classifies action          |
    |                             | server clamps final risk           |
    |                             | decrypts route only for delivery   |
    |                             |----------------------------------->|
    |                             |          one-time challenge        |
    |                             |<-----------------------------------|
    |    minimal receipt          |       deterministic OTP proof      |
    |<----------------------------|                                   |
```

GPT is not the authenticator. It never receives the phone number, opens the vault, sends a challenge, verifies the code, or issues a receipt.

## What works now

The current vertical slice runs end to end in the browser:

1. create a demo relay profile with an opaque handle and AES-256-GCM-encrypted phone destination;
2. submit an action request without personal data;
3. classify the action with GPT-5.6 Structured Outputs, or use a conservative high-risk fallback when the model is unavailable;
4. route a simulated SMS challenge while persisting only a masked destination and keyed code digest;
5. verify the six-digit code with expiry, attempt, and single-use controls;
6. return a purpose-bound receipt containing a pseudonymous subject, purpose, final risk, factor, issue time, and expiry.

| Capability | Status |
| --- | --- |
| Private relay UI and three-route API | Working |
| Encrypted contact vault | Working |
| GPT-5.6 action classification | Working with `OPENAI_API_KEY` |
| Live GPT-5.6 browser verification | Complete |
| Conservative model-failure fallback | Working |
| Simulated challenge delivery | Working and visibly labeled |
| Minimal verification receipt | Working |
| WebAuthn passkey registration module | Retained from the first prototype |
| Real SMS and enrollment ownership proof | Not implemented |
| Passkey approval, service authentication, and signed receipts | Next |

The demo intentionally uses the reserved fictional number `+1 202-555-0184`. No SMS provider is contacted. Demo enrollment does not prove ownership of that number.

## Information boundaries

| Actor | Receives | Does not receive |
| --- | --- | --- |
| Relying service | Opaque handle, action result, minimal receipt | Phone, name, birth date, documents, biometrics |
| GPT-5.6 | Service name and bounded action text | Relay handle, phone, vault data, OTP, receipt authority |
| Identity vault | User-to-destination encrypted mapping | Action text or model conversation |
| Human device | Action summary and one-time challenge | Another user's identity or vault record |

Additional controls in the prototype:

- likely email addresses, E.164 phone numbers, and dates of birth are rejected before the model call;
- the model can raise risk but cannot lower the server's medium-risk floor;
- classifier failure defaults to `high` risk and is exposed as `conservative_fallback`;
- OTPs are stored as HMAC-SHA-256 digests, expire after five minutes, allow five attempts, and are consumed once;
- challenge verification and receipt issuance run in one SQLite transaction;
- public errors and server logs exclude provider details and raw identity data;
- relay POST routes require same-origin JSON requests;
- no raw identity documents, face images, fingerprints, voiceprints, or behavioral embeddings are stored.

`store: false` is used for OpenAI Responses API calls, but it is not described as Zero Data Retention. Action text must still exclude personal data and secrets. See the official [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [latest model guidance](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters).

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- SQLite through `better-sqlite3`
- AES-256-GCM for encrypted contact destinations
- OpenAI Responses API with GPT-5.6 and Zod Structured Outputs
- SimpleWebAuthn for the retained passkey registration module
- Vitest for domain, API, security-boundary, and browser-client contract tests

## API

| Route | Purpose |
| --- | --- |
| `POST /api/relay/demo/setup` | Create a simulated enrollment and return an opaque handle plus masked destination. |
| `POST /api/relay/requests` | Classify a bounded action, apply server risk policy, and route a challenge. |
| `POST /api/relay/requests/{requestId}/verify` | Verify the one-time challenge and issue a minimal receipt. |

The earlier passkey registration and recovery exploration remains in the repository under `/api/passkeys/*` and `/api/recovery/agent`, but the Build Week product direction is now the private identity relay. The approved scope and boundaries are in [relay-mvp.md](docs/plan/authidenty-hackathon/relay-mvp.md) and the architecture decision is in [adr-001-private-identity-relay.md](docs/plan/authidenty-hackathon/adr-001-private-identity-relay.md).

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer

Install the exact locked dependencies:

```bash
npm ci
```

Copy `.env.example` to `.env.local`, then generate two different 32-byte Base64 secrets by running this command twice:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Configure the local environment:

```dotenv
AUTHIDENTY_DB_PATH=.data/authidenty.db
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
OPENAI_API_KEY=
AUTHIDENTY_VAULT_KEY_BASE64=<first-generated-value>
AUTHIDENTY_CHALLENGE_SECRET_BASE64=<second-generated-value>
```

Keep all secret values server-side and never commit `.env.local`. `OPENAI_API_KEY` is optional: when it is absent or the classifier fails, Authidenty clearly uses the conservative high-risk fallback.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The safe demo values are prefilled; select **Create private route**, **Request private approval**, and **Verify device control** to complete the flow.

Run all repository checks:

```bash
npm run lint
npm test
npm run build
```

## What this prototype does not claim

Authidenty is not civil-identity proofing, bot detection, or conversational biometric matching. It does not infer a person from writing style, recover an account from an embedding, or make SMS stronger than possession of the destination device.

Before production use, the project needs verified enrollment, passkey-based approval, authenticated and rate-limited relying services, managed encryption keys with rotation, a real notification provider, signed receipts, revocation, audit controls, and an independent security review.

## Built with Codex

Codex was used as the implementation partner for the entire Build Week project. It initialized and connected the repository, challenged the original conversational-authentication hypothesis, researched the OpenAI API boundary, documented the product pivot, designed the SQLite schema, wrote security-sensitive behavior test-first, implemented the encrypted vault and relay APIs, built the responsive interface, and exercised the complete browser journey.

The git history preserves the working method:

1. make one bounded architecture or product decision;
2. write a failing test before security-sensitive behavior;
3. implement the smallest passing slice;
4. verify with tests, lint, build, HTTP responses, and a real Chromium journey;
5. commit with a small, clear English message.

The browser verification completed setup, live GPT-5.6 classification, OTP verification, and receipt issuance with API statuses `201`, `201`, and `200`; it also checked desktop and mobile layouts, loaded fonts, and browser console errors. GPT-5.6 is the in-product action classifier. Codex is the coding agent that built and tested the product; their authority is deliberately separate.

## Submission Materials

- [Public demo video](https://youtu.be/xtjQFG0Oq2o)
- [Narrated demo script](docs/demo-script.md)
- [Devpost submission copy](docs/devpost-submission.md)
- [Final submission checklist](docs/submission-checklist.md)

## License

Authidenty is available under the [MIT License](LICENSE).

Last reviewed: 2026-07-17
