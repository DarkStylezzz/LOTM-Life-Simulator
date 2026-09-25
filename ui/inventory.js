'use strict';
/* =========================================================================
   ui/inventory.js — "Inventario" (§33, §34).
   Categorías separadas, filtros, orden, y la ficha de cada objeto con su
   procedencia, sus usos y sus riesgos (de un artefacto sólo se ve lo que
   descubriste). Las acciones salen del sistema (itemActions): no hay
   botones que no hagan nada.
   ========================================================================= */
function renderInventory(){
  const items = inventoryItems().filter(it=>it.qty > 0);
  const cats = Object.keys(ITEM_CATEGORIES).filter(k=>items.some(it=>it.cat===k));
  if(UI.invCat !== 'all' && !cats.includes(UI.invCat)) UI.invCat = 'all';
  const list = items.filter(it=>UI.invCat === 'all' || it.cat === UI.invCat).sort(INVENTORY_SORTS[UI.invSort] || INVENTORY_SORTS.recent);
  const sel = UI.invSel ? itemByUid(UI.invSel) : null;
  const out = [];
  out.push(`<div class="inv-toolbar"><div class="chips-row" role="group" aria-label="Filtrar por categoría">
      <button class="chip-btn ${UI.invCat==='all'?'active':''}" data-act="inv-cat" data-k="all" aria-pressed="${UI.invCat==='all'}">Todo <span class="dim">${items.length}</span></button>
      ${cats.map(k=>`<button class="chip-btn ${UI.invCat===k?'active':''}" data-act="inv-cat" data-k="${k}" aria-pressed="${UI.invCat===k}">${ITEM_CATEGORIES[k].icon} ${esc(ITEM_CATEGORIES[k].label)} <span class="dim">${items.filter(it=>it.cat===k).length}</span></button>`).join('')}</div>
    <label class="sort"><span class="sr-only">Ordenar</span><select data-change="inv-sort">${[['recent','Más recientes'],['name','Por nombre'],['rarity','Por rareza']].map(([v,l])=>`<option value="${v}" ${UI.invSort===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`);
  if(!items.length) return out.join('') + emptyState('No tenés nada que valga la pena guardar. Todavía.');
  out.push(`<div class="inv-layout"><div class="inv-grid" role="list">${list.map(it=>`<button role="listitem" class="inv-item ${sel && sel.uid===it.uid ? 'active':''} cat-${it.cat}" data-act="inv-sel" data-id="${attr(it.uid)}">
      <span class="it-name">${ITEM_CATEGORIES[it.cat] ? ITEM_CATEGORIES[it.cat].icon : '•'} ${esc(it.name)}${it.qty > 1 ? ` <span class="qty">×${it.qty}</span>` : ''}</span>
      <span class="it-meta">${rarityTag(it.rarity)} ${esc(ITEM_CATEGORIES[it.cat] ? ITEM_CATEGORIES[it.cat].label : '')}${it.sealed ? ' · sellado' : ''}${it.loan ? ' · prestado' : ''}</span></button>`).join('')}</div>
    <div class="inv-detail" aria-live="polite">${sel ? itemDetail(sel) : `<p class="list-empty">Elegí algo para verlo de cerca.</p>`}</div></div>`);
  return out.join('');
}
function itemDetail(it){
  const acts = isDivine() ? [] : itemActions(it);
  const rows = [];
  if(it.provenance) rows.push(['De dónde salió', it.provenance]);
  if(it.cat === 'formula' && it.pathway) rows.push(['Confiable', it.verified ? (it.fidelity==='true' ? 'Sí, verificada.' : it.fidelity==='partial' ? 'Incompleta (verificada).' : 'Falsa (verificada).') : 'No sabés. Sin verificar.']);
  if(it.cat === 'ingredient' && it.purity !== undefined) rows.push(['Pureza', STATE.settings.showNumbers || pathwayMods().verifyFormula ? `${it.purity}` : it.purity >= 75 ? 'Excelente' : it.purity >= 50 ? 'Aceptable' : 'Dudosa']);
  if(it.cat === 'potion') rows.push(['Aspecto', potionQualityLabel(it)]);
  if(it.cat === 'artifact'){ const k = artifactKnown(it); const d = ARTIFACTS[it.def]; if(k.activation && d) rows.push(['Cómo se activa', d.activation]); if(k.origin && d) rows.push(['Origen', d.origin]); if(k.hidden && d && d.hidden) rows.push(['Lo que esconde', d.hidden.text]); rows.push(['Grado', k.grade ? `Grado ${d.grade} (${d.grade===1?'muy peligroso':d.grade===2?'peligroso':'manejable'})` : '???']); }
  if(it.uses) rows.push(['Usos', it.uses]);
  if(it.risk) rows.push(['Riesgos', it.risk]);
  return `<article class="card item-card"><h3 class="card-h">${esc(it.name)}</h3><p class="card-text">${esc(it.desc||'')}</p>
    <dl class="kv">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${acts.length ? `<div class="action-grid">${acts.map(a=>actionButton(a, 'item-act', {id:it.uid, k:a.id})).join('')}</div>` : ''}</article>`;
}
onAct('inv-cat', (d)=>{ UI.invCat = d.k; renderNow(); }, {free:true});
onAct('inv-sort', (d, el)=>{ UI.invSort = el.value; saveUiPrefs(); renderNow(); }, {free:true});
onAct('inv-sel', (d)=>{ UI.invSel = d.id; renderNow(); const det = $('.inv-detail'); if(det && window.innerWidth < 820) det.scrollIntoView({behavior: prefersReducedMotion() ? 'auto' : 'smooth', block:'start'}); }, {free:true});
onAct('item-act', (d)=>{
  const it = itemByUid(d.id); if(!it) return;
  const danger = ['sell','use','drink','study_notebook','deliver_notebook'].includes(d.k) || /^handover/.test(d.k);
  if(danger && it.cat === 'artifact' && d.k === 'use') return confirmModal(`Activar ${it.name.toLowerCase()} tiene consecuencias que quizás no conocés.`, ()=>doItemAction(d.id, d.k), {yes:'Activarlo', danger:true});
  if(d.k === 'sell') return confirmModal(`¿Vender ${it.name.toLowerCase()}?`, ()=>doItemAction(d.id, d.k), {yes:'Vender'});
  if(d.k === 'drink') return confirmModal('Beberla es irreversible. Si sale mal, puede matarte.', ()=>doItemAction(d.id, d.k), {yes:'Beberla', danger:true});
  doItemAction(d.id, d.k);
});
