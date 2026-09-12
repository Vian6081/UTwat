import { Stage } from "../types";

export async function generateEmail(
  stage: Stage,
  hoursLeft: number,
  context: string
): Promise<{ subject: string; body: string }> {
  console.log("[stub] generateEmail called", stage, hoursLeft);
  const hrs = hoursLeft.toFixed(1);
  const lines: Record<Stage, { subject: string; body: string }> = {
    calm: {
      subject: `You've got this — ${hrs}h left`,
      body: `Hey, you've got something on the calendar. ${hrs} hours. You got this.\n\n${context}`,
    },
    nudging: {
      subject: `Still waiting. ${hrs}h left.`,
      body: `I carved study blocks into your day. Use them.\n\n${context}`,
    },
    invasive: {
      subject: `Your Friday plans looked optional.`,
      body: `I renamed a few events. Caption preview is in the thread. ${hrs}h left.\n\n${context}`,
    },
    hostile: {
      subject: `This is the caption. ${hrs}h left.`,
      body: `Everything unclaimed is a study block now. The caption got worse. Here's the diff.\n\n${context}`,
    },
    armed: {
      subject: `It's loaded.`,
      body: `Instagram is open. Photo attached. Caption filled. I am not pressing send.\n\n${context}`,
    },
    fired: {
      subject: `Deadline passed.`,
      body: `It's sitting there. Your move.\n\n${context}`,
    },
    released: {
      subject: `Proud of you.`,
      body: `Drafts gone. Calendar restored. Go eat something.\n\n${context}`,
    },
  };
  return lines[stage];
}

export async function generateEventTitle(
  originalTitle: string,
  hoursLeft: number
): Promise<string> {
  console.log("[stub] generateEventTitle called", originalTitle, hoursLeft);
  return `${originalTitle} → GO STUDY (${hoursLeft.toFixed(1)}h left)`;
}

export async function generateCaption(
  stage: Stage,
  context: string
): Promise<string> {
  console.log("[stub] generateCaption called", stage);
  const captions: Record<Stage, string> = {
    calm: "just a reminder that the exam exists",
    nudging: "still not studying. interesting choice.",
    invasive: "caption preview: the friday plans were a cry for help",
    hostile: "final draft: this is what happens when you ignore your calendar",
    armed: "it's loaded. one tap and the group chat never recovers.",
    fired: "deadline missed. the button is lit.",
    released: "",
  };
  return `${captions[stage]} (${context})`;
}
