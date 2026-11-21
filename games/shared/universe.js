// Единый справочник героев и монстров для всех четырёх игр.
// Stats, sprites and names come from the canonical Dungeon 28 config.
import {
  HEROES,
  WARRIOR_WEAPONS,
  MAGE_WEAPONS,
  ARCHER_WEAPONS,
  ENEMY_TYPES,
  ENEMY_NAMES,
  ENEMY_BASE,
  MONSTER_SKINS
} from '../dungeon28/config.js';

const D28_BASE = new URL('../dungeon28/', import.meta.url);
const asset = path => new URL(path, D28_BASE).href;

const HERO_KEYS = ['warrior', 'mage', 'paladin', 'angel', 'archer', 'druid', 'rogue', 'amazon', 'dwarf', 'dwarfmage'];
const MONSTER_KEYS = [
  'skeleton', 'ghost', 'mouse', 'spider', 'orge', 'zombie', 'turtle', 'devil', 'necro', 'archer',
  'wolf', 'goblin', 'orc', 'troll', 'golem', 'vampire', 'mummy', 'siren', 'wyvern', 'lich'
];

const HERO_INFO = {
  'Воин': {
    desc: 'Крепкий боец из Подземелья 28. Держит строй и бьёт наверняка.',
    pros: ['Много HP', '17 видов оружия', 'Умение «Берсерк» усиливает удар'],
    cons: ['⚠ Воин плохо владеет посохом.']
  },
  'Маг': {
    desc: 'Хрупкий, но дальнобойный. Заряд маны бьёт сильнее, чародейство дешевле.',
    pros: ['Больше всего магии после гнома-колдуна', 'Молния бьёт далеко'],
    cons: ['Мало HP', 'Не носит тяжёлую броню']
  },
  'Паладин': {
    desc: 'Надёжный страж. Молитва лечит и снимает яд, свет пробивает нежить.',
    pros: ['Хороший баланс HP и маны', 'Лечение и снятие яда'],
    cons: ['Слабее воина в лобовом бою', 'Плохо владеет луком']
  },
  'Ангел': {
    desc: 'Небесный союзник. Свет пробивает нежить, исцеление держит отряд в строю.',
    pros: ['Сильный свет', 'Много маны'],
    cons: ['Не любит топоры и молоты', 'Дорогие заклинания']
  },
  'Лучник': {
    desc: 'Следопыт из тени. Стреляет ровно через клетку и бьёт первое существо на пути.',
    pros: ['Дальний выстрел', '+50% урона от умения'],
    cons: ['Вплотную стрелой не бьёт', 'Слабый молот']
  },
  'Друид': {
    desc: 'Лесной маг. Лечит травой и вызывает бурю, экономя ману на заклинаниях.',
    pros: ['Лечение и буря', '7 MP'],
    cons: ['Не носит тяжёлую броню', 'Низкий урон в ближнем бою']
  },
  'Разбойник': {
    desc: 'Быстрый удар и находка монет. Отлично начинает каждое приключение.',
    pros: ['Находит монеты', 'Дальний выстрел'],
    cons: ['Мало HP', 'Слабый удар без лука']
  },
  'Амазонка': {
    desc: 'Меткий выстрел пробивает броню даже тяжёлых монстров.',
    pros: ['Пробитие брони', 'Дальний выстрел'],
    cons: ['Слабая защита', 'Зависит от лука']
  },
  'Гном-кулига': {
    desc: 'Живуч, но медлителен. Держит удар лучше всех, но не умеет колдовать.',
    pros: ['Максимум HP — 110', 'Выносливость'],
    cons: ['⚠ Не владеет магией: нужен Гном-колдун.', 'Плохо владеет посохом']
  },
  'Гном-колдун': {
    desc: 'Единственный гном, владеющий магией. Кристаллы усиливают его чары.',
    pros: ['Максимум маны — 8', 'Кристаллы усиливают чары'],
    cons: ['Не любит тяжёлое оружие', 'Средний запас HP']
  }
};

const MONSTER_INFO = {
  skeleton: { pros: ['Вампиризм — восстанавливает HP'], cons: ['Нет защиты от магии'] },
  ghost: { pros: ['Сжигает ману'], cons: ['Малый запас HP'] },
  mouse: { pros: ['Делится на двух после смерти'], cons: ['Очень слабая в бою'] },
  spider: { pros: ['Замедляет героя', 'Два действия за ход'], cons: ['Нет брони'] },
  orge: { pros: ['Съедает бонусы героя'], cons: ['Медленный'] },
  zombie: { pros: ['Атака ядом'], cons: ['Медленный, предсказуемый'] },
  turtle: { pros: ['Толстая броня 8', 'Много HP'], cons: ['Слабая атака'] },
  devil: { pros: ['Регенерация'], cons: ['Малый запас HP'] },
  necro: { pros: ['Поднимает зомби из трупов'], cons: ['Зависит от трупов'] },
  archer: { pros: ['Стрельба на 2 клетки + вампиризм'], cons: ['Нет брони'] },
  wolf: { pros: ['Быстрая атака'], cons: ['Низкая защита'] },
  goblin: { pros: ['Находит монеты', 'Быстрый'], cons: ['Мало HP'] },
  orc: { pros: ['Тяжёлый топор', 'Хороший баланс'], cons: ['Медленный'] },
  troll: { pros: ['Долгое восстановление', 'Сильный удар'], cons: ['Очень медленный'] },
  golem: { pros: ['Каменная броня 7', '240 HP'], cons: ['Тихоходный'] },
  vampire: { pros: ['Вампиризм и магия'], cons: ['Боится света и сильного удара'] },
  mummy: { pros: ['Яд', 'Хорошая броня'], cons: ['Медленная'] },
  siren: { pros: ['Магическая песнь','Быстрая'], cons: ['Низкая защита'] },
  wyvern: { pros: ['Огненный выдох + магия', 'Сильнейший удар'], cons: ['Уязвима к заклинаниям'] },
  lich: { pros: ['Мощная магия', 'Больше всего урона'], cons: ['Медленный'] }
};

const WEAPON_SETS = { warrior: WARRIOR_WEAPONS, mage: MAGE_WEAPONS, archer: ARCHER_WEAPONS };

export const HERO_DOSSIERS = HEROES.map((h, i) => {
  const key = HERO_KEYS[i] || h.set;
  const info = HERO_INFO[h.name] || { desc: '', pros: [], cons: [] };
  const weapons = WEAPON_SETS[h.set] || WEAPON_SETS.warrior;
  return {
    key,
    name: h.name,
    emoji: h.emoji,
    set: h.set,
    hp: h.maxHp,
    mp: h.maxMp,
    weapons: weapons.length,
    sprite: asset(h.name === 'Ангел' ? 'assets/sprites/heroes/battle_angel_0.png' : h.skins[0]),
    desc: info.desc,
    pros: info.pros,
    cons: info.cons,
    line: `HP ${h.maxHp} · MP ${h.maxMp} · ${weapons.length} видов оружия`
  };
});

export const MONSTER_DOSSIERS = ENEMY_TYPES.map((emoji, i) => {
  const key = MONSTER_KEYS[i] || emoji;
  const base = ENEMY_BASE[emoji] || {};
  const info = MONSTER_INFO[key] || { pros: [], cons: [] };
  return {
    key,
    name: ENEMY_NAMES[emoji] || emoji,
    emoji,
    hp: base.hp || 0,
    atk: base.atk || 0,
    def: base.def || 0,
    speed: base.speed || 1,
    special: base.special || '-',
    sprite: asset(MONSTER_SKINS[emoji] ? MONSTER_SKINS[emoji][0] : 'assets/sprites/monsters/skeleton_0.png'),
    pros: info.pros,
    cons: info.cons,
    line: `HP ${base.hp} · ATK ${base.atk} · DEF ${base.def} · SPD ${base.speed}`
  };
});

export const RULES = {
  d28: [
    'Каждый шаг — ход. Встаньте на клетку монстра, чтобы начать бой 1 на 1.',
    'Собирайте самоцветы, монеты и звёзды; лавка доступна кнопкой M в бою и на карте.',
    'Магия тратит ману; если маны не хватает, расходуется заряд заклинания.',
    'Режим «Безлимит» продолжает этажи после пятого, остальные заканчиваются победой.'
  ],
  lab: [
    'Соберите все самоцветы на этаже и найдите лестницу.',
    'Стены и туман можно включить в меню; режимы меняют цель и сложность.',
    'Заклинания стоят маны, монстры охотятся за вами, трупами или самоцветами.',
    'Рекорды и достижения общие для всех четырёх игр.'
  ],
  sf: [
    'Один герой против одного монстра. Победа приносит очки и монеты.',
    'Пять этажей, лавка и настройки доступны во время игры.',
    'Стрелки/WASD — движение, Space/P — пропуск, F — магия, M — лавка.',
    'Рекорды и достижения общие для всех четырёх игр.'
  ],
  mm6: [
    'Отряд из трёх героев исследует карту и сражается пошагово.',
    'Победите 10 боссов, чтобы замкнуть Круг славы и получить достижение.',
    'Временные эффекты (щит, благословение, яд) исчезают через несколько ходов.',
    'Лавка, инвентарь и ремесло открываются кнопками внизу во время игры.'
  ]
};

export const UNIVERSE = { heroes: HERO_DOSSIERS, monsters: MONSTER_DOSSIERS, rules: RULES };
