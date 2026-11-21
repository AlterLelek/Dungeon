// Единая форма входа для хаба и всех игр проекта.
// Хранит ник, аватар и комментарий игрока локально (без сервера).
// Подключается как ES-модуль: import { mountEntryForm } from '../shared/entry-profile.js';

const KEY = 'dungeon_profile_v1';
const AVATARS = ['🕯️', '🌀', '⚔️', '👁️', '🧙', '🐉', '🏰', '💎'];
const DEFAULTS = { nick: '', comment: '', avatar: '🕯️', updated: 0 };
let profile = load();

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    if(!raw || typeof raw !== 'object') return { ...DEFAULTS };
    return {
      nick: String(raw.nick || '').slice(0, 16),
      comment: String(raw.comment || '').slice(0, 160),
      avatar: AVATARS.includes(raw.avatar) ? raw.avatar : DEFAULTS.avatar,
      updated: Number(raw.updated) || 0
    };
  }catch(e){ return { ...DEFAULTS }; }
}

export function getProfile(){ return { ...profile }; }
export function profileNick(){ return profile.nick || 'Герой'; }
export function profileComment(){ return profile.comment || ''; }
export function profileAvatar(){ return profile.avatar || DEFAULTS.avatar; }

export function saveProfile(patch){
  profile = { ...profile, ...(patch || {}), updated: Date.now() };
  profile.nick = String(profile.nick || '').slice(0, 16);
  profile.comment = String(profile.comment || '').slice(0, 160);
  if(!AVATARS.includes(profile.avatar)) profile.avatar = DEFAULTS.avatar;
  try{ localStorage.setItem(KEY, JSON.stringify(profile)); }catch(e){}
  document.dispatchEvent(new CustomEvent('dungeon-profile', { detail: getProfile() }));
  refreshMounts();
  return getProfile();
}

export function profileBadgeHTML(){
  const nick = (profile.nick || 'Герой').replace(/[<>&"]/g, '');
  const comment = (profile.comment || '').replace(/[<>&"]/g, '');
  return '<span class="dentry-chip"><b>' + profile.avatar + ' ' + nick + '</b>' +
    (comment ? '<small title="' + comment + '">💬 ' + comment.slice(0, 42) + (comment.length > 42 ? '…' : '') + '</small>' : '') +
    '</span>';
}

let styled = false;
function ensureStyles(){
  if(styled || document.getElementById('dungeon-entry-style')){ styled = true; return; }
  styled = true;
  const s = document.createElement('style');
  s.id = 'dungeon-entry-style';
  s.textContent = `
.dentry{width:100%;max-width:330px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;
  padding:9px 10px;border:1px solid rgba(251,191,36,.32);border-radius:12px;
  background:linear-gradient(160deg,rgba(43,43,59,.92),rgba(17,18,28,.94));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 6px 18px rgba(0,0,0,.35);font-family:inherit}
.dentry-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dentry-head b{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#fbbf24}
.dentry-head small{font-size:9px;color:#7f8aa8;white-space:nowrap}
.dentry-fields{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.dentry-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.dentry-field label{font-size:9px;letter-spacing:.6px;text-transform:uppercase;color:#9fb0d8}
.dentry input,.dentry textarea{width:100%;box-sizing:border-box;font:inherit;font-size:12px;color:#ffe9b0;
  background:#0e101b;border:1px solid #4a4a68;border-radius:8px;padding:6px 8px;outline:none;min-width:0}
.dentry textarea{resize:vertical;min-height:32px;max-height:72px;line-height:1.25}
.dentry input:focus,.dentry textarea:focus{border-color:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,.15)}
.dentry-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:9px;color:#7f8aa8}
.dentry-foot .dentry-count{color:#fbbf24;font-variant-numeric:tabular-nums}
.dentry-chip{display:inline-flex;flex-direction:column;align-items:flex-start;gap:1px;max-width:100%;
  padding:4px 8px;border:1px solid rgba(251,191,36,.28);border-radius:9px;background:rgba(17,18,28,.75)}
.dentry-chip b{font-size:11px;color:#ffe9b0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dentry-chip small{font-size:9px;color:#9fb0d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
.dentry-rec{margin:0 0 6px;padding:5px 7px;border-left:2px solid #fbbf24;border-radius:4px;
  background:rgba(251,191,36,.07);color:#fde68a;font-size:10px;font-style:italic}
@media(max-width:520px){.dentry-fields{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

const mounts = new Set();
function refreshMounts(){ mounts.forEach(fn => { try{ fn(); }catch(e){} }); }

// Создаёт компактную панель входа рядом с уже существующим полем имени игры.
// Игра по-прежнему читает своё поле — мы только синхронизируем значения.
export function mountEntryForm(opts){
  const o = opts || {};
  ensureStyles();
  const gameInput = document.querySelector(o.input);
  if(!gameInput){
    if(console && console.warn) console.warn('[entry-profile] поле не найдено: ' + o.input);
    return null;
  }

  const box = document.createElement('div');
  box.className = 'dentry';
  box.innerHTML =
    '<div class="dentry-head"><b>' + (o.title || 'Вход в игру') + '</b><small>сохраняется локально</small></div>' +
    '<div class="dentry-fields">' +
      '<div class="dentry-field"><label for="dentry-nick">Ник игрока</label><input id="dentry-nick" maxlength="16" placeholder="Герой" autocomplete="nickname" spellcheck="false"></div>' +
      '<div class="dentry-field"><label for="dentry-comment">Комментарий</label><textarea id="dentry-comment" maxlength="160" placeholder="Пара слов о себе…" spellcheck="false"></textarea></div>' +
    '</div>' +
    '<div class="dentry-foot"><span>💬 Видно в рекордах и профиле</span><span class="dentry-count">0/160</span></div>';

  const host = gameInput.closest('.name-row, .row, #nameRow') || gameInput.parentElement || document.body;
  host.insertAdjacentElement('afterend', box);

  const nick = box.querySelector('#dentry-nick');
  const comment = box.querySelector('#dentry-comment');
  const counter = box.querySelector('.dentry-count');

  const paint = () => {
    nick.value = profile.nick;
    if(document.activeElement !== comment) comment.value = profile.comment;
    counter.textContent = comment.value.length + '/160';
  };
  mounts.add(paint);
  paint();

  // Ник из профиля становится ником по умолчанию в самой игре.
  if(profile.nick && gameInput.value !== profile.nick){
    gameInput.value = profile.nick;
    gameInput.dispatchEvent(new Event('input', { bubbles:true }));
  }

  nick.addEventListener('input', () => {
    gameInput.value = nick.value;
    saveProfile({ nick: nick.value });
  });
  comment.addEventListener('input', () => saveProfile({ comment: comment.value }));
  gameInput.addEventListener('input', () => saveProfile({ nick: gameInput.value }));

  const start = o.start && document.querySelector(o.start);
  if(start) start.addEventListener('click', () => saveProfile({ nick: (gameInput.value || nick.value || '').trim() || 'Герой' }));

  window.DungeonProfile = { get:getProfile, save:saveProfile, nick:profileNick, comment:profileComment, avatar:profileAvatar };
  return box;
}
