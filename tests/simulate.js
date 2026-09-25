'use strict';
/* =========================================================================
   tests/simulate.js — vidas completas sin navegador.
   Carga los sistemas (sin la UI), crea personajes al azar y los hace vivir
   con un "jugador" que toma decisiones razonables (investiga, actúa,
   prepara pociones, se relaciona, explora, pelea, avanza). Reporta errores
   de ejecución, bloqueos, estado no serializable y estadísticas de balance.
   Uso:  node tests/simulate.js [vidas=40] [--ui] [--seed=N] [--verbose]
     --ui    carga también la interfaz (ui/*.js + main.js) con el DOM simulado
   ========================================================================= */
const path = require('path');
const { loadGame, run, scriptList } = require('./harness');

const args = process.argv.slice(2);
const LIVES = +(args.find(a=>/^\d+$/.test(a)) || 40);
const WITH_UI = args.includes('--ui');
const VERBOSE = args.includes('--verbose');
const seedArg = (args.find(a=>a.startsWith('--seed=')) || '').split('=')[1];

const STUBS = `
  var __toasts = 0;
  function renderAll(){}
  function toast(){ __toasts++; }
  function showScreen(){}
  function queueSeal(){}
  var creationData = null;
`;
function systemScripts(){ return scriptList().filter(s=>!s.startsWith('ui/') && s !== 'main.js'); }

// PRNG determinista opcional (para reproducir una vida).
const SEEDED = seedArg ? `
  (function(){ let s = ${+seedArg} >>> 0; Math.random = function(){ s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
` : '';

const ctx = WITH_UI ? loadGame({prelude:SEEDED}) : loadGame({scripts:systemScripts(), prelude:SEEDED + STUBS, boot:false});

// El "jugador": todo lo que hace está en el contexto del juego.
run(ctx, `
var __sim = {errors:[], stats:[]};
function __tryAct(label, fn){ try{ fn(); }catch(e){ __sim.errors.push({label, msg:String(e && e.message || e), stack:(e && e.stack || '').split('\\n').slice(0,6).join(' | '), age:STATE.character.edad, month:STATE.time.totalMonths}); if(__sim.errors.length > 400) throw e; } }
function __pickIdx(n){ return Math.floor(Math.random()*n); }
function __newLife(i){
  const g = pick(['Hombre','Mujer','']);
  creationData = { nombre: randomFirstNameForGender(g), apellido: randomSurname(), genero:g, ciudad: CITIES_DATA[pick(CITY_KEYS)].name, clase: pick(CLASSES),
    rasgos: rollRandomTraits(3), difficulty: pick(['normal','normal','hard','nightmare']), world: pick(['libre','canon','alternate']) };
  startNewGame();
}
// Elecciones de un jugador "razonable" pero variado.
function __resolvePending(){
  const pe = STATE.pendingEvent;
  if(pe){
    const n = (pe.choices||[]).length; if(!n){ STATE.pendingEvent = null; return; }
    // Un jugador que presta atención a su papel elige, casi siempre, lo que haría su personaje.
    if(pe.kind === 'acting' && Math.random() < 0.7){ const i = pe.choices.findIndex(ch=>ch.align==='aligned' || ch.align==='bold'); if(i >= 0){ resolvePendingEvent(i); return true; } }
    resolvePendingEvent(pe.choices[__pickIdx(n)].idx ?? __pickIdx(n)); return true;
  }
  const pm = STATE.pendingMission;
  if(pm){ resolveMissionChoice(__pickIdx(pm.choices.length)); return true; }
  if(STATE.combat){
    const acts = combatActions().filter(a=>!a.disabled);
    const th = combatThreat();
    let a;
    if(th && th.level === 2 && Math.random() < 0.85) a = acts.find(x=>x.id==='pay') || acts.find(x=>x.id==='flee');
    if(!a && STATE.character.salud < 30 && Math.random() < 0.8) a = acts.find(x=>x.id==='flee');
    if(!a && Math.random() < 0.35) a = acts.find(x=>x.ability);
    if(!a) a = pick(acts);
    combatAction(a.id); return true;
  }
  return false;
}
function __playerTurn(){
  const c = STATE.character, p = STATE.pathway;
  if(timeBlocked()) return;
  const r = Math.random();
  if(isDivine()){ const acts = divineActions(); const a = pick(acts); if(a.id !== 'end' || Math.random() < 0.08) doDivineAction(a.id); return; }
  // Vida mundana
  if(c.edad >= 16 && canSeekJob() && Math.random() < 0.25) seekBetterJob();
  if(c.edad >= 14 && Math.random() < 0.15) workExtra();
  if(c.edad >= 18 && c.cash > 800 && Math.random() < 0.1) bankDeposit(Math.round(c.cash*0.4));
  if(c.debt > 0 && c.cash + c.bank > c.debt*1.2 && Math.random() < 0.3){ bankWithdraw(Math.max(0, c.debt - c.cash)); payDebt(c.debt); }
  if(c.edad >= 20 && !c.vivienda && c.cash > housePrice()*0.3 && Math.random() < 0.05) comprarVivienda(true);
  if(c.edad >= 18 && c.edad < 50 && c.estadoCivil === 'Soltero/a' && !partnerNpc() && Math.random() < 0.08) buscarPareja();
  if(partnerNpc() && c.estadoCivil !== 'Casado/a' && Math.random() < 0.08) proponerMatrimonio();
  if(c.estadoCivil === 'Casado/a' && c.edad < 45 && Math.random() < 0.08) intentarTenerHijo();
  if(Math.random() < 0.3){
    const ns = aliveNpcs().filter(n=>n.met && n.lifeState==='presente');
    const n = pick(ns);
    if(n){ const ints = availableInteractions(n).filter(x=>x.ok !== false && !x.disabled); const it = pick(ints); if(it) doInteraction(n.id, it.id); }
  }
  if(timeBlocked()) return;
  // Un jugador con la poción ya tomada prioriza su camino.
  if(p.chosenPathway && p.sequence > 0){
    const t = p.sequence - 1;
    if(advancementRequirements().every(x=>x.ok) && Math.random() < 0.8){ attemptAdvancement(); return; }
    if(!potionItems(p.chosenPathway, t).length && brewRequirements(p.chosenPathway, t).every(x=>x.ok) && Math.random() < 0.8){ startBrew(p.chosenPathway, t); return; }
    if(p.digestion < 100 && Math.random() < 0.6){ doActing(); if(timeBlocked()) return; }
  }
  // Misticismo
  if(c.edad >= 13 && Math.random() < 0.35){
    const ms = RESEARCH_ORDER.map(id=>RESEARCH_METHODS[id]).filter(m=>researchAvailable(m).ok);
    const m = pick(ms);
    if(m){
      const tgt = m.needs && m.needs.npc ? (pick(interrogableNpcs())||{}).id : undefined;
      const focus = p.chosenPathway ? p.chosenPathway : Object.keys(PATHWAYS).filter(k=>(p.belief[k]||0) > 0).sort((a,b)=>(p.belief[b]||0)-(p.belief[a]||0))[0];
      doResearch(m.id, tgt, Math.random() < 0.8 ? focus : undefined);
    }
  }
  if(timeBlocked()) return;
  FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canCollaborate(k) && Math.random() < 0.15) factionCollaborate(k); });
  FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canJoin(k) && Math.random() < 0.25) joinFaction(k); });
  if(timeBlocked()) return;
  if(!p.chosenPathway && Math.random() < 0.2){ const t = pathwayThreads().find(x=>canConnectDots(x.key)); if(t) connectDots(t.key); }
  if(timeBlocked()) return;
  const leads = activeLeads();
  const ingLead = leads.find(l=>l.rumor==='ingredient');
  if(ingLead && Math.random() < 0.8) followLead(ingLead.id);
  else if(leads.length && Math.random() < 0.4) followLead(pick(leads).id);
  if(timeBlocked()) return;
  if(c.edad >= 14 && Math.random() < 0.15){ const locs = explorationLocations().filter(l=>explorationAvailable(l).ok); const l = pick(locs); if(l) exploreLocation(l.id); }
  if(timeBlocked()) return;
  if(c.edad >= 14 && Math.random() < 0.2){ const ms = missionOffers(); const m = pick(ms); if(m) acceptMission(m.id); }
  if(timeBlocked()) return;
  // Pociones: la primera, y las siguientes
  if(!p.chosenPathway){
    const pot = potionItems(undefined, 9)[0];
    if(pot && c.edad >= 16 && Math.random() < 0.5){ startDrinkPotion(pot.uid); return; }
    const cand = identifiedPathways().find(k=>brewRequirements(k, 9).every(x=>x.ok));
    if(cand && Math.random() < 0.6){ startBrew(cand, 9); return; }
  } else {
    if(Math.random() < 0.35 && c.edad >= 14) doActing();
    if(timeBlocked()) return;
    if(p.sequence > 0){
      const t = p.sequence - 1;
      if(!potionItems(p.chosenPathway, t).length && brewRequirements(p.chosenPathway, t).every(x=>x.ok) && Math.random() < 0.6){ startBrew(p.chosenPathway, t); return; }
      if(advancementRequirements().every(x=>x.ok) && Math.random() < 0.7){ attemptAdvancement(); return; }
    }
    const pas = powerActions(); if(pas.length && Math.random() < 0.15) doPowerAction(pick(pas).id);
    if(timeBlocked()) return;
    // Pedirle a la facción lo que falta
    memberFactions().forEach(k=>{ ['formula','ingredient','training'].forEach(w=>{ if(!timeBlocked() && factionRequestAvailable(k, w).ok && Math.random() < 0.4) factionRequest(k, w); }); });
    FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canJoin(k) && Math.random() < 0.3) joinFaction(k); });
  }
  if(timeBlocked()) return;
  // Objetos
  const its = inventoryItems().slice();
  if(its.length && Math.random() < 0.2){ const it = pick(its); const acts = itemActions(it).filter(a=>a.id!=='sell' || Math.random()<0.2); const a = pick(acts); if(a) doItemAction(it.uid, a.id); }
  if(timeBlocked()) return;
  if(tarotCanPray() && Math.random() < 0.2) tarotPray();
  if(timeBlocked()) return;
  const bm = knowsLore('black_market') ? blackMarketOffers() : [];
  if(bm.length && Math.random() < 0.1){ const i = __pickIdx(bm.length); if(c.cash > bm[i].price*1.5) buyBlackMarket(i); }
}
// Con --ui: dibuja todas las pestañas y sub-secciones (detecta errores de render).
function __renderEverything(){
  const tabs = ['vida','personas','misticismo','mundo','inventario','diario'];
  const subs = {misticismo:['mystic', typeof mysticSections === 'function' ? mysticSections().map(x=>x.id) : []], mundo:['world', typeof worldSections === 'function' ? worldSections().map(x=>x.id) : []]};
  tabs.forEach(t=>{
    UI.tab = t;
    if(subs[t]) subs[t][1].forEach(id=>{ UI.sub[subs[t][0]] = id; renderNow(); });
    else renderNow();
  });
  // Ficha de una persona, detalle de un objeto, cada sección del diario.
  const n = pick(STATE.npcs); if(n){ UI.tab = 'personas'; UI.npcSel = n.id; renderNow(); UI.npcSel = null; }
  const it = pick(inventoryItems()); if(it){ UI.tab = 'inventario'; UI.invSel = it.uid; renderNow(); }
  UI.tab = 'diario'; JOURNAL_SECTIONS.forEach(s=>{ UI.journalSec = s.id; renderNow(); });
  UI.tab = 'vida'; renderNow();
  if(STATE.gameOver) renderEnd();
}
function __checkSerializable(){
  const bad = [];
  (function walk(o, p, depth){
    if(depth > 12 || o === null || typeof o !== 'object') return;
    for(const k of Object.keys(o)){
      const v = o[k];
      if(typeof v === 'function') bad.push(p + '.' + k);
      else if(v && typeof v === 'object') walk(v, p + '.' + k, depth+1);
    }
  })(STATE, 'STATE', 0);
  return bad;
}
function __liveOne(i, maxMonths){
  __newLife(i);
  let steps = 0, stuck = 0, reloads = 0;
  const t0 = Date.now();
  while(!STATE.gameOver && STATE.time.totalMonths < maxMonths && steps < 20000){
    steps++;
    const before = STATE.time.totalMonths;
    let acted = false;
    __tryAct('pending', ()=>{ acted = __resolvePending(); });
    if(acted){ stuck++; if(stuck > 300){ __sim.errors.push({label:'stuck', msg:'demasiadas decisiones seguidas sin avanzar', age:STATE.character.edad, month:STATE.time.totalMonths, pe: JSON.stringify(STATE.pendingEvent||STATE.pendingMission||(STATE.combat&&'combat')).slice(0,200)}); STATE.pendingEvent = null; STATE.pendingMission = null; STATE.combat = null; stuck = 0; } continue; }
    stuck = 0;
    __tryAct('player', __playerTurn);
    if(typeof renderNow === 'function' && steps % 15 === 0) __tryAct('ui', __renderEverything);
    if(timeBlocked()) continue;
    __tryAct('advance', ()=>{ if(Math.random() < 0.5) advanceOneSeason(); else advanceUntilImportant(); });
    // Guardar y recargar a mitad de la vida (con decisiones pendientes incluidas).
    if(Math.random() < 0.03){
      __tryAct('reload', ()=>{
        const bad = __checkSerializable(); if(bad.length) __sim.errors.push({label:'serialize', msg:'funciones en STATE: '+bad.slice(0,4).join(', ')});
        saveGame(true); const ok = loadGame(); if(!ok) throw new Error('loadGame devolvió false'); reloads++;
      });
    }
  }
  const c = STATE.character, p = STATE.pathway;
  return {i, age:c.edad, months:STATE.time.totalMonths, over:STATE.gameOver, cat:STATE.endingData&&STATE.endingData.category, title:STATE.endingData&&STATE.endingData.title,
    cause: STATE.endingData && STATE.endingData.meta && STATE.endingData.meta.cause, enemy: STATE.endingData && STATE.endingData.meta && STATE.endingData.meta.enemy, csrc: STATE.endingData && STATE.endingData.meta && STATE.endingData.meta.source, beyonder:!!p.chosenPathway, seq:p.sequence, pathway:p.chosenPathway,
    identified: identifiedPathways().length, clues:p.clues.length, lore:loreCount(), npcs:STATE.npcs.length, kids:childrenNpcs().length, married: c.estadoCivil,
    cash: c.cash + c.bank - c.debt, job:c.profesion, tarot:STATE.tarot.stage, divine: !!(STATE.divinity&&STATE.divinity.ascended), div: STATE.divinity && STATE.divinity.stage,
    journal: STATE.journal.length, steps, reloads, ms: Date.now()-t0, diff: STATE.settings.difficulty, world: STATE.settings.world,
    attention: Math.round(STATE.world.attention), corruption: c.corruption, sanity: c.sanity, factions: memberFactions().join('/'), combats: c.stats.combatsWon + c.stats.combatsFled };
}
`);

const results = [];
for(let i=0;i<LIVES;i++){
  let r;
  try{ r = run(ctx, `__liveOne(${i}, 12*120)`); }
  catch(e){ console.error('La vida', i, 'explotó:', e.stack); process.exitCode = 1; break; }
  results.push(r);
  if(VERBOSE) console.log(JSON.stringify(r));
}
const errors = run(ctx, '__sim.errors');
// Resumen
const n = results.length || 1;
const avg = (f)=> (results.reduce((a,r)=>a+(f(r)||0),0)/n).toFixed(1);
const pct = (f)=> Math.round(results.filter(f).length/n*100) + '%';
console.log(`\nVidas: ${results.length}  ·  edad media al morir: ${avg(r=>r.age)}  ·  Beyonders: ${pct(r=>r.beyonder)}  ·  terminadas: ${pct(r=>r.over)}`);
const seqs = {}; results.filter(r=>r.beyonder).forEach(r=>{ seqs[r.seq] = (seqs[r.seq]||0)+1; });
console.log('Sequence alcanzada:', JSON.stringify(seqs), ' · divinos:', results.filter(r=>r.divine).length);
const causes = {}; results.forEach(r=>{ const k = (r.cat||'-')+':'+(r.cause||r.title||'-'); causes[k] = (causes[k]||0)+1; });
console.log('Finales:', JSON.stringify(causes));
console.log(`Promedios — pistas ${avg(r=>r.clues)}, vías identificadas ${avg(r=>r.identified)}, lore ${avg(r=>r.lore)}, NPCs ${avg(r=>r.npcs)}, hijos ${avg(r=>r.kids)}, patrimonio ${avg(r=>r.cash)}, combates ${avg(r=>r.combats)}, journal ${avg(r=>r.journal)}, recargas ${avg(r=>r.reloads)}, ms/vida ${avg(r=>r.ms)}`);
console.log('Tarot (etapa media):', avg(r=>r.tarot), ' · atención media:', avg(r=>r.attention), ' · casados:', pct(r=>r.married==='Casado/a'), ' · en facción:', pct(r=>r.factions));
const byMsg = {};
errors.forEach(e=>{ const k = e.label+': '+e.msg; (byMsg[k] = byMsg[k] || {n:0, ex:e}).n++; });
const keys = Object.keys(byMsg).sort((a,b)=>byMsg[b].n-byMsg[a].n);
console.log(`\nErrores: ${errors.length} (${keys.length} distintos)`);
keys.slice(0, 40).forEach(k=>{ console.log(`  ${byMsg[k].n}× ${k}\n      ${byMsg[k].ex.stack||''} ${byMsg[k].ex.pe||''}`); });
if(errors.length) process.exitCode = 1;
