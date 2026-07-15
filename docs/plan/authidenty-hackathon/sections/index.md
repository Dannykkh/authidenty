<!-- SECTION_MANIFEST
section-01-persistence-invariants
section-02-passkey-authentication
section-03-recovery-authorization
section-04-replacement-lifecycle
section-05-recovery-guide
section-06-journey-interface
section-07-verification-submission
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---|---|---|---|
| section-01-persistence-invariants | - | 02, 03, 04, 05 | No; shared schema ownership |
| section-02-passkey-authentication | 01 | 04, 06, 07 | Yes, with 03 after contracts are fixed |
| section-03-recovery-authorization | 01 | 04, 05, 06, 07 | Yes, with 02 after contracts are fixed |
| section-04-replacement-lifecycle | 02, 03 | 06, 07 | Yes, with 05 after section 03 |
| section-05-recovery-guide | 03 | 06, 07 | Yes, with 04 after section 03 |
| section-06-journey-interface | 02, 03, 04, 05 | 07 | No; integrates all public contracts |
| section-07-verification-submission | 01, 02, 03, 04, 05, 06 | - | Partly; evidence tasks can split after behavior freezes |

## Execution Order

1. Implement `section-01-persistence-invariants` alone because migrations and repositories are shared foundations.
2. Implement `section-02-passkey-authentication` and `section-03-recovery-authorization` in parallel only after their repository contracts pass.
3. Implement `section-04-replacement-lifecycle` and `section-05-recovery-guide` in parallel after recovery policy types are fixed.
4. Integrate the public journey in `section-06-journey-interface`.
5. Freeze behavior, then complete `section-07-verification-submission`.

## Flow Diagram Mapping

| Section | Flow diagram | Nodes |
|---|---|---|
| section-01-persistence-invariants | All core diagrams | PersistInitial, IssueRecoveryCode, UpdateCredentialUse, StartTransaction, BeginImmediate, ReserveCode, CreateGrant, BeginCompletion, InsertReplacement, ConsumeGrant, RevokeLost, RedeemAndRotate, WriteNotifications |
| section-02-passkey-authentication | `passkey-setup-authentication.mmd` | AuthStart through Authenticated; existing setup nodes receive Recovery Code issuance integration |
| section-03-recovery-authorization | `recovery-code-authorization.mmd` | CodeSubmit through GrantIssued, including every replay and throttle branch |
| section-04-replacement-lifecycle | `replacement-passkey-completion.mmd` | GrantCheck through RecoveryProven, including rollback branches |
| section-05-recovery-guide | `recovery-diagnosis.mmd` | RecoveryStart through FactorRequired and TerminalNoBypass |
| section-06-journey-interface | All core diagrams | Every account-holder-facing input, decision explanation, error, receipt, and navigation transition |
| section-07-verification-submission | All core diagrams | Cross-diagram critical path and every terminal failure branch |

## Section Summaries

### section-01-persistence-invariants

Create migration 002 and transactional repositories for credential status, challenges, sessions, Recovery Codes, Recovery Transactions, Re-enrollment Grants, throttling, and notification records.

### section-02-passkey-authentication

Implement username-first passkey Authentication, strict assertion verification, Application Sessions, logout, and returning-user UI integration.

### section-03-recovery-authorization

Issue the initial one-time Recovery Code, start Recovery Transactions, verify and reserve codes, throttle attempts, and issue exactly one scoped grant.

### section-04-replacement-lifecycle

Register the replacement passkey and atomically consume authorization, revoke the lost credential, rotate the code, write notifications, and prove the new credential through normal sign-in.

### section-05-recovery-guide

Ground GPT-5.6 in a server-owned Recovery Action set, validate its structured response, prevent secret input, and keep a deterministic fallback available.

### section-06-journey-interface

Turn the current registration proof of concept into an accessible eight-stage judge-readable product journey while preserving the existing editorial design direction.

### section-07-verification-submission

Verify security and browser behavior on a fixed origin, capture non-sensitive evidence, and prepare the English README, demo video, and Devpost submission.

## Ecosystem Coverage

| System | Covering section | Status |
|---|---|---|
| Browser/platform authenticator | 02, 04, 06, 07 | Covered |
| Authidenty Next.js relying party | 01–07 | Covered |
| SQLite | 01, 03, 04, 07 | Covered |
| OpenAI Responses API | 05, 07 | Covered |
| HTTPS deployment or fixed localhost evidence origin | 07 | Covered |
| GitHub and Devpost | 07 | Covered |

No ecosystem entry is unassigned. Public deployment is optional only if the chosen environment cannot preserve SQLite state and the hackathon rules permit a verified local recording; that decision is owned by section 07.
