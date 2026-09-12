// Preview commands supplied in the team master document; require the separate preview CLI.
// Public Steel Browser profiles do not checkpoint an external browser's live processes.
import { spawnSync } from "child_process";
import { config } from "../config";
function main() {
  const [operation, id] = process.argv.slice(2);
  if (!["quota", "help", "restore"].includes(operation) || (operation === "restore" && (!id || id.startsWith("-")))) {
    throw new Error("Usage: npx tsx src/deploy/checkpoint.ts quota|help|restore <checkpoint-id>");
  }
  if (config.autoSend) throw new Error("AUTO_SEND must remain false");
  const executable = process.env.STEEL_PREVIEW_BIN || "steel";
  const args = operation === "quota" ? ["computer", "quota"] : operation === "help" ? ["checkpoint", "--help"] : ["checkpoint", "restore", id, "--wait", "--use"];
  const result = spawnSync(executable, args, { stdio: "inherit", shell: false });
  if (result.error) throw new Error("Steel Computer preview CLI unavailable. Get the preview installer/access from the Steel booth and set STEEL_PREVIEW_BIN if needed.");
  if (result.status !== 0) throw new Error("Preview command failed. Confirm the event CLI version and syntax with Steel engineers.");
}
if (require.main === module) { try { main(); } catch (e: any) { console.error(e.message); process.exitCode = 1; } }
