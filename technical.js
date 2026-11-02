/* Technical state is a current view, not an acknowledged alert list. */
'use strict';
(function(){
 let current=null,dialog=null,detail=null;
 const names={manager:'Manager',judgment:'Jugement',signals:'Signalements',audio:'Audios'};
 const role={slalom:'Slalom',cross:'KCross',start:'Chrono départ',finish:'Chrono arrivée'};
 const age=n=>n==null?'Inconnu':n<1000?'À l’instant':Math.floor(n/1000)+' s';
 function channel(c){if(!c?.available)return 'Inconnu';return (c.pending?c.pending+' en attente':'Aucun en attente')+(c.unknown?' · '+c.unknown+' historique(s) sans accusé':'');}
 function receive(data){current=data||null;const b=$('show-technical');if(!b)return;b.textContent='Suivi technique'+(data?.anomalies?' · '+data.anomalies+' anomalie(s)':'');b.classList.toggle('technical-warning',!!data?.anomalies);b.title=data?'Dernier bilan reçu : '+new Date(data.at).toLocaleTimeString('fr-FR'):'Mettre à jour le programme Jugement pour activer le suivi';if(dialog)paint();}
 function closeOutside(d){d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});}
 function details(phone){
  if(detail)detail.close();detail=el('dialog',undefined,'technical-details');const d=detail;d.append(el('h2',(phone.post?'Poste '+phone.post:role[phone.kind]||'Téléphone')+' · '+(phone.judge||phone.device.slice(0,8))),el('p','Téléphone '+phone.device+' · APK '+phone.version));
  for(const [name,label]of Object.entries(names)){const c=phone.channels[name];d.append(el('h3',label+' · '+channel(c)));for(const item of c?.items||[])d.append(el('p',(item.bib?'Dossard '+item.bib+' · ':'')+(item.gates?.length?'Portes '+item.gates.join(', ')+' · ':'')+(role[item.kind]||item.kind||'')+(item.revision?' · révision '+item.revision:'')));if(c?.more)d.append(el('p','D’autres éléments sont en attente ; ce détail est limité aux premiers éléments.'));if(name==='signals'&&c)d.append(el('p',c.incoming+' changement(s) à recevoir · '+c.outgoing+' déclaration(s) à confirmer'));}
  d.append(el('p','Ce détail conserve le bilan à son ouverture. Les mises à jour continuent dans la liste.'));const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);d.onclose=()=>{d.remove();if(detail===d)detail=null;};closeOutside(d);document.body.append(d);d.showModal();
 }
 function paint(){
  const root=dialog.querySelector('.technical-body'),x=root.scrollLeft,y=root.scrollTop;root.replaceChildren();
  if(!current){root.append(el('p','Suivi indisponible : mettre à jour puis relancer Jugement.'));return;}
  const copy=document.body.classList.contains('role-ja');dialog.querySelector('.technical-stamp').textContent=(copy?'Copie JA · ':'Serveur Jugement · ')+(current.label||'Course active')+' · bilan '+new Date(current.at).toLocaleTimeString('fr-FR')+(copy?' · dernière réplication : '+(deploymentState?.lastSync?new Date(deploymentState.lastSync).toLocaleTimeString('fr-FR'):'inconnue')+(deploymentState?.online?'':' · serveur hors connexion'):'');
  const table=el('table',undefined,'technical-table'),head=el('thead'),hr=el('tr');for(const label of ['Poste / fonction','Dernier contact','Manager','Jugement','Signalements','Audios','Diagnostic'])hr.append(el('th',label));head.append(hr);table.append(head);const body=el('tbody');
  for(const p of current.phones){const row=el('tr');row.className=p.issues.some(i=>i.level==='error')?'technical-error':p.issues.length?'technical-attention':'';const identity=el('td'),open=el('button',(p.post?'Poste '+p.post:role[p.kind]||'Téléphone')+(p.judge?' · '+p.judge:''));open.onclick=()=>details(p);identity.append(open,el('small',(role[p.kind]||'Fonction non choisie')+' · APK '+p.version));row.append(identity,el('td',age(p.ageMs)));for(const name of Object.keys(names))row.append(el('td',channel(p.channels[name])));row.append(el('td',p.issues.map(i=>i.text).join(' · ')||'Aucune anomalie'));body.append(row);}table.append(body);root.append(table);if(!current.phones.length)root.append(el('p','Aucun téléphone déclaré pour cette course.'));root.scrollLeft=x;root.scrollTop=y;
 }
 $('show-technical').onclick=()=>{if(dialog){dialog.showModal();return;}dialog=el('dialog',undefined,'technical-dialog');const d=dialog;d.append(el('h2','Suivi technique · course active'),el('p','Les attentes sont visibles immédiatement. Les anomalies disparaissent automatiquement à confirmation. Les historiques sans accusé restent inconnus et ne sont pas réémis vers Manager.'),el('p',undefined,'technical-stamp'),el('div',undefined,'technical-body'));const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);d.onclose=()=>{if(detail)detail.close();d.remove();dialog=null;};closeOutside(d);document.body.append(d);paint();d.showModal();refreshSession();};
 window.TechnicalView={receive};
})();
