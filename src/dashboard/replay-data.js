// Presentation-only sample data from the exported Claude design. Never used by the agent.
const STAGES = [
  { key: "calm",     name: "Calm",     from: 18,   to: 12,    color: "#EDE9E0", line: "There is still time. I am being nice about it." },
  { key: "nudging",  name: "Nudging",  from: 12,   to: 6,     color: "#D9A441", line: "Your evening has been restructured. You're welcome." },
  { key: "invasive", name: "Invasive", from: 6,    to: 2,     color: "#E2703A", line: "I have opinions about your calendar now." },
  { key: "hostile",  name: "Hostile",  from: 2,    to: 0.25,  color: "#D6452F", line: "The photo is attached. The caption is written." },
  { key: "armed",    name: "Armed",    from: 0.25, to: 0,     color: "#FF2D16", line: "Compose window is loaded. Button is lit. Waiting on a human." }
];

const EVENTS = [
  { h: 17.6, kind: "vault",    title: "Vault sealed",        body: "17 photos copied to disk. First-year Halloween is on top." },
  { h: 16.2, kind: "email",    title: "Email sent",          body: "Subject: just checking in beta, no pressure" },
  { h: 14.0, kind: "email",    title: "Email sent",          body: "Subject: your cousin finished her thesis" },
  { h: 12.0, kind: "stage",    title: "Escalating to Nudging",body: "Two emails ignored. Moving to your calendar." },
  { h: 11.2, kind: "calendar", title: "Event renamed",        body: "\u201cGym w/ Dev\u201d \u2192 \u201cGym w/ Dev (2 chapters unread)\u201d" },
  { h: 9.4,  kind: "calendar", title: "Study block inserted", body: "22:00\u201323:30. I did not ask anyone." },
  { h: 7.5,  kind: "email",    title: "Email sent",           body: "Subject: I am not angry beta, I am disappointed" },
  { h: 6.0,  kind: "stage",    title: "Escalating to Invasive",body: "Zero study minutes logged. Friday is cancelled." },
  { h: 5.1,  kind: "calendar", title: "Event renamed",        body: "\u201cFriday plans \ud83c\udf7b\u201d \u2192 \u201cFriday plans (GPA: 2.7)\u201d" },
  { h: 3.6,  kind: "draft",    title: "Caption rewritten",    body: "Draft 04 is meaner than draft 03. I am improving." },
  { h: 2.0,  kind: "stage",    title: "Escalating to Hostile", body: "Photo attached to the compose window." },
  { h: 1.1,  kind: "calendar", title: "Event deleted",        body: "\u201cNap\u201d is gone. You can sleep after." },
  { h: 0.55, kind: "draft",    title: "Caption finalized",    body: "Tagged nobody. Everyone will see it anyway." },
  { h: 0.25, kind: "stage",    title: "ARMED",                body: "Instagram compose loaded. Button lit. I will not press it." },
  { h: 0.0,  kind: "stage",    title: "Deadline reached",     body: "I am not pressing it. You are. That was always the deal." }
];

const CAPTIONS = [
  { h: 18,  text: "Hi beta. Eighteen hours. That is plenty, which is exactly what you said last time. One chapter and I go quiet. I'll even make the chai." },
  { h: 12,  text: "Twelve hours. Two emails read and ignored \u2014 impressive discipline, applied to the wrong thing. Your gym block is now a reading block. Don't thank me." },
  { h: 6,   text: "Six hours. Zero study minutes. Your Friday has been renamed by someone who loves you and has your password." },
  { h: 2,   text: "Two hours. The photo is attached. It's the one you untagged yourself from in 2023. I kept a copy, because I am your mother." },
  { h: 0.25,text: "Fifteen minutes. Caption written, photo loaded, finger hovering. I have never once bluffed. Open the notes, or open Instagram in the morning." }
];

const MUTATIONS = [
  { h: 11.2, time: "21:48", from: "Gym w/ Dev", to: "Gym w/ Dev (2 chapters unread)" },
  { h: 9.4,  time: "23:36", from: "\u2014 free \u2014", to: "STUDY. Not negotiable. \u2014 Amma" },
  { h: 5.1,  time: "03:54", from: "Friday plans \ud83c\udf7b", to: "Friday plans (GPA: 2.7)" },
  { h: 1.1,  time: "07:56", from: "Nap", to: "deleted" }
];

