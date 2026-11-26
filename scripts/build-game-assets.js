#!/usr/bin/env node
'use strict';

/**
 * Единый источник ассетов: конвертация мастер-файлов и сборка спрайтов игр.
 *
 * Примеры:
 *   node scripts/build-game-assets.js --convert
 *   node scripts/build-game-assets.js --config config/dungeon28.json --only hero_knight_0
 *   node scripts/build-game-assets.js --config config/dungeon28.json --inline
 *
 * Мастер-папка по умолчанию: shared/assets/master.
 * Конфиг игры описывает слои (фон -> подставка -> персонаж) и имя итогового SVG.
 * Итоговый SVG ссылается на файлы мастер-папки (или встраивает их при --inline),
 * поэтому дубликаты PNG в папках игр больше не нужны.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_MASTER = path.join(ROOT, 'shared', 'assets', 'master');
const DEFAULT_OUTPUT = path.join('assets', 'sprites', 'generated');
const LINK_DEPTH = 5;
const REGISTRY_NAME = 'registry.json';
const ALPHA_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    master: DEFAULT_MASTER,
    config: null,
    game: null,
    only: null,
    convert: false,
    inline: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Для ${arg} нужно значение`);
      }
      i += 1;
      return next;
    };

    switch (arg) {
      case '--master': args.master = path.resolve(ROOT, value()); break;
      case '--config': args.config = path.resolve(ROOT, value()); break;
      case '--game': args.game = value(); break;
      case '--only': args.only = value(); break;
      case '--convert': args.convert = true; break;
      case '--inline': args.inline = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default: throw new Error(`Неизвестный аргумент: ${arg}`);
    }
  }

  if (!args.config && args.game) {
    args.config = path.join(ROOT, 'config', `${args.game}.json`);
  }
  return args;
}

function printHelp() {
  console.log(`Использование:
  node scripts/build-game-assets.js --convert
  node scripts/build-game-assets.js --config config/dungeon28.json [--only recipeId] [--inline]

  --master <папка>   источник ассетов (по умолчанию shared/assets/master)
  --config <файл>    конфиг игры с рецептами слоёв
  --game <id>        взять config/<id>.json
  --only <id>        собрать только один рецепт
  --inline           встроить PNG в итоговый SVG (автономный файл)
  --convert          запустить конвертацию мастер-PNG в SVG-обёртки + registry.json
`);
}

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relFromRoot(abs) {
  return toPosix(path.relative(ROOT, abs));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (/\.(png|svg)$/i.test(entry.name)) out.push(abs);
  }
  return out;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Минимальный PNG-декодер (8-bit RGBA, без interlace) без внешних зависимостей.
// Нужен только для alpha-bbox (auto-crop) и оценки качества автотрассировки.
// ---------------------------------------------------------------------------

function decodePng(file) {
  const buf = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(signature)) {
    throw new Error(`${relFromRoot(file)}: не PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (offset + 12 + length > buf.length) throw new Error(`${relFromRoot(file)}: битый chunk`);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(
      `${relFromRoot(file)}: поддерживаются только 8-bit RGBA PNG без interlace ` +
      `(получено bit=${bitDepth}, colorType=${colorType}, interlace=${interlace})`
    );
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.allocUnsafe(stride * height);
  let pos = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos++];
    const rowStart = y * stride;
    const prevStart = rowStart - stride;

    for (let x = 0; x < stride; x += 1) {
      const value = raw[pos++];
      const a = x >= 4 ? pixels[rowStart + x - 4] : 0;
      const b = y > 0 ? pixels[prevStart + x] : 0;
      const c = y > 0 && x >= 4 ? pixels[prevStart + x - 4] : 0;
      let result;

      switch (filter) {
        case 0: result = value; break;
        case 1: result = value + a; break;
        case 2: result = value + b; break;
        case 3: result = value + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          result = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`${relFromRoot(file)}: неизвестный PNG-фильтр ${filter}`);
      }
      pixels[rowStart + x] = result & 0xff;
    }
  }

  return { width, height, pixels };
}

function alphaBBox(png, threshold = ALPHA_THRESHOLD) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    const rowStart = y * png.width * 4;
    for (let x = 0; x < png.width; x += 1) {
      if (png.pixels[rowStart + x * 4 + 3] <= threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { x: 0, y: 0, width: png.width, height: png.height };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function sampleColors(png, sampleStep, levels = 8) {
  const colors = new Set();
  for (let y = 0; y < png.height; y += sampleStep) {
    for (let x = 0; x < png.width; x += sampleStep) {
      const i = (y * png.width + x) * 4;
      if (png.pixels[i + 3] <= ALPHA_THRESHOLD) continue;
      const r = png.pixels[i] >> (8 - levels);
      const g = png.pixels[i + 1] >> (8 - levels);
      const b = png.pixels[i + 2] >> (8 - levels);
      colors.add((r << 16) | (g << 8) | b);
      if (colors.size > 4096) return colors.size;
    }
  }
  return colors.size;
}

// ---------------------------------------------------------------------------
// Автоматическая конвертация PNG -> SVG
// ---------------------------------------------------------------------------

/**
 * Пробная автотрассировка: усреднение до 64x64 + квантование палитры.
 * Возвращает оценку средней ошибки (0..255). Используется только для решения,
 * можно ли считать PNG кандидатом на автоматическую векторизацию.
 */
function estimateTraceError(png, grid = 64, levels = 4) {
  const colors = new Map();
  const cellW = png.width / grid;
  const cellH = png.height / grid;
  const sums = new Float64Array(grid * grid * 4);
  const counts = new Float64Array(grid * grid);

  for (let y = 0; y < png.height; y += 1) {
    const gy = Math.min(grid - 1, Math.floor(y / cellH));
    const rowStart = y * png.width * 4;
    for (let x = 0; x < png.width; x += 1) {
      const gx = Math.min(grid - 1, Math.floor(x / cellW));
      const cell = gy * grid + gx;
      const i = rowStart + x * 4;
      const alpha = png.pixels[i + 3];
      sums[cell * 4] += png.pixels[i] * alpha;
      sums[cell * 4 + 1] += png.pixels[i + 1] * alpha;
      sums[cell * 4 + 2] += png.pixels[i + 2] * alpha;
      sums[cell * 4 + 3] += alpha;
      counts[cell] += 1;
    }
  }

  const cells = [];
  for (let c = 0; c < grid * grid; c += 1) {
    if (counts[c] === 0) continue;
    const a = sums[c * 4 + 3] / counts[c];
    if (a <= ALPHA_THRESHOLD) continue;
    const rgb = [0, 1, 2].map((k) => Math.round(sums[c * 4 + k] / sums[c * 4 + 3]));
    const key = rgb.map((v) => Math.min(levels - 1, v >> (8 - Math.log2(levels)))).join(',');
    colors.set(key, (colors.get(key) || 0) + 1);
    cells.push({ rgb, key, alpha: a });
  }

  if (!cells.length) return 0;
  const dominant = [...colors.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  const shift = 8 - Math.log2(levels);

  let error = 0;
  for (const cell of cells) {
    for (let k = 0; k < 3; k += 1) {
      error += Math.abs(cell.rgb[k] - (dominant[k] << shift));
    }
  }
  return error / (cells.length * 3);
}

function convertMaster(masterDir) {
  ensureDir(masterDir);
  const registry = {
    generatedAt: new Date().toISOString(),
    master: relFromRoot(masterDir),
    policy: {
      autoTraceGrid: 64,
      maxPaletteColors: 16,
      maxMeanError: 10,
    },
    assets: [],
  };

  for (const file of walk(masterDir).sort()) {
    if (!/\.png$/i.test(file)) continue;
    const png = decodePng(file);
    const bbox = alphaBBox(png);
    const colors = sampleColors(png, Math.max(1, Math.floor(Math.min(png.width, png.height) / 256)));
    const meanError = estimateTraceError(png);
    const autoVector = colors <= registry.policy.maxPaletteColors && meanError <= registry.policy.maxMeanError;
    const svgFile = file.replace(/\.png$/i, '.svg');

    // SVG-обёртка без потерь:.setImage ссылается на исходный PNG в master.
    // Она работает в любом браузере и позволяет собирать слои без копирования PNG.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${png.width}" height="${png.height}" viewBox="0 0 ${png.width} ${png.height}">
  <title>${xmlEscape(path.basename(file))} — raster-in-SVG обёртка мастер-ассета</title>
  <image href="${xmlEscape(path.basename(file))}" x="0" y="0" width="${png.width}" height="${png.height}"/>
</svg>
`;
    fs.writeFileSync(svgFile, svg, 'utf8');

    registry.assets.push({
      file: relFromRoot(file),
      svg: relFromRoot(svgFile),
      width: png.width,
      height: png.height,
      alphaBBox: bbox,
      sampledColors: colors,
      autoTraceMeanError: Math.round(meanError * 100) / 100,
      vectorization: autoVector ? 'auto' : 'requires_manual_vectorization',
      note: autoVector
        ? 'Автотрассировка прошла порог качества'
        : 'Автовекторизация даёт плохое качество: PNG сохранён, SVG — обёртка над PNG',
    });
  }

  fs.writeFileSync(path.join(masterDir, REGISTRY_NAME), JSON.stringify(registry, null, 2) + '\n', 'utf8');
  const pending = registry.assets.filter((a) => a.vectorization === 'requires_manual_vectorization').length;
  console.log(
    `Конвертация: ${registry.assets.length} PNG, SVG-обёрток: ${registry.assets.length}, ` +
    `требует ручной векторизации: ${pending}`
  );
  return registry;
}

// ---------------------------------------------------------------------------
// Сборка слоёв
// ---------------------------------------------------------------------------

function loadRegistry(masterDir) {
  const file = path.join(masterDir, REGISTRY_NAME);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function svgSize(file) {
  const text = fs.readFileSync(file, 'utf8');
  const root = text.match(/<svg\b[^>]*>/i);
  if (!root) throw new Error(`${relFromRoot(file)}: нет корневого <svg>`);
  const tag = root[0];
  const width = tag.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const height = tag.match(/\bheight\s*=\s*["']([\d.]+)/i);
  const viewBox = tag.match(/\bviewBox\s*=\s*["']\s*(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (width && height) {
    return { width: Number(width[1]), height: Number(height[1]) };
  }
  if (viewBox) {
    return { width: Number(viewBox[3]), height: Number(viewBox[4]) };
  }
  throw new Error(`${relFromRoot(file)}: не удалось определить размер`);
}

function resolveAsset(masterDir, ref, registry) {
  const clean = ref.replace(/^\.\//, '');
  const file = path.resolve(masterDir, clean);
  if (!file.startsWith(masterDir + path.sep)) {
    throw new Error(`Слой Outside master: ${ref}`);
  }
  if (!fs.existsSync(file)) throw new Error(`Нет ассета: ${relFromRoot(file)}`);

  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') {
    const known = registry && registry.assets.find((a) => a.file === relFromRoot(file));
    const png = decodePng(file);
    return {
      file,
      ext,
      width: png.width,
      height: png.height,
      bbox: known ? known.alphaBBox : alphaBBox(png),
      png,
    };
  }
  const size = svgSize(file);
  return { file, ext, width: size.width, height: size.height, bbox: size };
}

function alignBBox(layer, placement) {
  const box = { ...layer.bbox };
  const overrides = placement && placement.bbox ? { ...placement.bbox } : placement || {};
  if (overrides.x !== undefined) box.x = Number(overrides.x);
  if (overrides.y !== undefined) box.y = Number(overrides.y);
  if (overrides.width !== undefined) box.width = Number(overrides.width);
  if (overrides.height !== undefined) box.height = Number(overrides.height);
  return box;
}

function buildRecipe(masterDir, outputDir, recipe, config, registry, inline) {
  const layers = [...(config.defaultLayers || []), ...(recipe.layers || [])];
  if (!layers.length) throw new Error(`Рецепт ${recipe.id}: нет слоёв`);

  const outputFile = path.resolve(outputDir, recipe.output || `${recipe.id}.svg`);
  const outputFileDir = path.dirname(outputFile);
  const boxes = [];
  const rendered = [];

  for (const layer of layers) {
    const assetRef = typeof layer === 'string' ? layer : layer.asset;
    const asset = resolveAsset(masterDir, assetRef, registry);
    const box = alignBBox(asset, typeof layer === 'object' ? layer : null);

    let href = '../'.repeat(LINK_DEPTH) + toPosix(path.relative(ROOT, asset.file));
    if (inline && asset.ext === '.png') {
      const base64 = asset.png.pixels.length
        ? fs.readFileSync(asset.file).toString('base64')
        : '';
      href = `data:image/png;base64,${base64}`;
    } else if (inline && asset.ext === '.svg') {
      href = `data:image/svg+xml;base64,${fs.readFileSync(asset.file).toString('base64')}`;
    }

    boxes.push(box);
    rendered.push(
      `  <image href="${xmlEscape(href)}" x="0" y="0" width="${asset.width}" height="${asset.height}" ` +
      `preserveAspectRatio="none"/>`
    );
  }

  const padding = Number(recipe.padding ?? config.padding ?? 0);
  const minX = Math.min(...boxes.map((b) => b.x)) - padding;
  const minY = Math.min(...boxes.map((b) => b.y)) - padding;
  const maxX = Math.max(...boxes.map((b) => b.x + b.width)) + padding;
  const maxY = Math.max(...boxes.map((b) => b.y + b.height)) + padding;
  const cropWidth = Math.max(1, Math.round(maxX - minX));
  const cropHeight = Math.max(1, Math.round(maxY - minY));

  ensureDir(outputFileDir);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `viewBox="${minX} ${minY} ${cropWidth} ${cropHeight}" width="${cropWidth}" height="${cropHeight}">`,
    `  <title>${xmlEscape(recipe.id)}</title>`,
    ...rendered,
    `</svg>`,
    '',
  ].join('\n');
  fs.writeFileSync(outputFile, svg, 'utf8');

  return {
    id: recipe.id,
    output: relFromRoot(outputFile),
    bytes: fs.statSync(outputFile).size,
    viewBox: `${minX} ${minY} ${cropWidth} ${cropHeight}`,
    layers: layers.map((l) => (typeof l === 'string' ? l : l.asset)),
  };
}

function expandGroups(config, masterDir) {
  const recipes = [...(config.recipes || [])];

  for (const group of config.recipeGroups || []) {
    const sourceDir = path.resolve(masterDir, group.sourceDir || '');
    if (!fs.existsSync(sourceDir)) continue;
    const exts = (group.extensions || ['.png']).map((e) => e.toLowerCase());

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !exts.includes(path.extname(entry.name).toLowerCase())) continue;
      const stem = path.basename(entry.name, path.extname(entry.name));
      const sourceRel = toPosix(path.relative(masterDir, path.join(sourceDir, entry.name)));
      const layers = (group.layers || []).map((layer) => {
        if (typeof layer === 'string') {
          return layer.replace('{source}', sourceRel);
        }
        return { ...layer, asset: layer.asset.replace('{source}', sourceRel) };
      });
      recipes.push({
        id: `${group.idPrefix || ''}${stem}`,
        layers,
        padding: group.padding,
        output: (group.outputPattern || '{stem}.svg')
          .replace('{stem}', stem)
          .replace('{game}', config.game || ''),
      });
    }
  }

  return recipes;
}

function build(configPath, masterDir, only, inline) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const registry = loadRegistry(masterDir);
  const outputDir = path.resolve(ROOT, config.output || DEFAULT_OUTPUT);
  const canonicalOutput = path.resolve(ROOT, DEFAULT_OUTPUT);
  if (path.relative(canonicalOutput, outputDir).startsWith('..')) {
    throw new Error(`Output outside canonical folder: ${relFromRoot(outputDir)}`);
  }
  const allRecipes = expandGroups(config, masterDir);
  const recipes = only ? allRecipes.filter((r) => r.id === only) : allRecipes;
  if (!recipes.length) throw new Error(`Рецепты не найдены${only ? `: ${only}` : ''}`);

  const results = recipes.map((recipe) => buildRecipe(masterDir, outputDir, recipe, config, registry, inline));
  console.log(JSON.stringify({ config: relFromRoot(configPath), assets: results }, null, 2));
  return results;
}

// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.convert) convertMaster(args.master);
  if (args.config) build(args.config, args.master, args.only, args.inline);
  if (!args.convert && !args.config) printHelp();
}

try {
  main();
} catch (error) {
  console.error(`[build-game-assets] ${error.message}`);
  process.exitCode = 1;
}
