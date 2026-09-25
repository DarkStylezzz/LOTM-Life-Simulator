'use strict';
/* =========================================================================
   systems/events.js — motor de eventos data-driven (§6).
   Cada evento de data/events/*.js declara:
     id, type, rarity (common | uncommon | rare | mystic | extraordinary),
     tags, requirements (datos), hiddenRequirements (código que el jugador
     no ve), weight, cooldown (meses), repeatable, narrativeImportance
     (0 journal · 1 notable · 2 frena el avance rápido · 3 decisión que
     bloquea), context (elige a quién le pasa), title/text, consequences o
     run, choices, delayedConsequences.
   Un evento con decisiones queda PENDIENTE como datos: {defId, ctx con ids}.
   Al elegir, se busca la definición por id y se ejecuta la opción. Así un
   evento a medio resolver sobrevive a guardar y recargar (antes se perdían
   las funciones y la partida quedaba trabada).
   ========================================================================= */
const EVENTS_ALL = [].concat(
  EVENTS_CHILDHOOD, EVENTS_LIFE, EVENTS_MYSTIC, EVENTS_SOCIAL, EVENTS_FAMILY, EVENTS_DECISIONS, EVENTS_TAROT, EVENTS_DIVINITY
);
const EVENT_BY_ID = {};
EVENTS_ALL.forEach(e=>{
  if(EVENT_BY_ID[e.id]) console.warn('Evento duplicado:', e.id);
  EVENT_BY_ID[e.id] = e;
});

// Probabilidad de cada rareza cuando "pasa algo" en un mes cualquiera.
const RARITY_ROLL = [
  {r:'extraordinary', p:0.006},
  {r:'rare',          p:0.05},
  {r:'uncommon',      p:0.22},
  {r:'common',        p:1}
];
const RARITY_LABEL = {common:'Común', uncommon:'Poco común', rare:'Raro', mystic:'Místico', extraordinary:'Extraordinario'};

/* -------------------- contexto serializable -------------------- */
// Los NPCs del contexto se guardan como ids; al rehidratar, se buscan.
function serializeCtx(ctx){
  if(!ctx) return null;
  const out = {};
  for(const k in ctx){
    const v = ctx[k];
    if(v && typeof v === 'object' && v.id && v.name !== undefined && v.trust !== undefined) out[k] = {__npc:v.id};
    else if(k === 'secret' && v && v.id) out[k] = {__secret:v.id};
    else if(typeof v !== 'function') out[k] = v;
  }
  return out;
}
function rehydrateCtx(s){
  const ctx = {};
  if(!s) return ctx;
  for(const k in s){
    const v = s[k];
    if(v && typeof v === 'object' && v.__npc) ctx[k] = npcById(v.__npc);
    else ctx[k] = v;
  }
  if(s.secret && s.secret.__secret && ctx.npc){
    ctx.secret = (ctx.npc.secrets||[]).find(x=>x.id===s.secret.__secret) || null;
  }
  return ctx;
}

/* ---------------------------- requisitos ---------------------------- */
function requirementsOk(req){
  if(!req) return true;
  const c = STATE.character, p = STATE.pathway;
  if(req.ageMin !== undefined && c.edad < req.ageMin) return false;
  if(req.ageMax !== undefined && c.edad > req.ageMax) return false;
  if(req.beyonder !== undefined && (!!p.chosenPathway) !== req.beyonder) return false;
  if(req.seqMin !== undefined && (!p.chosenPathway || p.sequence < req.seqMin)) return false;
  if(req.seqMax !== undefined && (!p.chosenPathway || p.sequence > req.seqMax)) return false;
  if(req.employed && !isEmployed()) return false;
  if(req.single && (spouseNpc() || partnerNpc())) return false;
  if(req.noHouse && c.vivienda) return false;
  if(req.city && currentCityKey() !== req.city) return false;
  if(req.port && !currentCity().port) return false;
  if(req.minExposure !== undefined && (STATE.flags.mysticExposure||0) < req.minExposure) return false;
  if(req.memory && !req.memory.every(t=>hasMemory(t))) return false;
  if(req.notMemory && req.notMemory.some(t=>hasMemory(t))) return false;
  if(req.flags){ for(const f in req.flags){ if(!!STATE.flags[f] !== !!req.flags[f]) return false; } }
  return true;
}
function eventHistoryOf(id){ return STATE.eventHistory[id] || null; }
function markEventFired(id){
  const h = STATE.eventHistory[id] || {n:0, last:-9999};
  h.n++; h.last = STATE.time.totalMonths;
  STATE.eventHistory[id] = h;
}
// Devuelve el contexto si el evento puede pasar ahora, o null.
function eventEligible(def){
  if(def.chainOnly) return null;
  const h = eventHistoryOf(def.id);
  if(h){
    if(def.repeatable === false) return null;
    if(def.cooldown && STATE.time.totalMonths - h.last < def.cooldown) return null;
  }
  if(!requirementsOk(def.requirements)) return null;
  let ctx = {};
  try{
    if(def.hiddenRequirements && !def.hiddenRequirements(ctx)) return null;
    if(def.context){ ctx = def.context(ctx); if(!ctx) return null; }
  }catch(e){ console.warn('Evento con requisitos rotos:', def.id, e); return null; }
  return ctx;
}
function eventWeight(def, ctx){
  const w = typeof def.weight === 'function' ? def.weight(ctx) : (def.weight ?? 1);
  return Math.max(0, w || 0);
}

/* -------------------------- disparar eventos -------------------------- */
function resolveText(t, ctx){ return typeof t === 'function' ? t(ctx) : (t || ''); }

function fireEvent(def, ctx){
  ctx = ctx || {};
  markEventFired(def.id);
  if(def.choices && def.choices.length){
    const visible = def.choices.map((ch,i)=>({ch,i})).filter(({ch})=>{ try{ return !ch.requires || ch.requires(ctx); }catch(e){ return false; } });
    if(!visible.length) return false;
    STATE.pendingEvent = {
      kind:'event', defId:def.id, rarity:def.rarity, type:def.type,
      title: resolveText(def.title, ctx), text: resolveText(def.text, ctx),
      choices: visible.map(({ch,i},n)=>({idx:n, orig:i, label: fillCtxText(ch.label, ctx), small: fillCtxText(ch.small||'', ctx)})),
      ctx: serializeCtx(ctx)
    };
    STATE._importantMoment = true;
    return true;
  }
  let res = null;
  if(def.run){ res = def.run(ctx) || {}; }
  else {
    if(def.consequences) applyEffects(def.consequences, ctx);
    res = {title: resolveText(def.title, ctx), text: resolveText(def.text, ctx)};
  }
  if(STATE.gameOver) return true;
  if(res && res.title){
    const imp = def.narrativeImportance >= 2 ? 2 : (['rare','extraordinary'].includes(def.rarity) ? 2 : (def.rarity==='mystic' || def.type==='mystic' ? 1 : 0));
    logJournal(res.title, res.text, {cat: def.cat || JOURNAL_CAT_BY_TYPE[def.type] || 'life', imp});
    if(imp >= 2) STATE._importantMoment = true;
  }
  (def.delayedConsequences||[]).forEach(dc=>scheduleConsequence(Object.assign({ctx}, dc, {inMonths: dc.triggerInMonths ?? dc.inMonths})));
  return true;
}
function fillCtxText(s, ctx){
  if(!s) return s;
  return String(s).replace(/\{npc\}/g, ctx && ctx.npc ? ctx.npc.name : 'alguien');
}
// Disparo directo (consecuencias, línea temporal, IA de NPCs, reuniones).
function triggerEventById(id, ctx){
  const def = EVENT_BY_ID[id];
  if(!def) return false;
  if(def.choices && (STATE.pendingEvent || STATE.combat || STATE.pendingMission)) return false;
  ctx = ctx || {};
  if(def.context && !Object.keys(ctx).length){ ctx = def.context(ctx); if(!ctx) return false; }
  return fireEvent(def, ctx);
}

/* ----------------------- el evento de cada mes ----------------------- */
function pickEventFromPool(filter){
  const cands = [];
  for(const def of EVENTS_ALL){
    if(!filter(def)) continue;
    const ctx = eventEligible(def);
    if(!ctx) continue;
    const w = eventWeight(def, ctx);
    if(w > 0) cands.push({def, ctx, w});
  }
  const chosen = wpick(cands, x=>x.w);
  return chosen || null;
}
function rollRarity(){
  // La suerte mueve un poco las probabilidades; el Destino pesa en lo
  // extraordinario (§42). Ninguno garantiza nada.
  const fate = STATE.character.fate || 0;
  const r = Math.random();
  let acc = 0;
  for(const x of RARITY_ROLL){
    let p = x.p;
    if(x.r === 'extraordinary') p = p * (1 + clamp(fate,0,60)/60);
    acc = x.r==='common' ? 1 : acc + p;
    if(r < acc) return x.r;
  }
  return 'common';
}
// Devuelve true si pasó algo.
function rollMonthlyEvent(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return false;
  const c = STATE.character;
  if(c.edad < 13){
    if(!chance(0.5)) return false;
    let pick1 = null;
    if(chance(0.04)) pick1 = pickEventFromPool(d=>d.type==='childhood' && d.rarity==='rare');
    if(!pick1) pick1 = pickEventFromPool(d=>(d.type==='childhood') || (d.type==='family' && (d.tags||[]).includes('children') && false));
    if(!pick1) return false;
    return fireEvent(pick1.def, pick1.ctx);
  }
  // ¿Lo sobrenatural roza la vida este mes? (poco frecuente, §59)
  if(chance(mysticExposureChance())){
    const m = pickEventFromPool(d=>d.rarity==='mystic' || (d.type==='mystic' && d.rarity!=='extraordinary' && d.rarity!=='rare'));
    if(m) return fireEvent(m.def, m.ctx);
  }
  if(!chance(0.5)) return false;
  let rarity = rollRarity();
  const order = ['extraordinary','rare','uncommon','common'];
  for(let i = order.indexOf(rarity); i < order.length; i++){
    const rr = order[i];
    const p = pickEventFromPool(d=>d.rarity===rr && d.type!=='childhood');
    if(p) return fireEvent(p.def, p.ctx);
  }
  return false;
}

/* --------------------------- resolver decisiones --------------------------- */
function resolvePendingEvent(idx){
  const pe = STATE.pendingEvent;
  if(!pe) return;
  switch(pe.kind){
    case 'event':    return resolveEventChoice(idx);
    case 'acting':   return resolveActingChoice(idx);
    case 'ritual':   return resolveRitualChoice(idx);
    case 'brew':     return resolveBrewChoice(idx);
    case 'drink':    return resolveDrinkChoice(idx);
    case 'jobs':     return resolveJobOffer(idx);
    case 'combat_after': return resolveCombatAftermath(idx);
    case 'divinity': return resolveDivinityChoice(idx);
    case 'decision': case 'legacy':
      // Escena de una versión anterior sin datos para resolverla (ver migrateSave).
      STATE.pendingEvent = null; renderAll(); return;
  }
}
function resolveEventChoice(idx){
  const pe = STATE.pendingEvent;
  const def = EVENT_BY_ID[pe.defId];
  const vis = pe.choices[idx];
  STATE.pendingEvent = null;
  if(!def || !vis){ saveGame(true); renderAll(); return; }
  const choice = def.choices[vis.orig];
  const ctx = rehydrateCtx(pe.ctx);
  // Si el NPC del contexto murió o desapareció mientras la escena esperaba, no
  // se ejecuta sobre un fantasma.
  if(pe.ctx && pe.ctx.npc && (!ctx.npc)){ saveGame(true); renderAll(); return; }
  let resultText = '';
  let changes = [];
  const before = snapshotForChanges();
  try{
    if(choice.run) resultText = choice.run(ctx) || '';
    if(choice.effects) changes = changes.concat(applyEffects(choice.effects, ctx));
    if(choice.outcomes){
      const o = wpick(choice.outcomes, x=>typeof x.p==='function'?x.p(ctx):(x.p||x.w||1));
      if(o){ if(o.effects) changes = changes.concat(applyEffects(o.effects, ctx)); if(o.text) resultText = o.text; (o.delayed||[]).forEach(d=>scheduleConsequence(Object.assign({ctx}, d))); }
    }
    (choice.delayedConsequences||[]).forEach(d=>scheduleConsequence(Object.assign({ctx}, d, {inMonths: d.triggerInMonths ?? d.inMonths})));
  }catch(e){ console.error('Error resolviendo evento', pe.defId, e); }
  if(!changes.length) changes = diffForDisplay(before);
  const cat = def.cat || JOURNAL_CAT_BY_TYPE[def.type] || 'life';
  logJournal(pe.title, (vis.label + '. ' + (resultText||'')).trim(), {cat, imp: Math.max(2, def.narrativeImportance||0)});
  if(!STATE.gameOver && !STATE.combat && !STATE.pendingEvent) setResolution(pe.title, resultText || vis.label, changes);
  if(!STATE.gameOver) checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

/* ------------ cambios visibles a partir de una foto del estado ------------ */
function snapshotForChanges(){
  const c = STATE.character;
  return {salud:c.salud, sanity:c.sanity, corruption:c.corruption, spirituality:c.spirituality, reputation:c.reputation, cash:c.cash, digestion:STATE.pathway.digestion, clues:STATE.pathway.clues.length};
}
function diffForDisplay(before){
  const c = STATE.character, list = [];
  const now = {salud:c.salud, sanity:c.sanity, corruption:c.corruption, spirituality:c.spirituality, reputation:c.reputation, cash:c.cash, digestion:STATE.pathway.digestion};
  for(const k in now){ const d = Math.round((now[k] - before[k])*10)/10; if(d) pushChange(list, k, d); }
  if(STATE.pathway.clues.length > before.clues) list.push({msg:'Una pista nueva', type:'mystic'});
  return list;
}
// Tarjeta de "lo que acaba de pasar" en el panel principal (§39: el foco es
// el evento que está viviendo el personaje, no un toast que se escapa).
function setResolution(title, text, changes){
  STATE.lastResolution = {title, text, changes:(changes||[]).slice(0,6), month:STATE.time.totalMonths};
}
