# Devpost Submission: Authidenty — You Know Me?

## Core Fields

- Project name: `Authidenty: You Know Me?`
- Category: `Apps for Your Life`
- Repository: `https://github.com/Dannykkh/authidenty`
- Video: `https://youtu.be/_L_XQ3Tj-58`
- Codex `/feedback` Session ID: `[ADD SESSION ID]`

## Tagline

Different questions. The same way of answering. GPT-5.6 selects the likely account; the enrolled device proves it.

## Short Description

Authidenty is a conversational-continuity login experiment. A person enrolls a name, phone number, and three answers. Authidenty stores an encrypted phone destination and a small derived writing-style vector, not the raw answer sentences.

When the person returns, they answer three different questions without typing their name or phone number. Deterministic similarity selects the closest enrolled profile. GPT-5.6 Sol compares only the two numerical vectors and returns a structured score and explanation. A strong match reveals the enrolled name and masked phone, then a one-time code sent to that device completes verification.

## Inspiration

Identity checks repeatedly ask for the same personal facts. Every new copy of a phone number, birthday, document, or selfie becomes another privacy and breach risk. We wanted to test whether an account could recognize something about a person's response habits before asking them to repeat their identity.

The first version of the idea was too broad: use an LLM as the authenticator. Threat review showed why that would be unsafe. Writing style is probabilistic, imitable, and subject to drift. The final hackathon experiment keeps the novel part but changes its authority: conversational similarity may select a candidate, while possession of the enrolled device remains the final factor.

## What It Does

1. Enroll a display name, a reserved fictional phone number, and three answers.
2. Derive an explainable `style-v1` vector from features such as answer length, lowercase starts, contractions, first-person terms, hedges, connectors, commas, and exclamation marks.
3. Encrypt the phone destination with AES-256-GCM and discard the raw answer sentences after processing.
4. Ask three different questions on return, without requesting name or phone.
5. Rank active profiles with deterministic vector similarity.
6. Send only the best enrolled vector, returning vector, and hashed safety identifier to GPT-5.6 Sol.
7. Combine deterministic and model scores under a server-owned threshold.
8. Reveal the candidate name and masked phone only after a strong match.
9. Verify a six-digit device challenge outside GPT with expiry, limited attempts, and single-use consumption.

Weak matches reveal no name, phone suffix, or OTP route.

## How We Built It

Authidenty uses:

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4;
- SQLite with explicit reversible migrations and immediate transactions;
- AES-256-GCM field encryption with versioned server-side keys;
- HMAC-SHA-256 OTP digests with five-minute expiry, five attempts, and replay prevention;
- the OpenAI Responses API with GPT-5.6 Sol, Zod Structured Outputs, `store: false`, no tools, bounded numerical input, and a hashed safety identifier;
- SimpleWebAuthn for the retained passkey module and planned stronger possession factor;
- Vitest plus a real Chromium browser recording with visible typing and clicks.

## How We Used Codex

Codex was the implementation partner throughout the project. It:

- initialized and connected the GitHub repository;
- read the Build Week handoff and existing identity-friction research;
- challenged the initial LLM-authentication hypothesis and documented the security boundary;
- designed the derived-vector and encrypted-contact SQLite schema;
- wrote failing tests before persistence, matching, GPT requests, API boundaries, and OTP behavior;
- implemented the GPT-5.6 Structured Outputs analyzer and conservative fallback;
- built the `You Know Me?` interface and responsive question flow;
- diagnosed why the previous video looked static;
- recorded real typing, live GPT matching, `Danny Kim`, `***-***-0184`, and final OTP verification;
- generated the English Typecast narration, subtitles, thumbnail, and final 91-second video.

The public commit history preserves the product and engineering decisions in small English commits.

## Challenges

The hardest challenge was finding a meaningful role for an LLM without giving it inappropriate security authority. A style match is interesting evidence, but it is not a secret and cannot safely replace possession or cryptographic proof.

The second challenge was privacy. The server must still hold the enrolled name and phone. We therefore encrypted the phone at rest, never sent identity fields or raw answers to GPT, returned only a masked route, and made weak matches reveal nothing.

The third challenge was demonstration quality. The earlier video technically used the app but looked like static slides. The rebuilt version visibly types answers, clicks every action, waits for live GPT-5.6 Sol, shows the matched name and phone suffix, and completes the one-time code.

## Accomplishments

- A complete live browser journey from enrollment to cross-question recognition and device verification.
- GPT-5.6 Sol receives only derived numerical vectors, never identity data or raw answers.
- The recorded match returned `Danny Kim`, `***-***-0184`, and a combined score of 0.92.
- Weak-match privacy, same-origin API checks, encrypted phone storage, OTP expiry, attempt limits, and replay prevention are covered by tests.
- 74 passing tests across 23 files, a clean production build, and zero browser console errors.
- Live API statuses of `201`, `201`, and `200`.
- A 91-second English demo with Typecast narration, exact SRT captions, and an actual working-program recording.

## What We Learned

An LLM can be useful in identity systems when it evaluates a bounded signal and explains uncertainty. It should not be allowed to open a vault, send an OTP, verify a code, or create an authenticated session.

We also learned that “less repeated identity entry” does not mean “no personal data exists.” Authidenty still needs a protected enrollment record. Honest boundary language is part of the product.

## What's Next

- replace simulated SMS with passkey assertion or verified push approval;
- prove phone or device ownership during enrollment;
- add enrollment diversity and drift handling without retaining raw conversations;
- measure false accepts and false rejects across languages, assistive writing tools, and changing user habits;
- add account enumeration protection, rate limits, revocation, audit controls, and managed key rotation;
- evaluate a 1:1 account-confirmation mode before any broader 1:N candidate discovery;
- obtain an independent privacy, bias, and security review.

## Testing Instructions

1. Clone the public repository.
2. Follow the environment and key-generation steps in `README.md`.
3. `OPENAI_API_KEY` is optional. Without it, Authidenty labels and uses the deterministic fallback.
4. Run `npm ci`, `npm test`, and `npm run dev`.
5. Open `http://localhost:3000`.
6. Use the prefilled reserved demo data and select:
   - `Enroll this answer pattern`
   - `Who do these answers resemble?`
   - `Verify enrolled device`

No real SMS provider is contacted. Do not enter real identity data.
