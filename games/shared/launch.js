// Единый стартовый экран для четырёх игр проекта.
import { HERO_DOSSIERS, MONSTER_DOSSIERS } from './universe.js';
import { recordsHTML, recordsList } from './records.js';

const HUB_URL = '../../index.html';
const FIRST = ['Арагорн', 'Гэндальф', 'Леголас', 'Гимли', 'Фродо', 'Бильбо', 'Теоден', 'Эомер', 'Эовин', 'Фарамир', 'Боромир', 'Мерри', 'Пиппин', 'Галадриэль', 'Элронд', 'Гиль-Галад', 'Турин', 'Беорн', 'Гендальф', 'Нарин'];
const SECOND = ['Смелый', 'Мудрый', 'Тихий', 'Грозный', 'Быстрый', 'Верный', 'Светлый', 'Тёмный', 'Ловкий', 'Сильный', 'Добрый', 'Отважный', 'Хитрый', 'Древний', 'Молодой', 'Неутомимый', 'Сурёный', 'Стальной', 'Зоркий', 'Бесстрашный'];

let current = null;

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function randomName() {
  return FIRST[Math.floor(Math.random() * FIRST.length)] + ' ' + SECOND[Math.floor(Math.random() * SECOND.length)];
}

function catalogHTML() {
  const heroes = HERO_DOSSIERS.map(h => `
    <details>
      <summary>${esc(h.emoji)} ${esc(h.name)}</summary>
      <div class="uc-line">${esc(h.line)}</div>
      <div class="uc-desc">${esc(h.desc)}</div>
      <div class="uc-pros"><b>+</b> ${h.pros.map(esc).join(' · ') || '—'}</div>
      <div class="uc-cons"><b>−</b> ${h.cons.map(esc).join(' · ') || '—'}</div>
    </details>`).join('');
  const monsters = MONSTER_DOSSIERS.map(m => `
    <details>
      <summary>${esc(m.emoji)} ${esc(m.name)}</summary>
      <div class="uc-line">${esc(m.line)} · ${esc(m.special)}</div>
      <div class="uc-pros"><b>+</b> ${m.pros.map(esc).join(' · ') || '—'}</div>
      <div class="uc-cons"><b>−</b> ${m.cons.map(esc).join(' · ') || '—'}</div>
    </details>`).join('');
  return `
    <details class="universe-catalog">
      <summary>📚 Справочник обитателей · ${HERO_DOSSIERS.length} героев и ${MONSTER_DOSSIERS.length} монстров</summary>
      <div class="uc-body">
        <h4>Герои</h4>${heroes}
        <h4>Монстры</h4>${monsters}
      </div>
    </details>`;
}

function injectCatalog(selector) {
  if (!selector) return;
  const target = document.querySelector(selector);
  if (!target || target.querySelector('.universe-catalog')) return;
  const holder = document.createElement('div');
  holder.innerHTML = catalogHTML();
  target.appendChild(holder.firstElementChild);
}

export function initUnifiedLaunch(cfg) {
  if (current) current.destroy();
  if (document.getElementById('unified-launch')) document.getElementById('unified-launch').remove();

  const heroes = (cfg.heroes && cfg.heroes.length ? cfg.heroes : HERO_DOSSIERS);
  const modes = cfg.modes || [];
  const nameKey = cfg.nameKey || 'ul_heroName_' + cfg.game;
  let heroIdx = cfg.heroIndex || 0;
  let modeIdx = cfg.modeIndex || 0;
  let visible = true;

  const root = document.createElement('div');
  root.id = 'unified-launch';
  root.className = 'ul-intro';
  root.innerHTML = `
    <div class="ul-card">
      <header class="ul-header">
        <div class="ul-logo" aria-hidden="true">${esc(cfg.logo || '🏰')}</div>
        <h1 class="ul-title">${esc(cfg.title || 'ПОДЗЕМЕЛЬЕ')}</h1>
        <div class="ul-version">v${esc(cfg.version || '')}</div>
        <div class="ul-meta">
          <button class="ul-hub" type="button" id="ul-hub">🎮 Выбор игр</button>
        </div>
      </header>

      <div class="ul-grid">
        <section class="ul-block">
          <span class="ul-label">Выберите героя</span>
          <div class="ul-carousel-row">
            <button class="ul-arrow" type="button" data-arrow="hero-prev" aria-label="Предыдущий герой">◀</button>
            <div class="ul-carousel" id="ul-hero-carousel"></div>
            <button class="ul-arrow" type="button" data-arrow="hero-next" aria-label="Следующий герой">▶</button>
          </div>
          <div class="ul-desc" id="ul-hero-desc" aria-live="polite"></div>
        </section>
        <section class="ul-block">
          <span class="ul-label">${esc(cfg.modeLabel || 'Режим игры')}</span>
          <div class="ul-carousel-row">
            <button class="ul-arrow" type="button" data-arrow="mode-prev" aria-label="Предыдущий режим">◀</button>
            <div class="ul-carousel" id="ul-mode-carousel"></div>
            <button class="ul-arrow" type="button" data-arrow="mode-next" aria-label="Следующий режим">▶</button>
          </div>
          <div class="ul-desc" id="ul-mode-desc" aria-live="polite"></div>
        </section>
      </div>

      <div class="ul-bottom">
        <div class="ul-block">
          <label class="ul-label" for="ul-name">Имя героя</label>
          <div class="ul-row">
            <input class="ul-input" id="ul-name" type="text" maxlength="16" placeholder="Например, Арагорн" autocomplete="off" spellcheck="false">
            <button class="ul-btn ul-dice" type="button" id="ul-dice" title="Случайное имя" aria-label="Случайное имя">🎲</button>
          </div>
        </div>
        <div class="ul-block">
          <div class="ul-actions">
            <button class="ul-play" type="button" id="ul-play">Играть гостем <span aria-hidden="true">➜</span></button>
            <button class="ul-google" type="button" disabled>Войти через Google <span class="ul-soon">скоро</span></button>
          </div>
        </div>
      </div>

      <details class="ul-rec" id="ul-rec-inline">
        <summary>🏆 Рекорды похождений <span id="ul-rec-count">0/0</span></summary>
        <div class="ul-rec-body" id="ul-rec-body"></div>
      </details>
      ${(cfg.achievement || cfg.achievementSelector) ? '<div class="ul-achievement" id="ul-achievement"></div>' : ''}

      <footer class="ul-footer">
        <button class="ul-btn" type="button" data-modal="records">🏆 Рекорды</button>
        <button class="ul-btn" type="button" data-modal="stats">📊 Статистика</button>
        <button class="ul-btn" type="button" data-modal="rules">❓ Условия</button>
      </footer>
    </div>
    <div class="ul-modal" id="ul-modal" role="dialog" aria-modal="true" aria-label="Информация">
      <div class="ul-modal-box">
        <div class="ul-modal-head"><h2 id="ul-modal-title"></h2><button class="ul-btn" type="button" id="ul-modal-close">Закрыть</button></div>
        <div class="ul-modal-body" id="ul-modal-body"></div>
      </div>
    </div>`;

  document.body.appendChild(root);
  if (cfg.achievementSelector) {
    const achNode = document.querySelector(cfg.achievementSelector);
    const achSlot = root.querySelector('#ul-achievement');
    if (achNode && achSlot) achSlot.appendChild(achNode);
  }
  document.body.classList.add('ul-active');
  injectCatalog(cfg.catalogTarget);

  const $ = sel => root.querySelector(sel);
  const heroCarousel = $('#ul-hero-carousel');
  const modeCarousel = $('#ul-mode-carousel');
  const heroDesc = $('#ul-hero-desc');
  const modeDesc = $('#ul-mode-desc');
  const nameInput = $('#ul-name');
  const modal = $('#ul-modal');

  function playClick() {
    if (typeof cfg.onClick === 'function') cfg.onClick();
  }

  function renderHeroCarousel() {
    heroCarousel.innerHTML = '';
    const total = heroes.length;
    for (let offset = -1; offset <= 1; offset++) {
      const idx = (heroIdx + offset + total) % total;
      const h = heroes[idx];
      const card = document.createElement('div');
      card.className = 'ul-card3 ' + (offset === 0 ? 'center' : 'side');
      card.dataset.hero = String(idx);
      const emoji = document.createElement('div');
      emoji.className = 'ul-emoji';
      if (h.sprite) {
        const img = document.createElement('img');
        img.src = h.sprite;
        img.alt = '';
        img.onerror = () => { img.remove(); emoji.textContent = h.emoji || '⚔️'; };
        emoji.appendChild(img);
      } else {
        emoji.textContent = h.emoji || '⚔️';
      }
      const label = document.createElement('div');
      label.className = 'ul-cname';
      label.textContent = h.name || 'Герой';
      card.append(emoji, label);
      if (offset !== 0) card.onclick = () => { heroIdx = idx; playClick(); renderHeroCarousel(); };
      heroCarousel.appendChild(card);
    }
    const h = heroes[heroIdx] || {};
    const cons = (h.cons || []).map(esc).join(' ');
    const pros = (h.pros || []).map(esc).join(' · ');
    heroDesc.innerHTML =
      `<b>${esc(h.name)}</b>` +
      `<span>${esc(h.desc || '')}</span>` +
      `<span class="ul-line">${esc(h.line || `HP ${h.hp || h.maxHp} · MP ${h.mp || h.maxMp}`)}</span>` +
      (pros ? `<span class="ul-pros">+ ${pros}</span>` : '') +
      (cons ? `<span class="ul-cons">${cons}</span>` : '');
  }

  function renderModeCarousel() {
    if (!modes.length) {
      modeCarousel.innerHTML = '<div class="ul-card3 center"><div class="ul-emoji">🎲</div><div class="ul-cname">Обычная</div></div>';
      modeDesc.textContent = 'Стандартные правила игры.';
      return;
    }
    modeCarousel.innerHTML = '';
    const total = modes.length;
    for (let offset = -1; offset <= 1; offset++) {
      const idx = (modeIdx + offset + total) % total;
      const m = modes[idx];
      const card = document.createElement('div');
      card.className = 'ul-card3 ' + (offset === 0 ? 'center' : 'side');
      card.dataset.mode = String(idx);
      card.innerHTML = `<div class="ul-emoji">${esc(m.icon || '🎮')}</div><div class="ul-cname">${esc(m.short || m.name)}</div>`;
      if (offset !== 0) card.onclick = () => { modeIdx = idx; playClick(); renderModeCarousel(); };
      modeCarousel.appendChild(card);
    }
    const m = modes[modeIdx];
    modeDesc.innerHTML = `<b>${esc(m.name)}</b><span>${esc(m.desc || '')}</span>`;
  }

  function refreshRecords() {
    const list = recordsList();
    const got = list.filter(r => r.got).length;
    $('#ul-rec-count').textContent = got + '/' + list.length;
    $('#ul-rec-body').innerHTML = recordsHTML();
  }

  function refreshAchievement() {
    const box = $('#ul-achievement');
    if (!box || typeof cfg.achievement !== 'function') return;
    box.innerHTML = cfg.achievement();
  }

  function openModal(kind) {
    const rules = cfg.rules || [];
    if (kind === 'records') {
      $('#ul-modal-title').textContent = '🏆 Рекорды похождений';
      $('#ul-modal-body').innerHTML = recordsHTML();
    } else if (kind === 'stats') {
      $('#ul-modal-title').textContent = '📊 Статистика';
      $('#ul-modal-body').innerHTML = typeof cfg.stats === 'function' ? cfg.stats() : '<p>Статистика появится после первой игры.</p>';
    } else {
      $('#ul-modal-title').textContent = '❓ Условия игры';
      $('#ul-modal-body').innerHTML = '<p><b>' + esc(cfg.title || '') + '</b></p><ul>' + rules.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>';
    }
    modal.classList.add('show');
  }

  function closeModal() { modal.classList.remove('show'); }

  function hide() {
    visible = false;
    root.classList.add('ul-hidden');
    closeModal();
  }

  function show() {
    visible = true;
    root.classList.remove('ul-hidden');
    root.classList.remove('ul-intro');
    void root.offsetWidth;
    root.classList.add('ul-intro');
    refreshRecords();
    refreshAchievement();
    renderHeroCarousel();
    renderModeCarousel();
  }

  function onKey(e) {
    if (!visible || e.key !== 'Escape') return;
    if (modal.classList.contains('show')) closeModal();
  }

  function destroy() {
    document.removeEventListener('keydown', onKey);
    root.remove();
    document.body.classList.remove('ul-active');
    current = null;
  }

  root.querySelectorAll('[data-arrow]').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.arrow;
      playClick();
      if (action === 'hero-prev') heroIdx = (heroIdx - 1 + heroes.length) % heroes.length;
      if (action === 'hero-next') heroIdx = (heroIdx + 1) % heroes.length;
      if (action === 'mode-prev' && modes.length) modeIdx = (modeIdx - 1 + modes.length) % modes.length;
      if (action === 'mode-next' && modes.length) modeIdx = (modeIdx + 1) % modes.length;
      renderHeroCarousel();
      renderModeCarousel();
    };
  });

  root.querySelectorAll('[data-modal]').forEach(btn => {
    btn.onclick = () => { playClick(); openModal(btn.dataset.modal); };
  });

  $('#ul-hub').onclick = () => { location.href = cfg.hubUrl || HUB_URL; };
  $('#ul-modal-close').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', onKey);

  $('#ul-dice').onclick = () => {
    playClick();
    nameInput.value = randomName();
    try { localStorage.setItem(nameKey, nameInput.value); } catch (e) {}
  };

  $('#ul-play').onclick = () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.value = randomName(); nameInput.focus(); return; }
    try { localStorage.setItem(nameKey, name); } catch (e) {}
    playClick();
    hide();
    try {
      cfg.start({ heroIndex: heroIdx, modeIndex: modeIdx, name });
    } catch (err) {
      console.error('Не удалось запустить игру:', err);
      show();
    }
  };

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('#ul-play').click(); }
  });

  let savedName = '';
  try { savedName = localStorage.getItem(nameKey) || ''; } catch (e) {}
  nameInput.value = savedName || randomName();

  renderHeroCarousel();
  renderModeCarousel();
  refreshRecords();
  refreshAchievement();

  const api = { show, hide, destroy, root, get heroIndex() { return heroIdx; }, get modeIndex() { return modeIdx; } };
  current = api;
  window.UnifiedLaunch = api;
  return api;
}

export default initUnifiedLaunch;
