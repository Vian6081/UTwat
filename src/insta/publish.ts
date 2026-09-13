import * as fs from 'node:fs';
import {createHash} from 'node:crypto';
import {RuntimeState} from '../state';
export const publicPostingEnabled=()=>process.env.AMMA_PUBLIC_POSTING==='true';
export async function publishWebsite(state:RuntimeState){
 if(!publicPostingEnabled())throw Error('Public posting is not enabled');
 if(state.done||state.stage==='released'||state.runtime?.sim||process.env.AMMA_OFFLINE==='true')throw Error('Cannot publicly post completed or simulated work');
 if(Date.now()<Date.parse(state.deadlineISO))throw Error('Deadline has not passed');
 const url=process.env.AMMA_PUBLIC_FEED_URL;
 if(url!=='https://amma-instagram-vian.pages.dev')throw Error('Unexpected public feed destination');
 if(!process.env.AMMA_PUBLISH_TOKEN||!state.hostagePhoto)throw Error('Public feed credentials/photo missing');
 const photo=fs.readFileSync(state.hostagePhoto);
 if(photo.length>5_000_000)throw Error('Public photo must be under 5 MB');
 const caption=state.drafts.at(-1)?.caption;
 if(!caption?.trim())throw Error('No caption ready');
 const id=createHash('sha256').update(state.deadlineISO).update(photo).digest('hex');
 const response=await fetch(`${url}/feed/publish`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.AMMA_PUBLISH_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({id,caption,photo:photo.toString('base64'),mime:/\.png$/i.test(state.hostagePhoto)?'image/png':'image/jpeg',createdAt:state.deadlineISO})});
 if(!response.ok)throw Error(`Public feed rejected post (${response.status})`);
 const result:any=await response.json();if(result.id!==id||result.status!=='posted')throw Error('Public feed receipt mismatch');
 return {id,url,postedAt:new Date().toISOString()};
}
