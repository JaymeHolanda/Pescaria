const finite = Number.isFinite;
export const WEATHER_FIELDS = ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl', 'precipitation_probability', 'precipitation', 'weather_code'];
export const MARINE_FIELDS = ['wave_height', 'wave_period', 'wave_direction', 'swell_wave_height', 'swell_wave_period', 'swell_wave_direction', 'wind_wave_height', 'sea_surface_temperature'];

// Join by local ISO timestamp: marine data also contains the preceding day.
export function marineRows(date, weather = {}, marine = {}) {
  const weatherIndex = new Map((weather.time || []).map((time, i) => [time, i]));
  const marineIndex = new Map((marine.time || []).map((time, i) => [time, i]));
  return [...new Set([...weatherIndex.keys(), ...marineIndex.keys()])]
    .filter(time => time.startsWith(`${date}T`)).sort().map(time => {
      const row = { time, hour: time.slice(11, 16) };
      for (const [fields, data, index] of [[WEATHER_FIELDS, weather, weatherIndex.get(time)], [MARINE_FIELDS, marine, marineIndex.get(time)]]) {
        for (const field of fields) row[field] = finite(data[field]?.[index]) ? data[field][index] : null;
      }
      return row;
    });
}

export function compass(degrees) {
  if (!finite(degrees)) return '—';
  return ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((degrees % 360 + 360) % 360) / 45) % 8];
}

export function rangeOf(rows, key) {
  const values = rows.map(row => row[key]).filter(finite);
  return values.length ? { min: Math.min(...values), max: Math.max(...values), count: values.length } : null;
}

// Experimental ease-of-shore-fishing index, not capture probability or a safety rating.
export function marineScore(row) {
  const inputs = [row?.wave_height, row?.wind_speed_10m, row?.wind_gusts_10m];
  if (!inputs.every(value => finite(value) && value >= 0)) return { score: null, label: 'Dados incompletos', tone: 'partial', note: 'Faltam ondas, vento ou rajadas para calcular a nota deste horário.' };
  const clamp = value => Math.max(0, Math.min(1, value));
  const parts = [
    { name: 'Ondas', points: 50 * clamp(1 - row.wave_height / 2), max: 50 },
    { name: 'Vento', points: 35 * clamp(1 - row.wind_speed_10m / 40), max: 35 },
    { name: 'Rajadas', points: 15 * clamp(1 - row.wind_gusts_10m / 60), max: 15 }
  ];
  const score = Math.round(parts.reduce((sum, item) => sum + item.points, 0));
  const thunder = [95, 96, 99].includes(row.weather_code);
  const attention = thunder || row.wave_height >= 2 || row.wind_speed_10m > 28 || row.wind_gusts_10m >= 40;
  return { score, parts, tone: attention ? 'attention' : score >= 75 ? 'calm' : score >= 50 ? 'moderate' : 'attention', label: attention ? 'Atenção às condições' : score >= 75 ? 'Mais tranquilo' : score >= 50 ? 'Intermediário' : 'Mais exigente', note: thunder ? 'Trovoadas previstas. Esse destaque prevalece sobre a nota.' : attention ? 'Vento, rajadas ou ondas atingem as faixas de atenção do site. Confira os dados abaixo.' : 'Nota maior indica menos vento e ondas mais baixas no modelo. Confira também período, direção e condições locais.' };
}

// Daily means ignore incomplete fields and require at least 18 hourly samples.
export function dailyMarineSummary(rows) {
  return summarizeMarine(rows, 18, true);
}

function summarizeMarine(rows, minimumHours, daily = false) {
  const fields = [...WEATHER_FIELDS, ...MARINE_FIELDS].filter(key => key !== 'weather_code' && key !== 'precipitation');
  const values = {};
  for (const key of fields) {
    const samples = rows.map(row => row[key]).filter(finite);
    if (samples.length < minimumHours) { values[key] = null; continue; }
    if (key === 'wind_direction_10m' || key.endsWith('_direction')) {
      const radians = samples.map(value => value * Math.PI / 180);
      const x = radians.reduce((sum, value) => sum + Math.cos(value), 0) / samples.length;
      const y = radians.reduce((sum, value) => sum + Math.sin(value), 0) / samples.length;
      values[key] = Math.hypot(x, y) < .1 ? null : (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    } else {
      values[key] = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    }
  }

  const rated = rows.map(row => ({ row, rating: marineScore(row) })).filter(item => item.rating.score !== null);
  const attention = rows.filter(row => [95, 96, 99].includes(row.weather_code) || row.wave_height >= 2 || row.wind_speed_10m > 28 || row.wind_gusts_10m >= 40);
  const parts = rated.length ? [
    { name: 'Ondas', points: rated.reduce((sum, item) => sum + item.rating.parts[0].points, 0) / rated.length, max: 50 },
    { name: 'Vento', points: rated.reduce((sum, item) => sum + item.rating.parts[1].points, 0) / rated.length, max: 35 },
    { name: 'Rajadas', points: rated.reduce((sum, item) => sum + item.rating.parts[2].points, 0) / rated.length, max: 15 }
  ] : [];
  const score = rated.length >= minimumHours ? Math.round(rated.reduce((sum, item) => sum + item.rating.score, 0) / rated.length) : null;
  const tone = score === null ? 'partial' : attention.length ? 'attention' : score >= 75 ? 'calm' : score >= 50 ? 'moderate' : 'attention';
  const label = score === null ? 'Dados incompletos' : attention.length ? `Atenção em parte ${daily ? 'do dia' : 'da janela'}` : score >= 75 ? 'Mais tranquilo' : score >= 50 ? 'Intermediário' : 'Mais exigente';
  const attentionTimes = [...new Set(attention.map(row => row.hour).filter(Boolean))];
  const attentionSummary = attentionTimes.length === 1
    ? `às ${attentionTimes[0]}`
    : `em ${attentionTimes.length} horários, incluindo ${attentionTimes.slice(0, 3).join(', ')}${attentionTimes.length > 3 ? '…' : ''}`;
  const note = score === null
    ? `Há ${rated.length} horário(s) com os três dados necessários; são necessários pelo menos ${minimumHours} para a nota ${daily ? 'diária' : 'da janela'}.${attentionTimes.length ? ` Também houve faixa de atenção ${attentionSummary}.` : ''}`
    : attentionTimes.length
      ? `Média de ${rated.length} horários. Faixa de atenção ${attentionSummary}.`
      : `Média de ${rated.length} horários ${daily ? 'do dia' : 'da janela'}. Nota maior indica menos vento e ondas mais baixas no modelo.`;
  return { values, count: rated.length, score, parts, tone, label, note, attentionHours: attentionTimes };
}

export function windowMarineRows(window, weather, marine) {
  const dates = [...new Set([window.startDate, window.endDate])];
  const start = `${window.startDate}T${window.startHour}`, end = `${window.endDate}T${window.endHour}`;
  return dates.flatMap(date => marineRows(date, weather, marine)).filter(row => row.time >= start && row.time <= end);
}

export function windowMarineSummary(window, weather, marine) {
  const rows = windowMarineRows(window, weather, marine);
  // Count the hourly timestamps inside the closed interval, even when both
  // sources omit a timestamp. A three-hour window needs 3 complete samples.
  const start = Date.parse(`${window.startDate}T${window.startHour}:00Z`);
  const end = Date.parse(`${window.endDate}T${window.endHour}:00Z`);
  const expected = Math.max(0, Math.floor(end / 3600000) - Math.ceil(start / 3600000) + 1);
  const minimumHours = Math.max(3, Math.ceil(expected * .75));
  return { ...summarizeMarine(rows, minimumHours), rows, expected, minimumHours };
}

export function windowMarine(window, weather, marine) {
  const rows = windowMarineRows(window, weather, marine);
  return { wind: rangeOf(rows, 'wind_speed_10m'), gust: rangeOf(rows, 'wind_gusts_10m'), waves: rangeOf(rows, 'wave_height'), period: rangeOf(rows, 'wave_period'), thunder: rows.some(row => [95, 96, 99].includes(row.weather_code)) };
}

export function previousDate(date) {
  return new Date(Date.parse(`${date}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

export function waveDayComparison(date, marine) {
  const today = rangeOf(marineRows(date, {}, marine), 'wave_height');
  const yesterday = rangeOf(marineRows(previousDate(date), {}, marine), 'wave_height');
  // Do not turn a few scattered samples into a full-day comparison.
  if (!today || !yesterday || today.count < 18 || yesterday.count < 18) return null;
  return { today, yesterday, change: today.max - yesterday.max };
}
