# The Deadline Hostage dashboard

Layout, typography, stage palette, vault, calendar rows, event log and notification cards adapted directly from Vian's Claude Design export, `Deadline Hostage.dc.html` (exported September 12, 2026). The original archive remains in Downloads as `Deadline hostage dashboard redesign.zip`.

`index.html` retains the exported HTML/CSS layout; `app.js` connects it to `/api/state`. Only the explicit work-complete button calls `/api/done`. The live agent runs independently of the page. A stale connection freezes the displayed timer.

The 30-second replay uses the original fictional presentation data in `replay-data.js`. It makes no provider writes and never changes the deadline or saved state. Back to live returns to the current agent. Browser notifications require the user's opt-in; in-page notifications work without it.

Fonts are self-hosted inside `fonts.css`; their SIL Open Font Licenses are included in `licenses/`. No Claude runtime, external analytics, or third-party scripts are loaded.

Validation: `npx tsc --noEmit`, `npx tsx src/scripts/verify-ee.ts`, and `npx tsx src/scripts/verify-design.ts`. The last check verifies the photo, all replay stages, unchanged state, zero POST requests, and returning to live; it saves a presentation video in `artifacts/Deadline_Hostage_30_second_replay.webm`.
