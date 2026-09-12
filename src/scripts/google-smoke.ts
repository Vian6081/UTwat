import { now } from "../clock";
import { listEventsToday, insertStudyBlock, renameEvent } from "../google/calendar";
import { sendNag } from "../google/gmail";
import { undoMutations } from "../loop";
import { defaultState, loadState, runtime, saveState, STATE_PATH, withStateLock } from "../state";
import * as fs from "fs";

async function main() {
  // Keep this milestone's mutations separate from the active escalation run.
  if (!process.env.AMMA_STATE_PATH) throw new Error("Use a separate state path: AMMA_STATE_PATH=/tmp/amma-google-check.json npx tsx src/scripts/google-smoke.ts");
  await withStateLock(async () => {
    const state = fs.existsSync(STATE_PATH) ? loadState() : defaultState();
    const actions = runtime(state).actions;
    if (Object.values(actions).includes("pending")) throw new Error("Previous smoke check has an uncertain action. Inspect its state and reconcile before retrying.");
    const events = await listEventsToday();
    console.log(`[google-check] Read ${events.length} events today.`);
    if (!actions["smoke:email"]) {
      actions["smoke:email"] = "pending"; saveState(state);
      const message = { subject: "AMMA setup check", body: "Google Calendar and Gmail are connected. This is your one-time AMMA setup email." };
      await sendNag(message.subject, message.body);
      state.emailsSent.push({at:now().toISOString(),...message});
      actions["smoke:email"]="complete"; saveState(state);
    }
    if (!actions["smoke:calendar"]) {
      const start=new Date(now().getTime()+60_000).toISOString();
      const key=`insert:${start}`;
      actions[key]="pending"; saveState(state);
      const id=await insertStudyBlock(start,5);
      state.mutations.push({eventId:id,originalTitle:"",newTitle:"STUDY BLOCK",at:now().toISOString(),undone:false});
      actions[key]="complete"; saveState(state);
      try {
        state.mutations.push({eventId:id,originalTitle:"STUDY BLOCK",newTitle:"AMMA setup verified",at:now().toISOString(),undone:false});
        saveState(state);
        await renameEvent(id,"AMMA setup verified");
        actions["smoke:calendar"]="complete"; saveState(state);
      } finally { await undoMutations(state); }
    } else { await undoMutations(state); }
    console.log("[google-check] Email sent; temporary event created, renamed, restored and deleted. In offline mode these are simulated.");
  });
}
if (require.main === module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
