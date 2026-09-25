'use strict';
/* =========================================================================
   systems/tarot.js — el Tarot Club (§28).
   Etapas (STATE.tarot.stage):
     0 nada · 1 oíste hablar de algo · 2 alguien te observa (pruebas ocultas)
     3 contacto: sabés que existe · 4 la mirada desde arriba
     5 invitado (o pediste volver) · 6 miembro · 7 miembro de confianza
   STATE.tarot.observed es el juicio que El Loco hace de vos: sube y baja
   con decisiones que el jugador NO sabe que son pruebas. Al entrar a la
   niebla gris, esas pruebas se revelan ("Ah, era por aquella billetera").
   ========================================================================= */
const TAROT_CARDS_BY_PATHWAY = {
  visionary:'Justicia', tyrant:'El Colgado', sun:'El Sol', door:'El Mago', hermit:['El Ermitaño','La Ermitaña'], moon:'La Luna',
  darkness:'La Estrella', redPriest:'El Carro', twilightGiant:'La Fuerza', hangedMan:'La Templanza', death:'La Muerte',
  error:'La Rueda de la Fortuna', whiteTower:['La Sacerdotisa','La Sacerdotisa'], fool:'El Juicio'
};
// En la línea canónica esos lugares ya tienen dueño: te toca otra carta.
const TAROT_FREE_CARDS = ['Los Enamorados','La Templanza','La Torre','El Emperador','La Emperatriz','El Juicio','La Fuerza','El Carro'];
const TAROT_MEMBERS_CANON = ['Justicia','El Colgado','El Sol','El Mago','La Luna','El Ermitaño','La Estrella','El Mundo'];

function T(){ return STATE.tarot || (STATE.tarot = {stage:0, observed:0, card:null, meetings:0, lastMeeting:-99, honorific:false, declined:0, heard:[], evals:0, shared:[], lastFormula:-99, lastPrayer:-99, trustEvents:0}); }
function tarotMember(){ return T().stage >= 6; }

function tarotHear(source){
  const t = T();
  t.heard = t.heard || [];
  if(source && !t.heard.includes(source)){ t.heard.push(source); if(t.heard.length > 12) t.heard.shift(); }
  if(t.stage < 1) t.stage = 1;
  if(t.heard.length >= 3 && t.stage < 3){ t.stage = 3; STATE.factions.tarotClub.discovered = true; }
}
// El juicio invisible. Nunca se muestra como número.
function tarotObserve(delta, why){
  const t = T();
  t.observed = clamp((t.observed||0) + delta, -60, 120);
  t.evals = (t.evals||0) + 1;
  if(Math.abs(delta) >= 10 && t.stage >= 2 && t.stage < 6){
    addHiddenTruth(delta > 0 ? `Cuando ${why}, alguien muy por encima de la niebla lo anotó a tu favor.` : `Cuando ${why}, alguien muy por encima de la niebla lo anotó en tu contra.`, {key:'tarot_eval_'+t.evals});
  }
}
function tarotInvitationReady(){
  const t = T(), c = STATE.character;
  if(t.stage < 4 || t.stage >= 6) return false;
  if(!STATE.pathway.chosenPathway) return false;
  if(c.sanity < 30 || c.corruption > 60) return false;
  if(t.declined >= 2) return false;
  if(t.declined && STATE.time.totalMonths - (t.lastDecline||0) < 24) return false;
  return t.observed >= 40;
}
function tarotCardFor(){
  const pw = STATE.pathway.chosenPathway;
  if(STATE.settings.world === 'canon'){
    const free = TAROT_FREE_CARDS.filter(x=>!TAROT_MEMBERS_CANON.includes(x));
    return pick(free);
  }
  const c = TAROT_CARDS_BY_PATHWAY[pw] || 'El Juicio';
  return Array.isArray(c) ? (STATE.character.genero==='Mujer' ? c[1] : c[0]) : c;
}
function tarotJoin(){
  const t = T();
  t.stage = 6; t.card = tarotCardFor(); t.joinedAt = STATE.time.totalMonths; t.lastMeeting = STATE.time.totalMonths;
  const f = STATE.factions.tarotClub;
  f.known = true; f.discovered = true; f.relationship = 'miembro'; f.joined = calendarYear(); f.access = Math.max(f.access, 2); f.trust = Math.max(f.trust, 20);
  learnLore('tarot_fool', 'la niebla gris');
  remember('tarot_joined', `Te sentaste a la mesa de bronce como "${t.card}".`, {cat:'organization', faction:'tarotClub'});
  addMilestone('faction', `Miembro del Tarot Club — "${t.card}"`);
  // La recompensa narrativa: ahora entendés por qué.
  const evals = STATE.hiddenTruths.filter(h=>!h.revealed && h.key && h.key.startsWith('tarot_eval_'));
  evals.forEach(h=>revealHiddenTruth(h.id, 'la niebla gris'));
  queueSeal({kind:'tarot', card:t.card});
  STATE._importantMoment = true;
  return `Te sentás. En la mesa, frente a vos, aparece una carta: ${t.card}. Así te van a llamar acá. Nadie usa su nombre verdadero.` +
    (evals.length ? ` Mientras la niebla se asienta, entendés de golpe varias cosas de tu vida que parecían casualidad: te estaban mirando.` : '');
}
function tarotMeetingText(){
  const t = T();
  const others = shuffle(TAROT_MEMBERS_CANON.filter(x=>x!==t.card && x!=='El Mundo')).slice(0, rndInt(2,4));
  const lines = [
    `${others[0]} saluda con una formalidad exagerada y pregunta, como al pasar, si alguien sabe algo de ${pick(['una ruina bajo la ciudad','un barco que no llega a puerto','un culto que compra niños','un libro que cambia de autor'])}.`,
    `${others[1]||'Alguien'} ofrece ${pick(['un ingrediente raro','información sobre una Iglesia','una fórmula incompleta','dinero, mucho'])} a cambio de ${pick(['un favor','un secreto','una Característica','una dirección'])}.`,
    `${others[2]||others[0]} cuenta algo que pasó en ${currentCity().name} esta semana. Vos estabas ahí. Nadie lo sabe.`,
    'El Loco escucha todo sin decir casi nada. Cuando habla, la niebla parece inclinarse hacia él.'
  ];
  const tl = (STATE.world.timeline||[]).find(ev=>!ev.triggered && ev.possible && ev.date.y - calendarYear() <= 1);
  if(tl) lines.push(`Alguien menciona, en voz baja, que "se viene algo" en ${tl.city && CITIES_DATA[tl.city] ? CITIES_DATA[tl.city].name : 'el continente'}. Nadie discute.`);
  return `La niebla gris, otra vez. La mesa de bronce, las sillas de respaldo alto. Sos ${t.card}. ` + shuffle(lines).slice(0,3).join(' ');
}
function tarotShareableLore(){
  const shared = T().shared || [];
  return allKnownLore().filter(id=>{ const L = LORE[id]; return L && id !== 'tarot_fool' && !shared.includes(id) && (L.cat==='secret' || L.cat==='forbidden' || L.cat==='entity'); });
}
function tarotShareSecret(){
  const t = T(); t.shared = t.shared || [];
  const pool = tarotShareableLore().sort((a,b)=>LORE[b].tradeValue - LORE[a].tradeValue);
  const id = pool[0]; const L = LORE[id];
  t.shared.push(id);
  factionAdjust('tarotClub', {trust: L.tradeValue*3, secretRep:L.tradeValue*2});
  let text = `Compartís lo que sabés sobre "${L.title}". Hay un silencio atento. Alguien toma nota sin papel.`;
  if(chance(0.6)){
    const back = shuffle(['secret','forbidden','entity','fact'].flatMap(cat=>lorePool(cat))).find(x=>!knowsLore(x) && x!=='tarot_fool');
    if(back){ learnLore(back, 'el Tarot Club'); text += ` A cambio, alguien te cuenta algo: "${LORE[back].title}".`; }
  }
  return text;
}
function tarotCanRequestFormula(){
  const t = T(), p = STATE.pathway;
  if(!tarotMember() || !p.chosenPathway || p.sequence <= 1) return false;
  if(STATE.time.totalMonths - (t.lastFormula||-99) < 12) return false;
  if(hasFormula(p.chosenPathway, p.sequence-1, true)) return false;
  return (STATE.factions.tarotClub.trust||0) >= 35;
}
function tarotRequestFormula(){
  const t = T(), p = STATE.pathway;
  t.lastFormula = STATE.time.totalMonths;
  factionAdjust('tarotClub', {trust:-25});
  const fid = chance(0.92) ? 'true' : 'partial';
  addFormula(p.chosenPathway, p.sequence-1, fid, 'el Tarot Club');
  remember('tarot_formula', 'El Tarot Club te consiguió una fórmula.', {cat:'favor_received', faction:'tarotClub'});
  return `Pedís la fórmula de ${formulaName(p.chosenPathway, p.sequence-1)}. Nadie responde enseguida. En la siguiente reunión, sobre tu lugar en la mesa, hay un papel doblado. El precio queda anotado en algún lado.`;
}
function tarotTradeables(){ return inventoryItems().filter(it=>it.qty>0 && (it.cat==='characteristic' || it.cat==='ingredient')); }
function tarotTrade(){
  const it = pick(tarotTradeables());
  const val = it.cat==='characteristic' ? rndInt(700,1600) : rndInt(80,300);
  removeItem(it.uid);
  factionAdjust('tarotClub', {trust:it.cat==='characteristic'?10:4});
  const p = STATE.pathway;
  if(p.chosenPathway && chance(0.5)){
    const target = p.sequence > 0 ? p.sequence-1 : 0;
    grantIngredientFind('el Tarot Club', true);
    return `Ofrecés ${it.name.toLowerCase()}. Alguien acepta. A cambio te llega, días después, algo que necesitabas para la ${formulaName(p.chosenPathway, target)}.`;
  }
  applyEffects({cash:Math.round(val*priceIndex())});
  return `Ofrecés ${it.name.toLowerCase()}. Te pagan ${fmtMoney(Math.round(val*priceIndex()))} en oro de verdad, que aparece en tu casa a la mañana.`;
}
function tarotAskHelp(){
  const f = STATE.factions.tarotClub;
  if((f.trust||0) < 15) return 'Pedís ayuda. Los demás se miran. Nadie responde. Todavía no confían en vos.';
  factionAdjust('tarotClub', {trust:-10});
  const hunted = huntingFactions();
  if(hunted.length){ const h = pick(hunted); F(h).hunted = false; F(h).suspicion = Math.max(0, F(h).suspicion - 30); STATE.world.attention = Math.max(0, STATE.world.attention - 20); return `Contás que ${factionShort(h)} te busca. Semanas después, dejan de buscarte. Nadie te explica cómo.`; }
  if((STATE.character.conditions||[]).length){ const cd = STATE.character.conditions[0]; removeCondition(cd.id); return 'Alguien te manda, por medios que no entendés, un remedio. Funciona.'; }
  if(STATE.character.sanity < 50){ applyEffects({sanity:[8,15]}); return 'Hablás de lo que te pasa. Nadie te juzga. Es la primera vez en mucho tiempo que alguien entiende de verdad.'; }
  const missing = aliveNpcs().find(n=>n.lifeState==='desaparecido');
  if(missing){ addMissingPersonLead(missing, false); return `Preguntás por ${missing.name}. Alguien sabe algo. Te da una dirección.`; }
  applyEffects({clue:{pathway:STATE.pathway.chosenPathway||'$random', reliability:'real', strength:[4,8], source:'el Tarot Club'}});
  return 'Pedís consejo. Recibís más de lo que pediste.';
}
function tarotListen(){
  factionAdjust('tarotClub', {trust:[1,3]});
  applyEffects({sanity:[0,2]});
  const r = Math.random();
  if(r < 0.35){ const id = shuffle(lorePool('fact').concat(lorePool('secret'))).find(x=>!knowsLore(x)); if(id){ learnLore(id, 'escuchando en el Tarot Club'); return `Escuchás. En medio de una discusión ajena, aparece algo que no sabías: "${LORE[id].title}".`; } }
  if(r < 0.6){ applyEffects({clue:{pathway:'$random', reliability:'real', strength:[3,6], source:'una conversación en la niebla'}}); return 'Escuchás. Alguien describe, sin querer, cómo funciona su vía. Lo anotás en tu cabeza.'; }
  if(r < 0.75 && !STATE.npcs.some(n=>n.flags && n.flags.tarotMember)){
    const n = createMysticContact({pathway:pick(['sun','visionary','door','moon','hermit']), role:'alguien que reconocés de la niebla', faction:'tarotClub'});
    n.flags.tarotMember = true; n.known.faction = true;
    return `Escuchás. Por un detalle — una frase, una forma de reírse — reconocés a alguien de la mesa: es ${n.name}, a quien ya habías visto en ${currentCity().name}. No le decís nada. Todavía.`;
  }
  return 'Escuchás en silencio. A veces la mejor información es saber quién pregunta qué.';
}
// Rezarle al Loco: sólo funciona si conocés el nombre honorífico (§28).
function tarotCanPray(){ return T().honorific && STATE.time.totalMonths - (T().lastPrayer||-99) >= 12; }
function tarotPray(){
  if(timeBlocked() || !tarotCanPray()) return;
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const t = T(); t.lastPrayer = STATE.time.totalMonths;
  markMysticAct();
  const before = snapshotForChanges();
  const p = clamp(0.2 + (t.observed||0)/200 + (tarotMember()?0.25:0), 0.05, 0.8);
  let text;
  if(chance(p)){
    const r = Math.random();
    if(r < 0.35){ const h = revealRandomHiddenTruth('una respuesta desde la niebla'); text = h ? 'Recitás las tres frases. Silencio. Y después, una imagen clarísima en tu cabeza: algo que te pasó y nunca entendiste.' : 'Recitás las tres frases. Silencio. Y después, una paz rara.'; if(!h) applyEffects({sanity:[5,10]}); }
    else if(r < 0.7){ applyEffects({sanity:[6,12]}); text = 'Recitás las tres frases. Algo te escucha. No responde con palabras: la angustia que traías, simplemente, se va.'; }
    else { applyEffects({clue:{pathway:STATE.pathway.chosenPathway||'$random', reliability:'real', strength:[5,9], source:'la niebla gris'}}); text = 'Recitás las tres frases. Esa noche soñás con una biblioteca gris y una página abierta.'; }
    tarotObserve(3, 'rezaste con respeto');
  } else {
    text = 'Recitás las tres frases, con cuidado de no equivocarte en ninguna palabra. Nada. O nada que puedas notar.';
  }
  logJournal('Una plegaria', text, {cat:'mystery'});
  setResolution('Una plegaria', text, diffForDisplay(before));
  saveGame(true); renderAll();
}
// Cada mes: el club avanza solo, y si sos miembro, hay reuniones.
function tarotTick(){
  const t = T();
  if(STATE.character.edad < 14) return;
  if(t.stage === 1 && (STATE.pathway.chosenPathway || (STATE.flags.mysticExposure||0) >= 20)) t.stage = 2;
  if(t.stage === 2 && (knowsLore('tarot_fool') || STATE.factions.tarotClub.discovered)) t.stage = 3;
  // Portarse bien sin testigos también se ve, de a poco.
  if(t.stage >= 2 && t.stage < 6 && chance(0.05)) tarotObserve(memoriesByCat('favor_given').length >= memoriesByCat('betrayal').length ? 2 : -1, 'viviste como viviste');
  if(!tarotMember()) return;
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat) return;
  if(STATE.time.totalMonths - (t.lastMeeting||-99) >= 3 && chance(0.6)){
    t.lastMeeting = STATE.time.totalMonths; t.meetings = (t.meetings||0) + 1;
    if(t.meetings >= 8 && (STATE.factions.tarotClub.trust||0) >= 50 && t.stage < 7){ t.stage = 7; addMilestone('faction', 'Miembro de confianza del Tarot Club'); }
    triggerEventById('tarot_meeting');
  }
}
