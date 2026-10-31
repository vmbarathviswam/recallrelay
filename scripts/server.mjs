import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHandler } from '../src/http.mjs';
import { SQLiteRepository } from '../src/sqlite.mjs';
import assets from '../.generated/assets.mjs';
const path=resolve(process.env.DATABASE_PATH||'data/recallrelay.sqlite');await mkdir(dirname(path),{recursive:true});
const db=new DatabaseSync(path); db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
for(const name of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){db.exec('BEGIN IMMEDIATE');try{db.exec(await readFile('drizzle/'+name,'utf8'));db.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(name);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
const repo=new SQLiteRepository(db),handler=createHandler({repository:repo,assets});
const port=Number(process.env.PORT||4173); const env={...process.env,APP_ORIGIN:process.env.APP_ORIGIN||'http://127.0.0.1:'+port};
const server=createServer(async(incoming,out)=>{
  try{
    let size=0;const chunks=[];for await(const chunk of incoming){size+=chunk.length;if(size>3000000){out.writeHead(413);out.end('Request too large');return;}chunks.push(chunk);}
    const headers=new Headers();for(const [k,v]of Object.entries(incoming.headers)){if(v!==undefined&&!k.startsWith('oai-'))headers.set(k,Array.isArray(v)?v.join(', '):v);}
    const request=new Request(env.APP_ORIGIN+(incoming.url||'/'),{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await handler(request,env,{waitUntil:p=>p.catch(()=>{})});
    out.writeHead(response.status,Object.fromEntries(response.headers));out.end(Buffer.from(await response.arrayBuffer()));
  }catch{out.writeHead(500,{'Content-Type':'application/json'});out.end(JSON.stringify({error:'INTERNAL_ERROR',message:'The server could not complete this request.'}));}
});
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('RecallRelay running at http://127.0.0.1:'+port+' · '+(env.PAYPAL_MODE||'replay')));
function stop(){server.close(()=>{db.close();process.exit(0);});}process.on('SIGINT',stop);process.on('SIGTERM',stop);
