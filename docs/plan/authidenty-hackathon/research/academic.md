# Academic Research: Conversational Consistency for Authidenty

Research date: 2026-07-15

Scope: five peer-reviewed primary or survey sources covering stylometric continuous authentication, cross-domain authorship verification, multimodal behavioral fusion, privacy and usability, and LLM style imitation. The decision is whether conversational consistency should authorize recovery, contribute a non-dispositive risk signal, or be omitted from the hackathon MVP.

## Executive Decision

Conversational consistency should **not be a standalone authenticator**. The evidence shows that writing style contains repeatable identity signal, but the observed error rates, cross-topic instability, privacy cost, and imitation attack surface are incompatible with an account-recovery unlock decision.

For the product architecture, it may later become a **non-dispositive risk signal**: it can alter explanations, recommend a stronger recovery path, or raise a review flag, but it must never grant access, deny access, lock the account, or waive an independent cryptographic recovery factor.

For the hackathon MVP, conversational consistency should be **omitted from the authorization path**. Authidenty should demonstrate GPT-assisted failure diagnosis and recovery orchestration while a passkey, second bound authenticator, or one-time recovery mechanism remains the actual proof of account control. If the concept is shown at all, it should be labeled as an offline research experiment whose score has no effect on recovery.

| Option | Academic support | Security consequence | MVP decision |
|---|---|---|---|
| Standalone conversational authenticator | Weak | False accepts can unlock an account; false rejects can strand the legitimate user | Reject |
| Non-dispositive risk signal | Conditional | Useful only when an independent factor makes the authorization decision | Post-MVP research |
| Omit from recovery authorization | Strongest for present evidence | Keeps the recovery boundary deterministic and testable | Adopt |

## Evidence

### 1. Stylometry contains identity signal, but its demonstrated error is too high for recovery

Brocardo, Traore, and Woungang evaluated stylometry for continuous authentication using the Enron email corpus. Their experiment covered 76 authors and reported a 12.42% equal error rate for 500-character message blocks. Equal error rate is the operating point where false acceptance and false rejection rates are equal; a value of 12.42% is evidence of a useful statistical signal, not evidence of a safe account-unlock factor.

The Authidenty recovery setting is harder than the reported experiment. A distressed user may provide only a few short answers, switch devices, write more tersely than usual, or answer prompts whose subject matter differs from enrollment text. A recovery attacker may also have access to the victim's public writing. The paper therefore supports a research prototype for behavioral consistency but does not support a standalone recovery credential.

Source: [Brocardo, Traore, and Woungang, “Toward a Framework for Continuous Authentication Using Stylometry,” AINA 2014](https://doi.org/10.1109/AINA.2014.18).

### 2. Cross-topic and cross-domain transfer is materially unstable

Rivera-Soto et al. studied zero-shot authorship verification across Amazon reviews, fanfiction, and Reddit comments. They found meaningful transfer between some domain pairs but poor transfer between others, and concluded that neural models do not generally learn universal authorship features. The topic distribution and composition of the training data affected generalization; combining domains and masking content could help, but did not remove the underlying domain-dependence.

This is directly relevant to the proposed “different questions, same answer pattern” idea. A model can accidentally learn what a person discusses rather than how that person writes. Recovery questions also create a distribution shift: enrollment conversation may be calm and descriptive, while recovery answers may be brief, urgent, multilingual, or dictated. A high validation score on one prompt family cannot be treated as evidence that identity survives unseen questions.

Source: [Rivera-Soto et al., “Learning Universal Authorship Representations,” EMNLP 2021](https://aclanthology.org/2021.emnlp-main.70/).

### 3. Multimodal fusion is more promising than text alone, but the strongest result does not validate one-shot recovery

Fridman et al. combined keystroke dynamics, mouse movement, and stylometry in a decision-fusion system. On data from 67 users working in an office-like environment for approximately one week, the fused system reported false acceptance and false rejection rates below 1% after 30 seconds of activity. The study also evaluated partial sensor spoofing and found that fusion improved robustness compared with relying on one behavioral modality.

This supports the architectural principle that behavior, if used, should be fused with independent signals. It does not establish that an unfamiliar-device recovery conversation can achieve the same performance. The study continuously accumulated mouse and keyboard activity in a bounded environment; Authidenty may have only several text responses, may not trust client timing telemetry, and must defend a higher-value, adversarial unlock event. Moreover, “below 1%” can still be unacceptable for large-scale account recovery unless the signal is non-dispositive.

Source: [Fridman et al., “Multi-modal Decision Fusion for Continuous Authentication,” Computers & Electrical Engineering 41 (2015)](https://doi.org/10.1016/j.compeleceng.2014.10.018).

### 4. Behavioral authentication carries replay, matching, and privacy problems

Baig and Eskeland's survey identifies poor matching rates, replay or mimicry attacks, limited dataset sizes, context sensitivity, and privacy leakage as open problems in continuous authentication. Its review of stylometry studies reports substantially varying error rates, and it concludes that no single modality is suitable for every user situation. It also notes that behavioral templates can reveal personal characteristics and, unlike a password, cannot simply be replaced if compromised.

For Authidenty, storing raw recovery conversations or a durable “writing fingerprint” would contradict the project's data-minimization promise and create a new sensitive asset. Even derived embeddings are not automatically anonymous: they are designed to distinguish a person and therefore remain security- and privacy-relevant templates. Any later experiment should use explicit consent, short retention, separable identifiers, deletion, and preferably local or cancelable feature extraction. The hackathon MVP does not need this liability to demonstrate its core value.

Source: [Baig and Eskeland, “Security, Privacy, and Usability in Continuous Authentication: A Survey,” Sensors 2021](https://doi.org/10.3390/s21175967).

### 5. Current LLMs do not make style imitation harmless or impossible

Wang et al. evaluated more than 40,000 generations per model over writing from more than 400 real-world authors in news, email, forums, and blogs. The tested LLMs struggled to reproduce nuanced informal styles, but approximated personal style more successfully in structured formats such as news and email. Additional few-shot examples produced limited gains in their setup.

The security conclusion is not that conversational stylometry is safe from LLMs. The result is model-, prompt-, evaluator-, and domain-dependent, and structured email is close to the concise prose likely to appear in recovery. The experiment evaluates general few-shot imitation rather than an adaptive attacker who can query Authidenty's score, optimize prompts against its exact verifier, or combine copied phrases with generated text. Future models may also improve. LLM imitation must therefore be an explicit attack class, not a residual risk dismissed by current average performance.

Source: [Wang et al., “Catch Me If You Can? Not Yet: LLMs Still Struggle to Imitate the Implicit Writing Styles of Everyday Authors,” Findings of EMNLP 2025](https://aclanthology.org/2025.findings-emnlp.532/).

## Practical Product Boundary

The academically defensible boundary is:

```text
Conversation and WebAuthn failure context
                |
                v
GPT diagnoses likely failure and explains allowed paths
                |
                v
Deterministic policy selects required recovery factor
                |
                v
Independent proof of account control succeeds
                |
                v
Server authorizes passkey re-enrollment and credential revocation
```

GPT may classify intent, summarize symptoms, and generate an explanation from a closed set of policy-approved actions. It should not infer that the speaker is the account owner. Conversational similarity should not lower the required factor, and dissimilarity should not silently block a legitimate user. Otherwise the signal is dispositive regardless of the label applied to it.

The MVP can still tell a strong story without behavioral identity verification:

1. A user loses the only immediately available device or receives a WebAuthn failure.
2. GPT interprets the failure context and asks only diagnostic, non-identity questions.
3. The UI explains whether another synced passkey, another registered authenticator, or the recovery ceremony is appropriate.
4. A deterministic server-side policy verifies the independent recovery factor.
5. The user registers a replacement passkey, and the lost credential is suspended or revoked.
6. The demo makes clear that no identity document, biometric sample, or conversational identity profile was stored.

This places the novel value in **secure recovery orchestration and explanation**, not in claiming that an LLM can recognize a person from prose.

## Post-MVP Research Gate

Conversational consistency should enter the product only after a separate evaluation with the following properties:

- Same-author and impostor trials across unseen topics, devices, emotional states, answer lengths, and supported languages.
- A realistic cold-start condition with the small amount of enrollment text a normal user would tolerate.
- Copy-paste, paraphrase, public-writing replay, and LLM few-shot mimicry attacks, including an adaptive attacker with repeated attempts.
- FAR, FRR, EER, calibration error, time-to-decision, and confidence intervals rather than headline accuracy alone.
- False-rejection analysis for language learners, users with disabilities, speech-to-text users, and users whose writing style changes.
- Ablation against simpler baselines to establish whether an LLM or authorship embedding adds value beyond answer length, device context, and keystroke timing.
- Privacy review covering retention, deletion, template compromise, and whether a stored embedding can be linked across services.

The experiment should use passkey or recovery-factor success as ground truth and operate in shadow mode. No score should influence access until a security target is defined from the account's threat model and independently validated. The five sources above do not provide a transferable production threshold for Authidenty's recovery scenario.

## Final Recommendation

Use conversational consistency only as a future, consented, shadow-mode risk experiment. Do not implement it as an authenticator or as a hidden reason to deny recovery in the hackathon submission. For the MVP, invest the available time in the complete lost-device-to-new-passkey journey, deterministic recovery controls, adversarial tests of the GPT policy boundary, and a clear privacy explanation. That choice is more defensible academically and makes the role of GPT both useful and honest.
