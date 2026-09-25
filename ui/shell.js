'use strict';
/* =========================================================================
   ui/shell.js — la estructura de la pantalla (§38).
   Escritorio: barra lateral + panel principal + panel contextual.
   Móvil: navegación inferior, tarjetas y botones grandes.
   renderNow() dibuja todo; ui/dom.js lo agenda una vez por cuadro.
   ========================================================================= */
const TABS = [
  {id:'vida', label:'Vida', divineLabel:'Trono', ic:'☀'},
  {id:'personas', label:'Personas', short:'Gente', divineLabel:'Los que recuerdan', divineShort:'Ellos', ic:'☍'},
  {id:'misticismo', label:'Misticismo', short:'Místico', ic:'✦', visible:()=>mysticTabVisible()},
  {id:'mundo', label:'Mundo', ic:'⚜'},
  {id:'inventario', label:'Inventario', short:'Objetos', ic:'⚱'},
  {id:'diario', label:'Diario', ic:'✎'}
];
function mysticTabVisible(){
  const p = STATE.pathway;
  return !!p.chosenPathway || Object.values(p.belief||{}).some(v=>v >= 8) || loreCount() >= 1 || (STATE.flags.mysticExposure||0) >= 12 || STATE.tarot.stage >= 1 || activeLeads().length > 0 || itemsByCat('artifact').length > 0;
}
function visibleTabs(){ return TABS.filter(t=>!t.visible || t.visible()); }
function tabLabel(t, short){
  if(isDivine() && t.divineLabel) return short && t.divineShort ? t.divineShort : t.divineLabel;
  return short && t.short ? t.short : t.label;
}
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
  const sceneClosed = !sk && UI.hadScene;
  UI.hadScene = !!sk;
  if(changed){
    if(sceneClosed){ const r = byId('resolution-title'); if(r && document.activeElement && (document.activeElement === document.body || !document.body.contains(document.activeElement))) r.focus({preventScroll:true}); }
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
  // La primera vez que lo oculto roza la vida, aparece una sección nueva.
  if(!STATE.flags.mysticTabSeen && tabs.some(t=>t.id==='misticismo')){ STATE.flags.mysticTabSeen = true; toast('Algo no encaja. Hay una sección nueva en tu vida: Misticismo.'); }
  const items = (mode)=>tabs.map((t,i)=>{ const b = tabBadge(t.id); const cur = t.id === UI.tab;
    return `<button class="${mode}-btn ${cur?'active':''}" data-act="tab" data-id="${t.id}" ${cur?'aria-current="page"':''} title="${attr(tabLabel(t))} (${i+1})" aria-label="${attr(tabLabel(t))}"><span class="ic" aria-hidden="true">${t.ic}</span><span class="tl" aria-hidden="true">${esc(tabLabel(t, mode==='tab'))}</span>${b ? `<span class="nav-badge">${esc(b)}</span>` : ''}</button>`; }).join('');
  const c = STATE.character;
  setHTML(byId('sidebar'), `<div class="side-brand"><div class="side-title">Lord of the Mysteries</div><div class="side-sub">${esc(c.nombre)} ${esc(c.apellido)}</div></div>
    <div class="side-nav">${items('side')}</div>
    <div class="side-foot">${btn('Opciones','open-settings',{},{cls:'btn-ghost'})}${btn('Atajos','open-help',{},{cls:'btn-ghost'})}</div>`);
  setHTML(byId('tabbar'), items('tab') + `<button class="tab-btn" data-act="open-settings" title="Opciones" aria-label="Opciones"><span class="ic" aria-hidden="true">⚙</span><span class="tl" aria-hidden="true">Más</span></button>`);
}
function renderTopbar(){
  const c = STATE.character, p = STATE.pathway;
  const chips = isDivine()
    ? [`<span class="stat-chip" title="Humanidad">${tierMark(statView('humanity').tier)} ${esc(statView('humanity').tier === 'objective' ? 'Humanidad '+c.humanity : phraseFor('humanity', c.humanity??0))}</span>`]
    : [`<span class="stat-chip" title="Salud">${tierMark('objective')} <b>♥ ${c.salud}</b></span>`, `<span class="stat-chip" title="Dinero en mano">${esc(fmtMoney(c.cash))}</span>`];
  if(!isDivine() && (p.chosenPathway || (STATE.flags.mysticExposure||0) >= 10)){
    const s = statView('sanity');
    chips.push(`<span class="stat-chip ${c.sanity < 35 ? 'warn' : ''}" title="Cordura">${tierMark(s.tier)} ${s.tier==='objective' ? '<b>✧ '+s.value+'</b>' : esc(shortPhrase('sanity', c.sanity))}</span>`);
  }
  const ft = freeTimeLeft();
  chips.push(`<span class="stat-chip" title="Tiempo libre que te queda esta temporada">⧗ ${ft}/${STATE.season.free||0}</span>`);
  const place = isDivine() ? 'Más allá de la niebla' : c.ciudad;
  requestAnimationFrame(()=>{ const tb = byId('topbar'); if(tb && tb.offsetHeight) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px'); });
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
    <fieldset class="opt-group compact"><legend>Dificultad</legend>${Object.entries(DIFFICULTIES).map(([k,d])=>`<label class="opt-card ${s.difficulty===k?'sel':''}"><input type="radio" name="s-diff" value="${k}" ${s.difficulty===k?'checked':''} data-change="set-difficulty"><span class="opt-title">${esc(d.label)}</span><span class="opt-desc">${esc(d.desc)}</span></label>`).join('')}</fieldset>
    <p class="small-note" id="s-diff-note">${esc(difficultyNote())}</p>
    <p class="small-note">Historia del mundo: <b>${esc(WORLD_MODES[s.world].label)}</b> (se elige al nacer).</p>
    <p class="small-note">La partida se guarda sola después de cada acción, en este navegador.</p>
    <div class="btn-row">${btn('Guardar ahora','save-now')}${btn('Exportar partida','export-save')}<label class="btn file-btn">Importar partida<input type="file" accept="application/json,.json" data-change="import-save" class="sr-only"></label></div>
    <p class="small-note">Exportá la partida para guardarla fuera del navegador o llevarla a otro dispositivo. Importar reemplaza la actual.</p>
    <div class="btn-row">${btn('Borrar esta vida y empezar otra','new-life-confirm',{},{cls:'btn-danger'})}</div>`,
    actions:[{label:'Cerrar', act:'modal-close', primary:true}]});
}, {free:true});
onAct('toggle-numbers', (d, el)=>{ STATE.settings.showNumbers = !!el.checked; saveGame(true); scheduleRender(); }, {free:true});
function difficultyNote(){
  let t = 'Se puede cambiar en cualquier momento. Lo que ya pasó, pasó.';
  if(diffAdd('secondChances')){
    const n = secondChancesLeft();
    t += n ? ` Te ${n===1?'queda':'quedan'} ${n} segunda${n===1?'':'s'} oportunidad${n===1?'':'es'}.` : ' Ya no te quedan segundas oportunidades.';
  }
  return t;
}
onAct('set-difficulty', (d, el)=>{
  if(!DIFFICULTIES[el.value] || el.value === STATE.settings.difficulty) return;
  STATE.settings.difficulty = el.value;
  invalidatePathwayMods();
  saveGame(true);
  const box = el.closest('fieldset');
  if(box) $$('.opt-card', box).forEach(card=>{ const i = $('input', card); card.classList.toggle('sel', !!(i && i.checked)); });
  const note = byId('s-diff-note'); if(note) note.textContent = difficultyNote();
  scheduleRender();
}, {free:true});
onAct('export-save', ()=>exportSave(), {free:true});
onAct('save-now', ()=>saveGame(false), {free:true});
onAct('import-save', (d, el)=>{ const f = el.files && el.files[0]; if(f) importSave(f, ()=>{ closeModal(); UI.lastEventKey = null; showScreen(STATE.gameOver ? 'end' : 'game'); renderNow(); }); }, {free:true});
onAct('new-life-confirm', ()=>{ closeModal(); confirmModal('Esta vida se va a perder para siempre. ¿Empezar otra?', ()=>{ deleteSave(); newLifeFlow(); }, {yes:'Empezar otra vida', danger:true}); }, {free:true});
function showHelp(){
  openModal({title:'Atajos de teclado', html:`<ul class="help-list">
    <li><kbd>1</kbd>–<kbd>6</kbd> Cambiar de sección (o elegir una opción, si hay una escena abierta)</li>
    <li><kbd>M</kbd> Avanzar un mes</li><li><kbd>T</kbd> Terminar la temporada</li><li><kbd>I</kbd> Avanzar hasta algo importante</li>
    <li><kbd>Esc</kbd> Cerrar ventanas</li><li><kbd>?</kbd> Esta ayuda</li></ul>`});
}
onAct('open-help', ()=>showHelp(), {free:true});
