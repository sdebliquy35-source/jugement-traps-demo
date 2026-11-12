/* Pure local demonstration model. No network or production identifiers. */
(function(root){'use strict';
const CONFIG={slalom:{title:'Slalom · Essai',bibs:30,red:[3,4,7,10],posts:{1:[1,2,3,4,5],2:[6,7,8],3:[9,10]},doors:[1,2,3,4,5,6,7,8,9,10]},cross:{title:'Time Trial Cross · Essai',bibs:10,red:[2],doors:['S',1,'E',2]}};
const blank=()=>({sheets:{},signals:{},clocks:{start:{},finish:{}},judges:{},messages:[],shownMessages:[],unlocks:{}});
const fresh=()=>({version:1,discipline:'',mode:'fiches',assignment:null,courses:{slalom:blank(),cross:blank()}});
const key=(bib,gate)=>bib+'|'+gate;
const neutral=()=>({value:null,strokes:[],notesInk:[],text:'',reason:'',audio:null,validated:false,draft:false,judge:''});
function gateState(g){if(!g||g.value===null)return 'empty';if(g.draft)return 'draft';if(g.value>0&&!g.validated)return 'needed';return 'done';}
function blocked(c,bib,gate,kind){const s=c.signals[bib];if(!s)return '';if(s.type==='absent')return 'Absent';if(kind==='cross')return CONFIG.cross.doors.indexOf(gate)>=CONFIG.cross.doors.indexOf(s.before)?'Dessalé':'';return Number(gate)>=Number(s.before)?'Dessalé':'';}
function locked(c,bib,gate,now=Date.now()){const g=c.sheets[key(bib,gate)];if(!g||g.value===null||c.unlocks[key(bib,gate)])return false;const finish=c.clocks.finish[bib];return !!finish&&now-finish>=600000;}
function setValue(c,bib,gate,value,judge,now=Date.now()){if(![0,2,50].includes(value)&&value!==null)throw Error('Pénalité invalide');if(locked(c,bib,gate,now))throw Error('Pénalité protégée : arrivée + 10 minutes.');const old=c.sheets[key(bib,gate)];if(value===null){delete c.sheets[key(bib,gate)];return;}if(old?.value===value)return;c.sheets[key(bib,gate)]={...neutral(),value,judge:old?.judge||judge,at:now};}
function hasContent(g){return !!(g.strokes.length||g.notesInk.length||g.text.trim()||g.reason||g.audio);}
const api={CONFIG,fresh,key,neutral,gateState,blocked,locked,setValue,hasContent};if(typeof module==='object'&&module.exports)module.exports=api;else root.TrapsModel=api;
})(globalThis);
