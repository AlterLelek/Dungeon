// Часть 5: живые диалоги NPC — крупный портрет, спрайт в сцене, непрерывные
// жесты отдельными частями SVG и отключение анимации настройкой.
// Запуск: node scripts/cdp-mm6-npc-dialogue.mjs
import { runCdp } from './cdp-lib.mjs';

const KINDS = ['weapons', 'armory', 'forge', 'armor', 'magic', 'jeweler', 'market',
  'tavern', 'inn', 'church', 'hall', 'house', 'barn', 'shed', 'well', 'stable'];

runCdp('NPC DIALOGUE PART 5', async api => {
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
    /старую башню/.test(tavern.text),
    JSON.stringify({ visible: tavern?.visible, inShop: tavern?.inShop, speaker: tavern?.speaker, text: tavern?.text }));
  api.check('крупный портрет NPC и портрет героя видны в диалоге',
    !!tavern.heroFaceSrc && /\/portraits\//.test(tavern.heroFaceSrc) &&
    !!tavern.npcPortraitSrc && /\/portraits\//.test(tavern.npcPortraitSrc) &&
    tavern.heroRect.w >= 50 && tavern.heroRect.h >= 50 &&
    tavern.portraitRect.w >= 80 && tavern.portraitRect.h >= 80,
    JSON.stringify({ hero: tavern.heroFaceSrc, npc: tavern.npcPortraitSrc,
      heroRect: tavern.heroRect, portraitRect: tavern.portraitRect }));
  api.check('портрет выбранного героя стоит снизу слева от текста',
    tavern.heroRect.x < tavern.textRect.x && tavern.heroRect.y + tavern.heroRect.h > tavern.textRect.y,
    JSON.stringify({ hero: tavern.heroRect, text: tavern.textRect }));
  api.check('SVG-спрайт NPC собран из отдельных частей тела',
    ['npcBody', 'npcHead', 'npcArmLeft', 'npcArmRight', 'npcHat'].every(id => tavern.groups.includes(id)) &&
    tavern.spriteRect.w >= 40, JSON.stringify({ groups: tavern.groups, sprite: tavern.spriteRect }));
  api.check('таверна использует жест «тост» с непрерывной анимацией',
    tavern.gesture === 'toast' && tavern.animationNames.some(n => n && n !== 'none') &&
    tavern.animationIterations.includes('infinite') && tavern.gesturesEnabled,
    JSON.stringify({ gesture: tavern.gesture, animation: tavern.animationNames,
      iterations: tavern.animationIterations }));
  api.check('внутри лавки спрайт сцены скрыт',
    tavern.world.visible === false, JSON.stringify(tavern.world));

  const gestures = await api.ev(`Object.fromEntries(${JSON.stringify(KINDS)}
    .map(k => [k, window.__mm6Debug.npcGestureFor(k)]))`);
  api.check('каждый говорящий NPC получает собственный жест',
    KINDS.every(k => !!gestures[k]) && new Set(Object.values(gestures)).size >= 8 &&
    gestures.forge === 'hammer' && gestures.magic === 'cast' &&
    gestures.church === 'bless' && gestures.hall === 'point' && gestures.house === 'shrug',
    JSON.stringify(gestures));

  const spoken = [];
  for (const kind of KINDS) {
    const report = await api.ev(`(()=>{const d=window.__mm6Debug;
      d.toggleShop(false); d.npcSay('Проверка реплики','Говорящий','${kind}');
      return d.npcStageReport();})()`);
    spoken.push({ kind, inShop: report.inShop, reportKind: report.kind, worldKind: report.world.kind,
      visible: report.world.visible, groups: report.world.groups.length,
      gesture: report.gesture,
      anim: report.world.animationNames.filter(n => n && n !== 'none').length,
      infinite: report.world.animationIterations.includes('infinite'),
      portrait: /\/portraits\//.test(report.npcPortraitSrc || '') });
  }
  api.check('все 16 типов NPC говорят со спрайтом в сцене и портретом',
    spoken.every(x => !x.inShop && x.visible && x.reportKind === x.kind &&
      x.worldKind === x.kind && x.groups === 5 && x.anim > 0 && x.infinite && x.portrait),
    JSON.stringify(spoken.filter(x => !x.visible || x.worldKind !== x.kind || !x.infinite)));

  const world = spoken.find(x => x.kind === 'forge') ?
    await api.ev(`(()=>{const d=window.__mm6Debug; d.toggleShop(false);
      d.npcSay('Кузнец говорит из сцены','Кузнец','forge'); return d.npcStageReport();})()`) : null;
  const sceneOverlap = await api.ev(`(()=>{const d=window.__mm6Debug.npcStageReport(),a=d.world.rect,b=d.rect;
    return {a,b,cross:Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1 &&
      Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1};})()`);
  api.check('спрайт говорящего NPC стоит в сцене рядом с диалогом, не перекрывая его',
    !!world && world.visible && world.world.groups.length === 5 &&
    sceneOverlap.a.w >= 80 && sceneOverlap.a.h >= 90 && sceneOverlap.cross === false,
    JSON.stringify(sceneOverlap));

  await api.ev(`window.__mm6Debug.setSettings({npcGestures:false});
    window.__mm6Debug.npcSay('Проверка без жестов','Кузнец','forge');`);
  const off = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('флаг отключает анимацию и в диалоге, и в сцене',
    off && off.gesturesEnabled === false && off.animationName === 'none' &&
    off.world.animationNames.every(n => n === 'none') &&
    await api.ev(`document.body.classList.contains('no-npc-gestures')`),
    JSON.stringify({ enabled: off?.gesturesEnabled, dialogue: off?.animationNames,
      world: off?.world.animationNames }));

  await api.ev(`window.__mm6Debug.setSettings({npcGestures:true});
    window.__mm6Debug.npcSay('Дверь закрыта: здесь живут, а не торгуют.','Хозяин дома','house');`);
  await api.sleep(80);
  const house = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('реплика здания вне лавки показывает диалог и спрайт на карте',
    !!house && house.visible && !house.inShop && /Дверь закрыта/.test(house.text) &&
    house.world.visible && house.world.kind === 'house',
    JSON.stringify({ visible: house?.visible, inShop: house?.inShop,
      world: house?.world, text: house?.text }));
  const overlapInfo = await api.ev(`(()=>{const d=window.__mm6Debug.npcStageReport(),
    r=window.__mm6Debug.overlapReport(),a=d.rect;
    return {dialog:a,rects:r.rects.filter(x=>Math.min(a.x+a.w,x.x+x.w)-Math.max(a.x,x.x)>1 &&
      Math.min(a.y+a.h,x.y+x.h)-Math.max(a.y,x.y)>1)};})()`);
  api.check('диалог на карте не перекрывает окна, плашки и сообщения',
    overlapInfo.rects.length === 0, JSON.stringify(overlapInfo));

  await api.ev(`window.__mm6Debug.toggleBigMap(true)`);
  await api.sleep(60);
  const onMap = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('на большой карте лица карточек и спрайт NPC скрыты',
    onMap.mapFacesVisible === false && onMap.world.visible === false,
    JSON.stringify({ faces: onMap.mapFacesVisible, world: onMap.world.visible }));
  await api.ev(`window.__mm6Debug.toggleBigMap(false)`);
  await api.sleep(60);
  const back = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('после закрытия большой карты лица карточек снова видны',
    back.mapFacesVisible === true, JSON.stringify({ faces: back.mapFacesVisible }));

  api.check('реплика попадает в журнал как NPC',
    await api.ev(`window.__mm6State().log.some(e=>e.type==='npc'&&/Дверь закрыта/.test(e.text))`));
});
