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
  const html = `<article class="end-wrap" aria-labelledby="end-title">
    <div class="end-cat">${esc(ENDING_CAT_LABEL[ed.category] || 'Final')}</div>
    <h1 class="end-title" id="end-title" tabindex="-1">${esc(ed.title || '')}</h1>
    <div class="end-name">${esc(c.nombre)} ${esc(c.apellido)} · ${ed.year ? `${(STATE.time.startYear||1330)} — ${ed.year}` : ''}</div>
    ${ed.epitaph ? `<p class="epitaph">“${esc(ed.epitaph)}”</p>` : ''}
    <p class="end-text">${esc(ed.text || '')}</p>
    ${(ed.facts||[]).length ? `<dl class="end-facts">${ed.facts.map(f=>`<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>` : ''}
    <div class="rule"></div>
    <section class="bio"><h2 class="sec-title">Biografía</h2>${(ed.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</section>
    ${(ed.stages||[]).length ? `<section class="bio-stages"><h2 class="sec-title">Una vida, por etapas</h2>${ed.stages.map(st=>`<div class="stage"><h3>${esc(st.label)}</h3><ul>${st.milestones.map(m=>`<li><span class="dim">${ageText(m.age)}</span> ${esc(m.text)}</li>`).join('')}${st.moments.filter(mm=>!st.milestones.some(m=>m.text===mm.text)).map(m=>`<li><span class="dim">${ageText(m.age)}</span> ${esc(m.text)}${m.detail ? `<br><span class="small-note">${esc(m.detail)}</span>` : ''}</li>`).join('')}</ul></div>`).join('')}</section>` : ''}
    ${(ed.neverKnew||[]).length ? `<section class="never"><h2 class="sec-title">Lo que nunca supo</h2><ul>${ed.neverKnew.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
    <div class="end-actions">${btn('Leer el diario completo','end-journal')}${btn('Exportar esta vida','export-save')}${btn('Comenzar una nueva vida','end-new',{},{cls:'btn-primary'})}</div>
  </article>`;
  if(setHTML(el, html)){ const h = byId('end-title'); if(h) h.focus({preventScroll:true}); window.scrollTo(0,0); }
}
onAct('end-new', ()=>{ deleteSave(); newLifeFlow(); }, {free:true});
onAct('end-journal', ()=>{
  const list = (STATE.journal||[]).slice().reverse();
  openModal({title:'Diario', html:`<ol class="journal-list">${list.map(e=>`<li class="j-entry"><div class="evt-date">${esc(fmtDate(e))}</div><div class="j-title">${esc(e.title)}</div><div class="j-text">${esc(e.text)}</div></li>`).join('')}</ol>`});
}, {free:true});
