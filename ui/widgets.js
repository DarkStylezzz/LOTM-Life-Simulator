'use strict';
/* =========================================================================
   ui/widgets.js — piezas de interfaz reutilizables.
   La regla de la información oculta (§40): cada dato se muestra como
   OBJETIVO (número exacto, ●), ESTIMADO (una frase, ◐) o DESCONOCIDO (○),
   según lo que el personaje puede saber (statVisibility). La opción
   "Mostrar números" existe para quien la quiera.
   ========================================================================= */
const TIER_MARK = {objective:{sym:'●', label:'Dato objetivo'}, estimated:{sym:'◐', label:'Estimación'}, unknown:{sym:'○', label:'Desconocido'}};
function tierMark(t){ const m = TIER_MARK[t] || TIER_MARK.estimated; return `<span class="tier tier-${t}" title="${m.label}" role="img" aria-label="${m.label}"></span>`; }

const STAT_PHRASES = {
  salud: [[80,'Excelente'],[60,'Buena'],[40,'Resentida'],[20,'Frágil'],[0,'Grave']],
  sanity: [[80,'Tu mente está clara.'],[60,'Algo te inquieta, a veces.'],[40,'Te cuesta dormir. Hay cosas que no se van.'],[20,'Escuchás cosas que no están.'],[0,'Estás al borde.']],
  corruption: [[80,'Casi no queda nada tuyo.'],[60,'La sombra habla con tu voz, a veces.'],[40,'Algo oscuro te acompaña. Ya no te sorprende.'],[20,'Sentís una presencia extraña cada vez más seguido.'],[8,'Hay algo que no es tuyo. Es poco.'],[0,'Nada fuera de lo común.']],
  spirituality: [[70,'Percibís lo que otros no ven, casi sin querer.'],[45,'Tenés buen ojo para lo extraño.'],[25,'A veces notás cosas raras.'],[0,'Nada que te distinga.']],
  humanity: [[80,'Seguís siendo quien eras.'],[55,'A veces te cuesta sentir lo que sentís.'],[30,'Mirás a la gente como a través de un vidrio.'],[0,'Ya casi no recordás cómo era.']],
  reputation: [[60,'Respetado'],[25,'Bien considerado'],[-10,'Sin mucha fama'],[-40,'Mala fama'],[-101,'Despreciado']],
  attention: [[75,'Te están buscando.'],[50,'Te siguen. Estás seguro.'],[25,'Alguien preguntó por vos.'],[8,'Tal vez alguien te miró dos veces.'],[0,'Nadie te mira.']]
};
function phraseFor(stat, v){ const t = STAT_PHRASES[stat]; if(!t) return ''; for(const [min, txt] of t){ if(v >= min) return txt; } return t[t.length-1][1]; }
function statValue(stat){
  const c = STATE.character;
  switch(stat){
    case 'salud': return c.salud; case 'sanity': return c.sanity; case 'corruption': return c.corruption;
    case 'spirituality': return c.spirituality; case 'humanity': return c.humanity ?? 100; case 'reputation': return c.reputation;
    case 'digestion': return STATE.pathway.digestion; case 'attention': return STATE.world.attention || 0;
  }
  return 0;
}
// Devuelve {tier, text, value, pct}
function statView(stat){
  const v = Math.round(statValue(stat));
  let tier = stat === 'attention' ? (STATE.settings.showNumbers ? 'objective' : 'estimated') : statVisibility(stat);
  if(stat === 'digestion') return {tier, value:v, pct:v, text: tier === 'objective' ? `${v}%` : digestionLabel()};
  if(tier === 'unknown') return {tier, value:null, pct:0, text:'???'};
  const phrase = phraseFor(stat, v);
  if(tier === 'objective') return {tier, value:v, pct: stat==='reputation' ? (v+100)/2 : v, text: stat==='salud' || stat==='reputation' ? `${v} · ${phrase}` : `${v}`, phrase};
  return {tier, value:null, pct:0, text:phrase};
}
const STAT_LABEL = {salud:'Salud', sanity:'Cordura', corruption:'Corrupción', spirituality:'Espiritualidad', humanity:'Humanidad', reputation:'Reputación', digestion:'Digestión', attention:'Atención del mundo oculto'};
const STAT_COLOR = {salud:'var(--health-col)', sanity:'var(--sanity-col)', corruption:'var(--corrupt-col)', spirituality:'var(--violet-bright)', humanity:'var(--gold)', reputation:'var(--gold)', digestion:'var(--gold-bright)', attention:'var(--crimson-bright)'};
function statRow(stat){
  const s = statView(stat);
  const bar = s.tier === 'objective' ? `<div class="bar" role="meter" aria-label="${STAT_LABEL[stat]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.value}"><div style="width:${clamp(s.pct,0,100)}%;background:${STAT_COLOR[stat]}"></div></div>` : '';
  return `<div class="stat-line ${s.tier}"><div class="stat-head"><span class="lbl">${tierMark(s.tier)} ${STAT_LABEL[stat]}</span><span class="val">${esc(s.text)}</span></div>${bar}</div>`;
}

/* ------------------------------ piezas genéricas ------------------------------ */
function sec(title, extra){ return `<h2 class="sec-title">${esc(title)}${extra ? ` <span class="sec-extra">${extra}</span>` : ''}</h2>`; }
function emptyState(text){ return `<p class="list-empty">${esc(text)}</p>`; }
function tag(text, kind){ return `<span class="tag ${kind ? 'tag-'+kind : ''}">${esc(text)}</span>`; }
function btn(label, act, data, opts){
  opts = opts || {};
  const d = Object.entries(data||{}).map(([k,v])=>`data-${k}="${attr(v)}"`).join(' ');
  const dis = opts.disabled ? `disabled aria-disabled="true"` : '';
  const title = opts.title ? `title="${attr(opts.title)}"` : '';
  return `<button class="btn ${opts.cls||''}" data-act="${act}" ${d} ${dis} ${title}>${esc(label)}${opts.small ? `<small>${esc(opts.small)}</small>` : ''}</button>`;
}
function actionButton(a, act, data){
  // Botón "rico": etiqueta + explicación corta + motivo si está deshabilitado.
  const d = Object.entries(data||{}).map(([k,v])=>`data-${k}="${attr(v)}"`).join(' ');
  const off = a.disabled || a.ok === false;
  const why = off && (a.why || a.reason) ? `<small class="why">${esc(a.why || a.reason)}</small>` : '';
  const small = a.small || a.desc ? `<small>${esc(a.small || a.desc)}</small>` : '';
  const time = a.time ? `<span class="cost" title="Tiempo libre">⧗${a.time}</span>` : '';
  return `<button class="action-btn ${a.danger ? 'danger' : ''}" data-act="${act}" ${d} ${off ? 'disabled aria-disabled="true"' : ''}><span class="a-label">${esc(a.label)}${time}</span>${small}${why}</button>`;
}
function choiceButtons(choices, act, extra){
  return `<div class="evt-choices" role="group" aria-label="Opciones">${choices.map((c,i)=>`<button class="choice-btn" data-act="${act}" data-idx="${c.idx ?? i}" ${extra||''}><span class="choice-num" aria-hidden="true">${i+1}</span><span class="choice-body">${esc(c.label)}${c.small ? `<small>${esc(c.small)}</small>` : ''}</span></button>`).join('')}</div>`;
}
// Lista de requisitos. Lo que falta muestra, si lo tiene, cómo se consigue.
function reqList(reqs){
  return `<ul class="req-list">${reqs.map(r=>`<li class="${r.ok?'req-ok':'req-fail'}"><span aria-hidden="true">${r.ok?'✔':'✘'}</span> ${esc(r.label)}<span class="sr-only">${r.ok?' (cumplido)':' (falta)'}</span>${!r.ok && r.hint ? `<span class="req-hint">${esc(r.hint)}</span>` : ''}</li>`).join('')}</ul>`;
}
function changeChips(changes){
  if(!changes || !changes.length) return '';
  return `<div class="chips">${changes.map(c=>`<span class="chip ${c.type||''}">${esc(c.msg)}</span>`).join('')}</div>`;
}
function collapsible(id, title, body, opts){
  opts = opts || {};
  const open = UI.open[id] !== undefined ? UI.open[id] : !!opts.open;
  return `<section class="fold ${open?'open':''}" id="fold-${id}"><button class="fold-head" data-act="fold" data-k="${id}" aria-expanded="${open}" aria-controls="fold-body-${id}"><span>${esc(title)}</span>${opts.badge ? `<span class="fold-badge">${esc(opts.badge)}</span>` : ''}<span class="fold-ic" aria-hidden="true">▾</span></button>
    <div class="fold-body" id="fold-body-${id}" ${open ? '' : 'hidden'}>${open ? body : ''}</div></section>`;
}
onAct('fold', (d)=>{ const cur = UI.open[d.k]; const el = byId('fold-'+d.k); UI.open[d.k] = !(cur !== undefined ? cur : el && el.classList.contains('open')); saveUiPrefs(); renderNow(); }, {free:true});
function subnav(key, items){
  const cur = UI.sub[key] || items[0].id;
  return `<div class="subnav" role="tablist" aria-label="Secciones">${items.map(it=>`<button role="tab" class="subtab-btn ${it.id===cur?'active':''}" aria-selected="${it.id===cur}" data-act="subtab" data-k="${key}" data-id="${it.id}">${esc(it.label)}${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ''}</button>`).join('')}</div>`;
}
function currentSub(key, items){ const cur = UI.sub[key]; return items.some(i=>i.id===cur) ? cur : items[0].id; }
onAct('subtab', (d)=>{ UI.sub[d.k] = d.id; saveUiPrefs(); renderNow(); window.scrollTo(0, 0); }, {free:true});

/* ------------------------------ fechas y gente ------------------------------ */
function ageText(n){ return n === 1 ? '1 año' : `${n} años`; }
function npcAgeText(n){ const a = npcAge(n); return a < 1 ? 'bebé' : ageText(a); }
function relWord(n){ return relationshipLabel(n); }
function npcHiddenLine(n){
  const bits = [];
  if(n.known && n.known.pathway && n.hidden.pathway) bits.push(`${tierMark('objective')} ${esc(PATHWAYS[n.hidden.pathway].name)}${n.known.sequence ? ' · Sequence '+n.hidden.sequence : ''}`);
  else if(n.mystic >= 60 && n.met && (STATE.flags.mysticExposure||0) > 20) bits.push(`${tierMark('estimated')} Hay algo en esta persona que no termina de cerrar.`);
  if(n.known && n.known.faction && n.hidden.faction) bits.push(`${tierMark('objective')} ${esc(factionName(n.hidden.faction))}`);
  return bits.join(' · ');
}
function fmtDate(e){ return e && e.cy ? `${e.cy}${e.age !== undefined ? ' · ' + ageText(e.age) : ''}` : ''; }
function rarityTag(r){ const d = ITEM_RARITY[r] || ITEM_RARITY.comun; return `<span class="tag rarity-${r}">${esc(d.label)}</span>`; }
