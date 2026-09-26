'use strict';
/* =========================================================================
   systems/organization.js — tu propia organización.
   Un Beyonder que ya subió lo suficiente puede fundar algo propio: una
   sociedad secreta, una orden o un culto (data/legacy.js, ORG_KINDS). Vive
   en STATE.org (null si no hay):
     {name, kind, founded, founderGen, founder, members, peak, influence,
      secrecy, treasury, inner:[npcIds], cities:[keys], lastAct, lastTick,
      exposures, sponsor}
   - Cada temporada, la organización puede hacer una cosa por vos (reclutar,
     buscar lo que te falta, juntar fondos, vigilar, investigar, esconderse).
   - Sola, crece o se achica según su influencia, junta cuotas y pierde
     secreto a medida que crece. Cuando el secreto se gasta, alguien pregunta;
     y si nadie la esconde, alguien entra por la puerta (ver data/events/legacy.js).
   - La gente que te sigue también te sostiene: suma seguidores a las anclas
     (orgFollowers, ver systems/anchors.js). Un culto, muchísimo.
   - Cuando la vida termina, la conducción pasa al heredero (orgPassTo).
   ========================================================================= */
function org(){ return STATE.org || null; }
function orgKind(){ const o = org(); return o ? ORG_KINDS[o.kind] : null; }
function orgCost(kind){ return Math.round(ORG_KINDS[kind].cost * priceIndex()); }
function orgMemberRole(n, kind){
  if(kind === 'culto') return 'Fiel del culto';
  if(kind === 'orden') return ng(n, 'Hermano de la orden', 'Hermana de la orden');
  return 'Miembro de la sociedad';
}
function orgWord(v, what){
  if(what === 'secrecy') return v >= 75 ? 'Nadie sabe que existe.' : v >= 50 ? 'Discreta.' : v >= 25 ? 'Se habla de ella en voz baja.' : 'Demasiada gente sabe que existe.';
  return v >= 75 ? 'Su palabra pesa en la ciudad.' : v >= 50 ? 'La escuchan.' : v >= 25 ? 'Tiene algo de peso.' : 'Todavía no pesa.';
}
function orgFollowers(){
  const o = org(), k = orgKind();
  return o && k ? Math.min(40, Math.round(o.members * k.followers)) : 0;
}

/* ------------------------------ fundarla ------------------------------ */
function orgFoundConditions(kind){
  const c = STATE.character, p = STATE.pathway, k = ORG_KINDS[kind];
  return [
    {id:'beyonder', label:`Ser Beyonder de Sequence ${k.minSeq} o más alta`, ok: !!p.chosenPathway && p.sequence <= k.minSeq},
    {id:'age', label:'Tener 25 años o más', ok: c.edad >= 25},
    {id:'money', label:`${fmtMoney(orgCost(kind))} para empezar`, ok: canAfford(orgCost(kind))},
    {id:'time', label:'2 de tiempo libre', ok: canSpendFreeTime(2)}
  ];
}
function orgFoundable(kind){ return !!ORG_KINDS[kind] && !org() && !isDivine() && !timeBlocked() && orgFoundConditions(kind).every(r=>r.ok); }
// Tres nombres para elegir; "otros nombres" cambia la semilla.
function orgNameOptions(kind){
  const parts = ORG_NAME_PARTS[kind]; if(!parts) return [];
  if(!STATE.flags.orgNameSeed) STATE.flags.orgNameSeed = rndInt(1, 999999);
  const s = STATE.flags.orgNameSeed, c = STATE.character;
  const role = STATE.pathway.chosenPathway ? currentRole() : null;
  const out = [];
  for(let i=0; out.length < 3 && i < 30; i++){
    const form = parts.forms[(s + i) % parts.forms.length];
    const x = parts.x[(Math.floor(s/7) + i*3) % parts.x.length];
    const name = form.replace('{x}', x).replace('{nombre}', c.nombre).replace('{rol}', role ? `${gx('el','la','le')} ${role.role}` : c.nombre)
      .replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al');
    if(!out.includes(name)) out.push(name);
  }
  return out;
}
function rerollOrgNames(){ STATE.flags.orgNameSeed = rndInt(1, 999999); }
function foundOrg(kind, name){
  if(!orgFoundable(kind)){ toast('Todavía no podés fundarla.', 'neg'); return false; }
  const k = ORG_KINDS[kind], c = STATE.character;
  name = name || orgNameOptions(kind)[0];
  const before = snapshotForChanges();
  spendFreeTime(2); markMysticAct();
  payFromCashOrBank(orgCost(kind));
  const members = rndInt(k.startMembers[0], k.startMembers[1]);
  STATE.org = {name, kind, founded: calendarYear(), founderGen: generationNumber(), founder: `${c.nombre} ${c.apellido}`,
    members, peak: members, influence: k.influence, secrecy: k.secrecy, treasury: 0, inner: [], cities: [currentCityKey()],
    lastAct: STATE.time.totalMonths, lastTick: STATE.time.totalMonths, exposures: 0, sponsor: null};
  const first = addOrgInner();
  raiseAttention(rndInt(1, 3));
  const text = {
    sociedad: `Una noche, en la trastienda de un librero, ${members} personas que se conocen de lejos se sientan alrededor de una mesa. Ninguna sabe todo lo que sabés. Todas saben algo. Así nace ${name}.`,
    orden: `${members} personas juran, con la mano sobre un libro que no es ninguna Biblia, proteger lo que no puede protegerse solo. Así nace ${name}. Nadie afuera lo sabe todavía.`,
    culto: `${members} personas que te vieron hacer lo imposible se reúnen en un sótano con velas. Te llaman por un nombre que no es el tuyo. Así nace ${name}, y ya no te pertenece del todo.`
  }[kind] + (first ? ` ${first.name} es ${ng(first,'el primero','la primera')} en ofrecerse para lo que haga falta.` : '');
  logJournal(name, text, {cat:'faction', imp:3});
  remember('org_founded', `Fundaste ${name}.`, {cat:'achievement'});
  addMilestone('faction', `Funda ${name}`);
  setResolution(name, text, diffForDisplay(before));
  saveGame(true); renderAll();
  return true;
}
// Alguien del círculo de confianza (hasta cinco): tiene nombre, opina y, a veces, traiciona.
function addOrgInner(){
  const o = org(); if(!o) return null;
  o.inner = (o.inner||[]).filter(id=>{ const n = npcById(id); return n && n.alive; });
  if(o.inner.length >= 5) return null;
  const n = createNpc({relType:'contact', tier:'recurrente', ageMin:20, ageMax:60, met:true, allowHidden:false,
    trust:rndInt(40,60), respect:rndInt(40,65), loyalty:rndInt(45,70), affection:rndInt(20,40)});
  n.role = orgMemberRole(n, o.kind);
  n.flags.orgMember = true;
  n.knows.partial = true;
  o.inner.push(n.id);
  return n;
}
function orgInnerNpcs(){ const o = org(); return o ? (o.inner||[]).map(npcById).filter(n=>n && n.alive) : []; }

/* ------------------------------ lo que hace por vos ------------------------------ */
const ORG_ACTIONS = {
  recruit:{label:'Reclutar', small:'Sumar gente. Cada nuevo miembro es alguien más que sabe.'},
  seek:{label:'Que busquen lo que te falta', small:'Fórmulas e ingredientes que no conseguís por tu cuenta.'},
  funds:{label:'Juntar fondos', small:'Colectas, negocios, favores que se cobran.'},
  watch:{label:'Que vigilen por vos', small:'Borrar rastros y avisarte quién pregunta.'},
  lore:{label:'Que investiguen', small:'Archivos, rumores, gente que sabe cosas.'},
  hide:{label:'Pasar a la clandestinidad', small:'Menos reuniones, más secreto. Algunos se van.'}
};
function orgActionAvailable(id){
  const o = org();
  if(!o || !ORG_ACTIONS[id]) return {ok:false, why:''};
  if(isDivine()) return {ok:false, why:''};
  if(timeBlocked()) return {ok:false, why:'Primero resolvé lo que está pasando.'};
  if(!canUseSeasonAction('org')) return {ok:false, why:'Ya hicieron algo por vos esta temporada.'};
  if(!canSpendFreeTime(1)) return {ok:false, why:'Sin tiempo libre.'};
  if(id === 'seek' && !nextMissing()) return {ok:false, why:'Por ahora no te falta nada que se pueda buscar.'};
  return {ok:true};
}
function orgAct(id){
  const av = orgActionAvailable(id);
  if(!av.ok){ if(av.why) toast(av.why, 'neg'); return; }
  const o = org(), k = orgKind(), c = STATE.character;
  const before = snapshotForChanges();
  spendFreeTime(1); useSeasonAction('org');
  o.lastAct = STATE.time.totalMonths;
  let text = '';
  if(id === 'recruit'){
    const add = Math.max(1, Math.round(rndInt(2,5) + o.influence/12 + (o.kind === 'culto' ? 2 : 0) + Math.max(0, c.reputation)/40));
    o.members += add; o.peak = Math.max(o.peak, o.members);
    o.secrecy = clamp(o.secrecy - rndInt(2, o.kind === 'culto' ? 7 : 5), 0, 100);
    o.influence = clamp(o.influence + rndInt(1,3), 0, 100);
    const n = chance(0.3) ? addOrgInner() : null;
    text = `${cap(k.short)} suma ${add} ${add === 1 ? 'persona' : 'personas'}. ${n ? `Una de ellas, ${n.name}, se gana enseguida un lugar en el círculo de confianza.` : 'Cada nombre nuevo es una promesa, y también alguien más que sabe.'}`;
  } else if(id === 'seek'){
    const m = nextMissing();
    const ch = clamp(seekChance(m) + 0.08 + o.influence/500 + Math.min(0.1, o.members/400), 0.1, 0.85);
    if(chance(ch)){
      const pay = Math.min(o.treasury, Math.round(seekPrice(m.seq ?? 9) * 0.5));
      o.treasury -= pay;
      if(m.kind === 'formula'){ const f = addFormula(m.pathway, m.seq, 'true', o.name); if(f){ f.verified = true; f.risk = 'Verificada: es auténtica.'; } text = `Alguien de ${o.name} vuelve de un viaje largo con la fórmula de ${formulaName(m.pathway, m.seq)}, copiada a mano. La revisás: es auténtica.`; }
      else if(m.kind === 'ingredient'){ addIngredient(m.pathway, m.seq, m.name, rndInt(60,90), o.name); text = `${cap(k.short)} te consigue ${m.name}. Nadie te dice cómo, y preferís no preguntar.`; }
      else { addClue({pathway:m.pathway, reliability:'real', strength:[8,13], source:o.name}); text = `${cap(k.short)} junta todo lo que se sabe sobre lo que buscás. Las piezas empiezan a encajar.`; }
      if(pay) text += ` Salió de la caja: ${fmtMoney(pay)}.`;
    } else text = `Buscan durante toda la temporada. Vuelven con nombres, direcciones y promesas, pero no con lo que necesitás. Todavía.`;
    o.secrecy = clamp(o.secrecy - rndInt(1,3), 0, 100);
  } else if(id === 'funds'){
    const v = Math.round((o.members * rndInt(6,12) + 40) * priceIndex());
    o.treasury += v;
    o.secrecy = clamp(o.secrecy - rndInt(1,3), 0, 100);
    text = `${cap(k.short)} junta ${fmtMoney(v)} entre colectas, favores y algún negocio del que es mejor no saber los detalles.`;
  } else if(id === 'watch'){
    raiseAttention(-rndInt(6,12));
    FACTION_KEYS.forEach(f=>{ if(F(f).suspicion > 0) F(f).suspicion = Math.max(0, F(f).suspicion - rndInt(3,8)); });
    o.secrecy = clamp(o.secrecy + rndInt(3,6), 0, 100);
    text = 'Durante toda la temporada, alguien de los tuyos mira a los que te miran. Un expediente se pierde, un testigo se muda, un rumor se apaga. El mundo oculto te pierde un poco de vista.';
  } else if(id === 'lore'){
    const pw = STATE.pathway.chosenPathway || '$random';
    addClue({pathway:pw, reliability:'real', strength:[4,8], source:o.name});
    applyEffects({lore:{cat: chance(0.3) ? 'secret' : 'fact', chance:0.45, source:o.name}});
    text = `${cap(k.short)} revuelve archivos, bibliotecas y memorias de viejos. Te traen un legajo de papeles; la mitad no sirve, y la otra mitad vale oro.`;
  } else if(id === 'hide'){
    const lost = Math.round(o.members * rnd(0.05, 0.15));
    o.members = Math.max(1, o.members - lost);
    o.secrecy = clamp(o.secrecy + rndInt(12,20), 0, 100);
    o.influence = clamp(o.influence - rndInt(3,6), 0, 100);
    text = `Se acaban las reuniones grandes. Cambian los lugares, las contraseñas, los nombres. ${lost ? `${lost} ${lost === 1 ? 'persona se va' : 'personas se van'}: no era para esto que habían venido.` : 'Nadie se va, pero todos bajan la voz.'}`;
  }
  markMysticAct();
  logJournal(o.name, text, {cat:'faction', imp:1});
  setResolution(ORG_ACTIONS[id].label, text, diffForDisplay(before));
  saveGame(true); renderAll();
}
// La caja de la organización, a tu bolsillo (una vez por temporada, sin gastar tiempo).
function orgWithdrawAvailable(){
  const o = org();
  if(!o || o.treasury <= 0 || isDivine()) return {ok:false, why:'La caja está vacía.'};
  if(o.lastWithdraw !== undefined && o.lastWithdraw >= STATE.season.start) return {ok:false, why:'Ya sacaste plata esta temporada.'};
  return {ok:true};
}
function orgWithdraw(){
  if(!orgWithdrawAvailable().ok || timeBlocked()) return;
  const o = org(), v = o.treasury;
  const before = snapshotForChanges();
  o.treasury = 0; o.lastWithdraw = STATE.time.totalMonths;
  STATE.character.cash += v;  // es tu plata: pasa entera, sin multiplicadores
  if(o.kind === 'culto') o.influence = clamp(o.influence - 2, 0, 100);
  const text = `Sacás ${fmtMoney(v)} de la caja de ${o.name}.${o.kind === 'culto' ? ' Algunos fieles lo notan, y no dicen nada. Todavía.' : ''}`;
  setResolution('La caja', text, diffForDisplay(before));
  saveGame(true); renderAll();
}
// Abrir la organización en otra ciudad (la tuya actual, si todavía no está).
function orgExpandAvailable(){
  const o = org();
  if(!o || isDivine()) return {ok:false, why:''};
  if((o.cities||[]).includes(currentCityKey())) return {ok:false, why:'Ya está en esta ciudad.'};
  if(o.members < 12) return {ok:false, why:'Hace falta más gente para abrir otra sede.'};
  return {ok:true};
}
function orgExpand(){
  if(!orgExpandAvailable().ok || timeBlocked()) return;
  const o = org(); const city = currentCity();
  o.cities.push(currentCityKey());
  o.influence = clamp(o.influence + 4, 0, 100);
  o.secrecy = clamp(o.secrecy - 6, 0, 100);
  const text = `${o.name} abre una sede en ${city.name}. Una casa alquilada con otro nombre, una contraseña nueva y gente que no te conocía y ahora te espera.`;
  logJournal(o.name, text, {cat:'faction', imp:2});
  setResolution(o.name, text, []);
  saveGame(true); renderAll();
}
function dissolveOrg(reason){
  const o = org(); if(!o) return;
  const hist = STATE.flags.orgHistory = STATE.flags.orgHistory || [];
  hist.push({name:o.name, kind:o.kind, founded:o.founded, ended:calendarYear(), peak:o.peak, founder:o.founder, reason: reason || 'disuelta',
    founderGen:o.founderGen, endedGen:generationNumber()});
  orgInnerNpcs().forEach(n=>{ n.flags.orgMember = false; n.role = 'Ex ' + n.role.charAt(0).toLowerCase() + n.role.slice(1); });
  STATE.org = null;
  const text = reason === 'colapso' ? `${o.name} se deshace sola: primero dejan de venir unos, después otros, hasta que la sala queda vacía.` : `Disolvés ${o.name}. Algunos lloran, otros se enojan, casi todos se van aliviados. Durante años, vas a cruzarte con caras que te bajan la mirada.`;
  logJournal(o.name, text, {cat:'faction', imp:2});
  remember('org_dissolved', `${o.name} dejó de existir.`, {cat:'loss'});
  return text;
}
function dissolveOrgAction(){
  if(!org() || timeBlocked()) return;
  const text = dissolveOrg();
  setResolution('Disolverla', text, []);
  saveGame(true); renderAll();
}

/* ------------------------------ sola: crece, junta, se expone ------------------------------ */
function orgCap(o){
  const base = {sociedad:60, orden:80, culto:150}[o.kind] || 60;
  return Math.round(base * (1 + 0.6*((o.cities||[]).length - 1)) * (0.6 + o.influence/100));
}
function orgTick(){
  const o = org(); if(!o || STATE.gameOver || isDivine()) return;
  if(STATE.time.totalMonths - (o.lastTick||0) < 3) return;
  o.lastTick = STATE.time.totalMonths;
  const k = orgKind();
  const neglect = STATE.time.totalMonths - (o.lastAct||0) > 12;
  // Crece si pesa; se achica si nadie la conduce.
  let g = k.growth * (o.influence - 35) / 250 - (neglect ? 0.06 : 0);
  let delta = Math.round(o.members * g) + (chance(o.influence/150) ? 1 : 0);
  if(neglect && delta >= 0) delta = -1;   // abandonada, se deshace de a poco (aunque el redondeo diga otra cosa)
  const room = orgCap(o) - o.members;
  if(delta > room) delta = Math.max(0, room);
  o.members = Math.max(0, o.members + delta);
  o.peak = Math.max(o.peak||0, o.members);
  // Las cuotas (o las ofrendas).
  o.treasury += Math.round(o.members * k.dues * priceIndex());
  // Cuanto más grande, más difícil de esconder.
  o.secrecy = clamp(Math.round(o.secrecy - (o.members/45) * k.exposure + (neglect ? 1 : 0)), 0, 100);
  o.influence = clamp(o.influence + (delta > 0 ? 1 : delta < 0 ? -1 : 0) - (neglect ? 2 : 0), 0, 100);
  if(o.members <= 0){ dissolveOrg('colapso'); return; }
  // Alguien afuera empieza a preguntar.
  const risk = clamp((55 - o.secrecy)/100 * k.exposure * (1 + o.members/120), 0, 0.45);
  if(risk > 0 && chance(risk)) orgExposed();
}
function orgExposed(){
  const o = org(), k = orgKind();
  const w = pick(k.watchers.filter(f=>F(f) && f !== o.sponsor));
  if(!w) return;
  factionAdjust(w, {suspicion:[5,12]}, true);
  raiseAttention(rndInt(2,6));
  o.exposures = (o.exposures||0) + 1;
  if(o.secrecy < 25 && chance(0.5) && !STATE.pendingConsequences.some(pc=>pc.eventId === 'org_raid')){
    scheduleConsequence({inMonths:[1,3], eventId:'org_raid', ctx:{faction:w}});
  } else {
    logJournal(o.name, `${cap(factionShort(w))} empieza a preguntar por ${o.name}. Todavía no saben quién la conduce.`, {cat:'faction', imp:1});
  }
}

/* ------------------------------ el linaje ------------------------------ */
// Quien sigue la historia hereda la conducción. Algunos se van con el fundador.
function orgPassTo(heirName, close){
  const o = org(); if(!o) return '';
  o.members = Math.max(1, Math.round(o.members * (close ? 0.9 : 0.75)));
  o.influence = clamp(Math.round(o.influence * (close ? 0.9 : 0.7)), 0, 100);
  o.lastAct = STATE.time.totalMonths; o.lastTick = STATE.time.totalMonths;
  o.leader = heirName;
  return `${o.name} espera tu palabra: ${o.members} ${o.members === 1 ? 'persona' : 'personas'} que ${close ? 'ya te conocían' : 'sólo conocían a quien la fundó'}.`;
}
// Para la biografía.
function orgLifeLines(){
  const o = org(), out = [];
  const gen = generationNumber();
  // Sólo lo que terminó en esta vida (lo de antes está en la historia de quien vino antes).
  (STATE.flags.orgHistory||[]).filter(h=>(h.endedGen ?? gen) === gen).forEach(h=>{
    out.push((h.founderGen ?? gen) === gen
      ? `Fundó ${h.name}, que llegó a tener ${h.peak} miembros y dejó de existir en ${h.ended}.`
      : `Condujo ${h.name}, ${ORG_KINDS[h.kind].short} que había fundado ${h.founder}, hasta que dejó de existir en ${h.ended}.`);
  });
  if(o){
    if(o.founderGen === gen) out.push(`Fundó ${o.name}, que llegó a tener ${o.peak} miembros${o.cities.length > 1 ? ` en ${o.cities.length} ciudades` : ''}.`);
    else out.push(`Condujo ${o.name}, ${ORG_KINDS[o.kind].short} que había fundado ${o.founder}.`);
  }
  return out;
}
