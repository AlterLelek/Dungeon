// MM6 expansion pack. Dungeon28 remains the canonical base; everything here extends it locally.
// Все пользовательские строки — на русском языке.

import { ITEM_ASSET_BASE, INVENTORY_GRID, QUALITY_BY_TIER, MAGIC_GRADES, SCHOOLS, SCHOOL_IDS,
  schoolById, tierQuality, gradeForTier, schoolsValid, effectPower, elementLayerPaths,
  elementLayers, itemDisplayName, ITEM_DB, ITEM_IDS, ITEM_BY_ID, ITEM_ID_SET, itemById,
  weaponDefsForSet, armorDefs, tieredEquipmentDefs, STARTING_RAGS, CONTAINER_PURPOSES,
  CONTAINER_CLASSES, SCHOOL_MECHANICS, itemInstance, catalogItems, rollCatalogItem, itemReport } from './items.js';

export { ITEM_ASSET_BASE, INVENTORY_GRID, QUALITY_BY_TIER, MAGIC_GRADES, SCHOOLS, SCHOOL_IDS,
  schoolById, tierQuality, gradeForTier, schoolsValid, effectPower, elementLayerPaths,
  elementLayers, itemDisplayName, ITEM_DB, ITEM_IDS, ITEM_BY_ID, ITEM_ID_SET, itemById,
  weaponDefsForSet, armorDefs, tieredEquipmentDefs, STARTING_RAGS, CONTAINER_PURPOSES,
  CONTAINER_CLASSES, SCHOOL_MECHANICS, itemInstance, catalogItems, rollCatalogItem, itemReport };

// Числовой индекс качества сохраняет совместимость с перековкой; тиры заданы в items.js.
export const QUALITY = [
  { id: 0, name: 'Ржавое', short: 'Рж', tiers: [1], mult: 1, forgeCost: 0, crit: 0 },
  { id: 1, name: 'Острое', short: 'Остр', tiers: [2], mult: 1.25, forgeCost: 1, crit: 2 },
  { id: 2, name: 'Золотое', short: 'Зол', tiers: [3, 5], mult: 1.5, forgeCost: 2, crit: 4 },
  { id: 3, name: 'Волшебное', short: 'Волш', tiers: [6, 10], mult: 1.8, forgeCost: 3, crit: 6 }
];

// 10 героев: первые пять — канонические герои Dungeon28, ещё пять — расширение MM6.
export const EXTRA_HEROES = [
  { name: 'Друид', set: 'mage', hp: 88, mp: 7, sprite: '../../assets/sprites/heroes/wizard_0.png', desc: 'Лесной маг. Лечит травой и вызывает бурю.' },
  { name: 'Разбойник', set: 'archer', hp: 84, mp: 3, sprite: '../../assets/sprites/heroes/elf_archer_0.png', desc: 'Быстрый удар и находка монет.' },
  { name: 'Амазонка', set: 'archer', hp: 86, mp: 4, sprite: '../../assets/sprites/heroes/elf_archer_0.png', desc: 'Меткий выстрел пробивает броню.' },
  { name: 'Гном-кулига', set: 'warrior', hp: 110, mp: 2, sprite: '../../assets/sprites/heroes/knight_0.png', desc: 'Живуч, но медлителен. Носит тяжёлые доспехи и держит удар.' },
  { name: 'Гном-колдун', set: 'mage', hp: 96, mp: 8, sprite: '../../assets/sprites/heroes/wizard_0.png', desc: 'Гном-мастер чар. Кристаллы усиливают его заклинания.' }
];

// Классовых запретов больше нет: экипировку ограничивает только нагрузка (§6 COMBAT_SPEC.md).
export const HERO_RESTRICTIONS = {};

// Категории брони. light_metal и heavy участвуют в провале магии (§6 COMBAT_SPEC.md).
export const ARMOR_CATEGORIES = ['robe', 'cloth', 'leather', 'light_metal', 'heavy'];
export const ARMOR_CATEGORY_NAMES = {
  robe: 'магическая одежда (роба)',
  cloth: 'тканевая одежда',
  leather: 'кожаная одежда',
  light_metal: 'лёгкий металл',
  heavy: 'тяжёлая броня'
};

// Экипировку ограничивает только вес надетого. Класс предмета остаётся атрибутом данных.
// Сила задаёт вместимость: capacity = 10 + strength × 5 (§6 COMBAT_SPEC.md).
export const EQUIPMENT_RULES = {
  warrior: { strength: 8 },
  archer: { strength: 5 },
  mage: { strength: 2 },
  'Паладин': { strength: 8 },
  'Гном-кулига': { strength: 8 },
  'Разбойник': { strength: 5 },
  'Амазонка': { strength: 5 },
  'Ангел': { strength: 2 },
  'Друид': { strength: 2 },
  'Гном-колдун': { strength: 2 }
};

export const LOAD_RULES = {
  capacityBase: 10,
  strengthMult: 5,
  normalMax: 0.5,
  encumberedMax: 1,
  normalSpeed: 1,
  encumberedSpeed: 0.75,
  overloadedSpeed: 0.5,
  metalFailPerWeight: 5,
  metalFailMax: 100,
  metalCategories: ['heavy', 'light_metal']
};

// Диапазоны веса из §6 COMBAT_SPEC.md; точное значение хранится в самом предмете.
export const ITEM_WEIGHT_RANGES = {
  cloth: [1, 3], leather: [3, 6], lightMetal: [5, 8], heavy: [8, 15],
  staff: [1, 2], sword: [3, 4], axe: [5, 7], spear: [4, 5], bow: [3, 6],
  accessory: [0, 1], consumable: [0, 0], banner: [2, 4]
};

// Вес оружия не зависит от качества и улучшений: значится только вид оружия.
const WEAPON_WEIGHT_BASE = [
  ['кинжал', 3], ['меч', 4], ['топор', 6], ['молот', 7],
  ['копьё', 5], ['копье', 5], ['посох', 2], ['палочка', 1], ['книга', 2],
  ['кольцо', 0], ['амулет', 1], ['лук', 4], ['арбалет', 5], ['знамя', 3], ['кулаки', 0]
];

export function baseWeaponWeight(w){
  const name = String((w && w.name) || '').toLowerCase();
  const found = WEAPON_WEIGHT_BASE.find(([key]) => name.includes(key));
  return found ? found[1] : 0;
}
export function weaponWeight(w){
  return Number.isFinite(w && w.weight) ? w.weight : baseWeaponWeight(w);
}
export function heroStrength(def){
  const r = (def && (EQUIPMENT_RULES[def.name] || EQUIPMENT_RULES[def.set])) || {};
  return Number.isFinite(r.strength) ? r.strength : 5;
}
export function capacityFor(def){
  return LOAD_RULES.capacityBase + heroStrength(def) * LOAD_RULES.strengthMult;
}

// Кулаки — не предмет, а атака по классу. Значение всегда не меньше двух.
export const FIST_ATTACK = {
  warrior: 4, paladin: 3, angel: 3, mage: 2, archer: 2,
  'Друид': 2, 'Разбойник': 3, 'Амазонка': 3, 'Гном-кулига': 5, 'Гном-колдун': 2
};

// Colors give classic RPG subtypes. Gold monsters always cast spells.
export const MONSTER_COLORS = [
  { id: 'red', name: 'Красный', tint: '#ef4444', hp: 1.15, atk: 1.15, def: 0.9, speed: 1, gold: 1.2 },
  { id: 'yellow', name: 'Жёлтый', tint: '#facc15', hp: 1.05, atk: 0.95, def: 1.05, speed: 1.1, gold: 1.35 },
  { id: 'green', name: 'Зелёный', tint: '#4ade80', hp: 1.1, atk: 1, def: 1, speed: 1, gold: 1, poison: true },
  { id: 'blue', name: 'Синий', tint: '#60a5fa', hp: 0.95, atk: 1.05, def: 1.15, speed: 0.95, gold: 1.1, magic: true },
  { id: 'gold', name: 'Золотой', tint: '#fbbf24', hp: 1.4, atk: 1.3, def: 1.3, speed: 1.05, gold: 2, magic: true }
];

const M = '../../assets/sprites/monsters/';
// Classic RPG additions reuse existing d28 silhouettes with distinct tints when unique files are absent.
export const EXTRA_MONSTERS = [
  { id: 'wolf', name: 'Волк', hp: 70, atk: 6, def: 1, speed: 8, sprite: M + 'rat_0.png', tint: '#cbd5e1', tier: 0, gold: [2, 4] },
  { id: 'goblin', name: 'Гоблин', hp: 65, atk: 5, def: 1, speed: 7, sprite: M + 'imp_0.png', tint: '#86efac', tier: 0, gold: [2, 5] },
  { id: 'orc', name: 'Орк', hp: 120, atk: 7, def: 2, speed: 5, sprite: M + 'orge_0.png', tint: '#86efac', tier: 1, gold: [4, 7] },
  { id: 'troll', name: 'Тролль', hp: 175, atk: 9, def: 3, speed: 4, sprite: M + 'orge_1.png', tint: '#a3e635', tier: 1, gold: [6, 10] },
  { id: 'golem', name: 'Голем', hp: 240, atk: 8, def: 7, speed: 3, sprite: M + 'skeleton_0.png', tint: '#a1a1aa', tier: 2, gold: [8, 13] },
  { id: 'vampire', name: 'Вампир', hp: 145, atk: 11, def: 3, speed: 7, sprite: M + 'necromancer_0.png', tint: '#f87171', tier: 2, magic: true, gold: [9, 14] },
  { id: 'mummy', name: 'Мумия', hp: 160, atk: 8, def: 4, speed: 3, sprite: M + 'undead_0.png', tint: '#fde68a', tier: 2, poison: true, gold: [7, 12] },
  { id: 'siren', name: 'Сирена', hp: 105, atk: 9, def: 2, speed: 8, sprite: M + 'ghost_0.png', tint: '#7dd3fc', tier: 2, magic: true, gold: [8, 12] },
  { id: 'wyvern', name: 'Виверна', hp: 210, atk: 12, def: 4, speed: 9, sprite: M + 'spider_0.png', tint: '#fdba74', tier: 3, magic: true, gold: [12, 18] },
  { id: 'lich', name: 'Лич', hp: 190, atk: 14, def: 5, speed: 6, sprite: M + 'necromancer_4.png', tint: '#c084fc', tier: 3, magic: true, gold: [14, 20] }
];

// Три уровня силы заклинаний; одиночные и массовые версии.
export const SPELL_TIERS = [
  { id: 'weak', name: 'Слабое', mult: 0.6, mpMult: 0.6 },
  { id: 'medium', name: 'Среднее', mult: 1, mpMult: 1 },
  { id: 'strong', name: 'Сильное', mult: 1.8, mpMult: 1.7 }
];

export const SPELLS = [
  { id: 'fire', name: 'Огненный шар', mp: 3, power: 12, tier: 'medium', icon: '🔥', desc: 'Урон по одному врагу.' },
  { id: 'ice', name: 'Ледяная стрела', mp: 3, power: 10, tier: 'medium', icon: '❄', desc: 'Урон и замедление.' },
  { id: 'lightning', name: 'Молния', mp: 4, power: 16, tier: 'medium', icon: '⚡', desc: 'Сильный урон по одному врагу.' },
  { id: 'lightning_weak', name: 'Молния слабая', mp: 2, power: 9, tier: 'weak', icon: '⚡', desc: 'Дешёвая молния по одному врагу.' },
  { id: 'lightning_strong', name: 'Молния сильная', mp: 7, power: 27, tier: 'strong', icon: '⚡', desc: 'Мощный удар молнией.' },
  { id: 'lightning_all', name: 'Грозовая молния', mp: 7, power: 12, tier: 'medium', aoe: true, icon: '⚡', desc: 'Молния по всем врагам.' },
  { id: 'heal', name: 'Исцеление', mp: 3, heal: 30, tier: 'medium', icon: '✚', desc: 'Лечит активного героя.' },
  { id: 'heal_weak', name: 'Исцеление слабое', mp: 2, heal: 15, tier: 'weak', icon: '✚', desc: 'Быстрое лечение героя.' },
  { id: 'heal_strong', name: 'Исцеление сильное', mp: 6, heal: 62, tier: 'strong', icon: '✚', desc: 'Сильно лечит героя.' },
  { id: 'heal_all', name: 'Исцеление отряда', mp: 7, healAll: 32, tier: 'strong', aoe: true, icon: '✚', desc: 'Лечит обоих героев.' },
  { id: 'shield', name: 'Щит', mp: 2, shield: 8, tier: 'weak', icon: '🛡', desc: 'Временная броня.' },
  { id: 'poison', name: 'Отравление', mp: 3, poison: 4, tier: 'weak', icon: '☠', desc: 'Яд на 2 хода.' },
  { id: 'sleep', name: 'Сон', mp: 5, stun: 2, tier: 'medium', icon: '💤', desc: 'Враг пропускает 2 хода.' },
  { id: 'stun', name: 'Оглушение', mp: 4, stun: 1, tier: 'medium', icon: '💥', desc: 'Враг пропускает ход.' },
  { id: 'vampire', name: 'Вампиризм', mp: 5, power: 10, drain: 8, tier: 'medium', icon: '🩸', desc: 'Урон и лечение.' },
  { id: 'bless', name: 'Благословение', mp: 4, atk: 6, tier: 'medium', icon: '✨', desc: 'Усиливает удар.' },
  { id: 'curse', name: 'Проклятие', mp: 4, def: -4, tier: 'weak', icon: '🌑', desc: 'Снижает защиту врага.' },
  { id: 'quake', name: 'Землетрясение', mp: 7, power: 9, aoe: true, tier: 'strong', icon: '⛰', desc: 'Урон всем врагам.' },
  { id: 'wind', name: 'Вихрь', mp: 5, power: 11, aoe: true, tier: 'medium', icon: '🌪', desc: 'Урон всем врагам.' },
  { id: 'light', name: 'Свет', mp: 4, power: 13, undead: true, tier: 'medium', icon: '☀', desc: 'Удвоенный урон нежити.' },
  { id: 'mana', name: 'Восстановление маны', mp: 0, gain: 6, tier: 'weak', icon: '💧', desc: 'Возвращает ману.' },
  { id: 'teleport', name: 'Прыжок', mp: 3, tier: 'weak', icon: '🌀', desc: 'Побег из боя без штрафа.' }
];

/* Роль: alchemy — компонент зелий, magic — чародейская трава,
   food — еда/отвар, sale — редкая трава на продажу. */
export const HERBS = [
  { id: 'mint', name: 'Мята', icon: '🌿', effect: 'mana', value: 3, desc: '+3 MP', weight: 0, role: 'alchemy', found: 'луга, рынок' },
  { id: 'sage', name: 'Шалфей', icon: '🌾', effect: 'hp', value: 12, desc: '+12 HP', weight: 0, role: 'alchemy', found: 'луга, обочины, рынок' },
  { id: 'thistle', name: 'Чертополох', icon: '🌵', effect: 'poison', value: 2, desc: 'яд 2', weight: 0, role: 'alchemy', found: 'пустыри, рынок' },
  { id: 'moss', name: 'Мох', icon: '🍀', effect: 'def', value: 3, desc: '+3 брони', weight: 0, role: 'alchemy', found: 'лес, камни, рынок' },
  { id: 'root', name: 'Корень', icon: '🥕', effect: 'hp', value: 24, desc: '+24 HP', weight: 0, role: 'food', found: 'поле, амбары, рынок' },
  { id: 'fern', name: 'Папоротник', icon: '🌿', effect: 'mana', value: 6, desc: '+6 MP', weight: 0, role: 'magic', found: 'лес, магия, рынок' },
  { id: 'bloom', name: 'Цветок света', icon: '🌼', effect: 'curse', value: 1, desc: 'снимает проклятие', weight: 0, role: 'magic', found: 'луга, рынок' },
  { id: 'bark', name: 'Кора', icon: '🪵', effect: 'def', value: 5, desc: '+5 брони', weight: 0, role: 'alchemy', found: 'лес, рынок' },
  { id: 'berry', name: 'Ягода', icon: '🫐', effect: 'hp', value: 8, desc: '+8 HP', weight: 0, role: 'food', found: 'кусты, таверна, рынок' },
  { id: 'crystalgrass', name: 'Кристалл-трава', icon: '💎', effect: 'crystal', value: 1, desc: '+1 кристалл', weight: 0, role: 'magic', found: 'горы, мышиные гнёзда, магия' },
  { id: 'firepetal', name: 'Огненный лепесток', icon: '🔥', effect: 'atk', value: 4, desc: '+4 атаки', weight: 0, role: 'magic', found: 'жаркие поля, магия' },
  { id: 'iceflower', name: 'Ледяной цветок', icon: '❄', effect: 'slow', value: 2, desc: 'замедление', weight: 0, role: 'magic', found: 'горы, магия' },
  { id: 'nettle', name: 'Крапива', icon: '🌿', effect: 'hp', value: 6, desc: '+6 HP', weight: 0, role: 'alchemy', found: 'пустыри, рынок' },
  { id: 'chamomile', name: 'Ромашка', icon: '🌼', effect: 'mana', value: 4, desc: '+4 MP', weight: 0, role: 'magic', found: 'луга, рынок' },
  { id: 'mushroom', name: 'Мухомор', icon: '🍄', effect: 'poison', value: 3, desc: 'яд 3', weight: 0, role: 'alchemy', found: 'лес, болота, рынок' },
  { id: 'silverleaf', name: 'Серебряный лист', icon: '🍃', effect: 'curse', value: 1, desc: 'снимает проклятие', weight: 0, role: 'magic', found: 'родники, магия' },
  { id: 'sunpetal', name: 'Солнечный лепесток', icon: '🌻', effect: 'atk', value: 3, desc: '+3 атаки', weight: 0, role: 'food', found: 'поля, рынок' },
  { id: 'nightshade', name: 'Паслён', icon: '🖤', effect: 'poison', value: 4, desc: 'яд 4', weight: 0, role: 'sale', found: 'тенистый лес, магия' },
  { id: 'dewdrop', name: 'Роса', icon: '💧', effect: 'mana', value: 2, desc: '+2 MP', weight: 0, role: 'magic', found: 'луга на рассвете, магия' },
  { id: 'pine_needle', name: 'Сосновая игла', icon: '🌲', effect: 'atk', value: 2, desc: '+2 атаки', weight: 0, role: 'sale', found: 'хвойный лес, горы, магия' }
];

// Еда и напитки: эффект хранится прямо в предмете и применяется useItem().
export const FOODS = [
  { id: 'bread', name: 'Хлеб', icon: '🍞', hp: 12, mp: 0, cost: 2, sell: 1, desc: 'Восстанавливает 12 HP', weight: 0 },
  { id: 'porridge', name: 'Каша', icon: '🥣', hp: 12, mp: 0, cost: 3, sell: 1, desc: 'Восстанавливает 12 HP', weight: 0 },
  { id: 'roast', name: 'Жаркое', icon: '🍖', hp: 30, mp: 0, cost: 7, sell: 3, desc: 'Восстанавливает 30 HP', weight: 0 },
  { id: 'ale', name: 'Эль', icon: '🍺', hp: 0, mp: 6, cost: 4, sell: 2, desc: 'Восстанавливает 6 MP', weight: 0 }
];

// Материалы для ремесла.
export const MATERIALS = [
  { id: 'ore', name: 'Руда', icon: '⛏', desc: 'Для ковки оружия и доспехов', cost: 4, sell: 2, weight: 0 },
  { id: 'cloth', name: 'Ткань', icon: '🧵', desc: 'Для пошива одежды', cost: 3, sell: 1, weight: 0 },
  { id: 'wood', name: 'Древесина', icon: '🪵', desc: 'Для древкового оружия', cost: 3, sell: 1, weight: 0 }
];

export const RECIPES = [
  { id: 'potion_hp', name: 'Зелье жизни', need: ['sage', 'root'], give: { id: 'potion_hp', count: 2 }, icon: '🧪', kind: 'herb', desc: 'Лечит 45 HP.' },
  { id: 'potion_mp', name: 'Зелье маны', need: ['mint', 'fern'], give: { id: 'potion_mp', count: 2 }, icon: '🧪', kind: 'herb', desc: 'Восстанавливает 18 MP.' },
  { id: 'antidote', name: 'Противоядие', need: ['thistle', 'bloom'], give: { id: 'antidote', count: 2 }, icon: '🧪', kind: 'herb', desc: 'Снимает яд.' },
  { id: 'stone_skin', name: 'Каменная кожа', need: ['moss', 'bark'], give: { id: 'stone_skin', count: 1 }, icon: '🧪', kind: 'herb', desc: '+5 защиты.' },
  { id: 'battle_draught', name: 'Боевой напиток', need: ['firepetal', 'berry'], give: { id: 'battle_draught', count: 1 }, icon: '🧪', kind: 'herb', desc: '+4 атаки.' },
  { id: 'crystal_tonic', name: 'Кристальный тоник', need: ['crystalgrass', 'mint'], give: { id: 'crystal_tonic', count: 1 }, icon: '🧪', kind: 'herb', desc: 'Даёт кристалл.' },
  { id: 'frost_flask', name: 'Морозная колба', need: ['iceflower', 'fern'], give: { id: 'frost_flask', count: 1 }, icon: '🧪', kind: 'herb', desc: 'Мороз по врагам.' },
  { id: 'greater_heal', name: 'Большое зелье', need: ['root', 'sage', 'bloom'], give: { id: 'greater_heal', count: 1 }, icon: '🧪', kind: 'herb', desc: 'Лечит весь отряд.' },
  { id: 'herb_tea', name: 'Травяной чай', need: ['nettle', 'chamomile'], give: { id: 'potion_mp', count: 1 }, icon: '🍵', kind: 'herb', desc: 'Базовое зелье маны из крапивы и ромашки.' },
  { id: 'root_soup', name: 'Корневой отвар', need: ['root', 'sunpetal'], give: { id: 'potion_hp', count: 2 }, icon: '🥣', kind: 'herb', desc: 'Базовое зелье жизни из корня и солнечного лепестка.' },
  { id: 'silver_draught', name: 'Серебряный настой', need: ['silverleaf', 'dewdrop'], give: { id: 'crystal_tonic', count: 1 }, icon: '🧪', kind: 'herb', desc: 'Даёт кристалл из серебряного листа и росы.' },
  { id: 'craft_sword', name: 'Сковать меч', need: ['ore', 'ore'], give: { id: 'craft_sword', count: 1 }, icon: '⚔', kind: 'weapon', desc: 'Урон 6, качество «Острое».' },
  { id: 'craft_axe', name: 'Сковать топор', need: ['ore', 'wood'], give: { id: 'craft_axe', count: 1 }, icon: '🪓', kind: 'weapon', desc: 'Урон 7, качество «Острое».' },
  { id: 'craft_armor', name: 'Сшить доспех', need: ['cloth', 'cloth', 'ore'], give: { id: 'craft_armor', count: 1 }, icon: '🛡', kind: 'armor', desc: 'Защита 4, слот «тело».' },
  { id: 'craft_shield', name: 'Сковать щит', need: ['ore', 'wood'], give: { id: 'craft_shield', count: 1 }, icon: '🛡', kind: 'armor', desc: 'Защита 3, слот «щит».' },
  { id: 'craft_scroll', name: 'Создать свиток молнии', need: ['fern', 'crystalgrass'], give: { id: 'craft_scroll', count: 1 }, icon: '📜', kind: 'spell', desc: 'Свиток слабой молнии.' },
  { id: 'craft_enchanted_bag', name: 'Зачаровать сумку', need: ['crystal', 'silverleaf', 'cloth'], give: { id: 'craft_enchanted_bag', count: 1, kind: 'container', containerKind: 'bag', tier: 'enchanted' }, icon: '🎒', kind: 'container', desc: 'Даёт сумке тир «Зачарованный» (+6 слотов, вес 0.2).' }
];

export const LIQUIDS = [
  { id: 'liquid_hp', name: 'Жидкость здоровья', icon: '🧴', stat: 'hp', value: 8, color: '#f87171', weight: 0 },
  { id: 'liquid_mp', name: 'Жидкость маны', icon: '🧴', stat: 'mp', value: 4, color: '#60a5fa', weight: 0 },
  { id: 'liquid_atk', name: 'Жидкость ярости', icon: '🧴', stat: 'atk', value: 3, color: '#fb923c', weight: 0 },
  { id: 'liquid_def', name: 'Жидкость камня', icon: '🧴', stat: 'def', value: 3, color: '#a3a3a3', weight: 0 },
  { id: 'liquid_poison', name: 'Жидкость яда', icon: '🧴', stat: 'poison', value: 3, color: '#4ade80', weight: 0 },
  { id: 'liquid_light', name: 'Жидкость света', icon: '🧴', stat: 'light', value: 5, color: '#fde68a', weight: 0 }
];

export const SCROLLS = [
  { id: 'scroll_fire', name: 'Свиток огня', spell: 'fire', cost: 12, icon: '📜', weight: 0 },
  { id: 'scroll_ice', name: 'Свиток льда', spell: 'ice', cost: 11, icon: '📜', weight: 0 },
  { id: 'scroll_heal', name: 'Свиток лечения', spell: 'heal', cost: 14, icon: '📜', weight: 0 },
  { id: 'scroll_shield', name: 'Свиток щита', spell: 'shield', cost: 9, icon: '📜', weight: 0 },
  { id: 'scroll_stun', name: 'Свиток оглушения', spell: 'stun', cost: 15, icon: '📜', weight: 0 },
  { id: 'scroll_vampire', name: 'Свиток вампиризма', spell: 'vampire', cost: 20, icon: '📜', weight: 0 },
  { id: 'scroll_quake', name: 'Свиток землетрясения', spell: 'quake', cost: 26, icon: '📜', weight: 0 },
  { id: 'scroll_light', name: 'Свиток света', spell: 'light', cost: 18, icon: '📜', weight: 0 },
  { id: 'scroll_mana', name: 'Свиток маны', spell: 'mana', cost: 10, icon: '📜', weight: 0 },
  { id: 'scroll_teleport', name: 'Свиток прыжка', spell: 'teleport', cost: 16, icon: '📜', weight: 0 },
  { id: 'scroll_lightning_all', name: 'Свиток грозы', spell: 'lightning_all', cost: 24, icon: '📜', weight: 0 },
  { id: 'scroll_heal_all', name: 'Свиток исцеления отряда', spell: 'heal_all', cost: 26, icon: '📜', weight: 0 }
];

const UI = '../../assets/sprites/ui/';

// 8 слотов: поножи, сапоги, поручи и перчатки — независимые слоты,
// каждый со своим предметом и своей парой «слот + защита».
export const ARMOR_SLOTS = [
  { id: 'shield', name: 'Щит', icon: '🛡', sprite: ITEM_ASSET_BASE + 'armor/shield.svg' },
  { id: 'helmet', name: 'Шлем', icon: '⛑', sprite: ITEM_ASSET_BASE + 'head/helmet.svg' },
  { id: 'body', name: 'Тело', icon: '👕', sprite: ITEM_ASSET_BASE + 'armor/breastplate.svg' },
  { id: 'legs', name: 'Поножи', icon: '🦵', sprite: ITEM_ASSET_BASE + 'boots/greaves.svg' },
  { id: 'boots', name: 'Сапоги', icon: '👢', sprite: ITEM_ASSET_BASE + 'boots/boots.svg' },
  { id: 'bracers', name: 'Поручи', icon: '💪', sprite: ITEM_ASSET_BASE + 'armor/bracers.svg' },
  { id: 'hands', name: 'Перчатки', icon: '🧤', sprite: ITEM_ASSET_BASE + 'armor/gloves.svg' },
  { id: 'cloak', name: 'Плащ', icon: '🧥', sprite: ITEM_ASSET_BASE + 'armor/robe.svg' }
];

/* Старый ворох брони удалён без миграции: источник — пересозданная база items.js. */
export const ARMORS = [STARTING_RAGS, ...armorDefs()];

// Комплект иконок по тирам: tier === номер SVG. Лёгкое — магу, среднее — следопыту,
// тяжёлое (защита 7 и выше) — воину. Поле group разделяет варианты одного слота в аудитах.
export const EQUIPMENT_GROUPS = [
  { id: 'greaves', name: 'Поножи', sprite: ITEM_ASSET_BASE + 'boots/greaves.svg' },
  { id: 'boots', name: 'Сапоги', sprite: ITEM_ASSET_BASE + 'boots/boots.svg' },
  { id: 'bracers', name: 'Поручи', sprite: ITEM_ASSET_BASE + 'armor/bracers.svg' },
  { id: 'gloves', name: 'Перчатки', sprite: ITEM_ASSET_BASE + 'armor/gloves.svg' }
];

// 40 предметов четырёх независимых слотов из пересозданной базы (без старых PNG).
export const TIERED_EQUIPMENT = tieredEquipmentDefs();

// Ассортимент и наценки. У каждой лавки товары свои.
export const SHOP_STOCK = {
  // Оружейная продаёт оружие и ~10% брони; оружейная палата — броню и ~10% оружия.
  // Кузница перековывает и оружие, и броню, но торгует только оружием.
  weapons: { weapons: [0, 1, 5, 6, 10, 11, 14, 15], armor: [1, 8], price: 1, sell: 0.6, magic: false },
  armory: { weapons: [0], armor: [2, 5, 9, 11, 14, 20, 23, 25, 27], price: 1.15, sell: 0.62, magic: false },
  forge: { weapons: [0, 1, 2, 3, 4, 5, 6, 7], armor: [], price: 0.9, sell: 0.55, magic: false },
  armor: { weapons: [], armor: [1, 2, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], price: 1, sell: 0.6, magic: false },
  magic: { weapons: [0, 5, 6, 10, 11], armor: [5, 16, 17, 18, 28], price: 1.25, sell: 0.58, magic: true, spellDiscount: 0.65, crystals: 2,
    herbs: ['firepetal', 'iceflower', 'silverleaf', 'nightshade', 'dewdrop', 'crystalgrass', 'pine_needle'], herbPrice: 5 },
  jeweler: { weapons: [10, 11, 14, 15], armor: [4, 18, 27, 28], price: 1.6, sell: 0.75, magic: true, crystals: 5, noHeavy: true },
  market: { weapons: [0, 1, 5], armor: [1, 8, 24, 26], price: 0.95, sell: 0.5, berries: true, food: true,
    herbs: ['mint', 'sage', 'thistle', 'moss', 'root', 'fern', 'bloom', 'bark', 'berry', 'nettle', 'chamomile', 'mushroom', 'sunpetal'], herbPrice: 2, containers: true },
  tavern: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, food: true },
  inn: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, rest: true },
  church: { weapons: [], armor: [], price: 1, sell: 0.5, church: true },
  hall: { weapons: [], armor: [], price: 1, sell: 0.5, quests: true }
};

export const SHOP_TYPES = [
  { id: 'weapons', title: 'Оружейная', icon: '⚔', accent: '#f87171', desc: 'Оружие и 10% доспехов.', names: ['Оружейная «Клинок»', 'Лавка братьев-кузнецов', 'Оружейная у городских ворот'] },
  { id: 'armory', title: 'Оружейная палата', icon: '🗡', accent: '#fb923c', desc: 'Доспехи и 10% оружия.', names: ['Оружейная палата', 'Арсенал короля', 'Склад оружейника'] },
  { id: 'forge', title: 'Кузница', icon: '🔨', accent: '#f97316', desc: 'Перековывает оружие и броню.', names: ['Кузница «Гром»', 'Горн и наковальня', 'Кузня у моста'] },
  { id: 'armor', title: 'Бронница', icon: '🛡', accent: '#60a5fa', desc: 'Доспехи и усиление брони.', names: ['Бронница «Щит и шлем»', 'Лавка доспехов', 'Бронная лавка'] },
  { id: 'magic', title: 'Магазин Магии', icon: '✨', accent: '#c084fc', desc: 'Свитки, заклинания, зелья.', names: ['Магазин Магии «Звезда»', 'Лавка чародея', 'Дом заклинаний'] },
  { id: 'jeweler', title: 'Ювелир', icon: '💎', accent: '#34d399', desc: 'Кристаллы и украшения.', names: ['Ювелир «Изумруд»', 'Лавка драгоценностей', 'Ювелирная мастерская'] },
  { id: 'market', title: 'Рынок', icon: '🛒', accent: '#fbbf24', desc: 'Травы, еда, разные товары.', names: ['Рынок у фонтана', 'Торговая площадь', 'Рынок «Ягода»'] },
  { id: 'tavern', title: 'Таверна', icon: '🍺', accent: '#fbbf24', desc: 'Еда за монеты.', names: ['Таверна «Золотой бокал»', 'Таверна «У доброго трактирщика»', 'Харчевня «Круглый стол»'] },
  { id: 'inn', title: 'Гостиница', icon: '🛏', accent: '#a78bfa', desc: 'Сон и восстановление.', names: ['Гостиница «Отдых»', 'Постоялый двор', 'Гостиница «Тихий двор»'] },
  { id: 'church', title: 'Церковь', icon: '⛪', accent: '#fde68a', desc: 'Воскрешение за десятину.', names: ['Церковь Света', 'Храм Тихого Покаяния', 'Часовня у городских ворот'] },
  { id: 'hall', title: 'Ратуша', icon: '🏛', accent: '#fcd34d', desc: 'Задания лавок и журнал походов.', names: ['Городская ратуша', 'Ратуша у площади', 'Приказная изба'] }
];

// Каталог зданий. Поле shop_kind повторяет assets/manifest.json
// (источник — assets/buildings-batch.json). null/[] означает, что торговли нет:
// такое здание показывает только декоративную реплику.
// signName — название на вывеске; оно же записано в assets/buildings-batch.json
// и полностью отрисовывается в SVG здания (см. scripts/gen-building-svgs.js).
export const BUILDING_TYPES = [
  { id: 'house_straw_0', title: 'Соломенная хижина', signName: 'Хижина «Под Соломкой»', kind: 'house', shop_kind: null,
    deco: 'В соломенной хижине тихо: хозяева ушли на рынок.' },
  { id: 'house_tile_0', title: 'Черепичный дом', signName: 'Дом «Черепица и Кофе»', kind: 'house', shop_kind: null,
    deco: 'Из-за черепичной двери доносится детский смех и запах похлёбки.' },
  { id: 'stone_house_0', title: 'Каменный дом', signName: 'Каменный дом «У Глины»', kind: 'house', shop_kind: null,
    deco: 'Каменный дом заперт на тяжёлый засов. Здесь живут, а не торгуют.' },
  { id: 'barn_0', title: 'Амбар', signName: 'Амбар «Золотой Сноп»', kind: 'barn', shop_kind: null,
    deco: 'В амбаре пахнет сеном и зерном. Ничего для продажи не выставлено.' },
  { id: 'shed_0', title: 'Сарай', signName: 'Сарай «Старые Грабли»', kind: 'shed', shop_kind: null,
    deco: 'В сарае свалены старые грабли и бочки. Хозяин не любит гостей.' },
  { id: 'well_0', title: 'Колодец', signName: 'Колодец «Тихий Вход»', kind: 'well', shop_kind: null,
    deco: 'Вы заглядываете в колодец: за воротом и ведром прячётся тёмный вход.' },
  { id: 'stable_0', title: 'Конюшня', signName: 'Конюшня «Тихий Овёс»', kind: 'stable', shop_kind: null,
    deco: 'Лошади фыркают и косятся на вас. Конюх занят и не торгует.' },
  { id: 'forge_0', title: 'Кузница', signName: 'Кузница «Гром и Наковальня»', kind: 'forge', shop_kind: ['forge'] },
  { id: 'shop_0', title: 'Лавка', signName: 'Лавка «Мешок и Монета»', kind: 'market', shop_kind: ['market'] },
  { id: 'tavern_0', title: 'Таверна', signName: 'Таверна «Пенная Кружка»', kind: 'tavern', shop_kind: ['tavern'] },
  { id: 'armory_0', title: 'Оружейня', signName: 'Оружейная «Острый Клинок»', kind: 'weapons', shop_kind: ['weapons', 'armory', 'armor'] },
  { id: 'jewelry_0', title: 'Ювелирная лавка', signName: 'Ювелирная «Изумрудный Глаз»', kind: 'jeweler', shop_kind: ['jeweler'] },
  { id: 'magic_0', title: 'Магазин магии', signName: 'Магазин магии «Звёздная Склянка»', kind: 'magic', shop_kind: ['magic'] },
  { id: 'inn_0', title: 'Гостиница', signName: 'Гостиница «Спокойная Подушка»', kind: 'inn', shop_kind: ['inn'] },
  { id: 'church_0', title: 'Церковь', signName: 'Церковь Света', kind: 'church', shop_kind: ['church'],
    deco: 'В храме пахнет ладаном. Служитель принимает десятину за воскрешение.' },
  { id: 'hall_0', title: 'Ратуша', signName: 'Ратуша у площади', kind: 'hall', shop_kind: ['hall'],
    deco: 'В ратуше принимают заказы лавок и ведут журнал заданий.' }
];

export const BIOMES = {
  field: { name: 'Поле', season: 'summer', ground: ['#3f6b3a', '#1f3a24'], road: '#a39064', roadDark: '#5d5238', tree: '#2f6b38', water: '#2b5d8a', rock: '#71717a', accent: '#86efac', scene: 'forest' },
  village: { name: 'Деревня', season: 'spring', ground: ['#56704a', '#273426'], road: '#b09a6b', roadDark: '#63563a', tree: '#3f7d43', water: '#3b6e97', rock: '#8b7f6a', accent: '#fcd34d', scene: 'town' },
  city: { name: 'Город', season: 'autumn', ground: ['#5b5b6b', '#2b2b3a'], road: '#9a9a9a', roadDark: '#54545e', tree: '#3c6b42', water: '#2f628c', rock: '#9ca3af', accent: '#fbbf24', scene: 'town' },
  port: { name: 'Порт', season: 'spring', ground: ['#3f6b74', '#1d3540'], road: '#a8a08a', roadDark: '#5c5a4f', tree: '#2f6b48', water: '#1d4ed8', rock: '#7c8a8f', accent: '#7dd3fc', scene: 'port' },
  mountains: { name: 'Горы', season: 'winter', ground: ['#5d5663', '#2a2733'], road: '#8f867a', roadDark: '#524b45', tree: '#3b5d43', water: '#315c80', rock: '#a1a1aa', accent: '#fca5a5', scene: 'cave' }
};

// Сезонная зона карты: название и допустимая погода.
// Зима: снег/ясно, без дождя. Лето: дождь/морось/ясно, без снега. Весна/осень: оба возможны.
export const SEASON_WEATHER = {
  spring: { name: 'Весна', defaultWeather: 'rain', allowed: ['clear', 'drizzle', 'rain'] },
  summer: { name: 'Лето',  defaultWeather: 'drizzle', allowed: ['clear', 'drizzle', 'rain'] },
  autumn: { name: 'Осень', defaultWeather: 'rain', allowed: ['clear', 'drizzle', 'rain', 'heavy_rain'] },
  winter: { name: 'Зима',  defaultWeather: 'snow', allowed: ['clear', 'snow', 'heavy_snow'] }
};

// Устаревший шаговый цикл погоды: счётчик шагов отключён (docs/DESIGN.md), поле остаётся только для совместимости настроек.
export const WEATHER_CYCLE_STEPS = 100;

// Проходимость местности закреплена в docs/DESIGN.md. Значения здесь — единственный
// источник правил для генерации, отрисовки и журнала проверок.
export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

export const GROUND_TYPES = [
  { id: 'grass', name: 'Трава', passable: true, cost: 1 },
  { id: 'flowers', name: 'Цветы', passable: true, cost: 1 },
  { id: 'dirt', name: 'Земля', passable: true, cost: 1 },
  { id: 'sand', name: 'Песок', passable: true, cost: 1 },
  { id: 'stone', name: 'Камень', passable: true, cost: 1 }
];

//Terrain table: cost is the number of turns spent on entering a cell.
export const TERRAIN_TYPES = [
  { id: 'grass', name: 'Трава', passable: true, cost: 1 },
  { id: 'flowers', name: 'Цветы', passable: true, cost: 1 },
  { id: 'dirt', name: 'Земля', passable: true, cost: 1 },
  { id: 'sand', name: 'Песок', passable: true, cost: 1 },
  { id: 'stone', name: 'Камень', passable: true, cost: 1 },
  { id: 'road', name: 'Дорога', passable: true, cost: 1 },
  { id: 'bridge', name: 'Дощатый мост', passable: true, cost: 1 },
  { id: 'water', name: 'Вода', passable: false, cost: null, toast: 'Глубоко' },
  { id: 'ice', name: 'Лёд', passable: true, cost: 1 },
  { id: 'swamp', name: 'Болото', passable: true, cost: 2, winterCost: 1 },
  { id: 'tree', name: 'Дерево', passable: false, cost: null },
  { id: 'mountain', name: 'Гора', passable: false, cost: null },
  { id: 'rock', name: 'Камень-валун', passable: false, cost: null },
  { id: 'house', name: 'Дом', passable: false, cost: null },
  { id: 'shop', name: 'Лавка', passable: false, cost: null },
  { id: 'gate', name: 'Выход', passable: true, cost: 1 },
  { id: 'chest', name: 'Сундук', passable: true, cost: 1 },
  { id: 'treasure', name: 'Находка', passable: true, cost: 1 },
  { id: 'boss', name: 'Босс', passable: false, cost: null }
];

// Три сохраняемых вида дорог: грунтовая, каменная, кирпичная.
export const ROAD_KINDS = [
  { id: 'dirt', name: 'Грунтовая', surface: '#a39064', detail: '#6d5a3c' },
  { id: 'stone', name: 'Каменная', surface: '#9ca3af', detail: '#5d6470' },
  { id: 'brick', name: 'Кирпичная', surface: '#b46a4a', detail: '#743d2b' }
];

// Болото замедляет в теплое время года; зимой промёрзшая поверхность проходима за 1 ход.
export const SWAMP_COST = { normal: 2, winter: 1 };

// Палитры одной процедурной текстуры на сезон: новых файлов нет, цвет меняется кэшированием.
export const SEASON_GROUND_COLORS = {
  spring: { grass: '#9dc86f', flowers: '#a9d47a', dirt: '#a48b62', sand: '#e3d3a6', stone: '#b9b6ad', water: '#4a86b8', ice: '#d8efff', swamp: '#4c6b3c' },
  summer: { grass: '#4ea64b', flowers: '#63b356', dirt: '#8a704d', sand: '#dfcb93', stone: '#9b9a93', water: '#2f6fa8', ice: '#dceffc', swamp: '#2f5231' },
  autumn: { grass: '#b87a35', flowers: '#c86639', dirt: '#806143', sand: '#d2b681', stone: '#8f8780', water: '#396a8d', ice: '#e2f0fa', swamp: '#4b4a2c' },
  winter: { grass: '#e9f2f7', flowers: '#e2edf5', dirt: '#d9e2e9', sand: '#eef3f6', stone: '#d5dce3', water: '#bcd7e8', ice: '#dff2ff', swamp: '#c8d8df' }
};

/* Поселения: имена фиксированы в данных мира и используются в миникарте,
   большой карте и заданиях. Город держит все официальные здания одним
   двором; деревня — урезанный набор (трактир и 1–2 лавки). */
export const SETTLEMENTS = [
  { id: 'kamenny_brod', name: 'Каменный Брод', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'berezorechye', name: 'Березоречье', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'sedaya_gat', name: 'Седая Гать', type: 'village', shops: ['hall', 'house', 'tavern', 'forge'] },
  { id: 'ovinets', name: 'Овинец', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'krinichny_dol', name: 'Криничный Дол', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'gromograd', name: 'Громоград', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'mokhovka', name: 'Моховка', type: 'village', shops: ['hall', 'house', 'tavern', 'forge'] },
  { id: 'zhitnaya_luka', name: 'Житная Лука', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'yasny_grad', name: 'Ясный Град', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'voroniy_yar', name: 'Вороний Яр', type: 'village', shops: ['hall', 'house', 'tavern', 'armor'] },
  { id: 'rzhanopolye', name: 'Ржанополье', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'sedograd', name: 'Седоград', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'sosnovy_bor', name: 'Сосновый Бор', type: 'village', shops: ['hall', 'house', 'tavern', 'forge'] },
  { id: 'yagodnaya_luka', name: 'Ягодная Лука', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'vetrogorck', name: 'Ветрогорск', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'lnyanaya_gryada', name: 'Льняная Гряда', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] },
  { id: 'gniloy_ruchey', name: 'Гнилой Ручей', type: 'village', shops: ['hall', 'house', 'tavern', 'forge'] },
  { id: 'zlatoverkh', name: 'Златоверх', type: 'city', shops: ['hall', 'house', 'house', 'magic', 'forge', 'weapons', 'armor', 'tavern', 'inn', 'market', 'church'] },
  { id: 'pelnaya_sopka', name: 'Пепельная Сопка', type: 'village', shops: ['hall', 'house', 'tavern', 'armor'] },
  { id: 'zarechye', name: 'Заречье', type: 'village', shops: ['hall', 'house', 'tavern', 'market'] }
];
export const settlementOf = (index) => SETTLEMENTS[Math.abs(Math.round(Number(index) || 0)) % SETTLEMENTS.length];
export const SETTLEMENT_TYPE_NAME = { city: 'город', village: 'деревня' };

/* Сложность диких монстров привязана к расстоянию от стартовой точки
   (манхэттен до входа на карту), а не к номеру карты или её размеру. */
export const DISTANCE_BANDS = [
  { id: 'near', max: 8, name: 'стартовый радиус', monsters: ['mouse'], elites: false, boss: false, tier: 0 },
  { id: 'mid', max: 13, name: 'ближние тропы', monsters: ['spider', 'wolf', 'skeleton'], elites: false, boss: false, tier: 1 },
  { id: 'far', max: 19, name: 'дальние края', monsters: ['spider', 'skeleton', 'goblin', 'orc', 'ghost', 'zombie'], elites: true, boss: false, tier: 2 },
  { id: 'outer', max: Infinity, name: 'самые дальние пределы', monsters: ['orc', 'troll', 'mummy', 'vampire', 'lich', 'golem', 'wyvern'], elites: true, boss: true, tier: 3 }
];
export function distanceBand(distance){
  const d=Math.max(0,Number(distance)||0);
  return DISTANCE_BANDS.find(b=>d<=b.max)||DISTANCE_BANDS[DISTANCE_BANDS.length-1];
}

/* Сток лавок обновляется раз в игровой день (1440 минут игрового времени).
   Оружейная добавляет 10% брони, бронница — 10% оружия. */
export const STOCK_RULES = { periodMinutes: 24 * 60, crossSellRatio: 0.1, periodName: 'день' };

export const DIFFICULTY = [
  { id: 'easy', name: 'Лёгкая', maps: [9, 11], size: [30, 30], tier: 0, monsters: 3, boss: 0, gold: 1.25 },
  { id: 'normal', name: 'Средняя', maps: [12, 14], size: [30, 30], tier: 1, monsters: 4, boss: 1, gold: 1 },
  { id: 'hard', name: 'Сложная', maps: [15, 16], size: [30, 30], tier: 2, monsters: 5, boss: 2, gold: 0.85 }
];

export const LAYOUTS = [
  [2, 5], [2, 6], [3, 4], [3, 5], [4, 4], [4, 5], [2, 7], [3, 6], [4, 6], [5, 5], [2, 8]
];

export const TREASURES = [
  { id: 'coin', name: 'Монеты', icon: '🪙', kind: 'gold', min: 3, max: 9 },
  { id: 'potion_hp', name: 'Зелье жизни', icon: '🧪', kind: 'item', count: 1 },
  { id: 'potion_mp', name: 'Зелье маны', icon: '🧪', kind: 'item', count: 1 },
  { id: 'herb', name: 'Трава', icon: '🌿', kind: 'herb' },
  { id: 'dagger', name: 'Кинжал', icon: '🗡', kind: 'weapon', level: 1 },
  { id: 'sword', name: 'Меч', icon: '⚔', kind: 'weapon', level: 2 },
  { id: 'leather', name: 'Кожаная броня', icon: '🛡', kind: 'armor', level: 1 },
  { id: 'crystal', name: 'Кристалл', icon: '💎', kind: 'crystal' },
  { id: 'scroll', name: 'Свиток', icon: '📜', kind: 'scroll' },
  { id: 'ore', name: 'Руда', icon: '⛏', kind: 'material', id2: 'ore' },
  { id: 'cloth', name: 'Ткань', icon: '🧵', kind: 'material', id2: 'cloth' },
  { id: 'wood', name: 'Древесина', icon: '🪵', kind: 'material', id2: 'wood' }
];

export const BOSS_BONUSES = [
  { id: 'atk', name: '+Атака', value: 5, icon: '⚔' },
  { id: 'def', name: '+Защита', value: 4, icon: '🛡' },
  { id: 'magic', name: '+Магия', value: 6, icon: '✨' }
];

export const GAME_RECORDS = [
  { id: 'kill_skeleton_dungeon', text: 'Убит скелетом в подземелье' },
  { id: 'kill_turtle_sf', text: 'Убит черепахой в Подземелье 28' },
  { id: 'kill_zombie_mm6', text: 'Убит зомби в Авантюристе' },
  { id: 'kill_lich_mm6', text: 'Убит личем в Авантюристе' },
  { id: 'boss_mm6', text: 'Победён босс в Авантюристе' },
  { id: 'flee_mm6', text: 'Удачный побег в Авантюристе' }
];

// Настройки «полный дубль подземелья»: значения по умолчанию.
export const DEFAULT_SETTINGS = {
  difficulty: 'normal', floors: 5, cellSize: 16, mapSize: 30, monstersAdd: 0, itemRate: 2,
  shieldVal: 3, starVal: 1, sound: 10, sfx: 10, amb: 10, music: 0, tempo: 600,
  melody: 'town', simple: true, extreme: false, criticalAI: false, vibro: true,
  keysMode: 'all', keysLayout: 'both', showHints: true, battleMirror: false,
  // Новые настраиваемые параметры Авантюриста.
  partySize: 3, heroSpeed: 1, monsterSpeed: 1, monsterPower: 1,
  bonusEvery: 6, logLimit: 1000, floatDamage: true, breathAnim: true,
  // Погода/животные/лес. Шаговый цикл погоды отключён по DESIGN.md: погода следует за сезоном.
  weatherCycleSteps: 100, maxAnimals: 2, animalSpawnEvery: 10, treeDensity: 0.2
};
