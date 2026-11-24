import { HERO_DOSSIERS, MONSTER_DOSSIERS, RULES } from '../shared/universe.js';
import {
  VERSION,
  HEROES,
  WARRIOR_WEAPONS,
  MAGE_WEAPONS,
  ARCHER_WEAPONS,
  ENEMY_TYPES,
  ENEMY_NAMES,
  ENEMY_BASE,
  MONSTER_SKINS
} from './config.js';

const BASE = new URL('./', import.meta.url);
const asset = path => new URL(path, BASE).href;

const HERO_KEYS = ['warrior', 'mage', 'paladin', 'angel', 'archer', 'druid', 'rogue', 'amazon', 'dwarf', 'dwarfmage'];
const MONSTER_KEYS = [
  'skeleton', 'ghost', 'mouse', 'spider', 'orge', 'zombie', 'turtle', 'devil', 'necro', 'archer',
  'wolf', 'goblin', 'orc', 'troll', 'golem', 'vampire', 'mummy', 'siren', 'wyvern', 'lich'
];

function normalizeWeapon(w) {
  const out = { name: w.name, css: w.css, dmg: w.dmg, cost: w.cost };
  if (w.sprite) out.sprite = asset(w.sprite);
  return out;
}

const heroes = HEROES.map((h, i) => ({
  key: HERO_KEYS[i] || h.set,
  name: h.name,
  emoji: h.emoji,
  set: h.set,
  maxHp: h.maxHp,
  maxMp: h.maxMp,
  hp: h.maxHp,
  mp: h.maxMp,
  lightRange: h.lightRange,
  attackRange: h.attackRange,
  sprite: h.name === 'Ангел'
    ? asset('../../assets/sprites/heroes/battle_angel_0.png')
    : asset(h.skins[0]),
  ...(HERO_DOSSIERS[i] || {})
}));

const monsters = ENEMY_TYPES.map((emoji, i) => ({
  key: MONSTER_KEYS[i],
  emoji,
  name: ENEMY_NAMES[emoji],
  ...ENEMY_BASE[emoji],
  sprite: asset(MONSTER_SKINS[emoji][0]),
  poison: emoji === '🧟' || emoji === '🧟‍♀️',
  ...(MONSTER_DOSSIERS[i] || {})
}));

export const D28_DATA = {
  version: VERSION,
  heroes,
  monsters,
  rules: RULES,
  weapons: {
    warrior: WARRIOR_WEAPONS.map(normalizeWeapon),
    mage: MAGE_WEAPONS.map(normalizeWeapon),
    archer: ARCHER_WEAPONS.map(normalizeWeapon)
  }
};

if (typeof window !== 'undefined') window.D28_DATA = D28_DATA;
