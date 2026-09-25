'use strict';
/* =========================================================================
   systems/relations.js — relaciones profundas (§11).
   Siete ejes: Confianza, Afecto, Miedo, Respeto, Sospecha, Lealtad y
   Dependencia. Lo interesante es la COMBINACIÓN: confianza 90 con miedo 70
   no es "me quiere mucho". La personalidad del NPC escala cómo se mueven.
   Las interacciones no son "+5 trust": cada una puede abrir una puerta
   distinta (un secreto, un favor, un contacto, una introducción a una
   organización, una pelea, una traición) según quién es la otra persona.
   ========================================================================= */
const RELATION_DIMS = ['trust','affection','fear','respect','loyalty','suspicion','dependence'];
const RELATION_LABEL = {trust:'Confianza', affection:'Afecto', fear:'Miedo', respect:'Respeto', loyalty:'Lealtad', suspicion:'Sospecha', dependence:'Dependencia'};

function ensureRel(npc){
  if(!npc) return npc;
  if(npc.trust === undefined) npc.trust = 30;
  if(npc.suspicion === undefined) npc.suspicion = 0;
  if(npc.affection === undefined) npc.affection = clamp(Math.round(npc.trust*0.7), 0, 100);
  if(npc.respect === undefined)   npc.respect   = clamp(Math.round(npc.trust*0.5), 0, 100);
  if(npc.loyalty === undefined)   npc.loyalty   = clamp(Math.round(npc.trust*0.6), 0, 100);
  if(npc.fear === undefined)      npc.fear      = 0;
  if(npc.dependence === undefined) npc.dependence = 0;
  return npc;
}
function adjustRel(npc, deltas){
  if(!npc) return;
  ensureRel(npc);
  const gainMods = {trust:npcMod(npc,'trustGain'), affection:npcMod(npc,'affectionGain'), fear:npcMod(npc,'fearGain'),
    respect:npcMod(npc,'respectGain'), loyalty:npcMod(npc,'loyaltyGain'), suspicion:npcMod(npc,'suspicionGain')};
  for(const k in deltas){
    if(!RELATION_DIMS.includes(k)) continue;
    let d = roll(deltas[k]);
    if(!d) continue;
    if(d > 0 && gainMods[k]) d = Math.round(d * gainMods[k]);
    // Humanidad baja (Sequences altas): la gente se encariña menos y teme más.
    if(k==='affection' && d>0) d = Math.round(d * humanityFactor());
    npc[k] = clamp(npc[k] + d, 0, 100);
  }
}
// Qué tan fuerte es el vínculo (sirve para Anclas, pérdidas, cercanía).
function bondScore(n){
  ensureRel(n);
  const years = n.metMonth !== null && n.metMonth !== undefined ? (STATE.time.totalMonths - n.metMonth)/12 : 0;
  return clamp(Math.round(n.affection*0.4 + n.trust*0.3 + n.loyalty*0.2 + Math.min(10, years*0.6) - n.fear*0.1 - n.suspicion*0.1), 0, 100);
}
// Lectura cualitativa del vínculo (§40: no seis barras que nadie lee).
function relationshipLabel(npc){
  ensureRel(npc);
  const {trust, affection, fear, respect, loyalty, suspicion, dependence} = npc;
  const partes = [];
  if(fear >= 55 && trust >= 55) partes.push(ng(npc,'te respeta y te teme en partes iguales','te respeta y te teme en partes iguales'));
  else if(fear >= 55) partes.push('te tiene miedo');
  else if(affection >= 75) partes.push('te quiere de verdad');
  else if(affection >= 45) partes.push('te tiene cariño');
  else if(trust >= 60) partes.push('confía en vos');
  else if(affection <= 12 && trust <= 15 && npc.met) partes.push('no te tiene simpatía');
  else if(trust <= 15) partes.push('apenas te conoce');
  else partes.push('te trata con cordialidad');
  if(suspicion >= 50) partes.push('sospecha algo de vos');
  else if(dependence >= 60) partes.push('depende de vos más de lo que admite');
  else if(loyalty >= 70) partes.push('te sería leal si las cosas se pusieran feas');
  else if(respect >= 70) partes.push('valora mucho tu criterio');
  return partes.join(', ');
}
// Etiquetas de estado del vínculo (amistad, rivalidad, dependencia...).
function relationTags(n){
  const t = [];
  if(n.id==='conyuge') t.push('Matrimonio');
  if(n.id==='pareja') t.push('Pareja');
  if(n.flags.mentor) t.push('Mentor');
  if(n.flags.rival) t.push('Rival');
  if(n.flags.grudge && n.affection < 30) t.push('Resentimiento');
  if(n.flags.estranged || n.lifeState==='distanciado') t.push('Distanciados');
  if(n.knows && n.knows.beyonder) t.push('Sabe tu secreto');
  if(bondScore(n) >= 70 && !isFamilyNpc(n)) t.push('Amistad cercana');
  else if(bondScore(n) >= 45 && !isFamilyNpc(n) && n.relType!=='work') t.push('Amistad');
  if(n.dependence >= 60) t.push('Dependencia');
  if(STATE.anchors.revealed && STATE.anchors.people.includes(n.id)) t.push('Ancla');
  return t;
}
function humanityFactor(){ const h = STATE.character.humanity ?? 100; return h >= 70 ? 1 : clamp(0.4 + h/120, 0.4, 1); }

// Desgaste natural de los vínculos que no se cultivan (una vez por año).
function decayRelationships(){
  const lowHumanity = (STATE.character.humanity ?? 100) < 60;
  STATE.npcs.forEach(n=>{
    if(!n.alive) return;
    ensureNpc(n);
    const fam = isFamilyNpc(n);
    const lejos = n.lifeState !== 'presente';
    const unseen = STATE.time.totalMonths - (n.lastSeen || 0) > 12;
    const base = fam ? 1 : 2;
    const extra = (lejos ? 2 : 0) + (unseen && !fam ? 1 : 0) + (lowHumanity ? 2 : 0);
    adjustRel(n, {trust:-(base+extra), affection:-(base+extra)});
    if(n.suspicion > 0) n.suspicion = Math.max(0, n.suspicion - 3);
    if(n.fear > 0 && !lowHumanity) n.fear = Math.max(0, n.fear - 2);
    // Síntomas visibles (ojos que brillan, una sombra que llega tarde): los
    // cercanos lo notan.
    const cs = conditionMods().suspicion || 0;
    if(cs && n.met && n.lifeState==='presente' && bondScore(n)>=35) adjustRel(n, {suspicion:Math.round(cs*6)});
    updateNpcTier(n);
  });
}

/* ------------------------------ interacciones ------------------------------ */
// time: tiempo libre que cuesta. avail(n): si se ofrece. run(n): resultado.
const INTERACTIONS = [
  {id:'time', label:'Pasar tiempo juntos', time:1, desc:'Compartir una tarde. Así se construyen los vínculos.',
    avail:(n)=>n.lifeState==='presente',
    run:(n)=>{
      adjustRel(n, {trust:[2,6], affection:[3,7], respect:[0,2]});
      n.lastSeen = STATE.time.totalMonths;
      // A veces, pasar tiempo con alguien abre algo.
      if(n.trust >= 50 && n.secrets.some(s=>!s.known) && chance(0.15 + n.trust/400)){
        const s = n.secrets.find(x=>!x.known); s.known = true;
        remember('npc_secret_'+s.id, `${n.name}: ${s.text}`, {cat:'secret', npc:n.id});
        return `Entre charla y charla, ${n.name} te cuenta algo que no le contó a nadie: ${s.text.charAt(0).toLowerCase()+s.text.slice(1)}`;
      }
      if(n.hidden.pathway && n.trust >= 45 && chance(0.12)){ adjustRel(n, {suspicion:0}); n.tier = n.tier==='comun' ? 'misterioso' : n.tier; return `Pasan una buena tarde. En un momento, ${n.name} hace algo con las manos que no terminás de ver bien. Cuando la mirás, ya no está haciendo nada.`; }
      if(isFamilyNpc(n) && chance(0.3)) applyEffects({sanity:[1,3]});
      return pick([`Pasan la tarde con ${n.name}. Nada especial. Justamente por eso.`, `Salen a caminar con ${n.name} y terminan hablando de cosas que no esperaban.`, `Comen algo con ${n.name}. Se ríen de algo tonto. Hace bien.`]);
    }},
  {id:'deep', label:'Conversación profunda', time:1, desc:'Hablar de lo que importa. Podés conocer sus objetivos, sus miedos... o incomodarle.',
    avail:(n)=>n.lifeState==='presente' && n.affection >= 35,
    run:(n)=>{
      adjustRel(n, {trust:[3,8], affection:[1,4], dependence:[0,3]});
      const found = [];
      if(!n.known.goals){ n.known.goals = true; found.push(`quiere ${listEs(n.goals.map(g=>NPC_GOALS[g.id||g] ? NPC_GOALS[g.id||g].label : g))}`); }
      else if(!n.known.fears){ n.known.fears = true; found.push(`le tiene miedo a ${n.fears.join(' y ')}`); }
      if(n.mystic >= 30 && chance(0.35)){ applyEffects({clue:{pathway: n.hidden.pathway || '$random', reliability: n.hidden.pathway ? 'real' : 'mixed', strength:[2,5], source:n.name}}); found.push('una vez vio algo que no se explica'); }
      if(!found.length) return `Hablan hasta tarde. ${n.name} se abre más de lo habitual.`;
      return `Hablan hasta tarde. Te enterás de que ${listEs(found)}.`;
    }},
  {id:'help', label:'Ofrecer ayuda', time:1, desc:'Ayudar con lo que esté necesitando. Genera lealtad... y a veces dependencia.',
    avail:(n)=>n.lifeState==='presente' && n.met,
    run:(n)=>{
      adjustRel(n, {loyalty:[4,9], respect:[2,5], dependence:[1,4]});
      remember('helped', `Ayudaste a ${n.name}.`, {cat:'favor_given', npc:n.id});
      if(n.flags.debt && STATE.character.cash >= 80){ applyEffects({cash:-rndInt(40,80)}); n.flags.debt = false; adjustRel(n, {loyalty:6}); return `Ayudás a ${n.name} a salir de una deuda que lo ahogaba. No lo va a olvidar.`; }
      if(chance(0.25)) scheduleConsequence({inMonths:[10,40], title:`${n.name} no se olvidó`, text:`${n.name} te devuelve, a su manera, aquella ayuda.`, effect:{cash:[20,120], sanity:[1,4]}, cond:{npcAlive:n.id}});
      return `Le das una mano a ${n.name} con algo que venía arrastrando. Se nota el alivio.`;
    }},
  {id:'favor', label:'Pedir un favor', time:0, desc:'Usar el vínculo. Según quién sea, puede darte plata, un contacto, información o una puerta.',
    avail:(n)=>n.lifeState==='presente' && n.met && (n.trust >= 40 || n.loyalty >= 40) && (!n.flags.favorCooldown || STATE.time.totalMonths - n.flags.favorCooldown > 12),
    run:(n)=>{
      n.flags.favorCooldown = STATE.time.totalMonths;
      const willing = (n.loyalty + n.trust)/200 + (npcHasTrait(n,'generoso')?0.15:0) - (npcHasTrait(n,'calculador')?0.1:0);
      if(!chance(clamp(willing, 0.15, 0.95))){ adjustRel(n, {trust:-4}); return `${n.name} pone excusas. No es un no. Tampoco es un sí.`; }
      adjustRel(n, {dependence:-2, loyalty:-2});
      remember('asked_favor', `Le pediste un favor a ${n.name}.`, {cat:'favor_received', npc:n.id});
      // Qué puede dar depende de quién es.
      if(n.hidden.faction && n.known.faction && factionAccess(n.hidden.faction) < 2 && !factionHostile(n.hidden.faction)){
        factionAdjust(n.hidden.faction, {access:2, trust:8}); return `${n.name} habla con la gente de ${factionName(n.hidden.faction)}. Te consiguió una puerta: ahora podés colaborar con ellos.`;
      }
      if(n.hidden.pathway && n.known.pathway && n.trust >= 60){
        const got = mentorGift(n); if(got) return got;
      }
      if(n.tierJob && jobEligible(n.tierJob) && JOBS[n.tierJob].salary > (JOBS[STATE.character.profesion]||{salary:0}).salary){
        triggerEventById('life_job_offer_npc', {npc:n, job:n.tierJob}); return `${n.name} va a hablar con su jefe por vos.`;
      }
      if(n.mystic >= 35){ applyEffects({clue:{pathway:n.hidden.pathway||'$random', reliability:'mixed', strength:[3,6], source:n.name}}); if(chance(0.4)) addRumor(); return `${n.name} te cuenta todo lo que sabe de ciertos temas. No es mucho, pero es algo.`; }
      const v = Math.round(rndInt(40,140)*priceIndex()); applyEffects({cash:v}); return `${n.name} te presta ${fmtMoney(v)} sin hacer preguntas.`;
    }},
  {id:'investigate', label:'Investigar', time:1, cost:30, desc:'Averiguar quién es realmente. Si se entera, no le va a gustar.',
    avail:(n)=>n.met && STATE.character.edad >= 13 && (n.hidden.pathway && !n.known.pathway || n.hidden.faction && !n.known.faction || n.secrets.some(s=>!s.known) || n.hidden.sequence!==null && n.known.pathway && !n.known.sequence),
    run:(n)=>investigateNpcRun(n)},
  {id:'insight', label:'Leer a esta persona', time:0, desc:'Tu poder te deja ver lo que siente de verdad.',
    avail:(n)=>n.lifeState==='presente' && !!pathwayMods().insight && (n.flags.insightMonth===undefined || STATE.time.totalMonths - n.flags.insightMonth >= 3),
    run:(n)=>{ n.flags.insightMonth = STATE.time.totalMonths; n.flags.insight = true; raiseAttention(0);
      if(n.hidden.pathway && chance(0.4)) { n.known.pathway = true; updateNpcTier(n); return `Mirás a ${n.name} con atención de Espectador. Además de lo que siente, notás algo más: no es del todo humano. ${PATHWAYS[n.hidden.pathway].name}.`; }
      return `Mirás a ${n.name} con atención de Espectador. Ahora sabés exactamente qué siente por vos.`; }},
  {id:'confide', label:'Contarle tu secreto', time:1, desc:'Decirle lo que sos. Puede sostenerte... o hundirte.',
    avail:(n)=>!!STATE.pathway.chosenPathway && !n.knows.beyonder && n.lifeState==='presente' && n.trust >= 45,
    run:(n)=>confideBeyonderSecret(n)},
  {id:'confront', label:'Enfrentar', time:1, desc:'Poner sobre la mesa lo que está mal entre ustedes.',
    avail:(n)=>n.lifeState==='presente' && (n.suspicion >= 30 || n.flags.grudge || (n.flags.reportedPlayer && n.flags.betrayalKnown)),
    run:(n)=>{
      if(chance(0.45 + n.respect/300)){ adjustRel(n, {suspicion:-15, respect:6, trust:4}); n.flags.grudge = false; return `Hablan claro. Duele, pero algo se acomoda con ${n.name}.`; }
      adjustRel(n, {affection:-10, trust:-8, fear:4}); n.flags.grudge = true; return `La conversación termina peor de lo que empezó. ${n.name} se va sin saludar.`;
    }},
  {id:'reconcile', label:'Intentar reconciliarse', time:1, desc:'Volver a acercarse después de un distanciamiento.',
    avail:(n)=>n.lifeState==='distanciado' || (n.flags.estranged && n.lifeState==='presente'),
    run:(n)=>{
      if(chance(0.4 + n.loyalty/250 + (isFamilyNpc(n)?0.2:0))){ n.lifeState = 'presente'; n.flags.estranged = false; adjustRel(n, {affection:[6,12], trust:[4,8]});
        remember('reconciled', `Te reconciliaste con ${n.name}.`, {cat:'person', npc:n.id}); return `Tardan en mirarse a los ojos, pero lo logran. ${n.name} vuelve a tu vida.`; }
      adjustRel(n, {affection:-2}); return `${n.name} no quiere saber nada. Todavía no, al menos.`;
    }},
  {id:'court', label:'Cortejar', time:1, desc:'Hay algo más que amistad. Podés intentarlo.',
    avail:(n)=>n.lifeState==='presente' && !spouseNpc() && !partnerNpc() && romanceCompatible(n) && n.affection >= 30 && STATE.character.edad >= 18,
    run:(n)=>{
      if(chance(0.25 + n.affection/150 + STATE.character.reputation/400)){ startDating(n); return `${n.name} dice que sí. Los dos se ríen de lo nerviosos que estaban.`; }
      adjustRel(n, {affection:-3, respect:2}); return `${n.name} te frena con cariño. "No es por vos." Siempre es un poco por vos.`;
    }},
  {id:'breakup', label:'Terminar la relación', time:0, desc:'Cortar con tu pareja.',
    avail:(n)=>n.id==='pareja',
    run:(n)=>{ n.id = 'ex_' + uid('x'); n.role = ng(n,'Ex pareja','Ex pareja'); n.relType='acquaintance'; adjustRel(n, {affection:-25, trust:-15}); n.lifeState = chance(0.5)?'distanciado':'presente';
      remember('breakup', `Terminaste tu relación con ${n.name}.`, {cat:'loss', npc:n.id}); applyEffects({sanity:[-6,-2]}); return 'Lo decís. No hay una forma buena de decirlo.'; }},
  {id:'blackmail', label:'Presionar con lo que sabés', time:0, desc:'Usar un secreto suyo. Funciona. Se paga.',
    avail:(n)=>n.lifeState==='presente' && n.secrets.some(s=>s.known && s.leverage>=2),
    run:(n)=>{
      const s = n.secrets.find(x=>x.known && x.leverage>=2);
      adjustRel(n, {fear:[15,25], affection:-20, trust:-25, loyalty:-20, dependence:5}); n.flags.grudge = true;
      applyEffects({cash:Math.round(rndInt(60,200)*priceIndex()), corruption:[0,1]});
      remember('blackmailed', `Presionaste a ${n.name} con su secreto.`, {cat:'betrayal', npc:n.id});
      if(npcHasTrait(n,'rencoroso') || chance(0.3)) scheduleConsequence({inMonths:[6,30], title:'La deuda que no se paga', text:`${n.name} encontró la forma de devolvértela.`, effect:{reputation:[-10,-4], attention:4}, cond:{npcAlive:n.id}});
      return `No hace falta levantar la voz. ${n.name} entiende enseguida. Paga. Te mira como nunca te había mirado.`;
    }}
];
const INTERACTION_BY_ID = {}; INTERACTIONS.forEach(i=>{ INTERACTION_BY_ID[i.id] = i; });
function availableInteractions(n){ return INTERACTIONS.filter(i=>{ try{ return i.avail(n); }catch(e){ return false; } }); }

function doInteraction(npcId, interId){
  if(timeBlocked()) return;
  const n = npcById(npcId); const it = INTERACTION_BY_ID[interId];
  if(!n || !it || !n.alive) return;
  if(!it.avail(n)){ toast('Eso ya no es posible.', 'neg'); return; }
  if(STATE.character.edad < 13 && !isFamilyNpc(n) && it.id !== 'time'){ toast('Todavía sos muy chico para eso.', 'neg'); return; }
  if(it.time && !canSpendFreeTime(it.time)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  if(it.cost && STATE.character.cash < it.cost){ toast('No tenés suficiente dinero.', 'neg'); return; }
  if(it.time) spendFreeTime(it.time);
  if(it.cost) applyEffects({cash:-it.cost});
  meetNpc(n); n.interactions = (n.interactions||0) + 1;
  const before = snapshotForChanges();
  const text = it.run(n) || '';
  updateNpcTier(n);
  if(!STATE.pendingEvent && !STATE.combat){
    setResolution(`${it.label}: ${n.name}`, text, diffForDisplay(before));
    logJournal(`${n.name}`, text, {cat:'relation', imp:0});
  }
  checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

// Investigar a una persona (heredado de la versión anterior, ahora con
// sospecha real si te descubren y con más cosas para descubrir).
function investigateNpcRun(n){
  const skill = researchSkill('social') + (pathwayMods().revealNpc||0);
  const roll1 = Math.random();
  const caught = chance(clamp(0.15 + (n.hidden.pathway?0.15:0) + (n.hidden.faction?0.1:0) - pathwayMods().stealth, 0.03, 0.5));
  if(caught){ adjustRel(n, {suspicion:[8,16], trust:-5}); if(n.hidden.faction) factionAdjust(n.hidden.faction, {suspicion:4}, true); }
  let revealed = null;
  if(n.hidden.pathway && !n.known.pathway && roll1 < 0.3 + n.trust/300 + skill){ n.known.pathway = true; revealed = `No es del todo humano: ${PATHWAYS[n.hidden.pathway].name}.`; applyEffects({clue:{pathway:n.hidden.pathway, reliability:'real', strength:[5,9], source:n.name, confirm:true}}); }
  else if(n.hidden.faction && !n.known.faction && roll1 < 0.32 + n.trust/300 + skill){ revealNpcFaction(n); revealed = `Trabaja para ${factionName(n.hidden.faction)}.`; }
  else if(n.hidden.sequence!==null && n.known.pathway && !n.known.sequence && roll1 < 0.25 + skill){ n.known.sequence = true; revealed = `Su Sequence es ${n.hidden.sequence}.`; }
  else if(n.secrets.some(s=>!s.known) && roll1 < 0.45 + skill){ const s = n.secrets.find(x=>!x.known); s.known = true; revealed = s.text; remember('npc_secret_'+s.id, `${n.name}: ${s.text}`, {cat:'secret', npc:n.id}); }
  if(revealed){
    const ht = STATE.hiddenTruths.find(h=>!h.revealed && h.npc===n.id && n.known.pathway && n.known.faction);
    if(ht) revealHiddenTruth(ht.id, 'investigando');
    logJournal('Investigación', `Descubrís algo sobre ${n.name}: ${revealed}`, {cat:'mystery', imp:1});
    return `Descubrís algo sobre ${n.name}: ${revealed}${caught ? ' Pero se dio cuenta de que preguntabas.' : ''}`;
  }
  return caught ? `No descubrís nada concluyente sobre ${n.name}. Y encima se dio cuenta de que preguntabas.` : `Pasás tiempo averiguando sobre ${n.name}, sin nada concluyente todavía.`;
}
// Lo que un mentor Beyonder puede darte cuando se lo pedís.
function mentorGift(n){
  const p = n.hidden.pathway;
  if(!STATE.pathway.chosenPathway && !hasFormula(p, 9) && n.trust >= 65){
    addFormula(p, 9, 'true', `${n.name}, de su puño y letra`); adjustRel(n, {dependence:3});
    remember('mentor_formula', `${n.name} te dio la fórmula de ${formulaName(p,9)}.`, {cat:'favor_received', npc:n.id});
    return `${n.name} duda mucho. Después escribe algo en un papel, lo dobla dos veces y te lo da sin mirarte: una fórmula. "No me hagas arrepentirme."`;
  }
  if(STATE.pathway.chosenPathway && STATE.pathway.actingMethod < 2 && chance(0.5)){ nudgeActingMethod(0.7, n.name); return `${n.name} te dice algo que no entendés del todo: "Una poción no se toma: se actúa." Se queda pensando en eso con vos.`; }
  if(STATE.pathway.chosenPathway === p && STATE.pathway.sequence > 1 && !hasFormula(p, STATE.pathway.sequence-1) && n.hidden.sequence < STATE.pathway.sequence && n.trust >= 70){
    addFormula(p, STATE.pathway.sequence-1, 'true', n.name); return `${n.name} te pasa la fórmula de tu próxima Sequence. "Cuando estés listo. No antes."`;
  }
  return null;
}
function learnNpcSecret(n){
  const s = (n.secrets||[]).find(x=>!x.known);
  if(!s) return false;
  s.known = true;
  remember('npc_secret_'+s.id, `${n.name}: ${s.text}`, {cat:'secret', npc:n.id});
  logJournal('Un secreto ajeno', `Ahora sabés algo de ${n.name}: ${s.text}`, {cat:'mystery', imp:1});
  return true;
}

// Confesar lo que sos: la decisión más humana (y peligrosa) de un Beyonder.
function confideBeyonderSecret(n){
  const accept = (n.trust*0.5 + n.affection*0.4 + n.loyalty*0.3)/100 + (npcHasTrait(n,'leal')?0.15:0) + (npcHasTrait(n,'devoto')?-0.2:0) + (npcHasTrait(n,'temeroso')?-0.1:0);
  n.knows.beyonder = true;
  n.mystic = Math.min(100, (n.mystic||0) + 30);
  if(chance(clamp(accept, 0.1, 0.92))){
    adjustRel(n, {trust:[8,14], dependence:[3,8], suspicion:-30, loyalty:[5,10]});
    remember('confided', `Le contaste a ${n.name} lo que sos, y lo aceptó.`, {cat:'person', npc:n.id});
    applyEffects({sanity:[4,9]});
    recomputeAnchors();
    if(npcHasTrait(n,'chismoso')) addHiddenTruth(`${n.name} guardó tu secreto... a su manera: se lo contó "sólo" a dos personas de confianza.`, {npc:n.id});
    return `${n.name} escucha todo en silencio. Al final te toma la mano. "Sos vos igual. ¿No?" Por primera vez en mucho tiempo, no estás solo con esto.`;
  }
  adjustRel(n, {fear:[15,25], affection:-15, trust:-10, suspicion:20});
  remember('confided_badly', `Le contaste a ${n.name} lo que sos, y no lo soportó.`, {cat:'loss', npc:n.id});
  applyEffects({sanity:[-8,-3]});
  if(chance(0.35 + (npcHasTrait(n,'devoto')?0.25:0))) scheduleConsequence({inMonths:[1,8], title:'Alguien habló', text:`${n.name} no pudo cargar con lo que le contaste. Se lo contó a quien no debía.`,
    effect:{attention:[6,12], faction:{church:{suspicion:12}}}, cond:{npcAlive:n.id}, memory:{tag:'secret_leaked', text:`${n.name} contó tu secreto.`, cat:'betrayal', npc:n.id}});
  return `${n.name} retrocede un paso. Después otro. "No quiero saber nada de esto." Esa noche no duerme en tu casa.`;
}

/* ------------------------------ pareja ------------------------------ */
function romanceCompatible(n){
  if(!n || !n.alive || isFamilyNpc(n) || n.flags.married) return false;
  const age = npcAge(n), mine = STATE.character.edad;
  if(age < 18 || Math.abs(age - mine) > 14) return false;
  const g = STATE.character.genero;
  // Sin género declarado, cualquier combinación es posible; si no, se sigue
  // la costumbre de la época salvo con una chance baja (vidas distintas).
  if(!g) return true;
  const opposite = (g==='Hombre' && n.gender==='f') || (g==='Mujer' && n.gender==='m');
  return opposite || n.flags.romanceOpen === true;
}
function startDating(n){
  const prev = partnerNpc(); if(prev && prev !== n) return;
  n.id = 'pareja'; n.role = 'Pareja'; n.relType = 'family'; n.tier = 'importante';
  meetNpc(n); adjustRel(n, {affection:10, trust:6});
  applyEffects({sanity:[2,5]});
  logJournal('Algo empieza', `Empezás una relación con ${n.name}.`, {cat:'relation', imp:2});
  remember('dating', `Empezaste una relación con ${n.name}.`, {cat:'person', npc:n.id});
}
function divorce(n){
  const c = STATE.character;
  n.id = 'ex_' + uid('x'); n.role = ng(n,'Ex marido','Ex esposa'); n.relType = 'acquaintance'; n.lifeState = 'distanciado';
  c.estadoCivil = 'Divorciado/a';
  const half = Math.round(c.cash/2); applyEffects({cash:-half, sanity:[-10,-4]});
  remember('divorce', `Te separaste de ${n.name}.`, {cat:'loss', npc:n.id});
  addMilestone('family', `Se separa de ${n.name}`);
}
