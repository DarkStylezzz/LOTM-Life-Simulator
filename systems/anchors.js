'use strict';
/* =========================================================================
   systems/anchors.js — Anclas (§22, §23).
   Las anclas existen desde el principio, pero el jugador no las ve: son
   las personas que te conocen de verdad y te quieren, más la gente que cree
   en vos. Trabajan en silencio (frenan la corrupción, sostienen la cordura
   y la humanidad, suavizan una pérdida de control) y recién a partir de la
   Sequence 5 el personaje ENTIENDE lo que eran. Perder un ancla duele el
   doble: se va una persona y se va un poco de quien sos.
   ========================================================================= */
function anchorCandidates(){
  return aliveNpcs().filter(n=>{
    if(!n.met && !isFamilyNpc(n)) return false;
    if(n.lifeState === 'desaparecido') return false;
    const b = bondScore(n);
    // Tiene que conocerte: la sospecha alta o el miedo rompen el vínculo.
    return b >= 55 && (n.suspicion||0) < 50 && (n.fear||0) < 60;
  });
}
function recomputeAnchors(){
  const a = STATE.anchors, c = STATE.character;
  const people = anchorCandidates();
  a.people = people.map(n=>n.id);
  const bonds = people.map(n=>bondScore(n) + (n.knows && n.knows.beyonder ? 8 : 0));
  const top = bonds.sort((x,y)=>y-x).slice(0,5);
  // Rendimientos decrecientes: la primera persona pesa más que la quinta.
  let strength = top.reduce((s,b,i)=>s + b * [0.45,0.3,0.2,0.12,0.08][i], 0);
  strength += (pathwayMods().anchorBonus||0);
  strength -= Math.min(25, (a.grief||0));
  a.anchorStrength = clamp(Math.round(strength), 0, 100);
  a.followers = Math.max(0, Math.round(clamp(c.reputation,0,100)/8 + (STATE.factions.tarotClub.secretRep||0)/15 + (a.followerBonus||0)*2));
  // Creencia: sólo la parte buena de la reputación, más quienes te siguen.
  a.belief = clamp(Math.round(clamp(c.reputation,0,100)*0.6 + a.followers*3), 0, 100);
  a.identityStability = clamp(Math.round(a.anchorStrength*0.4 + (100-c.corruption)*0.25 + c.sanity*0.2 + (c.humanity??100)*0.15), 0, 100);
  return a;
}
function anchorsCorruptionResist(){
  const a = STATE.anchors;
  if(!a || !STATE.pathway.chosenPathway) return 0;
  return clamp((a.anchorStrength||0) / (a.revealed ? 450 : 700), 0, 0.22);
}
function revealAnchors(){
  const a = STATE.anchors;
  if(a.revealed) return;
  recomputeAnchors();
  a.revealed = true;
  const names = a.people.map(id=>npcById(id)).filter(Boolean).map(n=>n.name);
  const text = names.length
    ? `Después del ritual, en el silencio, entendés algo que nadie te había explicado: seguís siendo vos por ${names.slice(0,3).join(', ')}${names.length>3?' y otros':''}. Cada vez que estuviste por perderte, algo tiró de vos hacia atrás. Eran ellos.`
    : 'Después del ritual, en el silencio, entendés algo que nadie te había explicado: lo que te mantiene humano son las personas que te conocen de verdad. Y buscás en tu memoria nombres, y no encontrás casi ninguno.';
  logJournal('Anclas', text, {cat:'pathway', imp:3});
  remember('anchors_revealed', 'Entendiste qué te sostiene.', {cat:'secret'});
  addMilestone('pathway', 'Entiende qué son sus anclas');
  queueSeal({kind:'anchors', names});
  STATE._importantMoment = true;
}
function onAnchorLost(npc){
  const a = STATE.anchors;
  a.lost = a.lost || [];
  a.lost.push({id:npc.id, name:npc.name, cy:calendarYear()});
  a.grief = (a.grief||0) + 12;
  applyEffects({sanity:[-6,-2], humanity:-3});
  if(a.revealed){
    logJournal('Un ancla menos', `Con ${npc.name} se va también una parte de lo que te sostenía. Lo sentís en el cuerpo, como un escalón que falta en la oscuridad.`, {cat:'pathway', imp:2});
  } else {
    addHiddenTruth(`${npc.name} era una de las razones por las que seguías siendo vos. Cuando murió, algo en tu estabilidad cedió, y no supiste por qué.`, {npc:npc.id});
  }
  recomputeAnchors();
}
// El duelo se va apagando (una vez por año, en yearlyUpkeep vía recompute).
function anchorsYearly(){
  const a = STATE.anchors;
  a.grief = Math.max(0, (a.grief||0) - 6);
  recomputeAnchors();
  // A partir de la Sequence 4 sin anclas, la humanidad cae más rápido.
  if(STATE.pathway.chosenPathway && STATE.pathway.sequence <= 4 && a.anchorStrength < 20){
    applyEffects({humanity:-2});
    if(a.revealed && chance(0.4)) logJournal('Nadie que te recuerde', 'Te das cuenta de que no hay nadie vivo que sepa quién eras antes. Es una forma de soledad que no tiene nombre.', {cat:'pathway'});
  }
}
// Compatibilidad con el sistema anterior.
function anchorsUnlocked(){ return !!STATE.anchors.revealed; }
function computeAnchors(){ const a = recomputeAnchors(); return Object.assign({anchorCount:a.people.length, humanConnections:aliveNpcs().filter(n=>n.met).length}, a); }
