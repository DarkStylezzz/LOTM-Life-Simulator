'use strict';
/* =========================================================================
   systems/abilities.js — habilidades y el "cómo se juega" de cada vía
   (§26, §54, §55).
   unlockedAbilities(): todo lo de tu vía desde la Sequence 9 hasta la
   actual. pathwayMods(): suma los pasivos (investigación, engaño, sigilo,
   tiempo libre, pociones, etc.) — esos números los consultan TODOS los
   demás sistemas, y es lo que hace que un Vidente investigue mejor, un
   Payaso mienta mejor, un Insomne tenga más tiempo, un Boticario prepare
   mejores pociones y un Guerrero pelee mejor. No todas las vías se
   convierten en "pega más fuerte".
   ========================================================================= */
function unlockedAbilities(){
  const p = STATE.pathway;
  if(!p.chosenPathway) return [];
  return (ABILITIES[p.chosenPathway]||[]).filter(a=>a.seq >= p.sequence);
}
function combatAbilities(){ return unlockedAbilities().filter(a=>a.combat && a.cost); }
function abilityById(id){ for(const k in ABILITIES){ const a = ABILITIES[k].find(x=>x.id===id); if(a) return a; } return null; }

let _pmCache = {key:null, mods:null};
function pathwayMods(){
  const p = STATE && STATE.pathway;
  if(!p) return {};
  const key = (p.chosenPathway||'-') + ':' + p.sequence + ':' + STATE.time.totalMonths + ':' + (STATE.flags.researchBuffUntil||0);
  if(_pmCache.key === key) return _pmCache.mods;
  const m = {research:0, social:0, deception:0, perception:0, stealth:0, exploreFind:0, exploreSafe:0, freeTime:0, sanityRegen:0,
    corruptionResist:0, combatPower:0, brew:0, acting:0, healMonthly:0, healthResist:0, fate:0, ritualAccuracy:0, interrogate:0,
    secretFind:0, revealNpc:0, decipher:0, fleeBonus:0, lossOfControlResist:0, forbiddenResist:0, corruptionPurge:0, weaponMult:1};
  unlockedAbilities().forEach(a=>{
    const ps = a.passive; if(!ps) return;
    for(const k in ps){
      const v = ps[k];
      if(typeof v === 'number'){ if(k==='weaponMult') m[k] = Math.max(m[k], v); else m[k] = (m[k]||0) + v; }
      else if(v) m[k] = true;
    }
  });
  _pmCache = {key, mods:m};
  return m;
}
function invalidatePathwayMods(){ _pmCache.key = null; }

/* ------------------------------ usos fuera de combate ------------------------------ */
// Acciones de poder que aparecen en la pestaña Misticismo, según tu vía.
function powerActions(){
  const acts = [];
  const pm = pathwayMods();
  if(!STATE.pathway.chosenPathway) return acts;
  if(pm.verifyClues && unverifiedClues().length) acts.push({id:'divine', label:'Adivinar si una pista es cierta', time:1, desc:'Preguntarle al mundo, con tu poder, si una de tus pistas dice la verdad.'});
  if(pm.remedies) acts.push({id:'remedy', label:'Preparar remedios', time:1, desc:'Remedios que curan, para vos o para vender.'});
  if(pm.theft) acts.push({id:'theft', label:'Robar con habilidad', time:1, desc:'Plata ajena, sin que nadie lo note. Casi siempre.'});
  if(pm.dreamSecrets || pm.talkToDead) acts.push({id:'dream', label: pm.talkToDead ? 'Preguntarle a los muertos' : 'Entrar en un sueño ajeno', time:1, desc:'Lo que la gente esconde despierta, lo cuenta dormida (o muerta).'});
  if(pm.corruptionPurge) acts.push({id:'purify', label:'Purificarte', time:1, desc:'Tu luz también sirve para vos: quemar un poco de la corrupción acumulada.'});
  if((STATE.world.attention||0) >= 25 && (pm.stealth||0) > 0) acts.push({id:'vanish', label:'Borrar tu rastro', time:1, desc:'Usar tu poder para que el mundo oculto te pierda de vista.'});
  return acts;
}
function doPowerAction(id){
  if(timeBlocked()) return;
  const a = powerActions().find(x=>x.id===id);
  if(!a){ toast('No podés hacer eso ahora.', 'neg'); return; }
  if(!spendFreeTime(a.time||1)){ toast('No te queda tiempo libre esta temporada.', 'neg'); return; }
  markMysticAct();
  const c = STATE.character;
  const before = snapshotForChanges();
  let text = '';
  raiseAttention(rndInt(0,2));
  if(id === 'divine'){
    const cl = pick(unverifiedClues());
    const res = verifyClue(cl.id, 'tu adivinación te dice');
    text = res === 'real' ? `El péndulo no duda: la pista de ${cl.source||'aquella vez'} es cierta.` : `El péndulo gira sin rumbo: la pista de ${cl.source||'aquella vez'} era falsa.`;
    applyEffects({spirituality:-2});
    // A veces la adivinación ve algo más que lo que preguntaste.
    if(chance(0.12)){ const h = revealRandomHiddenTruth('tu adivinación te lo mostró'); if(h) text += ' Y de paso, ves algo que no preguntaste.'; }
  } else if(id === 'remedy'){
    addItem('remedy', rndInt(1,2), 'preparado por vos');
    const sold = chance(0.5) ? Math.round(rndInt(15,45)*priceIndex()) : 0;
    if(sold) applyEffects({cash:sold, reputation:[0,1]});
    text = `Preparás remedios con tus propias manos.${sold ? ' Vendés algunos en el barrio: '+fmtMoney(sold)+'.' : ''}`;
  } else if(id === 'theft'){
    if(chance(0.8 + pm_(0,'deception'))){ const v = Math.round(rndInt(30,120)*priceIndex()); applyEffects({cash:v, corruption:[0,1]}); text = `Un par de horas en el mercado. Volvés con ${fmtMoney(v)} que no eran tuyos. Nadie notó nada.`; }
    else { applyEffects({reputation:[-6,-3], attention:3}); text = 'Te agarran la mano dentro de un bolsillo. Salís corriendo. Hay gente que va a recordar tu cara.'; }
  } else if(id === 'dream'){
    const pool = aliveNpcs().filter(n=>n.met && (n.secrets.some(s=>!s.known) || (n.hidden.pathway && !n.known.pathway)));
    const dead = STATE.npcs.filter(n=>!n.alive && n.met && STATE.hiddenTruths.some(h=>!h.revealed && h.npc===n.id));
    if(pathwayMods().talkToDead && dead.length){ const n = pick(dead); const h = STATE.hiddenTruths.find(x=>!x.revealed && x.npc===n.id); revealHiddenTruth(h.id, `${n.name} te lo contó desde el otro lado`); text = `El espíritu de ${n.name} te habla. Te cuenta algo que se llevó a la tumba.`; applyEffects({sanity:[-4,-1]}); }
    else if(pool.length){ const n = pick(pool); if(n.hidden.pathway && !n.known.pathway && chance(0.5)){ n.known.pathway = true; text = `En el sueño de ${n.name} ves lo que es de verdad: ${PATHWAYS[n.hidden.pathway].name}.`; } else { learnNpcSecret(n); text = `En el sueño de ${n.name} aprendés algo que no te contaría despierto.`; } applyEffects({sanity:[-3,0]}); }
    else text = 'Recorrés sueños ajenos. No hay nada que no supieras ya.';
  } else if(id === 'purify'){
    const amt = rndInt(2,5) + Math.round((pathwayMods().corruptionPurge||0)*10);
    applyEffects({corruption:-amt, spirituality:-3});
    text = 'Te quemás por dentro con tu propia luz. Duele, y algo oscuro se afloja.';
  } else if(id === 'vanish'){
    STATE.world.attention = Math.max(0, STATE.world.attention - rndInt(10,20));
    FACTION_KEYS.forEach(k=>{ STATE.factions[k].suspicion = Math.max(0, STATE.factions[k].suspicion - 5); });
    text = 'Durante semanas, dejás de ser alguien a quien se pueda seguir. Cuando volvés a aparecer, el rastro está frío.';
  }
  logJournal('Tu poder', text, {cat:'pathway'});
  setResolution(a.label, text, diffForDisplay(before));
  checkDeathAndCrisis();
  saveGame(true); renderAll();
}
function pm_(def, key){ const v = pathwayMods()[key]; return typeof v === 'number' ? v : def; }
