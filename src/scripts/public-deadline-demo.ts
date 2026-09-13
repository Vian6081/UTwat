// A short, real-time public posting run. Explicit invocation publishes the configured photo.
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {publishWebsite} from '../insta/publish';
import {RuntimeState} from '../state';
async function main(){
 const seconds=Number(process.argv[2]||30);if(!Number.isFinite(seconds)||seconds<5||seconds>3600)throw Error('Choose 5–3600 seconds');
 const state:RuntimeState={deadlineISO:new Date(Date.now()+seconds*1000).toISOString(),stage:'armed',done:false,studyMinutesLogged:0,mutations:[],emailsSent:[],drafts:[{at:new Date().toISOString(),stage:'fired',caption:'Deadline missed. The textbook waited. The calendar cleared its schedule. Somehow procrastination still won. 📚 — AMMA'}],hostagePhoto:path.resolve(process.env.HOSTAGE_PHOTO || 'photos/vian-goat.jpeg'),lastCheckISO:null};
 const file=path.resolve('photos/public-deadline-demo.json');fs.writeFileSync(file,JSON.stringify(state),{mode:0o600});
 console.log(`Real deadline set for ${state.deadlineISO}. Publishing to the website in ${seconds} seconds.`);
 await new Promise(r=>setTimeout(r,seconds*1000+50));
 const latest:RuntimeState=JSON.parse(fs.readFileSync(file,'utf8'));if(latest.done){console.log('Cancelled: completed work');return;}
 latest.stage='fired';latest.runtime={actions:{'publish:website':'pending'}};fs.writeFileSync(file,JSON.stringify(latest),{mode:0o600});
 const receipt=await publishWebsite(latest);latest.runtime.publication=receipt;latest.runtime.actions['publish:website']='complete';fs.writeFileSync(file,JSON.stringify(latest),{mode:0o600});console.log('Published:',receipt.url,receipt.id);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
