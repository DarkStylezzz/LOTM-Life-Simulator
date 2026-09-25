'use strict';
/* =========================================================================
   systems/artifacts.js — Artefactos Sellados (§32).
   Cada artefacto tiene grado, efectos, contras, forma de activación,
   corrupción, impacto en la cordura, un comportamiento oculto, un origen y
   (a veces) un dueño anterior. El jugador no sabe nada de eso al principio:
   lo descubre EXAMINANDO (gratis, una vez), ESTUDIANDO (tiempo y cordura) o
   USÁNDOLO (y sufriéndolo). Usarlo sin entenderlo es más peligroso.
   Un artefacto también se puede vender, entregar a una facción, sellar en
   una caja o esconder — y cada camino tiene consecuencias.
   ========================================================================= */
function artifactItems(){ return itemsByCat('artifact'); }
function hasArtifact(key){ return artifactItems().some(it=>it.def===key); }
function artifactByKey(key){ return artifactItems().find(it=>it.def===key) || null; }
function artifactDef(it){ return it && ARTIFACTS[it.def] || null; }
function artifactKnown(it){ return it.known || (it.known = {activation:false, grade:false, effects:[], drawbacks:[], hidden:false, origin:false}); }

function addArtifact(key, provenance, opts){
  opts = opts || {};
  const d = ARTIFACTS[key]; if(!d) return null;
  const it = addItem({cat:'artifact', def:key, name:d.name, rarity:d.rarity||'raro', desc:d.foundText, grade:d.grade,
    risk:'Desconocido.', uses:'Desconocidos.', provenance: provenance || 'encontrado',
    known:{activation:false, grade:false, effects:[], drawbacks:[], hidden:false, origin:false},
    useCount:0, studied:0, sealed:false, loan:opts.loan||null, loanUntil: opts.loan ? STATE.time.totalMonths + 12 : null}, 1);
  STATE.flags.mysticExposure = (STATE.flags.mysticExposure||0) + 3;
  remember('artifact_'+key, `Llegó a tus manos ${d.name.toLowerCase()}.`, {cat:'event'});
  logJournal('Un objeto sellado', `Ahora tenés ${d.foundText}`, {cat:'mystery', imp:2});
  if(opts.loan) remember('loan_'+key, `${factionName(opts.loan)} te prestó ${d.name.toLowerCase()}.`, {cat:'organization', faction:opts.loan});
  return it;
}
function removeArtifact(key, why){
  const it = artifactByKey(key); if(!it) return false;
  removeItem(it.uid);
  if(why) logJournal('Un objeto que se fue', why, {cat:'mystery'});
  onArtifactLost(key);
  return true;
}
// Comportamientos ocultos con disparador "lost": la moneda vuelve.
function onArtifactLost(key){
  const d = ARTIFACTS[key]; const h = d && d.hidden;
  if(!h || h.trigger !== 'lost') return;
  if(chance(h.chance)) scheduleConsequence({inMonths:[2,8], title:'Otra vez en tu bolsillo', text:`Metés la mano en el bolsillo y ahí está: ${d.name.toLowerCase()}. No la trajiste. Nunca se fue.`,
    effect:{artifact:key, artifactFrom:'volvió por su cuenta', sanity:[-3,-1]}, memory:{tag:'artifact_returned_'+key, text:`${d.name} volvió solo.`, cat:'secret'}});
}

/* ------------------------------ efectos activos ------------------------------ */
// ¿Algún artefacto (no sellado) aporta este efecto? (warn, ward, save, ...)
function artifactActiveEffect(effId){
  return artifactItems().some(it=>{ if(it.sealed) return false; const d = artifactDef(it); return d && d.effects.some(e=>e.id===effId); });
}
function artifactCombatEffect(it){
  if(it.sealed) return null;
  const d = artifactDef(it); if(!d) return null;
  const e = d.effects.find(x=>x.kind==='combat' && (x.mech.skipEnemy || x.mech.enemyDmg || x.mech.vsMysticDmg));
  if(!e) return null;
  const known = artifactKnown(it).effects.includes(e.id);
  return {id:e.id, text: known ? e.text : 'No sabés bien qué hace. Es un riesgo.'};
}
function useArtifactInCombat(uidv){
  const it = itemByUid(uidv); const d = artifactDef(it); const cb = STATE.combat;
  if(!it || !d || !cb) return null;
  const e = d.effects.find(x=>x.kind==='combat'); if(!e) return null;
  const k = artifactKnown(it);
  if(!k.effects.includes(e.id)) k.effects.push(e.id);
  it.useCount = (it.useCount||0) + 1;
  applyEffects({sanity:d.useSanity, corruption:d.useCorruption});
  d.drawbacks.filter(x=>x.kind==='use').forEach(x=>{ applyDrawback(it, d, x); });
  cb.player.usedPowers = true;
  let r = {incoming:1, skip:false};
  if(e.mech.skipEnemy){ r.skip = true; cb.log.push(`Abrís ${d.name.toLowerCase()}. Por un instante, nada se mueve salvo vos.`); }
  if(e.mech.enemyDmg){ cb.enemy.dmg = cb.enemy.dmg.map(v=>Math.max(1, Math.round(v*(1+e.mech.enemyDmg)))); cb.log.push(`${d.name}: tu mano se mueve sola y le quita a ${cb.enemy.name} lo que tenía en la suya.`); }
  if(e.mech.vsMysticDmg){ r.incoming = cb.enemy.tier==='mystic' ? e.mech.vsMysticDmg : 1; cb.log.push(`Abrís ${d.name.toLowerCase()} con tu sangre.${cb.enemy.tier==='mystic' ? ' Lo que tenés enfrente retrocede.' : ' No parece importarle.'}`); }
  return r;
}

/* ------------------------------ acciones del jugador ------------------------------ */
function artifactActions(it){
  const d = artifactDef(it); if(!d) return [];
  const k = artifactKnown(it), acts = [];
  if(!k.activation) acts.push({id:'examine', label:'Examinar', small:'Gratis. Mirarlo de cerca, sin tocarlo demasiado.'});
  if(!it.sealed){
    const pending = d.effects.length + d.drawbacks.length - k.effects.length - k.drawbacks.length;
    if(pending > 0 || !k.origin) acts.push({id:'study', label:'Estudiar', small:'1 tiempo libre. Descubrir qué hace. Cuesta cordura.'});
    if(d.effects.some(e=>e.kind!=='combat' && e.kind!=='save' && e.kind!=='ritual')) acts.push({id:'use', label:'Usar', small: k.activation ? d.activation : 'No sabés cómo se activa. Probar es peligroso.', danger:true});
  }
  if(hasItem('tool_sealed_box')) acts.push(it.sealed ? {id:'unseal', label:'Sacarlo de la caja', small:'Vuelve a estar activo, para bien y para mal.'} : {id:'seal', label:'Guardarlo en la caja sellada', small:'Queda inerte: no te ayuda, pero tampoco te hace daño ni se nota.'});
  if(it.loan) acts.push({id:'return', label:'Devolverlo', small:`A ${factionShort(it.loan)}, antes de que lo reclamen.`});
  else {
    acts.push({id:'sell', label:'Vender', small: knowsLore('black_market') ? 'En el mercado negro pagan bien. Y hablan.' : 'A un anticuario, por mucho menos de lo que vale.'});
    FACTION_KEYS.filter(f=>['church','nighthawks','mi9','machinery','storm'].includes(f) && F(f).known && !factionHostile(f)).forEach(f=>acts.push({id:'handover:'+f, label:'Entregar a '+factionShort(f), small:'Se lo llevan a un depósito sellado. Te lo agradecen, y preguntan de dónde salió.'}));
  }
  return acts;
}
function artifactAction(uidv, action){
  if(timeBlocked()) return;
  const it = itemByUid(uidv);
  if(!it || it.cat!=='artifact'){ toast('Ya no tenés ese objeto.', 'neg'); return; }
  const d = artifactDef(it); if(!d) return;
  const [act, arg] = String(action).split(':');
  const before = snapshotForChanges();
  let r = null;
  if(act==='examine') r = examineArtifact(it, d);
  else if(act==='study') r = studyArtifact(it, d);
  else if(act==='use') r = useArtifact(it, d);
  else if(act==='sell') r = sellArtifact(it, d);
  else if(act==='handover') r = handOverArtifact(it, d, arg);
  else if(act==='seal'){ it.sealed = true; r = {title:'Sellado', text:`Guardás ${d.name.toLowerCase()} en la caja sellada. El aire de la habitación se siente más liviano.`}; }
  else if(act==='unseal'){ it.sealed = false; r = {title:'Fuera de la caja', text:`Sacás ${d.name.toLowerCase()} de la caja. Tarda un momento en "despertar".`}; }
  else if(act==='return') r = returnLoanArtifact(it, d);
  if(!r) return;
  if(STATE.gameOver) return;
  logJournal(r.title, r.text, {cat:'mystery', imp:r.imp||1});
  setResolution(r.title, r.text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
function examineArtifact(it, d){
  const k = artifactKnown(it);
  k.activation = true; k.grade = true;
  const feel = {1:'Tenerlo cerca te pone la piel de gallina. Esto es peligroso de verdad.', 2:'Pesa más de lo que debería. No es un adorno.', 3:'Parece casi inofensivo. Casi.'}[d.grade] || '';
  let extra = '';
  if((STATE.character.spirituality >= 45 || (pathwayMods().perception||0) >= 1) && d.effects[0] && !k.effects.includes(d.effects[0].id)){ k.effects.push(d.effects[0].id); extra = ` Intuís algo más: ${d.effects[0].text.toLowerCase()}`; }
  updateArtifactTexts(it, d);
  return {title:'Examinar '+d.name.toLowerCase(), text:`${feel} Mirándolo con cuidado, entendés cómo se usa: ${d.activation.toLowerCase()}${extra}`};
}
function studyArtifact(it, d){
  if(STATE.character.edad < 12){ toast('Sos muy chico para entender algo así.', 'neg'); return null; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return null; }
  markMysticAct();
  const k = artifactKnown(it);
  it.studied = (it.studied||0) + 1;
  applyEffects({sanity:[-4,-1], exposure:1});
  const unknownEff = d.effects.filter(e=>!k.effects.includes(e.id)).map(e=>({t:'effects', e}));
  const unknownDra = d.drawbacks.filter(e=>!k.drawbacks.includes(e.id)).map(e=>({t:'drawbacks', e}));
  const pool = unknownEff.concat(unknownDra);
  const p = 0.55 + researchSkill('occult') + (pathwayMods().decipher||0);
  let text;
  k.activation = true;
  if(pool.length && chance(p)){
    const x = pick(pool); k[x.t].push(x.e.id);
    text = x.t==='effects' ? `Horas de observación, anotaciones, pruebas pequeñas. Entendés algo: ${x.e.text.toLowerCase()}` : `Lo estudiás de noche. Entendés, demasiado tarde, uno de sus precios: ${x.e.text.toLowerCase()}`;
  } else if(!pool.length && !k.origin){
    k.origin = true;
    text = `Rastreás de dónde salió. ${d.origin}`;
    if(d.owner && !STATE.flags['artifactOwner_'+it.def]){ STATE.flags['artifactOwner_'+it.def] = true; text += ' Y hay algo más: su dueño anterior, por lo que parece, no terminó de soltarlo.'; }
  } else {
    text = 'Lo estudiás durante horas. No sacás nada en limpio, salvo dolor de cabeza.';
  }
  // Disparador "study" (el anillo que es una Característica disfrazada).
  const h = d.hidden;
  if(h && h.trigger==='study' && !k.hidden && it.studied >= 2 && chance(h.chance)){
    k.hidden = true;
    text += ` Y entonces lo ves: ${h.text.toLowerCase()}`;
    if(h.characteristic){
      const pw = STATE.pathway.chosenPathway || pick(Object.keys(PATHWAYS));
      const seq = STATE.pathway.chosenPathway ? Math.max(0, STATE.pathway.sequence-1) : rndInt(6,8);
      removeItem(it.uid);
      addCharacteristic(pw, seq, `lo que había dentro de ${d.name.toLowerCase()}`);
      text += ' Con cuidado, lo separás del metal. En tus manos queda una Característica Beyonder.';
      return {title:'Estudiar '+d.name.toLowerCase(), text, imp:3};
    }
  }
  // Estudiar demasiado también tiene su precio.
  if(d.grade === 1 && chance(0.08)){ applyEffects({corruption:[1,3]}); text += ' Cuando levantás la vista, afuera ya es de día. No recordás la noche.'; }
  updateArtifactTexts(it, d);
  return {title:'Estudiar '+d.name.toLowerCase(), text, imp:1};
}
function useArtifact(it, d){
  if(it.sealed){ toast('Está sellado en la caja.', 'neg'); return null; }
  if(!d.effects.some(e=>e.kind!=='combat' && e.kind!=='save' && e.kind!=='ritual')){ toast('No es algo que se use así. Tal vez en otro momento.', 'neg'); return null; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return null; }
  markMysticAct();
  const k = artifactKnown(it);
  const understood = k.activation && d.drawbacks.every(x=>k.drawbacks.includes(x.id));
  // Activarlo sin comprender su naturaleza puede matarte (el riesgo original).
  const deathP = (d.deathChanceOnUse||0) * (understood ? 0.25 : k.activation ? 0.7 : 1.4) * diffMult('mystic') - fateSave()*0.05;
  if(deathP > 0 && chance(deathP)){
    if(tryDollSave()){ removeItem(it.uid); return {title:d.name, text:`Activás ${d.name.toLowerCase()} y algo sale muy mal. Te salva otra cosa, a un precio. ${d.name} ya no está.`, imp:3}; }
    removeItem(it.uid);
    const c = STATE.character;
    endGame('negative', 'Consumido por el Artefacto', `${c.nombre} ${c.apellido} activa ${d.name.toLowerCase()} sin comprender su verdadera naturaleza. No hay vuelta atrás.`, {cause:'artefacto', artifact:d.name});
    return null;
  }
  it.useCount = (it.useCount||0) + 1;
  k.activation = true;
  applyEffects({sanity:d.useSanity, corruption:d.useCorruption});
  const usable = d.effects.filter(e=>e.kind!=='combat' && e.kind!=='save' && e.kind!=='ritual');
  const e = pick(usable);
  if(!k.effects.includes(e.id)) k.effects.push(e.id);
  let text = `Activás ${d.name.toLowerCase()}. `;
  const m = e.mech;
  if(m.revealNpc){
    const pool = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && ((n.hidden.pathway && !n.known.pathway) || (n.secrets||[]).some(s=>!s.known)));
    const n = pick(pool);
    if(!n) text += 'Te mirás en él y ves a todos tal cual los conocías. Nadie de tu vida esconde nada que el espejo pueda mostrar. O eso dice.';
    else if(n.hidden.pathway && !n.known.pathway){ n.known.pathway = true; if(n.hidden.faction) revealNpcFaction(n); text += `En el reflejo aparece ${n.name}, detrás de tu hombro. Por un instante ves lo que es de verdad: alguien de la vía ${PATHWAYS[n.hidden.pathway].name}.`; }
    else { learnNpcSecret(n); text += `En el reflejo, ${n.name} te cuenta algo sin abrir la boca.`; }
  }
  if(m.npc){
    const n = [...aliveNpcs()].filter(x=>x.met && x.lifeState==='presente').sort((a,b)=>((b.suspicion||0)+(b.fear||0))-((a.suspicion||0)+(a.fear||0)))[0];
    if(n){ adjustRel(n, m.npc); text += `Hacés sonar la campanita cerca de ${n.name}. Deja de mirarte raro.`; }
    else text += 'Suena, y nadie está cerca para escucharla. Te calma a vos.';
  }
  if(m.cash){ const v = Math.round(roll(m.cash)*priceIndex()); applyEffects({cash:v}); text += `Una tarde en el mercado. Volvés con ${fmtMoney(v)} que no eran tuyos.`; }
  if(m.spirituality){ applyEffects({spirituality:m.spirituality}); text += 'Algo te llena por dentro, frío y claro.'; }
  if(m.sanity){ applyEffects({sanity:m.sanity}); text += 'Recordás, con una claridad perfecta, un momento bueno de tu vida.'; }
  if(m.luckBuff){ applyEffects({luckBuff:m.luckBuff}); text += 'Sale cara. Durante un tiempo, las cosas se inclinan un poco a tu favor.'; }
  if(m.researchBuff){ STATE.flags.researchBuff = m.researchBuff; STATE.flags.researchBuffUntil = STATE.time.totalMonths + 3; invalidatePathwayMods(); text += 'Su luz te acompaña en las noches de estudio.'; }
  if(m.actingBuff){ STATE.flags.actingBuff = m.actingBuff; STATE.flags.actingBuffUntil = STATE.time.totalMonths + 3; text += 'Te la ponés frente al espejo. Por un momento, podrías ser cualquiera.'; }
  if(m.attention){ STATE.world.attention = Math.max(0, STATE.world.attention + m.attention); text += 'Con ella puesta, caminás semanas por la ciudad. Nadie te reconoce. El rastro se enfría.'; }
  if(m.ingredientBonus){ STATE.flags.compassUntil = STATE.time.totalMonths + 6; text += 'La aguja gira y se queda quieta. Mientras la sigas, vas a encontrar cosas explorando.'; }
  d.drawbacks.filter(x=>x.kind==='use').forEach(x=>{ text += ' ' + applyDrawback(it, d, x); });
  // Disparador oculto "use" (la vela atrae espíritus; la brújula, la isla).
  const h = d.hidden;
  if(h && h.trigger==='use' && chance(h.chance)){
    artifactKnown(it).hidden = true;
    if(h.effect && h.effect.lead){ addRumor(h.effect.lead); text += ' La aguja, esta vez, apunta al mar. Siempre al mismo lugar.'; }
    if(h.effect && h.effect.combat){ text += ' Algo más acude a la luz.'; updateArtifactTexts(it, d); startCombat(h.effect.combat, {source:'artefacto', env:'home'}); return {title:d.name, text, imp:2}; }
  }
  raiseAttention(rndInt(0,2));
  updateArtifactTexts(it, d);
  return {title:d.name, text, imp:2};
}
function applyDrawback(it, d, x){
  const k = artifactKnown(it);
  const first = !k.drawbacks.includes(x.id);
  if(first) k.drawbacks.push(x.id);
  const m = x.mech;
  if(m.delayedBadLuck){ scheduleConsequence({inMonths:[4,10], title:'La moneda cobra', text:'Una racha de mala suerte que no se explica. Pequeñas cosas, todas en contra.', effect:{luckBuff:-6, cash:[-60,-10]}}); }
  if(m.combatChance && chance(m.combatChance)){ scheduleConsequence({inMonths:[1,3], title:'Lo que te buscaba', text:'La aguja apuntaba a algo. Ese algo te encontró primero.', effect:{combat: pick(ENCOUNTER_POOLS.mystic)}}); }
  const eff = {}; ['humanity','reputation','corruption','salud','sanity'].forEach(s=>{ if(m[s] !== undefined) eff[s] = m[s]; });
  if(Object.keys(eff).length) applyEffects(eff);
  return first ? `Y entendés su precio: ${x.text.toLowerCase()}` : '';
}
function sellArtifact(it, d){
  const k = artifactKnown(it);
  const bm = knowsLore('black_market');
  const base = rndInt(d.sellRange[0], d.sellRange[1]) * (bm ? 1 : 0.35) * (k.effects.length ? 1.2 : 1);
  const v = Math.round(base * priceIndex());
  applyEffects({cash:v});
  removeItem(it.uid);
  raiseAttention(bm ? rndInt(3,7) : rndInt(1,3));
  if(chance(bm ? 0.3 : 0.15)){ const f = pick(['church','nighthawks','mi9']); factionAdjust(f, {suspicion:rndInt(4,9)}, true); addHiddenTruth(`${cap(factionShort(f))} rastreó ${d.name.toLowerCase()} hasta vos después de que lo vendiste.`); }
  onArtifactLost(it.def);
  return {title:'Vendido', text: bm ? `En el mercado negro pagan ${fmtMoney(v)} por ${d.name.toLowerCase()}, sin preguntas. Las preguntas vienen después, y las hace otro.` : `Un anticuario te da ${fmtMoney(v)} por ${d.name.toLowerCase()}. No tiene idea de lo que compró. Vos tampoco del todo.`};
}
function handOverArtifact(it, d, f){
  if(!F(f) || !F(f).known){ toast('No tenés contacto con ellos.', 'neg'); return null; }
  removeItem(it.uid);
  factionAdjust(f, {merit: 4 + (4-d.grade)*3, trust:[3,6], publicRep:[2,5], suspicion: chance(0.35) ? 6 : -3});
  remember('handed_artifact_'+it.def, `Entregaste ${d.name.toLowerCase()} a ${factionName(f)}.`, {cat:'organization', faction:f});
  let text = `Entregás ${d.name.toLowerCase()} a ${factionName(f)}. Lo guardan en una caja de plomo y te hacen firmar un papel.`;
  if(chance(0.4)){ text += ' Antes de irte, uno de ellos te pregunta, como al pasar, dónde lo encontraste.'; factionAdjust(f, {suspicion:4}, true); }
  onArtifactLost(it.def);
  return {title:'Entregado a '+factionShort(f), text};
}
function returnLoanArtifact(it, d){
  const f = it.loan;
  removeItem(it.uid);
  factionAdjust(f, {trust:[3,6], merit:2});
  return {title:'Devuelto', text:`Devolvés ${d.name.toLowerCase()} a ${factionName(f)}. Lo revisan con cuidado. Asienten.`};
}
// Los textos de riesgo/usos del inventario reflejan lo que el jugador SABE.
function updateArtifactTexts(it, d){
  const k = artifactKnown(it);
  const effs = d.effects.filter(e=>k.effects.includes(e.id)).map(e=>e.text);
  const drs = d.drawbacks.filter(e=>k.drawbacks.includes(e.id)).map(e=>e.text);
  it.uses = effs.length ? effs.join(' ') : 'Desconocidos.';
  it.risk = drs.length ? drs.join(' ') : 'Desconocido.';
}

/* ------------------------------ cada mes ------------------------------ */
function artifactMonthly(){
  const list = artifactItems();
  list.forEach(it=>{
    const d = artifactDef(it); if(!d) return;
    // Préstamos de una facción: se reclaman.
    if(it.loan && it.loanUntil && STATE.time.totalMonths >= it.loanUntil){
      removeItem(it.uid);
      logJournal('Préstamo vencido', `${cap(factionShort(it.loan))} pasa a buscar ${d.name.toLowerCase()}. Nadie te pregunta si lo usaste. Lo saben.`, {cat:'faction'});
      return;
    }
    if(it.sealed) return;
    // Contras de posesión (la muñeca: dormís peor).
    d.drawbacks.filter(x=>x.kind==='owned').forEach(x=>{ if(x.mech.monthlySanity && chance(Math.abs(x.mech.monthlySanity))) applyEffects({sanity:-1}); });
    // Tener objetos activos se nota, poco a poco.
    if(chance(0.04)) raiseAttention(1);
    const h = d.hidden;
    if(!h) return;
    if(h.trigger==='monthly' && chance(h.chance)){
      if(h.effect) applyEffects(h.effect);
      if(h.familyFear){ const fam = aliveNpcs().filter(n=>isFamilyNpc(n) && n.lifeState==='presente'); const n = pick(fam); if(n) adjustRel(n, {fear:[3,8], suspicion:[2,5]}); }
      if(!artifactKnown(it).hidden){ artifactKnown(it).hidden = true; logJournal(d.name, h.journal || h.text, {cat:'mystery', imp:1}); }
      else if(h.journal && chance(0.3)) logJournal(d.name, h.journal, {cat:'mystery'});
      // El reloj que avanza cuando alguien querido va a morir.
      if(h.id==='tick'){ const frail = aliveNpcs().filter(n=>bondScore(n)>=55 && npcAge(n) >= 60); if(frail.length) STATE.flags.watchTicked = STATE.time.totalMonths; }
    }
    if(h.trigger==='owned' && h.eventId && chance(h.chance) && !STATE.flags['artifactEvent_'+it.def]){
      STATE.flags['artifactEvent_'+it.def] = true;
      triggerEventById(h.eventId);
    }
  });
}
// Una revisión de la casa puede encontrar objetos que no están sellados.
function confiscateExposedArtifact(f){
  const exposed = artifactItems().filter(it=>!it.sealed && !it.loan);
  if(!exposed.length || !chance(0.5)) return null;
  const it = pick(exposed); const d = artifactDef(it);
  removeItem(it.uid);
  if(f) factionAdjust(f, {suspicion:12}, true);
  addHiddenTruth(`${f ? cap(factionShort(f)) : 'Alguien'} se llevó ${d.name.toLowerCase()} de tu casa.`);
  return d.name;
}
// La máscara resuena con los de la vía del Loco.
function artifactResonance(){ return artifactItems().filter(it=>{ const d = artifactDef(it); return d && d.hidden && d.hidden.resonance && d.hidden.resonance === STATE.pathway.chosenPathway; }).length; }
