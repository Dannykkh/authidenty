# Strategic Review: Conversational Identity and Private OTP Routing

Review date: 2026-07-16

Project: Authidenty

Scope: Evaluate whether a person's conversational style can identify an account, derive a cryptographic key, and privately route an OTP to the enrolled phone number.

## Executive Verdict

**NO-GO as a production authentication mechanism. CONDITIONAL GO as a clearly labeled, non-authorizing research experiment.**

The proposal contains a useful experience hypothesis: a returning user could avoid typing a phone number or account identifier before receiving a challenge on a previously enrolled device. However, the proposed implementation combines three distinct security operations that require different guarantees:

1. **Account discovery:** decide which account the claimant may mean.
2. **Authentication:** prove control of an authenticator bound to that account.
3. **OTP routing:** retrieve an enrolled destination and send a challenge.

Conversational similarity may be researched as an account-discovery or fraud-risk signal. It is not presently credible as the authenticator, a cryptographic key, or the storage mechanism for a phone number. The SMS possession check would remain the actual authentication factor.

## Five-Dimension Review

| Dimension | Finding | Verdict |
|---|---|---|
| Demand | Avoiding repeated phone-number entry is a real convenience, but no evidence yet shows that users prefer a multi-turn conversation to passkey autofill, a remembered device, or a short pseudonymous alias. | Weak and unvalidated |
| Defensibility | An embedding classifier and prompt flow are reproducible. Sustainable advantage would require a large, consented longitudinal attack dataset and unusually strong calibration, which the project does not have. | No present moat |
| Scope | Reliable enrollment, 1:N search, drift handling, mimicry defense, privacy controls, SMS delivery, abuse controls, and recovery create a security product rather than a hackathon feature. | Pivot or reduce |
| Return on investment | The design adds LLM inference, enrollment friction, sensitive behavioral templates, support burden, and security testing while still depending on SMS or a passkey. | Negative for the MVP |
| Kill Test | If the conversation score is removed, encrypted account-to-phone routing and passkey/SMS still work. If SMS is removed, the conversation score cannot safely authorize access. The novel component is therefore neither necessary nor sufficient for authentication. | Fails |

## Where the Hypothesis Breaks

### 1. Enrollment is circular

The first conversation does not establish who the person is. The system must first bind that conversation template and phone number to an account using an existing proof such as a verified phone, passkey, federated identity, recovery code, or identity-proofing process. Once a passkey is bound, later authentication can use the passkey directly with less disclosure and stronger phishing resistance.

### 2. No identifier turns verification into 1:N identification

If the claimant provides no phone number, username, alias, or device-bound account handle, Authidenty must compare the conversation against every enrolled profile. That is a 1:N identification problem, not a normal 1:1 verification problem. As the number of accounts grows, the chance of a coincidental nearest match and the value of account-enumeration attacks both increase. A high similarity score does not prove that the nearest profile is the correct person.

### 3. A conversation embedding is not a cryptographic key

Embeddings are approximate, model-dependent representations. The same person can produce different vectors across topics, mood, language, response length, prompts, or model versions. A cryptographic key must be reproduced exactly and must have adequate, measurable entropy.

Research on fuzzy extractors shows that noisy, non-uniform inputs can sometimes yield stable keys, but only after formally defining a distance metric, an error tolerance, helper-data leakage, and sufficient min-entropy. Authidenty has no evidence that conversational vectors satisfy those prerequisites. Hashing or rounding an embedding does not create those guarantees. See [Dodis et al., Fuzzy Extractors](https://www.cs.bu.edu/~reyzin/fuzzy.html).

### 4. A phone number cannot be both recoverable and hidden inside an irreversible vector

The SMS provider ultimately needs a routable phone number or provider token.

- If the conversation vector is irreversible, the server cannot recover the destination from it.
- If the destination can be recovered from the vector, the vector is functioning as encrypted or encoded storage and must be protected as sensitive data.
- If a matched profile points to a separate destination, the phone number was never stored "inside" the conversation vector; the vector was only an account lookup index.

The correct storage design is conventional: keep the phone destination in a separate encrypted field or vault, expose only a masked label, and never send it to the LLM. An opaque provider routing token can reduce internal exposure, but it does not remove the telecom provider's need to know the destination.

### 5. Derived vectors are not automatically anonymous

A durable writing-style template is a behavioral identifier that can be linked, imitated, or used to infer characteristics. Research has also demonstrated input-reconstruction leakage from some LLM internal embeddings, so derived representations must not be presumed anonymous merely because raw text is discarded. See [Wan et al., Information Leakage from Embedding in Large Language Models](https://arxiv.org/abs/2405.11916).

The local academic review found the same practical boundary: a stylometry experiment over 76 Enron authors reported a 12.42% equal error rate for 500-character blocks, while cross-domain work found that authorship representations do not reliably transfer across topics and domains. See [academic.md](research/academic.md).

### 6. Behavioral similarity cannot replace an authenticator

NIST's current digital identity model distinguishes identity proofing from authentication and defines authentication around possession or control of an authenticator bound to an account. It states that knowledge-based questions are not an acceptable secret and that biometric characteristics cannot be standalone authenticators. A conversation pattern is not literally a NIST biometric, but it has the same central problems as a remotely matched behavioral characteristic: it is probabilistic, observable, difficult to revoke, and not proof of possession. See [NIST SP 800-63 Digital Identity Model](https://pages.nist.gov/800-63-4/sp800-63/model/) and [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html).

NIST also treats fraud indicators as risk controls that do not substitute for an authentication factor. That is the defensible role for a conversational score.

## Threat Review

| Threat | Consequence | Required response |
|---|---|---|
| Public writing or leaked chat is replayed | False match to the victim | Treat similarity as non-authorizing; test copied and paraphrased samples |
| An LLM imitates the victim's tone | Scalable impersonation attempts | Include informed and adaptive mimicry in the evaluation |
| The legitimate user's style changes | False rejection and account lockout | Never let the score deny access; provide deterministic factors |
| A nearest-neighbor search returns the wrong account | OTP is sent to an unrelated user, enabling harassment or enumeration | Require a non-secret account handle and generic responses; rate-limit sends |
| Model or embedding version changes | Existing templates drift or become incomparable | Version templates and re-evaluate before migration |
| Behavioral template is breached | A difficult-to-revoke identifier may be reused across services | Encrypt, isolate, expire, delete, and avoid cross-service templates |
| SMS endpoint is abused | OTP bombing, cost amplification, and user harassment | Per-account/device/IP quotas, cooldowns, risk checks, and audit logs |

## Safe Research Version

The hypothesis can still become a credible hackathon experiment if its claim is reduced to:

> Can a consented conversational-continuity signal recognize a returning participant across different prompts without influencing account access?

The experiment should use this boundary:

1. Establish each participant's account with a passkey or test credential.
2. Use a pseudonymous alias to select one profile and evaluate 1:1 verification before attempting 1:N identification.
3. Collect several sessions on different days and topics with explicit consent.
4. Evaluate genuine attempts, ordinary impostors, copied text, paraphrases, and LLM-assisted imitation.
5. Report FAR, FRR, EER, calibration, abstention rate, response burden, and confidence intervals rather than accuracy alone.
6. Run the score in shadow mode. It must not send an actual OTP, unlock an account, deny a user, or weaken a required factor.
7. Demonstrate OTP routing with a simulated masked destination, not real participant phone numbers.
8. Delete raw conversations after the declared research window; encrypt and version any retained template; provide deletion and withdrawal.

For a hackathon demonstration, a small participant study can show whether the idea deserves further research, but it cannot substantiate a security or identity-proofing claim.

## If Authidenty Needs a Real Login Flow

Use the following production boundary instead:

```text
pseudonymous account handle or device-bound account hint
    -> optional conversational risk score
    -> passkey as primary authenticator
    -> encrypted phone routing only as a controlled fallback
    -> generic response, quotas, cooldown, and audit trail
```

In this design:

- The phone number is encrypted separately and never exposed to the LLM.
- The conversation score can request a stronger factor but cannot satisfy one.
- A passkey, OTP possession check, or recovery code makes the access decision.
- Removing the LLM does not break the security boundary.

This is safer, but its novelty is risk-adaptive UX rather than LLM-based proof of identity.

## Final Decision

Do not add conversation-derived keys, phone-number-in-vector storage, or conversational identity matching to the Authidenty authentication path.

Proceed only if the project is explicitly reframed as a research demo of **conversational continuity under adversarial testing**, with no real accounts or phone numbers and no authorization effect. The current passkey-first implementation and its deterministic recovery boundary should remain unchanged until independent evidence supports a narrower production use.
