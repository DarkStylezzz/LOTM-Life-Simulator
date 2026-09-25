'use strict';
/* =========================================================================
   ui/mystic.js — "Misticismo" (§14–§22, §26, §28).
   Aparece recién cuando algo no encaja. Todo acá respeta la información
   oculta: las pistas no dicen si son ciertas; los hilos tienen nombre recién
   cuando se identifican; el Método de Actuación no se nombra hasta que lo
   entendés; la digestión es una sensación hasta que sabés medirla.
   ========================================================================= */
function mysticSections(){
  const p = STATE.pathway;
  const items = [];
  if(p.chosenPathway) items.push({id:'camino', label:'Tu camino'});
  items.push({id:'hilos', label: p.chosenPathway ? 'Otras vías' : 'Lo que no encaja', badge: pathwayThreads().filter(t=>!t.identified).length ? '' : ''});
  items.push({id:'investigar', label:'Investigar', badge: activeLeads().length ? String(activeLeads().length) : ''});
  if(!p.chosenPathway && (itemsByCat('formula').length || itemsByCat('potion').length || identifiedPathways().length)) items.push({id:'pocion', label:'La primera poción'});
  items.push({id:'saber', label:'Conocimiento'});
  if(STATE.anchors.revealed) items.push({id:'anclas', label:'Anclas'});
  if(STATE.tarot.stage >= 1) items.push({id:'tarot', label: STATE.tarot.stage >= 6 ? 'Tarot Club' : 'La niebla gris'});
  if(divinityVisible()) items.push({id:'trono', label:'El trono'});
  if(knowsLore('black_market')) items.push({id:'mercado', label:'Mercado negro'});
  return items;
}
function renderMystic(){
  const items = mysticSections();
  const cur = currentSub('mystic', items);
  let body = '';
  switch(cur){
    case 'camino': body = mysticPath(); break;
    case 'investigar': body = mysticResearch(); break;
    case 'pocion': body = mysticFirstPotion(); break;
    case 'saber': body = mysticLore(); break;
    case 'anclas': body = mysticAnchors(); break;
    case 'tarot': body = mysticTarot(); break;
    case 'trono': body = mysticThrone(); break;
    case 'mercado': body = mysticMarket(); break;
    default: body = mysticThreads();
  }
  return subnav('mystic', items) + `<div class="sub-body">${body}</div>`;
}

/* ------------------------------ tu camino ------------------------------ */
function mysticPath(){
  const p = STATE.pathway, c = STATE.character;
  const pw = PATHWAYS[p.chosenPathway], sd = seqData(p.chosenPathway, p.sequence);
  const r = currentRole();
  const lvl = actingMethodLevel();
  const out = [];
  out.push(`<section class="card"><div class="seq-line big"><span class="seq-num">${p.sequence}</span><div><div class="seq-name">${esc(sd.name)}</div><div class="seq-path">Vía ${esc(pw.name)} · ${esc(pw.theme||'')}</div></div></div>
    <p class="card-text">${esc(sd.ability||'')}</p>
    ${statRow('digestion')}
    ${lvl >= 1 && r ? `<div class="role-box"><div class="eyebrow">${lvl >= 2 ? 'El Método de Actuación' : 'Una intuición'}</div><div class="role-name">${esc(r.role)}</div><p>${esc(r.principle)}</p></div>` : `<p class="small-note">${tierMark('unknown')} Sentís la poción adentro, todavía ajena. No sabés bien qué hacer con eso.</p>`}
    ${lvl >= 2 && actingStyleLabel() ? `<p class="small-note">${esc(actingStyleLabel())}</p>` : ''}
  </section>`);
  // Actuar
  const canAct = canUseSeasonAction('acting') && canSpendFreeTime(1) && c.edad >= 13;
  out.push(sec('Vivir tu papel'));
  out.push(`<div class="action-grid">${actionButton({label: lvl >= 1 ? 'Actuar tu papel' : 'Usar lo que ahora sos', small: lvl >= 1 ? 'Una escena donde tu papel se pone a prueba.' : 'Dejar que la poción haga lo suyo, a ver qué pasa.', time:1, disabled:!canAct, why: !canUseSeasonAction('acting') ? 'Ya lo hiciste esta temporada.' : 'Sin tiempo libre.'}, 'acting')}</div>`);
  // Advancement
  if(p.sequence > 0){
    const reqs = advancementRequirements();
    const target = p.sequence - 1;
    out.push(sec(target === 0 ? 'El trono' : `Hacia la Sequence ${target}`));
    const nd = seqData(p.chosenPathway, target);
    out.push(`<section class="card"><p class="card-text">${target === 0 ? 'Lo que viene ya no es una poción.' : `La próxima poción: <b>${esc(nd ? nd.name : '')}</b>.`}</p>${reqList(reqs)}
      ${btn(target === 0 ? 'Subir al trono' : 'Comenzar el ritual', 'advance-ritual', {}, {cls:'btn-primary', disabled:!reqs.every(x=>x.ok)})}</section>`);
    if(target > 0){
      const br = brewRequirements(p.chosenPathway, target);
      const hasPot = potionItems(p.chosenPathway, target).length > 0;
      if(!hasPot){
        out.push(`<section class="card"><h3 class="sub-h">Preparar la poción de ${esc(nd ? nd.name : 'la próxima Sequence')}</h3>${reqList(br)}${btn('Preparar la poción','brew',{p:p.chosenPathway, s:target},{disabled:!br.every(x=>x.ok)})}</section>`);
      }
    }
  }
  // Habilidades
  const abs = unlockedAbilities();
  if(abs.length){
    out.push(sec('Lo que podés hacer'));
    out.push(`<ul class="ability-list">${abs.slice().reverse().map(a=>`<li><span class="ab-name">${esc(a.name)}</span> <span class="dim">Seq ${a.seq}${a.cost ? ' · combate' : ''}</span><br><span class="small-note">${esc(a.desc||'')}</span></li>`).join('')}</ul>`);
  }
  const pa = powerActions();
  if(pa.length){
    out.push(sec('Usar tu poder'));
    out.push(`<div class="action-grid">${pa.map(a=>actionButton({label:a.label, small:a.desc, time:a.time, disabled:!canSpendFreeTime(a.time||1), why:'Sin tiempo libre.'}, 'power', {id:a.id})).join('')}</div>`);
  }
  return out.join('');
}
onAct('acting', ()=>doActing());
onAct('advance-ritual', ()=>{
  const p = STATE.pathway;
  const msg = p.sequence === 1 ? 'Una vez que empiece, no hay vuelta atrás. El mundo va a enterarse.' : 'Un ritual de Advancement puede salir mal. Muy mal. ¿Empezar?';
  confirmModal(msg, ()=>attemptAdvancement(), {yes:'Empezar', title: p.sequence === 1 ? 'El trono' : 'El ritual'});
});
onAct('brew', (d)=>startBrew(d.p, +d.s));
onAct('power', (d)=>doPowerAction(d.id));

/* ------------------------------ hilos (vías) ------------------------------ */
function mysticThreads(){
  const ts = pathwayThreads().filter(t=>t.key !== STATE.pathway.chosenPathway);
  const out = [];
  out.push(`<p class="intro-text">${STATE.pathway.chosenPathway ? 'Lo que sabés (o creés saber) de otros caminos.' : 'Cosas que no tienen explicación. Algunas se parecen entre sí. Algunas no son lo que parecen.'}</p>`);
  if(!ts.length) return out.join('') + emptyState('Todavía nada. O nada que hayas notado.');
  ts.forEach(t=>{
    const unv = t.clues.filter(c=>!c.resolved && !c.verified).length;
    out.push(`<section class="card thread ${t.identified?'identified':''}">
      <div class="thread-head"><h3 class="thread-title">${esc(threadTitle(t))}</h3><span class="pathway-stage stage-${stageIndex(t.stage)}">${esc(t.stage)}</span></div>
      ${t.identified ? `<p class="card-text">${esc(PATHWAYS[t.key].theme||'')}</p>` : ''}
      ${t.contradictory ? `<p class="small-note warn">${tierMark('estimated')} Las pistas de este hilo no terminan de cerrar entre sí.</p>` : ''}
      <ul class="clue-list">${t.clues.slice(-5).reverse().map(c=>`<li>${clueBadge(c)} ${esc(cap(c.desc))} <span class="dim">— ${esc(c.source||'')}${c.cy ? ', '+c.cy : ''}</span></li>`).join('')}</ul>
      ${t.clues.length > 5 ? `<p class="small-note">Y ${t.clues.length-5} pistas más.</p>` : ''}
      <div class="btn-row">${btn('Investigar este hilo','focus-thread',{k:t.key})}${canConnectDots(t.key) ? btn('Atar cabos','connect-dots',{k:t.key},{disabled:!canSpendFreeTime(1), title:'Poner todas las pistas sobre la mesa (1 tiempo libre)'}) : ''}${unv ? `<span class="small-note">${unv} sin verificar</span>` : ''}</div>
    </section>`);
  });
  return out.join('');
}
function clueBadge(c){
  if(c.resolved === 'confirmed' || c.verified === 'real' || c.resolved === 'real') return `<span class="clue-b ok" title="Confirmada">✔</span>`;
  if(c.resolved === 'false' || c.verified === 'false') return `<span class="clue-b bad" title="Resultó falsa">✘</span>`;
  return `<span class="clue-b" title="Sin verificar">?</span>`;
}
onAct('connect-dots', (d)=>connectDots(d.k));
onAct('focus-thread', (d)=>{ UI.researchFocus = d.k; UI.sub.mystic = 'investigar'; saveUiPrefs(); renderNow(); window.scrollTo(0,0); }, {free:true});

/* ------------------------------ investigar ------------------------------ */
function mysticResearch(){
  const out = [];
  const threads = pathwayThreads();
  const own = STATE.pathway.chosenPathway;
  const opts = [`<option value="">Lo que aparezca</option>`].concat(
    (own ? [`<option value="${own}" ${UI.researchFocus===own?'selected':''}>Tu propia vía (${esc(PATHWAYS[own].name)})</option>`] : []),
    threads.filter(t=>t.key!==own).map(t=>`<option value="${t.key}" ${UI.researchFocus===t.key?'selected':''}>${esc(threadTitle(t))}</option>`));
  out.push(`<div class="field-row"><label for="r-focus">Seguir un hilo</label><select id="r-focus" data-change="research-focus">${opts.join('')}</select></div>`);
  const left = actionsLeft('research');
  out.push(`<p class="small-note">Podés investigar ${left > 0 ? `${left} vez${left===1?'':'es'} más` : 'nada más'} esta temporada.</p>`);
  out.push(`<div class="action-grid">${RESEARCH_ORDER.map(id=>{
    const m = RESEARCH_METHODS[id]; const av = researchAvailable(m);
    const cost = Math.round(m.cost*priceIndex());
    const off = !av.ok || left <= 0 || !canSpendFreeTime(m.time||1);
    return actionButton({label:m.name, small:`${m.desc}${cost ? ` · ${fmtMoney(cost)}` : ''} · Riesgo: ${m.risk}`, time:m.time||1, disabled:off, why: !av.ok ? av.why : left <= 0 ? 'Ya investigaste bastante esta temporada.' : 'Sin tiempo libre.'}, 'research', {id});
  }).join('')}</div>`);
  const leads = activeLeads();
  out.push(sec('Rumores y pistas abiertas', leads.length ? String(leads.length) : ''));
  if(!leads.length) out.push(emptyState('Ningún rumor por ahora. Los rumores llegan investigando, en la taberna, en el diario... o solos.'));
  leads.forEach(l=>{
    const months = l.expires - STATE.time.totalMonths;
    out.push(`<section class="card lead"><p class="lead-text">“${esc(l.text)}”</p>
      <p class="small-note">${l.progress ? `Avanzaste ${l.progress} de ${l.steps} pasos.` : `Seguirlo lleva ${l.steps} paso${l.steps===1?'':'s'}.`} ${months <= 4 ? '<span class="warn">Se está enfriando.</span>' : ''}${l.price ? ` Van a pedirte plata.` : ''}</p>
      <div class="btn-row">${btn('Seguir la pista','lead-follow',{id:l.id},{disabled:!canSpendFreeTime(1)})}${btn('Dejarla','lead-ignore',{id:l.id},{cls:'btn-ghost'})}</div></section>`);
  });
  return out.join('');
}
onAct('research-focus', (d, el)=>{ UI.researchFocus = el.value || null; }, {free:true});
onAct('research', (d)=>doResearch(d.id, undefined, UI.researchFocus || undefined));
onAct('lead-follow', (d)=>followLead(d.id));
onAct('lead-ignore', (d)=>ignoreLead(d.id));

/* ------------------------------ la primera poción ------------------------------ */
function mysticFirstPotion(){
  const out = [];
  const pots = potionItems(undefined, 9);
  if(pots.length){
    out.push(sec('Lo que tenés'));
    pots.forEach(pt=>out.push(`<section class="card"><h3 class="sub-h">${esc(pt.name)}</h3><p class="card-text">${esc(potionQualityLabel(pt))}. ${esc(pt.provenance||'')}</p>
      ${STATE.character.edad < 16 ? `<p class="small-note">Sos muy chico. Tu cuerpo no lo resistiría.</p>` : btn('Beberla','drink',{id:pt.uid},{cls:'btn-danger'})}</section>`));
  }
  const cands = identifiedPathways();
  if(cands.length){
    out.push(sec('Prepararla'));
    cands.forEach(k=>{
      const reqs = brewRequirements(k, 9);
      out.push(`<section class="card"><h3 class="sub-h">${esc(formulaName(k, 9))} <span class="dim">· ${esc(PATHWAYS[k].name)}</span></h3>${reqList(reqs)}${btn('Preparar','brew',{p:k, s:9},{disabled:!reqs.every(r=>r.ok)})}</section>`);
    });
  } else out.push(emptyState('Todavía no sabés lo suficiente de ninguna vía como para pensar en una poción.'));
  return out.join('');
}
onAct('drink', (d)=>confirmModal('Beberla es irreversible. Si la fórmula era mala, o la preparaste mal, puede matarte. Si sale bien, ya no vas a ser la misma persona.', ()=>startDrinkPotion(d.id), {yes:'Beberla', danger:true, title:'La poción'}));

/* ------------------------------ conocimiento ------------------------------ */
function mysticLore(){
  const out = [];
  const cats = [['fact','Hechos'],['secret','Secretos'],['forbidden','Saber prohibido'],['entity','Entidades']];
  let any = false;
  cats.forEach(([k,label])=>{
    const ids = STATE.lore[k] || [];
    if(!ids.length) return; any = true;
    out.push(sec(label, String(ids.length)));
    out.push(`<div class="lore-list">${ids.map(id=>{ const L = LORE[id]; if(!L) return ''; return `<details class="lore ${k}"><summary>${esc(L.title)}${L.dangerous ? ' <span class="tag tag-crimson">peligroso</span>' : ''}</summary><p>${esc(L.text)}</p></details>`; }).join('')}</div>`);
  });
  const loose = STATE.character.secrets || [];
  if(loose.length){ any = true; out.push(sec('Otros secretos')); out.push(`<ul class="plain">${loose.map(s=>`<li>${esc(s.text)}</li>`).join('')}</ul>`); }
  if(!any) out.push(emptyState('No sabés nada que la mayoría no sepa. Todavía.'));
  return out.join('');
}

/* ------------------------------ anclas ------------------------------ */
function mysticAnchors(){
  const a = recomputeAnchors();
  const people = a.people.map(id=>npcById(id)).filter(Boolean);
  const strength = a.anchorStrength >= 60 ? 'Firmes. Te sostienen.' : a.anchorStrength >= 35 ? 'Te sostienen, a veces con esfuerzo.' : a.anchorStrength >= 15 ? 'Débiles. Cada vez menos gente te conoce de verdad.' : 'Casi no queda nadie.';
  return `<section class="card"><p class="card-text">Lo que te mantiene humano: las personas que te conocen de verdad, y la gente que cree en vos.</p>
    <dl class="kv"><dt>Anclas</dt><dd>${tierMark('estimated')} ${esc(strength)}</dd><dt>Estabilidad</dt><dd>${tierMark(STATE.settings.showNumbers?'objective':'estimated')} ${STATE.settings.showNumbers ? a.identityStability : esc(a.identityStability >= 60 ? 'Sabés quién sos.' : a.identityStability >= 35 ? 'A veces dudás de quién sos.' : 'Te cuesta reconocerte.')}</dd>
    <dt>Quienes creen en vos</dt><dd>${a.followers ? a.followers + ' personas, más o menos' : 'Nadie en particular'}</dd></dl></section>
    ${sec('Tus anclas')}${people.length ? `<div class="npc-list">${people.map(npcRow).join('')}</div>` : emptyState('No hay nadie que te conozca así.')}
    ${(a.lost||[]).length ? sec('Anclas perdidas') + `<ul class="plain">${a.lost.map(l=>`<li>${esc(l.name)} <span class="dim">(${l.cy})</span></li>`).join('')}</ul>` : ''}`;
}

/* ------------------------------ Tarot ------------------------------ */
function mysticTarot(){
  const t = STATE.tarot;
  const stageTxt = t.stage >= 7 ? 'La mesa confía en vos.' : t.stage >= 6 ? `Te sentás a la mesa de bronce como "${t.card}".` : t.stage >= 4 ? 'A veces sentís una mirada que viene de muy arriba.' : t.stage >= 3 ? 'Sabés que existe algo que se reúne sobre una niebla gris. No sabés cómo llegar.' : 'Oíste cosas sueltas. Una niebla gris. Cartas fuera de lugar.';
  const out = [`<section class="card"><p class="card-text">${esc(stageTxt)}</p>
    ${(t.heard||[]).length ? `<p class="small-note">Lo que oíste: ${(t.heard||[]).map(esc).join(' · ')}</p>` : ''}
    ${t.stage >= 6 ? `<p class="small-note">Reuniones: ${t.meetings||0}. Confianza de la mesa: ${esc(trustWord(STATE.factions.tarotClub.trust||0))}.</p>` : ''}</section>`];
  if(t.honorific){
    const can = tarotCanPray();
    out.push(sec('El nombre honorífico'));
    out.push(`<section class="card"><p class="card-text">“El Loco que no pertenece a esta era; el misterioso gobernante sobre la niebla gris; el Rey de Amarillo y Negro que ejerce la buena suerte.”</p>${btn('Recitarlo','tarot-pray',{},{disabled:!can || !canSpendFreeTime(1)})}${!can ? '<p class="small-note">Rezaste hace poco. No abuses.</p>' : ''}</section>`);
  }
  return out.join('');
}
function trustWord(v){ return v >= 60 ? 'alta' : v >= 30 ? 'buena' : v >= 10 ? 'escasa' : 'casi nula'; }
onAct('tarot-pray', ()=>tarotPray());

/* ------------------------------ el trono ------------------------------ */
function mysticThrone(){
  const d = STATE.divinity;
  if(d.renounced) return `<section class="card"><p class="card-text">Renunciaste al trono. El vértigo se fue. A veces, de noche, extrañás el miedo.</p></section>`;
  if(d.ascended) return `<section class="card"><p class="card-text">Ya estás ahí.</p></section>`;
  return `<section class="card"><p class="card-text">El camino a la Sequence 0 no es una poción: es una cadena de cosas que muy pocos sobreviven.</p>${reqList(divinityRequirements())}</section>`;
}

/* ------------------------------ mercado negro ------------------------------ */
function mysticMarket(){
  const offers = blackMarketOffers();
  return `<p class="intro-text">Detrás de una casa de empeño, una escalera baja a un depósito. Ahí se vende lo imposible. Y se habla de quién compra.</p>
    <div class="action-grid">${offers.map((o,i)=>actionButton({label:o.label, small:`${fmtMoney(o.price)}${o.sold ? ' · vendido' : ''}`, time:1, disabled:o.sold || STATE.character.cash < o.price || !canSpendFreeTime(1), why: o.sold ? 'Ya lo compraste.' : STATE.character.cash < o.price ? 'No te alcanza.' : 'Sin tiempo libre.'}, 'bm-buy', {idx:i})).join('')}</div>
    <p class="small-note">Lo que se compra acá puede ser falso. Nadie te va a devolver la plata.</p>`;
}
onAct('bm-buy', (d)=>buyBlackMarket(+d.idx));
