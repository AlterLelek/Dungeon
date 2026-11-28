// Часть 5 [ГОБОРЕНО]: NPC говорит со спрайтом в сцене, крупными портретами и
// жестами, которые действительно идут во времени; диалог не наезжает на HUD.
// Запуск: node scripts/cdp-mm6-npc-dialogue-part5.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('NPC DIALOGUE PART 5', async api => {
  await api.startGame();
  await api.sleep(180);
  await api.ev(`window.__mm6Debug.setSettings({npcGestures:true});
    window.__mm6Debug.toggleShop(false);
    window.__mm6Debug.npcSay('Кузнец: подойди к наковальне','Кузнец','forge');`);
  await api.sleep(120);

  const first = await api.ev('window.__mm6Debug.npcStageReport()');
  await api.sleep(320);
  const second = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('диалог показывает крупный портрет NPC и портрет героя слева от текста',
    first.visible && !first.inShop && /Кузнец/.test(first.speaker) &&
    /наковальне/.test(first.text) && /\/portraits\//.test(first.npcPortraitSrc || '') &&
    /\/portraits\//.test(first.heroFaceSrc || '') &&
    first.portraitRect.w >= 80 && first.portraitRect.h >= 80 &&
    first.heroRect.w >= 50 && first.heroRect.h >= 50 &&
    first.heroRect.x < first.textRect.x,
    JSON.stringify({ speaker: first.speaker, portrait: first.portraitRect,
      hero: first.heroRect, text: first.textRect }));
  api.check('спрайт сцены собран из пяти частей и стоит рядом с диалогом',
    first.world.visible && first.world.kind === 'forge' &&
    first.world.groups.length === 5 && first.world.rect.w >= 80 && first.world.rect.h >= 90 &&
    !(Math.min(first.world.rect.x + first.world.rect.w, first.rect.x + first.rect.w) -
      Math.max(first.world.rect.x, first.rect.x) > 1 &&
      Math.min(first.world.rect.y + first.world.rect.h, first.rect.y + first.rect.h) -
      Math.max(first.world.rect.y, first.rect.y) > 1),
    JSON.stringify({ world: first.world.rect, dialog: first.rect }));

  api.check('жест кузнеца — молот, анимация бесконечна в диалоге и в сцене',
    first.gesture === 'hammer' && first.animationNames.some(n => n && n !== 'none') &&
    first.animationIterations.includes('infinite') &&
    first.world.animationNames.some(n => n && n !== 'none') &&
    first.world.animationIterations.includes('infinite'),
    JSON.stringify({ dialog: first.animationNames, world: first.world.animationNames,
      iterations: first.animationIterations }));
  api.check('анимация действительно идёт: время жеста увеличилось за 320 мс',
    Number.isFinite(first.animationTime) && Number.isFinite(first.world.animationTime) &&
    second.animationTime > first.animationTime && second.world.animationTime > first.world.animationTime,
    JSON.stringify({ dialog: [first.animationTime, second.animationTime],
      world: [first.world.animationTime, second.world.animationTime] }));

  const overlap = await api.ev(`(()=>{const a=window.__mm6Debug.npcStageReport().rect;
    const r=window.__mm6Debug.overlapReport();
    return {cross:r.rects.filter(x=>Math.min(a.x+a.w,x.x+x.w)-Math.max(a.x,x.x)>1 &&
      Math.min(a.y+a.h,x.y+x.h)-Math.max(a.y,x.y)>1)};})()`);
  api.check('диалог не перекрывает окна, плашки и сообщения', overlap.cross.length === 0,
    JSON.stringify(overlap));

  await api.ev(`window.__mm6Debug.toggleBigMap(true)`);
  await api.sleep(100);
  const onMap = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('на большой карте лица отряда и спрайт NPC скрыты',
    onMap.mapFacesVisible === false && onMap.world.visible === false,
    JSON.stringify({ faces: onMap.mapFacesVisible, sprite: onMap.world.visible }));
  await api.ev(`window.__mm6Debug.toggleBigMap(false);true`);

  await api.ev(`window.__mm6Debug.setSettings({npcGestures:false});
    window.__mm6Debug.npcSay('Проверка без жестов','Кузнец','forge');`);
  await api.sleep(100);
  const off = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('настройка останавливает жесты и в диалоге, и в сцене',
    off.gesturesEnabled === false && off.animationName === 'none' &&
    off.animationNames.every(n => n === 'none') &&
    off.world.animationNames.every(n => n === 'none') &&
    await api.ev(`document.body.classList.contains('no-npc-gestures')`),
    JSON.stringify({ dialog: off.animationNames, world: off.world.animationNames }));
  await api.ev(`window.__mm6Debug.setSettings({npcGestures:true});true`);
});
