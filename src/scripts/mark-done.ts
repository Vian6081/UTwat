import {markDoneAfterCanvasCheck} from "../canvas/server";
import {offline} from "../google/auth";
import { tick } from "../loop";
import { loadState, saveState, withStateLock } from "../state";
async function main() {
  if(offline())await withStateLock(async () => { const state = loadState(); state.done = true; saveState(state); });
  else if(!(await markDoneAfterCanvasCheck()).accepted)throw Error("Submit your assignment in the Canvas replica before marking work done.");
  await tick();
  console.log("[mark-done] Released. Calendar restored and armed browser closed.");
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
