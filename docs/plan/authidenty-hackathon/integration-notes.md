# External Review Integration Notes

## Review Availability

- Gemini: unavailable because the installed client/account tier was rejected.
- Isolated Codex CLI: timed out after the three-minute planning limit.
- Fallback: separate plan-level self-review completed and integrated.

## Integrated

| Finding | Plan change |
|---|---|
| Recovery Code could be consumed before failed enrollment | Use `active → reserved → redeemed/released` semantics bound to one Recovery Transaction; redeem only after successful replacement |
| Deployment decision occurs too late | Move evidence environment and persistence decision to July 16; public deployment becomes optional |
| Same-origin protection omitted | Add strict Origin/Host and JSON content-type checks to state-changing routes and tests |
| Model action selection broader than necessary | Server owns the full Recovery Action set; model only explains/prioritizes within it |
| Revocation target ambiguous | One-credential demo revokes the only prior credential; multi-credential selection is deferred |
| Screenshot secret exposure | Use disposable accounts and rotate/reset all captured codes |
| Notification overclaim | Use “recorded” for outbox-only MVP evidence |
| Model evaluation vague | Add fixed-case correctness, forbidden-claim, schema/fallback, and latency rubric |

## Not Integrated

| Suggestion | Reason |
|---|---|
| Remove Application Session to save time | Successful returning-user sign-in is necessary to demonstrate the product before and after recovery |
| Migrate immediately to managed Postgres | Adds avoidable risk; persistent single-instance SQLite or verified localhost evidence is sufficient for the prototype |
| Add full multi-credential selection now | The critical demo uses a disposable account with one original credential; general management is optional |

## Remaining Open Questions

- Which persistent host, if any, is already available without a database migration?
- Whether official submission expectations require a public live URL; current official summary requires a working/runnable project, repository, and demo video, not a deployed URL.
