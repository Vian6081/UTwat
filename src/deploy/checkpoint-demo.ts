// Isolated, offline demonstration of an actual running browser + Node process checkpoint.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
async function main(){
 process.env.AMMA_OFFLINE='true';process.env.AMMA_INSTAGRAM_MODE='mock';process.env.AMMA_STATE_PATH=path.resolve('photos/checkpoint-state.json');process.env.HOSTAGE_PHOTO=path.resolve('photos/aurafarmer.jpg');
 const {createDashboard}=await import('../dashboard/server');const {loadState}=await import('../state');
 const dashboard=createDashboard().listen(3000,'127.0.0.1');await new Promise<void>((r,j)=>{dashboard.once('listening',r);dashboard.once('error',j);});
 if(!fs.existsSync(process.env.AMMA_STATE_PATH)){
 const child=spawn(process.execPath,['--import','tsx','src/loop.ts','--sim'],{env:process.env,stdio:'inherit'});
 await new Promise<void>((r,j)=>{child.once('error',j);child.once('exit',c=>c===0?r():j(Error('Simulation failed')));});
 }
 if(loadState().stage!=='fired')throw Error('Escalation incomplete');
 const nodeNonce=randomUUID();let ticks=0;setInterval(()=>ticks++,1000);
 if(process.env.AMMA_CHECKPOINT_NODE_ONLY==='true'){
 createServer((req,res)=>{if(req.url!=='/evidence'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({nodeNonce,pid:process.pid,ticks,stage:loadState().stage,stateSha256:createHash('sha256').update(fs.readFileSync(process.env.AMMA_STATE_PATH!)).digest('hex'),photoSha256:createHash('sha256').update(fs.readFileSync(process.env.HOSTAGE_PHOTO!)).digest('hex'),browserVerified:false,browserLimitation:'Both Chromium builds terminate with SIGTRAP in Steel Computer Debian beta',at:new Date().toISOString()}));}).listen(3002,'127.0.0.1');
 console.log('Node-only checkpoint evidence ready');return;
 }
 const browser=await chromium.launch({headless:true,executablePath:process.env.AMMA_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:3000/instagram');await page.getByRole('button',{name:'Create',exact:true}).click();
 const browserNonce=randomUUID();
 await page.evaluate(n=>{document.body.dataset.checkpointNonce=n;},browserNonce);
 await page.screenshot({path:'photos/checkpoint-compose.png'});
 createServer(async(req,res)=>{if(req.url!=='/evidence'){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({nodeNonce,browserNonce:await page.evaluate(()=>document.body.dataset.checkpointNonce),pid:process.pid,ticks,title:await page.title(),composeVisible:await page.locator('#modal').isVisible(),caption:await page.locator('#composeCaption').inputValue(),photoLoaded:await page.locator('#composePhoto').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0),shareEnabled:await page.getByRole('button',{name:'Share',exact:true}).isEnabled(),stage:loadState().stage,at:new Date().toISOString()}));}catch{res.writeHead(503);res.end('Browser evidence unavailable');}}).listen(3002,'127.0.0.1',()=>console.log('Checkpoint demo ready: http://127.0.0.1:3002/evidence'));
}
main().catch(e=>{console.error(e);process.exit(1);});
