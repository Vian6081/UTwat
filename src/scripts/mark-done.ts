import { loadState, saveState } from "../state";

const state = loadState();
state.done = true;
saveState(state);
console.log("[mark-done] done=true — loop will jump to released");
