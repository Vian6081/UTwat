import * as fs from "fs";
import * as path from "path";
import { now } from "./clock";
import { DEFAULT_DEADLINE_HOURS } from "./config";
import { AppState } from "./types";

const STATE_PATH = path.join(process.cwd(), "state.json");

export function defaultState(): AppState {
  const deadline = new Date(
    now().getTime() + DEFAULT_DEADLINE_HOURS * 60 * 60 * 1000
  );
  return {
    deadlineISO: deadline.toISOString(),
    stage: "calm",
    done: false,
    studyMinutesLogged: 0,
    mutations: [],
    drafts: [],
    emailsSent: [],
    hostagePhoto: "photos/hostage.jpg",
    lastCheckISO: null,
  };
}

export function loadState(): AppState {
  if (!fs.existsSync(STATE_PATH)) {
    const fresh = defaultState();
    saveState(fresh);
    return fresh;
  }
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  return JSON.parse(raw) as AppState;
}

export function saveState(state: AppState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
