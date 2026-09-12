# AMMA team master document

## Current amendments — Vian, September 12, 2026

These amendments supersede conflicting statements in the original brief below.

- Vian chose to use their own Instagram account instead of creating a burner (instruction in this task). Steel API access is configured; live Instagram profile verification is in progress. The application loop never calls `fireNow`, regardless of configuration.
- Photo source: `~/Downloads/Aurafarmer.HEIC`. A JPEG copy is prepared at `photos/aurafarmer.jpg`, excluded from Git. The original is untouched.
- Shared `src/types.ts` and `src/config.ts` are unchanged. Optional loop recovery metadata lives under `runtime` in state.json, declared in Vian's state.ts. Existing dashboard and module signatures remain compatible.
- Team name selected for registration: **Sharma Ji Ka Bot**. Vian confirmed admission. Teammates: Asad Ullah Qureshi and Aditya Vignesh Kumar. Devpost work is deferred by Vian. The attendee team form is https://forms.gle/8jDCNgBJJcedAVai6.
- The public Steel Browser SDK supports persistent profiles. Steel Computer is a separate preview; its installer, quota, capture API, and live-browser checkpoint behavior still need confirmation from the booth. An external Steel Browser session is not proven to be included in a Steel Computer checkpoint. Do not promise an armed restore until it has been demonstrated twice.

UTWAT_Master_doc
Project: AMMA — Autonomous Motivational Management Agent Event: Battle of the Schools, Bahen Centre, Sep 12–13 2026 Track: Steel.dev — Web Agents. Also targeting the Steel Computer Wildcard ($500). Team: 3 people. Representing U of T.

0. HOW TO USE THIS DOC
This is the single source of truth. Paste the whole thing into every AI coding chat (Cursor, Claude, GPT) before you ask for anything, then add: "I own <your files>. Implement <specific thing>. Do not create or modify any other file."
If this doc and your AI disagree, this doc wins. If this doc is wrong, fix this doc first, tell the team in Discord, then code.

1. THE PITCH (memorize this)
Two of us grew up in South Asian households where a parent was permanently on your case about studying. Then we got to university and nobody was. Grades went accordingly.
AMMA is that parent, rebuilt as an autonomous agent with its own cloud computer. You give it your exam or deadline. It takes a folder of your worst photos hostage. Then it lives on your Google Calendar: emailing you, carving study blocks into your free time, renaming your Friday plans to something less flattering. If the deadline passes and you haven't marked the work done, it opens Instagram and loads the post.
It does not press send. It waits, with the button lit.
One-liner for the judges: "It's not a productivity app. It's a parent with root access."

2. WHY THIS NEEDS A COMPUTER (this is the wildcard rubric — say it in these words)
Steel's wildcard asks: why does the agent need its own computer, and what becomes possible once it has one?
Our answer, three parts:
It lives for 18 hours. The behaviour is a slow escalation over real time, not a request/response. There is no "run" — there's a thing that's been awake since yesterday afternoon.
It accumulates. The photo vault, the escalating roast drafts, the undo log of every calendar event it has vandalised. All on its own disk, all growing.
Its state is a savable object. We checkpoint the exact moment before it posts — browser session live, photo attached, caption written, button lit — and restore that same loaded moment fresh for each judge. Checkpoints save memory and processes, not just disk. Each judge personally decides whether to press send.
Part 3 is the demo. Lead with it.

3. HARD RULES — READ BEFORE TOUCHING A KEYBOARD
3.1 File ownership is absolute
The single biggest killer at past hackathons: three people vibecoding, three AIs each rewriting the whole repo, everything conflicts, nothing works at 4am.
You edit only the files listed under your name in §6. Nothing else. Ever.
Every AI prompt ends with: "Only create or modify these exact files: <list>. If the task seems to require changing another file, stop and tell me instead."
If you need a change in someone else's file, message them in Discord. Do not edit it. Do not "just quickly fix" it.
src/types.ts and src/config.ts are frozen after Hour 1. Only Vian edits them, and only after telling everyone.
3.2 Git
Branch per person: vian, cs, ee. Never commit to main directly.
Merge to main only at the sync points in §12. Vian does all merges.
Commit every 20 minutes. git commit -am "wip" is a fine message tonight.
.env is in .gitignore from commit one. Never commit a key.
3.3 Everything is fake-clockable
No module calls Date.now() directly. Ever. Import now() from src/clock.ts. This lets us replay 18 hours in 90 seconds, which we will do about forty times tonight.
3.4 Nothing is destructive
Photos are copies. The originals stay on Vian's laptop.
Every calendar mutation is logged with its original value before it happens.
npm run undo-all must work at all times. Build it before the first rename.
Only photos of one person, alone. No photos with friends in them. We are not posting someone else's face.
Instagram account is a burner made today, not anyone's real account.

4. TECH STACK (decided, do not relitigate)
Layer
Choice
Why
Language
TypeScript everywhere
One language for three people. Steel's first-party SDK is TS.
Runtime
Node 20+


Package manager
npm
Not pnpm, not yarn. Fewer surprises.
Browser control
Playwright + steel-sdk
Steel's recommended first path.
Cloud browser
Steel Browser with a persistent Profile
Log into Instagram once, reuse the profileId forever.
Cloud computer
Steel Computer (preview CLI + SDK)
Separate preview install from Steel Browser.
Google
googleapis npm package, OAuth2
Calendar + Gmail on one consent.
LLM
OpenRouter, claude-sonnet or similar
Roast + email generation only.
Storage
A single JSON file on disk. No database.
state.json. Do not add Postgres. Do not add Prisma.
Dashboard
One static HTML file + a tiny Express server
No React, no Vite, no build step.
Config
.env + src/config.ts



Explicitly banned tonight: any database, any ORM, Docker, Next.js, React, a test framework, TypeScript strict-mode arguments, and any refactor that is not fixing a bug.

5. REPO SETUP (Vian does this in the first 15 minutes, before anyone else starts)
npm init -y
npm i steel-sdk playwright googleapis express dotenv
npm i -D typescript tsx @types/node @types/express
npx tsc --init
package.json scripts:
{
  "scripts": {
    "loop": "tsx src/loop.ts",
    "sim": "tsx src/loop.ts --sim",
    "undo-all": "tsx src/scripts/undo-all.ts",
    "mark-done": "tsx src/scripts/mark-done.ts",
    "arm": "tsx src/scripts/arm.ts",
    "dash": "tsx src/dashboard/server.ts",
    "insta-login": "tsx src/insta/login.ts"
  }
}

6. FILE OWNERSHIP TABLE
File
Owner
Purpose
src/types.ts
VIAN (frozen H+1)
All shared types
src/config.ts
VIAN (frozen H+1)
Env loading, tunables
src/clock.ts
VIAN
Real + fake clock
src/state.ts
VIAN
Read/write state.json
src/loop.ts
VIAN
The escalation state machine
src/scripts/*.ts
VIAN
undo-all, mark-done, arm
src/deploy/*.ts
VIAN
Supervisor, checkpointing
src/google/calendar.ts
CS
Read + mutate calendar
src/google/gmail.ts
CS
Send nag emails
src/google/auth.ts
CS
OAuth token handling
src/roast/generate.ts
CS
LLM calls for emails + roasts
src/insta/login.ts
EE
One-time profile auth
src/insta/post.ts
EE
Arm + post
src/dashboard/server.ts
EE
Express server
src/dashboard/index.html
EE
The demo screen
UTWAT_Master_doc.md
VIAN
This doc

Nobody touches a file that isn't theirs. If it's not in this table, ask before creating it.

7. DATA CONTRACTS (Vian writes these first; everyone codes against them)
src/types.ts
export type Stage = "calm" | "nudging" | "invasive" | "hostile" | "armed" | "fired" | "released";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO
  end: string;     // ISO
}

export interface Mutation {
  eventId: string;
  originalTitle: string;
  newTitle: string;
  at: string;      // ISO
  undone: boolean;
}

export interface Draft {
  at: string;      // ISO
  stage: Stage;
  caption: string;
}

export interface AppState {
  deadlineISO: string;
  stage: Stage;
  done: boolean;
  studyMinutesLogged: number;
  mutations: Mutation[];
  drafts: Draft[];
  emailsSent: { at: string; subject: string; body: string }[];
  hostagePhoto: string | null;   // path on disk
  lastCheckISO: string | null;
}
Module interfaces — implement exactly these signatures
// src/google/calendar.ts   (CS)
export async function listEventsToday(): Promise<CalendarEvent[]>;
export async function renameEvent(id: string, newTitle: string): Promise<void>;
export async function insertStudyBlock(startISO: string, minutes: number): Promise<string>;
export async function deleteEvent(id: string): Promise<void>;

// src/google/gmail.ts      (CS)
export async function sendNag(subject: string, body: string): Promise<void>;

// src/roast/generate.ts    (CS)
export async function generateEmail(stage: Stage, hoursLeft: number, context: string): Promise<{subject: string; body: string}>;
export async function generateEventTitle(originalTitle: string, hoursLeft: number): Promise<string>;
export async function generateCaption(stage: Stage, context: string): Promise<string>;

// src/insta/post.ts        (EE)
export async function armCompose(photoPath: string, caption: string): Promise<{sessionId: string; liveViewUrl: string}>;
export async function fireNow(): Promise<void>;

// src/clock.ts             (VIAN)
export function now(): Date;
If your function isn't ready, return hardcoded fake data that matches the type. The loop must run end to end from Hour 2 even if every module is a stub. Stubs first, real implementations second.

8. THE ESCALATION LADDER (the actual product spec)
Stages are driven by hours remaining until deadlineISO. Tune the thresholds in config.ts.
Stage
Trigger
Behaviour
calm
> 12h left
One polite email. "Hey, you've got X on Sunday. You got this."
nudging
12h–6h
Email every 2h, tone sharpening. Inserts 2 study blocks into free gaps.
invasive
6h–2h
Email every hour. Renames social/free events to study demands. Emails a preview of the caption it's drafted.
hostile
2h–15m
Email every 20 min. Renames everything unclaimed. Rewrites the caption, worse. Emails the diff.
armed
< 15m
Opens Steel Browser, loads Instagram, attaches photo, fills caption. Stops. Emails: "It's loaded."
fired
deadline passed, done === false
Waits for a human to click send. Never auto-sends in demo mode.
released
done === true at any point
Deletes drafts, undoes all mutations, sends one nice email.

Rules for the ladder:
Escalation is one-way. Never de-escalate except to released.
Every stage transition writes to state.json and appends to the drafts/emails log.
npm run mark-done sets done = true → jumps to released. This is the "did you study" check. It is manual and that is fine.

9. WORK DISTRIBUTION
VIAN — the spine (2nd year CE, most experience)
You own the parts where things go wrong and the parts nobody else can unblock.
First 60 minutes, before anything else: spike the Instagram profile auth yourself. Create the burner account, get a Steel session with persistProfile: true, log in by hand via the live session viewer, release, then reload with the saved profileId and confirm you're still logged in. This is the highest-risk item in the project and it must be answered by 5pm. Once it works, hand the working profileId and a code snippet to EE and never touch src/insta/ again.
Repo setup, types.ts, config.ts, clock.ts, state.ts. Freeze the types by Hour 1 and announce it.
loop.ts — the state machine. Build it against stubs. It must run the full 18-hour ladder in 90 seconds in sim mode.
undo-all, mark-done, arm scripts.
Steel Computer deployment and the supervisor. This comes last, around Hour 8. Moving a working agent inside is 20 minutes. Debugging a broken one inside is your whole night.
All git merges. All integration debugging.
CS — Google (1st year, first hackathon)
You own the part that has to work reliably, and it's the most tutorial-covered code in the project. Every LLM knows googleapis cold.
Google Cloud setup first. New project → enable Calendar API and Gmail API → OAuth consent screen, External, Testing mode → add your own Gmail as a test user. No app review needed, and the 7-day refresh token expiry doesn't matter for a weekend.
Scopes: calendar.events and gmail.send. One consent for both.
auth.ts — get a refresh token, save it to .env, load it on startup.
calendar.ts — the four functions in §7. Test each one standalone before wiring anything.
gmail.ts — sendNag. Get one real email into your inbox before doing anything clever.
roast/generate.ts — OpenRouter calls. This is where the project gets funny. Feed the model real context: the actual event titles, hours left, how many emails you've ignored. A generic LLM roast is limp; specificity is the entire joke.
Your first milestone (aim: 2 hours in): a script that sends you one email and renames one calendar event. Nothing else. Tell the team when it works.
EE — Instagram + the demo screen (2nd year, first hackathon)
Vian hands you working auth. You build on top of it.
insta/post.ts — armCompose() opens a Steel session with the saved profileId, navigates to Instagram, opens the create-post flow, uploads the photo, types the caption, and stops at the final screen. Returns the live view URL so we can put it on the big screen.
fireNow() — clicks the last button. Guarded behind a config flag, off by default.
Test with the live session viewer open. You'll be watching a real browser in the cloud do this. Selectors will break; that's normal, keep re-reading the page.
dashboard/ — one HTML page that polls state.json every second and shows: a countdown, the current stage, the number of hijacked calendar events, and the latest caption draft. Plain HTML, plain CSS, plain fetch. This is what's on the projector during judging, so it should look good — big type, dark background, the countdown enormous.
Your first milestone (aim: 2 hours in): using Vian's profile, open a Steel session and prove you can navigate to the Instagram create-post screen while logged in. Screenshot it in Discord.
Everyone
Post in Discord when a milestone lands. Silence for 90 minutes means you're stuck — say so.
Two beginners, one experienced: ask Vian before you spend 30 minutes stuck. The cost of interrupting is much lower than the cost of a lost hour tonight.
Steel has engineers at the booth and in BA2139 (mentor room). Use them.

10. SECRETS
.env, gitignored, never pasted into a chat:
STEEL_API_KEY=
STEEL_PROFILE_ID=
OPENROUTER_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
DEMO_MODE=true
AUTO_SEND=false
AUTO_SEND=false at all times. It never flips to true in front of a judge.

11. DEMO PLAN
Setup: dashboard on the projector. Steel live session viewer on a second window. Phone with the burner Instagram open.
30 seconds of story. The South Asian parent line. Do not skip this, it's why the project is memorable.
Sim run. npm run sim — the ladder plays out in 90 seconds on the dashboard. Emails land in a real inbox live. Calendar events get renamed on a real calendar, visible side by side, before and after.
The overnight artifact. Show state.json from the real run: timestamps spanning 18 hours, the drafts getting meaner, the undo log.
Restore the armed checkpoint. steel checkpoint restore <id> --wait --use. Up comes a computer already in the loaded moment. Live view: Instagram, photo attached, caption written, button lit.
Hand the laptop to the judge. Let them decide. Restore a fresh copy for the next judge.
npm run undo-all. Calendar restores in front of them. This is the beat that says we're not reckless.
If checkpointing fails, fall back to running npm run arm live. Have that path tested.

12. SCHEDULE
Times are guides. The only hard deadlines are 11:00 AM Sunday (submissions close, Devpost) and 12:30 PM Sunday (judging).
When
What
Who
H+0 → H+1
Instagram profile spike. Repo setup. Types frozen. Google Cloud project created.
Vian / CS
H+1
SYNC. Types locked. Everyone has a running repo and their own branch.
All
H+1 → H+3
Stub-driven parallel build. Each person hits their first milestone.
All
H+3
SYNC + merge. Loop runs end to end on stubs.
All
H+3 → H+6
Real implementations replace stubs, one at a time.
All
H+6
SYNC + merge. Full sim run works locally with real Google and real Instagram.
All
H+6 → H+8
Dashboard, caption quality, escalation tuning. Make it funny.
CS / EE
H+8 → H+10
Move onto Steel Computer. Supervisor. First checkpoint.
Vian
~H+10
Start the real overnight run. Deadline set to Sunday morning.
Vian
Overnight
Polish, slides, sleep in shifts. Someone is always awake watching the run.
All
Sun 8:00 AM
Take the armed checkpoint. Test restore twice.
Vian
Sun 9:00 AM
Feature freeze. Only bug fixes after this.
All
Sun 9:00–10:30
Devpost writeup, video, slides finished.
CS / EE
Sun 11:00 AM
Submitted.
Vian
Sun 11:00–12:30
Rehearse the demo three times out loud.
All

The overnight run is a nice-to-have, not a dependency. The checkpoint demo works without it. If the long run dies at 4am, you still have a project.

13. PRESENTATION
Side quests worth chasing: Best Slide Aesthetics (200 pts) and Best Team Name (100 pts). Both are nearly free.
Team name candidates: Sharma Ji Ka Bot, Log Kya Kahenge, Beta Please, Unpaid Emotional Labour. Pick one and register it on the Google Form. Vian decides by dinner.
Slides — 7 max, EE owns the deck
Title. Team name, AMMA, one line: "A parent with root access."
The problem. The South Asian household line, in one sentence, in big type. This is the emotional hook and it's the slide people will remember.
What it does. Four icons: emails you, hijacks your calendar, holds your worst photos, posts them. No paragraphs.
The escalation ladder. The table from §8 as a visual timeline. Calm → hostile → armed.
Architecture. Steel Computer in the middle, Google and Steel Browser on the sides, disk underneath. One diagram, no more than six boxes.
Why it needs a computer. The three points from §2, verbatim. This is the wildcard slide.
Demo. One word on the slide. Then switch to the live screen.
Design rules: dark background, one accent colour, one font, huge type, minimum 30pt. No stock photos. No bullet point longer than six words. Screenshots of the actual renamed calendar events are worth more than any graphic — use real ones, they're funnier.
Delivery
Vian demos, because you'll know why things break.
CS runs the laptop and triggers the sim on cue.
EE watches the clock and handles the judge's questions about scope.
Rehearse three times. Time it. Under 3 minutes for the talk, everything else is demo.
Track winners demo in front of everyone at closing, so be ready to do it twice.
Questions you will be asked — have the answers ready
"Did this actually run overnight?" → Show timestamps in state.json, name the checkpoint IDs.
"What if it breaks and posts something bad?" → AUTO_SEND is off; it stops at the button; the photos are only of one of us, alone.
"Couldn't you do this with a cron job?" → The three points from §2. Especially the checkpoint.
"Is this against Instagram's terms?" → Yes, browser automation of Instagram is against Meta's terms. It's a burner account, we're not scraping, and the production version would use the Graph API with a Business account. Say it plainly; don't get cagey.

14. SUBMISSION CHECKLIST (Sunday, before 11:00 AM)
Repo pushed, main is the working version
.env not in the repo — check twice
README with setup steps and a 3-sentence description
Devpost entry created at battle-of-the-schools.devpost.com
Demo video uploaded (2 min, screen recording of the sim run + the armed restore)
Team registered on the main Google Form
Slides exported to PDF and on two laptops
Checkpoint IDs written down on paper

15. FAILURE PLANS
If this breaks
Do this
Instagram auth won't hold
Point the post at a Discord webhook or a self-hosted page instead. Same joke, zero risk. Decide by 7pm, not 3am.
Google OAuth fights you
Use a fresh personal Gmail, not a UofT account. Workspace admin policies can block scopes.
Steel Computer quota is too small
Run steel computer quota in the first 20 minutes so you find out now. Fewer checkpoints = demo plan 4 changes.
The overnight run dies
Doesn't matter. Demo from the checkpoint.
Nothing integrates by H+8
Cut the dashboard, cut the overnight run, cut Steel Computer. Ship the sim + the armed browser. That is still a complete demo.

The minimum shippable version: a script that runs the ladder in 90 seconds, sends real emails, renames real calendar events, and ends with a loaded Instagram compose window. Everything else is upside. Get that working first and protect it.



## Vian implementation and handoff

### Completed locally

Vian work was pushed on branch `vian`. CS work continues on branch `cs`, based on `vian`; main has not been merged. Repo setup and installed dependencies were already present. CS and EE files were preserved.

- Injectable fake clock, plus a persisted simulation epoch shared with the dashboard and scripts.
- Atomic state replacement, serialized loop/script writes, validation, and preserved undo history.
- One-way escalation, timed emails, caption previews/diffs, free-gap study scheduling, and one-time arming even when first started after the deadline.
- Calendar renames write the original title before the remote request. Insertions record their intended start time before the request and returned ID immediately afterward. If a request's outcome is unknown, execution stops for reconciliation instead of repeating it.
- Release clears local captions, restores calendar changes with progress saved after every undo, and sends one completion email. `mark-done` performs release even without a running loop.
- Manual arm/configuration scripts, a real Steel profile-auth spike, deployment preflight and a bounded process supervisor.
- Integration verification uses Node assert without adding a test framework.

### Commands

Run from the repository root. Install dependencies with `npm install` if needed.

```sh
npx tsc --noEmit
npx tsx src/scripts/verify.ts
npx tsx src/scripts/configure.ts --photo photos/aurafarmer.jpg
# Use an explicit timezone offset for your actual deadline:
npx tsx src/scripts/configure.ts --deadline 2026-09-13T08:00:00-04:00
npm run loop
npm run mark-done
npm run undo-all
npm run arm
```

The deadline example is not applied automatically. `undo-all` restores current changes but does not stop future escalation; `mark-done` releases permanently. Arming is idempotent for one state file. EE now adds an optional `cancelCompose` export. `mark-done` releases the armed session and restores Calendar; failed closure retains the recovery entry for retry.

A fresh simulation uses a separate state file to preserve live history. Use a new filename for every run, and the same path for both processes:

```sh
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-1.json HOSTAGE_PHOTO="$PWD/photos/aurafarmer.jpg" npm run sim
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-1.json npm run dash
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-1.json npm run undo-all
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-demo-1.json npm run mark-done
```

Simulation accelerates the clock by 720 times, so 18 hours takes about 90 seconds. It uses the installed integrations: Google/OpenRouter calls are live unless AMMA_OFFLINE=true; Instagram now uses the EE compose integration in live mode. These commands can have real external effects. It refuses to reset an existing state file. The dashboard uses the same simulated epoch through `now()`. Free blocks are limited to the calendar day visible through `listEventsToday`; fewer than two are possible if the day has insufficient free time.

### Live auth and deployment

Configure missing keys locally in `.env`, with `DEMO_MODE=true` and `AUTO_SEND=false`. Never commit that file.

```sh
npx tsx src/scripts/profile-spike.ts
npx tsx src/deploy/preflight.ts
npx tsx src/deploy/supervisor.ts
npx tsx src/deploy/checkpoint.ts quota
npx tsx src/deploy/checkpoint.ts help
npx tsx src/deploy/checkpoint.ts restore CHECKPOINT_ID
```

The profile spike opens Instagram, waits for manual login in the viewer, releases the session, waits for the profile to become READY, opens a fresh session with that profile, checks its session cookie, and asks for visual confirmation. Save the resulting profile ID as STEEL_PROFILE_ID; no password/cookie is printed. EE can use:

```ts
const session = await steel.sessions.create({
  profileId: config.steelProfileId,
  persistProfile: true,
});
```

Profile workflow source: [Steel profile documentation](https://docs.steel.dev/overview/profiles-api/overview).

The supervisor runs the loop and dashboard on a machine with this repo, Node and dependencies installed. It refuses missing credentials, stubs, simulation state and AUTO_SEND=true. It retries failed processes with bounded backoff, but stops on uncertain external actions. Copy the project and ignored runtime files to Steel Computer only after preview access is available. Protect `.env`, photos and state there as on the laptop. The checkpoint helper wraps the quota/restore syntax from this brief, not a verified preview installation; capture automation remains pending the actual preview CLI/API. Do not substitute a JSON file copy for a process checkpoint.

### Recovery and coordination

Before resolving any `runtime.actions` entry marked `pending`, inspect the corresponding external service. For an uncertain study insertion, locate the event by its recorded start time and record its real ID in the mutation log before marking the action complete. If the external action did not happen, remove its pending entry only after confirming that fact. Never delete the whole state file to clear an error while calendar changes remain outstanding. Restore known calendar mutations with `undo-all`; it reports unresolved insertions and failed undos.

CS handoff (updated): Google auth/calendar/email and roast modules are now implemented. Live verification awaits credentials; see the CS setup section. Preserve the shared signatures. Calendar event start/end must be ISO datetimes with the calendar's timezone; propagate Google 404/410 on missing delete targets. The loop journals renames, but an insertion interrupted before its ID returns requires reconciliation because the frozen insertion interface accepts no idempotency key.

EE handoff: profile verification will supply STEEL_PROFILE_ID after credentials arrive. `armCompose` must return a live session without pressing Send. Optional `runtime.armed` contains the returned session ID/live URL. Release clears local drafts and closes the armed browser through the additional `cancelCompose` interface. For simulation, launch the dashboard with the same AMMA_STATE_PATH as the loop.

No Discord messages were sent. Main merges remain at team sync points. Devpost submission, registration, live overnight run, checkpoint capture and two restores, the live integration video, and in-person rehearsals remain pending the team's integrations/access and event readiness.

### Verification recorded in this task

`npx tsc --noEmit` and `npx tsx src/scripts/verify.ts` passed. The 90-second stub simulation reached calm, nudging, invasive, hostile, armed and fired with 15 email records and exactly one compose call. No live messages, calendar changes, or Instagram posts occurred. Simulation evidence is local at `/tmp/amma-vian-sim-20260912.log`; the separate test state is `/tmp/amma-vian-sim-20260912.json`. Temporary files are not submission assets.


## CS implementation and setup (current)

Vian explicitly authorized completing CS's assigned files in this task. Shared types/config remain frozen. Google auth, Calendar, Gmail and OpenRouter generation are implemented on `cs`, along with verification and a reversible milestone check. Reminder destination is configured in the ignored local `.env`.

### Google setup

1. Sign into [Google Cloud Console](https://console.cloud.google.com/) with the chosen Gmail account. Create a project named AMMA. Enable **Google Calendar API** and **Gmail API** through APIs & Services → Library.
2. Configure Google Auth Platform branding: app name AMMA; your email as support and developer contact. Audience: External; keep Testing mode and add your Gmail as a test user.
3. Configure the two scopes: `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/gmail.send`.
4. Create an OAuth client of type **Desktop app**, named AMMA Local. Store its client ID and secret in `.env`. For a Web application client instead, register `http://127.0.0.1:3001/oauth2callback` as the exact authorized redirect URI.
5. Run `npx tsx src/google/auth.ts`. Open the printed consent URL, choose the test Gmail account and grant both scopes. The callback uses PKCE and state validation. It stores only the refresh token in `.env` with mode 0600, preserving other settings. No token is printed. Testing-mode refresh tokens may need reauthorization after the event.

Required local variables:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_EMAIL=your-gmail-address@gmail.com
GOOGLE_CALENDAR_ID=primary
GOOGLE_TIME_ZONE=America/Toronto
GOOGLE_REDIRECT_URI=http://127.0.0.1:3001/oauth2callback
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
DEMO_MODE=true
AUTO_SEND=false
```

`GOOGLE_EMAIL` is the reminder destination; no extra Gmail read/profile scope is requested. If GOOGLE_TIME_ZONE is omitted, the calendar's timezone is obtained from events.list. Dates expand correctly across daylight-saving changes, including all-day events. Event listings are paginated and recurring occurrences are expanded. Calendar renames patch only summary and use sendUpdates=none; write failures propagate for the loop's recovery journal. Missing deletes preserve HTTP 404/410 for undo handling.

### OpenRouter setup

Sign in to [OpenRouter keys](https://openrouter.ai/settings/keys), create an AMMA key and store it as OPENROUTER_API_KEY. The default is a compatible free model. Vian requested no spending, so billing setup was skipped and no credits were purchased. OPENROUTER_MODEL can select another compatible free model. Generated responses are validated JSON; timeouts, malformed responses or provider outages produce a logged local wording fallback. A missing key is a configuration error rather than silently claiming a live model call.

Prompts use stage, time remaining, ignored email count, study minutes and actual event titles. Event titles are treated as data, not instructions. The email body retains exact caption previews/diffs and the live URL supplied by the loop. Released messages are supportive, and generated copy must not claim automatic posting.

### Verification and first milestone

```sh
npx tsc --noEmit
npx tsx src/scripts/verify.ts
npx tsx src/scripts/verify-cs.ts
# Live: sends one reminder to GOOGLE_EMAIL and creates/renames/deletes its own temporary event.
AMMA_STATE_PATH=/tmp/amma-google-live-check.json npx tsx src/scripts/google-smoke.ts
# Offline: exercises the same milestone without external API calls.
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-google-offline-check.json npx tsx src/scripts/google-smoke.ts
```

The live check logs the event's recovery data in its separate state file, restores the original title and deletes the temporary event. Repeating a completed check does not send another email. Use `AMMA_STATE_PATH=/tmp/amma-google-live-check.json npm run undo-all` for cleanup if interrupted; uncertain insertions require reconciliation as described above.

AMMA_OFFLINE=true explicitly uses process-local calendar fixtures, logged emails and local roast wording; the loop also skips opening Instagram. Fixtures are a rehearsal aid, not durable calendar storage. State records whether integrations were offline or live and refuses mismatched mode reuse, preventing a rehearsal's undo IDs from being applied to a real calendar. The supervisor refuses offline mode.

Verification covers the real SDK request construction via mock transport, DST and all-day event boundaries, pagination, error codes, Unicode MIME and header-injection rejection, OAuth callback/PKCE/private token persistence, OpenRouter response validation and fallback, plus the existing loop recovery suite. No successful live API call is claimed until account setup and the live milestone complete.

Implementation references: [Google desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Calendar events.list](https://developers.google.com/calendar/api/v3/reference/events/list), [Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending), [OpenRouter chat API](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion).


### Account setup progress

The AMMA Google Cloud project was created (`striped-century-508420-b6`). Calendar and Gmail APIs are enabled. Google Auth Platform is configured as External/Testing; the requested Gmail account is added as a test user and only calendar.events and gmail.send are declared. Desktop credential creation is prepared as AMMA Local and awaits the requested confirmation.

OpenRouter account setup is complete. The AMMA Hackathon API key is saved in the ignored local `.env`, with a seven-day expiry and a US$5 lifetime cap; no funds were added, and the application is configured for `nvidia/nemotron-3-super-120b-a12b:free`. A real structured email-generation request succeeded with HTTP 200 and reported cost 0. An unused default key created automatically by onboarding was disabled. The free model can be rate limited; the generation module logs its fallback if that happens. Key values are never included in this document.

The offline CS milestone and full 90-second ladder passed, reaching fired with 16 email records in the separate offline state. The live Google milestone remains pending OAuth credential creation and the account owner's consent.


## EE implementation handoff — September 12, 2026

Branch `ee` includes Vian and CS work without merging main. Vian authorized all three roles. Frozen types/config are unchanged.

- `src/insta/login.ts`: manual login via the Steel viewer, release/reopen profile proof, then atomic private `.env` profile-ID save. Uses the authorized personal Instagram account; no password is collected by AMMA.
- `src/insta/post.ts`: attach through Steel CDP, upload a local JPEG/PNG as a remote file buffer, advance through Next, fill/verify the complete caption, and leave Share enabled for the human. The loop never calls `fireNow`; demo defaults reject that function. Successful compose sessions stay open. `mark-done` releases the session and restores Calendar even when closure fails; closure failures retain recovery state for retry.
- Dashboard: one static responsive HTML page with shared-clock countdown, five-stage ladder, caption preview, Calendar/email/study totals, recent activity, fullscreen control and a validated Steel viewer link. Offline mode is labeled and hides the viewer. Connection failure pauses the timer. The JSON endpoint omits photo paths, session IDs and action-journal keys; server binds to localhost by default.
- Seven-slide editable deck: `artifacts/AMMA.pptx`. PDF copy: `artifacts/AMMA.pdf`. Dark background, one accent, one font, 30pt minimum, speaker notes and rehearsal cues. The three wildcard points are on slide 6; their full original wording is in the notes to preserve large type. Cloud deployment, overnight and checkpoint claims are clearly marked pending.
- `artifacts/AMMA_offline_rehearsal.webm` records the actual dashboard during a full 90-second accelerated simulation plus release. This is an OFFLINE rehearsal, not evidence of live Google/Instagram or a Steel Computer checkpoint. `artifacts/dashboard.png` is the rehearsal dashboard at the deadline.

Verification:

```bash
npx tsc --noEmit
npx tsx src/scripts/verify.ts
npx tsx src/scripts/verify-cs.ts
npx tsx src/scripts/verify-ee.ts
```

EE tests use an isolated browser fixture and temporary state. They check upload bytes, full caption retention, zero Share clicks, unexpected-origin rejection, sending disabled, state redaction, mobile overflow, connection failure and release display. The loop suite also checks failed browser closure, Calendar restoration despite closure failure, and successful retry. Fixture success does not prove current Instagram selectors or profile persistence against the live service.

Run a new offline rehearsal in two terminals using the SAME fresh state path:

```bash
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-ee-rehearsal-new.json HOSTAGE_PHOTO=photos/aurafarmer.jpg npm run sim
AMMA_OFFLINE=true AMMA_STATE_PATH=/tmp/amma-ee-rehearsal-new.json npm run dash
```

Open http://127.0.0.1:3000. To record another rehearsal, `npx tsx src/scripts/record-demo.ts` creates isolated state under ignored photos/ and replaces the local rehearsal video. Playwright Chromium, or installed macOS Chrome, and Playwright FFmpeg are required. The recorder does not use the user's signed-in browser profile.

Still required for the live demo: Steel API key and profile verification; Google OAuth credential creation approval, user consent and live smoke test; Steel Computer preview access, overnight run and two checkpoint restores; team registration/submission access and a second physical laptop. No purchases, billing setup, messages to teammates or Instagram posts were made. The slides and rehearsal can be copied to the second laptop when it is available.


## Live account setup — September 12, 2026, 16:40 Toronto

Vian authorized completing the remaining setup without spending money, then separately approved Google's final Calendar-events/Gmail-send access grant and Steel API-key creation/free-credit use. Devpost work is explicitly deferred.

- Existing AMMA Local Desktop OAuth client downloaded and stored privately. Both scopes granted and refresh token saved in `.env`. No Gmail read scope requested.
- Real Google smoke check passed with `AMMA_OFFLINE` disabled, state `/tmp/amma-google-live-check-20260912.json`: 1 email record, integrationMode live, 0 unrestored mutations. The temporary event was created, renamed, restored and deleted. No pre-existing calendar events were modified.
- Steel account/workspace `AMMA — Sharma Ji Ka Bot` created under the chosen Google account. API key generated and stored privately. Wallet displayed $30 included credits, $0 purchased credits, no payment methods and no purchases. No billing/top-up configured.
- A real Steel Browser session launched and loaded Instagram's login screen. User sign-in and release/reopen profile verification are in progress. No Instagram post submitted.
- Official public Steel docs and the event resource page provide Browser APIs, but no usable Computer beta installer or checkpoint access. A workshop/mentor access link is needed before deployment or whole-computer restore claims.
- Event submission page found: https://battle-of-the-schools.devpost.com/. Team registration: https://forms.gle/8jDCNgBJJcedAVai6. Vian is admitted; teammates are Asad Ullah Qureshi and Aditya Vignesh Kumar. No form or Devpost submission made.

`README.md` now documents an explicitly offline default rehearsal, live setup, recovery and verified limitations. Google credential files remain local/ignored; the downloaded JSON has owner-only permissions.
