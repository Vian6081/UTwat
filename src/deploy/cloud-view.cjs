// The Mac serves only a private SSH relay. Agent logic and state remain in Steel.
require('dotenv').config({quiet:true});
const http=require('node:http'),{spawn}=require('node:child_process'),readline=require('node:readline'),path=require('node:path'),os=require('node:os');
const computer=process.argv[2];if(!/^cmp_[a-z0-9]+$/.test(computer||''))throw Error('Pass the Steel computer ID');
const host='127.0.0.1:3004',pending=new Map();let sequence=0;
let stopping=false, reconnect;let ssh;
function connect(){
ssh=spawn(path.join(os.homedir(),'.steel/bin/steel'),['computer','ssh',computer,'--','/opt/amma-node/node_modules/node/bin/node','/work/amma/src/deploy/stdio-http.cjs'],{env:{...process.env},stdio:['pipe','pipe','pipe']});
readline.createInterface({input:ssh.stdout}).on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);const headers=m.headers||{};delete headers['transfer-encoding'];delete headers['content-length'];p.res.writeHead(m.status||502,headers);p.res.end(Buffer.from(m.body||'','base64'));});
ssh.stderr.on('data',()=>{}); // No credentials are echoed into browser output.
ssh.on('error',disconnected);ssh.on('exit',()=>{disconnected();if(!stopping)reconnect=setTimeout(connect,5000);});
}
connect();
const server=http.createServer((req,res)=>{
 if(req.headers.host!==host){res.writeHead(403);res.end();return;}
 if(!['GET','POST'].includes(req.method)||req.method==='POST'&&(req.headers.origin!==`http://${host}`||!req.headers['content-type']?.startsWith('application/json'))){res.writeHead(403);res.end();return;}
 if(ssh.exitCode!==null||ssh.stdin.destroyed){res.writeHead(503);res.end('Steel connection is unavailable. Reconnect the cloud viewer.');return;}
 let size=0;const chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>16384){req.destroy();return;}chunks.push(chunk);});
 req.on('end',()=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);res.writeHead(504);res.end('Outcome unavailable. Refresh before retrying any action.');},125000);pending.set(id,{res,timer});ssh.stdin.write(JSON.stringify({id,path:req.url,method:req.method,headers:{host,...(req.headers.origin?{origin:req.headers.origin}:{}),...(req.headers['content-type']?{'content-type':req.headers['content-type']}:{})},body:Buffer.concat(chunks).toString('base64')})+'\n');});
});
function disconnected(){for(const {res,timer}of pending.values()){clearTimeout(timer);res.writeHead(502);res.end('Steel disconnected. Check the cloud state before repeating an action.');}pending.clear();}

server.listen(3004,'127.0.0.1',()=>console.log('Steel-hosted agent viewer: http://127.0.0.1:3004'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;clearTimeout(reconnect);ssh.kill();server.close();});
