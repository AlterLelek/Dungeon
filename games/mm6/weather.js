// Погодные частицы поверх поля: дождь и снег.
// Погода привязана к сезону и меняется по циклу шагов (не чаще заданного интервала).
const MAX_PARTICLES = 145;
const DEFAULT_WEATHER_CYCLE_STEPS = 100;

const WEATHER_PRESETS = {
  clear:      { kind: null,   intensity: 0,    icon: '☀', label: 'Ясно',     name: '' },
  drizzle:    { kind: 'rain', intensity: 0.16, icon: '🌦', label: 'Морось',   name: '' },
  rain:       { kind: 'rain', intensity: 0.34, icon: '🌧', label: 'Дождь',    name: '' },
  heavy_rain: { kind: 'rain', intensity: 0.52, icon: '🌧', label: 'Ливень',   name: '' },
  snow:       { kind: 'snow', intensity: 0.42, icon: '🌨', label: 'Снег',     name: '' },
  heavy_snow: { kind: 'snow', intensity: 0.68, icon: '❄', label: 'Снегопад', name: '' }
};

// Допустимые типы погоды по сезонам: зима — без дождя, лето — без снега.
const SEASON_ALLOWED_WEATHER = {
  spring: ['clear', 'drizzle', 'rain'],
  summer: ['clear', 'drizzle', 'rain'],
  autumn: ['clear', 'drizzle', 'rain', 'heavy_rain'],
  winter: ['clear', 'snow', 'heavy_snow']
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function createWeather(width, height, options = {}) {
  const particles = [];
  let seasonId = null;
  let seasonName = '';
  let preset = null;
  let presetId = 'clear';
  let targetCount = 0;
  let opacity = 0;
  let targetOpacity = 0;
  let cycleSteps = Math.max(1, Math.round(options.cycleSteps || DEFAULT_WEATHER_CYCLE_STEPS));
  let lastChangeTurn = -1;
  let initialized = false;

  function allowedForSeason(season) {
    return SEASON_ALLOWED_WEATHER[season] || ['clear'];
  }

  function isAllowed(season, weatherId) {
    return allowedForSeason(season).indexOf(weatherId) !== -1;
  }

  function makePreset(season, weatherId) {
    const base = WEATHER_PRESETS[weatherId] || WEATHER_PRESETS.clear;
    return { ...base, name: seasonName || season || '' };
  }

  function applyPreset(weatherId, forceRespawn) {
    const id = WEATHER_PRESETS[weatherId] ? weatherId : 'clear';
    presetId = id;
    preset = makePreset(seasonId, id);
    targetCount = preset.kind ? Math.round(MAX_PARTICLES * preset.intensity) : 0;
    targetOpacity = preset.kind ? Math.min(1, 0.55 + preset.intensity * 0.6) : 0;
    if (forceRespawn) {
      for (let i = 0; i < particles.length; i++) respawn(particles[i], false);
    }
  }

  function respawn(p, fromTop) {
    p.kind = preset && preset.kind ? preset.kind : 'rain';
    p.x = Math.random() * (width + 80) - 40;
    p.y = fromTop ? -Math.random() * height : Math.random() * height;
    if (p.kind === 'rain') {
      p.len = 7 + Math.random() * 9;
      p.vx = -38 - Math.random() * 26;
      p.vy = 380 + Math.random() * 200;
      p.alpha = 0.2 + Math.random() * 0.25;
    } else {
      p.r = 0.9 + Math.random() * 1.8;
      p.vx = -6 + Math.random() * 12;
      p.vy = 22 + Math.random() * 32;
      p.phase = Math.random() * Math.PI * 2;
      p.sway = 0.8 + Math.random() * 1.6;
      p.alpha = 0.35 + Math.random() * 0.45;
    }
  }

  function pickWeatherForSeason(season, prevId) {
    const allowed = allowedForSeason(season);
    if (allowed.length <= 1) return allowed[0];
    // Не повторяем ту же погоду два цикла подряд, если есть выбор.
    const pool = allowed.filter(id => id !== prevId);
    return pick(pool.length ? pool : allowed);
  }

  function ensureSeasonWeather(season) {
    if (!isAllowed(season, presetId)) {
      applyPreset(pickWeatherForSeason(season, null), true);
    }
  }

  function setSeason(id, config) {
    const nextSeason = id || seasonId;
    const changedSeason = nextSeason !== seasonId;
    seasonId = nextSeason;
    seasonName = (config && config.name) || seasonName || '';
    if (config && config.cycleSteps) cycleSteps = Math.max(1, Math.round(config.cycleSteps));

    if (!initialized) {
      const initial = config && config.initialWeather && isAllowed(seasonId, config.initialWeather)
        ? config.initialWeather
        : pickWeatherForSeason(seasonId, null);
      applyPreset(initial, true);
      initialized = true;
      lastChangeTurn = -1;
      return;
    }

    if (changedSeason) {
      // При смене сезона погода, противоречащая сезону, заменяется допустимой.
      ensureSeasonWeather(seasonId);
    }
  }

  function onTurn(turn, config) {
    if (config && config.cycleSteps) cycleSteps = Math.max(1, Math.round(config.cycleSteps));
    if (!initialized) setSeason(seasonId || (config && config.season) || 'spring', config);
    if (!Number.isFinite(turn) || turn < 0) return;
    ensureSeasonWeather(seasonId);
    if (lastChangeTurn < 0) {
      lastChangeTurn = turn;
      return;
    }
    if (turn - lastChangeTurn >= cycleSteps) {
      // Меняем погоду один раз за цикл; догоняем пропущенные циклы одним изменением.
      lastChangeTurn = turn - (turn % cycleSteps);
      applyPreset(pickWeatherForSeason(seasonId, presetId), false);
    }
  }

  function update(dtMs) {
    const dt = Math.max(0, Math.min(50, dtMs)) / 1000;
    opacity += (targetOpacity - opacity) * Math.min(1, dt * 3.5);

    let missing = targetCount - particles.length;
    if (missing > 0) {
      for (let i = 0; i < Math.min(missing, 12); i++) {
        const p = {};
        respawn(p, false);
        particles.push(p);
      }
    } else if (missing < 0) {
      particles.splice(0, Math.min(-missing, Math.ceil(dt * 45)));
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.kind === 'rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        p.phase += dt * p.sway;
        p.x += (p.vx + Math.sin(p.phase) * 9) * dt;
        p.y += p.vy * dt;
      }
      if (p.y > height + 12 || p.x < -50 || p.x > width + 50) respawn(p, true);
    }
  }

  function draw(ctx) {
    if (!particles.length || opacity < 0.01) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.kind === 'rain') {
        ctx.strokeStyle = 'rgba(186,216,255,' + p.alpha + ')';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * p.len / p.vy, p.y + p.len);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(244,250,255,' + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function label() {
    return preset ? preset.icon + ' ' + preset.label + (preset.name ? ' · ' + preset.name : '') : '';
  }

  function debug() {
    return { season: seasonId, weather: presetId, kind: preset ? preset.kind : null, count: particles.length, opacity: Math.round(opacity * 100) / 100, cycleSteps, lastChangeTurn };
  }

  return { setSeason, onTurn, update, draw, label, debug, cycleSteps: () => cycleSteps };
}

export const WEATHER_CYCLE_STEPS = DEFAULT_WEATHER_CYCLE_STEPS;
export { SEASON_ALLOWED_WEATHER, WEATHER_PRESETS };
