import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import express from 'express';
import { loadState, STATE_PATH, withStateLock } from '../state';

export const mockEnabled = () => process.env.AMMA_INSTAGRAM_MODE === 'mock';
const filename = () => `${STATE_PATH}.instagram.json`;
interface MockPost { id:string; caption:string; photoPath:string; status:'draft'|'posted'|'cancelled'; createdAt:string; }
function read(): MockPost | null { return fs.existsSync(filename()) ? JSON.parse(fs.readFileSync(filename(),'utf8')) : null; }
function write(post:MockPost) { fs.mkdirSync(path.dirname(filename()),{recursive:true}); const temp=`${filename()}.${randomUUID()}.tmp`; fs.writeFileSync(temp,JSON.stringify(post),{mode:0o600}); fs.renameSync(temp,filename()); }
export async function armMock(photoPath:string, caption:string) {
  const state=loadState();
  if(state.done || state.stage==='released')throw new Error('Released work cannot be armed');
  if(!/\.(jpe?g|png)$/i.test(photoPath)||!fs.statSync(photoPath).isFile()||fs.statSync(photoPath).size>20*1024*1024)throw new Error('Mock requires a JPEG or PNG up to 20 MB');
  if(!caption.trim()||Array.from(caption).length>2200)throw new Error('Invalid mock caption');
  let post=read();
  if(!post || post.status==='cancelled') { post={id:`mock-${randomUUID()}`,caption,photoPath:path.resolve(photoPath),status:'draft',createdAt:new Date().toISOString()}; write(post); }
  return {sessionId:post.id,liveViewUrl:'/mock-instagram'};
}
export async function cancelMock(id:string) { const post=read(); if(post && post.id===id && post.status==='draft'){post.status='cancelled';post.caption='';write(post);} }
export function mockRouter() {
  const router=Router();
  router.use((_req,res,next)=>{if(!mockEnabled()){res.sendStatus(404);return;}next();});
  router.get('/',(_req,res)=>res.sendFile(path.resolve(__dirname,'mock.html')));
  router.get('/state',(_req,res)=>{const post=read();res.json(post?{id:post.id,caption:post.caption,status:post.status,createdAt:post.createdAt}:null);});
  router.get('/photo',(_req,res)=>{const post=read();if(!post||post.status==='cancelled'){res.sendStatus(404);return;}res.sendFile(post.photoPath);});
  router.post('/share',express.json(),async(req,res)=>{
    // Local simulation only. Reject cross-origin forms and fetches.
    if(req.headers.origin!==`http://${req.headers.host}` || !req.is('application/json')){res.sendStatus(403);return;}
    try { await withStateLock(async()=>{
      const state=loadState(),post=read();
      if(state.done||state.stage==='released'||!post||post.id!==req.body?.id||post.status!=='draft'){res.sendStatus(409);return;}
      post.status='posted';write(post);res.json({ok:true,simulated:true});
    }); } catch {res.status(503).json({error:'Mock unavailable'});}
  });
  return router;
}
