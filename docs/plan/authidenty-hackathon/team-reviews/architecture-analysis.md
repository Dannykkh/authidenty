# Architecture Analysis

## Architecture Fit

The existing layered Next.js monolith is the correct hackathon architecture. Add services and repositories within current boundaries rather than introducing microservices, a second backend, queues, Redis, or an identity-provider framework. SQLite immediate transactions are sufficient for the required one-time state on a single deployment instance.

## Critical Findings

1. **Separate every trust state.** Authentication ceremony, Application Session, Recovery Transaction, Recovery Factor verification, and Re-enrollment Grant require different typed records and cookies. A generic session cookie would create privilege confusion.
2. **Bind every recovery object to one Account Holder.** The Recovery Transaction, Recovery Code digest, and Re-enrollment Grant must carry an internal user ID. Public routes must not trust a username repeated by the browser after authorization.
3. **Make one-time transitions transactional.** Recovery Code redemption and grant consumption need immediate database transactions that atomically check state, update state, and return the authorized result. Check-then-delete in separate calls is unsafe under concurrent requests.
4. **Do not relax normal registration.** Keep the existing conflict rejection. Implement replacement enrollment through dedicated service/routes that require a valid Re-enrollment Grant; do not add `skipConflictCheck` or accept a model-supplied flag.
5. **Verify credential status and ownership before WebAuthn assertion verification.** Look up by credential ID, require `active`, bind it to the expected account, verify RP/origin/user verification, then update counter and `last_used_at` according to the library result.
6. **Revoke only after replacement verification succeeds.** Credential creation, grant consumption, reported-credential revocation, Recovery Code rotation, and notification creation should form one database transaction after WebAuthn verification.
7. **Add migration 002.** Do not rewrite the historical initial migration. Add status columns/tables for Application Sessions, Recovery Codes, Recovery Transactions, Re-enrollment Grants, verification attempts, and notification/audit outbox.
8. **Keep GPT on a read-only adapter.** The recovery model receives a policy projection and returns a validated explanation. It has no repository access or function tools and cannot produce an authorization identifier.

## Important Findings

1. Use opaque, random, database-backed Application Session tokens stored as digests rather than putting account claims in a client-readable cookie. Keep expiry short for the prototype.
2. Use a versioned keyed digest for Recovery Codes so code verification does not require storing plaintext. Record the digest version to allow rotation of the pepper strategy.
3. Add separate throttling state for authentication, GPT guidance, and Recovery Code verification. A local DB-backed limiter is acceptable for the prototype; document the single-instance constraint.
4. Normalize public responses for unknown account, unknown credential, revoked credential, and invalid Recovery Code. Internal logs may retain stable event codes but no secrets or conversation text.
5. Keep model fallback in the application service, not the browser. Routes should return the same validated response schema whether generated or deterministic.
6. Make recovery notification an outbox/event record for the demo. Do not add email delivery before the critical journey works.
7. Decide counter behavior from SimpleWebAuthn's installed verification output and WebAuthn backup state; do not invent clone detection for multi-device credentials.
8. Freeze the HTTPS hostname and environment before final WebAuthn browser tests. RP ID/origin must be explicit in deployment configuration.

## Performance and Scale

- The latency-sensitive path is the GPT call, not SQLite. Keep low reasoning effort, one request, no tools, a 20-second timeout, and deterministic fallback.
- WebAuthn and recovery-state queries require indexes on token/code digests, user ID, credential ID/status, and expiry.
- Production multi-instance rate limiting and distributed transaction behavior are outside the MVP; document them rather than adding infrastructure.

## Test and Migration Strategy

- Build repository primitives first and test concurrent or repeated consume behavior.
- Inject clock, verifier, token generator, digest verifier, and model dependencies into services.
- Add route tests for cookie name/path/expiry separation and generic public errors.
- Complete one virtual-authenticator browser flow without manual DB edits.
- Provide a down migration for schema additions and a demo-data reset command only if it cannot operate in production accidentally.

## Nice-to-Have Findings

1. Extract a shared ceremony helper only after authentication and re-enrollment reveal real duplication.
2. Add credential labels and multi-credential management after the replacement flow is complete.
3. Record model latency and fallback reason in non-sensitive diagnostics for submission evidence.

## Dictionary Updates

| Action | Term | Proposed definition | Rationale |
|---|---|---|---|
| ADD | Ceremony State | Short-lived challenge state for one WebAuthn registration or authentication ceremony | Prevents it from being called an Application Session |
| REFINE | Application Session | Opaque, server-validated state created only after successful Authentication | Clarifies implementation and excludes recovery authorization |
| REFINE | Re-enrollment Grant | Opaque, account-bound, purpose-bound, expiring, one-time authorization for one replacement ceremony | Adds required technical bindings |
