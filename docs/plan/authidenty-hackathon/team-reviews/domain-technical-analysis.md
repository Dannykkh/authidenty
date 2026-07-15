# Domain Technical Analysis

Execution note: bounded background synthesis exceeded the planning time box, so the main context completed the technical analysis from the approved inputs without fresh research.

## Required Technologies and Standards

| Feature area | Technology/standard | Purpose |
|---|---|---|
| Registration and Re-enrollment | WebAuthn Level 3, SimpleWebAuthn server/browser | Strict public-key credential creation and verification |
| Authentication | WebAuthn assertion ceremony, SimpleWebAuthn | Phishing-resistant proof of an active credential |
| Credential backup metadata | WebAuthn backup eligibility/state through library output | Explain synced/device-bound resilience without claiming RP backup |
| Recovery Code | NIST-inspired saved-code controls | Entropy, digest storage, throttling, one-time use, replacement, notification |
| Application Session | Opaque random token in HttpOnly cookie plus server digest | Server-controlled signed-in state |
| Recovery and grants | SQLite immediate transactions and unique constraints | Atomic redemption, account binding, expiry, replay prevention |
| Recovery Guide | OpenAI Responses API, GPT-5.6 Sol alias, Structured Outputs | Bounded explanation and action labeling |
| Validation | Zod at route and model boundaries | Reject malformed or unapproved state |
| Testing | Vitest and virtual WebAuthn authenticator | Deterministic security and browser verification |
| Deployment | HTTPS with fixed RP ID/origin and persistent SQLite-compatible runtime | WebAuthn correctness and state durability |

## External Integrations

| Target | Protocol/API | Purpose | Library |
|---|---|---|---|
| Browser authenticator | WebAuthn | Credential creation/assertion | `@simplewebauthn/browser` |
| Server verifier | WebAuthn | Options and response verification | `@simplewebauthn/server` |
| OpenAI | Responses API | Recovery Guide response | `openai` with `zodTextFormat` |
| Persistent local store | SQLite | Credentials, state, throttling, outbox | `better-sqlite3` |

## Data and State Requirements

- Use binary public key storage and opaque random IDs/tokens.
- Store token and Recovery Code digests, never plaintext values.
- Store timestamps as integer epoch consistently with the current schema.
- Use constrained status values for credential, Recovery Transaction, code, grant, session, and notification state.
- Preserve latest credential counter, device type, backup state, transports, creation, last use, revocation time, and masked display label where needed.
- Persist no Recovery Guide conversation text.

## Security and Privacy Requirements

| Control | MVP requirement | Residual/production note |
|---|---|---|
| RP binding | Exact configured origin and RP ID | Freeze final hostname before recording |
| User verification | Required for registration/authentication/re-enrollment | Platform behavior varies and requires browser tests |
| Recovery secret | High entropy, versioned keyed digest, one-time display/use | Pepper/key rotation requires production secret management |
| Throttling | DB-backed account-plus-client attempts | Distributed rate limiting deferred |
| Cookie isolation | Separate names, paths, expiries, HttpOnly/Secure/SameSite | Validate on final host |
| Model isolation | No tools, no secrets, allowed-action projection, server validation | Structured shape does not guarantee semantic truth |
| Minimal data | Public credentials and minimal account-control state only | No identity-proofing claim |
| Audit/notification | Minimal outbox record after recovery | Delivery integration deferred and must not be claimed |

## Prototype Service Targets

| Operation | Target | Failure policy |
|---|---|---|
| Local options/repository route | Under 500ms on demo host | Generic error and retry |
| WebAuthn ceremony | Browser/user dependent, 120-second prompt timeout | Normalize cancel/timeout into diagnostic codes |
| Recovery Guide | Aim under 8 seconds; hard client-visible timeout below existing 20-second SDK timeout | Deterministic fallback with same allowed paths |
| Recovery Code verification | Under 1 second excluding intentional throttle | Generic rejection and attempt accounting |
| Re-enrollment Grant lifetime | 5–10 minutes, chosen once in implementation | Expiry requires a new authorized recovery path |
| Application Session lifetime | Short demo-safe lifetime, such as 30 minutes | Rotate/clear on sign-out and recovery policy events |

## Existing Solutions to Reuse

| Area | Existing solution | Use |
|---|---|---|
| Challenge persistence | `storeChallenge` / `consumeChallenge` immediate transaction | Extend for authentication ceremony |
| RP configuration | `resolveRelyingParty` | Reuse on all WebAuthn routes |
| Verification injection | Registration verifier dependency | Mirror for authentication and re-enrollment tests |
| Model boundary | `RecoveryModel` plus Zod parsed output | Add policy projection/fallback without tools |
| UI language | Failure codes and Recovery Actions | Bind them to real routes and states |

## Prioritized Missing Technical Items

| Priority | Item | Decision |
|---|---|---|
| Required | Migration 002 with transactional recovery/session tables and credential status | Implement first |
| Required | Credential lookup/status/counter update primitives | Implement before authentication service |
| Required | Opaque server-backed Application Session | Implement with authentication verify route |
| Required | Recovery Code digest and attempt throttle | Implement before Recovery Guide actions become executable |
| Required | Account/purpose-bound Re-enrollment Grant | Implement before replacement routes |
| Required | Model deterministic fallback and server action intersection | Implement before E2E test |
| Required | Persistent deployment validation | Decide before final browser run |
| Recommended | Pending recovery retry/resume policy | Document production gap; add only if grant-expiry UX blocks demo |
| Optional | Email delivery, external rate limiter, multi-device management | Post-MVP |

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Ceremony State | Short-lived, one-time challenge state for a WebAuthn ceremony | Separates challenge state from Application Session |
| ADD | Recovery Attempt Throttle | Server state limiting Recovery Factor verification attempts | Names a required security control |
| ADD | Recovery Notification | Minimal account-control alert event; recorded is distinct from delivered | Prevents implementation and submission overclaiming |
| REFINE | Re-enrollment Grant | Opaque, account-bound, purpose-bound, expiring, one-time authorization for one replacement ceremony | Captures technical contract |
