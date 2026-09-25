'use strict';
/* =========================================================================
   data/acting.js — el Método de Actuación (§18, §19).
   ACTING_ROLES[vía][Sequence] = el ROL que nombra la poción y su PRINCIPIO.
   Digerir no es juntar XP: es vivir según ese principio. systems/acting.js
   arma cada escena combinando:
     - una semilla (ACTING_SEEDS) o un molde genérico construido con el
       principio del rol (así ninguna Sequence queda sin escenas propias),
     - el contexto de tu vida (trabajo, familia, alguien cercano, la calle),
     - y evalúa la CALIDAD de lo que elegiste según: alineación con el
       principio, personalidad (rasgos "fit"), profesión, reputación,
       relaciones, experiencia previa en ese rol, cordura y corrupción.
   align de cada opción:
     aligned    = fiel al principio, con sutileza (seguro, progreso sólido)
     bold       = fiel al principio llevado al extremo (más varianza)
     contradict = va contra el rol (cómodo o lucrativo, pero se paga)
     neutral    = no exponerse (no suma ni resta)
   extra: efectos adicionales de sabor (plata, reputación, salud...), NO
   digestión: la digestión la calcula el motor a partir de la calidad.
   ========================================================================= */
const ACTING_ROLES = {
  fool:{
    9:{role:'Vidente', principle:'Un Vidente no predice por los demás: los guía hacia su propia respuesta, y nunca muestra cuánto sabe realmente.', fit:['intuitive','curious','secretive']},
    8:{role:'Payaso', principle:'Un Payaso sonríe cuando sufre y controla cada expresión: el público ve la risa, nunca el costo.', fit:['social','disciplined','cold']},
    7:{role:'Mago', principle:'Un Mago prepara el truco antes de que empiece la función: lo que el público cree ver nunca es lo que pasa.', fit:['meticulous','charismatic','cautious']},
    6:{role:'Sin Rostro', principle:'Un Sin Rostro se convierte en otras personas sin perderse a sí mismo: habita el papel, pero sabe dónde termina.', fit:['secretive','empathic','disciplined']},
    5:{role:'Titiritero', principle:'Un Titiritero mueve los hilos desde atrás del telón: nunca sube al escenario, nunca deja ver la mano.', fit:['cold','secretive','ambitious']},
    4:{role:'Hechicero Bizarro', principle:'Un Hechicero Bizarro hace que lo absurdo parezca inevitable: su actuación reescribe lo que el público da por real.', fit:['charismatic','intuitive']},
    3:{role:'Erudito de Antaño', principle:'Un Erudito de Antaño vive como si el pasado fuera un idioma que sólo él habla todavía.', fit:['curious','meticulous','loner']},
    2:{role:'Invocador de Milagros', principle:'Quien invoca milagros los concede con humildad y con precio: un milagro regalado es una trampa.', fit:['empathic','disciplined']},
    1:{role:'Asistente de los Misterios', principle:'Un Asistente de los Misterios sirve a lo que no se comprende sin intentar poseerlo.', fit:['secretive','intuitive']}
  },
  visionary:{
    9:{role:'Espectador', principle:'Un Espectador observa sin intervenir: cataloga, entiende, y no sube nunca al escenario de los demás.', fit:['loner','cautious','cold','curious']},
    8:{role:'Telépata', principle:'Un Telépata escucha lo que nadie dice en voz alta, y calla lo que escuchó.', fit:['empathic','secretive']},
    7:{role:'Psiquiatra', principle:'Un Psiquiatra cura mentes ajenas sin dejar que las ajenas curen —o enfermen— la propia.', fit:['empathic','disciplined','cold']},
    6:{role:'Hipnotista', principle:'Un Hipnotista guía sin forzar: la sugestión funciona cuando el otro cree que la idea es suya.', fit:['charismatic','cold']},
    5:{role:'Caminante de Sueños', principle:'Quien camina en sueños entra en casas ajenas: no rompe nada, no se queda a vivir.', fit:['intuitive','cautious']},
    4:{role:'Manipulador', principle:'Un Manipulador cambia decisiones ajenas tan suavemente que nadie, ni él mismo, sabe dónde empezó.', fit:['cold','ambitious']},
    3:{role:'Tejedor de Sueños', principle:'Un Tejedor de Sueños construye mundos para otros y recuerda siempre cuál es el suyo.', fit:['intuitive','disciplined']},
    2:{role:'Discernidor', principle:'Un Discernidor no se deja engañar por ninguna ilusión, empezando por las propias.', fit:['skeptic','cold']},
    1:{role:'Autor', principle:'Un Autor escribe destinos ajenos con la responsabilidad de quien sabe que el lector existe.', fit:['disciplined']}
  },
  redPriest:{
    9:{role:'Cazador', principle:'Un Cazador es paciente: estudia a la presa, prepara la trampa, y sólo entonces ataca.', fit:['hunter','cautious','cold']},
    8:{role:'Provocador', principle:'Un Provocador enciende al otro sin encenderse: la furia ajena es su arma, nunca la propia.', fit:['cold','social']},
    7:{role:'Pirómano', principle:'Un Pirómano ama el fuego, pero decide él dónde y cuándo arde.', fit:['brave','disciplined']},
    6:{role:'Conspirador', principle:'Un Conspirador gana la pelea antes de que empiece: informa, organiza, embosca.', fit:['meticulous','ambitious']},
    5:{role:'Segador', principle:'Un Segador corta con precisión: un solo golpe, en el punto exacto, sin crueldad innecesaria.', fit:['cold','disciplined']},
    4:{role:'Caballero de Sangre de Hierro', principle:'Un Caballero de Sangre de Hierro no retrocede ni abandona a los suyos en el campo.', fit:['brave','disciplined','tough']},
    3:{role:'Obispo de Guerra', principle:'Un Obispo de Guerra da sentido a la violencia de otros: los guía, los sostiene, carga con sus muertos.', fit:['charismatic','brave']},
    2:{role:'Brujo del Clima', principle:'Quien doma el clima de la guerra conoce el costo de cada tormenta que desata.', fit:['cold']},
    1:{role:'Conquistador', principle:'Un Conquistador no pelea por pelear: pelea para que la pelea termine.', fit:['ambitious','brave']}
  },
  darkness:{
    9:{role:'Insomne', principle:'Un Insomne es el vigía de la noche: disciplinado, alerta, en paz con la oscuridad y con la soledad.', fit:['disciplined','loner','cautious']},
    8:{role:'Poeta de Medianoche', principle:'Un Poeta de Medianoche consuela: su voz calma, nunca hiere, y encuentra belleza en la noche.', fit:['empathic','intuitive']},
    7:{role:'Pesadilla', principle:'Una Pesadilla entra en los sueños ajenos para entender, no para disfrutar el miedo que provoca.', fit:['cold','intuitive']},
    6:{role:'Asegurador de Almas', principle:'Quien asegura almas sostiene a los que están por perderse, aunque le cueste las propias fuerzas.', fit:['empathic','anchored']},
    5:{role:'Brujo de Espíritus', principle:'Un Brujo de Espíritus manda sin crueldad: los espíritus obedecen al que los respeta.', fit:['disciplined','superstitious']},
    4:{role:'Vigía Nocturno', principle:'Un Vigía Nocturno lo ve todo en la oscuridad y elige qué contar.', fit:['secretive','cautious']},
    3:{role:'Obispo del Horror', principle:'Un Obispo del Horror usa el terror como liturgia, nunca como placer.', fit:['cold']},
    2:{role:'Siervo del Ocultamiento', principle:'Un Siervo del Ocultamiento no se deja ver: ni por enemigos, ni por aliados, ni por sí mismo.', fit:['secretive','loner']},
    1:{role:'Caballero del Infortunio', principle:'Un Caballero del Infortunio carga con la desgracia ajena como armadura.', fit:['anchored','brave']}
  },
  door:{
    9:{role:'Aprendiz', principle:'Un Aprendiz es curioso y humilde: abre puertas para aprender, no para entrar donde no lo llaman.', fit:['curious','cautious']},
    8:{role:'Maestro de Trucos', principle:'Un Maestro de Trucos resuelve con ingenio lo que otros resuelven con fuerza.', fit:['charismatic','intuitive']},
    7:{role:'Astrólogo', principle:'Un Astrólogo lee las estrellas para orientar, no para imponer: el futuro es una sugerencia.', fit:['intuitive','superstitious','meticulous']},
    6:{role:'Escriba', principle:'Un Escriba registra todo lo que ve con precisión: lo que no anota, lo pierde.', fit:['meticulous','curious']},
    5:{role:'Viajero', principle:'Un Viajero no echa raíces: siempre hay otro lugar, otro cielo, otra puerta.', fit:['curious','loner']},
    4:{role:'Hechicero de Secretos', principle:'Un Hechicero de Secretos guarda espacios enteros y no deja que nadie mire adentro.', fit:['secretive']},
    3:{role:'Errante', principle:'Un Errante pertenece a todos los lugares y a ninguno.', fit:['loner','curious']},
    2:{role:'Caminante de Planos', principle:'Quien camina entre planos respeta cada umbral que cruza.', fit:['cautious']},
    1:{role:'Llave de Estrellas', principle:'Una Llave de Estrellas abre, pero nunca deja rastro de por dónde pasó.', fit:['secretive']}
  },
  tyrant:{
    9:{role:'Marinero', principle:'Un Marinero respeta el mar y a su tripulación: trabaja duro, bebe fuerte y no traiciona a los suyos.', fit:['tough','brave','social']},
    8:{role:'Hombre de la Ira', principle:'La Ira es una tormenta que se suelta en el momento justo y contra el enemigo correcto, no contra cualquiera.', fit:['brave','disciplined']},
    7:{role:'Navegante', principle:'Un Navegante lee el viento y el agua y decide el rumbo: el mar abierto es su casa.', fit:['brave','curious']},
    6:{role:'Bendecido por el Viento', principle:'Quien tiene la bendición del viento se mueve con libertad y no deja que lo encierren.', fit:['brave','loner']},
    5:{role:'Cantor del Océano', principle:'Un Cantor del Océano calma o enfurece con la voz: siempre sabe cuál de las dos hace falta.', fit:['charismatic']},
    4:{role:'Sellador de Cataclismos', principle:'Quien sella catástrofes cuida de no desatarlas por capricho.', fit:['disciplined','cold']},
    3:{role:'Rey del Mar', principle:'Un Rey del Mar gobierna con justicia sobre lo que le obedece.', fit:['ambitious','brave']},
    2:{role:'Calamidad', principle:'Una Calamidad sabe que es un desastre y elige dónde no caer.', fit:['cold']},
    1:{role:'Dios del Trueno', principle:'Un Dios del Trueno castiga, pero no confunde castigo con rabieta.', fit:['disciplined']}
  },
  twilightGiant:{
    9:{role:'Guerrero', principle:'Un Guerrero se entrena todos los días, respeta al rival y no busca peleas que no valen la pena.', fit:['disciplined','brave','tough']},
    8:{role:'Pugilista', principle:'Un Pugilista resuelve de frente, con las manos, y acepta los golpes que eso trae.', fit:['brave','tough']},
    7:{role:'Maestro de Armas', principle:'Un Maestro de Armas estudia cada arma y cada rival hasta conocer su punto débil.', fit:['meticulous','disciplined']},
    6:{role:'Paladín del Alba', principle:'Un Paladín del Alba protege a los débiles de lo que acecha en la oscuridad.', fit:['brave','empathic']},
    5:{role:'Guardián', principle:'Un Guardián se pone delante: recibe el golpe que iba para otro.', fit:['anchored','brave','tough']},
    4:{role:'Cazador de Demonios', principle:'Un Cazador de Demonios no descansa mientras lo maligno siga libre.', fit:['brave','disciplined']},
    3:{role:'Caballero de Plata', principle:'Un Caballero de Plata pelea con honor incluso cuando nadie mira.', fit:['disciplined']},
    2:{role:'Gloria', principle:'La Gloria se comparte con los que pelean a tu lado.', fit:['charismatic','brave']},
    1:{role:'Mano de Dios', principle:'La Mano de Dios golpea una sola vez, cuando ya no hay otra salida.', fit:['cold','disciplined']}
  },
  hermit:{
    9:{role:'Fisgón de Misterios', principle:'Un Fisgón de Misterios persigue cada secreto con curiosidad insaciable... sabiendo que algunos muerden.', fit:['curious','meticulous']},
    8:{role:'Erudito Marcial', principle:'Un Erudito Marcial aplica lo que estudia: el conocimiento que no se usa no es conocimiento.', fit:['disciplined','curious']},
    7:{role:'Brujo', principle:'Un Brujo trata los hechizos como herramientas: precisos, preparados, nunca por impulso.', fit:['meticulous','cautious']},
    6:{role:'Profesor de Pergaminos', principle:'Un Profesor de Pergaminos enseña y conserva: el saber existe para transmitirse.', fit:['social','meticulous']},
    5:{role:'Maestro de Constelaciones', principle:'Quien domina las constelaciones mira lejos sin olvidar dónde pisa.', fit:['intuitive']},
    4:{role:'Misticólogo', principle:'Un Misticólogo desarma lo prohibido pieza por pieza, sin tocar lo que no entiende.', fit:['cautious','meticulous']},
    3:{role:'Clarividente', principle:'Un Clarividente ve el futuro y carga con la responsabilidad de lo que calla.', fit:['secretive']},
    2:{role:'Sabio', principle:'Un Sabio sabe que todo saber es incompleto.', fit:['skeptic']},
    1:{role:'Emperador del Conocimiento', principle:'El Emperador del Conocimiento ordena el saber para que no lo desordene a él.', fit:['disciplined']}
  },
  sun:{
    9:{role:'Bardo', principle:'Un Bardo canta para darle coraje a otros, sin pedir nada a cambio.', fit:['social','charismatic','empathic']},
    8:{role:'Suplicante de Luz', principle:'Un Suplicante de Luz sirve a la luz con humildad: cura, bendice, no juzga.', fit:['empathic','disciplined']},
    7:{role:'Sumo Sacerdote Solar', principle:'Un Sumo Sacerdote Solar purifica lo corrupto con firmeza y sin odio.', fit:['disciplined','brave']},
    6:{role:'Notario', principle:'Un Notario da fe de la verdad y hace cumplir lo pactado, aunque no le convenga.', fit:['meticulous','disciplined']},
    5:{role:'Sacerdote de la Luz', principle:'Un Sacerdote de la Luz enfrenta a lo oscuro de frente.', fit:['brave']},
    4:{role:'Sin Sombra', principle:'Un Sin Sombra no esconde nada: vive a plena luz.', fit:['anchored']},
    3:{role:'Mentor de Justicia', principle:'Un Mentor de Justicia enseña el orden con el ejemplo.', fit:['disciplined','social']},
    2:{role:'Buscador de Luz', principle:'Un Buscador de Luz no descansa mientras haya oscuridad cerca.', fit:['brave']},
    1:{role:'Ángel Blanco', principle:'Un Ángel Blanco da calor y vida sin pedir adoración.', fit:['empathic']}
  },
  hangedMan:{
    9:{role:'Suplicante de Secretos', principle:'Un Suplicante de Secretos busca lo oculto con devoción y paga cada respuesta con algo propio.', fit:['superstitious','curious']},
    8:{role:'Oyente', principle:'Un Oyente escucha los susurros sin obedecerlos: toma lo que sirve y no firma nada.', fit:['cautious','secretive']},
    7:{role:'Asceta de la Sombra', principle:'Un Asceta de la Sombra se niega los placeres: la disciplina es su sacrificio diario.', fit:['disciplined','loner']},
    6:{role:'Obispo Rosa', principle:'Un Obispo Rosa convierte la sangre en rito, nunca en capricho.', fit:['disciplined']},
    5:{role:'Pastor', principle:'Un Pastor carga con los que tiene a cargo, aunque el peso lo hunda.', fit:['anchored','empathic']},
    4:{role:'Caballero Negro', principle:'Un Caballero Negro pelea con lo que es, sin negar su sombra.', fit:['brave']},
    3:{role:'Templario de la Trinidad', principle:'Un Templario de la Trinidad une voluntades sin anular ninguna.', fit:['disciplined']},
    2:{role:'Presbítero Profano', principle:'Un Presbítero Profano conoce la traición mejor que nadie, y por eso no la ejerce sobre los suyos.', fit:['cold']},
    1:{role:'Ángel Oscuro', principle:'Un Ángel Oscuro acepta el pecado como responsabilidad, no como excusa.', fit:['anchored']}
  },
  death:{
    9:{role:'Recolector de Cadáveres', principle:'Un Recolector de Cadáveres trata a los muertos con respeto y sin miedo: son trabajo, no espectáculo.', fit:['cold','disciplined']},
    8:{role:'Sepulturero', principle:'Un Sepulturero entierra, cuida, y guarda silencio sobre lo que escuchó bajo tierra.', fit:['secretive','loner']},
    7:{role:'Médium', principle:'Un Médium escucha a los muertos y les lleva sus mensajes a los vivos, sin inventar nada.', fit:['empathic','intuitive']},
    6:{role:'Guía de Espíritus', principle:'Un Guía de Espíritus ayuda a los muertos a irse, aunque quieran quedarse.', fit:['empathic','cold']},
    5:{role:'Guardián de la Puerta', principle:'Un Guardián de la Puerta no deja que nadie cruce antes de tiempo.', fit:['disciplined']},
    4:{role:'Imperecedero', principle:'Un Imperecedero respeta la muerte precisamente porque ya no lo alcanza.', fit:['anchored']},
    3:{role:'Barquero', principle:'Un Barquero cobra el cruce, pero nunca abandona a nadie en el río.', fit:['disciplined']},
    2:{role:'Cónsul de la Muerte', principle:'Un Cónsul de la Muerte juzga sin rencor.', fit:['cold']},
    1:{role:'Emperador Pálido', principle:'El Emperador Pálido gobierna el final con orden.', fit:['disciplined']}
  },
  moon:{
    9:{role:'Boticario', principle:'Un Boticario cura con paciencia y conocimiento: primero no dañar, después sanar.', fit:['meticulous','empathic']},
    8:{role:'Domador', principle:'Un Domador se gana a las bestias con paciencia y firmeza, nunca con crueldad.', fit:['brave','empathic']},
    7:{role:'Vampiro', principle:'Un Vampiro controla su sed: bebe lo justo, de quien corresponde, sin perder su humanidad.', fit:['disciplined','cold']},
    6:{role:'Profesor de Pociones', principle:'Un Profesor de Pociones prueba, anota y enseña: cada mezcla es una lección.', fit:['meticulous','curious']},
    5:{role:'Erudito Escarlata', principle:'Un Erudito Escarlata estudia la sangre y la luna con devoción de científico.', fit:['curious']},
    4:{role:'Rey Chamán', principle:'Un Rey Chamán protege a su tribu —personas, bestias, espíritus— como a sí mismo.', fit:['anchored','brave']},
    3:{role:'Gran Invocador', principle:'Un Gran Invocador llama sólo lo que puede devolver.', fit:['cautious']},
    2:{role:'Dador de Vida', principle:'Quien da vida sabe que no toda vida debería existir.', fit:['empathic']},
    1:{role:'Diosa de la Belleza', principle:'La belleza no se exhibe: se sostiene.', fit:['disciplined']}
  },
  error:{
    9:{role:'Saqueador', principle:'Un Saqueador roba con habilidad y sin violencia: la gracia está en que nadie lo note.', fit:['cautious','cold']},
    8:{role:'Estafador', principle:'Un Estafador engaña con encanto: la mentira perfecta es la que el otro quiere creer.', fit:['charismatic','social']},
    7:{role:'Criptólogo', principle:'Un Criptólogo encuentra el patrón oculto en todo, y nunca deja de buscarlo.', fit:['meticulous','curious']},
    6:{role:'Prometeo', principle:'Un Prometeo roba el fuego de los dioses... y acepta el castigo.', fit:['brave','ambitious']},
    5:{role:'Ladrón de Sueños', principle:'Un Ladrón de Sueños toma intenciones sin dejar huella.', fit:['secretive']},
    4:{role:'Parásito', principle:'Un Parásito vive dentro de otros sin matarlos: el huésped muerto no sirve.', fit:['cold']},
    3:{role:'Mentor del Engaño', principle:'Un Mentor del Engaño engaña a las reglas, no a los suyos.', fit:['intuitive']},
    2:{role:'Caballo de Troya del Destino', principle:'Un Caballo de Troya entra por la puerta grande y espera.', fit:['cautious']},
    1:{role:'Gusano del Tiempo', principle:'Un Gusano del Tiempo roba tiempo, nunca el suyo propio.', fit:['disciplined']}
  },
  whiteTower:{
    9:{role:'Lector', principle:'Un Lector lee todo, con método y hambre: cada libro es un escalón.', fit:['curious','meticulous','loner']},
    8:{role:'Estudiante del Razonamiento', principle:'Un Estudiante del Razonamiento no concluye nada sin pruebas.', fit:['skeptic','meticulous']},
    7:{role:'Detective', principle:'Un Detective busca la verdad aunque incomode, y la dice.', fit:['curious','brave','skeptic']},
    6:{role:'Polímata', principle:'Un Polímata aprende de todo y de todos, sin despreciar ningún saber.', fit:['curious','social']},
    5:{role:'Magíster del Misticismo', principle:'Un Magíster del Misticismo domina tradiciones ajenas con respeto.', fit:['meticulous']},
    4:{role:'Profeta', principle:'Un Profeta ve el futuro y se prepara, sin intentar forzarlo.', fit:['cautious','intuitive']},
    3:{role:'Cognoscente', principle:'Un Cognoscente usa las leyes del mundo sin romperlas.', fit:['disciplined']},
    2:{role:'Ángel de la Sabiduría', principle:'Un Ángel de la Sabiduría revela sólo lo que es justo revelar.', fit:['secretive']},
    1:{role:'Ojo Omnisciente', principle:'El Ojo Omnisciente ve todo y elige no enloquecer.', fit:['anchored','disciplined']}
  }
};

/* ---------------------------------------------------------------------
   SEMILLAS DE ESCENA
   pw: vía · seqs: Sequences en las que aparece · npc: 'any'|'close'|'work'|
   'family' si la escena involucra a alguien de tu vida ({npc} en el texto).
   Las primeras de cada vía son las escenas originales del juego, con su
   mismo texto; se les agregó "align" y los efectos de digestión se
   reemplazaron por la evaluación de calidad del motor.
--------------------------------------------------------------------- */
const ACTING_SEEDS = [
  // ============================== FOOL ==============================
  {id:'fool_tarot_plaza', pw:'fool', seqs:[9], title:'Una lectura de tarot', text:'Una mujer te pide leerle las cartas en la plaza.',
    choices:[
      {label:'Realizar una lectura seria', small:'La guiás hacia lo que ella ya sabe.', align:'aligned', extra:{reputation:2}},
      {label:'Inventar una predicción', small:'Plata fácil.', align:'contradict', extra:{cash:[20,60]}},
      {label:'Usar tu Espiritualidad para buscar información real', small:'Ver de verdad, aunque cueste.', align:'bold', extra:{sanity:[-4,-2], corruption:[0,2]}},
      {label:'Rechazarla', small:'', align:'neutral'}
    ]},
  {id:'fool_hostile_crowd', pw:'fool', seqs:[8,7,6], title:'Un público difícil', text:'Te presentás ante un público hostil que no quiere reír.',
    choices:[
      {label:'Improvisar con humor arriesgado', small:'Todo o nada.', align:'bold', extra:{reputation:[1,3]}},
      {label:'Jugar seguro, con oficio', small:'Sonreír aunque nadie sonría.', align:'aligned'},
      {label:'Contestarle mal a un espectador', small:'Que se callen.', align:'contradict', extra:{reputation:-2}}
    ]},
  {id:'fool_friend_problem', pw:'fool', seqs:[9], npc:'close', title:'Una pregunta difícil', text:'{npc} te cuenta un problema y te pregunta, medio en broma, si podés "ver" cómo va a terminar.',
    choices:[
      {label:'Hacerle las preguntas justas para que llegue sola a la respuesta', small:'Guiar, no predecir.', align:'aligned', npcRel:{trust:4, respect:3}},
      {label:'Decirle exactamente lo que va a pasar, con detalles que no deberías saber', small:'Impresionar.', align:'contradict', npcRel:{suspicion:6, fear:3}},
      {label:'Hacer una adivinación de verdad, a escondidas, antes de contestar', small:'Arriesgarte por alguien que querés.', align:'bold', npcRel:{trust:5}, extra:{sanity:[-3,-1]}},
      {label:'Reírte y cambiar de tema', small:'', align:'neutral'}
    ]},
  {id:'fool_mocked', pw:'fool', seqs:[8], npc:'work', title:'Una burla', text:'{npc} se burla de vos delante de todos. Algunos se ríen.',
    choices:[
      {label:'Sonreír y convertir la burla en un chiste a tu costa', small:'El Payaso no sangra en público.', align:'aligned', npcRel:{respect:3}},
      {label:'Armar un número que deje a todos riendo, incluido él', small:'Más difícil. Más grande.', align:'bold', extra:{reputation:[1,3]}, npcRel:{affection:3}},
      {label:'Contestarle con furia', small:'Que aprenda.', align:'contradict', npcRel:{fear:4, affection:-5}},
      {label:'Irte sin decir nada', small:'', align:'neutral'}
    ]},
  {id:'fool_trick_prep', pw:'fool', seqs:[7], title:'La función de mañana', text:'Te invitaron a hacer "un número" en una reunión. Tenés una noche para prepararlo.',
    choices:[
      {label:'Preparar cada detalle, cada distracción, cada plan de escape', small:'El truco ocurre antes de la función.', align:'aligned'},
      {label:'Preparar un truco con poder real, disimulado como ilusión', small:'Que nadie note que no es un truco.', align:'bold', extra:{attention:[0,2]}},
      {label:'Improvisar sobre la marcha', small:'Talento puro.', align:'contradict'},
      {label:'Excusarte', small:'', align:'neutral'}
    ]},
  {id:'fool_other_face', pw:'fool', seqs:[6,5], title:'Otra cara', text:'Necesitás pasar una noche entera siendo otra persona: otro nombre, otra historia, otros gestos.',
    choices:[
      {label:'Habitar el papel sin olvidar quién sos', small:'Un ancla: tu nombre verdadero, repetido en silencio.', align:'aligned'},
      {label:'Perderte en el papel hasta que sea real', small:'La actuación perfecta.', align:'bold', extra:{humanity:-1}},
      {label:'Hacerlo a medias, dejando que se note', small:'Nadie se va a dar cuenta.', align:'contradict'}
    ]},
  {id:'fool_strings_meeting', pw:'fool', seqs:[5,4], npc:'any', title:'Una decisión ajena', text:'{npc} está por tomar una decisión que te conviene que tome distinto.',
    choices:[
      {label:'Mover los hilos desde atrás, sin que sepa que estuviste', small:'Nunca dejar ver la mano.', align:'aligned', npcRel:{dependence:3}},
      {label:'Pedírselo de frente', small:'Honesto. Fuera del papel.', align:'contradict', npcRel:{trust:3}},
      {label:'Controlar cada paso de su decisión', small:'Un titiritero absoluto.', align:'bold', npcRel:{dependence:6, suspicion:3}, extra:{corruption:[0,2]}}
    ]},

  // ============================== VISIONARY ==============================
  {id:'vis_observe', pw:'visionary', seqs:[9], title:'Observar sin ser visto', text:'Pasás la tarde observando a extraños, catalogando gestos y microexpresiones.',
    choices:[
      {label:'Análisis metódico', small:'Catalogar, entender, no intervenir.', align:'aligned'},
      {label:'Forzar la percepción más allá de lo cómodo', small:'Ver más de lo que se debe.', align:'bold', extra:{sanity:[-4,-2]}}
    ]},
  {id:'vis_foreign_thought', pw:'visionary', seqs:[8,7,6], title:'Un pensamiento ajeno', text:'Rozás, sin querer, un fragmento de la mente de un desconocido.',
    choices:[
      {label:'Retirarte de inmediato', small:'Escuchar sin quedarte.', align:'aligned'},
      {label:'Profundizar en el contacto', small:'Riesgo alto.', align:'bold', extra:{sanity:[-4,-1]}},
      {label:'Usar lo que escuchaste para sacar ventaja', small:'Él nunca lo sabría.', align:'contradict', extra:{cash:[10,40]}}
    ]},
  {id:'vis_family_fight', pw:'visionary', seqs:[9,8], npc:'family', title:'Una discusión familiar', text:'En una cena, {npc} y otro familiar empiezan a discutir. Vos ves perfectamente qué está pasando debajo de las palabras.',
    choices:[
      {label:'Observar y entender, sin meterte', small:'El Espectador no sube al escenario.', align:'aligned'},
      {label:'Intervenir y decirles exactamente lo que cada uno siente', small:'Tenés razón. Eso no alcanza.', align:'contradict', npcRel:{affection:-3, suspicion:4}},
      {label:'Leerlos a fondo, hasta el último gesto', small:'Ver todo, aunque duela.', align:'bold', extra:{sanity:[-3,-1]}, npcRel:{}}
    ]},
  {id:'vis_patient', pw:'visionary', seqs:[7,6], npc:'any', title:'Alguien que no está bien', text:'{npc} está pasando por algo oscuro. Lo notás antes que nadie.',
    choices:[
      {label:'Acompañarlo con paciencia, sin dejar que te arrastre', small:'Curar sin enfermarte.', align:'aligned', npcRel:{trust:5, dependence:4}},
      {label:'Meterte en su cabeza y arreglarlo de raíz', small:'Poder real sobre una mente ajena.', align:'bold', npcRel:{dependence:8}, extra:{corruption:[0,2]}},
      {label:'Cargar con su dolor como si fuera tuyo', small:'Empatía sin límites.', align:'contradict', extra:{sanity:[-6,-3]}, npcRel:{affection:6}}
    ]},
  {id:'vis_suggest', pw:'visionary', seqs:[6,5,4], title:'Una idea que no es tuya', text:'Necesitás que un funcionario tome una decisión. Tenés diez minutos de conversación.',
    choices:[
      {label:'Sembrar la idea para que crea que se le ocurrió a él', small:'La sugestión perfecta.', align:'aligned'},
      {label:'Hipnotizarlo abiertamente', small:'Rápido. Evidente.', align:'contradict', extra:{attention:[1,3]}},
      {label:'Reescribirle las ganas por completo', small:'Que no pueda querer otra cosa.', align:'bold', extra:{corruption:[1,3]}}
    ]},

  // ============================== RED PRIEST ==============================
  {id:'red_track', pw:'redPriest', seqs:[9], title:'Rastrear una presa', text:'Seguís el rastro de algo que no debería estar en la ciudad.',
    choices:[
      {label:'Rastrear con cautela', small:'Estudiar antes de actuar.', align:'aligned'},
      {label:'Perseguir agresivamente', small:'Cazar ya.', align:'bold', extra:{salud:[-6,0]}}
    ]},
  {id:'red_provoke', pw:'redPriest', seqs:[8,7,6], title:'Provocación deliberada', text:'Provocás a un objetivo para que revele su naturaleza.',
    choices:[
      {label:'Provocación calculada', small:'Encenderlo sin encenderte.', align:'aligned'},
      {label:'Ir a fondo', small:'Hasta que muestre los dientes.', align:'bold', extra:{salud:[-8,0]}},
      {label:'Perder la paciencia y pegarle', small:'La furia es tuya, no de él.', align:'contradict', extra:{reputation:-2}}
    ]},
  {id:'red_trap', pw:'redPriest', seqs:[9,8], npc:'work', title:'Un problema en el trabajo', text:'Alguien está robando en el trabajo y culpan a {npc}. Vos sospechás de otro.',
    choices:[
      {label:'Observarlo días enteros y tenderle una trampa', small:'Paciencia de cazador.', align:'aligned', npcRel:{trust:4, loyalty:4}},
      {label:'Acusar al sospechoso delante de todos', small:'Ahora.', align:'contradict', extra:{reputation:[-3,1]}},
      {label:'Seguir al ladrón de noche hasta su guarida', small:'La cacería real.', align:'bold', extra:{salud:[-5,0]}, npcRel:{loyalty:5}}
    ]},
  {id:'red_fire', pw:'redPriest', seqs:[7], title:'Fuego controlado', text:'Hace días que sentís el fuego en la punta de los dedos, esperando.',
    choices:[
      {label:'Practicar en un descampado, midiendo cada llama', small:'Vos decidís dónde arde.', align:'aligned'},
      {label:'Quemar algo que se lo merece', small:'Un depósito de un usurero.', align:'bold', extra:{attention:[1,3], corruption:[0,2]}},
      {label:'Dejar que se escape cuando te enojás', small:'Ya no controlás tanto.', align:'contradict', extra:{reputation:-2}}
    ]},
  {id:'red_conspire', pw:'redPriest', seqs:[6,5], title:'Antes de la pelea', text:'Sabés que alguien viene por vos. Tenés una semana.',
    choices:[
      {label:'Informarte, reclutar aliados y elegir el terreno', small:'Ganar antes de empezar.', align:'aligned'},
      {label:'Ir a buscarlo vos primero', small:'La mejor defensa.', align:'bold', extra:{salud:[-8,0]}},
      {label:'Esperar a ver qué pasa', small:'Quizás no venga.', align:'contradict'}
    ]},

  // ============================== DARKNESS ==============================
  {id:'dark_vigil', pw:'darkness', seqs:[9], title:'Vigilia nocturna', text:'Pasás la noche entera despierto, dejando que la oscuridad te enseñe algo.',
    choices:[
      {label:'Mantener la calma', small:'En paz con la noche.', align:'aligned'},
      {label:'Adentrarte en la oscuridad total', small:'Hasta donde no llega la luz.', align:'bold', extra:{sanity:[-4,-1]}}
    ]},
  {id:'dark_silence', pw:'darkness', seqs:[8,7,6], title:'Silencio absoluto', text:'Practicás moverte sin hacer el menor ruido durante horas.',
    choices:[
      {label:'Disciplina paciente', small:'Horas, sin apuro.', align:'aligned'},
      {label:'Forzar los sentidos al límite', small:'Riesgo alto.', align:'bold', extra:{sanity:[-5,-2]}}
    ]},
  {id:'dark_night_shift', pw:'darkness', seqs:[9], npc:'close', title:'Una noche larga', text:'{npc} no puede dormir y te encuentra despierto a las tres de la mañana, como siempre.',
    choices:[
      {label:'Quedarte con {npc} en silencio, vigilando la noche juntos', small:'El vigía acompaña.', align:'aligned', npcRel:{affection:4, trust:3}},
      {label:'Mandarle a dormir y salir a patrullar el barrio solo', small:'La noche es tuya.', align:'bold', npcRel:{affection:-1}},
      {label:'Quejarte de que ya no sabés qué hacer con tanta noche', small:'Rechazar lo que sos.', align:'contradict', npcRel:{suspicion:3}}
    ]},
  {id:'dark_poem', pw:'darkness', seqs:[8], npc:'any', title:'Un duelo', text:'{npc} perdió a alguien. En el velorio nadie sabe qué decir.',
    choices:[
      {label:'Recitarle en voz baja unos versos que calman', small:'Consolar sin herir.', align:'aligned', npcRel:{affection:6, trust:4}},
      {label:'Cantar para toda la sala, dejando que tu voz haga lo que sabe hacer', small:'Que todos descansen.', align:'bold', extra:{attention:[0,2]}, npcRel:{affection:4}},
      {label:'Decir la verdad sobre la muerte, sin adornos', small:'Honesto. Frío.', align:'contradict', npcRel:{affection:-4}}
    ]},
  {id:'dark_nightmare', pw:'darkness', seqs:[7,6], npc:'any', title:'Un mal sueño ajeno', text:'Sentís que {npc} está teniendo una pesadilla. Podrías entrar.',
    choices:[
      {label:'Entrar, entender qué la provoca y salir sin tocar nada', small:'Entender, no disfrutar.', align:'aligned', extra:{lore:{npcSecret:true}}},
      {label:'Entrar y cambiarle el sueño por completo', small:'Hacerle bien, a tu manera.', align:'bold', npcRel:{dependence:3}},
      {label:'Entrar y quedarte mirando su miedo', small:'Es fascinante.', align:'contradict', extra:{corruption:[1,3]}}
    ]},

  // ============================== DOOR ==============================
  {id:'door_stuck', pw:'door', seqs:[9], title:'Una puerta que no abre', text:'Encontrás una puerta vieja en un callejón que se niega a abrirse sin importar qué hagas.',
    choices:[
      {label:'Estudiar el mecanismo con calma', small:'Aprender antes de entrar.', align:'aligned'},
      {label:'Forzarla con tu incipiente poder', small:'Del otro lado hay algo.', align:'bold', extra:{sanity:[-3,-1]}},
      {label:'Dejarla, no es asunto tuyo', small:'', align:'neutral'}
    ]},
  {id:'door_shortcut', pw:'door', seqs:[8,7,6], title:'Un atajo imposible', text:'Cruzás una distancia que no debería poder cruzarse en tan poco tiempo.',
    choices:[
      {label:'Anotar cada detalle del cruce', small:'Aprender del truco.', align:'aligned'},
      {label:'Repetirlo una y otra vez', small:'Riesgo alto.', align:'bold', extra:{sanity:[-4,-1]}}
    ]},
  {id:'door_locked_room', pw:'door', seqs:[9], npc:'any', title:'Una habitación cerrada', text:'{npc} te pide ayuda: perdió la llave de un cuarto donde guardó algo importante.',
    choices:[
      {label:'Ayudarle a buscar la llave como cualquier persona', small:'Humildad de aprendiz.', align:'aligned', npcRel:{trust:3}},
      {label:'Abrir la puerta "de alguna forma" cuando no mira', small:'Nadie sabrá cómo.', align:'bold', npcRel:{suspicion:2, respect:3}},
      {label:'Entrar solo, mirar todo lo que guarda', small:'Curiosidad sin permiso.', align:'contradict', npcRel:{suspicion:5}, extra:{lore:{npcSecret:true}}}
    ]},
  {id:'door_stars', pw:'door', seqs:[7], npc:'any', title:'Una carta astral', text:'{npc} te pide que le leas las estrellas antes de una decisión importante.',
    choices:[
      {label:'Mostrarle las posibilidades y dejar que elija', small:'El futuro es una sugerencia.', align:'aligned', npcRel:{trust:4}},
      {label:'Decirle qué tiene que hacer', small:'Lo sabés.', align:'contradict', npcRel:{dependence:4}},
      {label:'Mirar tan lejos como puedas', small:'Aunque veas algo que no querías.', align:'bold', extra:{sanity:[-4,-2]}}
    ]},

  // ============================== TYRANT ==============================
  {id:'tyr_swim', pw:'tyrant', seqs:[9], title:'Nadar contra la corriente', text:'Te obligás a nadar mar adentro en pleno oleaje, mucho más allá de lo prudente.',
    choices:[
      {label:'Medir tus fuerzas con cuidado', small:'Respetar al mar.', align:'aligned'},
      {label:'Ir hasta el límite', small:'Que el mar te pruebe.', align:'bold', extra:{salud:[-8,0]}}
    ]},
  {id:'tyr_storm', pw:'tyrant', seqs:[8,7,6], title:'Domar la tormenta', text:'Te plantás a la intemperie durante una tormenta que cualquiera con sentido común estaría evitando.',
    choices:[
      {label:'Resistir con disciplina', small:'La tormenta se suelta cuando vos decidís.', align:'aligned'},
      {label:'Gritarle a la tormenta', small:'Alto riesgo.', align:'bold', extra:{salud:[-10,0]}}
    ]},
  {id:'tyr_crew', pw:'tyrant', seqs:[9,8], npc:'close', title:'Uno de los tuyos', text:'A {npc} lo están por golpear unos matones del puerto por una deuda.',
    choices:[
      {label:'Ponerte al lado de {npc} y bancar lo que venga', small:'No se abandona a la tripulación.', align:'aligned', npcRel:{loyalty:8, affection:4}, extra:{salud:[-6,0]}},
      {label:'Pagar la deuda y que te deba una', small:'Práctico. Poco marinero.', align:'contradict', extra:{cash:[-80,-30]}, npcRel:{dependence:5}},
      {label:'Soltar la furia contra los matones', small:'Como un temporal.', align:'bold', extra:{attention:[1,2], reputation:[0,2]}, npcRel:{fear:3, loyalty:6}}
    ]},
  {id:'tyr_rage_wrong', pw:'tyrant', seqs:[8], npc:'family', title:'Un día malo', text:'Llegás a casa con la ira hirviendo. {npc} dice algo que en otro momento no te molestaría.',
    choices:[
      {label:'Guardarte la tormenta para quien la merece', small:'La ira es un arma, no un reflejo.', align:'aligned', npcRel:{trust:2}},
      {label:'Salir a descargarla contra el mar, a los gritos', small:'Soltarla donde no daña.', align:'bold', extra:{salud:[-3,0]}},
      {label:'Explotar contra {npc}', small:'Ya está.', align:'contradict', npcRel:{fear:8, affection:-8}}
    ]},

  // ============================== TWILIGHT GIANT ==============================
  {id:'tg_real_fight', pw:'twilightGiant', seqs:[9], title:'Combate real', text:'Buscás un enfrentamiento físico genuino para poner a prueba tus nuevos límites.',
    choices:[
      {label:'Entrenar con un rival de confianza', small:'Disciplina diaria.', align:'aligned'},
      {label:'Buscar un oponente serio', small:'Probarte de verdad.', align:'bold', extra:{salud:[-10,0]}}
    ]},
  {id:'tg_take_hit', pw:'twilightGiant', seqs:[8,7,6], title:'Aguantar el golpe', text:'Practicás quedarte firme y absorber un golpe en vez de esquivarlo.',
    choices:[
      {label:'Practicar con moderación', small:'Progreso estable.', align:'aligned'},
      {label:'No retroceder ni un paso', small:'Alto riesgo.', align:'bold', extra:{salud:[-12,-2]}}
    ]},
  {id:'tg_bar_brawl', pw:'twilightGiant', seqs:[9,8], title:'Una pelea que no vale la pena', text:'En la taberna, un borracho te provoca para pelear. Todo el mundo mira.',
    choices:[
      {label:'Rechazar la pelea con respeto', small:'No toda pelea vale la pena.', align:'aligned', extra:{reputation:[0,2]}},
      {label:'Aceptar y terminarla con un solo golpe', small:'Sin crueldad.', align:'bold', extra:{reputation:[-1,2]}},
      {label:'Aceptar y humillarlo', small:'Que aprenda.', align:'contradict', extra:{reputation:-2}}
    ]},
  {id:'tg_protect', pw:'twilightGiant', seqs:[6,5], npc:'any', title:'Alguien en peligro', text:'Algo acecha a {npc}. Vos lo ves venir.',
    choices:[
      {label:'Ponerte delante y recibir lo que venga', small:'El Guardián recibe el golpe.', align:'aligned', npcRel:{loyalty:8, affection:5}, extra:{salud:[-8,-2]}},
      {label:'Cazar a la cosa antes de que llegue', small:'Atacar primero.', align:'bold', extra:{salud:[-10,0]}},
      {label:'Avisarle y mantenerte lejos', small:'No es tu pelea.', align:'contradict', npcRel:{trust:-3}}
    ]},

  // ============================== HERMIT ==============================
  {id:'her_secret_other', pw:'hermit', seqs:[9], title:'Un secreto ajeno', text:'Percibís, sin proponértelo, que alguien cercano oculta algo que no debería.',
    choices:[
      {label:'Anotarlo y no actuar', small:'Guardar el conocimiento.', align:'aligned'},
      {label:'Confirmarlo por tu cuenta', small:'Tirar del hilo.', align:'bold', extra:{sanity:[-3,-1], reputation:[-2,0]}}
    ]},
  {id:'her_too_much', pw:'hermit', seqs:[8,7,6], title:'Demasiado conocimiento', text:'Un fragmento de saber prohibido se te queda dando vueltas en la cabeza sin parar.',
    choices:[
      {label:'Dejarlo reposar', small:'Seguro.', align:'aligned'},
      {label:'Perseguirlo hasta el final', small:'Riesgo alto.', align:'bold', extra:{sanity:[-5,-2], corruption:[0,2]}}
    ]},
  {id:'her_npc_mystery', pw:'hermit', seqs:[9,8], npc:'any', title:'Algo no cierra', text:'Hay algo en {npc} que no cierra: una historia que cambia, una ausencia que nadie explica.',
    choices:[
      {label:'Investigar en silencio hasta entender', small:'Curiosidad paciente.', align:'aligned', extra:{lore:{npcSecret:true}}},
      {label:'Preguntarle directamente', small:'Sin rodeos.', align:'contradict', npcRel:{suspicion:4}},
      {label:'Revisar sus cosas cuando no esté', small:'La verdad, cueste lo que cueste.', align:'bold', npcRel:{suspicion:3}, extra:{lore:{npcSecret:true}}}
    ]},
  {id:'her_spell', pw:'hermit', seqs:[7,6], title:'Un hechizo nuevo', text:'Encontraste la descripción de un hechizo que todavía no probaste.',
    choices:[
      {label:'Prepararlo durante días y probarlo en condiciones controladas', small:'Herramienta, no impulso.', align:'aligned'},
      {label:'Probarlo esa misma noche', small:'Ya.', align:'contradict', extra:{salud:[-4,0], sanity:[-3,0]}},
      {label:'Mejorarlo con una variante propia', small:'El saber que no se usa no sirve.', align:'bold', extra:{sanity:[-4,-1]}}
    ]},

  // ============================== SUN ==============================
  {id:'sun_chant', pw:'sun', seqs:[9], title:'Un cántico para desconocidos', text:'Improvisás un cántico de aliento para un grupo de extraños asustados durante una emergencia.',
    choices:[
      {label:'Cantar con sinceridad', small:'Coraje para otros.', align:'aligned', extra:{reputation:2}},
      {label:'Forzar la voz más allá de lo prudente', small:'Que llegue a todos.', align:'bold', extra:{sanity:[-4,-2]}},
      {label:'Pasar la gorra después', small:'Cantar tiene su precio.', align:'contradict', extra:{cash:[10,30]}}
    ]},
  {id:'sun_contract', pw:'sun', seqs:[8,7,6], title:'Un contrato a medio cumplir', text:'Alguien te pide hacer valer un juramento que la otra parte ya empezó a romper.',
    choices:[
      {label:'Exigir su cumplimiento con firmeza', small:'Alto riesgo/recompensa.', align:'bold', extra:{reputation:[-2,3]}},
      {label:'Mediar con cautela', small:'Firme, sin odio.', align:'aligned'},
      {label:'Cobrarle a los dos por no meterte', small:'Negocio.', align:'contradict', extra:{cash:[20,60]}}
    ]},
  {id:'sun_sick_friend', pw:'sun', seqs:[9,8], npc:'close', title:'Un mal día', text:'{npc} está pasando por el peor momento de su año.',
    choices:[
      {label:'Cantarle, acompañarle, sin pedir nada', small:'La luz no cobra.', align:'aligned', npcRel:{affection:6, trust:3}},
      {label:'Bendecirle con toda tu luz, aunque te agote', small:'Todo lo que tenés.', align:'bold', extra:{sanity:[-3,-1]}, npcRel:{affection:5, dependence:3}},
      {label:'Decirle que debería rezar más', small:'Juzgar.', align:'contradict', npcRel:{affection:-4}}
    ]},

  // ============================== HANGED MAN ==============================
  {id:'hang_whisper', pw:'hangedMan', seqs:[9], title:'Un susurro no pedido', text:'Algo te habla desde un rincón de sombra que no debería poder hablar.',
    choices:[
      {label:'Escuchar con cautela', small:'Tomar lo que sirve.', align:'aligned', extra:{sanity:-2}},
      {label:'Escuchar sin reservas', small:'Más progreso, riesgo real.', align:'bold', extra:{sanity:[-6,-2], corruption:[0,2]}},
      {label:'Responderle', small:'Nunca se responde.', align:'contradict', extra:{corruption:[2,4]}}
    ]},
  {id:'hang_small_price', pw:'hangedMan', seqs:[8,7,6], title:'Un precio pequeño', text:'Sentís que un ritual menor podría avanzar más rápido si estás dispuesto a sacrificar algo propio.',
    choices:[
      {label:'Ofrecer sólo lo mínimo', small:'Disciplina.', align:'aligned', extra:{sanity:-1}},
      {label:'Ofrecer de verdad', small:'Riesgo alto.', align:'bold', extra:{sanity:[-5,-2], corruption:[1,3]}},
      {label:'Ofrecer algo que no es tuyo', small:'Ajeno.', align:'contradict', extra:{corruption:[3,5]}}
    ]},
  {id:'hang_fast', pw:'hangedMan', seqs:[7], title:'Una semana de ayuno', text:'La disciplina de la sombra pide renuncias. Esta semana, todas.',
    choices:[
      {label:'Ayunar, callar y dormir en el piso', small:'El sacrificio diario.', align:'aligned', extra:{salud:[-3,-1]}},
      {label:'Llevarlo al extremo: nada durante siete días', small:'Hasta ver visiones.', align:'bold', extra:{salud:[-8,-3], sanity:[-3,0]}},
      {label:'Darte todos los gustos esa semana', small:'Mañana empezás.', align:'contradict', extra:{sanity:[1,3]}}
    ]},

  // ============================== DEATH ==============================
  {id:'death_corpse', pw:'death', seqs:[9], title:'Un cuerpo sin reclamar', text:'Te cruzás con un cadáver que nadie fue a buscar. Algo en vos sabe exactamente qué hacer con eso.',
    choices:[
      {label:'Estudiarlo con respeto', small:'Trabajo, no espectáculo.', align:'aligned'},
      {label:'Ir más allá de lo razonable', small:'Aprender todo lo que tiene para decir.', align:'bold', extra:{sanity:[-4,-1], corruption:[0,2]}}
    ]},
  {id:'death_voice', pw:'death', seqs:[8,7,6], title:'Una voz desde el otro lado', text:'Un espíritu reciente busca tu atención, todavía sin entender del todo que ya no tiene cuerpo.',
    choices:[
      {label:'Guiarlo con paciencia', small:'Ayudarlo a irse.', align:'aligned'},
      {label:'Usarlo para practicar sin cuidado', small:'Riesgo alto.', align:'contradict', extra:{sanity:[-5,-2], reputation:-2}},
      {label:'Llevar su mensaje a su familia', small:'Aunque te tomen por loco.', align:'bold', extra:{reputation:[-3,1]}}
    ]},
  {id:'death_funeral', pw:'death', seqs:[9,8], npc:'any', title:'Un entierro', text:'Muere un vecino y {npc} no se anima a ocuparse del cuerpo.',
    choices:[
      {label:'Ocuparte vos, con calma y respeto', small:'Sin miedo.', align:'aligned', npcRel:{respect:5}},
      {label:'Quedarte a solas con el cuerpo "un rato más"', small:'Hay cosas que sólo te dice a vos.', align:'bold', npcRel:{suspicion:4}},
      {label:'Hacer chistes para aflojar el clima', small:'Espectáculo.', align:'contradict', npcRel:{affection:-3}}
    ]},

  // ============================== MOON ==============================
  {id:'moon_remedy', pw:'moon', seqs:[9], title:'Un remedio para la vecina', text:'Una vecina con una tos que no se le va te pide "algo casero". Sabés exactamente qué mezclar.',
    choices:[
      {label:'Preparar un remedio suave y probado', small:'Primero no dañar.', align:'aligned', extra:{reputation:2}},
      {label:'Probar una mezcla más potente, sin testear', small:'Más progreso, riesgo de dañarla.', align:'bold', extra:{reputation:[-3,3]}},
      {label:'Cobrarle bien por el favor', small:'Negocio.', align:'contradict', extra:{cash:[20,50]}}
    ]},
  {id:'moon_dog', pw:'moon', seqs:[8,7,6], title:'Un perro al que nadie se acerca', text:'En el puerto hay un perro enorme que muerde a cualquiera. El dueño ya habla de sacrificarlo.',
    choices:[
      {label:'Acercarte con paciencia, día tras día', small:'Paciencia y firmeza.', align:'aligned'},
      {label:'Imponerte de golpe, mirándolo a los ojos', small:'Riesgo alto.', align:'bold', extra:{salud:[-8,0]}},
      {label:'Pegarle hasta que obedezca', small:'Crueldad.', align:'contradict', extra:{corruption:[1,2]}}
    ]},
  {id:'moon_thirst', pw:'moon', seqs:[8,7,6], title:'La sed', text:'Hace días que algo en vos pide sangre. No es metáfora, y lo sabés.',
    choices:[
      {label:'Resistirla con disciplina', small:'Beber lo justo, cuando corresponda.', align:'aligned', extra:{sanity:-1}},
      {label:'Saciarla con un animal, a escondidas', small:'Controlado.', align:'bold', extra:{corruption:[1,2]}},
      {label:'Dejarte llevar, sin cuidado', small:'Extremo.', align:'contradict', extra:{corruption:[3,6], sanity:[-6,-2], reputation:-3}}
    ]},
  {id:'moon_red', pw:'moon', seqs:[5,4,3,2,1], title:'La luna carmesí', text:'Una noche la luna sale roja y sentís que te llama por un nombre que todavía no es el tuyo.',
    choices:[
      {label:'Contemplarla sin responder', small:'Prudente.', align:'aligned'},
      {label:'Responderle', small:'Riesgo alto.', align:'bold', extra:{sanity:[-7,-3], corruption:[2,4]}}
    ]},

  // ============================== ERROR ==============================
  {id:'err_pocket', pw:'error', seqs:[9], title:'Un bolsillo al alcance', text:'En el tranvía lleno, un hombre de traje caro lleva la billetera casi afuera del saco.',
    choices:[
      {label:'Sacársela con limpieza y devolverla "encontrada"', small:'Nadie nota nada. Nadie pierde nada.', align:'aligned', extra:{reputation:1}},
      {label:'Quedártela', small:'Plata, y riesgo.', align:'bold', extra:{cash:[30,90]}},
      {label:'Arrebatársela y correr', small:'Violencia torpe.', align:'contradict', extra:{cash:[20,60], reputation:-3}},
      {label:'Dejarla pasar', small:'', align:'neutral'}
    ]},
  {id:'err_lie', pw:'error', seqs:[8,7,6], title:'Una mentira grande', text:'Tenés la oportunidad de convencer a un prestamista de que ya le pagaste. Todo depende de cómo lo digas.',
    choices:[
      {label:'Una mentira chica y verosímil', small:'La que él quiere creer.', align:'aligned', extra:{cash:[10,30]}},
      {label:'Una mentira enorme, sin fisuras', small:'Alto riesgo/recompensa.', align:'bold', extra:{cash:[60,150]}},
      {label:'Amenazarlo', small:'Sin gracia.', align:'contradict', extra:{reputation:-3}}
    ]},
  {id:'err_cipher', pw:'error', seqs:[8,7,6], title:'Un cifrado ajeno', text:'Encontrás una carta en un código que no reconocés. Alguien se tomó mucho trabajo para que nadie la lea.',
    choices:[
      {label:'Descifrarla con método, sin apuro', small:'El patrón siempre está.', align:'aligned'},
      {label:'Forzar la clave con tu intuición', small:'Más progreso, riesgo de leer algo que no debías.', align:'bold', extra:{sanity:[-4,-1], corruption:[0,2]}}
    ]},
  {id:'err_crack', pw:'error', seqs:[5,4,3,2,1], title:'Una regla con una grieta', text:'Notás que una de las reglas que sostienen algo — un contrato, un sello, un ritual ajeno — tiene una falla que nadie vio.',
    choices:[
      {label:'Anotarla y no tocarla', small:'Prudente.', align:'aligned'},
      {label:'Colarte por la grieta', small:'Riesgo alto.', align:'bold', extra:{sanity:[-6,-3], corruption:[2,4]}}
    ]},
  {id:'err_friend_wallet', pw:'error', seqs:[9,8], npc:'close', title:'La tentación', text:'{npc} deja su billetera sobre la mesa y sale un momento.',
    choices:[
      {label:'Ni tocarla: a los tuyos no', small:'La gracia no es robarle a cualquiera.', align:'aligned', npcRel:{}},
      {label:'Esconderla y "encontrarla" cuando vuelva', small:'Un truco inofensivo.', align:'bold', npcRel:{trust:2}},
      {label:'Sacarle unos billetes', small:'No se va a dar cuenta.', align:'contradict', extra:{cash:[10,30]}, npcRel:{suspicion:4}}
    ]},

  // ============================== WHITE TOWER ==============================
  {id:'wt_library', pw:'whiteTower', seqs:[9], title:'Una biblioteca entera', text:'Conseguís acceso a la biblioteca de una universidad por una tarde. Es mucho más de lo que se puede leer en una vida.',
    choices:[
      {label:'Leer con método, tomando notas', small:'Cada libro, un escalón.', align:'aligned'},
      {label:'Devorar todo lo posible sin parar', small:'Hambre.', align:'bold', extra:{sanity:[-4,-2]}},
      {label:'Buscar sólo textos prohibidos', small:'Atajos.', align:'contradict', extra:{sanity:[-4,0], clue:{pathway:'whiteTower', reliability:'real', strength:[2,4]}}}
    ]},
  {id:'wt_case', pw:'whiteTower', seqs:[8,7,6], title:'Un caso sin resolver', text:'La policía archivó la muerte de un comerciante como accidente. Vos ves al menos tres detalles que no cierran.',
    choices:[
      {label:'Reconstruir el caso con paciencia', small:'Pruebas antes que conclusiones.', align:'aligned', extra:{reputation:2}},
      {label:'Confrontar al sospechoso con tu deducción', small:'La verdad incomoda. Decila.', align:'bold', extra:{salud:[-6,0], reputation:[0,4]}},
      {label:'Acusar al primero que te parezca culpable', small:'Apurarse.', align:'contradict', extra:{reputation:-3}}
    ]},
  {id:'wt_imitate', pw:'whiteTower', seqs:[8,7,6], title:'Imitar un poder', text:'Viste a otro Beyonder usar una habilidad. Creés entender cómo funciona por dentro.',
    choices:[
      {label:'Analizarla en teoría, sin probar', small:'Sin pruebas, nada.', align:'aligned'},
      {label:'Intentar reproducirla', small:'Riesgo alto.', align:'bold', extra:{sanity:[-5,-2], salud:[-4,0]}}
    ]},
  {id:'wt_future', pw:'whiteTower', seqs:[5,4,3,2,1], title:'Un fragmento del futuro', text:'Por un instante ves algo que todavía no pasó. Es nítido, y es sobre alguien que conocés.',
    choices:[
      {label:'Registrarlo y no intervenir', small:'Prepararse, no forzar.', align:'aligned'},
      {label:'Mirar más allá, hasta el final', small:'Riesgo alto.', align:'bold', extra:{sanity:[-8,-3], corruption:[1,3]}}
    ]}
];

/* Moldes genéricos: se arman con el rol y el principio de la Sequence
   actual. Garantizan que TODA Sequence de TODA vía tenga escenas propias
   aunque no haya una semilla escrita a mano, y se mezclan con las semillas
   para que la práctica no se vuelva repetitiva. */
const ACTING_GENERIC = [
  {id:'gen_live_role', title:'Vivir el papel', text:'Hoy la vida te pone en una situación en la que un {role} sabría exactamente qué hacer.',
    choices:[
      {label:'Actuar según lo que haría un {role}, con sutileza', small:'Sin que nadie lo note.', align:'aligned'},
      {label:'Llevar el papel de {role} hasta el extremo', small:'Todo o nada.', align:'bold', extra:{sanity:[-3,0]}},
      {label:'Hacer lo que te sale natural, aunque no sea lo que haría un {role}', small:'Ser vos, nada más.', align:'contradict'},
      {label:'No exponerte hoy', small:'', align:'neutral'}
    ]},
  {id:'gen_temptation', title:'Un atajo fuera del papel', text:'Se te presenta una forma fácil y cómoda de resolver algo que venías arrastrando... pero no es lo que haría un {role}.',
    choices:[
      {label:'Resolverlo como lo haría un {role}, aunque cueste más', small:'El camino largo.', align:'aligned'},
      {label:'Tomar el atajo', small:'Nadie se va a enterar.', align:'contradict', extra:{cash:[10,40]}},
      {label:'Resolverlo como un {role}, y de paso probar tus límites', small:'Arriesgado.', align:'bold', extra:{salud:[-4,0], sanity:[-3,0]}}
    ]},
  {id:'gen_witness', npc:'any', title:'Alguien mira', text:'{npc} está presente justo cuando tenés la oportunidad de comportarte como un {role}.',
    choices:[
      {label:'Actuar como un {role}, sin exagerar', small:'Que lo vea sin entender del todo.', align:'aligned', npcRel:{respect:3}},
      {label:'Mostrarle a {npc} de lo que es capaz un {role}', small:'Impresionar tiene su riesgo.', align:'bold', npcRel:{fear:3, respect:4, suspicion:3}},
      {label:'Esconder lo que sos y comportarte como cualquiera', small:'Seguro. Fuera del papel.', align:'contradict'}
    ]},
  {id:'gen_doubt', title:'Una noche de dudas', text:'No podés dejar de pensar en qué significa realmente ser un {role}, y en qué te está convirtiendo.',
    choices:[
      {label:'Repasar el principio de tu Sequence y aceptarlo', small:'Entender es digerir.', align:'aligned', extra:{sanity:[0,2]}},
      {label:'Rechazar el papel: vos no sos eso', small:'Aferrarte a lo que eras.', align:'contradict', extra:{sanity:[1,3]}},
      {label:'Abrazar el papel sin reservas', small:'Ser sólo eso.', align:'bold', extra:{humanity:-1}}
    ]}
];
