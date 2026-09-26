'use strict';
/* =========================================================================
   ui/end.js — la biografía (§35, §36, §37, §52).
   Sin puntaje. Una vida contada por etapas, con lo que dejó, lo que costó y
   —al final— lo que el personaje nunca supo.
   ========================================================================= */
function renderEnd(){
  const el = byId('screen-end'); if(!el) return;
  const ed = STATE.endingData || {};
  const c = STATE.character;
  const gen = lineageData().lives.length;
  const heirs = lineageHeirs();
  const html = `<article class="end-wrap" aria-labelledby="end-title">
    <div class="end-cat">${esc(ENDING_CAT_LABEL[ed.category] || 'Final')}</div>
    <h1 class="end-title" id="end-title" tabindex="-1">${esc(ed.title || '')}</h1>
    <div class="end-name">${esc(c.nombre)} ${esc(c.apellido)} · ${ed.year ? `${c.birthYear || STATE.time.startYear || 1330} — ${ed.year}` : ''}${gen ? ` · ${esc(generationLabel(gen + 1))}` : ''}</div>
    ${ed.epitaph ? `<p class="epitaph">“${esc(ed.epitaph)}”</p>` : ''}
    <p class="end-text">${esc(ed.text || '')}</p>
    ${(ed.facts||[]).length ? `<dl class="end-facts">${ed.facts.map(f=>`<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>` : ''}
    <div class="rule"></div>
    <section class="bio"><h2 class="sec-title">Biografía</h2>${(ed.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</section>
    ${(ed.stages||[]).length ? `<section class="bio-stages"><h2 class="sec-title">Una vida, por etapas</h2>${ed.stages.map(st=>`<div class="stage"><h3>${esc(st.label)}</h3><ul>${st.milestones.map(m=>`<li><span class="dim">${ageText(m.age)}</span> ${esc(m.text)}</li>`).join('')}${st.moments.filter(mm=>!st.milestones.some(m=>m.text===mm.text)).map(m=>`<li><span class="dim">${ageText(m.age)}</span> ${esc(m.text)}${m.detail ? `<br><span class="small-note">${esc(m.detail)}</span>` : ''}</li>`).join('')}</ul></div>`).join('')}</section>` : ''}
    ${(ed.neverKnew||[]).length ? `<section class="never"><h2 class="sec-title">Lo que nunca supo</h2><ul>${ed.neverKnew.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
    ${lineageEndSection(heirs)}
    <div class="end-actions">${btn('Leer el diario completo','end-journal')}${btn('Exportar esta vida','export-save')}${btn(heirs.length ? 'Empezar otra historia, desde cero' : 'Comenzar una nueva vida','end-new',{},{cls: heirs.length ? '' : 'btn-primary'})}</div>
  </article>`;
  if(setHTML(el, html)){ const h = byId('end-title'); if(h) h.focus({preventScroll:true}); window.scrollTo(0,0); }
}
onAct('end-new', ()=>{ deleteSave(); newLifeFlow(); }, {free:true});

/* ------------------------------ el linaje ------------------------------ */
function generationLabel(n){ return n <= 1 ? '' : `${n}ª generación`; }
function lineageEndSection(heirs){
  const lives = lineageData().lives;
  const out = [];
  if(heirs.length){
    out.push(`<section class="lineage"><h2 class="sec-title">Tu linaje sigue</h2>
      <p class="small-note">La historia puede seguir con alguien de tu sangre. El mundo sigue igual: el mismo año, la misma ciudad, las mismas organizaciones. Lo que sabías, en cambio, hay que descubrirlo de nuevo.</p>
      <div class="heir-list">${heirs.map(heirCard).join('')}</div></section>`);
  }
  if(lives.length) out.push(`<section class="lineage"><h2 class="sec-title">Antes que ${esc(STATE.character.nombre)}</h2>${ancestorsList(lives)}</section>`);
  return out.join('');
}
function heirCard(n){
  const plan = inheritancePlan(n);
  const bits = [plan.money > 0 ? fmtMoney(plan.money) : 'casi nada de plata'];
  if(plan.house) bits.push('la casa de la familia');
  if(plan.props) bits.push(plan.props === 1 ? 'una propiedad' : `${plan.props} propiedades`);
  if(plan.items) bits.push(plan.items === 1 ? 'un objeto de tu baúl' : `${plan.items} objetos de tu baúl`);
  bits.push('tu diario');
  if(plan.characteristic) bits.push('tu Característica Beyonder');
  const knows = n.knows && n.knows.beyonder ? 'Sabe lo que eras.' : n.knows && n.knows.partial ? 'Sospecha lo que eras.' : '';
  return `<div class="heir-card">
    <div class="heir-name">${esc(n.name)} <span class="dim">· ${esc(n.role||'')} · ${npcAge(n)} años</span></div>
    <div class="small-note">${n.profession && n.profession !== '—' ? esc(n.profession) + ' · ' : ''}${esc(cap(relWord(n)))}${n.flags.married ? ' · casad' + npcGx(n,'o','a','e') : ''}${n.flags.kids ? ` · ${n.flags.kids} hij${n.flags.kids===1?'o':'os'}` : ''}</div>
    <p class="heir-gets">Hereda ${esc(bits.join(', '))}.${knows ? ` ${esc(knows)}` : ''}</p>
    ${btn('Seguir como ' + firstNameOf(n), 'lineage-continue', {id:n.id}, {cls:'btn-primary'})}
  </div>`;
}
function ancestorsList(lives){
  return `<ol class="ancestors">${lives.slice().reverse().map((l, i)=>`<li>
    <div><b>${esc(l.nombre)} ${esc(l.apellido)}</b> <span class="dim">(${l.born}–${l.died}${l.cause === 'retiro' ? ', se retiró' : ''})</span></div>
    <div class="small-note">${esc(l.title || '')}${l.pathway && PATHWAYS[l.pathway] ? ` · Sequence ${l.seq} de la vía ${esc(PATHWAYS[l.pathway].name)}` : ''}${l.epitaph ? ` · “${esc(l.epitaph)}”` : ''}</div>
    ${(l.paragraphs||[]).length ? btn('Leer su historia', 'lineage-bio', {i: lives.length - 1 - i}) : ''}
  </li>`).join('')}</ol>`;
}
onAct('lineage-continue', (d)=>{
  if(!succeedAs(d.id)) return;
  UI.tab = 'vida'; UI.npcSel = null;
  showScreen('game'); renderAll(); window.scrollTo(0,0);
}, {free:true});
onAct('lineage-bio', (d)=>{
  const l = lineageData().lives[+d.i]; if(!l) return;
  openModal({title:`${l.nombre} ${l.apellido} (${l.born}–${l.died})`, html:`${l.epitaph ? `<p class="epitaph">“${esc(l.epitaph)}”</p>` : ''}${l.text ? `<p class="end-text">${esc(l.text)}</p>` : ''}<div class="bio">${(l.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</div>`});
}, {free:true});
onAct('end-journal', ()=>{
  const list = (STATE.journal||[]).slice().reverse();
  openModal({title:'Diario', html:`<ol class="journal-list">${list.map(e=>`<li class="j-entry"><div class="evt-date">${esc(fmtDate(e))}</div><div class="j-title">${esc(e.title)}</div><div class="j-text">${esc(e.text)}</div></li>`).join('')}</ol>`});
}, {free:true});
