'use strict';
/* =========================================================================
   ui/intro.js — crear una vida.
   Nombre y género se eligen; ciudad y clase las sortea el destino (como en
   la versión anterior); los rasgos se tiran con dos re-tiradas. Nuevo: la
   dificultad y el modo de historia (mundo libre, canon, línea alternativa).
   ========================================================================= */
function freshCreationData(){
  return {nombre:'', apellido:'', genero:'', ciudad:'', clase:'', rasgos:[], traitRerollsLeft:2, difficulty:'normal', world:'libre'};
}
var creationData = freshCreationData();
let creationStep = 0;

function renderIntro(){
  const el = byId('intro-content'); if(!el) return;
  const cd = creationData;
  const steps = ['Identidad','Origen','Personalidad','El mundo','Resumen'];
  const head = `<ol class="steps" aria-label="Pasos">${steps.map((s,i)=>`<li class="${i===creationStep?'cur':i<creationStep?'done':''}" ${i===creationStep?'aria-current="step"':''}>${esc(s)}</li>`).join('')}</ol>`;
  let body = '';
  if(creationStep === 0){
    const saved = hasSave();
    body = `
      ${saved ? `<div class="continue-box"><p>Hay una vida en curso guardada en este navegador.</p><div class="row">${btn('Continuar esa vida','intro-continue',{}, {cls:'btn-primary'})}</div></div>` : ''}
      <div class="field-row"><label for="f-nombre">Nombre</label><input id="f-nombre" autocomplete="off" value="${attr(cd.nombre)}" placeholder="Dejalo vacío y el destino elige"></div>
      <div class="field-row"><label for="f-apellido">Apellido</label><input id="f-apellido" autocomplete="off" value="${attr(cd.apellido)}" placeholder="Dejalo vacío y el destino elige"></div>
      <div class="field-row"><label for="f-genero">Género (opcional)</label>
        <select id="f-genero"><option value="" ${cd.genero===''?'selected':''}>Prefiero no decir</option><option value="Hombre" ${cd.genero==='Hombre'?'selected':''}>Hombre</option><option value="Mujer" ${cd.genero==='Mujer'?'selected':''}>Mujer</option></select></div>
      <p class="small-note">Tu vida empieza al nacer. No elegís edad, ni oficio, ni camino: se van haciendo.</p>
      <div class="intro-nav"><label class="btn btn-ghost file-btn">Importar partida<input type="file" accept="application/json,.json" data-change="intro-import" class="sr-only"></label>${btn('Siguiente →','intro-next',{},{cls:'btn-primary'})}</div>`;
  } else if(creationStep === 1){
    if(!cd.ciudad) cd.ciudad = CITIES_DATA[randomBirthCityKey()].name;
    if(!cd.clase) cd.clase = pick(CLASSES);
    const ck = cityKeyByName(cd.ciudad), city = CITIES_DATA[ck];
    body = `
      <div class="intro-summary-line"><span>Ciudad natal</span><span>${esc(cd.ciudad)}</span></div>
      <p class="small-note">${esc(city.desc || '')}</p>
      <div class="intro-summary-line"><span>Clase social de tu familia</span><span>${esc(cd.clase)}</span></div>
      <p class="small-note">No elegís dónde ni en qué familia nacés. Eso también lo decide el azar.</p>
      <div class="intro-nav">${btn('← Atrás','intro-back')}${btn('Siguiente →','intro-next',{},{cls:'btn-primary'})}</div>`;
  } else if(creationStep === 2){
    if(!cd.rasgos.length) cd.rasgos = rollRandomTraits(3);
    const cards = cd.rasgos.map(name=>{ const t = traitByName(name); if(!t) return ''; const rk = t.rarity.replace(/[^a-zA-Z]/g,'');
      return `<div class="trait-card rarity-${rk}"><div class="trait-card-top"><span class="trait-card-name">${esc(t.name)}</span><span class="trait-card-rarity">${esc(TRAIT_RARITIES[t.rarity].label)}</span></div><div class="trait-card-desc">${esc(t.desc)}</div><div class="trait-card-bonus">${esc(t.bonusText)}</div></div>`; }).join('');
    body = `
      <p class="small-note">El destino te asignó estos rasgos. Van a asomar de a poco, a medida que crezcas.</p>
      <div class="trait-roll-grid">${cards}</div>
      <div class="trait-reroll-row"><span class="small-note">${cd.traitRerollsLeft>0 ? `Te quedan ${cd.traitRerollsLeft} re-tirada${cd.traitRerollsLeft===1?'':'s'}.` : 'No quedan re-tiradas.'}</span>${btn('Volver a tirar','intro-reroll',{},{disabled:cd.traitRerollsLeft<=0})}</div>
      <div class="intro-nav">${btn('← Atrás','intro-back')}${btn('Siguiente →','intro-next',{},{cls:'btn-primary'})}</div>`;
  } else if(creationStep === 3){
    const diffs = Object.entries(DIFFICULTIES).map(([k,d])=>`<label class="opt-card ${cd.difficulty===k?'sel':''}"><input type="radio" name="f-diff" value="${k}" ${cd.difficulty===k?'checked':''} data-change="intro-diff"><span class="opt-title">${esc(d.label)}</span><span class="opt-desc">${esc(d.desc)}</span></label>`).join('');
    const worlds = Object.entries(WORLD_MODES).map(([k,d])=>`<label class="opt-card ${cd.world===k?'sel':''}"><input type="radio" name="f-world" value="${k}" ${cd.world===k?'checked':''} data-change="intro-world"><span class="opt-title">${esc(d.label)}</span><span class="opt-desc">${esc(d.desc)}</span></label>`).join('');
    body = `
      <fieldset class="opt-group"><legend>Dificultad</legend>${diffs}</fieldset>
      <fieldset class="opt-group"><legend>La historia del mundo</legend>${worlds}</fieldset>
      <div class="intro-nav">${btn('← Atrás','intro-back')}${btn('Siguiente →','intro-next',{},{cls:'btn-primary'})}</div>`;
  } else {
    body = `
      <div class="intro-summary-line"><span>Nombre</span><span>${esc(cd.nombre)} ${esc(cd.apellido)}</span></div>
      <div class="intro-summary-line"><span>Nace en</span><span>${esc(cd.ciudad)}</span></div>
      <div class="intro-summary-line"><span>Familia</span><span>Clase ${esc(cd.clase.toLowerCase())}</span></div>
      <div class="intro-summary-line"><span>Rasgos</span><span>${cd.rasgos.map(esc).join(', ')}</span></div>
      <div class="intro-summary-line"><span>Dificultad</span><span>${esc(DIFFICULTIES[cd.difficulty].label)}</span></div>
      <div class="intro-summary-line"><span>Historia</span><span>${esc(WORLD_MODES[cd.world].label)}</span></div>
      <p class="small-note">No sabés nada de Beyonders, vías ni pociones. Nadie que conozcas lo sabe. Por ahora.</p>
      <div class="intro-nav">${btn('← Atrás','intro-back')}${btn('Comenzar la vida','intro-start',{},{cls:'btn-primary'})}</div>`;
  }
  el.innerHTML = head + `<div class="step-label">Paso ${creationStep+1} · ${esc(steps[creationStep])}</div>` + body;
  const f = $('input:not([type=radio]):not([type=file]), .btn-primary', el); if(f && f.focus) f.focus();
}
function readIntroInputs(){
  if(creationStep !== 0) return;
  const cd = creationData;
  const n = byId('f-nombre'), a = byId('f-apellido'), g = byId('f-genero');
  if(g) cd.genero = g.value;
  cd.nombre = (n && n.value.trim()) || randomFirstNameForGender(cd.genero);
  cd.apellido = (a && a.value.trim()) || randomSurname();
}
onAct('intro-next', ()=>{ readIntroInputs(); creationStep = Math.min(4, creationStep+1); renderIntro(); });
onAct('intro-back', ()=>{ creationStep = Math.max(0, creationStep-1); renderIntro(); });
onAct('intro-reroll', ()=>{ if(creationData.traitRerollsLeft <= 0) return; creationData.traitRerollsLeft--; creationData.rasgos = rollRandomTraits(3); renderIntro(); });
onAct('intro-diff', (d, el)=>{ creationData.difficulty = el.value; renderIntro(); });
onAct('intro-world', (d, el)=>{ creationData.world = el.value; renderIntro(); });
onAct('intro-start', ()=>{
  if(hasSave()){ confirmModal('Empezar una vida nueva borra la que tenés guardada. ¿Seguro?', ()=>{ startNewGame(); }, {yes:'Empezar de nuevo', danger:true}); return; }
  startNewGame();
});
onAct('intro-continue', ()=>{ if(loadGame()){ showScreen(STATE.gameOver ? 'end' : 'game'); renderNow(); } else toast('No se pudo cargar la partida guardada.', 'neg'); });
onAct('intro-import', (d, el)=>{ const f = el.files && el.files[0]; if(f) importSave(f, ()=>{ showScreen(STATE.gameOver ? 'end' : 'game'); renderNow(); }); });
function newLifeFlow(){
  creationStep = 0; creationData = freshCreationData();
  showScreen('intro'); renderIntro();
}
