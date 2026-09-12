// Runs only on the cloud machine; carries private HTTP over authenticated Steel SSH.
const http = require('node:http');
const readline = require('node:readline');
readline.createInterface({input:process.stdin}).on('line',line=>{
 let m; try{m=JSON.parse(line);}catch{return;}
 const allowed=m.method==='GET' && ['/', '/health','/api/state','/api/runtime','/instagram','/instagram/','/instagram/state','/instagram/photo','/mock-instagram','/mock-instagram/','/mock-instagram/state','/mock-instagram/photo'].includes(m.path) || m.method==='POST' && ['/api/done','/instagram/share','/mock-instagram/share'].includes(m.path);
 if(!allowed){process.stdout.write(JSON.stringify({id:m.id,status:403,body:''})+'\n');return;}
 const request=http.request({host:'127.0.0.1',port:3003,path:m.path,method:m.method,headers:m.headers,timeout:120000},response=>{
  const chunks=[];let bytes=0;
  response.on('data',chunk=>{bytes+=chunk.length;if(bytes>22*1024*1024){request.destroy(Error('Response too large'));return;}chunks.push(chunk);});
  response.on('end',()=>process.stdout.write(JSON.stringify({id:m.id,status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('base64')})+'\n'));
 });
 request.on('timeout',()=>request.destroy(Error('Cloud request timed out')));
 request.on('error',()=>process.stdout.write(JSON.stringify({id:m.id,status:502,body:''})+'\n'));
 request.end(m.body?Buffer.from(m.body,'base64'):undefined);
});
