/* PENALTY_GRID_MODEL_BEGIN: read-only projection, transmitter sources only in slalom. */
(function(root){
 'use strict';
 const positive=list=>[...new Set(list.filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
 const newer=(a,b)=>!b||(+a.createdAt||0)>(+b.createdAt||0)||a.createdAt===b.createdAt&&((+a.revision||0)>(+b.revision||0));
 function build(data){
  const cross=data.race?.discipline==='cross',states=new Map((data.control?.states||[]).map(s=>[s.bib,s])),rows=[],bibs=positive([...(data.race?.bibs||[]),...(data.events||[]).map(e=>e.bib),...(data.results||[]).map(r=>r.bib),...(data.livePenalties||[]).map(p=>p.bib),...states.keys()]);
  if(cross){
   const zones=new Map();
   for(const r of [...(data.results||[]),...(data.livePenalties||[]).filter(p=>p.kind==='cross').map(p=>({id:p.event,device:p.device,bib:p.bib,kind:'cross',createdAt:p.createdAt,revision:p.version,entries:[{gate:p.gate,slot:p.slot,zone:p.zone,label:p.zone,value:p.value}]}))])if(r.kind==='cross')for(const g of r.entries||[]){
    const key=JSON.stringify([r.device,g.slot?('zone:'+g.slot):data.race?.plan?.discipline==='cross'?(g.zone==='start'||g.zone==='roll'?g.zone:'gate:'+g.gate):g.zone||'gate:'+g.gate]);
    if(!zones.has(key))zones.set(key,{key,label:(g.slot?'Zone '+g.slot+' · ':'')+(g.zone==='start'?'Start S':g.zone==='roll'?'Esquimautage E':'Porte '+g.gate),slot:g.slot,gate:g.gate,zone:g.zone||'',device:r.device,sector:'Cross',sectorKey:'cross',cells:new Map()});
    const row=zones.get(key),old=row.cells.get(r.bib);if(newer(r,old?.record))row.cells.set(r.bib,{value:g.value,record:r});
   }
   rows.push(...[...zones.values()].sort((a,b)=>((a.slot??(a.zone==='start'?0:a.zone==='roll'?(data.race?.plan?.rollAfterGate??a.gate)+0.5:a.gate))-(b.slot??(b.zone==='start'?0:b.zone==='roll'?(data.race?.plan?.rollAfterGate??b.gate)+0.5:b.gate)))||a.label.localeCompare(b.label,'fr')||a.device.localeCompare(b.device)));
  }else{
   const latest=new Map();
   const immediate=(data.livePenalties||[]).filter(p=>p.kind==='slalom').map(p=>({id:p.event,device:p.device,bib:p.bib,createdAt:p.createdAt,revision:p.version,identification:p.identification,gates:[{gate:p.gate,penalty:p.value,enteredAt:p.enteredAt}]}));
   for(const e of [...(data.events||[]),...immediate])for(const g of e.gates||[]){const key=JSON.stringify([e.device,e.bib,g.gate]),old=latest.get(key),at=g.enteredAt||e.createdAt,prior=old?(old.gate.enteredAt||old.event.createdAt):0;if(!old||at>prior||at===prior&&newer(e,old.event))latest.set(key,{event:e,gate:g});}
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
  for(const row of rows){row.colour=sectors.indexOf(row.sectorKey)%5;for(const bib of bibs){const state=states.get(bib),blocked=state?.absent?'ABSENT':state?.beforeGate!=null&&(cross&&state.beforeZone!=null&&row.slot!=null?row.slot>=state.beforeZone:cross&&row.zone==='start'?state.beforeElement==='start':cross&&row.zone==='roll'?['start','roll'].includes(state.beforeElement)||(data.race?.plan?.rollAfterGate??-2)+0.5>=state.beforeGate:row.gate>=state.beforeGate)?'DESSALAGE':'';if(blocked)row.cells.set(bib,{blocked});}}
  return {cross,bibs,rows};
 }
 root.PenaltyGridModel={build};
})(globalThis);
/* PENALTY_GRID_MODEL_END */

'use strict';
let sessionState=null,sessionDialog=null,numericResults=[],chronoDialog=null;
const detachedChronos=new URLSearchParams(location.search).get("tableau")==="chronos";let chronoWindow=null;
const numericOrigin=r=>r.identification?.officials?.map(j=>j.name).filter(Boolean).join(' / ')||'Téléphone '+r.device.slice(0,8);
const resultName=k=>k==='start'?'Départ':k==='finish'?'Arrivée':'Cross';
const resultState=r=>r.managerState==='sent'?'Manager : réception confirmée':r.managerState==='local'?'Conservé localement':r.managerState==='unknown'?'Confirmation Manager inconnue':'Manager : en attente';
function resultTime(t){return chronoClock(t);}
async function sessionCommand(action,data){const result=await courseCommand('/api/session/admin/'+action,data);if(result.accepted){const status=$('ja-command-status');status.hidden=false;status.textContent='Demande acceptée par le Serveur Jugement. '+result.delivery;setTimeout(()=>status.hidden=true,15000);}return result;}
function sessionError(dialog,e){dialog.querySelector('[role="alert"]').textContent=e.message;}
function dialogShell(title){const d=el('dialog',undefined,'session-dialog');d.append(el('h2',title));const error=el('p');error.setAttribute('role','alert');d.append(error);d.onclose=()=>{if(sessionDialog===d)sessionDialog=null;if(chronoDialog===d)chronoDialog=null;d.remove();};document.body.append(d);window.Consultation?.watch(d,{raceId:shownRace.id});return d;}
function phoneSummary(root){root.replaceChildren();for(const p of sessionState?.phones||[]){if(root.dataset.race&&p.race!==root.dataset.race)continue;const online=Date.now()-p.seen<12000;root.append(el('li',(p.post||p.device.slice(0,8))+' · '+(p.kind||'fonction à choisir')+(p.version<53?' · version à mettre à jour':'')+' · '+(!online?'hors ligne':p.held?'en attente de bascule':'en cours')+' · '+p.pending+' envoi(s) en attente'));}if(!root.children.length)root.append(el('li','Aucun téléphone compatible déclaré pour le moment.'));}
async function refreshSession(){try{const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)return;sessionState=await r.json();const progress=document.querySelector('.reassignment-status');if(progress){const t=sessionState.configurationTransition;progress.textContent=!t?'Portes appliquées sur tous les téléphones · reprise autorisée':t.phase==='applying'?'Application des portes sur les téléphones : '+t.applied.length+' / '+t.devices.length:'Mise en attente des téléphones concernés';}for(const id of ['course-plan','course-reassign']){const b=$(id);if(b)b.hidden=!!viewArchive||deploymentState?.role!=='server';}window.TechnicalView?.receive(sessionState.technical);if(phoneControlDialog)phoneControlPaint(phoneControlDialog);const prep=sessionState.preparation;let notice=$('session-notice');notice.hidden=!prep;notice.textContent=prep?'Préparation de « '+prep.label+' » · '+(prep.phase==='quiescing'?'téléphones en attente de bascule':'brouillon, course active conservée'):'';const list=sessionDialog?.querySelector('.session-phones');if(list)phoneSummary(list);sessionDialog?.refreshAutomaticNext?.();$('new-race').classList.toggle('course-creation-pending',!!prep);if(prep)$('new-race').textContent='Terminer la création de course';else $('new-race').textContent='Charger une course';}catch(e){console.warn(e);}}
function courseStepPanel(d,label){
 d.classList.add('course-creation-dialog');const panel=el('section',undefined,'course-ready-next'),title=el('strong',label),actions=el('div',undefined,'course-step-actions');panel.append(title,actions);d.append(panel);return actions;
}
function courseStepAction(d,button){const actions=d.querySelector('.course-step-actions');if(!actions)return false;button.classList.add('course-step-primary');actions.append(button);return true;}
function courseStageLabel(prep){
 const cross=prep.discipline==='cross';return {'waiting-pce':'Étape 2 · Charger et vérifier la liste','ready':'Étape 3 · '+(prep.discipline?(cross?'Configurer le parcours Cross':'Définir le tracé'):'Confirmer la discipline'),'layout-ready':'Étape 4 · Valider les postes','configured':(cross?'Parcours validé':'Postes validés'+(prep.plan?.posts?.length?' · '+prep.plan.posts.length+(prep.plan.posts.length===1?' poste':' postes'):''))+' · Étape '+(cross?'4':'5')+' : préparer les téléphones','quiescing':'Étape '+(cross?'5':'6')+' · Vérifier et activer la course'}[prep.phase]||'Préparation de la course';
}
let creationWebsocketEndpoint=null;
function creationConnectionsDialog(){
 const d=dialogShell('Charger une course · connexions');sessionDialog=d;d.classList.add('creation-connections-dialog');
 d.append(el('p','Le WebSocket de CompetFFCK permet de récupérer la liste de départ, la discipline, le nom de la manche et les données de parcours disponibles. Ces informations seront présentées à l’écran suivant. Vous pouvez poursuivre sans cette connexion et charger un fichier PCE. La liaison de transfert des pénalités se règle séparément depuis le bandeau principal.'));
 const cards=el('div',undefined,'creation-connection-cards'),ws=el('button','WebSocket · vérification…','creation-connection-button');
 for(const b of [ws]){b.type='button';b.disabled=true;cards.append(b);}d.append(cards);let state=null,busy=false;
 const paint=(button,label,value)=>{const ok=!!value?.ready;button.disabled=false;button.classList.toggle('connection-online',ok);button.classList.toggle('connection-offline',!ok);button.textContent=label+' · '+(ok?(label==='WebSocket'?'Connecté · manche active':'Connecté'):label==='Serveur TRAPS'?'Connecter Jugement':value?.reachable?'Manche inactive · relire':'Se connecter');button.setAttribute('aria-label',label+' · '+(value?.message||'État indisponible'));button.title=value?.message||'État indisponible';};
 const wsStatus=el('p','Vérification du WebSocket…','creation-connection-status');for(const text of [wsStatus]){text.setAttribute('role','status');d.append(text);}
 const refresh=async()=>{if(busy||!d.open)return;busy=true;try{const data=await sessionCommand('connection-check',{kind:'websocket',defaultHost:location.hostname==='localhost'?'127.0.0.1':location.hostname});if(!d.open)return;state=data;paint(ws,'WebSocket',data.websocket);wsStatus.textContent=data.websocket.message+' · '+data.websocket.host+':'+data.websocket.port;skip.textContent=data.websocket.preview?'Continuer · afficher la liste':'Passer cette étape';}catch(error){if(!d.open)return;paint(ws,'WebSocket',null);wsStatus.textContent='État des connexions indisponible : '+error.message;}finally{busy=false;}};
 const afterConnection=child=>{if(child)child.addEventListener('close',()=>{if(d.open)refresh();},{once:true});};
 ws.onclick=()=>{const child=dialogShell('Connexion WebSocket · CompetFFCK');child.classList.add('creation-websocket-dialog');liveRosterImport(child,{liveEndpoint:state?.websocket||{},connectionOnly:true});const close=el('button','Fermer','zoom-close');close.onclick=()=>child.close();child.append(close);afterConnection(child);child.showModal();};
 const skip=el('button','Passer cette étape','creation-connections-skip');skip.onclick=async()=>{const preview=state?.websocket?.preview;if(!preview||sessionState?.preparation){sessionDialog=null;d.close();prepareDialog(true);return;}skip.disabled=true;try{const current=courseCatalog.find(c=>c.active);if(!current)throw Error('Course active à retrouver : actualisez la page.');const prep=await sessionCommand('prepare',{race:current.id,label:preview.label,discipline:'',livePreviewToken:preview.token});sessionDialog=null;d.close();await refreshSession();stageDialog(prep);}catch(error){sessionError(d,error);}finally{skip.disabled=false;}};d.append(skip);d.showModal();refresh();
}
function prepareDialog(skipConnections=false){
 if(viewArchive)return;if(sessionDialog){sessionDialog.showModal();return;}
 if(!skipConnections){creationConnectionsDialog();return;}
 const prep=sessionState?.preparation;if(prep){stageDialog(prep);return;}
 const current=courseCatalog.find(c=>c.active);if(!current)return;
 const d=dialogShell('Nouvelle course');sessionDialog=d;
 d.append(el('p','Créez un brouillon : la course actuelle continue pendant le paramétrage. Avant de changer la manche dans CompetFFCK, vérifiez ses envois en attente et suspendez sa liaison.'));
 d.append(el('p','La discipline sera identifiée depuis CompetFFCK ou le fichier PCE : Slalom ou Time Trial Kayak Cross.'));
 courseStepPanel(d,'Étape 1 · Nommer la course');const label=el('label','Nom de la course / manche'),name=el('input');name.maxLength=120;name.placeholder='Ex. Manche 2 · Demi-finale';label.append(name);d.append(label);
 const go=el('button','Continuer · charger la liste'),close=el('button','Annuler');go.disabled=true;name.oninput=()=>go.disabled=!name.value.trim();close.onclick=()=>d.close();go.onclick=async()=>{go.disabled=true;try{const p=await sessionCommand('prepare',{race:current.id,label:name.value,discipline:''});d.close();await refreshSession();stageDialog(p);}catch(e){sessionError(d,e);go.disabled=false;}};courseStepAction(d,go);const footer=el('div',undefined,'course-wizard-actions');footer.append(close);d.append(footer);courseWizardFooter(d,null,close);d.showModal();
}
function crossZonesEditor(d,initial,previous,onSave,active){
 d.classList.add('course-setup-dialog');
 const source=initial||(previous?.discipline==='cross'?previous:null)||{},fromLegacy=()=>{const out=[];let slot=1;if(source.startEnabled??true)out.push({slot:slot++,type:'start',gate:27});for(let n=0;n<=(source.gateCount||6);n++){if(source.rollAfterGate===n)out.push({slot:slot++,type:'roll',gate:26});if(n<(source.gateCount||6))out.push({slot:slot++,type:'gate',gate:n+1});}return out;};
 let zones=(source.crossZones||fromLegacy()).map(z=>({...z})),red=new Set(source.redGates||[]);const sectors=()=>{const slots=zones.map(z=>z.slot).sort((a,b)=>a-b);return JSON.stringify(slots)===JSON.stringify((source.crossSectors||[]).flatMap(p=>p.slots).sort((a,b)=>a-b))?(source.crossSectors||[]):[];};const use={checked:true};
 d.append(el('p','Chaque zone correspond directement à une colonne de CompetFFCK. Associez-lui une porte numérotée, Start S ou Esquimautage E. S et E sont facultatifs.'));
 const rows=el('div',undefined,'cross-zone-editor');d.append(rows);
 const render=()=>{rows.hidden=!use.checked;rows.replaceChildren();zones.forEach((z,i)=>{
  const row=el('div',undefined,'cross-zone-config'),id=el('input'),kind=el('select'),gate=el('input'),colour=el('button',red.has(z.gate)?'Rouge':'Verte','course-gate-plaque');
  id.type='number';id.min=1;id.max=27;id.value=z.slot;id.setAttribute('aria-label','Numéro de zone '+(i+1));id.disabled=active;id.oninput=()=>z.slot=+id.value;
  for(const [value,text]of [['gate','Porte'],['start','Start S'],['roll','Esquimautage E']]){const o=el('option',text);o.value=value;kind.append(o);}kind.value=z.type;kind.disabled=active;kind.setAttribute('aria-label','Contrôle de la zone '+z.slot);
  gate.type='number';gate.min=1;gate.max=25;gate.value=z.type==='gate'?z.gate:1;gate.setAttribute('aria-label','Porte de la zone '+z.slot);gate.disabled=active;
  const update=()=>{gate.hidden=colour.hidden=z.type!=='gate';row.classList.toggle('roll',z.type==='roll');row.classList.toggle('start',z.type==='start');colour.classList.toggle('red',red.has(z.gate));};
  kind.onchange=()=>{z.type=kind.value;z.gate=z.type==='gate'?+gate.value:z.type==='start'?27:26;update();};gate.oninput=()=>{z.gate=+gate.value;update();};colour.onclick=()=>{if(red.has(z.gate))red.delete(z.gate);else red.add(z.gate);colour.textContent=red.has(z.gate)?'Rouge':'Verte';update();};
  const remove=el('button','Retirer');remove.disabled=active;remove.onclick=()=>{zones.splice(i,1);render();};row.append(el('b','Zone'),id,kind,gate,colour,remove);rows.append(row);update();
 });};render();
 const add=el('button','＋ Ajouter une zone');add.disabled=active;add.hidden=!use.checked;use.onchange=()=>{rows.hidden=add.hidden=!use.checked;};add.onclick=()=>{if(zones.length>=27)return;const slot=Math.max(0,...zones.map(z=>z.slot))+1;zones.push({slot,type:'gate',gate:Math.min(25,Math.max(0,...zones.filter(z=>z.type==='gate').map(z=>z.gate))+1)});render();};d.append(add);
 d.courseDraftPlan=()=>({gateCount:Math.max(1,...zones.filter(z=>z.type==='gate').map(z=>z.gate)),layoutConfigured:true,redGates:[...red],posts:[],crossZoneProtocol:1,crossZones:zones.map(z=>({...z})),crossSectors:sectors()});const save=el('button','Enregistrer les zones Cross');save.onclick=async()=>{save.disabled=true;try{if(!use.checked){await onSave({gateCount:25,layoutConfigured:false,redGates:[],posts:[],startEnabled:false,rollAfterGate:null,crossZoneProtocol:1});return;}const gates=new Set(zones.filter(z=>z.type==='gate').map(z=>z.gate));await onSave({gateCount:Math.max(1,...gates),layoutConfigured:true,redGates:[...red].filter(g=>gates.has(g)).sort((a,b)=>a-b),posts:[],crossZoneProtocol:1,crossZones:zones.map(z=>({...z})),crossSectors:sectors()});}catch(e){sessionError(d,e);}finally{save.disabled=false;}};
 const footer=el('div',undefined,'course-wizard-actions');if(!courseStepAction(d,save))footer.append(save);d.append(footer);
}
/* POST_REUSE_BEGIN: assignment validity does not depend on red/green gate colours. */
function postDoorConflicts(posts){
 const owners=new Map();for(const post of posts){for(const gate of new Set(post.gates)){if(!Number.isInteger(gate)||gate<1)continue;let assigned=owners.get(gate);if(!assigned){assigned=new Set();owners.set(gate,assigned);}assigned.add(post.number);}}
 return [...owners].filter(([,posts])=>posts.size>1).sort((a,b)=>a[0]-b[0]).map(([gate,posts])=>({gate,posts:[...posts].sort((a,b)=>a-b)}));
}
function reusablePostPlan(previous,count){
 const unavailable=reason=>({available:false,reason,posts:[]});
 if(!previous||!Array.isArray(previous.posts)||!previous.posts.length)return unavailable('Aucun poste enregistré dans la course précédente.');
 if((previous.discipline||'slalom')!=='slalom')return unavailable('Les postes précédents ne correspondent pas au Slalom.');
 if(!Number.isInteger(count)||count!==previous.gateCount)return unavailable('Nombre de portes différent : '+previous.gateCount+' dans la course précédente.');
 const gates=new Set(),numbers=new Set(),posts=[];
 for(const post of previous.posts){
  if(!post||!Number.isInteger(post.number)||post.number<1||post.number>99||numbers.has(post.number)||!Array.isArray(post.gates)||post.gates.length<1||post.gates.length>5)return unavailable('Les postes précédents sont incomplets ou invalides.');
  numbers.add(post.number);
  for(const gate of post.gates){if(!Number.isInteger(gate)||gate<1||gate>count||gates.has(gate))return unavailable('Les postes précédents sont incomplets ou invalides.');gates.add(gate);}
  posts.push({number:post.number,gates:[...post.gates].sort((a,b)=>a-b)});
 }
 if(gates.size!==count)return unavailable('Les postes précédents ne couvrent pas toutes les portes.');
 return {available:true,reason:posts.length+' postes disponibles · '+count+' portes. Le tracé est indépendant de cette reprise.',posts:posts.sort((a,b)=>a.number-b.number)};
}
/* POST_REUSE_END */
function coursePlanEditor(d,initial,previous,onSave,active=false,part='all',discipline='slalom'){
 if(discipline==='cross')return crossZonesEditor(d,initial,previous,onSave,active);
 d.classList.add('course-setup-dialog');
 const cross=discipline==='cross';
 const source=initial||{gateCount:previous?.gateCount||20,layoutConfigured:false,redGates:[],posts:[]};
 const count=el('input');count.type='number';count.min=1;count.max=25;count.value=source.gateCount;count.disabled=active||part==='posts';
 const countLabel=el('label','Nombre de portes · 1 à 25');countLabel.append(count);if(part==='posts'){countLabel.hidden=true;d.append(el('p','Parcours : '+source.gateCount+' portes','course-post-gate-count'));}d.append(countLabel);
 const mode=el('select');for(const [value,text]of [['none','Ne pas renseigner de tracé'],['create','Créer / recréer le tracé'],...(previous?.layoutConfigured&&(previous.discipline||'slalom')===discipline?[['keep','Conserver le tracé précédent']]:[])]){const o=el('option',text);o.value=value;mode.append(o);}mode.value=source.layoutConfigured?'create':'none';
 const ml=el('label','Tracé');ml.append(mode);d.append(ml);if(part==='posts')ml.hidden=true;const plaques=el('div',undefined,'course-gate-plaques');d.append(plaques);let red=new Set(source.redGates||[]),roll=cross?(source.rollAfterGate??null):null;const startField=el('label','Colonne Start S présente dans CompetFFCK'),startCheck=el('input');startCheck.type='checkbox';startCheck.checked=source.startEnabled??true;startField.append(startCheck);if(cross&&part!=='posts')d.append(startField);const eField=el('label','Position de l’esquimautage E'),eSelect=el('select');eSelect.setAttribute('aria-label','Position de E');eField.append(eSelect);if(cross&&part!=='posts')d.append(eField);const fillE=()=>{eSelect.replaceChildren();const absent=el('option','Pas d’esquimautage renseigné');absent.value='none';eSelect.append(absent);for(let n=0;n<=+count.value;n++){const o=el('option',n===0?'Avant la porte 1':n===+count.value?'Après la porte '+n:'Après la porte '+n+' / avant la porte '+(n+1));o.value=String(n);eSelect.append(o);}eSelect.value=roll===null?'none':String(roll);};fillE();
 const draw=()=>{plaques.replaceChildren();plaques.hidden=part==='posts'||mode.value==='none';eField.hidden=!cross||part==='posts'||mode.value==='none';
  const addSpecial=(key,label,colour)=>{const b=el('button',key,'course-gate-plaque '+colour);b.setAttribute('aria-label',label);b.onclick=()=>{const choice=dialogShell(label);if(key==='E'){const remove=el('button','Retirer E du parcours');remove.onclick=()=>{roll=null;fillE();choice.close();draw();};choice.append(el('p','Position : '+(roll===0?'avant la porte 1':'après la porte '+roll)),remove);}else choice.append(el('p','Start S est un contrôle distinct du chrono départ.'));const close=el('button','Fermer');close.onclick=()=>choice.close();choice.append(close);choice.showModal();};plaques.append(b);};
  if(cross&&startCheck.checked)addSpecial('S','Start S','start');
  for(let n=0;n<=+count.value;n++){
   if(cross&&roll===n)addSpecial('E','Esquimautage E · '+(n===0?'avant la porte 1':'après la porte '+n),'roll');
   const gate=n+1;if(gate>+count.value)continue;
   const b=el('button',String(gate),'course-gate-plaque');b.type='button';b.classList.toggle('red',red.has(gate));b.setAttribute('aria-label','Porte '+gate+' · '+(red.has(gate)?'rouge':'verte'));
   b.onclick=()=>{const choice=dialogShell('Choisir la porte '+gate);for(const [kind,label]of [['green','Verte'],['red','Rouge']]){const pick=el('button',label,'door-choice '+kind);pick.onclick=()=>{red.delete(gate);if(kind==='red')red.add(gate);mode.value='create';choice.close();draw();};choice.append(pick);}if(cross&&roll===null){const insert=el('button','Placer E après cette porte','door-choice roll');insert.onclick=()=>{roll=gate;fillE();choice.close();draw();};choice.append(insert);}const close=el('button','Annuler');close.onclick=()=>choice.close();choice.append(close);choice.showModal();};plaques.append(b);
  }
 };
 startCheck.onchange=()=>draw();
 eSelect.onchange=()=>{roll=eSelect.value==='none'?null:+eSelect.value;draw();};
 let refreshPostReuse=()=>{};mode.onchange=()=>{if(mode.value==='keep'){count.value=previous.gateCount;red=new Set(previous.redGates);roll=previous.rollAfterGate??null;startCheck.checked=previous.startEnabled??true;}else if(mode.value==='create'){red.clear();roll=null;}fillE();draw();refreshPostReuse();};count.oninput=()=>{red=new Set([...red].filter(g=>g<=+count.value));if(roll>+count.value)roll=null;fillE();draw();refreshPostReuse();};draw();

 let posts=source.posts.map(p=>({number:p.number,gates:[...p.gates]})),validatePosts=()=>true,postChange=()=>{};
 const rows=el('div',undefined,'course-post-rows');
 function postRows(){rows.replaceChildren();posts.forEach((post,i)=>{const row=el('div',undefined,'course-post-row'),n=el('input'),g=el('input');n.type='number';n.min=1;n.max=99;n.value=post.number;n.setAttribute('aria-label','Numéro du poste '+(i+1));g.value=post.gates.join(', ');g.placeholder='Portes · ex. 1, 3, 5';g.setAttribute('aria-label','Portes du poste '+post.number);n.disabled=g.disabled=active;n.oninput=()=>{post.number=+n.value;postChange();};g.oninput=()=>{post.gates=g.value.split(/[,;\s]+/).filter(Boolean).map(Number);postChange();};const remove=el('button','Retirer');remove.disabled=active;remove.onclick=()=>{posts.splice(i,1);postRows();postChange();};row.append(el('span','Poste'),n,g,remove);rows.append(row);});}
 if(!cross&&!active&&part!=='layout'){d.append(el('h3','Postes transmetteurs'),el('p','Chaque porte doit être attribuée une seule fois. Un poste couvre de 1 à 5 portes, consécutives ou non. Aucun nom de juge ni téléphone n’est copié.'));const copy=el('button','Reprendre les postes précédents','post-reuse'),reuseStatus=el('p',undefined,'post-reuse-status');reuseStatus.setAttribute('role','status');let copied=false;
 refreshPostReuse=()=>{const available=reusablePostPlan(previous,+count.value);copy.disabled=!available.available;copy.title=available.reason;if(!copied||!available.available){reuseStatus.textContent=available.reason;reuseStatus.classList.remove('post-reuse-success');copy.textContent='Reprendre les postes précédents';copied=false;}};
 copy.onclick=()=>{const available=reusablePostPlan(previous,+count.value);if(!available.available){refreshPostReuse();return;}posts=available.posts;postRows();copied=true;validatePosts();copy.textContent='✓ Postes précédents repris';reuseStatus.textContent=posts.length+' postes repris et affichés ci-dessous · '+count.value+' portes. Vérifiez la répartition puis cliquez sur « Valider les postes ».';reuseStatus.classList.add('post-reuse-success');};d.append(copy,reuseStatus);postChange=()=>{copied=false;refreshPostReuse();validatePosts();};refreshPostReuse();const add=el('button','＋ Ajouter un poste');add.onclick=()=>{const used=new Set(posts.map(p=>p.number));let n=1;while(used.has(n))n++;posts.push({number:n,gates:[]});postRows();postChange();};d.append(rows,add);postRows();}
 d.courseDraftPlan=()=>({gateCount:+count.value,layoutConfigured:mode.value!=='none',redGates:[...red],posts:posts.map(p=>({...p,gates:[...p.gates]}))});const save=el('button',active?'Enregistrer le tracé':part==='layout'?(cross?'Enregistrer le parcours Cross':'Enregistrer le tracé · programmer les postes'):'Valider les postes');let savingPosts=false;const postError=el('p',undefined,'course-post-conflicts');postError.setAttribute('role','alert');postError.hidden=true;d.append(postError);validatePosts=()=>{const conflicts=cross||active||part==='layout'?[]:postDoorConflicts(posts);postError.hidden=conflicts.length===0;postError.textContent=conflicts.map(c=>'Porte '+c.gate+' attribuée aux postes '+c.posts.join(' et ')+'.').join(' ')+' Corrigez la répartition avant de valider les postes.';const affected=new Set(conflicts.map(c=>c.gate));[...rows.children].forEach((row,i)=>{const invalid=posts[i].gates.some(g=>affected.has(g));row.classList.toggle('post-door-conflict',invalid);row.children[2].setAttribute('aria-invalid',String(invalid));});save.disabled=savingPosts||conflicts.length>0;return conflicts.length===0;};validatePosts();save.onclick=async()=>{if(!validatePosts())return;savingPosts=true;save.disabled=true;try{const plan={gateCount:+count.value,layoutConfigured:mode.value!=='none',redGates:mode.value==='none'?[]:[...red].filter(g=>g<=+count.value).sort((a,b)=>a-b),posts:cross?[]:posts};if(cross){plan.discipline='cross';plan.startEnabled=startCheck.checked;plan.rollAfterGate=mode.value==='none'?null:roll;}await onSave(plan);}catch(e){sessionError(d,e);}finally{savingPosts=false;validatePosts();}};const footer=el('div',undefined,'course-wizard-actions');if(!courseStepAction(d,save))footer.append(save);d.append(footer);
}
function websocketAddressHelp(){
 const d=dialogShell('Adresse du serveur WebSocket · aide');d.classList.add('websocket-address-help');const figure=el('figure'),visual=el('div',undefined,'websocket-help-visual');visual.innerHTML="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"550\" viewBox=\"0 0 1200 550\" role=\"img\" aria-labelledby=\"title desc\">\n<title id=\"title\">Fenêtre WS Live de CompetFFCK</title>\n<desc id=\"desc\">Exemple de fenêtre WS Live Interne, avec bouton vert et message vert Live Session Ok : 127.0.0.1:8081. Cette adresse est locale à l’ordinateur.</desc>\n<defs><linearGradient id=\"bar\" x2=\"0\" y2=\"1\"><stop stop-color=\"#fafbfc\"/><stop offset=\"1\" stop-color=\"#edf0f2\"/></linearGradient></defs>\n<rect x=\"7\" y=\"7\" width=\"1186\" height=\"536\" rx=\"12\" fill=\"#f7f8fa\" stroke=\"#b9c3cc\" stroke-width=\"2\"/>\n<path d=\"M19 8h1162a11 11 0 0 1 11 11v66H8V19A11 11 0 0 1 19 8Z\" fill=\"url(#bar)\"/>\n<text x=\"34\" y=\"56\" font-family=\"Segoe UI,Arial,sans-serif\" font-size=\"28\" fill=\"#243542\">WS Live : Interne (127.0.0.1:8081).</text>\n<rect x=\"1113\" y=\"22\" width=\"58\" height=\"48\" rx=\"4\" fill=\"#b53542\"/><path d=\"m1133 36 18 20m0-20-18 20\" stroke=\"#fff\" stroke-width=\"3\"/>\n<path d=\"M8 86h1184M8 191h1184\" stroke=\"#c4cdd4\" stroke-width=\"2\"/>\n<!-- Green Live button -->\n<rect x=\"33\" y=\"105\" width=\"75\" height=\"70\" rx=\"10\" fill=\"#4a8e32\"/>\n<path d=\"M48 136h11v25H48Zm15 1 9-16c4-5 9-2 8 3l-2 11h14c7 0 6 8 3 13l-5 12H63Z\" fill=\"#fff\"/>\n<path d=\"M128 105v70M322 105v70M415 105v70M518 105v70\" stroke=\"#b7c1c9\" stroke-width=\"2\"/>\n<!-- Broom -->\n<path d=\"m191 110-24 38\" stroke=\"#9f6c30\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n<path d=\"m162 137 19 11-11 29-38-20Z\" fill=\"#e8be48\" stroke=\"#ac852a\" stroke-width=\"2\"/><path d=\"m158 150-13 15m22-10-10 15\" stroke=\"#c99d31\" stroke-width=\"2\"/>\n<!-- Refresh -->\n<path d=\"M286 126a26 26 0 1 0 5 30\" fill=\"none\" stroke=\"#bd3944\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"m286 108 15 22-26 3\" fill=\"#bd3944\"/>\n<!-- Paper and pencil -->\n<rect x=\"348\" y=\"109\" width=\"45\" height=\"65\" rx=\"3\" fill=\"#fff\" stroke=\"#80909d\" stroke-width=\"2\"/><path d=\"M359 123h22m-22 10h22m-22 10h17\" stroke=\"#a1adb6\" stroke-width=\"3\"/><path d=\"m361 143 41 15-3 7-41-15Z\" fill=\"#dcaf43\"/><path d=\"m358 150-8-7 11 0\" fill=\"#536773\"/>\n<!-- Globe -->\n<circle cx=\"466\" cy=\"140\" r=\"31\" fill=\"#a6d5e4\" stroke=\"#507f96\" stroke-width=\"3\"/><ellipse cx=\"466\" cy=\"140\" rx=\"14\" ry=\"31\" fill=\"none\" stroke=\"#e5bd53\" stroke-width=\"4\"/><path d=\"M435 140h62m-55-18q24 14 48 0m-48 36q24-14 48 0\" fill=\"none\" stroke=\"#e5bd53\" stroke-width=\"4\"/>\n<g font-family=\"Segoe UI,Arial,sans-serif\"><text x=\"34\" y=\"253\" font-size=\"29\" fill=\"#263b4a\">Message</text>\n<rect x=\"32\" y=\"277\" width=\"1136\" height=\"88\" rx=\"5\" fill=\"#43882a\"/>\n<path d=\"m59 317 17 17 31-37\" fill=\"none\" stroke=\"#b7dc8b\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<text x=\"127\" y=\"334\" font-size=\"39\" font-weight=\"600\" fill=\"white\">Live Session Ok : 127.0.0.1:8081</text>\n<text x=\"34\" y=\"445\" font-size=\"22\" fill=\"#587082\">Exemple d’un Live interne activé dans CompetFFCK.</text>\n<text x=\"34\" y=\"482\" font-size=\"22\" fill=\"#587082\">127.0.0.1 désigne cet ordinateur, pas son adresse sur le réseau.</text></g>\n</svg>\n";figure.append(visual,el('figcaption','Reconstitution de la fenêtre WebSocket / Live de CompetFFCK. Le message vert confirme que le Live est activé.'));d.append(figure);
 const guide=el('div',undefined,'websocket-help-guide');guide.append(el('p','Avant la lecture, laissez CompetFFCK ouvert sur la gestion de la manche à importer et activez le WebSocket / Live.'),el('h3','Quelle adresse saisir dans Jugement ?'));
 const list=el('ul');list.append(el('li','Jugement et serveur WebSocket sur le même PC : vous pouvez saisir 127.0.0.1.'),el('li','Sur des PC différents : saisissez l’adresse IPv4 du PC qui héberge le serveur WebSocket, par exemple 192.168.1.xxx. Cette adresse peut différer de celle du Serveur Jugement.'));
 guide.append(list,el('p','Pour trouver cette IPv4 sur le PC concerné : Paramètres Windows → Réseau et Internet → Ethernet ou Wi-Fi → Propriétés → Adresse IPv4. Choisissez l’interface reliée au réseau TRAPS.'),el('p','Port de lecture dans Jugement : 8080 par défaut. Le 8081 de cette fenêtre correspond au circuit interne Live ; ne le recopiez pas comme port de lecture.','websocket-help-port'));d.append(guide);
 const footer=el('div',undefined,'websocket-help-footer'),close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();footer.append(close);d.append(footer);outsideChronoClose(d);d.showModal();
}
function liveRosterImport(d,prep){
 const root=el('section',undefined,'live-roster-import');root.append(el('h4',prep.connectionOnly?'Connexion au WebSocket de CompetFFCK':'Charger directement depuis CompetFFCK'),el('p','Sur le PC CompetFFCK : ouvrir la gestion de la manche à importer et activer le WebSocket / Live. Indiquez l’IP du serveur WebSocket, qui peut être différente de celle de Jugement. Le port de lecture est généralement 8080, pas le 8081 de la publication interne.'));
 const disciplineBadge=el('strong',undefined,'creation-discipline-banner');disciplineBadge.hidden=true;root.prepend(disciplineBadge);
 const endpoint=creationWebsocketEndpoint||prep.liveEndpoint||{},address=el('label'),host=el('input'),portLabel=el('label'),port=el('input');host.value=endpoint.host||location.hostname;host.placeholder='Ex. 192.168.1.52';host.setAttribute('aria-label','IP du serveur WebSocket');port.type='number';port.min=1;port.max=65535;port.value=endpoint.port||8080;port.setAttribute('aria-label','Port du serveur WebSocket');const addressHeading=el('span','IP du serveur WebSocket','websocket-address-label'),help=el('button','?','websocket-help-button');help.type='button';help.setAttribute('aria-label','Aide pour l’adresse du serveur WebSocket');help.title='Où trouver l’adresse WebSocket ?';help.onclick=event=>{event.preventDefault();websocketAddressHelp();};addressHeading.append(help);address.append(addressHeading,host);portLabel.append(el('span','Port de lecture','websocket-address-label'),port);const inputs=el('div',undefined,'live-roster-endpoint');inputs.append(address,portLabel);root.append(inputs);
 const read=el('button',prep.connectionOnly?'Tester la connexion WebSocket':'Lire la manche active','live-roster-read'),status=el('p',undefined,'live-roster-status'),preview=el('div',undefined,'live-roster-preview'),accept=el('button','Valider la liste · continuer vers le parcours','live-roster-accept');accept.disabled=true;status.setAttribute('role','status');let selected=null,pce=false;const reread=el('button','Actualiser la liste','live-roster-reread');reread.hidden=true;reread.onclick=()=>read.click();const syncActions=()=>{read.hidden=pce||!!selected;accept.hidden=pce||!selected;reread.hidden=pce||!selected;};
 const invalidate=()=>{selected=null;disciplineBadge.hidden=true;accept.disabled=true;preview.replaceChildren();status.textContent='';syncActions();};host.oninput=port.oninput=invalidate;
 read.onclick=async()=>{invalidate();read.disabled=host.disabled=port.disabled=true;status.textContent='Lecture de la manche active…';try{if(prep.connectionOnly){const data=await sessionCommand('connection-check',{kind:'websocket',host:host.value.trim(),port:Number(port.value)});if(d.open){status.textContent=data.websocket.message;creationWebsocketEndpoint={host:data.websocket.host,port:data.websocket.port};read.classList.toggle('connection-online',data.websocket.ready);read.classList.toggle('connection-offline',!data.websocket.ready);}return;}const data=await sessionCommand('live-roster',{id:prep.id,operation:'preview',host:host.value.trim(),port:Number(port.value)});if(!d.open)return;selected=data;const info=data.liveCourse;disciplineBadge.textContent='Discipline : '+(data.discipline==='cross'?'Time Trial Kayak Cross':'Slalom');disciplineBadge.hidden=false;preview.append(el('p',info.competition+' · '+info.course+' · '+info.phase+' · '+data.bibs.length+' dossards · '+info.gateCount+' portes'));preview.append(courseRosterTable(data.entries));accept.disabled=false;syncActions();status.textContent='Vérifiez la manche et la liste. Les horaires sont prévisionnels ; aucun résultat n’est importé.';}catch(e){status.textContent=e.message;}finally{read.disabled=host.disabled=port.disabled=false;}};
 accept.onclick=async()=>{if(!selected)return;accept.disabled=read.disabled=host.disabled=port.disabled=true;status.textContent='Vérification de la manche et de la liste avant import…';try{const result=await sessionCommand('live-roster',{id:prep.id,operation:'import',previewToken:selected.previewToken,confirmation:'IMPORTER LA LISTE LIVE'});if(d.open){if(result.discipline){try{stageDialog(await sessionCommand('draft',{id:result.id,step:'layout'}));}catch(e){stageDialog(result);sessionError(sessionDialog,e);}}else stageDialog(result);}}catch(e){selected=null;preview.replaceChildren();syncActions();status.textContent=e.message+' · Relisez la manche active.';}finally{read.disabled=host.disabled=port.disabled=false;}};
 if(!courseStepAction(d,read))root.append(read);if(!courseStepAction(d,accept))root.append(accept);root.append(status,preview,reread);d.append(root);syncActions();return {pceMode(on){pce=on;root.hidden=on;syncActions();}};
}
function courseRosterTable(entries){
 const wrap=el('div',undefined,'roster-preview roster-table-scroll'),table=el('table',undefined,'creation-roster-table');table.setAttribute('aria-label','Liste de départ');const head=el('thead'),heading=el('tr');for(const title of ['Rang','Dossard','Catégorie','Heure de départ'])heading.append(el('th',title));head.append(heading);table.append(head);
 const body=el('tbody'),colours=new Map();let previous=null,within=0;
 entries.forEach((entry,index)=>{const category=entry.category||'';if(!colours.has(category))colours.set(category,(205+colours.size*137.508)%360);const changed=category!==previous;within=changed?0:within+1;const row=el('tr',undefined,changed?'roster-category-start':'');row.style.setProperty('--roster-tone','hsl('+colours.get(category)+' 43% '+(within%2?91:96)+'%)');row.style.setProperty('--roster-divider','hsl('+colours.get(category)+' 32% 68%)');for(const value of [index+1,entry.bib,category||'—',entry.scheduled||'—'])row.append(el('td',String(value)));body.append(row);previous=category;});table.append(body);wrap.append(table);return wrap;
}
const courseWizardMemory=new Map();
function courseWizardFooter(d,back,close,cancel){
 const actions=d.querySelector('.course-step-actions'),footer=el('footer',undefined,'creation-checkout-footer'),row=el('div',undefined,'creation-checkout-navigation');
 for(const prior of d.querySelectorAll('.course-wizard-actions'))prior.remove();
 if(back)row.append(back);if(actions)row.append(actions);footer.append(row);const secondary=el('div',undefined,'creation-checkout-secondary');secondary.append(close);if(cancel)secondary.append(cancel);footer.append(secondary);d.append(footer);
}
function wizardDefault(prep){return prep.phase==='waiting-pce'?'list':prep.phase==='ready'?'review':prep.phase==='layout-ready'?'posts':prep.phase==='configured'?'notify':'activate';}
function automaticReloadHelp(){
 const d=dialogShell('Recharger automatiquement les téléphones');d.classList.add('automatic-reload-help');
 for(const text of ['À l’activation, la nouvelle liste et le nom de course sont chargés sur les téléphones encore affectés à la course précédente. Ils conservent leur fonction, le nom du juge et leurs portes, puis affichent le premier dossard à partir.','Les données de la course précédente sont archivées sur chaque téléphone avant le chargement. Un téléphone libéré avant sa reconnexion ne reçoit pas cette recharge.','Cette option nécessite la même discipline, des affectations compatibles et une version de TRAPS prenant en charge la recharge automatique. Sans cette option, chaque téléphone rejoint la nouvelle course par le parcours habituel.'])d.append(el('p',text));
 const info=sessionState?.automaticNext;d.append(el('p',info?.available?info.count+' téléphone(s) compatibles · option non cochée par défaut.':info?.reason||'Vérification de la compatibilité en cours.','notice'));const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);outsideChronoClose(d);d.showModal();
}
function stageDialog(prep){
 if(sessionDialog)sessionDialog.close();const d=dialogShell('Création de course · '+prep.label);sessionDialog=d;
 const storedStep=prep.phase==='quiescing'?'activate':prep.wizardStep||wizardDefault(prep),step=storedStep==='review'?'list':storedStep,cross=prep.discipline==='cross',steps=['name','list','layout',...(cross?[]:['posts']),'notify','activate'],titles={name:'Nommer la course',list:'Charger et vérifier la liste de départ',layout:cross?'Configurer le parcours Cross':'Définir le tracé',posts:'Programmer les postes',notify:'Préparer les téléphones',activate:'Vérifier et activer'};
 const memoryKey=prep.id+'|'+(prep.rosterVersion||'')+'|'+prep.discipline;let memory=courseWizardMemory.get(memoryKey);if(!memory){memory={};courseWizardMemory.set(memoryKey,memory);}
 const remember=()=>{if(d.courseDraftPlan)memory[step]=d.courseDraftPlan();};
 const advance=async(target,extra={})=>{remember();stageDialog(await sessionCommand('draft',{id:prep.id,step:target,...extra}));};
 courseStepPanel(d,'Étape '+(steps.indexOf(step)+1)+' / '+steps.length+' · '+titles[step]);
 const progress=el('ol',undefined,'creation-step-progress');steps.forEach((key,i)=>{const item=el('li',(i+1)+'. '+titles[key],key===step?'current':i<steps.indexOf(step)?'complete':'');if(key===step)item.setAttribute('aria-current','step');progress.append(item);});d.querySelector('.course-ready-next').prepend(progress);
 if(step==='name'){
  const label=el('label','Nom de la course / manche'),name=el('input');name.maxLength=120;name.value=prep.label;label.append(name);d.append(label);const next=el('button','Continuer · charger la liste');next.onclick=async()=>{try{await advance('list',{label:name.value});}catch(e){sessionError(d,e);}};name.oninput=()=>next.disabled=!name.value.trim();courseStepAction(d,next);
 }else if(step==='list'){
  if(prep.livePrefillNotice)d.append(el('p',prep.livePrefillNotice,'notice'));if(prep.livePlanNotice)d.append(el('p',prep.livePlanNotice,'notice'));if(prep.livePlan)d.append(el('p','Parcours CompetFFCK récupéré · '+prep.livePlan.gateCount+' portes'+(prep.livePlan.posts?.length?' · '+prep.livePlan.posts.length+' postes':'')+' · à vérifier aux étapes suivantes.','notice'));
  const live=liveRosterImport(d,prep),backup=el('details',undefined,'live-roster-pce');backup.append(el('summary','Importer un fichier PCE (secours)'));d.append(backup);const label=el('label','Fichier CompetFFCK (.pce)'),file=el('input');file.type='file';file.accept='.pce';label.append(file);backup.append(label);const load=el('button','Importer et vérifier');load.disabled=true;file.onchange=()=>load.disabled=!file.files.length;
  load.onclick=async()=>{load.disabled=true;try{const selected=file.files[0];if(selected.size>4000000)throw Error('Fichier trop volumineux (4 Mo maximum)');const content=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Lecture impossible'));r.readAsDataURL(selected);});stageDialog(await sessionCommand('pce',{id:prep.id,filename:selected.name,content}));}catch(e){sessionError(d,e);load.disabled=false;}};courseStepAction(d,load);load.hidden=true;backup.addEventListener('toggle',()=>{live.pceMode(backup.open);load.hidden=!backup.open;});d.returnFromPce=()=>{if(!backup.open)return false;backup.open=false;live.pceMode(false);load.hidden=true;return true;};
  if(prep.bibs.length){
  const raceNameLabel=el('label','Nom de la course / manche'),raceName=el('input');raceName.maxLength=120;raceName.value=prep.label;raceName.setAttribute('aria-label','Nom de la course / manche');raceNameLabel.append(raceName);d.append(raceNameLabel);
   const source=el('details',undefined,'creation-change-source');source.append(el('summary','Remplacer la liste chargée'),d.querySelector('.live-roster-import'),backup);d.append(source);for(const b of d.querySelectorAll('.course-step-actions>.live-roster-read,.course-step-actions>.live-roster-accept'))source.append(b);source.append(load);
  const field=el('label','Discipline de la course','creation-discipline-banner'),select=el('select');select.setAttribute('aria-label','Discipline de la course');for(const [value,text]of [['','Choisir la discipline'],['slalom','Slalom'],['cross','Time Trial Kayak Cross']]){const o=el('option',text);o.value=value;select.append(o);}select.value=prep.discipline||'';select.disabled=!!(prep.identifiedDiscipline||prep.pceDiscipline);field.append(select);d.append(field,el('p',select.disabled?'Discipline reconnue dans la source · choix automatique.':'Choisissez la discipline si la source ne l’a pas renseignée.'));
  select.onchange=async()=>{if(!select.value)return;try{stageDialog(await sessionCommand('discipline',{id:prep.id,discipline:select.value}));}catch(e){sessionError(d,e);}};
  d.append(el('h3',prep.bibs.length+' dossards · '+(prep.filename||'Liste importée')));d.append(courseRosterTable(prep.entries?.length?prep.entries:prep.bibs.map(bib=>({bib}))));
  const next=el('button','Valider la liste · continuer vers le parcours');const syncNext=()=>next.disabled=!prep.discipline||!raceName.value.trim();raceName.oninput=syncNext;syncNext();next.onclick=async()=>{next.disabled=true;try{await advance('layout',{label:raceName.value});}catch(e){sessionError(d,e);next.disabled=false;}};courseStepAction(d,next);source.addEventListener('toggle',()=>next.hidden=source.open);
  }
 }else if(step==='layout'){
  if(prep.livePlanNotice)d.append(el('p',prep.livePlanNotice,'notice'));
  if(!cross&&prep.livePlan)d.append(el('p','Prérempli depuis CompetFFCK : '+prep.livePlan.gateCount+' portes'+(prep.livePlan.layoutConfigured?' et tracé (portes rouges : '+(prep.livePlan.redGates.length?gateRanges(prep.livePlan.redGates):'aucune')+').':' ; tracé non renseigné dans la source.')+' Vos modifications restent prioritaires.','course-import-source'));
  coursePlanEditor(d,memory.layout||prep.layout||prep.plan||prep.livePlan,sessionState?.active?.plan,async layout=>{delete memory.layout;stageDialog(await sessionCommand('layout',{id:prep.id,layout}));},false,'layout',prep.discipline);
 }else if(step==='posts'){
  if(prep.livePlanNotice)d.append(el('p',prep.livePlanNotice,'notice'));
  if(prep.livePlan?.posts?.length)d.append(el('p',prep.livePlan.gateCount===prep.layout?.gateCount?'Postes préremplis depuis CompetFFCK : '+prep.livePlan.posts.length+' postes. Vérifiez la répartition ci-dessous ; vos modifications restent prioritaires.':'Les postes de CompetFFCK ne sont pas repris : le nombre de portes a été modifié.','course-import-source'));
  coursePlanEditor(d,memory.posts||(prep.plan?{...prep.layout,posts:prep.plan.posts}:{...prep.layout,posts:prep.livePlan?.gateCount===prep.layout?.gateCount?prep.livePlan.posts:[]}),sessionState?.active?.plan,async plan=>{delete memory.posts;stageDialog(await sessionCommand('plan',{id:prep.id,plan}));},false,'posts');
 }else if(step==='notify'){
  const summary=el('dl',undefined,'creation-review');for(const [label,value]of [['Course',prep.label],['Discipline',cross?'Time Trial Kayak Cross':'Slalom'],['Liste',prep.bibs.length+' dossards'],['Parcours',prep.plan.gateCount+' portes · '+(prep.plan.layoutConfigured?'tracé renseigné':'sans tracé')],...(!cross?[['Postes',prep.plan.posts.map(p=>'Poste '+p.number+' : '+gateRanges(p.gates)).join(' · ')]]:[])])summary.append(el('dt',label),el('dd',value));d.append(summary,el('p','La course active continue jusqu’à cette validation. Prévenir les téléphones arrêtera les nouvelles saisies et retiendra temporairement les envois CompetFFCK sans fermer la liaison pour préparer la bascule. Les données en attente restent liées à leur course d’origine.'));
  const next=el('button','Préparer et prévenir les téléphones');next.onclick=async()=>{try{stageDialog(await sessionCommand('quiesce',{id:prep.id,confirmation:'PREPARER LA BASCULE'}));}catch(e){sessionError(d,e);}};courseStepAction(d,next);
 }else if(step==='activate'){
  d.classList.add('course-activation-dialog');const phones=el('ul',undefined,'session-phones');phones.dataset.race=prep.previous;phoneSummary(phones);d.append(phones);
   const choices=el('div',undefined,'activation-choice-row'),forceLabel=el('label',undefined,'activation-force-choice'),force=el('input');force.type='checkbox';force.checked=memory.force!==false;force.onchange=()=>memory.force=force.checked;forceLabel.append(force,el('span','Forcer la création si des téléphones ne sont pas prêts'));forceLabel.title='Les données non reçues restent conservées sur les téléphones dans leur course d’origine. Le bilan est présenté avant la bascule.';
   const autoCard=el('div',undefined,'activation-auto-card'),autoLabel=el('label',undefined,'activation-force-choice'),autoNext=el('input'),help=el('button','?','websocket-help-button activation-auto-help');autoNext.type='checkbox';autoNext.disabled=true;autoNext.checked=!!memory.automaticNext;autoLabel.append(autoNext,el('span','Recharger automatiquement les téléphones déjà affectés'));help.type='button';help.setAttribute('aria-label','Comprendre la recharge automatique des téléphones');help.title='Recharge automatique des téléphones';help.onclick=()=>automaticReloadHelp();autoCard.append(autoLabel,help);choices.append(forceLabel,autoCard);d.append(choices);autoNext.onchange=()=>memory.automaticNext=autoNext.checked;d.refreshAutomaticNext=()=>{if(!d.open)return;const info=sessionState?.automaticNext;autoNext.disabled=!info?.available;if(autoNext.disabled){autoNext.checked=false;memory.automaticNext=false;}autoLabel.title=info?.available?info.count+' téléphone(s) compatibles':info?.reason||'Vérification en cours';};refreshSession().then(d.refreshAutomaticNext);
   const go=el('button','Archiver la précédente et activer cette course','activate-course');
   go.onclick=async()=>{
    go.disabled=true;
    try{
     const review=await sessionCommand('activation-review',{id:prep.id});
     if(review.busy.length&&!force.checked)throw Error('Attendre la mise en pause ou cocher le forçage pour ces téléphones : '+review.busy.map(p=>(p.post||p.kind||'Téléphone')+' ('+p.device.slice(0,8)+')').join(', ')+'. Aucune donnée n’a été effacée.');
     const forceBusy=review.busy.length&&force.checked,issues=[...new Map([...(review.issues||[]),...(forceBusy?review.busy:[])].map(p=>[p.device,p])).values()];
     const details=issues.map(p=>'• '+(p.post||p.kind||'Téléphone')+' ('+p.device.slice(0,8)+') : '+(p.offline?'hors ligne, dernier bilan connu : ':'')+p.pending+' élément(s) signalé(s) en attente').join('\n');
     const queue=review.competQueue||{total:0},queueWarning=queue.total?'\n\nFILE COMPETFFCK NON VIDE : '+queue.penalties+' pénalité(s) et '+queue.chronos+' chrono(s). Ces données restent dans l’archive, mais leurs envois seront retirés avant la bascule. Choisissez Annuler pour interrompre la bascule et les examiner.':'';
     const warning=issues.length?(forceBusy?'\n\nACTIVATION FORCÉE : DES TÉLÉPHONES NE SONT PAS PRÊTS':'')+'\n\nDONNÉES NON REÇUES / TÉLÉPHONES HORS LIGNE\n'+details+'\n\nPoursuivre malgré ce bilan ? Ces données restent sur les téléphones, dans leur course d’origine. Elles ne sont pas encore sauvegardées sur ce PC. La récupération ultérieure sera une action séparée.':' ';
     if(!confirm('Activer « '+prep.label+' » ? La course précédente sera archivée et vérifiée avant la bascule.'+queueWarning+warning+(autoNext.checked?'\n\nLes téléphones encore affectés recevront automatiquement la nouvelle liste, en conservant rôle, identité et portes.':'')+'\n\nAucun ancien résultat ne sera affecté à la nouvelle course ni renvoyé automatiquement à CompetFFCK.'))return;
     await sessionCommand('activate',{id:prep.id,confirmation:'PCE IMPORTE ET COURSE VALIDEE',reviewToken:review.token,remainderConfirmation:issues.length?'CONSERVER LES DONNEES NON RECUES ET ACTIVER':'',forceConfirmation:forceBusy?'ARCHIVER ET ACTIVER MALGRE LES TELEPHONES NON PRETS':'',automaticNext:autoNext.checked,queueConfirmation:queue.total?'VIDER LES ENVOIS ANCIENS ET ACTIVER':''});
     viewArchive='';raceGeneration++;version='';await refreshCourses();await refreshSession();d.close();
    }catch(e){sessionError(d,e);}finally{go.disabled=false;}
   };courseStepAction(d,go);
 }
 let back=null;const index=steps.indexOf(step);if(index>0){back=el('button','← Retour','creation-back');back.onclick=async()=>{if(step==='list'&&d.returnFromPce?.())return;back.disabled=true;try{const target=steps[index-1];if(step==='activate'&&!confirm('Revenir à la préparation ? Les téléphones pourront reprendre les saisies de la course encore active. Aucune bascule ni remise à zéro ne sera effectuée.'))return;await advance(target,step==='activate'?{confirmation:'REPRENDRE LA PREPARATION'}:{});}catch(e){sessionError(d,e);}finally{back.disabled=false;}};}
 const close=el('button','Fermer · conserver le brouillon');close.onclick=()=>{remember();d.close();};const cancel=el('button','Annuler cette préparation');cancel.onclick=async()=>{if(!confirm('Conserver la course active et annuler ce brouillon ?'))return;try{await sessionCommand('cancel',{id:prep.id,confirmation:'CONSERVER LA COURSE ACTIVE'});d.close();await refreshSession();}catch(e){sessionError(d,e);}};courseWizardFooter(d,back,close,cancel);d.showModal();
}
$('new-race').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();prepareDialog();},true);
let sessionViewKey='';
function updateSessionResults(items,race){const key=JSON.stringify([items,race,controlData.states]);if(key===sessionViewKey)return;sessionViewKey=key;numericResults=items;const cross=race?.discipline==='cross';$('show-penalty-grid').disabled=cross;$('show-penalty-grid').title=cross?'Le tableau des pénalités Cross est déjà affiché ci-dessous':'Ouvrir le tableau dans une autre fenêtre';$('cross-results').hidden=!cross;for(const element of document.querySelectorAll('.toolbar,.stats,.judgment-legend,#sheets'))element.hidden=cross;document.querySelector('.eyebrow').textContent=cross?'TIME TRIAL KAYAK CROSS · CENTRALISATION':'SLALOM · CENTRALISATION DES POSTES';if(cross)renderCrossResults();refreshDetachedChronos();if(chronoDialog)renderChronos();renderLive();}
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
  if(!rows.has(r.bib))rows.set(r.bib,{bib:r.bib,values:[],absence:null,capsize:null});
  rows.get(r.bib).values.push(r);
 }
 for(const state of controlData.states||[]){
  if(!state.absent&&state.beforeGate==null)continue;
  if(!rows.has(state.bib))rows.set(state.bib,{bib:state.bib,values:[],absence:null,capsize:null});
  if(state.absent)rows.get(state.bib).absence=state;else rows.get(state.bib).capsize=state;
 }
 // Order by the recorded finish, independently of delayed network delivery.
 const finish=row=>row.absence||row.capsize?0:Math.max(0,...row.values.filter(r=>r.kind==='finish').map(r=>Number(r.time)||0));
 const activity=row=>Math.max(Number((row.absence||row.capsize)?.updatedAt)||0,0,...row.values.map(r=>Number(r.time)||0));
 return [...rows.values()].sort((a,b)=>Number(!!finish(b))-Number(!!finish(a))||finish(b)-finish(a)||activity(b)-activity(a)||b.bib-a.bib);
}
function showChronoTechnical(bib){
 const item=chronoRows().find(row=>row.bib===bib);if(!item)return;
 const d=dialogShell('Détails techniques · dossard '+bib);d.classList.add('chrono-technical');
 if(item.absence){d.append(el('p','ABSENT · ce signalement remplace l’affichage des temps. Les horodatages restent conservés.','chrono-absence'));if(item.absence.updatedAt)d.append(el('p','Signalement reçu : '+new Date(item.absence.updatedAt).toLocaleString('fr-FR')));}
 if(!item.absence&&item.capsize)d.append(el('p','Dessalé avant la porte '+item.capsize.beforeGate+' · le départ et les éventuels horodatages d’arrivée restent conservés.','chrono-capsize'));
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
 const rows=chronoRows().filter(row=>!filter.value||String(row.bib).includes(filter.value));
 const selectHead=window.ChronoCompet?.header(chronoDialog,rows);if(selectHead)head.append(selectHead);
 const columns=el('colgroup');for(const key of [...(selectHead?['select']:[]),'bib','start','finish','elapsed','info'])columns.append(el('col',undefined,'chrono-col-'+key));for(const name of ['Dossard','Départ','Arrivée','Temps','Infos'])head.append(el('th',name));table.append(columns,head);
 for(const {bib,values,absence,capsize} of rows){
  const row=el('tr');const choose=window.ChronoCompet?.cell(chronoDialog,bib);if(choose)row.append(choose);row.append(el('td',String(bib),'chrono-bib'));
  if(absence){const absent=el('td','ABSENT','chrono-absence');absent.colSpan=3;row.append(absent);}
  else{
   const starts=values.filter(r=>r.kind==='start'),finishes=values.filter(r=>r.kind==='finish');
   for(const [kind,list] of [['start',starts],['finish',finishes]]){const cell=el('td',undefined,'chrono-clock');if(kind==='finish'&&capsize){cell.textContent='Dessalé';cell.classList.add('chrono-capsize');cell.title='Dessalage avant la porte '+capsize.beforeGate;}else if(list.length)for(const r of list)cell.append(el('div',chronoClock(r.time)));else cell.textContent='—';row.append(cell);}
   const elapsed=!capsize&&starts.length===1&&finishes.length===1?finishes[0].time-starts[0].time:null;
   row.append(el('td',elapsed===null?'—':chronoDuration(elapsed),'chrono-elapsed'));
  }
  const info=el('td',undefined,'chrono-info'),button=el('button','Infos','chrono-info-button');button.setAttribute('aria-label','Détails techniques du dossard '+bib);button.title='État et origine des chronos';button.onclick=()=>showChronoTechnical(bib);info.append(button);row.append(info);table.append(row);
 }
 body.append(table);if(!rows.length)body.append(el('p','Aucun chrono ni signalement reçu pour cette sélection.'));
}
function showChronosView(detached=false){const d=dialogShell('Chronos de la course · '+courseTitle());chronoDialog=d;Consultation.configure(d,{refresh:()=>Consultation.flush(true)});d.classList.add('chrono-dialog');d.dataset.race=shownRace.id;if(detached)d.classList.add('chrono-detached-root');const filter=el('input');filter.type='search';filter.placeholder='Filtrer par dossard';filter.oninput=renderChronos;d.append(filter,el('div',undefined,'chrono-table'));window.ChronoCompet?.mount(d,filter);if(!detached){const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);}d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});renderChronos();if(detached){d.addEventListener("close",()=>window.close());d.show();}else d.showModal();}
function refreshDetachedChronos(){
 if(!detachedChronos||!shownRace.id||document.readyState!=="complete")return;
 if(chronoDialog&&chronoDialog.dataset.race!==shownRace.id){const old=chronoDialog;chronoDialog=null;old.remove();}
 if(!chronoDialog)showChronosView(true);
 chronoDialog.querySelector('h2').textContent='Chronos de la course · '+courseTitle();
}
window.addEventListener('load',refreshDetachedChronos);
$('show-chronos').onclick=()=>{
 const url=new URL(location.href);url.searchParams.set('tableau','chronos');if(viewArchive)url.searchParams.set('archive',viewArchive);else url.searchParams.delete('archive');
 if(chronoWindow&&!chronoWindow.closed){try{if(chronoWindow.location.href!==url.toString())chronoWindow.location.href=url.toString();chronoWindow.focus();return;}catch(_){chronoWindow=null;}}
 chronoWindow=window.open(url.toString(),'jugement-liste-chronos','popup=yes,width=1160,height=820');if(!chronoWindow)alert('Autorisez l’ouverture d’une fenêtre pour afficher les chronos.');
};

refreshSession();setInterval(refreshSession,3000);

/* RESEND_SELECTION_BEGIN */
function penaltyResendSelection(doors,bibs,cross){const cells=[];let excluded=0;for(const bib of bibs)for(const door of doors){const item=door.cells.get(bib);if(!item||item.blocked||item.values?.length>1||!Number.isFinite(item.value)||!item.record?.device){excluded++;continue;}cells.push([bib,door.gate,item.record.device,cross?door.zone:'',item.value]);}return {cells,excluded};}
/* RESEND_SELECTION_END */

/* Compact live tables and explicit, confirmed server-only resend. */
(function(){
 const query=new URLSearchParams(location.search),detached=query.get('tableau')==='penalites';
 let snapshot=null,lastModel=null,crossView=null,windowView=null,penaltyWindow=null;
 if(detached){document.body.classList.add('penalty-grid-window');viewArchive=query.get('archive')||'';const root=el('section',undefined,'penalty-window-root');document.querySelector('main').prepend(root);windowView=createView(root,true);}
 function createView(root,separate=false){
  const title=el('h2','Tableau des pénalités'),subtitle=el('p'),tools=el('div',undefined,'penalty-grid-tools');
  const bibLabel=el('label','Dossards'),bib=el('input');bib.placeholder='Tous · ex. 1, 4–9';bib.setAttribute('aria-label','Dossards du tableau');bibLabel.append(bib);
  const doorLabel=el('label','Portes'),door=el('input');door.placeholder='Toutes · ex. 5–8';door.setAttribute('aria-label','Portes du tableau');doorLabel.append(door);
  const pageLabel=el('label','Dossards affichés'),page=el('select');page.setAttribute('aria-label','Série de dossards du tableau');pageLabel.append(page);
  const previous=el('button','←','penalty-page-arrow'),next=el('button','→','penalty-page-arrow');previous.setAttribute('aria-label','Dix dossards précédents');next.setAttribute('aria-label','Dix dossards suivants');
  const resend=el('button','↻ Renvoyer vers CompetFFCK','penalty-grid-resend');resend.hidden=true;const feedback=el('p',undefined,'notice');feedback.hidden=true;feedback.setAttribute('role','status');
  const manager=el('button','↻ Renvoyer vers TrapsManager','penalty-grid-manager');manager.hidden=true;
  const status=el('span','En attente de réception…','penalty-grid-status');status.setAttribute('role','status');
  const legend=el('div',undefined,'penalty-sector-legend');const scroll=el('div',undefined,'penalty-grid-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','Tableau des pénalités, défilement horizontal et vertical');
  tools.append(bibLabel,doorLabel,previous,pageLabel,next,resend,manager,status);const heading=el('div',undefined,'penalty-grid-heading');heading.append(title,subtitle);root.append(heading,tools,feedback,legend,scroll);
  const view={root,title,subtitle,bib,door,doorLabel,page,previous,next,resend,manager,feedback,status,scroll,legend,key:'',pageKey:'',signatures:new Map(),race:null,model:null};
  resend.onclick=()=>resendSelection(view);manager.onclick=()=>ManagerResend.open({race:snapshot.race.id,discipline:snapshot.race.discipline,channel:'penalties',cells:JSON.parse(JSON.stringify(view.selection.cells))},feedback);
  bib.oninput=()=>paint(view,true);door.oninput=()=>paint(view,true);page.onchange=()=>paint(view,true);
  previous.onclick=()=>{page.selectedIndex=Math.max(0,page.selectedIndex-1);paint(view,true);};next.onclick=()=>{page.selectedIndex=Math.min(page.options.length-1,page.selectedIndex+1);paint(view,true);};
  return view;
 }
 async function resendSelection(view){
  if(view.resend.hidden||!view.selection?.cells.length||viewArchive)return;
  const request={race:snapshot.race.id,discipline:snapshot.race.discipline,cells:JSON.parse(JSON.stringify(view.selection.cells))},excluded=view.selection.excluded;
  const d=dialogShell('Renvoyer les pénalités affichées ?'),summary=el('p','Vérification de la sélection…'),error=el('p'),actions=el('div',undefined,'reset-actions'),no=el('button','Non'),yes=el('button','Oui, renvoyer');yes.disabled=true;no.onclick=()=>d.close();actions.append(no,yes);d.append(summary,error,actions);outsideChronoClose(d);d.showModal();let preview;
  try{preview=await sessionCommand('compet-resend',{...request,operation:'preview'});if(!d.open)return;summary.textContent='Course : '+(preview.label||preview.race)+' · '+(request.discipline==='cross'?'Time Trial KCross':'Slalom')+'\n'+preview.count+' pénalité(s) vers '+preview.host+':'+preview.port+', par dossard puis porte.\n'+excluded+' case(s) vide(s), bloquée(s) ou en conflit exclue(s) du tableau. '+preview.unavailable+' valeur(s) sans référence disponible et '+preview.blocked+' case(s) bloquée(s) au contrôle serveur.\nCe renvoi remplace les valeurs correspondantes dans la manche sélectionnée dans CompetFFCK. Vérifiez cette manche avant de choisir Oui. Les chronos et justifications ne sont pas renvoyés.';summary.style.whiteSpace='pre-line';yes.disabled=preview.count===0;
  }catch(e){error.textContent=e.message;}
  yes.onclick=async()=>{yes.disabled=true;no.disabled=true;try{const result=await sessionCommand('compet-resend',{...request,operation:'confirm',requestId:preview.requestId,fingerprint:preview.fingerprint,confirmation:'RENVOYER LES PENALITES VERS COMPETFFCK'});view.feedback.textContent=result.queued+' renvoi(s) mis en file · '+result.alreadyPending+' pénalité(s) déjà en attente. Envoi régulé, priorité aux nouvelles saisies. CompetFFCK ne fournit pas d’accusé de réception.';view.feedback.hidden=false;d.close();}catch(e){error.textContent=e.message;no.disabled=false;}};
 }
 function matches(input,n){const text=input.value.trim();if(!text){input.setCustomValidity('');return true;}const parts=text.split(/[,;\s]+/);if(parts.some(p=>!/^\d+(?:[-–]\d+)?$/.test(p))){input.setCustomValidity('Utilisez des numéros ou intervalles, par exemple 1, 4–9');return false;}input.setCustomValidity('');return parts.some(p=>{const [a,b]=p.split(/[-–]/).map(Number);return n>=a&&n<=(b??a);});}
 function paint(v,force=false){
  if(!snapshot||!lastModel)return;const model=lastModel;v.doorLabel.firstChild.textContent=model.cross?'Zones':'Portes';v.door.setAttribute('aria-label',model.cross?'Zones du tableau':'Portes du tableau');
  if(v.race!==snapshot.race?.id){v.race=snapshot.race?.id;v.page.value='all';v.pageKey='';v.key='';v.signatures.clear();}
  const bibs=model.bibs.filter(b=>matches(v.bib,b)),pages=[...new Set(bibs.map(b=>Math.floor((b-1)/10)*10+1))],pageKey=JSON.stringify(pages);
  if(v.pageKey!==pageKey){const old=v.page.value;v.page.replaceChildren();const all=el('option','Tous');all.value='all';v.page.append(all);for(const start of pages){const o=el('option',start+'–'+(start+9));o.value=String(start);v.page.append(o);}v.page.value=old==='all'||!old?'all':pages.includes(+old)?old:'all';v.pageKey=pageKey;}
  v.previous.disabled=v.page.selectedIndex<=0;v.next.disabled=v.page.selectedIndex>=v.page.options.length-1;
  const start=+v.page.value,visibleBibs=v.page.value==='all'?bibs:bibs.filter(b=>b>=start&&b<start+10),doors=model.rows.filter(r=>matches(v.door,model.cross?(r.slot||r.gate):r.gate));
  v.selection=penaltyResendSelection(doors,visibleBibs,model.cross);v.resend.hidden=deploymentState?.role!=='server'||deploymentState?.roleConfirmed!==true||!!viewArchive;v.resend.disabled=!v.selection.cells.length;v.manager.hidden=v.resend.hidden;v.manager.disabled=v.resend.disabled;
  v.title.textContent=(model.cross?'Time Trial Kayak Cross':'Slalom')+' · Tableau des pénalités';
  v.subtitle.textContent=(viewArchive?'Archive · ':'Course active · ')+(snapshot.race?.label||'Sans libellé')+(model.cross?'':' · Juges transmetteurs uniquement');
  const serial=doors.map(r=>({key:r.key,colour:r.colour,label:r.label,cells:visibleBibs.map(b=>r.cells.get(b))}));
  v.status.textContent=doors.length+(model.cross?' zone(s) · ':' porte(s) · ')+visibleBibs.length+' dossard(s) · actualisation automatique';
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
   const door=doors[i],th=el('th',slalom?String(door.gate):door.label);th.scope='col';const plan=snapshot.race?.plan;if(plan?.layoutConfigured&&(slalom||!['start','roll'].includes(door.zone)))th.classList.add((plan.redGates||[]).includes(door.gate)?'gate-number-red':'gate-number-green');th.title=model.cross?door.label:door.sector+' · '+door.label+' · '+door.judge;
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
 $('show-penalty-grid').onclick=()=>{const url=new URL(location.href);url.searchParams.set('tableau','penalites');if(viewArchive)url.searchParams.set('archive',viewArchive);else url.searchParams.delete('archive');if(penaltyWindow&&!penaltyWindow.closed){try{if(penaltyWindow.location.href!==url.toString())penaltyWindow.location.href=url.toString();penaltyWindow.focus();return;}catch(_){penaltyWindow=null;}}penaltyWindow=window.open(url.toString(),'jugement-tableau-penalites','popup=yes,width=1220,height=820');if(!penaltyWindow)alert('Autorisez l’ouverture d’une fenêtre pour afficher le tableau des pénalités.');};
 window.PenaltyTables={receive,renderCross,refreshRole(){for(const v of [crossView,windowView])if(v)paint(v);},unavailable(){for(const v of [crossView,windowView])if(v)v.status.textContent='Connexion interrompue · dernières valeurs conservées';}};
})();

// CompetFFCK transmitter: server only; net times remain an explicit operator choice.
function competAddressHelp(){
 const d=dialogShell('Adresse CompetFFCK · serveur TRAPS');d.classList.add('websocket-address-help');const figure=el('figure'),visual=el('div',undefined,'websocket-help-visual');visual.innerHTML="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 290\" role=\"img\" aria-labelledby=\"compet-traps-help-title\"><title id=\"compet-traps-help-title\">Exemple de serveur TRAPS activé dans CompetFFCK : adresse 192.168.1.52 et port 7000</title><rect x=\"3\" y=\"3\" width=\"994\" height=\"284\" rx=\"12\" fill=\"#f6f7f9\" stroke=\"#aab8c3\" stroke-width=\"2\"/><path d=\"M15 4h970a11 11 0 0 1 11 11v57H4V15A11 11 0 0 1 15 4\" fill=\"#e9edf1\"/><text x=\"26\" y=\"48\" fill=\"#293c49\" font-size=\"29\" font-family=\"Segoe UI,Arial,sans-serif\">Information · CompetFFCK</text><rect x=\"927\" y=\"17\" width=\"49\" height=\"40\" rx=\"4\" fill=\"#b53542\"/><path d=\"m944 28 16 17m0-17-16 17\" stroke=\"white\" stroke-width=\"3\"/><rect x=\"20\" y=\"92\" width=\"960\" height=\"64\" rx=\"4\" fill=\"#43882a\"/><rect x=\"20\" y=\"166\" width=\"960\" height=\"74\" rx=\"4\" fill=\"#357826\"/><g fill=\"none\" stroke=\"#c7e8a2\" stroke-width=\"6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m36 120 12 12 22-26\"/><path d=\"m36 199 12 12 22-26\"/></g><g font-family=\"Segoe UI,Arial,sans-serif\" fill=\"white\"><text x=\"88\" y=\"134\" font-size=\"28\">[192.168.1.52:7000 - CRBCK2] Open Ok …</text><text x=\"88\" y=\"213\" font-size=\"28\">TRAPS : démarrage serveur <tspan font-weight=\"700\">192.168.1.52:7000</tspan></text></g><text x=\"25\" y=\"270\" fill=\"#506776\" font-size=\"18\" font-family=\"Segoe UI,Arial,sans-serif\">Exemple : recopier l’adresse et le port de votre propre fenêtre.</text></svg>";
 figure.append(visual,el('figcaption','Illustration simplifiée de la boîte Information de CompetFFCK. Les messages sans rapport avec la connexion TRAPS sont retirés.'));
 d.append(el('p','Sur le PC CompetFFCK, activez le serveur TRAPS puis ouvrez sa boîte Information. Relevez l’adresse et le port sur la ligne « TRAPS : démarrage serveur ». Il s’agit du PC où tourne CompetFFCK, pas nécessairement du PC Serveur Jugement.'),figure);
 const guide=el('div',undefined,'websocket-help-guide');guide.append(el('p','Dans cet exemple : adresse IP 192.168.1.52 et port 7000. Utilisez les valeurs affichées sur votre installation.','websocket-help-port'),el('p','Cette liaison envoie les pénalités et les chronos à CompetFFCK. Elle est distincte du WebSocket / Live utilisé pour charger la liste de départ (port de lecture généralement 8080).'),el('p','Avant de reprendre les envois, vérifiez la manche sélectionnée dans CompetFFCK et les données en attente.'));d.append(guide);
 const footer=el('div',undefined,'websocket-help-footer'),close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();footer.append(close);d.append(footer);outsideChronoClose(d);d.showModal();
}
const competButton=el('button','CompetFFCK · Liaison');competButton.id='compet-settings';$('deployment-bar').insertBefore(competButton,$('deployment-settings'));
function competConnectionIndicator(v){
 const required=!!v.needsConfirmation,unlinked=!!sessionState?.active?.coordinated&&!(v.active&&v.connected&&v.connectionReady!==false&&!required);competButton.classList.toggle('compet-link-warning',unlinked);competButton.classList.toggle('compet-resume-required',required&&!unlinked);competButton.textContent=unlinked?'CompetFFCK · Connexion à établir':required?'CompetFFCK · Reprise manuelle ('+(v.totalPending??v.pending)+') ⚠':v.active?(v.connected?'CompetFFCK · Liaison active':'CompetFFCK · Liaison en cours…'):'CompetFFCK · Liaison';competButton.title=unlinked?'Course chargée · la liaison au serveur TRAPS de CompetFFCK doit être établie ou reprise. Aucun envoi n’est activé automatiquement.':v.suspensionReason||'Transmission des pénalités';

}
competButton.onclick=async()=>{
 const d=dialogShell('Connexion au serveur TRAPS de CompetFFCK');d.classList.add('compet-connection-dialog');d.querySelector('[role="alert"]').remove();d.append(el('p','Cette liaison transfère les pénalités de Jugement vers CompetFFCK. L’activation proposée ci-dessous concerne les pénalités ; les chronos ne sont pas activés par cette connexion. Pour les transmettre, utilisez « Liste des chronos ». Indiquez l’adresse IP du PC où le serveur TRAPS de CompetFFCK est activé et son port, lisibles dans sa boîte Information sur la ligne « TRAPS : démarrage serveur ».'));
 const host=el('input'),port=el('input'),enabled=el('input');port.type='number';port.min=1;port.max=65535;enabled.type='checkbox';enabled.checked=true;
 const h=el('label'),heading=el('span','Adresse IP du PC CompetFFCK','websocket-address-label'),help=el('button','?','websocket-help-button');help.type='button';help.setAttribute('aria-label','Aide pour l’adresse et le port du serveur TRAPS de CompetFFCK');help.title='Où lire l’adresse et le port ?';help.onclick=e=>{e.preventDefault();competAddressHelp();};heading.append(help);host.setAttribute('aria-label','Adresse IP du PC CompetFFCK');h.append(heading,host);const p=el('label','Port');p.append(port);const en=el('label','Activer la transmission des pénalités pour cette course','compet-confirmation');en.prepend(enabled);d.append(h,p,en);
 const managerConfirm=el('label','Le transfert vers CompetFFCK est désactivé dans Manager','compet-confirmation'),check=el('input');check.type='checkbox';managerConfirm.prepend(check);d.append(managerConfirm);
 const status=el('div',undefined,'compet-connection-feedback'),connection=el('p','Chargement…'),feedback=el('p',undefined,'compet-test-feedback');connection.setAttribute('role','status');feedback.setAttribute('role','status');status.append(connection,feedback);d.append(status);const report=(text,ok)=>{feedback.textContent=text;feedback.classList.toggle('connection-success',!!ok);feedback.classList.toggle('connection-failure',!ok);feedback.setAttribute('role',ok?'status':'alert');};const test=el('button','Tester la connexion sans envoyer'),save=el('button','Enregistrer / reprendre les envois'),close=el('button','Fermer');d.append(test,save,close);close.onclick=()=>d.close();
 d.append(el('p','Après une déconnexion, les envois restent suspendus. Vérifiez la manche sélectionnée dans CompetFFCK avant toute reprise.'));
 d.showModal();
 let state;try{const r=await fetch('/api/competffck',{cache:'no-store'});state=await r.json();competConnectionIndicator(state);save.classList.toggle('compet-resume-required',!!state.needsConfirmation);host.value=state.config.host;port.value=state.config.port;check.checked=state.active;connection.textContent=state.pending+' pénalité(s) et '+(state.chronoPending||0)+' temps en attente · '+state.written+' pénalités et '+(state.chronoWritten||0)+' temps écrits sur TCP'+(state.error?' · '+state.error:'');}catch(e){report('Échec de lecture de la connexion : '+e.message,false);}
 test.onclick=async()=>{test.disabled=true;report('Test en cours : aucune pénalité ni aucun chrono n’est envoyé.',true);try{const r=await sessionCommand('compet-test',{host:host.value.trim(),port:Number(port.value)});report('Test réussi : '+r.message+' Ce test ne confirme pas l’enregistrement d’une pénalité dans CompetFFCK.',true);}catch(e){report('Échec du test : '+e.message+' Vérifiez l’IP, le port, le réseau et l’activation du serveur TRAPS dans la gestion de manche de CompetFFCK.',false);}finally{test.disabled=false;}};
 const refreshConnection=async()=>{if(!d.open)return;try{const r=await fetch('/api/competffck',{cache:'no-store'}),v=await r.json();competConnectionIndicator(v);save.classList.toggle('compet-resume-required',!!v.needsConfirmation);connection.classList.toggle('connection-failure',!!v.error||!!v.needsConfirmation);connection.classList.toggle('connection-success',!!v.active&&!!v.connected&&!v.needsConfirmation&&!v.error);connection.textContent=(v.transitionWaiting?'Liaison maintenue · envois retenus avant bascule':v.active?(v.connected?'● Connexion TCP active':'Connexion en cours'):'Transmission suspendue')+(v.needsConfirmation?' · REPRISE MANUELLE REQUISE · '+v.suspensionReason:'')+' · '+v.pending+' pénalité(s) et '+(v.chronoPending||0)+' temps en attente · '+v.written+' pénalités et '+(v.chronoWritten||0)+' temps écrits sur TCP'+(v.error?' · '+v.error:'');}catch(e){connection.textContent='État de connexion indisponible : '+e.message;}};
 const connectionTimer=setInterval(refreshConnection,1000),originalClose=d.onclose;d.onclose=()=>{clearInterval(connectionTimer);originalClose();};
 save.onclick=async()=>{save.disabled=true;try{if(enabled.checked&&!check.checked)throw Error('Confirmez la désactivation du transfert dans Manager pour éviter les doubles envois.');const latest=await (await fetch('/api/competffck',{cache:'no-store'})).json();if(enabled.checked&&!window.confirm('Vérifiez dans CompetFFCK la manche : '+(sessionState.active.label||'Sans libellé')+' ('+sessionState.active.id.slice(0,8)+') .\nTransmettre les '+latest.pending+' pénalité(s) et '+(latest.chronoPending||0)+' temps en attente puis les prochaines saisies autorisées vers '+host.value.trim()+':'+port.value+' ?'))return;const r=await sessionCommand('compet-config',{pending:latest.pending,chronoPending:latest.chronoPending||0,resumeConfirmation:'MANCHE ET FILE VERIFIEES',race:sessionState.active.id,host:host.value.trim(),port:Number(port.value),enabled:enabled.checked,confirmation:check.checked?'MANAGER NE TRANSMET PLUS A COMPETFFCK':''});report(r.active?'Transmission des pénalités activée. Les chronos se règlent séparément dans « Liste des chronos ».':'Transmission suspendue.',true);await refreshConnection();}catch(e){report('Reprise non effectuée : '+e.message,false);}finally{save.disabled=false;}};
};

// Persistent, visible indication even when the settings dialog is closed.
async function refreshCompetIndicator(){
 try{const r=await fetch('/api/competffck',{cache:'no-store'});if(!r.ok)return;const v=await r.json();window.ChronoCompet?.receive(v);competConnectionIndicator(v);}catch(e){competButton.textContent='CompetFFCK · Liaison à vérifier';}
}
setInterval(refreshCompetIndicator,2000);refreshCompetIndicator();

const planButton=el('button','⚑ Parcours et postes');planButton.id='course-plan';$('course-label').before(planButton);planButton.onclick=()=>{
 if(viewArchive||deploymentState?.role!=='server')return;const race=sessionState?.active;if(!race)return;
 const locked=!!race.competitionStarted,d=dialogShell((locked?'Consultation':'Configuration')+' · Parcours et postes · '+race.label);
 d.append(el('p',locked?'Course démarrée : créer une nouvelle course pour modifier le parcours ou les postes.':'Modifications transmises aux téléphones. Le premier 0, CLR ou pénalité reçu verrouille le parcours et les postes.','notice'));
 coursePlanEditor(d,race.plan,race.plan,async plan=>{await sessionCommand('plan',{active:true,race:race.id,revision:race.plan?.revision||0,plan});await refreshSession();d.close();},false,'all',race.discipline);
 if(locked){for(const control of d.querySelectorAll('input,select,button'))control.disabled=true;const footer=d.querySelector('.course-wizard-actions');if(footer)footer.replaceChildren();}
 const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);d.showModal();};
function showReassignment(){
 const race=sessionState?.active;if(viewArchive||deploymentState?.role!=='server'||!race?.plan)return;
 const d=dialogShell('Réaffecter les portes · '+race.label),t=sessionState.configurationTransition;sessionDialog=d;
 if(t){
  d.append(el('p','Les téléphones concernés terminent les gestes, brouillons et envois. Ils doivent tous être connectés et en attente avant application. Les anciennes fiches gardent leurs portes et leur juge.'));
  const list=el('ul',undefined,'session-phones');phoneSummary(list);d.append(list);
  const applying=t.phase==='applying',progress=el('p',applying?'Application des portes sur les téléphones : '+t.applied.length+' / '+t.devices.length:'Mise en attente des téléphones concernés','reassignment-status');d.append(progress);const apply=el('button','Appliquer la réaffectation confirmée'),cancel=el('button','Annuler la réaffectation');apply.disabled=cancel.disabled=applying;
  apply.onclick=async()=>{if(!confirm('Appliquer les portes aux prochaines saisies ? Les cases ajoutées restent vierges. Les protections et les anciennes fiches sont conservées.'))return;apply.disabled=true;try{const result=await sessionCommand('plan-commit',{id:t.id,confirmation:'APPLIQUER LA REAFFECTATION'});await refreshSession();d.close();if(result.awaitingApplication)showReassignment();}catch(e){sessionError(d,e);apply.disabled=false;}};
  cancel.onclick=async()=>{try{await sessionCommand('plan-commit',{id:t.id,cancel:true});await refreshSession();d.close();}catch(e){sessionError(d,e);}};d.append(apply,cancel);
 }else{
  d.append(el('p','Modification structurelle : contrôlez les compétiteurs encore en parcours avant de prévenir les postes. Les données existantes ne sont pas réattribuées. Une porte ne peut appartenir qu’à un transmetteur.'));
  coursePlanEditor(d,race.plan,race.plan,async plan=>{if(!confirm('Prévenir les téléphones concernés et mettre leurs nouvelles saisies en attente pour cette répartition ?'))return;await sessionCommand('plan-prepare',{race:race.id,revision:race.plan.revision,plan,confirmation:'PREPARER LA REAFFECTATION'});await refreshSession();d.close();showReassignment();},false,'all',race.discipline);
 }
 const close=el('button','Fermer');close.onclick=()=>d.close();let footer=d.querySelector('.course-wizard-actions');if(!footer)footer=el('div',undefined,'course-wizard-actions');footer.append(close);d.append(footer);d.showModal();
}


// Operational phone controls retain stable rows while live status is updated.
let phoneControlDialog=null;
const phoneRole={slalom:'Slalom',cross:'KCross',start:'Chrono départ',finish:'Chrono arrivée'};
function phoneControlPaint(d){
 if(!d?.open)return;
 if(sessionState?.active?.id!==d.dataset.race){const notice=d.querySelector('.phone-control-notice');notice.hidden=false;notice.textContent='La course a changé. Fermez cette consultation avant de contrôler la nouvelle course.';for(const b of d.querySelectorAll('.phone-release'))b.disabled=true;return;}
 const stamp=d.querySelector('.phone-control-stamp');if(stamp)stamp.textContent=(sessionState.active.label||'Course active')+' · bilan '+(sessionState.technical?.at?new Date(sessionState.technical.at).toLocaleTimeString('fr-FR'):'non communiqué');
 const claims=sessionState.planning?.assignments||{},tech=new Map((sessionState.technical?.phones||[]).map(p=>[p.device,p]));
 const phones=(sessionState.phones||[]).filter(p=>p.operational!==false).sort((a,b)=>Number(!String(claims[a.device]?.post||a.association?.post||''))-Number(!String(claims[b.device]?.post||b.association?.post||''))||String(claims[a.device]?.post||a.association?.post||({start:'1',finish:'2'}[a.kind]||a.kind)).localeCompare(String(claims[b.device]?.post||b.association?.post||({start:'1',finish:'2'}[b.kind]||b.kind)),'fr',{numeric:true}));
 const body=d.querySelector('tbody'),known=new Set(phones.map(p=>p.device));for(const [device,row]of d.rows){if(!known.has(device)){row.remove();d.rows.delete(device);}}
 const set=(cell,value)=>{if(cell.textContent!==value)cell.textContent=value;};
 const channel=c=>!c?.available?'Non communiqué':(c.pending?c.pending+' en attente':'0 en attente')+(c.unknown?' · '+c.unknown+' historique(s) sans accusé':'');
 for(const p of phones){const t=tech.get(p.device),claim=claims[p.device],association=p.association,kind=association?.kind||p.kind;
  let row=d.rows.get(p.device);if(!row){row=el('tr');row.dataset.device=p.device;for(let i=0;i<12;i++)row.append(el('td'));const release=el('button','Libérer','phone-release'),details=el('button','Détails','phone-details');row.children[11].append(release,details);release.onclick=async()=>{const current=row.phone;if(!current||release.disabled)return;const name=current.judge?' · '+current.judge:'';if(!confirm('Libérer '+current.label+name+' ? Terminez le passage et ses envois avant de le remplacer. Ses fiches restent conservées.'))return;row.releasing=true;release.disabled=true;try{await sessionCommand('release-post',{race:d.dataset.race,device:p.device,confirmation:'LIBERER CE POSTE'});await refreshSession();}catch(e){sessionError(d,e);}finally{row.releasing=false;phoneControlPaint(d);}};details.onclick=()=>window.TechnicalView?.openPhone(p.device);row.release=release;row.details=details;d.rows.set(p.device,row);body.append(row);}
  const profile=postProfiles[p.device]||{},judge=t?.judge||(profile.officials||[]).map(j=>j.name).filter(Boolean).join(' / ')||'—';
  const post=String(claim?.post||association?.post||''),label=post?'le poste '+post:'ce téléphone',doors=claim?.gates||association?.gates||p.gates||[],doorText=doors.map(g=>kind==='cross'&&g===27?'S':kind==='cross'&&g===26?'E':g).join(', ');
  row.phone={label,judge:judge==='—'?'':judge};
  const age=t?.ageMs,contact=age==null?'Inconnu':age<10000?'En ligne':age<60000?'Dernier contact : '+Math.floor(age/1000)+' s':age<3600000?'Dernier contact : '+Math.floor(age/60000)+' min':'Dernier contact : '+Math.floor(age/3600000)+' h';
  const values=[post||(kind==='start'?'Départ':kind==='finish'?'Arrivée':'—'),judge,(phoneRole[kind]||'Fonction non choisie')+(doorText?' · '+doorText:''),(p.deviceName||p.device.slice(0,8))+' · APK '+p.version,contact,window.TechnicalView?.battery(t||{})||'Non communiqué',channel(t?.channels?.judgment),channel(t?.channels?.signals),channel(t?.channels?.audio),channel(t?.channels?.manager),(t?.issues||[]).map(i=>i.text).join(' · ')||(t?'Aucune anomalie':'Diagnostic non communiqué')];
  values.forEach((value,i)=>set(row.children[i],value));row.children[3].title=p.device;row.children[5].className='battery-state';row.children[5].classList.toggle('phone-battery-low',Number.isInteger(t?.battery?.percent)&&t.battery.percent>=0&&t.battery.percent<5);row.classList.toggle('phone-offline',age==null||age>=10000);row.classList.toggle('phone-error',(t?.issues||[]).some(i=>i.level==='error'));row.classList.toggle('phone-warning',!(t?.issues||[]).some(i=>i.level==='error')&&(t?.issues||[]).length>0);for(const [index,key]of [[6,'judgment'],[7,'signals'],[8,'audio']])row.children[index].classList.toggle('phone-pending',!!t?.channels?.[key]?.pending);
  set(row.release,post?'Libérer le poste '+post:'Libérer le poste');row.release.disabled=!!row.releasing||d.readOnly||deploymentState?.role!=='server'||(!claim&&!association);row.details.disabled=!t;
 }
 const order=phones.map(p=>p.device).join('|');if(d.dataset.order!==order){for(const p of phones)body.append(d.rows.get(p.device));d.dataset.order=order;}
 d.querySelector('.phone-control-empty').hidden=!!phones.length;
}
const phonesButton=el('button','Contrôle des téléphones');phonesButton.id='control-phones';document.querySelector('.course-tools .panel-content').prepend(phonesButton);phonesButton.onclick=async()=>{
 await refreshSession();const race=sessionState?.active;if(!race)return;
 if(phoneControlDialog){phoneControlDialog.showModal();phoneControlPaint(phoneControlDialog);return;}
 const d=dialogShell('Contrôle des téléphones');phoneControlDialog=d;d.classList.add('phone-control-dialog');d.dataset.race=race.id;d.rows=new Map();d.readOnly=!!viewArchive;
 d.append(el('p',undefined,'phone-control-stamp'));const notice=el('p',undefined,'phone-control-notice'),wrap=el('div',undefined,'phone-control-scroll'),table=el('table',undefined,'phone-control-table'),head=el('thead'),line=el('tr');for(const label of ['Poste','Juge','Fonction · portes','Téléphone · APK','Contact','Batterie','Jugement','Signalements','Audios','Manager','Diagnostic','Action'])line.append(el('th',label));head.append(line);table.append(head,el('tbody'));wrap.append(table);notice.hidden=true;d.append(notice,wrap,el('p','Aucun téléphone affecté à cette course.','phone-control-empty'));
 const footer=el('div',undefined,'dialog-footer'),close=el('button','Fermer','dialog-close');close.onclick=()=>d.close();footer.append(close);d.append(footer);d.addEventListener('close',()=>{window.TechnicalView?.closeDetails();if(phoneControlDialog===d)phoneControlDialog=null;});d.showModal();phoneControlPaint(d);
};
