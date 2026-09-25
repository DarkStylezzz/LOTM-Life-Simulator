'use strict';
/* =========================================================================
   systems/acting.js — el Método de Actuación y la digestión (§18, §19).
   Digerir NO es juntar XP. Es vivir según el principio del rol que nombra
   tu poción. Cada escena se arma con una semilla (o con un molde genérico
   construido desde el principio de tu Sequence) y con tu vida: tu trabajo,
   tu familia, alguien cercano. Lo que elegís se evalúa como una ACTUACIÓN:
     calidad = alineación con el principio + personalidad + profesión +
               reputación + relación con quien mira + experiencia en el rol
               − cordura baja − corrupción, con algo de azar
   Excelente: digestión, reputación, un vínculo o un secreto.
   Mala: menos digestión, sospechas, vínculos dañados, corrupción.
   Además la digestión avanza (o retrocede) sola, mes a mes, según cuánto
   tu vida cotidiana se parezca a tu rol: el trabajo que elegiste, la
   consistencia de tus actuaciones y tus desvíos (§19).
   El Método en sí es un SECRETO (canon): sin conocerlo, digerís despacio y
   a ciegas; con una intuición, podés practicar; entendiéndolo, ves tu
   progreso con claridad.
   ========================================================================= */
function actingMethodLevel(){ return STATE.pathway.actingMethod || 0; }
// Avanza la comprensión del Método (intuición en 1, comprensión en 2).
function nudgeActingMethod(amount, source){
  const p = STATE.pathway;
  if(!p.chosenPathway || p.actingMethod >= 2) return;
  const before = p.actingMethod;
  p.actingMethodProgress = (p.actingMethodProgress||0) + amount;
  if(p.actingMethodProgress >= 2){ p.actingMethod = 2; learnLore('acting_method', source); return; }
  if(p.actingMethodProgress >= 1 && before < 1){
    p.actingMethod = 1;
    logJournal('Una intuición', `${source ? cap(source)+'. ' : ''}Empezás a sospechar que la poción no se asimila sola: que el nombre de tu poción es una instrucción. Que hay que ser un ${currentRole().role}.`, {cat:'pathway', imp:3});
    addMilestone('mystic', 'Intuye el Método de Actuación');
    STATE._importantMoment = true;
  }
}

/* ------------------------------ armar la escena ------------------------------ */
function actingNpcFor(kind){
  const people = aliveNpcs().filter(n=>n.met && n.lifeState==='presente');
  let pool = people;
  if(kind === 'close') pool = people.filter(n=>bondScore(n) >= 40);
  else if(kind === 'family') pool = people.filter(isFamilyNpc);
  else if(kind === 'work') pool = people.filter(n=>n.relType==='work' || n.flags.rival || !isFamilyNpc(n));
  return pool.length ? pick(pool) : null;
}
function buildActingScene(){
  const p = STATE.pathway;
  const key = p.chosenPathway, seq = p.sequence;
  const role = currentRole();
  const seeds = ACTING_SEEDS.filter(s=>s.pw===key && s.seqs.includes(seq));
  const recent = (p.acting.history||[]).slice(-4).map(h=>h.seed);
  let fresh = seeds.filter(s=>!recent.includes(s.id));
  let tpl;
  if(fresh.length && chance(0.7)) tpl = pick(fresh);
  else {
    const gens = ACTING_GENERIC.filter(g=>!recent.includes(g.id));
    tpl = pick(gens.length ? gens : ACTING_GENERIC);
    if(fresh.length && chance(0.4)) tpl = pick(fresh);
  }
  let npc = null;
  if(tpl.npc){ npc = actingNpcFor(tpl.npc); if(!npc && tpl.npc !== 'any'){ const alt = fresh.filter(s=>!s.npc); if(alt.length) tpl = pick(alt); else tpl = ACTING_GENERIC[0]; } }
  if(tpl.npc && !npc) npc = actingNpcFor('any');
  const fill = (s)=> String(s||'').replace(/\{npc\}/g, npc ? npc.name : 'alguien').replace(/\{role\}/g, role.role);
  const showAlign = actingMethodLevel() >= 1;
  return {
    seed: tpl.id, role: role.role, principle: role.principle, npc: npc ? npc.id : null,
    title: fill(tpl.title), text: fill(tpl.text),
    choices: tpl.choices.map((c,i)=>({idx:i, label:fill(c.label), small: showAlign ? fill(c.small||'') : '', align:c.align, extra:c.extra||null, npcRel:c.npcRel||null}))
  };
}
// Actuar a conciencia (requiere al menos intuir el Método).
function doActing(){
  if(timeBlocked() || !STATE.pathway.chosenPathway) return;
  if(!canUseSeasonAction('acting')){ toast('Ya actuaste tu rol esta temporada.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  useSeasonAction('acting'); markMysticAct();
  const sc = buildActingScene();
  sc.deliberate = actingMethodLevel() >= 1;
  STATE.pendingEvent = Object.assign({kind:'acting'}, sc);
  saveGame(true); renderAll();
}
// Sin conocer el Método: "usar tus poderes", vivir tu nueva naturaleza sin
// entenderla. Es la misma escena, pero a ciegas.
function usePowersBlind(){ doActing(); }

/* ------------------------------ evaluar la actuación ------------------------------ */
const ALIGN_BASE = {aligned:62, bold:70, neutral:35, contradict:14};
function actingQuality(choice, scene){
  const c = STATE.character, p = STATE.pathway;
  const role = (ACTING_ROLES[p.chosenPathway]||{})[p.sequence] || {fit:[]};
  let q = ALIGN_BASE[choice.align] ?? 35;
  const tags = playerTags();
  let fitBonus = 0;
  (role.fit||[]).forEach(t=>{ if(tags.has(t)) fitBonus += 8; });
  if(choice.align === 'contradict') fitBonus = -fitBonus/2;
  q += fitBonus;
  // Tu trabajo encaja con tu rol: actuás "de oficio".
  const job = JOBS[c.profesion];
  if(job && job.align && (job.align[p.chosenPathway]||[]).includes(p.sequence) && choice.align !== 'contradict') q += 10;
  // Roles "de público" rinden más con reputación.
  if(/Payaso|Bardo|Estafador|Hipnotista|Mago|Sin Rostro|Cantor/.test(role.role||'')) q += clamp(c.reputation,0,60)/6;
  // Experiencia acumulada en ESTE rol.
  const hist = p.acting.history || [];
  const same = hist.filter(h=>h.role===role.role && h.align!=='contradict').length;
  q += Math.min(14, same*2);
  // Alguien cercano mira: la emoción suma a lo auténtico y resta a lo falso.
  const npc = scene.npc ? npcById(scene.npc) : null;
  if(npc){ const b = bondScore(npc); if(choice.align==='aligned' || choice.align==='bold') q += b/15; else if(choice.align==='contradict') q -= b/15; }
  // Recuerdos que pesan: el trauma dificulta los roles sociales.
  if(memoriesByCat('trauma').length >= 3 && /Payaso|Bardo|Poeta|Suplicante de Luz/.test(role.role||'')) q -= 6;
  // Estado mental.
  if(c.sanity < 40) q -= (40 - c.sanity)/2;
  if(choice.align === 'bold' && c.corruption > 30) q -= (c.corruption-30)/3;
  // Artefactos y buffs.
  if(STATE.flags.actingBuffUntil > STATE.time.totalMonths) q += STATE.flags.actingBuff || 0;
  q += pathwayMods().acting || 0;
  q += artifactResonance() * 5;   // la máscara sin rasgos resuena con quien cambia de rostro
  // Azar (mayor en lo arriesgado).
  const spread = choice.align === 'bold' ? 26 : choice.align === 'aligned' ? 14 : 10;
  q += rnd(-spread, spread) + luckMod()*60;
  return clamp(Math.round(q), 0, 100);
}
function qualityTier(q){ return q >= 80 ? 'excelente' : q >= 60 ? 'buena' : q >= 35 ? 'mediocre' : 'mala'; }
const QUALITY_TEXT = {
  excelente: 'Es una actuación perfecta. Por un momento no actuás: sos.',
  buena: 'Lo hacés bien. El papel te queda cómodo.',
  mediocre: 'Sale, pero sin convicción. El papel te queda grande, o chico.',
  mala: 'Te sale todo mal. Hay algo en vos que rechaza el papel, y se nota.'
};

function resolveActingChoice(idx){
  const pe = STATE.pendingEvent;
  if(!pe || pe.kind !== 'acting') return;
  const choice = pe.choices[idx];
  STATE.pendingEvent = null;
  const p = STATE.pathway, c = STATE.character;
  const before = snapshotForChanges();
  let resultBits = [];
  if(choice.align === 'neutral'){
    resultBits.push('Decidís no exponerte hoy.');
    recordActing(pe, choice, null);
  } else {
    const q = actingQuality(choice, pe);
    const tier = qualityTier(q);
    const npc = pe.npc ? npcById(pe.npc) : null;
    // Digestión según calidad, Sequence (más alta = más lenta), consistencia
    // y cuánto entendés el Método.
    const baseDig = {excelente:[10,16], buena:[6,10], mediocre:[1,3], mala:[-8,-3]}[tier];
    const seqFactor = 1 - (9 - p.sequence)*0.06;
    const methodFactor = [0.55, 1, 1.25][actingMethodLevel()];
    let dig = roll(baseDig);
    if(dig > 0) dig = dig * seqFactor * methodFactor * actingConsistencyMult();
    const eff = {digestion: Math.round(dig*10)/10};
    if(choice.extra) Object.assign(eff, choice.extra);
    if(tier === 'excelente'){
      eff.reputation = (eff.reputation ? roll(eff.reputation) : 0) + rndInt(1,3);
      if(npc) adjustRel(npc, {respect:[3,7], affection:[2,5]});
      if(chance(0.3)){
        if(npc && npc.secrets.some(s=>!s.known)) learnNpcSecret(npc);
        else if(chance(0.5)) applyEffects({clue:{pathway:'$random', reliability:'real', strength:[2,5], source:'tu propia actuación'}});
        else { const n2 = createNpc({relType:'acquaintance', met:true, trust:15, affection:12, tier:'comun'}); resultBits.push(`De paso, conocés a ${n2.name}, que quedó impresionado.`); }
      }
    } else if(tier === 'mala'){
      eff.corruption = (eff.corruption ? roll(eff.corruption) : 0) + rndInt(0,2);
      if(npc) adjustRel(npc, {suspicion:[4,10], affection:-3});
      else raiseAttention(rndInt(1,3));
      if(choice.align === 'bold') eff.salud = (eff.salud ? roll(eff.salud) : 0) - rndInt(0,5);
    }
    if(npc && choice.npcRel) adjustRel(npc, choice.npcRel);
    if(npc) { meetNpc(npc); npc.interactions = (npc.interactions||0)+1; }
    applyEffects(eff);
    recordActing(pe, choice, q);
    c.stats.actings++;
    resultBits.unshift(QUALITY_TEXT[tier]);
    if(actingMethodLevel() >= 2) resultBits.push(`(Actuación ${tier}.)`);
    // Sin conocer el Método, a veces te das cuenta solo.
    if(actingMethodLevel() < 2 && (tier === 'excelente' || tier === 'buena')) nudgeActingMethod(tier==='excelente' ? 0.3 : 0.15, 'actuando tu papel sin saberlo');
  }
  const changes = diffForDisplay(before);
  logJournal('Actuar: ' + pe.title, choice.label + '. ' + resultBits.join(' '), {cat:'pathway', imp:1});
  setResolution(pe.title, resultBits.join(' '), changes);
  checkDeathAndCrisis();
  maybeReadyForAdvancement(before.digestion);
  saveGame(true); renderAll();
}
function recordActing(pe, choice, q){
  const a = STATE.pathway.acting;
  a.history.push({m:STATE.time.totalMonths, seed:pe.seed, role:pe.role, align:choice.align, q});
  if(a.history.length > 30) a.history.shift();
  if(q !== null) a.quality = Math.round(a.quality*0.7 + q*0.3);
  const rel = a.history.filter(h=>h.align!=='neutral').slice(-6);
  if(rel.length){
    a.consistency = Math.round(rel.filter(h=>h.align==='aligned' || h.align==='bold').length / rel.length * 100)/100;
    a.deviation = rel.filter(h=>h.align==='contradict').length;
  }
  // Compatibilidad con el historial viejo (careful/risky/neutral).
  STATE.character.actingHistory = STATE.character.actingHistory || [];
}
// Consistencia (§19): actuar parecido mes a mes digiere mejor.
function actingConsistencyMult(){
  const a = STATE.pathway.acting;
  const rel = (a.history||[]).filter(h=>h.align!=='neutral');
  if(rel.length < 3) return 1;
  return clamp(0.7 + a.consistency*0.55, 0.8, 1.25);
}
function actingStyleLabel(){
  const a = STATE.pathway.acting;
  const rel = (a.history||[]).filter(h=>h.align!=='neutral').slice(-6);
  if(rel.length < 3) return null;
  if(a.deviation >= 3) return 'Últimamente vivís contra tu propio papel. La poción lo nota: se revuelve, no se asienta.';
  if(a.consistency >= 0.85) return 'Hace tiempo que vivís de acuerdo a lo que sos. Se nota — en vos y en cómo te mira la gente.';
  if(a.consistency <= 0.5) return 'Tu forma de actuar viene siendo errática — ni tu cuerpo ni tu mente terminan de acostumbrarse.';
  return null;
}

/* ------------------------------ digestión pasiva (mensual) ------------------------------ */
// El comportamiento de todos los días importa: un Vidente que trabaja de
// adivino, un Insomne que hace guardias nocturnas, una Marinera en el
// puerto, digieren solos; quien contradice su rol todo el tiempo, sufre.
function passiveDigestion(){
  const p = STATE.pathway, c = STATE.character;
  if(!p.chosenPathway || p.digestion >= 100) return;
  let d = 0.25; // vivir con la poción adentro ya digiere un poco
  const job = JOBS[c.profesion];
  if(job && job.align && (job.align[p.chosenPathway]||[]).includes(p.sequence)) d += 0.9;
  const a = p.acting;
  d += (a.consistency - 0.5) * 0.6;
  d -= (a.deviation||0) * 0.25;
  d *= [0.6, 1, 1.2][actingMethodLevel()];
  d *= (1 - (9 - p.sequence)*0.05) * diffMult('digestion') * getTraitMods().digestionMult;
  if((a.deviation||0) >= 3 && chance(0.2)) applyEffects({corruption:1, sanity:-1});
  p.digestion = clamp(Math.round((p.digestion + d)*10)/10, 0, 100);
}
function digestionLabel(){
  const d = STATE.pathway.digestion;
  if(d >= 100) return 'La poción está completamente digerida. Ya no la sentís: sos ella.';
  if(d >= 75) return 'Casi no sentís la poción. Queda poco.';
  if(d >= 50) return 'La poción se asienta. Ya no pelea tanto.';
  if(d >= 25) return 'La poción empieza a ceder, de a poco.';
  return 'La poción todavía se resiste dentro tuyo.';
}
function maybeReadyForAdvancement(prev){
  const p = STATE.pathway;
  if(!p.chosenPathway || p.sequence <= 0) return;
  const req = DIGESTION_REQ[p.sequence] || 100;
  if(p.digestion >= req && (prev === undefined || prev < req)){
    logJournal('Digestión completa', 'Algo en vos se acomoda del todo. La poción ya no te pertenece: sos vos. Podés pensar en el próximo paso.', {cat:'pathway', imp:3});
    toast('La poción está digerida. Podés pensar en el ritual.', 'pos');
    STATE._importantMoment = true;
  }
}

/* ------------------------------ lo místico, mes a mes ------------------------------ */
function monthlyMystic(){
  const p = STATE.pathway, c = STATE.character;
  const prevDig = p.digestion;
  passiveDigestion();
  maybeReadyForAdvancement(prevDig);
  expireLeads();
  if(STATE.character.edad >= 16) maybeIngredientLead();
  artifactMonthly();
  characteristicInfluence();
  // Exposición ambiental mínima (el mundo siempre filtra algo) y decaimiento
  // si no te metés: una vida "normal" puede volver a serlo.
  if(c.edad >= 13){
    if(STATE.season.mysticActs) STATE.flags.mysticExposure += 0.2;
    else if(STATE.flags.mysticExposure > 5 && chance(0.2)) STATE.flags.mysticExposure -= 0.5;
  }
  // Sin conocer el Método, a veces el cuerpo te lo cuenta de a poco.
  if(p.chosenPathway && p.actingMethod < 1 && monthsSincePotion() >= 18 && chance(0.02 * diffMult('hints'))) nudgeActingMethod(1, 'con el tiempo');
  // Reconstruir una fórmula sola, a fuerza de comprensión (camino lento del
  // sistema anterior): sólo si ya la entendés casi toda.
  if(!p.chosenPathway){
    Object.keys(PATHWAYS).forEach(k=>{
      if(isIdentified(k) && knowledgeOf(k) >= 70 && !hasFormula(k, 9) && chance(0.02)){
        addFormula(k, 9, chance(0.4) ? 'true' : 'partial', 'tu propia reconstrucción');
        logJournal('Una fórmula reconstruida', `Juntando todo lo que sabés de la vía ${PATHWAYS[k].name}, lográs reconstruir su primera fórmula. O algo que se le parece mucho.`, {cat:'pathway', imp:2});
      }
    });
  }
  // Presencia de lo sobrenatural en Sequences altas: amenaza que atrae.
  if(p.chosenPathway && p.sequence <= 4 && chance(0.01)) STATE.world.threat = clamp(STATE.world.threat + 1, 0, 100);
}
function mysticExposureChance(){
  const exp = STATE.flags.mysticExposure || 0;
  const k = sum(Object.values(STATE.pathway.knowledge));
  let base = 0.012 + exp/450 + k/1500 + (STATE.world.mysticBoost||0)*0.05;
  base *= getTraitMods().mysticExposureMult * diffMult('mystic') * (0.6 + currentCity().occult*0.8);
  if(STATE.pathway.chosenPathway) base += 0.03;
  return clamp(base, 0.008, 0.3);
}
