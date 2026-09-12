import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { chromium } from 'playwright';

async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amma-ee-'));
 process.env.AMMA_STATE_PATH=path.join(dir,'state.json');process.env.AMMA_OFFLINE='true';
 const {defaultState,saveState}=await import('../state');const {setClock}=await import('../clock');
 const {createDashboard,safeLiveView}=await import('../dashboard/server');
 const {prepareCompose,fireNow,cancelCompose}=await import('../insta/post');
 setClock('2026-09-12T18:00:00Z');
 const state=defaultState();state.deadlineISO='2026-09-12T20:00:00Z';state.stage='hostile';state.hostagePhoto='/private/must-not-leak.jpg';state.runtime={actions:{secret:'pending'},armed:{sessionId:'private-session',liveViewUrl:'https://app.steel.dev/sessions/demo'}};state.drafts=[{at:'2026-09-12T18:00:00Z',stage:'hostile',caption:'<img src=x onerror="window.pwned=true"> Your textbook misses you.'}];saveState(state);
 assert.equal(safeLiveView('https://steel.dev.evil.example/a'),null);assert.equal(safeLiveView('javascript:alert(1)'),null);assert.equal(safeLiveView('https://steel.dev/a?key=secret'),null);assert.equal(safeLiveView('https://app.steel.dev/sessions/demo'),'https://app.steel.dev/sessions/demo');
 const server=createDashboard().listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(chromium.executablePath())?undefined:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const response=await fetch(base+'/api/state');const raw=await response.text();assert.equal(response.status,200);assert(!raw.includes('must-not-leak'));assert(!raw.includes('private-session'));assert(!raw.includes('"secret"'));assert.equal(response.headers.get('cache-control'),'no-store');
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(base);await page.waitForFunction(()=>document.getElementById('stage')?.textContent==='hostile');assert.equal(await page.locator('#caption img').count(),0);assert.equal(await page.evaluate(()=>Boolean((window as any).pwned)),false);assert.match(await page.locator('#countdown').innerText(),/^0[12]:/);await page.screenshot({path:path.join(dir,'dashboard-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(dir,'dashboard-mobile.png'),fullPage:true});
 state.done=true;state.stage='released';state.drafts=[];saveState(state);await page.waitForFunction(()=>document.getElementById('countdown')?.textContent==='Well done.');assert(await page.locator('#viewer').isHidden());
 fs.writeFileSync(process.env.AMMA_STATE_PATH,'bad json');await page.waitForFunction(()=>document.getElementById('connection')?.textContent?.includes('Connection lost'));assert.equal((await fetch(base+'/api/state')).status,503);
 const fixture=await browser.newPage();await fixture.route('**/*',route=>route.fulfill({contentType:'text/html',body:`<button id="create" onclick="this.hidden=true;document.querySelector('#upload').hidden=false">Create</button><button id="upload" hidden onclick="document.querySelector('input').click()">Select from computer</button><input type="file" hidden onchange="document.querySelector('#next').hidden=false"><button id="next" hidden onclick="if(++window.steps===2){this.hidden=true;document.querySelector('textarea').hidden=false;document.querySelector('#share').hidden=false}">Next</button><textarea hidden aria-label="Write a caption"></textarea><button id="share" hidden onclick="window.sent++">Share</button><script>window.steps=0;window.sent=0</script>`}));
 await fixture.goto('https://www.instagram.com/');const photo=path.join(dir,'photo.png');fs.writeFileSync(photo,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDeUAAAAASUVORK5CYII=','base64'));await prepareCompose(fixture,photo,'Test caption — never share');assert.equal(await fixture.locator('textarea').inputValue(),'Test caption — never share');assert.equal(await fixture.evaluate(()=>(window as any).sent),0);assert.equal(await fixture.locator('input').evaluate((el:any)=>el.files[0].name),'photo.png');await fixture.goto('https://example.com/');await assert.rejects(prepareCompose(fixture,photo,'no'),/Unexpected browser destination/);await assert.rejects(fireNow(),/disabled/);await cancelCompose('offline-session');
 console.log(`EE checks passed: safe dashboard, responsive layout, lost connection, compose upload/caption, zero Share clicks. Screenshots: ${dir}`);
 }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
}
main().catch(error=>{console.error(String(error.message).replace(/sk-or-v1-[A-Za-z0-9]+/g,'[redacted]'));process.exit(1);});
