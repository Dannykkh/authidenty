# Devpost Submission: Authidenty

## Core Fields

- Project name: `Authidenty`
- Category: `Apps for Your Life`
- Repository: `https://github.com/Dannykkh/authidenty`
- Video: `https://youtu.be/xtjQFG0Oq2o`
- Codex `/feedback` Session ID: `[ADD SESSION ID]`

## Tagline

Private human approval for AI services without repeatedly exposing phone numbers, identity documents, or biometrics.

## Short Description

Authidenty is a private identity relay that lets an AI service request approval from a previously enrolled person without collecting that person's phone number, legal name, birth date, identity document, or biometric again.

GPT-5.6 receives only a bounded service name and action description. It returns a structured purpose, human-readable summary, and suggested risk. Deterministic server policy chooses the final risk, privately routes a challenge to the enrolled device, verifies the one-time code, and returns a short-lived pseudonymous receipt.

## Inspiration

Identity checks are usually designed as if every service needs to know the person directly. That creates repeated form filling, phone-number exposure, document uploads, and large stores of sensitive data.

The project began as an exploration of conversational identity matching. Research and security review showed that writing style and embeddings were unsuitable as primary authentication: they are probabilistic, privacy-invasive, and vulnerable to imitation. Authidenty therefore pivoted to a smaller and more defensible question: can a service obtain human approval without learning the human's contact data?

## What It Does

1. A person enrolls a private device route. The current demo encrypts a reserved fictional phone destination with AES-256-GCM.
2. The service stores only an opaque relay handle.
3. The service sends the handle, its name, a bounded action description, and declared risk.
4. GPT-5.6 classifies the action through Zod Structured Outputs. Personal-data patterns are rejected before the model call.
5. Server policy clamps the final risk and sends a simulated one-time challenge to the encrypted destination.
6. The person verifies the six-digit code outside GPT.
7. Authidenty atomically consumes the challenge and issues a minimal receipt containing only a pseudonymous subject, purpose, risk, factor, and expiry.

The model explains the action. It does not authenticate the person, access the vault, verify the code, or issue the receipt.

## How We Built It

Authidenty uses:

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4;
- SQLite with explicit migrations and immediate transactions;
- AES-256-GCM field encryption with versioned server-side keys;
- HMAC-SHA-256 challenge digests with five-minute expiry, five attempts, and single-use consumption;
- the OpenAI Responses API with GPT-5.6, Zod Structured Outputs, `store: false`, no tools, bounded input, and a hashed safety identifier;
- SimpleWebAuthn for the retained passkey-registration exploration and the planned approval-factor upgrade;
- Vitest plus Chromium browser verification.

## How We Used Codex

Codex was the implementation partner throughout the project, not a one-time code generator. It:

- initialized and connected the repository;
- read the Build Week handoff and market research;
- challenged the original conversational-authentication hypothesis;
- compared product directions and documented the pivot;
- designed the trust boundary, SQLite schema, API contracts, and flow diagrams;
- wrote failing tests before security-sensitive persistence and verification behavior;
- implemented the encrypted vault, GPT-5.6 classifier, relay service, API routes, and responsive interface;
- diagnosed integration failures and kept small English commits;
- executed the real browser journey, checked live GPT-5.6 output, scanned for secrets, and produced the final narrated demo.

The public commit history and README preserve where product, engineering, privacy, and design decisions were made.

## Challenges

The main challenge was resisting a more dramatic but weaker idea. Conversational biometrics appeared novel, but it would make a probabilistic model responsible for identity and require storing behavioral profiles. The project became stronger after separating model usefulness from authentication authority.

Another challenge was demonstrating a private route without overclaiming production identity proofing. The first vertical slice therefore uses a reserved test number and simulated SMS adapter. The interface, README, and video all label that limitation.

## Accomplishments

- A complete route-to-receipt browser journey using live GPT-5.6 classification.
- An encrypted contact vault that never returns raw contact data through public API types.
- Deterministic risk clamping, expiring challenge digests, attempt limits, atomic consumption, and minimal receipts.
- PII rejection before model invocation.
- A conservative high-risk fallback when GPT is unavailable.
- 59 passing tests across 17 files, a clean production build, zero npm audit vulnerabilities, and no browser console errors in the recorded flow.

## What We Learned

The useful role for an LLM in identity infrastructure is not deciding who someone is. It is translating an arbitrary machine action into language and structured risk that a person can understand. Cryptographic or deterministic factors should retain authorization authority.

We also learned that privacy can be a data-routing property rather than another identity-proofing step. A service can receive evidence that an enrolled device approved a purpose without receiving the device destination itself.

## What's Next

- replace the simulated SMS factor with passkey assertion approval;
- verify device ownership during enrollment;
- authenticate and rate-limit relying services;
- rotate managed encryption keys;
- sign verification receipts for third-party validation;
- add revocation, audit controls, and production security review;
- prefer derived claims such as `age_over_18` over storing raw birth dates.

## Testing Instructions

1. Clone the public repository.
2. Follow the environment and key-generation steps in `README.md`.
3. `OPENAI_API_KEY` is optional. Without it, the UI clearly displays the conservative fallback and still completes deterministic verification.
4. Run `npm ci`, `npm test`, and `npm run dev`.
5. Open `http://localhost:3000`.
6. Use the prefilled reserved demo data and select:
   - `Create private route`
   - `Request private approval`
   - `Verify device control`

No real SMS provider is contacted, and no real identity data should be entered.
