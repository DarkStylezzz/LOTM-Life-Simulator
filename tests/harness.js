'use strict';
/* =========================================================================
   Harness headless para el juego: carga los <script src> de index.html, en
   el mismo orden que el navegador, dentro de un contexto vm de Node con un
   DOM mínimo simulado. Sirve para correr vidas completas sin navegador
   (ver simulate.js) y detectar errores de ejecución, bloqueos y balance.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeElement(tag, id){
  const el = {
    tagName: (tag||'div').toUpperCase(), id: id||'', _html:'', textContent:'', value:'',
    className:'', dataset:{}, style:{ setProperty(){} , removeProperty(){} },
    children:[], parentNode:null, offsetHeight:0, scrollTop:0, scrollHeight:0, clientHeight:0,
    disabled:false, hidden:false, attributes:{},
    get innerHTML(){ return this._html; }, set innerHTML(v){ this._html = String(v); },
    get outerHTML(){ return this._html; },
    classList:{ _s:new Set(),
      add(...c){ c.forEach(x=>this._s.add(x)); }, remove(...c){ c.forEach(x=>this._s.delete(x)); },
      contains(c){ return this._s.has(c); }, toggle(c, force){ const on = force===undefined ? !this._s.has(c) : !!force; if(on) this._s.add(c); else this._s.delete(c); return on; } },
    appendChild(ch){ this.children.push(ch); ch.parentNode = this; return ch; },
    insertBefore(ch){ this.children.unshift(ch); ch.parentNode = this; return ch; },
    removeChild(ch){ this.children = this.children.filter(c=>c!==ch); ch.parentNode=null; return ch; },
    remove(){ if(this.parentNode) this.parentNode.removeChild(this); },
    // Dentro de un elemento se devuelve un stub (así el código que hace
    // overlay.querySelector('#btn').onclick = ... no explota en Node).
    querySelector(){ return makeElement('div'); }, querySelectorAll(){ return []; },
    closest(){ return null; }, matches(){ return false; },
    addEventListener(){}, removeEventListener(){},
    setAttribute(k,v){ this.attributes[k]=String(v); }, getAttribute(k){ return this.attributes[k] ?? null; },
    removeAttribute(k){ delete this.attributes[k]; }, hasAttribute(k){ return k in this.attributes; },
    focus(){}, blur(){}, click(){}, scrollIntoView(){}, scrollTo(){},
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
  };
  return el;
}

function makeDocument(){
  const byId = new Map();
  const doc = {
    readyState:'complete',
    body: makeElement('body'), documentElement: makeElement('html'), head: makeElement('head'),
    activeElement:null,
    getElementById(id){ if(!byId.has(id)) byId.set(id, makeElement('div', id)); return byId.get(id); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(tag){ return makeElement(tag); },
    createTextNode(t){ return {textContent:t}; },
    addEventListener(){}, removeEventListener(){},
  };
  return doc;
}

function makeStorage(){
  const m = new Map();
  return {
    getItem(k){ return m.has(k) ? m.get(k) : null; },
    setItem(k,v){ m.set(k, String(v)); },
    removeItem(k){ m.delete(k); },
    clear(){ m.clear(); },
    get length(){ return m.size; },
    key(i){ return [...m.keys()][i] ?? null; },
    _map:m
  };
}

function scriptList(){
  const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const re = /<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g;
  const out = []; let m;
  while((m = re.exec(html))) out.push(m[1]);
  return out;
}

// Crea un "navegador" nuevo: contexto vm con DOM simulado y todos los scripts
// del juego ya evaluados. Devuelve el contexto (sus globales son las del juego).
function loadGame(opts={}){
  const listeners = {};
  const document = makeDocument();
  const localStorage = opts.storage || makeStorage();
  const window = {
    addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(){}, scrollTo(){}, scrollY:0, innerWidth:1280, innerHeight:800,
    matchMedia(){ return {matches:false, addEventListener(){}, removeEventListener(){}}; },
    requestAnimationFrame(fn){ fn(); return 0; }, cancelAnimationFrame(){},
    getComputedStyle(){ return {getPropertyValue(){ return ''; }}; },
  };
  const ctx = {
    console, Math, JSON, Date, Object, Array, String, Number, Boolean, RegExp, Map, Set, WeakMap, Error, TypeError, Promise,
    parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, Symbol, Intl,
    setTimeout:(fn)=>{ if(opts.runTimers) fn(); return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    document, window, localStorage, navigator:{userAgent:'node'},
    Blob: function(){}, URL:{createObjectURL(){ return 'blob:'; }, revokeObjectURL(){}},
    FileReader: function(){ this.readAsText=()=>{}; },
    requestAnimationFrame:(fn)=>{ fn(); return 0; }, cancelAnimationFrame(){},
    matchMedia: window.matchMedia, getComputedStyle: window.getComputedStyle,
    HTMLElement: function(){}, Element: function(){}, Node: function(){}, Event: function(t){ this.type=t; },
    KeyboardEvent: function(){}, CustomEvent: function(t){ this.type=t; },
    alert(){}, confirm(){ return true; }, prompt(){ return ''; },
  };
  ctx.window.document = document; ctx.window.localStorage = localStorage;
  ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  if(opts.prelude) new vm.Script(opts.prelude, {filename:'prelude'}).runInContext(ctx);
  for(const src of (opts.scripts || scriptList())){
    const file = path.join(ROOT, src);
    const code = fs.readFileSync(file,'utf8');
    try{
      new vm.Script(code, {filename: src}).runInContext(ctx);
    }catch(e){
      e.message = `[${src}] ` + e.message;
      throw e;
    }
  }
  if(opts.postlude) new vm.Script(opts.postlude, {filename:'postlude'}).runInContext(ctx);
  ctx.__listeners = listeners;
  if(opts.boot !== false){
    (listeners['DOMContentLoaded']||[]).forEach(fn=>fn());
    (listeners['load']||[]).forEach(fn=>fn());
  }
  return ctx;
}

// Evalúa una expresión dentro del contexto del juego (acceso a let/const globales).
function run(ctx, code){ return vm.runInContext(code, ctx); }

module.exports = { loadGame, run, makeStorage, scriptList, ROOT };
