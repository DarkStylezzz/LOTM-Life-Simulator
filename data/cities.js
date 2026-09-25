'use strict';
/* =========================================================================
   data/cities.js — ciudades del mundo (§29, §32, §44).
   Cada ciudad tiene su propia economía, seguridad, densidad de lo oculto y
   presencia de facciones. El estado vivo de cada una (prosperidad y
   seguridad actuales) se guarda en STATE.world.cities y se mueve solo.
   "name" es lo que se guarda en character.ciudad (compatibilidad con saves
   viejos, que guardaban el nombre visible).
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
    factions:{ church:0.8, nighthawks:0.3, storm:0.2, machinery:0.2, aurora:0.25, mi9:0.15, psychology:0.1, tarotClub:1 } }
};
const CITY_KEYS = Object.keys(CITIES_DATA);
const CLASSES = ['Baja','Media','Alta'];
function cityKeyByName(name){
  const k = CITY_KEYS.find(k=>CITIES_DATA[k].name === name);
  return k || 'menor';
}
