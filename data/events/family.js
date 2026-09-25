'use strict';
/* =========================================================================
   data/events/family.js — vida familiar (§12, §13, §23).
   Hijos que crecen (bebé 0-5, infancia 6-12, adolescencia 13-17, adultez
   18+), desarrollan personalidad según cómo los criás, se van de casa, se
   casan y te dan nietos — y que pueden terminar sabiendo lo que sos. Padres
   que envejecen y necesitan cuidados. Una pareja que empieza a preguntar
   dónde estuviste anoche. Todos ellos son candidatos a Ancla (§13).
   ========================================================================= */
const EVENTS_FAMILY = [
  // ------------------------------ hijos ------------------------------
  {id:'fam_baby_nights', type:'family', rarity:'common', tags:['children'], weight:5, cooldown:6,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)<=2); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ applyEffects({sanity:[-4,-1], salud:[-3,0]}); adjustRel(ctx.npc, {affection:4, dependence:5});
      return {title:'Noches en vela', text:`${ctx.npc.name} no duerme, así que nadie duerme. A las cuatro de la mañana, con el bebé dormido por fin sobre tu pecho, entendés algo que no sabías que no sabías.`}; }},
  {id:'fam_child_word', type:'family', rarity:'common', tags:['children'], weight:4, cooldown:24,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=1 && npcAge(n)<=3 && !n.flags.firstWord); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.firstWord = true; applyEffects({sanity:[3,6]}); adjustRel(ctx.npc, {affection:5});
      remember('child_first_word', `La primera palabra de ${ctx.npc.name}.`, {cat:'person', npc:ctx.npc.id});
      return {title:'Una palabra', text:`${ctx.npc.name} dice su primera palabra. Toda la casa se para a escucharla otra vez.`}; }},
  {id:'fam_child_school', type:'family', rarity:'common', tags:['children','school'], weight:5, cooldown:18, narrativeImportance:3,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=6 && npcAge(n)<=12 && n.lifeState==='presente'); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    title:(ctx)=>'Problemas en la escuela', text:(ctx)=>`La maestra de ${ctx.npc.name} te cita: ${pick(['se peleó con otro chico','no hace las tareas','contesta mal','se pasa las clases mirando por la ventana'])}.`,
    choices:[
      {label:'Ponerle límites firmes', small:'Disciplina.', run:(ctx)=>{ adjustRel(ctx.npc, {respect:6, affection:-2, fear:2}); shapeChild(ctx.npc, 'disciplina'); return 'Hay llanto y portazos. Después, notas mejores. Y algo de distancia.'; }},
      {label:'Sentarte a entender qué le pasa', small:'Paciencia.', run:(ctx)=>{ spendFreeTime(1, true); adjustRel(ctx.npc, {affection:6, trust:6}); shapeChild(ctx.npc, 'calidez'); return `Te cuenta cosas que no le había contado a nadie. ${ctx.npc.name} empieza a mejorar, a su ritmo.`; }},
      {label:'Dejarlo pasar', small:'Ya se le va a pasar.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-2}); shapeChild(ctx.npc, 'libertad'); return 'Se le pasa, o se acostumbra. No sabés cuál de las dos.'; }}
    ]},
  {id:'fam_child_night_question', type:'family', rarity:'uncommon', tags:['children','secret','beyonder'], requirements:{beyonder:true}, weight:5, cooldown:24, narrativeImportance:3,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=6 && npcAge(n)<=16 && n.lifeState==='presente' && !n.knows.beyonder); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    title:'Una pregunta de noche', text:(ctx)=>`${ctx.npc.name} te espera despierto a la madrugada, sentado en la escalera. "¿Adónde vas de noche? ¿Por qué a veces tenés los ojos raros?"`,
    choices:[
      {label:'Inventar una historia creíble', small:'Protegerle de la verdad.', run:(ctx)=>{ const ok = chance(0.6 + pathwayMods().deception); if(ok){ adjustRel(ctx.npc, {suspicion:-5}); return 'Te cree. O quiere creerte, que para un chico es lo mismo.'; } adjustRel(ctx.npc, {suspicion:12, trust:-6}); return 'Asiente. Es la primera vez que ves a tu hijo darse cuenta de que le mentís.'; }},
      {label:'Contarle una parte de la verdad', small:'Una versión que pueda cargar.', run:(ctx)=>{ ctx.npc.knows.partial = true; adjustRel(ctx.npc, {trust:8, affection:4, dependence:4}); ctx.npc.mystic = Math.min(100,(ctx.npc.mystic||0)+25);
        remember('told_child', `Le contaste a ${ctx.npc.name} una parte de lo que sos.`, {cat:'secret', npc:ctx.npc.id});
        addHiddenTruth(`Aquella noche en la escalera, ${ctx.npc.name} entendió mucho más de lo que le contaste.`);
        return 'Le hablás de un mundo escondido, con palabras de cuento. Escucha con los ojos enormes. No te pregunta nada más. Todavía.'; }},
      {label:'Mandarle a dormir', small:'No es tema para esta hora.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-3, suspicion:6}); return 'Sube la escalera sin protestar. Esa noche, por primera vez, cierra la puerta de su cuarto con llave.'; }}
    ]},
  {id:'fam_teen_rebellion', type:'family', rarity:'common', tags:['children','conflict'], weight:5, cooldown:24, narrativeImportance:3,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=13 && npcAge(n)<=17 && n.lifeState==='presente'); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    title:(ctx)=>ctx.npc.name+' ya no es chico', text:(ctx)=>`${ctx.npc.name} vuelve a casa a las tres de la mañana, oliendo a tabaco y a algo peor, y te mira como si el problema fueras vos.`,
    choices:[
      {label:'Castigo ejemplar', small:'Mientras viva en esta casa...', run:(ctx)=>{ adjustRel(ctx.npc, {respect:4, affection:-6, fear:4}); shapeChild(ctx.npc, 'disciplina'); return 'Una semana sin salir. Una semana sin hablarte.'; }},
      {label:'Hablarle de igual a igual', small:'Ya casi es adulto.', run:(ctx)=>{ adjustRel(ctx.npc, {trust:8, respect:4}); shapeChild(ctx.npc, 'calidez'); return 'Terminan hablando hasta el amanecer. Te cuenta cosas que preferirías no saber. Te alegra que te las cuente.'; }},
      {label:'Que haga su vida', small:'Vos también fuiste joven.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:2, dependence:-6}); shapeChild(ctx.npc, 'libertad'); return 'Hace su vida. A veces te la cuenta. Cada vez menos.'; }}
    ]},
  {id:'fam_child_future', type:'family', rarity:'common', tags:['children','future'], weight:6, cooldown:999, narrativeImportance:3,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=16 && npcAge(n)<=19 && !n.flags.futureChosen && n.lifeState==='presente'); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    title:(ctx)=>'El futuro de '+ctx.npc.name, text:(ctx)=>`${ctx.npc.name} quiere ${ctx.npc.flags.dream || (ctx.npc.flags.dream = pick(['estudiar en la universidad','irse al mar','trabajar ya y ganar su propia plata','ser artista','entrar a la Iglesia']))}. Te pide tu opinión, aunque ya decidió.`,
    choices:[
      {label:'Apoyarle, con plata incluida', small:'Es su vida.', run:(ctx)=>{ ctx.npc.flags.futureChosen = true; applyEffects({cash:-Math.round(rndInt(80,300)*priceIndex())}); adjustRel(ctx.npc, {affection:8, loyalty:8}); setChildPath(ctx.npc, ctx.npc.flags.dream); return 'Te abraza como cuando era chico. Esa noche no dormís de orgullo y de miedo.'; }},
      {label:'Empujarle hacia algo "más seguro"', small:'Sabés cómo es el mundo.', run:(ctx)=>{ ctx.npc.flags.futureChosen = true; adjustRel(ctx.npc, {affection:-6, respect:2}); setChildPath(ctx.npc, 'trabajar en algo seguro'); ctx.npc.flags.resentsFuture = true; return 'Te hace caso. Nunca te lo reprocha en voz alta.'; }}
    ]},
  {id:'fam_child_leaves', type:'family', rarity:'common', tags:['children','home'], weight:6, cooldown:999,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=18 && !n.flags.leftHome && n.alive); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.leftHome = true; applyEffects({sanity:[-3,2]}); remember('child_left', `${ctx.npc.name} se fue de casa.`, {cat:'person', npc:ctx.npc.id});
      addMilestone('family', `${ctx.npc.name} se va de casa`);
      return {title:ctx.npc.name+' se va', text:`${ctx.npc.name} arma dos valijas y se va a vivir por su cuenta. La casa queda enorme. Su cuarto, intacto, durante meses.`}; }},
  {id:'fam_child_marries', type:'family', rarity:'uncommon', tags:['children','wedding'], weight:4, cooldown:36,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>npcAge(n)>=21 && npcAge(n)<=38 && !n.flags.married && n.alive && n.lifeState!=='desaparecido'); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.married = true; applyEffects({sanity:[3,7], cash:-Math.round(rndInt(50,250)*priceIndex())}); adjustRel(ctx.npc, {affection:4});
      addMilestone('family', `Se casa ${ctx.npc.name}`);
      return {title:'La boda de '+ctx.npc.name, text:`${ctx.npc.name} se casa. En la fiesta, alguien te pregunta si estás orgulloso. Tardás en contestar porque tenés la garganta cerrada.`}; }},
  {id:'fam_grandchild', type:'family', rarity:'uncommon', tags:['children','grandchildren'], weight:4, cooldown:24,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>n.flags.married && npcAge(n)>=22 && npcAge(n)<=42 && n.alive && (n.flags.kids||0)<3); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.kids = (ctx.npc.flags.kids||0) + 1; STATE.character.grandchildren = (STATE.character.grandchildren||0) + 1; applyEffects({sanity:[5,10]});
      remember('grandchild', `Nació un nieto, hijo de ${ctx.npc.name}.`, {cat:'person', npc:ctx.npc.id}); addMilestone('family', 'Nace un nieto');
      return {title:'Un nieto', text:`${ctx.npc.name} te pone en brazos a su bebé. Es igual a ${ctx.npc.name} cuando nació. Es igual a vos, dicen.`}; }},

  // ------------------------------ padres ------------------------------
  {id:'fam_parent_ill', type:'family', rarity:'uncommon', tags:['parents','health'], weight:5, cooldown:36, narrativeImportance:3,
    context:(ctx)=>{ const p = ['padre','madre'].map(npcById).filter(n=>n && n.alive && npcAge(n)>=60 && !n.flags.ill); if(!p.length) return null; ctx.npc = pick(p); return ctx; },
    title:(ctx)=>ctx.npc.name+' está enfermo', text:(ctx)=>`${ctx.npc.name} ya no puede con las escaleras. El médico dice que necesita a alguien cerca "por un tiempo". Todos saben lo que significa "por un tiempo".`,
    choices:[
      {label:'Cuidarle personalmente', small:'Te va a costar tiempo durante un año.', run:(ctx)=>{ ctx.npc.flags.ill = true; STATE.flags.caringUntil = STATE.time.totalMonths + 12; adjustRel(ctx.npc, {affection:12, trust:8});
        remember('cared_parent', `Cuidaste a ${ctx.npc.name} cuando ya no podía solo.`, {cat:'favor_given', npc:ctx.npc.id}); return 'Durante un año, tus tardes son suyas. Hablan de cosas que nunca se habían dicho.'; }},
      {label:'Pagar a alguien que le cuide', small:'Plata en lugar de tiempo.', run:(ctx)=>{ ctx.npc.flags.ill = true; applyEffects({cash:-Math.round(rndInt(250,600)*priceIndex())}); adjustRel(ctx.npc, {trust:3, affection:-2}); return 'La enfermera es buena. No es lo mismo, y los dos lo saben.'; }},
      {label:'Dejarlo en manos de tus hermanos', small:'No podés con todo.', requires:()=>aliveNpcs().some(n=>n.id.startsWith('hermano')), run:(ctx)=>{ ctx.npc.flags.ill = true; adjustRel(ctx.npc, {affection:-6});
        aliveNpcs().filter(n=>n.id.startsWith('hermano')).forEach(s=>adjustRel(s, {affection:-6, respect:-4})); return 'Tus hermanos se hacen cargo. Te lo van a recordar en cada cumpleaños.'; }}
    ]},
  {id:'fam_parent_secret', type:'family', rarity:'rare', tags:['parents','secret','mystic'], weight:6, cooldown:999, repeatable:false, narrativeImportance:3,
    context:(ctx)=>{ if(!STATE.flags.familySecret) return null; const p = ['padre','madre'].map(npcById).filter(n=>n && n.alive && npcAge(n)>=62); if(!p.length) return null; ctx.npc = pick(p); return ctx; },
    title:'Lo que tu familia callaba', text:(ctx)=>`${ctx.npc.name} te pide que cierres la puerta. "Hay algo de tu abuelo que nunca te contamos. No sabíamos si era verdad. Creo que vos sí vas a saber."`,
    choices:[
      {label:'Escuchar', small:'Siempre sospechaste algo.', run:(ctx)=>{ const fs = STATE.flags.familySecret; applyEffects({clue:{pathway:fs.pathway, reliability:'real', strength:[8,14], source:'la historia de tu abuelo', confirm:false}, exposure:4});
        if(fs.item==='formula') addFormula(fs.pathway, 9, chance(0.7)?'true':'partial', 'un cuaderno de tu abuelo');
        else addItem('book_untitled', 1, 'el baúl de tu abuelo');
        remember('family_secret', 'Supiste que tu abuelo había tocado el mundo oculto.', {cat:'secret', npc:ctx.npc.id});
        return 'Tu abuelo no murió de un ataque al corazón. Se metió en algo. Dejó un baúl que nadie se animó a abrir. Ahora es tuyo.'; }},
      {label:'Decirle que no hace falta', small:'Dejar el pasado donde está.', run:(ctx)=>{ addHiddenTruth('Tu abuelo había sido Beyonder. Tu familia guardó su baúl sin abrir durante cuarenta años.'); return 'Te acaricia la mano. "Está bien. Quizás sea mejor así."'; }}
    ]},

  // ------------------------------ pareja ------------------------------
  {id:'fam_spouse_where', type:'family', rarity:'uncommon', tags:['spouse','secret'], weight:6, cooldown:12, narrativeImportance:3,
    context:(ctx)=>{ const s = spouseNpc() || partnerNpc(); if(!s || s.knows.beyonder || s.suspicion < 30) return null; if(!STATE.pathway.chosenPathway && STATE.flags.mysticExposure < 25) return null; ctx.npc = s; return ctx; },
    title:'¿Dónde estuviste anoche?', text:(ctx)=>`${ctx.npc.name} te espera en la cocina, con la luz apagada. "¿Dónde estuviste anoche? Y no me digas que en el trabajo."`,
    choices:[
      {label:'Mentir', small:'Otra vez.', run:(ctx)=>{ const ok = chance(0.5 + pathwayMods().deception - ctx.npc.suspicion/300); if(ok){ adjustRel(ctx.npc, {suspicion:-8}); return 'Te cree. Por esta vez.'; } adjustRel(ctx.npc, {suspicion:12, trust:-10, affection:-5}); return 'Hay un silencio largo. "Está bien", dice, en el tono exacto en que no está nada bien.'; }},
      {label:'Contarle la verdad', small:'No podés seguir así.', run:(ctx)=>confideBeyonderSecret(ctx.npc)},
      {label:'Contestar con enojo', small:'No le debés explicaciones.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-10, fear:4, suspicion:6}); return 'Terminan gritando. Esa noche dormís en el sillón.'; }}
    ]},
  {id:'fam_marriage_crisis', type:'family', rarity:'uncommon', tags:['spouse','conflict'], weight:5, cooldown:24, narrativeImportance:3,
    context:(ctx)=>{ const s = spouseNpc(); if(!s || s.affection >= 30) return null; ctx.npc = s; return ctx; },
    title:'Un matrimonio en crisis', text:(ctx)=>`Con ${ctx.npc.name} ya casi no se hablan. Comparten la casa como dos inquilinos educados.`,
    choices:[
      {label:'Intentarlo de verdad', small:'Tiempo, paciencia, conversaciones difíciles.', run:(ctx)=>{ spendFreeTime(1, true); if(chance(0.6)){ adjustRel(ctx.npc, {affection:15, trust:8}); return 'No es fácil ni rápido. Pero una noche se ríen juntos de algo tonto, y es como antes.'; } adjustRel(ctx.npc, {affection:3}); return 'Lo intentan. Algunas cosas no vuelven.'; }},
      {label:'Separarse', small:'Mejor así para los dos.', run:(ctx)=>{ divorce(ctx.npc); return 'Firman los papeles en una oficina con olor a tinta. Ninguno de los dos llora ahí. Después, cada uno por su lado, sí.'; }},
      {label:'Seguir así', small:'No es tan grave.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-3}); applyEffects({sanity:[-4,-1]}); return 'Seguís así. Los años pasan igual.'; }}
    ]},
  {id:'fam_anniversary', type:'family', rarity:'common', tags:['spouse'], weight:3, cooldown:12,
    context:(ctx)=>{ const s = spouseNpc(); if(!s || s.affection < 40) return null; ctx.npc = s; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {affection:[3,6]}); applyEffects({sanity:[2,5], cash:-rndInt(5,30)});
      return {title:'Un aniversario', text:`Con ${ctx.npc.name} festejan otro año juntos. Nada extravagante: la misma fonda de siempre, la misma mesa del rincón.`}; }},
  {id:'fam_partner_proposes', type:'family', rarity:'uncommon', tags:['love','wedding'], weight:5, cooldown:30, narrativeImportance:3,
    context:(ctx)=>{ const n = partnerNpc(); if(!n || STATE.character.estadoCivil === 'Casado/a' || n.affection < 55) return null; const m = memoryWithNpc(n.id, 'dating'); if(m && STATE.time.totalMonths - m.totalMonths < 14) return null; ctx.npc = n; return ctx; },
    title:'Una pregunta', text:(ctx)=>`${ctx.npc.name} se pone nervioso de una forma que no le conocías. Después de dar muchas vueltas, lo dice: quiere casarse con vos.`.replace('nervioso', ng(ctx.npc,'nervioso','nerviosa')),
    choices:[
      {label:'Decir que sí', small:'Una boda chica. Lo importante es otra cosa.', run:(ctx)=>{ marryPartner(ctx.npc, true); return 'Dicen que sí los dos, en voz baja, como si alguien pudiera escucharlos y cambiar de idea.'; }},
      {label:'Todavía no', small:'No es un no.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-5, trust:-3}); return 'Asiente. Se le nota la desilusión, y también que va a esperar.'; }},
      {label:'Terminar la relación', small:'Esto no va a ningún lado.', run:(ctx)=>{ const n = ctx.npc; n.id = 'ex_' + uid('x'); n.role = ng(n,'Ex pareja','Ex pareja'); n.relType = 'acquaintance'; n.lifeState = 'distanciado'; adjustRel(n, {affection:-25, trust:-15}); applyEffects({sanity:[-6,-2]}); remember('breakup', `Terminaste con ${n.name}.`, {cat:'loss', npc:n.id}); return 'No hay gritos. Hay algo peor: silencio, y una puerta que se cierra despacio.'; }}
    ]},
  {id:'fam_pregnancy', type:'family', rarity:'uncommon', tags:['children'], weight:4, cooldown:30, narrativeImportance:3,
    context:(ctx)=>{ const s = spouseNpc(); const c = STATE.character; if(!s || c.edad > 46 || npcAge(s) > 44 || childrenNpcs().length >= 5) return null; if(!STATE.flags.tryingForChild && !chance(0.35)) return null; ctx.npc = s; return ctx; },
    title:'Una noticia', text:(ctx)=>`${ctx.npc.name} te toma de las manos antes de decir nada. Va a nacer un hijo.`,
    choices:[
      {label:'Alegrarte sin reservas', small:'Es una buena noticia.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:6, trust:4}); const k = birthChild(); return `Meses después nace ${k.name}. Llora fuerte. Todos dicen que es una buena señal.`; }},
      {label:'Alegrarte, con miedo', small:'Con lo que sabés del mundo...', run:(ctx)=>{ adjustRel(ctx.npc, {affection:3}); applyEffects({sanity:[-2,1]}); const k = birthChild(); remember('fear_for_child', `Tuviste miedo por ${k.name} desde el primer día.`, {cat:'person', npc:k.id}); return `Nace ${k.name}. Lo mirás dormir y pensás en todo lo que no le vas a poder contar nunca.`; }}
    ]},
  {id:'fam_spouse_wants_child', type:'family', rarity:'uncommon', tags:['spouse','children'], weight:4, cooldown:24, narrativeImportance:3,
    context:(ctx)=>{ const s = spouseNpc(); if(!s || childrenNpcs().length || npcAge(s) > 44 || STATE.character.edad > 48) return null; ctx.npc = s; return ctx; },
    title:'Una conversación pendiente', text:(ctx)=>`${ctx.npc.name} saca el tema durante la cena: quiere tener hijos. "No ahora mismo. Pero no quiero que sea nunca."`,
    choices:[
      {label:'Decir que sí', small:'Una familia.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:8, trust:4}); STATE.flags.tryingForChild = true; return 'Se quedan hablando de nombres hasta tarde. Ninguno de los dos elige ninguno.'; }},
      {label:'Pedirle tiempo', small:'No estás listo.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-3}); return 'Asiente. Vuelve a sacar el tema en seis meses. Y en seis más.'; }},
      {label:'Decir que no', small:'Con lo que sabés del mundo...', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-10, trust:-4}); remember('no_children', `Le dijiste a ${ctx.npc.name} que no querías hijos.`, {cat:'choice', npc:ctx.npc.id}); return 'No discute. Se levanta a lavar los platos. Tarda mucho.'; }}
    ]},

  // ------------------------------ hermanos ------------------------------
  {id:'fam_sibling_wedding', type:'family', rarity:'uncommon', tags:['siblings','wedding'], weight:3, cooldown:36,
    context:(ctx)=>{ const s = aliveNpcs().filter(n=>n.id.startsWith('hermano') && npcAge(n)>=20 && !n.flags.married); if(!s.length) return null; ctx.npc = pick(s); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.married = true; applyEffects({sanity:[2,5], cash:-rndInt(10,60)}); adjustRel(ctx.npc, {affection:3});
      return {title:'Se casa '+ctx.npc.name, text:`${ctx.npc.name} se casa. En el brindis cuenta una anécdota tuya de cuando eran chicos que habías olvidado por completo.`}; }},
  {id:'fam_sibling_trouble', type:'family', rarity:'uncommon', tags:['siblings','money'], weight:3, cooldown:36, narrativeImportance:3,
    context:(ctx)=>{ const s = aliveNpcs().filter(n=>n.id.startsWith('hermano') && npcAge(n)>=18 && n.lifeState==='presente'); if(!s.length || STATE.character.edad < 18) return null; ctx.npc = pick(s); ctx.npc.flags.debt = true; return ctx; },
    title:(ctx)=>ctx.npc.name+' está en problemas', text:(ctx)=>`${ctx.npc.name} aparece con un ojo morado y una deuda con gente que no manda cartas de aviso.`,
    choices:[
      {label:'Pagar su deuda', small:'La familia es la familia.', run:(ctx)=>{ const v = Math.round(rndInt(150,450)*priceIndex()); applyEffects({cash:-v}); ctx.npc.flags.debt = false; adjustRel(ctx.npc, {loyalty:12, dependence:8});
        remember('paid_sibling_debt', `Pagaste la deuda de ${ctx.npc.name}.`, {cat:'favor_given', npc:ctx.npc.id}); return `Pagás ${fmtMoney(v)}. ${ctx.npc.name} jura que es la última vez.`; }},
      {label:'Acompañarle a negociar', small:'Dar la cara juntos.', run:(ctx)=>{ if(chance(0.5)){ ctx.npc.flags.debt = false; adjustRel(ctx.npc, {respect:8, loyalty:6}); return 'Negocian un plazo. Salen vivos y con una deuda que se puede pagar.'; } startCombat('thugs', {env:'alley'}); return 'La negociación dura dos frases.'; }},
      {label:'No meterte', small:'Que aprenda.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-10, loyalty:-8}); if(chance(0.3)){ scheduleConsequence({inMonths:[2,8], title:'Una mala noticia', text:`Encuentran a ${ctx.npc.name} golpeado en un callejón. Sobrevive. No te mira a los ojos en el hospital.`, effect:{sanity:[-6,-2], rel:{npc:ctx.npc.id, affection:-10}}, cond:{npcAlive:ctx.npc.id}}); } return 'Se va sin decir nada.'; }}
    ]}
];
