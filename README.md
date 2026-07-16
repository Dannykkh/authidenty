# Authidenty: You Know Me?

Authidenty is a conversational-continuity login experiment. It asks different questions at enrollment and return, compares how the answers are written, selects the most likely enrolled profile, and then requires a one-time code sent to the enrolled device.

Built for OpenAI Build Week in the **Apps for Your Life** category.

## The idea

People repeatedly type the same identity facts into new services: name, phone number, birthday, and sometimes an identity document. Authidenty explores whether a small, derived response-style profile can help find the right account without asking for those facts again.

```text
Enrollment
  name + phone + three answers
  -> derive style-v1 numerical metrics
  -> encrypt phone with AES-256-GCM
  -> do not store raw answer sentences

Return
  three different answers, without name or phone
  -> derive a second numerical vector
  -> deterministic ranking selects the closest profile
  -> GPT-5.6 Sol compares only the two vectors
  -> strong match reveals name + masked phone
  -> one-time device code completes verification
```

The model is not the final authenticator. A conversational match selects a candidate; possession of the enrolled device verifies the login.

## What works now

The browser demo runs this complete flow:

1. enroll `Danny Kim`, the reserved fictional number `+1 202-555-0184`, and three sample answers;
2. store only a derived style vector and an encrypted phone destination;
3. answer three different return questions without submitting a name or phone number;
4. rank active profiles with deterministic feature similarity;
5. ask GPT-5.6 Sol for a structured vector-to-vector similarity score and short explanation;
6. reveal `Danny Kim` and `***-***-0184` only when the combined score reaches the server threshold;
7. send a simulated six-digit device challenge;
8. verify the HMAC digest with expiry, attempt, and single-use controls.

Weak matches return one generic result and reveal no candidate name, phone suffix, or OTP route.

| Capability | Status |
| --- | --- |
| Enrollment and cross-question return flow | Working |
| Derived `style-v1` profile without stored answer text | Working |
| AES-256-GCM encrypted phone storage | Working |
| GPT-5.6 Sol Structured Outputs analysis | Working with `OPENAI_API_KEY` |
| Conservative model-failure fallback | Working |
| Candidate name and masked-phone reveal | Working after a strong match |
| Simulated SMS OTP final factor | Working and visibly labeled |
| OTP expiry, attempt limits, and replay prevention | Working |
| Same-origin JSON API protection | Working |
| Real SMS, production enrollment proof, and rate limiting | Not implemented |

## Trust boundary

| Component | Receives | Does not receive |
| --- | --- | --- |
| SQLite profile store | Derived style metrics, encrypted phone, challenge digest | Raw answer sentences |
| GPT-5.6 Sol | Enrolled vector, returning vector, hashed safety identifier | Name, phone, raw answers, OTP, vault key |
| Weak-match response | Generic no-match explanation | Candidate identity or device route |
| Strong-match response | Candidate display name and masked phone | Raw phone number |
| Notification adapter | Decrypted phone immediately before delivery | Raw answer text or model authority |

OpenAI requests use the Responses API, Zod Structured Outputs, `store: false`, no tools, bounded numerical input, and a hashed safety identifier. `store: false` is not described as Zero Data Retention. See the official [GPT-5.6 model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs), and [API data controls](https://developers.openai.com/api/docs/guides/your-data).

## Security limitations

This is a hackathon research prototype, not production identity proofing.

- Writing style can drift, be imitated, or be sparse. It must not be the only authentication factor.
- The deterministic vector is deliberately small and explainable; it is not claimed to be a biometric or cryptographic secret.
- Name and phone are still held by the Authidenty server. The phone is encrypted at rest, but the server and delivery provider must process it.
- The current demo uses a reserved fictional phone number and simulated delivery. It does not prove phone ownership during enrollment.
- A real deployment needs account enumeration protection, rate limits, verified enrollment, stronger possession factors such as passkeys, managed key rotation, monitoring, revocation, and independent security review.
- This prototype recognizes an enrolled account pattern. It does not prove civil identity, legal name, age, or humanness.

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- SQLite through `better-sqlite3`
- AES-256-GCM for contact encryption
- HMAC-SHA-256 for one-time-code digests
- OpenAI Responses API with GPT-5.6 Sol and Zod Structured Outputs
- SimpleWebAuthn for the retained passkey module
- Vitest and Chromium browser verification

## API

| Route | Purpose |
| --- | --- |
| `POST /api/conversation/enroll` | Store a derived response-style profile and encrypted destination. |
| `POST /api/conversation/match` | Compare new answers, select a candidate, and create a device challenge. |
| `POST /api/conversation/challenges/{challengeId}/verify` | Verify the one-time device code. |

The earlier passkey, recovery-agent, and private-relay explorations remain in the repository as supporting modules and product history. The current decision is documented in [ADR-002](docs/plan/authidenty-hackathon/adr-002-conversational-continuity.md).

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer

Install the locked dependencies:

```bash
npm ci
```

Copy `.env.example` to `.env.local`. Generate two different 32-byte Base64 secrets by running this command twice:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Configure:

```dotenv
AUTHIDENTY_DB_PATH=.data/authidenty.db
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
OPENAI_API_KEY=
AUTHIDENTY_VAULT_KEY_BASE64=<first-generated-value>
AUTHIDENTY_CHALLENGE_SECRET_BASE64=<second-generated-value>
```

Keep every secret server-side and never commit `.env.local`. `OPENAI_API_KEY` is optional: without it, Authidenty uses the deterministic score as a clearly labeled conservative fallback.

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The safe demo values are prefilled. Select:

1. **Enroll this answer pattern**
2. **Who do these answers resemble?**
3. **Verify enrolled device**

Run repository checks:

```bash
npm run lint
npm test
npm run build
```

Final verified state on 2026-07-17:

- 74 tests passed across 23 files;
- production build passed;
- live GPT-5.6 Sol browser flow returned `201`, `201`, and `200`;
- browser console errors: zero;
- live combined match score: 0.92 in the recorded journey.

## Built with Codex

Codex was the implementation partner for the project. It initialized and connected the repository, challenged the authentication hypothesis, researched the security tradeoffs, designed the SQLite migrations and trust boundary, wrote security-sensitive behavior test-first, integrated GPT-5.6, built the responsive interface, diagnosed the first static-looking demo video, and recorded the complete visible browser journey.

The git history preserves the work in small English commits:

1. add the derived conversational profile and OTP invariants;
2. expose the GPT-guided API boundary;
3. add the `You Know Me?` working demo;
4. verify with unit tests, lint, build, live HTTP, Chromium, screenshots, and a narrated video.

## Submission materials

- [Narrated demo script](docs/demo-script.md)
- [Devpost submission copy](docs/devpost-submission.md)
- [Final submission checklist](docs/submission-checklist.md)

The rebuilt video is ready locally and needs a new public YouTube upload before submission. The earlier public relay video is superseded.

## License

Authidenty is available under the [MIT License](LICENSE).

Last reviewed: 2026-07-17
