import * as fs from "fs";
import { EMAIL_INTERVAL_MS, STAGE_THRESHOLDS } from "./config";
import { now, startSimulation } from "./clock";
import * as calendar from "./google/calendar";
import { sendNag } from "./google/gmail";
import { offline } from "./google/auth";
import { armCompose, cancelCompose } from "./insta/post";
import * as roast from "./roast/generate";
import { defaultState, loadState, runtime, RuntimeState, saveState, STATE_PATH, withStateLock } from "./state";
import { CalendarEvent, Stage } from "./types";

export const defaultServices = { ...calendar, ...roast, sendNag, cancelCompose,
  armCompose: async (photo: string, caption: string) => {
    if (offline() && process.env.AMMA_INSTAGRAM_MODE!=="mock") { console.log("[offline] Compose prepared; no browser opened."); return { sessionId: "offline-session", liveViewUrl: "about:blank" }; }
    return armCompose(photo, caption);
  },
};
export type Services = typeof defaultServices;
const ORDER: Stage[] = ["calm", "nudging", "invasive", "hostile", "armed", "fired", "released"];
const SOCIAL = /drink|hang|party|friday|dinner|movie|game|free|social|plans|brunch|club/i;
export function stageFor(h: number, done = false): Stage {
  if (done) return "released";
  if (h <= 0) return "fired";
  if (h < STAGE_THRESHOLDS.armed) return "armed";
  if (h <= STAGE_THRESHOLDS.hostile) return "hostile";
  if (h <= STAGE_THRESHOLDS.invasive) return "invasive";
  if (h <= STAGE_THRESHOLDS.nudging) return "nudging";
  return "calm";
}
function context(state: RuntimeState) {
  return `reminders sent: ${state.emailsSent.length} (read status unknown); study minutes: ${state.studyMinutesLogged}; events: ${state.mutations.map(m => m.originalTitle || m.newTitle).join(", ")}; study slots: ${(state.runtime?.studyPlan || []).map(start => new Date(start).toLocaleString("en-CA", {timeZone: process.env.GOOGLE_TIME_ZONE || "America/Toronto", hour: "2-digit", minute: "2-digit", month: "short", day: "numeric"}) + " (60 min)").join(", ") || "none scheduled"}; deadline: ${state.deadlineISO}`;
}
// A pending action may have succeeded remotely. Never blindly repeat an uncertain side effect.
async function once(state: RuntimeState, key: string, work: () => Promise<void>) {
  const actions = runtime(state).actions;
  if (actions[key] === "complete") return;
  if (actions[key] === "pending") throw new Error(`Uncertain external action: ${key}. Reconcile with the service before retrying; recovery data is in state.json.`);
  actions[key] = "pending"; saveState(state);
  await work();
  actions[key] = "complete"; saveState(state);
}
async function email(state: RuntimeState, key: string, stage: Stage, h: number, services: Services, extra = "") {
  await once(state, key, async () => {
    const message = await services.generateEmail(stage, h, `${context(state)} ${extra}`);
    await services.sendNag(message.subject, message.body);
    state.emailsSent.push({ at: now().toISOString(), ...message });
  });
}
async function draft(state: RuntimeState, stage: Stage, services: Services) {
  const existing = state.drafts.find(d => d.stage === stage);
  if (existing) return existing.caption;
  const caption = await services.generateCaption(stage, context(state));
  state.drafts.push({ at: now().toISOString(), stage, caption }); saveState(state);
  return caption;
}
export function freeStudySlots(events: CalendarEvent[], start: number, deadline: number, count = 2): string[] {
  const busy = events.map(e => [Date.parse(e.start), Date.parse(e.end)])
    .filter(([a,b]) => Number.isFinite(a) && Number.isFinite(b) && b > start && a < deadline)
    .sort((a,b) => a[0]-b[0]);
  const slots: string[] = [];
  let cursor = start;
  for (const [a,b] of [...busy, [deadline, deadline]]) {
    while (slots.length < count && cursor + 3_600_000 <= Math.min(a, deadline)) {
      slots.push(new Date(cursor).toISOString()); cursor += 3_600_000;
    }
    cursor = Math.max(cursor, b);
  }
  return slots;
}
async function studyBlocks(state: RuntimeState, services: Services) {
  if (runtime(state).actions["nudging:blocks"] === "complete") return;
  // Persist the plan before creating anything so restart uses identical action keys.
  const actions = runtime(state).actions;
  const planned = runtime(state).studyPlan ||= freeStudySlots(
    await services.listEventsToday(), Math.ceil((now().getTime() + 30 * 60_000) / (30 * 60_000)) * (30 * 60_000),
    // listEventsToday cannot guarantee tomorrow's availability.
    Math.min(Date.parse(state.deadlineISO), new Date(now().getFullYear(), now().getMonth(), now().getDate() + 1).getTime()));
  saveState(state);
  if (planned.length < 2) console.log(`[amma] Only ${planned.length} free study slot(s) before today ends; no overlaps created.`);
  for (const start of planned) {
    await once(state, `insert:${start}`, async () => {
      const id = await services.insertStudyBlock(start, 60);
      state.mutations.push({ eventId: id, originalTitle: "", newTitle: "STUDY BLOCK", at: now().toISOString(), undone: false });
    });
  }
  actions["nudging:blocks"] = "complete"; saveState(state);
}
async function renameTargets(state: RuntimeState, services: Services, stage: Stage, h: number) {
  const events = await services.listEventsToday();
  for (const event of events) {
    if (stage === "invasive" && !SOCIAL.test(event.title)) continue;
    const prior = state.mutations.find(m => m.eventId === event.id && !m.undone);
    if (prior) continue;
    const title = await services.generateEventTitle(event.title, h);
    state.mutations.push({ eventId: event.id, originalTitle: event.title, newTitle: title, at: now().toISOString(), undone: false });
    saveState(state); // Write-ahead undo record, even if rename throws after reaching Google.
    await once(state, `rename:${event.id}`, () => services.renameEvent(event.id, title));
  }
}
export async function undoMutations(state: RuntimeState, services: Services = defaultServices) {
  const failures: string[] = [];
  for (const mutation of [...state.mutations].reverse()) {
    if (mutation.undone) continue;
    try {
      if (mutation.originalTitle === "" && mutation.newTitle === "STUDY BLOCK") {
        try { await services.deleteEvent(mutation.eventId); }
        catch (error: any) { if (![404, 410].includes(Number(error.code || error.response?.status))) throw error; }
      } else await services.renameEvent(mutation.eventId, mutation.originalTitle);
      mutation.undone = true; saveState(state);
    } catch { failures.push(mutation.eventId); }
  }
  const uncertainInserts = Object.entries(runtime(state).actions).filter(([k,v]) => k.startsWith("insert:") && v === "pending");
  if (failures.length || uncertainInserts.length) throw new Error(`Undo incomplete: ${failures.join(", ")}; uncertain study insertions: ${uncertainInserts.map(([k]) => k).join(", ")}`);
}
export async function armState(state: RuntimeState, services: Services = defaultServices) {
  if (state.done || state.stage === "released") throw new Error("Work is done; refusing to arm");
  if (!runtime(state).armed && !state.hostagePhoto) throw new Error("Set HOSTAGE_PHOTO to a copy of your solo photo before arming");
  await once(state, "arm:compose", async () => {
    const caption = state.drafts.at(-1)?.caption || await draft(state, "armed", services);
    if (!state.hostagePhoto) throw new Error("Set HOSTAGE_PHOTO to a copy of your solo photo before arming");
    runtime(state).armed = await services.armCompose(state.hostagePhoto, caption);
  });
  return runtime(state).armed;
}
export async function tick(services: Services = defaultServices): Promise<RuntimeState> {
  return withStateLock(async () => {
    const state = loadState();
    const h = (Date.parse(state.deadlineISO) - now().getTime()) / 3_600_000;
    const computed = stageFor(h, state.done);
    const next = computed === "released" || ORDER.indexOf(computed) > ORDER.indexOf(state.stage) ? computed : state.stage;
    const actions = runtime(state).actions;
    if (next !== "released") {
      const pending = Object.keys(actions).filter(key => actions[key] === "pending");
      if (pending.length) throw new Error(`Uncertain external actions require reconciliation: ${pending.join(", ")}`);
    }
    const entering = actions[`stage:${next}`] !== "complete";
    if (entering) {
      state.stage = next; saveState(state);
      console.log(`[amma] ${next} (${h.toFixed(2)}h left)`);
      if (next === "released") {
        state.drafts = []; saveState(state);
        let cancelError: unknown;
        try { await services.cancelCompose(runtime(state).armed?.sessionId); delete runtime(state).armed; saveState(state); }
        catch (error) { cancelError = error; }
        await undoMutations(state, services);
        if (cancelError) throw cancelError;
        await email(state, "email:released", next, h, services, "Work complete. Calendar restored. Armed browser closed.");
      } else {
        // A short run can enter invasive directly; still create its study plan.
        if (["nudging", "invasive", "hostile"].includes(next)) await studyBlocks(state, services);
        if (next === "invasive" || next === "hostile") await renameTargets(state, services, next, h);
        const caption = await draft(state, next, services);
        if (next === "armed" || next === "fired") await armState(state, services);
        const previous = state.drafts.at(-2)?.caption || "(none)";
        await email(state, `email:${next}`, next, h, services,
          next === "hostile" ? `Caption diff: ${previous} -> ${caption}` :
          next === "armed" || next === "fired" ? `It's loaded. Waiting for a human. ${runtime(state).armed?.liveViewUrl}` : `Caption preview: ${caption}`);
      }
      actions[`stage:${next}`] = "complete";
    } else if (next in EMAIL_INTERVAL_MS) {
      const interval = EMAIL_INTERVAL_MS[next as keyof typeof EMAIL_INTERVAL_MS];
      const last = state.emailsSent.at(-1);
      if (!last || now().getTime() - Date.parse(last.at) >= interval) {
        await email(state, `periodic:${next}:${state.emailsSent.length}`, next, h, services);
      }
    }
    state.lastCheckISO = now().toISOString(); saveState(state);
    return state;
  });
}
export async function main() {
  const sim = process.argv.includes("--sim") || process.env.SIM === "1";
  if (sim) {
    await withStateLock(async () => {
      if (fs.existsSync(STATE_PATH)) throw new Error("Simulation needs a fresh state path. Preserve the existing undo log; use AMMA_STATE_PATH=/tmp/amma-demo.json npm run sim.");
      startSimulation();
      const state = defaultState(); runtime(state).sim = true;
      runtime(state).simClock = { startISO: now().toISOString(), wallISO: new Date().toISOString(), speed: 720 };
      saveState(state);
    });
  }
  let stopping = false;
  process.once("SIGINT", () => { stopping = true; });
  process.once("SIGTERM", () => { stopping = true; });
  while (!stopping) {
    const state = await tick();
    if (state.stage === "released" || (sim && state.stage === "fired")) break;
    await new Promise(resolve => setTimeout(resolve, sim ? 100 : 1000));
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
