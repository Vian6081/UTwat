import { armCompose } from "../insta/post";
import { loadState } from "../state";

async function main(): Promise<void> {
  const state = loadState();
  const caption =
    state.drafts[state.drafts.length - 1]?.caption ??
    "It's loaded. You know what you did.";
  const photo = state.hostagePhoto ?? "photos/hostage.jpg";
  const result = await armCompose(photo, caption);
  console.log("[arm]", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
