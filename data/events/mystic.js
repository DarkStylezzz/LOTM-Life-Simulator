'use strict';
/* =========================================================================
   data/events/mystic.js — roces con lo sobrenatural (§14, §17, §41, §59).
   Los "ganchos místicos" originales ya no suman conocimiento directo a una
   vía con nombre: dejan PISTAS (clue) que pueden ser reales, parciales o
   falsas, y que el jugador ve con descriptores vagos ("algo relacionado
   con la noche") hasta identificar la vía. Son deliberadamente poco
   frecuentes para quien no busca nada (§59: no hacer demasiado frecuente
   lo sobrenatural) y se multiplican si el jugador se mete.
   clue.reliability: real | partial | false | mixed (se sortea al aplicarse)
   ========================================================================= */
const EVENTS_MYSTIC = [
  // ---------------- ganchos originales (texto conservado) ----------------
  {id:'myst_cain_client', type:'mystic', rarity:'mystic', tags:['cain','symbol'], weight:6, cooldown:60, repeatable:false,
    context:(ctx)=>{ const n = npcById('extraño'); if(!n || !n.alive) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ meetNpc(ctx.npc); applyEffects({clue:{pathway:ctx.npc.hidden.pathway || '$random', reliability:'real', strength:[2,5], source:'los símbolos del Sr. Cain'}, exposure:2});
      addItem('doc_symbol', 1, 'dibujado por el Sr. Cain en una servilleta');
      return {title:'Un cliente extraño', text:'El Sr. Cain, un cliente poco habitual, te pregunta por símbolos que jamás habías visto antes de dibujarlos él mismo en una servilleta. Te quedás con la servilleta.'}; }},
  {id:'myst_rumors_perceive', type:'mystic', rarity:'mystic', tags:['rumor'], weight:5, cooldown:24,
    run:()=>{ applyEffects({clue:{pathway:'visionary', reliability:'mixed', strength:[2,5], source:'rumores en un café'}}); return {title:'Rumores', text:'Escuchás en un café rumores sobre personas capaces de percibir cosas que nadie más nota.'}; }},
  {id:'myst_night_stories', type:'mystic', rarity:'mystic', tags:['night'], weight:5, cooldown:24,
    run:()=>{ applyEffects({clue:{pathway:'darkness', reliability:'mixed', strength:[2,5], source:'un vecino insomne'}}); return {title:'Historias nocturnas', text:'Un vecino insomne jura haber visto algo imposible caminando entre las sombras de la calle.'}; }},
  {id:'myst_hunters', type:'mystic', rarity:'mystic', tags:['rumor','hunt'], weight:4, cooldown:24,
    run:()=>{ applyEffects({clue:{pathway:'redPriest', reliability:'mixed', strength:[2,5], source:'habladurías sobre cazadores'}}); return {title:'Cazadores', text:'Se habla de un grupo que caza criaturas que "oficialmente" no existen.'}; }},
  {id:'myst_door_wall', type:'mystic', rarity:'mystic', tags:['door'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'door', reliability:'real', strength:[2,5], source:'una puerta que no debería estar ahí'}, sanity:[-1,0]}); return {title:'Una puerta que no debería estar ahí', text:'De camino a casa, jurarías haber visto una puerta apoyada contra una pared donde ayer no había nada.'}; }},
  {id:'myst_sailors', type:'mystic', rarity:'mystic', tags:['sea'], weight:4, cooldown:24,
    hiddenRequirements:()=>currentCity().port || chance(0.4),
    run:()=>{ applyEffects({clue:{pathway:'tyrant', reliability:'mixed', strength:[2,5], source:'marineros del puerto'}}); return {title:'Marineros con historias raras', text:'En el puerto, un grupo de marineros insiste en que sobrevivieron a una tormenta que "los reconoció" por su nombre.'}; }},
  {id:'myst_fighter', type:'mystic', rarity:'mystic', tags:['combat'], weight:3, cooldown:24,
    run:()=>{ applyEffects({clue:{pathway:'twilightGiant', reliability:'mixed', strength:[2,5], source:'un combatiente fuera de serie'}}); return {title:'Un combatiente fuera de serie', text:'En un gimnasio local, alguien derriba a cinco oponentes seguidos sin apenas despeinarse.'}; }},
  {id:'myst_collector', type:'mystic', rarity:'mystic', tags:['secret'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'hermit', reliability:'real', strength:[2,5], source:'un anticuario'}}); return {title:'Un coleccionista de secretos', text:'Un anticuario te muestra, a cambio de nada en especial, un objeto que "sabe cosas que no debería saber".'}; }},
  {id:'myst_vigil_chant', type:'mystic', rarity:'mystic', tags:['faith','light'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'sun', reliability:'real', strength:[2,5], source:'una vigilia religiosa'}}); return {title:'Un cántico en la vigilia', text:'En una vigilia religiosa, alguien canta algo que hace que las velas ardan un poco más brillantes de lo que deberían.'}; }},
  {id:'myst_shadow_voice', type:'mystic', rarity:'mystic', tags:['shadow'], weight:3, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'hangedMan', reliability:'mixed', strength:[2,5], source:'un conocido asustado'}}); return {title:'Una voz desde la sombra', text:'Un conocido jura haber escuchado, en un rincón sin luz, algo que le "ofrecía" un trato a cambio de casi nada.'}; }},
  {id:'myst_gravedigger', type:'mystic', rarity:'mystic', tags:['death'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'death', reliability:'real', strength:[2,5], source:'un cementerio'}}); return {title:'El sepulturero extraño', text:'En un cementerio, alguien parece hablar en voz baja con las tumbas — y jurarías que, por un segundo, algo le contesta.'}; }},
  {id:'myst_herbalist', type:'mystic', rarity:'mystic', tags:['moon'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'moon', reliability:'mixed', strength:[2,5], source:'la herborista del mercado'}}); if(chance(0.4)) addRumor('moon_herbalist');
      return {title:'La herborista del mercado', text:'Una vieja del mercado vende remedios que funcionan demasiado bien. Cuando le preguntás qué llevan, se ríe y mira la luna.'}; }},
  {id:'myst_dogs', type:'mystic', rarity:'mystic', tags:['moon','beast'], requirements:{ageMin:16}, weight:2, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'moon', reliability:'real', strength:[3,6], source:'un hombre y una jauría'}, sanity:-2}); return {title:'Un perro que obedece a nadie', text:'Ves a un hombre calmar con una sola mirada a una jauría de perros callejeros. Después se limpia algo rojo de la comisura de los labios.'}; }},
  {id:'myst_impossible_theft', type:'mystic', rarity:'mystic', tags:['theft'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'error', reliability:'mixed', strength:[2,5], source:'una noticia policial'}}); return {title:'El robo imposible', text:'El diario cuenta que vaciaron la caja fuerte de un banco sin forzar nada. Lo raro es que los empleados no recuerdan qué había adentro.'}; }},
  {id:'myst_monocle', type:'mystic', rarity:'mystic', tags:['theft'], requirements:{ageMin:16}, weight:2, cooldown:48,
    run:()=>{ applyEffects({clue:{pathway:'error', reliability:'real', strength:[3,6], source:'un hombre de monóculo'}}); return {title:'Un monóculo en la multitud', text:'Un hombre con monóculo te sonríe al pasar. Recién a la cuadra te das cuenta de que te falta algo, y no sabés qué.'}; }},
  {id:'myst_reader', type:'mystic', rarity:'mystic', tags:['knowledge'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'whiteTower', reliability:'mixed', strength:[2,5], source:'la biblioteca pública'}}); return {title:'El lector voraz', text:'En la biblioteca pública, un joven da vuelta las páginas a una velocidad absurda. El bibliotecario jura que después recita cada libro de memoria.'}; }},
  {id:'myst_detective', type:'mystic', rarity:'mystic', tags:['knowledge'], requirements:{ageMin:16}, weight:2, cooldown:48,
    run:()=>{ applyEffects({clue:{pathway:'whiteTower', reliability:'mixed', strength:[3,6], source:'un investigador privado'}}); if(chance(0.35)) addRumor('detective');
      return {title:'Un detective que no pregunta', text:'Un investigador privado resuelve en una tarde un caso que tenía a la policía en vilo hace meses. Dice que "estaba todo a la vista".'}; }},
  {id:'myst_strange_book', type:'mystic', rarity:'mystic', tags:['book'], weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[4,9], source:'un libro de segunda mano'}, sanity:-2}); addItem('book_mystic_fragment', 1, 'una librería de segunda mano');
      return {title:'Un libro extraño', text:'En una librería de segunda mano encontrás un libro con anotaciones que no deberían tener sentido... y sin embargo lo tienen.'}; }},
  {id:'myst_cain_returns', type:'mystic', rarity:'mystic', tags:['cain'], weight:3, cooldown:48,
    context:(ctx)=>{ const n = npcById('extraño'); if(!n || !n.alive || !n.met) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:8, respect:3}); applyEffects({clue:{pathway:ctx.npc.hidden.pathway||'$random', reliability:'real', strength:[3,7], source:'el Sr. Cain'}});
      const f = ctx.npc.hidden.faction;
      if(f==='tarotClub'){ tarotHear('el Sr. Cain'); return {title:'Sr. Cain vuelve', text:'El extraño cliente regresa. Esta vez insinúa pertenecer a "un club poco convencional", que se reúne "más arriba de donde llegan las nubes".'}; }
      if(f==='aurora'){ return {title:'Sr. Cain vuelve', text:'El extraño cliente regresa. Esta vez te habla de "un grupo que devuelve lo que la vida te quitó". Sonríe demasiado.'}; }
      return {title:'Sr. Cain vuelve', text:'El extraño cliente regresa. Esta vez te hace preguntas sobre vos. Demasiado precisas para ser curiosidad.'}; }},
  {id:'myst_tarot_card', type:'mystic', rarity:'mystic', tags:['tarot'], weight:2, cooldown:48,
    hiddenRequirements:()=>STATE.flags.mysticExposure>15,
    run:()=>{ STATE.flags.tarotHint = (STATE.flags.tarotHint||0)+1; addItem('tarot_card', 1, 'encontrada fuera de lugar'); tarotHear('una carta fuera de lugar');
      return {title:'Una carta de tarot', text:'Encontrás una carta de tarot fuera de lugar, con un símbolo que no pertenece a ningún mazo comercial.'}; }},
  {id:'myst_strange_object', type:'mystic', rarity:'mystic', tags:['artifact'], weight:2, cooldown:60,
    hiddenRequirements:()=>STATE.flags.mysticExposure>10,
    run:()=>{ const k = randomArtifactKey(); addArtifact(k, 'encontrado por casualidad');
      return {title:'Un objeto extraño', text:'Encontrás ' + ARTIFACTS[k].foundText + ' No tenés idea de qué hacer con él todavía.'}; }},
  {id:'myst_dream', type:'mystic', rarity:'mystic', tags:['dream'], weight:3, cooldown:24,
    run:()=>{ applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'un sueño'}}); return {title:'Un sueño distinto', text:'Tenés un sueño que se siente más real que cualquier otro — con una lógica propia, casi deliberada.'}; }},
  {id:'myst_radio', type:'mystic', rarity:'mystic', tags:['entity'], weight:2, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'una emisora imposible'}, sanity:-2}); return {title:'Una emisora pirata', text:'Sintonizás por accidente una frecuencia de radio que no debería existir, transmitiendo algo que no termina de ser lenguaje.'}; }},
  {id:'myst_classified', type:'mystic', rarity:'mystic', tags:['code'], weight:2, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'un aviso clasificado'}}); if(chance(0.3)) addRumor();
      return {title:'Un anuncio clasificado', text:'En el diario, entre los avisos comunes, hay uno escrito en un código que no deberías poder entender — y sin embargo lo entendés.'}; }},

  // ---------------- según tu Sequence (originales) ----------------
  {id:'bey_clumsy', type:'pathway', rarity:'uncommon', tags:['beyonder'], requirements:{beyonder:true, seqMin:7}, weight:5, cooldown:12,
    context:(ctx)=>{ ctx.npc = pick(closeNpcs()) || null; return ctx; },
    run:(ctx)=>{ applyEffects({sanity:[-5,-2], attention:1}); if(ctx.npc) adjustRel(ctx.npc, {suspicion:[3,7]});
      return {title:'Torpeza de principiante', text:`Un pequeño desliz con tu poder casi te delata${ctx.npc ? ' frente a '+ctx.npc.name : ' frente a alguien común'}. Todavía te falta control.`}; }},
  {id:'bey_small_win', type:'pathway', rarity:'common', tags:['beyonder'], requirements:{beyonder:true, seqMin:7}, weight:4, cooldown:12,
    run:()=>{ applyEffects({reputation:[1,3], sanity:[1,3]}); return {title:'Un pequeño triunfo', text:'Usás tu poder recién adquirido para resolver algo cotidiano. Se siente bien tener con qué.'}; }},
  {id:'bey_org_notes', type:'pathway', rarity:'uncommon', tags:['beyonder','faction'], requirements:{beyonder:true, seqMin:5, seqMax:6}, weight:4, cooldown:36,
    run:()=>{ applyEffects({clue:{pathway:'$chosen', reliability:'real', strength:[2,5]}, attention:3}); const f = factionThatNotices(); if(f) factionAdjust(f, {suspicion:6});
      return {title:'Una organización toma nota', text:'Alguien con recursos reales empieza a prestarte atención. Ya no sos invisible para el mundo oculto.'}; }},
  {id:'bey_weight', type:'pathway', rarity:'uncommon', tags:['beyonder'], requirements:{beyonder:true, seqMin:5, seqMax:6}, weight:3, cooldown:24,
    run:()=>{ applyEffects({sanity:[-9,-4], corruption:[1,3]}); return {title:'El peso real del poder', text:'Empezás a entender que lo que ganaste tiene un costo que recién ahora se hace visible.'}; }},
  {id:'bey_distance', type:'pathway', rarity:'common', tags:['beyonder','humanity'], requirements:{beyonder:true, seqMax:4}, weight:4, cooldown:12,
    run:()=>{ applyEffects({sanity:[-8,-3], humanity:-1}); return {title:'La distancia con lo humano', text:'Una conversación cotidiana se siente cada vez más lejana. Cuesta más de lo que admitís fingir que todavía encajás del todo.'}; }},
  {id:'bey_temptation', type:'pathway', rarity:'uncommon', tags:['beyonder'], requirements:{beyonder:true, seqMax:4}, weight:3, cooldown:24,
    run:()=>{ applyEffects({corruption:[2,6], clue:{pathway:'$chosen', reliability:'real', strength:[2,4]}}); return {title:'Una tentación de poder', text:'Se te presenta una forma más rápida de crecer. El costo es real, y lo sabés perfectamente antes de decidir.'}; }},
  {id:'bey_guidance', type:'pathway', rarity:'uncommon', tags:['beyonder','followers'], requirements:{beyonder:true, seqMax:3}, weight:3, cooldown:24,
    run:()=>{ applyEffects({reputation:[2,6]}); STATE.anchors.followerBonus = (STATE.anchors.followerBonus||0) + 1;
      return {title:'Alguien busca tu guía', text:'Un Beyonder más joven que vos busca consejo. La responsabilidad de guiar a otros es distinta a la de cuidarte solo.'}; }},
  {id:'bey_stillness', type:'pathway', rarity:'uncommon', tags:['beyonder'], requirements:{beyonder:true, seqMax:1}, weight:2, cooldown:24,
    run:()=>{ applyEffects({sanity:[2,5]}); return {title:'Una quietud extraña', text:'El mundo a tu alrededor se siente, cada vez más, como algo que observás desde una distancia enorme. Ya casi no te asusta.'}; }},
  {id:'bey_theme', type:'pathway', rarity:'common', tags:['beyonder'], requirements:{beyonder:true}, weight:4, cooldown:12,
    run:()=>{ const pw = PATHWAYS[STATE.pathway.chosenPathway]; applyEffects({clue:{pathway:'$chosen', reliability:'real', strength:[2,5], silent:true}});
      return {title:'Algo relacionado con tu camino', text:`Un episodio cotidiano te recuerda, sin buscarlo, la temática de tu propia vía: ${pw.theme.toLowerCase()}. Cada vez te cuesta menos reconocer esas señales.`}; }},

  // ---------------- nuevos: el mundo oculto empieza a mirarte ----------------
  {id:'myst_symbol_wall', type:'mystic', rarity:'mystic', tags:['symbol'], weight:3, cooldown:48,
    run:()=>{ STATE.flags.seenSymbol = true; addItem('doc_symbol', 1, 'copiado de una pared'); applyEffects({exposure:1});
      return {title:'Un símbolo en la pared', text:'Alguien pintó un símbolo en la pared de un callejón. A la mañana siguiente lo taparon con cal. Vos llegaste a copiarlo.'}; }},
  {id:'myst_whispers', type:'mystic', rarity:'mystic', tags:['entity'], weight:2, cooldown:24,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 15,
    run:()=>{ applyEffects({sanity:[-6,-2], clue:{pathway:'$random', reliability:'mixed', strength:[2,4], source:'susurros nocturnos'}});
      return {title:'Susurros', text:'Tres noches seguidas te despertás a la misma hora con la sensación de que alguien terminó de hablarte recién. La cuarta noche, no te dormís.'}; }},
  {id:'myst_followed', type:'threat', rarity:'uncommon', tags:['attention'], weight:5, cooldown:18, narrativeImportance:3,
    hiddenRequirements:()=>STATE.world.attention >= 30,
    title:'Alguien te sigue', text:'Hace tres días que ves la misma cara en lugares distintos: la parada del tranvía, el mercado, la esquina de tu casa.',
    choices:[
      {label:'Enfrentarlo', small:'Saber quién es.', run:()=>{
        const f = factionThatNotices() || 'mi9';
        if(chance(0.5)){ factionMeet(f); factionAdjust(f, {suspicion:5}); return `Te le plantás en la cara. No se inmuta: dice que trabaja para ${factionName(f)} y que "sólo mira". Te deja una tarjeta sin nombre.`; }
        startCombat(f==='aurora' ? 'auroraZealot' : 'mi9Agent', {env:'street'}); return 'Cuando te acercás, mete la mano en el abrigo.'; }},
      {label:'Perderlo entre la gente', small:'Discreto.', run:()=>{
        const ok = chance(0.5 + pathwayMods().stealth); if(ok){ applyEffects({attention:-6}); return 'Doblás dos esquinas, cruzás un mercado, entrás por una puerta y salís por otra. Lo perdés.'; }
        applyEffects({attention:3}); return 'Lo intentás. Lo único que lográs es confirmarle que tenés algo que esconder.'; }},
      {label:'Hacer tu vida como si nada', small:'Que se aburra.', run:()=>{
        applyEffects({sanity:[-4,-1]}); STATE.world.attention = Math.max(0, STATE.world.attention - 3); return 'Vas al trabajo, volvés, cenás. Una semana después, ya no está. O ya no lo ves.'; }}
    ]},
  {id:'myst_church_approach', type:'faction', rarity:'uncommon', tags:['faction','church'], weight:4, cooldown:60, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 18 && factionAccess('church')<1 && factionAccess('nighthawks')<1 && currentCity().factions.church>0.5,
    title:'Una visita de la Iglesia', text:'Un diácono de la Iglesia de la Noche Eterna golpea tu puerta. Muy amable. Muy puntual. Sabe cosas que no le contaste a nadie. "Vimos que últimamente te interesan... ciertos temas."',
    choices:[
      {label:'Contarle lo que te pasó', small:'Tal vez te puedan ayudar.', run:()=>{
        factionMeet('church'); factionAdjust('church', {trust:10, access:1, publicRep:4}); factionMeet('nighthawks'); factionAdjust('nighthawks', {access:1, trust:5});
        learnLore('orthodox_churches', 'un diácono'); remember('church_contact', 'La Iglesia vino a tu puerta y le contaste lo que te pasaba.', {cat:'organization', faction:'church'});
        return 'Te escucha sin interrumpir. Al final te da una dirección y un horario: "Si vuelve a pasar algo, vení. No se lo cuentes a nadie más."'; }},
      {label:'Hacerte el desentendido', small:'No sabés de qué te habla.', run:()=>{
        const ok = chance(0.45 + pathwayMods().deception); if(ok){ factionAdjust('church', {suspicion:-3}); return 'Te mira un rato largo. Asiente. "Perdone la molestia." Se va.'; }
        factionAdjust('church', {suspicion:10}); return 'Sonríe como quien escucha a un chico mentir. "Por supuesto." Anota algo. Se va.'; }},
      {label:'Cerrarle la puerta', small:'No es asunto suyo.', run:()=>{ factionMeet('church'); factionAdjust('church', {suspicion:12, trust:-8}); applyEffects({attention:2}); return 'Cerrás. Escuchás sus pasos alejarse, sin ningún apuro.'; }}
    ]},
  {id:'myst_mi9_approach', type:'faction', rarity:'uncommon', tags:['faction','mi9'], weight:3, cooldown:60, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.world.attention >= 45 && factionAccess('mi9')<1 && currentCity().factions.mi9>0.4,
    title:'Un hombre de traje gris', text:'Te espera en tu propia cocina, sentado, con tu taza. "Tranquilo. MI9. Nos interesa saber qué tipo de ciudadano es usted."',
    choices:[
      {label:'Ofrecer tu colaboración', small:'Mejor tenerlos de tu lado.', run:()=>{ factionMeet('mi9'); factionAdjust('mi9', {access:1, trust:8, suspicion:-10}); remember('mi9_contact', 'MI9 te reclutó en tu propia cocina.', {cat:'organization', faction:'mi9'}); return 'Asiente como quien ya sabía la respuesta. "Lo vamos a llamar."'; }},
      {label:'Mentirle con aplomo', small:'No tenés nada que esconder.', run:()=>{ const ok = chance(0.35 + pathwayMods().deception*1.5); factionMeet('mi9'); if(ok){ factionAdjust('mi9', {suspicion:-5}); applyEffects({attention:-5}); return 'Se va convencido. Casi.'; } factionAdjust('mi9', {suspicion:15}); return 'Te deja hablar hasta el final. Después te dice la fecha exacta de algo que hiciste hace dos años.'; }},
      {label:'Echarlo', small:'Es tu casa.', run:()=>{ factionMeet('mi9'); factionAdjust('mi9', {suspicion:20, trust:-10}); applyEffects({attention:4}); return 'Se levanta sin apuro, deja la taza en la pileta y se va. En la puerta dice: "Nos vemos."'; }}
    ]},
  {id:'myst_aurora_approach', type:'faction', rarity:'uncommon', tags:['faction','aurora','temptation'], weight:4, cooldown:48, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 12 && factionAccess('aurora')<1 && (STATE.character.sanity < 55 || STATE.character.corruption > 15 || STATE.character.cash < 30 || memoriesByCat('loss').length >= 2),
    title:'Una mano tendida', text:'Una mujer de sonrisa cálida se sienta a tu lado en un banco. Sabe que estás mal. Sabe por qué. "Hay un poder que devuelve lo que la vida te quitó. Sólo hay que pedirlo con fe."',
    choices:[
      {label:'Escucharla', small:'¿Qué podés perder?', run:()=>{ factionMeet('aurora'); factionAdjust('aurora', {access:1, trust:10}); applyEffects({clue:{pathway:'hangedMan', reliability:'real', strength:[4,8], source:'la mujer del banco'}, corruption:[1,3]});
        remember('aurora_contact', 'Escuchaste a la mujer de la Aurora.', {cat:'organization', faction:'aurora'}); addHiddenTruth('La mujer que te habló en el banco tenía tu nombre en una lista de "almas maduras" de la Orden de la Aurora.');
        return 'Te habla de un Creador traicionado, de un amanecer que va a volver. Cuando se va, te deja una estampita con un sol negro.'; }},
      {label:'Levantarte e irte', small:'Algo en su sonrisa no cierra.', run:()=>{ factionMeet('aurora'); applyEffects({sanity:[1,3]}); return 'No te sigue. Pero la ves de nuevo, semanas después, sentada en otro banco, al lado de otra persona que llora.'; }},
      {label:'Denunciarla a la Iglesia', small:'Esa gente es peligrosa.', requires:()=>STATE.factions.church.known, run:()=>{ factionMeet('aurora'); factionAdjust('church', {trust:6, merit:2}); factionAdjust('aurora', {suspicion:15});
        remember('reported_aurora', 'Denunciaste a una reclutadora de la Aurora.', {cat:'choice', faction:'aurora'});
        if(currentCityKey()==='backlund' && STATE.time) setWorldFlag('smog_warning', true);
        return 'La Iglesia te agradece la información. Dos semanas después, el banco está vacío.'; }}
    ]},
  {id:'myst_psychology_approach', type:'faction', rarity:'uncommon', tags:['faction','psychology'], weight:2, cooldown:72, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>(knowledgeOf('visionary') >= 20 || STATE.character.sanity < 45) && factionAccess('psychology')<1 && currentCity().factions.psychology>0.2,
    title:'Un consultorio sin cartel', text:'Un médico te detiene a la salida del hospital. "Disculpe la indiscreción: usted tiene sueños muy particulares, ¿no es cierto? Tengo colegas que estudian eso."',
    choices:[
      {label:'Aceptar su tarjeta', small:'Curiosidad.', run:()=>{ factionMeet('psychology'); factionAdjust('psychology', {access:1, trust:6}); applyEffects({sanity:[1,4]}); return 'La tarjeta dice sólo una dirección y un símbolo: un ojo dentro de un laberinto.'; }},
      {label:'Ignorarlo', small:'Otro loco.', run:()=>{ factionMeet('psychology'); return 'Te saluda con el sombrero. No insiste.'; }}
    ]},
  {id:'myst_storm_approach', type:'faction', rarity:'uncommon', tags:['faction','storm'], weight:3, cooldown:72, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>currentCity().port && STATE.flags.mysticExposure >= 15 && factionAccess('storm')<1,
    title:'Castigadores en el puerto', text:'Dos hombres enormes con rosarios de plata te cierran el paso en el muelle. "La Iglesia del Señor de las Tormentas quiere saber qué hacías anoche en el depósito siete."',
    choices:[
      {label:'Decir la verdad', small:'No hiciste nada malo.', run:()=>{ factionMeet('storm'); factionAdjust('storm', {trust:6, access:1}); return 'Te escuchan con los brazos cruzados. Al final, uno te da una palmada que casi te tumba. "Si ves algo raro en el agua, avisá."'; }},
      {label:'Hacerte el tonto', small:'¿Qué depósito?', run:()=>{ factionMeet('storm'); const ok = chance(0.4 + pathwayMods().deception); factionAdjust('storm', {suspicion: ok?2:12}); return ok ? 'Se miran entre ellos. Te dejan ir.' : 'Uno sonríe. El otro no. "Te vamos a estar mirando."'; }}
    ]},
  {id:'myst_machinery_approach', type:'faction', rarity:'uncommon', tags:['faction','machinery'], weight:2, cooldown:72, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 20 && factionAccess('machinery')<1 && (knowledgeOf('whiteTower')>=15 || knowledgeOf('hermit')>=15 || ['Obrero','Aprendiz de relojero','Capataz'].includes(STATE.character.profesion)),
    title:'Un ingeniero curioso', text:'Un ingeniero de la Iglesia del Vapor te para en la calle con un aparato de latón que zumba cerca tuyo. "Fascinante. ¿Tendría un minuto para unas mediciones?"',
    choices:[
      {label:'Dejarte medir', small:'¿Qué puede pasar?', run:()=>{ factionMeet('machinery'); factionAdjust('machinery', {access:1, trust:5}); if(STATE.pathway.chosenPathway) factionAdjust('machinery', {suspicion:4}); return 'Anota números. Te agradece. Te da una tarjeta con un engranaje grabado: "Si alguna vez quiere entender qué le pasa, venga."'; }},
      {label:'Negarte', small:'No.', run:()=>{ factionMeet('machinery'); factionAdjust('machinery', {suspicion:5}); return 'Guarda el aparato, decepcionado, y se aleja murmurando cifras.'; }}
    ]},
  {id:'bey_potion_name', type:'pathway', rarity:'uncommon', tags:['beyonder','acting'], requirements:{beyonder:true}, weight:8, cooldown:12, narrativeImportance:3,
    hiddenRequirements:()=>STATE.pathway.actingMethod < 1 && monthsSincePotion() >= 3,
    title:(ctx)=>'El nombre de la poción', text:()=>`Te despertás pensando en el nombre de tu poción: ${currentRole().role}. ¿Por qué alguien le pondría el nombre de un oficio, de un papel, a algo así?`,
    choices:[
      {label:'Pensarlo en serio', small:'Tal vez el nombre no sea un adorno.', run:()=>{ nudgeActingMethod(0.6, 'pensando en el nombre de tu poción'); return 'Pasás días dándole vueltas. Hay algo ahí. Todavía no sabés qué.'; }},
      {label:'Olvidarlo', small:'Es sólo un nombre.', run:()=>{ return 'Es sólo un nombre. Seguramente.'; }}
    ]}
];
