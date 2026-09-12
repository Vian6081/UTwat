import Steel from "steel-sdk";
import { chromium } from "playwright";
import { createInterface } from "node:readline/promises";
import { config } from "../config";

export async function runProfileSpike(): Promise<{profileId: string}> {
  if (!config.steelApiKey) throw new Error("STEEL_API_KEY is missing. Configure it locally in .env; never paste it into chat.");
  if (!process.stdin.isTTY) throw new Error("Run in an interactive terminal; login is manual in Steel's viewer.");
  const steel = new Steel({ steelAPIKey: config.steelApiKey });
  const input = createInterface({ input: process.stdin, output: process.stdout });
  let sessionId: string | undefined;
  try {
    const first = await steel.sessions.create({ persistProfile: true, timeout: 900_000 });
    sessionId = first.id;
    if (!first.profileId) throw new Error("Steel did not return a profileId");
    const visit = async (id: string) => {
      const browser = await chromium.connectOverCDP(`wss://connect.steel.dev?apiKey=${encodeURIComponent(config.steelApiKey)}&sessionId=${encodeURIComponent(id)}`);
      try {
        const context = browser.contexts()[0];
        const page = context.pages()[0] || await context.newPage();
        await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
        return (await context.cookies("https://www.instagram.com")).some(c => c.name === "sessionid" && !!c.value);
      } finally { await browser.close(); }
    };
    await visit(first.id);
    console.log(`Log into your chosen Instagram account manually: ${first.sessionViewerUrl}`);
    await input.question("Once the feed is visible, press Enter: ");
    if (!await visit(first.id)) throw new Error("Instagram session cookie missing; login is not complete");
    await steel.sessions.release(first.id); sessionId = undefined;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const profile = await steel.profiles.get(first.profileId);
      if (profile.status === "FAILED") throw new Error("Steel profile persistence failed");
      if (profile.status === "READY") { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error(`Profile ${first.profileId} is still uploading; retry the check after it is READY`);
    const second = await steel.sessions.create({ profileId: first.profileId, timeout: 300_000 });
    sessionId = second.id;
    if (!await visit(second.id)) throw new Error("Fresh session did not retain Instagram login");
    console.log(`Restored viewer: ${second.sessionViewerUrl}`);
    const answer = await input.question("Confirm the restored viewer shows the logged-in feed (yes): ");
    if (answer.trim().toLowerCase() !== "yes") throw new Error("Visual login confirmation not completed");
    console.log(`Profile persistence verified. Save STEEL_PROFILE_ID=${first.profileId} locally and hand the profile ID to EE.`);
    console.log('EE snippet: await steel.sessions.create({ profileId: config.steelProfileId, persistProfile: true });');
    return {profileId:first.profileId};
  } finally {
    input.close();
    if (sessionId) await steel.sessions.release(sessionId);
  }
}
if (require.main === module) runProfileSpike().catch(() => { console.error("[profile-spike] Unable to complete login verification. Check credentials and the live viewer; no secrets are logged."); process.exitCode = 1; });
