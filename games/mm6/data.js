// MM6 expansion pack. Dungeon28 remains the canonical base; everything here extends it locally.

export const QUALITY = [
  { id: 0, name: 'Ржавое', short: 'Рж', mult: 1, forgeCost: 0 },
  { id: 1, name: 'Острое', short: 'Остр', mult: 1.25, forgeCost: 1 },
  { id: 2, name: 'Золотое', short: 'Зол', mult: 1.5, forgeCost: 2 },
  { id: 3, name: 'Волшебное', short: 'Волш', mult: 1.8, forgeCost: 3 },
  { id: 4, name: 'Зачарованное', short: 'Зач', mult: 2.1, forgeCost: 4 }
];

export const EXTRA_HEROES = [
  { name: 'Друид', set: 'mage', hp: 88, mp: 7, sprite: '../dungeon28/assets/sprites/heroes/wizard_0.png', desc: 'Лесной маг. Лечит травой и вызывает бурю.' },
  { name: 'Разбойник', set: 'archer', hp: 84, mp: 3, sprite: '../dungeon28/assets/sprites/heroes/elf_archer_0.png', desc: 'Быстрый удар и находка монет.' },
  { name: 'Жрец', set: 'warrior', hp: 92, mp: 6, sprite: '../dungeon28/assets/sprites/heroes/paladin_0.png', desc: 'Молитва снимает яд и возвращает HP.' },
  { name: 'Амазонка', set: 'archer', hp: 86, mp: 4, sprite: '../dungeon28/assets/sprites/heroes/elf_archer_0.png', desc: 'Меткий выстрел пробивает броню.' },
  { name: 'Гном-кулига', set: 'warrior', hp: 110, mp: 2, sprite: '../dungeon28/assets/sprites/heroes/warrior_0.png', desc: 'Живуч, но медлителен. Любит золото.' }
];

// Colors give classic RPG subtypes. Gold monsters always cast spells.
export const MONSTER_COLORS = [
  { id: 'red', name: 'Красный', tint: '#ef4444', hp: 1.15, atk: 1.15, def: 0.9, speed: 1, gold: 1.2 },
  { id: 'yellow', name: 'Жёлтый', tint: '#facc15', hp: 1.05, atk: 0.95, def: 1.05, speed: 1.1, gold: 1.35 },
  { id: 'green', name: 'Зелёный', tint: '#4ade80', hp: 1.1, atk: 1, def: 1, speed: 1, gold: 1, poison: true },
  { id: 'blue', name: 'Синий', tint: '#60a5fa', hp: 0.95, atk: 1.05, def: 1.15, speed: 0.95, gold: 1.1, magic: true },
  { id: 'gold', name: 'Золотой', tint: '#fbbf24', hp: 1.4, atk: 1.3, def: 1.3, speed: 1.05, gold: 2, magic: true }
];

const M = '../dungeon28/assets/sprites/monsters/';
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

export const SPELLS = [
  { id: 'fire', name: 'Огненный шар', mp: 3, power: 12, icon: '🔥', desc: 'Урон по одному врагу.' },
  { id: 'ice', name: 'Ледяная стрела', mp: 3, power: 10, icon: '❄', desc: 'Урон и замедление.' },
  { id: 'lightning', name: 'Молния', mp: 4, power: 16, icon: '⚡', desc: 'Сильный урон.' },
  { id: 'heal', name: 'Исцеление', mp: 3, heal: 30, icon: '✚', desc: 'Лечит активного героя.' },
  { id: 'shield', name: 'Щит', mp: 2, shield: 8, icon: '🛡', desc: 'Временная броня.' },
  { id: 'poison', name: 'Отравление', mp: 3, poison: 4, icon: '☠', desc: 'Яд на 2 хода.' },
  { id: 'sleep', name: 'Сон', mp: 5, stun: 2, icon: '💤', desc: 'Враг пропускает 2 хода.' },
  { id: 'stun', name: 'Оглушение', mp: 4, stun: 1, icon: '💥', desc: 'Враг пропускает ход.' },
  { id: 'vampire', name: 'Вампиризм', mp: 5, power: 10, drain: 8, icon: '🩸', desc: 'Урон и лечение.' },
  { id: 'bless', name: 'Благословение', mp: 4, atk: 6, icon: '✨', desc: 'Усиливает удар на 3 боя.' },
  { id: 'curse', name: 'Проклятие', mp: 4, def: -4, icon: '🌑', desc: 'Снижает защиту врага.' },
  { id: 'quake', name: 'Землетрясение', mp: 7, power: 9, aoe: true, icon: '⛰', desc: 'Урон всем врагам.' },
  { id: 'wind', name: 'Вихрь', mp: 5, power: 11, aoe: true, icon: '🌪', desc: 'Урон всем врагам.' },
  { id: 'light', name: 'Свет', mp: 4, power: 13, undead: true, icon: '☀', desc: 'Удвоенный урон нежити.' },
  { id: 'mana', name: 'Восстановление маны', mp: 0, gain: 6, icon: '💧', desc: 'Возвращает ману.' },
  { id: 'teleport', name: 'Прыжок', mp: 3, icon: '🌀', desc: 'Побег из боя без штрафа.' }
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

export const RECIPES = [
  { id: 'potion_hp', name: 'Зелье жизни', need: ['sage', 'root'], give: { id: 'potion_hp', count: 2 }, icon: '🧪' },
  { id: 'potion_mp', name: 'Зелье маны', need: ['mint', 'fern'], give: { id: 'potion_mp', count: 2 }, icon: '🧪' },
  { id: 'antidote', name: 'Противоядие', need: ['thistle', 'bloom'], give: { id: 'antidote', count: 2 }, icon: '🧪' },
  { id: 'stone_skin', name: 'Каменная кожа', need: ['moss', 'bark'], give: { id: 'stone_skin', count: 1 }, icon: '🧪' },
  { id: 'battle_draught', name: 'Боевой напиток', need: ['firepetal', 'berry'], give: { id: 'battle_draught', count: 1 }, icon: '🧪' },
  { id: 'crystal_tonic', name: 'Кристальный тоник', need: ['crystalgrass', 'mint'], give: { id: 'crystal_tonic', count: 1 }, icon: '🧪' },
  { id: 'frost_flask', name: 'Морозная колба', need: ['iceflower', 'fern'], give: { id: 'frost_flask', count: 1 }, icon: '🧪' },
  { id: 'greater_heal', name: 'Большое зелье', need: ['root', 'sage', 'bloom'], give: { id: 'greater_heal', count: 1 }, icon: '🧪' }
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
  { id: 'scroll_teleport', name: 'Свиток прыжка', spell: 'teleport', cost: 16, icon: '📜' }
];

const I = '../dungeon28/assets/sprites/items/';
const ARMOR_ICON = I + 'shield.png';
export const ARMORS = [
  { name: 'Тряпичная одежда', def: 0, cost: 0, set: 'any', sprite: ARMOR_ICON },
  { name: 'Кожаный жилет', def: 1, cost: 2, set: 'any', sprite: ARMOR_ICON },
  { name: 'Кожаный доспех', def: 2, cost: 4, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Кольчуга', def: 3, cost: 6, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Ламелляр', def: 4, cost: 8, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Стальной панцирь', def: 5, cost: 10, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Рыцарский облач', def: 6, cost: 12, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Тяжёлая броня', def: 7, cost: 14, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Мантия мага', def: 1, cost: 3, set: 'mage', sprite: ARMOR_ICON },
  { name: 'Украшенная роба', def: 2, cost: 6, set: 'mage', sprite: ARMOR_ICON },
  { name: 'Роба архимага', def: 3, cost: 10, set: 'mage', sprite: ARMOR_ICON },
  { name: 'Серебряная риза', def: 4, cost: 14, set: 'mage', sprite: ARMOR_ICON },
  { name: 'Куртка следопыта', def: 2, cost: 4, set: 'archer', sprite: ARMOR_ICON },
  { name: 'Плащ разбойника', def: 3, cost: 8, set: 'archer', sprite: ARMOR_ICON },
  { name: 'Лесной доспех', def: 4, cost: 12, set: 'archer', sprite: ARMOR_ICON },
  { name: 'Святые доспехи', def: 6, cost: 18, set: 'warrior', sprite: ARMOR_ICON },
  { name: 'Доспех круглого стола', def: 8, cost: 24, set: 'warrior', sprite: ARMOR_ICON }
];

export const CLASS_PENALTY = {
  warrior: { staff: -3, bow: -2 },
  mage: { hammer: -3, axe: -2, armor7: -2 },
  archer: { hammer: -3, mace: -2, staff: -1 },
  paladin: { bow: -2, dagger: -1 },
  angel: { axe: -2, hammer: -2 }
};

export const SHOP_TYPES = [
  { id: 'weapons', title: 'Оружейная', icon: '⚔', accent: '#f87171', desc: 'Оружие и перековка.' },
  { id: 'armor', title: 'Бронница', icon: '🛡', accent: '#60a5fa', desc: 'Броня и починка.' },
  { id: 'magic', title: 'Магазин магии', icon: '✨', accent: '#c084fc', desc: 'Свитки, заклинания, зелья.' },
  { id: 'jeweler', title: 'Ювелир', icon: '💎', accent: '#34d399', desc: 'Кристаллы и украшения.' },
  { id: 'market', title: 'Рынок', icon: '🛒', accent: '#fbbf24', desc: 'Травы, еда, разные товары.' }
];

export const BIOMES = {
  field: { name: 'Поле', ground: ['#3f6b3a', '#1f3a24'], road: '#a39064', roadDark: '#5d5238', tree: '#2f6b38', water: '#2b5d8a', rock: '#71717a', accent: '#86efac' },
  village: { name: 'Деревня', ground: ['#56704a', '#273426'], road: '#b09a6b', roadDark: '#63563a', tree: '#3f7d43', water: '#3b6e97', rock: '#8b7f6a', accent: '#fcd34d' },
  city: { name: 'Город', ground: ['#5b5b6b', '#2b2b3a'], road: '#9a9a9a', roadDark: '#54545e', tree: '#3c6b42', water: '#2f628c', rock: '#9ca3af', accent: '#fbbf24' },
  port: { name: 'Порт', ground: ['#3f6b74', '#1d3540'], road: '#a8a08a', roadDark: '#5c5a4f', tree: '#2f6b48', water: '#1d4ed8', rock: '#7c8a8f', accent: '#7dd3fc' },
  mountains: { name: 'Горы', ground: ['#5d5663', '#2a2733'], road: '#8f867a', roadDark: '#524b45', tree: '#3b5d43', water: '#315c80', rock: '#a1a1aa', accent: '#fca5a5' }
};

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
  { id: 'scroll', name: 'Свиток', icon: '📜', kind: 'scroll' }
];

export const BOSS_BONUSES = [
  { id: 'atk', name: '+Атака', value: 5, icon: '⚔' },
  { id: 'def', name: '+Защита', value: 4, icon: '🛡' },
  { id: 'magic', name: '+Магия', value: 6, icon: '✨' }
];

export const GAME_RECORDS = [
  { id: 'kill_skeleton_dungeon', text: 'Убит скелетом в подземелье' },
  { id: 'kill_turtle_sf', text: 'Убит черепахой в SF' },
  { id: 'kill_zombie_mm6', text: 'Убит зомби в MM6' },
  { id: 'kill_lich_mm6', text: 'Убит личем в MM6' },
  { id: 'boss_mm6', text: 'Победён босс в MM6' },
  { id: 'flee_mm6', text: 'Удачный побег в MM6' }
];
