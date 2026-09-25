'use strict';
/* =========================================================================
   data/exploration.js — lugares para explorar.
   Explorar cuesta tiempo libre (y a veces dinero) y es la vía principal para
   encontrar ingredientes, artefactos y peligros fuera de los eventos del
   mes. Cada lugar tiene su perfil: qué tan peligroso es, qué tan "místico",
   qué entorno de combate usa y qué vías "resuenan" ahí. Los lugares dependen
   de la ciudad (no hay muelles en una ciudad sin puerto).
   outcomes: pesos base de cada resultado posible (se ajustan por la vía,
   la suerte, la seguridad de la ciudad y la dificultad).
   ========================================================================= */
const EXPLORATION_LOCATIONS = [
  {id:'barrio', name:'Tu barrio, de noche', danger:'Baja', time:1, cost:0, ageMin:13, env:['street','alley','night'],
   desc:'Callejones que conocés de día y que de noche son otra cosa.',
   outcomes:{nothing:30, mundane:30, clue:12, ingredient:6, combat:6, mystic:10, npc:6}},
  {id:'docks', name:'Los muelles', danger:'Media', time:1, cost:0, ageMin:14, port:true, env:['docks','fog','night'], resonates:['tyrant','sun','moon'],
   desc:'Barcos que llegan de lugares que no figuran en los mapas, y marineros que cuentan cosas.',
   outcomes:{nothing:22, mundane:22, clue:14, ingredient:12, combat:10, mystic:12, npc:8}},
  {id:'underground', name:'Las alcantarillas y catacumbas', danger:'Media', time:1, cost:0, ageMin:15, cities:['backlund','tingen'], env:['sewer','cemetery','night'], resonates:['darkness','death','whiteTower'],
   desc:'Debajo de la ciudad hay otra ciudad. Algunos la usan. Algunos viven ahí.',
   outcomes:{nothing:16, mundane:10, clue:18, ingredient:14, combat:16, mystic:16, artifact:3, npc:7}},
  {id:'cemetery', name:'El cementerio viejo', danger:'Media', time:1, cost:0, ageMin:14, env:['cemetery','fog','night'], resonates:['death','darkness'],
   desc:'Lápidas sin nombre y un cuidador que nunca duerme.',
   outcomes:{nothing:22, mundane:8, clue:18, ingredient:12, combat:12, mystic:18, npc:6, artifact:2}},
  {id:'forest', name:'Los bosques de las afueras', danger:'Media', time:2, cost:20, ageMin:15, env:['forest','night','fog'], resonates:['moon','redPriest','twilightGiant'],
   desc:'Rastros de animales que no aparecen en ningún libro de zoología.',
   outcomes:{nothing:20, mundane:14, clue:12, ingredient:22, combat:14, mystic:12, npc:4}},
  {id:'travel', name:'Viaje a otra ciudad', danger:'Media', time:2, cost:150, ageMin:14, env:['street','docks','fog'],
   desc:'Otra ciudad, otras calles, otros secretos. Y un pasaje de vuelta.',
   outcomes:{nothing:18, mundane:24, clue:16, ingredient:14, combat:8, mystic:12, npc:8}},
  {id:'ruins', name:'Ruinas antiguas', danger:'Alta', time:2, cost:60, ageMin:16, env:['ruins','fog'], resonates:['hermit','whiteTower','fool','door'],
   req:()=>maxPathwayKnowledge() >= 30 || !!STATE.pathway.chosenPathway, reqText:'Tenés que saber qué buscar.',
   desc:'Piedra vieja, símbolos que no son de ninguna época conocida. Algunos todavía funcionan.',
   outcomes:{nothing:12, mundane:4, clue:20, ingredient:18, combat:18, mystic:14, artifact:8, lore:6}},
  {id:'forsaken', name:'Forsaken Land of the Gods', danger:'Extrema', time:3, cost:400, ageMin:16, env:['ruins','fog','night'], pool:'forsaken',
   req:()=>!!STATE.pathway.chosenPathway || STATE.flags.mysticExposure>=40, reqText:'Nadie llega ahí por casualidad.',
   desc:'Una tierra que los dioses abandonaron. Lo que quedó no los extraña.',
   outcomes:{nothing:6, clue:18, ingredient:26, combat:28, mystic:10, artifact:8, lore:8}}
];
const EXPLORATION_MUNDANE = [
  {w:5, run:()=>{ const g = Math.round(rndInt(20,70)*priceIndex()); applyEffects({cash:g}); return `Encontrás algo de valor tirado donde nadie mira: ${fmtMoney(g)}.`; }},
  {w:4, run:()=>{ applyEffects({salud:[-9,-3]}); return 'Un mal paso en la oscuridad. Volvés rengueando.'; }},
  {w:3, run:()=>{ applyEffects({reputation:[1,3]}); return 'Charlás con alguien interesante en el camino y dejás una buena impresión.'; }},
  {w:3, run:()=>{ applyEffects({sanity:[1,4]}); return 'No encontrás nada, pero la caminata te despeja la cabeza.'; }},
  {w:2, run:()=>{ addItem(pick(['doc_map','doc_diary_page','doc_symbol']), 1, 'encontrado explorando'); return 'Entre la basura hay un papel que alguien no quería que se encontrara.'; }},
  {w:2, run:()=>{ addItem(pick(['book_astrology','book_sailor_diary','book_herbal','book_theology']), 1, 'un puesto de libros viejos'); return 'Un vendedor de libros usados liquida todo. Te llevás uno que te llama la atención.'; }}
];
