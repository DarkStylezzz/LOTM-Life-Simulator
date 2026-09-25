'use strict';
/* =========================================================================
   main.js — arranque.
   Carga preferencias de la interfaz, instala los listeners (una sola vez),
   y retoma la partida guardada si existe; si no, abre la creación.
   ========================================================================= */
function boot(){
  loadUiPrefs();
  initDelegation();
  if(loadGame()){
    if(STATE.gameOver){ showScreen('end'); renderEnd(); }
    else { showScreen('game'); renderNow(); }
    return;
  }
  STATE = freshState();
  newLifeFlow();
}
// Al volver a la pestaña, guardar (por si el navegador la descarta).
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden' && STATE && STATE.started) saveGame(true); });
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
