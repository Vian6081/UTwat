import { auth } from "googleapis/build/src/apis/calendar";
import { CodeChallengeMethod } from "google-auth-library";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { config } from "../config";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
];
export const offline = () => process.env.AMMA_OFFLINE === "true";
let cached: InstanceType<typeof auth.OAuth2> | undefined;
function newClient(redirect?: string) {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, then run npx tsx src/google/auth.ts");
  }
  return new auth.OAuth2(config.googleClientId, config.googleClientSecret, redirect);
}
export async function getOAuth2Client() {
  if (!config.googleRefreshToken) throw new Error("GOOGLE_REFRESH_TOKEN is missing. Run npx tsx src/google/auth.ts to consent once.");
  if (!cached) {
    cached = newClient();
    cached.setCredentials({ refresh_token: config.googleRefreshToken });
  }
  return cached;
}
export function safeGoogleError(operation: string, error: any): Error & { code?: number } {
  const code = Number(error?.response?.status || error?.code);
  const hint = code === 401 ? " Reauthorize with npx tsx src/google/auth.ts." :
    code === 403 ? " Check enabled APIs, consent scopes and calendar access." : "";
  const result: Error & { code?: number } = new Error(`${operation} failed${Number.isFinite(code) ? ` (HTTP ${code})` : ""}.${hint}`);
  if (Number.isFinite(code)) result.code = code;
  return result;
}
function saveRefreshToken(token: string) {
  if (!/^[A-Za-z0-9_./~-]+$/.test(token)) throw new Error("Unexpected refresh token format");
  const env = path.resolve(".env");
  const tracked = spawnSync("git", ["ls-files", "--", ".env"], { encoding: "utf8" });
  const ignored = spawnSync("git", ["check-ignore", "--", ".env"], { encoding: "utf8" });
  if (tracked.status !== 0 || tracked.stdout.trim() || ignored.status !== 0) throw new Error(".env must be untracked and gitignored before saving a refresh token");
  const previous = fs.existsSync(env) ? fs.readFileSync(env, "utf8") : "";
  const lines = previous.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?GOOGLE_REFRESH_TOKEN\s*=/.test(line));
  const content = lines.join("\n").replace(/\n*$/, "\n") + `GOOGLE_REFRESH_TOKEN=${token}\n`;
  const temp = path.join(path.dirname(env), "photos", `.oauth-${process.pid}`);
  // photos/ is ignored; the temporary file never puts a secret in an unignored path.
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  try { fs.writeFileSync(temp, content, { mode: 0o600, flag: "wx" }); fs.renameSync(temp, env); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  config.googleRefreshToken = token; cached = undefined;
}
export async function authorize() {
  const redirect = new URL(process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:3001/oauth2callback");
  if (redirect.protocol !== "http:" || redirect.hostname !== "127.0.0.1" || !redirect.port || redirect.search || redirect.hash) {
    throw new Error("GOOGLE_REDIRECT_URI must be an HTTP loopback URL on 127.0.0.1 with an explicit port");
  }
  const client = newClient(redirect.toString());
  const pkce = await client.generateCodeVerifierAsync();
  const state = randomBytes(32).toString("hex");
  let resolveCode!: (code: string) => void;
  let rejectCode!: (error: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", redirect.origin);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (url.pathname !== redirect.pathname) { response.writeHead(404).end("Not found"); return; }
    if (url.searchParams.get("state") !== state) { response.writeHead(400).end("Invalid OAuth state"); return; }
    const code = url.searchParams.get("code");
    if (url.searchParams.has("error") || !code) {
      response.writeHead(400).end("Authorization was not completed. Return to the terminal.");
      rejectCode(new Error("Google consent was denied or incomplete")); return;
    }
    response.end("Consent received. Return to the terminal to confirm credentials were saved.");
    resolveCode(code);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(Number(redirect.port), "127.0.0.1", resolve); });
  const timeout = setTimeout(() => rejectCode(new Error("Google consent timed out after five minutes")), 300_000);
  try {
    console.log("Open this URL in your browser and consent with your test Gmail account:");
    console.log(client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES,
      state, code_challenge: pkce.codeChallenge, code_challenge_method: CodeChallengeMethod.S256 }));
    const code = await codePromise;
    let tokens;
    try { ({ tokens } = await client.getToken({ code, codeVerifier: pkce.codeVerifier, redirect_uri: redirect.toString() })); }
    catch { throw new Error("OAuth code exchange failed. Check the client credentials and matching redirect URI."); }
    if (!tokens.refresh_token) throw new Error("Google returned no refresh token. Revoke the previous AMMA consent and authorize again.");
    if (tokens.scope && SCOPES.some(scope => !tokens.scope!.split(" ").includes(scope))) throw new Error("Both Calendar events and Gmail send scopes must be granted");
    saveRefreshToken(tokens.refresh_token);
    console.log("Refresh token saved privately in .env. No token was printed.");
  } finally { clearTimeout(timeout); server.close(); server.closeAllConnections(); }
}
if (require.main === module) authorize().catch(error => { console.error(error.message); process.exitCode = 1; });
