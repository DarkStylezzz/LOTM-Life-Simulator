'use strict';
/* =========================================================================
   systems/character.js — el personaje: rasgos, nacimiento, cuerpo,
   educación, síntomas, heridas, humanidad, suerte y destino, muerte y
   pérdida de control.
   ========================================================================= */

/* ------------------------------ rasgos (original) ------------------------------ */
function traitByName(name){ return TRAITS_DATA.find(t=>t.name===name) || null; }
function weightedSampleNoRepeat(items, weightFn, n){
  const pool = items.slice(); const picked = [];
  for(let i=0;i<n && pool.length>0;i++){
    const total = pool.reduce((a,it)=>a+weightFn(it),0);
    let r = Math.random()*total; let idx = 0;
    for(; idx<pool.length; idx++){ r -= weightFn(pool[idx]); if(r<=0) break; }
    idx = Math.min(idx, pool.length-1);
    picked.push(pool[idx]); pool.splice(idx,1);
  }
  return picked;
}
function rollRandomTraits(n){ return weightedSampleNoRepeat(TRAITS_DATA, t=>TRAIT_RARITIES[t.rarity].weight, n).map(t=>t.name); }
function computeTraitMods(rasgosNames){
  const m = { cashMult:1, digestionMult:1, corruptionMult:1, sanityLossMult:1, healthLossMult:1, reputationMult:1,
    mysticExposureMult:1, combatMult:1, jobSearchBonus:0, startCash:0, startSalud:0, startSanity:0, startSpirituality:0, startReputation:0 };
  (rasgosNames||[]).forEach(name=>{
    const t = traitByName(name); if(!t) return;
    const mm = t.mods || {};
    for(const k in mm){ if(k.startsWith('start') || k==='jobSearchBonus') m[k] += mm[k]; else m[k] *= mm[k]; }
  });
  return m;
}
let _traitModsCache = {key:null, mods:null};
function getTraitMods(){
  const r = STATE && STATE.character ? STATE.character.rasgos : [];
  const key = (r||[]).join('|');
  if(_traitModsCache.key !== key){ _traitModsCache = {key, mods:computeTraitMods(r)}; }
  return _traitModsCache.mods;
}
function playerTags(){
  const tags = new Set();
  (STATE.character.rasgos||[]).forEach(r=>(TRAIT_TAGS[r]||[]).forEach(t=>tags.add(t)));
  return tags;
}
const TRAIT_RARITY_COLOR = {comun:'var(--ink-dim)', pocoComun:'#8fb591', raro:'#a999d6', legendario:'var(--gold-bright)'};

/* ------------------------------ suerte y destino (§42) ------------------------------ */
// Luck: corre un poco las probabilidades comunes (±0.1 como mucho).
function luckMod(){
  let l = STATE.character.luck ?? 50;
  if(STATE.flags.luckBuffUntil && STATE.flags.luckBuffUntil > STATE.time.totalMonths) l += STATE.flags.luckBuff || 0;
  return clamp((l - 50)/500, -0.1, 0.1);
}
// Fate: sólo pesa en momentos límite (muertes posibles, eventos
// extraordinarios). Reduce un poco la chance de un final — nunca la anula.
function fateSave(){
  const f = (STATE.character.fate || 0) + (pathwayMods().fate || 0);
  return clamp(f/500, 0, 0.08);
}

/* ------------------------------ nacimiento ------------------------------ */
function startNewGame(){
  const cd = creationData;
  STATE = freshState();
  STATE.settings.difficulty = cd.difficulty || 'normal';
  STATE.settings.world = cd.world || 'libre';
  const c = STATE.character;
  Object.assign(c, {
    nombre:cd.nombre, apellido:cd.apellido, edad:0, genero:cd.genero, ciudad:cd.ciudad, birthCity:cd.ciudad,
    clase:cd.clase, profesion:'Desempleado', educacion:'Sin escolarizar', rasgos:[...cd.rasgos]
  });
  STATE.flags.startClass = c.clase;
  STATE.time.startYear = STATE.settings.world === 'libre' ? rndInt(1300, 1345) : rndInt(1322, 1330);
  const cashByClass = {Baja:[50,180], Media:[300,900], Alta:[2200,6500]};
  const [cMin,cMax] = cashByClass[c.clase];
  const tm = computeTraitMods(c.rasgos);
  c.cash = Math.round(rndInt(cMin,cMax) + tm.startCash);
  c.salud = clamp(rndInt(82,98) + tm.startSalud, 1, 100);
  c.sanity = clamp(rndInt(80,95) + tm.startSanity, 1, 100);
  c.corruption = 0;
  c.spirituality = clamp(rndInt(3,14) + tm.startSpirituality, 0, 100);
  c.reputation = clamp(tm.startReputation, -100, 100);
  c.luck = clamp(rndInt(40,60), 0, 100); c.fate = rndInt(0,6);
  c.rasgos.forEach(r=>{ const f = TRAIT_FORTUNE[r]; if(f){ c.luck = clamp(c.luck + (f.luck||0), 0, 100); c.fate += f.fate||0; } });

  buildInitialCast();
  seedFactionFormulas();
  buildTimeline();
  STATE.started = true;
  seasonStart();
  STATE._yearSnap = {profesion:c.profesion, educacion:c.educacion, estadoCivil:c.estadoCivil, ciudad:c.ciudad, seq:null, net:c.cash};
  logJournal('El comienzo', `${c.nombre} ${c.apellido} nace en ${c.ciudad}, en ${fullDateLabel()}. Una vida como cualquier otra... por ahora.`, {cat:'life', imp:3});
  addMilestone('birth', `Nace en ${c.ciudad}`);
  showScreen('game');
  saveGame(true);
  renderAll();
}

/* ------------------------------ educación ------------------------------ */
function maybeAdvanceEducation(c){
  if(c.edad===6 && c.educacion==='Sin escolarizar'){
    c.educacion = 'Primaria (en curso)';
    if(c.profesion==='Desempleado') c.profesion = 'Estudiante';
    logJournal('Primer día de clases', `${c.nombre} empieza la escuela primaria.`, {cat:'life', imp:1});
  } else if(c.edad===13 && c.educacion==='Primaria (en curso)'){
    c.educacion = 'Secundaria (en curso)';
    logJournal('Nueva etapa', `${c.nombre} empieza la escuela secundaria.`, {cat:'life', imp:1});
  } else if(c.edad===18 && c.educacion==='Secundaria (en curso)'){
    c.educacion = 'Secundaria completa';
    if(c.profesion==='Estudiante') c.profesion = 'Desempleado';
    logJournal('Fin de la secundaria', `${c.nombre} termina la secundaria y se asoma a la vida adulta.`, {cat:'life', imp:1});
    addMilestone('achievement', 'Termina la secundaria');
  }
  // Universidad: cuatro años.
  if(c.university && c.edad - c.university.startAge >= 4){
    c.educacion = 'Universitaria completa'; c.university = null;
    if(c.profesion==='Estudiante') c.profesion = 'Desempleado';
    logJournal('Un diploma', `${c.nombre} se recibe en la universidad. Un papel con sellos que abre puertas que antes ni veías.`, {cat:'achievement', imp:2});
    addMilestone('achievement', 'Se recibe en la universidad');
    remember('graduated', 'Te recibiste en la universidad.', {cat:'achievement'});
  }
}
function startUniversity(){
  const c = STATE.character;
  c.university = {startAge:c.edad};
  c.educacion = 'Universitaria (en curso)';
  if(!isEmployed()) c.profesion = 'Estudiante';
  remember('university', 'Entraste a la universidad.', {cat:'choice'});
}

/* ------------------------------ síntomas y heridas ------------------------------ */
function addCondition(id){
  const c = STATE.character;
  if(!CONDITIONS[id]) return;
  if(c.conditions.some(x=>x.id===id)) return;
  c.conditions.push({id, since:calendarYear()});
  logJournal('Algo que no se va', `${CONDITIONS[id].name}: ${CONDITIONS[id].desc}`, {cat:'pathway', imp:2});
  remember('condition_'+id, `Te quedó para siempre: ${CONDITIONS[id].name.toLowerCase()}.`, {cat:'trauma'});
}
function removeCondition(id){ STATE.character.conditions = STATE.character.conditions.filter(x=>x.id!==id); }
function randomCondition(pool){
  const p = STATE.pathway.chosenPathway;
  if(p && PATHWAY_CONDITION_BIAS[p] && chance(0.35)) return PATHWAY_CONDITION_BIAS[p];
  const opts = (CONDITION_POOLS[pool]||CONDITION_POOLS.potion).filter(id=>!STATE.character.conditions.some(x=>x.id===id));
  return opts.length ? pick(opts) : null;
}
function conditionMods(){
  const m = {research:0, brew:0, combat:0, suspicion:0, work:0, healthLossMult:1, spiritualityCap:100, attention:0};
  (STATE.character.conditions||[]).forEach(x=>{
    const d = CONDITIONS[x.id]; if(!d) return;
    m.research += d.research||0; m.brew += d.brew||0; m.combat += d.combat||0; m.suspicion += d.suspicion||0; m.work += d.work||0;
    m.attention += d.attention||0;
    if(d.healthLossMult) m.healthLossMult *= d.healthLossMult;
    if(d.spiritualityCap) m.spiritualityCap = Math.min(m.spiritualityCap, d.spiritualityCap);
  });
  return m;
}
function spiritualityCap(){ return conditionMods().spiritualityCap; }
function addWound(kind){
  const w = WOUNDS[kind]; if(!w) return;
  STATE.character.wounds.push({id:kind, until: STATE.time.totalMonths + w.months});
}
function woundMods(){
  const m = {combat:0, work:0, freeTime:0};
  (STATE.character.wounds||[]).forEach(x=>{ const w = WOUNDS[x.id]; if(!w) return; m.combat += w.combat||0; m.work += w.work||0; m.freeTime += w.freeTime||0; });
  m.freeTime = Math.max(-1, m.freeTime);
  return m;
}

/* ------------------------------ el cuerpo, mes a mes ------------------------------ */
function monthlyBody(){
  const c = STATE.character;
  const mp = oldAgeMortalityParams();
  // Recuperación natural (se debilita con la edad; ver oldAgeMortalityParams).
  // El cuerpo se repara solo, cada vez menos; a partir del umbral, se gasta.
  const over = c.edad - mp.threshold;
  if(c.salud < 92){
    const heal = Math.round(pathwayMods().healMonthly || 0);
    let r = over < -15 ? rndInt(1,3) : over < 0 ? rndInt(1,2) : over < 12 ? rndInt(0,1) : (chance(0.5) ? 1 : 0);
    // Convalecencia: el cuerpo muy golpeado se concentra en reponerse.
    if(c.salud < 50) r += 1;
    if(c.salud < 25) r += 1;
    applyEffects({salud: r + heal});
  }
  if(over >= 0 && chance(0.4)) applyEffects({salud:-1});
  if(over >= 10 && chance(0.5)) applyEffects({salud:-1});
  if(over >= 20) applyEffects({salud:-rndInt(0,2)});
  // Recuperación de Cordura: la corrupción alta la frena; las anclas la empujan.
  if(c.sanity < 85){
    const regenPenalty = c.corruption > 50 ? 0.4 : 1;
    const anchorBonus = STATE.anchors.revealed ? Math.round(STATE.anchors.anchorStrength/40) : 0;
    const pr = pathwayMods().sanityRegen || 0;
    applyEffects({sanity: Math.max(1, Math.round(rndInt(1,3)*regenPenalty + anchorBonus + pr))});
  }
  // Estilo de vida.
  const ls = LIFESTYLES[c.lifestyle||'normal'];
  if(ls && ls.monthly && c.edad >= 18){
    if(ls.monthly.sanity && chance(Math.abs(ls.monthly.sanity))) applyEffects({sanity: Math.sign(ls.monthly.sanity)});
    if(ls.monthly.salud && chance(Math.abs(ls.monthly.salud))) applyEffects({salud: Math.sign(ls.monthly.salud)});
    if(ls.monthly.reputation && chance(Math.abs(ls.monthly.reputation)*4)) applyEffects({reputation: Math.sign(ls.monthly.reputation)});
  }
  // Síntomas permanentes.
  (c.conditions||[]).forEach(x=>{
    const d = CONDITIONS[x.id]; if(!d || !d.monthly) return;
    for(const k in d.monthly){ const v = d.monthly[k]; if(chance(Math.abs(v) % 1 || 1)) applyEffects({[k]: Math.sign(v) * Math.max(1, Math.floor(Math.abs(v)))}); }
  });
  // Heridas: sanan con el tiempo.
  if(c.wounds && c.wounds.length){
    const healed = c.wounds.filter(w=>w.until <= STATE.time.totalMonths);
    c.wounds = c.wounds.filter(w=>w.until > STATE.time.totalMonths);
    healed.forEach(w=>logJournal('Una herida que cierra', `${WOUNDS[w.id].name}: ya casi no se nota.`, {cat:'life'}));
    c.wounds.forEach(w=>{ const d = WOUNDS[w.id]; if(d && d.monthly) for(const k in d.monthly) if(chance(Math.abs(d.monthly[k]))) applyEffects({[k]: Math.sign(d.monthly[k])}); });
  }
  // Accidente o enfermedad grave aleatoria (rara).
  if(chance(0.003 * diffMult('death'))){
    applyEffects({salud:-rndInt(20,45)});
    logJournal('Accidente', 'Un accidente inesperado te deja gravemente herido.', {cat:'life', imp:2});
    STATE._importantMoment = true;
  }
}

/* ------------------------------ humanidad (§23) ------------------------------ */
// Cada Sequence más alta, sostener una vida humana cuesta más.
function agingHumanity(){
  const c = STATE.character, p = STATE.pathway;
  if(!p.chosenPathway) { c.humanity = clamp((c.humanity??100) + 1, 0, 100); return; }
  const seq = p.sequence;
  const drift = seq >= 8 ? 0 : seq >= 6 ? -1 : seq >= 4 ? -2 : -3;
  const hold = Math.round(STATE.anchors.anchorStrength/35) + (spouseNpc()?1:0);
  c.humanity = clamp((c.humanity??100) + drift + hold, 0, 100);
  if(c.humanity < 35 && chance(0.4)){
    logJournal('Cada vez más lejos', 'Una conversación cotidiana se siente como mirar un acuario desde afuera. Ya casi no recordás qué se sentía estar adentro.', {cat:'pathway', imp:1});
  }
}

/* ------------------------------ vejez y muerte ------------------------------ */
// Umbral/velocidad de la mortalidad por vejez según tu Sequence: un Saint o
// un Ángel ya no envejecen como una persona común; un Dios Verdadero no
// envejece de forma natural.
function oldAgeMortalityParams(){
  const seq = STATE.pathway.chosenPathway ? STATE.pathway.sequence : null;
  // threshold: edad a la que el cuerpo empieza a gastarse. span: cuánto tarda
  // la mortalidad anual en volverse alta (curva cuadrática, ver checkDeathAndCrisis).
  if(seq === null || seq >= 7) return {threshold:62,  span:28, cap:0.5};
  if(seq >= 5)                 return {threshold:90,  span:40, cap:0.4};
  if(seq === 4)                return {threshold:150, span:60, cap:0.3};
  if(seq >= 2)                 return {threshold:250, span:90, cap:0.25};
  if(seq === 1)                return {threshold:400, span:140, cap:0.2};
  return {threshold:Infinity, span:1, cap:0};
}
function checkDeathAndCrisis(){
  const c = STATE.character;
  if(STATE.gameOver || STATE.combat) return;
  if(c.sanity <= 0){ resolveLossOfControl(); if(STATE.gameOver) return; }
  if(c.salud <= 0){
    if(tryDollSave()) return;
    endGame('negative', 'Muerte física', `${c.nombre} ${c.apellido} no resiste más. El cuerpo cede tras años de desgaste.`, {cause:'salud'});
    return;
  }
  const mp = oldAgeMortalityParams();
  if(c.edad >= mp.threshold && STATE.time.month === 1){
    // Una tirada por año (antes era por mes, con la misma curva escalada).
    const x = Math.max(0, (c.edad - mp.threshold) / mp.span);
    const p = clamp(x*x*0.3 * diffMult('death'), 0, mp.cap) - fateSave();
    if(chance(Math.min(0.9, Math.max(0, p)))) endGame('natural', 'Una vida completa', '', {cause:'vejez'});
  }
}
// La muñeca de porcelana (artefacto) se rompe en tu lugar, una vez.
function tryDollSave(){
  const doll = STATE.inventory.items.find(it=>it.cat==='artifact' && it.def==='doll');
  if(!doll) return false;
  removeItem(doll.uid);
  STATE.character.salud = 20;
  logJournal('La muñeca', 'Ibas a morir. En el último instante escuchás, en tu casa, el ruido de porcelana haciéndose añicos. Respirás. La muñeca ya no está.', {cat:'mystery', imp:3});
  remember('doll_saved', 'La muñeca sin ojos se rompió en tu lugar.', {cat:'event'});
  STATE._importantMoment = true;
  return true;
}

/* ------------------------------ pérdida de control ------------------------------ */
function resolveLossOfControl(){
  const c = STATE.character;
  const corr = c.corruption;
  // Sin poción no hay "pérdida de control": hay un quiebre nervioso. Duro,
  // pero humano (§23: la vida normal y la mística no se sienten igual).
  if(!STATE.pathway.chosenPathway){
    STATE._importantMoment = true;
    const pMad = clamp(0.12 + corr/250 - fateSave() + (diffMult('death')-1)*0.1, 0.05, 0.4);
    if(chance(pMad)){
      endGame('negative', 'Locura', `${c.nombre} ${c.apellido} se quiebra. Pasa el resto de sus días internado, hablando de cosas que nadie más puede ver — y que, tal vez, eran reales.`, {cause:'locura'});
      return;
    }
    applyEffects({sanity:[28,38], reputation:[-6,-2]});
    const cond = randomCondition('control'); if(cond && chance(0.6)) addCondition(cond);
    remember('breakdown', 'Tuviste un quiebre nervioso.', {cat:'trauma'});
    logJournal('Un quiebre', 'Algo en vos se rompe. Semanas en cama, sin poder mirar a nadie a los ojos. Volvés, de a poco. No del todo igual.', {cat:'life', imp:3});
    return;
  }
  // La estabilidad de identidad (anclas) reduce el ANCHO de las dos peores
  // franjas (muerte y locura), no sólo dónde empiezan.
  const a = STATE.anchors;
  const stabilityBonus = (a.revealed || STATE.pathway.chosenPathway) ? (a.identityStability/100)*0.12 : 0;
  const resist = pathwayMods().lossOfControlResist || 0;
  const deathWidth = Math.max(0.02, (0.15 + corr/300 - stabilityBonus - resist) * diffMult('death'));
  const madnessWidth = Math.max(0.03, 0.20 - stabilityBonus - resist);
  const roll1 = Math.random() + fateSave();
  logJournal('PÉRDIDA DE CONTROL', 'Tu mente cede bajo la presión. Algo se quiebra.', {cat:'pathway', imp:3});
  STATE._importantMoment = true;
  if(roll1 < deathWidth){
    if(STATE.pathway.chosenPathway && chance(0.5)){
      endGame('negative', 'Lo que quedó de vos', `${c.nombre} ${c.apellido} pierde el control por completo. Lo que sale de su casa esa noche ya no responde a su nombre. Días después, los Nighthawks lo cazan en las alcantarillas.`, {cause:'control'});
    } else {
      endGame('negative', 'Muerte', `${c.nombre} ${c.apellido} pierde el control por completo. No sobrevive al colapso.`, {cause:'control'});
    }
  } else if(roll1 < deathWidth + madnessWidth){
    endGame('negative', 'Locura', `${c.nombre} ${c.apellido} cae en una locura irreversible. Pasa el resto de sus días internado, hablando de cosas que nadie más puede ver.`, {cause:'locura'});
  } else if(roll1 < 0.55){
    applyEffects({corruption: rndInt(10,25), sanity: 25});
    const cond = randomCondition('control'); if(cond) addCondition(cond);
    logJournal('Secuelas', 'Sobrevivís al colapso, pero algo en vos ha cambiado permanentemente. La corrupción avanza.', {cat:'pathway', imp:2});
    toast('Sobreviviste al colapso, pero con secuelas.', 'neg');
  } else if(roll1 < 0.75){
    applyEffects({sanity: 30});
    // Pérdida de recuerdos: se desvanece la comprensión de las vías que no son la tuya.
    for(const k in STATE.pathway.knowledge){ if(k !== STATE.pathway.chosenPathway) STATE.pathway.knowledge[k] = Math.floor(STATE.pathway.knowledge[k]*0.4); }
    for(const k in STATE.pathway.belief){ if(k !== STATE.pathway.chosenPathway) STATE.pathway.belief[k] = Math.floor(STATE.pathway.belief[k]*0.4); }
    logJournal('Pérdida de recuerdos', 'Recuperás algo de estabilidad, pero fragmentos enteros de tu memoria reciente se han perdido.', {cat:'pathway', imp:2});
    toast('Perdiste parte de tus recuerdos recientes.', 'neg');
  } else {
    applyEffects({sanity: 35, corruption: 5});
    logJournal('Recuperación con secuelas', 'De algún modo, lográs recomponerte. La experiencia te deja marcado, pero con vida.', {cat:'pathway', imp:2});
    toast('Te recuperaste, aunque marcado.', 'pos');
  }
  remember('lost_control', 'Perdiste el control, y volviste.', {cat:'trauma'});
}

function lifeStageLabel(edad){
  if(edad < 13) return 'Infancia';
  if(edad < 18) return 'Adolescencia';
  if(edad < 30) return 'Juventud';
  if(edad < 50) return 'Adultez';
  if(edad < 65) return 'Madurez';
  return 'Vejez';
}
