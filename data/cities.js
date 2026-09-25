'use strict';
/* =========================================================================
   data/cities.js — ciudades del mundo (§29, §32, §44).
   Cada ciudad tiene su propia economía, seguridad, densidad de lo oculto y
   presencia de facciones. El estado vivo de cada una (prosperidad y
   seguridad actuales) se guarda en STATE.world.cities y se mueve solo.
   "name" es lo que se guarda en character.ciudad (compatibilidad con saves
   viejos, que guardaban el nombre visible). travel encarece la mudanza
   (cruzar el estrecho o el océano); names elige los nombres de la gente;
   foreign marca las ciudades fuera de Loen.
   ========================================================================= */
const CITIES_DATA = {
  backlund:{ key:'backlund', name:'Backlund', short:'la capital',
    desc:'La capital del Reino de Loen: niebla de carbón, palacios, fábricas y barrios enteros donde nadie pregunta nada.',
    prosperity:62, security:50, cost:1.35, occult:0.8, library:0.95, port:true,
    factions:{ church:0.9, nighthawks:0.85, storm:0.75, machinery:0.85, aurora:0.6, mi9:0.95, psychology:0.5, tarotClub:1 } },
  tingen:{ key:'tingen', name:'Tingen', short:'Tingen',
    desc:'Una ciudad universitaria tranquila, de calles húmedas y campanas. Demasiado tranquila, dicen algunos.',
    prosperity:55, security:66, cost:0.9, occult:0.55, library:0.8, port:false,
    factions:{ church:0.95, nighthawks:0.95, storm:0.3, machinery:0.4, aurora:0.35, mi9:0.4, psychology:0.25, tarotClub:1 } },
  bayam:{ key:'bayam', name:'Bayam', short:'Bayam',
    desc:'La capital colonial del Archipiélago Rorsted: especias, piratas, calor húmedo y dioses del mar que no figuran en ningún catecismo.',
    prosperity:50, security:38, cost:0.85, occult:0.75, library:0.35, port:true,
    factions:{ church:0.35, nighthawks:0.25, storm:0.95, machinery:0.3, aurora:0.5, mi9:0.6, psychology:0.3, tarotClub:1 } },
  pritz:{ key:'pritz', name:'Pritz Harbor', short:'Pritz Harbor',
    desc:'El gran puerto militar del reino: astilleros, marinos y demasiados secretos de Estado por metro cuadrado.',
    prosperity:56, security:60, cost:1.0, occult:0.5, library:0.5, port:true,
    factions:{ church:0.6, nighthawks:0.55, storm:0.85, machinery:0.65, aurora:0.3, mi9:0.9, psychology:0.2, tarotClub:1 } },
  menor:{ key:'menor', name:'Ciudad menor sin nombre', short:'tu pueblo',
    desc:'Un pueblo de provincia que no figura en los mapas de nadie importante. Todo se sabe, salvo lo que de verdad importa.',
    prosperity:44, security:70, cost:0.7, occult:0.35, library:0.25, port:false,
    factions:{ church:0.8, nighthawks:0.3, storm:0.2, machinery:0.2, aurora:0.25, mi9:0.15, psychology:0.1, tarotClub:1 } },
  // --- ciudades nuevas: otra lengua, otra industria, otra fe, otro continente ---
  trier:{ key:'trier', name:'Trier', short:'Trier', foreign:'Intis', names:'intis', travel:1.8,
    desc:'La capital de la República de Intis, al otro lado del estrecho: cafés, cabarets, pintores y revolucionarios. Debajo de sus calles hay otra Trier, más vieja, que nadie terminó de mapear.',
    prosperity:60, security:48, cost:1.3, occult:0.8, library:0.85, port:false,
    factions:{ church:0.35, nighthawks:0.25, storm:0.2, machinery:0.9, aurora:0.55, mi9:0.5, psychology:0.6, tarotClub:1 } },
  constant:{ key:'constant', name:'Constant', short:'Constant',
    desc:'Una ciudad industrial del interior de Loen: minas de carbón, altos hornos, sindicatos y una Iglesia del Vapor que parece dueña de todo lo que se mueve.',
    prosperity:52, security:46, cost:0.85, occult:0.5, library:0.45, port:false,
    factions:{ church:0.6, nighthawks:0.5, storm:0.2, machinery:0.95, aurora:0.45, mi9:0.45, psychology:0.2, tarotClub:1 } },
  enmat:{ key:'enmat', name:'Enmat Harbor', short:'Enmat',
    desc:'Un puerto de provincia, a unas horas de Tingen: barcazas, contrabando y posadas donde nadie da su nombre verdadero.',
    prosperity:46, security:50, cost:0.8, occult:0.6, library:0.3, port:true,
    factions:{ church:0.7, nighthawks:0.6, storm:0.6, machinery:0.3, aurora:0.4, mi9:0.35, psychology:0.15, tarotClub:1 } },
  balam:{ key:'balam', name:'Balam Oriental', short:'la colonia', foreign:'el Continente del Sur', travel:3,
    desc:'La colonia de Loen en el Continente del Sur: plantaciones, selva, fiebre y las ruinas de un imperio que adoraba a la Muerte. Los nativos no entran de noche a ciertos templos. Los colonos, sí.',
    prosperity:40, security:32, cost:0.75, occult:0.85, library:0.25, port:true,
    factions:{ church:0.4, nighthawks:0.3, storm:0.65, machinery:0.35, aurora:0.55, mi9:0.55, psychology:0.2, tarotClub:1 } }
};
const CITY_KEYS = Object.keys(CITIES_DATA);
// Dónde nace la gente: la mayoría, en Loen; algunos, del otro lado del mar.
const CITY_BIRTH_WEIGHT = {backlund:3, tingen:2, bayam:1.4, pritz:1.4, menor:2, trier:1.2, constant:1.4, enmat:1.1, balam:0.8};
function randomBirthCityKey(){ return wpick(CITY_KEYS, k=>CITY_BIRTH_WEIGHT[k]||1) || 'menor'; }
const CLASSES = ['Baja','Media','Alta'];
function cityKeyByName(name){
  const k = CITY_KEYS.find(k=>CITIES_DATA[k].name === name);
  return k || 'menor';
}
