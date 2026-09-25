'use strict';
/* =========================================================================
   data/events/childhood.js — infancia (0-12 años).
   Esquema de evento (ver systems/events.js):
   {id, type, rarity, tags, requirements, hiddenRequirements, weight,
    cooldown, repeatable, narrativeImportance, context, title, text,
    consequences | run, choices, delayedConsequences, cat}
   Los eventos originales de infancia se conservan con su texto; ahora
   tienen id, rareza y enfriamiento (para no repetirse) y tocan las
   relaciones de forma multidimensional. Algunos nuevos siembran cosas que
   recién se entienden décadas después (§52).
   ========================================================================= */
const EVENTS_CHILDHOOD = [
  {id:'child_first_steps', type:'childhood', rarity:'common', tags:['family'], requirements:{ageMax:2}, weight:6, cooldown:24, repeatable:false,
    context:(ctx)=>{ ctx.npc = npcById(pick(['padre','madre'])); return ctx.npc && ctx.npc.alive ? ctx : null; },
    run:(ctx)=>{ applyEffects({salud:[1,3]}); adjustRel(ctx.npc, {trust:4, affection:4});
      return {title:'Primeros pasos', text:`Das tus primeros pasos torpes por la casa. ${ctx.npc.name} te mira con una mezcla de orgullo y terror.`}; }},
  {id:'child_sleepless_nights', type:'childhood', rarity:'common', tags:['health'], requirements:{ageMax:2}, weight:4, cooldown:8,
    run:()=>{ applyEffects({salud:[-4,-1]}); return {title:'Noches sin dormir', text:'Llorás gran parte de la noche sin motivo claro. Toda la casa amanece agotada.'}; }},
  {id:'child_first_words', type:'childhood', rarity:'common', tags:['family'], requirements:{ageMax:4}, weight:5, cooldown:24, repeatable:false,
    run:()=>{ applyEffects({sanity:[1,4]}); familyWarmth(2); return {title:'Primeras palabras', text:'Empezás a formar frases enteras. Toda la familia repite, encantada, cada palabra nueva que decís.'}; }},
  {id:'child_playground', type:'childhood', rarity:'common', tags:['play'], requirements:{ageMin:3, ageMax:7}, weight:6, cooldown:6,
    run:()=>{ applyEffects({sanity:[2,5]}); return {title:'Juegos de patio', text:'Pasás la tarde inventando juegos con lo primero que encontrás a mano. El tiempo vuela.'}; }},
  {id:'child_dark_fear', type:'childhood', rarity:'common', tags:['fear'], requirements:{ageMin:3, ageMax:8}, weight:4, cooldown:12,
    run:()=>{ applyEffects({sanity:[-4,-1]});
      // Para un chico con espiritualidad alta, a veces el miedo no es infundado.
      if(STATE.character.spirituality >= 12 && chance(0.25)) addHiddenTruth('Lo que esperaba debajo de tu cama cuando eras chico no era imaginación. Se fue solo, porque todavía no le interesabas.');
      return {title:'Miedo a la oscuridad', text:'Estás convencido de que algo espera bajo la cama apenas se apaga la luz. Nadie logra convencerte de lo contrario.'}; }},
  {id:'child_imaginary_friend', type:'childhood', rarity:'common', tags:['play'], requirements:{ageMin:4, ageMax:9}, weight:3, cooldown:36, repeatable:false,
    run:()=>{ applyEffects({sanity:[1,3]}); return {title:'Un amigo imaginario', text:'Tenés a alguien con quien hablar cuando no hay nadie más cerca. Nadie más puede verlo, pero para vos es tan real como cualquier otra cosa.'}; }},
  {id:'child_good_grades', type:'childhood', rarity:'common', tags:['school'], requirements:{ageMin:6}, weight:6, cooldown:10,
    run:()=>{ applyEffects({reputation:1, sanity:[1,4]}); STATE.character.educationScore = (STATE.character.educationScore||0) + 2;
      return {title:'Buenas notas', text:'La maestra te felicita frente a toda la clase. Llegás a casa con ganas de contarlo.'}; }},
  {id:'child_recess_fight', type:'childhood', rarity:'common', tags:['school','conflict'], requirements:{ageMin:6}, weight:4, cooldown:10,
    run:()=>{ applyEffects({salud:[-6,-2], sanity:[-4,-1]}); return {title:'Pelea en el recreo', text:'Una discusión con otro chico termina a los empujones. Volvés a casa con la ropa sucia y el orgullo herido.'}; }},
  {id:'child_new_book', type:'childhood', rarity:'common', tags:['school'], requirements:{ageMin:6}, weight:5, cooldown:8,
    run:()=>{ applyEffects({sanity:[2,5]}); STATE.character.educationScore = (STATE.character.educationScore||0) + 1;
      return {title:'Un libro nuevo', text:'Encontrás una historia que te atrapa por completo y la releés varias veces seguidas.'}; }},
  {id:'child_birthday', type:'childhood', rarity:'common', tags:['family'], weight:5, cooldown:12,
    run:()=>{ applyEffects({cash:[5,25], sanity:[1,3]}); return {title:'Cumpleaños', text:'Es tu cumpleaños. Hay una torta modesta y algún regalo que guardás como un tesoro.'}; }},
  {id:'child_bike_fall', type:'childhood', rarity:'common', tags:['health'], requirements:{ageMin:6, ageMax:12}, weight:4, cooldown:12,
    run:()=>{ applyEffects({salud:[-5,-1]}); return {title:'Caída de la bicicleta', text:'Te raspás bien las rodillas probando algo más allá de tus habilidades. Sobrevivís, con cicatriz nueva incluida.'}; }},
  {id:'child_sibling_afternoon', type:'childhood', rarity:'common', tags:['family'], weight:4, cooldown:6,
    context:(ctx)=>{ const s = aliveNpcs().filter(n=>n.id.startsWith('hermano')); if(!s.length) return null; ctx.npc = pick(s); return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[3,8], affection:[2,6]}); return {title:'Tarde con '+ctx.npc.name, text:'Pasan la tarde juntos, entre juegos y alguna pelea sin importancia. Se llevan un poco mejor que antes.'}; }},
  {id:'child_parent_talk', type:'childhood', rarity:'common', tags:['family'], weight:5, cooldown:6,
    context:(ctx)=>{ ctx.npc = npcById(pick(['padre','madre'])); return ctx.npc && ctx.npc.alive ? ctx : null; },
    run:(ctx)=>{ adjustRel(ctx.npc, {trust:[2,6], affection:[2,5]}); return {title:'Charla con '+ctx.npc.name, text:'Se sientan un rato a hablar de nada en particular. Es de esos momentos simples que después se recuerdan.'}; }},
  {id:'child_seasonal_cold', type:'childhood', rarity:'common', tags:['health'], weight:5, cooldown:6,
    run:()=>{ applyEffects({salud:[-7,-2]}); return {title:'Resfrío de temporada', text:'Pasás unos días en cama, abrigado y con té caliente, hasta que se te pasa.'}; }},
  {id:'child_strange_dream', type:'childhood', rarity:'uncommon', tags:['mystic','dream'], requirements:{ageMin:5}, weight:2, cooldown:24,
    run:()=>{ applyEffects({sanity: chance(0.5) ? [1,3] : [-3,-1]});
      if(STATE.character.spirituality >= 10 && chance(0.3)) applyEffects({clue:{pathway:'$random', reliability:'mixed', strength:[1,2], source:'un sueño de la infancia', silent:true}});
      return {title:'Un sueño extraño', text:'Tenés un sueño que no se parece a los demás — demasiado nítido, demasiado ordenado para ser sólo un sueño. Por la mañana ya casi no lo recordás.'}; }},
  {id:'child_chickenpox', type:'childhood', rarity:'common', tags:['health'], requirements:{ageMin:2, ageMax:6}, weight:4, cooldown:48, repeatable:false,
    run:()=>{ applyEffects({salud:[-6,-2]}); return {title:'Varicela (u otra cosa parecida)', text:'Pasás unos días picoteado e incómodo, quejándote más de la cuenta.'}; }},
  {id:'child_imaginary_pet', type:'childhood', rarity:'common', tags:['play','mystic'], requirements:{ageMin:4, ageMax:10}, weight:4, cooldown:36, repeatable:false,
    run:()=>{ applyEffects({sanity:[2,5]});
      if(STATE.character.spirituality >= 11 && chance(0.35)){ addHiddenTruth('Lo que te seguía por la casa de chico, y nadie más veía, era un espíritu menor. Te cuidaba, a su manera.'); applyEffects({exposure:1}); }
      return {title:'Una mascota imaginaria (o no)', text:'Insistís en que algo te sigue por la casa. Nadie más lo ve, pero para vos es completamente real.'}; }},
  {id:'child_school_project', type:'childhood', rarity:'common', tags:['school'], requirements:{ageMin:6, ageMax:12}, weight:4, cooldown:12,
    run:()=>{ applyEffects({reputation:1, sanity:[1,3]}); STATE.character.educationScore = (STATE.character.educationScore||0) + 2;
      return {title:'Un proyecto escolar', text:'Te esforzás de verdad en un trabajo de la escuela y el resultado te sale mejor de lo que esperabas.'}; }},
  {id:'child_left_out', type:'childhood', rarity:'common', tags:['school','social'], requirements:{ageMin:6, ageMax:12}, weight:3, cooldown:18,
    run:()=>{ applyEffects({sanity:[-6,-2]}); return {title:'Te dejan afuera', text:'Un grupo de chicos del barrio no te deja jugar con ellos. No entendés bien por qué, y eso lo hace peor.'}; }},
  {id:'child_costume', type:'childhood', rarity:'common', tags:['play'], requirements:{ageMin:3, ageMax:9}, weight:3, cooldown:24,
    run:()=>{ applyEffects({sanity:[2,5]}); return {title:'Disfraz casero', text:'Armás un disfraz con lo que encontrás por la casa y no te lo sacás en todo el día.'}; }},
  {id:'child_milk_tooth', type:'childhood', rarity:'common', tags:['health'], requirements:{ageMin:6, ageMax:12}, weight:3, cooldown:12,
    run:()=>{ applyEffects({salud:[-4,-1]}); return {title:'Diente de leche', text:'Se te cae un diente en el peor momento posible. Lo llevás como un trofeo el resto del día.'}; }},
  {id:'child_tooth_fairy', type:'childhood', rarity:'uncommon', tags:['family'], requirements:{ageMin:7, ageMax:12}, weight:2, cooldown:24,
    run:()=>{ applyEffects({cash:[5,15]}); return {title:'El ratón de los dientes (o el equivalente local)', text:'Encontrás una moneda bajo la almohada. Nunca sabés bien cómo llegó ahí, pero no preguntás demasiado.'}; }},
  {id:'child_first_camp', type:'childhood', rarity:'uncommon', tags:['school'], requirements:{ageMin:8, ageMax:12}, weight:2, cooldown:48, repeatable:false,
    run:()=>{ applyEffects({sanity:[2,4], reputation:1}); remember('first_camp', 'Tu primer campamento fuera de casa.', {cat:'place'});
      return {title:'Primer campamento', text:'Pasás unos días fuera de casa por primera vez, con la escuela o un grupo del barrio. Volvés distinto, un poco más grande.'}; }},
  {id:'child_lost_toy', type:'childhood', rarity:'common', tags:['loss'], requirements:{ageMin:4, ageMax:8}, weight:2, cooldown:24,
    run:()=>{ applyEffects({sanity:[-5,-2]}); return {title:'Se pierde algo importante', text:'Perdés un juguete o un objeto al que le tenías cariño. Para vos, en ese momento, es una tragedia real.'}; }},

  // --------------------------- nuevos ---------------------------
  {id:'child_meet_friend', type:'childhood', rarity:'common', tags:['social','friend'], requirements:{ageMin:4, ageMax:9}, weight:7, cooldown:999, repeatable:false,
    context:(ctx)=>{ const n = npcById('amigo'); if(!n || n.met) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ meetNpc(ctx.npc); adjustRel(ctx.npc, {trust:10, affection:12});
      remember('met_friend', `Conociste a ${ctx.npc.name}, que iba a ser tu amigo de la infancia.`, {cat:'person', npc:ctx.npc.id});
      return {title:'Un amigo', text:`En la plaza del barrio conocés a ${ctx.npc.name}. Se pelean por una pelota y a la media hora ya son inseparables.`}; }},
  {id:'child_neighbor', type:'childhood', rarity:'common', tags:['social'], requirements:{ageMin:3, ageMax:11}, weight:4, cooldown:999, repeatable:false,
    context:(ctx)=>{ const n = npcById('vecina'); if(!n || n.met) return null; ctx.npc = n; return ctx; },
    run:(ctx)=>{ meetNpc(ctx.npc); adjustRel(ctx.npc, {trust:6, affection:6});
      return {title:'La vecina', text:`${ctx.npc.name}, la vecina de al lado, te regala caramelos cada vez que pasás. Tu familia dice que es buena gente. Vos notás que cierra las cortinas todas las noches a la misma hora exacta.`}; }},
  {id:'child_teacher', type:'childhood', rarity:'common', tags:['school','social'], requirements:{ageMin:6, ageMax:11}, weight:4, cooldown:999, repeatable:false,
    run:()=>{ const t = createNpc({relType:'acquaintance', role:ng({gender:'f'},'Maestro','Maestra'), ageMin:28, ageMax:50, profession:'Maestro', tier:'comun', gender:chance(0.5)?'m':'f'});
      t.role = ng(t,'Maestro','Maestra'); meetNpc(t); adjustRel(t, {respect:10, trust:8});
      return {title:'Una maestra que se acuerda de vos', text:`${t.name} es la primera persona fuera de tu familia que te dice que sos inteligente. Te lo creés un poco.`}; }},
  {id:'child_parents_argue', type:'childhood', rarity:'uncommon', tags:['family','conflict'], requirements:{ageMin:5}, weight:3, cooldown:24,
    context:(ctx)=>{ const p = npcById('padre'), m = npcById('madre'); if(!p||!m||!p.alive||!m.alive) return null; ctx.p=p; ctx.m=m; return ctx; },
    run:(ctx)=>{ applyEffects({sanity:[-5,-2]}); adjustRel(ctx.p, {affection:-2}); adjustRel(ctx.m, {affection:-2});
      remember('parents_fight', 'Escuchaste a tus padres pelear de noche, a los gritos.', {cat:'trauma'});
      return {title:'Gritos de noche', text:`Te despertás con los gritos de ${ctx.p.name} y ${ctx.m.name}. Al otro día todos hacen como que no pasó nada. Vos no te olvidás.`}; }},
  {id:'child_grandmother', type:'childhood', rarity:'uncommon', tags:['loss','family'], requirements:{ageMin:5}, weight:2, cooldown:999, repeatable:false,
    run:()=>{ applyEffects({sanity:[-6,-3]}); remember('grandmother_died', 'Tu abuela murió cuando eras chico.', {cat:'loss'});
      return {title:'La abuela', text:'Tu abuela muere en invierno. Es la primera vez que ves a un adulto de tu familia llorar. Te dejan un pañuelo bordado que guardás durante años.'}; }},
  {id:'child_church', type:'childhood', rarity:'common', tags:['faith'], requirements:{ageMin:5}, weight:3, cooldown:24,
    run:()=>{ const n = npcById('sacerdote'); if(n && !n.met) meetNpc(n);
      factionAdjust('church', {publicRep:1});
      if(n) adjustRel(n, {trust:3});
      return {title:'Misa de domingo', text:`Tu familia te lleva a misa. ${n ? n.name + ' habla' : 'El sacerdote habla'} de una Diosa que vela de noche por los que duermen. Te quedás mirando las velas negras.`}; }},
  {id:'child_night_figure', type:'childhood', rarity:'rare', tags:['mystic'], requirements:{ageMin:7}, weight:3, cooldown:999, repeatable:false,
    hiddenRequirements:()=>STATE.character.spirituality >= 9,
    run:()=>{ applyEffects({sanity:[-6,-2], exposure:3});
      remember('child_saw_nighthawk', 'De chico viste a un hombre de negro pelear contra una sombra en un callejón.', {cat:'secret'});
      addHiddenTruth('El hombre de negro que viste pelear contra una sombra cuando eras chico era un Nighthawk. Esa noche murió alguien, pero no fue él.');
      return {title:'Algo en el callejón', text:'Volviendo de la escuela ves, al fondo de un callejón, a un hombre de abrigo negro pelear contra una sombra que se mueve sola. Cuando te ve, la sombra ya no está. Él te mira, se lleva un dedo a los labios y se va. Nunca se lo contás a nadie.'}; }},
  {id:'child_move', type:'childhood', rarity:'uncommon', tags:['family','home'], requirements:{ageMin:4}, weight:2, cooldown:120, repeatable:false,
    run:()=>{ applyEffects({sanity:[-3,1]}); return {title:'Mudanza familiar', text:'Tu familia se muda a otra casa del mismo barrio. Todo es más chico o más grande de lo que recordabas. Tardás meses en dejar de perderte.'}; }}
];
