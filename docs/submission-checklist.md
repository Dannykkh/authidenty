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
- [x] Working project uses Codex and GPT-5.6
- [x] Live GPT-5.6 classification recorded
- [x] Deterministic fallback documented and tested
- [x] Public repository available at `https://github.com/Dannykkh/authidenty`
- [x] MIT license included
- [x] English README contains setup, sample data, limitations, Codex contribution, and GPT-5.6 boundary
- [x] Local testing path is reproducible without a live model key

## Demo Video

- [x] Final MP4 rendered
- [x] Duration is under three minutes
- [x] English audio explains the product, Codex, and GPT-5.6
- [x] Live project behavior is shown
- [x] No copyrighted music is included
- [x] Reserved test data and simulated SMS limitation are visible
- [x] Thumbnail rendered
- [x] Upload video publicly to YouTube
- [x] Review YouTube playback and English subtitles
- [x] Paste public YouTube URL into `docs/devpost-submission.md`
- [ ] Paste public YouTube URL into Devpost

## Devpost Fields

- [x] Project name and tagline drafted
- [x] Project description and complete Project Story drafted
- [x] Repository URL ready
- [x] Testing instructions ready
- [ ] Paste the contents of `docs/devpost-submission.md`
- [ ] Add technologies used
- [ ] Add public YouTube URL
- [ ] Run `/feedback` in the Codex thread where the majority of core functionality was built
- [ ] Add the returned Codex Session ID
- [ ] Preview the public submission page
- [ ] Submit before the deadline

## Final Integrity Gate

- [x] `npm run lint` passed on the final implementation
- [x] `npm test` passed: 59 tests in 17 files
- [x] `npm run build` passed
- [x] `npm audit` reported zero vulnerabilities
- [x] Live browser API flow returned `201`, `201`, and `200`
- [x] Browser console errors: zero
- [x] `.private/`, `.termsnap/`, local databases, screenshots, videos, and secrets are Git-ignored
- [x] Tracked files and captured logs contain no API-key pattern
- [x] Re-run all checks after the final documentation changes
- [x] Confirm Git worktree is clean and `main` matches `origin/main`

## Files

- Final video: `.termsnap/submission/Authidenty-OpenAI-Build-Week-Typecast.mp4`
- English subtitles: `.termsnap/submission/Authidenty-English-Typecast.srt`
- Thumbnail: `.termsnap/submission/Authidenty-YouTube-Thumbnail-Typecast.png`
- Demo script: `docs/demo-script.md`
- Devpost copy: `docs/devpost-submission.md`
- Repository: `https://github.com/Dannykkh/authidenty`
