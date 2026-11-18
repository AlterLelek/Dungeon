import { state } from './state.js';
import { CELL, WORLD, MONSTER_SKINS, ENEMY_BASE, ENEMY_TYPES } from './config.js';

// Полутоновые оттенки пещеры — выбираются заново при каждом запуске игры
const CAVE_TINTS = [
    { name: 'обычный', color: 'rgba(0,0,0,0)' },
    { name: 'зелёный', color: 'rgba(80,145,95,0.14)' },
    { name: 'жёлтый', color: 'rgba(180,150,70,0.12)' },
    { name: 'синий', color: 'rgba(70,115,175,0.13)' },
    { name: 'красный', color: 'rgba(165,80,70,0.12)' },
    { name: 'фиолетовый', color: 'rgba(125,85,165,0.12)' }
];

// Подъём: подвал → каменный коридор → крепость → башня → верх башни
const FLOOR_STAGES = [
    {
        name: 'Подвал', icon: '🕳️', base: '#26211d',
        spotLight: 'rgba(64,54,48,0.35)', spotDark: 'rgba(28,24,22,0.35)',
        cracks: 22, spikes: 12, bricks: 0, vignette: 0.55
    },
    {
        name: 'Каменный коридор', icon: '🧱', base: '#2c2825',
        spotLight: 'rgba(80,72,64,0.30)', spotDark: 'rgba(30,28,26,0.30)',
        cracks: 14, spikes: 6, bricks: 1, vignette: 0.48
    },
    {
        name: 'Крепость', icon: '🏰', base: '#332f2c',
        spotLight: 'rgba(100,90,80,0.25)', spotDark: 'rgba(36,32,30,0.30)',
        cracks: 9, spikes: 2, bricks: 2, torches: true, vignette: 0.42
    },
    {
        name: 'Башня', icon: '🗼', base: '#35343a',
        spotLight: 'rgba(105,105,125,0.22)', spotDark: 'rgba(30,30,38,0.30)',
        cracks: 5, spikes: 0, bricks: 3, windows: true, vignette: 0.38
    },
    {
        name: 'Верх башни', icon: '🌤️', base: '#223750',
        spotLight: 'rgba(255,255,255,0.07)', spotDark: 'rgba(20,35,55,0.12)',
        cracks: 0, spikes: 0, bricks: 0, sky: true, vignette: 0.22
    }
];

export function rollCaveTint() {
    state.caveTint = Math.floor(Math.random() * CAVE_TINTS.length);
    return CAVE_TINTS[state.caveTint];
}

export function getFloorStage() {
    const total = FLOOR_STAGES.length;
    const idx = state.currentFloor - 1;
    return state.gameMode.includes('inf') ? idx % total : Math.min(total - 1, Math.max(0, idx));
}

export function findFreeCell() {
    let attempts = 0;
    while (attempts < 100) {
        let cx = Math.floor(Math.random() * (WORLD / CELL)) * CELL;
        let cy = Math.floor(Math.random() * (WORLD / CELL)) * CELL;
        if (cx === state.player.x && cy === state.player.y) { attempts++; continue; }
        if (state.monsters.some(m => m.x === cx && m.y === cy)) { attempts++; continue; }
        if (state.items.some(i => i.x === cx && i.y === cy)) { attempts++; continue; }
        if (state.stairs.x === cx && state.stairs.y === cy) { attempts++; continue; }
        return { x: cx, y: cy };
    }
    return { x: 0, y: 0 };
}

export function placeMonster(type, hp, atk, behavior, x, y) {
    let base = state.devSettings.monsters[type] || ENEMY_BASE[type] || { def: 0, speed: 1 };

    let skinsList = MONSTER_SKINS[type] || [];
    let selectedSkin = skinsList.length > 0 ? skinsList[Math.floor(Math.random() * skinsList.length)] : null;

    state.monsters.push({
        x: x, y: y, px: x, py: y, startPx: x, startPy: y,
        type: type,
        sprite: selectedSkin,
        hp: hp, maxHp: hp, atk: atk, def: base.def,
        speed: base.speed, behavior: behavior,
        isStunned: false, stunTimer: 0, isMoving: false, moveStartTime: 0,
        actionState: 0, restTimer: 0, slowTurns: 0, hasSplit: false
    });
}

function drawBricks(c, stage) {
    const stepY = 40, stepX = 64;
    c.strokeStyle = `rgba(255,255,255,${0.03 * stage.bricks})`;
    c.lineWidth = 1;
    for (let y = stepY; y < WORLD; y += stepY) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(WORLD, y); c.stroke();
        const offset = (Math.floor(y / stepY) % 2) * (stepX / 2);
        for (let x = offset; x < WORLD; x += stepX) {
            c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(WORLD, y + stepY)); c.stroke();
        }
    }
}

function drawTorches(c) {
    const spots = [[28, 70], [WORLD - 28, 70], [28, WORLD - 70], [WORLD - 28, WORLD - 70]];
    spots.forEach(([x, y]) => {
        const g = c.createRadialGradient(x, y, 2, x, y, 70);
        g.addColorStop(0, 'rgba(251,191,36,0.20)');
        g.addColorStop(1, 'rgba(251,191,36,0)');
        c.fillStyle = g; c.fillRect(x - 70, y - 70, 140, 140);
        c.fillStyle = '#fbbf24'; c.fillRect(x - 2, y - 8, 4, 12);
    });
}

function drawTowerWindows(c) {
    c.fillStyle = 'rgba(125,180,230,0.18)';
    for (let x = 70; x < WORLD - 40; x += 150) {
        c.beginPath();
        c.moveTo(x, 90); c.lineTo(x + 34, 90); c.lineTo(x + 34, 40);
        c.arc(x + 17, 40, 17, 0, Math.PI); c.lineTo(x, 90); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(15,20,30,0.5)'; c.lineWidth = 3; c.stroke();
    }
}

function drawSky(c, stage) {
    const sky = c.createLinearGradient(0, 0, 0, WORLD);
    sky.addColorStop(0, '#1d3552');
    sky.addColorStop(0.55, '#3c5470');
    sky.addColorStop(1, '#202c3b');
    c.fillStyle = sky; c.fillRect(0, 0, WORLD, WORLD);

    for (let i = 0; i < 14; i++) {
        const x = Math.random() * WORLD, y = Math.random() * WORLD * 0.7;
        const r = 20 + Math.random() * 45;
        c.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(180,200,225,0.05)';
        c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, 2 * Math.PI); c.fill();
    }

    // Зубцы башни по нижнему краю
    c.fillStyle = 'rgba(22,26,34,0.9)';
    for (let x = 0; x < WORLD; x += 48) c.fillRect(x, WORLD - 34, 34, 34);
    c.fillRect(0, WORLD - 12, WORLD, 12);
}

export function initFloor() {
    state.monsters = [];
    state.items = [];
    state.corpses = [];
    state.floaters = [];
    state.stairs.active = false;

    const startY = Math.floor((WORLD / CELL) / 2) * CELL;
    state.player.x = CELL; state.player.y = startY;
    state.player.px = CELL; state.player.py = startY;
    state.player.startPx = CELL; state.player.startPy = startY;
    state.player.isMoving = false;
    state.player.healFx = 0;

    let count = 4 + state.settings.monsterAdd;
    for (let i = 0; i < count; i++) {
        let cell = findFreeCell();
        let type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        const base = state.devSettings.monsters[type] || ENEMY_BASE[type];
        let hp = Math.floor(base.hp * (1 + (state.currentFloor - 1) * 0.2));
        let atk = Math.floor(base.atk * (1 + (state.currentFloor - 1) * 0.1));

        if (type === "🐭" && state.monsters.filter(m => m.type === "🐭").length >= 2) {
            type = "💀";
            const skeletonBase = state.devSettings.monsters[type] || ENEMY_BASE[type];
            hp = Math.floor(skeletonBase.hp * (1 + (state.currentFloor - 1) * 0.2));
            atk = Math.floor(skeletonBase.atk * (1 + (state.currentFloor - 1) * 0.1));
        }

        placeMonster(type, hp, atk, 'chase', cell.x, cell.y);
    }

    const stage = FLOOR_STAGES[getFloorStage()];
    const tint = CAVE_TINTS[state.caveTint] || CAVE_TINTS[0];

    const bg = document.createElement('canvas');
    bg.width = WORLD; bg.height = WORLD;
    const c = bg.getContext('2d');

    if (stage.sky) {
        drawSky(c, stage);
    } else {
        c.fillStyle = stage.base;
        c.fillRect(0, 0, WORLD, WORLD);

        for (let i = 0; i < 360; i++) {
            const x = Math.random() * WORLD, y = Math.random() * WORLD;
            const r = 4 + Math.random() * 18;
            c.fillStyle = Math.random() < 0.5 ? stage.spotLight : stage.spotDark;
            c.beginPath();
            c.ellipse(x, y, r, r * (0.5 + Math.random() * 0.7), Math.random() * Math.PI, 0, 2 * Math.PI);
            c.fill();
        }

        c.strokeStyle = 'rgba(12,10,9,0.5)';
        for (let i = 0; i < stage.cracks; i++) {
            let x = Math.random() * WORLD, y = Math.random() * WORLD;
            c.lineWidth = 1 + Math.random() * 1.5;
            c.beginPath(); c.moveTo(x, y);
            for (let k = 0; k < 5; k++) {
                x += (Math.random() - 0.5) * 40;
                y += (Math.random() - 0.5) * 40;
                c.lineTo(x, y);
            }
            c.stroke();
        }

        if (stage.bricks) drawBricks(c, stage);
        if (stage.torches) drawTorches(c);
        if (stage.windows) drawTowerWindows(c);

        c.fillStyle = 'rgba(10,8,8,0.85)';
        for (let i = 0; i < stage.spikes; i++) {
            const x = i * (WORLD / Math.max(1, stage.spikes)) + Math.random() * 20;
            const w = 14 + Math.random() * 18, h = 20 + Math.random() * 36;
            c.beginPath(); c.moveTo(x - w / 2, 0); c.lineTo(x + w / 2, 0); c.lineTo(x, h); c.closePath(); c.fill();
        }
        for (let i = 0; i < Math.ceil(stage.spikes * 0.8); i++) {
            const x = Math.random() * WORLD, w = 16 + Math.random() * 20, h = 14 + Math.random() * 30;
            c.beginPath(); c.moveTo(x - w / 2, WORLD); c.lineTo(x + w / 2, WORLD); c.lineTo(x, WORLD - h); c.closePath(); c.fill();
        }
    }

    // Полутоновый оттенок текущей сессии
    c.fillStyle = tint.color;
    c.fillRect(0, 0, WORLD, WORLD);

    const mid = WORLD / 2;
    const g = c.createRadialGradient(mid, mid, 120, mid, mid, 340);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${stage.vignette})`);
    c.fillStyle = g;
    c.fillRect(0, 0, WORLD, WORLD);

    return bg;
}
