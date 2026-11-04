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

// Создаем холст для игры
const canvas = document.createElement('canvas');
canvas.width = 320; 
canvas.height = 320;
canvas.style.border = "3px solid #4f46e5";
const ctx = canvas.getContext('2d');
let bgCanvas = null;
let gameLoopStarted = false;

// Главный игровой цикл (отвечает за плавность и анимации)
function gameLoop() {
  if (state.gameActive) {
    const speed = 0.25;
    
    // Плавное движение героя (интерполяция)
    if (Math.abs(state.player.px - state.player.x) > 0.5) {
      state.player.px += (state.player.x - state.player.px) * speed;
    } else {
      state.player.px = state.player.x;
    }
    
    if (Math.abs(state.player.py - state.player.y) > 0.5) {
      state.player.py += (state.player.y - state.player.py) * speed;
    } else {
      state.player.py = state.player.y;
    }
    
    // Анимация всплывающих цифр
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i]; 
      f.y += f.vy; 
      f.life -= 0.02;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    
    // Перерисовываем всё
    draw(ctx, bgCanvas);
  }
  requestAnimationFrame(gameLoop);
}

// Запуск игры
function startGame(name) {
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    gameScreen.innerHTML = ''; // Очищаем контейнер
    gameScreen.appendChild(canvas);
    
    localStorage.setItem('pz_heroName', name);
    
    // Настройка стартового состояния
    state.playerHp = 100;
    state.heroIdx = 0; 
    state.weapons = WARRIOR_WEAPONS;
    state.gameMode = 'chase'; // Пока тестируем Погоню
    state.currentFloor = 1;
    state.gameActive = true;
    state.goldCount = 0;

    // Генерируем первый этаж и получаем фон
    bgCanvas = initFloor(); 
    
    // Запускаем игровой цикл (только один раз)
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        requestAnimationFrame(gameLoop);
    }

    // Слушатель клавиатуры
    document.addEventListener('keydown', (e) => {
      if (!state.gameActive) return;
      const key = e.key.toLowerCase();
      
      // Движение (стрелки, WASD, русская раскладка)
      if (key === 'arrowup' || key === 'w' || key === 'ц') movePlayer(0, -32);
      else if (key === 'arrowdown' || key === 's' || key === 'ы') movePlayer(0, 32);
      else if (key === 'arrowleft' || key === 'a' || key === 'ф') movePlayer(-32, 0);
      else if (key === 'arrowright' || key === 'd' || key === 'в') movePlayer(32, 0);
      
      // Предотвращаем прокрутку страницы стрелками
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
          e.preventDefault();
      }
    });
}

// Обработчик кнопки "Играть без аккаунта"
btnGuest.addEventListener('click', () => {
    const name = guestNameInput.value.trim();
    if (name === "") {
        errorMsg.innerText = "Пожалуйста, введите имя!";
        return;
    }
    errorMsg.innerText = "";
    startGame(name);
});

// Временно отключаем Google (чтобы не было ошибок)
document.getElementById('btn-google').addEventListener('click', () => {
    errorMsg.innerText = "Вход через Google временно отключен.";
});