// games/dungeon28/main.js
import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer } from './game.js';
import { WARRIOR_WEAPONS } from './config.js';
import { playSound, getAudio } from '../../shared/audio.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

const canvas = document.createElement('canvas');
canvas.width = 320; 
canvas.height = 320;
canvas.style.border = "3px solid #4f46e5";
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

// Переменные для HUD
let hudHp, hudGold, hudFloor;

// Создание HUD на лету
function createHUD() {
  const hud = document.createElement('div');
  hud.style.cssText = "display: flex; justify-content: space-between; width: 326px; color: #fff; font-weight: bold; font-size: 16px; padding: 10px; box-sizing: border-box; background: rgba(0,0,0,0.3); border-radius: 8px; border: 2px solid #4b5563; margin-bottom: 5px;";
  hud.innerHTML = `
    <div>❤️ <span id="hud-hp" style="color:#fbbf24">100</span></div>
    <div>🪙 <span id="hud-gold" style="color:#fbbf24">0</span></div>
    <div>⚔️ <span id="hud-floor" style="color:#fbbf24">1</span></div>
  `;
  gameScreen.appendChild(hud);
  hudHp = document.getElementById('hud-hp');
  hudGold = document.getElementById('hud-gold');
  hudFloor = document.getElementById('hud-floor');
}

// Обновление циферок в HUD
function updateHUD() {
  if (hudHp) hudHp.innerText = state.playerHp;
  if (hudGold) hudGold.innerText = state.goldCount;
  if (hudFloor) hudFloor.innerText = state.currentFloor;
}

// Игровой цикл
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
    getAudio(); // Включаем звук (разблокировка)
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    gameScreen.innerHTML = ''; // Очищаем экран
    
    createHUD(); // Создаем панель здоровья
    gameScreen.appendChild(canvas); // Добавляем холст
    
    localStorage.setItem('pz_heroName', name);
    
    state.playerHp = 100;
    state.heroIdx = 0; 
    state.weapons = WARRIOR_WEAPONS;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;

    bgCanvas = initFloor(); 
    updateHUD();
    
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', (e) => {
      if (!state.gameActive) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w' || key === 'ц') movePlayer(0, -32);
      else if (key === 'arrowdown' || key === 's' || key === 'ы') movePlayer(0, 32);
      else if (key === 'arrowleft' || key === 'a' || key === 'ф') movePlayer(-32, 0);
      else if (key === 'arrowright' || key === 'd' || key === 'в') movePlayer(32, 0);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
}

btnGuest.addEventListener('click', () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = "";
    playSound('menu');
    startGame(name);
});

document.getElementById('btn-google').addEventListener('click', () => {
    errorMsg.innerText = "Google пока отключен.";
});