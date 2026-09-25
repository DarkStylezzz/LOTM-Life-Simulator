'use strict';
/* =========================================================================
   systems/npc.js — personas con vida propia (§9, §10).
   Cada NPC tiene edad, profesión, personalidad, objetivos, miedos,
   secretos, vínculos con otros NPCs, siete ejes de relación con vos,
   reputación, facción/vía/Sequence ocultas, lo que sabe de vos, lugar y
   estado de vida. Por su cuenta consiguen trabajo, se mudan, se casan,
   tienen hijos, se meten en organizaciones, se vuelven Beyonders, pierden
   el control, te investigan, te denuncian, te ayudan, desaparecen, mueren.
   Categorías (§10): común → recurrente → importante (según lo que vivieron
   con vos), misterioso (esconde algo que intuís) y sobrenatural (su poder
   ya es un hecho). Cualquiera puede subir de categoría por la historia.
   ========================================================================= */

/* ------------------------------ consultas ------------------------------ */
function npcById(id){ return STATE.npcs.find(n=>n.id===id) || null; }
function aliveNpcs(){ return STATE.npcs.filter(n=>n.alive); }
function npcAge(n){ return n.ageOffset === undefined ? 30 : STATE.character.edad + n.ageOffset; }
function isFamilyNpc(n){ return ['padre','madre','conyuge','pareja'].includes(n.id) || n.id.startsWith('hijo') || n.id.startsWith('hermano'); }
function childrenNpcs(){ return STATE.npcs.filter(n=>n.id.startsWith('hijo')); }
function spouseNpc(){ return STATE.npcs.find(n=>n.id==='conyuge' && n.alive) || null; }
function partnerNpc(){ return STATE.npcs.find(n=>n.id==='pareja' && n.alive) || null; }
function currentPartnerNpc(){ return spouseNpc() || partnerNpc(); }
function closeNpcs(){ return aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && bondScore(n) >= 45); }
function knownMysticNpcs(){ return aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && (n.known.pathway && n.hidden.pathway || n.flags.mysticContact)); }
function npcHasGoal(n, g){ return (n.goals||[]).some(x=>(x.id||x)===g); }
function npcHasTrait(n, t){ return (n.personality||[]).includes(t); }
function npcMod(n, key){
  let m = 1;
  (n.personality||[]).forEach(p=>{ const d = NPC_PERSONALITIES[p]; if(d && d.mods && typeof d.mods[key]==='number') m *= d.mods[key]; });
  return m;
}
function meetNpc(n){
  if(!n) return;
  if(!n.met){ n.met = true; n.metMonth = STATE.time.totalMonths; }
  n.lastSeen = STATE.time.totalMonths;
}
function npcHistory(n, text){
  n.history = n.history || [];
  n.history.unshift({cy:calendarYear(), text});
  if(n.history.length > 12) n.history.pop();
}
// Profesión de un NPC → trabajo equivalente del jugador (para ofertas laborales).
const NPC_JOB_EQUIV = {
  'Obrero':'Obrero','Estibador':'Estibador','Vendedor ambulante':'Vendedor ambulante','Oficinista':'Oficinista','Maestro':'Maestro/a',
  'Enfermero':'Enfermero/a','Boticario':'Boticario/a','Policía':'Policía','Periodista':'Periodista','Comerciante':'Comerciante',
  'Médico':'Médico/a','Abogado':'Abogado/a','Profesor universitario':'Profesor/a universitario/a','Librero':'Bibliotecario/a','Relojero':'Aprendiz de relojero'
};

/* ----------------------------- generación ----------------------------- */
function rollPersonality(){
  const a = pick(NPC_PERSONALITY_KEYS);
  const clash = NPC_PERSONALITIES[a].clash || [];
  const pool = NPC_PERSONALITY_KEYS.filter(k=>k!==a && !clash.includes(k) && !(NPC_PERSONALITIES[k].clash||[]).includes(a));
  return [a, pick(pool)];
}
function rollGoals(personality){
  const weights = {};
  NPC_GOAL_KEYS.forEach(g=>{ weights[g] = ['identidad','venganza','poder'].includes(g) ? 0.3 : 1; });
  (personality||[]).forEach(p=>{ const gm = (NPC_PERSONALITIES[p].mods||{}).goals || {}; for(const g in gm) weights[g] *= gm[g]; });
  const g1 = wpick(NPC_GOAL_KEYS, g=>weights[g]);
  const g2 = chance(0.5) ? wpick(NPC_GOAL_KEYS.filter(g=>g!==g1), g=>weights[g]) : null;
  return [g1, g2].filter(Boolean).map(id=>({id, progress:0}));
}
function rollSecrets(age){
  if(!chance(0.45)) return [];
  const pool = NPC_SECRET_POOL.filter(s=>!s.adult || age >= 20);
  const s = wpick(pool, x=>x.w);
  return s ? [{id:s.id, text:s.text, kind:s.kind, leverage:s.leverage, mystic:!!s.mystic, known:false}] : [];
}
function weightedClass(){ const c = STATE.character.clase; return wpick(CLASSES, k=> k===c ? 3 : 1); }

function createNpc(o){
  o = o || {};
  const gender = o.gender || (chance(0.5) ? 'm' : 'f');
  const surname = o.surname || randomSurname();
  const age = o.age !== undefined ? o.age : rndInt(o.ageMin ?? 18, o.ageMax ?? 60);
  const cls = o.clase || weightedClass();
  const personality = o.personality || rollPersonality();
  const npc = {
    id: o.id || uid('npc'),
    name: o.name || (randomFirstName(gender) + ' ' + surname),
    gender, role: o.role || (gender==='f' ? 'Conocida' : 'Conocido'), relType: o.relType || 'acquaintance',
    tier: o.tier || 'comun', importance: 0,
    ageOffset: age - STATE.character.edad,
    profession: o.profession !== undefined ? o.profession : (age >= 16 ? pick(NPC_PROFESSIONS[cls]) : (age >= 6 ? 'Estudiante' : '—')),
    clase: cls, personality, goals: o.goals || rollGoals(personality), fears: o.fears || [pick(NPC_FEARS)],
    secrets: o.secrets || rollSecrets(age), links: [],
    trust: o.trust ?? rndInt(8,25), affection: o.affection ?? rndInt(5,20), fear:0, respect: o.respect ?? rndInt(10,30),
    loyalty: o.loyalty ?? rndInt(5,20), suspicion:0, dependence:0,
    reputation: rndInt(25,60),
    hidden:{pathway:null, sequence:null, faction:null}, known:{pathway:false, sequence:false, faction:false, goals:false, fears:false},
    knows:{beyonder:false, partial:false}, mystic: o.mystic ?? rndInt(0,12),
    alive:true, cause:null, location: o.location || currentCityKey(), lifeState:'presente',
    met: !!o.met, metMonth: o.met ? STATE.time.totalMonths : null, lastSeen: STATE.time.totalMonths, interactions:0,
    history:[], flags:{}
  };
  if(o.hidden) Object.assign(npc.hidden, o.hidden);
  npc.tierJob = NPC_JOB_EQUIV[npc.profession] || (JOBS[npc.profession] ? npc.profession : null);
  if(!o.hidden && o.allowHidden !== false && age >= 18 && chance(0.05 * (currentCity().occult||0.5))) makeHiddenBeyonder(npc);
  if(!o.noPush) STATE.npcs.push(npc);
  return npc;
}
// Un NPC que en secreto es Beyonder: su vía sale de las facciones fuertes
// de la ciudad (§44: cada vida y cada ciudad tienen vías "cercanas" distintas).
function makeHiddenBeyonder(npc, opts){
  opts = opts || {};
  const city = currentCity();
  let faction = opts.faction !== undefined ? opts.faction : (chance(0.6) ? wpick(FACTION_KEYS.filter(k=>k!=='tarotClub'), k=>(city.factions[k]||0.2)) : null);
  let pathway = opts.pathway;
  if(!pathway){
    const fp = faction ? FACTIONS_DATA[faction].pathways : null;
    pathway = fp && chance(0.8) ? wpick(Object.keys(fp), k=>fp[k]) : pick(Object.keys(PATHWAYS));
  }
  npc.hidden.pathway = pathway;
  npc.hidden.sequence = opts.sequence || wpick([9,8,7,6,5], s=>({9:5,8:4,7:3,6:1,5:0.3})[s]);
  npc.hidden.faction = faction;
  npc.mystic = Math.max(npc.mystic, rndInt(60,90));
  if(!npcHasGoal(npc,'identidad')) npc.goals.push({id:'identidad', progress:0});
  npc.tier = npc.tier === 'comun' ? 'comun' : npc.tier; // no se delata: sigue pareciendo común
  addHiddenTruth(`${npc.name} era Beyonder de la vía ${PATHWAYS[pathway].name}, Sequence ${npc.hidden.sequence}${faction ? ', y trabajaba para '+factionName(faction) : ''}.`, {key:'npc_bey_'+npc.id, npc:npc.id});
  return npc;
}

/* ------------------------------ el reparto inicial ------------------------------ */
function siblingAgeOffset(role){
  if(/gemel/i.test(role)) return 0;
  if(/mayor/i.test(role)) return rndInt(1,8);
  return -rndInt(1,8);
}
function generateSiblings(apellido){
  const roll1 = Math.random();
  const count = roll1 < 0.30 ? 0 : roll1 < 0.65 ? 1 : roll1 < 0.88 ? 2 : 3;
  const out = [];
  for(let i=0;i<count;i++){
    const isMale = chance(0.5);
    const ageRoll = Math.random();
    let role;
    if(ageRoll < 0.15) role = isMale ? 'Hermano gemelo' : 'Hermana gemela';
    else if(ageRoll < 0.575) role = isMale ? 'Hermano mayor' : 'Hermana mayor';
    else role = isMale ? 'Hermano menor' : 'Hermana menor';
    const off = siblingAgeOffset(role);
    const n = createNpc({id:'hermano'+(i+1), name: randomFirstName(isMale?'m':'f')+' '+apellido, gender:isMale?'m':'f', role, relType:'family',
      tier:'recurrente', age: Math.max(0, off), met:true, allowHidden:false, clase:STATE.character.clase,
      trust:rndInt(25,70), affection:rndInt(35,75), loyalty:rndInt(30,65), respect:rndInt(20,50)});
    n.ageOffset = off;
    out.push(n);
  }
  return out;
}
function buildInitialCast(){
  const c = STATE.character;
  const padre = createNpc({id:'padre', name: randomFirstName('m')+' '+c.apellido, gender:'m', role:'Padre', relType:'family', tier:'importante',
    age: rndInt(22,38), met:true, allowHidden:false, clase:c.clase, trust:rndInt(40,80), affection:rndInt(55,85), loyalty:rndInt(55,85), respect:rndInt(30,60)});
  const madre = createNpc({id:'madre', name: randomFirstName('f')+' '+c.apellido, gender:'f', role:'Madre', relType:'family', tier:'importante',
    age: rndInt(20,36), met:true, allowHidden:false, clase:c.clase, trust:rndInt(45,85), affection:rndInt(60,90), loyalty:rndInt(60,90), respect:rndInt(30,60)});
  padre.ageOffset = npcAge(padre); madre.ageOffset = npcAge(madre); // al nacer, la edad del padre ES el offset
  padre.dependence = madre.dependence = 0;
  generateSiblings(c.apellido);
  const friendGender = chance(0.5)?'m':'f';
  createNpc({id:'amigo', gender:friendGender, role: friendGender==='f' ? 'Amiga de la infancia' : 'Amigo de la infancia', relType:'friend', tier:'recurrente',
    age: 0, allowHidden:false, trust:10, affection:10, loyalty:10}).ageOffset = rndInt(-1,1);
  const vecina = createNpc({id:'vecina', name: randomFirstName('f')+' '+pick(NEIGHBOR_SURNAMES), gender:'f', role:'Vecina', relType:'neighbor', tier:'comun',
    age: rndInt(24,45), allowHidden:false, trust:15, affection:10});
  const cain = createNpc({id:'extraño', name:'Sr. Cain', gender:'m', role:'Cliente extraño', relType:'contact', tier:'misterioso',
    age: rndInt(35,55), profession:'Anticuario', allowHidden:false, trust:5, affection:0});
  const yulen = createNpc({id:'sacerdote', name:'Padre Yulen', gender:'m', role:'Sacerdote local', relType:'contact', tier:'recurrente',
    age: rndInt(40,65), profession:'Sacerdote', allowHidden:false, trust:15, affection:8, hidden:{faction:'church'}});
  seedHiddenWorld(vecina, cain, yulen);
}
// La parte del mundo que cada vida esconde distinto (§44): quién es quién en
// realidad en tu barrio. El jugador no ve nada de esto hasta descubrirlo.
function seedHiddenWorld(vecina, cain, yulen){
  const city = currentCity();
  // El Sr. Cain: su afiliación real cambia de vida en vida.
  const cf = wpick(['tarotClub','aurora','mi9','nighthawks'], k=>({tarotClub:4, aurora:2.5, mi9:2, nighthawks:1.5})[k]);
  const cpath = {tarotClub:'fool', aurora:'hangedMan', mi9:pick(['redPriest','error']), nighthawks:'darkness'}[cf];
  cain.hidden = {pathway:cpath, sequence: cf==='tarotClub' ? 6 : rndInt(6,8), faction:cf};
  cain.mystic = 95; cain.goals = [{id:'identidad', progress:0}, {id: cf==='aurora' ? 'poder' : 'organizacion', progress:0}];
  addHiddenTruth(`El Sr. Cain era ${PATHWAYS[cpath].name}, Sequence ${cain.hidden.sequence}, y trabajaba para ${factionName(cf)}.`, {key:'cain', npc:'extraño'});
  // La vecina: a veces es mucho más que una vecina.
  if(chance(0.22 * (city.factions.nighthawks||0.5) + 0.05)){
    makeHiddenBeyonder(vecina, {faction:'nighthawks', pathway:'darkness', sequence:pick([9,8,8,7])});
    vecina.tier = 'comun';
  }
  // El sacerdote: su fe puede ser algo más concreto.
  if(chance(0.3)){
    yulen.hidden.pathway = pick(['darkness','death']); yulen.hidden.sequence = pick([9,8,7]); yulen.mystic = 80;
    addHiddenTruth(`El Padre Yulen era Beyonder (${PATHWAYS[yulen.hidden.pathway].name}, Sequence ${yulen.hidden.sequence}) y rezaba sabiendo exactamente a quién le rezaba.`, {key:'yulen', npc:'sacerdote'});
  }
  // Un secreto de familia: el abuelo que tocó el mundo oculto.
  if(chance(0.15)){
    STATE.flags.familySecret = {pathway: pick(Object.keys(PATHWAYS)), item: chance(0.5) ? 'formula' : 'book'};
    addHiddenTruth(`Tu abuelo había sido Beyonder de la vía ${PATHWAYS[STATE.flags.familySecret.pathway].name}. Nadie en tu familia se animó a contártelo.`, {key:'grandfather'});
  }
}

/* ------------------------------ categorías ------------------------------ */
function updateNpcTier(n){
  if(isFamilyNpc(n)){ if(n.tier === 'comun') n.tier = 'importante'; }
  const mems = memoriesWithNpc(n.id).length;
  n.importance = (n.interactions||0)*3 + mems*6 + (isFamilyNpc(n)?40:0) + (n.flags.mentor?30:0) + Math.round(bondScore(n)/5);
  if(n.known.pathway && n.hidden.pathway && n.hidden.sequence !== null && n.hidden.sequence <= 7){ n.tier = 'sobrenatural'; return; }
  if(n.tier === 'misterioso' && !(n.known.faction && n.known.pathway)) return;
  if(n.importance >= 50) n.tier = 'importante';
  else if(n.importance >= 20 && n.tier === 'comun') n.tier = 'recurrente';
}

/* ------------------------------ la vida de los NPCs ------------------------------ */
// Cada acción: w(n) = peso según objetivos/personalidad/contexto; run(n)
// devuelve {text, vis} — vis: 'journal' (te enterás), 'history' (queda en
// lo que sabés de esa persona) o 'hidden' (no te enterás... todavía).
const NPC_ACTIONS = [
  {id:'better_job', w:(n)=> n.lifeState==='presente' && npcAge(n)>=18 && npcAge(n)<60 ? 3*(npcHasGoal(n,'dinero')?2:1)*(npcHasGoal(n,'reconocimiento')?1.5:1) : 0,
    run:(n)=>{ const up = n.clase==='Baja' ? 'Media' : n.clase==='Media' ? (chance(0.3)?'Alta':'Media') : 'Alta';
      n.clase = up; n.profession = pick(NPC_PROFESSIONS[up]); n.tierJob = NPC_JOB_EQUIV[n.profession] || null; adjustRel(n, {respect:[3,8]}); goalProgress(n,'dinero',30);
      return {text:`${n.name} consigue un trabajo mejor (${n.profession.toLowerCase()}). Se lo ve distinto, más seguro.`, vis:'journal'}; }},
  {id:'job_loss', w:(n)=> n.lifeState==='presente' && npcAge(n)>=18 && npcAge(n)<62 ? 1.5*(currentCityState().prosperity<45?2:1) : 0,
    run:(n)=>{ n.flags.debt = chance(0.5); if(!npcHasGoal(n,'dinero')) n.goals.push({id:'dinero', progress:0});
      return {text:`${n.name} se queda sin trabajo. Dice que no es nada. Se le nota que sí.`, vis:'history'}; }},
  {id:'good_time', w:(n)=> n.lifeState==='presente' && n.met && n.tier!=='misterioso' ? 2 : 0,
    run:(n)=>{ adjustRel(n, {affection:[2,6], trust:[1,4]}); return {text:`${n.name} atraviesa una buena época y se acuerda de invitarte a algo.`, vis:'journal'}; }},
  {id:'hard_time', w:(n)=> n.lifeState==='presente' && n.met ? 2 : 0,
    run:(n)=>{ adjustRel(n, {trust:-rndInt(2,6), loyalty:-rndInt(2,5)}); return {text:`${n.name} pasa por un mal momento y vos te enterás tarde. Queda esa incomodidad.`, vis:'journal'}; }},
  {id:'move_away', w:(n)=> n.lifeState==='presente' && ['comun','recurrente'].includes(n.tier) && !isFamilyNpc(n) ? 1.5*(npcHasGoal(n,'huir')?3:1) : 0,
    run:(n)=>{ n.lifeState = 'lejos'; adjustRel(n, {trust:-rndInt(3,8), affection:-rndInt(2,6)}); if(n.met) remember('npc_se_fue', `${n.name} se fue de la ciudad.`, {cat:'person', npc:n.id});
      goalProgress(n,'huir',100); return {text:`${n.name} se muda a otra ciudad. Prometen escribirse; casi nunca pasa.`, vis: n.met?'journal':'history'}; }},
  {id:'come_back', w:(n)=> n.lifeState==='lejos' ? 1.2 : 0,
    run:(n)=>{ n.lifeState = 'presente'; n.location = currentCityKey(); adjustRel(n, {affection:[3,8]}); return {text:`${n.name} vuelve a la ciudad después de un tiempo afuera.`, vis: n.met?'journal':'history'}; }},
  {id:'marry', w:(n)=> n.lifeState==='presente' && !n.flags.married && !isFamilyNpc(n) && npcAge(n)>=20 && npcAge(n)<=50 ? 1.2*(npcHasGoal(n,'formar_familia')||npcHasGoal(n,'amor')?2.5:1) : 0,
    run:(n)=>{ n.flags.married = true; adjustRel(n, {affection:[2,5]}); goalProgress(n,'amor',100); goalProgress(n,'formar_familia',50);
      return {text:`${n.name} se casa. Te enterás con más o menos anticipación según cuánto se hablen últimamente.`, vis: n.met?'journal':'history'}; }},
  {id:'have_child', w:(n)=> n.flags.married && npcAge(n)>=21 && npcAge(n)<=44 && (n.flags.kids||0)<4 ? 1.2 : 0,
    run:(n)=>{ n.flags.kids = (n.flags.kids||0)+1; goalProgress(n,'formar_familia',50); if(!npcHasGoal(n,'familia')) n.goals.push({id:'familia', progress:0});
      return {text:`${n.name} tiene ${n.flags.kids===1?'su primer hijo':'otro hijo'}.`, vis:'history'}; }},
  {id:'join_faction', w:(n)=> !n.hidden.faction && npcAge(n)>=18 && n.lifeState==='presente' && (n.mystic>=30 || npcHasTrait(n,'devoto')) ? 0.8*(npcHasGoal(n,'organizacion')?3:1)*(npcHasGoal(n,'fe')?2:1)*(npcHasGoal(n,'poder')?1.5:1) : 0,
    run:(n)=>{ const city = currentCity();
      const f = npcHasTrait(n,'devoto') ? 'church' : npcHasGoal(n,'poder') && chance(0.5) ? 'aurora' : wpick(FACTION_KEYS.filter(k=>k!=='tarotClub'), k=>city.factions[k]||0.2);
      n.hidden.faction = f; goalProgress(n,'organizacion',100);
      addHiddenTruth(`${n.name} se unió a ${factionName(f)} ${f==='aurora' ? 'en uno de los peores momentos de su vida' : 'sin decírselo a nadie'}.`, {key:'npc_fac_'+n.id, npc:n.id});
      return {text:`${n.name} empieza a frecuentar gente nueva. Vos no sabés quiénes son — todavía.`, vis: n.met?'journal':'hidden'}; }},
  {id:'become_beyonder', w:(n)=> !n.hidden.pathway && n.lifeState==='presente' && npcAge(n)>=16 && npcAge(n)<=55 && n.mystic>=40 ? 0.35*(npcHasGoal(n,'saber')?2:1)*(npcHasGoal(n,'poder')?2.5:1)*(n.hidden.faction?2:1) : 0,
    run:(n)=>{ makeHiddenBeyonder(n, {faction:n.hidden.faction, sequence:9}); npcHistory(n, 'Cambió. No sabrías decir cómo.');
      if(n.met && bondScore(n)>=40) adjustRel(n, {suspicion:0});
      return {text:`${n.name} está raro. Duerme poco, mira distinto, evita ciertas preguntas.`, vis: n.met?'journal':'hidden'}; }},
  {id:'beyonder_advance', w:(n)=> n.hidden.pathway && n.hidden.sequence > 5 && n.lifeState==='presente' ? 0.25 : 0,
    run:(n)=>{ n.hidden.sequence--; if(n.known.pathway) n.known.sequence = false; return {text:`${n.name} desaparece unas semanas. Cuando vuelve, algo en su presencia pesa más.`, vis: n.met?'history':'hidden'}; }},
  {id:'lose_control', w:(n)=> n.hidden.pathway && n.lifeState==='presente' ? 0.12*(npcHasGoal(n,'poder')?3:1) : 0,
    run:(n)=>{ if(chance(0.5)){ n.lifeState = 'desaparecido'; addHiddenTruth(`${n.name} perdió el control de su poder. Lo que quedó de ${ng(n,'él','ella')} lo cazaron los Nighthawks una semana después.`, {key:'npc_lost_'+n.id, npc:n.id});
        return {text:`${n.name} no aparece más. Nadie sabe nada. La policía dice que "la gente se va".`, vis: n.met?'journal':'hidden'}; }
      npcDies(n, 'extrañas circunstancias', `Encuentran a ${n.name} muerto en su casa, en circunstancias que nadie quiere describir.`); return null; }},
  {id:'snoop', w:(n)=> n.met && n.lifeState==='presente' && playerHasSomethingToHide() ? 1.4*npcMod(n,'snoop')*(n.hidden.faction?1.8:1)*(n.suspicion>=20?1.5:1) : 0,
    run:(n)=>{ adjustRel(n, {suspicion:[3,9]});
      if(STATE.pathway.chosenPathway && !n.knows.beyonder && chance(0.12 - pathwayMods().stealth*0.2)){ n.knows.beyonder = true; addHiddenTruth(`${n.name} descubrió lo que sos mucho antes de que se lo dijeras.`, {key:'npc_knows_'+n.id, npc:n.id}); }
      return {text:`${n.name} te hace una pregunta rara sobre dónde estuviste. No insiste, pero se queda mirándote un segundo de más.`, vis:'journal'}; }},
  {id:'report', w:(n)=> n.hidden.faction && n.hidden.faction!=='tarotClub' && n.suspicion>=45 && n.loyalty<45 && !n.flags.reportedPlayer && playerHasSomethingToHide() ? 1.5*npcMod(n,'betray') : 0,
    run:(n)=>{ const f = n.hidden.faction; n.flags.reportedPlayer = f; factionAdjust(f, {suspicion:rndInt(8,16)}, true);
      addHiddenTruth(`${n.name} le habló de vos a ${factionName(f)}.`, {key:'report_'+n.id, npc:n.id});
      return {text:'', vis:'hidden'}; }},
  {id:'report_nonmember', w:(n)=> !n.hidden.faction && n.knows.beyonder && n.suspicion>=55 && n.loyalty<35 && !n.flags.reportedPlayer ? 1.0*npcMod(n,'betray')*(npcHasTrait(n,'devoto')?2:1) : 0,
    run:(n)=>{ const f = npcHasTrait(n,'devoto') ? 'church' : pick(['church','mi9']); n.flags.reportedPlayer = f; factionAdjust(f, {suspicion:rndInt(10,18)}, true);
      addHiddenTruth(`${n.name} fue a ${factionName(f)} a contar lo que sabía de vos. Tenía miedo.`, {key:'report_'+n.id, npc:n.id}); return {text:'', vis:'hidden'}; }},
  {id:'favor', w:(n)=> n.met && n.lifeState==='presente' && n.loyalty>=65 ? 1.2*npcMod(n,'help') : 0,
    run:(n)=>{ adjustRel(n, {loyalty:[3,8]}); applyEffects({sanity:[1,4], cash: chance(0.4)?[10,60]:0});
      remember('npc_favor_recibido', `${n.name} te hizo un favor sin que se lo pidieras.`, {cat:'favor_received', npc:n.id});
      return {text:`${n.name} te hace un favor sin que se lo pidieras. De esos que uno no se olvida.`, vis:'journal'}; }},
  {id:'distance', w:(n)=> n.met && n.lifeState==='presente' && n.suspicion>=55 ? 1.5 : 0,
    run:(n)=>{ adjustRel(n, {trust:-rndInt(6,15), loyalty:-rndInt(5,12), fear:[3,9]}); remember('npc_desconfia', `${n.name} empezó a tomar distancia de vos.`, {cat:'person', npc:n.id});
      return {text:`${n.name} empieza a evitarte. No dice por qué, y vos tampoco preguntás.`, vis:'journal'}; }},
  {id:'fade', w:(n)=> n.met && n.lifeState==='presente' && n.tier==='comun' && STATE.time.totalMonths - (n.lastSeen||0) > 24 ? 1.2 : 0,
    run:(n)=>{ n.lifeState = 'distanciado'; adjustRel(n, {trust:-rndInt(5,12), affection:-rndInt(5,12)}); return {text:`Con ${n.name} dejan de verse, sin pelea ni motivo. Simplemente pasa.`, vis:'journal'}; }},
  {id:'grudge', w:(n)=> n.met && !n.flags.grudge && n.affection < 25 && npcHasTrait(n,'rencoroso') ? 1 : 0,
    run:(n)=>{ n.flags.grudge = true; if(!n.secrets.some(s=>s.id==='hates_player')) n.secrets.push({id:'hates_player', text:'Te guarda un rencor que nunca te dijo.', kind:'rencor', leverage:0, known:false});
      return {text:'', vis:'hidden'}; }},
  {id:'visit', w:(n)=> n.met && n.lifeState==='presente' && n.dependence>=40 ? 1.2 : 0,
    run:(n)=>{ adjustRel(n, {affection:[2,5]}); n.lastSeen = STATE.time.totalMonths; return {text:`${n.name} pasa a verte "sin motivo". Siempre hay un motivo, aunque sea no estar solo.`, vis:'journal'}; }},
  {id:'illness', w:(n)=> npcAge(n)>=45 && !n.flags.ill ? 0.6*(npcAge(n)/60) : 0,
    run:(n)=>{ n.flags.ill = true; return {text:`${n.name} está enfermo. Dice que no es grave.`, vis: n.met?'journal':'history'}; }},
  {id:'murdered', w:(n)=> n.lifeState==='presente' && (n.hidden.pathway || ['Policía','Prestamista','Cantinero','Estibador'].includes(n.profession) || n.flags.debt) ? 0.25*(currentCityState().security<40?3:1) : 0,
    run:(n)=>{ npcDies(n, 'asesinato', `Encuentran a ${n.name} muerto en un callejón. La policía habla de un robo. ${n.hidden.pathway ? 'A nadie le llama la atención que no falte nada.' : ''}`);
      if(n.met) addMissingPersonLead(n, true); return null; }},
  {id:'befriend', w:(n)=> n.met && n.lifeState==='presente' && n.links.length < 2 ? 0.8 : 0,
    run:(n)=>{ const other = pick(aliveNpcs().filter(x=>x!==n && x.met && x.lifeState==='presente' && !x.links.some(l=>l.npc===n.id)));
      if(!other) return null; const type = chance(0.15) && !n.flags.married && !other.flags.married ? 'pareja' : 'amistad';
      n.links.push({npc:other.id, type}); other.links.push({npc:n.id, type});
      return {text:`${n.name} y ${other.name} ${type==='pareja' ? 'empiezan a salir. Te enterás por terceros.' : 'se hicieron amigos. El mundo es chico.'}`, vis:'journal'}; }}
];
function goalProgress(n, goalId, amount){
  const g = (n.goals||[]).find(x=>(x.id||x)===goalId);
  if(!g || typeof g !== 'object') return;
  g.progress = clamp((g.progress||0) + amount, 0, 100);
  if(g.progress >= 100){ n.goals = n.goals.filter(x=>x!==g); if(n.goals.length < 2) n.goals.push(rollGoals(n.personality)[0]); }
}
function playerHasSomethingToHide(){
  return !!STATE.pathway.chosenPathway || (STATE.flags.mysticExposure||0) >= 20 || factionAccess('aurora') >= 1;
}

// Una vez por mes: unos pocos NPCs hacen algo por su cuenta. A lo sumo UNA
// cosa por mes llega al journal: el mundo se mueve de fondo, sin volver
// cada mes una telenovela.
function npcTick(){
  if(STATE.gameOver || STATE.character.edad < 6) return;
  let journaled = 0;
  const people = aliveNpcs().filter(n=>n.lifeState !== 'desaparecido');
  for(const n of people){
    ensureNpc(n);
    if(n.id==='padre' || n.id==='madre'){ if(!chance(0.01)) continue; }
    const base = {comun:0.02, recurrente:0.03, importante:0.04, misterioso:0.05, sobrenatural:0.05}[n.tier] || 0.02;
    if(!chance(base)) continue;
    const act = wpick(NPC_ACTIONS, a=>{ try{ return a.w(n); }catch(e){ return 0; } });
    if(!act) continue;
    const res = act.run(n);
    if(!res || !res.text) { updateNpcTier(n); continue; }
    if(res.vis === 'hidden') continue;
    npcHistory(n, res.text);
    if(res.vis === 'journal' && n.met && journaled < 1){ logJournal('La vida de ' + n.name, res.text, {cat:'relation', imp:0}); journaled++; }
    updateNpcTier(n);
  }
}

/* ------------------------------ muerte ------------------------------ */
// Mortalidad natural: todos envejecen con la curva HUMANA, no con la del
// jugador (un cónyuge común no vive 300 años por estar casado con un Saint:
// verlos morir es parte del precio de las Sequences altas, y de las Anclas).
const NPC_MORTALITY = {
  padre:{threshold:65, coef:0.010, cap:0.4}, madre:{threshold:65, coef:0.010, cap:0.4},
  hermano:{threshold:65, coef:0.010, cap:0.4}, conyuge:{threshold:65, coef:0.010, cap:0.4},
  hijo:{threshold:70, coef:0.008, cap:0.35}, otro:{threshold:66, coef:0.009, cap:0.35}
};
function npcMortalityGroup(npc){
  if(npc.id==='padre' || npc.id==='madre') return npc.id;
  if(npc.id==='pareja' || npc.id==='conyuge') return 'conyuge';
  if(npc.id.startsWith('hermano')) return 'hermano';
  if(npc.id.startsWith('hijo')) return 'hijo';
  return 'otro';
}
function checkNpcMortality(){
  if(STATE.gameOver) return;
  // Se evalúa una vez por año por NPC (en el mes de su "cumpleaños" = enero),
  // con la misma curva que usaba el sistema anterior mes a mes pero escalada.
  if(STATE.time.month !== 1) return;
  STATE.npcs.forEach(npc=>{
    if(!npc.alive || npc.lifeState==='desaparecido') return;
    const group = npcMortalityGroup(npc);
    const mp = NPC_MORTALITY[group];
    const age = npcAge(npc);
    if(age < mp.threshold) return;
    let p = clamp((age-mp.threshold)*mp.coef*6, 0, mp.cap*3);
    if(npc.flags.ill) p *= 1.6;
    if(chance(Math.min(0.85, p))) npcDies(npc, 'vejez', null, age);
  });
}
function npcDies(npc, cause, text, age){
  if(!npc || !npc.alive) return;
  const c = STATE.character;
  age = age ?? npcAge(npc);
  const bond = bondScore(npc);
  const group = npcMortalityGroup(npc);
  npc.alive = false; npc.lifeState = 'muerto'; npc.cause = cause; npc.deathYear = calendarYear();
  const wasAnchor = STATE.anchors.people.includes(npc.id);
  if(npc.met || isFamilyNpc(npc)){
    let golpe = Math.round(bond/10) + (group==='hijo' ? rndInt(10,18) : group==='conyuge' ? rndInt(8,15) : isFamilyNpc(npc) ? rndInt(4,10) : 0);
    if(golpe > 0) applyEffects({sanity:-golpe});
    let extra = bond >= 50 ? `${c.nombre} nunca deja de sentir ese vacío del todo.` : '';
    if(group==='conyuge' && (npc.id==='conyuge' || npc.id==='pareja')){
      if(c.estadoCivil==='Casado/a') c.estadoCivil = 'Viudo/a';
      npc.id = 'conyuge_fallecido_' + STATE.time.totalMonths;
      remember('viudez', `Perdiste a ${npc.name}, con quien compartiste tu vida.`, {cat:'loss', npc:npc.id});
      extra = `La casa queda en un silencio que ${c.nombre} tarda años en aprender a habitar.`;
    } else if(group==='hijo'){
      remember('hijo_perdido', `Sobreviviste a ${npc.name}. Ningún padre debería.`, {cat:'loss', npc:npc.id});
      extra = cause==='vejez' ? 'Sobrevivir a un hijo, aunque sea de viejo, no tiene nombre.' : 'Sobrevivir a un hijo no tiene nombre.';
    } else if(bond >= 45 || isFamilyNpc(npc)){
      remember('loss_'+npc.id, `Murió ${npc.name}.`, {cat:'loss', npc:npc.id});
    }
    if(group==='padre' || group==='madre') inheritFrom(npc);
    const causeTxt = cause==='vejez' ? `a los ${age} años` : `(${cause})`;
    logJournal('Una pérdida', text || `${npc.name} (${npc.role.toLowerCase()}) fallece ${causeTxt}. ${extra}`, {cat:'death', imp: bond>=45||isFamilyNpc(npc) ? 3 : 1});
    if(isFamilyNpc(npc) || bond >= 55) addMilestone('loss', `Muere ${npc.name} (${npc.role.toLowerCase()})`);
    if(bond >= 30) toast(npc.name + ' falleció.', 'neg');
    if(wasAnchor) onAnchorLost(npc);
    STATE._importantMoment = STATE._importantMoment || bond >= 45 || isFamilyNpc(npc);
  }
}
function inheritFrom(npc){
  const c = STATE.character;
  const base = {Baja:[20,150], Media:[200,1200], Alta:[2500,9000]}[npc.clase || c.clase] || [50,300];
  const v = Math.round(rndInt(base[0], base[1]) * priceIndex());
  const heirs = 1 + aliveNpcs().filter(n=>n.id.startsWith('hermano')).length;
  const share = Math.round(v / heirs / (npc.id==='padre' && npcById('madre') && npcById('madre').alive ? 2 : 1));
  if(share > 0){ applyEffects({cash:share}); logJournal('La herencia', `Te toca ${fmtMoney(share)} de lo que dejó ${npc.name}. No alcanza para llenar nada.`, {cat:'family', imp:1}); }
}

/* ------------------------------ ayudas varias ------------------------------ */
// Completa campos de NPCs de saves viejos o creados en caliente.
function ensureNpc(n){
  if(!n) return n;
  ensureRel(n);
  if(!n.gender) n.gender = /Madre|Hermana|Hija|Vecina|Pareja|Esposa|Amiga|Maestra/i.test(n.role||'') ? 'f' : (n.id==='vecina' ? 'f' : 'm');
  if(!n.tier){
    if(['padre','madre','conyuge'].includes(n.id) || n.id.startsWith('hijo')) n.tier = 'importante';
    else if(n.id.startsWith('hermano') || n.id==='amigo' || n.id==='sacerdote') n.tier = 'recurrente';
    else if(n.id==='extraño') n.tier = 'misterioso';
    else n.tier = 'comun';
  }
  if(!n.relType) n.relType = isFamilyNpc(n) ? 'family' : n.id==='amigo' ? 'friend' : n.id==='vecina' ? 'neighbor' : 'contact';
  if(!Array.isArray(n.goals)) n.goals = [];
  n.goals = n.goals.map(g=> typeof g === 'string' ? {id: LEGACY_GOAL_MAP[g] || 'dinero', progress:0} : g);
  if(!n.goals.length) n.goals = rollGoals(n.personality);
  if(!Array.isArray(n.personality)) n.personality = rollPersonality();
  if(!Array.isArray(n.fears)) n.fears = [pick(NPC_FEARS)];
  if(!Array.isArray(n.secrets)) n.secrets = [];
  if(!Array.isArray(n.links)) n.links = [];
  if(!Array.isArray(n.history)) n.history = [];
  if(!n.flags) n.flags = {};
  if(!n.known) n.known = {pathway:false, sequence:false, faction:false};
  if(!n.hidden) n.hidden = {pathway:null, sequence:null, faction:null};
  if(!n.knows) n.knows = {beyonder:false, partial:false};
  if(n.mystic === undefined) n.mystic = n.hidden.pathway ? 80 : rndInt(0,12);
  if(!n.lifeState) n.lifeState = n.alive ? 'presente' : 'muerto';
  if(n.met === undefined) n.met = true; // los NPCs de saves viejos ya eran conocidos
  if(n.interactions === undefined) n.interactions = 0;
  if(!n.location) n.location = currentCityKey();
  if(n.reputation === undefined) n.reputation = rndInt(25,60);
  if(n.profession === undefined) n.profession = isFamilyNpc(n) ? (npcAge(n)>=18 ? pick(NPC_PROFESSIONS[STATE.character.clase||'Media']) : 'Estudiante') : pick(NPC_PROFESSIONS.Media);
  if(n.tierJob === undefined) n.tierJob = NPC_JOB_EQUIV[n.profession] || null;
  if(n.ageOffset === undefined){
    const g = npcMortalityGroup(n);
    if(g==='hermano') n.ageOffset = siblingAgeOffset(n.role||'');
    else if(g==='conyuge') n.ageOffset = rndInt(-10,10);
    else if(g==='hijo') n.ageOffset = -Math.max(0, STATE.character.edad - 30);
    else if(g==='padre' || g==='madre') n.ageOffset = rndInt(22,36);
    else n.ageOffset = rndInt(-5,25);
  }
  return n;
}
// Crea un "contacto místico" (adivina, médium, anticuario...) — puede ser
// Beyonder de verdad o un simple charlatán con buen ojo.
function createMysticContact(opts){
  opts = opts || {};
  const real = opts.pathway ? true : chance(0.5);
  const n = createNpc({relType:'contact', role: opts.role || pick(NPC_OCCULT_PROFESSIONS), profession: opts.role || pick(NPC_OCCULT_PROFESSIONS), tier:'misterioso',
    ageMin:25, ageMax:70, met:true, allowHidden:false, mystic:rndInt(50,90), trust:rndInt(15,30)});
  n.flags.mysticContact = true;
  if(real) makeHiddenBeyonder(n, {pathway: opts.pathway, faction: opts.faction ?? null, sequence: opts.sequence || pick([9,9,8,8,7])});
  return n;
}
function createRival(){
  const n = createNpc({relType:'work', role:'Rival en el trabajo', tier:'recurrente', ageMin:Math.max(18,STATE.character.edad-8), ageMax:STATE.character.edad+8, met:true,
    personality:['ambicioso', pick(['celoso','calculador','rencoroso'])], trust:rndInt(5,15), affection:rndInt(0,10)});
  n.flags.rival = true;
  return n;
}
function revealNpcFaction(n){
  if(!n) return;
  n.known.faction = true;
  const f = n.hidden.faction;
  if(!f) return;
  factionMeet(f);
  if(f === 'tarotClub'){ STATE.factions.tarotClub.discovered = true; STATE.factions.tarotClub.known = true; tarotHear(n.name); if(STATE.tarot.stage < 3) STATE.tarot.stage = 3; }
  if(n.id === 'extraño') revealHiddenTruth('cain', 'lo seguiste hasta el final');
  updateNpcTier(n);
}
