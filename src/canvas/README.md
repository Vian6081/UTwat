# Canvas presentation integration

The local Canvas-style dashboard, course drawer and Teamwork Analysis page follow Vian's supplied screenshots. The institution's live Canvas service is not connected. Grades, personal identifiers and instructor feedback from the references are not copied.

Routes are mounted at `/canvas`. Upload a PDF on `/canvas/assignment`, then use AMMA's Mark work done button. The server checks the configured assignment, the current session deadline, the persisted receipt and the file's SHA-256 hash. It marks work done under the same state lock only after all checks pass, then the existing release flow restores Calendar. Missing, changed and stale submissions leave the agent running. This confirms submission, not academic correctness.

The dashboard's Preview homework check uses separate presentation files. Submit example PDF loads the included sample, saves it through the same upload route and checks the persisted result. Reset presentation archives only presentation receipts/files. Both controls leave the real six-hour session and its Google integrations unchanged. During the 30-second replay, successful verification releases only that presentation.

Uploaded files and receipts live beside the active state file under a private `canvas` directory. The iframe is restricted to same-origin embedding; POSTs require matching Origin and JSON. PDF uploads are capped at 2 MB; the private Steel relay accepts a larger JSON envelope only for the two upload paths. No logins, student credentials or university API tokens are collected.

Run `npx tsx src/scripts/verify-canvas.ts` for submission UI, rejection cases, deadline binding, file integrity, guarded release, presentation isolation, same-origin checks and responsive screenshots. Fonts are self-hosted under the included Lato Open Font License.
