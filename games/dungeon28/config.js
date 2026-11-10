export const VERSION = "5.126";
export const GRID = 10;          
export const CELL = 32;          

export const HEROES = [
  {name:"Воин",   emoji:"⚔️", set:"warrior", maxHp:100, maxMp:3,  lightRange:64, attackRange:1, abilityName:"Берсерк"},
  {name:"Маг",    emoji:"🔮", set:"mage",    maxHp:80,  maxMp:5,  lightRange:96, attackRange:1, abilityName:"Чародейство"},
  {name:"Паладин",emoji:"✝️", set:"warrior", maxHp:95,  maxMp:4,  lightRange:80, attackRange:1, abilityName:"Призыв"},
  {name:"Ангел",  emoji:"👼", set:"mage",    maxHp:85,  maxMp:6,  lightRange:96, attackRange:1, abilityName:"Исцеление"},
  {name:"Лучник", emoji:"🏹", set:"archer",  maxHp:90,  maxMp:3,  lightRange:80, attackRange:2, abilityName:"Дальний выстрел"}
];

export const WARRIOR_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0}, {name:"Кинжал", css:"q-rusty", dmg:2, cost:1},
  {name:"Меч", css:"q-rusty", dmg:3, cost:2}, {name:"Топор", css:"q-rusty", dmg:4, cost:3},
  {name:"Молот", css:"q-rusty", dmg:5, cost:4}, {name:"Кинжал+", css:"q-normal", dmg:6, cost:5},
  {name:"Меч+", css:"q-normal", dmg:7, cost:6}, {name:"Топор+", css:"q-normal", dmg:8, cost:7},
  {name:"Молот+", css:"q-normal", dmg:9, cost:8}, {name:"Кинжал++", css:"q-gold", dmg:10, cost:9},
  {name:"Меч++", css:"q-gold", dmg:11, cost:10}, {name:"Топор++", css:"q-gold", dmg:12, cost:11},
  {name:"Молот++", css:"q-gold", dmg:13, cost:12}, {name:"Кинжал★", css:"q-magic", dmg:14, cost:13},
  {name:"Меч★", css:"q-magic", dmg:15, cost:14}, {name:"Топор★", css:"q-magic", dmg:16, cost:15},
  {name:"Молот★", css:"q-magic", dmg:17, cost:16}
];

export const MAGE_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0}, {name:"Кольцо", css:"q-rusty", dmg:2, cost:1},
  {name:"Палочка", css:"q-rusty", dmg:3, cost:2}, {name:"Амулет", css:"q-rusty", dmg:4, cost:3},
  {name:"Книга", css:"q-rusty", dmg:5, cost:4}, {name:"Кольцо+", css:"q-normal", dmg:6, cost:5},
  {name:"Палочка+", css:"q-normal", dmg:7, cost:6}, {name:"Амулет+", css:"q-normal", dmg:8, cost:7},
  {name:"Книга+", css:"q-normal", dmg:9, cost:8}, {name:"Кольцо++", css:"q-gold", dmg:10, cost:9},
  {name:"Палочка++", css:"q-gold", dmg:11, cost:10}, {name:"Амулет++", css:"q-gold", dmg:12, cost:11},
  {name:"Книга++", css:"q-gold", dmg:13, cost:12}, {name:"Кольцо★", css:"q-magic", dmg:14, cost:13},
  {name:"Палочка★", css:"q-magic", dmg:15, cost:14}, {name:"Амулет★", css:"q-magic", dmg:16, cost:15},
  {name:"Книга★", css:"q-magic", dmg:17, cost:16}
];

export const ARCHER_WEAPONS = [
  {name:"Кулаки", css:"q-normal", dmg:1, cost:0}, {name:"Лук", css:"q-rusty", dmg:2, cost:1},
  {name:"Арбалет", css:"q-rusty", dmg:3, cost:2}, {name:"Длинный лук", css:"q-rusty", dmg:4, cost:3},
  {name:"Тяж. арбалет", css:"q-rusty", dmg:5, cost:4}, {name:"Лук+", css:"q-normal", dmg:6, cost:5},
  {name:"Арбалет+", css:"q-normal", dmg:7, cost:6}, {name:"Длинный лук+", css:"q-normal", dmg:8, cost:7},
  {name:"Тяж. арбалет+", css:"q-normal", dmg:9, cost:8}, {name:"Лук++", css:"q-gold", dmg:10, cost:9},
  {name:"Арбалет++", css:"q-gold", dmg:11, cost:10}, {name:"Длинный лук++", css:"q-gold", dmg:12, cost:11},
  {name:"Тяж. арбалет++", css:"q-gold", dmg:13, cost:12}, {name:"Лук★", css:"q-magic", dmg:14, cost:13},
  {name:"Арбалет★", css:"q-magic", dmg:15, cost:14}, {name:"Длинный лук★", css:"q-magic", dmg:16, cost:15},
  {name:"Тяж. арбалет★", css:"q-magic", dmg:17, cost:16}
];

export const ENEMY_TYPES = ["💀","👻","🐭","🕷","👺","🧟","🐢","😈","🧙‍♂️","🦹"];

export const ENEMY_NAMES = {
  "💀": "Скелет", "👻": "Призрак", "🐭": "Мышь", "🕷": "Паук",
  "👺": "Огр", "🧟": "Зомби", "🐢": "Черепаха", "😈": "Черт", 
  "🧙‍♂️": "Некромант", "🦹": "Тёмный арбалетчик"
};

export const ENEMY_BASE = {
  "💀": {hp:100, atk:5, def:0, speed:1, interest1:"Герой", interest2:"Атака", special:"Вампиризм"},
  "👻": {hp:75, atk:4, def:0, speed:1, interest1:"Герой", interest2:"Мана", special:"Сжигание маны"},
  "🐭": {hp:50, atk:3, def:0, speed:2, interest1:"Жизнь", interest2:"Герой", special:"Деление 1/3"},
  "🕷": {hp:60, atk:4, def:0, speed:2, interest1:"Герой", interest2:"-", special:"Замедление"},
  "👺": {hp:130, atk:6, def:1, speed:1, interest1:"Герой", interest2:"Бонусы", special:"Съедание бонусов"},
  "🧟": {hp:150, atk:6, def:1, speed:1, interest1:"Герой", interest2:"-", special:"Яд"},
  "🐢": {hp:200, atk:3, def:8, speed:1, interest1:"Герой", interest2:"Защита", special:"Толстая защита"},
  "😈": {hp:85, atk:7, def:2, speed:1, interest1:"Герой", interest2:"-", special:"Регенерация"},
  "🧙‍♂️": {hp:90, atk:5, def:2, speed:1, interest1:"Трупы", interest2:"-", special:"Поднятие"},
  "🦹": {hp:85, atk:8, def:1, speed:1, interest1:"Герой", interest2:"-", special:"Стрельба 2 + Вампиризм"}
};

export const ITEM_TYPES = ['coin', 'star', 'shield', 'heart', 'mana', 'lightning', 'heal', 'stun', 'hurricane'];