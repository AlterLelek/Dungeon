// games/dungeon28/state.js

import { GRID, CELL, HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS } from './config.js';

// Состояние игрока
export const state = {
  goldCount: 0,
  playerHp: 100,
  tempAtk: 0,
  tempDef: 0,
  permanentShield: 0,
  energy: 0,
  weaponLevel: 0,
  totalTurns: 0,
  currentFloor: 1,
  highScore: 0,
  
  // Игровые объекты
  items: [],
  monsters: [],
  floaters: [], // всплывающие цифры урона
  
  // Позиции
  player: { x: 32, y: 160, px: 32, py: 160 },
  stairs: { x: 128, y: 128, active: false },
  
  // Настройки текущей сессии
  heroIdx: 0,
  gameMode: 'chase',
  gameActive: false,
  weapons: WARRIOR_WEAPONS,
  stats: { kills: 0, gold: 0, floors: 0 }
};

// Вспомогательные функции
export function getTotalAtk() {
  return state.weapons[state.weaponLevel].dmg + state.tempAtk;
}

export function getTotalDef() {
  return state.permanentShield + state.tempDef;
}

export function clearBonuses() {
  state.tempAtk = 0;
  state.tempDef = 0;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}