'use strict';
/* =========================================================================
   data/items.js — objetos y artefactos sellados (§33, §34).
   Inventario unificado: todo objeto tiene categoría, rareza, procedencia,
   descripción, riesgos y usos. Los ingredientes, fórmulas, pociones y
   características se crean dinámicamente (systems/inventory.js y
   systems/potion.js); acá viven los objetos "de catálogo" y los artefactos.
   ========================================================================= */
const ITEM_CATEGORIES = {
  book:          {label:'Libros',            icon:'📖'},
  document:      {label:'Documentos',        icon:'📜'},
  ingredient:    {label:'Ingredientes',      icon:'🌿'},
  formula:       {label:'Fórmulas',          icon:'⚗'},
  potion:        {label:'Pociones',          icon:'🧪'},
  characteristic:{label:'Características',   icon:'◆'},
  weapon:        {label:'Armas',             icon:'🗡'},
  artifact:      {label:'Artefactos',        icon:'⚱'},
  quest:         {label:'Objetos de misión', icon:'✉'},
  tarot:         {label:'Tarot Club',        icon:'🃏'},
  misc:          {label:'Varios',            icon:'•'}
};
const ITEM_RARITY = {
  comun: {label:'Común',      rank:0},
  poco:  {label:'Poco común', rank:1},
  raro:  {label:'Raro',       rank:2},
  unico: {label:'Único',      rank:3}
};

/* Objetos de catálogo. read/study: qué pasa al leerlo o estudiarlo (lo
   interpreta systems/inventory.js). combat: estadística de arma. */
const ITEM_DEFS = {
  // --- libros ---
  book_mystic_fragment:{cat:'book', name:'Libro sobre misticismo (fragmentario)', rarity:'poco',
    desc:'Un libro con anotaciones que no deberían tener sentido... y sin embargo lo tienen.',
    uses:'Leerlo con atención (1 tiempo libre).', risk:'Entenderlo del todo cuesta algo de calma.',
    read:{clue:{pathway:'$random', reliability:'mixed', strength:[4,8], source:'un libro fragmentario'}, sanity:[-3,-1]}},
  book_untitled:{cat:'book', name:'Libro sin título', rarity:'raro',
    desc:'Encuadernado a mano, sin título ni autor. Las primeras páginas son aburridas; las del medio, no tanto.',
    uses:'Leerlo (1 tiempo libre).', risk:'Alguien podría estar buscándolo.',
    read:{clue:{pathway:'$random', reliability:'real', strength:[5,10], source:'el libro sin título'}, sanity:[-4,-1], attention:1}},
  book_astrology:{cat:'book', name:'Tratado de astrología', rarity:'comun',
    desc:'Cartas astrales, tablas de efemérides y muchas supersticiones. Algunas no lo son.',
    uses:'Leerlo (1 tiempo libre).', risk:'Ninguno evidente.',
    read:{clue:{pathway:['door','hermit'], reliability:'partial', strength:[3,6], source:'un tratado de astrología'}}},
  book_sailor_diary:{cat:'book', name:'Diario de un marinero', rarity:'poco',
    desc:'Las memorias de un marinero que sobrevivió a una tormenta que "sabía su nombre".',
    uses:'Leerlo (1 tiempo libre).', risk:'Ninguno evidente.',
    read:{clue:{pathway:'tyrant', reliability:'real', strength:[4,8], source:'el diario de un marinero'}}},
  book_grimoire:{cat:'book', name:'Grimorio incompleto', rarity:'raro',
    desc:'Hechizos a medio escribir, con páginas arrancadas justo donde se ponía interesante.',
    uses:'Leerlo (1 tiempo libre). Puede enseñar algo que no se puede olvidar.', risk:'Saber prohibido: Cordura y Corrupción.',
    read:{clue:{pathway:['hermit','whiteTower','hangedMan'], reliability:'mixed', strength:[5,9], source:'un grimorio incompleto'}, lore:{cat:'forbidden', chance:0.35}, sanity:[-5,-2]}},
  book_herbal:{cat:'book', name:'Manual de botica anotado', rarity:'poco',
    desc:'Un recetario de remedios caseros con notas al margen escritas con tinta roja.',
    uses:'Leerlo (1 tiempo libre).', risk:'Ninguno evidente.',
    read:{clue:{pathway:'moon', reliability:'real', strength:[4,8], source:'un manual de botica anotado'}}},
  book_theology:{cat:'book', name:'Catecismo de la Noche Eterna', rarity:'comun',
    desc:'Oraciones, himnos y, en los márgenes, preguntas que un fiel no debería hacerse.',
    uses:'Leerlo (1 tiempo libre).', risk:'Ninguno.',
    read:{clue:{pathway:['darkness','death'], reliability:'partial', strength:[2,5], source:'un catecismo'}, sanity:[1,3]}},

  // --- documentos (objetivos de investigación) ---
  doc_cipher:{cat:'document', name:'Carta cifrada', rarity:'poco',
    desc:'Una carta escrita en un código que alguien se tomó mucho trabajo en inventar.',
    uses:'Investigar el documento (Misticismo › Investigación).', risk:'Lo que dice puede no ser para vos.'},
  doc_police_report:{cat:'document', name:'Copia de un informe policial', rarity:'poco',
    desc:'Un informe sobre una muerte "accidental" con tres detalles que no cierran.',
    uses:'Investigar el documento.', risk:'Si se enteran de que lo tenés, preguntas.'},
  doc_symbol:{cat:'document', name:'Símbolo copiado', rarity:'comun',
    desc:'Un símbolo que dibujaste de memoria después de verlo donde no debía estar.',
    uses:'Investigar el símbolo.', risk:'Algunos símbolos miran de vuelta.'},
  doc_diary_page:{cat:'document', name:'Página de un diario ajeno', rarity:'poco',
    desc:'Una hoja arrancada de un diario íntimo. La letra tiembla al final.',
    uses:'Investigar el documento.', risk:'Ninguno evidente.'},
  doc_map:{cat:'document', name:'Mapa con una marca', rarity:'poco',
    desc:'Un plano de la ciudad con una cruz en un lugar donde no hay nada.',
    uses:'Investigar el documento o explorar.', risk:'Lo que marca la cruz.'},

  // --- armas ---
  weapon_knife:{cat:'weapon', name:'Cuchillo', rarity:'comun', price:8,
    desc:'Un cuchillo de hoja corta. Mejor tenerlo y no necesitarlo.', uses:'Combate cuerpo a cuerpo: +2 de daño.', risk:'Ninguno.',
    combat:{dmg:2}},
  weapon_cane:{cat:'weapon', name:'Bastón con espada', rarity:'poco', price:45,
    desc:'Un bastón de caballero con una hoja escondida.', uses:'Combate cuerpo a cuerpo: +3 de daño.', risk:'Ninguno.',
    combat:{dmg:3}},
  weapon_revolver:{cat:'weapon', name:'Revólver', rarity:'poco', price:70,
    desc:'Seis balas y mucho ruido.', uses:'Permite disparar a distancia (+6 de daño).', risk:'Hace ruido: si hay testigos, se nota.',
    combat:{dmg:6, ranged:true, noisy:true}},

  // --- varios ---
  tool_alchemy:{cat:'misc', name:'Utensilios de alquimia', rarity:'poco', price:90,
    desc:'Alambiques, balanzas finas y frascos de vidrio grueso.', uses:'Mejora la preparación de pociones.', risk:'Ninguno.'},
  tool_sealed_box:{cat:'misc', name:'Caja sellada', rarity:'raro',
    desc:'Una caja de plomo con símbolos grabados por dentro.', uses:'Reduce la influencia de las Características Beyonder que guardás.', risk:'Ninguno.'},
  remedy:{cat:'misc', name:'Remedio casero', rarity:'comun',
    desc:'Un frasco de algo que huele mal y funciona bien.', uses:'Usarlo: recupera algo de Salud (también en combate).', risk:'Ninguno.',
    consumable:{salud:[8,14]}},

  // --- objetos de misión / Tarot ---
  tarot_card:{cat:'tarot', name:'Carta de tarot extraña', rarity:'raro',
    desc:'Una carta con un símbolo que no pertenece a ningún mazo comercial. Del reverso, una niebla gris pintada con demasiado detalle.',
    uses:'Estudiarla podría decirte algo. O a alguien de vos.', risk:'Ninguno evidente.'},
  tarot_invitation:{cat:'tarot', name:'Invitación sin remitente', rarity:'unico',
    desc:'Un papel en blanco que, a la luz de una vela, muestra una sola palabra: "Tarot".', uses:'—', risk:'—'},
  quest_notebook:{cat:'quest', name:'Cuaderno de tapas negras', rarity:'unico',
    desc:'Un cuaderno de tapas negras, frío al tacto. Las hojas del final están en blanco, pero escribir en ellas se siente como firmar algo.',
    uses:'Estudiarlo (muy peligroso) o entregarlo a la Iglesia.', risk:'Extremo. Algo lo busca.'}
};

/* ---------------------------------------------------------------------
   ARTEFACTOS SELLADOS (§34)
   Los tres primeros vienen del sistema anterior (espejo, moneda, medallón);
   ahora todos tienen efectos, contraindicaciones y un comportamiento oculto
   que se descubren de a poco (examinando, estudiando, usándolos). Grado 0 es
   el más peligroso, 3 el más manejable. mech: lo interpreta
   systems/artifacts.js.
--------------------------------------------------------------------- */
const ARTIFACTS = {
  mirror:{
    name:'Espejo antiguo', grade:2, rarity:'raro',
    foundText:'un espejo antiguo cuyo reflejo tarda un instante de más en aparecer.',
    origin:'Perteneció a una médium de Backlund que desapareció en su propia casa, con la puerta cerrada por dentro.',
    activation:'Mirarse en él durante un minuto entero sin parpadear.',
    sellRange:[80,220], useSanity:[-14,-4], useCorruption:[2,6], deathChanceOnUse:0.04,
    effects:[
      {id:'reveal', text:'Muestra, por un instante, lo que una persona oculta detrás de la cara.', kind:'social', mech:{revealNpc:true}},
      {id:'spirit', text:'Aumenta tu espiritualidad cada vez que lo usás.', kind:'passive', mech:{spirituality:[2,6]}}
    ],
    drawbacks:[
      {id:'lag', text:'Cada uso, tu reflejo tarda un poco más en volver. Un día puede no volver.', kind:'use', mech:{humanity:-2}}
    ],
    hidden:{id:'watcher', text:'Algo del otro lado del espejo también te mira cuando no lo usás.', trigger:'monthly', chance:0.04, effect:{sanity:[-4,-1], attention:1}, journal:'De noche, el espejo cubierto se destapa solo.'}
  },
  coin:{
    name:'Moneda sin acuñar', grade:3, rarity:'poco',
    foundText:'una moneda de un metal que no reconocés, sin marcas de ningún reino.',
    origin:'Nadie sabe de qué reino es. Tal vez de ninguno que haya existido.',
    activation:'Tirarla al aire y aceptar lo que salga.',
    sellRange:[30,90], useSanity:[-6,-1], useCorruption:[0,2], deathChanceOnUse:0.01,
    effects:[
      {id:'luck', text:'Si la tirás antes de una decisión, la suerte se inclina un poco a tu favor durante un tiempo.', kind:'passive', mech:{luckBuff:8}}
    ],
    drawbacks:[
      {id:'debt', text:'La suerte que da, la cobra después: a veces con intereses.', kind:'use', mech:{delayedBadLuck:true}}
    ],
    hidden:{id:'returns', text:'Si la vendés o la tirás, vuelve.', trigger:'lost', chance:0.5}
  },
  locket:{
    name:'Medallón sellado', grade:1, rarity:'raro',
    foundText:'un medallón que se niega a abrirse por medios normales.',
    origin:'Adentro hay un retrato. Nadie que lo haya visto recuerda la cara.',
    activation:'Abrirlo con sangre propia.',
    sellRange:[150,400], useSanity:[-20,-8], useCorruption:[4,10], deathChanceOnUse:0.07,
    effects:[
      {id:'ward', text:'Mientras está abierto, las presencias menores no se te acercan.', kind:'combat', mech:{vsMysticDmg:0.5}},
      {id:'memory', text:'Te deja recordar con claridad perfecta un momento de tu vida.', kind:'passive', mech:{sanity:[3,8]}}
    ],
    drawbacks:[
      {id:'bleed', text:'Cada apertura pide un poco más de sangre.', kind:'use', mech:{salud:[-6,-2]}}
    ],
    hidden:{id:'portrait', text:'La cara del retrato se parece cada vez más a la tuya.', trigger:'monthly', chance:0.03, effect:{sanity:[-3,-1], humanity:-1}}
  },
  bell:{
    name:'Campanita de cobre', grade:3, rarity:'poco',
    foundText:'una campanita de cobre que no suena cuando la agitás. Suena cuando no la tocás.',
    origin:'Colgaba de la puerta de una capilla que se incendió con todos adentro.',
    activation:'Agitarla con el pulgar sobre el badajo.',
    sellRange:[40,110], useSanity:[-4,-1], useCorruption:[0,2], deathChanceOnUse:0,
    effects:[
      {id:'calm', text:'Su sonido calma a quien lo escucha: baja la sospecha y el miedo de una persona.', kind:'social', mech:{npc:{suspicion:-12, fear:-8}}},
      {id:'warn', text:'Suena sola cuando algo hostil se acerca: en combate, nunca te toma por sorpresa.', kind:'combat', mech:{noAmbush:true}}
    ],
    drawbacks:[
      {id:'forget', text:'Quien la escucha tiende a olvidar tu cara.', kind:'use', mech:{reputation:-1}}
    ],
    hidden:{id:'toll', text:'A veces suena de noche por alguien de tu casa. Casi siempre es un aviso.', trigger:'monthly', chance:0.02, effect:{sanity:[-2,-1]}}
  },
  glove:{
    name:'Guante de cuero negro', grade:2, rarity:'raro',
    foundText:'un guante de cuero negro, de mano izquierda, que siempre está tibio por dentro.',
    origin:'Lo usaba un carterista legendario de los muelles. Nunca lo atraparon. Un día simplemente dejó de aparecer.',
    activation:'Ponérselo y no pensar en lo que hace la mano.',
    sellRange:[90,260], useSanity:[-5,-2], useCorruption:[2,5], deathChanceOnUse:0.01,
    effects:[
      {id:'steal', text:'Tu mano toma lo que quiere de bolsillos ajenos sin que nadie lo note.', kind:'cash', mech:{cash:[25,90]}},
      {id:'disarm', text:'En combate, puede quitarle el arma al rival.', kind:'combat', mech:{enemyDmg:-0.35}}
    ],
    drawbacks:[
      {id:'itch', text:'La mano pide robar incluso cuando no querés.', kind:'use', mech:{corruption:1, reputation:-1}}
    ],
    hidden:{id:'owner', text:'Su dueño anterior no está muerto: lo quiere de vuelta.', trigger:'owned', chance:0.02, eventId:'artifact_glove_owner'},
    owner:{type:'npc'}
  },
  watch:{
    name:'Reloj de bolsillo detenido', grade:1, rarity:'raro',
    foundText:'un reloj de bolsillo parado a las 11:57. Si lo abrís, el segundero da un solo paso.',
    origin:'Alguien lo detuvo tres minutos antes de un desastre. Nadie sabe cuál.',
    activation:'Abrirlo y decir en voz alta la hora que marca.',
    sellRange:[120,300], useSanity:[-8,-3], useCorruption:[1,4], deathChanceOnUse:0.02,
    effects:[
      {id:'stop', text:'Detiene el tiempo un instante: en combate, tu rival pierde su turno.', kind:'combat', mech:{skipEnemy:true}}
    ],
    drawbacks:[
      {id:'age', text:'Cada instante que detiene lo cobra de tu propia vida.', kind:'use', mech:{salud:[-8,-3]}}
    ],
    hidden:{id:'tick', text:'Cuando alguien que querés está por morir, el reloj da un paso solo.', trigger:'monthly', chance:0.015, effect:{sanity:[-2,-1]}, journal:'El reloj detenido dio un paso. No sabés qué significa. Todavía.'}
  },
  candle:{
    name:'Vela de cera negra', grade:3, rarity:'poco',
    foundText:'una vela de cera negra que no se consume, por más que arda.',
    origin:'La hizo alguien que quería que un ritual durara para siempre.',
    activation:'Encenderla con un fósforo que no hayas usado para otra cosa.',
    sellRange:[50,140], useSanity:[-3,-1], useCorruption:[0,2], deathChanceOnUse:0,
    effects:[
      {id:'ritual', text:'Encendida durante un ritual, estabiliza los símbolos: tu ritual es más preciso.', kind:'ritual', mech:{ritualAccuracy:2}},
      {id:'focus', text:'Su luz ayuda a concentrarse: tu próxima investigación rinde más.', kind:'passive', mech:{researchBuff:0.12}}
    ],
    drawbacks:[
      {id:'whispers', text:'Las sombras que proyecta susurran.', kind:'use', mech:{sanity:[-2,-1]}}
    ],
    hidden:{id:'lure', text:'Su luz atrae espíritus errantes.', trigger:'use', chance:0.12, effect:{combat:'lesserSpirit'}}
  },
  doll:{
    name:'Muñeca de porcelana sin ojos', grade:1, rarity:'raro',
    foundText:'una muñeca de porcelana sin ojos, sentada en el lugar exacto donde ibas a apoyar la mano.',
    origin:'Nadie la trajo. Estaba ahí.',
    activation:'No hace falta activarla. Ella decide.',
    sellRange:[60,200], useSanity:[-6,-2], useCorruption:[1,3], deathChanceOnUse:0,
    effects:[
      {id:'save', text:'Una vez, cuando ibas a morir, se rompe en tu lugar.', kind:'save', mech:{saveFromDeath:true}}
    ],
    drawbacks:[
      {id:'nightmares', text:'Mientras la tenés, dormís peor.', kind:'owned', mech:{monthlySanity:-0.4}}
    ],
    hidden:{id:'moves', text:'Se mueve por la casa. Tu familia también lo nota.', trigger:'monthly', chance:0.05, effect:{sanity:[-2,-1]}, familyFear:true, journal:'La muñeca amaneció en otra habitación. Alguien de tu casa la vio primero.'}
  },
  compass:{
    name:'Brújula que no apunta al norte', grade:2, rarity:'raro',
    foundText:'una brújula de latón cuya aguja no apunta al norte, sino a algo que se mueve.',
    origin:'Perteneció a un capitán que buscaba una isla que no figura en ningún mapa. La encontró.',
    activation:'Pensar con fuerza en lo que buscás y seguir la aguja.',
    sellRange:[100,280], useSanity:[-5,-2], useCorruption:[1,3], deathChanceOnUse:0.01,
    effects:[
      {id:'seek', text:'Explorando, te lleva hacia lo que buscás: ingredientes, pistas, lugares.', kind:'exploration', mech:{ingredientBonus:0.2}}
    ],
    drawbacks:[
      {id:'hunted', text:'A veces apunta a lo que te busca a vos.', kind:'use', mech:{combatChance:0.1}}
    ],
    hidden:{id:'island', text:'Si la seguís el tiempo suficiente, apunta siempre al mismo lugar en el mar.', trigger:'use', chance:0.08, effect:{lead:'fog_island'}}
  },
  mask:{
    name:'Máscara de papel maché', grade:2, rarity:'raro',
    foundText:'una máscara blanca de papel maché, sin rasgos, liviana como una hoja.',
    origin:'Salió de un teatro que cerró después de una función en la que nadie del público volvió a su casa.',
    activation:'Ponértela frente a un espejo y olvidar, por un momento, tu nombre.',
    sellRange:[90,240], useSanity:[-6,-2], useCorruption:[1,4], deathChanceOnUse:0.02,
    effects:[
      {id:'unseen', text:'Con ella puesta, nadie te reconoce: el rastro que dejaste se enfría.', kind:'passive', mech:{attention:-12}},
      {id:'role', text:'Ayuda a actuar un papel: tu próxima actuación es más convincente.', kind:'passive', mech:{actingBuff:10}}
    ],
    drawbacks:[
      {id:'face', text:'Cada vez te cuesta un poco más recordar tu propia cara.', kind:'use', mech:{humanity:-2, sanity:[-3,-1]}}
    ],
    hidden:{id:'faceless', text:'La máscara resuena con quienes cambian de rostro.', trigger:'owned', chance:0, resonance:'fool'}
  },
  ring:{
    name:'Anillo con una piedra que late', grade:1, rarity:'raro',
    foundText:'un anillo de hierro con una piedra oscura que late como un corazón chiquito.',
    origin:'No es un anillo. Es algo que alguien fue.',
    activation:'Ponérselo y dejar que la piedra se acostumbre a tu pulso.',
    sellRange:[200,500], useSanity:[-6,-3], useCorruption:[2,5], deathChanceOnUse:0.02,
    effects:[
      {id:'power', text:'Tu espiritualidad se recupera más rápido mientras lo llevás.', kind:'passive', mech:{spirituality:[4,9]}}
    ],
    drawbacks:[
      {id:'pull', text:'La piedra tira de vos hacia algo que no es tuyo.', kind:'use', mech:{corruption:[1,3]}}
    ],
    hidden:{id:'characteristic', text:'No es una piedra: es una Característica Beyonder disfrazada. Sirve como ingrediente principal de una poción.', trigger:'study', chance:1, characteristic:true}
  }
};
const ARTIFACT_KEYS = Object.keys(ARTIFACTS);
// Compatibilidad: el sistema anterior buscaba plantillas por nombre visible.
const ARTIFACT_TEMPLATES = ARTIFACT_KEYS.slice(0,3).map(k=>Object.assign({id:k}, ARTIFACTS[k]));
function artifactKeyByName(name){ return ARTIFACT_KEYS.find(k=>ARTIFACTS[k].name===name) || null; }
