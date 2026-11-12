/* Offline, fictitious API. Every fetch is intercepted; external connections are forbidden by CSP. */
'use strict';
window.Demo=(()=>{
 const E=RaceDemoEngine,clone=x=>JSON.parse(JSON.stringify(x));
 const state={time:105,speed:5,paused:false,kind:'slalom',label:'Découverte · Manche 1',race:'10000000-0000-4000-8000-000000000001',acknowledged:[],grants:[],role:'server',preparation:null,released:[],messages:[],compet:false,chronoEnabled:false,recovery:{phase:'idle',posts:[]},unexpected:[],plan:null,empty:false};
 const archives=new Map([['exemple-slalom',E.snapshot({time:760,label:'Exemple · Manche précédente',race:'10000000-0000-4000-8000-000000000002',epoch:E.EPOCH-3600000})],['exemple-cross',E.snapshot({time:760,kind:'cross',label:'Exemple · Time Trial Cross',race:'10000000-0000-4000-8000-000000000003',epoch:E.EPOCH-7200000})]]);
 let last=performance.now(),counter=1;const key='jugement-demo070',now=()=>Date.now();
 // Share the simulation between the main page and detached tables, never with any server.
 function save(){try{localStorage.setItem(key,JSON.stringify({state,archives:[...archives],at:now()}));}catch(_){}}
 function restore(data){if(!data)return;Object.assign(state,data.state);archives.clear();for(const [k,v]of data.archives||[])archives.set(k,v);state.time=Math.min(760,state.time+(state.paused?0:Math.max(0,now()-data.at)/1000*state.speed));last=performance.now();}
 try{restore(JSON.parse(localStorage.getItem(key)));}catch(_){}
 window.addEventListener('storage',e=>{if(e.key===key&&e.newValue)try{restore(JSON.parse(e.newValue));}catch(_){}});
 function tick(){const t=performance.now();if(!state.paused)state.time=Math.min(760,state.time+(t-last)/1000*state.speed);if(state.time>=760)state.paused=true;last=t;}
 function active(){tick();const s=E.snapshot(state);if(state.plan)s.race.plan=clone(state.plan);if(state.empty){s.events=[];s.results=[];s.journal=[];s.control={states:[],history:[],arrivals:[],receipts:[]};s.supervision.alerts=[];s.race.competitionStarted=false;}
  s.race.sheetBibs=[...s.race.bibs];s.race.entries=rosterEntries();
  s.journal.push(...state.messages.flatMap(m=>m.history.map((h,i)=>({seq:100000+Number(m.id.split('-').pop())*10+i,at:h.at,kind:'message',source:m.id,data:{text:m.text,judge:m.judge,post:m.post,state:h.state}}))));return s;}
 function catalog(){const a=active();return [{...a.race,key:'',active:true,sheets:a.events.length},...[...archives].map(([k,s])=>({...s.race,key:k,active:false,sheets:s.events.length}))];}
 function status(){return {role:state.role,roleConfirmed:true,online:true,paired:state.role==='ja',replicated:state.role==='ja',pending:0,assetsPending:0,lastSync:now(),source:'http://demo.invalid',error:'',operator:'Démonstration',code:'123456',requiresRestart:false};}
 function phones(){const profiles=E.profiles(),base=Object.entries(profiles).slice(0,5).map(([device,profile],i)=>({device,profile,post:profile.post,kind:state.kind,deviceName:['WP5-1','Galaxy A40-1','WP5-2','Galaxy A40-2','WP5-3'][i]}));
  for(const [n,kind]of [[90,'start'],[91,'finish']])base.push({device:E.uid(n),profile:{post:kind==='start'?'Départ':'Arrivée',officials:[]},post:kind==='start'?'Départ':'Arrivée',kind,deviceName:kind==='start'?'Galaxy A40-3':'WP5-4'});
  return base.filter((p,i)=>!state.released.includes(p.device)&&(state.kind!=='cross'||i<4||i>=5)).map((p,i)=>({...p,association:{kind:p.kind,post:p.post,gates:state.kind==='cross'&&i<4?[[27],[1],[26],[2]][i]:p.profile.officials.flatMap(j=>j.gates)},race:state.race,version:108,seen:now()-500,held:state.preparation?.phase==='quiescing',pending:0,gates:p.profile.officials.flatMap(j=>j.gates),judge:p.profile.officials.map(j=>j.name).join(' / ')}));}
 function technical(){const delayed=state.time>=100&&state.time<174;const ps=phones().map((p,i)=>{const pending=delayed&&i===2,low=state.time>=120&&state.time<210&&i===4;const channels={};for(const name of ['manager','judgment','signals','audio'])channels[name]={available:true,pending:pending&&name==='judgment'?1:0,unknown:0,items:pending&&name==='judgment'?[{bib:2,gates:[10],revision:1}]:[],incoming:0,outgoing:0};return {...p,ageMs:500,battery:{percent:low?4:92-i*7,charging:i===1,full:false},channels,issues:[...(pending?[{level:'warning',text:'Copie Jugement en attente · exemple résolu à 02:54'}]:[]),...(low?[{level:'warning',text:'Batterie inférieure à 5 % · exemple résolu à 03:30'}]:[])]};});return {at:now(),label:state.label,phones:ps,anomalies:ps.filter(p=>p.issues.length).length};}
 function session(){const a=active(),ps=phones();return {active:a.race,preparation:state.preparation,phones:ps,claims:ps.map(p=>({...p,judge:p.judge})),manager:{host:'192.0.2.52',port:7000},managerCandidates:[],technical:technical(),automaticNext:{available:true,count:ps.length},restart:state.restart};}
 function compet(){return {config:{host:'192.0.2.52',port:7000},active:state.compet,connected:state.compet,connectionReady:state.compet,needsConfirmation:false,totalPending:0,pending:0,written:12,chronoPending:0,chronoWritten:0,chronoEnabled:state.chronoEnabled,error:'',suspensionReason:''};}
 function reset(kind=state.kind){state.kind=kind;state.preparation=null;state.recovery={phase:'idle',posts:[]};state.time=105;state.empty=false;state.plan=null;state.acknowledged=[];state.grants=[];state.messages=[];state.released=[];state.paused=false;state.label=kind==='cross'?'Découverte · Time Trial Cross':'Découverte · Manche 1';last=performance.now();save();}
 function archiveActive(){const a=active();archives.set('simulation-'+counter++,clone(a));}
 function rosterEntries(){return Array.from({length:30},(_,i)=>({bib:i+1,rank:i+1,category:['K1H','K1D','C1H','C1D'][Math.floor(i/8)],scheduled:'10:'+String(Math.floor(i/3)).padStart(2,'0')+':'+String(i%3*20).padStart(2,'0')}));}
 function roster(){return {label:(state.kind==='cross'?'Course fictive Cross':'Course fictive Slalom')+' · Manche 2',discipline:state.kind,bibs:Array.from({length:30},(_,i)=>i+1),entries:Array.from({length:30},(_,i)=>({bib:i+1,rank:i+1,category:['K1H','K1D','C1H','C1D'][Math.floor(i/8)],scheduled:'10:'+String(Math.floor(i/3)).padStart(2,'0')+':'+String(i%3*20).padStart(2,'0')})),liveCourse:{competition:'Course fictive',course:state.kind==='cross'?'Cross':'Slalom',phase:'Manche 2',gateCount:state.kind==='cross'?2:20},previewToken:'demo-preview',token:'demo-preview',livePlan:active().race.plan};}
 function loadRoster(prep){Object.assign(prep,roster(),{phase:'ready',wizardStep:'list',identifiedDiscipline:state.kind,livePrefillNotice:'Liste fictive importée · aucun accès à CompetFFCK.',livePlanNotice:'Parcours et postes fictifs préremplis depuis la source simulée.'});return prep;}
 function prep(){if(!state.preparation)throw Error('Aucune préparation en cours.');return state.preparation;}
 function messageView(){for(const m of state.messages){const age=(now()-m.createdAt)/1000,stage=age<2?-1:age<5?0:age<9?1:age<16?2:3;if(stage>m.stage){for(let i=m.stage+1;i<=stage;i++)m.history.push({at:now(),state:['reçu','mis en attente','lu','effacé'][i]});m.stage=stage;}}
  return {race:state.race,targets:phones().map(p=>({device:p.device,deviceName:p.deviceName,judge:p.judge||p.post,post:p.post,supported:true})),items:clone(state.messages)};}
 function admin(action,b){let out={ok:true};const p=state.preparation;
  if(action==='connection-check')return {websocket:{ready:true,reachable:true,host:b.host||'192.0.2.52',port:b.port||8081,message:'Connecté · manche active (simulation uniquement)',preview:{label:roster().label,token:'demo-preview'}}};
  if(action==='prepare'){state.preparation={id:'prep-'+counter++,previous:state.race,label:b.label,discipline:b.discipline||'',phase:'waiting-pce',wizardStep:'list',bibs:[],phones:phones()};if(b.livePreviewToken)loadRoster(state.preparation);out=state.preparation;}
  else if(action==='live-roster'){if(b.operation==='preview')return roster();out=loadRoster(prep());}
  else if(action==='pce'){out=loadRoster(prep());out.filename=b.filename;out.livePrefillNotice='Import fictif : le contenu du fichier choisi n’est pas envoyé ni interprété.';}
  else if(action==='draft'){Object.assign(prep(),{wizardStep:b.step},b.label?{label:b.label}:{});out=prep();}
  else if(action==='discipline'){prep().discipline=b.discipline;out=prep();}
  else if(action==='layout'){prep().layout=b.layout;prep().phase=state.kind==='cross'?'configured':'layout-ready';prep().wizardStep=state.kind==='cross'?'notify':'posts';if(state.kind==='cross')prep().plan=b.layout;out=prep();}
  else if(action==='plan'){prep().plan=b.plan;prep().phase='configured';prep().wizardStep='notify';out=prep();}
  else if(action==='quiesce'){prep().phase='quiescing';prep().wizardStep='activate';out=prep();}
  else if(action==='activation-review')return {token:'demo-review',busy:[],issues:[],competQueue:{total:0,penalties:0,chronos:0}};
  else if(action==='activate'){const next=clone(prep());archiveActive();reset(next.discipline);state.race=crypto.randomUUID();state.label=next.label;state.plan=next.plan;state.preparation=null;out={...active().race};}
  else if(action==='cancel')state.preparation=null;
  else if(action==='restart-course'){archiveActive();state.empty=true;state.time=0;state.paused=true;state.acknowledged=[];state.messages=[];state.restart={phase:'applied',target:state.race,phones:phones().map(p=>({...p,state:'applied'}))};out=state.restart;}
  else if(action==='release-post'){state.released.push(b.device);out={stored:true,ok:true};}
  else if(['plan-prepare','plan-commit','plan'].includes(action)){if(b.plan)state.plan=b.plan;out=active().race;}
  else if(action==='ack-alert')state.acknowledged.push(b.id);
  else if(action==='protection'){if(b.action==='revoke')state.grants=state.grants.filter(g=>g.id!==b.id);else state.grants.push({...b,id:'grant-'+counter++,createdAt:now()});out={grants:state.grants};}
  else if(action==='message'){const targets=messageView().targets.filter(t=>b.allActive||t.device===b.device);for(const t of targets)state.messages.unshift({id:'message-'+counter++,...t,text:b.text,createdAt:now(),stage:-1,history:[{at:now(),state:'envoyé'}]});out={count:targets.length,stored:true};}
  else if(action==='compet-test')out={message:'Test réussi dans la simulation. Aucun serveur réel contacté.'};
  else if(action==='compet-config'){state.compet=!!b.enabled;out=compet();}
  else if(action==='compet-chronos'&&b.operation==='mode'){state.chronoEnabled=!!b.enabled;out=compet();}
  else if(['compet-resend','compet-chronos','manager-resend'].includes(action)){
   if(b.operation==='confirm')out={queued:6,alreadyPending:0};else {const a=active(),n=b.bibs?.length||a.race.bibs.length;out={label:state.label,race:state.race,count:n,host:'192.0.2.52',port:7000,missingBibs:[],excluded:[],unavailable:0,blocked:0,fingerprint:'demo-only',requestId:'demo-send',items:a.race.bibs.slice(0,n).map(bib=>({bib,milliseconds:60730}))};}
  }else if(action==='manager')out=loadRoster(prep());
  else throw Error('Action non simulée : '+action);
  return clone(out);
 }
 async function route(input,options={}){const raw=typeof input==='string'?input:input.url;if(!raw.startsWith('/api/'))throw Error('Connexion externe interdite dans la démo.');const u=new URL(raw,'https://demo.invalid'),p=u.pathname,b=options.body?JSON.parse(options.body):{};let out;
  if(p==='/api/events'){const key=u.searchParams.get('archive');out=key?archives.get(key):active();if(!out)throw Error('Archive fictive indisponible.');}
  else if(p==='/api/courses')out=catalog();
  else if(p==='/api/health')out={status:'ok',version:'0.70 · démo',race:active().race,gatePatches:true,audio:true};
  else if(p==='/api/race')out={...active().race,canReset:true};
  else if(p==='/api/session')out=session();
  else if(p==='/api/deployment'){if(options.method==='POST'&&b.role)state.role=b.role;out=status();}
  else if(p==='/api/deployment/code')out={code:'123456',expiresAt:now()+300000};
  else if(p.startsWith('/api/deployment/'))out=status();
  else if(p==='/api/competffck')out=compet();
  else if(p==='/api/manager')out={host:'192.0.2.52',port:7000};
  else if(p==='/api/messages')out=messageView();
  else if(p==='/api/journal'){const snap=archives.get(u.searchParams.get('archive'))||active(),bib=u.searchParams.get('bib'),kind=u.searchParams.get('kind'),q=(u.searchParams.get('search')||'').toLowerCase(),before=Number(u.searchParams.get('before'))||Infinity;let items=[...snap.journal].reverse().filter(e=>(!bib||e.data.bib===+bib)&&(!kind||e.kind===kind)&&e.seq<before&&(!q||JSON.stringify(e).toLowerCase().includes(q)));const limit=Number(u.searchParams.get('limit'))||200;out={race:snap.race,items:items.slice(0,limit),hasMore:items.length>limit};}
  else if(p.startsWith('/api/session/admin/'))out=admin(p.split('/').pop(),b);
  else if(p==='/api/course/label'){state.label=b.label;out={stored:true};}
  else if(p==='/api/course/delete'){for(const [k,v]of archives)if(k===b.archive||b.archives?.includes(k)||v.race.id===b.race)archives.delete(k);out={stored:true,pending:false,replica:'Archives fictives supprimées dans ce navigateur uniquement.'};}
  else if(p==='/api/course/reopen'){const target=archives.get(b.archive);if(!target)throw Error('Archive indisponible');archiveActive();reset(target.race.discipline);state.race=target.race.id;state.label=target.race.label;out=active().race;}
  else if(p==='/api/race/reset'){archiveActive();reset();state.race=crypto.randomUUID();out=active().race;}
  else if(p==='/api/recovery/request'){state.recovery={phase:b.action==='cancel'?'idle':b.action==='pause'?'paused':'recovering',started:now(),posts:phones()};out=state.recovery;}
  else if(p==='/api/recovery'){const r=state.recovery;if(r.started&&now()-r.started>5000)r.phase='done';out={...r,completion:r.phase==='done'?'complete':undefined,posts:phones().map(p=>({...p,phase:r.phase,sheets:30,audioDone:r.phase==='done',verification:{verified:r.phase==='done',expectedSheets:30,missingSheets:0,expectedResults:0,missingResults:0,expectedAudios:2,missingAudios:0}}))};}
  else {state.unexpected.push(p);throw Error('Fonction non simulée : '+p);}
  if(options.method&&options.method!=='GET')save();return clone(out);
 }
 const uiReady=new Promise(resolve=>{if(document.readyState!=='complete')window.addEventListener('load',resolve,{once:true});else resolve();});
 window.fetch=async(input,options={})=>{await uiReady;try{return new Response(JSON.stringify(await route(input,options)),{status:200,headers:{'Content-Type':'application/json'}});}catch(e){return new Response(JSON.stringify({error:e.message}),{status:400,headers:{'Content-Type':'application/json'}});}};
 setInterval(()=>{tick();if(!new URLSearchParams(location.search).has('tableau'))save();},1000);
 return {state,tick,reset,active,catalog,archives,save,setSpeed(v){tick();state.speed=Number(v);save();},pause(){tick();state.paused=!state.paused;save();},route,phones};
})();
