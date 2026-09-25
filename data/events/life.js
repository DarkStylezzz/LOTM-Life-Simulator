'use strict';
/* =========================================================================
   data/events/life.js — vida cotidiana desde la adolescencia (§4, §6).
   Contiene los eventos mundanos originales (con su texto), ahora con id,
   rareza y enfriamiento, y eventos nuevos con DECISIONES de vida: dejar la
   escuela, ir a la universidad, una enfermedad seria, un robo, una
   herencia, y las fuentes cotidianas de rumores (el diario, la taberna).
   El ingreso mensual ya no sale de un evento: lo calcula la economía
   (systems/economy.js); "Trabajo cotidiano" pasó a mover el desempeño.
   ========================================================================= */
const EVENTS_LIFE = [
  // ---------------- trabajo ----------------
  {id:'life_work_good', type:'work', rarity:'common', tags:['work'], requirements:{ageMin:14, employed:true}, weight:6, cooldown:4,
    run:()=>{ jobPerformance(rndInt(2,5)); const bonus = chance(0.35) ? Math.round(rndInt(10,40)*priceIndex()) : 0; if(bonus) applyEffects({cash:bonus});
      return {title:'Un buen mes en el trabajo', text:`Las cosas salen bien en el trabajo y alguien importante lo nota.${bonus?' Te llevás un extra de '+fmtMoney(bonus)+'.':''}`}; }},
  {id:'life_work_bad', type:'work', rarity:'common', tags:['work'], requirements:{ageMin:14, employed:true}, weight:4, cooldown:4,
    run:()=>{ jobPerformance(-rndInt(2,5)); applyEffects({sanity:[-3,-1]}); return {title:'Un mes torcido en el trabajo', text:'Un error tuyo, o de otro que te toca pagar. El jefe no grita, pero anota.'}; }},

  // ---------------- genéricos (originales) ----------------
  {id:'life_cold', type:'mundane', rarity:'common', tags:['health'], weight:6, cooldown:6,
    run:()=>{ applyEffects({salud:[-8,-2]}); return {title:'Resfrío', text:'Pasás unos días en cama con fiebre. Nada grave, pero te deja débil.'}; }},
  {id:'life_good_memory', type:'mundane', rarity:'common', tags:['mood'], weight:5, cooldown:4,
    run:()=>{ applyEffects({sanity:[2,6]}); return {title:'Un buen recuerdo', text:'Pasás una tarde tranquila con gente cercana. Te sentís en paz.'}; }},
  {id:'life_bad_streak', type:'mundane', rarity:'common', tags:['mood'], weight:5, cooldown:4,
    run:()=>{ applyEffects({sanity:[-9,-3]}); return {title:'Mala racha', text:'Nada sale como esperabas este mes. El desgaste se nota.'}; }},
  {id:'life_good_impression', type:'social', rarity:'common', tags:['reputation'], weight:4, cooldown:6,
    run:()=>{ applyEffects({reputation:[1,4]}); return {title:'Buena impresión', text:'Alguien comenta bien de vos en el vecindario.'}; }},
  {id:'life_expense', type:'mundane', rarity:'common', tags:['money'], requirements:{ageMin:16}, weight:3, cooldown:6,
    run:()=>{ const v = Math.round(rndInt(60,220)*priceIndex()); applyEffects({cash:-v}); return {title:'Gasto imprevisto', text:`Una reparación, una factura o un imprevisto se lleva ${fmtMoney(v)} de tus ahorros.`}; }},
  {id:'life_friend_chat', type:'social', rarity:'common', tags:['friend'], weight:3, cooldown:6,
    context:(ctx)=>{ const n = npcById('amigo'); if(!n || !n.alive || n.lifeState!=='presente' || !n.met) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:5, affection:3}); return {title:'Charla con ' + ctx.npc.name, text:'Se reencuentran y ponen al día sus vidas. La confianza crece.'}; }},
  {id:'life_weekend_gig', type:'work', rarity:'common', tags:['money'], requirements:{ageMin:14, ageMax:66}, weight:4, cooldown:6,
    run:()=>{ applyEffects({cash:[30,140]}); return {title:'Changa de fin de semana', text:'Conseguís un trabajo suelto de un par de días. No es mucho, pero suma.'}; }},
  {id:'life_back_pain', type:'mundane', rarity:'common', tags:['health'], requirements:{ageMin:20}, weight:3, cooldown:8,
    run:()=>{ applyEffects({salud:[-10,-3]}); return {title:'Dolor de espalda', text:'Pasás varios días con el cuerpo resentido, sin una causa clara.'}; }},
  {id:'life_walk', type:'mundane', rarity:'common', tags:['mood'], weight:3, cooldown:5,
    run:()=>{ applyEffects({sanity:[3,7]}); return {title:'Una buena caminata', text:'Salís a caminar sin rumbo fijo y volvés con la cabeza mucho más despejada.'}; }},
  {id:'life_insomnia', type:'mundane', rarity:'common', tags:['mood'], weight:2, cooldown:6,
    run:()=>{ applyEffects({sanity:[-10,-4]}); return {title:'Noche de insomnio', text:'Pasás la noche dando vueltas en la cama sin poder apagar la cabeza.'}; }},
  {id:'life_misunderstanding', type:'social', rarity:'common', tags:['reputation'], weight:2, cooldown:8,
    run:()=>{ applyEffects({reputation:[-6,-2]}); return {title:'Malentendido', text:'Un comentario tuyo se malinterpreta y corre de boca en boca antes de que puedas aclararlo.'}; }},
  {id:'life_lucky_find', type:'mundane', rarity:'uncommon', tags:['money','luck'], weight:2, cooldown:12,
    run:()=>{ const found = rndInt(10,60); applyEffects({cash:found}); return {title:'Un hallazgo afortunado', text:`Encontrás ${fmtMoney(found)} en el bolsillo de un abrigo que no usabas hacía tiempo.`}; }},
  {id:'life_broken', type:'mundane', rarity:'common', tags:['money'], requirements:{ageMin:18}, weight:2, cooldown:10,
    run:()=>{ applyEffects({cash:-Math.round(rndInt(40,150)*priceIndex())}); return {title:'Algo se rompe', text:'Algo importante de la casa deja de funcionar justo cuando menos podés afrontarlo.'}; }},
  {id:'life_lazy', type:'mundane', rarity:'common', tags:['mood'], weight:2, cooldown:6,
    run:()=>{ applyEffects({sanity:[2,5], cash:-rndInt(10,40)}); return {title:'Una tarde de nada', text:'Te das el gusto de no hacer absolutamente nada productivo. Vale cada peso.'}; }},
  {id:'life_neighbor_coffee', type:'social', rarity:'common', tags:['neighbor'], weight:2, cooldown:8,
    context:(ctx)=>{ const n = npcById('vecina'); if(!n || !n.alive || n.lifeState!=='presente') return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ if(!ctx.npc.met) meetNpc(ctx.npc); adjustRel(ctx.npc, {trust:4, affection:3}); return {title:'Café con ' + ctx.npc.name, text:'Se cruzan en el pasillo y terminan charlando un buen rato apoyados en la puerta.'}; }},
  {id:'life_sibling_visit', type:'family', rarity:'common', tags:['family'], weight:2, cooldown:8,
    context:(ctx)=>{ const s = aliveNpcs().filter(n=>n.id.startsWith('hermano') && n.lifeState==='presente'); if(!s.length) return null; ctx.npc = pick(s); return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[3,7], affection:[2,5]}); return {title:'Visita de '+ctx.npc.name, text:'Se juntan a comer algo y terminan hablando hasta tarde, como si no hubiera pasado el tiempo.'}; }},
  {id:'life_father_call', type:'family', rarity:'common', tags:['family'], requirements:{ageMin:18}, weight:2, cooldown:8,
    context:(ctx)=>{ const n = npcById('padre'); if(!n || !n.alive) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[2,6], affection:[2,4]}); return {title:'Llamada de '+ctx.npc.name, text:'Te llama sin ningún motivo puntual, sólo para saber cómo estás.'}; }},
  {id:'life_mother_visit', type:'family', rarity:'common', tags:['family'], requirements:{ageMin:18}, weight:2, cooldown:8,
    context:(ctx)=>{ const n = npcById('madre'); if(!n || !n.alive) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[2,6], affection:[2,5]}); return {title:'Visita de '+ctx.npc.name, text:'Aparece sin avisar con comida de sobra "por si no estabas comiendo bien".'}; }},
  {id:'life_spouse_night', type:'family', rarity:'common', tags:['family','spouse'], weight:2, cooldown:6,
    context:(ctx)=>{ const n = spouseNpc(); if(!n) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[3,7], affection:[3,6]}); return {title:'Una noche tranquila con '+ctx.npc.name, text:'Nada especial — cenar juntos, hablar de cualquier cosa. Es de lo que más vas a extrañar después.'}; }},
  {id:'life_kid_time', type:'family', rarity:'common', tags:['family','children'], weight:2, cooldown:6,
    context:(ctx)=>{ const k = childrenNpcs().filter(n=>n.alive && n.lifeState==='presente'); if(!k.length) return null; ctx.npc = pick(k); return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[3,7], affection:[3,6]}); applyEffects({sanity:[2,5]}); return {title:'Tiempo con '+ctx.npc.name, text:'Se quedan hablando hasta tarde de nada en particular. Son los momentos que después se recuerdan.'}; }},
  {id:'life_hobby', type:'mundane', rarity:'common', tags:['mood'], weight:3, cooldown:6,
    run:()=>{ applyEffects({sanity:[1,4]}); return {title:'Un pasatiempo', text:'Retomás algo que hacía tiempo tenías abandonado — leer, cocinar, armar algo con las manos. Te hace bien.'}; }},
  {id:'life_help_stranger', type:'social', rarity:'common', tags:['kindness'], weight:2, cooldown:8,
    run:()=>{ applyEffects({reputation:[1,3], sanity:[1,3]}); return {title:'Ayudás a un desconocido', text:'Le das una mano a alguien con algo pequeño. No cambia el mundo, pero se siente bien.'}; }},
  {id:'life_checkup', type:'mundane', rarity:'common', tags:['health'], requirements:{ageMin:18}, weight:2, cooldown:12,
    run:()=>{ applyEffects({salud:[2,6], cash:-Math.round(8*priceIndex())}); return {title:'Un chequeo de rutina', text:'Vas al médico por las dudas. Todo bien — un alivio menor pero real.'}; }},
  {id:'life_scam', type:'mundane', rarity:'uncommon', tags:['money'], requirements:{ageMin:16}, weight:1, cooldown:24,
    run:()=>{ applyEffects({cash:-rndInt(80,250), sanity:[-6,-2]}); return {title:'Estafa menor', text:'Caés en una estafa pequeña — nada que arruine tu vida, pero te deja con bronca y algo más pobre.'}; }},

  // ---------------- adolescencia (13-17) ----------------
  {id:'teen_friends', type:'social', rarity:'common', tags:['teen'], requirements:{ageMin:13, ageMax:17}, weight:5, cooldown:5,
    run:()=>{ applyEffects({sanity:[2,6]}); return {title:'Amigos del secundario', text:'Pasás la tarde con tu grupo sin hacer nada en particular. Es de las cosas que más vas a extrañar de esta edad.'}; }},
  {id:'teen_heartbreak', type:'social', rarity:'common', tags:['teen','love'], requirements:{ageMin:13, ageMax:17}, weight:4, cooldown:18,
    run:()=>{ applyEffects({sanity:[-8,-3]}); remember('first_heartbreak', 'Tu primer desamor.', {cat:'loss'}); return {title:'Un primer desamor', text:'Algo que parecía importante termina antes de lo esperado. Duele más de lo que pensabas que podía doler.'}; }},
  {id:'teen_school_good', type:'mundane', rarity:'common', tags:['teen','school'], requirements:{ageMin:13, ageMax:17}, weight:3, cooldown:8,
    run:()=>{ applyEffects({reputation:[2,5]}); STATE.character.educationScore = (STATE.character.educationScore||0) + 3; return {title:'Buen desempeño escolar', text:'Un trabajo o examen te sale mejor de lo esperado. Te lo reconocen delante de los demás.'}; }},
  {id:'teen_gig', type:'work', rarity:'common', tags:['teen','money'], requirements:{ageMin:13, ageMax:17}, weight:3, cooldown:6,
    run:()=>{ applyEffects({cash:[15,50]}); return {title:'Changa de fin de semana', text:'Ayudás con alguna changa del barrio y te ganás unos pesos propios.'}; }},
  {id:'teen_classmate', type:'social', rarity:'common', tags:['teen','friend'], requirements:{ageMin:13, ageMax:17}, weight:4, cooldown:24,
    run:()=>{ const n = createNpc({relType:'friend', role:'Compañero/a de clase', ageMin:STATE.character.edad, ageMax:STATE.character.edad+1, tier:'comun'});
      n.role = ng(n,'Compañero de clase','Compañera de clase'); meetNpc(n); adjustRel(n, {trust:12, affection:14});
      return {title:'Alguien nuevo en la clase', text:`${n.name} se sienta a tu lado el primer día y no se mueve más de ahí en todo el año.`}; }},
  {id:'teen_leave_school', type:'decision', rarity:'uncommon', tags:['teen','school','money'], requirements:{ageMin:13, ageMax:15}, weight:6, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.character.clase==='Baja' && STATE.character.educacion==='Secundaria (en curso)',
    title:'La plata no alcanza', text:'En tu casa la plata no alcanza. Tu familia no te lo pide de frente, pero lo dice todo con silencios: podrías dejar la escuela y empezar a trabajar.',
    choices:[
      {label:'Dejar la escuela y trabajar', small:'Tu familia lo necesita.', run:()=>{
        STATE.character.educacion = 'Primaria completa'; setJob('Obrero'); familyWarmth(6);
        remember('left_school', 'Dejaste la escuela para ayudar en tu casa.', {cat:'choice'});
        return 'A los pocos días ya estás en un taller. Llegás a casa con las manos negras y un sobre con plata. Nadie dice nada, pero te sirven primero.'; }},
      {label:'Seguir estudiando, cueste lo que cueste', small:'El futuro también es tu familia.', run:()=>{
        applyEffects({sanity:[-4,-1]}); STATE.character.educationScore = (STATE.character.educationScore||0) + 4;
        remember('kept_studying', 'Seguiste estudiando aunque en tu casa no alcanzaba.', {cat:'choice'});
        return 'Seguís. Comés menos, estudiás de noche y aprendés a no pedir nada.'; }}
    ]},
  {id:'young_university', type:'decision', rarity:'common', tags:['school','future'], requirements:{ageMin:18, ageMax:19}, weight:10, cooldown:999, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>STATE.character.educacion==='Secundaria completa',
    title:'¿Y ahora?', text:'Terminaste la secundaria. Algunos compañeros van a la universidad, otros ya trabajan. En tu casa esperan una respuesta.',
    choices:[
      {label:'Inscribirte en la universidad', small:'Cuatro años, dinero y tiempo. Puertas que otros no tienen.', run:()=>{
        startUniversity(); return 'Te inscribís. El primer día te perdés en los pasillos. El segundo, ya no.'; }},
      {label:'Buscar trabajo ya', small:'Plata ahora.', run:()=>{
        const j = bestAvailableJob(); setJob(j); return `Conseguís algo como ${j}. No es lo que soñabas, pero es tuyo.`; }},
      {label:'Aprender por tu cuenta', small:'Bibliotecas, libros usados, noches largas.', run:()=>{
        STATE.character.educacion = 'Autodidacta'; STATE.character.educationScore = (STATE.character.educationScore||0) + 6;
        remember('self_taught', 'Elegiste aprender por tu cuenta.', {cat:'choice'});
        return 'Nadie te va a dar un diploma. Tampoco nadie te va a decir qué leer.'; }}
    ]},

  // ---------------- juventud (18-29) ----------------
  {id:'young_roommates', type:'mundane', rarity:'common', tags:['home'], requirements:{ageMin:18, ageMax:29}, weight:4, cooldown:10,
    run:()=>{ applyEffects({sanity:[-7,-3]}); return {title:'Convivencia complicada', text:'Compartir vivienda con otras personas trae sus roces — cuentas, ruido, horarios que no coinciden.'}; }},
  {id:'young_night_out', type:'social', rarity:'common', tags:['fun'], requirements:{ageMin:18, ageMax:29}, weight:4, cooldown:5,
    run:()=>{ applyEffects({sanity:[3,7], cash:-rndInt(5,25)}); return {title:'Una salida nocturna', text:'Salís con gente de tu edad hasta cualquier hora. Al otro día lo pagás, pero valió la pena.'}; }},
  {id:'young_uncertainty', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:18, ageMax:29}, weight:3, cooldown:10,
    run:()=>{ applyEffects({sanity:[-6,-2]}); return {title:'Incertidumbre', text:'No tenés muy claro hacia dónde va tu vida. La sensación te persigue más de lo que admitís.'}; }},
  {id:'young_moving', type:'mundane', rarity:'common', tags:['home','money'], requirements:{ageMin:18, ageMax:29, noHouse:true}, weight:2, cooldown:18,
    run:()=>{ applyEffects({cash:-rndInt(30,90)}); return {title:'Mudanza', text:'Cambiás de vivienda otra vez. El proceso siempre termina costando más de lo presupuestado.'}; }},

  // ---------------- adultez (30-49) ----------------
  {id:'adult_routine', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:30, ageMax:49}, weight:3, cooldown:10,
    run:()=>{ applyEffects({sanity:[-7,-3]}); return {title:'Rutina que pesa', text:'La vida se vuelve una sucesión de obligaciones parecidas entre sí. Extrañás algo que no sabrías nombrar.'}; }},
  {id:'adult_advice', type:'social', rarity:'common', tags:['reputation'], requirements:{ageMin:30, ageMax:49}, weight:3, cooldown:10,
    run:()=>{ applyEffects({reputation:[2,5]}); return {title:'Te buscan para un consejo', text:'Alguien más joven te pide una mano con algo que a vos ya te costó aprender.'}; }},
  {id:'adult_repairs', type:'mundane', rarity:'common', tags:['home','money'], requirements:{ageMin:30, ageMax:49}, weight:2, cooldown:12,
    run:()=>{ applyEffects({cash:-Math.round(rndInt(100,300)*priceIndex())}); return {title:'Mantenimiento del hogar', text:'Algo en la vivienda necesita arreglo. Nunca es barato, nunca es opcional.'}; }},
  {id:'adult_balance', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:30, ageMax:49}, weight:2, cooldown:12,
    run:()=>{ applyEffects({sanity:[3,6]}); return {title:'Balance positivo', text:'Te tomás un momento para mirar atrás. No es la vida que imaginabas de más chico, pero no está mal.'}; }},

  // ---------------- madurez (50-64) ----------------
  {id:'mature_body', type:'mundane', rarity:'common', tags:['health'], requirements:{ageMin:50, ageMax:64}, weight:4, cooldown:8,
    run:()=>{ applyEffects({salud:[-10,-4]}); return {title:'El cuerpo avisa', text:'Empezás a sentir cosas que antes ni registrabas. Nada urgente, pero es un aviso.'}; }},
  {id:'mature_retirement', type:'mundane', rarity:'common', tags:['work','mood'], requirements:{ageMin:50, ageMax:64}, weight:3, cooldown:12,
    run:()=>{ applyEffects({sanity:[-6,-2]}); return {title:'Pensás en el retiro', text:'Empezás a hacer cuentas de cuánto falta para dejar de trabajar. El número nunca termina de convencerte.'}; }},
  {id:'mature_experience', type:'social', rarity:'common', tags:['reputation'], requirements:{ageMin:50, ageMax:64}, weight:2, cooldown:12,
    run:()=>{ applyEffects({reputation:[2,6], sanity:[1,4]}); return {title:'Años de experiencia', text:'Tu trayectoria empieza a pesar más que tu edad. Se nota en cómo te tratan.'}; }},

  // ---------------- vejez (65+) ----------------
  {id:'old_what_matters', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:65}, weight:4, cooldown:8,
    run:()=>{ applyEffects({sanity:[2,6]}); return {title:'Tiempo para lo que importa', text:'Ya no corrés detrás de tantas cosas. Hay algo tranquilo en eso.'}; }},
  {id:'old_memories', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:65}, weight:3, cooldown:8,
    run:()=>{ applyEffects({sanity:[-6,-2]}); const lost = memoriesByCat('loss'); return {title:'Recuerdos que pesan', text:`Pensás en gente que ya no está y en años que no vuelven.${lost.length ? ' Sobre todo en '+lost[lost.length-1].text.toLowerCase().replace(/\.$/,'')+'.' : ''} La nostalgia no siempre es amable.`}; }},
  {id:'old_slow', type:'mundane', rarity:'common', tags:['mood'], requirements:{ageMin:65}, weight:2, cooldown:8,
    run:()=>{ applyEffects({sanity:[3,7]}); return {title:'Una tarde sin apuro', text:'Nadie espera nada de vos hoy. Aprovechás el día a tu propio ritmo.'}; }},

  // ---------------- nuevos: vida con decisiones y conexiones ----------------
  {id:'life_newspaper', type:'world', rarity:'common', tags:['news','rumor'], requirements:{ageMin:14}, weight:4, cooldown:5,
    run:()=>{ const head = STATE.world.log[0];
      if(chance(0.3 + STATE.flags.mysticExposure/200)) { const r = addRumor(); if(r) return {title:'El diario de la mañana', text:`Entre las noticias de siempre, una nota breve que nadie más parece notar: "${r.text}"`}; }
      return {title:'El diario de la mañana', text: head ? `Leés el diario con el café. En la tapa: ${head.text.charAt(0).toLowerCase()+head.text.slice(1)}` : 'Leés el diario con el café. Nada que te cambie el día.'}; }},
  {id:'life_tavern', type:'social', rarity:'common', tags:['rumor'], requirements:{ageMin:16}, weight:4, cooldown:5,
    run:()=>{ applyEffects({cash:-rndInt(2,8), sanity:[0,2]});
      if(chance(0.35 + STATE.flags.mysticExposure/150)){ const r = addRumor(); if(r) return {title:'En la taberna', text:`Entre cerveza y cerveza, alguien baja la voz: "${r.text}". Todos se ríen. Vos no.`}; }
      return {title:'En la taberna', text:'Una noche de cerveza barata y conversaciones que no llevan a ningún lado. A veces eso es exactamente lo que hace falta.'}; }},
  {id:'life_meet_someone', type:'social', rarity:'common', tags:['social'], requirements:{ageMin:16}, weight:3, cooldown:10,
    hiddenRequirements:()=>aliveNpcs().filter(n=>n.lifeState==='presente').length < 22,
    run:()=>{ const n = createNpc({relType:'acquaintance', role:'Conocido/a', ageMin:Math.max(16,STATE.character.edad-12), ageMax:STATE.character.edad+15, tier:'comun'});
      n.role = ng(n,'Conocido','Conocida'); meetNpc(n); adjustRel(n, {trust:8, affection:6});
      const hook = n.profession ? ` Trabaja como ${n.profession.toLowerCase()}.` : '';
      return {title:'Alguien nuevo', text:`Conocés a ${n.name} de casualidad.${hook} Charlan más de lo que ninguno de los dos esperaba.`}; }},
  {id:'life_serious_illness', type:'decision', rarity:'rare', tags:['health'], requirements:{ageMin:20}, weight:3, cooldown:120, narrativeImportance:3,
    title:'Una enfermedad seria', text:'Una fiebre que no baja, una tos que no se va. El médico usa palabras largas y no te mira a los ojos.',
    choices:[
      {label:'Pagar el mejor tratamiento que puedas', small:'Cuesta, pero es tu vida.', run:()=>{
        const cost = Math.round(rndInt(200,500)*priceIndex()); applyEffects({cash:-cost, salud:[-10,-4]});
        return `Pagás ${fmtMoney(cost)}. Tres semanas en cama. Salís flaco, pero salís.`; }},
      {label:'Aguantar con remedios caseros', small:'La plata no alcanza.', run:()=>{
        applyEffects({salud:[-30,-15], sanity:[-6,-2]}); if(chance(0.3)) addCondition('tos_cronica');
        return 'Te recuperás, más o menos. El cuerpo no se olvida.'; }},
      {label:'Rezar en la iglesia', small:'La fe también cura, dicen.', requires:()=>STATE.factions.church.known, run:()=>{
        factionAdjust('church', {publicRep:3}); applyEffects({salud:[-22,-8], sanity:[2,6]});
        if(chance(0.1)) { applyEffects({salud:[10,20], exposure:2}); return 'Una noche soñás con una mujer vestida de noche que te toca la frente. A la mañana siguiente, la fiebre bajó. El médico no lo entiende.'; }
        return 'Rezás. La fiebre tarda en irse, pero te sentís menos solo.'; }},
      {label:'Pedirle un remedio a alguien que "sabe"', small:'La herborista, la médium, esa gente.', requires:()=>knownMysticNpcs().length>0, run:()=>{
        const n = pick(knownMysticNpcs()); applyEffects({salud:[-4,4], exposure:2}); adjustRel(n, {trust:4, dependence:4});
        remember('healed_by', `${n.name} te curó cuando los médicos no podían.`, {cat:'favor_received', npc:n.id});
        return `${n.name} te trae algo que huele a tierra y a hierro. A los dos días estás de pie. No preguntás qué era.`; }}
    ]},
  {id:'life_robbery', type:'decision', rarity:'uncommon', tags:['crime','danger'], requirements:{ageMin:16}, weight:3, cooldown:24, narrativeImportance:3,
    hiddenRequirements:()=>currentCityState().security < 60,
    title:'Un robo', text:'Volvés a tu casa y la puerta está abierta. Adentro, alguien revuelve tus cosas. Todavía no te vio.',
    choices:[
      {label:'Enfrentarlo', small:'Es tu casa.', run:()=>{ startCombat(pickEncounter('mundane'), {env:'home'}); return 'Das un paso adentro.'; }},
      {label:'Salir sin hacer ruido y llamar a la policía', small:'Que se encarguen ellos.', run:()=>{
        const lost = Math.min(STATE.character.cash, Math.round(rndInt(30,150)*priceIndex())); applyEffects({cash:-lost, sanity:[-4,-1]});
        return `Cuando llega la policía, el ladrón ya no está. Tampoco ${fmtMoney(lost)}.`; }},
      {label:'Quedarte mirando quién es', small:'Observar primero.', run:()=>{
        const lost = Math.min(STATE.character.cash, Math.round(rndInt(20,80)*priceIndex())); applyEffects({cash:-lost});
        remember('saw_thief', 'Viste la cara del que te robó.', {cat:'person'});
        return `Lo ves bien: es un pibe flaco, del barrio. Se lleva ${fmtMoney(lost)}. Vos te llevás su cara.`; }}
    ]},
  {id:'life_inheritance', type:'mundane', rarity:'rare', tags:['money','luck'], requirements:{ageMin:18}, weight:2, cooldown:999, repeatable:false, narrativeImportance:2,
    run:()=>{ const v = Math.round(rndInt(300,1800)*priceIndex()); applyEffects({cash:v});
      let extra = '';
      if(chance(0.25)){ const k = randomArtifactKey(); addArtifact(k, 'la herencia de un pariente lejano'); extra = ' Entre sus cosas hay una caja que nadie quiso: adentro, '+ARTIFACTS[k].foundText; }
      return {title:'Una herencia inesperada', text:`Un pariente lejano, al que viste dos veces en tu vida, te deja ${fmtMoney(v)} en su testamento.${extra}`}; }},
  {id:'life_old_friend_back', type:'social', rarity:'uncommon', tags:['friend'], requirements:{ageMin:20}, weight:3, cooldown:24,
    context:(ctx)=>{ const far = aliveNpcs().filter(n=>n.lifeState==='lejos' && n.met); if(!far.length) return null; ctx.npc = pick(far); return ctx; },
    run:(ctx)=>{ ctx.npc.lifeState = 'presente'; adjustRel(ctx.npc, {affection:[4,9], trust:[2,5]});
      return {title:ctx.npc.name+' vuelve', text:`${ctx.npc.name} vuelve a la ciudad sin avisar. Te encuentra en la calle como si se hubieran visto ayer. Algo cambió en su mirada; no sabés qué.`}; }},
  {id:'life_job_offer_npc', type:'decision', rarity:'uncommon', tags:['work','social'], requirements:{ageMin:18, ageMax:60}, weight:3, cooldown:36, narrativeImportance:3,
    context:(ctx)=>{ const n = aliveNpcs().filter(x=>x.met && x.lifeState==='presente' && x.trust>=45 && x.tierJob && JOBS[x.tierJob] && jobEligible(x.tierJob) && x.tierJob!==STATE.character.profesion); if(!n.length) return null; ctx.npc = pick(n); ctx.job = ctx.npc.tierJob; return ctx; },
    title:(ctx)=>'Una oferta de '+ctx.npc.name, text:(ctx)=>`${ctx.npc.name} te ofrece un puesto donde trabaja: ${ctx.job}. "Te recomendé yo. No me hagas quedar mal."`,
    choices:[
      {label:'Aceptar', small:'Cambio de vida.', run:(ctx)=>{ setJob(ctx.job); adjustRel(ctx.npc, {loyalty:5, dependence:3}); remember('job_from', `${ctx.npc.name} te consiguió trabajo.`, {cat:'favor_received', npc:ctx.npc.id}); return 'Empezás el lunes.'; }},
      {label:'Agradecer y rechazar', small:'Estás bien donde estás.', run:(ctx)=>{ adjustRel(ctx.npc, {respect:2}); return 'No insiste. Te agradece que se lo digas de frente.'; }}
    ]}
];
