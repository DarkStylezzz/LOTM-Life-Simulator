'use strict';
/* =========================================================================
   data/missions.js — misiones (§31 original, §27 facciones).
   Cada misión es una escena con decisiones reales, nunca un botón de
   recompensa. La misión pendiente se guarda sólo como {missionId, ...}: al
   elegir, el motor busca la plantilla por id y ejecuta la opción (así
   sobrevive a guardar y recargar — antes se perdía y rompía la partida).
   Las doce primeras son las del juego original, adaptadas a los sistemas
   nuevos (pistas en vez de conocimiento directo, facciones, memoria). Las
   de facción sólo aparecen si tenés el acceso necesario, y son la forma de
   ganar mérito, sueldo y confianza dentro de una organización.
   ========================================================================= */
const MISSION_TYPE_LABEL = {
  Mundane:'Mundana', Mystical:'Mística', Investigation:'Investigación', Faction:'Facción',
  Beyonder:'Beyonder', Pathway:'Vía', Ritual:'Ritual', Hunting:'Caza', Escort:'Escolta',
  Exploration:'Exploración', 'Canon Event':'Evento Canónico', 'Hidden Quest':'Misión Oculta', Duty:'Deber'
};

const MISSION_TEMPLATES = [
  // MUNDANE
  {id:'mundane_move', type:'Mundane', title:'Mudanza de un vecino', risk:'Baja', repeatable:true,
   req:()=>true,
   scene:{
     text:'Un vecino te pide una mano para mudar sus cosas a un nuevo departamento. No es gran cosa, pero paga bien por el día.',
     choices:[
       {label:'Ayudar todo el día', small:'Te cansás, pero cobrás bien.', resolve:()=>{
         applyAndToast({cash:[40,90], salud:[-5,-2]});
         logJournal('Mudanza', 'Pasás el día cargando cajas. El cuerpo lo nota, pero el bolsillo también.');
       }},
       {label:'Ayudar a medias, cobrar igual', small:'Poco esfuerzo, poca gloria.', resolve:()=>{
         applyAndToast({cash:[20,40], reputation:-1});
         logJournal('Mudanza', 'Hacés lo mínimo y cobrás igual. Tu vecino no queda del todo conforme.');
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Mudanza', 'Decidís que hoy no es un buen día para cargar cajas ajenas.');
       }}
     ]
   }},
  // MYSTICAL
  {id:'mystical_basement', type:'Mystical', title:'El rumor del sótano', risk:'Moderada', repeatable:true,
   req:()=>STATE.flags.mysticExposure>5,
   scene:{
     text:'Corre el rumor de que en el sótano de un edificio abandonado pasan cosas raras de noche. Alguien te ofrece pagarte por ir a ver qué es.',
     choices:[
       {label:'Investigar de noche, solo', small:'Alto riesgo, mejor recompensa.', resolve:()=>{
         if(chance(0.15)){
           logJournal('El rumor del sótano', 'Bajás de noche, sin nadie que te acompañe. No estás solo ahí abajo.');
           startCombat('nightStalker', {env:'night'});
           return;
         }
         applyAndToast({clue:{pathway:'$random', reliability:'mixed', strength:[5,10], source:'el sótano abandonado'}, sanity:[-8,-3], cash:[20,60], exposure:3});
         logJournal('El rumor del sótano', 'Encontrás señales de algo que estuvo ahí, aunque no llegás a verlo de frente.');
       }},
       {label:'Ir de día, con más cuidado', small:'Menos riesgo, menos recompensa.', resolve:()=>{
         applyAndToast({cash:[15,35], sanity:[-3,0]});
         logJournal('El rumor del sótano', 'De día el lugar es sólo un sótano húmedo y vacío. Cobrás por la molestia.');
       }},
       {label:'Rechazar el encargo', small:'', resolve:()=>{
         logJournal('El rumor del sótano', 'Preferís no meterte en eso.');
       }}
     ]
   }},
  // INVESTIGATION — el hilo del Sr. Cain. Su afiliación real cambia de vida en vida.
  {id:'investigation_cain', type:'Investigation', title:'Seguir al Sr. Cain', risk:'Moderada', repeatable:true,
   req:()=>{ const npc = npcById('extraño'); return !!npc && npc.alive && !npc.known.faction && npc.met; },
   scene:{
     text:'Ese cliente extraño, el Sr. Cain, volvió a pasar por tu barrio. Esta vez decidís seguirlo de cerca para averiguar a qué se dedica realmente.',
     choices:[
       {label:'Seguirlo de cerca, aceptando el riesgo', small:'Buena chance de descubrir la verdad.', resolve:()=>{
         const npc = npcById('extraño');
         if(chance(0.6 + pathwayMods().stealth*0.5)){
           npc.known.faction = true;
           npc.known.pathway = true;
           revealNpcFaction(npc);
           applyAndToast({sanity:[-8,-2], exposure:4});
           logJournal('Seguir al Sr. Cain', `Lo seguís hasta un lugar que no esperabas. Ahora sabés para quién trabaja realmente: ${factionName(npc.hidden.faction)}.`, {cat:'mystery', imp:2});
           remember('cain_followed', 'Descubriste para quién trabaja el Sr. Cain.', {cat:'secret', npc:npc.id});
         } else {
           adjustRel(npc, {suspicion:20, trust:-5});
           applyAndToast({sanity:[-10,-3]});
           logJournal('Seguir al Sr. Cain', 'Te nota. La mirada que te da antes de perderse entre la gente no te deja tranquilo.');
           remember('cain_noticed_you', 'El Sr. Cain te descubrió siguiéndolo.', {cat:'person', npc:npc.id});
         }
       }},
       {label:'Preguntar con discreción a otros vecinos', small:'Más seguro, menos información.', resolve:()=>{
         const npc = npcById('extraño');
         applyAndToast({reputation:-1});
         adjustRel(npc, {suspicion:5});
         logJournal('Seguir al Sr. Cain', 'Nadie sabe (o nadie quiere decir) mucho sobre él. Preguntar demasiado tampoco te deja bien parado.');
       }},
       {label:'Dejarlo pasar', small:'', resolve:()=>{
         logJournal('Seguir al Sr. Cain', 'Decidís que no es asunto tuyo. Por ahora.');
       }}
     ]
   }},
  // FACTION
  {id:'faction_church_favor', type:'Faction', faction:'church', title:'Favor para la Iglesia', risk:'Moderada', repeatable:true,
   req:()=>STATE.factions.church.known && !factionHostile('church'),
   scene:{
     text:'Padre Yulen te pide un favor: entregar un mensaje sellado a otra parroquia, sin que nadie más se entere de qué se trata.',
     choices:[
       {label:'Entregarlo sin abrirlo', small:'Cumplir es lo que se espera de vos.', resolve:()=>{
         factionAdjust('church', {publicRep:10, trust:4, merit:2});
         applyAndToast({reputation:1});
         logJournal('Favor para la Iglesia', 'Cumplís el encargo al pie de la letra. Padre Yulen te lo agradece.', {cat:'faction'});
         remember('church_favor', 'Le hiciste un favor a la Iglesia sin preguntar nada.', {cat:'favor_given', faction:'church'});
       }},
       {label:'Espiar el contenido antes de entregarlo', small:'Riesgo de ser descubierto.', resolve:()=>{
         if(chance(0.35 - pathwayMods().deception)){
           factionAdjust('church', {publicRep:-15, suspicion:12, trust:-8});
           applyAndToast({reputation:-2});
           logJournal('Favor para la Iglesia', 'El sello no vuelve a quedar igual. Alguien lo nota.', {cat:'faction'});
         } else {
           applyAndToast({clue:{pathway:['darkness','death'], reliability:'real', strength:[3,8], source:'un mensaje sellado de la Iglesia'}});
           factionAdjust('church', {publicRep:4});
           learnLore('church_nighthawks', 'un mensaje sellado');
           logJournal('Favor para la Iglesia', 'Leés el mensaje con cuidado y lo volvés a sellar sin que nadie note nada. Lo que dice ahí te dice más de lo que esperabas.', {cat:'mystery', imp:1});
         }
       }},
       {label:'Rechazar el favor', small:'', resolve:()=>{
         factionAdjust('church', {trust:-1});
         logJournal('Favor para la Iglesia', 'Le decís a Padre Yulen que esta vez no podés ayudar.');
       }}
     ]
   }},
  // BEYONDER
  {id:'beyonder_favor', type:'Beyonder', title:'Un favor entre Beyonders', risk:'Alta', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway,
   scene:{
     text:'Otro Beyonder — alguien que reconoce lo que sos sin que se lo digas — te pide ayuda con algo que prefiere no explicar del todo.',
     choices:[
       {label:'Ayudar sin hacer preguntas', small:'Buena recompensa, riesgo real.', resolve:()=>{
         if(chance(0.15)){
           applyAndToast({sanity:[-35,-20], corruption:[8,18]});
           logJournal('Un favor entre Beyonders', 'Lo que te pidió era mucho más de lo que dejó entender. Ya es tarde para arrepentirte.', {cat:'mystery', imp:2});
           remember('beyonder_favor_bad', 'Un favor a otro Beyonder salió muy mal.', {cat:'trauma'});
         } else {
           applyAndToast({spirituality:[5,12], clue:{pathway:'$chosen', reliability:'real', strength:[6,14], source:'otro Beyonder'}, corruption:[1,5], digestion:[1,3]});
           logJournal('Un favor entre Beyonders', 'Cumplís tu parte. La otra persona no dice gracias, pero lo que te deja a cambio vale más que eso.', {cat:'pathway'});
           scheduleConsequence({inMonths:[8,30], title:'Una deuda entre Beyonders', text:'Aquel Beyonder al que ayudaste sin preguntar reaparece. Esta vez es él quien te da algo, sin que se lo pidas.',
             effect:{clue:{pathway:'$chosen', reliability:'real', strength:[3,6], source:'un Beyonder agradecido'}}, memory:{tag:'beyonder_debt_paid', text:'Un Beyonder al que ayudaste te devolvió el favor.', cat:'favor_received'}, chance:0.6});
         }
       }},
       {label:'Ayudar, pero exigiendo saber de qué se trata primero', small:'Menor riesgo, menor recompensa.', resolve:()=>{
         applyAndToast({spirituality:[2,6], reputation:1});
         logJournal('Un favor entre Beyonders', 'Aceptás, pero sólo después de que te expliquen lo suficiente como para sentirte cómodo.');
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Un favor entre Beyonders', 'Decidís que este no es un favor que valga la pena.');
       }}
     ]
   }},
  // PATHWAY — ahora es una reflexión sobre tu rol (puerta hacia el Método de Actuación)
  {id:'pathway_deepen', type:'Pathway', title:'Profundizar en tu propio camino', risk:'Baja-Moderada', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway,
   scene:{
     text:'Sentís que hay algo más para entender sobre tu propia naturaleza. Dedicarle tiempo tiene un costo, pero también una recompensa real.',
     choices:[
       {label:'Dedicarle el tiempo que haga falta', small:'Entender en qué te estás convirtiendo.', resolve:()=>{
         applyAndToast({digestion:[2,5], clue:{pathway:'$chosen', reliability:'real', strength:[4,8], source:'tu propia reflexión'}, sanity:[-8,-3]});
         nudgeActingMethod(0.35, 'reflexionando sobre tu propia naturaleza');
         logJournal('Profundizar en tu propio camino', 'Pasás horas a solas, entendiendo un poco mejor en qué te estás convirtiendo.', {cat:'pathway'});
       }},
       {label:'Ir con calma, sin forzar nada', small:'Ganancia menor, sin riesgo.', resolve:()=>{
         applyAndToast({digestion:[1,2]});
         nudgeActingMethod(0.12, 'reflexionando con calma');
         logJournal('Profundizar en tu propio camino', 'Avanzás despacio, sin apurar nada.');
       }}
     ]
   }},
  // RITUAL
  {id:'ritual_prep', type:'Ritual', title:'Preparación previa al ritual', risk:'Alta', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.digestion>=60 && STATE.pathway.sequence>0,
   scene:{
     text:'Antes de siquiera pensar en el Advancement Ritual formal, podés dedicar tiempo a preparar el terreno: purificar el espacio, revisar cada símbolo, ensayar cada paso. No garantiza nada, pero reduce el margen de error.',
     choices:[
       {label:'Preparar el terreno a fondo', small:'Mejora tu próximo Advancement. Cuesta.', resolve:()=>{
         STATE.pathway.ritualPrepBonus = clamp((STATE.pathway.ritualPrepBonus||0) + 0.08, 0, 0.2);
         applyAndToast({sanity:[-12,-5], spirituality:[-8,-3]});
         logJournal('Preparación previa al ritual', 'Repasás cada detalle una y otra vez. Cuando llegue el momento, vas a estar mejor preparado.', {cat:'pathway'});
       }},
       {label:'Un repaso rápido, sin obsesionarte', small:'Mejora menor, casi sin costo.', resolve:()=>{
         STATE.pathway.ritualPrepBonus = clamp((STATE.pathway.ritualPrepBonus||0) + 0.03, 0, 0.2);
         applyAndToast({sanity:[-3,0]});
         logJournal('Preparación previa al ritual', 'Le das un repaso general, sin volverte loco con los detalles.');
       }}
     ]
   }},
  // HUNTING
  {id:'hunting_contract', type:'Hunting', title:'Contrato de caza', risk:'Alta', repeatable:true,
   req:()=>STATE.character.edad>=16,
   scene:{
     text:'Alguien con dinero y motivos que prefiere no explicar te ofrece una suma considerable por encargarte de "algo" que está causando problemas. No te dan demasiados detalles de antemano — vas a tener que verlo vos mismo.',
     choices:[
       {label:'Aceptar el contrato', small:'Combate directo, buena paga si sobrevivís.', resolve:()=>{
         const useMystic = chance(mysticExposureChance()*4);
         logJournal('Contrato de caza', 'Aceptás el trabajo. Sea lo que sea, ya es tu problema ahora.');
         startCombat(pickEncounter(useMystic ? 'mystic' : 'mundane'), {bonusCash:[40,80], source:'contrato'});
       }},
       {label:'Rechazar el contrato', small:'', resolve:()=>{
         logJournal('Contrato de caza', 'Decidís que esta no es una pelea que te convenga buscar.');
       }}
     ]
   }},
  // ESCORT
  {id:'escort_job', type:'Escort', title:'Escoltar a un comerciante', risk:'Moderada', repeatable:true,
   req:()=>STATE.character.edad>=16,
   scene:{
     text:'Un comerciante nervioso te ofrece pagarte por acompañarlo en un trayecto que, según él, "probablemente" no tenga problemas.',
     choices:[
       {label:'Aceptar y acompañarlo', small:'Paga garantizada, riesgo de encontrarse algo en el camino.', resolve:()=>{
         applyAndToast({cash:[50,120]});
         if(chance(0.25)){
           logJournal('Escoltar a un comerciante', 'A mitad de camino, justo lo que el comerciante temía, aparece.');
           startCombat(pickEncounter('mundane'), {env:'street'});
         } else {
           logJournal('Escoltar a un comerciante', 'El viaje termina sin sobresaltos. El comerciante paga lo prometido, aliviado.');
         }
       }},
       {label:'Rechazar', small:'', resolve:()=>{
         logJournal('Escoltar a un comerciante', 'Le decís que esta vez tendrá que arreglárselas solo.');
       }}
     ]
   }},
  // EXPLORATION
  {id:'exploration_fogsea', type:'Exploration', title:'Expedición al Fog Sea', risk:'Alta', repeatable:false,
   req:()=>(!!STATE.pathway.chosenPathway || STATE.flags.mysticExposure>=40) && STATE.character.edad>=18,
   scene:{
     text:'Se organiza una expedición hacia el Fog Sea, una de las regiones más peligrosas e inexploradas del mundo conocido. No es un viaje que se haga por curiosidad — pocos vuelven con algo que valga la pena contar, y no todos vuelven.',
     choices:[
       {label:'Sumarte a la expedición', small:'Muy arriesgado. Recompensa importante.', resolve:()=>{
         applyEffects({cash:-200});
         if(chance((STATE.pathway.chosenPathway ? 0.1 : 0.16) * diffMult('death') - fateSave())){
           const c = STATE.character;
           endGame('negative', 'Tragado por la niebla', `${c.nombre} ${c.apellido} se suma a una expedición al Fog Sea. No vuelve.`);
           return;
         }
         applyAndToast({clue:{pathway:'$chosenOrRandom', reliability:'real', strength:[15,30], source:'el Fog Sea'}, sanity:[-20,-10], reputation:[3,8]});
         if(chance(0.4)) learnLore('f_fog_sea', 'la expedición al Fog Sea');
         if(chance(0.3)) grantIngredientFind('el Fog Sea');
         logJournal('Expedición al Fog Sea', 'Volvés de la niebla con algo que muy pocos han visto, y con vida para contarlo.', {cat:'achievement', imp:2});
         remember('fog_sea', 'Volviste vivo del Fog Sea.', {cat:'place'});
         addMilestone('achievement', 'Vuelve vivo del Fog Sea');
       }},
       {label:'Quedarte afuera', small:'', resolve:()=>{
         logJournal('Expedición al Fog Sea', 'Dejás que otros se arriesguen esta vez.');
       }}
     ]
   }},
  // CANON EVENT
  {id:'canon_conclave', type:'Canon Event', title:'El Rumor del Cónclave', risk:'Baja', repeatable:false,
   req:()=>STATE.time.totalMonths>=18*12 || STATE.flags.mysticExposure>=10,
   scene:{
     text:'Se comenta, en voz baja, que representantes de varias iglesias se reunieron en Backlund para un cónclave poco habitual. Nadie sabe bien de qué se trató, pero todos coinciden en que algo cambió después de eso.',
     choices:[
       {label:'Preguntar discretamente qué se sabe', small:'Enterarte, sin riesgo real.', resolve:()=>{
         applyAndToast({exposure:5, reputation:1});
         learnLore('orthodox_churches', 'el rumor del cónclave');
         logJournal('El Rumor del Cónclave', 'Juntás fragmentos de lo que se dice por ahí. Nada confirmado, pero suficiente para entender que el mundo sigue moviéndose, con o sin vos.', {cat:'world'});
       }},
       {label:'Ignorarlo — no es asunto tuyo', small:'', resolve:()=>{
         logJournal('El Rumor del Cónclave', 'Decidís no prestarle atención. Sea lo que sea, no te incumbe.');
       }}
     ]
   }},
  // HIDDEN QUEST — la prueba del Tarot Club (ver systems/tarot.js)
  {id:'hidden_tarot_task', type:'Hidden Quest', title:'Un encargo del Tarot Club', risk:'Extrema', repeatable:false,
   req:()=>STATE.factions.tarotClub.discovered && STATE.tarot.stage>=3 && STATE.tarot.stage<6,
   scene:{
     text:'A través de canales que no podés rastrear del todo, te llega un mensaje: el Tarot Club tiene un encargo para vos. No es una invitación — es una prueba. Aceptarla podría abrirte puertas que nadie más puede abrir. Rechazarla podría ser lo más prudente que hagas en toda tu vida.',
     choices:[
       {label:'Aceptar la prueba', small:'Extremadamente peligroso. Recompensa como ninguna otra.', resolve:()=>{
         const c = STATE.character;
         if(chance(0.25 * diffMult('death') - fateSave())){
           endGame('negative', 'La prueba', `${c.nombre} ${c.apellido} acepta la prueba del Tarot Club. La prueba resulta ser exactamente eso: una prueba, y no la pasa.`);
           return;
         }
         factionAdjust('tarotClub', {secretRep:30, trust:10});
         STATE.factions.tarotClub.known = true;
         tarotObserve(40, 'superaste la prueba');
         applyAndToast({clue:{pathway:'$chosenOrRandom', reliability:'real', strength:[20,35], source:'el encargo del Tarot Club'}, corruption:[10,25], sanity:[-30,-15], cash:[200,600]});
         logJournal('Un encargo del Tarot Club', 'Hacés lo que te piden. No preguntás demasiado. Cuando termina, algo en vos ya no es exactamente lo mismo — pero el Tarot Club ahora sabe tu nombre.', {cat:'faction', imp:3});
         remember('tarot_test', 'Superaste la prueba del Tarot Club.', {cat:'organization', faction:'tarotClub'});
       }},
       {label:'Rechazar la prueba', small:'Prudente, pero cierra una puerta.', resolve:()=>{
         tarotObserve(-20, 'rechazaste la prueba');
         logJournal('Un encargo del Tarot Club', 'Rechazás el encargo. No hay una segunda oportunidad para esto — al menos no de la misma forma.');
       }}
     ]
   }},

  /* ------------------ DEBERES DE FACCIÓN (§27) ------------------
     Aparecen sólo si tenés acceso (colaborador o más) y no estás enfrentado
     con la facción. Dan mérito (para pedir fórmulas, ingredientes,
     entrenamiento) y confianza — o la quitan. */
  {id:'duty_church_relic', type:'Duty', faction:'church', access:2, title:'Custodiar una reliquia', risk:'Moderada', repeatable:true,
   req:()=>factionAccess('church')>=2 && !factionHostile('church'),
   scene:{
     text:'La Iglesia necesita que alguien de confianza vigile, durante una noche, una reliquia que se trasladará al amanecer. "No la abras. No la mires demasiado. Y si escuchás algo, rezá."',
     choices:[
       {label:'Vigilar toda la noche, rezando cuando haga falta', small:'Deber cumplido.', resolve:()=>{
         factionAdjust('church', {merit:4, trust:5, publicRep:3});
         applyAndToast({sanity:[-4,-1]});
         logJournal('Custodiar una reliquia', 'La noche es larga. En algún momento la caja golpea desde adentro. Rezás. A la mañana, entregás la reliquia intacta.', {cat:'faction'});
       }},
       {label:'Espiar la reliquia', small:'Querés saber qué es.', resolve:()=>{
         if(chance(0.45)){
           learnLore('church_sealed', 'la reliquia que custodiaste');
           applyAndToast({sanity:[-8,-3], exposure:4});
           logJournal('Custodiar una reliquia', 'La abrís apenas un dedo. Adentro hay un ojo que parpadea. Cerrás. Nadie se entera. Vos no te olvidás más.', {cat:'mystery', imp:2});
         } else {
           factionAdjust('church', {trust:-12, suspicion:15});
           logJournal('Custodiar una reliquia', 'El sello se nota tocado. A la mañana, el diácono te mira de otra forma.', {cat:'faction'});
         }
       }}
     ]
   }},
  {id:'duty_nighthawk_patrol', type:'Duty', faction:'nighthawks', access:2, title:'Patrulla nocturna', risk:'Alta', repeatable:true,
   req:()=>factionAccess('nighthawks')>=2 && !factionHostile('nighthawks'),
   scene:{
     text:'Los Nighthawks necesitan un par de ojos más esta noche: hubo reportes de "algo" en los muelles. Te dan una lámpara, un silbato y ninguna explicación.',
     choices:[
       {label:'Patrullar con el equipo', small:'Seguro, si el equipo es bueno.', resolve:()=>{
         factionAdjust('nighthawks', {merit:4, trust:4});
         if(chance(0.35)){ logJournal('Patrulla nocturna', 'Lo encuentran. Es peor de lo que decían los reportes.', {cat:'faction'}); startCombat(pickEncounter('mystic'), {env:'docks', allies:true}); return; }
         applyAndToast({sanity:[-3,0], exposure:2});
         logJournal('Patrulla nocturna', 'Nada. Una noche entera de niebla y nada. El capitán dice que eso es lo mejor que puede pasar.', {cat:'faction'});
       }},
       {label:'Ofrecerte para la parte más peligrosa, solo', small:'Más mérito, más riesgo.', resolve:()=>{
         factionAdjust('nighthawks', {merit:7, trust:6});
         logJournal('Patrulla nocturna', 'Te toca el depósito del fondo. Ahí está.', {cat:'faction'});
         startCombat(pickEncounter('mystic'), {env:'docks'});
       }}
     ]
   }},
  {id:'duty_nighthawk_lost', type:'Duty', faction:'nighthawks', access:3, title:'Contener a un Beyonder', risk:'Extrema', repeatable:true,
   req:()=>factionAccess('nighthawks')>=3 && !factionHostile('nighthawks') && !!STATE.pathway.chosenPathway,
   scene:{
     text:'Un Beyonder perdió el control en un conventillo. Todavía hay gente adentro. El capitán te mira: "Vos entrás por atrás."',
     choices:[
       {label:'Entrar', small:'Hay gente adentro.', resolve:()=>{
         factionAdjust('nighthawks', {merit:10, trust:8});
         remember('contained_beyonder', 'Entraste a enfrentar a un Beyonder que había perdido el control.', {cat:'achievement'});
         startCombat('lostBeyonder', {env:'home', allies:true});
       }},
       {label:'Negarte', small:'No vas a morir por ellos.', resolve:()=>{
         factionAdjust('nighthawks', {trust:-15});
         applyAndToast({sanity:[-6,-2]});
         logJournal('Contener a un Beyonder', 'Te quedás afuera. Escuchás todo. No te lo perdonás del todo, y el capitán tampoco.', {cat:'faction'});
         remember('refused_containment', 'Te negaste a entrar cuando había gente adentro.', {cat:'trauma'});
       }}
     ]
   }},
  {id:'duty_storm_ship', type:'Duty', faction:'storm', access:2, title:'Inspeccionar un barco', risk:'Moderada', repeatable:true,
   req:()=>factionAccess('storm')>=2 && !factionHostile('storm') && currentCity().port,
   scene:{
     text:'Un barco mercante llegó con la bodega sellada y la tripulación callada. La Iglesia de las Tormentas quiere saber qué trae antes de que lo descarguen.',
     choices:[
       {label:'Revisar la bodega con los Castigadores', small:'Hacer el trabajo.', resolve:()=>{
         factionAdjust('storm', {merit:4, trust:4});
         if(chance(0.3)){ applyAndToast({clue:{pathway:'tyrant', reliability:'real', strength:[4,8], source:'la bodega de un barco'}}); }
         logJournal('Inspeccionar un barco', 'Contrabando, sí. Y debajo del contrabando, algo que los Castigadores se llevan sin dejar que lo mires dos veces.', {cat:'faction'});
       }},
       {label:'Aceptar el soborno del capitán', small:'Plata fácil. Traición.', resolve:()=>{
         applyAndToast({cash:[80,200]});
         if(chance(0.4)){ factionAdjust('storm', {trust:-20, suspicion:25}); logJournal('Inspeccionar un barco', 'Alguien de la tripulación habla. La Iglesia de las Tormentas no perdona.', {cat:'faction', imp:2}); }
         else logJournal('Inspeccionar un barco', 'Firmás que la bodega está limpia. Nadie pregunta.', {cat:'faction'});
         remember('storm_bribe', 'Aceptaste un soborno en una inspección de la Iglesia de las Tormentas.', {cat:'betrayal', faction:'storm'});
       }}
     ]
   }},
  {id:'duty_machinery_anomaly', type:'Duty', faction:'machinery', access:2, title:'Medir una anomalía', risk:'Moderada', repeatable:true,
   req:()=>factionAccess('machinery')>=2 && !factionHostile('machinery'),
   scene:{
     text:'La Mente Colmena te pide que lleves un instrumento de latón a una fábrica donde "las máquinas trabajan de noche sin que nadie las encienda".',
     choices:[
       {label:'Medir con cuidado y anotar todo', small:'Método.', resolve:()=>{
         factionAdjust('machinery', {merit:4, trust:4});
         applyAndToast({clue:{pathway:['whiteTower','hermit'], reliability:'real', strength:[3,7], source:'una anomalía medida'}, sanity:[-3,0]});
         logJournal('Medir una anomalía', 'La aguja del instrumento marca algo que no tiene nombre. Lo anotás igual.', {cat:'faction'});
       }},
       {label:'Tocar la máquina', small:'Curiosidad.', resolve:()=>{
         if(chance(0.5)){ applyAndToast({salud:[-12,-4], sanity:[-6,-2]}); logJournal('Medir una anomalía', 'La máquina te agarra la mano. Te suelta. Tarda.', {cat:'faction'}); }
         else { applyAndToast({clue:{pathway:'$random', reliability:'mixed', strength:[4,9], source:'una máquina que trabaja sola'}}); factionAdjust('machinery', {merit:2}); logJournal('Medir una anomalía', 'Al tocarla, entendés qué la mueve. No se lo decís a nadie.', {cat:'mystery'}); }
       }}
     ]
   }},
  {id:'duty_mi9_watch', type:'Duty', faction:'mi9', access:2, title:'Vigilar a un vecino', risk:'Moderada', repeatable:true,
   req:()=>factionAccess('mi9')>=2 && !factionHostile('mi9') && aliveNpcs().some(n=>n.relType!=='family'),
   scene:{
     text:'MI9 quiere un informe sobre alguien de tu entorno: horarios, visitas, conversaciones. "Nada personal. Seguridad del reino."',
     choices:[
       {label:'Escribir un informe completo', small:'Cumplir. Aunque sea alguien que conocés.', resolve:()=>{
         const target = pick(aliveNpcs().filter(n=>n.relType!=='family'));
         factionAdjust('mi9', {merit:5, trust:5});
         if(target){
           remember('informed_on', `Informaste sobre ${target.name} a MI9.`, {cat:'betrayal', npc:target.id, faction:'mi9'});
           addHiddenTruth(`Tu informe sobre ${target.name} terminó en una carpeta de MI9 con una marca al lado.`);
           if(chance(0.25)) scheduleConsequence({inMonths:[6,24], title:'Lo que hiciste', text:`${target.name} se entera, de alguna forma, de que alguien informó sobre su vida. Te mira distinto. No sabe que fuiste vos. Todavía.`,
             effect:{rel:{npc:target.id, trust:-10, suspicion:15}}, cond:{npcAlive:target.id}});
         }
         logJournal('Vigilar a un vecino', 'Escribís el informe. Es sorprendentemente fácil.', {cat:'faction'});
       }},
       {label:'Escribir un informe vacío', small:'Proteger a los tuyos.', resolve:()=>{
         if(chance(0.35)){ factionAdjust('mi9', {trust:-10, suspicion:12}); logJournal('Vigilar a un vecino', 'MI9 nota que tu informe no dice nada. Eso también es información.', {cat:'faction'}); }
         else { factionAdjust('mi9', {merit:1}); logJournal('Vigilar a un vecino', 'Entregás algo inofensivo. Nadie protesta.', {cat:'faction'}); }
       }}
     ]
   }},
  {id:'duty_aurora_offering', type:'Duty', faction:'aurora', access:1, title:'Una ofrenda para la Aurora', risk:'Extrema', repeatable:true,
   req:()=>factionAccess('aurora')>=1 && STATE.factions.aurora.relationship!=='enemiga',
   scene:{
     text:'La Orden de la Aurora te pide una ofrenda para el Verdadero Creador. "Algo que te duela. El poder se paga con eso."',
     choices:[
       {label:'Ofrecer tu propia sangre', small:'Poder rápido. Precio real.', resolve:()=>{
         factionAdjust('aurora', {merit:5, trust:6, secretRep:5});
         applyAndToast({salud:[-10,-4], corruption:[5,10], spirituality:[4,9], clue:{pathway:'hangedMan', reliability:'real', strength:[5,10], source:'un ritual de la Aurora'}});
         logJournal('Una ofrenda para la Aurora', 'La sangre cae sobre un símbolo que la bebe. Algo te devuelve la mirada, satisfecho.', {cat:'faction', imp:2});
         remember('aurora_blood', 'Le ofreciste tu sangre al Verdadero Creador.', {cat:'pact', faction:'aurora'});
       }},
       {label:'Ofrecer "algo" de otra persona', small:'Que pague otro.', resolve:()=>{
         factionAdjust('aurora', {merit:8, trust:8});
         applyAndToast({corruption:[8,14], sanity:[-10,-4], humanity:-4});
         logJournal('Una ofrenda para la Aurora', 'Nadie supo nunca de dónde salió lo que entregaste. Vos sí.', {cat:'faction', imp:2});
         remember('aurora_other', 'Entregaste a la Aurora algo que no era tuyo.', {cat:'trauma'});
       }},
       {label:'Irte y no volver', small:'Esto no es para vos.', resolve:()=>{
         factionAdjust('aurora', {trust:-20, suspicion:15});
         logJournal('Una ofrenda para la Aurora', 'Te vas. Sentís ojos en la nuca durante semanas.', {cat:'faction'});
         scheduleConsequence({inMonths:[2,10], title:'La Aurora no olvida', text:'Alguien de la Aurora te espera en la puerta de tu casa. Sonríe. Tiene un cuchillo ceremonial.', eventId:'aurora_revenge', chance:0.5});
       }}
     ]
   }},
  {id:'duty_psychology_patient', type:'Duty', faction:'psychology', access:2, title:'Un paciente difícil', risk:'Moderada', repeatable:true,
   req:()=>factionAccess('psychology')>=2 && !factionHostile('psychology'),
   scene:{
     text:'Los Alquimistas te piden que acompañes a un paciente durante una sesión: dice que alguien le habla desde el fondo de un "mar".',
     choices:[
       {label:'Escucharlo con paciencia', small:'Acompañar.', resolve:()=>{
         factionAdjust('psychology', {merit:4, trust:4});
         applyAndToast({sanity:[-4,-1], clue:{pathway:'visionary', reliability:'real', strength:[3,7], source:'un paciente de los Alquimistas'}});
         logJournal('Un paciente difícil', 'Lo escuchás durante horas. En algún momento, vos también oís la voz del fondo.', {cat:'faction'});
       }},
       {label:'Meterte en su mente para ver qué hay', small:'Arriesgado.', resolve:()=>{
         if(chance(0.5)){ learnLore('psychology_sea', 'la mente de un paciente'); factionAdjust('psychology', {merit:6}); applyAndToast({sanity:[-10,-4]}); logJournal('Un paciente difícil', 'Entrás. Hay un mar. Y hay algo nadando.', {cat:'mystery', imp:2}); }
         else { applyAndToast({sanity:[-14,-6]}); logJournal('Un paciente difícil', 'Salís con algo que no es tuyo. Tarda semanas en irse.', {cat:'faction'}); }
       }}
     ]
   }}
];
const MISSION_BY_ID = {};
MISSION_TEMPLATES.forEach(m=>{ MISSION_BY_ID[m.id] = m; });
