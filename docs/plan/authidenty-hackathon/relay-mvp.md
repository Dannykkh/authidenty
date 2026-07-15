# Private Identity Relay MVP

Status: Approved implementation baseline

Date: 2026-07-16

This document supersedes the product outcome in `plan.md` and `spec.md`. Those files remain as historical evidence for the original passkey-recovery direction.

## Product Statement

Authidenty lets a service or AI agent request proof from a previously enrolled account holder without collecting that person's phone number, legal name, or birth date again.

The relying service sends an opaque relay handle and a description of the action. GPT-5.6 turns the description into a typed, user-readable risk summary. Deterministic server policy chooses the required challenge. Authidenty privately routes that challenge to the enrolled device and returns a pseudonymous verification receipt after the factor succeeds.

## First Vertical Slice

The first running slice uses a simulated SMS adapter so the complete security boundary can be demonstrated without claiming real delivery.

```text
Relying service
  -> POST opaque relay handle + bounded action request
  -> GPT-5.6 classifies purpose and suggested risk, without PII
  -> server policy clamps the final risk and required factor
  -> identity vault resolves the encrypted phone only for delivery
  -> simulated SMS adapter records a masked destination and one-time challenge
  -> account holder submits the OTP outside GPT
  -> server atomically verifies the digest and issues a minimal receipt
  -> relying service receives receipt, not PII
```

## In Scope

- SQLite migration for encrypted contact destinations, relay requests, OTP challenge state, and verification receipts.
- AES-256-GCM field encryption using a server-only key supplied by environment configuration.
- Opaque, non-PII relay handles.
- GPT-5.6 Responses API with Zod Structured Outputs, `store: false`, no tools, bounded action input, and a hashed safety identifier.
- Deterministic risk policy that can elevate but never delegate authorization to GPT.
- Simulated notification outbox with masked destinations.
- OTP digests, expiry, attempt limit, single-use consumption, and generic public errors.
- A judge-readable request and approval interface.
- A pseudonymous receipt containing request purpose, final risk, factor used, issue time, expiry, and receipt ID.

## Deferred

- Real SMS provider integration and delivery claims.
- Passkey assertion approval for relay requests.
- Production relying-service authentication and key rotation.
- Public-key-signed receipts and third-party verification SDKs.
- Real-world identity proofing or civil-identity attributes.
- Conversation-style matching, embeddings, behavioral profiles, or 1:N account discovery.
- Raw birth-date storage. A later system should prefer derived claims such as `age_over_18` when that is all a relying service needs.

## API Contract

### `POST /api/relay/requests`

Input:

```json
{
  "relayHandle": "relay_demo_7Jm4...",
  "serviceName": "OpenClaw",
  "actionDescription": "Approve a transfer of 120 USD to the saved supplier.",
  "declaredRisk": "high"
}
```

Output:

```json
{
  "requestId": "req_...",
  "status": "challenge_sent",
  "summary": "OpenClaw wants approval for a saved-supplier transfer.",
  "finalRisk": "high",
  "factor": "sms_otp",
  "destination": "***-***-0184",
  "expiresAt": "2026-07-16T12:10:00.000Z"
}
```

The development response may include a clearly labeled `demoCode`. Production mode must never return it.

### `POST /api/relay/requests/{requestId}/verify`

Input:

```json
{
  "code": "123456"
}
```

Output:

```json
{
  "receiptId": "receipt_...",
  "subject": "subject_...",
  "purpose": "payment_approval",
  "risk": "high",
  "factor": "sms_otp",
  "verifiedAt": "2026-07-16T12:02:00.000Z",
  "expiresAt": "2026-07-16T12:07:00.000Z"
}
```

## Policy Rules

1. `finalRisk` is the maximum of relying-service declared risk, deterministic policy risk, and model-suggested risk.
2. Model failure, refusal, timeout, or invalid output defaults to `high` for this first slice.
3. GPT output is parsed through the server-owned Zod schema and never executed as a command.
4. The same generic response is used for unknown, disabled, and throttled relay handles where practical.
5. Request creation and verification are rate-limited by relay handle and client signal.
6. OTPs are random, stored only as keyed digests, expire quickly, permit limited attempts, and are consumed once.
7. PII never appears in model input, receipt data, public logs, or general repository types.
8. Only the notification adapter can request decryption of the contact destination.

## OpenAI Boundary

Official OpenAI guidance supports GPT-5.6 on the Responses API and recommends Structured Outputs with native Zod integration for schema adherence. The first slice follows that pattern and handles refusal or missing parsed output explicitly.

`store: false` disables API response storage for later retrieval. It is not presented as Zero Data Retention: default API abuse-monitoring logs may retain customer content for up to 30 days unless the organization has approved data controls. Consequently, action descriptions must exclude PII and secrets.

References:

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters)
- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)

## Delivery Gates

| Gate | Pass condition |
|---|---|
| R1: Design | ADR, domain terms, API contract, schema, and flow diagram agree |
| R2: Persistence | Migration and repository tests prove encryption metadata, expiry, attempt, and single-use invariants |
| R3: Policy | Model output cannot lower risk or trigger delivery directly |
| R4: Relay | Request creation and OTP verification pass route and service tests |
| R5: Experience | Desktop and mobile browser journeys show no raw contact data |
| R6: Evidence | Tests, lint, build, screenshots, secret scan, README, and limitations are current |

## Commit Sequence

1. `docs(architecture): pivot to a private identity relay`
2. `test(relay): specify vault and challenge invariants`
3. `feat(relay): persist private relay requests`
4. `feat(relay): classify agent approval intent`
5. `feat(api): expose private relay verification`
6. `feat(ui): demonstrate private device approval`
7. `docs: explain the private identity relay`
