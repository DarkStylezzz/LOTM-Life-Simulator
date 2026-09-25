'use strict';
/* =========================================================================
   data/pathways.js — datos de las Pathways (vías Beyonder).
   Todo lo que define una vía vive acá: Sequences, ingredientes, fórmula
   inicial, dificultad de avance, y (rework v3) los descriptores VAGOS que se
   usan en las pistas antes de que el jugador sepa el nombre de la vía, el
   símbolo y las anomalías de su ritual, y qué facciones suelen custodiar
   sus fórmulas. Agregar una vía nueva = agregar datos acá (y, si se quiere,
   roles de Acting en data/acting.js y habilidades en data/abilities.js):
   el motor la consume sola (§47 del prompt de rework).
   ========================================================================= */

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

// Requisito de Digestión (0-100) para avanzar DESDE cada secuencia hacia la siguiente.
const DIGESTION_REQ = {9:100, 8:100, 7:100, 6:100, 5:100, 4:100, 3:100, 2:100, 1:100, 0:100};
// Dificultad narrativa / probabilidad base de éxito del ritual de avance por secuencia origen.
const ADVANCE_DIFFICULTY = {
  9:{label:'Difícil', baseSuccess:0.55, moneyCost:800, monthsMin:8},
  8:{label:'Muy difícil', baseSuccess:0.45, moneyCost:2200, monthsMin:14},
  7:{label:'Extremadamente difícil', baseSuccess:0.40, moneyCost:6000, monthsMin:22},
  6:{label:'Evento importante', baseSuccess:0.30, moneyCost:15000, monthsMin:36, needsFlag:true},
  5:{label:'End-game temprano', baseSuccess:0.22, moneyCost:35000, monthsMin:48, needsFlag:true},
  4:{label:'End-game', baseSuccess:0.15, moneyCost:70000, monthsMin:60, needsFlag:true},
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

/* ---------------------------------------------------------------------
   METADATOS DE VÍA (rework v3 §14, §21, §27)
   - vague: cómo se nombra la vía en una pista ANTES de identificarla
     ("una vía relacionada con la noche"). Hay solapamientos a propósito
     (los sueños, el engaño, las estrellas, la sangre, los secretos): una
     misma pista puede apuntar a dos vías distintas, y el jugador no tiene
     forma de saberlo hasta confirmar.
   - symbol / anomalies: sabor del ritual de Advancement propio de la vía.
   - anomalyAct: la opción "de la vía" frente a una anomalía del ritual.
   - factions: qué organizaciones suelen custodiar sus fórmulas (peso, no
     garantía — cada vida sortea qué fórmulas tiene cada facción).
--------------------------------------------------------------------- */
const PATHWAY_META = {
  fool: {
    vague:['el engaño','las máscaras','la adivinación','las identidades prestadas'],
    symbol:'un antifaz apoyado sobre una carta sin número',
    anomalies:[
      'Tu reflejo en la bandeja de plata sonríe un instante antes que vos.',
      'Las cartas del mazo se dan vuelta solas y todas muestran la misma figura: un bufón sin cara.',
      'Escuchás aplausos en la habitación vacía. Nadie aplaude en el momento correcto.'
    ],
    anomalyAct:'Tratar la anomalía como una lectura: interpretarla sin dejar que te lea a vos',
    factions:{tarotClub:3}
  },
  visionary: {
    vague:['la mente','los sueños','las emociones ajenas','la sugestión'],
    symbol:'un ojo abierto en el centro de un laberinto',
    anomalies:[
      'Oís con total claridad pensamientos que no son tuyos, y uno de ellos sabe tu nombre.',
      'La habitación se llena de caras que te miran con tu propia expresión.',
      'Por un segundo no sabés si estás despierto o soñando el ritual.'
    ],
    anomalyAct:'Observar la anomalía como a un paciente: catalogarla sin creerle',
    factions:{psychology:3}
  },
  redPriest: {
    vague:['la caza','el fuego','la guerra','la provocación'],
    symbol:'una llama sobre la punta de una lanza',
    anomalies:[
      'Las velas se inclinan hacia vos como animales que olfatean una presa.',
      'Sentís un hambre que no es de comida: querés salir a cazar ahora mismo.',
      'El fuego del brasero forma, por un instante, un campo de batalla en miniatura.'
    ],
    anomalyAct:'Tratar la anomalía como una presa: acecharla hasta entender su patrón',
    factions:{mi9:2}
  },
  darkness: {
    vague:['la noche','los sueños','el silencio','lo que se oculta'],
    symbol:'una luna creciente envuelta en un velo negro',
    anomalies:[
      'La oscuridad se vuelve espesa como agua y alguien, muy lejos, canta una canción de cuna.',
      'Todos los sonidos se apagan. Ni siquiera oís tu propio corazón.',
      'Las sombras de la habitación se alargan hacia la puerta, como si quisieran irse.'
    ],
    anomalyAct:'Quedarte quieto en el silencio y dejar que la noche pase a través tuyo',
    factions:{church:3, nighthawks:3}
  },
  door: {
    vague:['las puertas','los viajes imposibles','las estrellas','los atajos'],
    symbol:'una puerta entreabierta bajo siete estrellas',
    anomalies:[
      'Aparece una puerta en la pared donde no había ninguna. Del otro lado alguien golpea.',
      'Las estrellas del techo pintado cambian de posición.',
      'Por un instante estás en dos habitaciones al mismo tiempo.'
    ],
    anomalyAct:'Buscar el umbral de la anomalía y cerrarlo desde el lado correcto',
    factions:{tarotClub:1}
  },
  tyrant: {
    vague:['el mar','las tormentas','la ira','los rayos'],
    symbol:'un rayo que parte una ola',
    anomalies:[
      'El aire huele a sal y a tormenta, aunque estás tierra adentro.',
      'Un trueno sin nubes hace vibrar los vidrios. Sentís ganas de gritarle.',
      'El agua del cuenco empieza a formar olas por su cuenta.'
    ],
    anomalyAct:'Enfrentar la anomalía con la furia de una tormenta y no retroceder',
    factions:{storm:3}
  },
  twilightGiant: {
    vague:['el combate','las armas','la resistencia','el ocaso'],
    symbol:'una espada clavada frente a un sol poniente',
    anomalies:[
      'La luz de la habitación se vuelve anaranjada, como un atardecer que no termina.',
      'Tu cuerpo se pone pesado, como si llevaras una armadura invisible.',
      'Oís el choque de armas de una batalla que no está ocurriendo.'
    ],
    anomalyAct:'Sostener la postura como un guardián y aguantar lo que venga',
    factions:{mi9:1, church:1}
  },
  hermit: {
    vague:['los secretos','el conocimiento prohibido','las estrellas','los hechizos'],
    symbol:'un ojo dentro de un triángulo de estrellas',
    anomalies:[
      'Las páginas de tus notas se llenan de símbolos que no escribiste.',
      'Entendés de golpe algo que no deberías entender. Duele como una quemadura.',
      'Un ojo enorme se abre detrás de tus párpados cerrados.'
    ],
    anomalyAct:'Leer la anomalía como un texto: extraer su secreto sin dejar que te extraiga a vos',
    factions:{machinery:2}
  },
  sun: {
    vague:['la luz','la fe','los contratos','la purificación'],
    symbol:'un sol de doce rayos iguales',
    anomalies:[
      'Las velas arden blancas y calientes; la habitación no tiene una sola sombra.',
      'Sentís que alguien te exige cumplir una promesa que no recordás haber hecho.',
      'Un canto sin voces llena el aire y te dan ganas de arrodillarte.'
    ],
    anomalyAct:'Cantar contra la anomalía y purificarla con tu propia luz',
    factions:{tarotClub:1, church:1}
  },
  hangedMan: {
    vague:['el sacrificio','las sombras','los secretos','la sangre'],
    symbol:'una figura invertida atada a un árbol de sombras',
    anomalies:[
      'Algo susurra desde tu propia sombra: te ofrece un atajo a cambio de un precio.',
      'Te sangra la nariz y las gotas forman un símbolo sobre el piso.',
      'Tu sombra no te sigue cuando te movés.'
    ],
    anomalyAct:'Ofrecer un pequeño sacrificio propio para calmar la anomalía',
    factions:{aurora:3}
  },
  death: {
    vague:['la muerte','los espíritus','el frío','los cementerios'],
    symbol:'una puerta de piedra entre dos cipreses',
    anomalies:[
      'La temperatura cae de golpe. Tu aliento se vuelve blanco.',
      'Una voz conocida te llama desde el otro lado. Esa persona murió hace años.',
      'Las velas se apagan una por una, como si alguien las soplara al pasar.'
    ],
    anomalyAct:'Hablarle a la presencia con calma, como un guía de almas',
    factions:{church:1}
  },
  moon: {
    vague:['la sangre','las bestias','los remedios','la luna'],
    symbol:'una luna carmesí sobre un cáliz',
    anomalies:[
      'La luna que entra por la ventana es roja, aunque debería ser blanca.',
      'Sentís sed. No de agua.',
      'Un perro aúlla afuera, y después otro, y después todos los perros del barrio.'
    ],
    anomalyAct:'Tratar la anomalía como a una bestia herida: calmarla sin miedo',
    factions:{}
  },
  error: {
    vague:['el robo','el engaño','las reglas rotas','los parásitos'],
    symbol:'un gusano enroscado en forma de ocho',
    anomalies:[
      'Te das cuenta de que falta un minuto entero. Alguien te lo robó.',
      'Uno de los símbolos del círculo está al revés, aunque lo revisaste tres veces.',
      'Tenés la sensación clarísima de que alguien vive adentro tuyo desde hace días.'
    ],
    anomalyAct:'Buscar la falla de la anomalía y colarte por ella antes de que se cierre',
    factions:{}
  },
  whiteTower: {
    vague:['el conocimiento','la deducción','la memoria','las bibliotecas'],
    symbol:'una torre blanca coronada por un ojo',
    anomalies:[
      'Recordás de golpe cada página que leíste en tu vida, todas al mismo tiempo.',
      'Ves las ecuaciones que sostienen la habitación, y una está mal.',
      'Una luz blanca te muestra un futuro posible con demasiado detalle.'
    ],
    anomalyAct:'Deducir la causa de la anomalía paso a paso, sin saltearte ninguno',
    factions:{machinery:2}
  }
};
Object.keys(PATHWAY_META).forEach(k=>{ if(PATHWAYS[k]) Object.assign(PATHWAYS[k], PATHWAY_META[k]); });

// Todas las fórmulas posteriores a la primera (Sequence 8 en adelante) usan
// el nombre del rol de esa Sequence: "Fórmula del Clown", etc. La primera
// conserva el nombre en castellano de FIRST_POTIONS.
function formulaName(pathwayKey, seq){
  if(seq === 9 && FIRST_POTIONS[pathwayKey]) return FIRST_POTIONS[pathwayKey].name;
  const pw = PATHWAYS[pathwayKey];
  const s = pw && pw.seq.find(x=>x.n===seq);
  return 'Fórmula: ' + (s ? s.name : 'Sequence '+seq) + ' (Sequence ' + seq + ')';
}
function seqData(pathwayKey, seq){
  const pw = PATHWAYS[pathwayKey];
  return pw ? pw.seq.find(s=>s.n===seq) : null;
}
