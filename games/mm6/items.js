// MM6: пересозданная база предметов по образцу mm6world (6_items.htm).
// Каждая запись хранит тип, ущерб и шанс выпадения; школа — массив, а не имя файла.
// Предмет — базовый SVG, элемент — отдельный слой из assets/items/elements/.
// Комбинации «база + слой» собираются в рендере, отдельных файлов нет.
// Тиры ёмкостей и поле magic продолжают схему PR #24 из games/mm6/rules.js.

import { CONTAINER_TIERS } from './rules.js';

export const ITEM_ASSET_BASE = '../../assets/items/';

/* Инвентарь — фиксированная сетка 9×16; скролла нет, это жёсткий максимум. */
export const INVENTORY_GRID = { cols: 9, rows: 16, cells: 144 };

/* Шесть школ. genitive — родительный падеж для названия, layer — файл-оверлей. */
export const SCHOOLS = [
  { id: 'flame', name: 'Огонь', genitive: 'пламени', layer: 'flame', color: '#d94a20', effect: 'burn', expert: 'Огненная стрела' },
  { id: 'water', name: 'Вода', genitive: 'воды', layer: 'water', color: '#2f78b5', effect: 'slow', expert: 'Оцепенение' },
  { id: 'earth', name: 'Земля', genitive: 'земли', layer: 'earth', color: '#6b7a3c', effect: 'defense', expert: 'Каменная кожа' },
  { id: 'wind', name: 'Ветер', genitive: 'ветра', layer: 'wind', color: '#d5e0e6', effect: 'dodge', expert: 'Рывок ветра' },
  { id: 'dark', name: 'Тьма', genitive: 'крови', layer: 'dark', color: '#42206e', effect: 'drain', expert: 'усиленный вампиризм' },
  { id: 'light', name: 'Свет', genitive: 'света', layer: 'light', color: '#f2c94c', effect: 'heal', expert: 'Луч света' }
];
export const SCHOOL_IDS = SCHOOLS.map(s => s.id);
export const schoolById = id => SCHOOLS.find(s => s.id === id) || null;

// Токены для id: flame, holy (свет), ice (вода) и т.д.
const SCHOOL_TOKEN = { flame: 'flame', water: 'ice', earth: 'earth', wind: 'wind', dark: 'dark', light: 'holy' };
const QUALITY_NUM = { rusty: 0, sharp: 1, gold: 2, magic: 3 };

/* Качество зафиксировано по тирам и записано в данных + docs/DESIGN.md. */
export const QUALITY_BY_TIER = [
  { id: 'rusty', tiers: [1, 1], adjective: 'Ржавый', token: 'rusty', grade: null },
  { id: 'sharp', tiers: [2, 2], adjective: 'Острый', token: 'sharp', grade: null },
  { id: 'gold', tiers: [3, 5], adjective: 'Золотой', token: 'gold', grade: 'apprentice' },
  { id: 'magic', tiers: [6, 10], adjective: 'Волшебный', token: 'magic', grade: 'master' }
];

/* Грейды магии. primary/secondary — доля от силы удара (оружие) или защиты/уровня
   (броня). Диапазоны зафиксированы, точные значения лежат внутри них. */
export const MAGIC_GRADES = {
  apprentice: { id: 'apprentice', name: 'Ученик', tiers: [3, 4], range: [0.10, 0.20], primary: 0.15, secondary: 0,
    effect: 'один эффект школы' },
  master: { id: 'master', name: 'Мастер', tiers: [5, 7], range: [0.25, 0.35], primary: 0.30, secondary: 0,
    effect: 'тот же эффект сильнее' },
  expert: { id: 'expert', name: 'Эксперт', tiers: [8, 10], range: [0.40, 0.60], primary: 0.45, secondary: 0.15,
    effect: 'сильный эффект и слабый эффект второй школы' }
};

export function clampTier(tier){
  const n = Math.round(Number(tier) || 1);
  return Math.max(1, Math.min(10, n));
}
export function tierQuality(tier){
  const t = clampTier(tier);
  if (t === 1) return QUALITY_BY_TIER[0];
  if (t === 2) return QUALITY_BY_TIER[1];
  if (t <= 5) return QUALITY_BY_TIER[2];
  return QUALITY_BY_TIER[3];
}
export function gradeForTier(tier){
  const t = clampTier(tier);
  if (t <= 2) return null;
  if (t <= 4) return MAGIC_GRADES.apprentice;
  if (t <= 7) return MAGIC_GRADES.master;
  return MAGIC_GRADES.expert;
}

/* Вторая школа — только на тирах 8–10, всего не больше двух различных школ. */
export function schoolsValid(schools, tier){
  const list = Array.isArray(schools) ? schools.filter(Boolean) : [];
  if (list.length > 2) return false;
  if (new Set(list).size !== list.length) return false;
  if (list.some(id => !SCHOOL_IDS.includes(id))) return false;
  if (list.length === 2 && clampTier(tier) < 8) return false;
  return true;
}

/* Сила эффекта: база — удар для оружия, защита/уровень для брони.
   baseOverride позволяет подставить итоговую атаку героя без изменения формулы урона. */
export function effectPower(item, schoolId, baseOverride){
  const grade = gradeForTier(item && item.tier);
  if (!grade) return 0;
  const schools = (item && item.schools) || [];
  const index = schools.indexOf(schoolId);
  if (index < 0) return 0;
  const ratio = index === 0 ? grade.primary : grade.secondary;
  const fallback = item && item.type === 'weapon'
    ? Number(item.damage) || 0
    : (Number((item && (item.armorDef || item.def)) || 0) + clampTier(item && item.tier));
  const base = Number.isFinite(baseOverride) ? baseOverride : fallback;
  return Math.max(1, Math.round(Math.abs(base) * ratio));
}

/* Классы 1/2/3 продолжают тиры PR #24: leather → reinforced → enchanted.
   Тир rusty остаётся только для старых сейвов, новые предметы его не получают.
   Вес здесь — надбавка тира из rules.js; полный вес предмета = база + надбавка. */
export const CONTAINER_CLASSES = [
  { id: 'plain', name: 'Простой', number: 1, rank: 'novice', tier: 'leather', slots: 2, weight: 0.6, magic: false },
  { id: 'fine', name: 'Изысканный', number: 2, rank: 'leading', tier: 'reinforced', slots: 4, weight: 0.4, magic: false },
  { id: 'magical', name: 'Волшебный', number: 3, rank: 'expert', tier: 'enchanted', slots: 6, weight: 0.2, magic: true }
];

/* Сундук и мешок живут только в инвентаре и сами занимают клетки; оба носимы
   одновременно. Пояс и мошна надеваются на тело. Объём — число клеток ёмкости. */
export const CONTAINER_PURPOSES = {
  chest: { id: 'chest', name: 'Сундук', purpose: 'броня', accept: 'armor', worn: false, volume: 12, weight: 10, sprite: 'chest.svg' },
  bag: { id: 'bag', name: 'Мешок', purpose: 'оружие', accept: 'weapon', worn: false, volume: 16, weight: 5, sprite: 'bag.svg' },
  purse: { id: 'purse', name: 'Мошна', purpose: 'травы', accept: 'herb', worn: true, volume: 4, weight: 0.3, sprite: 'pouch.svg' },
  belt: { id: 'belt', name: 'Пояс', purpose: 'свитки', accept: 'scroll', worn: true, volume: 6, weight: 0.4, sprite: 'belt.svg' }
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v, digits = 1) => Number(Number(v).toFixed(digits));

// ── Базовые виды: тип, ущерб, вес, шанс выпадения ──────────────────────
const WEAPON_BASES = [
  { base: 'dagger', name: 'Кинжал', damage: 2, weight: 3, drop: 42, sets: ['warrior', 'mage'] },
  { base: 'sword', name: 'Меч', damage: 3, weight: 4, drop: 38, sets: ['warrior'] },
  { base: 'axe', name: 'Топор', damage: 4, weight: 6, drop: 34, sets: ['warrior'] },
  { base: 'mace', name: 'Молот', damage: 5, weight: 7, drop: 30, sets: ['warrior'] },
  { base: 'staff', name: 'Посох', damage: 3, weight: 2, drop: 36, sets: ['mage'] },
  { base: 'spear', name: 'Копьё', damage: 4, weight: 5, drop: 32, sets: ['archer'] },
  { base: 'bow', name: 'Лук', damage: 3, weight: 4, drop: 40, sets: ['archer'] }
];

const ARMOR_BASES = [
  { base: 'breastplate', name: 'Панцирь', defense: 3, weight: 8, drop: 30, folder: 'armor', sprite: 'breastplate.svg', slot: 'body', categories: ['light_metal', 'heavy'] },
  { base: 'chainmail', name: 'Кольчуга', defense: 2, weight: 6, drop: 34, folder: 'armor', sprite: 'chainmail.svg', slot: 'body', categories: ['light_metal'] },
  { base: 'robe', name: 'Роба', defense: 1, weight: 2, drop: 38, folder: 'armor', sprite: 'robe.svg', slot: 'cloak', categories: ['robe', 'cloth'] },
  { base: 'shield', name: 'Щит', defense: 2, weight: 5, drop: 36, folder: 'armor', sprite: 'shield.svg', slot: 'shield', categories: ['cloth', 'leather', 'light_metal'] },
  { base: 'helmet', name: 'Шлем', defense: 2, weight: 5, drop: 36, folder: 'head', sprite: 'helmet.svg', slot: 'helmet', categories: ['cloth', 'leather', 'light_metal'] },
  { base: 'hood', name: 'Капюшон', defense: 1, weight: 1, drop: 40, folder: 'head', sprite: 'hood.svg', slot: 'helmet', categories: ['cloth', 'robe'] },
  { base: 'crown', name: 'Корона', defense: 2, weight: 1, drop: 8, folder: 'head', sprite: 'crown.svg', slot: 'helmet', categories: ['cloth', 'light_metal'] },
  { base: 'greaves', name: 'Поножи', defense: 2, weight: 5, drop: 34, folder: 'boots', sprite: 'greaves.svg', slot: 'legs', categories: ['cloth', 'leather', 'light_metal'] },
  { base: 'boots', name: 'Сапоги', defense: 1, weight: 3, drop: 40, folder: 'boots', sprite: 'boots.svg', slot: 'boots', categories: ['cloth', 'leather', 'light_metal'] },
  { base: 'sandals', name: 'Сандалии', defense: 1, weight: 1, drop: 42, folder: 'boots', sprite: 'sandals.svg', slot: 'feet', categories: ['cloth', 'leather'] },
  { base: 'bracers', name: 'Поручи', defense: 1, weight: 2, drop: 38, folder: 'armor', sprite: 'bracers.svg', slot: 'bracers', categories: ['cloth', 'leather', 'light_metal'] },
  { base: 'gloves', name: 'Перчатки', defense: 1, weight: 2, drop: 38, folder: 'armor', sprite: 'gloves.svg', slot: 'hands', categories: ['cloth', 'leather', 'light_metal'] }
];

// Фиксированные образцы из задания: id на английском, имя на русском.
const OVERRIDES = {
  'dagger|3': { schools: ['flame'], variant: 'flame' },
  'sword|3': { schools: ['light'], variant: 'holy' },
  'sword|6': { schools: ['dark'], variant: 'dark' },
  'sword|8': { schools: ['dark', 'water'], variant: 'dark_ice' },
  'breastplate|3': { schools: ['flame'], variant: 'flame' }
};

function variantFor(tier, schools, forced){
  if (forced) return forced;
  if (tier === 1) return 'rusty';
  if (tier === 2) return 'sharp';
  const primary = SCHOOL_TOKEN[schools[0]] || 'plain';
  if (tier === 3) return primary;
  return schools[1] ? primary + '_' + SCHOOL_TOKEN[schools[1]] + '_' + tier : primary + '_' + tier;
}

/* Шаблон имени: `{элемент в родительном падеже} {база}`; тьма даёт
   «Тёмный … крови», двухшкольные перечисляются («Тёмный ледяной меч»). */
function nameFor(baseName, tier, schools){
  const base = baseName.toLowerCase();
  if (!schools.length) return (tier === 1 ? 'Ржавый ' : 'Острый ') + base;
  const primary = schools[0], secondary = schools[1];
  if (secondary) {
    const parts = [];
    if (schools.includes('dark')) parts.push('Тёмный');
    if (schools.includes('water')) parts.push('ледяной');
    parts.push(base);
    if (schools.includes('dark') && !schools.includes('water')) parts.push('крови');
    else if (!schools.includes('dark')) schools.forEach(id => parts.push(schoolById(id).genitive));
    return parts.join(' ');
  }
  if (primary === 'dark') return 'Тёмный ' + base + ' крови';
  if (primary === 'water') return 'Ледяной ' + base;
  return baseName + ' ' + schoolById(primary).genitive;
}

function schoolPair(tier, baseIndex, itemIndex){
  if (tier <= 2) return [];
  const primary = SCHOOL_IDS[(baseIndex + tier) % SCHOOL_IDS.length];
  if (tier >= 8 && (itemIndex + tier) % 4 === 0) {
    const secondary = SCHOOL_IDS[(SCHOOL_IDS.indexOf(primary) + 2) % SCHOOL_IDS.length];
    return [primary, secondary];
  }
  return [primary];
}

function makeEntry(entry){
  /* Контейнеры продолжили строковые тиры PR #24; у оружия и брони тир 1–10. */
  if (entry.type === 'container') {
    const cls = CONTAINER_CLASSES.find(c => c.id === entry.containerClass) || CONTAINER_CLASSES[0];
    return Object.assign({}, entry, {
      tier: cls.tier, containerClass: cls.id, classNumber: cls.number,
      schools: [], grade: null, quality: QUALITY_NUM.rusty, qualityId: 'rusty',
      magic: cls.magic ? { slots: cls.slots } : {}, tierWeight: cls.weight,
      name: entry.name || cls.name + ' ' + entry.baseName.toLowerCase() + ' (' + entry.purpose + ')'
    });
  }
  const tier = clampTier(entry.tier);
  const schools = schoolsValid(entry.schools, tier) && Array.isArray(entry.schools) ? entry.schools.slice() : [];
  const grade = gradeForTier(tier);
  return Object.assign({}, entry, {
    tier, schools, grade: grade ? grade.id : null,
    quality: QUALITY_NUM[tierQuality(tier).id],
    qualityId: tierQuality(tier).id,
    name: entry.name || nameFor(entry.baseName, tier, schools)
  });
}

const catalog = [];

WEAPON_BASES.forEach((b, bi) => {
  for (let tier = 1; tier <= 10; tier++) {
    const override = OVERRIDES[b.base + '|' + tier];
    const schools = override ? override.schools.slice() : schoolPair(tier, bi + 1, bi);
    const variant = variantFor(tier, schools, override && override.variant);
    catalog.push(makeEntry({
      id: b.base + '_' + variant,
      type: 'weapon', base: b.base, baseName: b.name, tier, schools, damage: b.damage + tier * 2,
      drop: clamp(b.drop - (tier - 1) * 3, 4, 45), weight: b.weight, volume: 1,
      wkind: b.base, sets: b.sets.slice(), icon: '⚔',
      sprite: ITEM_ASSET_BASE + 'weapons/' + b.base + '.svg'
    }));
  }
});

ARMOR_BASES.forEach((b, bi) => {
  for (let tier = 1; tier <= 10; tier++) {
    const override = OVERRIDES[b.base + '|' + tier];
    const schools = override ? override.schools.slice() : schoolPair(tier, bi + 2, bi + 3);
    const variant = variantFor(tier, schools, override && override.variant);
    const defense = b.defense + Math.ceil(tier / 2);
    catalog.push(makeEntry({
      id: b.base + '_' + variant,
      type: 'armor', base: b.base, baseName: b.name, tier, schools, damage: 0,
      defense, armorDef: defense, drop: clamp(b.drop - (tier - 1) * 3, 3, 42),
      weight: b.weight, volume: round(1 + tier * 0.2),
      slot: b.slot, armorCategory: b.categories[clamp(tier - 1, 0, b.categories.length - 1)],
      icon: '🛡', sprite: ITEM_ASSET_BASE + b.folder + '/' + b.sprite
    }));
  }
});

Object.keys(CONTAINER_PURPOSES).forEach(kind => {
  const p = CONTAINER_PURPOSES[kind];
  CONTAINER_CLASSES.forEach(cls => {
    catalog.push(makeEntry({
      id: kind + '_' + cls.id,
      type: 'container', base: kind, baseName: p.name,
      name: cls.name + ' ' + p.name.toLowerCase() + ' (' + p.purpose + ')',
      damage: 0, drop: cls.id === 'plain' ? 35 : cls.id === 'fine' ? 12 : 3,
      weight: round(p.weight + cls.weight, 2), volume: p.volume,
      capacity: p.volume + cls.slots, containerKind: kind, purpose: p.purpose,
      accept: p.accept, worn: p.worn, mastery: cls.rank, containerClass: cls.id,
      classNumber: cls.number, tierWeight: cls.weight,
      icon: '🎒', sprite: ITEM_ASSET_BASE + 'containers/' + p.sprite
    }));
  });
});

/** Полная база: 70 оружий + 120 доспехов + 12 ёмкостей = 202 записи. */
export const ITEM_DB = catalog;
export const ITEM_IDS = ITEM_DB.map(i => i.id);
export const ITEM_BY_ID = new Map(ITEM_DB.map(i => [i.id, i]));
export const ITEM_ID_SET = new Set(ITEM_IDS);
export const itemById = id => ITEM_BY_ID.get(id) || null;

/* Локальный «mm6world-style» генератор: тип, урон и шанс выпадения уже лежат
   в записи; сеть не используется. Тир добычи задаёт вызывающая сторона. */
export function catalogItems(type, tier){
  const numeric = tier !== null && tier !== undefined && (typeof tier === 'number' || /^\d+$/.test(String(tier)));
  const wanted = numeric ? clampTier(tier) : tier;
  return ITEM_DB.filter(i => (!type || i.type === type) &&
    (wanted === null || wanted === undefined || i.tier === wanted));
}
export function rollCatalogItem(type, tier, rng = Math.random){
  const pool = catalogItems(type, tier);
  if (!pool.length) return null;
  const total = pool.reduce((s, i) => s + Math.max(1, Number(i.drop) || 1), 0);
  let roll = Math.max(0, Math.min(1, Number(rng()) || 0)) * total;
  for (const item of pool) {
    roll -= Math.max(1, Number(item.drop) || 1);
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/** Слои элемента хранятся в данных schools, а не в имени файла. */
export function elementLayerPaths(item){
  const schools = (item && item.schools) || [];
  return schools.map(id => {
    const s = schoolById(id);
    return s ? ITEM_ASSET_BASE + 'elements/' + s.layer + '.svg' : null;
  }).filter(Boolean);
}
export function elementLayers(item){
  return ((item && item.schools) || []).map(id => {
    const s = schoolById(id);
    return s ? { id, name: s.name, src: ITEM_ASSET_BASE + 'elements/' + s.layer + '.svg' } : null;
  }).filter(Boolean);
}
export function itemDisplayName(item){
  if (!item) return '';
  return item.name || item.baseName || String(item.id || 'Предмет');
}

export function weaponDefsForSet(set){
  const families = set === 'mage' ? ['staff', 'dagger', 'mace']
    : set === 'archer' ? ['bow', 'spear', 'dagger']
    : ['sword', 'dagger', 'axe', 'mace'];
  const defs = ITEM_DB.filter(i => i.type === 'weapon' && families.includes(i.base));
  const step = Math.max(1, Math.floor(defs.length / 16));
  return defs.filter((_, i) => i % step === 0).slice(0, 16).map(it => ({
    id: it.id, name: it.name, dmg: it.damage, cost: 1 + it.tier, kind: it.wkind,
    quality: it.quality, tier: it.tier, schools: it.schools.slice(), weight: it.weight, sprite: it.sprite
  }));
}

export function armorDefs(){
  return ITEM_DB.filter(i => i.type === 'armor').map(it => ({
    id: it.id, group: it.id, name: it.name, def: it.defense, cost: 2 + it.tier * 2,
    set: it.tier <= 3 ? 'mage' : it.tier <= 6 ? 'archer' : 'warrior',
    slot: it.slot, dir: 'def', sprite: it.sprite, icon: it.icon,
    weight: it.weight, armorCategory: it.armorCategory, tier: it.tier,
    schools: it.schools.slice(), grade: it.grade, quality: it.quality
  }));
}

export function tieredEquipmentDefs(){
  return ITEM_DB.filter(i => i.type === 'armor' && ['greaves', 'boots', 'bracers', 'gloves'].includes(i.base)).map(it => ({
    id: it.id, group: it.base, tier: it.tier, name: it.name, def: it.defense,
    cost: 2 + it.tier * 5, set: it.tier <= 3 ? 'mage' : it.tier <= 6 ? 'archer' : 'warrior',
    slot: it.slot, dir: 'def', shops: it.tier <= 3 ? ['magic'] : ['armory', 'armor'],
    sprite: it.sprite, icon: '🛡', weight: it.weight, armorCategory: it.armorCategory,
    schools: it.schools.slice(), grade: it.grade
  }));
}

export const STARTING_RAGS = {
  name: 'Тряпичная одежда', weight: 1, armorCategory: 'cloth', def: 0, cost: 0,
  set: 'any', slot: 'body', dir: 'def', sprite: ITEM_ASSET_BASE + 'armor/robe.svg',
  unsellable: true, unequippable: true, starting: true
};

/* Механики школ фиксируются здесь и в docs/DESIGN.md; урон идёт мимо формулы
   max(0, attack − defense), как и стихийный урон гранат. */
export const SCHOOL_MECHANICS = {
  flame: { ordinary: 'доп. урон и поджог', expert: 'Огненная стрела при ударе' },
  water: { ordinary: 'замедление цели', expert: 'Оцепенение' },
  earth: { ordinary: 'бонус защиты носителю', expert: 'Каменная кожа' },
  wind: { ordinary: 'бонус скорости и уклонения', expert: 'Рывок ветра' },
  dark: { ordinary: 'вытягивание жизни и кровотечение', expert: 'усиленный вампиризм' },
  light: { ordinary: 'лечение носителя при ударе, доп. урон нежити', expert: 'Луч света' }
};

/* Готовый предмет для инвентаря: поля приведены к формату Games/mm6 index.html. */
export function itemInstance(id, extra){
  const def = itemById(id);
  if (!def) return null;
  const it = Object.assign({}, def);
  delete it.drop;
  delete it.baseName;
  if (it.type === 'weapon') {
    it.dmg = it.damage; it.baseDmg = it.damage;
    it.cost = 1 + it.tier; it.sell = Math.max(1, Math.floor(it.cost * 0.6));
    it.reforges = 0; it.enchant = null;
  } else if (it.type === 'armor') {
    it.def = it.defense; it.cost = 2 + it.tier * 2;
    it.sell = Math.max(1, Math.floor(it.cost * 0.6)); it.dir = 'def';
  } else if (it.type === 'container') {
    it.magic = it.magic && typeof it.magic === 'object' ? Object.assign({}, it.magic) : {};
  }
  return Object.assign(it, extra || {});
}

/** Сводка для CDP-проверок: правила, образцы, слои и валидация базы. */
export function itemReport(){
  const errors = [];
  if (ITEM_DB.length !== 202) errors.push('Ожидается 202 записи каталога');
  ITEM_DB.forEach(it => {
    if (!/^[a-z0-9_]+$/.test(it.id)) errors.push('Не-English id: ' + it.id);
    if (typeof it.damage !== 'number') errors.push('Нет ущерба: ' + it.id);
    if (!Number.isFinite(it.drop)) errors.push('Нет шанса выпадения: ' + it.id);
    if (it.type === 'container') {
      if (it.schools.length) errors.push('Слой на контейнере: ' + it.id);
      if (!CONTAINER_TIERS.some(t => t.id === it.tier)) errors.push('Неизвестный тир ёмкости: ' + it.id);
      if (!it.worn && !['chest', 'bag'].includes(it.containerKind)) errors.push('Не носится и не в инвентаре: ' + it.id);
      if (it.worn && !['belt', 'purse'].includes(it.containerKind)) errors.push('Сундук/мешок нельзя надевать: ' + it.id);
    } else {
      if (!schoolsValid(it.schools, it.tier)) errors.push('Неверные школы: ' + it.id);
      if (it.tier <= 2 && (it.schools.length || it.grade)) errors.push('Магия на тире 1–2: ' + it.id);
    }
  });
  if (INVENTORY_GRID.cols !== 9 || INVENTORY_GRID.rows !== 16 || INVENTORY_GRID.cells !== 144)
    errors.push('Сетка инвентаря должна быть 9×16');
  if (CONTAINER_CLASSES.length !== 3 || CONTAINER_CLASSES.map(c => c.slots).join(',') !== '2,4,6')
    errors.push('Классы ёмкостей 1/2/3 должны давать +2/+4/+6');
  ['chest', 'bag'].forEach(kind => { if (CONTAINER_PURPOSES[kind].worn) errors.push(kind + ' нельзя надевать'); });
  ['belt', 'purse'].forEach(kind => { if (!CONTAINER_PURPOSES[kind].worn) errors.push(kind + ' должен надеваться'); });
  const examples = {
    dagger_rusty: (itemById('dagger_rusty') || {}).name,
    dagger_flame: (itemById('dagger_flame') || {}).name,
    sword_holy: (itemById('sword_holy') || {}).name,
    sword_dark: (itemById('sword_dark') || {}).name,
    sword_dark_ice: (itemById('sword_dark_ice') || {}).name,
    breastplate_flame: (itemById('breastplate_flame') || {}).name
  };
  Object.entries({ dagger_rusty: 'Ржавый кинжал', dagger_flame: 'Кинжал пламени',
    sword_holy: 'Меч света', sword_dark: 'Тёмный меч крови', sword_dark_ice: 'Тёмный ледяной меч',
    breastplate_flame: 'Панцирь пламени' })
    .forEach(([id, name]) => { if (examples[id] !== name) errors.push(id + ' → ' + examples[id]); });
  const secondSchoolTiers = [...new Set(ITEM_DB.filter(i => i.schools.length === 2).map(i => i.tier))].sort((a, b) => a - b);
  const magicTiers1_2 = ITEM_DB.filter(i => i.type !== 'container' && i.tier <= 2 &&
    (i.schools.length || i.grade)).map(i => i.id);
  const layers = elementLayerPaths({ schools: SCHOOL_IDS });
  if (layers.length !== 6) errors.push('Ожидается шесть слоёв');
  const novice = effectPower({ tier: 3, schools: ['flame'], damage: 100 }, 'flame', 100);
  const master = effectPower({ tier: 6, schools: ['flame'], damage: 100 }, 'flame', 100);
  const expert = effectPower({ tier: 8, schools: ['flame', 'water'], damage: 100 }, 'flame', 100);
  const second = effectPower({ tier: 8, schools: ['flame', 'water'], damage: 100 }, 'water', 100);
  /* Броня считает силу эффекта от защиты + тир, а не от атаки. */
  const armor = effectPower({ type: 'armor', tier: 6, schools: ['flame'], def: 10 }, 'flame');
  if (novice < 10 || novice > 20 || master < 25 || master > 35 || expert < 40 || second < 5 || second > 20)
    errors.push('Проценты грейдов вне диапазона');
  if (armor !== 5) errors.push('Броня должна использовать защиту и тир как базу эффекта: ' + armor);
  if (!secondSchoolTiers.length || secondSchoolTiers.some(t => t < 8))
    errors.push('Вторая школа возможна только на тирах 8–10');
  if (magicTiers1_2.length) errors.push('На тирах 1–2 нет магии: ' + magicTiers1_2.join(', '));
  return {
    ok: !errors.length, errors, count: ITEM_DB.length, examples,
    secondSchoolTiers, magicTiers1_2,
    types: { weapon: ITEM_DB.filter(i => i.type === 'weapon').length,
      armor: ITEM_DB.filter(i => i.type === 'armor').length,
      container: ITEM_DB.filter(i => i.type === 'container').length },
    elements: SCHOOL_IDS.slice(), layers, grades: MAGIC_GRADES,
    mechanics: SCHOOL_MECHANICS, grid: INVENTORY_GRID,
    quality: QUALITY_BY_TIER, containers: CONTAINER_PURPOSES,
    containerClasses: CONTAINER_CLASSES,
    powers: { novice, master, expert, second, armor }
  };
}
