import * as fs from "fs";
import * as path from "path";
import { now } from "./clock";
import { DEFAULT_DEADLINE_HOURS } from "./config";
import { AppState, Stage } from "./types";

// Private runtime metadata is additive; the frozen shared contract is unchanged.
export type RuntimeState = AppState & {
  runtime?: {
    actions: Record<string, "pending" | "complete">;
    armed?: { sessionId: string; liveViewUrl: string };
    sim?: boolean;
    integrationMode?: "offline" | "live";
    studyPlan?: string[];
    simClock?: { startISO: string; wallISO: string; speed: number };
  };
};
export const STATE_PATH = path.resolve(process.env.AMMA_STATE_PATH || "state.json");
export function defaultState(): RuntimeState {
  const deadlineISO = process.env.DEADLINE_ISO || new Date(now().getTime() + DEFAULT_DEADLINE_HOURS * 3_600_000).toISOString();
  if (!Number.isFinite(Date.parse(deadlineISO))) throw new Error("Invalid DEADLINE_ISO");
  return { deadlineISO, stage: "calm", done: false, studyMinutesLogged: 0,
    mutations: [], drafts: [], emailsSent: [], hostagePhoto: process.env.HOSTAGE_PHOTO || null, lastCheckISO: null };
}
export function loadState(): RuntimeState {
  if (!fs.existsSync(STATE_PATH)) return defaultState();
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const mode = process.env.AMMA_OFFLINE === "true" ? "offline" : "live";
  if (state.runtime?.integrationMode && state.runtime.integrationMode !== mode) throw new Error(`State was created in ${state.runtime.integrationMode} mode. Use a separate AMMA_STATE_PATH or the matching AMMA_OFFLINE setting.`);
  const stages: Stage[] = ["calm", "nudging", "invasive", "hostile", "armed", "fired", "released"];
  if (!Number.isFinite(Date.parse(state.deadlineISO)) || !stages.includes(state.stage) ||
      typeof state.done !== "boolean" || !Array.isArray(state.mutations) ||
      !Array.isArray(state.drafts) || !Array.isArray(state.emailsSent)) throw new Error("Invalid state.json; refusing to replace recovery data");
  return state;
}
export function saveState(state: AppState): void {
  const meta = runtime(state);
  meta.integrationMode = process.env.AMMA_OFFLINE === "true" ? "offline" : "live";
  const temp = `${STATE_PATH}.${process.pid}.tmp`;
  const fd = fs.openSync(temp, "w", 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(state, null, 2) + "\n"); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temp, STATE_PATH);
}
export function runtime(state: RuntimeState) {
  return state.runtime ||= { actions: {} };
}
export async function withStateLock<T>(work: () => Promise<T>): Promise<T> {
  const lock = `${STATE_PATH}.lock`;
  const started = performance.now();
  while (true) {
    try {
      const fd = fs.openSync(lock, "wx", 0o600);
      fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); break;
    } catch (error: any) {
      if (error.code !== "EEXIST") throw error;
      let owner = 0;
      try { owner = Number(fs.readFileSync(lock, "utf8")); } catch {}
      if (owner > 0) {
        try { process.kill(owner, 0); }
        catch (e: any) { if (e.code === "ESRCH") { try { fs.unlinkSync(lock); } catch {} continue; } }
      }
      if (performance.now() - started > 120_000) throw new Error("State is busy; another command still owns the lock");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  try { return await work(); }
  finally { fs.unlinkSync(lock); }
}
