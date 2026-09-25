'use strict';
/* =========================================================================
   systems/save.js — guardado, carga y migración de partidas (§48).
   Una partida vieja no se tira: se actualiza. migrateSave lleva cualquier
   save desde la v6 hasta SAVE_VERSION paso a paso, conservando todo lo
   vivido (memoria, journal, NPCs, dinero, vía, Sequence) y completando lo
   nuevo con valores razonables. Lo único que NO se puede recuperar es una
   decisión que quedó pendiente en la versión anterior: sus opciones eran
   funciones y se perdían al guardar (el bug original). Se descarta con una
   nota en el journal.
   ========================================================================= */
function saveGame(silent){
  if(!STATE || !STATE.started) return false;
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
    if(!silent) toast('Partida guardada.', 'pos');
    return true;
  }catch(e){
    if(!silent) toast('No se pudo guardar la partida.', 'neg');
    return false;
  }
}
function loadGame(){
  let raw = null;
  try{ raw = localStorage.getItem(SAVE_KEY); }catch(e){ return false; }
  if(!raw) return false;
  try{
    const data = migrateSave(JSON.parse(raw));
    if(!data) return false;
    STATE = data;
    invalidatePathwayMods();
    return true;
  }catch(e){ console.error('No se pudo cargar la partida', e); return false; }
}
function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
function deleteSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  STATE = freshState();
}
function exportSave(){
  try{
    const blob = new Blob([JSON.stringify(STATE, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const c = STATE.character;
    a.href = url; a.download = `lotm_${(c.nombre||'vida').toLowerCase()}_${calendarYear()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('Partida exportada como archivo .json.', 'pos');
  }catch(e){ toast('No se pudo exportar la partida.', 'neg'); }
}
function importSave(file, onDone){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    let data;
    try{ data = JSON.parse(ev.target.result); }
    catch(e){ toast('El archivo no es un JSON válido.', 'neg'); return; }
    if(!data || typeof data !== 'object' || !data.character || !data.pathway || !data.time){ toast('El archivo no corresponde a una partida de este juego.', 'neg'); return; }
    const migrated = migrateSave(data);
    if(!migrated){ toast('La partida es de una versión que no se puede actualizar.', 'neg'); return; }
    STATE = migrated;
    invalidatePathwayMods();
    saveGame(true);
    toast('Partida importada.', 'pos');
    if(onDone) onDone();
  };
  reader.readAsText(file);
}

/* ------------------------------ migraciones ------------------------------ */
function migrateSave(data){
  if(!data || typeof data !== 'object') return null;
  const v = data.version || 0;
  if(v > SAVE_VERSION) return null;   // de una versión futura: no sabemos leerla
  if(v < 6) return null;              // demasiado vieja para reconstruirla con garantías
  if(v < 7){
    if(data.character && !Array.isArray(data.character.memory)) data.character.memory = [];
    if(!Array.isArray(data.pendingConsequences)) data.pendingConsequences = [];
    data.version = 7;
  }
  if(data.version < 8) migrateV7toV8(data);
  // Red de seguridad (cualquier versión): campos que se agregan con el tiempo.
  fillMissing(data, freshState());
  data.version = SAVE_VERSION;
  return data;
}
// Completa claves faltantes (sin pisar lo existente) a partir de un estado nuevo.
function fillMissing(target, base){
  for(const k in base){
    if(target[k] === undefined){ target[k] = base[k]; continue; }
    const b = base[k], t = target[k];
    if(b && typeof b === 'object' && !Array.isArray(b) && t && typeof t === 'object' && !Array.isArray(t)) fillMissing(t, b);
  }
}
function migrateV7toV8(data){
  const prev = STATE;
  const legacyWorld = data.world || {};
  const fresh = freshState();
  // Las funciones de sistemas leen STATE: se trabaja sobre la partida vieja.
  STATE = data;
  try{
    const c = data.character;
    data.settings = {difficulty:'normal', world:'libre', showNumbers:false};
    data.nextId = data.nextId || 1;
    data.time.startYear = data.time.startYear || 1330;
    // ---- personaje ----
    c.birthCity = c.birthCity || c.ciudad;
    if(!JOBS[c.profesion]) c.profesion = c.edad >= 6 && c.edad < 18 ? 'Estudiante' : 'Desempleado';
    if(EDUCATION_RANK[c.educacion] === undefined) c.educacion = c.edad >= 18 ? 'Secundaria completa' : c.edad >= 13 ? 'Secundaria (en curso)' : c.edad >= 6 ? 'Primaria (en curso)' : 'Sin escolarizar';
    Object.assign(c, Object.assign({}, fresh.character, c));
    c.stats = Object.assign({}, fresh.character.stats, c.stats||{});
    c.job = Object.assign({}, fresh.character.job, c.job||{});
    if(c.luck === undefined) c.luck = 50;
    c.memory = (c.memory||[]).map(m=>Object.assign({cat: LEGACY_MEMORY_CAT[m.tag] || 'event', npc:null, faction:null, age: Math.max(0,(m.year||1)-1)}, m));
    data.flags = Object.assign({}, fresh.flags, data.flags||{});
    data.flags.startClass = data.flags.startClass || c.clase;
    // ---- tiempo por temporadas ----
    data.season = fresh.season;
    data.seasonActions = Object.assign({}, fresh.seasonActions, data.seasonActions||{});
    // ---- mundo y ciudades ----
    const w = fresh.world;
    w.attention = legacyWorld.attention || 0;
    w.log = (legacyWorld.log||[]).map(e=>Object.assign({cy:(data.time.startYear + (e.year||1) - 1)}, e));
    Object.assign(w.factionMood, legacyWorld.factionMood||{});
    data.world = w;
    const ck = cityKeyByName(c.ciudad);
    if(data.world.cities[ck]){ data.world.cities[ck].prosperity = legacyWorld.prosperity ?? data.world.cities[ck].prosperity; data.world.cities[ck].security = legacyWorld.security ?? data.world.cities[ck].security; }
    buildTimeline();
    // Lo que en la línea temporal ya pasó antes del momento actual no se "revive".
    (data.world.timeline||[]).forEach(e=>{ if(e.date.y < calendarYear() || (e.date.y===calendarYear() && e.date.m <= data.time.month)) { e.triggered = true; e.hooked = true; } });
    // ---- facciones ----
    const oldF = data.factions || {};
    const nf = buildFactionsState();
    for(const k in oldF){ if(nf[k]) Object.assign(nf[k], {publicRep:oldF[k].publicRep||0, secretRep:oldF[k].secretRep||0, known:!!(oldF[k].known || nf[k].known), discovered:!!(oldF[k].discovered || nf[k].discovered)}); }
    if(nf.church.publicRep > 5){ nf.church.access = 1; nf.church.trust = Math.min(40, nf.church.publicRep); }
    data.factions = nf;
    data.tarot = Object.assign({}, fresh.tarot);
    if(nf.tarotClub.secretRep >= 30){ data.tarot.stage = 4; data.tarot.observed = 45; }
    else if(nf.tarotClub.discovered || (data.flags.tarotHint||0) > 0){ data.tarot.stage = 3; data.tarot.observed = 15; }
    // ---- NPCs ----
    (data.npcs||[]).forEach(n=>{ ensureNpc(n); if(n.alive === false) n.lifeState = 'muerto'; });
    // ---- vía: conocimiento, pistas, identificación ----
    const p = data.pathway;
    const oldRumors = p.rumors || [];
    Object.keys(PATHWAYS).forEach(k=>{
      if(!p.knowledge || p.knowledge[k] === undefined) (p.knowledge = p.knowledge||{})[k] = 0;
      if(!p.formulaKnown || p.formulaKnown[k] === undefined) (p.formulaKnown = p.formulaKnown||{})[k] = false;
      if(!p.firstDiscoveryShown || p.firstDiscoveryShown[k] === undefined) (p.firstDiscoveryShown = p.firstDiscoveryShown||{})[k] = false;
    });
    p.belief = Object.assign({}, p.knowledge);
    p.identified = {}; Object.keys(PATHWAYS).forEach(k=>{ p.identified[k] = !!(p.firstDiscoveryShown[k] || p.chosenPathway===k); });
    p.clues = [];
    Object.keys(PATHWAYS).forEach(k=>{
      if(p.knowledge[k] > 0 && p.chosenPathway !== k){
        p.clues.push({id:uid('cl'), truth:k, shown:k, desc:pick(PATHWAYS[k].vague||[PATHWAYS[k].theme]), reliability:'real', strength:p.knowledge[k], source:'lo que viviste antes', cy:calendarYear(), age:c.edad, resolved:'real'});
      }
    });
    oldRumors.forEach(r=>{
      if(!r || !PATHWAYS[r.key]) return;
      p.clues.push({id:uid('cl'), truth: r.correct ? r.key : null, shown:r.key, desc: r.text || pick(PATHWAYS[r.key].vague||['algo']), reliability: r.correct ? 'real' : 'false', strength:3, source:'un rumor', cy:(data.time.startYear + (r.year||1) - 1), age:Math.max(0,(r.year||1)-1), resolved:null});
    });
    p.rumors = [];
    p.actingMethod = p.chosenPathway ? 2 : 0; p.actingMethodProgress = 0;
    p.acting = fresh.pathway.acting;
    p.potionMonth = null;
    data.leads = []; data.hiddenTruths = data.hiddenTruths || [];
    // ---- conocimiento (secretos → lore) ----
    data.lore = fresh.lore;
    const loose = [];
    (c.secrets||[]).forEach(s=>{
      const id = Object.keys(LORE).find(x=>LORE[x].text === s.text);
      if(id){ if(!data.lore[LORE[id].cat].includes(id)) data.lore[LORE[id].cat].push(id); }
      else loose.push(s);
    });
    c.secrets = loose;
    if(p.chosenPathway && !data.lore.fact.includes('beyonders_exist')) data.lore.fact.push('beyonders_exist', 'potions_named', 'sequences');
    // ---- inventario unificado ----
    const inv = data.inventory || {};
    data.inventory = {items:[], books:[], documents:[], formulas:[], artifacts:[], combatItems:[]};
    const byName = (name)=>Object.keys(ITEM_DEFS).find(id=>ITEM_DEFS[id].name===name);
    (inv.books||[]).forEach(b=>{ const id = byName(b.name); if(id) addItem(id, b.qty||1, 'antes'); else addItem({cat:'book', name:b.name, desc:b.meta||'', provenance:'antes'}, b.qty||1); });
    (inv.documents||[]).forEach(b=>{ const id = byName(b.name); if(id) addItem(id, b.qty||1, 'antes'); else addItem({cat:'document', name:b.name, desc:b.meta||'', provenance:'antes'}, b.qty||1); });
    (inv.combatItems||[]).forEach(b=>{ const id = byName(b.name); if(id) addItem(id, b.qty||1, 'antes'); else addItem({cat:'misc', name:b.name, desc:b.meta||'', provenance:'antes'}, b.qty||1); });
    (inv.artifacts||[]).forEach(a=>{ const k = artifactKeyByName(a.name); for(let i=0;i<(a.qty||1);i++){ if(k) addArtifact(k, 'antes'); } });
    (inv.formulas||[]).forEach(f=>{ addItem({cat:'formula', name:f.name, desc:f.meta||'', provenance:'antes', fidelity:'true', verified:true}, f.qty||1); });
    Object.keys(PATHWAYS).forEach(k=>{ if(p.formulaKnown[k] && !hasFormula(k, 9)) addItem({cat:'formula', pathway:k, seq:9, fidelity:'true', verified:true, name:formulaName(k,9), rarity:'raro', desc:'La receta de una poción.', uses:'Preparar la poción.', risk:'Viene de una fuente confiable.', provenance:'antes'}, 1); });
    if(p.chosenPathway && p.sequence !== null){
      if(!hasFormula(p.chosenPathway, p.sequence)) addItem({cat:'formula', pathway:p.chosenPathway, seq:p.sequence, fidelity:'true', verified:true, name:formulaName(p.chosenPathway,p.sequence), rarity:'raro', desc:'La receta de la poción que ya bebiste.', uses:'Ya la usaste.', risk:'Ninguno.', provenance:'antes'}, 1);
      data.flags.beyonderSince = data.flags.beyonderSince ?? Math.max(0, data.time.totalMonths - 24);
    }
    const owned = p.ingredientsOwned || {};
    Object.keys(owned).forEach(key=>{
      const [pk, name] = key.split('::'); const qty = owned[key];
      if(!PATHWAYS[pk] || !qty) return;
      let seq = 9; const tbl = PATHWAY_INGREDIENTS[pk] || {};
      for(const s in tbl){ if((tbl[s]||[]).includes(name)){ seq = +s; break; } }
      for(let i=0;i<qty;i++) addIngredient(pk, seq, name, rndInt(55,80), 'antes');
    });
    p.ingredientsOwned = {};
    // ---- journal ----
    const catByTitle = (t)=>/POCIÓN|ADVANCEMENT|Beyonder|vía|Sequence/i.test(t) ? 'pathway' : /Boda|nacimiento|hijo|Hija|familia/i.test(t) ? 'family' : /pérdida|muere|fallece/i.test(t) ? 'death' : /Combate|pelea/i.test(t) ? 'combat' : /Iglesia|Nighthawks|Tarot/i.test(t) ? 'faction' : /misterio|extraño|secreto|Artefacto/i.test(t) ? 'mystery' : 'life';
    data.journal = (data.journal||[]).map(e=>Object.assign({cy:(data.time.startYear + (e.year||1) - 1), age:Math.max(0,(e.year||1)-1), cat:catByTitle(e.title||''), imp: /PRIMERA|ADVANCEMENT|Boda|nacimiento|pérdida|FIN/i.test(e.title||'') ? 3 : 1}, e));
    data.milestones = (data.milestones||[]).map(m=>Object.assign({cy:(data.time.startYear + (m.year||1) - 1)}, m));
    // ---- lo pendiente ----
    data.pendingConsequences = (data.pendingConsequences||[]).map(pc=>Object.assign({id:uid('pc'), eventId:null, cond:null, ctx:null}, pc, {effect: pc.effect && typeof pc.effect === 'object' ? pc.effect : null}));
    if(data.pendingEvent || data.pendingMission){
      data.pendingEvent = null; data.pendingMission = null;
      logJournal('Una decisión que quedó atrás', 'Había algo por decidir cuando la historia se interrumpió. El momento pasó. La vida siguió.', {cat:'life'});
    }
    if(data.combat){
      const old = data.combat; data.combat = null;
      const key = Object.keys(ENEMIES).find(k=>ENEMIES[k].name === (old.enemy && old.enemy.name));
      if(key){ startCombat(key, {source:'migración'}); if(STATE.combat && old.enemy.hp) STATE.combat.enemy.hp = Math.min(STATE.combat.enemy.maxHp, old.enemy.hp); }
    }
    data.missions = data.missions || {completedIds:[]};
    data.ritual = null; data.brew = null;
    data.anchors = fresh.anchors;
    data.divinity = fresh.divinity;
    data.lastResolution = null; data.lastSeasonSummary = null; data.lastYearSummary = null;
    data.eventHistory = data.eventHistory || {};
    if(data.gameOver && data.endingData && !data.endingData.paragraphs){ data.endingData.paragraphs = [data.endingData.text||'']; data.endingData.stages = []; data.endingData.neverKnew = []; }
    recomputeAnchors();
    if(p.chosenPathway && p.sequence <= 5) data.anchors.revealed = true;
    seasonStart();
    data.version = 8;
  } finally {
    STATE = prev;
  }
}
