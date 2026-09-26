'use strict';
/* =========================================================================
   systems/lineage.js — el linaje.
   Cuando una vida termina, la historia puede seguir con alguien de tu
   sangre: un hijo o una hija que siga con vida. El mundo sigue igual (el
   año, la ciudad, las organizaciones, la historia del mundo) y el heredero
   arranca con lo que le toca:
     - su parte de la herencia, según el testamento (la casa y las
       propiedades van a quien sigue la historia, salvo que el testamento
       diga otra cosa);
     - el baúl de la familia: libros, documentos, fórmulas, ingredientes y
       artefactos (lo prestado vuelve a su dueño; la carta del Tarot, no se
       hereda);
     - el diario de quien murió, que enseña algo de lo que sabía;
     - si era Beyonder y murió de una forma que deja algo, su Característica.
       Y quien la guarda llama la atención de quien la busca.
   También hereda lo que no se ve: el apellido pesa, las organizaciones
   recuerdan a la familia, y la gente que te quería (o te temía) lo mira
   distinto. Lo que no se hereda es lo que se sabía: el mundo oculto se
   descubre de nuevo, con alguna ventaja si el heredero sabía lo que eras.
   Quien llega a los sesenta puede cerrar su vida cuando quiera (closeLife).
   ========================================================================= */
const LINEAGE_KEEP = 12;           // generaciones que se guardan con su biografía
const CLOSE_LIFE_MIN_AGE = 60;
function lineageData(){ return STATE.lineage || (STATE.lineage = {lives:[]}); }
function generationNumber(){ return lineageData().lives.length + 1; }
function npcGx(n, m, f, x){ return n && n.gender === 'm' ? m : n && n.gender === 'f' ? f : (x || m); }
function firstNameOf(n){
  const sur = ' ' + STATE.character.apellido;
  return n.name.endsWith(sur) ? n.name.slice(0, -sur.length) : n.name.split(' ')[0];
}

/* ------------------------------ herederos ------------------------------ */
// Los de tu sangre: hijos e hijas vivos.
function bloodHeirs(){
  return childrenNpcs().filter(n=>n.alive && n.lifeState !== 'desaparecido').sort((a,b)=>npcAge(b)-npcAge(a));
}
// Quién puede seguir la historia: la familia primero, después tus discípulos
// (systems/disciples.js). Un hijo que además es tu discípulo cuenta como hijo.
function lineageHeirs(){
  const kids = bloodHeirs();
  const dis = disciples().filter(n=>!kids.includes(n) && n.lifeState !== 'desaparecido').sort((a,b)=>npcAge(b)-npcAge(a));
  return kids.concat(dis);
}
function isDiscipleHeir(n){ return !!n && !!n.disciple && !n.id.startsWith('hijo'); }
function discipleCount(){ return disciples().filter(n=>!n.id.startsWith('hijo') && n.lifeState !== 'desaparecido').length; }
// Con quién puede seguir, en palabras.
function heirsWord(){
  const kids = bloodHeirs().length, dis = lineageHeirs().length - kids;
  return kids && dis ? 'alguien de tu familia o uno de tus discípulos' : dis ? 'uno de tus discípulos' : 'alguien de tu familia';
}

/* ------------------------------ la herencia ------------------------------ */
// Qué objetos pasan al baúl de la familia.
function isHeirloom(it){
  if(!it || it.qty <= 0 || it.loan) return false;
  if(it.def === 'tarot_card') return false;           // la silla en la niebla no se hereda
  return ['book','document','formula','ingredient','potion','characteristic','artifact','weapon','misc'].includes(it.cat);
}
// La Característica de quien murió: se condensa donde murió... si nadie se la
// llevó antes (se decide una sola vez, para que lo que se muestra y lo que se
// hereda sea lo mismo).
function parentCharacteristic(){
  const p = STATE.pathway, ed = STATE.endingData || {};
  if(!p.chosenPathway || typeof p.sequence !== 'number' || p.sequence <= 0 || ed.category === 'divine') return null;
  const cause = ed.meta && ed.meta.cause;
  const fl = STATE.flags;
  if(fl.lineageCharacteristic === undefined){
    let left;
    if(['control','locura','niebla','prueba','retiro'].includes(cause)) left = false;   // se la llevaron, o nadie murió
    else if(cause === 'combate') left = chance(0.5);                                   // a veces, el que te mató
    else left = true;
    fl.lineageCharacteristic = left;
  }
  return fl.lineageCharacteristic ? {pathway:p.chosenPathway, seq:p.sequence} : null;
}
// Cómo se reparte: primero lo que pide el testamento, después la parte de
// quien queda viudo, después los hijos.
function inheritancePlan(heir){
  if(isDiscipleHeir(heir)) return disciplePlan(heir);
  const c = STATE.character;
  const kids = bloodHeirs();
  const net = Math.max(0, Math.round(c.cash + c.bank - c.debt));
  const will = STATE.flags.will || '';
  const fav = will.startsWith('favorite:') ? will.slice(9) : null;
  const favAlive = fav && kids.some(k=>k.id === fav);
  // Si el testamento favorece a un discípulo, los hijos se reparten el resto.
  const favDisciple = !!fav && !favAlive && disciples().some(n=>n.id === fav);
  let pot = net, charity = 0, spouseShare = 0;
  if(will === 'charity' && pot > 0){ charity = Math.round(pot*0.2); pot -= charity; }
  // Si hay discípulos, un legado para ellos (un décimo, entre todos), salvo
  // que uno se lleve casi todo por testamento.
  if(pot > 0 && discipleCount() && !favDisciple) pot -= Math.round(pot*0.1);
  const spouse = spouseNpc();
  if(spouse && pot > 0){ spouseShare = Math.round(pot*0.4); pot -= spouseShare; }
  let money;
  if(favAlive) money = heir.id === fav ? Math.round(pot * (kids.length > 1 ? 0.7 : 1)) : Math.round(pot*0.3 / Math.max(1, kids.length-1));
  else if(favDisciple) money = Math.round(pot*0.3 / Math.max(1, kids.length));
  else money = Math.round(pot / Math.max(1, kids.length));
  const keeps = (!favAlive || heir.id === fav) && !favDisciple;          // la casa y las propiedades
  return {money, house: keeps && !!c.vivienda, props: keeps ? (c.properties||[]).length : 0,
    items: inventoryItems().filter(isHeirloom).length, characteristic: parentCharacteristic(), net, charity,
    spouse: spouse ? {name:spouse.name, gender:spouse.gender, amount:spouseShare} : null,
    favored: (favAlive && heir.id !== fav) || favDisciple ? npcById(fav).name : null};
}
// Un discípulo: si hay familia, un legado (el baúl y una parte chica); si no
// hay nadie de tu sangre, o el testamento lo favorece, casi todo.
function disciplePlan(heir){
  const c = STATE.character;
  const kids = bloodHeirs(), spouse = spouseNpc();
  const net = Math.max(0, Math.round(c.cash + c.bank - c.debt));
  const will = STATE.flags.will || '';
  const favored = will === 'favorite:' + heir.id;
  const family = kids.length > 0 || !!spouse;
  let pot = net, charity = 0;
  if(will === 'charity' && pot > 0){ charity = Math.round(pot*0.2); pot -= charity; }
  // Por testamento: lo mismo que se hubiera llevado un hijo favorito (después de la parte de quien queda viudo).
  const spouseShare = favored && spouse && pot > 0 ? Math.round(pot*0.4) : 0;
  const money = favored ? Math.round((pot - spouseShare) * (kids.length ? 0.7 : 1)) : family ? Math.round(Math.round(pot * 0.1) / Math.max(1, discipleCount())) : Math.round(pot / Math.max(1, discipleCount()));
  const keeps = favored || !family;
  return {money, house: keeps && !!c.vivienda, props: keeps ? (c.properties||[]).length : 0,
    items: inventoryItems().filter(isHeirloom).length, characteristic: parentCharacteristic(), net, charity,
    spouse:null, favored:null, disciple:true, family, seq: discipleSeq(heir), pathway: heir.disciple.pathway};
}

/* ------------------------------ piezas compartidas ------------------------------ */
// La vida que termina queda en la historia (de la familia, o de la línea de maestros).
function recordLife(heirName, heirKind){
  const oldC = STATE.character, oldP = STATE.pathway, ed = STATE.endingData || {};
  const lives = lineageData().lives;
  lives.push({nombre:oldC.nombre, apellido:oldC.apellido, genero:oldC.genero, born: oldC.birthYear || (calendarYear() - oldC.edad), died: ed.year || calendarYear(),
    age: oldC.edad, title: ed.title || '', category: ed.category || '', cause: (ed.meta && ed.meta.cause) || '', epitaph: ed.epitaph || '', text: ed.text || '',
    paragraphs: (ed.paragraphs || []).slice(0, 14), pathway: oldP.chosenPathway, seq: oldP.chosenPathway ? oldP.sequence : null, heir: heirName, heirKind: heirKind || 'hijo'});
  if(lives.length > LINEAGE_KEEP) lives.slice(0, lives.length - LINEAGE_KEEP).forEach(l=>{ l.paragraphs = []; l.text = ''; });
}
// Lo que pasa al baúl (antes de vaciar el inventario).
function heirloomChest(fromName){
  return inventoryItems().filter(isHeirloom).map(it=>Object.assign({}, it, {provenance: it.provenance && !/herencia/.test(it.provenance) ? `${it.provenance}; herencia de ${fromName}` : it.provenance}));
}
// El paso al personaje nuevo: se conserva el mundo (la fecha, la historia, las
// ciudades, los precios, quién es quién, tu organización) y las organizaciones
// recuerdan a la familia, para bien o para mal.
function enterHeirState(fresh, clase, fromName, characteristic){
  const keep = {settings:STATE.settings, time:STATE.time, world:STATE.world, npcs:STATE.npcs, nextId:STATE.nextId, lineage:STATE.lineage, org:STATE.org};
  const oldFactions = STATE.factions, oldTarot = STATE.tarot, oldAttention = STATE.world.attention || 0;
  const pcs = (STATE.pendingConsequences||[]).filter(pc=>pc && !pc.eventId && !pc.ctx && !pc.memory && pc.effect && Object.keys(pc.effect).every(k=>['war','allCities'].includes(k)));
  const orgHistory = (STATE.flags && STATE.flags.orgHistory) || null;
  STATE = fresh;
  Object.assign(STATE, keep);
  STATE.version = SAVE_VERSION;
  STATE.started = true; STATE.gameOver = false; STATE.endingData = null;
  STATE.pendingConsequences = pcs;
  STATE.flags.startClass = clase;
  STATE.flags.lineageFrom = fromName;
  FACTION_KEYS.forEach(k=>{
    const o = oldFactions[k], f = STATE.factions[k];
    if(!o || !f) return;
    f.formulas = o.formulas || f.formulas; f.strength = o.strength ?? f.strength;
    f.known = f.known || (o.known && k !== 'tarotClub');
    if(k !== 'tarotClub' && (o.relationship === 'miembro' || o.access >= 3) && !o.hunted){ f.known = true; f.trust = 10; f.publicRep = 5; f.relationship = 'neutral'; }
    if(o.hunted || ['enemiga','traicionada','persiguiendo'].includes(o.relationship)){ f.known = true; f.suspicion = 25; }
  });
  if(oldTarot && oldTarot.stage >= 3) STATE.tarot.stage = 1;
  STATE.world.attention = Math.round(oldAttention*0.25) + (characteristic ? 10 : 0);
  STATE.bmOffers = null;
  if(orgHistory) STATE.flags.orgHistory = orgHistory;
}
// Un discípulo sigue la historia como Beyonder de la vía de su maestro: sabe su
// nombre, conoce el Método de Actuación y arranca en la Sequence a la que llegó.
function applyDiscipleContinuity(d, seq, oldP, masterName){
  const p = STATE.pathway, pw = d && d.pathway;
  if(!pw || !PATHWAYS[pw]) return;
  p.identified[pw] = true; p.firstDiscoveryShown[pw] = true;
  p.knowledge[pw] = Math.max(p.knowledge[pw]||0, Math.round(Math.max(55, ((oldP.knowledge||{})[pw]||60) * 0.7)));
  p.belief[pw] = Math.max(p.belief[pw]||0, p.knowledge[pw]);
  p.actingMethod = 2; p.actingMethodProgress = 2;
  if(LORE.acting_method && !knowsLore('acting_method')) (STATE.lore[LORE.acting_method.cat] = STATE.lore[LORE.acting_method.cat] || []).push('acting_method');
  if(typeof seq === 'number'){
    p.chosenPathway = pw; p.sequence = seq; p.digestion = rndInt(35, 70);
    p.potionMonth = STATE.time.totalMonths - rndInt(6, 36);
    STATE.flags.beyonderSince = STATE.time.totalMonths;
  }
  STATE.flags.mysticExposure = Math.max(STATE.flags.mysticExposure||0, 40);
  addClue({pathway:pw, reliability:'real', strength:[8,12], source:`lo que te enseñó ${masterName}`, silent:true});
  STATE.pendingSeals = [];
  invalidatePathwayMods();
}

/* ------------------------------ seguir con el linaje ------------------------------ */
function succeedAs(heirId){
  if(!STATE.gameOver) return false;
  const heir = lineageHeirs().find(n=>n.id === heirId);
  if(!heir) return false;
  if(isDiscipleHeir(heir)) return succeedAsDisciple(heir);
  const oldC = STATE.character, oldP = STATE.pathway, ed = STATE.endingData || {};
  // Un hijo que además era tu discípulo sigue como Beyonder de tu vía.
  const heirDisciple = heir.disciple ? Object.assign({}, heir.disciple) : null, heirSeq = heir.disciple ? discipleSeq(heir) : null;
  const plan = inheritancePlan(heir);
  const parentName = `${oldC.nombre} ${oldC.apellido}`;
  const retired = ed.meta && ed.meta.cause === 'retiro';
  const heirAge = npcAge(heir), shift = heir.ageOffset;
  const oldGender = oldC.genero;
  const heirKnew = !!(heir.knows && (heir.knows.beyonder || heir.knows.partial));

  // 1. La vida que termina queda en la historia de la familia.
  recordLife(heir.name, 'hijo');

  // 2. Lo que pasa al baúl (antes de vaciar el inventario).
  const chest = heirloomChest(parentName);

  // 3. La familia, vista desde el heredero. Las edades de los NPCs son
  //    relativas al personaje: se corren a la del heredero.
  STATE.npcs = STATE.npcs.filter(n=>n.id !== heir.id);
  STATE.npcs.forEach(n=>{
    if(typeof n.ageOffset === 'number') n.ageOffset -= shift;
    n.links = (n.links||[]).filter(l=>l && l.id !== heir.id);
  });
  const renamed = new Map();          // id original → id nuevo (para los vínculos entre NPCs)
  const reid = (n, id, role)=>{ if(!renamed.has(n.id)) renamed.set(n.id, id); n.id = id; if(role) n.role = role; };
  let tio = 0, sib = 0;
  // Lo que ya era de generaciones anteriores se corre un lugar.
  STATE.npcs.slice().forEach(n=>{
    if(n.id === 'abuelo' || n.id === 'abuela') reid(n, uid('bisabuel'), npcGx(n, 'Bisabuelo', 'Bisabuela'));
    else if(/^tio\d+$/.test(n.id)) reid(n, uid('tioabuel'), npcGx(n, 'Tío abuelo', 'Tía abuela'));
  });
  STATE.npcs.slice().forEach(n=>{
    if(n.id === 'padre') reid(n, 'abuelo', 'Abuelo');
    else if(n.id === 'madre') reid(n, 'abuela', 'Abuela');
    else if(n.id.startsWith('hermano')) reid(n, 'tio' + (++tio), npcGx(n, 'Tío', 'Tía'));
    else if(n.id === 'amigo') reid(n, uid('amigo_fam'), `${npcGx(n, 'Amigo', 'Amiga')} de ${oldGender === 'Mujer' ? 'tu madre' : 'tu padre'}`);
  });
  STATE.npcs.slice().forEach(n=>{
    if(n.id.startsWith('hijo')) reid(n, 'hermano' + (++sib), npcGx(n, 'Hermano', 'Hermana'));
  });
  // Quien muere (o se retira) pasa a ser el padre o la madre del heredero; su
  // pareja, el otro.
  const parentId = oldGender === 'Mujer' ? 'madre' : 'padre';
  const otherId = parentId === 'madre' ? 'padre' : 'madre';
  STATE.npcs.slice().forEach(n=>{
    if(n.id === 'conyuge') reid(n, otherId, npcGx(n, 'Padre', 'Madre'));
    else if(n.id === 'pareja') reid(n, uid('pareja_fam'), `Pareja de ${oldGender === 'Mujer' ? 'tu madre' : 'tu padre'}`);
  });
  STATE.npcs.forEach(n=>{ (n.links||[]).forEach(l=>{ if(renamed.has(l.id)) l.id = renamed.get(l.id); }); });
  const parent = createNpc({id:parentId, name:parentName, gender: oldGender === 'Mujer' ? 'f' : oldGender === 'Hombre' ? 'm' : 'x',
    role: oldGender === 'Mujer' ? 'Madre' : oldGender === 'Hombre' ? 'Padre' : 'Progenitor', relType:'family', tier:'importante',
    age:0, met:true, allowHidden:false, clase:oldC.clase, profession: oldC.profesion,
    trust: heir.trust, affection: heir.affection, loyalty: heir.loyalty, respect: heir.respect});
  parent.ageOffset = oldC.edad - heirAge;
  parent.personality = []; parent.goals = []; parent.secrets = [];
  if(oldP.chosenPathway){ parent.hidden = {pathway:oldP.chosenPathway, sequence:oldP.sequence, faction: memberFactions().find(k=>k !== 'tarotClub') || null}; parent.known.pathway = heirKnew; }
  if(retired){ parent.lifeState = 'lejos'; }
  else { parent.alive = false; parent.cause = (ed.meta && ed.meta.cause) || 'muerte'; parent.deathYear = calendarYear(); }
  // Lo que la gente sentía por vos, el heredero lo hereda a medias.
  const family = new Set(['abuelo','abuela','padre','madre']);
  STATE.npcs.forEach(n=>{
    if(n === parent) return;
    n.knows = {beyonder:false, partial:false};
    n.known = {pathway:false, sequence:false, faction:false, goals:false, fears:false};
    (n.secrets||[]).forEach(s=>{ s.known = false; });
    const fam = family.has(n.id) || n.id.startsWith('hermano') || n.id.startsWith('tio');
    if(fam){
      n.met = true;
      const [t, a] = n.id === otherId ? [[60,85],[65,90]] : n.id.startsWith('hermano') ? [[40,70],[45,75]] : n.id.startsWith('tio') ? [[30,55],[30,60]] : [[50,70],[55,80]];
      Object.assign(n, {trust:rndInt(t[0],t[1]), affection:rndInt(a[0],a[1]), loyalty:rndInt(30,70), respect:rndInt(30,60), suspicion:0, fear:0, dependence:0});
      n.relType = 'family';
    } else {
      const close = n.met && bondScore(n) >= 60;
      if(close){ n.trust = Math.round(n.trust*0.5); n.affection = Math.round(n.affection*0.5); n.loyalty = Math.round(n.loyalty*0.4); n.flags.familyFriend = true; }
      else { n.met = false; n.trust = rndInt(8,25); n.affection = rndInt(5,20); n.loyalty = rndInt(5,20); n.dependence = 0; }
      // El apellido pesa: el miedo y la sospecha que dejaste, a medias.
      n.suspicion = Math.round((n.suspicion||0)*0.4); n.fear = Math.round((n.fear||0)*0.3);
    }
    n.interactions = 0;
    // Tus otros discípulos siguen ahí, pero ya no son de nadie (y los que se
    // fueron antes ya no cuentan como discípulos de quien sigue la historia).
    if(n.disciple){ delete n.disciple; if(heirDisciple) n.flags.fellowDisciple = true; if(!isFamilyNpc(n)) n.role = `${npcGx(n, 'Discípulo', 'Discípula')} de ${oldGender === 'Mujer' ? 'tu madre' : 'tu padre'}`; }
    delete n.flags.formerDisciple;
  });

  // 4. El personaje nuevo.
  const heirG = heir.gender === 'f' ? 'Mujer' : heir.gender === 'm' ? 'Hombre' : '';
  const heirFirst = firstNameOf(heir);
  const clase = plan.net >= 15000 ? 'Alta' : (plan.net < 300 && oldC.clase === 'Alta') ? 'Media' : oldC.clase;
  let rasgos = rollRandomTraits(3);
  const inheritedTrait = (oldC.rasgos||[]).filter(r=>!rasgos.includes(r))[0];
  if(inheritedTrait && chance(0.5)) rasgos = [inheritedTrait, ...rasgos.slice(0, 2)];
  const tm = computeTraitMods(rasgos);
  const eduFor = (a)=> a < 6 ? 'Sin escolarizar' : a < 13 ? 'Primaria (en curso)' : a < 18 ? 'Secundaria (en curso)' : (heir.flags.path === 'estudiar en la universidad' ? 'Universitaria completa' : 'Secundaria completa');
  const job = heirAge >= 18 && heir.profession && heir.profession !== '—' && heir.profession !== 'Estudiante' ? (NPC_JOB_EQUIV[heir.profession] || (JOBS[heir.profession] ? heir.profession : null)) : null;
  const fresh = freshState();
  const c = fresh.character;
  Object.assign(c, {nombre:heirFirst, apellido:oldC.apellido, edad:heirAge, genero:heirG, ciudad:oldC.ciudad, birthCity:oldC.ciudad, birthYear: calendarYear() - heirAge,
    clase, rasgos, profesion: job || (heirAge >= 6 && heirAge < 18 ? 'Estudiante' : 'Desempleado'), educacion: eduFor(heirAge),
    estadoCivil: heir.flags.married ? 'Casado/a' : 'Soltero/a'});
  c.salud = clamp((heirAge < 55 ? rndInt(80,96) : rndInt(62,82)) + tm.startSalud, 1, 100);
  c.sanity = clamp(rndInt(74,90) + tm.startSanity - (retired ? 0 : 4), 1, 100);
  c.spirituality = clamp(rndInt(3,14) + tm.startSpirituality + (oldP.chosenPathway ? rndInt(2,8) : 0), 0, 100);
  c.reputation = clamp(Math.round((oldC.reputation||0)*0.3) + tm.startReputation, -100, 100);
  c.luck = clamp(rndInt(40,60), 0, 100); c.fate = rndInt(0,6);
  c.rasgos.forEach(r=>{ const f = TRAIT_FORTUNE[r]; if(f){ c.luck = clamp(c.luck + (f.luck||0), 0, 100); c.fate += f.fate||0; } });
  const allowance = heirAge < 16 ? Math.min(plan.money, 40) : Math.round(plan.money*0.15);
  c.cash = Math.round(allowance + (heirAge >= 16 ? tm.startCash : 0));
  c.bank = Math.max(0, plan.money - allowance);
  if(plan.house) c.vivienda = Object.assign({}, oldC.vivienda);
  if(plan.props) c.properties = (oldC.properties||[]).map(p=>Object.assign({}, p));
  // Lo que se conserva del mundo (ver enterHeirState).
  enterHeirState(fresh, clase, parentName, plan.characteristic);
  // Lo que el heredero sabía de lo que eras.
  if(heirKnew && oldP.chosenPathway){
    addClue({pathway:oldP.chosenPathway, reliability:'real', strength:[10,16], source:`lo que sabías de ${parentName}`});
    STATE.pendingSeals = [];   // ya lo sabía: no hay revelación que mostrar encima del legado
  }

  // 5. El baúl, el diario y la Característica.
  chest.forEach(it=>STATE.inventory.items.push(it));
  const diaryPathway = oldP.chosenPathway || Object.keys(oldP.knowledge||{}).sort((a,b)=>(oldP.knowledge[b]||0)-(oldP.knowledge[a]||0)).find(k=>(oldP.knowledge[k]||0) >= 25) || null;
  const dd = ITEM_DEFS.book_family_diary;
  addItem({cat:'book', def:'book_family_diary', name:`El diario de ${parentName}`, rarity:dd.rarity, uses:dd.uses, risk: diaryPathway ? dd.risk : 'Ninguno.',
    desc: diaryPathway ? 'Años de anotaciones. Muchas son de todos los días; algunas hablan de cosas que no deberían existir.' : 'Años de anotaciones de todos los días: el tiempo, la plata, la familia. Leerlo es volver a escuchar su voz.',
    read: diaryPathway
      ? {clue:{pathway:diaryPathway, reliability:'real', strength: oldP.chosenPathway ? [9,15] : [5,9], source:`el diario de ${parentName}`}, lore:{cat:'fact', chance:0.5}, acting: oldP.actingMethod >= 2 ? 0.35 : 0, sanity:[-2,0]}
      : {sanity:[2,5]},
    provenance:`herencia de ${parentName}`}, 1);
  if(plan.characteristic){
    addCharacteristic(plan.characteristic.pathway, plan.characteristic.seq, `lo que quedó de ${parentName}`);
    addHiddenTruth(`Alguien más sabía que ${parentName} había sido Beyonder, y que su Característica había quedado en la familia.`, {key:'lineage_char'});
  }
  // Si además era tu discípulo, sigue como Beyonder de tu vía.
  if(heirDisciple) applyDiscipleContinuity(heirDisciple, heirSeq, oldP, parentName);
  // Tu organización pasa a quien sigue la historia.
  const orgNote = STATE.org ? orgPassTo(`${heirFirst} ${oldC.apellido}`, heirKnew || !!heirDisciple) : '';

  // 6. Tu propia gente: un amigo (el heredero ya tenía su vida) y, si la
  //    tenía, su propia familia.
  const fg = chance(0.5) ? 'm' : 'f';
  createNpc({id:'amigo', gender:fg, role: fg==='f' ? (heirAge < 13 ? 'Amiga de la infancia' : 'Amiga') : (heirAge < 13 ? 'Amigo de la infancia' : 'Amigo'), relType:'friend', tier:'recurrente',
    age: Math.max(0, heirAge + rndInt(-1,1)), met: heirAge >= 6, allowHidden:false, trust: heirAge >= 6 ? rndInt(30,50) : 10, affection: heirAge >= 6 ? rndInt(30,50) : 10, loyalty:rndInt(15,35)});
  if(heir.flags.married){
    const sg = heir.gender === 'f' ? 'm' : heir.gender === 'm' ? 'f' : (chance(0.5) ? 'm' : 'f');
    createNpc({id:'conyuge', gender:sg, role:'Cónyuge', relType:'family', tier:'importante', age: Math.max(18, heirAge + rndInt(-4,4)), met:true, allowHidden:false,
      clase, trust:rndInt(55,80), affection:rndInt(55,85), loyalty:rndInt(50,80)});
  }
  for(let i=0; i<Math.min(4, heir.flags.kids||0); i++){
    const g = chance(0.5) ? 'm' : 'f';
    const kidAge = clamp(heirAge - 22 - i*rndInt(2,4), 0, Math.max(0, heirAge - 16));
    createNpc({id:'hijo'+(i+1), name: randomFirstName(g)+' '+oldC.apellido, gender:g, role: g==='f' ? 'Hija' : 'Hijo', relType:'family', tier:'importante',
      age: kidAge, met:true, allowHidden:false, clase, profession: kidAge >= 18 ? undefined : kidAge >= 6 ? 'Estudiante' : '—', trust:rndInt(55,80), affection:rndInt(60,85), loyalty:rndInt(45,75)}).personality = rollPersonality();
  }

  // 7. El comienzo.
  STATE.milestones.push({kind:'birth', text:`Nace en ${c.ciudad}, ${npcGx(heir,'hijo','hija','hije')} de ${parentName}`, edad:0, year: Math.max(1, STATE.time.year - heirAge), cy: c.birthYear});
  const ord = ['','primera','segunda','tercera','cuarta','quinta','sexta','séptima','octava','novena','décima'][generationNumber()] || `${generationNumber()}ª`;
  addMilestone('family', retired ? `${parentName} se retira del mundo y le deja todo` : `Hereda lo que dejó ${parentName}`);
  const bits = [];
  if(plan.money > 0) bits.push(`${fmtMoney(plan.money)}${heirAge < 16 ? ', guardados en el banco hasta que crezca' : ''}`);
  if(plan.house) bits.push('la casa de la familia');
  if(plan.props) bits.push(plan.props === 1 ? 'una propiedad que se alquila' : `${plan.props} propiedades que se alquilan`);
  if(chest.length) bits.push(chest.length === 1 ? 'un objeto del baúl de la familia' : `${chest.length} objetos del baúl de la familia`);
  bits.push(`el diario de ${npcGx(parent, 'tu padre', 'tu madre', 'quien te crió')}`);
  if(plan.characteristic) bits.push('algo que late dentro de una caja cerrada');
  const notes = [];
  if(plan.charity) notes.push(`Una parte (${fmtMoney(plan.charity)}) fue al hospital de caridad, como pedía el testamento.`);
  if(plan.spouse && plan.spouse.amount) notes.push(`${plan.spouse.name}, ${plan.spouse.gender === 'f' ? 'tu madre' : plan.spouse.gender === 'm' ? 'tu padre' : 'tu otro progenitor'}, se queda con ${fmtMoney(plan.spouse.amount)}.`);
  if(plan.favored) notes.push(`El testamento favorecía a ${plan.favored}.`);
  const intro = `${retired ? `${parentName} se fue del mundo, como se van los que ya vieron demasiado.` : `${parentName} ya no está.`} ${heirFirst} ${oldC.apellido} tiene ${heirAge} años${ord ? ` y es la ${ord} generación de la familia en esta historia` : ''}. Le quedan ${bits.join(', ')}. ${notes.join(' ')}`.replace(/\s+/g, ' ').trim();
  const extra = [];
  if(heirDisciple) extra.push(typeof heirSeq === 'number'
    ? `${cap(npcGx(parent, 'tu padre', 'tu madre', 'quien te crió'))} también fue ${npcGx(parent, 'tu maestro', 'tu maestra', 'quien te enseñó')}: sos Beyonder de la vía ${PATHWAYS[heirDisciple.pathway].name}, Sequence ${heirSeq}.`
    : `${cap(npcGx(parent, 'tu padre', 'tu madre', 'quien te crió'))} también te enseñó su vía, aunque todavía no tomaste tu primera poción.`);
  if(orgNote) extra.push(orgNote);
  const legacyText = intro + (extra.length ? ' ' + extra.join(' ') : '');
  logJournal('El legado', legacyText, {cat:'family', imp:3});
  remember('parent_legacy', `${parentName} te dejó ${bits.join(', ')}.`, {cat:'person', npc:parentId});
  seasonStart();
  STATE._yearSnap = {profesion:c.profesion, educacion:c.educacion, estadoCivil:c.estadoCivil, ciudad:c.ciudad, seq: STATE.pathway.chosenPathway ? STATE.pathway.sequence : null, net:c.cash + c.bank};
  setResolution('El legado', legacyText, []);
  invalidatePathwayMods();
  saveGame(true);
  return true;
}

/* ------------------------------ seguir como un discípulo ------------------------------ */
// Quien sigue la historia no es de tu sangre: tu familia pasa a ser "la
// familia de tu maestro", el baúl (fórmulas, ingredientes, artefactos, la
// Característica) es para el discípulo, y la plata y la casa, para la familia
// (salvo que no haya familia, o que el testamento diga otra cosa).
function succeedAsDisciple(heir){
  const oldC = STATE.character, oldP = STATE.pathway, ed = STATE.endingData || {};
  const plan = inheritancePlan(heir);
  const masterName = `${oldC.nombre} ${oldC.apellido}`;
  const retired = ed.meta && ed.meta.cause === 'retiro';
  const heirAge = npcAge(heir), shift = heir.ageOffset;
  const oldGender = oldC.genero;
  const d = Object.assign({}, heir.disciple), seq = discipleSeq(heir);
  const mw = oldGender === 'Mujer' ? 'maestra' : oldGender === 'Hombre' ? 'maestro' : 'maestre';
  const of = 'de tu ' + mw;
  const years = Math.max(1, calendarYear() - (d.since || calendarYear()));

  recordLife(heir.name, 'discipulo');
  const chest = heirloomChest(masterName);

  // La gente de tu vida, vista desde el discípulo.
  STATE.npcs = STATE.npcs.filter(n=>n.id !== heir.id);
  STATE.npcs.forEach(n=>{
    if(typeof n.ageOffset === 'number') n.ageOffset -= shift;
    n.links = (n.links||[]).filter(l=>l && l.id !== heir.id);
  });
  const renamed = new Map();
  STATE.npcs.slice().forEach(n=>{
    let role = null;
    if(n.id === 'conyuge') role = `${retired ? npcGx(n, 'Esposo', 'Esposa') : npcGx(n, 'Viudo', 'Viuda')} ${of}`;
    else if(n.id === 'pareja') role = `Pareja ${of}`;
    else if(n.id.startsWith('hijo')) role = `${npcGx(n, 'Hijo', 'Hija')} ${of}`;
    else if(n.id === 'padre' || n.id === 'madre') role = `${npcGx(n, 'Padre', 'Madre')} ${of}`;
    else if(n.id.startsWith('hermano')) role = `${npcGx(n, 'Hermano', 'Hermana')} ${of}`;
    else if(['abuelo','abuela'].includes(n.id) || /^tio\d+$/.test(n.id)) role = `Familia ${of}`;
    else if(n.id === 'amigo') role = `${npcGx(n, 'Amigo', 'Amiga')} ${of}`;
    if(!role) return;
    const id = uid('flia_maestro');
    renamed.set(n.id, id); n.id = id; n.role = role; n.relType = 'acquaintance'; n.flags.masterFamily = true;
  });
  STATE.npcs.forEach(n=>{ (n.links||[]).forEach(l=>{ if(renamed.has(l.id)) l.id = renamed.get(l.id); }); });
  const master = createNpc({id:uid('maestro'), name:masterName, gender: oldGender === 'Mujer' ? 'f' : oldGender === 'Hombre' ? 'm' : 'x',
    role: 'Tu ' + mw, relType:'mentor', tier:'importante', age:0, met:true, allowHidden:false,
    clase:oldC.clase, profession:oldC.profesion, trust:heir.trust, affection:heir.affection, loyalty:heir.loyalty, respect:heir.respect});
  master.ageOffset = oldC.edad - heirAge;
  master.personality = []; master.goals = []; master.secrets = [];
  if(oldP.chosenPathway){ master.hidden = {pathway:oldP.chosenPathway, sequence:oldP.sequence, faction: memberFactions().find(k=>k !== 'tarotClub') || null}; master.known.pathway = true; master.known.sequence = true; }
  if(retired) master.lifeState = 'lejos';
  else { master.alive = false; master.cause = (ed.meta && ed.meta.cause) || 'muerte'; master.deathYear = calendarYear(); }
  STATE.npcs.forEach(n=>{
    if(n === master) return;
    n.knows = {beyonder:false, partial:false};
    n.known = {pathway:false, sequence:false, faction:false, goals:false, fears:false};
    (n.secrets||[]).forEach(x=>{ x.known = false; });
    delete n.flags.formerDisciple;
    if(n.disciple){
      // Quien aprendió con vos: sabe lo que es el otro.
      delete n.disciple; n.flags.fellowDisciple = true; n.met = true; n.knows.beyonder = true;
      n.role = npcGx(n, 'Condiscípulo', 'Condiscípula');
      Object.assign(n, {trust:rndInt(35,60), affection:rndInt(30,55), loyalty:rndInt(20,45), respect:rndInt(30,55), suspicion:0, fear:0, dependence:0});
    } else if(n.flags.masterFamily){
      // La familia de tu maestro te conocía de verte en la casa.
      n.met = true;
      Object.assign(n, {trust:rndInt(20,45), affection:rndInt(15,40), loyalty:rndInt(10,30), respect:rndInt(20,45), suspicion:Math.round((n.suspicion||0)*0.3), fear:0, dependence:0});
    } else {
      const close = n.met && bondScore(n) >= 60;
      if(close){ n.trust = Math.round(n.trust*0.4); n.affection = Math.round(n.affection*0.4); n.loyalty = Math.round(n.loyalty*0.3); n.flags.familyFriend = true; }
      else { n.met = false; n.trust = rndInt(8,25); n.affection = rndInt(5,20); n.loyalty = rndInt(5,20); n.dependence = 0; }
      n.suspicion = Math.round((n.suspicion||0)*0.3); n.fear = Math.round((n.fear||0)*0.3);
    }
    n.interactions = 0;
  });

  // El personaje nuevo.
  const heirG = heir.gender === 'f' ? 'Mujer' : heir.gender === 'm' ? 'Hombre' : '';
  const parts = heir.name.split(' ');
  const first = parts[0], surname = parts.length > 1 ? parts.slice(1).join(' ') : randomSurname();
  const clase = plan.net >= 15000 && plan.money >= 5000 ? 'Alta' : heir.clase || oldC.clase;
  let rasgos = rollRandomTraits(3);
  const tm = computeTraitMods(rasgos);
  const eduFor = (a)=> a < 18 ? 'Secundaria (en curso)' : 'Secundaria completa';
  const job = heirAge >= 18 && heir.profession && heir.profession !== '—' && heir.profession !== 'Estudiante' ? (NPC_JOB_EQUIV[heir.profession] || (JOBS[heir.profession] ? heir.profession : null)) : null;
  const fresh = freshState();
  const c = fresh.character;
  Object.assign(c, {nombre:first, apellido:surname, edad:heirAge, genero:heirG, ciudad:oldC.ciudad, birthCity:oldC.ciudad, birthYear: calendarYear() - heirAge,
    clase, rasgos, profesion: job || (heirAge < 18 ? 'Estudiante' : 'Desempleado'), educacion: eduFor(heirAge),
    estadoCivil: heir.flags.married ? 'Casado/a' : 'Soltero/a'});
  c.salud = clamp((heirAge < 55 ? rndInt(80,96) : rndInt(62,82)) + tm.startSalud, 1, 100);
  c.sanity = clamp(rndInt(70,86) + tm.startSanity - (retired ? 0 : 5), 1, 100);
  c.spirituality = clamp(rndInt(10,22) + tm.startSpirituality + (typeof seq === 'number' ? rndInt(10,20) : 0), 0, 100);
  c.reputation = clamp(Math.round((oldC.reputation||0)*0.15) + tm.startReputation, -100, 100);
  c.luck = clamp(rndInt(40,60), 0, 100); c.fate = rndInt(0,6);
  c.rasgos.forEach(r=>{ const f = TRAIT_FORTUNE[r]; if(f){ c.luck = clamp(c.luck + (f.luck||0), 0, 100); c.fate += f.fate||0; } });
  const allowance = Math.round(plan.money*0.15);
  c.cash = Math.round(allowance + tm.startCash);
  c.bank = Math.max(0, plan.money - allowance);
  if(plan.house) c.vivienda = Object.assign({}, oldC.vivienda);
  if(plan.props) c.properties = (oldC.properties||[]).map(p=>Object.assign({}, p));
  enterHeirState(fresh, clase, masterName, plan.characteristic);

  // El baúl (lo místico va al discípulo), los cuadernos y la Característica.
  chest.forEach(it=>STATE.inventory.items.push(it));
  const dd = ITEM_DEFS.book_family_diary;
  addItem({cat:'book', def:'book_family_diary', name:`Los cuadernos de ${masterName}`, rarity:dd.rarity, uses:dd.uses, risk:dd.risk,
    desc:'Años de notas sobre la vía: lo que funcionó, lo que no, y lo que nunca se animó a probar.',
    read:{clue:{pathway:d.pathway, reliability:'real', strength:[8,14], source:`los cuadernos de ${masterName}`}, lore:{cat:'fact', chance:0.6}, acting:0.3, sanity:[-2,0]},
    provenance:`herencia de ${masterName}`}, 1);
  if(plan.characteristic){
    addCharacteristic(plan.characteristic.pathway, plan.characteristic.seq, `lo que quedó de ${masterName}`);
    addHiddenTruth(`Alguien más sabía que ${masterName} había sido Beyonder, y que su Característica había quedado en manos de ${gx('su discípulo','su discípula','su discípule')}.`, {key:'lineage_char'});
  }
  applyDiscipleContinuity(d, seq, oldP, masterName);
  const orgNote = STATE.org ? orgPassTo(`${first} ${surname}`, true) : '';

  // Tu propia gente: tus padres (si viven), un amigo y, si la tenías, tu familia.
  const parentsAlive = heirAge < 35 ? 2 : heirAge < 55 ? (chance(0.6) ? 1 : 0) : 0;
  [['madre','f','Madre'], ['padre','m','Padre']].slice(0, parentsAlive).forEach(([id, g, role])=>{
    createNpc({id, gender:g, role, relType:'family', tier:'importante', surname: id === 'padre' ? surname : randomSurname(), age: heirAge + rndInt(22,32), met:true, allowHidden:false,
      trust:rndInt(40,70), affection:rndInt(50,80), loyalty:rndInt(40,70), respect:rndInt(30,60)});
  });
  const fg = chance(0.5) ? 'm' : 'f';
  createNpc({id:'amigo', gender:fg, role: fg==='f' ? 'Amiga' : 'Amigo', relType:'friend', tier:'recurrente', age: Math.max(14, heirAge + rndInt(-3,3)), met:true, allowHidden:false,
    trust:rndInt(30,50), affection:rndInt(30,50), loyalty:rndInt(15,35)});
  if(heir.flags.married){
    const sg = heir.gender === 'f' ? 'm' : heir.gender === 'm' ? 'f' : (chance(0.5) ? 'm' : 'f');
    createNpc({id:'conyuge', gender:sg, role:'Cónyuge', relType:'family', tier:'importante', age: Math.max(18, heirAge + rndInt(-4,4)), met:true, allowHidden:false,
      clase, trust:rndInt(55,80), affection:rndInt(55,85), loyalty:rndInt(50,80)});
  }
  for(let i=0; i<Math.min(4, heir.flags.kids||0); i++){
    const g = chance(0.5) ? 'm' : 'f';
    const kidAge = clamp(heirAge - 22 - i*rndInt(2,4), 0, Math.max(0, heirAge - 16));
    createNpc({id:'hijo'+(i+1), name: randomFirstName(g)+' '+surname, gender:g, role: g==='f' ? 'Hija' : 'Hijo', relType:'family', tier:'importante',
      age: kidAge, met:true, allowHidden:false, clase, profession: kidAge >= 18 ? undefined : kidAge >= 6 ? 'Estudiante' : '—', trust:rndInt(55,80), affection:rndInt(60,85), loyalty:rndInt(45,75)}).personality = rollPersonality();
  }

  // El comienzo.
  STATE.milestones.push({kind:'birth', text:`Nace en ${c.ciudad}`, edad:0, year: Math.max(1, STATE.time.year - heirAge), cy: c.birthYear});
  addMilestone('mystic', retired ? `${masterName}, su ${mw}, se retira y le deja su vía` : `Hereda la vía de ${masterName}, su ${mw}`);
  const bits = [];
  if(chest.length) bits.push(chest.length === 1 ? `un objeto del baúl ${of}` : `${chest.length} objetos del baúl ${of}`);
  bits.push(`los cuadernos ${of}`);
  if(plan.characteristic) bits.push('algo que late dentro de una caja cerrada');
  if(plan.money > 0) bits.push(plan.family ? `un legado de ${fmtMoney(plan.money)}` : fmtMoney(plan.money));
  if(plan.house) bits.push('su casa');
  if(plan.props) bits.push(plan.props === 1 ? 'una propiedad que se alquila' : `${plan.props} propiedades que se alquilan`);
  const pwName = PATHWAYS[d.pathway] ? PATHWAYS[d.pathway].name : '';
  const intro = `${retired ? `${masterName} se fue del mundo, como se van los que ya vieron demasiado.` : `${masterName} ya no está.`} ${first} ${surname} tiene ${heirAge} años y fue ${ng(heir, 'su discípulo', 'su discípula')} durante ${years} ${years === 1 ? 'año' : 'años'}. `
    + (typeof seq === 'number' ? `Es Beyonder de la vía ${pwName}, Sequence ${seq}. ` : `Conoce la vía ${pwName}, aunque todavía no tomó su primera poción. `)
    + `Recibe ${listEs(bits)}.${plan.family && !plan.house ? ' La plata y la casa quedan para la familia.' : ''}${orgNote ? ' ' + orgNote : ''}`;
  logJournal('El legado', intro, {cat:'pathway', imp:3});
  remember('master_legacy', `${masterName}, tu ${mw}, te dejó ${bits.join(', ')}.`, {cat:'person', npc:master.id});
  seasonStart();
  STATE._yearSnap = {profesion:c.profesion, educacion:c.educacion, estadoCivil:c.estadoCivil, ciudad:c.ciudad, seq: STATE.pathway.chosenPathway ? STATE.pathway.sequence : null, net:c.cash + c.bank};
  setResolution('El legado', intro, []);
  invalidatePathwayMods();
  saveGame(true);
  return true;
}

/* ------------------------------ cerrar una vida ------------------------------ */
// Quien llega a viejo puede dar su historia por terminada cuando quiera: se
// retira del mundo (sin morir) y el linaje sigue, si hay a quién dejarle.
function closeLifeAvailable(){
  const c = STATE.character;
  if(!STATE.started || STATE.gameOver || isDivine()) return {ok:false, why:''};
  if(c.edad < CLOSE_LIFE_MIN_AGE) return {ok:false, why:`Desde los ${CLOSE_LIFE_MIN_AGE} años.`};
  if(timeBlocked()) return {ok:false, why:'Primero resolvé lo que está pasando.'};
  return {ok:true};
}
function closeLife(){
  if(!closeLifeAvailable().ok) return;
  const c = STATE.character, p = STATE.pathway;
  const high = p.chosenPathway && p.sequence <= 4;
  const heirs = lineageHeirs().length;
  const title = high ? 'Una leyenda que se retira' : 'Un retiro';
  const text = high
    ? `${c.nombre} ${c.apellido} deja ${c.ciudad} una madrugada, sin despedirse de casi nadie. Los que son como ${gx('él','ella','elle')} no mueren en una cama: se apartan del mundo, y el mundo, con los años, se olvida de que existieron.${heirs ? ' Lo que tenía, y lo que era, queda en manos de su familia.' : ''}`
    : `${c.nombre} ${c.apellido} se retira a una vida quieta, lejos de todo lo que le pasó. ${heirs ? (bloodHeirs().length ? 'Deja sus cosas, y su historia, en manos de su familia.' : `Deja su vía, y su historia, en manos de quien aprendió de ${gx('él','ella','elle')}.`) : 'No vuelve a aparecer en esta historia.'}`;
  endGame('natural', title, text, {cause:'retiro'});
}
