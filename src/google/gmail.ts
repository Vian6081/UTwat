import { gmail } from "googleapis/build/src/apis/gmail";
import { now } from "../clock";
import { getOAuth2Client, offline, safeGoogleError } from "./auth";

export function buildRawMessage(recipient: string, subject: string, body: string): string {
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(recipient) || recipient.length > 254) {
    throw new Error("Set GOOGLE_EMAIL to the single Gmail address that should receive reminders");
  }
  if (!subject.trim() || /[\r\n]/.test(subject)) throw new Error("Email subject must be a nonempty single line");
  // Encoded words keep Unicode roasts valid without allowing header injection.
  const chunks: string[] = []; let chunk = "";
  for (const char of subject) {
    if (Buffer.byteLength(chunk + char) > 42) { chunks.push(chunk); chunk = ""; }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  const encodedSubject = chunks.map(text => `=?UTF-8?B?${Buffer.from(text).toString("base64")}?=`).join("\r\n ");
  const encodedBody = Buffer.from(body, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
  return Buffer.from([
    `To: ${recipient}`, `Subject: ${encodedSubject}`, `Date: ${now().toUTCString()}`,
    "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", encodedBody, "",
  ].join("\r\n")).toString("base64url");
}
export async function sendNag(subject: string, body: string): Promise<void> {
  if (offline()) { console.log(`[offline] Email: ${subject}\n${body}`); return; }
  const raw = buildRawMessage(process.env.GOOGLE_EMAIL || "", subject, body);
  const api = gmail({ version: "v1", auth: await getOAuth2Client() });
  try {
    // Never automatically retry a send whose result might be ambiguous.
    const response = await api.users.messages.send({ userId: "me", requestBody: { raw } }, { timeout: 20_000, retry: false });
    if (!response.data.id) throw new Error("Gmail returned no message ID");
  } catch (error) { throw safeGoogleError("Gmail send", error); }
}
