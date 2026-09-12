import express from "express";
import * as path from "node:path";
import * as fs from "node:fs";
import { now } from "../clock";
import { loadState, STATE_PATH } from "../state";

import { mockRouter, mockEnabled } from "../insta/mock";

export function createDashboard() {
  const app=express();
  app.disable("x-powered-by");
  app.use((_req,res,next)=>{
    res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Referrer-Policy","no-referrer");
    res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    next();
  });
  app.use("/mock-instagram",mockRouter());
  app.get("/",(_req,res)=>res.sendFile(path.resolve(__dirname,"index.html")));
  app.get("/api/state",(_req,res)=>{
    try {
      const state=loadState();
      const current=now();
      const pending=Object.entries(state.runtime?.actions || {}).filter(([,v])=>v==="pending").map(([k])=>k);
      const recentActivity=[
        ...state.drafts.map(d=>({at:d.at,kind:"draft",title:`${d.stage} caption`,detail:d.caption})),
        ...state.emailsSent.map(e=>({at:e.at,kind:"email",title:e.subject,detail:e.body})),
        ...state.mutations.map(m=>({at:m.at,kind:m.undone?"restored":"calendar",title:m.undone?"Calendar restored":m.originalTitle || "Study block added",detail:m.undone?m.originalTitle:m.newTitle})),
      ].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,25);
      // Explicit fields keep local file paths, recovery internals and credentials off the projector.
      res.json({ deadlineISO:state.deadlineISO,stage:state.stage,done:state.done,studyMinutesLogged:state.studyMinutesLogged,
        drafts:state.drafts,emailsSent:state.emailsSent,mutations:state.mutations,lastCheckISO:state.lastCheckISO,
        nowISO:current.toISOString(),clockSpeed:state.runtime?.simClock?.speed || 1,
        mode:state.runtime?.integrationMode || (process.env.AMMA_OFFLINE==="true"?"offline":"live"),
        instagramMode:mockEnabled()?"mock":"steel",
        simulation:!!state.runtime?.sim,initialized:fs.existsSync(STATE_PATH),
        photoReady:!!state.hostagePhoto && fs.existsSync(state.hostagePhoto),
        liveViewUrl:safeLiveView(state.runtime?.armed?.liveViewUrl),
        pendingCount:pending.length,recentActivity,
      });
    } catch {res.status(503).json({error:"State unavailable. Check the loop terminal and use matching state/mode settings."});}
  });
  app.get("/health",(_req,res)=>res.json({ok:true}));
  return app;
}
export function safeLiveView(value?: string): string | null {
  if(mockEnabled() && value==="/mock-instagram")return value;
  if(!value)return null;
  try{const url=new URL(value);return url.protocol==="https:" && (url.hostname==="steel.dev" || url.hostname.endsWith(".steel.dev")) && !url.username && !url.password && !url.search ? url.toString():null;}
  catch{return null;}
}
if(require.main===module){
  const port=Number(process.env.PORT || 3000),host=process.env.DASHBOARD_HOST || "127.0.0.1";
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error("PORT must be 1–65535");
  createDashboard().listen(port,host,()=>console.log(`AMMA dashboard: http://${host}:${port}`));
}
