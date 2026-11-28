// CDP-проверка вывесок: знак слева, тип лавки сверху, имя снизу.
// Все строки обязаны целиком лежать внутри доски с отступами, без размытия.
// Запуск: node scripts/cdp-mm6-signs-layout.mjs
import { runCdp } from './cdp-lib.mjs';

await runCdp('SIGNS LAYOUT', async api => {
  await api.ev(`location.href='${api.base}/index.html'`);
  await api.waitFor(`document.readyState==='complete'`, 8000);

  const rows = await api.ev(`(async()=>{
    await document.fonts.ready;
    const batch=await fetch('assets/buildings-batch.json').then(r=>r.json());
    const host=document.createElement('div');
    host.style.cssText='position:absolute;left:-10000px;top:0;width:512px;height:512px';
    document.body.appendChild(host);
    const rows=[];
    for(const entry of batch){
      const text=await fetch(entry.path).then(r=>r.text());
      const parsed=new DOMParser().parseFromString(text,'image/svg+xml');
      const svg=document.importNode(parsed.documentElement,true);
      svg.setAttribute('width','512'); svg.setAttribute('height','512');
      host.replaceChildren(svg);
      const sign=svg.querySelector('#sign');
      const board=svg.querySelector('#signBoard');
      const glyph=svg.querySelector('#sign [data-sign]');
      const nodes=[...svg.querySelectorAll('#sign text')];
      const sr=svg.getBoundingClientRect();
      const box=el=>{const r=el.getBoundingClientRect();return {
        x:+(r.left-sr.left).toFixed(1), y:+(r.top-sr.top).toFixed(1),
        w:+r.width.toFixed(1), h:+r.height.toFixed(1),
        right:+(r.right-sr.left).toFixed(1), bottom:+(r.bottom-sr.top).toFixed(1)};};
      const texts=nodes.map(t=>({...box(t),label:t.getAttribute('data-line'),
        text:t.textContent,stroke:t.getAttribute('stroke-width'),
        rendering:getComputedStyle(t).textRendering,fill:t.getAttribute('fill')}));
      const decor=svg.querySelector('#decor');
      const decorBoxes=decor?[...decor.children].map(box):[];
      rows.push({
        stem:entry.path.split('/').pop().replace(/\\.svg$/,''),
        batchName:entry.sign_text,
        type:sign&&sign.getAttribute('data-sign-type'),
        shop:sign&&sign.getAttribute('data-sign-shop'),
        full:sign&&sign.getAttribute('data-sign-name'),
        icon:glyph&&glyph.getAttribute('data-sign'),
        paths:sign?[...sign.children].filter(el=>el.tagName.toLowerCase()==='path').length:0,
        board:board?box(board):null, glyph:glyph?box(glyph):null, texts, decorBoxes,
        badStyle:/linearGradient|radialGradient|<filter|<image|blur|feGaussian/i.test(text)
      });
    }
    host.remove();
    return rows;
  })()`);

  const expected = name => {
    const m = String(name).match(/^(.*?)\s*«\s*(.+?)\s*»\s*$/);
    return m ? { type: m[1].trim(), shop: m[2].trim() } : { type: String(name).trim(), shop: '' };
  };
  const inside = (t, b, padX = 8, padY = 5) =>
    !!b && t.x >= b.x + padX && t.right <= b.right - padX &&
    t.y >= b.y + padY && t.bottom <= b.bottom - padY;

  api.check('проверены все 16 зданий с вывесками', rows.length === 16,
    String(rows.length));

  const wrongContent = rows.filter(r => {
    const e = expected(r.batchName);
    return r.full !== r.batchName || r.type !== e.type || r.shop !== e.shop ||
      r.texts.length !== 2 || r.texts[0].label !== 'type' ||
      r.texts[1].label !== 'shop' || r.texts[0].text !== r.type ||
      r.texts[1].text !== r.shop;
  });
  api.check('тип сверху, имя снизу, обе строки из батча', wrongContent.length === 0,
    JSON.stringify(wrongContent.map(r => ({ stem: r.stem, batch: r.batchName,
      type: r.type, shop: r.shop, lines: r.texts.map(t => [t.label, t.text]) }))));

  const wrongBox = rows.filter(r => r.texts.length !== 2 || !r.board ||
    !inside(r.texts[0], r.board) || !inside(r.texts[1], r.board) ||
    r.texts[0].bottom > r.texts[1].y + 2);
  api.check('обе строки целиком внутри доски с отступами', wrongBox.length === 0,
    JSON.stringify(wrongBox.map(r => ({ stem: r.stem, board: r.board,
      lines: r.texts.map(t => ({ text: t.text, x: t.x, right: t.right,
        y: t.y, bottom: t.bottom })) }))));

  const wrongGlyph = rows.filter(r => !r.board || !r.glyph || r.texts.length !== 2 ||
    r.glyph.x < r.board.x + 6 || r.glyph.right > r.texts[0].x - 4 ||
    r.glyph.y < r.board.y + 4 || r.glyph.bottom > r.board.bottom - 4);
  api.check('знак слева от текста и внутри доски', wrongGlyph.length === 0,
    JSON.stringify(wrongGlyph.map(r => ({ stem: r.stem, board: r.board,
      glyph: r.glyph, textX: r.texts[0] && r.texts[0].x }))));

  const extraLines = rows.filter(r => r.paths !== 2);
  api.check('вертикальной разделительной линии слева нет', extraLines.length === 0,
    JSON.stringify(extraLines.map(r => ({ stem: r.stem, paths: r.paths }))));

  const overlaps = (a, b) => !!a && !!b &&
    a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1;
  const decorOverlap = rows.filter(r => !r.board ||
    r.decorBoxes.some(d => overlaps(d, r.board) || overlaps(d, r.glyph)));
  api.check('декор не пересекает вывеску и лого', decorOverlap.length === 0,
    JSON.stringify(decorOverlap.map(r => ({ stem: r.stem, board: r.board,
      glyph: r.glyph, decor: r.decorBoxes }))));

  const blurry = rows.filter(r => r.texts.length !== 2 || r.badStyle ||
    r.texts.some(t => t.stroke !== '2' ||
      String(t.rendering).toLowerCase() !== 'geometricprecision' ||
      !t.fill || !t.text));
  api.check('текст чёткий: обводка 2px и геометрический рендеринг', blurry.length === 0,
    JSON.stringify(blurry.map(r => ({ stem: r.stem, badStyle: r.badStyle,
      lines: r.texts.map(t => ({ stroke: t.stroke, rendering: t.rendering, fill: t.fill })) }))));
});
