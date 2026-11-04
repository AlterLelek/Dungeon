// games/dungeon28/main.js
import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { movePlayer } from './game.js';
import { WARRIOR_WEAPONS } from './config.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

const canvas = document.createElement('canvas');
canvas.width = 320; canvas.height = 320;
canvas.style.border = "3px solid #4f46e5";
const ctx = canvas.getContext('2d');
let bgCanvas = null;

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
  }
  requestAnimationFrame(gameLoop);
}

function startGame(name) {
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    gameScreen.innerHTML = '';
    gameScreen.appendChild(canvas);
    
    localStorage.setItem('pz_heroName', name);
    state.playerHp = 100;
    state.weapons = WARRIOR_WEAPONS;
    state.gameActive = true;

    bgCanvas = initFloor(); // initFloor возвращает фон
    requestAnimationFrame(gameLoop);

    // Управление клавиатурой
    document.addEventListener('keydown', (e) => {
      if (!state.gameActive) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w' || key === 'ц') movePlayer(0, -32);
      if (key === 'arrowdown' || key === 's' || key === 'ы') movePlayer(0, 32);
      if (key === 'arrowleft' || key === 'a' || key === 'ф') movePlayer(-32, 0);
      if (key === 'arrowright' || key === 'd' || key === 'в') movePlayer(32, 0);
    });
}

btnGuest.addEventListener('click', () => {
    const name = guestNameInput.value.trim();
    if (name === "") { errorMsg.innerText = "Введите имя!"; return; }
    errorMsg.innerText = "";
    startGame(name);
});