'use strict';
/* =========================================================================
   LORD OF THE MYSTERIES: LIFE SIMULATOR — v3
   systems/core.js — utilidades compartidas por data/, systems/ y ui/.

   Arquitectura: el juego se carga como SCRIPTS CLÁSICOS (no módulos ES) para
   que siga funcionando al abrir index.html directo desde el disco (file://),
   donde los módulos ES quedan bloqueados por CORS en la mayoría de los
   navegadores. Cada archivo declara funciones/constantes globales; el orden
   de carga está en index.html (core → data → systems → ui → main).
   Regla de oro del rework: el estado guardado (STATE) sólo contiene DATOS.
   Nada de funciones adentro de STATE — la lógica vive en los registros de
   data/ y se busca por id cuando hace falta (ver systems/events.js).
   ========================================================================= */

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function rnd(min,max){ return Math.random()*(max-min)+min; }
function rndInt(min,max){ return Math.floor(rnd(min,max+1)); }
function chance(p){ return Math.random() < p; }
function pick(arr){ return arr[rndInt(0,arr.length-1)]; }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j = rndInt(0,i); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}
function sample(arr, n){ return shuffle(arr).slice(0, n); }
function sum(arr, fn){ return arr.reduce((a,x)=>a+(fn?fn(x):x), 0); }
function avg(arr, fn){ return arr.length ? sum(arr, fn)/arr.length : 0; }
function cap(s){ s = String(s||''); return s.charAt(0).toUpperCase() + s.slice(1); }
function lerp(a,b,t){ return a + (b-a)*clamp(t,0,1); }

// Valor "tirable": número fijo, rango [min,max] o función (con contexto).
// Es la pieza que permite que los efectos sean DATOS serializables
// ({sanity:[-6,-2]}) en vez de closures que se pierden al guardar.
function roll(v, ctx){
  if(typeof v === 'function') return v(ctx);
  if(Array.isArray(v) && v.length === 2 && typeof v[0] === 'number') return rndInt(v[0], v[1]);
  return v;
}

// Sorteo ponderado clásico del juego: filtra por e.req() y usa e.w.
function weightedPick(list){
  const eligible = list.filter(e=> !e.req || e.req());
  if(!eligible.length) return null;
  const total = eligible.reduce((a,e)=>a+(e.w||0),0);
  let r = Math.random()*total;
  for(const e of eligible){ r -= (e.w||0); if(r<=0) return e; }
  return eligible[eligible.length-1];
}
// Sorteo ponderado genérico con función de peso (peso <= 0 = excluido).
function wpick(list, wfn){
  const ws = list.map(x=>Math.max(0, wfn ? wfn(x) : (x.w||0)));
  const total = ws.reduce((a,b)=>a+b,0);
  if(total <= 0) return null;
  let r = Math.random()*total;
  for(let i=0;i<list.length;i++){ r -= ws[i]; if(r<=0) return list[i]; }
  return list[list.length-1];
}

function fmtMoney(v){ return '£' + Math.round(v).toLocaleString('es-AR'); }
function fmtSigned(n){ return (n>0?'+':'') + n; }

// Escapa texto para meterlo en innerHTML (nombres escritos por el jugador).
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Género gramatical del personaje. genero '' (prefiero no decir) usa la forma
// neutra que se pase, o "o/a" armado a partir de la masculina.
function gx(m, f, n){
  const g = (typeof STATE !== 'undefined' && STATE && STATE.character) ? STATE.character.genero : '';
  if(g === 'Hombre') return m;
  if(g === 'Mujer') return f;
  return n !== undefined ? n : (m + '/' + f.slice(-1));
}
// Lo mismo para un NPC (gender 'm'|'f').
function ng(npc, m, f){ return npc && npc.gender === 'f' ? f : m; }

// Identificadores únicos persistentes (se guardan en STATE.nextId).
function uid(prefix){
  if(typeof STATE === 'undefined' || !STATE) return (prefix||'id') + '_' + Math.random().toString(36).slice(2,8);
  STATE.nextId = (STATE.nextId || 1) + 1;
  return (prefix||'id') + '_' + STATE.nextId;
}

// Copia profunda simple para datos JSON (sin funciones).
function clone(o){ return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

// Lista legible: "a, b y c".
function listEs(items){
  const a = items.filter(Boolean);
  if(a.length <= 1) return a.join('');
  return a.slice(0,-1).join(', ') + ' y ' + a[a.length-1];
}

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
