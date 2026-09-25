'use strict';
/* =========================================================================
   ui/shell.js — la estructura de la pantalla (§38).
   Escritorio: barra lateral + panel principal + panel contextual.
   Móvil: navegación inferior, tarjetas y botones grandes.
   renderNow() dibuja todo; ui/dom.js lo agenda una vez por cuadro.
   ========================================================================= */
const TABS = [
  {id:'vida', label:'Vida', divineLabel:'Trono', ic:'☀'},
  {id:'personas', label:'Personas', divineLabel:'Los que recuerdan', ic:'☍'},
  {id:'misticismo', label:'Misticismo', ic:'✦', visible:()=>mysticTabVisible()},
  {id:'mundo', label:'Mundo', ic:'⚜'},
  {id:'inventario', label:'Inventario', ic:'⚱'},
  {id:'diario', label:'Diario', ic:'✎'}
];
function mysticTabVisible(){
  const p = STATE.pathway;
  return !!p.chosenPathway || Object.values(p.belief||{}).some(v=>v >= 8) || loreCount() >= 1 || (STATE.flags.mysticExposure||0) >= 12 || STATE.tarot.stage >= 1 || activeLeads().length > 0 || itemsByCat('artifact').length > 0;
}
function visibleTabs(){ return TABS.filter(t=>!t.visible || t.visible()); }
function tabLabel(t){ return isDivine() && t.divineLabel ? t.divineLabel : t.label; }
function tabBadge(id){
  if(id === 'misticismo'){
    const p = STATE.pathway;
    if(p.chosenPathway && p.sequence > 0 && advancementRequirements().every(r=>r.ok)) return '!';
    if(activeLeads().some(l=>l.rumor==='ingredient')) return '•';
  }
  if(id === 'mundo' && missionOffers().some(m=>m.type==='Duty')) return '•';
  return '';
}
function goTab(id){
  if(!visibleTabs().some(t=>t.id===id)) id = 'vida';
  UI.tab = id; saveUiPrefs();
  renderNow();
  window.scrollTo(0, 0);
  const m = byId('main'); if(m) m.focus({preventScroll:true});
}
onAct('tab', (d)=>goTab(d.id), {free:true});

/* ------------------------------ render principal ------------------------------ */
function sceneKey(){
  if(STATE.combat) return 'combat';
  if(STATE.pendingEvent) return 'ev:' + (STATE.pendingEvent.defId || STATE.pendingEvent.kind) + ':' + (STATE.pendingEvent.step ?? '') + ':' + STATE.time.totalMonths;
  if(STATE.pendingMission) return 'ms:' + STATE.pendingMission.missionId;
  return null;
}
function renderNow(){
  if(!STATE || !STATE.started){ return; }
  if(STATE.gameOver){ if(byId('screen-end').classList.contains('hidden')) showScreen('end'); renderEnd(); return; }
  if(byId('screen-game').classList.contains('hidden')){ ['intro','end'].forEach(s=>byId('screen-'+s).classList.add('hidden')); byId('screen-game').classList.remove('hidden'); document.body.dataset.screen = 'game'; }
  document.body.classList.toggle('divine', isDivine());
  // Una escena nueva (evento, misión, combate) se lleva el foco (§39).
  const sk = sceneKey();
  const newScene = sk && sk !== UI.lastEventKey;
  UI.lastEventKey = sk;
  if(newScene && UI.tab !== 'vida'){ UI.tab = 'vida'; }
  if(!visibleTabs().some(t=>t.id===UI.tab)) UI.tab = 'vida';
  renderNav();
  renderTopbar();
  renderContextPanel();
  const content = byId('content');
  content.classList.toggle('scene-open', !!sk);
  const html = renderTab(UI.tab);
  const changed = setHTML(content, html);
  if(changed){
    if(newScene){ const h = byId('scene-title'); if(h){ h.focus({preventScroll:true}); const top = h.getBoundingClientRect().top + window.scrollY - 90; if(top < window.scrollY || top > window.scrollY + window.innerHeight*0.6) window.scrollTo({top:Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth'}); } }
    else restoreFocus();
  }
  showNextSeal();
}
function prefersReducedMotion(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
function restoreFocus(){
  const key = UI.lastFocusKey; if(!key) return;
  const [act, id, idx, k] = key.split('|');
  const cands = $$(`[data-act="${act}"]`);
  const el = cands.find(e=>(e.dataset.id||'')===id && (e.dataset.idx||'')===idx && (e.dataset.k||'')===k);
  if(el && !el.disabled && document.activeElement !== el){ try{ el.focus({preventScroll:true}); }catch(e){} }
}
function renderTab(id){
  switch(id){
    case 'personas': return renderPeople();
    case 'misticismo': return renderMystic();
    case 'mundo': return renderWorld();
    case 'inventario': return renderInventory();
    case 'diario': return renderJournal();
    default: return renderDashboard();
  }
}

/* ------------------------------ navegación ------------------------------ */
function renderNav(){
  const tabs = visibleTabs();
  const items = (mode)=>tabs.map((t,i)=>{ const b = tabBadge(t.id); const cur = t.id === UI.tab;
    return `<button class="${mode}-btn ${cur?'active':''}" data-act="tab" data-id="${t.id}" ${cur?'aria-current="page"':''} title="${attr(tabLabel(t))} (${i+1})"><span class="ic" aria-hidden="true">${t.ic}</span><span class="tl">${esc(tabLabel(t))}</span>${b ? `<span class="nav-badge" aria-label="novedad">${esc(b)}</span>` : ''}</button>`; }).join('');
  const c = STATE.character;
  setHTML(byId('sidebar'), `<div class="side-brand"><div class="side-title">Lord of the Mysteries</div><div class="side-sub">${esc(c.nombre)} ${esc(c.apellido)}</div></div>
    <div class="side-nav">${items('side')}</div>
    <div class="side-foot">${btn('Opciones','open-settings',{},{cls:'btn-ghost'})}${btn('Atajos','open-help',{},{cls:'btn-ghost'})}</div>`);
  setHTML(byId('tabbar'), items('tab') + `<button class="tab-btn" data-act="open-settings" title="Opciones"><span class="ic" aria-hidden="true">⚙</span><span class="tl">Opciones</span></button>`);
}
function renderTopbar(){
  const c = STATE.character, p = STATE.pathway;
  const sal = statView('salud');
  const chips = [`<span class="stat-chip" title="Salud">${tierMark('objective')} <b>♥ ${c.salud}</b></span>`, `<span class="stat-chip" title="Dinero en mano">${esc(fmtMoney(c.cash))}</span>`];
  if(p.chosenPathway || (STATE.flags.mysticExposure||0) >= 10){
    const s = statView('sanity');
    chips.push(`<span class="stat-chip ${c.sanity < 35 ? 'warn' : ''}" title="Cordura">${tierMark(s.tier)} ${s.tier==='objective' ? '<b>✧ '+s.value+'</b>' : esc(shortPhrase('sanity', c.sanity))}</span>`);
  }
  const ft = freeTimeLeft();
  chips.push(`<span class="stat-chip" title="Tiempo libre que te queda esta temporada">⧗ ${ft}/${STATE.season.free||0}</span>`);
  const place = isDivine() ? 'Más allá de la niebla' : c.ciudad;
  setHTML(byId('topbar'), `<div class="topbar-row1"><div class="tb-name">${esc(c.nombre)} ${esc(c.apellido)} <span class="tb-age">· ${ageText(c.edad)}</span></div>
      <div class="tb-meta">${esc(dateLabel())} · ${esc(place)}</div></div>
    <div class="tb-stats">${chips.join('')}${p.chosenPathway ? `<span class="tb-pathway-badge">${esc(PATHWAYS[p.chosenPathway].name)} · Seq ${p.sequence}</span>` : ''}</div>`);
}
function shortPhrase(stat, v){ return {sanity: v>=80?'Lúcido':v>=60?'Inquieto':v>=40?'Tenso':v>=20?'Quebrándose':'Al borde'}[stat] || ''; }

/* ------------------------------ panel contextual ------------------------------ */
function renderContextPanel(){
  const el = byId('context-panel'); if(!el) return;
  setHTML(el, contextPanelHTML());
}
function contextPanelHTML(){
  const p = STATE.pathway, out = [];
  out.push(seasonCard());
  if(p.chosenPathway && !isDivine()){
    const r = currentRole();
    out.push(`<div class="ctx-card"><div class="ctx-title">Tu papel</div>${actingMethodLevel() >= 1 && r ? `<div class="ctx-strong">${esc(r.role)}</div><p class="ctx-text">${esc(r.principle)}</p>` : `<p class="ctx-text">${esc(seqData(p.chosenPathway, p.sequence).name)}. Todavía no entendés del todo qué te pide esta poción.</p>`}
      <p class="ctx-text dim">${esc(statView('digestion').text)}</p></div>`);
  }
  const leads = activeLeads();
  if(leads.length) out.push(`<div class="ctx-card"><div class="ctx-title">Pistas abiertas</div><ul class="ctx-list">${leads.slice(0,4).map(l=>`<li>${esc(l.text)}${l.progress ? ` <span class="dim">(${l.progress}/${l.steps})</span>` : ''}</li>`).join('')}</ul></div>`);
  if(p.chosenPathway || (STATE.flags.mysticExposure||0) >= 20){
    const a = statView('attention');
    out.push(`<div class="ctx-card"><div class="ctx-title">El mundo oculto</div><p class="ctx-text">${tierMark(a.tier)} ${esc(a.text)}</p>${huntingFactions().length ? `<p class="ctx-text warn">${esc(cap(factionShort(huntingFactions()[0])))} te busca.</p>` : ''}</div>`);
  }
  const ms = (STATE.milestones||[]).slice(-3).reverse();
  if(ms.length) out.push(`<div class="ctx-card"><div class="ctx-title">Hitos recientes</div><ul class="ctx-list">${ms.map(m=>`<li><span class="dim">${m.edad} a.</span> ${esc(m.text)}</li>`).join('')}</ul></div>`);
  return out.join('');
}
function seasonCard(){
  const s = STATE.season;
  const left = freeTimeLeft();
  const dots = Array.from({length:s.free||0}, (_,i)=>`<span class="ft-dot ${i < (s.used||0) ? 'used' : ''}" aria-hidden="true"></span>`).join('');
  return `<div class="ctx-card season-card"><div class="ctx-title">${esc(seasonName())} de ${calendarYear()}</div>
    <div class="ft-row" aria-label="Tiempo libre: te quedan ${left} de ${s.free||0}">${dots}<span class="ft-txt">${left ? `${left} de tiempo libre` : 'Sin tiempo libre'}</span></div>
    <p class="ctx-text dim">${esc(freeTimeReason())}</p></div>`;
}
function freeTimeReason(){
  const c = STATE.character;
  if(c.edad < 13) return 'Sos chico: casi todo tu tiempo es de otros.';
  const j = jobDef();
  const bits = [];
  if(j && j.salary > 0) bits.push(`Trabajás como ${c.profesion.toLowerCase()}.`);
  if(spouseNpc()) bits.push('Tenés pareja.');
  const kids = childrenNpcs().filter(k=>k.alive && npcAge(k) < 12).length;
  if(kids) bits.push(kids === 1 ? 'Un hijo chico.' : `${kids} hijos chicos.`);
  if(!bits.length) bits.push('Nadie te reclama el tiempo.');
  return bits.join(' ');
}

/* ------------------------------ opciones ------------------------------ */
onAct('open-settings', ()=>{
  const s = STATE.settings;
  openModal({title:'Opciones', html:`
    <label class="check-row"><input type="checkbox" data-change="toggle-numbers" ${s.showNumbers?'checked':''}> Mostrar números exactos</label>
    <p class="small-note">El juego muestra lo que tu personaje sabe: datos objetivos (●), estimaciones (◐) y lo desconocido (○). Esta opción muestra todo con números.</p>
    <div class="rule"></div>
    <p class="small-note">Dificultad: <b>${esc(DIFFICULTIES[s.difficulty].label)}</b> · Historia: <b>${esc(WORLD_MODES[s.world].label)}</b></p>
    <div class="btn-row">${btn('Exportar partida','export-save')}<label class="btn file-btn">Importar partida<input type="file" accept="application/json,.json" data-change="import-save" class="sr-only"></label></div>
    <div class="btn-row">${btn('Nueva vida','new-life-confirm',{},{cls:'btn-danger'})}</div>`,
    actions:[{label:'Cerrar', act:'modal-close', primary:true}]});
}, {free:true});
onAct('toggle-numbers', (d, el)=>{ STATE.settings.showNumbers = !!el.checked; saveGame(true); scheduleRender(); }, {free:true});
onAct('export-save', ()=>exportSave(), {free:true});
onAct('import-save', (d, el)=>{ const f = el.files && el.files[0]; if(f) importSave(f, ()=>{ closeModal(); UI.lastEventKey = null; showScreen(STATE.gameOver ? 'end' : 'game'); renderNow(); }); }, {free:true});
onAct('new-life-confirm', ()=>{ closeModal(); confirmModal('Esta vida se va a perder para siempre. ¿Empezar otra?', ()=>{ deleteSave(); newLifeFlow(); }, {yes:'Empezar otra vida', danger:true}); }, {free:true});
function showHelp(){
  openModal({title:'Atajos de teclado', html:`<ul class="help-list">
    <li><kbd>1</kbd>–<kbd>6</kbd> Cambiar de sección (o elegir una opción, si hay una escena abierta)</li>
    <li><kbd>M</kbd> Avanzar un mes</li><li><kbd>T</kbd> Terminar la temporada</li><li><kbd>I</kbd> Avanzar hasta algo importante</li>
    <li><kbd>Esc</kbd> Cerrar ventanas</li><li><kbd>?</kbd> Esta ayuda</li></ul>`});
}
onAct('open-help', ()=>showHelp(), {free:true});
