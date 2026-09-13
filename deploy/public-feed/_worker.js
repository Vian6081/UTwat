const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/feed/state'){
  const post=await env.POSTS.get('latest','json');
  return json(post?{id:post.id,caption:post.caption,status:'posted',createdAt:post.createdAt}:null);
 }
 if(url.pathname==='/feed/photo'){
  const id=url.searchParams.get('id');
  const post=await env.POSTS.get(id&&/^[a-f0-9]{64}$/.test(id)?`post:${id}`:'latest','json');if(!post)return new Response('Not found',{status:404});
  return new Response(Uint8Array.from(atob(post.photo),c=>c.charCodeAt(0)),{headers:{'Content-Type':post.mime,'Cache-Control':'no-store'}});
 }
 if(url.pathname==='/feed/publish'){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!env.PUBLISH_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.PUBLISH_TOKEN}`)return json({error:'Unauthorized'},401);
  if(Number(request.headers.get('content-length'))>7000000)return json({error:'Too large'},413);
  const text=await request.text();if(text.length>7000000)return json({error:'Too large'},413);
  let post;try{post=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
  if(!/^[a-f0-9]{64}$/.test(post.id)||typeof post.caption!=='string'||!post.caption.trim()||post.caption.length>2200||!['image/jpeg','image/png'].includes(post.mime)||typeof post.photo!=='string'||post.photo.length>6800000||!Number.isFinite(Date.parse(post.createdAt)))return json({error:'Invalid post'},400);
  let bytes;try{bytes=atob(post.photo);}catch{return json({error:'Invalid photo'},400);}
  if(!(post.mime==='image/jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('\x89PNG\r\n\x1a\n')))return json({error:'Invalid photo'},400);
  // A stable deadline id makes repeat requests replace the same post, never append duplicates.
  const prior=await env.POSTS.get(`post:${post.id}`,'json');
  const saved=prior||{id:post.id,caption:post.caption,photo:post.photo,mime:post.mime,createdAt:post.createdAt};
  if(!prior)await env.POSTS.put(`post:${post.id}`,JSON.stringify(saved));
  await env.POSTS.put('latest',JSON.stringify(saved));
  return json({id:saved.id,status:'posted'});
 }
 if(url.pathname.startsWith('/feed/'))return json({error:'Not found'},404);
 return env.ASSETS.fetch(request);
}};
