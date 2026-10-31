/* Independent logo intro: no animation vendor or gallery dependency. */
(() => {
 const root=document.documentElement,loader=document.querySelector('.brand-preloader');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function finish(){
  if(!root.classList.contains('logo-loading'))return;
  root.classList.remove('logo-loading');clearTimeout(window.__logoSafety);
  document.dispatchEvent(new Event('entesar:ready'));
  setTimeout(()=>loader?.remove(),400);
 }
 if(loader){
  const elapsed=performance.now()-(window.__logoStartedAt||0);
  const minimum=new Promise(resolve=>setTimeout(resolve,Math.max(0,(reduced?250:1600)-elapsed)));
  const logos=Promise.all([...loader.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  Promise.all([minimum,logos]).then(finish);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab')finish();},{once:true});
 }
 if(document.getElementById('project-modal'))import('./projects.js?v=projects-3').then(m=>m.initProjects()).catch(()=>{});
})();