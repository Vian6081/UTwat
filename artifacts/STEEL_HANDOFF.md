# The Deadline Hostage — Steel beta handoff

Verified September 12, 2026. This supersedes older pending-access notes.

## Completed

- Activated Steel Computer on the existing account; installed official CLI `0.5.0-preview.6` at `~/.steel/bin/steel`.
- Provisioned Debian 13 with Node 22, project dependencies, source and the approved photo. No `.env` or provider credentials were uploaded.
- The full accelerated offline/mock escalation completed in the cloud and reached `fired`.
- Started a persistent Node evidence server and saved a real disk-and-memory checkpoint. Steel reports `ready`.
- Paused the source computer after testing. No billing, payment method or credit purchase was added. The wallet last checked during setup showed $29.95 included credits and $0 purchased.
- Refreshed the local rehearsal video, screenshots and seven-slide deck for the new name and mock design.

## Saved resources

Source computer: `cmp_035eyn0t6bpp4sjms11qp0yw6mg91` (paused).
Checkpoint: `chk_0357h15skz625ez0jwgpv5zbt9356` (`deadline-hostage-node-proof`, ready).
Project files: `/work/amma`. Node: `/opt/amma-node/node_modules/node/bin/node`.

Evidence: `steel-checkpoint.json`, `steel-checkpoint-source.json`, `steel-restore-attempt.json` beside this document. The source evidence contains an in-memory random identifier, PID, elapsed ticks, state hash and photo hash. It explicitly records `browserVerified: false`.

## Concrete blockers

Both Debian Chromium and official Playwright Chromium headless shell 1243 terminate immediately with SIGTRAP inside this beta computer, including a minimal blank-page launch. A loaded browser compose checkpoint is therefore **not verified**.

Two restore attempts returned HTTP 503: `no box has room for this computer right now`. The second attempt was made after pausing the source. Computer inventory confirmed that no restored computers were created. Neither of the required two restores has passed. A requested 68,400-second restore timeout was also rejected with HTTP 400 (`timeoutSeconds is invalid`); the documented two-hour example does not establish support for an 18-hour run.

## Resume verification when beta capacity is available

The helper loads the existing private local `.env`; do not copy or display its secrets. From the repository:

```sh
npx tsx src/deploy/checkpoint.ts get chk_0357h15skz625ez0jwgpv5zbt9356
npx tsx src/deploy/checkpoint.ts restore chk_0357h15skz625ez0jwgpv5zbt9356
```

Record the returned computer ID. On that computer, execute Node to fetch `http://127.0.0.1:3002/evidence`. The restored `nodeNonce`, PID, state hash and photo hash must match the source evidence; ticks must continue advancing. This proves Node memory/disk restoration only. Pause the verified clone, repeat into another new computer, and preserve both receipts. Reconcile inventory after any uncertain restore result before trying again. Do not delete the source or checkpoint.

`src/deploy/cloud-bootstrap.sh` records the Debian setup fixes, including the combined system/Steel CA bundle without disabling TLS verification. `src/deploy/checkpoint-demo.ts` provides browser evidence mode and an explicit `AMMA_CHECKPOINT_NODE_ONLY=true` fallback. The fallback must never be presented as browser proof.

## Actual 18-hour local test

Started September 12 at **18:36 Toronto**; deadline September 13 at **12:36 Toronto**. No accelerated clock. Calendar, email and Instagram actions are offline/mock. The script checks release and undo after reaching the deadline. Current status is **running, not complete**.

Progress: `photos/overnight-receipt.json`; log: `photos/overnight.log`. macOS `caffeinate` inhibits idle sleep for the bounded test. Keep the laptop open and running; shutdown or lid sleep can interrupt it. Inspect the final receipt before claiming success. Do not launch another copy over these files.

## Demo fallback

Public static mock: https://amma-instagram-vian.pages.dev/
Local integrated demo: `npm run mock` then open http://127.0.0.1:3000.
Editable deck: `The_Deadline_Hostage.pptx`; PDF: `The_Deadline_Hostage.pdf`; video: `AMMA_mock_rehearsal.webm`.
The portable demo ZIP is local at `/Users/viandhanda/The_Deadline_Hostage_demo.zip`; it contains no credentials. Copy and rehearse on the second physical laptop when available. That physical rehearsal is not yet verified. Devpost remains deferred by Vian.

Sources: [Steel Computer activation](https://app.steel.dev/computer-access), [preview concepts](https://computers-preview.apidocumentation.com/docs/concepts/core-concepts), [checkpoint guide](https://computers-preview.apidocumentation.com/docs/how-to/checkpoints).
