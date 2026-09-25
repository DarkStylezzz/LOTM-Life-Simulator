'use strict';
/* =========================================================================
   systems/missions.js — misiones y exploración.
   Misiones: cada temporada hay sólo algunas ofertas (no un menú infinito),
   más los deberes de las facciones a las que pertenecés. Aceptar una cuesta
   tiempo libre; la escena se guarda por id y sobrevive a recargar.
   Exploración: salir a buscar. Ingredientes, pistas, artefactos, gente...
   y peligros. Cada lugar tiene su perfil (data/exploration.js).
   ========================================================================= */
function strHash(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function missionEligible(m){
  try{ if(m.req && !m.req()) return false; }catch(e){ return false; }
  if(!m.repeatable && STATE.missions.completedIds.includes(m.id)) return false;
  if(m.faction && (factionAccess(m.faction) < (m.access||0) || factionHostile(m.faction))) return false;
  return true;
}
function availableMissions(){ return MISSION_TEMPLATES.filter(missionEligible); }
// Las ofertas de ESTA temporada: rotan, pero no cambian si recargás.
function missionOffers(){
  const season = Math.floor(STATE.time.totalMonths/3);
  const all = availableMissions();
  const duties = all.filter(m=>m.type==='Duty' || m.type==='Hidden Quest');
  const rest = all.filter(m=>!duties.includes(m)).sort((a,b)=>strHash(a.id+':'+season) - strHash(b.id+':'+season));
  return duties.concat(rest.slice(0, 3));
}
function acceptMission(id){
  if(timeBlocked()) return;
  if(STATE.character.edad < 14){ toast('Todavía sos muy chico para este tipo de encargos.', 'neg'); return; }
  if(!canUseSeasonAction('missions')){ toast('Ya tomaste un encargo esta temporada.', 'neg'); return; }
  const tpl = MISSION_BY_ID[id];
  if(!tpl || !missionEligible(tpl)){ toast('Ese encargo ya no está disponible.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  useSeasonAction('missions');
  if(tpl.faction) F(tpl.faction).lastDuty = STATE.time.totalMonths;
  STATE.pendingMission = { missionId:tpl.id, type:tpl.type, title:tpl.title, text:tpl.scene.text, risk:tpl.risk,
    choices: tpl.scene.choices.map((c,idx)=>({idx, label:c.label, small:c.small||''})) };
  STATE._importantMoment = true;
  saveGame(true); renderAll();
}
function resolveMissionChoice(idx){
  const pm = STATE.pendingMission; if(!pm) return;
  const tpl = MISSION_BY_ID[pm.missionId];
  STATE.pendingMission = null;
  if(!tpl){ saveGame(true); renderAll(); return; }
  const choice = tpl.scene.choices[idx];
  if(!choice){ saveGame(true); renderAll(); return; }
  if(!tpl.repeatable && !STATE.missions.completedIds.includes(tpl.id)) STATE.missions.completedIds.push(tpl.id);
  const before = snapshotForChanges();
  const jBefore = STATE.journal.length ? STATE.journal[0] : null;
  STATE._collect = [];
  try{ choice.resolve(); }catch(e){ console.error('Error resolviendo misión', tpl.id, e); }
  const collected = STATE._collect || [];
  delete STATE._collect;
  STATE.character.stats.missions = (STATE.character.stats.missions||0) + 1;
  if(STATE.gameOver) return;
  // El texto del resultado es lo que la misión dejó en el journal.
  const jNew = STATE.journal[0] && STATE.journal[0] !== jBefore ? STATE.journal[0] : null;
  if(jNew && (jNew.imp||0) < 2) jNew.imp = 2;
  if(jNew && tpl.faction && jNew.cat === 'life') jNew.cat = 'faction';
  if(!STATE.combat && !STATE.pendingEvent) setResolution(tpl.title, jNew ? jNew.text : choice.label, collected.length ? collected : diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}

/* ------------------------------ exploración ------------------------------ */
function explorationLocations(){
  const ck = currentCityKey(), city = currentCity();
  return EXPLORATION_LOCATIONS.filter(l=>(!l.port || city.port) && (!l.cities || l.cities.includes(ck)));
}
function explorationAvailable(l){
  const c = STATE.character;
  if(c.edad < (l.ageMin||0)) return {ok:false, why:`Desde los ${l.ageMin} años.`};
  if(l.req && !l.req()) return {ok:false, why:l.reqText || 'Todavía no.'};
  const cost = Math.round((l.cost||0)*priceIndex());
  if(cost > c.cash) return {ok:false, why:'No te alcanza el dinero.'};
  if(!canSpendFreeTime(l.time||1)) return {ok:false, why:'No te alcanza el tiempo libre.'};
  if(!canUseSeasonAction('explore')) return {ok:false, why:'Ya exploraste bastante esta temporada.'};
  return {ok:true};
}
function exploreLocation(id){
  if(timeBlocked()) return;
  const l = EXPLORATION_LOCATIONS.find(x=>x.id===id);
  if(!l) return;
  const av = explorationAvailable(l);
  if(!av.ok){ toast(av.why, 'neg'); return; }
  const c = STATE.character, pm = pathwayMods();
  spendFreeTime(l.time||1); useSeasonAction('explore');
  const cost = Math.round((l.cost||0)*priceIndex());
  if(cost) applyEffects({cash:-cost});
  const before = snapshotForChanges();
  raiseAttention(l.danger==='Extrema' ? rndInt(3,7) : l.danger==='Alta' ? rndInt(1,4) : rndInt(0,1));
  if(l.danger !== 'Baja') markMysticAct();
  // Pesos ajustados por quién explora y dónde.
  const w = Object.assign({}, l.outcomes);
  const cs = currentCityState();
  const dangerMult = worldDangerMult() * diffMult('threat') * (1 - clamp(pm.exploreSafe||0, 0, 0.6)) * (cs && cs.security < 40 ? 1.3 : 1);
  if(w.combat) w.combat *= dangerMult;
  const findMult = 1 + (pm.exploreFind||0)*3 + luckMod()*2 + (STATE.flags.compassUntil > STATE.time.totalMonths ? 0.6 : 0);
  ['ingredient','clue','artifact','lore'].forEach(k=>{ if(w[k]) w[k] *= findMult; });
  if(l.resonates && STATE.pathway.chosenPathway && l.resonates.includes(STATE.pathway.chosenPathway)){ if(w.ingredient) w.ingredient *= 1.5; if(w.clue) w.clue *= 1.2; }
  if(!eligibleIngredientPathways().length) w.ingredient = 0;
  if(maxPathwayKnowledge() < 10 && !STATE.pathway.chosenPathway) w.mystic = (w.mystic||0) * 0.5;
  const outcome = wpick(Object.keys(w), k=>w[k]) || 'nothing';
  let text = '';
  switch(outcome){
    case 'combat': {
      const pool = l.pool || (chance(0.35 + (l.danger==='Alta'?0.3:0) + (STATE.world.threat||0)/200) ? 'mystic' : 'mundane');
      logJournal('Exploración — '+l.name, 'Algo te encuentra antes de que vos encuentres algo.', {cat:'combat', imp:1});
      startCombat(pickEncounter(pool), {env:pick(l.env), source:'exploración'});
      saveGame(true); renderAll(); return;
    }
    case 'ingredient': {
      const got = grantIngredientFind(l.name, l.danger==='Alta' || l.danger==='Extrema');
      text = got ? `Entre ${l.name.toLowerCase()} encontrás algo que reconocés: ${got.name||'un ingrediente'}.` : 'Creés ver algo útil, pero cuando llegás ya no está.';
      break; }
    case 'clue': {
      const bias = l.resonates && chance(0.6) ? pick(l.resonates) : '$random';
      applyEffects({clue:{pathway:bias, reliability:'mixed', strength:[3,7], source:l.name.toLowerCase()}});
      text = pick(['Un símbolo tallado donde nadie debería poder llegar.', 'Marcas de un ritual reciente, hechas por alguien que sabía lo que hacía.', 'Un mendigo que dice haber visto algo, y lo describe demasiado bien.', 'Restos de algo que no era un animal.']);
      break; }
    case 'mystic': {
      const m = pickEventFromPool(d=>d.rarity==='mystic' || (d.type==='mystic' && ['common','uncommon'].includes(d.rarity)));
      if(m && fireEvent(m.def, m.ctx)){ saveGame(true); renderAll(); return; }
      applyEffects({sanity:[-3,-1], exposure:2});
      text = 'Durante un segundo, el lugar entero parece contener la respiración. Después, nada.';
      break; }
    case 'artifact': {
      const k = pick(ARTIFACT_KEYS.filter(a=>!hasArtifact(a)));
      if(k){ addArtifact(k, l.name.toLowerCase()); text = `Encontrás ${ARTIFACTS[k].foundText}`; }
      else text = 'Encontrás un escondite vacío. Alguien llegó antes.';
      break; }
    case 'lore': {
      const pool = lorePool(chance(0.5) ? 'forbidden' : 'secret').filter(x=>!knowsLore(x));
      if(pool.length){ learnLore(pick(pool), l.name.toLowerCase()); text = 'En una pared que nadie limpió en siglos hay algo escrito. Lo leés antes de pensar si deberías.'; }
      else text = 'Inscripciones viejas que ya conocés.';
      break; }
    case 'npc': {
      if(chance(0.5)){ const n = createMysticContact({}); remember('met_'+n.id, `Conociste a ${n.name} explorando ${l.name.toLowerCase()}.`, {cat:'person', npc:n.id}); text = `Te cruzás con ${n.name}, ${n.role.toLowerCase()}. Te mira como quien reconoce a alguien del mismo oficio.`; }
      else { const n = createNpc({met:true, relType:'acquaintance'}); text = `Conocés a ${n.name}, ${n.profession.toLowerCase()}. Charlan un rato.`; }
      break; }
    case 'mundane': text = wpick(EXPLORATION_MUNDANE, x=>x.w).run(); break;
    default: text = pick(['Recorrés el lugar de punta a punta sin encontrar nada memorable.', 'Volvés con los pies cansados y las manos vacías.', 'Nada. A veces el mundo no tiene nada para decirte.']);
  }
  if(l.id === 'travel' && chance(0.3)) applyEffects({reputation:[0,2]});
  logJournal('Exploración — '+l.name, text, {cat: outcome==='nothing'||outcome==='mundane' ? 'life' : 'mystery', imp: ['artifact','lore','ingredient'].includes(outcome) ? 2 : 1});
  setResolution(l.name, text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
