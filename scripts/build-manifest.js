#!/usr/bin/env node
'use strict';

/**
 * Собирает assets/manifest.json для каталога ассетов игрового хаба.
 *
 * Скрипт сканирует все файлы в папке assets (все подпапки), затем ищет
 * упоминания каждого файла в html/js/css/json четырёх игр:
 *   dungeon     -> games/dungeon28
 *   labyrinth   -> games/labyrinth
 *   dungeon28   -> games/sf2_battles
 *   adventurer  -> games/mm6
 *
 * Проверяются полные пути, короткие имена и динамическая сборка пути
 * (folder + name, шаблонные строки, map(...)). Динамические привязки
 * помечаются в dynamic_in и перечисляются файлы, где они найдены.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets');
const OUT_FILE = path.join(OUT_DIR, 'manifest.json');

// Реальные ассеты проекта лежат в assets.
// Корневую assets тоже проверяем — на случай, если её добавят позже.
const ASSET_ROOTS = ['assets'];

const GAMES = [
  { id: 'dungeon', label: 'Подземелье', dir: 'games/dungeon28' },
  { id: 'labyrinth', label: 'Лабиринт', dir: 'games/labyrinth' },
  { id: 'dungeon28', label: 'Подземелье 28', dir: 'games/sf2_battles' },
  { id: 'adventurer', label: 'Авантюрист', dir: 'games/mm6' },
];

const TEXT_EXT = new Set(['.html', '.js', '.css', '.json']);
const SKIP_DIRS = new Set(['node_modules', '.git', '_Old']);
const TREE_DIR = path.join(OUT_DIR, 'trees');
const TREE_BATCH = path.join(OUT_DIR, 'trees-batch.json');
const TREE_GROUPS = {
  'Trees - Summer': 'Деревья — Лето',
  'Trees - Autumn': 'Деревья — Осень',
  'Trees - Winter': 'Деревья — Зима',
  'Trees - Spring': 'Деревья — Весна',
};
const FLORA_DIR = path.join(OUT_DIR, 'flora');
const FLORA_BATCH = path.join(OUT_DIR, 'flora-batch.json');
const FLORA_GROUPS = {
  Flora: 'Флора',
};
const MOUNTAIN_DIR = path.join(OUT_DIR, 'mountains');
const MOUNTAIN_BATCH = path.join(OUT_DIR, 'mountains-batch.json');
const MOUNTAIN_GROUPS = {
  Mountains: 'Горы',
};
// Мастер-здания живут вне assets, поэтому приходят отдельным батчем.
// sign_text хранится здесь — движок берёт название вывески из манифеста,
// в SVG текст не вшит.
const BUILDINGS_BATCH = path.join(OUT_DIR, 'buildings-batch.json');
const BUILDINGS_GROUPS = {
  Buildings: 'Здания',
};
const KNOWN_FOLDERS = new Set(['items', 'ui', 'monsters', 'heroes', 'tiles', 'wildlife']);
const HAS_EXT_RE = /\.(png|svg|webp|jpe?g)/i;
const END_EXT_RE = /\.(png|svg|webp|jpe?g)(?:[?#].*)?$/i;

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relRoot(absPath) {
  return toPosix(path.relative(ROOT, absPath));
}

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (abs === OUT_FILE) continue;
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function detectType(relAsset, file) {
  const rel = relAsset.toLowerCase();
  const name = file.toLowerCase();
  const base = name.replace(/\.[^.]+$/, '');

  if (rel.startsWith('sprites/heroes/') || rel.startsWith('heroes/')) return 'character';
  if (rel.startsWith('sprites/monsters/') || rel.startsWith('monsters/')) return 'enemy';
  if (rel.startsWith('wildlife/') || rel.startsWith('sprites/wildlife/')) return 'wildlife';
  if (rel.startsWith('sprites/ui/') || rel.startsWith('ui/')) return 'ui';
  if (
    rel.startsWith('sprites/tiles/') ||
    rel.startsWith('tiles/') ||
    base.startsWith('tile_') ||
    base.startsWith('tiles_')
  ) {
    return 'tile';
  }
  if (base.startsWith('herb_') || base === 'herb') return 'herb';
  if (base.startsWith('shield') || base.startsWith('robe') || base.startsWith('armor_')) return 'armor';
  if (/^(dagger|mace|staff|bow|arrow|quiver|sword|axe|weapon|hammer|spear|katana|knife|machete|cleaver)/.test(base)) {
    return 'weapon';
  }
  // Корневые иконки-эффекты из sprites/ — это UI, а не предметы.
  if (/^sprites\/[^/]+$/.test(rel) && /^(star|lightning|coin)/.test(base)) return 'ui';
  return 'item';
}

function collectAssets() {
  const byAbs = new Map();

  for (const root of ASSET_ROOTS) {
    const rootDir = path.resolve(ROOT, root);
    if (!fs.existsSync(rootDir)) continue;
    for (const abs of walk(rootDir)) {
      // В манифест попадают только файлы ассетов, не служебные .js/.json.
      // Деревья, флора и горы добавляются отдельными батчами в конец манифеста.
      if (
        !HAS_EXT_RE.test(abs) ||
        abs.startsWith(TREE_DIR + path.sep) ||
        abs.startsWith(FLORA_DIR + path.sep) ||
        abs.startsWith(MOUNTAIN_DIR + path.sep)
      ) continue;
      if (byAbs.has(abs)) continue;
      const relAsset = toPosix(path.relative(rootDir, abs));
      byAbs.set(abs, { abs, root: rootDir, relAsset });
    }
  }

  return [...byAbs.values()].map(({ abs, relAsset }) => {
    const file = path.basename(abs);
    const stem = file.replace(/\.[^.]+$/, '');
    const folderMatch = relAsset.match(/^sprites\/([^/]+)\//);
    let folder = folderMatch ? folderMatch[1].toLowerCase() : null;
    if (!folder && /^sprites\/[^/]+$/.test(relAsset)) folder = 'sprites';
    if (!folder) {
      const first = relAsset.split('/')[0];
      folder = first ? first.toLowerCase() : null;
    }

    return {
      key: relRoot(abs),
      file,
      stem,
      relAsset,
      path: relRoot(abs),
      folder,
      type: detectType(relAsset, file),
    };
  });
}

function collectFolderVars(content) {
  const vars = new Map();
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = re.exec(content))) {
    const folder = folderFromPath(match[3]);
    if (folder) vars.set(match[1], folder);
  }
  return vars;
}

function collectQuotedStems(content) {
  const stems = new Set();
  const re = /(['"`])([a-z0-9_\-]+)\1/gi;
  let match;
  while ((match = re.exec(content))) stems.add(match[2].toLowerCase());
  return stems;
}

function folderFromPath(value) {
  const sprites = value.match(/sprites\/([^/]+)\/?/i);
  if (sprites) {
    const folder = sprites[1].toLowerCase();
    if (KNOWN_FOLDERS.has(folder)) return folder;
  }
  const last = value.match(/([^/]+)\/?$/);
  if (last) {
    const folder = last[1].toLowerCase();
    if (KNOWN_FOLDERS.has(folder)) return folder;
  }
  return null;
}

function folderFromPrefix(prefix) {
  const sprites = prefix.match(/sprites\/([^/]+)\/?/i);
  if (sprites) {
    const folder = sprites[1].toLowerCase();
    if (KNOWN_FOLDERS.has(folder)) return folder;
  }
  const last = prefix.match(/([^/'"`]+)\/?$/);
  if (last) {
    const folder = last[1].toLowerCase();
    if (KNOWN_FOLDERS.has(folder)) return folder;
  }
  if (/sprites\/?$/i.test(prefix)) return 'sprites';
  return null;
}

function folderContext(line, folderVars) {
  const context = new Set();
  const re = /(?:^|[\/\\'"`])(items|ui|monsters|heroes|tiles|wildlife)\//gi;
  let match;
  while ((match = re.exec(line))) context.add(match[1].toLowerCase());

  for (const [name, folder] of folderVars) {
    const reVar = new RegExp('(^|[^A-Za-z0-9_$])' + escapeRe(name) + '(?![A-Za-z0-9_$])');
    if (reVar.test(line)) context.add(folder);
  }
  return context;
}

function extractMapVar(line) {
  const match = line.match(/\bmap\s*\(\s*([A-Za-z_$][\w$]*)/);
  return match ? match[1] : null;
}

function hasDynamicVar(line, folderVars) {
  if (/\$\{[^}]+\}/.test(line)) return true;
  const re = /\+\s*([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = re.exec(line))) {
    if (!folderVars.has(match[1])) return true;
  }
  return false;
}

function collectTexts(game) {
  const dir = path.join(ROOT, game.dir);
  const files = walk(dir).filter((abs) => TEXT_EXT.has(path.extname(abs).toLowerCase()));

  return files.map((abs) => {
    let content = fs.readFileSync(abs, 'utf8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    return {
      abs,
      rel: relRoot(abs),
      content,
      lines: content.split(/\r?\n/),
      folderVars: collectFolderVars(content),
      quotedStems: collectQuotedStems(content),
    };
  });
}

function findDirectRefs(asset, texts, uniqueBasenames) {
  const refs = new Set();
  const baseRe = new RegExp(
    '(^|[^A-Za-z0-9_])' + escapeRe(asset.file) + '(?![A-Za-z0-9_])',
    'i'
  );

  for (const text of texts) {
    if (text.content.includes(asset.relAsset)) {
      refs.add(text.rel);
      continue;
    }

    for (const line of text.lines) {
      if (!baseRe.test(line)) continue;
      const context = folderContext(line, text.folderVars);

      if (context.size === 0) {
        // Без папки короткое имя безопасно только если оно уникально.
        if (uniqueBasenames.has(asset.file.toLowerCase())) refs.add(text.rel);
      } else if (asset.folder && context.has(asset.folder)) {
        refs.add(text.rel);
      }
    }
  }

  return refs;
}

function findDynamicEvents(text) {
  const events = [];
  const seen = new Set();

  function addEvent(event) {
    const key = event.folder + '|' + event.file + '|' + event.line + '|' + (event.mapVar || '');
    if (seen.has(key)) return;
    seen.add(key);
    events.push(event);
  }

  for (let i = 0; i < text.lines.length; i++) {
    const line = text.lines[i];
    if (!HAS_EXT_RE.test(line)) continue;

    // Шаблонные строки: `assets/sprites/monsters/${name}.png`
    const tplRe = /`([^`]*)`/g;
    let tpl;
    while ((tpl = tplRe.exec(line))) {
      const literal = tpl[1];
      if (!END_EXT_RE.test(literal) || !literal.includes('${')) continue;

      const start = literal.indexOf('${');
      const prefix = literal.slice(0, start);
      const folder = folderFromPrefix(prefix);
      if (!folder) continue;

      const end = literal.indexOf('}', start);
      const varName = end > start ? literal.slice(start + 2, end).trim() : '';
      addEvent({ folder, file: text.rel, line: i + 1, varName, mapVar: extractMapVar(line) });
    }

    // Конкатенация: '.../monsters/' + name + '.png'
    const litRe = /(['"])([^'"]*?)\1/g;
    const literals = [];
    let lit;
    while ((lit = litRe.exec(line))) {
      literals.push({ value: lit[2], index: lit.index, end: lit.index + lit[0].length });
    }

    for (let a = 0; a < literals.length; a++) {
      const folder = folderFromPrefix(literals[a].value);
      if (!folder) continue;

      for (let b = a + 1; b < literals.length; b++) {
        if (!END_EXT_RE.test(literals[b].value)) continue;
        const between = line.slice(literals[a].end, literals[b].index);
        // Другие строковые литералы между папкой и расширением — это
        // перечисление файлов, а не динамическая сборка пути.
        const betweenNoStrings = between.replace(/(['"])(?:\\.|(?!\1).)*\1/g, '');
        if (!/[A-Za-z_$]/.test(betweenNoStrings)) continue;

        const varMatch = betweenNoStrings.match(/([A-Za-z_$][\w$]*(?:\.[\w$]+|\[[^\]]+\])?)/);
        addEvent({
          folder,
          file: text.rel,
          line: i + 1,
          varName: varMatch ? varMatch[1] : '',
          mapVar: extractMapVar(line),
        });
        break;
      }
    }

    // Динамика через переменную-папку: M + name + '.png'
    const context = folderContext(line, text.folderVars);
    if (context.size && hasDynamicVar(line, text.folderVars)) {
      for (const folder of context) {
        addEvent({ folder, file: text.rel, line: i + 1, varName: '', mapVar: extractMapVar(line) });
      }
    }
  }

  return events;
}

function buildManifest(assets, games) {
  const basenameCounts = new Map();
  for (const asset of assets) {
    const key = asset.file.toLowerCase();
    basenameCounts.set(key, (basenameCounts.get(key) || 0) + 1);
  }
  const uniqueBasenames = new Set(
    [...basenameCounts.entries()].filter(([, count]) => count === 1).map(([name]) => name)
  );

  const assetsByFolder = new Map();
  for (const asset of assets) {
    if (!asset.folder) continue;
    if (!assetsByFolder.has(asset.folder)) assetsByFolder.set(asset.folder, []);
    assetsByFolder.get(asset.folder).push(asset);
  }

  const directByGame = new Map();
  const dynamicByGame = new Map();

  for (const game of games) {
    const texts = collectTexts(game);

    const direct = new Map();
    for (const asset of assets) {
      const refs = findDirectRefs(asset, texts, uniqueBasenames);
      if (refs.size) direct.set(asset.key, refs);
    }
    directByGame.set(game.id, direct);

    const dynamic = new Map();
    for (const text of texts) {
      for (const event of findDynamicEvents(text)) {
        const candidates = event.folder === 'sprites'
          ? assets
          : assetsByFolder.get(event.folder) || [];
        if (!candidates.length) continue;

        let targets = candidates;
        if (event.mapVar) {
          // Для .map(n => `.../${n}.png`) берём реальные имена из массивов файла.
          const matched = candidates.filter((asset) => text.quotedStems.has(asset.stem));
          if (matched.length) targets = matched;
        }

        for (const asset of targets) {
          if (!dynamic.has(asset.key)) dynamic.set(asset.key, new Set());
          dynamic.get(asset.key).add(text.rel);
        }
      }
    }
    dynamicByGame.set(game.id, dynamic);
  }

  return assets.map((asset) => {
    const usedIn = [];
    const refs = new Set();
    const dynamicIn = {};

    for (const game of games) {
      const direct = directByGame.get(game.id).get(asset.key);
      const dynamic = dynamicByGame.get(game.id).get(asset.key);

      if (direct || dynamic) usedIn.push(game.id);
      if (direct) for (const ref of direct) refs.add(ref);
      if (dynamic) {
        const list = [...dynamic].sort((a, b) => a.localeCompare(b, 'ru'));
        dynamicIn[game.id] = list;
        for (const ref of list) refs.add(ref);
      }
    }

    return {
      file: asset.file,
      path: asset.path,
      type: asset.type,
      used_in: usedIn,
      refs: [...refs].sort((a, b) => a.localeCompare(b, 'ru')),
      dynamic: Object.keys(dynamicIn).length > 0,
      dynamic_in: dynamicIn,
    };
  });
}

// Деревья, флора и горы приходят отдельными батчами: их записи дописываются
// в конец манифеста без пересортировки, с человекочитаемыми названиями групп.
function collectBatchEntries(batchFile, groupLabels) {
  if (!fs.existsSync(batchFile)) return [];
  const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
  return batch.map((entry) => ({
    ...entry,
    // Поле file нужно каталогу ассетов на главной странице.
    file: path.basename(entry.path),
    group: groupLabels[entry.group] || entry.group,
    used_in: entry.used_in || [],
    refs: entry.refs || [],
    dynamic: entry.dynamic || false,
    dynamic_in: entry.dynamic_in || {},
  }));
}

function main() {
  const assets = collectAssets().sort((a, b) =>
    a.path.localeCompare(b.path, 'ru', { numeric: true, sensitivity: 'base' })
  );

  if (!assets.length) {
    console.error('Не найдено ни одного файла в assets.');
    process.exitCode = 1;
    return;
  }

  const legacy = buildManifest(assets, GAMES);
  const trees = collectBatchEntries(TREE_BATCH, TREE_GROUPS);
  const flora = collectBatchEntries(FLORA_BATCH, FLORA_GROUPS);
  const mountains = collectBatchEntries(MOUNTAIN_BATCH, MOUNTAIN_GROUPS);
  const buildings = collectBatchEntries(BUILDINGS_BATCH, BUILDINGS_GROUPS);
  const manifest = [...legacy, ...trees, ...flora, ...mountains, ...buildings];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const used = legacy.filter((entry) => entry.used_in.length).length;
  const dynamic = legacy.filter((entry) => entry.dynamic).length;

  console.log('manifest: ' + relRoot(OUT_FILE));
  console.log('assets: ' + manifest.length + ', used: ' + used + ', dynamic: ' + dynamic);
  console.log('  trees: ' + trees.length + ', flora: ' + flora.length + ', mountains: ' + mountains.length);
  console.log('  buildings: ' + buildings.length);
  for (const game of GAMES) {
    const count = legacy.filter((entry) => entry.used_in.includes(game.id)).length;
    console.log('  ' + game.label + ': ' + count);
  }
}

main();
