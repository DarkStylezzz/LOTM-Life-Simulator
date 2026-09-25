'use strict';
/* =========================================================================
   systems/factions.js — organizaciones con intereses propios (§27).
   Estado por facción en STATE.factions[k]:
     publicRep (cara pública), secretRep (dentro del mundo oculto), trust,
     suspicion, access (0-5), relationship, merit (mérito para pedir cosas),
     rank, knownSecrets, formulas (qué vías custodian — oculto por vida),
     strength, hunted.
   El jugador puede cooperar, unirse, trabajar para ellas, pedir cosas
   (fórmulas, ingredientes, entrenamiento, protección, un lugar para el
   ritual), traicionarlas, investigarlas... o ser perseguido por ellas.
   ========================================================================= */
function F(k){ return STATE.factions[k]; }
function factionName(k){ return FACTIONS_DATA[k] ? FACTIONS_DATA[k].name : (k||'alguien'); }
function factionShort(k){ return FACTIONS_DATA[k] ? FACTIONS_DATA[k].short : (k||'alguien'); }
function factionAccess(k){ return F(k) ? (F(k).access||0) : 0; }
function factionHostile(k){ const f = F(k); return !!f && (f.hunted || ['enemiga','traicionada','persiguiendo'].includes(f.relationship)); }
function factionMood(k, mood){ if(STATE.world.factionMood) STATE.world.factionMood[k] = mood; }
function factionStrength(k, d){ const f = F(k); if(f) f.strength = clamp((f.strength||50) + d, 0, 100); }
function factionStrengthOf(k){ return F(k) ? (F(k).strength||50) : 0; }
function isMember(k){ return factionAccess(k) >= 3 && F(k).relationship === 'miembro'; }
function memberFactions(){ return FACTION_KEYS.filter(isMember); }

// Te enterás de que existe (o de que existe más de lo que creías).
function factionMeet(k){
  const f = F(k); if(!f) return;
  if(!f.known){ f.known = true; f.discovered = true; logJournal('Una organización', `Ahora sabés que existe ${factionName(k)}.`, {cat:'faction', imp:2}); }
  if(f.relationship === 'desconocida') f.relationship = 'neutral';
  if(k === 'nighthawks' && !knowsLore('church_nighthawks') && F('church').known) learnLore('church_nighthawks', 'tu contacto con los Nighthawks');
}
function factionAdjust(k, d, silent){
  const f = F(k); if(!f || !d) return;
  const r = (v)=>roll(v);
  if(d.publicRep) f.publicRep = clamp(f.publicRep + r(d.publicRep), -100, 100);
  if(d.secretRep) f.secretRep = clamp(f.secretRep + r(d.secretRep), -100, 100);
  if(d.trust) f.trust = clamp(f.trust + r(d.trust), -100, 100);
  if(d.suspicion){ let s = r(d.suspicion); if(s>0) s = Math.round(s*diffMult('attention')); f.suspicion = clamp(f.suspicion + s, 0, 100); }
  if(d.merit) f.merit = Math.max(0, f.merit + r(d.merit));
  if(d.strength) factionStrength(k, r(d.strength));
  if(d.access !== undefined){
    const a = r(d.access);
    if(a > f.access){ f.access = Math.min(5, a); if(!silent) logJournal(factionName(k), `Tu vínculo con ${factionShort(k)} cambia: ${FACTION_ACCESS_LABEL[f.access].toLowerCase()}.`, {cat:'faction', imp:1}); }
    if(f.access >= 1) factionMeet(k);
    if(f.access >= 2 && f.relationship==='neutral') f.relationship = 'cooperando';
  }
  // La sospecha muy alta de una facción con la que no tenés buena relación
  // termina en persecución (§43: riesgo acumulado).
  if(f.suspicion >= 85 && !f.hunted && f.relationship !== 'miembro' && k !== 'tarotClub') markHunted(k, 'la sospecha se volvió certeza');
}
function factionThatNotices(){
  const city = currentCity();
  const cands = FACTION_KEYS.filter(k=>k!=='tarotClub' && (city.factions[k]||0) > 0.25);
  return wpick(cands, k=>(city.factions[k]||0.2) * (STATE.world.factionMood[k]==='investigando'?2:1));
}
function maxFactionSuspicion(){ return Math.max(0, ...FACTION_KEYS.map(k=>F(k).suspicion||0)); }
function mostSuspiciousFaction(){
  let best = null, v = -1;
  FACTION_KEYS.forEach(k=>{ if(k==='tarotClub') return; const s = F(k).suspicion||0; if(s > v){ v = s; best = k; } });
  return v > 0 ? best : null;
}
function markHunted(k, reason){
  const f = F(k); if(!f || f.hunted) return;
  f.hunted = true; f.huntReason = reason; f.relationship = 'persiguiendo';
  factionMeet(k);
  logJournal('Te buscan', `${cap(factionShort(k))} te considera una amenaza (${reason}). Desde ahora, cada callejón oscuro puede ser el último.`, {cat:'faction', imp:3});
  remember('hunted_'+k, `${factionName(k)} empezó a perseguirte.`, {cat:'organization', faction:k});
  addMilestone('faction', `Perseguido por ${factionName(k)}`);
  STATE._importantMoment = true;
}
function huntingFactions(){ return FACTION_KEYS.filter(k=>F(k).hunted); }
function factionAgentFor(k){
  return {nighthawks:'nighthawkAgent', church:'nighthawkAgent', storm:'punisher', mi9:'mi9Agent', aurora:'auroraZealot', machinery:'mi9Agent', psychology:'hitman'}[k] || 'hitman';
}

/* ------------------------------ fórmulas custodiadas ------------------------------ */
// Cada vida sortea qué vías guarda cada facción (pesado por su afinidad).
function seedFactionFormulas(){
  FACTION_KEYS.forEach(k=>{
    const d = FACTIONS_DATA[k];
    const pw = Object.keys(d.pathways||{});
    const held = new Set();
    pw.forEach(p=>{ if(chance(0.85)) held.add(p); });
    const extra = Object.keys(PATHWAYS).filter(p=>!held.has(p));
    if(chance(0.5) && extra.length) held.add(pick(extra));
    F(k).formulas = [...held];
  });
}

/* ------------------------------ membresía ------------------------------ */
function joinConditions(k){
  const f = F(k), d = FACTIONS_DATA[k], c = STATE.character;
  const reqs = [
    {label:'Tenerles confianza ganada (colaborar con ellos)', ok: f.access >= 2},
    {label:'Que no sospechen demasiado de vos', ok: f.suspicion < 45},
    {label:'Mayor de edad', ok: c.edad >= 18},
    {label:'No estar enfrentado con ellos', ok: !factionHostile(k)}
  ];
  if(d.kind === 'church' || k==='nighthawks') reqs.push({label:'No pertenecer a la Orden de la Aurora', ok: !isMember('aurora')});
  if(k==='aurora') reqs.push({label:'No pertenecer a una iglesia ortodoxa', ok: !['church','nighthawks','storm','machinery'].some(isMember)});
  if(k==='nighthawks' || k==='machinery' || k==='psychology') reqs.push({label:'Ser Beyonder, o tener muchísimo mérito', ok: !!STATE.pathway.chosenPathway || f.merit >= 25});
  if(k==='tarotClub') reqs.push({label:'Ser invitado por El Loco', ok:false});
  return reqs;
}
function canJoin(k){ return k!=='tarotClub' && joinConditions(k).every(r=>r.ok); }
function joinFaction(k){
  if(timeBlocked() || !canJoin(k)) return;
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const f = F(k);
  f.access = 3; f.relationship = 'miembro'; f.rank = 1; f.joined = calendarYear(); f.trust = Math.max(f.trust, 20);
  const text = `Te aceptan en ${factionName(k)}. Te dan un rango (${FACTIONS_DATA[k].ranks[1]}), un sueldo modesto y una advertencia: "Lo que ves acá, no lo viste."`;
  logJournal('Una nueva pertenencia', text, {cat:'faction', imp:3});
  remember('joined_'+k, `Te uniste a ${factionName(k)}.`, {cat:'organization', faction:k});
  addMilestone('faction', `Se une a ${factionName(k)}`);
  (FACTIONS_DATA[k].secretLore||[]).slice(0,1).forEach(id=>learnLore(id, factionName(k)));
  if(k==='aurora'){ applyEffects({corruption:[3,6]}); addHiddenTruth('Cuando te uniste a la Aurora, tu nombre quedó escrito en un registro de MI9 esa misma semana.', {key:'aurora_registry'}); }
  // Enemigos naturales se enteran tarde o temprano.
  FACTIONS_DATA[k].enemies.forEach(e=>factionAdjust(e, {suspicion:6}, true));
  setResolution(factionName(k), text, []);
  saveGame(true); renderAll();
}
function leaveFaction(k){
  const f = F(k); if(!isMember(k)) return;
  f.access = 2; f.relationship = 'neutral'; f.rank = 0;
  factionAdjust(k, {trust:-15, suspicion: f.potionDebt ? 30 : 10});
  if(f.potionDebt && chance(0.4)) markHunted(k, 'se fue con lo que le dieron');
  logJournal('Te vas', `Dejás ${factionName(k)}. Nadie te detiene. Todos te miran salir.`, {cat:'faction', imp:2});
  if(k==='aurora' && chance(0.5)) scheduleConsequence({inMonths:[2,12], eventId:'aurora_revenge'});
  saveGame(true); renderAll();
}
// Traicionar: vender sus secretos a otra facción, o llevarse algo.
function betrayFaction(k, to){
  const f = F(k); if(!f || !isMember(k)) return;
  if(!spendFreeTime(1, true)) return;
  const secrets = (FACTIONS_DATA[k].secretLore||[]);
  secrets.forEach(id=>learnLore(id, factionName(k)));
  f.relationship = 'traicionada'; f.access = 0; f.rank = 0;
  factionAdjust(to, {trust:15, merit:10, access:Math.max(2, factionAccess(to))});
  applyEffects({cash:[150,600], corruption:[1,3]});
  remember('betrayed_'+k, `Traicionaste a ${factionName(k)} en favor de ${factionName(to)}.`, {cat:'betrayal', faction:k});
  addMilestone('faction', `Traiciona a ${factionName(k)}`);
  logJournal('Traición', `Le entregás a ${factionShort(to)} todo lo que sabés de ${factionShort(k)}. Te pagan bien. Ya no tenés a dónde volver.`, {cat:'faction', imp:3});
  if(chance(0.7)) scheduleConsequence({inMonths:[2,18], title:'Se enteraron', text:`${cap(factionShort(k))} sabe lo que hiciste.`, effect:{attention:10}, memory:{tag:'betrayal_known_'+k, text:`${factionName(k)} supo que los traicionaste.`, cat:'organization', faction:k}});
  f.suspicion = 80; markHunted(k, 'traición');
  saveGame(true); renderAll();
}

/* ------------------------------ colaborar (sin ser miembro) ------------------------------ */
// El camino de "contacto" a "colaborador/a": hacer cosas por ellos. Cada
// facción pide cosas distintas, y algunas cobran a su manera.
const FACTION_COLLAB_TEXT = {
  church:['Ayudás en la parroquia: repartir pan, ordenar archivos viejos, escuchar a quien no tiene a nadie.', 'Acompañás a un diácono a bendecir una casa. Él reza; vos mirás los rincones. Te agradece que no hagas preguntas.', 'Copiás a mano registros bautismales. En algunos, alguien tachó nombres con tinta negra.'],
  nighthawks:['Llevás un sobre de una dirección a otra, de noche, sin abrirlo.', 'Te piden que vigiles una puerta durante una noche entera. No pasa nada. Te agradecen igual, como si algo hubiera podido pasar.', 'Ayudás a vaciar un departamento después de "un incidente". Nadie te dice qué incidente.'],
  storm:['Ayudás a descargar donaciones para las familias de marineros perdidos.', 'Remás en un bote de la Iglesia para buscar a alguien que el mar no devolvió.', 'Anotás, en el puerto, qué barcos llegan y de dónde. Te pagan en pescado y en confianza.'],
  machinery:['Asistís a un técnico que mide "fluctuaciones" con aparatos de latón. Anotás números que no entendés.', 'Transportás una caja pesadísima que no debe inclinarse. Nadie te dice por qué.', 'Probás un invento que no hace nada visible. El técnico parece muy satisfecho.'],
  mi9:['Contás a un señor de traje gris lo que se dice en tu barrio. Anota todo.', 'Seguís a alguien una tarde y anotás adónde va. No sabés quién es.', 'Firmás un papel que dice que nunca firmaste nada.'],
  aurora:['Participás de una reunión a la luz de las velas. Te hablan del Creador. Te miran demasiado.', 'Llevás una ofrenda a un sótano. No te dicen qué hay en la caja. Pesa como algo vivo.', 'Te enseñan una oración. No te dicen a quién va dirigida.'],
  psychology:['Asistís a una sesión como "testigo". El paciente habla de un mar que está adentro de todos.', 'Ordenás fichas de pacientes. Algunas tienen dibujos que se repiten entre personas que no se conocen.', 'Te hacen un test con manchas. Te dicen que tus respuestas son "muy interesantes".']
};
function canCollaborate(k){
  const f = F(k);
  return k !== 'tarotClub' && !!f && f.known && f.access >= 1 && !isMember(k) && !factionHostile(k) && STATE.character.edad >= 14;
}
function factionCollaborate(k){
  if(timeBlocked() || !canCollaborate(k)) return;
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const f = F(k), d = FACTIONS_DATA[k];
  const before = snapshotForChanges();
  factionAdjust(k, {trust:[3,6], merit:[2,4], publicRep:[0,2]}, true);
  let text = pick(FACTION_COLLAB_TEXT[k] || ['Hacés lo que te piden, sin preguntar demasiado.']);
  if(k === 'aurora') applyEffects({corruption:[1,2]});
  if(k === 'nighthawks' && chance(0.12)){ applyEffects({sanity:[-5,-2]}); text += ' Esa noche ves algo que no te explican.'; }
  if(k === 'mi9' && chance(0.3)){ const other = pick(['aurora','tarotClub']); factionAdjust(other, {suspicion:2}, true); }
  (d.enemies||[]).forEach(e=>{ if(chance(0.15)) factionAdjust(e, {suspicion:2}, true); });
  if(f.access < 2 && f.trust >= 18 && f.merit >= 6){ factionAdjust(k, {access:2}); text += ` ${cap(factionShort(k))} empieza a contar con vos.`; }
  if(chance(0.3)){
    const lp = (d.secretLore||[]).filter(id=>!knowsLore(id));
    if(lp.length && f.access >= 2) learnLore(lp[0], factionName(k));
    else if(d.pathways) applyEffects({clue:{pathway:wpick(Object.keys(d.pathways), x=>d.pathways[x]), reliability:'real', strength:[2,5], source:factionName(k)}});
  }
  remember('collab_'+k, `Colaboraste con ${factionName(k)}.`, {cat:'organization', faction:k});
  logJournal(factionName(k), text, {cat:'faction', imp:1});
  setResolution(factionName(k), text, diffForDisplay(before));
  saveGame(true); renderAll();
}
// Una organización le ofrece a un miembro fiel convertirse en Beyonder.
function factionPotionAccept(k){
  const f = F(k), d = FACTIONS_DATA[k];
  const pool = (f.formulas||[]).filter(p=>PATHWAYS[p]);
  const pw = pool.length ? wpick(pool, p=>(d.pathways||{})[p]||1) : pick(Object.keys(d.pathways||{fool:1}));
  if(!isIdentified(pw)) identifyPathway(pw, factionName(k));
  if(knowledgeOf(pw) < 50) STATE.pathway.knowledge[pw] = 50;
  ['beyonders_exist','potions_named','sequences'].forEach(id=>learnLore(id, factionName(k)));
  const sd = seqData(pw, 9);
  addItem({cat:'potion', pathway:pw, seq:9, quality:rndInt(70,88), flaws:[], fidelity:'true', name:`Poción: ${sd ? sd.name : 'Sequence 9'} (Sequence 9)`, rarity:'raro',
    desc:`Preparada por ${factionName(k)}. Te la dieron en un frasco sin etiqueta.`, uses:'Beberla para convertirte en Beyonder.',
    risk:'Viene de gente que sabe. Igual puede salir mal. Y desde ahora les debés algo.', provenance:factionName(k)}, 1);
  f.merit = Math.max(0, f.merit - 12); f.potionDebt = true;
  remember('faction_potion_'+k, `${factionName(k)} te dio tu primera poción.`, {cat:'pact', faction:k});
  addHiddenTruth(`La poción que te dio ${factionName(k)} fue anotada en un registro. Desde ese día, tu nombre figura como "activo".`, {key:'faction_potion_registry'});
  return `Te citan en una sala sin ventanas. Sobre la mesa hay un frasco sin etiqueta y un papel con el nombre de lo que vas a ser: ${sd ? sd.name : 'algo nuevo'}. "Tomala cuando estés listo. No antes. Y recordá quién te la dio."`;
}

/* ------------------------------ pedidos (mérito) ------------------------------ */
const FACTION_REQUESTS = {
  formula:   {label:'Pedir una fórmula', minAccess:3, merit:12, desc:'Si custodian tu vía, pueden darte la fórmula que necesitás.'},
  ingredient:{label:'Pedir un ingrediente', minAccess:3, merit:8, desc:'De sus depósitos, algo que te falta.'},
  training:  {label:'Pedir entrenamiento', minAccess:3, merit:6, desc:'Alguien con experiencia te enseña cosas que no están en ningún libro.'},
  protection:{label:'Pedir protección', minAccess:2, merit:5, desc:'Que te saquen de encima a quien te está buscando.'},
  ritual:    {label:'Pedir un lugar para tu ritual', minAccess:4, merit:10, desc:'Un espacio consagrado, preparado y custodiado.'},
  artifact:  {label:'Pedir un artefacto en préstamo', minAccess:4, merit:14, desc:'De su depósito de objetos sellados.'}
};
function factionRequestAvailable(k, what){
  const f = F(k), r = FACTION_REQUESTS[what];
  if(!f || !r || factionHostile(k) || k==='tarotClub') return {ok:false, why:'No es posible.'};
  if(f.access < r.minAccess) return {ok:false, why:`Necesitás acceso: ${FACTION_ACCESS_LABEL[r.minAccess]}.`};
  if(f.merit < r.merit) return {ok:false, why:`Te falta mérito (${f.merit}/${r.merit}).`};
  if(what==='formula'){
    const t = formulaTargetFor(k); if(!t) return {ok:false, why:'No custodian la fórmula que necesitás (o no la necesitás).'};
  }
  if(what==='ingredient'){ if(!ingredientTargetFor(k)) return {ok:false, why:'No tienen nada que te falte.'}; }
  if(what==='training' && !STATE.pathway.chosenPathway) return {ok:false, why:'Primero tenés que ser Beyonder.'};
  if(what==='ritual' && (!STATE.pathway.chosenPathway || STATE.pathway.sequence<=0)) return {ok:false, why:'No tenés un ritual por delante.'};
  return {ok:true};
}
function formulaTargetFor(k){
  const f = F(k); const p = STATE.pathway;
  if(p.chosenPathway){
    const s = p.sequence - 1;
    if(s < 0 || !f.formulas.includes(p.chosenPathway) || hasFormula(p.chosenPathway, s, true)) return null;
    // Las fórmulas de Sequences altas no se entregan a cualquiera.
    if(s <= 5 && f.access < 4) return null;
    if(s <= 3 && f.access < 5) return null;
    return {pathway:p.chosenPathway, seq:s};
  }
  const cands = f.formulas.filter(x=>isIdentified(x) && !hasFormula(x, 9, true));
  return cands.length ? {pathway:pick(cands), seq:9} : null;
}
function ingredientTargetFor(k){
  const p = STATE.pathway;
  const t = p.chosenPathway ? {pathway:p.chosenPathway, seq:p.sequence-1} : (formulaTargetFor(k) || null);
  if(!t || t.seq < 0) return null;
  // Guardan ingredientes de las vías que custodian (y las grandes iglesias, de casi todo).
  if(!F(k).formulas.includes(t.pathway) && !['church','storm','machinery'].includes(k)) return null;
  const need = ingredientsNeededFor(t.pathway, t.seq).filter(n=>ownedQty(t.pathway, n) <= 0);
  return need.length ? {pathway:t.pathway, seq:t.seq, name:need[0]} : null;
}
function factionRequest(k, what){
  if(timeBlocked()) return;
  const av = factionRequestAvailable(k, what);
  if(!av.ok){ toast(av.why, 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const f = F(k), r = FACTION_REQUESTS[what];
  f.merit -= r.merit;
  let text = '';
  if(what==='formula'){
    const t = formulaTargetFor(k);
    addFormula(t.pathway, t.seq, 'true', factionName(k));
    text = `${cap(factionShort(k))} te entrega, en un sobre lacrado, la fórmula de ${formulaName(t.pathway, t.seq)}. "Esto nunca salió de acá."`;
    remember('faction_formula_'+k, `${factionName(k)} te dio una fórmula.`, {cat:'favor_received', faction:k});
  } else if(what==='ingredient'){
    const t = ingredientTargetFor(k);
    addIngredient(t.pathway, t.seq, t.name, rndInt(70,95), factionName(k));
    text = `Te dan, de sus depósitos, ${t.name}. De primera calidad.`;
  } else if(what==='training'){
    applyEffects({digestion:[3,6]});
    if(STATE.pathway.actingMethod < 2 && ['church','nighthawks','psychology','machinery'].includes(k) && f.access >= 4) { learnLore('acting_method', factionName(k)); text = 'Un superior te habla, a puertas cerradas, del Método de Actuación. "No lo repitas. No a cualquiera."'; }
    else { nudgeActingMethod(0.25, factionName(k)); text = 'Semanas de entrenamiento con alguien que ya recorrió tu camino. Te dice más cosas de las que te enseña.'; }
  } else if(what==='protection'){
    const hunters = huntingFactions().filter(h=>h!==k);
    STATE.world.attention = Math.max(0, STATE.world.attention - 25);
    FACTION_KEYS.forEach(x=>{ if(x!==k) F(x).suspicion = Math.max(0, F(x).suspicion - 15); });
    if(hunters.length && chance(0.5)){ const h = pick(hunters); F(h).hunted = false; F(h).relationship = 'enemiga'; text = `${cap(factionShort(k))} habla con ${factionShort(h)}. No sabés qué se dijeron. Dejan de buscarte.`; }
    else text = `${cap(factionShort(k))} "se ocupa". Durante un tiempo, nadie pregunta por vos.`;
  } else if(what==='ritual'){
    STATE.flags.factionRitualSite = k;
    text = `${cap(factionShort(k))} te reserva un espacio consagrado para tu próximo ritual.`;
  } else if(what==='artifact'){
    const key = pick(ARTIFACT_KEYS.filter(a=>ARTIFACTS[a].grade>=2));
    addArtifact(key, factionName(k)+' (en préstamo)', {loan:k});
    text = `Te prestan ${ARTIFACTS[key].name}. "Lo devolvés entero. Vos también."`;
  }
  logJournal(factionName(k), text, {cat:'faction', imp:2});
  setResolution(r.label, text, []);
  saveGame(true); renderAll();
}
// Vender un secreto (lore) a una facción: plata y mérito, pero se sabe.
function sellLoreTo(k, loreId){
  const L = LORE[loreId]; const f = F(k);
  if(!L || !f || factionAccess(k) < 1 || !knowsLore(loreId)) return;
  const v = Math.round((40 + L.tradeValue*70)*priceIndex());
  applyEffects({cash:v});
  factionAdjust(k, {merit:L.tradeValue*2, trust:L.tradeValue});
  if(L.faction && L.faction !== k){ factionAdjust(L.faction, {suspicion:L.tradeValue*4}, true); addHiddenTruth(`${cap(factionShort(L.faction))} supo que vendiste "${L.title}" a ${factionShort(k)}.`); }
  STATE.lore.sold = STATE.lore.sold || []; STATE.lore.sold.push(loreId);
  const text = `Le vendés a ${factionShort(k)} lo que sabés sobre "${L.title}". Te pagan ${fmtMoney(v)}.`;
  logJournal('Un secreto vendido', text, {cat:'faction', imp:1});
  setResolution('Un secreto vendido', text, []);
  saveGame(true); renderAll();
}

/* ------------------------------ tick de facciones (mensual) ------------------------------ */
function factionTick(){
  if(STATE.character.edad < 13) return;
  FACTION_KEYS.forEach(k=>{
    const f = F(k);
    // La sospecha se enfría sola, más rápido si vivís tranquilo.
    if(f.suspicion > 0 && chance(0.3)) f.suspicion = Math.max(0, f.suspicion - (STATE.flags.quietSeasons >= 2 ? 2 : 1));
    // Una persecución sin resultados termina perdiendo prioridad.
    if(f.hunted && chance(STATE.flags.quietSeasons >= 2 ? 0.03 : 0.012)){
      f.hunted = false; f.relationship = 'enemiga'; f.suspicion = Math.min(f.suspicion, 60);
      logJournal(factionName(k), `Pasa el tiempo. ${cap(factionShort(k))} tiene otras prioridades. Dejás de sentir que te siguen. No te olvidaron: te archivaron.`, {cat:'faction', imp:2});
    }
    // Sueldo y rango de los miembros.
    if(isMember(k)){
      const sal = (FACTIONS_DATA[k].salary||[])[f.rank] || 0;
      if(sal) STATE.character.cash += Math.round(sal * priceIndex());
      if(f.merit >= 20 + f.rank*15 && f.rank < 4 && chance(0.05)){
        f.rank++; if(f.rank >= 3) f.access = Math.max(f.access, 4); if(f.rank >= 4) f.access = 5;
        logJournal(factionName(k), `Te ascienden: ${FACTIONS_DATA[k].ranks[f.rank]}.`, {cat:'faction', imp:2});
        addMilestone('faction', `${FACTIONS_DATA[k].ranks[f.rank]} de ${factionName(k)}`);
      }
      // Un miembro que nunca cumple sus deberes pierde confianza.
      if(STATE.time.totalMonths - (f.lastDuty||0) > 18 && chance(0.05)){ factionAdjust(k, {trust:-6}); logJournal(factionName(k), `Te recuerdan, con frialdad, que un miembro también tiene deberes.`, {cat:'faction'}); f.lastDuty = STATE.time.totalMonths - 12; }
    }
  });
  // Un miembro fiel que todavía no es Beyonder puede recibir una oferta.
  if(!STATE.pathway.chosenPathway && STATE.character.edad >= 18 && STATE.character.edad <= 55 && !STATE.pendingEvent && !STATE.combat){
    const k = memberFactions().find(x=>x!=='tarotClub' && F(x).merit >= 18 && !F(x).potionOffered && (F(x).formulas||[]).length);
    if(k && chance(0.08)){ F(k).potionOffered = true; triggerEventById('fac_potion_offer', {f:k}); }
  }
  // Reclutamiento: un Beyonder sin afiliación y sin sospechas llama la atención
  // de quien está buscando gente (§29: las organizaciones reclutan).
  if(STATE.pathway.chosenPathway && !memberFactions().length && chance(0.015)){
    const k = wpick(['church','nighthawks','storm','machinery','mi9','psychology'], x=>(currentCity().factions[x]||0.2) * (F(x).suspicion<40?1:0.1) * (factionHostile(x)?0:1));
    if(k && factionAccess(k) < 2){ factionMeet(k); factionAdjust(k, {access:2, trust:8}); logJournal('Una invitación', `${cap(factionShort(k))} te hace llegar, con mucha discreción, una propuesta: trabajar con ellos.`, {cat:'faction', imp:2}); STATE._importantMoment = true; }
  }
}
