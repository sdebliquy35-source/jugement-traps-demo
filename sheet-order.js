/* Pure visual ordering: packet identities and departure lists remain unchanged. */
(function(root){'use strict';
 function create(course={},items=[]){
  const start=course.sheetOrder==='start'&&Array.isArray(course.sheetBibs)&&course.sheetBibs.length>0;
  const roster=start?[...new Set(course.sheetBibs.filter(n=>Number.isInteger(n)&&n>0))]:[];
  const known=new Set(roster),extra=[...new Set(items.map(i=>i.event.bib).filter(n=>!known.has(n)))].sort((a,b)=>a-b);
  // Unexpected received bibs get separate pages; they never shift the programmed list.
  const unknownBase=Math.ceil(roster.length/10)*10;const ranks=new Map(roster.map((b,i)=>[b,i]));extra.forEach((b,i)=>ranks.set(b,unknownBase+i));
  const rank=b=>ranks.get(b)??Number.MAX_SAFE_INTEGER;
  const compare=(a,b)=>start?rank(a)-rank(b)||a-b:a-b;
  const page=b=>start?Math.floor(rank(b)/10)*10+1:Math.floor((b-1)/10)*10+1;
  const columns=first=>start?(first<=roster.length?roster.slice(first-1,first+9):extra.slice(first-1-unknownBase,first+9-unknownBase)):Array.from({length:10},(_,i)=>first+i);
  const pages=values=>[...new Set(values.map(i=>page(i.event.bib)))].sort((a,b)=>a-b);
  const label=first=>start?'Départs '+first+' à '+(first+columns(first).length-1):'Dossards '+first+' à '+(first+9);
  return {start,page,columns,pages,label,compare};
 }
 const key='judgment.sheetOrder';
 function readPreference(storage){try{return storage.getItem(key)==='start'?'start':'numeric';}catch(e){return 'numeric';}}
 function savePreference(storage,value){const mode=value==='start'?'start':'numeric';try{storage.setItem(key,mode);}catch(e){}return mode;}
 const api={create,readPreference,savePreference};if(typeof module==='object'&&module.exports)module.exports=api;else root.SheetOrder=api;
})(globalThis);
