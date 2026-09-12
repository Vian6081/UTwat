import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';
async function main(){
 const dir=fs.mkdtempSync(path.resolve('photos/mock-test-'));
 process.env.AMMA_STATE_PATH=path.join(dir,'state.json');process.env.AMMA_OFFLINE='true';process.env.AMMA_INSTAGRAM_MODE='mock';
 const {defaultState,saveState}=await import('../state');const {armCompose,cancelCompose}=await import('../insta/post');const {createDashboard}=await import('../dashboard/server');
 const state=defaultState();state.stage='armed';saveState(state);
 const draft=await armCompose(path.resolve('photos/aurafarmer.jpg'),'<img src=x onerror="alert(1)"> Test caption');
 const server=createDashboard().listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(chromium.executablePath())?undefined:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const page=await browser.newPage();await page.goto(origin+draft.liveViewUrl);await page.getByText('Test caption',{exact:false}).waitFor();assert.equal(await page.locator('#caption img').count(),0);
 assert.equal((await fetch(origin+'/mock-instagram/share',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://evil.example'},body:JSON.stringify({id:draft.sessionId})})).status,403);
 await page.getByRole('button',{name:'Share in mock only'}).click();await page.getByText('Simulated post saved. Nothing was sent to Instagram.').waitFor();
 assert.equal((await (await fetch(origin+'/mock-instagram/state')).json()).status,'posted');
 await cancelCompose(draft.sessionId);assert.equal((await (await fetch(origin+'/mock-instagram/state')).json()).status,'posted');
 fs.unlinkSync(process.env.AMMA_STATE_PATH+'.instagram.json');const second=await armCompose(path.resolve('photos/aurafarmer.jpg'),'Cancellation test');await cancelCompose(second.sessionId);assert.equal((await fetch(origin+'/mock-instagram/photo')).status,404);
 state.done=true;saveState(state);await assert.rejects(()=>armCompose(path.resolve('photos/aurafarmer.jpg'),'Forbidden'));
 await page.setViewportSize({width:390,height:844});await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Mock passed: draft, literal caption, simulated share, CSRF protection, cancellation, released guard, mobile layout.');
 }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
