// Bounded controller for Steel's eight-hour windows. Run on the Mac, not the VM.
// It only resumes the SAME paused computer; it never clones or retries app actions.
require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const deployment=JSON.parse(fs.readFileSync('photos/cloud-live-deployment.json','utf8'));
const end=Date.parse(deployment.deadline)+30*60_000;
const lock='photos/cloud-watch.lock';
if(fs.existsSync(lock)){const pid=Number(fs.readFileSync(lock,'utf8'));try{process.kill(pid,0);throw Error('Cloud controller is already running');}catch(error){if(error.code!=='ESRCH')throw error;fs.unlinkSync(lock);}}
fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});process.once('exit',()=>{try{fs.unlinkSync(lock);}catch{}});
const receipt='photos/cloud-watch-receipt.json';
const state=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt,'utf8')):{computerId:deployment.computerId,resumeAttempts:0};
if(state.computerId!==deployment.computerId)throw Error('Controller receipt belongs to another computer');
function write(update){Object.assign(state,update,{checkedAt:new Date().toISOString()});fs.writeFileSync(receipt+'.tmp',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(receipt+'.tmp',receipt);}
function call(args){return new Promise(resolve=>{const child=spawn(path.join(os.homedir(),'.steel/bin/steel'),args,{env:process.env,stdio:['ignore','pipe','ignore']});let out='';child.stdout.on('data',b=>out+=b);const timer=setTimeout(()=>child.kill('SIGTERM'),190000);child.on('error',()=>resolve(null));child.on('close',()=>{clearTimeout(timer);try{resolve(JSON.parse(out));}catch{resolve(null);}});});}
async function main(){
 if(!Number.isFinite(end)||!/^cmp_[a-z0-9]+$/.test(deployment.computerId))throw Error('Invalid deployment receipt');
 while(true){
  if(Date.now()>=end){write({status:'finished',note:'Resume window ended; computer retains its own automatic pause deadline'});return;}
  const result=await call(['computer','get',deployment.computerId,'--json']);
  if(!result?.success){write({status:'connection-error'});}
  else if(result.data.status==='paused'){
   if(state.resumeAttempts>=4){write({status:'needs-attention',note:'Resume attempt budget exhausted; computer preserved paused'});return;}
   write({status:'resuming',resumeAttempts:state.resumeAttempts+1});
   await call(['computer','resume',deployment.computerId,'--wait','--json']);
   // Always reconcile with a fresh GET on the next iteration after an uncertain response.
  }else if(result.data.status==='running'){write({status:'watching',cloudStatus:'running'});}
  else{write({status:'needs-attention',cloudStatus:result.data.status});return;}
  await new Promise(r=>setTimeout(r,60_000));
 }
}
main().catch(()=>{write({status:'failed'});process.exitCode=1;});
