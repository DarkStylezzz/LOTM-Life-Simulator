'use strict';
/* =========================================================================
   data/conditions.js — síntomas permanentes y heridas (§20, §24).
   Una poción mal preparada, un ritual fallido, una pérdida de control o un
   artefacto pueden dejar marcas que no se van: no son un número, son algo
   que el personaje carga (y que a veces los demás notan). Las heridas de
   combate, en cambio, sanan con el tiempo.
   Efectos (los lee systems/character.js):
     monthly: {stat: delta} por mes · research/brew/combat: modificadores
     suspicion: los cercanos sospechan un poco más cada mes
     work: penalización al desempeño laboral mensual
     cure: qué puede curarla (church | moon | sun | time)
   ========================================================================= */
const CONDITIONS = {
  tos_cronica:   {name:'Tos crónica', desc:'Una tos que nunca se fue del todo.', monthly:{salud:-0.1}, work:0.5, cure:['moon','church']},
  temblor:       {name:'Temblor en las manos', desc:'Tus manos tiemblan cuando estás cansado o nervioso.', research:-0.06, combat:-2, brew:-0.12, cure:['moon','sun']},
  voces:         {name:'Voces al anochecer', desc:'Al caer el sol escuchás murmullos que nadie más oye.', monthly:{sanity:-0.4}, cure:['sun','church']},
  ojos:          {name:'Ojos que brillan', desc:'En la oscuridad, tus ojos reflejan la luz como los de un gato.', suspicion:0.6, cure:[]},
  frio:          {name:'Frío permanente', desc:'Tu piel está siempre fría al tacto. Los abrazos duran menos.', affection:-0.3, cure:['sun']},
  hambre:        {name:'Hambre extraña', desc:'Tenés hambre de cosas que no son comida.', monthly:{sanity:-0.2, corruption:0.03}, cure:['moon']},
  cicatriz:      {name:'Cicatriz espiritual', desc:'Algo en tu espiritualidad quedó roto y mal soldado.', spiritualityCap:70, cure:[]},
  pesadillas:    {name:'Pesadillas recurrentes', desc:'La misma pesadilla, noche tras noche.', monthly:{sanity:-0.3}, cure:['church','darkness','time']},
  sombra:        {name:'Una sombra que no coincide', desc:'Tu sombra, a veces, llega tarde.', suspicion:0.5, monthly:{humanity:-0.05}, cure:['sun']},
  fragilidad:    {name:'Fragilidad', desc:'Tu cuerpo se rompe más fácil que antes.', healthLossMult:1.2, cure:['moon']},
  memoria:       {name:'Huecos en la memoria', desc:'Hay días enteros de tu vida que no recordás.', research:-0.05, cure:['time']},
  marca:         {name:'Una marca en la piel', desc:'Un símbolo apareció en tu piel y no se borra.', suspicion:0.3, attention:0.2, cure:['church']}
};
// Síntomas posibles según qué salió mal.
const CONDITION_POOLS = {
  potion:  ['temblor','voces','ojos','frio','hambre','cicatriz','fragilidad','sombra'],
  ritual:  ['cicatriz','voces','pesadillas','sombra','marca','memoria'],
  control: ['voces','pesadillas','sombra','memoria','ojos','marca'],
  artifact:['marca','pesadillas','frio'],
  illness: ['tos_cronica','fragilidad']
};
// Afinidad de vía con algunos síntomas: a veces una poción "tuerce" el cuerpo
// hacia lo que la vía ya es.
const PATHWAY_CONDITION_BIAS = { moon:'hambre', death:'frio', darkness:'ojos', hangedMan:'sombra', visionary:'voces', sun:'cicatriz', tyrant:'temblor' };

const WOUNDS = {
  leve:     {name:'Herida leve', months:2, combat:-1},
  corte:    {name:'Corte profundo', months:3, combat:-2, work:1},
  fractura: {name:'Fractura', months:5, combat:-4, work:2, freeTime:-1},
  grave:    {name:'Herida grave', months:8, combat:-5, work:3, freeTime:-1, monthly:{sanity:-0.2}},
  mordida:  {name:'Mordida que no cierra', months:4, combat:-2, monthly:{corruption:0.05}}
};
