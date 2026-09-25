'use strict';
/* =========================================================================
   data/events/divinity.js — el camino al trono (§22).
   Sequence 0 no es un botón. Es una cadena de acontecimientos
   extraordinarios que empieza años después de llegar a la Sequence 1:
     el llamado → la Unicidad → el otro heredero → lo que mira desde afuera
     → las Características que faltan → (la creencia de otros) → el ascenso.
   Cada paso tiene conflictos, enemigos, entidades y consecuencias para el
   mundo. Todos son eventos "chainOnly": los dispara systems/divinity.js.
   Al final hay también eventos del modo divino (plegarias, el mundo que
   sigue sin vos).
   ========================================================================= */
const EVENTS_DIVINITY = [
  {id:'div_call', type:'pathway', rarity:'extraordinary', tags:['divinity'], chainOnly:true, narrativeImportance:3,
    title:'El trono vacío',
    text:()=>`Hace años que sos ${seqData(STATE.pathway.chosenPathway,1).name}. Una noche soñás con un trono de ${PATHWAYS[STATE.pathway.chosenPathway].symbol}, vacío, en un lugar donde no hay arriba ni abajo. No es un sueño. Es una invitación, y es una advertencia: si no lo ocupás vos, alguien más lo va a intentar.`,
    choices:[
      {label:'Aceptar el llamado', small:'El camino va a ser largo, y te va a cambiar.', run:()=>{ const d = STATE.divinity; d.stage = 1; d.startedAt = STATE.time.totalMonths;
        remember('div_called', 'Aceptaste el llamado del trono.', {cat:'pact'});
        scheduleConsequence({inMonths:[6,14], eventId:'div_uniqueness'});
        return 'Te despertás sabiendo algo que no aprendiste: toda vía tiene una Unicidad, y la de la tuya está en algún lugar de este mundo, esperando.'; }},
      {label:'Todavía no', small:'Hay una vida que todavía querés vivir.', run:()=>{ STATE.divinity.delayUntil = STATE.time.totalMonths + 36;
        return 'El trono sigue ahí cuando cerrás los ojos. Espera. Sabe esperar mejor que vos.'; }},
      {label:'Renunciar al trono', small:'Seguir siendo lo que sos. Para siempre.', run:()=>{ STATE.divinity.renounced = true; applyEffects({humanity:10, sanity:[8,14]});
        remember('div_renounced', 'Renunciaste al trono de tu vía.', {cat:'choice'}); addMilestone('pathway', 'Renuncia al trono');
        scheduleConsequence({inMonths:[60,180], title:'Otro en el trono', text:'Un día, sin aviso, sentís que el trono de tu vía ya no está vacío. Alguien más se sentó. No sabés quién. Él sí sabe quién sos vos.', effect:{attention:10, sanity:[-6,-2]}});
        return 'Decís que no. La sensación de vértigo se va, y con ella algo de peso. Por primera vez en años, dormís una noche entera.'; }}
    ]},
  {id:'div_uniqueness', type:'pathway', rarity:'extraordinary', tags:['divinity'], chainOnly:true, narrativeImportance:3,
    title:'La Unicidad',
    text:'La Unicidad de tu vía no es un objeto, aunque a veces lo parezca. Es la vía entera, condensada en un solo punto del mundo. Sabés que existe. No sabés dónde está. Otros también la buscan.',
    choices:[
      {label:'Buscarla por tu cuenta', small:'Años de búsqueda, riesgos que nadie más correría.', run:()=>{
        const p = clamp(0.45 + knowledgeOf(STATE.pathway.chosenPathway)/400 + (STATE.lore.forbidden||[]).length*0.05 + luckMod(), 0.2, 0.9);
        applyEffects({sanity:[-14,-6], corruption:[2,6], exposure:3});
        if(chance(p)){ STATE.divinity.stage = 2; STATE.divinity.found = 'self'; scheduleConsequence({inMonths:[3,9], eventId:'div_rival'});
          remember('div_found', 'Encontraste dónde está la Unicidad de tu vía.', {cat:'achievement'});
          return 'Seguís rastros que ninguna persona cuerda seguiría: símbolos en ruinas, un mapa dibujado en un sueño, la última frase de un Beyonder moribundo. Al final, lo sabés: está ahí. Y no estás solo en saberlo.'; }
        scheduleConsequence({inMonths:[10,20], eventId:'div_uniqueness'});
        return 'Meses de búsqueda. Un rastro falso detrás de otro. Volvés con las manos vacías y con cosas en la cabeza que no se van.'; }},
      {label:'Preguntarle a la mesa de la niebla gris', small:'Si hay alguien que sabe, está ahí.', requires:()=>STATE.tarot.stage>=6, run:()=>{
        factionAdjust('tarotClub', {trust:-30}); STATE.divinity.stage = 2; STATE.divinity.found = 'tarot';
        scheduleConsequence({inMonths:[3,9], eventId:'div_rival'});
        remember('div_found', 'El Tarot Club te dijo dónde está la Unicidad.', {cat:'favor_received', faction:'tarotClub'});
        return 'Nadie responde en la reunión. Una semana después, sobre tu lugar en la mesa, hay un papel con un nombre y una fecha. En la cabecera, el Loco no te mira. No hace falta.'; }},
      {label:'Negociar con una Iglesia', small:'Ellos saben dónde están estas cosas. También las quieren.', requires:()=>['church','storm'].some(k=>factionAccess(k)>=3), run:()=>{
        const k = ['church','storm'].find(x=>factionAccess(x)>=3);
        factionAdjust(k, {trust:-10, suspicion:25}); STATE.divinity.stage = 2; STATE.divinity.found = k; STATE.divinity.churchRival = k;
        scheduleConsequence({inMonths:[3,9], eventId:'div_rival'});
        remember('div_found', `${cap(factionShort(k))} te mostró dónde está la Unicidad. Ahora saben lo que buscás.`, {cat:'organization', faction:k});
        return `${cap(factionShort(k))} te recibe en una sala donde no hay ventanas. Te dicen dónde está. Te dicen también, sin decirlo, que nunca te lo van a perdonar.`; }}
    ]},
  {id:'div_rival', type:'pathway', rarity:'extraordinary', tags:['divinity','combat'], chainOnly:true, narrativeImportance:3,
    title:'El otro heredero',
    text:()=>`Cuando llegás, ya hay alguien. Otro ${seqData(STATE.pathway.chosenPathway,1).name}, de tu misma vía, más viejo que cualquier persona que hayas conocido. La Unicidad no se reparte. Él lo sabe. Vos también.`,
    choices:[
      {label:'Enfrentarlo', small:'Uno de los dos no vuelve.', run:()=>{
        startCombat('rivalBeyonder', {source:'divinity', onWin:'divRivalWin', onFlee:'divRivalFled', env:'ruins', overrides:{name:'El otro heredero', seq:1, pathway:STATE.pathway.chosenPathway, hp:[140,190], dmg:[11,20], defense:4, talk:0.05, fleeChance:0.25, sanityDmg:[2,6], corruptionDmg:[0,2], reward:{cash:[0,0], characteristic:1}, desc:'Un ser de tu misma vía, viejo como una catedral.'}});
        return 'No hay palabras. Sólo el aire, que se vuelve pesado como antes de una tormenta.'; }},
      {label:'Negociar lo que no se puede repartir', small:'Algo vas a tener que dar.', requires:()=>(STATE.character.humanity??100) >= 35, run:()=>{
        STATE.divinity.stage = 3; applyEffects({humanity:-15, sanity:[-8,-3]});
        const chars = itemsByCat('characteristic'); if(chars.length) removeItem(chars[0].uid);
        scheduleConsequence({inMonths:[120,240], title:'Una deuda de ángeles', text:'Aquel otro heredero vuelve, un siglo después o casi, a cobrar lo prometido. No viene solo.', effect:{sanity:[-15,-8], attention:15}});
        remember('div_pact_rival', 'Pactaste con el otro heredero.', {cat:'pact'});
        scheduleConsequence({inMonths:[6,14], eventId:'div_entities'});
        return 'Hablan durante lo que se sienten días. Le das algo que no vas a recuperar. Él se va. Dice que va a volver a cobrar. Le creés.'; }},
      {label:'Dejar que otros peleen por vos', small:'Tu organización tiene deudas con vos. Esta es la más cara.', requires:()=>memberFactions().some(k=>F(k).rank>=3) || (STATE.tarot.stage>=7), run:()=>{
        STATE.divinity.stage = 3;
        const k = memberFactions().find(x=>F(x).rank>=3);
        if(k){ factionAdjust(k, {merit:-60, trust:-20}); factionStrength(k, -15); }
        else factionAdjust('tarotClub', {trust:-40});
        cityAdjust(currentCityKey(), {security:-15, prosperity:-8});
        logWorld(`Una noche, en ${currentCity().name}, algo pelea en el cielo. A la mañana siguiente nadie se pone de acuerdo sobre qué vio.`);
        addHiddenTruth('Tres personas murieron la noche en que otros pelearon por vos. Ninguna sabía nada.');
        scheduleConsequence({inMonths:[6,14], eventId:'div_entities'});
        return 'No estás ahí cuando pasa. Te enterás al día siguiente, por el diario, de un "incidente" que nadie explica. El camino está libre. No es gratis.'; }}
    ]},
  {id:'div_entities', type:'pathway', rarity:'extraordinary', tags:['divinity','entity'], chainOnly:true, narrativeImportance:3,
    title:'Lo que mira desde afuera',
    text:'Cerca de la Unicidad, el mundo es delgado. Del otro lado, algo muy grande se da vuelta para mirarte. No tiene ojos. No los necesita. Te ofrece ayuda.',
    choices:[
      {label:'Resistir con lo que sos', small:'Tus anclas, tu nombre, tu cordura.', run:()=>{
        recomputeAnchors();
        const a = STATE.anchors, c = STATE.character;
        const p = clamp(0.25 + a.anchorStrength/200 + c.sanity/300 + (c.humanity??100)/400 + (pathwayMods().forbiddenResist||0), 0.1, 0.9);
        if(chance(p)){ STATE.divinity.stage = 4; applyEffects({sanity:[-10,-4]}); scheduleConsequence({inMonths:[4,10], eventId:'div_characteristics'});
          remember('div_resisted', 'Resististe lo que te miraba desde afuera.', {cat:'achievement'});
          return 'Pensás en las personas que te conocen. En tu nombre. En una cocina un domingo. La presencia se aleja, casi con respeto.'; }
        applyEffects({sanity:[-25,-12], corruption:[5,10]}); scheduleConsequence({inMonths:[8,16], eventId:'div_entities'});
        return 'Resistís. Durante un instante, no sabés quién está resistiendo. Te despertás días después, en un lugar que no reconocés. Todavía está ahí, del otro lado.'; }},
      {label:'Aceptar su ayuda', small:'El camino se vuelve fácil. Demasiado.', run:()=>{
        STATE.divinity.stage = 4; STATE.divinity.pact = true;
        applyEffects({corruption:[15,25], humanity:-20});
        addHiddenTruth('La ayuda que aceptaste cerca de la Unicidad tenía una cláusula. Todo lo que hagas desde el trono va a llevar, un poco, su firma.');
        scheduleConsequence({inMonths:[3,8], eventId:'div_characteristics'});
        return 'Decís que sí. Todo lo que parecía imposible se acomoda. Nunca te sentiste tan fuerte. Nunca te sentiste tan poco vos.'; }},
      {label:'Recitar el nombre honorífico del Loco', small:'Pedirle a alguien que está por encima de la niebla.', requires:()=>STATE.tarot.honorific, run:()=>{
        STATE.divinity.stage = 4; tarotObserve(10, 'pediste ayuda en el borde del mundo');
        applyEffects({sanity:[-4,0]}); scheduleConsequence({inMonths:[4,10], eventId:'div_characteristics'});
        remember('div_fool_helped', 'El Loco respondió cuando estabas en el borde.', {cat:'favor_received', faction:'tarotClub'});
        return 'Recitás las tres frases. La niebla gris llega de ningún lado y se interpone. Lo que te miraba se retira. No sabés qué precio se pagó, ni quién lo pagó.'; }}
    ]},
  {id:'div_characteristics', type:'pathway', rarity:'extraordinary', tags:['divinity'], chainOnly:true, narrativeImportance:3,
    title:'Lo que falta',
    text:()=>`La Unicidad sola no alcanza. Para ocupar el trono hacen falta también las Características de los ángeles de tu vía: poder que ahora está repartido en otros. Tenés ${divinityCharacteristics()} de las ${DIVINITY_CHAR_REQ} que necesitás.`,
    choices:[
      {label:'Cazar a quien las tiene', small:'Un Beyonder muy alto de tu vía. No va a entregarla.', run:()=>{
        startCombat('rivalBeyonder', {source:'divinity', onWin:'divHuntWin', env:'night', overrides:{name:'Un Beyonder de tu vía', seq:2, pathway:STATE.pathway.chosenPathway, hp:[100,140], dmg:[9,16], defense:3, talk:0.1, reward:{cash:[100,400], characteristic:1}}});
        return 'Lo encontrás donde sabías que iba a estar. Él también te estaba esperando.'; }},
      {label:'Comprarla', small:'En el mercado negro todo tiene precio. Esto, uno absurdo.', requires:()=>knowsLore('black_market') && STATE.character.cash + STATE.character.bank >= 15000*priceIndex(), run:()=>{
        const cost = Math.round(15000*priceIndex());
        if(STATE.character.cash >= cost) applyEffects({cash:-cost}); else { const rest = cost - STATE.character.cash; applyEffects({cash:-STATE.character.cash, bank:-rest}); }
        addCharacteristic(STATE.pathway.chosenPathway, 2, 'el mercado negro, a un precio absurdo'); raiseAttention(15);
        return 'Pagás lo que cuesta una vida entera para cien familias. Te la dan en una caja de plomo. Esa misma noche, alguien te sigue hasta tu casa.'; }},
      {label:'Esperar a que vengan a vos', small:'La ley de convergencia: lo que es de tu vía termina llegando. Tarda años.', run:()=>{
        const wait = rndInt(24,60); STATE.divinity.waitUntil = STATE.time.totalMonths + wait;
        scheduleConsequence({inMonths:wait, title:'Convergencia', text:'Lo que es de tu vía termina llegando a vos: un paquete sin remitente, una herencia imposible, un cuerpo en tu puerta.', effect:{attention:5, characteristic:{pathway:'$chosen', seq:2, from:'la ley de convergencia'}}, tag:'div_converge'});
        return 'Esperás. Los años pasan, y el mundo, lentamente, se inclina hacia vos.'; }}
    ]},
  // ---------------- el modo divino (después del ascenso) ----------------
  {id:'div_prayer', type:'divine', rarity:'common', tags:['divine'], chainOnly:true, narrativeImportance:2,
    title:'Una plegaria',
    text:()=>`${pick(['Una mujer en','Un chico en','Un marinero en','Un anciano en'])} ${currentCity().name} ${pick(['reza por su hijo enfermo','pide que el barco vuelva','pide perdón por algo que no te cuenta','reza sin pedir nada, sólo para no estar solo'])}. Reza con tu nombre honorífico. Te llega como un susurro al oído.`,
    choices:[
      {label:'Responder', small:'Un milagro chico. Se nota.', run:()=>{ STATE.divinity.prayersAnswered++; STATE.anchors.followerBonus = (STATE.anchors.followerBonus||0)+1; applyEffects({humanity:2}); cityAdjust(currentCityKey(), {prosperity:1});
        if(chance(0.2)) { const k = pick(['church','storm']); factionAdjust(k, {suspicion:8}, true); }
        return 'Hacés algo pequeño. Nadie más que esa persona lo entiende. Esa persona no lo va a olvidar nunca.'; }},
      {label:'Escuchar sin intervenir', small:'Un dios que responde a todo deja de ser dios.', run:()=>{ applyEffects({humanity:-1}); return 'Escuchás hasta el final. No hacés nada. Es más difícil de lo que era cuando eras humano.'; }}
    ]},
  {id:'div_old_world', type:'divine', rarity:'common', tags:['divine'], chainOnly:true, narrativeImportance:2,
    title:'El mundo que sigue',
    text:()=>{ const n = aliveNpcs().filter(x=>isFamilyNpc(x) || bondScore(x)>=40).sort((a,b)=>npcAge(b)-npcAge(a))[0];
      return n ? `${n.name} envejece. Lo ves desde muy lejos, como se mira una vela desde la otra punta de una catedral. Todavía te recuerda.` : 'Las personas que conociste ya no están. El mundo que dejaste sigue, con otras caras, sin saber que lo mirás.'; },
    choices:[
      {label:'Visitar en sueños a quien te recuerda', small:'Un rato. Como antes.', run:()=>{ applyEffects({humanity:[3,6]}); STATE.divinity.visits = (STATE.divinity.visits||0)+1;
        return 'Aparecés en un sueño como eras antes. Nadie te pide nada. Se sientan a charlar como si no hubieran pasado años. A la mañana, esa persona se despierta llorando y sonriendo.'; }},
      {label:'Dejarlos ir', small:'Es su vida. Ya no es la tuya.', run:()=>{ applyEffects({humanity:-3}); return 'Mirás para otro lado. La vela sigue ardiendo sin vos.'; }}
    ]},
  {id:'div_gods_conflict', type:'divine', rarity:'rare', tags:['divine'], chainOnly:true, narrativeImportance:3,
    title:'Otros tronos',
    text:'No sos el único. Otros dioses —verdaderos, antiguos, o algo que se hace pasar por eso— notan que hay alguien nuevo. Uno de ellos te pone a prueba.',
    choices:[
      {label:'Responder con fuerza', small:'Que sepan quién sos.', run:()=>{ STATE.divinity.domainActs++; cityAdjust(currentCityKey(), {security:-10}); logWorld('Una tormenta sin nubes arrasa el puerto. Los churches hablan de "un conflicto sobre nuestras cabezas".'); applyEffects({humanity:-4});
        return 'El cielo tiembla una noche entera. Después, silencio. Te dejan en paz. Por ahora.'; }},
      {label:'Ceder terreno', small:'Ser un dios no obliga a ganar.', run:()=>{ applyEffects({humanity:2}); STATE.divinity.ceded = (STATE.divinity.ceded||0)+1; return 'Retrocedés. Tu dominio se achica un poco. Tu gente, abajo, no nota nada. Mejor así.'; }}
    ]}
];
