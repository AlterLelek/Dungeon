// games/dungeon28/main.js
import { loginWithGoogle, onUserChange, handleRedirectResult } from '../../shared/auth.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const btnGoogle = document.getElementById('btn-google');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

let gameStarted = false;

// Функция для старта игры
function startGame(name, user = null) {
    if (gameStarted) return; // Защита от двойного запуска
    gameStarted = true;

    // Скрываем экран входа, показываем игру
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    localStorage.setItem('pz_heroName', name);
    console.log(`Игра началась! Игрок: ${name}, Гость: ${!user}, UID: ${user ? user.uid : 'нет'}`);
    
    // Временная заглушка (сюда потом вставим вызов игры)
    gameScreen.innerHTML = `<h2>Привет, ${name}!</h2><p>Здесь скоро будет игра...</p>`;
}

// 1. Проверка возврата с Google
async function checkRedirectResult() {
    errorMsg.innerText = "Проверка авторизации...";
    const user = await handleRedirectResult();
    
    if (user) {
        startGame(user.displayName || "Герой", user);
    } else {
        errorMsg.innerText = "";
        setupEventListeners();
    }
}

// 2. Настройка кнопок
function setupEventListeners() {
    // Кнопка "Играть без аккаунта"
    btnGuest.addEventListener('click', () => {
        const name = guestNameInput.value.trim();
        if (name === "") {
            errorMsg.innerText = "Пожалуйста, введите имя!";
            return;
        }
        errorMsg.innerText = "";
        startGame(name);
    });

    // Кнопка "Войти через Google"
    btnGoogle.addEventListener('click', async () => {
        errorMsg.innerText = "Перенаправление на Google...";
        btnGoogle.innerText = "Загрузка...";
        btnGoogle.disabled = true;
        
        try {
            await loginWithGoogle(); 
        } catch (error) {
            console.error("ОШИБКА ВХОДА:", error); // ТЕПЕРЬ ОШИБКА БУДЕТ В КОНСОЛИ
            errorMsg.innerText = "Ошибка при перенаправлении. Попробуйте еще раз.";
            btnGoogle.innerText = "Войти через Google";
            btnGoogle.disabled = false;
        }
    });

    // Слушатель для тех, у кого уже есть активная сессия
    onUserChange((user) => {
        if (user && !gameStarted) {
            startGame(user.displayName || "Герой", user);
        }
    });
}

// Запускаем проверку при загрузке страницы
checkRedirectResult();