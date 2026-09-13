let verificationPresentation=false,verificationBusy=false,verificationVersion=0;
const verificationDialog=$('verification-dialog');
async function checkHomework(){
 if(verificationBusy)return;verificationBusy=true;const version=++verificationVersion;$('check-again').disabled=true;$('verification-result').textContent='Reading Canvas submission…';$('verification-steps').replaceChildren();
 try{const response=await fetch((verificationPresentation?'/canvas/presentation':'/canvas')+'/check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Canvas is unavailable. Your session is still running.');const result=await response.json();
  for(const check of result.checks){if(version!==verificationVersion)return;const li=document.createElement('li');li.className=check.ok?'pass':'fail';li.textContent=(check.ok?'✓ ':'× ')+check.label+'\n'+check.detail;$('verification-steps').append(li);await new Promise(r=>setTimeout(r,350));}
  if(version!==verificationVersion)return;
  if(!result.verified){$('verification-result').textContent='Not verified. Submit your PDF in Canvas, then check again. AMMA stays active.';return;}
  if(verificationPresentation){if(replayStart!==null){replayReleased=true;tick();}$('verification-result').textContent='Submission verified. Presentation release confirmed. Your live overnight run is unchanged.';return;}
  $('verification-result').textContent='Submission verified. Restoring your calendar…';releasePending=true;$('mark-done').disabled=true;
  // The server verifies the record again under the state lock before it marks done.
  const release=await fetch('/api/done',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!release.ok){const error=await release.json();throw Error(error.error||'Release needs attention. Check live status before retrying.');}
  $('verification-result').textContent='Submission verified. AMMA released the session and restored your calendar.';$('mark-done').textContent='Released';
 }catch(error){$('verification-result').textContent=error.message||'Check could not be completed. Refresh before retrying.';}
 finally{verificationBusy=false;$('check-again').disabled=releasePending&&!verificationPresentation;}
}
function openHomework(presentation){verificationPresentation=presentation;$('presentation-controls').hidden=!presentation;$('verification-mode').textContent=presentation?'Presentation only · live Google session stays running':'Live session · verified submission releases your calendar';$('canvas-frame').src=presentation?'/canvas/presentation':'/canvas/assignment';verificationDialog.showModal();checkHomework();}
$('mark-done').onclick=()=>openHomework(replayStart!==null);$('homework-demo').onclick=()=>openHomework(true);$('check-again').onclick=checkHomework;$('close-verification').onclick=()=>verificationDialog.close();verificationDialog.addEventListener('close',()=>{verificationVersion++;});
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===$('canvas-frame').contentWindow&&event.data?.type==='amma-canvas-submitted')$('verification-result').textContent='Canvas received your PDF. Click “Check submission again” to have AMMA verify it.';});

$('sample-submission').onclick=async()=>{
 if(!verificationPresentation||verificationBusy)return;$('sample-submission').disabled=true;
 try{const r=await fetch('/canvas/sample.pdf');if(!r.ok)throw Error();const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const saved=await fetch('/canvas/presentation/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:'AMMA_sample_homework.pdf',data:btoa(binary)})});if(!saved.ok)throw Error();$('canvas-frame').src='/canvas/presentation';await checkHomework();}catch{$('verification-result').textContent='Example could not be submitted. Check Canvas before retrying.';}finally{$('sample-submission').disabled=false;}
};
$('reset-submission').onclick=async()=>{if(!verificationPresentation||verificationBusy)return;$('reset-submission').disabled=true;try{const r=await fetch('/canvas/presentation/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error();replayReleased=false;$('canvas-frame').src='/canvas/presentation';await checkHomework();}catch{$('verification-result').textContent='Reset could not be confirmed.';}finally{$('reset-submission').disabled=false;}};
