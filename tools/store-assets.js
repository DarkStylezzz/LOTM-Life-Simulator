#!/usr/bin/env node
/* Genera el arte del juego: icono, miniatura, favicon y los iconos de pases y productos.
   Todo se dibuja acá como SVG y se exporta a PNG con Chromium (Playwright).
     node tools/store-assets.js   → escribe los PNG en assets/ (y assets/favicon.svg)
   Necesita Playwright con Chromium y curl (para bajar las fuentes del juego).
   Tamaños: icono 512×512, miniatura 1920×1080, pases y productos 512×512 (los de Roblox).
   Los pases son medallones redondos (la tienda los recorta en círculo);
   los productos, placas cuadradas con el dibujo dentro del círculo seguro. */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');
const C = {
  void:'#0a0a0c', panel:'#141217', violet:'#4d3a68', violetB:'#8a72c0', crimson:'#7d2331', crimsonB:'#c24a5d',
  gold:'#ad8a45', goldB:'#d9bb72', ink:'#ece7db', sanity:'#6f9a72'
};

// ---------------------------------------------------------------- piezas comunes
const DEFS = `
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f6e3a6"/><stop offset=".45" stop-color="${C.goldB}"/><stop offset="1" stop-color="#7a5b25"/>
  </linearGradient>
  <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f6e3a6"/><stop offset=".5" stop-color="${C.gold}"/><stop offset="1" stop-color="#5e4519"/>
  </linearGradient>
  <radialGradient id="bgPass" cx=".5" cy=".42" r=".62">
    <stop offset="0" stop-color="#3a2d55"/><stop offset=".6" stop-color="#1a1424"/><stop offset="1" stop-color="${C.void}"/>
  </radialGradient>
  <radialGradient id="bgProd" cx=".5" cy=".42" r=".66">
    <stop offset="0" stop-color="#4a1a27"/><stop offset=".6" stop-color="#1d0f15"/><stop offset="1" stop-color="${C.void}"/>
  </radialGradient>
  <radialGradient id="moon" cx=".42" cy=".38" r=".7">
    <stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="${C.crimsonB}"/><stop offset="1" stop-color="#5a1220"/>
  </radialGradient>
  <radialGradient id="glowC" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${C.crimsonB}" stop-opacity=".75"/><stop offset="1" stop-color="${C.crimsonB}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowV" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${C.violetB}" stop-opacity=".8"/><stop offset="1" stop-color="${C.violetB}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowG" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffe7a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowS" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#b8e0a8" stop-opacity=".7"/><stop offset="1" stop-color="#b8e0a8" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="violetGem" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#d9c8ff"/><stop offset=".5" stop-color="${C.violetB}"/><stop offset="1" stop-color="#2c1f45"/>
  </linearGradient>
  <linearGradient id="crimsonLiquid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff7a8c"/><stop offset=".5" stop-color="${C.crimsonB}"/><stop offset="1" stop-color="#4a0f1b"/>
  </linearGradient>
  <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#5a2433"/><stop offset="1" stop-color="#2a0f17"/>
  </linearGradient>
  <linearGradient id="parch" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#efe3c4"/><stop offset="1" stop-color="#c9b48a"/>
  </linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7a4d2a"/><stop offset="1" stop-color="#3a2213"/>
  </linearGradient>
  <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#5a5068"/><stop offset="1" stop-color="#1f1a27"/>
  </linearGradient>
  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#a6d39a"/><stop offset="1" stop-color="#4f7a4f"/>
  </linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".7"/>
  </filter>
  <filter id="fog" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".008 .03" numOctaves="4" seed="7"/>
    <feColorMatrix values="0 0 0 0 .78  0 0 0 0 .76  0 0 0 0 .8  0 0 0 1.6 -.55"/>
  </filter>`;

const star = (x, y, r, fill = C.goldB, o = 1) =>
  `<path d="M${x},${y - r} L${x + r * .22},${y - r * .22} L${x + r},${y} L${x + r * .22},${y + r * .22} L${x},${y + r} L${x - r * .22},${y + r * .22} L${x - r},${y} L${x - r * .22},${y - r * .22}Z" fill="${fill}" opacity="${o}"/>`;

// Medallón de pase: fondo violeta, doble aro dorado y cuatro remaches.
function passFrame(inner) {
  const studs = [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 256 256)"><path d="M256,14 l9,12 -9,12 -9,-12z" fill="url(#gold)"/></g>`).join('');
  const ticks = Array.from({length: 44}, (_, i) => `<line x1="256" y1="40" x2="256" y2="${i % 2 ? 46 : 50}" transform="rotate(${i * (360 / 44)} 256 256)" stroke="${C.gold}" stroke-width="2" opacity=".55"/>`).join('');
  return `<circle cx="256" cy="256" r="252" fill="url(#bgPass)"/>
    <circle cx="256" cy="256" r="244" fill="none" stroke="url(#goldH)" stroke-width="12"/>
    <circle cx="256" cy="256" r="230" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".7"/>
    ${ticks}${studs}
    <g>${inner}</g>`;
}

// Placa de producto: cuadrada, fondo carmesí, borde dorado con esquinas.
function prodFrame(inner) {
  const corner = `<path d="M30,92 V44 a14,14 0 0 1 14,-14 H92" fill="none" stroke="url(#gold)" stroke-width="6"/><circle cx="46" cy="46" r="6" fill="url(#gold)"/>`;
  const corners = [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 256 256)">${corner}</g>`).join('');
  return `<rect x="8" y="8" width="496" height="496" rx="48" fill="url(#bgProd)"/>
    <rect x="14" y="14" width="484" height="484" rx="44" fill="none" stroke="url(#goldH)" stroke-width="10"/>
    <rect x="44" y="44" width="424" height="424" rx="22" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".45"/>
    ${corners}
    <g>${inner}</g>`;
}

// ---------------------------------------------------------------- dibujos
function castle(x = 0, y = 0, s = 1, fill = 'url(#gold)', win = '#1a1424') {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path fill="${fill}" d="
      M-96,64 V-6 h10 v-10 h12 v10 h10 v-10 h12 v10 h10 V64Z
      M-90,-16 V-60 l26,-48 l26,48 V-16Z
      M42,64 V-6 h10 v-10 h12 v10 h10 v-10 h12 v10 h10 V64Z
      M38,-16 V-60 l26,-48 l26,48 V-16Z
      M-46,64 V-82 h8 v-12 h12 v12 h4 v-12 h12 v12 h4 v-12 h12 v12 h4 v-12 h12 v12 h8 V64Z
      M-40,-94 V-118 L0,-196 L40,-118 V-94Z
      M-62,64 V10 H62 V64Z"/>
    <path fill="${win}" d="M-16,64 V30 a16,16 0 0 1 32,0 V64Z
      M-6,-60 h12 v26 h-12z M-6,-130 h12 v20 h-12z
      M-74,10 h10 v20 h-10z M64,10 h10 v20 h-10z M-30,-40 h8 v18 h-8z M22,-40 h8 v18 h-8z"/>
    <circle cx="0" cy="-196" r="5" fill="#fff4cf"/>
  </g>`;
}

let fogN = 0;
function fogBand(y, h, w = 512, o = 1, id = 'fog') {
  const m = 'fogMask' + (++fogN), top = y - h * .4;
  return `<linearGradient id="${m}g" x1="0" y1="${top}" x2="0" y2="${top + h}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="${m}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${top + h * 2}"><rect x="0" y="${top}" width="${w}" height="${h * 2}" fill="url(#${m}g)"/></mask>
    <g opacity="${o}">
    <ellipse cx="${w * .22}" cy="${y}" rx="${w * .34}" ry="${h * .42}" fill="#8f8a94" filter="url(#softer)"/>
    <ellipse cx="${w * .72}" cy="${y + h * .1}" rx="${w * .38}" ry="${h * .45}" fill="#8a8590" filter="url(#softer)"/>
    <ellipse cx="${w * .5}" cy="${y + h * .35}" rx="${w * .6}" ry="${h * .5}" fill="#6f6a78" filter="url(#softer)"/>
    <rect x="0" y="${top}" width="${w}" height="${h * 1.4}" filter="url(#${id})" opacity=".85" mask="url(#${m})"/>
  </g>`;
}

// La marca: "Bit" en marfil y "Beyonder" en dorado, para que se lean las dos palabras.
function wordmark(x, y, size, anchor = 'middle') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Cinzel Decorative" font-weight="700" font-size="${size}" stroke="#120c16" stroke-width="${Math.round(size / 9)}" paint-order="stroke" filter="url(#shadow)"><tspan fill="${C.ink}">Bit</tspan><tspan fill="url(#gold)">Beyonder</tspan></text>`;
}

// Moneda de legado: dorada, con el escudo de la familia.
function legacyCoin(cx, cy, r) {
  return `<g>
    <circle cx="${cx}" cy="${cy + r * .1}" r="${r}" fill="#5e4519"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gold)" stroke="#6e5424" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r * .8}" fill="none" stroke="#7a5b25" stroke-width="2.5"/>
    <g transform="translate(${cx} ${cy}) scale(${r * .42})">
      <path d="M-1,-1.1 H1 V-.1 C1,.6 .45,1 0,1.25 C-.45,1 -1,.6 -1,-.1Z" fill="${C.crimson}" stroke="#6e5424" stroke-width=".1"/>
      <path d="M-.7,.45 L0,-.3 L.7,.45" fill="none" stroke="${C.goldB}" stroke-width=".24" stroke-linejoin="round"/>
    </g>
  </g>`;
}

// Moneda de canto, para las pilas.
function flatCoin(x, y, rx = 52) {
  return `<ellipse cx="${x}" cy="${y + 8}" rx="${rx}" ry="${rx * .32}" fill="#5e4519"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * .32}" fill="url(#goldH)" stroke="#6e5424" stroke-width="2"/>`;
}

// Cofre de madera con herrajes dorados. open: la tapa abierta hacia atrás.
function chest(open) {
  const lid = open
    ? `<path d="M150,236 L176,136 C196,114 316,114 336,136 L362,236Z" fill="#2a170c" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
       <path d="M170,226 L190,146 C206,130 306,130 322,146 L342,226Z" fill="#1a0e07"/>`
    : `<path d="M146,252 V214 C146,178 196,160 256,160 C316,160 366,178 366,214 V252Z" fill="url(#wood)" stroke="#2a170c" stroke-width="4"/>
       <path d="M182,252 V178 h16 V252Z M314,252 V178 h16 V252Z" fill="url(#goldH)"/>`;
  return `${lid}
    <rect x="146" y="248" width="220" height="142" rx="10" fill="url(#wood)" stroke="#2a170c" stroke-width="4"/>
    <path d="M182,248 h16 V390 h-16Z M314,248 h16 V390 h-16Z" fill="url(#goldH)"/>
    <rect x="140" y="240" width="232" height="16" rx="4" fill="url(#gold)" stroke="#5e4519" stroke-width="2"/>
    <rect x="140" y="378" width="232" height="14" rx="4" fill="url(#gold)" stroke="#5e4519" stroke-width="2"/>
    <rect x="232" y="252" width="48" height="58" rx="6" fill="url(#gold)" stroke="#5e4519" stroke-width="2"/>
    <circle cx="256" cy="274" r="7" fill="#1a0e07"/><path d="M252,276 h8 l3,18 h-14Z" fill="#1a0e07"/>`;
}

// Carta del destino (la Rueda de la Fortuna, el arcano X).
function fateCard(x = 0, y = 0, rot = 0, s = 1) {
  const spokes = Array.from({length: 8}, (_, i) => `<line x1="256" y1="196" x2="256" y2="152" stroke="url(#gold)" stroke-width="5" transform="rotate(${i * 45} 256 204)"/>`).join('');
  const knobs = Array.from({length: 8}, (_, i) => `<circle cx="256" cy="140" r="7" fill="url(#goldH)" transform="rotate(${i * 45 + 22.5} 256 204)"/>`).join('');
  return `<g transform="translate(${x} ${y}) rotate(${rot} 256 232) translate(256 232) scale(${s}) translate(-256 -232)">
    <rect x="176" y="104" width="160" height="256" rx="12" fill="#221b2c" stroke="url(#gold)" stroke-width="7"/>
    <rect x="190" y="118" width="132" height="228" rx="6" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".7"/>
    <circle cx="256" cy="204" r="62" fill="url(#glowV)"/>
    ${spokes}
    <circle cx="256" cy="204" r="56" fill="none" stroke="url(#gold)" stroke-width="7"/>
    ${knobs}
    <circle cx="256" cy="204" r="16" fill="url(#moon)" stroke="url(#gold)" stroke-width="4"/>
    <text x="256" y="312" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="40" fill="url(#gold)">X</text>
    <path d="M214,328 H298" stroke="${C.gold}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  </g>`;
}

function cardBack(rot) {
  return `<g transform="rotate(${rot} 256 430)">
    <rect x="186" y="118" width="140" height="224" rx="11" fill="#2c1d3e" stroke="url(#gold)" stroke-width="5"/>
    <rect x="198" y="130" width="116" height="200" rx="6" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".6"/>
    ${star(256, 230, 26, C.goldB, .9)}
  </g>`;
}

// Cinta carmesí con texto dorado ("×2", "+3") sobre el borde inferior del dibujo.
function banner(text, y = 348, w = 176) {
  const x0 = 256 - w / 2, x1 = 256 + w / 2;
  return `<g filter="url(#shadow)">
    <path d="M${x0 - 36},${y + 12} H${x0 + 6} V${y + 66} H${x0 - 36} L${x0 - 18},${y + 39}Z" fill="#4a0f1b" stroke="${C.gold}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x1 + 36},${y + 12} H${x1 - 6} V${y + 66} H${x1 + 36} L${x1 + 18},${y + 39}Z" fill="#4a0f1b" stroke="${C.gold}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x0}" y="${y}" width="${w}" height="66" rx="8" fill="${C.crimson}" stroke="url(#gold)" stroke-width="5"/>
    <text x="256" y="${y + 53}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="62" fill="url(#gold)" stroke="#2a0a12" stroke-width="3" paint-order="stroke">${text}</text>
  </g>`;
}

// Escudo de la familia con corona (Linaje, x2 Legado).
function crest() {
  return `<g filter="url(#shadow)">
      <path d="M180,128 L196,96 L218,118 L256,84 L294,118 L316,96 L332,128Z" fill="url(#gold)" stroke="#5e4519" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="196" cy="94" r="7" fill="${C.crimsonB}"/><circle cx="256" cy="82" r="8" fill="${C.crimsonB}"/><circle cx="316" cy="94" r="7" fill="${C.crimsonB}"/>
      <path d="M160,142 H352 V250 C352,330 300,378 256,402 C212,378 160,330 160,250Z" fill="${C.crimson}" stroke="url(#gold)" stroke-width="10" stroke-linejoin="round"/>
      <path d="M256,142 V398 M160,236 H352" stroke="#5a1220" stroke-width="4" opacity=".6"/>
      <path d="M176,296 L256,214 L336,296" fill="none" stroke="url(#gold)" stroke-width="22" stroke-linejoin="round"/>
      ${star(210, 180, 16)}${star(302, 180, 16)}${star(256, 330, 18)}
    </g>`;
}

// Pila de monedas de Loen con la moneda grande al frente.
function coins(cy = 200) {
  const coin = (x, y) => `<ellipse cx="${x}" cy="${y + 10}" rx="66" ry="21" fill="#5e4519"/><ellipse cx="${x}" cy="${y}" rx="66" ry="21" fill="url(#goldH)" stroke="#6e5424" stroke-width="2"/>`;
  return `<g filter="url(#shadow)">
      ${coin(170, cy + 128)}${coin(170, cy + 108)}${coin(170, cy + 88)}
      ${coin(342, cy + 132)}${coin(342, cy + 112)}
      <circle cx="264" cy="${cy + 8}" r="96" fill="#6e5424"/>
      <circle cx="256" cy="${cy}" r="96" fill="url(#gold)" stroke="#6e5424" stroke-width="3"/>
      <circle cx="256" cy="${cy}" r="78" fill="none" stroke="#7a5b25" stroke-width="3"/>
      <circle cx="256" cy="${cy}" r="70" fill="none" stroke="#fff3c9" stroke-width="1.5" opacity=".6" stroke-dasharray="3 6"/>
      <text x="256" y="${cy + 38}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="104" fill="#6e5424">£</text>
    </g>`;
}

// Los que tienen `id` son los pases y productos reales de BitBeyonder en Roblox y se exportan;
// los demás son diseños de repuesto para pases o productos futuros.
const ICONS = {
  // ---------- pases (medallón)
  'sefirah-castle': { kind: 'pass', id: 2001356476, name: 'Sefirah Castle', draw: () => passFrame(`
    <circle cx="256" cy="210" r="120" fill="url(#glowV)"/>
    ${star(150, 130, 10)}${star(372, 150, 8)}${star(330, 96, 6, '#fff')}${star(178, 196, 5, '#fff', .8)}
    <g filter="url(#shadow)">${castle(256, 300, .95)}</g>
    <clipPath id="cpPass"><circle cx="256" cy="256" r="228"/></clipPath>
    <g clip-path="url(#cpPass)">${fogBand(372, 120, 512, .95)}</g>`) },

  tarot: { kind: 'pass', name: 'Invitación al Tarot Club', draw: () => passFrame(`
    <circle cx="256" cy="256" r="150" fill="url(#glowC)" opacity=".6"/>
    <g transform="rotate(-14 256 300)" opacity=".85">
      <rect x="168" y="120" width="160" height="250" rx="12" fill="#1c1622" stroke="${C.gold}" stroke-width="4"/>
    </g>
    <g transform="rotate(8 256 300)" filter="url(#shadow)">
      <rect x="176" y="112" width="160" height="256" rx="12" fill="#221b2c" stroke="url(#gold)" stroke-width="7"/>
      <rect x="190" y="126" width="132" height="228" rx="6" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".7"/>
      <text x="256" y="168" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="34" fill="url(#gold)">0</text>
      <circle cx="256" cy="246" r="44" fill="url(#moon)"/>
      <path d="M220,246 Q256,214 292,246 Q256,278 220,246Z" fill="#1a0a10" opacity=".9"/>
      <circle cx="256" cy="246" r="12" fill="${C.goldB}"/><circle cx="256" cy="246" r="5" fill="#1a0a10"/>
      <path d="M212,312 H300 M224,326 H288" stroke="${C.gold}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    </g>
    ${star(150, 170, 12)}${star(372, 360, 10)}${star(366, 150, 6, '#fff')}`) },

  via: { kind: 'pass', name: 'Elegir tu vía', draw: () => {
    const rays = Array.from({length: 22}, (_, i) => {
      const long = i % 2 === 0;
      return `<path d="M256,${long ? 92 : 112} L263,190 L249,190Z" fill="${long ? 'url(#gold)' : C.gold}" opacity="${long ? 1 : .7}" transform="rotate(${i * 360 / 22} 256 256)"/>`;
    }).join('');
    return passFrame(`
      <circle cx="256" cy="256" r="130" fill="url(#glowV)" opacity=".7"/>
      <circle cx="256" cy="256" r="150" fill="none" stroke="${C.gold}" stroke-width="3" opacity=".8"/>
      <circle cx="256" cy="256" r="160" fill="none" stroke="${C.gold}" stroke-width="1.5" opacity=".5" stroke-dasharray="4 8"/>
      ${rays}
      <circle cx="256" cy="256" r="70" fill="#130f1a" stroke="url(#gold)" stroke-width="5"/>
      <g transform="rotate(38 256 256)" filter="url(#shadow)">
        <path d="M256,118 L276,256 L256,276 L236,256Z" fill="url(#moon)" stroke="#2a0a12" stroke-width="2"/>
        <path d="M256,394 L272,256 L256,240 L240,256Z" fill="url(#goldH)"/>
      </g>
      <circle cx="256" cy="256" r="18" fill="url(#violetGem)" stroke="url(#gold)" stroke-width="4"/>`);
  } },

  linaje: { kind: 'pass', name: 'Linaje', draw: () => passFrame(`
    <circle cx="256" cy="250" r="150" fill="url(#glowG)" opacity=".3"/>
    ${crest()}
    <path d="M150,380 C190,404 222,412 256,412 C290,412 322,404 362,380 L372,412 C330,438 292,444 256,444 C220,444 182,438 140,412Z" fill="url(#goldH)" stroke="#5e4519" stroke-width="3"/>`) },

  'x2-legado': { kind: 'pass', id: 1998638440, name: 'x2 Legado', draw: () => passFrame(`
    <circle cx="256" cy="236" r="150" fill="url(#glowG)" opacity=".35"/>
    <g transform="translate(0 -18)">${crest()}</g>
    ${banner('×2')}`) },

  'x2-dinero': { kind: 'pass', id: 1998890455, name: 'x2 Dinero', draw: () => passFrame(`
    <circle cx="256" cy="230" r="150" fill="url(#glowG)" opacity=".45"/>
    ${coins(196)}
    ${star(146, 150, 13, '#fff7d6')}${star(372, 132, 10, '#fff7d6')}${star(392, 236, 7, '#fff7d6')}
    ${banner('×2')}`) },

  'vidas-extra': { kind: 'pass', id: 1998422449, name: 'Vidas Extra', draw: () => passFrame(`
    <circle cx="256" cy="236" r="150" fill="url(#glowC)" opacity=".75"/>
    <g filter="url(#shadow)">
      <path d="M256,350 C196,310 136,262 136,204 C136,162 168,132 206,132 C230,132 248,144 256,162 C264,144 282,132 306,132 C344,132 376,162 376,204 C376,262 316,310 256,350Z" fill="url(#moon)" stroke="url(#gold)" stroke-width="10" stroke-linejoin="round"/>
      <path d="M256,322 C206,288 160,250 160,206 C160,176 182,156 206,156 C226,156 244,168 256,190 C268,168 286,156 306,156 C330,156 352,176 352,206 C352,250 306,288 256,322Z" fill="none" stroke="#ffd9a0" stroke-width="2" opacity=".55"/>
      <path d="M172,196 C174,174 188,160 208,158" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".5"/>
    </g>
    ${star(130, 140, 12)}${star(388, 128, 10)}${star(392, 300, 7, '#fff')}
    ${banner('+3')}`) },

  'choose-birth': { kind: 'pass', id: 1999868427, name: 'Choose Birth', draw: () => {
    // Un dado (re-tiradas) sobre el símbolo de infinito (ilimitadas).
    const pip = (x, y) => `<circle cx="${x}" cy="${y}" r=".1" fill="#4a0f1b"/>`;
    const face = (m, fill, inner) => `<g transform="matrix(${m})"><path d="M0,0 L1,0 L1,1 L0,1Z" fill="${fill}" stroke="#4a3510" stroke-width=".04" stroke-linejoin="round"/>${inner}</g>`;
    return passFrame(`
      <circle cx="256" cy="226" r="150" fill="url(#glowV)" opacity=".8"/>
      <g filter="url(#shadow)">
        ${face('114,-62,114,62,142,158', '#f6e3a6', star(.5, .5, .3, C.crimson))}
        ${face('114,62,0,130,142,158', '#c9a35a', pip(.28, .28) + pip(.72, .72))}
        ${face('114,-62,0,130,256,220', '#8a6a2c', pip(.25, .25) + pip(.5, .5) + pip(.75, .75))}
      </g>
      <path d="M256,402 C236,376 192,376 192,402 C192,428 236,428 256,402 C276,376 320,376 320,402 C320,428 276,428 256,402Z" fill="none" stroke="url(#goldH)" stroke-width="13" stroke-linejoin="round" filter="url(#shadow)"/>
      ${star(124, 230, 11)}${star(390, 214, 13)}${star(372, 108, 7, '#fff')}${star(142, 112, 6, '#fff')}`);
  } },

  diarios: { kind: 'pass', name: 'Partidas extra', draw: () => {
    const book = (x, y, rot, front) => `<g transform="translate(${x} ${y}) rotate(${rot})">
      <rect x="-80" y="-104" width="160" height="208" rx="10" fill="url(#leather)" stroke="url(#gold)" stroke-width="${front ? 6 : 4}"/>
      <rect x="-80" y="-104" width="22" height="208" rx="6" fill="#1d0a10" stroke="${C.gold}" stroke-width="2"/>
      ${front ? `<rect x="-46" y="-78" width="108" height="156" rx="4" fill="none" stroke="${C.gold}" stroke-width="2" opacity=".8"/>
        <path d="M-46,-62 l16,-16 M62,-62 l-16,-16 M-46,62 l16,16 M62,62 l-16,16" stroke="${C.goldB}" stroke-width="3"/>
        <circle cx="8" cy="0" r="34" fill="none" stroke="url(#gold)" stroke-width="4"/>
        <path d="M8,-20 V20 M-12,0 H28" stroke="url(#gold)" stroke-width="7" stroke-linecap="round"/>
        <path d="M44,104 v40 l10,-10 l10,10 v-40" fill="${C.crimsonB}"/>` : ''}
    </g>`;
    return passFrame(`
      <circle cx="256" cy="256" r="150" fill="url(#glowC)" opacity=".45"/>
      ${book(212, 250, -14, false)}${book(240, 246, -5, false)}
      <g filter="url(#shadow)">${book(272, 256, 5, true)}</g>`);
  } },

  'vision-del-beyonder': { kind: 'pass', id: 1998386450, name: 'Vision del Beyonder', draw: () => {
    const rays = Array.from({length: 16}, (_, i) => `<line x1="256" y1="98" x2="256" y2="${i % 2 ? 132 : 118}" stroke="url(#gold)" stroke-width="${i % 2 ? 4 : 6}" stroke-linecap="round" transform="rotate(${i * 22.5} 256 256)"/>`).join('');
    return passFrame(`
      <circle cx="256" cy="256" r="140" fill="url(#glowV)"/>
      ${rays}
      <g filter="url(#shadow)">
        <path d="M120,256 Q256,120 392,256 Q256,392 120,256Z" fill="#efe6d4" stroke="url(#gold)" stroke-width="9"/>
        <circle cx="256" cy="256" r="62" fill="url(#violetGem)"/>
        <circle cx="256" cy="256" r="62" fill="none" stroke="#2a1d40" stroke-width="4"/>
        <ellipse cx="256" cy="256" rx="14" ry="40" fill="#0d0912"/>
        <circle cx="232" cy="232" r="11" fill="#fff" opacity=".9"/>
      </g>`);
  } },

  // ---------- productos (placa)
  monedas: { kind: 'prod', name: 'Bolsa de libras', draw: () => {
    const coin = (x, y) => `<ellipse cx="${x}" cy="${y + 10}" rx="70" ry="22" fill="#5e4519"/><ellipse cx="${x}" cy="${y}" rx="70" ry="22" fill="url(#goldH)" stroke="#6e5424" stroke-width="2"/>`;
    return prodFrame(`
      <circle cx="256" cy="270" r="160" fill="url(#glowG)" opacity=".45"/>
      <g filter="url(#shadow)">
        ${coin(176, 372)}${coin(176, 352)}${coin(176, 332)}${coin(176, 312)}
        ${coin(336, 380)}${coin(336, 360)}
        <circle cx="270" cy="236" r="104" fill="#6e5424"/>
        <circle cx="262" cy="228" r="104" fill="url(#gold)" stroke="#6e5424" stroke-width="3"/>
        <circle cx="262" cy="228" r="84" fill="none" stroke="#7a5b25" stroke-width="3"/>
        <circle cx="262" cy="228" r="76" fill="none" stroke="#fff3c9" stroke-width="1.5" opacity=".6" stroke-dasharray="3 6"/>
        <text x="262" y="268" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="112" fill="#6e5424">£</text>
      </g>
      ${star(150, 170, 14, '#fff7d6')}${star(380, 150, 10, '#fff7d6')}`);
  } },

  pocion: { kind: 'prod', name: 'Poción', draw: () => prodFrame(`
    <circle cx="256" cy="300" r="150" fill="url(#glowC)"/>
    <g filter="url(#shadow)">
      <path d="M224,112 h64 v70 C356,206 384,256 384,300 A128,128 0 0 1 128,300 C128,256 156,206 224,182Z" fill="#1d1422" fill-opacity=".55" stroke="url(#gold)" stroke-width="8"/>
      <path d="M144,300 C176,282 214,300 256,290 C298,280 336,292 368,300 A112,112 0 0 1 144,300Z" fill="url(#crimsonLiquid)"/>
      <path d="M150,262 A110,110 0 0 0 150,320" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".4"/>
      <rect x="214" y="96" width="84" height="22" rx="6" fill="url(#goldH)"/>
      <rect x="226" y="62" width="60" height="40" rx="8" fill="#7a5235" stroke="#3b2414" stroke-width="3"/>
      <circle cx="232" cy="340" r="10" fill="#ffd3da" opacity=".7"/><circle cx="282" cy="360" r="7" fill="#ffd3da" opacity=".6"/>
      <circle cx="300" cy="324" r="5" fill="#ffd3da" opacity=".6"/><circle cx="256" cy="250" r="6" fill="#ffd3da" opacity=".35"/>
    </g>
    ${star(140, 160, 12)}${star(378, 182, 9)}`) },

  caracteristica: { kind: 'prod', name: 'Característica Beyonder', draw: () => prodFrame(`
    <circle cx="256" cy="256" r="170" fill="url(#glowV)"/>
    <circle cx="256" cy="256" r="110" fill="url(#glowC)" opacity=".6"/>
    <g filter="url(#shadow)">
      <path d="M256,92 L360,200 L256,420 L152,200Z" fill="url(#violetGem)" stroke="url(#gold)" stroke-width="7" stroke-linejoin="round"/>
      <path d="M152,200 H360 M256,92 L210,200 L256,420 L302,200Z" fill="none" stroke="#f0e6ff" stroke-width="3" opacity=".7" stroke-linejoin="round"/>
      <path d="M256,92 L210,200 H302Z" fill="#fff" opacity=".28"/>
      <path d="M256,200 L302,200 L256,420Z" fill="#1a0f2c" opacity=".35"/>
    </g>
    ${star(150, 120, 16, '#fff')}${star(372, 320, 12, '#e8dcff')}${star(360, 110, 8, C.goldB)}${star(150, 360, 8, C.goldB)}`) },

  'formula-via': { kind: 'prod', id: 3714719675, name: 'Formula Via', draw: () => prodFrame(`
    <circle cx="256" cy="256" r="160" fill="url(#glowG)" opacity=".3"/>
    <g filter="url(#shadow)" transform="rotate(-8 256 256)">
      <rect x="150" y="120" width="212" height="272" fill="url(#parch)"/>
      <path d="M150,120 h212 M150,392 h212" stroke="#8a6d3f" stroke-width="2"/>
      <rect x="128" y="96" width="256" height="34" rx="17" fill="url(#goldH)" stroke="#5e4519" stroke-width="2"/>
      <rect x="128" y="382" width="256" height="34" rx="17" fill="url(#goldH)" stroke="#5e4519" stroke-width="2"/>
      <circle cx="122" cy="113" r="12" fill="${C.crimson}"/><circle cx="390" cy="113" r="12" fill="${C.crimson}"/>
      <circle cx="122" cy="399" r="12" fill="${C.crimson}"/><circle cx="390" cy="399" r="12" fill="${C.crimson}"/>
      <g stroke="#5a3d22" stroke-width="5" stroke-linecap="round" opacity=".75">
        <path d="M178,160 H334 M178,184 H300"/>
        <path d="M178,336 H318 M178,360 H290"/>
      </g>
      <circle cx="256" cy="258" r="50" fill="none" stroke="${C.crimson}" stroke-width="5"/>
      <path d="M256,208 L299,283 H213Z" fill="none" stroke="${C.crimson}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="256" cy="258" r="9" fill="${C.crimson}"/>
    </g>`) },

  'vela-cordura': { kind: 'prod', name: 'Vela de cordura', draw: () => prodFrame(`
    <circle cx="256" cy="176" r="150" fill="url(#glowS)"/>
    <circle cx="256" cy="150" r="70" fill="url(#glowG)"/>
    <g filter="url(#shadow)">
      <path d="M256,88 C236,118 232,140 242,160 C248,172 264,172 270,160 C280,140 276,118 256,88Z" fill="#ffe7a0"/>
      <path d="M256,116 C248,132 246,144 250,154 C253,160 259,160 262,154 C266,144 264,132 256,116Z" fill="#fff"/>
      <line x1="256" y1="160" x2="256" y2="180" stroke="#2a1d10" stroke-width="4"/>
      <rect x="212" y="178" width="88" height="170" rx="6" fill="#efe3c4"/>
      <path d="M212,184 C226,200 230,186 238,206 C244,222 250,196 256,190 C262,184 268,214 276,200 C282,190 290,196 300,184" fill="#f8f0dc" stroke="none"/>
      <rect x="212" y="178" width="18" height="170" fill="#fff" opacity=".35"/>
      <path d="M150,352 H362 C362,392 320,410 256,410 C192,410 150,392 150,352Z" fill="url(#goldH)" stroke="#5e4519" stroke-width="3"/>
      <ellipse cx="256" cy="352" rx="106" ry="16" fill="url(#gold)"/>
      <path d="M362,370 C400,370 404,402 372,404" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round"/>
    </g>
    <g fill="${C.sanity}" opacity=".9">${star(146, 200, 12, '#b8e0a8')}${star(372, 240, 10, '#b8e0a8')}${star(360, 130, 7, '#fff')}</g>`) },

  reloj: { kind: 'prod', name: 'Segunda oportunidad', draw: () => {
    const ticks = Array.from({length: 12}, (_, i) => `<line x1="256" y1="${i % 3 ? 192 : 186}" x2="256" y2="${i % 3 ? 204 : 210}" stroke="#2a1d10" stroke-width="${i % 3 ? 4 : 7}" stroke-linecap="round" transform="rotate(${i * 30} 256 290)"/>`).join('');
    return prodFrame(`
      <circle cx="256" cy="290" r="160" fill="url(#glowV)" opacity=".7"/>
      <g filter="url(#shadow)">
        <path d="M256,150 C240,120 236,96 256,80 C276,96 272,120 256,150" fill="none" stroke="url(#gold)" stroke-width="8"/>
        <path d="M256,80 C300,70 340,70 380,96" fill="none" stroke="${C.gold}" stroke-width="5" stroke-dasharray="10 6" stroke-linecap="round"/>
        <rect x="236" y="146" width="40" height="30" rx="6" fill="url(#goldH)"/>
        <circle cx="256" cy="290" r="122" fill="url(#gold)" stroke="#5e4519" stroke-width="4"/>
        <circle cx="256" cy="290" r="104" fill="#f3ead6" stroke="#7a5b25" stroke-width="4"/>
        <circle cx="256" cy="290" r="88" fill="none" stroke="#c9b48a" stroke-width="2"/>
        ${ticks}
        <path d="M256,290 L256,222" stroke="#2a1d10" stroke-width="8" stroke-linecap="round"/>
        <path d="M256,290 L206,264" stroke="${C.crimson}" stroke-width="6" stroke-linecap="round"/>
        <path d="M300,330 A62,62 0 1 0 194,306" fill="none" stroke="${C.crimsonB}" stroke-width="5" opacity=".75"/>
        <path d="M186,292 L194,316 L212,300Z" fill="${C.crimsonB}" opacity=".85"/>
        <circle cx="256" cy="290" r="10" fill="url(#goldH)" stroke="#2a1d10" stroke-width="2"/>
      </g>`);
  } },

  ingrediente: { kind: 'prod', id: 3714719893, name: 'Ingrediente', draw: () => {
    const leaf = (x, y, rot, s = 1) => `<path d="M0,0 C16,-30 16,-64 0,-96 C-16,-64 -16,-30 0,0Z" fill="url(#leaf)" stroke="#2f4a2f" stroke-width="2" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
    const petals = Array.from({length: 6}, (_, i) => `<ellipse cx="0" cy="-22" rx="13" ry="24" fill="url(#violetGem)" stroke="#2c1f45" stroke-width="2" transform="rotate(${i * 60})"/>`).join('');
    return prodFrame(`
      <circle cx="256" cy="250" r="170" fill="url(#glowS)" opacity=".7"/>
      <circle cx="214" cy="178" r="90" fill="url(#glowV)"/>
      <g filter="url(#shadow)">
        <g transform="rotate(30 256 256)"><rect x="296" y="96" width="36" height="200" rx="18" fill="url(#wood)" stroke="#2a170c" stroke-width="3"/><rect x="296" y="120" width="36" height="12" fill="url(#goldH)"/></g>
        ${leaf(236, 300, -34)}${leaf(250, 300, -8, 1.15)}${leaf(276, 300, 22, .95)}${leaf(220, 304, -62, .8)}
        <line x1="236" y1="300" x2="214" y2="192" stroke="#4f7a4f" stroke-width="6" stroke-linecap="round"/>
        <g transform="translate(212 182)">${petals}<circle r="14" fill="url(#gold)" stroke="#6e5424" stroke-width="2"/><circle r="5" fill="#2a0a12"/></g>
        <path d="M150,292 H362 C362,366 318,410 256,410 C194,410 150,366 150,292Z" fill="url(#stone)" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
        <ellipse cx="256" cy="292" rx="106" ry="20" fill="#1a1522" stroke="url(#gold)" stroke-width="5"/>
        <path d="M166,320 C176,360 206,386 240,394" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".18"/>
        <path d="M206,404 H306 L318,424 H194Z" fill="url(#goldH)" stroke="#5e4519" stroke-width="2"/>
      </g>
      ${star(130, 150, 12, '#e8dcff')}${star(386, 176, 10)}${star(372, 110, 7, '#fff')}`);
  } },

  'tirada-del-destino': { kind: 'prod', id: 3714719525, name: 'Tirada del destino', draw: () => prodFrame(`
    <circle cx="256" cy="236" r="170" fill="url(#glowV)" opacity=".8"/>
    <g filter="url(#shadow)">${fateCard(0, 8, -6)}</g>
    ${star(128, 150, 14, '#fff')}${star(390, 130, 11)}${star(384, 360, 9, '#e8dcff')}${star(132, 352, 8)}`) },

  '11-tiradas-del-destino': { kind: 'prod', id: 3714719587, name: '11 Tiradas del destino', draw: () => prodFrame(`
    <circle cx="256" cy="226" r="180" fill="url(#glowV)" opacity=".9"/>
    <g transform="translate(0 -22)">
      ${cardBack(-30)}${cardBack(30)}${cardBack(-15)}${cardBack(15)}
      <g filter="url(#shadow)">${fateCard(0, 10, 0, .92)}</g>
    </g>
    ${star(118, 120, 12, '#fff')}${star(398, 116, 12)}
    ${banner('×11')}`) },

  'punado-de-legado': { kind: 'prod', id: 3714719380, name: 'Puñado de Legado', draw: () => prodFrame(`
    <circle cx="256" cy="290" r="150" fill="url(#glowG)" opacity=".45"/>
    <g filter="url(#shadow)">
      ${flatCoin(196, 380)}${flatCoin(316, 382)}${flatCoin(256, 392)}
      ${flatCoin(226, 360)}${flatCoin(292, 362)}${flatCoin(258, 342)}
      ${legacyCoin(212, 290, 50)}
      ${legacyCoin(292, 256, 70)}
    </g>
    ${star(150, 196, 12, '#fff7d6')}${star(384, 190, 10, '#fff7d6')}${star(372, 120, 7, '#fff')}`) },

  'cofre-de-legado': { kind: 'prod', id: 3714719415, name: 'Cofre de Legado', draw: () => prodFrame(`
    <circle cx="256" cy="250" r="180" fill="url(#glowG)" opacity=".5"/>
    <ellipse cx="256" cy="248" rx="150" ry="22" fill="#ffe7a0" opacity=".55" filter="url(#soft)"/>
    <g filter="url(#shadow)">${chest(false)}</g>
    <rect x="150" y="244" width="212" height="4" fill="#fff4cf" opacity=".9"/>
    <g filter="url(#shadow)">${flatCoin(146, 404, 40)}${legacyCoin(118, 360, 34)}${flatCoin(378, 408, 36)}</g>
    ${star(132, 160, 12, '#fff7d6')}${star(386, 150, 10, '#fff7d6')}${star(366, 104, 7, '#fff')}`) },

  'tesoro-de-legado': { kind: 'prod', id: 3714719482, name: 'Tesoro de Legado', draw: () => prodFrame(`
    <circle cx="256" cy="214" r="200" fill="url(#glowG)" opacity=".75"/>
    <circle cx="256" cy="190" r="110" fill="url(#glowG)"/>
    <g filter="url(#shadow)">${chest(true).split('<rect x="146"')[0]}</g>
    <g filter="url(#shadow)">
      ${flatCoin(196, 226)}${flatCoin(316, 228)}${flatCoin(256, 214)}${flatCoin(226, 200)}${flatCoin(290, 198)}
      ${legacyCoin(206, 186, 40)}${legacyCoin(306, 178, 46)}
      <path d="M250,152 L274,176 L250,214 L226,176Z" fill="url(#violetGem)" stroke="url(#gold)" stroke-width="3"/>
      <circle cx="356" cy="214" r="16" fill="url(#moon)" stroke="url(#gold)" stroke-width="3"/>
    </g>
    <g filter="url(#shadow)">${'<rect x="146"' + chest(true).split('<rect x="146"')[1]}</g>
    <g filter="url(#shadow)">${flatCoin(126, 410, 36)}${legacyCoin(392, 366, 34)}${flatCoin(400, 412, 32)}</g>
    ${star(118, 120, 14, '#fff7d6')}${star(400, 110, 13, '#fff7d6')}${star(256, 84, 10, '#fff')}${star(150, 300, 8, '#fff')}`) },

  'pack-de-inicio': { kind: 'prod', id: 3714719209, name: 'Pack de inicio', draw: () => prodFrame(`
    <circle cx="256" cy="250" r="170" fill="url(#glowG)" opacity=".4"/>
    <g filter="url(#shadow)">
      <path d="M190,214 C190,112 322,112 322,214" fill="none" stroke="#3a1520" stroke-width="18"/>
      <path d="M190,214 C190,112 322,112 322,214" fill="none" stroke="${C.gold}" stroke-width="2" stroke-dasharray="7 6"/>
      <g transform="rotate(-12 206 200)">
        <rect x="196" y="120" width="22" height="30" rx="5" fill="#7a5235" stroke="#3b2414" stroke-width="2"/>
        <rect x="190" y="146" width="34" height="12" rx="4" fill="url(#goldH)"/>
        <path d="M194,158 h26 v14 C246,184 252,206 252,226 H162 C162,206 168,184 194,172Z" fill="url(#crimsonLiquid)" stroke="url(#gold)" stroke-width="4"/>
      </g>
      <g transform="rotate(10 312 190)">
        <rect x="292" y="132" width="40" height="110" fill="url(#parch)" stroke="#8a6d3f" stroke-width="2"/>
        <rect x="286" y="124" width="52" height="14" rx="7" fill="url(#goldH)"/>
        <circle cx="312" cy="176" r="10" fill="${C.crimson}"/>
      </g>
      <rect x="140" y="204" width="232" height="198" rx="30" fill="url(#leather)" stroke="#1d0a10" stroke-width="4"/>
      <path d="M140,236 C140,216 156,204 176,204 H336 C356,204 372,216 372,236 V292 C372,312 356,326 336,326 H176 C156,326 140,312 140,292Z" fill="#3a1520" stroke="#1d0a10" stroke-width="3"/>
      <path d="M152,238 C152,224 164,216 178,216 H334 C348,216 360,224 360,238 V290 C360,304 348,314 334,314 H178 C164,314 152,304 152,290Z" fill="none" stroke="${C.gold}" stroke-width="2" stroke-dasharray="7 6"/>
      <rect x="244" y="300" width="24" height="64" rx="4" fill="#3a1520" stroke="#1d0a10" stroke-width="2"/>
      <rect x="230" y="306" width="52" height="44" rx="7" fill="none" stroke="url(#gold)" stroke-width="7"/>
      ${flatCoin(372, 404, 36)}${legacyCoin(392, 360, 30)}
    </g>
    ${star(120, 170, 12, '#fff7d6')}${star(398, 150, 10, '#fff7d6')}${star(128, 380, 8, '#fff')}`) },
};

// ---------------------------------------------------------------- icono del juego (512)
// Sin texto para la página web; con la marca BitBeyonder para Roblox.
function gameIcon({ brand = false } = {}) {
  const up = brand ? 34 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${DEFS}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0a14"/><stop offset=".55" stop-color="#2a1830"/><stop offset="1" stop-color="#3a2a40"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/>
  ${star(70, 70, 8, '#fff', .9)}${star(450, 60, 6, '#fff', .8)}${star(420, 200, 5, '#fff', .7)}${star(96, 220, 4, '#fff', .7)}
  <g transform="translate(0 ${-up})">
    <circle cx="256" cy="196" r="190" fill="url(#glowC)" opacity=".7"/>
    <circle cx="256" cy="196" r="140" fill="url(#moon)"/>
    <circle cx="214" cy="160" r="22" fill="#5a1220" opacity=".25"/><circle cx="304" cy="226" r="30" fill="#5a1220" opacity=".22"/><circle cx="296" cy="140" r="12" fill="#5a1220" opacity=".25"/>
    ${castle(256, 330, 1.12, '#0c0910', '#e8b866')}
  </g>
  ${fogBand(410 - up, 170, 512, 1)}
  ${brand ? wordmark(256, 466, 50) : ''}
  <rect x="6" y="6" width="500" height="500" fill="none" stroke="url(#goldH)" stroke-width="6" opacity=".9"/>
</svg>`;
}

// Favicon: el mismo motivo, simplificado para 16–32 px.
function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><radialGradient id="m" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="${C.crimsonB}"/><stop offset="1" stop-color="#5a1220"/></radialGradient></defs>
  <rect width="64" height="64" rx="12" fill="${C.void}"/>
  <circle cx="32" cy="26" r="20" fill="url(#m)"/>
  <path fill="#0c0910" d="M14,52 V36 h4 v-6 l3,-6 l3,6 v6 h2 V22 l6,-12 l6,12 v14 h2 v-6 l3,-6 l3,6 v6 h4 V52Z"/>
  <rect x="4" y="46" width="56" height="14" rx="6" fill="#8f8a94" opacity=".9"/>
  <rect x="1.5" y="1.5" width="61" height="61" rx="11" fill="none" stroke="${C.goldB}" stroke-width="3"/>
</svg>`;
}

// ---------------------------------------------------------------- miniatura de Roblox (1920×1080)
function thumbnail() {
  const W = 1920, H = 1080;
  // Backlund: tejados, chimeneas y una torre del reloj.
  const city = `<path transform="translate(0 130)" fill="#0b0810" d="M0,${H} V880 h60 v-40 h18 v-30 h12 v30 h40 v-70 l40,-40 l40,40 v60 h50 v-90 h14 v-24 h10 v24 h30 v120 h40 v-150 l30,-30 l30,30 v40 h50 v-60 h16 v-40 h20 v40 h20 v90
    h60 v-120 h70 v-30 h10 v-60 l24,-60 l24,60 v60 h10 v30 h70 v140 h40 v-80 l50,-50 l50,50 v50 h60 v-30 h16 v-22 h12 v22 h40 v70
    h50 v-110 h30 v-40 h12 v40 h30 v80 h70 v-50 l40,-40 l40,40 v80 h60 v-140 h20 v-30 h30 v30 h20 v140 h50 v-90 l36,-36 l36,36 v50 h60 v-30 h16 v-22 h12 v22 h46 v60 h40 v-60 h40 v-30 h14 v30 h120 V${H}Z"/>`;
  const windows = [[150, 900], [176, 930], [340, 860], [520, 900], [700, 820], [726, 860], [760, 790], [930, 900], [1110, 870], [1140, 900], [1300, 850], [1520, 860], [1546, 900], [1720, 920]]
    .map(([x, y]) => `<rect x="${x}" y="${y + 130}" width="10" height="16" fill="#e8b866" opacity=".85"/>`).join('');
  const lamps = [620, 1000, 1380, 1760].map(x => `<g><circle cx="${x}" cy="960" r="60" fill="url(#glowG)" opacity=".55"/><rect x="${x - 3}" y="966" width="6" height="${H - 966}" fill="#0b0810"/><path d="M${x - 12},946 h24 l-4,22 h-16z" fill="#ffe7a0"/><path d="M${x - 16},946 h32 l-16,-14z" fill="#0b0810"/></g>`).join('');
  // Chips medidos a ojo para Cinzel 600 de 26 px (versalitas): ~16,5 px por letra.
  const chips = ['Beyonder Pathways', 'Potions & Rituals', 'Sefirah Castle'];
  let cx = 150;
  const chipSvg = chips.map(t => { const w = Math.round(t.length * 16.5) + 56; const s = `<g><rect x="${cx}" y="652" width="${w}" height="56" rx="28" fill="#141217" fill-opacity=".85" stroke="${C.gold}" stroke-width="2"/><text x="${cx + w / 2}" y="689" text-anchor="middle" font-family="Cinzel" font-weight="600" font-size="26" fill="${C.goldB}">${t.replace('&', '&amp;')}</text></g>`; cx += w + 18; return s; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${DEFS}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07060b"/><stop offset=".6" stop-color="#211528"/><stop offset="1" stop-color="#3a2636"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07060b" stop-opacity=".85"/><stop offset=".55" stop-color="#07060b" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${[[120, 90, 8], [420, 160, 5], [880, 70, 6], [1820, 120, 7], [1700, 340, 5], [960, 260, 4], [60, 420, 4]].map(([x, y, r]) => star(x, y, r, '#fff', .85)).join('')}
  <circle cx="1390" cy="380" r="420" fill="url(#glowC)" opacity=".6"/>
  <circle cx="1390" cy="380" r="300" fill="url(#moon)"/>
  <circle cx="1300" cy="300" r="46" fill="#5a1220" opacity=".22"/><circle cx="1480" cy="450" r="64" fill="#5a1220" opacity=".2"/><circle cx="1470" cy="270" r="24" fill="#5a1220" opacity=".24"/>
  <g filter="url(#shadow)">${castle(1390, 520, 1.9, '#0c0910', '#e8b866')}</g>
  <g transform="translate(0 0)">${fogBand(700, 260, W, .95)}</g>
  ${city}${windows}${lamps}
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  ${wordmark(146, 420, 116, 'start')}
  <path d="M154,478 H500 M640,478 H986" stroke="${C.gold}" stroke-width="2"/>
  ${star(570, 478, 16)}
  <text x="570" y="552" text-anchor="middle" font-family="Cinzel" font-weight="600" font-size="52" letter-spacing="12" fill="${C.ink}">LIFE SIMULATOR</text>
  <text x="152" y="618" font-family="Crimson Text" font-style="italic" font-size="38" fill="${C.ink}" opacity=".92">Be born. Grow up. Uncover the hidden world. Choose the price.</text>
  ${chipSvg}
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="url(#goldH)" stroke-width="6" opacity=".8"/>
</svg>`;
}

// ---------------------------------------------------------------- exportar
function iconSvg(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${DEFS}</defs>${ICONS[id].draw()}</svg>`;
}

// Las fuentes del juego (Cinzel, Crimson Text) se bajan con curl y se incrustan, así Chromium
// no necesita salir a internet y respeta el proxy y los certificados del sistema.
function fontCss() {
  if (fontCss.css) return fontCss.css;
  const { execFileSync } = require('child_process');
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  const url = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cinzel+Decorative:wght@700&family=Crimson+Text:ital@1&display=block';
  let css = execFileSync('curl', ['-sSf', '-A', UA, url]).toString();
  css = css.replace(/url\((https:[^)]+)\)/g, (_, u) => `url(data:font/woff2;base64,${execFileSync('curl', ['-sSf', u]).toString('base64')})`);
  return (fontCss.css = css);
}

async function render(svg, w, h, file, transparent) {
  const { chromium } = require('playwright');
  const browser = render.browser || (render.browser = await chromium.launch());
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><html><head><style>${fontCss()}
    html,body{margin:0;background:${transparent ? 'transparent' : C.void}}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => Promise.all(['600 40px Cinzel', '700 40px Cinzel', '700 40px "Cinzel Decorative"', 'italic 400 40px "Crimson Text"'].map(f => document.fonts.load(f))));
  await page.screenshot({ path: file, omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}

async function main() {
  const rbx = path.join(OUT, 'roblox');
  const dirs = { pass: path.join(rbx, 'pases'), prod: path.join(rbx, 'productos') };
  [OUT, rbx, ...Object.values(dirs)].forEach(d => fs.mkdirSync(d, { recursive: true }));
  // Página web: favicon, icono para el celular e icono sin texto.
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), favicon());
  const jobs = [
    [favicon(), 180, 180, path.join(OUT, 'apple-touch-icon'), false],
    [gameIcon(), 512, 512, path.join(OUT, 'icon'), false],
    // Roblox: icono y miniatura de BitBeyonder, y un icono por cada pase o producto real.
    [gameIcon({ brand: true }), 512, 512, path.join(rbx, 'icon'), false],
    [thumbnail(), 1920, 1080, path.join(rbx, 'thumbnail'), false]
  ];
  for (const [key, icon] of Object.entries(ICONS)) {
    if (icon.id) jobs.push([iconSvg(key), 512, 512, path.join(dirs[icon.kind], key), true]);
  }
  for (const [svg, w, h, base, transparent] of jobs) {
    await render(svg, w, h, base + '.png', transparent);
    console.log('✓', path.relative(path.join(__dirname, '..'), base + '.png'));
  }
  if (render.browser) await render.browser.close();
}

module.exports = { ICONS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
