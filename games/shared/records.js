// Общие рекорды смерти/побед для всех игр проекта.
const KEY = 'dungeon_records_v1';

export const RECORDS = [
  { id: 'kill_skeleton_dungeon', text: 'Убит скелетом в Подземелье' },
  { id: 'kill_turtle_dungeon', text: 'Убит черепахой в Подземелье' },
  { id: 'kill_turtle_sf', text: 'Убит черепахой в Подземелье 28' },
  { id: 'kill_zombie_mm6', text: 'Убит зомби в Авантюристе' },
  { id: 'kill_lich_mm6', text: 'Убит личем в Авантюристе' },
  { id: 'kill_spider_labyrinth', text: 'Убит пауком в Лабиринте' },
  { id: 'kill_dark_archer_dungeon', text: 'Убит тёмным арбалетчиком в Подземелье' },
  { id: 'boss_mm6', text: 'Победён босс в Авантюристе' },
  { id: 'flee_mm6', text: 'Удачный побег в Авантюристе' },
  { id: 'win_dungeon', text: 'Победа в Подземелье' },
  { id: 'win_sf', text: 'Победа в Подземелье 28' },
  { id: 'win_labyrinth', text: 'Победа в Лабиринте' },
  { id: 'win_mm6', text: 'Победа в Авантюристе' }
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
  return recordsList().map(r =>
    `<div class="recRow ${r.got?'got':''}"><span>${r.got?'🏆':'·'}</span><span>${r.text}</span></div>`
  ).join('');
}
