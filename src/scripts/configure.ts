import * as fs from "fs";
import * as path from "path";
import { loadState, saveState, withStateLock } from "../state";
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.length % 2 || args.some((v,i) => i % 2 === 0 && !["--photo", "--deadline"].includes(v))) {
    throw new Error("Usage: npx tsx src/scripts/configure.ts [--photo photos/copy.jpg] [--deadline ISO]");
  }
  await withStateLock(async () => {
    const state = loadState();
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === "--photo") {
        const photo = path.resolve(args[i + 1]);
        if (!fs.statSync(photo).isFile()) throw new Error("Photo must be an existing file");
        state.hostagePhoto = photo;
      } else {
        if (!Number.isFinite(Date.parse(args[i + 1]))) throw new Error("Deadline must be a valid ISO timestamp");
        state.deadlineISO = new Date(args[i + 1]).toISOString();
      }
    }
    saveState(state); console.log("State configuration saved; stage and undo history preserved.");
  });
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
