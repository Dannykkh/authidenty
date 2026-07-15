# Competitor and Product-Pattern Research

Research date: 2026-07-15

Scope: official product and support documentation for Apple, Google, Microsoft, and GitHub. These are product-pattern references, not claims that Authidenty matches their security assurance.

## Executive Findings

1. Mature products try another already-bound factor before starting account recovery.
2. Synced passkeys and multiple device-bound credentials reduce catastrophic loss; products expose credential management and removal after device loss.
3. Recovery is intentionally stricter and sometimes slower than routine sign-in. Google documents a multi-day delay when no other second step remains, while GitHub accepts permanent loss when all configured recovery methods are gone.
4. Recovery codes and recovery contacts are established patterns. None of the reviewed products use conversational writing style as the decisive proof of account ownership.
5. Authidenty can differentiate through failure diagnosis and privacy-preserving orchestration, not through weakening the authorization ceremony.

## Product Patterns

### Apple

Apple supports a 28-character recovery key used with other trusted account context and an invited recovery contact who can generate a recovery code. Its platform-security documentation separates recovery-contact information so neither Apple nor the contact alone holds everything necessary to recover protected data.

Relevant patterns:

- Recovery methods are configured before loss.
- A trusted person can assist without receiving routine access to the account.
- Recovery is a separate ceremony with explicit cryptographic and account checks.
- The product warns that choosing a recovery key disables the ordinary recovery process, making the responsibility tradeoff visible.

Sources:

- [Apple: Set up a recovery key for your Apple Account](https://support.apple.com/en-ie/109345)
- [Apple Platform Security: Account recovery contact security](https://support.apple.com/en-gb/guide/security/secafa525057/web)

### Google

Google keeps existing authentication and recovery factors when a passkey is added. Users can choose another sign-in method, use another registered second step, remove a lost passkey, and register a replacement. When no alternate factor remains, Google may delay recovery for several business days.

Relevant patterns:

- Passkeys augment an account's recovery readiness rather than silently deleting older recovery options.
- “Try another way” is a prominent escape hatch from a failed passkey prompt.
- A lost credential is removed after access is regained through another method.
- Suspicious or newly created passkeys can be delayed, disabled, and surfaced through notifications.

Sources:

- [Google: Sign in with a passkey instead of a password](https://support.google.com/accounts/answer/13548313?hl=en)
- [Google: Sign in if you have lost your security key](https://support.google.com/android/answer/9153624)

### Microsoft

Microsoft's troubleshooting guide maps concrete passkey failures to concrete actions: timeouts, credential-manager mismatches, invalidated passkeys, work/personal profile confusion, and another-device authentication. It recommends creating a replacement before deleting old credentials when the old credential remains usable.

Relevant patterns:

- Failure-specific explanations are valuable because users cannot infer the cause from a generic WebAuthn error.
- Synced credential managers and cross-device authentication are normal paths, not account recovery.
- Credential replacement has an order: establish a working replacement, then remove obsolete credentials.

Sources:

- [Microsoft: Troubleshoot signing in with a passkey](https://support.microsoft.com/en-US/accounts-billing/security/troubleshoot-signing-in-with-a-passkey)
- [Microsoft: Create and save a passkey](https://support.microsoft.com/en-us/windows/synchronize-passkeys-to-your-microsoft-account-be9de83c-6803-4ccc-81f2-e1fcc2fb8110)

### GitHub

GitHub permits recovery through a passkey, security key, recovery code, verified device, or other previously configured methods. Its documentation explicitly warns that support cannot restore a 2FA-protected account when every recovery method has been lost. It also labels passkeys as synced or device-bound and recommends at least two credentials for device-bound use.

Relevant patterns:

- Recovery strength comes from preconfigured independent methods.
- Credential backup state should be visible to the user.
- Some unrecoverable states are safer than a support override.
- Recovery codes are part of a larger set of recovery options, not a conversational identity test.

Sources:

- [GitHub: Recovering your account if you lose your 2FA credentials](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/recovering-your-account-if-you-lose-your-2fa-credentials)
- [GitHub: Managing your passkeys](https://docs.github.com/en/authentication/authenticating-with-a-passkey/managing-your-passkeys)

## Comparison

| Pattern | Apple | Google | Microsoft | GitHub | Authidenty decision |
|---|---|---|---|---|---|
| Synced passkey support | Yes, through iCloud Keychain | Yes, through platform credential managers | Yes, through supported credential managers | Provider-dependent and visibly labeled | Observe backup state; explain provider responsibility |
| Multiple authenticators | Trusted devices and recovery methods | Alternate second steps and passkeys | Alternate passkeys and devices | Multiple passkeys/security keys | Support more than one passkey after sign-in |
| Offline recovery secret | Recovery key | Backup codes in related recovery flows | Recovery options vary by account | Recovery codes | One-time hashed recovery code for prototype |
| Trusted-contact recovery | Recovery contacts | Not a highlighted passkey path in reviewed docs | Not a highlighted passkey path in reviewed docs | No support override | Post-MVP only |
| Delay or strict failure | Strong checks and explicit responsibility | Multi-day delay can apply | Sign-in helper and alternate methods | Permanent loss if all methods are gone | Safe refusal and support explanation; no model bypass |
| LLM diagnosis | No | No | No | No | Core differentiation: bounded, adaptive explanation |

## Differentiation Opportunity

The reviewed products provide secure factors but distribute troubleshooting across generic help pages and account settings. Authidenty can demonstrate a coherent recovery planner that:

1. receives a real WebAuthn failure category and minimal account-recovery state;
2. distinguishes normal authentication with another passkey from true account recovery;
3. explains exactly why a path is or is not available;
4. reveals no recovery secret to the model;
5. sends the user to a deterministic server-owned ceremony;
6. completes replacement enrollment and clearly shows credential revocation and notification.

The strongest user-facing concept is a visible two-column boundary:

- **Agent diagnosis:** probable cause and understandable next step.
- **Security authorization:** factor verified, grant expiry, credential change, and notification status.

This makes GPT-5.6 material to the experience without pretending it is a new biometric or replacing WebAuthn.

## Patterns to Avoid

- Do not call a synced passkey on another device “AI recovery”; it is normal authentication.
- Do not promise universal recovery. A safe product must allow a terminal state when no configured factor remains.
- Do not let support, email access, or conversational similarity silently override the credential policy.
- Do not delete a still-usable credential before a replacement is established unless the user explicitly reports it lost or stolen.
- Do not hide recovery-code responsibility; show it once, require acknowledgment, and explain that losing every factor may make the account unrecoverable.
