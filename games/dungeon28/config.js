// games/dungeon28/config.js

export const GRID = 10;          
export const CELL = 32;          
export const MAX_ITEMS = 40;     

export const MODES = ['chase', 'clear', 'endless_chase', 'endless_clear'];
export const MODE_TITLES = ['🏃 Погоня', '⚔️ Зачистка', '🏃‍♂️ Безлим. Погоня', '⚔️ Безлим. Зачистка'];
export const MODE_DESCS = [
  'Монстры убегают. 5 этажей.',
  'Монстры охотятся. 5 этажей.',
  'Монстры убегают. Бесконечность.',
  'Монстры охотятся. Бесконечность.'
];

export const HEROES = [
  {name:"Воин",       emoji:"🦸",   set:"warrior", maxHp:100, melMod:0,  lightRange:64},
  {name:"Паладин",    emoji:"✝️",   set:"warrior", maxHp:95,  melMod:0,  lightRange:80},
  {name:"Маг",        emoji:"🧙",   set:"mage",    maxHp:80,  melMod:-1, lightRange:96},
  {name:"Черт",       emoji:"😈",   set:"mage",    maxHp:70,  melMod:-1, lightRange:96}
];

// УРОН ПОДНЯТ ДЛЯ БАЛАНСА (было 1, 2, 3... стало 10, 15, 20...)
export const WARRIOR_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:10, cost:0},
  {name:"Кинжал · ржавый", css:"q-rusty", dmg:15, cost:1},
  {name:"Меч · ржавый", css:"q-rusty", dmg:20, cost:2},
  {name:"Топор · ржавый", css:"q-rusty", dmg:25, cost:3},
  {name:"Молот · ржавый", css:"q-rusty", dmg:30, cost:4},
  {name:"Кинжал · обычный", css:"q-normal", dmg:40, cost:5},
  {name:"Меч · обычный", css:"q-normal", dmg:50, cost:6},
  {name:"Топор · обычный", css:"q-normal", dmg:60, cost:7},
  {name:"Молот · обычный", css:"q-normal", dmg:70, cost:8},
  {name:"Кинжал · золотой", css:"q-gold", dmg:80, cost:9},
  {name:"Меч · золотой", css:"q-gold", dmg:90, cost:10},
  {name:"Топор · золотой", css:"q-gold", dmg:100, cost:11},
  {name:"Молот · золотой", css:"q-gold", dmg:110, cost:12},
  {name:"Кинжал · волшебный", css:"q-magic", dmg:130, cost:13},
  {name:"Меч · волшебный", css:"q-magic", dmg:150, cost:14},
  {name:"Топор · волшебный", css:"q-magic", dmg:170, cost:15},
  {name:"Молот · волшебный", css:"q-magic", dmg:200, cost:16}
];

export const MAGE_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:8, cost:0},
  {name:"Кольцо · ржавое", css:"q-rusty", dmg:12, cost:1},
  {name:"Палочка · ржавая", css:"q-rusty", dmg:16, cost:2},
  {name:"Амулет · ржавый", css:"q-rusty", dmg:20, cost:3},
  {name:"Книга · ржавая", css:"q-rusty", dmg:24, cost:4},
  {name:"Кольцо · обычное", css:"q-normal", dmg:35, cost:5},
  {name:"Палочка · обычная", css:"q-normal", dmg:45, cost:6},
  {name:"Амулет · обычный", css:"q-normal", dmg:55, cost:7},
  {name:"Книга · обычная", css:"q-normal", dmg:65, cost:8},
  {name:"Кольцо · золотое", css:"q-gold", dmg:75, cost:9},
  {name:"Палочка · золотая", css:"q-gold", dmg:85, cost:10},
  {name:"Амулет · золотой", css:"q-gold", dmg:95, cost:11},
  {name:"Книга · золотая", css:"q-gold", dmg:105, cost:12},
  {name:"Кольцо · волшебное", css:"q-magic", dmg:120, cost:13},
  {name:"Палочка · волшебная", css:"q-magic", dmg:140, cost:14},
  {name:"Амулет · волшебный", css:"q-magic", dmg:160, cost:15},
  {name:"Книга · волшебная", css:"q-magic", dmg:180, cost:16}
];

export const ENEMY_TYPES = ["💀","👻","🐭","🕷","👺","🧟","🏹","🐢","👼","🧙‍♂️"];
export const ENEMY_BASE = {
  "💀": {hp:100, atk:5}, "👻": {hp:75, atk:4}, "🐭": {hp:50, atk:3},
  "🕷": {hp:60, atk:4}, "👺": {hp:130, atk:6}, "🧟": {hp:150, atk:6, def:1},
  "🏹": {hp:70, atk:8, def:1}, "🐢": {hp:200, atk:3, def:8},
  "👼": {hp:120, atk:7, def:3}, "🧙‍♂️": {hp:90, atk:5, def:2}
};

export const ITEM_TYPES = ['coin', 'star', 'shield', 'heart', 'scroll', 'lightning', 'stun'];