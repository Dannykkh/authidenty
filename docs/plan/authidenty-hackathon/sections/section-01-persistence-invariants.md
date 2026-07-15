# Section 01: Persistence Invariants

## Background

The current SQLite schema stores users, public passkey credentials, and WebAuthn challenges. The complete Authidenty journey also needs credential revocation, Authentication challenges, opaque Application Sessions, one-time Recovery Codes, Recovery Transactions, one-purpose Re-enrollment Grants, attempt throttling, and notification evidence. These states form the authorization boundary and must exist before routes or UI are added.

This section owns schema migration and repository contracts only. It must not call GPT-5.6 or implement browser components.

## Requirements

- Add migration 002 without modifying migration 001.
- Make the migration runner support descriptive migration filenames rather than hard-coding `_initial`.
- Preserve only public passkey material and digests of bearer/recovery secrets.
- Support credential states `active` and `revoked`.
- Support ceremony types `registration`, `authentication`, and `reenrollment`.
- Make challenges, sessions, code reservations, grants, and completion transitions expire and consume atomically.
- Permit exactly one current Recovery Code per user across `active` and `reserved` states.
- Permit at most one active Re-enrollment Grant per Recovery Transaction.
- Preserve disposable development rollback through migration 002 down SQL.

## Dependencies

- Requires: none.
- Blocks: sections 02, 03, 04, and 05.

## Flow Diagram Nodes

- **Diagrams**: all files in `flow-diagrams/`.
- **Nodes**:
  - `PersistInitial` and `IssueRecoveryCode` — store the first credential and code digest.
  - `UpdateCredentialUse` — update counter, backup state, and last-used time.
  - `StartTransaction` — persist short-lived recovery context without conversation text.
  - `BeginImmediate`, `ReserveCode`, `CreateGrant`, `CommitAuthorization` — authorize one transaction atomically.
  - `BeginCompletion`, `InsertReplacement`, `ConsumeGrant`, `RevokeLost`, `RedeemAndRotate`, `WriteNotifications`, `CommitCompletion` — complete recovery atomically.
- **Branches**:
  - `ReservationAvailable` — stale or replayed state rolls back without a grant.
  - `RecheckState` — any cross-user, expired, or consumed mismatch rolls back all completion changes.

## Reference Libraries

| Library | Version | Purpose |
|---|---:|---|
| `better-sqlite3` | 12.11.1 | Synchronous SQLite access and immediate transactions |
| `@simplewebauthn/server` | 13.3.2 | Credential and ceremony types |
| Node `crypto` | Node 20+ | Opaque identifiers, bearer tokens, and keyed digests |
| Vitest | 4.1.10 | Migration and repository invariant tests |

Before coding, inspect the installed library types and current SimpleWebAuthn server documentation for the exact verified credential fields. Do not copy an older counter-handling example from memory.

## Implementation Details

### Migration runner

Change `database.ts` to use an ordered migration manifest or discover one exact up/down pair per numeric version. Version 001 remains `001_initial.*.sql`; version 002 is `002_authentication_recovery.*.sql`. Apply SQL and `PRAGMA user_version` in one migration transaction. Keep `foreign_keys = ON` and file-backed WAL behavior.

### Migration 002

Implement the DDL specified in `db-schema.md`:

- extend `passkey_credentials` with status, last-used, and revoked timestamps;
- rebuild `webauthn_challenges` if required to add `reenrollment` to its check constraint;
- create `application_sessions`;
- create `recovery_codes` with `active`, `reserved`, `redeemed`, and `revoked` states;
- create `recovery_transactions` with no raw chat column;
- create `reenrollment_grants` with `active`, `consumed`, and `expired` states;
- create `recovery_rate_limits` and `recovery_notifications`;
- add the partial unique and lookup indexes from the schema design.

SQLite DDL limitations may require create-copy-drop-rename for constrained tables. Preserve all version-001 data and recreate indexes after a rebuild.

### Secret representation

Generate bearer values with at least 32 random bytes. Store `SHA-256` token digests for high-entropy server-issued session/grant tokens. Store Recovery Codes with a versioned keyed digest using a server secret, for example HMAC-SHA-256 over a normalized code. Do not use a plain unsalted hash for the human-entered code. Code formatting separators are presentation only; normalization must be deterministic and tested.

Never persist or log:

- Recovery Code plaintext or candidates;
- Application Session or grant token plaintext;
- WebAuthn private keys or biometric data;
- GPT conversation content;
- cookie values or API keys.

### Repository boundaries

Split repositories by state ownership rather than expanding one unbounded file:

- `passkey-repository.ts`: users, credentials, challenges;
- `session-repository.ts`: Application Sessions;
- `recovery-repository.ts`: codes, transactions, grants, throttles, and notifications.

Expose domain records with camelCase fields and keep SQL rows private. Return `null` or typed results for expected misses; throw only for invariant or database failures.

Required credential operations:

- list active credentials for a user;
- find an active credential by ID and expected user;
- update verified credential counter, backup state, and last-used time;
- revoke one expected active credential with a timestamp;
- prevent revoked credentials from ordinary authentication queries.

Required session operations:

- create a digest-backed Application Session;
- resolve only unexpired, unrevoked sessions;
- revoke one session idempotently;
- purge expired records as maintenance, not as authorization logic.

Required recovery operations:

- issue the first active Recovery Code digest only after initial credential verification;
- create and resolve an unexpired Recovery Transaction;
- record failed code attempts and enforce a bounded backoff window;
- reserve one matching active code and create one active grant in an immediate transaction;
- release an expired reservation only when its transaction/grant no longer authorizes enrollment;
- atomically complete replacement, grant consumption, credential revocation, code rotation, and notification insertion.

### Transaction rules

Use `database.transaction(fn).immediate()` for one-time state changes. Every update includes the expected prior status in its `WHERE` clause and checks `changes === 1`. A read followed by an unconditional update is not sufficient.

Reservation transaction:

1. Resolve and validate the Recovery Transaction.
2. Release its stale reservation if policy permits.
3. Compare the candidate digest without returning factor metadata.
4. Update the code from `active` to `reserved` and bind it to the transaction.
5. Update the transaction to `authorized`.
6. Insert one active grant digest.
7. Clear or reset the successful throttle bucket.

Completion transaction:

1. Recheck user, transaction, code, grant, purpose, and expiry.
2. Insert the verified replacement credential.
3. Consume the grant and complete the Recovery Transaction.
4. Revoke the reported lost credential. For the disposable one-credential demo, choose the sole previous active credential only after authorization.
5. Mark the old code redeemed and insert the new active code digest.
6. Insert `recovery_completed` and `credential_revoked` notification records.

The new Recovery Code plaintext exists only in service memory and the one successful response.

## Test Scenarios

### Migration and schema

| Case | Input | Expected result |
|---|---|---|
| Fresh database | Open `:memory:` at version 0 | Migrations 001 and 002 apply; `user_version = 2` |
| Existing v1 data | Open database with one user and credential | Migration 002 preserves rows and defaults credential to active |
| Newer database | `user_version > 2` | Open fails without altering data |
| Down migration | Disposable v2 database | Version-002 objects are removed and v1 shape restored |
| Secret columns | Inspect `sqlite_schema` | No plaintext code, token, chat, document, or biometric column |

### One-time states

| Case | Input | Expected result |
|---|---|---|
| Consume challenge | Same session and type twice | First call returns record; second returns null |
| Session expiry | Digest matches but expiry is past | No Application Session returned |
| Concurrent code reservation | Same valid code and transaction twice | Exactly one success and one active grant |
| Cross-account code | User A transaction with user B digest | Generic miss; no rows change |
| Grant replay | Consume active grant twice | Exactly one completion authorization |
| Reservation expiry | Enrollment abandoned until expiry | Reservation releases to active; no credential/session changes |
| Completion rollback | Notification insert or credential conflict fails | No partial credential, code, grant, or transaction change |
| Code rotation | Successful completion | Old code redeemed; exactly one new active code |

### Credential lifecycle

| Case | Input | Expected result |
|---|---|---|
| Active lookup | Active credential and correct user | Credential returned |
| Wrong user | Existing credential with another expected user | Null |
| Revoked lookup | Revoked credential | Null for authentication |
| Verified use | New counter and backup state | Fields and `last_used_at` update atomically |
| Revoke twice | Same credential | First changes one row; second is an idempotent no-op or typed conflict |

## Implementation Strategy

### Phase 1: Red

- Extend schema tests for versions 0, 1, 2, preservation, and forbidden columns.
- Add repository tests for every replay, expiry, cross-account, and rollback case above.
- Confirm new tests fail for missing schema or methods.

### Phase 2: Green

- Implement migration runner support and migration 002.
- Add the smallest typed repository methods that pass focused tests.
- Keep service and route behavior out of this section.

### Phase 3: Refactor

- Deduplicate row mapping and time/status checks without hiding SQL transition predicates.
- Review every logger and thrown error for secret content.
- Run all existing registration and recovery-agent tests.

## Quality Gate

- [ ] Migration 001 is unchanged and migration 002 has tested up/down files.
- [ ] All repository tests cover normal, error, expiry, replay, race, and cross-account behavior.
- [ ] Every one-time state transition uses an immediate transaction and expected-status update.
- [ ] No raw secret, chat, document, biometric, or private-key storage exists.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] Existing passkey registration still works against schema version 2.
- [ ] Flow nodes assigned to this section have repository operations and tests.

## Risk and Rollback

| Risk | Impact | Mitigation | Rollback |
|---|---|---|---|
| SQLite table rebuild loses v1 data | High | Preservation test using a real file | Stop rollout and restore the disposable v1 file; fix migration before retry |
| Partial recovery completion | Critical | One immediate transaction and fault-injection test | Roll back the transaction; no compensating partial writes |
| Digest design permits offline guessing | High | Keyed versioned Recovery Code digest and high-entropy format | Revoke prototype codes and rotate server digest version |
| Repository surface becomes ambiguous | Medium | Split by state owner and use typed results | Revert only the unconsumed repository commit |

## Acceptance Criteria

- [ ] A fresh and an existing v1 SQLite database reach version 2 safely.
- [ ] Repository tests prove exact-once reservation, grant issuance, consumption, and code rotation.
- [ ] Credential lookup excludes revoked or wrong-account records.
- [ ] Session, transaction, code, and grant expiry are enforced from server state.
- [ ] No plaintext recovery or bearer secret is present in schema or logs.
- [ ] All Test Scenarios and Quality Gate items pass.

## Files to Create or Modify

- `src/server/db/database.ts` — versioned migration lookup and schema version 2.
- `src/server/db/migrations/002_authentication_recovery.up.sql` — target schema.
- `src/server/db/migrations/002_authentication_recovery.down.sql` — disposable rollback.
- `src/server/db/schema.test.ts` — migration and preservation tests.
- `src/server/db/passkey-repository.ts` — credential status and ceremony operations.
- `src/server/db/passkey-repository.test.ts` — credential and challenge invariants.
- `src/server/db/session-repository.ts` — Application Session persistence.
- `src/server/db/session-repository.test.ts` — session lifecycle tests.
- `src/server/db/recovery-repository.ts` — Recovery Code, transaction, grant, throttle, and notification state.
- `src/server/db/recovery-repository.test.ts` — one-time and rollback invariants.

If implementation introduces a new state-changing API, update `api-spec.md` before merging it.
