'use strict';
/* =========================================================================
   data/enemies.js — enemigos, entornos y estados de combate (§24, §25).
   Cada enemigo tiene un ARQUETIPO que define cómo pelea:
   - human:     ataca de frente; si le va mal, puede rendirse o huir.
   - smart:     un Beyonder inteligente: primero observa, después golpea
                donde duele (estados, puntos débiles).
   - desperate: normal hasta que lo acorralan; ahí hace algo terrible
                (un acto suicida, una habilidad peligrosa, transformarse).
   - creature:  lo sobrenatural puro: impredecible (grita, se desvanece,
                se regenera, cambia de distancia).
   Los enemigos NO escalan automáticamente con el jugador (§59): un Beyonder
   hostil puede ser mucho más fuerte que vos, y huir es una opción real.
   seq: Sequence real (oculta hasta que se investiga — ver systems/combat.js).
   ========================================================================= */
const ENEMIES = {
  // ---------------- mundanos ----------------
  mugger:  {name:'Asaltante callejero', archetype:'human', tier:'mundane', w:10, hp:[14,22], dmg:[3,7], defense:1, sanityDmg:[0,0], corruptionDmg:[0,0], fleeChance:0.55, seq:null,
            talk:0.35, reward:{cash:[10,35]}, env:['alley','street','night'], desc:'Un tipo te acorrala en un callejón oscuro y te exige el dinero.'},
  drunk:   {name:'Borracho pendenciero', archetype:'human', tier:'mundane', w:8, hp:[18,26], dmg:[4,9], defense:1, sanityDmg:[0,2], corruptionDmg:[0,0], fleeChance:0.6, seq:null,
            talk:0.5, reward:{cash:[0,15]}, env:['street','night'], desc:'Alguien decide que sos el blanco perfecto para descargar su mala noche.'},
  thugs:   {name:'Banda callejera', archetype:'human', tier:'mundane', w:4, hp:[30,42], dmg:[6,14], defense:3, sanityDmg:[1,4], corruptionDmg:[0,0], fleeChance:0.4, seq:null,
            talk:0.2, reward:{cash:[0,25]}, env:['street','alley','docks'], desc:'Varios te rodean a la salida de un bar. Esto se puede poner feo.'},
  hitman:  {name:'Asesino a sueldo', archetype:'smart', tier:'mundane', w:0, hp:[26,34], dmg:[7,13], defense:3, sanityDmg:[1,3], corruptionDmg:[0,0], fleeChance:0.3, seq:null,
            talk:0.1, reward:{cash:[20,60]}, env:['alley','night','home'], desc:'Alguien pagó para que esto parezca un robo que salió mal.'},

  // ---------------- místicos ----------------
  nightStalker:{name:'Algo en la niebla', archetype:'creature', tier:'mystic', w:6, hp:[26,36], dmg:[5,12], defense:2, sanityDmg:[4,10], corruptionDmg:[1,4], fleeChance:0.35, seq:null,
            reward:{cash:[0,10], clue:8}, env:['fog','night','alley'], desc:'Una silueta se mueve donde no debería haber nada. No es humana.'},
  lesserSpirit:{name:'Espíritu menor errante', archetype:'creature', tier:'mystic', w:5, hp:[32,44], dmg:[6,14], defense:2, sanityDmg:[8,16], corruptionDmg:[3,8], fleeChance:0.45, seq:null,
            reward:{cash:0, clue:12, clueBias:['death','darkness']}, env:['cemetery','night','home'], desc:'El aire se enfría de golpe. Algo te observa desde ningún lugar en particular.'},
  cultist: {name:'Fiel poseído', archetype:'desperate', tier:'mystic', w:4, hp:[40,55], dmg:[8,16], defense:4, sanityDmg:[6,14], corruptionDmg:[2,6], fleeChance:0.3, seq:8, pathway:'hangedMan',
            talk:0.05, reward:{cash:[20,60], clue:10, characteristic:0.15}, env:['alley','sewer','ruins'],
            req:()=>!!STATE.pathway.chosenPathway || maxPathwayKnowledge()>=35,
            desc:'Sus ojos brillan mal. Murmura en una lengua que no deberías reconocer, y sin embargo la reconocés.'},
  rivalBeyonder:{name:'Beyonder hostil', archetype:'smart', tier:'mystic', w:1, hp:[55,75], dmg:[10,22], defense:6, sanityDmg:[10,20], corruptionDmg:[4,10], fleeChance:0.22, seq:6, pathway:'$random',
            talk:0.1, reward:{cash:[0,40], clue:15, characteristic:0.6}, env:['street','alley','night','docks'],
            req:()=>!!STATE.pathway.chosenPathway,
            desc:'No es un simple fanático: esto es alguien con poder real, y no viene en son de paz.'},
  lostBeyonder:{name:'Beyonder que perdió el control', archetype:'creature', tier:'mystic', w:2, hp:[45,70], dmg:[9,18], defense:4, sanityDmg:[9,18], corruptionDmg:[3,8], fleeChance:0.3, seq:[7,8], pathway:'$random',
            reward:{cash:0, clue:12, characteristic:0.5}, env:['sewer','night','alley','ruins'],
            req:()=>maxPathwayKnowledge()>=25 || !!STATE.pathway.chosenPathway,
            desc:'Fue una persona. Todavía lleva puesto un saco. Lo que asoma por las mangas ya no es un brazo.'},
  wraith:  {name:'Aparecido', archetype:'creature', tier:'mystic', w:3, hp:[28,40], dmg:[5,11], defense:1, sanityDmg:[7,14], corruptionDmg:[1,4], fleeChance:0.4, seq:null,
            reward:{cash:0, clue:9, clueBias:['death']}, env:['cemetery','home','night'],
            desc:'Una figura translúcida repite un gesto una y otra vez. Cuando te ve, deja de repetirlo.'},
  seaBeast:{name:'Cosa del agua', archetype:'creature', tier:'mystic', w:2, hp:[50,68], dmg:[8,17], defense:5, sanityDmg:[6,12], corruptionDmg:[1,4], fleeChance:0.45, seq:null,
            reward:{cash:0, clue:10, clueBias:['tyrant']}, env:['docks'],
            req:()=>currentCity().port,
            desc:'Algo sube por los pilotes del muelle. Tiene demasiadas articulaciones.'},
  forsakenHorror:{name:'Horror de la Tierra Abandonada', archetype:'creature', tier:'mystic', w:0, hp:[80,110], dmg:[14,26], defense:7, sanityDmg:[14,26], corruptionDmg:[5,12], fleeChance:0.25, seq:[5,6], pathway:null,
            reward:{cash:0, clue:20, characteristic:0.3}, env:['ruins'],
            desc:'La tierra misma se levanta y tiene hambre. Esto no debería existir en ningún mapa.'},

  // ---------------- agentes de facciones (aparecen por la amenaza acumulada) ----------------
  nighthawkAgent:{name:'Agente de negro', archetype:'smart', tier:'mystic', w:0, hp:[45,60], dmg:[8,15], defense:5, sanityDmg:[3,8], corruptionDmg:[0,2], fleeChance:0.28, seq:[7,8], pathway:'darkness', faction:'nighthawks',
            talk:0.25, reward:{cash:[0,20], clue:8, characteristic:0.3}, env:['night','alley','street'],
            desc:'Guantes negros, abrigo negro, una calma absoluta. Dice tu nombre completo antes de moverse.'},
  punisher:{name:'Castigador Mandatado', archetype:'human', tier:'mystic', w:0, hp:[55,72], dmg:[10,18], defense:5, sanityDmg:[2,6], corruptionDmg:[0,2], fleeChance:0.25, seq:7, pathway:'tyrant', faction:'storm',
            talk:0.15, reward:{cash:[0,30], clue:8, characteristic:0.3}, env:['docks','street'],
            desc:'Un hombre enorme con un rosario de plata en el puño. No pregunta: sentencia.'},
  mi9Agent:{name:'Agente de MI9', archetype:'smart', tier:'mundane', w:0, hp:[32,44], dmg:[8,14], defense:4, sanityDmg:[1,4], corruptionDmg:[0,0], fleeChance:0.3, seq:null, faction:'mi9',
            talk:0.35, reward:{cash:[10,50], clue:4}, env:['street','home','alley'],
            desc:'Traje gris, placa que muestra un segundo, un revólver que no muestra.'},
  auroraZealot:{name:'Zelote de la Aurora', archetype:'desperate', tier:'mystic', w:0, hp:[34,48], dmg:[7,14], defense:3, sanityDmg:[6,12], corruptionDmg:[2,6], fleeChance:0.38, seq:[8,9], pathway:'hangedMan', faction:'aurora',
            talk:0, reward:{cash:[5,30], clue:10, characteristic:0.35}, env:['sewer','alley','night'],
            desc:'Tiene una sonrisa de iluminado y un cuchillo ceremonial. Reza mientras avanza.'}
};
const ENEMY_KEYS = Object.keys(ENEMIES);
// Pools de encuentros por contexto.
const ENCOUNTER_POOLS = {
  mundane:['mugger','drunk','thugs'],
  mystic:['nightStalker','lesserSpirit','cultist','rivalBeyonder','lostBeyonder','wraith','seaBeast'],
  forsaken:['forsakenHorror','lostBeyonder','nightStalker','lesserSpirit']
};
// Compatibilidad con el sistema anterior (misiones que pedían ENEMY_POOL.mystic.find(...)).
const ENEMY_POOL = {
  mundane: ENCOUNTER_POOLS.mundane.map(k=>Object.assign({id:k}, ENEMIES[k])),
  mystic:  ENCOUNTER_POOLS.mystic.map(k=>Object.assign({id:k}, ENEMIES[k]))
};

/* Entornos: cambian quién tiene ventaja, cuántos testigos hay y qué tan
   fácil es huir. Las vías tienen afinidad con algunos (el mar para Tyrant,
   la noche para Darkness, el cementerio para Death, lo sagrado para Sun). */
const COMBAT_ENVS = {
  street:  {name:'Una calle transitada', witnesses:0.7, flee:0.1,  desc:'Hay gente. Lo que hagas, alguien lo va a ver.'},
  alley:   {name:'Un callejón', witnesses:0.1, flee:-0.1, desc:'Estrecho, sucio y sin salida clara.'},
  fog:     {name:'La niebla', witnesses:0.05, flee:0.2, hide:0.15, desc:'No ves a más de tres pasos. Él tampoco.'},
  night:   {name:'La noche cerrada', witnesses:0.15, flee:0.05, dark:true, desc:'Sin faroles. Sólo contornos.'},
  docks:   {name:'Los muelles', witnesses:0.3, flee:0, water:true, desc:'Madera mojada, agua negra, sogas por todos lados.'},
  cemetery:{name:'Un cementerio', witnesses:0.05, flee:0.05, death:true, desc:'Lápidas, barro y un silencio que escucha.'},
  sewer:   {name:'Las alcantarillas', witnesses:0, flee:-0.15, dark:true, desc:'Agua hasta los tobillos y un olor que no se va más.'},
  forest:  {name:'El bosque', witnesses:0, flee:0.15, hunt:true, desc:'Raíces, sombras y rastros.'},
  ruins:   {name:'Unas ruinas', witnesses:0, flee:-0.05, mysticLand:true, desc:'Piedra vieja que no recuerda haber sido construida.'},
  home:    {name:'Tu propia casa', witnesses:0.4, flee:0.05, desc:'Conocés cada rincón. También sabés quién duerme en la otra habitación.'},
  chapel:  {name:'Una capilla', witnesses:0.2, flee:0, holy:true, desc:'Velas, bancos, una fe que pesa.'}
};
// Afinidad de cada vía con los entornos (bonus de daño y defensa ahí).
const PATHWAY_ENV_AFFINITY = {
  darkness:['night','sewer','fog'], death:['cemetery','night'], tyrant:['docks'], sun:['chapel','street'],
  redPriest:['forest','alley'], twilightGiant:['street','ruins'], door:['alley','sewer'], moon:['forest','night'],
  hangedMan:['night','sewer'], visionary:['street'], fool:['fog','street'], hermit:['ruins'], error:['street','alley'], whiteTower:['street']
};

/* Estados: duran unos turnos y los aplican habilidades, enemigos y objetos. */
const STATUSES = {
  sangrando:  {label:'Sangrando',  dot:[2,4], turns:3, bad:true, desc:'Pierde salud cada turno.'},
  aturdido:   {label:'Aturdido',   skip:true, turns:1, bad:true, desc:'Pierde el próximo turno.'},
  asustado:   {label:'Asustado',   dmgMult:0.7, turns:2, bad:true, desc:'Pega más flojo.'},
  ardiendo:   {label:'Ardiendo',   dot:[3,6], turns:2, bad:true, desc:'Se quema: pierde salud cada turno.'},
  oculto:     {label:'Oculto',     evade:0.6, turns:1, desc:'Difícil de alcanzar.'},
  marcado:    {label:'Marcado',    dmgTaken:1.3, turns:3, bad:true, desc:'Recibe más daño.'},
  confundido: {label:'Confundido', miss:0.4, turns:2, bad:true, desc:'Puede errar el golpe.'},
  debilitado: {label:'Debilitado', dmgMult:0.75, turns:3, bad:true, desc:'Pega más flojo.'},
  furioso:    {label:'Furioso',    dmgMult:1.35, defense:-2, turns:2, desc:'Pega más fuerte, se cuida menos.'},
  protegido:  {label:'Protegido',  dmgTaken:0.5, turns:1, desc:'Recibe la mitad del daño.'},
  dormido:    {label:'Dormido',    skip:true, turns:2, breakOnHit:true, bad:true, desc:'No se mueve hasta que lo golpean.'},
  analizado:  {label:'Analizado',  dmgTaken:1.2, turns:99, bad:true, desc:'Sus puntos débiles están a la vista.'}
};
