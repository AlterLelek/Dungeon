#!/usr/bin/env node
'use strict';

/**
 * Генератор фасадов зданий из единой базы-коробки и слоёв.
 * Источник данных — assets/buildings-batch.json (named shop_kind/sign_text/floors).
 * Выход — SVG в shared/assets/master/buildings/; новых PNG нет.
 * Стиль: docs/ASSET_STYLE.md. Запуск: node scripts/gen-building-svgs.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BATCH_FILE = path.join(ROOT, 'assets', 'buildings-batch.json');
const OUT_DIR = path.join(ROOT, 'shared', 'assets', 'master', 'buildings');

const C = {
  outline: '#241a14', dark: '#2a1c12', wood: '#6b4426', stone: '#6b5742',
  stoneLight: '#8f7a5f', plaster: '#a08a6c', plasterLight: '#c9b391',
  warm: '#b39b78', leaf: '#5a9c43', leafLight: '#8ac25c',
  tile: '#9a4028', tileLight: '#c25c30', tileGlint: '#e0823c',
  red: '#b93a2b', blue: '#3b6ea5', ice: '#93c5fd', green: '#4f8a44',
  violet: '#6d3b8f', gold: '#e8c14a', metal: '#8a8f98', white: '#f3efe2',
  glass: '#2f4a52', glassLight: '#4f7b84', glassGlint: '#8fc0c4',
};

const MATERIALS = {
  straw: { wall: '#c9b391', wallShade: '#a08a6c', roof: '#c9a25a', roofDark: '#8a6a36', roofGlint: '#e3c47a', roofStyle: 'straw' },
  tile: { wall: '#a08a6c', wallShade: '#7a6650', roof: '#9a4028', roofDark: '#7a2f1e', roofGlint: '#e0823c', roofStyle: 'tile' },
  stone: { wall: '#8f7a5f', wallShade: '#6b5742', roof: '#6b5742', roofDark: '#4a3a2e', roofGlint: '#b39b78', roofStyle: 'stone' },
  brick: { wall: '#a08a6c', wallShade: '#7a6650', roof: '#9a4028', roofDark: '#6b2b1c', roofGlint: '#c25c30', roofStyle: 'tile' },
  wood: { wall: '#8f7a5f', wallShade: '#6b4426', roof: '#6b4426', roofDark: '#4a2e18', roofGlint: '#a9743f', roofStyle: 'wood' },
  mute: { wall: '#6b5742', wallShade: '#4a3a2e', roof: '#4a3a2e', roofDark: '#2a1c12', roofGlint: '#8f7a5f', roofStyle: 'stone' },
};

const BUILDING_STYLE = {
  house_straw_0: { wall: 'straw', roof: 'straw', icon: 'house', floors: 1 },
  house_tile_0: { wall: 'tile', roof: 'tile', icon: 'house', floors: 1 },
  stone_house_0: { wall: 'stone', roof: 'stone', icon: 'house', floors: 1 },
  barn_0: { wall: 'wood', roof: 'wood', icon: 'sheaf', floors: 1 },
  well_0: { wall: 'mute', roof: 'mute', icon: 'bucket', floors: 1, special: 'well' },
  forge_0: { wall: 'stone', roof: 'brick', icon: 'anvil', floors: 1 },
  shop_0: { wall: 'plaster', roof: 'tile', icon: 'coin_sack', floors: 1 },
  tavern_0: { wall: 'plaster', roof: 'tile', icon: 'mug', floors: 2 },
  shed_0: { wall: 'wood', roof: 'wood', icon: 'rake', floors: 1 },
  stable_0: { wall: 'wood', roof: 'straw', icon: 'horseshoe', floors: 1 },
  armory_0: { wall: 'stone', roof: 'tile', icon: 'sword', floors: 1 },
  jewelry_0: { wall: 'plaster', roof: 'brick', icon: 'gem', floors: 1 },
  magic_0: { wall: 'stone', roof: 'violet', icon: 'potion_star', floors: 1 },
  inn_0: { wall: 'plaster', roof: 'tile', icon: 'bed', floors: 2 },
  church_0: { wall: 'plaster', roof: 'violet', icon: 'gem', floors: 1 },
  hall_0: { wall: 'stone', roof: 'tile', icon: 'house', floors: 1 },
};
// separate roof palette for the magic shop (the wall palette stays neutral)
MATERIALS.violet = { wall: C.stone, wallShade: C.stoneLight, roof: C.violet, roofDark: '#4a235e', roofGlint: '#a879c7', roofStyle: 'tile' };
MATERIALS.plaster = { wall: C.plaster, wallShade: C.stone, roof: C.tile, roofDark: '#7a2f1e', roofGlint: C.tileGlint, roofStyle: 'tile' };

// Знак вывески определяется ТОЛЬКО shop_kind из assets/buildings-batch.json.
// Для декоративных построек (shop_kind === null) знак берётся из id здания.
const ICON_BY_SHOP_KIND = {
  forge: 'anvil', weapons: 'sword', armory: 'sword', armor: 'sword',
  magic: 'potion_star', tavern: 'mug', inn: 'bed',
  market: 'coin_sack', jeweler: 'gem', church: 'gem', hall: 'house',
};
const ICON_BY_ID = {
  house_straw_0: 'house', house_tile_0: 'house', stone_house_0: 'house',
  barn_0: 'sheaf', shed_0: 'rake', stable_0: 'horseshoe', well_0: 'bucket',
};
function iconFor(entry, stem) {
  for (const kind of (entry.shop_kind || [])) {
    if (ICON_BY_SHOP_KIND[kind]) return ICON_BY_SHOP_KIND[kind];
  }
  return ICON_BY_ID[stem] || null;
}
function checkedIcon(entry) {
  const icon = iconFor(entry, path.basename(entry.path, '.svg'));
  if (!icon || icon !== entry.sign_icon) {
    throw new Error('Знак вывески не соответствует shop_kind/id: ' + entry.path +
      ' · shop_kind=' + JSON.stringify(entry.shop_kind) + ' · sign_icon=' + entry.sign_icon);
  }
  return icon;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function rect(x, y, w, h, fill, sw = 3) {
  return `<path d="M${x} ${y} H${x + w} V${y + h} H${x}Z" fill="${fill}" stroke="${C.outline}" stroke-width="${sw}" stroke-linejoin="miter" stroke-linecap="square"/>`;
}
function flat(x, y, w, h, fill) {
  return `<path d="M${x} ${y} H${x + w} V${y + h} H${x}Z" fill="${fill}" stroke="none"/>`;
}
function line(x1, y1, x2, y2, sw = 2, color = C.outline) {
  return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square"/>`;
}
function oval(cx, cy, rx, ry, fill, sw = 2) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${C.outline}" stroke-width="${sw}"/>`;
}

function roofLayer(baseY, apexY, mat) {
  const m = MATERIALS[mat];
  let tiles = '';
  if (m.roofStyle === 'straw') {
    for (let x = 48; x < 464; x += 18) {
      tiles += line(x, baseY - 4, x + 12, baseY - 26, 3, m.roofGlint);
    }
  } else if (m.roofStyle === 'stone') {
    for (let y = apexY + 12; y < baseY; y += 16) {
      const inset = Math.round((y - apexY) * 1.05);
      for (let x = 56 + inset; x < 456 - inset; x += 30) {
        tiles += flat(x, y, 26, 11, m.roofDark);
        tiles += flat(x + 2, y + 2, 9, 3, m.roofGlint);
      }
    }
  } else if (m.roofStyle === 'wood') {
    for (let y = apexY + 14; y < baseY; y += 18) {
      const inset = Math.round((y - apexY) * 1.05);
      tiles += flat(56 + inset, y, 400 - inset * 2, 7, m.roofDark);
      tiles += flat(60 + inset, y + 2, 26, 3, m.roofGlint);
    }
  } else {
    for (let y = apexY + 10; y < baseY; y += 14) {
      const inset = Math.round((y - apexY) * 1.02);
      for (let x = 56 + inset; x < 456 - inset; x += 26) {
        tiles += flat(x, y, 22, 9, (Math.floor(y / 14) % 2 ? m.roofDark : m.roof));
        tiles += flat(x + 2, y + 2, 8, 3, m.roofGlint);
      }
    }
  }
  return `  <g id="roof">
    <defs><clipPath id="roofClip"><path d="M56 ${baseY} L256 ${apexY} L456 ${baseY}Z"/></clipPath></defs>
    <path d="M56 ${baseY} L256 ${apexY} L456 ${baseY}Z" fill="${m.roof}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    <g clip-path="url(#roofClip)">${tiles}</g>
    <path d="M56 ${baseY} L256 ${apexY} L456 ${baseY}Z" fill="none" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    ${rect(48, baseY - 8, 416, 8, m.roofDark, 3)}
  </g>`;
}

function windowUnit(x, y, w, h) {
  return [
    rect(x, y, w, h, C.stoneLight, 3),
    rect(x + 4, y + 4, w - 8, h - 8, C.wood, 2),
    rect(x + 9, y + 9, w - 18, h - 18, C.glass, 3),
    flat(x + 12, y + 12, w / 2 - 16, 16, C.glassLight),
    flat(x + w / 2 + 4, y + 12, w / 2 - 16, 16, C.glassLight),
    `<ellipse cx="${x + w / 2 - 12}" cy="${y + 18}" rx="9" ry="6" fill="${C.glassGlint}" stroke="none"/>`,
    rect(x + w / 2 - 3, y + 9, 6, h - 18, C.wood, 2),
    rect(x + 9, y + h / 2 - 3, w - 18, 6, C.wood, 2),
    rect(x - 4, y + h, w + 8, 9, C.stoneLight, 2),
  ].join('\n');
}

function doorUnit(y, h) {
  const x = 206, w = 100;
  let planks = '';
  for (let i = 0; i < 5; i++) {
    const px = x + 7 + i * 18;
    planks += rect(px, y + 8, 16, h - 16, i % 2 ? C.wood : '#8a5a32', 2);
    planks += flat(px + 3, y + 12, 4, h - 24, C.warm);
  }
  return [
    rect(x - 8, y - 6, w + 16, h + 6, C.stoneLight, 3),
    `<path d="M${x} ${y} H${x + w} V${y + h} H${x}Z" fill="${C.dark}" stroke="${C.outline}" stroke-width="3"/>`,
    planks,
    rect(x + 4, y + 40, w - 8, 8, C.metal, 2),
    rect(x + 4, y + h - 54, w - 8, 8, C.metal, 2),
    oval(x + w - 18, y + h / 2, 7, 7, C.gold, 2),
    rect(x - 14, y + h, w + 28, 10, C.stoneLight, 2),
  ].join('\n');
}

const ICONS = {
  anvil: `<path d="M8 22 H70 V30 H52 V40 H60 V50 H20 V40 H28 V30 H8Z" fill="${C.metal}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <ellipse cx="38" cy="16" rx="24" ry="7" fill="${C.white}" stroke="${C.outline}" stroke-width="3"/>
    <path d="M60 2 L78 10 L72 20 L54 12Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>`,
  sword: `<path d="M52 2 L72 10 L38 48 L28 38Z" fill="${C.white}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M14 32 L44 62 L34 70 L6 42Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M26 28 L50 52" fill="none" stroke="${C.outline}" stroke-width="5" stroke-linecap="square"/>
    <ellipse cx="53" cy="14" rx="4" ry="12" fill="${C.ice}" stroke="${C.outline}" stroke-width="2"/>`,
  potion_star: `<path d="M30 4 H48 V22 L58 38 V58 H20 V38 L30 22Z" fill="${C.ice}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M24 36 H54 V56 H24Z" fill="${C.blue}" stroke="none"/>
    <path d="M62 2 L67 14 L79 19 L67 24 L62 36 L57 24 L45 19 L57 14Z" fill="${C.gold}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    <ellipse cx="34" cy="44" rx="5" ry="9" fill="${C.white}" stroke="none"/>`,
  mug: `<path d="M12 12 H56 V56 H12Z" fill="${C.gold}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M56 20 H68 V46 H56" fill="none" stroke="${C.outline}" stroke-width="6" stroke-linejoin="miter"/>
    <path d="M8 10 H60 V20 H8Z" fill="${C.white}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <ellipse cx="26" cy="38" rx="7" ry="11" fill="${C.warm}" stroke="none"/>`,
  sheaf: `<path d="M40 60 V10 M22 58 L58 12 M58 58 L22 12" fill="none" stroke="${C.wood}" stroke-width="5" stroke-linecap="square"/>
    <ellipse cx="40" cy="10" rx="7" ry="12" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="22" cy="14" rx="6" ry="11" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="58" cy="14" rx="6" ry="11" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="31" cy="24" rx="6" ry="10" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="49" cy="24" rx="6" ry="10" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <path d="M18 52 H62 V58 H18Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="3"/>`,
  bucket: `<path d="M14 20 L22 58 H58 L66 20Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M12 18 H68" fill="none" stroke="${C.outline}" stroke-width="5" stroke-linecap="square"/>
    <path d="M20 30 Q40 6 60 30" fill="none" stroke="${C.metal}" stroke-width="4"/>
    <path d="M16 38 H64 V44 H16Z" fill="${C.metal}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="31" cy="50" rx="5" ry="4" fill="${C.warm}" stroke="none"/>`,
  house: `<path d="M8 30 L40 8 L72 30Z" fill="${C.tile}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M16 30 H64 V60 H16Z" fill="${C.plasterLight}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M34 42 H48 V60 H34Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="25" cy="40" rx="5" ry="4" fill="${C.glassGlint}" stroke="none"/>`,
  coin_sack: `<path d="M26 18 Q40 4 54 18 L68 58 H12Z" fill="${C.warm}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M24 16 H56 V24 H24Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="40" cy="42" rx="11" ry="11" fill="${C.gold}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="28" cy="50" rx="4" ry="3" fill="${C.white}" stroke="none"/>`,
  gem: `<path d="M22 10 H58 L74 30 L40 62 L6 30Z" fill="${C.ice}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M22 10 L40 30 L58 10 M6 30 H74 M40 30 V62" fill="none" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="29" cy="20" rx="5" ry="4" fill="${C.white}" stroke="none"/>`,
  bed: `<path d="M8 38 H72 V58 H8Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M8 24 H20 V44 H8Z" fill="${C.stoneLight}" stroke="${C.outline}" stroke-width="3"/>
    <path d="M20 36 H72 V46 H20Z" fill="${C.white}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="50" cy="30" rx="10" ry="5" fill="${C.violet}" stroke="${C.outline}" stroke-width="2"/>`,
  rake: `<path d="M40 4 V44" fill="none" stroke="${C.wood}" stroke-width="6" stroke-linecap="square"/>
    <path d="M14 44 H66" fill="none" stroke="${C.outline}" stroke-width="6" stroke-linecap="square"/>
    <path d="M18 44 V60 M32 44 V60 M46 44 V60 M60 44 V60" fill="none" stroke="${C.metal}" stroke-width="5" stroke-linecap="square"/>
    <ellipse cx="43" cy="16" rx="4" ry="8" fill="${C.warm}" stroke="none"/>`,
  horseshoe: `<path d="M20 14 V36 Q20 58 40 58 Q60 58 60 36 V14 H48 V34 Q48 46 40 46 Q32 46 32 34 V14Z" fill="${C.metal}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    <ellipse cx="26" cy="18" rx="4" ry="3" fill="${C.white}" stroke="none"/>`,
};

// Вывеска: знак слева, тип лавки сверху, имя из кавычек снизу.
// Геометрия считается от longest line: доска растёт, а шрифт ужимается,
// если строка не влезает в максимально допустимую ширину viewBox.
const SIGN = Object.freeze({
  // Доска занимает почти всю ширину фасада: при выводе в мире (108 px из 512)
  // шрифт 40 единиц даёт ~8 px по высоте вместо прежних ~4.6 px.
  x: 24, h: 112, minW: 464, maxW: 464,
  iconX: 34, iconY: 14, iconScale: 0.95,
  textX: 118, rightPad: 12,
  typeY: 44, shopY: 90, size: 40, minSize: 40, advance: 0.62,
});
function signParts(fullName) {
  const full = String(fullName || '').trim();
  const quoted = full.match(/^(.*?)\s*«\s*(.+?)\s*»\s*$/);
  if (quoted) return { full, type: quoted[1].trim(), shop: quoted[2].trim() };
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { full, type: full, shop: '' };
  const cut = Math.ceil(words.length / 2);
  return { full, type: words.slice(0, cut).join(' '), shop: words.slice(cut).join(' ') };
}
function signLayout(parts) {
  const lines = parts.shop ? [parts.type, parts.shop] : [parts.type];
  const boardW = SIGN.maxW;
  const maxTextW = boardW - (SIGN.textX - SIGN.x) - SIGN.rightPad;
  // Размер остаётся крупным; длинные строки сжимаются по ширине через textLength,
  // а не уменьшаются по высоте — иначе вывеска снова нечитаема в мире.
  return { lines, size: SIGN.size, boardW, maxTextW };
}
function signLayer(y, icon, fullName) {
  const parts = signParts(fullName);
  const layout = signLayout(parts);
  const right = SIGN.x + layout.boardW;
  const board = `<path id="signBoard" d="M${SIGN.x} ${y} H${right} V${y + SIGN.h} H${SIGN.x}Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter" stroke-linecap="square"/>`;
  const plate = flat(SIGN.x + 6, y + 5, layout.boardW - 12, SIGN.h - 10, '#4a2e18');
  const glyph = `<g transform="translate(${SIGN.iconX} ${y + SIGN.iconY}) scale(${SIGN.iconScale})" data-sign="${icon}">${ICONS[icon] || ICONS.house}</g>`;
  const text = layout.lines.map((line, i) => {
    const baseline = y + (layout.lines.length === 1 ? (SIGN.typeY + SIGN.shopY) / 2 : (i === 0 ? SIGN.typeY : SIGN.shopY));
    const label = layout.lines.length === 1 ? 'type' : (i === 0 ? 'type' : 'shop');
    const width = Math.min(layout.maxTextW, line.length * layout.size * SIGN.advance);
    const fill = label === 'type' ? C.gold : C.white;
    return `<text data-line="${label}" x="${SIGN.textX}" y="${baseline}" font-family="'Courier New', monospace" font-size="${layout.size}" font-weight="700" fill="${fill}" stroke="${C.outline}" stroke-width="2" paint-order="stroke" text-rendering="geometricPrecision" textLength="${width.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(line)}</text>`;
  }).join('');
  return `  <g id="sign" data-sign-name="${esc(parts.full)}" data-sign-type="${esc(parts.type)}" data-sign-shop="${esc(parts.shop)}">${board}${plate}${glyph}${text}</g>`;
}

function foundation() {
  let bricks = '';
  for (let x = 78; x < 432; x += 28) {
    bricks += rect(x, 422, 26, 25, ((x / 28) % 2) ? C.stoneLight : C.stone, 2);
    bricks += flat(x + 3, 425, 8, 4, C.warm);
  }
  return `  <g id="base">${rect(76, 418, 360, 34, C.stone, 3)}${bricks}</g>`;
}

function wallLayer(y, h, mat) {
  const m = MATERIALS[mat];
  let courses = '';
  for (let yy = y + 20; yy < y + h - 20; yy += 32) {
    courses += flat(94, yy, 324, 3, m.wallShade);
  }
  return [
    `  <g id="wall">`,
    rect(88, y, 336, h, m.wall, 3),
    flat(92, y + 5, 328, 10, m.wallShade),
    flat(96, y + 18, 320, 8, m.wall),
    flat(398, y + 8, 20, h - 12, m.wallShade),
    courses,
    `</g>`,
  ].join('\n');
}

function houseSvg(entry, style, name) {
  const floors = style.floors;
  const wallY = floors === 2 ? 128 : 160;
  const wallH = 418 - wallY;
  const apexY = floors === 2 ? 32 : 56;
  const signY = floors === 2 ? 118 : 150;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">`,
    `  <title>${esc(entry.sign_text || name)}</title>`,
    `  <g id="chimney">${rect(326, 8, 46, 112, C.stone, 3)}${flat(330, 12, 10, 104, C.stoneLight)}${rect(320, 2, 58, 14, C.dark, 3)}</g>`,
    foundation(),
    wallLayer(wallY, wallH, style.wall),
    roofLayer(wallY, apexY, style.roof),
    signLayer(signY, checkedIcon(entry), name),
    `  <g id="window">`,
  ];
  if (floors === 2) {
    parts.push(windowUnit(96, 236, 124, 68));
    parts.push(windowUnit(292, 236, 124, 68));
    parts.push(`<!-- second-floor windows span ~3/4 of the facade -->`);
    parts.push(windowUnit(102, 306, 78, 64));
    parts.push(windowUnit(332, 306, 78, 64));
  } else {
    parts.push(windowUnit(104, 266, 78, 68));
    parts.push(windowUnit(330, 266, 78, 68));
  }
  parts.push(`  </g>`);
  parts.push(`  <g id="door">${doorUnit(floors === 2 ? 304 : 292, 418 - (floors === 2 ? 304 : 292))}</g>`);
  parts.push(`  <g id="decor">${line(88, 406, 424, 406, 2, C.stone)}</g>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

function wellSvg(entry, style, name) {
  const m = MATERIALS.mute;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">
  <title>${esc(entry.sign_text || name)}</title>
  <g id="chimney"></g>
  <g id="base">
${rect(112, 306, 288, 124, m.wall, 4)}
${flat(118, 312, 276, 10, m.wallShade)}
${rect(104, 426, 304, 18, C.stone, 3)}
${flat(132, 330, 34, 12, C.stoneLight)}${flat(346, 350, 38, 12, C.stoneLight)}
<path d="M118 348 H166 M346 368 H386" fill="none" stroke="${C.stoneLight}" stroke-width="3" stroke-linecap="square"/>
  </g>
  <g id="wall">${rect(142, 196, 20, 112, m.wall, 3)}${rect(350, 196, 20, 112, m.wall, 3)}${flat(146, 202, 7, 100, C.stoneLight)}${flat(354, 202, 7, 100, C.stoneLight)}</g>
  <g id="roof">
    <path d="M96 124 L256 44 L416 124Z" fill="${m.roof}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    <path d="M118 118 L256 56 L394 118" fill="none" stroke="${m.roofGlint}" stroke-width="4" stroke-linecap="square"/>
    ${rect(88, 116, 336, 12, m.roofDark, 3)}
    ${rect(136, 186, 240, 12, C.wood, 3)}
  </g>
  <g id="denHatch" data-part="den-hatch" data-lair="bandit">
    <g data-hatch-canopy="1">
      <path d="M320 304 L402 268 L486 304Z" fill="${C.tile}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
      <path d="M340 298 L402 276 L466 298" fill="none" stroke="${C.tileGlint}" stroke-width="3" stroke-linecap="square"/>
      ${rect(326, 300, 10, 62, C.wood, 3)}${rect(470, 300, 10, 62, C.wood, 3)}
    </g>
    <path data-hatch-opening="1" d="M352 358 H452 V438 H352Z" fill="${C.dark}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
    <path d="M364 370 H440 V430 H364Z" fill="${C.outline}" stroke="none"/>
    <g data-hatch-steps="1">${flat(370, 390, 64, 8, C.dark)}${flat(376, 406, 52, 8, C.dark)}${flat(382, 422, 40, 8, C.dark)}</g>
    <path d="M378 374 V426 M428 374 V426 M378 388 H428 M378 406 H428" fill="none" stroke="${C.metal}" stroke-width="3" stroke-linecap="square"/>
    <path data-hatch-lid="1" d="M452 358 L488 344 V420 L452 438Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="3" stroke-linejoin="miter"/>
    ${flat(458, 365, 5, 58, C.warm)}
    <ellipse cx="474" cy="386" rx="4" ry="5" fill="${C.gold}" stroke="${C.outline}" stroke-width="2"/>
  </g>
  <g id="door" data-part="winch">
    <ellipse cx="256" cy="232" rx="42" ry="36" fill="${C.wood}" stroke="${C.outline}" stroke-width="4"/>
    <ellipse cx="256" cy="232" rx="30" ry="25" fill="${C.dark}" stroke="none"/>
    <path d="M214 232 H298 M256 196 V268 M226 210 L286 254 M286 210 L226 254" fill="none" stroke="${C.warm}" stroke-width="5" stroke-linecap="square"/>
    <ellipse cx="256" cy="232" rx="11" ry="10" fill="${C.metal}" stroke="${C.outline}" stroke-width="3"/>
    <path d="M298 232 H328 V258" fill="none" stroke="${C.metal}" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/>
    <ellipse cx="328" cy="262" rx="6" ry="9" fill="${C.wood}" stroke="${C.outline}" stroke-width="3"/>
    <path d="M235 264 L232 294 M277 264 L280 294" fill="none" stroke="${C.outline}" stroke-width="4" stroke-linecap="square"/>
    <g data-part="bucket">
      <path d="M230 294 Q256 264 282 294" fill="none" stroke="${C.metal}" stroke-width="5" stroke-linecap="square"/>
      <path d="M226 296 H286 L278 344 H234Z" fill="${C.wood}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="miter"/>
      ${flat(228, 304, 56, 7, C.metal)}${flat(232, 332, 50, 7, C.metal)}
      <ellipse cx="248" cy="320" rx="6" ry="9" fill="${C.warm}" stroke="none"/>
    </g>
  </g>
  <g id="window"></g>
${signLayer(138, checkedIcon(entry), name)}
  <g id="decor">
    ${rect(122, 416, 24, 10, C.stoneLight, 2)}${rect(366, 416, 24, 10, C.stoneLight, 2)}
    <path d="M156 448 H356" fill="none" stroke="${C.dark}" stroke-width="3" stroke-linecap="square"/>
  </g>
</svg>
`;
}

function main() {
  const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const entry of batch) {
    const stem = path.basename(entry.path, '.svg');
    const style = BUILDING_STYLE[stem];
    if (!style) throw new Error('Нет стиля для ' + stem);
    const name = entry.sign_text || entry.title || stem;
    const svg = style.special === 'well'
      ? wellSvg(entry, style, name)
      : houseSvg(entry, style, name);
    fs.writeFileSync(path.join(OUT_DIR, stem + '.svg'), svg, 'utf8');
    console.log('generated ' + stem + '.svg (' + (style.floors === 2 ? '2 этажа' : '1 этаж') + ', ' + style.icon + ')');
  }
}

if (require.main === module) main();
module.exports = { BUILDING_STYLE, ICONS, houseSvg, wellSvg };
