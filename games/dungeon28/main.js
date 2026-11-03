// games/dungeon28/main.js
import { loginWithGoogle, onUserChange, handleRedirectResult } from '../../shared/auth.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const btnGoogle = document.getElementById('btn-google');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

// Защита от двойного запуска игры
let gameStarted = false;

// Функция для старта игры
function startGame(name, user = null) {
    if (gameStarted) return; // Если игра уже запущена, ничего не делаем
    gameStarted = true;

    // Скрываем экран входа, показываем игру
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    // Сохраняем имя для игры
    localStorage.setItem('pz_heroName', name);
    console.log(`Игра началась! Игрок: ${name}, Гость: ${!user}, UID: ${user ? user.uid : 'нет'}`);
    
    // TODO: Здесь мы будем вызывать инициализацию самой игры (initDungeon())
    gameScreen.innerHTML = `<h2>Привет, ${name}!</h2><p>Здесь скоро будет игра...</p>`;
}

// 1. ПРОВЕРКА ВОЗВРАТА С GOOGLE
// Эта функция срабатывает, когда браузер загружает страницу. 
// Если мы только что вернулись с экрана Google, она это поймет и запустит игру.
async function checkRedirectResult() {
    errorMsg.innerText = "Проверка авторизации...";
    const user = await handleRedirectResult();
    
    if (user) {
        // Пользователь вернулся с Google, запускаем игру
        startGame(user.displayName || "Герой", user);
    } else {
        // Если это обычная загрузка страницы (не возврат с Google), 
        // очищаем сообщение и ждем действий от пользователя
        errorMsg.innerText = "";
        setupEventListeners();
    }
}

// 2. НАСТРОЙКА КНОПОК (срабатывает только если мы не вернулись с Google)
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
            // Вызываем функцию, которая делает редирект (страница перезагрузится)
            await loginWithGoogle(); 
        } catch (error) {
            errorMsg.innerText = "Ошибка при перенаправлении. Попробуйте еще раз.";
            btnGoogle.innerText = "Войти через Google";
            btnGoogle.disabled = false;
        }
    });

    // Слушатель для тех, у кого уже есть активная сессия (зашли ранее)
    onUserChange((user) => {
        if (user && !gameStarted) {
            startGame(user.displayName || "Герой", user);
        }
    });
}

// Запускаем проверку при загрузке страницы
checkRedirectResult();