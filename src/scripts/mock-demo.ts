import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
async function main(){
 fs.mkdirSync('photos',{recursive:true});
 const dir=fs.mkdtempSync(path.resolve('photos/mock-demo-'));
 process.env.AMMA_OFFLINE='true';process.env.AMMA_INSTAGRAM_MODE='mock';process.env.AMMA_STATE_PATH=path.join(dir,'state.json');process.env.HOSTAGE_PHOTO=path.resolve(process.env.HOSTAGE_PHOTO || 'photos/aurafarmer.jpg');
 if(!fs.existsSync(process.env.HOSTAGE_PHOTO))throw new Error('Set HOSTAGE_PHOTO to a JPEG or PNG');
 const {createDashboard}=await import('../dashboard/server');
 const server=createDashboard().listen(Number(process.env.PORT||3000),'127.0.0.1');
 await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 console.log('Local mock demo: http://127.0.0.1:'+ (server.address() as any).port);
 console.log('All integrations simulated; no external requests. State: '+process.env.AMMA_STATE_PATH);
 console.log('To release: AMMA_OFFLINE=true AMMA_INSTAGRAM_MODE=mock AMMA_STATE_PATH='+process.env.AMMA_STATE_PATH+' npm run mark-done');
 const child=spawn(process.execPath,['--import','tsx','src/loop.ts','--sim'],{env:process.env,stdio:'inherit'});
 child.once('error',()=>{server.close();process.exitCode=1;});
 child.once('exit',code=>console.log(code===0?'Escalation complete. Mock stays open for review; Ctrl+C stops the server.':'Simulation failed; inspect the state journal before retrying.'));
 const stop=()=>{if(child.exitCode===null)child.kill('SIGTERM');server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
