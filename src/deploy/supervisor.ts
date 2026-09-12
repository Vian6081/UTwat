import { spawn, ChildProcess } from "child_process";
import { preflight } from "./preflight";
import { loadState, runtime } from "../state";

async function main() {
  const issues = preflight();
  if (issues.length) throw new Error(issues.join("\n"));
  let stopped = false;
  let child: ChildProcess | undefined;
  const dashboard = spawn(process.execPath, ["--import", "tsx", "src/dashboard/server.ts"], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
    stopped = true; child?.kill(signal); dashboard.kill(signal);
  });
  dashboard.once("exit", () => { if (!stopped) { stopped = true; child?.kill("SIGTERM"); } });
  try {
    for (let attempt = 0; attempt < 5 && !stopped; attempt++) {
      child = spawn(process.execPath, ["--import", "tsx", "src/loop.ts"], { stdio: "inherit" });
      const code = await new Promise<number | null>((resolve, reject) => { child!.once("exit", resolve); child!.once("error", reject); });
      if (stopped || code === 0) return;
      const pending = Object.entries(runtime(loadState()).actions).filter(([,v]) => v === "pending");
      if (pending.length) throw new Error("External action has an uncertain result. Reconcile state before restarting.");
      console.error(`[supervisor] Loop exited ${code}; retry ${attempt + 1}/5`);
      await new Promise(resolve => setTimeout(resolve, Math.min(30_000, 1000 * 2 ** attempt)));
    }
    if (!stopped) throw new Error("Restart budget exhausted");
  } finally { stopped = true; child?.kill("SIGTERM"); dashboard.kill("SIGTERM"); }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
