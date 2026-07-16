# Conversational Continuity MVP

Status: Active Build Week demo baseline

Date: 2026-07-17

## Product Statement

Authidenty asks different questions and recognizes the way an enrolled person answers. A strong conversational match selects the likely account and reveals a masked enrolled destination. A device code then completes verification.

## Demo Contract

### Enrollment

- Input: display name, E.164 phone number, three to six answers.
- Store: user record, AES-256-GCM encrypted phone, `style-v1` vector.
- Do not store: raw answer sentences.

### Return

- Input: three to six answers to different questions.
- Derive a candidate vector.
- Rank active profiles with deterministic weighted feature distance.
- Send only the best enrolled vector, candidate vector, and hashed safety identifier to GPT-5.6 Sol.
- Combine deterministic and model scores with server-owned weights.
- Below `0.72`: return a generic no-match result.
- At or above `0.72`: reveal display name and masked phone, then issue a simulated OTP challenge.

### Final Verification

- Store only an HMAC-SHA-256 code digest.
- Expire after five minutes.
- Allow at most five attempts.
- Consume once.
- Return the verified display name and masked destination.

## API

| Route | Success |
| --- | --- |
| `POST /api/conversation/enroll` | `201 enrolled` |
| `POST /api/conversation/match` | `200 no_match` or `201 challenge_sent` |
| `POST /api/conversation/challenges/{challengeId}/verify` | `200 verified` |

All POST routes require same-origin JSON requests.

## Style Vector v1

The first explainable vector uses normalized aggregate features:

- average words per answer;
- average word length;
- comma and exclamation rates;
- lowercase-start rate;
- contraction rate;
- first-person rate;
- hedge rate;
- connector rate.

The vector is not a secret, biometric claim, or permanent identity representation.

## OpenAI Boundary

- Model: `gpt-5.6`, currently the GPT-5.6 Sol alias.
- Endpoint: Responses API.
- Output: Zod Structured Output with `score` and one short English `explanation`.
- Storage flag: `store: false`.
- Tools: none.
- PII: none in model input.
- Failure: use the deterministic score and label `conservative_fallback`.

## Production Gaps

- verified enrollment ownership;
- passkey or verified push possession factor;
- 1:1 confirmation mode;
- rate limiting and account-enumeration defenses;
- drift, multilingual, accessibility, and assistive-tool evaluation;
- managed encryption keys and rotation;
- delivery provider integration;
- revocation, audit, monitoring, and security review.
