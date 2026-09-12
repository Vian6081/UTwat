import { tick } from "../loop";
import { loadState, saveState, withStateLock } from "../state";
async function main() {
  await withStateLock(async () => { const state = loadState(); state.done = true; saveState(state); });
  await tick();
  console.log("[mark-done] Released. If a browser was armed, close its compose window without posting.");
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
