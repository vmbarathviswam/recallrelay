// Display formatting only: original values remain available in the journal export.
export const escapeText = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fieldLabel = key => String(key).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_.]/g,' ').replace(/^./,c=>c.toUpperCase());
export function readableValue(value) {
  if(value===null || value===undefined)return 'Not supplied';
  if(typeof value==='boolean')return value?'Yes':'No';
  if(Array.isArray(value))return value.length?value.map(readableValue).join(' · '):'None recorded';
  if(typeof value==='object')return Object.entries(value).map(([k,v])=>`${fieldLabel(k)}: ${readableValue(v)}`).join(' · ');
  return String(value);
}
export function evidenceFields(value) {
  if(!value || typeof value!=='object')return `<p>${escapeText(readableValue(value))}</p>`;
  return `<dl class="evidence-facts">${Object.entries(value).map(([key,item])=>`<div><dt>${escapeText(fieldLabel(key))}</dt><dd>${/quote/i.test(key)?`<blockquote>${escapeText(readableValue(item))}</blockquote>`:escapeText(readableValue(item))}</dd></div>`).join('')}</dl>`;
}
