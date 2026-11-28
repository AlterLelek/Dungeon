// Общая обвязка для новых CDP-харнесов MM6: статический сервер, headless Chrome,
// проверки консоли/ответов и единый формат отчёта.
// Импорт: import { runCdp } from './cdp-lib.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runCdp(label, fn) {
  const root = process.cwd();
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
      const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
      const file = normalize(join(root, rel));
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const chromePath = process.env.CHROME_PATH ||
    ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  if (!chromePath) { server.close(); throw new Error('Chrome не найден; задайте CHROME_PATH'); }

  const debugPort = 9500 + Math.floor(Math.random() * 300);
  const profile = await mkdtemp(join(tmpdir(), 'mm6-harness-'));
  const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });

  let ws, seq = 0;
  const pending = new Map();
  const consoleErrors = [], badResponses = [];
  let failures = 0;

  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function connect() {
    for (let i = 0; i < 80; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        const page = list.find(x => x.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch {}
      await sleep(150);
    }
    throw new Error('CDP не подключился');
  }

  const api = {
    base,
    sleep,
    async ev(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
      }
      return r.result.value;
    },
    async waitFor(expr, timeout = 8000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await api.ev(expr)) return true;
        await sleep(60);
      }
      throw new Error('таймаут: ' + expr);
    },
    // Размер окна меняется намеренно: HUD проверяется на нескольких реальных экранах.
    async viewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    },
    async touchViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    },
    async key(key) {
      const code = key.length === 1 && /[a-z]/i.test(key) ? 'Key' + key.toUpperCase() : key;
      const vk = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    // Скриншоты сохраняются только во временную папку: новых PNG в репозиторий не добавляем.
    async screenshot(file) {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(file, Buffer.from(shot.data, 'base64'));
    },
    async startGame() {
      await send('Page.navigate', { url: base + '/games/mm6/index.html' });
      await api.waitFor('!!window.__mm6Debug', 8000);
      const play = await api.ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();
        return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      await api.click(play.x, play.y);
      await api.waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
    },
    check(name, ok, info = '') {
      console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${info ? ' · ' + info : ''}`);
      if (!ok) failures++;
    },
    consoleErrors,
    badResponses,
  };

  try {
    ws = new WebSocket(await connect());
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
        consoleErrors.push(m.params.args.map(a => a.value || a.description || '').join(' '));
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text);
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400)
        badResponses.push(m.params.response.status + ' ' + m.params.response.url);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
      }
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await fn(api);
    api.check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
    api.check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  } catch (err) {
    failures++;
    console.error('FAIL · исключение харнеса: ' + (err?.stack || err));
  } finally {
    try { ws?.close(); } catch {}
    chrome.kill();
    server.close();
  }
  console.log(failures ? `${label}: ${failures} ошибок` : `${label}: все проверки пройдены`);
  process.exit(failures ? 1 : 0);
}
