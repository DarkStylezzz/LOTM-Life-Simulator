'use strict';
/* =========================================================================
   systems/family.js — pareja, matrimonio, hijos y hogar (§12).
   Los hijos crecen por etapas (bebé 0-5, infancia 6-12, adolescencia 13-17,
   adultez 18+), desarrollan personalidad según cómo los criás (disciplina,
   calidez, libertad), estudian o trabajan, se van de casa, se casan, te dan
   nietos — y pueden terminar convirtiéndose en NPCs importantes por su
   cuenta (incluso Beyonders, si crecieron cerca de tus secretos).
   ========================================================================= */
function childStage(n){
  const a = npcAge(n);
  if(a <= 5) return 'Bebé';
  if(a <= 12) return 'Infancia';
  if(a <= 17) return 'Adolescencia';
  return 'Adultez';
}
// Cómo lo criaste deja marca en su personalidad (y en cómo te mira).
function shapeChild(n, style){
  n.flags.upbringing = n.flags.upbringing || {disciplina:0, calidez:0, libertad:0};
  n.flags.upbringing[style] = (n.flags.upbringing[style]||0) + 1;
  const u = n.flags.upbringing;
  const dom = Object.keys(u).reduce((a,b)=>u[b]>u[a]?b:a);
  const want = {disciplina:'disciplinado', calidez:'calido', libertad:'sonador'}[dom];
  if(u[dom] >= 2 && want && NPC_PERSONALITIES[want === 'disciplinado' ? 'leal' : want]){
    const trait = want === 'disciplinado' ? 'leal' : want;
    if(!n.personality.includes(trait)) n.personality = [trait, n.personality[0]];
  }
}
function setChildPath(n, dream){
  n.flags.path = dream;
  const map = {'estudiar en la universidad':'Médico','irse al mar':'Marinero','trabajar ya y ganar su propia plata':'Obrero','ser artista':'Artista','entrar a la Iglesia':'Sacerdote','trabajar en algo seguro':'Oficinista'};
  n.flags.futureJob = map[dream] || 'Oficinista';
  if(dream === 'entrar a la Iglesia'){ n.hidden.faction = n.hidden.faction || 'church'; }
}
// Hijos que crecen: cambios de etapa, profesión adulta, y (a veces) el
// mundo oculto que les llega por tu culpa.
function growChildren(){
  childrenNpcs().forEach(k=>{
    if(!k.alive) return;
    const a = npcAge(k);
    if(a === 6 && k.profession !== 'Estudiante') k.profession = 'Estudiante';
    if(a === 18 && (!k.profession || k.profession==='Estudiante' || k.profession==='—')){
      k.profession = k.flags.futureJob || pick(NPC_PROFESSIONS[STATE.character.clase||'Media']);
      k.tierJob = NPC_JOB_EQUIV[k.profession] || null;
      k.tier = 'importante';
      if(!k.goals || !k.goals.length) k.goals = rollGoals(k.personality);
      logJournal(`${k.name} ya es adulto`, `${k.name} cumple dieciocho. ${k.flags.path ? 'Quiere '+k.flags.path+'.' : ''} Trabaja como ${k.profession.toLowerCase()}.`, {cat:'family', imp:1});
    }
    // Un hijo que sabe (o sospecha) lo que sos puede terminar buscando lo mismo.
    if(a >= 16 && (k.knows.beyonder || k.knows.partial) && !k.hidden.pathway && chance(0.03)){
      if(!npcHasGoal(k,'saber')) k.goals.push({id:'saber', progress:0});
      k.mystic = Math.min(100, (k.mystic||0) + 20);
      addHiddenTruth(`${k.name} empezó a buscar, a escondidas, el mundo que vos le dejaste entrever.`, {key:'child_seeks_'+k.id, npc:k.id});
    }
  });
}
function familyWarmth(n){
  ['padre','madre'].forEach(id=>{ const p = npcById(id); if(p && p.alive) adjustRel(p, {affection:n, trust:Math.round(n/2)}); });
}

/* --------------- acciones de vida personal (las del juego original) --------------- */
function buscarPareja(){
  if(timeBlocked()) return;
  const c = STATE.character;
  if(c.edad < 18){ toast('Todavía sos muy chico para esto.', 'neg'); return; }
  if(currentPartnerNpc()){ toast('Ya estás en una relación.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const chanceOfMeeting = clamp(0.35 + c.reputation/200 + luckMod(), 0.15, 0.65);
  let text;
  if(chance(chanceOfMeeting)){
    const g = c.genero==='Hombre' ? 'f' : c.genero==='Mujer' ? 'm' : (chance(0.5)?'f':'m');
    const n = createNpc({gender:g, relType:'acquaintance', ageMin:Math.max(18, c.edad-10), ageMax:c.edad+10, met:true, trust:rndInt(30,55), affection:rndInt(35,60)});
    startDating(n);
    text = `Conocés a ${n.name}${n.profession ? ', que trabaja como '+n.profession.toLowerCase() : ''}. Hay algo ahí que te dan ganas de seguir explorando.`;
  } else {
    text = 'Salís, conocés gente, pero nadie termina de convencerte esta vez.';
    logJournal('Vida personal', text, {cat:'relation'});
  }
  setResolution('Buscar pareja', text, []);
  saveGame(true); renderAll();
}
function weddingCost(){ return Math.round(({Baja:400, Media:1200, Alta:4000}[STATE.character.clase] || 800) * priceIndex()); }
function proponerMatrimonio(){
  if(timeBlocked()) return;
  const n = partnerNpc();
  if(!n){ toast('No tenés a quién proponerle matrimonio.', 'neg'); return; }
  const c = STATE.character;
  const cost = weddingCost();
  if(c.cash + c.bank < cost){ toast(`Necesitás al menos ${fmtMoney(cost)} entre efectivo y banco para una boda modesta.`, 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const successChance = clamp(0.25 + n.trust/130 + n.affection/250 - n.suspicion/200, 0.1, 0.92);
  let text;
  if(chance(successChance)){
    n.id = 'conyuge'; n.role = 'Cónyuge';
    adjustRel(n, {trust:10, affection:8, loyalty:10});
    if(c.cash >= cost) applyEffects({cash:-cost}); else { const rest = cost - c.cash; applyEffects({cash:-c.cash, bank:-rest}); }
    c.estadoCivil = 'Casado/a';
    applyEffects({reputation:[3,8], sanity:[4,9]});
    text = `${c.nombre} ${c.apellido} se casa con ${n.name}. Una boda modesta, pero real.`;
    logJournal('Boda', text, {cat:'family', imp:3});
    remember('wedding', `Te casaste con ${n.name}.`, {cat:'person', npc:n.id});
    addMilestone('family', `Se casa con ${n.name}`);
  } else {
    adjustRel(n, {trust:-15, affection:-6});
    applyEffects({sanity:[-7,-3]});
    text = `Le proponés matrimonio a ${n.name}. La respuesta es no — todavía no, al menos.`;
    logJournal('Una propuesta rechazada', text, {cat:'relation', imp:2});
    if(chance(0.2)){
      n.id = 'ex_' + uid('x'); n.role = 'Ex pareja'; n.lifeState = 'distanciado';
      logJournal('Ruptura', `Después del rechazo, la relación con ${n.name} no sobrevive. Se separan.`, {cat:'relation', imp:2});
      text += ' Después de eso, la relación no sobrevive.';
    }
  }
  setResolution('Una propuesta', text, []);
  saveGame(true); renderAll();
}
// Un hijo nace (lo usan la acción "Buscar un hijo" y los eventos de familia).
function birthChild(){
  const c = STATE.character;
  const isMale = chance(0.5);
  const n = childrenNpcs().length;
  const kid = createNpc({id:'hijo'+(n+1), name: randomFirstName(isMale?'m':'f')+' '+c.apellido, gender:isMale?'m':'f', role:isMale?'Hijo':'Hija',
    relType:'family', tier:'importante', age:0, met:true, allowHidden:false, clase:c.clase, profession:'—',
    trust:rndInt(60,85), affection:rndInt(70,90), loyalty:rndInt(50,80)});
  kid.ageOffset = -c.edad;
  kid.personality = rollPersonality();
  applyEffects({sanity:[3,8], reputation:[1,4]});
  logJournal('Un nacimiento', `${kid.name} nace. La vida de ${c.nombre} ${c.apellido} ya no es la misma.`, {cat:'family', imp:3});
  remember('child_born', `Nació ${kid.name}.`, {cat:'person', npc:kid.id});
  addMilestone('family', `Nace ${kid.name}`);
  STATE.flags.tryingForChild = false;
  STATE._importantMoment = true;
  return kid;
}
// Una boda (la propuesta la puede hacer el personaje o la pareja).
function marryPartner(n, modest){
  const c = STATE.character;
  const cost = modest ? Math.round(weddingCost()*0.35) : weddingCost();
  const pay = Math.min(cost, c.cash + c.bank);
  if(c.cash >= pay) applyEffects({cash:-pay}); else { const rest = pay - c.cash; applyEffects({cash:-c.cash, bank:-rest}); }
  n.id = 'conyuge'; n.role = 'Cónyuge';
  adjustRel(n, {trust:10, affection:8, loyalty:10});
  c.estadoCivil = 'Casado/a';
  applyEffects({reputation:[3,8], sanity:[4,9]});
  logJournal('Boda', `${c.nombre} ${c.apellido} se casa con ${n.name}.${modest ? ' Una boda chica, en una tarde de lluvia, con pocos testigos y mucha comida.' : ' Una boda modesta, pero real.'}`, {cat:'family', imp:3});
  remember('wedding', `Te casaste con ${n.name}.`, {cat:'person', npc:n.id});
  addMilestone('family', `Se casa con ${n.name}`);
  STATE._importantMoment = true;
}
function intentarTenerHijo(){
  if(timeBlocked()) return;
  const c = STATE.character;
  const s = spouseNpc();
  if(!s){ toast('Necesitás estar casado/a para esto.', 'neg'); return; }
  if(npcAge(s) > 46 && c.edad > 46){ toast('A esta altura de la vida, ya no va a llegar.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  const fert = clamp(0.55 - Math.max(0, Math.min(c.edad, npcAge(s)) - 35)*0.04 + (STATE.flags.tryingForChild?0.1:0), 0.08, 0.7);
  let text;
  if(chance(fert)){
    const kid = birthChild();
    text = `${kid.name} nace. La vida de ${c.nombre} ${c.apellido} ya no es la misma.`;
  } else {
    text = 'Lo intentan, pero por ahora no llega.';
    logJournal('Vida personal', text, {cat:'family'});
  }
  setResolution('Un hijo', text, []);
  saveGame(true); renderAll();
}
