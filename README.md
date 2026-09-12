# AMMA

A parent with root access. AMMA watches a study deadline, sends escalating email reminders, reshapes your calendar and prepares an Instagram post. **A human controls the final Share.** Marking work done restores calendar changes, clears drafts and closes the prepared browser session.

Built for Battle of the Schools by Sharma Ji Ka Bot: Vian Dhanda, Asad Ullah Qureshi and Aditya Vignesh Kumar.

## Current live run and presentation

The private Steel dashboard is at http://127.0.0.1:3004/. It uses Vian’s exported Claude design. **Replay 18h in 30s** is an isolated presentation animation; it never sends real mail or changes Calendar. The live six-hour overnight run started September 12 at 19:39 Toronto and ends September 13 at 01:39 Toronto. Two real study blocks and a new Gmail reminder have been verified; completion of the six-hour run is still pending. See `artifacts/STEEL_HANDOFF.md` for the current evidence and operating details.

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

- [Editable slides with current demo notes](artifacts/The_Deadline_Hostage.pptx) and [PDF](artifacts/The_Deadline_Hostage.pdf)
- [Mock rehearsal video](artifacts/AMMA_mock_rehearsal.webm)
- [Detailed setup, recovery and current verification status](UTWAT_Master_doc.md)

Verified September 12: all local suites and full offline escalation/release pass; a real Google email and temporary Calendar event create/rename/restore/delete check passed. OpenRouter generation succeeded using a free model. Steel Browser launched successfully. Local mock composition, simulated sharing and cancellation are implemented and tested. Steel Computer beta is activated; the cloud Node simulation passed and a checkpoint reached ready. Two restore attempts failed with a beta capacity error. Both Chromium builds crash with SIGTRAP, so browser restoration remains unverified. The local 18-hour endurance test is running with offline/mock services. Real Instagram authentication/compose remains unverified. Devpost work is deferred by the team.

## Hosted Instagram-style demo

Public Cloudflare Pages deployment: https://amma-instagram-vian.pages.dev

Cloudflare project: `amma-instagram-vian`. Deployed by direct upload of `index.html` and `photo.jpg` on the free plan. No Functions, paid plan, custom domain or billing setup. This public static demo keeps simulated posts in each visitor’s browser. Deployment success, the live page, and the loaded photo were verified in Chrome on September 12, 2026. Re-upload the standalone assets to this existing project for updates.

Alternative private deployment: https://amma-instagram-vian.ironyman.chatgpt.site

The hosted mock follows the supplied dark Instagram desktop reference and supports a compose dialog, editable demo caption, local simulated sharing, likes, comments, saves and follow toggles. It has no real Instagram connection. The hosted draft is stored in that browser only; it is separate from the local AMMA loop. Sites usage is included within existing plan-specific public-beta limits; no paid APIs, domain, database or billing purchase was added.

Hosted source is in `/Users/viandhanda/amma-instagram-site`; its `.openai/hosting.json` owns the existing Site registration. Reuse that registration for updates. The local loop uses `src/insta/mock.html` with its existing mock API. For the standalone deployment, that same HTML has `window.AMMA_STANDALONE=true` inserted before the application script and uses the selected photo as `dist/photo.jpg`. Credentials and AMMA runtime state are excluded. The rehearsal video was regenerated after this visual redesign and project rename.

## Steel Computer beta and endurance run

Current evidence and exact recovery commands: [Steel handoff](artifacts/STEEL_HANDOFF.md). The cloud computer is paused, preserving memory and disk. Only included credits were used; no billing or credit purchase was added.

The local real-clock run started September 12, 2026 at 18:36 Toronto and reaches its deadline September 13 at 12:36. Keep this Mac awake and its lid open for the test. Its progress is in ignored `photos/overnight-receipt.json`; the process logs to `photos/overnight.log`. It uses offline Calendar/email and the mock, then automatically checks release/undo. It has not finished yet. Start a fresh run with `node --import tsx src/deploy/overnight.ts`; the script refuses to overwrite existing run evidence.

## Live agent running on Steel Computer

On September 12 at 18:56 Toronto, the real agent started on Steel Computer `cmp_036435grwqp7td6fcv3dsz9tzwjmv` (1 vCPU, 1 GiB). The first real Gmail reminder succeeded; Calendar read succeeded; free OpenRouter wording generated. Instagram uses the server-side mock, so Chromium is not needed in the cloud. The source, Node runtime, dashboard, mock state, photo and live recovery journal all run in Steel.

Open **http://127.0.0.1:3004** on this Mac. This port is a private SSH relay to the cloud dashboard, not a locally executing agent and not the public Cloudflare mock. It shows `Steel Computer · Live Google · Mock Instagram`. **Mark work done & restore calendar** performs release on the cloud agent. It never presses real Instagram Share.

Deadline: **September 13, 12:56 Toronto**. Steel's documented maximum run window is eight hours. The bounded `cloud-watch.cjs` controller on this Mac checks once per minute and resumes the same paused computer; it never restores a clone or repeats Google actions. It stops issuing resumes 30 minutes after the deadline, with a maximum of four resume attempts. Automatic cloud pause remains enabled. Keep the Mac open and connected for the viewer and resume checks. The cloud agent continues independently while its current run window is active. Resume success at future windows has not yet been verified.

Private local status files: `photos/cloud-live-deployment.json`, `photos/cloud-watch-receipt.json`. Cloud state/log: `/work/amma/photos/cloud-live-state.json`, `/work/amma/photos/cloud-live.log`. The local endurance test remains separate and simulated.

Reconnect the private viewer using the existing local Steel credential:

```sh
node src/deploy/cloud-view.cjs cmp_036435grwqp7td6fcv3dsz9tzwjmv
```

Only one viewer can listen on port 3004. The relay rejects unexpected Host/Origin headers and carries only the dashboard/mock routes over authenticated SSH. There is no public tunnel exposing your Google activity. Google and OpenRouter credentials live in a private cloud `.env`; the Steel API key stays on the Mac. Do not clone the live run's state into another active agent. The previous offline checkpoint computer remains paused for independent restore experiments.

## Instagram interface update

The feed and composer now follow the supplied Instagram desktop reference: narrow icon rail, 4:5 post, wider suggestion gutter, account row and a header-level Share action. Visible mock/demo labels were removed at Vian's request. Open **Create (+)** to review the prepared caption and photo. The visible route is `/instagram`; the old route remains a compatibility alias. Public Cloudflare and the private Steel dashboard both use this interface. The underlying Instagram behavior remains a replica with locally stored posts; it does not connect to Instagram.
