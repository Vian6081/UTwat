// Records the real local dashboard during a full offline 18-hour / 90-second simulation.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
async function main(){
 const out=path.resolve('artifacts'),privateDir=fs.mkdtempSync(path.resolve('photos/rehearsal-'));fs.mkdirSync(out,{recursive:true});
 process.env.AMMA_OFFLINE='true';process.env.AMMA_INSTAGRAM_MODE='mock';process.env.AMMA_STATE_PATH=path.join(privateDir,'state.json');process.env.HOSTAGE_PHOTO=path.resolve('photos/aurafarmer.jpg');
 const {createDashboard}=await import('../dashboard/server');const {tick}=await import('../loop');const {loadState,saveState}=await import('../state');
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(chromium.executablePath())?undefined:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const server=createDashboard().listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:privateDir,size:{width:1440,height:1000}}});const page=await context.newPage();const video=page.video()!;
 const log=fs.openSync(path.join(privateDir,'simulation.log'),'w');let child:ReturnType<typeof spawn>|undefined;
 try{await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);child=spawn(process.execPath,['--import','tsx','src/loop.ts','--sim'],{cwd:process.cwd(),env:process.env,stdio:['ignore',log,log]});
 await new Promise<void>((resolve,reject)=>{child!.once('error',reject);child!.once('exit',code=>code===0?resolve():reject(new Error('Simulation failed')));});
 const state=loadState();if(state.stage!=='fired')throw new Error('Full escalation did not complete');await page.waitForFunction(()=>document.getElementById('stage')?.textContent==='fired');await page.screenshot({path:path.join(out,'dashboard.png'),fullPage:true});
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}/mock-instagram`);await page.getByRole('button',{name:'Share in mock only'}).waitFor();await page.screenshot({path:path.join(out,'mock-instagram.png'),fullPage:true});await new Promise(r=>setTimeout(r,3500));await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);state.done=true;saveState(state);await tick();await page.waitForFunction(()=>document.getElementById('countdown')?.textContent==='Well done.');await new Promise(r=>setTimeout(r,2500));
 await context.close();await video.saveAs(path.join(out,'AMMA_mock_rehearsal.webm'));console.log('Recorded full escalation and release: artifacts/AMMA_mock_rehearsal.webm');
 }finally{if(child&&child.exitCode===null)child.kill('SIGTERM');fs.closeSync(log);await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
}
main().catch(()=>{console.error('Offline recording failed; see private rehearsal simulation.log.');process.exit(1);});
