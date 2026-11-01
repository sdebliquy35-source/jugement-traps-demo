'use strict';
let deploymentState=null,roleDialog=null;
async function deploymentCommand(data){return courseCommand('/api/deployment',data);}
async function refreshDeployment(){
 try{const r=await fetch('/api/deployment',{cache:'no-store'});if(!r.ok)return;deploymentState=await r.json();
  const s=deploymentState;document.title=s.role==='server'?'Serveur Jugement':s.role==='ja'?'Jugement · Juge Arbitre':'Jugement · Choix du poste';document.querySelector('header h1').textContent=document.title;document.body.classList.toggle('role-ja',s.role==='ja');document.body.classList.toggle('role-setup',s.role==='setup');
  if(s.role==='ja')$('connection').textContent=s.replicated?'● Copie locale disponible':'● Aucune course copiée';
  $('deployment-role').textContent=s.role==='server'?'Serveur Jugement':s.role==='ja'?'Poste Juge Arbitre':'Choisir le rôle de ce poste';
  window.jaHasCopy=!!s.replicated;
  window.jaOffline=s.role==='ja'&&!s.online;$('open-protection').disabled=!!viewArchive||window.jaOffline;$('open-protection').title=window.jaOffline?'La levée nécessite une connexion au Serveur Jugement':'';
  $('deployment-bar').classList.toggle('offline',s.role==='ja'&&!s.online);
  $('deployment-state').textContent=s.role==='server'?'Réception des téléphones · gestion centrale des courses':s.role==='setup'?'Choix mémorisé après validation':
   (s.online?'Connecté au Serveur Jugement':'Hors connexion · consultation locale')+' · '+(s.lastSync?'Dernière copie des fiches : '+new Date(s.lastSync).toLocaleString('fr-FR'):'Aucune course encore répliquée')+(s.assetsPending?' · '+s.assetsPending+' fichier(s) audio / archive en attente':'')+(s.pending?' · fiches en cours de copie':'');
  $('deployment-state').title=s.error||s.source;
  if(s.role==='ja'){const empty=document.querySelector('#sheets .empty');if(empty){const title=empty.querySelector('h2');if(title)title.textContent='Aucune fiche dans la copie locale';for(const p of empty.querySelectorAll('p'))p.hidden=true;}}
  if((s.role==='setup'||!s.roleConfirmed)&&!roleDialog)deploymentDialog(true);
 }catch(e){$('deployment-state').textContent='Application locale indisponible';}
}
function deploymentDialog(first=false){
 if(roleDialog){roleDialog.showModal();return;}
 const s=deploymentState,d=dialogShell(first?'Choisir le rôle de cet ordinateur':'Poste et connexion');roleDialog=d;d.classList.add('deployment-dialog');
 d.addEventListener('close',()=>{if(roleDialog===d)roleDialog=null;});if(first&&!s.roleConfirmed)d.addEventListener('cancel',e=>e.preventDefault());
 if(first){
  d.append(el('p','Une seule installation reçoit les téléphones : le Serveur Jugement. Le poste JA conserve une copie locale et reste consultable sans le serveur.'));
  const server=el('button','Serveur Jugement','role-choice'),ja=el('button','Poste Juge Arbitre','role-choice');
  server.onclick=async()=>{try{await deploymentCommand({action:'configure',role:'server'});d.close();await refreshDeployment();}catch(e){sessionError(d,e);}};
  ja.onclick=async()=>{try{await deploymentCommand({action:'configure',role:'ja',confirmation:'UTILISER CE POSTE COMME JA'});roleDialog=null;d.close();await refreshDeployment();deploymentDialog();}catch(e){sessionError(d,e);}};
  d.append(server,ja);
 }else if(s.role==='server'){
  d.append(el('p','Ce poste est le Serveur Jugement. Les téléphones continuent à lui envoyer leurs données une seule fois.'));
  const show=el('button','Afficher le code d’association du poste JA'),box=el('div',undefined,'pairing-code');
  show.onclick=async()=>{try{const result=await deploymentCommand({action:'pairing'});box.replaceChildren();const code=el('input');code.readOnly=true;code.value=result.code;code.classList.add('six-digit-code');code.setAttribute('aria-label','Code d’association JA');code.onclick=()=>code.select();box.append(el('p','Sur le poste JA : saisir ces six chiffres. Code valable cinq minutes, pour une seule association. Si nécessaire, indiquer l’adresse réseau de ce PC.'),code);code.select();}catch(e){sessionError(d,e);}};d.append(show,box);const change=el('button','Changer le rôle de ce poste');change.onclick=()=>{roleDialog=null;d.close();deploymentDialog(true);};d.append(el('p','Pour convertir une copie de cette installation en poste JA, choisir son rôle. Une sauvegarde de la base sera conservée avant toute réplication.'),change);
 }else{
  d.append(el('p','Les fiches et les courses précédentes déjà copiées sont consultables sans le Serveur Jugement. Les levées de protection nécessitent sa connexion ; elles ne sont jamais mises en attente pour un envoi ultérieur.'));
  const who=el('input');who.placeholder='Nom du Juge Arbitre';who.maxLength=100;who.value=s.operator||'';
  const address=el('input');address.placeholder='http://192.168.1.52:8765 · vide = recherche automatique';address.value=s.source||'';
  const key=el('input');key.type='text';key.inputMode='numeric';key.maxLength=6;key.pattern='[0-9]{6}';key.autocomplete='one-time-code';key.placeholder='6 chiffres';key.oninput=()=>key.value=key.value.replace(/[^0-9]/g,'').slice(0,6);
  for(const [text,input] of [['Juge Arbitre · auteur des levées',who],['Serveur Jugement',address],['Code d’association',key]]){const label=el('label',text);label.append(input);d.append(label);}
  const pair=el('button','Associer et répliquer','activate-course');pair.onclick=async()=>{pair.disabled=true;try{await deploymentCommand({action:'configure',role:'ja',source:address.value,code:key.value,operator:who.value});d.close();await refreshDeployment();}catch(e){sessionError(d,e);}finally{pair.disabled=false;}};d.append(pair);
  if(s.replicated){
   const advanced=el('details'),summary=el('summary','Secours : reprendre comme Serveur Jugement');advanced.append(summary,el('p','Uniquement après l’arrêt définitif de l’ancien serveur. La dernière copie locale sera utilisée. Aucun ancien résultat ne sera renvoyé à Manager. Les téléphones doivent retrouver ce PC ; vérifiez leur connexion avant de reprendre la course.'));
   if(s.assetsPending||s.pending)advanced.append(el('p','Attention : des données ou des fichiers restent à copier. La reprise ne pourra pas les recréer.','protection-warning'));
   const agree=el('input');agree.type='checkbox';const label=el('label','Je confirme que l’ancien Serveur Jugement est arrêté et ne sera pas relancé.','reset-confirm');label.prepend(agree);advanced.append(label);
   const text=el('input');text.placeholder='Saisir REPRENDRE';advanced.append(text);const go=el('button','Reprendre comme Serveur Jugement','new-race');go.disabled=true;const change=()=>go.disabled=!agree.checked||text.value!=='REPRENDRE';agree.onchange=change;text.oninput=change;
   go.onclick=async()=>{go.disabled=true;try{await deploymentCommand({action:'promote',oldServerStopped:agree.checked,confirmation:'REPRENDRE COMME SERVEUR JUGEMENT'});d.close();await refreshDeployment();}catch(e){sessionError(d,e);change();}};advanced.append(go);d.append(advanced);
  }
 }
 if(!first||s.roleConfirmed){const close=el('button',s.role==='ja'?'Fermer · consulter la copie locale':'Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);outsideChronoClose(d);}
 d.showModal();
}
$('deployment-settings').onclick=()=>deploymentDialog();
refreshDeployment();setInterval(refreshDeployment,3000);
