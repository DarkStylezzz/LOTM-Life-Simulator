'use strict';
/* =========================================================================
   systems/time.js — el tiempo (§5).
   - MES: unidad interna del mundo. processMonth() mueve todo: economía,
     salud, NPCs, facciones, ciudades, consecuencias, línea temporal y el
     evento del mes.
   - TEMPORADA (3 meses): unidad principal de juego. Cada temporada trae una
     cantidad de TIEMPO LIBRE: trabajar horas extra, estudiar, investigar,
     actuar tu rol, ver a tu familia o explorar compiten por él. Así la vida
     mundana y la mística chocan de verdad (§23): lo que le das a una, se lo
     sacás a la otra.
   - AÑO: resumen de los grandes cambios.
   El avance rápido NUNCA se saltea un combate, una decisión, una
   oportunidad sobrenatural, una muerte, una misión, un ritual o una
   revelación: todo eso frena el reloj en el acto.
   ========================================================================= */
const SEASON_NAMES = ['Invierno','Primavera','Verano','Otoño'];
function seasonIndex(month){ return Math.floor(((month||STATE.time.month)-1)/3); }
function seasonName(month){ return SEASON_NAMES[seasonIndex(month)]; }
function calendarYear(){ return (STATE.time.startYear||1330) + STATE.time.year - 1; }
function dateLabel(){ return `${seasonName()} de ${calendarYear()}`; }
function fullDateLabel(){ return `${cap(MONTH_NAMES[STATE.time.month-1])} de ${calendarYear()}`; }

/* --------------------------- tiempo libre --------------------------- */
function computeFreeTime(){
  const c = STATE.character;
  if(STATE.divinity && STATE.divinity.ascended) return 3;
  if(c.edad < 6) return 0;
  if(c.edad < 13) return 1;
  let t = 3;
  if(c.edad < 18 && c.profesion === 'Estudiante') t = 2;
  const job = JOBS[c.profesion];
  if(job && c.edad >= 18) t += job.time || 0;
  if(c.university) t -= 1;
  if(childrenNpcs().some(k=>npcAge(k) < 6 && k.alive)) t -= 1;
  if(STATE.flags.caringUntil && STATE.flags.caringUntil > STATE.time.totalMonths) t -= 1;
  t += pathwayMods().freeTime || 0;
  t += woundMods().freeTime || 0;
  if(c.salud < 25) t -= 1;
  // Sequences muy altas: la vida humana ya casi no ocupa tiempo.
  if(STATE.pathway.chosenPathway && STATE.pathway.sequence <= 3) t += 1;
  return clamp(t, 1, 6);
}
function freeTimeLeft(){ return Math.max(0, (STATE.season.free||0) - (STATE.season.used||0)); }
function canSpendFreeTime(n){ return freeTimeLeft() >= (n||1); }
// force: eventos que exigen tu tiempo aunque no lo tengas (lo pagás igual).
function spendFreeTime(n, force){
  n = n || 1;
  if(!force && !canSpendFreeTime(n)) return false;
  STATE.season.used = (STATE.season.used||0) + n;
  return true;
}
function markMysticAct(){ STATE.season.mysticActs = (STATE.season.mysticActs||0) + 1; }

/* ----------------------------- temporadas ----------------------------- */
function seasonStart(){
  const c = STATE.character;
  STATE.season = {
    free: computeFreeTime(), used:0, start: STATE.time.totalMonths, mysticActs:0,
    snap:{cash:c.cash, bank:c.bank, debt:c.debt, salud:c.salud, sanity:c.sanity, digestion:STATE.pathway.digestion, month:STATE.time.month, cy:calendarYear()},
    log:[]
  };
  resetSeasonActions();
}
function seasonEnd(){
  const s = STATE.season, c = STATE.character;
  if(!s || !s.snap) return;
  // Una temporada sin rastros místicos es una temporada "tranquila": el
  // mundo oculto se olvida un poco de vos (§17).
  if(!s.mysticActs){ STATE.flags.quietSeasons = (STATE.flags.quietSeasons||0) + 1; raiseAttention(-2); }
  else STATE.flags.quietSeasons = 0;
  // El tiempo libre sin usar no se pierde del todo: descansar también es vivir.
  const unused = freeTimeLeft();
  if(unused > 0 && c.edad >= 13) applyEffects({sanity: Math.min(3, unused)});
  const netWorth = (c.cash + c.bank - c.debt) - (s.snap.cash + s.snap.bank - s.snap.debt);
  const notable = (s.log||[]).filter(x=>x.imp>=1).map(x=>x.t);
  STATE.lastSeasonSummary = {
    label: `${SEASON_NAMES[seasonIndex(s.snap.month)]} de ${s.snap.cy}`,
    money: netWorth, salud: c.salud - s.snap.salud, sanity: c.sanity - s.snap.sanity,
    events: notable.slice(0,5), quiet: !notable.length, usedTime: s.used, freeTime: s.free
  };
}

/* ------------------------------ años ------------------------------ */
function yearEnd(){
  const c = STATE.character;
  const snap = STATE._yearSnap || {};
  const lines = [];
  if(snap.profesion && snap.profesion !== c.profesion) lines.push(`Ahora trabajás como ${c.profesion.toLowerCase()}.`);
  if(snap.educacion && snap.educacion !== c.educacion) lines.push(`Educación: ${c.educacion}.`);
  if(snap.estadoCivil && snap.estadoCivil !== c.estadoCivil) lines.push(`Estado civil: ${c.estadoCivil}.`);
  if(snap.ciudad && snap.ciudad !== c.ciudad) lines.push(`Te mudaste a ${c.ciudad}.`);
  if(snap.seq !== undefined && snap.seq !== STATE.pathway.sequence && STATE.pathway.chosenPathway) lines.push(`Sequence ${STATE.pathway.sequence}.`);
  const deaths = STATE.journal.filter(e=>e.cy===calendarYear()-1 && e.cat==='death').length;
  if(deaths) lines.push(deaths===1 ? 'Perdiste a alguien.' : `Perdiste a ${deaths} personas.`);
  const w = STATE.world.log.find(x=>x.year === calendarYear()-1 || x.cy === calendarYear()-1);
  if(w) lines.push('En el mundo: ' + w.text.charAt(0).toLowerCase() + w.text.slice(1));
  const net = (c.cash + c.bank - c.debt) - (snap.net ?? (c.cash + c.bank - c.debt));
  STATE.lastYearSummary = { year: calendarYear()-1, age: c.edad, lines, money: net };
  if(lines.length) logJournal(`El año ${calendarYear()-1}`, lines.join(' '), {cat:'summary', imp:1});
  STATE._yearSnap = {profesion:c.profesion, educacion:c.educacion, estadoCivil:c.estadoCivil, ciudad:c.ciudad, seq:STATE.pathway.sequence, net:c.cash+c.bank-c.debt};
}

/* ------------------------------ el mes ------------------------------ */
function processMonth(){
  if(STATE.gameOver) return;
  const c = STATE.character;
  STATE._importantMoment = false;
  STATE.time.month++;
  STATE.time.totalMonths++;
  let newYear = false;
  if(STATE.time.month > 12){
    STATE.time.month = 1; STATE.time.year++; c.edad++; newYear = true;
  }
  if(newYear){
    maybeAdvanceEducation(c);
    yearlyUpkeep();
    yearEnd();
  }

  // Consecuencias agendadas que vencen ahora (antes del evento del mes, para
  // que el journal quede en orden cronológico).
  if(processPendingConsequences()) STATE._importantMoment = true;

  // Sequence 0: el tiempo de un dios es otro (ver systems/divinity.js).
  if(STATE.divinity && STATE.divinity.ascended){ divineMonth(); return; }

  monthlyEconomy();
  monthlyBody();
  monthlyMystic();
  timelineTick();
  if(STATE.time.totalMonths % 3 === 0) worldTick();
  worldAttentionPressure();
  npcTick();
  factionTick();
  tarotTick();
  divinityTick();
  if(!STATE.gameOver) rollMonthlyEvent();
  if(c.edad >= 13 && !STATE.pendingEvent) maybeTriggerCombat();
  checkNpcMortality();
  checkDeathAndCrisis();
}
// Cosas que pasan una vez por año.
function yearlyUpkeep(){
  decayRelationships();
  yearlyEconomy();
  anchorsYearly();
  agingHumanity();
}

/* ------------------------------ avanzar ------------------------------ */
function timeBlocked(){
  return !!(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver);
}
// Devuelve cuántos meses efectivamente avanzó.
function advanceTime(maxMonths, opts){
  opts = opts || {};
  if(timeBlocked()) return 0;
  STATE.lastResolution = null;
  let advanced = 0;
  for(let i=0;i<maxMonths;i++){
    const before = STATE.time.totalMonths;
    processMonth();
    advanced++;
    if(STATE.gameOver) break;
    if(!STATE.combat) maybeGrantAdvanceFlag();
    if(Math.floor(STATE.time.totalMonths/3) > Math.floor(before/3)){
      seasonEnd(); seasonStart();
      if(opts.untilSeason) break;
    }
    if(timeBlocked() || STATE._importantMoment) break;
  }
  saveGame(true);
  renderAll();
  return advanced;
}
function advanceOneMonth(){ return advanceTime(1); }
// Avanza lo que falte para terminar la temporada actual.
function advanceOneSeason(){
  const left = 3 - (STATE.time.totalMonths % 3);
  return advanceTime(left, {untilSeason:true});
}
// "Hasta el próximo evento importante": sólo cuando no hay nada pendiente.
function advanceUntilImportant(){
  if(timeBlocked()) return 0;
  const before = STATE.time.totalMonths;
  const advanced = advanceTime(120);
  if(!STATE.gameOver && advanced > 3 && !timeBlocked() && !STATE._importantMoment){
    const años = Math.floor(advanced/12), meses = advanced%12;
    const partes = [];
    if(años) partes.push(años + (años===1?' año':' años'));
    if(meses) partes.push(meses + (meses===1?' mes':' meses'));
    toast('Pasaron ' + (partes.join(' y ') || '1 mes') + ' sin sobresaltos.', null);
  }
  return STATE.time.totalMonths - before;
}
// Alias de compatibilidad (el botón viejo se llamaba así).
function advanceSeason(){ return advanceOneSeason(); }

/* --------------- cupos específicos por temporada (compat) --------------- */
// Además del tiempo libre (que es lo que de verdad limita), algunas acciones
// conservan un tope propio para que no se puedan encadenar sin sentido.
const SEASON_ACTION_LIMITS = { investigate:2, acting:1, work:2, explore:2, missions:1, personal:2, research:2 };
function actionsLeft(key){ return (SEASON_ACTION_LIMITS[key]||99) - (STATE.seasonActions[key]||0); }
function canUseSeasonAction(key){ return actionsLeft(key) > 0; }
function useSeasonAction(key){ STATE.seasonActions[key] = (STATE.seasonActions[key]||0) + 1; }
function resetSeasonActions(){ for(const k in SEASON_ACTION_LIMITS) STATE.seasonActions[k] = 0; }
