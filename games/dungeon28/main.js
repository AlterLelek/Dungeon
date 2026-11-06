import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer, skipTurn, castLightning, castHeal, castStun, castHurricane } from './game.js';
import { HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS, VERSION, ENEMY_TYPES, ENEMY_NAMES } from './config.js';
import { playSound, initAudio, startMusic, startAmbient, setVolume } from './audio.js'; // ПРАВКА: локальный импорт

// Элементы DOM
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');
const btnRandomName = document.getElementById('btn-random-name');

// Канвас
const canvas = document.createElement('canvas');
canvas.width = 320; canvas.height = 320;
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

document.getElementById('ver-login').innerText = VERSION;
document.getElementById('ver-game').innerText = VERSION;

// Загрузка рекорда
try {
    const saved = JSON.parse(localStorage.getItem('pz_highscore'));
    if (saved) state.highScore = saved;
} catch (e) {}
// ПРАВКА: Если рекорд 0 - не пишем
if (state.highScore.turns > 0) {
    document.getElementById('high-score-line').innerText = `🏆 ${state.highScore.turns} х.`;
} else {
    document.getElementById('high-score-line').innerText = '';
}

// DEV ПАНЕЛЬ: Герои
const devHeroesContainer = document.getElementById('dev-heroes');
HEROES.forEach((h, i) => {
    const details = document.createElement('details');
    details.innerHTML = `<summary>${h.emoji} ${h.name}</summary>`;
    const hpLabel = document.createElement('div'); hpLabel.className = 'dev-stat';
    hpLabel.innerHTML = `<span>HP:</span> <input type="number" id="dev-hero-${i}-hp" value="${h.maxHp}">`;
    const mpLabel = document.createElement('div'); mpLabel.className = 'dev-stat';
    mpLabel.innerHTML = `<span>MP:</span> <input type="number" id="dev-hero-${i}-mp" value="${h.maxMp}">`;
    details.appendChild(hpLabel); details.appendChild(mpLabel);
    devHeroesContainer.appendChild(details);
    hpLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.heroes[i].maxHp = parseInt(e.target.value); });
    mpLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.heroes[i].maxMp = parseInt(e.target.value); });
});

// DEV ПАНЕЛЬ: Монстры
const devMonstersContainer = document.getElementById('dev-monsters');
ENEMY_TYPES.forEach(type => {
    const base = state.devSettings.monsters[type];
    const details = document.createElement('details');
    details.innerHTML = `<summary>${type} ${ENEMY_NAMES[type]}</summary>`;
    const hpLabel = document.createElement('div'); hpLabel.className = 'dev-stat';
    hpLabel.innerHTML = `<span>HP:</span> <input type="number" value="${base.hp}">`;
    const atkLabel = document.createElement('div'); atkLabel.className = 'dev-stat';
    atkLabel.innerHTML = `<span>ATK:</span> <input type="number" value="${base.atk}">`;
    const defLabel = document.createElement('div'); defLabel.className = 'dev-stat';
    defLabel.innerHTML = `<span>DEF:</span> <input type="number" value="${base.def}">`;
    details.appendChild(hpLabel); details.appendChild(atkLabel); details.appendChild(defLabel);
    devMonstersContainer.appendChild(details);
    hpLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.monsters[type].hp = parseInt(e.target.value); });
    atkLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.monsters[type].atk = parseInt(e.target.value); });
    defLabel.querySelector('input').addEventListener('change', (e) => { state.devSettings.monsters[type].def = parseInt(e.target.value); });
});

// Включение dev-панели
document.getElementById('set-dev-mode').addEventListener('change', (e) => {
    document.getElementById('dev-panel').style.display = e.target.checked ? 'block' : 'none';
});

// ВЫБОР ГЕРОЯ (на экране логина)
const heroSelect = document.getElementById('hero-select');
HEROES.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = `hero-btn ${i === 0 ? 'selected' : ''}`;
    btn.innerHTML = `${h.emoji}<span>${h.name}</span>`;
    btn.onclick = () => {
        document.querySelectorAll('.hero-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.heroIdx = i;
        playSound('menu');
    };
    heroSelect.appendChild(btn);
});

// Случайное имя
const ADJECTIVES = ["Соленый", "Мокрый", "Сонный", "Хитрый", "Злой", "Добрый", "Голодный", "Веселый", "Ржавый", "Ледяной", "Огненный", "Пушистый", "Колючий", "Быстрый", "Космический", "Древний", "Грязный", "Смелый", "Трусливый", "Загадочный"];
const NOUNS = ["Огурец", "Помидор", "Кот", "Пес", "Гном", "Дракон", "Скелет", "Призрак", "Рыцарь", "Маг", "Йогурт", "Кактус", "Пельмень", "Тапок", "Ботинок", "Носок", "Чайник", "Бублик", "Сыр", "Гриб"];
function generateRandomName() {
    guestNameInput.value = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
}

// HUD
const hudHp = document.getElementById('hp');
const hudShd = document.getElementById('shd-hud');
const hudBonus = document.getElementById('bonus');
const hudFloor = document.getElementById('floor-hud');
const hudTurns = document.getElementById('turns');
const hudScore = document.getElementById('score');
const hudEnergy = document.getElementById('energy');
const hudMaxEnergy = document.getElementById('max-energy');
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
  hudMaxEnergy.innerText = ""; // ПРАВКА: Убрали лимит маны
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
  // ПРАВКА: Только эмодзи, без имен и статов
  state.monsters.slice(0, 6).forEach(m => {
    eHtml += `<div>${m.type}</div>`;
  });
  if (state.monsters.length > 6) eHtml += `<div style="color:#9ca3af;">… ещё ${state.monsters.length - 6}</div>`;
  hudEList.innerHTML = eHtml;
}

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
  } else {
    wLabel.innerText = "⚔️ Оружие максимального уровня"; wCost.innerText = "—"; wBtn.disabled = true;
  }
  
  const sp = state.permanentShield + 1;
  document.getElementById('shop-shd-cost').innerText = sp + " зл";
  document.getElementById('shop-shd-btn').disabled = state.goldCount < sp;
}

function buyOption(kind) {
  if (kind === 'weapon') {
    const nextW = state.weapons[state.weaponLevel + 1];
    const price = state.weaponLevel + 1;
    if (nextW && state.goldCount >= price) { 
      state.goldCount -= price; state.weaponLevel++; playSound('collect'); 
    }
  } else if (kind === 'shield') {
    const sp = state.permanentShield + 1;
    if (state.goldCount >= sp) { 
      state.goldCount -= sp; state.permanentShield++; playSound('collect'); 
    }
  }
  updateShop(); updateHUD();
}

function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function gameLoop() {
  if (state.gameActive) {
    const now = performance.now();
    const DURATION = 500; 
    const MON_DURATION = 300; 
    
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
    setVolume('master', document.getElementById('set-vol-master').value);
    setVolume('music', document.getElementById('set-vol-music').value);
    setVolume('ambient', document.getElementById('set-vol-ambient').value);
    setVolume('sfx', document.getElementById('set-vol-sfx').value);
    startAmbient(); startMusic();   
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    const magicRow = document.querySelector('.magic-row');
    gameScreen.insertBefore(canvas, magicRow.nextSibling);
    
    localStorage.setItem('pz_heroName', name);
    
    const hero = state.devSettings.heroes[state.heroIdx];
    state.playerHp = hero.maxHp;
    state.playerMp = 0; // Начинаем с 0 маны (копим)
    state.weapons = (hero.set === 'mage') ? MAGE_WEAPONS : WARRIOR_WEAPONS;
    state.weaponLevel = 0;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;
    state.totalTurns = 0;
    state.stats = { kills: 0, gold: 0, floors: 0 };
    state.tempAtk = 0; state.tempDef = 0; state.permanentShield = 0;
    
    state.spellLightning = 0;
    state.spellHeal = 0;
    state.spellStun = 0;
    state.spellHurricane = 0;

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

document.getElementById('set-vol-master').addEventListener('input', (e) => setVolume('master', e.target.value));
document.getElementById('set-vol-music').addEventListener('input', (e) => setVolume('music', e.target.value));
document.getElementById('set-vol-ambient').addEventListener('input', (e) => setVolume('ambient', e.target.value));
document.getElementById('set-vol-sfx').addEventListener('input', (e) => setVolume('sfx', e.target.value));

document.getElementById('set-monster-add').addEventListener('input', (e) => { state.settings.monsterAdd = parseInt(e.target.value); });
document.getElementById('set-item-rate').addEventListener('input', (e) => { state.settings.itemRate = parseInt(e.target.value); });

generateRandomName();