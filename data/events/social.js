'use strict';
/* =========================================================================
   data/events/social.js — la gente de tu vida (§9, §11, §3).
   Eventos atados a un NPC concreto (context elige a quién). Son el camino
   principal de la cadena del rework: amistad → contacto → información →
   acceso a una organización → descubrimiento de una vía → misión →
   secreto → consecuencia futura. Todo lo que pasa queda en la memoria del
   personaje con el id del NPC, así otros eventos pueden preguntar "¿lo
   ayudaste antes?" y el final puede contarlo.
   ========================================================================= */
const EVENTS_SOCIAL = [
  {id:'npc_asks_loan', type:'social', rarity:'uncommon', tags:['money','favor'], requirements:{ageMin:18}, weight:5, cooldown:18, narrativeImportance:3,
    context:(ctx)=>{ if(STATE.character.cash < 150) return null;
      const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.trust>=25 && !memoryWithNpc(n.id,'lent_money') && (npcHasGoal(n,'dinero') || n.flags.debt) && n.relType!=='family' || (n.id.startsWith('hermano') && n.alive && n.flags.debt));
      if(!c.length) return null; ctx.npc = pick(c); ctx.amount = Math.round(rndInt(120,320)*priceIndex()); return ctx; },
    title:'Un favor incómodo', text:(ctx)=>`${ctx.npc.name} te pide plata prestada: ${fmtMoney(ctx.amount)}. No mucho, pero tampoco poco. Promete devolverla "apenas se acomode".`,
    choices:[
      {label:'Prestársela', small:'Un favor es un favor.', run:(ctx)=>{
        const n = ctx.npc; applyEffects({cash:-ctx.amount, reputation:[1,3]}); adjustRel(n, {trust:6, loyalty:8, dependence:4});
        remember('lent_money', `Le prestaste ${fmtMoney(ctx.amount)} a ${n.name} sin garantía de nada.`, {cat:'favor_given', npc:n.id});
        // Se decide AHORA si vuelve o no, según quién es — pero el jugador lo descubre años después.
        const repay = clamp(0.45 + (npcHasTrait(n,'leal')?0.25:0) + (npcHasTrait(n,'generoso')?0.15:0) - (npcHasTrait(n,'ambicioso')?0.15:0) - (npcHasTrait(n,'imprudente')?0.1:0) + n.loyalty/400, 0.15, 0.9);
        if(chance(repay)){
          scheduleConsequence({inMonths:[10,30], title:'Una deuda saldada', text:`${n.name} reaparece, te devuelve lo que le prestaste y algo más. No se olvidó.`,
            effect:{cash:Math.round(ctx.amount*1.4), reputation:[1,3], rel:{npc:n.id, loyalty:8, affection:4}}, cond:{npcAlive:n.id},
            memory:{tag:'favor_repaid', text:`${n.name} te devolvió el préstamo, con intereses.`, cat:'favor_received', npc:n.id}});
        } else {
          scheduleConsequence({inMonths:[12,36], title:'Nunca volvió', text:`Te enterás, de casualidad, de que ${n.name} se fue de la ciudad hace rato. Tu plata se fue con ${ng(n,'él','ella')}.`,
            effect:{sanity:[-8,-3], npcState:{npc:n.id, lifeState:'lejos'}, rel:{npc:n.id, trust:-25, affection:-15}}, cond:{npcAlive:n.id},
            memory:{tag:'favor_betrayed', text:`${n.name} desapareció con tu plata.`, cat:'betrayal', npc:n.id}});
        }
        return 'Le das la plata sin hacerle firmar nada. Así son estas cosas.'; }},
      {label:'Decirle que no podés', small:'No estás para eso.', run:(ctx)=>{
        adjustRel(ctx.npc, {trust:-5, affection:-4}); applyEffects({reputation:[-4,-1]});
        remember('refused_loan', `Le negaste un préstamo a ${ctx.npc.name}.`, {cat:'choice', npc:ctx.npc.id});
        return 'Pone cara de entenderlo, pero algo se enfría entre ustedes.'; }}
    ]},
  {id:'npc_argument', type:'social', rarity:'uncommon', tags:['conflict'], requirements:{ageMin:14}, weight:4, cooldown:12, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && ((n.suspicion>=40 || (n.affection<35 && n.dependence>=30) || n.flags.grudge) && !['padre','madre'].includes(n.id) || n.suspicion>=55)); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    title:(ctx)=>'Una discusión con '+ctx.npc.name, text:(ctx)=>`Lo que venía acumulándose explota. ${ctx.npc.name} te reprocha ${ctx.npc.suspicion>=40 ? 'que ya no sabe quién sos, que hay cosas que le ocultás' : 'que nunca estás cuando hace falta'}.`,
    choices:[
      {label:'Pedir perdón y reconciliarte', small:'Vale más el vínculo que tener razón.', run:(ctx)=>{
        adjustRel(ctx.npc, {affection:8, trust:6, suspicion:-10, respect:-2}); ctx.npc.flags.grudge = false;
        remember('reconciled', `Te reconciliaste con ${ctx.npc.name} después de una pelea fuerte.`, {cat:'person', npc:ctx.npc.id});
        return 'Tardan en mirarse, pero se abrazan. No todo queda dicho. Alcanza.'; }},
      {label:'Decirle la verdad, aunque duela', small:'Sin rodeos.', run:(ctx)=>{
        if(chance(0.5)){ adjustRel(ctx.npc, {respect:8, trust:4, suspicion:-5}); return 'Se queda callado un rato largo. Después asiente. Algo se acomodó.'; }
        adjustRel(ctx.npc, {affection:-12, trust:-8}); ctx.npc.flags.grudge = true; return 'La verdad no le alcanza. Se va dando un portazo.'; }},
      {label:'Cortar por lo sano', small:'No necesitás esto.', run:(ctx)=>{
        ctx.npc.lifeState = 'distanciado'; adjustRel(ctx.npc, {affection:-20, trust:-15, loyalty:-15}); ctx.npc.flags.estranged = true;
        remember('broke_with', `Cortaste la relación con ${ctx.npc.name}.`, {cat:'loss', npc:ctx.npc.id});
        return 'Dejan de hablarse. Al principio es un alivio. Después, no tanto.'; }}
    ]},
  {id:'npc_confides_secret', type:'social', rarity:'uncommon', tags:['secret','trust'], requirements:{ageMin:15}, weight:4, cooldown:18, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.trust>=65 && n.secrets.some(s=>!s.known)); if(!c.length) return null; ctx.npc = pick(c); ctx.secret = ctx.npc.secrets.find(s=>!s.known); return ctx; },
    title:(ctx)=>ctx.npc.name+' te cuenta algo', text:(ctx)=>`Una noche, sin que nadie se lo pida, ${ctx.npc.name} baja la voz: ${ctx.secret.text.charAt(0).toLowerCase()+ctx.secret.text.slice(1)} Nunca se lo contó a nadie.`,
    choices:[
      {label:'Guardárselo para siempre', small:'Es suyo, no tuyo.', run:(ctx)=>{
        ctx.secret.known = true; adjustRel(ctx.npc, {loyalty:10, trust:8, dependence:5});
        remember('kept_secret', `Guardaste el secreto de ${ctx.npc.name}.`, {cat:'secret', npc:ctx.npc.id});
        if(ctx.secret.mystic) applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[3,6], source:ctx.npc.name}});
        return 'Le apretás la mano. No hace falta más.'; }},
      {label:'Guardarlo... por si algún día sirve', small:'Todo secreto es una palanca.', run:(ctx)=>{
        ctx.secret.known = true; ctx.secret.leverageHeld = true; adjustRel(ctx.npc, {trust:4});
        remember('holds_leverage', `Sabés algo de ${ctx.npc.name} que podrías usar.`, {cat:'secret', npc:ctx.npc.id});
        return 'Asentís. Lo anotás en algún lugar de tu cabeza que no tiene nombre.'; }},
      {label:'Contárselo a alguien más', small:'Es demasiado para cargarlo solo.', run:(ctx)=>{
        ctx.secret.known = true; applyEffects({sanity:[1,3]});
        scheduleConsequence({inMonths:[3,18], title:'Se enteró', text:`${ctx.npc.name} se entera de que contaste su secreto. No hace falta que diga nada.`, chance:0.6,
          effect:{rel:{npc:ctx.npc.id, trust:-30, affection:-20, loyalty:-25}}, cond:{npcAlive:ctx.npc.id},
          memory:{tag:'betrayed_secret', text:`Traicionaste la confianza de ${ctx.npc.name}.`, cat:'betrayal', npc:ctx.npc.id}});
        return 'Lo contás. Se siente como sacarte una piedra del zapato. Por ahora.'; }}
    ]},
  {id:'npc_needs_help', type:'social', rarity:'uncommon', tags:['favor'], requirements:{ageMin:16}, weight:4, cooldown:12, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.affection>=35 && n.id!=='extraño'); if(!c.length) return null; ctx.npc = pick(c);
      ctx.trouble = pick(['una mudanza imposible','cuidar a alguien enfermo de su familia','un problema con un prestamista','una noche en la comisaría','un trabajo que no llega a terminar']); return ctx; },
    title:(ctx)=>ctx.npc.name+' necesita una mano', text:(ctx)=>`${ctx.npc.name} está con ${ctx.trouble}. No te lo pide directamente. No hace falta.`,
    choices:[
      {label:'Dejar todo y ayudar', small:'Te cuesta tiempo esta temporada.', run:(ctx)=>{
        spendFreeTime(1, true); adjustRel(ctx.npc, {loyalty:10, affection:6, trust:5}); applyEffects({sanity:[-2,1]});
        remember('helped', `Ayudaste a ${ctx.npc.name} con ${ctx.trouble}.`, {cat:'favor_given', npc:ctx.npc.id});
        if(chance(0.5)) scheduleConsequence({inMonths:[12,60], title:(ctx.npc.name+' no se olvidó'), text:`Años después, cuando más lo necesitás, ${ctx.npc.name} aparece sin que lo llames.`, cond:{npcAlive:ctx.npc.id},
          effect:{sanity:[3,8], cash:[0,120], rel:{npc:ctx.npc.id, affection:5}}, memory:{tag:'favor_returned', text:`${ctx.npc.name} te devolvió aquella ayuda.`, cat:'favor_received', npc:ctx.npc.id}});
        return 'No es cómodo ni rápido. Pero estás.'; }},
      {label:'Mandar algo de plata', small:'Ayuda a distancia.', run:(ctx)=>{
        const v = Math.round(rndInt(30,90)*priceIndex()); applyEffects({cash:-v}); adjustRel(ctx.npc, {trust:3, dependence:3});
        return `Mandás ${fmtMoney(v)} con una nota corta. Te lo agradece. Se nota que esperaba otra cosa.`; }},
      {label:'Hacerte el distraído', small:'Tenés tus propios problemas.', run:(ctx)=>{
        adjustRel(ctx.npc, {affection:-8, loyalty:-8}); remember('didnt_help', `No ayudaste a ${ctx.npc.name} cuando lo necesitaba.`, {cat:'choice', npc:ctx.npc.id});
        return 'Nadie te reclama nada. Eso es lo peor.'; }}
    ]},
  {id:'npc_suspects_you', type:'social', rarity:'uncommon', tags:['secret','beyonder'], requirements:{beyonder:true}, weight:5, cooldown:12, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.suspicion>=45 && !n.knows.beyonder); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    title:'¿Qué te está pasando?', text:(ctx)=>`${ctx.npc.name} te frena en seco: "Estás distinto. No dormís, desaparecés de noche, a veces me mirás como si supieras lo que voy a decir. ¿Qué te está pasando?"`,
    choices:[
      {label:'Mentir con naturalidad', small:'Depende de lo bien que mientas.', run:(ctx)=>{
        const ok = chance(0.45 + pathwayMods().deception + (STATE.character.reputation>20?0.05:0));
        if(ok){ adjustRel(ctx.npc, {suspicion:-15}); return 'Le das una explicación tan aburrida que no puede ser mentira. Se la cree. Casi.'; }
        adjustRel(ctx.npc, {suspicion:10, trust:-8}); return 'Te escucha hasta el final. No te cree una palabra, y los dos lo saben.'; }},
      {label:'Contarle la verdad', small:'Alguien tiene que saberlo.', run:(ctx)=>{ return confideBeyonderSecret(ctx.npc); }},
      {label:'Alejarte', small:'Mejor que no sepa nada.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-8, suspicion:5}); if(chance(0.4)) ctx.npc.lifeState='distanciado'; return 'Te alejás de a poco. Es más seguro. Es más solo.'; }}
    ]},
  {id:'life_someone_special', type:'social', rarity:'uncommon', tags:['love'], requirements:{ageMin:18, ageMax:45, single:true}, weight:5, cooldown:24, narrativeImportance:3,
    hiddenRequirements:()=>!partnerNpc(),
    title:'Alguien', text:()=>pick(['En una fiesta de un conocido, alguien se ríe de un chiste tuyo que no era tan bueno. Se quedan hablando hasta que apagan las luces.',
      'Todas las mañanas se cruzan en la misma esquina. Hoy, por fin, alguien dice buen día primero.',
      'Te toca compartir mesa en una taberna llena. Para el final de la noche, ya no son desconocidos.']),
    choices:[
      {label:'Invitarle a salir', small:'Arriesgarse un poco.', run:()=>{ const c = STATE.character; const g = c.genero==='Hombre' ? 'f' : c.genero==='Mujer' ? 'm' : (chance(0.5)?'f':'m');
        const n = createNpc({gender:g, relType:'acquaintance', ageMin:Math.max(18, c.edad-8), ageMax:c.edad+8, met:true, trust:rndInt(30,50), affection:rndInt(45,65)});
        if(chance(0.7 + luckMod())){ startDating(n); return `Se llama ${n.name}. Dice que sí. Ninguno de los dos sabe todavía adónde va esto.`; }
        adjustRel(n, {affection:-10}); return `Se llama ${n.name}. Te dice que no, con amabilidad. Igual te quedás con su nombre.`; }},
      {label:'Dejarlo pasar', small:'No es el momento.', run:()=>'Es un buen recuerdo. A veces eso alcanza.'}
    ]},
  {id:'npc_romance', type:'social', rarity:'uncommon', tags:['love'], requirements:{ageMin:18, single:true}, weight:4, cooldown:18, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.affection>=50 && romanceCompatible(n)); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    title:(ctx)=>'Algo con '+ctx.npc.name, text:(ctx)=>`Con ${ctx.npc.name} ya no es sólo amistad. Los dos lo saben desde hace un tiempo. Esta noche, a la salida, se queda mirándote un segundo de más.`,
    choices:[
      {label:'Dar el paso', small:'Empezar algo.', run:(ctx)=>{ startDating(ctx.npc); return 'Nadie dice nada importante. No hace falta.'; }},
      {label:'Dejarlo en amistad', small:'No querés perder lo que tienen.', run:(ctx)=>{ adjustRel(ctx.npc, {affection:-4, respect:3}); return 'Te sonríe con algo de tristeza. Siguen siendo amigos. Casi igual que antes.'; }}
    ]},
  {id:'npc_rival', type:'social', rarity:'uncommon', tags:['work','conflict'], requirements:{ageMin:18, employed:true}, weight:3, cooldown:36, narrativeImportance:3,
    title:'Un rival en el trabajo', text:()=>{ return 'Entra a tu trabajo alguien con más ambición que escrúpulos. En su primera semana ya se llevó el crédito de algo que hiciste vos.'; },
    choices:[
      {label:'Competir limpio', small:'Que hablen los resultados.', run:()=>{ const r = createRival(); jobPerformance(3); adjustRel(r, {respect:6}); return `Trabajás el doble. ${r.name} lo nota. Te mira con otros ojos: todavía como rival, pero con respeto.`; }},
      {label:'Hacerle la vida imposible', small:'Nadie te roba el crédito.', run:()=>{ const r = createRival(); adjustRel(r, {fear:6, affection:-15}); r.flags.grudge = true; applyEffects({reputation:[-2,1]});
        remember('rival_war', `Empezaste una guerra de oficina con ${r.name}.`, {cat:'person', npc:r.id}); return `${r.name} no se queda atrás. Esto recién empieza.`; }},
      {label:'Ganártelo', small:'Mejor aliado que enemigo.', run:()=>{ const r = createRival(); adjustRel(r, {trust:10, affection:6}); r.relType='work'; return `Lo invitás a una cerveza. ${r.name} desconfía, pero acepta. Quizás no sea tan malo.`; }}
    ]},
  {id:'npc_mentor_reveal', type:'mystic', rarity:'rare', tags:['mentor','pathway','faction'], requirements:{ageMin:16}, weight:6, cooldown:48, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.hidden.pathway && !n.known.pathway && n.trust>=55 && (STATE.flags.mysticExposure>=10 || STATE.pathway.chosenPathway)); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    title:(ctx)=>'Lo que '+ctx.npc.name+' nunca te dijo', text:(ctx)=>`${ctx.npc.name} cierra la puerta con llave antes de hablar. "Hace tiempo que te veo buscar cosas que no tienen explicación. Yo sé algunas. No todas. Pero sé más que vos." Por un instante, algo en sus ojos no es del todo humano.`,
    choices:[
      {label:'Pedirle que te enseñe', small:'Aunque sea peligroso.', run:(ctx)=>{
        const n = ctx.npc; n.known.pathway = true; n.known.sequence = chance(0.5); n.flags.mentor = true; n.tier = 'sobrenatural'; adjustRel(n, {trust:6, respect:6, dependence:4});
        applyEffects({clue:{pathway:n.hidden.pathway, reliability:'real', strength:[10,18], source:n.name, confirm:true}, exposure:5});
        if(n.hidden.faction){ n.known.faction = true; factionMeet(n.hidden.faction); factionAdjust(n.hidden.faction, {access:1, trust:6}); }
        remember('mentor', `${n.name} te reveló que era Beyonder y aceptó enseñarte.`, {cat:'person', npc:n.id});
        learnLore('beyonders_exist', n.name);
        if(STATE.pathway.chosenPathway && chance(0.4)) nudgeActingMethod(0.5, n.name);
        return `Te habla durante horas de lo que es: ${PATHWAYS[n.hidden.pathway].name}${n.known.sequence ? ', Sequence '+n.hidden.sequence : ''}. De lo que cuesta. De lo que no se puede deshacer.${n.hidden.faction ? ' Y de la gente para la que trabaja.' : ''}`; }},
      {label:'Pedirle que no te cuente nada', small:'Hay cosas que es mejor no saber.', run:(ctx)=>{
        adjustRel(ctx.npc, {respect:5}); applyEffects({sanity:[1,3]}); remember('refused_mentor', `Le pediste a ${ctx.npc.name} que no te contara nada.`, {cat:'choice', npc:ctx.npc.id});
        addHiddenTruth(`${ctx.npc.name} era ${PATHWAYS[ctx.npc.hidden.pathway].name}, Sequence ${ctx.npc.hidden.sequence}. Te lo quiso contar una vez. Le pediste que no.`);
        return 'Asiente, aliviado y decepcionado a la vez. Nunca vuelve a sacar el tema.'; }}
    ]},
  {id:'npc_betrayal_revealed', type:'social', rarity:'rare', tags:['betrayal'], weight:6, cooldown:24, narrativeImportance:3,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.flags.reportedPlayer && !n.flags.betrayalKnown); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    title:'Quién te denunció', text:(ctx)=>`Te llega, por un camino que no esperabas, la confirmación: fue ${ctx.npc.name} quien le habló de vos a ${factionName(ctx.npc.flags.reportedPlayer)}.`,
    choices:[
      {label:'Enfrentarle', small:'Mirarle a los ojos.', run:(ctx)=>{ const n = ctx.npc; n.flags.betrayalKnown = true;
        if(chance(0.5)){ adjustRel(n, {fear:10, trust:-20}); return `${n.name} llora, se justifica, dice que tenía miedo. Te das cuenta de que es verdad. No alcanza.`; }
        adjustRel(n, {affection:-20, trust:-30}); n.flags.grudge = true; return `${n.name} no lo niega. "Alguien tenía que hacerlo."`; }},
      {label:'Cortar todo vínculo', small:'Para vos ya no existe.', run:(ctx)=>{ const n = ctx.npc; n.flags.betrayalKnown = true; n.lifeState = 'distanciado'; adjustRel(n, {trust:-40, affection:-30, loyalty:-40}); return 'No le decís nada. Simplemente dejás de existir para esa persona.'; }},
      {label:'Perdonar', small:'Todos tienen miedo a veces.', run:(ctx)=>{ const n = ctx.npc; n.flags.betrayalKnown = true; adjustRel(n, {loyalty:15, trust:5, dependence:6}); remember('forgave', `Perdonaste a ${n.name} por denunciarte.`, {cat:'person', npc:n.id}); return `${n.name} no puede creerlo. Te va a deber esto toda la vida.`; }}
    ],
    cat:'relation'},
  {id:'npc_gossip_spread', type:'social', rarity:'uncommon', tags:['secret','attention'], weight:5, cooldown:18,
    context:(ctx)=>{ const c = aliveNpcs().filter(n=>n.knows.beyonder && npcHasTrait(n,'chismoso') && n.lifeState==='presente'); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    run:(ctx)=>{ applyEffects({attention:[3,7], reputation:[-3,0]}); addHiddenTruth(`${ctx.npc.name} le contó a media ciudad lo que le confiaste. No con mala intención: con entusiasmo.`);
      return {title:'Se habla de vos', text:'Empezás a notar miradas en el barrio. Alguien te pregunta, riéndose, si es verdad "eso que dicen". No sabés quién habló. Todavía.'}; }},
  {id:'npc_disappears_lead', type:'mystic', rarity:'uncommon', tags:['missing','rumor'], weight:6, cooldown:12,
    context:(ctx)=>{ const c = STATE.npcs.filter(n=>n.lifeState==='desaparecido' && !n.flags.leadCreated && n.met); if(!c.length) return null; ctx.npc = pick(c); return ctx; },
    run:(ctx)=>{ ctx.npc.flags.leadCreated = true; addMissingPersonLead(ctx.npc);
      return {title:'¿Qué le pasó a '+ctx.npc.name+'?', text:`Nadie sabe nada de ${ctx.npc.name} desde hace semanas. La policía dice que "la gente se va". Vos no te lo creés.`}; }}
];
