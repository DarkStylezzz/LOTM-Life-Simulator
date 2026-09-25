'use strict';
/* =========================================================================
   data/events/tarot.js — el Tarot Club como sistema especial (§28).
   No hay un botón "unirse". El camino es: rumores → pistas → contacto →
   condiciones → ser observado (pruebas que no sabés que son pruebas) →
   invitación a la niebla gris → reuniones → confianza del grupo → secretos.
   El estado vive en STATE.tarot (ver systems/tarot.js). Las "pruebas" son
   dilemas morales comunes cuyo verdadero juez está muy por encima de la
   niebla: el jugador no ve que están siendo evaluadas.
   ========================================================================= */
const EVENTS_TAROT = [
  {id:'tarot_test_wallet', type:'tarot', rarity:'uncommon', tags:['tarot','test'], weight:5, cooldown:36, narrativeImportance:3,
    hiddenRequirements:()=>STATE.tarot.stage>=2 && STATE.tarot.stage<6,
    title:'Una billetera ajena', text:'En la calle, un anciano deja caer una billetera gorda sin darse cuenta. Nadie más la vio.',
    choices:[
      {label:'Devolvérsela', small:'No es tuya.', run:()=>{ tarotObserve(12, 'devolviste lo ajeno'); applyEffects({reputation:[0,2]}); return 'El anciano te agradece con una reverencia antigua. Tiene los ojos de alguien mucho más joven.'; }},
      {label:'Quedártela', small:'Nadie lo va a saber.', run:()=>{ tarotObserve(-15, 'te quedaste con lo ajeno'); applyEffects({cash:[40,120]}); return 'Adentro hay plata y una carta de tarot en blanco. La carta, a la mañana siguiente, ya no está.'; }}
    ]},
  {id:'tarot_test_wounded', type:'tarot', rarity:'uncommon', tags:['tarot','test','beyonder'], weight:5, cooldown:36, narrativeImportance:3,
    hiddenRequirements:()=>STATE.tarot.stage>=2 && STATE.tarot.stage<6 && STATE.flags.mysticExposure>=15,
    title:'Alguien herido', text:'En un callejón, un hombre sangra de una herida que no hizo ningún cuchillo. Te mira: sabe que vos sabés lo que es.',
    choices:[
      {label:'Ayudarle y no hacer preguntas', small:'Es alguien que sufre.', run:()=>{ tarotObserve(15, 'ayudaste sin preguntar'); applyEffects({salud:[-4,0], exposure:2}); if(chance(0.4)) applyEffects({clue:{pathway:'$random', reliability:'real', strength:[3,6], source:'el herido del callejón'}}); return 'Lo sostenés hasta que deja de sangrar. Se va antes del amanecer. Deja en tu bolsillo una moneda que no es de ningún reino.'; }},
      {label:'Llamar a la Iglesia', small:'Que se encarguen los que saben.', run:()=>{ tarotObserve(-5, 'lo entregaste'); factionAdjust('church', {trust:4}); return 'La Iglesia llega rápido. Demasiado rápido. Al herido lo suben a un carruaje sin ventanas.'; }},
      {label:'Irte', small:'No es tu problema.', run:()=>{ tarotObserve(-10, 'te fuiste'); return 'Te vas. La imagen te persigue varias noches.'; }}
    ]},
  {id:'tarot_test_secret', type:'tarot', rarity:'uncommon', tags:['tarot','test'], weight:4, cooldown:36, narrativeImportance:3,
    hiddenRequirements:()=>STATE.tarot.stage>=3 && STATE.tarot.stage<6 && loreCount()>=3,
    title:'Alguien que quiere saber', text:'Un desconocido muy educado te ofrece una suma absurda por "cualquier cosa que sepa usted sobre ciertos clubes que se reúnen en sueños".',
    choices:[
      {label:'Venderle lo que sabés', small:'Mucho dinero.', run:()=>{ tarotObserve(-25, 'vendiste lo que sabías'); applyEffects({cash:[200,500], attention:3}); return 'Paga sin regatear. Se va con una sonrisa que no te gusta nada.'; }},
      {label:'Decirle que no sabés nada', small:'Discreción.', run:()=>{ tarotObserve(15, 'supiste callar'); return 'Te mira con algo parecido al respeto. "Por supuesto que no." Se va.'; }}
    ]},
  {id:'tarot_watched', type:'tarot', rarity:'uncommon', tags:['tarot'], weight:6, cooldown:12,
    hiddenRequirements:()=>STATE.tarot.stage>=3 && STATE.tarot.stage<6 && STATE.tarot.observed>=20,
    run:()=>{ STATE.tarot.stage = Math.max(STATE.tarot.stage, 4); applyEffects({sanity:[-2,1]});
      return {title:'Una mirada desde arriba', text:'A veces, en medio de algo cotidiano, sentís una mirada que no viene de ningún lado. Viene de arriba. De mucho más arriba que el techo, que las nubes. No es hostil. Es... atenta.'}; }},
  {id:'tarot_invitation', type:'tarot', rarity:'rare', tags:['tarot','invitation'], weight:10, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>tarotInvitationReady(),
    title:'La niebla gris', text:'Estás por dormirte cuando el techo se abre en una niebla gris infinita. Te encontrás sentado en una silla de respaldo alto, frente a una mesa larga de bronce, en un palacio que flota sobre la nada. En la cabecera, una figura envuelta en niebla te observa. Una voz tranquila dice: "Bienvenido al Tarot Club."',
    choices:[
      {label:'Aceptar un lugar en la mesa', small:'Nadie llega acá por pedirlo.', run:()=>tarotJoin()},
      {label:'Pedir volver', small:'No estás listo.', run:()=>{ STATE.tarot.stage = 5; STATE.tarot.declined = (STATE.tarot.declined||0)+1; STATE.tarot.lastDecline = STATE.time.totalMonths; tarotObserve(-10, 'pediste volver');
        return 'La figura inclina apenas la cabeza. La niebla se cierra. Te despertás en tu cama, con el corazón desbocado y la certeza de que eso no fue un sueño.'; }}
    ]},
  {id:'tarot_meeting', type:'tarot', rarity:'common', tags:['tarot','meeting'], weight:0, cooldown:0, chainOnly:true, narrativeImportance:3,
    title:'Reunión del Tarot Club', text:()=>tarotMeetingText(),
    choices:[
      {label:'Compartir algo que sabés', small:'Un secreto a cambio de confianza.', requires:()=>tarotShareableLore().length>0, run:()=>tarotShareSecret()},
      {label:'Pedir una fórmula', small:'Cuesta mucha confianza.', requires:()=>tarotCanRequestFormula(), run:()=>tarotRequestFormula()},
      {label:'Ofrecer una Característica o un ingrediente', small:'Algo concreto a cambio de algo concreto.', requires:()=>tarotTradeables().length>0, run:()=>tarotTrade()},
      {label:'Pedir ayuda con un problema', small:'Los demás miembros también tienen recursos.', run:()=>tarotAskHelp()},
      {label:'Escuchar en silencio', small:'Observar a los demás.', run:()=>tarotListen()}
    ]}
];
