'use strict';
/* =========================================================================
   systems/research.js — investigación mística y rumores (§15, §41).
   Investigar es un juego completo: cada método tiene su probabilidad de
   éxito, de pista falsa, de secreto, de corrupción y de llamar la atención,
   y esas probabilidades dependen de QUIÉN investiga (educación, rasgos,
   vía, ciudad, suerte). Los rumores son una capa de información aparte:
   verdaderos, parciales o falsos; se pueden ignorar o seguir paso a paso;
   se enfrían si no los seguís; y pueden llevar a una vía, a una persona, a
   una facción, a un objeto, a un peligro... o a nada.
   ========================================================================= */

// Habilidad de investigación (0 a ~0.35) según el tipo de método.
function researchSkill(kind){
  const c = STATE.character, pm = pathwayMods(), tags = playerTags();
  let s = 0;
  s += (EDUCATION_RANK[c.educacion]||0) * 0.025 + Math.min(0.06, (c.educationScore||0)/400);
  if(kind==='study'){ if(tags.has('meticulous')) s += 0.05; if(tags.has('curious')) s += 0.04; }
  if(kind==='social'){ if(tags.has('social')) s += 0.05; if(tags.has('empathic')) s += 0.03; s += pm.social||0; }
  if(kind==='street'){ if(tags.has('brave')) s += 0.03; if(c.clase==='Baja') s += 0.04; }
  if(kind==='occult'){ if(tags.has('intuitive') || tags.has('superstitious')) s += 0.05; s += c.spirituality/500; }
  s += pm.research || 0;
  s += conditionMods().research || 0;
  s += luckMod();
  if(STATE.flags.researchBuffUntil > STATE.time.totalMonths) s += STATE.flags.researchBuff || 0;
  return clamp(s, -0.1, 0.4);
}
function researchAvailable(m){
  const c = STATE.character;
  if(c.edad < m.ageMin) return {ok:false, why:`Desde los ${m.ageMin} años.`};
  if(c.cash < Math.round(m.cost*priceIndex())) return {ok:false, why:'No te alcanza el dinero.'};
  if(m.needs){
    if(m.needs.item && !hasItem(m.needs.item) && !(m.needs.orFlag && STATE.flags[m.needs.orFlag])) return {ok:false, why:'Necesitás algo concreto para investigar.'};
    if(m.needs.itemCat && !itemsByCat(m.needs.itemCat).length) return {ok:false, why:'No tenés ningún documento.'};
    if(m.needs.npc && !interrogableNpcs().length) return {ok:false, why:'No conocés a nadie que sepa algo.'};
    if(m.needs.mysticContact && !knownMysticNpcs().length && !knowsLore('black_market')) return {ok:false, why:'No conocés a ningún místico.'};
  }
  return {ok:true};
}
function interrogableNpcs(){ return aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && (n.mystic >= 25 || n.hidden.pathway || n.secrets.some(s=>s.mystic))); }

function doResearch(methodId, targetId, focus){
  if(timeBlocked()) return;
  const m = RESEARCH_METHODS[methodId];
  if(!m) return;
  const av = researchAvailable(m);
  if(!av.ok){ toast(av.why, 'neg'); return; }
  if(!canUseSeasonAction('research')){ toast('Ya investigaste todo lo que podías esta temporada.', 'neg'); return; }
  if(!spendFreeTime(m.time||1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  useSeasonAction('research'); markMysticAct();
  STATE.character.stats.researches++;
  const cost = Math.round(m.cost*priceIndex());
  if(cost) applyEffects({cash:-cost});
  raiseAttention(rndInt(m.attention[0], m.attention[1]));
  const before = snapshotForChanges();

  // Probabilidades ajustadas por la habilidad de quien investiga.
  const skill = researchSkill(m.skill);
  const o = Object.assign({}, m.odds);
  o.clue += skill; o.secret += skill*0.4 + (pathwayMods().secretFind||0);
  o.falseLead = Math.max(0.02, o.falseLead*diffMult('falseClue') - skill*0.6);
  o.nothing = Math.max(0.03, o.nothing - skill*0.5);
  if(m.cityLibrary) o.clue += (currentCity().library - 0.5) * 0.2;
  const total = Object.values(o).reduce((a,b)=>a+b,0);
  let r = Math.random()*total, outcome = 'nothing';
  for(const k of ['clue','secret','falseLead','lead','contact','nothing']){ r -= (o[k]||0); if(r <= 0){ outcome = k; break; } }

  let text = '';
  let target = null;
  if(methodId === 'document'){
    const doc = itemsByCat('document')[0];
    if(doc){ removeItem(doc.uid); text = `Estudiás ${doc.name.toLowerCase()} hasta memorizarlo. `; if(doc.def==='doc_cipher' && (pathwayMods().decipher||0) > 0 && outcome==='nothing') outcome = 'secret'; }
  }
  if(methodId === 'symbol' && hasItem('doc_symbol') && chance(0.5)){ removeItemByDef('doc_symbol'); }
  if(methodId === 'interrogate'){
    target = targetId ? npcById(targetId) : pick(interrogableNpcs());
    if(target){ meetNpc(target); text = `Le hacés a ${target.name} las preguntas justas. `;
      if(chance(m.suspicionRisk - (pathwayMods().interrogate||0))) adjustRel(target, {suspicion:[6,14], trust:-4});
      if(pathwayMods().interrogate && outcome==='nothing') outcome = 'secret'; }
  }
  const [gMin,gMax] = m.gain;
  const clueSource = target ? target.name : m.name.toLowerCase();
  // Seguir un hilo: la investigación se concentra en lo que ya sospechás.
  const own = STATE.pathway.chosenPathway;
  const focusK = focus && PATHWAYS[focus] && (focus === own || (STATE.pathway.belief[focus]||0) > 0 || isIdentified(focus)) ? focus : null;
  if(outcome === 'clue'){
    const pw = target && target.hidden.pathway ? target.hidden.pathway : focusK && chance(0.75) ? focusK : (m.clueBias && chance(0.5) ? pick(m.clueBias) : '$random');
    // Quien sabe qué está buscando, encuentra más de eso.
    const focused = focusK && pw === focusK;
    const cl = addClue({pathway:pw, reliability: chance(0.8) ? 'real' : 'partial', strength: focused ? [gMin+1, gMax+2] : [gMin,gMax], source:clueSource});
    text += cl ? `Encontrás algo real: un rastro que apunta hacia ${cl.shown && isIdentified(cl.shown) ? 'la vía '+PATHWAYS[cl.shown].name : 'algo relacionado con '+cl.desc}.` : 'Encontrás algo que confirma lo que ya sabías de tu propio camino.';
    // Quien sigue un hilo que ya entiende, a veces encuentra la receta. Las
    // fórmulas de Sequences bajas circulan; las altas, casi nunca.
    const fTarget = focusK && focusK === own ? (STATE.pathway.sequence > 0 ? STATE.pathway.sequence - 1 : null) : (focusK && !own ? 9 : null);
    if(fTarget !== null && fTarget >= 5 && isIdentified(focusK) && !hasFormula(focusK, fTarget) && knowledgeOf(focusK) >= 50 + (9-fTarget)*5 && chance(0.14 + skill - (9-fTarget)*0.02)){
      const rel = resolveReliability('mixed');
      addFormula(focusK, fTarget, rel==='real' ? 'true' : rel, m.name.toLowerCase());
      text += ` Entre las notas aparece algo más: una lista de ingredientes y proporciones. Una fórmula. ${rel==='real' ? '' : 'No sabés si es confiable.'}`;
    }
    if(m.verify && chance(0.5)){ const u = unverifiedClues(); if(u.length){ const res = verifyClue(pick(u).id, 'el místico te ayuda a ver'); if(res) text += res==='real' ? ' Además, te confirma que una pista vieja era cierta.' : ' Además, te hace ver que una pista vieja era falsa.'; } }
  } else if(outcome === 'secret'){
    if(target && target.secrets.some(s=>!s.known) && chance(0.6)){ learnNpcSecret(target); text += `Te enterás de algo que ${target.name} esconde.`; }
    else {
      const dangerous = ['clandestine','mystic','symbol'].includes(methodId) ? chance(0.45) : chance(0.15);
      const cat = dangerous ? (chance(0.6) ? 'forbidden' : 'entity') : (chance(0.7) ? 'secret' : 'fact');
      const pool = lorePool(cat).filter(id=>!knowsLore(id));
      if(pool.length){ const id = pick(pool); learnLore(id, m.name.toLowerCase()); text += dangerous ? 'Averiguás algo que te pesa saber. No hay forma de "des-saberlo".' : 'Averiguás algo que la mayoría de la gente no sabe.'; }
      else { addClue({pathway:'$random', reliability:'real', strength:[gMin,gMax], source:clueSource}); text += 'Encontrás una pista más.'; }
    }
  } else if(outcome === 'falseLead'){
    addClue({pathway:'$random', reliability:'false', strength:[gMin,gMax], source:clueSource});
    text += 'Conseguís algo que parece prometedor — pero no tenés forma de confirmar si es real.';
  } else if(outcome === 'lead'){
    const lead = addRumor(); text += lead ? `Te llega un rumor: "${lead.text}"` : 'No sacás nada en limpio esta vez.';
  } else if(outcome === 'contact'){
    if(m.contactFaction && !factionAccess(m.contactFaction)){ factionMeet(m.contactFaction); factionAdjust(m.contactFaction, {access:1, trust:3}); text += `Alguien de ${factionShort(m.contactFaction)} toma nota de tus preguntas y te deja una tarjeta.`; }
    else { const n = createMysticContact({}); text += `Conocés a ${n.name}, ${n.role.toLowerCase()}. Dice que "sabe cosas". Puede que sea cierto.`; }
  } else {
    text += 'No sacás nada en limpio esta vez.';
  }
  // Riesgos del método.
  if(m.corruptionChance && chance(m.corruptionChance)) applyEffects({corruption:[1,3]});
  if(m.sanity) applyEffects({sanity:m.sanity});
  if(m.combatChance && chance(m.combatChance)){ logJournal('Investigación', text, {cat:'mystery', imp:1}); startCombat(pickEncounter(chance(0.5)?'mystic':'mundane'), {env:'alley'}); saveGame(true); renderAll(); return; }
  logJournal('Investigación — ' + m.name, text, {cat:'mystery', imp: outcome==='nothing'?0:1});
  setResolution(m.name, text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}

/* ------------------------------ rumores y pistas ------------------------------ */
// Crea un rumor (con lo que hay detrás ya sorteado en secreto).
function addRumor(id){
  let tpl = id ? RUMOR_BY_ID[id] : null;
  if(!tpl){
    const pool = RUMOR_POOL.filter(r=>(!r.port || currentCity().port) && (!r.city || r.city === currentCityKey()) && !STATE.leads.some(l=>l.rumor===r.id && !l.done) && (!r.rare || chance(0.3)));
    if(!pool.length) return null;
    tpl = pick(pool);
  }
  if(STATE.leads.some(l=>l.rumor===tpl.id && !l.done)) return null;
  const o = wpick(tpl.outcomes, x=>x.w);
  const lead = {
    id:uid('ld'), rumor:tpl.id, text:tpl.text, steps:tpl.steps||2, progress:0, done:false,
    outcome:o.type, heard:STATE.time.totalMonths, expires:STATE.time.totalMonths + rndInt(12,30), cy:calendarYear()
  };
  STATE.leads.push(lead);
  if(STATE.leads.length > 25) STATE.leads.splice(0, STATE.leads.findIndex(l=>l.done) >= 0 ? 1 : 0);
  return lead;
}
function addMissingPersonLead(npc, dead){
  const lead = {id:uid('ld'), rumor:'missing', npc:npc.id, text: dead ? `¿Quién mató a ${npc.name}?` : `¿Qué le pasó a ${npc.name}?`,
    steps:2, progress:0, done:false, outcome: npc.hidden.pathway || npc.hidden.faction ? 'truth' : (chance(0.5)?'truth':'nothing'),
    heard:STATE.time.totalMonths, expires:STATE.time.totalMonths + 24, cy:calendarYear()};
  STATE.leads.push(lead);
  return lead;
}
function activeLeads(){ return STATE.leads.filter(l=>!l.done && l.expires > STATE.time.totalMonths); }
function expireLeads(){
  STATE.leads.forEach(l=>{
    if(!l.done && l.expires <= STATE.time.totalMonths){
      l.done = true; l.expired = true;
      if(l.progress > 0) logJournal('Una pista se enfría', `El rumor ("${l.text}") se enfría antes de que llegues al final. Nadie vuelve a mencionarlo.`, {cat:'mystery'});
    }
  });
}
function ignoreLead(id){ const l = STATE.leads.find(x=>x.id===id); if(l){ l.done = true; l.ignored = true; } saveGame(true); renderAll(); }
function followLead(id){
  if(timeBlocked()) return;
  const l = STATE.leads.find(x=>x.id===id && !x.done);
  if(!l) return;
  if(STATE.character.edad < 14){ toast('Todavía sos muy chico para eso.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  markMysticAct(); raiseAttention(rndInt(0,2));
  l.progress++;
  const before = snapshotForChanges();
  if(l.progress < l.steps){
    const text = pick(LEAD_STEP_TEXTS);
    logJournal('Siguiendo una pista', `"${l.text}" — ${text}`, {cat:'mystery'});
    setResolution('Siguiendo una pista', text, []);
    l.expires = Math.max(l.expires, STATE.time.totalMonths + 6);
    saveGame(true); renderAll(); return;
  }
  l.done = true;
  const text = resolveLead(l);
  if(STATE.combat || STATE.gameOver){ saveGame(true); renderAll(); return; }
  logJournal('Al final de la pista', text, {cat:'mystery', imp:2});
  setResolution('Al final de la pista', text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
// Ley de convergencia, versión humilde: cuando sabés qué buscar, el mundo
// empieza a mostrarte dónde podría estar (una pista con riesgo y precio).
const INGREDIENT_LEAD_TEXTS = [
  'Un boticario de la ciudad consigue "cosas raras". Alguien le vio {ing}.',
  'En el puerto se ofrece, en voz baja, algo que se parece mucho a {ing}.',
  'Un coleccionista murió y sus herederos venden todo sin saber qué es. Entre sus cosas habría {ing}.',
  'Un cazador que vuelve del bosque dice haber visto algo que sirve como {ing}.',
  'En una casa de empeño, detrás del mostrador, guardan {ing} para "clientes especiales".'
];
function wantedIngredient(){
  const p = STATE.pathway;
  let pw = null, seq = null;
  if(p.chosenPathway){ if(p.sequence <= 0 || (STATE.divinity && STATE.divinity.ascended)) return null; pw = p.chosenPathway; seq = p.sequence - 1; if(!formulaItems(pw, seq).length) return null; }
  else { const f = itemsByCat('formula').find(x=>x.seq===9 && x.pathway && isIdentified(x.pathway)); if(!f) return null; pw = f.pathway; seq = 9; }
  const need = ingredientsNeededFor(pw, seq).filter((n,i)=>ownedQty(pw, n) <= 0 && !(i===0 && characteristicFor(pw, seq)));
  return need.length ? {pathway:pw, seq, name:need[0]} : null;
}
function maybeIngredientLead(){
  if(STATE.leads.some(l=>l.rumor==='ingredient' && !l.done)) return null;
  const w = wantedIngredient(); if(!w) return null;
  if(STATE.pathway.chosenPathway && STATE.pathway.digestion < 30) return null;
  // Cuanto más alto, más conectado estás con quienes comercian estas cosas.
  if(!chance((w.seq <= 7 ? 0.12 : 0.09) * diffMult('hints'))) return null;
  const o = wpick([{k:'real',w:60},{k:'danger',w:20},{k:'fake',w:20}], x=>x.w).k;
  const price = Math.round((w.seq >= 8 ? rndInt(60,160) : w.seq >= 6 ? rndInt(200,500) : rndInt(600,1600)) * priceIndex());
  const lead = {id:uid('ld'), rumor:'ingredient', pathway:w.pathway, seq:w.seq, name:w.name, price,
    text: pick(INGREDIENT_LEAD_TEXTS).replace('{ing}', w.name), steps: w.seq <= 6 ? 2 : 1, progress:0, done:false, outcome:o,
    heard:STATE.time.totalMonths, expires:STATE.time.totalMonths + rndInt(8,18), cy:calendarYear()};
  STATE.leads.push(lead);
  logJournal('Un rumor útil', `"${lead.text}"`, {cat:'mystery', imp:1});
  return lead;
}
function resolveLead(l){
  if(l.rumor === 'ingredient'){
    const c = STATE.character;
    if(l.outcome === 'danger'){
      logJournal('Al final de la pista', 'Alguien más buscaba lo mismo. Y llegó antes.', {cat:'mystery', imp:2});
      // Quien busca el mismo ingrediente suele estar donde estás vos: de tu
      // misma Sequence, no más arriba. A veces, ni siquiera es un Beyonder.
      const rival = l.seq <= 7 && chance(0.6);
      startCombat(rival ? 'rivalBeyonder' : 'thugs', {env:'alley', source:'una pista', overrides: rival ? {pathway:l.pathway, seq:clamp(l.seq + 1, 1, 9)} : {}});
      return 'Alguien más buscaba lo mismo. Y llegó antes.';
    }
    if(c.cash < l.price) return `Llegás hasta el vendedor. Pide ${fmtMoney(l.price)}. No los tenés. Se encoge de hombros: "Otro va a tenerlos."`;
    applyEffects({cash:-l.price});
    if(l.outcome === 'fake'){
      addItem({cat:'misc', name:l.name+' (dudoso)', desc:'Se parece a lo que buscabas. Demasiado.', rarity:'comun', provenance:'un rumor', risk:'Probablemente falso.'}, 1);
      return `Pagás ${fmtMoney(l.price)} por ${l.name}. Recién en tu casa, a la luz de una vela, notás que es una imitación.`;
    }
    addIngredient(l.pathway, l.seq, l.name, rndInt(55,90), 'siguiendo un rumor');
    return `Pagás ${fmtMoney(l.price)} y te llevás ${l.name}. Es real: lo sentís en las manos.`;
  }
  if(l.rumor === 'missing'){
    const n = npcById(l.npc);
    if(n && l.outcome === 'truth'){
      const ht = STATE.hiddenTruths.find(h=>!h.revealed && h.npc===n.id);
      if(ht){ revealHiddenTruth(ht.id, 'siguiendo su rastro'); applyEffects({sanity:[-6,-2], exposure:3}); return `Llegás hasta el final del rastro de ${n.name}. Ahora sabés lo que pasó. Hubieras preferido no saberlo.`; }
      applyEffects({clue:{pathway:n.hidden.pathway||'$random', reliability:'real', strength:[4,8], source:'el rastro de '+n.name}});
      return `El rastro de ${n.name} termina en un lugar que nadie debería conocer. Encontrás señales de algo que no es humano.`;
    }
    return `Preguntás en todos lados. Nadie sabe nada de ${n ? n.name : 'esa persona'}. A veces, la gente simplemente se va.`;
  }
  const tpl = RUMOR_BY_ID[l.rumor];
  const o = tpl ? (tpl.outcomes.find(x=>x.type===l.outcome) || tpl.outcomes[0]) : {type:'nothing', result:'No encontrás nada.'};
  switch(o.type){
    case 'pathway':
      applyEffects({clue:{pathway:o.pathway, reliability:'real', strength:[6,12], source:'un rumor que resultó cierto'}, exposure:3});
      break;
    case 'npc': {
      const n = createMysticContact({pathway:o.pathway, role:o.role, faction:o.faction||null});
      n.role = o.role; adjustRel(n, {trust:6, respect:5});
      remember('met_'+n.id, `Conociste a ${n.name}: ${o.role.toLowerCase()}.`, {cat:'person', npc:n.id});
      if(o.faction){ factionMeet(o.faction); factionAdjust(o.faction, {suspicion:6}); }
      applyEffects({clue:{pathway:o.pathway, reliability:'real', strength:[4,8], source:n.name}});
      break; }
    case 'faction':
      factionMeet(o.faction); factionAdjust(o.faction, {access:1, trust:5});
      if(o.faction === 'aurora') applyEffects({corruption:[1,3]});
      break;
    case 'item':
      if(o.artifactKey && !hasArtifact(o.artifactKey)) addArtifact(o.artifactKey, 'el final de un rumor');
      else if(o.artifact || o.artifactKey){ const pool = ARTIFACT_KEYS.filter(a=>!hasArtifact(a) && ARTIFACTS[a].grade > 0); addArtifact(pick(pool.length ? pool : ARTIFACT_KEYS), 'el final de un rumor'); }
      else addItem(pick(o.items), 1, 'el final de un rumor');
      break;
    case 'secret':
      learnLore(o.lore, 'un rumor que seguiste');
      break;
    case 'tarot':
      tarotHear('un rumor sobre una niebla gris'); learnLore('tarot_fool', 'el rumor de la niebla');
      if(STATE.tarot.stage < 3) STATE.tarot.stage = 3;
      break;
    case 'danger':
      if(o.sanity) applyEffects({sanity:o.sanity});
      if(o.corruption) applyEffects({corruption:o.corruption});
      if(o.attention) raiseAttention(o.attention);
      if(o.enemy){ logJournal('Al final de la pista', o.result, {cat:'mystery', imp:2}); startCombat(o.enemy, {}); }
      break;
    case 'false':
      addClue({pathway:o.pathway, reliability:'false', strength:[5,9], source:'un rumor'});
      break;
  }
  // Cualquier final puede enseñar además un secreto propio (los de las ciudades).
  if(o.lore && o.type !== 'secret') learnLore(o.lore, 'un rumor que seguiste');
  if(o.type === 'nothing') remember('dead_end', `Seguiste un rumor ("${l.text}") y no llevaba a ningún lado.`, {cat:'choice'});
  return o.result;
}
