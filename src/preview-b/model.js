import { fishingWindow } from '../tide-model.js';

export const forecastNow = (now, offset) => new Date(now + offset * 1000).toISOString().slice(0, 16);

export function forecastDays(weather, now = Date.now()) {
  const today = forecastNow(now, weather.utc_offset_seconds || 0).slice(0, 10);
  const indices = weather.daily.time.map((date, i) => date >= today ? i : -1).filter(i => i >= 0).slice(0, 7);
  return { ...weather, daily: Object.fromEntries(Object.entries(weather.daily).map(([key, values]) => [key, Array.isArray(values) ? indices.map(i => values[i]) : values])) };
}
const toEpoch = (date, hour, offset) => Date.parse(`${date}T${hour}:00Z`) - offset * 1000;

export function nextFishingWindow(days, offset = 0, now = Date.now()) {
  const windows = days.flatMap(day => day.events.filter(event => event.type === 'high').map(event => {
    const window = fishingWindow(event);
    return { ...window, start: toEpoch(window.startDate, window.startHour, offset), end: toEpoch(window.endDate, window.endHour, offset) };
  })).sort((a, b) => a.start - b.start);
  const next = windows.find(window => window.end > now);
  if (!next) return null;
  const active = next.start <= now;
  const totalDuration = Math.max(1, next.end - next.start);
  const progress = active ? Math.min(100, Math.max(0, Math.round((now - next.start) / totalDuration * 100))) : 0;
  return { ...next, active, progress };
}

export function countdownText(milliseconds) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), rest = minutes % 60;
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', rest ? `${String(rest).padStart(hours || days ? 2 : 1, '0')}min` : ''].filter(Boolean).join(' ');
}

export function dayWindowRange(event, date) {
  const window = fishingWindow(event);
  if (window.startDate > date || window.endDate < date) return null;
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return { start: window.startDate < date ? 0 : minutes(window.startHour), end: window.endDate > date ? 1440 : minutes(window.endHour) };
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export function filterCaptures(entries, { species = '', location = '', from = '', to = '' } = {}) {
  return entries.filter(([, capture]) => normalize(capture.species).includes(normalize(species)) && normalize(capture.location).includes(normalize(location)) && (!from || capture.date >= from) && (!to || capture.date <= to));
}

export const PRESET_SPOTS = [
  { id: 'jp-bessa', name: 'Praia do Bessa', admin1: 'João Pessoa, PB', country_code: 'BR', latitude: -7.0633, longitude: -34.8428 },
  { id: 'cabedelo-intermares', name: 'Intermares', admin1: 'Cabedelo, PB', country_code: 'BR', latitude: -7.0319, longitude: -34.8375 },
  { id: 'jp-centro', name: 'João Pessoa', admin1: 'Paraíba', country_code: 'BR', latitude: -7.115, longitude: -34.8631 },
  { id: 'lucena', name: 'Praia de Lucena', admin1: 'Lucena, PB', country_code: 'BR', latitude: -6.8997, longitude: -34.8661 },
  { id: 'conde-tambaba', name: 'Costa do Conde', admin1: 'Conde, PB', country_code: 'BR', latitude: -7.3653, longitude: -34.7981 },
  { id: 'baia-traicao', name: 'Baía da Traição', admin1: 'Paraíba', country_code: 'BR', latitude: -6.6886, longitude: -34.9358 },
  { id: 'natal-ponta-negra', name: 'Ponta Negra', admin1: 'Natal, RN', country_code: 'BR', latitude: -5.8811, longitude: -35.1669 },
  { id: 'recife-boa-viagem', name: 'Boa Viagem', admin1: 'Recife, PE', country_code: 'BR', latitude: -8.1189, longitude: -34.8961 }
];

const fmtMinutes = totalMin => {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

export function solunarPeriods(dateString, moonPhase = 0, longitude = -34.8631) {
  const phase = Number.isFinite(moonPhase) ? ((moonPhase % 1) + 1) % 1 : 0;
  // Lunar upper transit shifts ~50 min later each day across the synodic cycle from solar noon (~12:00 local)
  const lonOffsetMin = ((longitude + 45) * -4) * 0.15;
  const upperTransitMin = ((720 + phase * 1440 + lonOffsetMin) % 1440 + 1440) % 1440;
  const lowerTransitMin = (upperTransitMin + 722) % 1440;
  const moonriseMin = (upperTransitMin - 372 + 1440) % 1440;
  const moonsetMin = (upperTransitMin + 372) % 1440;

  const makePeriod = (center, halfSpan, type, label) => {
    const startMin = ((Math.round(center - halfSpan) % 1440) + 1440) % 1440;
    const endMin = ((Math.round(center + halfSpan) % 1440) + 1440) % 1440;
    return {
      type,
      label,
      startHour: fmtMinutes(startMin),
      endHour: fmtMinutes(endMin),
      centerMin: Math.round(center),
      startMin,
      endMin
    };
  };

  const majors = [
    makePeriod(upperTransitMin, 60, 'major', 'Maior · Trânsito Lunar Superior'),
    makePeriod(lowerTransitMin, 60, 'major', 'Maior · Trânsito Lunar Inferior')
  ].sort((a, b) => a.startMin - b.startMin);

  const minors = [
    makePeriod(moonriseMin, 30, 'minor', 'Menor · Nascer da Lua'),
    makePeriod(moonsetMin, 30, 'minor', 'Menor · Pôr da Lua')
  ].sort((a, b) => a.startMin - b.startMin);

  // Solunar intensity peaks near New Moon (0 / 1) and Full Moon (0.5)
  const syzygyAlignment = Math.abs(Math.cos(2 * Math.PI * phase));
  const score = Math.round(52 + syzygyAlignment * 46);
  const rating = score >= 88 ? 'Altíssima (Sizígia)' : score >= 74 ? 'Muito Alta' : score >= 62 ? 'Boa Atividade' : 'Moderada';

  return { date: dateString, phase, score, rating, majors, minors };
}

export function checkSolunarSync(windowObj, solunar) {
  if (!windowObj || !solunar) return null;
  const toMin = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const wStart = toMin(windowObj.startHour);
  const wEnd = toMin(windowObj.endHour);
  const overlaps = (pStart, pEnd) => {
    const check = (a1, a2, b1, b2) => Math.max(a1, b1) <= Math.min(a2, b2);
    const wIntervals = wEnd >= wStart ? [[wStart, wEnd]] : [[wStart, 1440], [0, wEnd]];
    const pIntervals = pEnd >= pStart ? [[pStart, pEnd]] : [[pStart, 1440], [0, pEnd]];
    return wIntervals.some(([a1, a2]) => pIntervals.some(([b1, b2]) => check(a1, a2, b1, b2)));
  };

  for (const m of solunar.majors) {
    if (overlaps(m.startMin, m.endMin)) {
      return { type: 'major', badge: 'Hora de Ouro · Pico Solunar Maior', period: `${m.startHour}–${m.endHour}` };
    }
  }
  for (const m of solunar.minors) {
    if (overlaps(m.startMin, m.endMin)) {
      return { type: 'minor', badge: 'Sincronia Solunar Menor', period: `${m.startHour}–${m.endHour}` };
    }
  }
  return null;
}

export function recommendTackle({ waveHeight = null, wavePeriod = null, windSpeed = null } = {}) {
  const waves = Number.isFinite(waveHeight) ? waveHeight : 1.0;
  const wind = Number.isFinite(windSpeed) ? windSpeed : 16;
  const period = Number.isFinite(wavePeriod) ? wavePeriod : 8;

  if (waves >= 1.5 || wind >= 26) {
    return {
      condition: 'Mar Agitado / Correnteza Forte',
      sinker: 'Pirâmide ou Garra · 120g a 150g',
      sinkerNote: 'Crava na areia e evita que a linha corra lateralmente na arrebentação.',
      rig: 'Chicote curto (2 pernadas de 25cm) em fluorocarbono 0,40mm',
      rigNote: 'Pernadas curtas evitam embolar no rebojo das ondas.',
      line: 'Multifilamento 0,18mm–0,20mm + arranque cônico 0,25–0,50mm',
      strategy: 'Mantenha a vara alta no espera (4,20m+) para tirar a barriga da linha da primeira quebra.'
    };
  }
  if (waves >= 0.85 || wind >= 16 || period >= 10) {
    return {
      condition: 'Mar Moderado · Excelente Oxigenação',
      sinker: 'Pirâmide, Sextavada ou Carambola · 90g a 120g',
      sinkerNote: 'Bom alcance de arremesso e estabilidade no fundo do primeiro e segundo valão.',
      rig: 'Chicote padrão (2 pernadas de 35cm) c/ rotor e miçanga',
      rigNote: 'Permite trabalhar isca de fundo (betara/corvina) e meia-água (pampo).',
      line: 'Multifilamento 0,14mm–0,18mm + arranque 0,45mm',
      strategy: 'Explore a borda da espuma branca e a descida do primeiro valão.'
    };
  }
  return {
    condition: 'Mar Calmo · Água Limpa e Pouco Arrasto',
    sinker: 'Gota, Oliva ou Beach Bomb · 65g a 90g',
    sinkerNote: 'Aerodinâmica para arremessos longos e permite recolhimento lento ("arrastadinho").',
    rig: 'Chicote longo (pernadas de 45cm–50cm) em fluorocarbono 0,30mm',
    rigNote: 'Apresentação discreta e natural para peixes mais ariscos na água clara.',
    line: 'Multifilamento fino 0,12mm–0,16mm + arranque 0,40mm',
    strategy: 'Varra os poços mais fundos recolhendo meia volta de manivela a cada 2 minutos.'
  };
}

export function tideAmplitudeInfo(points = [], events = []) {
  const levels = (events.length ? events : points).map(item => item.level).filter(Number.isFinite);
  if (levels.length < 2) return null;
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const amplitude = Math.max(0, max - min);
  const category = amplitude >= 2.0 ? 'Maré Viva (Grande Amplitude)' : amplitude >= 1.3 ? 'Amplitude Moderada' : 'Maré Morta (Pequena Amplitude)';
  return { min, max, amplitude, category };
}

export const SPECIES_CATALOG = [
  {
    id: 'pampo',
    name: 'Pampo-galhudo / Pampinho',
    scientific: 'Trachinotus goodei · carolinus',
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Tatuíra', 'Corrupto', 'Camarão'],
    hook: 'Maruseigo #12 a #14 ou Chinu #4',
    minSize: '25 cm',
    bestTide: 'Duas últimas horas da enchente com espuma ativa',
    tip: 'Coloque um flutuador ou miçanga amarelo-fluorescente antes do anzol na pernada superior. O pampo é predador visual e ataca na espuma.'
  },
  {
    id: 'betara',
    name: 'Betara / Papa-terra',
    scientific: 'Menticirrhus americanus',
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Camarão', 'Minhoca de praia', 'Corrupto'],
    hook: 'Maruseigo #12 a #14 (pernada baixa)',
    minSize: '20 cm',
    bestTide: 'Início da enchente e reponto da maré alta',
    tip: 'Alimenta-se rente à areia. Deixe a pernada inferior bem próxima à chumbada nos poços de água mais escura.'
  },
  {
    id: 'robalo',
    name: 'Robalo-flecha / Peva',
    scientific: 'Centropomus undecimalis · parallelus',
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Wide Gap #2/0, Circle Hook ou Plugs 9cm',
    minSize: '35 cm (Peva) · 50 cm (Flecha)',
    bestTide: 'Maré correndo forte na boca de rios e valões',
    tip: 'Caça de emboscada na transição entre água clara e turva. Excelente no amanhecer e pôr do sol.'
  },
  {
    id: 'corvina',
    name: 'Corvina-de-linha',
    scientific: 'Micropogonias furnieri',
    zone: 'fundo',
    zoneLabel: '2º Valão & Fundo',
    baits: ['Camarão', 'Corrupto', 'Sardinha'],
    hook: 'Maruseigo #14 a #16 ou Chinu #6',
    minSize: '25 cm',
    bestTide: 'Três horas antes da preamar, especialmente à tardinha/noite',
    tip: 'Costuma encostar em cardumes quando a água está levemente turva ou esverdeada. Arremesse além da primeira quebra.'
  },
  {
    id: 'xareu',
    name: 'Xaréu / Xarelete',
    scientific: 'Caranx hippos · latus',
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Sardinha', 'Camarão', 'Artificial'],
    hook: 'Circle Hook #1/0 ou Chinu #7 reforçado',
    minSize: '30 cm',
    bestTide: 'Pico da enchente nas saídas de corrente de retorno',
    tip: 'Corrida explosiva! Mantenha a fricção do molinete calibrada para não estourar a pernada na primeira arrancada.'
  },
  {
    id: 'sargo',
    name: 'Sargo-de-dente',
    scientific: 'Archosargus probatocephalus',
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Tatuíra', 'Camarão', 'Corrupto'],
    hook: 'Chinu #5 a #7 (haste grossa)',
    minSize: '20 cm',
    bestTide: 'Maré alta cobrindo os recifes e corais',
    tip: 'Possui dentição muito forte capaz de abrir anzóis finos. Arremesse na beira da espuma próxima às pedras.'
  },
  {
    id: 'bagre',
    name: 'Bagre-marinho / Bandeirado',
    scientific: 'Genidens barbus · Bagre marinus',
    zone: 'fundo',
    zoneLabel: '2º Valão & Fundo',
    baits: ['Sardinha', 'Camarão', 'Minhoca de praia'],
    hook: 'Maruseigo #16 a #18',
    minSize: '40 cm',
    bestTide: 'Maré enchendo à noite ou com água barrenta',
    tip: 'Use alicate para retirar o anzol com segurança e nunca segure próximo aos três ferrões serrilhados.'
  },
  {
    id: 'tibiro',
    name: 'Tibiro / Guaivira',
    scientific: 'Oligoplites saurus',
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Maruseigo #14 na pernada superior c/ flutuador',
    minSize: '25 cm',
    bestTide: 'Maré alta com água limpa a esverdeada',
    tip: 'Caça na superfície e meia-água. Filete de sardinha ou camarão com flutuador branco é imbatível.'
  }
];

export function filterSpeciesCatalog(catalog = SPECIES_CATALOG, { query = '', bait = 'all', zone = 'all' } = {}) {
  const q = normalize(query);
  const b = normalize(bait);
  return catalog.filter(item => {
    const matchesQuery = !q || normalize(item.name).includes(q) || normalize(item.scientific).includes(q) || normalize(item.tip).includes(q) || item.baits.some(x => normalize(x).includes(q));
    const matchesBait = !b || b === 'all' || item.baits.some(x => normalize(x).includes(b));
    const matchesZone = !zone || zone === 'all' || item.zone === zone;
    return matchesQuery && matchesBait && matchesZone;
  });
}

export function computeAchievements(capturesObj = {}, uid = null) {
  const allEntries = Object.values(capturesObj || {}).filter(c => c && typeof c === 'object');
  const communityFish = allEntries.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const communityMaxWeight = allEntries.reduce((max, c) => Math.max(max, Number(c.weight) || 0), 0);

  const speciesCounts = new Map();
  const spotCounts = new Map();
  for (const c of allEntries) {
    const sp = String(c.species || '').trim();
    const loc = String(c.location || '').trim();
    const qty = Number(c.quantity) || 1;
    if (sp) speciesCounts.set(sp, (speciesCounts.get(sp) || 0) + qty);
    if (loc) spotCounts.set(loc, (spotCounts.get(loc) || 0) + 1);
  }
  const topCommunitySpecies = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const topCommunitySpot = [...spotCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const userEntries = uid ? allEntries.filter(c => c.uid === uid) : [];
  const userFish = userEntries.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const userTrips = userEntries.length;
  const userMaxWeight = userEntries.reduce((max, c) => Math.max(max, Number(c.weight) || 0), 0);
  const userSpeciesSet = new Set(userEntries.map(c => normalize(c.species)).filter(Boolean));
  const userSpotsSet = new Set(userEntries.map(c => normalize(c.location)).filter(Boolean));

  const badges = [
    {
      id: 'first-catch',
      icon: '🎣',
      title: 'Estreia na Areia',
      description: 'Registrou a 1ª captura no diário',
      unlocked: userTrips >= 1,
      progress: `${Math.min(1, userTrips)}/1 pescaria`
    },
    {
      id: 'tide-master',
      icon: '🌊',
      title: 'Mestre da Maré',
      description: '10 ou mais peixes capturados',
      unlocked: userFish >= 10,
      progress: `${Math.min(10, userFish)}/10 peixes`
    },
    {
      id: 'biodiversity',
      icon: '🐟',
      title: 'Especialista Costeiro',
      description: 'Capturou 3 ou mais espécies diferentes',
      unlocked: userSpeciesSet.size >= 3,
      progress: `${Math.min(3, userSpeciesSet.size)}/3 espécies`
    },
    {
      id: 'heavyweight',
      icon: '⚖️',
      title: 'Troféu de Praia',
      description: 'Registrou pescaria com 2 kg ou mais',
      unlocked: userMaxWeight >= 2,
      progress: userMaxWeight > 0 ? `${userMaxWeight.toLocaleString('pt-BR')} kg / 2 kg` : '0 / 2 kg'
    },
    {
      id: 'explorer',
      icon: '🧭',
      title: 'Explorador do Litoral',
      description: 'Pescou em 3 ou mais praias diferentes',
      unlocked: userSpotsSet.size >= 3,
      progress: `${Math.min(3, userSpotsSet.size)}/3 locais`
    },
    {
      id: 'legend',
      icon: '🏆',
      title: 'Lenda do Surfcasting',
      description: '30 ou mais peixes acumulados no ranking',
      unlocked: userFish >= 30,
      progress: `${Math.min(30, userFish)}/30 peixes`
    }
  ];

  return {
    community: {
      totalFish: communityFish,
      totalRecords: allEntries.length,
      maxWeight: communityMaxWeight,
      topSpecies: topCommunitySpecies,
      topSpot: topCommunitySpot
    },
    personal: {
      totalFish: userFish,
      totalTrips: userTrips,
      maxWeight: userMaxWeight,
      speciesCount: userSpeciesSet.size,
      spotsCount: userSpotsSet.size
    },
    badges
  };
}
