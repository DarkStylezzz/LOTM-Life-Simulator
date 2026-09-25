'use strict';
/* =========================================================================
   systems/economy.js — trabajo y economía (§4, §23, §32).
   Cada mes: sueldo (según trabajo, ciudad, prosperidad, inflación y
   desempeño) menos gastos (estilo de vida × costo de la ciudad × tamaño
   del hogar, alquiler o mantenimiento), más intereses del banco, menos
   intereses de la deuda. Si no alcanza, te endeudás; si la deuda crece
   demasiado, llegan los cobradores; si se vuelve impagable, la quiebra.
   El desempeño laboral sufre cuando la vida oculta te saca del trabajo:
   faltar por un ritual también es una decisión con costo.
   DINERO ≠ PODER SOBRENATURAL: casi nada místico se compra; lo que sí
   (mercado negro), suele ser falso, incompleto o peligroso.
   ========================================================================= */
function priceIndex(){ return STATE.world.priceIndex || 1; }
function jobDef(label){ return JOBS[label || STATE.character.profesion] || null; }
function isEmployed(){ const j = jobDef(); return !!j && j.salary > 0; }
function educationRank(){ return EDUCATION_RANK[STATE.character.educacion] || 0; }

function setJob(label){
  const c = STATE.character;
  if(!JOBS[label]) return;
  const prev = c.profesion;
  c.profesion = label;
  c.job = c.job || {};
  c.job.months = 0; c.job.performance = 55; c.job.lastChange = STATE.time.totalMonths;
  if(prev !== label) logJournal('Nuevo empleo', `Empezás a trabajar como ${label.toLowerCase()}.`, {cat:'life', imp:1});
}
function jobEligible(label){
  const j = JOBS[label]; const c = STATE.character;
  if(!j || j.salary <= 0) return false;
  if(c.edad < (j.ageMin || 16)) return false;
  if(educationRank() < (j.edu||0)) return false;
  if(j.port && !currentCity().port) return false;
  return true;
}
function availableJobs(){ return Object.keys(JOBS).filter(jobEligible); }
function bestAvailableJob(){
  const opts = availableJobs().filter(l=>JOBS[l].tier <= 2);
  return opts.length ? pick(opts) : 'Obrero';
}
function jobPerformance(delta){
  const c = STATE.character;
  if(!isEmployed()) return;
  c.job.performance = clamp((c.job.performance||55) + delta, 0, 100);
}
function monthlySalary(){
  const c = STATE.character, j = jobDef();
  if(!j) return 0;
  if(c.profesion === 'Retirado/a') return Math.round((c.job.pensionBase||0) * priceIndex());
  if(j.salary <= 0) return 0;
  const city = currentCity();
  const perf = 0.8 + (c.job.performance||55)/250;       // 0.8 a 1.2
  const seniority = 1 + Math.min(0.3, (c.job.months||0)/480);
  return Math.round(j.salary * Math.sqrt(city.cost) * worldIncomeMult() * perf * seniority * priceIndex() + (c.incomeBonus||0));
}
function householdFactor(){
  let f = 1;
  const s = spouseNpc();
  if(s) f += 0.5;
  f += childrenNpcs().filter(k=>k.alive && npcAge(k) < 18 && !k.flags.leftHome).length * 0.3;
  return f;
}
function monthlyExpenses(){
  const c = STATE.character;
  if(c.edad < 18) return 0;
  const ls = LIFESTYLES[c.lifestyle||'normal'] || LIFESTYLES.normal;
  const city = currentCity();
  const living = ls.living * city.cost * householdFactor();
  const housing = c.vivienda ? (c.vivienda.valor||10000) * 0.0008 : ls.rent * city.cost;
  const tuition = c.university ? TUITION_PER_SEASON/3 : 0;
  return Math.round((living + housing + tuition) * priceIndex());
}
function spouseIncome(){
  const s = spouseNpc();
  if(!s || npcAge(s) >= 66) return 0;
  const base = s.clase === 'Alta' ? 160 : s.clase === 'Media' ? 90 : 55;
  return Math.round(base * 0.6 * priceIndex());
}
function monthlyEconomy(){
  const c = STATE.character;
  if(c.edad < 18){
    // Con tu familia: una pequeña asignación, sin gastos propios.
    if(c.edad >= 10) c.cash += ALLOWANCE_BY_CLASS[c.clase] || 1;
    return;
  }
  const income = monthlySalary() + spouseIncome() + rentalIncome();
  const expenses = monthlyExpenses();
  c.cash += income - expenses;
  // Banco: interés modesto.
  if(c.bank > 0) c.bank = Math.round(c.bank * 1.002);
  // Deuda: interés que muerde y una cuota mensual (amortización a ~15 años).
  if(c.debt > 0){
    const interest = Math.round(c.debt * 0.006);
    c.debt += interest;
    const due = Math.min(c.debt, Math.max(Math.round(12*priceIndex()), interest + Math.round(c.debt/180)));
    let paid = Math.min(due, Math.max(0, c.cash)); c.cash -= paid;
    if(paid < due){ const fb = Math.min(c.bank, due - paid); c.bank -= fb; paid += fb; }
    c.debt -= paid;
    STATE.flags.missedPayments = paid < due ? (STATE.flags.missedPayments||0) + 1 : Math.max(0, (STATE.flags.missedPayments||0) - 1);
  } else STATE.flags.missedPayments = 0;
  // Si no alcanza: primero el banco, después la deuda.
  if(c.cash < 0){
    const fromBank = Math.min(c.bank, -c.cash);
    c.bank -= fromBank; c.cash += fromBank;
    if(c.cash < 0){ c.debt += -c.cash; c.cash = 0; STATE.flags.missedPayments = (STATE.flags.missedPayments||0) + 1; }
  }
  if(isEmployed()){
    c.job.months = (c.job.months||0) + 1;
    // Deriva del desempeño: disciplina, salud, heridas, síntomas y ausencias
    // por la vida oculta (las acciones místicas de la temporada).
    let drift = 0.3;
    if(c.rasgos.includes('Disciplinado')) drift += 0.4;
    if(c.salud < 40) drift -= 1.5;
    drift -= (woundMods().work||0) + (conditionMods().work||0);
    const mystic = STATE.season.mysticActs || 0;
    if(mystic >= 2) drift -= (mystic-1) * 0.8;
    if((c.humanity??100) < 50) drift -= 0.8;
    jobPerformance(drift);
    c.job.pensionBase = Math.max(c.job.pensionBase||0, Math.round((JOBS[c.profesion].salary||0)*0.4));
    // Despido o ascenso.
    if(c.job.performance < 18 && chance(0.12)) fireFromJob();
    else if(c.job.performance > 85 && c.job.months > 18 && chance(0.03)) promoteInJob();
  }
  checkDebtPressure();
}
function yearlyEconomy(){
  // Inflación (§32): los precios suben de a poco y el efectivo guardado vale menos.
  const inf = rnd(0.004, 0.025) + (STATE.world.war ? 0.03 : 0);
  STATE.world.priceIndex = Math.round(priceIndex() * (1 + inf) * 10000)/10000;
  const c = STATE.character;
  if(c.vivienda) c.vivienda.valor = Math.round(c.vivienda.valor * (1 + inf + (currentCityState().prosperity-50)/1000));
  (c.properties||[]).forEach(p=>{ p.valor = Math.round(p.valor * (1 + inf)); });
  growChildren();
}
function fireFromJob(){
  const c = STATE.character;
  const prev = c.profesion;
  c.profesion = 'Desempleado';
  applyEffects({sanity:[-8,-3], reputation:[-4,-1]});
  logJournal('Despedido', `Te echan de tu trabajo como ${prev.toLowerCase()}. "No estás rindiendo." Tenían razón, y eso lo hace peor.`, {cat:'life', imp:2});
  remember('fired', `Te despidieron de tu trabajo como ${prev.toLowerCase()}.`, {cat:'loss'});
  STATE._importantMoment = true;
}
function promoteInJob(){
  const c = STATE.character;
  const j = jobDef();
  const next = (j.next||[]).filter(jobEligible);
  if(next.length && chance(0.5)){ const n = pick(next); setJob(n); logJournal('Un ascenso', `Te ofrecen el puesto de ${n.toLowerCase()}. Lo aceptás antes de que se arrepientan.`, {cat:'achievement', imp:2}); addMilestone('achievement', `Asciende a ${n}`); }
  else { c.incomeBonus = (c.incomeBonus||0) + rndInt(8,20); logJournal('Un aumento', 'Tu jefe te llama a la oficina. Por una vez, son buenas noticias: un aumento.', {cat:'life', imp:1}); }
  c.job.performance = 60;
}
function checkDebtPressure(){
  const c = STATE.character;
  const salary = Math.max(40, monthlySalary());
  const missed = STATE.flags.missedPayments || 0;
  if(missed >= 3 && chance(0.15)){
    applyEffects({sanity:[-6,-2], reputation:[-3,-1]});
    logJournal('Los cobradores', 'Dos hombres de sombrero te esperan en la puerta. No amenazan: explican, con mucha paciencia, lo que les pasa a los que no pagan.', {cat:'life', imp:2});
    STATE._importantMoment = true;
  }
  if((missed >= 18 || (missed >= 6 && c.debt > salary * 40)) && !STATE.flags.bankrupt){
    STATE.flags.bankrupt = STATE.time.totalMonths;
    const lostHouse = !!c.vivienda;
    if(c.vivienda){ c.debt = Math.max(0, c.debt - c.vivienda.valor*0.7); c.vivienda = null; }
    c.lifestyle = 'austero';
    const down = {Alta:'Media', Media:'Baja', Baja:'Baja'}[c.clase]; c.clase = down;
    c.debt = Math.round(c.debt * 0.5);
    applyEffects({sanity:[-15,-8], reputation:[-10,-5]});
    logJournal('La quiebra', `Lo perdés ${lostHouse ? 'casi todo, incluida la casa' : 'casi todo'}. Te declarás en quiebra. Tu familia te mira como a alguien que se cayó de un techo.`, {cat:'life', imp:3});
    remember('bankruptcy', 'Quebraste.', {cat:'trauma'});
    addMilestone('loss', 'Queda en la ruina');
    STATE._importantMoment = true;
  }
}
function rentalIncome(){ return Math.round((STATE.character.properties||[]).reduce((a,p)=>a + p.valor*0.004, 0)); }

/* ------------------------------ acciones de trabajo ------------------------------ */
function workExtra(){
  if(timeBlocked()) return;
  const c = STATE.character;
  if(c.edad < 14){ toast('Todavía sos muy chico para trabajar.', 'neg'); return; }
  if(!canUseSeasonAction('work')){ toast('Ya trabajaste de más esta temporada.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  useSeasonAction('work');
  const classMult = {Baja:1, Media:1.5, Alta:2.2}[c.clase] || 1;
  const base = isEmployed() ? Math.max(40, monthlySalary()*0.6) : rndInt(40,90)*classMult;
  const eff = { cash: Math.round(base * rnd(0.8,1.2)), salud: -rndInt(1,4), sanity: -rndInt(0,3) };
  const ch = applyEffects(eff);
  jobPerformance(4);
  const text = `Trabajás horas extra como ${(isEmployed()?c.profesion:'changarín').toLowerCase()}. El cansancio se nota, pero el sueldo lo compensa.`;
  logJournal('Horas extra', text, {cat:'life'});
  setResolution('Horas extra', text, ch);
  saveGame(true); renderAll();
}
// Buscar empleo: ya no es una tirada contra una escalera fija. Aparecen
// ofertas concretas (según educación, ciudad, reputación y suerte) y elegís.
function monthsSinceLastJobSearch(){ return STATE.time.totalMonths - (STATE.flags.lastJobSearchMonth ?? -999); }
function canSeekJob(){ return monthsSinceLastJobSearch() >= 6; }
function seekBetterJob(){
  if(timeBlocked()) return;
  const c = STATE.character;
  if(c.edad < 14){ toast('Todavía sos muy chico para buscar empleo.', 'neg'); return; }
  if(!canSeekJob()){ toast('Todavía no pasó suficiente tiempo desde tu última búsqueda.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  STATE.flags.lastJobSearchMonth = STATE.time.totalMonths;
  const cur = jobDef() || {tier:0};
  const educBonus = EDUCATION_JOB_BONUS[c.educacion] || 0;
  const repBonus = clamp(c.reputation,0,100)/400;
  const base = 0.4 + educBonus + repBonus + getTraitMods().jobSearchBonus + luckMod() + (currentCityState().prosperity-50)/200;
  const pool = availableJobs().filter(l=>l!==c.profesion && l!=='Retirado/a');
  const offers = [];
  // Siempre se intenta la escalera "natural" del sistema original.
  const natural = JOB_UPGRADES[c.profesion];
  if(natural && jobEligible(natural) && chance(clamp(base,0.1,0.85))) offers.push(natural);
  shuffle(pool).forEach(l=>{
    if(offers.length >= 3 || offers.includes(l)) return;
    const j = JOBS[l];
    const p = clamp(base - (j.tier - cur.tier)*0.15 + (j.align && STATE.pathway.chosenPathway && (j.align[STATE.pathway.chosenPathway]||[]).includes(STATE.pathway.sequence) ? 0.1 : 0), 0.05, 0.8);
    if(chance(p*0.6)) offers.push(l);
  });
  if(!offers.length){
    applyEffects({reputation:-1});
    const text = 'Buscás algo mejor, pero no aparece ninguna oportunidad real. Por ahora seguís donde estabas.';
    logJournal('Búsqueda de empleo', text, {cat:'life'});
    setResolution('Búsqueda de empleo', text, []);
    saveGame(true); renderAll(); return;
  }
  STATE.pendingEvent = {
    kind:'jobs', title:'Ofertas de trabajo', text:'Después de varias semanas de entrevistas y puertas cerradas, tenés algo concreto sobre la mesa.',
    choices: offers.map((l,i)=>({idx:i, label:l, small:`${fmtMoney(Math.round(JOBS[l].salary*Math.sqrt(currentCity().cost)*priceIndex()))} por mes aprox. · ${JOBS[l].desc}${JOBS[l].time<0?' · Te deja menos tiempo libre.':JOBS[l].time>0?' · Te deja más tiempo libre.':''}`, job:l}))
      .concat([{idx:offers.length, label:'Quedarte donde estás', small:'Ninguna te convence.'}])
  };
  saveGame(true); renderAll();
}
function resolveJobOffer(idx){
  const pe = STATE.pendingEvent;
  const ch = pe.choices[idx];
  STATE.pendingEvent = null;
  if(ch && ch.job){
    setJob(ch.job);
    remember('new_job', `Empezaste a trabajar como ${ch.job.toLowerCase()}.`, {cat:'choice'});
    setResolution('Nuevo empleo', `Aceptás el puesto de ${ch.job.toLowerCase()}.`, []);
  } else setResolution('Búsqueda de empleo', 'Decidís quedarte donde estás.', []);
  saveGame(true); renderAll();
}
function retire(){
  const c = STATE.character;
  if(c.edad < 58){ toast('Todavía te faltan años para retirarte.', 'neg'); return; }
  if(c.profesion === 'Retirado/a') return;
  const yrs = Math.floor((c.job.months||0)/12);
  c.job.pensionBase = Math.round((c.job.pensionBase||30) * (yrs >= 20 ? 1 : 0.5));
  c.profesion = 'Retirado/a';
  logJournal('El retiro', `Dejás de trabajar. ${c.job.pensionBase ? 'Te queda una pensión modesta.' : 'No te queda casi nada: vas a vivir de lo que ahorraste.'} Las mañanas se vuelven enormes.`, {cat:'life', imp:2});
  addMilestone('achievement', 'Se retira');
  saveGame(true); renderAll();
}

/* ------------------------------ finanzas ------------------------------ */
function bankDeposit(amount){
  const c = STATE.character; amount = Math.min(amount, c.cash);
  if(amount <= 0) return; c.cash -= amount; c.bank += amount; saveGame(true); renderAll();
}
function bankWithdraw(amount){
  const c = STATE.character; amount = Math.min(amount, c.bank);
  if(amount <= 0) return; c.bank -= amount; c.cash += amount; saveGame(true); renderAll();
}
function loanLimit(){ return Math.round(Math.max(0, monthlySalary()*10 + (STATE.character.vivienda ? STATE.character.vivienda.valor*0.3 : 0) - STATE.character.debt)); }
function takeLoan(amount){
  const c = STATE.character;
  amount = Math.min(amount, loanLimit());
  if(amount <= 0){ toast('Ningún banco te presta más.', 'neg'); return; }
  c.cash += amount; c.debt += Math.round(amount*1.05);
  logJournal('Un préstamo', `Firmás un préstamo por ${fmtMoney(amount)}. El interés es "razonable", según el banco.`, {cat:'life', imp:1});
  saveGame(true); renderAll();
}
function payDebt(amount){
  const c = STATE.character; amount = Math.min(amount, c.cash, c.debt);
  if(amount <= 0) return; c.cash -= amount; c.debt -= amount;
  if(c.debt === 0) logJournal('Sin deudas', 'Pagás la última cuota. Por primera vez en mucho tiempo, no le debés nada a nadie.', {cat:'life', imp:1});
  saveGame(true); renderAll();
}
function setLifestyle(key){ if(!LIFESTYLES[key]) return; STATE.character.lifestyle = key; saveGame(true); renderAll(); }

/* ------------------------------ vivienda ------------------------------ */
function housePrice(){
  const costByClass = {Baja:[8000,15000], Media:[15000,35000], Alta:[40000,90000]};
  const [a,b] = costByClass[STATE.character.clase] || costByClass.Media;
  return Math.round(((a+b)/2) * currentCity().cost * priceIndex());
}
function comprarVivienda(mortgage){
  if(timeBlocked()) return;
  const c = STATE.character;
  if(c.edad < 18){ toast('Todavía sos muy chico para esto.', 'neg'); return; }
  if(c.vivienda){ toast('Ya tenés una vivienda propia.', 'neg'); return; }
  const cost = Math.round(housePrice() * rnd(0.85,1.15));
  const down = mortgage ? Math.round(cost*0.25) : cost;
  if(c.cash + c.bank < down){ toast(`Te faltaría dinero: ${mortgage?'el adelanto':'una vivienda'} ronda ${fmtMoney(down)}.`, 'neg'); return; }
  if(mortgage && monthlySalary() < 40){ toast('Sin un ingreso fijo, ningún banco te da una hipoteca.', 'neg'); return; }
  if(mortgage){ const pay = Math.round((cost-down)*1.15*(0.006 + 1/180)); if(pay > (monthlySalary()+spouseIncome())*0.45){ toast(`El banco hace cuentas: la cuota rondaría ${fmtMoney(pay)} por mes. Con lo que ganás, no llegás.`, 'neg'); return; } }
  if(c.cash >= down) c.cash -= down; else { c.bank -= (down - c.cash); c.cash = 0; }
  if(mortgage) c.debt += Math.round((cost - down)*1.15);
  c.vivienda = {tipo: c.clase==='Alta' ? 'Casa' : (c.clase==='Media' ? 'Departamento' : 'Habitación propia'), valor:cost, city:currentCityKey()};
  applyEffects({reputation:[2,6], sanity:[3,6]});
  const text = `${c.nombre} ${c.apellido} compra ${c.vivienda.tipo.toLowerCase()} propio por ${fmtMoney(cost)}${mortgage?' (con hipoteca)':''}. Un lugar al que volver.`;
  logJournal('Vivienda propia', text, {cat:'family', imp:2});
  remember('bought_house', `Compraste tu ${c.vivienda.tipo.toLowerCase()}.`, {cat:'achievement'});
  addMilestone('family', `Compra ${c.vivienda.tipo.toLowerCase()} propia`);
  setResolution('Vivienda propia', text, []);
  saveGame(true); renderAll();
}
function venderVivienda(){
  const c = STATE.character; if(!c.vivienda) return;
  const v = Math.round(c.vivienda.valor * rnd(0.9,1.05));
  c.cash += v; c.vivienda = null;
  logJournal('Vendés tu casa', `Vendés tu vivienda por ${fmtMoney(v)}. La última noche no dormís.`, {cat:'family', imp:1});
  saveGame(true); renderAll();
}
function buyRentalProperty(){
  const c = STATE.character;
  const cost = Math.round(housePrice()*0.6);
  if(c.cash + c.bank < cost){ toast(`Una propiedad para alquilar ronda ${fmtMoney(cost)}.`, 'neg'); return; }
  if(c.cash >= cost) c.cash -= cost; else { c.bank -= (cost - c.cash); c.cash = 0; }
  c.properties = c.properties || [];
  c.properties.push({valor:cost, city:currentCityKey(), since:calendarYear()});
  logJournal('Una propiedad', `Comprás una propiedad para alquilar por ${fmtMoney(cost)}. Ahora sos, también, alguien que cobra alquileres.`, {cat:'life', imp:1});
  saveGame(true); renderAll();
}

/* ------------------------------ mercado negro ------------------------------ */
// Requiere conocer el secreto 'black_market'. Caro, riesgoso y poco confiable.
// Las ofertas se fijan por temporada: no cambian cada vez que mirás.
function blackMarketOffers(){
  if(!knowsLore('black_market')) return [];
  const season = Math.floor(STATE.time.totalMonths/3);
  if(STATE.bmOffers && STATE.bmOffers.season === season) return STATE.bmOffers.offers;
  const offers = buildBlackMarketOffers();
  STATE.bmOffers = {season, offers};
  return offers;
}
function buildBlackMarketOffers(){
  const offers = [];
  const target = STATE.pathway.chosenPathway ? {p:STATE.pathway.chosenPathway, s:STATE.pathway.sequence-1} : null;
  const ids = identifiedPathways();
  const p = target ? target.p : (ids.length ? pick(ids) : null);
  const s = target ? target.s : 9;
  if(p && s >= 0){
    offers.push({kind:'formula', pathway:p, seq:s, price:Math.round((400 + (9-s)*900)*priceIndex()), label:`Una fórmula que dicen que es "${formulaName(p,s)}"`});
    const need = ingredientsNeededFor(p, s).filter(n=>ownedQty(p, n) <= 0);
    if(need.length){ const nm = pick(need); offers.push({kind:'ingredient', pathway:p, seq:s, name:nm, price:Math.round((250 + (9-s)*700)*priceIndex()), label:`Un ingrediente: ${nm}`}); }
  }
  offers.push({kind:'artifact', price:Math.round(rndInt(300,900)*priceIndex()), label:'Un objeto "con historia" que el vendedor no quiere describir'});
  return offers;
}
function buyBlackMarket(i){
  if(timeBlocked()) return;
  const offers = blackMarketOffers();
  const o = offers[i]; if(!o || o.sold) return;
  const c = STATE.character;
  if(c.cash < o.price){ toast('No te alcanza.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  c.cash -= o.price; raiseAttention(rndInt(2,5)); markMysticAct();
  let text;
  if(o.kind === 'formula'){
    const r = Math.random();
    const fid = r < 0.4 ? 'true' : r < 0.7 ? 'partial' : 'false';
    addFormula(o.pathway, o.seq, fid, 'el mercado negro');
    text = 'Te dan un papel doblado en cuatro. Parece auténtico. Todo parece auténtico en el mercado negro.';
  } else if(o.kind === 'ingredient'){
    const real = chance(0.65);
    if(real) addIngredient(o.pathway, o.seq, o.name, rndInt(45,85), 'el mercado negro');
    else addItem({cat:'misc', name:o.name+' (dudoso)', desc:'Se parece a lo que buscabas. Demasiado.', rarity:'comun', provenance:'el mercado negro', risk:'Probablemente falso.'}, 1);
    text = real ? `Te entregan ${o.name}. Parece real.` : `Te entregan algo que se parece a ${o.name}. Recién en tu casa notás que es una imitación.`;
  } else {
    addArtifact(pick(ARTIFACT_KEYS), 'el mercado negro');
    text = 'El vendedor te lo da envuelto en tela negra y no te mira mientras cobra.';
  }
  o.sold = true;
  logJournal('Mercado negro', text, {cat:'mystery', imp:1});
  setResolution('Mercado negro', text, []);
  saveGame(true); renderAll();
}
