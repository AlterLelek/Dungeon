// shared/audio.js
let audioCtx = null;
let ambNodes = null;
let dripTimeout = null;
let melodyTimer = null;
let currentMelodyIdx = 0;

// Настройки по умолчанию
let settings = { sfx: 100, amb: 50, mel: 50, tempo: 600, music: true };

export function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// --- ФОНОВЫЙ ГУЛ ---
export function startAmbient() {
  try {
    const ac = getAudio();
    if (ambNodes) return;
    
    const bufferSize = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random()*2 - 1;
      last = (last + 0.02*white) / 1.02;
      data[i] = last * 3.5;
    }
    
    const src = ac.createBufferSource();
    src.buffer = buffer; src.loop = true;
    
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 120;
    
    const master = ac.createGain();
    master.gain.value = 0.35 * (settings.amb / 100);
    
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.18 * (settings.amb / 100);
    
    lfo.connect(lfoDepth); lfoDepth.connect(master.gain); lfo.start();
    src.connect(filter); filter.connect(master); master.connect(ac.destination);
    src.start();
    
    ambNodes = { src, master, lfoDepth };
    drip(); // Запускаем капли
  } catch (e) {}
}

export function stopAmbient() {
  if (ambNodes) { 
    try { ambNodes.src.stop(); } catch (e) {} 
    ambNodes = null; 
  }
  if (dripTimeout) { clearTimeout(dripTimeout); dripTimeout = null; }
}

function drip() {
  const delay = 9000 + Math.random() * 21000;
  dripTimeout = setTimeout(() => {
    try {
      if (audioCtx && settings.amb > 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(800 + Math.random()*300, audioCtx.currentTime);
        o.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12);
        g.gain.setValueAtTime(0.05 * (settings.amb / 100), audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + 0.16);
      }
    } catch (e) {}
    drip();
  }, delay);
}

// --- МУЗЫКА ---
const MELODIES = {
  cave: { 
    melody: [220,0,261.6,329.6,440,0,329.6,261.6,349.2,0,440,493.9,523.3,0,440,392,329.6,0,261.6,220,0,0,196,0,220,0,261.6,329.6,440,0,0,0],
    bass:   [110,0,110,0,130.8,0,130.8,0,146.8,0,146.8,0,164.8,0,164.8,0,110,0,110,0,130.8,0,130.8,0,98,0,98,0,110,0,110,0],
    harmony:[329.6,0,392,0,440,0,392,0,440,0,523.3,0,493.9,0,440,0,329.6,0,392,0,440,0,392,0,293.7,0,349.2,0,329.6,0,392,0]
  }
};

function playTone(freq, wave, vol, dur) {
  if (settings.mel === 0 || freq === 0) return;
  try {
    const ac = getAudio(); const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = wave || 'triangle';
    osc.frequency.value = freq; 
    osc.connect(gain); gain.connect(ac.destination);
    const now = ac.currentTime;
    const wScale = (wave === 'square') ? 0.6 : 1;
    gain.gain.setValueAtTime(vol * (settings.mel / 100) * wScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
  } catch (e) {}
}

export function startMusic() {
  if (melodyTimer || !settings.music) return;
  currentMelodyIdx = 0;
  
  melodyTimer = setInterval(() => {
    const mel = MELODIES.cave;
    playTone(mel.melody[currentMelodyIdx], 'triangle', 0.045, 0.5);
    playTone(mel.bass[currentMelodyIdx], 'sine', 0.035, 0.5);
    playTone(mel.harmony[currentMelodyIdx], 'sine', 0.03, 0.5);
    
    currentMelodyIdx = (currentMelodyIdx + 1) % mel.melody.length;
  }, settings.tempo);
}

export function stopMusic() {
  if (melodyTimer) { clearInterval(melodyTimer); melodyTimer = null; }
}

// --- ЗВУКИ (SFX) ---
export function playSound(type) {
  if (settings.sfx === 0) return;
  try {
    const ac = getAudio(); const now = ac.currentTime; const V = settings.sfx / 100;
    const masterGain = ac.createGain(); masterGain.connect(ac.destination);
    
    function createNoise(duration) {
      const bufferSize = ac.sampleRate * duration; const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ac.createBufferSource(); noise.buffer = buffer; return noise;
    }

    if (type === 'hit') {
      const noise = createNoise(0.05); const noiseGain = ac.createGain();
      noise.connect(noiseGain); noiseGain.connect(masterGain);
      noiseGain.gain.setValueAtTime(0.2 * V, now); noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      const osc = ac.createOscillator(); const oscGain = ac.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      osc.connect(oscGain); oscGain.connect(masterGain);
      oscGain.gain.setValueAtTime(0.3 * V, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      noise.start(now); osc.start(now); noise.stop(now + 0.05); osc.stop(now + 0.1);
    } else if (type === 'kill') {
      const noise = createNoise(0.2); const noiseGain = ac.createGain();
      noise.connect(noiseGain); noiseGain.connect(masterGain);
      noiseGain.gain.setValueAtTime(0.15 * V, now); noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      const osc = ac.createOscillator(); const oscGain = ac.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      osc.connect(oscGain); oscGain.connect(masterGain);
      oscGain.gain.setValueAtTime(0.1 * V, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noise.start(now); osc.start(now); noise.stop(now + 0.2); osc.stop(now + 0.15);
    } else if (type === 'step') {
      const osc = ac.createOscillator(); const oscGain = ac.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.03);
      osc.connect(oscGain); oscGain.connect(masterGain);
      oscGain.gain.setValueAtTime(0.1 * V, now); oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'collect') {
      [880, 1320].forEach((freq, i) => {
        const osc = ac.createOscillator(); const oscGain = ac.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i*0.06);
        osc.connect(oscGain); oscGain.connect(masterGain);
        oscGain.gain.setValueAtTime(0.1 * V, now + i*0.06); oscGain.gain.exponentialRampToValueAtTime(0.01, now + i*0.06 + 0.1);
        osc.start(now + i*0.06); osc.stop(now + i*0.06 + 0.1);
      });
    } else if (type === 'menu') {
      const osc = ac.createOscillator(); const gain = ac.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
      osc.connect(gain); gain.connect(masterGain);
      gain.gain.setValueAtTime(0.05 * V, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    }
  } catch (e) { console.error("Ошибка звука:", e); }
}

// Настройки из UI
export function updateAudioSettings(key, value) {
  if (key === 'sfx') settings.sfx = value;
  if (key === 'amb') {
    settings.amb = value;
    if (ambNodes) {
      const k = value / 100;
      ambNodes.master.gain.value = 0.35 * k;
      ambNodes.lfoDepth.gain.value = 0.18 * k;
    }
  }
  if (key === 'mel') settings.mel = value;
  if (key === 'music') {
    settings.music = value;
    if (value) startMusic(); else stopMusic();
  }
}