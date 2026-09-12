import { armState } from "../loop";
import { loadState, saveState, withStateLock } from "../state";
async function main() {
  await withStateLock(async () => {
    const state = loadState();
    const result = await armState(state);
    state.stage = state.stage === "fired" ? "fired" : "armed";
    saveState(state);
    console.log("[arm] Waiting for a human; no send action is called.", result);
  });
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
