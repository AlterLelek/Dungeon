import { CELL, HEROES } from './config.js';
import { state, getTotalAtk, getTotalDef } from './state.js';

// ПРАВКА: добавлен параметр alpha для трупов
function drawCell(ctx, x, y, emoji, size, alpha = 1.0) { 
  ctx.globalAlpha = alpha;
  ctx.font = (size || 20) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; 
  ctx.fillText(emoji, x + CELL / 2, y + CELL / 2); 
  ctx.globalAlpha = 1.0;
}

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

function drawItem(ctx, x, y, type) {
  const cx = x + CELL / 2, cy = y + CELL / 2;
  if (type === 'coin') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fill(); } 
  else if (type === 'star') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a1 = -Math.PI/2 + k*2*Math.PI/5, a2 = a1 + Math.PI/5; ctx.lineTo(cx + Math.cos(a1)*9, cy + Math.sin(a1)*9); ctx.lineTo(cx + Math.cos(a2)*4, cy + Math.sin(a2)*4); } ctx.closePath(); ctx.fill(); } 
  else if (type === 'shield') { ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.moveTo(cx-7, cy-8); ctx.lineTo(cx+7, cy-8); ctx.lineTo(cx+7, cy+2); ctx.quadraticCurveTo(cx, cy+10, cx, cy+10); ctx.quadraticCurveTo(cx-7, cy+2, cx-7, cy+2); ctx.closePath(); ctx.fill(); } 
  else if (type === 'heart') { ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(cx, cy+7); ctx.bezierCurveTo(cx-11, cy-2, cx-7, cy-10, cx, cy-4); ctx.bezierCurveTo(cx+7, cy-10, cx+11, cy-2, cx, cy+7); ctx.fill(); } 
  else if (type === 'scroll') { ctx.fillStyle = "#e5d3a1"; ctx.fillRect(cx-7, cy-8, 14, 16); } 
  else if (type === 'lightning') { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.moveTo(cx+2, cy-10); ctx.lineTo(cx-5, cy+2); ctx.lineTo(cx-1, cy+2); ctx.lineTo(cx-2, cy+10); ctx.lineTo(cx+6, cy-2); ctx.lineTo(cx+2, cy-2); ctx.closePath(); ctx.fill(); } 
  else if (type === 'stun') { ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2 * Math.PI); ctx.stroke(); } 
  else if (type === 'hurricane') { ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 1.5*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 4, Math.PI, 2.5*Math.PI); ctx.stroke(); }
}

export function draw(ctx, bgCanvas) {
  ctx.globalAlpha = 1.0; ctx.clearRect(0, 0, 320, 320);
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0); else { ctx.fillStyle = "#241f1d"; ctx.fillRect(0, 0, 320, 320); }
  
  ctx.strokeStyle = "rgba(90,80,70,0.4)"; ctx.lineWidth = 1;
  for (let i = 0; i <= 320; i += CELL) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 320); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(320, i); ctx.stroke(); }

  if (state.stairs.active) { ctx.fillStyle = "#f59e0b"; ctx.fillRect(state.stairs.x+4, state.stairs.y+4, 24, 24); ctx.fillStyle = "#1e1e24"; drawCell(ctx, state.stairs.x, state.stairs.y, "▼", 16); } 
  else { ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(state.stairs.x+4, state.stairs.y+4, 24, 24); ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.strokeRect(state.stairs.x+4, state.stairs.y+4, 24, 24); ctx.fillStyle = "rgba(255,255,255,0.4)"; drawCell(ctx, state.stairs.x, state.stairs.y, "🔒", 14); }

  // ПРАВКА: Отрисовка трупов (полупрозрачные)
  state.corpses.forEach(c => {
      drawCell(ctx, c.x, c.y, c.type, 22, 0.25);
  });

  state.items.forEach(i => drawItem(ctx, i.x, i.y, i.type));

  ctx.globalAlpha = 1.0;
  state.monsters.forEach(m => {
    if (m.isStunned) { ctx.fillStyle = "rgba(147,51,234,0.5)"; ctx.fillRect(m.px+2, m.py+2, 28, 28); }
    drawCell(ctx, m.px, m.py, m.type, 22); 
    drawBars(ctx, m.px, m.py, m.hp, m.maxHp, m.def, m.atk);
  });

  ctx.globalAlpha = 1.0;
  drawCell(ctx, state.player.px, state.player.py, HEROES[state.heroIdx].emoji, 22);
  drawBars(ctx, state.player.px, state.player.py, state.playerHp, HEROES[state.heroIdx].maxHp, getTotalDef(), getTotalAtk());

  state.floaters.forEach(f => {
    ctx.globalAlpha = f.life / f.maxLife; ctx.fillStyle = f.color; ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1.0; 
}