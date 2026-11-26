// MM6 expansion pack. Dungeon28 remains the canonical base; everything here extends it locally.
// Все пользовательские строки — на русском языке.

export const QUALITY = [
  { id: 0, name: 'Ржавое', short: 'Рж', mult: 1, forgeCost: 0, crit: 0 },
  { id: 1, name: 'Острое', short: 'Остр', mult: 1.25, forgeCost: 1, crit: 2 },
  { id: 2, name: 'Золотое', short: 'Зол', mult: 1.5, forgeCost: 2, crit: 4 },
  { id: 3, name: 'Волшебное', short: 'Волш', mult: 1.8, forgeCost: 3, crit: 6 },
  { id: 4, name: 'Зачарованное', short: 'Зач', mult: 2.1, forgeCost: 4, crit: 8 }
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

export const HERBS = [
  { id: 'mint', name: 'Мята', icon: '🌿', effect: 'mana', value: 3, desc: '+3 MP', weight: 0 },
  { id: 'sage', name: 'Шалфей', icon: '🌾', effect: 'hp', value: 12, desc: '+12 HP', weight: 0 },
  { id: 'thistle', name: 'Чертополох', icon: '🌵', effect: 'poison', value: 2, desc: 'яд 2', weight: 0 },
  { id: 'moss', name: 'Мох', icon: '🍀', effect: 'def', value: 3, desc: '+3 брони', weight: 0 },
  { id: 'root', name: 'Корень', icon: '🥕', effect: 'hp', value: 24, desc: '+24 HP', weight: 0 },
  { id: 'fern', name: 'Папоротник', icon: '🌿', effect: 'mana', value: 6, desc: '+6 MP', weight: 0 },
  { id: 'bloom', name: 'Цветок света', icon: '🌼', effect: 'curse', value: 1, desc: 'снимает проклятие', weight: 0 },
  { id: 'bark', name: 'Кора', icon: '🪵', effect: 'def', value: 5, desc: '+5 брони', weight: 0 },
  { id: 'berry', name: 'Ягода', icon: '🫐', effect: 'hp', value: 8, desc: '+8 HP', weight: 0 },
  { id: 'crystalgrass', name: 'Кристалл-трава', icon: '💎', effect: 'crystal', value: 1, desc: '+1 кристалл', weight: 0 },
  { id: 'firepetal', name: 'Огненный лепесток', icon: '🔥', effect: 'atk', value: 4, desc: '+4 атаки', weight: 0 },
  { id: 'iceflower', name: 'Ледяной цветок', icon: '❄', effect: 'slow', value: 2, desc: 'замедление', weight: 0 }
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
  { id: 'craft_sword', name: 'Сковать меч', need: ['ore', 'ore'], give: { id: 'craft_sword', count: 1 }, icon: '⚔', kind: 'weapon', desc: 'Урон 6, качество «Острое».' },
  { id: 'craft_axe', name: 'Сковать топор', need: ['ore', 'wood'], give: { id: 'craft_axe', count: 1 }, icon: '🪓', kind: 'weapon', desc: 'Урон 7, качество «Острое».' },
  { id: 'craft_armor', name: 'Сшить доспех', need: ['cloth', 'cloth', 'ore'], give: { id: 'craft_armor', count: 1 }, icon: '🛡', kind: 'armor', desc: 'Защита 4, слот «тело».' },
  { id: 'craft_shield', name: 'Сковать щит', need: ['ore', 'wood'], give: { id: 'craft_shield', count: 1 }, icon: '🛡', kind: 'armor', desc: 'Защита 3, слот «щит».' },
  { id: 'craft_scroll', name: 'Создать свиток молнии', need: ['fern', 'crystalgrass'], give: { id: 'craft_scroll', count: 1 }, icon: '📜', kind: 'spell', desc: 'Свиток слабой молнии.' }
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

const I = '../../assets/sprites/items/';
const UI = '../../assets/sprites/ui/';
const K = '../../assets/kenney/items/';
const ARMOR_ICON = K + 'armor_0.png';

// 8 слотов: поножи, сапоги, поручи и перчатки — независимые слоты,
// каждый со своим предметом и своей парой «слот + защита».
export const ARMOR_SLOTS = [
  { id: 'shield', name: 'Щит', icon: '🛡', sprite: I + 'shield_5.svg' },
  { id: 'helmet', name: 'Шлем', icon: '⛑' },
  { id: 'body', name: 'Тело', icon: '👕' },
  { id: 'legs', name: 'Поножи', icon: '🦵', sprite: I + 'greaves_5.svg' },
  { id: 'boots', name: 'Сапоги', icon: '👢', sprite: I + 'boots_5.svg' },
  { id: 'bracers', name: 'Поручи', icon: '💪', sprite: I + 'bracers_5.svg' },
  { id: 'hands', name: 'Перчатки', icon: '🧤', sprite: I + 'gloves_5.svg' },
  { id: 'cloak', name: 'Плащ', icon: '🧥', sprite: I + 'robe_5.svg' }
];

export const ARMORS = [
  // Стартовые лохмотья: нельзя снять и нельзя продать, при надевании другой одежды удаляются.
  { name: 'Тряпичная одежда', weight: 1, armorCategory: 'cloth', def: 0, cost: 0, set: 'any', slot: 'body', dir: 'def', sprite: ARMOR_ICON,
    unsellable: true, unequippable: true, starting: true },
  { name: 'Деревянный щит', weight: 1, armorCategory: 'cloth', def: 1, cost: 2, set: 'any', slot: 'shield', dir: 'def', sprite: K + 'shield.png' },
  { name: 'Кожаный щит', weight: 4, armorCategory: 'leather', def: 3, cost: 5, set: 'any', slot: 'shield', dir: 'def', sprite: K + 'shield.png' },
  { name: 'Рыцарский щит', weight: 7, armorCategory: 'light_metal', def: 6, cost: 11, set: 'warrior', slot: 'shield', dir: 'def', sprite: K + 'shield.png' },
  { name: 'Золотой щит', weight: 8, armorCategory: 'light_metal', def: 9, cost: 18, set: 'any', slot: 'shield', dir: 'def', sprite: K + 'shield.png' },
  { name: 'Тканевый капюшон', weight: 1, armorCategory: 'cloth', def: 1, cost: 2, set: 'any', slot: 'helmet', dir: 'def', sprite: K + 'helmet.png' },
  { name: 'Кожаный шлем', weight: 3, armorCategory: 'leather', def: 2, cost: 4, set: 'warrior', slot: 'helmet', dir: 'def', sprite: K + 'helmet.png' },
  { name: 'Стальной шлем', weight: 6, armorCategory: 'light_metal', def: 4, cost: 9, set: 'warrior', slot: 'helmet', dir: 'def', sprite: K + 'helmet.png' },
  { name: 'Кожаный жилет', weight: 3, armorCategory: 'leather', def: 1, cost: 2, set: 'any', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кожаный доспех', weight: 4, armorCategory: 'leather', def: 2, cost: 4, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кольчуга', weight: 6, armorCategory: 'light_metal', def: 3, cost: 6, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Ламелляр', weight: 7, armorCategory: 'light_metal', def: 4, cost: 8, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Стальной панцирь', weight: 8, armorCategory: 'heavy', def: 5, cost: 10, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рыцарский облач', weight: 9, armorCategory: 'heavy', def: 6, cost: 12, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Тяжёлая броня', weight: 12, armorCategory: 'heavy', def: 7, cost: 14, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Мантия мага', weight: 1, armorCategory: 'robe', def: 1, cost: 3, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Украшенная роба', weight: 2, armorCategory: 'robe', def: 2, cost: 6, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Роба архимага', weight: 2, armorCategory: 'robe', def: 3, cost: 10, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Куртка следопыта', weight: 6, armorCategory: 'leather', def: 8, cost: 14, set: 'archer', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Плащ разбойника', weight: 1, armorCategory: 'cloth', def: 4, cost: 8, set: 'archer', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Лесной доспех', weight: 6, armorCategory: 'leather', def: 9, cost: 16, set: 'archer', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Святые доспехи', weight: 11, armorCategory: 'heavy', def: 10, cost: 20, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Доспех круглого стола', weight: 15, armorCategory: 'heavy', def: 11, cost: 26, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Стальные поножи', weight: 6, armorCategory: 'light_metal', def: 3, cost: 7, set: 'warrior', slot: 'legs', dir: 'def', sprite: I + 'greaves_5.svg' },
  { name: 'Кожаные сапоги', weight: 3, armorCategory: 'leather', def: 1, cost: 2, set: 'any', slot: 'boots', dir: 'def', sprite: I + 'boots_5.svg' },
  { name: 'Сапоги следопыта', weight: 4, armorCategory: 'leather', def: 2, cost: 6, set: 'archer', slot: 'boots', dir: 'def', sprite: I + 'boots_5.svg' },
  { name: 'Кожаные поручи', weight: 3, armorCategory: 'leather', def: 1, cost: 2, set: 'any', slot: 'bracers', dir: 'def', sprite: I + 'bracers_5.svg' },
  { name: 'Рыцарские наручи', weight: 6, armorCategory: 'light_metal', def: 3, cost: 8, set: 'warrior', slot: 'bracers', dir: 'def', sprite: I + 'bracers_5.svg' },
  { name: 'Наручи чародея', weight: 2, armorCategory: 'robe', def: 2, cost: 7, set: 'mage', slot: 'bracers', dir: 'def', sprite: I + 'bracers_5.svg' },
  { name: 'Кожаные перчатки', weight: 3, armorCategory: 'leather', def: 1, cost: 2, set: 'any', slot: 'hands', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рыцарские рукавицы', weight: 6, armorCategory: 'light_metal', def: 3, cost: 8, set: 'warrior', slot: 'hands', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рукавицы чародея', weight: 2, armorCategory: 'robe', def: 2, cost: 7, set: 'mage', slot: 'hands', dir: 'def', sprite: ARMOR_ICON }
];

// Комплект иконок по тирам: tier === номер SVG. Лёгкое — магу, среднее — следопыту,
// тяжёлое (защита 7 и выше) — воину. Поле group разделяет варианты одного слота в аудитах.
export const EQUIPMENT_GROUPS = [
  { id: 'greaves', name: 'Поножи', sprite: I + 'greaves_5.svg' },
  { id: 'boots', name: 'Сапоги', sprite: I + 'boots_5.svg' },
  { id: 'bracers', name: 'Поручи', sprite: I + 'bracers_5.svg' },
  { id: 'gloves', name: 'Перчатки', sprite: I + 'gloves_5.svg' }
];

// 40 предметов четырёх независимых слотов. Тир = защита; лёгкие тиры 1–3
// продаёт только магия, средние и тяжёлые — только бронница/оружейная палата.
// Рынок и кузница не продают предметы комплекта, чтобы ассортименты не пересекались.
export const TIERED_EQUIPMENT = [
  { id: 'greaves_1', group: 'greaves', tier: 1, name: 'Тряпичные обмотки', def: 1, cost: 2, set: 'mage', slot: 'legs', dir: 'def', shops: ['magic'], sprite: I + 'greaves_1.svg', icon: '🛡', weight: 1, armorCategory: 'cloth' },
  { id: 'greaves_2', group: 'greaves', tier: 2, name: 'Тканевые поножи', def: 2, cost: 4, set: 'mage', slot: 'legs', dir: 'def', shops: ['magic'], sprite: I + 'greaves_2.svg', icon: '🛡', weight: 2, armorCategory: 'cloth' },
  { id: 'greaves_3', group: 'greaves', tier: 3, name: 'Кожаные поножи', def: 3, cost: 7, set: 'mage', slot: 'legs', dir: 'def', shops: ['magic'], sprite: I + 'greaves_3.svg', icon: '🛡', weight: 4, armorCategory: 'leather' },
  { id: 'greaves_4', group: 'greaves', tier: 4, name: 'Походные поножи', def: 4, cost: 11, set: 'archer', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_4.svg', icon: '🛡', weight: 5, armorCategory: 'leather' },
  { id: 'greaves_5', group: 'greaves', tier: 5, name: 'Лесные поножи', def: 5, cost: 16, set: 'archer', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_5.svg', icon: '🛡', weight: 5, armorCategory: 'leather' },
  { id: 'greaves_6', group: 'greaves', tier: 6, name: 'Стрелецкие поножи', def: 6, cost: 22, set: 'archer', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_6.svg', icon: '🛡', weight: 6, armorCategory: 'leather' },
  { id: 'greaves_7', group: 'greaves', tier: 7, name: 'Железные поножи', def: 7, cost: 29, set: 'warrior', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_7.svg', icon: '🛡', weight: 7, armorCategory: 'light_metal' },
  { id: 'greaves_8', group: 'greaves', tier: 8, name: 'Латные поножи', def: 8, cost: 37, set: 'warrior', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_8.svg', icon: '🛡', weight: 9, armorCategory: 'heavy' },
  { id: 'greaves_9', group: 'greaves', tier: 9, name: 'Серебряные латные поножи', def: 9, cost: 46, set: 'warrior', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_9.svg', icon: '🛡', weight: 10, armorCategory: 'heavy' },
  { id: 'greaves_10', group: 'greaves', tier: 10, name: 'Золотые латные поножи', def: 10, cost: 56, set: 'warrior', slot: 'legs', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'greaves_10.svg', icon: '🛡', weight: 11, armorCategory: 'heavy' },

  { id: 'boots_1', group: 'boots', tier: 1, name: 'Тряпичные сандалии', def: 1, cost: 2, set: 'mage', slot: 'boots', dir: 'def', shops: ['magic'], sprite: I + 'boots_1.svg', icon: '🛡', weight: 1, armorCategory: 'cloth' },
  { id: 'boots_2', group: 'boots', tier: 2, name: 'Тканевые башмаки', def: 2, cost: 4, set: 'mage', slot: 'boots', dir: 'def', shops: ['magic'], sprite: I + 'boots_2.svg', icon: '🛡', weight: 2, armorCategory: 'cloth' },
  { id: 'boots_3', group: 'boots', tier: 3, name: 'Мягкие сапожки', def: 3, cost: 6, set: 'mage', slot: 'boots', dir: 'def', shops: ['magic'], sprite: I + 'boots_3.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'boots_4', group: 'boots', tier: 4, name: 'Походные сапоги', def: 4, cost: 9, set: 'archer', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_4.svg', icon: '🛡', weight: 4, armorCategory: 'leather' },
  { id: 'boots_5', group: 'boots', tier: 5, name: 'Лесные сапоги', def: 5, cost: 13, set: 'archer', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_5.svg', icon: '🛡', weight: 4, armorCategory: 'leather' },
  { id: 'boots_6', group: 'boots', tier: 6, name: 'Сапоги лучника', def: 6, cost: 18, set: 'archer', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_6.svg', icon: '🛡', weight: 5, armorCategory: 'leather' },
  { id: 'boots_7', group: 'boots', tier: 7, name: 'Укреплённые сапоги', def: 7, cost: 24, set: 'warrior', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_7.svg', icon: '🛡', weight: 6, armorCategory: 'light_metal' },
  { id: 'boots_8', group: 'boots', tier: 8, name: 'Стальные сапоги', def: 8, cost: 31, set: 'warrior', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_8.svg', icon: '🛡', weight: 8, armorCategory: 'heavy' },
  { id: 'boots_9', group: 'boots', tier: 9, name: 'Рыцарские сапоги', def: 9, cost: 39, set: 'warrior', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_9.svg', icon: '🛡', weight: 9, armorCategory: 'heavy' },
  { id: 'boots_10', group: 'boots', tier: 10, name: 'Золотые сапоги', def: 10, cost: 48, set: 'warrior', slot: 'boots', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'boots_10.svg', icon: '🛡', weight: 10, armorCategory: 'heavy' },

  { id: 'bracers_1', group: 'bracers', tier: 1, name: 'Тканевые наручи', def: 1, cost: 2, set: 'mage', slot: 'bracers', dir: 'def', shops: ['magic'], sprite: I + 'bracers_1.svg', icon: '🛡', weight: 1, armorCategory: 'cloth' },
  { id: 'bracers_2', group: 'bracers', tier: 2, name: 'Кожаные поручи', def: 2, cost: 4, set: 'mage', slot: 'bracers', dir: 'def', shops: ['magic'], sprite: I + 'bracers_2.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'bracers_3', group: 'bracers', tier: 3, name: 'Мягкие наручи', def: 3, cost: 7, set: 'mage', slot: 'bracers', dir: 'def', shops: ['magic'], sprite: I + 'bracers_3.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'bracers_4', group: 'bracers', tier: 4, name: 'Походные поручи', def: 4, cost: 11, set: 'archer', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_4.svg', icon: '🛡', weight: 4, armorCategory: 'leather' },
  { id: 'bracers_5', group: 'bracers', tier: 5, name: 'Лесные поручи', def: 5, cost: 16, set: 'archer', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_5.svg', icon: '🛡', weight: 5, armorCategory: 'leather' },
  { id: 'bracers_6', group: 'bracers', tier: 6, name: 'Стрелецкие поручи', def: 6, cost: 22, set: 'archer', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_6.svg', icon: '🛡', weight: 5, armorCategory: 'leather' },
  { id: 'bracers_7', group: 'bracers', tier: 7, name: 'Укреплённые поручи', def: 7, cost: 29, set: 'warrior', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_7.svg', icon: '🛡', weight: 7, armorCategory: 'light_metal' },
  { id: 'bracers_8', group: 'bracers', tier: 8, name: 'Железные наручи', def: 8, cost: 37, set: 'warrior', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_8.svg', icon: '🛡', weight: 8, armorCategory: 'heavy' },
  { id: 'bracers_9', group: 'bracers', tier: 9, name: 'Рыцарские наручи', def: 9, cost: 46, set: 'warrior', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_9.svg', icon: '🛡', weight: 9, armorCategory: 'heavy' },
  { id: 'bracers_10', group: 'bracers', tier: 10, name: 'Золотые наручи', def: 10, cost: 56, set: 'warrior', slot: 'bracers', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'bracers_10.svg', icon: '🛡', weight: 10, armorCategory: 'heavy' },

  { id: 'gloves_1', group: 'gloves', tier: 1, name: 'Тряпичные варежки', def: 1, cost: 2, set: 'mage', slot: 'hands', dir: 'def', shops: ['magic'], sprite: I + 'gloves_1.svg', icon: '🛡', weight: 1, armorCategory: 'cloth' },
  { id: 'gloves_2', group: 'gloves', tier: 2, name: 'Тканевые перчатки', def: 2, cost: 4, set: 'mage', slot: 'hands', dir: 'def', shops: ['magic'], sprite: I + 'gloves_2.svg', icon: '🛡', weight: 1, armorCategory: 'cloth' },
  { id: 'gloves_3', group: 'gloves', tier: 3, name: 'Мягкие рукавицы', def: 3, cost: 7, set: 'mage', slot: 'hands', dir: 'def', shops: ['magic'], sprite: I + 'gloves_3.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'gloves_4', group: 'gloves', tier: 4, name: 'Походные перчатки', def: 4, cost: 11, set: 'archer', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_4.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'gloves_5', group: 'gloves', tier: 5, name: 'Лесные рукавицы', def: 5, cost: 16, set: 'archer', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_5.svg', icon: '🛡', weight: 3, armorCategory: 'leather' },
  { id: 'gloves_6', group: 'gloves', tier: 6, name: 'Рукавицы стрелка', def: 6, cost: 22, set: 'archer', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_6.svg', icon: '🛡', weight: 4, armorCategory: 'leather' },
  { id: 'gloves_7', group: 'gloves', tier: 7, name: 'Укреплённые рукавицы', def: 7, cost: 29, set: 'warrior', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_7.svg', icon: '🛡', weight: 7, armorCategory: 'light_metal' },
  { id: 'gloves_8', group: 'gloves', tier: 8, name: 'Железные рукавицы', def: 8, cost: 37, set: 'warrior', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_8.svg', icon: '🛡', weight: 8, armorCategory: 'heavy' },
  { id: 'gloves_9', group: 'gloves', tier: 9, name: 'Рыцарские рукавицы', def: 9, cost: 46, set: 'warrior', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_9.svg', icon: '🛡', weight: 9, armorCategory: 'heavy' },
  { id: 'gloves_10', group: 'gloves', tier: 10, name: 'Золотые рукавицы', def: 10, cost: 56, set: 'warrior', slot: 'hands', dir: 'def', shops: ['armory', 'armor'], sprite: I + 'gloves_10.svg', icon: '🛡', weight: 10, armorCategory: 'heavy' }
];

// Ассортимент и наценки. У каждой лавки товары свои.
export const SHOP_STOCK = {
  // Оружейная палата и кузница — только оружие. Бронница — только броня.
  weapons: { weapons: [0, 1, 5, 6, 10, 11, 14, 15], armor: [], price: 1, sell: 0.6, magic: false },
  armory: { weapons: [], armor: [2, 5, 9, 11, 14, 20, 23, 25, 27], price: 1.15, sell: 0.62, magic: false },
  forge: { weapons: [0, 1, 2, 3, 4, 5, 6, 7], armor: [], price: 0.9, sell: 0.55, magic: false },
  armor: { weapons: [], armor: [1, 2, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], price: 1, sell: 0.6, magic: false },
  magic: { weapons: [0, 5, 6, 10, 11], armor: [5, 16, 17, 18, 28], price: 1.25, sell: 0.58, magic: true, spellDiscount: 0.65, crystals: 2 },
  jeweler: { weapons: [10, 11, 14, 15], armor: [4, 18, 27, 28], price: 1.6, sell: 0.75, magic: true, crystals: 5, noHeavy: true },
  market: { weapons: [0, 1, 5], armor: [1, 8, 24, 26], price: 0.95, sell: 0.5, berries: true, food: true },
  tavern: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, food: true },
  inn: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, rest: true }
};

export const SHOP_TYPES = [
  { id: 'weapons', title: 'Оружейная', icon: '⚔', accent: '#f87171', desc: 'Только оружие.', names: ['Оружейная «Клинок»', 'Лавка братьев-кузнецов', 'Оружейная у городских ворот'] },
  { id: 'armory', title: 'Оружейная палата', icon: '🗡', accent: '#fb923c', desc: 'Только доспехи.', names: ['Оружейная палата', 'Арсенал короля', 'Склад оружейника'] },
  { id: 'forge', title: 'Кузница', icon: '🔨', accent: '#f97316', desc: 'Оружие и перековка оружия.', names: ['Кузница «Гром»', 'Горн и наковальня', 'Кузня у моста'] },
  { id: 'armor', title: 'Бронница', icon: '🛡', accent: '#60a5fa', desc: 'Доспехи и усиление брони.', names: ['Бронница «Щит и шлем»', 'Лавка доспехов', 'Бронная лавка'] },
  { id: 'magic', title: 'Магазин магии', icon: '✨', accent: '#c084fc', desc: 'Свитки, заклинания, зелья.', names: ['Магазин магии «Звезда»', 'Лавка чародея', 'Дом заклинаний'] },
  { id: 'jeweler', title: 'Ювелир', icon: '💎', accent: '#34d399', desc: 'Кристаллы и украшения.', names: ['Ювелир «Изумруд»', 'Лавка драгоценностей', 'Ювелирная мастерская'] },
  { id: 'market', title: 'Рынок', icon: '🛒', accent: '#fbbf24', desc: 'Травы, еда, разные товары.', names: ['Рынок у фонтана', 'Торговая площадь', 'Рынок «Ягода»'] },
  { id: 'tavern', title: 'Таверна', icon: '🍺', accent: '#fbbf24', desc: 'Еда за монеты.', names: ['Таверна «Золотой бокал»', 'Таверна «У доброго трактирщика»', 'Харчевня «Круглый стол»'] },
  { id: 'inn', title: 'Гостиница', icon: '🛏', accent: '#a78bfa', desc: 'Сон и восстановление.', names: ['Гостиница «Отдых»', 'Постоялый двор', 'Гостиница «Тихий двор»'] }
];

// Каталог зданий. Поле shop_kind повторяет assets/manifest.json
// (источник — assets/buildings-batch.json). null/[] означает, что торговли нет:
// такое здание показывает только декоративную реплику.
export const BUILDING_TYPES = [
  { id: 'house_straw_0', title: 'Соломенная хижина', kind: 'house', shop_kind: null,
    deco: 'В соломенной хижине тихо: хозяева ушли на рынок.' },
  { id: 'house_tile_0', title: 'Черепичный дом', kind: 'house', shop_kind: null,
    deco: 'Из-за черепичной двери доносится детский смех и запах похлёбки.' },
  { id: 'stone_house_0', title: 'Каменный дом', kind: 'house', shop_kind: null,
    deco: 'Каменный дом заперт на тяжёлый засов. Здесь живут, а не торгуют.' },
  { id: 'barn_0', title: 'Амбар', kind: 'barn', shop_kind: null,
    deco: 'В амбаре пахнет сеном и зерном. Ничего для продажи не выставлено.' },
  { id: 'shed_0', title: 'Сарай', kind: 'shed', shop_kind: null,
    deco: 'В сарае свалены старые грабли и бочки. Хозяин не любит гостей.' },
  { id: 'well_0', title: 'Колодец', kind: 'well', shop_kind: null,
    deco: 'Вы заглядываете в колодец: в тёмной воде отражается небо.' },
  { id: 'stable_0', title: 'Конюшня', kind: 'stable', shop_kind: null,
    deco: 'Лошади фыркают и косятся на вас. Конюх занят и не торгует.' },
  { id: 'forge_0', title: 'Кузница', kind: 'forge', shop_kind: ['forge'] },
  { id: 'shop_0', title: 'Лавка', kind: 'market', shop_kind: ['market'] },
  { id: 'tavern_0', title: 'Таверна', kind: 'tavern', shop_kind: ['tavern'] },
  { id: 'armory_0', title: 'Оружейня', kind: 'weapons', shop_kind: ['weapons', 'armory', 'armor'] },
  { id: 'jewelry_0', title: 'Ювелирная лавка', kind: 'jeweler', shop_kind: ['jeweler'] },
  { id: 'magic_0', title: 'Магазин магии', kind: 'magic', shop_kind: ['magic'] },
  { id: 'inn_0', title: 'Гостиница', kind: 'inn', shop_kind: ['inn'] }
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
  // Погода/животные. Шаговый цикл погоды отключён по DESIGN.md: погода следует за сезоном.
  weatherCycleSteps: 100, maxAnimals: 2, animalSpawnEvery: 10
};
