/* Fictitious race generator; pure snapshots and no I/O. */
(function(root){
'use strict';
const EPOCH=Date.UTC(2026,6,1,9,0),T='Juge Transmetteur',D='Juge déporté';
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const clone=x=>JSON.parse(JSON.stringify(x));
function profiles(){const out={};['Alex Rivière','Lou Marin','Sacha Le Gall','Noa Fontaine','Charlie Le Roux'].forEach((name,i)=>out[uid(i+1)]={post:String(i+1),officials:[{name,function:T,gates:[1,2,3,4].map(n=>n+i*4)}]});[['Camille Démo',[7,8,9,10]],['Nora Démo',[6,7,8]],['Maël Démo',[7,8]]].forEach(([name,gates],i)=>out[uid(i+6)]={post:'',officials:[{name,function:D,gates}]});return out;}
const blocked=(bib,g)=>bib===4||bib===8&&g>=8;
function value(bib,g,index){if(bib===1&&g===2)return 2;if(bib===2&&g===3)return 50;if(bib===5&&g===3)return 2;const n=(bib*17+g*7+index*11)%19;return n===0||n===8?50:n%4===1?2:0;}
function snapshot({time=105,kind='slalom',label='Découverte · Manche 1',race='10000000-0000-4000-8000-000000000001',epoch=EPOCH,acknowledged=[],grants=[]}={}){
 const posts=profiles(),events=[],results=[],arrivals=[],history=[],states=[],journal=[];const received=seconds=>epoch+Math.round(seconds*1000),acks=new Set(acknowledged);
 const addJournal=(at,kind,data,key)=>journal.push({at:received(at),kind,data,source:key});
 if(time>=57){const s={bib:4,absent:true,beforeGate:null,revision:1,action:'absent',updatedAt:received(57),device:uid(90),judge:'Chrono départ · démo'};states.push(s);history.push(s);addJournal(57,'signalement',s,'absent4');}
 if(time>=157.9){const s={bib:8,absent:false,beforeGate:8,revision:2,action:'capsize',updatedAt:received(157.9),device:uid(2),judge:'Lou Marin'};states.push(s);history.push(s);addJournal(157.9,'signalement',s,'capsize8');}
 for(let bib=1;bib<=30;bib++){
  const start=(bib-1)*20,finish=start+60+(bib%4)*.73;
  if(bib===4)continue;
  for(const [type,at,device]of [['start',start,uid(90)],['finish',finish,uid(91)]]){if(time<at||type==='finish'&&bib===8)continue;const r={id:'sim-'+race+'-'+type+'-'+bib,device,race,kind:type,bib,time:received(at),createdAt:received(at),receivedAt:received(at+.12),revision:1,managerState:'sent'};results.push(r);addJournal(at,type,r,r.id);}
  if(kind==='cross'){
   for(let slot=1;slot<=3;slot++){const at=start+slot*14;if(time<at||bib===8&&slot>1)continue;const zone=slot===1?'start':slot===2?'gate:8':'roll:12',r={id:'sim-cross-'+race+'-'+bib+'-'+slot,device:uid(slot),race,kind:'cross',bib,createdAt:received(at),receivedAt:received(at+.1),revision:1,managerState:'sent',entries:[{slot:1,gate:slot===1?1:slot===2?8:12,zone,label:slot===1?'Départ':slot===2?'Porte 8':'Esquimautage · repère 12',value:(bib+slot)%6===0?2:0,confirmed:true}]};results.push(r);addJournal(at,'cross',r,r.id);}
   continue;
  }
  Object.entries(posts).forEach(([device,identification],index)=>{
   const judge=identification.officials[0],gates=[],gateReceivedAt={};let revision=1;
   for(const gate of judge.gates){if(blocked(bib,gate))continue;const at=start+gate*2.4+(index>=5?1.3:0),delayed=bib===2&&gate===10&&index===2,touchAt=delayed?174:at;if(time<touchAt)continue;
    const corrected=bib===5&&gate===3&&index===0&&time>=115,penalty=corrected?50:value(bib,gate,index),noteAt=(corrected?115:touchAt)+22+(gate%3)*3,validated=penalty===0||time>=noteAt;
    const notes=penalty===50?(bib===2&&gate===3?'50 D — Tête sous l’eau.':'50 A — Porte omise.'):penalty===2?'Contact de la pagaie avec la fiche gauche.':'';
    const audio=validated&&penalty>0&&((bib+gate)%7===0||bib===2&&gate===3)?[{id:'audio-demo',bytes:1000,mime:'audio/wav',durationMs:5000}]:[];
    const g={gate,penalty,enteredAt:received(corrected?115:touchAt),validated,notes:validated?notes:'',strokes:validated&&penalty>0?[[[.19,.31],[.29,.42],[.37,.29]],[[.2,.4],[.38,.31]]]:[],noteStrokes:validated&&penalty===2?[[[.08,.45],[.14,.42],[.2,.48],[.27,.4],[.35,.43]]]:[],audio};gates.push(g);revision+=validated?2:1;gateReceivedAt[gate]=received(validated?Math.max(touchAt,Math.min(time,noteAt)):touchAt);
    const point={id:'point-'+device+'-'+bib+'-'+gate,bib,device,gate,penalty,receivedAt:received(corrected?115:touchAt),identification};arrivals.push(point);
    addJournal(touchAt,'fiche',{device,judge:judge.name,bib,gates:[{gate,penalty:value(bib,gate,index),validated:false}]},point.id);
    if(validated&&penalty>0)addJournal(noteAt,'fiche',{device,judge:judge.name,bib,gates:[{gate,penalty,validated:true}]},'note-'+point.id);
    if(corrected)addJournal(115,'correction',{device,judge:judge.name,post:identification.post,bib,gate,before:2,after:50,receivedAt:received(115)},'correction-5-3');
   }
   if(gates.length)events.push({schema:1,id:'sim-'+race+'-'+device+'-'+bib,device,race,session:race,run:'',bib,createdAt:received(start+.1),receivedAt:Math.max(...Object.values(gateReceivedAt)),gateReceivedAt,revision,managerState:judge.function===D?'not-required':'acknowledged',complete:gates.every(g=>g.validated),identification:clone(identification),requiredGates:judge.gates.filter(g=>!blocked(bib,g)),gates});
  });
 }
 const alerts=[];
 if(kind==='slalom')for(const result of results.filter(r=>r.kind==='finish')){for(let i=0;i<5;i++){const device=uid(i+1),profile=posts[device],known=new Set(events.filter(e=>e.device===device&&e.bib===result.bib).flatMap(e=>e.gates.map(g=>g.gate))),missing=profile.officials[0].gates.filter(g=>!blocked(result.bib,g)&&!known.has(g));const id='missing:'+device+':'+result.bib;if(missing.length&&!acks.has(id))alerts.push({id,kind:'missing',device,bib:result.bib,gates:missing,judge:profile.officials[0].name,post:profile.post,at:result.time});}}
 if(kind==='slalom'&&time>=115&&!acks.has('correction-5-3'))alerts.push({id:'correction-5-3',kind:'correction',device:uid(1),bib:5,gate:3,before:2,after:50,judge:'Alex Rivière',post:'1',at:received(115)});
 journal.sort((a,b)=>a.at-b.at||a.source.localeCompare(b.source));journal.forEach((item,i)=>item.seq=i+1);
 return {race:{id:race,label,startedAt:epoch,discipline:kind,coordinated:true,bibs:Array.from({length:30},(_,i)=>i+1)},posts:kind==='slalom'?posts:{},events,results,control:{states,history,arrivals,receipts:Object.keys(posts).map(device=>({device,revision:2,seen:received(time)}))},supervision:{alerts,outdated:[],judges:Object.entries(posts).map(([device,p])=>({device,name:p.officials[0].name,post:p.post,judgeKey:device+'|'+p.officials[0].name})),grants:clone(grants)},journal};
}
const api={snapshot,profiles,uid,EPOCH};if(typeof module==='object'&&module.exports)module.exports=api;else root.RaceDemoEngine=api;
})(globalThis);
