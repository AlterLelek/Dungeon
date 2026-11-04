// shared/audio.js
let audioCtx = null;
let settings = { sfx: 100 }; 

export function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

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