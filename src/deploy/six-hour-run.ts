// Explicit one-time migration of the existing live session, preserving its undo journal.
import '../config';
import fs from 'node:fs';
import path from 'node:path';
import {loadState,saveState,withStateLock,STATE_PATH} from '../state';
async function main(){
 if(process.env.AMMA_OFFLINE==='true'||process.env.SIM==='1')throw Error('This command is for the live overnight run');
 const receipt=path.join(path.dirname(STATE_PATH),'six-hour-run.json');
 if(fs.existsSync(receipt))throw Error('Six-hour run already configured; read the receipt rather than resetting it');
 await withStateLock(async()=>{
  const state=loadState();if(state.done||state.runtime?.sim||Object.values(state.runtime?.actions||{}).includes('pending'))throw Error('Resolve finished, accelerated or uncertain state before changing the deadline');
  const startedAt=new Date().toISOString(),deadline=new Date(Date.parse(startedAt)+6*3600000).toISOString();
  fs.copyFileSync(STATE_PATH,STATE_PATH+'.before-six-hour',fs.constants.COPYFILE_EXCL);
  // Save the intended deadline first. Interrupted migrations are reconciled, not restarted.
  fs.writeFileSync(receipt,JSON.stringify({startedAt,deadline,previousDeadline:state.deadlineISO,hours:6,status:'planned'},null,2),{mode:0o600,flag:'wx'});
  state.deadlineISO=deadline;saveState(state);
  fs.writeFileSync(receipt,JSON.stringify({startedAt,deadline,hours:6,status:'configured'},null,2),{mode:0o600});
  console.log(JSON.stringify({startedAt,deadline,hours:6}));
 });
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
