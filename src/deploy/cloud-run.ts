// Cloud runtime: live Google/OpenRouter, mock Instagram, and a private dashboard.
import * as fs from 'node:fs';
import express from 'express';
import { config } from '../config';
import { createDashboard } from '../dashboard/server';
import { tick } from '../loop';
import { loadState, saveState, withStateLock, STATE_PATH } from '../state';
async function main() {
  if (process.env.AMMA_OFFLINE === 'true' || process.env.SIM === '1' || process.env.AMMA_INSTAGRAM_MODE !== 'mock' || config.autoSend) throw Error('Cloud run requires live integrations, mock Instagram and AUTO_SEND=false');
  for (const [name,value] of Object.entries({GOOGLE_EMAIL:process.env.GOOGLE_EMAIL,GOOGLE_CLIENT_ID:config.googleClientId,GOOGLE_CLIENT_SECRET:config.googleClientSecret,GOOGLE_REFRESH_TOKEN:config.googleRefreshToken,OPENROUTER_API_KEY:config.openRouterApiKey})) if (!value) throw Error(`${name} is missing`);
  if (!process.env.OPENROUTER_MODEL?.endsWith(':free')) throw Error('A free OpenRouter model is required');
  const state=loadState();
  if (state.runtime?.sim) throw Error('Refusing accelerated state for a live run');
  if (!state.hostagePhoto || !fs.existsSync(state.hostagePhoto)) throw Error('Photo is missing');
  // Persist a fixed deadline before the first provider call.
  if (!fs.existsSync(STATE_PATH)) await withStateLock(async()=>saveState(state));
  process.env.AMMA_DEPLOYMENT="steel";
  const app=createDashboard();
  let failure:string|null=null,stopping=false;
  app.get('/api/runtime',(_req,res)=>res.json({deployment:'Steel Computer',hostname:process.env.HOSTNAME,pid:process.pid,mode:'live',instagramMode:'mock',failure,startedAt}));
  app.post('/api/done',express.json(),async(req,res)=>{
    if(req.headers.origin!==`http://${req.headers.host}` || !req.is('application/json')){res.sendStatus(403);return;}
    try{await withStateLock(async()=>{const s=loadState();s.done=true;saveState(s);});const s=await tick();failure=null;res.json({stage:s.stage,done:s.done});}
    catch{failure='Release needs attention; inspect the recovery journal';res.status(503).json({error:failure});}
  });
  const startedAt=new Date().toISOString();
  const server=app.listen(3003,'127.0.0.1');
  await new Promise<void>((r,j)=>{server.once('listening',r);server.once('error',j);});
  console.log('Steel Computer live agent ready on private port 3003');
  const stop=()=>{stopping=true;server.close();};process.once('SIGTERM',stop);process.once('SIGINT',stop);
  while(!stopping){
    try{const s=await tick();failure=null;if(s.stage==='released')break;}
    catch(error){failure='Agent paused after an error; inspect the recovery journal before retrying';console.error(error);break;}
    await new Promise(r=>setTimeout(r,30_000));
  }
  // Keep the dashboard visible after release or an uncertain provider outcome.
}
main().catch(error=>{console.error(error);process.exitCode=1;});
