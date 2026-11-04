// games/dungeon28/main.js
import { state } from './state.js';
import { initFloor } from './map.js';
import { draw } from './ui.js';
import { GRID, CELL, HEROES, WARRIOR_WEAPONS } from './config.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

// Создаем холст для игры
const canvas = document.createElement('canvas');
canvas.width = 320; canvas.height = 320;
canvas.style.border = "3px solid #4f46e5";
canvas.style.backgroundColor = "#241f1d";
const ctx = canvas.getContext('2d');
gameScreen.appendChild(canvas);

let bgCanvas = null;

// Игровой цикл (плавное движение)
function gameLoop() {
  if (state.gameActive) {
    const speed = 0.25;
    if (Math.abs(state.player.px - state.player.x) > 0.5) state.player.px += (state.player.x - state.player.px) * speed; else state.player.px = state.player.x;
    if (Math.abs(state.player.py - state.player.y) > 0.5) state.player.py += (state.player.y - state.player.py) * speed; else state.player.py = state.player.y;
    
    // Анимация цифр
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i]; f.y += f.vy; f.life -= 0.02;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }

    draw(ctx, bgCanvas);
  }
  requestAnimationFrame(gameLoop);
}

// Запуск игры
function startGame(name) {
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    gameScreen.innerHTML = ''; // Очищаем экран
    gameScreen.appendChild(canvas);
    
    localStorage.setItem('pz_heroName', name);
    
    // Инициализация состояния
    state.playerHp = 100;
    state.heroIdx = 0; 
    state.weapons = WARRIOR_WEAPONS;
    state.gameMode = 'chase';
    state.currentFloor = 1;
    state.gameActive = true;

    // Запуск первого этажа
    initFloor();
    draw(ctx, bgCanvas); // Первый кадр
    requestAnimationFrame(gameLoop);
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

// Временно отключаем кнопку Google
document.getElementById('btn-google').addEventListener('click', () => {
    errorMsg.innerText = "Вход через Google временно отключен.";
});