# Authidenty: You Know Me? Demo Script

## Export

- Video: `.termsnap/submission/Authidenty-You-Know-Me-OpenAI-Build-Week.mp4`
- Captions: `.termsnap/submission/Authidenty-You-Know-Me-English.srt`
- Thumbnail: `.termsnap/submission/Authidenty-You-Know-Me-Thumbnail.png`
- Duration: 1 minute 31 seconds
- Format: 1920×1080 H.264 video, AAC stereo audio
- Language: English
- Narration: Typecast Sean, `ssfm-v30`, `toneup 0.45`
- Public video: pending new YouTube upload
- Superseded video: `https://youtu.be/3Z1c9QdQEPA`

## Timeline

| Time | Visual | Narration purpose |
| --- | --- | --- |
| 00:00–00:12 | `You know how I answer` hook | Explain repeated identity-data entry |
| 00:12–00:21 | Information boundary | Introduce conversational continuity and device proof |
| 00:21–01:12 | Visible live browser walkthrough | Enroll answers, answer different questions, reveal `Danny Kim` and masked phone, verify OTP |
| 01:12–01:19 | Security boundary | Separate candidate selection from final authentication |
| 01:19–01:27 | Built with Codex | Show tests, implementation scope, and live API statuses |
| 01:27–01:31 | Closing | Ask whether recognition can replace repeated identity entry |

## Narration

Most identity checks ask you to repeat the same facts: your name, your phone number, your birthday, and sometimes an identity document. That is secure only if every new copy stays secure.

Authidenty explores another signal. Instead of asking who you are, it asks how you answer. The working title is You Know Me?

In this live demo, I enroll Danny Kim with a reserved fictional phone number and answer three questions. Authidenty immediately converts the answers into a small numerical style profile. The raw answer sentences are not stored.

Now I return without typing a name or phone number. Authidenty asks three different questions. The answers keep the same concise, lowercase, reason-first pattern.

GPT-5.6 Sol receives only the enrolled and returning numerical vectors, plus a hashed safety identifier. It returns a structured similarity score and a short explanation. It never receives Danny's name, phone number, raw answers, or one-time code.

The pattern match selects Danny Kim and reveals only the masked enrolled route. Then a six-digit code proves control of that device. The model did not complete authentication. Pattern selects; device code verifies.

Codex built this project end to end: product reasoning, threat boundaries, SQLite migrations, test-first security behavior, GPT-5.6 integration, the Next.js interface, and the recorded browser verification.

Authidenty asks a simple question: if the system recognizes how you answer, can you stop repeating who you are?

## YouTube

Suggested title:

> Authidenty: You Know Me? — GPT-5.6 Conversational Login Demo | OpenAI Build Week

Suggested description:

> Authidenty asks different questions and recognizes the way an enrolled person answers. GPT-5.6 Sol compares only derived numerical style vectors, then a one-time code sent to the enrolled device completes verification.
>
> The live demo enrolls Danny Kim with reserved fictional data, asks three different return questions, reveals the matched name and masked phone, and verifies a simulated device code.
>
> Built with Codex for OpenAI Build Week in the Apps for Your Life category.
>
> Source: https://github.com/Dannykkh/authidenty
>
> Security boundary: conversational similarity selects a candidate; it is not the final authenticator. The SMS delivery is simulated, and this prototype does not claim civil-identity proofing.

Upload settings:

- Visibility: Public
- Audience: Not made for kids
- License: Standard YouTube License
- Music: None
- Captions: upload `Authidenty-You-Know-Me-English.srt`
