// CDP-проверка восьмой части: синтезированные звуки, 64 голоса, вспышки, тряска и речь.
// Запуск: node scripts/cdp-mm6-audio-p8.mjs
import { runCdp } from './cdp-lib.mjs';

const EVENTS = ['hit', 'miss', 'crit', 'death', 'flame', 'water', 'earth', 'wind',
  'dark', 'light', 'level_up', 'chest', 'door', 'ui', 'coins'];

runCdp('AUDIO PART 8', async api => {
  await api.startGame();
  await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();d.resetAudioStats();return true;})()`);

  const base = await api.ev(`window.__mm6Debug.audioPart8Report()`);
  api.check('движок готов, событий 15 и запас 64 голоса',
    base.engine.ready === true && base.voiceLimit === 64 &&
    EVENTS.every(e => base.events.includes(e)) && base.events.length === EVENTS.length,
    JSON.stringify({ ready: base.engine.ready, limit: base.voiceLimit, events: base.events }));
  api.check('переключатель речи и ползунки громкости доступны',
    base.speechControl === true && base.volumes.sfx === 10 && base.volumes.sound === 10,
    JSON.stringify({ control: base.speechControl, volumes: base.volumes }));

  const played = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();d.resetAudioStats();
    ${JSON.stringify(EVENTS)}.forEach(e=>d.fireSfx(e));
    return d.audioPart8Report();})()`);
  api.check('каждое игровое событие попадает в журнал и синтезируется',
    EVENTS.every(e => played.recent.includes(e)) && played.engine.playedVoices >= EVENTS.length,
    JSON.stringify({ recent: played.recent.length, played: played.engine.playedVoices }));

  const flash = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();
    d.fireSfx('flame','flame');return d.audioPart8Report().fx;})()`);
  api.check('стихийная вспышка окрашена цветом школы',
    flash.flashes === 1 && flash.lastFlash === 'flame' && flash.edgeOn === true &&
    /d94a20/i.test(flash.edgeColor), JSON.stringify(flash));
  await api.sleep(260);
  const flashOff = await api.ev(`window.__mm6Debug.audioPart8Report().fx.edgeOn`);
  api.check('вспышка гаснет сама', flashOff === false, JSON.stringify(flashOff));

  const shake = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();
    d.fireShake();return d.audioPart8Report().fx;})()`);
  api.check('тряска кадра включается', shake.shakes === 1 && shake.stageShake === true,
    JSON.stringify(shake));
  await api.sleep(260);
  const shakeOff = await api.ev(`window.__mm6Debug.audioPart8Report().fx.stageShake`);
  api.check('тряска короткая и снимается', shakeOff === false, JSON.stringify(shakeOff));

  const voices = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioStats();
    const seq=${JSON.stringify(EVENTS)};
    for(let i=0;i<2;i++) seq.forEach(e=>d.fireSfx(e));
    return d.audioPart8Report().engine;})()`);
  api.check('46 голосов укладываются в лимит без потерь',
    voices.peakVoices <= 64 && voices.droppedVoices === 0 && voices.playedVoices >= 46,
    JSON.stringify({ peak: voices.peakVoices, dropped: voices.droppedVoices, played: voices.playedVoices }));

  const capped = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioStats();
    for(let i=0;i<50;i++) d.fireSfx('hit');
    return d.audioPart8Report().engine;})()`);
  api.check('превышение лимита мягко отбрасывается',
    capped.peakVoices === 64 && capped.droppedVoices > 0,
    JSON.stringify({ peak: capped.peakVoices, dropped: capped.droppedVoices }));

  const vol = await api.ev(`(()=>{const d=window.__mm6Debug;d.setSettings({sound:8,sfx:3});
    d.resetAudioFx();d.fireSfx('ui');return d.audioPart8Report();})()`);
  api.check('громкость настроек доходит до WebAudio',
    vol.engine.volumes.master === 8 && vol.engine.volumes.sfx === 3 && vol.volumes.sfx === 3,
    JSON.stringify({ engine: vol.engine.volumes, settings: vol.volumes }));
  await api.ev(`window.__mm6Debug.setSettings({sound:10,sfx:10})`);

  const speechOff = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();
    d.setSettings({speech:false});d.fireSpeech('Проверка речи');
    return d.audioPart8Report().speech;})()`);
  api.check('при выключенном флаге речь откатывается к тексту',
    speechOff.flag === false && speechOff.requested === 1 &&
    speechOff.fallback === 1 && speechOff.spoken === 0, JSON.stringify(speechOff));

  const speechOn = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();
    d.setSettings({speech:true});d.fireSpeech('Проверка речи');
    return d.audioPart8Report().speech;})()`);
  api.check('включённый флаг вызывает речь или безопасный фолбэк',
    speechOn.flag === true && speechOn.requested === 1 &&
    speechOn.spoken + speechOn.fallback === 1, JSON.stringify(speechOn));
  await api.ev(`window.__mm6Debug.setSettings({speech:false})`);

  const battle = await api.ev(`(()=>{const d=window.__mm6Debug;d.resetAudioFx();
    d.startBattle();const b=window.__mm6State().battle;
    if(b){b.turn='hero';b.heroIdx=0;b.busy=false;b.targetIdx=0;}
    const ok=d.heroAttack();return {ok,report:d.audioPart8Report()};})()`);
  api.check('атака героя использует событие попадания или промаха',
    battle.ok === true && battle.report.recent.some(e => e === 'hit' || e === 'miss'),
    JSON.stringify({ ok: battle.ok, recent: battle.report.recent }));
  await api.ev(`window.__mm6Debug.closeBattle()`);

  const final = await api.ev(`window.__mm6Debug.audioPart8Report()`);
  api.check('журнал звуков сохраняет вызовы без ошибок',
    final.recent.length > 0 && final.engine.playedVoices > 0 &&
    final.engine.voiceLimit === 64, JSON.stringify({ recent: final.recent.length, played: final.engine.playedVoices }));
});
