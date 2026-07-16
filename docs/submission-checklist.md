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
- [ ] Upload rebuilt video publicly to YouTube
- [ ] Upload `Authidenty-You-Know-Me-English.srt`
- [ ] Review public YouTube playback and captions
- [ ] Replace `[ADD NEW PUBLIC YOUTUBE URL]` in `docs/devpost-submission.md`
- [ ] Add the new public URL to README and Devpost

## Devpost Fields

- [x] Project name and tagline drafted
- [x] Project description and full Project Story drafted
- [x] Repository URL ready
- [x] Testing instructions ready
- [ ] Paste the contents of `docs/devpost-submission.md`
- [ ] Add technologies used
- [ ] Add the new public YouTube URL
- [ ] Run `/feedback` in the Codex thread where the core functionality was built
- [ ] Add the returned Codex Session ID
- [ ] Preview the public submission page
- [ ] Submit before the deadline

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
- [ ] Confirm Git worktree is clean and `main` matches `origin/main`

## Files

- Final video: `.termsnap/submission/Authidenty-You-Know-Me-OpenAI-Build-Week.mp4`
- English subtitles: `.termsnap/submission/Authidenty-You-Know-Me-English.srt`
- Thumbnail: `.termsnap/submission/Authidenty-You-Know-Me-Thumbnail.png`
- Demo script: `docs/demo-script.md`
- Devpost copy: `docs/devpost-submission.md`
- Repository: `https://github.com/Dannykkh/authidenty`
