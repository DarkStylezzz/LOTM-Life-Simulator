'use strict';
/* =========================================================================
   tests/simulate.js — vidas completas sin navegador.
   Carga los sistemas (sin la UI), crea personajes al azar y los hace vivir
   con un "jugador" que toma decisiones razonables (investiga, actúa,
   prepara pociones, se relaciona, explora, pelea, avanza). Reporta errores
   de ejecución, bloqueos, estado no serializable y estadísticas de balance.
   Uso:  node tests/simulate.js [vidas=40] [--ui] [--seed=N] [--verbose]
                                [--diff=easy|normal|hard|nightmare] [--style=mixto|dedicado|tranquilo]
                                [--funnel] [--combat]
     --ui     carga también la interfaz (ui/*.js + main.js) con el DOM simulado
     --diff   fija la dificultad (por defecto, una al azar entre normal, difícil y pesadilla)
     --style  cómo juega el "jugador": mixto (un poco de todo), dedicado (vive
              para el mundo oculto: investiga, actúa, explora y avanza apenas
              puede) o tranquilo (una vida común: trabajo, familia, amigos)
     --funnel el embudo del camino místico y los rituales por Sequence
     --combat cuánto se pelea y cuánto se muere: por etapa, enemigo, origen y salud al empezar
   ========================================================================= */
const path = require('path');
const { loadGame, run, scriptList } = require('./harness');

const args = process.argv.slice(2);
const LIVES = +(args.find(a=>/^\d+$/.test(a)) || 40);
const WITH_UI = args.includes('--ui');
const VERBOSE = args.includes('--verbose');
const seedArg = (args.find(a=>a.startsWith('--seed=')) || '').split('=')[1];
const DIFF = (args.find(a=>a.startsWith('--diff=')) || '').split('=')[1] || '';
const STYLE = (args.find(a=>a.startsWith('--style=')) || '').split('=')[1] || 'mixto';

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
// Cuánto le interesa cada cosa a cada estilo de jugador (probabilidad por turno).
var __STYLES = {
  mixto:     {research:0.35, focus:0.8, explore:0.15, mission:0.2,  acting:0.35, collab:0.15, join:0.25, lead:0.4,  connect:0.2, request:0.4, flee:0.85, market:0.1, everySeason:0.5, seek:0.35},
  dedicado:  {research:0.9,  focus:1,   explore:0.45, mission:0.35, acting:0.95, collab:0.6,  join:0.8,  lead:0.9,  connect:0.9, request:0.9, flee:1,    market:0.5, everySeason:1,   seek:0.95},
  tranquilo: {research:0.02, focus:0.5, explore:0.02, mission:0.1,  acting:0.35, collab:0.02, join:0.02, lead:0.05, connect:0,   request:0.2, flee:0.9,  market:0,   everySeason:0.2, seek:0}
};
var __S = __STYLES[${JSON.stringify(STYLE)}] || __STYLES.mixto;
var STYLE_NAME = ${JSON.stringify(STYLE)};
console.error = function(){ __sim.errors.push({label:'console.error', msg:Array.from(arguments).map(a=>a && a.message ? a.message : String(a)).join(' ').slice(0,200), stack:Array.from(arguments).map(a=>a && a.stack ? a.stack.split('\\n').slice(0,4).join(' | ') : '').join(''), age:STATE.character.edad}); };
function __tryAct(label, fn){ try{ fn(); }catch(e){ __sim.errors.push({label, msg:String(e && e.message || e), stack:(e && e.stack || '').split('\\n').slice(0,6).join(' | '), age:STATE.character.edad, month:STATE.time.totalMonths}); if(__sim.errors.length > 400) throw e; } }
function __pickIdx(n){ return Math.floor(Math.random()*n); }
// Cuántos rituales de Advancement se intentan y cuántos salen bien (por Sequence de origen).
var __rituals = [];
var __resolveAdvancement0 = resolveAdvancement;
resolveAdvancement = function(){ const s = STATE.pathway.sequence; __resolveAdvancement0(); __rituals.push({s, ok:STATE.pathway.sequence < s}); };
// Cada pelea: en qué etapa estabas, contra qué, de dónde vino, con cuánta
// salud empezaste y cómo terminó. Y cuántos meses pasaste en cada etapa.
var __fights = [], __curFight = null, __stageMonths = {};
function __stage(){ const p = STATE.pathway; return !p.chosenPathway ? 'humano' : p.sequence >= 8 ? 'S9-8' : p.sequence >= 6 ? 'S7-6' : p.sequence === 5 ? 'S5' : p.sequence === 4 ? 'S4' : 'S3-0'; }
var __startCombat0 = startCombat;
startCombat = function(keyOrTpl, opts){
  const c = STATE.character, f = {st:__stage(), salud:c.salud, src:(opts && opts.source) || '', res:null};
  const r = __startCombat0.apply(this, arguments);
  if(STATE.combat){ f.name = STATE.combat.enemy.name; f.eseq = STATE.combat.enemy.seq; __fights.push(f); __curFight = f; }
  return r;
};
var __endCombat0 = endCombat;
endCombat = function(result){ if(__curFight && !__curFight.res) __curFight.res = result; return __endCombat0.apply(this, arguments); };
function __newLife(i){
  __rituals = []; __fights = []; __curFight = null; __stageMonths = {};
  const g = pick(['Hombre','Mujer','']);
  creationData = { nombre: randomFirstNameForGender(g), apellido: randomSurname(), genero:g, ciudad: CITIES_DATA[pick(CITY_KEYS)].name, clase: pick(CLASSES),
    rasgos: rollRandomTraits(3), difficulty: ${JSON.stringify(DIFF)} || pick(['normal','normal','hard','nightmare']), world: pick(['libre','canon','alternate']) };
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
    if(th && th.level === 2 && Math.random() < __S.flee) a = acts.find(x=>x.id==='pay') || acts.find(x=>x.id==='flee');
    if(!a && th && th.level === 1 && STATE.character.salud < 50 && Math.random() < __S.flee) a = acts.find(x=>x.id==='flee');
    if(!a && STATE.character.salud < 30 && Math.random() < 0.8) a = acts.find(x=>x.id==='flee');
    if(!a && Math.random() < 0.6) a = pick(acts.filter(x=>x.ability));
    if(!a && Math.random() < 0.8) a = acts.find(x=>x.id==='attack' || x.id==='shoot');
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
  // Lo primero: si ya está todo para dar el paso (preparar, beber, avanzar), se da.
  // Un jugador de verdad no posterga eso por una tarde de biblioteca (y saca
  // la plata del banco si hace falta).
  if(!p.chosenPathway){
    const pot = potionItems(undefined, 9)[0];
    if(pot && c.edad >= 16 && Math.random() < 0.7){ startDrinkPotion(pot.uid); return; }
    const cand = identifiedPathways().find(k=>brewRequirements(k, 9).every(x=>x.ok));
    if(cand && Math.random() < 0.8){ startFirstPotion(cand); return; }
  } else if(p.sequence > 0){
    if(advancementRequirements().every(x=>x.ok) && Math.random() < 0.8){ attemptAdvancement(); return; }
  }
  // "Buscar lo que te falta": el botón que empuja hacia el próximo paso.
  if(seekAvailable().ok && Math.random() < __S.seek){ seekMissing(); if(timeBlocked()) return; }
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
    if(advancementRequirements().every(x=>x.ok) && Math.random() < 0.8){ attemptAdvancement(); return; }
    if(p.digestion < 100 && Math.random() < Math.max(0.6, __S.acting)){ doActing(); if(timeBlocked()) return; }
  }
  // Misticismo
  if(c.edad >= 13 && Math.random() < __S.research){
    const ms = RESEARCH_ORDER.map(id=>RESEARCH_METHODS[id]).filter(m=>researchAvailable(m).ok);
    const m = pick(ms);
    if(m){
      const tgt = m.needs && m.needs.npc ? (pick(interrogableNpcs())||{}).id : undefined;
      const focus = p.chosenPathway ? p.chosenPathway : Object.keys(PATHWAYS).filter(k=>(p.belief[k]||0) > 0).sort((a,b)=>(p.belief[b]||0)-(p.belief[a]||0))[0];
      doResearch(m.id, tgt, Math.random() < __S.focus ? focus : undefined);
    }
  }
  if(timeBlocked()) return;
  FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canCollaborate(k) && Math.random() < __S.collab) factionCollaborate(k); });
  FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canJoin(k) && Math.random() < __S.join) joinFaction(k); });
  if(timeBlocked()) return;
  if(!p.chosenPathway && Math.random() < __S.connect){ const t = pathwayThreads().find(x=>canConnectDots(x.key)); if(t) connectDots(t.key); }
  if(timeBlocked()) return;
  const leads = activeLeads();
  const ingLead = leads.find(l=>l.rumor==='ingredient');
  if(ingLead && Math.random() < Math.max(__S.lead, 0.8*__S.lead/0.4)) followLead(ingLead.id);
  else if(leads.length && Math.random() < __S.lead) followLead(pick(leads).id);
  if(timeBlocked()) return;
  if(c.edad >= 14 && Math.random() < __S.explore){ const locs = explorationLocations().filter(l=>explorationAvailable(l).ok); const l = pick(locs); if(l) exploreLocation(l.id); }
  if(timeBlocked()) return;
  if(c.edad >= 14 && Math.random() < __S.mission){ const ms = missionOffers(); const m = pick(ms); if(m) acceptMission(m.id); }
  if(timeBlocked()) return;
  // Pedirle a la organización lo que falta (también antes de ser Beyonder).
  if(!p.chosenPathway) memberFactions().forEach(k=>{ ['formula','ingredient'].forEach(w=>{ if(!timeBlocked() && factionRequestAvailable(k, w).ok && Math.random() < __S.request*0.6) factionRequest(k, w); }); });
  if(timeBlocked()) return;
  // Pociones: la primera, y las siguientes
  if(!p.chosenPathway){
    const pot = potionItems(undefined, 9)[0];
    if(pot && c.edad >= 16 && Math.random() < 0.5){ startDrinkPotion(pot.uid); return; }
    const cand = identifiedPathways().find(k=>brewRequirements(k, 9).every(x=>x.ok));
    if(cand && Math.random() < 0.6){ startFirstPotion(cand); return; }
  } else {
    if(Math.random() < __S.acting && c.edad >= 14) doActing();
    if(timeBlocked()) return;
    if(p.sequence > 0 && advancementRequirements().every(x=>x.ok) && Math.random() < 0.7){ attemptAdvancement(); return; }
    const pas = powerActions(); if(pas.length && Math.random() < 0.15) doPowerAction(pick(pas).id);
    if(timeBlocked()) return;
    // Pedirle a la facción lo que falta
    memberFactions().forEach(k=>{ ['formula','ingredient','training'].forEach(w=>{ if(!timeBlocked() && factionRequestAvailable(k, w).ok && Math.random() < __S.request) factionRequest(k, w); }); });
    FACTION_KEYS.forEach(k=>{ if(!timeBlocked() && canJoin(k) && Math.random() < Math.max(0.3, __S.join)) joinFaction(k); });
  }
  if(timeBlocked()) return;
  // Objetos
  const its = inventoryItems().slice();
  if(its.length && Math.random() < 0.2){ const it = pick(its); const acts = itemActions(it).filter(a=>a.id!=='sell' || Math.random()<0.2); const a = pick(acts); if(a) doItemAction(it.uid, a.id); }
  if(timeBlocked()) return;
  if(tarotCanPray() && Math.random() < 0.2) tarotPray();
  if(timeBlocked()) return;
  const bm = knowsLore('black_market') ? blackMarketOffers() : [];
  if(bm.length && Math.random() < __S.market){
    // Un jugador dedicado compra lo que le sirve para su camino; los demás, cualquier cosa.
    const useful = bm.map((o,i)=>({o,i})).filter(x=>!x.o.sold && (x.o.kind==='ingredient' || (x.o.kind==='formula' && !hasFormula(x.o.pathway, x.o.seq))));
    const pickI = STYLE_NAME === 'dedicado' && useful.length ? pick(useful).i : __pickIdx(bm.length);
    if(bm[pickI] && !bm[pickI].sold && c.cash > bm[pickI].price*1.3) buyBlackMarket(pickI);
  }
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
  const seqAge = {}; let lastSeq = null;
  // El embudo del camino místico: a qué edad se cumple cada paso (la primera vez).
  const funnel = {};
  const mark = (k, cond)=>{ if(funnel[k] === undefined && cond) funnel[k] = STATE.character.edad; };
  const trackFunnel = ()=>{
    const p = STATE.pathway, ids = identifiedPathways();
    mark('1 primera pista', p.clues.length > 0);
    mark('2 vía identificada', ids.length > 0);
    mark('3 comprensión 50', ids.some(k=>knowledgeOf(k) >= 50));
    mark('4 fórmula Seq 9', itemsByCat('formula').some(f=>f.seq === 9));
    mark('5 ingredientes Seq 9', ids.some(k=>ingredientsNeededFor(k,9).every(n=>ownedQty(k,n) > 0)) || !!p.chosenPathway);
    mark('6 poción preparada', potionItems(undefined, 9).length > 0 || !!p.chosenPathway);
    mark('7 Beyonder', !!p.chosenPathway);
    if(p.chosenPathway && p.sequence > 0){
      const t = p.sequence - 1;
      mark('dig100 S'+p.sequence, p.digestion >= 100);
      mark('fórmula S'+t, hasFormula(p.chosenPathway, t));
      mark('ingredientes S'+t, ingredientsNeededFor(p.chosenPathway, t).every((n,i)=>ownedQty(p.chosenPathway,n) > 0 || (i===0 && characteristicFor(p.chosenPathway, t))));
    }
  };
  const t0 = Date.now();
  while(!STATE.gameOver && STATE.time.totalMonths < maxMonths && steps < 20000){
    steps++;
    const before = STATE.time.totalMonths;
    let acted = false;
    __tryAct('pending', ()=>{ acted = __resolvePending(); });
    if(acted){ stuck++; if(stuck > 300){ __sim.errors.push({label:'stuck', msg:'demasiadas decisiones seguidas sin avanzar', age:STATE.character.edad, month:STATE.time.totalMonths, pe: JSON.stringify(STATE.pendingEvent||STATE.pendingMission||(STATE.combat&&'combat')).slice(0,200)}); STATE.pendingEvent = null; STATE.pendingMission = null; STATE.combat = null; stuck = 0; } continue; }
    stuck = 0;
    __tryAct('player', __playerTurn);
    if(STATE.pathway.chosenPathway && STATE.pathway.sequence !== lastSeq){ lastSeq = STATE.pathway.sequence; if(seqAge[lastSeq] === undefined) seqAge[lastSeq] = STATE.character.edad; }
    if(steps % 3 === 0) trackFunnel();
    if(typeof renderNow === 'function' && steps % 15 === 0) __tryAct('ui', __renderEverything);
    if(timeBlocked()) continue;
    // Un jugador dedicado aprovecha cada temporada; los demás saltan hasta que pase algo.
    const st = __stage();
    __tryAct('advance', ()=>{ if(Math.random() < __S.everySeason) advanceOneSeason(); else advanceUntilImportant(); });
    __stageMonths[st] = (__stageMonths[st]||0) + (STATE.time.totalMonths - before);
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
    attention: Math.round(STATE.world.attention), corruption: c.corruption, sanity: c.sanity, factions: memberFactions().join('/'), combats: c.stats.combatsWon + c.stats.combatsFled,
    seqAge, funnel, rituals: __rituals.slice(), fights: __fights.map(f=>Object.assign({}, f, {res: f.res || (STATE.gameOver ? 'otro final' : 'abierta')})),
    stageMonths: Object.assign({}, __stageMonths), saved: STATE.flags.secondChancesUsed || 0, city: currentCityKey() };
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
// Edad media a la que se llegó a cada Sequence (entre quienes llegaron).
const reach = {}; results.forEach(r=>{ for(const s in (r.seqAge||{})){ (reach[s] = reach[s] || []).push(r.seqAge[s]); } });
console.log('Edad media al llegar a cada Sequence:', Object.keys(reach).sort((a,b)=>b-a).map(s=>`${s}: ${(reach[s].reduce((a,b)=>a+b,0)/reach[s].length).toFixed(0)} años (${reach[s].length})`).join(' · ') || '—');
if(args.includes('--funnel')){
  const f = {}; results.forEach(r=>{ for(const k in (r.funnel||{})){ (f[k] = f[k] || []).push(r.funnel[k]); } });
  const order = (k)=> /^\d/.test(k) ? '0'+k : k.replace(/S(\d)$/, (m,d)=>'S'+(9-d));
  console.log('Embudo (edad media · cuántas vidas):');
  Object.keys(f).sort((a,b)=>order(a) < order(b) ? -1 : 1).forEach(k=>console.log(`  ${k.padEnd(22)} ${(f[k].reduce((a,b)=>a+b,0)/f[k].length).toFixed(0).padStart(3)} años · ${f[k].length}`));
  const rit = {}; results.forEach(r=>(r.rituals||[]).forEach(x=>{ const o = rit[x.s] = rit[x.s] || {n:0, ok:0}; o.n++; if(x.ok) o.ok++; }));
  const rk = Object.keys(rit).sort((a,b)=>b-a);
  if(rk.length) console.log('Rituales (Sequence de origen: intentos → éxitos):', rk.map(s=>`${s}→${s-1}: ${rit[s].n}→${rit[s].ok} (${Math.round(rit[s].ok/rit[s].n*100)}%)`).join(' · '));
}
if(args.includes('--combat')){
  // Cuánto se pelea y cuánto se muere, por etapa, por enemigo, por origen y por la salud con la que se empieza.
  const fights = [].concat(...results.map(r=>r.fights||[]));
  const months = {}; results.forEach(r=>{ for(const k in (r.stageMonths||{})) months[k] = (months[k]||0) + r.stageMonths[k]; });
  const pc = (a,b)=> b ? Math.round(a/b*100) + '%' : '-';
  const table = (label, keyOf, extra)=>{
    const g = {}; fights.forEach(f=>{ const k = keyOf(f); const o = g[k] = g[k] || {n:0, d:0, fled:0, lost:0, salud:0}; o.n++; if(f.res==='death') o.d++; if(f.res==='fled') o.fled++; if(f.res==='otro final') o.lost++; o.salud += f.salud; });
    console.log(label);
    Object.keys(g).sort((a,b)=>g[b].n-g[a].n).slice(0, 12).forEach(k=>{ const o = g[k];
      console.log(`  ${String(k).padEnd(44)} ${String(o.n).padStart(4)} peleas · mueren ${pc(o.d, o.n).padStart(4)} · huyen ${pc(o.fled, o.n).padStart(4)}${o.lost ? ` · pierden el control ${o.lost}` : ''} · salud al empezar ${Math.round(o.salud/o.n)}${extra ? extra(k, o) : ''}`); });
  };
  table('Peleas por etapa:', f=>f.st, (k, o)=> months[k] ? ` · ${(o.n / (months[k]/12)).toFixed(2)} por año` : '');
  table('Peleas por enemigo:', f=>f.name);
  table('Peleas por origen:', f=>f.src || '(sin origen)');
  table('Peleas por salud al empezar:', f=>f.salud < 40 ? 'menos de 40' : f.salud < 70 ? '40 a 69' : '70 o más');
}
const savedLives = results.filter(r=>r.saved > 0).length;
if(savedLives) console.log(`Segundas oportunidades usadas: ${results.reduce((a,r)=>a+r.saved,0)} en ${savedLives} vidas`);
const causes = {}; results.forEach(r=>{ const k = (r.cat||'-')+':'+(r.cause||r.title||'-'); causes[k] = (causes[k]||0)+1; });
console.log('Finales:', JSON.stringify(causes));
const killers = {}; results.filter(r=>r.cause==='combate').forEach(r=>{ const k = (r.enemy||'?') + (r.csrc ? ' ('+r.csrc+')' : ''); killers[k] = (killers[k]||0)+1; });
if(Object.keys(killers).length){
  console.log('Muertes en combate:', JSON.stringify(killers));
  const cd = results.filter(r=>r.cause==='combate'), bySeq = {};
  cd.forEach(r=>{ const k = r.beyonder ? 'S'+r.seq : 'humano'; bySeq[k] = (bySeq[k]||0)+1; });
  console.log('  …por Sequence:', JSON.stringify(bySeq), ' · edad media:', (cd.reduce((a,r)=>a+r.age,0)/cd.length).toFixed(0));
}
console.log(`Promedios — pistas ${avg(r=>r.clues)}, vías identificadas ${avg(r=>r.identified)}, lore ${avg(r=>r.lore)}, NPCs ${avg(r=>r.npcs)}, hijos ${avg(r=>r.kids)}, patrimonio ${avg(r=>r.cash)}, combates ${avg(r=>r.combats)}, journal ${avg(r=>r.journal)}, recargas ${avg(r=>r.reloads)}, ms/vida ${avg(r=>r.ms)}`);
console.log('Tarot (etapa media):', avg(r=>r.tarot), ' · atención media:', avg(r=>r.attention), ' · casados:', pct(r=>r.married==='Casado/a'), ' · en facción:', pct(r=>r.factions));
const byMsg = {};
errors.forEach(e=>{ const k = e.label+': '+e.msg; (byMsg[k] = byMsg[k] || {n:0, ex:e}).n++; });
const keys = Object.keys(byMsg).sort((a,b)=>byMsg[b].n-byMsg[a].n);
console.log(`\nErrores: ${errors.length} (${keys.length} distintos)`);
keys.slice(0, 40).forEach(k=>{ console.log(`  ${byMsg[k].n}× ${k}\n      ${byMsg[k].ex.stack||''} ${byMsg[k].ex.pe||''}`); });
if(errors.length) process.exitCode = 1;
