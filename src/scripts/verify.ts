// Focused integration assertions using Node's built-in assert; no test framework.
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amma-verify-"));
process.env.AMMA_STATE_PATH = path.join(directory, "state.json");
const { setClock } = require("../clock") as typeof import("../clock");
const { tick, defaultServices, freeStudySlots, undoMutations, stageFor } = require("../loop") as typeof import("../loop");
const { defaultState, loadState, saveState, runtime, withStateLock } = require("../state") as typeof import("../state");
const base = Date.parse("2026-09-12T06:00:00Z");
let elapsed = 0;
function time(hours: number) { elapsed = hours; setClock(new Date(base + hours * 3_600_000).toISOString()); }
let sends = 0, arms = 0, failRename = false, failDelete = false, failInsert = false;
const events = [
  { id: "party", title: "Friday drinks", start: "2026-09-12T13:00:00Z", end: "2026-09-12T15:00:00Z" },
  { id: "lecture", title: "Lecture", start: "2026-09-12T17:00:00Z", end: "2026-09-12T18:00:00Z" },
  { id: "untitled", title: "", start: "2026-09-12T19:00:00Z", end: "2026-09-12T20:00:00Z" },
];
const titles = new Map(events.map(e => [e.id, e.title]));
const inserted: string[] = [];
const services: import("../loop").Services = {
  ...defaultServices,
  listEventsToday: async () => events.map(e => ({...e, title: titles.get(e.id)!})),
  generateEmail: async stage => ({ subject: stage, body: `at ${elapsed}` }),
  generateCaption: async stage => `caption:${stage}`,
  generateEventTitle: async title => `${title}: study`,
  sendNag: async () => { sends++; },
  renameEvent: async (id, title) => {
    assert(loadState().mutations.some(m => m.eventId === id), "undo record exists before rename");
    if (failRename) throw new Error("network failure");
    titles.set(id, title);
  },
  insertStudyBlock: async start => {
    assert.equal(runtime(loadState()).actions[`insert:${start}`], "pending");
    if (failInsert) throw new Error("uncertain insert");
    inserted.push(start); return `study-${start}`;
  },
  deleteEvent: async id => { if (failDelete) throw new Error("delete failed"); assert(id.startsWith("study-")); },
  armCompose: async () => { arms++; return { sessionId: "verified-stub", liveViewUrl: "https://example.invalid/live" }; },
};
function fresh() {
  time(0); const state = defaultState(); state.deadlineISO = new Date(base + 18 * 3_600_000).toISOString();
  state.hostagePhoto = "photos/aurafarmer.jpg"; saveState(state);
}
async function main() {
  assert.equal(stageFor(12), "nudging"); assert.equal(stageFor(6), "invasive");
  assert.equal(stageFor(2), "hostile"); assert.equal(stageFor(.25), "hostile");
  assert.equal(stageFor(.249), "armed"); assert.equal(stageFor(0), "fired");
  assert.equal(stageFor(100, true), "released");
  fresh();
  const seen: string[] = [];
  for (const hours of [0, 6, 12, 16, 17.8, 18]) { time(hours); seen.push((await tick(services)).stage); }
  assert.deepEqual(seen, ["calm", "nudging", "invasive", "hostile", "armed", "fired"]);
  assert.equal(arms, 1); assert.equal(sends, 6); assert.equal(inserted.length, 2);
  for (const start of inserted) for (const event of events) {
    assert(Date.parse(start) + 3_600_000 <= Date.parse(event.start) || Date.parse(start) >= Date.parse(event.end));
  }
  const before = sends; await tick(services); assert.equal(sends, before, "restart does not duplicate transition email");
  time(1); assert.equal((await tick(services)).stage, "fired", "clock rollback does not de-escalate");
  const state = loadState(); state.done = true; saveState(state);
  await tick(services); await tick(services);
  assert.equal(loadState().stage, "released"); assert.equal(loadState().drafts.length, 0);
  assert(loadState().mutations.every(m => m.undone)); assert.equal(titles.get("untitled"), "");
  assert.equal(sends, before + 1, "release email once");
  fresh(); time(6); await tick(services); const first = sends;
  time(7); await tick(services); assert.equal(sends, first);
  time(8); await tick(services); assert.equal(sends, first + 1);
  fresh(); time(12); failRename = true;
  await assert.rejects(tick(services));
  assert.equal(loadState().mutations[0].originalTitle, "Friday drinks");
  await assert.rejects(tick(services), /reconciliation/);
  failRename = false; const failed = loadState(); failed.done = true; saveState(failed);
  await tick(services); assert(loadState().mutations.every(m => m.undone));
  fresh(); time(6); failInsert = true; await assert.rejects(tick(services)); failInsert = false;
  await assert.rejects(withStateLock(() => undoMutations(loadState(), services)), /uncertain study insertions/);
  fresh(); time(6); await tick(services); failDelete = true;
  await assert.rejects(withStateLock(() => undoMutations(loadState(), services)), /Undo incomplete/);
  assert(loadState().mutations.some(m => !m.undone)); failDelete = false;
  await withStateLock(() => undoMutations(loadState(), services)); assert(loadState().mutations.every(m => m.undone));
  fresh(); await Promise.all([tick(services), tick(services)]);
  assert.equal(loadState().emailsSent.length, 1, "concurrent ticks serialize");
  assert.deepEqual(freeStudySlots([{id:"busy",title:"",start:new Date(base).toISOString(),end:new Date(base+8*3_600_000).toISOString()}],base,base+3_600_000), []);
  console.log("PASS: stage boundaries, ladder, cadence, restart, release, calendar gaps, write-ahead recovery, uncertain insertions, partial undo, concurrent state writes.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => fs.rmSync(directory, { recursive: true, force: true }));
