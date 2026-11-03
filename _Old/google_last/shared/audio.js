// shared/audio.js
import { settings } from './settings.js';
let ac = null, amb = null, mIdx = 0, hBeat = 0, aTimer = null;
const mobile = ('ontouchstart' in window) || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
const ts = mobile ? 0.5 : 1;
export const MELODIES = {
  cave: { wave: 'triangle', notes: [220,0,261.6,329.6,440,0,329.6,261.6,349.2,0,440,493.9,523.3,0,440,392,329.6,0,261.6,220,0,0,196,0,220,0,261.6,329.6,440,0,0,0] },
  elven: { wave: 'sine', notes: [523.3,659.3,784,0,659.3,523.3,0,587.3,0,659.3,784,880,0,784,659.3,0,523.3,0,440,523.3,659.3,784,0,0,880,0,784,659.3,523.3,0,0,0] },
  dwarven: { wave: 'square', notes: [110,110,0,146.8,0,164.8,0,110,0,98,98,0,87.3,0,98,110,0,110,0,146.8,146.8,0,164.8,0,110,110,0,0,0,0,0,0] },
  dice: { wave: 'dice', notes: [] }
};
const mOrder = ['cave', 'elven', 'dwarven', 'dice'], scaleD = [220,261.6,293.7,349.2,392,440,523.3,587.3,698.5,784];
export function getAudioContext() { if(!ac) ac = new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume(); return ac; }
export function playSound(t, p = {}) {
  if(settings.vibro && navigator.vibrate) { const s = settings.vibroPower/100, pat = p[t]||20; try { navigator.vibrate(Array.isArray(pat)?pat.map(v=>Math.round(v*s)):Math.round(pat*s)); }catch(e){} }
  if(!settings.sfx) return;
  try {
    const ctx = getAudioContext(), o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime, v = settings.sfx/100;
    o.connect(g); g.connect(ctx.destination);
    const f = (f1, f2, d, w) => { o.type = w; o.frequency.setValueAtTime(f1, n); if(f2) o.frequency.setValueAtTime(f2, n+d*0.8); g.gain.setValueAtTime(d*v, n); g.gain.setValueAtTime(0, n+d); o.start(n); o.stop(n+d); };
    if(t==='hit') f(200, 100, 0.1, 'square');
    else if(t==='collect') f(440, 660, 0.12, 'sine');
    else if(t==='magic') f(150, 300, 0.2, 'sawtooth');
    else if(t==='skip') f(120, 0, 0.05*ts, 'triangle');
    else if(t==='step') f(90+Math.random()*40, 0, 0.04, 'triangle');
    else if(t==='kill') f(300, 700, 0.15, 'sine');
    else if(t==='eat') f(160, 80, 0.08*ts, 'square');
    else if(t==='corrupt') f(300, 120, 0.3, 'sine');
    else if(t==='bad') f(90, 50, 0.25, 'sawtooth');
    else if(t==='tele') f(900, 300, 0.1*ts, 'sine');
    else if(t==='steal') f(500, 200, 0.12, 'sawtooth');
    else if(t==='stairs') f(500, 1000, 0.3, 'sine');
    else if(t==='win') f(300, 700, 0.4, 'sine');
    else if(t==='lose') f(150, 60, 0.4, 'square');
    else if(t==='menu') f(500, 0, 0.06, 'triangle');
  } catch(e) {}
}
export function playNote(f, w) {
  if(!settings.mel || !f) return;
  try {
    const ctx = getAudioContext(), o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime;
    o.type = w==='dice'?'triangle':(w||'triangle'); o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.045*(settings.mel/100)*(w==='square'?0.6:1), n); g.gain.exponentialRampToValueAtTime(0.001, n+0.5); o.start(n); o.stop(n+0.52);
  } catch(e) {}
}
export function stopAmbient() { if(amb) { try { amb.src.stop(); }catch(e){} amb = null; } }
export function startAmbient() {
  try {
    if(!settings.amb) return; const ctx = getAudioContext(); if(amb) return;
    const b = ctx.createBuffer(1, ctx.sampleRate*2, ctx.sampleRate), d = b.getChannelData(0); let l = 0;
    for(let i=0; i<b.length; i++) { d[i] = (l = (l + 0.02*(Math.random()*2-1))/1.02)*3.5; }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 120;
    const m = ctx.createGain(); m.gain.value = 0.35*(settings.amb/100);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lD = ctx.createGain(); lD.gain.value = 0.18*(settings.amb/100);
    lfo.connect(lD); lD.connect(m.gain); lfo.start(); s.connect(fl); fl.connect(m); m.connect(ctx.destination); s.start();
    amb = { src: s, master: m, lfoDepth: lD };
  } catch(e) {}
}
export function ensureAmbient(act) { if(!settings.amb) { stopAmbient(); return; } if(!ac && act) startAmbient(); if(ac) { if(ac.state==='suspended') ac.resume(); if(!amb) startAmbient(); } }
export function applyVolumes() { if(amb) { const k = settings.amb/100; amb.master.gain.value = 0.35*k; amb.lfoDepth.gain.value = 0.18*k; } }
export function startDripLoop() {
  setTimeout(() => { try { if(ac && settings.amb) { const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(800+Math.random()*300, n); o.frequency.exponentialRampToValueAtTime(300, n+0.12); g.gain.setValueAtTime(0.08*(settings.amb/100)*ts, n); g.gain.exponentialRampToValueAtTime(0.001, n+0.15); o.connect(g); g.connect(ac.destination); o.start(); o.stop(n+0.16); } }catch(e){} startDripLoop(); }, 9000+Math.random()*21000);
}
export function startMelodyLoop() {
  const l = () => {
    if(settings.melody==='dice') { if(settings.mel && ac && Math.random()<0.8) playNote(scaleD[Math.floor(Math.random()*scaleD.length)], Math.random()<0.5?'sine':'triangle'); }
    else { const m = MELODIES[settings.melody]||MELODIES.cave; if(settings.mel && ac) playNote(m.notes[mIdx], m.wave); mIdx = (mIdx+1)%m.notes.length; }
    if(++hBeat >= Math.max(4, Math.round(10000/settings.tempo))) { hBeat = 0; ensureAmbient(true); } setTimeout(l, settings.tempo);
  }; l();
}
export function cycleMelody(cb) { const next = mOrder[(mOrder.indexOf(settings.melody)+1)%mOrder.length]; settings.melody = next; mIdx = 0; if(cb) cb(next); }
export function scheduleAutoMelody(cb) { if(aTimer) clearInterval(aTimer); if(settings.autoMel) aTimer = setInterval(() => cycleMelody(cb), 180000+Math.random()*120000); }
