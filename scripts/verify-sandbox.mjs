import { mkdir,writeFile } from 'node:fs/promises';
const origin=process.env.APP_ORIGIN||'http://127.0.0.1:4173';
if(!process.env.ADMIN_TOKEN||!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET){console.error('NOT VERIFIED: set PayPal sandbox credentials and ADMIN_TOKEN in .env, start the app in sandbox mode, then rerun. No live evidence was produced.');process.exit(2);}
const headers={Authorization:'Bearer '+process.env.ADMIN_TOKEN,'Content-Type':'application/json'};
const call=async(path,body)=>{const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw new Error(b.error+': '+b.message);return b;};
const config=await call('/api/config');if(config.mode!=='sandbox')throw new Error('Sandbox verifier refuses replay mode.');
const command=process.argv[2]||'purchase';
if(command==='purchase'){
 const p=await call('/api/purchases',{key:crypto.randomUUID(),mixed:true});
 console.log('Approve this order as a sandbox buyer on PayPal: '+p.approvalUrl);
 console.log('Then run: npm run verify:sandbox -- capture '+p.id);
}else if(command==='capture'){
 const id=process.argv[3];if(!id)throw new Error('Supply the purchase ID from the previous command.');
 const purchase=await call('/api/purchases/'+id+'/capture',{});const claim=await call('/api/claims',{orderId:id,sku:'NOVA-65'});
 await mkdir('outputs/sandbox-evidence',{recursive:true});
 await writeFile('outputs/sandbox-evidence/purchase.json',JSON.stringify({checkedAt:new Date().toISOString(),mode:'sandbox',purchase,claimId:claim.id},null,2));
 console.log('Real sandbox capture verified. Case '+claim.id+' is ready for label upload and merchant approval in the UI.');
 console.log('Upload a label matching registered serial '+purchase.items[0].serial+'. Then run: npm run verify:sandbox -- evidence '+claim.id);
}else if(command==='evidence'){
 const id=process.argv[3];if(!id)throw new Error('Supply the case ID.');
 await call('/api/claims/'+id+'/reconcile',{});
 const s=await call('/api/state'),c=s.claims.find(x=>x.id===id);if(!c||c.operation?.status!=='COMPLETED')throw new Error('No completed refund for that case. Finish human approval and execution in the UI first.');
 if(c.operation.refundId.startsWith('REPLAY'))throw new Error('Replay evidence refused.');
 await mkdir('outputs/sandbox-evidence',{recursive:true});
 await writeFile('outputs/sandbox-evidence/refund.json',JSON.stringify({checkedAt:new Date().toISOString(),mode:'sandbox',orderId:c.order.paypalOrderId,captureId:c.order.captureId,orderTotalCents:c.order.totalCents,refundedCents:c.operation.amountCents,refundId:c.operation.refundId,approvalId:c.operation.approvalId,debugId:c.operation.debugId,audit:s.audit.filter(x=>x.details.claimId===id||x.details.operationId===c.operation.id)},null,2));
 console.log('Real sandbox refund evidence saved locally. Review and redact before sharing.');
}else throw new Error('Use purchase, capture <purchaseId>, or evidence <claimId>.');
