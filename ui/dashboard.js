'use strict';
/* =========================================================================
   ui/dashboard.js — la pestaña "Vida" (§39).
   Arriba, siempre, lo que está viviendo el personaje: la escena abierta
   (evento, misión, ritual, combate) o lo último que pasó. Después, cómo
   seguir (avanzar el tiempo), la vida actual y —sólo si corresponde— el
   estado sobrenatural. Trabajo, dinero y casa quedan plegados.
   ========================================================================= */
const RARITY_TAG = {uncommon:null, rare:['Raro','violet'], mystic:['Místico','violet'], extraordinary:['Extraordinario','gold']};
const SCENE_KIND_LABEL = {ritual:'El ritual', brew:'Preparar la poción', drink:'Beber la poción', acting:'Actuar', jobs:'Buscar trabajo', combat_after:'Después del combate', divinity:'El ascenso'};

function renderDashboard(){
  if(isDivine()) return renderDivineDashboard();
  const out = [];
  if(STATE.combat) out.push(renderCombat());
  else if(STATE.pendingEvent) out.push(eventCard(STATE.pendingEvent));
  else if(STATE.pendingMission) out.push(missionCard(STATE.pendingMission));
  else { out.push(resolutionCard()); out.push(advanceControls()); }
  out.push(`<div class="dash-grid">${lifeCard()}${supernaturalCard()}</div>`);
  out.push(`<div class="only-narrow">${seasonCard()}</div>`);
  out.push(summariesSection());
  if(STATE.character.edad >= 14) out.push(collapsible('work', 'Trabajo y dinero', workSection(), {badge: fmtMoney(STATE.character.cash + STATE.character.bank - STATE.character.debt)}));
  if(STATE.character.edad >= 18) out.push(collapsible('home', 'Casa y estilo de vida', homeSection()));
  return out.join('');
}

/* ------------------------------ escena abierta ------------------------------ */
function eventCard(pe){
  const kindLabel = SCENE_KIND_LABEL[pe.kind] || '';
  const step = pe.totalSteps ? `<span class="step-pill">Paso ${pe.step+1} de ${pe.totalSteps}</span>` : '';
  const rt = pe.kind === 'event' && RARITY_TAG[pe.rarity] ? tag(RARITY_TAG[pe.rarity][0], RARITY_TAG[pe.rarity][1]) : '';
  let extra = '';
  if(pe.kind === 'acting'){
    const r = currentRole();
    extra = actingMethodLevel() >= 1 && r ? `<p class="role-hint">${tierMark(actingMethodLevel()>=2?'objective':'estimated')} Tu papel: <b>${esc(r.role)}</b>. ${esc(r.principle)}</p>` : `<p class="role-hint">${tierMark('unknown')} No sabés bien qué te pide la poción. Hacé lo que te parezca.</p>`;
  }
  if(pe.kind === 'ritual' && pe.step === 4) extra = `<p class="role-hint">${tierMark('estimated')} Es un presentimiento, no una certeza.</p>`;
  return `<article class="evt-card scene ${pe.kind||''}" aria-labelledby="scene-title">
    <div class="evt-date">${esc(dateLabel())}${kindLabel ? ' · ' + esc(kindLabel) : ''} ${step} ${rt}</div>
    <h2 class="evt-title" id="scene-title" tabindex="-1">${esc(pe.title||'')}</h2>
    <div class="evt-text">${paragraphs(pe.text)}</div>${extra}
    ${choiceButtons(pe.choices||[], 'choose')}
  </article>`;
}
function missionCard(pm){
  const tpl = MISSION_BY_ID[pm.missionId];
  return `<article class="evt-card scene mission" aria-labelledby="scene-title">
    <div class="evt-date">${esc(dateLabel())} · Encargo · ${esc(MISSION_TYPE_LABEL[pm.type] || pm.type)} ${pm.risk ? tag('Riesgo: '+pm.risk, /Alta|Extrema/.test(pm.risk)?'crimson':'') : ''}</div>
    <h2 class="evt-title" id="scene-title" tabindex="-1">${esc(pm.title)}</h2>
    <div class="evt-text">${paragraphs(pm.text)}</div>
    ${choiceButtons(pm.choices||[], 'mission-choose')}
  </article>`;
}
function paragraphs(t){ return String(t||'').split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join(''); }
onAct('choose', (d)=>{ resolvePendingEvent(+d.idx); }, {scene:true});
onAct('mission-choose', (d)=>{ resolveMissionChoice(+d.idx); }, {scene:true});

function resolutionCard(){
  const r = STATE.lastResolution;
  if(r && STATE.time.totalMonths - (r.month||0) <= 3){
    return `<article class="evt-card resolution" aria-live="polite"><div class="evt-date">${esc(dateLabel())}</div>
      <h2 class="evt-title">${esc(r.title)}</h2><div class="evt-text">${paragraphs(r.text)}</div>${changeChips(r.changes)}</article>`;
  }
  const s = STATE.lastSeasonSummary;
  const quiet = s && s.quiet ? 'Una temporada tranquila. De esas que después no se recuerdan, y que hacen falta.' : 'La vida sigue su curso.';
  return `<article class="evt-card resolution quiet"><div class="evt-date">${esc(dateLabel())}</div><h2 class="evt-title">${esc(lifeStageLabel(STATE.character.edad))}</h2><div class="evt-text"><p>${esc(quiet)}</p></div></article>`;
}
function advanceControls(){
  const left = 3 - (STATE.time.totalMonths % 3);
  return `<div class="advance-row" role="group" aria-label="Avanzar el tiempo">
    <button class="btn adv" data-act="advance" data-mode="month" title="Atajo: M">Un mes</button>
    <button class="btn adv" data-act="advance" data-mode="season" title="Atajo: T">Fin de la temporada${left>1 ? ` <small>(${left} meses)</small>` : ''}</button>
    <button class="btn btn-primary adv" data-act="advance" data-mode="important" title="Atajo: I">Hasta que pase algo</button>
  </div>
  <p class="small-note center">Nada importante se salta: si pasa algo que requiere tu decisión, el tiempo se detiene ahí.</p>`;
}
onAct('advance', (d)=>{
  if(timeBlocked()) return;
  if(isDivine()){ if(d.mode === 'decade') advanceTime(120); else advanceTime(12); return; }
  if(d.mode === 'month') advanceOneMonth();
  else if(d.mode === 'season') advanceOneSeason();
  else advanceUntilImportant();
});

/* ------------------------------ estado ------------------------------ */
function lifeCard(){
  const c = STATE.character;
  const job = c.profesion === 'Desempleado' ? (c.edad < 14 ? 'Sin ocupación (sos chico)' : 'Sin trabajo') : c.profesion;
  const partner = spouseNpc() || partnerNpc();
  const kids = childrenNpcs().filter(k=>k.alive).length;
  const rows = [
    ['Edad', ageText(c.edad) + ` · ${lifeStageLabel(c.edad)}`],
    ['Fecha', fullDateLabel()],
    ['Ubicación', c.ciudad],
    ['Ocupación', job + (c.educacion && c.edad >= 6 ? ` · ${c.educacion}` : '')],
    [c.edad < 16 ? 'Ahorros' : 'Dinero', `${fmtMoney(c.cash)}${c.bank ? ` · banco ${fmtMoney(c.bank)}` : ''}${c.debt ? ` · deuda ${fmtMoney(c.debt)}` : ''}`],
    ['Familia', c.edad < 18 ? minorFamilyLine() : [partner ? `${c.estadoCivil === 'Casado/a' ? gx('Casado','Casada','Casade') : 'En pareja'} con ${partner.name}` : c.estadoCivil, kids ? `${kids} hij${kids===1?'o':'os'}` : ''].filter(Boolean).join(' · ')]
  ];
  return `<section class="card life-card" aria-labelledby="life-h"><h2 class="card-h" id="life-h">Vida actual</h2>
    <dl class="kv">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${statRow('salud')}${statRow('reputation')}
    ${conditionsLine()}</section>`;
}
function minorFamilyLine(){
  const par = ['padre','madre'].map(id=>npcById(id)).filter(n=>n && n.alive);
  const sib = STATE.npcs.filter(n=>n.alive && n.id.startsWith('hermano')).length;
  return `Clase ${STATE.character.clase.toLowerCase()}` + (par.length ? ` · con ${listEs(par.map(n=>n.name.split(' ')[0]))}` : ' · sin padres') + (sib ? ` · ${sib} herman${sib===1?'o':'os'}` : '');
}
function conditionsLine(){
  const c = STATE.character;
  const bits = (c.conditions||[]).map(x=>CONDITIONS[x.id] ? CONDITIONS[x.id].name : null).concat((c.wounds||[]).map(w=>WOUNDS[w.id] ? WOUNDS[w.id].name : null)).filter(Boolean);
  return bits.length ? `<p class="small-note">Lo que cargás: ${bits.map(esc).join(', ')}.</p>` : '';
}
function supernaturalCard(){
  const p = STATE.pathway, c = STATE.character;
  const exposed = (STATE.flags.mysticExposure||0) >= 10 || maxPathwayKnowledge() >= 10;
  if(!p.chosenPathway && !exposed) return '';
  if(!p.chosenPathway){
    return `<section class="card mystic-card" aria-labelledby="myst-h"><h2 class="card-h" id="myst-h">Lo que no encaja</h2>
      <p class="card-text">${esc(pathwayThreads().length ? 'Hay cosas que no tienen explicación, y empiezan a parecerse entre sí.' : 'A veces sentís que el mundo te esconde algo.')}</p>
      ${statRow('sanity')}${statView('corruption').tier !== 'unknown' ? statRow('corruption') : ''}</section>`;
  }
  const pw = PATHWAYS[p.chosenPathway], sd = seqData(p.chosenPathway, p.sequence);
  return `<section class="card mystic-card" aria-labelledby="myst-h"><h2 class="card-h" id="myst-h">Estado sobrenatural</h2>
    <div class="seq-line"><span class="seq-num">${p.sequence}</span><div><div class="seq-name">${esc(sd ? sd.name : '')}</div><div class="seq-path">Vía ${esc(pw.name)}</div></div></div>
    ${statRow('digestion')}${statRow('sanity')}${statRow('corruption')}${statRow('spirituality')}${p.sequence <= 7 ? statRow('humanity') : ''}
    </section>`;
}
function summariesSection(){
  const s = STATE.lastSeasonSummary, y = STATE.lastYearSummary;
  if(!s && !y) return '';
  const parts = [];
  if(s) parts.push(`<div class="summary"><h3>${esc(s.label)}</h3>${s.quiet ? '<p>Una temporada tranquila.</p>' : `<ul>${s.events.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`}<p class="small-note">Tiempo libre usado: ${s.usedTime}/${s.freeTime}${s.money ? ` · dinero ${s.money>0?'+':''}${fmtMoney(s.money)}` : ''}</p></div>`);
  if(y && y.lines && y.lines.length) parts.push(`<div class="summary"><h3>El año ${y.year}</h3><ul>${y.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div>`);
  return collapsible('summaries', 'Lo que dejó el tiempo', parts.join(''), {open:false});
}

/* ------------------------------ trabajo y dinero ------------------------------ */
function workSection(){
  const c = STATE.character, j = jobDef();
  const perf = c.job.performance||55;
  const perfTxt = perf >= 80 ? 'Te va muy bien.' : perf >= 55 ? 'Cumplís.' : perf >= 35 ? 'Te miran con desconfianza.' : 'Estás por perder el puesto.';
  const income = monthlySalary() + spouseIncome() + rentalIncome(), exp = monthlyExpenses();
  const out = [];
  out.push(`<div class="kv-block"><div><b>${esc(c.profesion)}</b>${j && j.desc ? ` — ${esc(j.desc)}` : ''}</div>
    ${isEmployed() ? `<div class="small-note">Sueldo: ${fmtMoney(monthlySalary())}/mes · ${esc(perfTxt)}</div>` : ''}
    <div class="small-note">Por mes: entra ${fmtMoney(income)}, sale ${fmtMoney(exp)} (${income-exp >= 0 ? 'te sobra' : 'te falta'} ${fmtMoney(Math.abs(income-exp))}).</div></div>`);
  const acts = [];
  acts.push(actionButton({label:'Trabajar horas extra', small:'Plata a cambio de cansancio.', time:1, disabled: c.edad < 14 || !canUseSeasonAction('work') || !canSpendFreeTime(1), why: c.edad < 14 ? 'Sos muy chico.' : !canUseSeasonAction('work') ? 'Ya trabajaste de más esta temporada.' : 'Sin tiempo libre.'}, 'work-extra'));
  acts.push(actionButton({label:'Buscar un trabajo mejor', small:'Ofertas según tu educación, tu fama y tu ciudad.', time:1, disabled: c.edad < 14 || !canSeekJob() || !canSpendFreeTime(1), why: !canSeekJob() ? 'Buscaste hace poco.' : 'Sin tiempo libre.'}, 'seek-job'));
  if(c.edad >= 58 && c.profesion !== 'Retirado/a' && isEmployed()) acts.push(actionButton({label:'Retirarte', small:'Una pensión, si trabajaste lo suficiente.'}, 'retire'));
  out.push(`<div class="action-grid">${acts.join('')}</div>`);
  if(c.edad >= 18){
    const lim = loanLimit();
    out.push(`<h3 class="sub-h">Banco</h3><p class="small-note">En mano ${fmtMoney(c.cash)} · en el banco ${fmtMoney(c.bank)}${c.debt ? ` · deuda ${fmtMoney(c.debt)}` : ''}</p>
      <div class="btn-row">${btn('Depositar la mitad','bank',{mode:'dep'},{disabled:c.cash<=0})}${btn('Retirar todo','bank',{mode:'wd'},{disabled:c.bank<=0})}${btn('Pagar deuda','bank',{mode:'pay'},{disabled:!c.debt||!c.cash})}${btn(`Pedir un préstamo (${fmtMoney(lim)})`,'bank',{mode:'loan'},{disabled:lim<=0})}</div>`);
  }
  return out.join('');
}
onAct('work-extra', ()=>workExtra());
onAct('seek-job', ()=>seekBetterJob());
onAct('retire', ()=>confirmModal('¿Retirarte? No hay vuelta atrás en el trabajo.', ()=>{ retire(); saveGame(true); renderAll(); }, {yes:'Retirarme'}));
onAct('bank', (d)=>{
  const c = STATE.character;
  if(d.mode === 'dep') bankDeposit(Math.round(c.cash/2));
  else if(d.mode === 'wd') bankWithdraw(c.bank);
  else if(d.mode === 'pay') payDebt(c.debt);
  else if(d.mode === 'loan') confirmModal(`Un préstamo de ${fmtMoney(loanLimit())}. Se devuelve con intereses, todos los meses.`, ()=>takeLoan(loanLimit()), {yes:'Firmar'});
});
function homeSection(){
  const c = STATE.character;
  const ls = Object.entries(LIFESTYLES).map(([k,v])=>`<label class="opt-card small ${c.lifestyle===k?'sel':''}"><input type="radio" name="ls" value="${k}" ${c.lifestyle===k?'checked':''} data-change="lifestyle"><span class="opt-title">${esc(v.label)}</span><span class="opt-desc">${esc(v.desc)}</span></label>`).join('');
  const hp = housePrice();
  const house = c.vivienda ? `<p>Vivís en tu ${esc(c.vivienda.tipo.toLowerCase())} (vale unos ${fmtMoney(c.vivienda.valor)}).</p>${btn('Vender la vivienda','house',{mode:'sell'})}`
    : `<p>Alquilás. Una vivienda propia ronda ${fmtMoney(hp)}.</p><div class="btn-row">${btn('Comprar al contado','house',{mode:'cash'},{disabled:c.cash+c.bank<hp*0.85})}${btn('Comprar con hipoteca','house',{mode:'mortgage'},{disabled:c.cash+c.bank<hp*0.22})}</div>`;
  const props = (c.properties||[]).length;
  return `<fieldset class="opt-group"><legend>Estilo de vida</legend>${ls}</fieldset>
    <h3 class="sub-h">Vivienda</h3>${house}
    <h3 class="sub-h">Propiedades</h3><p class="small-note">${props ? `Tenés ${props} propiedad${props===1?'':'es'} alquilada${props===1?'':'s'}: ${fmtMoney(rentalIncome())}/mes.` : 'No tenés propiedades para alquilar.'}</p>${btn(`Comprar una para alquilar (~${fmtMoney(Math.round(hp*0.6))})`,'house',{mode:'rental'},{disabled:c.cash+c.bank<hp*0.6})}`;
}
onAct('lifestyle', (d, el)=>setLifestyle(el.value));
onAct('house', (d)=>{
  if(d.mode === 'sell') confirmModal('¿Vender tu vivienda?', ()=>venderVivienda(), {yes:'Vender'});
  else if(d.mode === 'cash') comprarVivienda(false);
  else if(d.mode === 'mortgage') comprarVivienda(true);
  else if(d.mode === 'rental') buyRentalProperty();
});

/* ------------------------------ modo divino ------------------------------ */
function renderDivineDashboard(){
  const d = STATE.divinity, p = STATE.pathway, c = STATE.character;
  const nd = seqData(p.chosenPathway, 0);
  const out = [];
  if(STATE.pendingEvent) out.push(eventCard(STATE.pendingEvent));
  else out.push(resolutionCard());
  out.push(`<section class="card divine-card"><h2 class="card-h">${esc(nd ? nd.name : 'Sequence 0')}</h2>
    <p class="card-text">${esc(DIVINE_TYPE_LABEL[d.type] || '')}. Hace ${d.years||0} año${(d.years||0)===1?'':'s'} que ocupás el trono de la vía ${esc(PATHWAYS[p.chosenPathway].name)}.</p>
    ${statRow('humanity')}
    <p class="small-note">Plegarias respondidas: ${d.prayersAnswered||0} · Veces que tocaste el mundo: ${d.domainActs||0}</p></section>`);
  if(!timeBlocked()){
    out.push(`<div class="action-grid">${divineActions().map(a=>actionButton({label:a.label, small:a.desc, time: a.id==='end'||a.id==='listen' ? 0 : 1, danger:a.id==='end'}, 'divine', {id:a.id})).join('')}</div>`);
    out.push(`<div class="advance-row">${btn('Que pase un año','advance',{mode:'year'},{cls:'adv'})}${btn('Que pase una década','advance',{mode:'decade'},{cls:'btn-primary adv'})}</div>`);
  }
  return out.join('');
}
onAct('divine', (d)=>{ if(d.id === 'end') confirmModal('Cerrar los ojos termina esta historia.', ()=>doDivineAction('end'), {yes:'Cerrar los ojos'}); else doDivineAction(d.id); });
