/* Pure projection: original events and revisions are never rewritten or duplicated. */
(function(root){
 'use strict';
 const TRANSMITTER='Juge Transmetteur',DELEGATE='Juge déporté';
 const numbers=a=>[...new Set((a||[]).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
 const profile=e=>e.identification||{};
 const judges=p=>(p.officials||[]).filter(j=>j&&Array.isArray(j.gates));
 const postKey=p=>'poste:'+String(p).trim();
 const sourceKey=(device,j)=>JSON.stringify([device,j.name||'',j.function||'']);
 function build(items,registrations={}){
  const posts=new Map(),identities=[],knownIdentities=new Set(),sourceItems=new WeakMap();
  function addIdentity(device,p){const key=JSON.stringify([device,p]);if(!knownIdentities.has(key)){knownIdentities.add(key);identities.push({device,p});}}
  for(const [device,p]of Object.entries(registrations))addIdentity(device,p);
  for(const item of items)addIdentity(item.event.device,profile(item.event));
  function ensure(id,label){if(!posts.has(id))posts.set(id,{id,label,gates:[],sources:new Map()});return posts.get(id);}
  // Current transmitter assignments define each post; archives fall back to their saved identities.
  const current=new Map();for(const [device,p]of Object.entries(registrations))for(const j of judges(p))if(j.function===TRANSMITTER&&String(p.post||'').trim()){const key=postKey(p.post);current.set(key,numbers([...(current.get(key)||[]),...j.gates]));}
  for(const {device,p}of identities)for(const j of judges(p))if(j.function===TRANSMITTER&&String(p.post||'').trim()){const post=ensure(postKey(p.post),'Poste '+p.post);post.gates=numbers([...(current.get(post.id)||post.gates),...(current.has(post.id)?[]:j.gates)]);}
  // Legacy unidentified sheets remain discoverable, without inventing a named post.
  for(const {event:e,gate:g}of items)if(!judges(profile(e)).length){const post=ensure('inconnu:'+e.device,'Poste non renseigné · '+e.device.slice(0,6));post.gates=numbers([...post.gates,g.gate]);}
  function attach(post,device,j,item){const key=sourceKey(device,j);if(!post.sources.has(key))post.sources.set(key,{id:key,device,name:j.name||'Juge non renseigné',role:j.function||'Non renseignée',gates:[],items:[]});const s=post.sources.get(key);s.gates=numbers([...s.gates,...j.gates.filter(g=>post.gates.includes(g))]);if(item){if(!sourceItems.has(s))sourceItems.set(s,new Set());const key=JSON.stringify([item.event.id,item.gate.gate]);if(!sourceItems.get(s).has(key)){sourceItems.get(s).add(key);s.items.push(item);}}}
  for(const {device,p}of identities)for(const j of judges(p))for(const post of posts.values())if(j.function===DELEGATE||post.id===postKey(p.post)){if(j.gates.some(g=>post.gates.includes(g)))attach(post,device,j);}
  for(const item of items){const {event:e,gate:g}=item,p=profile(e),officials=judges(p);if(!officials.length){const post=posts.get('inconnu:'+e.device);attach(post,e.device,{name:e.judge||'Juge non renseigné',function:'Non renseignée',gates:post.gates},item);continue;}for(const j of officials)if(j.gates.includes(g.gate))for(const post of posts.values())if(post.gates.includes(g.gate)&&(j.function===DELEGATE||post.id===postKey(p.post)))attach(post,e.device,j,item);}
  return [...posts.values()].map(p=>({...p,sources:[...p.sources.values()].sort((a,b)=>(a.role===DELEGATE)-(b.role===DELEGATE)||a.name.localeCompare(b.name,'fr')||a.device.localeCompare(b.device))})).sort((a,b)=>a.label.localeCompare(b.label,'fr',{numeric:true}));
 }
 function canCompare(a,b){return !!a&&!!b&&a.id!==b.id&&!(a.role===TRANSMITTER&&b.role===TRANSMITTER);}
 function firstBib(bib){return Math.floor((bib-1)/10)*10+1;}
 function pages(items){return numbers(items.map(x=>firstBib(x.event.bib)));}
 function chunks(gates){const n=Math.ceil(gates.length/5);if(!n)return[];const min=Math.floor(gates.length/n),extra=gates.length%n,out=[];let at=0;for(let i=0;i<n;i++){const size=min+(i<extra?1:0);out.push(gates.slice(at,at+size));at+=size;}return out;}
 function cell(source,bib,gate){if(!source.gates.includes(gate))return {state:'not-judged',items:[]};const matches=source.items.filter(x=>x.event.bib===bib&&x.gate.gate===gate);return {state:matches.length?'received':'not-received',items:matches};}
 const api={build,canCompare,firstBib,pages,chunks,cell,TRANSMITTER,DELEGATE};if(typeof module==='object'&&module.exports)module.exports=api;else root.PileModel=api;
})(globalThis);
