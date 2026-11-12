/* Judge messages use the existing session heartbeat; no phone-to-phone channel. */
'use strict';
(function(){
 const states={'-1':'Envoyé · réception non confirmée',0:'Reçu',1:'Mis en attente',2:'Lu · action à valider',3:'Effacé · action réalisée'};
 let dialog=null,timer=null,busy=false;
 const outside=d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 $('show-messages').onclick=async()=>{
  if(dialog)return;const race=sessionState?.active?.id;if(!race)return;
  const d=el('dialog',undefined,'messages-dialog');dialog=d;d.append(el('h2','✉ Messages aux juges'),el('p','Les états sont confirmés par le téléphone. « Effacé » signifie que le juge a cliqué sur le pouce après avoir réalisé l’action.'));
  const form=el('form'),whoLabel=el('label','Juges destinataires'),who=el('select'),textLabel=el('label','Message'),text=el('textarea'),send=el('button','✉ Envoyer'),status=el('p',undefined,'messages-feedback'),list=el('div',undefined,'messages-history');text.maxLength=2000;text.rows=4;text.placeholder='Consigne destinée au téléphone ou à tous les téléphones actifs';text.required=true;who.required=true;send.type='submit';whoLabel.append(who);textLabel.append(text);form.append(whoLabel,textLabel,send,status);d.append(form,el('h3','Suivi de la course active'),list);
  const close=el('button','Fermer','zoom-close');close.onclick=()=>d.close();d.append(close);document.body.append(d);outside(d);d.onclose=()=>{clearTimeout(timer);d.remove();dialog=null;};d.showModal();
  let targets=[],requestId=null,requestSignature='';
  async function load(){
   if(!d.open||busy)return;
   try{const response=await fetch('/api/messages',{cache:'no-store'});if(!response.ok)throw Error('Suivi des messages indisponible');const data=await response.json();if(!d.open)return;
    if(data.race!==race){send.disabled=true;status.textContent='La course a changé : fermez puis rouvrez les messages.';return;}
    const previous=who.value;targets=data.targets||[];const signature=JSON.stringify(targets.map(t=>[t.device,t.deviceName,t.judge,t.post,t.supported]));
    if(who.dataset.signature!==signature){who.replaceChildren();const placeholder=el('option','Choisir le destinataire');placeholder.value='';who.append(placeholder);const all=el('option','Tous les juges');all.value='*';all.disabled=!targets.length||targets.some(t=>!t.supported);who.append(all);targets.forEach((t,i)=>{const o=el('option',t.judge+(t.post?' · Poste '+t.post:'')+' · '+(t.deviceName||t.device.slice(0,8))+(t.supported?'':' · mise à jour requise'));o.value=t.device+'|'+t.judge;o.disabled=!t.supported;who.append(o);});who.value=previous;who.dataset.signature=signature;}
    send.disabled=!!window.jaOffline||!targets.some(t=>t.supported);
    const expanded=new Set([...list.querySelectorAll('details[open]')].map(n=>n.dataset.id));const x=list.scrollTop;list.replaceChildren();for(const item of data.items||[]){const card=el('article',undefined,'message-card message-stage-'+item.stage);card.append(el('strong',item.judge+' · Poste '+(item.post||'—')),el('span',states[item.stage]||'État inconnu','message-state'),el('p',item.text),el('small','Envoyé le '+new Date(item.createdAt).toLocaleString('fr-FR')));const details=el('details'),summary=el('summary','Historique du message');details.dataset.id=item.id;details.open=expanded.has(item.id);details.append(summary);for(const h of item.history||[])details.append(el('p',new Date(h.at).toLocaleTimeString('fr-FR')+' · '+h.state));card.append(details);list.append(card);}if(!list.children.length)list.append(el('p','Aucun message envoyé pour cette course.'));list.scrollTop=x;
   }catch(e){if(d.open)status.textContent=e.message;}finally{if(d.open)timer=setTimeout(load,3000);}
  }
  form.onsubmit=async e=>{e.preventDefault();if(busy)return;const allActive=who.value==='*',target=targets.find(t=>t.device+'|'+t.judge===who.value);if((!allActive&&(!target||!target.supported))||allActive&&(!targets.length||targets.some(t=>!t.supported))||!text.value.trim()){status.textContent='Choisissez un destinataire et écrivez le message.';return;}if(allActive&&!confirm('Envoyer ce message à tous les '+new Set(targets.map(t=>t.device)).size+' téléphones actifs, chronométreurs compris ?'))return;busy=true;send.disabled=true;clearTimeout(timer);
   const signature=JSON.stringify([race,allActive?'*':target.device,allActive?'*':target.judge,text.value.trim()]);if(signature!==requestSignature){requestId=(crypto.randomUUID?crypto.randomUUID():([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));requestSignature=signature;}
   try{const result=await sessionCommand('message',{race,id:requestId,...(allActive?{allActive:true}:{device:target.device,judge:target.judge}),text:text.value.trim(),confirmation:'ENVOYER'});text.value='';requestId=null;requestSignature='';status.textContent=allActive?'Message envoyé à '+(result.count||'tous les')+' téléphones · confirmations suivies individuellement.':'Message envoyé · en attente de réception sur le téléphone.';}catch(error){status.textContent=error.message;}finally{busy=false;if(d.open)await load();}
  };
  await load();
 };
})();
