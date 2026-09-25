'use strict';
/* =========================================================================
   systems/advancement.js — el ritual de Advancement (§21).
   No es "requisitos → botón → porcentaje". Es una escena de cinco pasos:
     1. preparar el lugar          4. controlar la espiritualidad
     2. comprobar los símbolos     5. reaccionar ante una anomalía
     3. beber la poción
   con sabor propio de cada vía (su símbolo, sus anomalías, su forma de
   responder). El resultado depende del conjunto:
     ritualPreparation (misiones/lugar), ritualAccuracy (tus decisiones),
     knowledge (comprensión de tu vía), digestion, sanity, corruption,
     spirituality, location, calidad de la poción/ingredientes,
     externalHelp (alguien que te asiste), fate.
   Antes del último paso hay un "presentimiento": información estimada de
   cómo viene, nunca un porcentaje.
   ========================================================================= */
function specialRequirementLabel(seq){
  if(seq >= 7) return null;
  if(seq === 6 || seq === 5) return 'Una oportunidad: un lugar de poder, una Característica o el permiso de una organización';
  if(seq === 4) return 'Un ritual de semidiós: una Característica de tu próxima Sequence o un lugar sagrado';
  return 'Algo que casi nadie tiene: una Característica de tu próxima Sequence';
}
function specialRequirementOk(seq){
  const p = STATE.pathway;
  if(seq >= 7) return true;
  if(p.advanceFlags[seq]) return true;
  const ch = characteristicFor(p.chosenPathway, seq-1);
  if(ch) return true;
  if(seq >= 5 && STATE.flags.factionRitualSite && factionAccess(STATE.flags.factionRitualSite) >= 4) return true;
  return false;
}
function advancementRequirements(){
  const p = STATE.pathway, c = STATE.character;
  const seq = p.sequence, target = seq - 1;
  const diff = ADVANCE_DIFFICULTY[seq] || ADVANCE_DIFFICULTY[1];
  const reqs = [];
  reqs.push({label:'La poción actual, digerida', ok: p.digestion >= (DIGESTION_REQ[seq]||100)});
  // Sequence 0 no es una poción: es la Unicidad y las Características (systems/divinity.js).
  if(target === 0){
    reqs.push({label:'Cordura suficiente', ok: c.sanity >= 50});
    reqs.push({label:'El camino al trono', ok: divinityReady()});
    return reqs;
  }
  reqs.push({label:`La poción de Sequence ${target}, preparada`, ok: potionItems(p.chosenPathway, target).length > 0});
  reqs.push({label:'Dinero para los materiales del ritual: '+fmtMoney(ritualCost()), ok: c.cash >= ritualCost()});
  reqs.push({label:'Cordura suficiente', ok: c.sanity >= 35});
  const sr = specialRequirementLabel(seq);
  if(sr) reqs.push({label:sr, ok: specialRequirementOk(seq)});
  return reqs;
}
function ritualCost(){ const d = ADVANCE_DIFFICULTY[STATE.pathway.sequence] || {moneyCost:1000}; return Math.round(d.moneyCost * 0.5 * priceIndex()); }

function attemptAdvancement(){
  if(timeBlocked()) return;
  const p = STATE.pathway;
  if(!p.chosenPathway || p.sequence <= 0){ toast('No hay un paso más allá.', 'neg'); return; }
  if(advancementRequirements().some(r=>!r.ok)){ toast('Todavía no estás listo para el ritual.', 'neg'); return; }
  if(p.sequence - 1 === 0){ startAscension(); return; }
  spendFreeTime(2, true); markMysticAct();
  const potion = potionItems(p.chosenPathway, p.sequence-1).sort((a,b)=>b.quality-a.quality)[0];
  STATE.ritual = {step:0, acc:0, place:null, potion:potion.uid, help:null, omens:[], anomaly:pick(PATHWAYS[p.chosenPathway].anomalies||['Algo sale de lo previsto.'])};
  openRitualStep();
  saveGame(true); renderAll();
}
function ritualSteps(){
  const p = STATE.pathway, pw = PATHWAYS[p.chosenPathway], r = STATE.ritual;
  const steps = [];
  const places = [{label:'En tu casa, con todo cubierto', small:'Conocés cada rincón. También tu familia.', v:0, place:'casa'}];
  const siteF = STATE.flags.factionRitualSite;
  if(siteF && factionAccess(siteF) >= 3) places.push({label:`En el espacio que te reservó ${factionShort(siteF)}`, small:'Consagrado y custodiado.', v:4, place:'faccion'});
  if(STATE.tarot.stage >= 7) places.push({label:'Sobre la niebla gris', small:'Nada de este mundo puede interrumpirte ahí.', v:5, place:'niebla'});
  places.push({label:'En un lugar abandonado, lejos de todos', small:'Nadie vería nada. Nadie ayudaría.', v:-1, place:'ruinas'});
  steps.push({title:'Preparar el lugar', text:`El ritual necesita un espacio propio: velas, el círculo, y en el centro el símbolo de tu vía: ${pw.symbol}. Tenés el conocimiento para armarlo, pero poco tiempo y menos calma.`, choices:places.concat([
    {label:'Prepararlo con calma meticulosa', small:'Más precisión, más tiempo.', v:2, place:'casa'}])});
  steps.push({title:'Comprobar los símbolos', text:'Antes de empezar de verdad, hay que revisar cada trazo, cada ingrediente en su lugar. Un error acá se paga después.', choices:[
    {label:'Revisar todo dos veces', small:'Más precisión.', v:'check'},
    {label:'Confiar en tu memoria', small:'Normal.', v:0},
    {label:'Empezar de una vez', small:'Arriesgado.', v:-2}]});
  steps.push({title:'Beber la poción', text:'Levantás el frasco. La poción de la próxima Sequence te espera, espesa, casi viva. Una vez que la bebas no hay vuelta atrás.', choices:[
    {label:'Beberla de un trago', small:'Sin pensar.', v:'gulp'},
    {label:'Beberla despacio, recitando el nombre de tu Sequence', small:'Con intención.', v:'recite'},
    {label:'Pedirle a alguien que te sostenga', small:'Una mano que te ancle.', v:'help'}]});
  steps.push({title:'Controlar la espiritualidad', text:'Tu espiritualidad se desborda. Hay que darle un cauce antes de que te arrastre.', choices:[
    {label:'Canalizarla hacia los símbolos', small:'Depende de tu espiritualidad.', v:'channel'},
    {label:'Dejarla fluir sin forzarla', small:'Seguro, pero pierde precisión.', v:1},
    {label:'Usar tu propio poder para contenerla', small:`Algo que haría un ${currentRole().role}.`, v:'role'}]});
  steps.push({title:'Una anomalía', text: r.anomaly + ' Tenés que decidir ahí mismo.', choices:[
    {label:'Mantener la concentración pase lo que pase', small:'Depende de tu espiritualidad.', v:'focus'},
    {label:'Frenar y corregir el error', small:'Seguro, pero pierde ímpetu.', v:1},
    {label:pw.anomalyAct || 'Responder según tu vía', small:'Lo que tu camino te enseñó.', v:'path'},
    {label:'Forzarlo hasta el final', small:'Todo o nada.', v:'force'}]});
  return steps;
}
function openRitualStep(){
  const r = STATE.ritual; const s = ritualSteps()[r.step];
  let text = s.text;
  // Presentimiento antes del último paso (información estimada, §40).
  if(r.step === 4) text += ' ' + ritualOmen();
  STATE.pendingEvent = {kind:'ritual', step:r.step, totalSteps:5, title:s.title, text, choices:s.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))};
  STATE._importantMoment = true;
}
function ritualOmen(){
  const s = ritualScore();
  if(s >= 70) return 'Por ahora, todo parece en orden. Casi demasiado.';
  if(s >= 55) return 'Algo no termina de encajar, pero sentís que podés con esto.';
  if(s >= 40) return 'Hay un temblor en el aire que no te gusta nada.';
  return 'Cada fibra de tu cuerpo te grita que pares.';
}
function resolveRitualChoice(idx){
  const r = STATE.ritual; if(!r){ STATE.pendingEvent = null; renderAll(); return; }
  const s = ritualSteps()[r.step]; const ch = s && s.choices[idx];
  STATE.pendingEvent = null;
  if(!ch){ STATE.ritual = null; renderAll(); return; }
  const c = STATE.character, p = STATE.pathway;
  let v = 0;
  if(typeof ch.v === 'number') v = ch.v;
  if(ch.place) r.place = ch.place;
  if(ch.v === 'check') v = knowledgeOf(p.chosenPathway) >= 50 ? 2 : 1;
  if(ch.v === 'gulp') v = chance(0.5) ? 1 : -2;
  if(ch.v === 'recite') v = actingMethodLevel() >= 1 ? 3 : 1;
  if(ch.v === 'help'){ const n = closeNpcs().filter(x=>x.knows.beyonder || x.hidden.pathway).sort((a,b)=>bondScore(b)-bondScore(a))[0]; if(n){ r.help = n.id; v = 2; adjustRel(n, {trust:4, dependence:3}); } else v = -1; }
  if(ch.v === 'channel') v = c.spirituality >= 50 ? 3 : c.spirituality >= 30 ? 1 : -1;
  if(ch.v === 'role') v = Math.round((p.acting.quality - 50)/12) + (actingMethodLevel()>=2 ? 1 : 0);
  if(ch.v === 'focus') v = c.spirituality >= 50 ? 3 : -1;
  if(ch.v === 'path') v = Math.round((p.acting.quality - 45)/10) + (pathwayMods().ritualAccuracy||0);
  if(ch.v === 'force'){ v = chance(0.5 + fateSave()*3) ? 4 : -4; }
  r.acc += v;
  r.step++;
  if(r.step < 5){ openRitualStep(); saveGame(true); renderAll(); return; }
  resolveAdvancement();
}
// Suma de todos los factores (0-100 aprox). No es sólo azar: es cómo llegaste.
function ritualScore(){
  const r = STATE.ritual || {acc:0}; const p = STATE.pathway, c = STATE.character;
  const potion = r.potion ? itemByUid(r.potion) : null;
  const locBonus = {casa:0, faccion:6, niebla:10, ruinas:-2}[r.place] || 0;
  const artifactBonus = inventoryItems().some(it=>it.cat==='artifact' && it.def==='candle' && !it.sealed && (it.known||{}).effects && it.known.effects.includes('ritual')) ? 3 : 0;
  let s = 40
    + clamp(r.acc, -10, 12) * 2.2                  // ritualAccuracy
    + (p.ritualPrepBonus||0) * 60                  // ritualPreparation
    + (knowledgeOf(p.chosenPathway) - 50) / 6      // knowledge
    + (potion ? (potion.quality - 60)/3 : -10)     // poción / ingredientes
    + (c.sanity - 60) / 5                          // sanity
    - c.corruption / 5                             // corruption
    + c.spirituality / 12                          // spirituality
    + locBonus + artifactBonus                     // location
    + (r.help ? 5 : 0)                             // externalHelp
    + (STATE.anchors.revealed ? STATE.anchors.identityStability/20 : 0)
    + (c.fate||0)/15;                              // fate
  if(potion && (potion.flaws||[]).includes('toxic')) s -= 30;
  if(potion && (potion.flaws||[]).includes('incomplete')) s -= 10;
  return clamp(Math.round(s), 0, 100);
}
function resolveAdvancement(){
  const r = STATE.ritual; const p = STATE.pathway, c = STATE.character;
  const seq = p.sequence, key = p.chosenPathway;
  const diff = ADVANCE_DIFFICULTY[seq] || ADVANCE_DIFFICULTY[1];
  const score = ritualScore();
  const potion = itemByUid(r.potion);
  STATE.ritual = null;
  if(potion) removeItem(potion.uid);
  applyEffects({cash:-ritualCost()});
  p.ritualPrepBonus = 0;
  // Probabilidad: la dificultad base de la Sequence, desplazada por el
  // puntaje del ritual. Un ritual muy bien hecho puede superar a una
  // Sequence difícil; uno mal hecho, no.
  const highSeqPenalty = seq <= 5 ? (diffMult('highSeq') - 1) * 0.15 : 0;
  const pSucc = clamp(diff.baseSuccess + (score - 50)/85 + diffMult('potion') - highSeqPenalty, 0.03, 0.93);
  const pw = PATHWAYS[key];
  if(chance(pSucc)){
    p.sequence = seq - 1; p.digestion = 0;
    delete p.advanceFlags[seq];
    const used = characteristicFor(key, seq-1); if(used && seq <= 6) removeItem(used.uid);
    if(STATE.flags.factionRitualSite && r.place==='faccion') STATE.flags.factionRitualSite = null;
    const nd = seqData(key, p.sequence);
    applyEffects({sanity:-rndInt(5,15), corruption:rndInt(1,6), spirituality:[5,12], humanity: -Math.max(1, Math.round((9 - p.sequence)/2))});
    p.acting = {history:[], quality:Math.round((p.acting.quality+50)/2), consistency:0.5, deviation:0};
    const text = `Las velas se apagan. Una fuerza desconocida parece observarte. El ritual concluye: alcanzás la Sequence ${p.sequence} — ${nd.name}. ${nd.ability}`;
    logJournal('ADVANCEMENT RITUAL — ÉXITO', text, {cat:'pathway', imp:3});
    addMilestone('advance', `Sequence ${p.sequence} — ${nd.name}`);
    remember('advanced_'+p.sequence, `Alcanzaste la Sequence ${p.sequence}: ${nd.name}.`, {cat:'achievement'});
    setResolution(`Sequence ${p.sequence} — ${nd.name}`, text, []);
    toast('Advancement exitoso: Sequence ' + p.sequence + ' — ' + nd.name, 'pos');
    queueSeal({kind:'advance', key, seq:p.sequence});
    if(p.sequence <= 5 && !STATE.anchors.revealed) revealAnchors();
    recomputeAnchors();
    // Subir llama la atención de quien mira estas cosas.
    raiseAttention(rndInt(2,6) + (9-p.sequence));
  } else {
    // Una buena preparación amortigua el golpe (§21: prepararse bien no evita
    // el error, pero cambia cuánto duele).
    const sev = Math.random() + (score-50)/150;
    let text;
    if(sev < 0.1 && c.sanity < 50){
      applyEffects({sanity:-rndInt(25,45), corruption:[8,15]});
      text = 'El ritual se desestabiliza por completo. Sentís cómo te alejás de vos mismo.';
      logJournal('ADVANCEMENT RITUAL — COLAPSO', text, {cat:'pathway', imp:3});
      if(STATE.character.sanity <= 0){ resolveLossOfControl(); saveGame(true); renderAll(); return; }
    } else if(sev < 0.3){
      applyEffects({salud:-rndInt(20,50), sanity:-rndInt(15,30), corruption:rndInt(5,15)});
      const cond = randomCondition('ritual'); if(cond) addCondition(cond);
      text = 'El ritual se desestabiliza. El precio del fracaso se cobra en carne, cordura y algo que ya no se va.';
      logJournal('ADVANCEMENT RITUAL — FRACASO GRAVE', text, {cat:'pathway', imp:3});
    } else {
      applyEffects({sanity:-rndInt(8,18), corruption:rndInt(2,8)});
      text = 'El ritual no prospera. La poción se pierde y las condiciones no eran las adecuadas. Podrás reintentarlo, con otra poción.';
      logJournal('ADVANCEMENT RITUAL — FRACASO', text, {cat:'pathway', imp:3});
    }
    remember('ritual_failed_'+seq, `Un ritual de Advancement te salió mal (Sequence ${seq-1}).`, {cat:'trauma'});
    setResolution('El ritual falló', text, []);
  }
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
// Oportunidad especial para Sequences altas (sistema original, ahora con
// más fuentes: exploración, facciones, Tarot Club).
function maybeGrantAdvanceFlag(){
  const p = STATE.pathway;
  if(!p.chosenPathway) return;
  const seq = p.sequence;
  const diff = ADVANCE_DIFFICULTY[seq];
  if(diff && diff.needsFlag && !p.advanceFlags[seq] && p.digestion >= 60){
    const pr = 0.004 + STATE.character.reputation/4000 + knowledgeOf(p.chosenPathway)/6000;
    if(chance(pr)) grantAdvanceFlag('Un acontecimiento poco común abre una puerta que normalmente permanece cerrada.');
  }
}
function grantAdvanceFlag(text){
  const p = STATE.pathway;
  if(!p.chosenPathway || p.advanceFlags[p.sequence]) return;
  p.advanceFlags[p.sequence] = true;
  logJournal('Oportunidad especial', text + ' El camino hacia la siguiente Sequence, por fin, parece posible.', {cat:'pathway', imp:3});
  toast('Se abrió una oportunidad especial de Advancement.', 'pos');
  STATE._importantMoment = true;
}
