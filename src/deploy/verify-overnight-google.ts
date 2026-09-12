// Read-only reconciliation of the actual study events created by the running agent.
import '../config';
import fs from 'node:fs';
import path from 'node:path';
import {calendar} from 'googleapis/build/src/apis/calendar';
import {getOAuth2Client,offline,safeGoogleError} from '../google/auth';
import {loadState,STATE_PATH} from '../state';
async function main(){
 if(offline())throw Error('Live verification requires real Google');
 const state=loadState(),api=calendar({version:'v3',auth:await getOAuth2Client()}),events=[];
 for(const mutation of state.mutations.filter(m=>!m.undone&&m.originalTitle==='')){
  const r=await api.events.get({calendarId:process.env.GOOGLE_CALENDAR_ID||'primary',eventId:mutation.eventId},{timeout:20000,retry:false});
  if(r.data.status==='cancelled')throw Error('Study event was cancelled');
  events.push({id:r.data.id,title:r.data.summary,start:r.data.start?.dateTime,end:r.data.end?.dateTime,reminders:r.data.reminders,link:r.data.htmlLink});
 }
 if(events.length<1)throw Error('No live study events verified');
 if(!state.emailsSent.some(e=>Date.parse(e.at)>Date.parse(JSON.parse(fs.readFileSync(path.join(path.dirname(STATE_PATH),'six-hour-run.json'),'utf8')).startedAt)))throw Error('No Gmail send acknowledged for the six-hour run yet');
 const proof={checkedAt:new Date().toISOString(),deadline:state.deadlineISO,stage:state.stage,googleAccount:process.env.GOOGLE_EMAIL,events,gmailSendsAcknowledged:state.emailsSent.map(e=>({at:e.at,subject:e.subject})),pending:Object.values(state.runtime?.actions||{}).filter(v=>v==='pending').length};
 fs.writeFileSync(path.join(path.dirname(STATE_PATH),'six-hour-google-proof.json'),JSON.stringify(proof,null,2),{mode:0o600});console.log(JSON.stringify(proof));
}
main().catch(e=>{console.error(safeGoogleError('Overnight verification',e).message);process.exitCode=1;});
