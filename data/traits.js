'use strict';
/* =========================================================================
   data/traits.js — rasgos de personalidad del personaje (sorteados por
   rareza al nacer). Cada rasgo trae mods{} reales que se aplican en el
   motor de efectos (systems/effects.js) y, desde el rework v3, también
   "tags" de personalidad que usan el Acting Method (qué roles te salen
   naturales), las interacciones con NPCs y la investigación.
   ========================================================================= */

/* ---------------------------------------------------------------------
   RASGOS DE PERSONALIDAD (aleatorios, con rareza)
   Ya no se eligen a mano: al llegar al Paso 3 de la creación se sortean
   3 rasgos entre todo TRAITS_DATA, con probabilidad según su 'rarity'
   (mismo criterio que un sorteo de loot por rareza: cuanto más raro,
   menos peso tiene en la tabla). Cada rasgo trae un mods{} concreto que
   se aplica de verdad en el juego — ver getTraitMods() y sus usos en
   applyEffects, mysticExposureChance, playerCombatPower y seekBetterJob.
--------------------------------------------------------------------- */
const TRAIT_RARITIES = {
  comun:      {label:'Común',       weight:100},
  pocoComun:  {label:'Poco Común',  weight:42},
  raro:       {label:'Raro',        weight:15},
  legendario: {label:'Legendario',  weight:4}
};

const TRAITS_DATA = [
  // -- Comunes: bonificaciones moderadas, la base más probable del sorteo --
  {name:'Curioso', rarity:'comun', desc:'Tu atención salta hacia lo raro antes que hacia lo seguro.',
    bonusText:'+20% probabilidad de tropezar con pistas místicas', mods:{mysticExposureMult:1.20}},
  {name:'Prudente', rarity:'comun', desc:'Pensás dos veces antes de exponerte a algo peligroso.',
    bonusText:'-15% Corrupción ganada', mods:{corruptionMult:0.85}},
  {name:'Valiente', rarity:'comun', desc:'El miedo no te paraliza cuando hay que actuar.',
    bonusText:'-15% Cordura perdida', mods:{sanityLossMult:0.85}},
  {name:'Escéptico', rarity:'comun', desc:'Necesitás pruebas antes de creer en nada.',
    bonusText:'-10% Cordura perdida, -10% probabilidad de eventos místicos', mods:{sanityLossMult:0.90, mysticExposureMult:0.90}},
  {name:'Ambicioso', rarity:'comun', desc:'Siempre estás buscando la forma de subir un escalón más.',
    bonusText:'+15% ingresos, +5% chance al buscar mejor empleo', mods:{cashMult:1.15, jobSearchBonus:0.05}},
  {name:'Solitario', rarity:'comun', desc:'Preferís tu propia compañía a la de una multitud.',
    bonusText:'+10% Cordura recuperada, -8% Reputación ganada', mods:{sanityLossMult:0.92, reputationMult:0.92}},
  {name:'Empático', rarity:'comun', desc:'Percibís con facilidad lo que sienten los demás.',
    bonusText:'+15% Reputación ganada', mods:{reputationMult:1.15}},
  {name:'Cínico', rarity:'comun', desc:'Esperás lo peor de la gente, y rara vez te decepciona.',
    bonusText:'-10% Reputación ganada, -10% Corrupción ganada', mods:{reputationMult:0.90, corruptionMult:0.90}},
  {name:'Meticuloso', rarity:'comun', desc:'Cuidás cada detalle, incluso cuando nadie más lo notaría.',
    bonusText:'+15% Digestión de pociones', mods:{digestionMult:1.15}},
  {name:'Supersticioso', rarity:'comun', desc:'Ves significado y presagios en cada coincidencia.',
    bonusText:'+15% probabilidad de eventos místicos, +8% Espiritualidad inicial', mods:{mysticExposureMult:1.15, startSpirituality:3}},

  // -- Poco Comunes: bonificaciones más notorias --
  {name:'Resiliente', rarity:'pocoComun', desc:'Tu cuerpo se repone del castigo mejor que el de la mayoría.',
    bonusText:'-25% daño de Salud recibido', mods:{healthLossMult:0.75}},
  {name:'Carismático', rarity:'pocoComun', desc:'La gente confía en vos casi sin proponértelo.',
    bonusText:'+25% Reputación ganada', mods:{reputationMult:1.25}},
  {name:'Disciplinado', rarity:'pocoComun', desc:'Tu rutina no se quiebra ni cuando el mundo se sacude.',
    bonusText:'+25% Digestión de pociones', mods:{digestionMult:1.25}},
  {name:'Sangre Fría', rarity:'pocoComun', desc:'En el peligro, tu cabeza se enfría en vez de nublarse.',
    bonusText:'+15% poder de combate, -15% Cordura perdida en combate', mods:{combatMult:1.15, sanityLossMult:0.85}},
  {name:'Emprendedor', rarity:'pocoComun', desc:'Sabés dónde está el dinero antes que los demás.',
    bonusText:'+25% ingresos', mods:{cashMult:1.25}},
  {name:'Hermético', rarity:'pocoComun', desc:'Sabés guardar un secreto — incluso los tuyos propios.',
    bonusText:'-25% Corrupción ganada', mods:{corruptionMult:0.75}},
  {name:'Intuitivo', rarity:'pocoComun', desc:'Algo en vos reconoce patrones antes de entenderlos del todo.',
    bonusText:'+10% Digestión de pociones, +10% probabilidad de eventos místicos', mods:{digestionMult:1.10, mysticExposureMult:1.10}},

  // -- Raros: bonificaciones fuertes --
  {name:'Voluntad de Hierro', rarity:'raro', desc:'Tu mente no cede terreno con facilidad, ni ante el horror.',
    bonusText:'-30% Cordura perdida', mods:{sanityLossMult:0.70}},
  {name:'Instinto Cazador', rarity:'raro', desc:'Un depredador nato — leés a tu rival antes de que se mueva.',
    bonusText:'+30% poder de combate', mods:{combatMult:1.30}},
  {name:'Sangre Fría de Acero', rarity:'raro', desc:'Ni la ruina financiera te hace perder la cabeza.',
    bonusText:'+30% ingresos, +5 Reputación inicial', mods:{cashMult:1.30, startReputation:5}},
  {name:'Alma Anclada', rarity:'raro', desc:'Algo en vos se resiste, con terquedad, a corromperse del todo.',
    bonusText:'-35% Corrupción ganada', mods:{corruptionMult:0.65}},

  // -- Legendario: raro de verdad, bonificación muy alta --
  {name:'Favorecido por el Destino', rarity:'legendario', desc:'Coincidencias imposibles se acomodan a tu favor con una frecuencia antinatural. Nadie más a tu alrededor lo nota... todavía.',
    bonusText:'+20% ingresos, -20% Corrupción ganada, -20% Cordura perdida', mods:{cashMult:1.20, corruptionMult:0.80, sanityLossMult:0.80}}
];

// Tags de personalidad por rasgo (rework v3): no son bonificaciones directas,
// son "cómo sos" — el Acting evalúa si el rol de tu Sequence encaja con esto,
// las interacciones sociales los consultan, etc.
const TRAIT_TAGS = {
  'Curioso':['curious'], 'Prudente':['cautious'], 'Valiente':['brave'], 'Escéptico':['skeptic','cautious'],
  'Ambicioso':['ambitious'], 'Solitario':['loner'], 'Empático':['empathic','social'], 'Cínico':['cynic'],
  'Meticuloso':['meticulous'], 'Supersticioso':['superstitious','intuitive'], 'Resiliente':['tough'],
  'Carismático':['social','charismatic'], 'Disciplinado':['disciplined'], 'Sangre Fría':['cold','brave'],
  'Emprendedor':['ambitious','social'], 'Hermético':['secretive'], 'Intuitivo':['intuitive'],
  'Voluntad de Hierro':['disciplined','brave'], 'Instinto Cazador':['hunter','brave'],
  'Sangre Fría de Acero':['cold','ambitious'], 'Alma Anclada':['anchored'], 'Favorecido por el Destino':['lucky']
};
// Suerte y Destino (§42): Luck mueve probabilidades comunes un poco; Fate sólo
// pesa en eventos extraordinarios y momentos límite. Ninguno garantiza nada.
const TRAIT_FORTUNE = {
  'Favorecido por el Destino':{luck:18, fate:25},
  'Supersticioso':{fate:4},
  'Intuitivo':{luck:4},
  'Cínico':{luck:-3},
};
