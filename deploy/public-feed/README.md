AMMA public feed

Deploy index.html and _worker.js to the existing amma-instagram-vian Pages project.
Bind a Workers KV namespace as POSTS and a secret as PUBLISH_TOKEN.
The Steel backend needs matching AMMA_PUBLISH_TOKEN, AMMA_PUBLIC_FEED_URL=https://amma-instagram-vian.pages.dev, and AMMA_PUBLIC_POSTING=true.
Never place a token in index.html or any public asset.

The live loop publishes the final caption and photo once the deadline passes unless work is verified. The feed serves the latest published post to every visitor. A stable deadline/photo identifier prevents duplicate posts. KV propagation can delay visibility across regions. Uncertain publication outcomes stop the loop for reconciliation; do not blindly reset its action journal.

Rehearsal/simulated states cannot publish. This integration never posts to real Instagram. Already published photos are not retracted by later homework completion.

Before deployment remove this README from the upload directory or deploy a staging copy containing only index.html and _worker.js. No private photo is bundled as a public static asset; the publishing request supplies it at deadline.

Checks: npx tsc --noEmit; npx tsx src/scripts/verify-public-post.ts; node src/scripts/verify-feed.mjs

Deployment verified September 13, 2026:
- Shared website: https://amma-instagram-vian.pages.dev
- KV binding: POSTS (AMMA_POSTS namespace)
- Replacement Steel Computer: cmp_0366z583c0h32pts8m7xw9hj1tvfn
- Cloud application: /work/amma/src/deploy/cloud-run.ts
- Cloud state: /work/amma/photos/cloud-publishing-state.json
- Private dashboard relay: http://127.0.0.1:3004
- The original six-hour run was preserved on cmp_036435grwqp7td6fcv3dsz9tzwjmv, which could not resume.
- Replacement computer pauses after four hours of running time. No billing was added.
- The local 18-hour presentation replay remains simulated and cannot publish.
