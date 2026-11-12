/* Lightweight SVG icons, with unchanged readable labels and accessible names. */
'use strict';
(function(){
 const paths={
  phone:'M7 2h10v20H7ZM10 5h4M11 19h2',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6M12 7v.2',
  close:'M6 6l12 12M18 6L6 18',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2',
  stop:'M6 6h12v12H6Z',pause:'M8 5v14M16 5v14',play:'M8 5l11 7-11 7Z',print:'M7 8V3h10v5M7 16H4V9h16v7h-3M7 13h10v8H7ZM16 10h1',
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
  if(/arrêter l’envoi continu/.test(t))return 'stop';if(/pause|suspendre/.test(t))return 'pause';if(/reprendre le direct|continuer|relancer/.test(t))return 'play';
  if(/imprim|aperçu/.test(t))return 'print';if(/journal/.test(t))return 'journal';if(/chrono/.test(t))return 'clock';if(/infos|détails techniques/.test(t))return 'info';if(/export|télécharg/.test(t))return 'download';
  if(/récupér|ancienne course|reprendre cette course|gérer les archives/.test(t))return 'history';if(/effacer|vider.*course/.test(t))return 'erase';if(/nommer|modifier|changer le rôle/.test(t))return 'edit';
  if(/créer une course|nouvelle course|prochaine course/.test(t))return 'add';if(/autoriser|lever la protection/.test(t))return 'unlock';if(/protection/.test(t))return 'lock';
  if(/écouter|audio/.test(t))return 'audio';if(/code|association/.test(t))return 'key';if(/poste et connexion/.test(t))return 'settings';
  if(/téléphone|libérer (?:le )?poste/.test(t))return 'phone';if(/serveur jugement/.test(t))return 'server';if(/juge arbitre/.test(t))return 'judge';if(/filtrer/.test(t))return 'search';
  if(/valider|confirmer|enregistrer|associer|activer|vu$/.test(t))return 'check';if(/voir|afficher|consulter/.test(t))return 'eye';return null;
 }
 function decorate(button){
  if(button.closest('svg')||[...button.children].some(c=>!c.classList.contains('action-icon')&&!c.classList.contains('action-label')))return;
  const label=button.textContent.trim(),name=button.id==='new-race'?'add':button.id==='compet-settings'?'compet':kind(label);
  if(!name||button.dataset.actionLabel===label&&button.querySelector('.action-icon'))return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.classList.add('action-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');if(name==='compet'){const logo=document.createElementNS(ns,'image');logo.setAttribute('href','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFY0lEQVR4nO2Wy29dVxnFf2ef5z337fuKH7XjPJ1Xk6ZETaASUAkkUoWoQQw6QaUdUYlO+h90wF/ApIDKBJBAAgFhUCoeCYKCS1LRyqmdhtR2ksbJ9b2O7/s890bnuC0iVGLoAd7SOTrS3kdr7e9ba+2tKaXYziG2FZ0dAuy0gB0Riu22oZG8lGIhVKqRfAJS/g+mSXbJZKkuyCQ/xBIZgzA0hNDS+SiWqFCiJctsgdAFUayI/VhoGpph6/eF0I6mBK61RxPffW+9vDoMcXUNgYb+EVi4BfkJAUPTGEpF3jG4UM2gXb3L2/Mfst4eMjlZ5OkLhzh5ZpK//m6ZX/zkHWKleP7F0+w7VOFXP17gD7+/weOfeYTnXjqlZ3P2VgVawyB+9eYGdEag6+CHECZb0sA0wdK3ShBIGAXgmBws2dQvNnlnfoUw2akueOv6GosrLS48cwzPj3j9yjJBHHP+2RPoNx9w8Y3rvLmwysz+KpZjxv9ugZQxQQTDEFyFVnH5SjFDJ4z4y6YHvWCrMVmHyXqJJ4o2s80ef79yi6WNPi+cO86Rw3V+fvEalxbvYl9yefRIA5m3icOYQMC16y2WWl0q42OcOD2FaYiUgEhZKJhNAEYhmiF47dFd/Ojsfr73xT18e6oAcQw9n2+MZ3n9y3t59fO7OZ5zWJUSvZrjzJf2cv7rh9lzfBdrtsGt/oi7A49MLUeuUWAUSRZvd7gnYO7EFGeenP5PEWoSCkGclvdA4JBRYKLYXbSZtpOWJNXxKUpFWQhyusDOWgRFGyVVCtDt+YSmgDEXUcoQmjpBzsLSNG42e7y33oOSw5FjDeq17EMElCSTgEhFr+Pzwz8vs7LW5QuHqmiRhGBLivM3WrzS9zg5XcJSCrPsshmEhChMw+Cxo+N8UypmavlUfCPXSp1x6UaTxXaf6ekycwer/21DEStMLyAbS6yBx29X21z+oM0PSk4iCaa8iEAq3l7r8Nb7TZ4+WOeZxyaQBYeup+MphevoPHf2QPp0hyE/+9MKm5aBsgRXuz5NTWNmzMXOmJ+SA1JijQKizSGFQoavzo5xeq7B3qrLfLOHNfBpeSGfbRSY21fh8b0VNEtwxzZA01DGx6b9OCcUodDoZAwyjsnpRp532wMuDyPONQefQiBUiGGE3+5Rci2+dmqas5+bToldmr9NpuvhbQ45fmyCF88dpl51+fVCE8zEngI7Z9KPJN//4zK/XLzP4Wo21Qk5h3u64Im5GvKWycpSk388GNH3InJOCk3qAj2KMfohbtfHHAY0XJNq0cZ1TBhG6P0AozMiE0mmKi5jeQtlCLDMNBMKWRvXFLy7PuDyjRY/vdPlQRKnSbkNnYlqlt31PDgWV7o+i/f6DyVspBCDgGw/ROuFeIMt0UmpEL5EDELy/ZC4E9Ab+OlcIWdB4hBD52Y3YKk94EOpIJshU8hQLjlgGmAICq7JVKL8YoYlL+Jvaw8RiPxY99pDvI0e/sYQlQRSak9F1PPxW0NGG72UQBxsXWIP1lzGZ8rgWrz8fotvvXmHN1ojGC/w7L4KtaKTuio9Mgyd/VUXyi6MIn5zr0ffl/onBHK2oc9WchyrlJgdy1HIWh/R06gVHPZX85yslNhVdtBNLZ06MJbhtSeneWqunpxMXG15kHf4zqlJXjo5zkTBhmoWajlcx2Cu4nJ+pgiVLJ5hJKJOCWiJYnub3sLtfz5o9HuBcvKWfGSmSLnmEseStVtd1u/28f2Y+lSOyZkidqL+pEVA149Z7ozoBIrJvMWeBBjF7UHIBx0/zZgjlSxFS2e567PaC0TJ0rUDJft+2TGOpgT+ry8kYocAOy3Y5rHtLfgXpetS7QR4nJkAAAAASUVORK5CYII=');logo.setAttribute('width','24');logo.setAttribute('height','24');svg.append(logo);svg.classList.add('compet-logo');}else{path.setAttribute('d',paths[name]);svg.append(path);}
  const span=document.createElement('span');span.className='action-label';span.textContent=label;button.replaceChildren(svg,span);button.dataset.actionLabel=label;button.classList.add('with-action-icon');
 }
 let scheduled=false;
 function scan(){scheduled=false;for(const b of document.querySelectorAll('button'))decorate(b);}
 new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(scan);}}).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.ActionIcons={decorate};scan();
})();

;
/* Shared close affordances; existing close handlers remain authoritative. */
'use strict';
(function(){
 const closing=button=>/^Fermer(?:\b|\s| ·)/i.test(button.textContent.trim())||button.classList.contains('zoom-close');
 function decorate(dialog){
  for(const b of dialog.querySelectorAll('button'))if(!b.classList.contains('dialog-dismiss')&&closing(b))b.classList.add('dialog-close');
  if(dialog.classList.contains('course-creation-dialog')||dialog.classList.contains('justification-dialog')||dialog.classList.contains('chrono-detached-root')){dialog.querySelector('.dialog-dismiss')?.remove();dialog.classList.remove('has-dismiss');return;}
  if(dialog.querySelector('.dialog-dismiss'))return;
  dialog.classList.add('has-dismiss');
  const cross=document.createElement('button');cross.type='button';cross.className='dialog-dismiss dialog-close';cross.textContent='×';cross.setAttribute('aria-label','Fermer cette fenêtre');cross.title='Fermer cette fenêtre';
  cross.onclick=()=>{
   const buttons=[...dialog.querySelectorAll('button')].filter(b=>b!==cross),close=buttons.find(closing)||buttons.find(b=>/^(Annuler|Non)$/.test(b.textContent.trim()));
   if(close){if(!close.disabled)close.click();return;}
   if(dialog.dispatchEvent(new Event('cancel',{cancelable:true})))dialog.close();
  };
  dialog.prepend(cross);
 }
 document.querySelectorAll('dialog').forEach(decorate);
 new MutationObserver(records=>{const dialogs=new Set();for(const r of records){const owner=r.target.nodeType===1?r.target.closest('dialog'):r.target.parentElement?.closest('dialog');if(owner)dialogs.add(owner);for(const n of r.addedNodes)if(n.nodeType===1){if(n.matches('dialog'))dialogs.add(n);n.querySelectorAll('dialog').forEach(d=>dialogs.add(d));}}for(const d of dialogs)if(d.isConnected)decorate(d);}).observe(document.body,{childList:true,subtree:true,characterData:true});
})();

/* Full-screen control and close safeguard live here because actions.js is served
   by every supported receiver; no extra asset route is required. */
(()=>{
 'use strict';
 if(!['penalites','chronos'].includes(new URLSearchParams(location.search).get('tableau')))window.addEventListener('beforeunload',event=>{event.preventDefault();event.returnValue=true;});
 const button=document.getElementById('window-fullscreen');if(!button)return;
 const status=document.createElement('span');status.id='fullscreen-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;button.after(status);
 let timer;
 const message=text=>{status.textContent=text;status.hidden=false;clearTimeout(timer);timer=setTimeout(()=>status.hidden=true,8000);};
 const refresh=()=>{button.textContent=document.fullscreenElement?'⛶ Quitter le plein écran':'⛶ Plein écran';button.setAttribute('aria-pressed',String(!!document.fullscreenElement));};
 button.addEventListener('click',async()=>{
  message(document.fullscreenElement?'Sortie du plein écran…':'Activation du plein écran…');
  try{
   if(document.fullscreenElement){if(!document.exitFullscreen)throw Error();await document.exitFullscreen();message('Affichage en fenêtre.');}
   else{if(!document.documentElement.requestFullscreen||document.fullscreenEnabled===false)throw Error();await document.documentElement.requestFullscreen();message('Plein écran activé. Échap pour revenir.');}
   refresh();
  }catch(_){refresh();message('Le navigateur ne permet pas ce changement. Utilisez F11 pour afficher ou quitter le plein écran.');}
 });
 document.addEventListener('fullscreenchange',refresh);refresh();
})();
