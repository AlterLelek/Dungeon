// Общие рекорды смерти/побед для всех игр проекта.
import { profileBadgeHTML } from './entry-profile.js';

const KEY = 'dungeon_records_v1';

export const RECORDS = [
  { id: 'kill_skeleton_dungeon', text: 'Убит скелетом в Подземелье 28' },
  { id: 'kill_turtle_dungeon', text: 'Убит черепахой в Подземелье 28' },
  { id: 'kill_turtle_sf', text: 'Убит черепахой в SF' },
  { id: 'kill_zombie_mm6', text: 'Убит зомби в MM6' },
  { id: 'kill_lich_mm6', text: 'Убит личем в MM6' },
  { id: 'kill_spider_labyrinth', text: 'Убит пауком в Лабиринте' },
  { id: 'kill_dark_archer_dungeon', text: 'Убит тёмным арбалетчиком в Подземелье 28' },
  { id: 'boss_mm6', text: 'Победён босс в MM6' },
  { id: 'flee_mm6', text: 'Удачный побег в MM6' },
  { id: 'win_dungeon', text: 'Победа в Подземелье 28' },
  { id: 'win_sf', text: 'Победа в SF' },
  { id: 'win_labyrinth', text: 'Победа в Лабиринте' },
  { id: 'win_mm6', text: 'Победа в MM6' }
];

export function loadRecords(){
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch(e){ return {}; }
}

export function saveRecords(rec){
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch(e){}
}

export function unlockRecord(id){
  const rec = loadRecords();
  if(rec[id]) return false;
  rec[id] = Date.now();
  saveRecords(rec);
  return true;
}

export function recordDeath(game, killerName){
  const name = String(killerName || '').toLowerCase();
  const map = {
    'скелет': 'kill_skeleton_dungeon',
    'черепаха': game === 'sf' ? 'kill_turtle_sf' : 'kill_turtle_dungeon',
    'зомби': 'kill_zombie_mm6',
    'лич': 'kill_lich_mm6',
    'паук': 'kill_spider_labyrinth',
    'тёмный арбалетчик': 'kill_dark_archer_dungeon',
    'темный арбалетчик': 'kill_dark_archer_dungeon'
  };
  for(const key of Object.keys(map)){
    if(name.includes(key)) return unlockRecord(map[key]);
  }
  return false;
}

export function recordsList(){
  const rec = loadRecords();
  return RECORDS.map(r => ({ ...r, got: !!rec[r.id] }));
}

export function recordsHTML(){
  // Игрок видит свой ник и комментарий в любом списке рекордов.
  const head = `<div class="dentry-rec">👤 ${profileBadgeHTML()}</div>`;
  return head + recordsList().map(r =>
    `<div class="recRow ${r.got?'got':''}"><span>${r.got?'🏆':'·'}</span><span>${r.text}</span></div>`
  ).join('');
}
