'use strict';
/* =========================================================================
   data/timeline.js — historia mundial (§30, §31).
   El motor (systems/world.js) instancia una línea temporal por partida en
   STATE.world.timeline con entradas {id, date, importance, possible,
   triggered, altered, consequences}. En modo Canon se cargan los
   acontecimientos de CANON_TIMELINE y no se pueden alterar; en Línea
   alternativa se cargan igual, pero las acciones del jugador pueden
   torcerlos (alterFlag); en Mundo libre se sortea una historia propia a
   partir de RANDOM_HISTORY. Agregar un acontecimiento = agregar datos acá.
   ========================================================================= */
const CANON_TIMELINE = [
  {id:'tingen_notebook', year:1349, month:6, city:'tingen', importance:3, title:'El cuaderno de Tingen',
    text:'En Tingen, un cuaderno antiguo cambia de manos una vez de más. Esa noche, la ciudad pierde en silencio a varios de sus guardianes invisibles.',
    effect:{city:{tingen:{security:-12}}, faction:{nighthawks:{strength:-15}}, mood:{nighthawks:'de luto'}},
    alterFlag:'tingen_notebook_delivered',
    altText:'El cuaderno llegó a tiempo a manos de la Iglesia. Esa noche no muere nadie en Tingen, y nadie sabe a quién agradecérselo.',
    altEffect:{faction:{nighthawks:{strength:5}}},
    hookBefore:{months:10, event:'tl_notebook_found', city:'tingen'}},
  {id:'backlund_detective', year:1350, month:3, city:'backlund', importance:1, title:'Un detective recién llegado',
    text:'Un detective privado se instala en Backlund. Nadie sabe de dónde salió; resuelve casos que nadie quiere tocar.'},
  {id:'great_smog', year:1350, month:12, city:'backlund', importance:3, title:'La Gran Niebla de Backlund',
    text:'Una niebla tóxica cubre Backlund durante días. Mueren miles. Se habla de chimeneas y de clima; en voz baja, de un ritual.',
    effect:{city:{backlund:{prosperity:-10, security:-12}}, killsInCity:'backlund', playerHarm:{salud:[-18,-8], sanity:[-8,-3]}},
    alterFlag:'smog_warning',
    altText:'La niebla llega, pero se disipa en un día. Alguien avisó a tiempo a quien tenía que escuchar.',
    altEffect:{city:{backlund:{prosperity:-3, security:-4}}}},
  {id:'east_borough', year:1351, month:5, city:'backlund', importance:2, title:'Disturbios en el East Borough',
    text:'Hambre, fábricas cerradas y una chispa: el East Borough arde tres noches seguidas.',
    effect:{city:{backlund:{security:-10, prosperity:-4}}}},
  {id:'sea_god', year:1352, month:3, city:'bayam', importance:2, title:'Un dios en el mar',
    text:'Los marineros de Bayam juran que algo enorme se movió bajo la flota durante una tormenta. La Iglesia de las Tormentas no desmiente.',
    effect:{city:{bayam:{security:-6}}, mood:{storm:'investigando'}}},
  {id:'cathedral_attack', year:1354, month:10, city:'backlund', importance:2, title:'Un atentado en la catedral',
    text:'Una explosión sacude una catedral de Backlund durante una misa. Oficialmente, gas. Extraoficialmente, nadie dice nada.',
    effect:{city:{backlund:{security:-8}}, mood:{church:'investigando', mi9:'investigando'}}},
  {id:'war_begins', year:1356, month:9, importance:3, title:'Estalla la guerra',
    text:'Loen entra en guerra con Intis y Feysac. Conscripción, racionamiento, trenes llenos de soldados que saludan desde las ventanillas.',
    effect:{allCities:{prosperity:-12, security:-10}, war:true, mood:{mi9:'movilizado'}}},
  {id:'backlund_bombing', year:1357, month:4, city:'backlund', importance:3, title:'Bombardeo de Backlund',
    text:'Dirigibles enemigos bombardean Backlund. Barrios enteros desaparecen en una noche.',
    effect:{city:{backlund:{prosperity:-10, security:-12}}, killsInCity:'backlund', playerHarm:{salud:[-20,-5]}}},
  {id:'war_ends', year:1358, month:8, importance:3, title:'Fin de la guerra',
    text:'Se firma la paz. Nadie celebra demasiado: todos tienen a alguien que no vuelve.',
    effect:{allCities:{prosperity:6, security:8}, war:false, mood:{mi9:'normal'}}},
  {id:'fifth_epoch_omens', year:1365, month:1, importance:3, title:'Presagios del fin de una época',
    text:'Estrellas que se mueven, lunas rojas, milagros y horrores en todas partes. Los viejos dicen que la Quinta Época se está terminando.',
    effect:{mysticBoost:0.4}}
];

// Historia "libre": moldes con los que se sortea la historia propia de cada
// vida (§44: rejugabilidad). {city} se reemplaza por una ciudad al azar.
const RANDOM_HISTORY = [
  {id:'rh_epidemic', importance:2, title:'Epidemia en {city}', text:'Una fiebre desconocida se lleva a cientos en {city}. Los médicos no se ponen de acuerdo; las iglesias, tampoco.',
    effect:{cityVar:{prosperity:-6, security:-4}, killsInCityVar:true, playerHarm:{salud:[-12,-4]}}},
  {id:'rh_bank_crash', importance:2, title:'Quiebra el Banco de {city}', text:'Un banco centenario cierra sus puertas un lunes a la mañana. Miles pierden sus ahorros en un día.',
    effect:{cityVar:{prosperity:-12}, bankHit:0.3}},
  {id:'rh_fire', importance:2, title:'El gran incendio de {city}', text:'Un incendio consume media docena de manzanas en {city}. Algunos dicen que el fuego se movía contra el viento.',
    effect:{cityVar:{prosperity:-5, security:-5}}},
  {id:'rh_short_war', importance:3, title:'Una guerra corta', text:'Loen entra en una guerra "breve" que dura dos años. Nadie vuelve igual.',
    effect:{allCities:{prosperity:-8, security:-8}, war:true, endsAfter:24}},
  {id:'rh_new_church', importance:1, title:'Una fe nueva en {city}', text:'Un predicador carismático llena plazas enteras en {city}. Las iglesias ortodoxas lo miran con recelo.',
    effect:{cityVar:{security:-2}, mood:{church:'investigando'}}},
  {id:'rh_boom', importance:1, title:'Prosperidad en {city}', text:'Llega el ferrocarril, abren fábricas, sube el salario: {city} vive su mejor década.',
    effect:{cityVar:{prosperity:14, security:4}}},
  {id:'rh_disappearances', importance:2, title:'Las desapariciones de {city}', text:'Durante un invierno entero desaparece gente en {city}. La policía nunca da explicaciones. En primavera, se detiene.',
    effect:{cityVar:{security:-10}, mood:{nighthawks:'operando'}, mysticBoost:0.1}},
  {id:'rh_miracle', importance:2, title:'El milagro de {city}', text:'Cientos de personas ven, a la misma hora, una luz en el cielo de {city}. Los enfermos del hospital amanecen curados. Todos menos uno.',
    effect:{mysticBoost:0.15}}
];
