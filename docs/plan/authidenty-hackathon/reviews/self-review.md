# Independent Plan Self-Review

Because both external CLI reviews failed within their time boxes, the main planning context performed a separate plan-level devil's-advocate review.

## Findings

1. **Critical: Recovery Code consumption is underspecified.** The plan redeems the code before a network-dependent WebAuthn ceremony, which can strand a legitimate user after timeout or platform failure. Reserve the code to one Recovery Transaction, issue at most one active Re-enrollment Grant, and mark it redeemed only when replacement succeeds and rotation occurs. Release an expired reservation under a tested policy.
2. **Critical: deployment storage is unresolved too late.** SQLite on an ephemeral or multi-instance serverless host invalidates the state model. Decide by July 16 whether the final evidence runs on persistent single-instance hosting or verified localhost. Do not migrate databases late solely for a public URL.
3. **High: same-origin request protection is not explicit.** SameSite cookies reduce but do not replace Origin/Host validation for state-changing session, recovery, and re-enrollment routes. Add strict same-origin checks and JSON content-type validation.
4. **High: model action selection is still broader than necessary.** Deterministic policy should calculate the full available Recovery Action set. The model may explain or prioritize only within that set, while the UI continues to expose a safe alternative path.
5. **High: credential revocation target may be ambiguous.** The one-credential disposable demo can revoke its only prior credential; multi-credential accounts need explicit credential selection or a no-revoke default.
6. **High: a one-time Recovery Code shown in screenshots becomes compromised.** All captured accounts must be disposable and codes rotated/reset after every capture.
7. **Medium: notification wording can overclaim.** An outbox record is “recorded,” not “sent” or “delivered.” Keep this distinction in UI, README, and video.
8. **Medium: the model evaluation gate needs a measurable rubric.** Define correct action coverage, forbidden claim rate, schema success, fallback success, p50/p95 latency, and compare low versus medium reasoning on the same cases.
9. **Medium: public deployment is not a core requirement in the official summary.** Treat it as optional polish if a persistent environment is not already available; preserve a reproducible localhost run and public code repository.
10. **Medium: the schedule needs stop conditions by gate, not only by day.** Stop optional work immediately when G2–G4 slip, and reduce multi-turn model UX to one diagnostic turn before sacrificing the authorization path.

## Verdict

Proceed after revising Recovery Code reservation semantics, moving the storage/origin decision earlier, and adding same-origin enforcement. The critical-path strategy is feasible only if public deployment, multi-device management, and multi-turn chat remain optional.

## Three Required Plan Changes

1. Replace verify-and-redeem with reserve-authorize-complete semantics for the Recovery Code.
2. Make the final evidence environment decision on July 16 and keep public deployment optional.
3. Add same-origin/API boundary tests and a quantitative GPT scenario rubric.
