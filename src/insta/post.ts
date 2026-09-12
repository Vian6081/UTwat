import Steel from "steel-sdk";
import { chromium, Page, Locator } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "../config";
import { offline } from "../google/auth";
import { loadState } from "../state";

import { mockEnabled, armMock, cancelMock } from "./mock";

let activeSession: string | undefined;
let composeInFlight: Promise<{sessionId: string; liveViewUrl: string}> | undefined;
function steelClient() {
  if (!config.steelApiKey) throw new Error("STEEL_API_KEY is missing. Configure Steel before opening Instagram.");
  return new Steel({ steelAPIKey: config.steelApiKey });
}
export function connectURL(sessionId: string): string {
  return `wss://connect.steel.dev?apiKey=${encodeURIComponent(config.steelApiKey)}&sessionId=${encodeURIComponent(sessionId)}`;
}
function instagramPage(page: Page) {
  const host = new URL(page.url()).hostname;
  if (host !== "www.instagram.com" && host !== "instagram.com") throw new Error("Unexpected browser destination; refusing to compose");
}
async function visible(locators: Locator[], timeout = 15_000): Promise<Locator> {
  const until = performance.now() + timeout;
  do {
    for (const locator of locators) {
      for (const candidate of await locator.all()) if (await candidate.isVisible()) return candidate;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  } while (performance.now() < until);
  throw new Error("Instagram layout did not match the expected compose controls. Inspect the live viewer.");
}
export async function prepareCompose(page: Page, photoPath: string, caption: string): Promise<void> {
  instagramPage(page);
  const create = await visible([
    page.getByRole("link", {name:/^(Create|New post)$/i}),
    page.getByRole("button", {name:/^(Create|New post)$/i}),
    page.getByRole("link").filter({has:page.locator('svg[aria-label="New post"]')}),
  ]);
  await create.click();
  const choose = await visible([
    page.getByRole("button", {name:/Select from computer/i}),
    page.getByRole("link", {name:/^Post$/i}),
    page.getByRole("button", {name:/^Post$/i}),
    page.getByRole("menuitem", {name:/^Post$/i}),
  ]);
  if (!/Select from computer/i.test(await choose.innerText())) await choose.click();
  const upload = await visible([page.getByRole("button", {name:/Select from computer/i})]);
  const chooserPromise = page.waitForEvent("filechooser", {timeout:10_000});
  await upload.click();
  const chooser = await chooserPromise;
  // Buffers work over CDP without assuming the remote machine has our local file path.
  await chooser.setFiles({name:path.basename(photoPath),mimeType:/\.png$/i.test(photoPath)?"image/png":"image/jpeg",buffer:fs.readFileSync(photoPath)});
  let textbox: Locator | undefined;
  for (let step=0; step<4; step++) {
    const control = await visible([
      page.getByRole("textbox", {name:/write a caption/i}),
      page.getByPlaceholder(/write a caption/i),
      page.locator('[contenteditable="true"][aria-label*="caption" i]'),
      page.getByRole("button", {name:"Next",exact:true}),
    ]);
    if ((await control.getAttribute("role")) === "button" || (await control.evaluate(el=>el.tagName)) === "BUTTON") {
      if ((await control.innerText()).trim() !== "Next") throw new Error("Unexpected navigation control");
      await control.click();
    } else { textbox=control; break; }
  }
  if (!textbox) throw new Error("Caption screen not reached after the expected Next steps");
  await textbox.fill(caption);
  const actual = await textbox.evaluate(el=>el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : el.textContent || "");
  if (actual !== caption) throw new Error("Instagram did not retain the complete caption");
  const share = await visible([page.getByRole("button",{name:"Share",exact:true})]);
  if (!await share.isEnabled()) throw new Error("Instagram's final Share button is not ready");
  instagramPage(page);
  // Deliberately stop here. This function has no Share click.
}
export async function armCompose(photoPath: string, caption: string): Promise<{sessionId: string; liveViewUrl: string}> {
  if (mockEnabled()) return armMock(photoPath, caption);
  if (offline()) return {sessionId:"offline-session",liveViewUrl:"about:blank"};
  if (composeInFlight) return composeInFlight;
  const state=loadState();
  if (state.done || state.stage==="released") throw new Error("Work is complete; refusing to arm Instagram");
  if (!config.steelProfileId) throw new Error("STEEL_PROFILE_ID is missing. Run npm run insta-login first.");
  if (!/\.(jpe?g|png)$/i.test(photoPath) || !fs.existsSync(photoPath) || !fs.statSync(photoPath).isFile()) throw new Error("Use an existing JPEG or PNG copy for Instagram");
  if (fs.statSync(photoPath).size>20*1024*1024) throw new Error("Photo must be 20 MB or smaller");
  if (!caption.trim() || Array.from(caption).length>2200) throw new Error("Instagram caption must contain 1–2200 characters");
  const steel=steelClient();
  composeInFlight=(async()=>{
    const existing=activeSession || state.runtime?.armed?.sessionId;
    if (existing && !existing.startsWith("offline-")) {
      const session=await steel.sessions.retrieve(existing);
      if(session.status==="live") return {sessionId:session.id,liveViewUrl:session.sessionViewerUrl};
      throw new Error("Saved compose session has expired. Clear its armed recovery entry before manually rearming.");
    }
    const timeout=Number(process.env.STEEL_SESSION_TIMEOUT_MS || 3_600_000);
    if(!Number.isFinite(timeout)||timeout<60_000||timeout>86_400_000)throw new Error("Invalid STEEL_SESSION_TIMEOUT_MS");
    const session=await steel.sessions.create({profileId:config.steelProfileId,persistProfile:true,timeout});
    activeSession=session.id;
    let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;
    let ready=false;
    try {
      browser=await chromium.connectOverCDP(connectURL(session.id),{timeout:30_000});
      const context=browser.contexts()[0];
      const page=context.pages()[0] || await context.newPage();
      page.setDefaultTimeout(15_000);
      await page.goto("https://www.instagram.com/",{waitUntil:"domcontentloaded",timeout:30_000});
      const cookies=await context.cookies("https://www.instagram.com");
      if(!cookies.some(c=>c.name==="sessionid"&&c.value))throw new Error("Instagram profile is logged out. Run npm run insta-login.");
      await prepareCompose(page,photoPath,caption);
      ready=true;
      return {sessionId:session.id,liveViewUrl:session.sessionViewerUrl};
    } catch {
      throw new Error(`Instagram compose did not finish. Session ${session.id} will be released; verify profile login and current UI selectors.`);
    } finally {
      // Disconnect Playwright while leaving a successful remote compose session alive.
      if(browser)await browser.close().catch(()=>{});
      if(!ready){await steel.sessions.release(session.id);activeSession=undefined;}
    }
  })();
  try{return await composeInFlight;}catch{throw new Error("Steel Instagram compose failed. Check profile login, session quota and the live viewer before retrying. No automatic Share was attempted.");}finally{composeInFlight=undefined;}
}
export async function cancelCompose(sessionId?: string): Promise<void> {
  const id=sessionId || activeSession || loadState().runtime?.armed?.sessionId;
  if(id?.startsWith("mock-")){await cancelMock(id);return;}
  if(!id || id.startsWith("offline-") || offline()){activeSession=undefined;return;}
  const steel=steelClient();
  try {
    const session=await steel.sessions.retrieve(id);
    if(session.status==="live")await steel.sessions.release(id);
    activeSession=undefined;
  } catch(error:any) {
    if(error.status===404){activeSession=undefined;return;}
    throw new Error(`Could not close armed Steel session ${id}. Close it in Steel and retry mark-done.`);
  }
}
export async function fireNow(): Promise<void> {
  if(mockEnabled())throw new Error("Use the local mock page for simulated sharing");
  if(config.demoMode || !config.autoSend || offline())throw new Error("Instagram sending is disabled. A human controls the final button in the demo.");
  const state=loadState();
  if(state.done || state.stage==="released")throw new Error("Released work cannot be posted");
  const id=activeSession || state.runtime?.armed?.sessionId;
  if(!id || !["armed","fired"].includes(state.stage))throw new Error("There is no armed Instagram session");
  const browser=await chromium.connectOverCDP(connectURL(id),{timeout:30_000});
  try {
    const page=browser.contexts()[0].pages().find(p=>/https:\/\/(www\.)?instagram\.com\//.test(p.url()));
    if(!page)throw new Error("Instagram compose page is missing");
    instagramPage(page);
    const share=await visible([page.getByRole("button",{name:"Share",exact:true})],5000);
    await share.click(); // Only this explicitly guarded function can publish. The loop never calls it.
  } finally { await browser.close(); }
}
