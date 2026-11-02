/* Lightweight SVG icons, with unchanged readable labels and accessible names. */
'use strict';
(function(){
 const paths={
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6M12 7v.2',
  close:'M6 6l12 12M18 6L6 18',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2',
  pause:'M8 5v14M16 5v14',play:'M8 5l11 7-11 7Z',print:'M7 8V3h10v5M7 16H4V9h16v7h-3M7 13h10v8H7ZM16 10h1',
  journal:'M6 3h12v18H6ZM9 7h6M9 11h6M9 15h4',download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
  search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',edit:'M4 16l12-12 4 4L8 20H4ZM13 7l4 4',
  add:'M12 4v16M4 12h16',check:'M4 12l5 5L20 6',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3',
  unlock:'M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5ZM12 14v3',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  history:'M3 4v6h6M4 9a9 9 0 1 1 1 10M12 7v5l3 2',erase:'M4 15l10-11 7 7-9 10H9ZM8 11l7 7M12 21h9',
  audio:'M4 9h4l5-5v16l-5-5H4ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  server:'M3 4h18v12H3ZM8 21h8M12 16v5',judge:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',key:'M14 10l7-7M17 7l3 3M14 14a6 6 0 1 1-8-8 6 6 0 0 1 8 8'
 };
 function kind(text){
  const t=text.toLocaleLowerCase('fr');
  if(/fermer|annuler/.test(t))return 'close';if(/nouvelle version|mises? à jour|actualiser|synchron|rechercher|recharg/.test(t))return 'refresh';
  if(/pause|suspendre/.test(t))return 'pause';if(/reprendre le direct|continuer|relancer/.test(t))return 'play';
  if(/imprim|aperçu/.test(t))return 'print';if(/journal/.test(t))return 'journal';if(/chrono/.test(t))return 'clock';if(/infos|détails techniques/.test(t))return 'info';if(/export|télécharg/.test(t))return 'download';
  if(/récupér|ancienne course|reprendre cette course|gérer les archives/.test(t))return 'history';if(/effacer/.test(t))return 'erase';if(/nommer|modifier|changer le rôle/.test(t))return 'edit';
  if(/nouvelle course|prochaine course/.test(t))return 'add';if(/autoriser|lever la protection/.test(t))return 'unlock';if(/protection/.test(t))return 'lock';
  if(/écouter|audio/.test(t))return 'audio';if(/code|association/.test(t))return 'key';if(/poste et connexion/.test(t))return 'settings';
  if(/serveur jugement/.test(t))return 'server';if(/juge arbitre/.test(t))return 'judge';if(/filtrer/.test(t))return 'search';
  if(/valider|confirmer|enregistrer|associer|activer|vu$/.test(t))return 'check';if(/voir|afficher|consulter/.test(t))return 'eye';return null;
 }
 function decorate(button){
  if(button.closest('svg')||[...button.children].some(c=>!c.classList.contains('action-icon')&&!c.classList.contains('action-label')))return;
  const label=button.textContent.trim(),name=kind(label);
  if(!name||button.dataset.actionLabel===label&&button.querySelector('.action-icon'))return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.classList.add('action-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');path.setAttribute('d',paths[name]);svg.append(path);
  const span=document.createElement('span');span.className='action-label';span.textContent=label;button.replaceChildren(svg,span);button.dataset.actionLabel=label;button.classList.add('with-action-icon');
 }
 let scheduled=false;
 function scan(){scheduled=false;for(const b of document.querySelectorAll('button'))decorate(b);}
 new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(scan);}}).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.ActionIcons={decorate};scan();
})();
