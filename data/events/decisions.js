'use strict';
/* =========================================================================
   data/events/decisions.js — decisiones con consecuencias ocultas (§7, §52),
   cadenas de amenaza (§17, §43), ganchos de la historia mundial (§30) y
   eventos extraordinarios (§6).
   Las cinco decisiones originales se conservan: ahora la cadena del
   "hombre que no encaja" sabe para QUIÉN trabajaba, y eso decide qué te
   ofrecen años después. Los "small" de cada opción no adelantan el efecto
   oculto: a lo sumo insinúan el riesgo.
   ========================================================================= */
const EVENTS_DECISIONS = [
  {id:'stranger_follow', type:'decision', rarity:'uncommon', tags:['mystery','stranger'], requirements:{ageMin:16}, weight:5, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>!hasMemory('stranger_followed') && !hasMemory('stranger_ignored'),
    title:'Un hombre que no encaja',
    text:'Un hombre de abrigo largo cruza la calle con demasiada intención. Se detiene, mira una puerta cualquiera, y sigue. Algo en la escena no cierra.',
    choices:[
      {label:'Seguirlo a distancia', small:'Vas a saber algo más. Tal vez demasiado.', run:()=>{
        // Para quién trabaja se decide ahora, en secreto, y define toda la cadena.
        const f = wpick(['nighthawks','mi9','aurora','tarotClub'], k=>({nighthawks:4, mi9:3, aurora:2, tarotClub:1})[k] * (currentCity().factions[k]||0.3));
        STATE.flags.strangerFaction = f || 'mi9';
        remember('stranger_followed', 'Seguiste a un desconocido que no encajaba en la escena.', {cat:'choice'});
        applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[3,6], source:'el hombre del abrigo largo'}});
        addHiddenTruth(`El hombre del abrigo largo que seguiste trabajaba para ${factionName(STATE.flags.strangerFaction)}. Anotó tu cara esa misma noche.`, {key:'stranger'});
        scheduleConsequence({inMonths:[14,40], tag:'watched', title:'Una cara conocida',
          text:'Un hombre te saluda por tu nombre en la calle. Vos no lo conocés — pero él a vos, evidentemente, sí. Se va antes de que puedas preguntarle nada.',
          effect:{sanity:[-7,-3]}, memory:{tag:'watched', text:'Alguien te reconoció por tu nombre sin que vos supieras quién era.', cat:'secret'}});
        return 'Lo seguís seis cuadras hasta que dobla y, simplemente, ya no está.'; }},
      {label:'Seguir tu camino', small:'No todo es asunto tuyo.', run:()=>{
        remember('stranger_ignored', 'Decidiste no seguir a un desconocido que te dio mala espina.', {cat:'choice'});
        applyEffects({sanity:[1,3]});
        return 'Seguís tu camino. Por un rato te queda la sensación de haberte perdido algo.'; }}
    ]},
  {id:'strange_book_offer', type:'decision', rarity:'uncommon', tags:['book','mystery'], requirements:{ageMin:16}, weight:4, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.flags.mysticExposure>=6 && !hasMemory('bought_odd_book') && !hasMemory('left_odd_book'),
    title:'Un libro sin título',
    text:'En una mesa de saldos hay un libro encuadernado a mano, sin título ni autor. El vendedor no recuerda de dónde salió y te lo deja barato.',
    choices:[
      {label:'Comprarlo', small:'Leer nunca hizo mal a nadie.', run:()=>{
        applyEffects({cash:-rndInt(20,70)}); addItem('book_untitled', 1, 'una mesa de saldos');
        remember('bought_odd_book', 'Compraste un libro sin título que nadie supo explicarte de dónde salía.', {cat:'choice'});
        scheduleConsequence({inMonths:[8,26], tag:'book_consequence', eventId:'book_owner'});
        return 'Lo comprás. Las primeras páginas son aburridas. Las del medio, no tanto.'; }},
      {label:'Dejarlo donde está', small:'Ya tenés bastante encima.', run:()=>{
        remember('left_odd_book', 'Dejaste pasar un libro sin título que te llamó la atención.', {cat:'choice'});
        return 'Lo dejás. Al día siguiente la mesa de saldos ya no está en esa esquina.'; }}
    ]},
  {id:'book_owner', type:'decision', rarity:'rare', tags:['book','consequence'], weight:0, cooldown:999, repeatable:false, narrativeImportance:3, chainOnly:true,
    title:'Alguien pregunta por el libro',
    text:'Una persona que no conocés aparece preguntando, con demasiada precisión, por "un libro encuadernado a mano" que compraste hace tiempo.',
    choices:[
      {label:'Devolvérselo', small:'No es tuyo, en realidad.', requires:()=>hasItem('book_untitled'), run:()=>{
        removeItemByDef('book_untitled'); applyEffects({sanity:[1,3]});
        remember('returned_book', 'Devolviste el libro sin título a quien lo buscaba.', {cat:'choice'});
        if(chance(0.5)) applyEffects({clue:{pathway:'$random', reliability:'real', strength:[3,6], source:'el dueño del libro'}});
        return 'Lo recibe con las dos manos, como si pesara mucho más de lo que pesa. "Gracias. No sabe de lo que se salvó." Se va.'; }},
      {label:'Decirle que no sabés de qué habla', small:'Mentir.', run:()=>{
        applyEffects({sanity:[-6,-2], attention:2});
        remember('book_wanted', 'Alguien vino a preguntarte por el libro sin título, y le mentiste.', {cat:'secret'});
        scheduleConsequence({inMonths:[6,24], title:'El libro', text:'Volvés a tu casa y el libro sin título no está donde lo dejaste. Nada más falta. Nada está forzado.', effect:{sanity:[-5,-2], removeItem:'book_untitled'}, chance:0.5});
        return 'Le decís que no sabés de qué habla. Te mira un largo rato y se va sin discutir.'; }}
    ]},
  {id:'witness_something', type:'decision', rarity:'uncommon', tags:['mystery','witness'], requirements:{ageMin:16}, weight:3, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.flags.mysticExposure>=12 && !hasMemory('witnessed_incident') && !hasMemory('witnessed_silent'),
    title:'Algo que no deberías haber visto',
    text:'Volviendo de noche ves, en el fondo de un callejón, algo que tu cabeza se niega a ordenar del todo. Dura tres segundos. Después no hay nada.',
    choices:[
      {label:'Contarlo', small:'No podés quedártelo.', run:()=>{
        remember('witnessed_incident', 'Viste algo imposible en un callejón, y lo contaste.', {cat:'secret'});
        applyEffects({reputation:[-8,-3], sanity:[-5,-2]});
        scheduleConsequence({inMonths:[6,20], tag:'talked_too_much', title:'Tu historia circuló',
          text:'Lo que contaste aquella vez llegó más lejos de lo que pensabas. Alguien lo repitió en el lugar equivocado.',
          effect:{sanity:[-7,-3], attention:5, clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'tu historia del callejón'}},
          memory:{tag:'marked_by_talking', text:'Tu historia del callejón circuló más de la cuenta.', cat:'secret'}});
        return 'Lo contás. La mayoría se ríe. Uno de los que escuchaba no se ríe.'; }},
      {label:'Callártelo', small:'Mejor así.', run:()=>{
        remember('witnessed_silent', 'Viste algo imposible y decidiste no contárselo a nadie.', {cat:'secret'});
        applyEffects({sanity:[-9,-4], clue:{pathway:'$random', reliability:'mixed', strength:[2,4], source:'lo que viste en el callejón'}});
        return 'No se lo contás a nadie. Eso también tiene su precio: te lo guardás entero.'; }}
    ]},
  // Sólo existe si antes seguiste al desconocido: una decisión vieja habilitando contenido nuevo.
  {id:'stranger_returns', type:'decision', rarity:'rare', tags:['stranger','faction'], weight:6, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>hasMemory('watched') && !hasMemory('stranger_offer_taken') && !hasMemory('stranger_offer_refused'),
    title:'El que te conocía',
    text:()=>{ const f = STATE.flags.strangerFaction || 'mi9';
      const offer = {nighthawks:'dice que hay gente que caza lo que vos ya viste, y que siempre necesitan ojos', mi9:'dice que el reino necesita ciudadanos atentos, y que paga bien por la atención', aurora:'dice que hay un poder esperando a gente como vos, gente que ya vio la verdad', tarotClub:'dice que alguien "muy por encima" se fijó en vos, y que eso no le pasa a cualquiera'}[f];
      return `El hombre que te saludó por tu nombre vuelve a aparecer. Esta vez se sienta enfrente tuyo y va al grano: ${offer}.`; },
    choices:[
      {label:'Escuchar lo que ofrece', small:'Ya llegaste hasta acá.', run:()=>{
        const f = STATE.flags.strangerFaction || 'mi9';
        remember('stranger_offer_taken', 'Aceptaste escuchar la oferta del hombre que te venía siguiendo.', {cat:'organization', faction:f});
        applyEffects({clue:{pathway:'$random', reliability:'real', strength:[6,12], source:'el hombre que te conocía'}, sanity:[-5,-2], exposure:8});
        STATE.flags.metOccultContact = true;
        revealHiddenTruth('stranger');
        if(f==='tarotClub') tarotObserve(25, 'aceptaste escuchar al mensajero'); else { factionMeet(f); factionAdjust(f, {access:1, trust:8}); }
        scheduleConsequence({inMonths:[18,48], tag:'old_debt', title:'Te pasan la factura',
          text:'Aquella conversación que aceptaste tener hace años vuelve en forma de pedido. No es una sugerencia.',
          effect:{sanity:[-9,-4], corruption:[1,4]}, memory:{tag:'owes_favor', text:'Quedaste debiéndole algo a gente que no olvida.', cat:'pact', faction:f}});
        return `Lo escuchás hasta el final. Cuando se va, entendés que eso no fue una charla: fue un trámite. Ahora sabés para quién trabaja: ${factionName(f)}.`; }},
      {label:'Levantarte e irte', small:'No, gracias.', run:()=>{
        remember('stranger_offer_refused', 'Rechazaste la oferta del hombre que te venía siguiendo.', {cat:'choice'});
        applyEffects({sanity:[1,4]});
        scheduleConsequence({inMonths:[24,60], tag:'road_not_taken', title:'El camino que no tomaste',
          text:'Te enterás de que alguien parecido a vos, en circunstancias parecidas, dijo que sí. No termina bien. Por un rato no sabés si sentir alivio o vértigo.',
          effect:{sanity:[-4,-1]}, memory:{tag:'road_not_taken', text:'Supiste cómo le fue a quien aceptó lo que vos rechazaste.', cat:'choice'}});
        return 'Te levantás sin terminar de escucharlo. No te sigue. Eso, en sí mismo, dice algo.'; }}
    ]},

  // ------------------------- amenaza acumulada (§43) -------------------------
  {id:'threat_house_searched', type:'threat', rarity:'uncommon', tags:['threat'], weight:5, cooldown:24,
    hiddenRequirements:()=>STATE.world.attention >= 50 && (maxFactionSuspicion() >= 35),
    run:()=>{ applyEffects({sanity:[-8,-3]}); const f = mostSuspiciousFaction(); addHiddenTruth(`Quien revisó tu casa aquella vez era de ${factionName(f)}. Buscaban pruebas. Encontraron algunas.`);
      if(f) factionAdjust(f, {suspicion:5});
      return {title:'Alguien estuvo en tu casa', text:'Volvés a tu casa y todo está en su lugar. Demasiado en su lugar: alguien revisó cada cajón y volvió a dejarlo exactamente como estaba. Casi exactamente.'}; }},
  {id:'threat_interrogation', type:'threat', rarity:'rare', tags:['threat','faction'], weight:6, cooldown:36, narrativeImportance:3,
    hiddenRequirements:()=>maxFactionSuspicion() >= 55,
    context:(ctx)=>{ ctx.f = mostSuspiciousFaction(); return ctx.f ? ctx : null; },
    title:'Una invitación que no se puede rechazar', text:(ctx)=>`Dos personas de ${factionName(ctx.f)} te esperan en la puerta de tu trabajo. "Acompáñenos. Sólo unas preguntas."`,
    choices:[
      {label:'Ir y mentir con calma', small:'Depende de lo bien que mientas.', run:(ctx)=>{
        const ok = chance(0.35 + pathwayMods().deception*1.5 + (STATE.character.reputation>30?0.1:0));
        if(ok){ factionAdjust(ctx.f, {suspicion:-25}); applyEffects({sanity:[-4,-1], attention:-10}); return 'Seis horas en una sala sin ventanas. Salís de ahí con la sensación de haber ganado algo. No sabés qué.'; }
        factionAdjust(ctx.f, {suspicion:15}); applyEffects({sanity:[-8,-3]}); markHunted(ctx.f, 'mintió en un interrogatorio'); return 'En algún momento dejás de saber qué dijiste y qué no. Te sueltan de madrugada. Te siguen hasta tu casa sin disimularlo.'; }},
      {label:'Ir y decir la verdad', small:'Que decidan ellos.', run:(ctx)=>{
        factionAdjust(ctx.f, {suspicion:-15, trust:5});
        if(STATE.pathway.chosenPathway && chance(0.6)){ factionAdjust(ctx.f, {access:2}); return 'Te escuchan. Toman nota. Al final te ofrecen algo que no esperabas: trabajar con ellos. "Mejor adentro que afuera."'; }
        applyEffects({sanity:[-3,0]}); return 'Te escuchan en silencio. Te dejan ir. "Si hay algo más, nos vamos a enterar." No es una amenaza. Es un dato.'; }},
      {label:'Escapar', small:'No vas a entrar a esa sala.', run:(ctx)=>{
        markHunted(ctx.f, 'escapó de un interrogatorio'); applyEffects({attention:10});
        if(chance(0.5)){ startCombat(factionAgentFor(ctx.f), {env:'street'}); return 'Corrés. Uno de ellos corre más rápido.'; }
        return 'Te perdés entre la gente. Desde ese día, tu nombre está en otra lista.'; }}
    ]},
  {id:'threat_hunted', type:'threat', rarity:'uncommon', tags:['threat','hunted'], weight:8, cooldown:8, narrativeImportance:2,
    hiddenRequirements:()=>huntingFactions().length > 0,
    run:()=>{ const f = pick(huntingFactions()); startCombat(factionAgentFor(f), {env:pick(['alley','night','street']), source:'caza'});
      return {title:'Te encontraron', text:`${factionName(f)} no olvida. Esta noche, te encontraron.`}; }},
  {id:'aurora_revenge', type:'threat', rarity:'rare', tags:['aurora'], weight:0, cooldown:999, chainOnly:true,
    run:()=>{ startCombat('auroraZealot', {env:'home'}); return {title:'La Aurora no olvida', text:'Alguien de la Aurora te espera en la puerta de tu casa. Sonríe. Tiene un cuchillo ceremonial.'}; }},
  {id:'lie_low_pays', type:'mundane', rarity:'common', tags:['quiet'], weight:3, cooldown:12,
    hiddenRequirements:()=>STATE.world.attention >= 20 && STATE.flags.quietSeasons >= 2,
    run:()=>{ applyEffects({attention:-8, sanity:[1,3]}); Object.keys(STATE.factions).forEach(k=>factionAdjust(k, {suspicion:-2}));
      return {title:'Una vida tranquila', text:'Hace meses que no hacés nada fuera de lo común. Trabajo, casa, algún domingo en la plaza. Si alguien te estaba mirando, ya no encuentra nada que mirar.'}; }},

  // ------------------------- artefactos -------------------------
  {id:'artifact_glove_owner', type:'threat', rarity:'rare', tags:['artifact'], weight:0, cooldown:999, chainOnly:true, narrativeImportance:3,
    title:'El dueño del guante', text:'Un hombre flaco, de sonrisa de dientes de oro, te para en el mercado. Mira tu mano izquierda. "Eso es mío. Lo quiero de vuelta."',
    choices:[
      {label:'Devolvérselo', small:'No querés problemas.', requires:()=>hasArtifact('glove'), run:()=>{ removeArtifact('glove'); applyEffects({sanity:[1,3]}); return 'Se lo pone con un suspiro de alivio. "Tenés buen gusto. Mal olfato, pero buen gusto." Desaparece entre la gente.'; }},
      {label:'Negarte', small:'Ahora es tuyo.', run:()=>{ startCombat('rivalBeyonder', {env:'street', overrides:{name:'Carterista de dientes de oro', pathway:'error', seq:7}}); return 'Deja de sonreír.'; }},
      {label:'Vendérselo', small:'Todo tiene precio.', requires:()=>hasArtifact('glove'), run:()=>{ removeArtifact('glove'); applyEffects({cash:[120,300]}); return 'Regatea como un comerciante de verdad. Paga en monedas de oro de un reino que ya no existe. Aceptan igual en el banco.'; }}
    ]},

  // ------------------------- historia mundial (ganchos) -------------------------
  {id:'tl_notebook_found', type:'world', rarity:'rare', tags:['timeline','canon'], weight:0, cooldown:999, repeatable:false, chainOnly:true, narrativeImportance:3,
    title:'Un cuaderno de tapas negras', text:'En la casa de un anticuario muerto, entre papeles sin valor, encontrás un cuaderno de tapas negras, frío al tacto. Algo en vos dice que no deberías tenerlo. Otra cosa dice que no deberías soltarlo.',
    choices:[
      {label:'Llevárselo a la Iglesia', small:'Que lo guarde quien sabe.', run:()=>{ setWorldFlag('tingen_notebook_delivered', true); factionMeet('church'); factionAdjust('church', {trust:12, merit:6, publicRep:6});
        remember('delivered_notebook', 'Entregaste un cuaderno de tapas negras a la Iglesia.', {cat:'choice', faction:'church'});
        addHiddenTruth('El cuaderno que entregaste a la Iglesia era lo que iba a costarle la vida a media escuadra de Nighthawks en Tingen.');
        return 'El diácono se pone pálido al verlo. Lo guarda en una caja de plomo sin tocarlo con los dedos. "No se lo diga a nadie. A nadie."'; }},
      {label:'Quedártelo', small:'Algo tan raro vale la pena.', run:()=>{ addItem('quest_notebook', 1, 'la casa de un anticuario muerto'); applyEffects({sanity:[-6,-2], attention:4});
        remember('kept_notebook', 'Te quedaste con el cuaderno de tapas negras.', {cat:'secret'}); return 'Lo guardás en el fondo de un cajón. Esa noche soñás con una escalera que baja para siempre.'; }},
      {label:'Quemarlo', small:'Algunas cosas no deberían existir.', run:()=>{ applyEffects({sanity:[-4,-1]}); if(chance(0.5)){ applyEffects({salud:[-10,-4]}); return 'El cuaderno no quiere arder. Cuando por fin se enciende, el fuego es verde y grita.'; } return 'Arde como cualquier papel. Casi decepciona.'; }}
    ]},

  // ------------------------- extraordinarios (§6) -------------------------
  {id:'xo_angel_passes', type:'mystic', rarity:'extraordinary', tags:['angel','dream'], weight:3, cooldown:999, repeatable:false, narrativeImportance:2,
    run:()=>{ applyEffects({sanity:[-8,-3], exposure:6, clue:{pathway:'$random', reliability:'real', strength:[5,10], source:'el sueño que soñó toda la ciudad'}});
      remember('angel_dream', 'La noche en que toda la ciudad soñó lo mismo.', {cat:'event'});
      return {title:'La noche del sueño', text:'Esa noche, toda la ciudad sueña lo mismo: una figura enorme cruzando el cielo, sin mirar a nadie. A la mañana nadie lo comenta. Todos tienen ojeras.'}; }},
  {id:'xo_fire_survivor', type:'mundane', rarity:'extraordinary', tags:['fate','death'], weight:3, cooldown:999, repeatable:false, narrativeImportance:2,
    run:()=>{ STATE.character.fate = (STATE.character.fate||0) + 8; applyEffects({sanity:[-10,-4], salud:[-12,-4]});
      remember('fire_survivor', 'Sobreviviste a un incendio en el que murieron todos los demás.', {cat:'trauma'});
      addHiddenTruth('Sobreviviste al incendio porque algo decidió que todavía no era tu hora. Nadie sabe qué.');
      return {title:'El único', text:'Un incendio consume el edificio donde estabas. Mueren todos. Vos salís caminando, con el pelo chamuscado y sin una quemadura. Nadie sabe explicarlo. Vos tampoco.'}; }},
  {id:'xo_double', type:'mystic', rarity:'extraordinary', tags:['entity','identity'], weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 20,
    run:()=>{ applyEffects({sanity:[-14,-6], exposure:5}); learnLore('f_outer', 'tu doble');
      return {title:'Tu doble', text:'Ves a alguien idéntico a vos cruzando la plaza, con tu ropa y tu forma de caminar. Se da vuelta. Te sonríe con una sonrisa que no es la tuya. Cuando parpadeás, ya no está.'}; }},
  {id:'xo_lost_weeks', type:'mystic', rarity:'extraordinary', tags:['memory','entity'], weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    hiddenRequirements:()=>STATE.flags.mysticExposure >= 15,
    run:()=>{ applyEffects({sanity:[-12,-5], salud:[-6,0]}); addHiddenTruth('Las dos semanas que perdiste no fueron un olvido. Alguien las usó por vos.');
      remember('lost_weeks', 'Perdiste dos semanas de tu vida y nadie sabe dónde estuviste.', {cat:'trauma'});
      return {title:'Dos semanas', text:'Te despertás en tu cama y el diario tiene una fecha dos semanas posterior a la última que recordás. Tus conocidos dicen que te vieron normal. Que hablaste con ellos. Vos no recordás nada.'}; }},
  {id:'xo_star_fall', type:'mystic', rarity:'extraordinary', tags:['ingredient','omen'], weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    run:()=>{ grantIngredientFind('una estrella caída', true); applyEffects({exposure:4});
      return {title:'Una estrella cae', text:'De noche, una luz cruza el cielo y cae en un campo a las afueras. Llegás antes que nadie. En el cráter, todavía tibio, hay algo que brilla.'}; }},
  {id:'xo_dead_speak', type:'mystic', rarity:'extraordinary', tags:['death','spirits'], weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    hiddenRequirements:()=>memoriesByCat('loss').length > 0,
    run:()=>{ const lost = memoriesByCat('loss'); const m = lost[lost.length-1]; applyEffects({sanity:[-6,6], clue:{pathway:'death', reliability:'real', strength:[5,9], source:'una voz de los muertos'}});
      return {title:'Una voz conocida', text:`En un velorio ajeno, en el silencio entre dos rezos, escuchás clarísima una voz que conocés. Te dice algo que sólo vos podías saber. Pensás en ${m ? m.text.toLowerCase().replace(/\.$/,'') : 'alguien que perdiste'}.`}; }},
  {id:'xo_ghost_ship_arrives', type:'mystic', rarity:'extraordinary', tags:['sea'], weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    hiddenRequirements:()=>currentCity().port,
    run:()=>{ addRumor('ghost_ship'); applyEffects({exposure:3}); return {title:'Un barco sin nadie', text:'Un barco entra al puerto de madrugada, sin tripulación, con la mesa servida y la comida todavía caliente. Para el mediodía, la Iglesia de las Tormentas ya lo acordonó.'}; }}
];
