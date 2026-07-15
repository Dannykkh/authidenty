# Design System: Authidenty Hackathon

This planning document preserves the visual language already implemented in `src/app/globals.css` and extends it across the complete recovery journey.

## Design Vision

An editorial security interface: calm enough for a distressed user, precise enough for a security reviewer, and visually explicit about the boundary between AI explanation and cryptographic authorization.

### Anti-Patterns

- No blue-purple gradient, generic centered hero, uniform rounded-card grid, glassmorphism, or vague trust claims.
- No green shield icon used as proof of security.
- No hidden state changes; show whether the agent is explaining, a factor is verified, a grant is active, or a credential was revoked.
- No dense dashboard for a one-path consumer flow.

## Design Tokens

### Colors

| Token | Value | Use |
|---|---|---|
| `--paper` | `oklch(0.965 0.014 83)` | Warm page and surface background |
| `--ink` | `oklch(0.19 0.018 67)` | Primary type, border, and action fill |
| `--signal` | `oklch(0.62 0.22 34)` | Failure, attention, active state, and brand mark |
| `--muted-line` | `oklch(0.19 0.018 67 / 0.15)` | Grid, dividers, and secondary borders |
| `--safe-state` | `oklch(0.52 0.12 155)` (proposed) | Verified deterministic security state only |

Do not use the safe-state color for model output. GPT guidance remains signal-colored or neutral until deterministic verification succeeds.

### Typography

| Role | Font | Typical size/weight |
|---|---|---|
| Display | Newsreader, loaded through `next/font` | `clamp(3rem, 8vw, 8rem)`, 500 |
| UI/body | Geist, loaded through `next/font` | 14–18px, 400–600 |
| State labels | Geist Mono, loaded through `next/font` | 10–12px, uppercase tracking |

### Shape and Spacing

- Controls and panels use square or nearly square corners; do not introduce a rounded-card system.
- Primary rhythm: 4, 8, 16, 24, 32, 48, and 80px.
- Use one-pixel borders and a visible grid instead of drop-shadow depth.
- Touch targets are at least 44px high.

## Layout

- Desktop: asymmetric editorial grid with narrative or state timeline on the left and active ceremony panel on the right.
- Mobile: one linear journey; security state precedes the primary action and never depends on a side-by-side comparison.
- Keep the main container at the existing `90rem` maximum.
- Component responsiveness uses container queries; page-wide changes may use media queries.

## State Presentation

| State | Visual treatment |
|---|---|
| Agent diagnosis | Red-orange signal rule, tentative language, “Guidance” label |
| Factor required | Neutral ink border, exact factor name, secret-handling warning |
| Factor verified | Safe-state indicator and server-verification label |
| Grant active | Monospace expiry and one-purpose description |
| Credential revoked | Struck identifier suffix or status badge, never the full credential ID |
| Terminal/unrecoverable | Direct neutral copy with support/policy action; no false reassurance |

## Component Guidelines

- **Flow rail:** shows Register, Sign in, Diagnose, Verify, Replace, Complete; only one active stage.
- **Passkey ceremony panel:** reuses the current form density and WebAuthn status mapping.
- **Recovery guide:** retains bounded chat but places allowed actions in server-owned buttons outside message text.
- **Security authorization panel:** separate bordered region showing factor and grant state; it must not look like an AI message.
- **Recovery-code reveal:** one-time display with copy/download action, acknowledgment, and a no-screenshot/no-cloud-note warning without blocking the prototype.
- **Credential receipt:** shows masked credential, backup state, creation time, and active/revoked status.

## Motion and Accessibility

- Keep the single 700ms reveal orchestration; subsequent state changes use short opacity/transform transitions only.
- Respect `prefers-reduced-motion`; security state must remain understandable with all animation disabled.
- Preserve keyboard order, visible focus, semantic fieldsets, `aria-live` for async status, and programmatic error association.
- Do not rely on color alone for agent versus authorization states.

## Implementation Notes

- Map all values to CSS custom properties and Tailwind theme aliases.
- Preserve `color-scheme`, explicit form control colors, container queries, `:has()` enhancement, and View Transitions progressive enhancement.
- Verify the loaded Newsreader and Geist faces in the rendered browser before recording.
