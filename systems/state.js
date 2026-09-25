'use strict';
/* =========================================================================
   systems/state.js — forma del estado de la partida (STATE).
   Todo lo que se guarda en localStorage vive acá, y sólo como DATOS (nada
   de funciones: se perdían al guardar y rompían partidas — ver
   systems/events.js). SAVE_VERSION sube cuando cambia la forma; las
   partidas viejas se actualizan en systems/save.js (migrateSave).
   ========================================================================= */
const SAVE_KEY = 'lotm_life_sim_save_v1';
// v4: ingredientes por nombre · v5: misiones · v6/v7: memoria, consecuencias
// retrasadas, mundo vivo, relaciones multidimensionales.
// v8 (rework v3 profundo): pistas y etapas de descubrimiento, conocimiento
// separado (lore), inventario unificado, facciones completas, ciudades,
// línea temporal, tiempo por temporadas, anclas guardadas, Tarot Club,
// Método de Actuación, pociones como objetos, dificultad y modo de historia.
const SAVE_VERSION = 8;

// Tabla por vía generada a partir de PATHWAYS: cualquier vía nueva aparece
// sola en partidas nuevas, con su valor inicial.
function perPathway(value){
  const o = {};
  Object.keys(PATHWAYS).forEach(k=>{ o[k] = value; });
  return o;
}

function buildFactionsState(){
  const o = {};
  FACTION_KEYS.forEach(k=>{
    const d = FACTIONS_DATA[k];
    o[k] = {
      key:k, name:d.name,
      known: !!d.publicFace,          // sabés que existe
      discovered: !!d.publicFace,     // compatibilidad (Tarot Club)
      publicRep:0, secretRep:0, trust:0, suspicion:0,
      access:0, relationship: d.publicFace ? 'neutral' : 'desconocida',
      merit:0, rank:0, joined:null, hunted:false, huntReason:null,
      knownSecrets:[], formulas:[], strength:50, lastDuty:-99
    };
  });
  return o;
}

function buildCitiesState(){
  const o = {};
  CITY_KEYS.forEach(k=>{ o[k] = { prosperity:CITIES_DATA[k].prosperity, security:CITIES_DATA[k].security }; });
  return o;
}

function freshState(){
  return {
    version: SAVE_VERSION,
    started:false, gameOver:false, nextId:1,
    settings:{ difficulty:'normal', world:'libre', showNumbers:false },
    character:{
      nombre:'', apellido:'', edad:0, genero:'', ciudad:'', birthCity:'', clase:'', profesion:'Desempleado', educacion:'Sin escolarizar',
      rasgos:[], salud:90, sanity:88, corruption:0, spirituality:8, reputation:0,
      cash:0, bank:0, debt:0, incomeBonus:0,
      estadoCivil:'Soltero/a', vivienda:null,
      // Memoria (§8): favores, traiciones, pactos, pérdidas, lugares, gente.
      memory:[],
      secrets:[],        // (v7) secretos en texto — se migran a STATE.lore
      actingHistory:[],  // (v7) historial viejo de Acting — se migra
      luck:50, fate:0, humanity:100,
      conditions:[], wounds:[],
      job:{ months:0, performance:55, lastChange:0, pensionBase:0 },
      lifestyle:'normal', educationScore:0, university:null,
      grandchildren:0,
      stats:{ combatsWon:0, combatsFled:0, killed:0, missions:0, researches:0, actings:0, spared:0 }
    },
    time:{ year:1, month:1, totalMonths:0, startYear:1330 },
    season:{ free:0, used:0, start:0, snap:null, log:[], mysticActs:0 },
    lastSeasonSummary:null, lastYearSummary:null, lastResolution:null,
    pathway:{
      knowledge:perPathway(0),          // comprensión REAL de cada vía (0-100, oculta)
      belief:perPathway(0),             // lo que el jugador CREE saber (incluye pistas falsas)
      identified:perPathway(false),     // ya sabe el nombre de la vía
      formulaKnown:perPathway(false),   // compatibilidad: tiene la fórmula de la Sequence 9
      firstDiscoveryShown:perPathway(false),
      clues:[],
      ingredientsOwned:{},              // (v7) — migrado a STATE.inventory.items
      chosenPathway:null, sequence:null, digestion:0,
      advanceFlags:{}, ritualPrepBonus:0,
      rumors:[],                        // (v7) — migrado a pistas
      actingMethod:0, actingMethodProgress:0,
      acting:{ history:[], quality:50, consistency:0.5, deviation:0 },
      potionMonth:null
    },
    lore:{ fact:[], secret:[], forbidden:[], entity:[] },
    leads:[],
    hiddenTruths:[],
    factions: buildFactionsState(),
    world:{
      prosperity:55, security:60, attention:0, threat:0,
      factionMood:{ church:'normal', nighthawks:'normal', storm:'normal', machinery:'normal', aurora:'normal', mi9:'normal', psychology:'normal', tarotClub:'normal' },
      log:[], cities: buildCitiesState(), priceIndex:1, timeline:[], flags:{}, war:false, mysticBoost:0
    },
    npcs:[],
    inventory:{ items:[], books:[], documents:[], formulas:[], artifacts:[], combatItems:[] },
    journal:[], milestones:[],
    flags:{ mysticExposure:0, metOccultContact:false, tarotHint:0, monthsSinceEvent:0, lastJobSearchMonth:-999, quietSeasons:0 },
    eventHistory:{},
    pendingEvent:null, pendingMission:null, missions:{ completedIds:[] }, combat:null,
    pendingConsequences:[],
    seasonActions:{ investigate:0, acting:0, work:0, explore:0, missions:0, personal:0, research:0 },
    anchors:{ people:[], followers:0, belief:0, identityStability:0, anchorStrength:0, revealed:false, grief:0, lost:[], followerBonus:0 },
    tarot:{ stage:0, observed:0, card:null, meetings:0, lastMeeting:-99, honorific:false, declined:0, lastDecline:-99, heard:[], evals:0, shared:[], lastFormula:-99, lastPrayer:-99 },
    ritual:null, brew:null,
    divinity:{ stage:0, ascended:false, uniqueness:false, characteristics:0, prayersAnswered:0, domainActs:0 },
    endingData:null
  };
}

let STATE = freshState();
