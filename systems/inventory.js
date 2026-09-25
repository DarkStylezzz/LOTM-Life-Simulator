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

/* ------------------------------ acciones por objeto ------------------------------ */
// Qué se puede hacer con cada cosa (la UI sólo muestra lo que existe acá).
function itemActions(it){
  const acts = [];
  const d = ITEM_DEFS[it.def];
  if(it.cat === 'artifact') return artifactActions(it);
  if(d && d.read && (it.readCount||0) < 2) acts.push({id:'read', label: it.readCount ? 'Releer' : 'Leer', small:'1 tiempo libre.'});
  if(d && d.consumable) acts.push({id:'use', label:'Usar', small:d.uses});
  if(it.def === 'tarot_card' && !it.studied) acts.push({id:'study_card', label:'Estudiar la carta', small:'1 tiempo libre.'});
  if(it.def === 'quest_notebook'){
    acts.push({id:'study_notebook', label:'Leer el cuaderno', small:'Muy peligroso.', danger:true});
    acts.push({id:'deliver_notebook', label:'Entregarlo a la Iglesia', small:'Que lo guarde quien sabe.'});
  }
  if(it.cat === 'potion' && it.seq === 9 && !STATE.pathway.chosenPathway) acts.push({id:'drink', label:'Beber', small:'No hay vuelta atrás.', danger:true});
  if(it.cat === 'formula' && it.pathway && !it.verified && canVerifyFormulas()) acts.push({id:'verify', label:'Verificar la fórmula', small:'1 tiempo libre.'});
  if(['book','document','weapon','misc','potion','characteristic','formula','ingredient'].includes(it.cat) && it.def !== 'quest_notebook') acts.push({id:'sell', label:'Vender', small: ['potion','characteristic','formula','ingredient'].includes(it.cat) ? 'Sólo en el mercado negro.' : ''});
  return acts;
}
function doItemAction(uidv, act){
  if(timeBlocked()) return;
  const it = itemByUid(uidv); if(!it){ toast('Ya no tenés eso.', 'neg'); return; }
  if(it.cat === 'artifact') return artifactAction(uidv, act);
  if(act === 'read') return readItem(uidv);
  if(act === 'use') return useConsumable(uidv);
  if(act === 'sell') return sellItem(uidv);
  if(act === 'drink') return startDrinkPotion(uidv);
  if(act === 'verify'){
    if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
    const pm = pathwayMods(); const helper = !(pm.verifyFormula || pm.verifyClues) ? pick(knownMysticNpcs()) : null;
    const res = verifyFormula(uidv, helper ? `con ayuda de ${helper.name}, verificás` : 'verificás');
    if(helper) adjustRel(helper, {trust:[1,3], dependence:[0,2]});
    const txt = res === 'true' ? 'Cada ingrediente, cada proporción: todo coincide. Es auténtica.' : res === 'partial' ? 'Algo no cierra. Le falta un paso, o un ingrediente. Así como está, la poción saldría incompleta.' : 'Es falsa. Alguien la escribió para que la bebiera otro.';
    setResolution('Verificar la fórmula', txt, []);
    saveGame(true); renderAll(); return;
  }
  const before = snapshotForChanges();
  let title = it.name, text = '';
  if(act === 'study_card'){
    if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
    it.studied = true; markMysticAct();
    tarotHear('una carta que estudiaste');
    applyEffects({clue:{pathway:'fool', reliability:'partial', strength:[3,6], source:'una carta de tarot'}, sanity:[-2,0]});
    tarotObserve(3, 'estudiaste la carta con respeto');
    text = 'Pasás una noche entera mirando la carta. La niebla pintada en el reverso parece moverse si no la mirás directamente. En un momento, jurarías que alguien, del otro lado, también te mira.';
  } else if(act === 'study_notebook'){
    if(!spendFreeTime(1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
    markMysticAct();
    applyEffects({sanity:[-12,-5], corruption:[2,5], attention:5});
    const pool = lorePool('forbidden').filter(x=>!knowsLore(x));
    if(pool.length) learnLore(pick(pool), 'el cuaderno de tapas negras');
    text = 'Leés. La letra cambia de mano a mitad de página. En la última hoja escrita hay una fecha: la de mañana.';
    if(chance(0.25)){ logJournal(it.name, text, {cat:'mystery', imp:2}); startCombat('forsakenHorror', {env:'home', source:'el cuaderno'}); saveGame(true); renderAll(); return; }
  } else if(act === 'deliver_notebook'){
    removeItem(uidv);
    setWorldFlag('tingen_notebook_delivered', true);
    factionMeet('church'); factionAdjust('church', {trust:10, merit:6, publicRep:5});
    remember('delivered_notebook', 'Entregaste el cuaderno de tapas negras a la Iglesia.', {cat:'choice', faction:'church'});
    text = 'El diácono se pone pálido al verlo. Lo guarda en una caja de plomo sin tocarlo con los dedos. "No se lo diga a nadie. A nadie."';
  } else return;
  logJournal(title, text, {cat:'mystery', imp:2});
  setResolution(title, text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
