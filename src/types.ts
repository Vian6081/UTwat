export type Stage = "calm" | "nudging" | "invasive" | "hostile" | "armed" | "fired" | "released";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO
  end: string;     // ISO
}

export interface Mutation {
  eventId: string;
  originalTitle: string;
  newTitle: string;
  at: string;      // ISO
  undone: boolean;
}

export interface Draft {
  at: string;      // ISO
  stage: Stage;
  caption: string;
}

export interface AppState {
  deadlineISO: string;
  stage: Stage;
  done: boolean;
  studyMinutesLogged: number;
  mutations: Mutation[];
  drafts: Draft[];
  emailsSent: { at: string; subject: string; body: string }[];
  hostagePhoto: string | null;   // path on disk
  lastCheckISO: string | null;
}
