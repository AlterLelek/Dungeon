import { HEROES, ENEMY_BASE, WARRIOR_WEAPONS } from './config.js';

export const state = {
  goldCount: 0,
  playerHp: 100,
  playerMp: 0,
  maxMp: 0,
  
  tempAtk: 0,
  tempDef: 0,
  permanentShield: 0,
  weaponLevel: 0,
  totalTurns: 0,
  currentFloor: 1,
  
  highScore: { turns: 0, name: "Никто" },
  
  items: [],
  monsters: [],
  corpses: [], 
  floaters: [],
  
  spellLightning: 0,
  spellHeal: 0,
  spellStun: 0,
  spellHurricane: 0,

  // НОВЫЕ ЭФФЕКТЫ
  abilityCooldown: 0,
  abilityTurns: 0,
  heroAttackRange: 1,
  spellDiscount: 0,
  poisonTurns: 0,
  poisonDmg: 0,
  playerSlowTurns: 0,
  skeletonAlly: null, // {x, y, hp}
  
  player: { 
      x: 32, y: 160, px: 32, py: 160, startPx: 32, startPy: 160, isMoving: false, moveStartTime: 0 
  },
  stairs: { x: 288, y: 288, active: false },
  
  heroIdx: 0,
  gameMode: 'chase',
  gameActive: false,
  weapons: WARRIOR_WEAPONS,
  stats: { kills: 0, gold: 0, floors: 0 },

  settings: {
      floors: 5, monsterAdd: 0, itemRate: 2, shieldVal: 3, starVal: 1,
      difficulty: 'simple', bonusReset: false, autoMel: false, vibro: true,
      vibroPower: 100, keysMode: 'all', keysLayout: 'both', criticalAI: false
  },
  
  devSettings: {
      heroes: JSON.parse(JSON.stringify(HEROES)),
      monsters: JSON.parse(JSON.stringify(ENEMY_BASE))
  }
};

export function getTotalAtk() { return state.weapons[state.weaponLevel].dmg + state.tempAtk; }
export function getTotalDef() { return state.permanentShield + state.tempDef; }
export function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function clearBonuses() { state.tempAtk = 0; state.tempDef = 0; }