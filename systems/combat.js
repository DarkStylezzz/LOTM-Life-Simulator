'use strict';
/* =========================================================================
   systems/combat.js — combate táctico (§24, §25, §26).
   Estados, distancia (cuerpo a cuerpo / media / lejos), entorno, información
   incompleta, habilidades de vía con enfriamiento, acciones defensivas,
   efectos mentales, corrupción, heridas que quedan, y la posibilidad real
   de huir o de hablar. Cada arquetipo de enemigo pelea distinto (ver
   data/enemies.js). La Sequence del rival se descubre en etapas:
     ???  →  Rango posible: 6–8  →  Sequence estimada: 7  →  Sequence 7
   ========================================================================= */
const DIST_LABEL = ['Cuerpo a cuerpo','Distancia media','Lejos'];

function pickEncounter(kind){
  const pool = (ENCOUNTER_POOLS[kind] || ENCOUNTER_POOLS.mundane).filter(k=>{ const e = ENEMIES[k]; try{ return !e.req || e.req(); }catch(err){ return false; } });
  return wpick(pool, k=>ENEMIES[k].w || 1) || 'mugger';
}
function combatEncounterChance(){
  const base = 0.005;
  const mysticBonus = Math.min(0.012, (STATE.flags.mysticExposure||0)/7000);
  const threat = (STATE.world.threat||0)/4000;
  return clamp((base + mysticBonus + threat) * worldDangerMult(), 0.003, 0.05);
}
function maybeTriggerCombat(){
  if(STATE.combat || STATE.gameOver || STATE.pendingEvent || STATE.pendingMission) return false;
  if(!chance(combatEncounterChance())) return false;
  const hasSome = maxPathwayKnowledge() >= 35 || !!STATE.pathway.chosenPathway;
  const useMystic = hasSome ? chance(Math.min(0.6, mysticExposureChance()*3 + (STATE.world.threat||0)/200)) : chance(0.05);
  startCombat(pickEncounter(useMystic ? 'mystic' : 'mundane'), {source:'calle'});
  return true;
}

function startCombat(keyOrTpl, opts){
  opts = opts || {};
  let key = typeof keyOrTpl === 'string' ? keyOrTpl : (keyOrTpl && keyOrTpl.id);
  const tpl = Object.assign({}, ENEMIES[key] || (typeof keyOrTpl === 'object' ? keyOrTpl : ENEMIES.mugger), opts.overrides || {});
  if(!ENEMIES[key]) key = 'mugger';
  const hp = rndInt(tpl.hp[0], tpl.hp[1]);
  let seq = Array.isArray(tpl.seq) ? rndInt(tpl.seq[0], tpl.seq[1]) : tpl.seq;
  // Un Beyonder hostil no escala con vos: su Sequence sale de una tabla propia.
  if(key === 'rivalBeyonder' && !(opts.overrides && opts.overrides.seq)) seq = wpick([9,8,7,6,5], s=>({9:3,8:4,7:3,6:2,5:0.6})[s]);
  const pathway = tpl.pathway === '$random' ? pick(Object.keys(PATHWAYS)) : (tpl.pathway || null);
  const envKey = opts.env && COMBAT_ENVS[opts.env] ? opts.env : pick(tpl.env || ['street']);
  const env = COMBAT_ENVS[envKey];
  let range = null;
  if(seq !== null && seq !== undefined){ const o = rndInt(-1,1); range = [clamp(seq-1+o,0,9), clamp(seq+1+o,0,9)]; if(range[0]>seq) range[0]=seq; if(range[1]<seq) range[1]=seq; }
  STATE.combat = {
    enemy:{ key, name:tpl.name, archetype:tpl.archetype||'human', tier:tpl.tier, desc:tpl.desc, maxHp:hp, hp, dmg:tpl.dmg, defense:tpl.defense,
      sanityDmg:tpl.sanityDmg||[0,0], corruptionDmg:tpl.corruptionDmg||[0,0], fleeChance:tpl.fleeChance, seq: seq ?? null, pathway, faction:tpl.faction||null,
      talk:tpl.talk||0, reward:tpl.reward||{}, humanoid: tpl.archetype!=='creature', statuses:[], analyzedPlayer:false, usedDesperate:false, next:null },
    env:envKey, distance: tpl.archetype==='smart' ? 1 : (env.hide ? 2 : 1), round:1,
    info:{stage:0, range, estimate: seq!==null && seq!==undefined ? (chance(0.8) ? seq : clamp(seq + pick([-1,1]),0,9)) : null},
    player:{statuses:[], cooldowns:{}, guard:false, usedPowers:false, startSalud:STATE.character.salud, dmgTaken:0},
    witnesses: chance(env.witnesses||0), log:[], opts:{bonusCash:opts.bonusCash||null, source:opts.source||'', allies:!!opts.allies}
  };
  // La campanita de cobre avisa: nunca te toman por sorpresa.
  if(!artifactActiveEffect('warn')) enemyChooseNext();
  else { STATE.combat.log.push('La campanita de cobre suena sola un segundo antes. Estás preparado.'); STATE.combat.info.stage = 1; enemyChooseNext(); }
  logJournal('Encuentro violento', tpl.desc, {cat:'combat', imp:2});
  STATE._importantMoment = true;
  return STATE.combat;
}

/* ------------------------------ estados ------------------------------ */
function hasStatus(list, id){ return (list||[]).some(s=>s.id===id); }
function addStatus(list, id, turns){
  const d = STATUSES[id]; if(!d) return;
  const ex = list.find(s=>s.id===id);
  if(ex) ex.turns = Math.max(ex.turns, turns || d.turns); else list.push({id, turns: turns || d.turns});
}
function tickStatuses(list, who){
  const log = STATE.combat.log;
  list.forEach(s=>{
    const d = STATUSES[s.id];
    if(d && d.dot){
      const dmg = rndInt(d.dot[0], d.dot[1]);
      if(who === 'enemy') STATE.combat.enemy.hp -= dmg;
      else applyEffects({salud:-dmg});
      log.push(`${who==='enemy' ? STATE.combat.enemy.name : 'Vos'}: ${d.label.toLowerCase()} (-${dmg}).`);
    }
    s.turns--;
  });
  return list.filter(s=>s.turns > 0);
}
function statusMult(list, key){ return (list||[]).reduce((m,s)=>{ const d = STATUSES[s.id]; return m * (d && d[key] ? d[key] : 1); }, 1); }

/* ------------------------------ poder del jugador ------------------------------ */
function playerCombatPower(fixedRoll, opts){
  opts = opts || {};
  const c = STATE.character, p = STATE.pathway;
  let atk = fixedRoll === undefined ? rndInt(4,9) : fixedRoll;
  if(p.chosenPathway) atk += (9 - p.sequence)*2.2 + 2;
  atk += Math.floor(c.spirituality/15);
  atk += pathwayMods().combatPower || 0;
  atk += (woundMods().combat||0) + (conditionMods().combat||0);
  if(!opts.noWeapon){ const w = bestWeapon(!!opts.ranged); if(w) atk += w.combat.dmg * (opts.ranged ? 1 : (pathwayMods().weaponMult||1)); }
  if(c.salud < 30) atk *= 0.7;
  atk *= getTraitMods().combatMult;
  if(STATE.combat){
    atk *= statusMult(STATE.combat.player.statuses, 'dmgMult');
    const aff = PATHWAY_ENV_AFFINITY[p.chosenPathway] || [];
    if(aff.includes(STATE.combat.env)) atk *= 1.2;
  }
  return Math.max(1, Math.round(atk));
}
function dealDamage(raw, opts){
  opts = opts || {};
  const e = STATE.combat.enemy;
  if(hasStatus(e.statuses, 'oculto') && chance(0.6)){ STATE.combat.log.push(`Tu golpe atraviesa el lugar donde ${e.name} ya no está.`); return 0; }
  let dmg = raw * statusMult(e.statuses, 'dmgTaken');
  if(opts.mysticMult && e.tier === 'mystic') dmg *= opts.mysticMult;
  dmg = Math.max(1, Math.round(dmg - e.defense));
  e.hp -= dmg;
  if(hasStatus(e.statuses, 'dormido')) e.statuses = e.statuses.filter(s=>s.id!=='dormido');
  return dmg;
}

/* ------------------------------ acciones del jugador ------------------------------ */
function combatActions(){
  const cb = STATE.combat; if(!cb) return [];
  const e = cb.enemy, acts = [];
  const far = cb.distance >= 2;
  acts.push({id:'attack', label: far ? 'Acercarte y golpear' : 'Atacar', small: far ? 'Cerrás distancia con un golpe débil' : 'Golpe directo'});
  if(bestWeapon(true)) acts.push({id:'shoot', label:'Disparar', small:'Funciona a cualquier distancia. Hace ruido.'});
  if(cb.distance > 0) acts.push({id:'approach', label:'Acercarte', small:'Cuerpo a cuerpo'});
  if(cb.distance < 2) acts.push({id:'retreat', label:'Tomar distancia', small:'Más fácil huir; los golpes cuerpo a cuerpo no llegan'});
  acts.push({id:'defend', label:'Defenderte', small:'Reduce a la mitad el próximo golpe'});
  if(e.tier === 'mystic' || e.archetype === 'smart') acts.push({id:'observe', label:'Observar', small:'No atacás; aprendés qué es y qué va a hacer'});
  combatAbilities().forEach(a=>{
    const cd = cb.player.cooldowns[a.id] || 0;
    const cost = a.cost || {};
    const can = cd <= 0 && STATE.character.spirituality >= (cost.sp||0) && !(a.combat.creatureOnly && e.humanoid) && !(!a.combat.ranged && a.combat.dmg && far && !a.combat.escape);
    acts.push({id:'ab:'+a.id, label:a.name, small: cd>0 ? `Disponible en ${cd} turno(s)` : `${a.desc}${cost.sp?` (Espiritualidad ${cost.sp})`:''}`, disabled:!can, ability:true});
  });
  const items = itemsByCat('misc').filter(it=>ITEM_DEFS[it.def] && ITEM_DEFS[it.def].consumable);
  items.forEach(it=>acts.push({id:'item:'+it.uid, label:'Usar: '+it.name, small:ITEM_DEFS[it.def].uses}));
  itemsByCat('artifact').forEach(it=>{ const eff = artifactCombatEffect(it); if(eff) acts.push({id:'art:'+it.uid, label:'Usar: '+it.name, small:eff.text}); });
  if(e.humanoid && e.talk > 0) acts.push({id:'talk', label:'Hablar', small:'Intimidar, convencer, engañar'});
  acts.push({id:'flee', label:'Huir', small:'No siempre funciona, pero es una salida válida'});
  return acts;
}
function combatAction(action){
  const cb = STATE.combat; if(!cb) return;
  const e = cb.enemy, c = STATE.character, log = cb.log;
  cb.player.guard = false;
  let incoming = 1, negate = false, fled = false, peace = false;
  // Aturdido/dormido: perdés el turno.
  if(hasStatus(cb.player.statuses, 'aturdido') || hasStatus(cb.player.statuses, 'dormido')){ log.push('No podés moverte este turno.'); action = '__skip'; }
  if(action === 'attack'){
    let raw = playerCombatPower();
    if(cb.distance >= 2){ raw = raw * 0.5; cb.distance = 1; }
    else cb.distance = 0;
    if(hasStatus(cb.player.statuses, 'confundido') && chance(0.4)){ log.push('Golpeás al aire: no sabés bien dónde está.'); }
    else { const d = dealDamage(raw); if(d) log.push(`Atacás y le hacés ${d} de daño.`); }
  } else if(action === 'shoot'){
    const w = bestWeapon(true);
    const d = dealDamage(playerCombatPower(undefined, {ranged:true}) + (w ? 2 : 0));
    if(d) log.push(`Disparás: ${d} de daño.`);
    if(cb.witnesses){ raiseAttention(3); cb.player.usedPowers = true; }
  } else if(action === 'approach'){ cb.distance = Math.max(0, cb.distance-1); log.push('Acortás distancia.');
  } else if(action === 'retreat'){ cb.distance = Math.min(2, cb.distance+1); log.push('Retrocedés, buscando espacio.'); if(cb.distance===2) incoming = 0.6;
  } else if(action === 'defend'){ cb.player.guard = true; incoming = 0.5; log.push('Te ponés en guardia.');
  } else if(action === 'observe'){
    const gain = 1 + ((pathwayMods().perception||0) >= 2 ? 1 : 0);
    cb.info.stage = Math.min(3, cb.info.stage + gain);
    if(cb.info.stage >= 2) addStatus(e.statuses, 'analizado', 99);
    log.push(e.seq===null ? `Estudiás a ${e.name}. No es un Beyonder convencional: es otra cosa.` : `Estudiás a ${e.name} con atención. ${infoLine()}`);
  } else if(action === 'talk'){
    const skill = (pathwayMods().deception||0) + (pathwayMods().social||0) + (playerTags().has('social')?0.1:0) + (playerTags().has('brave')?0.05:0);
    const p = clamp(e.talk + skill + (e.hp < e.maxHp*0.4 ? 0.2 : 0) + luckMod(), 0, 0.9);
    if(chance(p)){ peace = true; log.push(`Hablás. Algo de lo que decís le llega a ${e.name}: baja la guardia y se va.`); }
    else { log.push('Hablás. No sirve de nada.'); e.statuses.push({id:'furioso', turns:1}); }
  } else if(action === 'flee'){
    const env = COMBAT_ENVS[cb.env] || {};
    const p = clamp(e.fleeChance + (env.flee||0) + cb.distance*0.12 + (pathwayMods().fleeBonus||0) + luckMod(), 0.05, 0.95);
    fled = chance(p);
    log.push(fled ? 'Lográs escapar entre la confusión.' : 'Intentás escapar, pero no lo lográs.');
  } else if(action.startsWith('ab:')){
    const r = useCombatAbility(action.slice(3));
    if(!r){ renderAll(); return; }
    incoming = r.incoming; negate = r.negate; if(r.fled) fled = true;
  } else if(action.startsWith('item:')){
    const ch = useConsumable(action.slice(5)); log.push('Usás un objeto.' + (ch && ch.length ? ' ' + ch.map(x=>x.msg).join(', ') + '.' : ''));
  } else if(action.startsWith('art:')){
    const r = useArtifactInCombat(action.slice(4)); if(r){ incoming *= r.incoming||1; negate = negate || r.skip; }
  }
  // La información sobre el rival avanza sola con el correr de la pelea.
  if(cb.round >= 2 && cb.info.stage === 0 && e.tier==='mystic') cb.info.stage = 1;
  if(fled){ endCombat('fled'); return; }
  if(peace){ endCombat('peace'); return; }
  if(e.hp <= 0){ endCombat('victory'); return; }
  // Aliados (por ejemplo, un escuadrón de Nighthawks).
  if(cb.opts.allies){ const d = dealDamage(rndInt(5,10)); if(d) log.push(`Tus compañeros golpean: ${d} de daño.`); incoming *= 0.75; if(e.hp <= 0){ endCombat('victory'); return; } }
  // Turno del enemigo.
  e.statuses = tickStatuses(e.statuses, 'enemy');
  if(e.hp <= 0){ endCombat('victory'); return; }
  enemyTurn(incoming, negate);
  if(!STATE.combat) return;
  cb.player.statuses = tickStatuses(cb.player.statuses, 'player');
  for(const k in cb.player.cooldowns){ if(cb.player.cooldowns[k] > 0) cb.player.cooldowns[k]--; }
  cb.round++;
  if(c.salud <= 0){ if(tryDollSave()){ log.push('Algo se rompe en tu lugar. Seguís vivo.'); } else { endCombat('death'); return; } }
  if(c.sanity <= 0){ STATE.combat = null; resolveLossOfControl(); saveGame(true); renderAll(); return; }
  if(cb.log.length > 40) cb.log.splice(0, cb.log.length-40);
  saveGame(true); renderAll();
}
function useCombatAbility(id){
  const cb = STATE.combat, e = cb.enemy, log = cb.log;
  const a = combatAbilities().find(x=>x.id===id);
  if(!a) return null;
  if((cb.player.cooldowns[id]||0) > 0) return null;
  const cost = a.cost || {};
  if(STATE.character.spirituality < (cost.sp||0)){ log.push('No te alcanza la espiritualidad.'); return null; }
  applyEffects({spirituality:-(cost.sp||0), sanity: cost.san ? -cost.san : 0});
  cb.player.cooldowns[id] = a.cooldown || 1;
  cb.player.usedPowers = true;
  raiseAttention(rndInt(1,3) + (cb.witnesses ? 3 : 0) + ((a.risk && a.risk.attention)||0));
  if(a.risk && a.risk.corruption && chance(a.risk.corruption)) applyEffects({corruption:[1,2]});
  const x = a.combat; const bits = [];
  let incoming = x.incoming ?? 1, negate = false, fled = false;
  const wasAnalyzed = cb.info.stage >= 3;
  if(x.escape && chance(x.escape)){ fled = true; bits.push('te vas por donde nadie podría irse'); }
  if(x.dmg){
    let mult = x.dmg;
    if(x.analyzedMult && wasAnalyzed) { mult = x.analyzedMult; bits.push('golpeás justo donde sabías que era más débil'); }
    if(x.copyEnemy){ mult = Math.max(mult, (e.dmg[0]+e.dmg[1])/2 / Math.max(1, playerCombatPower(6.5))); bits.push('usás su propio poder contra él'); }
    if(x.env && x.env.includes(cb.env)) mult *= 1.25;
    const d = dealDamage(playerCombatPower(undefined, {noWeapon:true}) * mult, {mysticMult:x.mysticMult});
    if(d) bits.unshift(`${d} de daño`);
    if(x.lifesteal && d){ const h = Math.max(1, Math.round(d*x.lifesteal)); applyEffects({salud:h}); bits.push(`recuperás ${h} de salud`); }
  }
  if(x.spSteal){ applyEffects({spirituality:x.spSteal}); bits.push(`le robás ${x.spSteal} de espiritualidad`); }
  if(x.heal){ const h = roll(x.heal); if(h){ applyEffects({salud:h}); bits.push(`recuperás ${h} de salud`); } }
  if(x.selfSanity){ applyEffects({sanity:roll(x.selfSanity)}); }
  if(x.cleanse){ cb.player.statuses = cb.player.statuses.filter(s=>!STATUSES[s.id].bad); }
  if(x.status && chance(x.status.chance)){ addStatus(x.status.target==='self' ? cb.player.statuses : e.statuses, x.status.id); bits.push((x.status.target==='self'?'quedás ':'queda ') + STATUSES[x.status.id].label.toLowerCase()); }
  if(x.reveal){ cb.info.stage = Math.min(3, cb.info.stage + x.reveal); if(cb.info.stage >= 2) addStatus(e.statuses, 'analizado', 99); }
  if(x.revealOnUse && !wasAnalyzed){ cb.info.stage = 3; addStatus(e.statuses, 'analizado', 99); bits.push('deducís su verdadera naturaleza'); }
  if(x.negate && chance(x.negate)){ negate = true; bits.push('y esquivás el contragolpe'); }
  if(x.skipEnemy && chance(x.skipEnemy)){ negate = true; bits.push('y no puede responder'); }
  if(x.push){ cb.distance = Math.min(2, cb.distance+1); }
  if(x.mysticMult && e.tier==='mystic') bits.push('la luz lo quema como a algo que no debería existir');
  log.push(`Usás ${a.name}${bits.length ? ': ' + bits.join(', ') : ''}.`);
  return {incoming, negate, fled};
}

/* ------------------------------ el enemigo ------------------------------ */
function enemyChooseNext(){
  const cb = STATE.combat, e = cb.enemy;
  let next = 'attack';
  switch(e.archetype){
    case 'smart': next = !e.analyzedPlayer ? 'observe' : (chance(0.35) ? 'status' : 'attack'); break;
    case 'desperate': next = (!e.usedDesperate && e.hp < e.maxHp*0.35) ? 'desperate' : 'attack'; break;
    case 'creature': next = wpick(['attack','scream','vanish','regen','move'], x=>({attack:40, scream:20, vanish:15, regen:15, move:10})[x]); break;
    default: next = (e.talk > 0 && e.hp < e.maxHp*0.3 && chance(0.35)) ? 'surrender' : 'attack';
  }
  if(hasStatus(e.statuses, 'furioso')) next = 'attack';
  e.next = next;
}
function intentText(){
  const cb = STATE.combat; if(!cb) return '';
  const e = cb.enemy;
  const clear = cb.info.stage >= 2 || (pathwayMods().perception||0) >= 2 || e.archetype==='human';
  if(!clear) return 'No sabés qué va a hacer.';
  return {attack:'Parece que va a atacar.', observe:'Te estudia, sin atacar todavía.', status:'Prepara algo que no es un golpe.', desperate:'Tiene la mirada de alguien que ya no tiene nada que perder.',
    scream:'Abre algo que podría ser una boca.', vanish:'Su contorno empieza a desdibujarse.', regen:'Sus heridas se mueven.', move:'Se desplaza de una forma que no debería poder.', surrender:'Duda. Mira hacia la salida.'}[e.next] || '';
}
function enemyTurn(incoming, negate){
  const cb = STATE.combat, e = cb.enemy, c = STATE.character, log = cb.log;
  if(hasStatus(e.statuses, 'aturdido') || hasStatus(e.statuses, 'dormido')){ log.push(`${e.name} no puede moverse.`); enemyChooseNext(); return; }
  if(negate){ log.push(`Lográs esquivar por completo lo que venía de ${e.name}.`); enemyChooseNext(); return; }
  const act = e.next || 'attack';
  const hit = (mult)=>{
    if(cb.distance >= 2 && e.archetype !== 'creature' && !e.pathway){ log.push(`${e.name} no llega a alcanzarte.`); return 0; }
    let raw = rndInt(e.dmg[0], e.dmg[1]) * mult * incoming * statusMult(e.statuses, 'dmgMult') * statusMult(cb.player.statuses, 'dmgTaken');
    if(e.analyzedPlayer) raw *= 1.2;
    if(e.tier==='mystic' && artifactActiveEffect('ward')) raw *= 0.5;
    const d = Math.max(0, Math.round(raw) - Math.floor(c.spirituality/40));
    if(d > 0){ applyEffects({salud:-d}); cb.player.dmgTaken += d; }
    return d;
  };
  const mental = (mult)=>{
    if(e.sanityDmg[1] > 0 && chance(0.7)){ const sd = Math.round(rndInt(e.sanityDmg[0], e.sanityDmg[1])*mult); if(sd>0){ applyEffects({sanity:-sd}); log.push('Lo que ves te deja perturbado.'); } }
    if(e.corruptionDmg[1] > 0 && chance(0.4)){ const cd = rndInt(e.corruptionDmg[0], e.corruptionDmg[1]); if(cd>0){ applyEffects({corruption:cd}); log.push('Algo de esa presencia se te queda pegado.'); } }
  };
  switch(act){
    case 'observe':
      e.analyzedPlayer = true; log.push(`${e.name} no ataca: te observa, midiendo cada movimiento.`); break;
    case 'status': {
      const d = hit(0.8); const st = pick(['marcado','debilitado','aturdido','confundido']);
      addStatus(cb.player.statuses, st); log.push(`${e.name} te alcanza con algo extraño${d?' (-'+d+' salud)':''}: quedás ${STATUSES[st].label.toLowerCase()}.`); mental(0.6); break; }
    case 'desperate': {
      e.usedDesperate = true;
      const r = Math.random();
      if(r < 0.45){ const d = hit(1.6); e.hp = 0; log.push(`${e.name} hace algo desesperado: se destroza a sí mismo para alcanzarte${d?' (-'+d+' salud)':''}.`); cb.enemySelfDestroyed = true; }
      else if(r < 0.75){ e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp*0.3)); e.dmg = [Math.round(e.dmg[0]*1.3), Math.round(e.dmg[1]*1.4)]; log.push(`${e.name} se transforma. Lo que queda ya no suplica: ataca.`); }
      else { e.hp = 0; cb.enemySuicide = true; log.push(`${e.name} se lleva algo a la boca antes de que puedas impedirlo. No va a hablar. No va a hablar nunca.`); }
      break; }
    case 'scream': mental(1.5); log.push(`${e.name} emite algo que tu cabeza se niega a llamar sonido.`); break;
    case 'vanish': addStatus(e.statuses, 'oculto', 1); log.push(`${e.name} se desvanece a medias.`); break;
    case 'regen': { const h = Math.round(e.maxHp*0.1); e.hp = Math.min(e.maxHp, e.hp + h); log.push(`Las heridas de ${e.name} se cierran solas.`); break; }
    case 'move': cb.distance = pick([0,2]); log.push(`${e.name} ${cb.distance===0 ? 'aparece de golpe frente a vos' : 'se aleja de una forma imposible'}.`); break;
    case 'surrender': log.push(`${e.name} levanta las manos: se rinde.`); cb.surrendered = true; break;
    default: {
      const d = hit(1);
      log.push(d > 0 ? `${e.name} te golpea: -${d} salud.` : `${e.name} ataca, pero apenas te roza.`);
      mental(1);
    }
  }
  if(e.hp <= 0){ endCombat('victory'); return; }
  if(cb.surrendered){ endCombat('surrender'); return; }
  enemyChooseNext();
}

/* ------------------------------ información del rival (§25) ------------------------------ */
function infoLine(){
  const cb = STATE.combat; if(!cb) return '';
  const e = cb.enemy;
  if(e.tier !== 'mystic') return '';
  const st = cb.info.stage;
  if(e.seq === null) return st >= 1 ? 'No es un Beyonder convencional.' : 'Sequence: ???';
  if(st === 0) return 'Sequence: ???';
  if(st === 1) return `Rango posible: Sequence ${cb.info.range[0]}–${cb.info.range[1]}`;
  if(st === 2) return `Sequence estimada: ${cb.info.estimate}`;
  return `Sequence ${e.seq}${e.pathway && isIdentified(e.pathway) ? ' — '+PATHWAYS[e.pathway].name : ''}`;
}
// Lectura del riesgo con la información que el jugador tiene (nada más).
function combatThreat(){
  const cb = STATE.combat; if(!cb) return null;
  const e = cb.enemy, c = STATE.character;
  const myAvg = Math.max(1, playerCombatPower(6.5) - e.defense);
  const toWin = Math.ceil(Math.max(0,e.hp)/myAvg);
  const eAvg = Math.max(0.5, (e.dmg[0]+e.dmg[1])/2 - Math.floor(c.spirituality/40));
  const toLose = Math.max(1, Math.floor(c.salud/eAvg));
  let level = toLose > toWin*2 ? 0 : toLose >= toWin ? 1 : 2;
  const known = cb.info.stage >= 3 || (cb.info.stage === 2 && cb.info.estimate !== null);
  if(known && e.seq !== null){ const mine = STATE.pathway.chosenPathway ? STATE.pathway.sequence : 10; const s = cb.info.stage>=3 ? e.seq : cb.info.estimate; if(s < mine) level = Math.min(2, level+1); }
  const labels = ['Parejo','Peligroso','Letal'];
  const notes = ['Por lo que ves, podés con esto.','Esto puede salir mal. Cada turno cuenta.','Todo indica que esto te supera. Huir no es cobardía.'];
  return {level, label:labels[level], note:notes[level], seqKnown:known};
}

/* ------------------------------ final del combate ------------------------------ */
function endCombat(result){
  const cb = STATE.combat; const e = cb.enemy, c = STATE.character;
  const taken = cb.player.dmgTaken;
  // Heridas que quedan (§24).
  if(result !== 'death'){
    if(taken >= 40) addWound('grave'); else if(taken >= 25) addWound(chance(0.5)?'fractura':'corte'); else if(taken >= 12 && chance(0.5)) addWound('leve');
    if(e.archetype === 'creature' && taken >= 10 && chance(0.25)) addWound('mordida');
  }
  if(cb.player.usedPowers && cb.witnesses){
    raiseAttention(rndInt(4,8));
    const n = pick(closeNpcs()); if(n && chance(0.3)){ adjustRel(n, {suspicion:[6,12]}); }
    logJournal('Hubo testigos', 'Alguien vio lo que hiciste. En unos días, el barrio entero va a tener su versión.', {cat:'combat', imp:1});
  }
  STATE.combat = null;
  if(result === 'death'){
    const title = e.tier==='mystic' && e.humanoid ? 'Asesinado por un Beyonder' : e.tier==='mystic' ? 'Consumido por lo desconocido' : 'Muerte violenta';
    const text = e.tier==='mystic' && e.humanoid ? `${c.nombre} ${c.apellido} no sobrevive al encuentro con ${e.name}. Era demasiado para cualquier persona.`
      : e.tier==='mystic' ? `${c.nombre} ${c.apellido} no sobrevive al encuentro con ${e.name}. No era humano, y no tenía intención de dejarlo con vida.`
      : `${c.nombre} ${c.apellido} no sobrevive al encuentro con ${e.name}. La violencia de la calle no perdona.`;
    endGame('negative', title, text, {cause:'combate', enemy:e.name});
    return;
  }
  if(result === 'fled'){
    c.stats.combatsFled++;
    logJournal('Huida', `Escapás de ${e.name} sin mirar atrás.`, {cat:'combat', imp:1});
    setResolution('Huiste', `Escapás de ${e.name} sin mirar atrás.`, []);
    if(e.faction) factionAdjust(e.faction, {suspicion:4}, true);
    saveGame(true); renderAll(); return;
  }
  if(result === 'peace'){
    logJournal('Sin sangre', `La pelea con ${e.name} termina sin que nadie caiga.`, {cat:'combat', imp:1});
    setResolution('Sin sangre', `La pelea con ${e.name} termina con palabras.`, []);
    saveGame(true); renderAll(); return;
  }
  // Victoria (o rendición).
  c.stats.combatsWon++;
  const rw = e.reward || {};
  const eff = {};
  const cash = rw.cash ? (Array.isArray(rw.cash) ? rndInt(rw.cash[0], rw.cash[1]) : rw.cash) : 0;
  const bonus = cb.opts.bonusCash ? rndInt(cb.opts.bonusCash[0], cb.opts.bonusCash[1]) : 0;
  if(cash + bonus > 0) eff.cash = cash + bonus;
  if(rw.clue) eff.clue = {pathway: e.pathway || (rw.clueBias ? pick(rw.clueBias) : '$random'), reliability:'real', strength:[Math.round(rw.clue/3), Math.round(rw.clue/2)], source:e.name};
  const ch = applyEffects(eff);
  const text = `Vencés a ${e.name}. ${cash+bonus>0 ? 'Conseguís '+fmtMoney(cash+bonus)+' entre sus pertenencias.' : ''}`.trim();
  logJournal('Combate — victoria', text, {cat:'combat', imp:2});
  // Un Beyonder vencido (o que se rinde): decidir qué hacer con él (§24).
  if(e.seq !== null && e.humanoid && !cb.enemySuicide && !cb.enemySelfDestroyed){
    STATE.pendingEvent = {kind:'combat_after', title:`${e.name}, en el suelo`, text:`${e.name} está vencido, respirando apenas. Lo que hagas ahora no lo va a ver nadie más.`,
      enemy:{name:e.name, seq:e.seq, pathway:e.pathway, faction:e.faction, reward:rw},
      choices:[{idx:0, label:'Rematarlo', small:'Lo que tiene adentro podría servirte. Él no te lo perdonaría.'},
               {idx:1, label:'Dejarlo ir', small:'Ya ganaste.'},
               {idx:2, label:'Entregarlo a quien corresponda', small: memberFactions().length ? `A ${factionShort(memberFactions()[0])}.` : 'A la Iglesia.'}]};
  } else if(cb.surrendered){
    setResolution('Se rinde', `${e.name} se rinde y se va corriendo. ${text}`, ch);
  } else {
    setResolution('Victoria', text, ch);
  }
  saveGame(true); renderAll();
}
function resolveCombatAftermath(idx){
  const pe = STATE.pendingEvent; const e = pe.enemy; const c = STATE.character;
  STATE.pendingEvent = null;
  let text = '';
  if(idx === 0){
    c.stats.killed++;
    applyEffects({corruption:[1,4], humanity:-3, sanity:[-6,-2]});
    remember('killed_beyonder', `Remataste a ${e.name}.`, {cat:'trauma'});
    if(e.pathway && chance(e.reward.characteristic || 0.3)){ addCharacteristic(e.pathway, e.seq, `lo que quedó de ${e.name}`); text = 'Cuando se queda quieto, algo se condensa en el lugar donde estaba su corazón: una Característica Beyonder. Todavía está tibia.'; }
    else text = 'Se queda quieto. No sentís lo que esperabas sentir.';
    if(e.faction){ factionAdjust(e.faction, {suspicion:20}); if(chance(0.5)) markHunted(e.faction, 'mató a uno de los suyos'); }
    if(chance(0.25)) addHiddenTruth(`${e.name} tenía familia. Su hija todavía lo espera.`);
  } else if(idx === 1){
    c.stats.spared++;
    remember('spared', `Dejaste ir a ${e.name}.`, {cat:'choice'});
    applyEffects({sanity:[1,3]});
    if(chance(0.5)) scheduleConsequence({inMonths:[12,60], title:`${e.name} vuelve`, text:`${e.name}, a quien dejaste ir hace años, aparece. Esta vez con algo en la mano: un sobre con información que no sabías que necesitabas.`,
      effect:{clue:{pathway:e.pathway||'$random', reliability:'real', strength:[5,10], source:e.name}, cash:[50,200]}, memory:{tag:'spared_returned', text:`${e.name} te devolvió la vida que le dejaste.`, cat:'favor_received'}});
    else scheduleConsequence({inMonths:[8,40], title:'Una deuda de sangre', text:`${e.name}, a quien dejaste ir, no lo tomó como un favor.`, eventId:null, effect:{attention:5}, memory:{tag:'spared_vengeful', text:`${e.name} volvió a buscarte.`, cat:'person'}});
    text = 'Te vas. Detrás tuyo, escuchás cómo se levanta, despacio, y se va en la otra dirección.';
  } else {
    const f = memberFactions()[0] || 'church';
    factionMeet(f); factionAdjust(f, {merit:6, trust:6, publicRep:3});
    remember('handed_over', `Entregaste a ${e.name} a ${factionName(f)}.`, {cat:'organization', faction:f});
    if(e.pathway && chance(0.3)) addCharacteristic(e.pathway, e.seq, `un reconocimiento de ${factionName(f)}`);
    text = `${cap(factionShort(f))} se lo lleva. Nadie te explica qué van a hacer con él. Te lo agradecen.`;
  }
  logJournal('Después del combate', text, {cat:'combat', imp:2});
  setResolution('Después del combate', text, []);
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
