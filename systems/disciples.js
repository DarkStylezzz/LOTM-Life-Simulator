'use strict';
/* =========================================================================
   systems/disciples.js — discípulos.
   Desde la Sequence 7, un Beyonder puede tomar a alguien de su vida como
   discípulo (uno; dos desde la Sequence 5; tres desde la 3). Para eso esa
   persona tiene que saber lo que sos. El estado vive en el NPC:
     n.disciple = {since, pathway, progress, lessons, lastTaught, aptitude, quality}
   y su Sequence, cuando la tenga, en n.hidden (como cualquier Beyonder).
   - Enseñarle (una vez por temporada) suma progreso; al llegar al tope, la
     próxima poción: con tu ayuda (y tu plata) o por su cuenta. Puede salir
     mal, como cualquier poción.
   - Nunca llega a tu altura mientras vos le enseñes: la Sequence siguiente
     a la tuya es el techo.
   - Un discípulo que ya es Beyonder a veces te trae lo que te falta.
   - Cuando la vida termina, un discípulo puede seguir la historia (ver
     succeedAsDisciple en systems/lineage.js): arranca como Beyonder de tu vía.
   ========================================================================= */
function disciples(){ return aliveNpcs().filter(n=>n.disciple); }
function maxDisciples(){
  const p = STATE.pathway;
  if(!p.chosenPathway || typeof p.sequence !== 'number') return 0;
  return p.sequence <= 3 ? 3 : p.sequence <= 5 ? 2 : p.sequence <= 7 ? 1 : 0;
}
function discipleWord(n){ return ng(n, 'discípulo', 'discípula'); }
function discipleSeq(n){ return n.disciple && n.hidden.pathway === n.disciple.pathway && typeof n.hidden.sequence === 'number' ? n.hidden.sequence : null; }
// La próxima poción que tomaría, cuánto hace falta para llegar y si podés llevarlo ahí.
function discipleTarget(n){ const s = discipleSeq(n); return s === null ? 9 : s - 1; }
function discipleNeed(target){ return Math.round(100 * (1 + (9 - target) * 0.25)); }
function discipleCanReach(target){ const p = STATE.pathway; return !!p.chosenPathway && target > p.sequence && target >= 0; }
function disciplePotionCost(target){ return Math.round(seekPrice(target) * 1.2); }
function taughtThisSeason(n){ return !!n.disciple && (n.disciple.lastTaught ?? -99) >= (STATE.season.start ?? 0); }

/* ------------------------------ tomar un discípulo ------------------------------ */
function canTakeDisciple(n){
  const p = STATE.pathway;
  if(!p.chosenPathway || typeof p.sequence !== 'number' || p.sequence > 7 || isDivine()) return false;
  if(!n || !n.alive || !n.met || n.lifeState !== 'presente' || n.disciple || n.flags.fellowDisciple) return false;
  const age = npcAge(n);
  if(age < 14 || age > 45) return false;
  // Alguien que ya camina otra vía no puede tomar la tuya; alguien de la tuya, sólo si está por debajo.
  if(n.hidden.pathway && (n.hidden.pathway !== p.chosenPathway || (typeof n.hidden.sequence === 'number' && n.hidden.sequence <= p.sequence))) return false;
  if(disciples().length >= maxDisciples()) return false;
  if((n.suspicion||0) >= 40 || (n.fear||0) >= 50) return false;
  return n.trust >= 40 || (isFamilyNpc(n) && n.affection >= 50);
}
function offerDiscipleship(n){
  const p = STATE.pathway;
  const acc = clamp(0.3 + n.trust/250 + (n.respect||0)/300 + (n.mystic||0)/250 + (n.knows.beyonder ? 0.15 : 0) + (isFamilyNpc(n) ? 0.1 : 0), 0.1, 0.92);
  if(!chance(acc)){
    n.knows.partial = true;
    adjustRel(n, {suspicion:[4,10], trust:-3});
    if(n.hidden.faction) factionAdjust(n.hidden.faction, {suspicion:[2,5]}, true);
    return `Le contás a ${n.name} lo que sos y lo que podrías enseñarle. Te escucha hasta el final, con cara de no saber si reírse o asustarse. Dice que no. Desde ese día, te mira distinto.`;
  }
  n.knows.beyonder = true;
  n.disciple = {since: calendarYear(), pathway: p.chosenPathway, progress: 0, lessons: 0, lastTaught: -99,
    aptitude: Math.round(rnd(0.75, 1.25)*100)/100, quality: 50};
  adjustRel(n, {trust:[6,12], respect:[8,14], loyalty:[8,14], dependence:[3,6]});
  n.mystic = Math.max(n.mystic||0, 40);
  remember('disciple_'+n.id, `Tomaste a ${n.name} como ${discipleWord(n)}.`, {cat:'person', npc:n.id});
  addMilestone('mystic', `Toma a ${n.name} como ${discipleWord(n)}`);
  const already = discipleSeq(n);
  return already !== null
    ? `${n.name} ya caminaba tu vía, a tientas y sin nadie que le explicara. Cuando le mostrás lo que sabés, se le llenan los ojos de lágrimas. Acepta ser tu ${discipleWord(n)} antes de que termines de preguntar.`
    : `Le contás a ${n.name} lo que sos y lo que hay del otro lado. Te escucha sin interrumpir. Al final pregunta una sola cosa: "¿Cuándo empezamos?".`;
}
function releaseDisciple(n){
  if(!n || !n.disciple) return '';
  delete n.disciple;
  n.flags.formerDisciple = true;
  adjustRel(n, {affection:[1,4], dependence:-6});
  remember('disciple_left_'+n.id, `${n.name} dejó de ser tu ${ng(n,'discípulo','discípula')}.`, {cat:'person', npc:n.id});
  return `Le decís a ${n.name} que ya no tenés nada más para enseñarle, o que tiene que encontrar su propio camino. Las dos cosas son un poco ciertas.`;
}

/* ------------------------------ enseñar ------------------------------ */
function teachDisciple(n){
  const d = n.disciple, p = STATE.pathway;
  if(!d) return '';
  const base = 12 + (9 - p.sequence) * 1.5 + (p.actingMethod >= 2 ? 4 : 0) + (n.trust >= 60 ? 3 : 0);
  const gain = Math.max(4, Math.round(base * d.aptitude * rnd(0.85, 1.15)));
  d.lessons++; d.lastTaught = STATE.time.totalMonths;
  d.quality = clamp(d.quality + rndInt(1,4) + (p.actingMethod >= 2 ? 1 : 0), 0, 100);
  adjustRel(n, {respect:[2,5], loyalty:[1,4], trust:[1,3], dependence:[0,2]});
  markMysticAct();
  // Explicar tu papel también te lo explica a vos.
  applyEffects({digestion:[1,2]});
  const target = discipleTarget(n), need = discipleNeed(target);
  if(!discipleCanReach(target)){
    d.progress = Math.min(need - 1, d.progress + gain);
    return `Pasan la tarde repasando lo que ${n.name} ya sabe. Te das cuenta de que no podés ${ng(n, 'llevarlo', 'llevarla')} más lejos: la próxima poción de su camino es la tuya. Mientras seas su ${gx('maestro','maestra','maestre')}, ese es el techo.`;
  }
  d.progress = Math.min(need, d.progress + gain);
  if(d.progress >= need){
    triggerEventById('dis_ready', {npc:n});
    return `${n.name} entiende algo que le venías explicando hace meses. Se le nota en la cara: está ${ng(n,'listo','lista')} para dar el paso.`;
  }
  const s = discipleSeq(n);
  return pick(s === null ? [
    `Le explicás a ${n.name} qué es una pista, cómo se sigue un hilo, qué preguntas no hay que hacer en voz alta. Toma notas en un cuaderno que esconde debajo del colchón.`,
    `Una tarde entera de símbolos, velas y precauciones. ${n.name} aprende rápido. Demasiado rápido, a veces.`,
    `Le mostrás, por primera vez, algo de lo que podés hacer. No se asusta. Eso te preocupa un poco.`
  ] : [
    `Practican juntos el papel de su Sequence. ${n.name} se equivoca, se ríe, vuelve a probar.`,
    `Le hablás del Método de Actuación como te hubiera gustado que te lo explicaran a vos. ${n.name} escucha con los ojos cerrados.`,
    `Una lección dura: lo que pasa cuando la poción no se digiere. ${n.name} vuelve a su casa en silencio.`
  ]);
}
// El paso: la próxima poción. mode: 'full' (con tu ayuda y tu plata), 'wait' (esperar), 'alone' (por su cuenta).
function discipleAdvance(n, mode){
  const d = n.disciple;
  if(!d || !n.alive) return 'Ya no está para eso.';
  const target = discipleTarget(n);
  if(mode === 'wait'){ d.quality = clamp(d.quality + 6, 0, 100); d.progress = Math.max(0, d.progress - 10); return `Le pedís a ${n.name} que espere un poco más. No le gusta, pero obedece. La próxima vez va a estar mejor ${ng(n,'preparado','preparada')}.`; }
  let help = 0;
  if(mode === 'full'){
    const cost = disciplePotionCost(target);
    const o = org();
    const fromOrg = o ? Math.min(o.treasury, cost) : 0;
    if(!canAfford(cost - fromOrg)) return `Juntar los ingredientes cuesta ${fmtMoney(cost)} y no te alcanza. ${n.name} va a tener que esperar.`;
    if(fromOrg) o.treasury -= fromOrg;
    if(cost - fromOrg > 0) payFromCashOrBank(cost - fromOrg);
    help = 0.12;
  }
  const diff = target === 9 ? {baseSuccess:0.78} : (ADVANCE_DIFFICULTY[target + 1] || {baseSuccess:0.3});
  const pOk = clamp(diff.baseSuccess + (d.quality - 50)/150 + help - (mode === 'alone' ? 0.12 : 0), 0.08, 0.93);
  d.progress = 0;
  const role = (ACTING_ROLES[d.pathway]||{})[target];
  const roleName = role ? role.role : (seqData(d.pathway, target)||{}).name || `Sequence ${target}`;
  if(chance(pOk)){
    n.hidden.pathway = d.pathway; n.hidden.sequence = target;
    n.known.pathway = true; n.known.sequence = true;
    n.mystic = Math.max(n.mystic||0, 70);
    adjustRel(n, {loyalty:[4,8], respect:[3,6]});
    logJournal(`${n.name}: ${roleName}`, `${n.name} toma la poción de ${roleName}${mode === 'full' ? ' con vos al lado' : ' por su cuenta'}. A la mañana, ya no es del todo quien era. ${target === 9 ? 'Es Beyonder.' : `Sequence ${target}.`}`, {cat:'pathway', imp:2});
    addMilestone('mystic', `${n.name} llega a la Sequence ${target} (${roleName})`);
    remember('disciple_adv_'+n.id+'_'+target, `${n.name}, tu ${discipleWord(n)}, llegó a la Sequence ${target}.`, {cat:'achievement', npc:n.id});
    return target === 9
      ? `Juntos consiguen los ingredientes, juntos preparan la poción. ${n.name} la bebe de un trago, como le enseñaste. Durante una hora grita, tiembla y no te reconoce. Después abre los ojos, y te reconoce. Es Beyonder.`
      : `${n.name} llega a la Sequence ${target}: ${roleName}. Cuando vuelve del ritual te abraza como a ${gx('un padre','una madre','alguien de su sangre')}, o como a alguien que le salvó la vida. Las dos cosas, quizás.`;
  }
  if(chance(0.45)){
    applyEffects({sanity:-rndInt(6,14)});
    npcDies(n, 'perdió el control', `${n.name} no sobrevive a la poción de ${roleName}. Lo que queda, al final, ya no es una persona. Tenés que ser vos quien lo termine.`);
    remember('disciple_lost_'+n.id, `${n.name} perdió el control con la poción que le ayudaste a preparar.`, {cat:'trauma', npc:n.id});
    return `La poción no se asienta. Ves cómo ${n.name} se va, de a pedazos, detrás de los ojos. Hacés lo único que se puede hacer. Nunca vas a olvidar su cara.`;
  }
  d.progress = Math.round(discipleNeed(target) * 0.25);
  adjustRel(n, {trust:-4, loyalty:-3});
  applyEffects({sanity:-rndInt(2,6)});
  return `La poción no se asienta. ${n.name} sobrevive, a duras penas, y va a tardar en volver a intentarlo. Algo en su mirada te culpa.`;
}

/* ------------------------------ solos ------------------------------ */
function disciplesTick(){
  if(STATE.gameOver || isDivine() || STATE.time.totalMonths % 3 !== 0) return;
  const list = disciples().filter(n=>n.lifeState === 'presente');
  if(!list.length) return;
  list.forEach(n=>{
    const d = n.disciple;
    // Estudia solo, un poco (sólo si ya tomó la primera poción).
    if(discipleSeq(n) !== null) d.progress = Math.min(discipleNeed(discipleTarget(n)) - 1, d.progress + 2);
    // Un discípulo sin maestro se enfría.
    if(STATE.time.totalMonths - (d.lastTaught ?? 0) > 24 && chance(0.3)) adjustRel(n, {loyalty:-3, respect:-2});
  });
  // A veces uno te trae algo (como mucho, uno por temporada).
  const giver = list.find(n=>discipleSeq(n) !== null && n.loyalty >= 45 && chance(0.1 + (9 - discipleSeq(n))*0.02));
  if(giver) discipleGift(giver);
}
function discipleGift(n){
  const m = STATE.pathway.chosenPathway ? nextMissing() : null;
  let text;
  if(m && m.kind === 'ingredient'){
    addIngredient(m.pathway, m.seq, m.name, rndInt(60,85), `tu ${discipleWord(n)} ${n.name}`);
    text = `${n.name} aparece sin avisar con un paquete envuelto en diario: ${m.name}. "Sé que lo estabas buscando", dice, y no explica cómo lo sabe.`;
  } else {
    addClue({pathway: STATE.pathway.chosenPathway || '$random', reliability:'real', strength:[2,4], source:n.name, silent:true});
    text = `${n.name} te cuenta algo que descubrió por su cuenta. Lo sabías, pero nunca lo habías pensado así.`;
  }
  logJournal(`${n.name}`, text, {cat:'pathway', imp:1});
}

/* ------------------------------ interacciones ------------------------------ */
[
  {id:'disciple_offer', label:'Proponerle que aprenda de vos', time:1, desc:'Enseñarle tu camino. Para eso tiene que saber lo que sos.',
    avail:(n)=>canTakeDisciple(n), run:(n)=>offerDiscipleship(n)},
  {id:'teach', label:'Enseñarle', time:1, desc:'Una lección de tu vía, una vez por temporada.',
    avail:(n)=>!!n.disciple && n.lifeState === 'presente' && !taughtThisSeason(n) && STATE.pathway.chosenPathway === n.disciple.pathway && !isDivine(),
    run:(n)=>teachDisciple(n)},
  {id:'disciple_release', label:'Dejarle seguir su camino', time:0, desc:'Deja de aprender con vos. Sigue siendo alguien que te conoce.',
    avail:(n)=>!!n.disciple, run:(n)=>releaseDisciple(n)}
].forEach(it=>{ INTERACTIONS.push(it); INTERACTION_BY_ID[it.id] = it; });
