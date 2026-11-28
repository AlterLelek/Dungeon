// Часть 2 [ГОБОРЕНО]: пять данных строго одной вертикальной колонкой,
// подпись миникарты описывает только карту, дублирующей строки нет.
// Запуск: node scripts/cdp-mm6-map-info-part2.mjs
import { runCdp } from './cdp-lib.mjs';

const read = `(()=>{const w=window.__mm6Debug.mapStateWindowReport();return {
  panel:w&&w.panel,rows:(w&&w.rows)||[],rowYs:(w&&w.rowYs)||[],rowXs:(w&&w.rowXs)||[],
  bottomLine:w&&w.bottomLine,caption:window.__mm6Debug.minimapCaptionReport()};})()`;
const columnOk = (info) => info.rows.length === 5 && info.rowYs.length === 5 &&
  info.rowXs.length === 5 && info.rowXs.every(x => x === 18) &&
  info.rowYs.every((y, i) => i === 0 || y - info.rowYs[i - 1] === 11) &&
  info.bottomLine === null;

runCdp('MAP INFO PART 2', async api => {
  await api.startGame();
  await api.sleep(220);

  const info = await api.ev(read);
  api.check('пять данных образуют одну вертикальную колонку слева, без нижней строки',
    columnOk(info) && info.panel.w === 214 && info.panel.h === 56 &&
    info.rows[1] === 'Ход ' + (await api.ev('window.__mm6State().world.turn')) &&
    /^🪙 \d+$/.test(info.rows[2]) && /^Цель: /.test(info.rows[3]),
    JSON.stringify(info));
  api.check('подпись миникарты говорит только о карте, без названия поселения',
    info.caption === '🗺 M — весь мир' &&
    !/(Каменный Брод|Березоречье|Седая Гать|Овинец|Криничный Дол|Поле|Деревня|Город|Порт|Горы)/.test(info.caption || ''),
    JSON.stringify({ caption: info.caption }));

  // Колонка живая: ход, погода и сезон меняются на месте, не добавляя строк.
  await api.ev(`window.__mm6Debug.setSeason('winter');window.__mm6Debug.setTurn(7);true`);
  await api.sleep(200);
  const changed = await api.ev(read);
  api.check('ход, погода и сезон обновляются внутри той же колонки',
    columnOk(changed) && changed.rows[1] === 'Ход 7' && /Зима/.test(changed.rows[4]) &&
    /(Снег|Снегопад|Ясно)/.test(changed.rows[4]), JSON.stringify(changed.rows));

  // [ГОБОРЕНО] правило «окна не наезжают»: колонка и миникарта живут раздельно.
  for (const [vw, vh] of [[800, 600], [1280, 720], [1024, 768], [640, 900]]) {
    await api.viewport(vw, vh);
    await api.sleep(160);
    const r = await api.ev('window.__mm6Debug.overlapReport()');
    const mm = r.rects.find(x => x.name === 'minimap');
    const party = r.rects.find(x => x.name === 'party');
    const state = r.rects.find(x => x.name === 'stateWindow');
    const ox = mm && party ? Math.min(mm.x + mm.w, party.x + party.w) - Math.max(mm.x, party.x) : 0;
    const oy = mm && party ? Math.min(mm.y + mm.h, party.y + party.h) - Math.max(mm.y, party.y) : 0;
    api.check(`при ${vw}×${vh}: колонка, миникарта и отряд не наезжают друг на друга`,
      r.overlaps.length === 0 && !!mm && !!party && !!state && !(ox > 1 && oy > 1),
      JSON.stringify({ state, mm, party, ox, oy, overlaps: r.overlaps }));
  }
});
