// games/dungeon28/state.js
import { GRID, CELL, HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS } from './config.js';

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
  
  items: [],
  monsters: [],
  floaters: [],
  
  player: { 
      x: 32, y: 160, 
      px: 32, py: 160, 
      startPx: 32, startPy: 160, 
      isMoving: false, moveStartTime: 0 
  },
  stairs: { x: 288, y: 288, active: false },
  
  heroIdx: 0,
  gameMode: 'chase',
  gameActive: false,
  weapons: WARRIOR_WEAPONS,
  stats: { kills: 0, gold: 0, floors: 0 },

  settings: {
      difficulty: 'simple',
      monsterAdd: 0,
      itemRate: 3,
      taste: 'hero'
  }
};

export function getTotalAtk() {
  return state.weapons[state.weaponLevel].dmg + state.tempAtk;
}

export function getTotalDef() {
  return state.permanentShield + state.tempDef;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// РАБОЧИЙ СБРОС БОНУСОВ
export function clearBonuses() {
    state.tempAtk = 0;
    state.tempDef = 0;
    state.energy = 0;
}