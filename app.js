'use strict';
/* =========================================================================
   LORD OF THE MYSTERIES: LIFE SIMULATOR — FASE 1
   Motor de vida narrativa con descubrimiento progresivo de Pathways.
   ========================================================================= */

const SAVE_KEY = 'lotm_life_sim_save_v1';
// v4: rediseño del sistema de ingredientes (ingredientProgress % → ingredientsOwned
// por nombre puntual de ingrediente, ver PATHWAY_INGREDIENTS) y del avance de tiempo
// (yearActions/año → seasonActions/temporada de 3 meses, más flags.lastJobSearchMonth
// para el enfriamiento de Buscar mejor empleo).
// v5: se suma el sistema de Misiones (STATE.pendingMission, STATE.missions,
// pathway.ritualPrepBonus, seasonActions.missions). Los saves viejos no son compatibles.

const SAVE_VERSION = 7;

/* ---------------------------------------------------------------------
   DATOS: PATHWAYS
--------------------------------------------------------------------- */
const PATHWAYS = {
  fool: {
    key:'fool', name:'Fool', theme:'Actuación, identidad, teatro, engaño, máscaras',
    seq:[
      {n:9,name:'Seer',      ability:'Percibís fragmentos de verdad ocultos tras gestos y mentiras ajenas.'},
      {n:8,name:'Clown',     ability:'Tu presencia escénica distorsiona el ánimo de quienes te rodean.'},
      {n:7,name:'Magician',  ability:'Dominás ilusiones menores capaces de engañar los sentidos.'},
      {n:6,name:'Faceless',  ability:'Podés adoptar temporalmente rasgos de otra identidad.'},
      {n:5,name:'Marionettist', ability:'Empezás a influir sutilmente en la voluntad ajena.'},
      {n:4,name:'Bizarro Sorcerer', ability:'Tu Acting puede alterar la realidad inmediata a tu alrededor.'},
      {n:3,name:'Scholar of Yore', ability:'Accedés a fragmentos de conocimiento prohibido más allá de tu época.'},
      {n:2,name:'Miracle Invoker', ability:'Tus actos pueden manifestarse como auténticos milagros menores.'},
      {n:1,name:'Attendant of Mysteries', ability:'Rozás la comprensión directa de los Ángeles.'},
      {n:0,name:'Fool', ability:'Te convertís en un enigma viviente, más allá del juicio ordinario.'}
    ]
  },
  visionary: {
    key:'visionary', name:'Visionary', theme:'Percepción, mente, sueños, manipulación psíquica',
    seq:[
      {n:9,name:'Spectator',  ability:'Observás con precisión anómala emociones y detalles ajenos.'},
      {n:8,name:'Telepathist', ability:'Podés rozar superficialmente pensamientos cercanos.'},
      {n:7,name:'Psychiatrist', ability:'Analizás y empezás a influir en estados psicológicos ajenos.'},
      {n:6,name:'Hypnotist', ability:'Tu voz puede inducir estados de sugestión profunda.'},
      {n:5,name:'Dreamwalker', ability:'Podés entrar deliberadamente en los sueños de otros.'},
      {n:4,name:'Manipulator', ability:'Reescribís impulsos y decisiones ajenas con cuidado ritual.'},
      {n:3,name:'Dream Weaver', ability:'Construís realidades oníricas compartidas y duraderas.'},
      {n:2,name:'Discerner', ability:'Distinguís la verdad absoluta detrás de cualquier ilusión.'},
      {n:1,name:'Author', ability:'Tus palabras pueden reescribir fragmentos de destino ajeno.'},
      {n:0,name:'Visionary', ability:'Percibís las corrientes profundas que mueven el mundo.'}
    ]
  },
  redPriest: {
    key:'redPriest', name:'Red Priest', theme:'Caza, combate, fuego, sacrificio, guerra',
    seq:[
      {n:9,name:'Hunter',     ability:'Sentidos y físico muy por encima de lo humano; rastreo y supervivencia.'},
      {n:8,name:'Provoker',   ability:'Podés inducir furia o pánico en tus presas.'},
      {n:7,name:'Pyromaniac', ability:'Empezás a manipular llamas de forma limitada.'},
      {n:6,name:'Conspirer',  ability:'Coordinás emboscadas y estrategias de caza colectiva.'},
      {n:5,name:'Reaper',     ability:'Tus golpes pueden seccionar vínculos vitales con precisión letal.'},
      {n:4,name:'Iron-blooded Knight', ability:'Tu cuerpo se vuelve un arma de guerra prácticamente imparable.'},
      {n:3,name:'War Bishop', ability:'Inspirás y comandás a otros en el fragor del combate.'},
      {n:2,name:'Weather Warlock', ability:'El fuego que controlas comienza a alterar el clima local.'},
      {n:1,name:'Conqueror',  ability:'Tu sola presencia en el campo de batalla decide encuentros enteros.'},
      {n:0,name:'Red Priest', ability:'Te convertís en una fuerza de guerra y sacrificio casi primordial.'}
    ]
  },
  darkness: {
    // Nombres de Sequence corregidos a los canónicos de la wiki de LOTM — la versión
    // anterior de este pathway usaba nombres inventados (Nighthawk, Savage, Berserker,
    // Ghoul, Fiend, Duke of the Night, Grand Duke) que no existen en la obra original.
    key:'darkness', name:'Darkness', theme:'Noche, sueño, silencio, ocultamiento, muerte',
    seq:[
      {n:9,name:'Sleepless',  ability:'Ya no necesitás dormir; tu resistencia y vigilia son sobrehumanas.'},
      {n:8,name:'Midnight Poet', ability:'Tu voz puede recitar versos que calman cuerpo y alma sin usar la garganta.'},
      {n:7,name:'Nightmare', ability:'Podés entrar e influir en las pesadillas ajenas.'},
      {n:6,name:'Soul Assurer', ability:'Podés anclar y estabilizar almas al borde de perderse.'},
      {n:5,name:'Spirit Warlock', ability:'Invocás y sometés espíritus menores a tu voluntad.'},
      {n:4,name:'Nightwatcher', ability:'Ves con claridad total a través de la oscuridad más profunda.'},
      {n:3,name:'Horror Bishop', ability:'Proyectas un terror casi religioso sobre quienes te rodean.'},
      {n:2,name:'Servant of Concealment', ability:'Podés dejar de ser percibido por completo mientras lo desees.'},
      {n:1,name:'Knight of Misfortune', ability:'La mala fortuna ajena se dobla a tu voluntad como un arma.'},
      {n:0,name:'Darkness', ability:'Te convertís en una encarnación casi absoluta de la noche eterna.'}
    ]
  },
  // Los siguientes cuatro pathways (door, tyrant, twilightGiant, hermit) se agregaron
  // después de los primeros cuatro, para ampliar el roster inicial. Nombres de Sequence
  // verificados contra la wiki de LOTM igual que los de arriba — 'tyrant' y 'twilightGiant'
  // son casos particulares: el pathway completo se conoce por su nombre de Sequence 0
  // (Tyrant, Twilight Giant), pero un Beyonder recién iniciado (Sequence 9) se presenta
  // con el nombre de esa Sequence baja (Sailor, Warrior) — igual que 'fool' ya empieza
  // en Seer y 'visionary' en Spectator.
  door: {
    key:'door', name:'Door', theme:'Puertas, espacio, viaje entre mundos, astrología, ocultamiento',
    seq:[
      {n:9,name:'Apprentice', ability:'Percibís puertas y accesos ocultos que otros no notarían; podés cruzar paredes finas.'},
      {n:8,name:'Trickmaster', ability:'Dominás hechizos versátiles pero débiles: destellos, niebla, ruidos, engaños sensoriales.'},
      {n:7,name:'Astrologer', ability:'Usás las estrellas para leer fragmentos del futuro inmediato.'},
      {n:6,name:'Scribe', ability:'Podés registrar y replicar, de forma limitada, poderes ajenos que presenciás.'},
      {n:5,name:'Traveler', ability:'Cruzás distancias imposibles a través del Spirit World.'},
      {n:4,name:'Secrets Sorcerer', ability:'Ocultás espacios enteros; nada queda fuera de tu alcance ni de tu vista.'},
      {n:3,name:'Wanderer', ability:'Te movés con libertad entre planos conocidos del mundo.'},
      {n:2,name:'Planeswalker', ability:'Abrís cualquier puerta, literal o metafórica, sin restricción real.'},
      {n:1,name:'Key of Stars', ability:'Tu propia posición se vuelve un secreto que nadie puede rastrear ni contra el que nadie puede actuar.'},
      {n:0,name:'Door', ability:'Te convertís en el umbral mismo — atravesás mundos enteros como quien cruza una habitación.'}
    ]
  },
  tyrant: {
    key:'tyrant', name:'Tyrant', theme:'Mar, tormentas, rayos, fuerza física, ira, catástrofe',
    seq:[
      {n:9,name:'Sailor', ability:'Nadás y te movés bajo el agua con la agilidad de una criatura marina; tu fuerza física ya supera lo humano.'},
      {n:8,name:'Folk of Rage', ability:'Tu fuerza, velocidad y resistencia se disparan — enfrentarte es como enfrentar una tormenta.'},
      {n:7,name:'Seafarer', ability:'Dominás el mar abierto: corrientes, vientos y el clima empiezan a responderte.'},
      {n:6,name:'Wind-blessed', ability:'El viento te obedece de forma directa, impulsando tus golpes y tus desplazamientos.'},
      {n:5,name:'Ocean Songster', ability:'Tu voz puede calmar o enfurecer el mar — y a quien te escuche.'},
      {n:4,name:'Cataclysmic Interrer', ability:'Podés sellar y liberar el poder de una catástrofe entera bajo tu voluntad.'},
      {n:3,name:'Sea King', ability:'Las criaturas del mar responden a tu llamado; tu dominio se extiende sobre regiones enteras del océano.'},
      {n:2,name:'Calamity', ability:'Tu sola presencia puede desatar un desastre natural a la escala de una ciudad entera.'},
      {n:1,name:'Thunder God', ability:'Generás poder eléctrico capaz de rivalizar con una tormenta a escala continental.'},
      {n:0,name:'Tyrant', ability:'Te convertís en la tormenta misma — casi omnipotente en el mar, la tierra y el aire.'}
    ]
  },
  twilightGiant: {
    key:'twilightGiant', name:'Twilight Giant', theme:'Combate físico, armas, resistencia, ocaso, decadencia del tiempo',
    seq:[
      {n:9,name:'Warrior', ability:'Tu fuerza, agilidad y resistencia superan ampliamente lo humano; dominás instintivamente cualquier arma común.'},
      {n:8,name:'Pugilist', ability:'Tu cuerpo se vuelve un arma en sí mismo, con una densidad muscular muy por encima de lo normal.'},
      {n:7,name:'Weapon Master', ability:'Tenés un instinto absoluto con cualquier arma: contragolpes, puntos débiles, nada se te escapa.'},
      {n:6,name:'Dawn Paladin', ability:'Forjás armas y armadura de luz del alba capaces de dañar a espíritus malignos.'},
      {n:5,name:'Guardian', ability:'Podés interceptar daño ajeno y sostener una postura defensiva casi inquebrantable.'},
      {n:4,name:'Demon Hunter', ability:'Ganás inmunidad a venenos demoníacos y la capacidad de identificar y explotar debilidades sobrenaturales.'},
      {n:3,name:'Silver Knight', ability:'Manipulás una hoja de mercurio capaz de platear el espacio a tu alrededor.'},
      {n:2,name:'Glory', ability:'Un aura de combate sagrada potencia enormemente tus capacidades y las de quienes luchan a tu lado.'},
      {n:1,name:'Hand of God', ability:'Tus golpes, a mano desnuda, pueden destrozar cualquier defensa conocida.'},
      {n:0,name:'Twilight Giant', ability:'Te convertís en el ocaso mismo — portador de la guerra, la decadencia y el fin de todas las cosas.'}
    ]
  },
  hermit: {
    key:'hermit', name:'Hermit', theme:'Conocimiento prohibido, secretos, ocultismo, astrología, información',
    seq:[
      {n:9,name:'Mystery Pryer', ability:'Percibís secretos ajenos como si fueran un tipo de Conocimiento — la naturaleza de un poder, un arreglo oculto, una debilidad.'},
      {n:8,name:'Melee Scholar', ability:'Combinás erudición con un combate cuerpo a cuerpo sorprendentemente eficaz.'},
      {n:7,name:'Warlock', ability:'Accedés a hechizos rituales cada vez más elaborados.'},
      {n:6,name:'Scrolls Professor', ability:'Podés confeccionar pergaminos capaces de almacenar y replicar conocimiento místico.'},
      {n:5,name:'Constellations Master', ability:'Leés y convocás el poder de constelaciones enteras.'},
      {n:4,name:'Mysticologist', ability:'Analizás sangre de Criaturas Míticas para desbloquear conocimiento prohibido específico.'},
      {n:3,name:'Clairvoyant', ability:'Podés "clarividenciar" eventos que ocurrirán años en el futuro, con suficiente preparación.'},
      {n:2,name:'Sage', ability:'Tu propio cuerpo empieza a disolverse en pura información — un flujo de conocimiento casi imposible de sostener.'},
      {n:1,name:'Knowledge Emperor', ability:'Reunís y organizás todo el conocimiento relacionado con vos mismo en una totalidad coherente.'},
      {n:0,name:'Hermit', ability:'Te convertís en un ojo gigante que oculta un mundo entero dentro tuyo.'}
    ]
  },
  // Tercera tanda (sun, hangedMan, death), agregada para ampliar aún más el roster de
  // Pathways jugables. Igual que las tandas anteriores, los nombres de Sequence están
  // verificados contra la wiki de LOTM (fuente principal + Friends & Fables como
  // segunda fuente, ambas coincidiendo exactamente en las diez Sequences de cada una).
  // Sun y Hanged Man pertenecen al mismo grupo "God Almighty" que Visionary y Tyrant
  // (ya implementados); Death pertenece al grupo "Eternal Darkness" junto a Darkness y
  // Twilight Giant (también ya implementados) — de ahí el fuerte parentesco temático.
  sun: {
    key:'sun', name:'Sun', theme:'Luz, santidad, purificación, justicia, orden, contratos, fe',
    seq:[
      {n:9,name:'Bard', ability:'Tus cánticos de luz fortalecen el coraje ajeno, disipan el miedo y purifican corrupción leve a tu alrededor.'},
      {n:8,name:'Light Suppliant', ability:'Invocás luz sagrada capaz de curar y bendecir, y de quemar a los no-muertos.'},
      {n:7,name:'Solar High Priest', ability:'Canalizás fuego solar en rituales de purificación y exorcismo de área amplia.'},
      {n:6,name:'Notary', ability:'Podés autentificar la veracidad de casi cualquier cosa y hacer cumplir contratos por la fuerza de tu autoridad.'},
      {n:5,name:'Priest of Light', ability:'Tus ataques de luz sagrada son devastadores contra criaturas oscuras.'},
      {n:4,name:'Unshadowed', ability:'Tu cuerpo deja de proyectar sombra; te volvés casi inmune a maldiciones y corrupción externa.'},
      {n:3,name:'Justice Mentor', ability:'Tus palabras encarnan el orden y la justicia, con una fuerza vinculante y purificadora real.'},
      {n:2,name:'Lightseeker', ability:'Te acercás a la esencia misma de la luz; lo maligno arde con sólo cruzar tu mirada.'},
      {n:1,name:'White Angel', ability:'Te convertís en un ángel de luz blanca ardiente, portador de calidez capaz de dar vida.'},
      {n:0,name:'Sun', ability:'Te convertís en el sol eterno — luz, santidad y orden hechos una sola presencia inextinguible.'}
    ]
  },
  hangedMan: {
    key:'hangedMan', name:'Hanged Man', theme:'Degeneración, sacrificio, magia de sombras y sangre, secretos, alta espiritualidad',
    seq:[
      {n:9,name:'Secrets Suppliant', ability:'Tu Espiritualidad es muy alta; percibís presencias horribles y ocultas antes que nadie, aunque no sos hábil en combate.'},
      {n:8,name:'Listener', ability:'Podés escuchar directamente los susurros de entidades secretas, obteniendo poderes retorcidos y únicos a cambio del riesgo de escuchar.'},
      {n:7,name:'Shadow Ascetic', ability:'Dominás hechizos ligados a las sombras propias y ajenas.'},
      {n:6,name:'Rose Bishop', ability:'Tu magia de sangre y carne empieza a tomar una forma ritual, casi eclesiástica.'},
      {n:5,name:'Shepherd', ability:'Podés guiar y sostener a otros bajo tu responsabilidad, a un costo personal real.'},
      {n:4,name:'Black Knight', ability:'Fusionás carne y sombra en un combate cuerpo a cuerpo temible.'},
      {n:3,name:'Trinity Templar', ability:'Manipulás sangre y carne propias y ajenas para forjar una trinidad de poder.'},
      {n:2,name:'Profane Presbyter', ability:'Tus palabras profanas pueden traer toda clase de efectos malignos; sos capaz de propagar la traición misma.'},
      {n:1,name:'Dark Angel', ability:'Creás sirvientes de sombra propios y te convertís en encarnación del sacrificio y el pecado.'},
      {n:0,name:'Hanged Man', ability:'Te convertís en la degeneración y el sacrificio hechos entidad — responsabilidad y ruina en un solo ser.'}
    ]
  },
  death: {
    key:'death', name:'Death', theme:'Muerte, no-muertos, espíritus, frío y descomposición, el más allá',
    seq:[
      {n:9,name:'Corpse Collector', ability:'Ganás fuerza física, temperatura corporal baja y una presencia sombría; sos experto en cadáveres y percibís espíritus básicos.'},
      {n:8,name:'Gravedigger', ability:'Podés levantar no-muertos menores y extraer información y poder de los muertos.'},
      {n:7,name:'Spirit Medium', ability:'Convocás y te comunicás libremente con espíritus del más allá.'},
      {n:6,name:'Spirit Guide', ability:'Comandás no-muertos con mayor poder necromántico y guiás almas hacia su descanso.'},
      {n:5,name:'Gatekeeper', ability:'Guardás la frontera entre la vida y la muerte; podés cosechar almas y determinar el momento de una muerte.'},
      {n:4,name:'Undying', ability:'Obtenés una regeneración poderosa y resistís la muerte misma dentro de tu dominio.'},
      {n:3,name:'Ferryman', ability:'Trascendés la muerte, acercándote a la inmortalidad; escoltás y juzgás almas en su cruce final.'},
      {n:2,name:'Death Consul', ability:'Tenés autoridad casi divina sobre la muerte y el no-muerto; comandás legiones enteras de espíritus.'},
      {n:1,name:'Pale Emperor', ability:'Como Ángel de Sequence 1, ejercés autoridad suprema sobre la muerte misma.'},
      {n:0,name:'Death', ability:'Te convertís en la Muerte — el Durmiente Eterno, presente a ambos lados de cada final.'}
    ]
  },
  // Cuarta tanda (moon, error, whiteTower). Nombres de Sequence verificados contra la
  // wiki de LOTM (fandom, vía búsqueda) y cruzados con Friends & Fables / Lord of
  // Mysteries Game Wiki como segunda fuente — coinciden en las diez Sequences de cada
  // una. Ojo con traducciones alternativas que circulan (p. ej. "Professor of Potions",
  // "King of Shamans", "Angel of Wisdom", "All-Seeing Eye"): acá se usan los nombres de
  // la traducción oficial en inglés que usa la wiki, igual que en las tandas anteriores.
  moon: {
    key:'moon', name:'Moon', theme:'Sangre, pociones, bestias, sanación, transformación, fertilidad',
    seq:[
      {n:9,name:'Apothecary', ability:'Mezclás hierbas y partes animales en remedios caseros que curan casi cualquier dolencia menor, sin efectos secundarios.'},
      {n:8,name:'Beast Tamer', ability:'Leés las emociones de los animales y podés domarlos; tu cuerpo gana una fuerza muy por encima de lo humano.'},
      {n:7,name:'Vampire', ability:'Ganás longevidad, una constitución temible y una regeneración que se alimenta de sangre ajena.'},
      {n:6,name:'Potions Professor', ability:'Distinguís materiales espirituales a simple vista y preparás pociones capaces de tratar enfermedades terminales.'},
      {n:5,name:'Scarlet Scholar', ability:'La luna carmesí responde a tu voz: dominás hechizos de oscuridad y transformaciones de sangre.'},
      {n:4,name:'Shaman King', ability:'Tu cuerpo se vuelve casi imposible de matar; convocás y comandás espíritus y bestias a la vez.'},
      {n:3,name:'High Summoner', ability:'Invocás cosas o personas desde distancias enormes, y liberás criaturas desde regiones cargadas de energía negativa.'},
      {n:2,name:'Life-Giver', ability:'Manipulás el poder de la creación: donde tocás, la vida brota — deseada o no.'},
      {n:1,name:'Beauty Goddess', ability:'Encarnás el concepto mismo de la belleza; mirarte de frente ya es un riesgo para una mente común.'},
      {n:0,name:'Moon', ability:'Te convertís en la Luna — fertilidad, sangre y transformación bajo una sola luz carmesí.'}
    ]
  },
  error: {
    key:'error', name:'Error', theme:'Robo, engaño, fallas en las reglas, parásitos, el tiempo como botín',
    seq:[
      {n:9,name:'Marauder', ability:'Tus manos son más rápidas que cualquier mirada: podés robar objetos de encima de alguien sin que lo note.'},
      {n:8,name:'Swindler', ability:'Tu labia engaña a cualquiera; una mentira bien dicha se vuelve, por un rato, casi verdad.'},
      {n:7,name:'Cryptologist', ability:'Descifrás cualquier código, cerradura o patrón oculto, mundano o místico.'},
      {n:6,name:'Prometheus', ability:'Robás habilidades Beyonder ajenas y las usás como propias durante un tiempo breve.'},
      {n:5,name:'Dream Stealer', ability:'Robás pensamientos, intenciones y recuerdos: la otra persona olvida lo que iba a hacer.'},
      {n:4,name:'Parasite', ability:'Podés parasitar a otros seres y vivir dentro de ellos, controlándolos desde adentro.'},
      {n:3,name:'Mentor of Deceit', ability:'Engañás las propias reglas del mundo: redirigís destinos, alterás conexiones y creás Avatares independientes.'},
      {n:2,name:'Trojan Horse of Destiny', ability:'Te infiltrás en el destino ajeno y lo robás desde adentro, sin que nadie note el cambio a tiempo.'},
      {n:1,name:'Worm of Time', ability:'Robás tiempo mismo — segundos, días o eras enteras — a quien sea.'},
      {n:0,name:'Error', ability:'Te convertís en el Error: la grieta en toda regla, la falla que ninguna ley termina de cerrar.'}
    ]
  },
  whiteTower: {
    key:'whiteTower', name:'White Tower', theme:'Conocimiento científico y místico, deducción, memoria, análisis, profecía',
    seq:[
      {n:9,name:'Reader', ability:'Leés y retenés con una velocidad y una memoria que ningún estudioso común podría igualar.'},
      {n:8,name:'Student of Ratiocination', ability:'Tu razonamiento se vuelve implacable: deducís causas a partir de detalles que otros ni registran.'},
      {n:7,name:'Detective', ability:'Reconstruís lo que pasó en un lugar con sólo recorrerlo, y detectás rastros místicos a simple vista.'},
      {n:6,name:'Polymath', ability:'Analizando un poder ajeno el tiempo suficiente, podés imitarlo de forma limitada.'},
      {n:5,name:'Mysticism Magister', ability:'Dominás una amplitud enorme de hechizos y rituales místicos, casi de cualquier tradición.'},
      {n:4,name:'Prophet', ability:'Ves fragmentos confiables del futuro y podés prepararte para ellos antes de que ocurran.'},
      {n:3,name:'Cognizer', ability:'Observás, analizás y usás directamente las leyes fundamentales de la realidad.'},
      {n:2,name:'Wisdom Angel', ability:'Revelás toda la información de una persona, oculta o no, con sólo concentrarte en ella.'},
      {n:1,name:'Omniscient Eye', ability:'Como un faro, iluminás y percibís todo lo del pasado y del futuro — a costa de rozar la locura.'},
      {n:0,name:'White Tower', ability:'Te convertís en la Torre Blanca: una estructura infinita de conocimiento coronada por un ojo que todo lo ve.'}
    ]
  }
};
const PATHWAY_LIST = Object.values(PATHWAYS);

/* ---------------------------------------------------------------------
   INGREDIENTES POR PATHWAY Y SEQUENCE
   Cada Sequence necesita ingredientes propios y específicos para poder
   prepararse — ya no alcanza con juntar un % genérico. La mayoría de estos
   nombres vienen directo de la wiki de Lord of the Mysteries (fórmulas de
   pociones reales de la novela); donde la wiki no tiene datos —cosa que le
   pasa a ella misma en varias Sequences altas, sobre todo de Red Priest y
   Darkness, que se resuelven más por ritual que por ingredientes— se
   completó con ingredientes originales, coherentes con el tema de esa
   Sequence, para no dejar el sistema roto en esos tramos.
--------------------------------------------------------------------- */
const PATHWAY_INGREDIENTS = {
  fool: {
    9:['Sangre de Calamar Lavos (10 ml)', 'Cristal Estelar (50 g)'],
    8:['Cuerno de Cabra Gris Hornacis', 'Tallo completo de Rosa de Rostro Humano'],
    7:['Raíz de Treant de la Niebla', 'Líquido espinal de Pantera Negra de Patrón Oscuro'],
    6:['Glándula pituitaria mutada de un Cazador de Mil Rostros', 'Característica de una Sombra con Piel Humana'],
    5:['Polvo de un Espectro Ancestral', 'Núcleo de una Gárgola'],
    4:['El Ojo Principal de la Astucia Maligna', 'Fragmento de un espejo de feria roto durante una función'],
    3:['Página arrancada de un tomo histórico prohibido', 'Ceniza de un sitio arqueológico olvidado'],
    2:['Lágrima cristalizada de un deseo cumplido', 'Fragmento de una moneda que concedió un milagro real'],
    1:['Hilo desprendido del propio tapiz del Spirit World', 'Sello roto de un sirviente cósmico'],
    0:['La Unicidad del Fool', 'Tres Características Beyonder de Attendant of Mysteries']
  },
  visionary: {
    9:['Ojo de un Pez Manhal maduro', 'Sangre de Pez Negro Cornudo de Cabra (35 ml)'],
    8:['Glándula pituitaria completa de una Salamandra Arcoíris', 'Líquido espinal de un Conejo Farsman (10 ml)'],
    7:['Fruto del Árbol de los Ancianos', 'Un par de ojos de un Dragón Espejo'],
    6:['Glándula pituitaria completa de un Dragón Mental adolescente'],
    5:['Cerebro completo de un Dragón Mental adulto'],
    4:['Cerebro completo de un Dragón Mental anciano'],
    3:['Corazón cristalino del Rey Treant'],
    2:['Corazón pálido de Ariehogg'],
    1:['La Pluma de Alzuhod'],
    0:['La Unicidad del Visionary', 'Tres Características Beyonder de Author']
  },
  redPriest: {
    9:['Garra delantera de un lobo salvaje reciente', 'Colmillo arrancado de una presa mayor'],
    8:['Frasco de licor destilado usado en una provocación real', 'Registro escrito de un rumor que recorrió medio continente'],
    7:['Núcleo de un Elfo de Magma', 'Ceniza aún caliente de un incendio provocado'],
    6:['Glándula de veneno de una Araña Cazadora Negra', 'Corazón de una criatura caída en una emboscada propia'],
    5:['Garras delanteras de un Lobo Demonio Gris', 'Lengua de un Cazador del Bosque'],
    4:['Astilla de hueso de un Caballero de Sangre de Hierro caído', 'Estandarte manchado de sangre de un batallón derrotado'],
    3:['Fragmento de un cometa que cruzó el cielo durante una guerra', 'Ceniza de un campo de batalla decisivo'],
    2:['Núcleo cristalino de un Brujo del Clima', 'Fragmento de hielo que no se derritió en pleno verano'],
    1:['Sangre de tres Conquistadores caídos en la misma batalla'],
    0:['La Unicidad del Red Priest', 'Todas las Características Beyonder de Conqueror ajenas a uno mismo']
  },
  darkness: {
    9:['Café en grano o Hojas de té (para el simbolismo)', 'Una base de hedor nocturno recogida antes del alba'],
    8:['Fragmento de un gel negro con forma de gema', 'Verso robado de un poema que nadie recuerda haber escrito'],
    7:['Agua de Luna del Spirit World (100 ml)', 'Fragmento de una pesadilla ajena capturado al despertar'],
    6:['Hilo de un alma casi perdida y recuperada a tiempo', 'Ceniza de una vela que ardió toda la noche sin consumirse'],
    5:['Núcleo de un espíritu invocado y sometido', 'Fragmento de una cadena forjada bajo luna nueva'],
    4:['Ojo de quien vigiló siete noches sin dormir', 'Polvo de un reloj detenido justo a medianoche'],
    3:['Fragmento de un ícono religioso profanado por el terror', 'Ceniza de un sermón interrumpido por gritos'],
    2:['Manto tejido con la oscuridad de un lugar que nunca fue hallado', 'Sello de algo que decidió no ser visto'],
    1:['Armadura forjada con la mala fortuna ajena', 'Fragmento de una desgracia que debía haber sido tuya'],
    0:['La Unicidad de Darkness', 'Tres Características Beyonder de Knight of Misfortune']
  },
  // Los cuatro pathways de acá abajo se agregaron en una segunda tanda (ver comentario
  // en PATHWAYS más arriba). La mayoría de estos ingredientes SÍ están confirmados en la
  // wiki (fórmulas reales de Door y Hermit); donde la wiki no publicó datos de fórmula
  // —le pasa a varias Sequences de Door y a Tyrant/Twilight Giant casi enteros, que en
  // la novela avanzan más por entrenamiento y ritual que por ingredientes registrados—
  // se completó con ingredientes originales, coherentes con el tema de esa Sequence.
  door: {
    9:['1 Gusano Devorador de Gemas', '1 Cristal de Ilusión'],
    8:['Fragmento de un espejo que devuelve un reflejo que no es el tuyo', 'Ceniza de una carta de tarot quemada a propósito'],
    7:['10 g de Polvo de Clemátide', '80 ml de licor fuerte destilado bajo un cielo despejado'],
    6:['3 páginas de un diario con más de 22 años', '10 ml de Mercurio'],
    5:['1 Gusano Demonio Siskun', 'Corazón de un Lobo Demoníaco sin Sombra'],
    4:['Ojo de un Fénix Dorado', 'Cimiento de la Puerta Ankh'],
    3:['Piel Errante', 'Cristal dejado por un Vigía de la Niebla'],
    2:['Ojo del Fénix Púrpura', 'Cerebro de un Cazador Interdimensional'],
    1:['Una brújula (u objeto similar) vinculada al Mundo Astral', 'Núcleo de un Asteroide Errante'],
    0:['La Unicidad del Door', 'Tres Características Beyonder de Key of Stars']
  },
  tyrant: {
    9:['Escama desprendida de tu propia piel durante una tormenta en altamar', 'Agua de mar recogida en el ojo de un vendaval'],
    8:['Puño de coral arrancado en plena furia', 'Sangre propia derramada durante una pelea de puerto'],
    7:['Brújula que giró sin control durante tres días de tormenta', 'Cristal de sal formado en la proa de un barco naufragado'],
    6:['Pluma de un ave que voló contra el viento durante una tempestad', 'Vela desgarrada por un vendaval que nadie sobrevivió'],
    5:['Concha que resuena con un canto marino al acercarla al oído', 'Cuerda vocal de una criatura marina varada'],
    4:['Fragmento de coral crecido alrededor de un objeto hundido en un desastre', 'Núcleo de una tormenta sellada antes de tocar tierra'],
    3:['Escama de una criatura que sólo obedece en mar abierto', 'Coral crecido en la fosa donde se hundió una flota entera'],
    2:['Nube de tormenta condensada dentro de un frasco de cristal', 'Ceniza de un pueblo costero arrasado por un maremoto'],
    1:['Núcleo de un rayo capturado en pleno impacto', 'Fragmento de metal fundido por un rayo directo'],
    0:['La Unicidad del Tyrant', 'Tres Características Beyonder de Thunder God']
  },
  twilightGiant: {
    9:['Vendaje empapado en sudor de un combate real', 'Filo de un arma usada en un duelo a muerte'],
    8:['Nudillos vendados con la sangre de cien combates', 'Fragmento de hueso astillado en la arena de lucha'],
    7:['Empuñadura desgastada de un arma legendaria', 'Filo roto de una espada que nunca perdió un duelo'],
    6:['Fragmento de armadura templada al amanecer', 'Ceniza de una vela consumida durante una vigilia de honor'],
    5:['Escudo abollado por un golpe que debía haber sido mortal', 'Fragmento de una barrera que resistió un ataque imposible'],
    4:['Colmillo de una criatura demoníaca cazada en combate', 'Veneno extraído y neutralizado de un espíritu maligno'],
    3:['Gota de mercurio que nunca termina de solidificarse', 'Filo forjado con plata fundida bajo luna llena'],
    2:['Fragmento de un estandarte que ondeó en cien batallas', 'Brasa de una hoguera de victoria que ardió toda la noche'],
    1:['Puño vendado que rompió una defensa imposible', 'Hueso de un nudillo que golpeó a un Ángel y sobrevivió'],
    0:['La Unicidad del Twilight Giant', 'Tres Características Beyonder de Hand of God']
  },
  hermit: {
    9:['Córnea de un Ojo Maligno de Pesadilla', 'Fragmento de un Cristal Maldito'],
    8:['Columna vertebral de un Terianthrope de Brazos de Hierro', 'Corazón de una Tortuga Verde de Cuatro Ojos'],
    7:['Cornamenta de un Terianthrope Cabeza de Ciervo', 'Ojo de un Ave Gris Abuela'],
    6:['Corazón de árbol de un Sacerdote Treant', 'Ojo ilusorio de un Demonio de Papel'],
    5:['Cerebro de un Monstruo con Patrón Estelar', '1 Cristal del Destino'],
    4:['Cuero cabelludo de un Espíritu Arcano', 'Ojo de la Pupila de un Dios Maligno'],
    3:['Globos oculares de un Observador de Estrellas', 'Piel de Polvo Estelar de un Sumo Sacerdote Treant'],
    2:['Cristal de un Antiguo Demonio de Fantasía', 'Tentáculo del Vagabundo Mental'],
    1:['1 artefacto grabado con conocimiento propio', '1 corona, en el sentido más literal'],
    0:['La Unicidad del Hermit', 'Tres Características Beyonder de Knowledge Emperor']
  },
  // Tercera tanda (sun, hangedMan, death). La wiki documenta ingredientes sueltos para
  // estas vías (velas, incienso, ceniza consagrada para Sun; sangre y objetos rituales
  // para Hanged Man; huesos y mortajas para Death) pero no publicó, en las fuentes
  // consultadas, una fórmula completa Sequence por Sequence como sí existe para Fool o
  // Visionary. Se completó con ingredientes originales, coherentes con el tema de cada
  // Sequence — mismo criterio ya usado para Tyrant y Twilight Giant más arriba.
  sun: {
    9:['Cera de una vela que ardió toda una vigilia sin apagarse', 'Ceniza consagrada recogida al amanecer'],
    8:['Frasco de aceite bendecido bajo el primer rayo de sol', 'Hilo dorado de una vestidura sacerdotal quemada en un exorcismo'],
    7:['Brasa de un incendio que purificó, sin destruir, un lugar profanado', 'Campana partida por un canto de exorcismo'],
    6:['Sello de cera de un contrato que nadie se atrevió a romper', 'Pluma de un ave que sólo canta al amanecer'],
    5:['Fragmento de vitral que jamás dejó pasar la oscuridad', 'Cristal que concentra luz solar sin quemarse'],
    4:['Sombra arrancada de quien la perdió por completo', 'Ceniza de una maldición purificada en el acto'],
    3:['Balanza de un tribunal que nunca falló un veredicto justo', 'Sello de un juramento cumplido al precio más alto'],
    2:['Fragmento de un espejo que sólo refleja luz, nunca sombra', 'Núcleo de una gema solar tallada en el desierto'],
    1:['Pluma incandescente que no se apaga ni bajo el agua', 'Fragmento de una corona forjada en luz pura'],
    0:['La Unicidad del Sun', 'Tres Características Beyonder de White Angel']
  },
  hangedMan: {
    9:['Vela negra consumida durante un ritual de sacrificio menor', 'Gota de sangre propia, entregada por voluntad'],
    8:['Fragmento de una carta nunca enviada, escrita bajo presión', 'Hueso pequeño ofrecido a cambio de un secreto'],
    7:['Retazo de sombra recortado de un rincón que nadie mira', 'Ceniza de un pacto quemado tras cumplirse'],
    6:['Espina de una rosa marchita conservada en sangre seca', 'Fragmento de vitral de una capilla en desuso'],
    5:['Cayado roto de quien cargó con una responsabilidad ajena', 'Lana teñida con la sangre de un sacrificio aceptado'],
    4:['Fragmento de armadura ennegrecida por una sombra propia', 'Filo templado en sangre y penumbra a partes iguales'],
    3:['Tres hilos de sangre distinta, entrelazados sin mezclarse', 'Sello de una trinidad de voluntades unidas por ritual'],
    2:['Página con una palabra profana que nunca debió escribirse', 'Ceniza de una traición que se cumplió como se prometió'],
    1:['Ala tejida con la propia sombra de quien la ofrece', 'Fragmento de un sacrificio que nadie más habría hecho'],
    0:['La Unicidad del Hanged Man', 'Tres Características Beyonder de Dark Angel']
  },
  death: {
    9:['Falange de un cadáver no reclamado', 'Tierra de un cementerio abandonado antes del amanecer'],
    8:['Mortaja usada en un entierro apresurado', 'Ceniza de una tumba profanada y luego sellada de nuevo'],
    7:['Voz grabada de alguien que ya murió, capturada sin querer', 'Fragmento de un espejo frente al que alguien murió'],
    6:['Cadena oxidada que ató un ataúd que no debía abrirse', 'Polvo de hueso molido bajo luna nueva'],
    5:['Llave de un cementerio que ya no figura en ningún mapa', 'Reloj detenido en la hora exacta de una muerte'],
    4:['Corazón que dejó de latir y volvió a hacerlo, distinto', 'Vendas empapadas en algo que ya no es del todo sangre'],
    3:['Remo de un bote que cruzó un río que no debería existir', 'Moneda puesta bajo la lengua de un muerto y luego retirada'],
    2:['Corona funeraria tejida con flores que no se marchitan', 'Sello de cera de un edicto que ninguna muerte puede apelar'],
    1:['Ala pálida arrancada de algo que ya no vive ni descansa', 'Fragmento de un trono hallado en el fondo de una tumba real'],
    0:['La Unicidad del Death', 'Tres Características Beyonder de Pale Emperor']
  },
  // Cuarta tanda (moon, error, whiteTower). En las fuentes consultadas (wiki de LOTM
  // vía búsqueda, Friends & Fables, Lord of Mysteries Game Wiki) no hay publicada una
  // fórmula completa Sequence por Sequence para ninguna de estas tres vías — la del
  // Marauder, por ejemplo, sólo circuló en un post del autor que no está accesible.
  // Se completó con ingredientes ORIGINALES, coherentes con el tema de cada Sequence,
  // mismo criterio ya usado para Tyrant, Twilight Giant, Sun, Hanged Man y Death.
  // Las únicas piezas con respaldo canónico son las de Sequence 0 (Unicidad + tres
  // Características de la Sequence 1, patrón general de la novela) y la descripción de
  // la Característica de Shaman King (gema de sangre condensada con brillo carmesí),
  // que se usa como referencia temática para la Sequence 4 de Moon.
  moon: {
    9:['Raíz de mandrágora arrancada bajo luna llena', 'Hiel de un animal que murió de viejo'],
    8:['Mechón de pelaje de una bestia que nunca aceptó amo', 'Sangre de un perro guardián fiel hasta el final (20 ml)'],
    7:['Colmillo de un murciélago de cueva profunda', 'Sangre carmesí que no coagula al contacto con el aire (50 ml)'],
    6:['Herbario completo anotado por un boticario muerto', 'Frasco de rocío recogido sobre una tumba reciente'],
    5:['Pétalo de una flor que sólo abre bajo luna roja', 'Pluma de un búho que cazó durante un eclipse'],
    4:['Gema de sangre condensada del tamaño de un puño', 'Tambor de piel de un chamán que nadie recuerda'],
    3:['Cristal columnar rojo oscuro que parece irreal al tacto', 'Tierra de un lugar donde se abrió una puerta para algo que no debía venir'],
    2:['Semilla que germinó en piedra muerta', 'Útero de una criatura mítica que parió una camada entera'],
    1:['Esfera carmesí cargada del concepto de belleza', 'Espejo que nunca devolvió un reflejo feo'],
    0:['La Unicidad de la Moon', 'Tres Características Beyonder de Beauty Goddess']
  },
  error: {
    9:['Guante gastado de un carterista que nunca fue atrapado', 'Moneda robada tres veces seguidas'],
    8:['Lengua bífida de una serpiente que imitaba voces', 'Contrato firmado con un nombre falso que igual se cumplió'],
    7:['Libro de claves de una sociedad secreta disuelta', 'Llave que abre una cerradura que no era la suya'],
    6:['Brasa robada de un fuego ritual ajeno', 'Fragmento de una habilidad Beyonder sustraída y conservada en ámbar'],
    5:['Almohada de alguien que perdió un sueño recurrente', 'Frasco con una intención olvidada a mitad de camino'],
    4:['Larva de un gusano que vivió dentro de otro ser sin que lo notara', 'Piel mudada de un parásito espiritual'],
    3:['Regla escrita de una ley que dejó de cumplirse por un tecnicismo', 'Máscara que engañó a un Ángel una vez'],
    2:['Caballo de madera hallado en las ruinas de una ciudad que abrió sus puertas', 'Hilo de destino ajeno cortado sin permiso'],
    1:['Reloj que atrasa exactamente lo que le robaron', 'Anillo de un gusano de luz translúcido enroscado en sí mismo'],
    0:['La Unicidad del Error', 'Tres Características Beyonder de Worm of Time']
  },
  whiteTower: {
    9:['Tinta de un manuscrito leído más de mil veces', 'Polvo de biblioteca acumulado durante un siglo'],
    8:['Tiza con la que se resolvió un teorema que nadie creía posible', 'Ojo de lechuza que vigiló un aula durante años'],
    7:['Lupa de latón que perteneció a un investigador famoso', 'Huella dactilar de un crimen resuelto sin testigos'],
    6:['Siete tratados de disciplinas distintas, todos anotados por la misma mano', 'Cerebro de una criatura que imitaba el comportamiento humano'],
    5:['Grimorio con hechizos de al menos cinco tradiciones distintas', 'Cera de un sello ritual que funcionó al primer intento'],
    4:['Página de un almanaque que acertó todas sus predicciones', 'Ojo de latón de una estatua que miraba hacia el este'],
    3:['Fórmula que describe una ley del mundo en una sola línea', 'Fragmento de un instrumento que midió algo imposible'],
    2:['Pluma arrancada de un ser que venció a un Ángel sólo con el intelecto', 'Libro que nadie terminó de escribir'],
    1:['Ojo de latón que brilla como un faro en la oscuridad', 'Estante de una biblioteca que no figura en ningún plano'],
    0:['La Unicidad de la White Tower', 'Tres Características Beyonder de Omniscient Eye']
  }
};
function ingredientsNeededFor(pathwayKey, seq){
  return (PATHWAY_INGREDIENTS[pathwayKey] && PATHWAY_INGREDIENTS[pathwayKey][seq]) || [];
}
function ownedQty(pathwayKey, ingredientName){
  return STATE.pathway.ingredientsOwned[pathwayKey+'::'+ingredientName] || 0;
}
// Lista plana de todos los ingredientes que el jugador tiene guardados, para
// mostrarlos en la pestaña Inventario (ver renderInventoryTab). Las claves de
// ingredientsOwned tienen forma "pathwayKey::nombreIngrediente".
function ownedIngredientsList(){
  const owned = STATE.pathway.ingredientsOwned;
  return Object.keys(owned)
    .filter(k=>owned[k]>0)
    .map(k=>{
      const sep = k.indexOf('::');
      return {pathwayKey:k.slice(0,sep), name:k.slice(sep+2), qty:owned[k]};
    })
    .sort((a,b)=>a.name.localeCompare(b.name));
}
function consumeIngredientsForSequence(pathwayKey, seq){
  ingredientsNeededFor(pathwayKey, seq).forEach(ing=>{
    const k = pathwayKey+'::'+ing;
    STATE.pathway.ingredientsOwned[k] = Math.max(0, (STATE.pathway.ingredientsOwned[k]||0) - 1);
    if(STATE.pathway.ingredientsOwned[k] === 0) delete STATE.pathway.ingredientsOwned[k];
  });
}
// Secuencia para la que hacen falta ingredientes en este momento: la 9 (primera
// poción) si todavía no sos Beyonder, o la próxima Sequence a la que querés avanzar.
// (Se usa como referencia conceptual — ver el mismo cálculo aplicado directamente
// en firstPotionRequirements/advancementRequirements y en eligibleIngredientPathways.)
function ingredientTargetSequence(){
  if(!STATE.pathway.chosenPathway) return 9;
  return STATE.pathway.sequence - 1;
}

// Requisito de Digestión (0-100) para avanzar DESDE cada secuencia hacia la siguiente.
const DIGESTION_REQ = {9:100, 8:100, 7:100, 6:100, 5:100, 4:100, 3:100, 2:100, 1:100, 0:100};
// Dificultad narrativa / probabilidad base de éxito del ritual de avance por secuencia origen.
const ADVANCE_DIFFICULTY = {
  9:{label:'Difícil', baseSuccess:0.55, moneyCost:800, monthsMin:8},
  8:{label:'Muy difícil', baseSuccess:0.45, moneyCost:2200, monthsMin:14},
  7:{label:'Extremadamente difícil', baseSuccess:0.35, moneyCost:6000, monthsMin:22},
  6:{label:'Evento importante', baseSuccess:0.25, moneyCost:15000, monthsMin:36, needsFlag:true},
  5:{label:'End-game temprano', baseSuccess:0.18, moneyCost:35000, monthsMin:48, needsFlag:true},
  4:{label:'End-game', baseSuccess:0.12, moneyCost:70000, monthsMin:60, needsFlag:true},
  3:{label:'Extremadamente raro', baseSuccess:0.07, moneyCost:150000, monthsMin:72, needsFlag:true},
  2:{label:'Casi legendario', baseSuccess:0.04, moneyCost:300000, monthsMin:90, needsFlag:true},
  1:{label:'Evento excepcional', baseSuccess:0.02, moneyCost:600000, monthsMin:120, needsFlag:true},
};

/* ---------------------------------------------------------------------
   FÓRMULAS (primera poción por Pathway)
   ingredientCost pasa a ser el costo de PREPARAR la poción una vez que ya
   tenés los ingredientes reales (ver PATHWAY_INGREDIENTS) — laboratorio
   improvisado, lugar seguro, tiempo de un experto, etc. Los ingredientes en
   sí ya no se compran con plata: sólo se consiguen explorando.
--------------------------------------------------------------------- */
const FIRST_POTIONS = {
  fool:{name:'Fórmula del Vidente', ingredientCost:450, prepDifficulty:0.6},
  visionary:{name:'Fórmula del Espectador', ingredientCost:520, prepDifficulty:0.6},
  redPriest:{name:'Fórmula del Cazador', ingredientCost:600, prepDifficulty:0.55},
  darkness:{name:'Fórmula del Insomne', ingredientCost:500, prepDifficulty:0.6},
  door:{name:'Fórmula del Aprendiz', ingredientCost:650, prepDifficulty:0.65},
  tyrant:{name:'Fórmula del Marinero', ingredientCost:580, prepDifficulty:0.55},
  twilightGiant:{name:'Fórmula del Guerrero', ingredientCost:560, prepDifficulty:0.5},
  hermit:{name:'Fórmula del Fisgón de Misterios', ingredientCost:530, prepDifficulty:0.6},
  sun:{name:'Fórmula del Bardo', ingredientCost:610, prepDifficulty:0.55},
  hangedMan:{name:'Fórmula del Suplicante de Secretos', ingredientCost:640, prepDifficulty:0.65},
  death:{name:'Fórmula del Recolector de Cadáveres', ingredientCost:590, prepDifficulty:0.6},
  moon:{name:'Fórmula del Boticario', ingredientCost:480, prepDifficulty:0.62},
  error:{name:'Fórmula del Saqueador', ingredientCost:520, prepDifficulty:0.58},
  whiteTower:{name:'Fórmula del Lector', ingredientCost:560, prepDifficulty:0.64}
};

// Tabla por vía generada a partir de PATHWAYS, para freshState(). Antes estos tres
// objetos (knowledge/formulaKnown/firstDiscoveryShown) se escribían a mano con las
// once claves, y olvidarse de sumar una vía nueva la dejaba invisible en partidas
// nuevas — ahora cualquier entrada de PATHWAYS aparece sola, con su valor inicial.
function perPathway(value){
  const o = {};
  Object.keys(PATHWAYS).forEach(k=>{ o[k] = value; });
  return o;
}

/* ---------------------------------------------------------------------
   ESTADO POR DEFECTO
--------------------------------------------------------------------- */
function freshState(){
  return {
    version: SAVE_VERSION,
    started: false,
    gameOver: false,
    character: {
      nombre:'', apellido:'', edad:0, genero:'', ciudad:'', clase:'', profesion:'', educacion:'',
      rasgos:[], salud:90, sanity:88, corruption:0, spirituality:8, reputation:0,
      cash:0, bank:0, debt:0, incomeBonus:0, // incomeBonus: ver seekBetterJob() en TRABAJO
      estadoCivil:'Soltero/a', vivienda:null, // ver Vida Personal (matrimonio, hijos, vivienda propia)
      // Memoria del personaje (rework v3 §8): lo que la vida le fue dejando —
      // favores, traiciones, pactos, pérdidas, lugares, gente. No es decorativo:
      // los eventos pueden condicionarse con hasMemory() para que una decisión
      // vieja habilite (o cierre) contenido años después. Ver remember().
      memory: [],
      // Secretos (rework v3 §16): a diferencia de memory (hechos de tu propia
      // vida) y de pathway.knowledge (progreso numérico por vía), esto es
      // conocimiento concreto y a veces peligroso que averiguaste. Un secreto
      // "dangerous:true" costó Cordura/Corrupción al aprenderlo — ver learnSecret().
      secrets: [],
      // Historial de Acting (rework v3 §19): últimas ~20 elecciones clasificadas
      // como 'careful'/'risky'/'neutral' por inferChoiceRisk(). No se anota a
      // mano en cada escena — se infiere del propio texto de la elección, así
      // funciona sobre las escenas que ya existen sin tocarlas una por una.
      actingHistory: []
    },
    time:{ year:1, month:1, totalMonths:0 },
    pathway:{
      knowledge:perPathway(0), // 0-100, una clave por cada entrada de PATHWAYS
      formulaKnown:perPathway(false),
      // Reemplaza al viejo ingredientProgress (0-100%): ahora cada ingrediente
      // específico se guarda acá, con clave "pathway::nombre" -> cantidad.
      // Ver PATHWAY_INGREDIENTS para qué hace falta en cada Sequence.
      ingredientsOwned:{},
      chosenPathway:null,
      sequence:null, // number once beyonder
      digestion:0,
      firstDiscoveryShown:perPathway(false),
      advanceFlags:{}, // rare-opportunity flags per sequence e.g. {6:true}
      ritualPrepBonus:0, // ver misión "Preparación previa al ritual" (Ritual) — se consume en attemptAdvancement()
      // Rumores (rework v3 §14): pistas sueltas de investigar, que pueden ser
      // ciertas o no. {key, correct, text, year}. El jugador las ve todas
      // igual — no hay forma de distinguir a simple vista cuál es cuál, y de
      // eso se trata: el mundo no te confirma nada gratis.
      rumors:[]
    },
    factions:{
      church:{name:'Church of the Evernight Goddess', publicRep:0, known:true},
      nighthawks:{name:'Nighthawks', publicRep:0, known:false},
      tarotClub:{name:'Tarot Club', secretRep:0, known:false, discovered:false}
    },
    // Mundo vivo (rework v3 §29): ciudades y organizaciones que se mueven por su
    // cuenta, sin depender del jugador, y que además lo afectan de vuelta
    // (prosperidad → ingresos y empleo; seguridad → peligro real en la calle;
    // una facción "investigando" → más sospechas encima). attention es cuánto
    // registró el mundo al jugador (§17).
    world:{
      prosperity:55,   // 0-100
      security:60,     // 0-100 — más bajo = más peligro en eventos y exploración
      attention:0,     // 0-100 — cuánto te tiene fichado el mundo oculto
      factionMood:{ church:'normal', nighthawks:'normal', tarotClub:'normal' },
      log:[]           // últimos titulares del mundo, para la pestaña Facciones
    },
    npcs: initialNPCs(),
    inventory:{ books:[], documents:[], formulas:[], artifacts:[], combatItems:[] },
    journal:[],
    // Hitos de la vida (nacimiento, descubrimiento de vía, primera poción, cada
    // Advancement, boda, hijos, pérdidas, final) para la línea de tiempo del
    // epílogo. Van aparte del journal a propósito: el journal se recorta a 400
    // entradas y en una vida larga perdería justo los hitos de la infancia.
    // Campo aditivo — un save sin él se completa en migrateSave.
    milestones:[],
    flags:{ mysticExposure:0, metOccultContact:false, tarotHint:0, monthsSinceEvent:0, lastJobSearchMonth:-999 },
    pendingEvent:null, // {id, title, text, choices:[...]} awaiting player input
    pendingMission:null, // {missionId, type, title, text, choices:[...]} — ver sección MISIONES
    missions:{ completedIds:[] }, // ids de misiones no-repetibles ya resueltas
    combat:null, // {enemy:{...}, seqRevealStage, seqEstimateRange, log:[...]} — ver sección COMBATE
    // Consecuencias retrasadas (rework v3 §7): decisiones que no muestran todo su
    // efecto en el momento, sino meses o años después. Cada entrada es
    // {dueMonth, tag, title, text, effect, memory}. Se revisan una vez por mes en
    // processMonth (ver processPendingConsequences) y son, junto con la memoria del
    // personaje, lo que permite el "ah, era por aquello de hace diez años".
    pendingConsequences:[],
    // Cupo de acciones repetibles de la temporada actual (se resetea cada 3 meses,
    // ver SEASON_ACTION_LIMITS). "jobSearch" no vive acá: usa su propio enfriamiento
    // de 12 meses en flags.lastJobSearchMonth porque buscar mejor empleo tiene que
    // seguir siendo raro aunque el botón de avance ahora sea más frecuente.
    seasonActions:{ investigate:0, acting:0, work:0, explore:0, missions:0 }
  };
}

// Nombres usados para generar la familia al azar en cada partida nueva (ver
// startNewGame): padre/madre/hermanos comparten el apellido del jugador, la
// vecina usa un apellido propio de la pool NEIGHBOR_SURNAMES.
const FAMILY_MALE_NAMES = ['Alden','Marcus','Victor','Edwin','Thomas','Bernard','Cedric','Leopold','Gideon','Oswald','Reginald','Percival','Desmond','Ambrose','Julian','Roland'];
const FAMILY_FEMALE_NAMES = ['Rosalind','Margaret','Eleanor','Charlotte','Beatrice','Florence','Agnes','Josephine','Vivian','Cordelia','Adelaide','Genevieve','Wilhelmina','Theodora'];
const NEIGHBOR_SURNAMES = ['Marrow','Hale','Whitlock','Pryce','Ashford','Doyle','Sutton','Blackwood'];

function initialNPCs(){
  return [
    {id:'padre', name:'', role:'Padre', trust:60, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:null,sequence:null,faction:null}},
    {id:'madre', name:'', role:'Madre', trust:65, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:null,sequence:null,faction:null}},
    {id:'amigo', name:'Gregor Voss', role:'Amigo de la infancia', trust:40, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:null,sequence:null,faction:null}},
    {id:'vecina', name:'Elisa Marrow', role:'Vecina', trust:20, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:null,sequence:null,faction:null}},
    {id:'extraño', name:'Sr. Cain', role:'Cliente extraño', trust:5, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:'fool', sequence:6, faction:'tarotClub'}},
    {id:'sacerdote', name:'Padre Yulen', role:'Sacerdote local', trust:15, suspicion:0, known:{pathway:false,sequence:false,faction:false}, alive:true, hidden:{pathway:null, sequence:null, faction:'church'}}
  ];
}

/* ---------------------------------------------------------------------
   NPCS CON VIDA PROPIA (rework v3 §9, §10, §29)
   El objetivo es que el mundo no espere al jugador: los NPCs persiguen sus
   propios objetivos, cambian de trabajo, se mudan, se casan, sospechan, se
   acercan a facciones, se enferman, se van o mueren — sin que el jugador
   haga nada. Cada cosa que pasa queda en el Journal, así se nota que la vida
   ajena siguió su curso mientras vos hacías otra cosa.
   Categorías (§10): cuanto más importante es un NPC, más difícil es que
   desaparezca de tu vida sin más.
--------------------------------------------------------------------- */
const NPC_TIERS = { comun:'comun', recurrente:'recurrente', importante:'importante', misterioso:'misterioso' };

const NPC_GOAL_POOL = [
  'conseguir un trabajo mejor', 'ahorrar para algo propio', 'proteger a su familia',
  'salir del barrio', 'que lo tomen en serio', 'encontrar a alguien',
  'entender qué le pasó a alguien que quería', 'ocultar algo que hizo'
];

// Completa de forma perezosa los campos de "vida propia" que una partida vieja
// (o un NPC creado en caliente) puede no tener todavía.
function ensureNpcLife(npc){
  if(!npc) return npc;
  ensureRel(npc);
  if(!npc.tier){
    // La familia directa y los personajes atados a misiones no son descartables;
    // el resto arranca como gente común que puede entrar y salir de tu vida.
    if(['padre','madre','conyuge'].includes(npc.id) || npc.id.startsWith('hijo')) npc.tier = NPC_TIERS.importante;
    else if(npc.id.startsWith('hermano') || npc.id==='amigo') npc.tier = NPC_TIERS.recurrente;
    else if(npc.id==='extraño') npc.tier = NPC_TIERS.misterioso;
    else if(npc.id==='sacerdote') npc.tier = NPC_TIERS.recurrente;
    else npc.tier = NPC_TIERS.comun;
  }
  if(!npc.goals) npc.goals = [pick(NPC_GOAL_POOL)];
  if(!npc.lifeState) npc.lifeState = 'presente'; // 'presente' | 'lejos' | 'distanciado'
  return npc;
}

// Eventos que le pasan a un NPC por su cuenta. Cada uno declara a quién le
// puede pasar (req) y qué deja: cambios de vínculo, de estado de vida, o una
// marca en la memoria del jugador si es algo que uno no se olvida.
const NPC_LIFE_EVENTS = [
  {w:5, req:(n)=>n.lifeState==='presente', run:(n)=>{
    adjustRel(n, {respect:rndInt(3,8)});
    return `${n.name} consigue un trabajo mejor. Se lo ve distinto, más seguro.`;
  }},
  {w:4, req:(n)=>n.lifeState==='presente' && n.tier!==NPC_TIERS.misterioso, run:(n)=>{
    adjustRel(n, {affection:rndInt(2,6), trust:rndInt(1,4)});
    return `${n.name} atraviesa una buena época y se acuerda de invitarte a algo.`;
  }},
  {w:3, req:(n)=>n.lifeState==='presente' && ['comun','recurrente'].includes(n.tier), run:(n)=>{
    n.lifeState = 'lejos';
    adjustRel(n, {trust:-rndInt(3,8), affection:-rndInt(2,6)});
    remember('npc_se_fue', `${n.name} se fue de la ciudad.`);
    return `${n.name} se muda a otra ciudad. Prometen escribirse; casi nunca pasa.`;
  }},
  {w:3, req:(n)=>n.lifeState==='lejos', run:(n)=>{
    n.lifeState = 'presente';
    adjustRel(n, {affection:rndInt(3,8)});
    return `${n.name} vuelve a la ciudad después de un tiempo afuera.`;
  }},
  {w:3, req:(n)=>n.lifeState==='presente' && !['padre','madre'].includes(n.id) && !n.id.startsWith('hijo'), run:(n)=>{
    adjustRel(n, {affection:rndInt(2,5)});
    return `${n.name} se casa. Te enterás con más o menos anticipación según cuánto se hablen últimamente.`;
  }},
  {w:3, req:(n)=>n.lifeState==='presente', run:(n)=>{
    adjustRel(n, {trust:-rndInt(2,6), loyalty:-rndInt(2,5)});
    return `${n.name} pasa por un mal momento y vos te enterás tarde. Queda esa incomodidad.`;
  }},
  {w:4, req:(n)=>n.lifeState==='presente' && STATE.flags.mysticExposure >= 20, run:(n)=>{
    adjustRel(n, {suspicion:rndInt(5,14)});
    return `${n.name} te hace una pregunta rara sobre dónde estuviste. No insiste, pero se queda mirándote un segundo de más.`;
  }},
  {w:2, req:(n)=>n.lifeState==='presente' && !n.hidden.faction && STATE.flags.mysticExposure >= 25, run:(n)=>{
    const f = pick(['church','nighthawks']);
    n.hidden.faction = f;
    return `${n.name} empieza a frecuentar gente nueva. Vos no sabés quiénes son — todavía.`;
  }},
  {w:2, req:(n)=>n.lifeState==='presente' && n.trust>=60, run:(n)=>{
    adjustRel(n, {loyalty:rndInt(5,12)});
    remember('npc_favor_recibido', `${n.name} te hizo un favor sin que se lo pidieras.`);
    return `${n.name} te hace un favor sin que se lo pidieras. De esos que uno no se olvida.`;
  }},
  {w:2, req:(n)=>n.lifeState==='presente' && n.suspicion>=55, run:(n)=>{
    adjustRel(n, {trust:-rndInt(6,15), loyalty:-rndInt(5,12), fear:rndInt(3,9)});
    remember('npc_desconfia', `${n.name} empezó a tomar distancia de vos.`);
    return `${n.name} empieza a evitarte. No dice por qué, y vos tampoco preguntás.`;
  }},
  {w:1, req:(n)=>n.lifeState==='presente' && n.tier===NPC_TIERS.comun, run:(n)=>{
    n.lifeState = 'distanciado';
    adjustRel(n, {trust:-rndInt(5,12), affection:-rndInt(5,12)});
    return `Con ${n.name} dejan de verse, sin pelea ni motivo. Simplemente pasa.`;
  }},
];

// Una vez por mes, a lo sumo un NPC hace algo por su cuenta. Es poco frecuente
// a propósito: la idea es que el mundo se mueva de fondo, no que cada mes sea
// una telenovela.
function npcLifeTick(){
  if(STATE.gameOver) return false;
  if(STATE.character.edad < 6) return false; // de muy chico no registrarías nada de esto
  if(!chance(0.18)) return false;
  const candidatos = STATE.npcs.filter(n=>n.alive).map(ensureNpcLife);
  if(!candidatos.length) return false;
  const npc = pick(candidatos);
  const elegibles = NPC_LIFE_EVENTS.filter(e=>!e.req || e.req(npc));
  if(!elegibles.length) return false;
  // Ojo: weightedPick vuelve a filtrar por req() SIN argumentos, y los req de
  // estos eventos reciben el NPC. Por eso se le pasa la lista ya filtrada y sin
  // req — si no, adentro de weightedPick el parámetro llega undefined y explota.
  const ev = weightedPick(elegibles.map(e=>({w:e.w, run:e.run})));
  if(!ev) return false;
  const texto = ev.run(npc);
  logJournal('La vida de ' + npc.name, texto);
  return true;
}

// Desgaste natural de los vínculos que no se cultivan (una vez por año). Sin
// esto, una amistad de la infancia seguía intacta a los 70 años sin haber
// hablado nunca. La familia directa se desgasta mucho más despacio.
function decayRelationships(){
  STATE.npcs.forEach(n=>{
    if(!n.alive) return;
    ensureNpcLife(n);
    const esFamilia = ['padre','madre','conyuge'].includes(n.id) || n.id.startsWith('hijo') || n.id.startsWith('hermano');
    const lejos = n.lifeState !== 'presente';
    const base = esFamilia ? 1 : 2;
    const extra = lejos ? 2 : 0;
    adjustRel(n, {trust:-(base+extra), affection:-(base+extra)});
  });
}

/* ---------------------------------------------------------------------
   MUNDO VIVO (rework v3 §29, §17)
   El mundo se mueve solo: las ciudades prosperan o se pudren, las
   organizaciones reclutan, se pelean entre ellas, se purgan por dentro o
   empiezan a investigar. Nada de esto lo dispara el jugador, y todo lo afecta
   de vuelta en cosas concretas — plata, peligro en la calle, sospechas encima.
   worldAttention es el otro lado: cuánto lo tiene fichado a él ese mundo.
--------------------------------------------------------------------- */
function worldAdjust(deltas){
  const w = STATE.world;
  if(!w) return;
  if(deltas.prosperity) w.prosperity = clamp(w.prosperity + deltas.prosperity, 0, 100);
  if(deltas.security)   w.security   = clamp(w.security   + deltas.security,   0, 100);
  if(deltas.attention)  w.attention  = clamp(w.attention  + deltas.attention,  0, 100);
}
function logWorld(text){
  const w = STATE.world;
  if(!w) return;
  w.log.unshift({year:STATE.time.year, text});
  if(w.log.length > 12) w.log.pop();
}
// Subir la atención del mundo: lo llaman el uso de poderes, la exploración
// peligrosa y las decisiones ruidosas. Se declara acá para que todos los
// sistemas usen la misma puerta de entrada.
function raiseAttention(n){ worldAdjust({attention:n}); }

const WORLD_EVENTS = [
  // --- ciudad ---
  {w:5, run:()=>{ worldAdjust({prosperity:rndInt(3,9)}); return 'Una nueva línea de fábricas abre en las afueras. Hay trabajo y hay ruido.'; }},
  {w:5, run:()=>{ worldAdjust({prosperity:-rndInt(3,9)}); return 'Cierra una de las industrias grandes de la zona. Mucha gente queda en la calle.'; }},
  {w:4, run:()=>{ worldAdjust({security:rndInt(4,10)}); return 'La policía refuerza las patrullas nocturnas tras una seguidilla de robos.'; }},
  {w:4, run:()=>{ worldAdjust({security:-rndInt(4,11)}); return 'Corre el rumor de que hubo varias desapariciones cerca del puerto. Nadie da explicaciones.'; }},
  {w:3, run:()=>{ worldAdjust({prosperity:-rndInt(2,6), security:-rndInt(2,6)}); return 'Una epidemia menor obliga a cerrar barrios enteros durante semanas.'; }},
  {w:3, run:()=>{ worldAdjust({prosperity:rndInt(2,6), security:rndInt(1,4)}); return 'El tendido de gas y alumbrado llega a barrios donde antes no había nada.'; }},
  {w:2, run:()=>{ worldAdjust({security:-rndInt(5,13)}); return 'Estalla un conflicto obrero que termina a los tiros. La ciudad queda tensa durante meses.'; }},

  // --- facciones ---
  {w:4, run:()=>{
    STATE.world.factionMood.church = 'reclutando';
    if(STATE.factions.church) STATE.factions.church.publicRep = clamp((STATE.factions.church.publicRep||0)+rndInt(2,6), -100, 100);
    return 'La Iglesia de la Diosa de la Noche Eterna abre convocatoria pública. Se la ve por todos lados.';
  }},
  {w:3, run:()=>{
    STATE.world.factionMood.church = 'investigando';
    return 'Se comenta que la Iglesia está investigando algo que no quiere nombrar en voz alta.';
  }},
  {w:3, req:()=>STATE.factions.nighthawks && STATE.factions.nighthawks.known, run:()=>{
    STATE.world.factionMood.nighthawks = 'operando';
    worldAdjust({security:rndInt(3,8)});
    return 'Los Nighthawks aparecen operando de noche en varios barrios. Después, silencio.';
  }},
  {w:2, run:()=>{
    STATE.world.factionMood.nighthawks = 'investigando';
    return 'Hay gente haciendo preguntas puerta por puerta. No dicen para quién trabajan.';
  }},
  {w:2, run:()=>{
    const a = pick(['church','nighthawks']);
    STATE.world.factionMood[a] = 'en conflicto';
    worldAdjust({security:-rndInt(3,8)});
    return 'Dos organizaciones que nadie termina de nombrar chocan por algo. Hay heridos que nunca llegan a los diarios.';
  }},
  {w:2, run:()=>{
    STATE.world.factionMood.church = 'normal';
    STATE.world.factionMood.nighthawks = 'normal';
    return 'Después de un tiempo movido, todo vuelve a una calma aparente.';
  }},
  {w:2, req:()=>STATE.factions.tarotClub && STATE.factions.tarotClub.discovered, run:()=>{
    STATE.world.factionMood.tarotClub = 'activo';
    return 'El Tarot Club se mueve. Vos lo notás porque sabés qué mirar; el resto de la ciudad, no.';
  }},
];

// El mundo se mueve por temporada, no todos los meses: es de fondo, no el
// centro de la partida.
function worldTick(){
  if(STATE.gameOver || !STATE.world) return false;
  const elegibles = WORLD_EVENTS.filter(e=>!e.req || e.req());
  if(!elegibles.length) return false;
  const ev = weightedPick(elegibles.map(e=>({w:e.w, run:e.run})));
  if(!ev) return false;
  const texto = ev.run();
  logWorld(texto);
  logJournal('El mundo sigue su curso', texto);

  // La atención baja sola si el jugador no hace ruido; una facción que está
  // investigando la mantiene alta mucho más tiempo.
  const investigando = Object.values(STATE.world.factionMood).some(m=>m==='investigando');
  worldAdjust({attention: investigando ? -1 : -3});
  return true;
}

// Consecuencias de vivir en esta ciudad, en este momento: no son números
// decorativos, tocan plata, peligro y sospechas.
function worldIncomeMult(){
  if(!STATE.world) return 1;
  return 0.8 + (STATE.world.prosperity/250); // ~0.8 a ~1.2
}
function worldDangerMult(){
  if(!STATE.world) return 1;
  return 1.35 - (STATE.world.security/150); // seguridad baja = más encuentros
}
// Con mucha atención encima, la gente de tu entorno empieza a sospechar sola.
function worldAttentionPressure(){
  if(!STATE.world || STATE.world.attention < 40) return;
  if(!chance(0.12)) return;
  const vivos = STATE.npcs.filter(n=>n.alive);
  if(!vivos.length) return;
  const npc = ensureNpcLife(pick(vivos));
  adjustRel(npc, {suspicion:rndInt(3,9)});
}

/* ---------------------------------------------------------------------
   RELACIONES MULTIDIMENSIONALES (rework v3 §11)
   Antes cada vínculo era un solo número (trust) y eso achataba todo: alguien
   que te quiere y alguien que te teme se veían igual. Ahora conviven varios
   ejes, y lo interesante es la COMBINACIÓN — trust 90 con fear 70 no es lo
   mismo que trust 90 con affection 70.
   Compatibilidad: el resto del código sigue escribiendo npc.trust directamente
   y eso se respeta a propósito (no se rompió nada de lo que ya funcionaba).
   Los ejes nuevos se completan de forma perezosa con ensureRel(), que también
   cubre a los NPCs creados en caliente (pareja, hijos, hermanos) y a las
   partidas viejas que se migran sin estos campos.
--------------------------------------------------------------------- */
const RELATION_DIMS = ['trust','affection','fear','respect','loyalty','suspicion'];

function ensureRel(npc){
  if(!npc) return npc;
  if(npc.trust === undefined) npc.trust = 30;
  if(npc.suspicion === undefined) npc.suspicion = 0;
  // Los ejes nuevos arrancan derivados de la confianza que ya existía, para que
  // una partida vieja no se despierte con todos los vínculos en cero.
  if(npc.affection === undefined) npc.affection = clamp(Math.round(npc.trust*0.7), 0, 100);
  if(npc.respect === undefined)   npc.respect   = clamp(Math.round(npc.trust*0.5), 0, 100);
  if(npc.loyalty === undefined)   npc.loyalty   = clamp(Math.round(npc.trust*0.6), 0, 100);
  if(npc.fear === undefined)      npc.fear      = 0;
  return npc;
}
function adjustRel(npc, deltas){
  if(!npc) return;
  ensureRel(npc);
  for(const k in deltas){
    if(RELATION_DIMS.indexOf(k) < 0) continue;
    npc[k] = clamp(npc[k] + deltas[k], 0, 100);
  }
}
// Lectura cualitativa del vínculo (rework v3 §40: no mostrar todo en números
// crudos). Devuelve una frase corta que describe la combinación de ejes, no un
// listado de seis barras que nadie va a leer.
function relationshipLabel(npc){
  ensureRel(npc);
  const {trust, affection, fear, respect, loyalty, suspicion} = npc;
  const partes = [];
  if(fear >= 55 && trust >= 55) partes.push('te respeta y te teme en partes iguales');
  else if(fear >= 55) partes.push('te tiene miedo');
  else if(affection >= 70) partes.push('te quiere de verdad');
  else if(affection >= 40) partes.push('te tiene cariño');
  else if(trust >= 60) partes.push('confía en vos');
  else if(trust <= 15) partes.push('apenas te conoce');
  else partes.push('te trata con cordialidad');

  if(suspicion >= 50) partes.push('sospecha algo de vos');
  else if(loyalty >= 70) partes.push('te sería leal si las cosas se pusieran feas');
  else if(respect >= 70) partes.push('valora mucho tu criterio');
  return partes.join(', ');
}

// Entre 0 y 3 hermanos/as al azar (0 o 1 es lo más común; 3 es raro), cada uno
// mayor, menor o gemelo/a, con nombre y confianza inicial también al azar.
// Mismo esquema que padre/madre (id/name/role/trust/suspicion/known/alive/hidden)
// para que investigar, el render de Relaciones, etc. los traten igual sin
// necesitar ningún caso especial.
// Diferencia de edad de un hermano/a respecto del personaje, según su rol: los
// mayores le llevan 1-8 años, los menores tienen 1-8 menos, los gemelos 0. Mismo
// criterio de ageOffset que padre/madre (edad del NPC = edad del personaje +
// ageOffset), así checkNpcMortality los trata igual sin casos especiales.
function siblingAgeOffset(role){
  if(/gemel/i.test(role)) return 0;
  if(/mayor/i.test(role)) return rndInt(1,8);
  return -rndInt(1,8);
}

function generateSiblings(apellido){
  const roll = Math.random();
  let count;
  if(roll < 0.30) count = 0;
  else if(roll < 0.65) count = 1;
  else if(roll < 0.88) count = 2;
  else count = 3;

  const siblings = [];
  for(let i=0;i<count;i++){
    const isMale = chance(0.5);
    const firstName = pick(isMale ? FAMILY_MALE_NAMES : FAMILY_FEMALE_NAMES);
    const ageRoll = Math.random();
    let role;
    if(ageRoll < 0.15) role = isMale ? 'Hermano gemelo' : 'Hermana gemela';
    else if(ageRoll < 0.575) role = isMale ? 'Hermano mayor' : 'Hermana mayor';
    else role = isMale ? 'Hermano menor' : 'Hermana menor';
    siblings.push({
      id:'hermano'+(i+1), name:firstName+' '+apellido, role, ageOffset:siblingAgeOffset(role), trust:rndInt(25,70), suspicion:0,
      known:{pathway:false,sequence:false,faction:false}, alive:true,
      hidden:{pathway:null,sequence:null,faction:null}
    });
  }
  return siblings;
}

let STATE = freshState();

/* ---------------------------------------------------------------------
   UTILIDADES
--------------------------------------------------------------------- */
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function rnd(min,max){ return Math.random()*(max-min)+min; }
function rndInt(min,max){ return Math.floor(rnd(min,max+1)); }
function chance(p){ return Math.random() < p; }
function fmtMoney(v){ return '£' + Math.round(v).toLocaleString('es-AR'); }
function pick(arr){ return arr[rndInt(0,arr.length-1)]; }

// Un solo toast visible a la vez: si ya hay uno en pantalla (o llega otro antes de
// que se cierre), se reemplaza en vez de apilarse. Antes cada click en botones que
// se pueden repetir rápido (ej. "Investigar") sumaba un toast nuevo arriba del
// anterior y la pantalla terminaba tapada de popups superpuestos.
// msgOrList puede ser un string simple, o un array de {msg,type} para agrupar
// varios cambios de stat en un solo popup (ej. los efectos de una elección de Acting).
function toast(msgOrList, type){
  const c = document.getElementById('toast-container');
  c.innerHTML = '';
  if(Array.isArray(msgOrList) && msgOrList.length===0) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type==='pos'?' pos':type==='neg'?' neg':'');
  if(Array.isArray(msgOrList)){
    el.innerHTML = msgOrList.map(m=>`<div class="toast-line ${m.type==='pos'?'pos':m.type==='neg'?'neg':''}">${m.msg}</div>`).join('');
  } else {
    el.textContent = msgOrList;
  }
  c.appendChild(el);
  setTimeout(()=>{ if(el.parentNode){ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); } }, 3200);
}

// Agrega un objeto al inventario apilando cantidades (x2, x3...) en vez de crear
// un slot nuevo por cada copia idéntica. `category` es la lista dentro de
// STATE.inventory (por ahora 'books'; el mismo helper sirve para lo que se sume después).
function addInventoryItem(category, name, meta){
  const list = STATE.inventory[category];
  const existing = list.find(it=>it.name===name);
  if(existing){ existing.qty += 1; }
  else { list.push({name, meta, qty:1}); }
}
// Complemento de addInventoryItem: resta una unidad de la pila y, si llega a 0,
// saca la entrada del todo (para no dejar slots "x0" dando vueltas en el inventario).
function removeInventoryItem(category, name){
  const list = STATE.inventory[category];
  const idx = list.findIndex(it=>it.name===name);
  if(idx<0) return;
  list[idx].qty -= 1;
  if(list[idx].qty <= 0) list.splice(idx,1);
}

function logJournal(title, text){
  STATE.journal.unshift({
    year: STATE.time.year, month: STATE.time.month, title, text
  });
  if(STATE.journal.length > 400) STATE.journal.pop();
}

// Registra un hito para la línea de tiempo del epílogo (ver renderEndScreen).
// kind agrupa el ícono/color en pantalla: 'birth' | 'mystic' | 'potion' |
// 'advance' | 'family' | 'loss' | 'end'.
function addMilestone(kind, text){
  if(!Array.isArray(STATE.milestones)) STATE.milestones = [];
  STATE.milestones.push({kind, text, edad: STATE.character.edad, year: STATE.time.year});
  if(STATE.milestones.length > 80) STATE.milestones.splice(1, 1); // conserva siempre el nacimiento
}

/* ---------------------------------------------------------------------
   MEMORIA DEL PERSONAJE Y CONSECUENCIAS RETRASADAS (rework v3 §7 y §8)
   Dos sistemas chicos pero que sostienen el principio narrativo central del
   rework: que el jugador a veces NO entienda por qué pasó algo, y que diez
   años después pueda darse cuenta de que fue por una decisión vieja.
   - remember(): deja una marca durable en el personaje (un favor, una
     traición, un pacto, una pérdida). Los eventos pueden pedirla con
     hasMemory() en su req, así una decisión vieja habilita o cierra
     contenido futuro en vez de evaporarse apenas se resuelve.
   - scheduleConsequence(): agenda un efecto para dentro de N meses. Se
     dispara solo, desde processMonth, sin que el jugador sepa que estaba
     pendiente.
--------------------------------------------------------------------- */
function remember(tag, text){
  const mem = STATE.character.memory;
  // Una misma marca puede repetirse (ej. varias traiciones), pero se guarda
  // cuándo pasó cada una para poder narrarlo después.
  mem.push({ tag, text, year: STATE.time.year, month: STATE.time.month, totalMonths: STATE.time.totalMonths });
  if(mem.length > 200) mem.shift();
}
function hasMemory(tag){ return STATE.character.memory.some(m=>m.tag===tag); }
function countMemory(tag){ return STATE.character.memory.filter(m=>m.tag===tag).length; }
function memoriesOf(tag){ return STATE.character.memory.filter(m=>m.tag===tag); }

function scheduleConsequence({inMonths, tag, title, text, effect, memory}){
  STATE.pendingConsequences.push({
    dueMonth: STATE.time.totalMonths + Math.max(1, inMonths),
    tag: tag || null,
    title, text,
    effect: effect || null,
    memory: memory || null
  });
}

// Se llama una vez por mes desde processMonth. Devuelve true si disparó alguna
// consecuencia, para que el avance rápido de tiempo se frene y el jugador
// efectivamente LEA lo que pasó en vez de que se le pase de largo.
function processPendingConsequences(){
  if(!STATE.pendingConsequences || !STATE.pendingConsequences.length) return false;
  const due = STATE.pendingConsequences.filter(pc=>pc.dueMonth <= STATE.time.totalMonths);
  if(!due.length) return false;
  STATE.pendingConsequences = STATE.pendingConsequences.filter(pc=>pc.dueMonth > STATE.time.totalMonths);
  due.forEach(pc=>{
    // El efecto puede ser una función (para poder mirar el estado actual del
    // personaje en el momento en que realmente ocurre, no cuando se agendó).
    const eff = typeof pc.effect === 'function' ? pc.effect() : pc.effect;
    if(eff) applyEffects(eff);
    if(pc.memory) remember(pc.memory.tag, pc.memory.text);
    logJournal(pc.title, pc.text);
  });
  return true;
}

function applyEffects(eff){
  // eff: {salud, sanity, corruption, spirituality, reputation, cash, bank, debt, knowledge:{pathway:amt}, digestion, toast}
  const c = STATE.character;
  // Los rasgos de personalidad (ver TRAITS_DATA/getTraitMods) escalan acá, en el
  // único cuello de botella por el que pasa todo cambio de stat del personaje —
  // así una bonificación de rasgo aplica por igual venga del trabajo, un evento,
  // una misión o un combate, sin tener que tocar cada sistema por separado.
  const tm = getTraitMods();
  if(eff.salud) c.salud = clamp(c.salud + (eff.salud<0 ? Math.round(eff.salud*tm.healthLossMult) : eff.salud), 0, 100);
  if(eff.sanity) c.sanity = clamp(c.sanity + (eff.sanity<0 ? Math.round(eff.sanity*tm.sanityLossMult) : eff.sanity), 0, 100);
  if(eff.corruption) c.corruption = clamp(c.corruption + (eff.corruption>0 ? Math.round(eff.corruption*tm.corruptionMult) : eff.corruption), 0, 100);
  if(eff.spirituality) c.spirituality = clamp(c.spirituality + eff.spirituality, 0, 100);
  if(eff.reputation) c.reputation = clamp(c.reputation + (eff.reputation>0 ? Math.round(eff.reputation*tm.reputationMult) : eff.reputation), -100, 100);
  if(eff.cash) c.cash = c.cash + (eff.cash>0 ? Math.round(eff.cash*tm.cashMult) : eff.cash);
  if(eff.bank) c.bank = c.bank + eff.bank;
  if(eff.debt) c.debt = Math.max(0, c.debt + eff.debt);
  if(eff.digestion && STATE.pathway.chosenPathway){
    const dig = eff.digestion>0 ? eff.digestion*tm.digestionMult : eff.digestion;
    STATE.pathway.digestion = clamp(STATE.pathway.digestion + dig, 0, 100);
  }
  if(eff.knowledge){
    for(const k in eff.knowledge){
      STATE.pathway.knowledge[k] = clamp((STATE.pathway.knowledge[k]||0) + eff.knowledge[k], 0, 100);
      checkPathwayDiscoveryReveal(k);
    }
  }
  if(eff.toastMsgs && eff.toastMsgs.length){
    // Usa el mismo mecanismo de toast agrupado que el resto del juego (ver resolveActingChoice),
    // para que, si en el futuro algún evento llega a usar este campo, no vuelva a apilar
    // varios toasts sueltos uno arriba del otro.
    toast(eff.toastMsgs);
  }
}

function effectsToToastList(eff){
  const list = [];
  if(eff.salud) list.push({msg:(eff.salud>0?'+':'')+eff.salud+' Salud', type: eff.salud>0?'pos':'neg'});
  if(eff.sanity) list.push({msg:(eff.sanity>0?'+':'')+eff.sanity+' Cordura', type: eff.sanity>0?'pos':'neg'});
  if(eff.corruption) list.push({msg:(eff.corruption>0?'+':'')+eff.corruption+' Corrupción', type: eff.corruption>0?'neg':'pos'});
  if(eff.spirituality) list.push({msg:(eff.spirituality>0?'+':'')+eff.spirituality+' Espiritualidad', type:'pos'});
  if(eff.reputation) list.push({msg:(eff.reputation>0?'+':'')+eff.reputation+' Reputación', type: eff.reputation>0?'pos':'neg'});
  if(eff.cash) list.push({msg:(eff.cash>0?'+':'')+fmtMoney(eff.cash), type: eff.cash>0?'pos':'neg'});
  if(eff.digestion) list.push({msg:(eff.digestion>0?'+':'')+eff.digestion+' Digestión', type: eff.digestion>0?'pos':'neg'});
  if(eff.knowledge){ for(const k in eff.knowledge){ list.push({msg:'+'+eff.knowledge[k]+' Conocimiento ('+PATHWAYS[k].name+')', type:'pos'}); } }
  return list;
}

/* ---------------------------------------------------------------------
   ETAPAS DE DESCUBRIMIENTO DE PATHWAY
--------------------------------------------------------------------- */
function discoveryStage(v){
  if(v<=0) return 'Unknown';
  if(v<25) return 'Rumored';
  if(v<50) return 'Discovered';
  if(v<75) return 'Understood';
  if(v<100) return 'Available';
  return 'Obtained';
}
function stageColorClass(stage){
  return {Unknown:'', Rumored:'tag', Discovered:'tag-violet', Understood:'tag-violet', Available:'tag-gold', Obtained:'tag-gold'}[stage] || 'tag';
}
// discoveryStage() se mantiene en inglés como clave interna porque el resto del
// código la usa en comparaciones (stage==='Available', etc.) — esta función sólo
// traduce lo que efectivamente se muestra en pantalla, sin tocar esa lógica.
function stageLabel(stage){
  return {Unknown:'Desconocida', Rumored:'Rumoreada', Discovered:'Descubierta', Understood:'Comprendida', Available:'Disponible', Obtained:'Obtenida'}[stage] || stage;
}

function checkPathwayDiscoveryReveal(key){
  const v = STATE.pathway.knowledge[key];
  if(v >= 25 && !STATE.pathway.firstDiscoveryShown[key]){
    STATE.pathway.firstDiscoveryShown[key] = true;
    STATE._importantMoment = true; // el avance rápido de tiempo no debe pasar por encima de esto
    // Sólo el primer descubrimiento entra a la línea de tiempo: es el momento en que
    // el mundo oculto deja de ser rumor. Los siguientes quedan en el journal.
    if(!(STATE.milestones||[]).some(m=>m.kind==='mystic')) addMilestone('mystic', `Descubre la existencia de la vía ${PATHWAYS[key].name}`);
    showDiscoverySeal(key);
  }
  if(v >= 50 && !STATE.pathway.formulaKnown[key] && chance(0.35)){
    STATE.pathway.formulaKnown[key] = true;
    logJournal('Fórmula Descubierta', 'Encontraste referencias suficientes para reconstruir la fórmula asociada a esta vía. El conocimiento en sí ya es peligroso.');
  }
}

// Modal de confirmación propio, en vez de window.confirm(): varios visores de HTML
// embebido (por ejemplo la vista previa de archivos dentro de la app de Claude)
// bloquean confirm()/alert() en silencio — el botón parecía simplemente no hacer
// nada, sin ningún error. Este modal corre enteramente dentro de la página (mismo
// patrón que showDiscoverySeal de acá abajo), así que funciona en cualquier contexto.
function showConfirmModal(message, onConfirm, confirmLabel){
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn" id="confirm-cancel-btn">Cancelar</button>
        <button class="btn btn-danger" id="confirm-ok-btn">${confirmLabel || 'Confirmar'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // Igual que en showDiscoverySeal: buscar los botones DENTRO de este overlay
  // concreto (overlay.querySelector), no con document.getElementById, por si
  // llegara a haber más de un modal apilado.
  const close = ()=> overlay.remove();
  overlay.querySelector('#confirm-cancel-btn').onclick = close;
  overlay.querySelector('#confirm-ok-btn').onclick = ()=>{ close(); onConfirm(); };
}

function showDiscoverySeal(key){
  const p = PATHWAYS[key];
  const overlay = document.createElement('div');
  overlay.className = 'seal-overlay';
  overlay.innerHTML = `
    <div class="seal-title">Vía Descubierta</div>
    <div class="seal-ring"><span class="seal-q">?</span></div>
    <div class="seal-body">Conseguiste información sobre una vía sobrenatural desconocida. Fragmentos, rumores y coincidencias comienzan a converger en tu mente.</div>
    <button class="btn btn-primary" id="seal-reveal-btn">Revelar</button>
  `;
  document.body.appendChild(overlay);
  // IMPORTANTE: hay que buscar los botones DENTRO de este overlay concreto (overlay.querySelector),
  // nunca con document.getElementById. Aunque "Avanzar" ahora procesa un solo mes por click, dos
  // descubrimientos podrían llegar a superponerse por otras vías (p. ej. una misión que dispare un
  // evento adicional), así que la protección contra overlays apilados se mantiene: si alguna vez
  // vuelve a pasar, cada overlay debe seguir manejando sus propios botones, no los de otro.
  overlay.querySelector('#seal-reveal-btn').onclick = ()=>{
    overlay.innerHTML = `
      <div class="seal-title">Vía Descubierta</div>
      <div class="seal-ring" style="animation:none; box-shadow:0 0 60px rgba(173,138,69,0.4), inset 0 0 26px rgba(173,138,69,0.2);"><span class="seal-q" style="font-size:20px;">${p.name}</span></div>
      <div class="seal-pathway-name">${p.name}</div>
      <div class="seal-body">${p.theme}. Todavía no podés tomar esta vía — el conocimiento apenas comienza a asentarse.</div>
      <button class="btn btn-primary" id="seal-close-btn">Continuar</button>
    `;
    overlay.querySelector('#seal-close-btn').onclick = ()=>{ overlay.remove(); renderAll(); };
  };
  renderAll();
}

/* ---------------------------------------------------------------------
   CREACIÓN DE PERSONAJE
--------------------------------------------------------------------- */
const CITIES = ['Backlund','Tingen','Bayam','Ciudad menor sin nombre'];
const CLASSES = ['Baja','Media','Alta'];

/* ---------------------------------------------------------------------
   RASGOS DE PERSONALIDAD (aleatorios, con rareza)
   Ya no se eligen a mano: al llegar al Paso 3 de la creación se sortean
   3 rasgos entre todo TRAITS_DATA, con probabilidad según su 'rarity'
   (mismo criterio que un sorteo de loot por rareza: cuanto más raro,
   menos peso tiene en la tabla). Cada rasgo trae un mods{} concreto que
   se aplica de verdad en el juego — ver getTraitMods() y sus usos en
   applyEffects, mysticExposureChance, playerCombatPower y seekBetterJob.
--------------------------------------------------------------------- */
const TRAIT_RARITIES = {
  comun:      {label:'Común',       weight:100},
  pocoComun:  {label:'Poco Común',  weight:42},
  raro:       {label:'Raro',        weight:15},
  legendario: {label:'Legendario',  weight:4}
};

const TRAITS_DATA = [
  // -- Comunes: bonificaciones moderadas, la base más probable del sorteo --
  {name:'Curioso', rarity:'comun', desc:'Tu atención salta hacia lo raro antes que hacia lo seguro.',
    bonusText:'+20% probabilidad de tropezar con pistas místicas', mods:{mysticExposureMult:1.20}},
  {name:'Prudente', rarity:'comun', desc:'Pensás dos veces antes de exponerte a algo peligroso.',
    bonusText:'-15% Corrupción ganada', mods:{corruptionMult:0.85}},
  {name:'Valiente', rarity:'comun', desc:'El miedo no te paraliza cuando hay que actuar.',
    bonusText:'-15% Cordura perdida', mods:{sanityLossMult:0.85}},
  {name:'Escéptico', rarity:'comun', desc:'Necesitás pruebas antes de creer en nada.',
    bonusText:'-10% Cordura perdida, -10% probabilidad de eventos místicos', mods:{sanityLossMult:0.90, mysticExposureMult:0.90}},
  {name:'Ambicioso', rarity:'comun', desc:'Siempre estás buscando la forma de subir un escalón más.',
    bonusText:'+15% ingresos, +5% chance al buscar mejor empleo', mods:{cashMult:1.15, jobSearchBonus:0.05}},
  {name:'Solitario', rarity:'comun', desc:'Preferís tu propia compañía a la de una multitud.',
    bonusText:'+10% Cordura recuperada, -8% Reputación ganada', mods:{sanityLossMult:0.92, reputationMult:0.92}},
  {name:'Empático', rarity:'comun', desc:'Percibís con facilidad lo que sienten los demás.',
    bonusText:'+15% Reputación ganada', mods:{reputationMult:1.15}},
  {name:'Cínico', rarity:'comun', desc:'Esperás lo peor de la gente, y rara vez te decepciona.',
    bonusText:'-10% Reputación ganada, -10% Corrupción ganada', mods:{reputationMult:0.90, corruptionMult:0.90}},
  {name:'Meticuloso', rarity:'comun', desc:'Cuidás cada detalle, incluso cuando nadie más lo notaría.',
    bonusText:'+15% Digestión de pociones', mods:{digestionMult:1.15}},
  {name:'Supersticioso', rarity:'comun', desc:'Ves significado y presagios en cada coincidencia.',
    bonusText:'+15% probabilidad de eventos místicos, +8% Espiritualidad inicial', mods:{mysticExposureMult:1.15, startSpirituality:3}},

  // -- Poco Comunes: bonificaciones más notorias --
  {name:'Resiliente', rarity:'pocoComun', desc:'Tu cuerpo se repone del castigo mejor que el de la mayoría.',
    bonusText:'-25% daño de Salud recibido', mods:{healthLossMult:0.75}},
  {name:'Carismático', rarity:'pocoComun', desc:'La gente confía en vos casi sin proponértelo.',
    bonusText:'+25% Reputación ganada', mods:{reputationMult:1.25}},
  {name:'Disciplinado', rarity:'pocoComun', desc:'Tu rutina no se quiebra ni cuando el mundo se sacude.',
    bonusText:'+25% Digestión de pociones', mods:{digestionMult:1.25}},
  {name:'Sangre Fría', rarity:'pocoComun', desc:'En el peligro, tu cabeza se enfría en vez de nublarse.',
    bonusText:'+15% poder de combate, -15% Cordura perdida en combate', mods:{combatMult:1.15, sanityLossMult:0.85}},
  {name:'Emprendedor', rarity:'pocoComun', desc:'Sabés dónde está el dinero antes que los demás.',
    bonusText:'+25% ingresos', mods:{cashMult:1.25}},
  {name:'Hermético', rarity:'pocoComun', desc:'Sabés guardar un secreto — incluso los tuyos propios.',
    bonusText:'-25% Corrupción ganada', mods:{corruptionMult:0.75}},
  {name:'Intuitivo', rarity:'pocoComun', desc:'Algo en vos reconoce patrones antes de entenderlos del todo.',
    bonusText:'+10% Digestión de pociones, +10% probabilidad de eventos místicos', mods:{digestionMult:1.10, mysticExposureMult:1.10}},

  // -- Raros: bonificaciones fuertes --
  {name:'Voluntad de Hierro', rarity:'raro', desc:'Tu mente no cede terreno con facilidad, ni ante el horror.',
    bonusText:'-30% Cordura perdida', mods:{sanityLossMult:0.70}},
  {name:'Instinto Cazador', rarity:'raro', desc:'Un depredador nato — leés a tu rival antes de que se mueva.',
    bonusText:'+30% poder de combate', mods:{combatMult:1.30}},
  {name:'Sangre Fría de Acero', rarity:'raro', desc:'Ni la ruina financiera te hace perder la cabeza.',
    bonusText:'+30% ingresos, +5 Reputación inicial', mods:{cashMult:1.30, startReputation:5}},
  {name:'Alma Anclada', rarity:'raro', desc:'Algo en vos se resiste, con terquedad, a corromperse del todo.',
    bonusText:'-35% Corrupción ganada', mods:{corruptionMult:0.65}},

  // -- Legendario: raro de verdad, bonificación muy alta --
  {name:'Favorecido por el Destino', rarity:'legendario', desc:'Coincidencias imposibles se acomodan a tu favor con una frecuencia antinatural. Nadie más a tu alrededor lo nota... todavía.',
    bonusText:'+20% ingresos, -20% Corrupción ganada, -20% Cordura perdida', mods:{cashMult:1.20, corruptionMult:0.80, sanityLossMult:0.80}}
];

function traitByName(name){ return TRAITS_DATA.find(t=>t.name===name) || null; }

// Sorteo ponderado por rareza sin repetición. weight más alto = más probable.
function weightedSampleNoRepeat(items, weightFn, n){
  const pool = items.slice();
  const picked = [];
  for(let i=0;i<n && pool.length>0;i++){
    const total = pool.reduce((a,it)=>a+weightFn(it),0);
    let r = Math.random()*total;
    let idx = 0;
    for(; idx<pool.length; idx++){
      r -= weightFn(pool[idx]);
      if(r<=0) break;
    }
    idx = Math.min(idx, pool.length-1);
    picked.push(pool[idx]);
    pool.splice(idx,1);
  }
  return picked;
}
function rollRandomTraits(n){
  const chosen = weightedSampleNoRepeat(TRAITS_DATA, t=>TRAIT_RARITIES[t.rarity].weight, n);
  return chosen.map(t=>t.name);
}

// Suma los mods{} de los rasgos elegidos en un solo bag de multiplicadores/bonos
// planos. Se recalcula on-the-fly a partir de STATE.character.rasgos en vez de
// guardarse aparte, así que un save viejo (con rasgos elegidos a mano bajo el
// sistema anterior) recibe sus bonificaciones automáticamente sin migración.
function computeTraitMods(rasgosNames){
  const m = {
    cashMult:1, digestionMult:1, corruptionMult:1, sanityLossMult:1, healthLossMult:1,
    reputationMult:1, mysticExposureMult:1, combatMult:1, jobSearchBonus:0,
    startCash:0, startSalud:0, startSanity:0, startSpirituality:0, startReputation:0
  };
  (rasgosNames||[]).forEach(name=>{
    const t = traitByName(name);
    if(!t) return;
    const mm = t.mods || {};
    for(const k in mm){
      if(k.startsWith('start') || k==='jobSearchBonus') m[k] += mm[k];
      else m[k] *= mm[k];
    }
  });
  return m;
}
function getTraitMods(){ return computeTraitMods(STATE && STATE.character ? STATE.character.rasgos : []); }
// Rasgos con color según rareza, para mostrar en el resumen de creación y en la
// ficha del personaje sin repetir el mismo armado de HTML en cada lugar.
const TRAIT_RARITY_COLOR = {comun:'var(--ink-dim)', pocoComun:'#8fb591', raro:'#a999d6', legendario:'var(--gold-bright)'};
function traitsLabelHtml(names){
  if(!names || !names.length) return '—';
  return names.map(name=>{
    const t = traitByName(name);
    const color = t ? TRAIT_RARITY_COLOR[t.rarity] : 'var(--ink-dim)';
    return `<span style="color:${color};" title="${t?t.bonusText:''}">${name}</span>`;
  }).join(', ');
}

let creationStep = 0;
// La partida siempre arranca en el nacimiento (edad:0) — ver startNewGame.
// educacion/profesion ya no se eligen acá: educación empieza en 'Sin
// escolarizar' y avanza sola con la edad (ver maybeAdvanceEducation);
// profesión empieza en 'Desempleado' (un bebé no tiene trabajo) y sólo se
// puede buscar un empleo real desde la adolescencia (ver Actividades›Trabajo).
// ciudad/clase quedan vacíos a propósito: ya no se eligen a mano, se sortean
// al entrar al Paso 2 (ver renderIntro, creationStep===1) igual que los rasgos.
function freshCreationData(){
  return { nombre:'', apellido:'', edad:0, genero:'', ciudad:'', clase:'', profesion:'Desempleado', educacion:'Sin escolarizar', rasgos:[], traitRerollsLeft:2 };
}
let creationData = freshCreationData();

// Si el jugador deja el nombre vacío, se sortea uno acorde al género elegido
// (o de cualquiera de los dos si no se especifica género) — reutiliza las
// mismas pools de nombres que ya usa la familia generada al azar (ver
// FAMILY_MALE_NAMES/FAMILY_FEMALE_NAMES más abajo, en startNewGame).
function randomFirstNameForGender(genero){
  if(genero==='Hombre') return pick(FAMILY_MALE_NAMES);
  if(genero==='Mujer') return pick(FAMILY_FEMALE_NAMES);
  return pick(chance(0.5) ? FAMILY_MALE_NAMES : FAMILY_FEMALE_NAMES);
}

// Pool de apellidos para cuando el jugador no escribe ninguno — mismo criterio
// que randomFirstNameForGender: nunca se fuerza al jugador a completar el
// campo, si lo deja vacío el destino elige por él. Evita a propósito los
// apellidos ya usados por NPCs con nombre propio (Voss, Cain, Yulen) para no
// generar una coincidencia confusa con esos personajes.
const RANDOM_SURNAMES = ['Moretti','Marrow','Hale','Whitlock','Pryce','Ashford','Doyle','Sutton','Blackwood','Reinhardt','Kotzebue','Selborne','Ashcombe','Faulkner','Grenwood','Harlow','Thorne','Castellan','Merrow','Vance'];
function randomSurname(){ return pick(RANDOM_SURNAMES); }

function renderIntro(){
  const el = document.getElementById('intro-content');
  if(creationStep === 0){
    el.innerHTML = `
      <div class="step-label">Paso 1 · Identidad</div>
      <div class="field-row"><label>Nombre</label><input id="f-nombre" value="${creationData.nombre}" placeholder="Ej: Klein — dejalo vacío para uno al azar"></div>
      <div class="field-row"><label>Apellido</label><input id="f-apellido" value="${creationData.apellido}" placeholder="Ej: Moretti — dejalo vacío para uno al azar"></div>
      <div class="field-row"><label>Género (opcional)</label>
        <select id="f-genero">
          <option value="" ${creationData.genero===''?'selected':''}>Prefiero no decir</option>
          <option value="Hombre" ${creationData.genero==='Hombre'?'selected':''}>Hombre</option>
          <option value="Mujer" ${creationData.genero==='Mujer'?'selected':''}>Mujer</option>
        </select>
      </div>
      <p class="small-note" style="margin-top:4px;">Tu vida empieza en el momento de nacer — no elegís una edad inicial. Vas a crecer en tiempo real, temporada a temporada.</p>
      <div class="intro-nav"><span></span><button class="btn btn-primary" id="next1">Siguiente →</button></div>
    `;
    document.getElementById('next1').onclick = ()=>{
      const nombreInput = document.getElementById('f-nombre').value.trim();
      const apellidoInput = document.getElementById('f-apellido').value.trim();
      creationData.genero = document.getElementById('f-genero').value;
      creationData.nombre = nombreInput || randomFirstNameForGender(creationData.genero);
      creationData.apellido = apellidoInput || randomSurname();
      creationStep = 1; renderIntro();
    };
  } else if(creationStep === 1){
    // Ciudad y clase social ya no se eligen: se sortean al llegar acá (una sola
    // vez por intento de creación — volver y avanzar de nuevo no vuelve a
    // tirar), mismo criterio que randomFirstNameForGender/randomSurname: nadie
    // elige dónde ni en qué familia nace.
    if(!creationData.ciudad) creationData.ciudad = pick(CITIES);
    if(!creationData.clase) creationData.clase = pick(CLASSES);
    el.innerHTML = `
      <div class="step-label">Paso 2 · Origen</div>
      <div class="intro-summary-line"><span>Ciudad natal</span><span>${creationData.ciudad}</span></div>
      <div class="intro-summary-line"><span>Clase social de tu familia</span><span>${creationData.clase}</span></div>
      <p class="small-note" style="margin-top:10px;">No elegís dónde ni en qué familia nacés — eso también lo decide el azar, como en la vida real. Educación y profesión tampoco se eligen: nacés sin ninguna de las dos, y las vas a ir consiguiendo vos mismo a medida que crezcas.</p>
      <div class="intro-nav">
        <button class="btn" id="back1">← Atrás</button>
        <button class="btn btn-primary" id="next2">Siguiente →</button>
      </div>
    `;
    document.getElementById('back1').onclick = ()=>{ creationStep=0; renderIntro(); };
    document.getElementById('next2').onclick = ()=>{ creationStep = 2; renderIntro(); };
  } else if(creationStep === 2){
    // Los rasgos ya no se eligen a mano: se sortean por rareza (ver TRAITS_DATA y
    // rollRandomTraits). Si es la primera vez que se llega a este paso, se tira la
    // primera mano automáticamente; volver desde el paso 3 conserva lo ya sorteado.
    if(creationData.rasgos.length === 0){
      creationData.rasgos = rollRandomTraits(3);
    }
    const cards = creationData.rasgos.map(name=>{
      const t = traitByName(name);
      const rarityKey = t.rarity.replace(/[^a-zA-Z]/g,'');
      return `<div class="trait-card rarity-${rarityKey}">
        <div class="trait-card-top">
          <span class="trait-card-name">${t.name}</span>
          <span class="trait-card-rarity">${TRAIT_RARITIES[t.rarity].label}</span>
        </div>
        <div class="trait-card-desc">${t.desc}</div>
        <div class="trait-card-bonus">${t.bonusText}</div>
      </div>`;
    }).join('');
    const rerollsLeft = creationData.traitRerollsLeft;
    el.innerHTML = `
      <div class="step-label">Paso 3 · Personalidad</div>
      <p class="small-note" style="margin-bottom:8px;">El destino te asignó estos 3 rasgos al nacer. Cada uno trae una bonificación real y distinta — cuanto más raro, más fuerte suele ser su efecto. Van a asomar de a poco a medida que crezcas, no de recién nacido.</p>
      <div class="trait-roll-grid" id="trait-grid">${cards}</div>
      <div class="trait-reroll-row">
        <span class="small-note" style="margin-top:0;">${rerollsLeft>0 ? `Te quedan ${rerollsLeft} re-tirada${rerollsLeft===1?'':'s'}.` : 'Ya no quedan re-tiradas disponibles.'}</span>
        <button class="btn" id="rerollTraits" ${rerollsLeft<=0?'disabled':''}>🎲 Volver a tirar</button>
      </div>
      <div class="intro-nav">
        <button class="btn" id="back2">← Atrás</button>
        <button class="btn btn-primary" id="next3">Siguiente →</button>
      </div>
    `;
    document.getElementById('rerollTraits').onclick = ()=>{
      if(creationData.traitRerollsLeft <= 0) return;
      creationData.traitRerollsLeft--;
      creationData.rasgos = rollRandomTraits(3);
      renderIntro();
    };
    document.getElementById('back2').onclick = ()=>{ creationStep=1; renderIntro(); };
    document.getElementById('next3').onclick = ()=>{ creationStep=3; renderIntro(); };
  } else if(creationStep === 3){
    // resumen + generación de stats derivados
    const cashByClass = {Baja:[50,180], Media:[300,900], Alta:[2200,6500]};
    const [cMin,cMax] = cashByClass[creationData.clase];
    const previewCash = Math.round((cMin+cMax)/2);
    el.innerHTML = `
      <div class="step-label">Paso 4 · Resumen</div>
      <div class="intro-summary-line"><span>Nombre completo</span><span>${creationData.nombre} ${creationData.apellido}</span></div>
      <div class="intro-summary-line"><span>Edad</span><span>Recién nacido/a</span></div>
      <div class="intro-summary-line"><span>Origen</span><span>${creationData.ciudad}</span></div>
      <div class="intro-summary-line"><span>Clase social</span><span>${creationData.clase}</span></div>
      <div class="intro-summary-line"><span>Rasgos</span><span>${traitsLabelHtml(creationData.rasgos)}</span></div>
      <div class="intro-summary-line"><span>Recursos familiares estimados</span><span>~${fmtMoney(previewCash)}</span></div>
      <p class="small-note" style="margin-top:10px;">No conocés nada sobre Pathways, Beyonders ni el mundo místico. Tu vida comienza como la de cualquier bebé recién nacido en ${creationData.ciudad}... o donde el destino te haya puesto.</p>
      <div class="intro-nav">
        <button class="btn" id="back3">← Atrás</button>
        <button class="btn btn-primary" id="startGameBtn">Comenzar Vida</button>
      </div>
    `;
    document.getElementById('back3').onclick = ()=>{ creationStep=2; renderIntro(); };
    document.getElementById('startGameBtn').onclick = startNewGame;
  }
}

function startNewGame(){
  STATE = freshState();
  const c = STATE.character;
  Object.assign(c, {
    nombre:creationData.nombre, apellido:creationData.apellido, edad:creationData.edad, genero:creationData.genero,
    ciudad:creationData.ciudad, clase:creationData.clase, profesion:creationData.profesion, educacion:creationData.educacion,
    rasgos:[...creationData.rasgos]
  });
  const cashByClass = {Baja:[50,180], Media:[300,900], Alta:[2200,6500]};
  const [cMin,cMax] = cashByClass[c.clase];
  const tm = computeTraitMods(c.rasgos);
  c.cash = Math.round(rndInt(cMin,cMax) + tm.startCash);
  c.salud = clamp(rndInt(82,98) + tm.startSalud, 1, 100);
  c.sanity = clamp(rndInt(80,95) + tm.startSanity, 1, 100);
  c.corruption = 0;
  c.spirituality = clamp(rndInt(3,14) + tm.startSpirituality, 0, 100);
  c.reputation = clamp(0 + tm.startReputation, -100, 100);

  STATE.npcs[0].name = pick(FAMILY_MALE_NAMES) + ' ' + c.apellido;
  STATE.npcs[0].trust = rndInt(40,80);
  STATE.npcs[1].name = pick(FAMILY_FEMALE_NAMES) + ' ' + c.apellido;
  STATE.npcs[1].trust = rndInt(45,85);
  // ageOffset: cuántos años le lleva ese padre/madre al personaje — no se
  // trackea una edad propia separada para cada NPC, se calcula en cualquier
  // momento como STATE.character.edad + ageOffset (ver checkNpcMortality).
  STATE.npcs[0].ageOffset = rndInt(22,38);
  STATE.npcs[1].ageOffset = rndInt(20,36);
  // Hermanos/as al azar (0 a 3), insertados justo después de madre para que la
  // familia quede agrupada arriba de la lista en Relaciones.
  STATE.npcs.splice(2, 0, ...generateSiblings(c.apellido));
  // La vecina no está atada a ninguna misión por nombre (a diferencia de Gregor
  // Voss, el Sr. Cain o Padre Yulen, que sí aparecen mencionados por nombre en
  // eventos/misiones), así que también varía en cada partida.
  const vecina = STATE.npcs.find(n=>n.id==='vecina');
  vecina.name = pick(FAMILY_FEMALE_NAMES) + ' ' + pick(NEIGHBOR_SURNAMES);

  STATE.started = true;
  logJournal('El comienzo', `${c.nombre} ${c.apellido} nace en ${c.ciudad}. Una vida como cualquier otra... por ahora.`);
  addMilestone('birth', `Nace en ${c.ciudad}`);

  document.getElementById('screen-intro').classList.add('hidden');
  document.getElementById('screen-game').classList.remove('hidden');
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   SISTEMA DE TIEMPO / VIDA MUNDANA
--------------------------------------------------------------------- */
function mysticExposureChance(){
  const p = STATE.pathway;
  const totalK = Object.values(p.knowledge).reduce((a,b)=>a+b,0);
  const base = 0.05 + (totalK/400) + (STATE.flags.mysticExposure/300);
  return clamp(base * getTraitMods().mysticExposureMult, 0.02, 0.6);
}

const MUNDANE_EVENTS = [
  {w:10, run:()=>{
    // La prosperidad de la ciudad multiplica lo que entra (ver worldIncomeMult).
    const delta = Math.round((rndInt(-40,90) + (STATE.character.incomeBonus||0)) * worldIncomeMult());
    applyEffects({cash:delta});
    return {title:'Trabajo cotidiano', text: delta>=0 ? `Un mes de trabajo estable. Ingresos: ${fmtMoney(delta)}.` : `Gastos inesperados te dejan corto este mes: ${fmtMoney(delta)}.`};
  }},
  {w:6, run:()=>{
    applyEffects({salud:-rndInt(2,8)});
    return {title:'Resfrío', text:'Pasás unos días en cama con fiebre. Nada grave, pero te deja débil.'};
  }},
  {w:5, run:()=>{
    applyEffects({sanity:rndInt(2,6)});
    return {title:'Un buen recuerdo', text:'Pasás una tarde tranquila con gente cercana. Te sentís en paz.'};
  }},
  {w:5, run:()=>{
    applyEffects({sanity:-rndInt(3,9)});
    return {title:'Mala racha', text:'Nada sale como esperabas este mes. El desgaste se nota.'};
  }},
  {w:4, run:()=>{
    applyEffects({reputation:rndInt(1,4)});
    return {title:'Buena impresión', text:'Alguien comenta bien de vos en el vecindario.'};
  }},
  {w:3, run:()=>{
    applyEffects({cash:-rndInt(60,220)});
    return {title:'Gasto imprevisto', text:'Una reparación, una factura o un imprevisto se lleva parte de tus ahorros.'};
  }},
  {w:3, run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='amigo');
    npc.trust = clamp(npc.trust+5,0,100);
    return {title:'Charla con ' + npc.name, text:'Se reencuentran y ponen al día sus vidas. La confianza crece.'};
  }},

  // --- variedad adicional sin condición de edad (siempre elegibles) ---
  {w:4, run:()=>{
    applyEffects({cash:rndInt(30,140)});
    return {title:'Changa de fin de semana', text:'Conseguís un trabajo suelto de un par de días. No es mucho, pero suma.'};
  }},
  {w:3, run:()=>{
    applyEffects({salud:-rndInt(3,10)});
    return {title:'Dolor de espalda', text:'Pasás varios días con el cuerpo resentido, sin una causa clara.'};
  }},
  {w:3, run:()=>{
    applyEffects({sanity:rndInt(3,7)});
    return {title:'Una buena caminata', text:'Salís a caminar sin rumbo fijo y volvés con la cabeza mucho más despejada.'};
  }},
  {w:2, run:()=>{
    applyEffects({sanity:-rndInt(4,10)});
    return {title:'Noche de insomnio', text:'Pasás la noche dando vueltas en la cama sin poder apagar la cabeza.'};
  }},
  {w:2, run:()=>{
    applyEffects({reputation:-rndInt(2,6)});
    return {title:'Malentendido', text:'Un comentario tuyo se malinterpreta y corre de boca en boca antes de que puedas aclararlo.'};
  }},
  {w:2, run:()=>{
    const found = rndInt(10,60);
    applyEffects({cash:found});
    return {title:'Un hallazgo afortunado', text:`Encontrás ${fmtMoney(found)} en el bolsillo de una campera que no usabas hacía tiempo.`};
  }},
  {w:2, run:()=>{
    applyEffects({cash:-rndInt(40,150)});
    return {title:'Algo se rompe', text:'Un electrodoméstico o un aparato importante deja de funcionar justo cuando menos podés afrontarlo.'};
  }},
  {w:2, run:()=>{
    applyEffects({sanity:rndInt(2,5), cash:-rndInt(10,40)});
    return {title:'Una tarde de nada', text:'Te das el gusto de no hacer absolutamente nada productivo. Vale cada peso.'};
  }},
  {w:2, req:()=>STATE.npcs.some(n=>n.id==='vecina' && n.alive), run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='vecina');
    npc.trust = clamp(npc.trust+4,0,100);
    return {title:'Café con ' + npc.name, text:'Se cruzan en el pasillo y terminan charlando un buen rato apoyados en la puerta.'};
  }},
  {w:2, req:()=>STATE.npcs.some(n=>n.id.startsWith('hermano') && n.alive), run:()=>{
    const hermanos = STATE.npcs.filter(n=>n.id.startsWith('hermano') && n.alive);
    const npc = pick(hermanos);
    npc.trust = clamp(npc.trust + rndInt(3,7), 0, 100);
    return {title:'Visita de '+npc.name, text:'Se juntan a comer algo y terminan hablando hasta tarde, como si no hubiera pasado el tiempo.'};
  }},
  {w:2, req:()=>{ const p = STATE.npcs.find(n=>n.id==='padre'); return p && p.alive; }, run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='padre');
    npc.trust = clamp(npc.trust + rndInt(2,6), 0, 100);
    return {title:'Llamada de '+npc.name, text:'Te llama sin ningún motivo puntual, sólo para saber cómo estás.'};
  }},
  {w:2, req:()=>{ const m = STATE.npcs.find(n=>n.id==='madre'); return m && m.alive; }, run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='madre');
    npc.trust = clamp(npc.trust + rndInt(2,6), 0, 100);
    return {title:'Visita de '+npc.name, text:'Aparece sin avisar con comida de sobra "por si no estabas comiendo bien".'};
  }},
  {w:2, req:()=>{ const c = STATE.npcs.find(n=>n.id==='conyuge'); return c && c.alive; }, run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='conyuge');
    npc.trust = clamp(npc.trust + rndInt(3,7), 0, 100);
    return {title:'Una noche tranquila con '+npc.name, text:'Nada especial — cenar juntos, hablar de cualquier cosa. Es de lo que más vas a extrañar después.'};
  }},
  {w:2, req:()=>STATE.npcs.some(n=>n.id.startsWith('hijo') && n.alive), run:()=>{
    const hijos = STATE.npcs.filter(n=>n.id.startsWith('hijo') && n.alive);
    const npc = pick(hijos);
    npc.trust = clamp(npc.trust + rndInt(3,7), 0, 100);
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Tiempo con '+npc.name, text:'Se quedan hablando hasta tarde de nada en particular. Son los momentos que después se recuerdan.'};
  }},
  {w:3, run:()=>{
    applyEffects({sanity:rndInt(1,4)});
    return {title:'Un pasatiempo', text:'Retomás algo que hacía tiempo tenías abandonado — leer, cocinar, armar algo con las manos. Te hace bien.'};
  }},
  {w:2, run:()=>{
    applyEffects({reputation:rndInt(1,3), sanity:rndInt(1,3)});
    return {title:'Ayudás a un desconocido', text:'Le das una mano a alguien con algo pequeño. No cambia el mundo, pero se siente bien.'};
  }},
  {w:2, run:()=>{
    applyEffects({salud:rndInt(2,6)});
    return {title:'Un chequeo de rutina', text:'Vas al médico por las dudas. Todo bien — un alivio menor pero real.'};
  }},
  {w:1, run:()=>{
    applyEffects({cash:-rndInt(80,250), sanity:-rndInt(2,6)});
    return {title:'Estafa menor', text:'Caés en una estafa pequeña — nada que arruine tu vida, pero te deja con bronca y algo más pobre.'};
  }},

  // --- adolescencia (13-17): la vida sigue centrada en la escuela y los primeros vínculos propios ---
  {w:5, req:()=>STATE.character.edad>=13 && STATE.character.edad<=17, run:()=>{
    applyEffects({sanity:rndInt(2,6)});
    return {title:'Amigos del secundario', text:'Pasás la tarde con tu grupo sin hacer nada en particular. Es de las cosas que más vas a extrañar de esta edad.'};
  }},
  {w:4, req:()=>STATE.character.edad>=13 && STATE.character.edad<=17, run:()=>{
    applyEffects({sanity:-rndInt(3,8)});
    return {title:'Un primer desamor', text:'Algo que parecía importante termina antes de lo esperado. Duele más de lo que pensabas que podía doler.'};
  }},
  {w:3, req:()=>STATE.character.edad>=13 && STATE.character.edad<=17, run:()=>{
    applyEffects({reputation:rndInt(2,5)});
    return {title:'Buen desempeño escolar', text:'Un trabajo o examen te sale mejor de lo esperado. Te lo reconocen delante de los demás.'};
  }},
  {w:3, req:()=>STATE.character.edad>=13 && STATE.character.edad<=17, run:()=>{
    applyEffects({cash:rndInt(15,50)});
    return {title:'Changa de fin de semana', text:'Ayudás con alguna changa del barrio y te ganás unos pesos propios.'};
  }},

  // --- juventud (18-29): primeros pasos de la vida adulta ---
  {w:4, req:()=>STATE.character.edad>=18 && STATE.character.edad<=29, run:()=>{
    applyEffects({sanity:-rndInt(3,7)});
    return {title:'Convivencia complicada', text:'Compartir vivienda con otras personas trae sus roces — cuentas, ruido, horarios que no coinciden.'};
  }},
  {w:4, req:()=>STATE.character.edad>=18 && STATE.character.edad<=29, run:()=>{
    applyEffects({sanity:rndInt(3,7)});
    return {title:'Una salida nocturna', text:'Salís con gente de tu edad hasta cualquier hora. Al otro día lo pagás, pero valió la pena.'};
  }},
  {w:3, req:()=>STATE.character.edad>=18 && STATE.character.edad<=29, run:()=>{
    applyEffects({sanity:-rndInt(2,6)});
    return {title:'Incertidumbre', text:'No tenés muy claro hacia dónde va tu vida. La sensación te persigue más de lo que admitís.'};
  }},
  {w:2, req:()=>STATE.character.edad>=18 && STATE.character.edad<=29, run:()=>{
    applyEffects({cash:-rndInt(30,90)});
    return {title:'Mudanza', text:'Cambiás de vivienda otra vez. El proceso siempre termina costando más de lo presupuestado.'};
  }},

  // --- adultez plena (30-49): estabilidad, carrera, balance ---
  {w:3, req:()=>STATE.character.edad>=30 && STATE.character.edad<=49, run:()=>{
    applyEffects({sanity:-rndInt(3,7)});
    return {title:'Rutina que pesa', text:'La vida se vuelve una sucesión de obligaciones parecidas entre sí. Extrañás algo que no sabrías nombrar.'};
  }},
  {w:3, req:()=>STATE.character.edad>=30 && STATE.character.edad<=49, run:()=>{
    applyEffects({reputation:rndInt(2,5)});
    return {title:'Te buscan para un consejo', text:'Alguien más joven te pide una mano con algo que a vos ya te costó aprender.'};
  }},
  {w:2, req:()=>STATE.character.edad>=30 && STATE.character.edad<=49, run:()=>{
    applyEffects({cash:-rndInt(100,300)});
    return {title:'Mantenimiento del hogar', text:'Algo en la vivienda necesita arreglo. Nunca es barato, nunca es opcional.'};
  }},
  {w:2, req:()=>STATE.character.edad>=30 && STATE.character.edad<=49, run:()=>{
    applyEffects({sanity:rndInt(3,6)});
    return {title:'Balance positivo', text:'Te tomás un momento para mirar atrás. No es la vida que imaginabas de más chico, pero no está mal.'};
  }},

  // --- madurez (50-64): salud más presente, mirada hacia adelante ---
  {w:4, req:()=>STATE.character.edad>=50 && STATE.character.edad<=64, run:()=>{
    applyEffects({salud:-rndInt(4,10)});
    return {title:'El cuerpo avisa', text:'Empezás a sentir cosas que antes ni registrabas. Nada urgente, pero es un aviso.'};
  }},
  {w:3, req:()=>STATE.character.edad>=50 && STATE.character.edad<=64, run:()=>{
    applyEffects({sanity:-rndInt(2,6)});
    return {title:'Pensás en el retiro', text:'Empezás a hacer cuentas de cuánto falta para dejar de trabajar. El número nunca termina de convencerte.'};
  }},
  {w:2, req:()=>STATE.character.edad>=50 && STATE.character.edad<=64, run:()=>{
    applyEffects({reputation:rndInt(2,6), sanity:rndInt(1,4)});
    return {title:'Años de experiencia', text:'Tu trayectoria empieza a pesar más que tu edad. Se nota en cómo te tratan.'};
  }},

  // --- vejez (65+): otro ritmo ---
  {w:4, req:()=>STATE.character.edad>=65, run:()=>{
    applyEffects({sanity:rndInt(2,6)});
    return {title:'Tiempo para lo que importa', text:'Ya no corrés detrás de tantas cosas. Hay algo tranquilo en eso.'};
  }},
  {w:3, req:()=>STATE.character.edad>=65, run:()=>{
    applyEffects({sanity:-rndInt(2,6)});
    return {title:'Recuerdos que pesan', text:'Pensás en gente que ya no está y en años que no vuelven. La nostalgia no siempre es amable.'};
  }},
  {w:2, req:()=>STATE.character.edad>=65, run:()=>{
    applyEffects({sanity:rndInt(3,7)});
    return {title:'Una tarde sin apuro', text:'Nadie espera nada de vos hoy. Aprovechás el día a tu propio ritmo.'};
  }},
];

const MYSTIC_HOOK_EVENTS = [
  {w:6, req:()=>true, run:()=>{
    applyEffects({knowledge:{fool: rndInt(2,5)}});
    return {title:'Un cliente extraño', text:'El Sr. Cain, un cliente poco habitual, te pregunta por símbolos que jamás habías visto antes de dibujarlos él mismo en una servilleta.'};
  }},
  {w:5, req:()=>true, run:()=>{
    applyEffects({knowledge:{visionary: rndInt(2,5)}});
    return {title:'Rumores', text:'Escuchás en un café rumores sobre personas capaces de percibir cosas que nadie más nota.'};
  }},
  {w:5, req:()=>true, run:()=>{
    applyEffects({knowledge:{darkness: rndInt(2,5)}});
    return {title:'Historias nocturnas', text:'Un vecino insomne jura haber visto algo imposible caminando entre las sombras de la calle.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{redPriest: rndInt(2,5)}});
    return {title:'Cazadores', text:'Se habla de un grupo que caza criaturas que "oficialmente" no existen.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{door: rndInt(2,5)}});
    return {title:'Una puerta que no debería estar ahí', text:'De camino a casa, jurarías haber visto una puerta apoyada contra una pared donde ayer no había nada.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{tyrant: rndInt(2,5)}});
    return {title:'Marineros con historias raras', text:'En el puerto, un grupo de marineros insiste en que sobrevivieron a una tormenta que "los reconoció" por su nombre.'};
  }},
  {w:3, req:()=>true, run:()=>{
    applyEffects({knowledge:{twilightGiant: rndInt(2,5)}});
    return {title:'Un combatiente fuera de serie', text:'En un gimnasio local, alguien derriba a cinco oponentes seguidos sin apenas despeinarse.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{hermit: rndInt(2,5)}});
    return {title:'Un coleccionista de secretos', text:'Un anticuario te muestra, a cambio de nada en especial, un objeto que "sabe cosas que no debería saber".'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{sun: rndInt(2,5)}});
    return {title:'Un cántico en la vigilia', text:'En una vigilia religiosa, alguien canta algo que hace que las velas ardan un poco más brillantes de lo que deberían.'};
  }},
  {w:3, req:()=>true, run:()=>{
    applyEffects({knowledge:{hangedMan: rndInt(2,5)}});
    return {title:'Una voz desde la sombra', text:'Un conocido jura haber escuchado, en un rincón sin luz, algo que le "ofrecía" un trato a cambio de casi nada.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{death: rndInt(2,5)}});
    return {title:'El sepulturero extraño', text:'En un cementerio, alguien parece hablar en voz baja con las tumbas — y jurarías que, por un segundo, algo le contesta.'};
  }},
  // --- cuarta tanda (moon, error, whiteTower): dos pistas ambientales propias cada una ---
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{moon: rndInt(2,5)}});
    return {title:'La herborista del mercado', text:'Una vieja del mercado vende remedios que funcionan demasiado bien. Cuando le preguntás qué llevan, se ríe y mira la luna.'};
  }},
  {w:2, req:()=>STATE.character.edad>=16, run:()=>{
    applyEffects({knowledge:{moon: rndInt(3,6)}, sanity:-2});
    return {title:'Un perro que obedece a nadie', text:'Ves a un hombre calmar con una sola mirada a una jauría de perros callejeros. Después se limpia algo rojo de la comisura de los labios.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{error: rndInt(2,5)}});
    return {title:'El robo imposible', text:'El diario cuenta que vaciaron la caja fuerte de un banco sin forzar nada. Lo raro es que los empleados no recuerdan qué había adentro.'};
  }},
  {w:2, req:()=>STATE.character.edad>=16, run:()=>{
    applyEffects({knowledge:{error: rndInt(3,6)}});
    return {title:'Un monóculo en la multitud', text:'Un hombre con monóculo te sonríe al pasar. Recién a la cuadra te das cuenta de que te falta algo, y no sabés qué.'};
  }},
  {w:4, req:()=>true, run:()=>{
    applyEffects({knowledge:{whiteTower: rndInt(2,5)}});
    return {title:'El lector voraz', text:'En la biblioteca pública, un joven da vuelta las páginas a una velocidad absurda. El bibliotecario jura que después recita cada libro de memoria.'};
  }},
  {w:2, req:()=>STATE.character.edad>=16, run:()=>{
    applyEffects({knowledge:{whiteTower: rndInt(3,6)}});
    return {title:'Un detective que no pregunta', text:'Un investigador privado resuelve en una tarde un caso que tenía a la policía en vilo hace meses. Dice que "estaba todo a la vista".'};
  }},
  {w:4, req:()=>true, run:()=>{
    const k = pick(Object.keys(PATHWAYS));
    applyEffects({knowledge:{[k]: rndInt(4,9)}, sanity:-2});
    addInventoryItem('books', 'Libro sobre misticismo (fragmentario)', 'Libro');
    return {title:'Un libro extraño', text:'En una librería de segunda mano encontrás un libro con anotaciones que no deberían tener sentido... y sin embargo lo tienen.'};
  }},
  {w:3, req:()=>true, run:()=>{
    const npc = STATE.npcs.find(n=>n.id==='extraño');
    npc.trust = clamp(npc.trust+8,0,100);
    applyEffects({knowledge:{fool: rndInt(3,7)}});
    return {title:'Sr. Cain vuelve', text:'El extraño cliente regresa. Esta vez insinúa pertenecer a "un club poco convencional".'};
  }},
  {w:2, req:()=>STATE.flags.mysticExposure>15, run:()=>{
    STATE.flags.tarotHint = (STATE.flags.tarotHint||0)+1;
    return {title:'Una carta de tarot', text:'Encontrás una carta de tarot fuera de lugar, con un símbolo que no pertenece a ningún mazo comercial.'};
  }},
  {w:2, req:()=>STATE.flags.mysticExposure>10, run:()=>{
    const tpl = pick(ARTIFACT_TEMPLATES);
    addInventoryItem('artifacts', tpl.name, 'Artefacto sellado · '+tpl.grade);
    return {title:'Un objeto extraño', text:'Encontrás ' + tpl.foundText + ' No tenés idea de qué hacer con él todavía.'};
  }},

  // --- más variedad genérica de "roce con lo místico" (sin Pathway todavía) ---
  {w:3, req:()=>true, run:()=>{
    applyEffects({knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(2,5)}});
    return {title:'Un sueño distinto', text:'Tenés un sueño que se siente más real que cualquier otro — con una lógica propia, casi deliberada.'};
  }},
  {w:2, req:()=>true, run:()=>{
    applyEffects({knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(2,5)}, sanity:-2});
    return {title:'Una emisora pirata', text:'Sintonizás por accidente una frecuencia de radio que no debería existir, transmitiendo algo que no termina de ser lenguaje.'};
  }},
  {w:2, req:()=>true, run:()=>{
    applyEffects({knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(2,5)}});
    return {title:'Un anuncio clasificado', text:'En el diario, entre los avisos comunes, hay uno escrito en un código que no deberías poder entender — y sin embargo lo entendés.'};
  }},

  // --- eventos por nivel de Sequence (sólo para quien ya es Beyonder) ---
  // Reflejan que el juego se siente distinto según cuán lejos llegaste: Low-Sequence
  // todavía lidia con lo básico, Mid-Sequence ya pesa en serio, y de Saint para arriba
  // el problema deja de ser sobrevivir para ser sostener quién sos.
  {w:5, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence>=7, run:()=>{
    applyEffects({sanity:-rndInt(2,5)});
    return {title:'Torpeza de principiante', text:'Un pequeño desliz con tu poder casi te delata frente a alguien común. Todavía te falta control.'};
  }},
  {w:4, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence>=7, run:()=>{
    applyEffects({reputation:rndInt(1,3), sanity:rndInt(1,3)});
    return {title:'Un pequeño triunfo', text:'Usás tu poder recién adquirido para resolver algo cotidiano. Se siente bien tener con qué.'};
  }},
  {w:4, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=6 && STATE.pathway.sequence>=5, run:()=>{
    applyEffects({knowledge:{[STATE.pathway.chosenPathway]: rndInt(2,5)}});
    return {title:'Una organización toma nota', text:'Alguien con recursos reales empieza a prestarte atención. Ya no sos invisible para el mundo oculto.'};
  }},
  {w:3, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=6 && STATE.pathway.sequence>=5, run:()=>{
    applyEffects({sanity:-rndInt(4,9), corruption:rndInt(1,3)});
    return {title:'El peso real del poder', text:'Empezás a entender que lo que ganaste tiene un costo que recién ahora se hace visible.'};
  }},
  {w:4, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=4, run:()=>{
    applyEffects({sanity:-rndInt(3,8)});
    return {title:'La distancia con lo humano', text:'Una conversación cotidiana se siente cada vez más lejana. Cuesta más de lo que admitís fingir que todavía encajás del todo.'};
  }},
  {w:3, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=4, run:()=>{
    applyEffects({corruption:rndInt(2,6), knowledge:{[STATE.pathway.chosenPathway]: rndInt(2,4)}});
    return {title:'Una tentación de poder', text:'Se te presenta una forma más rápida de crecer. El costo es real, y lo sabés perfectamente antes de decidir.'};
  }},
  {w:3, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=3, run:()=>{
    applyEffects({reputation:rndInt(2,6)});
    return {title:'Alguien busca tu guía', text:'Un Beyonder más joven que vos busca consejo. La responsabilidad de guiar a otros es distinta a la de cuidarte solo.'};
  }},
  {w:2, req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=1, run:()=>{
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Una quietud extraña', text:'El mundo a tu alrededor se siente, cada vez más, como algo que observás desde una distancia enorme. Ya casi no te asusta.'};
  }},

  // --- evento genérico por Pathway, usa PATHWAYS[key].theme para escalar a cualquiera
  //     de las vías de PATHWAYS sin necesitar un evento hardcodeado por cada una ---
  {w:4, req:()=>!!STATE.pathway.chosenPathway, run:()=>{
    const pw = PATHWAYS[STATE.pathway.chosenPathway];
    applyEffects({knowledge:{[STATE.pathway.chosenPathway]: rndInt(2,5)}});
    return {title:'Algo relacionado con tu camino', text:`Un episodio cotidiano te recuerda, sin buscarlo, la temática de tu propia vía: ${pw.theme.toLowerCase()}. Cada vez te cuesta menos reconocer esas señales.`};
  }},
];

/* ---------------------------------------------------------------------
   EVENTOS DE INFANCIA (0-12 años)
   Ahora que la partida arranca siempre en el nacimiento (ver startNewGame),
   estos años usan este pool en vez de MUNDANE_EVENTS/MYSTIC_HOOK_EVENTS: nada
   de trabajo, dinero propio, conocimiento místico ni combate — un Pathway no
   tiene sentido todavía para un bebé o un chico de 8 años. processMonth()
   elige este pool mientras STATE.character.edad < 13, y no acumula
   mysticExposure ni deja disparar combate en ese rango (mismo chequeo ahí).
   Varias entradas no llevan req (siempre elegibles) para garantizar que el
   pool nunca quede vacío para weightedPick, sea cual sea la edad exacta o si
   hay hermanos vivos o no.
--------------------------------------------------------------------- */
const CHILDHOOD_EVENTS = [
  {w:6, req:()=>STATE.character.edad<=2, run:()=>{
    applyEffects({salud:rndInt(1,3)});
    // BUG que encontró el test de simulación: pick() estaba DENTRO del predicado
    // de .find(), así que se re-tiraba un dado nuevo por cada NPC evaluado en vez
    // de una sola vez — sólo "acertaba" por pura suerte en los dos primeros
    // elementos (padre/madre) y fallaba (undefined) la enorme mayoría de las
    // veces, reventando en npc.trust. Se elige el id una sola vez, afuera.
    const targetId = pick(['padre','madre']);
    const npc = STATE.npcs.find(n=>n.id===targetId);
    npc.trust = clamp(npc.trust+4,0,100);
    return {title:'Primeros pasos', text:`Das tus primeros pasos torpes por la casa. ${npc.name} te mira con una mezcla de orgullo y terror.`};
  }},
  {w:4, req:()=>STATE.character.edad<=2, run:()=>{
    applyEffects({salud:-rndInt(1,4)});
    return {title:'Noches sin dormir', text:'Llorás gran parte de la noche sin motivo claro. Toda la casa amanece agotada.'};
  }},
  {w:6, req:()=>STATE.character.edad>=3 && STATE.character.edad<=7, run:()=>{
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Juegos de patio', text:'Pasás la tarde inventando juegos con lo primero que encontrás a mano. El tiempo vuela.'};
  }},
  {w:4, req:()=>STATE.character.edad>=3 && STATE.character.edad<=8, run:()=>{
    applyEffects({sanity:-rndInt(1,4)});
    return {title:'Miedo a la oscuridad', text:'Estás convencido de que algo espera bajo la cama apenas se apaga la luz. Nadie logra convencerte de lo contrario.'};
  }},
  {w:3, req:()=>STATE.character.edad>=4 && STATE.character.edad<=9, run:()=>{
    applyEffects({sanity:rndInt(1,3)});
    return {title:'Un amigo imaginario', text:'Tenés a alguien con quien hablar cuando no hay nadie más cerca. Nadie más puede verlo, pero para vos es tan real como cualquier otra cosa.'};
  }},
  {w:6, req:()=>STATE.character.edad>=6, run:()=>{
    applyEffects({reputation:1, sanity:rndInt(1,4)});
    return {title:'Buenas notas', text:'La maestra te felicita frente a toda la clase. Llegás a casa con ganas de contarlo.'};
  }},
  {w:4, req:()=>STATE.character.edad>=6, run:()=>{
    applyEffects({salud:-rndInt(2,6), sanity:-rndInt(1,4)});
    return {title:'Pelea en el recreo', text:'Una discusión con otro chico termina a los empujones. Volvés a casa con la ropa sucia y el orgullo herido.'};
  }},
  {w:5, req:()=>STATE.character.edad>=6, run:()=>{
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Un libro nuevo', text:'Encontrás una historia que te atrapa por completo y la releés varias veces seguidas.'};
  }},
  {w:5, run:()=>{
    applyEffects({cash:rndInt(5,25), sanity:rndInt(1,3)});
    return {title:'Cumpleaños', text:'Es tu cumpleaños. Hay una torta modesta y algún regalo que guardás como un tesoro.'};
  }},
  {w:4, req:()=>STATE.character.edad>=6 && STATE.character.edad<=12, run:()=>{
    applyEffects({salud:-rndInt(1,5)});
    return {title:'Caída de la bicicleta', text:'Te raspás bien las rodillas probando algo más allá de tus habilidades. Sobrevivís, con cicatriz nueva incluida.'};
  }},
  {w:4, req:()=>STATE.npcs.some(n=>n.id.startsWith('hermano') && n.alive), run:()=>{
    const npc = pick(STATE.npcs.filter(n=>n.id.startsWith('hermano') && n.alive));
    npc.trust = clamp(npc.trust + rndInt(3,8), 0, 100);
    return {title:'Tarde con '+npc.name, text:'Pasan la tarde juntos, entre juegos y alguna pelea sin importancia. Se llevan un poco mejor que antes.'};
  }},
  {w:5, run:()=>{
    const targetId = pick(['padre','madre']);
    const npc = STATE.npcs.find(n=>n.id===targetId);
    npc.trust = clamp(npc.trust + rndInt(2,6), 0, 100);
    return {title:'Charla con '+npc.name, text:'Se sientan un rato a hablar de nada en particular. Es de esos momentos simples que después se recuerdan.'};
  }},
  {w:5, run:()=>{
    applyEffects({salud:-rndInt(2,7)});
    return {title:'Resfrío de temporada', text:'Pasás unos días en cama, abrigado y con té caliente, hasta que se te pasa.'};
  }},
  {w:2, req:()=>STATE.character.edad>=5, run:()=>{
    const d = chance(0.5) ? rndInt(1,3) : -rndInt(1,3);
    applyEffects({sanity:d});
    return {title:'Un sueño extraño', text:'Tenés un sueño que no se parece a los demás — demasiado nítido, demasiado ordenado para ser sólo un sueño. Por la mañana ya casi no lo recordás.'};
  }},

  // --- más variedad de infancia ---
  {w:5, req:()=>STATE.character.edad<=4, run:()=>{
    applyEffects({sanity:rndInt(1,4)});
    return {title:'Primeras palabras', text:'Empezás a formar frases enteras. Toda la familia repite, encantada, cada palabra nueva que decís.'};
  }},
  {w:4, req:()=>STATE.character.edad>=2 && STATE.character.edad<=6, run:()=>{
    applyEffects({salud:-rndInt(2,6)});
    return {title:'Varicela (u otra cosa parecida)', text:'Pasás unos días picoteado e incómodo, quejándote más de la cuenta.'};
  }},
  {w:4, req:()=>STATE.character.edad>=4 && STATE.character.edad<=10, run:()=>{
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Una mascota imaginaria (o no)', text:'Insistís en que algo te sigue por la casa. Nadie más lo ve, pero para vos es completamente real.'};
  }},
  {w:4, req:()=>STATE.character.edad>=6 && STATE.character.edad<=12, run:()=>{
    applyEffects({reputation:1, sanity:rndInt(1,3)});
    return {title:'Un proyecto escolar', text:'Te esforzás de verdad en un trabajo de la escuela y el resultado te sale mejor de lo que esperabas.'};
  }},
  {w:3, req:()=>STATE.character.edad>=6 && STATE.character.edad<=12, run:()=>{
    applyEffects({sanity:-rndInt(2,6)});
    return {title:'Te dejan afuera', text:'Un grupo de chicos del barrio no te deja jugar con ellos. No entendés bien por qué, y eso lo hace peor.'};
  }},
  {w:3, req:()=>STATE.character.edad>=3 && STATE.character.edad<=9, run:()=>{
    applyEffects({sanity:rndInt(2,5)});
    return {title:'Disfraz casero', text:'Armás un disfraz con lo que encontrás por la casa y no te lo sacás en todo el día.'};
  }},
  {w:3, req:()=>STATE.character.edad>=6 && STATE.character.edad<=12, run:()=>{
    applyEffects({salud:-rndInt(1,4)});
    return {title:'Diente de leche', text:'Se te cae un diente en el peor momento posible. Lo llevás como un trofeo el resto del día.'};
  }},
  {w:2, req:()=>STATE.character.edad>=7 && STATE.character.edad<=12, run:()=>{
    applyEffects({cash:rndInt(5,15)});
    return {title:'El ratón de los dientes (o el equivalente local)', text:'Encontrás una moneda bajo la almohada. Nunca sabés bien cómo llegó ahí, pero no preguntás demasiado.'};
  }},
  {w:2, req:()=>STATE.character.edad>=8 && STATE.character.edad<=12, run:()=>{
    applyEffects({sanity:rndInt(2,4), reputation:1});
    return {title:'Primer campamento', text:'Pasás unos días fuera de casa por primera vez, con la escuela o un grupo del barrio. Volvés distinto, un poco más grande.'};
  }},
  {w:2, req:()=>STATE.character.edad>=4 && STATE.character.edad<=8, run:()=>{
    applyEffects({sanity:-rndInt(2,5)});
    return {title:'Se pierde algo importante', text:'Perdés un juguete o un objeto al que le tenías cariño. Para vos, en ese momento, es una tragedia real.'};
  }},
];

function weightedPick(list){
  const eligible = list.filter(e=> !e.req || e.req());
  const total = eligible.reduce((a,e)=>a+e.w,0);
  let r = Math.random()*total;
  for(const e of eligible){ r -= e.w; if(r<=0) return e; }
  return eligible[eligible.length-1];
}

/* ---------------------------------------------------------------------
   ARTEFACTOS SELLADOS (spec §37-38)
   Objetos de origen incierto que aparecen rara vez. No son ingredientes
   comunes: cada uno tiene Grade, efecto, drawback y riesgo propios. El
   jugador decide qué hacer con cada uno — Vender / Usar / Estudiar /
   Entregar a la Iglesia / Guardar en secreto — y cada camino tiene una
   consecuencia real, no sólo una línea de sabor.
--------------------------------------------------------------------- */
const ARTIFACT_TEMPLATES = [
  {id:'mirror', name:'Espejo antiguo', grade:'Desconocido',
   foundText:'un espejo antiguo cuyo reflejo tarda un instante de más en aparecer.',
   sellRange:[80,220], useSanity:[-14,-4], useCorruption:[2,6], useSpirituality:[2,6],
   studyKnowledge:[4,9], deathChanceOnUse:0.04},
  {id:'coin', name:'Moneda sin acuñar', grade:'Desconocido',
   foundText:'una moneda de un metal que no reconocés, sin marcas de ningún reino.',
   sellRange:[30,90], useSanity:[-6,-1], useCorruption:[0,2], useSpirituality:[1,3],
   studyKnowledge:[2,5], deathChanceOnUse:0.01},
  {id:'locket', name:'Medallón sellado', grade:'Desconocido',
   foundText:'un medallón que se niega a abrirse por medios normales.',
   sellRange:[150,400], useSanity:[-20,-8], useCorruption:[4,10], useSpirituality:[4,10],
   studyKnowledge:[6,12], deathChanceOnUse:0.07},
];
function artifactTemplate(name){ return ARTIFACT_TEMPLATES.find(t=>t.name===name); }

function artifactAction(name, action){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const tpl = artifactTemplate(name);
  const owned = STATE.inventory.artifacts.find(a=>a.name===name);
  if(!tpl || !owned || owned.qty<=0){ toast('Ya no tenés ese artefacto.', 'neg'); return; }

  if(action==='sell'){
    const val = rndInt(tpl.sellRange[0], tpl.sellRange[1]);
    applyEffects({cash:val});
    removeInventoryItem('artifacts', name);
    logJournal('Artefacto vendido', `Vendés ${tpl.name} por ${fmtMoney(val)}.`);
    toast('+'+fmtMoney(val), 'pos');
  } else if(action==='use'){
    // El drawback real: activarlo sin comprender su naturaleza puede matarte
    // directamente. Es poco probable, pero real — "un artefacto poderoso debe
    // tener consecuencias reales" (spec §38), no sólo una línea de sabor.
    if(chance(tpl.deathChanceOnUse)){
      removeInventoryItem('artifacts', name);
      const c = STATE.character;
      endGame('negative', 'Consumido por el Artefacto', `${c.nombre} ${c.apellido} activa ${tpl.name} sin comprender su verdadera naturaleza. No hay vuelta atrás.`);
      return;
    }
    const eff = {
      sanity: rndInt(tpl.useSanity[0], tpl.useSanity[1]),
      corruption: rndInt(tpl.useCorruption[0], tpl.useCorruption[1]),
      spirituality: rndInt(tpl.useSpirituality[0], tpl.useSpirituality[1])
    };
    applyEffects(eff);
    removeInventoryItem('artifacts', name);
    logJournal('Artefacto usado', `Usás ${tpl.name}. Algo en vos cambia, para bien o para mal.`);
    toast(effectsToToastList(eff));
  } else if(action==='study'){
    const k = STATE.pathway.chosenPathway || pick(Object.keys(PATHWAYS));
    const gain = rndInt(tpl.studyKnowledge[0], tpl.studyKnowledge[1]);
    applyEffects({knowledge:{[k]:gain}, sanity:-2});
    removeInventoryItem('artifacts', name);
    logJournal('Artefacto estudiado', `Estudiás ${tpl.name} y ganás conocimiento sobre la vía ${PATHWAYS[k].name}, a costa de tu estabilidad.`);
    toast([{msg:'+'+gain+' Conocimiento ('+PATHWAYS[k].name+')', type:'pos'}, {msg:'-2 Cordura', type:'neg'}]);
  } else if(action==='church'){
    if(!STATE.factions.church.known){ toast('No tenés contacto con ninguna iglesia todavía.', 'neg'); return; }
    STATE.factions.church.publicRep = clamp(STATE.factions.church.publicRep+8,0,100);
    removeInventoryItem('artifacts', name);
    logJournal('Entregado a la Iglesia', `Entregás ${tpl.name} a la ${STATE.factions.church.name}. Tu reputación con ellos crece.`);
    toast('+8 Reputación con la Iglesia', 'pos');
  } else if(action==='keep'){
    // No se consume: te lo quedás. Sin un sistema de sospecha por objeto todavía en
    // el juego, el riesgo de "guardarlo en secreto" (spec §38) se traduce en más
    // exposición al mundo místico en general, en vez de simular una mecánica que
    // el resto del juego no soporta aún.
    STATE.flags.mysticExposure += 3;
    logJournal('Guardado en secreto', `Guardás ${tpl.name} sin decírselo a nadie. El riesgo de que alguien lo note sigue ahí.`);
    toast('Guardaste '+tpl.name+' en secreto.', null);
  }
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   COMBATE (por turnos)
   Attack / Defend / Ability / Item / Escape, tal como pide el spec.
   Los enemigos NO escalan siempre con el jugador: hay tiers mundanos (ladrones,
   peleas callejeras) y místicos (criaturas, cultistas, incluso un Beyonder hostil
   poco frecuente pero real), y toparse con algo demasiado fuerte para el nivel
   actual del personaje es posible — la huida es una salida válida y a veces
   la única sensata.
--------------------------------------------------------------------- */
const ENEMY_POOL = {
  mundane: [
    {id:'mugger', name:'Asaltante callejero', tier:'mundane', w:10, hp:[14,22], dmg:[3,7], defense:1, sanityDmg:[0,0], corruptionDmg:[0,0], fleeChance:0.55, seq:null, reward:{cash:[10,35]}, desc:'Un tipo te acorrala en un callejón oscuro y te exige el dinero.'},
    {id:'drunk', name:'Borracho pendenciero', tier:'mundane', w:8, hp:[18,26], dmg:[4,9], defense:1, sanityDmg:[0,2], corruptionDmg:[0,0], fleeChance:0.6, seq:null, reward:{cash:[0,15]}, desc:'Alguien decide que sos el blanco perfecto para descargar su mala noche.'},
    {id:'thugs', name:'Banda callejera', tier:'mundane', w:4, hp:[30,42], dmg:[6,14], defense:3, sanityDmg:[1,4], corruptionDmg:[0,0], fleeChance:0.4, seq:null, reward:{cash:[0,25]}, desc:'Varios te rodean a la salida de un bar. Esto se puede poner feo.'},
  ],
  mystic: [
    {id:'nightStalker', name:'Algo en la niebla', tier:'mystic', humanoidThreat:false, w:6, hp:[26,36], dmg:[5,12], defense:2, sanityDmg:[4,10], corruptionDmg:[1,4], fleeChance:0.35, seq:null, req:()=>true, reward:{cash:[0,10], knowledge:8}, desc:'Una silueta se mueve donde no debería haber nada. No es humana.'},
    {id:'lesserSpirit', name:'Espíritu menor errante', tier:'mystic', humanoidThreat:false, w:5, hp:[32,44], dmg:[6,14], defense:2, sanityDmg:[8,16], corruptionDmg:[3,8], fleeChance:0.45, seq:null, req:()=>true, reward:{cash:0, knowledge:12}, desc:'El aire se enfría de golpe. Algo te observa desde ningún lugar en particular.'},
    // Éstos dos representan amenazas serias del mundo oculto: sólo tiene sentido que se crucen
    // en tu camino si ya estás realmente metido en ese mundo (conocimiento alto o, más aún,
    // siendo vos mismo un Beyonder). Sin este filtro, una vida completamente pasiva terminaba
    // topándose con un Beyonder hostil (letal) con una frecuencia injusta para alguien que nunca
    // buscó nada de esto — contradice que "la mayoría de la vida debe ser normal".
    {id:'cultist', name:'Fiel poseído', tier:'mystic', humanoidThreat:true, w:4, hp:[40,55], dmg:[8,16], defense:4, sanityDmg:[6,14], corruptionDmg:[2,6], fleeChance:0.3, seq:8, req:()=>!!STATE.pathway.chosenPathway || Object.values(STATE.pathway.knowledge).some(k=>k>=35), reward:{cash:[20,60], knowledge:10}, desc:'Sus ojos brillan mal. Murmura en una lengua que no deberías reconocer, y sin embargo la reconocés.'},
    {id:'rivalBeyonder', name:'Beyonder hostil', tier:'mystic', humanoidThreat:true, w:1, hp:[55,75], dmg:[10,22], defense:6, sanityDmg:[10,20], corruptionDmg:[4,10], fleeChance:0.22, seq:6, req:()=>!!STATE.pathway.chosenPathway, reward:{cash:[0,40], knowledge:15}, desc:'No es un simple fanático: esto es alguien con poder real, y no viene en son de paz.'},
  ]
};

function weightedPickEnemy(pool){
  const eligible = pool.filter(e=> !e.req || e.req());
  const total = eligible.reduce((a,e)=>a+e.w,0);
  let r = Math.random()*total;
  for(const e of eligible){ r -= e.w; if(r<=0) return e; }
  return eligible[eligible.length-1];
}

function combatEncounterChance(){
  // Probabilidad MENSUAL de un encuentro violento. Tiene que seguir siendo un evento poco
  // común en el arco de una vida entera (spec: "la mayoría de la vida debe ser normal"),
  // no algo que se repita todos los años. Con este rango, una vida de 60-70 años pasa por
  // apenas un puñado de encuentros en total, no varias decenas.
  const base = 0.006;
  const mysticBonus = Math.min(0.014, STATE.flags.mysticExposure/6000);
  // La seguridad de la ciudad en este momento pesa de verdad (ver mundo vivo,
  // worldDangerMult): vivir una mala racha de la ciudad se nota en la calle.
  return clamp((base + mysticBonus) * worldDangerMult(), 0.004, 0.05);
}

function maybeTriggerCombat(){
  if(STATE.combat || STATE.gameOver) return false;
  // Si este mismo mes ya se disparó el popup de "Vía Descubierta" (un momento importante
  // en sí mismo), no lo apilamos con un combate al mismo tiempo: la escena de combate quedaría
  // técnicamente funcionando pero tapada por el popup hasta cerrarlo. Es más prolijo posponer
  // la tirada de combate al mes siguiente que encimar dos momentos grandes en el mismo turno.
  if(document.querySelector('.seal-overlay')) return false;
  if(!chance(combatEncounterChance())) return false;
  // "hasSomeKnowledge" exige un conocimiento ya considerable (Understood+ en alguna vía) para
  // inclinar la balanza hacia encuentros místicos; conocimiento bajo, disperso y ambiental
  // (el que cualquiera junta sin buscarlo) sigue derivando casi siempre en amenazas mundanas.
  const hasSomeKnowledge = Object.values(STATE.pathway.knowledge).some(k=>k>=35) || !!STATE.pathway.chosenPathway;
  const useMystic = hasSomeKnowledge ? chance(mysticExposureChance()*0.7) : chance(0.06);
  const pool = useMystic ? ENEMY_POOL.mystic : ENEMY_POOL.mundane;
  startCombat(weightedPickEnemy(pool));
  return true;
}

function startCombat(tpl){
  const hp = rndInt(tpl.hp[0], tpl.hp[1]);
  STATE.combat = {
    enemy: {
      id:tpl.id, name:tpl.name, tier:tpl.tier, desc:tpl.desc, humanoidThreat:!!tpl.humanoidThreat,
      maxHp:hp, currentHp:hp, dmg:tpl.dmg, defense:tpl.defense,
      sanityDmg:tpl.sanityDmg, corruptionDmg:tpl.corruptionDmg,
      fleeChance:tpl.fleeChance, seq:tpl.seq, reward:tpl.reward
    },
    // Información oculta del rival (spec §57 del prompt de diseño): al empezar el combate
    // la Sequence es un total misterio. Después de tu primera acción (cualquiera — no hace
    // falta un botón de "investigar" aparte) se revela un rango estimado fijo (calculado acá,
    // no en cada render, para que no cambie solo entre turnos); después de la segunda acción
    // se revela el número exacto. seqEstimateRange queda en null para enemigos sin Sequence
    // (mundanos o "no es un Beyonder convencional"), donde no hay nada que estimar.
    seqRevealStage:0,
    seqEstimateRange: tpl.seq!=null ? [Math.max(0,tpl.seq-1), Math.min(9,tpl.seq+1)] : null,
    log:[]
  };
  logJournal('Encuentro violento', tpl.desc);
}

function processMonth(){
  if(STATE.gameOver) return null;
  const c = STATE.character;
  // Se limpia al empezar cada mes: lo levantan las consecuencias retrasadas, los
  // descubrimientos de vía y cualquier otro momento que el avance rápido de tiempo
  // NO deba pasar de largo (ver advanceTime).
  STATE._importantMoment = false;
  STATE.time.month++;
  STATE.time.totalMonths++;
  if(STATE.time.month > 12){ STATE.time.month = 1; STATE.time.year++; c.edad++; maybeAdvanceEducation(c); }

  // Consecuencias agendadas hace meses o años que vencen justo ahora (ver
  // scheduleConsequence). Se resuelven antes del evento del mes para que el
  // journal las muestre en orden cronológico correcto.
  if(processPendingConsequences()) STATE._importantMoment = true;

  // recuperación natural leve (un cuerpo sano se repone de resfríos y malas rachas; sin esto la
  // salud sólo podía bajar y cualquier vida terminaba en muerte prematura hacia los 25-30 años).
  // Se debilita gradualmente con la edad en vez de cortarse de golpe. Los umbrales están atados a
  // oldAgeMortalityParams() (mismo criterio que la tirada de mortalidad más abajo en
  // checkDeathAndCrisis): para threshold=65 (humano o Beyonder recién iniciado) esto reproduce
  // exactamente los cortes de siempre (50/65/75); para un Saint o un Angel, todo el declive físico
  // se corre décadas o siglos hacia adelante, y para un True God (threshold=Infinity) no hay
  // declive físico por edad en absoluto — sin esto, ni siquiera un Sequence 0 podía escapar del
  // desgaste que lo terminaba matando por salud igual, pese a ser efectivamente inmortal.
  const mpHealth = oldAgeMortalityParams();
  if(c.salud < 92){
    if(c.edad < mpHealth.threshold-15) applyEffects({salud:rndInt(1,3)});
    else if(c.edad < mpHealth.threshold) applyEffects({salud:rndInt(0,2)});
    else if(c.edad < mpHealth.threshold+10) applyEffects({salud:rndInt(0,1)});
  }

  // desgaste natural leve por edad — empieza suave y se acentúa con los años
  if(c.edad >= mpHealth.threshold){ applyEffects({salud:-rndInt(0,2)}); }
  if(c.edad >= mpHealth.threshold+10){ applyEffects({salud:-rndInt(1,3)}); }
  if(c.edad >= mpHealth.threshold+20){ applyEffects({salud:-rndInt(1,3)}); }

  // recuperación natural leve de Sanity. Sin esto, la ligera ventaja de peso de "Mala racha"
  // sobre "Un buen recuerdo" en MUNDANE_EVENTS convertía a Sanity en una caminata aleatoria
  // con deriva negativa: incluso una vida completamente mundana, sin tocar jamás el Pathway tab,
  // terminaba inevitablemente en un LOSS OF CONTROL por puro desgaste estadístico. La Corrupción
  // alta dificulta esta recuperación, para que sí siga siendo un riesgo real para quienes se
  // internan en el mundo sobrenatural.
  if(c.sanity < 85){
    const regenPenalty = c.corruption > 50 ? 0.4 : 1;
    // Un Anchor Strength alto suma un empujón extra a la recuperación pasiva de
    // Sanity: representa tener gente real a la que volver, no sólo fuerza de voluntad.
    const anchorBonus = anchorsUnlocked() ? Math.round(computeAnchors().anchorStrength/40) : 0;
    applyEffects({sanity: Math.max(1, Math.round(rndInt(1,3)*regenPenalty) + anchorBonus)});
  }

  let evtData;
  if(c.edad < 13){
    // Infancia (ver CHILDHOOD_EVENTS): sin exposición mística, sin Pathway,
    // sin combate — un chico de esta edad no tiene forma de meterse en nada
    // de eso todavía.
    evtData = weightedPick(CHILDHOOD_EVENTS).run();
  } else {
    // exposición mística acumulada (sólo desde la adolescencia en adelante)
    STATE.flags.mysticExposure += Object.values(STATE.pathway.knowledge).reduce((a,b)=>a+b,0) > 0 ? 1 : 0.3;
    if(chance(mysticExposureChance())){
      evtData = weightedPick(MYSTIC_HOOK_EVENTS).run();
    } else {
      evtData = weightedPick(MUNDANE_EVENTS).run();
    }
  }
  logJournal(evtData.title, evtData.text);

  if(c.edad >= 13 && maybeTriggerCombat()){
    // el combate toma el control de la pantalla; los chequeos de vejez/accidente
    // esperan al mes siguiente en vez de sumarse en el mismo turno.
    return evtData;
  }
  // Decisión con consecuencias ocultas (poco frecuente). Va después del combate
  // para no apilar dos cosas que exigen atención en el mismo mes.
  maybeTriggerDecisionEvent();
  // El mundo sigue su curso sin el jugador: los NPCs persiguen sus objetivos,
  // se mudan, sospechan, se alejan (ver npcLifeTick), y los vínculos que nadie
  // cultiva se enfrían solos una vez por año.
  npcLifeTick();
  if(STATE.time.month === 1) decayRelationships();
  // El mundo se mueve por temporada (ver worldTick) y, si te tiene muy fichado,
  // esa presión se filtra a tu entorno como sospechas.
  if(STATE.time.totalMonths % 3 === 0) worldTick();
  worldAttentionPressure();
  checkNpcMortality();
  checkDeathAndCrisis();
  return evtData;
}

// Mortalidad natural de la familia, en el mismo espíritu que la del propio
// personaje (probabilística, crece con la edad). No se trackea una edad propia
// por NPC: se calcula al vuelo como STATE.character.edad + ageOffset, así que
// nunca puede dispararse durante la infancia del personaje.
// Cubre padre/madre (offset grande, ver startNewGame), hermanos/as (±1-8 o 0,
// ver siblingAgeOffset), pareja/cónyuge (±10, ver buscarPareja) e hijos/as
// (offset negativo = edad del personaje al nacer, ver intentarTenerHijo).
// IMPORTANTE: todos ellos envejecen con la curva HUMANA (umbral fijo), no con
// la extendida del jugador (oldAgeMortalityParams) — un cónyuge común no vive
// 300 años sólo por estar casado con un Saint. Para un Beyonder de Sequence
// alta, ver morir de viejos a su pareja y a sus hijos es justamente parte del
// precio (y del peso de los Anchors).
const NPC_MORTALITY = {
  padre:   {threshold:65, coef:0.010, cap:0.4},
  madre:   {threshold:65, coef:0.010, cap:0.4},
  hermano: {threshold:65, coef:0.010, cap:0.4},
  conyuge: {threshold:65, coef:0.010, cap:0.4},
  // Un hijo recién entra en juego pasados los 70 de edad efectiva: nunca va a
  // morir "de viejo" un chico, y la curva arranca más tarde que la de los padres.
  hijo:    {threshold:70, coef:0.008, cap:0.35},
};
function npcMortalityGroup(npc){
  if(npc.id==='padre' || npc.id==='madre') return npc.id;
  if(npc.id==='pareja' || npc.id==='conyuge') return 'conyuge';
  if(npc.id.startsWith('hermano')) return 'hermano';
  if(npc.id.startsWith('hijo')) return 'hijo';
  return null;
}
// Partidas anteriores a este sistema no tienen ageOffset en hermanos, pareja ni
// hijos: se les asigna uno la primera vez que se los evalúa, con el mismo
// criterio que tendrían en una partida nueva (para los hijos se usa el año del
// nacimiento registrado en el journal si todavía está, y si no una estimación).
function ensureNpcAgeOffset(npc, group){
  if(npc.ageOffset !== undefined) return;
  if(group==='hermano') npc.ageOffset = siblingAgeOffset(npc.role||'');
  else if(group==='conyuge') npc.ageOffset = rndInt(-10,10);
  else if(group==='hijo'){
    const birth = STATE.journal.find(e=>e.title==='Un nacimiento' && e.text.indexOf(npc.name)===0);
    npc.ageOffset = birth ? -Math.max(0,(birth.year||1)-1) : -Math.max(18, STATE.character.edad-30);
  }
}
function checkNpcMortality(){
  if(STATE.gameOver) return;
  STATE.npcs.forEach(npc=>{
    if(!npc.alive) return;
    const group = npcMortalityGroup(npc);
    if(!group) return;
    ensureNpcAgeOffset(npc, group);
    if(npc.ageOffset === undefined) return;
    const mp = NPC_MORTALITY[group];
    const npcAge = STATE.character.edad + npc.ageOffset;
    if(npcAge < mp.threshold) return;
    const p = clamp((npcAge-mp.threshold) * mp.coef, 0, mp.cap);
    if(chance(p)) npcDiesOfOldAge(npc, group, npcAge);
  });
}
function npcDiesOfOldAge(npc, group, npcAge){
  const c = STATE.character;
  npc.alive = false;
  // Perder a una pareja o a un hijo pesa bastante más que perder a un padre muy
  // mayor: ése es un orden natural, el otro no.
  const golpe = group==='hijo' ? rndInt(10,18) : group==='conyuge' ? rndInt(8,15) : rndInt(4,10);
  applyEffects({sanity:-golpe});
  let extra = `${c.nombre} nunca deja de sentir ese vacío del todo.`;
  if(group==='conyuge'){
    // Queda viudo/a: puede volver a formar pareja. El NPC fallecido cambia de id
    // para no chocar con una pareja nueva (varios eventos buscan 'conyuge' por id).
    if(c.estadoCivil==='Casado/a') c.estadoCivil = 'Viudo/a';
    npc.id = 'conyuge_fallecido_' + STATE.time.totalMonths;
    remember('viudez', `Perdiste a ${npc.name}, con quien compartiste tu vida.`);
    extra = `La casa queda en un silencio que ${c.nombre} tarda años en aprender a habitar.`;
  } else if(group==='hijo'){
    remember('hijo_perdido', `Sobreviviste a ${npc.name}. Ningún padre debería.`);
    extra = 'Sobrevivir a un hijo, aunque sea de viejo, no tiene nombre.';
  }
  logJournal('Una pérdida', `${npc.name} (${npc.role.toLowerCase()}) fallece a los ${npcAge} años. ${extra}`);
  addMilestone('loss', `Muere ${npc.name} (${npc.role.toLowerCase()})`);
  toast(npc.name + ' falleció.', 'neg');
}

// Umbral/velocidad de la mortalidad natural por vejez, según qué tan lejos
// llegaste como Beyonder. En la novela, un Saint (Sequence 4) o un Angel
// (Sequence 3-1) ya no envejece como una persona común, y un True God
// (Sequence 0) es efectivamente inmortal salvo por causas violentas — acá
// eso se traduce en empujar cada vez más lejos la edad a la que empieza a
// pesar la vejez, y en enlentecer cuánto crece esa probabilidad por año.
// Sin esto, un Sequence 0 de 200 años tenía exactamente el mismo riesgo de
// morir dormido que un humano común de la misma edad — no tiene sentido.
function oldAgeMortalityParams(){
  const seq = STATE.pathway.chosenPathway ? STATE.pathway.sequence : null;
  if(seq === null || seq >= 7) return {threshold:65,  coef:0.012,  cap:0.5};  // humano u Beyonder recién iniciado
  if(seq >= 5)                 return {threshold:90,  coef:0.008,  cap:0.4};  // Sequence 6-5
  if(seq === 4)                return {threshold:150, coef:0.004,  cap:0.3};  // Saint
  if(seq >= 2)                 return {threshold:250, coef:0.002,  cap:0.25}; // Angel (Sequence 3-2)
  if(seq === 1)                return {threshold:400, coef:0.001,  cap:0.2};  // Angel alto
  return {threshold:Infinity, coef:0, cap:0}; // Sequence 0 — True God, no envejece de forma natural
}

function checkDeathAndCrisis(){
  const c = STATE.character;
  if(STATE.gameOver) return;
  if(STATE.combat) return; // el combate resuelve sus propias muertes/crisis; ver combatAction()

  if(c.sanity <= 0){
    resolveLossOfControl();
    if(STATE.gameOver) return;
  }

  // muerte por salud
  if(c.salud <= 0){
    endGame('negative', 'Muerte física', `${c.nombre} ${c.apellido} no resiste más. El cuerpo cede tras años de desgaste.`);
    return;
  }

  // mortalidad natural por vejez (probabilística, crece con la edad — el umbral
  // y la velocidad dependen de tu Sequence, ver oldAgeMortalityParams)
  const mp = oldAgeMortalityParams();
  if(c.edad >= mp.threshold){
    const p = clamp((c.edad-mp.threshold) * mp.coef, 0, mp.cap);
    if(chance(p)){
      const isBeyonder = !!STATE.pathway.chosenPathway;
      if(isBeyonder){
        const pw = PATHWAYS[STATE.pathway.chosenPathway];
        const seqName = pw.seq.find(s=>s.n===STATE.pathway.sequence).name;
        endGame('beyonder', `Superviviente de Sequence ${STATE.pathway.sequence}`, `${c.nombre} ${c.apellido} muere de vejez a los ${c.edad} años, habiendo alcanzado la Sequence ${STATE.pathway.sequence} — ${seqName} de la vía ${pw.name}. Su nombre queda, en algún registro secreto, como el de quien tocó lo imposible y sobrevivió más que la mayoría.`);
      } else {
        // Viudo/a también cuenta: la familia que formó sigue ahí aunque la pareja
        // se haya ido antes (ver npcDiesOfOldAge).
        const hasFamily = (c.estadoCivil==='Casado/a' || c.estadoCivil==='Viudo/a') && STATE.npcs.some(n=>n.id.startsWith('hijo') && n.alive);
        const bothParentsGone = ['padre','madre'].every(id=>{
          const npc = STATE.npcs.find(n=>n.id===id);
          return npc && npc.ageOffset!==undefined && !npc.alive;
        });
        const ending = hasFamily ? {t:'Vida Familiar', d:`Murió rodeado de la familia que formó — ${STATE.npcs.filter(n=>n.id.startsWith('hijo')&&n.alive).length} hijo(s) y ${c.estadoCivil==='Viudo/a' ? 'el recuerdo de un matrimonio que sólo la muerte terminó' : 'un matrimonio que duró hasta el final'}.`} :
                       c.profesion==='Puesto directivo' ? {t:'Carrera Exitosa', d:'Construyó una carrera hasta la cima, sin necesitar nada del mundo oculto para lograrlo.'} :
                       c.reputation > 20 ? {t:'Ciudadano Respetado', d:'Fue recordado con respeto por quienes lo conocieron.'} :
                       c.cash+c.bank > 5000 ? {t:'Civil Adinerado', d:'Murió con una vida económica resuelta, ajeno por completo al mundo oculto.'} :
                       (bothParentsGone && c.reputation<=20 && c.cash+c.bank<=5000) ? {t:'Vida Trágica', d:'Sobrevivió a sus padres sin encontrar nunca ni el respeto ni la estabilidad que hubieran compensado esa pérdida.'} :
                       {t:'Vida Ordinaria', d:'Vivió y murió sin descubrir jamás el verdadero rostro del mundo.'};
        endGame('human', ending.t, `${c.nombre} ${c.apellido} muere a los ${c.edad} años. ${ending.d}`);
      }
    }
  }

  // accidente / enfermedad grave aleatoria (rara)
  if(!STATE.gameOver && chance(0.003)){
    applyEffects({salud:-rndInt(20,45)});
    logJournal('Accidente', 'Un accidente inesperado te deja gravemente herido.');
  }
}

/* ---------------------------------------------------------------------
   ANCHORS (spec §20 / §24 de la v2 corregida)
   "A partir de las Sequences altas": se desbloquean recién en Sequence 4 o
   menor (el propio spec ubica ahí el arranque del End-game). Deliberadamente
   NO son un recurso nuevo para juntar/gastar: se calculan on-the-fly a partir
   de vínculos que ya existen en el juego (NPCs de confianza, matrimonio,
   hijos, reputación, el Tarot Club) — así no hace falta un sistema de
   progresión paralelo, y un save viejo que llega a Sequence 4 sin haber
   tenido "Anchors" en mente igual tiene un valor coherente calculado en el
   acto, sin necesitar ninguna migración de guardado.
   Tienen peso real, no son sólo un panel de números: Identity Stability
   reduce la chance de morir o enloquecer en un Loss of Control (ver
   resolveLossOfControl, más abajo), representando que los vínculos genuinos
   ayudan a sostener la mente en el peor momento — tal como pide el spec
   ("ayudan a mantener la humanidad y estabilidad de personajes de alto nivel").
--------------------------------------------------------------------- */
function anchorsUnlocked(){
  return !!STATE.pathway.chosenPathway && STATE.pathway.sequence <= 4;
}
function anchorNpcs(){
  return STATE.npcs.filter(n=>n.alive && n.trust>=50);
}
function computeAnchors(){
  const c = STATE.character;
  const anchors = anchorNpcs();
  const married = c.estadoCivil === 'Casado/a';
  const hijos = STATE.npcs.filter(n=>n.alive && n.id.startsWith('hijo')).length;
  const avgTrust = anchors.length ? Math.round(anchors.reduce((a,n)=>a+n.trust,0)/anchors.length) : 0;

  const anchorCount = anchors.length + (married?1:0) + hijos;
  const anchorStrength = clamp(avgTrust + (married?15:0) + hijos*8, 0, 100);
  const humanConnections = STATE.npcs.filter(n=>n.alive).length;
  const followers = Math.max(0, Math.round(clamp(c.reputation,0,100)/8 + (STATE.factions.tarotClub.secretRep||0)/15));
  // "Belief" (Creencia) es un concepto propio de la novela: la fe/reconocimiento ajeno
  // que sostiene a un Beyonder, distinto de la Reputación cruda (que puede incluir
  // notoriedad negativa). Sólo cuenta la parte positiva de la reputación, más los
  // seguidores propiamente dichos.
  const belief = clamp(Math.round(clamp(c.reputation,0,100)*0.7 + followers*3), 0, 100);
  const identityStability = clamp(Math.round(anchorStrength*0.4 + (100-c.corruption)*0.3 + c.sanity*0.3), 0, 100);
  return { anchorCount, anchorStrength, humanConnections, followers, belief, identityStability };
}

// Panel de Anchors para la pestaña Misticismo — sólo se llama cuando anchorsUnlocked()
// ya dio true. Es puramente informativo (no hay botones: los Anchors se construyen
// jugando el resto del juego —relaciones, matrimonio, reputación— no acá).
function renderAnchorsPanel(){
  const a = computeAnchors();
  return `
    <div class="sec-title">Anclas</div>
    <div class="card">
      <p class="small-note">A partir de Sequence 4, tus vínculos genuinos empiezan a sostener algo más que tu ánimo: te ayudan a seguir siendo vos mismo. Estos valores no se eligen ni se compran — reflejan tus relaciones, tu reputación y tu vida personal tal como están hoy.</p>
      <div class="stat-full-row" style="margin-top:10px;"><div class="lbl">Fuerza de Anclaje</div><div class="bar"><div style="width:${a.anchorStrength}%; background:var(--gold);"></div></div><div class="val">${a.anchorStrength}</div></div>
      <div class="stat-full-row"><div class="lbl">Estabilidad de Identidad</div><div class="bar"><div style="width:${a.identityStability}%; background:var(--sanity-col);"></div></div><div class="val">${a.identityStability}</div></div>
      <div class="intro-summary-line" style="margin-top:8px;"><span>Cantidad de Anclas</span><span>${a.anchorCount}</span></div>
      <div class="intro-summary-line"><span>Conexiones Humanas</span><span>${a.humanConnections}</span></div>
      <div class="intro-summary-line"><span>Seguidores</span><span>${a.followers}</span></div>
      <div class="intro-summary-line"><span>Creencia</span><span>${a.belief}</span></div>
      <p class="small-note" style="margin-top:8px;">Una Estabilidad de Identidad alta reduce el riesgo de morir o perder la cabeza del todo si alguna vez sufrís una Pérdida de Control.</p>
    </div>
  `;
}

function resolveLossOfControl(){
  const c = STATE.character;
  const corr = c.corruption;
  const roll = Math.random();
  // A partir de que se desbloquean los Anchors (Sequence 4 o menor), una Identity
  // Stability alta reduce el ANCHO de las dos peores franjas (muerte y locura), no
  // sólo dónde empiezan — si sólo se restara del punto de corte de ambas por igual,
  // la franja de locura simplemente se corre pero no se achica (se comprobó con un
  // test de 300 tiradas: la muerte bajaba, la locura no). Restando de cada ancho por
  // separado, Anchors realmente protege contra las dos, no sólo contra la muerte.
  const stabilityBonus = anchorsUnlocked() ? (computeAnchors().identityStability/100)*0.12 : 0;
  const deathWidth = Math.max(0.02, 0.15 + corr/300 - stabilityBonus);
  const madnessWidth = Math.max(0.03, 0.20 - stabilityBonus);
  const deathThresh = deathWidth;
  const madnessThresh = deathThresh + madnessWidth;
  logJournal('PÉRDIDA DE CONTROL', 'Tu mente cede bajo la presión. Algo se quiebra.');
  if(roll < deathThresh){
    endGame('negative', 'Muerte', `${c.nombre} ${c.apellido} pierde el control por completo. No sobrevive al colapso.`);
  } else if(roll < madnessThresh){
    endGame('negative', 'Locura', `${c.nombre} ${c.apellido} cae en una locura irreversible. Pasa el resto de sus días internado, hablando de cosas que nadie más puede ver.`);
  } else if(roll < 0.55){
    applyEffects({corruption: rndInt(10,25), sanity: 25});
    logJournal('Secuelas', 'Sobrevivís al colapso, pero algo en vos ha cambiado permanentemente. La corrupción avanza.');
    toast('Sobreviviste al colapso, pero con secuelas.', 'neg');
  } else if(roll < 0.75){
    applyEffects({sanity: 30});
    // pérdida de recuerdos: reduce conocimiento de pathways no elegidos
    for(const k in STATE.pathway.knowledge){
      if(k !== STATE.pathway.chosenPathway) STATE.pathway.knowledge[k] = Math.floor(STATE.pathway.knowledge[k]*0.4);
    }
    logJournal('Pérdida de recuerdos', 'Recuperás algo de estabilidad, pero fragmentos enteros de tu memoria reciente se han perdido.');
    toast('Perdiste parte de tus recuerdos recientes.', 'neg');
  } else {
    applyEffects({sanity: 35, corruption: 5});
    logJournal('Recuperación con secuelas', 'De algún modo, lográs recomponerte. La experiencia te deja marcado, pero con vida.');
    toast('Te recuperaste, aunque marcado.', 'pos');
  }
}

/* ---------------------------------------------------------------------
   RESOLUCIÓN DE COMBATE
--------------------------------------------------------------------- */
// roll: la parte aleatoria del golpe (4-9). Se puede pasar fija para calcular el
// poder PROMEDIO sin tirar dados — lo usa el indicador de riesgo del combate.
function playerCombatPower(roll){
  const c = STATE.character;
  const p = STATE.pathway;
  let atk = roll === undefined ? rndInt(4,9) : roll;
  if(p.chosenPathway){ atk += (10 - p.sequence) * 1.8; } // más fuerte cuanto más baja la Sequence
  atk += Math.floor(c.spirituality/15);
  if(c.salud < 30) atk *= 0.7; // herido, pegás más débil
  atk *= getTraitMods().combatMult;
  return Math.max(1, Math.round(atk));
}

// Una habilidad real y distinta por vía, no sólo un texto de sabor: cada una cambia
// el número final de daño y/o el resultado del intercambio de forma distinta.
const PATHWAY_ABILITY = {
  fool:      {name:'Actuación desconcertante', spCost:3, sanCost:0, dmgMult:1.3, incomingMultiplier:1,   negateChance:0,    note:'Golpe potenciado, jugando con la percepción del rival.'},
  visionary: {name:'Leer las intenciones',     spCost:3, sanCost:1, dmgMult:0.8, incomingMultiplier:0.4, negateChance:0,    note:'Golpe débil, pero anticipás el contragolpe y reducís mucho el daño que vas a recibir.'},
  redPriest: {name:'Instinto de caza',          spCost:4, sanCost:0, dmgMult:1.6, incomingMultiplier:1,   negateChance:0,    note:'Golpe muy fuerte, propio de tu entrenamiento de caza y combate.'},
  darkness:  {name:'Golpe desde las sombras',   spCost:3, sanCost:1, dmgMult:1.2, incomingMultiplier:1,   negateChance:0.4,  note:'Golpe potenciado, con chance de esquivar el contragolpe por completo.'},
  door:      {name:'Paso entre puertas',        spCost:3, sanCost:1, dmgMult:0.9, incomingMultiplier:0.3, negateChance:0,    note:'Golpe débil, pero te desplazás por un atajo imposible, reduciendo mucho el daño que recibís de vuelta.'},
  tyrant:    {name:'Furia de tormenta',         spCost:4, sanCost:0, dmgMult:1.7, incomingMultiplier:1,   negateChance:0,    note:'Golpe brutal, con la fuerza descontrolada de una tormenta en altamar.'},
  twilightGiant: {name:'Guardia inquebrantable', spCost:3, sanCost:0, dmgMult:1.1, incomingMultiplier:1,  negateChance:0.5,  note:'Golpe moderado, pero tu guardia tiene una alta chance de anular por completo el contragolpe.'},
  hermit:    {name:'Prying de secretos',        spCost:3, sanCost:1, dmgMult:1.0, incomingMultiplier:0.6, negateChance:0,    note:'Golpe estándar, pero leés la debilidad del rival y reducís el daño que te va a devolver.'},
  // mysticMult: la nota de Sun siempre prometió más daño contra criaturas oscuras, pero
  // la mecánica era idéntica a la de Fool (1.3/1/0). Ahora se cumple contra rivales místicos.
  sun:       {name:'Luz purificadora',           spCost:4, sanCost:0, dmgMult:1.3, incomingMultiplier:1,   negateChance:0,    mysticMult:1.5, note:'Golpe potenciado con luz sagrada, especialmente dañino si el rival es de naturaleza oscura o corrupta.'},
  hangedMan: {name:'Pacto de sombra y sangre',    spCost:4, sanCost:2, dmgMult:1.5, incomingMultiplier:1,   negateChance:0,    note:'Golpe muy fuerte, pero el sacrificio ritual te cuesta algo de Cordura además de Espiritualidad.'},
  death:     {name:'Toque helado',                spCost:3, sanCost:1, dmgMult:1.1, incomingMultiplier:0.5, negateChance:0,    note:'Golpe moderado que además entumece al rival, reduciendo bastante el daño de su contragolpe.'},
  // Cuarta tanda: cada una suma un efecto propio (campos opcionales que lee useAbility)
  // para no repetir ninguna combinación de dmgMult/incomingMultiplier/negateChance.
  // lifesteal: fracción del daño hecho que recuperás como Salud.
  moon:      {name:'Sed carmesí',                 spCost:3, sanCost:1, dmgMult:1.0, incomingMultiplier:0.9, negateChance:0,    lifesteal:0.6, note:'Golpe estándar que te devuelve en Salud buena parte del daño que causás.'},
  // spSteal: Espiritualidad que le robás al rival y recuperás en el acto.
  error:     {name:'Mano ligera',                 spCost:3, sanCost:0, dmgMult:0.7, incomingMultiplier:1,   negateChance:0.3,  spSteal:4, note:'Golpe débil, pero le robás Espiritualidad al rival y tenés chance de desbaratar su contragolpe.'},
  // revealOnUse + analyzedMult: deduce la Sequence del rival al instante y, si ya la
  // tenías confirmada antes de usarla, el golpe va directo al punto débil.
  whiteTower:{name:'Deducción',                   spCost:3, sanCost:1, dmgMult:0.9, incomingMultiplier:0.8, negateChance:0,    revealOnUse:true, analyzedMult:1.9, note:'Revela al instante la Sequence del rival. Si ya lo tenías analizado, el golpe es devastador.'}
};
function canUseAbility(){
  const p = STATE.pathway;
  if(!p.chosenPathway || !STATE.combat) return false;
  return STATE.character.spirituality >= PATHWAY_ABILITY[p.chosenPathway].spCost;
}
function abilityLabel(){
  const p = STATE.pathway;
  return p.chosenPathway ? PATHWAY_ABILITY[p.chosenPathway].name : 'Habilidad';
}
function abilityNote(){
  const p = STATE.pathway;
  if(!p.chosenPathway) return 'Necesitás una vía sobrenatural desarrollada.';
  const ab = PATHWAY_ABILITY[p.chosenPathway];
  return STATE.character.spirituality < ab.spCost ? `Necesitás ${ab.spCost}+ de Espiritualidad.` : ab.note;
}
function useAbility(){
  const p = STATE.pathway;
  const ab = PATHWAY_ABILITY[p.chosenPathway];
  const e = STATE.combat.enemy;
  applyEffects({spirituality:-ab.spCost, sanity: ab.sanCost ? -ab.sanCost : 0});
  // Usar poderes deja rastro: el mundo oculto empieza a ficharte (§17).
  raiseAttention(rndInt(1,3));
  const combat = STATE.combat;
  // White Tower: si el rival ya estaba analizado ANTES de este uso, el golpe va al
  // punto débil; si no, esta misma acción lo analiza (y queda para el próximo).
  const wasAnalyzed = (combat.seqRevealStage||0) >= 2;
  let mult = ab.dmgMult;
  if(ab.analyzedMult && wasAnalyzed) mult = ab.analyzedMult;
  if(ab.mysticMult && e.tier === 'mystic') mult *= ab.mysticMult;
  const dmg = Math.max(1, Math.round(playerCombatPower()*mult) - e.defense);
  const negateCounter = ab.negateChance>0 && chance(ab.negateChance);
  const extras = [];
  if(ab.lifesteal){
    const heal = Math.max(1, Math.round(dmg*ab.lifesteal));
    applyEffects({salud:heal});
    extras.push(`Recuperás ${heal} de Salud.`);
  }
  if(ab.spSteal){
    applyEffects({spirituality:ab.spSteal});
    extras.push(`Le robás ${ab.spSteal} de Espiritualidad.`);
  }
  if(ab.revealOnUse && !wasAnalyzed){
    combat.seqRevealStage = 2;
    extras.push('Deducís su verdadera naturaleza.');
  } else if(ab.analyzedMult && wasAnalyzed){
    extras.push('Golpeás justo donde sabías que era más débil.');
  }
  if(ab.mysticMult && e.tier === 'mystic') extras.push('La luz lo quema como a algo que no debería existir.');
  if(negateCounter) extras.push('Además, lográs prepararte para esquivar el contragolpe.');
  return {
    dmg, incomingMultiplier: ab.incomingMultiplier, negateCounter,
    log: `Usás ${ab.name}: ${dmg} de daño.${extras.length?' '+extras.join(' '):''}`
  };
}

/* ---------------------------------------------------------------------
   RIESGO VISIBLE EN COMBATE
   Una lectura de qué tan parejo es el encuentro, calculada SÓLO con lo que el
   jugador puede ver en pantalla: la vida del rival (siempre visible), su daño
   promedio y — únicamente si ya se reveló — su Sequence. Antes de revelarla,
   un Beyonder rival puede parecer más manejable de lo que es: ésa es la razón
   de ser de "Estudiar al rival".
--------------------------------------------------------------------- */
function combatThreat(){
  const combat = STATE.combat;
  if(!combat) return null;
  const e = combat.enemy;
  const c = STATE.character;
  const myAvgDmg = Math.max(1, playerCombatPower(6.5) - e.defense);
  const turnsToWin = Math.ceil(Math.max(0,e.currentHp) / myAvgDmg);
  const enemyAvg = Math.max(0.5, (e.dmg[0]+e.dmg[1])/2 - Math.floor(c.spirituality/40));
  const turnsToLose = Math.max(1, Math.floor(c.salud / enemyAvg));
  let level = turnsToLose > turnsToWin*2 ? 0 : turnsToLose >= turnsToWin ? 1 : 2;
  // La Sequence revelada pesa aparte: un rival con Sequence más baja (= más fuerte)
  // que la tuya, o cualquier Beyonder si vos no lo sos, es mala señal aunque su
  // barra de vida parezca manejable.
  const seqKnown = e.tier==='mystic' && e.seq!=null && (combat.seqRevealStage||0) >= 2;
  if(seqKnown){
    const mySeq = STATE.pathway.chosenPathway ? STATE.pathway.sequence : 10;
    if(e.seq < mySeq) level = Math.min(2, level+1);
  }
  const labels = ['Parejo', 'Peligroso', 'Letal'];
  const notes = [
    'Por lo que ves, podés con esto.',
    'Esto puede salir mal. Cada turno cuenta.',
    'Todo indica que esto te supera. Huir no es cobardía.'
  ];
  return {level, label:labels[level], note:notes[level], seqKnown};
}

function resolveCombatVictory(){
  const c = STATE.character;
  const e = STATE.combat.enemy;
  const rewardCash = e.reward.cash ? (Array.isArray(e.reward.cash) ? rndInt(e.reward.cash[0], e.reward.cash[1]) : e.reward.cash) : 0;
  const eff = {};
  if(rewardCash) eff.cash = rewardCash;
  if(e.reward.knowledge){
    const k = STATE.pathway.chosenPathway || pick(Object.keys(PATHWAYS));
    eff.knowledge = {[k]: STATE.pathway.chosenPathway ? Math.round(e.reward.knowledge/2) : e.reward.knowledge};
  }
  applyEffects(eff);
  logJournal('Combate — victoria', `Vencés a ${e.name}. ${rewardCash>0 ? 'Conseguís '+fmtMoney(rewardCash)+' entre sus pertenencias.' : 'No llevaba nada de valor.'}`);
  toast('Ganaste el combate.', 'pos');
  STATE.combat = null;
}

function combatAction(action){
  const combat = STATE.combat;
  if(!combat) return;
  const e = combat.enemy;
  let incomingMultiplier = 1;
  let negateCounter = false;
  let fledSuccessfully = false;

  if(action === 'attack'){
    const dmg = Math.max(1, playerCombatPower() - e.defense);
    e.currentHp -= dmg;
    combat.log.push(`Atacás y le hacés ${dmg} de daño.`);
  } else if(action === 'defend'){
    incomingMultiplier = 0.5;
    combat.log.push('Te ponés en guardia, listo para amortiguar el próximo golpe.');
  } else if(action === 'ability'){
    if(!canUseAbility()){ combat.log.push('No podés usar esa habilidad ahora mismo.'); renderAll(); return; }
    const res = useAbility();
    e.currentHp -= res.dmg;
    incomingMultiplier = res.incomingMultiplier;
    negateCounter = res.negateCounter;
    combat.log.push(res.log);
  } else if(action === 'item'){
    // el sistema queda preparado para objetos de combate reales (Sealed Artifacts, pociones, etc.)
    // que todavía no existen en el juego — por eso el botón está deshabilitado hasta entonces
    // en vez de simular un efecto falso.
    combat.log.push('No tenés ningún objeto que puedas usar en este combate.');
    renderAll();
    return;
  } else if(action === 'escape'){
    fledSuccessfully = Math.random() < e.fleeChance;
    combat.log.push(fledSuccessfully ? 'Lográs escapar entre la confusión.' : 'Intentás escapar, pero no lo lográs.');
  } else if(action === 'study'){
    // Estudiar al rival: gastás el turno entero en observarlo (no le hacés daño y su
    // contragolpe llega igual), a cambio de saber YA su Sequence exacta en vez de
    // esperar dos acciones a ciegas. Sólo tiene sentido contra amenazas místicas
    // con información todavía oculta — el botón no se ofrece en otro caso.
    if(e.tier !== 'mystic' || (combat.seqRevealStage||0) >= 2){ renderAll(); return; }
    combat.seqRevealStage = 2;
    combat.log.push(e.seq==null
      ? `Estudiás a ${e.name} con atención. No hay Sequence que medir: esto no es un Beyonder convencional.`
      : `Estudiás a ${e.name} con atención y lo leés entero: Sequence ${e.seq}.`);
  }

  // Cada acción del jugador hace avanzar un escalón la información conocida sobre el
  // rival: 0=??? → 1=rango estimado → 2=Sequence exacta. Tope en 2, no sigue creciendo
  // con acciones de más. "Estudiar" (y la Deducción de White Tower) saltan directo a 2.
  combat.seqRevealStage = Math.min(2, (combat.seqRevealStage||0) + 1);

  if(fledSuccessfully){
    logJournal('Huida', `Escapás de un encuentro con ${e.name} sin mirar atrás.`);
    toast('Escapaste del combate.', null);
    STATE.combat = null;
    saveGame(true); renderAll();
    return;
  }

  if(e.currentHp <= 0){
    resolveCombatVictory();
    saveGame(true); renderAll();
    return;
  }

  // turno del enemigo
  if(!negateCounter){
    const rawDmg = rndInt(e.dmg[0], e.dmg[1]);
    const dmg = Math.max(0, Math.round(rawDmg*incomingMultiplier) - Math.floor(STATE.character.spirituality/40));
    if(dmg>0){ applyEffects({salud:-dmg}); combat.log.push(`${e.name} te devuelve el golpe: -${dmg} salud.`); }
    else { combat.log.push(`${e.name} ataca, pero apenas te roza.`); }
    if(e.sanityDmg[1]>0 && chance(0.7)){
      const sd = rndInt(e.sanityDmg[0], e.sanityDmg[1]);
      if(sd>0){ applyEffects({sanity:-sd}); combat.log.push(`El encuentro te deja perturbado: -${sd} Cordura.`); }
    }
    if(e.corruptionDmg[1]>0 && chance(0.4)){
      const cd = rndInt(e.corruptionDmg[0], e.corruptionDmg[1]);
      if(cd>0){ applyEffects({corruption:cd}); combat.log.push(`Algo de esa presencia se te queda pegado: +${cd} Corrupción.`); }
    }
  } else {
    combat.log.push(`Lográs esquivar por completo el contragolpe de ${e.name}.`);
  }

  // muerte o colapso mental durante el propio combate
  const c2 = STATE.character;
  if(c2.salud <= 0){
    const enemyName = e.name;
    // "Killed by Beyonder" (final del spec) sólo aplica cuando el enemigo es realmente un
    // Beyonder u otra amenaza humana organizada del mundo oculto (cultist/rivalBeyonder).
    // Un espíritu menor o "algo en la niebla" no es un Beyonder, así que esas muertes usan
    // un título distinto en vez de atribuirte una causa de muerte que no ocurrió.
    let title, text;
    if(e.tier==='mystic' && e.humanoidThreat){
      title = 'Asesinado por un Beyonder';
      text = `${c2.nombre} ${c2.apellido} no sobrevive al encuentro con ${enemyName}. Lo que sea que haya sido, era demasiado para cualquier persona.`;
    } else if(e.tier==='mystic'){
      title = 'Consumido por lo desconocido';
      text = `${c2.nombre} ${c2.apellido} no sobrevive al encuentro con ${enemyName}. No era humano, y no tenía intención de dejarlo con vida.`;
    } else {
      title = 'Muerte violenta';
      text = `${c2.nombre} ${c2.apellido} no sobrevive al encuentro con ${enemyName}. La violencia de la calle no perdona.`;
    }
    STATE.combat = null;
    endGame('negative', title, text);
    saveGame(true); renderAll();
    return;
  }
  if(c2.sanity <= 0){
    STATE.combat = null;
    resolveLossOfControl();
    saveGame(true); renderAll();
    return;
  }

  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   EXPLORACIÓN (spec §26 — localizaciones)
   Versión liviana: en vez de armar un mundo de ubicaciones completo con
   NPCs/misiones/ingredientes propios (eso es un sistema entero aparte),
   "Explorar" deja que el jugador busque activamente lo que en el resto del
   juego pasa de forma pasiva mes a mes — reutiliza los mismos pools de
   eventos místicos y de enemigos, con mejores probabilidades de algo
   interesante cuanto más peligroso el destino. Ir más lejos cuesta plata
   y (en el caso de Forsaken Land) exige ya estar metido en el mundo oculto.
--------------------------------------------------------------------- */
const EXPLORATION_LOCATIONS = [
  {id:'city', name:null, danger:'Baja', dangerTag:'', cost:0, mysticBias:0.22, combatChance:0.04, ingredientChance:0.12, req:null, ageMin:13},
  {id:'travel', name:'Viaje a otra ciudad', danger:'Media', dangerTag:'tag-gold', cost:150, mysticBias:0.42, combatChance:0.11, ingredientChance:0.20, req:null, ageMin:14},
  {id:'forsaken', name:'Forsaken Land of the Gods', danger:'Alta', dangerTag:'tag-crimson', cost:400, mysticBias:0.8, combatChance:0.28, ingredientChance:0.32,
   req:()=> !!STATE.pathway.chosenPathway || STATE.flags.mysticExposure>=40, ageMin:16},
];

const EXPLORATION_MUNDANE_EVENTS = [
  {w:5, run:()=>{ const g=rndInt(20,70); applyEffects({cash:g}); return {title:'Hallazgo', text:`Encontrás algo de valor mientras explorás. ${fmtMoney(g)}.`}; }},
  {w:4, run:()=>{ applyEffects({salud:-rndInt(3,9)}); return {title:'Mal paso', text:'Te lastimás explorando un lugar que quizás no debías.'}; }},
  {w:4, run:()=>{ return {title:'Nada de interés', text:'Recorrés el lugar de punta a punta sin encontrar nada memorable.'}; }},
  {w:3, run:()=>{ applyEffects({reputation:rndInt(1,3)}); return {title:'Un encuentro casual', text:'Charlás con alguien interesante en el camino y dejás una buena impresión.'}; }},
];

// Qué Pathway(s) podés reconocer si aparece un ingrediente mientras explorás: no
// podés identificar algo de un mundo que ni sabés que existe. Sin Pathway elegida
// todavía, se reparte entre las vías en las que ya tenés algo de Conocimiento,
// ponderado por cuánto sabés de cada una; una vez elegida, sólo la tuya, apuntando
// siempre a la Sequence que estás persiguiendo (ver ingredientTargetSequence).
function eligibleIngredientPathways(){
  const p = STATE.pathway;
  if(p.chosenPathway){
    if(p.sequence <= 0) return []; // ya en el techo, no hay próxima Sequence que perseguir
    return [{key:p.chosenPathway, seq:p.sequence-1, weight:1}];
  }
  return Object.keys(p.knowledge)
    .filter(k=>p.knowledge[k]>0)
    .map(k=>({key:k, seq:9, weight:p.knowledge[k]}));
}

function exploreLocation(locId){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const loc = EXPLORATION_LOCATIONS.find(l=>l.id===locId);
  if(!loc) return;
  if(loc.ageMin && STATE.character.edad < loc.ageMin){ toast('Todavía sos muy chico para eso.', 'neg'); return; }
  if(loc.req && !loc.req()){ toast('Todavía no estás en condiciones de llegar ahí.', 'neg'); return; }
  if(!canUseSeasonAction('explore')){ toast('Ya usaste tus exploraciones de esta temporada.', 'neg'); return; }
  const c = STATE.character;
  if(loc.cost > c.cash){ toast('No tenés suficiente dinero para esta salida.', 'neg'); return; }
  useSeasonAction('explore');
  if(loc.cost) applyEffects({cash:-loc.cost});
  // Meterse donde no se debe también llama la atención, y más cuanto más
  // peligroso es el lugar.
  raiseAttention(loc.id==='forsaken' ? rndInt(3,7) : (loc.id==='travel' ? rndInt(1,3) : rndInt(0,2)));

  // Igual que en el mes a mes: primero se decide si aparece una amenaza real, reutilizando
  // los mismos enemigos y la misma pantalla de combate (no un sistema de peligro aparte).
  if(chance(loc.combatChance)){
    const useMystic = chance(loc.mysticBias);
    const pool = useMystic ? ENEMY_POOL.mystic : ENEMY_POOL.mundane;
    startCombat(weightedPickEnemy(pool));
    saveGame(true);
    renderAll();
    return;
  }

  // Segunda chance: encontrar un ingrediente específico. Es baja a propósito (12-32%
  // según qué tan lejos vayas) — la mayoría de las salidas vuelven con las manos vacías
  // en ese sentido, aunque puede pasar algo más (evento místico o mundano) igual.
  const elig = eligibleIngredientPathways();
  if(elig.length>0 && chance(loc.ingredientChance)){
    const totalW = elig.reduce((a,e)=>a+e.weight,0);
    let r = Math.random()*totalW;
    let chosen = elig[0];
    for(const e of elig){ r -= e.weight; if(r<=0){ chosen = e; break; } }
    const list = ingredientsNeededFor(chosen.key, chosen.seq);
    if(list.length>0){
      const ing = pick(list);
      const k = chosen.key+'::'+ing;
      STATE.pathway.ingredientsOwned[k] = (STATE.pathway.ingredientsOwned[k]||0) + 1;
      logJournal('Ingrediente encontrado', `Mientras explorás, encontrás ${ing} — un ingrediente ligado a la vía ${PATHWAYS[chosen.key].name} (Sequence ${chosen.seq}).`);
      toast('+1 '+ing, 'pos');
      checkDeathAndCrisis();
      saveGame(true);
      renderAll();
      return;
    }
  }

  const evtData = chance(loc.mysticBias) ? weightedPick(MYSTIC_HOOK_EVENTS).run() : weightedPick(EXPLORATION_MUNDANE_EVENTS).run();
  logJournal('Exploración — '+evtData.title, evtData.text);
  toast(evtData.title, null);
  checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   TRABAJO (spec §23 — vida mundana: trabajar, cambiar de profesión)
--------------------------------------------------------------------- */
// A qué puesto podés aspirar a "ascender" desde el actual. Sin entrada = ya estás
// en el techo de esta escalera simplificada (spec no pide una progresión infinita,
// sólo que trabajar y cambiar de profesión sean parte real de la vida mundana).
const JOB_UPGRADES = {
  'Desempleado':'Obrero', 'Obrero':'Oficinista', 'Estudiante':'Oficinista',
  'Oficinista':'Comerciante', 'Comerciante':'Puesto directivo'
};
// Cuánto ayuda cada nivel educativo a conseguir un puesto mejor. Usa las mismas
// etiquetas de educationOptionsForAge() (ver creación de personaje).
const EDUCATION_JOB_BONUS = {
  'Sin escolarizar':0, 'Primaria (en curso)':0,
  'Primaria completa':0, 'Secundaria (en curso)':0, 'Secundaria completa':0.10,
  'Universitaria (en curso)':0.15, 'Universitaria completa':0.25, 'Posgrado':0.35, 'Autodidacta':0.05
};

// Transiciones automáticas de educación (y, de la mano, el primer cambio de
// profesión) según la edad — reemplaza al selector manual de educación que
// existía en la creación de personaje (ahora siempre se nace a los 0 años,
// ver startNewGame). Se llama una vez por año, justo después de c.edad++.
function maybeAdvanceEducation(c){
  if(c.edad===6 && c.educacion==='Sin escolarizar'){
    c.educacion = 'Primaria (en curso)';
    if(c.profesion==='Desempleado') c.profesion = 'Estudiante';
    logJournal('Primer día de clases', `${c.nombre} empieza la escuela primaria.`);
  } else if(c.edad===13 && c.educacion==='Primaria (en curso)'){
    c.educacion = 'Secundaria (en curso)';
    logJournal('Nueva etapa', `${c.nombre} empieza la escuela secundaria.`);
  } else if(c.edad===18 && c.educacion==='Secundaria (en curso)'){
    c.educacion = 'Secundaria completa';
    logJournal('Fin de la secundaria', `${c.nombre} termina la secundaria y se asoma a la vida adulta.`);
  }
}

function workExtra(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  if(STATE.character.edad < 14){ toast('Todavía sos muy chico para trabajar.', 'neg'); return; }
  if(!canUseSeasonAction('work')){ toast('Ya usaste tus turnos extra de esta temporada.', 'neg'); return; }
  useSeasonAction('work');
  const c = STATE.character;
  const classMult = {Baja:1, Media:1.5, Alta:2.2}[c.clase] || 1;
  const eff = {
    cash: Math.round(rndInt(40,90) * classMult) + (c.incomeBonus||0)*2,
    salud: -rndInt(1,4),
    sanity: -rndInt(0,3)
  };
  applyEffects(eff);
  logJournal('Horas extra', `Trabajás horas extra como ${c.profesion || 'trabajador'}. El cansancio se nota, pero el sueldo lo compensa.`);
  toast(effectsToToastList(eff));
  saveGame(true);
  renderAll();
}

// Búsqueda de empleo NO usa el cupo por temporada como las demás acciones: si lo
// hiciera, con el cupo renovándose 4 veces por año (cada 3 meses) en vez de 1,
// subir toda la escalera laboral en un año dejaría de sentirse como el cambio de
// vida grande que se supone que es. Usa en cambio un enfriamiento real de 12 meses,
// medido contra STATE.time.totalMonths (que ya se incrementa cada mes procesado).
function monthsSinceLastJobSearch(){ return STATE.time.totalMonths - (STATE.flags.lastJobSearchMonth ?? -999); }
function canSeekJob(){ return monthsSinceLastJobSearch() >= 12; }

function seekBetterJob(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  if(STATE.character.edad < 14){ toast('Todavía sos muy chico para buscar empleo.', 'neg'); return; }
  if(!canSeekJob()){ toast('Todavía no pasó suficiente tiempo desde tu última búsqueda de empleo.', 'neg'); return; }
  STATE.flags.lastJobSearchMonth = STATE.time.totalMonths;
  const c = STATE.character;
  const nextJob = JOB_UPGRADES[c.profesion];
  if(!nextJob){
    logJournal('Búsqueda de empleo', 'Buscás algo mejor, pero no aparece ninguna oportunidad real por encima de lo que ya tenés.');
    toast('No hay una oportunidad clara para vos ahora mismo.', null);
    saveGame(true);
    renderAll();
    return;
  }
  const educBonus = EDUCATION_JOB_BONUS[c.educacion] || 0;
  const repBonus = clamp(c.reputation,0,100)/500;
  const successChance = clamp(0.35 + educBonus + repBonus + getTraitMods().jobSearchBonus, 0.1, 0.85);
  if(chance(successChance)){
    c.profesion = nextJob;
    c.incomeBonus = (c.incomeBonus||0) + rndInt(8,18);
    logJournal('Nuevo empleo', `Conseguís un puesto como ${nextJob}. Tus ingresos de base mejoran de forma permanente.`);
    toast('¡Conseguiste un mejor puesto: '+nextJob+'!', 'pos');
  } else {
    applyEffects({reputation:-1});
    logJournal('Búsqueda de empleo', 'La entrevista no sale como esperabas. Por ahora seguís donde estabas.');
    toast('No lo conseguiste esta vez.', 'neg');
  }
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   MISIONES (spec §31)
   Doce tipos: Mundane, Mystical, Investigation, Faction, Beyonder, Pathway,
   Ritual, Hunting, Escort, Exploration, Canon Event, Hidden Quest.
   Cada misión es una escena con 2-3 decisiones reales (mismo patrón que Acting
   Method), nunca un botón de recompensa instantánea. Las de "alto nivel" (Hidden
   Quest, la expedición al Fog Sea) son deliberadamente muy peligrosas, incluso
   con posibilidad de muerte — spec: "las misiones de alto nivel deben ser
   extremadamente peligrosas". Comparten un cupo propio por temporada
   (seasonActions.missions), separado del resto de las acciones repetibles.
--------------------------------------------------------------------- */
// El campo "type" de cada misión queda en inglés en los datos (id interno, no se
// traduce para no tener que tocar los 12 templates), pero en pantalla siempre se
// muestra en español a través de este mapa — ver renderPendingMission/renderMissionsTab.
const MISSION_TYPE_LABEL = {
  Mundane:'Mundana', Mystical:'Mística', Investigation:'Investigación', Faction:'Facción',
  Beyonder:'Beyonder', Pathway:'Vía', Ritual:'Ritual', Hunting:'Caza', Escort:'Escolta',
  Exploration:'Exploración', 'Canon Event':'Evento Canónico', 'Hidden Quest':'Misión Oculta'
};
const MISSION_TEMPLATES = [
  // MUNDANE
  {id:'mundane_move', type:'Mundane', title:'Mudanza de un vecino', risk:'Baja', repeatable:true,
   req:()=>true,
   scene:{
     text:'Un vecino te pide una mano para mudar sus cosas a un nuevo departamento. No es gran cosa, pero paga bien por el día.',
     choices:[
       {label:'Ayudar todo el día', small:'+Dinero, -Salud', resolve:()=>{
         const eff = {cash:rndInt(40,90), salud:-rndInt(2,5)};
         applyEffects(eff);
         logJournal('Mudanza', 'Pasás el día cargando cajas. El cuerpo lo nota, pero el bolsillo también.');
         toast(effectsToToastList(eff));
       }},
       {label:'Ayudar a medias, cobrar igual', small:'+Poco dinero, -Reputación', resolve:()=>{
         const eff = {cash:rndInt(20,40), reputation:-1};
         applyEffects(eff);
         logJournal('Mudanza', 'Hacés lo mínimo y cobrás igual. Tu vecino no queda del todo conforme.');
         toast(effectsToToastList(eff));
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Mudanza', 'Decidís que hoy no es un buen día para cargar cajas ajenas.');
         toast('Rechazaste el encargo.', null);
       }}
     ]
   }},
  // MYSTICAL
  {id:'mystical_basement', type:'Mystical', title:'El rumor del sótano', risk:'Moderada', repeatable:true,
   req:()=>STATE.flags.mysticExposure>5,
   scene:{
     text:'Corre el rumor de que en el sótano de un edificio abandonado pasan cosas raras de noche. Alguien te ofrece pagarte por ir a ver qué es.',
     choices:[
       {label:'Investigar de noche, solo', small:'Alto riesgo, mejor recompensa', resolve:()=>{
         if(chance(0.15)){
           startCombat(ENEMY_POOL.mystic.find(e=>e.id==='nightStalker'));
           logJournal('El rumor del sótano', 'Bajás de noche, sin nadie que te acompañe. No estás solo ahí abajo.');
           return;
         }
         const k = pick(Object.keys(PATHWAYS));
         const eff = {knowledge:{[k]:rndInt(5,12)}, sanity:-rndInt(3,10), cash:rndInt(20,60)};
         applyEffects(eff);
         logJournal('El rumor del sótano', 'Encontrás señales de algo que estuvo ahí, aunque no llegás a verlo de frente.');
         toast(effectsToToastList(eff));
       }},
       {label:'Ir de día, con más cuidado', small:'Menos riesgo, menos recompensa', resolve:()=>{
         const eff = {cash:rndInt(15,35), sanity:-rndInt(0,3)};
         applyEffects(eff);
         logJournal('El rumor del sótano', 'De día el lugar es sólo un sótano húmedo y vacío. Cobrás por la molestia.');
         toast(effectsToToastList(eff));
       }},
       {label:'Rechazar el encargo', small:'', resolve:()=>{
         logJournal('El rumor del sótano', 'Preferís no meterte en eso.');
         toast('Rechazaste el encargo.', null);
       }}
     ]
   }},
  // INVESTIGATION — ligada al hilo narrativo del Sr. Cain ya presente en el juego
  {id:'investigation_cain', type:'Investigation', title:'Seguir al Sr. Cain', risk:'Moderada', repeatable:true,
   req:()=>{ const npc = STATE.npcs.find(n=>n.id==='extraño'); return !!npc && npc.alive && !npc.known.faction; },
   scene:{
     text:'Ese cliente extraño, el Sr. Cain, volvió a pasar por tu barrio. Esta vez decidís seguirlo de cerca para averiguar a qué se dedica realmente.',
     choices:[
       {label:'Seguirlo de cerca, aceptando el riesgo', small:'Buena chance de descubrir su verdadera afiliación', resolve:()=>{
         const npc = STATE.npcs.find(n=>n.id==='extraño');
         if(chance(0.6)){
           npc.known.faction = true;
           npc.known.pathway = true;
           if(npc.hidden.faction==='tarotClub'){
             STATE.factions.tarotClub.discovered = true;
             STATE.factions.tarotClub.known = true;
           }
           applyEffects({sanity:-rndInt(2,8)});
           logJournal('Seguir al Sr. Cain', 'Lo seguís hasta un lugar que no esperabas. Ahora sabés a qué se dedica realmente.');
           toast('Descubriste la verdadera afiliación del Sr. Cain.', 'pos');
         } else {
           npc.suspicion = clamp(npc.suspicion+20,0,100);
           applyEffects({sanity:-rndInt(3,10)});
           logJournal('Seguir al Sr. Cain', 'Te nota. La mirada que te da antes de perderse entre la gente no te deja tranquilo.');
           toast('Te descubrió siguiéndolo.', 'neg');
         }
       }},
       {label:'Preguntar con discreción a otros vecinos', small:'Más seguro, menos información', resolve:()=>{
         const npc = STATE.npcs.find(n=>n.id==='extraño');
         applyEffects({reputation:-1});
         npc.suspicion = clamp(npc.suspicion+5,0,100);
         logJournal('Seguir al Sr. Cain', 'Nadie sabe (o nadie quiere decir) mucho sobre él. Preguntar demasiado tampoco te deja bien parado.');
         toast('No conseguiste gran cosa.', null);
       }},
       {label:'Dejarlo pasar', small:'', resolve:()=>{
         logJournal('Seguir al Sr. Cain', 'Decidís que no es asunto tuyo. Por ahora.');
         toast('Dejaste pasar la oportunidad.', null);
       }}
     ]
   }},
  // FACTION
  {id:'faction_church_favor', type:'Faction', title:'Favor para la Iglesia', risk:'Moderada', repeatable:true,
   req:()=>STATE.factions.church.known,
   scene:{
     text:'Padre Yulen te pide un favor: entregar un mensaje sellado a otra parroquia, sin que nadie más se entere de qué se trata.',
     choices:[
       {label:'Entregarlo sin abrirlo', small:'+Reputación con la Iglesia', resolve:()=>{
         STATE.factions.church.publicRep = clamp(STATE.factions.church.publicRep+10,0,100);
         applyEffects({reputation:1});
         logJournal('Favor para la Iglesia', 'Cumplís el encargo al pie de la letra. Padre Yulen te lo agradece.');
         toast('+10 Reputación con la Iglesia', 'pos');
       }},
       {label:'Espiar el contenido antes de entregarlo', small:'Riesgo de ser descubierto', resolve:()=>{
         if(chance(0.35)){
           STATE.factions.church.publicRep = clamp(STATE.factions.church.publicRep-15,0,100);
           applyEffects({reputation:-2});
           logJournal('Favor para la Iglesia', 'El sello no vuelve a quedar igual. Alguien lo nota.');
           toast('Te descubrieron. -15 Reputación con la Iglesia', 'neg');
         } else {
           const k = pick(Object.keys(PATHWAYS));
           applyEffects({knowledge:{[k]:rndInt(3,8)}});
           STATE.factions.church.publicRep = clamp(STATE.factions.church.publicRep+4,0,100);
           logJournal('Favor para la Iglesia', 'Leés el mensaje con cuidado y lo volvés a sellar sin que nadie note nada. Lo que dice ahí te dice más de lo que esperabas.');
           toast('Conseguiste información sin ser descubierto.', 'pos');
         }
       }},
       {label:'Rechazar el favor', small:'', resolve:()=>{
         logJournal('Favor para la Iglesia', 'Le decís a Padre Yulen que esta vez no podés ayudar.');
         toast('Rechazaste el favor.', null);
       }}
     ]
   }},
  // BEYONDER
  {id:'beyonder_favor', type:'Beyonder', title:'Un favor entre Beyonders', risk:'Alta', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway,
   scene:{
     text:'Otro Beyonder — alguien que reconoce lo que sos sin que se lo digas — te pide ayuda con algo que prefiere no explicar del todo.',
     choices:[
       {label:'Ayudar sin hacer preguntas', small:'Buena recompensa, riesgo real', resolve:()=>{
         if(chance(0.15)){
           applyEffects({sanity:-rndInt(20,35), corruption:rndInt(8,18)});
           logJournal('Un favor entre Beyonders', 'Lo que te pidió era mucho más de lo que dejó entender. Ya es tarde para arrepentirte.');
           toast('El favor salió muy mal.', 'neg');
         } else {
           const eff = {spirituality:rndInt(5,12), knowledge:{[STATE.pathway.chosenPathway]:rndInt(6,14)}, corruption:rndInt(1,5)};
           applyEffects(eff);
           logJournal('Un favor entre Beyonders', 'Cumplís tu parte. La otra persona no dice gracias, pero lo que te deja a cambio vale más que eso.');
           toast(effectsToToastList(eff));
         }
       }},
       {label:'Ayudar, pero exigiendo saber de qué se trata primero', small:'Menor riesgo, menor recompensa', resolve:()=>{
         const eff = {spirituality:rndInt(2,6), reputation:1};
         applyEffects(eff);
         logJournal('Un favor entre Beyonders', 'Aceptás, pero sólo después de que te expliquen lo suficiente como para sentirte cómodo.');
         toast(effectsToToastList(eff));
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Un favor entre Beyonders', 'Decidís que este no es un favor que valga la pena.');
         toast('Rechazaste el pedido.', null);
       }}
     ]
   }},
  // PATHWAY
  {id:'pathway_deepen', type:'Pathway', title:'Profundizar en tu propio camino', risk:'Baja-Moderada', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway,
   scene:{
     text:'Sentís que hay algo más para entender sobre tu propia naturaleza. Dedicarle tiempo tiene un costo, pero también una recompensa real.',
     choices:[
       {label:'Dedicarle el tiempo que haga falta', small:'+Digestión, +Conocimiento, -Cordura', resolve:()=>{
         const k = STATE.pathway.chosenPathway;
         const eff = {digestion:rndInt(3,7), knowledge:{[k]:rndInt(4,10)}, sanity:-rndInt(3,8)};
         applyEffects(eff);
         logJournal('Profundizar en tu propio camino', 'Pasás horas a solas, entendiendo un poco mejor en qué te estás convirtiendo.');
         toast(effectsToToastList(eff));
       }},
       {label:'Ir con calma, sin forzar nada', small:'Ganancia menor, sin riesgo', resolve:()=>{
         const eff = {digestion:rndInt(1,3)};
         applyEffects(eff);
         logJournal('Profundizar en tu propio camino', 'Avanzás despacio, sin apurar nada.');
         toast(effectsToToastList(eff));
       }}
     ]
   }},
  // RITUAL
  {id:'ritual_prep', type:'Ritual', title:'Preparación previa al ritual', risk:'Alta', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.digestion>=60,
   scene:{
     text:'Antes de siquiera pensar en el Advancement Ritual formal, podés dedicar tiempo a preparar el terreno: purificar el espacio, revisar cada símbolo, ensayar cada paso. No garantiza nada, pero reduce el margen de error.',
     choices:[
       {label:'Preparar el terreno a fondo', small:'Mejora tu próximo Advancement, cuesta Cordura', resolve:()=>{
         STATE.pathway.ritualPrepBonus = clamp((STATE.pathway.ritualPrepBonus||0) + 0.08, 0, 0.2);
         const eff = {sanity:-rndInt(5,12), spirituality:-rndInt(3,8)};
         applyEffects(eff);
         logJournal('Preparación previa al ritual', 'Repasás cada detalle una y otra vez. Cuando llegue el momento, vas a estar mejor preparado.');
         toast('Tu próximo intento de Advancement tiene mejores chances.', 'pos');
       }},
       {label:'Un repaso rápido, sin obsesionarte', small:'Mejora menor, casi sin costo', resolve:()=>{
         STATE.pathway.ritualPrepBonus = clamp((STATE.pathway.ritualPrepBonus||0) + 0.03, 0, 0.2);
         applyEffects({sanity:-rndInt(0,3)});
         logJournal('Preparación previa al ritual', 'Le das un repaso general, sin volverte loco con los detalles.');
         toast('Preparación leve para tu próximo Advancement.', 'pos');
       }}
     ]
   }},
  // HUNTING — combate directo, reutiliza ENEMY_POOL con una bonificación de paga
  {id:'hunting_contract', type:'Hunting', title:'Contrato de caza', risk:'Alta', repeatable:true,
   req:()=>true,
   scene:{
     text:'Alguien con dinero y motivos que prefiere no explicar te ofrece una suma considerable por encargarte de "algo" que está causando problemas. No te dan demasiados detalles de antemano — vas a tener que verlo vos mismo.',
     choices:[
       {label:'Aceptar el contrato', small:'Combate directo, buena paga si sobrevivís', resolve:()=>{
         const useMystic = chance(mysticExposureChance()*0.8);
         const pool = useMystic ? ENEMY_POOL.mystic : ENEMY_POOL.mundane;
         const tpl = weightedPickEnemy(pool);
         startCombat(tpl);
         const baseCash = Array.isArray(STATE.combat.enemy.reward.cash) ? STATE.combat.enemy.reward.cash : [0,0];
         STATE.combat.enemy.reward = {...STATE.combat.enemy.reward, cash:[baseCash[0]+40, baseCash[1]+80]};
         logJournal('Contrato de caza', 'Aceptás el trabajo. Sea lo que sea, ya es tu problema ahora.');
       }},
       {label:'Rechazar el contrato', small:'', resolve:()=>{
         logJournal('Contrato de caza', 'Decidís que esta no es una pelea que te convenga buscar.');
         toast('Rechazaste el contrato.', null);
       }}
     ]
   }},
  // ESCORT
  {id:'escort_job', type:'Escort', title:'Escoltar a un comerciante', risk:'Moderada', repeatable:true,
   req:()=>true,
   scene:{
     text:'Un comerciante nervioso te ofrece pagarte por acompañarlo en un trayecto que, según él, "probablemente" no tenga problemas.',
     choices:[
       {label:'Aceptar y acompañarlo', small:'Paga garantizada, riesgo de encontrarse algo en el camino', resolve:()=>{
         const cash = rndInt(50,120);
         applyEffects({cash});
         toast('+'+fmtMoney(cash), 'pos');
         if(chance(0.25)){
           startCombat(weightedPickEnemy(ENEMY_POOL.mundane));
           logJournal('Escoltar a un comerciante', 'A mitad de camino, justo lo que el comerciante temía, aparece.');
         } else {
           logJournal('Escoltar a un comerciante', 'El viaje termina sin sobresaltos. El comerciante paga lo prometido, aliviado.');
         }
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Escoltar a un comerciante', 'Le decís que esta vez tendrá que arreglárselas solo.');
         toast('Rechazaste el trabajo.', null);
       }}
     ]
   }},
  // EXPLORATION — a diferencia de la pestaña Exploración (repetible), esto es un
  // viaje puntual y mucho más peligroso a una de las regiones nombradas en el spec.
  {id:'exploration_fogsea', type:'Exploration', title:'Expedición al Fog Sea', risk:'Alta', repeatable:false,
   req:()=>!!STATE.pathway.chosenPathway || STATE.flags.mysticExposure>=40,
   scene:{
     text:'Se organiza una expedición hacia el Fog Sea, una de las regiones más peligrosas e inexploradas del mundo conocido. No es un viaje que se haga por curiosidad — pocos vuelven con algo que valga la pena contar, y no todos vuelven.',
     choices:[
       {label:'Sumarte a la expedición', small:'Muy arriesgado, recompensa importante', resolve:()=>{
         applyEffects({cash:-200});
         if(chance(0.2)){
           const c = STATE.character;
           endGame('negative', 'Muerte Física', `${c.nombre} ${c.apellido} se suma a una expedición al Fog Sea. No vuelve.`);
           return;
         }
         const k = STATE.pathway.chosenPathway || pick(Object.keys(PATHWAYS));
         const eff = {knowledge:{[k]:rndInt(15,30)}, sanity:-rndInt(10,20), reputation:rndInt(3,8)};
         applyEffects(eff);
         logJournal('Expedición al Fog Sea', 'Volvés de la niebla con algo que muy pocos han visto, y con vida para contarlo.');
         toast(effectsToToastList(eff));
       }},
       {label:'Quedarte afuera', small:'', resolve:()=>{
         logJournal('Expedición al Fog Sea', 'Dejás que otros se arriesguen esta vez.');
         toast('No te sumaste a la expedición.', null);
       }}
     ]
   }},
  // CANON EVENT — referencia ambiental puntual al mundo de LOTM, no repetible
  {id:'canon_conclave', type:'Canon Event', title:'El Rumor del Cónclave', risk:'Baja', repeatable:false,
   req:()=>STATE.time.totalMonths>=18,
   scene:{
     text:'Se comenta, en voz baja, que representantes de varias iglesias se reunieron en Backlund para un cónclave poco habitual. Nadie sabe bien de qué se trató, pero todos coinciden en que algo cambió después de eso.',
     choices:[
       {label:'Preguntar discretamente qué se sabe', small:'+Exposición al mundo místico, sin riesgo real', resolve:()=>{
         STATE.flags.mysticExposure += 5;
         applyEffects({reputation:1});
         logJournal('El Rumor del Cónclave', 'Juntás fragmentos de lo que se dice por ahí. Nada confirmado, pero suficiente para entender que el mundo sigue moviéndose, con o sin vos.');
         toast('Escuchaste el rumor del cónclave.', null);
       }},
       {label:'Ignorarlo — no es asunto tuyo', small:'', resolve:()=>{
         logJournal('El Rumor del Cónclave', 'Decidís no prestarle atención. Sea lo que sea, no te incumbe.');
         toast('Ignoraste el rumor.', null);
       }}
     ]
   }},
  // HIDDEN QUEST — sólo visible tras descubrir el Tarot Club; extremadamente peligrosa
  {id:'hidden_tarot_task', type:'Hidden Quest', title:'Un encargo del Tarot Club', risk:'Extrema', repeatable:false,
   req:()=>STATE.factions.tarotClub.discovered,
   scene:{
     text:'A través de canales que no podés rastrear del todo, te llega un mensaje: el Tarot Club tiene un encargo para vos. No es una invitación — es una prueba. Aceptarla podría abrirte puertas que nadie más puede abrir. Rechazarla podría ser lo más prudente que hagas en toda tu vida.',
     choices:[
       {label:'Aceptar la prueba', small:'Extremadamente peligroso — recompensa como ninguna otra', resolve:()=>{
         const c = STATE.character;
         if(chance(0.25)){
           endGame('negative', 'Traición de la Facción', `${c.nombre} ${c.apellido} acepta la prueba del Tarot Club. La prueba resulta ser exactamente eso: una prueba, y no la pasa.`);
           return;
         }
         STATE.factions.tarotClub.secretRep = clamp(STATE.factions.tarotClub.secretRep+30,0,100);
         STATE.factions.tarotClub.known = true;
         const k = STATE.pathway.chosenPathway || pick(Object.keys(PATHWAYS));
         const eff = {knowledge:{[k]:rndInt(20,35)}, corruption:rndInt(10,25), sanity:-rndInt(15,30), cash:rndInt(200,600)};
         applyEffects(eff);
         logJournal('Un encargo del Tarot Club', 'Hacés lo que te piden. No preguntás demasiado. Cuando termina, algo en vos ya no es exactamente lo mismo — pero el Tarot Club ahora sabe tu nombre.');
         toast(effectsToToastList(eff));
       }},
       {label:'Rechazar la prueba', small:'Prudente, pero cierra una puerta', resolve:()=>{
         logJournal('Un encargo del Tarot Club', 'Rechazás el encargo. No hay una segunda oportunidad para esto — al menos no de la misma forma.');
         toast('Rechazaste el encargo del Tarot Club.', null);
       }}
     ]
   }},
];

function availableMissions(){
  return MISSION_TEMPLATES.filter(m => m.req() && (m.repeatable || !STATE.missions.completedIds.includes(m.id)));
}

function acceptMission(id){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  if(STATE.character.edad < 14){ toast('Todavía sos muy chico para este tipo de encargos.', 'neg'); return; }
  if(!canUseSeasonAction('missions')){ toast('Ya usaste tus misiones de esta temporada.', 'neg'); return; }
  const tpl = MISSION_TEMPLATES.find(m=>m.id===id);
  if(!tpl || !tpl.req()) return;
  useSeasonAction('missions');
  STATE._pendingMissionChoiceData = tpl.scene.choices;
  STATE.pendingMission = {
    missionId: tpl.id,
    type: tpl.type,
    title: tpl.title,
    text: tpl.scene.text,
    choices: tpl.scene.choices.map((c,idx)=>({idx, label:c.label, small:c.small}))
  };
  renderAll();
}

function resolveMissionChoice(idx){
  const missionId = STATE.pendingMission.missionId;
  const tpl = MISSION_TEMPLATES.find(m=>m.id===missionId);
  const choice = STATE._pendingMissionChoiceData[idx];
  STATE.pendingMission = null;
  STATE._pendingMissionChoiceData = null;
  if(tpl && !tpl.repeatable){
    STATE.missions.completedIds.push(tpl.id);
  }
  choice.resolve(); // puede aplicar efectos, iniciar combate, o incluso terminar la partida
  if(!STATE.gameOver) checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   ACTING METHOD (Digestión)
--------------------------------------------------------------------- */
function currentSeqData(){
  if(!STATE.pathway.chosenPathway) return null;
  const pw = PATHWAYS[STATE.pathway.chosenPathway];
  return pw.seq.find(s=>s.n===STATE.pathway.sequence);
}

function actingScenarios(pathwayKey, seqN){
  const generic = [
    {
      title:'Practicar el papel',
      text:`Dedicás tiempo a ejercitar las técnicas asociadas a tu vía. Es tedioso, repetitivo, pero necesario.`,
      choices:[
        {label:'Actuar con disciplina y cautela', small:'Progreso moderado, bajo riesgo', eff:{digestion:rndInt(2,4), sanity:1}},
        {label:'Forzar el límite de tus capacidades', small:'Más progreso, riesgo de Cordura/Corrupción', eff:()=> chance(0.65)?{digestion:rndInt(4,7), sanity:-3}:{digestion:-1, sanity:-6, corruption:3}},
        {label:'No arriesgarte hoy', small:'Sin cambios', eff:{}}
      ]
    }
  ];
  const table = {
    fool:[
      {min:9,max:9, sc:[{
        title:'Una lectura de tarot', text:'Una mujer te pide leerle las cartas en la plaza.',
        choices:[
          {label:'Realizar una lectura seria', small:'+Digestión, +Reputación', eff:{digestion:rndInt(3,6), reputation:2}},
          {label:'Inventar una predicción', small:'+Dinero, riesgo de Reputación', eff:()=>chance(0.7)?{cash:rndInt(20,60), digestion:1}:{reputation:-3}},
          {label:'Usar tu Espiritualidad para buscar información real', small:'+Digestión alto, -Cordura, +Corrupción leve', eff:{digestion:rndInt(5,9), sanity:-4, corruption:2}},
          {label:'Rechazarla', small:'Sin cambios', eff:{}}
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un público difícil', text:'Te presentás ante un público hostil que no quiere reír.',
        choices:[
          {label:'Improvisar con humor arriesgado', small:'Alto riesgo/recompensa', eff:()=>chance(0.55)?{digestion:rndInt(5,8), reputation:3}:{sanity:-5, reputation:-2}},
          {label:'Jugar seguro', small:'Progreso bajo, estable', eff:{digestion:rndInt(2,3)}},
        ]
      }]}
    ],
    visionary:[
      {min:9,max:9, sc:[{
        title:'Observar sin ser visto', text:'Pasás la tarde observando a extraños, catalogando gestos y microexpresiones.',
        choices:[
          {label:'Análisis metódico', small:'+Digestión estable', eff:{digestion:rndInt(3,6)}},
          {label:'Forzar la percepción más allá de lo cómodo', small:'Más progreso, -Cordura', eff:{digestion:rndInt(5,8), sanity:-4}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un pensamiento ajeno', text:'Rozás, sin querer, un fragmento de la mente de un desconocido.',
        choices:[
          {label:'Retirarte de inmediato', small:'Seguro, poco progreso', eff:{digestion:rndInt(1,3)}},
          {label:'Profundizar en el contacto', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(6,9)}:{sanity:-7, corruption:2}},
        ]
      }]}
    ],
    redPriest:[
      {min:9,max:9, sc:[{
        title:'Rastrear una presa', text:'Seguís el rastro de algo que no debería estar en la ciudad.',
        choices:[
          {label:'Rastrear con cautela', small:'+Digestión moderado', eff:{digestion:rndInt(3,6)}},
          {label:'Perseguir agresivamente', small:'Más progreso, riesgo físico', eff:()=>chance(0.6)?{digestion:rndInt(6,9)}:{salud:-10, sanity:-3}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Provocación deliberada', text:'Provocás a un objetivo para que revele su naturaleza.',
        choices:[
          {label:'Provocación calculada', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Ir a fondo', small:'Alto riesgo', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{salud:-15, sanity:-5}},
        ]
      }]}
    ],
    darkness:[
      {min:9,max:9, sc:[{
        title:'Vigilia nocturna', text:'Pasás la noche entera despierto, dejando que la oscuridad te enseñe algo.',
        choices:[
          {label:'Mantener la calma', small:'+Digestión moderado', eff:{digestion:rndInt(3,6)}},
          {label:'Adentrarte en la oscuridad total', small:'Más progreso, riesgo mental', eff:()=>chance(0.55)?{digestion:rndInt(6,9)}:{sanity:-6, corruption:2}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Silencio absoluto', text:'Practicás moverte sin hacer el menor ruido durante horas.',
        choices:[
          {label:'Disciplina paciente', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Forzar los sentidos al límite', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{sanity:-7}},
        ]
      }]}
    ],
    door:[
      {min:9,max:9, sc:[{
        title:'Una puerta que no abre', text:'Encontrás una puerta vieja en un callejón que se niega a abrirse sin importar qué hagas.',
        choices:[
          {label:'Estudiar el mecanismo con calma', small:'+Digestión estable', eff:{digestion:rndInt(3,6)}},
          {label:'Forzarla con tu incipiente poder', small:'Más progreso, riesgo', eff:()=>chance(0.55)?{digestion:rndInt(5,8)}:{sanity:-4, corruption:1}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un atajo imposible', text:'Cruzás una distancia que no debería poder cruzarse en tan poco tiempo.',
        choices:[
          {label:'Anotar cada detalle del cruce', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Repetirlo una y otra vez', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(6,9)}:{sanity:-6, corruption:2}},
        ]
      }]}
    ],
    tyrant:[
      {min:9,max:9, sc:[{
        title:'Nadar contra la corriente', text:'Te obligás a nadar mar adentro en pleno oleaje, mucho más allá de lo prudente.',
        choices:[
          {label:'Medir tus fuerzas con cuidado', small:'+Digestión moderado', eff:{digestion:rndInt(3,6)}},
          {label:'Ir hasta el límite', small:'Más progreso, riesgo físico', eff:()=>chance(0.6)?{digestion:rndInt(6,9)}:{salud:-12, sanity:-3}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Domar la tormenta', text:'Te plantás a la intemperie durante una tormenta que cualquiera con sentido común estaría evitando.',
        choices:[
          {label:'Resistir con disciplina', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Gritarle a la tormenta', small:'Alto riesgo', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{salud:-15, sanity:-4}},
        ]
      }]}
    ],
    twilightGiant:[
      {min:9,max:9, sc:[{
        title:'Combate real', text:'Buscás un enfrentamiento físico genuino para poner a prueba tus nuevos límites.',
        choices:[
          {label:'Entrenar con un rival de confianza', small:'+Digestión moderado', eff:{digestion:rndInt(3,6)}},
          {label:'Buscar un oponente serio', small:'Más progreso, riesgo físico', eff:()=>chance(0.6)?{digestion:rndInt(6,9)}:{salud:-14, sanity:-2}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Aguantar el golpe', text:'Practicás quedarte firme y absorber un golpe en vez de esquivarlo.',
        choices:[
          {label:'Practicar con moderación', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'No retroceder ni un paso', small:'Alto riesgo', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{salud:-18}},
        ]
      }]}
    ],
    hermit:[
      {min:9,max:9, sc:[{
        title:'Un secreto ajeno', text:'Percibís, sin proponértelo, que alguien cercano oculta algo que no debería.',
        choices:[
          {label:'Anotarlo y no actuar', small:'+Digestión estable', eff:{digestion:rndInt(3,6)}},
          {label:'Confirmarlo por tu cuenta', small:'Más progreso, riesgo', eff:()=>chance(0.55)?{digestion:rndInt(5,8)}:{sanity:-4, reputation:-2}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Demasiado conocimiento', text:'Un fragmento de saber prohibido se te queda dando vueltas en la cabeza sin parar.',
        choices:[
          {label:'Dejarlo reposar', small:'Progreso bajo, seguro', eff:{digestion:rndInt(2,4)}},
          {label:'Perseguirlo hasta el final', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(6,9)}:{sanity:-7, corruption:2}},
        ]
      }]}
    ],
    sun:[
      {min:9,max:9, sc:[{
        title:'Un cántico para desconocidos', text:'Improvisás un cántico de aliento para un grupo de extraños asustados durante una emergencia.',
        choices:[
          {label:'Cantar con sinceridad', small:'+Digestión, +Reputación', eff:{digestion:rndInt(3,6), reputation:2}},
          {label:'Forzar la voz más allá de lo prudente', small:'Más progreso, -Cordura', eff:{digestion:rndInt(5,8), sanity:-4}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un contrato a medio cumplir', text:'Alguien te pide hacer valer un juramento que la otra parte ya empezó a romper.',
        choices:[
          {label:'Exigir su cumplimiento con firmeza', small:'Alto riesgo/recompensa', eff:()=>chance(0.55)?{digestion:rndInt(5,8), reputation:3}:{sanity:-5, reputation:-2}},
          {label:'Mediar con cautela', small:'Progreso bajo, estable', eff:{digestion:rndInt(2,3)}},
        ]
      }]}
    ],
    hangedMan:[
      {min:9,max:9, sc:[{
        title:'Un susurro no pedido', text:'Algo te habla desde un rincón de sombra que no debería poder hablar.',
        choices:[
          {label:'Escuchar con cautela', small:'+Digestión, -Cordura leve', eff:{digestion:rndInt(3,6), sanity:-2}},
          {label:'Escuchar sin reservas', small:'Más progreso, riesgo real', eff:()=>chance(0.5)?{digestion:rndInt(6,9)}:{sanity:-8, corruption:3}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un precio pequeño', text:'Sentís que un ritual menor podría avanzar más rápido si estás dispuesto a sacrificar algo propio.',
        choices:[
          {label:'Ofrecer sólo lo mínimo', small:'Progreso bajo, seguro', eff:{digestion:rndInt(2,4), sanity:-1}},
          {label:'Ofrecer de verdad', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{sanity:-6, corruption:3}},
        ]
      }]}
    ],
    death:[
      {min:9,max:9, sc:[{
        title:'Un cuerpo sin reclamar', text:'Te cruzás con un cadáver que nadie fue a buscar. Algo en vos sabe exactamente qué hacer con eso.',
        choices:[
          {label:'Estudiarlo con respeto', small:'+Digestión estable', eff:{digestion:rndInt(3,6)}},
          {label:'Ir más allá de lo razonable', small:'Más progreso, riesgo', eff:()=>chance(0.55)?{digestion:rndInt(5,8)}:{sanity:-5, corruption:2}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Una voz desde el otro lado', text:'Un espíritu reciente busca tu atención, todavía sin entender del todo que ya no tiene cuerpo.',
        choices:[
          {label:'Guiarlo con paciencia', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Usarlo para practicar sin cuidado', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(6,9)}:{sanity:-7, reputation:-2}},
        ]
      }]}
    ],
    moon:[
      {min:9,max:9, sc:[{
        title:'Un remedio para la vecina', text:'Una vecina con una tos que no se le va te pide "algo casero". Sabés exactamente qué mezclar.',
        choices:[
          {label:'Preparar un remedio suave y probado', small:'+Digestión estable, +Reputación', eff:{digestion:rndInt(3,6), reputation:2}},
          {label:'Probar una mezcla más potente, sin testear', small:'Más progreso, riesgo de dañarla', eff:()=>chance(0.6)?{digestion:rndInt(5,8), reputation:3}:{reputation:-4, sanity:-4}},
          {label:'Cobrarle bien por el favor', small:'+Dinero, poca digestión', eff:{cash:rndInt(20,50), digestion:rndInt(1,2)}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un perro al que nadie se acerca', text:'En el puerto hay un perro enorme que muerde a cualquiera. El dueño ya habla de sacrificarlo.',
        choices:[
          {label:'Acercarte con paciencia, día tras día', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Imponerte de golpe, mirándolo a los ojos', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{salud:-12, sanity:-3}},
        ]
      },{
        title:'La sed', text:'Hace días que algo en vos pide sangre. No es metáfora, y lo sabés.',
        choices:[
          {label:'Resistirla con disciplina', small:'Progreso bajo, seguro', eff:{digestion:rndInt(2,4), sanity:-1}},
          {label:'Saciarla con un animal, a escondidas', small:'Más progreso, +Corrupción', eff:{digestion:rndInt(5,8), corruption:2}},
          {label:'Dejarte llevar, sin cuidado', small:'Extremo', eff:()=>chance(0.4)?{digestion:rndInt(8,12), corruption:4}:{sanity:-9, corruption:6, reputation:-3}},
        ]
      }]},
      {min:5,max:1, sc:[{
        title:'La luna carmesí', text:'Una noche la luna sale roja y sentís que te llama por un nombre que todavía no es el tuyo.',
        choices:[
          {label:'Contemplarla sin responder', small:'Progreso moderado, prudente', eff:{digestion:rndInt(3,5)}},
          {label:'Responderle', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(7,11)}:{sanity:-10, corruption:5}},
        ]
      }]}
    ],
    error:[
      {min:9,max:9, sc:[{
        title:'Un bolsillo al alcance', text:'En el tranvía lleno, un hombre de traje caro lleva la billetera casi afuera del saco.',
        choices:[
          {label:'Sacársela con limpieza y devolverla "encontrada"', small:'+Digestión, +Reputación, sin riesgo', eff:{digestion:rndInt(3,6), reputation:1}},
          {label:'Quedártela', small:'+Dinero, más progreso, riesgo', eff:()=>chance(0.65)?{cash:rndInt(30,90), digestion:rndInt(4,7)}:{reputation:-5, sanity:-3}},
          {label:'Dejarla pasar', small:'Sin cambios', eff:{}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Una mentira grande', text:'Tenés la oportunidad de convencer a un prestamista de que ya le pagaste. Todo depende de cómo lo digas.',
        choices:[
          {label:'Una mentira chica y verosímil', small:'Progreso estable', eff:{digestion:rndInt(3,6), cash:rndInt(10,30)}},
          {label:'Una mentira enorme, sin fisuras', small:'Alto riesgo/recompensa', eff:()=>chance(0.5)?{digestion:rndInt(7,10), cash:rndInt(60,150)}:{reputation:-6, sanity:-4}},
        ]
      },{
        title:'Un cifrado ajeno', text:'Encontrás una carta en un código que no reconocés. Alguien se tomó mucho trabajo para que nadie la lea.',
        choices:[
          {label:'Descifrarla con método, sin apuro', small:'Progreso estable', eff:{digestion:rndInt(3,6)}},
          {label:'Forzar la clave con tu intuición', small:'Más progreso, riesgo de leer algo que no debías', eff:()=>chance(0.55)?{digestion:rndInt(6,9)}:{sanity:-6, corruption:2}},
        ]
      }]},
      {min:5,max:1, sc:[{
        title:'Una regla con una grieta', text:'Notás que una de las reglas que sostienen algo — un contrato, un sello, un ritual ajeno — tiene una falla que nadie vio.',
        choices:[
          {label:'Anotarla y no tocarla', small:'Progreso moderado, prudente', eff:{digestion:rndInt(3,5)}},
          {label:'Colarte por la grieta', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(8,11)}:{sanity:-9, corruption:4}},
        ]
      }]}
    ],
    whiteTower:[
      {min:9,max:9, sc:[{
        title:'Una biblioteca entera', text:'Conseguís acceso a la biblioteca de una universidad por una tarde. Es mucho más de lo que se puede leer en una vida.',
        choices:[
          {label:'Leer con método, tomando notas', small:'+Digestión estable', eff:{digestion:rndInt(3,6)}},
          {label:'Devorar todo lo posible sin parar', small:'Más progreso, -Cordura', eff:{digestion:rndInt(5,8), sanity:-4}},
          {label:'Buscar sólo textos prohibidos', small:'Riesgo, +Conocimiento', eff:()=>chance(0.55)?{digestion:rndInt(4,7), knowledge:{whiteTower:rndInt(2,4)}}:{sanity:-6, corruption:2}},
        ]
      }]},
      {min:8,max:6, sc:[{
        title:'Un caso sin resolver', text:'La policía archivó la muerte de un comerciante como accidente. Vos ves al menos tres detalles que no cierran.',
        choices:[
          {label:'Reconstruir el caso con paciencia', small:'Progreso estable, +Reputación', eff:{digestion:rndInt(3,6), reputation:2}},
          {label:'Confrontar al sospechoso con tu deducción', small:'Alto riesgo/recompensa', eff:()=>chance(0.55)?{digestion:rndInt(6,9), reputation:4}:{salud:-10, sanity:-4}},
        ]
      },{
        title:'Imitar un poder', text:'Viste a otro Beyonder usar una habilidad. Creés entender cómo funciona por dentro.',
        choices:[
          {label:'Analizarla en teoría, sin probar', small:'Progreso bajo, seguro', eff:{digestion:rndInt(2,4)}},
          {label:'Intentar reproducirla', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(7,10)}:{sanity:-7, salud:-5}},
        ]
      }]},
      {min:5,max:1, sc:[{
        title:'Un fragmento del futuro', text:'Por un instante ves algo que todavía no pasó. Es nítido, y es sobre alguien que conocés.',
        choices:[
          {label:'Registrarlo y no intervenir', small:'Progreso moderado, prudente', eff:{digestion:rndInt(3,5)}},
          {label:'Mirar más allá, hasta el final', small:'Riesgo alto', eff:()=>chance(0.5)?{digestion:rndInt(8,11)}:{sanity:-11, corruption:3}},
        ]
      }]}
    ]
  };
  const groups = table[pathwayKey] || [];
  for(const g of groups){ if(seqN<=g.min && seqN>=g.max) return g.sc; }
  return generic;
}

/* ---------------------------------------------------------------------
   DECISIONES CON CONSECUENCIAS OCULTAS (rework v3 §7, §51, §52)
   A diferencia de los eventos de sabor (que aplican su efecto y se terminan
   ahí), acá el jugador elige, y buena parte de lo que eligió NO se le muestra:
   se agenda con scheduleConsequence() para dentro de meses o años, y/o se
   guarda con remember() para condicionar eventos futuros. El "small" de cada
   opción deliberadamente NO adelanta el efecto oculto — a lo sumo insinúa el
   riesgo, porque la gracia es no saber del todo qué desencadenaste.
--------------------------------------------------------------------- */
const DECISION_EVENTS = [
  {
    id:'stranger_follow', w:5, req:()=>STATE.character.edad>=16 && !hasMemory('stranger_followed') && !hasMemory('stranger_ignored'),
    title:'Un hombre que no encaja',
    text:'Un hombre de abrigo largo cruza la calle con demasiada intención. Se detiene, mira una puerta cualquiera, y sigue. Algo en la escena no cierra.',
    choices:[
      {label:'Seguirlo a distancia', small:'Vas a saber algo más. Tal vez demasiado.', run:()=>{
        remember('stranger_followed', 'Seguiste a un desconocido que no encajaba en la escena.');
        applyEffects({knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(3,6)}});
        // Lo que el jugador NO ve: alguien anotó su cara.
        scheduleConsequence({
          inMonths: rndInt(14,40), tag:'watched',
          title:'Una cara conocida',
          text:'Un hombre te saluda por tu nombre en la calle. Vos no lo conocés — pero él a vos, evidentemente, sí. Se va antes de que puedas preguntarle nada.',
          effect:{sanity:-rndInt(3,7)},
          memory:{tag:'watched', text:'Alguien te reconoció por tu nombre sin que vos supieras quién era.'}
        });
        return 'Lo seguís seis cuadras hasta que dobla y, simplemente, ya no está.';
      }},
      {label:'Seguir tu camino', small:'No todo es asunto tuyo.', run:()=>{
        remember('stranger_ignored', 'Decidiste no seguir a un desconocido que te dio mala espina.');
        applyEffects({sanity:rndInt(1,3)});
        return 'Seguís tu camino. Por un rato te queda la sensación de haberte perdido algo.';
      }},
    ]
  },
  {
    id:'lend_money', w:5, req:()=>STATE.character.edad>=18 && STATE.character.cash>=200 && !hasMemory('lent_money') && !hasMemory('refused_loan'),
    title:'Un favor incómodo',
    text:'Un conocido te pide plata prestada. No mucha, pero tampoco poca. Promete devolverla "apenas se acomode".',
    choices:[
      {label:'Prestársela', small:'Un favor es un favor.', run:()=>{
        const monto = rndInt(120,320);
        applyEffects({cash:-monto, reputation:rndInt(1,3)});
        remember('lent_money', `Le prestaste ${fmtMoney(monto)} a un conocido sin garantía de nada.`);
        // Puede volver bien o puede no volver nunca — y eso se decide recién años después.
        if(chance(0.55)){
          scheduleConsequence({
            inMonths: rndInt(10,30), tag:'favor_repaid',
            title:'Una deuda saldada',
            text:'Aquel conocido reaparece, te devuelve lo que le prestaste y algo más. No se olvidó.',
            effect:{cash: Math.round(monto*1.4), reputation:rndInt(1,3)},
            memory:{tag:'favor_repaid', text:'Un favor tuyo volvió, años después, con intereses.'}
          });
        } else {
          scheduleConsequence({
            inMonths: rndInt(12,36), tag:'favor_betrayed',
            title:'Nunca volvió',
            text:'Te enterás, de casualidad, de que aquel conocido se fue de la ciudad hace rato. Tu plata se fue con él.',
            effect:{sanity:-rndInt(3,8)},
            memory:{tag:'favor_betrayed', text:'Alguien a quien ayudaste desapareció con tu plata.'}
          });
        }
        return 'Le das la plata sin hacerle firmar nada. Así son estas cosas.';
      }},
      {label:'Decirle que no podés', small:'No estás para eso.', run:()=>{
        remember('refused_loan', 'Le negaste un préstamo a un conocido que lo necesitaba.');
        applyEffects({reputation:-rndInt(1,4)});
        return 'Se lo tomás con cara de entenderlo, pero algo se enfría entre ustedes.';
      }},
    ]
  },
  {
    id:'strange_book_offer', w:4, req:()=>STATE.character.edad>=16 && STATE.flags.mysticExposure>=6 && !hasMemory('bought_odd_book'),
    title:'Un libro sin título',
    text:'En una mesa de saldos hay un libro encuadernado a mano, sin título ni autor. El vendedor no recuerda de dónde salió y te lo deja barato.',
    choices:[
      {label:'Comprarlo', small:'Leer nunca hizo mal a nadie.', run:()=>{
        applyEffects({cash:-rndInt(20,70), knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(4,8)}});
        remember('bought_odd_book', 'Compraste un libro sin título que nadie supo explicarte de dónde salía.');
        scheduleConsequence({
          inMonths: rndInt(8,26), tag:'book_consequence',
          title:'Alguien pregunta por el libro',
          text:'Una persona que no conocés aparece preguntando, con demasiada precisión, por "un libro encuadernado a mano" que compraste hace tiempo. Le decís que no sabés de qué habla.',
          effect:{sanity:-rndInt(2,6)},
          memory:{tag:'book_wanted', text:'Alguien vino a preguntarte por el libro sin título.'}
        });
        return 'Lo comprás. Las primeras páginas son aburridas. Las del medio, no tanto.';
      }},
      {label:'Dejarlo donde está', small:'Ya tenés bastante encima.', run:()=>{
        remember('left_odd_book', 'Dejaste pasar un libro sin título que te llamó la atención.');
        return 'Lo dejás. Al día siguiente la mesa de saldos ya no está en esa esquina.';
      }},
    ]
  },
  {
    id:'witness_something', w:3, req:()=>STATE.character.edad>=16 && STATE.flags.mysticExposure>=12 && !hasMemory('witnessed_incident'),
    title:'Algo que no deberías haber visto',
    text:'Volviendo de noche ves, en el fondo de un callejón, algo que tu cabeza se niega a ordenar del todo. Dura tres segundos. Después no hay nada.',
    choices:[
      {label:'Contarlo', small:'No podés quedártelo.', run:()=>{
        remember('witnessed_incident', 'Viste algo imposible en un callejón, y lo contaste.');
        applyEffects({reputation:-rndInt(3,8), sanity:-rndInt(2,5)});
        scheduleConsequence({
          inMonths: rndInt(6,20), tag:'talked_too_much',
          title:'Tu historia circuló',
          text:'Lo que contaste aquella vez llegó más lejos de lo que pensabas. Alguien lo repitió en el lugar equivocado.',
          effect:()=>({sanity:-rndInt(3,7), knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(2,5)}}),
          memory:{tag:'marked_by_talking', text:'Tu historia del callejón circuló más de la cuenta.'}
        });
        return 'Lo contás. La mayoría se ríe. Uno de los que escuchaba no se ríe.';
      }},
      {label:'Callártelo', small:'Mejor así.', run:()=>{
        remember('witnessed_silent', 'Viste algo imposible y decidiste no contárselo a nadie.');
        applyEffects({sanity:-rndInt(4,9), knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(2,4)}});
        return 'No se lo contás a nadie. Eso también tiene su precio: te lo guardás entero.';
      }},
    ]
  },
  // Este sólo existe si antes seguiste al desconocido: una decisión vieja
  // habilitando contenido nuevo, que es justamente el punto del sistema.
  {
    id:'stranger_returns', w:6, req:()=>hasMemory('watched') && !hasMemory('stranger_offer_taken') && !hasMemory('stranger_offer_refused'),
    title:'El que te conocía',
    text:'El hombre que te saludó por tu nombre vuelve a aparecer. Esta vez se sienta enfrente tuyo y va al grano: dice que hay gente que se dedica a cosas que vos ya viste, y que podrías serles útil.',
    choices:[
      {label:'Escuchar lo que ofrece', small:'Ya llegaste hasta acá.', run:()=>{
        remember('stranger_offer_taken', 'Aceptaste escuchar la oferta del hombre que te venía siguiendo.');
        applyEffects({knowledge:{[pick(Object.keys(PATHWAYS))]: rndInt(6,12)}, sanity:-rndInt(2,5)});
        STATE.flags.metOccultContact = true;
        STATE.flags.mysticExposure += 8;
        scheduleConsequence({
          inMonths: rndInt(18,48), tag:'old_debt',
          title:'Te pasan la factura',
          text:'Aquella conversación que aceptaste tener hace años vuelve en forma de pedido. No es una sugerencia.',
          effect:()=>({sanity:-rndInt(4,9), corruption:rndInt(1,4)}),
          memory:{tag:'owes_favor', text:'Quedaste debiéndole algo a gente que no olvida.'}
        });
        return 'Lo escuchás hasta el final. Cuando se va, entendés que eso no fue una charla: fue un trámite.';
      }},
      {label:'Levantarte y irte', small:'No, gracias.', run:()=>{
        remember('stranger_offer_refused', 'Rechazaste la oferta del hombre que te venía siguiendo.');
        applyEffects({sanity:rndInt(1,4)});
        scheduleConsequence({
          inMonths: rndInt(24,60), tag:'road_not_taken',
          title:'El camino que no tomaste',
          text:'Te enterás de que alguien parecido a vos, en circunstancias parecidas, dijo que sí. No termina bien. Por un rato no sabés si sentir alivio o vértigo.',
          effect:{sanity:-rndInt(1,4)},
          memory:{tag:'road_not_taken', text:'Supiste cómo le fue a quien aceptó lo que vos rechazaste.'}
        });
        return 'Te levantás sin terminar de escucharlo. No te sigue. Eso, en sí mismo, dice algo.';
      }},
    ]
  },
];

function maybeTriggerDecisionEvent(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return false;
  if(STATE.character.edad < 13) return false;
  if(!chance(0.06)) return false; // poco frecuente a propósito: son momentos, no rutina
  const eligible = DECISION_EVENTS.filter(e=>!e.req || e.req());
  if(!eligible.length) return false;
  const ev = weightedPick(eligible);
  if(!ev) return false;
  STATE.pendingEvent = {
    kind:'decision', title: ev.title, text: ev.text,
    choices: ev.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))
  };
  STATE._pendingChoiceData = ev.choices;
  STATE._importantMoment = true;
  return true;
}

function resolveDecisionChoice(idx){
  const c = STATE._pendingChoiceData[idx];
  const title = STATE.pendingEvent.title;
  STATE.pendingEvent = null;
  STATE._pendingChoiceData = null;
  const resultText = c.run ? c.run() : '';
  logJournal(title, (c.label + '. ' + (resultText||'')).trim());
  saveGame(true);
  checkDeathAndCrisis();
  renderAll();
}

function doActing(){
  if(!STATE.pathway.chosenPathway || STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  if(!canUseSeasonAction('acting')){ toast('Ya usaste tus prácticas de Acting Method de esta temporada.', 'neg'); return; }
  useSeasonAction('acting');
  const key = STATE.pathway.chosenPathway;
  const seqN = STATE.pathway.sequence;
  const scenarios = actingScenarios(key, seqN);
  const sc = pick(scenarios);
  STATE.pendingEvent = {
    kind:'acting', title: sc.title, text: sc.text,
    choices: sc.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))
  };
  STATE._pendingChoiceData = sc.choices;
  renderAll();
}

// Clasifica una elección de Acting como 'careful'/'risky'/'neutral' leyendo su
// propio texto (small/label) — no hace falta anotar a mano cada una de las
// ~40 escenas ya existentes. Ver actingConsistencyMult().
function inferChoiceRisk(choice){
  const text = ((choice.small||'') + ' ' + (choice.label||'')).toLowerCase();
  // Importante: revisar "careful" ANTES que "risky". Frases como "bajo riesgo"
  // o "sin riesgo" contienen literalmente la palabra "riesgo" pero significan
  // lo contrario — si se chequeara "risky" primero, quedarían mal clasificadas.
  if(/bajo riesgo|poco riesgo|sin riesgo|cauteloso|moderado|seguro|estable|disciplina|prudente|con calma|paciencia|con cuidado/.test(text)) return 'careful';
  if(/riesgo|arriesg|peligroso|forzar|extremo|sin cuidado/.test(text)) return 'risky';
  return 'neutral';
}
// Consistencia del Acting Method (rework v3 §19): un personaje que actúa
// parecido mes a mes digiere mejor que uno que se contradice todo el tiempo.
// Con menos de 3 elecciones no-neutrales todavía no hay patrón que premiar o
// castigar. dominante/total va de 0.5 (parejo, errático) a 1 (siempre igual).
function actingConsistencyMult(){
  const h = STATE.character.actingHistory || [];
  const relevant = h.filter(x=>x!=='neutral');
  if(relevant.length < 3) return 1;
  const last = relevant.slice(-5);
  const careful = last.filter(x=>x==='careful').length;
  const risky = last.filter(x=>x==='risky').length;
  const consistencia = Math.max(careful, risky) / last.length;
  return clamp(0.6 + consistencia*0.65, 0.85, 1.25);
}
function actingStyleLabel(){
  const h = STATE.character.actingHistory || [];
  const relevant = h.filter(x=>x!=='neutral').slice(-5);
  if(relevant.length < 3) return null;
  const careful = relevant.filter(x=>x==='careful').length;
  const risky = relevant.filter(x=>x==='risky').length;
  if(careful >= 4) return 'Últimamente actuás con mucho cuidado. Se nota — digerís mejor así.';
  if(risky >= 4) return 'Últimamente te la jugás seguido. Vas encontrando el ritmo de ese riesgo.';
  if(Math.abs(careful-risky) <= 1) return 'Tu forma de actuar viene siendo errática — ni tu cuerpo ni tu mente terminan de acostumbrarse.';
  return null;
}

function resolveActingChoice(idx){
  const c = STATE._pendingChoiceData[idx];
  let eff = typeof c.eff === 'function' ? c.eff() : c.eff;
  eff = eff || {};
  // Consistencia del Acting (§19): se registra la elección y, si trae Digestión
  // positiva, se escala según qué tan consistente venís actuando. Sólo toca la
  // Digestión — el resto de la escena (Sanity, Corrupción, plata) queda igual
  // que siempre, para no desbalancear el riesgo/recompensa ya afinado de cada una.
  if(!STATE.character.actingHistory) STATE.character.actingHistory = [];
  STATE.character.actingHistory.push(inferChoiceRisk(c));
  if(STATE.character.actingHistory.length > 20) STATE.character.actingHistory.shift();
  if(eff.digestion > 0) eff = {...eff, digestion: Math.max(1, Math.round(eff.digestion * actingConsistencyMult()))};
  const toastMsgs = effectsToToastList(eff);
  const prevDigestion = STATE.pathway.digestion;
  applyEffects(eff);
  logJournal('Acting: '+STATE.pendingEvent.title, c.label);
  // Un solo toast agrupando todos los cambios de esta elección, no uno por stat.
  if(toastMsgs.length) toast(toastMsgs);
  STATE.pendingEvent = null;
  STATE._pendingChoiceData = null;
  checkDeathAndCrisis();
  maybeReadyForAdvancement(prevDigestion);
  saveGame(true);
  renderAll();
}

// Sólo avisa la primera vez que la Digestión cruza el umbral requerido, no en cada
// Acting posterior (antes repetía el toast en cada clic una vez llegado a 100%).
function maybeReadyForAdvancement(prevDigestion){
  if(!STATE.pathway.chosenPathway) return;
  const req = DIGESTION_REQ[STATE.pathway.sequence];
  const wasReady = prevDigestion !== undefined && prevDigestion >= req;
  if(STATE.pathway.digestion >= req && !wasReady){
    toast('¡Digestión completa! Podés intentar el Advancement Ritual.', 'pos');
  }
}

/* ---------------------------------------------------------------------
   PRIMERA POCIÓN (convertirse en Beyonder)
--------------------------------------------------------------------- */
function firstPotionRequirements(key){
  const p = STATE.pathway;
  const formula = FIRST_POTIONS[key];
  const c = STATE.character;
  const needed = ingredientsNeededFor(key, 9);
  const reqs = [
    {label:'Conocimiento suficiente (Comprendida o más)', ok: p.knowledge[key] >= 50},
    {label:'Fórmula conocida', ok: p.formulaKnown[key]},
  ];
  needed.forEach(ing=>{
    reqs.push({label:'Ingrediente: '+ing, ok: ownedQty(key, ing) > 0});
  });
  reqs.push({label:'Dinero para preparar la poción: ' + fmtMoney(formula.ingredientCost), ok: c.cash >= formula.ingredientCost});
  reqs.push({label:'Cordura mínima (40)', ok: c.sanity >= 40});
  return reqs;
}

function attemptFirstPotion(key){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat) return;
  const reqs = firstPotionRequirements(key);
  if(reqs.some(r=>!r.ok)){ toast('Aún no cumplís todos los requisitos.', 'neg'); return; }
  const formula = FIRST_POTIONS[key];
  const c = STATE.character;
  applyEffects({cash:-formula.ingredientCost});
  const success = chance(formula.prepDifficulty);
  if(success){
    consumeIngredientsForSequence(key, 9);
    STATE.pathway.chosenPathway = key;
    STATE.pathway.sequence = 9;
    STATE.pathway.digestion = 0;
    const pw = PATHWAYS[key];
    logJournal('PRIMERA POCIÓN', `Ingerís la ${formula.name}. Tu cuerpo arde por dentro durante horas interminables. Al amanecer, ya no sos completamente humano. Sequence 9 — ${pw.seq[0].name}.`);
    applyEffects({sanity:-rndInt(8,18), corruption:rndInt(2,8)});
    toast('¡Te convertiste en Beyonder! Sequence 9 — ' + pw.seq[0].name, 'pos');
    addMilestone('potion', `Primera poción: ${pw.name}, Sequence 9 — ${pw.seq[0].name}`);
  } else {
    // Los ingredientes NO se consumen en un fracaso — la preparación falla, pero lo
    // que ya juntaste sigue siendo tuyo para reintentar más adelante.
    const severity = Math.random();
    if(severity < 0.25){
      applyEffects({salud:-rndInt(30,60), sanity:-rndInt(15,30)});
      logJournal('Poción fallida', 'La preparación falla de forma catastrófica. Sobrevivís, pero el daño es severo.');
      toast('La poción falló gravemente.', 'neg');
    } else {
      applyEffects({sanity:-rndInt(10,20), corruption:rndInt(3,10)});
      logJournal('Poción fallida', 'El proceso de ingestión fracasa. No hay transformación, sólo dolor y una advertencia clara del riesgo real que implica este camino.');
      toast('La poción falló. Podés volver a intentarlo más adelante.', 'neg');
    }
  }
  checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   ADVANCEMENT RITUAL
--------------------------------------------------------------------- */
function advancementRequirements(){
  const seq = STATE.pathway.sequence;
  const diff = ADVANCE_DIFFICULTY[seq];
  const c = STATE.character;
  const targetSeq = seq - 1;
  const reqs = [
    {label:'Digestión completa (100%)', ok: STATE.pathway.digestion >= 100},
  ];
  ingredientsNeededFor(STATE.pathway.chosenPathway, targetSeq).forEach(ing=>{
    reqs.push({label:'Ingrediente: '+ing, ok: ownedQty(STATE.pathway.chosenPathway, ing) > 0});
  });
  reqs.push({label:'Dinero: ' + fmtMoney(diff.moneyCost), ok: c.cash >= diff.moneyCost});
  reqs.push({label:'Cordura mínima (35)', ok: c.sanity >= 35});
  if(diff.needsFlag){
    reqs.push({label:'Oportunidad especial encontrada', ok: !!STATE.pathway.advanceFlags[seq]});
  }
  return reqs;
}

/* ---------------------------------------------------------------------
   ADVANCEMENT COMO ESCENA (rework v3 §21)
   Antes: click en un botón → requisitos → tirada → resultado, todo en el
   mismo instante. Ahora es una escena de 3 pasos (preparar el lugar,
   comprobar los símbolos, reaccionar ante la anomalía) donde cada elección
   suma o resta a una "precisión ritual" oculta que después modula tanto la
   chance de éxito como qué tan grave es un fracaso — no es sólo cosmética.
--------------------------------------------------------------------- */
const RITUAL_STEPS = [
  {
    title:'Preparar el lugar',
    text:'El ritual necesita un espacio propio. Tenés el conocimiento para armarlo, pero también tenés poco tiempo y menos calma.',
    choices:[
      {label:'Prepararlo con calma meticulosa', small:'Más precisión, más tiempo', quality:2},
      {label:'Armarlo rápido y confiar en lo aprendido', small:'Normal', quality:0},
      {label:'Improvisar con lo que hay a mano', small:'Arriesgado', quality:-2},
    ]
  },
  {
    title:'Comprobar los símbolos',
    text:'Antes de empezar de verdad, hay que revisar cada trazo, cada ingrediente en su lugar. Un error acá se paga después.',
    choices:[
      {label:'Revisar todo dos veces', small:'Más precisión, gasta tiempo', quality:2},
      {label:'Confiar en tu memoria', small:'Normal', quality:0},
      {label:'Empezar de una vez', small:'Arriesgado', quality:-2},
    ]
  },
  {
    title:'Una anomalía',
    text:'A mitad de camino, algo se sale de lo previsto — una vela que no debería apagarse se apaga, un símbolo tiembla donde no debería. Tenés que decidir ahí mismo.',
    choices:[
      {label:'Mantener la concentración pase lo que pase', small:'Depende de tu Espiritualidad', quality:()=>STATE.character.spirituality>=50?3:-1},
      {label:'Frenar y corregir el error', small:'Seguro, pero pierde ímpetu', quality:1},
      {label:'Forzarlo hasta el final', small:'Todo o nada', quality:()=>chance(0.5)?4:-4},
    ]
  },
];

function attemptAdvancement(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat) return;
  const seq = STATE.pathway.sequence;
  if(seq === 0){ toast('Ya alcanzaste la Sequence 0.', 'neg'); return; }
  const reqs = advancementRequirements();
  if(reqs.some(r=>!r.ok)){ toast('Aún no cumplís los requisitos del ritual.', 'neg'); return; }
  STATE._ritualAccuracy = 0;
  openRitualStep(0);
}

function openRitualStep(stepIdx){
  const step = RITUAL_STEPS[stepIdx];
  STATE.pendingEvent = {
    kind:'ritual', step: stepIdx, totalSteps: RITUAL_STEPS.length,
    title: step.title, text: step.text,
    choices: step.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))
  };
  STATE._ritualStepIdx = stepIdx;
  STATE._importantMoment = true;
}

function resolveRitualChoice(idx){
  const stepIdx = STATE._ritualStepIdx;
  const choice = RITUAL_STEPS[stepIdx].choices[idx];
  const q = typeof choice.quality === 'function' ? choice.quality() : choice.quality;
  STATE._ritualAccuracy += q;
  STATE.pendingEvent = null;
  if(stepIdx + 1 < RITUAL_STEPS.length){
    openRitualStep(stepIdx + 1);
    renderAll();
    return;
  }
  resolveAdvancement(STATE._ritualAccuracy);
}

// La resolución final: misma matemática de siempre (ADVANCE_DIFFICULTY,
// espiritualidad, cordura, bonus de preparación previa) más la precisión
// ritual acumulada en la escena, que puede ir de -8 (los 3 pasos mal jugados)
// a +9 (los 3 bien jugados con suerte en la anomalía).
function resolveAdvancement(ritualAccuracy){
  const seq = STATE.pathway.sequence;
  const diff = ADVANCE_DIFFICULTY[seq];
  const c = STATE.character;
  const key = STATE.pathway.chosenPathway;
  applyEffects({cash:-diff.moneyCost});
  const prepBonus = STATE.pathway.ritualPrepBonus || 0;
  STATE.pathway.ritualPrepBonus = 0;
  const accuracyMod = clamp(ritualAccuracy, -8, 9) * 0.02; // hasta ±18% de chance
  const successMod = (c.sanity/100)*0.15 + (c.spirituality/200) + prepBonus + accuracyMod;
  const success = chance(clamp(diff.baseSuccess + successMod, 0.02, 0.9));
  const pw = PATHWAYS[key];
  if(success){
    consumeIngredientsForSequence(key, seq-1);
    STATE.pathway.sequence = seq - 1;
    STATE.pathway.digestion = 0;
    delete STATE.pathway.advanceFlags[seq];
    const newSeqData = pw.seq.find(s=>s.n===STATE.pathway.sequence);
    applyEffects({sanity:-rndInt(5,15), corruption:rndInt(1,6)});
    logJournal('ADVANCEMENT RITUAL — ÉXITO', `Las velas se apagan. Una fuerza desconocida parece observarte. El ritual concluye: alcanzás la Sequence ${STATE.pathway.sequence} — ${newSeqData.name}. ${newSeqData.ability}`);
    toast('¡Advancement exitoso! Sequence ' + STATE.pathway.sequence + ' — ' + newSeqData.name, 'pos');
    addMilestone('advance', `Sequence ${STATE.pathway.sequence} — ${newSeqData.name}`);
    if(STATE.pathway.sequence === 0){
      endGame('beyonder', 'True God', `${c.nombre} ${c.apellido} alcanza la Sequence 0 de la vía ${pw.name}. Un logro estadísticamente casi imposible. Pocos, en toda la historia registrada, han llegado tan lejos.`);
    }
  } else {
    // Los ingredientes NO se consumen en un fracaso — sólo el dinero y el desgaste físico/mental.
    // Una precisión ritual alta reduce en particular la chance de que el fracaso sea GRAVE,
    // no sólo la de fracasar: prepararse bien no evita el error, pero amortigua el golpe.
    const severity = Math.random() + clamp(ritualAccuracy,-8,9)*0.02;
    if(severity < 0.3){
      applyEffects({salud:-rndInt(20,50), sanity:-rndInt(15,30), corruption:rndInt(5,15)});
      logJournal('ADVANCEMENT RITUAL — FRACASO GRAVE', 'El ritual se desestabiliza. El precio del fracaso se cobra en carne y cordura.');
      toast('El ritual fracasó gravemente.', 'neg');
    } else {
      applyEffects({sanity:-rndInt(8,18), corruption:rndInt(2,8)});
      logJournal('ADVANCEMENT RITUAL — FRACASO', 'El ritual no prospera. Las condiciones no eran las adecuadas. Podrás reintentarlo en el futuro.');
      toast('El ritual fracasó. Reintentá más adelante.', 'neg');
    }
  }
  checkDeathAndCrisis();
  saveGame(true);
  renderAll();
}

// pequeña probabilidad mensual de que aparezca la "oportunidad especial" requerida para sequences altas
function maybeGrantAdvanceFlag(){
  if(!STATE.pathway.chosenPathway) return;
  const seq = STATE.pathway.sequence;
  const diff = ADVANCE_DIFFICULTY[seq];
  if(diff && diff.needsFlag && !STATE.pathway.advanceFlags[seq]){
    const p = 0.01 + STATE.character.reputation/2000 + STATE.pathway.knowledge[STATE.pathway.chosenPathway]/3000;
    if(chance(p)){
      STATE.pathway.advanceFlags[seq] = true;
      logJournal('Oportunidad especial', 'Un acontecimiento poco común abre una puerta que normalmente permanece cerrada. El camino hacia la siguiente Sequence, por fin, parece posible.');
      toast('¡Se abrió una oportunidad especial de Advancement!', 'pos');
    }
  }
}

/* ---------------------------------------------------------------------
   AVANZAR TIEMPO (botón principal)
   El botón avanza un mes por click (y muestra un único evento de journal por
   click, para no saturar la pantalla). Las acciones repetibles (Investigar,
   Acting, Trabajar horas extra, Explorar) tienen un cupo por TEMPORADA de 3
   meses que se resetea solo al cruzar ese límite, sin importar que ahora
   lleguen varios clicks en vez de uno — ver SEASON_ACTION_LIMITS más abajo.
   "Buscar mejor empleo" queda afuera de este sistema (usa su propio
   enfriamiento de 12 meses, ver seekBetterJob) para seguir siendo un evento
   poco frecuente.
--------------------------------------------------------------------- */
// Antes eran cupos "por año" (3 usos, con un solo Avanzar Año disponible por año).
// Ahora que avanzar es más frecuente (una temporada = 3 meses, 4 por año), se
// bajó cada cupo para que el total anual no se dispare x4 de la nada.
const SEASON_ACTION_LIMITS = { investigate:1, acting:1, work:1, explore:2, missions:1, personal:1, research:1 };
function actionsLeft(key){ return SEASON_ACTION_LIMITS[key] - (STATE.seasonActions[key]||0); }
function canUseSeasonAction(key){ return actionsLeft(key) > 0; }
function useSeasonAction(key){ STATE.seasonActions[key] = (STATE.seasonActions[key]||0) + 1; }
function resetSeasonActions(){
  for(const k in SEASON_ACTION_LIMITS) STATE.seasonActions[k] = 0;
}

/* ---------------------------------------------------------------------
   AVANCE DE TIEMPO (rework v3 §5)
   Tres velocidades, un solo motor. La regla dura: el avance rápido NUNCA
   puede pasar por encima de un combate, una decisión pendiente, una misión,
   una muerte, un descubrimiento de vía o una consecuencia retrasada que
   vence. Todo eso frena el avance en el acto y deja al jugador mirando lo
   que pasó, en vez de enterarse por el journal diez meses después.
--------------------------------------------------------------------- */
function timeBlocked(){
  return !!(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver);
}
// Devuelve cuántos meses efectivamente avanzó.
function advanceTime(maxMonths){
  if(timeBlocked()) return 0;
  let advanced = 0;
  for(let i=0;i<maxMonths;i++){
    const monthsBefore = STATE.time.totalMonths;
    processMonth();
    advanced++;
    if(!STATE.combat) maybeGrantAdvanceFlag();
    // Los cupos de la temporada se resetean al cruzar cada múltiplo de 3 meses,
    // sin importar de cuántos meses haya sido este click.
    if(Math.floor(STATE.time.totalMonths/3) > Math.floor(monthsBefore/3)){
      resetSeasonActions();
    }
    // Cualquier cosa que exija atención corta el avance acá mismo.
    if(timeBlocked() || STATE._importantMoment) break;
  }
  saveGame(true);
  renderAll();
  return advanced;
}

function advanceOneMonth(){ advanceTime(1); }
function advanceOneSeason(){ advanceTime(3); }
// "Hasta el próximo evento importante": avanza hasta toparse con algo que
// merezca la atención del jugador, con un tope duro para no colgar el juego
// en una vida tranquila (10 años sin nada relevante ya es señal suficiente).
function advanceUntilImportant(){
  const before = STATE.time.totalMonths;
  const advanced = advanceTime(120);
  if(!STATE.gameOver && advanced > 1 && !timeBlocked()){
    const años = Math.floor(advanced/12), meses = advanced%12;
    const partes = [];
    if(años) partes.push(años + (años===1?' año':' años'));
    if(meses) partes.push(meses + (meses===1?' mes':' meses'));
    toast('Pasaron ' + (partes.join(' y ') || '1 mes') + ' sin sobresaltos.', null);
  }
  return STATE.time.totalMonths - before;
}

// Se mantiene el nombre viejo como alias: lo usan el binding del botón principal
// y varios tests, y no tiene sentido romperlos por un cambio de nombre.
function advanceSeason(){ advanceOneMonth(); }

/* ---------------------------------------------------------------------
   ENDINGS
--------------------------------------------------------------------- */
function endGame(category, title, text){
  if(STATE.gameOver) return;
  STATE.gameOver = true;
  STATE.endingData = {category, title, text};
  logJournal('FIN — ' + title, text);
  addMilestone('end', title);
  saveGame(true);
  renderEndScreen();
}

// Línea de tiempo del epílogo: edad vs. hito, a partir de STATE.milestones (ver
// addMilestone). Hitos del mismo año se agrupan en una sola marca de edad para
// que una vida larga no se lea como una lista interminable.
const MILESTONE_ICON = {birth:'✧', mystic:'◈', potion:'⚗', advance:'▲', family:'♥', loss:'✝', end:'☾'};
function renderLifeTimeline(){
  const ms = STATE.milestones || [];
  if(!ms.length) return '';
  const byAge = [];
  ms.forEach(m=>{
    const last = byAge[byAge.length-1];
    if(last && last.edad === m.edad) last.items.push(m);
    else byAge.push({edad:m.edad, items:[m]});
  });
  const maxAge = Math.max(1, ...ms.map(m=>m.edad));
  return `
    <div class="sec-title" style="text-align:left;">Una vida, en pocas líneas</div>
    <div class="life-bar" aria-hidden="true">
      ${byAge.map(g=>`<span class="life-bar-dot k-${g.items[g.items.length-1].kind}" style="left:${Math.round(g.edad/maxAge*100)}%;"></span>`).join('')}
    </div>
    <ol class="timeline">
      ${byAge.map(g=>`
        <li class="tl-item">
          <div class="tl-age">${g.edad === 0 ? 'Nacimiento' : g.edad+' años'}</div>
          <div class="tl-events">
            ${g.items.map(m=>`<div class="tl-ev k-${m.kind}"><span class="tl-ic">${MILESTONE_ICON[m.kind]||'·'}</span>${m.text}</div>`).join('')}
          </div>
        </li>`).join('')}
    </ol>
  `;
}

function renderEndScreen(){
  document.getElementById('screen-game').classList.add('hidden');
  const el = document.getElementById('screen-end');
  el.classList.remove('hidden');
  const ed = STATE.endingData;
  const catLabel = {human:'Final Humano', beyonder:'Final Beyonder', negative:'Final Negativo', special:'Final Especial'}[ed.category] || 'Final';
  const c = STATE.character;
  el.innerHTML = `
    <div class="end-wrap">
      <div class="end-cat">${catLabel}</div>
      <div class="end-title">${ed.title}</div>
      <div class="end-name">${c.nombre} ${c.apellido}</div>
      <div class="end-text">${ed.text}</div>
      <div class="rule"></div>
      <p class="small-note" style="margin-bottom:18px;">Vivió ${c.edad} año(s). ${STATE.pathway.chosenPathway ? 'Alcanzó Sequence '+STATE.pathway.sequence+' de la vía '+PATHWAYS[STATE.pathway.chosenPathway].name+'.' : 'Nunca se convirtió en Beyonder.'}</p>
      ${renderLifeTimeline()}
      <button class="btn btn-primary" id="newLifeBtn">Comenzar una nueva vida</button>
    </div>
  `;
  document.getElementById('newLifeBtn').onclick = ()=>{
    localStorage.removeItem(SAVE_KEY);
    creationStep = 0;
    creationData = freshCreationData();
    el.classList.add('hidden');
    document.getElementById('screen-intro').classList.remove('hidden');
    renderIntro();
  };
}

/* ---------------------------------------------------------------------
   NPCs — investigar
--------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   INVESTIGACIÓN MÍSTICA, SECRETOS Y RUMORES (rework v3 §15, §16, §14)
   Investigar deja de ser sólo "hablar con NPCs" (ver investigateNPC más abajo,
   que sigue existiendo tal cual) y pasa a ser su propio gameplay: 5 métodos
   con perfil de riesgo/costo/pago distinto, que pueden dar información REAL,
   un SECRETO (a veces peligroso: cuesta Cordura/Corrupción y no hay forma de
   "des-saberlo"), una PISTA FALSA (un rumor que el jugador no puede distinguir
   de uno real con sólo mirarlo) o nada. Comparten un cupo de temporada propio
   ('research'), separado del de investigar NPCs.
--------------------------------------------------------------------- */
const RESEARCH_METHODS = [
  {id:'library', name:'Visitar la biblioteca', cost:0,   ageMin:13, riskLabel:'Baja'},
  {id:'church',  name:'Hablar con la Iglesia', cost:0,   ageMin:14, riskLabel:'Baja'},
  {id:'symbol',  name:'Estudiar un símbolo',   cost:25,  ageMin:14, riskLabel:'Media'},
  {id:'contact', name:'Seguir una pista clandestina', cost:90,  ageMin:16, riskLabel:'Alta'},
  {id:'mystic',  name:'Consultar a un místico', cost:160, ageMin:18, riskLabel:'Media-Alta'},
];
const RESEARCH_OUTCOMES = {
  library: {success:0.45, secret:0.12, falseLead:0.20, nothing:0.23, attention:[0,1]},
  church:  {success:0.35, secret:0.08, falseLead:0.15, nothing:0.42, attention:[0,1]},
  symbol:  {success:0.50, secret:0.15, falseLead:0.25, nothing:0.10, attention:[1,2]},
  contact: {success:0.40, secret:0.30, falseLead:0.10, nothing:0.20, attention:[2,5]},
  mystic:  {success:0.55, secret:0.25, falseLead:0.10, nothing:0.10, attention:[1,3]},
};
const RESEARCH_KNOWLEDGE_GAIN = {library:[2,5], church:[1,4], symbol:[3,7], contact:[4,9], mystic:[5,10]};
const SECRET_POOL = [
  'Cierta calle de la ciudad no aparece en ningún mapa oficial, y quienes la mencionan cambian de tema enseguida.',
  'Una de las familias más respetadas del barrio no envejece al ritmo que debería.',
  'Hay una lista, en algún lado, con nombres de personas que "dejaron de ser un problema".',
  'Cierto edificio abandonado tiene luz encendida todas las noches, en un piso que oficialmente no existe.',
  'Alguien con mucho poder en esta ciudad le debe un favor a algo que no es humano.',
  'Existen reuniones que se celebran siempre la misma noche del mes, en direcciones que cambian cada vez.',
  'Un episodio "resuelto" hace años por la policía en realidad nunca se explicó del todo — sólo se dejó de hablar de él.',
  'Hay una fórmula que circula en voz baja: dicen que sirve para alterar recuerdos ajenos.',
];

function addRumor(key, correct){
  STATE.pathway.rumors.push({key, correct, year:STATE.time.year});
  if(STATE.pathway.rumors.length > 30) STATE.pathway.rumors.shift();
}
function learnSecret(text, dangerous){
  STATE.character.secrets.push({text, dangerous, year:STATE.time.year});
  if(STATE.character.secrets.length > 60) STATE.character.secrets.shift();
  if(dangerous){
    applyEffects({sanity:-rndInt(4,10), corruption:rndInt(1,4)});
    raiseAttention(rndInt(2,5));
    remember('secreto_peligroso', 'Aprendiste algo que probablemente no deberías saber.');
    logJournal('Un secreto peligroso', 'Averiguás algo que te pesa saber. No hay forma de "des-saberlo".');
    toast('Aprendiste un secreto peligroso.', 'neg');
  } else {
    applyEffects({sanity:-rndInt(0,2)});
    logJournal('Un secreto', 'Averiguás algo que la mayoría de la gente no sabe.');
    toast('Aprendiste un secreto.', null);
  }
}

function doResearch(methodId){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const m = RESEARCH_METHODS.find(x=>x.id===methodId);
  if(!m) return;
  if(STATE.character.edad < m.ageMin){ toast('Todavía sos muy chico para eso.', 'neg'); return; }
  if(!canUseSeasonAction('research')){ toast('Ya usaste tu investigación mística de esta temporada.', 'neg'); return; }
  if(STATE.character.cash < m.cost){ toast('No tenés suficiente dinero para esto.', 'neg'); return; }
  useSeasonAction('research');
  if(m.cost) applyEffects({cash:-m.cost});
  const o = RESEARCH_OUTCOMES[m.id];
  raiseAttention(rndInt(o.attention[0], o.attention[1]));

  const roll = Math.random();
  let acc = 0, outcome = 'nothing';
  for(const k of ['success','secret','falseLead','nothing']){
    acc += o[k];
    if(roll < acc){ outcome = k; break; }
  }

  const allKeys = Object.keys(PATHWAYS);
  const known = allKeys.filter(k=>STATE.pathway.knowledge[k] > 0);
  const pickKey = ()=> (known.length && chance(0.6)) ? pick(known) : pick(allKeys);

  if(outcome === 'success'){
    const key = pickKey();
    const [gMin,gMax] = RESEARCH_KNOWLEDGE_GAIN[m.id];
    applyEffects({knowledge:{[key]: rndInt(gMin,gMax)}});
    addRumor(key, true);
    logJournal('Investigación', `${m.name}. Encontrás algo real: un rastro que apunta con bastante claridad hacia una vía concreta.`);
    toast('Encontraste información real.', 'pos');
  } else if(outcome === 'secret'){
    const dangerous = (m.id==='contact' || m.id==='mystic') ? chance(0.55) : chance(0.2);
    learnSecret(pick(SECRET_POOL), dangerous);
  } else if(outcome === 'falseLead'){
    addRumor(pick(allKeys), false);
    logJournal('Investigación', `${m.name}. Conseguís algo que parece prometedor — pero no tenés forma de confirmar si es real.`);
    toast('Conseguiste una pista, sin poder confirmarla.', null);
  } else {
    logJournal('Investigación', `${m.name}. No sacás nada en limpio esta vez.`);
    toast('No encontraste nada de interés.', null);
  }
  saveGame(true);
  checkDeathAndCrisis();
  renderAll();
}

function renderResearchPanel(){
  const canPay = (m)=> STATE.character.cash >= m.cost;
  return `
    <div class="sec-title">Investigación mística</div>
    <p class="small-note">Investigaciones disponibles esta temporada: ${actionsLeft('research')}/${SEASON_ACTION_LIMITS.research}</p>
    <div class="pathway-card">
      ${RESEARCH_METHODS.map(m=>{
        const tooYoung = STATE.character.edad < m.ageMin;
        const disabled = tooYoung || !canUseSeasonAction('research') || !canPay(m) || STATE.pendingEvent || STATE.pendingMission || STATE.combat;
        return `<button class="btn btn-block" style="margin-bottom:8px;" data-research="${m.id}" ${disabled?'disabled':''}>${m.name}${m.cost?` (£${m.cost})`:''} <small style="opacity:.6;">Riesgo: ${m.riskLabel}${tooYoung?' — desde los '+m.ageMin+' años':''}</small></button>`;
      }).join('')}
    </div>
    ${STATE.pathway.rumors.length ? `
      <div class="sec-title">Rumores sin confirmar</div>
      <div class="card"><p class="small-note">No tenés forma de saber, sólo mirando esta lista, cuáles de estos rumores son ciertos.</p>
        ${STATE.pathway.rumors.slice(-6).reverse().map(r=>`<div class="intro-summary-line"><span>Algo relacionado con ${PATHWAYS[r.key] ? PATHWAYS[r.key].name : r.key}</span><span style="opacity:.6;">Año ${r.year}</span></div>`).join('')}
      </div>` : ''}
    ${STATE.character.secrets.length ? `
      <div class="sec-title">Secretos que cargás</div>
      <div class="card">
        ${STATE.character.secrets.slice(-5).reverse().map(s=>`<p class="small-note" style="${s.dangerous?'color:var(--crimson-bright,#b4544f);':''}">${s.text}</p>`).join('')}
      </div>` : ''}
  `;
}
function bindResearchPanel(){
  document.querySelectorAll('[data-research]').forEach(b=>{
    b.onclick = ()=> doResearch(b.dataset.research);
  });
}

function investigateNPC(id){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat) return;
  if(STATE.character.edad < 13){ toast('Todavía sos muy chico para investigar por tu cuenta.', 'neg'); return; }
  if(!canUseSeasonAction('investigate')){ toast('Ya usaste tus investigaciones de esta temporada.', 'neg'); return; }
  const npc = STATE.npcs.find(n=>n.id===id);
  const c = STATE.character;
  const cost = 30;
  if(c.cash < cost){ toast('No tenés suficiente dinero para investigar.', 'neg'); return; }
  useSeasonAction('investigate');
  applyEffects({cash:-cost});
  // Pasar tiempo con alguien no sólo sube la confianza: también el cariño y,
  // de a poco, cuánto te respeta. Si sos un Beyonder ya metido en el mundo
  // oculto, husmear demasiado también puede levantar sospechas (ver §11/§17).
  adjustRel(npc, {trust:rndInt(2,6), affection:rndInt(1,4), respect:rndInt(0,3)});
  if(STATE.flags.mysticExposure >= 25 && chance(0.25)) adjustRel(npc, {suspicion:rndInt(2,6)});
  const roll = Math.random();
  let revealed = false;
  if(npc.hidden.pathway && !npc.known.pathway && roll < 0.35 + npc.trust/300){
    npc.known.pathway = true; revealed = true;
  } else if(npc.hidden.faction && !npc.known.faction && roll < 0.3 + npc.trust/300){
    npc.known.faction = true; revealed = true;
  } else if(npc.hidden.sequence && npc.known.pathway && !npc.known.sequence && roll < 0.25){
    npc.known.sequence = true; revealed = true;
  }
  if(revealed){
    logJournal('Investigación', `Descubrís algo nuevo sobre ${npc.name}.`);
    toast('Descubriste nueva información sobre ' + npc.name, 'pos');
    if(npc.hidden.faction === 'tarotClub' && npc.known.faction){
      STATE.factions.tarotClub.discovered = true;
      STATE.factions.tarotClub.known = true;
      logJournal('Tarot Club', `A través de ${npc.name}, confirmás la existencia real del Tarot Club. Muy pocos saben esto.`);
    }
  } else {
    logJournal('Investigación', `Pasás tiempo con ${npc.name}, sin descubrir nada concluyente aún.`);
    toast('No descubriste nada nuevo esta vez.', null);
  }
  saveGame(true);
  renderAll();
}

/* ---------------------------------------------------------------------
   VIDA PERSONAL (spec §23: casarse, tener hijos, comprar una casa — parte
   de la "vida mundana" que el spec pide que sea sustancial, no un trámite).
   Usa el mismo cupo por temporada que el resto de Actividades (SEASON_ACTION_LIMITS.personal),
   compartido entre las 3 acciones de pareja/hijos para que no se puedan encadenar
   las tres en el mismo mes. Comprar una vivienda es aparte: no consume cupo de
   temporada, es un hito económico único, gateado sólo por plata.
   La pareja envejece con la curva humana (ver checkNpcMortality): puede morir
   de vieja y dejar al personaje Viudo/a, que puede volver a buscar pareja.
--------------------------------------------------------------------- */
function currentPartnerNpc(){
  return STATE.npcs.find(n=>(n.id==='pareja' || n.id==='conyuge') && n.alive);
}

function buscarPareja(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const c = STATE.character;
  if(c.edad < 18){ toast('Todavía sos muy chico para esto.', 'neg'); return; }
  if(currentPartnerNpc()){ toast('Ya estás en una relación.', 'neg'); return; }
  if(!canUseSeasonAction('personal')){ toast('Ya usaste tu acción de vida personal de esta temporada.', 'neg'); return; }
  useSeasonAction('personal');
  const chanceOfMeeting = clamp(0.35 + c.reputation/200, 0.15, 0.6);
  if(chance(chanceOfMeeting)){
    const isMale = chance(0.5);
    const name = pick(isMale ? FAMILY_MALE_NAMES : FAMILY_FEMALE_NAMES) + ' ' + pick(NEIGHBOR_SURNAMES);
    STATE.npcs.push({
      // ageOffset chico (±10): alguien de una generación parecida. Ver checkNpcMortality.
      id:'pareja', name, role:'Pareja', ageOffset:rndInt(-10,10), trust:rndInt(30,55), suspicion:0,
      known:{pathway:false,sequence:false,faction:false}, alive:true,
      hidden:{pathway:null,sequence:null,faction:null}
    });
    applyEffects({sanity:rndInt(2,5)});
    logJournal('Un encuentro', `Conocés a ${name}. Hay algo ahí que te dan ganas de seguir explorando.`);
    toast('Empezaste una relación con ' + name + '.', 'pos');
  } else {
    logJournal('Vida personal', 'Salís, conocés gente, pero nadie termina de convencerte esta vez.');
    toast('No conociste a nadie que te interesara esta temporada.', null);
  }
  saveGame(true);
  renderAll();
}

function proponerMatrimonio(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const npc = currentPartnerNpc();
  if(!npc || npc.id!=='pareja'){ toast('No tenés a quién proponerle matrimonio.', 'neg'); return; }
  if(!canUseSeasonAction('personal')){ toast('Ya usaste tu acción de vida personal de esta temporada.', 'neg'); return; }
  const c = STATE.character;
  const weddingCost = {Baja:400, Media:1200, Alta:4000}[c.clase] || 800;
  if(c.cash+c.bank < weddingCost){ toast(`Necesitás al menos ${fmtMoney(weddingCost)} entre efectivo y banco para una boda modesta.`, 'neg'); return; }
  useSeasonAction('personal');
  const successChance = clamp(0.25 + npc.trust/130, 0.1, 0.9);
  if(chance(successChance)){
    npc.id = 'conyuge';
    npc.role = 'Cónyuge';
    npc.trust = clamp(npc.trust+10, 0, 100);
    if(c.cash >= weddingCost) applyEffects({cash:-weddingCost}); else applyEffects({bank:-weddingCost});
    c.estadoCivil = 'Casado/a';
    applyEffects({reputation:rndInt(3,8), sanity:rndInt(4,9)});
    logJournal('Boda', `${c.nombre} ${c.apellido} se casa con ${npc.name}. Una boda modesta, pero real.`);
    toast('¡Te casaste con ' + npc.name + '!', 'pos');
    addMilestone('family', `Se casa con ${npc.name}`);
  } else {
    npc.trust = clamp(npc.trust-15, 0, 100);
    applyEffects({sanity:-rndInt(3,7)});
    logJournal('Una propuesta rechazada', `Le proponés matrimonio a ${npc.name}. La respuesta es no — todavía no, al menos.`);
    toast(npc.name + ' rechazó tu propuesta.', 'neg');
    if(chance(0.2)){
      STATE.npcs = STATE.npcs.filter(n=>n!==npc);
      logJournal('Ruptura', `Después del rechazo, la relación con ${npc.name} no sobrevive. Se separan.`);
      toast('La relación terminó.', 'neg');
    }
  }
  saveGame(true);
  renderAll();
}

function intentarTenerHijo(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const c = STATE.character;
  if(c.estadoCivil !== 'Casado/a'){ toast('Necesitás estar casado/a para esto.', 'neg'); return; }
  if(!canUseSeasonAction('personal')){ toast('Ya usaste tu acción de vida personal de esta temporada.', 'neg'); return; }
  useSeasonAction('personal');
  if(chance(0.55)){
    const isMale = chance(0.5);
    const name = pick(isMale ? FAMILY_MALE_NAMES : FAMILY_FEMALE_NAMES) + ' ' + c.apellido;
    const n = STATE.npcs.filter(x=>x.id.startsWith('hijo')).length;
    STATE.npcs.push({
      // Nace hoy: su edad es la del personaje menos la que el personaje tiene ahora.
      id:'hijo'+(n+1), name, role: isMale?'Hijo':'Hija', ageOffset:-c.edad, trust:rndInt(60,85), suspicion:0,
      known:{pathway:false,sequence:false,faction:false}, alive:true,
      hidden:{pathway:null,sequence:null,faction:null}
    });
    applyEffects({sanity:rndInt(3,8), reputation:rndInt(1,4)});
    logJournal('Un nacimiento', `${name} nace. La vida de ${c.nombre} ${c.apellido} ya no es la misma.`);
    toast('¡Tuviste un hijo/a: ' + name + '!', 'pos');
    addMilestone('family', `Nace ${name}`);
  } else {
    logJournal('Vida personal', 'Lo intentan, pero por ahora no llega.');
    toast('No hubo suerte esta temporada.', null);
  }
  saveGame(true);
  renderAll();
}

function comprarVivienda(){
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat || STATE.gameOver) return;
  const c = STATE.character;
  if(c.edad < 18){ toast('Todavía sos muy chico para esto.', 'neg'); return; }
  if(c.vivienda){ toast('Ya tenés una vivienda propia.', 'neg'); return; }
  const costByClass = {Baja:[8000,15000], Media:[15000,35000], Alta:[40000,90000]};
  const [vMin,vMax] = costByClass[c.clase] || costByClass.Media;
  const cost = rndInt(vMin,vMax);
  if(c.cash+c.bank < cost){ toast(`Te faltaría dinero: una vivienda por tu zona ronda ${fmtMoney(cost)}.`, 'neg'); return; }
  if(c.cash >= cost) applyEffects({cash:-cost}); else { applyEffects({cash:-c.cash, bank:-(cost-c.cash)}); }
  c.vivienda = {tipo: c.clase==='Alta' ? 'Casa' : (c.clase==='Media' ? 'Departamento' : 'Habitación propia'), valor:cost};
  applyEffects({reputation:rndInt(2,6), sanity:rndInt(3,6)});
  logJournal('Vivienda propia', `${c.nombre} ${c.apellido} compra ${c.vivienda.tipo.toLowerCase()} propio por ${fmtMoney(cost)}. Un lugar al que volver.`);
  toast('¡Ahora tenés una vivienda propia!', 'pos');
  addMilestone('family', `Compra ${c.vivienda.tipo.toLowerCase()} propia`);
  saveGame(true);
  renderAll();
}

function renderPersonalTab(){
  const c = STATE.character;
  const pareja = STATE.npcs.find(n=>n.id==='pareja' && n.alive);
  const conyuge = STATE.npcs.find(n=>n.id==='conyuge' && n.alive);
  const hijos = STATE.npcs.filter(n=>n.id.startsWith('hijo') && n.alive);
  let html = `<div class="sec-title">Vida Personal</div>`;
  html += `<div class="card">
    <div class="intro-summary-line"><span>Estado civil</span><span>${c.estadoCivil}</span></div>
    <div class="intro-summary-line"><span>Vivienda</span><span>${c.vivienda ? c.vivienda.tipo+' propia' : 'Sin vivienda propia'}</span></div>
    ${hijos.length ? `<div class="intro-summary-line"><span>Hijos/as</span><span>${hijos.length}</span></div>` : ''}
  </div>`;

  if(c.edad < 18){
    html += `<p class="small-note" style="margin-top:12px;">Todavía sos muy chico para esto — vas a poder desde los 18 años.</p>`;
    return html;
  }

  html += `<div class="sec-title">Pareja</div>`;
  if(conyuge){
    html += `<p class="small-note">Estás en pareja con ${conyuge.name} (confianza ${conyuge.trust}). Podés seguir "Investigando" en Relaciones para acercarte más.</p>`;
  } else if(pareja){
    html += `<p class="small-note">Estás saliendo con ${pareja.name} (confianza ${pareja.trust}). Investigala en Relaciones para ganar confianza antes de proponerle matrimonio.</p>`;
    html += `<button class="btn btn-primary btn-block" data-personal="proponer" style="margin-top:8px;" ${(pareja.trust<60||!canUseSeasonAction('personal'))?'disabled':''}>Proponer matrimonio</button>`;
    if(pareja.trust<60) html += `<p class="small-note">Necesitás al menos 60 de confianza para proponerle matrimonio.</p>`;
  } else {
    html += `<p class="small-note">No estás en ninguna relación por ahora.</p>`;
    html += `<button class="btn btn-primary btn-block" data-personal="buscar" style="margin-top:8px;" ${!canUseSeasonAction('personal')?'disabled':''}>Buscar pareja</button>`;
  }

  if(c.estadoCivil==='Casado/a' || hijos.length){
    html += `<div class="sec-title">Familia</div>`;
    if(c.estadoCivil==='Casado/a') html += `<button class="btn btn-primary btn-block" data-personal="hijo" ${!canUseSeasonAction('personal')?'disabled':''}>Intentar tener un hijo/a</button>`;
    if(hijos.length){
      html += hijos.map(h=>`<p class="small-note">${h.name} — ${h.role}${h.ageOffset!==undefined ? `, ${c.edad+h.ageOffset} años` : ''} (confianza ${h.trust})</p>`).join('');
    }
  }

  html += `<div class="sec-title">Vivienda</div>`;
  if(c.vivienda){
    html += `<p class="small-note">Tenés ${c.vivienda.tipo.toLowerCase()} propia, valuada en ${fmtMoney(c.vivienda.valor)}.</p>`;
  } else {
    html += `<button class="btn btn-block" data-personal="vivienda">Comprar una vivienda propia</button>`;
    html += `<p class="small-note">El costo depende de tu clase social y no usa el cupo de la temporada — sólo hace falta el dinero.</p>`;
  }

  html += `<p class="small-note" style="margin-top:10px;">Acciones de vida personal disponibles esta temporada: ${actionsLeft('personal')}/${SEASON_ACTION_LIMITS.personal}</p>`;
  return html;
}
function bindPersonalTab(){
  const btnBuscar = document.querySelector('[data-personal="buscar"]');
  if(btnBuscar) btnBuscar.onclick = buscarPareja;
  const btnProponer = document.querySelector('[data-personal="proponer"]');
  if(btnProponer) btnProponer.onclick = proponerMatrimonio;
  const btnHijo = document.querySelector('[data-personal="hijo"]');
  if(btnHijo) btnHijo.onclick = intentarTenerHijo;
  const btnVivienda = document.querySelector('[data-personal="vivienda"]');
  if(btnVivienda) btnVivienda.onclick = comprarVivienda;
}

/* ---------------------------------------------------------------------
   GUARDADO
--------------------------------------------------------------------- */
function saveGame(silent){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
    if(!silent) toast('Partida guardada.', 'pos');
  }catch(e){ if(!silent) toast('No se pudo guardar la partida.', 'neg'); }
}
/* ---------------------------------------------------------------------
   MIGRACIÓN DE PARTIDAS (rework v3 §48)
   Antes, cualquier cambio de SAVE_VERSION tiraba la partida vieja a la basura
   sin más. Ahora se intenta actualizarla: se agregan los campos nuevos con
   valores por defecto y se conserva todo lo que el jugador ya había vivido.
   Sólo se descarta si la partida es tan vieja que no se puede reconstruir.
--------------------------------------------------------------------- */
function migrateSave(data){
  if(!data || typeof data !== 'object') return null;
  const v = data.version || 0;
  if(v > SAVE_VERSION) return null; // de una versión futura: no sabemos leerla
  if(v < 6) return null;            // demasiado vieja para reconstruirla con garantías

  // v6 -> v7: memoria del personaje y consecuencias retrasadas (rework v3 §7 y §8).
  if(v < 7){
    if(data.character && !Array.isArray(data.character.memory)) data.character.memory = [];
    if(!Array.isArray(data.pendingConsequences)) data.pendingConsequences = [];
    data.version = 7;
  }

  // Red de seguridad: cualquier clave de Pathway agregada después de que se
  // guardó esta partida se completa en 0/false, para que un save viejo no
  // explote al tocar una vía que en su momento no existía.
  if(data.pathway){
    Object.keys(PATHWAYS).forEach(k=>{
      if(data.pathway.knowledge && data.pathway.knowledge[k] === undefined) data.pathway.knowledge[k] = 0;
      if(data.pathway.formulaKnown && data.pathway.formulaKnown[k] === undefined) data.pathway.formulaKnown[k] = false;
      if(data.pathway.firstDiscoveryShown && data.pathway.firstDiscoveryShown[k] === undefined) data.pathway.firstDiscoveryShown[k] = false;
    });
  }
  if(data.seasonActions && data.seasonActions.personal === undefined) data.seasonActions.personal = 0;
  if(data.character && data.character.estadoCivil === undefined) data.character.estadoCivil = 'Soltero/a';
  if(data.character && data.character.vivienda === undefined) data.character.vivienda = null;
  if(data.character && !Array.isArray(data.character.secrets)) data.character.secrets = [];
  if(data.character && !Array.isArray(data.character.actingHistory)) data.character.actingHistory = [];
  if(data.pathway && !Array.isArray(data.pathway.rumors)) data.pathway.rumors = [];
  if(data.seasonActions && data.seasonActions.research === undefined) data.seasonActions.research = 0;
  // Hitos para la línea de tiempo del epílogo (campo aditivo). Una partida que ya
  // venía jugándose los reconstruye como puede desde el journal: lo que ya se
  // recortó por el tope de 400 entradas no vuelve, pero lo reciente sí aparece.
  if(!Array.isArray(data.milestones)){
    const kindByTitle = {'El comienzo':'birth', 'PRIMERA POCIÓN':'potion', 'ADVANCEMENT RITUAL — ÉXITO':'advance', 'Boda':'family', 'Un nacimiento':'family', 'Vivienda propia':'family', 'Una pérdida':'loss'};
    data.milestones = (data.journal||[]).slice().reverse()
      .filter(e=>kindByTitle[e.title])
      .map(e=>({kind:kindByTitle[e.title], text:e.title==='El comienzo' ? 'Nace' : e.title.charAt(0)+e.title.slice(1).toLowerCase(), edad:Math.max(0,(e.year||1)-1), year:e.year}));
  }
  // v7: mundo vivo (rework v3 §29). Una partida vieja arranca con el mundo en
  // su estado neutro y empieza a moverse a partir de ahí.
  if(!data.world){
    data.world = { prosperity:55, security:60, attention:0,
      factionMood:{ church:'normal', nighthawks:'normal', tarotClub:'normal' }, log:[] };
  } else {
    if(data.world.prosperity === undefined) data.world.prosperity = 55;
    if(data.world.security === undefined) data.world.security = 60;
    if(data.world.attention === undefined) data.world.attention = 0;
    if(!data.world.factionMood) data.world.factionMood = { church:'normal', nighthawks:'normal', tarotClub:'normal' };
    if(!Array.isArray(data.world.log)) data.world.log = [];
  }
  // v7: ejes de relación y vida propia de los NPCs (rework v3 §9/§11). Se
  // completan con ensureNpcLife, que deriva los valores nuevos de la confianza
  // que ya tenía cada vínculo — una partida vieja no se despierta con todos
  // los NPCs en cero ni sin categoría asignada.
  if(Array.isArray(data.npcs)){
    const prevState = typeof STATE !== 'undefined' ? STATE : null;
    STATE = data; // ensureNpcLife/ensureRel leen de STATE para los defaults
    try{ data.npcs.forEach(n=>ensureNpcLife(n)); }
    finally { if(prevState) STATE = prevState; }
  }

  data.version = SAVE_VERSION;
  return data;
}

function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return false;
  try{
    const data = migrateSave(JSON.parse(raw));
    if(!data) return false;
    STATE = data;
    return true;
  }catch(e){ return false; }
}
function deleteSave(){
  localStorage.removeItem(SAVE_KEY);
  STATE = freshState();
  toast('Partida borrada.', null);
}
function exportSave(){
  const blob = new Blob([JSON.stringify(STATE,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'lotm_life_save.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Partida exportada como archivo .json.', 'pos');
}
// Importa una partida desde un archivo .json exportado con exportSave(). Valida
// estructura mínima y SAVE_VERSION antes de reemplazar STATE, para no dejar el
// juego en un estado corrupto si el archivo es viejo o no corresponde a este juego.
function importSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    let data;
    try{ data = JSON.parse(ev.target.result); }
    catch(e){ toast('El archivo no es un JSON válido.', 'neg'); return; }
    if(!data || typeof data!=='object' || !data.character || !data.pathway || !data.time){
      toast('El archivo no corresponde a una partida de este juego.', 'neg');
      return;
    }
    // Igual que loadGame: en vez de rechazar cualquier versión distinta, se
    // intenta migrar la partida (ver migrateSave). Sólo se rechaza si es
    // irrecuperable — demasiado vieja o de una versión futura.
    const migrated = migrateSave(data);
    if(!migrated){
      toast('La partida es de una versión que no se puede actualizar.', 'neg');
      return;
    }
    STATE = migrated;
    saveGame(true);
    document.getElementById('screen-intro').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    if(STATE.gameOver){ renderEndScreen(); } else { renderAll(); }
    toast('Partida importada correctamente.', 'pos');
  };
  reader.onerror = ()=> toast('No se pudo leer el archivo.', 'neg');
  reader.readAsText(file);
}

/* ---------------------------------------------------------------------
   RENDER — TOPBAR
--------------------------------------------------------------------- */
function statBarColor(key,val){
  if(key==='corruption') return val>60?'var(--corrupt-col)': val>30?'var(--gold)':'var(--corrupt-col)';
  if(key==='sanity') return val<25?'var(--danger)': 'var(--sanity-col)';
  if(key==='salud') return val<25?'var(--danger)':'var(--success)';
  return 'var(--gold)';
}

function renderTopbar(){
  const c = STATE.character;
  const p = STATE.pathway;
  const tb = document.getElementById('topbar');
  const badge = p.chosenPathway
    ? `<span class="tb-pathway-badge">${PATHWAYS[p.chosenPathway].name} · Sequence ${p.sequence}</span>`
    : `<span class="tb-pathway-badge" style="color:var(--ink-faint); border-color:var(--line);">Estado Beyonder: Ninguno</span>`;
  tb.innerHTML = `
    <div class="topbar-row1">
      <div class="tb-name">${c.nombre} ${c.apellido}</div>
      <div class="tb-meta">${c.edad} años · Año ${STATE.time.year}, Mes ${STATE.time.month} · ${c.ciudad}</div>
    </div>
    <div class="tb-stats">
      <div class="stat-chip">💰 <b>${fmtMoney(c.cash)}</b></div>
      <div class="stat-chip">❤ <div class="stat-bar-mini"><div style="width:${c.salud}%; background:${statBarColor('salud',c.salud)};"></div></div></div>
      <div class="stat-chip">✦ <div class="stat-bar-mini"><div style="width:${c.sanity}%; background:${statBarColor('sanity',c.sanity)};"></div></div></div>
      <div class="stat-chip">☠ <div class="stat-bar-mini"><div style="width:${c.corruption}%; background:${statBarColor('corruption',c.corruption)};"></div></div></div>
      ${badge}
    </div>
  `;
  // El subnav de Actividades (.activity-subnav) es sticky justo debajo del topbar,
  // pero el alto del topbar cambia según cuánto texto/badges entren en una línea
  // (nombre largo, muchos stats, etc.) — se mide acá, en cada render, y se expone
  // como variable CSS para que el sticky no quede tapado ni deje un hueco.
  document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
}

/* ---------------------------------------------------------------------
   RENDER — TABS
--------------------------------------------------------------------- */
// El Journal ya no es una pestaña aparte: su contenido vive directamente en la
// pestaña "Vida", debajo del botón de Avanzar, para que lo que pasa en la
// partida se vea en la misma pantalla donde se genera (ver renderLifeTab).
// Mysticism, Relaciones y Facciones tampoco son pestañas propias: viven juntas
// dentro de "Actividades" como sub-secciones (ver ACTIVITY_SECTIONS más abajo),
// que es donde en el futuro se van a sumar Trabajo, Exploración, etc.
const TABS = [
  {id:'life', label:'Vida', ic:'⌛'},
  {id:'activities', label:'Actividades', ic:'⚙'},
  {id:'inventory', label:'Inventario', ic:'⚱'},
];
let activeTab = 'life';

// Sub-navegación interna de la pestaña Actividades. Trabajo y Exploración se suman
// acá mismo; el próximo punto de extensión es este array, no la barra principal.
const ACTIVITY_SECTIONS = [
  {id:'pathway', label:'Misticismo'},
  {id:'npcs', label:'Relaciones'},
  {id:'personal', label:'Vida Personal'},
  {id:'factions', label:'Facciones'},
  {id:'work', label:'Trabajo'},
  {id:'exploration', label:'Exploración'},
  {id:'missions', label:'Misiones'},
];
let activeActivity = 'pathway';

function renderTabbar(){
  const el = document.getElementById('tabbar');
  el.innerHTML = TABS.map(t=>`<button class="tab-btn ${activeTab===t.id?'active':''}" data-tab="${t.id}"><span class="ic">${t.ic}</span>${t.label}</button>`).join('');
  el.querySelectorAll('.tab-btn').forEach(b=>{
    b.onclick = ()=>{ activeTab = b.dataset.tab; renderAll(); };
  });
}

function renderActivitiesTab(){
  let html = `<div class="activity-subnav">${ACTIVITY_SECTIONS.map(s=>`<button class="subtab-btn ${activeActivity===s.id?'active':''}" data-activity="${s.id}">${s.label}</button>`).join('')}</div>`;
  switch(activeActivity){
    case 'pathway': html += renderPathwayTab(); break;
    case 'npcs': html += renderNpcsTab(); break;
    case 'personal': html += renderPersonalTab(); break;
    case 'factions': html += renderFactionsTab(); break;
    case 'work': html += renderWorkTab(); break;
    case 'exploration': html += renderExplorationTab(); break;
    case 'missions': html += renderMissionsTab(); break;
  }
  return html;
}
function bindActivitiesTab(){
  document.querySelectorAll('[data-activity]').forEach(b=>{
    b.onclick = ()=>{ activeActivity = b.dataset.activity; renderAll(); };
  });
  switch(activeActivity){
    case 'pathway': bindPathwayTab(); break;
    case 'npcs': bindNpcsTab(); break;
    case 'personal': bindPersonalTab(); break;
    case 'work': bindWorkTab(); break;
    case 'exploration': bindExplorationTab(); break;
    case 'missions': bindMissionsTab(); break;
    // 'factions' todavía no tiene elementos interactivos propios.
  }
}

function renderContent(){
  const el = document.getElementById('content');
  if(STATE.combat){
    el.innerHTML = renderCombat();
    bindCombatHandlers();
    return;
  }
  if(STATE.pendingMission){
    el.innerHTML = renderPendingMission();
    bindPendingMissionHandlers();
    return;
  }
  if(STATE.pendingEvent){
    el.innerHTML = renderPendingEvent();
    bindPendingEventHandlers();
    return;
  }
  switch(activeTab){
    case 'life': el.innerHTML = renderLifeTab(); bindLifeTab(); break;
    case 'activities': el.innerHTML = renderActivitiesTab(); bindActivitiesTab(); break;
    case 'inventory': el.innerHTML = renderInventoryTab(); bindInventoryTab(); break;
  }
}

function renderCombat(){
  const combat = STATE.combat;
  const e = combat.enemy;
  const c = STATE.character;
  const hasItems = STATE.inventory.combatItems && STATE.inventory.combatItems.length;
  const abilityDisabled = !canUseAbility();
  const seqLine = e.tier==='mystic'
    ? `<p class="small-note">Sequence: ${
        combat.seqRevealStage===0 ? '???'
        : e.seq==null ? 'Imposible de determinar — no es un Beyonder convencional'
        : combat.seqRevealStage>=2 ? e.seq
        : ('estimada entre '+combat.seqEstimateRange[0]+' y '+combat.seqEstimateRange[1])
      }</p>`
    : '';
  const threat = combatThreat();
  const threatCls = ['threat-even','threat-danger','threat-lethal'][threat.level];
  const canStudy = e.tier==='mystic' && (combat.seqRevealStage||0) < 2;
  return `
    <div class="evt-card combat-card ${threatCls}">
      <div class="evt-date">Año ${STATE.time.year}, Mes ${STATE.time.month}</div>
      <div class="combat-head">
        <div class="evt-title">${e.name}</div>
        <span class="threat-badge" title="${threat.note}">${threat.level===2?'⚠ ':''}${threat.label}</span>
      </div>
      <div class="evt-text">${e.desc}</div>
      ${seqLine}
      <p class="small-note threat-note">${threat.note}${(e.tier==='mystic' && !threat.seqKnown && e.seq!=null) ? ' Todavía no sabés qué es en realidad.' : ''}</p>
      <div class="stat-full-row" style="margin-top:10px;"><div class="lbl">Vos</div><div class="bar"><div style="width:${c.salud}%; background:${statBarColor('salud',c.salud)};"></div></div><div class="val">${c.salud}</div></div>
      <div class="stat-full-row"><div class="lbl">${e.name}</div><div class="bar"><div style="width:${Math.max(0,Math.round(e.currentHp/e.maxHp*100))}%; background:var(--danger);"></div></div><div class="val">${Math.max(0,e.currentHp)}/${e.maxHp}</div></div>
      <div class="evt-choices" style="margin-top:12px;">
        <button class="choice-btn" data-combat="attack">Atacar</button>
        <button class="choice-btn" data-combat="defend">Defenderse<small>Reduce a la mitad el daño que recibís este turno</small></button>
        <button class="choice-btn" data-combat="ability" ${abilityDisabled?'disabled style="opacity:.45;"':''}>${abilityLabel()}<small>${abilityNote()}</small></button>
        ${canStudy ? `<button class="choice-btn" data-combat="study">Estudiar al rival<small>Perdés el turno sin atacar, pero descubrís su Sequence exacta ya mismo</small></button>` : ''}
        <button class="choice-btn" data-combat="item" ${hasItems?'':'disabled style="opacity:.45;"'}>Usar objeto<small>${hasItems?'':'No tenés objetos utilizables'}</small></button>
        <button class="choice-btn" data-combat="escape">Huir<small>No siempre funciona, pero es una salida válida</small></button>
      </div>
    </div>
    <div class="sec-title" style="margin-top:14px;">Registro del combate</div>
    <div class="card" style="max-height:220px; overflow-y:auto;">
      ${combat.log.length ? combat.log.slice().reverse().map(l=>`<p class="small-note" style="margin:4px 0;">${l}</p>`).join('') : '<p class="small-note">El encuentro recién empieza.</p>'}
    </div>
  `;
}
function bindCombatHandlers(){
  document.querySelectorAll('[data-combat]').forEach(b=>{
    if(b.disabled) return;
    b.onclick = ()=> combatAction(b.dataset.combat);
  });
}

function renderPendingEvent(){
  const pe = STATE.pendingEvent;
  const pasos = pe.kind==='ritual' ? `<div class="evt-date" style="margin-top:-4px;">Paso ${pe.step+1} de ${pe.totalSteps}</div>` : '';
  return `
    <div class="evt-card">
      <div class="evt-date">Año ${STATE.time.year}, Mes ${STATE.time.month}</div>
      ${pasos}
      <div class="evt-title">${pe.title}</div>
      <div class="evt-text">${pe.text}</div>
      <div class="evt-choices">
        ${pe.choices.map(ch=>`<button class="choice-btn" data-idx="${ch.idx}">${ch.label}${ch.small?`<small>${ch.small}</small>`:''}</button>`).join('')}
      </div>
    </div>
  `;
}
function bindPendingEventHandlers(){
  document.querySelectorAll('.choice-btn[data-idx]').forEach(b=>{
    b.onclick = ()=>{
      const idx = parseInt(b.dataset.idx);
      // Tres tipos de evento comparten esta misma UI de opciones: el Acting Method,
      // las decisiones con consecuencias ocultas (DECISION_EVENTS) y el ritual de
      // Advancement, que es el único de varios pasos (ver resolveRitualChoice).
      if(!STATE.pendingEvent) return;
      if(STATE.pendingEvent.kind === 'decision') resolveDecisionChoice(idx);
      else if(STATE.pendingEvent.kind === 'ritual') resolveRitualChoice(idx);
      else resolveActingChoice(idx);
    };
  });
}

function renderPendingMission(){
  const pm = STATE.pendingMission;
  return `
    <div class="evt-card">
      <div class="evt-date">Año ${STATE.time.year}, Mes ${STATE.time.month}</div>
      <div class="pathway-stage" style="display:inline-block; margin-bottom:6px;">${MISSION_TYPE_LABEL[pm.type] || pm.type}</div>
      <div class="evt-title">${pm.title}</div>
      <div class="evt-text">${pm.text}</div>
      <div class="evt-choices" style="margin-top:12px;">
        ${pm.choices.map(c=>`<button class="choice-btn" data-mission-choice="${c.idx}">${c.label}${c.small?`<small>${c.small}</small>`:''}</button>`).join('')}
      </div>
    </div>
  `;
}
function bindPendingMissionHandlers(){
  document.querySelectorAll('[data-mission-choice]').forEach(b=>{
    b.onclick = ()=> resolveMissionChoice(parseInt(b.dataset.missionChoice,10));
  });
}

// "De un vistazo": un atajo visual en la pestaña Vida con lo más relevante del
// momento — etapa de la vida, cómo va tu vía y qué acciones de la temporada te
// quedan — sin tener que recorrer cada sub-pestaña de Actividades. No duplica
// los paneles: cada chip es corto y, al tocarlo, lleva a la sección que corresponde.
function lifeStageLabel(edad){
  if(edad < 13) return 'Infancia';
  if(edad < 18) return 'Adolescencia';
  if(edad < 30) return 'Juventud';
  if(edad < 50) return 'Adultez';
  if(edad < 65) return 'Madurez';
  return 'Vejez';
}
function renderGlanceDashboard(){
  const c = STATE.character;
  const p = STATE.pathway;
  const chips = [];
  chips.push(`<span class="glance-chip">${lifeStageLabel(c.edad)}</span>`);
  if(p.chosenPathway){
    const pw = PATHWAYS[p.chosenPathway];
    const sd = currentSeqData();
    chips.push(`<button class="glance-chip glance-gold" data-goto="pathway">${pw.name} · Sequence ${p.sequence} — ${sd.name}</button>`);
    if(p.sequence > 0){
      const reqs = advancementRequirements();
      const faltan = reqs.filter(r=>!r.ok).length;
      const next = p.digestion < 100 ? `Digestión ${Math.round(p.digestion)}%`
        : faltan ? `Ritual: faltan ${faltan} requisito${faltan===1?'':'s'}` : 'Listo para el ritual';
      chips.push(`<button class="glance-chip ${faltan===0?'glance-ready':''}" data-goto="pathway">${next}</button>`);
    }
  } else {
    const keys = Object.keys(p.knowledge).filter(k=>p.knowledge[k]>0);
    if(keys.length){
      const best = keys.reduce((a,b)=>p.knowledge[b]>p.knowledge[a]?b:a);
      const ready = p.knowledge[best] >= 50 && !firstPotionRequirements(best).some(r=>!r.ok);
      chips.push(`<button class="glance-chip glance-violet" data-goto="pathway">${ready ? 'Primera poción al alcance: '+PATHWAYS[best].name : 'Vía más cercana: '+PATHWAYS[best].name+' '+p.knowledge[best]+'%'}</button>`);
    }
  }
  // Sólo las acciones que la edad ya habilita, para no llenar la infancia de chips grises.
  const acts = [
    {key:'research', label:'Investigar', min:13, goto:'pathway'},
    {key:'acting', label:'Acting', min:0, goto:'pathway', need:()=>!!p.chosenPathway},
    {key:'work', label:'Trabajo extra', min:14, goto:'work'},
    {key:'explore', label:'Explorar', min:13, goto:'exploration'},
    {key:'missions', label:'Misiones', min:14, goto:'missions'},
  ].filter(a=>c.edad>=a.min && (!a.need || a.need()));
  const actChips = acts.map(a=>{
    const left = actionsLeft(a.key);
    return `<button class="glance-chip ${left>0?'':'glance-spent'}" data-goto="${a.goto}">${a.label} ${left}/${SEASON_ACTION_LIMITS[a.key]}</button>`;
  }).join('');
  return `
    <div class="glance">
      <div class="glance-row">${chips.join('')}</div>
      ${actChips ? `<div class="glance-row"><span class="glance-lbl">Esta temporada</span>${actChips}</div>` : ''}
    </div>
  `;
}

function renderLifeTab(){
  const c = STATE.character;
  return `
    ${renderGlanceDashboard()}
    <div class="sec-title">Estado del personaje</div>
    <div class="card">
      <div class="stat-full-row"><div class="lbl">Salud</div><div class="bar"><div style="width:${c.salud}%; background:${statBarColor('salud',c.salud)};"></div></div><div class="val">${c.salud}</div></div>
      <div class="stat-full-row"><div class="lbl">Cordura</div><div class="bar"><div style="width:${c.sanity}%; background:${statBarColor('sanity',c.sanity)};"></div></div><div class="val">${c.sanity}</div></div>
      <div class="stat-full-row"><div class="lbl">Corrupción</div><div class="bar"><div style="width:${c.corruption}%; background:${statBarColor('corruption',c.corruption)};"></div></div><div class="val">${c.corruption}</div></div>
      <div class="stat-full-row"><div class="lbl">Espiritualidad</div><div class="bar"><div style="width:${c.spirituality}%; background:var(--violet-bright);"></div></div><div class="val">${c.spirituality}</div></div>
      <div class="stat-full-row"><div class="lbl">Reputación</div><div class="bar"><div style="width:${clamp((c.reputation+100)/2,0,100)}%; background:var(--gold);"></div></div><div class="val">${c.reputation}</div></div>
      <div class="rule"></div>
      <div class="intro-summary-line"><span>Clase social</span><span>${c.clase}</span></div>
      <div class="intro-summary-line"><span>Profesión</span><span>${c.profesion || '—'}</span></div>
      <div class="intro-summary-line"><span>Educación</span><span>${c.educacion}</span></div>
      <div class="intro-summary-line"><span>Rasgos</span><span>${traitsLabelHtml(c.rasgos)}</span></div>
      <div class="intro-summary-line"><span>Estado civil</span><span>${c.estadoCivil}</span></div>
      <div class="intro-summary-line"><span>Vivienda</span><span>${c.vivienda ? c.vivienda.tipo+' propia' : 'Sin vivienda propia'}</span></div>
      <div class="intro-summary-line"><span>Efectivo</span><span>${fmtMoney(c.cash)}</span></div>
    </div>

    <div class="sec-title">Avanzar en el tiempo</div>
    <button class="btn btn-primary btn-block" id="btnSeason">Avanzar Mes</button>
    <div class="two-col" style="margin-top:10px;">
      <button class="btn" id="btnAdvanceSeason">Avanzar temporada</button>
      <button class="btn" id="btnAdvanceUntil">Hasta próximo evento</button>
    </div>
    <p class="small-note">La mayoría de tu vida transcurrirá sin sobresaltos. Lo sobrenatural aparece de a poco. Las acciones repetibles de Actividades tienen un cupo limitado que se renueva cada 3 meses de juego. Avanzar rápido nunca te va a saltear un combate, una decisión, un descubrimiento ni nada que merezca tu atención: el tiempo se frena solo cuando pasa algo.</p>

    <div class="sec-title">Partida</div>
    <div class="two-col">
      <button class="btn" id="btnSave">Guardar</button>
      <button class="btn btn-danger" id="btnDelete">Borrar partida</button>
    </div>
    <div class="two-col" style="margin-top:10px;">
      <button class="btn" id="btnExport">Exportar (.json)</button>
      <button class="btn" id="btnImport">Importar (.json)</button>
    </div>
    <input type="file" id="fileImport" accept="application/json" style="display:none;">
    <p class="small-note">Exportá tu partida para guardarla fuera del navegador o pasarla a otro dispositivo. Importar reemplaza tu partida actual.</p>

    ${renderMemoryPanel()}
    <div class="sec-title">Journal de vida</div>
    ${renderJournalEntries(60)}
  `;
}

// Lo que el personaje carga encima (ver remember()). No muestra todo: junta las
// marcas por tipo y las cuenta, para que se lea como una biografía breve y no
// como un volcado de banderas internas.
function renderMemoryPanel(){
  const mem = STATE.character.memory || [];
  if(!mem.length) return '';
  const ultimas = mem.slice(-6).reverse();
  return `
    <div class="sec-title">Lo que cargás</div>
    <div class="card">
      ${ultimas.map(m=>`<div class="intro-summary-line"><span style="flex:1;">${m.text}</span><span style="white-space:nowrap; opacity:0.7;">Año ${m.year}</span></div>`).join('')}
      ${mem.length>6 ? `<p class="small-note">Y ${mem.length-6} cosa(s) más, más atrás en tu vida.</p>` : ''}
    </div>
  `;
}
// Reemplaza a la vieja renderJournalTab(): ahora vive dentro de renderLifeTab, en la
// misma pantalla donde se avanza el año, en vez de en una pestaña separada.
function renderJournalEntries(limit){
  if(STATE.journal.length===0){ return `<div class="list-empty">Aún no hay entradas. Avanzá el tiempo para que empiece a pasar algo.</div>`; }
  return STATE.journal.slice(0,limit).map(e=>
    `<div class="evt-card"><div class="evt-date">Año ${e.year}, Mes ${e.month}</div><div class="evt-title">${e.title}</div><div class="evt-text">${e.text}</div></div>`
  ).join('');
}
function bindLifeTab(){
  document.querySelectorAll('[data-goto]').forEach(b=>{
    b.onclick = ()=>{ activeTab = 'activities'; activeActivity = b.dataset.goto; renderAll(); window.scrollTo(0,0); };
  });
  document.getElementById('btnSeason').onclick = advanceOneMonth;
  const bSeason = document.getElementById('btnAdvanceSeason');
  if(bSeason) bSeason.onclick = advanceOneSeason;
  const bUntil = document.getElementById('btnAdvanceUntil');
  if(bUntil) bUntil.onclick = advanceUntilImportant;
  document.getElementById('btnSave').onclick = ()=>saveGame(false);
  document.getElementById('btnDelete').onclick = ()=>{
    showConfirmModal('¿Seguro que querés borrar la partida actual? Esta acción no se puede deshacer.', ()=>{
      deleteSave();
      document.getElementById('screen-game').classList.add('hidden');
      document.getElementById('screen-intro').classList.remove('hidden');
      creationStep = 0;
      // Sin esto, el formulario de "nuevo personaje" reaparecía con el nombre,
      // apellido, ciudad, clase y rasgos ya sorteados del personaje que se acaba de borrar.
      creationData = freshCreationData();
      renderIntro();
    }, 'Borrar');
  };
  document.getElementById('btnExport').onclick = exportSave;
  document.getElementById('btnImport').onclick = ()=>{
    showConfirmModal('Importar una partida reemplazará tu progreso actual. ¿Continuar?', ()=>{
      document.getElementById('fileImport').click();
    }, 'Importar');
  };
  document.getElementById('fileImport').onchange = (ev)=>{
    const file = ev.target.files[0];
    importSave(file);
    ev.target.value = '';
  };
}

// Checklist visual de ingredientes puntuales para una Pathway+Sequence — reemplaza
// a la vieja barra de "% ingredientes". Se usa tanto en las vías todavía no
// elegidas (apuntando siempre a Sequence 9) como, indirectamente, dentro de
// advancementRequirements() para la vía ya elegida.
function renderIngredientChecklist(pathwayKey, seq){
  const list = ingredientsNeededFor(pathwayKey, seq);
  if(list.length===0) return '';
  return `
    <div class="small-note" style="margin-top:8px; margin-bottom:2px;">Ingredientes para Sequence ${seq}:</div>
    ${list.map(ing=>{
      const has = ownedQty(pathwayKey, ing) > 0;
      return `<div class="req-line ${has?'req-ok':'req-fail'}"><span>${ing}</span><span>${has?'✓':'✗'}</span></div>`;
    }).join('')}
  `;
}

function renderPathwayTab(){
  const p = STATE.pathway;
  let html = '';
  if(p.chosenPathway){
    const pw = PATHWAYS[p.chosenPathway];
    const seqData = currentSeqData();
    const diff = ADVANCE_DIFFICULTY[p.sequence];
    const reqs = p.sequence>0 ? advancementRequirements() : [];
    html += `
      <div class="sec-title">Tu camino: ${pw.name}</div>
      <div class="card">
        <div class="pathway-head"><div class="pathway-name">Sequence ${p.sequence} — ${seqData.name}</div></div>
        <p class="small-note" style="margin-top:6px;">${seqData.ability}</p>
        <div class="stat-full-row" style="margin-top:12px;"><div class="lbl">Digestión</div><div class="bar"><div style="width:${p.digestion}%; background:var(--gold);"></div></div><div class="val">${p.digestion}%</div></div>
        <button class="btn btn-primary btn-block" id="btnActing" style="margin-top:10px;" ${(STATE.pendingEvent||STATE.pendingMission||STATE.combat||!canUseSeasonAction('acting'))?'disabled':''}>Practicar Acting Method (${actionsLeft('acting')}/${SEASON_ACTION_LIMITS.acting} esta temporada)</button>
        ${actingStyleLabel() ? `<p class="small-note" style="margin-top:6px; font-style:italic;">${actingStyleLabel()}</p>` : ''}
      </div>
      ${p.sequence>0 ? `
      <div class="sec-title">Advancement Ritual → Sequence ${p.sequence-1}</div>
      <div class="card">
        <div class="tag ${diff.needsFlag?'tag-crimson':'tag-gold'}">${diff.label}</div>
        ${reqs.map(r=>`<div class="req-line ${r.ok?'req-ok':'req-fail'}"><span>${r.label}</span><span>${r.ok?'✓':'✗'}</span></div>`).join('')}
        <button class="btn btn-primary btn-block" style="margin-top:12px;" id="btnAdvance" ${reqs.some(r=>!r.ok)?'disabled':''}>Intentar Ritual de Advancement</button>
      </div>` : `<div class="card"><p class="small-note">Has alcanzado la Sequence 0. No hay avance posible más allá de esto.</p></div>`}
      ${anchorsUnlocked() ? renderAnchorsPanel() : ''}
    `;
  } else {
    html += `<div class="sec-title">Estado de las Vías</div><div class="card"><p class="small-note">Aún no conocés vías sobrenaturales concretas. Todo lo que sabés hoy son fragmentos y rumores.</p></div>`;
  }

  html += renderResearchPanel();
  html += `<div class="sec-title">Vías conocidas</div>`;
  const anyKnown = PATHWAY_LIST.some(pw => p.knowledge[pw.key] > 0 || p.chosenPathway===pw.key);
  if(!anyKnown){
    html += `<div class="list-empty">Ninguna vía tiene nombre para vos todavía. La niebla es espesa, y lo que se mueve detrás sigue sin mirarte — por ahora.</div>`;
  } else {
    PATHWAY_LIST.forEach(pw=>{
      const k = p.knowledge[pw.key];
      if(k<=0 && p.chosenPathway!==pw.key) return;
      const isChosen = p.chosenPathway === pw.key;
      // La etiqueta de "stage" para una vía todavía no elegida nunca debe llegar a "Obtained"
      // (eso implicaría que ya la tomaste). Se limita visualmente a "Available" como máximo.
      const stage = isChosen ? 'Obtained' : discoveryStage(Math.min(k,99));
      // El requisito real de conocimiento para intentar la primera poción es "Understood+" (50%),
      // tal como indica firstPotionRequirements(). Antes esto exigía la etapa "Available" (75%+),
      // lo cual: (a) ocultaba el botón aun cumpliendo el requisito real, y (b) podía dejar la vía
      // bloqueada para siempre si el conocimiento llegaba a 100 sin haber reunido ingredientes,
      // porque nada hace bajar el conocimiento de vuelta al rango 75-99.
      const canPursue = !p.chosenPathway && k >= 50;
      // El checklist de ingredientes se muestra desde "Discovered" (25%+) en
      // adelante — antes de eso ni siquiera sabés bien qué buscar. Reemplaza a la
      // vieja barra de "% ingredientes": ahora se pide cada ingrediente puntual,
      // y sólo se consigue explorando (ver pestaña Exploración).
      html += `
        <div class="pathway-card">
          <div class="pathway-head">
            <div class="pathway-name">${pw.name}</div>
            <div class="pathway-stage ${stageColorClass(stage)}">${stageLabel(stage)}</div>
          </div>
          <p class="small-note">${pw.theme}</p>
          ${!isChosen ? `<div class="stat-full-row" style="margin-top:8px;"><div class="lbl">Conocimiento</div><div class="bar"><div style="width:${k}%; background:var(--violet-bright);"></div></div><div class="val">${k}%</div></div>` : ''}
          ${(!isChosen && k>=25) ? renderIngredientChecklist(pw.key, 9) : ''}
          ${canPursue ? `<button class="btn btn-primary btn-block" data-firstpotion="${pw.key}" style="margin-top:10px;">Ver requisitos: Primera Poción</button>` : ''}
        </div>
      `;
    });
  }
  return html;
}
function bindPathwayTab(){
  const btnActing = document.getElementById('btnActing');
  if(btnActing) btnActing.onclick = doActing;
  const btnAdvance = document.getElementById('btnAdvance');
  if(btnAdvance) btnAdvance.onclick = attemptAdvancement;
  document.querySelectorAll('[data-firstpotion]').forEach(b=>{
    b.onclick = ()=> openFirstPotionModal(b.dataset.firstpotion);
  });
  bindResearchPanel();
}

function openFirstPotionModal(key){
  const reqs = firstPotionRequirements(key);
  const formula = FIRST_POTIONS[key];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${formula.name}</h3>
      <p class="small-note" style="margin-bottom:10px;">Convertirte en Beyonder es un riesgo real. La primera poción puede fallar y tiene consecuencias severas.</p>
      ${reqs.map(r=>`<div class="req-line ${r.ok?'req-ok':'req-fail'}"><span>${r.label}</span><span>${r.ok?'✓':'✗'}</span></div>`).join('')}
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="btn btn-block" id="modalClose">Cerrar</button>
        <button class="btn btn-primary btn-block" id="modalTake" ${reqs.some(r=>!r.ok)?'disabled':''}>Tomar la poción</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // Igual que en showDiscoverySeal: se busca dentro de este overlay concreto, no en todo el
  // documento, por si en algún momento llega a haber más de un modal en pantalla a la vez.
  overlay.querySelector('#modalClose').onclick = ()=>overlay.remove();
  overlay.querySelector('#modalTake').onclick = ()=>{ overlay.remove(); attemptFirstPotion(key); };
}

function renderNpcsTab(){
  let html = `<div class="sec-title">Personas en tu vida</div>`;
  // Investigar implica moverte con independencia y algo de plata propia — no
  // tiene sentido para un chico de 8 años, así que se bloquea entero antes de
  // los 13 (misma edad en la que arranca la adolescencia en el resto del juego).
  const oldEnough = STATE.character.edad >= 13;
  if(!oldEnough){
    html += `<p class="small-note" style="margin-bottom:10px;">Todavía sos muy chico para investigar por tu cuenta — vas a poder desde los 13 años.</p>`;
  } else {
    // El cupo de Investigar es compartido entre todos los NPCs (no es "3 por persona"),
    // así que se muestra una sola vez arriba en vez de repetido en cada tarjeta.
    html += `<p class="small-note" style="margin-bottom:10px;">Investigaciones disponibles esta temporada: ${actionsLeft('investigate')}/${SEASON_ACTION_LIMITS.investigate}</p>`;
  }
  const canInvestigate = oldEnough && canUseSeasonAction('investigate');
  STATE.npcs.forEach(npc=>{
    if(!npc.alive) return;
    ensureNpcLife(npc);
    const lejos = npc.lifeState === 'lejos' ? ' <span class="tag" style="margin-left:4px;">Lejos</span>'
                : npc.lifeState === 'distanciado' ? ' <span class="tag" style="margin-left:4px;">Distanciados</span>' : '';
    html += `
      <div class="npc-row">
        <div class="npc-top"><div class="npc-name">${npc.name}${lejos}</div><div class="npc-sub">${npc.role}</div></div>
        <div class="stat-full-row"><div class="lbl">Confianza</div><div class="bar"><div style="width:${npc.trust}%; background:var(--gold);"></div></div><div class="val">${npc.trust}</div></div>
        <div class="small-note" style="font-style:italic;">${relationshipLabel(npc)}.</div>
        <div class="small-note">
          Pathway: ${npc.known.pathway ? (npc.hidden.pathway ? PATHWAYS[npc.hidden.pathway].name : 'Ninguna conocida') : '???'} ·
          Sequence: ${npc.known.sequence ? (npc.hidden.sequence ?? '—') : '???'} ·
          Facción: ${npc.known.faction ? (npc.hidden.faction ? STATE.factions[npc.hidden.faction].name : 'Ninguna') : '???'}
        </div>
        ${oldEnough ? `<button class="btn" data-inv="${npc.id}" style="margin-top:8px;" ${canInvestigate?'':'disabled'}>Investigar (£30)</button>` : ''}
      </div>
    `;
  });
  return html;
}
function bindNpcsTab(){
  document.querySelectorAll('[data-inv]').forEach(b=>{
    b.onclick = ()=> investigateNPC(b.dataset.inv);
  });
}

function renderFactionsTab(){
  let html = `<div class="sec-title">Facciones</div>`;
  const f = STATE.factions;
  if(f.church.known){
    html += `<div class="fac-row"><div class="npc-top"><div class="npc-name">${f.church.name}</div><span class="tag tag-violet">Iglesia</span></div><div class="stat-full-row"><div class="lbl">Reputación pública</div><div class="bar"><div style="width:${clamp((f.church.publicRep+50)/1,0,100)}%; background:var(--gold);"></div></div><div class="val">${f.church.publicRep}</div></div></div>`;
  }
  if(f.tarotClub.discovered){
    html += `<div class="fac-row"><div class="npc-top"><div class="npc-name">${f.tarotClub.name}</div><span class="tag tag-crimson">Organización secreta</span></div><p class="small-note">Su existencia es real. Muy pocos fuera de sus círculos lo saben.</p></div>`;
  } else {
    html += `<div class="list-empty">Hay mesas a las que nadie te invitó, en salas que no figuran en ningún plano. Alguien de tu entorno sabe más de lo que dice: investigá a las personas correctas.</div>`;
  }
  html += renderWorldPanel();
  return html;
}

// Estado del mundo (rework v3 §29 y §40): en vez de volcar prosperity/security/
// attention como números, se describen en palabras. El jugador no tiene un
// panel de control del mundo: tiene la percepción de alguien que vive en él.
function renderWorldPanel(){
  const w = STATE.world;
  if(!w) return '';
  const prosperidad = w.prosperity>=72 ? 'La ciudad está en una buena racha: hay trabajo y circula plata.'
    : w.prosperity>=45 ? 'La ciudad va tirando, ni bien ni mal.'
    : w.prosperity>=25 ? 'Se nota el apriete: cierran negocios y cuesta conseguir changas.'
    : 'La ciudad está en decadencia abierta. Mucha gente se está yendo.';
  const seguridad = w.security>=72 ? 'De noche se puede caminar sin pensarlo demasiado.'
    : w.security>=45 ? 'Hay zonas por las que uno prefiere no pasar de noche.'
    : w.security>=25 ? 'Se habla de cosas feas con demasiada frecuencia.'
    : 'Nadie sale de noche si puede evitarlo, y los que salen no siempre vuelven.';

  const moods = Object.keys(w.factionMood)
    .filter(k=>{
      if(w.factionMood[k]==='normal') return false;
      if(k==='tarotClub') return STATE.factions.tarotClub && STATE.factions.tarotClub.discovered;
      if(k==='nighthawks') return STATE.factions.nighthawks && STATE.factions.nighthawks.known;
      return true;
    })
    .map(k=>`<div class="intro-summary-line"><span>${STATE.factions[k] ? STATE.factions[k].name : k}</span><span>${w.factionMood[k]}</span></div>`)
    .join('');

  // La atención sólo se menciona cuando ya es alta: si nadie te registró
  // todavía, no tiene sentido avisarte de que existe un medidor.
  const atencion = w.attention>=70 ? '<p class="small-note" style="color:var(--crimson-bright,#b4544f);">Tenés la clara sensación de que alguien te viene siguiendo el rastro desde hace rato.</p>'
    : w.attention>=40 ? '<p class="small-note">Últimamente te cruzás a la misma gente demasiadas veces como para que sea casualidad.</p>'
    : '';

  return `
    <div class="sec-title">El mundo</div>
    <div class="card">
      <p class="small-note">${prosperidad}</p>
      <p class="small-note">${seguridad}</p>
      ${moods ? `<div style="margin-top:8px;">${moods}</div>` : ''}
      ${atencion}
    </div>
    ${w.log.length ? `<div class="sec-title">Lo que se viene comentando</div>
      ${w.log.slice(0,6).map(e=>`<div class="evt-card"><div class="evt-date">Año ${e.year}</div><div class="evt-text">${e.text}</div></div>`).join('')}` : ''}
  `;
}

function renderWorkTab(){
  const c = STATE.character;
  // Nadie contrata a un chico de 10 años — el trabajo (con o sin "horas extra")
  // se habilita recién en la adolescencia media, en línea con el resto de
  // Actividades (Misiones también arranca a los 14).
  if(c.edad < 14){
    return `
      <div class="sec-title">Trabajo</div>
      <div class="card"><p class="small-note">Todavía sos muy chico para trabajar. Vas a poder buscar empleo a partir de los 14 años — por ahora tu ocupación es "${c.profesion || 'Sin empleo'}".</p></div>
    `;
  }
  const jobReady = canSeekJob();
  const monthsLeft = jobReady ? 0 : (12 - monthsSinceLastJobSearch());
  return `
    <div class="sec-title">Trabajo</div>
    <div class="card">
      <div class="intro-summary-line"><span>Profesión actual</span><span>${c.profesion || 'Sin empleo'}</span></div>
      <div class="intro-summary-line"><span>Clase social</span><span>${c.clase}</span></div>
      ${(c.incomeBonus||0)>0 ? `<div class="intro-summary-line"><span>Ingreso extra mensual</span><span>+${fmtMoney(c.incomeBonus)}</span></div>` : ''}
    </div>
    <button class="btn btn-primary btn-block" id="btnWorkExtra" style="margin-top:12px;" ${!canUseSeasonAction('work')?'disabled':''}>Trabajar horas extra — ${actionsLeft('work')}/${SEASON_ACTION_LIMITS.work} esta temporada</button>
    <p class="small-note">Un ingreso rápido, a costa de un poco de salud y descanso.</p>
    <button class="btn btn-block" id="btnSeekJob" style="margin-top:14px;" ${!jobReady?'disabled':''}>Buscar mejor empleo${jobReady?'':' — disponible en '+monthsLeft+' mes(es)'}</button>
    <p class="small-note">Una oportunidad real de mejorar tu situación de forma permanente, pero no siempre sale bien — depende de tu educación y reputación. No usa el cupo de la temporada: sólo podés intentarlo una vez cada 12 meses.</p>
  `;
}
function bindWorkTab(){
  const b1 = document.getElementById('btnWorkExtra'); if(b1) b1.onclick = workExtra;
  const b2 = document.getElementById('btnSeekJob'); if(b2) b2.onclick = seekBetterJob;
}

function renderExplorationTab(){
  let html = `<div class="sec-title">Exploración</div>`;
  EXPLORATION_LOCATIONS.forEach(loc=>{
    const tooYoung = loc.ageMin && STATE.character.edad < loc.ageMin;
    const locked = tooYoung || (loc.req && !loc.req());
    const label = loc.id==='city' ? ('Explorar ' + (STATE.character.ciudad||'tu ciudad')) : loc.name;
    html += `
      <div class="pathway-card ${locked?'locked':''}">
        <div class="pathway-head"><div class="pathway-name">${label}</div><span class="tag ${loc.dangerTag}">${loc.danger} peligrosidad</span></div>
        ${loc.cost>0 ? `<p class="small-note">Costo: ${fmtMoney(loc.cost)}</p>` : ''}
        ${locked
          ? `<p class="small-note">${tooYoung ? `Todavía sos muy chico para eso — vas a poder desde los ${loc.ageMin} años.` : 'Todavía no sabés cómo llegar ahí — necesitás estar más metido en el mundo místico.'}</p>`
          : `<button class="btn btn-primary btn-block" data-explore="${loc.id}" style="margin-top:8px;" ${!canUseSeasonAction('explore')?'disabled':''}>Explorar — ${actionsLeft('explore')}/${SEASON_ACTION_LIMITS.explore} esta temporada</button>`}
      </div>
    `;
  });
  return html;
}
function bindExplorationTab(){
  document.querySelectorAll('[data-explore]').forEach(b=>{
    if(b.disabled) return;
    b.onclick = ()=> exploreLocation(b.dataset.explore);
  });
}

function renderMissionsTab(){
  // Las misiones implican riesgo real (peligro, facciones, a veces combate) — se
  // habilitan en la misma edad que Trabajo (14), no antes.
  if(STATE.character.edad < 14){
    return `<div class="sec-title">Misiones</div><div class="card"><p class="small-note">Todavía sos muy chico para este tipo de encargos. Vas a poder aceptar misiones a partir de los 14 años.</p></div>`;
  }
  const avail = availableMissions();
  const usedThisSeason = STATE.seasonActions.missions||0;
  let html = `<div class="sec-title">Misiones</div>`;
  html += `<p class="small-note" style="margin:0 0 10px;">Usadas esta temporada: ${usedThisSeason}/${SEASON_ACTION_LIMITS.missions}. Las misiones más peligrosas no siempre están disponibles — dependen de quién sos y qué ya descubriste.</p>`;
  if(!avail.length){
    html += `<div class="list-empty">Nadie golpea tu puerta con encargos todavía. El trabajo sucio busca a quien ya tiene nombre — hacete uno, o mirá más de cerca lo que el resto prefiere no ver.</div>`;
    return html;
  }
  const canAccept = canUseSeasonAction('missions');
  avail.forEach(m=>{
    html += `
      <div class="pathway-card">
        <div class="pathway-head">
          <div class="pathway-name">${m.title}</div>
          <div class="pathway-stage">${MISSION_TYPE_LABEL[m.type] || m.type}</div>
        </div>
        <p class="small-note">Riesgo: ${m.risk}${m.repeatable?'':' · única vez'}</p>
        <button class="btn btn-primary btn-block" data-mission="${m.id}" style="margin-top:10px;" ${canAccept?'':'disabled style="opacity:.45;"'}>Aceptar misión</button>
      </div>
    `;
  });
  return html;
}
function bindMissionsTab(){
  document.querySelectorAll('[data-mission]').forEach(b=>{
    if(b.disabled) return;
    b.onclick = ()=> acceptMission(b.dataset.mission);
  });
}

function renderInventoryTab(){
  const inv = STATE.inventory;
  let html = `<div class="sec-title">Inventario</div>`;
  // Los libros ya vienen apilados desde addInventoryItem ({name,meta,qty}); las
  // fórmulas conocidas son siempre únicas por Pathway, así que qty:1 fijo les alcanza.
  const items = [
    ...inv.books.map(b=>({name:b.name, meta:b.meta, qty:b.qty})),
    ...Object.keys(FIRST_POTIONS).filter(k=>STATE.pathway.formulaKnown[k]).map(k=>({name:FIRST_POTIONS[k].name, meta:'Fórmula conocida', qty:1})),
  ];
  if(items.length===0){
    html += `<div class="list-empty">Nada en los bolsillos más que pelusa y un par de monedas. Por ahora, tu vida entra en una sola mano.</div>`;
  } else {
    html += `<div class="inv-grid">${items.map(it=>`<div class="inv-item"><div class="it-name">${it.name}${it.qty>1?` <span class="tag tag-gold" style="margin-left:4px;">x${it.qty}</span>`:''}</div><div class="it-meta">${it.meta}</div></div>`).join('')}</div>`;
  }

  // Ingredientes encontrados explorando (STATE.pathway.ingredientsOwned): antes se
  // guardaban en el state y se reflejaban como ✓/✗ en el checklist de la pestaña
  // Pathway, pero nunca aparecían acá — el toast decía "+1 [ingrediente]" y el
  // jugador no tenía forma de verlos listados. Ver ownedIngredientsList().
  html += `<div class="sec-title">Ingredientes</div>`;
  const ingredients = ownedIngredientsList();
  if(ingredients.length===0){
    html += `<div class="list-empty">No tenés ingredientes místicos guardados. Se consiguen explorando (ver pestaña Exploración).</div>`;
  } else {
    html += `<div class="inv-grid">${ingredients.map(it=>`<div class="inv-item"><div class="it-name">${it.name}${it.qty>1?` <span class="tag tag-gold" style="margin-left:4px;">x${it.qty}</span>`:''}</div><div class="it-meta">Ingrediente — ${PATHWAYS[it.pathwayKey].name}</div></div>`).join('')}</div>`;
  }

  html += `<div class="sec-title">Artefactos Sellados</div>`;
  if(inv.artifacts.length===0){
    html += `<div class="list-empty">No tenés artefactos sellados. Aparecen rara vez, a medida que te internás en el mundo místico.</div>`;
  } else {
    const disabled = (STATE.pendingEvent || STATE.pendingMission || STATE.combat) ? 'disabled style="opacity:.45;"' : '';
    inv.artifacts.forEach(a=>{
      html += `
        <div class="npc-row">
          <div class="npc-top"><div class="npc-name">${a.name}${a.qty>1?` <span class="tag tag-gold" style="margin-left:4px;">x${a.qty}</span>`:''}</div><span class="tag tag-crimson">${a.meta}</span></div>
          <p class="small-note">Su verdadera naturaleza es incierta hasta que decidas qué hacer con él.</p>
          <div class="two-col" style="margin-top:8px;">
            <button class="btn" data-art="${a.name}" data-act="sell" ${disabled}>Vender</button>
            <button class="btn btn-danger" data-art="${a.name}" data-act="use" ${disabled}>Usar</button>
            <button class="btn" data-art="${a.name}" data-act="study" ${disabled}>Estudiar</button>
            <button class="btn" data-art="${a.name}" data-act="church" ${disabled}>Entregar a la Iglesia</button>
          </div>
          <button class="btn btn-block" data-art="${a.name}" data-act="keep" style="margin-top:8px;" ${disabled}>Guardar en secreto</button>
        </div>
      `;
    });
  }
  return html;
}
function bindInventoryTab(){
  document.querySelectorAll('[data-art]').forEach(b=>{
    if(b.disabled) return;
    b.onclick = ()=> artifactAction(b.dataset.art, b.dataset.act);
  });
}

/* ---------------------------------------------------------------------
   RENDER GLOBAL
--------------------------------------------------------------------- */
function renderAll(){
  if(STATE.gameOver){ renderEndScreen(); return; }
  renderTopbar();
  renderTabbar();
  renderContent();
}

/* ---------------------------------------------------------------------
   INIT
--------------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', ()=>{
  const loaded = loadGame();
  if(loaded && STATE.started && !STATE.gameOver){
    document.getElementById('screen-intro').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    renderAll();
  } else if(loaded && STATE.gameOver){
    renderEndScreen();
  } else {
    STATE = freshState();
    renderIntro();
  }
});
// Reajusta --topbar-h (usado por el sticky de .activity-subnav) ante resize/rotación
// de pantalla, ya que ahí el alto del topbar puede cambiar sin que haya un renderAll()
// de por medio (ver el cálculo normal dentro de renderTopbar).
window.addEventListener('resize', ()=>{
  const tb = document.getElementById('topbar');
  if(tb && tb.innerHTML.trim()) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
});
