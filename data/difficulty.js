'use strict';
/* =========================================================================
   data/difficulty.js — dificultad y modo de historia (§31 del rework).
   La dificultad NO duplica lógica: es una tabla de multiplicadores globales
   que el motor consulta con diffMult('clave') (y diffAdd('clave') para los
   que se suman, con 0 por defecto). El modo de historia decide si la línea
   temporal canónica existe y si el jugador puede alterarla.
   Claves: mystic (exposición a lo oculto), death (riesgo de muerte),
   corruption, sanityLoss, attention, reward (lo que pagan encargos, peleas,
   hallazgos y ventas), potion (se suma a la chance de éxito de pociones y
   rituales), falseClue, digestion, threat, highSeq, hints, enemyDmg (daño
   que recibís en combate), flee (se suma a la chance de huir) y
   secondChances (muertes evitables que no llegan, ver systems/endings.js).
   ========================================================================= */
const DIFFICULTIES = {
  easy:{
    label:'Fácil', desc:'Para vivir la historia. Más pistas, heridas más leves, pociones más nobles y hasta tres segundas oportunidades cuando todo sale mal.',
    mult:{ mystic:1.15, death:0.55, corruption:0.75, sanityLoss:0.75, attention:0.75, reward:1.25, potion:0.08, falseClue:0.6, digestion:1.25, threat:0.7, highSeq:0.85, hints:1.6, enemyDmg:0.75, flee:0.1, secondChances:3 }
  },
  normal:{
    label:'Normal', desc:'La experiencia pensada. Hay pistas y margen de error, pero los errores se pagan.',
    mult:{ mystic:1, death:1, corruption:1, sanityLoss:1, attention:1, reward:1, potion:0, falseClue:1, digestion:1, threat:1, highSeq:1, hints:1 }
  },
  hard:{
    label:'Difícil', desc:'Menos información y más riesgos. Las pistas falsas abundan y los errores dejan marca.',
    mult:{ mystic:0.9, death:1.3, corruption:1.2, sanityLoss:1.2, attention:1.3, reward:0.85, potion:-0.07, falseClue:1.5, digestion:0.85, threat:1.25, highSeq:1.2, hints:0.5 }
  },
  nightmare:{
    label:'Pesadilla', desc:'Cada error se paga caro. El mundo no te debe nada y casi nunca avisa.',
    mult:{ mystic:0.85, death:1.7, corruption:1.4, sanityLoss:1.35, attention:1.6, reward:0.7, potion:-0.14, falseClue:2, digestion:0.7, threat:1.6, highSeq:1.45, hints:0 }
  }
};
const WORLD_MODES = {
  libre:{ label:'Mundo libre', desc:'La historia del mundo se genera sola: crisis, guerras y milagros que nadie escribió de antemano.' },
  canon:{ label:'Canon', desc:'El mundo sigue la línea histórica de la Quinta Época. Los grandes acontecimientos llegan igual, hagas lo que hagas, y las Sequences altas son casi inalcanzables.' },
  alternate:{ label:'Línea alternativa', desc:'Los acontecimientos canónicos están en el horizonte... pero lo que hagas puede torcerlos.' }
};
function difficultyDef(){
  const k = (typeof STATE!=='undefined' && STATE && STATE.settings) ? STATE.settings.difficulty : 'normal';
  return DIFFICULTIES[k] || DIFFICULTIES.normal;
}
// Claves que se suman (potion, flee, secondChances): 0 si la dificultad no la define.
function diffAdd(key){
  const m = difficultyDef().mult[key];
  return m === undefined ? 0 : m;
}
function diffMult(key){
  const m = difficultyDef().mult[key];
  let v = m === undefined ? 1 : m;
  // En modo Canon las Sequences altas son más difíciles todavía (restricciones
  // más fuertes que en un mundo libre): pocas personas llegan tan lejos.
  if(key === 'highSeq' && STATE && STATE.settings && STATE.settings.world === 'canon') v *= 1.3;
  return v;
}
