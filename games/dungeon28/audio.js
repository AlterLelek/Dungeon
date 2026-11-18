let audioCtx = null;
let masterGain, musicGain, ambientGain, sfxGain;
let isInit = false;

let ambNodes = null;
let dripTimeout = null;
let melodyTimer = null;
let currentMelodyIdx = 0;

const AUDIO_KEY = 'pz_audio';
const DEFAULTS = { master: 10, music: 5, ambient: 3, sfx: 10, tempo: 600, melody: 'town' };

let audioSettings = { ...DEFAULTS };
let currentTrack = audioSettings.melody;
let currentTempo = audioSettings.tempo;
const volumes = { master: 1, music: 0.5, ambient: 0.3, sfx: 1 };

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function syncVolumes() {
  volumes.master = audioSettings.master / 10;
  volumes.music = audioSettings.music / 10;
  volumes.ambient = audioSettings.ambient / 10;
  volumes.sfx = audioSettings.sfx / 10;
}

function saveAudioSettings() {
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audioSettings)); } catch (e) {}
}

function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of ['master', 'music', 'ambient', 'sfx']) {
      if (Number.isFinite(saved[key])) audioSettings[key] = clamp(saved[key], 0, 10);
    }
    if (Number.isFinite(saved.tempo)) audioSettings.tempo = clamp(saved.tempo, 300, 1200);
    if (saved.melody) audioSettings.melody = saved.melody;
  } catch (e) {}
}

export function resetAudioSettings() {
  audioSettings = { ...DEFAULTS };
  currentTempo = audioSettings.tempo;
  currentTrack = audioSettings.melody;
  syncVolumes();
  applyVolumes();
  saveAudioSettings();
}

loadAudioSettings();
currentTempo = audioSettings.tempo;
currentTrack = audioSettings.melody;
syncVolumes();

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

export function getVolume(type) {
    if (type === 'tempo') return currentTempo;
    if (type === 'melody') return currentTrack;
    if (type in audioSettings) return audioSettings[type];
    return Math.round((volumes[type] || 0) * 10);
}

export function getTrack() { return currentTrack; }

export function setTrack(track) {
  if (!MELODIES[track]) return;
  currentTrack = track;
  audioSettings.melody = track;
  saveAudioSettings();
}

function applyVolumes() {
  if (!isInit) return;
  masterGain.gain.value = volumes.master;
  musicGain.gain.value = volumes.music;
  ambientGain.gain.value = volumes.ambient;
  sfxGain.gain.value = volumes.sfx;
  if (ambNodes && ambNodes.lfoDepth) ambNodes.lfoDepth.gain.value = volumes.ambient * 0.15;
}

export function setVolume(type, val) {
  if (!Number.isFinite(val)) return;

  if (type === 'tempo') {
    currentTempo = clamp(val, 300, 1200);
    audioSettings.tempo = currentTempo;
    if (currentTrack) startMusic(currentTrack);
    saveAudioSettings();
    return;
  }
  if (!(type in audioSettings)) return;

  audioSettings[type] = clamp(val, 0, 10);
  syncVolumes();
  applyVolumes();
  saveAudioSettings();

  if (type === 'ambient' && audioSettings.ambient > 0 && !ambNodes) startAmbient();
}

export function startAmbient() {
  if (audioSettings.ambient <= 0) return;
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
    lfoDepth.gain.value = volumes.ambient * 0.15;
    lfo.connect(lfoDepth); lfoDepth.connect(ambientGain.gain); lfo.start();
    src.connect(filter); filter.connect(ambientGain);
    src.start();
    ambNodes = { src, lfo, lfoDepth };
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

const N = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50
};

const MELODY_SF2 = {
    v1: [
        N.G4, 0, N.C5, 0, N.E5, N.G5, N.C6, 0, N.B5, N.G5, N.E5, 0, N.D5, N.E5, N.F5, 0,
        N.E5, 0, N.C5, 0, N.G4, 0, N.C5, N.E5, N.G5, 0, N.A5, N.G5, N.F5, N.E5, N.D5, 0,
        N.C5, 0, N.E5, 0, N.G5, N.E5, N.C6, 0, N.B5, 0, N.A5, N.G5, N.F5, 0, N.E5, 0,
        N.D5, 0, N.E5, N.F5, N.G5, 0, N.A5, N.B5, N.C6, 0, N.G5, 0, N.C5, 0, 0, 0
    ],
    v2: [
        N.E4, 0, N.G4, 0, N.C5, N.E5, N.G5, 0, N.E5, 0, N.C5, 0, N.B4, 0, N.A4, 0,
        N.G4, 0, N.E4, 0, N.C4, 0, N.E4, N.G4, N.C5, 0, N.E5, 0, N.D5, 0, N.B4, 0,
        N.C5, 0, N.E5, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.C5, 0, N.A4, 0, N.G4, 0,
        N.F4, 0, N.G4, 0, N.A4, 0, N.B4, 0, N.C5, 0, N.G4, 0, N.C4, 0, 0, 0
    ],
    v3: [
        N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.C5, N.E5, N.G4, N.B4, N.D5, N.G5, N.D5, N.B4, N.G4, N.B4,
        N.A4, N.C5, N.E5, N.A5, N.E5, N.C5, N.A4, N.C5, N.F4, N.A4, N.C5, N.F5, N.C5, N.A4, N.F4, N.A4,
        N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.C5, N.E5, N.G4, N.B4, N.D5, N.G5, N.D5, N.B4, N.G4, N.B4,
        N.F4, N.A4, N.C5, N.F5, N.G4, N.B4, N.D5, N.G5, N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, N.C4, 0
    ],
    v4: [
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.A3, 0, N.A3, 0, N.F3, 0, N.F3, 0,
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.F3, 0, N.F3, 0, N.G3, 0, N.G3, 0,
        N.C3, 0, N.C3, 0, N.G3, 0, N.G3, 0, N.A3, 0, N.A3, 0, N.F3, 0, N.F3, 0,
        N.D3, 0, N.D3, 0, N.G3, 0, N.G3, 0, N.C3, 0, N.C3, 0, N.C3, 0, 0, 0
    ],
    v5: [
        N.E4, 0, N.C5, 0, N.G4, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0, N.C5, 0,
        N.G4, 0, N.E4, 0, N.C4, 0, N.G4, 0, N.A4, 0, N.F4, 0, N.G4, 0, N.B4, 0,
        N.E4, 0, N.C5, 0, N.G4, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0, N.C5, 0,
        N.F4, 0, N.A4, 0, N.G4, 0, N.B4, 0, N.E4, 0, N.G4, 0, N.C4, 0, 0, 0
    ],
    v6: [
        0, 0, N.E5, 0, N.G5, 0, N.C5, 0, N.E5, 0, N.G5, 0, N.A4, 0, N.C5, 0,
        N.B4, 0, N.G4, 0, N.E4, 0, N.G4, 0, N.C5, 0, N.E5, 0, N.D5, 0, N.F5, 0,
        N.E5, 0, N.G5, 0, N.C6, 0, N.G5, 0, N.E5, 0, N.C5, 0, N.A4, 0, N.F4, 0,
        N.A4, 0, N.C5, 0, N.B4, 0, N.D5, 0, N.C5, 0, N.E5, 0, N.G4, 0, 0, 0
    ],
    v7: [
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3,
        1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3
    ]
};

// «Городская тема» — переложение MIDI Shining Force «Begining in the Village»
// (в GBA-версии — «Cheerful Street Corner») в 7 голосов звукового движка игры.
// stepScale: 0.5 — вдвое чаще шагов обычной мелодии (128 шагов ≈ 38 сек).
const MELODY_TOWN = {
    stepScale: 0.5,
    v1: [
        0, 0, 329.63, 0, 329.63, 329.63, 0, 0, 329.63, 349.23, 369.99, 392, 0, 0, 392, 349.23,
        0, 349.23, 349.23, 349.23, 0, 349.23, 0, 349.23, 329.63, 0, 0, 329.63, 0, 0, 329.63, 0,
        0, 329.63, 329.63, 369.99, 392, 293.66, 0, 392, 349.23, 0, 349.23, 349.23, 0, 349.23, 349.23, 0,
        349.23, 329.63, 0, 329.63, 440, 440, 0, 523.25, 220, 440, 392, 349.23, 329.63, 349.23, 0, 0,
        392, 329.63, 0, 0, 329.63, 0, 349.23, 246.94, 246.94, 246.94, 196, 196, 0, 196, 196, 196,
        261.63, 233.08, 233.08, 196, 220, 220, 0, 246.94, 220, 0, 196, 246.94, 0, 246.94, 220, 220,
        196, 196, 196, 261.63, 246.94, 220, 196, 196, 196, 0, 196, 233.08, 0, 196, 220, 0,
        261.63, 261.63, 246.94, 0, 0, 0, 0, 0, 0, 0, 246.94, 0, 246.94, 261.63, 0, 0
    ],
    v2: [
        0, 261.63, 261.63, 0, 261.63, 261.63, 0, 0, 261.63, 261.63, 261.63, 246.94, 0, 0, 246.94, 246.94,
        0, 246.94, 293.66, 246.94, 0, 246.94, 0, 261.63, 261.63, 0, 0, 261.63, 0, 0, 261.63, 0,
        0, 261.63, 261.63, 261.63, 246.94, 246.94, 0, 246.94, 246.94, 0, 246.94, 293.66, 0, 246.94, 587.33, 293.66,
        246.94, 261.63, 261.63, 164.81, 0, 220, 0, 261.63, 0, 220, 0, 174.61, 0, 174.61, 0, 0,
        0, 164.81, 0, 0, 0, 0, 0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81,
        0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0, 0, 0, 130.81, 0, 130.81, 0, 130.81,
        0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0, 0, 0, 130.81, 0, 130.81, 0, 0,
        0, 130.81, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 130.81, 0, 0
    ],
    v3: [
        261.63, 392, 0, 622.25, 392, 0, 622.25, 659.26, 392, 523.25, 493.88, 0, 587.33, 554.37, 392, 587.33,
        554.37, 392, 0, 554.37, 0, 523.25, 392, 523.25, 523.25, 622.25, 659.26, 392, 622.25, 659.26, 392, 659.26,
        622.25, 523.25, 392, 493.88, 0, 0, 554.37, 392, 0, 554.37, 392, 0, 554.37, 587.33, 493.88, 349.23,
        349.23, 329.63, 392, 698.46, 659.26, 698.46, 0, 783.99, 987.77, 659.26, 587.33, 523.25, 587.33, 493.88, 0, 622.25,
        523.25, 392, 554.37, 587.33, 392, 587.33, 523.25, 587.33, 349.23, 523.25, 0, 0, 196, 0, 329.63, 0,
        233.08, 0, 0, 293.66, 277.18, 293.66, 246.94, 220, 196, 349.23, 0, 0, 246.94, 0, 0, 0,
        392, 311.13, 392, 246.94, 220, 196, 0, 0, 0, 233.08, 0, 0, 220, 0, 0, 261.63,
        0, 0, 246.94, 0, 0, 0, 0, 0, 0, 0, 349.23, 0, 261.63, 0, 659.26, 622.25
    ],
    v4: [
        65.41, 164.81, 82.41, 155.56, 65.41, 82.41, 155.56, 65.41, 98, 130.81, 98, 98, 146.83, 98, 98, 146.83,
        98, 98, 87.31, 98, 0, 123.47, 98, 65.41, 65.41, 155.56, 65.41, 98, 155.56, 65.41, 98, 164.81,
        65.41, 130.81, 98, 98, 98, 98, 98, 98, 87.31, 138.59, 98, 87.31, 138.59, 98, 98, 87.31,
        65.41, 65.41, 98, 87.31, 130.81, 130.81, 87.31, 130.81, 246.94, 65.41, 146.83, 130.81, 146.83, 98, 98, 155.56,
        65.41, 98, 138.59, 98, 98, 146.83, 98, 146.83, 98, 65.41, 65.41, 65.41, 65.41, 164.81, 164.81, 65.41,
        69.3, 164.81, 164.81, 73.42, 69.3, 73.42, 98, 65.41, 65.41, 73.42, 65.41, 65.41, 98, 65.41, 65.41, 65.41,
        164.81, 164.81, 98, 65.41, 164.81, 164.81, 65.41, 164.81, 65.41, 69.3, 164.81, 164.81, 73.42, 65.41, 65.41, 77.78,
        65.41, 65.41, 98, 0, 0, 0, 0, 0, 0, 0, 98, 0, 65.41, 65.41, 164.81, 155.56
    ],
    v5: [
        622.25, 0, 0, 0, 392, 0, 622.25, 0, 392, 0, 493.88, 0, 587.33, 0, 392, 0,
        554.37, 0, 0, 0, 0, 0, 392, 0, 523.25, 0, 659.26, 0, 622.25, 0, 392, 0,
        622.25, 0, 392, 0, 0, 0, 554.37, 0, 0, 0, 392, 0, 554.37, 0, 493.88, 0,
        523.25, 0, 392, 0, 659.26, 0, 0, 0, 987.77, 0, 587.33, 0, 587.33, 0, 0, 0,
        523.25, 0, 554.37, 0, 392, 0, 523.25, 0, 493.88, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        392, 0, 392, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 392, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 659.26, 0
    ],
    v6: [
        261.63, 523.25, 0, 783.99, 392, 0, 739.99, 783.99, 392, 659.26, 493.88, 0, 587.33, 587.33, 392, 698.46,
        554.37, 493.88, 0, 587.33, 0, 659.26, 392, 659.26, 523.25, 659.26, 659.26, 523.25, 622.25, 783.99, 392, 783.99,
        622.25, 523.25, 587.33, 587.33, 0, 0, 587.33, 493.88, 0, 587.33, 587.33, 0, 554.37, 587.33, 493.88, 349.23,
        349.23, 329.63, 392, 880, 659.26, 880, 0, 783.99, 987.77, 698.46, 587.33, 659.26, 587.33, 783.99, 0, 622.25,
        659.26, 392, 739.99, 783.99, 392, 783.99, 698.46, 880, 349.23, 523.25, 0, 0, 329.63, 0, 329.63, 0,
        0, 0, 0, 349.23, 277.18, 293.66, 0, 0, 0, 349.23, 0, 0, 0, 0, 0, 0,
        392, 369.99, 392, 261.63, 329.63, 0, 0, 0, 0, 0, 0, 0, 349.23, 0, 0, 369.99,
        0, 0, 392, 0, 0, 0, 0, 0, 0, 0, 349.23, 0, 261.63, 0, 659.26, 739.99
    ],
    v7: [
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0,
        1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0
    ]
};

const MELODIES = {
    sf2: MELODY_SF2,
    town: MELODY_TOWN,
    cave: { v1: [N.C4, N.D4, N.E4, 0, N.G4, 0, N.E4, 0], v2: [], v3: [], v4: [N.C3,0,N.G3,0], v5: [], v6: [], v7: [] },
    elven: { v1: [N.E5, N.G5, N.C6, N.B5, N.G5, 0], v2: [], v3: [], v4: [N.C3,0], v5: [], v6: [], v7: [] },
    dwarven: { v1: [N.C3, N.E3, N.G3, N.C4, 0], v2: [], v3: [], v4: [N.C2,0], v5: [], v6: [], v7: [] },
    dice: { v1: [N.C5, 0, N.C5, 0], v2: [], v3: [], v4: [], v5: [], v6: [], v7: [] }
};

export function startMusic(track = 'town') {
  initAudio();
  if (melodyTimer) clearInterval(melodyTimer);
  currentTrack = track;
  currentMelodyIdx = 0;
  
  const mel = MELODIES[track] || MELODIES.town;
  const length = mel.v1.length;
  const stepTime = Math.round(currentTempo * (mel.stepScale || 1));

  melodyTimer = setInterval(() => {
    if (volumes.music <= 0.01) return;
    
    if (mel.v1 && mel.v1[currentMelodyIdx]) playTone(mel.v1[currentMelodyIdx], 'square', 0.15, stepTime / 1000);
    if (mel.v2 && mel.v2[currentMelodyIdx]) playTone(mel.v2[currentMelodyIdx], 'sawtooth', 0.08, stepTime / 1000);
    if (mel.v3 && mel.v3[currentMelodyIdx]) playTone(mel.v3[currentMelodyIdx], 'triangle', 0.08, stepTime / 1000);
    if (mel.v4 && mel.v4[currentMelodyIdx]) playTone(mel.v4[currentMelodyIdx], 'sine', 0.15, stepTime / 1000);
    if (mel.v5 && mel.v5[currentMelodyIdx]) playTone(mel.v5[currentMelodyIdx], 'triangle', 0.08, stepTime / 1000);
    if (mel.v6 && mel.v6[currentMelodyIdx]) playTone(mel.v6[currentMelodyIdx], 'sine', 0.1, stepTime / 1000);
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
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    
    osc.start(now); osc.stop(now + dur + 0.05);
  } catch (e) {}
}

function playDrum(type) {
  if (!audioCtx || volumes.music <= 0.01) return;
  const now = audioCtx.currentTime;
  try {
    if (type === 1) {
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      osc.connect(gain); gain.connect(musicGain);
      gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 2) {
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
    } else if (type === 3) {
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
  if (!isInit || volumes.sfx <= 0.01) return;
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