'use strict';
/* =========================================================================
   systems/sefirah.js — el Castillo de Sefirah.
   Muy de vez en cuando (SEFIRAH_BIRTH_CHANCE), alguien nace atado al
   palacio que flota sobre la niebla gris. No lo sabe. Etapas
   (STATE.sefirah.stage):
     0 dormido · 1 sueños grises (infancia) · 2 despierto: sabe subir
   Despierto, el castillo da cosas (adivinar sin errores, descansar la mente,
   esconderse de la mirada del mundo oculto, un poco de destino) y pide
   otras: algo más allá de la niebla también mira hacia adentro, y la silla
   de la cabecera susurra. Un Beyonder despierto puede, además, convocar su
   propio Tarot Club y sentarse a la cabecera como El Loco.
   Nadie más puede invitar a la niebla a quien ya es su dueño.
   ========================================================================= */
var SEFIRAH_BIRTH_CHANCE = 0.005;        // 1 de cada 200 vidas nuevas
const SEFIRAH_INHERIT_CHANCE = 0.35;     // si quien murió lo había despertado, la niebla puede elegir a su heredero

function SEF(){ return STATE.sefirah || (STATE.sefirah = {owner:false, stage:0, visits:0, host:false, lastVisit:-99, refusedAt:-99, clubDeclinedAt:-99, prayers:0, awakenedAge:null, inherited:false}); }
function sefirahOwner(){ return !!(STATE && STATE.sefirah && STATE.sefirah.owner); }
function sefirahAwake(){ return sefirahOwner() && STATE.sefirah.stage >= 2; }
function sefirahHost(){ return sefirahAwake() && !!STATE.sefirah.host; }

// Al nacer (o al empezar la vida de un heredero). prev: el castillo de la vida anterior.
function sefirahBirthRoll(prev){
  const s = SEF();
  const inherit = prev && prev.owner && prev.stage >= 2 && chance(SEFIRAH_INHERIT_CHANCE);
  if(!inherit && !chance(SEFIRAH_BIRTH_CHANCE)) return false;
  const c = STATE.character;
  s.owner = true; s.stage = 0; s.inherited = !!inherit;
  c.luck = clamp((c.luck??50) + 6, 0, 100);
  c.fate = (c.fate||0) + 4;
  c.spirituality = clamp((c.spirituality||0) + rndInt(3,6), 0, 100);
  // Si el heredero ya es grande, los sueños grises ya pasaron.
  if(c.edad >= 12) s.stage = 1;
  addHiddenTruth(inherit ? 'Cuando murió quien te precedió, la niebla gris no se quedó sin dueño: te eligió a vos.' : 'Naciste atado a un palacio que flota sobre una niebla gris. Nadie lo supo nunca.', {key:'sefirah_birth'});
  return true;
}
function sefirahBirthText(){
  const s = SEF();
  if(!s.owner) return '';
  return s.inherited ? ' Esa noche, toda la casa sueña con una niebla gris. Nadie lo comenta.' : ' Esa noche, la partera jura que la habitación se llenó de una niebla gris que no mojaba. Nadie le cree.';
}

// Lo que el castillo da, todo el tiempo, a quien sabe que es suyo.
function sefirahMods(){
  const m = {sanityRegen:0, research:0, fate:0, lossOfControlResist:0, ritualAccuracy:0, acting:0};
  if(!sefirahAwake()) return m;
  m.sanityRegen = 0.35; m.research = 0.05; m.fate = 6; m.lossOfControlResist = 0.04; m.ritualAccuracy = 1;
  if(sefirahHost()) m.fate += 4;
  // La vía del Loco y el castillo se reconocen.
  if(STATE.pathway.chosenPathway === 'fool'){ m.acting = 3; m.lossOfControlResist += 0.03; m.research += 0.03; }
  return m;
}
function sefirahModsKey(){ const s = STATE.sefirah; return s && s.owner ? s.stage + (s.host ? 'h' : '') : '-'; }
// La niebla esconde: lo que hacés deja menos rastro.
function sefirahAttentionMult(){ return sefirahAwake() ? 0.8 : 1; }

/* ------------------------------ el mes ------------------------------ */
function sefirahTick(){
  const s = STATE.sefirah;
  if(!s || !s.owner || STATE.gameOver) return;
  if(STATE.pendingEvent || STATE.pendingMission || STATE.combat) return;
  const c = STATE.character, now = STATE.time.totalMonths;
  if(s.stage === 0){
    if(c.edad >= 4 && chance(0.04)) triggerEventById('sef_child_dream');
    return;
  }
  if(s.stage === 1){
    if(c.edad < 12){
      if(chance(0.012)){ const id = pick(['sef_child_knock','sef_child_luck'].filter(x=>!eventHistoryOf(x))); if(id) triggerEventById(id); }
      return;
    }
    if(now - (s.refusedAt??-99) < 36) return;
    if(chance(c.edad >= 20 ? 0.08 : 0.025)) triggerEventById('sef_awakening');
    return;
  }
  // Despierto.
  if(!s.host && STATE.pathway.chosenPathway && c.edad >= 18 && s.visits >= 2 && now - (s.clubDeclinedAt??-99) >= 24 && chance(0.05)){ triggerEventById('sef_found_club'); return; }
  if(chance(s.host ? 0.025 : 0.01)){ triggerEventById('sef_prayer'); return; }
  const high = STATE.pathway.chosenPathway && STATE.pathway.sequence <= 4;
  if(chance(high ? 0.012 : 0.005) && !eventRecent('sef_gaze', 48)){ triggerEventById('sef_gaze'); return; }
  if(s.visits >= 6 && chance(0.008) && !eventRecent('sef_whispers', 60)) triggerEventById('sef_whispers');
}
function eventRecent(id, months){ const h = eventHistoryOf(id); return !!h && STATE.time.totalMonths - h.last < months; }

/* ------------------------------ despertar ------------------------------ */
function sefirahAwaken(){
  const s = SEF(), c = STATE.character;
  s.stage = 2; s.awakenedAge = c.edad;
  applyEffects({spirituality:[8,14], sanity:[3,6]});
  c.luck = clamp((c.luck??50) + 6, 0, 100); c.fate = (c.fate||0) + 4;
  learnLore('sefirah_castle', 'la niebla gris');
  addClue({pathway:'fool', reliability:'real', strength:[6,10], source:'el palacio sobre la niebla', silent:true});
  revealHiddenTruthByKey('sefirah_birth', 'la niebla gris');
  remember('sefirah_awake', 'Subiste por primera vez al palacio sobre la niebla gris. Es tuyo.', {cat:'mystery'});
  addMilestone('mystic', 'Despierta en el Castillo de Sefirah');
  queueSeal({kind:'sefirah'});
  invalidatePathwayMods();
  STATE._importantMoment = true;
  return 'Das cuatro pasos en sentido contrario a las agujas del reloj y decís, casi sin voz, las palabras que te enseñaron los sueños. El cuarto se deshace. Estás en un palacio enorme, antiguo, de columnas altísimas, flotando sobre una niebla gris sin fondo. Hay una mesa larga de bronce y veintidós sillas de respaldo alto. La de la cabecera te espera. Sabés, sin que nadie te lo diga, que todo esto es tuyo. Y que nadie, ni siquiera un dios, puede ver lo que pasa acá adentro.';
}
function revealHiddenTruthByKey(key, how){
  const h = (STATE.hiddenTruths||[]).find(x=>x.key===key && !x.revealed);
  if(h) revealHiddenTruth(h.id, how);
}

/* ------------------------------ subir a la niebla ------------------------------ */
// Una visita por temporada: cada una es tiempo libre y deja al castillo más cerca.
const SEFIRAH_ACTIONS = [
  {id:'divine', label:'Adivinar sobre la niebla', small:'Acá arriba, la adivinación no se equivoca.'},
  {id:'rest', label:'Descansar en el palacio', small:'El silencio de la niebla ordena la cabeza.'},
  {id:'hide', label:'Esconderte bajo la niebla', small:'Que el mundo oculto te pierda el rastro.'}
];
function sefirahCanVisit(){
  if(!sefirahAwake()) return {ok:false, why:'Todavía no sabés subir.'};
  if(STATE.character.edad < 12) return {ok:false, why:'Todavía sos demasiado chico.'};
  if(!canUseSeasonAction('castle')) return {ok:false, why:'Ya subiste esta temporada.'};
  if(!canSpendFreeTime(1)) return {ok:false, why:'Sin tiempo libre.'};
  return {ok:true};
}
function sefirahVisit(id){
  if(timeBlocked()) return;
  const av = sefirahCanVisit();
  if(!av.ok){ toast(av.why, 'neg'); return; }
  const a = SEFIRAH_ACTIONS.find(x=>x.id===id); if(!a) return;
  spendFreeTime(1); useSeasonAction('castle'); markMysticAct();
  const s = SEF(); s.visits = (s.visits||0) + 1; s.lastVisit = STATE.time.totalMonths;
  const before = snapshotForChanges();
  let text = '';
  if(id === 'divine'){
    const unv = unverifiedClues();
    if(unv.length){
      const cl = pick(unv);
      const res = verifyClue(cl.id, 'la adivinación sobre la niebla gris');
      text = res === 'real' ? `Sentado en la cabecera, hacés la pregunta. La respuesta llega limpia: la pista de ${cl.source||'aquella vez'} es cierta.` : `Sentado en la cabecera, hacés la pregunta. La respuesta llega limpia: la pista de ${cl.source||'aquella vez'} era falsa.`;
    } else {
      applyEffects({clue:{pathway:STATE.pathway.chosenPathway || (chance(0.5) ? 'fool' : '$random'), reliability:'real', strength:[4,8], source:'la niebla gris'}});
      text = 'Preguntás al vacío algo que no sabías cómo preguntar. La niebla se abre un momento y ves una página, una fórmula a medias, una cara. Lo anotás apenas volvés.';
    }
    if(chance(0.3)){ const h = revealRandomHiddenTruth('la adivinación sobre la niebla gris'); if(h) text += ' Y de paso, ves algo de tu propia vida que nunca entendiste.'; }
    applyEffects({spirituality:-2});
  } else if(id === 'rest'){
    applyEffects({sanity:[6,12]});
    if(STATE.character.corruption > 0) applyEffects({corruption:-rndInt(0,2)});
    text = 'Te sentás en la silla de la cabecera y no hacés nada. No hay ruido, no hay nadie, no hay nada que pedir. Cuando volvés, el mundo pesa un poco menos.';
  } else if(id === 'hide'){
    STATE.world.attention = Math.max(0, (STATE.world.attention||0) - rndInt(12,22));
    FACTION_KEYS.forEach(k=>{ STATE.factions[k].suspicion = Math.max(0, (STATE.factions[k].suspicion||0) - 6); });
    const hunted = huntingFactions();
    if(hunted.length && chance(0.3)){ const h = pick(hunted); F(h).hunted = false; F(h).suspicion = Math.max(0, F(h).suspicion - 20); text = `Envolvés tu nombre en la niebla. ${cap(factionShort(h))} pierde tu rastro y, al tiempo, deja de buscarte.`; }
    else text = 'Envolvés tu nombre en la niebla. Durante semanas, quien intenta adivinar dónde estás ve sólo gris.';
  }
  logJournal('Sobre la niebla gris', text, {cat:'mystery'});
  setResolution(a.label, text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}

/* ------------------------------ el club propio ------------------------------ */
function sefirahFoundClub(){
  const s = SEF(), t = T();
  s.host = true;
  t.stage = 6; t.card = 'El Loco'; t.host = true; t.joinedAt = STATE.time.totalMonths; t.lastMeeting = STATE.time.totalMonths;
  const f = STATE.factions.tarotClub;
  f.known = true; f.discovered = true; f.relationship = 'miembro'; f.joined = calendarYear(); f.access = Math.max(f.access, 3); f.trust = Math.max(f.trust, 30);
  learnLore('tarot_fool', 'tu propia boca');
  STATE.anchors.followerBonus = (STATE.anchors.followerBonus||0) + 1;
  remember('tarot_joined', 'Convocaste a otros a la niebla gris y te sentaste a la cabecera como "El Loco".', {cat:'organization', faction:'tarotClub'});
  addMilestone('faction', 'Funda el Tarot Club — "El Loco"');
  queueSeal({kind:'tarot', card:'El Loco'});
  invalidatePathwayMods();
  STATE._importantMoment = true;
  return 'Tocás las dos estrellas carmesí. Del otro lado de la niebla, dos personas que no se conocen se despiertan sentadas frente a una mesa de bronce, mirando a una figura envuelta en gris que ocupa la cabecera. Vos. Les das un nombre de carta a cada uno. A vos te llaman El Loco.';
}
