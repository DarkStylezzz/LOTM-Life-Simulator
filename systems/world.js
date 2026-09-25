'use strict';
/* =========================================================================
   systems/world.js — el mundo vivo (§17, §29, §30, §43).
   Ciudades con su propia prosperidad y seguridad que se mueven solas; la
   atención del mundo oculto sobre vos; la amenaza de lo que no es humano;
   y la línea temporal: acontecimientos históricos que llegan en su fecha,
   que en modo Canon ocurren pase lo que pase y en Línea alternativa pueden
   torcerse por lo que hiciste.
   ========================================================================= */
function currentCityKey(){ return cityKeyByName(STATE.character.ciudad); }
function currentCity(){ return CITIES_DATA[currentCityKey()] || CITIES_DATA.menor; }
function currentCityState(){
  const k = currentCityKey();
  if(!STATE.world.cities) STATE.world.cities = buildCitiesState();
  if(!STATE.world.cities[k]) STATE.world.cities[k] = {prosperity:CITIES_DATA[k].prosperity, security:CITIES_DATA[k].security};
  return STATE.world.cities[k];
}
function cityAdjust(key, deltas){
  const cs = STATE.world.cities && STATE.world.cities[key];
  if(!cs) return;
  if(deltas.prosperity) cs.prosperity = clamp(cs.prosperity + deltas.prosperity, 0, 100);
  if(deltas.security)   cs.security   = clamp(cs.security   + deltas.security,   0, 100);
  if(key === currentCityKey()){ STATE.world.prosperity = cs.prosperity; STATE.world.security = cs.security; }
}
// Compatibilidad con la API anterior (worldAdjust sobre la ciudad actual).
function worldAdjust(deltas){
  cityAdjust(currentCityKey(), deltas);
  if(deltas.attention) raiseAttention(deltas.attention);
}
function logWorld(text, city){
  const w = STATE.world;
  w.log.unshift({year: calendarYear(), cy: calendarYear(), text, city: city||currentCityKey()});
  if(w.log.length > 20) w.log.pop();
}
function worldIncomeMult(){ return 0.8 + (currentCityState().prosperity/250); }
function worldDangerMult(){ return 1.35 - (currentCityState().security/150); }

// Atención del mundo oculto (§17). Sube por usar poderes, investigar,
// tratar con facciones, usar artefactos o dejar testigos. Baja si vivís
// tranquilo. Habilidades de sigilo la amortiguan.
function raiseAttention(n){
  if(!n) return;
  if(n > 0){ n = n * diffMult('attention') * (1 - clamp(pathwayMods().stealth||0, 0, 0.6)); }
  STATE.world.attention = clamp((STATE.world.attention||0) + n, 0, 100);
}
function worldAttentionPressure(){
  const a = STATE.world.attention || 0;
  if(a < 40 || !chance(0.12)) return;
  const vivos = aliveNpcs().filter(n=>n.met && n.lifeState==='presente');
  if(!vivos.length) return;
  adjustRel(pick(vivos), {suspicion:rndInt(3,9)});
  // Con mucha atención, alguna facción empieza a investigarte de verdad.
  if(a >= 55 && chance(0.2)){ const f = factionThatNotices(); if(f) factionAdjust(f, {suspicion:rndInt(2,5)}, true); }
}

/* ------------------------------ tick del mundo (por temporada) ------------------------------ */
function worldTick(){
  if(STATE.gameOver || !STATE.world) return;
  // Las ciudades vuelven lentamente hacia su "normal".
  CITY_KEYS.forEach(k=>{
    const cs = STATE.world.cities[k], d = CITIES_DATA[k];
    cs.prosperity += Math.sign(d.prosperity - cs.prosperity) * (chance(0.5)?1:0);
    cs.security += Math.sign(d.security - cs.security) * (chance(0.5)?1:0);
    if(STATE.world.war){ cs.prosperity = clamp(cs.prosperity - (chance(0.3)?1:0), 0, 100); }
  });
  // Un acontecimiento: 60% en tu ciudad, el resto en otra (te enterás igual).
  const city = chance(0.6) ? currentCityKey() : pick(CITY_KEYS);
  const eligible = WORLD_EVENTS.filter(e=>!e.req || e.req());
  const ev = weightedPick(eligible);
  if(ev){
    const text = ev.run(city);
    const here = city === currentCityKey();
    const shown = here ? text : `En ${CITIES_DATA[city].name}: ${text.charAt(0).toLowerCase()+text.slice(1)}`;
    logWorld(shown, city);
    logJournal('El mundo sigue su curso', shown, {cat:'world', imp:0});
  }
  // La atención baja sola si no hacés ruido; una facción investigando la sostiene.
  const investigando = Object.values(STATE.world.factionMood).some(m=>m==='investigando');
  raiseAttention(investigando ? -1 : -3);
  STATE.world.threat = Math.max(0, (STATE.world.threat||0) - 1);
  const cs = currentCityState(); STATE.world.prosperity = cs.prosperity; STATE.world.security = cs.security;
}
// Un NPC del mundo (no necesariamente conocido) sufre las consecuencias de
// un acontecimiento: desaparece, lo mata una secta, cae en una operación.
function worldNpcRumor(city, kind, faction){
  if(city !== currentCityKey()) return;
  const pool = aliveNpcs().filter(n=>n.lifeState==='presente' && !isFamilyNpc(n) && n.id!=='extraño');
  if(kind === 'missing' && chance(0.25) && pool.length){
    const n = pick(pool); n.lifeState = 'desaparecido';
    addHiddenTruth(`${n.name} desapareció en la misma semana que tantos otros cerca del puerto. Nunca se supo más.`, {npc:n.id});
    if(n.met) logJournal(`${n.name} no aparece`, `Nadie sabe nada de ${n.name}. Hay carteles con su cara en las paredes del barrio.`, {cat:'relation', imp:1});
  }
  if(kind === 'cult' && chance(0.15) && pool.length){
    const n = pick(pool); npcDies(n, 'un ataque de la Aurora', `${n.name} muere en el incendio de un orfanato donde trabajaba de voluntario.`);
  }
  if(kind === 'faction_death' && faction){
    const n = aliveNpcs().find(x=>x.hidden.faction===faction && x.lifeState==='presente');
    if(n && chance(0.4)) npcDies(n, 'una operación que nadie explica', `${n.name} muere "en un accidente de trabajo". El ataúd llega cerrado.`);
  }
}

/* ------------------------------ mudarse de ciudad ------------------------------ */
function moveToCity(key){
  if(timeBlocked()) return;
  const c = STATE.character;
  if(!CITIES_DATA[key] || key === currentCityKey()) return;
  if(c.edad < 18){ toast('Todavía no podés mudarte por tu cuenta.', 'neg'); return; }
  const cost = Math.round(120 * CITIES_DATA[key].cost * priceIndex());
  if(c.cash < cost){ toast(`Mudarte cuesta alrededor de ${fmtMoney(cost)}.`, 'neg'); return; }
  if(!spendFreeTime(2, true)) return;
  applyEffects({cash:-cost, sanity:[-4,2]});
  const from = c.ciudad;
  c.ciudad = CITIES_DATA[key].name;
  // Los que no vienen con vos quedan "lejos". Tu pareja y tus hijos chicos vienen.
  STATE.npcs.forEach(n=>{
    if(!n.alive || n.lifeState==='desaparecido') return;
    const moves = n.id==='conyuge' || n.id==='pareja' || (n.id.startsWith('hijo') && npcAge(n) < 18);
    if(moves){ n.location = key; return; }
    if(n.lifeState === 'presente'){ n.lifeState = 'lejos'; }
    if(n.location === key && n.lifeState === 'lejos') n.lifeState = 'presente';
  });
  if(c.vivienda && c.vivienda.city && c.vivienda.city !== key){ c.properties = (c.properties||[]).concat([{valor:c.vivienda.valor, city:c.vivienda.city, since:calendarYear()}]); c.vivienda = null; }
  if(isEmployed() && !(JOBS[c.profesion].port && !CITIES_DATA[key].port)) jobPerformance(-10);
  else if(isEmployed()) c.profesion = 'Desempleado';
  // Mudarte enfría el rastro que dejaste (un poco).
  STATE.world.attention = Math.round((STATE.world.attention||0) * 0.6);
  Object.keys(STATE.factions).forEach(f=>{ STATE.factions[f].suspicion = Math.round(STATE.factions[f].suspicion * 0.75); });
  const text = `Dejás ${from} y te instalás en ${c.ciudad}. ${CITIES_DATA[key].desc}`;
  logJournal('Mudanza', text, {cat:'life', imp:2});
  remember('moved_'+key, `Te mudaste a ${c.ciudad}.`, {cat:'place'});
  addMilestone('world', `Se muda a ${c.ciudad}`);
  setResolution('Una ciudad nueva', text, []);
  saveGame(true); renderAll();
}

/* ------------------------------ línea temporal (§30, §31) ------------------------------ */
function buildTimeline(){
  const mode = STATE.settings.world || 'libre';
  const start = STATE.time.startYear;
  const tl = [];
  if(mode === 'canon' || mode === 'alternate'){
    CANON_TIMELINE.forEach(e=>{
      if(e.year < start) return;
      tl.push({id:e.id, date:{y:e.year, m:e.month}, city:e.city||null, importance:e.importance, possible:true, triggered:false, altered:false, consequences:[], canon:true});
    });
  } else {
    // Mundo libre: una historia propia sorteada para esta vida.
    const n = rndInt(4,7);
    sample(RANDOM_HISTORY, n).forEach(t=>{
      const y = start + rndInt(10, 75), m = rndInt(1,12);
      const city = pick(CITY_KEYS);
      tl.push({id:t.id+'_'+y, tpl:t.id, date:{y, m}, city, importance:t.importance, possible:true, triggered:false, altered:false, consequences:[], canon:false});
    });
    tl.sort((a,b)=> a.date.y - b.date.y || a.date.m - b.date.m);
  }
  STATE.world.timeline = tl;
}
function timelineDef(entry){
  if(entry.canon) return CANON_TIMELINE.find(e=>e.id===entry.id);
  const t = RANDOM_HISTORY.find(e=>e.id===entry.tpl);
  if(!t) return null;
  const cname = entry.city ? CITIES_DATA[entry.city].name : 'la ciudad';
  return Object.assign({}, t, {title:t.title.replace('{city}', cname), text:t.text.replace(/\{city\}/g, cname), city:entry.city});
}
function setWorldFlag(name, val){ STATE.world.flags = STATE.world.flags || {}; STATE.world.flags[name] = val; }
function worldFlag(name){ return !!(STATE.world.flags && STATE.world.flags[name]); }
function timelineTick(){
  const tl = STATE.world.timeline || [];
  const y = calendarYear(), m = STATE.time.month;
  for(const e of tl){
    const def = timelineDef(e);
    if(!def) continue;
    // Ganchos previos: algunos acontecimientos te dan la chance de estar ahí antes.
    if(def.hookBefore && !e.hooked && !e.triggered){
      const due = (e.date.y*12 + e.date.m) - def.hookBefore.months;
      if(y*12+m >= due && (!def.hookBefore.city || currentCityKey()===def.hookBefore.city) && STATE.character.edad >= 16){
        e.hooked = true;
        scheduleConsequence({inMonths:rndInt(1,4), eventId:def.hookBefore.event});
      }
    }
    if(e.triggered) continue;
    if(e.date.y > y || (e.date.y === y && e.date.m > m)) continue;
    e.triggered = true;
    e.witnessed = !!(def.city && def.city === currentCityKey());
    // ¿La historia se torció? Sólo en Línea alternativa.
    const altered = STATE.settings.world === 'alternate' && def.alterFlag && worldFlag(def.alterFlag);
    e.altered = !!altered;
    const eff = altered ? (def.altEffect||{}) : (def.effect||{});
    applyTimelineEffect(eff, def);
    const text = altered ? def.altText : def.text;
    e.consequences.push(text);
    logWorld(text, def.city);
    logJournal(def.title + (altered ? ' (alterado)' : ''), text, {cat:'world', imp: def.importance>=3 ? 3 : 2});
    if(def.importance >= 3) addMilestone('world', def.title + (altered ? ' — de otra manera' : ''));
    if(altered){ remember('altered_'+e.id, `La historia cambió por algo que hiciste: ${def.title}.`, {cat:'achievement'}); }
    STATE._importantMoment = STATE._importantMoment || def.importance >= 3 || (def.city && def.city===currentCityKey());
  }
}
function applyTimelineEffect(eff, def){
  if(eff.city) for(const k in eff.city) cityAdjust(k, eff.city[k]);
  if(eff.cityVar && def.city) cityAdjust(def.city, eff.cityVar);
  if(eff.allCities) CITY_KEYS.forEach(k=>cityAdjust(k, eff.allCities));
  if(eff.faction) for(const f in eff.faction){ if(eff.faction[f].strength) factionStrength(f, eff.faction[f].strength); }
  if(eff.mood) for(const f in eff.mood) factionMood(f, eff.mood[f]);
  if(eff.war !== undefined) STATE.world.war = eff.war;
  if(eff.endsAfter){ scheduleConsequence({inMonths:eff.endsAfter, title:'La paz', text:'La guerra termina tan de repente como empezó. Nadie sabe bien quién ganó.', effect:{world:{prosperity:4, security:5}}}); STATE.world.war = true; }
  if(eff.mysticBoost) STATE.world.mysticBoost = (STATE.world.mysticBoost||0) + eff.mysticBoost;
  if(eff.bankHit && STATE.character.bank > 0 && chance(0.5)){ const lost = Math.round(STATE.character.bank*eff.bankHit); STATE.character.bank -= lost; logJournal('Tus ahorros', `El banco devuelve sólo una parte de tus ahorros. Perdés ${fmtMoney(lost)}.`, {cat:'life', imp:2}); }
  const here = (def.city || null) === currentCityKey() || eff.allCities;
  const killCity = eff.killsInCity || (eff.killsInCityVar ? def.city : null);
  if(killCity && killCity === currentCityKey()){
    const pool = aliveNpcs().filter(n=>n.lifeState==='presente' && n.met && !['padre','madre'].includes(n.id));
    if(pool.length && chance(0.5)) npcDies(pick(pool), def.title.toLowerCase(), null);
  }
  if(eff.playerHarm && here) applyEffects(eff.playerHarm);
  // Guerra: los adultos jóvenes pueden ser llamados a filas.
  if(eff.war && STATE.character.edad >= 18 && STATE.character.edad <= 40 && chance(0.4)){
    scheduleConsequence({inMonths:rndInt(1,4), title:'La conscripción', text:'Te llega la carta con el sello del ejército. Dos años de uniforme, barro y cosas que no se cuentan después.',
      effect:{salud:[-15,-5], sanity:[-15,-6], reputation:[2,6]}, memory:{tag:'war_veteran', text:'Fuiste a la guerra.', cat:'trauma'}});
  }
}

/* ------------------------------ desaparecer ------------------------------ */
// Cuando el mundo oculto se cierra encima, una salida posible es irse para
// siempre: otro nombre, otro país, nadie que sepa quién fuiste. Es un final.
function canDisappear(){
  if(STATE.character.edad < 18 || STATE.gameOver) return false;
  return huntingFactions().length > 0 || (STATE.world.attention||0) >= 60 || maxFactionSuspicion() >= 70;
}
function disappear(){
  if(timeBlocked() || !canDisappear()) return;
  const c = STATE.character;
  const left = spouseNpc() || childrenNpcs().find(k=>k.alive) || aliveNpcs().filter(n=>n.met).sort((a,b)=>bondScore(b)-bondScore(a))[0];
  const hunters = huntingFactions();
  const text = `Una mañana, ${c.nombre} ${c.apellido} no vuelve. ${left ? `Deja una carta para ${left.name} que no explica nada y lo explica todo.` : 'No deja nada.'} ${hunters.length ? `${cap(factionShort(hunters[0]))} lo sigue buscando durante años.`.replace(' lo sigue', gx(' lo sigue',' la sigue',' le sigue')) : 'Nadie lo busca demasiado.'.replace('lo busca', gx('lo busca','la busca','le busca'))} En algún puerto lejano, alguien con otro nombre empieza de nuevo.`;
  remember('disappeared', 'Desapareciste.', {cat:'choice'});
  endGame('special', 'Desaparecer', text, {cause:'desaparecido'});
}
