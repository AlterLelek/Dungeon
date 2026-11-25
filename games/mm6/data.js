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
  { name: 'Гном-кулига', set: 'warrior', hp: 110, mp: 2, sprite: '../../assets/sprites/heroes/knight_0.png', desc: 'Живуч, но медлителен. Не умеет колдовать — магия доступна только Гному-колдуну.' },
  { name: 'Гном-колдун', set: 'mage', hp: 96, mp: 8, sprite: '../../assets/sprites/heroes/wizard_0.png', desc: 'Единственный гном, владеющий магией. Кристаллы усиливают его чары.' }
];

// Ограничения классов и рас: true = ограничение есть.
export const HERO_RESTRICTIONS = {
  'Гном-кулига': { magic: true, reason: 'Гном-кулига не владеет магией. Нужен Гном-колдун.' },
  mage: { armorHeavy: true, reason: 'Маг не носит тяжёлую броню (защита 7+).' },
  warrior: { staff: true, reason: 'Воин плохо владеет посохом.' }
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
  { id: 'mint', name: 'Мята', icon: '🌿', effect: 'mana', value: 3, desc: '+3 MP' },
  { id: 'sage', name: 'Шалфей', icon: '🌾', effect: 'hp', value: 12, desc: '+12 HP' },
  { id: 'thistle', name: 'Чертополох', icon: '🌵', effect: 'poison', value: 2, desc: 'яд 2' },
  { id: 'moss', name: 'Мох', icon: '🍀', effect: 'def', value: 3, desc: '+3 брони' },
  { id: 'root', name: 'Корень', icon: '🥕', effect: 'hp', value: 24, desc: '+24 HP' },
  { id: 'fern', name: 'Папоротник', icon: '🌿', effect: 'mana', value: 6, desc: '+6 MP' },
  { id: 'bloom', name: 'Цветок света', icon: '🌼', effect: 'curse', value: 1, desc: 'снимает проклятие' },
  { id: 'bark', name: 'Кора', icon: '🪵', effect: 'def', value: 5, desc: '+5 брони' },
  { id: 'berry', name: 'Ягода', icon: '🫐', effect: 'hp', value: 8, desc: '+8 HP' },
  { id: 'crystalgrass', name: 'Кристалл-трава', icon: '💎', effect: 'crystal', value: 1, desc: '+1 кристалл' },
  { id: 'firepetal', name: 'Огненный лепесток', icon: '🔥', effect: 'atk', value: 4, desc: '+4 атаки' },
  { id: 'iceflower', name: 'Ледяной цветок', icon: '❄', effect: 'slow', value: 2, desc: 'замедление' }
];

// Материалы для ремесла.
export const MATERIALS = [
  { id: 'ore', name: 'Руда', icon: '⛏', desc: 'Для ковки оружия и доспехов', cost: 4, sell: 2 },
  { id: 'cloth', name: 'Ткань', icon: '🧵', desc: 'Для пошива одежды', cost: 3, sell: 1 },
  { id: 'wood', name: 'Древесина', icon: '🪵', desc: 'Для древкового оружия', cost: 3, sell: 1 }
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
  { id: 'liquid_hp', name: 'Жидкость здоровья', icon: '🧴', stat: 'hp', value: 8, color: '#f87171' },
  { id: 'liquid_mp', name: 'Жидкость маны', icon: '🧴', stat: 'mp', value: 4, color: '#60a5fa' },
  { id: 'liquid_atk', name: 'Жидкость ярости', icon: '🧴', stat: 'atk', value: 3, color: '#fb923c' },
  { id: 'liquid_def', name: 'Жидкость камня', icon: '🧴', stat: 'def', value: 3, color: '#a3a3a3' },
  { id: 'liquid_poison', name: 'Жидкость яда', icon: '🧴', stat: 'poison', value: 3, color: '#4ade80' },
  { id: 'liquid_light', name: 'Жидкость света', icon: '🧴', stat: 'light', value: 5, color: '#fde68a' }
];

export const SCROLLS = [
  { id: 'scroll_fire', name: 'Свиток огня', spell: 'fire', cost: 12, icon: '📜' },
  { id: 'scroll_ice', name: 'Свиток льда', spell: 'ice', cost: 11, icon: '📜' },
  { id: 'scroll_heal', name: 'Свиток лечения', spell: 'heal', cost: 14, icon: '📜' },
  { id: 'scroll_shield', name: 'Свиток щита', spell: 'shield', cost: 9, icon: '📜' },
  { id: 'scroll_stun', name: 'Свиток оглушения', spell: 'stun', cost: 15, icon: '📜' },
  { id: 'scroll_vampire', name: 'Свиток вампиризма', spell: 'vampire', cost: 20, icon: '📜' },
  { id: 'scroll_quake', name: 'Свиток землетрясения', spell: 'quake', cost: 26, icon: '📜' },
  { id: 'scroll_light', name: 'Свиток света', spell: 'light', cost: 18, icon: '📜' },
  { id: 'scroll_mana', name: 'Свиток маны', spell: 'mana', cost: 10, icon: '📜' },
  { id: 'scroll_teleport', name: 'Свиток прыжка', spell: 'teleport', cost: 16, icon: '📜' },
  { id: 'scroll_lightning_all', name: 'Свиток грозы', spell: 'lightning_all', cost: 24, icon: '📜' },
  { id: 'scroll_heal_all', name: 'Свиток исцеления отряда', spell: 'heal_all', cost: 26, icon: '📜' }
];

const I = '../../assets/sprites/items/';
const UI = '../../assets/sprites/ui/';
const ARMOR_ICON = UI + 'shield.png';

// 6 слотов, 29 уникальных предметов: у каждого слота своя пара «слот + защита».
export const ARMOR_SLOTS = [
  { id: 'shield', name: 'Щит', icon: '🛡' },
  { id: 'helmet', name: 'Шлем', icon: '⛑' },
  { id: 'body', name: 'Тело', icon: '👕' },
  { id: 'legs', name: 'Ноги', icon: '👖' },
  { id: 'hands', name: 'Руки', icon: '🧤' },
  { id: 'cloak', name: 'Плащ', icon: '🧥' }
];

export const ARMORS = [
  { name: 'Тряпичная одежда', def: 0, cost: 0, set: 'any', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Деревянный щит', def: 1, cost: 2, set: 'any', slot: 'shield', dir: 'def', sprite: UI + 'shield.png' },
  { name: 'Кожаный щит', def: 3, cost: 5, set: 'any', slot: 'shield', dir: 'def', sprite: UI + 'shield.png' },
  { name: 'Рыцарский щит', def: 6, cost: 11, set: 'warrior', slot: 'shield', dir: 'def', sprite: UI + 'shield.png' },
  { name: 'Золотой щит', def: 9, cost: 18, set: 'any', slot: 'shield', dir: 'def', sprite: UI + 'shield.png' },
  { name: 'Тканевый капюшон', def: 1, cost: 2, set: 'any', slot: 'helmet', dir: 'def', sprite: UI + 'star.png' },
  { name: 'Кожаный шлем', def: 2, cost: 4, set: 'warrior', slot: 'helmet', dir: 'def', sprite: UI + 'star.png' },
  { name: 'Стальной шлем', def: 4, cost: 9, set: 'warrior', slot: 'helmet', dir: 'def', sprite: UI + 'star.png' },
  { name: 'Кожаный жилет', def: 1, cost: 2, set: 'any', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кожаный доспех', def: 2, cost: 4, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кольчуга', def: 3, cost: 6, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Ламелляр', def: 4, cost: 8, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Стальной панцирь', def: 5, cost: 10, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рыцарский облач', def: 6, cost: 12, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Тяжёлая броня', def: 7, cost: 14, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Мантия мага', def: 1, cost: 3, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Украшенная роба', def: 2, cost: 6, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Роба архимага', def: 3, cost: 10, set: 'mage', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Куртка следопыта', def: 8, cost: 14, set: 'archer', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Плащ разбойника', def: 4, cost: 8, set: 'archer', slot: 'cloak', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Лесной доспех', def: 9, cost: 16, set: 'archer', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Святые доспехи', def: 10, cost: 20, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Доспех круглого стола', def: 11, cost: 26, set: 'warrior', slot: 'body', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кожаные сапоги', def: 1, cost: 2, set: 'any', slot: 'legs', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Стальные поножи', def: 3, cost: 7, set: 'warrior', slot: 'legs', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Сапоги следопыта', def: 2, cost: 6, set: 'archer', slot: 'legs', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Кожаные перчатки', def: 1, cost: 2, set: 'any', slot: 'hands', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рыцарские рукавицы', def: 3, cost: 8, set: 'warrior', slot: 'hands', dir: 'def', sprite: ARMOR_ICON },
  { name: 'Рукавицы чародея', def: 2, cost: 7, set: 'mage', slot: 'hands', dir: 'def', sprite: ARMOR_ICON }
];

export const CLASS_PENALTY = {
  warrior: { staff: -3, bow: -2 },
  mage: { hammer: -3, axe: -2, armor7: -2 },
  archer: { hammer: -3, mace: -2, staff: -1 },
  paladin: { bow: -2, dagger: -1 },
  angel: { axe: -2, hammer: -2 },
  'Гном-кулига': { staff: -4, bow: -1, armor7: -1 },
  'Гном-колдун': { hammer: -3, axe: -2, armor7: -2 }
};

// Ассортимент и наценки. У каждой лавки товары свои.
export const SHOP_STOCK = {
  weapons: { weapons: [0, 1, 5, 6, 10, 11, 14, 15], armor: [1, 6, 24, 26], price: 1, sell: 0.6, magic: false },
  armory: { weapons: [0, 2, 5, 7, 12, 13, 16, 17], armor: [2, 5, 9, 11, 14, 20, 23, 25, 27], price: 1.15, sell: 0.62, magic: false },
  forge: { weapons: [0, 1, 2, 3, 4, 5, 6, 7], armor: [6, 13, 24, 26, 28], price: 0.9, sell: 0.55, magic: false },
  armor: { weapons: [0, 5, 10], armor: [1, 2, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28], price: 1, sell: 0.6, magic: false },
  magic: { weapons: [0, 5, 6, 10, 11], armor: [5, 16, 17, 18, 28], price: 1.25, sell: 0.58, magic: true, spellDiscount: 0.65, crystals: 2 },
  jeweler: { weapons: [10, 11, 14, 15], armor: [4, 18, 27, 28], price: 1.6, sell: 0.75, magic: true, crystals: 5, noHeavy: true },
  market: { weapons: [0, 1, 5], armor: [1, 8, 24, 26], price: 0.95, sell: 0.5, berries: true },
  tavern: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, food: true },
  inn: { weapons: [0, 5], armor: [1, 8], price: 1.1, sell: 0.5, rest: true }
};

export const SHOP_TYPES = [
  { id: 'weapons', title: 'Оружейная', icon: '⚔', accent: '#f87171', desc: 'Оружие и перековка.', names: ['Оружейная «Клинок»', 'Лавка братьев-кузнецов', 'Оружейная у городских ворот'] },
  { id: 'armory', title: 'Оружейная палата', icon: '🗡', accent: '#fb923c', desc: 'Оружие и доспехи.', names: ['Оружейная палата', 'Арсенал короля', 'Склад оружейника'] },
  { id: 'forge', title: 'Кузница', icon: '🔨', accent: '#f97316', desc: 'Перековка и усиление одежды.', names: ['Кузница «Гром»', 'Горн и наковальня', 'Кузня у моста'] },
  { id: 'armor', title: 'Бронница', icon: '🛡', accent: '#60a5fa', desc: 'Броня и усиление одежды.', names: ['Бронница «Щит и шлем»', 'Лавка доспехов', 'Бронная лавка'] },
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

// Цикл смены погоды в шагах игрока. Меняется 1 раз за цикл.
export const WEATHER_CYCLE_STEPS = 100;

export const DIFFICULTY = [
  { id: 'easy', name: 'Лёгкая', maps: [9, 11], size: [10, 12], tier: 0, monsters: 3, boss: 0, gold: 1.25 },
  { id: 'normal', name: 'Средняя', maps: [12, 14], size: [12, 16], tier: 1, monsters: 4, boss: 1, gold: 1 },
  { id: 'hard', name: 'Сложная', maps: [15, 16], size: [16, 20], tier: 2, monsters: 5, boss: 2, gold: 0.85 }
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
  difficulty: 'normal', floors: 5, cellSize: 16, mapSize: 14, monstersAdd: 0, itemRate: 2,
  shieldVal: 3, starVal: 1, sound: 10, sfx: 10, amb: 10, music: 0, tempo: 600,
  melody: 'town', simple: true, extreme: false, criticalAI: false, vibro: true,
  keysMode: 'all', keysLayout: 'both', showHints: true, battleMirror: false,
  // Новые настраиваемые параметры Авантюриста.
  partySize: 3, heroSpeed: 1, monsterSpeed: 1, monsterPower: 1,
  bonusEvery: 6, logLimit: 1000, floatDamage: true, breathAnim: true,
  // Погода/животные.
  weatherCycleSteps: 100, maxAnimals: 2, animalSpawnEvery: 10
};
