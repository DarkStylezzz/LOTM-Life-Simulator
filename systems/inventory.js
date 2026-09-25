'use strict';
/* =========================================================================
   systems/inventory.js — inventario unificado (§33).
   Todo objeto es una entrada de STATE.inventory.items:
     {uid, cat, def?, name, qty, rarity, provenance, desc, risk, uses, ...}
   Categorías separadas: libros, documentos, ingredientes, fórmulas,
   pociones, características, armas, artefactos, objetos de misión y objetos
   del Tarot Club. Con cantidades, rareza, procedencia, riesgos y usos, y
   filtros/orden en la UI.
   ========================================================================= */
function inventoryItems(){ return STATE.inventory.items || (STATE.inventory.items = []); }
function itemByUid(uidv){ return inventoryItems().find(it=>it.uid===uidv) || null; }
function itemsByCat(cat){ return inventoryItems().filter(it=>it.cat===cat && it.qty > 0); }
function hasItem(defId){ return inventoryItems().some(it=>it.def===defId && it.qty > 0); }
function provenanceText(p){ return p ? `${p} (${calendarYear()})` : `(${calendarYear()})`; }

// addItem('book_x') · addItem({cat,name,...}) — apila los idénticos.
function addItem(defOrObj, qty, provenance){
  qty = qty || 1;
  let it;
  if(typeof defOrObj === 'string'){
    const d = ITEM_DEFS[defOrObj];
    if(!d) return null;
    it = inventoryItems().find(x=>x.def===defOrObj && x.cat!=='artifact');
    if(it){ it.qty += qty; return it; }
    it = {uid:uid('it'), def:defOrObj, cat:d.cat, name:d.name, qty, rarity:d.rarity||'comun', desc:d.desc||'', risk:d.risk||'', uses:d.uses||'', provenance:provenanceText(provenance), acquired:STATE.time.totalMonths};
  } else {
    const o = defOrObj;
    it = inventoryItems().find(x=>!x.def && x.name===o.name && x.cat===o.cat && !['formula','potion','artifact','characteristic'].includes(o.cat));
    if(it){ it.qty += qty; return it; }
    it = Object.assign({uid:uid('it'), qty, rarity:'comun', desc:'', risk:'', uses:'', acquired:STATE.time.totalMonths}, o);
    it.provenance = o.provenance && /\(\d{4}\)$/.test(o.provenance) ? o.provenance : provenanceText(o.provenance);
  }
  inventoryItems().push(it);
  return it;
}
function removeItem(uidv, qty){
  const list = inventoryItems();
  const i = list.findIndex(x=>x.uid===uidv);
  if(i < 0) return;
  list[i].qty -= (qty || 1);
  if(list[i].qty <= 0) list.splice(i, 1);
}
function removeItemByDef(defId){ const it = inventoryItems().find(x=>x.def===defId && x.qty>0); if(it) removeItem(it.uid); }
// Compatibilidad con el sistema anterior.
function addInventoryItem(category, name, meta){
  if(category === 'artifacts'){ const k = artifactKeyByName(name); if(k) return addArtifact(k, 'encontrado'); }
  return addItem({cat: category==='books' ? 'book' : category==='documents' ? 'document' : 'misc', name, desc:meta||''}, 1, '');
}

/* ------------------------------ usar objetos ------------------------------ */
function readItem(uidv){
  if(timeBlocked()) return;
  const it = itemByUid(uidv); if(!it) return;
  const d = ITEM_DEFS[it.def];
  if(!d || !d.read){ toast('No hay nada más que sacarle a esto leyendo.', 'neg'); return; }
  if(STATE.character.edad < 10){ toast('Todavía no entendés lo que dice.', 'neg'); return; }
  if(it.readCount >= 2){ toast('Ya lo leíste hasta el cansancio. No hay más.', 'neg'); return; }
  if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  it.readCount = (it.readCount||0) + 1; markMysticAct();
  const before = snapshotForChanges();
  const r = d.read;
  if(r.clue) applyEffects({clue: Object.assign({}, r.clue, {strength: it.readCount>1 ? [1,3] : r.clue.strength})});
  if(r.sanity) applyEffects({sanity:r.sanity});
  if(r.attention) raiseAttention(r.attention);
  if(r.lore && chance(r.lore.chance)){ const pool = lorePool(r.lore.cat).filter(id=>!knowsLore(id)); if(pool.length) learnLore(pick(pool), it.name); }
  const text = it.readCount > 1 ? `Releés ${it.name.toLowerCase()}. Encontrás un par de cosas que se te habían pasado.` : `Leés ${it.name.toLowerCase()} con atención, de noche, a la luz de una vela.`;
  logJournal('Lectura', text, {cat:'mystery'});
  setResolution('Lectura', text, diffForDisplay(before));
  saveGame(true); renderAll();
}
function useConsumable(uidv){
  const it = itemByUid(uidv); if(!it) return;
  const d = ITEM_DEFS[it.def];
  if(!d || !d.consumable) return;
  const ch = applyEffects(d.consumable);
  removeItem(uidv);
  if(!STATE.combat){ setResolution(it.name, 'Lo usás.', ch); saveGame(true); renderAll(); }
  return ch;
}
function sellItem(uidv){
  if(timeBlocked()) return;
  const it = itemByUid(uidv); if(!it) return;
  if(it.cat === 'artifact') return artifactAction(uidv, 'sell');
  const base = {book:[10,40], document:[5,30], weapon:[10,60], misc:[5,25], potion:[80,250], characteristic:[300,900], formula:[100,400], ingredient:[30,150]}[it.cat] || [5,20];
  if(['potion','characteristic','formula','ingredient'].includes(it.cat) && !knowsLore('black_market')){ toast('No conocés a nadie que compre algo así.', 'neg'); return; }
  const v = Math.round(rndInt(base[0], base[1]) * priceIndex());
  applyEffects({cash:v});
  if(['potion','characteristic','formula'].includes(it.cat)) raiseAttention(rndInt(2,5));
  removeItem(uidv);
  logJournal('Una venta', `Vendés ${it.name.toLowerCase()} por ${fmtMoney(v)}.`, {cat:'life'});
  saveGame(true); renderAll();
}
function buyWeapon(defId){
  const d = ITEM_DEFS[defId]; if(!d || !d.price) return;
  const cost = Math.round(d.price * priceIndex());
  if(STATE.character.cash < cost){ toast('No te alcanza.', 'neg'); return; }
  if(STATE.character.edad < 16){ toast('Nadie te vende eso a tu edad.', 'neg'); return; }
  applyEffects({cash:-cost});
  addItem(defId, 1, 'comprado');
  if(defId === 'weapon_revolver') raiseAttention(1);
  saveGame(true); renderAll();
}
function bestWeapon(ranged){
  const ws = itemsByCat('weapon').map(it=>ITEM_DEFS[it.def]).filter(d=>d && d.combat && (!ranged || d.combat.ranged));
  return ws.sort((a,b)=>b.combat.dmg - a.combat.dmg)[0] || null;
}

// Orden y filtros para la UI.
const INVENTORY_SORTS = {
  recent:(a,b)=>(b.acquired||0)-(a.acquired||0),
  name:(a,b)=>a.name.localeCompare(b.name),
  rarity:(a,b)=>(ITEM_RARITY[b.rarity]||{rank:0}).rank - (ITEM_RARITY[a.rarity]||{rank:0}).rank
};
