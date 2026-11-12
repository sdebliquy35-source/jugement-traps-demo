/* Geometry port of TEST TouchRecognizer. Ambiguous signs always require confirmation. */
(function(root){'use strict';
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const length=s=>s.slice(1).reduce((n,p,i)=>n+dist(s[i],p),0);
const line=s=>s.length>1&&dist(s[0],s.at(-1))>.08&&length(s)<dist(s[0],s.at(-1))*1.18;
const loop=s=>s.length>4&&dist(s[0],s.at(-1))<length(s)*.22&&length(s)>.4;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const intersects=(a,b)=>cross(a[0],a.at(-1),b[0])*cross(a[0],a.at(-1),b.at(-1))<0&&cross(b[0],b.at(-1),a[0])*cross(b[0],b.at(-1),a.at(-1))<0;
const parallel=(a,b)=>{const d=[a.at(-1)[0]-a[0][0],a.at(-1)[1]-a[0][1]],e=[b.at(-1)[0]-b[0][0],b.at(-1)[1]-b[0][1]];return Math.abs(d[0]*e[0]+d[1]*e[1])/(Math.hypot(...d)*Math.hypot(...e));};
function simplify(s,t=.012){if(s.length<3)return s;const a=s[0],b=s.at(-1),span=dist(a,b);let best=t,index=-1;for(let i=1;i<s.length-1;i++){const p=s[i],k=span?Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/(span*span))):0,d=dist(p,[a[0]+k*(b[0]-a[0]),a[1]+k*(b[1]-a[1])]);if(d>best){best=d;index=i;}}return index<0?[a,b]:[...simplify(s.slice(0,index+1),t).slice(0,-1),...simplify(s.slice(index),t)];}
function normalize(lines){const pts=lines.flat(),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),size=Math.max(maxx-minx,maxy-miny);if(size<.08)return null;const w=Math.max(maxx-minx,size*.15),h=Math.max(maxy-miny,size*.15),samples=[];for(const s of lines){const total=length(s);if(!total)continue;const count=Math.max(8,Math.min(80,Math.floor(total/size*25)));let j=1,before=0;for(let k=0;k<count;k++){const target=total*k/(count-1);while(j<s.length-1&&before+dist(s[j-1],s[j])<target){before+=dist(s[j-1],s[j]);j++;}const a=s[j-1],b=s[j],seg=dist(a,b),t=seg?(target-before)/seg:0;samples.push([(a[0]+t*(b[0]-a[0])-(minx+maxx)/2)/w,(a[1]+t*(b[1]-a[1])-(miny+maxy)/2)/h]);}}return samples;}
const nearest=(a,b)=>a.reduce((n,p)=>n+Math.min(...b.map(q=>dist(p,q))),0)/a.length;
const score=(a,b)=>!a?.length||!b?.length?100:(nearest(a,b)+nearest(b,a))/2;
function circleScore(s){const c=Array.from({length:65},(_,i)=>[.5+.36*Math.cos(i*Math.PI/32),.5+.48*Math.sin(i*Math.PI/32)]);return score(normalize([s]),normalize([c]));}
const TWO=[
        [[.1,.18],[.25,.04],[.62,0],[.88,.12],[.9,.3],[.7,.48],[.15,.9],[.05,1],[.9,1]],
        [[0,.15],[.2,0],[.65,0],[.85,.2],[.7,.4],[0,1],[1,1]],
        [[.1,0],[.8,0],[1,.15],[.85,.35],[.05,.9],[0,1],[1,1]],
        [[0,.25],[.08,.1],[.3,0],[.6,.02],[.85,.15],[.9,.32],[.75,.5],[.4,.7],[.05,.95],[.35,1],[1,.95]],
        [[0,.12],[.3,0],[.75,.05],[1,.25],[.85,.45],[.35,.72],[.02,.9],[.1,1],[.65,.95],[1,1]],
        
        [[0,0],[.5,0],[1,.05],[.9,.2],[.55,.5],[.12,.85],[0,1],[.5,1],[1,1]],
        [[0,0],[1,0],[0,1],[1,1]]];
const FIVE=[
        [[.92,0],[.15,0],[.08,.48],[.45,.42],[.78,.5],[.92,.73],[.8,.95],[.4,1],[.05,.9]],
        [[.9,0],[.1,0],[.1,.5],[.65,.5],[.9,.7],[.8,.95],[.45,1],[.05,.87]],
        [[.85,0],[.15,.05],[.12,.45],[.6,.4],[.9,.6],[.9,.85],[.6,1],[.2,1],[0,.85]],
        [[1,0],[.1,0],[.1,.45],[.65,.45],[.9,.55],[1,.75],[.9,.95],[.6,1],[.2,.95],[0,.8]],
        [[.9,0],[.1,0],[0,.5],[.35,.4],[.7,.45],[1,.65],[.95,.85],[.7,1],[.35,1],[0,.9]],
        
        [[.95,.1],[.7,0],[.3,.02],[.05,.2],[.08,.35],[.35,.48],[.7,.55],[.95,.7],[.9,.88],[.65,1],[.25,.98],[0,.87]],
        [[1,0],[.65,0],[.3,.1],[0,.3],[.15,.45],[.75,.6],[1,.8],[.7,1],[.3,1],[0,.9]]];
const two=TWO.map(s=>normalize([s])),five=FIVE.map(s=>normalize([s]));
function recognize(input,width=1,height=1){const pts=input.filter(s=>s.length>1).flat().map(p=>[p[0]*width,p[1]*height]);if(!pts.length)return -1;const minx=Math.min(...pts.map(p=>p[0])),miny=Math.min(...pts.map(p=>p[1])),span=Math.max(...pts.map(p=>p[0]-minx),...pts.map(p=>p[1]-miny));if(span<(width===1&&height===1?.008:5))return -1;const strokes=input.filter(s=>s.length>1).map(s=>s.map(p=>[(p[0]*width-minx)/span,(p[1]*height-miny)/span])).filter(s=>length(s)>.06).map(s=>simplify(s));if(!strokes.length||strokes.length>3)return -1;
 if(strokes.length===1&&line(strokes[0])){const s=strokes[0],a=s[0],b=s.at(-1);return Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1])*.28?0:-1;}
 if(strokes.length===2&&strokes.every(line)){const[a,b]=strokes;if(intersects(a,b)&&parallel(a,b)<.78)return 50;if(parallel(a,b)>.88){const sep=Math.abs(cross(a[0],a.at(-1),b[0]))/dist(a[0],a.at(-1));if(sep>.035&&sep<Math.max(length(a),length(b))*.8)return 2;}return -1;}
 if(strokes.length===2)for(let i=0;i<2;i++)if(loop(strokes[i])&&line(strokes[1-i])&&strokes[i].slice(1).some((p,j)=>intersects([strokes[i][j],p],strokes[1-i]))&&circleScore(strokes[i])<.13)return 0;
 const points=normalize(strokes);if(!points)return -1;let zero=100,t=100,f=100;if(strokes.length===1&&loop(strokes[0]))zero=circleScore(strokes[0]);for(const sh of [-.2,0,.2]){const tilted=points.map(p=>[p[0]+sh*p[1],p[1]]);for(const s of two)t=Math.min(t,score(tilted,s));for(const s of five)f=Math.min(f,score(tilted,s));}if(zero<.13&&zero<Math.min(t,f)*.82)return 0;if(t<.115&&t<f*.78)return 2;if(f<.115&&f<t*.78)return 50;return -1;
}
const api={recognize,templates:{TWO,FIVE}};if(typeof module==='object'&&module.exports)module.exports=api;else root.TrapsRecognizer=api;
})(globalThis);
