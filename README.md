# AMMA

A parent with root access. AMMA watches a study deadline, sends escalating email reminders, reshapes your calendar and prepares an Instagram post. **A human controls the final Share.** Marking work done restores calendar changes, clears drafts and closes the prepared browser session.

Built for Battle of the Schools by Sharma Ji Ka Bot: Vian Dhanda, Asad Ullah Qureshi and Aditya Vignesh Kumar.

## Run the mock Instagram demo

```sh
npm run mock
```

Open http://127.0.0.1:3000. This starts a fresh 90-second simulation with offline Calendar/email and a local mock Instagram. It uses `photos/aurafarmer.jpg` by default; set `HOSTAGE_PHOTO` for another JPEG/PNG. At Armed, open the mock from the dashboard to see the actual photo and generated caption. “Share in mock only” saves a simulated post locally. No Instagram login, Steel credits or external API calls are used. The terminal prints the exact release command. Ctrl+C stops the server.

The mock is a replacement demo integration, not proof of real Instagram automation or a Steel Computer checkpoint. Drafts persist locally; release cancels unshared drafts.

## Run the offline demo

Requires Node.js 20+ and npm. From the repository root:

```sh
npm install
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-new.json HOSTAGE_PHOTO=photos/your-photo.jpg npm run sim
```

In another terminal, use the same state path:

```sh
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-new.json npm run dash
```

Open http://127.0.0.1:3000. The full 18-hour progression takes about 90 seconds. Offline mode uses simulated email/calendar data and does not open Instagram. Use a new state filename for every new simulation. The photo path is a placeholder in offline mode; live mode requires an actual JPEG/PNG.

## Connect live accounts

Create a private `.env` using `.env.example` as a starting point. Keep `DEMO_MODE=true` and `AUTO_SEND=false`. Configure:

- `GOOGLE_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALENDAR_ID=primary`. Enable Gmail and Calendar APIs and create a Desktop OAuth client with Calendar events and Gmail send scopes. Run `npx tsx src/google/auth.ts` to authorize and save the refresh token locally.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free`.
- `STEEL_API_KEY`. Run `npm run insta-login`, sign in manually through the Steel viewer, and confirm the restored feed. The script saves `STEEL_PROFILE_ID` after proving persistence.

Put your own photo under ignored `photos/`. Never commit `.env`, photos or runtime state. A live simulation makes real external changes and sends real emails; use offline mode for routine rehearsals.

Configure a separate live state file and check readiness:

```sh
AMMA_STATE_PATH=photos/live-state.json npx tsx src/scripts/configure.ts --photo photos/your-photo.jpg --deadline 2026-09-13T10:30:00-04:00
AMMA_STATE_PATH=photos/live-state.json npx tsx src/deploy/preflight.ts
AMMA_STATE_PATH=photos/live-state.json npx tsx src/deploy/supervisor.ts
```

The supervisor runs the loop and dashboard on the machine where you start it. Steel Browser hosts the Instagram browser; the separate Steel Computer beta is required for the proposed whole-computer checkpoint demonstration. The public browser API alone does not prove that a loaded compose window can be checkpointed and restored.

## Release and recovery

Use the same `AMMA_STATE_PATH` and offline/live mode as the run:

```sh
AMMA_STATE_PATH=photos/live-state.json npm run mark-done
AMMA_STATE_PATH=photos/live-state.json npm run undo-all
```

`mark-done` permanently releases the study watch. `undo-all` restores current calendar changes without stopping future escalation. If an external request has an uncertain result, inspect the recovery journal and reconcile that action before retrying; do not delete the state file to bypass the guard.

## Verification and demo assets

```sh
npx tsc --noEmit
npx tsx src/scripts/verify.ts
npx tsx src/scripts/verify-cs.ts
npx tsx src/scripts/verify-ee.ts
npx tsx src/scripts/verify-mock.ts
```

The EE test requires Playwright Chromium or installed macOS Chrome. `npx tsx src/scripts/record-demo.ts` records an isolated offline run including the mock compose preview and requires Playwright FFmpeg (`npx playwright install ffmpeg`).

- [Editable slides with current demo notes](artifacts/AMMA_mock.pptx) and [PDF](artifacts/AMMA.pdf)
- [Mock rehearsal video](artifacts/AMMA_mock_rehearsal.webm)
- [Detailed setup, recovery and current verification status](UTWAT_Master_doc.md)

Verified September 12: all local suites and full offline escalation/release pass; a real Google email and temporary Calendar event create/rename/restore/delete check passed. OpenRouter generation succeeded using a free model. Steel Browser launched successfully. Local mock composition, simulated sharing and cancellation are implemented and tested. Real Instagram authentication/compose, Steel Computer deployment and checkpoint restores are still pending. Devpost work is deferred by the team.

## Hosted Instagram-style demo

Private deployment: https://amma-instagram-vian.ironyman.chatgpt.site

The hosted mock follows the supplied dark Instagram desktop reference and supports a compose dialog, editable demo caption, local simulated sharing, likes, comments, saves and follow toggles. It has no real Instagram connection. The hosted draft is stored in that browser only; it is separate from the local AMMA loop. Sites usage is included within existing plan-specific public-beta limits; no paid APIs, domain, database or billing purchase was added.

Hosted source is in `/Users/viandhanda/amma-instagram-site`; its `.openai/hosting.json` owns the existing Site registration. Reuse that registration for updates. The local loop uses `src/insta/mock.html` with its existing mock API. For the standalone deployment, that same HTML has `window.AMMA_STANDALONE=true` inserted before the application script and uses the selected photo as `dist/photo.jpg`. Credentials and AMMA runtime state are excluded. The earlier rehearsal video predates this visual redesign.
