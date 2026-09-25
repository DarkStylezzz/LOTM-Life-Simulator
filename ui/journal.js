'use strict';
/* =========================================================================
   ui/journal.js — el Diario como biografía (§35).
   Secciones: recientes, momentos importantes, relaciones, misterios, tu
   vía, muertes, organizaciones, el mundo, logros, línea temporal, memoria y
   verdades descubiertas. Con búsqueda por texto.
   ========================================================================= */
const JOURNAL_SECTIONS = [
  {id:'recientes', label:'Recientes', f:()=>true},
  {id:'importantes', label:'Momentos importantes', f:e=>(e.imp||0) >= 2},
  {id:'relaciones', label:'Relaciones', f:e=>['relation','family'].includes(e.cat)},
  {id:'misterios', label:'Misterios', f:e=>e.cat==='mystery'},
  {id:'camino', label:'Tu vía', f:e=>e.cat==='pathway'},
  {id:'muertes', label:'Muertes', f:e=>e.cat==='death'},
  {id:'organizaciones', label:'Organizaciones', f:e=>e.cat==='faction'},
  {id:'mundo', label:'El mundo', f:e=>['world','combat'].includes(e.cat)},
  {id:'logros', label:'Logros', special:true},
  {id:'linea', label:'Línea temporal', special:true},
  {id:'memoria', label:'Memoria', special:true},
  {id:'verdades', label:'Verdades', special:true}
];
function renderJournal(){
  const cur = JOURNAL_SECTIONS.find(s=>s.id===UI.journalSec) || JOURNAL_SECTIONS[0];
  const out = [];
  out.push(`<div class="journal-head"><div class="chips-row" role="tablist" aria-label="Secciones del diario">${JOURNAL_SECTIONS.map(s=>`<button role="tab" class="chip-btn ${s.id===cur.id?'active':''}" aria-selected="${s.id===cur.id}" data-act="j-sec" data-k="${s.id}">${esc(s.label)}</button>`).join('')}</div>
    ${cur.special ? '' : `<label class="search"><span class="sr-only">Buscar en el diario</span><input type="search" placeholder="Buscar…" value="${attr(UI.journalQuery)}" data-input="j-search"></label>`}</div>`);
  if(cur.id === 'linea') out.push(journalTimeline());
  else if(cur.id === 'logros') out.push(journalAchievements());
  else if(cur.id === 'memoria') out.push(journalMemory());
  else if(cur.id === 'verdades') out.push(journalTruths());
  else out.push(`<div id="journal-entries">${journalEntries(cur)}</div>`);
  return out.join('');
}
function journalEntries(sec){
  const q = (UI.journalQuery||'').trim().toLowerCase();
  const list = (STATE.journal||[]).filter(e=>sec.f(e) && (!q || (e.title+' '+e.text).toLowerCase().includes(q)));
  const limit = UI.journalLimit || 60;
  if(!list.length) return emptyState(q ? 'Nada coincide con esa búsqueda.' : 'Nada todavía.');
  return `<ol class="journal-list">${list.slice(0, limit).map(e=>`<li class="j-entry cat-${e.cat||'life'} imp-${e.imp||0}"><div class="evt-date">${esc(fmtDate(e))}</div><div class="j-title">${esc(e.title)}</div><div class="j-text">${esc(e.text)}</div></li>`).join('')}</ol>
    ${list.length > limit ? btn(`Mostrar más (${list.length - limit})`, 'j-more', {}, {cls:'btn-ghost'}) : ''}`;
}
onAct('j-sec', (d)=>{ UI.journalSec = d.k; UI.journalLimit = 60; saveUiPrefs(); renderNow(); }, {free:true});
onAct('j-more', ()=>{ UI.journalLimit = (UI.journalLimit||60) + 80; renderNow(); }, {free:true});
onAct('j-search', (d, el)=>{
  UI.journalQuery = el.value;
  // Sólo se redibuja la lista (el campo de búsqueda conserva el foco y el cursor).
  const box = byId('journal-entries'); const sec = JOURNAL_SECTIONS.find(s=>s.id===UI.journalSec) || JOURNAL_SECTIONS[0];
  if(box) box.innerHTML = journalEntries(sec);
}, {free:true});
function journalTimeline(){
  const ms = STATE.milestones || [];
  if(!ms.length) return emptyState('Todavía no hay hitos.');
  const byAge = [];
  ms.forEach(m=>{ const last = byAge[byAge.length-1]; if(last && last.edad === m.edad) last.items.push(m); else byAge.push({edad:m.edad, items:[m]}); });
  return `<ol class="timeline">${byAge.map(g=>`<li class="tl-item"><div class="tl-age">${g.edad === 0 ? 'Nacimiento' : ageText(g.edad)}</div>${g.items.map(m=>`<div class="tl-ev k-${m.kind}"><span class="tl-ic" aria-hidden="true">${MILESTONE_ICON[m.kind]||'·'}</span>${esc(m.text)}${m.cy ? ` <span class="dim">(${m.cy})</span>` : ''}</div>`).join('')}</li>`).join('')}</ol>`;
}
const MILESTONE_ICON = {birth:'✧', mystic:'◈', potion:'⚗', advance:'▲', family:'♥', loss:'✝', end:'☾', achievement:'★', faction:'⚜', world:'☉', pathway:'✦'};
function journalAchievements(){
  const ach = (STATE.milestones||[]).filter(m=>['achievement','advance','potion','faction'].includes(m.kind));
  const mem = memoriesByCat('achievement');
  if(!ach.length && !mem.length) return emptyState('Todavía nada de lo que presumir. Y está bien.');
  return `<ul class="plain">${ach.map(m=>`<li>${MILESTONE_ICON[m.kind]||'★'} ${esc(m.text)} <span class="dim">(${ageText(m.edad)})</span></li>`).join('')}${mem.map(m=>`<li>★ ${esc(m.text)}</li>`).join('')}</ul>`;
}
function journalMemory(){
  const out = [];
  Object.keys(MEMORY_CATS).forEach(k=>{
    const list = memoriesByCat(k);
    if(!list.length) return;
    out.push(sec(MEMORY_CATS[k], String(list.length)));
    out.push(`<ul class="plain">${list.slice(-12).reverse().map(m=>`<li>${esc(m.text)} <span class="dim">(${ageText(m.age ?? Math.max(0,(m.year||1)-1))})</span></li>`).join('')}</ul>`);
  });
  return out.length ? out.join('') : emptyState('La memoria se llena viviendo.');
}
function journalTruths(){
  const t = STATE.hiddenTruths.filter(h=>h.revealed);
  const hidden = STATE.hiddenTruths.filter(h=>!h.revealed).length;
  return `<p class="intro-text">Cosas que pasaron de verdad, y que entendiste tarde.</p>
    ${t.length ? `<ul class="plain truths">${t.map(h=>`<li>${esc(h.text)}${h.how ? ` <span class="dim">— ${esc(h.how)}</span>` : ''}</li>`).join('')}</ul>` : emptyState('Todavía no descubriste nada que no supieras.')}
    ${hidden ? `<p class="small-note">${tierMark('unknown')} Hay cosas de tu vida que todavía no sabés.</p>` : ''}`;
}
