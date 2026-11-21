import { state } from './state.js';
import { initFloor, rollCaveTint, getFloorStage } from './map.js';
import { draw, preloadSprites, getActiveEffects } from './ui.js'; 
import { movePlayer, skipTurn, castLightning, castHeal, castStun, castHurricane, activateAbility, setGameEndHandler } from './game.js';
import { HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS, ARCHER_WEAPONS, VERSION, ENEMY_TYPES, ENEMY_NAMES, ENEMY_BASE, DEATH_CAUSES, CELL, WORLD } from './config.js';
import { playSound, initAudio, startMusic, startAmbient, setVolume, getVolume, getTrack, setTrack } from './audio.js'; 

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');
const btnRandomName = document.getElementById('btn-random-name');

const canvas = document.createElement('canvas');
canvas.width = WORLD; canvas.height = WORLD;
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

// ===== Статичные наложения на героя поверх карты (оружие слева, щит справа) =====
// Спрайты берём только из первого кадра D28; анимации кадров здесь нет.
const HERO_OVERLAY_ITEMS = 'assets/sprites/items/';
const heroOverlayImages = {};
function heroOverlayImage(src) {
    if (!src) return null;
    if (!heroOverlayImages[src]) {
        const img = new Image();
        img.src = src;
        heroOverlayImages[src] = img;
    }
    return heroOverlayImages[src];
}

function heroOverlayWeaponSprite(w) {
    // Из D28 берём только first-frame варианты: sword_0 / axe_0 / staff_0 / bow0_0 / bow1_0.
    const file = w && w.sprite ? String(w.sprite).split('/').pop().toLowerCase() : '';
    if (/^bow1/.test(file)) return HERO_OVERLAY_ITEMS + 'bow1_0.png';
    if (/^bow0/.test(file)) return HERO_OVERLAY_ITEMS + 'bow0_0.png';
    if (/^staff/.test(file)) return HERO_OVERLAY_ITEMS + 'staff_0.png';
    if (/^axe/.test(file)) return HERO_OVERLAY_ITEMS + 'axe_0.png';
    if (/^sword/.test(file)) return HERO_OVERLAY_ITEMS + 'sword_0.png';
    const name = ((w && w.name) || '').toLowerCase();
    if (/арбалет|bow1|crossbow/.test(name)) return HERO_OVERLAY_ITEMS + 'bow1_0.png';
    if (/лук|bow/.test(name)) return HERO_OVERLAY_ITEMS + 'bow0_0.png';
    if (/палоч|посох|staff|wand/.test(name)) return HERO_OVERLAY_ITEMS + 'staff_0.png';
    if (/топор|молот|axe|hammer|mace/.test(name)) return HERO_OVERLAY_ITEMS + 'axe_0.png';
    return HERO_OVERLAY_ITEMS + 'sword_0.png';
}

function heroOverlayArmor() { return (state.permanentShield || 0) + (state.tempDef || 0); }
// 0 — щита нет; 1 — четверть высоты; 30 — три четверти; больше — потолок 3/4.
function heroOverlayShieldFill(armor) {
    if (!(armor > 0)) return 0;
    return Math.min(0.75, 0.25 + ((Math.min(30, armor) - 1) * 0.5) / 29);
}

function drawProceduralHeroWeapon(c, x, y, size, sprite) {
    c.save();
    c.lineWidth = Math.max(1, size * 0.1);
    if (/bow/.test(sprite)) {
        c.strokeStyle = '#b45309';
        c.beginPath(); c.arc(x + size * 0.45, y + size / 2, size * 0.42, -1.1, 1.1); c.stroke();
        c.strokeStyle = '#e5e7eb';
        c.beginPath(); c.moveTo(x + size * 0.55, y + size * 0.12); c.lineTo(x + size * 0.55, y + size * 0.88); c.stroke();
    } else if (/staff/.test(sprite)) {
        c.strokeStyle = '#92400e';
        c.beginPath(); c.moveTo(x + size / 2, y + size * 0.9); c.lineTo(x + size / 2, y + size * 0.25); c.stroke();
        c.fillStyle = '#a855f7';
        c.beginPath(); c.arc(x + size / 2, y + size * 0.2, size * 0.16, 0, Math.PI * 2); c.fill();
    } else {
        c.strokeStyle = '#9ca3af';
        c.beginPath(); c.moveTo(x + size * 0.3, y + size * 0.85); c.lineTo(x + size * 0.7, y + size * 0.2); c.stroke();
        c.strokeStyle = '#fbbf24'; c.lineWidth = Math.max(1, size * 0.14);
        c.beginPath(); c.moveTo(x + size * 0.15, y + size * 0.9); c.lineTo(x + size * 0.4, y + size * 0.65); c.stroke();
    }
    c.restore();
}

function drawHeroWeaponOverlay(c, cellX, cellY) {
    const w = state.weapons && state.weapons[state.weaponLevel];
    const sprite = heroOverlayWeaponSprite(w);
    const img = heroOverlayImage(sprite);
    const size = 15;
    // левая нижняя четверть клетки: лицо героя (центр) не закрываем
    const x = cellX - 9, y = cellY + 12;
    if (img && img.complete && img.naturalWidth > 0) {
        try { c.drawImage(img, x, y, size, size); return; } catch (e) {}
    }
    drawProceduralHeroWeapon(c, x, y, size, sprite);
}

function drawProceduralHeroShield(c, x, y, w, h) {
    c.fillStyle = '#3b82f6'; c.strokeStyle = '#1e3a8a'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x + 1, y + 1); c.lineTo(x + w - 1, y + 1); c.lineTo(x + w - 1, y + h * 0.55);
    c.quadraticCurveTo(x + w / 2, y + h, x + w / 2, y + h);
    c.quadraticCurveTo(x + 1, y + h * 0.55, x + 1, y + h * 0.55);
    c.closePath(); c.fill(); c.stroke();
}

function drawHeroShieldOverlay(c, cellX, cellY) {
    const armor = heroOverlayArmor();
    const fill = heroOverlayShieldFill(armor);
    if (fill <= 0) return;
    const w = 14, h = 18;
    const x = cellX + 27, y = cellY + 9; // правая сторона, вне лица героя
    const img = heroOverlayImage(HERO_OVERLAY_ITEMS + 'shield.png');
    c.save();
    // высота видимой части растёт снизу вверх вместе с броней
    c.beginPath(); c.rect(x, y + h * (1 - fill), w, h * fill + 0.5); c.clip();
    if (img && img.complete && img.naturalWidth > 0) {
        try { c.drawImage(img, x, y, w, h); c.restore(); return; } catch (e) {}
    }
    drawProceduralHeroShield(c, x, y, w, h);
    c.restore();
}

function drawHeroOverlay(c) {
    if (!state.gameActive) return;
    const x = state.player.px, y = state.player.py;
    c.save();
    c.globalAlpha = 1;
    drawHeroWeaponOverlay(c, x, y);
    drawHeroShieldOverlay(c, x, y);
    c.restore();
}

window.__d28HeroOverlay = function () {
    const w = state.weapons && state.weapons[state.weaponLevel];
    const armor = heroOverlayArmor();
    return {
        weapon: w ? w.name : null,
        armor: armor,
        shieldFill: heroOverlayShieldFill(armor),
        weaponSide: 'left',
        shieldSide: 'right'
    };
};

// Поле 15×15 без D-pad. На телефоне окно просмотра --layout-size = 320px (10 клеток),
// на ПК — 480px (всё поле). Масштабируем по окну просмотра, а не по всему миру:
// так клетки на телефоне остаются крупными, а остальное поле доступно сдвигом.
function viewSize() {
    const root = document.documentElement;
    const v = parseFloat(getComputedStyle(root).getPropertyValue('--layout-size'));
    return Number.isFinite(v) && v > 0 ? v : WORLD;
}

let camX = 0, camY = 0;
let camFollowX = null, camFollowY = null, camManual = false;

function applyCamera() {
    const view = viewSize();
    const max = Math.max(0, WORLD - view);
    camX = Math.max(0, Math.min(max, camX));
    camY = Math.max(0, Math.min(max, camY));
    canvas.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// Следим за героем, пока игрок сам не сдвинул поле. После шага героя следим снова.
function centerCamera(force = false) {
    const view = viewSize();
    if (view >= WORLD) {
        if (camX !== 0 || camY !== 0) { camX = 0; camY = 0; applyCamera(); }
        camFollowX = camFollowY = null;
        return;
    }
    const px = state.player.px, py = state.player.py;
    if (!force && camManual && px === camFollowX && py === camFollowY) return;
    camX = px + CELL / 2 - view / 2;
    camY = py + CELL / 2 - view / 2;
    camFollowX = px; camFollowY = py;
    camManual = false;
    applyCamera();
}

function fitGameScreen() {
    const layout = viewSize();
    // В горизонтали телефона и на узком экране подсказки скрыты — окно ниже
    const compact = window.innerHeight <= 520 || window.innerWidth <= 480;
    const contentHeight = layout + (compact ? 245 : 260); // HUD + кнопки + магия + подсказки
    const scale = Math.min(
        window.innerWidth / (layout + 10),
        window.innerHeight / contentHeight,
        compact ? 1.6 : 2.5
    );
    document.documentElement.style.setProperty('--game-scale', Math.max(0.4, scale).toFixed(3));
    centerCamera(true);
}
window.addEventListener('resize', fitGameScreen);
fitGameScreen();

// Цветная подсветка краёв поля при заклинании
let flashTimer = null;
function flashField(color) {
    const el = document.getElementById('magic-flash');
    if (!el) return;
    el.style.setProperty('--flash-color', color);
    el.classList.remove('active');
    void el.offsetWidth; // перезапуск анимации
    el.classList.add('active');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('active'), 320);
}

document.getElementById('ver-login').innerText = VERSION;
document.getElementById('ver-game').innerText = VERSION;

// Рекорды: по одному на режим + герой, с именем игрока
try {
    const saved = JSON.parse(localStorage.getItem('pz_records_v2'));
    if (saved) state.records = saved;
    else {
        const old = JSON.parse(localStorage.getItem('pz_highscore'));
        if (old) state.records['chase_5|' + HEROES[0].name] = { turns: old.turns, name: old.name, hero: HEROES[0].name, mode: 'chase_5', kills: 0, gold: 0, floor: 1 };
    }
} catch (e) {}

// Рекорды смертей: по всем монстрам и отдельно по магии (яд)
try {
    const savedDeaths = JSON.parse(localStorage.getItem('pz_death_causes'));
    if (savedDeaths) state.deathCauses = savedDeaths;
} catch (e) {}

function recordKey() { return state.gameMode + '|' + HEROES[state.heroIdx].name; }
function syncCurrentRecord() {
    state.highScore = state.records[recordKey()] || { turns: 0, name: 'Никто' };
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
        const heroSprite = h.skins ? h.skins[0] : null; 
        
        const div = document.createElement('div');
        div.className = `hero-card ${offset === 0 ? 'center' : 'side'}`;
        
        let imgHTML = heroSprite ? `<img src="${heroSprite}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none'; this.parentElement.innerText='${h.emoji}';">` : h.emoji;
        div.innerHTML = `<div class="c-emoji">${imgHTML}</div><div class="c-name">${h.name}</div>`;
        
        if (offset !== 0) {
            div.onclick = () => { state.heroIdx = idx; renderCarousel(); playSound('menu'); };
        }
        container.appendChild(div);
    }
    
    const h = HEROES[state.heroIdx];
    const w = getWeaponsBySet(h.set)[0];
    
    document.getElementById('hero-desc').innerHTML = `
        ❤️ ${h.maxHp} HP &nbsp;|&nbsp; ⚡ ${h.maxMp} MP &nbsp;|&nbsp; ⚔️ Урон: ${w.dmg}
    `;
}

document.getElementById('prev-hero').onclick = () => { state.heroIdx = (state.heroIdx - 1 + HEROES.length) % HEROES.length; renderCarousel(); playSound('menu'); };
document.getElementById('next-hero').onclick = () => { state.heroIdx = (state.heroIdx + 1) % HEROES.length; renderCarousel(); playSound('menu'); };
renderCarousel();

setGameEndHandler(() => {
  gameScreen.style.display = 'none';
  loginScreen.style.display = 'flex';
  ['shop-panel', 'records-panel', 'settings-panel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  renderCarousel();
});

const GAME_MODES = [
    { id: 'chase_5', name: 'Погоня (1-5)', short: 'Погоня', icon: '🏃' },
    { id: 'def_5', name: 'Защита (1-5)', short: 'Защита', icon: '🛡️' },
    { id: 'def_inf', name: 'Защита (Безлимит)', short: 'Безлимит', icon: '♾️' },
    { id: 'wave_5', name: 'Волны монстров (1-5)', short: 'Волны', icon: '🌊' },
    { id: 'wave_inf', name: 'Волны монстров (Безлимит)', short: 'Волны ∞', icon: '🌊' }
];
let currentModeIdx = 0;

function renderMode() {
    const container = document.getElementById('mode-carousel');
    container.innerHTML = '';
    const total = GAME_MODES.length;

    for (let offset = -1; offset <= 1; offset++) {
        const idx = (currentModeIdx + offset + total) % total;
        const m = GAME_MODES[idx];
        const div = document.createElement('div');
        div.className = `mode-card ${offset === 0 ? 'center' : 'side'}`;
        div.innerHTML = `<span class="m-icon">${m.icon}</span><span class="m-name">${m.short}</span>`;
        if (offset !== 0) div.onclick = () => { currentModeIdx = idx; renderMode(); playSound('menu'); };
        container.appendChild(div);
    }

    document.getElementById('mode-desc').innerText = GAME_MODES[currentModeIdx].name;
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
    setVal('set-floors', state.settings.floors); document.getElementById('floor-max').innerText = '/' + state.settings.floors;
    setVal('set-monst-add', state.settings.monsterAdd);
    setVal('set-item-rate', state.settings.itemRate);
    setVal('set-shield-val', state.settings.shieldVal);
    setVal('set-star-val', state.settings.starVal);
    
    document.getElementById('set-vibro').checked = state.settings.vibro;
    document.getElementById('diff-critical').checked = state.settings.criticalAI;
    document.getElementById('diff-simple').checked = state.settings.difficulty === 'simple';
    document.getElementById('diff-extreme').checked = state.settings.difficulty === 'extreme';
    
    document.getElementById('set-keys-mode').value = state.settings.keysMode || 'all';
    document.getElementById('set-keys-layout').value = state.settings.keysLayout || 'both';

    document.getElementById('set-master').value = getVolume('master');
    document.getElementById('set-sfx').value = getVolume('sfx');
    document.getElementById('set-amb').value = getVolume('ambient');
    document.getElementById('set-mel').value = getVolume('music');
    document.getElementById('set-tempo').value = getVolume('tempo');
}
loadSettings();

const handleVol = (id, type) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
        let v = parseFloat(e.target.value);
        if (isNaN(v)) return; 
        setVolume(type, v);
    });
};
handleVol('set-master', 'master');
handleVol('set-sfx', 'sfx');
handleVol('set-amb', 'ambient');
handleVol('set-mel', 'music');

const elTempo = document.getElementById('set-tempo');
if (elTempo) {
    elTempo.addEventListener('input', (e) => {
        let v = parseInt(e.target.value);
        if (isNaN(v)) return;
        setVolume('tempo', v);
    });
}

function selectMelody(btnId, track) {
    document.querySelectorAll('.mel-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    setTrack(track);
    startMusic(track);
}
document.getElementById('mel-town').onclick = () => selectMelody('mel-town', 'town');
document.getElementById('mel-cave').onclick = () => selectMelody('mel-cave', 'sf2');
document.getElementById('mel-elven').onclick = () => selectMelody('mel-elven', 'elven');
document.getElementById('mel-dwarven').onclick = () => selectMelody('mel-dwarven', 'dwarven');
document.getElementById('mel-dice').onclick = () => selectMelody('mel-dice', 'dice');

// Восстанавливаем выбранную мелодию из сохранённых настроек
(function restoreMelody() {
    const saved = getTrack();
    const id = { town: 'mel-town', sf2: 'mel-cave', elven: 'mel-elven', dwarven: 'mel-dwarven', dice: 'mel-dice' }[saved] || 'mel-town';
    document.querySelectorAll('.mel-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
})();

document.getElementById('set-floors').addEventListener('change', (e) => { state.settings.floors = parseInt(e.target.value); document.getElementById('floor-max').innerText = '/' + state.settings.floors; saveSettings(); });
document.getElementById('set-monst-add').addEventListener('change', (e) => { state.settings.monsterAdd = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-item-rate').addEventListener('change', (e) => { state.settings.itemRate = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-shield-val').addEventListener('change', (e) => { state.settings.shieldVal = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-star-val').addEventListener('change', (e) => { state.settings.starVal = parseInt(e.target.value); saveSettings(); });
document.getElementById('set-vibro').addEventListener('change', (e) => { state.settings.vibro = e.target.checked; saveSettings(); });
document.getElementById('diff-critical').addEventListener('change', (e) => { state.settings.criticalAI = e.target.checked; saveSettings(); });
document.getElementById('diff-simple').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'simple'; saveSettings(); } else e.target.checked = true; });
document.getElementById('diff-extreme').addEventListener('change', (e) => { if (e.target.checked) { state.settings.difficulty = 'extreme'; saveSettings(); } else e.target.checked = true; });

document.getElementById('set-keys-mode').addEventListener('change', (e) => { state.settings.keysMode = e.target.value; saveSettings(); });
document.getElementById('set-keys-layout').addEventListener('change', (e) => { state.settings.keysLayout = e.target.value; saveSettings(); });
document.getElementById('btn-reset-settings').addEventListener('click', () => { if (confirm("Сбросить?")) { localStorage.removeItem('pz_settings'); location.reload(); } });

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

function getMonsterStatus(m) {
    if (m.isStunned) return '❄️';
    if (m.actionState === 1) return '🌀';
    if (m.actionState === 2) return '💤';
    if (m.slowTurns > 0) return '🕸️';
    if (m.type === "😈" && m.hp < m.maxHp) return '💚';
    if (m.type === "🏹" || m.type === "🦹") return '🏹';
    if (m.type === "🧙‍♂️") return '🪄';
    if (m.type === "👺") return '🍽️';
    if (m.type === "🕷") return '🕸️';
    if (m.type === "🧟") return '🤢';
    if (m.type === "💀") return '🩸';
    if (m.type === "👻") return '💧';
    if (m.type === "🐢") return '🛡️';
    return '🚶';
}

function updateHUD() {
  centerCamera();
  document.getElementById('hp').innerText = state.playerHp;
  document.getElementById('shd-hud').innerText = state.permanentShield + state.tempDef;
  document.getElementById('bonus').innerText = state.weapons[state.weaponLevel].dmg + state.tempAtk;
  document.getElementById('floor-hud').innerText = state.currentFloor;
  const floorIcon = document.getElementById('floor-icon');
  if (floorIcon) {
      const stage = getFloorStage();
      floorIcon.innerText = ['🕳️', '🧱', '🏰', '🗼', '🌤️'][stage];
      floorIcon.title = ['Подвал', 'Каменный коридор', 'Крепость', 'Башня', 'Верх башни'][stage];
  }
  
  const floorMaxEl = document.getElementById('floor-max');
  if (state.gameMode.includes('inf')) {
      floorMaxEl.style.display = 'none';
  } else {
      floorMaxEl.style.display = 'inline';
      floorMaxEl.innerText = '/' + state.settings.floors;
  }

  document.getElementById('turns').innerText = state.totalTurns;
  document.getElementById('score').innerText = state.goldCount;
  document.getElementById('energy').innerText = state.playerMp;
  document.getElementById('hero-name-label').innerText = localStorage.getItem('pz_heroName').toUpperCase();
  
  const figEl = document.getElementById('hero-fig');
  const heroSprite = HEROES[state.heroIdx].skins ? HEROES[state.heroIdx].skins[0] : null;
  
  if (figEl.dataset.lastSprite !== heroSprite) {
      figEl.dataset.lastSprite = heroSprite;
      const emoji = HEROES[state.heroIdx].emoji;
      if (heroSprite) {
          figEl.innerHTML = `<span class="hero-emoji">${emoji}</span><img src="${heroSprite}" alt="" onerror="this.remove();" onload="this.style.display='block'; this.previousElementSibling.style.display='none';">`;
      } else {
          figEl.innerHTML = `<span class="hero-emoji">${emoji}</span>`;
      }
  }

  const fxEl = document.getElementById('hero-fx');
  if (fxEl) {
      const fx = getActiveEffects();
      fxEl.innerHTML = fx.length
          ? `<span class="fx-mark" title="${fx.map(e => e.name).join(', ')}">!</span>`
          : '';
  }

  const coinEl = document.getElementById('coin-hud');
  if (coinEl && !coinEl.innerHTML.includes('img')) {
      coinEl.innerHTML = `<img src="assets/sprites/ui/coin.png" style="width:14px;height:14px;object-fit:contain;" onerror="this.style.display='none'; this.parentElement.innerText='🪙';">`;
  }
  
  const w = state.weapons[state.weaponLevel];
  document.getElementById('w-dmg').innerText = w.dmg;
  document.getElementById('w-name').innerText = w.name;
  document.getElementById('w-dmg').className = w.css; 
  document.getElementById('w-name').className = 'w-name ' + w.css;

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
      const status = getMonsterStatus(m);
      eHtml += `<div class="enemy-row">
        <span class="e-type">${status} ${m.type}</span>
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
    const PLAYER_DUR = 220; const MON_DUR = 150; // ×2 быстрее; у монстров своя длительность шага
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
            let t = (now - m.moveStartTime) / (m.moveDur || MON_DUR);
            if (t >= 1) t = 1;
            let ease = easeInOutQuad(t);
            m.px = m.startPx + (m.x - m.startPx) * ease;
            m.py = m.startPy + (m.y - m.startPy) * ease;
            if (t >= 1) m.isMoving = false;
        } else { m.px = m.x; m.py = m.y; }
    });
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i]; f.y += f.vy; f.life -= 0.035;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    Object.keys(state.elementFx).forEach(k => {
      if (state.elementFx[k] > 0) state.elementFx[k] = Math.max(0, state.elementFx[k] - 0.02);
    });
    draw(ctx, bgCanvas); drawHeroOverlay(ctx); updateHUD();
  }
  requestAnimationFrame(gameLoop);
}

function startGame(name) {
    initAudio(); startAmbient(); startMusic(getTrack());
    loginScreen.style.display = 'none'; gameScreen.style.display = 'flex';
    const canvasWrapper = document.getElementById('canvas-wrapper');
    canvasWrapper.insertBefore(canvas, canvasWrapper.firstChild);
    localStorage.setItem('pz_heroName', name);
    
    const hero = state.devSettings.heroes[state.heroIdx];
    state.playerHp = hero.maxHp; state.playerMp = 0; 
    state.weapons = getWeaponsBySet(hero.set); state.weaponLevel = 0;
    state.currentFloor = 1; state.gameActive = true;
    state.goldCount = 0; state.totalTurns = 0; state.stats = { kills: 0, gold: 0, floors: 0 };
    state.itemSpawnProgress = 0; state.lastDamageSource = null;
    state.tempAtk = 0; state.tempDef = 0; state.permanentShield = 0;
    state.spellLightning = 0; state.spellHeal = 0; state.spellStun = 0; state.spellHurricane = 0;
    state.abilityCooldown = 0; state.abilityTurns = 0; state.heroAttackRange = hero.attackRange;
    state.spellDiscount = 0; state.poisonTurns = 0; state.poisonDmg = 0;
    state.playerSlowTurns = 0; state.skeletonAlly = null;
    state.angelCooldown = 0; state.isProcessingTurn = false;
    Object.keys(state.elementFx).forEach(k => state.elementFx[k] = 0);
    rollCaveTint();
    syncCurrentRecord();

    bgCanvas = initFloor(); centerCamera(true); updateHUD();
    if (!gameLoopStarted) { gameLoopStarted = true; requestAnimationFrame(gameLoop); }

    ['shop-panel', 'records-panel', 'settings-panel'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['shop-panel', 'records-panel', 'settings-panel'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    return;
  }
  if (!state.gameActive || state.isProcessingTurn) return;

  const key = e.key.toLowerCase();
  const mode = state.settings.keysMode || 'all';

  if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowUp') || ((mode === 'all' || mode === 'wasd') && (key === 'w' || key === 'ц'))) movePlayer(0, -CELL);
  else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowDown') || ((mode === 'all' || mode === 'wasd') && (key === 's' || key === 'ы'))) movePlayer(0, CELL);
  else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowLeft') || ((mode === 'all' || mode === 'wasd') && (key === 'a' || key === 'ф'))) movePlayer(-CELL, 0);
  else if (((mode === 'all' || mode === 'arrows') && e.key === 'ArrowRight') || ((mode === 'all' || mode === 'wasd') && (key === 'd' || key === 'в'))) movePlayer(CELL, 0);

  else if (key === '1' || key === 'z' || key === 'я') { if (castLightning()) flashField('#fbbf24'); updateHUD(); }
  else if (key === '2' || key === 'x' || key === 'ч') { if (castHeal()) flashField('#22c55e'); updateHUD(); }
  else if (key === '3' || key === 'c' || key === 'с') { if (castStun()) flashField('#38bdf8'); updateHUD(); }
  else if (key === '4' || key === 'v' || key === 'м') { if (castHurricane()) flashField('#a855f7'); updateHUD(); }
  else if (key === '`' || key === 'ё' || key === '~') { if (activateAbility()) flashField('#fbbf24'); updateHUD(); }
  else if (e.key === ' ') { e.preventDefault(); skipTurn(); }
  else if (key === 'm' || key === 'ь') { document.getElementById('shop-panel').style.display = 'block'; updateShop(); }

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
});

window.movePlayer = movePlayer;
window.skipTurn = skipTurn;

// Подставляем имя прошлой игры и упрощаем ввод
try {
    const lastName = localStorage.getItem('pz_heroName');
    if (lastName) guestNameInput.value = lastName;
} catch (e) {}

guestNameInput.addEventListener('input', () => { errorMsg.innerText = ''; });
guestNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); btnGuest.click(); }
});

btnRandomName.onclick = () => { playSound('menu'); generateRandomName(); errorMsg.innerText = ''; };
btnGuest.onclick = () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = ""; playSound('menu'); startGame(name);
};
document.getElementById('btn-google').onclick = () => { errorMsg.innerText = "Google отключен."; };
document.getElementById('btn-light').onclick = () => { if (castLightning()) flashField('#fbbf24'); updateHUD(); };
document.getElementById('btn-heal').onclick = () => { if (castHeal()) flashField('#22c55e'); updateHUD(); };
document.getElementById('btn-stun').onclick = () => { if (castStun()) flashField('#38bdf8'); updateHUD(); };
document.getElementById('btn-hurricane').onclick = () => { if (castHurricane()) flashField('#a855f7'); updateHUD(); };
document.getElementById('ability-btn').onclick = () => { if (activateAbility()) flashField('#fbbf24'); updateHUD(); };

// Управление по направлению: клик/тап в любом месте поля задаёт направление шага.
// Неважно, рядом клетка или в другом конце поля — герой делает один шаг в эту сторону.
// Клик по герою (или по его клетке) — пропуск хода.
function pointerToWorld(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - r.left) / r.width * canvas.width,
        y: (e.clientY - r.top) / r.height * canvas.height
    };
}

function stepTowards(e) {
    if (!state.gameActive || state.isProcessingTurn) return;
    const p = pointerToWorld(e);
    const hx = state.player.px + CELL / 2, hy = state.player.py + CELL / 2;
    const dx = p.x - hx, dy = p.y - hy;

    if (Math.abs(dx) < CELL / 2 && Math.abs(dy) < CELL / 2) { skipTurn(); return; }
    if (Math.abs(dx) >= Math.abs(dy)) movePlayer(dx > 0 ? CELL : -CELL, 0);
    else movePlayer(0, dy > 0 ? CELL : -CELL);
}

// Перетаскивание поля сдвигает камеру (на телефоне видно 10×10 клеток).
let panStart = null, didPan = false, suppressClick = false;
canvas.addEventListener('pointerdown', (e) => {
    if (!state.gameActive) return;
    panStart = { x: e.clientX, y: e.clientY, camX, camY };
    didPan = false;
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
});
canvas.addEventListener('pointermove', (e) => {
    if (!panStart) return;
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale')) || 1;
    const dx = (e.clientX - panStart.x) / scale;
    const dy = (e.clientY - panStart.y) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 6) didPan = true;
    if (didPan) {
        camX = panStart.camX - dx;
        camY = panStart.camY - dy;
        camManual = true;
        applyCamera();
    }
});
canvas.addEventListener('pointerup', (e) => {
    if (!panStart) return;
    panStart = null;
    suppressClick = didPan;
    if (!didPan) stepTowards(e);
});
canvas.addEventListener('pointercancel', () => { panStart = null; suppressClick = didPan; });
canvas.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    // Для синтетических кликов без pointer-событий работаем как обычный тап.
    if (e.detail === 0) stepTowards(e);
});

document.getElementById('shop-btn').onclick = () => { playSound('menu'); document.getElementById('shop-panel').style.display = 'block'; updateShop(); };
document.getElementById('close-shop').onclick = () => document.getElementById('shop-panel').style.display = 'none';
document.getElementById('shop-wpn-btn').onclick = () => buyOption('weapon');
document.getElementById('shop-shd-btn').onclick = () => buyOption('shield');
document.getElementById('records-btn').onclick = () => { 
  playSound('menu'); document.getElementById('records-panel').style.display = 'block'; 
  const list = document.getElementById('rec-list');
  const entries = Object.values(state.records).sort((a, b) => b.turns - a.turns);
  let html = '';
  if (entries.length === 0) {
      html += '<div style="color:#9ca3af; text-align:center; padding:8px;">Рекордов пока нет</div>';
  } else {
      html += entries.map(r => {
        const mode = GAME_MODES.find(m => m.id === r.mode)?.short || r.mode || '';
        return `<div class="record-row">
          <span class="rec-hero">${HEROES.find(h => h.name === r.hero)?.emoji || '🎮'} ${r.hero}</span>
          <span class="rec-name">${r.name || 'Никто'}</span>
          <span class="rec-turns">${r.turns} ход.</span>
          <span class="rec-detail">${mode}${r.win ? ' · победа' : ''}</span>
        </div>`;
      }).join('');
  }

  const plural = n => {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'раз';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'раза';
    return 'раз';
  };
  html += '<div class="rec-subtitle">💀 Причины смерти</div>';
  html += DEATH_CAUSES.map(c => {
    const n = state.deathCauses[c.key] || 0;
    return `<div class="record-row death-row${n ? '' : ' death-zero'}">
      <span class="rec-hero">${c.icon} ${c.label}</span>
      <span class="rec-turns">${n} ${plural(n)}</span>
    </div>`;
  }).join('');
  list.innerHTML = html;
};
document.getElementById('close-records').onclick = () => document.getElementById('records-panel').style.display = 'none';
document.getElementById('settings-btn').onclick = () => { playSound('menu'); document.getElementById('settings-panel').style.display = 'block'; };
document.getElementById('close-settings').onclick = () => document.getElementById('settings-panel').style.display = 'none';

generateRandomName();
preloadSprites(); 