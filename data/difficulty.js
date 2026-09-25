'use strict';
/* =========================================================================
   data/difficulty.js — dificultad y modo de historia (§31 del rework).
   La dificultad NO duplica lógica: es una tabla de multiplicadores globales
   que el motor consulta con diffMult('clave'). El modo de historia decide si
   la línea temporal canónica existe y si el jugador puede alterarla.
   ========================================================================= */
const DIFFICULTIES = {
  normal:{
    label:'Normal', desc:'Más accesible. Hay pistas, margen de error y alguna segunda oportunidad.',
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
function diffMult(key){
  const m = difficultyDef().mult[key];
  let v = m === undefined ? 1 : m;
  // En modo Canon las Sequences altas son más difíciles todavía (restricciones
  // más fuertes que en un mundo libre): pocas personas llegan tan lejos.
  if(key === 'highSeq' && STATE && STATE.settings && STATE.settings.world === 'canon') v *= 1.3;
  return v;
}
