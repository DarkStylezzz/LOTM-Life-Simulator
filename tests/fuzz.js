'use strict';
/* =========================================================================
   tests/fuzz.js — recorre TODO el contenido, a la fuerza.
   Las vidas al azar (simulate.js) casi nunca llegan a los eventos
   extraordinarios, a los de cadena o a las opciones raras. Acá se dispara
   cada evento, cada opción de cada evento, cada misión, cada acción de NPC,
   cada evento del mundo y cada desenlace de rumor, en estados variados
   (niño, adulto, Beyonder, con familia, perseguido...). Falla ante
   cualquier excepción o si el estado deja de ser serializable.
   Uso:  node tests/fuzz.js [repeticiones=3]
   ========================================================================= */
const { loadGame, run, scriptList } = require('./harness');
const REPS = +(process.argv[2] || 3);
const STUBS = `var __toasts = 0; function renderAll(){} function toast(){ __toasts++; } function showScreen(){} function queueSeal(){} var creationData = null;`;
const ctx = loadGame({scripts:scriptList().filter(s=>!s.startsWith('ui/') && s !== 'main.js'), prelude:STUBS, boot:false});

run(ctx, `
var __errs = [];
var __fired = {};
// Los errores que el motor atrapa y sólo loguea también cuentan.
console.error = function(){ __errs.push('console.error: ' + Array.from(arguments).map(a=>a && a.stack ? a.stack.split('\\n').slice(0,3).join(' | ') : String(a)).join(' ')); };
function __err(where, e){ __errs.push(where + ': ' + (e && e.stack ? e.stack.split('\\n').slice(0,4).join(' | ') : e)); }
// Estados de partida variados.
function __setup(kind){
  creationData = {nombre:'Ana', apellido:'Vane', genero:pick(['Hombre','Mujer','']), ciudad:CITIES_DATA[pick(CITY_KEYS)].name, clase:pick(CLASSES), rasgos:rollRandomTraits(3), difficulty:pick(['easy','normal','hard','nightmare']), world:pick(['libre','canon','alternate'])};
  startNewGame();
  const c = STATE.character, p = STATE.pathway;
  c.edad = kind === 'bebe' ? 1 : kind === 'nino' ? 9 : kind === 'teen' ? 15 : kind === 'viejo' || kind === 'mayor' ? 70 : kind === 'soltero' ? 45 : 32;
  c.cash = 5000; c.bank = 2000;
  if(!['bebe','nino','teen','soltero','mayor'].includes(kind)){ setJob('Oficinista'); c.estadoCivil = 'Casado/a'; const s = createNpc({id:'conyuge', role:'Esposa', met:true, trust:70, affection:70, relType:'family', gender:'f', age:30}); createNpc({id:'hijo1', role:'Hijo', met:true, trust:60, affection:70, relType:'family', age:8}); }
  if(kind === 'soltero'){ setJob('Oficinista'); c.estadoCivil = 'Divorciado/a'; c.vivienda = {valor:3000, city:currentCityKey()}; }
  if(kind === 'mayor'){
    // Una vejez con de todo: hijos grandes (uno en problemas), nietos, casa, un amigo viejo, una organización.
    c.estadoCivil = 'Viudo/a'; c.grandchildren = 2; c.vivienda = {valor:3000, city:currentCityKey()};
    createNpc({id:'hijo1', role:'Hijo', met:true, trust:70, affection:70, relType:'family', age:40});
    createNpc({id:'hijo2', role:'Hija', met:true, trust:60, affection:60, relType:'family', gender:'f', age:22});
    createNpc({met:true, relType:'friend', trust:70, affection:70, age:62});
    ['s_street','s_list','s_building','s_meetings','acting_method'].forEach(id=>learnLore(id,'fuzz'));
  }
  if(kind === 'beyonder' || kind === 'viejo'){ p.chosenPathway = pick(Object.keys(PATHWAYS)); p.sequence = kind === 'viejo' ? 5 : rndInt(6,9); identifyPathway(p.chosenPathway); p.actingMethod = 2; STATE.flags.beyonderSince = 0; invalidatePathwayMods(); c.spirituality = 60; }
  if(kind === 'perseguido'){ factionMeet('mi9'); markHunted('mi9', 'fuzz'); STATE.world.attention = 70; }
  STATE.flags.mysticExposure = 60; STATE.tarot.stage = 4;
  ['s_street','black_market','tarot_fool','e_creator','f_outer'].forEach(id=>learnLore(id,'fuzz'));
  FACTION_KEYS.forEach(k=>{ factionMeet(k); F(k).access = 3; F(k).merit = 30; F(k).trust = 30; });
  if(kind === 'mayor' || kind === 'viejo'){ F('church').relationship = 'miembro'; F('church').joined = true; }
  createMysticContact({pathway:'death'}); createNpc({met:true, trust:40, affection:40});
  addArtifact(pick(ARTIFACT_KEYS), 'fuzz'); addItem('quest_notebook',1,'fuzz');
  seasonStart(); STATE.pendingSeals = [];
}
function __clear(){ STATE.pendingEvent = null; STATE.pendingMission = null; STATE.combat = null; STATE.ritual = null; STATE.brew = null; if(STATE.divinity) STATE.divinity.asc = null; STATE.gameOver = false; STATE.character.salud = 90; STATE.character.sanity = 80; }
function __drain(){
  let n = 0;
  while((STATE.pendingEvent || STATE.pendingMission || STATE.combat) && n++ < 60){
    if(STATE.pendingEvent){ const k = STATE.pendingEvent.choices ? STATE.pendingEvent.choices.length : 0; if(!k){ STATE.pendingEvent = null; break; } resolvePendingEvent(Math.floor(Math.random()*k)); }
    else if(STATE.pendingMission) resolveMissionChoice(0);
    else if(STATE.combat){ const a = combatActions().filter(x=>!x.disabled); combatAction(pick(a).id); }
    if(STATE.gameOver) break;
  }
}
function __serializable(where){
  try{ const j = JSON.stringify(STATE); JSON.parse(j); }catch(e){ __err(where + ' (JSON)', e); }
  (function walk(o, path, d){ if(d > 10 || !o || typeof o !== 'object') return; for(const k of Object.keys(o)){ if(typeof o[k] === 'function') __errs.push(where + ': función en ' + path + '.' + k); else walk(o[k], path+'.'+k, d+1); } })(STATE, 'STATE', 0);
}
function __fuzzEvents(kind){
  EVENTS_ALL.forEach(def=>{
    const nChoices = def.choices ? def.choices.length : 1;
    for(let i=0;i<nChoices;i++){
      __clear();
      const homeCity = STATE.character.ciudad, homeAge = STATE.character.edad, homeSeq = STATE.pathway.sequence;
      try{
        // Los eventos de una ciudad se prueban mudándose ahí un momento.
        if(def.requirements && def.requirements.city) STATE.character.ciudad = CITIES_DATA[def.requirements.city].name;
        // Los adultos se estiran a la edad y la Sequence que pide el evento
        // (así se prueban también los de la vejez y los de las Sequences altas).
        const r = def.requirements || {};
        if(!['bebe','nino','teen'].includes(kind)){
          if(r.ageMin !== undefined && STATE.character.edad < r.ageMin) STATE.character.edad = r.ageMin;
          if(r.ageMax !== undefined && STATE.character.edad > r.ageMax) STATE.character.edad = Math.max(18, r.ageMax);
          if(STATE.pathway.chosenPathway && r.seqMax !== undefined && STATE.pathway.sequence > r.seqMax && !/^div_/.test(def.id)){ STATE.pathway.sequence = r.seqMax; invalidatePathwayMods(); }
          if(STATE.pathway.chosenPathway && r.seqMin !== undefined && STATE.pathway.sequence < r.seqMin){ STATE.pathway.sequence = r.seqMin; invalidatePathwayMods(); }
        }
        // Respetar los requisitos declarados (los de cadena los garantiza quien los dispara).
        if(!def.chainOnly && !requirementsOk(def.requirements)) continue;
        if(!def.chainOnly && def.hiddenRequirements && !def.hiddenRequirements({})) continue;
        const divine = /^div_/.test(def.id);
        if(divine && kind !== 'viejo') continue;
        if(divine){ STATE.pathway.sequence = def.type === 'divine' ? 0 : 1; if(def.type === 'divine'){ STATE.divinity.ascended = true; STATE.divinity.type = 'benevolent'; } else STATE.divinity.ascended = false; invalidatePathwayMods(); }
        if(def.id === 'tarot_meeting' && STATE.tarot.stage < 6){ STATE.tarot.stage = 6; STATE.tarot.card = 'El Juicio'; }
        let c = {};
        if(def.context){ c = def.context({}); if(!c) continue; }
        if(def.choices){
          const ok = fireEvent(def, c);
          if(!ok || !STATE.pendingEvent) continue;
          __fired[def.id] = true;
          const vis = STATE.pendingEvent.choices.findIndex(x=>x.orig === i);
          if(vis < 0){ STATE.pendingEvent = null; continue; }
          resolvePendingEvent(vis);
        } else { fireEvent(def, c); __fired[def.id] = true; }
        __drain();
        __serializable('evento ' + def.id);
        if(divine){ STATE.pathway.sequence = 5; STATE.divinity.ascended = false; invalidatePathwayMods(); }
      }catch(e){ __err('evento ' + def.id + ' [' + kind + '] opción ' + i, e); }
      finally{ STATE.character.ciudad = homeCity; STATE.character.edad = homeAge; if(STATE.pathway.chosenPathway && !/^div_/.test(def.id)){ STATE.pathway.sequence = homeSeq; invalidatePathwayMods(); } }
    }
  });
}
function __fuzzMissions(kind){
  MISSION_TEMPLATES.forEach(m=>{
    m.scene.choices.forEach((ch, i)=>{
      __clear();
      try{
        STATE.pendingMission = {missionId:m.id, type:m.type, title:m.title, text:m.scene.text, choices:m.scene.choices.map((c,idx)=>({idx, label:c.label}))};
        resolveMissionChoice(i); __drain(); __serializable('misión ' + m.id);
      }catch(e){ __err('misión ' + m.id + ' [' + kind + '] opción ' + i, e); }
    });
  });
}
function __fuzzNpcActions(kind){
  NPC_ACTIONS.forEach(a=>{
    aliveNpcs().slice(0,6).forEach(n=>{
      __clear();
      try{ const w = typeof a.w === 'function' ? a.w(n) : 1; if(w > 0 || Math.random() < 0.3){ const r = a.run(n); __drain(); } }
      catch(e){ __err('acción de NPC ' + a.id + ' [' + kind + '] con ' + n.id, e); }
    });
  });
}
function __fuzzWorld(kind){
  WORLD_EVENTS.forEach((w, i)=>{ __clear(); try{ w.run(currentCityKey()); __drain(); }catch(e){ __err('evento del mundo ' + (w.id||i) + ' [' + kind + ']', e); } });
}
function __fuzzRumors(kind){
  RUMOR_POOL.forEach(t=>{
    t.outcomes.forEach(o=>{
      __clear();
      try{ const l = addRumor(t.id); if(!l) return; l.outcome = o.type; l.progress = l.steps - 1; seasonStart(); followLead(l.id); __drain(); }
      catch(e){ __err('rumor ' + t.id + '/' + o.type + ' [' + kind + ']', e); }
    });
  });
  __clear();
  try{ STATE.pathway.chosenPathway = STATE.pathway.chosenPathway || 'moon'; STATE.pathway.sequence = STATE.pathway.sequence || 9; addFormula(STATE.pathway.chosenPathway, STATE.pathway.sequence-1, 'true', 'la Iglesia'); STATE.pathway.digestion = 80; for(let i=0;i<60;i++){ maybeIngredientLead(); } const l = activeLeads().find(x=>x.rumor==='ingredient'); if(l){ ['real','danger','fake'].forEach(o=>{ __clear(); l.done = false; l.outcome = o; l.progress = l.steps-1; seasonStart(); followLead(l.id); __drain(); }); } }
  catch(e){ __err('rumor de ingrediente [' + kind + ']', e); }
}
function __fuzzMonths(kind){
  // Unos años de vida acelerada en ese estado.
  for(let i=0;i<48;i++){ try{ __drain(); if(STATE.gameOver) break; processMonth(); if(STATE.time.totalMonths % 3 === 0){ seasonEnd(); seasonStart(); } }catch(e){ __err('mes [' + kind + ']', e); break; } }
}
`);

const kinds = ['bebe','nino','teen','adulto','soltero','beyonder','viejo','mayor','perseguido'];
for(let r=0;r<REPS;r++){
  for(const k of kinds){
    run(ctx, `__setup('${k}'); __fuzzEvents('${k}'); __fuzzMissions('${k}'); __fuzzNpcActions('${k}'); __fuzzWorld('${k}'); __fuzzRumors('${k}'); __fuzzMonths('${k}');`);
  }
}
const errs = run(ctx, '__errs');
const uniq = [...new Set(errs.map(e=>e.replace(/\[[a-z]+\] /,'')))];
const counts = run(ctx, `({eventos:EVENTS_ALL.length, misiones:MISSION_TEMPLATES.length, accionesNPC:NPC_ACTIONS.length, mundo:WORLD_EVENTS.length, rumores:RUMOR_POOL.length})`);
console.log('Contenido recorrido:', JSON.stringify(counts), '×', kinds.length, 'estados ×', REPS);
const never = run(ctx, `EVENTS_ALL.filter(d=>!__fired[d.id]).map(d=>d.id)`);
console.log(`Eventos disparados al menos una vez: ${counts.eventos - never.length} de ${counts.eventos}` + (never.length ? ` (nunca: ${never.join(', ')})` : ''));
console.log(uniq.length ? `Errores (${uniq.length} distintos):\n  ` + uniq.slice(0,40).join('\n  ') : 'Sin errores.');
if(uniq.length) process.exitCode = 1;
