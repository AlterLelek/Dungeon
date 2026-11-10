import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer, skipTurn, castLightning, castHeal, castStun, castHurricane, activateAbility } from './game.js';
import { HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS, ARCHER_WEAPONS, VERSION, ENEMY_TYPES, ENEMY_NAMES, ENEMY_BASE } from './config.js';
import { playSound, initAudio, startMusic, startAmbient, setVolume } from './audio.js'; 

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');
const btnRandomName = document.getElementById('btn-random-name');

const canvas = document.createElement('canvas');
canvas.width = 320; canvas.height = 320;
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

document.getElementById('ver-login').innerText = VERSION;
document.getElementById('ver-game').innerText = VERSION;

try {
    const saved = JSON.parse(localStorage.getItem('pz_highscore'));
    if (saved) state.highScore = saved;
} catch (e) {}

function getWeaponsBySet(set) {
    if (set === 'mage') return MAGE_WEAPONS;
    if (set === 'archer') return ARCHER_WEAPONS;
    return WARRIOR_WEAPONS;
}

function renderCarousel() {
    const container = document.getElementById('hero-carousel');
    container.innerHTML = '';
    const total = HEROES.length;
    
    for (let offset = -1; offset <= 1; offset++) {
        const idx = (state.heroIdx + offset + total) % total;
        const h = HEROES[idx];
        
        const div = document.createElement('div');
        div.className = `hero-card ${offset === 0 ? 'center' : 'side'}`;
        div.innerHTML = `<div class="c-emoji">${h.emoji}</div><div class="c-name">${h.name}</div>`;
        
        if (offset !== 0) {
            div.onclick = () => { state.heroIdx = idx; renderCarousel(); playSound('menu'); };
        }
        container.appendChild(div);
    }
    
    const h = HEROES[state.heroIdx];
    const w = getWeaponsBySet(h.set)[0];
    document.getElementById('hero-desc').innerHTML = `
        <b>${h.name}</b><br>
        ❤️ ${h.maxHp} HP &nbsp;|&nbsp; ⚡ ${h.maxMp} MP &nbsp;|&nbsp; ⚔️ Урон: ${w.dmg}
    `;
}

document.getElementById('prev-hero').onclick = () => { state.heroIdx = (state.heroIdx - 1 + HEROES.length) % HEROES.length; renderCarousel(); playSound('menu'); };
document.getElementById('next-hero').onclick = () => { state.heroIdx = (state.heroIdx + 1) % HEROES.length; renderCarousel(); playSound('menu'); };
renderCarousel();

// КАРУСЕЛЬ РЕЖИМОВ
const GAME_MODES = [
    { id: 'chase_5', name: 'Погоня (1-5)' },
    { id: 'def_5', name: 'Защита (1-5)' },
    { id: 'def_inf', name: 'Защита (Безлимит)' },
    { id: 'wave_5', name: 'Волны монстров (1-5)' },
    { id: 'wave_inf', name: 'Волны монстров (Безлимит)' }
];
let currentModeIdx = 0;

function renderMode() {
    document.getElementById('mode-display').innerText = GAME_MODES[currentModeIdx].name;
    state.gameMode = GAME_MODES[currentModeIdx].id;
}
document.getElementById('prev-mode').onclick = () => { currentModeIdx = (currentModeIdx - 1 + GAME_MODES.length) % GAME_MODES.length; renderMode(); playSound('menu'); };
document.getElementById('next-mode').onclick = () => { currentModeIdx = (currentModeIdx + 1) % GAME_MODES.length; renderMode(); playSound('menu'); };
renderMode();

function saveSettings() { localStorage.setItem('pz_settings', JSON.stringify(state.settings)); }
function loadSettings() {
    try {
        const raw = localStorage.getItem('pz_settings');
        if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch(e) {}

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('set-floors', state.settings.floors); document.getElementById('floor-max').innerText = state.settings.floors;
    setVal('set-monst-add', state.settings.monsterAdd);
    setVal('set-item-rate', state.settings.itemRate);
    setVal('set-shield-val', state.settings.shieldVal);
    setVal('set-star-val', state.settings.starVal);
    
    document.getElementById('set-vibro').checked = state.settings.vibro;
    document.getElementById('set-bonus-reset').checked = state.settings.bonusReset;
    document.getElementById('diff-critical').checked = state.settings.criticalAI;
    document.getElementById('diff-simple').checked = state.settings.difficulty === 'simple';
    document.getElementById('diff-extreme').checked = state.settings.difficulty === 'extreme';
    
    document.getElementById('set-keys-mode').value = state.settings.keysMode || 'all';
    document.getElementById('set-keys-layout').value = state.settings.keysLayout || 'both';
}
loadSettings();

// Громкость (шкала от 0 до 10)
document.getElementById('set-master').addEventListener('input', (e) => { setVolume('master', parseInt(e.target.value) / 10); });
document.getElementById('set-sfx').addEventListener('input', (e) => { setVolume('sfx', parseInt(e.target.value) / 10); });
document.getElementById('set-amb').addEventListener('input', (e) => { setVolume('ambient', parseInt(e.target.value) / 10); });
document.getElementById('set-mel').addEventListener('input', (e) => { setVolume('music', parseInt(e.target.value) / 10); });
document.getElementById('set-tempo').addEventListener('input', (e) => { setVolume('tempo', parseInt(e.target.value)); });

function selectMelody(btnId, track) {
    document.querySelectorAll('.mel-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    startMusic(track);
}
document.getElementById('mel-cave').onclick = () => selectMelody('mel-cave', 'cave');
document.getElementById('mel-elven').onclick = () => selectMelody('mel-elven', 'elven');
document.getElementById('mel-dwarven').onclick = () => selectMelody('mel-dwarven', 'dwarven');
document.getElementById('mel-dice').onclick = () => selectMelody('mel-dice', 'dice');
document.getElementById('mel-shining').onclick = () => selectMelody('mel-shining', 'shining');
document.getElementById('mel-mm3').onclick = () => selectMelody('mel-mm3', 'mm3');

document.getElementById('set-floors').addEventListener('change', (e) => { state.settings.floors = parseInt(e.target.value); document.getElementById('floor-max').innerText = state.settings.floors; saveSettings(); });
document.getElementById('set-monst-add').addEventListener('change', (e) => { state.settings.monsterAdd = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-item-rate').addEventListener('change', (e) => { state.settings.itemRate = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-shield-val').addEventListener('change', (e) => { state.settings.shieldVal = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-star-val').addEventListener('change', (e) => { state.settings.starVal = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-vibro').addEventListener('change', (e) => { state.settings.vibro = e.target.checked; saveSettings(); });
document.getElementById('set-bonus-reset').addEventListener('change', (e) => { state.settings.bonusReset = e.target.checked; saveSettings(); });
document.getElementById('diff-critical').addEventListener('change', (e) => { state.settings.criticalAI = e.target.checked; saveSettings(); });
document.getElementById('diff-simple').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'simple'; saveSettings(); } else e.target.checked = true; });
document.getElementById('diff-extreme').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'extreme'; saveSettings(); } else e.target.checked = true; });

document.getElementById('set-keys-mode').addEventListener('change', (e) => { state.settings.keysMode = e.target.value; saveSettings(); });
document.getElementById('set-keys-layout').addEventListener('change', (e) => { state.settings.keysLayout = e.target.value; saveSettings(); });
document.getElementById('btn-reset-settings').addEventListener('click', () => { if (confirm("Сбросить?")) { localStorage.removeItem('pz_settings'); location.reload(); } });

// DEV ПАНЕЛЬ
const INTERESTS = ["-", "Герой", "Атака", "Мана", "Защита", "Жизнь", "Бонусы", "Трупы"];
const SPECIALS = ["-", "Вампиризм", "Сжигание маны", "Деление 1/3", "Замедление", "Съедание бонусов", "Яд", "Толстая защита", "Регенерация", "Поднятие", "Стрельба 2 + Вампиризм"];

function renderDevPanel() {
    const devHeroesContainer = document.getElementById('dev-heroes'); devHeroesContainer.innerHTML = '';
    HEROES.forEach((h, i) => {
        const details = document.createElement('details');
        details.innerHTML = `<summary>${h.emoji} ${h.name}</summary>`;
        ['maxHp', 'maxMp', 'attackRange'].forEach(f => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            div.innerHTML = `<span>${f}:</span> <input type="number" value="${h[f]}">`;
            details.appendChild(div);
            div.querySelector('input').addEventListener('change', (e) => { state.devSettings.heroes[i][f] = parseInt(e.target.value); });
        });
        devHeroesContainer.appendChild(details);
    });

    const devMonstersContainer = document.getElementById('dev-monsters'); devMonstersContainer.innerHTML = '';
    Object.keys(ENEMY_BASE).forEach((type, i) => {
        const m = ENEMY_BASE[type];
        const details = document.createElement('details');
        details.innerHTML = `<summary>${type} ${ENEMY_NAMES[type] || ''}</summary>`;
        ['hp', 'atk', 'def', 'speed'].forEach(f => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            div.innerHTML = `<span>${f}:</span> <input type="number" value="${m[f]}">`;
            details.appendChild(div);
            div.querySelector('input').addEventListener('change', (e) => { state.devSettings.monsters[type][f] = parseInt(e.target.value); });
        });
        
        const createSelect = (field, optionsArray) => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            const select = document.createElement('select');
            optionsArray.forEach(opt => {
                const o = document.createElement('option'); o.value = opt; o.innerText = opt;
                if (opt === m[field]) o.selected = true;
                select.appendChild(o);
            });
            div.innerHTML = `<span>${field}:</span> `; div.appendChild(select);
            details.appendChild(div);
            select.addEventListener('change', (e) => { state.devSettings.monsters[type][field] = e.target.value; });
        };
        createSelect('interest1', INTERESTS);
        createSelect('interest2', INTERESTS);
        createSelect('special', SPECIALS);
        devMonstersContainer.appendChild(details);
    });
}
renderDevPanel();

const ADJECTIVES = ["Соленый", "Мокрый", "Сонный", "Хитрый", "Злой", "Добрый", "Голодный", "Веселый", "Ржавый", "Ледяной", "Огненный", "Пушистый", "Колючий", "Быстрый", "Космический", "Древний", "Грязный", "Смелый", "Трусливый", "Загадочный"];
const NOUNS = ["Огурец", "Помидор", "Кот", "Пес", "Гном", "Дракон", "Скелет", "Призрак", "Рыцарь", "Маг", "Йогурт", "Кактус", "Пельмень", "Тапок", "Ботинок", "Носок", "Чайник", "Бублик", "Сыр", "Гриб"];
function generateRandomName() { guestNameInput.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; }

// HUD
function updateHUD() {
  document.getElementById('hp').innerText = state.playerHp;
  document.getElementById('shd-hud').innerText = state.permanentShield + state.tempDef;
  document.getElementById('bonus').innerText = state.weapons[state.weaponLevel].dmg + state.tempAtk;
  document.getElementById('floor-hud').innerText = state.currentFloor;
  document.getElementById('turns').innerText = state.totalTurns;
  document.getElementById('score').innerText = state.goldCount;
  document.getElementById('energy').innerText = state.playerMp;
  document.getElementById('hero-name-label').innerText = localStorage.getItem('pz_heroName').toUpperCase();
  document.getElementById('hero-fig').innerText = HEROES[state.heroIdx].emoji;
  
  const w = state.weapons[state.weaponLevel];
  document.getElementById('w-dmg').innerText = w.dmg;
  document.getElementById('w-name').innerText = w.name;
  document.getElementById('w-dmg').className = w.css; // Применяем цвет
  document.getElementById('w-name').className = 'w-name ' + w.css;

  // Обновляем кубок
  document.getElementById('high-score-line').innerText = state.highScore.turns || 0;

  const mpCostLight = Math.max(0, 3 - state.spellDiscount);
  const mpCostHeal = Math.max(0, 3 - state.spellDiscount);
  const mpCostStun = Math.max(0, 2 - state.spellDiscount);
  const mpCostHurr = Math.max(0, 4 - state.spellDiscount);

  const bLight = document.getElementById('btn-light');
  bLight.disabled = state.playerMp < mpCostLight && state.spellLightning <= 0;
  bLight.innerHTML = `⚡<br><span>${mpCostLight}M|x${state.spellLightning}</span>`;
  
  const bHeal = document.getElementById('btn-heal');
  bHeal.disabled = state.playerMp < mpCostHeal && state.spellHeal <= 0;
  bHeal.innerHTML = `💚<br><span>${mpCostHeal}M|x${state.spellHeal}</span>`;
  
  const bStun = document.getElementById('btn-stun');
  bStun.disabled = state.playerMp < mpCostStun && state.spellStun <= 0;
  bStun.innerHTML = `❄️<br><span>${mpCostStun}M|x${state.spellStun}</span>`;
  
  const bHurr = document.getElementById('btn-hurricane');
  bHurr.disabled = state.playerMp < mpCostHurr && state.spellHurricane <= 0;
  bHurr.innerHTML = `🌪️<br><span>${mpCostHurr}M|x${state.spellHurricane}</span>`;

  const bAbility = document.getElementById('ability-btn');
  if (state.abilityCooldown > 0) { bAbility.disabled = true; bAbility.innerText = `⏳${state.abilityCooldown}`; }
  else if (state.abilityTurns > 0) { bAbility.disabled = true; bAbility.innerText = `✨${state.abilityTurns}`; }
  else { bAbility.disabled = false; bAbility.innerText = `✨ Умение`; }

  document.getElementById('e-count').innerText = state.monsters.length;
  let eHtml = "";
  state.monsters.slice(0, 6).forEach(m => { 
      let status = m.status ? m.status : '&nbsp;&nbsp;';
      // НОВАЯ РАЗМЕТКА ДЛЯ МОНСТРОВ
      eHtml += `<div class="enemy-row">
        <span class="e-type">${m.type}</span>
        <span class="e-stat" style="color:#ef4444;">❤️${m.hp}</span>
        <span class="e-stat" style="color:#fbbf24;">💪${m.atk}</span>
        <span class="e-stat" style="color:#3b82f6;">🛡️${m.def}</span>
      </div>`; 
  });
  if (state.monsters.length > 6) eHtml += `<div style="color:#9ca3af; text-align:center;">… +${state.monsters.length - 6}</div>`;
  document.getElementById('e-list').innerHTML = eHtml;
}

function updateShop() {
  document.getElementById('shop-gold').innerText = "В кармане: " + state.goldCount + " золота";
  const nextW = state.weapons[state.weaponLevel + 1];
  const wLabel = document.getElementById('shop-wpn-label'), wCost = document.getElementById('shop-wpn-cost'), wBtn = document.getElementById('shop-wpn-btn');
  if (nextW) {
    wLabel.innerHTML = `⚔️ <span class="${nextW.css}">${nextW.name}</span> (dmg ${nextW.dmg})`;
    wCost.innerText = (state.weaponLevel + 1) + " зл"; wBtn.disabled = state.goldCount < (state.weaponLevel + 1);
  } else { wLabel.innerText = "⚔️ Максимум"; wCost.innerText = "—"; wBtn.disabled = true; }
  const sp = state.permanentShield + 1;
  document.getElementById('shop-shd-cost').innerText = sp + " зл";
  document.getElementById('shop-shd-btn').disabled = state.goldCount < sp;
}

function buyOption(kind) {
  if (kind === 'weapon') {
    const price = state.weaponLevel + 1;
    if (state.weapons[state.weaponLevel + 1] && state.goldCount >= price) { state.goldCount -= price; state.weaponLevel++; playSound('collect'); }
  } else if (kind === 'shield') {
    const sp = state.permanentShield + 1;
    if (state.goldCount >= sp) { state.goldCount -= sp; state.permanentShield++; playSound('collect'); }
  }
  updateShop(); updateHUD();
}

function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function gameLoop() {
  if (state.gameActive) {
    const now = performance.now();
    const PLAYER_DUR = 400; const MON_DUR = 250; 
    if (state.player.isMoving) {
        let t = (now - state.player.moveStartTime) / PLAYER_DUR;
        if (t >= 1) t = 1;
        let ease = easeInOutQuad(t);
        state.player.px = state.player.startPx + (state.player.x - state.player.startPx) * ease;
        state.player.py = state.player.startPy + (state.player.y - state.player.startPy) * ease;
        if (t >= 1) state.player.isMoving = false;
    }
    state.monsters.forEach(m => {
        if (m.isMoving) {
            let t = (now - m.moveStartTime) / MON_DUR;
            if (t >= 1) t = 1;
            let ease = easeInOutQuad(t);
            m.px = m.startPx + (m.x - m.startPx) * ease;
            m.py = m.startPy + (m.y - m.startPy) * ease;
            if (t >= 1) m.isMoving = false;
        } else { m.px = m.x; m.py = m.y; }
    });
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i]; f.y += f.vy; f.life -= 0.02;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    draw(ctx, bgCanvas); updateHUD();
  }
  requestAnimationFrame(gameLoop);
}

function startGame(name) {
    initAudio(); startAmbient(); startMusic('cave');   
    loginScreen.style.display = 'none'; gameScreen.style.display = 'flex';
    const magicRow = document.querySelector('.magic-row');
    gameScreen.insertBefore(canvas, magicRow.nextSibling);
    localStorage.setItem('pz_heroName', name);
    
    const hero = state.devSettings.heroes[state.heroIdx];
    state.playerHp = hero.maxHp; state.playerMp = 0; 
    state.weapons = getWeaponsBySet(hero.set); state.weaponLevel = 0;
    state.currentFloor = 1; state.gameActive = true;
    state.goldCount = 0; state.totalTurns = 0; state.stats = { kills: 0, gold: 0, floors: 0 };
    state.tempAtk = 0; state.tempDef = 0; state.permanentShield = 0;
    state.spellLightning = 0; state.spellHeal = 0; state.spellStun = 0; state.spellHurricane = 0;
    state.abilityCooldown = 0; state.abilityTurns = 0; state.heroAttackRange = hero.attackRange;
    state.spellDiscount = 0; state.poisonTurns = 0; state.poisonDmg = 0;
    state.playerSlowTurns = 0; state.skeletonAlly = null;
    state.angelCooldown = 0; state.isProcessingTurn = false;

    bgCanvas = initFloor(); updateHUD();
    if (!gameLoopStarted) { gameLoopStarted = true; requestAnimationFrame(gameLoop); }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('shop-panel').style.display = 'none'; document.getElementById('settings-panel').style.display = 'none'; return;
      }
      if (!state.gameActive || state.isProcessingTurn) return;
      const key = e.key.toLowerCase();
      const mode = state.settings.keysMode || 'all', layout = state.settings.keysLayout || 'both';
      
      if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowUp') || ((mode === 'all' || mode === 'wasd') && (key === 'w' || key === 'ц'))) movePlayer(0, -32);
      else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowDown') || ((mode === 'all' || mode === 'wasd') && (key === 's' || key === 'ы'))) movePlayer(0, 32);
      else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowLeft') || ((mode === 'all' || mode === 'wasd') && (key === 'a' || key === 'ф'))) movePlayer(-32, 0);
      else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowRight') || ((mode === 'all' || mode === 'wasd') && (key === 'd' || key === 'в'))) movePlayer(32, 0);
      
      else if (key === '1' || key === 'z' || key === 'я') { castLightning(); updateHUD(); }
      else if (key === '2' || key === 'x' || key === 'ч') { castHeal(); updateHUD(); }
      else if (key === '3' || key === 'c' || key === 'с') { castStun(); updateHUD(); }
      else if (key === '4' || key === 'v' || key === 'м') { castHurricane(); updateHUD(); }
      else if (key === '`' || key === 'ё' || key === '~') { activateAbility(); updateHUD(); }
      else if (key === 'm' || key === 'ь') { document.getElementById('shop-panel').style.display = 'block'; updateShop(); }
      
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    });
}

window.movePlayer = movePlayer;
window.skipTurn = skipTurn;

btnRandomName.onclick = () => { playSound('menu'); generateRandomName(); };
btnGuest.onclick = () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = ""; playSound('menu'); startGame(name);
};
document.getElementById('btn-google').onclick = () => { errorMsg.innerText = "Google отключен."; };
document.getElementById('btn-light').onclick = () => { castLightning(); updateHUD(); };
document.getElementById('btn-heal').onclick = () => { castHeal(); updateHUD(); };
document.getElementById('btn-stun').onclick = () => { castStun(); updateHUD(); };
document.getElementById('btn-hurricane').onclick = () => { castHurricane(); updateHUD(); };
document.getElementById('ability-btn').onclick = () => { activateAbility(); updateHUD(); };

document.getElementById('shop-btn').onclick = () => { playSound('menu'); document.getElementById('shop-panel').style.display = 'block'; updateShop(); };
document.getElementById('close-shop').onclick = () => document.getElementById('shop-panel').style.display = 'none';
document.getElementById('shop-wpn-btn').onclick = () => buyOption('weapon');
document.getElementById('shop-shd-btn').onclick = () => buyOption('shield');
document.getElementById('records-btn').onclick = () => { 
  playSound('menu'); document.getElementById('records-panel').style.display = 'block'; 
  document.getElementById('rec-highscore').innerText = state.highScore.turns;
  document.getElementById('rec-best-name').innerText = state.highScore.name;
  document.getElementById('rec-kills').innerText = state.stats.kills;
  document.getElementById('rec-gold').innerText = state.stats.gold;
};
document.getElementById('close-records').onclick = () => document.getElementById('records-panel').style.display = 'none';
document.getElementById('settings-btn').onclick = () => { playSound('menu'); document.getElementById('settings-panel').style.display = 'block'; };
document.getElementById('close-settings').onclick = () => document.getElementById('settings-panel').style.display = 'none';

generateRandomName();