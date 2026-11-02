// shared/settings.js

// Дефолтные настройки, собранные из Лабиринта и Подземелий
const DEFAULTS = {
  sfx: 100,         // Эффекты
  amb: 100,         // Эмбиент (гул)
  mel: 50,          // Мелодия
  tempo: 600,       // Темп
  floors: 5,        // Количество этажей всего
  monstAdd: 0,      // Добавочные монстры
  itemRate: 2,      // Частота спавна предметов
  shieldVal: 3,     // Сила щита
  starVal: 1,       // Сила звезды
  difficulty: 'simple', // Сложность (simple, extreme, horror)
  bonusReset: false, // Сброс бонусов на новом этаже
  melody: 'cave',   // Текущая мелодия
  autoMel: false,   // Автосмена мелодий
  vibro: true,      // Вибрация вкл/выкл
  vibroPower: 100,  // Сила вибрации
  keysMode: 'all',  // WASD + стрелки, или раздельно
  keysLayout: 'both', // Раскладка (lat, cyr, both)
  heroIdx: 0,       // Выбранный герой
  wallsChk: true    // Наличие стен (для Лабиринта)
};

// Переменная, которая будет хранить текущие рабочие настройки
export let settings = Object.assign({}, DEFAULTS);

// Загрузка настроек из памяти браузера
export function loadSettings() {
  try {
    const raw = localStorage.getItem('pz_settings');
    if (raw) {
      settings = Object.assign({}, DEFAULTS, JSON.parse(raw));
    }
  } catch (e) {
    console.error("Ошибка загрузки настроек:", e);
  }
  return settings;
}

// Сохранение настроек в память браузера
export function saveSettings() {
  try {
    localStorage.setItem('pz_settings', JSON.stringify(settings));
  } catch (e) {
    console.error("Ошибка сохранения настроек:", e);
  }
}

// Сброс всех настроек на заводские
export function resetSettings() {
  settings = Object.assign({}, DEFAULTS);
  saveSettings();
  return settings;
}

// Проверка: разрешено ли использовать WASD
export function wasdAllowed() {
  return settings.keysMode !== 'arrows';
}

// Проверка: разрешено ли использовать стрелки
export function arrowsAllowed() {
  return settings.keysMode !== 'wasd';
}

// Проверка: соответствует ли нажатая буква выбранной языковой раскладке
export function letterOk(latKey, cyrKey) {
  if (settings.keysLayout === 'both') return true;
  if (settings.keysLayout === 'lat') return !/^[а-яё]$/i.test(cyrKey || '');
  return !/^[a-z]$/i.test(latKey || '');
}
