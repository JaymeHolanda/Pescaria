// Integration with Tábua de Marés API v2 (https://tabuamare.api.br/api/v2)
// Provides official CHM / Marinha do Brasil tide tables for Brazilian ports outside João Pessoa/Cabedelo.

export const BRAZIL_HARBORS = [
  { id: 'rj03', name: 'Porto do Rio de Janeiro (Ilha Fiscal)', state: 'RJ', lat: -22.8967, lng: -43.1667 },
  { id: 'rj05', name: 'Porto do Forno (Arraial do Cabo / Búzios)', state: 'RJ', lat: -22.9728, lng: -42.0144 },
  { id: 'rj07', name: 'Porto de Angra dos Reis', state: 'RJ', lat: -23.0111, lng: -44.3186 },
  { id: 'rj04', name: 'Porto de Itaguaí', state: 'RJ', lat: -22.9317, lng: -43.8350 },
  { id: 'rj02', name: 'Terminal de Imbetiba (Macaé)', state: 'RJ', lat: -22.3842, lng: -41.7719 },
  { id: 'rj01', name: 'Porto do Açu (São João da Barra)', state: 'RJ', lat: -21.8211, lng: -41.0019 },
  { id: 'sp02', name: 'Porto de Santos', state: 'SP', lat: -23.9619, lng: -46.3042 },
  { id: 'sp01', name: 'Porto de São Sebastião', state: 'SP', lat: -23.8111, lng: -45.4014 },
  { id: 'pe02', name: 'Porto do Recife', state: 'PE', lat: -8.0539, lng: -34.8711 },
  { id: 'pe03', name: 'Porto de Suape', state: 'PE', lat: -8.3944, lng: -34.9592 },
  { id: 'pe01', name: 'Fernando de Noronha', state: 'PE', lat: -3.8372, lng: -32.4033 },
  { id: 'rn04', name: 'Porto de Natal', state: 'RN', lat: -5.7792, lng: -35.2047 },
  { id: 'rn03', name: 'Porto de Guamaré', state: 'RN', lat: -5.1067, lng: -36.3183 },
  { id: 'rn02', name: 'Porto de Macau', state: 'RN', lat: -5.1117, lng: -36.6342 },
  { id: 'rn01', name: 'Porto de Areia Branca', state: 'RN', lat: -4.9542, lng: -37.1356 },
  { id: 'ce02', name: 'Porto de Mucuripe (Fortaleza)', state: 'CE', lat: -3.7150, lng: -38.4767 },
  { id: 'ce01', name: 'Terminal do Pecém', state: 'CE', lat: -3.5419, lng: -38.7989 },
  { id: 'ba03', name: 'Porto de Salvador', state: 'BA', lat: -12.9694, lng: -38.5139 },
  { id: 'ba02', name: 'Porto de Aratu', state: 'BA', lat: -12.7944, lng: -38.4950 },
  { id: 'ba04', name: 'Porto de Ilhéus (Malhado)', state: 'BA', lat: -14.7828, lng: -39.0292 },
  { id: 'sc03', name: 'Porto de Florianópolis', state: 'SC', lat: -27.5969, lng: -48.5556 },
  { id: 'sc02', name: 'Porto de Itajaí', state: 'SC', lat: -26.9111, lng: -48.6583 },
  { id: 'sc01', name: 'Porto de São Francisco do Sul', state: 'SC', lat: -26.2428, lng: -48.6383 },
  { id: 'sc04', name: 'Porto de Imbituba', state: 'SC', lat: -28.2311, lng: -48.6514 },
  { id: 'es03', name: 'Porto de Vitória', state: 'ES', lat: -20.3222, lng: -40.3375 },
  { id: 'es01', name: 'Terminal de Barra do Riacho', state: 'ES', lat: -19.8431, lng: -40.0569 },
  { id: 'es05', name: 'Terminal da Ponta do Ubu', state: 'ES', lat: -20.7844, lng: -40.5736 },
  { id: 'al01', name: 'Porto de Maceió', state: 'AL', lat: -9.6731, lng: -35.7239 },
  { id: 'se02', name: 'Capitania dos Portos (Aracaju)', state: 'SE', lat: -10.9125, lng: -37.0481 },
  { id: 'pr02', name: 'Porto de Paranaguá', state: 'PR', lat: -25.5025, lng: -48.5228 },
  { id: 'rs01', name: 'Porto do Rio Grande', state: 'RS', lat: -32.0417, lng: -52.0986 },
  { id: 'pi01', name: 'Porto de Luís Correia', state: 'PI', lat: -2.8819, lng: -41.6681 },
  { id: 'ma01', name: 'Porto de São Luís', state: 'MA', lat: -2.5297, lng: -44.3028 },
  { id: 'ma05', name: 'Porto de Tutóia', state: 'MA', lat: -2.7619, lng: -42.2744 },
  { id: 'pa03', name: 'Salinópolis', state: 'PA', lat: -0.6139, lng: -47.3561 },
  { id: 'pa05', name: 'Porto de Belém', state: 'PA', lat: -1.4486, lng: -48.4978 }
];

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const rad = deg => deg * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function findNearestBrazilianHarbor(location, maxDistanceKm = 180) {
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let best = null;
  let bestDist = Infinity;
  for (const harbor of BRAZIL_HARBORS) {
    const dist = haversineKm(lat, lng, harbor.lat, harbor.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = harbor;
    }
  }
  if (!best || bestDist > maxDistanceKm) return null;
  return { ...best, distanceKm: Math.round(bestDist) };
}

const wallTime = time => Date.parse(`${time.length === 16 ? `${time}:00` : time}Z`);

export function parseTabuaMareResponse(payloads = []) {
  const byDate = new Map();
  let harborMeta = null;

  for (const payload of payloads) {
    const record = payload?.data?.[0];
    if (!record) continue;
    const year = Number(record.year) || 2026;
    if (!harborMeta) {
      harborMeta = {
        id: record.id,
        harborName: record.harbor_name || '',
        state: String(record.state || '').toUpperCase(),
        institution: record.data_collection_institution || 'CHM / Marinha',
        meanLevel: record.mean_level
      };
    }
    for (const m of record.months || []) {
      const mm = String(m.month).padStart(2, '0');
      for (const d of m.days || []) {
        const dd = String(d.day).padStart(2, '0');
        const dateStr = `${year}-${mm}-${dd}`;
        const entries = (d.hours || [])
          .filter(h => h && typeof h.hour === 'string' && Number.isFinite(Number(h.level)))
          .map(h => [h.hour.slice(0, 5), Number(h.level)]);
        if (entries.length) byDate.set(dateStr, entries);
      }
    }
  }

  const allEvents = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .flatMap(([date, entries]) => entries.map(([hour, level]) => ({
      time: `${date}T${hour}`,
      hour,
      level,
      official: true
    })));

  allEvents.forEach((event, i) => {
    const neighbor = allEvents[i + 1] || allEvents[i - 1];
    if (neighbor) event.type = event.level > neighbor.level ? 'high' : 'low';
  });

  return { harborMeta, allEvents };
}

export function buildHarborTideDay(parsedTide, date) {
  if (!parsedTide?.allEvents?.length) return null;
  const { allEvents, harborMeta } = parsedTide;
  const events = allEvents.filter(e => e.time.startsWith(`${date}T`));
  if (!events.length) return null;

  const points = [];
  const start = wallTime(`${date}T00:00`);
  const end = start + 86400000;

  for (let i = 0; i < allEvents.length - 1; i++) {
    const a = allEvents[i], b = allEvents[i + 1];
    const ta = wallTime(a.time), tb = wallTime(b.time);
    if (tb < start || ta >= end) continue;
    const samples = new Set([Math.max(start, ta), Math.min(end - 60000, tb)]);
    for (let t = Math.ceil(Math.max(start, ta) / 900000) * 900000; t < Math.min(end, tb); t += 900000) {
      samples.add(t);
    }
    for (const t of [...samples].sort((x, y) => x - y)) {
      if (t < ta || t > tb || t < start || t >= end) continue;
      const time = new Date(t).toISOString().slice(0, 16);
      const level = t === ta ? a.level : t === tb ? b.level : a.level + (b.level - a.level) * (1 - Math.cos(Math.PI * (t - ta) / (tb - ta))) / 2;
      if (points.at(-1)?.time !== time) {
        points.push({ time, hour: time.slice(11), level });
      }
    }
  }

  return {
    date,
    events,
    points,
    official: false,
    brazilApi: true,
    available: true,
    harborName: harborMeta?.harborName || '',
    harborState: harborMeta?.state || '',
    institution: harborMeta?.institution || 'CHM / Marinha'
  };
}

async function fetchTabuaMarePath(apiPath, signal) {
  // 1. Try local Vite proxy first (/api/tabuamare/...)
  try {
    const localRes = await fetch(`/api/tabuamare${apiPath}`, { signal });
    if (localRes.ok) {
      const contentType = localRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await localRes.json();
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
  }

  // 2. Fallback to AllOrigins CORS relay for static hosting (GitHub Pages)
  const targetUrl = `https://tabuamare.api.br/api/v2${apiPath}`;
  const relayUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  const relayRes = await fetch(relayUrl, { signal });
  if (!relayRes.ok) throw new Error(`API Tábua de Marés indisponível (${relayRes.status})`);
  return relayRes.json();
}

export async function fetchBrazilianHarborTides(location, dateStrings = [], signal) {
  const harbor = findNearestBrazilianHarbor(location);
  if (!harbor || !dateStrings.length) return null;

  // Include 1 day before the first date so midnight-crossing windows & curves have the prior extreme
  const firstEpoch = Date.parse(`${dateStrings[0]}T12:00:00Z`) - 86400000;
  const prevDate = new Date(firstEpoch).toISOString().slice(0, 10);
  const allDates = [prevDate, ...dateStrings];

  const daysByMonth = new Map();
  for (const d of allDates) {
    const month = Number(d.slice(5, 7));
    const day = Number(d.slice(8, 10));
    if (!daysByMonth.has(month)) daysByMonth.set(month, new Set());
    daysByMonth.get(month).add(day);
  }

  const payloads = await Promise.all(
    [...daysByMonth.entries()].map(([month, daySet]) => {
      const daysParam = `[${[...daySet].sort((a, b) => a - b).join(',')}]`;
      return fetchTabuaMarePath(`/tabua-mare/${harbor.id}/${month}/${encodeURIComponent(daysParam)}`, signal);
    })
  );

  const parsed = parseTabuaMareResponse(payloads);
  if (!parsed.allEvents.length) return null;
  if (!parsed.harborMeta.harborName) parsed.harborMeta.harborName = harbor.name;
  return { ...parsed, matchedHarbor: harbor };
}
