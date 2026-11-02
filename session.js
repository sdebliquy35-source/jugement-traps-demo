/* PENALTY_GRID_MODEL_BEGIN: read-only projection, transmitter sources only in slalom. */
(function(root){
 'use strict';
 const positive=list=>[...new Set(list.filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
 const newer=(a,b)=>!b||(+a.createdAt||0)>(+b.createdAt||0)||a.createdAt===b.createdAt&&((+a.revision||0)>(+b.revision||0));
 function build(data){
  const cross=data.race?.discipline==='cross',states=new Map((data.control?.states||[]).map(s=>[s.bib,s])),rows=[],bibs=positive([...(data.race?.bibs||[]),...(data.events||[]).map(e=>e.bib),...(data.results||[]).map(r=>r.bib),...states.keys()]);
  if(cross){
   const zones=new Map();
   for(const r of data.results||[])if(r.kind==='cross')for(const g of r.entries||[]){
    const key=JSON.stringify([r.device,g.zone||'gate:'+g.gate]);
    if(!zones.has(key))zones.set(key,{key,label:g.label||'Porte '+g.gate,gate:g.gate,zone:g.zone||'',device:r.device,sector:'Cross',sectorKey:'cross',cells:new Map()});
    const row=zones.get(key),old=row.cells.get(r.bib);if(newer(r,old?.record))row.cells.set(r.bib,{value:g.value,record:r});
   }
   rows.push(...[...zones.values()].sort((a,b)=>((a.zone==='start'?0:a.gate)-(b.zone==='start'?0:b.gate))||a.label.localeCompare(b.label,'fr')||a.device.localeCompare(b.device)));
  }else{
   const latest=new Map();
   for(const e of data.events||[])for(const g of e.gates||[]){const key=JSON.stringify([e.device,e.bib,g.gate]),old=latest.get(key),at=g.enteredAt||e.createdAt,prior=old?(old.gate.enteredAt||old.event.createdAt):0;if(!old||at>prior||at===prior&&newer(e,old.event))latest.set(key,{event:e,gate:g});}
   const transmitted=[...latest.values()].filter(({event:e,gate:g})=>(e.identification?.officials||[]).some(j=>j.function==='Juge Transmetteur'&&j.gates.includes(g.gate)));
   const registrations={};for(const [device,p]of Object.entries(data.posts||{})){
    // Legacy Cross registration is technical metadata, not a slalom judging post.
    // Saved identities on actual slalom sheets remain untouched and authoritative.
    if(p.post==='Kayak Cross'&&p.officials?.length===1&&p.officials[0].name==='TRAPS Cross '+device.slice(0,8))continue;
    const officials=(p.officials||[]).filter(j=>j.function==='Juge Transmetteur');if(officials.length)registrations[device]={...p,officials};}
   const posts=root.PileModel.build(transmitted,registrations);
   for(const post of posts)for(const gate of post.gates){
    const sources=post.sources.filter(s=>s.role==='Juge Transmetteur'&&s.gates.includes(gate));
    if(!sources.length)continue;
    const row={key:JSON.stringify([post.id,gate]),label:'Porte '+gate,gate,sector:post.label,sectorKey:post.id,sectorGates:post.gates,judge:[...new Set(sources.map(s=>s.name))].join(' / '),cells:new Map()};
    for(const source of sources)for(const item of source.items)if(item.gate.gate===gate){
     const bib=item.event.bib;if(!row.cells.has(bib))row.cells.set(bib,{values:[]});
     row.cells.get(bib).values.push({value:item.gate.penalty,record:item.event,judge:source.name});
    }
    for(const cell of row.cells.values())if(cell.values.length===1){cell.value=cell.values[0].value;cell.record=cell.values[0].record;}
    rows.push(row);
   }
  }
  const sectors=[...new Set(rows.map(r=>r.sectorKey))];
  for(const row of rows){row.colour=sectors.indexOf(row.sectorKey)%5;for(const bib of bibs){const state=states.get(bib),blocked=state?.absent?'ABSENT':state?.beforeGate!=null&&row.gate>=state.beforeGate?'DESSALAGE':'';if(blocked)row.cells.set(bib,{blocked});}}
  return {cross,bibs,rows};
 }
 root.PenaltyGridModel={build};
})(globalThis);
/* PENALTY_GRID_MODEL_END */

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
async function refreshSession(){try{const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)return;sessionState=await r.json();window.TechnicalView?.receive(sessionState.technical);const prep=sessionState.preparation;let notice=$('session-notice');notice.hidden=!prep;notice.textContent=prep?'Préparation de « '+prep.label+' » · téléphones en attente de bascule':'';const list=sessionDialog?.querySelector('.session-phones');if(list)phoneSummary(list);if(prep)$('new-race').textContent='Terminer la préparation';else $('new-race').textContent='Préparer la prochaine course';}catch(e){console.warn(e);}}
function prepareDialog(){if(viewArchive)return;if(sessionDialog){sessionDialog.showModal();return;}const prep=sessionState?.preparation;if(prep){stageDialog(prep);return;}const current=courseCatalog.find(c=>c.active);if(!current)return;const d=dialogShell('Préparer la prochaine course');sessionDialog=d;d.append(el('p','Les téléphones compatibles seront mis en attente avant l’import du nouveau .pce dans Manager. La course actuelle et ses données sont conservées jusqu’à activation.'));const label=el('label','Course / manche'),name=el('input');name.placeholder='Ex. Manche 2 · Demi-finale';name.maxLength=120;label.append(name);d.append(label);const field=el('label','Discipline de cette course'),type=el('select');for(const [value,text] of [['slalom','Slalom'],['cross','Time Trial Kayak Cross']]){const o=el('option',text);o.value=value;type.append(o);}field.append(type);d.append(field);d.append(el('p','Le choix de fonction reste effectué par l’organisation sur chaque téléphone. Tous les téléphones participant à la bascule doivent utiliser la nouvelle version.'));const actions=el('div',undefined,'reset-actions'),cancel=el('button','Annuler'),go=el('button','Préparer et prévenir les téléphones');go.disabled=true;name.oninput=()=>go.disabled=!name.value.trim();cancel.onclick=()=>d.close();go.onclick=async()=>{go.disabled=true;try{const p=await sessionCommand('prepare',{race:current.id,label:name.value,discipline:type.value});d.close();await refreshSession();stageDialog(p);}catch(e){sessionError(d,e);go.disabled=false;}};actions.append(cancel,go);d.append(actions);d.showModal();}
function stageDialog(prep){if(sessionDialog)sessionDialog.close();const d=dialogShell('Préparation · '+prep.label);sessionDialog=d;d.append(el('p',prep.discipline==='cross'?'Time Trial Kayak Cross':'Slalom'));d.append(el('p','1. Exportez le .pce depuis CompetFFCK, puis importez-le dans Manager. 2. Récupérez sa liste ci-dessous. 3. Vérifiez la manche et les dossards avant activation.'));const phones=el('ul',undefined,'session-phones');phoneSummary(phones);d.append(phones);const advanced=el('details'),sum=el('summary','Adresse Manager si la découverte échoue');advanced.append(sum);const host=el('input'),port=el('input');host.placeholder='Adresse IP de Manager';port.type='number';port.min=1;port.max=65535;port.placeholder='Port TCP affiché dans Manager';advanced.append(host,port);d.append(advanced);const agree=el('label','Le .pce de cette course a été importé dans Manager','reset-confirm'),check=el('input');check.type='checkbox';agree.prepend(check);d.append(agree);const importButton=el('button','Récupérer la liste de Manager');importButton.disabled=true;check.onchange=()=>importButton.disabled=!check.checked;importButton.onclick=async()=>{importButton.disabled=true;try{const args={id:prep.id};if(host.value.trim()){args.host=host.value.trim();args.port=Number(port.value);}const imported=await sessionCommand('manager',args);stageDialog(imported);}catch(e){sessionError(d,e);importButton.disabled=!check.checked;}};d.append(importButton);
 if(prep.phase==='ready'){check.checked=true;importButton.disabled=false;d.append(el('h3',prep.bibs.length+' dossards · ordre Manager'));const list=el('ol',undefined,'roster-preview');for(const b of prep.bibs)list.append(el('li',String(b)));d.append(list);const confirm=el('label','Je confirme la manche, la discipline et la liste. Les anciennes données seront archivées.','reset-confirm'),c=el('input');c.type='checkbox';confirm.prepend(c);d.append(confirm);const go=el('button','Activer cette course sur les TRAPS','activate-course');go.disabled=true;c.onchange=()=>go.disabled=!c.checked;go.onclick=async()=>{go.disabled=true;try{await sessionCommand('activate',{id:prep.id,confirmation:'PCE IMPORTE ET COURSE VALIDEE'});viewArchive='';raceGeneration++;version='';await refreshCourses();await refreshSession();d.close();}catch(e){sessionError(d,e);go.disabled=!c.checked;}};d.append(go);}
 const actions=el('div',undefined,'reset-actions'),close=el('button','Fermer · conserver la préparation');close.onclick=()=>d.close();actions.append(close);if(prep.phase!=='ready'){const cancel=el('button','Annuler la préparation');cancel.onclick=async()=>{if(!confirm('Annuler uniquement si le nouveau .pce n’a PAS été importé dans Manager. Confirmez-vous que Manager utilise toujours la course précédente ?'))return;try{await sessionCommand('cancel',{id:prep.id,confirmation:'MANAGER NON BASCULE'});d.close();await refreshSession();}catch(e){sessionError(d,e);}};actions.append(cancel);}d.append(actions);d.showModal();}
$('new-race').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();prepareDialog();},true);
let sessionViewKey='';
function updateSessionResults(items,race){const key=JSON.stringify([items,race,controlData.states]);if(key===sessionViewKey)return;sessionViewKey=key;numericResults=items;const cross=race?.discipline==='cross';$('cross-results').hidden=!cross;for(const element of document.querySelectorAll('.toolbar,.stats,.judgment-legend,#sheets'))element.hidden=cross;document.querySelector('.eyebrow').textContent=cross?'TIME TRIAL KAYAK CROSS · CENTRALISATION':'SLALOM · CENTRALISATION DES POSTES';if(cross)renderCrossResults();if(chronoDialog)renderChronos();renderLive();}
function latestNumeric(kind){const map=new Map();for(const r of numericResults){if(kind&&r.kind!==kind)continue;const entries=r.kind==='cross'?r.entries:[null];for(const entry of entries){const key=JSON.stringify([r.device,r.bib,r.kind,entry?.zone||'']);const old=map.get(key);if(!old||(r.createdAt>old.result.createdAt)||(r.createdAt===old.result.createdAt&&r.revision>old.result.revision))map.set(key,{result:r,entry});}}return [...map.values()].sort((a,b)=>a.result.bib-b.result.bib||a.result.device.localeCompare(b.result.device));}
function renderCrossResults(){window.PenaltyTables?.renderCross();}
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

/* Compact live tables: no drawings, notes, writes or Manager commands. */
(function(){
 const query=new URLSearchParams(location.search),detached=query.get('tableau')==='penalites';
 let snapshot=null,lastModel=null,crossView=null,windowView=null;
 if(detached){document.body.classList.add('penalty-grid-window');viewArchive=query.get('archive')||'';const root=el('section',undefined,'penalty-window-root');document.querySelector('main').prepend(root);windowView=createView(root,true);}
 function createView(root,separate=false){
  const title=el('h2','Tableau des pénalités'),subtitle=el('p'),tools=el('div',undefined,'penalty-grid-tools');
  const bibLabel=el('label','Dossards'),bib=el('input');bib.placeholder='Tous · ex. 1, 4–9';bib.setAttribute('aria-label','Dossards du tableau');bibLabel.append(bib);
  const doorLabel=el('label','Portes'),door=el('input');door.placeholder='Toutes · ex. 5–8';door.setAttribute('aria-label','Portes du tableau');doorLabel.append(door);
  const pageLabel=el('label','Dossards affichés'),page=el('select');page.setAttribute('aria-label','Série de dossards du tableau');pageLabel.append(page);
  const previous=el('button','←'),next=el('button','→');previous.setAttribute('aria-label','Dix dossards précédents');next.setAttribute('aria-label','Dix dossards suivants');
  const status=el('span','En attente de réception…','penalty-grid-status');status.setAttribute('role','status');
  const legend=el('div',undefined,'penalty-sector-legend');const scroll=el('div',undefined,'penalty-grid-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','Tableau des pénalités, défilement horizontal et vertical');
  tools.append(bibLabel,doorLabel,previous,pageLabel,next,status);root.append(title,subtitle,tools,legend,scroll);
  const view={root,title,subtitle,bib,door,page,previous,next,status,scroll,legend,key:'',pageKey:'',signatures:new Map(),race:null,model:null};
  bib.oninput=()=>paint(view,true);door.oninput=()=>paint(view,true);page.onchange=()=>paint(view,true);
  previous.onclick=()=>{page.selectedIndex=Math.max(0,page.selectedIndex-1);paint(view,true);};next.onclick=()=>{page.selectedIndex=Math.min(page.options.length-1,page.selectedIndex+1);paint(view,true);};
  return view;
 }
 function matches(input,n){const text=input.value.trim();if(!text){input.setCustomValidity('');return true;}const parts=text.split(/[,;\s]+/);if(parts.some(p=>!/^\d+(?:[-–]\d+)?$/.test(p))){input.setCustomValidity('Utilisez des numéros ou intervalles, par exemple 1, 4–9');return false;}input.setCustomValidity('');return parts.some(p=>{const [a,b]=p.split(/[-–]/).map(Number);return n>=a&&n<=(b??a);});}
 function paint(v,force=false){
  if(!snapshot||!lastModel)return;const model=lastModel;
  if(v.race!==snapshot.race?.id){v.race=snapshot.race?.id;v.page.value='all';v.pageKey='';v.key='';v.signatures.clear();}
  const bibs=model.bibs.filter(b=>matches(v.bib,b)),pages=[...new Set(bibs.map(b=>Math.floor((b-1)/10)*10+1))],pageKey=JSON.stringify(pages);
  if(v.pageKey!==pageKey){const old=v.page.value;v.page.replaceChildren();const all=el('option','Tous');all.value='all';v.page.append(all);for(const start of pages){const o=el('option',start+'–'+(start+9));o.value=String(start);v.page.append(o);}v.page.value=old==='all'||!old?'all':pages.includes(+old)?old:'all';v.pageKey=pageKey;}
  v.previous.disabled=v.page.selectedIndex<=0;v.next.disabled=v.page.selectedIndex>=v.page.options.length-1;
  const start=+v.page.value,visibleBibs=v.page.value==='all'?bibs:bibs.filter(b=>b>=start&&b<start+10),doors=model.rows.filter(r=>matches(v.door,r.gate));
  v.title.textContent=(model.cross?'Time Trial Kayak Cross':'Slalom')+' · Tableau des pénalités';
  v.subtitle.textContent=(viewArchive?'Archive · ':'Course active · ')+(snapshot.race?.label||'Sans libellé')+(model.cross?'':' · Juges transmetteurs uniquement');
  const serial=doors.map(r=>({key:r.key,colour:r.colour,label:r.label,cells:visibleBibs.map(b=>r.cells.get(b))}));
  v.status.textContent=doors.length+' porte(s) / zone(s) · '+visibleBibs.length+' dossard(s) · actualisation automatique';
  const key=JSON.stringify([snapshot.race,visibleBibs,serial]);if(!force&&key===v.key)return;v.key=key;
  const x=v.scroll.scrollLeft,y=v.scroll.scrollTop,table=el('table',undefined,'penalty-grid'),head=el('thead'),heading=el('tr');
  const slalom=!model.cross;table.classList.toggle('slalom-grid',slalom);v.scroll.classList.toggle('slalom-grid-scroll',slalom);
  const corner=el('th','Dossard','grid-corner');corner.scope='col';heading.className='door-heading';
  v.legend.replaceChildren();v.legend.hidden=true;
  if(slalom){
   const cols=el('colgroup'),bibCol=el('col',undefined,'grid-bib-col');cols.append(bibCol);for(let i=0;i<25;i++)cols.append(el('col',undefined,'grid-gate-col'));table.append(cols);
   const sectors=el('tr',undefined,'grid-post-heading');corner.rowSpan=2;sectors.append(corner);
   for(let i=0;i<doors.length;){let end=i+1;while(end<doors.length&&doors[end].sectorKey===doors[i].sectorKey)end++;const th=el('th',doors[i].sector,'grid-post-title');th.colSpan=end-i;th.scope='colgroup';sectors.append(th);i=end;}
   const remaining=Math.max(0,25-doors.length);if(remaining){const blank=el('th',undefined,'grid-reserved');blank.colSpan=remaining;blank.rowSpan=2;blank.setAttribute('aria-hidden','true');sectors.append(blank);}head.append(sectors);
  }else heading.append(corner);
  for(let i=0;i<doors.length;i++){
   const door=doors[i],th=el('th',slalom?String(door.gate):door.label);th.scope='col';th.title=model.cross?door.label:door.sector+' · '+door.label+' · '+door.judge;
   if(slalom){if(i===0||doors[i-1].sectorKey!==door.sectorKey)th.classList.add('sector-start');if(i===doors.length-1||doors[i+1].sectorKey!==door.sectorKey)th.classList.add('sector-end');}heading.append(th);
  }head.append(heading);table.append(head);
  const body=el('tbody'),newSignatures=new Map();
  for(const bib of visibleBibs){
   const tr=el('tr'),label=el('th',String(bib));label.scope='row';tr.append(label);
   for(let column=0;column<doors.length;column++){const door=doors[column],item=door.cells.get(bib),cell=el('td'),identity=JSON.stringify([door.key,bib]),signature=JSON.stringify(item?.blocked||(item?.values?item.values.map(v=>v.value):(item?.value??null)));newSignatures.set(identity,signature);
    if(item?.blocked){cell.textContent=item.blocked==='ABSENT'?'ABS':'DES';cell.className='grid-blocked';cell.title=item.blocked;cell.setAttribute('aria-label',item.blocked);}
    else if(item?.values?.length>1){cell.className='grid-multiple';for(const value of item.values){const chip=el('span',String(value.value),'grid-chip value-'+value.value);chip.title=value.judge+' · Téléphone '+value.record.device;cell.append(chip);}cell.title='Plusieurs transmetteurs pour ce dossard et cette porte : valeurs conservées séparément';}
    else if(item&&Number.isFinite(item.value)){cell.textContent=model.cross?(item.value===0?'CLR':'FLT'):String(item.value);cell.className='grid-value value-'+item.value;cell.title='Dossard '+bib+' · '+door.label;}
    else{cell.textContent='—';cell.className='grid-empty';cell.title='Aucune pénalité reçue pour le dossard '+bib;}
    if(v.signatures.has(identity)&&v.signatures.get(identity)!==signature)cell.classList.add('grid-updated');if(slalom){if(column===0||doors[column-1].sectorKey!==door.sectorKey)cell.classList.add('sector-start');if(column===doors.length-1||doors[column+1].sectorKey!==door.sectorKey)cell.classList.add('sector-end');}tr.append(cell);
   }if(slalom&&doors.length<25){const blank=el('td',undefined,'grid-reserved');blank.colSpan=25-doors.length;blank.setAttribute('aria-hidden','true');tr.append(blank);}body.append(tr);
  }
  table.append(body);v.signatures=newSignatures;v.scroll.replaceChildren(table);if(!doors.length||!visibleBibs.length)v.scroll.append(el('p','Aucune pénalité reçue pour cette sélection.','penalty-grid-empty'));v.scroll.scrollLeft=x;v.scroll.scrollTop=y;
 }

 function renderCross(){if(!snapshot)return;const root=$('cross-table');if(!crossView)crossView=createView(root);paint(crossView);}
 function receive(data){snapshot=data;lastModel=PenaltyGridModel.build(data);if(windowView)paint(windowView);if(data.race?.discipline==='cross')renderCross();}
 $('show-penalty-grid').onclick=()=>{const url=new URL(location.href);url.searchParams.set('tableau','penalites');if(viewArchive)url.searchParams.set('archive',viewArchive);else url.searchParams.delete('archive');const win=window.open(url.toString(),'_blank','popup=yes,width=1220,height=820');if(!win)alert('Autorisez l’ouverture d’une fenêtre pour afficher le tableau des pénalités.');};
 window.PenaltyTables={receive,renderCross,unavailable(){for(const v of [crossView,windowView])if(v)v.status.textContent='Connexion interrompue · dernières valeurs conservées';}};
})();
