// games/dungeon28/config.js

export const GRID = 10;          // Размер сетки 10x10
export const CELL = 32;          // Размер одной клетки в пикселях
export const MAX_ITEMS = 40;     // Максимум предметов на карте

// Режимы игры
export const MODES = ['chase', 'clear', 'endless_chase', 'endless_clear'];
export const MODE_TITLES = ['🏃 Погоня', '⚔️ Зачистка', '🏃‍♂️ Безлим. Погоня', '⚔️ Безлим. Зачистка'];
export const MODE_DESCS = [
  'Монстры убегают. 5 этажей.',
  'Монстры охотятся. 5 этажей.',
  'Монстры убегают. Бесконечность.',
  'Монстры охотятся. Бесконечность.'
];

// Герои (пока только Воин, потом добавим остальных)
export const HEROES = [
  {name:"Воин",       emoji:"🦸",   set:"warrior", maxHp:100, melMod:0,  lightRange:64},
  {name:"Паладин",    emoji:"✝️",   set:"warrior", maxHp:95,  melMod:0,  lightRange:80},
  {name:"Маг",        emoji:"🧙",   set:"mage",    maxHp:80,  melMod:-1, lightRange:96},
  {name:"Черт",       emoji:"😈",   set:"mage",    maxHp:70,  melMod:-1, lightRange:96}
];

// Оружие для Воина и Паладина
export const WARRIOR_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0},
  {name:"Кинжал · ржавый", css:"q-rusty", dmg:2, cost:1},
  {name:"Меч · ржавый", css:"q-rusty", dmg:3, cost:2},
  {name:"Топор · ржавый", css:"q-rusty", dmg:4, cost:3},
  {name:"Молот · ржавый", css:"q-rusty", dmg:5, cost:4}
];

// Оружие для Мага и Черта
export const MAGE_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0},
  {name:"Кольцо · ржавое", css:"q-rusty", dmg:2, cost:1},
  {name:"Палочка · ржавая", css:"q-rusty", dmg:3, cost:2},
  {name:"Амулет · ржавый", css:"q-rusty", dmg:4, cost:3},
  {name:"Книга · ржавая", css:"q-rusty", dmg:5, cost:4}
];

// Монстры
export const ENEMY_TYPES = ["💀","👻","🐭","🕷","👺","🧟","🏹","🐢","👼","🧙‍♂️"];
export const ENEMY_BASE = {
  "💀": {hp:100, atk:5}, "👻": {hp:75, atk:4}, "🐭": {hp:50, atk:3},
  "🕷": {hp:60, atk:4}, "👺": {hp:130, atk:6}, "🧟": {hp:150, atk:6, def:1},
  "🏹": {hp:70, atk:8, def:1}, "🐢": {hp:200, atk:3, def:8},
  "👼": {hp:120, atk:7, def:3}, "🧙‍♂️": {hp:90, atk:5, def:2}
};

// Предметы
export const ITEM_TYPES = ['coin', 'star', 'shield', 'heart', 'scroll', 'lightning', 'stun'];