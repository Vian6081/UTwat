# Project name
AMMA

# Tagline
Your deadline has a parent now. A cloud agent that sends reminders, makes time to work, checks submission receipts, and publishes your chosen photo if you miss the deadline.

# Inspiration
We do not have a shortage of reminders. We have a shortage of consequences for dismissing them. As students, we know the cycle: set a deadline, ignore a notification, and panic later. We built AMMA around the energy of a caring, increasingly impatient parent: support first, accountability when it matters.

# What it does
AMMA — Autonomous Motivational Management Agent — watches a study deadline and escalates its response as time runs out. It sends real Gmail reminders and creates or adjusts study time in Google Calendar. Its dashboard makes the countdown, escalation stage and actions visible.

Saying “I'm done” is not enough. AMMA checks an assignment submission in our Canvas-style demo: the receipt must match the assignment and active deadline, and the PDF's stored bytes must match its integrity hash. A verified submission before expiry releases the session and prevents publication.

If the deadline expires without completion, AMMA automatically publishes the user's configured photo and a caption to our live Instagram-style website. The consequence is real publication on our own website; it does not post to Instagram. Completing work after publication does not retract the existing post.

# How we built it
The live agent runs as a Node.js and TypeScript process on Steel Computer. A 30-second loop evaluates deterministic deadline stages, while OpenRouter generates contextual wording. Express serves a custom HTML, CSS and JavaScript dashboard and the Canvas-style submission flow.

Google OAuth connects the Gmail API for sending reminders and the Calendar API for scheduling. The publication endpoint is a Cloudflare Pages Function backed by Workers KV. It accepts authenticated publication requests and serves a shared public feed, with image URLs tied to individual post IDs.

We persist state with atomic JSON writes, file locks and an action journal. If an external write has an uncertain outcome, the agent stops for reconciliation instead of blindly repeating it. We used Codex and Claude for AI-assisted implementation and design, then tested the behavior and connected the real services.

# Challenges we ran into
Moving from an attractive timer demo to a real agent meant coordinating persistent state, OAuth, scheduling, file verification and external writes. A failed request cannot simply be assumed to have failed: retrying it could duplicate a reminder or publication.

Real Instagram login was unreliable, so we built a separate Instagram-style destination with a real publication endpoint. We also dealt with cloud-computer resume failures and stale image caching. A replacement Steel Computer completed a short live run; post-specific image URLs resolved the photo mismatch.

# Accomplishments that we're proud of
We connected a deadline to observable actions: real Gmail reminders, Google Calendar study blocks, submission-receipt checks and an automatically published public photo.

A one-minute real-time run on Steel Computer reached the deadline, sent two Gmail messages and confirmed publication with no pending actions. Separate live checks verified Calendar study blocks. We also made an isolated 18-hour-in-30-seconds replay so the escalation can be explained within a three-minute presentation.

# What we learned
An agent is more than an LLM response. It needs state, explicit rules, durable receipts and a way to recover when the outside world is ambiguous. Deterministic policy and generated wording work well together: code decides what AMMA may do; the model helps express it.

We also learned to distinguish convincing presentation from evidence. A fast replay explains the product, while real service receipts establish which integrations actually ran.

# What's next for AMMA
Connect an authorized learning-management-system integration, improve scheduling preferences and recovery, and add a clearer consent and revocation flow around consequences. We would also add multi-user isolation and longer-duration reliability testing before offering AMMA beyond this prototype.

# Built with (tags)
TypeScript, Node.js, Express.js, JavaScript, HTML5, CSS3, Steel Computer, Steel SDK, OpenRouter, Gmail API, Google Calendar API, Google OAuth, Cloudflare Pages, Cloudflare Workers, Workers KV, Playwright

# Links
Source code: https://github.com/Vian6081/UTwat
Live publication website: https://amma-instagram-vian.pages.dev/
YouTube demo: ADD TEAMMATES' PUBLIC VIDEO URL

# Track selections / optional answers
Primary: Steel.dev Web Agents
Steel Computer: Our actual backend process runs on a Steel cloud computer, with terminal, files and persistent runtime state in that environment. Gmail and Calendar use APIs; we do not claim those actions are performed through desktop clicks.
Most Unhinged Idea: A deadline with a parent attached — and a user-chosen photo that actually goes public on our website when the deadline is missed.

# Credits and prototype scope
Built with AI coding and design assistance from Codex and Claude. Canvas- and Instagram-inspired interfaces are independent demo replicas, not affiliated with those services. Google integrations are real. The Canvas check verifies submission and file integrity, not academic correctness. The accelerated replay has no email, calendar or publication side effects. We do not claim the original six-hour overnight run completed: its cloud computer failed to resume.
