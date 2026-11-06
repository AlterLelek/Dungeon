import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer, skipTurn, castLightning, castHeal, castStun, castHurricane } from './game.js';
import { HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS, VERSION, ENEMY_TYPES, ENEMY_NAMES } from './config.js';
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
if (state.highScore.turns > 0) {
    document.getElementById('high-score-line').innerText = `🏆 ${state.highScore.turns} х.`;
} else {
    document.getElementById('high-score-line').innerText = '';
}

// ==========================================
// КАРУСЕЛЬ ГЕРОЕВ
// ==========================================
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
            div.onclick = () => {
                state.heroIdx = idx;
                renderCarousel();
                playSound('menu');
            };
        }
        container.appendChild(div);
    }
    
    const h = HEROES[state.heroIdx];
    const w = h.set === 'mage' ? MAGE_WEAPONS[0] : WARRIOR_WEAPONS[0];
    document.getElementById('hero-desc').innerHTML = `
        <b>${h.name}</b><br>
        ❤️ ${h.maxHp} HP &nbsp;|&nbsp; ⚡ ${h.maxMp} MP &nbsp;|&nbsp; ⚔️ Урон: ${w.dmg}
    `;
}

document.getElementById('prev-hero').onclick = () => {
    state.heroIdx = (state.heroIdx - 1 + HEROES.length) % HEROES.length;
    renderCarousel();
    playSound('menu');
};
document.getElementById('next-hero').onclick = () => {
    state.heroIdx = (state.heroIdx + 1) % HEROES.length;
    renderCarousel();
    playSound('menu');
};
renderCarousel();

// ==========================================
// НАСТРОЙКИ
// ==========================================
function saveSettings() { localStorage.setItem('pz_settings', JSON.stringify(state.settings)); }
function loadSettings() {
    try {
        const raw = localStorage.getItem('pz_settings');
        if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch(e) {}

    document.getElementById('set-floors').value = state.settings.floors;
    document.getElementById('set-floors-v').innerText = state.settings.floors;
    document.getElementById('floor-max').innerText = state.settings.floors;
    document.getElementById('set-monst-add').value = state.settings.monsterAdd;
    document.getElementById('set-monst-add-v').innerText = '+' + state.settings.monsterAdd;
    document.getElementById('set-item-rate').value = state.settings.itemRate;
    document.getElementById('set-item-rate-v').innerText = state.settings.itemRate;
    document.getElementById('set-shield-val').value = state.settings.shieldVal;
    document.getElementById('set-shield-val-v').innerText = state.settings.shieldVal;
    document.getElementById('set-star-val').value = state.settings.starVal;
    document.getElementById('set-star-val-v').innerText = state.settings.starVal;
    document.getElementById('set-vibro').checked = state.settings.vibro;
    document.getElementById('set-vibro-power').value = state.settings.vibroPower;
    document.getElementById('set-vibro-power-v').innerText = state.settings.vibroPower + '%';
    document.getElementById('set-keys-mode').value = state.settings.keysMode;
    document.getElementById('set-keys-layout').value = state.settings.keysLayout;
    document.getElementById('set-auto-mel').checked = state.settings.autoMel;
    document.getElementById('set-bonus-reset').checked = state.settings.bonusReset;
    document.getElementById('diff-critical').checked = state.settings.criticalAI;
    document.getElementById('diff-simple').checked = state.settings.difficulty === 'simple';
    document.getElementById('diff-extreme').checked = state.settings.difficulty === 'extreme';
    document.getElementById('diff-horror').checked = state.settings.difficulty === 'horror';
}
loadSettings();

document.getElementById('set-floors').addEventListener('input', (e) => { state.settings.floors = parseInt(e.target.value); document.getElementById('set-floors-v').innerText = state.settings.floors; document.getElementById('floor-max').innerText = state.settings.floors; saveSettings(); });
document.getElementById('set-monst-add').addEventListener('input', (e) => { state.settings.monsterAdd = parseInt(e.target.value); document.getElementById('set-monst-add-v').innerText = '+' + state.settings.monsterAdd; saveSettings(); });
document.getElementById('set-item-rate').addEventListener('input', (e) => { state.settings.itemRate = parseInt(e.target.value); document.getElementById('set-item-rate-v').innerText = state.settings.itemRate; saveSettings(); });
document.getElementById('set-shield-val').addEventListener('input', (e) => { state.settings.shieldVal = parseInt(e.target.value); document.getElementById('set-shield-val-v').innerText = state.settings.shieldVal; saveSettings(); });
document.getElementById('set-star-val').addEventListener('input', (e) => { state.settings.starVal = parseInt(e.target.value); document.getElementById('set-star-val-v').innerText = state.settings.starVal; saveSettings(); });
document.getElementById('set-vibro').addEventListener('change', (e) => { state.settings.vibro = e.target.checked; saveSettings(); });
document.getElementById('set-vibro-power').addEventListener('input', (e) => { state.settings.vibroPower = parseInt(e.target.value); document.getElementById('set-vibro-power-v').innerText = state.settings.vibroPower + '%'; saveSettings(); });
document.getElementById('set-keys-mode').addEventListener('change', (e) => { state.settings.keysMode = e.target.value; saveSettings(); });
document.getElementById('set-keys-layout').addEventListener('change', (e) => { state.settings.keysLayout = e.target.value; saveSettings(); });
document.getElementById('set-auto-mel').addEventListener('change', (e) => { state.settings.autoMel = e.target.checked; saveSettings(); });
document.getElementById('set-bonus-reset').addEventListener('change', (e) => { state.settings.bonusReset = e.target.checked; saveSettings(); });
document.getElementById('diff-critical').addEventListener('change', (e) => { state.settings.criticalAI = e.target.checked; saveSettings(); });
document.getElementById('diff-simple').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'simple'; saveSettings(); } else e.target.checked = true; });
document.getElementById('diff-extreme').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'extreme'; saveSettings(); } else e.target.checked = true; });
document.getElementById('diff-horror').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'horror'; saveSettings(); } else e.target.checked = true; });
document.getElementById('btn-reset-settings').addEventListener('click', () => { if (confirm("Сбросить все настройки?")) { localStorage.removeItem('pz_settings'); location.reload(); } });

// DEV ПАНЕЛЬ
const devHeroesContainer = document.getElementById('dev-heroes');
HEROES.forEach((h, i) => {
    const details = document.createElement('details');
    details.innerHTML = `<summary>${h.emoji} ${h.name}</summary>`;
    const hpLabel = document.createElement('div'); hpLabel.className = 'dev-stat';
    hpLabel.innerHTML = `<span>HP:</span> <input type="number" id="dev-hero-${i}-hp" value="${h.maxHp}">`;
    details.appendChild(hpLabel);
    devHeroesContainer.appendChild(details);
    hpLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.heroes[i].maxHp = parseInt(e.target.value); });
});
document.getElementById('set-dev-mode')?.addEventListener('change', (e) => { document.getElementById('dev-panel').style.display = e.target.checked ? 'block' : 'none'; });

const ADJECTIVES = ["Соленый", "Мокрый", "Сонный", "Хитрый", "Злой", "Добрый", "Голодный", "Веселый", "Ржавый", "Ледяной", "Огненный", "Пушистый", "Колючий", "Быстрый", "Космический", "Древний", "Грязный", "Смелый", "Трусливый", "Загадочный"];
const NOUNS = ["Огурец", "Помидор", "Кот", "Пес", "Гном", "Дракон", "Скелет", "Призрак", "Рыцарь", "Маг", "Йогурт", "Кактус", "Пельмень", "Тапок", "Ботинок", "Носок", "Чайник", "Бублик", "Сыр", "Гриб"];
function generateRandomName() { guestNameInput.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`; }

// HUD
const hudHp = document.getElementById('hp');
const hudShd = document.getElementById('shd-hud');
const hudBonus = document.getElementById('bonus');
const hudFloor = document.getElementById('floor-hud');
const hudTurns = document.getElementById('turns');
const hudScore = document.getElementById('score');
const hudEnergy = document.getElementById('energy');
const hudECount = document.getElementById('e-count');
const hudEList = document.getElementById('e-list');
const hudWeapon = document.getElementById('hero-weapon');
const hudName = document.getElementById('hero-name-label');
const hudFig = document.getElementById('hero-fig');
const btnLight = document.getElementById('btn-light');
const btnHeal = document.getElementById('btn-heal');
const btnStun = document.getElementById('btn-stun');
const btnHurricane = document.getElementById('btn-hurricane');

function updateHUD() {
  hudHp.innerText = state.playerHp;
  hudShd.innerText = state.permanentShield + state.tempDef;
  hudBonus.innerText = state.weapons[state.weaponLevel].dmg + state.tempAtk;
  hudFloor.innerText = state.currentFloor;
  hudTurns.innerText = state.totalTurns;
  hudScore.innerText = state.goldCount;
  hudEnergy.innerText = state.playerMp;
  hudName.innerText = localStorage.getItem('pz_heroName').toUpperCase();
  hudFig.innerText = HEROES[state.heroIdx].emoji;
  
  const w = state.weapons[state.weaponLevel];
  hudWeapon.innerHTML = `⚔️ <span class="${w.css}">${w.name}</span> · ${w.dmg}`;

  btnLight.disabled = state.playerMp < 3 || state.spellLightning <= 0;
  btnLight.innerHTML = `⚡ Молния<br><span>3 MP | x${state.spellLightning}</span>`;
  btnHeal.disabled = state.playerMp < 3 || state.spellHeal <= 0;
  btnHeal.innerHTML = `💚 Лечение<br><span>3 MP | x${state.spellHeal}</span>`;
  btnStun.disabled = state.playerMp < 2 || state.spellStun <= 0;
  btnStun.innerHTML = `❄️ Стан<br><span>2 MP | x${state.spellStun}</span>`;
  btnHurricane.disabled = state.playerMp < 4 || state.spellHurricane <= 0;
  btnHurricane.innerHTML = `🌪️ Ураган<br><span>4 MP | x${state.spellHurricane}</span>`;

  hudECount.innerText = state.monsters.length;
  let eHtml = "";
  state.monsters.slice(0, 6).forEach(m => { eHtml += `<div>${m.type} ❤️${m.hp} 💪${m.atk} 🛡️${m.def}</div>`; });
  if (state.monsters.length > 6) eHtml += `<div style="color:#9ca3af;">… +${state.monsters.length - 6}</div>`;
  hudEList.innerHTML = eHtml;
}

// ИГРА
function updateShop() {
  document.getElementById('shop-gold').innerText = "В кармане: " + state.goldCount + " золота";
  const nextW = state.weapons[state.weaponLevel + 1];
  const wLabel = document.getElementById('shop-wpn-label');
  const wCost = document.getElementById('shop-wpn-cost');
  const wBtn = document.getElementById('shop-wpn-btn');
  
  if (nextW) {
    const price = state.weaponLevel + 1; 
    wLabel.innerHTML = `⚔️ <span class="${nextW.css}">${nextW.name}</span> (урон ${nextW.dmg})`;
    wCost.innerText = price + " зл";
    wBtn.disabled = state.goldCount < price;
  } else { wLabel.innerText = "⚔️ Оружие максимального уровня"; wCost.innerText = "—"; wBtn.disabled = true; }
  
  const sp = state.permanentShield + 1;
  document.getElementById('shop-shd-cost').innerText = sp + " зл";
  document.getElementById('shop-shd-btn').disabled = state.goldCount < sp;
}

function buyOption(kind) {
  if (kind === 'weapon') {
    const nextW = state.weapons[state.weaponLevel + 1];
    const price = state.weaponLevel + 1;
    if (nextW && state.goldCount >= price) { state.goldCount -= price; state.weaponLevel++; playSound('collect'); }
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
    const DURATION = 500; const MON_DURATION = 300; 
    if (state.player.isMoving) {
        let t = (now - state.player.moveStartTime) / DURATION;
        if (t >= 1) t = 1;
        let ease = easeInOutQuad(t);
        state.player.px = state.player.startPx + (state.player.x - state.player.startPx) * ease;
        state.player.py = state.player.startPy + (state.player.y - state.player.startPy) * ease;
        if (t >= 1) state.player.isMoving = false;
    }
    state.monsters.forEach(m => {
        if (m.isMoving) {
            let t = (now - m.moveStartTime) / MON_DURATION;
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
    draw(ctx, bgCanvas);
    updateHUD();
  }
  requestAnimationFrame(gameLoop);
}

function startGame(name) {
    initAudio(); 
    startAmbient(); startMusic();   
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    const magicRow = document.querySelector('.magic-row');
    gameScreen.insertBefore(canvas, magicRow.nextSibling);
    
    localStorage.setItem('pz_heroName', name);
    
    const hero = state.devSettings.heroes[state.heroIdx];
    state.playerHp = hero.maxHp;
    state.playerMp = 0; 
    // ВЕРНУЛИ РАЗДЕЛЕНИЕ ОРУЖИЯ
    state.weapons = (hero.set === 'mage') ? MAGE_WEAPONS : WARRIOR_WEAPONS;
    state.weaponLevel = 0;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;
    state.totalTurns = 0;
    state.stats = { kills: 0, gold: 0, floors: 0 };
    state.tempAtk = 0; state.tempDef = 0; state.permanentShield = 0;
    
    state.spellLightning = 0; state.spellHeal = 0; state.spellStun = 0; state.spellHurricane = 0;

    bgCanvas = initFloor(); 
    updateHUD();
    
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('shop-panel').style.display = 'none';
        document.getElementById('settings-panel').style.display = 'none';
        document.getElementById('records-panel').style.display = 'none';
        return;
      }
      if (!state.gameActive) return;
      const key = e.key.toLowerCase();
      
      if (key === 'arrowup' || key === 'w' || key === 'ц') movePlayer(0, -32);
      else if (key === 'arrowdown' || key === 's' || key === 'ы') movePlayer(0, 32);
      else if (key === 'arrowleft' || key === 'a' || key === 'ф') movePlayer(-32, 0);
      else if (key === 'arrowright' || key === 'd' || key === 'в') movePlayer(32, 0);
      
      else if (key === '1' || key === 'z' || key === 'я') { castLightning(); updateHUD(); }
      else if (key === '2' || key === 'x' || key === 'ч') { castHeal(); updateHUD(); }
      else if (key === '3' || key === 'c' || key === 'с') { castStun(); updateHUD(); }
      else if (key === '4' || key === 'v' || key === 'м') { castHurricane(); updateHUD(); }
      
      else if (key === 'm' || key === 'ь') {
        document.getElementById('shop-panel').style.display = 'block';
        updateShop();
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
}

window.movePlayer = movePlayer;
window.skipTurn = skipTurn;

btnRandomName.addEventListener('click', () => { playSound('menu'); generateRandomName(); });
btnGuest.addEventListener('click', () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = "";
    playSound('menu');
    startGame(name);
});
document.getElementById('btn-google').addEventListener('click', () => { errorMsg.innerText = "Google отключен."; });

document.getElementById('btn-light').addEventListener('click', () => { castLightning(); updateHUD(); });
document.getElementById('btn-heal').addEventListener('click', () => { castHeal(); updateHUD(); });
document.getElementById('btn-stun').addEventListener('click', () => { castStun(); updateHUD(); });
document.getElementById('btn-hurricane').addEventListener('click', () => { castHurricane(); updateHUD(); });

document.getElementById('shop-btn').addEventListener('click', () => { playSound('menu'); document.getElementById('shop-panel').style.display = 'block'; updateShop(); });
document.getElementById('close-shop').addEventListener('click', () => document.getElementById('shop-panel').style.display = 'none');
document.getElementById('shop-wpn-btn').addEventListener('click', () => buyOption('weapon'));
document.getElementById('shop-shd-btn').addEventListener('click', () => buyOption('shield'));

document.getElementById('records-btn').addEventListener('click', () => { 
  playSound('menu'); document.getElementById('records-panel').style.display = 'block'; 
  document.getElementById('rec-highscore').innerText = state.highScore.turns;
  document.getElementById('rec-best-name').innerText = state.highScore.name;
  document.getElementById('rec-kills').innerText = state.stats.kills;
  document.getElementById('rec-gold').innerText = state.stats.gold;
});
document.getElementById('close-records').addEventListener('click', () => document.getElementById('records-panel').style.display = 'none');

document.getElementById('settings-btn').addEventListener('click', () => { playSound('menu'); document.getElementById('settings-panel').style.display = 'block'; });
document.getElementById('close-settings').addEventListener('click', () => document.getElementById('settings-panel').style.display = 'none');

generateRandomName();