const fs = require('fs');
const path = require('path');

const ASSETS_DIR = __dirname;
const MOUNTAIN_DIR = path.join(ASSETS_DIR, 'mountains');
const BATCH_FILE = path.join(ASSETS_DIR, 'mountains-batch.json');

// Три сло́я силуэтов: далёкий светлый и прозрачный, ближний тёмный и плотнее.
// Только заливка — без контуров, снега, текстур и прочих деталей.
const LAYERS = [
  { fill: '#9aadc1', opacity: 0.34, base: 30, amp: 11 },
  { fill: '#7189a5', opacity: 0.52, base: 42, amp: 9 },
  { fill: '#4e6684', opacity: 0.72, base: 54, amp: 6 },
];

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const f = (value) => Math.round(value * 100) / 100;

function ridge(seed, layer, layerIndex) {
  const rand = makeRandom(seed * 977 + layerIndex * 131 + 37);
  const peaks = 3 + (seed + layerIndex) % 3;
  const step = 68 / peaks;
  let d = 'M-2 64 L-2 ' + f(layer.base + 8);

  for (let i = 0; i < peaks; i++) {
    const center = -2 + step * (i + 0.5) + (rand() * 2 - 1) * step * 0.12;
    const y = layer.base + (rand() * 2 - 1) * layer.amp;
    d += ' L' + f(center - step * 0.42) + ' ' + f(y + 5 + rand() * 3) +
      ' L' + f(center) + ' ' + f(y) +
      ' L' + f(center + step * 0.42) + ' ' + f(y + 6 + rand() * 3);
  }

  return d + ' L66 64 Z';
}

function svg(seed) {
  const shapes = LAYERS.map((layer, index) => {
    const d = ridge(seed, layer, index);
    return '<path d="' + d + '" fill="' + layer.fill +
      '" opacity="' + layer.opacity + '"/>';
  }).join('');

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="geometricPrecision">' +
    '<g stroke="none">' + shapes + '</g></svg>\n';
}

fs.mkdirSync(MOUNTAIN_DIR, { recursive: true });

const batch = [];
let id = 664;

for (let variant = 1; variant <= 10; variant++) {
  const filename = 'mountain_' + variant + '.svg';
  fs.writeFileSync(path.join(MOUNTAIN_DIR, filename), svg(variant), 'utf8');
  batch.push({
    id: id++,
    path: 'assets/mountains/' + filename,
    type: 'mountain',
    group: 'Mountains',
    tags: ['mountains', 'silhouette', 'background'],
  });
}

fs.writeFileSync(BATCH_FILE, JSON.stringify(batch, null, 2) + '\n', 'utf8');
console.log('Готово: ' + batch.length + ' SVG и записей в mountains-batch.json');
