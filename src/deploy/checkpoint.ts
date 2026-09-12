// Verified against the official Steel Computer 0.5.0-preview.6 CLI.
// Public Steel Browser profiles do not checkpoint an external browser's live processes.
import { spawnSync } from "child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { config } from "../config";
function main() {
  const [operation, id, name] = process.argv.slice(2);
  if (!["quota", "help", "capture", "get", "restore"].includes(operation) || (["restore", "get", "capture"].includes(operation) && (!id || id.startsWith("-")))) {
    throw new Error("Usage: npx tsx src/deploy/checkpoint.ts quota|help|capture <computer-id> [name]|get <checkpoint-id>|restore <checkpoint-id>");
  }
  if (config.autoSend) throw new Error("AUTO_SEND must remain false");
  const executable = process.env.STEEL_PREVIEW_BIN || (fs.existsSync(path.join(os.homedir(), ".steel/bin/steel")) ? path.join(os.homedir(), ".steel/bin/steel") : "steel");
  const args = operation === "quota" ? ["computer", "quota"] : operation === "help" ? ["checkpoint", "--help"] : operation === "capture" ? ["computer", "checkpoint", id, "--name", name || "deadline-hostage-ready", "--wait"] : operation === "get" ? ["checkpoint", "get", id] : ["checkpoint", "restore", id, "--timeout", "3600", "--auto-pause", "--wait", "--use"];
  const result = spawnSync(executable, args, { stdio: "inherit", shell: false });
  if (result.error) throw new Error("Steel Computer preview CLI unavailable. Get the preview installer/access from the Steel booth and set STEEL_PREVIEW_BIN if needed.");
  if (result.status !== 0) throw new Error("Preview command failed. Confirm the event CLI version and syntax with Steel engineers.");
}
if (require.main === module) { try { main(); } catch (e: any) { console.error(e.message); process.exitCode = 1; } }
