'use strict';
/* =========================================================================
   systems/potion.js — pociones (§20).
   Separado en cinco piezas, como pide el rework:
   - PotionFormula: objeto de inventario {pathway, seq, fidelity: true |
     partial | false, verified}. El jugador NO ve la fidelidad salvo que la
     verifique (o que la fuente sea de confianza). Una fórmula falsa del
     mercado negro puede matarte.
   - Ingredients: objetos con PUREZA y procedencia.
   - BeyonderCharacteristic: lo que queda de un Beyonder muerto; reemplaza
     al ingrediente principal de su misma vía y Sequence. Cargarla pesa.
   - PotionPreparation: quickBrew. La poción se prepara en el momento en
     que se va a usar: la primera, en la misma noche en que se bebe
     (startFirstPotion); las siguientes, dentro del ritual de avance. La
     pureza de los ingredientes, tu educación y habilidad, los utensilios
     y la fidelidad de la fórmula definen la calidad. (La escena de
     preparación en varios pasos, startBrew, queda para las partidas que
     la tenían a medio hacer.)
   - Potion: el resultado, con calidad y fallas ocultas.
   ========================================================================= */

/* ------------------------------ ingredientes ------------------------------ */
function ingredientsNeededFor(pathwayKey, seq){ return (PATHWAY_INGREDIENTS[pathwayKey] && PATHWAY_INGREDIENTS[pathwayKey][seq]) || []; }
function ingredientItems(pathwayKey, name){ return itemsByCat('ingredient').filter(it=>it.pathway===pathwayKey && (!name || it.name===name)); }
function ownedQty(pathwayKey, name){ return ingredientItems(pathwayKey, name).reduce((a,it)=>a+it.qty, 0); }
function addIngredient(pathwayKey, seq, name, purity, provenance){
  purity = clamp(Math.round(purity ?? rndInt(40,85)), 1, 100);
  const ex = itemsByCat('ingredient').find(it=>it.pathway===pathwayKey && it.name===name);
  if(ex){ ex.purity = Math.round((ex.purity*ex.qty + purity)/(ex.qty+1)); ex.qty++; return ex; }
  return addItem({cat:'ingredient', name, pathway:pathwayKey, seq, purity, rarity: seq<=4 ? 'unico' : seq<=6 ? 'raro' : 'poco',
    desc:`Un ingrediente de la vía ${isIdentified(pathwayKey) ? PATHWAYS[pathwayKey].name : 'que todavía no identificaste'} (Sequence ${seq}).`,
    uses:'Preparar una poción.', risk: purity < 50 ? 'De pureza dudosa.' : 'Ninguno evidente.', provenance}, 1);
}
function ownedIngredientsList(){ return itemsByCat('ingredient').map(it=>({pathwayKey:it.pathway, name:it.name, qty:it.qty, purity:it.purity})); }
// Qué ingredientes podés reconocer si aparecen: no podés identificar algo de
// un mundo que ni sabés que existe (sistema anterior, ahora con pistas).
function eligibleIngredientPathways(){
  const p = STATE.pathway;
  if(p.chosenPathway){ if(p.sequence <= 0) return []; return [{key:p.chosenPathway, seq:p.sequence-1, weight:1}]; }
  // Con la fórmula en la mano sabés exactamente qué buscar; con la vía identificada, casi.
  return Object.keys(PATHWAYS).filter(k=>(p.belief[k]||0) >= 10 || isIdentified(k))
    .map(k=>({key:k, seq:9, weight:Math.max(1, knowledgeOf(k)) * (hasFormula(k, 9) ? 4 : 1) * (isIdentified(k) ? 2 : 1)}));
}
function grantIngredientFind(source, rare){
  const elig = eligibleIngredientPathways();
  if(!elig.length) return null;
  const chosen = wpick(elig, e=>e.weight);
  const need = ingredientsNeededFor(chosen.key, chosen.seq);
  if(!need.length) return null;
  const missing = need.filter(n=>ownedQty(chosen.key, n) <= 0);
  const name = pick(missing.length && chance(0.85) ? missing : need);
  const it = addIngredient(chosen.key, chosen.seq, name, rare ? rndInt(80,100) : rndInt(40,90), source);
  const label = isIdentified(chosen.key) ? `ligado a la vía ${PATHWAYS[chosen.key].name} (Sequence ${chosen.seq})` : 'que, sabés, pertenece al mundo que estás empezando a entender';
  logJournal('Ingrediente encontrado', `En ${source} encontrás ${name}: un ingrediente ${label}.`, {cat:'pathway', imp:1});
  toast('+1 ' + name, 'pos');
  return it;
}

/* ------------------------------ fórmulas ------------------------------ */
function formulaItems(pathwayKey, seq){ return itemsByCat('formula').filter(it=>it.pathway===pathwayKey && (seq===undefined || it.seq===seq)); }
function hasFormula(pathwayKey, seq, trueOnly){ return formulaItems(pathwayKey, seq).some(it=>!trueOnly || it.fidelity==='true'); }
function addFormula(pathwayKey, seq, fidelity, provenance){
  if(!PATHWAYS[pathwayKey]) return null;
  const trusted = /Iglesia|Nighthawks|Tarot|Mente|MI9|Alquimistas|Orden|Castigador|puño y letra|abuelo/i.test(provenance||'') || provenance==='tu propia reconstrucción' && fidelity==='true';
  const it = addItem({cat:'formula', pathway:pathwayKey, seq, fidelity: fidelity||'true', verified: trusted,
    name: formulaName(pathwayKey, seq), rarity: seq<=4 ? 'unico' : 'raro',
    desc:'La receta de una poción: ingredientes principales, suplementarios y el método.', uses:'Preparar la poción.',
    risk: trusted ? 'Viene de una fuente confiable.' : 'Sin verificar: podría estar incompleta, o ser falsa.', provenance}, 1);
  if(seq === 9) STATE.pathway.formulaKnown[pathwayKey] = true;
  // La fórmula nombra la poción: es una pista enorme sobre la vía.
  if(!isIdentified(pathwayKey)) addClue({pathway:pathwayKey, reliability: fidelity==='false' ? 'partial' : 'real', strength:8, source:'una fórmula', confirm: fidelity==='true', silent:true});
  logJournal('Una fórmula', `Conseguís ${it.name}${provenance ? ' ('+provenance+')' : ''}.`, {cat:'pathway', imp:2});
  return it;
}
function verifyFormula(uidv, how){
  const it = itemByUid(uidv); if(!it || it.verified) return null;
  it.verified = true;
  it.risk = it.fidelity==='true' ? 'Verificada: es auténtica.' : it.fidelity==='partial' ? 'Verificada: está incompleta.' : 'Verificada: es falsa.';
  logJournal('Una fórmula verificada', `${cap(how||'Verificás')} ${it.name}: ${it.fidelity==='true' ? 'es auténtica' : it.fidelity==='partial' ? 'le falta algo importante' : 'es falsa'}.`, {cat:'pathway', imp:2});
  return it.fidelity;
}
function canVerifyFormulas(){ const pm = pathwayMods(); return !!(pm.verifyFormula || pm.verifyClues) || knownMysticNpcs().length > 0; }

/* ------------------------------ características ------------------------------ */
function addCharacteristic(pathwayKey, seq, provenance){
  const sd = seqData(pathwayKey, seq);
  return addItem({cat:'characteristic', pathway:pathwayKey, seq, rarity: seq<=4 ? 'unico' : 'raro',
    name:`Característica Beyonder (Sequence ${seq}${isIdentified(pathwayKey) && sd ? ', '+sd.name : ''})`,
    desc:'Lo que queda de un Beyonder cuando muere: poder condensado en algo que se puede tocar. Late, a veces.',
    uses:'Reemplaza al ingrediente principal de una poción de su misma vía y Sequence. También se puede intercambiar.',
    risk:'Cargarla pesa en la mente. Atrae a otros de su misma vía.', provenance}, 1);
}
function characteristicFor(pathwayKey, seq){ return itemsByCat('characteristic').find(it=>it.pathway===pathwayKey && it.seq===seq) || null; }
function characteristicInfluence(){
  const cs = itemsByCat('characteristic');
  if(!cs.length) return;
  const sealed = hasItem('tool_sealed_box');
  cs.forEach(()=>{
    if(!sealed && chance(0.2)) applyEffects({sanity:-1});
    if(chance(sealed ? 0.02 : 0.06)) raiseAttention(1);
  });
  // Ley de convergencia: lo que acumulás atrae a quien lo busca.
  if(cs.length >= 2 && !sealed && chance(0.01 * cs.length) && !STATE.combat && !STATE.pendingEvent){
    logJournal('Algo te buscaba', 'Las Características que guardás tiran de algo. Esta noche, ese algo llega.', {cat:'mystery', imp:2});
    startCombat('rivalBeyonder', {env:'night'});
  }
}

/* ------------------------------ preparar una poción ------------------------------ */
function brewCost(pathwayKey, seq){
  if(seq === 9) return Math.round(((FIRST_POTIONS[pathwayKey]||{ingredientCost:500}).ingredientCost) * priceIndex());
  const d = ADVANCE_DIFFICULTY[seq+1] || {moneyCost:1000};
  return Math.round(d.moneyCost * 0.5 * priceIndex());
}
function brewRequirements(pathwayKey, seq){
  const reqs = [];
  if(seq === 9) reqs.push({id:'understand', label:'Comprender la vía', ok: knowledgeOf(pathwayKey) >= 50 && isIdentified(pathwayKey), hint:'"Buscar lo que te falta" o investigar este hilo.'});
  const f = formulaItems(pathwayKey, seq);
  reqs.push({id:'formula', label:'Tener la fórmula', ok: f.length > 0, hint:ADVANCE_HINTS.formula});
  const need = ingredientsNeededFor(pathwayKey, seq);
  need.forEach((ing,i)=>{
    const ch = i === 0 ? characteristicFor(pathwayKey, seq) : null;
    reqs.push({id:'ing'+i, label:'Ingrediente: '+ing + (i===0 && ch ? ' (o la Característica que tenés)' : ''), ok: ownedQty(pathwayKey, ing) > 0 || !!ch, hint:ADVANCE_HINTS.ing});
  });
  reqs.push({id:'money', label:'Dinero para prepararla: '+fmtMoney(brewCost(pathwayKey, seq)), ok: canAfford(brewCost(pathwayKey, seq)), hint:ADVANCE_HINTS.money});
  if(seq === 9) reqs.push({id:'age', label:'Tener al menos 16 años', ok: STATE.character.edad >= 16});
  reqs.push({id:'time', label:'Tiempo libre esta temporada (2)', ok: canSpendFreeTime(2), hint:'Esperá a la próxima temporada.'});
  return reqs;
}
// Preparar una poción sin escena: el ritual de avance y la primera poción la
// preparan en el momento. Consume los ingredientes (o la Característica), usa
// la mejor fórmula que tengas y calcula la calidad con la pureza, tu
// habilidad, tus utensilios y la fidelidad de la receta.
function quickBrew(pathwayKey, seq, provenance){
  const formula = formulaItems(pathwayKey, seq).sort((a,b)=>(b.fidelity==='true')-(a.fidelity==='true'))[0];
  const fid = formula ? formula.fidelity : 'partial';
  const purities = [];
  ingredientsNeededFor(pathwayKey, seq).forEach((ing,i)=>{
    const have = ingredientItems(pathwayKey, ing)[0];
    const ch = i === 0 ? characteristicFor(pathwayKey, seq) : null;
    if(have){ purities.push(have.purity||60); removeItem(have.uid); }
    else if(ch){ purities.push(95); removeItem(ch.uid); }
  });
  const purity = purities.length ? avg(purities) : 50;
  const skill = (EDUCATION_RANK[STATE.character.educacion]||0)*2 + (playerTags().has('meticulous')?5:0) + Math.round((pathwayMods().brew||0)*50) + Math.round((conditionMods().brew||0)*50);
  let q = 58 + (purity-60)/2 + skill + (hasItem('tool_alchemy') ? 6 : 0) + rndInt(-8,8);
  const flaws = [];
  if(fid === 'false'){ flaws.push('toxic'); q = Math.min(q, 45); }
  if(fid === 'partial' && q < 60) flaws.push('incomplete');
  q = clamp(Math.round(q), 0, 100);
  if(q < 30) flaws.push('unstable');
  const sd = seqData(pathwayKey, seq);
  const pot = addItem({cat:'potion', pathway:pathwayKey, seq, quality:q, flaws, fidelity:fid,
    name:`Poción: ${sd ? sd.name : 'Sequence '+seq} (Sequence ${seq})`, rarity:'raro',
    desc:'Un líquido que no debería existir. Brilla apenas en la oscuridad.', uses: seq===9 ? 'Beberla para convertirte en Beyonder.' : 'Beberla en el ritual de Advancement.',
    risk:'Una poción mal preparada puede fallar, corromperte, dejarte marcas o matarte.', provenance: provenance || 'preparada por vos'}, 1);
  remember('brewed_'+seq, `Preparaste tu propia poción (Sequence ${seq}).`, {cat:'achievement'});
  return pot;
}
// La primera poción, en un solo paso: se prepara y se bebe en la misma noche
// (la escena de beberla todavía deja echarse atrás y guardarla).
function startFirstPotion(pathwayKey){
  if(timeBlocked()) return;
  if(STATE.pathway.chosenPathway) return;
  const reqs = brewRequirements(pathwayKey, 9);
  if(reqs.some(r=>!r.ok)){ toast('Todavía no tenés todo lo necesario.', 'neg'); return; }
  spendFreeTime(2); markMysticAct();
  payFromCashOrBank(brewCost(pathwayKey, 9));
  const pot = quickBrew(pathwayKey, 9, 'preparada por vos');
  logJournal('Preparar la poción', `Preparás ${pot.name.toLowerCase()} en una noche larga, con la fórmula abierta sobre la mesa. ${pot.quality >= 70 ? 'Sale bien: el color es el que describía la receta.' : pot.quality >= 45 ? 'Sale pasable. Algo en el color no te convence del todo.' : 'Sale mal, y lo sabés. El olor lo dice todo.'}`, {cat:'pathway', imp:2});
  startDrinkPotion(pot.uid);
}
function brewHelpers(){
  return aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && n.trust >= 50 && ((n.hidden.pathway && n.known.pathway) || n.profession==='Boticario' || n.flags.mysticContact));
}
function startBrew(pathwayKey, seq){
  if(timeBlocked()) return;
  const reqs = brewRequirements(pathwayKey, seq);
  if(reqs.some(r=>!r.ok)){ toast('Todavía no tenés todo lo necesario.', 'neg'); return; }
  spendFreeTime(2); markMysticAct();
  const formula = formulaItems(pathwayKey, seq).sort((a,b)=>(b.fidelity==='true')-(a.fidelity==='true'))[0];
  STATE.brew = {pathway:pathwayKey, seq, formula:formula.uid, step:0, q:0, place:null};
  openBrewStep();
  saveGame(true); renderAll();
}
function brewSteps(){
  const b = STATE.brew; const steps = [];
  const places = [{label:'En tu casa, de noche', small:'Nadie tiene por qué enterarse. Ojalá.', v:0, place:'casa'},
                  {label:'En un sótano alquilado', small:`Más tranquilo. Cuesta ${fmtMoney(Math.round(30*priceIndex()))}.`, v:5, place:'sotano', cost:30}];
  const fac = memberFactions().find(k=>k!=='tarotClub' && factionAccess(k)>=3);
  if(fac) places.push({label:`En las instalaciones de ${factionShort(fac)}`, small:'Espacio preparado y gente que sabe.', v:12, place:'faccion'});
  if(STATE.tarot.stage >= 7) places.push({label:'Sobre la niebla gris', small:'El lugar más estable que conocés.', v:15, place:'niebla'});
  steps.push({title:'Dónde prepararla', text:'Una poción no se prepara en cualquier lado. El lugar importa: la calma, los testigos, lo que hay en el aire.', choices:places});
  const tools = [{label:'Improvisar con ollas y frascos de cocina', small:'Se puede. No se debe.', v:-8}];
  if(hasItem('tool_alchemy')) tools.push({label:'Usar tus utensilios de alquimia', small:'Lo que corresponde.', v:8});
  else tools.push({label:'Comprar lo necesario', small:`Balanzas, alambiques. ${fmtMoney(Math.round(40*priceIndex()))}.`, v:4, cost:40});
  steps.push({title:'Los utensilios', text:'Cada ingrediente tiene su temperatura, su orden, su medida exacta. Con qué los medís cambia todo.', choices:tools});
  steps.push({title:'El método', text:'La fórmula dice cómo. Tu intuición dice otra cosa. Y el reloj corre.', choices:[
    {label:'Seguir la fórmula al pie de la letra', small:'Confiar en quien la escribió.', v:'literal'},
    {label:'Ajustar con tu intuición', small:'Vos sentís qué necesita la mezcla.', v:'intuition'},
    {label:'Hacerlo rápido, antes de que alguien note el olor', small:'Menos riesgo de que te vean.', v:-8, attention:-1}
  ]});
  steps.push({title:'Una reacción', text: pick([
    'La mezcla hierve de un color que no debería tener.', 'Un olor a hierro y a lluvia llena la habitación. La superficie del líquido se queda completamente quieta.',
    'El líquido empieza a girar solo, en sentido contrario al que lo revolviste.', 'Por un segundo, la mezcla refleja una cara que no es la tuya.']), choices:[
    {label:'Agregar el ingrediente suplementario de a poco', small:'Estabilizar.', v:'supp'},
    {label:'Bajar el fuego y esperar', small:'Paciencia.', v:3},
    {label:'Seguir como si nada', small:'Seguramente es normal.', v:'gamble'}
  ]});
  const helpers = brewHelpers();
  if(helpers.length){
    const h = helpers.sort((a,b)=>b.trust-a.trust)[0];
    steps.push({title:'Una mano', text:`${h.name} sabe de estas cosas. Podrías pedirle que te acompañe en el último tramo, aunque eso signifique que va a saber lo que estás haciendo.`, choices:[
      {label:`Pedirle ayuda a ${h.name}`, small:'Dos pares de ojos ven más.', v:10, helper:h.id},
      {label:'Terminarlo solo', small:'Esto es tuyo.', v:0}
    ]});
  }
  return steps;
}
function openBrewStep(){
  const b = STATE.brew; const steps = brewSteps();
  const s = steps[b.step];
  STATE.pendingEvent = {kind:'brew', step:b.step, totalSteps:steps.length, title:s.title, text:s.text,
    choices: s.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))};
}
function resolveBrewChoice(idx){
  const b = STATE.brew; if(!b){ STATE.pendingEvent = null; renderAll(); return; }
  const steps = brewSteps();
  const s = steps[b.step]; const ch = s && s.choices[idx];
  STATE.pendingEvent = null;
  if(!ch){ STATE.brew = null; renderAll(); return; }
  const formula = itemByUid(b.formula);
  const fid = formula ? formula.fidelity : 'partial';
  const tags = playerTags();
  let v = 0;
  if(typeof ch.v === 'number') v = ch.v;
  else if(ch.v === 'literal') v = fid==='true' ? 6 : fid==='partial' ? -6 : 2;
  else if(ch.v === 'intuition') v = (tags.has('intuitive')?8:0) + (STATE.pathway.chosenPathway==='moon'||b.pathway==='moon'?6:0) + (fid==='partial' && knowledgeOf(b.pathway)>=60 ? 10 : 0) + rndInt(-10,6);
  else if(ch.v === 'supp') v = knowledgeOf(b.pathway) >= 50 ? 5 : -3;
  else if(ch.v === 'gamble') v = rndInt(-10,6);
  if(ch.cost) applyEffects({cash:-Math.round(ch.cost*priceIndex())});
  if(ch.attention) raiseAttention(ch.attention);
  if(ch.place) b.place = ch.place;
  if(ch.place === 'casa'){ raiseAttention(1); aliveNpcs().filter(n=>n.met && n.lifeState==='presente' && isFamilyNpc(n) && !n.flags.leftHome).forEach(n=>adjustRel(n, {suspicion:[2,6]})); }
  if(ch.helper){ const h = npcById(ch.helper); if(h){ h.knows.beyonder = h.knows.beyonder || !!STATE.pathway.chosenPathway; adjustRel(h, {trust:3}); b.helper = h.id; } }
  b.q += v;
  b.step++;
  if(b.step < steps.length){ openBrewStep(); saveGame(true); renderAll(); return; }
  finishBrew();
}
function finishBrew(){
  const b = STATE.brew; STATE.brew = null;
  const formula = itemByUid(b.formula);
  const fid = formula ? formula.fidelity : 'partial';
  // Pureza promedio de lo que se consume.
  const need = ingredientsNeededFor(b.pathway, b.seq);
  let purities = [];
  need.forEach((ing,i)=>{
    const ch = i===0 ? characteristicFor(b.pathway, b.seq) : null;
    const have = ingredientItems(b.pathway, ing)[0];
    if(have){ purities.push(have.purity||60); removeItem(have.uid); }
    else if(ch){ purities.push(95); removeItem(ch.uid); }
  });
  const purity = purities.length ? avg(purities) : 50;
  applyEffects({cash:-brewCost(b.pathway, b.seq)});
  const skill = (EDUCATION_RANK[STATE.character.educacion]||0)*2 + (playerTags().has('meticulous')?5:0) + Math.round((pathwayMods().brew||0)*50) + Math.round((conditionMods().brew||0)*50);
  let q = 50 + b.q + (purity-60)/2 + skill + rndInt(-8,8);
  const flaws = [];
  if(fid === 'false'){ flaws.push('toxic'); q = Math.min(q, 45); }
  if(fid === 'partial' && q < 60) flaws.push('incomplete');
  q = clamp(Math.round(q), 0, 100);
  if(q < 30) flaws.push('unstable');
  const sd = seqData(b.pathway, b.seq);
  const pot = addItem({cat:'potion', pathway:b.pathway, seq:b.seq, quality:q, flaws, fidelity:fid,
    name:`Poción: ${sd ? sd.name : 'Sequence '+b.seq} (Sequence ${b.seq})`, rarity:'raro',
    desc:'Un líquido que no debería existir. Brilla apenas en la oscuridad.', uses: b.seq===9 ? 'Beberla para convertirte en Beyonder.' : 'Beberla en el ritual de Advancement.',
    risk:'Una poción mal preparada puede fallar, corromperte, dejarte marcas o matarte.', provenance:'preparada por vos'}, 1);
  const qTxt = q >= 80 ? 'Sale perfecta. El color es exactamente el que describía la fórmula.' : q >= 60 ? 'Sale bien. O eso parece.' : q >= 40 ? 'Sale... pasable. Algo en el color no te convence.' : 'Sale mal y lo sabés. El olor lo dice todo.';
  logJournal('Preparar una poción', `Preparás ${pot.name.toLowerCase()}. ${qTxt}`, {cat:'pathway', imp:2});
  remember('brewed_'+b.seq, `Preparaste tu propia poción (Sequence ${b.seq}).`, {cat:'achievement'});
  setResolution('Una poción', qTxt, []);
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
function potionItems(pathwayKey, seq){ return itemsByCat('potion').filter(it=>(!pathwayKey || it.pathway===pathwayKey) && (seq===undefined || it.seq===seq)); }
function potionQualityLabel(it){
  if(STATE.settings.showNumbers || pathwayMods().verifyFormula) return `calidad ${it.quality}`;
  return it.quality >= 80 ? 'se ve perfecta' : it.quality >= 60 ? 'se ve bien' : it.quality >= 40 ? 'algo en el color no convence' : 'huele mal';
}

/* ------------------------------ beber la primera poción ------------------------------ */
function startDrinkPotion(uidv){
  if(timeBlocked()) return;
  const it = itemByUid(uidv);
  if(!it || it.cat!=='potion' || it.seq !== 9 || STATE.pathway.chosenPathway) return;
  if(STATE.character.edad < 16){ toast('Todavía sos demasiado joven para algo así.', 'neg'); return; }
  STATE.brew = {drink:uidv, step:0, stab:0};
  openDrinkStep();
  saveGame(true); renderAll();
}
function drinkSteps(){
  const steps = [];
  const close = closeNpcs().filter(n=>n.trust>=55);
  const places = [{label:'Encerrarte en tu cuarto', small:'Solo. Nadie tiene que ver esto.', v:0}];
  if(close.length){ const n = close.sort((a,b)=>bondScore(b)-bondScore(a))[0]; places.push({label:`Pedirle a ${n.name} que te acompañe`, small:'Alguien que te sostenga si algo sale mal. Va a saberlo todo.', v:10, npc:n.id}); }
  if(STATE.flags.factionRitualSite || memberFactions().length) places.push({label:'En un lugar consagrado', small:'Protegido. Controlado.', v:8});
  steps.push({title:'Antes de beberla', text:'La poción espera en la mesa. Nadie te obliga. Podrías volver a guardarla.', choices:places.concat([{label:'No. Todavía no', small:'Guardarla para otro momento.', v:'abort'}])});
  steps.push({title:'El primer trago', text:'Arde. Arde como si te tragaras un incendio. El cuerpo entero quiere expulsarla.', choices:[
    {label:'Resistir con toda tu voluntad', small:'Tu mente contra el fuego.', v:'will'},
    {label:'Aferrarte a un recuerdo querido', small:'Algo que te ancle a quien sos.', v:'memory'},
    {label:'Dejarte llevar', small:'No pelear contra lo que viene.', v:'flow'}
  ]});
  steps.push({title:'Las voces', text:'Entre el dolor, escuchás susurros. Te dicen cosas. Te prometen cosas.', choices:[
    {label:'Ignorarlas', small:'No son para vos.', v:'ignore'},
    {label:'Escucharlas', small:'Quizás digan algo importante.', v:'listen'},
    {label:'Responderles', small:'Preguntarles quiénes son.', v:'answer'}
  ]});
  return steps;
}
function openDrinkStep(){
  const b = STATE.brew; const s = drinkSteps()[b.step];
  STATE.pendingEvent = {kind:'drink', step:b.step, totalSteps:3, title:s.title, text:s.text, choices:s.choices.map((c,i)=>({idx:i, label:c.label, small:c.small}))};
}
function resolveDrinkChoice(idx){
  const b = STATE.brew; if(!b){ STATE.pendingEvent = null; renderAll(); return; }
  const s = drinkSteps()[b.step]; const ch = s && s.choices[idx];
  STATE.pendingEvent = null;
  if(!ch){ STATE.brew = null; renderAll(); return; }
  const c = STATE.character;
  if(ch.v === 'abort'){ STATE.brew = null; setResolution('La poción', 'La guardás de nuevo. Te tiemblan las manos. No sabés si es alivio o decepción.', []); saveGame(true); renderAll(); return; }
  let v = 0;
  if(typeof ch.v === 'number') v = ch.v;
  if(ch.npc){ const n = npcById(ch.npc); if(n){ n.knows.beyonder = true; adjustRel(n, {trust:5, dependence:3}); b.witness = n.id; } }
  if(ch.v === 'will') v = Math.round((c.sanity - 55)/3) + (playerTags().has('disciplined')?6:0);
  if(ch.v === 'memory'){ const best = Math.max(0, ...aliveNpcs().filter(n=>n.met).map(bondScore)); v = Math.round(best/6) + Math.min(6, memoriesByCat('person').length); }
  if(ch.v === 'flow') v = rndInt(-14,14);
  if(ch.v === 'ignore') v = playerTags().has('disciplined') || playerTags().has('cautious') ? 6 : 2;
  if(ch.v === 'listen'){ v = -4; applyEffects({clue:{pathway:(itemByUid(b.drink)||{}).pathway||'$random', reliability:'real', strength:[3,6], source:'las voces de la poción', silent:true}, corruption:[0,2]}); }
  if(ch.v === 'answer'){ v = -18; applyEffects({corruption:[2,5]}); }
  b.stab += v; b.step++;
  if(b.step < 3){ openDrinkStep(); saveGame(true); renderAll(); return; }
  finishDrink();
}
function finishDrink(){
  const b = STATE.brew; STATE.brew = null;
  const it = itemByUid(b.drink);
  if(!it){ renderAll(); return; }
  const key = it.pathway, c = STATE.character;
  removeItem(it.uid);
  const prep = (FIRST_POTIONS[key]||{prepDifficulty:0.6}).prepDifficulty;
  const score = it.quality*0.5 + b.stab + c.sanity*0.2 - c.corruption*0.3;
  let p = 0.35 + (score-40)/100 + prep*0.35 + diffAdd('potion') + luckMod();
  if((it.flaws||[]).includes('toxic')) p = 0.03;
  if((it.flaws||[]).includes('unstable')) p -= 0.15;
  p = clamp(p, 0.03, 0.95);
  const pw = PATHWAYS[key];
  if(chance(p)){
    STATE.pathway.chosenPathway = key; STATE.pathway.sequence = 9; STATE.pathway.digestion = 0; STATE.flags.beyonderSince = STATE.time.totalMonths;
    STATE.pathway.identified[key] = true; STATE.pathway.potionMonth = STATE.time.totalMonths;
    STATE.pathway.acting = {history:[], quality:50, consistency:0.5, deviation:0};
    applyEffects({sanity:-rndInt(8,18), corruption:rndInt(2,8), spirituality:[4,10], humanity:-2});
    const text = `Bebés la poción. Tu cuerpo arde por dentro durante horas interminables. Al amanecer, ya no sos completamente humano. Sequence 9 — ${pw.seq[0].name}.`;
    logJournal('PRIMERA POCIÓN', text, {cat:'pathway', imp:3});
    addMilestone('potion', `Primera poción: ${pw.name}, Sequence 9 — ${pw.seq[0].name}`);
    remember('first_potion', `Te convertiste en Beyonder: ${pw.name}, ${pw.seq[0].name}.`, {cat:'achievement'});
    if(b.witness){ const n = npcById(b.witness); if(n) remember('witness_potion', `${n.name} te sostuvo la mano la noche en que bebiste la poción.`, {cat:'person', npc:n.id}); }
    setResolution('Beyonder', text, []);
    queueSeal({kind:'beyonder', key});
    toast('Te convertiste en Beyonder. Sequence 9 — ' + pw.seq[0].name, 'pos');
    recomputeAnchors();
  } else {
    // El fracaso depende de cuán mal estuvo todo.
    const sev = Math.random() + (score-40)/200 - ((it.flaws||[]).includes('toxic') ? 0.4 : 0);
    let text;
    if(sev < 0.08 && chance(0.6*diffMult('death')) && !chance(fateSave()*5)){
      endGame('negative', 'La poción', `${c.nombre} ${c.apellido} bebe una poción que no debió beber. ${(it.flaws||[]).includes('toxic') ? 'La fórmula era falsa.' : 'Algo salió mal en la preparación.'} No sobrevive a la noche.`, {cause:'pocion'});
      saveGame(true); renderAll(); return;
    } else if(sev < 0.3){
      applyEffects({salud:-rndInt(30,60), sanity:-rndInt(15,30), corruption:[4,10]});
      const cond = randomCondition('potion'); if(cond) addCondition(cond);
      text = 'La poción falla de forma catastrófica. Sobrevivís, pero el daño es severo y algo te queda para siempre.';
    } else if(sev < 0.55){
      applyEffects({salud:-rndInt(10,25), sanity:-rndInt(10,20), corruption:[3,10]});
      text = 'El cuerpo rechaza la poción. No hay transformación: sólo dolor, fiebre y una advertencia clara del riesgo real que implica este camino.';
    } else {
      applyEffects({sanity:-rndInt(6,14), corruption:[1,4]});
      text = 'La poción no "prende". La vomitás a medias antes del amanecer. Perdiste la poción, no la vida.';
    }
    logJournal('Poción fallida', text, {cat:'pathway', imp:3});
    remember('potion_failed', 'Tu primera poción falló.', {cat:'trauma'});
    setResolution('La poción falló', text, []);
  }
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
// Compatibilidad: requisitos "de un vistazo" para la primera poción de una vía.
function firstPotionRequirements(key){ return brewRequirements(key, 9); }
