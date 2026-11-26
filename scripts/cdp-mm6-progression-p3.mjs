// CDP-проверка части 3: навыки от эффектов, кулдаун, кап по уровню и тренеры по зданиям.
// Запуск: node scripts/cdp-mm6-progression-p3.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chromePath = process.env.CHROME_PATH ||
  ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!chromePath) { console.error('Chrome не найден; задайте CHROME_PATH'); server.close(); process.exit(1); }
const debugPort = 9740 + Math.floor(Math.random() * 140);
const profile = await mkdtemp(join(tmpdir(), 'mm6-progression-p3-'));
const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const consoleErrors = [], badResponses = [];
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej });
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
let failures = 0;
function check(name, ok, info = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${info ? ' · ' + info : ''}`);
  if (!ok) failures++;
}
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
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  }
  async function waitFor(expr, timeout = 10000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await ev(expr)) return true; await sleep(60); }
    throw new Error('таймаут: ' + expr);
  }
  async function click(x, y) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 10000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);

  const report = await ev('window.__mm6Debug.skillReport()');
  check('отчёт навыков: точки роста есть только в эффектах боя', report.ok,
    JSON.stringify({ ok: report.ok, errors: report.errors, hooks: report.hooks }));

  // Кулдаун: первый эффект даёт очко, повтор в кулдауне — нет, после двух тиков — снова даёт.
  const cd = await ev(`(()=>{
    const g=window.__mm6State(), h=g.party[0]; h.skillXp={}; h.skillCooldown={};
    const a=window.__mm6Debug.awardSkill(0,'blades',1);
    const b=window.__mm6Debug.awardSkill(0,'blades',1);
    window.__mm6Debug.tickSkillCooldowns(); window.__mm6Debug.tickSkillCooldowns();
    const c=window.__mm6Debug.awardSkill(0,'blades',1);
    return {a:a.ok,b:b.ok,c:c.ok,points:h.skillXp.blades,cooldown:h.skillCooldown.blades};
  })()`);
  check('кулдаун разрешает только один прирост за два хода',
    cd.a && !cd.b && cd.c && cd.points === 2 && cd.cooldown === 2, JSON.stringify(cd));

  // Кап ранга: level*2. Предел достигнут — тренер отказывает и не берёт золото.
  const capped = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    h.level=1; h.skills={blades:2}; h.skillXp={blades:10}; g.gold=1000;
    window.__mm6Debug.forceShop('tavern');
    const out=window.__mm6Debug.trainSkill(0,'blades');
    return {ok:out.ok,gold:g.gold,rank:out.state.heroes[0].skills.blades};})()`);
  check('ранг навыка ограничен level*2', !capped.ok && capped.gold === 1000 && capped.rank === 2, JSON.stringify(capped));

  const trained = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    h.level=2; h.skillXp={blades:30}; h.hp=1; h.mp=1; g.clockMinutes=8*60; g.gold=1000;
    const out=window.__mm6Debug.trainSkill(0,'blades');
    return {ok:out.ok,gold:g.gold,clock:g.clockMinutes,hp:h.hp,maxHp:h.maxHp,mp:h.mp,maxMp:h.maxMp,
      rank:out.state.heroes[0].skills.blades,points:out.state.heroes[0].points.blades};})()`);
  check('тренер таверны: ранг за очки, золото и отдых',
    trained.ok && trained.gold === 960 && trained.clock === 16 * 60 &&
    trained.rank === 3 && trained.points === 0 && trained.hp === trained.maxHp && trained.mp === trained.maxMp,
    JSON.stringify(trained));

  // Оплата по зданиям: боевые — таверна, магия — гильдия, ремесло — оружейная.
  const buildings = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    h.level=5; h.skillXp={blades:10,magic:10,spells:10,craft:10}; h.skills={}; g.gold=2000;
    const out={};
    window.__mm6Debug.forceShop('inn'); out.inn=window.__mm6Debug.trainSkill(0,'blades').ok;
    window.__mm6Debug.forceShop('tavern');
    out.tavernCombat=window.__mm6Debug.trainSkill(0,'blades').ok;
    out.tavernMagic=window.__mm6Debug.trainSkill(0,'magic').ok;
    window.__mm6Debug.forceShop('magic'); out.magic=window.__mm6Debug.trainSkill(0,'magic').ok;
    window.__mm6Debug.forceShop('weapons'); out.weapons=window.__mm6Debug.trainSkill(0,'craft').ok;
    out.skills=Object.assign({},h.skills); out.gold=g.gold;
    return out;})()`);
  check('навыки тренируются только в своих зданиях',
    !buildings.inn && buildings.tavernCombat && !buildings.tavernMagic &&
    buildings.magic && buildings.weapons && !!buildings.skills.craft && !!buildings.skills.magic,
    JSON.stringify(buildings));

  // Гильдия магии: «Заклинания» доступны только с рангом leading, повышение за золото и отдых.
  const guild = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    h.level=10; h.skills={}; h.skillXp={spells:10}; h.promotion={guild:'novice',spells:'novice'};
    g.gold=1000; window.__mm6Debug.forceShop('magic');
    const blocked=window.__mm6Debug.trainSkill(0,'spells');
    const goldBefore=g.gold, promote=window.__mm6Debug.promoteGuild(0);
    const trainedSpell=window.__mm6Debug.trainSkill(0,'spells');
    return {blocked:blocked.ok,goldAfterBlock:goldBefore,guild:promote.state.heroes[0].guild,
      gold:g.gold,rank:trainedSpell.state.heroes[0].skills.spells,
      flag:trainedSpell.state.heroes[0],spellsFlag:h.promotion.spells};})()`);
  check('гильдия: spells закрыты новичку и открываются ведущим',
    !guild.blocked && guild.goldAfterBlock === 1000 && guild.guild === 'leading' &&
    guild.gold === 790 && guild.rank === 1 && guild.spellsFlag === 'leading', JSON.stringify(guild));

  // Очков на распределение нет: в сейве только накопленные skillXp и ранги.
  const saved = await ev(`(()=>{if(!window.__mm6Debug.saveWorld()) return null;
    const raw=JSON.parse(localStorage.getItem('mm6_world_save_v1'));
    return {keys:Object.keys(raw).filter(k=>/skill|points|level/i.test(k)).sort(),
      heroKeys:Object.keys(raw.party[0]).filter(k=>/skill|points|level/i.test(k)).sort()};})()`);
  check('нет отдельного пула очков навыков',
    saved && !saved.keys.includes('skillPoints') && !saved.heroKeys.includes('skillPoints') &&
    saved.heroKeys.includes('skillXp') && saved.heroKeys.includes('skills'), JSON.stringify(saved));

  const shopOk = await ev('window.__mm6Debug.shopReport()');
  check('отчёт лавки без ошибок после тренеров навыков', shopOk.ok, JSON.stringify(shopOk.errors));
  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PROGRESSION P3 CHECKS FAILED (${failures})` : 'PROGRESSION P3 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
