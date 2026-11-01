// games/labyrinth/maps.js
const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];

export function genMaze(COLS, ROWS) {
  const g = Array.from({length: ROWS}, () => Array(COLS).fill(1));
  const stack = [[1, 1]]; g[1][1] = 0;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && g[ny][nx] === 1;
    });
    if (dirs.length) {
      const [dx, dy] = pick(dirs);
      g[y + dy / 2][x + dx / 2] = 0; g[y + dy][x + dx] = 0; stack.push([x + dx, y + dy]);
    } else stack.pop();
  }
  for (let i = 0; i < COLS * ROWS / 7; i++) {
    const x = irand(1, COLS - 2), y = irand(1, ROWS - 2);
    if (g[y][x] === 1 && ((g[y][x - 1] === 0 && g[y][x + 1] === 0) || (g[y - 1][x] === 0 && g[y + 1][x] === 0))) g[y][x] = 0;
  }
  return g;
}

export function genRooms(COLS, ROWS) {
  const g = Array.from({length: ROWS}, () => Array(COLS).fill(1)), rooms = [];
  for (let i = 0; i < irand(6, 9); i++) {
    const w = irand(3, 6), h = irand(2, 4), x = irand(1, COLS - w - 2), y = irand(1, ROWS - h - 2);
    rooms.push([x, y, w, h]);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 0;
  }
  for (let i = 1; i < rooms.length; i++) {
    const [x1, y1] = rooms[i - 1], [x2, y2] = rooms[i], cx1 = x1 + 2, cy1 = y1 + 1, cx2 = x2 + 2, cy2 = y2 + 1;
    for (let x = Math.min(cx1, cx2); x <= Math.max(cx1, cx2); x++) g[cy1][x] = 0;
    for (let y = Math.min(cy1, cy2); y <= Math.max(cy1, cy2); y++) g[y][cx2] = 0;
  }
  return g;
}

export function genOpen(COLS, ROWS) {
  const g = Array.from({length: ROWS}, () => Array(COLS).fill(1));
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) g[y][x] = Math.random() < 0.12 ? 1 : 0;
  for (let i = 0; i < 40; i++) g[irand(1, ROWS - 2)][irand(1, COLS - 2)] = 0;
  return g;
}

// ИИ Алгоритм: Поиск кратчайшего шага к цели через волновой BFS
export function bfsStep(sx, sy, tx, ty, grid, COLS, ROWS) {
  if (sx === tx && sy === ty) return null;
  const q = [[sx, sy]], prev = {}, seen = new Set([sx + ',' + sy]);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || grid[ny][nx] || seen.has(k)) continue;
      seen.add(k); prev[k] = [x, y];
      if (nx === tx && ny === ty) {
        let cx = nx, cy = ny;
        while (true) {
          const pp = prev[cx + ',' + cy];
          if (pp[0] === sx && pp[1] === sy) return [cx, cy];
          cx = pp[0]; cy = pp[1];
        }
      }
      q.push([nx, ny]);
    }
  }
  return null;
}
