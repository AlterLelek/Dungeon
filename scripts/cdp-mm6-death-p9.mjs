// CDP-проверка девятой части: тела павших, очередь ходов и воскрешение только в церкви.
// Запуск: node scripts/cdp-mm6-death-p9.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('DEATH PART 9', async api => {
  await api.startGame();

  const church = await api.ev(`window.__mm6Debug.churchReport()`);
  api.check('цена churches: максимум 10 и 10% золота',
    church.ok === true && church.costs.at0 === 10 && church.costs.at100 === 10 &&
    church.costs.at500 === 50,
    JSON.stringify(church));

  await api.ev(`(()=>{const d=window.__mm6Debug;d.setHeroHp(0,0);
    const list=['Мышь','Мышь'].map(name=>({name,alive:true,hp:1000,maxHp:1000,atk:1,defVal:1,
      speed:1,def:{},gold:[0,0]}));
    d.startBattle(list);return true;})()`);
  await api.sleep(90);

  const corpse = await api.ev(`window.__mm6Debug.drawBattleNow()`);
  api.check('тело павшего героя лежит на поле до конца боя',
    corpse.inBattle === true && corpse.ended === false && corpse.drawn.includes(0),
    JSON.stringify(corpse));

  const queue = await api.ev(`window.__mm6Debug.turnQueueReport()`);
  const dead = queue.rows.find(r => r.side === 'hero' && r.hero === 0);
  api.check('павший герой в очереди затемнён, зачёркнут и не активен',
    !!dead && dead.dead === true && dead.active === false &&
    /line-through/.test(dead.decoration) && dead.opacity < .6,
    JSON.stringify(dead));
  api.check('живые герои и враги остаются в очереди без пометки павшего',
    queue.rows.filter(r => r.side === 'hero' && r.hero !== 0).every(r => r.dead === false) &&
    queue.rows.filter(r => r.side === 'enemy').every(r => r.dead === false),
    JSON.stringify(queue.rows.map(r => ({ side: r.side, hero: r.hero, dead: r.dead }))));

  const skipped = await api.ev(`(()=>{const g=window.__mm6State(),b=g.battle;
    b.end=null; b.busy=false; b.turn='hero';
    b.units.forEach(u=>{u.next=(u.side==='hero'&&u.idx>0)?1:9999;});
    window.__mm6Debug.nextTurn();
    return {heroIdx:b.heroIdx,turn:b.turn};})()`);
  api.check('ход автоматически пропускает мёртвого героя',
    skipped.turn === 'hero' && skipped.heroIdx !== 0, JSON.stringify(skipped));

  const enemyDeath = await api.ev(`(()=>{const g=window.__mm6State(),b=g.battle;
    b.enemies[0].hp=0; b.enemies[0].alive=false;
    window.__mm6Debug.setPartyGold(g.gold);
    const q=window.__mm6Debug.turnQueueReport(), c=window.__mm6Debug.drawBattleNow();
    return {enemyRows:q.rows.filter(r=>r.side==='enemy').map(r=>r.name),drawn:c.drawn};})()`);
  api.check('гибель врага по-прежнему убирает его из очереди, тело не рисуется',
    enemyDeath.enemyRows.every(n => !/^МЫШЬ 1$/.test(n)) &&
    enemyDeath.drawn.every(i => typeof i === 'number'),
    JSON.stringify(enemyDeath));

  const ended = await api.ev(`(()=>{const b=window.__mm6State().battle;
    b.end='win';return window.__mm6Debug.drawBattleNow();})()`);
  api.check('после завершения боя тело убирается',
    ended.ended === true && ended.drawn.length === 0, JSON.stringify(ended));
  await api.ev(`window.__mm6Debug.closeBattle()`);

  const rest = await api.ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.setHeroHp(0,0); d.setHeroHp(1,1); d.restParty(1);
    return {dead:g.party[0].hp,living:g.party[1].hp,max:g.party[1].maxHp};})()`);
  api.check('отдых не воскрешает, но лечит живых',
    rest.dead === 0 && rest.living === rest.max, JSON.stringify(rest));

  const potion = await api.ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.setHeroHp(0,0); g.invHero=0;
    const uid=d.addItemBySpec({id:'potion_hp',type:'potion',name:'Зелье HP',icon:'🧪',cost:10,sell:5,heal:50});
    const ok=d.useItem(uid);
    return {ok,hp:g.party[0].hp,toast:document.getElementById('toast').textContent};})()`);
  api.check('зелье не воскрешает павшего героя',
    potion.ok === false && potion.hp === 0 && /церковь/.test(potion.toast), JSON.stringify(potion));

  const healAll = await api.ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.setHeroHp(0,0); d.setHeroHp(1,5); g.invHero=0;
    const uid=d.addItemBySpec({id:'potion_all',type:'potion',name:'Зелье всем',icon:'🧪',cost:10,sell:5,healAll:30});
    d.useItem(uid);
    return {dead:g.party[0].hp,living:g.party[1].hp};})()`);
  api.check('зелье для всех лечит только живых',
    healAll.dead === 0 && healAll.living > 5, JSON.stringify(healAll));

  const revived = await api.ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.setPartyGold(500); d.setHeroHp(0,0); d.setHeroHp(1,0);
    g.shopOpen=true; g.shopType='church';
    const before=g.gold, report=d.churchReport(), ok=d.resurrectAtChurch();
    return {ok,before,after:g.gold,hp:[g.party[0].hp,g.party[1].hp],report};})()`);
  api.check('церковь воскрешает всех павших за десятину',
    revived.ok === true && revived.before - revived.after === 50 &&
    revived.hp.every(v => v > 0) && revived.report.ok === true,
    JSON.stringify({ ok: revived.ok, before: revived.before, after: revived.after, hp: revived.hp }));
});
