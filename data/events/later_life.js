'use strict';
/* =========================================================================
   data/events/later_life.js — la mitad de la vida y la vejez.
   La vida no se termina a los treinta: hay padres que cuidar, hijos que se
   meten en problemas, amigos que se mueren primero, ofertas que llegan
   tarde, un cuerpo que empieza a pasar factura, testamentos, nietos y la
   pregunta de qué hacer con todo lo que uno sabe. Y para los Beyonders, un
   problema que la gente común no tiene: no envejecer al ritmo de los demás.
   ========================================================================= */
const EVENTS_LATER = [
  /* ============================== la mitad del camino (35-60) ============================== */
  {id:'mid_crossroads', type:'mundane', rarity:'uncommon', tags:['mood','midlife'], requirements:{ageMin:38, ageMax:52}, weight:3, repeatable:false, narrativeImportance:3,
    title:'La mitad del camino',
    text:'Una mañana cualquiera te despertás con una cuenta hecha que nadie te pidió: probablemente ya viviste más de la mitad. El café sabe igual. Vos, no.',
    choices:[
      {label:'Cambiar algo grande', small:'Antes de que sea tarde.',
        run:()=>{ const c = STATE.character; applyEffects({sanity:[4,9]});
          if(isEmployed() && chance(0.5)){ jobPerformance(-rndInt(5,10)); c.incomeBonus = (c.incomeBonus||0) - Math.round(5*priceIndex()); remember('midlife_change', 'A la mitad de la vida, cambiaste de rumbo.', {cat:'choice'});
            return 'Pedís menos horas en el trabajo, empezás algo que habías dejado a los veinte y le decís que no a tres cosas que antes aceptabas por costumbre. Ganás menos. Dormís mejor.'; }
          applyEffects({reputation:[0,2]}); remember('midlife_change', 'A la mitad de la vida, cambiaste de rumbo.', {cat:'choice'});
          return 'Te anotás en cursos nocturnos, empezás a escribir, aprendés un oficio nuevo con las manos. Nadie entiende bien para qué. Vos sí.'; }},
      {label:'Aceptar lo que hay', small:'No está tan mal.',
        run:()=>{ applyEffects({sanity:[1,4]}); return 'Mirás tu vida como quien mira una casa que construyó con sus manos: torcida en algunas partes, sólida en otras. Tuya. Te terminás el café.'; }},
      {label:'Volver a mirar lo que dejaste de mirar', small:'Aquello raro que pasó hace años.',
        requires:()=>(STATE.flags.mysticExposure||0) >= 20 || maxPathwayKnowledge() >= 20,
        run:()=>{ applyEffects({exposure:3, clue:{pathway:'$chosenOrRandom', reliability:'real', strength:[3,7], source:'lo que dejaste de mirar'}}); remember('midlife_mystery', 'A la mitad de la vida, volviste a buscar lo que habías visto de joven.', {cat:'choice'});
          return 'Sacás del fondo de un cajón las notas que tomaste hace años, cuando pasó aquello que nunca le contaste a nadie. Las leés con otros ojos. Hay cosas que ahora entendés.'; }}
    ]},
  {id:'mid_reunion', type:'social', rarity:'common', tags:['friends','midlife'], requirements:{ageMin:35, ageMax:60}, weight:2, cooldown:120,
    title:'El reencuentro',
    text:'Alguien organiza el reencuentro de tu promoción. Veinte años, dicen las tarjetas. Parecen más. Parecen menos.',
    choices:[
      {label:'Ir', small:'A ver qué fue de todos.',
        run:()=>{ const n = createNpc({met:true, relType:'friend', ageMin:STATE.character.edad-1, ageMax:STATE.character.edad+1}); adjustRel(n, {trust:[8,14], affection:[8,14]});
          applyEffects({sanity:[-2,5], reputation:[0,2]});
          return `El que era el más lindo está pelado; la que no hablaba con nadie dirige una fábrica; dos no vinieron porque ya no están. Terminás la noche con ${n.name}, en la puerta, hablando como si no hubiera pasado el tiempo.`; }},
      {label:'No ir', small:'Mejor recordarlos como eran.',
        run:()=>{ applyEffects({sanity:[-1,1]}); return 'Guardás la tarjeta en un cajón. El día del reencuentro te acordás de todos, uno por uno, y de vos a esa edad. Es suficiente.'; }}
    ]},
  {id:'mid_health_scare', type:'mundane', rarity:'uncommon', tags:['health','midlife'], requirements:{ageMin:40, ageMax:75}, weight:3, cooldown:120, narrativeImportance:2,
    title:'Algo en la radiografía',
    text:'El médico se queda mirando la placa más tiempo del necesario. "Puede no ser nada", dice, en el tono exacto que usa la gente cuando puede ser algo.',
    choices:[
      {label:'Operarte cuanto antes', small:'Caro, pero no esperás.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(90,200)*priceIndex()), salud:[-14,-6]});
          if(chance(0.85)){ applyEffects({sanity:[3,7]}); remember('surgery', 'Te operaron a tiempo de algo que podía ser grave.', {cat:'event'}); return 'Te operan. Semanas de convalecencia y una cicatriz nueva. El médico, al darte el alta, sonríe de verdad: era a tiempo.'; }
          addCondition('fragilidad'); return 'Te operan. Sale bien, dicen. El cuerpo, sin embargo, no vuelve a ser el de antes.'; }},
      {label:'Esperar y ver', small:'Puede no ser nada.',
        outcomes:[
          {p:0.55, effects:{sanity:[2,5]}, text:'Esperás. Seis meses después, la nueva placa está limpia. Era una sombra, nada más. Te reís con el médico, un poco de más.'},
          {p:0.3, effects:{salud:[-18,-8], cash:[-120,-50]}, text:'Esperás demasiado. Cuando por fin te operan, es más complicado y más caro. Salís adelante, más flaco y más viejo.'},
          {p:0.15, effects:{salud:[-30,-15], sanity:[-8,-3]}, text:'Era algo. Te lo sacan tarde, y el cuerpo nunca termina de recuperarse del todo. Aprendés a vivir con un cansancio nuevo.'}
        ]}
    ]},
  {id:'mid_parent_care', type:'family', rarity:'uncommon', tags:['family','care'], requirements:{ageMin:32, ageMax:70}, weight:4, cooldown:120, narrativeImportance:3,
    context:(ctx)=>{ const p = ['madre','padre'].map(id=>npcById(id)).filter(n=>n && n.alive && npcAge(n) >= 70); if(!p.length) return null; ctx.npc = pick(p); return ctx; },
    title:(ctx)=>`${ctx.npc.name} ya no puede sol${ng(ctx.npc,'o','a')}`,
    text:(ctx)=>`${ctx.npc.name} se cayó en la cocina y pasó la noche en el piso hasta que lo encontró un vecino.`.replace('lo encontró', ng(ctx.npc,'lo encontró','la encontró')) + ' No puede seguir viviendo sin ayuda. Alguien tiene que decidir qué hacer, y todos te miran a vos.',
    choices:[
      {label:'Llevarte a {npc} a tu casa', small:'Es tu familia.',
        run:(ctx)=>{ adjustRel(ctx.npc, {affection:[10,16], trust:[6,10], dependence:[10,15]}); applyEffects({sanity:[-6,-2], cash:-Math.round(rndInt(10,30)*priceIndex())});
          const s = spouseNpc(); if(s) adjustRel(s, {affection:[-6,0]});
          remember('cared_parent', `Cuidaste a ${ctx.npc.name} en tu casa hasta el final.`, {cat:'person', npc:ctx.npc.id});
          return `${ctx.npc.name} se instala en el cuarto del fondo. Hay noches malas, pañales, discusiones por la radio. Y hay tardes en las que te cuenta cosas de su vida que no sabías, como si hubiera estado esperando este momento para decirlas.`; }},
      {label:'Pagar una residencia', small:'Con gente que sabe cuidar.',
        run:(ctx)=>{ applyEffects({cash:-Math.round(rndInt(80,160)*priceIndex()), sanity:[-2,1]}); adjustRel(ctx.npc, {affection:[-6,-2], trust:[-2,2]});
          return `La residencia es limpia y el personal amable. ${ctx.npc.name} no dice nada en el viaje. Cuando te vas, te agarra la mano un segundo de más.`; }},
      {label:'Dejárselo a otro de la familia', small:'No podés con todo.',
        run:(ctx)=>{ const sib = aliveNpcs().find(n=>n.id.startsWith('hermano') && n.alive); adjustRel(ctx.npc, {affection:[-10,-4]});
          if(sib){ adjustRel(sib, {trust:[-12,-6], affection:[-8,-3]}); remember('left_parent_to_sibling', `Dejaste que ${sib.name} se hiciera cargo de ${ctx.npc.name}.`, {cat:'choice', npc:sib.id}); return `${sib.name} se hace cargo. No te lo reprocha en voz alta. No hace falta.`; }
          applyEffects({sanity:[-6,-2]}); return `No hay nadie más. Terminás pagando a una vecina para que pase dos veces por día. No es suficiente, y los dos lo saben.`; }}
    ]},
  {id:'mid_transfer_offer', type:'work', rarity:'rare', tags:['work','move'], requirements:{ageMin:28, ageMax:58, employed:true}, weight:3, cooldown:120, narrativeImportance:3,
    context:(ctx)=>{ const here = currentCityKey(); const opts = CITY_KEYS.filter(k=>k!==here && jobExistsIn(STATE.character.profesion, k)); if(!opts.length) return null; ctx.city = pick(opts); return ctx; },
    title:'Una oferta lejos',
    text:(ctx)=>`Te ofrecen un traslado a ${CITIES_DATA[ctx.city].name}: mismo trabajo, mejor sueldo, la mudanza paga. ${CITIES_DATA[ctx.city].desc.split('.')[0]}. Tenés una semana para decidir.`,
    choices:[
      {label:'Aceptar el traslado', small:'Empezar de nuevo, con red.',
        run:(ctx)=>{ const c = STATE.character; c.incomeBonus = (c.incomeBonus||0) + Math.round(rndInt(15,35)*priceIndex()); const t = relocate(ctx.city, {keepJob:true}); applyEffects({sanity:[-3,3]});
          return 'Firmás. En un mes, la vida entera entra en baúles. ' + (t ? t.split('. ')[0] + '.' : ''); }},
      {label:'Quedarte', small:'Acá está tu vida.',
        run:()=>{ applyEffects({sanity:[0,3]}); jobPerformance(-rndInt(1,4)); return 'Decís que no. Tu jefe dice que lo entiende. En la oficina, la oferta pasa a otro, que se va en un mes y no escribe nunca.'; }}
    ]},
  {id:'mid_investment', type:'mundane', rarity:'uncommon', tags:['money','midlife'], requirements:{ageMin:28, ageMax:70}, weight:3, cooldown:96,
    hiddenRequirements:()=>STATE.character.cash + STATE.character.bank >= 400*priceIndex(),
    title:'Una inversión segura',
    text:'Un conocido de buena posición te ofrece entrar en una compañía naviera que "no puede fallar": acciones al precio de amigo, dividendos cada trimestre.',
    choices:[
      {label:'Poner mucho', small:'Las oportunidades no esperan.',
        run:()=>{ const v = Math.round(Math.min(STATE.character.cash + STATE.character.bank, 600*priceIndex()) * 0.6); applyEffects({cash:-v});
          const r = Math.random() + luckMod();
          if(r < 0.35){ applyEffects({sanity:[-10,-4]}); remember('investment_lost', 'Perdiste mucho dinero en una inversión "segura".', {cat:'loss'}); return `La naviera quiebra en ocho meses. Tu conocido se muda a Intis sin despedirse. Perdés ${fmtMoney(v)}.`; }
          if(r < 0.75){ applyEffects({cash:Math.round(v*1.4)}); return `La naviera cumple. Cobrás dividendos durante años y, al vender, recuperás lo invertido con ganancia. ${fmtMoney(Math.round(v*1.4))} en total.`; }
          applyEffects({cash:Math.round(v*2.3), reputation:[1,3]}); remember('investment_won', 'Una inversión arriesgada te salió muy bien.', {cat:'achievement'}); return `Uno de los barcos vuelve de las colonias con un cargamento que vale una fortuna. Tu parte se multiplica: ${fmtMoney(Math.round(v*2.3))}.`; }},
      {label:'Poner poco, por las dudas', small:'Lo que puedas perder.',
        run:()=>{ const v = Math.round(80*priceIndex()); applyEffects({cash:-v}); if(chance(0.55 + luckMod())){ applyEffects({cash:Math.round(v*1.6)}); return 'Una ganancia modesta, que te deja con la sensación de que podrías haber puesto más.'; } return 'La naviera se hunde, como sus barcos. Perdés poco, y te quedás con la lección.'; }},
      {label:'No poner nada', small:'', run:()=>'Le agradecés y decís que no. Nunca sabés si hiciste bien. Es la única forma de estar seguro de no haber perdido.'}
    ]},
  {id:'mid_friend_dies', type:'social', rarity:'uncommon', tags:['loss','friends'], requirements:{ageMin:40}, weight:3, cooldown:72, narrativeImportance:2,
    context:(ctx)=>{ const f = aliveNpcs().filter(n=>n.met && !isFamilyNpc(n) && n.lifeState==='presente' && npcAge(n) >= 40 && bondScore(n) >= 40 && n.id !== 'extraño'); if(!f.length) return null; ctx.npc = pick(f); return ctx; },
    title:(ctx)=>`${ctx.npc.name}`,
    text:(ctx)=>`Te avisan un martes, por la tarde: ${ctx.npc.name} se murió de golpe, el corazón. Tenía tu edad, o casi. Es el primero de los tuyos, y los dos habían hecho chistes con eso.`,
    choices:[
      {label:'Decir unas palabras en el entierro', small:'Alguien tiene que hacerlo.',
        run:(ctx)=>{ npcDies(ctx.npc, 'el corazón', null); applyEffects({sanity:[-6,-2], reputation:[1,4]}); remember('eulogy_'+ctx.npc.id, `Despediste a ${ctx.npc.name} con unas palabras.`, {cat:'loss', npc:ctx.npc.id});
          return 'Hablás tres minutos. No te acordás de nada de lo que dijiste; los demás sí. Después, en la casa, alguien de su familia te da una caja con cosas que eran tuyas y que nunca le reclamaste.'; }},
      {label:'Quedarte atrás, en silencio', small:'No te salen las palabras.',
        run:(ctx)=>{ npcDies(ctx.npc, 'el corazón', null); applyEffects({sanity:[-8,-3]}); return 'Te quedás al fondo, junto a la puerta del cementerio. Cuando todos se van, te acercás a la tierra recién movida y le decís lo que no pudiste decir en voz alta.'; }}
    ]},
  {id:'mid_child_trouble', type:'family', rarity:'uncommon', tags:['children'], weight:3, cooldown:72, narrativeImportance:3,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>n.alive && npcAge(n) >= 16 && npcAge(n) <= 28); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    title:(ctx)=>`${ctx.npc.name} en problemas`,
    text:(ctx)=>`Te llaman de la comisaría a la madrugada: ${ctx.npc.name} está detenid${ng(ctx.npc,'o','a')} por una pelea en una taberna. Hay un herido. Hay deudas que no conocías.`,
    choices:[
      {label:'Pagar la fianza y las deudas', small:'Es tu hijo.',
        run:(ctx)=>{ applyEffects({cash:-Math.round(rndInt(60,160)*priceIndex())}); adjustRel(ctx.npc, {trust:[6,12], dependence:[6,10], respect:[-4,0]});
          return `Pagás todo. En el camino a casa, ${ctx.npc.name} no dice una palabra. Tres semanas después, te pide perdón con una torpeza que te hace acordar a vos a su edad.`; }},
      {label:'Dejar que lo resuelva', small:'Que aprenda.',
        outcomes:[
          {p:0.5, effects:{rel:{npc:'$ctx', respect:[4,10], affection:[-8,-3]}}, text:'Pasa un mes preso. Sale más callado. Consigue trabajo por su cuenta y paga lo que debe. No te lo agradece. Algún día, tal vez.'},
          {p:0.5, effects:{rel:{npc:'$ctx', affection:[-14,-8], trust:[-10,-5]}, sanity:[-6,-2]}, text:'Pasa un mes preso. Sale con amigos nuevos que no te gustan nada, y deja de visitarte.'}
        ]},
      {label:'Mover tus contactos', small:'Un favor, una llamada.',
        requires:()=>STATE.character.reputation >= 30 || memberFactions().length > 0,
        run:(ctx)=>{ applyEffects({reputation:[-3,-1]}); adjustRel(ctx.npc, {trust:[4,8], dependence:[4,8]}); addHiddenTruth(`El favor que pediste para sacar a ${ctx.npc.name} de la comisaría lo cobró alguien, años después, de una forma que nunca relacionaste.`);
          return 'Una llamada, un apretón de manos, un expediente que se pierde. A la mañana siguiente, el asunto no existe. Alguien anotó que te debía un favor. Alguien anotó que se lo debés vos.'; }}
    ]},
  {id:'mid_first_grey', type:'mundane', rarity:'common', tags:['body','midlife'], requirements:{ageMin:36, ageMax:50}, weight:3, repeatable:false,
    run:()=>{
      if(STATE.pathway.chosenPathway && STATE.pathway.sequence <= 6){ raiseAttention(2); return {title:'Ninguna cana', text:'Tus amigos de la infancia ya tienen canas, arrugas, papada. Vos no. En una foto de grupo parecés el hermano menor de todos. Alguien lo dice en chiste. Nadie se ríe del todo.'}; }
      applyEffects({sanity:[-2,2]}); return {title:'La primera cana', text:'Frente al espejo del baño, a la luz de la mañana: una cana. La arrancás. A la semana hay tres. Hacés las paces con ellas.'}; }},
  {id:'mid_ageless', type:'mystic', rarity:'uncommon', tags:['beyonder','aging'], requirements:{ageMin:45, beyonder:true, seqMax:6}, weight:4, cooldown:96, narrativeImportance:3,
    title:'No envejecés',
    text:'La vecina te mira con los ojos entrecerrados: "Usted está igual que cuando se mudó, hace quince años. ¿Cuál es el secreto?" Lo dice sonriendo. Lo va a repetir en el mercado.',
    choices:[
      {label:'Teñirte canas y caminar más lento', small:'Actuar la edad que tenés.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(5,15)*priceIndex()), sanity:[-2,0]}); raiseAttention(-4); nudgeActingMethod(0.1, 'actuando una edad');
          remember('faked_age', 'Empezaste a fingir que envejecías.', {cat:'secret'});
          return 'Tinta gris en las sienes, un bastón que no necesitás, los anteojos de otro. En unos meses, la vecina deja de mirarte raro. Vos empezás a mirarte raro a vos.'; }},
      {label:'Mudarte, antes de que la pregunta crezca', small:'Otra ciudad, otra edad.',
        run:()=>{ scheduleConsequence({inMonths:[6,18], title:'Una pregunta que creció', text:'La pregunta de la vecina recorrió el barrio. Llegó a alguien que toma nota de estas cosas.', effect:{attention:4}, chance:0.35});
          applyEffects({sanity:[-1,1]}); remember('ageless_noticed', 'La gente empezó a notar que no envejecías.', {cat:'secret'});
          return 'Empezás a mirar anuncios de alquiler en otras ciudades. Todavía no te vas. Pero ya sabés que te vas a ir, y que la próxima vez vas a tener que irte antes.'; }},
      {label:'Reírte y no darle importancia', small:'Buena genética.',
        run:()=>{ raiseAttention(3); const n = aliveNpcs().filter(x=>x.met && x.lifeState==='presente' && !isFamilyNpc(x)).sort((a,b)=>(b.mystic||0)-(a.mystic||0))[0]; if(n) adjustRel(n, {suspicion:[5,10]});
          return '"Buena genética", decís. La vecina se ríe. En el mercado, esa tarde, alguien repite la frase con otro tono.'; }}
    ]},
  {id:'mid_late_love', type:'social', rarity:'uncommon', tags:['love'], requirements:{ageMin:40, ageMax:72, single:true}, weight:3, cooldown:72, narrativeImportance:3,
    hiddenRequirements:()=>!partnerNpc() && ['Viudo/a','Divorciado/a','Soltero/a'].includes(STATE.character.estadoCivil),
    title:'Otra vez',
    text:()=>pick(['En la sala de espera del médico, alguien de tu edad te presta el diario y te pide que le cuentes el final del folletín que dejó a medias.',
      'En el velorio de un conocido común, alguien te acompaña hasta la esquina bajo el mismo paraguas. Después, hasta la otra esquina.',
      'En la biblioteca, alguien te recomienda un libro con una seguridad que te hace reír. El libro es malísimo. Volvés a la biblioteca igual.']),
    choices:[
      {label:'Darle una oportunidad', small:'¿Por qué no, a esta altura?',
        run:()=>{ const c = STATE.character; const g = c.genero === 'Hombre' ? 'f' : c.genero === 'Mujer' ? 'm' : (chance(0.5)?'m':'f');
          const n = createNpc({met:true, gender:g, relType:'acquaintance', ageMin:Math.max(35, c.edad-8), ageMax:c.edad+6, trust:25, affection:30});
          startDating(n); return `Se llama ${n.name}. Los dos tienen una vida entera detrás, con sus muertos y sus mañas. Tal vez por eso es tan fácil hablar.`; }},
      {label:'Dejarlo pasar', small:'Ya no estás para empezar de cero.',
        run:()=>{ applyEffects({sanity:[-2,1]}); return 'Te despedís con amabilidad. Esa noche, en la casa silenciosa, te preguntás si hiciste bien. No hay respuesta, pero la pregunta te acompaña un rato, como una visita.'; }}
    ]},
  {id:'mid_apprentice_workshop', type:'work', rarity:'common', tags:['work','mentor'], requirements:{ageMin:42, ageMax:66, employed:true}, weight:2, cooldown:96,
    run:()=>{ const n = createNpc({met:true, relType:'work', role:'Aprendiz', ageMin:17, ageMax:22, trust:25}); adjustRel(n, {respect:[8,14], trust:[6,10]}); jobPerformance(rndInt(2,5));
      remember('mentored_'+n.id, `Le enseñaste el oficio a ${n.name}.`, {cat:'person', npc:n.id});
      return {title:'El nuevo', text:`Te ponen a cargo del nuevo, ${n.name}, que no sabe nada y pregunta todo. Te ves a vos mismo a esa edad y te da, a la vez, ternura y vergüenza. A los seis meses, hace el trabajo mejor que vos.`}; }},
  {id:'mid_house_ages', type:'mundane', rarity:'common', tags:['house','money'], requirements:{ageMin:35}, weight:2, cooldown:60,
    hiddenRequirements:()=>!!STATE.character.vivienda,
    run:()=>{ const v = Math.round(rndInt(40,140)*priceIndex()); applyEffects({cash:-v}); return {title:'La casa envejece con vos', text:`Una gotera, un caño, la escalera que cruje donde antes no crujía. Arreglar la casa cuesta ${fmtMoney(v)}. Te da un poco de pena y un poco de orgullo que las dos cosas envejezcan juntas.`}; }},

  /* ============================== la vejez (60+) ============================== */
  {id:'old_grandchild_story', type:'family', rarity:'common', tags:['grandchildren'], requirements:{ageMin:58}, weight:3, cooldown:36,
    hiddenRequirements:()=>(STATE.character.grandchildren||0) > 0,
    title:'Un cuento antes de dormir',
    text:'Tu nieto no se quiere dormir si no le contás un cuento. Uno nuevo. Uno "de verdad".',
    choices:[
      {label:'Contarle algo que te pasó de verdad, disfrazado de cuento', small:'Lo que nunca le contaste a nadie.',
        requires:()=>(STATE.flags.mysticExposure||0) >= 20 || !!STATE.pathway.chosenPathway,
        run:()=>{ applyEffects({sanity:[3,6]}); remember('told_grandchild', 'Le contaste a tu nieto, como cuento, lo que viviste de verdad.', {cat:'person'});
          addHiddenTruth('Tu nieto nunca olvidó el cuento que le contaste. Años después, cuando le pasó algo parecido, fue lo único que le sirvió.');
          return 'Le hablás de una niebla, de alguien que no tenía cara, de una poción que sabía a hierro. Tu nieto escucha con los ojos enormes y se duerme a mitad de la parte más peligrosa. Vos te quedás un rato más, terminándola en voz baja.'; }},
      {label:'Un cuento de los de siempre', small:'Dragones y princesas.',
        run:()=>{ applyEffects({sanity:[2,5]}); return 'El dragón, la princesa, el zapatero que era rey. Se lo sabe de memoria y te corrige cada vez que cambiás algo. Se duerme agarrado de tu dedo.'; }}
    ]},
  {id:'old_last_trip', type:'mundane', rarity:'uncommon', tags:['travel'], requirements:{ageMin:62, ageMax:85}, weight:2, cooldown:120,
    hiddenRequirements:()=>STATE.character.cash >= 200*priceIndex(),
    title:'Un último viaje',
    text:'Siempre dijiste que ibas a ver el mar del sur, o las montañas, o la capital de Intis. Siempre había algo más urgente. Ya no hay nada más urgente.',
    choices:[
      {label:'Ir', small:'Ahora o nunca.',
        run:()=>{ applyEffects({cash:-Math.round(rndInt(120,220)*priceIndex()), sanity:[8,14], salud:[-6,-2]}); remember('last_trip', 'Hiciste de viejo el viaje que te debías.', {cat:'achievement'}); addMilestone('achievement', 'El viaje que se debía');
          return 'Tres semanas de trenes, barcos y hoteles con olor a humedad. Ves el mar que querías ver. Es exactamente como lo imaginabas y, a la vez, no se parece en nada. Volvés cansado y con veinte años menos en la cara.'; }},
      {label:'Mejor no', small:'El cuerpo ya no acompaña.',
        run:()=>{ applyEffects({sanity:[-4,-1]}); return 'Guardás los folletos en un cajón, con cuidado, como si algún día fueras a necesitarlos.'; }}
    ]},
  {id:'old_another_funeral', type:'mundane', rarity:'common', tags:['loss'], requirements:{ageMin:68}, weight:3, cooldown:30,
    run:()=>{ const old = aliveNpcs().filter(n=>n.met && !isFamilyNpc(n) && npcAge(n) >= 70 && n.id !== 'extraño');
      if(old.length && chance(0.5)){ const n = pick(old); npcDies(n, 'la edad', null); applyEffects({sanity:[-6,-2]}); return {title:'Otro entierro', text:`Se muere ${n.name}. A tu edad los entierros son como las reuniones de antes: te encontrás con todos, hablan de los que faltan, y se despiden diciendo "hasta el próximo".`}; }
      applyEffects({sanity:[-3,-1]}); return {title:'Otro entierro', text:'Otro entierro de alguien de tu generación. Ya tenés un traje sólo para esto. Ya sabés de memoria las oraciones.'}; }},
  {id:'old_names_slip', type:'mundane', rarity:'common', tags:['memory'], requirements:{ageMin:72}, weight:3, cooldown:36,
    run:()=>{ applyEffects({sanity:[-4,-1]}); if(chance(0.15)) addCondition('memoria');
      return {title:'Un nombre que se escapa', text:'Te quedás a mitad de una frase buscando un nombre que sabés perfectamente. Llega tres horas después, mientras lavás los platos, como una visita que se equivocó de horario.'}; }},
  {id:'old_will', type:'family', rarity:'uncommon', tags:['legacy'], requirements:{ageMin:65}, weight:4, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>!STATE.flags.will,
    title:'El testamento',
    text:'El escribano tiene los anteojos en la punta de la nariz y la pluma lista. "¿Y a quién le deja qué?" Lo pregunta como quien pregunta el clima. No es el clima.',
    choices:[
      {label:'Todo en partes iguales', small:'Para que nadie se pelee.',
        run:()=>{ STATE.flags.will = 'equal'; childrenNpcs().filter(k=>k.alive).forEach(k=>adjustRel(k, {trust:[2,5]})); return 'Partes iguales. El escribano asiente, aburrido. Vos sabés que eso no alcanza para que nadie se pelee, pero es lo más justo que se te ocurre.'; }},
      {label:'Más para quien más estuvo', small:'El que estuvo, estuvo.',
        requires:()=>childrenNpcs().filter(k=>k.alive).length >= 2,
        run:()=>{ const kids = childrenNpcs().filter(k=>k.alive).sort((a,b)=>bondScore(b)-bondScore(a)); STATE.flags.will = 'favorite:' + kids[0].id;
          adjustRel(kids[0], {trust:[4,8]}); kids.slice(1).forEach(k=>adjustRel(k, {trust:[-8,-3]}));
          return `La mayor parte, para ${kids[0].name}. El escribano levanta una ceja. Los demás se van a enterar cuando no puedas explicarles por qué.`; }},
      {label:'Una parte para una obra de caridad', small:'Que sirva para algo más grande.',
        run:()=>{ STATE.flags.will = 'charity'; applyEffects({reputation:[3,7]}); return 'Una parte para el hospital de caridad del barrio, "para la sala del fondo". El escribano lo anota sin preguntar qué es la sala del fondo.'; }},
      {label:'Lo raro, a alguien que sepa qué hacer con eso', small:'Los objetos que no son sólo objetos.',
        requires:()=>itemsByCat('artifact').some(it=>!it.loan) || itemsByCat('characteristic').length > 0,
        run:()=>{ STATE.flags.will = 'strange'; remember('will_strange', 'Dejaste por escrito quién se queda con tus objetos más extraños.', {cat:'choice'});
          return 'Una cláusula aparte, sellada, "a abrir sólo por la persona nombrada". El escribano la guarda en otro cajón, sin tocarla más de lo necesario. Él también siente el frío.'; }}
    ]},
  {id:'old_park_bench', type:'social', rarity:'common', tags:['friends'], requirements:{ageMin:68}, weight:3, cooldown:60,
    hiddenRequirements:()=>aliveNpcs().filter(n=>n.lifeState==='presente').length < 22,
    run:()=>{ const n = createNpc({met:true, relType:'friend', ageMin:STATE.character.edad-4, ageMax:STATE.character.edad+6, trust:20, affection:20}); adjustRel(n, {trust:[6,10], affection:[8,12]}); applyEffects({sanity:[3,6]});
      return {title:'El banco de la plaza', text:`Todas las mañanas, el mismo banco, las mismas palomas y ${n.name}, que llega siempre cinco minutos después que vos y se queja del mismo diario. Sin que ninguno lo diga, se vuelven amigos.`}; }},
  {id:'old_confession', type:'family', rarity:'rare', tags:['secret','legacy'], requirements:{ageMin:65}, weight:4, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>!!STATE.pathway.chosenPathway || loreCount() >= 5,
    context:(ctx)=>{ const cands = [spouseNpc()].concat(childrenNpcs()).filter(n=>n && n.alive && n.lifeState==='presente' && npcAge(n) >= 16 && !n.knows.beyonder); if(!cands.length) return null; ctx.npc = cands.sort((a,b)=>bondScore(b)-bondScore(a))[0]; return ctx; },
    title:'Contarlo todo',
    text:(ctx)=>`Una tarde de lluvia, con ${ctx.npc.name} tomando té en la cocina, sentís que es ahora o nunca. Todo lo que viste, lo que fuiste, lo que callaste durante tantos años. Está en la punta de la lengua.`,
    choices:[
      {label:'Contarlo', small:'Que alguien lo sepa, antes del final.',
        run:(ctx)=>{ ctx.npc.knows.beyonder = true; applyEffects({sanity:[6,12]}); remember('confessed_'+ctx.npc.id, `Le contaste a ${ctx.npc.name} la verdad sobre tu vida oculta.`, {cat:'secret', npc:ctx.npc.id});
          if(bondScore(ctx.npc) >= 55 && chance(0.7)){ adjustRel(ctx.npc, {trust:[8,14], affection:[4,8]}); return `${ctx.npc.name} escucha sin interrumpir, durante horas. Cuando terminás, no dice "estás loco". Dice: "Eso explica tantas cosas". Y te toma la mano.`; }
          adjustRel(ctx.npc, {fear:[4,10], suspicion:[4,10]}); return `${ctx.npc.name} te escucha con una cara que conocés: la que se pone para los viejos que empiezan a desvariar. Te sirve más té. Al día siguiente llama al médico.`; }},
      {label:'Llevártelo a la tumba', small:'Algunas cosas no se heredan.',
        run:()=>{ applyEffects({sanity:[-3,0]}); remember('kept_secret_forever', 'Decidiste llevarte el secreto de tu vida a la tumba.', {cat:'secret'}); return 'Hablás del tiempo, del precio del pan, de los vecinos. La tarde se va. El secreto se queda donde estuvo siempre, un poco más pesado.'; }}
    ]},
  {id:'old_young_seeker', type:'mystic', rarity:'uncommon', tags:['legacy','mystic'], requirements:{ageMin:60}, weight:3, cooldown:120, narrativeImportance:3,
    hiddenRequirements:()=>!!STATE.pathway.chosenPathway || maxPathwayKnowledge() >= 40,
    title:'Alguien que te recuerda a vos',
    text:'Un muchacho del barrio te para en la calle. Tiene ojeras, sueña cosas que no entiende y escucha voces al atardecer. Alguien le dijo que vos "sabías de estas cosas". Tiene exactamente la cara que tenías vos hace cuarenta años.',
    choices:[
      {label:'Ayudarlo a entender', small:'Lo que nadie hizo por vos.',
        run:()=>{ const n = createNpc({met:true, relType:'contact', role:'Muchacho del barrio', ageMin:16, ageMax:22, trust:25, allowHidden:false}); n.knows.beyonder = true; adjustRel(n, {trust:[12,18], respect:[10,15], loyalty:[8,12]});
          applyEffects({sanity:[4,8]}); remember('helped_seeker', `Ayudaste a ${n.name} a entender lo que le pasaba.`, {cat:'person', npc:n.id});
          return `Le explicás lo que nadie te explicó: que no está loco, que hay que tener cuidado con lo que se quiere saber, que la curiosidad cobra intereses. ${n.name} te escucha como se escucha a quien te salva la vida. Tal vez lo sea.`; }},
      {label:'Decirle que se aleje de todo eso', small:'Por su bien.',
        run:()=>{ applyEffects({sanity:[-2,1]}); return 'Le decís que no sabés nada, que son cosas de la edad, que duerma más. Se va decepcionado. Esa noche, por primera vez en años, rezás. No sabés a quién.'; }},
      {label:'Mandarlo a la Iglesia', small:'Ellos saben qué hacer con estos chicos.',
        run:()=>{ factionMeet('church'); factionAdjust('church', {trust:[2,4], merit:1}); addHiddenTruth('El muchacho que mandaste a la Iglesia terminó en los Nighthawks. Murió joven, en servicio, con una medalla que nadie vio.');
          return 'Le das una dirección y el nombre de un diácono. Te da las gracias. No lo volvés a ver en el barrio.'; }}
    ]},
  {id:'old_move_in', type:'family', rarity:'uncommon', tags:['family','care'], requirements:{ageMin:76}, weight:3, cooldown:120, narrativeImportance:3,
    context:(ctx)=>{ if(spouseNpc()) return null; const k = childrenNpcs().filter(n=>n.alive && npcAge(n) >= 25).sort((a,b)=>bondScore(b)-bondScore(a)); if(!k.length) return null; ctx.npc = k[0]; return ctx; },
    title:'Vení a vivir con nosotros',
    text:(ctx)=>`${ctx.npc.name} te lo plantea en un almuerzo de domingo, con la voz que se usa para las cosas ya decididas: que te mudes con su familia. Que no está bien que vivas solo a tu edad.`.replace('solo', gx('solo','sola','sole')),
    choices:[
      {label:'Aceptar', small:'Nietos, ruido, compañía.',
        run:(ctx)=>{ adjustRel(ctx.npc, {affection:[6,10], dependence:[8,12]}); applyEffects({sanity:[4,8]}); remember('moved_with_child', `En la vejez, te fuiste a vivir con ${ctx.npc.name}.`, {cat:'person', npc:ctx.npc.id});
          return 'Te instalan en el cuarto de huéspedes. Hay ruido a toda hora, chicos que entran sin golpear y una mesa larga los domingos. Extrañás tu silencio una semana. Después, ya no.'; }},
      {label:'Quedarte en tu casa', small:'Mientras puedas.',
        run:(ctx)=>{ adjustRel(ctx.npc, {affection:[-3,0]}); applyEffects({sanity:[-2,2]}); return `Le decís que no, con cariño. ${ctx.npc.name} insiste un poco y después deja de insistir. Empieza a llamarte todos los días a la misma hora.`; }}
    ]},
  {id:'old_long_life', type:'mystic', rarity:'uncommon', tags:['beyonder','aging'], requirements:{ageMin:95, beyonder:true}, weight:4, cooldown:120,
    run:()=>{ applyEffects({humanity:-2, sanity:[-5,-2]});
      return {title:'Más que todos', text:'Ya no queda nadie vivo de los que conocías a los veinte. Nadie que recuerde tu cara joven, tu risa de antes, tu primer trabajo. Caminás por una ciudad que cambió de nombre dos veces y sos la única persona que se acuerda de cómo era.'}; }}
];
