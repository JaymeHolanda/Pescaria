import { fishingWindow } from '../tide-model.js';
export {
  BRAZIL_HARBORS,
  findNearestBrazilianHarbor,
  parseTabuaMareResponse,
  buildHarborTideDay,
  fetchBrazilianHarborTides
} from './brazil-tides-api.js';

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
  { id: 'rj-copacabana', name: 'Rio de Janeiro', admin1: 'Rio de Janeiro, RJ', country_code: 'BR', latitude: -22.9064, longitude: -43.1822 },
  { id: 'rj-arraial', name: 'Arraial do Cabo', admin1: 'Rio de Janeiro, RJ', country_code: 'BR', latitude: -22.9661, longitude: -42.0278 },
  { id: 'natal-ponta-negra', name: 'Ponta Negra', admin1: 'Natal, RN', country_code: 'BR', latitude: -5.8811, longitude: -35.1669 },
  { id: 'recife-boa-viagem', name: 'Boa Viagem', admin1: 'Recife, PE', country_code: 'BR', latitude: -8.1189, longitude: -34.8961 },
  { id: 'sp-santos', name: 'Santos', admin1: 'São Paulo, SP', country_code: 'BR', latitude: -23.9618, longitude: -46.3322 },
  { id: 'ba-salvador', name: 'Salvador', admin1: 'Bahia, BA', country_code: 'BR', latitude: -12.9714, longitude: -38.5014 }
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

export const COASTAL_REGIONS = {
  norte: { id: 'norte', label: 'Norte', long: 'litoral Norte e costa amazônica' },
  nordeste: { id: 'nordeste', label: 'Nordeste', long: 'litoral Nordeste' },
  sudeste: { id: 'sudeste', label: 'Sudeste', long: 'litoral Sudeste' },
  sul: { id: 'sul', label: 'Sul', long: 'litoral Sul' }
};

/**
 * Classifica um ponto do litoral brasileiro em uma das quatro regiões costeiras.
 * Retorna null para locais fora do Brasil ou sem coordenadas válidas.
 */
export function coastalRegionFor(location) {
  const lat = Number(location?.latitude), lon = Number(location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const country = String(location?.country_code || 'BR').toUpperCase();
  if (country !== 'BR') return null;
  if (lat > 5.5 || lat < -34.5 || lon > -28 || lon < -74) return null;
  if (lat > -3.2 && lon < -42) return 'norte';
  if (lat >= -18.3) return 'nordeste';
  if (lat >= -25.3) return 'sudeste';
  return 'sul';
}

export const SPECIES_CATALOG = [
  {
    id: 'pampo',
    name: 'Pampo-galhudo / Pampinho',
    scientific: 'Trachinotus goodei · carolinus',
    photoTaxon: 'Trachinotus goodei',
    regions: ['nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Menticirrhus americanus',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Centropomus undecimalis',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Micropogonias furnieri',
    regions: ['nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Caranx hippos',
    regions: ['norte', 'nordeste', 'sudeste'],
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
    photoTaxon: 'Archosargus probatocephalus',
    regions: ['nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Genidens barbus',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
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
    photoTaxon: 'Oligoplites saurus',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Maruseigo #14 na pernada superior c/ flutuador',
    minSize: '25 cm',
    bestTide: 'Maré alta com água limpa a esverdeada',
    tip: 'Caça na superfície e meia-água. Filete de sardinha ou camarão com flutuador branco é imbatível.'
  },
  {
    id: 'anchova',
    name: 'Anchova / Enchova',
    scientific: 'Pomatomus saltatrix',
    photoTaxon: 'Pomatomus saltatrix',
    regions: ['sudeste', 'sul'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Sardinha', 'Artificial'],
    hook: 'Chinu #6 a #8 com empate de aço curto',
    minSize: '35 cm',
    bestTide: 'Enchente com mar mexido e água verde, ao amanhecer',
    tip: 'Dentes afiadíssimos cortam náilon fino: use empate de aço. Costuma passar em cardumes junto às frentes frias.'
  },
  {
    id: 'espada',
    name: 'Peixe-espada',
    scientific: 'Trichiurus lepturus',
    photoTaxon: 'Trichiurus lepturus',
    regions: ['nordeste', 'sudeste', 'sul'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Sardinha', 'Artificial'],
    hook: 'Maruseigo #16 a #18 com cabo de aço fino',
    minSize: '50 cm',
    bestTide: 'Noite com maré enchendo perto de canais e píeres',
    tip: 'Ataca iscas brilhantes em meia-água. Filé de sardinha bem esticado no anzol e recolhimento lento funcionam melhor.'
  },
  {
    id: 'carapeba',
    name: 'Carapeba',
    scientific: 'Eugerres brasilianus',
    photoTaxon: 'Eugerres brasilianus',
    regions: ['nordeste', 'sudeste'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Camarão', 'Minhoca de praia'],
    hook: 'Maruseigo #10 a #12 (pernada fina)',
    minSize: '20 cm',
    bestTide: 'Início da vazante na boca de mangues e rios',
    tip: 'Boca pequena e mordida delicada: use isca miúda e linha leve. Muito comum em estuários com fundo de lama e areia.'
  },
  {
    id: 'pescada-amarela',
    name: 'Pescada-amarela',
    scientific: 'Cynoscion acoupa',
    photoTaxon: 'Cynoscion acoupa',
    regions: ['norte', 'nordeste'],
    zone: 'fundo',
    zoneLabel: '2º Valão & Fundo',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Chinu #8 ou Circle Hook #2/0',
    minSize: '45 cm',
    bestTide: 'Marés de sizígia, na virada da maré em canais fundos',
    tip: 'Prefere água barrenta e correnteza. Camarão vivo arrastado rente ao fundo é a isca mais produtiva.'
  },
  {
    id: 'camurupim',
    name: 'Camurupim / Pirapema',
    scientific: 'Megalops atlanticus',
    photoTaxon: 'Megalops atlanticus',
    regions: ['norte', 'nordeste'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Sardinha', 'Artificial', 'Camarão'],
    hook: 'Circle Hook #4/0 a #6/0 com líder grosso',
    minSize: 'Pesque e solte',
    bestTide: 'Maré enchendo em barras de rio, ao amanhecer',
    tip: 'Espécie vulnerável: prefira o pesque e solte. Saltos acrobáticos exigem paciência e fricção suave.'
  },
  {
    id: 'cioba',
    name: 'Cioba / Sioba',
    scientific: 'Lutjanus synagris',
    photoTaxon: 'Lutjanus synagris',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Camarão', 'Sardinha', 'Lula'],
    hook: 'Chinu #4 a #6 ou Maruseigo #14',
    minSize: '25 cm',
    bestTide: 'Enchente cobrindo parcéis e recifes de coral',
    tip: 'Coloração avermelhada característica. Carne nobre e muito valorizada na costa paraibana e nordestina. Iscas frescas rente às pedras.'
  },
  {
    id: 'cavala',
    name: 'Cavala / Cavala-branca',
    scientific: 'Scomberomorus cavalla',
    photoTaxon: 'Scomberomorus cavalla',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Sardinha', 'Artificial'],
    hook: 'Anzol #3/0 a #5/0 com empate de aço flexível',
    minSize: '40 cm',
    bestTide: 'Reponto da maré alta e águas limpas com sol forte',
    tip: 'Predador velocíssimo com dentes cortantes. Muito comum em pontões, quebra-mares (como o Dique de Cabedelo) e pesca embarcada.'
  },
  {
    id: 'badejo',
    name: 'Badejo / Serigado',
    scientific: 'Mycteroperca bonaci · Epinephelus',
    photoTaxon: 'Mycteroperca bonaci',
    regions: ['nordeste', 'sudeste'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Sardinha', 'Camarão', 'Lula'],
    hook: 'Circle Hook #4/0 a #6/0 reforçado',
    minSize: '45 cm',
    bestTide: 'Estofa da maré alta sobre lajes e parcéis',
    tip: 'Peixe de toca e fundo de pedra. Ao fisgar, mantenha a pressão imediata para evitar que entoque nas fendas de coral.'
  },
  {
    id: 'guarajuba',
    name: 'Guarajuba / Carimbamba',
    scientific: 'Carangoides crysos',
    photoTaxon: 'Carangoides crysos',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Sardinha', 'Camarão', 'Artificial'],
    hook: 'Maruseigo #14 a #16 ou Chinu #5',
    minSize: '25 cm',
    bestTide: 'Maré enchendo com correnteza ativa',
    tip: 'Da família dos carangídeos (parentes do xaréu), ataca em cardume na meia-água. Responde muito bem a pequenos jigs e plugs rápidos.'
  },
  {
    id: 'pitangola',
    name: 'Pitangola / Olhete',
    scientific: 'Seriola rivoliana',
    photoTaxon: 'Seriola rivoliana',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Sardinha', 'Artificial', 'Lula'],
    hook: 'Circle Hook #2/0 a #4/0',
    minSize: '35 cm',
    bestTide: 'Maré correndo forte em cabeços de pedra e canais fundos',
    tip: 'Nativa da costa nordestina e parcéis. Excelente briga de corrida contínua; use linha de monofilamento resistente ao atrito.'
  },
  {
    id: 'tainha',
    name: 'Tainha / Parati',
    scientific: 'Mugil liza · Mugil curema',
    photoTaxon: 'Mugil liza',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Minhoca de praia', 'Camarão', 'Massa de pão'],
    hook: 'Mosquitinho ou Maruseigo #8 a #10',
    minSize: '25 cm',
    bestTide: 'Início da enchente com mar manso e água clara',
    tip: 'Boca mole e alimentação herbívora/detritívora. Exige chicote fino, bóia leve e ferrada sutil no momento do toque.'
  },
  {
    id: 'coro',
    name: 'Coró / Cocoroca',
    scientific: 'Pomadasys corvinaeformis',
    photoTaxon: 'Pomadasys corvinaeformis',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Camarão', 'Tatuíra', 'Corrupto'],
    hook: 'Maruseigo #10 a #12',
    minSize: '15 cm',
    bestTide: 'Qualquer estágio de maré com água batida na beira',
    tip: 'Emite som característico tipo ronco ao sair da água. Muito abundante nas praias urbanas da Paraíba e do Nordeste.'
  },
  {
    id: 'porquinho',
    name: 'Peixe-porquinho / Peroá',
    scientific: 'Balistes capriscus',
    photoTaxon: 'Balistes capriscus',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Camarão', 'Lula', 'Sardinha'],
    hook: 'Chinu #2 a #4 (haste curta e reforçada)',
    minSize: '20 cm',
    bestTide: 'Reponto da maré perto de recifes e costões',
    tip: 'Pele grossa e dentes frontais incisivos capazes de triturar conchas. Deixe a isca bem amarrada com elastricot.'
  },
  {
    id: 'arabaiana',
    name: 'Arabaiana / Olho-de-boi',
    scientific: 'Seriola dumerili',
    photoTaxon: 'Seriola dumerili',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'fundo',
    zoneLabel: '2º Valão & Fundo',
    baits: ['Sardinha', 'Artificial', 'Lula'],
    hook: 'Circle Hook #5/0 a #7/0',
    minSize: '50 cm',
    bestTide: 'Marés vivas na boca da barra e parcéis afastados',
    tip: 'Grande troféu do litoral nordestino, apelidado de locomotiva dos mares. Exige carretilha ou molinete de grande porte com muito freio.'
  },
  {
    id: 'vermelho',
    name: 'Vermelho / Caranha',
    scientific: 'Lutjanus purpureus · jocu',
    photoTaxon: 'Lutjanus purpureus',
    regions: ['norte', 'nordeste'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Sardinha', 'Camarão', 'Lula'],
    hook: 'Circle Hook #3/0 a #5/0',
    minSize: '30 cm',
    bestTide: 'Noite de lua crescente ou cheia em parcéis',
    tip: 'Habita fendas de arrecifes costeiros e águas mais profundas. Ataque fulminante que exige ferrada firme e rápida.'
  },
  {
    id: 'garoupa',
    name: 'Garoupa-verdadeira',
    scientific: 'Epinephelus marginatus',
    photoTaxon: 'Epinephelus marginatus',
    regions: ['nordeste', 'sudeste', 'sul'],
    zone: 'estruturas',
    zoneLabel: 'Estuários & Pedras',
    baits: ['Sardinha', 'Camarão', 'Lula'],
    hook: 'Circle Hook #3/0 a #6/0',
    minSize: '47 cm',
    bestTide: 'Maré alta banhando os costões e quebra-mares',
    tip: 'Espécie territorial de fundo de pedra. Respeite o tamanho mínimo de reprodução para manter o equilíbrio costeiro.'
  },
  {
    id: 'ubarana',
    name: 'Ubarana / Ubarana-rato',
    scientific: 'Elops saurus',
    photoTaxon: 'Elops saurus',
    regions: ['norte', 'nordeste', 'sudeste'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Maruseigo #14 a #16',
    minSize: '30 cm',
    bestTide: 'Início da enchente em barras de rios e lagoas costeiras',
    tip: 'Saltadora espetacular, apelidada de ladyfish. Ataca plugs de superfície e camarões vivos com muita vivacidade.'
  },
  {
    id: 'peixe-galo',
    name: 'Peixe-galo',
    scientific: 'Selene vomer',
    photoTaxon: 'Selene vomer',
    regions: ['norte', 'nordeste', 'sudeste', 'sul'],
    zone: 'beira',
    zoneLabel: 'Beira & 1º Valão',
    baits: ['Camarão', 'Tatuíra', 'Minhoca de praia'],
    hook: 'Maruseigo #12 a #14',
    minSize: '20 cm',
    bestTide: 'Maré enchente com água limpa a transparente',
    tip: 'Corpo comprimido prateado com longos filamentos dorsais. Alimenta-se de pequenos crustáceos na areia macia.'
  },
  {
    id: 'miraguaia',
    name: 'Miraguaia / Piraúna',
    scientific: 'Pogonias cromis',
    photoTaxon: 'Pogonias cromis',
    regions: ['sudeste', 'sul'],
    zone: 'fundo',
    zoneLabel: '2º Valão & Fundo',
    baits: ['Corrupto', 'Tatuíra', 'Caranguejo'],
    hook: 'Circle Hook #2/0 a #4/0',
    minSize: '40 cm',
    bestTide: 'Maré vazando ou reponto de baixa no fundo de valões',
    tip: 'Parente gigante da corvina com barbilhões no queixo. Muito comum no litoral sulista, alimentando-se de moluscos no fundo.'
  },
  {
    id: 'carapau',
    name: 'Carapau / Xixarro',
    scientific: 'Trachurus lathami',
    photoTaxon: 'Trachurus lathami',
    regions: ['nordeste', 'sudeste', 'sul'],
    zone: 'canais',
    zoneLabel: 'Canais & Poços',
    baits: ['Camarão', 'Sardinha', 'Artificial'],
    hook: 'Maruseigo #10 a #12 com pernada fina',
    minSize: '15 cm',
    bestTide: 'Água limpa corrente na meia-água',
    tip: 'Cardumes rápidos que atacam sabikis e iscas miúdas. Excelente como isca viva para predadores maiores como cavala e xaréu.'
  }
];

export function filterSpeciesCatalog(catalog = SPECIES_CATALOG, { query = '', bait = 'all', zone = 'all', region = 'all' } = {}) {
  const q = normalize(query);
  const b = normalize(bait);
  return catalog.filter(item => {
    const matchesQuery = !q || normalize(item.name).includes(q) || normalize(item.scientific).includes(q) || normalize(item.tip).includes(q) || item.baits.some(x => normalize(x).includes(q));
    const matchesBait = !b || b === 'all' || item.baits.some(x => normalize(x).includes(b));
    const matchesZone = !zone || zone === 'all' || item.zone === zone;
    const matchesRegion = !region || region === 'all' || !Array.isArray(item.regions) || item.regions.includes(region);
    return matchesQuery && matchesBait && matchesZone && matchesRegion;
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
  const userSpeciesMap = new Map();
  let topTrophySpecies = '—';
  let bestWeight = 0;
  for (const c of userEntries) {
    const sp = String(c.species || '').trim();
    const qty = Number(c.quantity) || 1;
    const w = Number(c.weight) || 0;
    if (sp) userSpeciesMap.set(sp, (userSpeciesMap.get(sp) || 0) + qty);
    if (w > bestWeight && sp) {
      bestWeight = w;
      topTrophySpecies = sp;
    }
  }
  const userTopSpecies = [...userSpeciesMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

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
      spotsCount: userSpotsSet.size,
      topSpecies: userTopSpecies,
      topTrophySpecies,
      unlockedMedalsCount: badges.filter(b => b.unlocked).length,
      totalMedalsCount: badges.length
    },
    badges
  };
}


export const PRO_PLANS = {
  annual: {
    id: 'annual',
    name: 'Anual · Clube Pescador PRO',
    priceMonthly: 5,
    billingTotal: 60,
    periodLabel: 'por mês (cobrado R$ 60/ano)',
    discountBadge: 'MAIS ESCOLHIDO · ECONOMIZE 67%',
    gateway: 'Mercado Pago (PIX ou Cartão em até 12x)'
  },
  monthly: {
    id: 'monthly',
    name: 'Mensal · Clube Pescador PRO',
    priceMonthly: 15,
    billingTotal: 15,
    periodLabel: 'por mês avulso',
    discountBadge: 'SEM FIDELIDADE',
    gateway: 'Mercado Pago (PIX ou Cartão)'
  }
};

export function calculateImageDimensions(width, height, maxDimension = 1080) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const limit = Math.max(64, Number(maxDimension) || 1080);
  if (w <= limit && h <= limit) return { width: Math.round(w), height: Math.round(h), scaled: false };
  const ratio = w >= h ? limit / w : limit / h;
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
    scaled: true
  };
}

export function formatCompressionSavings(originalBytes, compressedBytes) {
  const orig = Math.max(1, Number(originalBytes) || 1);
  const comp = Math.max(1, Number(compressedBytes) || 1);
  const savedPct = Math.max(0, Math.min(99, Math.round((1 - comp / orig) * 100)));
  const fmt = bytes => bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `Otimizada p/ S3 (WebP): ${fmt(orig)} → ${fmt(comp)} (-${savedPct}%)`;
}

export function canUseProSocialFeature(sub = {}) {
  if (!sub || typeof sub !== 'object') return false;
  if (sub.active !== true) return false;
  if (sub.expiresAt && Number.isFinite(sub.expiresAt) && sub.expiresAt < Date.now()) return false;
  return true;
}
