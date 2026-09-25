'use strict';
/* =========================================================================
   systems/pathway.js — descubrimiento de Pathways (§14).
   El jugador NO ve una lista de vías con nombre. Ve PISTAS, agrupadas en
   "hilos" según lo que él CREE que describen ("una vía relacionada con la
   noche y el silencio"). Etapas de cada hilo:
     Rumor → Sospecha → Pista → Conocimiento parcial → Identificada →
     Comprendida → Disponible → Obtenida
   - knowledge[k]: comprensión REAL de la vía k (sólo suben pistas reales).
   - belief[k]:    lo que el jugador cree saber de k (suben también las
                   pistas falsas que creés que hablan de k).
   Pistas falsas (el jugador cree que algo pertenece a una vía y se
   equivoca), información incompleta (descriptores vagos, pistas parciales)
   e información contradictoria (dos fuentes que no encajan) son parte del
   sistema, no errores. Identificar una vía exige comprensión real: las
   pistas falsas pueden llevarte hasta "Conocimiento parcial", no más. Al
   identificar, se revela qué pistas viejas eran falsas.
   ========================================================================= */
const DISCOVERY_STAGES = ['Desconocida','Rumor','Sospecha','Pista','Conocimiento parcial','Identificada','Comprendida','Disponible','Obtenida'];

function knowledgeOf(k){ return (STATE.pathway.knowledge[k]||0); }
function maxPathwayKnowledge(){ return Math.max(0, ...Object.values(STATE.pathway.knowledge)); }
function isIdentified(k){ return !!(STATE.pathway.identified && STATE.pathway.identified[k]) || STATE.pathway.chosenPathway === k; }
function identifiedPathways(){ return Object.keys(PATHWAYS).filter(isIdentified); }

// Vías "cercanas" en esta vida: lo que realmente anda cerca tuyo (facciones
// fuertes en tu ciudad, NPCs Beyonder que conociste, el secreto familiar).
// Las pistas al azar tienden a apuntar ahí: el mundo es coherente.
function nearPathwayWeights(){
  const w = {};
  Object.keys(PATHWAYS).forEach(k=>{ w[k] = 1; });
  const city = currentCity();
  FACTION_KEYS.forEach(f=>{ const s = city.factions[f]||0; (STATE.factions[f].formulas||[]).forEach(p=>{ w[p] += s*2; }); });
  aliveNpcs().forEach(n=>{ if(n.met && n.hidden.pathway) w[n.hidden.pathway] += 3; });
  if(STATE.flags.familySecret) w[STATE.flags.familySecret.pathway] += 2;
  return w;
}
function resolveCluePathway(p, ctx){
  if(Array.isArray(p)) return pick(p);
  if(p === '$chosen') return STATE.pathway.chosenPathway || resolveCluePathway('$random');
  if(p === '$chosenOrRandom') return STATE.pathway.chosenPathway || resolveCluePathway('$random');
  if(p === '$ctx') return ctx && ctx.npc && ctx.npc.hidden.pathway ? ctx.npc.hidden.pathway : resolveCluePathway('$random');
  if(p === '$random' || !p){ const w = nearPathwayWeights(); return wpick(Object.keys(w), k=>w[k]); }
  return PATHWAYS[p] ? p : resolveCluePathway('$random');
}
function resolveReliability(r){
  if(r !== 'mixed') return r || 'real';
  const pf = 0.15 * diffMult('falseClue') - luckMod();
  const roll1 = Math.random();
  if(roll1 < pf) return 'false';
  if(roll1 < pf + 0.25) return 'partial';
  return 'real';
}

// Agrega una pista. Devuelve la pista creada (o null si no dejó rastro visible).
function addClue(o, ctx){
  o = o || {};
  const p = STATE.pathway;
  const k = resolveCluePathway(o.pathway, ctx);
  if(!k) return null;
  const strength = Math.max(1, Math.round(roll(o.strength ?? [2,5])));
  // Pistas sobre tu propia vía: ya sabés qué es; sólo suma comprensión.
  if(p.chosenPathway === k){ p.knowledge[k] = clamp(p.knowledge[k] + strength, 0, 100); return null; }
  const rel = resolveReliability(o.reliability);
  let shown = k, truth = k;
  if(rel === 'false'){
    // Una pista falsa: el jugador cree que habla de k, pero no es así (habla
    // de otra vía, o de nada en absoluto).
    truth = chance(0.5) ? null : pick(Object.keys(PATHWAYS).filter(x=>x!==k));
  }
  const pw = PATHWAYS[shown];
  const desc = pick(pw.vague || [pw.theme]);
  const clue = { id:uid('cl'), truth, shown, desc, reliability:rel, strength, source:o.source||'', cy:calendarYear(), age:STATE.character.edad, resolved:null };
  p.clues.push(clue);
  if(p.clues.length > 80) p.clues.shift();
  // belief sube siempre (el jugador no distingue); knowledge sólo con verdad.
  p.belief[shown] = clamp((p.belief[shown]||0) + strength, 0, 100);
  if(rel === 'real') p.knowledge[k] = clamp(p.knowledge[k] + strength, 0, 100);
  else if(rel === 'partial') p.knowledge[k] = clamp(p.knowledge[k] + Math.ceil(strength/2), 0, 100);
  else if(truth) p.knowledge[truth] = clamp(p.knowledge[truth] + Math.ceil(strength/4), 0, 100);
  STATE.flags.mysticExposure = (STATE.flags.mysticExposure||0) + Math.ceil(strength/3);
  checkPathwayDiscoveryReveal(shown, !!o.confirm);
  return clue;
}

function threadStage(k){
  const p = STATE.pathway;
  if(p.chosenPathway === k) return 'Obtenida';
  if(isIdentified(k)){
    if(hasFormula(k, 9) && knowledgeOf(k) >= 50) return 'Disponible';
    if(knowledgeOf(k) >= 65) return 'Comprendida';
    return 'Identificada';
  }
  const b = p.belief[k] || 0;
  if(b <= 0) return 'Desconocida';
  if(b < 10) return 'Rumor';
  if(b < 20) return 'Sospecha';
  if(b < 35) return 'Pista';
  return 'Conocimiento parcial';
}
function stageIndex(stage){ return DISCOVERY_STAGES.indexOf(stage); }
// "Hilos" que ve el jugador. Nunca exponen la clave interna de una vía no
// identificada (la UI usa el índice del hilo).
function pathwayThreads(){
  const p = STATE.pathway;
  return Object.keys(PATHWAYS)
    .filter(k=>(p.belief[k]||0) > 0 || isIdentified(k))
    .map(k=>{
      const clues = p.clues.filter(c=>c.shown===k);
      const descs = [...new Set(clues.map(c=>c.desc))].slice(0,3);
      const falseRes = clues.filter(c=>c.resolved==='false').length;
      const contradictory = !isIdentified(k) && (p.belief[k]||0) >= 30 && knowledgeOf(k) < (p.belief[k]||0)*0.35;
      return { key:k, identified:isIdentified(k), stage:threadStage(k), belief:p.belief[k]||0, knowledge:knowledgeOf(k), descs, clues, falseRes, contradictory };
    })
    .sort((a,b)=>stageIndex(b.stage)-stageIndex(a.stage) || b.belief-a.belief);
}
function threadTitle(t){
  if(t.identified) return PATHWAYS[t.key].name;
  return 'Una vía relacionada con ' + listEs(t.descs.length ? t.descs : [PATHWAYS[t.key].vague[0]]);
}

// Revelaciones: la primera sospecha de que existe un mundo oculto, y el
// momento en que una vía tiene nombre.
function checkPathwayDiscoveryReveal(k, confirming){
  const p = STATE.pathway;
  const b = p.belief[k] || 0;
  if(b >= 10 && !p.firstDiscoveryShown[k] && !isIdentified(k)){
    p.firstDiscoveryShown[k] = true;
    if(!(STATE.milestones||[]).some(m=>m.kind==='mystic')){
      addMilestone('mystic', 'Empieza a sospechar que el mundo esconde algo');
      queueSeal({kind:'suspicion', key:k});
      STATE._importantMoment = true;
    }
  }
  if(!isIdentified(k)){
    const kn = knowledgeOf(k);
    const confirmChance = confirming ? (kn >= 30 ? 1 : 0) : kn >= 60 ? 1 : kn >= 45 ? 0.3 : 0;
    if(confirmChance > 0 && chance(confirmChance)) identifyPathway(k);
  }
}
// Atar cabos: poner todas las pistas de un hilo sobre la mesa. Si lo que
// sabés es real y suficiente, el hilo tiene nombre; si en realidad seguías
// pistas falsas, las contradicciones empiezan a notarse.
function canConnectDots(k){ return !isIdentified(k) && (STATE.pathway.belief[k]||0) >= 25 && STATE.character.edad >= 14; }
function connectDots(k){
  if(timeBlocked() || !canConnectDots(k)) return;
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  markMysticAct();
  const p = STATE.pathway;
  const kn = knowledgeOf(k), b = p.belief[k] || 0;
  const skill = researchSkill('study');
  let text;
  if(kn >= 45 && chance(clamp((kn-35)/25 + skill, 0.1, 0.95))){
    identifyPathway(k, 'atando cabos');
    text = `Ponés todo sobre la mesa, una noche entera. Y de golpe encaja: esto tiene nombre. ${PATHWAYS[k].name}.`;
  } else if(kn < b * 0.5){
    const bad = p.clues.filter(c=>c.shown===k && !c.resolved && c.truth !== k).slice(0,2);
    bad.forEach(c=>{ c.resolved = 'false'; p.belief[k] = Math.max(0, (p.belief[k]||0) - c.strength); });
    text = bad.length ? `Al ponerlas lado a lado, algunas pistas se contradicen. ${bad.length === 1 ? 'Una era falsa' : 'Dos eran falsas'}: la de ${bad.map(c=>c.source||'aquella vez').join(' y la de ')}.` : 'Nada encaja con nada. Tal vez estás viendo patrones donde no los hay.';
  } else {
    p.knowledge[k] = clamp(kn + 1, 0, 100);
    text = kn >= 45 ? 'Estás cerca. Lo sentís. Pero todavía falta una pieza.' : 'Ponés todo sobre la mesa. No alcanza: sabés muy poco todavía.';
  }
  logJournal('Atar cabos', text, {cat:'mystery', imp:1});
  setResolution('Atar cabos', text, []);
  saveGame(true); renderAll();
}
function identifyPathway(k, how){
  const p = STATE.pathway;
  if(isIdentified(k)) return;
  p.identified[k] = true;
  p.firstDiscoveryShown[k] = true;
  // Se resuelven las pistas viejas: cuáles eran ciertas, cuáles no.
  let falses = 0;
  p.clues.forEach(c=>{
    if(c.shown === k && !c.resolved){ c.resolved = c.truth === k ? 'confirmed' : 'false'; if(c.resolved==='false') falses++; }
  });
  p.belief[k] = Math.max(p.knowledge[k], Math.round((p.belief[k]||0)*0.8));
  addMilestone('mystic', `Identifica la vía ${PATHWAYS[k].name}`);
  logJournal('Una vía tiene nombre', `Las piezas encajan: ${PATHWAYS[k].name}. ${PATHWAYS[k].theme}.${falses ? ` Ahora entendés que ${falses===1?'una de las pistas que seguías era falsa':falses+' de las pistas que seguías eran falsas'}.` : ''}`, {cat:'pathway', imp:3});
  remember('identified_'+k, `Supiste que existía la vía ${PATHWAYS[k].name}.`, {cat:'secret'});
  queueSeal({kind:'identified', key:k});
  STATE._importantMoment = true;
}
// Verificar una pista (adivinación, un místico, deducción): saber si era real.
function verifyClue(clueId, how){
  const c = STATE.pathway.clues.find(x=>x.id===clueId);
  if(!c || c.resolved) return null;
  if(c.truth === c.shown){ c.resolved = 'confirmed'; STATE.pathway.knowledge[c.shown] = clamp(STATE.pathway.knowledge[c.shown] + 2, 0, 100); checkPathwayDiscoveryReveal(c.shown, false); return 'real'; }
  c.resolved = 'false'; STATE.pathway.belief[c.shown] = Math.max(0, (STATE.pathway.belief[c.shown]||0) - c.strength);
  logJournal('Una pista falsa', `${cap(how||'Averiguás')} que la pista de ${c.source||'aquella vez'} ${c.truth ? 'no hablaba de lo que creías' : 'no llevaba a ningún lado'}.`, {cat:'mystery', imp:1});
  return 'false';
}
function unverifiedClues(){ return STATE.pathway.clues.filter(c=>!c.resolved); }

// Compatibilidad con código/saves anteriores.
function discoveryStage(v){ if(v<=0) return 'Unknown'; if(v<25) return 'Rumored'; if(v<50) return 'Discovered'; if(v<75) return 'Understood'; if(v<100) return 'Available'; return 'Obtained'; }

/* ------------------------------ el rol actual ------------------------------ */
function currentSeqData(){
  if(!STATE.pathway.chosenPathway) return null;
  return seqData(STATE.pathway.chosenPathway, STATE.pathway.sequence);
}
function currentRole(){
  const p = STATE.pathway;
  if(!p.chosenPathway) return null;
  const roles = (ACTING_ROLES[p.chosenPathway]||{});
  const r = roles[p.sequence];
  const sd = currentSeqData();
  return r || {role: sd ? sd.name : 'Beyonder', principle:`Vivir como lo haría un ${sd ? sd.name : 'Beyonder'}.`, fit:[]};
}
function monthsSincePotion(){ return STATE.pathway.potionMonth === null || STATE.pathway.potionMonth === undefined ? 999 : STATE.time.totalMonths - STATE.pathway.potionMonth; }

/* ------------------------------ extensión data-driven (§47) ------------------------------ */
// Agregar una vía nueva modificando datos, no el motor:
//   registerPathway('someNewPathway', {
//     name, theme, vague:[...], sequences:[{n:9,name,ability},...],
//     ingredients:{9:[...],8:[...]}, formulas:{name, ingredientCost, prepDifficulty},
//     abilities:[...], actingRoles:{9:{role,principle,fit}}, actingScenes:[...],
//     rituals:{symbol, anomalies:[...], anomalyAct}
//   })
function registerPathway(key, def){
  PATHWAYS[key] = {key, name:def.name, theme:def.theme||'', seq:def.sequences||def.seq||[], vague:def.vague||[def.theme||def.name],
    symbol:(def.rituals&&def.rituals.symbol)||'un símbolo propio', anomalies:(def.rituals&&def.rituals.anomalies)||['Algo se mueve donde no debería.'],
    anomalyAct:(def.rituals&&def.rituals.anomalyAct)||'Enfrentar la anomalía según tu vía', factions:def.factions||{}};
  if(!PATHWAY_LIST.includes(PATHWAYS[key])) PATHWAY_LIST.push(PATHWAYS[key]);
  if(def.ingredients) PATHWAY_INGREDIENTS[key] = def.ingredients;
  if(def.formulas) FIRST_POTIONS[key] = def.formulas;
  if(def.abilities) ABILITIES[key] = def.abilities;
  if(def.actingRoles) ACTING_ROLES[key] = def.actingRoles;
  if(def.actingScenes) def.actingScenes.forEach(s=>ACTING_SEEDS.push(Object.assign({pw:key}, s)));
  // Partidas en curso: la vía nueva aparece con sus valores iniciales.
  if(STATE && STATE.pathway){
    ['knowledge','belief'].forEach(f=>{ if(STATE.pathway[f][key]===undefined) STATE.pathway[f][key] = 0; });
    ['formulaKnown','firstDiscoveryShown','identified'].forEach(f=>{ if(STATE.pathway[f][key]===undefined) STATE.pathway[f][key] = false; });
  }
}
