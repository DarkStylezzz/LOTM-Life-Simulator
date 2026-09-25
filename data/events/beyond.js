'use strict';
/* =========================================================================
   data/events/beyond.js — la vida de los que subieron alto.
   De la Sequence 6 hacia arriba el poder deja de ser una herramienta y se
   vuelve una condición: las Características se atraen, los animales huyen,
   alguien empieza a rezarte, los que te odiaban hace décadas vuelven con
   poder propio, el tiempo pasa distinto y algo mucho más grande empieza a
   mirarte. Cada escena pregunta lo mismo de formas distintas: ¿cuánto de
   persona te queda, y cuánto estás dispuesto a pagar para conservarlo?
   ========================================================================= */
const EVENTS_HIGH = [
  /* ---------------- Sequence 6 y 5: el poder se vuelve serio ---------------- */
  {id:'hs_convergence', type:'pathway', rarity:'uncommon', tags:['beyonder','characteristic'], requirements:{beyonder:true, seqMax:6}, weight:4, cooldown:60, narrativeImportance:3,
    title:'La convergencia',
    text:'Hace días que sentís un tirón en el pecho, como una brújula que apunta siempre al mismo barrio. Algo de tu misma vía está cerca: una Característica suelta, o alguien que la lleva adentro.',
    choices:[
      {label:'Seguir el tirón', small:'Lo que es de tu vía, te llama.',
        run:()=>{ markMysticAct(); learnLore('convergence_law', 'el tirón en el pecho'); const p = STATE.pathway;
          if(chance(0.45)){ const seq = clamp(p.sequence + rndInt(-1,0), 1, 8); startCombat('rivalBeyonder', {env:pick(['alley','night','street']), source:'la convergencia', overrides:{pathway:p.chosenPathway, seq}}); return 'El tirón te lleva hasta alguien que siente exactamente lo mismo, en sentido contrario. Se reconocen en la misma mirada.'; }
          const seq = chance(0.3) ? Math.max(0, p.sequence - 1) : p.sequence;
          addCharacteristic(p.chosenPathway, seq, 'la convergencia'); applyEffects({sanity:[-6,-2], attention:2});
          return 'El tirón termina en un sótano cerrado desde hace años. Sobre una silla, un traje viejo y, en el bolsillo del saco, algo que late al ritmo de tu corazón. Quien lo llevaba no se fue del todo.'; }},
      {label:'Resistir', small:'No todo lo que te llama es para vos.',
        run:()=>{ applyEffects({sanity:[-8,-3], clue:{pathway:'$chosen', reliability:'real', strength:[2,5], silent:true}}); return 'Pasás dos semanas con el tirón clavado en el esternón, como un anzuelo. Una mañana se va. En los diarios, esa semana, aparece un Beyonder muerto en ese barrio. Alguien más siguió el tirón.'; }},
      {label:'Avisarle a tu organización', small:'Que lo recojan ellos.',
        requires:()=>memberFactions().some(k=>k!=='tarotClub'),
        run:()=>{ const f = memberFactions().find(k=>k!=='tarotClub'); factionAdjust(f, {merit:[4,7], trust:[2,5]}); return `Das el aviso. ${cap(factionShort(f))} manda gente esa misma noche. Te agradecen con un mérito en tu ficha y ninguna explicación.`; }}
    ]},
  {id:'hs_elite_offer', type:'faction', rarity:'uncommon', tags:['faction','rank'], requirements:{beyonder:true, seqMax:6}, weight:3, cooldown:96, narrativeImportance:3,
    context:(ctx)=>{ const f = memberFactions().filter(k=>k!=='tarotClub' && F(k).access < 5 && !factionHostile(k)); if(!f.length) return null; ctx.faction = pick(f); return ctx; },
    title:'Una silla más arriba',
    text:(ctx)=>`Te citan en una oficina de ${factionName(ctx.faction)} donde nunca habías entrado. Te ofrecen más: más acceso, más secretos, más gente a tu cargo. A cambio, piden lo de siempre, pero más: obediencia.`,
    choices:[
      {label:'Aceptar', small:'Subir también es un camino.',
        run:(ctx)=>{ const f = F(ctx.faction); factionAdjust(ctx.faction, {access:Math.min(5, f.access+1), trust:[4,8], merit:[3,6]}); f.rank = Math.min(((FACTIONS_DATA[ctx.faction]||{}).ranks||[0]).length-1, (f.rank||0)+1);
          remember('rank_up_'+ctx.faction, `Aceptaste un puesto más alto en ${factionName(ctx.faction)}.`, {cat:'organization', faction:ctx.faction});
          return 'Firmás. Te dan una llave, un nombre en clave y una carpeta con cosas que no vas a poder olvidar. A la semana, alguien que antes te daba órdenes te saluda primero.'; }},
      {label:'Rechazar con cortesía', small:'Preferís tu libertad.',
        run:(ctx)=>{ factionAdjust(ctx.faction, {trust:[-6,-2], suspicion:[2,5]}); return 'Agradecés. Decís que no. Nadie se ofende en voz alta. Alguien anota, en tu ficha, que no quisiste.'; }}
    ]},
  {id:'hs_ordinary_day', type:'pathway', rarity:'common', tags:['beyonder','humanity'], requirements:{beyonder:true, seqMax:6}, weight:3, cooldown:36,
    title:'Un día normal',
    text:'Decidís tener un día normal: desayunar sin apuro, leer el diario, visitar a alguien, no pensar en pociones. Es más difícil de lo que parece. El papel que interpretás no se toma días libres.',
    choices:[
      {label:'Hacer el esfuerzo', small:'Ser una persona, aunque cueste.',
        run:()=>{ applyEffects({humanity:2, sanity:[2,5], digestion:[-1,0]}); const n = pick(closeNpcs()); if(n) adjustRel(n, {affection:[3,6]});
          return `Un día entero de cosas chicas.${n ? ' Almorzás con '+n.name+', que no sabe por qué estás tan contento.' : ''} A la noche, el papel vuelve, como un perro que te esperó en la puerta. Pero tuviste el día.`; }},
      {label:'Dejar que el papel decida', small:'Al final, sos lo que actuás.',
        run:()=>{ applyEffects({humanity:-1, digestion:[1,3]}); return 'A media mañana ya estás actuando otra vez, sin darte cuenta. La poción se asienta un poco más. El diario queda sin leer sobre la mesa.'; }}
    ]},
  {id:'hs_same_path', type:'pathway', rarity:'uncommon', tags:['beyonder','rival'], requirements:{beyonder:true, seqMax:6, seqMin:4}, weight:3, cooldown:96, narrativeImportance:3,
    title:'Otro como vos',
    text:'En una reunión donde no esperabas a nadie de tu mundo, lo sentís antes de verlo: alguien de tu misma vía, de tu misma Sequence. Te sostiene la mirada. En la ley de convergencia, dos como ustedes son o aliados o un problema.',
    choices:[
      {label:'Proponer una alianza', small:'Mejor juntos que en contra.',
        run:()=>{ const p = STATE.pathway; const n = createMysticContact({pathway:p.chosenPathway, sequence:p.sequence, role:'Beyonder de tu misma vía'}); n.known.pathway = true; adjustRel(n, {trust:[8,14], respect:[8,12]});
          remember('ally_same_path', `Hiciste una alianza con ${n.name}, de tu misma vía.`, {cat:'person', npc:n.id});
          return `Se llama ${n.name}. Hablan toda la noche como dos músicos que tocan el mismo instrumento. Acuerdan no pisarse. Acuerdan avisarse. Ninguno de los dos cree del todo que el otro lo vaya a cumplir.`; }},
      {label:'Marcar el territorio', small:'Que sepa quién estaba primero.',
        run:()=>{ const p = STATE.pathway; applyEffects({attention:2}); scheduleConsequence({inMonths:[3,14], title:'El otro', text:'El Beyonder de tu misma vía no olvidó la amenaza. Esta vez viene a buscarte.', effect:{combat:'rivalBeyonder'}, chance:0.5});
          return 'Le dejás claro, sin levantar la voz, que esta ciudad es tuya. Sonríe como quien anota una deuda.'; }},
      {label:'Irte antes de que se acerque', small:'No buscar problemas.',
        run:()=>{ applyEffects({sanity:[-2,0]}); return 'Te vas por la puerta de servicio. Durante meses, cada vez que el pecho te tira un poco, mirás por encima del hombro.'; }}
    ]},
  {id:'hs_reflection', type:'pathway', rarity:'uncommon', tags:['beyonder','humanity'], requirements:{beyonder:true, seqMax:5}, weight:3, cooldown:60,
    run:()=>{ const a = STATE.anchors;
      if(a.revealed && (a.anchorStrength||0) >= 50){ applyEffects({sanity:[2,5]}); return {title:'El espejo', text:'Durante un segundo, el espejo del baño muestra lo que sos de verdad, y no es una cara. Después pensás en las personas que te esperan en la cocina, y el espejo, obediente, te devuelve la tuya.'}; }
      applyEffects({sanity:[-10,-4], humanity:-1}); return {title:'El espejo', text:'Durante un segundo, el espejo del baño muestra lo que sos de verdad, y no es una cara. Te lleva un rato largo acordarte de cómo era la tuya. Tapás el espejo con una toalla.'}; }},
  {id:'hs_old_debt', type:'threat', rarity:'rare', tags:['beyonder','past'], requirements:{beyonder:true, seqMax:5, ageMin:40}, weight:3, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>memoriesByCat('betrayal').length > 0 || (STATE.character.stats.killed||0) > 0,
    title:'Una deuda de hace décadas',
    text:'Alguien te espera sentado en tu propio sillón. No lo reconocés hasta que habla: es de hace mucho, de una vida anterior a esta que tenés ahora. Lo que le hiciste lo convirtió en algo, y ahora ese algo tiene poder propio.',
    choices:[
      {label:'Enfrentarlo', small:'Terminar lo que empezó hace años.',
        run:()=>{ startCombat('demigodHunter', {env:'home', source:'una deuda vieja'}); return 'Se levanta del sillón. No tiene apuro. Tuvo años para prepararse.'; }},
      {label:'Pedirle perdón', small:'Tal vez es lo que vino a buscar.',
        outcomes:[
          {p:0.45, effects:{humanity:3, sanity:[4,8]}, text:'Hablás mucho tiempo. Él escucha. Cuando terminás, se levanta, deja algo sobre la mesa —una foto vieja, de los dos— y se va. No sabés si te perdonó. Sabés que no va a volver.'},
          {p:0.55, effects:{sanity:[-6,-2]}, text:'Te escucha hasta el final, sonriendo. "Llegaste tarde", dice. Se va sin tocarte. Esa noche entendés que no vino a vengarse: vino a mostrarte que podía.'}
        ]},
      {label:'Pagarle lo que le debés', small:'Con lo que tengas.',
        run:()=>{ const v = Math.round(Math.min(STATE.character.cash, 400*priceIndex())); applyEffects({cash:-v, humanity:1}); return `Le das ${fmtMoney(v)}. Lo mira con desprecio y se lo guarda igual. "Esto no alcanza", dice, "pero es un comienzo". Tenés la sensación de que va a volver a cobrar.`; }}
    ]},
  {id:'hs_city_disaster', type:'pathway', rarity:'uncommon', tags:['beyonder','hero'], requirements:{beyonder:true, seqMax:5}, weight:3, cooldown:96, narrativeImportance:3,
    title:'La ciudad arde',
    text:'Un incendio se come un barrio entero del lado pobre de la ciudad. Los bomberos no dan abasto. Vos podrías entrar ahí y sacar gente como nadie más puede. Todos verían lo que hacés.',
    choices:[
      {label:'Entrar a cara descubierta', small:'Que miren. Hay gente adentro.',
        run:()=>{ applyEffects({reputation:[6,12], humanity:2, salud:[-10,-4], attention:10}); FACTION_KEYS.filter(k=>k!=='tarotClub').forEach(k=>{ if(!isMember(k)) factionAdjust(k, {suspicion:[3,8]}, true); });
          remember('saved_from_fire', 'Entraste a un incendio a la vista de todos y sacaste gente.', {cat:'achievement'}); addMilestone('achievement', 'Salva a medio barrio de un incendio');
          return 'Entrás y salís once veces. La gente del barrio te va a recordar por el resto de su vida. Las organizaciones, también, pero de otra forma: al día siguiente, tres personas distintas te preguntan, muy amables, cómo hiciste.'; }},
      {label:'Ayudar desde las sombras', small:'Salvar a los que se pueda sin que nadie vea.',
        run:()=>{ applyEffects({spirituality:[-12,-6], sanity:[-5,-2], humanity:1, attention:3}); return 'Desviás el fuego desde un techo, abrís puertas trabadas desde lejos, empujás a una familia hacia la salida sin que sepan por qué corrieron. Mueren menos de los que iban a morir. Nadie sabe tu nombre.'; }},
      {label:'No intervenir', small:'No podés salvar a todos. No podés delatarte.',
        run:()=>{ applyEffects({humanity:-2, sanity:[-8,-3]}); remember('let_fire_burn', 'Viste arder un barrio pudiendo hacer algo, y no lo hiciste.', {cat:'trauma'}); return 'Mirás desde tu ventana hasta que amanece. Al día siguiente los diarios dan una cifra. Vos sabés cuántos de esos números podrían haber sido otra cosa.'; }}
    ]},
  {id:'hs_demigod_dossier', type:'threat', rarity:'rare', tags:['beyonder','hunter'], requirements:{beyonder:true, seqMax:5}, weight:3, cooldown:120, narrativeImportance:3,
    title:'Te estaban estudiando',
    text:'Encontrás, debajo de la alfombra de tu estudio, una carpeta que no es tuya: fotos tuyas de los últimos tres años, horarios, nombres de tu familia, tu vía y tu Sequence anotadas con letra prolija. Alguien te estudió con paciencia. Alguien quiere que sepas que te estudió.',
    choices:[
      {label:'Esperarlo en tu casa', small:'Que venga a buscarte donde vos elegís.',
        run:()=>{ startCombat('demigodHunter', {env:'home', source:'el que te estudiaba', bonusCash:[60,140]}); return 'Apagás las luces y esperás. A las tres de la mañana, la puerta se abre sin ruido.'; }},
      {label:'Irte de la ciudad esa misma noche', small:'Un cazador paciente no te sigue a ciegas.',
        run:()=>{ const opts = CITY_KEYS.filter(k=>k!==currentCityKey()); const k = pick(opts); const t = relocate(k); applyEffects({sanity:[-6,-2]}); remember('fled_hunter', 'Huiste de alguien que te estudió durante años.', {cat:'trauma'});
          return `Esa misma noche, con lo puesto. ${t ? t.split('. ')[0] + '.' : ''} Nunca sabés si te siguió.`; }},
      {label:'Pedir protección a tu organización', small:'Para eso sirve pertenecer.',
        requires:()=>memberFactions().some(k=>k!=='tarotClub'),
        run:()=>{ const f = memberFactions().find(k=>k!=='tarotClub'); factionAdjust(f, {merit:[-6,-3], trust:[1,3]}); return `${cap(factionShort(f))} pone gente en tu calle durante un mes. Al final del mes, te devuelven la carpeta con una página más: la ficha del que te estudiaba, con una marca roja. No preguntás.`; }}
    ]},

  /* ---------------- Sequence 4 y 3: semidioses ---------------- */
  {id:'hs_aura', type:'pathway', rarity:'uncommon', tags:['beyonder','demigod'], requirements:{beyonder:true, seqMax:4}, weight:3, cooldown:48,
    title:'Lo que sienten los animales',
    text:'Los perros del barrio se callan cuando pasás. Los chicos chiquitos lloran si los mirás. Las plantas de la ventana se inclinan hacia vos, o se mueren. Tu presencia ya no es la de una persona.',
    choices:[
      {label:'Aprender a contenerte', small:'Plegar lo que sos, todos los días.',
        run:()=>{ applyEffects({spirituality:[-10,-5], sanity:[-3,-1], attention:-4, humanity:1}); remember('contained_aura', 'Aprendiste a contener tu presencia para no asustar a los demás.', {cat:'choice'});
          return 'Aprendés a respirar para adentro, a caminar más chico, a mirar un poco al costado. Cansa como sostener un peso con el brazo extendido. Los perros vuelven a ladrarte. Te alegra más de lo que esperabas.'; }},
      {label:'Dejar que lo sientan', small:'Es lo que sos.',
        run:()=>{ applyEffects({humanity:-2, attention:4}); const n = pick(closeNpcs()); if(n) adjustRel(n, {fear:[5,10]});
          return `Dejás de disimular. La gente se aparta en la vereda sin saber por qué.${n ? ' '+n.name+' empieza a esquivarte la mirada.' : ''} Hay una comodidad nueva en eso, y no te gusta lo cómoda que es.`; }}
    ]},
  {id:'hs_worshipper', type:'pathway', rarity:'rare', tags:['beyonder','followers'], requirements:{beyonder:true, seqMax:4}, weight:3, cooldown:120, narrativeImportance:3,
    title:'Alguien te reza',
    text:'Una mujer del barrio, a la que ayudaste una vez sin que supiera cómo, armó un altar en su cocina. Tiene tu foto recortada de un diario, velas y un plato de sal. Te reza todas las noches. Vos lo escuchás.',
    choices:[
      {label:'Responderle', small:'Un milagro chico, para alguien que cree.',
        run:()=>{ applyEffects({fate:3, humanity:-2, attention:4}); STATE.anchors.followerBonus = (STATE.anchors.followerBonus||0) + 1; factionAdjust('church', {suspicion:[3,7]}, true);
          remember('answered_prayer', 'Respondiste la oración de alguien que te rezaba.', {cat:'pact'});
          return 'Le curás al hijo una fiebre que los médicos no entendían. A la semana, en su cocina rezan tres familias. Al mes, doce. Algo en vos se acomoda, como si hubiera estado esperando ese peso.'; }},
      {label:'Ignorarla', small:'Que se canse.',
        run:()=>{ scheduleConsequence({inMonths:[6,20], title:'El altar', text:'La mujer no se cansó. Ahora son veinte, se reúnen los jueves y dicen tu nombre en voz alta. Alguien de la Iglesia ya lo escuchó.', effect:{attention:6}, chance:0.5});
          return 'No contestás. La oración sigue llegando todas las noches, como una gota que cae en el mismo lugar.'; }},
      {label:'Pedirle, en sueños, que pare', small:'Por su bien y por el tuyo.',
        run:()=>{ applyEffects({sanity:[-4,-1], humanity:1}); return 'Entrás en su sueño y le hablás con una voz que no es la tuya. A la mañana, ella desarma el altar llorando. Te sentís un monstruo por algo que hiciste para no serlo.'; }}
    ]},
  {id:'hs_mercy', type:'pathway', rarity:'uncommon', tags:['beyonder','choice'], requirements:{beyonder:true, seqMax:4}, weight:3, cooldown:96, narrativeImportance:3,
    title:'Una vida en tus manos',
    text:'En el hospital de caridad, un chico se está muriendo de algo que los médicos no saben nombrar. Vos sí sabés. Y sabés que podrías hacer algo, a un precio, y a la vista de una sala entera.',
    choices:[
      {label:'Salvarlo', small:'A cualquier precio.',
        run:()=>{ applyEffects({spirituality:[-18,-10], humanity:3, attention:5, reputation:[2,5], sanity:[2,5]}); remember('saved_child', 'Salvaste a un chico que se moría, usando lo que sos.', {cat:'achievement'});
          addHiddenTruth('El chico que salvaste en el hospital creció sabiendo que un desconocido le había devuelto la vida. Te buscó durante años.');
          return 'Ponés la mano sobre su frente y le devolvés algo que se le estaba yendo. Te cuesta más de lo que pensabas. El chico abre los ojos y pide agua. La enfermera se persigna y no te quita los ojos de encima.'; }},
      {label:'Dejar que siga su curso', small:'No podés salvar a todos los chicos del mundo.',
        run:()=>{ applyEffects({humanity:-2, sanity:[-6,-2]}); return 'Te sentás en el pasillo hasta que la madre sale llorando. Cuando se cruza con vos, te mira como se mira a cualquier desconocido. Vos no la mirás.'; }}
    ]},
  {id:'hs_lost_names', type:'pathway', rarity:'uncommon', tags:['beyonder','humanity','memory'], requirements:{beyonder:true, seqMax:3}, weight:3, cooldown:48,
    run:()=>{ const a = STATE.anchors;
      if(a.revealed && (a.people||[]).length >= 2){ applyEffects({humanity:1}); const n = npcById(a.people[0]); return {title:'Nombres que se borran', text:`Te das cuenta de que no recordás el nombre de tu maestra de primer grado, ni el de tu primer amigo, ni la calle donde naciste. Pero el de ${n ? n.name : 'los tuyos'} lo decís en voz alta, y suena firme. Con eso alcanza.`}; }
      applyEffects({humanity:-2, sanity:[-5,-2]}); return {title:'Nombres que se borran', text:'Te das cuenta de que no recordás el nombre de tu maestra de primer grado, ni el de tu primer amigo, ni la calle donde naciste. Hacés una lista con los que todavía recordás. La lista es corta.'}; }},
  {id:'hs_angel_time', type:'pathway', rarity:'uncommon', tags:['beyonder','time'], requirements:{beyonder:true, seqMax:3}, weight:3, cooldown:72, narrativeImportance:2,
    title:'El tiempo ya no pasa igual',
    text:'Te distraés una tarde pensando en un problema de tu vía. Cuando levantás la vista, pasó una estación entera. Hay cartas sin abrir, una planta muerta, un nieto que ya camina.',
    choices:[
      {label:'Ir a ver a los tuyos', small:'Antes de que pase otra estación.',
        run:()=>{ applyEffects({humanity:3, sanity:[2,5]}); closeNpcs().slice(0,3).forEach(n=>adjustRel(n, {affection:[3,6], trust:[2,4]})); return 'Tocás el timbre con un paquete de masas, como si nada. Te reciben con reproches y abrazos, en ese orden. Te quedás a cenar. Anotás la fecha, para que no se te vuelva a escapar.'; }},
      {label:'Seguir con lo que estabas', small:'Ellos van a entender. O no.',
        run:()=>{ applyEffects({humanity:-2, digestion:[1,3]}); return 'Seguís. Cuando vuelvas a levantar la vista, va a ser otra estación. Lo sabés, y no te detiene.'; }}
    ]},
  {id:'hs_god_gaze', type:'mystic', rarity:'rare', tags:['beyonder','divine'], requirements:{beyonder:true, seqMax:3}, weight:3, cooldown:120, narrativeImportance:3,
    title:'Algo más grande te mira',
    text:'Una noche, el cielo se vuelve demasiado nítido. Sentís una atención enorme, paciente, que no es de este mundo, posarse sobre vos como una mano sobre la cabeza de un perro. Algo que fue lo que vos querés ser te está evaluando.',
    choices:[
      {label:'Inclinar la cabeza', small:'Hay jerarquías que no se discuten.',
        run:()=>{ applyEffects({fate:3, sanity:[-4,-1]}); remember('bowed_to_god', 'Inclinaste la cabeza ante algo más grande.', {cat:'pact'}); return 'Te inclinás. La atención se queda un momento más, satisfecha, y se retira. A la mañana, las cosas te salen un poco mejor que antes. Sabés a quién le debés eso, y cuánto.'; }},
      {label:'Esconderte detrás de tus anclas', small:'Sos una persona. Pensá en las tuyas.',
        requires:()=>STATE.anchors.revealed,
        run:()=>{ applyEffects({sanity:[-3,0], humanity:2}); recomputeAnchors(); return 'Pensás en caras, en una cocina, en una risa. La atención te busca y encuentra sólo a alguien que quiere a otros. Pierde interés. Por ahora.'; }},
      {label:'Sostenerle la mirada', small:'Si vas a llegar ahí, que te conozca.',
        run:()=>{ applyEffects({sanity:[-24,-12], corruption:[3,8], fate:5, clue:{pathway:'$chosen', reliability:'real', strength:[10,16], source:'la mirada de algo divino'}}); remember('met_gods_gaze', 'Le sostuviste la mirada a algo divino.', {cat:'trauma'});
          return 'Le sostenés la mirada. Durante un instante que dura años, entendés tu vía entera, de punta a punta, y lo que hay al final. Cuando termina, estás en el piso, sangrando por la nariz, riéndote.'; }}
    ]},
  {id:'hs_pathway_voice', type:'pathway', rarity:'uncommon', tags:['beyonder','sequence0'], requirements:{beyonder:true, seqMax:2}, weight:3, cooldown:60, narrativeImportance:2,
    title:'La vía te habla',
    text:'Ya no son voces: es una sola, y es la de tu vía entera, desde la Sequence 9 hasta el trono. Te dice lo que falta. Te dice lo que tenés que dejar de ser.',
    choices:[
      {label:'Escuchar', small:'Hasta el final.',
        run:()=>{ applyEffects({clue:{pathway:'$chosen', reliability:'real', strength:[8,14]}, digestion:[2,5], humanity:-3, corruption:[1,4]}); return 'Escuchás. La voz no miente, y eso es lo peor. Cuando calla, sabés un poco más de lo que te falta para el final, y un poco menos de quién eras.'; }},
      {label:'Taparte los oídos', small:'Todavía no.',
        run:()=>{ applyEffects({sanity:[-6,-2], humanity:1}); return 'Te tapás los oídos como un chico. No sirve de nada, porque la voz no entra por ahí. Pero sirve para acordarte de que todavía podés decir que no.'; }}
    ]}
];
