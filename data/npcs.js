'use strict';
/* =========================================================================
   data/npcs.js — materia prima de las personas del mundo (§9, §10, §11).
   Nombres, personalidades, objetivos, miedos y secretos. systems/npc.js los
   combina para generar gente distinta en cada vida, y el motor de NPCs los
   usa para decidir qué hace cada uno por su cuenta.
   ========================================================================= */

// Pools originales (se conservan: la familia y la vecina ya los usaban).
const FAMILY_MALE_NAMES = ['Alden','Marcus','Victor','Edwin','Thomas','Bernard','Cedric','Leopold','Gideon','Oswald','Reginald','Percival','Desmond','Ambrose','Julian','Roland',
  'Benson','Leonard','Hugh','Stuart','Walter','Frederick','Arthur','Colin','Duncan','Emlyn','Harvey','Lionel','Morris','Neville','Rupert','Silas','Tobias'];
const FAMILY_FEMALE_NAMES = ['Rosalind','Margaret','Eleanor','Charlotte','Beatrice','Florence','Agnes','Josephine','Vivian','Cordelia','Adelaide','Genevieve','Wilhelmina','Theodora',
  'Melissa','Daisy','Elizabeth','Harriet','Iris','Judith','Lucia','Maud','Nora','Olive','Priscilla','Rosa','Sybil','Winifred','Clarice','Edith'];
const NEIGHBOR_SURNAMES = ['Marrow','Hale','Whitlock','Pryce','Ashford','Doyle','Sutton','Blackwood'];
const RANDOM_SURNAMES = ['Moretti','Marrow','Hale','Whitlock','Pryce','Ashford','Doyle','Sutton','Blackwood','Reinhardt','Kotzebue','Selborne','Ashcombe','Faulkner','Grenwood','Harlow','Thorne','Castellan','Merrow','Vance',
  'Colbert','Hensley','Garrick','Lindqvist','Morrow','Pennington','Quill','Radcliffe','Stanton','Tolliver','Wexford','Yardley'];
function randomSurname(){ return pick(RANDOM_SURNAMES); }
function randomFirstName(gender){
  if(gender==='m' || gender==='Hombre') return pick(FAMILY_MALE_NAMES);
  if(gender==='f' || gender==='Mujer') return pick(FAMILY_FEMALE_NAMES);
  return pick(chance(0.5) ? FAMILY_MALE_NAMES : FAMILY_FEMALE_NAMES);
}
function randomFirstNameForGender(genero){ return randomFirstName(genero); }

/* Personalidades: cada NPC tiene dos. Los mods no son decorativos: los lee
   el motor de NPCs (cuánto le cuesta confiar, si chusmea, si traiciona, si
   se mete en lo oculto) y el de interacciones. */
const NPC_PERSONALITIES = {
  leal:       {label:'leal',       desc:'No abandona a los suyos, ni siquiera cuando conviene.', mods:{loyaltyGain:1.5, betray:0.2, help:1.2}},
  ambicioso:  {label:'ambicioso',  desc:'Siempre mira el escalón de arriba.', mods:{betray:1.4, goals:{dinero:2, organizacion:1.5, reconocimiento:1.6, poder:1.5}}},
  curioso:    {label:'curioso',    desc:'No puede dejar una pregunta sin responder.', mods:{mystic:2, snoop:1.7, goals:{saber:2.2}}},
  celoso:     {label:'celoso',     desc:'Mira de reojo lo que tienen los demás.', mods:{suspicionGain:1.5, argue:1.4}},
  generoso:   {label:'generoso',   desc:'Da más de lo que tiene.', mods:{help:1.8, affectionGain:1.2}},
  rencoroso:  {label:'rencoroso',  desc:'Nunca olvida una ofensa.', mods:{grudge:2, betray:1.3, argue:1.3}},
  temeroso:   {label:'temeroso',   desc:'Ve peligro en todos lados.', mods:{fearGain:1.5, flee:1.6}},
  calido:     {label:'cálido',     desc:'Se encariña rápido.', mods:{affectionGain:1.4}, clash:['frio']},
  frio:       {label:'frío',       desc:'Respeta, pero no se encariña.', mods:{affectionGain:0.7, respectGain:1.25}, clash:['calido']},
  devoto:     {label:'devoto',     desc:'Su fe ordena su vida.', mods:{goals:{fe:2.5}, faction:{church:2.5}, occultFear:1.5}},
  cinico:     {label:'cínico',     desc:'No se cree nada de nadie.', mods:{trustGain:0.75, mystic:0.6}},
  imprudente: {label:'imprudente', desc:'Primero hace, después piensa (a veces).', mods:{risk:1.8, mystic:1.3}},
  discreto:   {label:'discreto',   desc:'Sabe callar.', mods:{gossip:0.2, keepsSecret:1.8}, clash:['chismoso']},
  chismoso:   {label:'chismoso',   desc:'Todo lo que sabe, lo sabe media cuadra.', mods:{gossip:2.2, keepsSecret:0.4}, clash:['discreto']},
  protector:  {label:'protector',  desc:'Cuida a los suyos como si fueran de vidrio.', mods:{help:1.5, loyaltyGain:1.2}},
  sonador:    {label:'soñador',    desc:'Vive un poco en otro lado.', mods:{mystic:1.4, goals:{amor:1.4, huir:1.5}}},
  calculador: {label:'calculador', desc:'Cada gesto tiene un porqué.', mods:{betray:1.2, respectGain:1.1, keepsSecret:1.4}}
};
const NPC_PERSONALITY_KEYS = Object.keys(NPC_PERSONALITIES);

/* Objetivos: lo que el NPC persigue en su vida. El motor de NPCs elige sus
   acciones pesando estos objetivos (ver NPC_ACTIONS en systems/npc.js). */
const NPC_GOALS = {
  dinero:         {label:'conseguir dinero'},
  familia:        {label:'proteger a su familia'},
  formar_familia: {label:'formar una familia'},
  identidad:      {label:'ocultar quién es en realidad'},
  organizacion:   {label:'entrar a una organización'},
  saber:          {label:'entender lo que no tiene explicación'},
  venganza:       {label:'vengarse de alguien'},
  huir:           {label:'irse lejos de acá'},
  reconocimiento: {label:'que lo tomen en serio'},
  amor:           {label:'encontrar a alguien'},
  sanar:          {label:'curar a alguien que quiere'},
  fe:             {label:'servir a su fe'},
  poder:          {label:'conseguir poder, cueste lo que cueste'}
};
const NPC_GOAL_KEYS = Object.keys(NPC_GOALS);
// Objetivos en texto de la versión anterior → id nuevo (migración).
const LEGACY_GOAL_MAP = {
  'conseguir un trabajo mejor':'dinero', 'ahorrar para algo propio':'dinero', 'proteger a su familia':'familia',
  'salir del barrio':'huir', 'que lo tomen en serio':'reconocimiento', 'encontrar a alguien':'amor',
  'entender qué le pasó a alguien que quería':'saber', 'ocultar algo que hizo':'identidad'
};

const NPC_FEARS = ['quedarse solo','la pobreza','la Iglesia','la oscuridad','perder a su familia','volverse loco',
  'que descubran su pasado','la muerte','el mar','fracasar','los hospitales','las alturas','no ser nadie','el fuego'];

/* Secretos de NPC: cosas que el jugador puede descubrir (investigando,
   confianza, habilidades). Algunos son palanca (leverage) para presionar,
   otros son puertas de entrada al mundo oculto (mystic). */
const NPC_SECRET_POOL = [
  {id:'debt',         w:5, kind:'deuda',     leverage:2, text:'Debe mucho dinero a gente que no perdona.'},
  {id:'affair',       w:3, kind:'amor',      leverage:3, text:'Mantiene una relación a escondidas.', adult:true},
  {id:'crime',        w:2, kind:'crimen',    leverage:4, text:'Cometió un crimen hace años y nunca lo pagó.'},
  {id:'fake_identity',w:1, kind:'pasado',    leverage:3, text:'No se llama como dice llamarse.'},
  {id:'illness',      w:3, kind:'salud',     leverage:0, text:'Está mucho más enfermo de lo que admite.'},
  {id:'occult_book',  w:2, kind:'oculto',    leverage:2, text:'Guarda escondido un libro de misticismo que no debería tener.', mystic:true},
  {id:'saw_something',w:2, kind:'oculto',    leverage:1, text:'Una vez vio algo imposible y nunca se lo contó a nadie.', mystic:true},
  {id:'informant',    w:1, kind:'informante',leverage:3, text:'Le pasa información a alguien a cambio de dinero.'},
  {id:'gambling',     w:3, kind:'vicio',     leverage:2, text:'Está hundido en deudas de juego.'},
  {id:'lost_child',   w:1, kind:'pasado',    leverage:1, text:'Tuvo un hijo que entregó cuando era muy joven.', adult:true},
  {id:'hates_player', w:1, kind:'rencor',    leverage:0, text:'Te guarda un rencor que nunca te dijo.'}
];

// Oficios de la gente común (los NPCs no necesitan la escalera laboral del jugador).
const NPC_PROFESSIONS = {
  Baja:['Obrero','Estibador','Lavandera','Cochero','Vendedor ambulante','Costurera','Cantinero','Barrendero','Criada','Deshollinador','Pescador'],
  Media:['Tendero','Sastre','Panadero','Oficinista','Maestro','Enfermero','Boticario','Policía','Relojero','Librero','Periodista','Herrero'],
  Alta:['Abogado','Médico','Comerciante','Banquero','Profesor universitario','Oficial del ejército','Terrateniente','Juez']
};
// Oficios "de frontera": gente que suele rozar lo oculto sin ser Beyonder.
const NPC_OCCULT_PROFESSIONS = ['Anticuario','Adivina','Herborista','Librero de viejo','Prestamista','Médium','Coleccionista','Traductor de lenguas muertas'];

const NPC_TIERS = { comun:'comun', recurrente:'recurrente', importante:'importante', misterioso:'misterioso', sobrenatural:'sobrenatural' };
const NPC_TIER_LABEL = { comun:'Común', recurrente:'Recurrente', importante:'Importante', misterioso:'Misterioso', sobrenatural:'Sobrenatural' };
