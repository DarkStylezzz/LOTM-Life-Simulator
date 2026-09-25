'use strict';
/* =========================================================================
   ui/combat.js — la vista de combate (§24, §25).
   Lo que ves del rival depende de lo que sabés: su Sequence aparece como
   ???, después como un rango, después como una estimación y recién al final
   exacta. El riesgo se lee con la información que tenés, nunca más.
   ========================================================================= */
const ACTION_GROUPS = [
  {k:'atk', label:'Atacar', ids:['attack','shoot']},
  {k:'move', label:'Moverse', ids:['approach','retreat']},
  {k:'def', label:'Defenderse y observar', ids:['defend','observe']},
  {k:'ab', label:'Tus poderes', test:a=>a.ability},
  {k:'it', label:'Objetos', test:a=>a.id.startsWith('item:') || a.id.startsWith('art:')},
  {k:'out', label:'Salir de esto', ids:['talk','pay','flee']}
];
function statusChips(list){ return (list||[]).map(s=>{ const d = STATUSES[s.id]; return d ? `<span class="status ${d.bad?'bad':'good'}" title="${attr(d.desc||'')}">${esc(d.label)}</span>` : ''; }).join(''); }
function renderCombat(){
  const cb = STATE.combat, e = cb.enemy, c = STATE.character;
  const th = combatThreat();
  const cls = th ? ['threat-even','threat-danger','threat-lethal'][th.level] : '';
  const env = COMBAT_ENVS[cb.env] || {};
  const info = infoLine();
  const hpWord = e.hp >= e.maxHp*0.75 ? 'Entero' : e.hp >= e.maxHp*0.45 ? 'Herido' : e.hp >= e.maxHp*0.2 ? 'Muy herido' : 'Casi vencido';
  const acts = combatActions();
  const used = new Set();
  const groups = ACTION_GROUPS.map(g=>{ const list = acts.filter(a=>!used.has(a.id) && (g.ids ? g.ids.includes(a.id) : g.test(a))); list.forEach(a=>used.add(a.id)); return {g, list}; }).filter(x=>x.list.length);
  const rest = acts.filter(a=>!used.has(a.id));
  if(rest.length) groups.push({g:{k:'otros', label:'Otros'}, list:rest});
  let n = 0;
  const actsHtml = groups.map(({g, list})=>`<div class="cmb-group"><div class="cmb-glabel">${esc(g.label)}</div><div class="cmb-actions">${list.map(a=>{ n++; return `<button class="choice-btn cmb ${a.id==='flee'?'flee':''}" data-act="combat" data-id="${attr(a.id)}" ${a.disabled?'disabled aria-disabled="true"':''}><span class="choice-num" aria-hidden="true">${n <= 9 ? n : ''}</span><span class="choice-body">${esc(a.label)}${a.small ? `<small>${esc(a.small)}</small>` : ''}</span></button>`; }).join('')}</div></div>`).join('');
  const log = cb.log.slice(-6);
  return `<article class="evt-card scene combat-card ${cls}" aria-labelledby="scene-title">
    <div class="combat-head"><div><div class="evt-date">Combate · ronda ${cb.round} · ${esc(env.name||'')}</div><h2 class="evt-title" id="scene-title" tabindex="-1">${esc(e.name)}</h2></div>
      ${th ? `<span class="threat-badge" title="${attr(th.seqKnown ? 'Según lo que sabés de su Sequence' : 'Según lo que ves')}">${esc(th.label)}</span>` : ''}</div>
    <p class="evt-text">${esc(e.desc||'')}</p>
    ${th ? `<p class="threat-note">${tierMark(th.seqKnown?'objective':'estimated')} ${esc(th.note)}</p>` : ''}
    <div class="cmb-grid">
      <div class="cmb-side"><div class="cmb-who">${esc(e.name)}</div>
        <div class="small-note">${tierMark('estimated')} ${esc(hpWord)} · ${esc(DIST_LABEL[cb.distance])}</div>
        ${info ? `<div class="small-note">${tierMark(cb.info.stage>=3?'objective':cb.info.stage>=1?'estimated':'unknown')} ${esc(info)}</div>` : ''}
        <div class="small-note intent">${esc(intentText())}</div>
        <div class="statuses">${statusChips(e.statuses)}</div></div>
      <div class="cmb-side you"><div class="cmb-who">Vos</div>
        ${statRow('salud')}${statRow('sanity')}
        <div class="small-note">Espiritualidad: ${c.spirituality}</div>
        <div class="statuses">${statusChips(cb.player.statuses)}</div></div>
    </div>
    <p class="small-note">${esc(env.desc||'')}${cb.witnesses ? ' Hay testigos.' : ''}</p>
    <ol class="combat-log" aria-live="polite">${log.map(l=>`<li>${esc(l)}</li>`).join('')}</ol>
    ${actsHtml}
  </article>`;
}
onAct('combat', (d)=>combatAction(d.id), {scene:true});
