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
function lineageHeirs(){
  return childrenNpcs().filter(n=>n.alive && n.lifeState !== 'desaparecido').sort((a,b)=>npcAge(b)-npcAge(a));
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
  const c = STATE.character;
  const kids = lineageHeirs();
  const net = Math.max(0, Math.round(c.cash + c.bank - c.debt));
  const will = STATE.flags.will || '';
  const fav = will.startsWith('favorite:') ? will.slice(9) : null;
  const favAlive = fav && kids.some(k=>k.id === fav);
  let pot = net, charity = 0, spouseShare = 0;
  if(will === 'charity' && pot > 0){ charity = Math.round(pot*0.2); pot -= charity; }
  const spouse = spouseNpc();
  if(spouse && pot > 0){ spouseShare = Math.round(pot*0.4); pot -= spouseShare; }
  let money;
  if(favAlive) money = heir.id === fav ? Math.round(pot * (kids.length > 1 ? 0.7 : 1)) : Math.round(pot*0.3 / Math.max(1, kids.length-1));
  else money = Math.round(pot / Math.max(1, kids.length));
  const keeps = !favAlive || heir.id === fav;          // la casa y las propiedades
  return {money, house: keeps && !!c.vivienda, props: keeps ? (c.properties||[]).length : 0,
    items: inventoryItems().filter(isHeirloom).length, characteristic: parentCharacteristic(), net, charity,
    spouse: spouse ? {name:spouse.name, gender:spouse.gender, amount:spouseShare} : null,
    favored: favAlive && heir.id !== fav ? npcById(fav).name : null};
}

/* ------------------------------ seguir con el linaje ------------------------------ */
function succeedAs(heirId){
  if(!STATE.gameOver) return false;
  const heir = lineageHeirs().find(n=>n.id === heirId);
  if(!heir) return false;
  const oldC = STATE.character, oldP = STATE.pathway, ed = STATE.endingData || {};
  const plan = inheritancePlan(heir);
  const parentName = `${oldC.nombre} ${oldC.apellido}`;
  const retired = ed.meta && ed.meta.cause === 'retiro';
  const heirAge = npcAge(heir), shift = heir.ageOffset;
  const oldGender = oldC.genero;
  const heirKnew = !!(heir.knows && (heir.knows.beyonder || heir.knows.partial));

  // 1. La vida que termina queda en la historia de la familia.
  const lives = lineageData().lives;
  lives.push({nombre:oldC.nombre, apellido:oldC.apellido, genero:oldGender, born: oldC.birthYear || (calendarYear() - oldC.edad), died: ed.year || calendarYear(),
    age: oldC.edad, title: ed.title || '', category: ed.category || '', cause: (ed.meta && ed.meta.cause) || '', epitaph: ed.epitaph || '', text: ed.text || '',
    paragraphs: (ed.paragraphs || []).slice(0, 14), pathway: oldP.chosenPathway, seq: oldP.chosenPathway ? oldP.sequence : null, heir: heir.name});
  if(lives.length > LINEAGE_KEEP) lives.slice(0, lives.length - LINEAGE_KEEP).forEach(l=>{ l.paragraphs = []; l.text = ''; });

  // 2. Lo que pasa al baúl (antes de vaciar el inventario).
  const chest = inventoryItems().filter(isHeirloom).map(it=>Object.assign({}, it, {provenance: it.provenance && !/herencia/.test(it.provenance) ? `${it.provenance}; herencia de ${parentName}` : it.provenance}));

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
  // Lo que se conserva del mundo: la fecha, la historia, las ciudades, los
  // precios, quién es quién (y quién sabe qué de la familia).
  const keep = {settings:STATE.settings, time:STATE.time, world:STATE.world, npcs:STATE.npcs, nextId:STATE.nextId, lineage:STATE.lineage};
  const oldFactions = STATE.factions, oldTarot = STATE.tarot, oldAttention = STATE.world.attention || 0;
  const pcs = (STATE.pendingConsequences||[]).filter(pc=>pc && !pc.eventId && !pc.ctx && !pc.memory && pc.effect && Object.keys(pc.effect).every(k=>['war','allCities'].includes(k)));
  STATE = fresh;
  Object.assign(STATE, keep);
  STATE.version = SAVE_VERSION;
  STATE.started = true; STATE.gameOver = false; STATE.endingData = null;
  STATE.pendingConsequences = pcs;
  STATE.flags.startClass = clase;
  STATE.flags.lineageFrom = parentName;
  // Las organizaciones recuerdan a la familia (para bien o para mal).
  FACTION_KEYS.forEach(k=>{
    const o = oldFactions[k], f = STATE.factions[k];
    if(!o || !f) return;
    f.formulas = o.formulas || f.formulas; f.strength = o.strength ?? f.strength;
    f.known = f.known || (o.known && k !== 'tarotClub');
    if(k !== 'tarotClub' && (o.relationship === 'miembro' || o.access >= 3) && !o.hunted){ f.known = true; f.trust = 10; f.publicRep = 5; f.relationship = 'neutral'; }
    if(o.hunted || ['enemiga','traicionada','persiguiendo'].includes(o.relationship)){ f.known = true; f.suspicion = 25; }
  });
  if(oldTarot && oldTarot.stage >= 3) STATE.tarot.stage = 1;
  STATE.world.attention = Math.round(oldAttention*0.25) + (plan.characteristic ? 10 : 0);
  STATE.bmOffers = null;
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
  logJournal('El legado', intro, {cat:'family', imp:3});
  remember('parent_legacy', `${parentName} te dejó ${bits.join(', ')}.`, {cat:'person', npc:parentId});
  seasonStart();
  STATE._yearSnap = {profesion:c.profesion, educacion:c.educacion, estadoCivil:c.estadoCivil, ciudad:c.ciudad, seq:null, net:c.cash + c.bank};
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
    : `${c.nombre} ${c.apellido} se retira a una vida quieta, lejos de todo lo que le pasó. ${heirs ? 'Deja sus cosas, y su historia, en manos de su familia.' : 'No vuelve a aparecer en esta historia.'}`;
  endGame('natural', title, text, {cause:'retiro'});
}
