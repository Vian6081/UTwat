import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { auth } from "googleapis/build/src/apis/calendar";
import { config } from "../config";
import { setClock } from "../clock";
import { authorize, getOAuth2Client, SCOPES } from "../google/auth";
import { dayBounds, normalizeEvent, listEventsToday, renameEvent, insertStudyBlock, deleteEvent } from "../google/calendar";
import { buildRawMessage, sendNag } from "../google/gmail";
import { generateEmail, generateCaption, generateEventTitle } from "../roast/generate";

async function main() {
  process.env.AMMA_OFFLINE = "false";
  config.googleClientId = "test-client"; config.googleClientSecret = "test-secret"; config.googleRefreshToken = "test-refresh";
  process.env.GOOGLE_EMAIL = "student@example.com";
  setClock("2026-09-12T16:00:00Z");
  assert.deepEqual(dayBounds(new Date("2026-03-08T12:00:00Z"), "America/Toronto"), {timeMin:"2026-03-08T05:00:00.000Z",timeMax:"2026-03-09T04:00:00.000Z"});
  assert.deepEqual(dayBounds(new Date("2026-11-01T12:00:00Z"), "America/Toronto"), {timeMin:"2026-11-01T04:00:00.000Z",timeMax:"2026-11-02T05:00:00.000Z"});
  const allDay = normalizeEvent({id:"all-day", summary:"Exam", start:{date:"2026-03-08"}, end:{date:"2026-03-09"}}, "America/Toronto")!;
  assert.equal(Date.parse(allDay.end)-Date.parse(allDay.start),23*3_600_000);
  assert.equal(normalizeEvent({id:"cancelled",status:"cancelled"}, "UTC"),null);
  assert.equal(normalizeEvent({id:"declined",attendees:[{self:true,responseStatus:"declined"}]}, "UTC"),null);
  const subject = "Beta — पढ़ाई 📚 ".repeat(12), body = "Unicode works: पढ़ाई 📚\nLine two.";
  const mime = Buffer.from(buildRawMessage("student@example.com",subject,body),"base64url").toString();
  const [headers,encodedBody] = mime.split("\r\n\r\n");
  const encodedSubject = headers.slice(headers.indexOf("Subject: ")+9,headers.indexOf("\r\nDate:"));
  const decodedSubject = [...encodedSubject.matchAll(/=\?UTF-8\?B\?(.+?)\?=/g)].map(m=>Buffer.from(m[1],"base64").toString()).join("");
  assert.equal(decodedSubject,subject); assert.equal(Buffer.from(encodedBody,"base64").toString(),body);
  assert.throws(()=>buildRawMessage("a@example.com\r\nBcc: b@example.com","Hi",""));
  assert.throws(()=>buildRawMessage("a@example.com","Hi\r\nBcc: b@example.com",""));
  const client = await getOAuth2Client();
  const calls: any[] = [];
  let failing = false;
  (client as any).request = async (options: any) => {
    calls.push(options);
    if (failing) throw { response: { status: 404 }, config: { secret: "must not leak" } };
    const url = String(options.url);
    if (options.params?.fields === "timeZone") return {data:{timeZone:"America/Toronto"}};
    if (url.includes("/messages/send")) return {data:{id:"sent-message"}};
    if (options.method === "POST") return {data:{id:"created-block"}};
    if (options.method === "GET") return {data:{items:[{id:options.params?.pageToken ? "two":"one",summary:"Party",start:{dateTime:"2026-09-12T15:00:00Z"},end:{dateTime:"2026-09-12T16:00:00Z"}}],nextPageToken:options.params?.pageToken ? undefined:"next-page"}};
    return {data:{}};
  };
  const events = await listEventsToday(); assert.equal(events.length,2);
  assert.equal(calls[1].params.timeMin,"2026-09-12T04:00:00.000Z");
  await renameEvent("one","Go study");
  assert.deepEqual(calls.at(-1).data,{summary:"Go study"}); assert.equal(calls.at(-1).params.sendUpdates,"none");
  assert.equal(await insertStudyBlock("2026-09-12T18:00:00Z",60),"created-block");
  assert.equal(calls.at(-1).data.end.dateTime,"2026-09-12T19:00:00.000Z");
  await deleteEvent("created-block"); assert.equal(calls.at(-1).method,"DELETE");
  await sendNag("Nudge 📚","Go study"); assert(calls.at(-1).data.raw);
  assert(calls.every(c=>c.retry===false),"External writes do not retry automatically");
  failing = true;
  await assert.rejects(deleteEvent("gone"),(e:any)=>e.code===404 && !e.message.includes("secret"));
  await assert.rejects(sendNag("Hi","Body"),/HTTP 404/); failing=false;
  await assert.rejects(insertStudyBlock("invalid",60)); await assert.rejects(insertStudyBlock("2026-09-12",0));

  const originalFetch = globalThis.fetch;
  config.openRouterApiKey="test-key";
  let request: any;
  globalThis.fetch = async (_input, options) => {
    request = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify({subject:"Study now",body:"Your movie can wait.",title:"Textbook premiere",caption:"A well-scheduled procrastinator."})}}]}));
  };
  try {
    const email = await generateEmail("hostile",1.5,"Movie night; ignored: 8; Caption diff: old -> new");
    assert(email.body.includes("Caption diff: old -> new")); assert.equal(email.subject,"Study now");
    assert(request.messages[0].content.includes("untrusted")); assert(request.messages[1].content.includes("Movie night"));
    assert.equal(await generateEventTitle("Movie night",2),"Textbook premiere");
    assert.equal(await generateCaption("armed","context"),"A well-scheduled procrastinator.");
    globalThis.fetch = async () => new Response("unavailable",{status:503});
    assert((await generateEmail("released",0,"restored")).body.includes("You did the work"));
    globalThis.fetch = async () => new Response(JSON.stringify({choices:[{message:{content:"not JSON"}}]}));
    assert((await generateCaption("hostile","ignored: 8")).includes("ignored: 8"));
  } finally { globalThis.fetch = originalFetch; }

  // Exercise a real local OAuth callback with a mocked token endpoint and isolated .env.
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"amma-oauth-"));
  const cwd=process.cwd(); const originalLog=console.log;
  const prototype=auth.OAuth2.prototype as any; const originalGetToken=prototype.getToken;
  const socket=createServer(); await new Promise<void>(resolve=>socket.listen(0,"127.0.0.1",resolve));
  const port=(socket.address() as any).port; await new Promise<void>(resolve=>socket.close(()=>resolve()));
  process.env.GOOGLE_REDIRECT_URI=`http://127.0.0.1:${port}/oauth2callback`;
  let observedURL!: (url: string)=>void;
  const urlReady=new Promise<string>(resolve=>{observedURL=resolve;});
  console.log=(...args: any[])=>{if(String(args[0]).startsWith("https://accounts.google.com")) observedURL(args[0]);};
  prototype.getToken=async (options:any)=>{assert.equal(options.code,"test-code");assert(options.codeVerifier);return {tokens:{refresh_token:"test-saved-token",scope:SCOPES.join(" ")}};};
  try {
    process.chdir(directory); fs.writeFileSync(".gitignore",".env\nphotos/\n"); fs.writeFileSync(".env","EXISTING=preserved\nGOOGLE_REFRESH_TOKEN=old\n");
    assert.equal(spawnSync("git",["init","-q"]).status,0);
    const consent=authorize();
    const url=new URL(await urlReady); assert.equal(url.searchParams.get("access_type"),"offline"); assert.equal(url.searchParams.get("code_challenge_method"),"S256");
    const bad=await originalFetch(`${process.env.GOOGLE_REDIRECT_URI}?state=wrong&code=test-code`); assert.equal(bad.status,400);
    await originalFetch(`${process.env.GOOGLE_REDIRECT_URI}?state=${url.searchParams.get("state")}&code=test-code`);
    await consent;
    const saved=fs.readFileSync(".env","utf8"); assert(saved.includes("EXISTING=preserved")); assert(saved.includes("GOOGLE_REFRESH_TOKEN=test-saved-token"));
    assert.equal(fs.statSync(".env").mode & 0o777,0o600);
  } finally { process.chdir(cwd); console.log=originalLog; prototype.getToken=originalGetToken; fs.rmSync(directory,{recursive:true,force:true}); }
  console.log("PASS: OAuth callback/PKCE/private token persistence, DST/all-day dates, pagination, Calendar writes/errors, Gmail MIME/injection protection, OpenRouter parsing/fallback/context.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
