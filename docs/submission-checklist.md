# OpenAI Build Week Submission Checklist

Deadline: July 22, 2026 at 09:00 KST

## Eligibility and Registration

- [x] Devpost account created
- [x] OpenAI Build Week joined
- [x] Devpost project created
- [ ] Entrant confirms legal-age and official-rule eligibility
- [ ] Codex credit request resubmitted with matching Devpost email, if still desired

## Project

- [x] Category uses the official name `Apps for Your Life`
- [x] Working project uses Codex and GPT-5.6 Sol
- [x] Enrollment and different-question return flow implemented
- [x] Name and masked phone are shown after a strong match
- [x] OTP remains the final verification factor
- [x] Raw answer sentences are not stored
- [x] GPT receives only derived vectors and a hashed safety identifier
- [x] Public repository available at `https://github.com/Dannykkh/authidenty`
- [x] English README includes setup, limitations, Codex contribution, and security boundary

## Demo Video

- [x] Rebuilt final MP4 rendered with actual program operation
- [x] Duration is under three minutes: 91.05 seconds
- [x] 1920×1080 H.264 video and AAC stereo audio verified
- [x] English Typecast narration generated
- [x] Exact English SRT captions generated
- [x] Live project behavior visibly types and clicks through all steps
- [x] `Danny Kim` and `***-***-0184` are visible
- [x] Live GPT-5.6 Sol result and OTP verification are visible
- [x] Reserved test data and simulated SMS limitation are visible
- [x] Thumbnail rendered from the verified application screen
- [x] Uploaded rebuilt video publicly to YouTube
- [x] Uploaded `Authidenty-You-Know-Me-English.srt`
- [x] Verified public availability, 91-second duration, and manual English captions
- [x] Replaced the placeholder URL in `docs/devpost-submission.md`
- [x] Added the public URL to README and Devpost submission copy

## Devpost Fields

- [x] Project name and tagline drafted
- [x] Project description and full Project Story drafted
- [x] Repository URL ready
- [x] Testing instructions ready
- [x] Pasted the Project Story into Devpost
- [x] Added technologies used
- [x] Added the public YouTube URL to the actual Devpost project
- [x] Ran `/feedback` in the core Codex thread
- [x] Added the returned Codex Session ID privately
- [x] Previewed the public submission page
- [x] Submitted before the deadline

## Final Integrity Gate

- [x] `npm run lint` passed
- [x] `npm test` passed: 74 tests in 23 files
- [x] `npm run build` passed
- [x] Live browser API flow returned `201`, `201`, and `200`
- [x] Browser console errors: zero
- [x] Final video streams, resolution, duration, and captions verified
- [x] `.private/`, `.termsnap/`, local databases, screenshots, videos, and secrets are Git-ignored
- [x] `npm audit` reported zero vulnerabilities
- [x] Re-ran tests, lint, and build after final documentation changes
- [x] Confirmed Git worktree is clean and `main` matches `origin/main`

## Files

- Final video: `.termsnap/submission/Authidenty-You-Know-Me-OpenAI-Build-Week.mp4`
- English subtitles: `.termsnap/submission/Authidenty-You-Know-Me-English.srt`
- Thumbnail: `.termsnap/submission/Authidenty-You-Know-Me-Thumbnail.png`
- Demo script: `docs/demo-script.md`
- Devpost copy: `docs/devpost-submission.md`
- Public Devpost project: `https://devpost.com/software/authidenty`
- Repository: `https://github.com/Dannykkh/authidenty`
