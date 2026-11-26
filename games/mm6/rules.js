/* MM6 rules: чистые функции и таблицы без DOM.
   Формула урона из docs/COMBAT_SPEC.md здесь не дублируется: правила прогрессии
   не меняют max(0, attack - defense) и не трогают текст журнала боя. */

export const SAVE_VERSION = 2;
export const BASE_XP = 50;
export const SKILL_CAP_PER_LEVEL = 2;
export const ACTIVE_ENEMY_LIMIT = 12;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/* Уровень N стоит (N-1)*BASE_XP; суммарно до N: N*(N-1)/2*BASE_XP. */
export function xpLevelCost(level, baseXP = BASE_XP) {
  return Math.max(0, Math.floor(finite(level, 1)) - 1) * Math.max(0, finite(baseXP, BASE_XP));
}
export function xpTotalToLevel(level, baseXP = BASE_XP) {
  const n = Math.max(1, Math.floor(finite(level, 1)));
  return Math.floor((n * (n - 1)) / 2 * Math.max(0, finite(baseXP, BASE_XP)));
}
/* Затухание SF: base * max(0.1, 1 - 0.1*k), k = разница уровней героя и врага.
   Враг на 9+ уровней ниже даёт ровно 10%; квестовый опыт мимо этой функции. */
export function xpKill(enemy, heroLevel = 1) {
  const profile = resolveProfile(enemy);
  const base = Math.max(1, Math.floor(finite(profile.baseXp, 25)));
  const enemyLevel = Math.max(1, Math.floor(finite(enemy && (enemy.level ?? profile.level), profile.level)));
  const k = Math.floor(finite(heroLevel, 1)) - enemyLevel;
  return Math.max(1, Math.round(base * Math.max(0.1, 1 - 0.1 * k)));
}

/* Угроза растёт на +floor((level-1)/3) поверх базы типа. */
export function threatOf(level, threatBase = 1) {
  const lv = Math.max(1, Math.floor(finite(level, 1)));
  return Math.max(1, Math.floor(finite(threatBase, 1))) + Math.floor((lv - 1) / 3);
}

/* Новый бюджет боя: старый clamp(sumLevels*2.5,6,40) не выдерживает стай 4-8.
   sum(levels)*2 + heroes*6 + elites*4, ограничено 16..80; активных не больше 12. */
export function battleBudget(options = {}) {
  const levels = Array.isArray(options.levels) ? options.levels : [];
  const sum = levels.reduce((a, v) => a + Math.max(1, finite(v, 1)), 0);
  const heroes = Math.max(1, finite(options.heroes, 3));
  const elites = Math.max(0, finite(options.elites, 0));
  return clamp(Math.round(sum * 2 + heroes * 6 + elites * 4), 16, 80);
}

export function trainerCost(options = {}) {
  if (options.kind === 'guild') return Math.max(50, 100 * Math.max(1, finite(options.rank, 1)));
  if (options.kind === 'skill') return Math.max(10, 10 + 15 * (Math.max(1, finite(options.rank, 1)) - 1));
  return Math.max(20, 20 * Math.max(2, finite(options.level, 2)));
}
export const skillCost = (skillId, rank) => trainerCost({ kind: 'skill', skillId, rank });

/* Типы монстров: уровень — «боевой ранг», threatBase — базовая угроза.
   Мышь = солдат 1-го уровня, но даёт 25 XP, а не 10: она не «донор». */
export const MONSTER_PROFILES = {
  mouse:    { level: 1,  threatBase: 1, baseXp: 25,  humanoid: false, undead: false, devil: false },
  wolf:     { level: 2,  threatBase: 1, baseXp: 30,  humanoid: false, undead: false, devil: false },
  spider:   { level: 2,  threatBase: 1, baseXp: 30,  humanoid: false, undead: false, devil: false },
  skeleton: { level: 3,  threatBase: 2, baseXp: 40,  humanoid: true,  undead: true,  devil: false },
  goblin:   { level: 3,  threatBase: 2, baseXp: 40,  humanoid: true,  undead: false, devil: false },
  ghost:    { level: 4,  threatBase: 2, baseXp: 45,  humanoid: false, undead: true,  devil: false },
  zombie:   { level: 4,  threatBase: 2, baseXp: 45,  humanoid: true,  undead: true,  devil: false },
  turtle:   { level: 5,  threatBase: 3, baseXp: 55,  humanoid: false, undead: false, devil: false },
  orc:      { level: 5,  threatBase: 3, baseXp: 55,  humanoid: true,  undead: false, devil: false },
  orge:     { level: 7,  threatBase: 4, baseXp: 80,  humanoid: true,  undead: false, devil: false },
  mummy:    { level: 7,  threatBase: 4, baseXp: 80,  humanoid: true,  undead: true,  devil: false },
  devil:    { level: 6,  threatBase: 4, baseXp: 70,  humanoid: true,  undead: false, devil: true  },
  necro:    { level: 6,  threatBase: 4, baseXp: 70,  humanoid: true,  undead: true,  devil: false },
  archer:   { level: 6,  threatBase: 4, baseXp: 70,  humanoid: true,  undead: false, devil: false },
  troll:    { level: 8,  threatBase: 5, baseXp: 95,  humanoid: true,  undead: false, devil: false },
  vampire:  { level: 8,  threatBase: 5, baseXp: 95,  humanoid: true,  undead: true,  devil: false },
  siren:    { level: 8,  threatBase: 5, baseXp: 95,  humanoid: false, undead: false, devil: false },
  golem:    { level: 9,  threatBase: 6, baseXp: 110, humanoid: false, undead: false, devil: false },
  wyvern:   { level: 10, threatBase: 6, baseXp: 130, humanoid: false, undead: false, devil: false },
  lich:     { level: 11, threatBase: 7, baseXp: 150, humanoid: true,  undead: true,  devil: false }
};
export function resolveProfile(enemy) {
  const id = enemy && (enemy.def ? enemy.def.id : enemy.id) || (typeof enemy === 'string' ? enemy : '');
  return MONSTER_PROFILES[id] || { level: 1, threatBase: 1, baseXp: 25, humanoid: false, undead: false, devil: false };
}

/* Навыки растут только от реального эффекта; очков на распределение нет. */
export const SKILL_DEFS = [
  { id: 'blades',   name: 'Клинки',      building: 'tavern',  guild: 'novice' },
  { id: 'axes',     name: 'Топоры',      building: 'tavern',  guild: 'novice' },
  { id: 'bows',     name: 'Луки',        building: 'tavern',  guild: 'novice' },
  { id: 'throwing', name: 'Метание',     building: 'tavern',  guild: 'novice' },
  { id: 'defense',  name: 'Защита',      building: 'tavern',  guild: 'novice' },
  { id: 'magic',    name: 'Магия',       building: 'magic',   guild: 'novice' },
  { id: 'spells',   name: 'Заклинания',  building: 'magic',   guild: 'leading' },
  { id: 'craft',    name: 'Ремесло',     building: 'weapons', guild: 'novice' }
];
export const GUILD_RANKS = ['novice', 'leading', 'expert'];
export const SKILL_COOLDOWN_TURNS = 2;
export const SKILL_POINTS_PER_RANK = 10;

/* Лут: частый 40-70%, средний/редкий — по таблице. Редкие вещи приходят
   из гнёзд и кладов, а не из бесконечного гринда. */
export const LOOT_TABLES = {
  mouse:        { common: { chance: 0.55, gold: [1, 3] }, medium: { chance: 0.05, items: ['crystalgrass', 'scroll_1'] }, rare: { chance: 0.05, items: ['ring_1'], floor: true } },
  mouse_wizard: { common: { chance: 0.6,  gold: [2, 5] }, medium: { chance: 0.15, items: ['potion_mp', 'scroll_1'] }, rare: null },
  mouse_king:   { common: { chance: 0.65, gold: [10, 25] }, medium: { chance: 0.25, items: ['food', 'potion_hp', 'potion_mp'] }, rare: { chance: 0.25, firstKillChance: 1, items: ['ring_1', 'crown'], floor: true } },
  spider:       { common: { chance: 0.55, items: ['poison_gland', 'silk'] }, medium: { chance: 0.4, gold: [2, 6] }, rare: { chance: 0.1, items: ['scroll_poison'] } },
  skeleton:     { common: { chance: 0.5,  items: ['bone'], gold: [3, 8] }, medium: { chance: 0.15, items: ['shield'] }, rare: { chance: 0.12, items: ['helmet'], else: 'bone_dust' } },
  goblin:       { common: { chance: 0.6,  items: ['food'], gold: [3, 10] }, medium: { chance: 0.15, items: ['club_axe'] }, rare: { chance: 0.25, items: ['ore'] } },
  devil:        { common: { chance: 0.5,  gold: [10, 30] }, medium: { chance: 0.15, items: ['scroll_dark'] }, rare: { chance: 0.25, items: ['ring_3'], extra: { chance: 0.15, items: ['amulet'] } } }
};
export function lootTableFor(enemy) {
  const id = enemy && (enemy.def ? enemy.def.id : enemy.id) || (typeof enemy === 'string' ? enemy : '');
  const variant = enemy && enemy.variantId;
  if (id === 'mouse' && variant === 'wizard') return LOOT_TABLES.mouse_wizard;
  if (id === 'mouse' && variant === 'king') return LOOT_TABLES.mouse_king;
  return LOOT_TABLES[id] || null;
}
/* Броски детерминированы через rng — CDP-проверки подставляют фиксированное значение. */
export function rollLoot(enemy, options = {}) {
  const table = lootTableFor(enemy);
  if (!table) return [];
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const out = [];
  const goldRoll = (band, key) => {
    const [lo, hi] = band;
    out.push({ kind: 'gold', amount: Math.floor(lo + rng() * (hi - lo + 1)), key });
  };
  const itemRoll = (entry, key) => {
    const list = entry.items || [];
    if (!list.length) return;
    out.push({ kind: 'item', id: list[Math.floor(rng() * list.length) % list.length], floor: !!entry.floor, key });
  };
  if (table.common && rng() < table.common.chance) {
    if (table.common.gold) goldRoll(table.common.gold, 'common');
    if (table.common.items) itemRoll(table.common, 'common');
  }
  if (table.medium && rng() < table.medium.chance) {
    if (table.medium.gold) goldRoll(table.medium.gold, 'medium');
    if (table.medium.items) itemRoll(table.medium, 'medium');
  }
  if (table.rare) {
    const chance = options.firstKingKill && table.rare.firstKillChance ? table.rare.firstKillChance : table.rare.chance;
    if (rng() < chance) itemRoll(table.rare, 'rare');
    else if (table.rare.else) out.push({ kind: 'item', id: table.rare.else, floor: false, key: 'else' });
    if (table.rare.extra && rng() < table.rare.extra.chance) itemRoll(table.rare.extra, 'rare_extra');
  }
  return out;
}

/* Шесть стихий гранат. FF тёмной — ровно 50% и только по союзникам рядом. */
export const GRENADES = {
  smoke: { id: 'smoke', name: 'Дымовая',   damage: 25, effect: 'agro_break' },
  frost: { id: 'frost', name: 'Морозная',  damage: 45, effect: 'skip_turn' },
  acid:  { id: 'acid',  name: 'Кислотная', damage: 55, effect: 'ignore_armor_dot', dotTurns: 3, dotDamage: 5 },
  lava:  { id: 'lava',  name: 'Лавовая',   damage: 60, effect: 'aoe_floor_burn', burnTurns: 3 },
  dark:  { id: 'dark',  name: 'Тёмная',    damage: 70, effect: 'friendly_fire' },
  holy:  { id: 'holy',  name: 'Святая',    damage: 120, effect: 'holy', undeadMultiplier: 2.5 }
};
export const GRENADE_FF_RATIO = 0.5;
export const FRIENDLY_FIRE_RATIO = GRENADE_FF_RATIO;
export const CHURCH_TITHE_RATE = 0.1;
export const CHURCH_TITHE_MIN = 10;
export function churchCost(partyGold) {
  return Math.max(CHURCH_TITHE_MIN, Math.floor(Math.max(0, finite(partyGold, 0)) * CHURCH_TITHE_RATE));
}

/* Шаблоны логовищ — данные, а не случайная генерация. Новые типы только по согласованию. */
export const LAIR_TEMPLATES = {
  mouse_nest: {
    id: 'mouse_nest', name: 'Гнездо мышей',
    enemies: [{ id: 'mouse', count: [3, 5] }, { id: 'mouse', variant: 'wizard', count: [1, 2] }, { id: 'mouse', variant: 'king', count: 1 }],
    chests: [{ items: ['ring_1', 'gold'], gold: [8, 20] }, { items: ['gold', 'scroll_1'], gold: [5, 14] }]
  },
  spider_lair: {
    id: 'spider_lair', name: 'Логово пауков',
    enemies: [{ id: 'spider', count: [4, 6] }, { id: 'spider', elite: true, count: [1, 2] }],
    chests: [{ items: ['silk', 'gold'], gold: [4, 12] }, { items: ['silk', 'potion_hp'], gold: [2, 8] }]
  },
  bone_yard: {
    id: 'bone_yard', name: 'Костница',
    enemies: [{ id: 'skeleton', count: [4, 6] }, { id: 'skeleton', elite: true, leader: true, count: 1 }],
    chests: [{ items: ['bone', 'gold'], gold: [6, 16] }]
  }
};

export const ASSET_STRUCTURE_PROPOSAL = {
  principle: 'один файл — один путь; варианты одного типа группируются по подпапкам',
  groups: {
    'assets/sprites/mouse/': ['soldier', 'wizard', 'king', 'archer'],
    'assets/sprites/spider/': ['soldier', 'elite'],
    'assets/sprites/skeleton/': ['soldier', 'leader'],
    'assets/sprites/grenades/': ['smoke', 'frost', 'acid', 'lava', 'dark', 'holy']
  },
  note: 'перекраска вариантов делается runtime-палитрой, новые PNG/SVG не создаются'
};

/* --- Миграция сейва -------------------------------------------------- */
export function defaultLootCounters() {
  return { mouse: 0, mouse_wizard: 0, mouse_king: 0, spider: 0, skeleton: 0, goblin: 0, devil: 0, king_nest_first: 0, chests: 0 };
}
export function defaultHeroProgression() {
  return {
    level: 1,
    skillXp: {},
    skills: {},
    skillCooldown: {},
    promotion: { guild: 'novice' }
  };
}
export function migrateSave(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = Object.assign({}, src);
  out.version = SAVE_VERSION;
  out.clockMinutes = clamp(Math.floor(finite(src.clockMinutes, 8 * 60)), 0, 24 * 60);
  out.hunger = clamp(Math.floor(finite(src.hunger, 0)), 0, 100);
  out.lootCounters = Object.assign(defaultLootCounters(), src.lootCounters && typeof src.lootCounters === 'object' ? src.lootCounters : {});
  out.floorLoot = Array.isArray(src.floorLoot) ? src.floorLoot.slice() : [];
  out.pendingXp = Math.max(0, finite(src.pendingXp, 0));
  out.pendingLoot = Array.isArray(src.pendingLoot) ? src.pendingLoot.slice() : [];
  out.battleLimit = clamp(Math.floor(finite(src.battleLimit, ACTIVE_ENEMY_LIMIT)), 6, ACTIVE_ENEMY_LIMIT);
  out.party = Array.isArray(src.party) ? src.party.map(h => {
    const hero = Object.assign({}, h);
    const defaults = defaultHeroProgression();
    hero.level = clamp(Math.floor(finite(hero.level, defaults.level)), 1, 100);
    hero.skillXp = Object.assign({}, hero.skillXp && typeof hero.skillXp === 'object' ? hero.skillXp : {});
    hero.skills = Object.assign({}, hero.skills && typeof hero.skills === 'object' ? hero.skills : {});
    hero.skillCooldown = Object.assign({}, hero.skillCooldown && typeof hero.skillCooldown === 'object' ? hero.skillCooldown : {});
    hero.promotion = Object.assign({}, defaults.promotion, hero.promotion && typeof hero.promotion === 'object' ? hero.promotion : {});
    if (!GUILD_RANKS.includes(hero.promotion.guild)) hero.promotion.guild = 'novice';
    hero.exp = Math.max(0, finite(hero.exp, 0));
    return hero;
  }) : [];
  return out;
}

export const RULES_SUMMARY = {
  saveVersion: SAVE_VERSION,
  baseXP: BASE_XP,
  experience: 'level N = (N-1)*baseXP; total = N*(N-1)/2*baseXP',
  diminishing: 'base * max(0.1, 1 - 0.1*k), k = heroLevel - enemyLevel',
  battleBudget: 'clamp(sum(levels)*2 + heroes*6 + elites*4, 16, 80); active <= 12',
  tithe: `max(${CHURCH_TITHE_MIN}, floor(gold*${CHURCH_TITHE_RATE}))`,
  friendlyFire: FRIENDLY_FIRE_RATIO
};
