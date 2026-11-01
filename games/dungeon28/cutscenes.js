// games/dungeon28/cutscenes.js
import { settings } from '../../shared/settings.js';
import { getAudioContext, playSound } from '../../shared/audio.js';

let overlay = null, cv = null, cx = null, bg = null, raf = null, t0 = 0;
let active = false, cfg = null, fired = {};
const W = 320, H = 224;
const heroX = 232, heroY = 138, enemyX = 88, enemyY = 138;

const T_PLATFORM = 500, T_ENEMY_APPEAR = 1000, T_HERO_ATTACK = 1850;
const T_IMPACT = 2050, T_KILL_START = 2100, T_KILL_END = 2750;
const T_COUNTER_START = 2400, T_COUNTER_HIT = 2600, T_FADE_START_KILL = 2750;
const T_FADE_START_COUNTER = 3150, FADE = 500;

function noiseBurst(dur, vol) {
  try {
    const ac = getAudioContext(), size = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, size, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.value = vol || 0.06;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
  } catch (e) {}
}

function buildBg() {
  bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const g = bg.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3a2c1c'; g.fillRect(24, 36, 272, 68);
  for (let r = 0; r < 6; r++) {
    let y1 = 104 + Math.pow(r/6, 1.6) * 64, y2 = 104 + Math.pow((r+1)/6, 1.6) * 64;
    g.fillStyle = (r % 2 === 0) ? 'rgba(70,80,120,0.35)' : 'rgba(50,60,95,0.35)';
    g.fillRect(24, y1, 272, y2 - y1);
  }
}

function platform(x, y, r, a) {
  cx.save(); cx.globalAlpha = a ?? 1;
  cx.fillStyle = 'rgba(0,0,0,0.5)'; cx.beginPath(); cx.ellipse(x, y + 2, r, r * 0.3, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#4a4a52'; cx.beginPath(); cx.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#6d6d78'; cx.beginPath(); cx.ellipse(x, y - 2, r - 3, r * 0.28, 0, 0, Math.PI * 2); cx.fill();
  cx.restore();
}

function drawHero(x, y, lunge, swordFlash) {
  cx.save(); const s = lunge || 0;
  cx.fillStyle = '#283593'; cx.fillRect(x - 6, y - 10, 5, 11); cx.fillRect(x + 1, y - 10, 5, 11);
  cx.fillStyle = '#1f7a2e'; cx.fillRect(x - 8, y - 22, 12, 13);
  cx.fillStyle = '#f2c69b'; cx.fillRect(x - 5, y - 29, 8, 7);
  cx.fillStyle = '#e8c060'; cx.fillRect(x - 6, y - 32, 10, 4);
  if (swordFlash) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x - 30, y - 30); cx.lineTo(x - 18, y - 10); cx.stroke(); }
  cx.restore();
}

function drawEnemyShape(g, x, y, t, kind, alpha) {
  g.save(); g.globalAlpha = alpha ?? 1;
  g.fillStyle = '#20202a'; g.beginPath(); g.ellipse(x, y - 11, 10, 12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff2d2d'; g.fillRect(x - 5, y - 14, 3, 3); g.fillRect(x + 2, y - 14, 3, 3);
  g.restore();
}

function drawDissolveEnemy(x, y, t, kind, progress) {
  if (progress <= 0) { drawEnemyShape(cx, x, y, t, kind, 1); return; } if (progress >= 1) return;
  const size = 44, off = document.createElement('canvas'); off.width = size; off.height = size;
  const g = off.getContext('2d'); drawEnemyShape(g, size/2, size/2 + 14, t, kind, 1);
  const img = g.getImageData(0, 0, size, size), data = img.data, px = 2;
  const prng = (a, b) => ((a * 928371 + b * 123457) % 997) / 997;
  for (let by = 0; by < size; by += px) {
    for (let bx = 0; bx < size; bx += px) {
      if (progress > prng(bx, by)) {
        for (let yy = 0; yy < px; yy++) for (let xx = 0; xx < px; xx++) {
          let idx = ((by + yy) * size + (bx + xx)) * 4; if (idx < data.length) data[idx + 3] = 0;
        }
      }
    }
  }
  g.putImageData(img, 0, 0); cx.drawImage(off, x - size/2, y - size/2 - 14);
}

function windowBox(x, y, w, h, name, hp, max) {
  cx.fillStyle = '#14225a'; cx.fillRect(x, y, w, h);
  cx.strokeStyle = '#d4a017'; cx.lineWidth = 2; cx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  cx.font = 'bold 9px monospace'; cx.fillStyle = '#f4d03f'; cx.fillText(name, x + 7, y + 14);
  cx.fillStyle = '#e03131'; cx.fillRect(x + 42, y + 16, 52 * (max > 0 ? hp / max : 0), 6);
}

function drawCutscene(now) {
  const t = now - t0, e = cfg.enemies[0], killed = e.killed, counter = cfg.counterDamage > 0;
  const fadeStart = killed ? T_FADE_START_KILL : (counter ? T_FADE_START_COUNTER : T_FADE_START_KILL);
  if (t >= fadeStart + FADE) { finish(); return; }

  const cue = (n, tm, fn) => { if (t >= tm && !fired[n]) { fired[n] = 1; fn(); } };
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);

  let shX = 0, shY = 0;
  if (t >= T_IMPACT - 40 && t < T_IMPACT + 160) { let s = 3 * (1 - (t - (T_IMPACT - 40)) / 200); shX = (Math.random() * 2 - 1) * s; shY = (Math.random() * 2 - 1) * s; }
  cx.save(); cx.translate(shX, shY); cx.drawImage(bg, 0, 0);

  cue('swing', T_HERO_ATTACK, () => playSound('menu'));
  cue('impact', T_IMPACT, () => { playSound('hit'); noiseBurst(0.12, 0.05); });
  cue('kill', T_KILL_START, () => { if (killed) { playSound('kill'); noiseBurst(0.3, 0.04); } });

  const hpP = Math.min(1, (t - T_PLATFORM) / 500);
  if (hpP > 0) {
    let py = heroY, at = t - T_HERO_ATTACK, hx = heroX, sf = 0;
    if (at > 0 && at < 300) hx = heroX - (at / 300) * 70;
    else if (at >= 300 && at < 500) { hx = heroX - 70; sf = 1; }
    else if (at >= 500 && at < 800) hx = heroX - 70 + ((at - 500) / 300) * 70;
    platform(heroX, py + 8, 26, hpP); drawHero(hx, py, at > 0 && at < 500 ? -8 : 0, sf);
  }

  if (t >= T_ENEMY_APPEAR) {
    let ex = enemyX, eyy = enemyY;
    if (counter && t > T_COUNTER_START) ex = enemyX + Math.min(1, (t - T_COUNTER_START)/280) * 100;
    if (killed && t >= T_KILL_START) drawDissolveEnemy(ex, eyy, t, e.type, Math.min(1, (t - T_KILL_START) / 650));
    else drawEnemyShape(cx, ex, eyy, t, e.type, 1);
  }

  windowBox(168, 4, 148, 42, cfg.hero, t < T_COUNTER_HIT ? cfg.heroHp : Math.max(0, cfg.heroHp - cfg.counterDamage), cfg.heroMax);
  windowBox(6, 174, 130, 44, e.name, t < T_IMPACT ? e.hp : (killed ? 0 : Math.max(0, e.hp - e.damage)), e.max);
  cx.restore();

  if (t >= fadeStart) {
    cx.fillStyle = `rgba(0,0,0,${Math.min(1, (t - fadeStart) / FADE)})`; cx.fillRect(0, 0, W, H);
  }
  raf = requestAnimationFrame(drawCutscene);
}

function finish() {
  if (raf) cancelAnimationFrame(raf); active = false;
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
  if (cfg?.onEnd) cfg.onEnd();
}

// Главная экспортируемая функция запуска заставки боя
export function startBattleCutscene(o) {
  if (active || !o?.enemies?.length) { o?.onEnd?.(); return; }
  cfg = o; fired = {}; buildBg();
  overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:9000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;';
  const wrap = document.createElement('div'); wrap.style.cssText = 'width:min(100vw,142.8vh);aspect-ratio:320/224;position:relative;';
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;';
  wrap.appendChild(cv); overlay.appendChild(wrap); document.body.appendChild(overlay);
  overlay.addEventListener('pointerdown', (e) => { e.stopPropagation(); t0 = performance.now() - 3200; });
  cx = cv.getContext('2d'); t0 = performance.now(); active = true;
  raf = requestAnimationFrame(drawCutscene);
}
