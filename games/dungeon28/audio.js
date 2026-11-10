let audioCtx = null;
let masterGain, musicGain, ambientGain, sfxGain;
let isInit = false;

let ambNodes = null;
let dripTimeout = null;
let melodyTimer = null;
let currentMelodyIdx = 0;
let currentTrack = 'sf2';
let currentTempo = 120; // BPM (примерно 500мс на долю)

const volumes = { master: 0.2, music: 0.15, ambient: 0.05, sfx: 0.3, tempo: 120 };

export function initAudio() {
  if (isInit) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.connect(masterGain);
  ambientGain = audioCtx.createGain();
  ambientGain.connect(masterGain);
  sfxGain = audioCtx.createGain();
  sfxGain.connect(masterGain);

  applyVolumes();
  isInit = true;
}

function applyVolumes() {
  if (!isInit) return;
  masterGain.gain.value = volumes.master;
  musicGain.gain.value = volumes.music;
  ambientGain.gain.value = volumes.ambient;
  sfxGain.gain.value = volumes.sfx;
}

export function setVolume(type, val) {
  if (type === 'tempo') {
    currentTempo = val;
    if (currentTrack) startMusic(currentTrack);
    return;
  }
  const normVal = val;
  if (type === 'master') volumes.master = normVal;
  if (type === 'music') volumes.music = normVal;
  if (type === 'ambient') volumes.ambient = normVal;
  if (type === 'sfx') volumes.sfx = normVal;
  applyVolumes();
}

export function startAmbient() {
  try {
    initAudio();
    if (ambNodes) return;
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random()*2 - 1;
      last = (last + 0.02*white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 150;
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoDepth = audioCtx.createGain();
    lfoDepth.gain.value = 0.05; 
    lfo.connect(lfoDepth); lfoDepth.connect(ambientGain.gain); lfo.start();
    src.connect(filter); filter.connect(ambientGain);
    src.start();
    ambNodes = { src, lfo };
    drip();
  } catch (e) {}
}

function drip() {
  dripTimeout = setTimeout(() => {
    try {
      if (audioCtx && volumes.ambient > 0) {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(800 + Math.random()*300, audioCtx.currentTime);
        o.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12);
        g.gain.setValueAtTime(0.01, audioCtx.currentTime); 
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        o.connect(g); g.connect(ambientGain);
        o.start(); o.stop(audioCtx.currentTime + 0.16);
      }
    } catch (e) {}
    drip();
  }, 9000 + Math.random() * 21000);
}

// ==========================================
// 7-ГОЛОСНАЯ МЕЛОДИЯ (Shining Force II Style)
// ==========================================

// Базовые ноты (частоты)
const N = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50
};

// 64-тактная последовательность (около 30 сек при 120bpm)
// 0 означает паузу
const MELODY_SF2 = {
    // 1. Lead Melody (Square) - Героическая тема
    v1: [
        N.G4, 0, N.C5, 0, N.E5, N.G5, N.C6, 0, N.B5, N.G5, N.E5, 0, N.D5, N.E5, N.F5, 0,
        N.E5, 0, N.C5, 0, N.G4, 0, N.C5, N.E5, N.G5, 0, N.A5, N.G5, N.F5, N.E5, N.D5, 0,
        N.C5, 0, N.E5, 0, N.G5, N.E5, N.C6, 0, N.B5, 0, N.A5, N.G5, N.F5, 0, N.E5, 0,
        N.D5, 0, N.E5, N.F5, N.G5, 0, N.A5, N.B5, N.C6, 0, N.G5, 0, N.C5, 0, 0, 0
    ],
    // 2. Brass (Sawtooth) - Поддержка
    v2: [
        N.E4, 0, N.G4, 0, N.C5, N.E5, N.G5, 0, N.E5, 0, N.C5, 0, N.B4, 0, N.A4, 0,
        N.G4, 0, N.E4, 0, N.C4, 0, N.E4, N.G4, N.C5, 0, N.E5, 0, N.D5, 0, N.B4, 0,
        N.C5, 0, N.E5, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.C5, 0, N.A4, 0, N.G4, 0,
        N.F4, 0, N.G4, 0, N.A4, 0, N.B4, 0, N.C5, 0, N.G4, 0, N.C4, 0, 0, 0
    ],
    // 3. Strings (Triangle) - Арпеджио
    v3: [
        N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.C5, N.E5, N.G4, N.B4, N.D5, N.G5, N.D5, N.B4, N.G4, N.B4,
        N.A4, N.C5, N.E5, N.A5, N.E5, N.C5, N.A4, N.C5, N.F4, N.A4, N.C5, N.F5, N.C5, N.A4, N.F4, N.A4,
        N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.C5, N.E5, N.G4, N.B4, N.D5, N.G5, N.D5, N.B4, N.G4, N.B4,
        N.F4, N.A4, N.C5, N.F5, N.G4, N.B4, N.D5, N.G5, N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, N.C4, 0
    ],
    // 4. Bass (Sine) - Фундамент
    v4: [
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.A3, 0, N.A3, 0, N.F3, 0, N.F3, 0,
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.F3, 0, N.F3, 0, N.G3, 0, N.G3, 0,
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.A3, 0, N.A3, 0, N.F3, 0, N.F3, 0,
        N.D3, 0, N.D3, 0, N.G3, 0, N.G3, 0, N.C3, 0, N.C3, 0, N.C3, 0, 0, 0
    ],
    // 5. Harmony (Triangle) - Аккорды
    v5: [
        N.E4, 0, N.C5, 0, N.G4, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0, N.C5, 0,
        N.G4, 0, N.E4, 0, N.C4, 0, N.G4, 0, N.A4, 0, N.F4, 0, N.G4, 0, N.B4, 0,
        N.E4, 0, N.C5, 0, N.G4, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0, N.C5, 0,
        N.F4, 0, N.A4, 0, N.G4, 0, N.B4, 0, N.E4, 0, N.G4, 0, N.C4, 0, 0, 0
    ],
    // 6. Flute (Sine) - Контр-мелодия
    v6: [
        0, 0, N.E5, 0, N.G5, 0, N.C5, 0, N.E5, 0, N.G5, 0, N.A4, 0, N.C5, 0,
        N.B4, 0, N.G4, 0, N.E4, 0, N.G4, 0, N.C5, 0, N.E5, 0, N.D5, 0, N.F5, 0,
        N.E5, 0, N.G5, 0, N.C6, 0, N.G5, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0,
        N.A4, 0, N.C5, 0, N.B4, 0, N.D5, 0, N.C5, 0, N.E5, 0, N.G4, 0, 0, 0
    ],
    // 7. Drums (Noise) - Ритм (1 - Kick, 2 - Snare, 3 - Hat)
    v7: [
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3
    ]
};

const MELODIES = {
    sf2: MELODY_SF2,
    cave: { v1: [N.C4, N.D4, N.E4, 0, N.G4, 0, N.E4, 0], v2: [], v3: [], v4: [N.C3,0,N.G3,0], v5: [], v6: [], v7: [] },
    elven: { v1: [N.E5, N.G5, N.C6, N.B5, N.G5, 0], v2: [], v3: [], v4: [N.C3,0], v5: [], v6: [], v7: [] },
    dwarven: { v1: [N.C3, N.E3, N.G3, N.C4, 0], v2: [], v3: [], v4: [N.C2,0], v5: [], v6: [], v7: [] },
    dice: { v1: [N.C5, 0, N.C5, 0], v2: [], v3: [], v4: [], v5: [], v6: [], v7: [] }
};

export function startMusic(track = 'sf2') {
  initAudio();
  if (melodyTimer) clearInterval(melodyTimer);
  currentTrack = track;
  currentMelodyIdx = 0;
  
  const mel = MELODIES[track] || MELODIES.sf2;
  const length = mel.v1.length;
  const stepTime = (60000 / currentTempo) / 2; // 8-е ноты

  melodyTimer = setInterval(() => {
    if (volumes.music === 0) return;
    
    // Играем все 7 голосов параллельно
    if (mel.v1 && mel.v1[currentMelodyIdx]) playTone(mel.v1[currentMelodyIdx], 'square', 0.05, stepTime / 1000);
    if (mel.v2 && mel.v2[currentMelodyIdx]) playTone(mel.v2[currentMelodyIdx], 'sawtooth', 0.03, stepTime / 1000);
    if (mel.v3 && mel.v3[currentMelodyIdx]) playTone(mel.v3[currentMelodyIdx], 'triangle', 0.02, stepTime / 1000);
    if (mel.v4 && mel.v4[currentMelodyIdx]) playTone(mel.v4[currentMelodyIdx], 'sine', 0.08, stepTime / 1000);
    if (mel.v5 && mel.v5[currentMelodyIdx]) playTone(mel.v5[currentMelodyIdx], 'triangle', 0.03, stepTime / 1000);
    if (mel.v6 && mel.v6[currentMelodyIdx]) playTone(mel.v6[currentMelodyIdx], 'sine', 0.04, stepTime / 1000);
    if (mel.v7 && mel.v7[currentMelodyIdx]) playDrum(mel.v7[currentMelodyIdx]);

    currentMelodyIdx = (currentMelodyIdx + 1) % length;
  }, stepTime);
}

function playTone(freq, wave, vol, dur) {
  if (freq === 0 || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = wave; osc.frequency.value = freq; 
    osc.connect(gain); gain.connect(musicGain);
    const now = audioCtx.currentTime;
    
    // Небольшая атака и затухание для "живого" звука
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    
    osc.start(now); osc.stop(now + dur + 0.05);
  } catch (e) {}
}

function playDrum(type) {
  if (!audioCtx || volumes.music === 0) return;
  const now = audioCtx.currentTime;
  try {
    if (type === 1) { // Kick (Bass Drum)
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      osc.connect(gain); gain.connect(musicGain);
      gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 2) { // Snare
      const bufferSize = audioCtx.sampleRate * 0.1;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
      const gain = audioCtx.createGain();
      noise.connect(filter); filter.connect(gain); gain.connect(musicGain);
      gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      noise.start(now); noise.stop(now + 0.1);
    } else if (type === 3) { // Hi-hat
      const bufferSize = audioCtx.sampleRate * 0.05;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 5000;
      const gain = audioCtx.createGain();
      noise.connect(filter); filter.connect(gain); gain.connect(musicGain);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      noise.start(now); noise.stop(now + 0.05);
    }
  } catch(e) {}
}

export function playSound(type) {
  if (!isInit || volumes.sfx === 0) return;
  try {
    const now = audioCtx.currentTime;
    function createNoise(duration) {
      const bufferSize = audioCtx.sampleRate * duration; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer; return noise;
    }
    if (type === 'hit') {
      const noise = createNoise(0.05); const noiseGain = audioCtx.createGain();
      noise.connect(noiseGain); noiseGain.connect(sfxGain);
      noiseGain.gain.setValueAtTime(0.2, now); noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      const osc = audioCtx.createOscillator(); const oscGain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      osc.connect(oscGain); oscGain.connect(sfxGain);
      oscGain.gain.setValueAtTime(0.2, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      noise.start(now); osc.start(now); noise.stop(now + 0.05); osc.stop(now + 0.1);
    } else if (type === 'step') {
      const osc = audioCtx.createOscillator(); const oscGain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.03);
      osc.connect(oscGain); oscGain.connect(sfxGain);
      oscGain.gain.setValueAtTime(0.1, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'collect') {
      [880, 1320].forEach((freq, i) => {
        const osc = audioCtx.createOscillator(); const oscGain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i*0.06);
        osc.connect(oscGain); oscGain.connect(sfxGain);
        oscGain.gain.setValueAtTime(0.1, now + i*0.06); oscGain.gain.exponentialRampToValueAtTime(0.01, now + i*0.06 + 0.1);
        osc.start(now + i*0.06); osc.stop(now + i*0.06 + 0.1);
      });
    } else if (type === 'magic') {
      const osc = audioCtx.createOscillator(); const oscGain = audioCtx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.05); osc.frequency.linearRampToValueAtTime(300, now + 0.1); osc.frequency.linearRampToValueAtTime(800, now + 0.15);
      osc.connect(oscGain); oscGain.connect(sfxGain);
      oscGain.gain.setValueAtTime(0.1, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  } catch (e) {}
}