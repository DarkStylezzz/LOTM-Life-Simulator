'use strict';
/* =========================================================================
   systems/knowledge.js — lo que sabés, y lo que te cuesta saberlo (§16).
   Separación: conocimiento (fact), secretos (secret), saber prohibido
   (forbidden) y entidades (entity) viven en STATE.lore; el conocimiento
   por vía vive en systems/pathway.js. Aprender algo peligroso cobra:
   Cordura, Corrupción, atención del mundo, y "amenaza" (que algo que no es
   humano sepa que existís). Algunos secretos son LLAVES: el Método de
   Actuación, el nombre honorífico del Loco, el mercado negro.
   ========================================================================= */
function knowsLore(id){ const L = LORE[id]; return !!L && (STATE.lore[L.cat]||[]).includes(id); }
function loreCount(cat){ return cat ? (STATE.lore[cat]||[]).length : ['fact','secret','forbidden','entity'].reduce((a,k)=>a+(STATE.lore[k]||[]).length, 0); }
function allKnownLore(){ return ['fact','secret','forbidden','entity'].flatMap(k=>(STATE.lore[k]||[])); }

function learnLore(id, source){
  const L = LORE[id];
  if(!L || knowsLore(id)) return false;
  (STATE.lore[L.cat] = STATE.lore[L.cat] || []).push(id);
  const costs = L.cost || (L.dangerous ? {sanity:[-6,-2], corruption:[0,2]} : null);
  let resist = 0;
  if(L.cat === 'forbidden' || L.cat === 'entity') resist = pathwayMods().forbiddenResist || 0;
  if(costs){
    const eff = {};
    // Los costos de LORE vienen como magnitudes: siempre restan Cordura.
    if(costs.sanity) eff.sanity = -Math.abs(Math.round(roll(costs.sanity) * (1-resist)));
    if(costs.corruption) eff.corruption = Math.abs(Math.round(roll(costs.corruption) * (1-resist)));
    applyEffects(eff);
    if(costs.threat) STATE.world.threat = clamp((STATE.world.threat||0) + costs.threat*diffMult('threat')*(1-resist), 0, 100);
    raiseAttention(L.cat==='forbidden'||L.cat==='entity' ? rndInt(2,5) : rndInt(0,2));
  }
  STATE.flags.mysticExposure = (STATE.flags.mysticExposure||0) + (L.cat==='fact' ? 1 : 3);
  const catName = {fact:'Algo nuevo', secret:'Un secreto', forbidden:'Saber prohibido', entity:'Algo que no debería saberse'}[L.cat];
  logJournal(catName + ': ' + L.title, L.text + (source ? ` (Lo supiste por ${source}.)` : ''), {cat:'mystery', imp: L.cat==='fact' ? 1 : 2});
  remember('lore_'+id, `Aprendiste: ${L.title}.`, {cat:'secret'});
  // Llaves.
  if(id === 'acting_method'){ STATE.pathway.actingMethod = 2; STATE.pathway.actingMethodProgress = 2; if(STATE.pathway.chosenPathway) logJournal('El Método de Actuación', 'Ahora entendés qué te pide la poción. Tu digestión deja de ser un misterio.', {cat:'pathway', imp:3}); addMilestone('mystic', 'Comprende el Método de Actuación'); }
  if(id === 'fool_honorific'){ STATE.tarot.honorific = true; }
  if(id === 'tarot_fool'){ tarotHear(source||'un secreto'); }
  if(L.faction && STATE.factions[L.faction]){ const f = STATE.factions[L.faction]; if(!f.knownSecrets.includes(id)) f.knownSecrets.push(id); factionMeet(L.faction); }
  if(L.cat === 'forbidden' || L.cat === 'entity'){
    // Saber prohibido a veces llama a algo.
    if(chance(0.15 * diffMult('threat'))) scheduleConsequence({inMonths:[2,12], title:'Algo te encontró', text:'Una noche sentís, con total claridad, que algo que no es de este mundo sabe tu nombre porque vos sabés el suyo.', effect:{sanity:[-10,-4], threat:5}, memory:{tag:'entity_noticed', text:'Algo te notó por lo que sabés.', cat:'trauma'}});
  }
  if(!STATE.pendingEvent) toast([{msg: catName + ': ' + L.title, type: L.cat==='fact'||L.cat==='secret' ? 'mystic' : 'neg'}]);
  return true;
}
// Secretos que se pueden compartir/intercambiar (Tarot, facciones).
function tradeableLore(){ return allKnownLore().filter(id=>LORE[id].tradeValue>0 && !(STATE.lore.shared||[]).includes(id)); }
