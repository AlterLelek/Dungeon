#!/usr/bin/env node
'use strict';

/**
 * Flat two-tone SVG icons for the rebuilt MM6 item database.
 *
 * Style follows docs/ASSET_STYLE.md: transparent background, chunky dark
 * outline, flat fill plus a lighter accent. No gradients, no filters, no PNG.
 * Element files are coloured backdrops behind the whole item; quality files
 * are masked to the item silhouette by the renderer, so the item stays visible.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'items');

const OUTLINE = '#241a14';

function svg(body, attrs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="geometricPrecision"${attrs ? ' ' + attrs : ''}><g stroke="${OUTLINE}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;
}

function highlight(cx, cy, rx, ry, color, rotate = 0) {
  const transform = rotate ? ` transform="rotate(${rotate} ${cx} ${cy})"` : '';
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" stroke="none"${transform}/>`;
}

function streak(d, color, width = 1.6) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const files = {
  // ── Weapons ─────────────────────────────────────────────────────────
  'weapons/dagger.svg': svg(`
    <path d="M32 4 L39 22 L35 30 H29 L25 22 Z" fill="#b9c4cf"/>
    <path d="M32 6 L28 22 L30 28 H31 Z" fill="#e8eff4" stroke="none"/>
    <path d="M19 29 Q32 36 45 29 L44 33 Q32 40 20 33 Z" fill="#a9772a"/>
    <path d="M24 31 Q32 35 40 31" fill="none" stroke="#e6c276" stroke-width="1.4"/>
    <path d="M29 35 H35 V49 Q32 52 29 49 Z" fill="#7a4b2a"/>
    <circle cx="32" cy="52" r="4" fill="#a9772a"/>
    ${highlight(31, 51, 1.2, 0.8, '#e6c276')}
  `),

  'weapons/sword.svg': svg(`
    <path d="M32 2 L38 18 L36 40 H28 L26 18 Z" fill="#c3cdd6"/>
    <path d="M32 4 L29 20 L30 39 H31 Z" fill="#edf3f7" stroke="none"/>
    <path d="M16 41 Q32 48 48 41 L47 46 Q32 53 17 46 Z" fill="#a9772a"/>
    <path d="M20 43 Q32 48 44 43" fill="none" stroke="#e6c276" stroke-width="1.4"/>
    <path d="M29 47 H35 V57 Q32 60 29 57 Z" fill="#7a4b2a"/>
    <circle cx="32" cy="58" r="3.4" fill="#a9772a"/>
    ${highlight(31, 57, 1, 0.7, '#e6c276')}
  `),

  'weapons/axe.svg': svg(`
    <path d="M30 8 H35 L36 56 H29 Z" fill="#7a4b2a"/>
    <path d="M31 10 H33 V54 H31 Z" fill="#b98a52" stroke="none"/>
    <path d="M33 10 Q48 8 52 20 Q48 34 33 32 Z" fill="#aebbc6"/>
    <path d="M31 12 Q17 10 13 21 Q17 33 31 31 Z" fill="#8f9daa"/>
    <path d="M40 13 Q47 15 48 21" fill="none" stroke="#e8eff4" stroke-width="1.6"/>
    <path d="M29 9 L36 9 L36 15 L29 15 Z" fill="#a9772a"/>
  `),

  'weapons/mace.svg': svg(`
    <path d="M30 25 H34 V58 H30 Z" fill="#7a4b2a"/>
    <path d="M31 27 H33 V56 H31 Z" fill="#b98a52" stroke="none"/>
    <path d="M25 9 L32 5 L39 9 L42 17 L36 24 H28 L22 17 Z" fill="#aebbc6"/>
    <path d="M25 9 L28 16 L24 18 Z M39 9 L36 16 L40 18 Z M32 5 L32 13 Z" fill="#8f9daa"/>
    ${highlight(31, 11, 2.4, 1.3, '#edf3f7')}
    <path d="M27 26 H37" stroke="#a9772a" stroke-width="2.6"/>
  `),

  'weapons/staff.svg': svg(`
    <path d="M30 18 H34 V59 H30 Z" fill="#7a4b2a"/>
    <path d="M31 20 H33 V57 H31 Z" fill="#b98a52" stroke="none"/>
    <circle cx="32" cy="13" r="9" fill="#5e9bbf"/>
    ${highlight(29, 10, 2.6, 1.6, '#bfe8f5')}
    <path d="M24 6 L20 2 M40 6 L44 2" fill="none" stroke="#a9772a" stroke-width="2.4"/>
  `),

  'weapons/spear.svg': svg(`
    <path d="M30 20 H34 V60 H30 Z" fill="#7a4b2a"/>
    <path d="M31 22 H33 V58 H31 Z" fill="#b98a52" stroke="none"/>
    <path d="M32 2 L39 16 L32 22 L25 16 Z" fill="#c3cdd6"/>
    <path d="M32 4 L29 16 L32 20 Z" fill="#edf3f7" stroke="none"/>
    <path d="M27 20 H37" stroke="#a9772a" stroke-width="2.4"/>
  `),

  'weapons/bow.svg': svg(`
    <path d="M20 5 Q6 32 20 59" fill="none" stroke="#7a4b2a" stroke-width="4.5"/>
    <path d="M20 5 Q35 32 20 59" fill="none" stroke="#d9c9a3" stroke-width="1.4"/>
    <path d="M20 5 L20 59" fill="none" stroke="#e7dcc0" stroke-width="1.2"/>
    <path d="M8 32 H52 M45 27 L52 32 L45 37" fill="none" stroke="#a9772a" stroke-width="2.6"/>
    <path d="M18 31 L24 31" stroke="#c3cdd6" stroke-width="2.2"/>
  `),

  // ── Armor ───────────────────────────────────────────────────────────
  'armor/breastplate.svg': svg(`
    <path d="M20 8 L32 14 L44 8 L52 20 L46 30 L45 55 Q32 61 19 55 L18 30 L12 20 Z" fill="#9fabb6"/>
    <path d="M20 12 L32 18 L44 12" fill="none" stroke="#dbe6ee" stroke-width="2"/>
    <path d="M32 18 V55" fill="none" stroke="#5d6b78" stroke-width="2"/>
    ${highlight(24, 25, 3, 5, '#dbe6ee', -18)}
    ${highlight(40, 25, 3, 5, '#dbe6ee', 18)}
  `),

  'armor/chainmail.svg': svg(`
    <path d="M21 8 L32 13 L43 8 L50 19 L45 29 L44 55 Q32 60 20 55 L19 29 L14 19 Z" fill="#7d8b98"/>
    <path d="M16 22 Q32 30 48 22 M17 31 Q32 39 47 31 M18 40 Q32 48 46 40 M19 49 Q32 56 45 49" fill="none" stroke="#c3d0d9" stroke-width="1.6"/>
    <path d="M21 11 L32 16 L43 11" fill="none" stroke="#dbe6ee" stroke-width="2"/>
  `),

  'armor/robe.svg': svg(`
    <path d="M24 7 L32 13 L40 7 L46 17 L50 57 Q32 62 14 57 L18 17 Z" fill="#6f4b9e"/>
    <path d="M24 9 L32 17 L40 9" fill="none" stroke="#b79add" stroke-width="2"/>
    <path d="M32 17 V56" fill="none" stroke="#c6a96a" stroke-width="2.4"/>
    ${highlight(25, 28, 3, 6, '#a98bd0', -12)}
  `),

  'armor/shield.svg': svg(`
    <path d="M32 5 L53 13 V32 Q53 49 32 59 Q11 49 11 32 V13 Z" fill="#9fabb6"/>
    <path d="M32 10 L47 16 V32 Q47 44 32 53 Q17 44 17 32 V16 Z" fill="#5d6b78"/>
    <path d="M32 12 L32 52" stroke="#dbe6ee" stroke-width="2.4"/>
    <path d="M20 26 H44" stroke="#dbe6ee" stroke-width="2.4"/>
    ${highlight(26, 21, 3, 5, '#c3d0d9', -20)}
  `),

  'armor/bracers.svg': svg(`
    <path d="M18 13 H46 L43 48 Q32 54 21 48 Z" fill="#7a4b2a"/>
    <path d="M18 20 H46 M19 29 H45 M20 38 H44" fill="none" stroke="#b98a52" stroke-width="2.4"/>
    <path d="M24 17 V46" stroke="#d1a165" stroke-width="2"/>
    ${highlight(39, 25, 2, 5, '#d1a165', 12)}
  `),

  'armor/gloves.svg': svg(`
    <path d="M20 13 Q32 8 44 13 L46 40 Q43 51 32 54 Q21 51 18 40 Z" fill="#7a4b2a"/>
    <path d="M22 13 V30 M28 11 V31 M36 11 V31 M42 13 V30" fill="none" stroke="#b98a52" stroke-width="2.2"/>
    <path d="M19 38 Q32 45 45 38" fill="none" stroke="#d1a165" stroke-width="2.4"/>
    ${highlight(26, 43, 3, 2, '#d1a165')}
  `),

  // ── Head ────────────────────────────────────────────────────────────
  'head/helmet.svg': svg(`
    <path d="M14 34 Q14 9 32 9 Q50 9 50 34 L45 45 H19 Z" fill="#9fabb6"/>
    <path d="M19 32 H45 L43 38 H21 Z" fill="#5d6b78"/>
    <path d="M32 9 V32" stroke="#dbe6ee" stroke-width="2.2"/>
    ${highlight(25, 21, 3, 5, '#dbe6ee', -18)}
    <path d="M17 45 Q32 53 47 45" fill="none" stroke="#a9772a" stroke-width="2.4"/>
  `),

  'head/hood.svg': svg(`
    <path d="M14 36 Q14 10 32 10 Q50 10 50 36 L45 55 Q32 61 19 55 Z" fill="#4f6b52"/>
    <path d="M22 35 Q22 24 32 24 Q42 24 42 35 L39 49 Q32 53 25 49 Z" fill="#241a14"/>
    <path d="M18 28 Q32 15 46 28" fill="none" stroke="#84a987" stroke-width="2"/>
    ${highlight(23, 22, 3, 4, '#84a987', -20)}
  `),

  'head/crown.svg': svg(`
    <path d="M13 46 L16 18 L25 30 L32 14 L39 30 L48 18 L51 46 Z" fill="#d9ad43"/>
    <path d="M13 46 H51 V53 H13 Z" fill="#b88726"/>
    <circle cx="32" cy="23" r="3" fill="#5e9bbf"/>
    ${highlight(22, 38, 3, 2, '#f4df96')}
  `),

  // ── Boots ───────────────────────────────────────────────────────────
  'boots/boots.svg': svg(`
    <path d="M20 8 H31 V37 L34 45 Q37 50 33 55 H9 Q6 55 9 51 L15 45 Q20 41 20 35 Z" fill="#7a4b2a"/>
    <path d="M20 12 H31 M19 22 H30" fill="none" stroke="#b98a52" stroke-width="2"/>
    <path d="M10 52 H31" fill="none" stroke="#d1a165" stroke-width="2"/>
    <g transform="translate(64 0) scale(-1 1)">
      <path d="M20 8 H31 V37 L34 45 Q37 50 33 55 H9 Q6 55 9 51 L15 45 Q20 41 20 35 Z" fill="#7a4b2a"/>
      <path d="M20 12 H31 M19 22 H30" fill="none" stroke="#b98a52" stroke-width="2"/>
      <path d="M10 52 H31" fill="none" stroke="#d1a165" stroke-width="2"/>
    </g>
  `),

  'boots/greaves.svg': svg(`
    <path d="M22 6 H42 L40 34 L44 51 Q44 56 38 56 H26 Q20 56 20 51 L24 34 Z" fill="#9fabb6"/>
    <path d="M22 16 H42 M23 26 H41" fill="none" stroke="#dbe6ee" stroke-width="2"/>
    <path d="M24 40 H40" fill="none" stroke="#5d6b78" stroke-width="2"/>
    ${highlight(28, 30, 2, 5, '#dbe6ee', -8)}
  `),

  'boots/sandals.svg': svg(`
    <path d="M20 18 L39 18 L45 45 Q46 52 38 53 H15 Q9 52 12 45 Z" fill="#b98a52"/>
    <path d="M18 27 Q29 33 41 27 M16 36 Q29 42 43 36" fill="none" stroke="#7a4b2a" stroke-width="2.6"/>
    ${highlight(22, 44, 4, 2, '#e0bb83')}
  `),

  // ── Containers ──────────────────────────────────────────────────────
  'containers/chest.svg': svg(`
    <path d="M8 24 Q8 12 32 12 Q56 12 56 24 V29 H8 Z" fill="#a9772a"/>
    <path d="M8 29 H56 V53 H8 Z" fill="#7a4b2a"/>
    <path d="M8 29 H56" stroke="#241a14" stroke-width="2.6"/>
    <path d="M12 22 Q32 16 52 22" fill="none" stroke="#e6c276" stroke-width="2"/>
    <path d="M28 27 H36 V40 H28 Z" fill="#d9ad43"/>
    ${highlight(15, 36, 3, 6, '#b98a52')}
  `),

  'containers/bag.svg': svg(`
    <path d="M16 24 Q32 8 48 24 L52 52 Q32 60 12 52 Z" fill="#8a5f36"/>
    <path d="M22 23 Q32 14 42 23" fill="none" stroke="#d1a165" stroke-width="2.4"/>
    <path d="M13 34 Q32 42 51 34" fill="none" stroke="#5f3d21" stroke-width="2"/>
    ${highlight(22, 41, 3, 5, '#bb8e58', -12)}
  `),

  'containers/pouch.svg': svg(`
    <path d="M18 23 Q32 12 46 23 L49 48 Q32 56 15 48 Z" fill="#5f6f4b"/>
    <path d="M18 23 Q32 31 46 23" fill="none" stroke="#a8bb82" stroke-width="2.2"/>
    <path d="M27 20 Q32 12 37 20" fill="none" stroke="#a9772a" stroke-width="2.4"/>
    ${highlight(23, 38, 3, 4, '#93a776', -12)}
  `),

  'containers/belt.svg': svg(`
    <path d="M5 26 Q32 18 59 26 L59 38 Q32 30 5 38 Z" fill="#7a4b2a"/>
    <path d="M26 24 H38 V39 H26 Z" fill="#d9ad43"/>
    <path d="M29 27 H35 V35 H29 Z" fill="#7a4b2a"/>
    ${highlight(12, 30, 3, 1.6, '#b98a52')}
  `),

  // ── Element backdrops (six files; rendered BEHIND the base item) ─────
  // Пятно того же цвета, что и знак школы. Без градиентов и размытия.
  'elements/flame.svg': svg(`
    <path d="M10 33 L17 16 L32 8 L47 16 L54 33 L46 50 L32 59 L18 50 Z" fill="#b93a2b" stroke-linejoin="miter"/>
    <path d="M18 34 L26 20 L38 18 L48 32 L40 47 L24 47 Z" fill="#e0823c" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="flame" data-role="backdrop"'),

  'elements/water.svg': svg(`
    <path d="M11 32 L20 15 L34 8 L48 17 L53 34 L43 51 L29 58 L15 47 Z" fill="#3b6ea5" stroke-linejoin="miter"/>
    <path d="M19 34 L27 20 L40 17 L47 32 L39 46 L25 45 Z" fill="#93c5fd" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="water" data-role="backdrop"'),

  'elements/earth.svg': svg(`
    <path d="M9 35 L18 17 L33 10 L49 16 L55 35 L46 52 L29 58 L14 48 Z" fill="#4f8a44" stroke-linejoin="miter"/>
    <path d="M18 35 L27 21 L41 18 L48 34 L40 47 L24 46 Z" fill="#6b4426" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="earth" data-role="backdrop"'),

  'elements/wind.svg': svg(`
    <path d="M8 31 L19 15 L34 9 L49 17 L56 33 L44 50 L28 57 L13 47 Z" fill="#8a8f98" stroke-linejoin="miter"/>
    <path d="M18 33 L27 20 L41 18 L48 32 L39 46 L24 45 Z" fill="#f3efe2" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="wind" data-role="backdrop"'),

  'elements/dark.svg': svg(`
    <path d="M10 32 L20 14 L34 8 L48 17 L54 34 L44 51 L28 58 L14 47 Z" fill="#6d3b8f" stroke-linejoin="miter"/>
    <path d="M19 34 L27 20 L40 17 L47 33 L39 47 L24 46 Z" fill="#2a1c12" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="dark" data-role="backdrop"'),

  'elements/light.svg': svg(`
    <path d="M32 7 L48 16 L55 32 L46 49 L32 57 L18 49 L9 32 L16 16 Z" fill="#e8c14a" stroke-linejoin="miter"/>
    <path d="M22 32 L32 18 L42 32 L32 46 Z" fill="#f3efe2" stroke="none" stroke-linejoin="miter"/>
  `, 'data-element="light" data-role="backdrop"'),

  // ── Quality layers (four files; masked to the base silhouette) ──────
  'quality/rusty.svg': svg(`
    <path d="M11 21 L19 17 L23 24 L15 27 Z" fill="#7a4b2a" stroke="none"/>
    <path d="M42 13 L50 17 L46 25 L40 21 Z" fill="#b93a2b" stroke="none"/>
    <path d="M17 40 L25 37 L27 45 L19 48 Z" fill="#7a4b2a" stroke="none"/>
    <path d="M38 42 L47 39 L49 47 L41 50 Z" fill="#b93a2b" stroke="none"/>
    <path d="M47 22 L54 26 L48 30 Z" fill="#241a14" stroke="none" stroke-linejoin="miter"/>
    <path d="M12 33 L18 30 L16 38 Z" fill="#241a14" stroke="none" stroke-linejoin="miter"/>
  `, 'data-quality="rusty" data-role="quality"'),

  'quality/sharp.svg': svg(`
    <path d="M14 48 L50 12" fill="none" stroke="#f3efe2" stroke-width="2.6" stroke-linecap="square"/>
    <path d="M24 52 L54 22" fill="none" stroke="#93c5fd" stroke-width="1.4" stroke-linecap="square"/>
    ${highlight(40, 22, 3, 1.6, '#ffffff', -38)}
  `, 'data-quality="sharp" data-role="quality"'),

  'quality/gold.svg': svg(`
    <path d="M13 45 L22 19 L34 14 L43 20" fill="none" stroke="#e8c14a" stroke-width="3.2" stroke-linecap="square"/>
    <path d="M20 52 L31 26 L45 18" fill="none" stroke="#e8c14a" stroke-width="2.2" stroke-linecap="square"/>
    <path d="M38 36 L51 31" fill="none" stroke="#f3efe2" stroke-width="1.6" stroke-linecap="square"/>
  `, 'data-quality="gold" data-role="quality"'),

  'quality/magic.svg': svg(`
    <path d="M32 10 L36 26 L52 32 L36 38 L32 54 L28 38 L12 32 L28 26 Z" fill="#93c5fd" stroke="none"/>
    <path d="M32 21 L35 30 L44 33 L35 36 L32 45 L29 36 L20 33 L29 30 Z" fill="#b58be0" stroke="none"/>
    <path d="M15 17 H21 M18 14 V20" fill="none" stroke="#f3efe2" stroke-width="1.6" stroke-linecap="square"/>
  `, 'data-quality="magic" data-role="quality"')
};

fs.mkdirSync(OUT, { recursive: true });
let written = 0;
for (const [name, content] of Object.entries(files)) {
  const target = path.join(OUT, ...name.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  written++;
}
console.log(`assets/items: ${written} SVG files (${Object.keys(files).filter((n) => n.startsWith('elements/')).length} element layers)`);
