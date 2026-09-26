'use strict';
/* =========================================================================
   systems/advancement.js — subir de Sequence (§21), en versión simple.
   Para pasar a la próxima Sequence hacen falta cinco cosas, todas a la
   vista en la pestaña Misticismo:
     1. la poción actual, digerida (actuando tu papel);
     2. la fórmula de la próxima poción;
     3. sus ingredientes (el principal se puede reemplazar por una
        Característica de esa Sequence);
     4. el dinero del ritual (sale del bolsillo o del banco);
     5. la cabeza en su lugar (cordura suficiente).
   "Buscar lo que te falta" empuja siempre hacia el próximo paso que falta.
   La poción se prepara dentro del mismo ritual, una escena de cuatro pasos:
     el lugar · la poción · beberla · una anomalía (con un presentimiento).
   El resultado depende del conjunto (la calidad de la poción, tus
   decisiones, tu comprensión de la vía, cordura, corrupción,
   espiritualidad, el lugar, quien te ayuda, las anclas y el destino), pero
   ya no hay puertas cerradas: con todo lo anterior, siempre se puede
   intentar. Si falla, la fórmula queda; los ingredientes, no.
   Lo que frena de verdad es la altura: de la Sequence 5 para arriba la
   poción tarda años en digerirse, las fórmulas y los ingredientes casi no
   circulan y ningún ritual es seguro (ver ADVANCE_DIFFICULTY).
   ========================================================================= */

/* ------------------------------ plata: bolsillo o banco ------------------------------ */
function canAfford(amount){ const c = STATE.character; return c.cash + Math.max(0, c.bank) >= amount; }
// Paga primero con lo que tenés encima y el resto lo saca del banco.
function payFromCashOrBank(amount){
  const c = STATE.character;
  if(c.cash < amount && c.bank > 0){ const w = Math.min(c.bank, amount - c.cash); c.bank -= w; c.cash += w; }
  applyEffects({cash:-amount});
}
function advanceCost(){ const d = ADVANCE_DIFFICULTY[STATE.pathway.sequence] || {moneyCost:1000}; return Math.round(d.moneyCost * priceIndex()); }
// Compatibilidad: antes el ritual y la preparación se pagaban por separado.
function ritualCost(){ return advanceCost(); }

/* ------------------------------ lo que hace falta ------------------------------ */
// Cómo se consigue cada cosa (se muestra junto a lo que falta).
const ADVANCE_HINTS = {
  digest:  'Actuá tu papel cada temporada y viví como lo haría tu Sequence (hasta el trabajo cuenta).',
  formula: '"Buscar lo que te falta", pedírsela a tu organización o investigar tu propia vía.',
  ing:     '"Buscar lo que te falta", explorar, seguir rumores, vencer criaturas o pedírselo a tu organización.',
  money:   'Trabajo, encargos o ahorros: el ritual saca lo que falte del banco.',
  sanity:  'Descansá: tiempo con los tuyos y unas temporadas tranquilas.'
};
function advancementRequirements(){
  const p = STATE.pathway, c = STATE.character;
  const seq = p.sequence, target = seq - 1;
  const reqs = [];
  const slow = seq <= 5 ? ' A esta altura, la poción tarda años en asentarse.' : '';
  reqs.push({id:'digest', label:'La poción actual, digerida', ok: p.digestion >= (DIGESTION_REQ[seq]||100), hint:ADVANCE_HINTS.digest + slow});
  // Sequence 0 no es una poción: es la Unicidad y las Características (systems/divinity.js).
  if(target === 0){
    reqs.push({id:'sanity', label:'Cordura suficiente', ok: c.sanity >= 50, hint:ADVANCE_HINTS.sanity});
    reqs.push({id:'throne', label:'El camino al trono', ok: divinityReady()});
    return reqs;
  }
  if(potionItems(p.chosenPathway, target).length){
    reqs.push({id:'potion', label:`La poción de Sequence ${target}, ya preparada`, ok:true});
  } else {
    reqs.push({id:'formula', label:`La fórmula de Sequence ${target}`, ok: hasFormula(p.chosenPathway, target), hint:ADVANCE_HINTS.formula});
    ingredientsNeededFor(p.chosenPathway, target).forEach((ing,i)=>{
      const ch = i === 0 ? characteristicFor(p.chosenPathway, target) : null;
      reqs.push({id:'ing'+i, label:'Ingrediente: ' + ing + (ch ? ' (o la Característica que tenés)' : ''), ok: ownedQty(p.chosenPathway, ing) > 0 || !!ch, hint:ADVANCE_HINTS.ing});
    });
  }
  reqs.push({id:'money', label:'Dinero para el ritual: ' + fmtMoney(advanceCost()), ok: canAfford(advanceCost()), hint:ADVANCE_HINTS.money});
  reqs.push({id:'sanity', label:'Cordura suficiente', ok: c.sanity >= 35, hint:ADVANCE_HINTS.sanity});
  return reqs;
}
// Compatibilidad con código y partidas anteriores (ya no hay requisitos especiales).
function specialRequirementLabel(){ return null; }
function specialRequirementOk(){ return true; }

/* ------------------------------ buscar lo que te falta ------------------------------ */
// Una sola acción que siempre empuja hacia el próximo paso: identificar la
// vía, entenderla, conseguir la fórmula o un ingrediente. Una vez por
// temporada y un tiempo libre. Los otros caminos (investigar, explorar,
// rumores, organizaciones, mercado negro) siguen ahí: esto los resume.
// Antes de la primera poción: la vía por la que vas (la que tiene fórmula, o
// la que mejor entendés; si todavía no tiene nombre, el hilo más fuerte).
function firstPotionTarget(){
  const p = STATE.pathway;
  const ids = identifiedPathways();
  if(ids.length) return ids.slice().sort((a,b)=>(hasFormula(b,9)-hasFormula(a,9)) || knowledgeOf(b)-knowledgeOf(a))[0];
  const ts = Object.keys(PATHWAYS).filter(k=>(p.belief[k]||0) >= 15).sort((a,b)=>(p.belief[b]||0)-(p.belief[a]||0));
  return ts[0] || null;
}
function nextMissing(){
  const p = STATE.pathway;
  if(STATE.character.edad < 14) return null;
  if(p.chosenPathway){
    if(p.sequence <= 1 || isDivine()) return null;
    const t = p.sequence - 1;
    if(potionItems(p.chosenPathway, t).length) return null;
    if(!hasFormula(p.chosenPathway, t)) return {kind:'formula', pathway:p.chosenPathway, seq:t};
    const miss = ingredientsNeededFor(p.chosenPathway, t).find((n,i)=>ownedQty(p.chosenPathway, n) <= 0 && !(i === 0 && characteristicFor(p.chosenPathway, t)));
    return miss ? {kind:'ingredient', pathway:p.chosenPathway, seq:t, name:miss} : null;
  }
  const k = firstPotionTarget();
  if(!k) return null;
  if(!isIdentified(k)) return {kind:'identify', pathway:k};
  if(knowledgeOf(k) < 50) return {kind:'understand', pathway:k};
  if(!hasFormula(k, 9)) return {kind:'formula', pathway:k, seq:9};
  const miss = ingredientsNeededFor(k, 9).find(n=>ownedQty(k, n) <= 0);
  return miss ? {kind:'ingredient', pathway:k, seq:9, name:miss} : null;
}
// Cuanto más arriba, más escaso: lo de las primeras Sequences circula; lo de
// semidiós (Sequence 4 para arriba) casi no sale de las iglesias y las familias viejas.
const SEEK_SCARCITY = {9:0, 8:0, 7:0.04, 6:0.1, 5:0.18, 4:0.3, 3:0.38, 2:0.44, 1:0.48};
function seekChance(m){
  let ch = {identify:0.62, understand:0.7, formula:0.5, ingredient:0.55}[m.kind] || 0.5;
  const high = m.seq !== undefined && m.seq <= 4;
  if(m.seq !== undefined) ch -= SEEK_SCARCITY[m.seq] || 0;
  if(high && m.kind === 'formula') ch -= 0.08;                           // las fórmulas de semidiós, menos todavía
  let help = researchSkill('occult') * 0.5;
  if(memberFactions().some(k=>k !== 'tarotClub')) help += 0.1;           // una organización ayuda
  if(STATE.tarot.stage >= 6) help += 0.08;                                // la mesa de bronce, también
  if(high) help *= 0.5;                                                   // para eso, ni los buenos contactos alcanzan
  ch += help + (diffMult('hints') - 1) * 0.12;                            // Fácil +, Difícil y Pesadilla −
  return clamp(ch, high ? 0.06 : 0.12, 0.9);
}
function seekPrice(seq){
  const base = seq >= 8 ? rndInt(40,120) : seq >= 6 ? rndInt(150,400) : seq >= 4 ? rndInt(400,1000) : rndInt(1500,4000);
  return Math.round(base * priceIndex());
}
// Qué se va a buscar, en palabras (para la interfaz).
function seekTargetText(m){
  if(!m) return '';
  const named = isIdentified(m.pathway) ? `la vía ${PATHWAYS[m.pathway].name}` : 'el hilo que más te convence';
  if(m.kind === 'identify') return `ponerle nombre a ${named}`;
  if(m.kind === 'understand') return `entender mejor ${named}`;
  if(m.kind === 'formula') return `la fórmula de Sequence ${m.seq}`;
  return `un ingrediente: ${m.name}`;
}
function seekAvailable(){
  const m = nextMissing();
  if(!m) return {ok:false, why:'Por ahora no te falta nada que se pueda buscar.'};
  if(!canUseSeasonAction('seek')) return {ok:false, why:'Ya buscaste esta temporada.'};
  if(!canSpendFreeTime(1)) return {ok:false, why:'Sin tiempo libre.'};
  return {ok:true, m};
}
function seekMissing(){
  if(timeBlocked()) return;
  const av = seekAvailable();
  if(!av.ok){ toast(av.why, 'neg'); return; }
  const m = av.m;
  spendFreeTime(1); useSeasonAction('seek'); markMysticAct();
  const before = snapshotForChanges();
  raiseAttention(rndInt(0,2));
  const ok = chance(seekChance(m));
  const pw = PATHWAYS[m.pathway];
  const fac = memberFactions().find(k=>k !== 'tarotClub');
  let text = '';
  if(m.kind === 'identify' || m.kind === 'understand'){
    addClue({pathway:m.pathway, reliability:'real', strength: ok ? [7,12] : [2,4], source:'tu búsqueda'});
    text = ok ? pick([
      'Semanas de libros viejos, preguntas incómodas y una tarde entera con alguien que sabía más de lo que decía. Las piezas empiezan a encajar.',
      'Un anticuario, un sermón escuchado con otra atención, una nota en el margen de un libro prestado: esta vez todo apunta al mismo lado.',
      'Volvés sobre lo que ya sabías y, de golpe, lo ves ordenado. Hay un camino ahí, y empieza a tener forma.'])
      : 'Buscás durante semanas. Lo que encontrás es poco, pero no es nada: una pieza más.';
    if(isIdentified(m.pathway) && m.kind === 'identify') text += ` Ya tiene nombre: ${pw.name}.`;
  } else if(m.kind === 'formula'){
    if(ok){
      const src = fac ? factionName(fac) : pick(['un contacto que no hace preguntas', 'un Beyonder retirado que te debe un favor', 'el cuaderno de alguien que ya no lo necesita']);
      const f = addFormula(m.pathway, m.seq, 'true', src);
      // Lo que se consigue así es de fiar: no hay que adivinar si es falsa.
      if(f){ f.verified = true; f.risk = 'Verificada: es auténtica.'; }
      text = fac ? `Lo pedís por los canales de ${factionShort(fac)}. Tarda, pero llega: la fórmula de ${formulaName(m.pathway, m.seq)}, copiada a mano y sellada.`
                 : `Después de mucho preguntar, ${src} te consigue la fórmula de ${formulaName(m.pathway, m.seq)}. La revisás con cuidado: es auténtica.`;
    } else text = `Seguís tres pistas sobre la fórmula de Sequence ${m.seq}. Dos no llevan a ningún lado; la tercera, a alguien que pide tiempo. La próxima temporada, tal vez.`;
  } else {
    if(ok){
      const price = seekPrice(m.seq);
      if(canAfford(price)){
        payFromCashOrBank(price);
        addIngredient(m.pathway, m.seq, m.name, rndInt(55,90), 'tu búsqueda');
        text = `Lo encontrás: ${m.name}. ${pick(['Te lo vende un boticario que no pregunta para qué.', 'Estaba en la colección de un difunto que nadie supo valorar.', 'Un cazador lo trae del bosque, envuelto en un trapo.', 'Sale de la bodega de un barco que no figura en ningún registro.'])} Pagás ${fmtMoney(price)}.`;
      } else text = `Encontrás a quien tiene ${m.name}, pero pide ${fmtMoney(price)} y no te alcanza. Va a guardarlo un tiempo, dice. No mucho.`;
    } else text = `Buscás ${m.name} por toda la ciudad. Nadie lo tiene, o nadie lo admite. Otra temporada será.`;
  }
  logJournal('Buscar lo que te falta', text, {cat:'pathway', imp:1});
  setResolution('Buscar lo que te falta', text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}

/* ------------------------------ el ritual ------------------------------ */
function attemptAdvancement(){
  if(timeBlocked()) return;
  const p = STATE.pathway;
  if(!p.chosenPathway || p.sequence <= 0){ toast('No hay un paso más allá.', 'neg'); return; }
  if(advancementRequirements().some(r=>!r.ok)){ toast('Todavía no estás listo para el ritual.', 'neg'); return; }
  if(p.sequence - 1 === 0){ startAscension(); return; }
  const target = p.sequence - 1;
  spendFreeTime(2, true); markMysticAct();
  payFromCashOrBank(advanceCost());
  // Si todavía no tenés la poción, se prepara ahí mismo.
  let potion = potionItems(p.chosenPathway, target).sort((a,b)=>b.quality-a.quality)[0];
  let brewed = false;
  if(!potion){ potion = quickBrew(p.chosenPathway, target, 'preparada en el ritual'); brewed = true; }
  STATE.ritual = {v:2, step:0, acc:0, place:null, potion:potion.uid, brewed, paid:true, help:null, omens:[], anomaly:pick(PATHWAYS[p.chosenPathway].anomalies||['Algo sale de lo previsto.'])};
  openRitualStep();
  saveGame(true); renderAll();
}
function ritualSteps(){
  const p = STATE.pathway, pw = PATHWAYS[p.chosenPathway], r = STATE.ritual || {};
  const steps = [];
  const places = [{label:'En tu casa, con todo cubierto', small:'Conocés cada rincón. También tu familia.', v:0, place:'casa'},
                  {label:'En tu casa, preparándolo con calma meticulosa', small:'Más precisión.', v:2, place:'casa'}];
  const siteF = STATE.flags.factionRitualSite;
  if(siteF && factionAccess(siteF) >= 3) places.push({label:`En el espacio que te reservó ${factionShort(siteF)}`, small:'Consagrado y custodiado.', v:4, place:'faccion'});
  else if(memberFactions().some(k=>k !== 'tarotClub')) places.push({label:'En un lugar consagrado de tu organización', small:'Protegido. Controlado.', v:3, place:'faccion'});
  if(STATE.tarot.stage >= 7) places.push({label:'Sobre la niebla gris', small:'Nada de este mundo puede interrumpirte ahí.', v:5, place:'niebla'});
  places.push({label:'En un lugar abandonado, lejos de todos', small:'Nadie vería nada. Nadie ayudaría.', v:-1, place:'ruinas'});
  steps.push({title:'El lugar', text:`El ritual necesita un espacio propio: velas, el círculo, y en el centro el símbolo de tu vía: ${pw.symbol}.`, choices:places});
  if(r.brewed){
    steps.push({title:'La poción', text:'Sobre la mesa, la fórmula abierta y los ingredientes en fila. Cada uno tiene su temperatura, su orden, su medida exacta. La mezcla empieza a moverse sola antes de que termines.', choices:[
      {label:'Seguir la fórmula al pie de la letra', small:'Confiar en quien la escribió.', v:'literal'},
      {label:'Ajustar con tu intuición', small:'Vos sentís qué necesita la mezcla.', v:'intuition'},
      {label:'Revisar cada paso dos veces', small:'Lento, pero seguro.', v:'careful'}]});
  } else {
    steps.push({title:'La poción', text:'La poción ya está preparada, esperando en su frasco. Algo en el color te dice que está viva.', choices:[
      {label:'Revisarla con cuidado antes de empezar', small:'Por las dudas.', v:'check'},
      {label:'Confiar en ella', small:'Ya la revisaste antes.', v:0}]});
  }
  steps.push({title:'Beber la poción', text:'Levantás el frasco. Una vez que la bebas no hay vuelta atrás.', choices:[
    {label:'Beberla de un trago', small:'Sin pensar.', v:'gulp'},
    {label:'Beberla despacio, recitando el nombre de tu Sequence', small:'Con intención.', v:'recite'},
    {label:'Pedirle a alguien que te sostenga', small:'Una mano que te ancle.', v:'help'}]});
  steps.push({title:'Una anomalía', text: (r.anomaly || 'Algo sale de lo previsto.') + ' Tu espiritualidad se desborda y tenés que decidir ahí mismo.', choices:[
    {label:'Mantener la concentración pase lo que pase', small:'Depende de tu espiritualidad.', v:'focus'},
    {label:'Frenar y corregir el error', small:'Seguro, pero pierde ímpetu.', v:1},
    {label:pw.anomalyAct || 'Responder según tu vía', small:'Lo que tu camino te enseñó.', v:'path'},
    {label:'Forzarlo hasta el final', small:'Todo o nada.', v:'force'}]});
  return steps;
}
function openRitualStep(){
  const r = STATE.ritual; const steps = ritualSteps();
  // Un ritual empezado con la versión anterior (cinco pasos) se cierra solo.
  if(r.step >= steps.length){ resolveAdvancement(); return; }
  const s = steps[r.step];
  let text = s.text;
  // Presentimiento antes del último paso (información estimada, §40).
  if(r.step === steps.length - 1) text += ' ' + ritualOmen();
  STATE.pendingEvent = {kind:'ritual', step:r.step, totalSteps:steps.length, title:s.title, text, choices:s.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))};
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
  const steps = ritualSteps();
  const s = steps[r.step]; const ch = s && s.choices[idx];
  STATE.pendingEvent = null;
  if(!ch){ STATE.ritual = null; renderAll(); return; }
  const c = STATE.character, p = STATE.pathway;
  const pot = itemByUid(r.potion);
  let v = 0;
  if(typeof ch.v === 'number') v = ch.v;
  if(ch.place) r.place = ch.place;
  if(ch.v === 'literal'){ const fid = pot ? pot.fidelity : 'true'; v = fid === 'true' ? 2 : -1; if(pot) pot.quality = clamp(pot.quality + (fid === 'true' ? 6 : -4), 0, 100); }
  if(ch.v === 'intuition'){ const good = knowledgeOf(p.chosenPathway) >= 60 || playerTags().has('intuitive'); const d = good ? rndInt(0,12) : rndInt(-8,10); v = d >= 4 ? 2 : d < 0 ? -1 : 0; if(pot) pot.quality = clamp(pot.quality + d, 0, 100); }
  if(ch.v === 'careful'){ v = 1; if(pot) pot.quality = clamp(pot.quality + 3, 0, 100); }
  if(ch.v === 'check') v = knowledgeOf(p.chosenPathway) >= 50 ? 2 : 1;
  if(ch.v === 'gulp') v = chance(0.5) ? 1 : -2;
  if(ch.v === 'recite') v = actingMethodLevel() >= 1 ? 3 : 1;
  if(ch.v === 'help'){ const n = closeNpcs().filter(x=>x.knows.beyonder || x.hidden.pathway).sort((a,b)=>bondScore(b)-bondScore(a))[0]; if(n){ r.help = n.id; v = 2; adjustRel(n, {trust:4, dependence:3}); } else v = -1; }
  if(ch.v === 'channel') v = c.spirituality >= 50 ? 3 : c.spirituality >= 30 ? 1 : -1;
  if(ch.v === 'role') v = Math.round((p.acting.quality - 50)/12) + (actingMethodLevel()>=2 ? 1 : 0);
  if(ch.v === 'focus') v = c.spirituality >= 50 ? 3 : c.spirituality >= 30 ? 1 : -1;
  if(ch.v === 'path') v = Math.round((p.acting.quality - 45)/10) + (pathwayMods().ritualAccuracy||0);
  if(ch.v === 'force'){ v = chance(0.5 + fateSave()*3) ? 4 : -4; }
  r.acc += v;
  r.step++;
  if(r.step < steps.length){ openRitualStep(); saveGame(true); renderAll(); return; }
  resolveAdvancement();
}
// Suma de todos los factores (0-100 aprox). No es sólo azar: es cómo llegaste.
function ritualScore(){
  const r = STATE.ritual || {acc:0}; const p = STATE.pathway, c = STATE.character;
  const potion = r.potion ? itemByUid(r.potion) : null;
  const locBonus = {casa:0, faccion:6, niebla:10, ruinas:-2}[r.place] || 0;
  // Un artefacto cuyo efecto de ritual conocés (la vela negra, por ejemplo).
  const artifactBonus = Math.max(0, ...inventoryItems().filter(it=>it.cat==='artifact' && !it.sealed && ARTIFACTS[it.def]).map(it=>{
    const e = ARTIFACTS[it.def].effects.find(x=>x.kind==='ritual');
    return e && (it.known||{}).effects && it.known.effects.includes(e.id) ? (e.mech.ritualScore || 3) : 0; }));
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
function advanceSuccessChance(score){
  const p = STATE.pathway, seq = p.sequence;
  const diff = ADVANCE_DIFFICULTY[seq] || ADVANCE_DIFFICULTY[1];
  const highSeqPenalty = seq <= 5 ? (diffMult('highSeq') - 1) * 0.15 : 0;
  // Una "oportunidad especial" (un buen presagio) suma.
  const omen = p.advanceFlags && p.advanceFlags[seq] ? 0.1 : 0;
  return clamp(diff.baseSuccess + (score - 50)/85 + diffAdd('potion') - highSeqPenalty + omen, 0.05, diff.maxSuccess || 0.95);
}
// Antes de empezar, una sensación (nunca un porcentaje): cómo pinta el
// ritual con lo que tenés, si lo hicieras con cuidado y en tu casa.
function ritualForecast(){
  const p = STATE.pathway, c = STATE.character;
  const pot = potionItems(p.chosenPathway, p.sequence-1)[0];
  const save = STATE.ritual;
  STATE.ritual = {acc:3, place:'casa', potion: pot ? pot.uid : null};
  let s = ritualScore();
  if(!pot) s += 10;   // una poción recién hecha, de calidad media (el -10 de "sin poción" no aplica)
  STATE.ritual = save;
  const ch = advanceSuccessChance(s);
  if(ch >= 0.75) return 'Presentís que está al alcance de la mano.';
  if(ch >= 0.55) return 'Tenés buenas chances, si hacés las cosas bien.';
  if(ch >= 0.4) return 'Es posible, pero nada está garantizado.';
  return 'Algo te dice que todavía no es el momento: tu cabeza o tu cuerpo no están listos.';
}
function resolveAdvancement(){
  const r = STATE.ritual; const p = STATE.pathway, c = STATE.character;
  const seq = p.sequence, key = p.chosenPathway;
  const score = ritualScore();
  const potion = itemByUid(r.potion);
  STATE.ritual = null;
  if(potion) removeItem(potion.uid);
  if(!r.paid) payFromCashOrBank(advanceCost());   // rituales empezados con la versión anterior
  p.ritualPrepBonus = 0;
  // Probabilidad: la dificultad base de la Sequence, desplazada por el
  // puntaje del ritual. Un ritual muy bien hecho puede superar a una
  // Sequence difícil; uno mal hecho, no.
  const pSucc = advanceSuccessChance(score);
  if(chance(pSucc)){
    p.sequence = seq - 1; p.digestion = 0;
    delete p.advanceFlags[seq];
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
      applyEffects({salud:-rndInt(15,40), sanity:-rndInt(10,25), corruption:rndInt(4,12)});
      const cond = randomCondition('ritual'); if(cond && chance(0.6)) addCondition(cond);
      text = 'El ritual se desestabiliza. El precio del fracaso se cobra en carne, cordura y algo que tarda en irse.';
      logJournal('ADVANCEMENT RITUAL — FRACASO GRAVE', text, {cat:'pathway', imp:3});
    } else {
      applyEffects({sanity:-rndInt(6,14), corruption:rndInt(2,6)});
      text = 'El ritual no prospera. La poción se pierde, pero la fórmula queda: con ingredientes nuevos, podés volver a intentarlo.';
      logJournal('ADVANCEMENT RITUAL — FRACASO', text, {cat:'pathway', imp:3});
    }
    remember('ritual_failed_'+seq, `Un ritual de Advancement te salió mal (Sequence ${seq-1}).`, {cat:'trauma'});
    setResolution('El ritual falló', text, []);
  }
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
// Un buen presagio para el próximo ritual (antes era un requisito para las
// Sequences altas; ahora sólo suma).
function maybeGrantAdvanceFlag(){
  const p = STATE.pathway;
  if(!p.chosenPathway || p.sequence <= 1 || p.advanceFlags[p.sequence] || p.digestion < 60) return;
  const pr = 0.004 + STATE.character.reputation/4000 + knowledgeOf(p.chosenPathway)/6000;
  if(chance(pr)) grantAdvanceFlag('Un acontecimiento poco común te deja una señal clara.');
}
function grantAdvanceFlag(text){
  const p = STATE.pathway;
  if(!p.chosenPathway || p.advanceFlags[p.sequence]) return;
  p.advanceFlags[p.sequence] = true;
  logJournal('Un buen presagio', text + ' Cuando llegue tu próximo ritual, algo va a estar de tu lado.', {cat:'pathway', imp:2});
  toast('Un buen presagio para tu próximo ritual.', 'pos');
  STATE._importantMoment = true;
}
