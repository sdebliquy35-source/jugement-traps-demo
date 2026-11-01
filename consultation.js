/* Receiving and displaying are independent: a consultation never races polling. */
'use strict';
(function(){
 let displayed=null,pending=null,apply=null,paused=false,pendingGeneration=0,displayedGeneration=-1;
 const viewers=new Map();
 function fingerprint(data){return JSON.stringify([data.race,data.events,data.posts,data.results,data.control?.states,data.control?.arrivals,data.supervision]);}
 function gateFingerprint(item){return JSON.stringify([item.event.id,item.event.identification,item.gate,item.event.gateReceivedAt?.[item.gate.gate]]);}
 function newestGate(data,event,gate){
  let best=null;
  for(const e of data.events||[]){
   if((e.race||e.session)!==(event.race||event.session)||e.device!==event.device||e.bib!==event.bib||(e.run||'')!==(event.run||''))continue;
   const g=e.gates.find(g=>g.gate===gate.gate);if(!g)continue;
   const at=g.enteredAt||e.createdAt,prior=best?(best.gate.enteredAt||best.event.createdAt):0;
   if(!best||at>prior||(at===prior&&(e.createdAt>best.event.createdAt||(e.id===best.event.id&&e.revision>best.event.revision))))best={event:e,gate:g};
  }
  return best;
 }
 function held(){
  return paused||(typeof printing!=='undefined'&&printing)||!!document.querySelector('dialog[open]')||!!document.activeElement?.closest('.toolbar input,.toolbar select,#course-select,.pile-source-pickers select,.pile-page-nav select')||!!window.getSelection()?.toString();
 }
 function preserve(action){
  if(typeof printing!=='undefined'&&printing)return action();
  const x=window.scrollX,y=window.scrollY;
  const sheets=[...document.querySelectorAll('[data-sheet-key]')];
  const first=sheets.find(e=>e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<window.innerHeight);
  const key=first?.dataset.sheetKey,top=first?.getBoundingClientRect().top;
  const scrolls=new Map(sheets.map(e=>[e.dataset.sheetKey,[...e.querySelectorAll('.matrix-scroll')].map(s=>[s.scrollLeft,s.scrollTop])]));
  const dialogScrolls=[...document.querySelectorAll('dialog,.chrono-table,.journal-body')].map(e=>[e,e.scrollLeft,e.scrollTop]);
  const result=action();
  for(const sheet of document.querySelectorAll('[data-sheet-key]')){
   const old=scrolls.get(sheet.dataset.sheetKey);if(old)[...sheet.querySelectorAll('.matrix-scroll')].forEach((s,i)=>{if(old[i]){s.scrollLeft=old[i][0];s.scrollTop=old[i][1];}});
  }
  const same=key?[...document.querySelectorAll('[data-sheet-key]')].find(e=>e.dataset.sheetKey===key):null;
  if(same)window.scrollBy(0,same.getBoundingClientRect().top-top);else window.scrollTo(x,y);
  for(const [e,left,top] of dialogScrolls)if(e.isConnected){e.scrollLeft=left;e.scrollTop=top;}
  return result;
 }
 function banner(){
  const root=document.getElementById('consultation-status'),text=document.getElementById('consultation-message'),button=document.getElementById('consultation-apply'),toggle=document.getElementById('consultation-toggle');
  if(root){root.hidden=!pending&&!paused;text.textContent=paused?'Affichage en pause · les données continuent d’être reçues'+(pending?' · nouvelles données disponibles':''):'Nouvelles données reçues · votre consultation est conservée';button.hidden=!pending;}
  if(toggle){const label=paused?'Reprendre le direct':'Pause de consultation';if(toggle.textContent!==label)toggle.textContent=label;toggle.setAttribute('aria-pressed',String(paused));}
  for(const [dialog,info] of viewers){
   if(!dialog.isConnected){viewers.delete(dialog);continue;}
   let item=null,changed=!!pending,otherRace=false;
   if(pending&&info.event){
    otherRace=pending.race?.id!==(info.event.race||info.event.session);
    item=otherRace?null:newestGate(pending,info.event,info.gate);
    changed=otherRace||!!item&&gateFingerprint(item)!==gateFingerprint(info);
   }
   else if(pending&&info.raceId)otherRace=pending.race?.id!==info.raceId;
   info.notice.hidden=!changed;
   info.message.textContent=otherRace?'La course active a changé. Cette consultation conserve sa version initiale.':info.event?'Une nouvelle version de cette fiche est disponible.':'De nouvelles données sont disponibles. La consultation reste inchangée.';
   info.button.hidden=!info.refresh||otherRace||!!info.event&&!item;
   info.next=item;
  }
 }
 function receive(data,callback,generation){
  apply=callback;
  if(pending&&pendingGeneration!==generation)pending=null;
  if(displayed&&generation===displayedGeneration&&held()){
   pending=fingerprint(data)!==fingerprint(displayed)?data:null;pendingGeneration=generation;preserve(banner);return;
  }
  displayed=data;displayedGeneration=generation;pending=null;preserve(()=>{callback(data);banner();});
 }
 function flush(force=false){
  if(pending&&apply&&(force||!held())){
   if(pendingGeneration!==raceGeneration){pending=null;banner();return;}
   const data=pending;pending=null;displayed=data;displayedGeneration=pendingGeneration;preserve(()=>{apply(data);banner();});return;
  }
  preserve(banner);
 }
 function watch(dialog,options={}){
  if(viewers.has(dialog))return;
  const notice=document.createElement('div');notice.className='consultation-update';notice.hidden=true;notice.setAttribute('role','status');
  const message=document.createElement('span'),button=document.createElement('button');button.type='button';button.textContent=options.event?'Voir la nouvelle version':'Actualiser la consultation';notice.append(message,button);
  const body=dialog.querySelector('.justification-body');
  if(body)dialog.insertBefore(notice,body);else dialog.append(notice);
  const info={...options,notice,message,button,next:null};viewers.set(dialog,info);
  button.onclick=()=>{if(info.refresh)info.refresh(info.next);};
  dialog.addEventListener('close',()=>{viewers.delete(dialog);queueMicrotask(()=>{flush();if(!held()&&typeof refreshCourses==='function')refreshCourses();});},{once:true});
  banner();
 }
 function configure(dialog,options){const info=viewers.get(dialog);if(info)Object.assign(info,options);else watch(dialog,options);banner();}
 window.Consultation={receive,watch,configure,preserve,newestGate,flush,latest:()=>pending||displayed};
 document.getElementById('consultation-toggle').onclick=()=>{paused=!paused;if(!paused)flush();banner();};
 document.getElementById('consultation-apply').onclick=()=>flush(true);
 window.addEventListener('afterprint',()=>queueMicrotask(()=>flush()));
 document.addEventListener('focusout',()=>setTimeout(()=>flush(),0));
 document.addEventListener('selectionchange',()=>{if(!window.getSelection()?.toString())flush();});
 // The catalog must not reconstruct a native select while it is being used.
 window.Consultation.catalogHeld=()=>!!document.querySelector('dialog[open]')||document.activeElement?.id==='course-select'||paused;
})();
