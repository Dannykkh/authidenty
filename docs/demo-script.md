# Authidenty Build Week Demo Script

## Export

- File: `.termsnap/submission/Authidenty-OpenAI-Build-Week.mp4`
- Duration: 1 minute 52 seconds
- Format: 1920×1080, H.264 video, AAC audio
- Language: English
- Public upload target: YouTube
- Public video: `https://youtu.be/xtjQFG0Oq2o`
- Thumbnail: `.termsnap/submission/Authidenty-YouTube-Thumbnail.png`

## Timeline

| Time | Visual | Narration purpose |
| --- | --- | --- |
| 00:00–00:12 | Product hook | Explain repeated identity-data collection |
| 00:12–00:24 | Information boundary | Introduce the private identity relay |
| 00:24–01:00 | Live browser walkthrough | Create route, classify with GPT-5.6, verify device control |
| 01:00–01:20 | Security boundary | Separate model explanation from deterministic authorization |
| 01:20–01:42 | Built with Codex | Explain Codex's product, engineering, and verification contribution |
| 01:42–01:52 | Closing receipt | Restate the product principle and repository URL |

## Narration

Every time an AI service needs human approval, it often asks for the same personal data again: a phone number, a legal name, a birth date, or even an identity document.

Authidenty changes who learns that information. It is a private identity relay. The service sends an opaque handle and a description of the action. It never receives the enrolled phone number.

In this live demo, I create a private route using a reserved fictional number. Authidenty encrypts the destination with AES-256-GCM and returns only a masked route.

Next, OpenClaw asks the person to approve a transfer to a saved supplier. GPT-5.6 receives only the service name and action text. It produces a structured, human-readable summary and a risk suggestion. It never sees the phone number, the one-time code, or the encrypted vault.

Server policy sets the final risk and privately routes a simulated device challenge. When the six-digit code is verified, deterministic server code issues a short-lived pseudonymous receipt. The model did not authenticate the person or authorize the action.

Codex was the implementation partner throughout the project. It challenged the original conversational-authentication idea, researched the security boundary, designed the SQLite schema, wrote security-sensitive behavior test first, built the Next.js interface, and verified the complete browser journey.

Authidenty follows one simple principle: approve the action, not your identity.

## YouTube

Suggested title:

> Authidenty — Private Human Approval Without Repeated Identity Exposure | OpenAI Build Week

Suggested description:

> Authidenty is a private identity relay for AI services. GPT-5.6 classifies a bounded action without receiving personal identity data, while deterministic server code verifies the enrolled device and issues a minimal pseudonymous receipt.
>
> Built with Codex for OpenAI Build Week in the Apps for Your Life category.
>
> Source: https://github.com/Dannykkh/authidenty
>
> The recorded challenge delivery is explicitly simulated. No real SMS provider or civil-identity proofing is claimed.

Upload settings:

- Visibility: Public
- Audience: Not made for kids
- License: Standard YouTube License
- Music: None
- Captions: English auto-captions may be reviewed after upload
