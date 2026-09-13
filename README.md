# AMMA

AMMA watches a study deadline, sends escalating Gmail reminders, reshapes Google Calendar, and automatically publishes a configured photo and caption to our own Instagram-style website when the deadline expires. Verified homework submission before expiry prevents publication. Real Instagram is not connected.

Built for Battle of the Schools by Vian Dhanda, Asad Ullah Qureshi and Aditya Vignesh Kumar, with AI coding and design assistance.

## Final implementation and demo

- TypeScript, Node.js and Express backend; HTML/CSS/JavaScript frontend.
- Steel Computer runs the live backend; Google OAuth connects real Gmail and Calendar.
- OpenRouter generates contextual wording; deterministic rules control escalation.
- Cloudflare Pages Functions and Workers KV serve the shared public photo feed.
- Canvas-style replica verifies submission receipts and PDF integrity, not academic correctness.
- Atomic JSON state, file locks and an action journal protect recovery.

Public feed: https://amma-instagram-vian.pages.dev/

The private dashboard at http://127.0.0.1:3004/ uses a local SSH relay to Steel and is not a public dashboard. The replacement Steel computer successfully completed a one-minute real-time verification run on September 13: two Gmail sends and automatic publication were confirmed, with no pending actions. The original six-hour overnight run remains preserved on a computer that failed to resume; completion of that run is not claimed.

**Replay 18h in 30s** remains an isolated presentation animation. It cannot send email, modify Calendar, or publish a photo. Video assets are in `artifacts/teammate-video/`.

## Homework verification

Click **Preview homework check** on AMMA to open the Canvas-style presentation. **Reset presentation** shows a missing submission; **Submit example PDF** saves and verifies the included sample without ending the live run. The live **Mark work done** button now requires a PDF submission at `/canvas/assignment` before it restores Calendar. This verifies submission status and file integrity in the replica, not grades or a real university account.

## Run the mock Instagram demo

```sh
npm run mock
```

Open http://127.0.0.1:3000. This starts a fresh 90-second simulation with offline Calendar/email and a local mock Instagram. It uses `photos/aurafarmer.jpg` by default; set `HOSTAGE_PHOTO` for another JPEG/PNG. At Armed, open the mock from the dashboard to see the actual photo and generated caption. “Share in mock only” saves a simulated post locally. No Instagram login, Steel credits or external API calls are used. The terminal prints the exact release command. Ctrl+C stops the server.

The mock is a replacement demo integration, not proof of real Instagram automation or a Steel Computer checkpoint. Drafts persist locally; release cancels unshared drafts.

## Run the offline demo

Requires Node.js 22+ and npm. From the repository root:

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

- [Historical editable slides](artifacts/The_Deadline_Hostage.pptx) and [PDF](artifacts/The_Deadline_Hostage.pdf)
- [Devpost submission copy and handoff](artifacts/devpost/START_HERE.txt)
- [Mock rehearsal video](artifacts/AMMA_mock_rehearsal.webm)
- [Detailed setup, recovery and current verification status](UTWAT_Master_doc.md)

## Automatic website publication

See `deploy/public-feed/README.md` and `wrangler.jsonc` for the Pages/KV deployment. Set `AMMA_PUBLIC_POSTING=true`, `AMMA_PUBLIC_FEED_URL`, and a private `AMMA_PUBLISH_TOKEN` matching the deployed `PUBLISH_TOKEN` secret. Set `HOSTAGE_PHOTO` to your own JPEG/PNG under 5 MB. Keep real Instagram `AUTO_SEND=false`; website publication is a separate integration.

The backend publishes once per deadline. A receipt confirms the public post; uncertain requests stop for reconciliation. KV propagation can briefly delay visibility. Completing work after publication does not retract an existing public post. Public image URLs are tied to post IDs to prevent mismatched cached photos.

Run a short **real public posting** demonstration only when you intend to publish the configured photo:

```sh
AMMA_OFFLINE=false npx tsx src/scripts/public-deadline-demo.ts 30
```

Additional checks:

```sh
AMMA_PUBLIC_POSTING=false npx tsx src/scripts/verify.ts
npx tsx src/scripts/verify-public-post.ts
node src/scripts/verify-feed.mjs
npx tsx src/scripts/verify-canvas.ts
```

Photos, credentials and runtime receipts are deliberately excluded from Git. Supply your own `.env` and photo to reproduce live behavior. Historical slide decks and handoff notes in `artifacts/` may describe earlier human-controlled posting; the README and current source describe the final implementation.
