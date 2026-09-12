import {
  config,
  DEFAULT_DEADLINE_HOURS,
  EMAIL_INTERVAL_MS,
  STAGE_THRESHOLDS,
} from "./config";
import { now } from "./clock";
import {
  deleteEvent,
  insertStudyBlock,
  listEventsToday,
  renameEvent,
} from "./google/calendar";
import { sendNag } from "./google/gmail";
import { armCompose, fireNow } from "./insta/post";
import {
  generateCaption,
  generateEmail,
  generateEventTitle,
} from "./roast/generate";
import { defaultState, loadState, saveState } from "./state";
import { AppState, CalendarEvent, Stage } from "./types";

const SIM = process.env.SIM === "1" || process.argv.includes("--sim");
const STAGE_ORDER: Stage[] = [
  "calm",
  "nudging",
  "invasive",
  "hostile",
  "armed",
  "fired",
  "released",
];
const SOCIAL_RE =
  /drink|hang|party|friday|dinner|movie|game|free|social|plans|brunch|club/i;

function rank(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

function hoursLeft(deadlineISO: string): number {
  return (new Date(deadlineISO).getTime() - now().getTime()) / 3_600_000;
}

function stageFor(h: number, done: boolean): Stage {
  if (done) return "released";
  if (h <= 0) return "fired";
  if (h < STAGE_THRESHOLDS.armed) return "armed";
  if (h <= STAGE_THRESHOLDS.hostile) return "hostile";
  if (h <= STAGE_THRESHOLDS.invasive) return "invasive";
  if (h <= STAGE_THRESHOLDS.nudging) return "nudging";
  return "calm";
}

function contextOf(state: AppState): string {
  const titles = state.mutations.map((m) => m.newTitle).join(", ");
  return `emails ignored: ${state.emailsSent.length}; hijacked events: ${state.mutations.filter((m) => !m.undone).length}; titles: ${titles || "(none)"}; study minutes: ${state.studyMinutesLogged}`;
}

function msSinceLastEmail(state: AppState): number {
  const last = state.emailsSent[state.emailsSent.length - 1];
  if (!last) return Infinity;
  return now().getTime() - new Date(last.at).getTime();
}

async function sendAndLog(
  state: AppState,
  stage: Stage,
  h: number,
  extra = ""
): Promise<void> {
  const email = await generateEmail(stage, h, `${contextOf(state)} ${extra}`.trim());
  await sendNag(email.subject, email.body);
  state.emailsSent.push({
    at: now().toISOString(),
    subject: email.subject,
    body: email.body,
  });
}

async function appendDraft(state: AppState, stage: Stage): Promise<string> {
  const caption = await generateCaption(stage, contextOf(state));
  state.drafts.push({ at: now().toISOString(), stage, caption });
  return caption;
}

function claimedIds(state: AppState): Set<string> {
  return new Set(
    state.mutations.filter((m) => !m.undone).map((m) => m.eventId)
  );
}

async function renameTargets(
  state: AppState,
  events: CalendarEvent[],
  h: number
): Promise<void> {
  const claimed = claimedIds(state);
  for (const ev of events) {
    if (claimed.has(ev.id)) continue;
    const newTitle = await generateEventTitle(ev.title, h);
    await renameEvent(ev.id, newTitle);
    state.mutations.push({
      eventId: ev.id,
      originalTitle: ev.title,
      newTitle,
      at: now().toISOString(),
      undone: false,
    });
  }
}

async function undoMutations(state: AppState): Promise<void> {
  for (const m of state.mutations) {
    if (m.undone) continue;
    if (!m.originalTitle) {
      await deleteEvent(m.eventId);
    } else {
      await renameEvent(m.eventId, m.originalTitle);
    }
    m.undone = true;
  }
}

async function enterStage(state: AppState, next: Stage): Promise<void> {
  const prev = state.stage;
  const h = hoursLeft(state.deadlineISO);
  if (prev === next) {
    console.log(`==> ${next}  (${h.toFixed(2)}h left)`);
  } else {
    console.log(`==> ${prev} → ${next}  (${h.toFixed(2)}h left)`);
  }
  state.stage = next;

  if (next === "calm") {
    await sendAndLog(state, "calm", h, "first polite ping");
  } else if (next === "nudging") {
    await sendAndLog(state, "nudging", h);
    const t1 = new Date(now().getTime() + 30 * 60 * 1000).toISOString();
    const t2 = new Date(now().getTime() + 3 * 60 * 60 * 1000).toISOString();
    const id1 = await insertStudyBlock(t1, 60);
    const id2 = await insertStudyBlock(t2, 60);
    for (const id of [id1, id2]) {
      state.mutations.push({
        eventId: id,
        originalTitle: "",
        newTitle: "STUDY BLOCK",
        at: now().toISOString(),
        undone: false,
      });
    }
    await appendDraft(state, "nudging");
  } else if (next === "invasive") {
    const events = await listEventsToday();
    const social = events.filter((e) => SOCIAL_RE.test(e.title));
    await renameTargets(state, social, h);
    const caption = await appendDraft(state, "invasive");
    await sendAndLog(state, "invasive", h, `caption preview: ${caption}`);
  } else if (next === "hostile") {
    const events = await listEventsToday();
    const unclaimed = events.filter((e) => !claimedIds(state).has(e.id));
    await renameTargets(state, unclaimed, h);
    const prevCaption = state.drafts[state.drafts.length - 1]?.caption ?? "";
    const caption = await appendDraft(state, "hostile");
    await sendAndLog(
      state,
      "hostile",
      h,
      `caption diff: "${prevCaption}" → "${caption}"`
    );
  } else if (next === "armed") {
    const caption =
      state.drafts[state.drafts.length - 1]?.caption ??
      (await appendDraft(state, "armed"));
    const photo = state.hostagePhoto ?? "photos/hostage.jpg";
    const armed = await armCompose(photo, caption);
    await sendAndLog(
      state,
      "armed",
      h,
      `It's loaded. liveView=${armed.liveViewUrl}`
    );
  } else if (next === "fired") {
    if (config.autoSend && !config.demoMode) {
      await fireNow();
    } else {
      console.log("[amma] deadline passed — waiting. AUTO_SEND is off.");
    }
  } else if (next === "released") {
    await undoMutations(state);
    state.drafts = [];
    await sendAndLog(state, "released", Math.max(h, 0), "they did the work");
  }

  state.lastCheckISO = now().toISOString();
  saveState(state);
}

async function periodic(state: AppState): Promise<void> {
  const h = hoursLeft(state.deadlineISO);
  const elapsed = msSinceLastEmail(state);

  if (state.stage === "nudging" && elapsed >= EMAIL_INTERVAL_MS.nudging) {
    await sendAndLog(state, "nudging", h, "periodic");
    saveState(state);
  } else if (
    state.stage === "invasive" &&
    elapsed >= EMAIL_INTERVAL_MS.invasive
  ) {
    await sendAndLog(state, "invasive", h, "periodic");
    saveState(state);
  } else if (
    state.stage === "hostile" &&
    elapsed >= EMAIL_INTERVAL_MS.hostile
  ) {
    await sendAndLog(state, "hostile", h, "periodic");
    saveState(state);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (SIM) {
    process.env.SIM = "1";
    const fresh = defaultState();
    fresh.deadlineISO = new Date(
      now().getTime() + DEFAULT_DEADLINE_HOURS * 60 * 60 * 1000
    ).toISOString();
    saveState(fresh);
    console.log(
      `[amma] SIM on — ${DEFAULT_DEADLINE_HOURS}h ladder, deadline ${fresh.deadlineISO}`
    );
  }

  let enteredCurrent = false;

  while (true) {
    const state = loadState();
    const h = hoursLeft(state.deadlineISO);
    const computed = stageFor(h, state.done);

    const shouldRelease =
      state.done && state.stage !== "released";
    const shouldEscalate =
      !shouldRelease && rank(computed) > rank(state.stage);

    if (shouldRelease) {
      await enterStage(state, "released");
    } else if (shouldEscalate) {
      await enterStage(state, computed);
      enteredCurrent = true;
    } else if (!enteredCurrent && state.lastCheckISO === null) {
      await enterStage(state, state.stage);
      enteredCurrent = true;
    } else {
      await periodic(state);
      state.lastCheckISO = now().toISOString();
      saveState(state);
    }

    const latest = loadState();
    if (latest.stage === "released") {
      console.log("[amma] released. ladder complete.");
      break;
    }
    if (latest.stage === "fired" && SIM) {
      console.log("[amma] fired. sim ladder complete.");
      break;
    }

    await sleep(SIM ? 200 : 30_000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
