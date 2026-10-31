import {DatabaseSync} from 'node:sqlite';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {journal} from '../src/domain.mjs';

const config=JSON.parse(await readFile('wrangler.local.jsonc','utf8'));
if(config.vars.PAYPAL_MODE!=='sandbox')throw new Error('Migration supports only the sandbox workspace.');
const path=resolve(process.env.DATABASE_PATH||'data/recallrelay.sqlite');await access(path);
const local=new DatabaseSync(path,{readOnly:true});
const row=local.prepare("SELECT snapshot FROM workspaces WHERE id='merchant-sandbox'").get();local.close();
if(!row)throw new Error('Local sandbox workspace not found.');
const snapshot=JSON.parse(row.snapshot);
if(snapshot.operations.some(op=>['SUBMITTING','UNKNOWN','PENDING'].includes(op.status)))throw new Error('Resolve every in-flight refund before migrating.');
if(snapshot.orders.some(order=>order.fixture))throw new Error('Replay purchases cannot be migrated into the sandbox workspace.');
for(const name of ['ADMIN_TOKEN','PAYPAL_CLIENT_SECRET','GEMINI_API_KEY'])if(process.env[name]&&row.snapshot.includes(process.env[name]))throw new Error('Refusing to transfer a snapshot containing a runtime credential.');
for(const claim of snapshot.claims)if(claim.approval&&!claim.approval.used)claim.approval=null;
journal(snapshot,'workspace.migrated',{source:'local SQLite',unusedApprovalsInvalidated:true});
const auth=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let info;try{info=JSON.parse(auth.stdout);}catch{throw new Error('Cloudflare sign-in required.');}
const token=info.token||info.apiToken||info.oauth_token||info.oauthToken;
if(!token)throw new Error('Cloudflare sign-in required.');
const db=config.d1_databases.find(x=>x.binding==='DB');
async function query(sql,params){
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+config.account_id+'/d1/database/'+db.database_id+'/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql,params})});
  const result=await response.json();if(!response.ok||!result.success)throw new Error('D1 migration request failed: '+result.errors?.map(x=>x.code).join(','));return result.result[0];
}
const existing=(await query('SELECT revision,snapshot FROM workspaces WHERE id=?',['merchant-sandbox'])).results[0];
if(existing){const other=JSON.parse(existing.snapshot);if(other.orders.length||other.claims.length||other.operations.length)throw new Error('Hosted sandbox already contains financial records; no data was overwritten.');}
const result=existing
  ?await query('UPDATE workspaces SET revision=revision+1,snapshot=?,updated_at=? WHERE id=? AND revision=?',[JSON.stringify(snapshot),Date.now(),'merchant-sandbox',existing.revision])
  :await query('INSERT OR IGNORE INTO workspaces(id,revision,snapshot,updated_at) VALUES (?,1,?,?)',['merchant-sandbox',JSON.stringify(snapshot),Date.now()]);
if(result.meta.changes!==1)throw new Error('Hosted workspace changed concurrently; no overwrite was attempted.');
console.log(JSON.stringify({migrated:true,orders:snapshot.orders.length,cases:snapshot.claims.length,operations:snapshot.operations.length,credentialsTransferred:false,sourceRetained:true}));
