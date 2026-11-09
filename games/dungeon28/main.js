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
if (state.highScore.turns > 0) {
    document.getElementById('high-score-line').innerText = `🏆 ${state.highScore.turns} х.`;
} else {
    document.getElementById('high-score-line').innerText = '';
}

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
            div.onclick = () => {
                state.heroIdx = idx;
                renderCarousel();
                playSound('menu');
            };
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

function saveSettings() { localStorage.setItem('pz_settings', JSON.stringify(state.settings)); }
function loadSettings() {
    try {
        const raw = localStorage.getItem('pz_settings');
        if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch(e) {}

    // Защита от null, так как некоторые элементы могли быть удалены из HTML
    const elFloors = document.getElementById('set-floors');
    if (elFloors) { elFloors.value = state.settings.floors; document.getElementById('set-floors-v').innerText = state.settings.floors; document.getElementById('floor-max').innerText = state.settings.floors; }
    
    const elMonst = document.getElementById('set-monst-add');
    if (elMonst) { elMonst.value = state.settings.monsterAdd; document.getElementById('set-monst-add-v').innerText = '+' + state.settings.monsterAdd; }
    
    const elItem = document.getElementById('set-item-rate');
    if (elItem) { elItem.value = state.settings.itemRate; document.getElementById('set-item-rate-v').innerText = state.settings.itemRate; }
    
    const elShield = document.getElementById('set-shield-val');
    if (elShield) { elShield.value = state.settings.shieldVal; document.getElementById('set-shield-val-v').innerText = state.settings.shieldVal; }
    
    const elStar = document.getElementById('set-star-val');
    if (elStar) { elStar.value = state.settings.starVal; document.getElementById('set-star-val-v').innerText = state.settings.starVal; }
    
    const elVibro = document.getElementById('set-vibro');
    if (elVibro) { elVibro.checked = state.settings.vibro; }
    
    const elVibroPow = document.getElementById('set-vibro-power');
    if (elVibroPow) { elVibroPow.value = state.settings.vibroPower; document.getElementById('set-vibro-power-v').innerText = state.settings.vibroPower + '%'; }
    
    const elBonusRes = document.getElementById('set-bonus-reset');
    if (elBonusRes) { elBonusRes.checked = state.settings.bonusReset; }
    
    const elCrit = document.getElementById('diff-critical');
    if (elCrit) { elCrit.checked = state.settings.criticalAI; }
    
    const elSimple = document.getElementById('diff-simple');
    if (elSimple) { elSimple.checked = state.settings.difficulty === 'simple'; }
    
    const elExtreme = document.getElementById('diff-extreme');
    if (elExtreme) { elExtreme.checked = state.settings.difficulty === 'extreme'; }
    
    const elHorror = document.getElementById('diff-horror');
    if (elHorror) { elHorror.checked = state.settings.difficulty === 'horror'; }
}
loadSettings();

// ИСПРАВЛЕНИЕ ЗВУКА (делим на 100)
document.getElementById('set-sfx').addEventListener('input', (e) => { const v = parseInt(e.target.value); document.getElementById('set-sfx-v').innerText = v + '%'; setVolume('sfx', v / 100); });
document.getElementById('set-amb').addEventListener('input', (e) => { const v = parseInt(e.target.value); document.getElementById('set-amb-v').innerText = v + '%'; setVolume('ambient', v / 100); });
document.getElementById('set-mel').addEventListener('input', (e) => { const v = parseInt(e.target.value); document.getElementById('set-mel-v').innerText = v + '%'; setVolume('music', v / 100); });
document.getElementById('set-tempo').addEventListener('input', (e) => { const v = parseInt(e.target.value); document.getElementById('set-tempo-v').innerText = v; setVolume('tempo', v); });

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

const elFloors = document.getElementById('set-floors');
if (elFloors) elFloors.addEventListener('input', (e) => { state.settings.floors = parseInt(e.target.value); document.getElementById('set-floors-v').innerText = state.settings.floors; document.getElementById('floor-max').innerText = state.settings.floors; saveSettings(); });
const elMonst = document.getElementById('set-monst-add');
if (elMonst) elMonst.addEventListener('input', (e) => { state.settings.monsterAdd = parseInt(e.target.value); document.getElementById('set-monst-add-v').innerText = '+' + state.settings.monsterAdd; saveSettings(); });
const elItem = document.getElementById('set-item-rate');
if (elItem) elItem.addEventListener('input', (e) => { state.settings.itemRate = parseInt(e.target.value); document.getElementById('set-item-rate-v').innerText = state.settings.itemRate; saveSettings(); });
const elShield = document.getElementById('set-shield-val');
if (elShield) elShield.addEventListener('input', (e) => { state.settings.shieldVal = parseInt(e.target.value); document.getElementById('set-shield-val-v').innerText = state.settings.shieldVal; saveSettings(); });
const elStar = document.getElementById('set-star-val');
if (elStar) elStar.addEventListener('input', (e) => { state.settings.starVal = parseInt(e.target.value); document.getElementById('set-star-val-v').innerText = state.settings.starVal; saveSettings(); });
const elVibro = document.getElementById('set-vibro');
if (elVibro) elVibro.addEventListener('change', (e) => { state.settings.vibro = e.target.checked; saveSettings(); });
const elVibroPow = document.getElementById('set-vibro-power');
if (elVibroPow) elVibroPow.addEventListener('input', (e) => { state.settings.vibroPower = parseInt(e.target.value); document.getElementById('set-vibro-power-v').innerText = state.settings.vibroPower + '%'; saveSettings(); });
const elBonusRes = document.getElementById('set-bonus-reset');
if (elBonusRes) elBonusRes.addEventListener('change', (e) => { state.settings.bonusReset = e.target.checked; saveSettings(); });
const elCrit = document.getElementById('diff-critical');
if (elCrit) elCrit.addEventListener('change', (e) => { state.settings.criticalAI = e.target.checked; saveSettings(); });
const elSimple = document.getElementById('diff-simple');
if (elSimple) elSimple.addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'simple'; saveSettings(); } else e.target.checked = true; });
const elExtreme = document.getElementById('diff-extreme');
if (elExtreme) elExtreme.addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'extreme'; saveSettings(); } else e.target.checked = true; });
const elHorror = document.getElementById('diff-horror');
if (elHorror) elHorror.addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'horror'; saveSettings(); } else e.target.checked = true; });
document.getElementById('btn-reset-settings').addEventListener('click', () => { if (confirm("Сбросить все настройки?")) { localStorage.removeItem('pz_settings'); location.reload(); } });

// DEV ПАНЕЛЬ В АККОРДЕОНАХ С ВЫПАДАЮЩИМИ СПИСКАМИ
const INTERESTS = ["-", "Герой", "Герои", "Атака", "Мана", "Защита", "Бонусы", "Трупы", "Сердца"];
const SPECIALS = ["-", "Вампиризм", "Высасывание маны", "Деление 1/3", "Замедление", "Съедание бонусов", "Яд", "Толстая защита", "Регенерация", "Поднятие", "Стрельба 2 + Вампиризм"];

function renderDevPanel() {
    const devHeroesContainer = document.getElementById('dev-heroes');
    devHeroesContainer.innerHTML = '';
    HEROES.forEach((h, i) => {
        const details = document.createElement('details');
        details.innerHTML = `<summary>${h.emoji} ${h.name}</summary>`;
        const fields = ['maxHp', 'maxMp', 'attackRange', 'lightRange'];
        fields.forEach(f => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            div.innerHTML = `<span>${f}:</span> <input type="number" id="dev-hero-${i}-${f}" value="${h[f] || 1}">`;
            details.appendChild(div);
            div.querySelector('input').addEventListener('change', (e) => { state.devSettings.heroes[i][f] = parseInt(e.target.value); });
        });
        devHeroesContainer.appendChild(details);
    });

    const devMonstersContainer = document.getElementById('dev-monsters');
    devMonstersContainer.innerHTML = '';
    Object.keys(ENEMY_BASE).forEach((type, i) => {
        const m = ENEMY_BASE[type];
        const details = document.createElement('details');
        details.innerHTML = `<summary>${type} ${ENEMY_NAMES[type] || ''}</summary>`;
        
        ['hp', 'atk', 'def', 'speed'].forEach(f => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            div.innerHTML = `<span>${f}:</span> <input type="number" id="dev-mon-${i}-${f}" value="${m[f] || 1}">`;
            details.appendChild(div);
            div.querySelector('input').addEventListener('change', (e) => {
                state.devSettings.monsters[type][f] = parseInt(e.target.value);
            });
        });
        
        const createSelect = (field, optionsArray) => {
            const div = document.createElement('div'); div.className = 'dev-stat';
            const select = document.createElement('select');
            optionsArray.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt; o.innerText = opt;
                if (opt === m[field]) o.selected = true;
                select.appendChild(o);
            });
            div.innerHTML = `<span>${field}:</span> `;
            div.appendChild(select);
            details.appendChild(div);
            select.addEventListener('change', (e) => {
                state.devSettings.monsters[type][field] = e.target.value;
            });
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
const btnAbility = document.getElementById('ability-btn');

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

  const mpCostLight = Math.max(0, 3 - state.spellDiscount);
  const mpCostHeal = Math.max(0, 3 - state.spellDiscount);
  const mpCostStun = Math.max(0, 2 - state.spellDiscount);
  const mpCostHurr = Math.max(0, 4 - state.spellDiscount);

  btnLight.disabled = state.playerMp < mpCostLight && state.spellLightning <= 0;
  btnLight.innerHTML = `⚡ Молния<br><span>${mpCostLight} MP | x${state.spellLightning}</span>`;
  btnHeal.disabled = state.playerMp < mpCostHeal && state.spellHeal <= 0;
  btnHeal.innerHTML = `💚 Лечение<br><span>${mpCostHeal} MP | x${state.spellHeal}</span>`;
  btnStun.disabled = state.playerMp < mpCostStun && state.spellStun <= 0;
  btnStun.innerHTML = `❄️ Стан<br><span>${mpCostStun} MP | x${state.spellStun}</span>`;
  btnHurricane.disabled = state.playerMp < mpCostHurr && state.spellHurricane <= 0;
  btnHurricane.innerHTML = `🌪️ Ураган<br><span>${mpCostHurr} MP | x${state.spellHurricane}</span>`;

  if (state.abilityCooldown > 0) {
    btnAbility.disabled = true;
    btnAbility.innerText = `⏳ ${state.abilityCooldown}`;
  } else if (state.abilityTurns > 0) {
    btnAbility.disabled = true;
    btnAbility.innerText = `✨ ${state.abilityTurns} ход.`;
  } else {
    btnAbility.disabled = false;
    btnAbility.innerText = `✨ Умение`;
  }

  hudECount.innerText = state.monsters.length;
  let eHtml = "";
  state.monsters.slice(0, 6).forEach(m => { eHtml += `<div>${m.type} ❤️${m.hp} 💪${m.atk} 🛡️${m.def}</div>`; });
  if (state.monsters.length > 6) eHtml += `<div style="color:#9ca3af;">… +${state.monsters.length - 6}</div>`;
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
    startAmbient(); 
    startMusic('cave');   
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    const magicRow = document.querySelector('.magic-row');
    gameScreen.insertBefore(canvas, magicRow.nextSibling);
    
    localStorage.setItem('pz_heroName', name);
    
    const hero = state.devSettings.heroes[state.heroIdx];
    state.playerHp = hero.maxHp;
    state.playerMp = 0; 
    state.weapons = getWeaponsBySet(hero.set);
    state.weaponLevel = 0;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;
    state.totalTurns = 0;
    state.stats = { kills: 0, gold: 0, floors: 0 };
    state.tempAtk = 0; state.tempDef = 0; state.permanentShield = 0;
    
    state.spellLightning = 0; state.spellHeal = 0; state.spellStun = 0; state.spellHurricane = 0;
    
    state.abilityCooldown = 0; state.abilityTurns = 0; state.heroAttackRange = hero.attackRange;
    state.spellDiscount = 0; state.poisonTurns = 0; state.poisonDmg = 0;
    state.playerSlowTurns = 0; state.skeletonAlly = null;

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
      
      else if (key === '`' || key === 'ё' || key === '~') { activateAbility(); updateHUD(); }
      
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
document.getElementById('ability-btn').addEventListener('click', () => { activateAbility(); updateHUD(); });

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