'use strict';
/* =========================================================================
   systems/endings.js — finales y biografía (§35, §36, §37, §52).
   No hay puntaje. El final analiza la vida entera: Sequence, familia,
   reputación, relaciones, dinero, corrupción, cordura, facciones,
   secretos, anclas y decisiones históricas, y la cuenta como una
   biografía por etapas. Al final aparece "Lo que nunca supo": las verdades
   ocultas que el personaje se llevó sin descubrir.
   ========================================================================= */
const ENDING_CAT_LABEL = {natural:'Una vida', negative:'Un final abrupto', divine:'Más allá de la vida', human:'Final humano', beyonder:'Final Beyonder', special:'Final especial'};
const LIFE_STAGES = [
  {id:'infancia', label:'Infancia', from:0, to:12},
  {id:'adolescencia', label:'Adolescencia', from:13, to:17},
  {id:'juventud', label:'Juventud', from:18, to:29},
  {id:'adultez', label:'Adultez', from:30, to:59},
  {id:'vejez', label:'Vejez', from:60, to:999}
];

function endGame(category, title, text, meta){
  if(STATE.gameOver) return;
  meta = meta || {};
  const c = STATE.character;
  STATE.combat = null; STATE.pendingEvent = null; STATE.pendingMission = null; STATE.ritual = null; STATE.brew = null;
  recomputeAnchors();
  const analysis = analyzeLife(category, meta);
  if(!text) text = analysis.deathLine;
  STATE.gameOver = true;
  STATE.endingData = {
    category, title, text, meta,
    epitaph: analysis.epitaph,
    paragraphs: analysis.paragraphs,
    stages: buildLifeStages(),
    neverKnew: STATE.hiddenTruths.filter(h=>!h.revealed).slice(-8).map(h=>h.text),
    facts: analysis.facts,
    age: c.edad, year: calendarYear()
  };
  logJournal('FIN — ' + title, text, {cat:'end', imp:3});
  addMilestone('end', title);
  saveGame(true);
  renderAll();
}

/* ------------------------------ análisis de la vida ------------------------------ */
function analyzeLife(category, meta){
  const c = STATE.character, p = STATE.pathway, a = STATE.anchors;
  const P = [];
  const facts = [];
  const him = gx('él','ella','elle');
  // Muerte natural: la escena final depende de quién queda.
  const kids = childrenNpcs();
  const aliveKids = kids.filter(n=>n.alive);
  const spouse = spouseNpc();
  const close = aliveNpcs().filter(n=>n.met && bondScore(n)>=55);
  let deathLine = '';
  if(category === 'natural'){
    if(spouse && aliveKids.length) deathLine = `${c.nombre} ${c.apellido} muere a los ${c.edad} años en ${c.ciudad}, con ${spouse.name} al lado y ${aliveKids.length===1 ? aliveKids[0].name : 'sus hijos'} en la habitación de al lado, hablando bajito.`;
    else if(aliveKids.length) deathLine = `${c.nombre} ${c.apellido} muere a los ${c.edad} años en ${c.ciudad}. ${aliveKids.length===1 ? aliveKids[0].name+' llega' : 'Sus hijos llegan'} a tiempo para despedirse.`;
    else if(close.length) deathLine = `${c.nombre} ${c.apellido} muere a los ${c.edad} años en ${c.ciudad}. ${close[0].name} está ahí. Alguien estaba ahí.`;
    else deathLine = `${c.nombre} ${c.apellido} muere a los ${c.edad} años en ${c.ciudad}, en una habitación en silencio. Nadie avisa a nadie durante días.`;
  }
  // 1. Lo sobrenatural.
  if(p.chosenPathway){
    const pw = PATHWAYS[p.chosenPathway], sd = seqData(p.chosenPathway, p.sequence);
    const yrs = STATE.flags.beyonderSince !== undefined ? Math.floor((STATE.time.totalMonths - STATE.flags.beyonderSince)/12) : null;
    if(p.sequence === 0) P.push(`Llegó a donde casi nadie llega: la Sequence 0 de la vía ${pw.name}.`);
    else P.push(`Fue Beyonder de la vía ${pw.name}${yrs ? ` durante ${yrs} año${yrs===1?'':'s'}` : ''}, y llegó a la Sequence ${p.sequence}: ${sd ? sd.name : ''}.${p.sequence >= 8 ? ' No fue lejos, y tal vez por eso vivió como vivió.' : p.sequence <= 4 ? ' Muy pocos, en toda la historia, llegaron tan lejos.' : ''}`);
    facts.push({k:'Vía', v:`${pw.name} — Sequence ${p.sequence}`});
    if(p.actingMethod >= 2) P.push('Entendió el Método de Actuación: que no se trataba de tomar pociones, sino de convertirse en ellas.');
  } else {
    const k = maxPathwayKnowledge();
    if(k >= 60) P.push('Estuvo a un paso del mundo oculto. Sabía lo suficiente como para cruzar, y no cruzó.');
    else if(k >= 25) P.push('Vio, alguna vez, cosas que no tenían explicación. Eligió, o le tocó, no mirar más de cerca.');
    else P.push('Vivió toda su vida del lado de acá del velo, sin saber que había otro.');
    facts.push({k:'Vía', v:'Nunca fue Beyonder'});
  }
  // 2. Familia.
  const fam = [];
  if(spouse) fam.push(`compartió la vida con ${spouse.name}`);
  else if(c.estadoCivil === 'Viudo/a') fam.push('enviudó');
  else if(c.estadoCivil === 'Divorciado/a') fam.push('se separó');
  if(kids.length) fam.push(`tuvo ${kids.length} hij${kids.length===1?'o':'os'}${kids.length !== aliveKids.length ? ` (${kids.length-aliveKids.length} murió antes que ${him})` : ''}`);
  if(c.grandchildren) fam.push(`conoció a ${c.grandchildren} niet${c.grandchildren===1?'o':'os'}`);
  if(fam.length) P.push(cap(fam.join(', ')) + '.');
  else P.push('No formó una familia propia.');
  const estranged = kids.filter(n=>n.alive && bondScore(n) < 25);
  if(estranged.length) P.push(`${estranged.map(n=>n.name).join(' y ')} no ${estranged.length===1?'fue':'fueron'} al final. Hacía años que no hablaban.`);
  facts.push({k:'Familia', v: kids.length ? `${kids.length} hijo(s)` + (c.grandchildren ? `, ${c.grandchildren} nieto(s)` : '') : (spouse ? 'Pareja, sin hijos' : 'Sin familia propia')});
  // 3. Reputación y trabajo.
  const rep = c.reputation;
  P.push(rep >= 60 ? `Su nombre se decía con respeto en ${c.ciudad}.` : rep >= 25 ? 'Era alguien conocido y bien considerado en su barrio.' : rep >= -10 ? 'Pasó por el mundo sin hacer demasiado ruido.' : rep >= -40 ? 'Su nombre tenía mala fama, y algo de eso era merecido.' : 'Muchos se alegraron, en voz baja, al saber que había muerto.');
  if(c.profesion && c.profesion !== 'Desempleado') facts.push({k:'Profesión', v:c.profesion});
  // 4. Dinero.
  const net = c.cash + c.bank - c.debt + (c.vivienda ? housePrice() : 0);
  const start = {Baja:0, Media:1, Alta:2}[STATE.flags.startClass || c.clase] ?? 1;
  const end = net >= 20000 ? 2 : net >= 2500 ? 1 : 0;
  if(end > start) P.push('Murió con más de lo que tuvo al nacer.');
  else if(end < start) P.push('Murió con menos de lo que tuvo al nacer.');
  if(c.debt > 0) P.push(`Dejó deudas: ${fmtMoney(c.debt)} que alguien más tuvo que pagar.`);
  facts.push({k:'Patrimonio', v: net >= 0 ? fmtMoney(net) : `Deudas por ${fmtMoney(-net)}`});
  // 5. Relaciones.
  const top = STATE.npcs.filter(n=>n.met && !isFamilyNpc(n)).sort((x,y)=>bondScore(y)-bondScore(x))[0];
  if(top && bondScore(top) >= 55) P.push(`${top.name} fue, probablemente, la persona que mejor lo conoció fuera de su familia.`.replace('lo conoció', gx('lo conoció','la conoció','le conoció')));
  const betrayals = memoriesByCat('betrayal');
  if(betrayals.length) P.push(betrayals.length === 1 ? `Nunca olvidó una traición. En su memoria quedó así: “${betrayals[0].text}”` : `Lo traicionaron más de una vez. No aprendió a desconfiar, o aprendió demasiado.`.replace('Lo traicionaron', gx('Lo traicionaron','La traicionaron','Le traicionaron')));
  const enemies = STATE.npcs.filter(n=>n.alive && n.met && (n.fear >= 60 || n.suspicion >= 70));
  if(enemies.length >= 2) P.push(`Dejó gente que le temía, o que sospechaba de ${him} hasta el final.`);
  // 6. Cordura y corrupción, en palabras.
  if(c.corruption >= 60) P.push('Algo oscuro había echado raíces en su interior. Los que lo conocieron de cerca lo notaban sin saber nombrarlo.'.replace('lo conocieron', gx('lo conocieron','la conocieron','le conocieron')));
  else if(c.corruption >= 30) P.push('Cargaba con una sombra que nunca terminó de irse.');
  if(c.sanity <= 25) P.push('Sus últimos años fueron confusos. Hablaba de cosas que nadie más veía.');
  if((c.conditions||[]).length) facts.push({k:'Lo que le quedó', v: c.conditions.map(x=>CONDITIONS[x.id] ? CONDITIONS[x.id].name : x.id).join(', ')});
  // 7. Organizaciones.
  const members = FACTION_KEYS.filter(k=>F(k).relationship==='miembro' || F(k).joined);
  members.forEach(k=>{ const f = F(k), d = FACTIONS_DATA[k]; P.push(`Perteneció a ${factionName(k)}${f.rank ? `, donde llegó a ${d.ranks[f.rank]}` : ''}.`); });
  const hunted = huntingFactions();
  if(hunted.length) P.push(`${cap(factionShort(hunted[0]))} lo buscaba todavía cuando murió.`.replace(' lo buscaba', gx(' lo buscaba',' la buscaba',' le buscaba')));
  if(STATE.tarot.stage >= 6) P.push(`En la niebla gris, se sentaba a la mesa de bronce como "${STATE.tarot.card}".`);
  // 8. Secretos.
  const forb = (STATE.lore.forbidden||[]).length + (STATE.lore.entity||[]).length;
  if(forb >= 3) P.push('Supo cosas que ninguna persona debería saber. Se las llevó.');
  else if(loreCount() >= 8) P.push('Sabía mucho más de lo que decía.');
  // 9. Anclas.
  if(a.revealed){
    if(a.people.length >= 2) P.push(`Lo que lo mantuvo humano tuvo nombres: ${a.people.map(id=>npcById(id)).filter(Boolean).slice(0,3).map(n=>n.name).join(', ')}.`.replace('lo mantuvo', gx('lo mantuvo','la mantuvo','le mantuvo')));
    else P.push('Al final, casi no quedaba nadie que lo recordara como había sido.'.replace('lo recordara', gx('lo recordara','la recordara','le recordara')));
  }
  // Lo que quedó entre sus cosas (y quién lo encontró).
  const strange = itemsByCat('artifact').filter(it=>!it.loan)[0] || itemsByCat('characteristic')[0] || inventoryItems().find(it=>['quest_notebook','tarot_card','book_untitled','book_grimoire'].includes(it.def));
  if(strange && category !== 'divine'){
    const heir = aliveKids.slice().sort((x,y)=>bondScore(y)-bondScore(x))[0] || aliveNpcs().find(n=>n.id.startsWith('hermano'));
    P.push(heir ? `Entre sus cosas quedó ${strange.name.toLowerCase()}. ${heir.name} lo encontró años después, en el fondo de un cajón, y nunca supo del todo qué era.` : `Entre sus cosas quedó ${strange.name.toLowerCase()}. Nadie supo nunca qué era. Alguien, algún día, lo va a encontrar.`);
  }
  // 10. Decisiones históricas.
  const hist = (STATE.world.timeline||[]).filter(e=>e.triggered && (e.altered || e.witnessed));
  hist.forEach(e=>{ const d = timelineDef(e); if(d) P.push(e.altered ? `Por algo que hizo, "${d.title}" no pasó como tenía que pasar.` : `Estuvo ahí cuando pasó "${d.title}".`); });
  const pacts = memoriesByCat('pact');
  if(pacts.length) P.push(`Hizo ${pacts.length === 1 ? 'un pacto' : 'pactos'} de los que no se habla. El último lo recordaba así: “${pacts[pacts.length-1].text}”`);
  if(c.stats.killed >= 3) P.push('Mató más de una vez. No siempre le pesó.');
  else if(c.stats.spared >= 2) P.push('Pudiendo matar, más de una vez eligió no hacerlo.');
  // Epitafio.
  let epitaph;
  if(STATE.divinity && STATE.divinity.ascended) epitaph = 'Fue una persona, antes.';
  else if(kids.length >= 3 && close.length >= 2) epitaph = 'Dejó una casa llena.';
  else if(c.corruption >= 60) epitaph = 'Lo que quedó de ' + c.nombre + '.';
  else if(rep >= 60) epitaph = 'Lo recordaron bien.'.replace('Lo', gx('Lo','La','Le'));
  else if(p.chosenPathway && p.sequence <= 4) epitaph = 'Subió más alto de lo que cualquiera se atrevía a soñar. El precio fue suyo.';
  else if(!close.length && !spouse) epitaph = 'Murió como vivió los últimos años: solo.';
  else if(!p.chosenPathway) epitaph = 'Una vida común, que no fue poco.';
  else epitaph = 'Vivió entre dos mundos, y no terminó de pertenecer a ninguno.';
  facts.push({k:'Edad', v:`${c.edad} años`});
  return {paragraphs:P, epitaph, facts, deathLine};
}
// Etapas de la vida: lo más importante de cada una, del journal y los hitos.
function buildLifeStages(){
  const J = STATE.journal || [], M = STATE.milestones || [];
  return LIFE_STAGES.map(st=>{
    const ms = M.filter(m=>m.edad >= st.from && m.edad <= st.to && m.kind !== 'end').map(m=>({age:m.edad, text:m.text, kind:m.kind}));
    // El diario está del más nuevo al más viejo: se invierte para contar en orden.
    const js = J.filter(e=>e.age >= st.from && e.age <= st.to && (e.imp||0) >= 3 && !/^FIN/.test(e.title||'')).slice().reverse().slice(0,8).map(e=>({age:e.age, text:e.title, detail:e.text}));
    return {id:st.id, label:st.label, milestones:ms, moments:js};
  }).filter(s=>s.milestones.length || s.moments.length);
}
