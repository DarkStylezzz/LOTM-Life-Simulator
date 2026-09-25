'use strict';
/* =========================================================================
   ui/people.js — "Personas" (§9, §10, §11, §12).
   La lista agrupa a la gente como la vive el personaje (familia, cercanos,
   conocidos, contactos del mundo oculto, tensiones, los que se fueron). La
   ficha de cada persona muestra lo que SABÉS de ella —no todo lo que es— y
   lo que podés hacer: cada interacción cuesta tiempo y puede abrir puertas
   distintas según quién sea.
   ========================================================================= */
function renderPeople(){
  const sel = UI.npcSel ? npcById(UI.npcSel) : null;
  if(sel) return npcDetail(sel);
  const c = STATE.character;
  const all = STATE.npcs.filter(n=>n.met || isFamilyNpc(n));
  const used = new Set();
  const take = (f)=>all.filter(n=>!used.has(n.id) && f(n)).map(n=>{ used.add(n.id); return n; });
  const groups = [
    ['Familia', take(n=>n.alive && isFamilyNpc(n) && n.lifeState !== 'desaparecido')],
    ['Cerca tuyo', take(n=>n.alive && n.lifeState==='presente' && bondScore(n) >= 45)],
    ['Del otro lado del velo', take(n=>n.alive && n.lifeState==='presente' && ((n.known.pathway && n.hidden.pathway) || n.flags.mysticContact))],
    ['Tensiones', take(n=>n.alive && n.lifeState==='presente' && (n.fear >= 50 || n.suspicion >= 50 || n.flags.rival))],
    ['Conocidos', take(n=>n.alive && n.lifeState==='presente')],
    ['Lejos, o perdidos', take(n=>n.alive && n.lifeState !== 'presente')],
    ['Los que ya no están', take(n=>!n.alive)]
  ].filter(([,l])=>l.length);
  const out = [];
  if(isDivine()) out.push(`<p class="intro-text">Los mirás desde muy lejos. Envejecen. Algunos todavía te nombran.</p>`);
  else out.push(familyActions());
  groups.forEach(([title, list])=>{
    out.push(sec(title, `${list.length}`));
    out.push(`<div class="npc-list">${list.map(npcRow).join('')}</div>`);
  });
  if(!groups.length) out.push(emptyState('Todavía no conocés a nadie. Ya va a pasar.'));
  return out.join('');
}
function npcRow(n){
  const age = n.alive ? npcAgeText(n) : (n.deathYear ? `murió en ${n.deathYear}` : 'murió');
  const hidden = npcHiddenLine(n);
  const tags = n.alive ? relationTags(n).slice(0,3).map(t=>tag(t)).join('') : '';
  return `<button class="npc-row ${n.alive?'':'dead'}" data-act="npc-open" data-id="${attr(n.id)}">
    <span class="npc-top"><span class="npc-name">${esc(n.name)}</span><span class="npc-age">${esc(age)}</span></span>
    <span class="npc-sub">${esc(n.role||'')}${n.profession && n.alive && n.profession !== '—' ? ' · ' + esc(n.profession) : ''}${n.lifeState==='lejos' ? ' · lejos' : n.lifeState==='desaparecido' ? ' · desaparecido' : ''}</span>
    ${n.alive ? `<span class="npc-rel">${esc(cap(relWord(n)))}</span>` : ''}
    ${hidden ? `<span class="npc-hidden">${hidden}</span>` : ''}${tags ? `<span class="npc-tags">${tags}</span>` : ''}
  </button>`;
}
onAct('npc-open', (d)=>{ UI.npcSel = d.id; renderNow(); window.scrollTo(0,0); const h = byId('npc-title'); if(h) h.focus(); }, {free:true});
onAct('npc-back', ()=>{ UI.npcSel = null; renderNow(); }, {free:true});

function familyActions(){
  const c = STATE.character;
  if(c.edad < 18) return '';
  const partner = currentPartnerNpc();
  const acts = [];
  if(!partner) acts.push(actionButton({label:'Buscar pareja', small:'Salir, conocer gente, arriesgarse.', time:1, disabled:!canSpendFreeTime(1), why:'Sin tiempo libre.'}, 'fam', {k:'pareja'}));
  if(partner && c.estadoCivil !== 'Casado/a') acts.push(actionButton({label:`Proponerle matrimonio a ${partner.name}`, small:`Una boda cuesta alrededor de ${fmtMoney(weddingCost())}.`}, 'fam', {k:'boda'}));
  if(c.estadoCivil === 'Casado/a' && c.edad <= 50) acts.push(actionButton({label:'Buscar un hijo', small:'Una vida nueva cambia todas las demás.', time:1, disabled:!canSpendFreeTime(1), why:'Sin tiempo libre.'}, 'fam', {k:'hijo'}));
  return acts.length ? `<div class="action-grid compact">${acts.join('')}</div>` : '';
}
onAct('fam', (d)=>{
  if(d.k === 'pareja') buscarPareja();
  else if(d.k === 'boda') proponerMatrimonio();
  else if(d.k === 'hijo') intentarTenerHijo();
});

function npcDetail(n){
  const out = [];
  out.push(`<button class="btn btn-ghost back" data-act="npc-back">← Personas</button>`);
  const cityName = n.location && CITIES_DATA[n.location] ? CITIES_DATA[n.location].name : '';
  out.push(`<article class="card npc-card"><h2 class="card-h" id="npc-title" tabindex="-1">${esc(n.name)}</h2>
    <p class="npc-sub">${esc(n.role||'')} · ${n.alive ? esc(npcAgeText(n)) : 'murió' + (n.deathYear ? ' en ' + n.deathYear : '') + (n.cause ? ` (${esc(n.cause)})` : '')}${n.profession && n.profession !== '—' ? ' · ' + esc(n.profession) : ''}${cityName ? ' · ' + esc(cityName) : ''}</p>
    ${n.alive ? `<p class="npc-rel big">${esc(cap(relWord(n)))}.</p>` : ''}
    ${npcKnownBlock(n)}
    ${STATE.settings.showNumbers && n.alive ? relNumbers(n) : ''}
  </article>`);
  // Lo que sabés de su vida
  const hist = (n.history||[]).slice(0,6);
  const mems = memoriesWithNpc(n.id).slice(-6).reverse();
  if(hist.length || mems.length){
    out.push(sec('Lo que pasó'));
    out.push(`<ul class="timeline-list">${mems.map(m=>`<li><span class="dim">${esc(fmtDate({cy:(STATE.time.startYear||1330)+(m.year||1)-1, age:m.age}))}</span> ${esc(m.text)}</li>`).join('')}${hist.map(h=>`<li><span class="dim">${h.cy}</span> ${esc(h.text)}</li>`).join('')}</ul>`);
  }
  if(n.alive && !isDivine()){
    const ints = availableInteractions(n);
    out.push(sec('Qué hacer'));
    out.push(ints.length ? `<div class="action-grid">${ints.map(it=>{
      const tooYoung = STATE.character.edad < 13 && !isFamilyNpc(n) && it.id !== 'time';
      const noTime = it.time && !canSpendFreeTime(it.time);
      const noCash = it.cost && STATE.character.cash < it.cost;
      return actionButton({label:it.label, small:it.desc, time:it.time, disabled: tooYoung || noTime || noCash, why: tooYoung ? 'Sos muy chico.' : noTime ? 'Sin tiempo libre.' : noCash ? 'No te alcanza.' : ''}, 'npc-do', {id:n.id, k:it.id});
    }).join('')}</div>` : emptyState(n.lifeState==='presente' ? 'Ahora mismo no hay mucho que hacer.' : 'Está lejos. Por ahora, sólo podés esperar noticias.'));
  }
  return out.join('');
}
function npcKnownBlock(n){
  const bits = [];
  const known = (n.interactions||0) >= 2 || bondScore(n) >= 30 || isFamilyNpc(n);
  if(known && (n.personality||[]).length){ const p = n.personality.map(k=>NPC_PERSONALITIES[k]).filter(Boolean); if(p.length) bits.push(`<li>${tierMark('estimated')} Es ${esc(listEs(p.map(x=>x.label)))}. ${esc(p[0].desc)}</li>`); }
  else bits.push(`<li>${tierMark('unknown')} Todavía no sabés bien cómo es.</li>`);
  if(n.known.goals) bits.push(`<li>${tierMark('objective')} Quiere ${esc(listEs((n.goals||[]).map(g=>NPC_GOALS[g.id||g] ? NPC_GOALS[g.id||g].label : g)))}.</li>`);
  if(n.known.fears) bits.push(`<li>${tierMark('objective')} Le tiene miedo a ${esc(listEs(n.fears||[]))}.</li>`);
  const hidden = npcHiddenLine(n);
  if(hidden) bits.push(`<li>${hidden}</li>`);
  (n.secrets||[]).filter(s=>s.known).forEach(s=>bits.push(`<li>${tierMark('objective')} ${esc(s.text)}</li>`));
  if(n.knows && n.knows.beyonder) bits.push(`<li>${tierMark('objective')} Sabe lo que sos.</li>`);
  if(STATE.anchors.revealed && STATE.anchors.people.includes(n.id)) bits.push(`<li>⚓ Es una de tus anclas.</li>`);
  return `<ul class="known-list">${bits.join('')}</ul>`;
}
function relNumbers(n){
  return `<div class="rel-grid">${RELATION_DIMS.map(k=>`<div class="rel-dim"><span>${esc(RELATION_LABEL[k])}</span><div class="bar"><div style="width:${n[k]||0}%"></div></div><b>${Math.round(n[k]||0)}</b></div>`).join('')}</div>`;
}
onAct('npc-do', (d)=>{ doInteraction(d.id, d.k); });
