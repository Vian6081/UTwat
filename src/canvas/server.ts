import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {loadState,saveState,STATE_PATH,withStateLock} from '../state';
const COURSE='APS111H1 F LEC0101',ASSIGNMENT='Teamwork Analysis',ASSIGNMENT_ID='teamwork-analysis';
type Receipt={id:string;assignmentId:string;deadline:string;submittedAt:string;filename:string;sha256:string;bytes:number;};
const dir=()=>path.join(path.dirname(STATE_PATH),'canvas');
const receiptPath=(presentation:boolean)=>path.join(dir(),presentation?'presentation.json':'submission.json');
const pdfPath=(presentation:boolean)=>path.join(dir(),presentation?'presentation.pdf':'submission.pdf');
function read(presentation:boolean):Receipt|null{try{return JSON.parse(fs.readFileSync(receiptPath(presentation),'utf8'));}catch(error:any){if(error.code==='ENOENT')return null;throw error;}}
export function verifyCanvasSubmission(presentation=false){
 const state=loadState(),r=read(presentation);
 const checks=[{label:'Open course',detail:COURSE,ok:true},{label:'Match assignment',detail:ASSIGNMENT,ok:!!r&&r.assignmentId===ASSIGNMENT_ID},{label:'Check submission status',detail:r?'Submitted '+r.submittedAt:'No submission found',ok:!!r&&r.deadline===state.deadlineISO}];
 let artifact=false;if(r){try{const bytes=fs.readFileSync(pdfPath(presentation));artifact=bytes.length===r.bytes&&createHash('sha256').update(bytes).digest('hex')===r.sha256;}catch{}}
 checks.push({label:'Confirm submitted file',detail:artifact?r!.filename:'No matching submission file',ok:artifact});
 return {verified:checks.every(c=>c.ok),checks,submission:r?{id:r.id,filename:r.filename,submittedAt:r.submittedAt}:null,checkedAt:new Date().toISOString(),source:'Canvas presentation replica',presentation};
}
export async function markDoneAfterCanvasCheck(){
 return withStateLock(async()=>{const verification=verifyCanvasSubmission();if(!verification.verified)return {accepted:false,verification};const s=loadState();s.done=true;saveState(s);return {accepted:true,verification};});
}
function sameOrigin(req:express.Request,res:express.Response,next:express.NextFunction){if(req.headers.origin!==`http://${req.headers.host}`||!req.is('application/json')){res.sendStatus(403);return;}next();}
export function canvasRouter(){
 const router=express.Router();
 router.use((_req,res,next)=>{const csp=String(res.getHeader("Content-Security-Policy")||"");res.setHeader("Content-Security-Policy",csp.replace("frame-ancestors 'none'","frame-ancestors 'self'"));next();});
 for(const route of ['/','/dashboard','/courses','/assignment','/presentation'])router.get(route,(_req,res)=>res.sendFile(path.resolve(__dirname,'index.html')));
 router.get('/styles.css',(_req,res)=>res.sendFile(path.resolve(__dirname,'styles.css')));
 router.get('/app.js',(_req,res)=>res.sendFile(path.resolve(__dirname,'app.js')));
 router.get('/sample.pdf',(_req,res)=>res.sendFile(path.resolve(__dirname,'../../output/pdf/AMMA_sample_homework.pdf')));
 router.post('/presentation/reset',sameOrigin,async(_req,res)=>{try{await withStateLock(async()=>{const suffix='.'+randomUUID()+'.bak';for(const f of [receiptPath(true),pdfPath(true)])if(fs.existsSync(f))fs.renameSync(f,f+suffix);});res.json({reset:true});}catch{res.sendStatus(503);}});

 for(const presentation of [false,true]){
  const base=presentation?'/presentation':'';
  router.get(base+'/state',(_req,res)=>{try{const s=loadState(),r=read(presentation);res.json({course:COURSE,assignment:ASSIGNMENT,assignmentId:ASSIGNMENT_ID,deadline:s.deadlineISO,submitted:!!r&&r.deadline===s.deadlineISO,submission:r?{filename:r.filename,submittedAt:r.submittedAt}:null,presentation,done:s.done});}catch{res.sendStatus(503);}});
  router.get(base+'/file',(_req,res)=>{try{if(!read(presentation)){res.sendStatus(404);return;}res.type('application/pdf').sendFile(path.resolve(pdfPath(presentation)));}catch{res.sendStatus(503);}});
  router.post(base+'/submit',sameOrigin,express.json({limit:'3mb'}),async(req,res)=>{
   try{const filename=typeof req.body.filename==='string'?path.basename(req.body.filename).replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,100):'';
    if(!filename.toLowerCase().endsWith('.pdf')||typeof req.body.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(req.body.data)){res.status(400).json({error:'Choose a PDF file.'});return;}
    const bytes=Buffer.from(req.body.data,'base64');if(bytes.length>2*1024*1024||bytes.length<20||!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!bytes.subarray(-1024).includes(Buffer.from('%%EOF'))){res.status(400).json({error:'Use a valid PDF up to 2 MB.'});return;}
    await withStateLock(async()=>{const s=loadState();if(s.done&&!presentation)throw Error('Session already released');fs.mkdirSync(dir(),{recursive:true,mode:0o700});const receipt:Receipt={id:randomUUID(),assignmentId:ASSIGNMENT_ID,deadline:s.deadlineISO,submittedAt:new Date().toISOString(),filename,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};fs.writeFileSync(pdfPath(presentation)+'.tmp',bytes,{mode:0o600});fs.renameSync(pdfPath(presentation)+'.tmp',pdfPath(presentation));fs.writeFileSync(receiptPath(presentation)+'.tmp',JSON.stringify(receipt),{mode:0o600});fs.renameSync(receiptPath(presentation)+'.tmp',receiptPath(presentation));});res.json({submitted:true});
   }catch{res.status(409).json({error:'Submission could not be saved. Check the session before trying again.'});}
  });
  router.post(base+'/check',sameOrigin,async(_req,res)=>{try{const result=await withStateLock(async()=>verifyCanvasSubmission(presentation));res.json(result);}catch{res.status(503).json({error:'Canvas submission is unavailable. AMMA has not released the session.'});}});
 }
 return router;
}
