import * as fs from "fs";
import { spawnSync } from "child_process";
import { config } from "../config";
import { loadState, runtime } from "../state";

export function preflight(): string[] {
  const issues: string[] = [];
  for (const [name, value] of Object.entries({ STEEL_API_KEY: config.steelApiKey, STEEL_PROFILE_ID: config.steelProfileId,
    OPENROUTER_API_KEY: config.openRouterApiKey, GOOGLE_CLIENT_ID: config.googleClientId,
    GOOGLE_CLIENT_SECRET: config.googleClientSecret, GOOGLE_REFRESH_TOKEN: config.googleRefreshToken })) {
    if (!value) issues.push(`${name} is missing`);
  }
  if (config.autoSend) issues.push("AUTO_SEND must be false");
  for (const file of ["src/google/calendar.ts", "src/google/gmail.ts", "src/google/auth.ts", "src/roast/generate.ts", "src/insta/post.ts"]) {
    if (fs.readFileSync(file, "utf8").includes("[stub]")) issues.push(`${file} is still a stub`);
  }
  const state = loadState();
  if (!state.hostagePhoto || !fs.existsSync(state.hostagePhoto)) issues.push("State needs an existing hostagePhoto copy");
  if (runtime(state).sim) issues.push("Simulation state cannot be used for the overnight run");
  const tracked = spawnSync("git", ["ls-files", ".env", "photos/", "state.json"], { encoding: "utf8" });
  if (tracked.status !== 0 || tracked.stdout.trim()) issues.push("Git secret/photo exclusion check failed");
  return issues;
}
if (require.main === module) {
  try {
    const issues = preflight();
    console.log(issues.length ? issues.map(i => `BLOCKED: ${i}`).join("\n") : "Live preflight passed.");
    process.exitCode = issues.length ? 1 : 0;
  } catch (error: any) { console.error(error.message); process.exitCode = 1; }
}
