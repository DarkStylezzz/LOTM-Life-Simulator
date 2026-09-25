'use strict';
/* =========================================================================
   data/world_events.js — el mundo se mueve solo (§29).
   Ciudades que prosperan o se pudren, organizaciones que reclutan, se
   pelean, investigan, pierden gente y cambian de reputación. Nada de esto
   lo dispara el jugador. Cada evento recibe la ciudad afectada (city) y
   devuelve el titular. Los trece primeros son los del sistema anterior.
   ========================================================================= */
const WORLD_EVENTS = [
  // --- ciudad ---
  {w:5, run:(city)=>{ cityAdjust(city, {prosperity:rndInt(3,9)}); return 'Una nueva línea de fábricas abre en las afueras. Hay trabajo y hay ruido.'; }},
  {w:5, run:(city)=>{ cityAdjust(city, {prosperity:-rndInt(3,9)}); return 'Cierra una de las industrias grandes de la zona. Mucha gente queda en la calle.'; }},
  {w:4, run:(city)=>{ cityAdjust(city, {security:rndInt(4,10)}); return 'La policía refuerza las patrullas nocturnas tras una seguidilla de robos.'; }},
  {w:4, run:(city)=>{ cityAdjust(city, {security:-rndInt(4,11)}); worldNpcRumor(city, 'missing'); return 'Corre el rumor de que hubo varias desapariciones cerca del puerto. Nadie da explicaciones.'; }},
  {w:3, run:(city)=>{ cityAdjust(city, {prosperity:-rndInt(2,6), security:-rndInt(2,6)}); return 'Una epidemia menor obliga a cerrar barrios enteros durante semanas.'; }},
  {w:3, run:(city)=>{ cityAdjust(city, {prosperity:rndInt(2,6), security:rndInt(1,4)}); return 'El tendido de gas y alumbrado llega a barrios donde antes no había nada.'; }},
  {w:2, run:(city)=>{ cityAdjust(city, {security:-rndInt(5,13)}); return 'Estalla un conflicto obrero que termina a los tiros. La ciudad queda tensa durante meses.'; }},

  // --- facciones (originales) ---
  {w:4, run:(city)=>{ factionMood('church','reclutando'); factionAdjust('church', {publicRep:rndInt(1,3)}, true); factionStrength('church', 3);
    return 'La Iglesia de la Diosa de la Noche Eterna abre convocatoria pública. Se la ve por todos lados.'; }},
  {w:3, run:(city)=>{ factionMood('church','investigando'); return 'Se comenta que la Iglesia está investigando algo que no quiere nombrar en voz alta.'; }},
  {w:3, req:()=>STATE.factions.nighthawks.known, run:(city)=>{ factionMood('nighthawks','operando'); cityAdjust(city, {security:rndInt(3,8)});
    return 'Los Nighthawks aparecen operando de noche en varios barrios. Después, silencio.'; }},
  {w:2, run:(city)=>{ factionMood('nighthawks','investigando'); return 'Hay gente haciendo preguntas puerta por puerta. No dicen para quién trabajan.'; }},
  {w:2, run:(city)=>{ const a = pick(['church','nighthawks']); factionMood(a,'en conflicto'); factionMood('aurora','en conflicto'); cityAdjust(city, {security:-rndInt(3,8)});
    factionStrength(a, -rndInt(2,6)); factionStrength('aurora', -rndInt(3,8));
    return 'Dos organizaciones que nadie termina de nombrar chocan por algo. Hay heridos que nunca llegan a los diarios.'; }},
  {w:2, run:(city)=>{ ['church','nighthawks','storm','machinery','mi9','psychology'].forEach(k=>{ if(STATE.world.factionMood[k]!=='movilizado') factionMood(k,'normal'); });
    return 'Después de un tiempo movido, todo vuelve a una calma aparente.'; }},
  {w:2, req:()=>STATE.factions.tarotClub.discovered, run:(city)=>{ factionMood('tarotClub','activo');
    return 'El Tarot Club se mueve. Vos lo notás porque sabés qué mirar; el resto de la ciudad, no.'; }},

  // --- facciones (nuevos, con consecuencias) ---
  {w:3, req:()=>factionStrengthOf('aurora') >= 40, run:(city)=>{ factionMood('aurora','activa'); cityAdjust(city, {security:-rndInt(4,9)}); worldNpcRumor(city, 'cult');
    return 'Aparecen símbolos de un sol negro pintados en las iglesias. Una semana después, un incendio en un orfanato. La Orden de la Aurora no firma sus obras, pero todos saben.'; }},
  {w:2, run:(city)=>{ factionMood('mi9','investigando'); if(STATE.world.attention>=40) factionAdjust('mi9', {suspicion:rndInt(2,5)}, true);
    return 'Detienen a un profesor universitario "por espionaje". Nadie vuelve a saber de él. MI9 revisa registros de toda la ciudad.'; }},
  {w:2, req:()=>currentCity().port, run:(city)=>{ factionMood('storm','dominando el puerto'); factionStrength('storm', 3);
    return 'La Iglesia de las Tormentas toma el control de los muelles "para proteger a la flota". Los Castigadores patrullan de día y de noche.'; }},
  {w:2, run:(city)=>{ cityAdjust(city, {prosperity:rndInt(2,5)}); factionStrength('machinery', 3);
    return 'La Iglesia del Vapor presenta una máquina nueva en la plaza central. La gente aplaude. Algunos ingenieros no aplauden: toman nota.'; }},
  {w:2, run:(city)=>{ const f = pick(['church','nighthawks','storm','mi9']); factionStrength(f, -rndInt(4,9)); worldNpcRumor(city, 'faction_death', f);
    return `${cap(factionShort(f))} pierde gente en una operación que nunca se explica. Hay entierros discretos, de noche.`; }},
  {w:2, run:(city)=>{ const f = pick(['church','storm']); factionAdjust(f, {publicRep:-rndInt(2,6)}, true);
    return `Un escándalo sacude a ${factionShort(f)}: un sacerdote, una caja de donaciones y una amante. Los fieles murmuran.`; }},
  {w:1, run:(city)=>{ factionMood('psychology','reclutando');
    return 'Abre un consultorio de "medicina de la mente" en un barrio elegante. Atiende gratis a los que sueñan cosas raras.'; }}
];
