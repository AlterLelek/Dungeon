// CDP-проверка гильдий, ратуши, носки, тиров ёмкостей, трав и журнала заданий.
// Запуск: node scripts/cdp-mm6-guilds-quests.mjs
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
const debugPort = 9960 + Math.floor(Math.random() * 30);
const profile = await mkdtemp(join(tmpdir(), 'mm6-guilds-quests-'));
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

  // Все отчёты нового функционала должны быть без ошибок.
  const reports = await ev(`(()=>{const d=window.__mm6Debug;const keys=['carryingReport','guildReport','herbReport','tierReport','questReport','containerReport'];
    return Object.fromEntries(keys.map(k=>{const r=d[k]();return [k,{ok:r.ok,errors:r.errors||[]}];}));})()`);
  check('новые отчёты без ошибок', Object.values(reports).every(r => r.ok), JSON.stringify(reports));

  // Носка: ранг 1 — сумка, 2 — сундук, 3 — пояс; карманы и мошна всегда.
  const novice = await ev('window.__mm6Debug.carryingReport()');
  check('новичок получает одну ёмкость и карманы', novice.ok && novice.heroes.every(h => h.rank === 1 &&
    JSON.stringify(h.carrying) === JSON.stringify(['bag'])) && novice.available.includes('pockets') &&
    novice.available.includes('purse') && novice.containers.find(c => c.id === 'belt').locked,
    JSON.stringify({ heroes: novice.heroes, available: novice.available }));
  await ev(`(()=>{const g=window.__mm6State();g.party.forEach((h,i)=>window.__mm6Debug.setGuildRank(i,'expert'));return true;})()`);
  const expert = await ev('window.__mm6Debug.carryingReport()');
  check('эксперт получает сумку, сундук и пояс', expert.ok && expert.heroes.every(h => h.rank === 3 &&
    JSON.stringify(h.carrying) === JSON.stringify(['bag', 'chest', 'belt'])) &&
    expert.containers.filter(c => ['bag', 'chest', 'belt'].includes(c.id)).every(c => !c.locked),
    JSON.stringify(expert.heroes));
  const auto = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    const before=(h.skillXp||{}).carrying||0;
    const awarded=window.__mm6Debug.awardSkill(0,'carrying',99);
    window.__mm6Debug.forceShop('magic');
    const trained=window.__mm6Debug.trainSkill(0,'carrying');
    return {before,after:(h.skillXp||{}).carrying||0,awarded:awarded.ok,trained:trained.ok};})()`);
  check('носка не тренируется и не качается боем', auto.before === auto.after && !auto.awarded && !auto.trained, JSON.stringify(auto));

  // Выбывший герой сохраняет все вещи: сумка и экипировка не меняются после hp=0.
  const dead = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    const uid=window.__mm6Debug.addItemBySpec({id:'dead-herb',type:'herb',name:'Трава павшего',icon:'🌿',effect:'hp',value:1,cost:1,sell:1,owner:0});
    h.equip.weapon=uid;
    const before={count:g.bag.length,uids:g.bag.map(i=>i.uid).sort(),owners:g.bag.map(i=>i.owner||null),equip:JSON.stringify(h.equip)};
    window.__mm6Debug.setHeroHp(0,0);
    const after={count:g.bag.length,uids:g.bag.map(i=>i.uid).sort(),owners:g.bag.map(i=>i.owner||null),equip:JSON.stringify(h.equip)};
    const r=window.__mm6Debug.carryingReport();
    return {before,after,dead:r.dead,keeps:r.deadKeepsGear};})()`);
  check('выбывший герой сохраняет вещи, owner и экипировку', dead.keeps && dead.dead.length === 1 &&
    dead.dead[0].kept && JSON.stringify(dead.before) === JSON.stringify(dead.after), JSON.stringify(dead.dead));
  await ev('window.__mm6Debug.setHeroHp(0,100)');

  // Ранги: пороги, скидка, гейт магии и fruits.
  const guild = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    window.__mm6Debug.setGuildPoints(0,30);
    const half=window.__mm6Debug.guildReport().costs.leading[1];
    window.__mm6Debug.setGuildPoints(0,60);
    const free=window.__mm6Debug.guildReport().costs.leading[2];
    h.promotion={guild:'novice',spells:'novice'};
    const gold=g.gold;
    const promoted=window.__mm6Debug.promoteGuild(0);
    const r=window.__mm6Debug.guildReport();
    return {half,free,promoted:promoted.ok,goldBefore:gold,goldAfter:g.gold,rank:h.promotion.guild,
      spells:h.promotion.spells,fruits:r.fruits,spellTiers:r.spellTiers};})()`);
  check('очки заданий дают скидку 25% и бесплатный ранг', guild.half === 150 && guild.free === 0 &&
    guild.promoted && guild.rank === 'leading' && guild.spells === 'leading' && guild.goldAfter === guild.goldBefore,
    JSON.stringify(guild));
  check('гейт магии привязан к кругу заклинаний', guild.spellTiers.weak === 'novice' &&
    guild.spellTiers.medium === 'leading' && guild.spellTiers.strong === 'expert' && guild.fruits.length >= 3,
    JSON.stringify({ tiers: guild.spellTiers, fruits: guild.fruits }));
  const gate = await ev(`(()=>{const g=window.__mm6State(),h=g.party[0];
    const saved={rank:h.promotion.guild,spells:h.spells.slice()};
    h.spells=[]; h.promotion={guild:'novice',spells:'novice'};
    window.__mm6Debug.forceShop('magic');
    const novice=document.getElementById('shopList').textContent;
    window.__mm6Debug.setGuildRank(0,'leading'); h.spells=[];
    window.__mm6Debug.forceShop('magic');
    const leading=document.getElementById('shopList').textContent;
    window.__mm6Debug.setGuildRank(0,saved.rank); h.spells=saved.spells;
    return {noviceMedium:novice.includes('⚠ leading'),noviceStrong:novice.includes('⚠ expert'),
      leadingMedium:!leading.includes('⚠ leading'),leadingStrong:leading.includes('⚠ expert')};})()`);
  check('заклинания старших кругов закрыты при обучении по рангу', gate.noviceMedium &&
    gate.noviceStrong && gate.leadingMedium && gate.leadingStrong, JSON.stringify(gate));

  // Ратуша: задание из лавки, прогресс по логовищу, сдача и награда.
  const hall = await ev(`(()=>{const d=window.__mm6Debug;d.forceShop('hall');
    const text=document.getElementById('shopList').textContent;
    const r=d.questReport();
    return {ok:r.ok,hallMap:r.hallMap,tagged:r.tagged,hasTitle:text.includes('Мыши у амбара'),
      hasJournalButton:text.includes('Открыть журнал')};})()`);
  check('ратуша — отдельный экран с заказами лавок', hall.ok && hall.hasTitle && hall.hasJournalButton &&
    hall.hallMap >= 0 && hall.tagged > 0, JSON.stringify(hall));
  await ev('window.__mm6Debug.acceptQuest("q_mouse_market")');
  const accepted = await ev(`(()=>{const r=window.__mm6Debug.questReport();const q=r.quests.find(x=>x.id==='q_mouse_market');
    return {accepted:q.accepted,done:q.done,journal:r.journal,report:r.ok};})()`);
  check('приём задания пишется в журнал', accepted.accepted && !accepted.done &&
    accepted.journal.active === 1 && accepted.journal.entries.includes('q_mouse_market'), JSON.stringify(accepted));
  await ev('window.__mm6Debug.forceQuestKill("mouse_nest")');
  const ready = await ev(`(()=>{const q=window.__mm6Debug.questReport().quests.find(x=>x.id==='q_mouse_market');
    return {ready:q.progress.ready,target:q.progress.target,kills:q.progress.kills};})()`);
  check('зачистка логовища и цель отслеживаются', ready.ready && ready.target && ready.kills > 0, JSON.stringify(ready));
  const turnedIn = await ev(`(()=>{const g=window.__mm6State(),gold=g.gold,pts=g.party[0].guildPoints||0;
    const cap=g.containers.bag.capacity;
    const ok=window.__mm6Debug.completeQuest('q_mouse_market');
    const r=window.__mm6Debug.questReport(),q=r.quests.find(x=>x.id==='q_mouse_market');
    return {ok,done:q.done,goldGain:g.gold-gold,pointsGain:(g.party[0].guildPoints||0)-pts,
      capGain:g.containers.bag.capacity-cap,tier:g.containers.bag.tier,journal:r.journal};})()`);
  check('сдача даёт золото, очки гильдии и усиленную ёмкость', turnedIn.ok && turnedIn.done &&
    turnedIn.goldGain === 45 && turnedIn.pointsGain === 30 && turnedIn.capGain >= 4 &&
    turnedIn.tier === 'reinforced', JSON.stringify(turnedIn));
  check('сдача переносит запись из активных в завершённые', turnedIn.journal.active === 0 &&
    turnedIn.journal.done === 1, JSON.stringify(turnedIn.journal));

  // Отдельный экран журнала заданий.
  const journalUi = await ev(`(()=>{window.__mm6Debug.toggleQuestJournal(true);
    document.querySelector('#questJournalTabs button[data-qtab="done"]').click();
    const el=document.getElementById('questJournal');
    return {visible:!el.classList.contains('hidden'),tabs:[...document.querySelectorAll('#questJournalTabs button')].map(b=>b.textContent),
      list:document.getElementById('questJournalList').textContent};})()`);
  check('журнал заданий открывается отдельным экраном', journalUi.visible && journalUi.tabs.length === 2 &&
    journalUi.list.includes('Мыши у амбара'), JSON.stringify(journalUi));
  await ev('window.__mm6Debug.toggleQuestJournal(false)');

  // Тиры: миграция старых ёмкостей, magic-поле и крафт зачарованной сумки.
  const tiers = await ev(`(()=>{const d=window.__mm6Debug,r=d.tierReport();
    const before=window.__mm6State().containers.bag.capacity;
    const set=d.setContainerTier('bag','enchanted');
    const after=window.__mm6State().containers.bag;
    return {ok:r.ok,tiers:r.tiers,set,before,after:after.capacity,weight:after.weight,tier:after.tier,
      magic:Object.keys(after.magic||{})};})()`);
  check('тиры дают больше слотов и меньший вес', tiers.ok && tiers.set && tiers.after > tiers.before &&
    tiers.tier === 'enchanted' && tiers.weight === 0.2 && tiers.tiers[3].slots === 6,
    JSON.stringify({ before: tiers.before, after: tiers.after, weight: tiers.weight, errors: tiers.errors }));
  const herbs = await ev('window.__mm6Debug.herbReport()');
  check('20 трав с ролями, дефицит в магической лавке и новые рецепты', herbs.ok && herbs.count === 20 &&
    herbs.roles.length === 4 && herbs.scarce.includes('pine_needle') &&
    ['Травяной чай', 'Корневой отвар', 'Серебряный настой'].every(n => herbs.recipes.includes(n)),
    JSON.stringify({ count: herbs.count, roles: herbs.roles, scarce: herbs.scarce, errors: herbs.errors }));
  const crafted = await ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.addItemBySpec({id:'nettle',type:'herb',name:'Крапива',icon:'🌿',effect:'hp',value:6,cost:1,sell:1});
    d.addItemBySpec({id:'chamomile',type:'herb',name:'Ромашка',icon:'🌼',effect:'mana',value:4,cost:1,sell:1});
    const tea=d.craftRecipe('herb_tea');
    const hasTea=g.bag.some(i=>i.id==='potion_mp');
    d.addItemBySpec({id:'crystal',type:'crystal',name:'Кристалл',icon:'💎',cost:7,sell:6});
    d.addItemBySpec({id:'silverleaf',type:'herb',name:'Серебряный лист',icon:'🍃',effect:'curse',value:1,cost:5,sell:2});
    d.addItemBySpec({id:'cloth',type:'material',name:'Ткань',icon:'🧵',cost:3,sell:1});
    const bag=d.craftRecipe('craft_enchanted_bag');
    const uid=(g.bag.find(i=>i.type==='container'&&i.containerKind==='bag')||{}).uid||null;
    const installed=uid?d.installContainerItem(uid):false;
    return {tea,hasTea,bag,installed,tier:g.containers.bag.tier};})()`);
  check('новые рецепты трав и зачарование сумки работают', crafted.tea && crafted.hasTea &&
    crafted.bag && crafted.installed && crafted.tier === 'enchanted', JSON.stringify(crafted));

  // Сейв: версия 3, задания и журнал сохраняются; старый сейв мигрирует без потерь.
  const save = await ev(`(()=>{window.__mm6Debug.saveWorld();
    const raw=JSON.parse(localStorage.getItem('mm6_world_save_v1'));
    return {version:raw.version,quests:!!raw.quests,journal:!!raw.journal,
      done:(raw.journal.done||[]).length,points:raw.party[0].guildPoints,carrying:raw.party[0].carrying};})()`);
  check('версия 3, задания и журнал попадают в сейв', save.version === 3 && save.quests && save.journal &&
    save.done === 1 && save.points >= 30 && save.carrying.length >= 2, JSON.stringify(save));
  const migrated = await ev(`(()=>{const k='mm6_world_save_v1',raw=JSON.parse(localStorage.getItem(k));
    raw.version=2; delete raw.containers; delete raw.quests; delete raw.journal;
    raw.party.forEach(h=>{delete h.guildPoints;delete h.carrying;delete h.beltSlot;});
    localStorage.setItem(k,JSON.stringify(raw));
    const before=raw.bag.length;
    const ok=window.__mm6Debug.loadWorld();
    const g=window.__mm6State(),c=window.__mm6Debug.containerReport(),car=window.__mm6Debug.carryingReport();
    return {ok,before,after:g.bag.length,version:g.version,quests:!!g.quests,journal:!!g.journal,
      tiers:c.containers.map(x=>x.tier),carry:car.heroes.map(x=>x.carrying.length),containerOk:c.ok};})()`);
  check('старый сейв мигрирует: тиры, носка, задания и журнал', migrated.ok && migrated.before === migrated.after &&
    migrated.version === 3 && migrated.quests && migrated.journal && migrated.containerOk &&
    migrated.tiers.every(t => t === 'rusty') && migrated.carry.every(n => n >= 2), JSON.stringify(migrated));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `GUILDS QUESTS CHECKS FAILED (${failures})` : 'GUILDS QUESTS CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
