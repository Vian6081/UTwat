import dotenv from "dotenv";

dotenv.config();

export interface Config {
  steelApiKey: string;
  steelProfileId: string;
  openRouterApiKey: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
  demoMode: boolean;
  autoSend: boolean;
}

export const config: Config = {
  steelApiKey: process.env.STEEL_API_KEY ?? "",
  steelProfileId: process.env.STEEL_PROFILE_ID ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
  demoMode: process.env.DEMO_MODE !== "false",
  autoSend: process.env.AUTO_SEND === "true",
};

/** Hours remaining at which we enter each stage. Calm is anything above `nudging`. */
export const STAGE_THRESHOLDS = {
  nudging: 12,
  invasive: 6,
  hostile: 2,
  armed: 15 / 60,
};

/** Minimum gap between nag emails while sitting in a stage, in ms of clock time. */
export const EMAIL_INTERVAL_MS = {
  nudging: 2 * 60 * 60 * 1000,
  invasive: 1 * 60 * 60 * 1000,
  hostile: 20 * 60 * 1000,
};

export const SIM_SPEED = 720;
export const DEFAULT_DEADLINE_HOURS = 18;
