import test from 'node:test';
import assert from 'node:assert/strict';
import {donut,statusSlices,statusBadge,evidenceHero,confirmation,customerCell} from '../web/visuals.mjs';
test('empty visual chart does not invent a completed proportion',()=>{
 const html=donut([]);assert(html.includes('No cases yet'));assert(!html.includes('NaN'));assert(!html.includes('donut-segment completed'));
});
test('chart distinguishes pending reconciliation from completed cases',()=>{
 const data=[{status:'completed'},{status:'reconcile'},{status:'reconcile'}];
 assert.deepEqual(statusSlices(data),[{status:'completed',count:1},{status:'reconcile',count:2}]);
 const html=donut(data);assert(html.includes('Completed: 1'));assert(html.includes('Reconciliation: 2'));
});
test('visual customer and status components escape untrusted provider text',()=>{
 const attack='\"><img src=x onerror=alert(1)>';
 for(const html of [statusBadge(attack),customerCell({customer:attack,orderId:attack})]){assert(!html.includes('<img'));assert(html.includes('&lt;'));}
});
test('evidence view distinguishes absent source from recorded sample and escapes extraction',()=>{
 const html=evidenceHero({evidenceRevision:1,evidence:{model:'<script>x</script>',serial:null,mode:'gemini'}});
 assert(html.includes('Source image not supplied'));assert(html.includes('Needs clarification'));assert(!html.includes('ILLUSTRATIVE LABEL'));assert(!html.includes('<script>'));
});
test('refund confirmation shows the approved item amount, never the mixed order total',()=>{
 const c={customer:'Test buyer',item:'Charger',approval:{plan:{amountCents:4900}},plan:{amountCents:5900},order:{totalCents:7700}};
 const before=structuredClone(c),html=confirmation(c);assert(html.includes('$49.00'));assert(!html.includes('$77.00'));assert(!html.includes('$59.00'));assert.deepEqual(c,before);
});
