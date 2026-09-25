'use strict';
/* =========================================================================
   systems/effects.js — motor de efectos (el cuello de botella de todo
   cambio de estado).
   Un efecto es un objeto de DATOS, serializable, que cualquier sistema
   puede aplicar ahora o agendar para dentro de años:
     {salud:[-8,-3], cash:120, clue:{pathway:'darkness', reliability:'mixed'},
      rel:{npc:'amigo', trust:5}, memory:{tag,text,cat}, lore:{id:'...'},
      schedule:{inMonths:[12,30], ...}, attention:3, condition:'voces', ...}
   Los valores pueden ser números, rangos [min,max] o funciones (sólo en
   código de data/, nunca guardadas en STATE).
   applyEffects devuelve la lista de cambios en lenguaje narrativo: la UI no
   dice "+3 Cordura" (§40, §51) salvo que el jugador haya activado los
   números en Opciones o tenga forma de saberlo.
   ========================================================================= */

// Referencia a un NPC dentro de un efecto: id literal, '$ctx' (el npc del
// contexto del evento) u objeto NPC.
function resolveNpcRef(ref, ctx){
  if(!ref) return null;
  if(typeof ref === 'object' && ref.id) return ref;
  if(ref === '$ctx' && ctx && ctx.npc) return ctx.npc;
  return npcById(ref);
}

// Multiplicadores que afectan pérdidas/ganancias de stats: rasgos,
// dificultad, síntomas, habilidades pasivas y anclas.
function effectModifiers(){
  const tm = getTraitMods();
  const pm = pathwayMods();
  const cond = conditionMods();
  const anchorRes = anchorsCorruptionResist();
  return {
    healthLoss: tm.healthLossMult * (cond.healthLossMult||1) * (1 - (pm.healthResist||0)),
    sanityLoss: tm.sanityLossMult * diffMult('sanityLoss'),
    corruption: tm.corruptionMult * diffMult('corruption') * (1 - clamp((pm.corruptionResist||0) + anchorRes, 0, 0.7)),
    reputation: tm.reputationMult,
    cash: tm.cashMult,
    digestion: tm.digestionMult * diffMult('digestion')
  };
}

function applyEffects(eff, ctx){
  const changes = [];
  if(!eff) return changes;
  if(typeof eff === 'function') eff = eff(ctx);
  if(!eff) return changes;
  const c = STATE.character;
  const m = effectModifiers();
  const val = (v)=> roll(v, ctx);

  if(eff.salud !== undefined){
    let d = val(eff.salud); if(d<0) d = Math.round(d*m.healthLoss);
    if(d){ const before = c.salud; c.salud = clamp(c.salud + d, 0, 100); pushChange(changes, 'salud', c.salud - before); }
  }
  if(eff.sanity !== undefined){
    let d = val(eff.sanity); if(d<0) d = Math.round(d*m.sanityLoss);
    if(d){ const before = c.sanity; c.sanity = clamp(c.sanity + d, 0, 100); pushChange(changes, 'sanity', c.sanity - before); }
  }
  if(eff.corruption !== undefined){
    let d = val(eff.corruption); if(d>0) d = Math.max(1, Math.round(d*m.corruption));
    if(d){ const before = c.corruption; c.corruption = clamp(c.corruption + d, 0, 100); pushChange(changes, 'corruption', c.corruption - before); }
  }
  if(eff.spirituality !== undefined){
    const d = val(eff.spirituality);
    if(d){ const before = c.spirituality; c.spirituality = clamp(c.spirituality + d, 0, spiritualityCap()); pushChange(changes, 'spirituality', c.spirituality - before); }
  }
  if(eff.reputation !== undefined){
    let d = val(eff.reputation); if(d>0) d = Math.round(d*m.reputation);
    if(d){ const before = c.reputation; c.reputation = clamp(c.reputation + d, -100, 100); pushChange(changes, 'reputation', c.reputation - before); }
  }
  if(eff.cash !== undefined){
    let d = val(eff.cash); if(d>0) d = Math.round(d*m.cash);
    if(d){ c.cash = Math.round(c.cash + d); pushChange(changes, 'cash', d); }
  }
  if(eff.bank !== undefined){ const d = val(eff.bank); if(d){ c.bank = Math.round(c.bank + d); pushChange(changes, 'bank', d); } }
  if(eff.debt !== undefined){ const d = val(eff.debt); if(d){ c.debt = Math.max(0, Math.round(c.debt + d)); pushChange(changes, 'debt', d); } }
  if(eff.humanity !== undefined){ const d = val(eff.humanity); if(d){ c.humanity = clamp((c.humanity??100) + d, 0, 100); if(d<0) pushChange(changes,'humanity',d); } }
  if(eff.fate !== undefined){ c.fate = (c.fate||0) + val(eff.fate); }
  if(eff.luckBuff !== undefined){ STATE.flags.luckBuffUntil = STATE.time.totalMonths + 6; STATE.flags.luckBuff = val(eff.luckBuff); }

  if(eff.digestion !== undefined && STATE.pathway.chosenPathway){
    let d = val(eff.digestion); if(d>0) d = d*m.digestion;
    d = Math.round(d*10)/10;
    if(d){ const before = STATE.pathway.digestion; STATE.pathway.digestion = clamp(STATE.pathway.digestion + d, 0, 100); pushChange(changes, 'digestion', STATE.pathway.digestion - before); }
  }
  // Compatibilidad: el sistema anterior sumaba conocimiento directo a una vía.
  // Ahora se traduce a una pista REAL de esa fuerza, sin anunciarla.
  if(eff.knowledge){
    for(const k in eff.knowledge){
      const key = k === '$chosen' ? STATE.pathway.chosenPathway : k;
      if(key && PATHWAYS[key]) addClue({pathway:key, reliability:'real', strength:val(eff.knowledge[k]), source:'lo que viviste', silent:true});
    }
  }
  if(eff.clue){
    (Array.isArray(eff.clue) ? eff.clue : [eff.clue]).forEach(cl=>{
      const r = addClue(Object.assign({}, cl, {strength: val(cl.strength ?? [2,5])}), ctx);
      if(r && !cl.silent) changes.push({msg:'Una pista nueva', type:'mystic'});
    });
  }
  if(eff.exposure !== undefined){ const d = val(eff.exposure); STATE.flags.mysticExposure = Math.max(0, (STATE.flags.mysticExposure||0) + d); if(d>0) STATE.season.mysticActs++; }
  if(eff.attention !== undefined){ raiseAttention(val(eff.attention)); }
  if(eff.threat !== undefined){ STATE.world.threat = clamp((STATE.world.threat||0) + val(eff.threat)*diffMult('threat'), 0, 100); }

  if(eff.rel){
    (Array.isArray(eff.rel) ? eff.rel : [eff.rel]).forEach(r=>{
      const npc = resolveNpcRef(r.npc, ctx);
      if(!npc) return;
      const deltas = {}; for(const k in r){ if(k!=='npc') deltas[k] = val(r[k]); }
      adjustRel(npc, deltas);
    });
  }
  if(eff.npcState){
    const npc = resolveNpcRef(eff.npcState.npc, ctx);
    if(npc && eff.npcState.lifeState) npc.lifeState = eff.npcState.lifeState;
  }
  if(eff.faction){
    for(const f in eff.faction) factionAdjust(f, eff.faction[f]);
  }
  if(eff.memory){
    (Array.isArray(eff.memory) ? eff.memory : [eff.memory]).forEach(mm=>{
      const npc = mm.npc ? resolveNpcRef(mm.npc, ctx) : null;
      remember(mm.tag, mm.text, {cat:mm.cat, npc: npc ? npc.id : mm.npc, faction:mm.faction});
    });
  }
  if(eff.lore){
    const L = eff.lore;
    if(L.id) learnLore(L.id, L.source||'');
    else if(L.npcSecret){ const n = ctx && ctx.npc; if(n) learnNpcSecret(n); }
    else if(L.cat && chance(L.chance ?? 1)){ const pool = lorePool(L.cat).filter(id=>!knowsLore(id)); if(pool.length) learnLore(pick(pool), L.source||''); }
  }
  if(eff.item){ (Array.isArray(eff.item)?eff.item:[eff.item]).forEach(it=>{ addItem(it.add, it.qty||1, it.provenance||''); changes.push({msg:'Conseguís: '+(ITEM_DEFS[it.add]?ITEM_DEFS[it.add].name:it.add), type:'pos'}); }); }
  if(eff.removeItem){ removeItemByDef(eff.removeItem); }
  if(eff.condition){ addCondition(eff.condition); changes.push({msg:'Algo en vos cambió para siempre', type:'neg'}); }
  if(eff.lead){ addRumor(eff.lead === true ? undefined : eff.lead); }
  if(eff.combat){ startCombat(eff.combat, {}); }
  if(eff.schedule){ (Array.isArray(eff.schedule)?eff.schedule:[eff.schedule]).forEach(s=>scheduleConsequence(Object.assign({}, s, {ctx}))); }
  if(eff.journal){ logJournal(eff.journal.title, eff.journal.text, {cat:eff.journal.cat, imp:eff.journal.imp}); }
  if(eff.world){ cityAdjust(currentCityKey(), eff.world); }
  return changes;
}

// Traducción de un delta numérico a una frase (información estimada, §40).
const CHANGE_WORDS = {
  salud:        {pos:['Te sentís un poco mejor','Recuperás fuerzas'], neg:['Un golpe menor para el cuerpo','Tu cuerpo queda maltrecho']},
  sanity:       {pos:['Algo se aquieta adentro tuyo','Te sentís en paz'], neg:['Algo te inquieta','Algo en tu mente se resquebraja']},
  corruption:   {pos:['Una sombra se te pega','Sentís que algo en vos se oscurece'], neg:['Te sentís más limpio','Algo oscuro se afloja']},
  spirituality: {pos:['Tu percepción se afina','Tu espiritualidad se expande'], neg:['Te sentís espiritualmente cansado','Te sentís vacío por dentro']},
  reputation:   {pos:['Tu nombre suena mejor','Se habla bien de vos'], neg:['Tu reputación se resiente','Tu nombre queda manchado']},
  humanity:     {neg:['Te sentís un poco más lejos de todos','Algo humano se te escurre']},
  digestion:    {pos:['La poción se asienta un poco','Sentís que la poción cede'], neg:['La poción se revuelve dentro tuyo','La poción te rechaza']}
};
const CHANGE_LABEL = {salud:'Salud', sanity:'Cordura', corruption:'Corrupción', spirituality:'Espiritualidad', reputation:'Reputación', digestion:'Digestión', humanity:'Humanidad'};

function pushChange(list, stat, d){
  if(!d) return;
  if(stat === 'cash'){ list.push({msg:(d>0?'+':'')+fmtMoney(d), type:d>0?'pos':'neg'}); return; }
  if(stat === 'bank'){ list.push({msg:(d>0?'+':'')+fmtMoney(d)+' en el banco', type:d>0?'pos':'neg'}); return; }
  if(stat === 'debt'){ list.push({msg:(d>0?'Deuda +':'Deuda ')+fmtMoney(d), type:d>0?'neg':'pos'}); return; }
  const good = stat === 'corruption' ? d<0 : d>0;
  const exact = statVisibility(stat) === 'objective';
  if(exact){
    const lab = CHANGE_LABEL[stat] || stat;
    list.push({msg: (d>0?'+':'') + (Math.round(d*10)/10) + ' ' + lab + (stat==='digestion'?'%':''), type: good?'pos':'neg'});
    return;
  }
  const w = CHANGE_WORDS[stat]; if(!w) return;
  const arr = d>0 ? w.pos : w.neg; if(!arr) return;
  const big = Math.abs(d) >= (stat==='digestion' ? 8 : 7);
  list.push({msg: arr[big?1:0], type: good?'pos':'neg'});
}

// ¿Qué tan "visible" es cada stat para el jugador ahora mismo? (§40)
// objective = número exacto · estimated = descripción · unknown = oculto
function statVisibility(stat){
  const s = STATE.settings && STATE.settings.showNumbers;
  switch(stat){
    case 'salud': case 'cash': case 'reputation': return 'objective';
    case 'sanity': return (s || pathwayMods().insight) ? 'objective' : 'estimated';
    case 'corruption':
      if(s) return 'objective';
      if(STATE.character.corruption < 8 && !STATE.pathway.chosenPathway) return 'unknown';
      return knowsLore('loss_of_control') && STATE.pathway.chosenPathway && STATE.pathway.sequence <= 7 ? 'objective' : 'estimated';
    case 'spirituality': return s || STATE.pathway.chosenPathway ? 'objective' : 'estimated';
    case 'digestion': return (s || STATE.pathway.actingMethod >= 2) ? 'objective' : 'estimated';
    case 'humanity': return s ? 'objective' : 'estimated';
  }
  return 'estimated';
}

// Compatibilidad con la API anterior (toast de una lista de cambios).
function effectsToToastList(eff){
  const list = [];
  if(!eff) return list;
  ['salud','sanity','corruption','spirituality','reputation','cash','digestion'].forEach(k=>{ if(typeof eff[k]==='number') pushChange(list, k, eff[k]); });
  return list;
}
function applyAndToast(eff, ctx){
  const ch = applyEffects(eff, ctx);
  if(ch.length) toast(ch);
  return ch;
}
