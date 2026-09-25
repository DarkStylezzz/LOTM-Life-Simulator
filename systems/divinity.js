'use strict';
/* =========================================================================
   systems/divinity.js — Sequence 0 (§22).
   1) El camino: una cadena de acontecimientos extraordinarios que empieza
      años después de llegar a la Sequence 1 (data/events/divinity.js).
   2) El ascenso: una escena de cinco pasos, más larga y más cara que
      cualquier ritual, donde lo que elegís conservar define qué clase de
      dios vas a ser (o si el trono te acepta).
   3) El modo divino: cambia la interfaz y la forma de jugar. Ya no hay
      trabajo ni plata; el tiempo se mide en años; las personas que
      conociste envejecen y mueren mientras las mirás desde lejos; la
      humanidad es lo único que podés perder. La historia termina cuando
      vos decidís cerrar los ojos... o cuando ya no queda nadie adentro.
   ========================================================================= */
const DIVINITY_CHAR_REQ = 2;
const DIVINE_TYPE_LABEL = {benevolent:'Un dios que recuerda', self:'Un dios con nombre', distant:'Un dios lejano', dark:'Un dios con una firma ajena'};

function D(){ return STATE.divinity || (STATE.divinity = {stage:0, ascended:false, uniqueness:false, characteristics:0, prayersAnswered:0, domainActs:0}); }
function divinityCharacteristics(){
  const pw = STATE.pathway.chosenPathway;
  return itemsByCat('characteristic').filter(it=>it.pathway===pw && it.seq <= 2).reduce((s,it)=>s+(it.qty||1), 0);
}
function monthsAtSeq1(){ const d = D(); return d.seq1Since !== undefined && d.seq1Since !== null ? STATE.time.totalMonths - d.seq1Since : 0; }
function divinityRequirements(){
  const d = D();
  recomputeAnchors();
  const n = divinityCharacteristics();
  return [
    {label:'Aceptar el llamado del trono', ok: d.stage >= 1},
    {label:'Encontrar la Unicidad de tu vía', ok: d.stage >= 2},
    {label:'Resolver qué pasa con el otro heredero', ok: d.stage >= 3},
    {label:'Sobrevivir a lo que mira desde afuera', ok: d.stage >= 4},
    {label:`Reunir las Características de los ángeles de tu vía (${Math.min(n,DIVINITY_CHAR_REQ)}/${DIVINITY_CHAR_REQ})`, ok: n >= DIVINITY_CHAR_REQ},
    {label:'Que otros crean en vos', ok: STATE.anchors.belief >= 40},
    {label:'Años de preparación como Sequence 1', ok: monthsAtSeq1() >= 120}
  ];
}
function divinityReady(){ const d = D(); return !d.renounced && !d.ascended && divinityRequirements().every(r=>r.ok); }
function divinityVisible(){ const d = D(); return STATE.pathway.chosenPathway && STATE.pathway.sequence <= 1 && (d.stage >= 1 || d.renounced || d.ascended); }

// Cada mes (fuera del modo divino).
function divinityTick(){
  const p = STATE.pathway, d = D();
  if(d.ascended || d.renounced || !p.chosenPathway || p.sequence !== 1) return;
  if(d.seq1Since === undefined || d.seq1Since === null) d.seq1Since = STATE.time.totalMonths;
  if(STATE.pendingEvent || STATE.combat || STATE.pendingMission) return;
  const now = STATE.time.totalMonths;
  if(d.stage === 0){
    if(monthsAtSeq1() >= 12 && (!d.delayUntil || now >= d.delayUntil) && p.digestion >= 40 && chance(0.12)) triggerEventById('div_call');
    return;
  }
  if(d.stage === 2){
    if(STATE.flags.divRivalWin !== undefined){
      delete STATE.flags.divRivalWin; d.stage = 3;
      remember('div_rival_beaten', 'Venciste al otro heredero.', {cat:'achievement'});
      scheduleConsequence({inMonths:[6,14], eventId:'div_entities'});
    } else if(STATE.flags.divRivalFled !== undefined){
      delete STATE.flags.divRivalFled;
      logJournal('El otro heredero', 'Huiste. Él se quedó cerca de la Unicidad. Va a pasar tiempo hasta que vuelva a haber una oportunidad.', {cat:'pathway', imp:2});
      scheduleConsequence({inMonths:[18,30], eventId:'div_rival'});
    }
  }
  if(d.stage === 4){
    if(STATE.flags.divHuntWin !== undefined) delete STATE.flags.divHuntWin;
    if(divinityCharacteristics() >= DIVINITY_CHAR_REQ){
      d.stage = 5;
      logJournal('Todo en su lugar', 'Tenés la Unicidad al alcance y las Características que hacían falta. Sólo quedan el tiempo, la creencia de otros, y vos.', {cat:'pathway', imp:3});
      STATE._importantMoment = true;
    } else {
      const last = (STATE.eventHistory.div_characteristics||{last:-9999}).last;
      const scheduled = STATE.pendingConsequences.some(pc=>pc.eventId==='div_characteristics');
      if(!scheduled && !(d.waitUntil > now) && now - last >= 18) triggerEventById('div_characteristics');
    }
  }
}

/* ------------------------------ el ascenso ------------------------------ */
function startAscension(){
  if(timeBlocked()) return;
  if(!divinityReady()){ toast('El trono todavía no te acepta.', 'neg'); return; }
  spendFreeTime(Math.max(1, freeTimeLeft()), true); markMysticAct();
  D().asc = {step:0, acc:0, place:null, keep:null, bargain:false, fight:null};
  openDivinityStep();
  saveGame(true); renderAll();
}
function divinitySteps(){
  const d = D(), asc = d.asc, c = STATE.character, pw = PATHWAYS[STATE.pathway.chosenPathway];
  const steps = [];
  const places = [];
  if(STATE.tarot.stage >= 7) places.push({label:'Sobre la niebla gris', small:'Nada de este mundo puede interrumpirte ahí. Alguien más sí.', v:6, place:'fog'});
  places.push({label:`En ${currentCity().name}`, small:'Tu gente cerca. Tu gente en peligro.', v:3, place:'city'});
  places.push({label:'En alta mar, lejos de todos', small:'Nadie va a salir herido. Nadie va a ayudarte.', v:0, place:'sea'});
  if((STATE.lore.entity||[]).length) places.push({label:'En las ruinas donde durmió la Unicidad', small:'Un lugar que ya conoce tu vía.', v:4, place:'ruins'});
  steps.push({title:'El mundo contiene el aliento', text:`Todo lo que hiciste durante años termina acá. El símbolo de tu vía —${pw.symbol}— arde en tu mente sin que lo dibujes. Hay que elegir dónde va a pasar.`, choices:places});
  const opp = d.churchRival ? factionName(d.churchRival) : 'Las Iglesias ortodoxas';
  steps.push({title:'Los que vienen a impedirlo', text:`${opp} ${d.churchRival ? 'sabe' : 'saben'} lo que estás por hacer. Un dios nuevo es una guerra nueva. Llegan antes de lo que esperabas.`, choices:[
    {label:'Enfrentarlos', small:'Con todo lo que sos.', v:'fight'},
    {label:'Esconder lo que está pasando', small:'Que lleguen tarde.', v:'hide'},
    {label:'Negociar', small:'Prometer algo que un dios va a tener que cumplir.', v:'bargain'}]});
  const anchorNpc = (STATE.anchors.people||[]).map(id=>npcById(id)).filter(n=>n && n.alive).sort((a,b)=>bondScore(b)-bondScore(a))[0];
  const keep = [];
  if(anchorNpc) keep.push({label:`El recuerdo de ${anchorNpc.name}`, small:'Una persona. Todo lo demás puede irse.', v:3, keep:'person:'+anchorNpc.id});
  keep.push({label:`Tu nombre: ${c.nombre} ${c.apellido}`, small:'Seguir sabiendo quién eras.', v:2, keep:'name'});
  keep.push({label:'Nada', small:'Un dios no necesita nada. Es más fácil así.', v:5, keep:'none'});
  steps.push({title:'Lo que vas a conservar', text:'El ascenso te va a vaciar. Todo lo humano se va a ir, menos una cosa, si la sostenés con fuerza. Tenés que elegir cuál.', choices:keep});
  const ch = [
    {label:'Entregarte a la Unicidad', small:'Dejar que te dé forma.', v:'surrender'},
    {label:'Sostenerte a vos mismo', small:'Depende de tu estabilidad.', v:'hold'}];
  if((STATE.anchors.people||[]).length >= 2) ch.push({label:'Sostenerte en los que te quieren', small:'Tus anclas cargan un pedazo del peso.', v:'share'});
  steps.push({title:'La Unicidad', text:'La vía entera entra en vos. No es dolor: es demasiado. Hay que hacer algo con eso, ya.', choices:ch});
  steps.push({title:'El trono', text:'Hay un trono. Hay un lugar vacío en él con tu forma exacta. ' + divinityOmen(), choices:[
    {label:'Sentarte', small:'Ya no hay vuelta atrás.', v:0},
    {label:'Sentarte recitando tu nombre', small:'Lo último humano que vas a hacer.', v:'name'}]});
  return steps;
}
function divinityScore(){
  const d = D(), asc = d.asc || {acc:0}, c = STATE.character, a = STATE.anchors;
  let s = 45 + clamp(asc.acc, -12, 16)*2.5 + (c.sanity-50)/4 - c.corruption/5 + a.anchorStrength/10 + a.belief/10 + (c.fate||0)/10 + (d.pact ? 8 : 0);
  return clamp(Math.round(s), 0, 100);
}
function divinityOmen(){
  const s = divinityScore();
  if(s >= 70) return 'Por primera vez en años, no tenés miedo.';
  if(s >= 50) return 'Algo resiste. No sabés si sos vos o el trono.';
  return 'Todo en vos grita que esto es un error.';
}
function openDivinityStep(){
  const asc = D().asc; const s = divinitySteps()[asc.step];
  STATE.pendingEvent = {kind:'divinity', step:asc.step, totalSteps:5, title:s.title, text:s.text, choices:s.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))};
  STATE._importantMoment = true;
}
function resolveDivinityChoice(idx){
  const d = D(), asc = d.asc;
  // Modo divino: los eventos "divine" se resuelven como eventos comunes.
  if(!asc){ STATE.pendingEvent = null; renderAll(); return; }
  const s = divinitySteps()[asc.step]; const ch = s && s.choices[idx];
  STATE.pendingEvent = null;
  if(!ch){ d.asc = null; renderAll(); return; }
  const c = STATE.character, pm = pathwayMods();
  let v = typeof ch.v === 'number' ? ch.v : 0;
  if(ch.place) asc.place = ch.place;
  if(ch.keep) asc.keep = ch.keep;
  if(ch.v === 'fight'){ const ok = chance(0.45 + (pm.combatPower||0)/60 + luckMod()); v = ok ? 4 : -3; asc.fight = ok ? 'won' : 'hurt'; if(!ok) applyEffects({salud:-30}); }
  if(ch.v === 'hide'){ const ok = chance(0.4 + (pm.stealth||0) + (pm.deception||0)); v = ok ? 3 : -2; asc.fight = ok ? 'hidden' : 'found'; }
  if(ch.v === 'bargain'){ v = 2; asc.bargain = true; }
  if(ch.v === 'surrender'){ v = 3; applyEffects({humanity:-30}); }
  if(ch.v === 'hold'){ recomputeAnchors(); const st = STATE.anchors.identityStability; v = st >= 60 ? 4 : st >= 40 ? 1 : -4; }
  if(ch.v === 'share'){ v = 3 + Math.round(STATE.anchors.anchorStrength/25); asc.shared = true; }
  if(ch.v === 'name') v = (c.humanity??100) >= 30 ? 2 : -1;
  asc.acc += v;
  asc.step++;
  if(asc.step < 5){ openDivinityStep(); saveGame(true); renderAll(); return; }
  resolveAscension();
}
function resolveAscension(){
  const d = D(), asc = d.asc, c = STATE.character, p = STATE.pathway;
  const score = divinityScore();
  d.asc = null;
  const pSucc = clamp(0.2 + (score-40)/75, 0.08, 0.9) / Math.max(1, diffMult('highSeq')*0.9);
  // Consecuencias para el mundo, pase lo que pase.
  CITY_KEYS.forEach(k=>cityAdjust(k, {security:-rndInt(6,14)}));
  if(asc.place === 'city'){
    cityAdjust(currentCityKey(), {prosperity:-25, security:-30});
    logWorld(`La noche en que algo se sentó en un trono, ${currentCity().name} ardió durante horas. Nadie sabe cuántos murieron.`);
    const victims = aliveNpcs().filter(n=>n.met && !isFamilyNpc(n) && n.lifeState==='presente' && !(asc.keep||'').endsWith(':'+n.id));
    if(victims.length && chance(0.5)){ const v = pick(victims); npcDies(v, 'la noche del trono', `${v.name} muere la noche del ascenso, en ${currentCity().name}. Nunca supo que eras vos.`); }
  } else if(asc.place === 'sea') logWorld('Durante una semana, en alta mar, los barcos evitan una zona donde el agua se queda quieta como un espejo.');
  else logWorld('En todo el continente, durante un segundo, las velas se inclinan hacia el mismo lado.');
  const opp = d.churchRival || 'church';
  if(asc.fight === 'won'){ factionStrength(opp, -20); F(opp).relationship = 'enemiga'; }
  FACTION_KEYS.forEach(k=>factionMood(k, 'investigando'));
  if(chance(pSucc)){
    p.sequence = 0; p.digestion = 0;
    d.ascended = true; d.ascendedAt = STATE.time.totalMonths; d.ascendedAge = c.edad; d.uniqueness = true;
    d.kept = asc.keep || 'none'; d.bargain = asc.bargain; d.place = asc.place;
    d.type = d.pact ? 'dark' : d.kept === 'none' ? 'distant' : d.kept === 'name' ? 'self' : 'benevolent';
    // Lo que el ascenso se lleva.
    const hum = d.kept === 'none' ? 5 : d.kept === 'name' ? Math.max(15, (c.humanity??100) - 25) : Math.max(20, (c.humanity??100) - 20);
    c.humanity = asc.shared ? Math.min(100, hum + 10) : hum;
    c.salud = 100; c.sanity = Math.max(c.sanity, 60); c.corruption = d.pact ? Math.max(c.corruption, 50) : Math.round(c.corruption/2);
    itemsByCat('characteristic').filter(it=>it.pathway===p.chosenPathway && it.seq<=2).forEach(it=>removeItem(it.uid, it.qty));
    // Quitar trabajo: un dios no ficha.
    if(isEmployed()) setJob('Desempleado');
    const nd = seqData(p.chosenPathway, 0);
    const text = `El trono te acepta. Sos ${nd ? nd.name : 'un Dios Verdadero'}. ` + ({benevolent:'Todavía recordás una cara. Es suficiente para seguir siendo alguien.', self:`Todavía sabés que te llamabas ${c.nombre}. Lo repetís, a veces, para no olvidarlo.`, distant:'No te queda nada humano adentro. Es extrañamente tranquilo.', dark:'Todo lo que sos lleva, en una esquina, una firma que no es tuya.'})[d.type];
    logJournal('SEQUENCE 0', text, {cat:'pathway', imp:3});
    addMilestone('advance', `Sequence 0 — ${nd ? nd.name : 'Dios Verdadero'}`);
    remember('ascended', 'Te sentaste en el trono de tu vía.', {cat:'achievement'});
    setResolution('Sequence 0', text, []);
    queueSeal({kind:'divine', key:p.chosenPathway});
    setWorldFlag('newGod', p.chosenPathway);
    STATE._importantMoment = true;
  } else {
    const r = Math.random() + (score-50)/200;
    if(r < 0.3){
      endGame('negative', 'Un trono que no te aceptó', `${c.nombre} ${c.apellido} llega hasta el trono y el trono no lo acepta. Lo que queda no alcanza para un cuerpo. En ${currentCity().name}, esa noche, una tormenta sin nubes.`, {cause:'ascenso'});
      return;
    }
    if(r < 0.55){
      endGame('negative', 'Loco al borde del trono', `${c.nombre} ${c.apellido} llega hasta el trono y no puede sostener lo que ve. Vive muchos años más, en algún lugar que las Iglesias no nombran, hablando con una voz que no es la suya.`, {cause:'locura'});
      return;
    }
    d.fallen = (d.fallen||0) + 1; d.stage = 1;
    applyEffects({sanity:-40, salud:-40, corruption:[8,15], humanity:-10});
    const cond = randomCondition('ritual'); if(cond) addCondition(cond);
    scheduleConsequence({inMonths:[60,120], eventId:'div_uniqueness'});
    const text = 'Caés. No hacia abajo: hacia atrás, hacia vos. El trono sigue vacío. La Unicidad se fue a otro lugar del mundo. Vas a tener que buscarla de nuevo, si todavía querés.';
    logJournal('EL ASCENSO FALLA', text, {cat:'pathway', imp:3});
    remember('ascension_failed', 'El trono no te aceptó. Sobreviviste.', {cat:'trauma'});
    setResolution('El ascenso falla', text, []);
  }
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}

/* ------------------------------ modo divino ------------------------------ */
function isDivine(){ return !!(STATE.divinity && STATE.divinity.ascended); }
function divineMonth(){
  const c = STATE.character, d = D();
  timelineTick();
  if(STATE.time.totalMonths % 3 === 0) worldTick();
  npcTick();
  checkNpcMortality();
  c.salud = 100;
  if(c.sanity < 40) c.sanity = 40;
  // La humanidad es lo único que se gasta. Las personas que recordás la frenan.
  if(STATE.time.month === 1){
    const keptAlive = (d.kept||'').startsWith('person:') && (npcById(d.kept.split(':')[1])||{}).alive;
    const drift = d.type === 'distant' ? -1 : keptAlive ? 0 : -2;
    c.humanity = clamp((c.humanity??0) + drift, 0, 100);
    d.years = (d.years||0) + 1;
  }
  if(!STATE.pendingEvent && chance(0.12)){
    const r = Math.random();
    triggerEventById(r < 0.55 ? 'div_prayer' : r < 0.9 ? 'div_old_world' : 'div_gods_conflict');
  }
  if((c.humanity??0) <= 0 && !STATE.gameOver){
    endGame('divine', 'Un dios sin nombre', `En algún momento —nadie podría decir cuándo— el dios que fue ${c.nombre} ${c.apellido} dejó de recordar que alguna vez tuvo ese nombre. Sigue ahí. Sigue mirando. Ya no hay nadie adentro.`, {cause:'divino'});
  }
}
function divineActions(){
  if(!isDivine()) return [];
  const d = D();
  const acts = [
    {id:'listen', label:'Escuchar las plegarias', desc:'Alguien, en algún lugar, reza con tu nombre.'},
    {id:'domain', label:'Ejercer tu dominio', desc: d.bargain ? 'Prometiste no intervenir. Hacerlo tiene un precio.' : 'Cambiar el mundo, un poco, a tu manera.'},
    {id:'watch', label:'Velar por los tuyos', desc:'Mirar desde lejos a quienes todavía te recuerdan. Y entender lo que nunca supiste.'},
    {id:'mortal', label:'Caminar entre los mortales', desc:'Un día con cuerpo de persona. Te recuerda lo que eras.'},
    {id:'end', label:'Cerrar los ojos', desc:'Terminar esta historia. El mundo sigue sin vos, o con vos durmiendo.'}
  ];
  return acts;
}
function doDivineAction(id){
  if(timeBlocked() || !isDivine()) return;
  const d = D(), c = STATE.character, pw = STATE.pathway.chosenPathway;
  if(id === 'end'){ divineEnding(); return; }
  if(id === 'listen'){ if(!triggerEventById('div_prayer')) toast('Nadie reza en este momento.', 'neg'); saveGame(true); renderAll(); return; }
  if(!spendFreeTime(1)){ toast('Incluso un dios tiene que esperar a la próxima temporada.', 'neg'); return; }
  let text = '';
  if(id === 'domain'){
    d.domainActs = (d.domainActs||0) + 1;
    const flavor = {sun:'La luz dura un poco más en los barrios pobres. La gente sale a la calle sin saber por qué.', darkness:'Durante un año, en toda la ciudad, nadie tiene pesadillas.', death:'Los muertos de la ciudad descansan. Los vivos también.', moon:'Las cosechas florecen de noche.', tyrant:'El mar se calma para los pescadores de tu costa.', visionary:'La gente se entiende un poco mejor, sin saber por qué.', door:'Los caminos se acortan. Los viajeros llegan antes.', fool:'La niebla sobre la ciudad se levanta. Un milagro pequeño, y un poco gracioso.'}[pw] || 'El mundo se acomoda, apenas, a tu voluntad.';
    cityAdjust(currentCityKey(), {prosperity:rndInt(3,8), security:rndInt(2,6)});
    applyEffects({humanity: d.bargain ? -5 : -2});
    if(d.bargain){ const k = d.churchRival || 'church'; factionAdjust(k, {suspicion:20}, true); logWorld(`${cap(factionShort(k))} acusa públicamente a "una potestad hereje" de romper un pacto antiguo.`); }
    text = flavor;
    logWorld(flavor);
  } else if(id === 'watch'){
    const h = revealRandomHiddenTruth('lo viste todo desde el trono');
    applyEffects({humanity:1});
    text = h ? `Mirás hacia atrás, a tu propia vida, con ojos que lo ven todo. Y por fin entendés: ${h.text}` : 'Mirás a los tuyos. No hay nada en tu vida que no entiendas ya. Es una forma rara de paz.';
  } else if(id === 'mortal'){
    applyEffects({humanity:[3,6]});
    if(chance(0.25)){ const k = pick(['church','storm','nighthawks']); factionAdjust(k, {suspicion:10}, true); }
    const desc = aliveNpcs().filter(n=>n.id.startsWith('hijo') || n.id.startsWith('nieto')).sort((a,b)=>npcAge(a)-npcAge(b))[0];
    text = desc ? `Caminás un día entero con cuerpo de persona. En una plaza ves a ${desc.name}. No te reconoce. Le sonreís igual.` : 'Caminás un día entero con cuerpo de persona. Te cansás, tenés hambre, te mojás con la lluvia. Es maravilloso.';
  }
  logJournal('Desde el trono', text, {cat:'pathway', imp:1});
  setResolution('Desde el trono', text, []);
  saveGame(true); renderAll();
}
function divineEnding(){
  const d = D(), c = STATE.character;
  const nd = seqData(STATE.pathway.chosenPathway, 0);
  const name = nd ? nd.name : 'Dios Verdadero';
  const text = {
    benevolent:`${c.nombre} ${c.apellido} fue ${name}. Durante ${d.years||0} años escuchó plegarias y no olvidó una cara. Un día cerró los ojos, como se cierra una puerta despacio para no despertar a nadie.`,
    self:`${c.nombre} ${c.apellido} fue ${name}. Nunca dejó de repetir su propio nombre. Un día, simplemente, dejó de responder a otro.`,
    distant:`${c.nombre} ${c.apellido} fue ${name}. No le quedaba nada humano, y gobernó como gobierna la gravedad: sin odio y sin amor. Un día se durmió, como duermen los dioses antiguos.`,
    dark:`${c.nombre} ${c.apellido} fue ${name}. Todo lo que hizo llevó una firma ajena. Cuando cerró los ojos, algo más los abrió.`
  }[d.type] || `${c.nombre} ${c.apellido} fue ${name}.`;
  endGame('divine', DIVINE_TYPE_LABEL[d.type] || 'Sequence 0', text, {cause:'divino'});
}
