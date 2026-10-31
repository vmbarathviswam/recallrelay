// Repo-owned visual components. See docs/UI-DESIGN.md and vendor licenses.
import { icon } from './visuals.mjs';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let observer;
let resizeObserver;
export function initTheme() {
  let theme; try { theme=localStorage.getItem('recallrelay-theme'); } catch {}
  document.documentElement.dataset.theme=theme || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
}
export function gridColors() {
  const dark=document.documentElement.dataset.theme==='dark';
  return {backgroundColor:dark?'#141f25':'#ffffff',foregroundColor:dark?'#eef6f4':'#203a3d',headerBackgroundColor:dark?'#19262e':'#f5f8f8',headerTextColor:dark?'#adbfca':'#62787c',borderColor:dark?'#2a3a44':'#e6edef',accentColor:'#119c85',fontFamily:'Segoe UI, sans-serif',fontSize:13};
}
const stages=[
  ['notice','01','Recall notice','Start with a trusted source.','Source document','Merchant-defined campaign','▧'],
  ['cases','02','Product matching','Exact model. Exact serial.','N65 · N65-2408-*','Deterministic matching','⌕'],
  ['cases','03','Evidence upload','Give every decision a source.','Label photo / PDF','Source reviewed by a person','↥'],
  ['cases','04','AI extraction','Turn labels into structured facts.','Model → Serial → Confidence','Gemini · human verification','✧'],
  ['cases','05','Merchant approval','You authorize the exact remedy.','Evidence → Reason → Approval','Single-use permission','✓'],
  ['purchase','06','PayPal refund','Return only the eligible amount.','$77 purchase · $59 remedy','Illustrative mixed order','↗'],
  ['audit','07','Reconciliation','Close the loop with provider proof.','Payment → Refund → Journal','Verified status, retained history','⟳']
];
export function workflow() {
  const glyphs=['file-text','search','upload','sparkles','shield-check','wallet','receipt'];
  const previews=[`<i></i><i></i><i></i><b>${icon('file-text')}</b>`,`<b>N65</b><i>${icon('check')}</i><b>N65</b>`,`<b>${icon('image')}</b><span>${icon('upload')}</span>`,`<span>${icon('sparkles')}</span><i></i><i></i><i></i>`,`<b>${icon('shield-check')}</b><span>Human gate</span>`,`<b>$59<small>of $77</small></b><span>${icon('wallet')}</span>`,`<b>${icon('circle-check')}</b><i></i><i></i>`];
  return `<section class="workflow panel" aria-labelledby="workflow-title"><div class="workflow-heading"><h2 id="workflow-title">${icon('refresh-cw')}The resolution flow</h2><span class="tiny-pill">INTERACTIVE WORKFLOW GUIDE</span></div><ol class="flow-track">${stages.map(([page,n,title,copy,preview,caption],i)=>`<li><button class="flow-card spotlight-card" data-workflow="${page}" aria-label="${title}: open ${page}"><span class="flow-top"><span class="flow-icon">${icon(glyphs[i])}</span>${icon('arrow-up-right')}</span><strong>${title}</strong><span class="node-preview preview-${i}" aria-hidden="true">${previews[i]}</span><span class="node-status">${icon(i===4?'lock-keyhole':i===3?'sparkles':'circle-check')}${['Trusted source','Exact match','Source image','Structured facts','Merchant only','Item-level','Provider proof'][i]}</span></button></li>`).join('')}</ol><div class="workflow-legend"><span>${icon('sparkles')}AI extracts</span><span>${icon('fingerprint')}Code matches & calculates</span><span>${icon('shield-check')}You approve</span><span class="illustrative-note">Illustrative previews · Click to explore</span></div></section>`;
}
export function enhance(navigate, themeChanged) {
  observer?.disconnect();
  resizeObserver?.disconnect();
  const header=document.querySelector('.header-right');
  if(header){
    const controls=document.createElement('div');controls.className='appearance-controls';
    controls.innerHTML=`<button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">${icon('moon')}</button><button id="motion-toggle" class="theme-toggle" aria-label="Pause decorative motion">${icon('pause')}</button>`;
    header.prepend(controls);
    const toggle=controls.querySelector('#theme-toggle');
    toggle.setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));
    toggle.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('recallrelay-theme',next);}catch{}toggle.setAttribute('aria-pressed',String(next==='dark'));themeChanged();};
    const motion=controls.querySelector('#motion-toggle');
    const syncMotion=()=>{const paused=document.documentElement.classList.contains('motion-paused');motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume decorative motion':'Pause decorative motion');motion.innerHTML=icon(paused?'play':'pause');};
    motion.onclick=()=>{document.documentElement.classList.toggle('motion-paused');syncMotion();};syncMotion();
  }
  document.querySelectorAll('[data-workflow]').forEach(b=>b.onclick=()=>{navigate(b.dataset.workflow);const h=document.querySelector('h1');h?.setAttribute('tabindex','-1');h?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});
  document.querySelectorAll('[data-nav]').forEach(b=>{const label=b.querySelector('span')?.textContent||b.textContent.trim();b.setAttribute('aria-label',label);b.title=label;if(b.classList.contains('active'))b.setAttribute('aria-current','page');});
  const track=document.querySelector('.flow-track');
  if(track){
    // Measure only on resize; the SVG remains decorative and never intercepts controls.
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.classList.add('workflow-beams');svg.setAttribute('aria-hidden','true');track.prepend(svg);
    resizeObserver=new ResizeObserver(()=>{
      const bounds=track.getBoundingClientRect(),cards=[...track.querySelectorAll('li')].map(c=>c.getBoundingClientRect());
      svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.replaceChildren();
      cards.slice(0,-1).forEach((r,i)=>{
        const n=cards[i+1],sameRow=Math.abs(r.top-n.top)<10;
        const x1=(sameRow?r.right:r.left+r.width/2)-bounds.left,y1=(sameRow?r.top+r.height/2:r.bottom)-bounds.top;
        const x2=(sameRow?n.left:n.left+n.width/2)-bounds.left,y2=(sameRow?n.top+n.height/2:n.top)-bounds.top;
        const d=sameRow?`M ${x1} ${y1} L ${x2} ${y2}`:`M ${x1} ${y1} V ${(y1+y2)/2} H ${x2} V ${y2}`;
        for(const pulse of [false,true]){const p=document.createElementNS(ns,'path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('class',pulse?'beam-pulse':'beam-base');p.style.animationDelay=`${i*-.4}s`;svg.append(p);}
      });
    });resizeObserver.observe(track);
  }
  if(!reduced.matches && !document.documentElement.classList.contains('motion-paused')){
    observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.08});
    document.querySelectorAll('.flow-card,.bottom-grid>.panel,.scenario').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
  }
}
// A single delegated handler and one scheduled write per frame; no persistent RAF loop.
let frame=0, pending;
document.addEventListener('pointermove',e=>{
  if(reduced.matches || document.documentElement.classList.contains('motion-paused') || e.pointerType==='touch')return;
  const card=e.target.closest('.spotlight-card');if(!card)return;
  pending={card,x:e.clientX,y:e.clientY};if(frame)return;
  frame=requestAnimationFrame(()=>{frame=0;const {card,x,y}=pending;if(!card.isConnected)return;const r=card.getBoundingClientRect();card.style.setProperty('--pointer-x',`${x-r.left}px`);card.style.setProperty('--pointer-y',`${y-r.top}px`);});
},{passive:true});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled||reduced.matches||document.documentElement.classList.contains('motion-paused'))return;
  b.animate([{scale:'1'},{scale:'.97'},{scale:'1.015'},{scale:'1'}],{duration:260,easing:'ease-out'});
});
export function notify(message,error=false){
  const stack=document.querySelector('#toast');stack.className='toast-stack';
  // Put status feedback above native modal dialogs without moving focus.
  stack.setAttribute('popover','manual');if(stack.showPopover&&!stack.matches(':popover-open'))stack.showPopover();
  const item=document.createElement('div');item.className='toast-item'+(error?' error':'');
  const text=document.createElement('span');text.textContent=message;
  const mark=document.createElement('span');mark.className='toast-icon';mark.innerHTML=icon(error?'triangle-alert':'circle-check');
  const close=document.createElement('button');close.innerHTML=icon('x');close.setAttribute('aria-label','Dismiss notification');close.onclick=()=>item.remove();item.append(mark,text,close);stack.append(item);
  while(stack.children.length>3)stack.firstElementChild.remove();
  let timer=setTimeout(()=>item.remove(),9000);item.onpointerenter=item.onfocusin=()=>clearTimeout(timer);item.onpointerleave=item.onfocusout=()=>{clearTimeout(timer);timer=setTimeout(()=>item.remove(),9000);};
}
