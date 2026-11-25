// Terrain-система MM6: трава, цветы, грунт, песок и камень.
// Внешний вид клетки хранится в состоянии карты (terrain + terrainVariant),
// а сезон меняет только палитру травы — без новых файлов и без мерцания.

export const TERRAIN_TYPES = ['grass', 'flowers', 'dirt', 'sand', 'stone'];
export const TERRAIN_LABELS = {
  grass: 'Трава',
  flowers: 'Трава с цветами',
  dirt: 'Грунт',
  sand: 'Песок',
  stone: 'Камень'
};
export const TERRAIN_SEASONS = ['summer', 'autumn', 'winter', 'spring'];

const SEASON_ALIASES = [
  ['summer', ['summer', 'лето']],
  ['autumn', ['autumn', 'осень']],
  ['winter', ['winter', 'зима']],
  ['spring', ['spring', 'весна']]
];

const OUTLINE = '#241a14';

// Палитры травы. Меняется только цвет — форма и положение вкраплений остаются.
const GRASS_PALETTES = {
  summer: { base: '#4f9a3a', dark: '#2f6b2e', light: '#8ecb5c', blade: '#3c8a35', edge: '#b7dc78' },
  autumn: { base: '#b9792c', dark: '#7c4a1e', light: '#e3b055', blade: '#9a5f22', edge: '#f2cd7c' },
  spring: { base: '#8cbf63', dark: '#6a9a44', light: '#c9e39a', blade: '#78ad4e', edge: '#dcf0b4' },
  winter: { base: '#e6edf4', dark: '#c2cedb', light: '#ffffff', blade: '#d5e1ec', edge: '#ffffff' }
};

const FLOWER_PETALS = {
  summer: ['#f472b6', '#fbbf24', '#f87171', '#c084fc', '#fef08a', '#60a5fa'],
  autumn: ['#f59e0b', '#dc2626', '#fbbf24', '#d97706', '#f472b6'],
  spring: ['#f9a8d4', '#fde68a', '#fca5a5', '#c4b5fd', '#fef3c7'],
  winter: ['#c084fc', '#f9a8d4', '#bfdbfe', '#fde68a', '#ffffff']
};

const SAND_PALETTE = { base: '#d8c08a', dark: '#b49a62', light: '#f0e2b4' };
const STONE_PALETTE = { base: '#8b9099', dark: '#5c626c', light: '#c0c6cf' };
const DIRT_PALETTE = { base: '#8a6a45', dark: '#5d452e', light: '#b78e5d' };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fract(value) {
  return value - Math.floor(value);
}

function noise01(seed) {
  return fract(Math.sin(seed * 12.9898 + 78.233) * 43758.5453);
}

function normalizeSeason(value) {
  const text = String(value || '').toLowerCase();
  for (const [season, aliases] of SEASON_ALIASES) {
    if (aliases.some(alias => text.includes(alias))) return season;
  }
  return 'summer';
}

export function normalizeTerrain(value, fallback = 'grass') {
  const id = String(value || '').toLowerCase();
  return TERRAIN_TYPES.includes(id) ? id : fallback;
}

export function baseTerrainForCell(cell) {
  if (!cell) return 'grass';
  const t = String(cell.t || '');
  if (t === 'rock') return 'stone';
  if (t === 'water') return 'sand';
  if (t === 'road' || t === 'gate' || t === 'boss') return 'dirt';
  return 'grass';
}

export function terrainForCell(cell) {
  if (!cell) return 'grass';
  const direct = normalizeTerrain(cell.terrain, '');
  return direct || baseTerrainForCell(cell);
}

export function terrainVariantFor(x, y, seed = 0) {
  const value = (Number(x) + 1) * 374761393 + (Number(y) + 1) * 668265263 + (Number(seed) || 0) * 1274126177;
  return Math.floor(fract(Math.sin(value) * 43758.5453) * 1000000);
}

function paintBlob(cells, size, cx, cy, radius, terrain, seed) {
  const r = Math.max(1, radius);
  const minX = Math.max(0, Math.floor(cx - r - 1));
  const maxX = Math.min(size - 1, Math.ceil(cx + r + 1));
  const minY = Math.max(0, Math.floor(cy - r - 1));
  const maxY = Math.min(size - 1, Math.ceil(cy + r + 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = cells[y][x];
      if (!cell || cell.t !== 'grass') continue;
      if (cell.terrain && cell.terrain !== 'grass') continue;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wobble = 0.78 + noise01(seed + x * 31 + y * 17) * 0.38;
      if (dist > r * wobble) continue;
      cell.terrain = terrain;
      cell.terrainVariant = terrainVariantFor(x, y, seed);
    }
  }
}

/**
 * Заполняет terrain у каждой клетки и расставляет вкрапления.
 * Вызывается после генерации леса/зданий/сокровищ: пятна ложатся только
 * на свободную траву, поэтому деревья и объекты не «прорастают» сквозь них.
 */
export function generateTerrain(cells, size, options = {}) {
  const seed = Math.round(Number(options.seed) || 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = cells[y][x];
      if (!cell) continue;
      cell.terrain = baseTerrainForCell(cell);
      cell.terrainVariant = terrainVariantFor(x, y, seed);
    }
  }

  const area = size * size;
  const sandPatches = clamp(Math.round(size / 7), 1, 5);
  const stonePatches = clamp(Math.round(size / 9), 1, 4);

  for (let i = 0; i < sandPatches; i++) {
    const cx = 1 + Math.floor(Math.random() * Math.max(1, size - 2));
    const cy = 1 + Math.floor(Math.random() * Math.max(1, size - 2));
    const radius = 1.1 + Math.random() * Math.max(1, size / 12);
    paintBlob(cells, size, cx, cy, radius, 'sand', seed + i * 101 + 11);
  }

  for (let i = 0; i < stonePatches; i++) {
    const cx = 1 + Math.floor(Math.random() * Math.max(1, size - 2));
    const cy = 1 + Math.floor(Math.random() * Math.max(1, size - 2));
    const radius = 1 + Math.random() * Math.max(1, size / 15);
    paintBlob(cells, size, cx, cy, radius, 'stone', seed + i * 211 + 37);
  }

  // Цветы — одиночные клетки-вкрапления, а не шум по всей карте.
  const flowerCount = clamp(Math.round(area * 0.035), 4, 28);
  let placed = 0;
  let attempts = 0;
  while (placed < flowerCount && attempts < flowerCount * 40) {
    attempts++;
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const cell = cells[y][x];
    if (!cell || cell.t !== 'grass') continue;
    if (terrainForCell(cell) !== 'grass') continue;
    cell.terrain = 'flowers';
    cell.terrainVariant = terrainVariantFor(x, y, seed + 500 + placed);
    placed++;
  }

  return terrainStats(cells);
}

export function terrainStats(cells) {
  const counts = {};
  TERRAIN_TYPES.forEach(type => { counts[type] = 0; });
  for (const row of cells || []) {
    for (const cell of row || []) {
      const type = terrainForCell(cell);
      counts[type] = (counts[type] || 0) + 1;
    }
  }
  return counts;
}

export function serializeTerrain(maps) {
  return (maps || []).map(map => ({
    index: map.index,
    size: map.size,
    cells: (map.cells || []).map(row => row.map(cell => [
      terrainForCell(cell),
      Number(cell && cell.terrainVariant) || 0
    ]))
  }));
}

export function applyTerrainSnapshot(maps, snapshot) {
  if (!Array.isArray(maps) || !Array.isArray(snapshot)) return false;
  if (maps.length !== snapshot.length) return false;
  for (let i = 0; i < maps.length; i++) {
    const map = maps[i];
    const saved = snapshot[i];
    if (!map || !saved || map.size !== saved.size) return false;
    if (!Array.isArray(saved.cells) || saved.cells.length !== map.size) return false;
    for (let y = 0; y < map.size; y++) {
      const row = map.cells[y];
      const savedRow = saved.cells[y];
      if (!row || !Array.isArray(savedRow) || row.length !== savedRow.length) return false;
      for (let x = 0; x < row.length; x++) {
        const entry = savedRow[x];
        if (!Array.isArray(entry)) continue;
        row[x].terrain = normalizeTerrain(entry[0], baseTerrainForCell(row[x]));
        row[x].terrainVariant = Number(entry[1]) || 0;
      }
    }
  }
  return true;
}

function drawBase(ctx, box, palette) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  if (width <= 0 || height <= 0) return;
  const gradient = ctx.createLinearGradient(0, box.top, 0, box.bottom);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(0.52, palette.base);
  gradient.addColorStop(1, palette.dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(box.left, box.top, width, height);
}

function drawGrassTexture(ctx, box, palette, variant, season) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const area = Math.max(1, width * height);
  const winter = season === 'winter';
  const patchCount = clamp(Math.round(area / 420), 2, 7);
  const bladeCount = clamp(Math.round(area / 105), 6, 22);

  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < patchCount; i++) {
    const seed = variant * 0.0001 + i * 9.31;
    const px = box.left + (0.08 + noise01(seed + 1.3) * 0.84) * width;
    const py = box.top + (0.15 + noise01(seed + 2.7) * 0.7) * height;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.ellipse(px, py, width * (0.06 + noise01(seed + 3.9) * 0.05), height * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (winter) {
    const moundCount = clamp(Math.round(area / 160), 4, 14);
    for (let i = 0; i < moundCount; i++) {
      const seed = variant * 0.0001 + i * 13.7;
      const px = box.left + (0.05 + noise01(seed + 1.1) * 0.9) * width;
      const py = box.top + (0.25 + noise01(seed + 2.3) * 0.7) * height;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.edge;
      ctx.beginPath();
      ctx.ellipse(px, py, width * (0.035 + noise01(seed + 3.1) * 0.035), height * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (noise01(seed + 4.3) > 0.65) {
        ctx.strokeStyle = palette.blade;
        ctx.lineWidth = Math.max(0.7, height * 0.025);
        ctx.beginPath();
        ctx.moveTo(px - width * 0.012, py + height * 0.09);
        ctx.lineTo(px + width * 0.006, py - height * 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  for (let i = 0; i < bladeCount; i++) {
    const seed = variant * 0.0001 + i * 17.17;
    const bx = box.left + (0.04 + noise01(seed + 1.1) * 0.92) * width;
    const by = box.top + (0.38 + noise01(seed + 2.3) * 0.58) * height;
    const bh = (0.2 + noise01(seed + 3.7) * 0.26) * height;
    const lean = (noise01(seed + 4.9) - 0.5) * width * 0.1;
    ctx.fillStyle = i % 3 === 1 ? palette.blade : palette.dark;
    ctx.beginPath();
    ctx.moveTo(bx - width * 0.01, by);
    ctx.quadraticCurveTo(bx + lean * 0.4, by - bh * 0.62, bx + lean, by - bh);
    ctx.quadraticCurveTo(bx + lean * 0.28 + width * 0.012, by - bh * 0.5, bx + width * 0.012, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFlowers(ctx, box, palette, variant, season) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const petals = FLOWER_PETALS[season] || FLOWER_PETALS.summer;
  const count = 4 + Math.floor(noise01(variant * 0.001 + 7.1) * 4);
  const baseSize = clamp(height * 0.085, 1.3, 3.6);

  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const seed = variant * 0.0001 + i * 19.73;
    const fx = box.left + (0.12 + noise01(seed + 1.1) * 0.76) * width;
    const fy = box.top + (0.34 + noise01(seed + 2.7) * 0.56) * height;
    const size = baseSize * (0.78 + noise01(seed + 3.9) * 0.55);
    const stem = size * (1.4 + noise01(seed + 4.3) * 0.8);

    ctx.strokeStyle = palette.blade;
    ctx.lineWidth = Math.max(0.7, size * 0.32);
    ctx.beginPath();
    ctx.moveTo(fx, fy + stem);
    ctx.quadraticCurveTo(fx + (noise01(seed + 5.1) - 0.5) * size, fy + stem * 0.45, fx, fy);
    ctx.stroke();

    const petal = petals[Math.floor(noise01(seed + 6.7) * petals.length) % petals.length];
    for (let p = 0; p < 5; p++) {
      const angle = (Math.PI * 2 * p) / 5 + noise01(seed + p) * 0.3;
      ctx.fillStyle = petal;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(angle) * size, fy + Math.sin(angle) * size, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = season === 'winter' ? '#e0f2fe' : '#fde047';
    ctx.beginPath();
    ctx.arc(fx, fy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(0.4, size * 0.16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawSandTexture(ctx, box, variant) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const area = Math.max(1, width * height);
  const dotCount = clamp(Math.round(area / 115), 5, 16);

  ctx.save();
  ctx.strokeStyle = SAND_PALETTE.dark;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const seed = variant * 0.0001 + i * 23.1;
    const y = box.top + (0.2 + i * 0.27 + noise01(seed) * 0.08) * height;
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.quadraticCurveTo(box.left + width * 0.5, y + (noise01(seed + 2) - 0.5) * height * 0.12, box.right, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < dotCount; i++) {
    const seed = variant * 0.0001 + i * 11.31;
    const x = box.left + (0.04 + noise01(seed + 1.7) * 0.92) * width;
    const y = box.top + (0.18 + noise01(seed + 2.9) * 0.72) * height;
    const rx = width * (0.006 + noise01(seed + 4.9) * 0.012);
    ctx.fillStyle = noise01(seed + 5.3) > 0.5 ? SAND_PALETTE.light : SAND_PALETTE.dark;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawStoneTexture(ctx, box, variant) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const area = Math.max(1, width * height);
  const stoneCount = clamp(Math.round(area / 130), 5, 12);

  ctx.save();
  for (let i = 0; i < stoneCount; i++) {
    const seed = variant * 0.0001 + i * 17.53;
    const cx = box.left + (0.06 + noise01(seed + 2.3) * 0.88) * width;
    const cy = box.top + (0.2 + noise01(seed + 3.1) * 0.64) * height;
    const rx = width * (0.035 + noise01(seed + 4.7) * 0.04);
    const ry = rx * (0.55 + noise01(seed + 5.3) * 0.4);
    const points = 5;
    ctx.beginPath();
    for (let p = 0; p < points; p++) {
      const angle = (Math.PI * 2 * p) / points;
      const rr = 0.72 + noise01(seed + p * 1.7) * 0.42;
      const px = cx + Math.cos(angle) * rx * rr;
      const py = cy + Math.sin(angle) * ry * rr;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = noise01(seed + 6.1) > 0.5 ? STONE_PALETTE.light : STONE_PALETTE.dark;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = Math.max(0.5, height * 0.025);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = STONE_PALETTE.light;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.18, cy - ry * 0.22, rx * 0.32, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawDirtTexture(ctx, box, variant) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const area = Math.max(1, width * height);
  const clodCount = clamp(Math.round(area / 120), 5, 14);

  ctx.save();
  for (let i = 0; i < clodCount; i++) {
    const seed = variant * 0.0001 + i * 15.17;
    const x = box.left + (0.05 + noise01(seed + 2.9) * 0.9) * width;
    const y = box.top + (0.2 + noise01(seed + 3.3) * 0.66) * height;
    const rx = width * (0.008 + noise01(seed + 4.1) * 0.016);
    ctx.fillStyle = noise01(seed + 5.7) > 0.5 ? DIRT_PALETTE.light : DIRT_PALETTE.dark;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.6, noise01(seed + 6.9) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/**
 * Рисует землю внутри уже обрезанного трапециевидного патча.
 * Никаких случайных значений: всё зависит от terrainVariant клетки.
 */
export function drawTerrain(ctx, cell, box, options = {}) {
  const terrain = terrainForCell(cell);
  const variant = Number(cell && cell.terrainVariant) || 0;
  const season = normalizeSeason(options.season);

  if (terrain === 'flowers') {
    const palette = GRASS_PALETTES[season] || GRASS_PALETTES.summer;
    drawBase(ctx, box, palette);
    drawGrassTexture(ctx, box, palette, variant, season);
    drawFlowers(ctx, box, palette, variant, season);
    return;
  }

  if (terrain === 'sand') {
    drawBase(ctx, box, SAND_PALETTE);
    drawSandTexture(ctx, box, variant);
    return;
  }

  if (terrain === 'stone') {
    drawBase(ctx, box, STONE_PALETTE);
    drawStoneTexture(ctx, box, variant);
    return;
  }

  if (terrain === 'dirt') {
    drawBase(ctx, box, DIRT_PALETTE);
    drawDirtTexture(ctx, box, variant);
    return;
  }

  const palette = GRASS_PALETTES[season] || GRASS_PALETTES.summer;
  drawBase(ctx, box, palette);
  drawGrassTexture(ctx, box, palette, variant, season);
}

export function terrainColorFor(cell, season = 'summer') {
  const terrain = terrainForCell(cell);
  const normalized = normalizeSeason(season);
  if (terrain === 'flowers') return (GRASS_PALETTES[normalized] || GRASS_PALETTES.summer).base;
  if (terrain === 'sand') return SAND_PALETTE.base;
  if (terrain === 'stone') return STONE_PALETTE.base;
  if (terrain === 'dirt') return DIRT_PALETTE.base;
  return (GRASS_PALETTES[normalized] || GRASS_PALETTES.summer).base;
}

export { GRASS_PALETTES, FLOWER_PETALS, SAND_PALETTE, STONE_PALETTE, DIRT_PALETTE };
