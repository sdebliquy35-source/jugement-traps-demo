/* Every API request is answered in memory. There is deliberately no network fallback. */
'use strict';
window.Demo=(()=>{
 const E=RaceDemoEngine,state={time:105,speed:5,paused:false,kind:'slalom',label:'Découverte · Manche 1',race:'10000000-0000-4000-8000-000000000001',acknowledged:[],grants:[],role:'server',preparation:null,recovery:{phase:'idle',posts:[]},unexpected:[]};
 const clone=x=>JSON.parse(JSON.stringify(x));let last=performance.now(),counter=1;
 const archives=new Map([['exemple-slalom',E.snapshot({time:760,label:'Exemple · Manche précédente',race:'10000000-0000-4000-8000-000000000002',epoch:E.EPOCH-3600000})],['exemple-cross',E.snapshot({time:760,kind:'cross',label:'Exemple · Time Trial Cross',race:'10000000-0000-4000-8000-000000000003',epoch:E.EPOCH-7200000})]]);
 function tick(){const now=performance.now();if(!state.paused)state.time=Math.min(760,state.time+(now-last)/1000*state.speed);last=now;if(state.time>=760)state.paused=true;}
 function active(){tick();return E.snapshot(state);}
 function catalog(){return [{...active().race,key:'',active:true,sheets:active().events.length},...[...archives.entries()].map(([key,s])=>({...s.race,key,active:false,sheets:s.events.length}))];}
 function status(){return {role:state.role,roleConfirmed:true,online:true,paired:state.role==='ja',replicated:state.role==='ja',pending:0,assetsPending:0,lastSync:Date.now(),source:'Simulation dans ce navigateur',error:'',operator:'Démonstration',code:'123456',requiresRestart:false};}
 function phones(){return Object.entries(E.profiles()).map(([device,p])=>({device,post:p.post||'Déporté',kind:'slalom',version:47,seen:Date.now(),held:!!state.preparation,pending:0,profile:p}));}
 function reset(kind=state.kind){state.time=105;state.kind=kind;state.acknowledged=[];state.grants=[];state.paused=false;last=performance.now();}
 function archiveActive(){archives.set('simulation-'+counter++,active());}
 function recovery(){const r=state.recovery;if(r.phase==='text'&&performance.now()-r.since>2500)r.phase='audio';if(r.phase==='audio'&&performance.now()-r.since>5000)r.phase='done';return {...r,posts:r.posts.map((p,i)=>({...p,textDone:['audio','done'].includes(r.phase),audioDone:r.phase==='done'}))};}
 async function route(input,options={}){
  const raw=typeof input==='string'?input:input.url;if(!raw.startsWith('/api/')){state.unexpected.push(raw);throw Error('La démonstration refuse les requêtes externes.');}
  const u=new URL(raw,'https://demo.invalid'),p=u.pathname,body=options.body?JSON.parse(options.body):{},post=(options.method||'GET')==='POST';let out;
  if(p==='/api/events')out=clone(u.searchParams.get('archive')?archives.get(u.searchParams.get('archive')):active());
  else if(p==='/api/health')out={status:'ok',name:'Démonstration locale',receiverId:'demo-browser',race:state.race,gatePatches:true,audio:true};
  else if(p==='/api/courses')out=catalog();
  else if(p==='/api/race')out={...active().race,canReset:true};
  else if(p==='/api/deployment'){if(post&&body.action==='configure')state.role=body.role;out=status();}
  else if(p==='/api/deployment/code')out={code:'123456',expiresAt:Date.now()+600000};
  else if(p.startsWith('/api/deployment/'))out=status();
  else if(p==='/api/session')out={active:active().race,preparation:state.preparation,phones:phones(),manager:{host:'Simulation',port:0},managerCandidates:[]};
  else if(p==='/api/journal'){
   const data=u.searchParams.get('archive')?archives.get(u.searchParams.get('archive')):active();let items=[...(data?.journal||[])].reverse();const bib=+u.searchParams.get('bib'),kind=u.searchParams.get('kind'),before=+u.searchParams.get('before'),search=(u.searchParams.get('search')||'').toLowerCase();items=items.filter(x=>(!bib||x.data.bib===bib)&&(!kind||x.kind===kind)&&(!before||x.seq<before)&&(!search||JSON.stringify(x).toLowerCase().includes(search)));out={items:items.slice(0,200),next:items.length>200?items[199].seq:null};
  }
  else if(p==='/api/course/label'){state.label=body.label||'Course de découverte';out={stored:true};}
  else if(p==='/api/course/reopen'){const s=archives.get(body.archive);if(!s)throw Error('Archive de démonstration inconnue');archiveActive();state.race=s.race.id;state.label=s.race.label;reset(s.race.discipline);out={stored:true};}
  else if(p==='/api/race/reset'){archiveActive();state.race='10000000-0000-4000-8000-'+String(++counter).padStart(12,'0');reset();out=active().race;}
  else if(p==='/api/session/admin/ack-alert'){if(body.race!==state.race)throw Error('Revenez à la course active');state.acknowledged.push(body.id);out={stored:true};}
  else if(p==='/api/session/admin/protection'){if(body.id){const g=state.grants.find(g=>g.id===body.id);if(g)g.active=false;out=g||{stored:true};}else{out={...body,id:'demo-grant-'+Date.now(),active:true};state.grants.push(out);}}
  else if(p==='/api/session/admin/prepare'){state.preparation={id:'prep-'+counter++,label:body.label||'Nouvelle course fictive',discipline:body.discipline||'slalom',phase:'waiting',phones:phones(),bibs:[]};out=state.preparation;}
  else if(p==='/api/session/admin/manager'){if(!state.preparation)throw Error('Préparez d’abord une course fictive');state.preparation={...state.preparation,phase:'ready',bibs:Array.from({length:30},(_,i)=>i+1)};out=state.preparation;}
  else if(p==='/api/session/admin/activate'){archiveActive();const prep=state.preparation;state.label=prep.label;state.race='10000000-0000-4000-8000-'+String(++counter).padStart(12,'0');state.preparation=null;reset(prep.discipline);out=active().race;}
  else if(p==='/api/session/admin/cancel'){state.preparation=null;out={stored:true};}
  else if(p==='/api/recovery')out=recovery();
  else if(p==='/api/recovery/request'){
   const r=state.recovery;
   if(body.action==='start')state.recovery={id:'recovery-demo',phase:'survey',posts:phones().map(p=>({device:p.device,races:[{race:state.race,sheets:30,audios:2,first:E.EPOCH,profile:p.profile}]}))};
   else if(['begin','recover','confirm'].includes(body.action)){r.phase='text';r.race=body.race||state.race;r.since=performance.now();}
   else if(body.action==='pause')r.phase='paused';else if(body.action==='resume'){r.phase='text';r.since=performance.now();}else if(body.action==='cancel')r.phase='cancelled';out=recovery();
  }
  else {state.unexpected.push(p);throw Error('Action non disponible dans la démonstration : '+p);}
  if(out===undefined)throw Error('Données de démonstration indisponibles');return new Response(JSON.stringify(out),{status:200,headers:{'Content-Type':'application/json'}});
 }
 window.fetch=async(input,options)=>{try{return await route(input,options);}catch(e){return new Response(JSON.stringify({error:e.message}),{status:400,headers:{'Content-Type':'application/json'}});}};
 return {state,tick,reset,active,catalog,archives,setSpeed(n){tick();state.speed=+n;},pause(){tick();state.paused=!state.paused;},recovery};
})();
