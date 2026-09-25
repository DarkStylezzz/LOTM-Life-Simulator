'use strict';
/* =========================================================================
   data/factions.js — organizaciones del mundo (§27, §28, §29).
   Cada facción tiene objetivos propios, rangos, qué vías suele custodiar y
   con quién está enfrentada. El estado de tu vínculo con cada una
   (reputación pública/secreta, confianza, sospecha, nivel de acceso,
   relación, secretos conocidos) vive en STATE.factions — ver
   systems/factions.js.
   ========================================================================= */
const FACTIONS_DATA = {
  church: {
    key:'church', name:'Church of the Evernight Goddess', short:'la Iglesia de la Noche Eterna', kind:'church', publicFace:true,
    desc:'Una de las iglesias ortodoxas del Reino de Loen. De día, misas, caridad y velas; de noche, algo más que nadie nombra en voz alta.',
    goals:['contener lo sobrenatural antes de que el público lo note','custodiar artefactos sellados','sumar fieles en los barrios pobres'],
    pathways:{darkness:3, death:1},
    ranks:['Fiel','Colaborador/a','Diácono/a laico','Guardián/a de reliquias','Obispo/a auxiliar'],
    salary:[0,10,25,45,80],
    enemies:['aurora'],
    secretLore:['church_nighthawks','church_sealed'],
    tag:'Iglesia'
  },
  nighthawks: {
    key:'nighthawks', name:'Nighthawks', short:'los Nighthawks', kind:'secret', parent:'church',
    desc:'El brazo armado —y secreto— de la Iglesia de la Noche Eterna. Cazan lo que no debería existir y archivan lo que no debería saberse.',
    goals:['cazar Beyonders que perdieron el control','recuperar artefactos','que nadie se entere de nada'],
    pathways:{darkness:3},
    ranks:['Informante','Civil de apoyo','Nighthawk','Capitán/a','Diácono/a de alto rango'],
    salary:[5,22,45,75,115],
    enemies:['aurora'],
    secretLore:['nighthawks_losses'],
    tag:'Secreta'
  },
  storm: {
    key:'storm', name:'Church of the Lord of Storms', short:'la Iglesia del Señor de las Tormentas', kind:'church', publicFace:true,
    desc:'La fe de marineros, soldados y hombres que gritan. Sus Castigadores Mandatados no piden permiso para entrar.',
    goals:['dominar los puertos','castigar la herejía','proteger a la flota'],
    pathways:{tyrant:3},
    ranks:['Fiel','Colaborador/a','Castigador/a auxiliar','Castigador/a Mandatado/a','Arzobispo/a del puerto'],
    salary:[0,12,30,55,90],
    enemies:['aurora'],
    secretLore:['storm_punishers'],
    tag:'Iglesia'
  },
  machinery: {
    key:'machinery', name:'Machinery Hivemind', short:'la Mente Colmena de la Maquinaria', kind:'secret', parent:null,
    desc:'Los ejecutores de la Iglesia del Dios del Vapor y la Maquinaria: ingenieros de lo imposible que miden lo sobrenatural como si fuera una caldera.',
    goals:['estudiar y catalogar lo sobrenatural','proteger la industria','superar a las otras iglesias'],
    pathways:{whiteTower:2, hermit:2},
    ranks:['Contacto','Técnico/a colaborador/a','Miembro de la Colmena','Supervisor/a','Engranaje mayor'],
    salary:[5,20,42,70,105],
    enemies:['aurora'],
    secretLore:['machinery_catalog'],
    tag:'Secreta'
  },
  aurora: {
    key:'aurora', name:'Aurora Order', short:'la Orden de la Aurora', kind:'cult',
    desc:'Un culto al "Verdadero Creador". Promete poder rápido a quien esté lo bastante desesperado para pagar el precio.',
    goals:['traer de vuelta al Verdadero Creador','reclutar desesperados','sembrar el caos en las ciudades'],
    pathways:{hangedMan:3, death:1},
    ranks:['Oyente','Iniciado/a','Hermano/a de la Aurora','Sacerdote/isa de la Aurora','Mano del Creador'],
    salary:[0,15,30,50,80],
    enemies:['church','nighthawks','storm','machinery','mi9'],
    secretLore:['aurora_creator'],
    cult:true, tag:'Culto'
  },
  mi9: {
    key:'mi9', name:'MI9', short:'MI9', kind:'state',
    desc:'La inteligencia militar del Reino de Loen. Para ellos, un Beyonder no es un milagro ni una herejía: es un asunto de seguridad nacional.',
    goals:['controlar a los Beyonders del reino','espiar a las iglesias','preparar la próxima guerra'],
    pathways:{redPriest:2, twilightGiant:1},
    ranks:['Fuente','Colaborador/a','Agente','Oficial','Jefe/a de sección'],
    salary:[10,30,55,85,130],
    enemies:['aurora'],
    secretLore:['mi9_registry'],
    tag:'Estado'
  },
  psychology: {
    key:'psychology', name:'Psychology Alchemists', short:'los Alquimistas de la Psicología', kind:'secret',
    desc:'Una sociedad discreta de médicos de la mente... y de algo que está bastante más allá de la mente.',
    goals:['estudiar el inconsciente colectivo','reclutar mentes notables','no llamar la atención de las iglesias'],
    pathways:{visionary:3},
    ranks:['Paciente','Asistente','Alquimista','Analista mayor','Miembro del consejo'],
    salary:[0,18,38,60,95],
    enemies:[],
    secretLore:['psychology_sea'],
    tag:'Secreta'
  },
  tarotClub: {
    key:'tarotClub', name:'Tarot Club', short:'el Tarot Club', kind:'club',
    desc:'Un grupo que se reúne sobre una niebla gris infinita, convocado por alguien que se hace llamar El Loco. Nadie sabe cómo se llega. Nadie llega por pedirlo.',
    goals:['intercambiar lo que nadie más intercambia','sobrevivir a lo que viene','servir —o usar— al Loco'],
    pathways:{fool:2, sun:1, door:1},
    ranks:['Invitado/a','Miembro','Miembro de confianza','Carta mayor','Mano derecha del Loco'],
    salary:[0,0,0,0,0],
    enemies:[],
    secretLore:['tarot_fool'],
    special:true, tag:'Secreta'
  }
};
const FACTION_KEYS = Object.keys(FACTIONS_DATA);
const FACTION_REL_LABEL = {
  desconocida:'Desconocida', neutral:'Neutral', cooperando:'Cooperando', miembro:'Miembro',
  traicionada:'Traicionada', enemiga:'Enemiga', persiguiendo:'Te persigue'
};
const FACTION_ACCESS_LABEL = ['Sin acceso','Contacto','Colaborador/a','Miembro','De confianza','Círculo interno'];
