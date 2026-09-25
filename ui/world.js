'use strict';
/* =========================================================================
   ui/world.js — "Mundo" (§27, §29, §30, §31).
   La ciudad (viva: prospera, se vuelve insegura), las organizaciones (lo que
   sabés de ellas, lo que podés pedirles y lo que te van a pedir), los
   encargos de la temporada, los lugares para explorar y la historia que el
   personaje vio pasar.
   ========================================================================= */
function worldSections(){
  const items = [{id:'ciudad', label:'Ciudad'}, {id:'facciones', label:'Organizaciones'}];
  if(STATE.character.edad >= 14 && !isDivine()) items.push({id:'encargos', label:'Encargos', badge: missionOffers().some(m=>m.type==='Duty') ? '•' : ''});
  if(STATE.character.edad >= 13 && !isDivine()) items.push({id:'explorar', label:'Explorar'});
  items.push({id:'historia', label:'Historia'});
  return items;
}
function renderWorld(){
  const items = worldSections();
  const cur = currentSub('world', items);
  const body = cur === 'facciones' ? worldFactions() : cur === 'encargos' ? worldMissions() : cur === 'explorar' ? worldExplore() : cur === 'historia' ? worldHistory() : worldCity();
  return subnav('world', items) + `<div class="sub-body">${body}</div>`;
}

/* ------------------------------ ciudad ------------------------------ */
function cityWord(v, kind){
  if(kind === 'prosperity') return v >= 70 ? 'Próspera' : v >= 50 ? 'Tranquila' : v >= 30 ? 'En crisis' : 'Hundida';
  return v >= 70 ? 'Segura' : v >= 50 ? 'Más o menos segura' : v >= 30 ? 'Insegura' : 'Peligrosa';
}
function worldCity(){
  const k = currentCityKey(), city = currentCity(), cs = currentCityState();
  const news = (STATE.world.log||[]).filter(e=>!e.city || e.city === k).slice(0,6);
  const out = [];
  out.push(`<section class="card"><h2 class="card-h">${esc(city.name)}</h2><p class="card-text">${esc(city.desc)}</p>
    <dl class="kv"><dt>Economía</dt><dd>${esc(cityWord(cs.prosperity,'prosperity'))}${STATE.settings.showNumbers ? ` (${Math.round(cs.prosperity)})` : ''}</dd><dt>Calles</dt><dd>${esc(cityWord(cs.security,'security'))}${STATE.settings.showNumbers ? ` (${Math.round(cs.security)})` : ''}</dd>${STATE.world.war ? '<dt>Guerra</dt><dd class="warn">El país está en guerra.</dd>' : ''}</dl></section>`);
  out.push(sec('Lo que se comenta'));
  out.push(news.length ? `<ul class="news">${news.map(e=>`<li><span class="dim">${e.cy||e.year}</span> ${esc(e.text)}</li>`).join('')}</ul>` : emptyState('Nada fuera de lo común. Por ahora.'));
  if(STATE.character.edad >= 18 && !isDivine()){
    out.push(sec('Mudarse'));
    out.push(`<div class="action-grid">${CITY_KEYS.filter(x=>x!==k).map(x=>{ const cd = CITIES_DATA[x]; const cost = Math.round(120*cd.cost*priceIndex());
      return actionButton({label:cd.name, small:`${cd.desc.split('.')[0]}. Mudarse cuesta ~${fmtMoney(cost)} y casi toda una temporada.`, disabled: STATE.character.cash < cost, why:'No te alcanza.'}, 'move', {k:x}); }).join('')}</div>`);
  }
  if(STATE.character.edad >= 16 && !isDivine()){
    out.push(sec('Comprar'));
    const shop = ['weapon_knife','weapon_cane','weapon_revolver','tool_alchemy'].map(id=>{ const d = ITEM_DEFS[id]; const cost = Math.round(d.price*priceIndex()); const owned = hasItem(id);
      return actionButton({label:`${d.name} — ${fmtMoney(cost)}`, small:d.uses, disabled: owned || STATE.character.cash < cost, why: owned ? 'Ya tenés uno.' : 'No te alcanza.'}, 'buy', {id}); });
    out.push(`<div class="action-grid">${shop.join('')}</div>`);
  }
  return out.join('');
}
onAct('move', (d)=>confirmModal(`¿Mudarte a ${CITIES_DATA[d.k].name}? La gente que no venga con vos va a quedar lejos.`, ()=>moveToCity(d.k), {yes:'Mudarme'}));
onAct('buy', (d)=>buyWeapon(d.id));

/* ------------------------------ organizaciones ------------------------------ */
function repWord(v){ return v >= 50 ? 'muy bien vista' : v >= 20 ? 'bien vista' : v > -20 ? 'neutral' : v > -50 ? 'mal vista' : 'odiada'; }
function suspWord(v){ return v >= 70 ? 'Están seguros de algo sobre vos.' : v >= 45 ? 'Sospechan de vos.' : v >= 20 ? 'Te tienen anotado.' : ''; }
function worldFactions(){
  const known = FACTION_KEYS.filter(k=>F(k).known && k !== 'tarotClub');
  const out = [];
  if(!known.length) return emptyState('Conocés a las iglesias como las conoce todo el mundo: de lejos.');
  known.forEach(k=>{
    const f = F(k), d = FACTIONS_DATA[k];
    const member = isMember(k);
    const hunted = f.hunted;
    const lines = [];
    lines.push(`<dt>Vínculo</dt><dd>${esc(FACTION_ACCESS_LABEL[f.access] || '')}${member ? ` · ${esc(d.ranks[f.rank]||'')}` : ''} · ${esc(FACTION_REL_LABEL[f.relationship]||f.relationship)}</dd>`);
    if(f.access >= 1) lines.push(`<dt>Cómo te ven</dt><dd>${tierMark('estimated')} ${esc(repWord(f.publicRep + f.trust/2))}</dd>`);
    const sw = suspWord(f.suspicion);
    if(sw && (STATE.pathway.chosenPathway || f.access >= 1)) lines.push(`<dt>Sospecha</dt><dd class="warn">${tierMark('estimated')} ${esc(sw)}</dd>`);
    if(member) lines.push(`<dt>Mérito</dt><dd>${STATE.settings.showNumbers ? f.merit : f.merit >= 20 ? 'Te deben favores.' : f.merit >= 8 ? 'Algo hiciste por ellos.' : 'Todavía no hiciste mucho.'}</dd>`);
    const acts = [];
    if(!isDivine()){
      if(canCollaborate(k)) acts.push(actionButton({label:'Colaborar', small:'Hacer algo por ellos. Así se gana confianza.', time:1, disabled:!canSpendFreeTime(1), why:'Sin tiempo libre.'}, 'fac-collab', {k}));
      if(!member && f.access >= 1 && !factionHostile(k)){
        const jc = joinConditions(k);
        acts.push(actionButton({label:`Unirte a ${d.short}`, small: jc.filter(r=>!r.ok).map(r=>r.label).join(' · ') || 'Te aceptarían.', time:1, disabled:!canJoin(k) || !canSpendFreeTime(1)}, 'fac-join', {k}));
      }
      if(f.access >= 2 && !factionHostile(k)) Object.keys(FACTION_REQUESTS).forEach(w=>{ const r = FACTION_REQUESTS[w]; if(f.access < r.minAccess - 1) return; const av = factionRequestAvailable(k, w);
        acts.push(actionButton({label:r.label, small:r.desc, time:1, disabled:!av.ok || !canSpendFreeTime(1), why: av.ok ? 'Sin tiempo libre.' : av.why}, 'fac-req', {k, id:w})); });
      if(member) acts.push(actionButton({label:'Dejarlos', small:'Nadie te detiene. Todos te miran salir.', danger:true}, 'fac-leave', {k}));
    }
    const lore = f.access >= 1 && !isDivine() ? tradeableLore().filter(id=>!LORE[id].faction || LORE[id].faction !== k) : [];
    out.push(`<section class="card faction ${hunted?'hunted':''}"><div class="fac-head"><h3 class="card-h">${esc(d.name)}</h3>${hunted ? tag('Te persigue','crimson') : member ? tag('Miembro','gold') : ''}</div>
      <p class="card-text">${esc(f.access >= 2 || d.publicFace ? d.desc : d.publicFace ? d.desc : 'Sabés que existe. Poco más.')}</p>
      <dl class="kv">${lines.join('')}</dl>
      ${acts.length ? `<div class="action-grid">${acts.join('')}</div>` : ''}
      ${lore.length ? `<details class="sell-lore"><summary>Venderles algo que sabés</summary><div class="btn-row">${lore.slice(0,8).map(id=>btn(LORE[id].title,'fac-sell',{k, id})).join('')}</div><p class="small-note">Se paga bien. Y otros se enteran de que lo vendiste.</p></details>` : ''}
      ${member && !isDivine() ? `<details class="betray"><summary>Traicionarlos</summary><div class="btn-row">${FACTION_KEYS.filter(x=>x!==k && x!=='tarotClub' && F(x).known).map(x=>btn(`Venderle sus secretos a ${factionShort(x)}`,'fac-betray',{k, id:x},{cls:'btn-danger'})).join('')}</div></details>` : ''}
    </section>`);
  });
  return out.join('');
}
onAct('fac-collab', (d)=>factionCollaborate(d.k));
onAct('fac-join', (d)=>confirmModal(`¿Unirte a ${factionName(d.k)}? Una pertenencia abre puertas y cierra otras.`, ()=>joinFaction(d.k), {yes:'Unirme'}));
onAct('fac-req', (d)=>factionRequest(d.k, d.id));
onAct('fac-leave', (d)=>confirmModal(`¿Dejar ${factionName(d.k)}?`, ()=>leaveFaction(d.k), {yes:'Irme', danger:true}));
onAct('fac-sell', (d)=>confirmModal(`¿Venderle "${LORE[d.id].title}" a ${factionShort(d.k)}?`, ()=>sellLoreTo(d.k, d.id), {yes:'Vender'}));
onAct('fac-betray', (d)=>confirmModal(`Traicionar a ${factionName(d.k)} no tiene vuelta atrás.`, ()=>betrayFaction(d.k, d.id), {yes:'Traicionarlos', danger:true}));

/* ------------------------------ encargos ------------------------------ */
function worldMissions(){
  const offers = missionOffers();
  const left = actionsLeft('missions');
  const out = [`<p class="intro-text">Lo que te ofrecen esta temporada. ${left > 0 ? 'Podés tomar uno.' : 'Ya tomaste uno esta temporada.'}</p>`];
  if(!offers.length) return out.join('') + emptyState('Nadie te ofrece nada esta temporada.');
  out.push(`<div class="action-grid">${offers.map(m=>actionButton({label:m.title, small:`${MISSION_TYPE_LABEL[m.type]||m.type} · Riesgo: ${m.risk}`, time:1, disabled: left <= 0 || !canSpendFreeTime(1) || STATE.character.edad < 14, why: left <= 0 ? 'Ya tomaste un encargo.' : STATE.character.edad < 14 ? 'Sos muy chico.' : 'Sin tiempo libre.', danger: /Extrema/.test(m.risk)}, 'mission', {id:m.id})).join('')}</div>`);
  out.push(`<p class="small-note">Encargos cumplidos en tu vida: ${STATE.character.stats.missions||0}.</p>`);
  return out.join('');
}
onAct('mission', (d)=>acceptMission(d.id));

/* ------------------------------ explorar ------------------------------ */
function worldExplore(){
  const locs = explorationLocations();
  const left = actionsLeft('explore');
  return `<p class="intro-text">Salir a buscar. Ingredientes, pistas, objetos... y lo que te encuentre primero.</p>
    <div class="action-grid">${locs.map(l=>{ const av = explorationAvailable(l); const cost = Math.round((l.cost||0)*priceIndex());
      return actionButton({label:l.name, small:`${l.desc} Peligro: ${l.danger}${cost ? ` · ${fmtMoney(cost)}` : ''}`, time:l.time||1, disabled:!av.ok, why:av.why, danger:l.danger==='Extrema'}, 'explore', {id:l.id}); }).join('')}</div>
    <p class="small-note">${left > 0 ? `Podés explorar ${left} vez${left===1?'':'es'} más esta temporada.` : 'Ya exploraste bastante esta temporada.'}</p>`;
}
onAct('explore', (d)=>exploreLocation(d.id));

/* ------------------------------ historia ------------------------------ */
function worldHistory(){
  const tl = (STATE.world.timeline||[]).filter(e=>e.triggered).map(e=>({e, d:timelineDef(e)})).filter(x=>x.d);
  const out = [];
  out.push(`<p class="intro-text">${esc(WORLD_MODES[STATE.settings.world].label)}. ${STATE.settings.world === 'alternate' ? 'Lo que hagas puede torcer la historia.' : STATE.settings.world === 'canon' ? 'La historia sigue su curso, hagas lo que hagas.' : 'Una historia que nadie escribió de antemano.'}</p>`);
  out.push(sec('Lo que viste pasar'));
  out.push(tl.length ? `<ol class="history">${tl.reverse().map(({e,d})=>`<li class="${e.altered?'altered':''}"><span class="dim">${e.date.y}</span> <b>${esc(d.title)}</b>${e.altered ? ' '+tag('alterado','gold') : ''}${e.witnessed ? ' '+tag('estuviste ahí') : ''}<br><span class="small-note">${esc((e.consequences||[])[0] || '')}</span></li>`).join('')}</ol>` : emptyState('Todavía no pasó nada que vaya a figurar en los libros.'));
  const log = (STATE.world.log||[]).slice(0,12);
  if(log.length){ out.push(sec('Titulares')); out.push(`<ul class="news">${log.map(e=>`<li><span class="dim">${e.cy||e.year}</span> ${esc(e.text)}</li>`).join('')}</ul>`); }
  return out.join('');
}
