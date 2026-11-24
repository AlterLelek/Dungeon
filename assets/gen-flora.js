const fs = require('fs');
const path = require('path');

const ASSETS_DIR = __dirname;
const FLORA_DIR = path.join(ASSETS_DIR, 'flora');
const BATCH_FILE = path.join(ASSETS_DIR, 'flora-batch.json');
const STROKE = '#241a14';

const palettes = {
  grass_light:  { dark: '#4f8a32', base: '#77b84a', light: '#b7dc78' },
  grass_mid:    { dark: '#2f6b2e', base: '#4e963b', light: '#82c25a' },
  grass_dark:   { dark: '#204a26', base: '#2f6f32', light: '#4f9442' },
  grass_olive:  { dark: '#566e2c', base: '#7f9b3d', light: '#a9bd5c' },
  moss_bright:  { dark: '#376b2d', base: '#5b9a42', light: '#9cc96a' },
  moss_shadow:  { dark: '#234b29', base: '#3a7537', light: '#6aa052' },
  pebble_gray:  { dark: '#5a5f68', base: '#878e98', light: '#b9c0c8' },
  pebble_warm:  { dark: '#6b5b4c', base: '#9b8774', light: '#c8b6a1' },
};

const specs = [
  ['grass_light', 5],
  ['grass_mid', 5],
  ['grass_dark', 5],
  ['grass_olive', 5],
  ['moss_bright', 3],
  ['moss_shadow', 3],
  ['pebble_gray', 2],
  ['pebble_warm', 2],
];

function r2(value) {
  return Math.round(value * 100) / 100;
}

function noise(seed, index, amplitude) {
  const raw = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return ((raw - Math.floor(raw)) * 2 - 1) * amplitude;
}

function svg(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="geometricPrecision">' +
    '<g stroke="' + STROKE + '" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round">' +
    inner + '</g></svg>\n';
}

function grass(p, variant) {
  const parts = [
    '<path d="M17 57 Q32 54 47 57" fill="none" stroke="#4a3520" stroke-width="1.6"/>',
    '<ellipse cx="32" cy="56.5" rx="13" ry="2.2" fill="' + p.dark + '" stroke-width="0.9"/>',
  ];
  const offsets = [-14, -8, -2, 4, 10, 16];
  const fills = [p.dark, p.base, p.light];

  for (let i = 0; i < offsets.length; i++) {
    const x = 32 + offsets[i] + noise(variant, i, 1.4);
    const topY = 26 + noise(variant, i + 8, 6) + (i % 2 ? 4 : 0);
    const tipX = x + noise(variant, i + 16, 7);
    const width = 2.4 + (i % 3) * 0.3;
    const blade =
      'M' + r2(x - width) + ' 56 ' +
      'Q' + r2(x - 3) + ' ' + r2(topY + 14) + ' ' + r2(tipX) + ' ' + r2(topY) + ' ' +
      'Q' + r2(x + 3.4) + ' ' + r2(topY + 13) + ' ' + r2(x + width) + ' 56 Z';
    parts.push('<path d="' + blade + '" fill="' + fills[i % fills.length] + '"/>');

    if (i % 2 === 0) {
      const vein =
        'M' + r2(x) + ' 54 Q' + r2(x + noise(variant, i + 24, 2)) + ' ' +
        r2(topY + 18) + ' ' + r2(tipX) + ' ' + r2(topY + 2);
      parts.push('<path d="' + vein + '" fill="none" stroke="' + p.light +
        '" stroke-width="0.8" opacity="0.75"/>');
    }
  }

  return svg(parts.join(''));
}

function moss(p, variant) {
  const parts = [
    '<path d="M13 57 Q32 53 51 57" fill="none" stroke="#4a3520" stroke-width="1.6"/>',
  ];
  const bumps = [
    [19, 50, 10, 7], [29, 46, 12, 9], [41, 48, 11, 8],
    [25, 53, 9, 6], [37, 53, 9, 6],
  ];
  const fills = [p.base, p.light, p.base, p.dark, p.light];

  for (let i = 0; i < bumps.length; i++) {
    const cx = r2(bumps[i][0] + noise(variant, i, 1.6));
    const cy = r2(bumps[i][1] + noise(variant, i + 5, 1.4));
    const rx = r2(bumps[i][2] + noise(variant, i + 10, 1.2));
    const ry = r2(bumps[i][3] + noise(variant, i + 15, 0.9));
    parts.push('<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + fills[i] + '"/>');
  }

  for (let i = 0; i < 5; i++) {
    const cx = r2(20 + i * 6 + noise(variant, i + 30, 2));
    const cy = r2(45 + noise(variant, i + 36, 3));
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="1.5" fill="' + p.light +
      '" stroke="none" opacity="0.8"/>');
  }

  return svg(parts.join(''));
}

function pebble(p, variant) {
  const parts = [
    '<path d="M13 57 Q32 54 51 57" fill="none" stroke="#4a3520" stroke-width="1.6"/>',
  ];
  const stones = [
    [21, 49, 10, 6, -10], [34, 46, 12, 7, 7],
    [45, 51, 8, 5, -5], [29, 54, 7, 4, 4],
  ];
  const fills = [p.base, p.light, p.base, p.dark];

  for (let i = 0; i < stones.length; i++) {
    const cx = r2(stones[i][0] + noise(variant, i, 1.5));
    const cy = r2(stones[i][1] + noise(variant, i + 5, 1.2));
    const rx = r2(stones[i][2] + noise(variant, i + 10, 1));
    const ry = r2(stones[i][3] + noise(variant, i + 15, 0.6));
    const angle = r2(stones[i][4] + noise(variant, i + 20, 5));
    parts.push('<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + fills[i] + '" transform="rotate(' + angle + ' ' + cx + ' ' + cy + ')"/>');
    parts.push('<ellipse cx="' + r2(cx - 2) + '" cy="' + r2(cy - 2) + '" rx="' + r2(rx * 0.35) +
      '" ry="' + r2(ry * 0.28) + '" fill="' + p.light + '" stroke="none" opacity="0.85"/>');
  }

  return svg(parts.join(''));
}

const renderers = { grass: grass, moss: moss, pebble: pebble };

fs.mkdirSync(FLORA_DIR, { recursive: true });

const batch = [];
let id = 634;

for (const [type, count] of specs) {
  const family = type.split('_')[0];
  const palette = palettes[type];

  for (let variant = 1; variant <= count; variant++) {
    const filename = type + '_' + variant + '.svg';
    fs.writeFileSync(path.join(FLORA_DIR, filename), renderers[family](palette, variant), 'utf8');
    batch.push({
      id: id++,
      path: 'assets/flora/' + filename,
      type: 'flora',
      group: 'Flora',
      tags: ['flora', type],
    });
  }
}

fs.writeFileSync(BATCH_FILE, JSON.stringify(batch, null, 2) + '\n', 'utf8');
console.log('Готово: ' + batch.length + ' SVG и записей в flora-batch.json');
