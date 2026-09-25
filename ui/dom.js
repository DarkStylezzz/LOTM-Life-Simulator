'use strict';
/* =========================================================================
   ui/dom.js — núcleo de la interfaz (§38, §49, §50).
   - Un solo listener delegado por tipo de evento: los botones declaran
     data-act="nombre" y los parámetros en data-*. Nada de onclick sueltos
     ni listeners duplicados en cada render (§49: sin fugas).
   - setHTML(): sólo toca el DOM si el contenido cambió (sin parpadeo, sin
     perder el scroll ni el foco cuando no hace falta).
   - Render en un solo cuadro (requestAnimationFrame): los sistemas llaman a
     renderAll() muchas veces por acción; se dibuja una.
   - Toasts accesibles, modales con foco atrapado y Esc, y la cola de
     "sellos" (revelaciones importantes) que se guarda con la partida.
   ========================================================================= */
const UI = {
  tab: 'vida', sub: {}, open: {}, scroll: {}, modal: null, lastFocusKey: null, renderQueued: false,
  invCat: 'all', invSort: 'recent', invSel: null, journalSec: 'recientes', journalQuery: '', npcSel: null,
  lastEventKey: null, confirmCb: null
};
const UI_PREFS_KEY = 'lotm_ui_prefs';
function loadUiPrefs(){
  try{ const p = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{}'); if(p && typeof p === 'object'){ ['tab','invSort','journalSec'].forEach(k=>{ if(p[k]) UI[k] = p[k]; }); if(p.sub) UI.sub = p.sub; if(p.open) UI.open = p.open; } }catch(e){}
}
function saveUiPrefs(){
  try{ localStorage.setItem(UI_PREFS_KEY, JSON.stringify({tab:UI.tab, sub:UI.sub, open:UI.open, invSort:UI.invSort, journalSec:UI.journalSec})); }catch(e){}
}
function $(sel, root){ return (root||document).querySelector(sel); }
function $$(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
function byId(id){ return document.getElementById(id); }

// Reemplaza el contenido sólo si cambió.
function setHTML(el, html){
  if(!el) return false;
  if(el.__html === html) return false;
  el.__html = html;
  el.innerHTML = html;
  return true;
}
// Atributos seguros para plantillas.
function attr(v){ return esc(String(v ?? '')); }
function cls(...xs){ return xs.filter(Boolean).join(' '); }

/* ------------------------------ acciones delegadas ------------------------------ */
const UI_ACTIONS = {};
const UI_ACTION_OPTS = {};
// opts.free: se puede usar aunque haya una escena abierta (navegar, leer).
// opts.scene: es una respuesta a la escena abierta.
function onAct(name, fn, opts){ UI_ACTIONS[name] = fn; if(opts) UI_ACTION_OPTS[name] = opts; }
function dispatchAct(el, ev){
  const name = el.dataset.act;
  const fn = UI_ACTIONS[name];
  if(!fn) return;
  if(el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  const o = UI_ACTION_OPTS[name] || {};
  if(STATE && STATE.started && !STATE.gameOver && timeBlocked() && !o.free && !o.scene){
    toast('Primero resolvé lo que está pasando.', 'neg');
    if(UI.tab !== 'vida') goTab('vida');
    return;
  }
  // Recordamos "qué" tenía el foco para devolverlo después del render.
  UI.lastFocusKey = focusKeyOf(el);
  try{ fn(el.dataset, el, ev); }
  catch(e){ console.error('Acción fallida:', name, e); toast('Algo salió mal. La partida sigue guardada.', 'neg'); }
}
function focusKeyOf(el){ return el && el.dataset && el.dataset.act ? el.dataset.act + '|' + (el.dataset.id||'') + '|' + (el.dataset.idx||'') + '|' + (el.dataset.k||'') : null; }
function initDelegation(){
  if(window.__lotmDelegated) return;
  window.__lotmDelegated = true;
  document.addEventListener('click', (ev)=>{
    const el = ev.target.closest && ev.target.closest('[data-act]');
    if(!el || ['SELECT','INPUT','TEXTAREA'].includes(el.tagName)) return;
    ev.preventDefault();
    dispatchAct(el, ev);
  });
  document.addEventListener('change', (ev)=>{
    const el = ev.target;
    if(el && el.dataset && el.dataset.change){ const fn = UI_ACTIONS[el.dataset.change]; if(fn){ try{ fn(el.dataset, el, ev); }catch(e){ console.error(e); } } }
  });
  document.addEventListener('input', (ev)=>{
    const el = ev.target;
    if(el && el.dataset && el.dataset.input){ const fn = UI_ACTIONS[el.dataset.input]; if(fn){ try{ fn(el.dataset, el, ev); }catch(e){ console.error(e); } } }
  });
  document.addEventListener('keydown', onGlobalKey);
}

/* ------------------------------ teclado ------------------------------ */
function onGlobalKey(ev){
  if(UI.modal){
    if(ev.key === 'Escape'){ ev.preventDefault(); closeModal(); return; }
    if(ev.key === 'Tab') trapFocus(ev);
    return;
  }
  if(sealVisible()){ if(ev.key === 'Escape' || ev.key === 'Enter'){ ev.preventDefault(); dismissSeal(); } return; }
  const t = ev.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if(ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if(!STATE || !STATE.started || STATE.gameOver) return;
  // Elecciones con números cuando hay una escena abierta.
  if(timeBlocked() && /^[1-9]$/.test(ev.key)){
    const btns = $$('#content .choice-btn[data-act]:not([disabled])');
    const b = btns[+ev.key - 1];
    if(b){ ev.preventDefault(); b.click(); }
    return;
  }
  const tabs = visibleTabs();
  if(/^[1-9]$/.test(ev.key) && tabs[+ev.key-1]){ ev.preventDefault(); goTab(tabs[+ev.key-1].id); return; }
  if(ev.key === 'm' || ev.key === 'M'){ ev.preventDefault(); UI_ACTIONS['advance']({mode:'month'}); }
  else if(ev.key === 't' || ev.key === 'T'){ ev.preventDefault(); UI_ACTIONS['advance']({mode:'season'}); }
  else if(ev.key === 'i' || ev.key === 'I'){ ev.preventDefault(); UI_ACTIONS['advance']({mode:'important'}); }
  else if(ev.key === '?'){ ev.preventDefault(); showHelp(); }
}

/* ------------------------------ toasts ------------------------------ */
function toast(msg, type){
  const box = byId('toast-container'); if(!box) return;
  const list = Array.isArray(msg) ? msg.filter(Boolean) : [{msg, type}];
  if(!list.length) return;
  const el = document.createElement('div');
  const neg = list.some(x=>x.type==='neg'), pos = list.every(x=>x.type==='pos');
  el.className = 'toast' + (neg ? ' neg' : pos ? ' pos' : '');
  el.innerHTML = list.map(x=>`<div class="toast-line ${x.type||''}">${esc(typeof x === 'string' ? x : x.msg)}</div>`).join('');
  box.appendChild(el);
  while(box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 300); }, 3400);
}

/* ------------------------------ modales ------------------------------ */
function openModal(o){
  const root = byId('overlay-root'); if(!root) return;
  UI.modal = {prevFocus: document.activeElement, onClose:o.onClose||null};
  const actions = (o.actions||[{label:'Cerrar', act:'modal-close', primary:true}]).map(a=>`<button class="btn ${a.primary?'btn-primary':''} ${a.danger?'btn-danger':''}" data-act="${attr(a.act)}" ${a.data||''}>${esc(a.label)}</button>`).join('');
  root.innerHTML = `<div class="modal-overlay" data-act="modal-backdrop"><div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <h3 id="modal-title">${esc(o.title||'')}</h3><div class="modal-body">${o.html||''}</div><div class="modal-actions">${actions}</div></div></div>`;
  const box = $('.modal-box', root);
  const first = $('button, [href], input, select, textarea', box);
  (first || box).focus();
}
function closeModal(){
  const root = byId('overlay-root'); if(!root || !UI.modal) return;
  const m = UI.modal; UI.modal = null;
  root.innerHTML = '';
  if(m.onClose) m.onClose();
  if(m.prevFocus && m.prevFocus.focus && document.body.contains(m.prevFocus)) m.prevFocus.focus();
  scheduleRender();
}
function trapFocus(ev){
  const box = $('.modal-box'); if(!box) return;
  const f = $$('button:not([disabled]), [href], input, select, textarea, [tabindex="0"]', box);
  if(!f.length) return;
  const first = f[0], last = f[f.length-1];
  if(ev.shiftKey && document.activeElement === first){ ev.preventDefault(); last.focus(); }
  else if(!ev.shiftKey && document.activeElement === last){ ev.preventDefault(); first.focus(); }
}
function confirmModal(text, onYes, opts){
  opts = opts || {};
  UI.confirmCb = onYes;
  openModal({title: opts.title || '¿Seguro?', html:`<p class="modal-text">${esc(text)}</p>`,
    actions:[{label:opts.no||'Cancelar', act:'modal-close'}, {label:opts.yes||'Sí', act:'modal-confirm', primary:!opts.danger, danger:!!opts.danger}]});
}
onAct('modal-close', ()=>closeModal(), {free:true});
onAct('modal-backdrop', (d, el, ev)=>{ if(ev.target === el) closeModal(); }, {free:true});
onAct('modal-confirm', ()=>{ const cb = UI.confirmCb; UI.confirmCb = null; closeModal(); if(cb) cb(); }, {free:true});

/* ------------------------------ sellos (revelaciones) ------------------------------ */
// Los sistemas llaman queueSeal() en momentos que no se pueden perder: se
// guardan en la partida hasta que el jugador los ve.
function queueSeal(s){
  if(!STATE) return;
  STATE.pendingSeals = STATE.pendingSeals || [];
  if(STATE.pendingSeals.length < 6) STATE.pendingSeals.push(s);
}
function sealVisible(){ return !!$('.seal-overlay'); }
function sealContent(s){
  const pw = s.key && PATHWAYS[s.key];
  switch(s.kind){
    case 'suspicion': return {ring:'?', title:'Algo no encaja', body:'Hay cosas que no tienen explicación. No una: varias. Y empiezan a parecerse entre sí.', name:''};
    case 'identified': return {ring:pw ? pw.symbol||'✦' : '✦', title:'Una vía tiene nombre', body: pw ? `Las piezas encajan. ${pw.theme}.` : '', name: pw ? pw.name : ''};
    case 'beyonder': return {ring:'✦', title:'Beyonder', body:'Ya no sos sólo una persona. El mundo oculto sabe que existís, y vos sabés que existe.', name: pw ? `${pw.name} — Sequence 9` : ''};
    case 'advance': { const sd = pw ? seqData(s.key, s.seq) : null; return {ring:String(s.seq), title:'Advancement', body: sd ? sd.ability : '', name: sd ? `Sequence ${s.seq} — ${sd.name}` : ''}; }
    case 'tarot': return {ring:'🃏', title:'Tarot Club', body:'Una mesa de bronce sobre la niebla gris. Un lugar. Un nombre que no es el tuyo.', name: s.card || ''};
    case 'anchors': return {ring:'⚓', title:'Anclas', body: s.names && s.names.length ? `Lo que te mantiene humano tiene nombres: ${s.names.slice(0,3).join(', ')}.` : 'Lo que te mantiene humano son las personas que te conocen. Casi no queda nadie.', name:''};
    case 'divine': return {ring:'☼', title:'Sequence 0', body:'El trono te acepta. El mundo ya no se ve igual desde acá. Vos tampoco.', name: pw ? (seqData(s.key,0)||{}).name || '' : ''};
    default: return {ring:'✦', title:s.title||'', body:s.text||'', name:''};
  }
}
function showNextSeal(){
  if(!STATE || !STATE.pendingSeals || !STATE.pendingSeals.length || sealVisible() || UI.modal) return;
  const s = STATE.pendingSeals[0];
  const c = sealContent(s);
  const root = byId('overlay-root');
  root.innerHTML = `<div class="seal-overlay seal-${attr(s.kind)}" role="alertdialog" aria-modal="true" aria-labelledby="seal-title" aria-describedby="seal-body">
    <div class="seal-ring" aria-hidden="true"><span class="seal-q">${esc(c.ring)}</span></div>
    <div class="seal-title" id="seal-title">${esc(c.title)}</div>
    ${c.name ? `<div class="seal-pathway-name">${esc(c.name)}</div>` : ''}
    <div class="seal-body" id="seal-body">${esc(c.body)}</div>
    <button class="btn btn-primary" data-act="seal-dismiss">Continuar</button></div>`;
  const b = $('.seal-overlay button', root); if(b) b.focus();
}
function dismissSeal(){
  if(STATE && STATE.pendingSeals) STATE.pendingSeals.shift();
  const root = byId('overlay-root'); if(root) root.innerHTML = '';
  saveGame(true);
  scheduleRender();
}
onAct('seal-dismiss', ()=>dismissSeal(), {free:true});

/* ------------------------------ pantallas ------------------------------ */
function showScreen(name){
  ['intro','game','end'].forEach(s=>{ const el = byId('screen-'+s); if(el) el.classList.toggle('hidden', s !== name); });
  document.body.dataset.screen = name;
  if(name === 'game') scheduleRender();
}
function scheduleRender(){
  if(UI.renderQueued) return;
  UI.renderQueued = true;
  const run = ()=>{ UI.renderQueued = false; try{ renderNow(); }catch(e){ console.error('Error de render', e); } };
  if(typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else run();
}
// Punto de entrada que llaman todos los sistemas.
function renderAll(){ scheduleRender(); }
