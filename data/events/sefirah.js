'use strict';
/* =========================================================================
   data/events/sefirah.js — el Castillo de Sefirah (ver systems/sefirah.js).
   Todos son chainOnly: los dispara sefirahTick, sólo para quien nació
   atado al palacio sobre la niebla gris.
   ========================================================================= */
const EVENTS_SEFIRAH = [
  /* ---------------- infancia: sueños grises ---------------- */
  {id:'sef_child_dream', type:'mystic', rarity:'rare', tags:['sefirah','childhood'], chainOnly:true, repeatable:false, narrativeImportance:2,
    run:()=>{ STATE.sefirah.stage = Math.max(STATE.sefirah.stage, 1); applyEffects({spirituality:[2,4], exposure:2});
      return {title:'Un sueño gris', text:'Soñás con una niebla gris, infinita, y con un palacio que flota encima. Caminás por salones vacíos, enormes, y no tenés miedo: es como estar en casa. A la mañana se lo contás a tu familia. Se ríen. Vos no.'}; }},
  {id:'sef_child_knock', type:'mystic', rarity:'rare', tags:['sefirah','childhood'], chainOnly:true, repeatable:false,
    title:'Alguien golpea', text:'En el sueño gris de siempre, esta vez hay un ruido: alguien, muy lejos, golpea la niebla desde afuera, como quien golpea una puerta. Espera que le abras.',
    choices:[
      {label:'Abrir', small:'Tenés curiosidad.', run:()=>{ applyEffects({sanity:[-6,-2], spirituality:[2,4]}); addHiddenTruth('Aquel golpe en la niebla, cuando eras chico, no era un sueño: algo de afuera quería entrar al palacio.', {key:'sefirah_knock'}); return 'Abrís apenas. Del otro lado no hay nadie, pero algo te mira con una atención que no es humana. Te despertás gritando. Durante semanas dormís con la luz prendida.'; }},
      {label:'No abrir', small:'Algo te dice que no.', run:()=>{ applyEffects({fate:3}); return 'No abrís. El golpe sigue un rato y después se cansa. Te despertás con la sensación rara de haber hecho algo importante.'; }}
    ]},
  {id:'sef_child_luck', type:'mystic', rarity:'rare', tags:['sefirah','childhood'], chainOnly:true, repeatable:false,
    run:()=>{ applyEffects({luckBuff:12, salud:[0,3]});
      return {title:'Una suerte rara', text:'Un carruaje desbocado pasa a un palmo tuyo. Una maceta cae justo donde estabas un segundo antes. Los adultos hablan de milagro. Vos, esa noche, soñás con la niebla gris y la sentís más cerca que nunca.'}; }},

  /* ---------------- el despertar ---------------- */
  {id:'sef_awakening', type:'mystic', rarity:'extraordinary', tags:['sefirah'], chainOnly:true, narrativeImportance:3,
    title:'Cuatro pasos', text:'Desde chico soñás con la niebla gris. Esta noche, despierto, sabés de golpe algo que nadie te enseñó: si das cuatro pasos en sentido contrario a las agujas del reloj y decís unas palabras en una lengua antigua, vas a llegar ahí. De verdad.',
    choices:[
      {label:'Dar los cuatro pasos', small:'Lo que te espera arriba es tuyo.', run:()=>sefirahAwaken()},
      {label:'Quedarte quieto', small:'Hay puertas que no se cierran.', run:()=>{ STATE.sefirah.refusedAt = STATE.time.totalMonths; applyEffects({sanity:[-3,0]}); return 'Te quedás quieto hasta que amanece. La certeza no se va: queda ahí, esperando, como un lugar al que vas a volver.'; }}
    ]},

  /* ---------------- despierto ---------------- */
  {id:'sef_found_club', type:'tarot', rarity:'extraordinary', tags:['sefirah','tarot'], chainOnly:true, narrativeImportance:3,
    title:'Dos estrellas carmesí', text:'Sentado en la cabecera, notás algo nuevo: en la niebla brillan estrellas carmesí, pequeñas, lejanas. Cada una es una persona que, sin saberlo, está conectada con este lugar. Si las tocás, podés traerlas a la mesa. Ellas no te verían la cara. Sólo la niebla y una figura en la cabecera.',
    choices:[
      {label:'Convocarlas como El Loco', small:'Una mesa sobre la niebla, y vos a la cabecera.', run:()=>sefirahFoundClub()},
      {label:'Todavía no', small:'Este lugar es tuyo solo.', run:()=>{ STATE.sefirah.clubDeclinedAt = STATE.time.totalMonths; return 'Dejás las estrellas donde están. Brillan un rato más, como esperando, y se apagan.'; }}
    ]},
  {id:'sef_prayer', type:'mystic', rarity:'uncommon', tags:['sefirah'], chainOnly:true,
    title:'Alguien reza hacia la niebla', text:()=>sefirahHost() ? 'Sobre la niebla gris resuena una plegaria. Es alguien de tu mesa, o alguien a quien le contaron de vos: pide ayuda al Loco, con las palabras justas, en voz muy baja.' : 'Soñás que en la niebla resuena una voz. Alguien, en algún lugar del mundo, reza a "lo que está sobre la niebla gris". No sabe a quién le habla. Vos sí.',
    choices:[
      {label:'Responder', small:'Un poco de tu fuerza para alguien que la necesita.', run:()=>{ const s = STATE.sefirah; s.prayers = (s.prayers||0) + 1; applyEffects({spirituality:[-5,-2], fate:1});
        if(sefirahHost()){ factionAdjust('tarotClub', {trust:[3,6]}); STATE.anchors.followerBonus = Math.min(6, (STATE.anchors.followerBonus||0) + (s.prayers % 3 === 0 ? 1 : 0)); }
        return 'Mandás, a través de la niebla, una imagen, una idea, un empujón de suerte. Semanas después te enterás, por caminos que nadie entendería, de que sirvió.'; }},
      {label:'Callar', small:'Nadie sabe que estás ahí.', run:()=>'La voz se apaga sola. Nadie sabrá nunca que alguien la escuchó.'}
    ]},
  {id:'sef_gaze', type:'mystic', rarity:'rare', tags:['sefirah','danger'], chainOnly:true, narrativeImportance:2,
    title:'Algo mira hacia adentro', text:'Estás en el palacio cuando la niebla se ondula como agua golpeada. Afuera, muy lejos, algo enorme intenta mirar hacia adentro. No es una persona. Es algo que fue un dios, o que quiere serlo.',
    choices:[
      {label:'Espesar la niebla', small:'Esconderte. Cuesta.', run:()=>{ applyEffects({spirituality:[-10,-5], sanity:[-4,-1]}); return 'Apretás la niebla con todo lo que tenés. Durante un segundo eterno, la mirada se queda quieta. Después se va. Volvés a tu cama agotado, pero nadie sabe dónde estás.'; }},
      {label:'Sostenerle la mirada', small:'Es tu casa.', run:()=>{
        if(chance(0.45 + fateSave()*3 + (sefirahHost() ? 0.1 : 0))){ applyEffects({fate:4, sanity:[-3,0]}); learnLore(pick(['sefirah_seal','sefirah_castle'].filter(id=>!knowsLore(id))) || 'sefirah_seal', 'la mirada detrás de la niebla'); return 'Te sentás en la cabecera y mirás hacia afuera. La niebla te obedece. Del otro lado algo retrocede, sorprendido. Por un instante entendés qué es realmente este palacio, y quién lo tuvo antes.'; }
        applyEffects({sanity:[-18,-10], salud:[-10,-4], corruption:[2,5]}); addCondition(pick(['voces','pesadillas'])); return 'La mirada te atraviesa. No dura nada, y dura años. Te despertás en el piso de tu cuarto, con sangre en la nariz y una voz nueva en el fondo de la cabeza.'; }}
    ]},
  {id:'sef_whispers', type:'mystic', rarity:'rare', tags:['sefirah','danger'], chainOnly:true, narrativeImportance:2,
    title:'La silla susurra', text:'Subiste tantas veces que la silla de la cabecera empezó a hablarte. No con palabras: con ganas. Ganas de quedarte arriba, de mirar el mundo desde lejos, de no volver.',
    choices:[
      {label:'Escucharla', small:'Tal vez sabe algo.', run:()=>{ applyEffects({corruption:[2,5], humanity:-3}); const id = pick(lorePool('forbidden').filter(x=>!knowsLore(x))); if(id) learnLore(id, 'la silla de la cabecera'); return id ? `La silla te enseña algo: "${LORE[id].title}". Cuando bajás, tardás en recordar cómo se llama tu calle.` : 'La silla te enseña cosas que no tienen nombre. Cuando bajás, tardás en recordar cómo se llama tu calle.'; }},
      {label:'Bajar y no subir por un tiempo', small:'Todavía sos una persona.', run:()=>{ STATE.seasonActions.castle = 99; applyEffects({sanity:[-3,0], humanity:2}); return 'Te levantás de la silla y bajás. Esa temporada no volvés a subir. Pasás las tardes con gente, con ruido, con cosas chicas. Te hace bien.'; }}
    ]}
];
