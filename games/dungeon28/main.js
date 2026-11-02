// games/dungeon28/main.js
import { loginWithGoogle, onUserChange } from '../../shared/auth.js';

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnGuest = document.getElementById('btn-guest');
const btnGoogle = document.getElementById('btn-google');
const guestNameInput = document.getElementById('guest-name');
const errorMsg = document.getElementById('error-msg');

// Глобальная переменная для хранения текущего игрока
let currentUser = null;
let isGuest = false;

// Функция для старта игры
function startGame(name, user = null) {
    currentUser = user;
    isGuest = !user;
    
    // Скрываем экран входа, показываем игру
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    // Сохраняем имя для игры
    localStorage.setItem('pz_heroName', name);
    console.log(`Игра началась! Игрок: ${name}, Гость: ${isGuest}, UID: ${user ? user.uid : 'нет'}`);
    
    // TODO: Здесь мы будем вызывать инициализацию самой игры (initDungeon())
    gameScreen.innerHTML = `<h2>Привет, ${name}!</h2><p>Здесь скоро будет игра...</p>`;
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

// Обработчик кнопки "Войти через Google"
btnGoogle.addEventListener('click', async () => {
    errorMsg.innerText = "";
    btnGoogle.innerText = "Загрузка...";
    btnGoogle.disabled = true;
    
    try {
        const user = await loginWithGoogle();
        if (user) {
            startGame(user.displayName || "Герой", user);
        }
    } catch (error) {
        errorMsg.innerText = error.message;
    } finally {
        btnGoogle.innerText = "Войти через Google";
        btnGoogle.disabled = false;
    }
});

// Проверяем, может пользователь уже авторизован в Google (сессия не истекла)
onUserChange((user) => {
    if (user) {
        // Если пользователь уже вошел, автоматически запускаем игру
        startGame(user.displayName || "Герой", user);
    }
});