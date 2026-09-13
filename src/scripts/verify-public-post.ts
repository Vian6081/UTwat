import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amma-public-'));process.env.AMMA_STATE_PATH=path.join(dir,'state.json');process.env.AMMA_PUBLIC_POSTING='true';
 const {tick,defaultServices}=await import('../loop');const {defaultState,saveState,runtime}=await import('../state');
 let posts=0;const services={...defaultServices,generateCaption:async()=> 'Deadline missed.',generateEmail:async()=>({subject:'test',body:'test'}),sendNag:async()=>{},armCompose:async()=>({sessionId:'test',liveViewUrl:'/instagram'}),cancelCompose:async()=>{},publishWebsite:async()=>{posts++;return{id:'test',url:'https://amma-instagram-vian.pages.dev',postedAt:new Date().toISOString()};}};
 const state=defaultState();state.deadlineISO=new Date(Date.now()-1000).toISOString();state.hostagePhoto='test.jpg';saveState(state);
 await tick(services);await tick(services);assert.equal(posts,1,'only publish once across ticks');
 const completed=defaultState();completed.deadlineISO=state.deadlineISO;completed.done=true;runtime(completed).actions['email:released']='complete';saveState(completed);await tick(services);assert.equal(posts,1,'verified work never publishes');
 const {publishWebsite}=await import('../insta/publish');await assert.rejects(()=>publishWebsite(completed),/completed/);
 const future=defaultState();future.deadlineISO=new Date(Date.now()+3600000).toISOString();await assert.rejects(()=>publishWebsite(future),/Deadline/);
 future.runtime={actions:{},sim:true};await assert.rejects(()=>publishWebsite(future),/simulated/);
 console.log('PASS: deadline publication once, verified-work guard, future deadline guard, simulation guard.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
