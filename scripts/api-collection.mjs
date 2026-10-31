import{mkdir,writeFile}from'node:fs/promises';
const item=(name,method,path,body,test)=>({name,request:{method,header:[{key:'Content-Type',value:'application/json'},{key:'Authorization',value:'Bearer {{admin_token}}',disabled:false}],url:{raw:'{{base_url}}'+path,host:['{{base_url}}'],path:path.slice(1).split('/')},...(body?{body:{mode:'raw',raw:JSON.stringify(body,null,2),options:{raw:{language:'json'}}}}:{})},event:[{listen:'test',script:{type:'text/javascript',exec:test||['pm.test("HTTP 200",()=>pm.response.to.have.status(200));']}}]});
const collection={info:{name:'RecallRelay · verified remedies',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',description:'Use replay locally with a cookie jar or sandbox with a merchant token. A real refund always requires separate human confirmation. Never publish token values.'},variable:[{key:'base_url',value:'http://127.0.0.1:4173'},{key:'admin_token',value:''},{key:'claim_id',value:'case-RR-1042'},{key:'purchase_id',value:''},{key:'evidence_revision',value:'1'}],item:[
 item('01 · Read explicit execution mode','GET','/api/config'),
 item('02 · Open workspace','GET','/api/state'),
 item('03 · Create mixed purchase','POST','/api/purchases',{key:'postman-purchase-001',mixed:true},['pm.test("Created",()=>pm.response.to.have.status(201));','pm.collectionVariables.set("purchase_id",pm.response.json().id);','pm.test("Server priced mixed order",()=>pm.expect(pm.response.json().totalCents).to.eql(7700));']),
 item('04 · Capture after buyer approval','POST','/api/purchases/{{purchase_id}}/capture',{}),
 item('05 · Open one remedy per purchase item','POST','/api/claims',{orderId:'{{purchase_id}}',sku:'NOVA-65'},['pm.test("Case created",()=>pm.response.to.have.status(201));','pm.collectionVariables.set("claim_id",pm.response.json().id);']),
 item('06 · Live multimodal extraction (supply image base64)','POST','/api/claims/{{claim_id}}/extract',{text:'MODEL N65 SERIAL N65-2408-8000'}),
 item('07 · Load clearly labelled replay sample','POST','/api/claims/{{claim_id}}/sample',{ambiguous:false}),
 item('08 · Merchant confirms original evidence','POST','/api/claims/{{claim_id}}/verify',{confirmed:true,revision:1}),
 item('09 · Merchant approves exact remedy','POST','/api/claims/{{claim_id}}/approve',{confirmed:true,revision:1,note:'Merchant verified the original label and purchase; remedy approved.'}),
 item('10 · Execute previously approved refund','POST','/api/claims/{{claim_id}}/execute',{}),
 item('11 · Reconcile an uncertain response','POST','/api/claims/{{claim_id}}/reconcile',{}),
 item('12 · Forged webhook must fail','POST','/api/webhooks/paypal',{id:'forged-postman',event_type:'PAYMENT.CAPTURE.REFUNDED',resource:{id:'forged'}},['pm.test("Forged event refused",()=>pm.response.to.have.status(403));','pm.test("Explicit refusal",()=>pm.expect(pm.response.json().error).to.eql("FORGED_WEBHOOK"));']),
 item('13 · Duplicate seeded claim must fail (replay)','POST','/api/claims',{orderId:'RR-1042',sku:'NOVA-65'},['pm.test("Duplicate conflict",()=>pm.response.to.have.status(409));']),
 item('14 · Export journal','GET','/api/audit/export'),
 item('15 · Reset only my replay workspace','POST','/api/demo/reset',{})
]};
await mkdir('api',{recursive:true});await writeFile('api/RecallRelay.postman_collection.json',JSON.stringify(collection,null,2)+'\n');
