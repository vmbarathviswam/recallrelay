import { MemoryRepository } from '../src/store.mjs';
import { seed } from '../src/seed.mjs';
import { Service } from '../src/service.mjs';
export const NOW=Date.parse('2026-10-31T10:00:00Z');
export function ready(){const s=seed(NOW);s.claims[0].evidence.humanVerified=true;return s;}
export const consent=c=>({confirmed:true,revision:c.evidenceRevision,note:'Verified label and purchase; merchant remedy approved.'});
export async function fixture(mode='replay',paypal={}){const repo=new MemoryRepository();const state=ready();state.mode=mode;if(mode==='sandbox')state.orders.forEach(o=>o.fixture=false);await repo.insert('test',state);return{repo,service:new Service(repo,'test',paypal,mode,()=>NOW),state,id:state.claims[0].id};}
export const refund=(op,status='COMPLETED')=>({id:'REFUND-1',custom_id:op.id,status,amount:{currency_code:'USD',value:(op.amountCents/100).toFixed(2)}});
