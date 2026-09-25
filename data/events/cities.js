'use strict';
/* =========================================================================
   data/events/cities.js — la vida en cada ciudad nueva.
   Trier (Intis), Constant (las minas), Enmat Harbor (el río y el
   contrabando) y Balam Oriental (la colonia del sur). Cada ciudad tiene su
   infancia, su vida cotidiana y lo que asoma de lo oculto: vivir en una o en
   otra cambia lo que te pasa, no sólo el nombre del lugar. Todos se filtran
   por requirements.city, así que sólo aparecen si vivís ahí.
   ========================================================================= */
const EVENTS_CITIES = [
  /* ============================== TRIER ============================== */
  {id:'trier_kid_catacombs', type:'childhood', rarity:'common', tags:['trier','dare'], requirements:{city:'trier', ageMin:7, ageMax:12}, weight:3, repeatable:false,
    run:()=>{ applyEffects({exposure:2, sanity:[-4,1]}); remember('trier_catacombs_dare', 'De chico bajaste a las catacumbas de Trier por una apuesta.', {cat:'place'});
      return {title:'La apuesta', text:'Los chicos del barrio se desafían a bajar a las catacumbas por la reja rota del cementerio. Vos bajás. Hay calaveras apiladas como ladrillos, y más abajo una escalera que nadie del grupo se anima a seguir. Vos tampoco. Pero la escuchás respirar.'}; }},
  {id:'trier_cafe_debate', type:'social', rarity:'common', tags:['trier','cafe'], requirements:{city:'trier', ageMin:16}, weight:4, cooldown:24,
    title:'Discusión en el café',
    text:'En un café de la orilla izquierda, dos estudiantes discuten a los gritos si el Emperador Roselle fue un genio o un loco. Uno jura que sus diarios anuncian cosas que todavía no pasaron.',
    choices:[
      {label:'Meterte en la discusión', small:'Opinar en voz alta, en Trier, es casi un deporte.',
        run:()=>{ const n = createNpc({met:true, relType:'acquaintance', ageMin:18, ageMax:28, profession:'Estudiante'}); adjustRel(n, {trust:[4,8], affection:[3,6]}); applyEffects({reputation:[1,3], sanity:[1,3]});
          return `Terminás la noche con la garganta rota y un amigo nuevo: ${n.name}, que no está de acuerdo con nada de lo que decís y te invita a seguir discutiendo el jueves.`; }},
      {label:'Preguntar por los diarios', small:'¿Qué dicen, exactamente?',
        run:()=>{ applyEffects({exposure:2}); if(chance(0.5)) learnLore('roselle_diary', 'una discusión en un café de Trier'); else applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'los rumores sobre el Emperador'}});
          return 'El estudiante baja la voz. Habla de páginas que se venden por fortunas, escritas en letras que parecen dibujos, y de un emperador que decía venir de otro mundo. Después se ríe, como si hubiera sido un chiste. No lo fue.'; }},
      {label:'Pagar e irte', small:'', run:()=>'Dejás unas monedas sobre el mármol y salís a la lluvia. La discusión sigue sin vos, como siguió siempre.'}
    ]},
  {id:'trier_painter', type:'mystic', rarity:'uncommon', tags:['trier','art'], requirements:{city:'trier', ageMin:16}, weight:2, cooldown:60,
    title:'El retrato',
    text:'En una galería mínima del barrio de los pintores hay un retrato tuyo. No posaste nunca. El pintor, un hombre flaco con los dedos manchados de azul, dice que te vio en un sueño "hace tres inviernos".',
    choices:[
      {label:'Comprar el cuadro', small:'Que no quede colgado a la vista de cualquiera.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(40,90)*priceIndex()), sanity:[-4,-1], clue:{pathway:['visionary','fool'], reliability:'mixed', strength:[3,6], source:'un pintor que sueña caras'}});
          return 'Lo envolvés en papel madera y lo llevás a casa. De noche, a la luz de la vela, el retrato tiene una expresión que vos todavía no pusiste nunca. Algún día la vas a poner.'; }},
      {label:'Preguntarle qué más soñó', small:'Si sueña caras, tal vez sueñe otras cosas.',
        outcomes:[
          {p:0.6, effects:{clue:{pathway:'visionary', reliability:'real', strength:[4,7], source:'los sueños de un pintor'}, sanity:[-3,0]}, text:'Te muestra una carpeta: caras, puertas, un mar de color gris. Dice que no elige qué soñar. Que a veces siente que alguien lo mira mientras pinta, desde adentro de la tela.'},
          {p:0.4, effects:{sanity:[-6,-2], exposure:3}, text:'Se pone nervioso. Dice que no debería haberte mostrado nada, que en el sueño vos no estabas solo. Cierra la galería con vos adentro todavía, y te acompaña a la puerta sin mirarte.'}
        ]},
      {label:'Irte sin decir nada', small:'', run:()=>{ applyEffects({sanity:[-2,0]}); return 'Salís. Durante semanas, cada vez que pasás por esa cuadra, cruzás de vereda.'; }}
    ]},
  {id:'trier_basement_door', type:'mystic', rarity:'rare', tags:['trier','below'], requirements:{city:'trier', ageMin:16}, weight:2, cooldown:120,
    title:'Una puerta en el sótano',
    text:'Detrás de unas cajas del sótano del edificio aparece una puerta de hierro que nadie recuerda. Del otro lado baja una escalera. De noche, a veces, se oye algo que sube.',
    choices:[
      {label:'Bajar con una lámpara', small:'Querés saber adónde lleva.',
        run:()=>{ markMysticAct(); applyEffects({exposure:4});
          if(chance(0.4)){ startCombat('catacombGhoul', {env:'sewer', source:'la Trier de abajo'}); return 'Bajás. La escalera sigue más de lo que debería. Abajo, algo te estaba esperando.'; }
          learnLore('trier_below', 'la puerta del sótano'); if(chance(0.5)) grantIngredientFind('la Trier de abajo', true);
          return 'La escalera desemboca en una calle. Una calle entera, con adoquines, faroles apagados y casas con las puertas abiertas, bajo un techo de roca. Caminás diez minutos sin cruzarte con nadie. Por suerte.'; }},
      {label:'Tapiarla', small:'Hay puertas que se cierran por algo.',
        run:()=>{ applyEffects({cash:-Math.round(25*priceIndex()), sanity:[1,4]}); remember('trier_walled_door', 'Tapiaste una puerta que bajaba a la Trier de abajo.', {cat:'choice'});
          return 'Pagás a un albañil que no hace preguntas. Dos días de ladrillo y cal. Esa noche dormís de corrido por primera vez en semanas.'; }},
      {label:'Avisarle a la policía', small:'Que se ocupe otro.',
        run:()=>{ applyEffects({reputation:[0,1]}); addHiddenTruth('La policía de Trier nunca revisó la puerta del sótano. Pasó el aviso a otra oficina, que no figura en ninguna guía.');
          return 'Un agente anota todo con desgano y se va. Una semana después, la puerta ya no está: hay pared lisa, pintada, como si nunca hubiera existido. Nadie del edificio vio a los que vinieron.'; }}
    ]},
  {id:'trier_barricades', type:'social', rarity:'uncommon', tags:['trier','politics'], requirements:{city:'trier', ageMin:16}, weight:2, cooldown:72,
    title:'Barricadas',
    text:'Otra vez adoquines arrancados, carros volcados, banderas. Trier se acuerda de su revolución cada vez que el pan sube. Esta noche, tu calle es una trinchera.',
    choices:[
      {label:'Subirte a la barricada', small:'Tu ciudad, tu pelea.',
        run:()=>{ applyEffects({reputation:[2,6], salud:[-12,-2]}); remember('trier_barricade', 'Estuviste en las barricadas de Trier.', {cat:'choice'}); if(chance(0.25)) addWound('corte');
          return 'Pasás la noche entre gritos, humo y canciones que todos saben menos vos. A la mañana, la barricada cae. Vos no. En el barrio te saludan distinto.'; }},
      {label:'Atender a los heridos', small:'Siempre hay heridos.',
        run:()=>{ applyEffects({sanity:[1,4], reputation:[1,3]}); const n = createNpc({met:true, relType:'acquaintance', ageMin:18, ageMax:40}); adjustRel(n, {trust:[8,14], loyalty:[4,8]});
          return `Vendás cabezas, sostenés manos. A uno de ellos, ${n.name}, le salvás la pierna con un torniquete mal hecho que alcanza. No se va a olvidar de tu cara.`; }},
      {label:'Cerrar los postigos', small:'Esperar a que pase.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(10,30)*priceIndex()), sanity:[-3,0]}); return 'Tres días sin salir. El almacén de la esquina, saqueado. Cuando todo vuelve a la calma, los precios no vuelven.'; }}
    ]},
  {id:'trier_absinthe', type:'mundane', rarity:'common', tags:['trier','night'], requirements:{city:'trier', ageMin:18}, weight:3, cooldown:18,
    run:()=>{
      if((STATE.flags.mysticExposure||0) >= 20 && chance(0.4)){ applyEffects({sanity:[-4,-1], exposure:1}); return {title:'Una noche de ajenjo', text:'La tercera copa de ajenjo tiene un brillo verde que no es de la bebida. Por un momento ves, sentada en la mesa de al lado, a una mujer que no proyecta sombra. Cuando parpadeás, la silla está vacía y todavía tibia.'}; }
      applyEffects({sanity:[2,5], salud:[-3,-1], cash:-Math.round(rndInt(5,15)*priceIndex())});
      return {title:'Una noche de ajenjo', text:'Poetas, cantantes y un anarquista que llora. Volvés al amanecer con la cabeza partida y la sensación, rara en vos, de haber vivido.'}; }},

  /* ============================== CONSTANT ============================== */
  {id:'constant_kid_siren', type:'childhood', rarity:'common', tags:['constant','mine'], requirements:{city:'constant', ageMin:5, ageMax:12}, weight:3, repeatable:false,
    run:()=>{ applyEffects({sanity:[-5,-1]}); remember('constant_siren', 'De chico oíste la sirena larga de la mina.', {cat:'loss'});
      return {title:'La sirena larga', text:'Todas las tardes suena la sirena del cambio de turno: dos toques cortos. Un día suena un toque largo, y todas las madres del barrio salen a la calle sin sacarse el delantal. Esa noche aprendés lo que significa.'}; }},
  {id:'constant_collapse', type:'mundane', rarity:'uncommon', tags:['constant','mine'], requirements:{city:'constant', ageMin:16}, weight:2, cooldown:60,
    title:'Derrumbe en el pozo tres',
    text:'Se viene abajo una galería del pozo tres. Hay hombres atrapados y la compañía dice que "se está evaluando la situación". En la boca del pozo, las familias esperan.',
    choices:[
      {label:'Bajar con los voluntarios', small:'Cada hora cuenta.',
        run:()=>{ applyEffects({salud:[-14,-4], reputation:[3,7]}); remember('constant_rescue', 'Bajaste a sacar gente de un derrumbe.', {cat:'achievement'});
          if(chance(0.25)){ applyEffects({clue:{pathway:['twilightGiant','hermit','whiteTower'], reliability:'real', strength:[3,6], source:'algo tallado en la roca del derrumbe'}, exposure:2}); return 'Sacan a cuatro con vida. En la pared que se desmoronó hay algo tallado en la roca: líneas que no hizo ningún minero, perfectamente pulidas. Al otro día, la compañía la tapa con escombro.'; }
          return 'Dieciocho horas cavando con las manos. Sacan a cuatro con vida y a dos que no. Te duelen los brazos durante un mes; el barrio no se olvida de tu cara.'; }},
      {label:'Donar para las familias', small:'Algo es algo.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(15,50)*priceIndex()), reputation:[1,3], sanity:[1,2]}); return 'Dejás lo que podés en la lata que pasa de mano en mano. La compañía, dicen, va a "considerar una compensación". Nadie le cree.'; }},
      {label:'Seguir con lo tuyo', small:'No es tu pozo.',
        run:()=>{ applyEffects({sanity:[-4,-1]}); return 'Seguís con tu día. A la noche, desde la ventana, se ven las lámparas en la boca del pozo. Siguen ahí cuando te dormís.'; }}
    ]},
  {id:'constant_union', type:'work', rarity:'common', tags:['constant','work'], requirements:{city:'constant', ageMin:16, employed:true}, weight:3, cooldown:48,
    title:'El sindicato',
    text:'Un compañero te pasa un papel doblado: reunión el jueves en el galpón de atrás de la iglesia. "Somos muchos. Si somos más, nos tienen que escuchar."',
    choices:[
      {label:'Ir a la reunión', small:'Juntos pesan más.',
        run:()=>{ applyEffects({reputation:[2,5]}); jobPerformance(-rndInt(2,6)); remember('constant_union_member', 'Te sumaste al sindicato.', {cat:'organization'});
          if(chance(0.3)) scheduleConsequence({inMonths:[3,10], title:'La lista negra', text:'Tu nombre aparece en una lista que circula entre los capataces. Nadie te despide: te dan los peores turnos hasta que te canses.', effect:{sanity:[-6,-2], salud:[-5,-1]}});
          return 'Cien hombres y mujeres en un galpón helado, votando a mano alzada. Por primera vez en años, alguien te pregunta qué pensás.'; }},
      {label:'Pasarle la información al capataz', small:'Unas monedas y un ascenso posible.',
        run:()=>{ applyEffects({cash:Math.round(rndInt(20,60)*priceIndex())}); jobPerformance(rndInt(3,8)); remember('constant_informer', 'Delataste la reunión del sindicato.', {cat:'betrayal'});
          addHiddenTruth('Tres de los que fueron a esa reunión del sindicato perdieron el trabajo por tu informe. Uno de ellos terminó en la calle con cinco hijos.');
          return 'El capataz guarda el papel en el bolsillo y te palmea el hombro. El jueves, la policía está en la puerta del galpón antes que nadie.'; }},
      {label:'No meterte', small:'', run:()=>'Guardás el papel en un cajón. No vas. No delatás. A veces no elegir también es elegir.'}
    ]},
  {id:'constant_miner_returned', type:'mystic', rarity:'rare', tags:['constant','mine'], requirements:{city:'constant', ageMin:14}, weight:2, cooldown:120,
    title:'El que volvió de la galería',
    text:'Un minero que llevaban una semana dando por muerto sube solo por el pozo cuatro, sin un rasguño. No tomó agua en siete días y no tiene sed. Habla muy despacio, como si estuviera traduciendo.',
    choices:[
      {label:'Ir a hablar con él', small:'Querés saber qué vio.',
        run:()=>{ markMysticAct(); applyEffects({sanity:[-6,-2], exposure:4, clue:{pathway:['twilightGiant','hermit','whiteTower'], reliability:'real', strength:[4,8], source:'un minero que volvió de la galería'}});
          if(chance(0.5)) learnLore('constant_gallery', 'un minero que volvió');
          return 'Te describe una sala tallada en la roca, con escalones hechos para piernas mucho más largas que las de un hombre. Dice que allá abajo alguien le habló. Que no era una voz. Que era la montaña.'; }},
      {label:'Avisarle a la Iglesia del Vapor', small:'Ellos sabrán qué hacer.',
        run:()=>{ factionMeet('machinery'); factionAdjust('machinery', {trust:[2,5], merit:2}); addHiddenTruth('La Mente Colmena se llevó al minero que volvió de la galería. Su familia recibió una pensión y una carta sin firma.');
          return 'Dos sacerdotes con instrumentos de latón lo visitan esa misma tarde. A la semana, la familia se muda. Nadie sabe adónde.'; }},
      {label:'Mantener distancia', small:'Hay cosas que se contagian.',
        run:()=>{ applyEffects({sanity:[-2,0]}); return 'No te acercás. Una noche lo ves en la puerta de la iglesia, mirando la montaña. Te saluda con la mano sin darse vuelta.'; }}
    ]},
  {id:'constant_foundry_cough', type:'mundane', rarity:'common', tags:['constant','health'], requirements:{city:'constant', ageMin:18}, weight:3, cooldown:24,
    run:()=>{ applyEffects({salud:[-8,-3]}); return {title:'Tos de fundición', text:'El hollín de los altos hornos se mete en todo: la ropa, la comida, los pulmones. Pasás un mes tosiendo negro. El médico dice que es normal. En Constant, lo es.'}; }},
  {id:'constant_payday', type:'social', rarity:'common', tags:['constant','pub'], requirements:{city:'constant', ageMin:18}, weight:3, cooldown:24,
    title:'Día de paga',
    text:'Viernes de paga en la taberna del pozo. Mucha cerveza, poca paciencia. Un fundidor enorme decide que lo miraste mal.',
    choices:[
      {label:'Aceptar la pelea', small:'En Constant se arregla así.',
        run:()=>{ startCombat('drunk', {env:'street', source:'la taberna'}); return 'Sacan las mesas del medio. Hay apuestas.'; }},
      {label:'Invitar una vuelta', small:'La cerveza desarma más que los puños.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(8,20)*priceIndex()), reputation:[1,3]}); return 'Pagás una vuelta para toda la mesa. El fundidor te abraza, llora un poco y te cuenta de su hija. Salís de ahí con un amigo que mañana no se va a acordar de vos.'; }},
      {label:'Irte', small:'', run:()=>{ applyEffects({reputation:[-1,0]}); return 'Te vas antes de que la cosa pase a mayores. Alguien silba a tu espalda.'; }}
    ]},

  /* ============================== ENMAT HARBOR ============================== */
  {id:'enmat_kid_coin', type:'childhood', rarity:'common', tags:['enmat','river'], requirements:{city:'enmat', ageMin:5, ageMax:12}, weight:3, repeatable:false,
    run:()=>{ applyEffects({exposure:1}); remember('enmat_coin', 'De chico, un marinero te regaló una moneda de un país que no existe.', {cat:'event'});
      return {title:'Una moneda del río', text:'Un marinero que baja de una barcaza te regala una moneda por ayudarlo con una soga. Tiene la cara de un rey que no figura en ningún libro de la escuela. La maestra dice que es falsa. Vos la guardás igual.'}; }},
  {id:'enmat_names_inn', type:'mystic', rarity:'rare', tags:['enmat','identity'], requirements:{city:'enmat', ageMin:18}, weight:2, cooldown:120,
    hiddenRequirements:()=>(STATE.world.attention||0) >= 25 || huntingFactions().length > 0 || (STATE.flags.mysticExposure||0) >= 30,
    title:'La posada de los nombres',
    text:'En una posada junto al muelle viejo, el dueño te sirve sin preguntar y te dice, en voz muy baja, que si alguna vez necesitás "ser otra persona", él tiene papeles. Nombre, pasado, todo. Precio fijo.',
    choices:[
      {label:'Comprar un nombre nuevo', small:'Un rastro que se corta de golpe.',
        requires:()=>STATE.character.cash >= Math.round(250*priceIndex()),
        run:()=>{ applyEffects({cash:-Math.round(250*priceIndex()), sanity:[-4,-1]}); STATE.world.attention = Math.round((STATE.world.attention||0) * 0.35);
          Object.keys(STATE.factions).forEach(f=>{ const x = STATE.factions[f]; x.suspicion = Math.round(x.suspicion * 0.5); });
          learnLore('enmat_names', 'la posada de los nombres'); remember('enmat_new_name', 'Compraste papeles con otro nombre en Enmat.', {cat:'secret'});
          return 'Tres días después tenés un sobre con una vida entera adentro: partida de nacimiento, cartas viejas, hasta una foto de una madre que no es la tuya. Cuando alguien pregunta por vos, pregunta por un nombre que ya no usás.'; }},
      {label:'Preguntar quién más los compró', small:'Eso también vale plata.',
        run:()=>{ learnLore('enmat_names', 'la posada de los nombres'); applyEffects({exposure:3, clue:{pathway:'$random', reliability:'mixed', strength:[3,6], source:'el libro de la posada'}});
          return 'El dueño se ríe y no dice nada. Pero deja el libro de registro abierto sobre el mostrador mientras va a buscar otra botella. Algunos nombres están tachados. Uno tiene al lado un dibujo: un ojo dentro de un triángulo.'; }},
      {label:'Terminar la cerveza e irte', small:'', run:()=>'Le agradecés la cerveza. Él te guiña un ojo: "La oferta no vence".'}
    ]},
  {id:'enmat_crate', type:'social', rarity:'uncommon', tags:['enmat','smuggling'], requirements:{city:'enmat', ageMin:17}, weight:2, cooldown:60,
    title:'Una caja sin marcas',
    text:'Un contrabandista que conocés de vista te ofrece dinero por guardar una caja en tu casa durante un mes. "Nada peligroso. No la abras y no te va a pasar nada."',
    choices:[
      {label:'Aceptar y no abrirla', small:'Plata fácil. Casi.',
        run:()=>{ applyEffects({cash:Math.round(rndInt(60,140)*priceIndex())});
          scheduleConsequence({inMonths:[1,3], eventId:'enmat_crate_outcome'});
          return 'La caja queda en un rincón, debajo de una manta. Pesa más de lo que debería. A veces, cuando pasás cerca, está tibia.'; }},
      {label:'Aceptar y abrirla', small:'Si la guardás, tenés derecho a saber.',
        run:()=>{ applyEffects({cash:Math.round(rndInt(60,140)*priceIndex())});
          if(chance(0.35)){ grantIngredientFind('una caja de contrabando', true); return 'Adentro, entre paja, hay frascos rotulados en un idioma que no leés. Uno de ellos lo reconocés: es algo que alguien como vos estaría buscando. Te quedás con uno. El contrabandista, si se da cuenta, no dice nada.'; }
          if(chance(0.4)){ applyEffects({sanity:[-8,-3], exposure:3}); return 'Adentro hay un pájaro disecado con los ojos abiertos. Te sigue con la mirada. Volvés a cerrar la caja y la atás con soga, por las dudas.'; }
          return 'Tabaco, ron y encaje. Nada más. Casi te decepciona.'; }},
      {label:'Rechazar', small:'', run:()=>'Le decís que no. Se encoge de hombros: "Otro va a decir que sí".'}
    ]},
  {id:'enmat_crate_outcome', type:'social', rarity:'uncommon', tags:['enmat','smuggling'], chainOnly:true,
    run:()=>{
      const r = Math.random();
      if(r < 0.55) return {title:'La caja', text:'El contrabandista pasa a buscarla una noche, la carga en una carretilla y se va silbando. Nunca supiste qué había adentro.'};
      if(r < 0.85){ applyEffects({cash:-Math.round(rndInt(40,120)*priceIndex()), reputation:[-6,-2]}); return {title:'La caja', text:'La policía del puerto golpea tu puerta. Encuentran la caja: tabaco sin estampillas. Pagás la multa y tu nombre queda en un registro.'}; }
      applyEffects({sanity:[-10,-4], exposure:4}); markMysticAct();
      return {title:'La caja', text:'Una noche, la caja golpea desde adentro. Tres veces. A la mañana está abierta y vacía, y hay marcas húmedas que van hasta la ventana.'}; }},
  {id:'enmat_river_lights', type:'mystic', rarity:'uncommon', tags:['enmat','river'], requirements:{city:'enmat', ageMin:12}, weight:2, cooldown:48,
    title:'Luces bajo el agua',
    text:'Una noche sin luna, desde el muelle, ves luces que se mueven debajo del agua del río. No son reflejos. Van contra la corriente, en fila, despacio.',
    choices:[
      {label:'Mirarlas hasta que se vayan', small:'Quieto, en silencio.',
        effects:{clue:{pathway:['tyrant','moon','death'], reliability:'mixed', strength:[3,6], source:'luces bajo el río'}, sanity:[-3,0], exposure:2},
        run:()=>'Las contás: trece. Pasan debajo del muelle, debajo de tus pies. La última se detiene un momento, como si te hubiera visto, y sigue.'},
      {label:'Bajar a la orilla', small:'Más cerca.',
        run:()=>{ markMysticAct(); if(chance(0.3)){ startCombat('seaBeast', {env:'docks', source:'el río'}); return 'Algo sube por los pilotes.'; }
          applyEffects({sanity:[-7,-2], exposure:3, clue:{pathway:'tyrant', reliability:'real', strength:[3,7], source:'la orilla del río'}}); return 'Metés la mano en el agua helada. Durante un segundo, algo del otro lado te la aprieta, suave, como un saludo. Después, nada.'; }},
      {label:'Volver a casa', small:'', run:()=>'Te vas sin mirar atrás. Esa noche soñás con agua.'}
    ]},
  {id:'enmat_ferry', type:'mundane', rarity:'common', tags:['enmat','trip'], requirements:{city:'enmat', ageMin:14}, weight:3, cooldown:18,
    run:()=>{ applyEffects({sanity:[2,6], cash:-Math.round(rndInt(3,8)*priceIndex())});
      if(chance(0.3)){ const n = createNpc({met:true, relType:'acquaintance'}); return {title:'El vapor a Tingen', text:`Un día de paseo río arriba, hasta Tingen. En la cubierta conocés a ${n.name}, que viaja siempre en ese vapor "porque el agua ordena las ideas".`}; }
      return {title:'El vapor a Tingen', text:'Un día de paseo río arriba, hasta Tingen y vuelta. Campanas, niebla sobre el agua, una ciudad universitaria que parece dormida. Volvés con la cabeza despejada.'}; }},
  {id:'enmat_net', type:'mundane', rarity:'uncommon', tags:['enmat','river'], requirements:{city:'enmat', ageMin:10}, weight:2, cooldown:36,
    run:()=>{ if(chance(0.5)){ addItem('doc_symbol', 1, 'la red de un pescador de Enmat'); applyEffects({exposure:1}); return {title:'Lo que trajo la red', text:'Un pescador te regala algo que sacó con la red: una placa de metal verde con un símbolo grabado. "A mí me da mala suerte. Vos tenés cara de que no creés en esas cosas." Te equivocás de cara.'}; }
      applyEffects({cash:Math.round(rndInt(5,20)*priceIndex())}); return {title:'Lo que trajo la red', text:'Ayudás a un pescador a desenredar la red y te paga con una parte de la pesca, que vendés en el mercado. Un buen día.'}; }},

  /* ============================== BALAM ORIENTAL ============================== */
  {id:'balam_kid_temple', type:'childhood', rarity:'common', tags:['balam','ruins'], requirements:{city:'balam', ageMin:6, ageMax:12}, weight:3, repeatable:false,
    run:()=>{ applyEffects({exposure:2}); remember('balam_bead', 'De chico jugabas entre las ruinas y encontraste una cuenta de hueso.', {cat:'place'});
      return {title:'Juegos entre las ruinas', text:'Los hijos de los colonos juegan entre piedras talladas que la selva está tragando. Encontrás una cuenta de hueso pulido, con un ojo grabado. La niñera nativa te la saca de la mano, la tira al río y te lava las manos con agua hirviendo. No te explica nada.'}; }},
  {id:'balam_fever', type:'mundane', rarity:'common', tags:['balam','health'], requirements:{city:'balam', ageMin:1}, weight:3, cooldown:30,
    run:()=>{ const hard = !STATE.pathway.chosenPathway; applyEffects({salud: hard ? [-16,-7] : [-8,-3], sanity:[-3,0]});
      return {title:'La fiebre del sur', text: hard ? 'La fiebre llega con las lluvias, como todos los años. Dos semanas sudando, delirando con una mujer vestida de negro sentada a los pies de la cama. Cuando se va la fiebre, se va ella.' : 'La fiebre del sur te toca apenas. Tu cuerpo ya no es del todo humano, y la fiebre parece saberlo: pasa de largo, como quien se equivoca de puerta.'}; }},
  {id:'balam_guide_warning', type:'mystic', rarity:'uncommon', tags:['balam','natives'], requirements:{city:'balam', ageMin:14}, weight:2, cooldown:60,
    title:'Lo que no se nombra',
    text:'Un guía nativo, viejo, te frena en el camino que sube hacia las ruinas del norte. Te dice que ese templo no es para visitar: que ahí "el rey todavía cobra impuestos".',
    choices:[
      {label:'Hacerle caso y dejar una ofrenda', small:'Hay costumbres que se respetan.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(3,10)*priceIndex()), sanity:[2,5]}); remember('balam_respect', 'Respetaste las costumbres de los nativos de Balam.', {cat:'choice'});
          return 'Dejás fruta y una moneda al pie de un árbol. El viejo asiente. En los meses siguientes, la gente del mercado nativo te trata distinto: te saludan antes de que saludes.'; }},
      {label:'Pedirle que te lleve igual', small:'Pagando, todo se puede.',
        run:()=>{ markMysticAct(); applyEffects({cash:-Math.round(rndInt(15,30)*priceIndex()), exposure:4, clue:{pathway:'death', reliability:'real', strength:[4,8], source:'un templo de Balam'}, sanity:[-8,-3]});
          if(chance(0.5)) learnLore('balam_sovereign', 'un guía viejo de Balam');
          return 'Te lleva hasta la escalinata y no sube. Arriba hay un trono de piedra vacío, y en el respaldo, grabada, una corona sobre una calavera. Cuando bajás, el viejo ya se fue. En tu mano, sin que sepas cómo, hay una moneda antigua.'; }},
      {label:'Reírte de él', small:'Supersticiones.',
        run:()=>{ scheduleConsequence({inMonths:[2,8], title:'El impuesto', text:'Durante una semana, todo lo que tocás se pudre un poco antes de tiempo: la fruta, la leche, la madera de la puerta. Después para. Nadie te cobra nada más. Esta vez.', effect:{sanity:[-8,-3], salud:[-6,-2], cash:[-40,-10]}, memory:{tag:'balam_tax', text:'Algo en Balam te cobró por reírte.', cat:'trauma'}});
          return 'Te reís. El viejo no. Te mira un rato largo, como quien mira a alguien que ya se fue, y se va.'; }}
    ]},
  {id:'balam_plantation', type:'social', rarity:'uncommon', tags:['balam','colony'], requirements:{city:'balam', ageMin:17}, weight:2, cooldown:60,
    title:'La plantación',
    text:'En la plantación de un colono rico ves a un capataz azotando a un trabajador nativo por "robar" una fruta caída. Hay otros mirando. Nadie hace nada.',
    choices:[
      {label:'Meterte', small:'No podés mirar para otro lado.',
        run:()=>{ applyEffects({reputation:[-4,-1], sanity:[1,4]}); remember('balam_intervened', 'Te metiste para frenar un castigo en una plantación de Balam.', {cat:'choice'});
          if(chance(0.4)){ startCombat('thugs', {env:'street', source:'la plantación'}); return 'El capataz tiene amigos, y los amigos tienen palos.'; }
          return 'Le agarrás el brazo al capataz. Es más grande que vos, pero no está acostumbrado a que alguien lo toque. Suelta el látigo. Los colonos del club te van a mirar mal durante años. El trabajador, esa noche, deja una fruta en tu puerta.'; }},
      {label:'Denunciarlo ante el gobernador', small:'Por las vías legales.',
        run:()=>{ applyEffects({sanity:[-3,-1]}); addHiddenTruth('Tu denuncia al gobernador de Balam terminó en un cajón. El capataz siguió en su puesto dos años más.');
          return 'Te reciben con té y amabilidad. Anotan todo. Te agradecen "el interés". No va a pasar nada, y los dos lo saben.'; }},
      {label:'Mirar para otro lado', small:'No es tu plantación.',
        run:()=>{ applyEffects({humanity:-1, sanity:[-3,-1]}); remember('balam_looked_away', 'Miraste para otro lado en la plantación.', {cat:'choice'});
          return 'Seguís caminando. El ruido del látigo te acompaña dos cuadras. Después, sólo en sueños.'; }}
    ]},
  {id:'balam_idol', type:'mystic', rarity:'rare', tags:['balam','artifact'], requirements:{city:'balam', ageMin:16}, weight:2, cooldown:120,
    hiddenRequirements:()=>!hasArtifact('bone_idol'),
    title:'Un ídolo de hueso',
    text:'Un comerciante del puerto vende, envuelto en un trapo, un ídolo de hueso tallado sacado "de los templos del norte". Dice que trae suerte. Sus manos no tiemblan cuando lo toca: tiemblan cuando lo suelta.',
    choices:[
      {label:'Comprarlo', small:'Algo así no aparece dos veces.',
        requires:()=>STATE.character.cash >= Math.round(60*priceIndex()),
        run:()=>{ applyEffects({cash:-Math.round(60*priceIndex())}); addArtifact('bone_idol', 'un comerciante del puerto de Balam'); return 'Te lo envuelve rápido, casi con alivio, y no te desea suerte.'; }},
      {label:'Avisarle a la Iglesia de las Tormentas', small:'En el puerto mandan ellos.',
        run:()=>{ factionMeet('storm'); factionAdjust('storm', {trust:[3,6], merit:2}); return 'Dos Castigadores se llevan al comerciante y al ídolo. Al comerciante lo sueltan a la semana. Al ídolo, no.'; }},
      {label:'No tocarlo', small:'', run:()=>'Seguís de largo. El ídolo, desde el trapo, parece girar un poco la cabeza para verte pasar.'}
    ]},
  {id:'balam_rains', type:'mundane', rarity:'common', tags:['balam','weather'], requirements:{city:'balam', ageMin:16}, weight:2, cooldown:24,
    run:()=>{ const v = Math.round(rndInt(15,50)*priceIndex()); applyEffects({cash:-v}); cityAdjust('balam', {prosperity:-rndInt(1,3)});
      return {title:'Las lluvias', text:`Llueve cuarenta días. El río se come el camino del puerto, el techo cede en dos lugares y se pudre media cosecha de la colonia. Arreglar la casa te cuesta ${fmtMoney(v)}.`}; }}
];
