import { now } from "../clock";
import { CalendarEvent } from "../types";

function hoursFromNow(hours: number): string {
  return new Date(now().getTime() + hours * 3_600_000).toISOString();
}

export async function listEventsToday(): Promise<CalendarEvent[]> {
  console.log("[stub] listEventsToday called");
  return [
    {
      id: "evt-drinks",
      title: "Friday drinks",
      start: hoursFromNow(1),
      end: hoursFromNow(3),
    },
    {
      id: "evt-hang",
      title: "Hang out",
      start: hoursFromNow(5),
      end: hoursFromNow(7),
    },
    {
      id: "evt-lecture",
      title: "Lecture",
      start: hoursFromNow(9),
      end: hoursFromNow(10.5),
    },
  ];
}

export async function renameEvent(id: string, newTitle: string): Promise<void> {
  console.log("[stub] renameEvent called", id, newTitle);
}

export async function insertStudyBlock(
  startISO: string,
  minutes: number
): Promise<string> {
  console.log("[stub] insertStudyBlock called", startISO, minutes);
  return `study-${startISO}`;
}

export async function deleteEvent(id: string): Promise<void> {
  console.log("[stub] deleteEvent called", id);
}
