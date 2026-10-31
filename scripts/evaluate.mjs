import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { matchLabel } from '../src/domain.mjs';import { seed } from '../src/seed.mjs';import { extractLabel } from '../src/ai.mjs';
const cases=JSON.parse(await readFile('samples/evaluation.json','utf8')),campaign=seed().campaign;
const results=cases.map(c=>({id:c.id,expected:c.expected,actual:matchLabel(campaign,c).state}));
let failed=results.filter(x=>x.expected!==x.actual).length;
const report={kind:'deterministic matching regression (not AI accuracy)',date:new Date().toISOString(),passed:results.length-failed,total:results.length,results,liveAI:{run:false,reason:'Use --live with GEMINI_API_KEY for synthetic-image extraction checks.'}};
if(process.argv.includes('--live')){
 if(!process.env.GEMINI_API_KEY)throw new Error('GEMINI_API_KEY required for live evaluation.');
 report.liveAI={run:true,syntheticImages:true,results:[]};
 for(const [file,expectedModel,expectedSerial]of [['label-clear.png','N65','N65-2408-8000'],['label-unaffected.png','N66','N66-2409-8000'],['label-ambiguous.png','N65',null]]){
  const x=await extractLabel(process.env,{image:(await readFile('samples/'+file)).toString('base64'),mimeType:'image/png'});
  const passed=x.model===expectedModel&&(expectedSerial===null?x.ambiguous:x.serial===expectedSerial);if(!passed)failed++;
  report.liveAI.results.push({file,passed,model:x.model,serial:x.serial,abstained:x.ambiguous,mode:x.mode});
 }
}
await mkdir('outputs',{recursive:true});await writeFile('outputs/evaluation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failed)process.exitCode=1;
