'use strict';
/* =========================================================================
   tests/ui-smoke.js — prueba de humo en un navegador real (Playwright).
   Abre index.html por file://, crea un personaje con el teclado y el mouse,
   juega varias décadas tocando botones reales (escenas, pestañas, acciones),
   guarda, recarga la página y sigue. Falla ante cualquier error de página o
   de consola. Saca capturas en escritorio y en móvil.
   Uso:  node tests/ui-smoke.js [--shots=carpeta] [--steps=N]
   ========================================================================= */
const path = require('path');
const fs = require('fs');
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const args = process.argv.slice(2);
const SHOTS = (args.find(a=>a.startsWith('--shots='))||'').split('=')[1] || null;
const STEPS = +((args.find(a=>a.startsWith('--steps='))||'').split('=')[1] || 260);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
if(SHOTS) fs.mkdirSync(SHOTS, {recursive:true});

async function run(viewport, label){
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport, deviceScaleFactor:1, isMobile: viewport.width < 600, hasTouch: viewport.width < 600});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: ' + e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.fulfill({status:200, contentType:'text/css', body:''}));
  await page.goto(URL);
  await page.waitForSelector('#intro-content .btn-primary');
  // Creación: nombre por teclado, el resto con clicks.
  await page.fill('#f-nombre', 'Audrey');
  await page.fill('#f-apellido', 'Hall');
  await page.selectOption('#f-genero', 'Mujer');
  for(let i=0;i<3;i++) await page.click('[data-act="intro-next"]');
  await page.check('input[name="f-world"][value="alternate"]');
  await page.click('[data-act="intro-next"]');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS, `${label}-01-resumen.png`)});
  await page.click('[data-act="intro-start"]');
  await page.waitForSelector('#screen-game:not(.hidden)');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS, `${label}-02-inicio.png`)});
  let shotAdult = false, shotMystic = false, reloaded = false;
  const stats = {scenes:0, tabs:0, actions:0, advances:0};
  // Espera a que se dibuje el cuadro pendiente (la UI renderiza en requestAnimationFrame).
  const settle = ()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  for(let step=0; step<STEPS; step++){
    await settle();
    const st = await page.evaluate(()=>({over:STATE.gameOver, blocked:timeBlocked(), age:STATE.character.edad, seal:!!document.querySelector('.seal-overlay'), modal:!!document.querySelector('.modal-overlay'), bey:!!STATE.pathway.chosenPathway}));
    if(st.over) break;
    if(st.seal){ await page.locator('[data-act="seal-dismiss"]').click(); continue; }
    if(st.modal){ if(await page.locator('[data-act="modal-confirm"]').count()) await page.locator('[data-act="modal-confirm"]').click(); else await page.locator('.modal-box [data-act="modal-close"]').first().click(); continue; }
    if(st.blocked){
      // Escena abierta: elegir con un click real (a veces con el teclado).
      const sel = '#content .choice-btn:not([disabled])';
      const n = await page.locator(sel).count();
      if(!n){ const dbg = await page.evaluate(()=>({tab:UI.tab, pe:STATE.pendingEvent && {kind:STATE.pendingEvent.kind, n:(STATE.pendingEvent.choices||[]).length}, pm:!!STATE.pendingMission, cb:!!STATE.combat, html:document.getElementById('content').innerHTML.slice(0,300)})); errors.push('escena sin opciones visibles: ' + JSON.stringify(dbg)); break; }
      if(step % 5 === 0) await page.keyboard.press('1'); else await page.locator(sel).nth(Math.floor(Math.random()*n)).click();
      stats.scenes++; continue;
    }
    if(!shotAdult && st.age >= 20 && SHOTS){ shotAdult = true; await page.screenshot({path:path.join(SHOTS, `${label}-03-adulto.png`), fullPage:false}); }
    const nav = viewport.width >= 1024 ? '#sidebar' : '#tabbar';
    // Recorrer pestañas y usar alguna acción disponible.
    if(step % 7 === 0){
      const tn = await page.locator(`${nav} [data-act="tab"]`).count();
      if(tn){ await page.locator(`${nav} [data-act="tab"]`).nth(Math.floor(Math.random()*tn)).click(); stats.tabs++; }
      const sn = await page.locator('#content [data-act="subtab"]').count();
      if(sn) await page.locator('#content [data-act="subtab"]').nth(Math.floor(Math.random()*sn)).click();
      const asel = '#content .action-btn:not([disabled]), #content [data-act="npc-open"], #content [data-act="inv-sel"], #content [data-act="lead-follow"]:not([disabled])';
      const an = await page.locator(asel).count();
      if(an){ await page.locator(asel).nth(Math.floor(Math.random()*an)).click(); stats.actions++; }
      if(st.bey && !shotMystic && SHOTS){ shotMystic = true; await page.locator(`${nav} [data-act="tab"][data-id="misticismo"]`).click().catch(()=>{}); await page.waitForTimeout(50); await page.screenshot({path:path.join(SHOTS, `${label}-04-misticismo.png`)}); }
      continue;
    }
    // Avanzar el tiempo desde la pestaña Vida.
    await page.locator(`${nav} [data-act="tab"][data-id="vida"]`).click();
    const advSel = step % 3 ? '[data-act="advance"][data-mode="important"]' : '[data-act="advance"][data-mode="season"]';
    if(await page.locator(advSel).count()){ await page.locator(advSel).click(); stats.advances++; }
    else await page.keyboard.press('i');
    // Una recarga completa a mitad de la vida.
    if(!reloaded && st.age >= 30){ reloaded = true; await page.reload(); await page.waitForSelector('#screen-game:not(.hidden), #screen-end:not(.hidden)'); }
  }
  const end = await page.evaluate(()=>({over:STATE.gameOver, age:STATE.character.edad, title:STATE.endingData && STATE.endingData.title, bey:STATE.pathway.chosenPathway, seq:STATE.pathway.sequence}));
  if(end.over){ await page.waitForSelector('#screen-end:not(.hidden)'); if(SHOTS) await page.screenshot({path:path.join(SHOTS, `${label}-05-biografia.png`), fullPage:true}); }
  else if(SHOTS){ await page.locator((viewport.width >= 1024 ? '#sidebar' : '#tabbar') + ' [data-act="tab"][data-id="diario"]').click(); await page.waitForTimeout(50); await page.screenshot({path:path.join(SHOTS, `${label}-05-diario.png`)}); }
  // Sin desbordes horizontales en móvil.
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth + 1);
  if(overflow) errors.push('hay scroll horizontal');
  await browser.close();
  return {label, errors, end, stats, reloaded};
}
// Una partida guardada por la versión anterior (v7) tiene que abrirse y jugarse.
async function runMigrated(){
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1280, height:800}});
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: ' + e.message));
  page.on('console', m=>{ if(m.type()==='error') errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.fulfill({status:200, contentType:'text/css', body:''}));
  const save = fs.readFileSync(path.join(__dirname, 'fixtures-v7-save.json'), 'utf8');
  await page.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lotm_life_sim_save_v1', s); sessionStorage.setItem('seeded','1'); } }, save);
  await page.goto(URL);
  await page.waitForSelector('#screen-game:not(.hidden)', {timeout:5000}).catch(()=>errors.push('la partida migrada no abrió la pantalla de juego'));
  const info = await page.evaluate(()=>({v:STATE.version, name:STATE.character.nombre, age:STATE.character.edad}));
  for(let i=0;i<30;i++){
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
    const blocked = await page.evaluate(()=>timeBlocked() || !!document.querySelector('.seal-overlay'));
    if(await page.locator('[data-act="seal-dismiss"]').count()){ await page.locator('[data-act="seal-dismiss"]').click(); continue; }
    if(blocked){ const n = await page.locator('#content .choice-btn:not([disabled])').count(); if(n) await page.locator('#content .choice-btn:not([disabled])').first().click(); continue; }
    if(await page.locator('[data-act="advance"][data-mode="season"]').count()) await page.locator('[data-act="advance"][data-mode="season"]').click();
  }
  await browser.close();
  return {label:'migrada', errors, end:info, stats:{scenes:0,tabs:0,actions:0,advances:30}, reloaded:false};
}
(async()=>{
  const results = [];
  results.push(await runMigrated());
  results.push(await run({width:1440, height:900}, 'escritorio'));
  results.push(await run({width:390, height:844}, 'movil'));
  let bad = 0;
  results.forEach(r=>{
    console.log(`${r.label}: ${JSON.stringify(r.end)} · escenas ${r.stats.scenes} · pestañas ${r.stats.tabs} · acciones ${r.stats.actions} · avances ${r.stats.advances} · recarga ${r.reloaded}`);
    if(r.errors.length){ bad++; console.log('  ERRORES:\n   ' + [...new Set(r.errors)].slice(0,15).join('\n   ')); }
  });
  if(bad) process.exitCode = 1; else console.log('Sin errores.');
})();
