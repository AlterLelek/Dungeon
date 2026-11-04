// games/dungeon28/main.js
import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer, fight } from './game.js';
import { HEROES, WARRIOR_WEAPONS } from './config.js';
import { playSound, getAudio, startMusic, stopMusic, setVolume, toggleMusic } from '../../shared/audio.js';

// DOM Элементы
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

const canvas = document.createElement('canvas');
canvas.width = 320; canvas.height = 320;
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

// HUD Элементы
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

function updateHUD() {
  hudHp.innerText = state.playerHp;
  hudShd.innerText = state.permanentShield + state.tempDef;
  hudBonus.innerText = state.weapons[state.weaponLevel].dmg + state.tempAtk;
  hudFloor.innerText = state.currentFloor;
  hudTurns.innerText = state.totalTurns;
  hudScore.innerText = state.goldCount;
  hudEnergy.innerText = state.energy;
  
  const w = state.weapons[state.weaponLevel];
  hudWeapon.innerHTML = `⚔️ <span class="${w.css}">${w.name}</span> · ${w.dmg}`;

  hudECount.innerText = state.monsters.length;
  let eHtml = "";
  state.monsters.slice(0, 6).forEach(m => {
    const icon = m.behavior === 'flee' ? '🏃' : '🎯';
    eHtml += `<div>${m.type}${icon} ❤️${m.hp} 💪${m.atk} 🛡️${m.def}</div>`;
  });
  if (state.monsters.length > 6) eHtml += `<div style="color:#9ca3af;">… ещё ${state.monsters.length - 6}</div>`;
  hudEList.innerHTML = eHtml;
}

function gameLoop() {
  if (state.gameActive) {
    const speed = 0.25;
    if (Math.abs(state.player.px - state.player.x) > 0.5) state.player.px += (state.player.x - state.player.px) * speed; else state.player.px = state.player.x;
    if (Math.abs(state.player.py - state.player.y) > 0.5) state.player.py += (state.player.y - state.player.py) * speed; else state.player.py = state.player.y;
    
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
    getAudio(); startMusic();
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    const btnRow = document.getElementById('btn-row');
    gameScreen.insertBefore(canvas, btnRow.nextSibling);
    
    localStorage.setItem('pz_heroName', name);
    
    state.playerHp = 100;
    state.heroIdx = 0; 
    state.weapons = WARRIOR_WEAPONS;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;
    state.totalTurns = 0;

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
      else if (key === 'm' || key === 'ь') document.getElementById('shop-panel').style.display = 'block';
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
}

// Обработчики кнопок
btnGuest.addEventListener('click', () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = "";
    playSound('menu');
    startGame(name);
});

document.getElementById('btn-google').addEventListener('click', () => { errorMsg.innerText = "Google отключен."; });
document.getElementById('shop-btn').addEventListener('click', () => { playSound('menu'); document.getElementById('shop-panel').style.display = 'block'; });
document.getElementById('records-btn').addEventListener('click', () => { playSound('menu'); document.getElementById('records-panel').style.display = 'block'; });
document.getElementById('settings-btn').addEventListener('click', () => { playSound('menu'); document.getElementById('settings-panel').style.display = 'block'; });

document.getElementById('close-shop').addEventListener('click', () => document.getElementById('shop-panel').style.display = 'none');
document.getElementById('close-records').addEventListener('click', () => document.getElementById('records-panel').style.display = 'none');
document.getElementById('close-settings').addEventListener('click', () => document.getElementById('settings-panel').style.display = 'none');

// Настройки
document.getElementById('set-vol').addEventListener('input', (e) => setVolume(e.target.value));
document.getElementById('set-music').addEventListener('change', (e) => toggleMusic(e.target.checked));