// Fotos das espécies via API pública do iNaturalist (sem chave, CORS liberado).
// As imagens são de usuários da comunidade, com licenças Creative Commons:
// sempre exibimos a atribuição retornada pela API.

const API = 'https://api.inaturalist.org/v1/taxa';
const CACHE_KEY = 'mare-certa-species-photos-v1';
const TTL = 14 * 24 * 60 * 60 * 1000;
const memory = new Map();

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

function writeCache(taxon, value) {
  try {
    const cache = readCache();
    cache[taxon] = { ...value, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* armazenamento cheio ou indisponível: segue só com memória */ }
}

/** Converte a resposta da API em { url, attribution, link } ou null. */
export function parseTaxonPhoto(payload, taxon) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const wanted = String(taxon || '').toLowerCase();
  const match = results.find(r => String(r?.name || '').toLowerCase() === wanted && r.default_photo) || results.find(r => r?.default_photo);
  const photo = match?.default_photo;
  const url = photo?.medium_url || photo?.url;
  if (!url) return null;
  return {
    url: url.replace('/square.', '/medium.'),
    attribution: photo.attribution || 'iNaturalist',
    link: match.id ? `https://www.inaturalist.org/taxa/${match.id}` : 'https://www.inaturalist.org/'
  };
}

export function loadSpeciesPhoto(taxon) {
  if (!taxon) return Promise.resolve(null);
  if (memory.has(taxon)) return memory.get(taxon);
  const cached = readCache()[taxon];
  if (cached?.url && Date.now() - (cached.savedAt || 0) < TTL) {
    const hit = Promise.resolve(cached);
    memory.set(taxon, hit);
    return hit;
  }
  const request = fetch(`${API}?q=${encodeURIComponent(taxon)}&rank=species&per_page=3&locale=pt-BR`)
    .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then(payload => {
      const photo = parseTaxonPhoto(payload, taxon);
      if (photo) writeCache(taxon, photo);
      return photo;
    })
    .catch(() => { memory.delete(taxon); return null; });
  memory.set(taxon, request);
  return request;
}
