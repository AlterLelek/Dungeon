import { Warrior } from './warrior.js';
import { Mage } from './mage.js';
import { Paladin } from './paladin.js';
import { Angel } from './angel.js';
import { Archer } from './archer.js';

// Пять классических героев и пять героев расширения — общий список для всех игр.
const Druid = {
  ...Mage, name: 'Друид', emoji: '🌲', set: 'mage',
  maxHp: 88, maxMp: 7, lightRange: 96, attackRange: 1, abilityName: 'Буря',
  skins: Mage.skins
};
const Rogue = {
  ...Archer, name: 'Разбойник', emoji: '🏹', set: 'archer',
  maxHp: 84, maxMp: 3, lightRange: 80, attackRange: 2, abilityName: 'Находка',
  skins: Archer.skins
};
const Amazon = {
  ...Archer, name: 'Амазонка', emoji: '🎯', set: 'archer',
  maxHp: 86, maxMp: 4, lightRange: 80, attackRange: 2, abilityName: 'Пробитие',
  skins: Archer.skins
};
const Dwarf = {
  ...Warrior, name: 'Гном-кулига', emoji: '⛏️', set: 'warrior',
  maxHp: 110, maxMp: 2, lightRange: 64, attackRange: 1, abilityName: 'Стойкость',
  skins: Warrior.skins
};
const DwarfMage = {
  ...Mage, name: 'Гном-колдун', emoji: '💎', set: 'mage',
  maxHp: 96, maxMp: 8, lightRange: 96, attackRange: 1, abilityName: 'Кристалл',
  skins: Mage.skins
};

export const HEROES = [
  Warrior, Mage, Paladin, Angel, Archer,
  Druid, Rogue, Amazon, Dwarf, DwarfMage
];
