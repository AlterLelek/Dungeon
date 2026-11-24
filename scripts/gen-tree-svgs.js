#!/usr/bin/env node
'use strict';

/**
 * Создаёт SVG-деревья из assets/trees-batch.json.
 * 10 базовых силуэтов × 10 вариаций × 4 сезона = 400 файлов.
 * Стилистика повторяет остальные SVG-ассеты игры: 64×64, тёмный контур
 * #241a14, слоистые формы и мягкие блики.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BATCH_FILE = path.join(ROOT, 'assets', 'trees-batch.json');
const OUT_BASE = path.join(ROOT, 'assets', 'trees');

const OUTLINE = '#241a14';

const PALETTES = {
  summer: [
    { dark: '#2a5f2d', mid: '#3c7c36', light: '#5a9c43', hi: '#8ac25c', trunk: '#6b4426', bark: '#4a2e18' },
    { dark: '#24582b', mid: '#357333', light: '#548f3e', hi: '#7db857', trunk: '#70482a', bark: '#48301b' },
    { dark: '#316a31', mid: '#47863a', light: '#69a54c', hi: '#97c96c', trunk: '#664023', bark: '#412817' },
  ],
  autumn: [
    { dark: '#a9481c', mid: '#ce6d20', light: '#e79b2d', hi: '#f8c853', trunk: '#6b4426', bark: '#4a2e18' },
    { dark: '#b44318', mid: '#d97a1e', light: '#efa92f', hi: '#ffd464', trunk: '#70482a', bark: '#48301b' },
    { dark: '#984a1f', mid: '#c0671c', light: '#e2952a', hi: '#f5bd4b', trunk: '#664023', bark: '#412817' },
  ],
  winter: [
    { dark: '#c6d6e5', mid: '#e0ebf5', light: '#f2f8fd', hi: '#ffffff', trunk: '#5d3b22', bark: '#3e2716' },
    { dark: '#bdd0e1', mid: '#dae7f2', light: '#eef6fc', hi: '#ffffff', trunk: '#644127', bark: '#402817' },
    { dark: '#cfdeea', mid: '#e6eff7', light: '#f7fbff', hi: '#ffffff', trunk: '#593920', bark: '#3a2414' },
  ],
  spring: [
    { dark: '#6daa4a', mid: '#8dc861', light: '#b1de7d', hi: '#d7f0a8', trunk: '#6b4426', bark: '#4a2e18' },
    { dark: '#78b451', mid: '#9acf6d', light: '#bee58d', hi: '#e2f5bb', trunk: '#70482a', bark: '#48301b' },
    { dark: '#64a245', mid: '#84bd58', light: '#a8d677', hi: '#cdeba0', trunk: '#664023', bark: '#412817' },
  ],
};

// Детерминированный генератор, чтобы повторный запуск давал те же файлы.
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const f = (value) => Number(value.toFixed(2));

function ellipse(cx, cy, rx, ry, fill, sw = 1.1) {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" stroke="${OUTLINE}" stroke-width="${sw}"/>`;
}

function shape(d, fill, sw = 1.25) {
  return `<path d="${d}" fill="${fill}" stroke="${OUTLINE}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function line(d, color, width, opacity = 1) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
}

// Каждая форма получает свои «размахи» и количество мелких деталей.
function wide_oak(p, r) {
  const j = (a) => a + (r() * 2 - 1) * 1.2;
  let s = '';
  s += shape('M26 58 Q29 45 25 35 L39 35 Q35 46 39 58 Z', p.trunk, 1.4);
  s += line('M31 48 Q27 41 22 30', p.bark, 3.2);
  s += line('M34 47 Q39 40 44 29', p.bark, 3);
  s += line('M30 53 Q30 45 29 38', p.bark, 0.9, 0.65);
  const blobs = [
    [j(32), j(21), j(15), j(10), p.dark],
    [j(18), j(26), j(9.5), j(7.5), p.mid],
    [j(46), j(25), j(9.5), j(7), p.mid],
    [j(24), j(14), j(9.5), j(7.5), p.light],
    [j(40), j(13), j(10), j(7), p.light],
    [j(15), j(31), j(7), j(5), p.dark],
    [j(49), j(32), j(7), j(5), p.dark],
  ];
  for (const b of blobs) s += ellipse(...b);
  for (let i = 0; i < 4 + (r() > 0.5 ? 1 : 0); i++) {
    s += ellipse(19 + i * 7 + (r() * 2 - 1) * 2, 12 + (i % 2) * 4 + (r() * 2 - 1) * 2,
      2.4 + r() * 1.6, 1.7 + r(), p.hi, 0.6);
  }
  return s;
}

function slender_birch(p, r) {
  const j = (a) => a + (r() * 2 - 1) * 0.9;
  let s = '';
  s += shape('M30.5 58 Q32.5 40 30 17 L34.2 17 Q33.2 40 35.5 58 Z', p.trunk, 1.3);
  s += line('M31.6 56 Q33 38 31.2 20', '#b98d60', 0.9, 0.75);
  for (let y = 26; y <= 50; y += 6) s += line(`M${j(31)} ${y} l2.8 -0.9`, '#d6b084', 0.9, 0.85);
  const blobs = [
    [j(32), j(10), j(5.5), j(6), p.dark],
    [j(27), j(16), j(5), j(4.5), p.mid],
    [j(37), j(16), j(5), j(4.6), p.light],
    [j(29), j(23), j(5), j(4), p.mid],
    [j(36), j(23), j(4.5), j(4), p.light],
    [j(32), j(27), j(4), j(3.5), p.dark],
  ];
  for (const b of blobs) s += ellipse(...b);
  for (const x of [25, 29, 33, 37, 41]) {
    const dx = (r() * 2 - 1) * 3;
    s += line(`M${x} 20 Q${f(x + dx)} 28 ${f(x + dx)} ${f(33 + r() * 7)}`, p.dark, 1.1, 0.9);
  }
  for (let i = 0; i < 4; i++) s += ellipse(26 + i * 3 + r() * 2, 9 + r() * 8, 1.8, 2.2, p.hi, 0.6);
  return s;
}

function bushy_pine(p, r) {
  let s = '';
  s += shape('M30.5 58 V29 L33.5 29 V58 Z', p.trunk, 1.3);
  for (let i = 3; i >= 0; i--) {
    const y = 9 + i * 9 + (r() * 2 - 1) * 1.2;
    const hw = 6 + i * 5 + (r() * 2 - 1) * 1.5;
    const by = y + 11 + (r() * 2 - 1);
    const left = f(32 - hw - 2);
    const right = f(32 + hw + 2);
    s += shape(`M32 ${f(y)} Q${f(32 - hw)} ${f(y + 6)} ${left} ${f(by)} Q32 ${f(by - 4)} ${right} ${f(by)} Q${f(32 + hw)} ${f(y + 6)} 32 ${f(y)} Z`,
      i % 2 ? p.mid : p.dark, 1.2);
    s += line(`M${f(32 - hw - 1)} ${f(by - 1)} Q32 ${f(by - 5)} ${f(32 + hw + 1)} ${f(by - 1)}`, p.light, 1, 0.85);
  }
  for (let i = 0; i < 8; i++) {
    const y = 14 + i * 4.5;
    const hw = 3 + i * 2.2;
    s += line(`M${f(32 - hw)} ${f(y)} l2.4 1.6 M${f(32 + hw)} ${f(y)} l-2.4 1.6`, p.hi, 0.8, 0.6);
  }
  return s;
}

function curved_willow(p, r) {
  let s = '';
  s += shape('M27 58 Q23 42 31 29 Q37 21 33 15 L37.5 15.5 Q41 23 35 31 Q27 43 33 58 Z', p.trunk, 1.4);
  s += line('M29.5 54 Q26 41 33 30', p.bark, 1, 0.7);
  const blobs = [
    [34, 17, 13, 6, p.dark], [23, 20, 8, 5, p.mid], [45, 20, 8, 5, p.mid],
    [31, 13, 8, 5, p.light], [39, 12, 7, 4.5, p.light],
  ];
  for (const b of blobs) s += ellipse(b[0] + (r() * 2 - 1) * 1.2, b[1] + (r() * 2 - 1) * 1.2, b[2], b[3], b[4]);
  const count = 7 + (r() > 0.5 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const x = 20 + i * (28 / (count - 1)) + (r() * 2 - 1) * 1.5;
    const len = 12 + r() * 12;
    const ex = x + (r() * 2 - 1) * 5;
    s += line(`M${f(x)} 21 Q${f(x + (ex - x) * 0.4)} ${f(21 + len * 0.65)} ${f(ex)} ${f(21 + len)}`, p.dark, 1.2, 0.95);
    s += ellipse(ex, 21 + len, 1.8, 2.6, r() > 0.5 ? p.light : p.mid, 0.6);
  }
  for (let i = 0; i < 5; i++) s += ellipse(25 + i * 5 + r() * 2, 12 + r() * 6, 2, 1.5, p.hi, 0.6);
  return s;
}

function gnarled_elm(p, r) {
  let s = '';
  s += shape('M26 58 Q30 44 25 36 Q20 30 24 24 L30 26 Q27 34 32 40 Q37 34 34 26 L40 24 Q43 31 37 38 Q34 46 39 58 Z', p.trunk, 1.4);
  s += line('M30 36 Q22 30 17 22', p.bark, 3);
  s += line('M34 34 Q42 27 47 20', p.bark, 3);
  s += line('M32 30 Q31 22 33 14', p.bark, 2.6);
  s += ellipse(31, 43, 2.4, 3.2, p.bark, 1);
  s += line('M27 51 Q31 48 34 51', p.bark, 0.9, 0.8);
  const blobs = [
    [20, 19, 11, 7.5, p.dark], [45, 16, 10, 7, p.mid], [33, 12, 10.5, 7, p.light],
    [25, 27, 8, 5, p.mid], [41, 26, 8, 5, p.light],
  ];
  for (const b of blobs) s += ellipse(b[0] + (r() * 2 - 1) * 1.5, b[1] + (r() * 2 - 1) * 1.5, b[2], b[3], b[4]);
  for (let i = 0; i < 6; i++) s += ellipse(17 + i * 6 + (r() * 2 - 1) * 2, 11 + r() * 14, 2 + r(), 1.6 + r() * 0.8, p.hi, 0.6);
  return s;
}

function tall_cedar(p, r) {
  let s = '';
  s += shape('M31 58 V7 L33.6 7 V58 Z', p.trunk, 1.3);
  s += shape('M32 4 L28.5 17 L35.5 17 Z', p.dark, 1.15);
  for (let i = 0; i < 5; i++) {
    const y = 16 + i * 8.5 + (r() * 2 - 1) * 0.8;
    const hw = 7 + i * 4.5 + (r() * 2 - 1) * 1.4;
    const left = f(32 - hw - 1);
    const right = f(32 + hw + 1);
    s += shape(`M32 ${f(y - 10)} Q${f(32 - hw)} ${f(y - 3)} ${left} ${f(y + 1)} Q32 ${f(y - 3)} ${right} ${f(y + 1)} Q${f(32 + hw)} ${f(y - 3)} 32 ${f(y - 10)} Z`,
      i % 2 ? p.light : p.mid, 1.15);
    s += line(`M${left} ${f(y + 0.5)} Q32 ${f(y - 3.5)} ${right} ${f(y + 0.5)}`, p.dark, 0.9, 0.7);
  }
  for (let i = 0; i < 7; i++) {
    const y = 12 + i * 5.5;
    const hw = 3 + i * 2.6;
    s += line(`M${f(32 - hw)} ${f(y)} h3 M${f(32 + hw - 3)} ${f(y)} h3`, p.hi, 0.8, 0.65);
  }
  return s;
}

function cluster_rowan(p, r) {
  const stems = [[20, 26], [27, 20], [36, 18], [45, 27]];
  let s = '';
  for (let i = 0; i < stems.length; i++) {
    const [ex, ey] = stems[i];
    const midX = (32 + ex) / 2 + (r() * 2 - 1) * 2;
    s += line(`M32 58 Q${f(midX)} 42 ${ex} ${ey}`, p.trunk, 2.6);
    s += line(`M32 58 Q${f(midX)} 42 ${ex} ${ey}`, p.bark, 0.9, 0.7);
    s += ellipse(ex, ey, 5.2, 4.4, i % 2 ? p.mid : p.dark);
    s += ellipse(ex - 4, ey + 2.5, 4, 3.4, p.light);
    s += ellipse(ex + 4, ey + 2, 4, 3.4, p.mid);
    s += ellipse(ex + (r() * 2 - 1) * 2, ey - 4.5, 3.6, 3.2, p.light);
    for (let k = 0; k < 3; k++) {
      s += ellipse(ex - 4 + k * 4 + (r() * 2 - 1), ey + (r() * 2 - 1) * 4, 1.5, 1.3, p.hi, 0.5);
    }
  }
  s += shape('M28 58 Q32 54 36 58 Z', p.bark, 1);
  return s;
}

function spiky_fir(p, r) {
  let s = '';
  s += shape('M30.8 58 V46 H33.2 V58 Z', p.trunk, 1.3);
  let d = 'M32 5';
  for (let k = 0; k < 6; k++) {
    const y = 10 + k * 7;
    d += ` L${f(32 - (6 + k * 3.2 + (r() * 2 - 1) * 0.7))} ${y}`;
    d += ` L${f(32 - (3.5 + k * 3.2))} ${y + 3.5}`;
  }
  d += ' L32 54';
  for (let k = 5; k >= 0; k--) {
    const y = 10 + k * 7;
    d += ` L${f(32 + (3.5 + k * 3.2))} ${y + 3.5}`;
    d += ` L${f(32 + (6 + k * 3.2 + (r() * 2 - 1) * 0.7))} ${y}`;
  }
  d += ' Z';
  s += shape(d, p.dark, 1.25);
  s += shape('M32 9 L21 49 L43 49 Z', p.mid, 1.05);
  s += shape('M32 14 L26 45 L38 45 Z', p.light, 0.9);
  for (let i = 0; i < 10; i++) {
    const y = 14 + i * 3.8;
    const hw = 3 + i * 1.9;
    s += line(`M${f(32 - hw)} ${f(y)} l2.2 1.5 M${f(32 + hw)} ${f(y)} l-2.2 1.5`, p.hi, 0.8, 0.6);
  }
  return s;
}

function drooping_larch(p, r) {
  let s = '';
  s += shape('M30.8 58 Q32 40 31.2 14 L33.4 14 Q33 40 34.2 58 Z', p.trunk, 1.3);
  for (let i = 0; i < 4; i++) {
    const y = 13 + i * 9.5 + (r() * 2 - 1);
    const hw = 6 + i * 5.5 + (r() * 2 - 1) * 1.2;
    s += line(`M32 ${f(y)} Q${f(32 - hw)} ${f(y + 1)} ${f(32 - hw - 2)} ${f(y + 6)}`, p.dark, 2.3);
    s += line(`M32 ${f(y)} Q${f(32 + hw)} ${f(y + 1)} ${f(32 + hw + 2)} ${f(y + 6)}`, p.dark, 2.3);
    const tufts = 3 + i;
    for (let t = 0; t < tufts; t++) {
      const frac = (t + 1) / (tufts + 1);
      const x = 32 - hw * frac - 1 + (r() * 2 - 1) * 0.8;
      const y2 = y + 2 + frac * 4 + (r() * 2 - 1);
      s += ellipse(x, y2, 2.2, 3.1, t % 2 ? p.mid : p.light, 0.9);
      const xr = 64 - x;
      s += ellipse(xr, y2, 2.2, 3.1, t % 2 ? p.mid : p.light, 0.9);
    }
    const end = 32 - hw - 2;
    s += line(`M${f(end)} ${f(y + 6)} Q${f(end - 1)} ${f(y + 10)} ${f(end - 2)} ${f(y + 12 + r() * 3)}`, p.mid, 1.1, 0.9);
    s += line(`M${f(64 - end)} ${f(y + 6)} Q${f(65 - end)} ${f(y + 10)} ${f(66 - end)} ${f(y + 12 + r() * 3)}`, p.mid, 1.1, 0.9);
  }
  s += ellipse(32, 10, 3.2, 4, p.light, 1);
  return s;
}

function dense_chestnut(p, r) {
  let s = '';
  s += shape('M29.5 58 Q31.5 44 29.5 34 L35 34 Q34 45 36 58 Z', p.trunk, 1.4);
  s += line('M31 48 Q25 40 20 30', p.bark, 2.8);
  s += line('M34 46 Q40 39 45 29', p.bark, 2.8);
  s += ellipse(32, 20, 15.5, 12.5, p.dark, 1.3);
  const count = 12 + (r() > 0.5 ? 2 : 0);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const cx = 32 + Math.cos(a) * 14.5 + (r() * 2 - 1);
    const cy = 20 + Math.sin(a) * 11.5 + (r() * 2 - 1);
    s += ellipse(cx, cy, 3.2 + r() * 1.5, 3 + r() * 1.4, i % 2 ? p.mid : p.light, 1);
  }
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    s += ellipse(32 + Math.cos(a) * 7 + (r() * 2 - 1) * 2, 20 + Math.sin(a) * 6 + (r() * 2 - 1) * 2,
      2.2 + r(), 1.9 + r() * 0.8, p.hi, 0.6);
  }
  return s;
}

const FORMS = {
  wide_oak, slender_birch, bushy_pine, curved_willow, gnarled_elm,
  tall_cedar, cluster_rowan, spiky_fir, drooping_larch, dense_chestnut,
};

function buildSvg(season, type, variant) {
  const sets = PALETTES[season];
  const pal = sets[(variant - 1) % sets.length];
  const r = makeRandom(
    (Object.keys(FORMS).indexOf(type) + 1) * 100003 +
    (Object.keys(PALETTES).indexOf(season) + 1) * 10007 +
    variant * 997
  );

  // Лёгкий наклон, разный размах кроны и высота — вариации одного силуэта.
  const lean = f((r() * 2 - 1) * 4.2);
  const sx = f(0.89 + r() * 0.2);
  const sy = f(0.94 + r() * 0.11);
  const dx = f((r() * 2 - 1) * 1.6);

  const body = FORMS[type](pal, r);
  const transform = `translate(${dx} 0) translate(32 58) rotate(${lean}) scale(${sx} ${sy}) translate(-32 -58)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="geometricPrecision"><g stroke="${OUTLINE}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"><g transform="${transform}">${body}</g></g></svg>\n`;
}

function main() {
  const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
  let written = 0;
  for (const entry of batch) {
    const match = entry.path.match(/^assets\/trees\/([^/]+)\/([a-z0-9_]+)_(\d+)\.svg$/);
    if (!match) throw new Error('Неожиданный путь в trees-batch.json: ' + entry.path);
    const [, season, type, variant] = match;
    if (!FORMS[type]) throw new Error('Неизвестная форма дерева: ' + type);
    if (!PALETTES[season]) throw new Error('Неизвестный сезон: ' + season);

    const dir = path.join(OUT_BASE, season);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${type}_${variant}.svg`), buildSvg(season, type, Number(variant)), 'utf8');
    written++;
  }
  console.log(`Готово: ${written} SVG-деревьев в assets/trees/`);
}

main();
