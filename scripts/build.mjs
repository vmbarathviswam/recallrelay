import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
await mkdir('dist/server',{recursive:true}); await mkdir('dist/.openai',{recursive:true}); await mkdir('.generated',{recursive:true});
await build({entryPoints:['web/app.mjs'],outfile:'.generated/app.js',bundle:true,minify:true,format:'esm',target:'es2022',external:['./browser-replay.js'],legalComments:'eof'});
const assets={};
for(const [path,file,type] of [['/index.html','web/index.html','text/html; charset=utf-8'],['/app.js','.generated/app.js','text/javascript; charset=utf-8'],['/style.css','web/style.css','text/css; charset=utf-8']]) assets[path]={body:await readFile(file,'utf8'),type};
await writeFile('.generated/assets.mjs','export default '+JSON.stringify(assets)+';\n');
await build({entryPoints:['worker/index.mjs'],outfile:'dist/server/index.js',bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof'});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
try{await cp('drizzle','dist/.openai/drizzle',{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
console.log('Built RecallRelay: browser assets embedded in Worker ESM.');
