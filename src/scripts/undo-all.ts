import { undoMutations } from "../loop";
import { loadState, withStateLock } from "../state";
async function main() {
  await withStateLock(async () => {
    const state = loadState();
    await undoMutations(state);
    console.log("[undo-all] Calendar restored; running loop can make future changes. Use mark-done to release permanently.");
  });
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
