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
           endGame('negative', 'Tragado por la niebla', `${c.nombre} ${c.apellido} se suma a una expedición al Fog Sea. No vuelve.`, {cause:'niebla'});
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
           endGame('negative', 'La prueba', `${c.nombre} ${c.apellido} acepta la prueba del Tarot Club. La prueba resulta ser exactamente eso: una prueba, y no la pasa.`, {cause:'prueba'});
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

/* ------------------ MÁS ENCARGOS (la vida adulta, las ciudades, las Sequences altas) ------------------ */
MISSION_TEMPLATES.push(
  // ---- mundanos ----
  {id:'mundane_tutor', type:'Mundane', title:'Clases particulares', risk:'Baja', repeatable:true,
   req:()=>STATE.character.edad>=18 && educationRank()>=2,
   scene:{
     text:'Una familia acomodada busca a alguien que le enseñe a su hijo a leer latín y a no dormirse en clase. Pagan puntual. El chico, dicen, "es especial".',
     choices:[
       {label:'Aceptar y hacerlo bien', small:'Paciencia y un sueldo extra.', resolve:()=>{
         applyAndToast({cash:[50,110], sanity:[-2,1]});
         if(chance(0.2)){ applyAndToast({clue:{pathway:['visionary','hermit'], reliability:'mixed', strength:[2,5], source:'un alumno que sueña demasiado'}});
           logJournal('Clases particulares', 'El chico es especial, sí: te cuenta, como quien cuenta el clima, lo que soñaste anoche. Le pedís que no se lo cuente a nadie más. Te mira como si fueras vos el que no entiende.', {cat:'mystery'}); return; }
         logJournal('Clases particulares', 'Tres meses de declinaciones y paciencia. El chico aprueba el examen. La madre te regala una botella de vino que vale más que tu sueldo.');
       }},
       {label:'Hacer lo mínimo', small:'Cobrás igual.', resolve:()=>{
         applyAndToast({cash:[30,60], reputation:-1});
         logJournal('Clases particulares', 'El chico no aprende nada y vos tampoco te esforzás. La familia no te recomienda a nadie.');
       }},
       {label:'Rechazar', small:'', resolve:()=>logJournal('Clases particulares', 'Decís que no tenés tiempo. Es verdad a medias.')}
     ]
   }},
  {id:'mundane_night_shift', type:'Mundane', title:'Un turno de noche en el hospital', risk:'Baja-Moderada', repeatable:true,
   req:()=>STATE.character.edad>=18,
   scene:{
     text:'Al hospital de caridad le falta gente para el turno de noche. Pagan poco y mal, pero pagan. Nadie quiere cubrir la sala del fondo.',
     choices:[
       {label:'Cubrir la sala del fondo', small:'La que nadie quiere.', resolve:()=>{
         applyAndToast({cash:[25,55], reputation:[1,2]});
         if(chance(0.3)){ applyAndToast({sanity:[-6,-2], exposure:2, clue:{pathway:['death','moon'], reliability:'mixed', strength:[2,5], source:'la sala del fondo del hospital'}});
           logJournal('Un turno de noche', 'A las tres de la mañana, un paciente que murió a la tarde se sienta en la cama, te pide un vaso de agua y se vuelve a acostar. Le das el agua. No le contás a nadie.', {cat:'mystery', imp:1}); return; }
         logJournal('Un turno de noche', 'Una noche larga de toses, rezos y manos que se aferran a la tuya. Dos pacientes no llegan a la mañana. Uno te da las gracias antes de irse.');
       }},
       {label:'Cubrir la guardia común', small:'Tranquilo, dentro de lo posible.', resolve:()=>{
         applyAndToast({cash:[20,40]});
         logJournal('Un turno de noche', 'Vendajes, sopa aguada y un médico que duerme sentado. A la mañana cobrás y te vas a dormir vos.');
       }}
     ]
   }},
  {id:'mundane_debt_collection', type:'Mundane', title:'Cobrar una deuda ajena', risk:'Moderada', repeatable:true,
   req:()=>STATE.character.edad>=18,
   scene:{
     text:'Un prestamista del barrio te ofrece un porcentaje si le cobrás a un deudor que "se hace el distraído". Cuando vas, el deudor tiene tres hijos y una mesa vacía.',
     choices:[
       {label:'Cobrar igual', small:'Es tu trabajo.', resolve:()=>{
         applyAndToast({cash:[50,110], reputation:[-4,-1]});
         remember('collected_debt', 'Le sacaste a una familia pobre lo poco que tenía, por encargo.', {cat:'choice'});
         logJournal('Cobrar una deuda ajena', 'El hombre paga con lo que tenía para el mes. Los chicos te miran desde la puerta. El prestamista te da tu parte y una palmada en la espalda.');
       }},
       {label:'Poner la diferencia de tu bolsillo', small:'El prestamista no tiene por qué enterarse.', resolve:()=>{
         applyAndToast({cash:[-60,-20], sanity:[2,5], reputation:[1,3]});
         const n = createNpc({met:true, relType:'acquaintance', ageMin:28, ageMax:50}); adjustRel(n, {trust:[10,16], loyalty:[6,10], dependence:[3,6]});
         logJournal('Cobrar una deuda ajena', `Le decís al prestamista que ${n.name} pagó. Pagaste vos. ${n.name} no sabe cómo agradecerte, y no se olvida.`);
       }},
       {label:'Amenazar al prestamista', small:'Que busque a otro.', resolve:()=>{
         if(chance(0.4)){ logJournal('Cobrar una deuda ajena', 'El prestamista manda a sus muchachos a explicarte cómo funciona el barrio.'); startCombat('thugs', {env:'alley', source:'el prestamista'}); return; }
         applyAndToast({reputation:[1,3]});
         logJournal('Cobrar una deuda ajena', 'El prestamista se ríe, pero no vuelve a mandar a nadie a esa casa. Por ahora.');
       }}
     ]
   }},
  // ---- investigación ----
  {id:'investigation_missing_child', type:'Investigation', title:'Un chico que no volvió', risk:'Moderada-Alta', repeatable:true,
   req:()=>STATE.character.edad>=18,
   scene:{
     text:'El hijo de una vecina no volvió de la escuela hace tres días. La policía "está en eso". La madre te pide ayuda porque "vos siempre sabés cosas".',
     choices:[
       {label:'Buscarlo toda la noche', small:'Cada hora cuenta.', resolve:()=>{
         const r = Math.random() + luckMod();
         if(r < 0.25 && (STATE.flags.mysticExposure||0) >= 15){ logJournal('Un chico que no volvió', 'Lo encontrás. No está solo.', {cat:'combat'}); startCombat(pick(['wraith','lostBeyonder','nightStalker']), {env:'night', source:'la búsqueda', onWin:'found_child'}); return; }
         if(r < 0.7){ applyAndToast({reputation:[4,8], sanity:[2,4]}); remember('found_child', 'Encontraste a un chico perdido y lo devolviste a su casa.', {cat:'achievement'});
           logJournal('Un chico que no volvió', 'Lo encontrás al amanecer, dormido en un vagón abandonado del ferrocarril, con hambre y con miedo. Su madre te abraza tan fuerte que te duele.', {cat:'relation', imp:2}); return; }
         applyAndToast({sanity:[-8,-3]});
         addHiddenTruth('El chico de la vecina no se perdió: alguien se lo llevó. Nunca se supo quién, pero la misma semana desaparecieron otros dos en la ciudad.');
         logJournal('Un chico que no volvió', 'Buscás hasta que no te dan las piernas. No aparece. Esa semana desaparecen dos chicos más en la ciudad, y la policía deja de dar explicaciones.', {cat:'relation', imp:2});
       }},
       {label:'Preguntar en los lugares que la policía no pisa', small:'Otros ojos, otras respuestas.', resolve:()=>{
         applyAndToast({exposure:2, clue:{pathway:'$random', reliability:'mixed', strength:[2,5], source:'la búsqueda de un chico'}});
         if(chance(0.5)){ applyAndToast({reputation:[2,5]}); logJournal('Un chico que no volvió', 'Una vendedora de flores lo vio subir a un carro con un hombre de guantes blancos. Con esa descripción, la policía lo encuentra en dos días, vivo.', {cat:'relation', imp:1}); return; }
         logJournal('Un chico que no volvió', 'Te cuentan cosas que preferirías no haber escuchado sobre lo que pasa con los chicos que nadie reclama. Del hijo de tu vecina, nada.', {cat:'mystery'});
       }}
     ]
   }},
  // ---- místicos ----
  {id:'mystical_haunted_house', type:'Mystical', title:'La casa que nadie alquila', risk:'Moderada', repeatable:true,
   req:()=>STATE.flags.mysticExposure>=10 && STATE.character.edad>=16,
   scene:{
     text:'Un casero desesperado te ofrece tres meses de alquiler gratis si pasás una semana en la casa que nadie le quiere alquilar. Los últimos inquilinos se fueron sin llevarse los muebles.',
     choices:[
       {label:'Pasar la semana entera', small:'Tres meses gratis no se rechazan.', resolve:()=>{
         markMysticAct();
         if(chance(0.3)){ logJournal('La casa que nadie alquila', 'La cuarta noche, lo que vive ahí se cansa de esperar a que te vayas.', {cat:'combat'}); startCombat('wraith', {env:'home', source:'la casa', bonusCash:[60,120]}); return; }
         applyAndToast({cash:[80,160], sanity:[-10,-4], exposure:3, clue:{pathway:['death','darkness'], reliability:'real', strength:[3,7], source:'una casa encantada'}});
         logJournal('La casa que nadie alquila', 'Pasos en el piso de arriba, una mecedora que se mueve, una voz que dice tu nombre al revés. Aguantás. El casero cumple. Vos no volvés a dormir con la luz apagada durante un mes.', {cat:'mystery', imp:1});
       }},
       {label:'Averiguar primero qué pasó ahí', small:'Si sabés quién es, tal vez puedas hablarle.', resolve:()=>{
         applyAndToast({exposure:2, clue:{pathway:'death', reliability:'real', strength:[2,5], source:'la historia de una casa'}});
         if(chance(0.6)){ applyAndToast({cash:[60,120], sanity:[1,4]}); remember('ghost_rest', 'Le diste descanso a un muerto que no sabía que estaba muerto.', {cat:'achievement'});
           logJournal('La casa que nadie alquila', 'En los diarios viejos de la biblioteca encontrás su nombre: una costurera que murió esperando a un hijo que volvía de la guerra. Le leés en voz alta la lista de los que volvieron. Su hijo estaba. La casa queda en silencio.', {cat:'mystery', imp:2}); return; }
         applyAndToast({sanity:[-5,-2]});
         logJournal('La casa que nadie alquila', 'Encontrás demasiadas historias y ninguna encaja. La casa sigue igual. El casero, también.', {cat:'mystery'});
       }},
       {label:'Rechazar', small:'', resolve:()=>logJournal('La casa que nadie alquila', 'Le decís que no. El casero suspira: ya se lo esperaba.')}
     ]
   }},
  {id:'mystical_seance', type:'Mystical', title:'Una sesión espiritista', risk:'Moderada', repeatable:true,
   req:()=>STATE.flags.mysticExposure>=8 && STATE.character.edad>=16,
   scene:{
     text:'Una señora de la alta sociedad organiza una sesión espiritista en su salón y necesita "alguien con sensibilidad" para completar el círculo. Paga el taxi y la cena.',
     choices:[
       {label:'Tomarlo en serio', small:'Abrirte de verdad.', resolve:()=>{
         markMysticAct();
         const real = STATE.character.spirituality >= 35 || chance(0.25);
         if(real){ applyAndToast({sanity:[-9,-3], exposure:4, spirituality:[2,5], clue:{pathway:['death','visionary','fool'], reliability:'real', strength:[4,8], source:'una sesión espiritista'}});
           logJournal('Una sesión espiritista', 'Nadie mueve la mesa: se mueve sola. Y lo que habla no es el marido muerto de la anfitriona. Habla de vos, en primera persona, como si fuera vos dentro de veinte años.', {cat:'mystery', imp:2}); return; }
         applyAndToast({cash:[10,30], reputation:[1,3]});
         logJournal('Una sesión espiritista', 'Humo, cortinas y un médium que golpea la mesa con la rodilla. La anfitriona llora de emoción. Vos cenás muy bien.');
       }},
       {label:'Seguir el juego sin involucrarte', small:'Por la cena.', resolve:()=>{
         applyAndToast({cash:[10,25], reputation:[1,2]});
         logJournal('Una sesión espiritista', 'Tomás las manos que te toca tomar y mirás el techo. Buena cena, mejor vino. Un invitado te pasa su tarjeta: "Si alguna vez quiere algo más serio..."');
         if(chance(0.4)) addRumor();
       }}
     ]
   }},
  // ---- ciudades ----
  {id:'city_trier_survey', type:'Exploration', title:'Cartografiar las catacumbas', risk:'Alta', repeatable:true,
   req:()=>currentCityKey()==='trier' && STATE.character.edad>=16,
   scene:{
     text:'La oficina de obras públicas de Trier paga bien a quien acompañe a sus agrimensores bajo tierra: hay que actualizar los planos de las catacumbas "antes de que se derrumbe otra calle".',
     choices:[
       {label:'Bajar con los agrimensores', small:'Paga bien. Muy bien.', resolve:()=>{
         markMysticAct();
         if(chance(0.3)){ logJournal('Cartografiar las catacumbas', 'En el tercer nivel, uno de los agrimensores deja de responder. Lo que responde en su lugar no es él.', {cat:'combat'}); startCombat('catacombGhoul', {env:'sewer', source:'las catacumbas', allies:true, bonusCash:[80,150]}); return; }
         applyAndToast({cash:[90,180], exposure:3, sanity:[-6,-2]});
         if(chance(0.5)) learnLore('trier_below', 'los planos de las catacumbas');
         if(chance(0.3)) grantIngredientFind('las catacumbas de Trier', true);
         logJournal('Cartografiar las catacumbas', 'Los planos terminan en el cuarto nivel. Debajo hay un quinto que no figura en ninguno: una calle con faroles y números en las puertas. El jefe de agrimensores lo dibuja y después arranca la hoja.', {cat:'mystery', imp:1});
       }},
       {label:'Quedarte arriba, con las cuerdas', small:'Menos plata, más aire.', resolve:()=>{
         applyAndToast({cash:[30,60]});
         logJournal('Cartografiar las catacumbas', 'Doce horas sosteniendo cuerdas y escuchando, por el agujero, el eco de voces que no son las de los agrimensores. Todos suben. Casi todos con la misma cara con la que bajaron.');
       }}
     ]
   }},
  {id:'city_constant_gallery', type:'Exploration', title:'La galería tapiada', risk:'Alta', repeatable:false,
   req:()=>currentCityKey()==='constant' && STATE.character.edad>=18,
   scene:{
     text:'Un ingeniero joven de la compañía minera quiere reabrir en secreto la galería que tapiaron hace treinta años. Necesita a alguien que no tenga miedo y no tenga amigos en el sindicato.',
     choices:[
       {label:'Entrar con él', small:'Lo que haya ahí, lo vas a ver primero.', resolve:()=>{
         markMysticAct();
         learnLore('constant_gallery', 'la galería tapiada');
         if(chance(0.45)){ logJournal('La galería tapiada', 'Detrás del muro no hay oscuridad: hay algo que estaba esperando que alguien lo abriera.', {cat:'combat'}); startCombat('mineThing', {env:'ruins', source:'la galería', bonusCash:[60,140]}); return; }
         applyAndToast({cash:[60,140], sanity:[-10,-4], exposure:4, clue:{pathway:['twilightGiant','hermit','whiteTower'], reliability:'real', strength:[6,11], source:'la galería tapiada'}});
         if(!hasArtifact('miner_lamp') && chance(0.4)) addArtifact('miner_lamp', 'el piso de la galería tapiada');
         logJournal('La galería tapiada', 'Una sala tallada en la roca, con escalones para piernas mucho más largas que las tuyas y un trono vacío del tamaño de una casa. El ingeniero llora. Vos tomás notas con las manos temblando.', {cat:'mystery', imp:2});
         remember('constant_gallery_opened', 'Entraste a la galería tapiada de Constant.', {cat:'place'});
       }},
       {label:'Denunciarlo a la compañía', small:'Hay puertas que se cierran por algo.', resolve:()=>{
         applyAndToast({cash:[20,50]});
         addHiddenTruth('El ingeniero que quería reabrir la galería de Constant fue trasladado a una mina de otra provincia. Murió ahí en un derrumbe, un año después.');
         logJournal('La galería tapiada', 'La compañía te agradece la lealtad con un sobre. Al ingeniero no lo volvés a ver.');
       }},
       {label:'Decirle que no', small:'', resolve:()=>logJournal('La galería tapiada', 'Le decís que no. Él dice que va a buscar a otro. No sabés si lo encontró.')}
     ]
   }},
  {id:'city_enmat_barge', type:'Escort', title:'Una barcaza río arriba', risk:'Moderada', repeatable:true,
   req:()=>currentCityKey()==='enmat' && STATE.character.edad>=16,
   scene:{
     text:'Un contrabandista necesita a alguien que acompañe una barcaza río arriba, de noche, y que no se ponga nervioso si la patrulla de la Iglesia de las Tormentas hace señas con el farol.',
     choices:[
       {label:'Acompañar la barcaza', small:'Plata rápida. Río oscuro.', resolve:()=>{
         applyAndToast({cash:[70,150]});
         const r = Math.random();
         if(r < 0.2){ logJournal('Una barcaza río arriba', 'A mitad de camino, otra barcaza sin luces se les pega al costado. No son de la patrulla.', {cat:'combat'}); startCombat('thugs', {env:'docks', source:'el río'}); return; }
         if(r < 0.4){ factionAdjust('storm', {suspicion:[4,9]}, true); logJournal('Una barcaza río arriba', 'La patrulla los para. El contrabandista paga. Los Castigadores anotan tu cara igual.', {cat:'faction'}); return; }
         logJournal('Una barcaza río arriba', 'Niebla, remos envueltos en trapo y un cargamento que golpea suavemente desde adentro de las cajas. Llegan sin problemas. No preguntás.');
       }},
       {label:'Rechazar', small:'', resolve:()=>logJournal('Una barcaza río arriba', 'Le decís que no. Esa noche, desde la ventana, ves una barcaza sin luces que sube el río.')}
     ]
   }},
  {id:'city_balam_archaeologist', type:'Exploration', title:'El arqueólogo de Backlund', risk:'Alta', repeatable:false,
   req:()=>currentCityKey()==='balam' && STATE.character.edad>=18,
   scene:{
     text:'Un arqueólogo recién llegado de Backlund, de bigote encerado y botas nuevas, busca quien lo guíe a "los templos que los nativos no quieren mostrar". Paga en libras de verdad.',
     choices:[
       {label:'Guiarlo hasta el templo del norte', small:'Donde nadie quiere ir.', resolve:()=>{
         markMysticAct();
         if(chance(0.35)){ logJournal('El arqueólogo de Backlund', 'El templo tiene un guardián. El arqueólogo corre. Vos no llegás a correr.', {cat:'combat'}); startCombat('deathPriest', {env:'ruins', source:'el templo del norte', bonusCash:[80,160]}); return; }
         applyAndToast({cash:[100,200], exposure:4, sanity:[-8,-3], clue:{pathway:'death', reliability:'real', strength:[5,10], source:'un templo de Balam'}});
         if(chance(0.5)) learnLore('balam_sovereign', 'el templo del norte');
         if(!hasArtifact('bone_idol') && chance(0.3)) addArtifact('bone_idol', 'el altar del templo del norte');
         logJournal('El arqueólogo de Backlund', 'El arqueólogo copia inscripciones durante tres días, febril de alegría. La última noche lo encontrás sentado frente al trono vacío, hablando solo. Le contestan. Lo sacás de ahí a la fuerza.', {cat:'mystery', imp:2});
         addHiddenTruth('El arqueólogo que guiaste por Balam publicó sus inscripciones en Backlund. Un año después, la Iglesia retiró todos los ejemplares y el arqueólogo "se jubiló".');
       }},
       {label:'Llevarlo a unas ruinas seguras', small:'Que se lleve una foto linda.', resolve:()=>{
         applyAndToast({cash:[60,110], reputation:[1,2]});
         logJournal('El arqueólogo de Backlund', 'Le mostrás unas ruinas menores, ya saqueadas, y le contás tres leyendas inventadas. Queda encantado. Te paga el doble.');
       }}
     ]
   }},
  // ---- Beyonders con experiencia ----
  {id:'beyonder_apprentice', type:'Beyonder', title:'Alguien que quiere aprender', risk:'Moderada', repeatable:false,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=7 && STATE.character.edad>=25,
   scene:{
     text:'Alguien joven te sigue desde hace semanas. Por fin se anima: sabe lo que sos (no cómo) y quiere que le enseñes. Tiene una fórmula a medias y ninguna idea de lo que cuesta.',
     choices:[
       {label:'Tomarlo como aprendiz', small:'Enseñar también es actuar un papel.', resolve:()=>{
         const n = createNpc({met:true, relType:'contact', role:'Aprendiz', ageMin:17, ageMax:24, tier:'recurrente', trust:30, affection:20, allowHidden:false});
         n.knows.beyonder = true; adjustRel(n, {trust:[10,15], respect:[10,15], loyalty:[8,12], dependence:[6,10]});
         applyAndToast({digestion:[2,5], sanity:[-3,0]}); nudgeActingMethod(0.2, 'enseñando');
         remember('took_apprentice', `Tomaste a ${n.name} como aprendiz.`, {cat:'person', npc:n.id});
         scheduleConsequence({inMonths:[18,48], title:'Lo que aprendió '+n.name, text:`${n.name} bebe su primera poción. Te manda una carta sin firma: "Gracias. Ahora entiendo lo que no me dijiste." No sabés si es un agradecimiento o un reproche.`,
           effect:{rel:{npc:n.id, trust:5, respect:6}}, memory:{tag:'apprentice_beyonder', text:`${n.name}, tu aprendiz, se volvió Beyonder.`, cat:'person', npc:n.id}, cond:{npcAlive:n.id}});
         logJournal('Alguien que quiere aprender', `Aceptás a ${n.name}. Le enseñás lo que te hubiera gustado que alguien te enseñara a vos, y te callás lo que todavía no está listo para oír.`, {cat:'pathway', imp:2});
       }},
       {label:'Asustarlo para que se aleje', small:'Por su bien.', resolve:()=>{
         applyAndToast({sanity:[-2,0]});
         addHiddenTruth('El joven que quiso ser tu aprendiz encontró a otro maestro. Uno de la Orden de la Aurora.');
         logJournal('Alguien que quiere aprender', 'Le mostrás un poco. Lo suficiente para que salga corriendo. Corre. Te quedás con la duda de adónde.', {cat:'pathway'});
       }},
       {label:'Entregarlo a una Iglesia', small:'Que lo cuiden los que saben.', resolve:()=>{
         const f = memberFactions().find(k=>['church','nighthawks','storm','machinery'].includes(k)) || 'church';
         factionMeet(f); factionAdjust(f, {merit:3, trust:[2,5]});
         logJournal('Alguien que quiere aprender', `Lo llevás ante ${factionName(f)}. Lo reciben con amabilidad y una puerta que se cierra detrás de él. Te agradecen "la responsabilidad".`, {cat:'faction'});
       }}
     ]
   }},
  {id:'beyonder_rogue_hunt', type:'Hunting', title:'Cazar a un renegado', risk:'Extrema', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=6,
   scene:{
     text:'Un Beyonder renegado está matando gente en el puerto para quedarse con sus Características. Nadie lo reclama y nadie lo caza. Todavía.',
     choices:[
       {label:'Cazarlo', small:'Una Característica, o tu vida.', resolve:()=>{
         const seq = clamp(STATE.pathway.sequence + rndInt(-1,1), 4, 8);
         logJournal('Cazar a un renegado', 'Lo encontrás donde dijeron. Él también te estaba buscando.', {cat:'combat'});
         startCombat('rivalBeyonder', {env:pick(['docks','alley','night']), source:'caza', bonusCash:[40,120], overrides:{seq}});
       }},
       {label:'Avisarle a quien corresponda', small:'Que se encarguen los que cobran por esto.', resolve:()=>{
         const f = pick(['nighthawks','storm','mi9']); factionMeet(f); factionAdjust(f, {trust:[2,4], merit:2});
         logJournal('Cazar a un renegado', `Pasás el dato a ${factionName(f)}. Una semana después, el puerto vuelve a la calma. Nadie te agradece en voz alta.`, {cat:'faction'});
       }}
     ]
   }},
  {id:'demigod_mediation', type:'Faction', title:'Una mesa entre enemigos', risk:'Alta', repeatable:true,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=5,
   scene:{
     text:'Dos organizaciones que se odian te piden lo mismo: que te sientes entre ellas. Alguien de tu Sequence, dicen, "es respetado por los dos lados". Nadie dice "temido", pero todos lo piensan.',
     choices:[
       {label:'Mediar con honestidad', small:'Que ganen los dos un poco.', resolve:()=>{
         const [a, b] = sample(['church','storm','machinery','mi9','psychology'], 2);
         [a,b].forEach(f=>{ factionMeet(f); factionAdjust(f, {trust:[3,6], publicRep:[2,4]}); });
         applyAndToast({reputation:[2,5], sanity:[-4,-1]});
         logJournal('Una mesa entre enemigos', `Tres noches de té frío entre ${factionShort(a)} y ${factionShort(b)}. Nadie queda contento, que es la única forma de que un acuerdo dure.`, {cat:'faction', imp:2});
       }},
       {label:'Inclinar la mesa hacia quien más te conviene', small:'El poder también se administra.', resolve:()=>{
         const [a, b] = sample(['church','storm','machinery','mi9','psychology'], 2);
         factionMeet(a); factionMeet(b); factionAdjust(a, {trust:[6,10], merit:4}); factionAdjust(b, {trust:[-10,-6], suspicion:[6,12]}, true);
         applyAndToast({corruption:[1,3]}); remember('rigged_mediation', `Inclinaste una mediación a favor de ${factionName(a)}.`, {cat:'betrayal', faction:b});
         logJournal('Una mesa entre enemigos', `${cap(factionShort(a))} sale ganando. ${cap(factionShort(b))} tarda un mes en darse cuenta de por qué.`, {cat:'faction', imp:2});
       }},
       {label:'No sentarte', small:'No es tu guerra.', resolve:()=>logJournal('Una mesa entre enemigos', 'Te negás. Las dos partes se ofenden, cada una a su manera.', {cat:'faction'})}
     ]
   }},
  {id:'demigod_seal', type:'Ritual', title:'Lo que la ciudad no debe ver', risk:'Extrema', repeatable:false,
   req:()=>!!STATE.pathway.chosenPathway && STATE.pathway.sequence<=4,
   scene:{
     text:'Algo pasó por la ciudad anoche. No fue un Beyonder: fue la sombra de algo mucho más alto, y quedó marcada en el aire del barrio viejo como una quemadura. Si nadie la sella, mañana la ve todo el mundo.',
     choices:[
       {label:'Enfrentarla', small:'Sos de los pocos que pueden.', resolve:()=>{
         logJournal('Lo que la ciudad no debe ver', 'Entrás al barrio viejo. El aire es de vidrio.', {cat:'combat', imp:3});
         startCombat('angelShadow', {env:'ruins', source:'la sombra de un Ángel', onWin:'sealed_angel_shadow'});
       }},
       {label:'Sellarla con un ritual, a tu costa', small:'Sin pelea. Con precio.', resolve:()=>{
         applyAndToast({humanity:-4, sanity:[-14,-6], corruption:[2,5], clue:{pathway:'$chosen', reliability:'real', strength:[8,14], source:'la sombra que sellaste'}});
         remember('sealed_angel_shadow', 'Sellaste con tu propia espiritualidad la sombra de un Ángel.', {cat:'achievement'});
         addMilestone('achievement', 'Sella la sombra de un Ángel');
         logJournal('Lo que la ciudad no debe ver', 'Toda la noche de pie, en el centro del barrio vacío, cosiendo el aire con lo que sos. A la mañana, nadie ve nada. Vos tampoco ves igual que antes.', {cat:'pathway', imp:3});
       }},
       {label:'Irte de la ciudad unos días', small:'Que la sellen otros.', resolve:()=>{
         applyAndToast({reputation:[-3,-1]});
         addHiddenTruth('La sombra que dejaste sin sellar enloqueció a once personas del barrio viejo antes de que los Nighthawks llegaran.');
         logJournal('Lo que la ciudad no debe ver', 'Te vas. Cuando volvés, el barrio viejo tiene un hospital nuevo y once camas ocupadas por gente que no habla.', {cat:'pathway', imp:2});
       }}
     ]
   }},
  // ---- la segunda mitad de la vida ----
  {id:'elder_last_favor', type:'Mundane', title:'Un último favor', risk:'Baja', repeatable:false,
   req:()=>STATE.character.edad>=58,
   scene:{
     text:'Un conocido de toda la vida, muy enfermo, te pide un último favor: que le lleves una carta a su hija, con la que no habla hace veinte años. No sabe si ella va a querer abrirla.',
     choices:[
       {label:'Llevarla en persona', small:'Hay cosas que no se mandan por correo.', resolve:()=>{
         applyAndToast({sanity:[3,7], reputation:[1,3]});
         remember('delivered_last_letter', 'Llevaste la última carta de un amigo a su hija.', {cat:'favor_given'});
         logJournal('Un último favor', 'La hija lee la carta en la puerta, sin invitarte a pasar. Después te hace pasar. Toman té en silencio. Al otro día, viaja a ver a su padre. Llega a tiempo.', {cat:'relation', imp:2});
       }},
       {label:'Mandarla por correo', small:'Las piernas ya no son las de antes.', resolve:()=>{
         applyAndToast({sanity:[0,2]});
         logJournal('Un último favor', 'La mandás certificada. Nunca sabés si llegó. Tu amigo muere un mes después, preguntando por el cartero.', {cat:'relation', imp:1});
       }}
     ]
   }},
  {id:'elder_pass_on', type:'Pathway', title:'Lo que sabés, antes de que se pierda', risk:'Baja', repeatable:false,
   req:()=>STATE.character.edad>=55 && (!!STATE.pathway.chosenPathway || loreCount()>=6),
   scene:{
     text:'Te das cuenta de que sabés cosas que nadie más sabe, y de que un día te vas a morir con ellas adentro. Hay alguien joven que podría cargarlas. O podrías quemar los cuadernos.',
     choices:[
       {label:'Enseñarle todo a alguien joven', small:'Que no se pierda.', resolve:()=>{
         const heir = childrenNpcs().find(k=>k.alive && npcAge(k)>=16) || aliveNpcs().filter(n=>n.met && npcAge(n) < STATE.character.edad-20).sort((a,b)=>bondScore(b)-bondScore(a))[0];
         if(heir){ heir.knows.beyonder = heir.knows.beyonder || !!STATE.pathway.chosenPathway; heir.mystic = Math.max(heir.mystic||0, 50); adjustRel(heir, {trust:[6,10], respect:[8,12]});
           remember('legacy_student', `Le enseñaste a ${heir.name} todo lo que sabías del mundo oculto.`, {cat:'person', npc:heir.id});
           logJournal('Lo que sabés, antes de que se pierda', `Durante un año, una tarde por semana, ${heir.name} escucha. No todo lo cree. Todo lo anota.`, {cat:'pathway', imp:2}); }
         else logJournal('Lo que sabés, antes de que se pierda', 'Buscás a quién enseñarle y no encontrás a nadie. Lo escribís todo en un cuaderno y lo escondés donde alguien, algún día, lo va a encontrar.', {cat:'pathway', imp:2});
         applyAndToast({sanity:[3,6]});
       }},
       {label:'Quemar los cuadernos', small:'Hay cosas que es mejor que mueran con uno.', resolve:()=>{
         applyAndToast({sanity:[2,5], corruption:[-3,-1]});
         remember('burned_notes', 'Quemaste todo lo que sabías del mundo oculto.', {cat:'choice'});
         logJournal('Lo que sabés, antes de que se pierda', 'Una tarde de otoño, en la estufa, página por página. Algunas hojas tardan en arder más de lo que deberían. Esperás a que ardan todas.', {cat:'pathway', imp:2});
       }}
     ]
   }}
);
const MISSION_BY_ID = {};
MISSION_TEMPLATES.forEach(m=>{ MISSION_BY_ID[m.id] = m; });
