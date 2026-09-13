import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amma-canvas-'));process.env.AMMA_STATE_PATH=path.join(dir,'state.json');process.env.AMMA_OFFLINE='true';
 const {defaultState,saveState,loadState}=await import('../state');const {createDashboard}=await import('../dashboard/server');const {verifyCanvasSubmission,markDoneAfterCanvasCheck}=await import('../canvas/server');
 const state=defaultState();state.deadlineISO=new Date(Date.now()+6*3600000).toISOString();saveState(state);const initial=fs.readFileSync(process.env.AMMA_STATE_PATH,'utf8');
 const server=createDashboard().listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const post=async(url:string,body:object,origin=base)=>fetch(base+url,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const pdf=fs.readFileSync(path.resolve('output/pdf/AMMA_sample_homework.pdf')),file=path.join(dir,'Teamwork Analysis.pdf');fs.writeFileSync(file,pdf);
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(chromium.executablePath())?undefined:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  assert.equal((await markDoneAfterCanvasCheck()).accepted,false);assert.equal(loadState().done,false);
  assert.equal((await post('/canvas/submit',{filename:'a.pdf',data:pdf.toString('base64')},'https://evil.invalid')).status,403);
  assert.equal((await post('/canvas/submit',{filename:'a.pdf',data:Buffer.from('not a PDF').toString('base64')})).status,400);
  const page=await browser.newPage({viewport:{width:1512,height:900}});await page.goto(base+'/canvas/dashboard');await page.screenshot({path:path.resolve('artifacts/canvas-dashboard.png'),fullPage:true});await page.getByRole('button',{name:'Courses',exact:true}).click();assert(await page.locator('#course-drawer').isVisible());await page.screenshot({path:path.resolve('artifacts/canvas-courses.png'),fullPage:true});
  await page.goto(base);await page.getByRole('button',{name:'PREVIEW HOMEWORK CHECK',exact:true}).click();await page.waitForFunction(()=>document.getElementById('verification-result')?.textContent?.includes('Not verified'));
  const frame=page.frameLocator('#canvas-frame');await frame.locator('#show-submit').click();await frame.locator('#file').setInputFiles(file);await frame.locator('#submit').click();await frame.getByText('✓ Submitted!',{exact:true}).waitFor();await page.locator('#check-again').click();await page.waitForFunction(()=>document.getElementById('verification-result')?.textContent?.includes('Presentation release confirmed'));assert.equal(fs.readFileSync(process.env.AMMA_STATE_PATH,'utf8'),initial);assert.equal(verifyCanvasSubmission().verified,false,'Presentation submission cannot unlock live state');await page.screenshot({path:path.resolve('artifacts/canvas-verification.png'),fullPage:true});
  await page.locator('#reset-submission').click();await page.waitForFunction(()=>document.getElementById('verification-result')?.textContent?.includes('Not verified'));await page.locator('#sample-submission').click();await page.waitForFunction(()=>document.getElementById('verification-result')?.textContent?.includes('Presentation release confirmed'));assert.equal(fs.readFileSync(process.env.AMMA_STATE_PATH,'utf8'),initial);
  await page.goto(base+'/canvas/assignment');await page.setViewportSize({width:2048,height:1212});await page.screenshot({path:path.resolve('artifacts/canvas-assignment.png'),fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.resolve('artifacts/canvas-mobile.png'),fullPage:true});
  assert.equal((await post('/canvas/submit',{filename:'Teamwork Analysis.pdf',data:pdf.toString('base64')})).status,200);assert.equal(verifyCanvasSubmission().verified,true);
  fs.appendFileSync(path.join(dir,'canvas/submission.pdf'),'tampered');assert.equal(verifyCanvasSubmission().verified,false);assert.equal((await markDoneAfterCanvasCheck()).accepted,false);
  fs.writeFileSync(path.join(dir,'canvas/submission.pdf'),pdf);const changed=loadState();changed.deadlineISO=new Date(Date.now()+7*3600000).toISOString();saveState(changed);assert.equal(verifyCanvasSubmission().verified,false,'Old deadline receipts do not unlock a new session');saveState(state);
  assert.equal((await markDoneAfterCanvasCheck()).accepted,true);assert.equal(loadState().done,true);assert.equal((await post('/canvas/submit',{filename:'a.pdf',data:pdf.toString('base64')})).status,409);
  console.log('Canvas checks passed: PDF submission, visible verification, missing/tampered/stale receipts rejected, presentation isolated, live completion gated, CSRF protection, mobile layout.');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
