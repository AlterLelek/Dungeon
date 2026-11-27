#!/usr/bin/env node
'use strict';

/**
 * Собирает docs/ASSET_HANDOFF.md — таблицу для передачи в другой чат.
 *
 * Стиль и колонки повторяют каталог ассетов в корневом index.html, но
 * дополнены обозначением (пиктограммой), иерархией и парой PNG/SVG.
 * Источники:
 *   assets/manifest.json             — каталог хаба (827 записей);
 *   shared/assets/master/registry.json — мастер-PNG и их SVG-обёртки;
 *   все .svg/.png файлы репозитория  — чтобы ничего не потерять.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'ASSET_HANDOFF.md');
const MANIFEST = path.join(ROOT, 'assets', 'manifest.json');
const REGISTRY = path.join(ROOT, 'shared', 'assets', 'master', 'registry.json');

const SKIP_DIRS = new Set(['.git', 'node_modules', '_Old']);
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json']);
// Служебные данные и сам отчёт не считаются привязкой к игре.
const DATA_FILES = new Set([
  'assets/manifest.json',
  'shared/assets/master/registry.json',
  'assets/buildings-batch.json',
  'assets/flora-batch.json',
  'assets/mountains-batch.json',
  'assets/trees-batch.json',
  'docs/ASSET_HANDOFF.md'
]);

const GAME_LABEL = {
  dungeon: 'Подземелье',
  labyrinth: 'Лабиринт',
  dungeon28: 'Подземелье 28',
  adventurer: 'Авантюрист'
};

const GROUPS = [
  { id: 'character', label: 'Персонажи', icon: '🧙' },
  { id: 'enemy', label: 'Враги', icon: '👹' },
  { id: 'weapon', label: 'Оружие', icon: '⚔' },
  { id: 'armor', label: 'Броня', icon: '🛡' },
  { id: 'item', label: 'Предметы', icon: '🎒' },
  { id: 'herb', label: 'Травы', icon: '🌿' },
  { id: 'flora', label: 'Флора', icon: '🌸', group: 'Флора' },
  { id: 'wildlife', label: 'Животные', icon: '🐾' },
  { id: 'mountain', label: 'Горы', icon: '⛰', group: 'Горы' },
  { id: 'tile', label: 'Тайлы', icon: '🧱' },
  { id: 'ui', label: 'UI', icon: '🪙' },
  { id: 'tree-summer', label: 'Деревья — Лето', icon: '🌳', group: 'Деревья — Лето' },
  { id: 'tree-autumn', label: 'Деревья — Осень', icon: '🍂', group: 'Деревья — Осень' },
  { id: 'tree-winter', label: 'Деревья — Зима', icon: '❄', group: 'Деревья — Зима' },
  { id: 'tree-spring', label: 'Деревья — Весна', icon: '🌱', group: 'Деревья — Весна' },
  { id: 'building', label: 'Здания', icon: '🏠', group: 'Здания' },
  { id: 'master-heroes', label: 'Мастер › Герои', icon: '🧙' },
  { id: 'master-monsters', label: 'Мастер › Монстры', icon: '👹' },
  { id: 'master-items', label: 'Мастер › Предметы', icon: '🎒' },
  { id: 'master-ui', label: 'Мастер › UI', icon: '🪙' },
  { id: 'master-props', label: 'Мастер › Реквизит', icon: '🪵' },
  { id: 'master-stages', label: 'Мастер › Сцены', icon: '🎭' },
  { id: 'dungeon28-items', label: 'Подземелье 28 › Предметы', icon: '⚔' }
];

// Канонические обозначения зданий приходят из buildings-batch.json
// (поле sign_icon). Остальные пиктограммы — навигационные, по категории.
const SIGN_ICONS = {
  house: '🏠', barn: '🌾', well: '💧', anvil_hammer: '🔨', coin_sack: '🪙',
  mug: '🍺', shed: '🛖', stable: '🐎', shield_sword: '⚔', ring_gem: '💍',
  scroll: '📜', bed: '🛏'
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function posix(rel) {
  return rel.split(path.sep).join('/');
}

function rel(abs) {
  return posix(path.relative(ROOT, abs));
}

function cell(value) {
  return String(value == null ? '—' : value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));

const manifestByPath = new Map(manifest.map((entry) => [entry.path, entry]));
const registryBySvg = new Map(
  registry.assets.filter((entry) => entry.svg).map((entry) => [entry.svg, entry])
);
const registryByPng = new Map(
  registry.assets.filter((entry) => entry.file).map((entry) => [entry.file, entry])
);

const allFiles = walk(ROOT).map((abs) => ({ abs, rel: rel(abs) }));
const allSvg = allFiles.filter((file) => /\.svg$/i.test(file.rel));
const allPng = allFiles.filter((file) => /\.png$/i.test(file.rel));
const textFiles = allFiles
  .filter((file) => TEXT_EXT.has(path.extname(file.rel).toLowerCase()))
  .filter((file) => !DATA_FILES.has(file.rel))
  .map((file) => ({
    rel: file.rel,
    text: fs.readFileSync(file.abs, 'utf8')
  }));

// У сгенерированных композиций тип в манифесте общий (item), но <title>
// говорит, что именно изображено: hero_, monster_ или item_.
function generatedKind(relPath) {
  if (!relPath.startsWith('assets/sprites/generated/') || !/\.svg$/i.test(relPath)) return null;
  const match = fs.readFileSync(path.join(ROOT, relPath), 'utf8').match(/<title>([^<]+)<\/title>/i);
  if (!match) return null;
  if (/^hero_/i.test(match[1])) return 'character';
  if (/^monster_/i.test(match[1])) return 'enemy';
  return 'item';
}

function groupFor(relPath, entry) {
  const generated = generatedKind(relPath);
  if (generated && GROUPS.some((group) => group.id === generated)) return generated;
  if (entry) {
    const byGroup = entry.group
      ? GROUPS.find((group) => group.group === entry.group)
      : null;
    if (byGroup) return byGroup.id;
    if (GROUPS.some((group) => group.id === entry.type)) return entry.type;
  }
  if (relPath.startsWith('shared/assets/master/heroes/')) return 'master-heroes';
  if (relPath.startsWith('shared/assets/master/monsters/')) return 'master-monsters';
  if (relPath.startsWith('shared/assets/master/items/')) return 'master-items';
  if (relPath.startsWith('shared/assets/master/ui/')) return 'master-ui';
  if (relPath.startsWith('shared/assets/master/props/')) return 'master-props';
  if (relPath.startsWith('shared/assets/master/stages/')) return 'master-stages';
  if (relPath.startsWith('games/dungeon28/assets/sprites/items/')) return 'dungeon28-items';
  return 'item';
}

function folderOf(relPath) {
  const parts = relPath.split('/');
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

function typeFromName(file) {
  const base = file.replace(/\.[^.]+$/, '').toLowerCase();
  if (/^(shield|robe|armor_|greaves|boots|bracers|gloves|helmet)/.test(base)) return 'Броня';
  if (/^(dagger|mace|staff|bow|arrow|quiver|sword|axe|weapon|hammer|spear|katana|knife|machete|cleaver)/.test(base)) return 'Оружие';
  if (/^herb_/.test(base)) return 'Травы';
  return 'Предметы';
}

function hierarchy(relPath, entry, groupId) {
  const group = GROUPS.find((item) => item.id === groupId);
  if (entry && entry.categories && entry.categories.length) {
    return `Здания › ${entry.categories.join(' › ')}`;
  }
  if (entry && entry.group && entry.tags && entry.tags.length) {
    return `${entry.group} › ${entry.tags.slice(0, 2).join(' › ')}`;
  }
  if (entry && entry.type) {
    return `${group ? group.label : entry.type} › ${folderOf(relPath) || entry.type}`;
  }
  return `${group ? group.label : 'Прочее'} › ${folderOf(relPath) || typeFromName(path.basename(relPath))}`;
}

function designation(relPath, entry, groupId) {
  const group = GROUPS.find((item) => item.id === groupId);
  if (entry && entry.sign_icon) {
    const icon = SIGN_ICONS[entry.sign_icon] || '🏠';
    const shop = entry.shop_kind && entry.shop_kind.length
      ? ` · тип лавки: ${entry.shop_kind.join(', ')}`
      : '';
    return `${icon} \`${entry.sign_icon}\` — ${entry.sign_text || entry.file}${shop}`;
  }
  if (entry && entry.shop_kind && entry.shop_kind.length) {
    return `${group ? group.icon : '🏠'} лавка: ${entry.shop_kind.join(', ')}`;
  }
  const suffix = path.basename(relPath).replace(/\.[^.]+$/, '').split('_')[0];
  return `${group ? group.icon : '•'} ${group ? group.label : 'Прочее'} · \`${suffix}\``;
}

function refsByBasename(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  const needle = path.basename(file);
  const found = new Set();
  for (const item of textFiles) {
    if (item.text.includes(needle) || item.text.includes(base)) found.add(item.rel);
  }
  return [...found].slice(0, 4);
}

function binding(relPath, entry) {
  const parts = [];
  if (entry && entry.used_in && entry.used_in.length) {
    const games = entry.used_in.map((id) => GAME_LABEL[id] || id).join(', ');
    const dynamic = Object.entries(entry.dynamic_in || {})
      .some(([, files]) => Array.isArray(files) && files.length) ? ' · дин.' : '';
    parts.push(`+ ${games}${dynamic}`);
    if (entry.refs && entry.refs.length) parts.push(entry.refs.join(', '));
  } else if (entry && entry.refs && entry.refs.length) {
    parts.push(`− (refs: ${entry.refs.join(', ')})`);
  } else {
    const found = refsByBasename(relPath);
    parts.push(found.length ? `−, упоминания: ${found.join(', ')}` : '−');
  }
  return parts.join('<br>');
}

function pairFor(relPath, extension) {
  const withoutExt = relPath.replace(/\.[^.]+$/, '');
  const pair = withoutExt + extension;
  if (fs.existsSync(path.join(ROOT, pair))) return pair;

  if (extension === '.png' && /\.svg$/i.test(relPath)) {
    // Сгенерированные SVG ссылаются на мастер-PNG через <image href="...">.
    const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    const embedded = content.match(/(?:href|xlink:href)=["']([^"']+\.png)["']/i);
    if (embedded) {
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(relPath), embedded[1])
      );
      if (fs.existsSync(path.join(ROOT, resolved))) return resolved;
      // У части сгенерированных SVG путь к PNG указан относительно старого
      // каталога — ищем мастер-файл по имени.
      const byName = [...registryByPng.keys()]
        .find((file) => path.posix.basename(file) === path.posix.basename(embedded[1]));
      if (byName) return byName;
    }
    const record = registryBySvg.get(relPath);
    return record && record.file ? record.file : null;
  }

  const record = registryByPng.get(relPath);
  return record && record.svg ? record.svg : null;
}

function image(relPath, file) {
  return `![${cell(file)}](../${relPath})`;
}

function tableFor(files, kind) {
  const rowsByGroup = new Map(GROUPS.map((group) => [group.id, []]));
  const other = [];

  for (const file of files) {
    const entry = manifestByPath.get(file.rel) || null;
    const groupId = groupFor(file.rel, entry);
    const registryEntry = kind === 'svg'
      ? registryBySvg.get(file.rel)
      : registryByPng.get(file.rel);
    const extra = registryEntry
      ? `${registryEntry.vectorization || 'мастер'} · ${registryEntry.note || ''}`
      : '';
    const bindingText = [binding(file.rel, entry), extra].filter(Boolean).join('<br>');
    const pair = pairFor(file.rel, kind === 'svg' ? '.png' : '.svg');
    const row = [
      cell(path.basename(file.rel)),
      cell(designation(file.rel, entry, groupId)),
      cell(hierarchy(file.rel, entry, groupId)),
      cell(bindingText),
      cell(pair ? `\`${pair}\`` : '—'),
      image(file.rel, path.basename(file.rel))
    ].join(' | ');
    const target = rowsByGroup.has(groupId) ? rowsByGroup.get(groupId) : other;
    target.push({ label: GROUPS.find((group) => group.id === groupId), row });
  }

  const chunks = [];
  for (const group of [...GROUPS, { id: 'other', label: 'Прочее', icon: '•' }]) {
    const list = group.id === 'other' ? other : rowsByGroup.get(group.id);
    if (!list || !list.length) continue;
    chunks.push(`### ${group.icon} ${group.label} (${list.length})`, '');
    chunks.push('| Название файла | Обозначение | Иерархия | Привязка | PNG/SVG-пара | Картинка |');
    chunks.push('|---|---|---|---|---|---|');
    for (const item of list) chunks.push('| ' + item.row + ' |');
    chunks.push('');
  }
  return chunks.join('\n');
}

const svgCount = allSvg.length;
const pngCount = allPng.length;
const svgInManifest = allSvg.filter((file) => manifestByPath.has(file.rel)).length;
const svgMaster = allSvg.filter((file) => file.rel.startsWith('shared/assets/master/')).length;

const lines = [
  '# Передача ассетов в другой чат',
  '',
  'Таблица для работы с графикой проекта: все SVG и все PNG с обозначениями,',
  'иерархией, привязкой к играм и превью. Формат повторяет каталог ассетов',
  'на хабе (`index.html`), но добавлены колонки «Обозначение», «Иерархия» и «Пара».',
  '',
  `Всего: **${svgCount} SVG** и **${pngCount} PNG**. Из них SVG в каталоге хаба — ${svgInManifest},`,
  `мастер-SVG (` + '`shared/assets/master`' + `) — ${svgMaster}, остальные — локальные копии и обёртки.`,
  '',
  '## Как читать колонки',
  '',
  '- **Название файла** — имя в репозитории; путь указан в превью-картинке.',
  '- **Обозначение** — пиктограмма и подпись. Для зданий канонические `sign_icon`/`sign_text`',
  '  из `assets/buildings-batch.json`; для остальных — навигационная пиктограмма по категории.',
  '- **Иерархия** — группа › тип › подкатегория (для зданий — `Здания › категории`).',
  '- **Привязка** — игры из `assets/manifest.json` (`+` используется, `−` нет, `дин.` — путь собирается',
  '  динамически) и файлы, где найдено имя. Для мастер-обёток указан статус векторизации из `registry.json`.',
  '- **Пара** — одноимённый PNG для SVG (или SVG для PNG), если существует.',
  '- **Картинка** — встроенное превью с относительным путём; работает в просмотрщике Markdown репозитория.',
  '',
  '> Источники: `assets/manifest.json`, `shared/assets/master/registry.json`,',
  '> `assets/buildings-batch.json` и полный обход `.svg`/`.png` в репозитории.',
  '> Обновить после добавления файлов: `node scripts/build-asset-handoff.js`.',
  '',
  '## SVG',
  '',
  tableFor(allSvg, 'svg'),
  '',
  '## PNG',
  '',
  tableFor(allPng, 'png'),
  ''
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`${path.relative(ROOT, OUT)}: ${svgCount} SVG, ${pngCount} PNG`);
