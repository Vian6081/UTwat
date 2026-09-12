import { calendar, calendar_v3 } from "googleapis/build/src/apis/calendar";
import { now } from "../clock";
import { CalendarEvent } from "../types";
import { getOAuth2Client, offline, safeGoogleError } from "./auth";

const requestOptions = { timeout: 20_000, retry: false };
const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";
async function service() { return calendar({ version: "v3", auth: await getOAuth2Client() }); }
function parts(date: Date, zone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date)
    .filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
}
export function midnightISO(date: string, zone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  for (let i = 0; i < 5; i++) {
    const p = parts(new Date(instant), zone);
    const difference = target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (!difference) return new Date(instant).toISOString();
    instant += difference;
  }
  throw new Error(`Unable to resolve midnight in ${zone}; configure a supported GOOGLE_TIME_ZONE`);
}
export function dayBounds(date: Date, zone: string) {
  const p = parts(date, zone);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return { timeMin: midnightISO(day.toISOString().slice(0,10), zone), timeMax: midnightISO(next.toISOString().slice(0,10), zone) };
}
export function normalizeEvent(event: calendar_v3.Schema$Event, zone: string): CalendarEvent | null {
  if (!event.id || event.status === "cancelled" || event.attendees?.some(a => a.self && a.responseStatus === "declined")) return null;
  const asISO = (value: calendar_v3.Schema$EventDateTime | undefined) => {
    if (value?.dateTime) {
      if (!/(?:Z|[+-]\d\d:\d\d)$/i.test(value.dateTime)) throw new Error("Calendar returned a datetime without an offset");
      return new Date(value.dateTime).toISOString();
    }
    return value?.date ? midnightISO(value.date, value.timeZone || zone) : null;
  };
  const start = asISO(event.start), end = asISO(event.end);
  if (!start || !end) return null;
  return { id: event.id, title: event.summary || "", start, end };
}
let offlineEvents: Map<string, CalendarEvent> | undefined;
function fixtures() {
  if (!offlineEvents) {
    const start = now().getTime();
    offlineEvents = new Map([1, 4, 7].map((h, i) => {
      const event = { id: `offline-${i}`, title: ["Friday drinks", "Movie night", "Lecture"][i],
        start: new Date(start + h * 3_600_000).toISOString(), end: new Date(start + (h+1) * 3_600_000).toISOString() };
      return [event.id, event];
    }));
  }
  return offlineEvents;
}
export async function listEventsToday(): Promise<CalendarEvent[]> {
  if (offline()) return [...fixtures().values()].map(e => ({...e}));
  const api = await service();
  try {
    // events.list exposes the calendar timezone without broadening calendar.events scopes.
    const zone = process.env.GOOGLE_TIME_ZONE || (await api.events.list({ calendarId: calendarId(), maxResults: 1, fields: "timeZone" }, requestOptions)).data.timeZone || "UTC";
    const bounds = dayBounds(now(), zone);
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;
    do {
      const response = await api.events.list({ calendarId: calendarId(), ...bounds, timeZone: zone,
        singleEvents: true, orderBy: "startTime", showDeleted: false, maxResults: 2500, pageToken }, requestOptions);
      for (const item of response.data.items || []) { const event = normalizeEvent(item, zone); if (event) events.push(event); }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
    return events;
  } catch (error) { throw safeGoogleError("Calendar listing", error); }
}
export async function renameEvent(id: string, newTitle: string): Promise<void> {
  if (!id || typeof newTitle !== "string") throw new Error("Event ID and title are required");
  if (offline()) {
    const event = fixtures().get(id); if (event) event.title = newTitle;
    console.log(`[offline] Rename ${id}: ${newTitle}`); return;
  }
  const api = await service();
  try { await api.events.patch({ calendarId: calendarId(), eventId: id, sendUpdates: "none", requestBody: { summary: newTitle } }, requestOptions); }
  catch (error) { throw safeGoogleError("Calendar rename", error); }
}
export async function insertStudyBlock(startISO: string, minutes: number): Promise<string> {
  const start = Date.parse(startISO);
  if (!Number.isFinite(start) || !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) throw new Error("Study block needs a valid start and 1–1440 minutes");
  const end = new Date(start + minutes * 60_000).toISOString();
  if (offline()) {
    const id = `offline-study-${start}`;
    fixtures().set(id, { id, title: "STUDY BLOCK", start: new Date(start).toISOString(), end });
    console.log(`[offline] Insert study block at ${startISO}`); return id;
  }
  const api = await service();
  try {
    const result = await api.events.insert({ calendarId: calendarId(), sendUpdates: "none", requestBody: {
      summary: "STUDY BLOCK", description: "AMMA focus session: put your phone away, work through one topic, then test yourself without notes. Mark work done in the AMMA dashboard to release the session and restore calendar changes.",
      start: { dateTime: new Date(start).toISOString() }, end: { dateTime: end },
      extendedProperties: { private: { amma: "study-block" } }, reminders: { useDefault: false, overrides: [{method: "popup", minutes: 10}, {method: "popup", minutes: 0}] },
    } }, requestOptions);
    if (!result.data.id) throw new Error("Missing event ID");
    return result.data.id;
  } catch (error) { throw safeGoogleError("Study block insertion", error); }
}
export async function deleteEvent(id: string): Promise<void> {
  if (!id) throw new Error("Event ID is required");
  if (offline()) { fixtures().delete(id); console.log(`[offline] Delete ${id}`); return; }
  const api = await service();
  try { await api.events.delete({ calendarId: calendarId(), eventId: id, sendUpdates: "none" }, requestOptions); }
  catch (error) { throw safeGoogleError("Calendar deletion", error); }
}
