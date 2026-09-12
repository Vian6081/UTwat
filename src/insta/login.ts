import * as fs from "node:fs";
import { spawnSync } from "node:child_process";
import { runProfileSpike } from "../scripts/profile-spike";
import { config } from "../config";

export async function login(): Promise<{profileId: string}> {
  const result=await runProfileSpike();
  if(!/^[A-Za-z0-9_-]+$/.test(result.profileId))throw new Error("Unexpected Steel profile ID format");
  if(spawnSync("git",["check-ignore","-q",".env"]).status!==0 || spawnSync("git",["ls-files","--",".env"],{encoding:"utf8"}).stdout.trim())throw new Error(".env must be untracked and ignored");
  const previous=fs.existsSync(".env")?fs.readFileSync(".env","utf8"):"";
  const lines=previous.split(/\r?\n/).filter(line=>!/^\s*(?:export\s+)?STEEL_PROFILE_ID\s*=/.test(line));
  fs.mkdirSync("photos",{recursive:true});
  const temp=`photos/.profile-${process.pid}`;
  try {
    fs.writeFileSync(temp,lines.join("\n").replace(/\n*$/,"\n")+`STEEL_PROFILE_ID=${result.profileId}\n`,{mode:0o600,flag:"wx"});
    fs.renameSync(temp,".env");
  } finally { if(fs.existsSync(temp))fs.unlinkSync(temp); }
  config.steelProfileId=result.profileId;
  return result;
}
if(require.main===module)login().then(()=>console.log("Instagram login verified across fresh sessions; profile saved in .env.")).catch(()=>{console.error("Instagram login setup did not complete. Check STEEL_API_KEY, then run npm run insta-login in an interactive terminal.");process.exitCode=1;});
