// Часть 2 новой ПАРТИИ: данные слева вертикальной колонкой, подпись миникарты
// описывает только карту, дублирующей строки слева внизу нет, карточки отряда
// не перекрывают миникарту ни на одном размере окна.
// Запуск: node scripts/cdp-mm6-map-info.mjs
import { runCdp } from './cdp-lib.mjs';

const read = `(()=>{const w=window.__mm6Debug.mapStateWindowReport();
  return {rows:(w&&w.rows)||[],rowYs:(w&&w.rowYs)||[],bottomLine:w&&w.bottomLine,
    minimapCaption:window.__mm6Debug.minimapCaptionReport()};})()`;

runCdp('MAP INFO PART 2', async api => {
  await api.startGame();
  await api.sleep(240);

  const info = await api.ev(read);
  api.check('пять данных слева сверху образуют вертикальную колонку',
    info.rows.length === 5 && info.rowYs.length === 5 &&
    info.rowYs.every((y, i) => i === 0 || y > info.rowYs[i - 1]) &&
    info.rows[0].includes(' · ') && /^Ход \d+$/.test(info.rows[1]) &&
    /^🪙 \d+$/.test(info.rows[2]) && /^Цель: /.test(info.rows[3]) &&
    /(Весна|Лето|Осень|Зима)/.test(info.rows[4]) &&
    /(Ясно|Морось|Дождь|Ливень|Снег|Снегопад)/.test(info.rows[4]),
    JSON.stringify(info));
  api.check('дублирующей строки «Ход … зрение … Q/E» слева внизу больше нет',
    info.bottomLine === null, JSON.stringify({ bottomLine: info.bottomLine }));
  api.check('подпись миникарты — только карта, без названия поселения',
    /весь мир/.test(info.minimapCaption || '') &&
    !/(Каменный Брод|Березоречье|Седая Гать|Овинец|Криничный Дол|Поле|Деревня|Город|Порт|Горы)/.test(info.minimapCaption || ''),
    JSON.stringify({ minimapCaption: info.minimapCaption }));

  // Погода и сезон живут в той же колонке и обновляются вместе с ходом.
  await api.ev(`window.__mm6Debug.setSeason('winter');window.__mm6Debug.setTurn(7);true`);
  await api.sleep(220);
  const changed = await api.ev(read);
  api.check('ход, погода и сезон в колонке обновляются',
    changed.rows[1] === 'Ход 7' && /Зима/.test(changed.rows[4]) &&
    /(Снег|Снегопад|Ясно)/.test(changed.rows[4]),
    JSON.stringify(changed.rows));

  // Сквозное правило непересечения: карточки отряда и миникарта не наезжают друг на друга.
  for (const [vw, vh] of [[800, 600], [1280, 720], [1024, 768], [640, 900]]) {
    await api.viewport(vw, vh);
    await api.sleep(160);
    const r = await api.ev('window.__mm6Debug.overlapReport()');
    const mm = r.rects.find(x => x.name === 'minimap');
    const party = r.rects.find(x => x.name === 'party');
    const ox = mm && party ? Math.min(mm.x + mm.w, party.x + party.w) - Math.max(mm.x, party.x) : 0;
    const oy = mm && party ? Math.min(mm.y + mm.h, party.y + party.h) - Math.max(mm.y, party.y) : 0;
    api.check('карточки отряда не перекрывают миникарту при ' + vw + '×' + vh,
      !!mm && !!party && !(ox > 1 && oy > 1),
      JSON.stringify({ mm, party, ox, oy, overlaps: r.overlaps }));
  }

  // Возвращаем рабочее разрешение и проверяем сквозное правило целиком.
  await api.viewport(1280, 720);
  await api.sleep(180);
  const global = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('на карте ни одно окно, плашка и сообщение не перекрывают другое',
    !global.overlaps.length, JSON.stringify({ rects: global.rects.map(x => x.name), overlaps: global.overlaps }));
});
