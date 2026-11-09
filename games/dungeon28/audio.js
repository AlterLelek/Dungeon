let audioCtx = null;
let masterGain, musicGain, ambientGain, sfxGain;
let isInit = false;

let ambNodes = null;
let dripTimeout = null;
let melodyTimer = null;
let currentMelodyIdx = 0;
let currentTrack = 'cave';
let currentTempo = 600;

const volumes = { master: 0.2, music: 0.1, ambient: 0.05, sfx: 0.3, tempo: 600 };

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
    if (currentTrack) startMusic(currentTrack); // Перезапуск с новым темпом
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

const MELODIES = {
  cave: { 
    melody: [220,0,261.6,329.6,440,0,329.6,261.6,349.2,0,440,493.9,523.3,0,440,392,329.6,0,261.6,220,0,0,196,0,220,0,261.6,329.6,440,0,0,0],
    bass:   [110,0,110,0,130.8,0,130.8,0,146.8,0,146.8,0,164.8,0,164.8,0,110,0,110,0,130.8,0,130.8,0,98,0,98,0,110,0,110,0],
    harmony:[329.6,0,392,0,440,0,392,0,440,0,523.3,0,493.9,0,440,0,329.6,0,392,0,440,0,392,0,293.7,0,349.2,0,329.6,0,392,0]
  },
  elven: {
    melody: [523.3, 0, 587.3, 659.3, 784, 0, 659.3, 587.3, 523.3, 0, 440, 523.3, 587.3, 0, 0, 0],
    bass:   [261.6, 0, 261.6, 0, 329.6, 0, 329.6, 0, 261.6, 0, 220, 0, 293.7, 0, 0, 0],
    harmony:[392, 0, 440, 0, 493.9, 0, 440, 0, 392, 0, 349.2, 0, 440, 0, 0, 0]
  },
  dwarven: {
    melody: [130.8, 146.8, 164.8, 0, 130.8, 146.8, 164.8, 0, 174.6, 164.8, 146.8, 130.8, 0, 0, 0, 0],
    bass:   [65.4, 0, 65.4, 0, 82.4, 0, 82.4, 0, 87.3, 0, 73.4, 0, 65.4, 0, 0, 0],
    harmony:[196, 0, 196, 0, 246.9, 0, 246.9, 0, 261.6, 0, 220, 0, 196, 0, 0, 0]
  },
  dice: {
    melody: [880, 1046.5, 880, 1046.5, 880, 0, 659.3, 784, 0, 0, 0, 0],
    bass:   [220, 0, 220, 0, 220, 0, 164.8, 196, 0, 0, 0, 0],
    harmony:[440, 0, 440, 0, 440, 0, 329.6, 392, 0, 0, 0, 0]
  },
  // Shining Force - эпичный марш
  shining: {
    melody: [392, 0, 440, 493.9, 523.3, 0, 493.9, 440, 392, 0, 349.2, 392, 440, 0, 0, 0, 523.3, 0, 587.3, 659.3, 698.5, 0, 659.3, 587.3, 523.3, 0, 493.9, 523.3, 587.3, 0, 0, 0],
    bass:   [130.8, 0, 130.8, 0, 164.8, 0, 164.8, 0, 174.6, 0, 174.6, 0, 196, 0, 196, 0, 130.8, 0, 130.8, 0, 164.8, 0, 164.8, 0, 174.6, 0, 174.6, 0, 196, 0, 196, 0],
    harmony:[261.6, 0, 293.7, 0, 329.6, 0, 293.7, 0, 261.6, 0, 233.1, 0, 261.6, 0, 293.7, 0, 349.2, 0, 392, 0, 440, 0, 392, 0, 349.2, 0, 329.6, 0, 392, 0, 440, 0]
  },
  // Might and Magic 3 - замковая тема
  mm3: {
    melody: [329.6, 0, 392, 440, 0, 523.3, 0, 493.9, 440, 0, 392, 329.6, 0, 293.7, 0, 0, 329.6, 0, 392, 440, 0, 523.3, 0, 587.3, 659.3, 0, 587.3, 523.3, 0, 440, 0, 0],
    bass:   [110, 0, 110, 130.8, 0, 130.8, 0, 110, 146.8, 0, 146.8, 110, 0, 98, 0, 0, 110, 0, 110, 130.8, 0, 130.8, 0, 146.8, 164.8, 0, 146.8, 130.8, 0, 110, 0, 0],
    harmony:[164.8, 0, 196, 220, 0, 261.6, 0, 246.9, 220, 0, 196, 164.8, 0, 146.8, 0, 0, 164.8, 0, 196, 220, 0, 261.6, 0, 293.7, 329.6, 0, 293.7, 261.6, 0, 220, 0, 0]
  }
};

export function startMusic(track = 'cave') {
  initAudio();
  if (melodyTimer) clearInterval(melodyTimer);
  currentTrack = track;
  currentMelodyIdx = 0;
  
  const mel = MELODIES[track] || MELODIES.cave;
  const tempo = currentTempo;

  melodyTimer = setInterval(() => {
    if (volumes.music === 0) return;
    playTone(mel.melody[currentMelodyIdx], 'triangle', 0.05, 0.5);
    if (mel.bass) playTone(mel.bass[currentMelodyIdx], 'sine', 0.04, 0.5);
    if (mel.harmony) playTone(mel.harmony[currentMelodyIdx], 'sine', 0.03, 0.5);
    currentMelodyIdx = (currentMelodyIdx + 1) % mel.melody.length;
  }, tempo);
}

function playTone(freq, wave, vol, dur) {
  if (freq === 0) return;
  try {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = wave; osc.frequency.value = freq; 
    osc.connect(gain); gain.connect(musicGain);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
  } catch (e) {}
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