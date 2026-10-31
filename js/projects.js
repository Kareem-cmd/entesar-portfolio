/* Essential gallery interactions have no animation-library dependency. */
export function initProjects() {
 const modal=document.getElementById('project-modal'); if(!modal)return;
 const stage=modal.querySelector('.pmodal__stage'), closeButton=modal.querySelector('.pmodal__close');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let manifest=null,previousFocus=null,activeSlug=null,request=0,background=[];
 async function load(){
  if(manifest)return manifest;
  const r=await fetch('assets/projects/manifest.json?v=projects-3',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Unavailable'); const value=await r.json();
  if(!Array.isArray(value))throw new Error('Invalid data'); return manifest=value;
 }
 function message(text,retry=false){
  stage.replaceChildren(); const box=document.createElement('div'); box.className='gallery-error';box.setAttribute('role','status');
  const p=document.createElement('p');p.textContent=text;box.append(p);
  if(retry){const b=document.createElement('button');b.type='button';b.textContent='Try again';b.onclick=()=>render(activeSlug);box.append(b);} stage.append(box);
 }
 async function render(slug){
  const token=++request; message('Loading project images…');modal.querySelector('.pmodal__summary').hidden=true;
  try{
   const all=await load();if(token!==request)return;const p=all.find(p=>p.slug===slug);
   if(!p||!Array.isArray(p.images)||!p.images.length)throw new Error('Empty project');
   modal.querySelector('.pmodal__name').textContent=p.name;
   modal.querySelector('.pmodal__cat').textContent=`${p.cat} · ${p.images.length} designs`;
   const summary=modal.querySelector('.pmodal__summary');if(p.summary){summary.textContent=p.summary;summary.hidden=false;}
   stage.replaceChildren();
   for(const [i,src] of p.images.entries()){
    const figure=document.createElement('figure');figure.className='holo';const img=document.createElement('img');
    const size=p.dimensions?.[src];if(size){img.width=size[0];img.height=size[1];}
    img.src=src;img.alt=`${p.name} — design ${i+1} of ${p.images.length}`;img.loading=i?'lazy':'eager';img.decoding='async';img.draggable=false;
    img.addEventListener('error',()=>{const note=document.createElement('figcaption');note.textContent=`Image ${i+1} could not load. `;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry image';retry.onclick=()=>{note.remove();img.src=src;};note.append(retry);figure.append(note);});
    figure.append(img);stage.append(figure);
   }stage.scrollLeft=0;
  }catch{if(token===request)message('The project could not load. Try again, or open the full project below.',true);}
 }
 function open(link){
  previousFocus=document.activeElement;activeSlug=link.dataset.slug;
  modal.querySelector('.pmodal__name').textContent=link.querySelector('.work-row__name').textContent;
  modal.querySelector('.pmodal__cat').textContent=link.querySelector('.work-row__cat').textContent;
  modal.querySelector('.project-page').href=link.href;modal.setAttribute('aria-hidden','false');document.documentElement.classList.add('modal-open');
  background=[...document.body.children].filter(el=>el!==modal&&!['SCRIPT','STYLE'].includes(el.tagName)).map(el=>[el,el.inert]);background.forEach(([el])=>el.inert=true);
  window.__E?.lenis?.stop();closeButton.focus();render(activeSlug);
 }
 function close(){++request;modal.setAttribute('aria-hidden','true');document.documentElement.classList.remove('modal-open');background.forEach(([el,was])=>el.inert=was);background=[];stage.replaceChildren();window.__E?.lenis?.start();previousFocus?.focus();}
 document.querySelectorAll('.work[data-slug]').forEach(link=>link.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();open(link);}));
 closeButton.onclick=close;modal.querySelector('.pmodal__scrim').onclick=close;
 const move=dir=>stage.scrollBy({left:dir*Math.max(200,stage.clientWidth*.8),behavior:reduced?'instant':'smooth'});
 modal.querySelector('.gallery-prev').onclick=()=>move(-1);modal.querySelector('.gallery-next').onclick=()=>move(1);
 modal.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.target===stage&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}
  if(e.key==='Tab'){const els=[...modal.querySelectorAll('button,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 });
 stage.addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(stage.scrollWidth>stage.clientWidth){e.preventDefault();stage.scrollLeft+=e.deltaY*(e.deltaMode===1?16:1);}},{passive:false});
 let drag=null;
 stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&!e.target.closest('button,a')){drag=[e.clientX,stage.scrollLeft];stage.setPointerCapture(e.pointerId);}});
 stage.addEventListener('pointermove',e=>{if(drag)stage.scrollLeft=drag[1]-(e.clientX-drag[0]);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>drag=null);
 const preview=document.querySelector('.work-preview');
 if(preview&&matchMedia('(hover:hover) and (pointer:fine)').matches)document.querySelectorAll('.work-row[data-cover]').forEach(row=>{
  row.addEventListener('pointerenter',()=>{preview.querySelector('img').src=row.dataset.cover;preview.style.opacity='1';preview.style.visibility='visible';});
  row.addEventListener('pointermove',e=>{preview.style.left=`${e.clientX}px`;preview.style.top=`${e.clientY}px`;preview.style.transform='translate(-50%,-50%)';});
  row.addEventListener('pointerleave',()=>{preview.style.opacity='0';preview.style.visibility='hidden';});
 });
 load().then(all=>document.querySelectorAll('.work[data-slug]').forEach(link=>{const p=all.find(p=>p.slug===link.dataset.slug);if(p)link.querySelector('.work__count').textContent=p.images.length;})).catch(()=>{});
}
