'use strict';
/* =========================================================================
   systems/memory.js — memoria del personaje, verdades ocultas,
   consecuencias retrasadas, journal e hitos (§7, §8, §35, §52).

   - remember(): deja una marca durable (un favor, una traición, un pacto,
     una pérdida, un lugar, una persona). Se guarda con categoría y con el
     id del NPC u organización involucrada, así un evento futuro puede
     preguntar "¿ayudaste antes a esta persona?" (memoryWithNpc).
   - addHiddenTruth(): lo que pasó de verdad y el jugador NO sabe. Se puede
     descubrir investigando, con habilidades o por consecuencias; lo que
     nunca se descubre aparece al final, en "Lo que nunca supo" (§52).
   - scheduleConsequence(): efectos (o eventos enteros) que llegan meses o
     años después. Son datos: sobreviven a guardar y recargar.
   ========================================================================= */
const MEMORY_CATS = {
  trauma:'Trauma', person:'Personas importantes', favor_given:'Favores que hiciste', favor_received:'Favores que recibiste',
  betrayal:'Traiciones', place:'Lugares', organization:'Organizaciones', loss:'Pérdidas', pact:'Pactos', secret:'Secretos',
  achievement:'Logros', choice:'Decisiones', event:'Momentos'
};
// Categoría por defecto para marcas de saves viejos (sin cat).
const LEGACY_MEMORY_CAT = {
  npc_se_fue:'person', npc_favor_recibido:'favor_received', npc_desconfia:'person', viudez:'loss', hijo_perdido:'loss',
  secreto_peligroso:'secret', stranger_followed:'choice', stranger_ignored:'choice', watched:'secret', lent_money:'favor_given',
  refused_loan:'choice', favor_repaid:'favor_received', favor_betrayed:'betrayal', bought_odd_book:'choice', book_wanted:'secret',
  left_odd_book:'choice', witnessed_incident:'secret', witnessed_silent:'secret', marked_by_talking:'secret',
  stranger_offer_taken:'organization', stranger_offer_refused:'choice', owes_favor:'pact', road_not_taken:'choice'
};

function remember(tag, text, opts){
  opts = opts || {};
  const mem = STATE.character.memory;
  mem.push({
    tag, text, cat: opts.cat || LEGACY_MEMORY_CAT[tag] || 'event',
    npc: opts.npc || null, faction: opts.faction || null,
    year: STATE.time.year, month: STATE.time.month, totalMonths: STATE.time.totalMonths, age: STATE.character.edad
  });
  if(mem.length > 260){
    // Se descartan primero las marcas menos significativas.
    const idx = mem.findIndex(m=>m.cat==='event' || m.cat==='choice');
    mem.splice(idx >= 0 ? idx : 0, 1);
  }
}
function hasMemory(tag, filter){
  return STATE.character.memory.some(m=>m.tag===tag && (!filter || !filter.npc || m.npc===filter.npc));
}
function countMemory(tag){ return STATE.character.memory.filter(m=>m.tag===tag).length; }
function memoriesOf(tag){ return STATE.character.memory.filter(m=>m.tag===tag); }
function memoriesByCat(cat){ return STATE.character.memory.filter(m=>(m.cat||LEGACY_MEMORY_CAT[m.tag]||'event')===cat); }
function memoryWithNpc(npcId, tag){ return STATE.character.memory.find(m=>m.npc===npcId && (!tag || m.tag===tag)) || null; }
function memoriesWithNpc(npcId){ return STATE.character.memory.filter(m=>m.npc===npcId); }

/* ------------------------- verdades ocultas ------------------------- */
function addHiddenTruth(text, opts){
  opts = opts || {};
  if(opts.key && STATE.hiddenTruths.some(h=>h.key===opts.key)) return;
  STATE.hiddenTruths.push({ id:uid('ht'), key:opts.key||null, npc:opts.npc||null, text, year:calendarYear(), age:STATE.character.edad, revealed:false });
}
// Revela una verdad oculta: es el momento "AH, era por aquello" (§52).
function revealHiddenTruth(keyOrId, how){
  const h = STATE.hiddenTruths.find(x=>!x.revealed && (x.key===keyOrId || x.id===keyOrId));
  if(!h) return null;
  h.revealed = true; h.revealedAge = STATE.character.edad; h.how = how || null;
  logJournal('Ahora lo entendés', h.text + (how ? ' ('+how+')' : ''), {cat:'mystery', imp:3});
  remember('truth_revealed', h.text, {cat:'secret'});
  return h;
}
function revealRandomHiddenTruth(how, filter){
  const pool = STATE.hiddenTruths.filter(h=>!h.revealed && (!filter || filter(h)));
  if(!pool.length) return null;
  return revealHiddenTruth(pick(pool).id, how);
}

/* --------------------- consecuencias retrasadas --------------------- */
// ctx del evento que agenda (p. ej. {npc}) se guarda como ids.
function scheduleConsequence(o){
  if(o.chance !== undefined && !chance(o.chance)) return null;
  const months = roll(o.inMonths ?? 12);
  const entry = {
    id: uid('pc'), dueMonth: STATE.time.totalMonths + Math.max(1, months),
    tag:o.tag||null, title:o.title||null, text:o.text||null,
    effect: (o.effect && typeof o.effect !== 'function') ? o.effect : null,
    memory:o.memory||null, eventId:o.eventId||null, cond:o.cond||null,
    ctx: o.ctx ? serializeCtx(o.ctx) : null
  };
  // Un efecto-función (código de data/) sólo vive en memoria: si se guarda
  // la partida antes de que venza, se pierde — por eso los datos nuevos usan
  // siempre efectos-objeto. Se conserva para compatibilidad.
  if(typeof o.effect === 'function') Object.defineProperty(entry, '_fn', {value:o.effect, enumerable:false});
  STATE.pendingConsequences.push(entry);
  return entry;
}
function consequenceCondOk(cond){
  if(!cond) return true;
  if(cond.npcAlive){ const n = npcById(cond.npcAlive); if(!n || !n.alive) return false; }
  if(cond.memory && !hasMemory(cond.memory)) return false;
  if(cond.notMemory && hasMemory(cond.notMemory)) return false;
  if(cond.flag && !STATE.flags[cond.flag]) return false;
  if(cond.beyonder !== undefined && (!!STATE.pathway.chosenPathway) !== cond.beyonder) return false;
  return true;
}
// Una vez por mes. Devuelve true si disparó algo (el avance rápido se frena).
function processPendingConsequences(){
  const list = STATE.pendingConsequences;
  if(!list || !list.length) return false;
  const due = list.filter(pc=>pc.dueMonth <= STATE.time.totalMonths);
  if(!due.length) return false;
  STATE.pendingConsequences = list.filter(pc=>pc.dueMonth > STATE.time.totalMonths);
  let fired = false;
  due.forEach(pc=>{
    if(!consequenceCondOk(pc.cond)) return;
    const ctx = pc.ctx ? rehydrateCtx(pc.ctx) : {};
    if(pc.eventId){
      // Una consecuencia puede ser un evento entero (con decisiones).
      if(STATE.pendingEvent || STATE.combat){ pc.dueMonth = STATE.time.totalMonths + 1; STATE.pendingConsequences.push(pc); return; }
      if(triggerEventById(pc.eventId, ctx)) fired = true;
      return;
    }
    const eff = pc._fn ? pc._fn() : pc.effect;
    if(eff) applyEffects(eff, ctx);
    if(pc.memory) remember(pc.memory.tag, pc.memory.text, {cat:pc.memory.cat, npc:pc.memory.npc, faction:pc.memory.faction});
    if(pc.title) logJournal(pc.title, pc.text||'', {cat:'consequence', imp:2});
    fired = true;
  });
  return fired;
}

/* ------------------------------ journal ------------------------------ */
// cat: life | family | relation | mystery | pathway | death | faction |
// achievement | world | combat | consequence | summary | loss
// imp: 0 rutina · 1 notable · 2 importante · 3 momento clave
const JOURNAL_CAT_BY_TYPE = {
  childhood:'life', mundane:'life', work:'life', social:'relation', family:'family', mystic:'mystery',
  decision:'life', pathway:'pathway', world:'world', faction:'faction', threat:'faction', tarot:'faction'
};
function logJournal(title, text, opts){
  opts = opts || {};
  const e = { year: STATE.time.year, month: STATE.time.month, cy: calendarYear(), age: STATE.character.edad,
    title, text, cat: opts.cat || 'life', imp: opts.imp || 0 };
  STATE.journal.unshift(e);
  if(STATE.season && STATE.season.log && e.cat!=='summary') STATE.season.log.push({t:title, imp:e.imp});
  if(STATE.journal.length > 600){
    // Se poda primero lo rutinario más viejo: los momentos importantes de la
    // infancia no deberían perderse en una vida larga.
    let idx = -1;
    for(let i=STATE.journal.length-1;i>=0;i--){ if((STATE.journal[i].imp||0)===0){ idx = i; break; } }
    STATE.journal.splice(idx >= 0 ? idx : STATE.journal.length-1, 1);
  }
  return e;
}
// Hitos para la línea de tiempo del epílogo.
// kind: birth | mystic | potion | advance | family | loss | end | achievement | faction | world
function addMilestone(kind, text){
  if(!Array.isArray(STATE.milestones)) STATE.milestones = [];
  STATE.milestones.push({kind, text, edad: STATE.character.edad, year: STATE.time.year, cy: calendarYear()});
  if(STATE.milestones.length > 120) STATE.milestones.splice(1, 1); // conserva siempre el nacimiento
}
