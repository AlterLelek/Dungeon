// games/mm6_test/game.js
(function() {
  'use strict';
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0;
  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  let t0 = performance.now(), lastHit = 0, hitFx = 0, combo = 0, comboTimer = 0;
  let enemies = [{ name: 'Слизень', hp: 68, maxHp: 68, color: '#2d1b4e', dmgT: 0, lastDmg: 0 }];
  let flamePhase = Math.random() * 6.28;

  document.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); tryHit(); }
    if (e.key.toLowerCase() === 'm' || e.key === 'ь') location.href = '../../index.html';
  });
  cv.addEventListener('pointerdown', tryHit);

  function tryHit() {
    const now = performance.now();
    if (now - lastHit < 400) return;
    lastHit = now; hitFx = 1;
    combo = (now - comboTimer < 2000) ? combo + 1 : 1; comboTimer = now;
    const alive = enemies.find(en => en.hp > 0);
    if (alive) {
      const dmg = 8 + Math.floor(Math.random() * 15);
      alive.hp = Math.max(0, alive.hp - dmg); alive.lastDmg = dmg; alive.dmgT = 1;
    }
  }

  function drawTorch(x, y, t, phase) {
    const flicker = 0.85 + 0.15 * Math.sin(t / 100 + phase) + 0.1 * Math.sin(t / 37 + phase * 2), r = 70 * flicker;
    const grad = ctx.createRadialGradient(x, y, 4, x, y, r);
    grad.addColorStop(0, 'rgba(255,200,80,0.75)'); grad.addColorStop(0.5, 'rgba(255,140,40,0.3)'); grad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 3, y + 6, 6, 20);
    ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(x, y - 22 * flicker); ctx.quadraticCurveTo(x + 12, y - 4, x, y + 8); ctx.quadraticCurveTo(x - 12, y - 4, x, y - 22 * flicker); ctx.fill();
    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.moveTo(x, y - 12 * flicker); ctx.quadraticCurveTo(x + 6, y - 2, x, y + 5); ctx.quadraticCurveTo(x - 6, y - 2, x, y - 12 * flicker); ctx.fill();
  }

  function drawEnemies(t, cx, cy) {
    const alive = enemies.find(en => en.hp > 0);
    if (!alive) {
      ctx.fillStyle = '#e8b64c'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ПОБЕДА!', cx, cy - 40); return;
    }
    const bob = Math.sin(t / 400) * 4, ey = cy - 20 + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(cx, ey + 60, 55, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d1b4e'; ctx.beginPath(); ctx.moveTo(cx - 48, ey + 50); ctx.quadraticCurveTo(cx - 60, ey - 20, cx - 25, ey - 50); ctx.quadraticCurveTo(cx, ey - 60, cx + 25, ey - 50); ctx.quadraticCurveTo(cx + 60, ey - 20, cx + 48, ey + 50); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b3fa0'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = ey + 10 + i * 12; ctx.beginPath(); ctx.moveTo(cx - 35, yy); ctx.quadraticCurveTo(cx, yy - 5, cx + 35, yy + 2); ctx.stroke(); }
    ctx.fillStyle = '#2d1b4e'; ctx.beginPath(); ctx.moveTo(cx - 25, ey - 45); ctx.lineTo(cx - 40, ey - 80); ctx.lineTo(cx - 10, ey - 55); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 25, ey - 45); ctx.lineTo(cx + 40, ey - 80); ctx.lineTo(cx + 10, ey - 55); ctx.closePath(); ctx.fill();
    const glow = 0.8 + 0.2 * Math.sin(t / 200); ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10 * glow;
    ctx.beginPath(); ctx.arc(cx - 14, ey - 20, 6, 0, Math.PI * 2); ctx.arc(cx + 14, ey - 20, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx - 14, ey - 20, 2, 0, Math.PI * 2); ctx.arc(cx + 14, ey - 20, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawHeroUnit(x, y, t, fx, type) {
    const bob = Math.sin(t / (type === 'w' ? 500 : 600) + (type === 'w' ? 0 : 1.5)) * 2, lunge = (type === 'w' && fx > 0) ? -fx * 20 : 0;
    ctx.save(); ctx.translate(x + lunge, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 100, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = type === 'w' ? '#4a90e2' : '#8e44ad'; ctx.beginPath(); ctx.moveTo(-30, 100); ctx.lineTo(30, 100); ctx.lineTo(18, -10); ctx.lineTo(-18, -10); ctx.closePath(); ctx.fill();
    if (type === 'w') {
      ctx.fillStyle = '#4a90e2'; ctx.fillRect(-38, 0, 14, 60); ctx.fillRect(24, 0, 14, 60);
      ctx.fillStyle = '#f5cba7'; ctx.beginPath(); ctx.arc(0, -28, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8b4513'; ctx.beginPath(); ctx.arc(0, -36, 19, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-6, -30, 3, 4); ctx.fillRect(3, -30, 3, 4);
      ctx.save(); ctx.rotate(-0.3 - fx * 0.5); ctx.strokeStyle = '#dddddd'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(80, -40); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(80, -40); ctx.stroke();
      ctx.fillStyle = '#8b4513'; ctx.fillRect(24, 14, 10, 14); ctx.restore();
    } else {
      ctx.fillStyle = '#6c2d8c'; ctx.beginPath(); ctx.arc(0, -25, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5cba7'; ctx.beginPath(); ctx.arc(0, -25, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-6, -27, 3, 4); ctx.fillRect(3, -27, 3, 4);
      ctx.fillStyle = '#dddddd'; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(10, -14); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, 100); ctx.lineTo(30, -50); ctx.stroke();
      const gl = 0.7 + 0.3 * Math.sin(t / 200), grad = ctx.createRadialGradient(30, -55, 2, 30, -55, 20);
      grad.addColorStop(0, 'rgba(200,255,255,' + gl + ')'); grad.addColorStop(0.5, 'rgba(0,200,255,' + (gl * 0.7) + ')'); grad.addColorStop(1, 'rgba(0,100,200,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(30, -55, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#88eeff'; ctx.beginPath(); ctx.arc(30, -55, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function draw(now) {
    requestAnimationFrame(draw); const t = now - t0, cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(cx - 80, cy - 140, 160, 120);
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.35)'; ctx.lineWidth = 2;
    for (let i = 1; i <= 6; i++) { const y = cy + 60 + Math.pow(i / 6, 1.6) * (H - cy - 60); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx + i * (W / 6), H); ctx.lineTo(cx + i * 28, cy - 20); ctx.stroke(); }
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * (W / 4), 0); ctx.lineTo(cx + i * 20, cy - 140); ctx.stroke(); }

    drawTorch(cx - W * 0.35, cy - 40, t, flamePhase); drawTorch(cx + W * 0.35, cy - 40, t, flamePhase + 1.3);
    drawEnemies(t, cx, cy);
    drawHeroUnit(cx - W * 0.22, cy + H * 0.18, t, hitFx, 'w'); drawHeroUnit(cx + W * 0.22, cy + H * 0.18, t, hitFx, 'm');

    if (hitFx > 0) {
      ctx.save(); ctx.globalAlpha = hitFx * 0.6;
      const grad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, 120);
      grad.addColorStop(0, 'rgba(255,255,200,0.9)'); grad.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy - 20, 120, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      hitFx = Math.max(0, hitFx - 0.06);
    }

    if (combo >= 2) {
      ctx.save(); const pulse = 1 + 0.05 * Math.sin(now / 80); ctx.translate(cx, cy - 100); ctx.scale(pulse, pulse);
      ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeText('⚔️ КОМБО x' + combo + '!', 0, 0);
      ctx.fillStyle = '#e8b64c'; ctx.fillText('⚔️ КОМБО x' + combo + '!', 0, 0); ctx.restore();
    }

    const alive = enemies.find(en => en.hp > 0);
    if (alive && alive.dmgT > 0) {
      ctx.save(); ctx.globalAlpha = alive.dmgT; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 5; const y = cy - 50 - (1 - alive.dmgT) * 40;
      ctx.strokeText('-' + alive.lastDmg, cx, y); ctx.fillStyle = '#ff5555'; ctx.fillText('-' + alive.lastDmg, cx, y); ctx.restore();
      alive.dmgT = Math.max(0, alive.dmgT - 0.02);
    }

    const hpY = H - 80;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, hpY, 200, 40); ctx.fillRect(W - 220, hpY, 200, 40);
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2; ctx.strokeRect(20, hpY, 200, 40); ctx.strokeRect(W - 220, hpY, 200, 40);
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#f4d03f'; ctx.fillText('ВОИН', 30, hpY + 6); ctx.fillText('МАГ', W - 210, hpY + 6);
    ctx.fillStyle = '#fff'; ctx.fillText('❤️ 85/100', 30, hpY + 22); ctx.fillText('❤️ 60/60', W - 210, hpY + 22);

    if (alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - 120, 20, 240, 40);
      ctx.strokeStyle = '#d4a017'; ctx.strokeRect(cx - 120, 20, 240, 40);
      ctx.textAlign = 'center'; ctx.fillStyle = '#f4d03f'; ctx.fillText(alive.name, cx, 26);
      ctx.fillStyle = '#3a0a0a'; ctx.fillRect(cx - 100, 44, 200, 8);
      ctx.fillStyle = '#ff3333'; ctx.fillRect(cx - 100, 44, 200 * (alive.hp / alive.maxHp), 8);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(alive.hp + '/' + alive.maxHp, cx + 105, 26);
    }

    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7cc3ff'; ctx.fillText('ВОИН', cx - W * 0.22, cy + H * 0.18 + 140);
    ctx.fillStyle = '#c084ff'; ctx.fillText('МАГ', cx + W * 0.22, cy + H * 0.18 + 140);
  }

  t0 = performance.now(); requestAnimationFrame(draw);
})();
