'use strict';
/* =========================================================================
   data/research.js — investigación mística y rumores (§15, §41).
   Cada método tiene su perfil: probabilidad de pista real, de secreto, de
   pista falsa, de abrir una nueva pista a seguir, de conocer a alguien, o de
   no encontrar nada — y sus riesgos (atención del mundo, corrupción,
   cordura, combate). systems/research.js modifica esas probabilidades según
   la educación, los rasgos, la vía, la ciudad y la suerte del personaje.
   ========================================================================= */
const RESEARCH_METHODS = {
  library:{ name:'Visitar la biblioteca', time:1, cost:0, ageMin:13, risk:'Baja', skill:'study',
    desc:'Catálogos, hemerotecas y libros que nadie pidió en años.',
    odds:{clue:0.40, secret:0.08, falseLead:0.20, lead:0.12, contact:0.03, nothing:0.17},
    gain:[2,5], attention:[0,1], cityLibrary:true },
  church:{ name:'Visitar la iglesia', time:1, cost:0, ageMin:13, risk:'Baja', skill:'social',
    desc:'Preguntas discretas a un sacerdote, archivos parroquiales, confesiones que no son tuyas.',
    odds:{clue:0.28, secret:0.08, falseLead:0.12, lead:0.12, contact:0.10, nothing:0.30},
    gain:[1,4], attention:[0,1], clueBias:['darkness','death','sun'], contactFaction:'church' },
  symbol:{ name:'Investigar un símbolo', time:1, cost:25, ageMin:14, risk:'Media', skill:'study',
    desc:'Un símbolo que viste donde no debía estar. Alguien lo dibujó por una razón.',
    needs:{item:'doc_symbol', orFlag:'seenSymbol'},
    odds:{clue:0.48, secret:0.14, falseLead:0.20, lead:0.08, contact:0, nothing:0.10},
    gain:[3,7], attention:[1,2], corruptionChance:0.12, sanity:[-3,0] },
  document:{ name:'Estudiar un documento', time:1, cost:0, ageMin:14, risk:'Media', skill:'study',
    desc:'Cartas, informes, páginas sueltas: papeles que alguien no quería que leyeras.',
    needs:{itemCat:'document'},
    odds:{clue:0.32, secret:0.22, falseLead:0.12, lead:0.22, contact:0.02, nothing:0.10},
    gain:[3,6], attention:[0,2] },
  interrogate:{ name:'Interrogar a alguien', time:1, cost:0, ageMin:15, risk:'Media', skill:'social',
    desc:'Hacer las preguntas correctas a quien sabe algo. Sin que se note demasiado.',
    needs:{npc:true},
    odds:{clue:0.30, secret:0.30, falseLead:0.15, lead:0.10, contact:0, nothing:0.15},
    gain:[2,6], attention:[0,2], suspicionRisk:0.35 },
  clandestine:{ name:'Seguir una pista clandestina', time:1, cost:90, ageMin:16, risk:'Alta', skill:'street',
    desc:'Tabernas de los muelles, prestamistas, gente que vende información y a veces personas.',
    odds:{clue:0.34, secret:0.26, falseLead:0.10, lead:0.12, contact:0.08, nothing:0.10},
    gain:[4,9], attention:[2,5], corruptionChance:0.1, combatChance:0.08, sanity:[-3,0] },
  mystic:{ name:'Consultar a un místico', time:1, cost:160, ageMin:18, risk:'Media-Alta', skill:'occult',
    desc:'Una adivina, un médium, un anticuario que sabe demasiado. Cobran caro, y a veces aciertan.',
    needs:{mysticContact:true},
    odds:{clue:0.50, secret:0.20, falseLead:0.10, lead:0.10, contact:0, nothing:0.10},
    gain:[5,10], attention:[1,3], corruptionChance:0.06, verify:true }
};
const RESEARCH_ORDER = ['library','church','symbol','document','interrogate','clandestine','mystic'];
Object.keys(RESEARCH_METHODS).forEach(k=>{ RESEARCH_METHODS[k].id = k; });

/* ---------------------------------------------------------------------
   RUMORES Y PISTAS (§41)
   Cada rumor, al aparecer, sortea en secreto qué hay detrás (outcomes con
   peso). El jugador no lo sabe: puede ignorarlo o seguirlo, y seguirlo
   lleva varios pasos (cada uno cuesta tiempo). Puede terminar en una vía,
   una persona, una facción, un objeto, un secreto, un peligro... o en nada.
   Los rumores se enfrían: si no los seguís, se pierden (§2: "las
   oportunidades pueden desaparecer").
   outcome.type: pathway | npc | faction | item | secret | danger | nothing | false | tarot
--------------------------------------------------------------------- */
const RUMOR_POOL = [
  {id:'dead_speaker', text:'Dicen que en el barrio viejo hay alguien que puede hablar con los muertos.', steps:2,
    outcomes:[
      {w:45, type:'npc', pathway:'death', role:'Médium del barrio viejo', result:'La encontrás. No es una estafadora: los muertos le contestan, y le contestan cosas que nadie más sabe.'},
      {w:35, type:'nothing', result:'Era una estafadora con muy buen oído y mejor memoria. Nada más.'},
      {w:20, type:'danger', enemy:'wraith', result:'La casa está vacía. Bueno: vacía de vivos.'}
    ]},
  {id:'dream_club', text:'Se comenta que hay gente que se reúne en sueños, sobre una niebla gris.', steps:3,
    outcomes:[
      {w:40, type:'tarot', result:'Las pistas llevan a una sola palabra repetida en cartas y conversaciones: "Tarot". Y a alguien que se hace llamar El Loco.'},
      {w:20, type:'pathway', pathway:'visionary', result:'No era un club: era un fenómeno de sueños compartidos que alguien estudia en serio.'},
      {w:40, type:'nothing', result:'Borrachos, poetas y un grupo de espiritistas aficionados. Nadie sueña con ninguna niebla.'}
    ]},
  {id:'night_bookshop', text:'Hay una librería que sólo abre de noche y vende libros que no existen.', steps:2,
    outcomes:[
      {w:50, type:'item', items:['book_grimoire','book_untitled','book_astrology','book_herbal'], result:'La encontrás. El librero no pregunta tu nombre. Te vende un libro que no figura en ningún catálogo.'},
      {w:20, type:'danger', attention:4, result:'Alguien anota tu cara cuando entrás. No volvés a ver la librería.'},
      {w:30, type:'nothing', result:'Una librería de viejo común, con un dueño insomne. Nada más.'}
    ]},
  {id:'ghost_ship', text:'Un barco llegó al puerto sin tripulación, con la mesa servida y la comida todavía caliente.', steps:2, port:true,
    outcomes:[
      {w:40, type:'pathway', pathway:'tyrant', result:'En el diario de a bordo, la última página habla de una tormenta que "sabía el nombre de cada uno".'},
      {w:30, type:'danger', enemy:'seaBeast', result:'La tripulación no se fue. Está debajo del casco.'},
      {w:30, type:'nothing', result:'Un motín, un bote salvavidas faltante y mucha imaginación del puerto.'}
    ]},
  {id:'church_dreams', text:'La Iglesia estaría buscando, en voz baja, gente que tiene sueños demasiado nítidos.', steps:2,
    outcomes:[
      {w:50, type:'faction', faction:'church', result:'Un diácono te entrevista "por un asunto pastoral". Hace preguntas muy precisas. Te deja una dirección por si algún día necesitás algo.'},
      {w:30, type:'nothing', result:'Una campaña de confesiones. Nada más oculto que eso.'},
      {w:20, type:'false', pathway:'darkness', result:'Te convencés de que hay algo ahí, aunque nadie te lo confirma.'}
    ]},
  {id:'sleepless_man', text:'Hay un hombre que nunca duerme: lo ven en la calle a cualquier hora, siempre con el mismo abrigo negro.', steps:2,
    outcomes:[
      {w:45, type:'npc', pathway:'darkness', faction:'nighthawks', role:'Hombre del abrigo negro', result:'Te encuentra él a vos antes de que lo encuentres. Sabe tu nombre. Te sugiere, con mucha amabilidad, que dejes de buscarlo.'},
      {w:25, type:'pathway', pathway:'darkness', result:'Nunca lo alcanzás, pero en su recorrido hay un patrón: vigila algo, noche tras noche.'},
      {w:30, type:'nothing', result:'Un sereno con insomnio crónico y muy mala suerte en la vida.'}
    ]},
  {id:'moon_herbalist', text:'Una herborista del mercado vende remedios que funcionan demasiado bien.', steps:1,
    outcomes:[
      {w:50, type:'npc', pathway:'moon', role:'Herborista del mercado', result:'Te vende un remedio y te mira a los ojos demasiado tiempo. "Vos también tenés hambre de algo", dice.'},
      {w:20, type:'item', items:['remedy','book_herbal'], result:'No te cuenta nada, pero te vende algo que funciona.'},
      {w:30, type:'nothing', result:'Hierbas buenas y mucha fama. Nada imposible.'}
    ]},
  {id:'memory_thief', text:'Dicen que hay un ladrón que roba recuerdos: sus víctimas no saben qué les falta.', steps:3,
    outcomes:[
      {w:40, type:'pathway', pathway:'error', result:'Las víctimas comparten un detalle: todos se cruzaron con un hombre de monóculo que sonreía.'},
      {w:25, type:'danger', attention:3, sanity:[-6,-2], result:'Una tarde volvés a tu casa y no recordás qué hiciste en las últimas tres horas.'},
      {w:35, type:'nothing', result:'Borrachos que no se acuerdan de lo que gastaron. Nada más.'}
    ]},
  {id:'detective', text:'Un detective privado resuelve casos imposibles. Dicen que "lo sabe todo" con sólo mirar.', steps:2,
    outcomes:[
      {w:45, type:'npc', pathway:'whiteTower', role:'Detective privado', result:'Te mira dos segundos y te dice tres cosas de tu vida que nadie sabe. Después te ofrece un café.'},
      {w:35, type:'nothing', result:'Un detective muy bueno. Sólo eso. A veces la gente es simplemente buena en su trabajo.'},
      {w:20, type:'false', pathway:'visionary', result:'Salís convencido de que lee mentes. Nadie te lo confirma.'}
    ]},
  {id:'quick_power', text:'Un grupo promete a los desesperados "un poder que cambia la vida", a cambio de una ofrenda.', steps:2,
    outcomes:[
      {w:55, type:'faction', faction:'aurora', result:'Te reciben en un sótano con velas. Te hablan de un Creador traicionado. Te ofrecen todo. Sólo piden "un poco de fe". Y de sangre.'},
      {w:25, type:'danger', enemy:'cultist', result:'La ofrenda eras vos.'},
      {w:20, type:'nothing', result:'Estafadores de desesperados. Te vas antes de que te pidan plata.'}
    ]},
  {id:'black_market_rumor', text:'En los muelles hay un lugar donde se consigue cualquier cosa, incluso lo que no existe.', steps:2,
    outcomes:[
      {w:60, type:'secret', lore:'black_market', result:'Detrás de una casa de empeño, una escalera baja a un depósito. Ahí se vende lo imposible.'},
      {w:20, type:'danger', enemy:'thugs', result:'Preguntaste demasiado en el lugar equivocado.'},
      {w:20, type:'nothing', result:'Contrabando común: tabaco, whisky y relojes robados.'}
    ]},
  {id:'forest_hunter', text:'En el bosque de las afueras hay alguien que caza cosas que "oficialmente" no existen.', steps:2,
    outcomes:[
      {w:45, type:'npc', pathway:'redPriest', role:'Cazador del bosque', result:'Lo encontrás desollando algo con demasiadas patas. No parece sorprendido de verte.'},
      {w:25, type:'pathway', pathway:'redPriest', result:'Encontrás sus trampas: están hechas para presas que no deberían existir.'},
      {w:30, type:'nothing', result:'Un cazador furtivo con historias exageradas.'}
    ]},
  {id:'singing_chapel', text:'En una capilla abandonada se oye cantar de noche, y las velas se encienden solas.', steps:2,
    outcomes:[
      {w:45, type:'pathway', pathway:'sun', result:'Alguien canta ahí, sí. Y la luz responde a su canto.'},
      {w:20, type:'danger', enemy:'wraith', result:'El que canta murió hace cuarenta años.'},
      {w:35, type:'nothing', result:'Un coro de aficionados que ensaya de noche para no molestar a nadie.'}
    ]},
  {id:'wandering_door', text:'En una calle del centro hay una puerta que aparece y desaparece.', steps:2,
    outcomes:[
      {w:45, type:'pathway', pathway:'door', result:'La ves. Está ahí un minuto, entreabierta. Del otro lado hay un cielo que no es de esta ciudad.'},
      {w:20, type:'item', items:['doc_map'], result:'La puerta no aparece, pero alguien dejó un mapa marcado justo donde debería estar.'},
      {w:15, type:'danger', sanity:[-6,-2], attention:2, result:'Cruzás. No sabés cuánto tiempo estuviste del otro lado.'},
      {w:20, type:'nothing', result:'Una puerta de servicio que usan de noche. Nada más.'}
    ]},
  {id:'painless_boxer', text:'Un boxeador invicto de los galpones no siente dolor, dicen.', steps:1,
    outcomes:[
      {w:45, type:'npc', pathway:'twilightGiant', role:'Boxeador invicto', result:'No siente dolor. Pero sí siente algo cuando te mira: te reconoce como a alguien "del otro lado".'},
      {w:55, type:'nothing', result:'Siente dolor. Simplemente es muy, muy terco.'}
    ]},
  {id:'cipher_letters', text:'Alguien deja cartas cifradas debajo de los bancos de la plaza.', steps:2,
    outcomes:[
      {w:50, type:'item', items:['doc_cipher'], result:'Te quedás con una antes de que la retiren.'},
      {w:20, type:'faction', faction:'mi9', result:'Un hombre de traje gris te pide, con mucha educación, que dejes de sentarte en esa plaza.'},
      {w:30, type:'nothing', result:'Un juego de enamorados. Cursi, no oculto.'}
    ]},
  {id:'shadow_voice', text:'En un sótano del barrio, una voz ofrece tratos a quien se anime a escucharla.', steps:2,
    outcomes:[
      {w:40, type:'pathway', pathway:'hangedMan', result:'La voz existe, y sabe cosas. Te ofrece más. Te vas antes de contestar.'},
      {w:30, type:'danger', corruption:[2,5], sanity:[-6,-2], result:'Escuchaste demasiado. Algo de lo que dijo se quedó adentro tuyo.'},
      {w:15, type:'faction', faction:'aurora', result:'La voz tiene seguidores. Te invitan a volver.'},
      {w:15, type:'nothing', result:'Un eco en las cañerías y mucha sugestión.'}
    ]},
  {id:'mind_doctor', text:'Un médico de la mente cura locuras que nadie más puede curar.', steps:2,
    outcomes:[
      {w:40, type:'faction', faction:'psychology', result:'Te recibe en un consultorio impecable. Habla de un "mar" que compartimos todos. Te pregunta si alguna vez nadaste en él.'},
      {w:30, type:'npc', pathway:'visionary', role:'Médico de la mente', result:'Es bueno. Demasiado bueno: sabe lo que vas a decir antes de que lo digas.'},
      {w:30, type:'nothing', result:'Un buen médico con métodos modernos. Nada imposible.'}
    ]},
  {id:'fog_island', text:'Una isla que no figura en ningún mapa aparece, a veces, en la niebla del mar.', steps:3, port:true, rare:true,
    outcomes:[
      {w:35, type:'item', artifact:true, result:'Llegás. En la playa hay un cofre podrido y adentro, algo que todavía late.'},
      {w:35, type:'danger', enemy:'seaBeast', sanity:[-8,-3], result:'La isla está habitada. No por personas.'},
      {w:30, type:'nothing', result:'Niebla. Sólo niebla, durante días.'}
    ]}
];
const RUMOR_BY_ID = {};
RUMOR_POOL.forEach(r=>{ RUMOR_BY_ID[r.id] = r; });

// Textos de los pasos intermedios al seguir una pista (según a qué lleva
// en realidad — el jugador no ve el tipo, sólo el texto).
const LEAD_STEP_TEXTS = [
  'Preguntás en el barrio, con cuidado. Alguien te da un nombre, otro te da una calle.',
  'Seguís el rastro hasta un lugar que no esperabas. Hay algo, pero todavía no sabés qué.',
  'Pasás una noche esperando. No pasa nada... hasta que casi te vas.',
  'Un conocido de un conocido acepta hablar, a cambio de que no digas quién te lo dijo.',
  'Encontrás algo que confirma que el rumor no era sólo un rumor. O eso parece.'
];
