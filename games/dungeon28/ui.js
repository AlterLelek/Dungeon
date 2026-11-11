import { CELL, HEROES, WARRIOR_WEAPONS, MAGE_WEAPONS, ARCHER_WEAPONS, ENEMY_BASE } from './config.js';
import { state, getTotalAtk, getTotalDef } from './state.js';

// Кэш для хранения загруженных картинок
const spriteCache = {};

// Предзагрузка спрайтов при старте
export function preloadSprites() {
    const paths = [
        ...HEROES.map(h => h.sprite),
        "assets/sprites/monsters/orc.png", // Пример для монстра
        "assets/sprites/items/staff.png",
        "assets/sprites/items/shield.png",
        "assets/sprites/items/star.png",
        "assets/sprites/items/lightning.png",
        "assets/sprites/ui/coin.png",
        "assets/sprites/ui/castle.png"
    ];

    paths.forEach(path => {
        if (path && !spriteCache[path]) {
            const img = new Image();
            img.src = path;
            spriteCache[path] = img;
        }
    });
}

function drawCell(ctx, x, y, emoji, size, alpha = 1.0) { 
  ctx.globalAlpha = alpha;
  ctx.font = (size || 20) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; 
  ctx.fillText(emoji, x + CELL / 2, y + CELL / 2); 
  ctx.globalAlpha = 1.0;
}

// Универсальная функция отрисовки (Спрайт или Эмодзи)
function drawSpriteOrEmoji(ctx, x, y, emoji, spritePath, size = 24, alpha = 1.0) {
    if (spritePath && spriteCache[spritePath] && spriteCache[spritePath].complete) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(spriteCache[spritePath], x + (CELL - size)/2, y + (CELL - size)/2, size, size);
        ctx.globalAlpha = 1.0;
    } else {
        drawCell(ctx, x, y, emoji, size + 2, alpha);
    }
}

// ... (Функции drawBars, drawTombstone, drawStairs остаются без изменений) ...
function drawBars(ctx, x, y, hp, maxHp, def, atk) {
  const frac = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = "#4b5563"; ctx.fillRect(x + 4, y + 1, 24, 3);
  ctx.fillStyle = frac > 0.5 ? "#22c55e" : "#ef4444"; ctx.fillRect(x + 4, y + 1, 24 * frac, 3);
  ctx.fillStyle = def > 0 ? "#3b82f6" : "#4b5563"; ctx.beginPath(); ctx.arc(x + 7, y + 25, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = "#fff"; ctx.font = "8px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(def, x + 7, y + 26);
  ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(x + 25, y + 25, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = "#7f1d1d"; ctx.stroke(); ctx.fillText(atk, x + 25, y + 26);
}

function drawTombstone(ctx, x, y) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.ellipse(x + 16, y + 28, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9ca3af"; ctx.beginPath(); ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + 8, y + 14); ctx.arc(x + 16, y + 14, 8, Math.PI, 0); ctx.lineTo(x + 24, y + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.fillRect(x + 14, y + 9, 4, 14); ctx.fillRect(x + 9, y + 14, 14, 4); 
}

function drawStairs(ctx) {
    if (state.stairs.active) {
        ctx.fillStyle = "#f59e0b"; ctx.fillRect(state.stairs.x + 4, state.stairs.y + 4, 24, 24);
        ctx.fillStyle = "#1e1e24"; ctx.beginPath(); ctx.moveTo(state.stairs.x + 16, state.stairs.y + 24); ctx.lineTo(state.stairs.x + 8, state.stairs.y + 10); ctx.lineTo(state.stairs.x + 24, state.stairs.y + 10); ctx.closePath(); ctx.fill();
    } else {
        ctx.fillStyle = "#4b5563"; ctx.fillRect(state.stairs.x + 4, state.stairs.y + 4, 24, 24);
        ctx.strokeStyle = "#111827"; ctx.lineWidth = 2; ctx.strokeRect(state.stairs.x + 4, state.stairs.y + 4, 24, 24);
        ctx.fillStyle = "#9ca3af"; ctx.fillRect(state.stairs.x + 11, state.stairs.y + 14, 10, 8); ctx.beginPath(); ctx.arc(state.stairs.x + 16, state.stairs.y + 14, 4, Math.PI, 0); ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function drawItem(ctx, x, y, type) {
  const cx = x + CELL / 2, cy = y + CELL / 2;
  // Ищем спрайт для предмета
  let spritePath = null;
  if (type === 'star') spritePath = "assets/sprites/items/star.png";
  if (type === 'shield') spritePath = "assets/sprites/items/shield.png";
  if (type === 'lightning') spritePath = "assets/sprites/items/lightning.png";

  if (spritePath && spriteCache[spritePath] && spriteCache[spritePath].complete) {
      ctx.drawImage(spriteCache[spritePath], x + 4, y + 4, 24, 24);
      return;
  }

  // Если спрайта нет, рисуем как раньше
  if (type === 'coin') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fill(); } 
  else if (type === 'star') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a1 = -Math.PI/2 + k*2*Math.PI/5, a2 = a1 + Math.PI/5; ctx.lineTo(cx + Math.cos(a1)*9, cy + Math.sin(a1)*9); ctx.lineTo(cx + Math.cos(a2)*4, cy + Math.sin(a2)*4); } ctx.closePath(); ctx.fill(); } 
  else if (type === 'shield') { ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.moveTo(cx-7, cy-8); ctx.lineTo(cx+7, cy-8); ctx.lineTo(cx+7, cy+2); ctx.quadraticCurveTo(cx, cy+10, cx, cy+10); ctx.quadraticCurveTo(cx-7, cy+2, cx-7, cy+2); ctx.closePath(); ctx.fill(); } 
  else if (type === 'heart') { ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(cx, cy+7); ctx.bezierCurveTo(cx-11, cy-2, cx-7, cy-10, cx, cy-4); ctx.bezierCurveTo(cx+7, cy-10, cx+11, cy-2, cx, cy+7); ctx.fill(); } 
  else if (type === 'mana') { ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fill(); ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 2; ctx.stroke(); } 
  else if (type === 'heal') { ctx.fillStyle = "#22c55e"; ctx.fillRect(cx-2, cy-7, 4, 14); ctx.fillRect(cx-7, cy-2, 14, 4); } 
  else if (type === 'lightning') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.moveTo(cx+2, cy-10); ctx.lineTo(cx-5, cy+2); ctx.lineTo(cx-1, cy+2); ctx.lineTo(cx-2, cy+10); ctx.lineTo(cx+6, cy-2); ctx.lineTo(cx+2, cy-2); ctx.closePath(); ctx.fill(); } 
  else if (type === 'stun') { ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2 * Math.PI); ctx.stroke(); } 
  else if (type === 'hurricane') { ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 1.5*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 4, Math.PI, 2.5*Math.PI); ctx.stroke(); }
}

export function draw(ctx, bgCanvas) {
  ctx.globalAlpha = 1.0; ctx.clearRect(0, 0, 320, 320);
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0); else { ctx.fillStyle = "#241f1d"; ctx.fillRect(0, 0, 320, 320); }
  
  ctx.strokeStyle = "rgba(90,80,70,0.4)"; ctx.lineWidth = 1;
  for (let i = 0; i <= 320; i += CELL) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 320); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(320, i); ctx.stroke(); }

  drawStairs(ctx);
  state.corpses.forEach(c => { drawTombstone(ctx, c.x, c.y); });
  
  state.items.forEach(i => {
      let alpha = 1.0;
      if (i.life !== undefined && i.life <= 5) alpha = (Math.floor(i.life) % 2 === 0) ? 0.4 : 1.0;
      ctx.globalAlpha = alpha;
      drawItem(ctx, i.x, i.y, i.type);
      ctx.globalAlpha = 1.0;
  });

  if (state.skeletonAlly) {
      drawCell(ctx, state.skeletonAlly.x, state.skeletonAlly.y, "💀", 22);
      drawBars(ctx, state.skeletonAlly.x, state.skeletonAlly.y, state.skeletonAlly.hp, state.skeletonAlly.maxHp, 0, 0);
  }

  ctx.globalAlpha = 1.0;
  state.monsters.forEach(m => {
    let sprite = m.type === "👺" ? "assets/sprites/monsters/orc.png" : null; // Пока только орк
    
    if (m.isStunned) { ctx.fillStyle = "rgba(56,189,248,0.3)"; ctx.beginPath(); ctx.arc(m.px + CELL/2, m.py + CELL/2, 14, 0, Math.PI*2); ctx.fill(); }
    
    if (m.spinFx > 0) {
        ctx.save(); ctx.translate(m.px + CELL/2, m.py + CELL/2); ctx.rotate(m.spinFx * Math.PI * 4); ctx.translate(-(m.px + CELL/2), -(m.py + CELL/2));
        drawSpriteOrEmoji(ctx, m.px, m.py, m.type, sprite, 24); 
        ctx.restore(); m.spinFx -= 0.05; 
    } else {
        drawSpriteOrEmoji(ctx, m.px, m.py, m.type, sprite, 24); 
    }
    
    if (m.lightningFx > 0) {
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.px + 10, m.py - 10); ctx.lineTo(m.px + 22, m.py + 8); ctx.lineTo(m.px + 12, m.py + 16); ctx.lineTo(m.px + 20, m.py + 32); ctx.stroke();
        ctx.fillStyle = "rgba(251,191,36,0.4)"; ctx.fillRect(m.px, m.py, CELL, CELL); m.lightningFx -= 0.05;
    }
    drawBars(ctx, m.px, m.py, m.hp, m.maxHp, m.def, m.atk);
  });

  ctx.globalAlpha = 1.0;
  const currentHero = HEROES[state.heroIdx];
  drawSpriteOrEmoji(ctx, state.player.px, state.player.py, currentHero.emoji, currentHero.sprite, 26);
  drawBars(ctx, state.player.px, state.player.py, state.playerHp, state.devSettings.heroes[state.heroIdx].maxHp, getTotalDef(), getTotalAtk());

  if (state.player.healFx > 0) {
      ctx.strokeStyle = "rgba(34,197,94," + state.player.healFx + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(state.player.px + CELL/2, state.player.py + CELL/2, (1.0 - state.player.healFx) * 30, 0, Math.PI*2); ctx.stroke();
      state.player.healFx -= 0.03;
  }

  state.floaters.forEach(f => {
    ctx.globalAlpha = f.life / f.maxLife; ctx.fillStyle = f.color; ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1.0; 
}