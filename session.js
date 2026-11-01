'use strict';
let sessionState=null,sessionDialog=null,numericResults=[],chronoDialog=null;
const numericOrigin=r=>'Téléphone '+r.device.slice(0,8);
const resultName=k=>k==='start'?'Départ':k==='finish'?'Arrivée':'Cross';
const resultState=r=>r.managerState==='sent'?'Manager : réception confirmée':r.managerState==='local'?'Conservé localement':r.managerState==='unknown'?'Confirmation Manager inconnue':'Manager : en attente';
function resultTime(t){return chronoClock(t);}
async function sessionCommand(action,data){const result=await courseCommand('/api/session/admin/'+action,data);if(result.accepted){const status=$('ja-command-status');status.hidden=false;status.textContent='Demande acceptée par le Serveur Jugement. '+result.delivery;setTimeout(()=>status.hidden=true,15000);}return result;}
function sessionError(dialog,e){dialog.querySelector('[role="alert"]').textContent=e.message;}
function dialogShell(title){const d=el('dialog',undefined,'session-dialog');d.append(el('h2',title));const error=el('p');error.setAttribute('role','alert');d.append(error);d.onclose=()=>{if(sessionDialog===d)sessionDialog=null;if(chronoDialog===d)chronoDialog=null;d.remove();};document.body.append(d);window.Consultation?.watch(d,{raceId:shownRace.id});return d;}
function phoneSummary(root){root.replaceChildren();for(const p of sessionState?.phones||[]){const online=Date.now()-p.seen<12000;root.append(el('li',(p.post||p.device.slice(0,8))+' · '+(p.kind||'fonction à choisir')+(p.version<38?' · version à mettre à jour':'')+' · '+(!online?'hors ligne':p.held?'en attente de bascule':'en cours')+' · '+p.pending+' envoi(s) en attente'));}if(!root.children.length)root.append(el('li','Aucun téléphone compatible déclaré pour le moment.'));}
async function refreshSession(){try{const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)return;sessionState=await r.json();const prep=sessionState.preparation;let notice=$('session-notice');notice.hidden=!prep;notice.textContent=prep?'Préparation de « '+prep.label+' » · téléphones en attente de bascule':'';const list=sessionDialog?.querySelector('.session-phones');if(list)phoneSummary(list);if(prep)$('new-race').textContent='Terminer la préparation';else $('new-race').textContent='Préparer la prochaine course';}catch(e){console.warn(e);}}
function prepareDialog(){if(viewArchive)return;if(sessionDialog){sessionDialog.showModal();return;}const prep=sessionState?.preparation;if(prep){stageDialog(prep);return;}const current=courseCatalog.find(c=>c.active);if(!current)return;const d=dialogShell('Préparer la prochaine course');sessionDialog=d;d.append(el('p','Les téléphones compatibles seront mis en attente avant l’import du nouveau .pce dans Manager. La course actuelle et ses données sont conservées jusqu’à activation.'));const label=el('label','Course / manche'),name=el('input');name.placeholder='Ex. Manche 2 · Demi-finale';name.maxLength=120;label.append(name);d.append(label);const field=el('label','Discipline de cette course'),type=el('select');for(const [value,text] of [['slalom','Slalom'],['cross','Time Trial Kayak Cross']]){const o=el('option',text);o.value=value;type.append(o);}field.append(type);d.append(field);d.append(el('p','Le choix de fonction reste effectué par l’organisation sur chaque téléphone. Tous les téléphones participant à la bascule doivent utiliser la nouvelle version.'));const actions=el('div',undefined,'reset-actions'),cancel=el('button','Annuler'),go=el('button','Préparer et prévenir les téléphones');go.disabled=true;name.oninput=()=>go.disabled=!name.value.trim();cancel.onclick=()=>d.close();go.onclick=async()=>{go.disabled=true;try{const p=await sessionCommand('prepare',{race:current.id,label:name.value,discipline:type.value});d.close();await refreshSession();stageDialog(p);}catch(e){sessionError(d,e);go.disabled=false;}};actions.append(cancel,go);d.append(actions);d.showModal();}
function stageDialog(prep){if(sessionDialog)sessionDialog.close();const d=dialogShell('Préparation · '+prep.label);sessionDialog=d;d.append(el('p',prep.discipline==='cross'?'Time Trial Kayak Cross':'Slalom'));d.append(el('p','1. Exportez le .pce depuis CompetFFCK, puis importez-le dans Manager. 2. Récupérez sa liste ci-dessous. 3. Vérifiez la manche et les dossards avant activation.'));const phones=el('ul',undefined,'session-phones');phoneSummary(phones);d.append(phones);const advanced=el('details'),sum=el('summary','Adresse Manager si la découverte échoue');advanced.append(sum);const host=el('input'),port=el('input');host.placeholder='Adresse IP de Manager';port.type='number';port.min=1;port.max=65535;port.placeholder='Port TCP affiché dans Manager';advanced.append(host,port);d.append(advanced);const agree=el('label','Le .pce de cette course a été importé dans Manager','reset-confirm'),check=el('input');check.type='checkbox';agree.prepend(check);d.append(agree);const importButton=el('button','Récupérer la liste de Manager');importButton.disabled=true;check.onchange=()=>importButton.disabled=!check.checked;importButton.onclick=async()=>{importButton.disabled=true;try{const args={id:prep.id};if(host.value.trim()){args.host=host.value.trim();args.port=Number(port.value);}const imported=await sessionCommand('manager',args);stageDialog(imported);}catch(e){sessionError(d,e);importButton.disabled=!check.checked;}};d.append(importButton);
 if(prep.phase==='ready'){check.checked=true;importButton.disabled=false;d.append(el('h3',prep.bibs.length+' dossards · ordre Manager'));const list=el('ol',undefined,'roster-preview');for(const b of prep.bibs)list.append(el('li',String(b)));d.append(list);const confirm=el('label','Je confirme la manche, la discipline et la liste. Les anciennes données seront archivées.','reset-confirm'),c=el('input');c.type='checkbox';confirm.prepend(c);d.append(confirm);const go=el('button','Activer cette course sur les TRAPS','activate-course');go.disabled=true;c.onchange=()=>go.disabled=!c.checked;go.onclick=async()=>{go.disabled=true;try{await sessionCommand('activate',{id:prep.id,confirmation:'PCE IMPORTE ET COURSE VALIDEE'});viewArchive='';raceGeneration++;version='';await refreshCourses();await refreshSession();d.close();}catch(e){sessionError(d,e);go.disabled=!c.checked;}};d.append(go);}
 const actions=el('div',undefined,'reset-actions'),close=el('button','Fermer · conserver la préparation');close.onclick=()=>d.close();actions.append(close);if(prep.phase!=='ready'){const cancel=el('button','Annuler la préparation');cancel.onclick=async()=>{if(!confirm('Annuler uniquement si le nouveau .pce n’a PAS été importé dans Manager. Confirmez-vous que Manager utilise toujours la course précédente ?'))return;try{await sessionCommand('cancel',{id:prep.id,confirmation:'MANAGER NON BASCULE'});d.close();await refreshSession();}catch(e){sessionError(d,e);}};actions.append(cancel);}d.append(actions);d.showModal();}
$('new-race').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();prepareDialog();},true);
let sessionViewKey='';
function updateSessionResults(items,race){const key=JSON.stringify([items,race,controlData.states]);if(key===sessionViewKey)return;sessionViewKey=key;numericResults=items;const cross=race?.discipline==='cross';$('cross-results').hidden=!cross;for(const element of document.querySelectorAll('.toolbar,.stats,.judgment-legend,#sheets'))element.hidden=cross;document.querySelector('.eyebrow').textContent=cross?'TIME TRIAL KAYAK CROSS · CENTRALISATION':'SLALOM · CENTRALISATION DES POSTES';if(cross)renderCrossResults();if(chronoDialog)renderChronos();renderLive();}
function latestNumeric(kind){const map=new Map();for(const r of numericResults){if(kind&&r.kind!==kind)continue;const entries=r.kind==='cross'?r.entries:[null];for(const entry of entries){const key=JSON.stringify([r.device,r.bib,r.kind,entry?.zone||'']);const old=map.get(key);if(!old||(r.createdAt>old.result.createdAt)||(r.createdAt===old.result.createdAt&&r.revision>old.result.revision))map.set(key,{result:r,entry});}}return [...map.values()].sort((a,b)=>a.result.bib-b.result.bib||a.result.device.localeCompare(b.result.device));}
function renderCrossResults(){const root=$('cross-table');root.replaceChildren();const data=latestNumeric('cross');if(!data.length){root.append(el('p','Prêt à recevoir les pénalités du Time Trial.'));return;}const table=el('table',undefined,'results-table'),head=el('tr');for(const h of ['Dossard','Zone','Décision','Réception','Origine','Reçu à'])head.append(el('th',h));table.append(head);for(const {result:r,entry:g} of data){const row=el('tr');row.append(el('td',String(r.bib)),el('td',g.label||g.zone));const value=el('td',g.value===0?'CLR':'FLT',g.value===0?'cross-clear':'cross-fault');row.append(value,el('td',resultState(g.confirmed?{...r,managerState:'sent'}:r)),el('td',numericOrigin(r)),el('td',new Date(r.receivedAt).toLocaleTimeString('fr-FR')));table.append(row);}root.append(table);}
function chronoDuration(milliseconds){
 if(!Number.isFinite(milliseconds)||milliseconds<0)return '—';
 const centis=Math.round(milliseconds/10),minutes=Math.floor(centis/6000),seconds=Math.floor(centis/100)%60;
 return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+','+String(centis%100).padStart(2,'0');
}
function chronoClock(epoch){
 if(!epoch)return '—';const d=new Date(epoch);
 return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':')+','+String(Math.floor(d.getMilliseconds()/10)).padStart(2,'0');
}
function chronoRows(){
 const rows=new Map();
 for(const {result:r} of latestNumeric()){
  if(r.kind==='cross')continue;
  if(!rows.has(r.bib))rows.set(r.bib,{bib:r.bib,values:[],absence:null});
  rows.get(r.bib).values.push(r);
 }
 for(const state of controlData.states||[]){
  if(!state.absent)continue;
  if(!rows.has(state.bib))rows.set(state.bib,{bib:state.bib,values:[],absence:null});
  rows.get(state.bib).absence=state;
 }
 return [...rows.values()].sort((a,b)=>a.bib-b.bib);
}
function showChronoTechnical(bib){
 const item=chronoRows().find(row=>row.bib===bib);if(!item)return;
 const d=dialogShell('Détails techniques · dossard '+bib);d.classList.add('chrono-technical');
 if(item.absence){d.append(el('p','ABSENT · ce signalement remplace l’affichage des temps. Les horodatages restent conservés.','chrono-absence'));if(item.absence.updatedAt)d.append(el('p','Signalement reçu : '+new Date(item.absence.updatedAt).toLocaleString('fr-FR')));}
 const table=el('table',undefined,'results-table');const head=el('tr');for(const label of ['Type','Horodatage conservé','Confirmation','Téléphone','Réception'])head.append(el('th',label));table.append(head);
 for(const r of item.values){const row=el('tr');row.append(el('td',resultName(r.kind)),el('td',chronoClock(r.time)),el('td',resultState(r)),el('td',r.device),el('td',r.receivedAt?new Date(r.receivedAt).toLocaleString('fr-FR'):'—'));table.append(row);}
 const scroll=el('div',undefined,'chrono-technical-table');scroll.append(table);d.append(scroll);
 if(!item.values.length)d.append(el('p','Aucun chrono reçu pour ce dossard.'));
 const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);outsideChronoClose(d);d.showModal();
}
function outsideChronoClose(d){d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});}
function renderChronos(){
 if(!chronoDialog)return;const body=chronoDialog.querySelector('.chrono-table'),filter=chronoDialog.querySelector('input');body.replaceChildren();
 const table=el('table',undefined,'results-table chrono-results'),head=el('tr');
 for(const name of ['Dossard','Départ','Arrivée','Temps','Infos'])head.append(el('th',name));table.append(head);
 const rows=chronoRows().filter(row=>!filter.value||String(row.bib).includes(filter.value));
 for(const {bib,values,absence} of rows){
  const row=el('tr');row.append(el('td',String(bib),'chrono-bib'));
  if(absence){const absent=el('td','ABSENT','chrono-absence');absent.colSpan=3;row.append(absent);}
  else{
   const starts=values.filter(r=>r.kind==='start'),finishes=values.filter(r=>r.kind==='finish');
   for(const list of [starts,finishes]){const cell=el('td',undefined,'chrono-clock');if(list.length)for(const r of list)cell.append(el('div',chronoClock(r.time)));else cell.textContent='—';row.append(cell);}
   const elapsed=starts.length===1&&finishes.length===1?finishes[0].time-starts[0].time:null;
   row.append(el('td',elapsed===null?'—':chronoDuration(elapsed),'chrono-elapsed'));
  }
  const info=el('td',undefined,'chrono-info'),button=el('button','Infos','chrono-info-button');button.setAttribute('aria-label','Détails techniques du dossard '+bib);button.title='État et origine des chronos';button.onclick=()=>showChronoTechnical(bib);info.append(button);row.append(info);table.append(row);
 }
 body.append(table);if(!rows.length)body.append(el('p','Aucun chrono ni absence reçu pour cette sélection.'));
}
$('show-chronos').onclick=()=>{const d=dialogShell('Chronos de la course · '+courseTitle());chronoDialog=d;Consultation.configure(d,{refresh:()=>Consultation.flush(true)});d.classList.add('chrono-dialog');const filter=el('input');filter.type='search';filter.placeholder='Filtrer par dossard';filter.oninput=renderChronos;d.append(filter,el('div',undefined,'chrono-table'));const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});renderChronos();d.showModal();};
refreshSession();setInterval(refreshSession,3000);
