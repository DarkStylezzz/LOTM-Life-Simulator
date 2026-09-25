'use strict';
/* =========================================================================
   data/lore.js — conocimiento, secretos, saber prohibido y entidades (§16).
   Separación pedida por el rework:
   - fact:      conocimiento oculto "básico" — no cuesta nada saberlo.
   - secret:    secretos del mundo, de facciones o de la ciudad. Algunos son
                llaves (el Método de Actuación, el nombre honorífico del Loco,
                el mercado negro) que abren sistemas enteros.
   - forbidden: saber peligroso. Aprenderlo cuesta Cordura, Corrupción y
                llama la atención de cosas que no deberían mirarte.
   - entity:    saber sobre entidades ocultas. Sube la "amenaza" del mundo.
   El conocimiento POR VÍA (qué tan cerca estás de identificar/comprender
   una Pathway) no vive acá: es systems/pathway.js (pistas y etapas).
   tradeValue: cuánto vale en un intercambio (Tarot Club, facciones).
   ========================================================================= */
const LORE = {
  // ---------------- conocimiento (fact) ----------------
  beyonders_exist: {cat:'fact', title:'Los Beyonders existen', tradeValue:0,
    text:'Hay personas que bebieron pociones imposibles y ya no son del todo humanas. En voz baja las llaman Beyonders.'},
  potions_named: {cat:'fact', title:'Las pociones tienen nombre de oficio', tradeValue:1,
    text:'Cada poción lleva el nombre de un rol: Vidente, Payaso, Cazador, Insomne, Lector... Nadie te explica por qué. No parece un detalle menor.'},
  sequences: {cat:'fact', title:'Las Sequences', tradeValue:1,
    text:'Las vías se recorren de la Sequence 9 a la 0. Cuanto más bajo el número, más poder... y menos de lo que eras antes.'},
  loss_of_control: {cat:'fact', title:'La pérdida de control', tradeValue:1,
    text:'Un Beyonder que avanza demasiado rápido, o que se aleja demasiado de sí mismo, puede perder el control y convertirse en algo que otros tendrán que cazar.'},
  orthodox_churches: {cat:'fact', title:'Las iglesias saben', tradeValue:1,
    text:'Las iglesias ortodoxas no sólo rezan: custodian lo oculto, lo cazan y lo esconden. Cada una a su manera.'},
  characteristics: {cat:'fact', title:'Las Características Beyonder', tradeValue:2,
    text:'Cuando un Beyonder muere, su poder no desaparece: se condensa en una "Característica" que puede reemplazar a los ingredientes principales de una poción de su misma vía y Sequence.'},
  sealed_artifacts: {cat:'fact', title:'Los Artefactos Sellados', tradeValue:1,
    text:'Algunos objetos concentran poder y maldición en partes iguales. Las iglesias los clasifican por grado y los encierran. No todos terminan encerrados.'},
  spirit_world: {cat:'fact', title:'El Mundo Espiritual', tradeValue:1,
    text:'Detrás del mundo que vemos hay otro, hecho de espiritualidad, recuerdos y cosas que nadaron hasta ahí. Algunos Beyonders lo atraviesan.'},
  twenty_two: {cat:'fact', title:'Veintidós vías', tradeValue:2,
    text:'Se dice que existen veintidós vías divinas. Nadie parece conocerlas todas, y las que se conocen están repartidas entre gente que no se habla.'},
  divination_works: {cat:'fact', title:'La adivinación funciona... a veces', tradeValue:1,
    text:'Un péndulo, un sueño dirigido, un espejo: con la espiritualidad suficiente, la adivinación responde. No siempre lo que preguntaste.'},

  // ---------------- secretos (secret) ----------------
  // (los ocho primeros vienen del SECRET_POOL original)
  s_street: {cat:'secret', title:'Una calle que no existe', tradeValue:1,
    text:'Cierta calle de la ciudad no aparece en ningún mapa oficial, y quienes la mencionan cambian de tema enseguida.'},
  s_family_age: {cat:'secret', title:'Una familia que no envejece', tradeValue:2,
    text:'Una de las familias más respetadas del barrio no envejece al ritmo que debería.'},
  s_list: {cat:'secret', title:'La lista', tradeValue:2, dangerous:true,
    text:'Hay una lista, en algún lado, con nombres de personas que "dejaron de ser un problema".'},
  s_building: {cat:'secret', title:'El piso que no existe', tradeValue:1,
    text:'Cierto edificio abandonado tiene luz encendida todas las noches, en un piso que oficialmente no existe.'},
  s_debt_power: {cat:'secret', title:'Una deuda con algo', tradeValue:3, dangerous:true,
    text:'Alguien con mucho poder en esta ciudad le debe un favor a algo que no es humano.'},
  s_meetings: {cat:'secret', title:'Las reuniones de cada mes', tradeValue:2,
    text:'Existen reuniones que se celebran siempre la misma noche del mes, en direcciones que cambian cada vez.'},
  s_unsolved: {cat:'secret', title:'El caso cerrado', tradeValue:1,
    text:'Un episodio "resuelto" hace años por la policía en realidad nunca se explicó del todo — sólo se dejó de hablar de él.'},
  s_memory_formula: {cat:'secret', title:'La fórmula del olvido', tradeValue:2, dangerous:true,
    text:'Hay una fórmula que circula en voz baja: dicen que sirve para alterar recuerdos ajenos.'},
  acting_method: {cat:'secret', title:'El Método de Actuación', tradeValue:5, key:true,
    text:'Una poción no se asimila sola: hay que ACTUAR el rol que nombra. Quien vive según los principios de su Sequence la digiere; quien los contradice, la sufre. La mayoría de los Beyonders nunca lo entiende.'},
  fool_honorific: {cat:'secret', title:'Un nombre honorífico', tradeValue:4, key:true, dangerous:true,
    text:'"El Loco que no pertenece a esta era; el misterioso gobernante sobre la niebla gris; el Rey de Amarillo y Negro que ejerce la buena suerte." Dicen que, rezado así, alguien escucha.'},
  black_market: {cat:'secret', title:'El mercado de lo imposible', tradeValue:2, key:true,
    text:'En los muelles, detrás de una casa de empeño, se venden ingredientes, fórmulas y cosas peores. La mitad es falsa. La otra mitad es peor.'},
  church_nighthawks: {cat:'secret', title:'Los Nighthawks', tradeValue:2, faction:'church',
    text:'La Iglesia de la Noche Eterna mantiene un equipo de Beyonders armados —los Nighthawks— que caza lo que la gente común no debe ver.'},
  church_sealed: {cat:'secret', title:'El depósito bajo la catedral', tradeValue:3, faction:'church',
    text:'Bajo la catedral hay un depósito de artefactos sellados. Algunos llevan siglos ahí. Algunos no deberían estar juntos.'},
  nighthawks_losses: {cat:'secret', title:'Los que no vuelven', tradeValue:2, faction:'nighthawks',
    text:'Los Nighthawks pierden gente todos los años. Los entierran de noche, con nombres falsos.'},
  storm_punishers: {cat:'secret', title:'Los Castigadores', tradeValue:2, faction:'storm',
    text:'Los Castigadores Mandatados de la Iglesia de las Tormentas pueden entrar a cualquier casa, detener a cualquiera y no dar explicaciones.'},
  machinery_catalog: {cat:'secret', title:'El catálogo', tradeValue:3, faction:'machinery',
    text:'La Mente Colmena mide y cataloga a cada Beyonder que detecta, con fichas técnicas como si fueran máquinas.'},
  aurora_creator: {cat:'secret', title:'La fe de la Aurora', tradeValue:3, faction:'aurora', dangerous:true,
    text:'La Orden de la Aurora adora a algo que dice ser el verdadero creador del mundo, y cree que el mundo le debe una resurrección.'},
  mi9_registry: {cat:'secret', title:'El registro de MI9', tradeValue:4, faction:'mi9', dangerous:true,
    text:'MI9 lleva un registro de Beyonders sin afiliación. Algunos nombres tienen una marca al lado. Nadie quiere saber qué significa la marca.'},
  psychology_sea: {cat:'secret', title:'El mar del inconsciente', tradeValue:3, faction:'psychology',
    text:'Los Alquimistas de la Psicología estudian un "mar" que comparten todas las mentes humanas, y en el que se puede nadar.'},
  tarot_fool: {cat:'secret', title:'El Loco', tradeValue:4, faction:'tarotClub',
    text:'El Tarot Club lo convoca alguien que se hace llamar El Loco, desde un palacio sobre una niebla gris. Nadie le vio la cara. Algunos creen que no la tiene.'},
  conservation_law: {cat:'secret', title:'Ley de conservación', tradeValue:3,
    text:'Las Características Beyonder no se crean ni se destruyen: sólo cambian de manos. Cada poder que existe, alguien lo perdió.'},
  // Secretos de las ciudades (se aprenden viviendo o explorando ahí).
  roselle_diary: {cat:'secret', title:'Los diarios del Emperador', tradeValue:3,
    text:'El Emperador Roselle, que gobernó Intis antes de la República, escribió sus diarios en un idioma que nadie más conoce. Quienes pagan fortunas por una página dicen que habla de cartas, de vías... y de que él no era de este mundo.'},
  trier_below: {cat:'secret', title:'La otra Trier', tradeValue:2,
    text:'Debajo de Trier hay una ciudad de la Cuarta Época, entera: calles, casas, plazas. Y algo que todavía camina por ellas como si nadie le hubiera avisado.'},
  constant_gallery: {cat:'secret', title:'La galería tapiada', tradeValue:2,
    text:'En una galería de las minas de Constant, cerrada hace décadas, los mineros encontraron algo tallado en la roca viva. La compañía tapió la entrada al día siguiente y pagó el silencio de todos. Casi todos.'},
  enmat_names: {cat:'secret', title:'La posada de los nombres', tradeValue:2,
    text:'En Enmat hay una posada donde se puede comprar un nombre nuevo, con papeles y todo. Algunos de los que la usaron no eran del todo personas.'},
  balam_sovereign: {cat:'secret', title:'El soberano del sur', tradeValue:3, dangerous:true,
    text:'El imperio cuyas ruinas se come la selva de Balam no adoraba a la Muerte como a un final, sino como a un rey. Y los reyes, dicen los nativos, no abdican: esperan.'},
  convergence_law: {cat:'secret', title:'Ley de convergencia', tradeValue:4, dangerous:true,
    text:'Las Características de una misma vía se atraen entre sí. Quien acumula poder atrae poder... y a quienes lo buscan.'},

  // ---------------- saber prohibido (forbidden) ----------------
  f_outer: {cat:'forbidden', title:'Lo que mira desde afuera', tradeValue:4,
    cost:{sanity:[8,15], corruption:[2,5], threat:8},
    text:'Más allá del mundo hay cosas que no son dioses ni demonios, y que a veces miran hacia adentro. Saber que existen ya es una forma de ser visto.'},
  f_fog_sea: {cat:'forbidden', title:'El Mar de la Niebla', tradeValue:3,
    cost:{sanity:[5,10], corruption:[1,3], threat:4},
    text:'La niebla del mar no es clima. Es un límite. Y del otro lado hay algo que golpea.'},
  f_true_names: {cat:'forbidden', title:'Los nombres verdaderos', tradeValue:4,
    cost:{sanity:[6,12], corruption:[2,4], threat:10},
    text:'Nombrar a ciertos seres en voz alta, con su nombre completo, es una forma de llamarlos. Algunos contestan.'},
  f_ancient_gods: {cat:'forbidden', title:'Los dioses antiguos', tradeValue:4,
    cost:{sanity:[5,11], corruption:[1,4], threat:6},
    text:'Los dioses de las épocas anteriores no murieron del todo. Sus restos todavía sueñan.'},
  f_rush: {cat:'forbidden', title:'Cómo forzar una poción', tradeValue:3, key:true,
    cost:{sanity:[4,8], corruption:[3,6], threat:3},
    text:'Existe una forma de beber la siguiente poción sin haber digerido la anterior. Casi todos los que lo intentaron terminaron cazados por sus propios compañeros.'},
  f_harvest: {cat:'forbidden', title:'La cosecha', tradeValue:4,
    cost:{sanity:[8,14], corruption:[6,10], threat:6},
    text:'Hay rituales para arrancarle la Característica a un Beyonder todavía vivo. La Aurora los enseña a quien pregunta dos veces.'},

  // ---------------- entidades (entity) ----------------
  e_creator: {cat:'entity', title:'El Verdadero Creador', tradeValue:4,
    cost:{sanity:[4,9], corruption:[3,6], threat:10},
    text:'Un ser que dice haber hecho el mundo y haber sido traicionado por él. Duerme, o finge dormir. La Aurora le reza.'},
  e_mother: {cat:'entity', title:'La Madre de la Depravación', tradeValue:4,
    cost:{sanity:[5,10], corruption:[2,5], threat:8},
    text:'Una fertilidad que no distingue entre crear y pudrir. Algunas sectas del campo le ofrecen cosechas que nadie come.'},
  e_hidden_sage: {cat:'entity', title:'El Sabio Oculto', tradeValue:5,
    cost:{sanity:[6,12], corruption:[2,5], threat:9},
    text:'Una sabiduría sin rostro que le ofrece conocimiento a quien tiene hambre de él. El precio es siempre más conocimiento del que se puede cargar.'},
  e_evernight: {cat:'entity', title:'Más antigua que su iglesia', tradeValue:5,
    cost:{sanity:[3,7], threat:5},
    text:'La Diosa de la Noche Eterna es mucho más antigua de lo que dice su propia iglesia. Su iglesia no lo sabe, o no quiere saberlo.'},
  e_primordial_moon: {cat:'entity', title:'La Luna Primordial', tradeValue:4,
    cost:{sanity:[5,10], corruption:[3,6], threat:8},
    text:'No toda luna es la luna. Hay una más vieja, que no refleja nada y que tiene hambre.'}
};
const LORE_CAT_LABEL = { fact:'Conocimiento', secret:'Secretos', forbidden:'Saber prohibido', entity:'Entidades' };
// Pools por categoría (para investigaciones que sortean "un secreto").
function lorePool(cat){ return Object.keys(LORE).filter(k=>LORE[k].cat===cat); }
