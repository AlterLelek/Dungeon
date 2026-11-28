// Часть 4: живые диалоги NPC — портреты, спрайт с частями тела и жесты по типу.
// Запуск: node scripts/cdp-mm6-npc-dialogue.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('NPC DIALOGUE PART 4', async api => {
  await api.startGame();
  await api.sleep(180);

  api.check('флаг отключения жестов доступен в настройках',
    await api.ev(`!!document.getElementById('setNpcGestures')`));

  await api.ev(`window.__mm6Debug.forceShop('tavern');
    window.__mm6Debug.npcSay('Слух: в лесу видели старую башню','Хозяин таверны','tavern');`);
  await api.sleep(90);
  const tavern = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('реплика таверны открывает диалог внутри окна лавки',
    !!tavern && tavern.visible && tavern.inShop && tavern.speaker === 'Хозяин таверны' &&
    /старую башню/.test(tavern.text), JSON.stringify({ visible: tavern?.visible, inShop: tavern?.inShop, speaker: tavern?.speaker, text: tavern?.text }));
  api.check('в диалоге видны портрет героя и крупный портрет NPC',
    !!tavern.heroFaceSrc && /\/portraits\//.test(tavern.heroFaceSrc) &&
    !!tavern.npcPortraitSrc && /\/portraits\//.test(tavern.npcPortraitSrc) &&
    tavern.heroRect.w >= 30 && tavern.heroRect.h >= 30,
    JSON.stringify({ hero: tavern.heroFaceSrc, npc: tavern.npcPortraitSrc, rect: tavern.heroRect }));
  api.check('портрет выбранного героя стоит снизу слева от текста',
    tavern.heroRect.x < tavern.textRect.x && tavern.heroRect.y + tavern.heroRect.h > tavern.textRect.y,
    JSON.stringify({ hero: tavern.heroRect, text: tavern.textRect }));
  api.check('SVG-спрайт NPC собран из отдельных частей тела',
    ['npcBody', 'npcHead', 'npcArmLeft', 'npcArmRight'].every(id => tavern.groups.includes(id)) &&
    tavern.spriteRect.w >= 40, JSON.stringify({ groups: tavern.groups, sprite: tavern.spriteRect }));
  api.check('таверна использует жест «тост» и анимация запущена',
    tavern.gesture === 'toast' && tavern.animationName !== 'none' && tavern.gesturesEnabled,
    JSON.stringify({ gesture: tavern.gesture, animation: tavern.animationName }));

  const gestures = await api.ev(`Object.fromEntries(['weapons','forge','magic','jeweler','market','tavern','church','hall','house']
    .map(k => [k, window.__mm6Debug.npcGestureFor(k)]))`);
  api.check('разные типы NPC получают разные жесты',
    new Set(Object.values(gestures)).size >= 6 && gestures.forge === 'hammer' &&
    gestures.magic === 'cast' && gestures.church === 'bless' && gestures.hall === 'point' &&
    gestures.house === 'shrug', JSON.stringify(gestures));

  const animated = [];
  for (const kind of ['forge', 'magic', 'market', 'church', 'hall', 'house']) {
    const report = await api.ev(`(()=>{window.__mm6Debug.forceShop('weapons');
      window.__mm6Debug.npcSay('Проверка жеста','Продавец','${kind}');
      return window.__mm6Debug.npcStageReport();})()`);
    animated.push({ kind, gesture: report.gesture, animation: report.animationNames.filter(n => n !== 'none') });
  }
  api.check('каждый тип жеста реально анимирует часть SVG',
    animated.every(x => x.gesture && x.animation.length > 0), JSON.stringify(animated));

  await api.ev(`window.__mm6Debug.setSettings({npcGestures:false});
    window.__mm6Debug.npcSay('Проверка без жестов','Кузнец','forge');`);
  const off = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('флаг отключает CSS-анимацию частей тела',
    off && off.gesturesEnabled === false && off.animationName === 'none' &&
    await api.ev(`document.body.classList.contains('no-npc-gestures')`),
    JSON.stringify({ enabled: off?.gesturesEnabled, animation: off?.animationName }));

  await api.ev(`window.__mm6Debug.setSettings({npcGestures:true});
    window.__mm6Debug.toggleShop(false);
    window.__mm6Debug.npcSay('Дверь закрыта: здесь живут, а не торгуют.','Хозяин дома','house');`);
  await api.sleep(80);
  const world = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('реплика здания вне лавки показывает диалог на карте',
    !!world && world.visible && !world.inShop && /Дверь закрыта/.test(world.text),
    JSON.stringify({ visible: world?.visible, inShop: world?.inShop, text: world?.text }));
  const overlapInfo = await api.ev(`(()=>{const d=window.__mm6Debug.npcStageReport(),
    r=window.__mm6Debug.overlapReport(),a=d.rect;
    return {dialog:a,rects:r.rects.filter(x=>Math.min(a.x+a.w,x.x+x.w)-Math.max(a.x,x.x)>1 &&
      Math.min(a.y+a.h,x.y+x.h)-Math.max(a.y,x.y)>1)};})()`);
  api.check('диалог на карте не перекрывает окна, плашки и сообщения',
    overlapInfo.rects.length === 0, JSON.stringify(overlapInfo));
  api.check('реплика попадает в журнал как NPC',
    await api.ev(`window.__mm6State().log.some(e=>e.type==='npc'&&/Дверь закрыта/.test(e.text))`));
});
