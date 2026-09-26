'use strict';
/* =========================================================================
   tests/scenarios.js — pruebas dirigidas de cada sistema, sin navegador.
   Cada escenario prepara un estado concreto, ejerce un sistema de punta a
   punta y verifica el resultado (y que no haya excepciones). Complementa a
   simulate.js (vidas al azar) cubriendo caminos que el azar casi nunca
   recorre: el Tarot Club, la cadena de Sequence 0, el modo divino, los
   finales, la migración de una partida vieja, cada habilidad de combate y
   cada escena de actuación de cada vía.
   Uso:  node tests/scenarios.js [filtro]
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, run, scriptList, makeStorage, ROOT } = require('./harness');

const STUBS = `var __toasts = []; var __seals = [];
  function renderAll(){} function toast(m){ __toasts.push(m); } function showScreen(){} function queueSeal(s){ __seals.push(s); }
  var creationData = null;`;
const systemScripts = scriptList().filter(s=>!s.startsWith('ui/') && s !== 'main.js');
const filter = process.argv[2] || '';

let passed = 0, failed = 0;
function fresh(storage){ return loadGame({scripts:systemScripts, prelude:STUBS, boot:false, storage}); }
function scenario(name, fn){
  if(filter && !name.includes(filter)) return;
  const t0 = Date.now();
  try{ fn(); passed++; console.log(`  ✔ ${name} (${Date.now()-t0} ms)`); }
  catch(e){ failed++; console.log(`  ✘ ${name}\n      ${String(e.stack||e).split('\n').slice(0,6).join('\n      ')}`); }
}
function assert(cond, msg){ if(!cond) throw new Error('Falla: ' + msg); }
const NEWLIFE = `creationData = {nombre:'Ana', apellido:'Vane', genero:'Mujer', ciudad:'Backlund', clase:'Media', rasgos:rollRandomTraits(3), difficulty:'normal', world:'libre'}; startNewGame();`;
function resolveAll(ctx, pick){
  // Resuelve todo lo pendiente (eventos, misiones, combate) con una política.
  return run(ctx, `(function(){ let n = 0;
    while((STATE.pendingEvent || STATE.pendingMission || STATE.combat) && n < 400 && !STATE.gameOver){ n++;
      if(STATE.pendingEvent){ const pe = STATE.pendingEvent; const i = (${pick||'0'}); resolvePendingEvent(Math.min(i, pe.choices.length-1)); }
      else if(STATE.pendingMission){ resolveMissionChoice(0); }
      else if(STATE.combat){ const a = combatActions().filter(x=>!x.disabled); combatAction((a.find(x=>x.id==='attack')||a[0]).id); }
    } return n; })()`);
}

console.log('Escenarios:');

scenario('guardar y recargar con una decisión pendiente', ()=>{
  const storage = makeStorage();
  const ctx = fresh(storage);
  run(ctx, NEWLIFE + `STATE.character.edad = 25;`);
  const fired = run(ctx, `triggerEventById('npc_needs_help') || triggerEventById('stranger_follow') || triggerEventById('teen_leave_school') || triggerEventById('life_meet_someone')`);
  assert(run(ctx, `!!STATE.pendingEvent`), 'no hay evento pendiente para probar (fired=' + fired + ')');
  run(ctx, `saveGame(true)`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame()`), 'loadGame falló');
  const pe = run(ctx2, `JSON.stringify(STATE.pendingEvent)`);
  assert(pe && pe !== 'null', 'el evento pendiente no sobrevivió a la recarga');
  run(ctx2, `resolvePendingEvent(0)`);
  assert(run(ctx2, `!STATE.pendingEvent || STATE.pendingEvent.defId !== ${JSON.stringify(JSON.parse(pe).defId)}`), 'el evento no se resolvió después de recargar');
});

scenario('Tarot Club sin buscarlo: los ecos y la invitación llegan solos', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.pathway.chosenPathway='sun'; STATE.pathway.sequence=8; STATE.flags.beyonderSince=0; invalidatePathwayMods(); STATE.tarot.stage = 0;`);
  // Un Beyonder que nunca oyó nada termina sabiendo que el club existe.
  for(let i=0;i<600 && run(ctx, `STATE.tarot.stage`) < 3;i++) run(ctx, `STATE.pendingEvent = null; tarotTick();`);
  assert(run(ctx, `STATE.tarot.stage`) >= 3, 'los ecos del club no llegaron');
  assert(run(ctx, `STATE.journal.some(j=>TAROT_ECHOES.some(e=>e.title===j.title))`), 'los ecos no quedaron en el diario');
  // Lista para la invitación: llega desde el tick, sin depender del sorteo de eventos raros.
  run(ctx, `STATE.pendingEvent = null; STATE.tarot.stage = 4; STATE.tarot.observed = 50; STATE.character.corruption = 0; STATE.character.sanity = 80;`);
  for(let i=0;i<600 && !run(ctx, `!!(STATE.pendingEvent && STATE.pendingEvent.defId === 'tarot_invitation')`);i++) run(ctx, `tarotTick();`);
  assert(run(ctx, `STATE.pendingEvent && STATE.pendingEvent.defId`) === 'tarot_invitation', 'la invitación no llegó sola');
});

scenario('el camino completo al Tarot Club', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.pathway.chosenPathway='sun'; STATE.pathway.sequence=8; STATE.flags.beyonderSince=0; invalidatePathwayMods();`);
  run(ctx, `tarotHear('a'); tarotHear('b'); tarotHear('c'); STATE.tarot.stage = 4; tarotObserve(15, 'devolviste lo ajeno'); tarotObserve(40, 'superaste la prueba');`);
  assert(run(ctx, `tarotInvitationReady()`), 'la invitación debería estar lista');
  assert(run(ctx, `triggerEventById('tarot_invitation')`), 'no se disparó la invitación');
  run(ctx, `resolvePendingEvent(0)`);
  assert(run(ctx, `STATE.tarot.stage`) === 6, 'no quedó como miembro');
  assert(run(ctx, `!!STATE.tarot.card`), 'no tiene carta');
  assert(run(ctx, `STATE.hiddenTruths.filter(h=>h.key && h.key.startsWith('tarot_eval_') && h.revealed).length`) >= 1, 'las pruebas ocultas no se revelaron al entrar');
  // Reuniones: cada opción.
  for(let i=0;i<5;i++){
    run(ctx, `STATE.tarot.lastMeeting = -99; STATE.factions.tarotClub.trust = 60; addCharacteristic('moon', 8, 'x'); learnLore('s_street','x'); learnLore('f_outer','x');`);
    assert(run(ctx, `triggerEventById('tarot_meeting')`), 'no se disparó la reunión');
    const n = run(ctx, `STATE.pendingEvent.choices.length`);
    run(ctx, `resolvePendingEvent(${i} % ${n})`);
    resolveAll(ctx);
  }
  run(ctx, `STATE.tarot.honorific = true; STATE.tarot.lastPrayer = -99; seasonStart(); tarotPray();`);
});

scenario('la cadena de Sequence 0, el ascenso y el modo divino', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 45; const p = STATE.pathway; p.chosenPathway='darkness'; p.sequence=1; p.digestion=100; STATE.flags.beyonderSince=0; identifyPathway('darkness'); invalidatePathwayMods();
    STATE.character.sanity = 90; STATE.character.reputation = 80; STATE.character.cash = 50000; STATE.divinity.seq1Since = STATE.time.totalMonths - 130;
    const n = createNpc({met:true, trust:90, affection:90, loyalty:80}); recomputeAnchors();`);
  assert(run(ctx, `triggerEventById('div_call')`), 'no se disparó el llamado');
  run(ctx, `resolvePendingEvent(0)`);
  assert(run(ctx, `STATE.divinity.stage`) === 1, 'no aceptó el llamado');
  let guard = 0;
  while(run(ctx, `STATE.divinity.stage`) < 2 && guard++ < 30){ run(ctx, `triggerEventById('div_uniqueness'); resolvePendingEvent(0);`); }
  assert(run(ctx, `STATE.divinity.stage`) === 2, 'no encontró la Unicidad');
  run(ctx, `triggerEventById('div_rival'); resolvePendingEvent(1);`); // negociar
  assert(run(ctx, `STATE.divinity.stage`) === 3, 'no resolvió al otro heredero');
  run(ctx, `triggerEventById('div_entities'); resolvePendingEvent(1);`); // pacto
  assert(run(ctx, `STATE.divinity.stage`) === 4, 'no pasó lo que mira desde afuera');
  run(ctx, `addCharacteristic('darkness', 2, 'x'); addCharacteristic('darkness', 1, 'y'); STATE.pendingConsequences = []; divinityTick();`);
  assert(run(ctx, `STATE.divinity.stage`) === 5, 'no reunió las Características');
  run(ctx, `STATE.character.sanity = 90; STATE.character.corruption = 10; STATE.anchors.followerBonus = 20; recomputeAnchors();`);
  const reqs = run(ctx, `JSON.stringify(divinityRequirements().filter(r=>!r.ok).map(r=>r.label))`);
  assert(run(ctx, `divinityReady()`), 'no está listo para el trono: ' + reqs);
  assert(run(ctx, `advancementRequirements().every(r=>r.ok)`), 'requisitos de advancement incompletos: ' + run(ctx, `JSON.stringify(advancementRequirements())`));
  // Forzar un ascenso exitoso: Math.random bajo durante la resolución.
  run(ctx, `seasonStart(); attemptAdvancement();`);
  assert(run(ctx, `STATE.pendingEvent && STATE.pendingEvent.kind`) === 'divinity', 'no empezó el ascenso');
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.01; for(let i=0;i<5 && STATE.pendingEvent;i++) resolvePendingEvent(0); Math.random = r0; })()`);
  assert(run(ctx, `isDivine()`), 'el ascenso no llevó al modo divino (gameOver=' + run(ctx,`STATE.gameOver`) + ')');
  assert(run(ctx, `STATE.pathway.sequence`) === 0, 'no es Sequence 0');
  // Modo divino: años que pasan, acciones, plegarias.
  for(let i=0;i<6;i++){
    run(ctx, `seasonStart(); ['watch','domain','mortal'].forEach(a=>{ if(!timeBlocked()) doDivineAction(a); }); doDivineAction('listen');`);
    resolveAll(ctx);
    run(ctx, `advanceTime(24)`);
    resolveAll(ctx);
  }
  run(ctx, `if(!STATE.gameOver) doDivineAction('end')`);
  assert(run(ctx, `STATE.gameOver && STATE.endingData.category`) === 'divine', 'el final divino no se registró');
  assert(run(ctx, `STATE.endingData.paragraphs.length`) >= 3, 'biografía vacía');
});

scenario('un ascenso fallido no rompe la partida', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 45; const p = STATE.pathway; p.chosenPathway='sun'; p.sequence=1; p.digestion=100; invalidatePathwayMods();
    STATE.character.sanity = 90; STATE.character.reputation = 80; STATE.divinity.stage = 5; STATE.divinity.seq1Since = -200; addCharacteristic('sun',2,'x'); addCharacteristic('sun',2,'x'); STATE.anchors.followerBonus = 20;`);
  run(ctx, `(function(){ seasonStart(); attemptAdvancement(); const r0 = Math.random; Math.random = ()=>0.97; for(let i=0;i<5 && STATE.pendingEvent;i++) resolvePendingEvent(1); Math.random = r0; })()`);
  assert(run(ctx, `STATE.gameOver || STATE.divinity.fallen >= 1 || isDivine()`), 'el ascenso no tuvo resultado');
});

scenario('finales: muerte natural con biografía y "lo que nunca supo"', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 80; addHiddenTruth('Tu hermano sabía todo.'); remember('x', 'Algo.', {cat:'betrayal'});`);
  run(ctx, `endGame('natural', 'Una vida completa', '', {cause:'vejez'})`);
  const ed = JSON.parse(run(ctx, `JSON.stringify(STATE.endingData)`));
  assert(ed.text && ed.text.length > 20, 'sin texto de muerte');
  assert(ed.paragraphs.length >= 4, 'pocos párrafos');
  assert(ed.neverKnew.length >= 1, 'sin verdades ocultas');
  assert(ed.stages.length >= 1, 'sin etapas');
  assert(!/score|puntaje/i.test(JSON.stringify(ed)), 'hay un puntaje');
});

scenario('desaparecer cuando te persiguen', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 35; factionMeet('mi9'); markHunted('mi9', 'prueba');`);
  assert(run(ctx, `canDisappear()`), 'debería poder desaparecer');
  run(ctx, `disappear()`);
  assert(run(ctx, `STATE.gameOver && STATE.endingData.meta.cause`) === 'desaparecido', 'no terminó como desaparición');
});

scenario('cada habilidad de combate de cada vía y cada Sequence', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30;`);
  const res = run(ctx, `(function(){ let uses = 0;
    for(const pw of Object.keys(PATHWAYS)){ for(let seq=9; seq>=1; seq--){
      STATE.gameOver = false; STATE.pathway.chosenPathway = pw; STATE.pathway.sequence = seq; invalidatePathwayMods();
      STATE.character.salud = 100; STATE.character.sanity = 100; STATE.character.spirituality = 100;
      startCombat(pick(['cultist','wraith','mugger','rivalBeyonder']), {});
      combatAbilities().forEach(a=>{ if(STATE.combat){ STATE.combat.player.cooldowns = {}; STATE.character.spirituality = 100; STATE.character.salud = 100; combatAction('ab:'+a.id); uses++; } });
      ['observe','defend','retreat','approach','attack','talk'].forEach(x=>{ if(STATE.combat && combatActions().some(y=>y.id===x)){ STATE.character.salud = 100; combatAction(x); } });
      STATE.combat = null; STATE.pendingEvent = null;
    } }
    return uses; })()`);
  assert(res > 100, 'se usaron muy pocas habilidades: ' + res);
});

scenario('cada escena de actuación de cada vía', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; createNpc({met:true, trust:60, affection:60});`);
  const n = run(ctx, `(function(){ let n = 0;
    for(const pw of Object.keys(PATHWAYS)){ for(let seq=9; seq>=1; seq--){
      STATE.pathway.chosenPathway = pw; STATE.pathway.sequence = seq; invalidatePathwayMods();
      for(let i=0;i<3;i++){ STATE.gameOver = false; STATE.character.sanity = 100; STATE.character.salud = 100; STATE.character.corruption = 0; seasonStart(); STATE.seasonActions.acting = 0; doActing(); if(STATE.pendingEvent && STATE.pendingEvent.kind==='acting'){ resolvePendingEvent(i % STATE.pendingEvent.choices.length); n++; } STATE.pendingEvent = null; STATE.combat = null; }
    } }
    return n; })()`);
  assert(n >= run(ctx, `Object.keys(PATHWAYS).length`)*9*3*0.9, 'escenas de actuación que no abrieron: ' + n);
});

scenario('las 22 vías: datos completos, y cada una se puede tomar y subir', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 25; STATE.character.cash = 500; STATE.character.bank = 999999;`);
  const keys = run(ctx, `Object.keys(PATHWAYS)`);
  assert(keys.length === 22, 'no son 22 vías: ' + keys.length);
  const problems = run(ctx, `(function(){ const out = []; const tags = new Set([].concat(...Object.values(TRAIT_TAGS)));
    const ids = new Set();
    for(const k of Object.keys(PATHWAYS)){
      const pw = PATHWAYS[k];
      for(let s=0; s<=9; s++){
        const sd = seqData(k, s); if(!sd || !sd.name || !sd.ability) out.push(k+': sin Sequence '+s);
        if(!(PATHWAY_INGREDIENTS[k] && PATHWAY_INGREDIENTS[k][s] && PATHWAY_INGREDIENTS[k][s].length)) out.push(k+': sin ingredientes '+s);
        if(!(ABILITIES[k]||[]).some(a=>a.seq===s)) out.push(k+': sin habilidad en la Sequence '+s);
        if(s >= 1){ const r = (ACTING_ROLES[k]||{})[s]; if(!r || !r.role || !r.principle) out.push(k+': sin rol '+s); else r.fit.forEach(t=>{ if(!tags.has(t)) out.push(k+': rasgo desconocido '+t); }); }
      }
      if(!(ABILITIES[k]||[]).some(a=>a.seq===9 && a.combat && a.cost)) out.push(k+': sin habilidad de combate en la Sequence 9');
      (ABILITIES[k]||[]).forEach(a=>{ if(ids.has(a.id)) out.push('habilidad repetida '+a.id); ids.add(a.id); });
      if(!FIRST_POTIONS[k]) out.push(k+': sin primera fórmula');
      if(!(pw.vague && pw.vague.length >= 3 && pw.symbol && pw.anomalies && pw.anomalies.length >= 3 && pw.anomalyAct)) out.push(k+': sin descriptores o ritual');
      if(ACTING_SEEDS.filter(x=>x.pw===k).length < 3) out.push(k+': menos de tres escenas');
      if(!PATHWAY_ENV_AFFINITY[k]) out.push(k+': sin afinidad de entorno');
      if(!TAROT_CARDS_BY_PATHWAY[k]) out.push(k+': sin carta del Tarot');
    }
    return out; })()`);
  assert(!problems.length, problems.slice(0, 8).join(' · '));
  // Cada vía nueva, de punta a punta: pistas, identificar, la primera poción y dos rituales.
  const fresh8 = ['demoness','paragon','wheelOfFortune','mother','abyss','chained','blackEmperor','justiciar'];
  for(const k of fresh8){
    run(ctx, NEWLIFE + `STATE.character.edad = 25; STATE.character.cash = 500; STATE.character.bank = 999999; STATE.character.sanity = 90;
      addClue({pathway:'${k}', reliability:'real', strength:30, source:'x'}); identifyPathway('${k}'); STATE.pathway.knowledge['${k}'] = 70;
      addFormula('${k}', 9, 'true', 'x'); ingredientsNeededFor('${k}', 9).forEach(n=>addIngredient('${k}', 9, n, 90, 'x')); seasonStart();`);
    assert(run(ctx, `brewRequirements('${k}', 9).every(r=>r.ok)`), k + ': no se puede preparar la primera poción');
    run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.05; startFirstPotion('${k}'); for(let i=0;i<6 && STATE.pendingEvent;i++) resolvePendingEvent(0); Math.random = r0; })()`);
    assert(run(ctx, `STATE.pathway.chosenPathway`) === k, k + ': no se volvió Beyonder');
    for(const seq of [8, 7]){
      run(ctx, `STATE.pathway.digestion = 100; STATE.character.sanity = 90; addFormula('${k}', ${seq}, 'true', 'x'); ingredientsNeededFor('${k}', ${seq}).forEach(n=>addIngredient('${k}', ${seq}, n, 90, 'x')); seasonStart();`);
      run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.02; attemptAdvancement(); let n = 0; while(STATE.pendingEvent && n < 8){ n++; resolvePendingEvent(0); } Math.random = r0; })()`);
      assert(run(ctx, `STATE.pathway.sequence`) === seq, k + ': el ritual no llevó a la Sequence ' + seq);
    }
    // El rol, los pasivos, las acciones de poder y una escena de actuación de la Sequence 7.
    assert(run(ctx, `currentRole().role === ACTING_ROLES['${k}'][7].role`), k + ': el rol de la Sequence 7 no es el propio');
    run(ctx, `invalidatePathwayMods(); pathwayMods(); powerActions(); seasonStart(); STATE.seasonActions.acting = 0; doActing(); if(STATE.pendingEvent) resolvePendingEvent(0); STATE.pendingEvent = null; STATE.combat = null;`);
    assert(!run(ctx, `STATE.gameOver`), k + ': la vida terminó en la prueba');
  }
});

scenario('Demoness: la poción de la Bruja cambia el cuerpo, no a quién se ama', ()=>{
  const ctx = fresh();
  const MAN = NEWLIFE.replace("nombre:'Ana'", "nombre:'Tomás'").replace("genero:'Mujer'", "genero:'Hombre'");
  run(ctx, MAN + `STATE.character.edad = 28; STATE.character.bank = 999999; STATE.character.sanity = 95;
    STATE.pathway.chosenPathway = 'demoness'; STATE.pathway.sequence = 8; STATE.pathway.digestion = 100; identifyPathway('demoness'); invalidatePathwayMods();
    addFormula('demoness', 7, 'true', 'x'); ingredientsNeededFor('demoness', 7).forEach(n=>addIngredient('demoness', 7, n, 90, 'x')); seasonStart();`);
  assert(run(ctx, `partnerGender()`) === 'f', 'antes de la poción, las parejas propuestas no eran mujeres');
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.02; attemptAdvancement(); let n = 0; while(STATE.pendingEvent && n < 8){ n++; resolvePendingEvent(0); } Math.random = r0; })()`);
  assert(run(ctx, `STATE.pathway.sequence`) === 7, 'no llegó a Bruja');
  assert(run(ctx, `STATE.character.genero`) === 'Mujer' && run(ctx, `STATE.flags.witchBody`) === true, 'la poción no cambió el cuerpo');
  assert(run(ctx, `partnerGender()`) === 'f', 'cambió a quién se ama');
  assert(run(ctx, `romanceCompatible(createNpc({gender:'f', ageMin:26, ageMax:30})) && !romanceCompatible(createNpc({gender:'m', ageMin:26, ageMax:30}))`), 'la compatibilidad romántica no sigue a partnerGender');
  assert(run(ctx, `STATE.journal.some(j=>j.title==='ADVANCEMENT RITUAL — ÉXITO' && j.text.includes('el cuerpo que te devuelve el espejo')) && gx('o','a') === 'a'`), 'no quedó escrito, o el texto no usa el femenino');
  // Una segunda poción no vuelve a hacer nada; y una mujer que llega a Bruja no cambia.
  assert(run(ctx, `witchTransformation()`) === '', 'la transformación se aplicó dos veces');
  run(ctx, NEWLIFE + `STATE.character.edad = 28; STATE.pathway.chosenPathway = 'demoness'; STATE.pathway.sequence = 7;`);
  assert(run(ctx, `witchTransformation() === '' && STATE.character.genero === 'Mujer' && !STATE.flags.partnerGender`), 'afectó a quien ya era mujer');
});

scenario('preparar y beber la primera poción; ritual de Advancement', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 25; STATE.character.cash = 500; STATE.character.bank = 99999; identifyPathway('moon'); STATE.pathway.knowledge.moon = 70;
    addFormula('moon', 9, 'true', 'la Iglesia'); ingredientsNeededFor('moon', 9).forEach(n=>addIngredient('moon', 9, n, 90, 'x')); seasonStart();`);
  assert(run(ctx, `brewRequirements('moon', 9).every(r=>r.ok)`), 'no cumple requisitos (el banco también cuenta): ' + run(ctx, `JSON.stringify(brewRequirements('moon',9))`));
  // Preparar y beber, en un solo paso.
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.05; startFirstPotion('moon'); for(let i=0;i<6 && STATE.pendingEvent;i++) resolvePendingEvent(0); Math.random = r0; })()`);
  assert(run(ctx, `STATE.pathway.chosenPathway`) === 'moon', 'no se convirtió en Beyonder');
  assert(run(ctx, `itemsByCat('ingredient').length`) === 0, 'la preparación no consumió los ingredientes');
  // Ritual a Sequence 8: sin preparar la poción aparte; se prepara en el ritual (cuatro pasos).
  run(ctx, `STATE.pathway.digestion = 100; addFormula('moon', 8, 'true', 'la Iglesia'); ingredientsNeededFor('moon', 8).forEach(n=>addIngredient('moon', 8, n, 90, 'x')); seasonStart(); STATE.character.sanity = 90;`);
  assert(run(ctx, `advancementRequirements().every(r=>r.ok)`), 'requisitos del ritual: ' + run(ctx, `JSON.stringify(advancementRequirements())`));
  const steps = run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.02; attemptAdvancement(); let n = 0; while(STATE.pendingEvent && n < 8){ n++; resolvePendingEvent(0); } Math.random = r0; return n; })()`);
  assert(steps === 4, 'el ritual debería tener cuatro pasos (tuvo ' + steps + ')');
  assert(run(ctx, `STATE.pathway.sequence`) === 8, 'el ritual no avanzó la Sequence (' + run(ctx, `STATE.pathway.sequence`) + ')');
  // Un ritual que falla: la fórmula queda, los ingredientes no; se puede reintentar.
  run(ctx, `STATE.pathway.digestion = 100; addFormula('moon', 7, 'true', 'la Iglesia'); ingredientsNeededFor('moon', 7).forEach(n=>addIngredient('moon', 7, n, 70, 'x')); seasonStart(); STATE.character.sanity = 90;`);
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.97; attemptAdvancement(); let n = 0; while(STATE.pendingEvent && n < 8){ n++; resolvePendingEvent(0); } Math.random = r0; })()`);
  assert(run(ctx, `STATE.pathway.sequence === 8 && hasFormula('moon', 7) && itemsByCat('ingredient').length === 0 && !STATE.gameOver`), 'un ritual fallido debería conservar la fórmula y gastar los ingredientes');
  // Ya no hay puertas especiales: de la Sequence 6 a la 5 alcanza con lo mismo.
  run(ctx, `STATE.pathway.sequence = 6; STATE.pathway.digestion = 100; addFormula('moon', 5, 'true', 'x'); ingredientsNeededFor('moon', 5).forEach(n=>addIngredient('moon', 5, n, 80, 'x')); seasonStart();`);
  assert(run(ctx, `advancementRequirements().every(r=>r.ok)`), 'la Sequence 5 pide algo más: ' + run(ctx, `JSON.stringify(advancementRequirements().filter(r=>!r.ok))`));
  // Una poción preparada con la versión anterior (o regalada) se usa directamente.
  run(ctx, `STATE.pathway.sequence = 8; STATE.pathway.digestion = 100; itemsByCat('ingredient').forEach(it=>removeItem(it.uid, it.qty)); quickBrew('moon', 7, 'regalo');`);
  assert(run(ctx, `advancementRequirements().some(r=>r.id==='potion' && r.ok)`), 'una poción ya preparada no cuenta');
  // Un ritual empezado con la versión anterior (cinco pasos) se cierra solo.
  run(ctx, `(function(){ const pot = potionItems('moon', 7)[0]; STATE.ritual = {step:4, acc:0, place:'casa', potion:pot.uid, help:null}; openRitualStep(); })()`);
  assert(run(ctx, `!STATE.ritual && !(STATE.pendingEvent && STATE.pendingEvent.kind === 'ritual')`), 'un ritual viejo quedó colgado');
});

scenario('buscar lo que te falta: de un hilo sin nombre a la poción, y de una Sequence a otra', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 22; STATE.character.cash = 99999; addClue({pathway:'darkness', reliability:'real', strength:20, source:'x'});`);
  const kinds = run(ctx, `(function(){ const seen = []; for(let i=0;i<60;i++){ seasonStart(); const m = nextMissing(); if(!m) break; if(!seen.includes(m.kind)) seen.push(m.kind); seekMissing(); STATE.pendingEvent = null; STATE.combat = null; } return seen; })()`);
  assert(kinds[0] === 'identify', 'empezó por algo que no era ponerle nombre al hilo: ' + kinds.join(','));
  // "Entender la vía" puede no hacer falta: a veces se entiende al ponerle nombre.
  assert(['formula','ingredient'].every(k=>kinds.includes(k)), 'no pasó por todos los pasos: ' + kinds.join(','));
  assert(run(ctx, `brewRequirements('darkness', 9).every(r=>r.ok)`), 'buscando no llegó a tener todo para la poción: ' + run(ctx, `JSON.stringify(brewRequirements('darkness', 9).filter(r=>!r.ok))`));
  // Siendo Beyonder: la fórmula y los ingredientes de la próxima Sequence.
  run(ctx, `STATE.pathway.chosenPathway = 'darkness'; STATE.pathway.sequence = 8; STATE.pathway.digestion = 100; invalidatePathwayMods();`);
  run(ctx, `(function(){ for(let i=0;i<40;i++){ seasonStart(); if(!nextMissing()) break; seekMissing(); STATE.pendingEvent = null; STATE.combat = null; } })()`);
  assert(run(ctx, `!nextMissing() && advancementRequirements().every(r=>r.ok)`), 'buscando no juntó lo necesario para el ritual: ' + run(ctx, `JSON.stringify(advancementRequirements().filter(r=>!r.ok))`));
  // Una vez por temporada.
  run(ctx, `STATE.pathway.sequence = 7; STATE.pathway.digestion = 100; seasonStart(); seekMissing(); STATE.pendingEvent = null; STATE.combat = null;`);
  assert(run(ctx, `!seekAvailable().ok && /temporada/.test(seekAvailable().why)`), 'se puede buscar dos veces en la misma temporada');
});

scenario('lo de semidiós: más lento, más escaso y nunca seguro', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 40; STATE.character.cash = 99999; const p = STATE.pathway; p.chosenPathway = 'moon'; p.sequence = 9; p.digestion = 0; identifyPathway('moon'); invalidatePathwayMods();`);
  // La digestión (de cualquier fuente) se frena con la altura.
  const d9 = run(ctx, `(function(){ STATE.pathway.digestion = 0; applyEffects({digestion:10}); return STATE.pathway.digestion; })()`);
  const d5 = run(ctx, `(function(){ STATE.pathway.sequence = 5; STATE.pathway.digestion = 0; applyEffects({digestion:10}); return STATE.pathway.digestion; })()`);
  assert(d9 > 0 && d5 > 0 && d5 < d9 * 0.5, `la digestión no se frena en la Sequence 5 (${d9} → ${d5})`);
  // Una organización no entrega lo de semidiós a cualquier miembro.
  run(ctx, `const f = F('church'); factionMeet('church'); f.formulas = ['moon']; f.relationship = 'miembro'; f.access = 3; f.merit = 99; seasonStart();`);
  const low = run(ctx, `factionRequestAvailable('church', 'ingredient')`);
  assert(!low.ok && /acceso/i.test(low.why), 'con acceso 3 te dan ingredientes de Sequence 4: ' + JSON.stringify(low));
  assert(!run(ctx, `factionRequestAvailable('church', 'formula').ok`), 'con acceso 3 te dan la fórmula de Sequence 4');
  run(ctx, `F('church').access = 4;`);
  assert(run(ctx, `factionRequestAvailable('church', 'ingredient').ok && factionRequestAvailable('church', 'formula').ok`), 'con acceso 4 no te dan lo de Sequence 4');
  // El mercado negro no llega tan alto.
  run(ctx, `learnLore('black_market', 'x'); STATE.bmOffers = null;`);
  assert(!run(ctx, `blackMarketOffers().some(o=>o.kind === 'formula' || o.kind === 'ingredient')`), 'el mercado negro vende lo de Sequence 4');
  run(ctx, `STATE.pathway.sequence = 7; STATE.bmOffers = null;`);
  assert(run(ctx, `blackMarketOffers().some(o=>o.kind === 'formula')`), 'el mercado negro dejó de vender lo de Sequence 6');
  // Buscar: lo de arriba es más difícil de encontrar; ningún ritual de semidiós es seguro.
  assert(run(ctx, `seekChance({kind:'formula', pathway:'moon', seq:3}) < seekChance({kind:'formula', pathway:'moon', seq:7})`), 'buscar una fórmula de Sequence 3 es tan fácil como una de 7');
  run(ctx, `STATE.pathway.sequence = 4;`);
  assert(run(ctx, `advanceSuccessChance(100)`) <= 0.6, 'un ritual perfecto hacia la Sequence 3 es casi seguro');
  run(ctx, `STATE.pathway.sequence = 9;`);
  assert(run(ctx, `advanceSuccessChance(100)`) >= 0.9, 'un ritual perfecto hacia la Sequence 8 no es casi seguro');
});

scenario('investigación, pistas, rumores y exploración', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.character.cash = 99999; learnLore('black_market','x'); createMysticContact({pathway:'death'}); addItem('doc_cipher',1,'x');`);
  run(ctx, `(function(){
    for(let r=0;r<6;r++) for(const id of RESEARCH_ORDER){ seasonStart(); resetSeasonActions(); const m = RESEARCH_METHODS[id]; if(researchAvailable(m).ok) doResearch(id, undefined, 'death'); STATE.combat = null; STATE.pendingEvent = null; }
    RUMOR_POOL.forEach(t=>{ addRumor(t.id); });
    for(let k=0;k<60;k++){ const l = activeLeads()[0]; if(!l) break; seasonStart(); followLead(l.id); STATE.combat = null; STATE.pendingEvent = null; }
    EXPLORATION_LOCATIONS.forEach(l=>{ for(let i=0;i<3;i++){ seasonStart(); resetSeasonActions(); STATE.flags.mysticExposure = 60; if(explorationAvailable(l).ok) exploreLocation(l.id); STATE.combat = null; STATE.pendingEvent = null; } });
  })()`);
  assert(run(ctx, `STATE.pathway.clues.length`) > 3, 'pocas pistas');
});

scenario('facciones: colaborar, unirse, pedidos, vender secretos, traicionar', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.pathway.chosenPathway='darkness'; STATE.pathway.sequence=8; identifyPathway('darkness'); invalidatePathwayMods(); learnLore('s_street','x');`);
  run(ctx, `(function(){
    FACTION_KEYS.forEach(k=>{ factionMeet(k); factionAdjust(k, {access:1}); });
    for(let i=0;i<8;i++) FACTION_KEYS.forEach(k=>{ seasonStart(); if(canCollaborate(k)) factionCollaborate(k); });
    ['church','nighthawks'].forEach(k=>{ seasonStart(); F(k).merit = 50; F(k).trust = 50; if(canJoin(k)) joinFaction(k); });
    ['formula','ingredient','training','protection','ritual','artifact'].forEach(w=>{ seasonStart(); F('nighthawks').merit = 50; F('nighthawks').access = 5; if(factionRequestAvailable('nighthawks', w).ok) factionRequest('nighthawks', w); });
    sellLoreTo('church', 's_street'); betrayFaction('church', 'mi9'); leaveFaction('nighthawks');
  })()`);
  assert(run(ctx, `huntingFactions().length`) >= 1, 'traicionar no tuvo consecuencias');
});

scenario('artefactos: cada uno, cada acción', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.character.cash = 99999; addItem('tool_sealed_box',1,'x'); learnLore('black_market','x'); factionMeet('church');`);
  run(ctx, `(function(){ ARTIFACT_KEYS.forEach(k=>{ const it = addArtifact(k, 'x');
    ['examine','study','study','study','use','use','seal','unseal','use'].forEach(a=>{ if(STATE.gameOver) return; seasonStart(); STATE.character.salud = 100; STATE.character.sanity = 100; if(itemByUid(it.uid) && !STATE.combat && !STATE.pendingEvent) artifactAction(it.uid, a); STATE.combat = null; STATE.pendingEvent = null; });
    if(itemByUid(it.uid)) artifactAction(it.uid, chance(0.5) ? 'sell' : 'handover:church');
    for(let m=0;m<12;m++){ STATE.gameOver = false; artifactMonthly(); STATE.pendingEvent = null; }
  }); })()`);
});

scenario('relaciones: cada interacción con distintas personas', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30; STATE.pathway.chosenPathway='visionary'; STATE.pathway.sequence=7; invalidatePathwayMods();`);
  const n = run(ctx, `(function(){ let n = 0; aliveNpcs().concat([createMysticContact({pathway:'death'}), createNpc({met:true, trust:80, affection:80})]).forEach(npc=>{
    INTERACTIONS.forEach(it=>{ seasonStart(); resetSeasonActions(); if(!npc.alive) return; const av = availableInteractions(npc).find(x=>x.id===it.id); if(av && av.ok !== false && !av.disabled){ doInteraction(npc.id, it.id); n++; } STATE.pendingEvent = null; STATE.combat = null; });
  }); return n; })()`);
  assert(n > 20, 'pocas interacciones disponibles: ' + n);
});

scenario('agregar una vía nueva sólo con datos (PATHWAYS.nueva)', ()=>{
  const ctx = fresh();
  run(ctx, `registerPathway('wheel', {name:'Wheel of Fortune', theme:'Suerte, destino, azar',
    sequences:[9,8,7,6,5,4,3,2,1,0].map(n=>({n, name:'Monje de la Rueda '+n, ability:'La suerte te mira de reojo.'})),
    vague:['la suerte','las monedas que caen de canto'], rituals:{symbol:'una rueda de ocho rayos', anomalies:['Una moneda cae de canto.']},
    ingredients:{9:['Una moneda de la suerte','Polvo de dado'], 8:['Trébol de siete hojas','Ojo de gato negro']},
    formulas:{name:'Fórmula del Monje', ingredientCost:300, prepDifficulty:0.6},
    abilities:[{seq:9, id:'wheel_luck', name:'Golpe de suerte', cost:{sp:2}, cooldown:2, combat:{dmg:1.4, negate:0.3}, passive:{fate:5}, desc:'La suerte empuja.'}],
    actingRoles:{9:{role:'Monje', principle:'Un Monje acepta lo que la Rueda trae.', fit:['lucky']}, 8:{role:'Monje mayor', principle:'Acepta.', fit:[]}}
  });`);
  run(ctx, NEWLIFE + `STATE.character.edad = 25; STATE.character.cash = 99999;
    addClue({pathway:'wheel', reliability:'real', strength:70, source:'x', confirm:true});
    addFormula('wheel', 9, 'true', 'la Iglesia'); ingredientsNeededFor('wheel', 9).forEach(n=>addIngredient('wheel', 9, n, 90, 'x')); seasonStart();`);
  assert(run(ctx, `isIdentified('wheel')`), 'la vía nueva no se identificó');
  run(ctx, `startBrew('wheel', 9)`); resolveAll(ctx);
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.05; seasonStart(); startDrinkPotion(potionItems('wheel',9)[0].uid); for(let i=0;i<6 && STATE.pendingEvent;i++) resolvePendingEvent(0); Math.random = r0; })()`);
  assert(run(ctx, `STATE.pathway.chosenPathway`) === 'wheel', 'no se pudo ser Beyonder de la vía nueva');
  run(ctx, `seasonStart(); doActing(); if(STATE.pendingEvent) resolvePendingEvent(0); startCombat('mugger', {}); combatAction('ab:wheel_luck'); STATE.combat = null;`);
  assert(run(ctx, `pathwayMods().fate`) === 5, 'los pasivos de la vía nueva no cuentan');
});

scenario('una vida larga en modo canónico y línea alternativa', ()=>{
  for(const world of ['canon','alternate']){
    const ctx = fresh();
    run(ctx, `creationData = {nombre:'Leo', apellido:'Hale', genero:'Hombre', ciudad:'Tingen', clase:'Baja', rasgos:rollRandomTraits(3), difficulty:'hard', world:'${world}'}; startNewGame();`);
    let guard = 0;
    while(!run(ctx, `STATE.gameOver`) && run(ctx, `STATE.character.edad`) < 60 && guard++ < 4000){
      resolveAll(ctx, 'Math.floor(Math.random()*pe.choices.length)');
      run(ctx, `if(!timeBlocked()) advanceOneSeason()`);
    }
    const tl = JSON.parse(run(ctx, `JSON.stringify((STATE.world.timeline||[]).map(e=>e.triggered))`));
    assert(tl.length > 0, 'línea temporal vacía en ' + world);
  }
});

scenario('migración: una partida del juego anterior (v7) se juega en la v8', ()=>{
  // 1) Crear una partida real con el juego viejo (app.js), si todavía existe.
  const legacy = path.join(ROOT, 'app.js');
  let saveJson;
  if(fs.existsSync(legacy)){
    const storage = makeStorage();
    const old = loadGame({scripts:['app.js'], prelude:'', boot:false, storage});
    run(old, `creationData = freshCreationData(); creationData.nombre='Klein'; creationData.apellido='Moretti'; creationData.genero='Hombre'; creationData.ciudad='Tingen'; creationData.clase='Media'; creationData.rasgos = rollRandomTraits(3); startNewGame();`);
    run(old, `(function(){ for(let i=0;i<260;i++){ if(STATE.gameOver) break;
      if(STATE.pendingEvent){ try{ const k = STATE.pendingEvent.kind; if(k==='decision') resolveDecisionChoice(0); else if(k==='acting') resolveActingChoice(0); else if(k==='ritual') resolveRitualChoice(0); else STATE.pendingEvent = null; }catch(e){ STATE.pendingEvent = null; } continue; }
      if(STATE.pendingMission){ STATE.pendingMission = null; continue; }
      if(STATE.combat){ STATE.combat = null; continue; }
      advanceOneMonth(); }
      STATE.pathway.knowledge.darkness = 60; STATE.pathway.firstDiscoveryShown.darkness = true; STATE.pathway.ingredientsOwned['darkness::' + PATHWAY_INGREDIENTS.darkness[9][0]] = 1;
      addInventoryItem('books','Libro sobre misticismo (fragmentario)','Libro');
      STATE.pendingEvent = {id:'viejo', title:'Una decisión vieja', text:'...', choices:[{label:'A'}]};
      saveGame(true); })()`);
    saveJson = storage.getItem('lotm_life_sim_save_v1');
    fs.writeFileSync(path.join(__dirname, 'fixtures-v7-save.json'), saveJson);
  } else {
    const f = path.join(__dirname, 'fixtures-v7-save.json');
    assert(fs.existsSync(f), 'no hay app.js ni una partida v7 de muestra (tests/fixtures-v7-save.json)');
    saveJson = fs.readFileSync(f, 'utf8');
  }
  assert(JSON.parse(saveJson).version === 7, 'la partida de muestra no es v7');
  // 2) Cargarla en la v8.
  const storage = makeStorage(); storage.setItem('lotm_life_sim_save_v1', saveJson);
  const ctx = fresh(storage);
  assert(run(ctx, `loadGame()`), 'la migración devolvió false');
  assert(run(ctx, `STATE.version`) === 8, 'versión no migrada');
  assert(run(ctx, `STATE.character.nombre`) === 'Klein', 'se perdió el nombre');
  assert(run(ctx, `isIdentified('darkness') && knowledgeOf('darkness') >= 60`), 'se perdió el conocimiento de la vía');
  assert(run(ctx, `itemsByCat('ingredient').length`) >= 1, 'se perdieron los ingredientes');
  assert(run(ctx, `itemsByCat('book').length`) >= 1, 'se perdieron los libros');
  assert(run(ctx, `!STATE.pendingEvent`), 'quedó una decisión vieja irresoluble');
  // 3) Jugar diez años.
  for(let i=0;i<40;i++){ resolveAll(ctx); run(ctx, `if(!timeBlocked()) advanceOneSeason()`); }
  assert(run(ctx, `!!STATE.journal.length`), 'journal vacío');
});

scenario('modo fácil: segundas oportunidades, recompensas y cambio de dificultad', ()=>{
  const EASY = NEWLIFE.replace("difficulty:'normal'", "difficulty:'easy'");
  const ctx = fresh();
  run(ctx, EASY + `STATE.character.edad = 25;`);
  assert(run(ctx, `STATE.settings.difficulty`) === 'easy', 'no quedó en Fácil');
  assert(run(ctx, `secondChancesLeft()`) === 3, 'Fácil debería dar tres segundas oportunidades');
  // 1) Una pelea perdida: sobrevive, herido.
  run(ctx, `startCombat('mugger', {}); const e = STATE.combat.enemy; e.hp = e.maxHp = 999; e.dmg = [80,80]; e.next = 'attack'; e.talk = 0; STATE.combat.distance = 0; STATE.character.salud = 5; combatAction('attack');`);
  assert(run(ctx, `!STATE.gameOver && !STATE.combat`), 'la pelea debería terminar sin terminar la vida');
  assert(run(ctx, `STATE.character.salud >= 12 && STATE.character.wounds.some(w=>w.id==='grave')`), 'debería sobrevivir con una herida grave');
  assert(run(ctx, `secondChancesLeft()`) === 2, 'no se descontó la segunda oportunidad');
  assert(run(ctx, `STATE.lastResolution && STATE.lastResolution.title`) === 'Todavía no', 'no se mostró lo que pasó');
  // 2) Salud en cero, fuera de combate; y una poción mortal.
  run(ctx, `STATE.character.salud = 0; checkDeathAndCrisis();`);
  assert(run(ctx, `!STATE.gameOver && STATE.character.salud > 0`), 'la salud en cero no usó la segunda oportunidad');
  run(ctx, `endGame('negative', 'La poción', 'x', {cause:'pocion'})`);
  assert(run(ctx, `!STATE.gameOver && secondChancesLeft() === 0`), 'la tercera segunda oportunidad no se usó');
  // 3) Sin segundas oportunidades, la muerte llega, y la biografía lo cuenta.
  run(ctx, `endGame('negative', 'Muerte violenta', 'x', {cause:'combate'})`);
  assert(run(ctx, `STATE.gameOver`), 'sin segundas oportunidades debería morir');
  assert(run(ctx, `STATE.endingData.paragraphs.some(p=>/Volvió de la muerte 3 veces/.test(p))`), 'la biografía no cuenta las veces que volvió');
  // 4) La vejez no se salva, y en Normal no hay segundas oportunidades.
  const ctx2 = fresh();
  run(ctx2, NEWLIFE + `STATE.character.edad = 30;`);
  assert(run(ctx2, `secondChancesLeft()`) === 0, 'Normal no tiene segundas oportunidades');
  run(ctx2, `endGame('negative', 'Muerte violenta', 'x', {cause:'combate'})`);
  assert(run(ctx2, `STATE.gameOver`), 'en Normal la muerte llega');
  const ctx3 = fresh();
  run(ctx3, EASY + `STATE.character.edad = 90; endGame('natural', 'Una vida completa', '', {cause:'vejez'})`);
  assert(run(ctx3, `STATE.gameOver`), 'la vejez no se salva');
  // 5) Recompensas: el mismo encargo paga más en Fácil que en Difícil (sueldos aparte).
  const pay = (diff)=>{ const c = fresh();
    run(c, `creationData = {nombre:'Ana', apellido:'Vane', genero:'Mujer', ciudad:'Backlund', clase:'Media', rasgos:[], difficulty:'${diff}', world:'libre'}; startNewGame(); STATE.character.edad = 25;`);
    return run(c, `(function(){ let t = 0; for(let i=0;i<200;i++){ STATE.character.salud = 100; const before = STATE.character.cash; STATE.pendingMission = {missionId:'mundane_move', choices:[]}; resolveMissionChoice(0); t += STATE.character.cash - before; } return t; })()`); };
  const easy = pay('easy'), hard = pay('hard');
  assert(easy > hard * 1.25, `las recompensas no dependen de la dificultad (fácil ${easy}, difícil ${hard})`);
  // 6) Cambiar la dificultad a mitad de la vida.
  const ctx4 = fresh();
  run(ctx4, NEWLIFE + `STATE.character.edad = 30; STATE.settings.difficulty = 'easy';`);
  assert(run(ctx4, `diffMult('enemyDmg') < 1 && diffAdd('potion') > 0 && secondChancesLeft() === 3`), 'el cambio a Fácil no tuvo efecto');
});

scenario('migración v7: una decisión o un encargo abiertos se reabren', ()=>{
  const f = path.join(__dirname, 'fixtures-v7-save.json');
  const base = JSON.parse(fs.readFileSync(f, 'utf8'));
  // a) Una decisión que existe en esta versión (mismo título).
  const withEvent = Object.assign({}, base, {pendingEvent:{kind:'decision', title:'Un hombre que no encaja', text:'...', choices:[{idx:0, label:'Seguirlo a distancia'}]}, pendingMission:null});
  let storage = makeStorage(); storage.setItem('lotm_life_sim_save_v1', JSON.stringify(withEvent));
  let ctx = fresh(storage);
  assert(run(ctx, `loadGame()`), 'la migración falló');
  assert(run(ctx, `STATE.pendingEvent && STATE.pendingEvent.defId`) === 'stranger_follow', 'la decisión no se reabrió');
  run(ctx, `resolvePendingEvent(0)`);
  assert(run(ctx, `!STATE.pendingEvent || STATE.pendingEvent.defId !== 'stranger_follow'`), 'la decisión reabierta no se pudo resolver');
  // b) Un encargo que existe en esta versión.
  const withMission = Object.assign({}, base, {pendingEvent:null, pendingMission:{missionId:'mundane_move', type:'Mundane', title:'Mudanza de un vecino', text:'...', choices:[{idx:0, label:'x'}]}});
  storage = makeStorage(); storage.setItem('lotm_life_sim_save_v1', JSON.stringify(withMission));
  ctx = fresh(storage);
  assert(run(ctx, `loadGame()`), 'la migración falló');
  assert(run(ctx, `STATE.pendingMission && STATE.pendingMission.missionId`) === 'mundane_move', 'el encargo no se reabrió');
  assert(run(ctx, `STATE.pendingMission.choices.length === MISSION_BY_ID.mundane_move.scene.choices.length`), 'el encargo no usa las opciones de ahora');
  run(ctx, `resolveMissionChoice(0)`);
  assert(run(ctx, `!STATE.pendingMission`), 'el encargo reabierto no se pudo resolver');
  // c) Una escena que ya no existe: se descarta con una nota.
  const withGhost = Object.assign({}, base, {pendingEvent:{kind:'acting', title:'Una escena que ya no existe', choices:[{idx:0, label:'A'}]}, pendingMission:null});
  storage = makeStorage(); storage.setItem('lotm_life_sim_save_v1', JSON.stringify(withGhost));
  ctx = fresh(storage);
  assert(run(ctx, `loadGame()`), 'la migración falló');
  assert(run(ctx, `!STATE.pendingEvent && STATE.journal.some(e=>e.title==='Una decisión que quedó atrás')`), 'la escena perdida no dejó su nota');
});

scenario('ciudades nuevas: nombres, oficios, mudanzas, lugares y rumores', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE.replace("ciudad:'Backlund'", "ciudad:'Trier'") + `STATE.character.edad = 20;`);
  assert(run(ctx, `currentCityKey()`) === 'trier', 'no nació en Trier');
  const intis = run(ctx, `(function(){ let k = 0; for(let i=0;i<20;i++){ const n = createNpc({}); const first = n.name.split(' ')[0]; if(NAME_STYLES.intis.m.includes(first) || NAME_STYLES.intis.f.includes(first)) k++; } return k; })()`);
  assert(intis >= 10, `la gente de Trier no tiene nombres de Intis (${intis}/20)`);
  assert(run(ctx, `explorationLocations().some(l=>l.id==='trier_below') && !explorationLocations().some(l=>l.id==='balam_temples')`), 'los lugares no dependen de la ciudad');
  assert(run(ctx, `jobEligible('Mozo/a de café') && !jobEligible('Minero/a')`), 'los oficios no dependen de la ciudad');
  assert(run(ctx, `moveCost('balam') > moveCost('pritz') * 1.8`), 'cruzar el océano debería costar más');
  run(ctx, `relocate('constant'); setJob('Minero/a');`);
  assert(run(ctx, `currentCityKey() === 'constant' && jobEligible('Minero/a')`), 'en Constant hay minas');
  run(ctx, `relocate('bayam');`);
  assert(run(ctx, `STATE.character.profesion`) === 'Desempleado', 'un minero en Bayam no puede seguir en la mina');
  // Rumores de ciudad: sólo corren donde corresponden.
  run(ctx, `relocate('balam'); STATE.leads = [];`);
  // Un rumor raro sale menos de una vez cada cien: con 1500 intentos, que no salga nunca es casi imposible.
  const rumors = run(ctx, `(function(){ const seen = {}; for(let i=0;i<1500;i++){ STATE.leads = []; const l = addRumor(); if(l) seen[l.rumor] = true; } return Object.keys(seen); })()`);
  assert(!rumors.includes('catacomb_mass') && !rumors.includes('mine_voice'), 'corren rumores de otras ciudades: ' + rumors.join(','));
  assert(rumors.includes('temple_king'), 'el rumor de Balam no aparece nunca');
  // Ciudades nuevas en una partida vieja: el estado se completa solo.
  const storage = makeStorage();
  const old = fresh(storage);
  run(old, NEWLIFE + `STATE.character.edad = 30; delete STATE.world.cities.trier; delete STATE.world.cities.balam; saveGame(true);`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame() && !!STATE.world.cities.trier && !!STATE.world.cities.balam`), 'una partida vieja no recibe las ciudades nuevas');
});

scenario('artefactos nuevos: examinar, estudiar, usar, pelear y guardarlos', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 35; STATE.character.cash = 5000; createNpc({met:true, trust:40, affection:40}); createNpc({id:'hijo1', role:'Hijo', relType:'family', met:true, age:10}); addItem('tool_sealed_box', 1, 'x');`);
  const keys = ['bone_idol','music_box','miner_lamp','spectacles','fountain_pen','key','tooth_rosary','spyglass','iron_crown'];
  for(const k of keys){
    run(ctx, `(function(){ STATE.gameOver = false; STATE.character.salud = 100; STATE.character.sanity = 90; STATE.pendingEvent = null; STATE.combat = null;
      const it = addArtifact('${k}', 'prueba');
      for(let i=0;i<4;i++){ seasonStart(); artifactAction(it.uid, i===0 ? 'examine' : 'study'); }
      const d = ARTIFACTS['${k}'];
      if(artifactUsable(d)){ seasonStart(); const k0 = artifactKnown(it); k0.drawbacks = d.drawbacks.map(x=>x.id); STATE.flags.secondChancesUsed = 0; artifactAction(it.uid, 'use'); }
      if(STATE.combat){ STATE.combat = null; }
      if(itemByUid(it.uid) && d.effects.some(e=>e.kind==='combat')){ startCombat('nightStalker', {}); combatAction('art:' + it.uid); STATE.combat = null; }
      for(let m=0;m<24;m++) artifactMonthly();
      if(itemByUid(it.uid)){ artifactAction(it.uid, 'seal'); artifactAction(it.uid, 'unseal'); }
    })()`);
    assert(run(ctx, `!STATE.gameOver || STATE.endingData.meta.cause === 'artefacto'`), 'el artefacto ' + k + ' terminó la vida de una forma rara');
    run(ctx, `STATE.gameOver = false;`);
  }
  // La llave abre una puerta en plena pelea.
  run(ctx, `(function(){ const it = artifactByKey('key') || addArtifact('key', 'x'); startCombat('mugger', {}); STATE.combat.enemy.hp = 999; combatAction('art:' + it.uid); })()`);
  assert(run(ctx, `!STATE.combat`), 'la llave no abrió una salida');
  // Lo que se rompe en tu lugar (la muñeca): sellada no protege.
  run(ctx, `(function(){ const d = addArtifact('doll', 'x'); d.sealed = true; STATE.character.salud = 0; STATE.flags.secondChancesUsed = 0; })()`);
  assert(run(ctx, `tryDollSave()`) === false, 'la muñeca sellada no debería salvar');
  run(ctx, `artifactByKey('doll').sealed = false;`);
  assert(run(ctx, `tryDollSave() && !artifactByKey('doll')`), 'la muñeca no se rompió en tu lugar');
  // La vela conocida ayuda al ritual.
  const before = run(ctx, `(function(){ STATE.ritual = {acc:0, place:'casa'}; STATE.pathway.chosenPathway = 'moon'; STATE.pathway.sequence = 8; return ritualScore(); })()`);
  const after = run(ctx, `(function(){ const c = addArtifact('candle', 'x'); c.known.effects.push('ritual'); return ritualScore(); })()`);
  assert(after > before, `la vela conocida no mejora el ritual (${before} → ${after})`);
});

scenario('mundo libre: la guerra corta termina, y las partidas trabadas en guerra se reparan', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 30;`);
  run(ctx, `applyTimelineEffect(RANDOM_HISTORY.find(t=>t.id==='rh_short_war').effect, {title:'Una guerra corta'});`);
  assert(run(ctx, `STATE.world.war`), 'la guerra no empezó');
  run(ctx, `(function(){ for(let i=0;i<26;i++){ STATE.time.totalMonths++; processPendingConsequences(); } })()`);
  assert(run(ctx, `!STATE.world.war`), 'la guerra corta no terminó nunca');
  // Una partida guardada en plena guerra eterna (el error anterior) se repara al cargar.
  const storage = makeStorage();
  const old = fresh(storage);
  run(old, NEWLIFE + `STATE.character.edad = 30; STATE.world.war = true; STATE.pendingConsequences = []; saveGame(true);`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame() && STATE.pendingConsequences.some(pc=>pc.effect && pc.effect.war === false)`), 'no se agendó la paz');
});

scenario('combate: la Sequence del rival pesa (vida, daño, ventaja y huida)', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 40; STATE.pathway.chosenPathway = 'seer'; STATE.pathway.sequence = 4;`);
  // Un Beyonder hostil de Sequence 9 es más débil que uno de 5; con vida y daño propios, se respetan.
  const avg = (seq)=> run(ctx, `(function(){ let hp = 0, d = 0; for(let i=0;i<40;i++){ startCombat('rivalBeyonder', {overrides:{seq:${seq}}}); hp += STATE.combat.enemy.maxHp; d += STATE.combat.enemy.dmg[1]; STATE.combat = null; } return [hp/40, d/40]; })()`);
  const [hp9, d9] = avg(9), [hp5, d5] = avg(5);
  assert(hp9 < hp5 && d9 < d5, `el rival de Sequence 9 (${hp9}/${d9}) debería ser más débil que el de 5 (${hp5}/${d5})`);
  run(ctx, `startCombat('rivalBeyonder', {overrides:{seq:2, hp:[140,140], dmg:[11,20]}})`);
  assert(run(ctx, `STATE.combat.enemy.maxHp === 140 && STATE.combat.enemy.dmg[1] === 20`), 'no respetó la vida y el daño del encuentro');
  // Llevarle cuatro Sequences reduce el daño recibido; al mismo nivel, nada.
  assert(run(ctx, `seqAdvantage() === 0 && seqAdvantageMult() === 1`), 'contra un rival más fuerte no hay ventaja');
  run(ctx, `STATE.combat = null; startCombat('rivalBeyonder', {overrides:{seq:8}})`);
  assert(run(ctx, `seqAdvantage() === 4 && seqAdvantageMult() < 0.6`), 'la ventaja de Sequence no se calcula');
  run(ctx, `STATE.combat = null; STATE.pathway.chosenPathway = null; startCombat('rivalBeyonder', {overrides:{seq:8}})`);
  assert(run(ctx, `seqAdvantage() === 0`), 'sin vía no hay ventaja de Sequence');
  // Cada huida fallida deja la siguiente más cerca.
  run(ctx, `const e = STATE.combat.enemy; e.fleeChance = -5; e.dmg = [0,0]; e.archetype = 'human'; e.talk = 0; e.sanityDmg = [0,0]; e.corruptionDmg = [0,0]; e.next = 'attack'; STATE.character.salud = 90; const r0 = Math.random; Math.random = ()=>0.999; try{ combatAction('flee'); combatAction('flee'); } finally { Math.random = r0; }`);
  assert(run(ctx, `STATE.combat && STATE.combat.player.fleeTries === 2`), 'no se cuentan los intentos de huida');
});

scenario('combate: los cazadores, la dificultad y el rival de una pista', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 40; const p = STATE.pathway; p.chosenPathway = 'moon'; p.sequence = 4; identifyPathway('moon'); invalidatePathwayMods();`);
  // Quien busca el mismo ingrediente que vos es de tu misma Sequence.
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.01; try{ resolveLead({rumor:'ingredient', outcome:'danger', pathway:'moon', seq:3, name:'x', price:0}); } finally { Math.random = r0; } })()`);
  assert(run(ctx, `!!STATE.combat && STATE.combat.enemy.key === 'rivalBeyonder' && STATE.combat.enemy.seq === 4`), 'el rival de la pista no es de tu Sequence: ' + run(ctx, `JSON.stringify(STATE.combat && {k:STATE.combat.enemy.key, s:STATE.combat.enemy.seq})`));
  // Después de un intento de huida fallido, el botón avisa que ahora es más fácil.
  run(ctx, `const e = STATE.combat.enemy; e.fleeChance = -5; e.dmg = [0,0]; e.sanityDmg = [0,0]; e.corruptionDmg = [0,0]; e.archetype = 'human'; e.talk = 0; e.next = 'attack'; const r0 = Math.random; Math.random = ()=>0.999; try{ combatAction('flee'); } finally { Math.random = r0; }`);
  assert(run(ctx, `!!STATE.combat && /más fácil/.test(combatActions().find(a=>a.id==='flee').small)`), 'huir no avisa que el próximo intento es más fácil');
  run(ctx, `STATE.combat = null;`);
  // A quien te estudió durante años, o a un Santo que perdió el control, cuesta más dejarlos atrás.
  assert(run(ctx, `[ENEMIES.demigodHunter, ENEMIES.fallenSaint].every(x=>x.fleeChance < ENEMIES.rivalBeyonder.fleeChance*0.6)`), 'los cazadores no son más difíciles de dejar atrás');
  // Difícil y Pesadilla pegan más fuerte y cuesta más huir.
  const d = run(ctx, `(function(){ const out = {}; ['normal','hard','nightmare'].forEach(k=>{ STATE.settings.difficulty = k; out[k] = [diffMult('enemyDmg'), diffAdd('flee')]; }); STATE.settings.difficulty = 'normal'; return out; })()`);
  assert(d.hard[0] > d.normal[0] && d.nightmare[0] > d.hard[0] && d.hard[1] < d.normal[1] && d.nightmare[1] < d.hard[1], 'la dificultad no cambia el combate: ' + JSON.stringify(d));
});

scenario('el linaje: morir, elegir heredero y seguir con la herencia', ()=>{
  const storage = makeStorage();
  const ctx = fresh(storage);
  run(ctx, NEWLIFE + `(function(){
    const c = STATE.character; c.edad = 58; c.cash = 3000; c.bank = 9000; c.debt = 0; c.reputation = 40;
    const p = STATE.pathway; p.chosenPathway = 'moon'; p.sequence = 7; p.actingMethod = 2; identifyPathway('moon'); invalidatePathwayMods();
    c.vivienda = {tipo:'Casa', valor:5000, city:currentCityKey()}; c.properties = [{valor:3000, city:currentCityKey(), since:calendarYear()}];
    const spouse = createNpc({gender:'m', relType:'acquaintance', age:57, met:true, trust:60, affection:70}); marryPartner(spouse, true); c.cash = 3000; c.bank = 9000;
    const a = birthChild(); a.ageOffset = -30; a.flags.married = true; a.flags.kids = 2; a.knows.beyonder = true; a.profession = 'Médico';
    const b = birthChild(); b.ageOffset = -46;
    addArtifact('mirror', 'x'); addItem('book_grimoire', 1, 'x'); addFormula('moon', 6, 'true', 'x');
    const loan = addArtifact('music_box', 'x'); if(loan) loan.loan = 'church';
    STATE.flags.will = 'equal';
    endGame('natural', 'Una vida completa', 'Muere en su cama.', {cause:'vejez'});
  })()`);
  assert(run(ctx, `STATE.gameOver`), 'la vida no terminó');
  const heirs = run(ctx, `lineageHeirs().map(n=>({id:n.id, age:npcAge(n)}))`);
  assert(heirs.length === 2 && heirs[0].age === 28 && heirs[1].age === 12, 'herederos: ' + JSON.stringify(heirs));
  const plan = run(ctx, `inheritancePlan(lineageHeirs()[0])`);
  // 12.000 netos: 40% para la viuda, el resto entre dos.
  assert(plan.money === 3600 && plan.house && plan.props === 1 && plan.characteristic && plan.characteristic.seq === 7, 'plan de herencia: ' + JSON.stringify(plan));
  const before = run(ctx, `({year: calendarYear(), timeline: STATE.world.timeline.length, spouseAge: npcAge(spouseNpc()), sibling: lineageHeirs()[1].name})`);
  assert(run(ctx, `succeedAs(lineageHeirs()[0].id)`), 'no se pudo seguir con el heredero');
  const st = run(ctx, `(function(){ const c = STATE.character; return {over:STATE.gameOver, started:STATE.started, name:c.nombre, sur:c.apellido, age:c.edad, g:c.genero, job:c.profesion, civil:c.estadoCivil,
    money:c.cash + c.bank, house:!!c.vivienda, props:(c.properties||[]).length, year:calendarYear(), timeline:STATE.world.timeline.length, lives:STATE.lineage.lives.length,
    parent: (npcById('madre')||{}).alive === false && (npcById('madre')||{}).name, other: npcById('padre') && npcById('padre').alive && npcAge(npcById('padre')), sibling: npcById('hermano1') && npcById('hermano1').name,
    spouse: !!spouseNpc(), kids: childrenNpcs().length, seq: STATE.pathway.sequence, clue: STATE.pathway.clues.some(x=>x.truth==='moon' && x.reliability==='real'),
    ch: itemsByCat('characteristic').some(it=>it.pathway==='moon' && it.seq===7), mirror: itemsByCat('artifact').some(it=>it.def==='mirror'), loan: itemsByCat('artifact').some(it=>it.loan),
    diary: inventoryItems().some(it=>it.def==='book_family_diary' && it.read && it.read.clue && it.read.clue.pathway==='moon'), formula: hasFormula('moon', 6), journal: STATE.journal[0] && STATE.journal[0].title}; })()`);
  assert(!st.over && st.started && st.sur === 'Vane' && st.age === 28, 'el heredero no quedó bien armado: ' + JSON.stringify(st));
  assert(st.year === before.year && st.timeline === before.timeline && st.lives === 1, 'el mundo no siguió igual: ' + JSON.stringify({st, before}));
  assert(st.parent && st.other === before.spouseAge && st.sibling === before.sibling, 'la familia no se reacomodó: ' + JSON.stringify(st));
  assert(st.money === 3600 && st.house && st.props === 1 && st.job === 'Médico/a', 'la herencia no llegó: ' + JSON.stringify(st));
  assert(st.spouse && st.kids === 2 && st.civil === 'Casado/a', 'la familia propia del heredero no aparece: ' + JSON.stringify(st));
  assert(st.seq === null && st.clue && st.ch && st.mirror && !st.loan && st.diary && st.formula && st.journal === 'El legado', 'el baúl, el diario o lo que sabía no llegaron: ' + JSON.stringify(st));
  // Leer el diario enseña algo de la vía (y del Método de Actuación).
  run(ctx, `seasonStart(); readItem(inventoryItems().find(it=>it.def==='book_family_diary').uid);`);
  assert(run(ctx, `STATE.pathway.actingMethodProgress > 0 || STATE.pathway.actingMethod > 0`), 'el diario no enseñó nada del Método');
  // Guardar y recargar.
  run(ctx, `saveGame(true)`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame() && STATE.lineage.lives.length === 1 && STATE.character.edad === 28 && !!npcById('hermano1')`), 'la partida del heredero no se recarga');
  // Una tercera generación: la segunda también puede cerrar su vida y dejarla.
  run(ctx, `(function(){ STATE.character.edad = 64; STATE.pendingEvent = null; STATE.combat = null; STATE.pendingMission = null; })()`);
  assert(run(ctx, `closeLifeAvailable().ok`), 'no se puede cerrar la vida a los 64');
  run(ctx, `closeLife()`);
  assert(run(ctx, `STATE.gameOver && STATE.endingData.meta.cause === 'retiro' && lineageHeirs().length > 0`), 'cerrar la vida no dejó herederos');
  assert(run(ctx, `inheritancePlan(lineageHeirs()[0]).characteristic === null`), 'quien se retira deja su Característica');
  assert(run(ctx, `succeedAs(lineageHeirs()[0].id) && STATE.lineage.lives.length === 2 && [npcById('padre'), npcById('madre')].some(n=>n && n.lifeState === 'lejos') && !!npcById('abuela')`), 'la tercera generación no quedó bien');
  // A los 30 no se puede cerrar una vida.
  run(ctx, `STATE.character.edad = 30;`);
  assert(!run(ctx, `closeLifeAvailable().ok`), 'se puede cerrar una vida a los 30');
});

scenario('tu organización: fundarla, conducirla, exponerla y dejarla', ()=>{
  const storage = makeStorage();
  const ctx = fresh(storage);
  run(ctx, NEWLIFE + `(function(){ const c = STATE.character; c.edad = 40; c.cash = 500; c.bank = 99999; c.reputation = 30;
    const p = STATE.pathway; p.chosenPathway = 'moon'; p.sequence = 6; p.actingMethod = 2; identifyPathway('moon'); invalidatePathwayMods();
    STATE.pendingSeals = []; seasonStart(); })()`);
  assert(!run(ctx, `orgFoundable('culto')`) && run(ctx, `orgFoundable('sociedad') && orgFoundable('orden')`), 'las condiciones para fundar no respetan la Sequence');
  assert(run(ctx, `(function(){ for(let s=1;s<=60;s++){ STATE.flags.orgNameSeed = s; for(const k of ORG_KIND_KEYS){ const ns = orgNameOptions(k); if(ns.length !== 3 || ns.some(n=>/[{}]|\\b(de|a) el\\b/.test(n))) return false; } } return true; })()`), 'los nombres propuestos están mal armados');
  run(ctx, `foundOrg('sociedad', orgNameOptions('sociedad')[1])`);
  const o = run(ctx, `({name:STATE.org.name, m:STATE.org.members, inner:STATE.org.inner.length, bank:STATE.character.bank})`);
  assert(o.m >= 4 && o.m <= 7 && o.inner === 1 && o.bank < 99999, 'la fundación no quedó bien: ' + JSON.stringify(o));
  // Doce temporadas conduciéndola: cada acción, y los invariantes siempre.
  const inv = run(ctx, `(function(){ const bad = []; const acts = ['recruit','funds','watch','lore','seek','recruit','hide','funds','recruit','seek','watch','recruit'];
    for(let i=0;i<acts.length;i++){
      STATE.character.edad = 40; STATE.character.salud = 90; STATE.character.sanity = 90; seasonStart();
      if(orgActionAvailable(acts[i]).ok) orgAct(acts[i]);
      for(let m=0;m<3;m++){ processMonth(); let k = 0; while((STATE.pendingEvent || STATE.pendingMission || STATE.combat) && k++ < 40){ if(STATE.pendingEvent) resolvePendingEvent(0); else if(STATE.pendingMission) resolveMissionChoice(0); else { const a = combatActions().filter(x=>!x.disabled); combatAction((a.find(x=>x.id==='flee')||a[0]).id); } } STATE.gameOver = false; }
      const o = STATE.org; if(!o) { bad.push('se disolvió sola'); break; }
      if(o.members < 1 || o.influence < 0 || o.influence > 100 || o.secrecy < 0 || o.secrecy > 100 || o.treasury < 0 || !Number.isFinite(o.treasury)) bad.push(JSON.stringify(o));
    }
    return {bad, m:STATE.org && STATE.org.members, t:STATE.org && STATE.org.treasury}; })()`);
  assert(!inv.bad.length, 'la organización quedó en un estado imposible: ' + inv.bad.slice(0,2).join(' · '));
  assert(inv.t > 0, 'la organización no juntó plata en tres años: ' + JSON.stringify(inv));
  // La caja, a tu bolsillo (una vez por temporada).
  run(ctx, `seasonStart(); STATE.org.treasury = 300;`);
  const cash0 = run(ctx, `STATE.character.cash`);
  run(ctx, `orgWithdraw()`);
  assert(run(ctx, `STATE.character.cash`) === cash0 + 300 && run(ctx, `STATE.org.treasury === 0 && !orgWithdrawAvailable().ok`), 'sacar la plata de la caja no funcionó');
  // Sin secreto, alguien pregunta; y si hay allanamiento, dispersarlos salva a la mayoría.
  const exp = run(ctx, `(function(){ STATE.org.secrecy = 5; STATE.org.members = 60; const s0 = FACTION_KEYS.reduce((a,k)=>a+F(k).suspicion,0);
    for(let i=0;i<12;i++){ STATE.org.lastTick = -99; orgTick(); STATE.org.secrecy = 5; }
    return {sus: FACTION_KEYS.reduce((a,k)=>a+F(k).suspicion,0) - s0, exposures: STATE.org.exposures}; })()`);
  assert(exp.exposures > 0 && exp.sus > 0, 'sin secreto, nadie preguntó: ' + JSON.stringify(exp));
  run(ctx, `STATE.pendingEvent = null; triggerEventById('org_raid', {faction:'church'});`);
  const raid = run(ctx, `(function(){ const m = STATE.org.members; const i = STATE.pendingEvent.choices.findIndex(c=>c.orig === 1); resolvePendingEvent(i); return {before:m, after:STATE.org.members, sec:STATE.org.secrecy}; })()`);
  assert(raid.after < raid.before && raid.after >= 1 && raid.sec > 5, 'el allanamiento no hizo lo esperado: ' + JSON.stringify(raid));
  // Un culto sostiene: suma seguidores a las anclas.
  run(ctx, `dissolveOrg(); STATE.pathway.sequence = 5; invalidatePathwayMods(); seasonStart(); STATE.character.bank = 99999;`);
  assert(run(ctx, `!STATE.org && (STATE.flags.orgHistory||[]).length === 1 && orgLifeLines()[0].startsWith('Fundó')`), 'disolverla no quedó en la historia');
  const f0 = run(ctx, `recomputeAnchors().followers`);
  run(ctx, `foundOrg('culto', orgNameOptions('culto')[0]); STATE.org.members = 60;`);
  assert(run(ctx, `recomputeAnchors().followers`) >= f0 + 20, 'el culto no sumó seguidores');
  // Se hereda: pasa a quien sigue la historia.
  run(ctx, `(function(){ const a = birthChild(); a.ageOffset = -25; a.knows.beyonder = true; endGame('natural', 'Una vida completa', 'x', {cause:'vejez'}); })()`);
  const inh = run(ctx, `(function(){ const name = STATE.org.name, m = STATE.org.members; const h = lineageHeirs()[0]; const ok = succeedAs(h.id); return {ok, org: STATE.org && STATE.org.name === name, m0:m, m:STATE.org && STATE.org.members, leader: STATE.org && STATE.org.leader, hist:(STATE.flags.orgHistory||[]).length}; })()`);
  assert(inh.ok && inh.org && inh.m < inh.m0 && inh.leader && inh.hist === 1, 'la organización no pasó al heredero: ' + JSON.stringify(inh));
  // Su biografía cuenta lo suyo: condujo el culto, no fundó lo de antes.
  const lines = run(ctx, `orgLifeLines()`);
  assert(lines.length === 1 && lines[0].startsWith('Condujo ') && lines[0].includes(', el culto que había fundado '), 'la biografía del heredero cuenta mal la organización: ' + JSON.stringify(lines));
  // Todo se guarda y se recarga.
  run(ctx, `saveGame(true)`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame() && !!STATE.org && STATE.org.members > 0 && typeof orgTick === 'function'`), 'la organización no se recarga');
  // Abandonada, se deshace de a poco.
  const gone = run(ctx2, `(function(){ STATE.org.lastAct = -999; for(let i=0;i<80 && STATE.org;i++){ STATE.org.lastTick = -99; orgTick(); } const h = STATE.flags.orgHistory || []; return {org: !!STATE.org, reason: h.length && h[h.length-1].reason}; })()`);
  assert(!gone.org && gone.reason === 'colapso', 'una organización abandonada no se deshace: ' + JSON.stringify(gone));
});

scenario('discípulos: tomarlos, enseñarles, su poción y seguir la historia como discípulo', ()=>{
  const storage = makeStorage();
  const ctx = fresh(storage);
  run(ctx, NEWLIFE + `(function(){ const c = STATE.character; c.edad = 50; c.cash = 500; c.bank = 99999;
    const p = STATE.pathway; p.chosenPathway = 'door'; p.sequence = 5; p.actingMethod = 2; identifyPathway('door'); invalidatePathwayMods();
    STATE.pendingSeals = []; seasonStart();
    globalThis.__a = createNpc({met:true, trust:65, affection:55, respect:50, age:22, allowHidden:false});
    globalThis.__b = createNpc({met:true, trust:65, affection:55, respect:50, age:30, allowHidden:false});
    globalThis.__c = createNpc({met:true, trust:65, affection:55, respect:50, age:28, allowHidden:false}); })()`);
  assert(run(ctx, `maxDisciples() === 2 && canTakeDisciple(__a) && !canTakeDisciple(createNpc({met:true, trust:10, age:25}))`), 'las condiciones para tomar un discípulo están mal');
  run(ctx, `(function(){ const r0 = Math.random; Math.random = ()=>0.01; offerDiscipleship(__a); offerDiscipleship(__b); Math.random = r0; })()`);
  assert(run(ctx, `!!__a.disciple && !!__b.disciple && __a.knows.beyonder && disciples().length === 2 && !canTakeDisciple(__c)`), 'no se respetó el cupo o no se tomaron');
  // Enseñar hasta la primera poción, con la plata y la ayuda del maestro (y la suerte de cara).
  const first = run(ctx, `(function(){ let n = 0; while(n++ < 20 && !STATE.pendingEvent){ STATE.time.totalMonths += 3; seasonStart(); doInteraction(__a.id, 'teach'); }
    const pe = STATE.pendingEvent && STATE.pendingEvent.defId; const r0 = Math.random; Math.random = ()=>0.01; resolvePendingEvent(0); Math.random = r0;
    return {pe, lessons: __a.disciple.lessons, seq: discipleSeq(__a), known: __a.known.pathway}; })()`);
  assert(first.pe === 'dis_ready' && first.seq === 9 && first.known, 'la primera poción del discípulo no salió: ' + JSON.stringify(first));
  // Sigue subiendo, pero nunca a tu altura (Sequence 5): el techo es la 6.
  const top = run(ctx, `(function(){ for(let k=0;k<80;k++){ STATE.time.totalMonths += 3; seasonStart(); STATE.pendingEvent = null; doInteraction(__a.id, 'teach'); if(STATE.pendingEvent){ const r0 = Math.random; Math.random = ()=>0.01; resolvePendingEvent(0); Math.random = r0; } }
    return {seq: discipleSeq(__a), reach: discipleCanReach(discipleTarget(__a))}; })()`);
  assert(top.seq === 6 && !top.reach, 'el discípulo no llegó al techo, o lo pasó: ' + JSON.stringify(top));
  // Una poción que sale mal (sin morir): pierde parte de lo avanzado.
  const fail = run(ctx, `(function(){ __b.disciple.progress = discipleNeed(9); const r0 = Math.random; Math.random = ()=>0.99; const t = discipleAdvance(__b, 'alone'); Math.random = r0;
    return {alive: __b.alive, seq: discipleSeq(__b), progress: __b.disciple.progress}; })()`);
  assert(fail.alive && fail.seq === null && fail.progress > 0 && fail.progress < 100, 'el fracaso de la poción no hizo lo esperado: ' + JSON.stringify(fail));
  // Un discípulo Beyonder a veces trae lo que te falta.
  const gift = run(ctx, `(function(){ STATE.pathway.digestion = 100; addFormula('door', 4, 'true', 'x'); const need = ingredientsNeededFor('door', 4); const before = need.reduce((a,n)=>a+ownedQty('door',n),0);
    __a.loyalty = 70; STATE.time.totalMonths += (3 - STATE.time.totalMonths % 3) % 3; const r0 = Math.random; Math.random = ()=>0.01; disciplesTick(); Math.random = r0;
    return need.reduce((a,n)=>a+ownedQty('door',n),0) - before; })()`);
  assert(gift >= 1, 'el discípulo no trajo el ingrediente que faltaba');
  // Muere el maestro: la historia puede seguir con el discípulo, como Beyonder de su vía.
  run(ctx, `(function(){ const s = createNpc({gender:'f', relType:'acquaintance', age:48, met:true, trust:60, affection:70}); marryPartner(s, true); const k = birthChild(); k.ageOffset = -20;
    STATE.character.bank = 20000; STATE.character.cash = 0; STATE.flags.will = 'equal';
    endGame('natural', 'Una vida completa', 'x', {cause:'vejez'}); })()`);
  const heirs = run(ctx, `lineageHeirs().map(n=>({id:n.id, dis:isDiscipleHeir(n), plan:inheritancePlan(n)}))`);
  const dh = heirs.find(h=>h.dis && h.id === run(ctx, `__a.id`));
  assert(heirs[0] && !heirs[0].dis && dh && dh.plan.disciple && dh.plan.seq === 6 && dh.plan.money === 1000 && !dh.plan.house && heirs[0].plan.money === 10800, 'los herederos o el legado del discípulo están mal: ' + JSON.stringify(heirs.map(h=>({id:h.id, dis:h.dis, money:h.plan.money, seq:h.plan.seq}))));
  // Si el testamento favorece al discípulo, se lleva lo que se hubiera llevado un hijo favorito, y las cuentas cierran.
  const fav = run(ctx, `(function(){ STATE.flags.will = 'favorite:' + __a.id; const k = bloodHeirs()[0]; const r = {d: inheritancePlan(__a), k: inheritancePlan(k)}; STATE.flags.will = 'equal'; return r; })()`);
  assert(fav.d.money === 8400 && fav.k.money === 3600 && fav.k.favored && !fav.k.house && fav.d.money + fav.k.money + (fav.k.spouse ? fav.k.spouse.amount : 0) === 20000, 'el testamento a favor del discípulo reparte mal: ' + JSON.stringify(fav));
  const st = run(ctx, `(function(){ const name = __a.name, id = __a.id; const ok = succeedAs(id); const p = STATE.pathway;
    const master = STATE.npcs.find(n=>/^maestro/.test(n.id));
    return {ok, first: STATE.character.nombre === name.split(' ')[0], pw: p.chosenPathway, seq: p.sequence, am: p.actingMethod, ident: isIdentified('door'),
      master: master && master.role, masterDead: master && !master.alive, family: STATE.npcs.filter(n=>n.flags.masterFamily).length, familyIsFamily: STATE.npcs.some(n=>n.flags.masterFamily && isFamilyNpc(n)),
      fellow: STATE.npcs.some(n=>n.flags.fellowDisciple && !n.disciple), gen: generationNumber(), kind: STATE.lineage.lives[0].heirKind, notebook: inventoryItems().some(it=>/cuadernos/.test(it.name)),
      bank: STATE.character.bank + STATE.character.cash }; })()`);
  assert(st.ok && st.first && st.pw === 'door' && st.seq === 6 && st.am === 2 && st.ident, 'el discípulo no siguió como Beyonder: ' + JSON.stringify(st));
  assert(st.master && st.masterDead && st.family >= 2 && !st.familyIsFamily && st.fellow && st.gen === 2 && st.kind === 'discipulo' && st.notebook && st.bank === 1000, 'la gente o el baúl del maestro quedaron mal: ' + JSON.stringify(st));
  // Se puede jugar y recargar.
  run(ctx, `(function(){ for(let m=0;m<24;m++){ processMonth(); let k = 0; while((STATE.pendingEvent || STATE.pendingMission || STATE.combat) && k++ < 40){ if(STATE.pendingEvent) resolvePendingEvent(0); else if(STATE.pendingMission) resolveMissionChoice(0); else { const a = combatActions().filter(x=>!x.disabled); combatAction((a.find(x=>x.id==='flee')||a[0]).id); } } if(STATE.gameOver) break; } })()`);
  run(ctx, `saveGame(true)`);
  const ctx2 = fresh(storage);
  assert(run(ctx2, `loadGame() && STATE.pathway.chosenPathway === 'door' && STATE.lineage.lives.length === 1`), 'la partida del discípulo no se recarga');
});

scenario('una vida muy larga: las épocas del mundo y los bisnietos', ()=>{
  const ctx = fresh();
  run(ctx, NEWLIFE + `STATE.character.edad = 70; STATE.pendingSeals = [];`);
  // Nadie ve una época antes de tiempo; cuando llega el año, empieza (una por mes, si se juntan varias).
  run(ctx, `eraTick()`);
  assert(run(ctx, `STATE.world.era`) === 0, 'empezó una época antes de tiempo');
  const eras = run(ctx, `(function(){ STATE.time.year += 250; let wars = 0; for(let i=0;i<WORLD_ERAS.length + 2;i++){ eraTick(); if(STATE.world.war) wars++; }
    return {era: STATE.world.era, wars, peace: STATE.pendingConsequences.some(pc=>pc.effect && pc.effect.war === false), log: STATE.world.log.length, journal: STATE.journal.filter(j=>j.cat==='world').length}; })()`);
  assert(eras.era === 6 && eras.wars > 0 && eras.peace && eras.journal >= 6, 'las épocas no pasaron como debían: ' + JSON.stringify(eras));
  assert(run(ctx, `triggerEventById('era_old_times') && STATE.journal[0].text === WORLD_ERAS[5].old`), 'el recuerdo de otra época no usa la última');
  // Bisnietos: aparecen en la biografía.
  run(ctx, `(function(){ STATE.character.grandchildren = 2; for(let i=0;i<3;i++) triggerEventById('fam_great_grandchild'); })()`);
  assert(run(ctx, `STATE.character.greatGrandchildren`) === 3, 'no nacieron los bisnietos');
  run(ctx, `endGame('natural', 'Una vida completa', 'x', {cause:'vejez'})`);
  assert(run(ctx, `STATE.endingData.paragraphs.join(' ').includes('3 bisnietos')`), 'la biografía no nombra a los bisnietos');
});

console.log(`\n${passed} escenarios OK, ${failed} con fallas.`);
if(failed) process.exitCode = 1;
