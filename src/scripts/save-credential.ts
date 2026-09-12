// One-use loopback form transfers a copied credential into .env without printing it.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
const name=process.argv[2];
if (!["OPENROUTER_API_KEY","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"].includes(name)) throw new Error("Specify OPENROUTER_API_KEY, GOOGLE_CLIENT_ID, or GOOGLE_CLIENT_SECRET");
const route=`/${randomBytes(24).toString("hex")}`;
let origin="";
const server=createServer(async (req,res)=>{
  res.setHeader("Content-Type","text/html; charset=utf-8"); res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Security-Policy","default-src 'none'; form-action 'self'; frame-ancestors 'none'");
  if(req.url!==route){res.writeHead(404).end("Not found");return;}
  if(req.method==="GET"){res.end(`<h1>Save ${name} locally</h1><p>The value is written only to this project's ignored .env.</p><form method="post"><label>Credential <input type="password" name="value" autocomplete="off" required></label><button>Save credential</button></form>`);return;}
  if(req.method!=="POST"||req.headers.origin!==origin){res.writeHead(403).end("Rejected");return;}
  try {
    let body=""; for await(const chunk of req){body+=chunk;if(body.length>16384)throw new Error("Too large");}
    const value=new URLSearchParams(body).get("value")?.trim();
    if(!value||/[\s\x00-\x1f]/.test(value))throw new Error("Invalid credential");
    if(name==="OPENROUTER_API_KEY"&&!/^sk-or-v1-[a-f0-9]{64}$/i.test(value))throw new Error("Invalid key format");
    if(spawnSync("git",["check-ignore","-q",".env"]).status!==0||spawnSync("git",["ls-files","--",".env"],{encoding:"utf8"}).stdout.trim())throw new Error(".env must be ignored and untracked");
    const env=path.resolve(".env"), temp=path.resolve("photos",`.credential-${process.pid}`);
    const previous=fs.existsSync(env)?fs.readFileSync(env,"utf8"):"";
    const lines=previous.split(/\r?\n/).filter(line=>!new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line));
    fs.mkdirSync(path.dirname(temp),{recursive:true});
    fs.writeFileSync(temp,lines.join("\n").replace(/\n*$/,"\n")+`${name}=${value}\n`,{mode:0o600,flag:"wx"});
    fs.renameSync(temp,env);
    res.end("<h1>Credential saved</h1><p>Saved privately in .env. You can close this tab.</p>");
    console.log(`${name} saved; value not printed.`); server.close(); clearTimeout(timeout);
  }catch{res.writeHead(400).end("Could not save. Check key format and .env exclusion; no credential was printed.");}
});
const timeout=setTimeout(()=>{server.close();server.closeAllConnections();},600_000);
server.listen(0,"127.0.0.1",()=>{origin=`http://127.0.0.1:${(server.address() as any).port}`;console.log(`${origin}${route}`);});
