const TREE_SEASONS = ['summer', 'autumn', 'winter', 'spring'];
const SEASON_LABELS = { summer: 'Лето', autumn: 'Осень', winter: 'Зима', spring: 'Весна' };
const SEASON_ALIASES = [
  ['summer', ['summer', 'лето']],
  ['autumn', ['autumn', 'осень']],
  ['winter', ['winter', 'зима']],
  ['spring', ['spring', 'весна']]
];

export const TREES_SPECIES = [];
export const TREES_STATE = {
  ready: false,
  sprites: 0,
  entries: [],
  missing: [],
  error: null,
  source: null
};

function normalizeSeason(value) {
  const text = String(value || '').toLowerCase();
  for (const [season, aliases] of SEASON_ALIASES) {
    if (aliases.some(alias => text.includes(alias))) return season;
  }
  return null;
}

function seasonFromPath(assetPath) {
  const match = String(assetPath || '').match(/(?:^|\/)trees\/(summer|autumn|winter|spring)\//i);
  return match ? match[1].toLowerCase() : null;
}

function speciesFromPath(assetPath) {
  const file = String(assetPath || '').split('/').pop() || '';
  let key = file.replace(/\.svg$/i, '').replace(/[_-]?\d+$/, '');
  key = key.replace(/[_-](summer|autumn|winter|spring)$/i, '');
  return key.replace(/[_-]+$/, '');
}

function runtimeUrl(assetPath) {
  const value = String(assetPath || '');
  if (!value) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('../')) return value;
  return '../../' + value.replace(/^\.\//, '');
}

function isTreeEntry(entry) {
  if (!entry) return false;
  if (entry.type === 'tree') return true;
  return /(?:^|\/)assets\/trees\//.test(String(entry.path || ''));
}

export async function loadTreeRegistry(url = '../../assets/manifest.json') {
  TREES_STATE.error = null;
  TREES_STATE.source = url;
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('manifest ' + response.status);
    const manifest = await response.json();
    const entries = (Array.isArray(manifest) ? manifest : []).filter(isTreeEntry);
    const bySpecies = new Map();

    for (const entry of entries) {
      const assetPath = String(entry.path || '');
      const season = seasonFromPath(assetPath)
        || normalizeSeason(entry.group)
        || normalizeSeason((entry.tags || []).join(' '));
      const id = speciesFromPath(assetPath);
      if (!season || !id) continue;

      let species = bySpecies.get(id);
      if (!species) {
        species = { id, files: {}, variants: {}, manifestPath: assetPath };
        bySpecies.set(id, species);
      }

      if (!species.variants[season]) species.variants[season] = [];
      species.variants[season].push(assetPath);
      if (!species.files[season]) species.files[season] = assetPath;
    }

    const species = [...bySpecies.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
    const missing = [];

    for (const item of species) {
      for (const season of TREE_SEASONS) {
        if (item.files[season]) continue;
        const fallback = TREE_SEASONS.find(candidate => item.files[candidate]) || null;
        if (fallback) {
          item.files[season] = item.files[fallback];
          item.variants[season] = item.variants[fallback].slice();
        }
        missing.push({ species: item.id, season, fallback });
      }
    }

    TREES_SPECIES.length = 0;
    TREES_SPECIES.push(...species);
    TREES_STATE.sprites = entries.length;
    TREES_STATE.entries = entries.map(entry => entry.path);
    TREES_STATE.missing = missing;
    TREES_STATE.ready = true;
    return TREES_STATE;
  } catch (error) {
    TREES_STATE.error = error && error.message ? error.message : String(error);
    TREES_STATE.ready = false;
    TREES_STATE.sprites = 0;
    TREES_STATE.entries = [];
    TREES_STATE.missing = [];
    TREES_SPECIES.length = 0;
    return TREES_STATE;
  }
}

export function treeFileFor(speciesIndex, season, variantSeed = 0) {
  const species = TREES_SPECIES[speciesIndex];
  if (!species) return null;
  const list = species.variants && species.variants[season];
  if (Array.isArray(list) && list.length) {
    const index = Math.abs(Math.floor(Number(variantSeed) || 0)) % list.length;
    return runtimeUrl(list[index]);
  }
  const path = species.files && species.files[season];
  return path ? runtimeUrl(path) : null;
}

export function preloadTreeSprites(load) {
  if (typeof load !== 'function') return 0;
  const seen = new Set();
  let count = 0;
  for (const species of TREES_SPECIES) {
    for (const season of TREE_SEASONS) {
      const list = species.variants && species.variants[season];
      const paths = Array.isArray(list) && list.length ? list : [species.files[season]];
      for (const path of paths) {
        if (!path || seen.has(path)) continue;
        seen.add(path);
        load(runtimeUrl(path));
        count += 1;
      }
    }
  }
  return count;
}

export function treeRegistryReport() {
  const missing = TREES_STATE.missing || [];
  const unresolved = missing.filter(item => !item.fallback);
  return {
    ready: TREES_STATE.ready,
    error: TREES_STATE.error,
    source: TREES_STATE.source,
    species: TREES_SPECIES.length,
    sprites: TREES_STATE.sprites,
    seasons: TREE_SEASONS.slice(),
    missingSeasons: missing.map(item => ({
      species: item.species,
      season: item.season,
      fallback: item.fallback
    })),
    unresolvedSeasons: unresolved.map(item => ({
      species: item.species,
      season: item.season
    })),
    fallbackCount: missing.filter(item => item.fallback).length
  };
}

export { TREE_SEASONS, SEASON_LABELS };
