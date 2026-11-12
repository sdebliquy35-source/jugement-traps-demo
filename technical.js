/* Technical state is a current view, not an acknowledged alert list. */
'use strict';
(function(){
 let current=null,detail=null;
 const names={manager:'Manager',judgment:'Jugement',signals:'Signalements',audio:'Audios'};
 const role={slalom:'Slalom',cross:'KCross',start:'Chrono départ',finish:'Chrono arrivée'};
 const age=n=>n==null?'Inconnu':n<1000?'À l’instant':Math.floor(n/1000)+' s';
 function channel(c){if(!c?.available)return 'Inconnu';return (c.pending?c.pending+' en attente':'Aucun en attente')+(c.unknown?' · '+c.unknown+' historique(s) sans accusé':'');}
 function battery(phone){const b=phone.battery;if(!b)return 'Non communiqué';return (b.charging?'⚡ ':'▱ ')+b.percent+' % · '+(b.full?'Chargée':b.charging?'En charge':b.charging===false?'Sur batterie':'Charge non communiquée')+(phone.ageMs>=10000?' · dernier état reçu':'');}
 function receive(data){current=data||null;const count=data?.anomalies||0,heading=document.querySelector('.course-tools>summary');if(heading){let warning=heading.querySelector('.control-alert-indicator');if(!warning){warning=el('span','⚠︎','control-alert-indicator');heading.append(warning);}warning.hidden=!count;warning.setAttribute('aria-label',count+' alerte'+(count>1?'s':''));warning.title=count+' alerte'+(count>1?'s':'')+' dans le contrôle des téléphones';}const b=$('control-phones');if(!b)return;b.textContent='Contrôle des téléphones'+(count?' · '+count+(count>1?' alertes':' alerte'):'');b.classList.toggle('technical-warning',count>0);b.title=data?'Batteries, transmissions et diagnostic · dernier bilan : '+new Date(data.at).toLocaleTimeString('fr-FR'):'Batteries, transmissions et diagnostic';}

 function closeOutside(d){d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});}
 function details(phone){
  if(detail)detail.close();detail=el('dialog',undefined,'technical-details');const d=detail;d.append(el('h2',(phone.post?'Poste '+phone.post:role[phone.kind]||'Téléphone')+' · '+(phone.judge||phone.deviceName||phone.device.slice(0,8))),el('p','Téléphone '+(phone.deviceName||phone.device.slice(0,8))+' · identifiant '+phone.device+' · APK '+phone.version));
  d.append(el('p','État batterie : '+battery(phone),'battery-state'));for(const issue of phone.issues||[])d.append(el('p',issue.text,issue.level==='error'?'technical-error':'technical-attention'));
  for(const [name,label]of Object.entries(names)){const c=phone.channels[name];d.append(el('h3',label+' · '+channel(c)));for(const item of c?.items||[])d.append(el('p',(item.bib?'Dossard '+item.bib+' · ':'')+(item.gates?.length?((item.kind||phone.kind)==='cross'?'Contrôles ':'Portes ')+item.gates.map(g=>(item.kind||phone.kind)==='cross'?(g===26?'E':g===27?'S':g):g).join(', ')+' · ':'')+(role[item.kind]||item.kind||'')+(item.revision?' · révision '+item.revision:'')));if(c?.more)d.append(el('p','D’autres éléments sont en attente ; ce détail est limité aux premiers éléments.'));if(name==='signals'&&c)d.append(el('p',c.incoming+' changement(s) à recevoir · '+c.outgoing+' déclaration(s) à confirmer'));}
  d.append(el('p','Ce détail conserve le bilan à son ouverture. Les mises à jour continuent dans la liste.'));const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);d.onclose=()=>{d.remove();if(detail===d)detail=null;};closeOutside(d);document.body.append(d);d.showModal();
 }
 window.TechnicalView={receive,battery,closeDetails:()=>{if(detail)detail.close();},openPhone:device=>{const phone=current?.phones?.find(p=>p.device===device);if(phone)details(phone);}};
})();
