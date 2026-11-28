#!/usr/bin/env node
'use strict';

/**
 * Генератор портретов: 10 классов × 4 варианта, 40 SVG.
 * Стиль: docs/ASSET_STYLE.md. Только SVG, новых PNG нет.
 * Лицо крупное и центрированное; волосы и экипировка не заходят на центр лица.
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
  white: '#f3efe2', leafDark: '#2a5f2d', leafMid: '#3c7c36', leafLight: '#5a9c43'
};

const CLASSES = [
  { key: 'warrior', label: 'Воин', tint: C.wood, accent: C.metal, motif: 'helmet' },
  { key: 'mage', label: 'Маг', tint: C.blue, accent: C.violet, motif: 'hat' },
  { key: 'paladin', label: 'Паладин', tint: C.sandLight, accent: C.gold, motif: 'halo' },
  { key: 'angel', label: 'Ангел', tint: C.white, accent: C.gold, motif: 'wings' },
  { key: 'archer', label: 'Лучник', tint: C.leafDark, accent: C.wood, motif: 'hood' },
  { key: 'druid', label: 'Друид', tint: C.leafMid, accent: C.leafLight, motif: 'leaves' },
  { key: 'rogue', label: 'Разбойник', tint: C.dark, accent: C.metal, motif: 'cowl' },
  { key: 'amazon', label: 'Амазонка', tint: C.brick, accent: C.gold, motif: 'band' },
  { key: 'dwarf', label: 'Гном-кулига', tint: C.stone, accent: C.metal, motif: 'horns' },
  { key: 'dwarfmage', label: 'Гном-колдун', tint: C.violet, accent: C.ice, motif: 'crystal' }
];

const SKIN = [C.warm, C.sandLight, C.sand, C.warm];
const HAIR = [C.outline, C.wood, C.stoneLight, C.gold];
const ACCENT = [C.green, C.gold, C.blue, C.violet];

function shape(d, fill, sw = 3) {
  return `<path d="${d}" fill="${fill}" stroke="${C.outline}" stroke-width="${sw}" stroke-linejoin="miter"/>`;
}
function flat(d, fill) {
  return `<path d="${d}" fill="${fill}" stroke="none"/>`;
}
function oval(cx, cy, rx, ry, fill, sw = 3, id = '') {
  const attr = id ? ` id="${id}"` : '';
  return `<ellipse${attr} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${sw ? C.outline : 'none'}" stroke-width="${sw}"/>`;
}
function glint(cx, cy, rx, ry, fill) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="none"/>`;
}

function medallion(cls) {
  return `  <g id="medallion">
    ${oval(256, 256, 226, 226, C.stoneLight)}
    ${oval(256, 256, 204, 204, C.dark)}
    ${oval(256, 256, 190, 190, cls.tint, 0)}
    ${glint(176, 120, 48, 16, C.sandLight)}
    ${flat('M104 404 H408 V432 H104Z', C.outline)}
  </g>`;
}

function face(variant, cls) {
  const skin = SKIN[variant], accent = ACCENT[variant];
  const parts = [
    oval(160, 254, 18, 28, skin),
    oval(352, 254, 18, 28, skin),
    oval(256, 248, 96, 112, skin, 4, 'faceOval'),
    flat('M212 214 H236 V220 H212Z', C.outline),
    flat('M276 214 H300 V220 H276Z', C.outline),
    shape('M252 238 L246 284 H262', skin, 2),
    shape('M226 314 Q256 330 286 314', C.wood, 2),
    glint(208, 272, 15, 9, C.sandLight)
  ];
  if (variant === 1) parts.push(shape('M320 222 L304 300', C.brick, 2));
  if (variant === 2) parts.push(flat('M196 296 Q256 350 316 296 Q256 336 196 296Z', HAIR[variant]));
  if (variant === 3) parts.push(flat('M286 292 L302 292 L294 310Z', accent));
  if (cls.key === 'dwarf' || cls.key === 'dwarfmage') {
    parts.push(flat('M184 284 Q256 390 328 284 Q256 360 184 284Z', HAIR[variant]));
  }
  return `  <g id="face">${parts.join('\n')}</g>`;
}

// Волосы и головные уборы живут только выше y=176 или по бокам от x=176..336.
function hair(cls, variant) {
  const color = HAIR[variant], accent = ACCENT[variant];
  const side = `${flat('M132 186 Q148 156 176 152 L176 300 L148 290Z', color)}
    ${flat('M380 186 Q364 156 336 152 L336 300 L364 290Z', color)}`;
  const top = `${shape('M152 176 Q160 86 256 82 Q352 86 360 176 L336 162 Q256 116 176 162Z', color)}`;
  let motif = '';
  if (cls.motif === 'helmet') motif = `${shape('M168 168 Q256 92 344 168 L320 150 Q256 116 192 150Z', C.metal)}${flat('M244 82 L256 54 L268 82Z', C.red)}`;
  else if (cls.motif === 'hat') motif = `${shape('M196 166 L256 52 L316 166Z', C.violet)}${flat('M182 168 H330 V178 H182Z', accent)}`;
  else if (cls.motif === 'halo' || cls.motif === 'wings') motif = `${oval(256, 92, 74, 20, C.gold, 3)}${flat('M186 92 H326 V98 H186Z', C.outline)}`;
  else if (cls.motif === 'hood' || cls.motif === 'cowl') motif = `${shape('M158 174 Q166 88 256 78 Q346 88 354 174 L328 158 Q256 112 184 158Z', C.dark)}`;
  else if (cls.motif === 'leaves') motif = `${flat('M210 132 Q184 98 222 88 Q232 118 210 132Z', C.leafLight)}${flat('M302 132 Q328 98 290 88 Q280 118 302 132Z', C.leafMid)}`;
  else if (cls.motif === 'band') motif = `${flat('M172 162 Q256 126 340 162 L338 174 Q256 142 174 174Z', C.red)}${flat('M246 136 L256 116 L266 136Z', C.gold)}`;
  else if (cls.motif === 'horns') motif = `${shape('M176 158 Q138 130 126 88 Q168 106 194 144Z', C.sandLight)}${shape('M336 158 Q374 130 386 88 Q344 106 318 144Z', C.sandLight)}`;
  else if (cls.motif === 'crystal') motif = `${shape('M236 156 L256 82 L276 156Z', C.ice)}${shape('M256 82 L276 156 L236 156Z', C.violet, 2)}`;
  if (cls.motif === 'wings') return `  <g id="hair">${top}${motif}
    ${shape('M126 200 L52 164 L60 232 L124 258Z', C.white)}
    ${shape('M386 200 L460 164 L452 232 L388 258Z', C.white)}
    ${side}</g>`;
  return `  <g id="hair">${top}${motif}${side}${flat('M240 170 H272 V178 H240Z', accent)}</g>`;
}

// Экипировка ниже подбородка (y>=348) или за пределами лица (x<176 / x>336).
function gear(cls, variant) {
  const accent = ACCENT[variant];
  const shoulders = `${shape('M112 430 Q148 350 256 346 Q364 350 400 430 L400 470 H112Z', cls.tint)}
    ${flat('M126 428 H386 V444 H126Z', accent)}
    ${shape('M236 352 H276 V438 H236Z', C.sandLight, 2)}`;
  let prop = '';
  if (cls.motif === 'helmet' || cls.motif === 'horns') prop = `${shape('M390 356 L410 356 L410 462 L390 462Z', C.wood)}${shape('M370 350 H430 V364 H370Z', C.metal)}`;
  else if (cls.motif === 'hat' || cls.motif === 'crystal') prop = `${shape('M382 358 L394 358 L394 464 L382 464Z', C.wood)}${oval(388, 344, 20, 20, accent)}`;
  else if (cls.motif === 'halo') prop = `${shape('M340 372 L352 364 L386 436 L374 444Z', C.gold)}${shape('M362 400 H378 V416 H362Z', C.white, 2)}`;
  else if (cls.motif === 'wings') prop = `${shape('M120 372 L134 364 L166 436 L152 444Z', C.gold)}${flat('M132 402 H160 V414 H132Z', C.white)}`;
  else if (cls.motif === 'hood' || cls.motif === 'cowl' || cls.motif === 'band' || cls.motif === 'leaves') {
    prop = `${shape('M104 356 Q128 330 152 356 L160 460 L96 460Z', C.wood)}${shape('M392 356 Q416 330 440 356 L448 460 L384 460Z', C.wood)}`;
  }
  return `  <g id="gear">${shoulders}${prop}</g>`;
}

function status(cls, variant) {
  const accent = ACCENT[variant];
  return `  <g id="status">
    <path d="M256 442 L284 468 L256 494 L228 468Z" fill="${accent}" stroke="${C.outline}" stroke-width="3"/>
    ${glint(248, 460, 7, 4, C.white)}
  </g>`;
}

function portrait(cls, variant) {
  const v = Math.max(0, Math.min(3, Number(variant) || 0));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">
  <title>Портрет: ${cls.label}, вариант ${v}</title>
${medallion(cls)}
${face(v, cls)}
${hair(cls, v)}
${gear(cls, v)}
${status(cls, v)}
</svg>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const cls of CLASSES) {
    for (let variant = 0; variant < 4; variant++) {
      const file = path.join(OUT_DIR, cls.key + '_' + variant + '.svg');
      fs.writeFileSync(file, portrait(cls, variant), 'utf8');
      console.log('generated ' + path.relative(ROOT, file));
    }
  }
}

if (require.main === module) main();
module.exports = { portrait, CLASSES };
