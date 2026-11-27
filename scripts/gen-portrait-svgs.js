#!/usr/bin/env node
'use strict';

/**
 * Генератор портретов в медальонах: воин / паладин / маг, варианты _0.._3.
 * Стиль: docs/ASSET_STYLE.md. Только SVG, новых PNG нет.
 * Запуск: node scripts/gen-portrait-svgs.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'sprites', 'portraits');

const C = {
  outline: '#241a14', dark: '#2a1c12', wood: '#6b4426', stone: '#6b5742',
  stoneLight: '#8f7a5f', sand: '#a08a6c', sandLight: '#c9b391', warm: '#b39b78',
  brick: '#9a4028', red: '#b93a2b', blue: '#3b6ea5', ice: '#93c5fd',
  green: '#4f8a44', violet: '#6d3b8f', gold: '#e8c14a', metal: '#8a8f98',
  white: '#f3efe2',
};

const SKIN = [C.warm, C.sandLight, C.sand, C.warm];
const HAIR = [C.outline, C.wood, C.stoneLight, C.gold];
const STATUS = [C.green, C.gold, C.blue, C.violet];
const TINT = { warrior: '#6b4426', paladin: '#8f7a5f', mage: '#3b6ea5' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function shape(d, fill, sw = 3) {
  return `<path d="${d}" fill="${fill}" stroke="${C.outline}" stroke-width="${sw}" stroke-linejoin="miter"/>`;
}
function flat(d, fill) {
  return `<path d="${d}" fill="${fill}" stroke="none"/>`;
}
function oval(cx, cy, rx, ry, fill, sw = 3) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${C.outline}" stroke-width="${sw}"/>`;
}
function glint(cx, cy, rx, ry, fill) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="none"/>`;
}

function medallion(cls) {
  return `  <g id="medallion">
    ${oval(256, 256, 224, 224, C.stoneLight)}
    ${oval(256, 256, 202, 202, C.dark)}
    <circle cx="256" cy="256" r="188" fill="${TINT[cls]}" stroke="none"/>
    ${glint(178, 124, 52, 18, C.sandLight)}
    ${flat('M104 404 H408 V430 H104Z', C.outline)}
  </g>`;
}

function face(variant) {
  const skin = SKIN[variant];
  const parts = [
    oval(174, 254, 20, 30, skin),
    oval(338, 254, 20, 30, skin),
    oval(256, 250, 88, 104, skin),
    flat('M214 216 H236 V222 H214Z', C.outline),
    flat('M276 216 H298 V222 H276Z', C.outline),
    shape('M252 244 L246 288 H262', skin, 2),
    shape('M228 316 Q256 332 284 316', C.wood, 2),
    glint(216, 274, 16, 10, C.sandLight),
  ];
  if (variant === 1) parts.push(shape('M318 216 L300 300', C.brick, 2));
  if (variant === 2) {
    parts.push(flat('M196 298 Q256 372 316 298 Q256 344 196 298Z', HAIR[variant]));
    parts.push(shape('M212 300 Q256 344 300 300', C.dark, 2));
  }
  return `  <g id="face">${parts.join('\n')}</g>`;
}

function hair(cls, variant) {
  const color = HAIR[variant];
  if (cls === 'warrior') {
    return `  <g id="hair">${flat('M168 214 Q176 118 256 118 Q336 118 344 214 L320 176 H192Z', color)}</g>`;
  }
  if (cls === 'paladin') {
    return `  <g id="hair">${flat('M158 244 Q166 112 256 108 Q346 112 354 244 L320 170 H192Z', color)}
    ${flat('M172 184 Q256 132 340 184 L328 206 Q256 166 184 206Z', C.sandLight)}</g>`;
  }
  return `  <g id="hair">${flat('M172 224 Q182 128 256 124 Q330 128 340 224 L314 178 H198Z', color)}
    ${flat('M206 174 H306 L256 242Z', C.violet)}</g>`;
}

function gear(cls, variant) {
  const accent = STATUS[variant];
  if (cls === 'warrior') {
    return `  <g id="gear">
      ${shape('M170 190 Q180 102 256 100 Q332 102 342 190 L312 166 H200Z', C.metal)}
      ${flat('M188 172 H324 L318 190 H194Z', C.stone)}
      ${shape('M250 108 H262 V200 H250Z', C.gold, 2)}
      ${shape('M350 214 L374 236 L318 348 L300 328Z', C.metal)}
      ${shape('M296 330 L320 352 L312 368 L288 346Z', C.wood, 2)}
      ${shape('M116 258 H176 V352 H116Z', C.stoneLight)}
      ${flat('M124 266 H168 V292 H124Z', accent)}
      ${glint(192, 146, 20, 8, C.white)}
    </g>`;
  }
  if (cls === 'paladin') {
    return `  <g id="gear">
      ${shape('M126 344 Q156 286 256 286 Q356 286 386 344 L386 402 H126Z', C.white)}
      ${flat('M142 348 H370 V366 H142Z', C.gold)}
      ${shape('M188 178 H324 V198 H188Z', C.gold, 2)}
      <path d="M256 180 L268 196 L256 214 L244 196Z" fill="${accent}" stroke="${C.outline}" stroke-width="2"/>
      ${shape('M248 300 H264 V356 H248Z', C.gold, 2)}
      ${shape('M226 318 H286 V332 H226Z', C.gold, 2)}
      ${glint(178, 356, 22, 8, C.sandLight)}
    </g>`;
  }
  return `  <g id="gear">
    ${shape('M164 176 L256 56 L348 176Z', C.violet)}
    ${flat('M140 178 H372 V198 H140Z', C.dark)}
    ${flat('M162 182 H350 V190 H162Z', accent)}
    ${shape('M368 206 L384 214 L318 380 L304 372Z', C.wood, 2)}
    ${oval(378, 198, 22, 22, accent)}
    ${shape('M128 346 Q160 300 210 300 L210 360 H128Z', C.dark, 2)}
    ${glint(232, 106, 16, 8, C.ice)}
  </g>`;
}

function status(cls, variant) {
  return `  <g id="status">
    <path d="M256 402 L286 428 L256 454 L226 428Z" fill="${STATUS[variant]}" stroke="${C.outline}" stroke-width="3"/>
    ${glint(248, 422, 7, 4, C.white)}
  </g>`;
}

function portrait(cls, variant) {
  const label = { warrior: 'Воин', paladin: 'Паладин', mage: 'Маг' }[cls];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">
  <title>Портрет: ${label}, вариант ${variant}</title>
${medallion(cls)}
${face(variant)}
${hair(cls, variant)}
${gear(cls, variant)}
${status(cls, variant)}
</svg>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const cls of ['warrior', 'paladin', 'mage']) {
    for (let variant = 0; variant < 4; variant++) {
      const file = path.join(OUT_DIR, cls + '_' + variant + '.svg');
      fs.writeFileSync(file, portrait(cls, variant), 'utf8');
      console.log('generated ' + path.relative(ROOT, file));
    }
  }
}

if (require.main === module) main();
module.exports = { portrait };
