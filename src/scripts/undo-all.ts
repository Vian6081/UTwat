import { deleteEvent, renameEvent } from "../google/calendar";
import { loadState, saveState } from "../state";

async function main(): Promise<void> {
  const state = loadState();
  let restored = 0;
  for (const m of state.mutations) {
    if (m.undone) continue;
    if (!m.originalTitle) {
      await deleteEvent(m.eventId);
    } else {
      await renameEvent(m.eventId, m.originalTitle);
    }
    m.undone = true;
    restored += 1;
  }
  saveState(state);
  console.log(`[undo-all] restored ${restored} mutation(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
