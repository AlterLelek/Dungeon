// games/dungeon28/config.js
export const VERSION = "4.5";
export const GRID = 10;          
export const CELL = 32;          

export const HEROES = [
  {name:"Воин",   emoji:"🦸", set:"warrior", maxHp:100, maxMp:3,  lightRange:64},
  {name:"Маг",    emoji:"🧙", set:"mage",    maxHp:80,  maxMp:5,  lightRange:96},
  {name:"Паладин",emoji:"✝️", set:"warrior", maxHp:95,  maxMp:4,  lightRange:80},
  {name:"Ангел",  emoji:"👼", set:"mage",    maxHp:85,  maxMp:6,  lightRange:96},
  {name:"Черт",   emoji:"😈", set:"mage",    maxHp:70,  maxMp:7,  lightRange:96}
];

export const WARRIOR_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0},
  {name:"Кинжал · ржавый", css:"q-rusty", dmg:2, cost:1},
  {name:"Меч · ржавый", css:"q-rusty", dmg:3, cost:2},
  {name:"Топор · ржавый", css:"q-rusty", dmg:4, cost:3},
  {name:"Молот · ржавый", css:"q-rusty", dmg:5, cost:4},
  {name:"Кинжал · обычный", css:"q-normal", dmg:6, cost:5},
  {name:"Меч · обычный", css:"q-normal", dmg:7, cost:6},
  {name:"Топор · обычный", css:"q-normal", dmg:8, cost:7},
  {name:"Молот · обычный", css:"q-normal", dmg:9, cost:8},
  {name:"Кинжал · золотой", css:"q-gold", dmg:10, cost:9},
  {name:"Меч · золотой", css:"q-gold", dmg:11, cost:10},
  {name:"Топор · золотой", css:"q-gold", dmg:12, cost:11},
  {name:"Молот · золотой", css:"q-gold", dmg:13, cost:12},
  {name:"Кинжал · волшебный", css:"q-magic", dmg:14, cost:13},
  {name:"Меч · волшебный", css:"q-magic", dmg:15, cost:14},
  {name:"Топор · волшебный", css:"q-magic", dmg:16, cost:15},
  {name:"Молот · волшебный", css:"q-magic", dmg:17, cost:16}
];

export const MAGE_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0},
  {name:"Кольцо · ржавое", css:"q-rusty", dmg:2, cost:1},
  {name:"Палочка · ржавая", css:"q-rusty", dmg:3, cost:2},
  {name:"Амулет · ржавый", css:"q-rusty", dmg:4, cost:3},
  {name:"Книга · ржавая", css:"q-rusty", dmg:5, cost:4},
  {name:"Кольцо · обычное", css:"q-normal", dmg:6, cost:5},
  {name:"Палочка · обычная", css:"q-normal", dmg:7, cost:6},
  {name:"Амулет · обычный", css:"q-normal", dmg:8, cost:7},
  {name:"Книга · обычная", css:"q-normal", dmg:9, cost:8},
  {name:"Кольцо · золотое", css:"q-gold", dmg:10, cost:9},
  {name:"Палочка · золотая", css:"q-gold", dmg:11, cost:10},
  {name:"Амулет · золотой", css:"q-gold", dmg:12, cost:11},
  {name:"Книга · золотая", css:"q-gold", dmg:13, cost:12},
  {name:"Кольцо · волшебное", css:"q-magic", dmg:14, cost:13},
  {name:"Палочка · волшебная", css:"q-magic", dmg:15, cost:14},
  {name:"Амулет · волшебный", css:"q-magic", dmg:16, cost:15},
  {name:"Книга · волшебная", css:"q-magic", dmg:17, cost:16}
];

export const ENEMY_TYPES = ["💀","👻","🐭","🕷","👺","🧟","🏹","🐢","👼","🧙‍♂️"];

export const ENEMY_NAMES = {
  "💀": "Скелет", "👻": "Призрак", "🐭": "Мышь", "🕷": "Паук",
  "👺": "Огр", "🧟": "Зомби", "🏹": "Лучник", "🐢": "Черепаха",
  "👼": "Ангел", "🧙‍♂️": "Некромант"
};

export const ENEMY_BASE = {
  "💀": {hp:100, atk:5, def:0}, "👻": {hp:75, atk:4, def:0}, "🐭": {hp:50, atk:3, def:0},
  "🕷": {hp:60, atk:4, def:0}, "👺": {hp:130, atk:6, def:1}, "🧟": {hp:150, atk:6, def:1},
  "🏹": {hp:70, atk:8, def:1}, "🐢": {hp:200, atk:3, def:8},
  "👼": {hp:120, atk:7, def:3}, "🧙‍♂️": {hp:90, atk:5, def:2}
};

export const ITEM_TYPES = ['coin', 'star', 'shield', 'heart', 'scroll', 'lightning', 'stun', 'hurricane'];