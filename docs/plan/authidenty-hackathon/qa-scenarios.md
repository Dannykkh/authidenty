# QA Scenarios

Source: `operation-scenarios.md`, `spec.md`, `api-spec.md`, and sections 01–07.
Status: test contract before implementation.

## Test Conventions

- `Unit`: pure policy, mapping, or service behavior with injected dependencies.
- `Integration`: SQLite repository or Next.js route behavior with real state boundaries.
- `E2E`: rendered browser journey with WebAuthn virtual or real authenticator.
- `Manual`: visual, assistive-technology, model, or submission evidence requiring direct observation.
- Every state-changing route test uses the expected Origin/Host and JSON content type unless the case deliberately violates them.
- Public assertions use generic errors; internal typed reasons may be asserted below the route boundary.
- Test fixtures use disposable accounts and secret-marker values that must never appear in logs or snapshots.

## 1. Setup and Initial Recovery Code

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| SET-01 | Integration | Successful initial setup | Valid profile and verified attestation | 200; active public credential and one active code digest; plaintext code returned once; no session |
| SET-02 | Integration | Invalid profile | Invalid username or blank/long display name | 400 `INVALID_PROFILE`; no durable account-control state |
| SET-03 | Integration | Existing account conflict | Username already has a credential | 409 `ACCOUNT_REQUIRES_SIGN_IN`; no new challenge/credential/code |
| SET-04 | Integration | Ceremony replay or expiry | Verify same or expired registration challenge | 400 generic verification/session error; no duplicate state |
| SET-05 | Integration | Wrong WebAuthn boundary | Wrong Origin/RP ID or missing user verification | Verification rejected; no credential/code |

## 2. Passkey Authentication and Application Session

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| AUTH-01 | Integration | Successful returning sign-in | Active credential, correct challenge/RP/origin, user verified | 200; challenge consumed; metadata updated; opaque Application Session cookie issued |
| AUTH-02 | Unit | Multi-device counter handling | Verified backed-up credential with allowed zero/non-incrementing behavior | Service follows verified SimpleWebAuthn result without false revocation |
| AUTH-03 | Unit | Credential-account binding | Credential exists for another expected user | Typed authentication failure; no update/session |
| AUTH-04 | Integration | Unknown account | Options request for absent username | Normalized public failure; no account metadata leak |
| AUTH-05 | Integration | Revoked/unknown credential | Assertion for revoked or absent ID | Generic 401; no session; credential state unchanged |
| AUTH-06 | Integration | Challenge replay/expiry | Submit consumed or expired assertion ceremony | Rejected; no metadata/session; new options required |
| AUTH-07 | Integration | HTTP boundary | Wrong Origin/Host/content type | Rejected before assertion body processing |

## 3. Recovery Guide and GPT-5.6 Boundary

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| GUIDE-01 | Unit | Complete policy set | Device lost, no alternate passkey, code configured | Policy includes only `verify_recovery_code` and non-authorizing facts |
| GUIDE-02 | Unit | Avoid recovery | Another passkey permitted | `use_another_passkey` is preferred before Recovery Code use |
| GUIDE-03 | Unit | Terminal policy | No usable passkey or Recovery Code | `self_service_unavailable`; no replacement action |
| GUIDE-04 | Unit | Model action injection | Model returns unauthorized action or identity approval | Action/claim rejected; server set cannot expand |
| GUIDE-05 | Integration | Valid live model output | Schema-valid subset from injected adapter | 200 `source: gpt-5.6`; boundary present; no security-state mutations |
| GUIDE-06 | Integration | Model failure fallback | Missing key, timeout, refusal, malformed/empty output | 200 `deterministic-fallback`; exact safe actions remain usable |
| GUIDE-07 | Integration | Secret-like chat input | Recovery-code/token-shaped message | No model call and no echo/log; redirect to Security Authorization |

## 4. Recovery Code Authorization

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| CODE-01 | Unit | Code normalization/digest | Equivalent formatted valid code | Same versioned keyed digest; plaintext not persisted |
| CODE-02 | Unit | Throttle calculation | Repeated failed attempts and injected clock | Bounded retry window; deterministic release after window |
| CODE-03 | Integration | Successful authorization | Active code and valid Recovery Transaction | Code becomes reserved; transaction authorized; exactly one active grant/cookie; no Application Session |
| CODE-04 | Integration | Wrong/malformed/redeemed code | Invalid candidate | Generic 400; attempt state updated; no grant or factor detail |
| CODE-05 | Integration | Concurrent reservation | Two submissions for same valid code | Exactly one 200 and at most one active grant; loser rolls back |
| CODE-06 | Integration | Cross-account binding | User A transaction with user B code | Generic rejection; no rows change |
| CODE-07 | Integration | Expired transaction | Correct code after transaction expiry | 401; code remains or returns active per release policy; no grant |
| CODE-08 | Integration | Throttled request | Candidate during active throttle window | 429 with bounded retry time; no digest comparison/model call |

## 5. Replacement Passkey and Credential Lifecycle

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| REPL-01 | Unit | Grant validation | Active user/transaction/purpose-bound grant | Replacement options may be generated for bound user only |
| REPL-02 | Unit | Lost credential selection | Disposable account with exactly one previous active credential | Sole prior credential bound after authorization; zero/multiple produces unsupported state |
| REPL-03 | Integration | Replacement options | Valid grant cookie | Existing credential IDs excluded; reenrollment challenge stored |
| REPL-04 | Integration | Invalid grant states | Missing, expired, consumed, cross-user, or wrong-purpose grant | Generic 401; no challenge or account metadata |
| REPL-05 | Integration | Failed attestation | Bad challenge/origin/RP/user verification | 400; no credential/revocation/code/notification change; ceremony consumed |
| REPL-06 | Integration | Successful atomic completion | Valid attestation and current grant/transaction/code | Replacement active, grant consumed, transaction completed, old credential revoked, code rotated, notifications written |
| REPL-07 | Integration | Mid-transaction fault | Inject conflict/notification failure | Full rollback; no partial lifecycle state |
| REPL-08 | Integration | Completion replay | Re-submit successful ceremony/grant | Rejected; no second credential or code rotation |
| REPL-09 | Integration | Normal proof after recovery | Authenticate new then old credential | New issues session; old returns generic 401 |

## 6. Application Session and Logout

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| SESS-01 | Integration | Resolve valid session | Matching digest before expiry/revocation | Authenticated account summary returned; token never returned |
| SESS-02 | Integration | Expired/forged session | Unknown or expired cookie token | Unauthenticated response; cookie cleared where appropriate |
| SESS-03 | Integration | Idempotent logout | Logout twice | Both safe; server record revoked once; browser cookie cleared |

## 7. Frontend, Accessibility, and Privacy

| ID | Scope | Scenario | Input/action | Expected result |
|---|---|---|---|---|
| UI-01 | E2E | Eight-stage navigation | Complete setup, sign-in, diagnosis, authorization, replacement, receipt, proof | One active stage; browser back/reload cannot invent security state |
| UI-02 | E2E | Keyboard operation | Complete all public actions without pointer | Logical order, visible focus, reachable 44px targets, associated errors |
| UI-03 | E2E | Narrow viewport | Run journey at 320–375px | No horizontal overflow; security state precedes primary action |
| UI-04 | E2E | Reduced motion | Enable `prefers-reduced-motion` | No required animation; all state changes remain perceivable |
| UI-05 | Manual | Agent/security distinction | Inspect live and fallback screens without relying on color | Guidance and Security Authorization have text/structure labels and separate controls |
| UI-06 | Manual | Fonts and native controls | Inspect loaded faces, autofill, select/options, contrast | Intended Newsreader/Geist faces load; controls and text remain legible |

## 8. End-to-End Business Scenarios

| ID | Scope | Scenario | Preconditions/action | Expected result |
|---|---|---|---|---|
| E2E-01 | E2E | First setup and normal return | New account → save code → sign in → logout | Ordinary passkey path works with no recovery transaction |
| E2E-02 | E2E | Critical lost-device recovery | Existing disposable account → guide → code → replacement → sign in | Full journey completes without DB edits/admin shortcut; old credential rejected |
| E2E-03 | E2E | Model-disabled recovery | Repeat critical path with model unavailable | Labeled fallback; deterministic authorization/replacement still succeeds |
| E2E-04 | E2E | No self-service factor | No alternate passkey or code | Honest terminal result; no session/grant/credential mutation |
| E2E-05 | E2E | Abandoned replacement | Authorize, fail/leave WebAuthn, wait for expiry | Original credential unchanged; reservation releases; no stranded permanent consume |

## 9. Frontend-to-Backend Contract Matrix

| UI action | API sequence | Client assertion | Server/security assertion |
|---|---|---|---|
| Create first passkey | register options → verify | WebAuthn prompt and one-time code state | Challenge exact-once; public credential plus digest only |
| Sign in | authenticate options → verify | Generic failure mapping and signed-in receipt | Active account-bound credential; Application Session only on verified assertion |
| Start diagnosis | recovery start → agent/status | Shows only returned actions and source | Client cannot submit factor facts/action set; no auth state mutation |
| Verify Recovery Code | code verify | Secret entered in separate panel; grant expiry shown | Throttle, keyed digest, atomic reservation, no Application Session |
| Replace passkey | reenroll options → verify | Grant-bound prompt and one-time completion receipt | Atomic credential/code/grant/notification lifecycle |
| Prove replacement | authenticate options → verify | Normal sign-in state | New credential accepted; revoked one rejected |
| Logout | session logout | Return to sign-in | Session revoked and cookie cleared idempotently |

## 10. Security and Evidence Checks

These checks may create multiple automated assertions from one scenario row:

- Capture application logs while sending unique Recovery Code, cookie, token, prompt, and API-key markers; no marker may appear.
- Inspect SQLite schema/rows for plaintext secret, conversation, document, biometric, or private-key storage.
- Search the worktree and public Git history before push for `.env` values, code fixtures, bearer tokens, private keys, and screenshots containing secrets.
- Verify `Cache-Control: no-store` on all APIs and `Pragma: no-cache` on one-time code responses.
- Verify cookie names, paths, expiry, `HttpOnly`, `SameSite=Strict`, and environment-appropriate `Secure` are distinct by purpose.
- Run a fixed 8–12-case model evaluation at low and medium reasoning; record schema success, action coverage, forbidden claims, fallback success, and p50/p95 latency.
- Verify the final README and video do not claim civil-identity proof, biometric storage, LLM authentication, NIST certification, AAL2 compliance, or an `ultra` API model.

## 11. Required Commands and Completion Gate

```text
npm run lint
npm test
npm run build
```

The final gate also requires the critical browser journey on the fixed evidence origin, one live GPT-5.6 proof or explicit limitation, model-disabled fallback proof, mobile/keyboard/reduced-motion observation, secret/history review, and a final video no longer than three minutes.

## Summary

| Category | Scenario count |
|---|---:|
| Unit/service contract | 10 |
| Repository/route integration | 29 |
| Browser E2E | 9 |
| Manual visual/evidence | 2 |
| **Total** | **50** |

Of the 50 scenarios, 18 are happy-path or conformance checks and 32 are error, replay, expiry, privacy, accessibility, or adversarial cases. A scenario row may map to several test cases, but no row may be omitted without recording an explicit cut and residual risk.
