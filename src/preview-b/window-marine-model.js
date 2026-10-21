import { marineRows, marineScore, WEATHER_FIELDS, MARINE_FIELDS } from '../marine-model.js';

const finite = Number.isFinite;
const wallTime = (date, hour) => Date.parse(`${date}T${hour}:00Z`);

export function windowMarineSummary(window, weather = {}, marine = {}) {
  const start = wallTime(window.startDate, window.startHour), end = wallTime(window.endDate, window.endHour);
  const slots = [];
  if (finite(start) && finite(end) && end >= start && end - start <= 86400000) {
    for (let t = Math.ceil(start / 3600000) * 3600000; t <= end; t += 3600000) slots.push(new Date(t).toISOString().slice(0, 16));
  }
  const dates = [...new Set(slots.map(time => time.slice(0, 10)))];
  const indexed = new Map(dates.flatMap(date => marineRows(date, weather, marine)).map(row => [row.time, row]));
  const rows = slots.map(time => indexed.get(time) || { time, hour: time.slice(11, 16) });
  const expected = slots.length;
  const fields = [...WEATHER_FIELDS, ...MARINE_FIELDS].filter(key => !['weather_code', 'precipitation'].includes(key));
  const values = {};
  for (const key of fields) {
    const samples = rows.map(row => row[key]).filter(finite);
    if (!expected || samples.length !== expected) { values[key] = null; continue; }
    if (key.endsWith('_direction')) {
      const radians = samples.map(value => value * Math.PI / 180);
      const x = radians.reduce((sum, value) => sum + Math.cos(value), 0) / samples.length;
      const y = radians.reduce((sum, value) => sum + Math.sin(value), 0) / samples.length;
      values[key] = Math.hypot(x, y) < .1 ? null : (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    } else values[key] = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  }
  const rated = rows.map(row => marineScore(row)).filter(rating => rating.score !== null);
  const complete = expected > 0 && rated.length === expected;
  const score = complete ? Math.round(rated.reduce((sum, rating) => sum + rating.score, 0) / rated.length) : null;
  const parts = complete ? rated[0].parts.map((part, i) => ({ ...part, points: rated.reduce((sum, rating) => sum + rating.parts[i].points, 0) / rated.length })) : [];
  const attention = rows.filter(row => [95, 96, 99].includes(row.weather_code) || row.wave_height >= 2 || row.wind_speed_10m > 28 || row.wind_gusts_10m >= 40);
  const attentionHours = attention.map(row => row.time);
  const times = attention.map(row => `${row.time.slice(11, 16)}${window.previousDay ? ` (${row.time.slice(8, 10)}/${row.time.slice(5, 7)})` : ''}`);
  const tone = !complete ? 'partial' : attention.length ? 'attention' : score >= 75 ? 'calm' : score >= 50 ? 'moderate' : 'attention';
  const label = !complete ? 'Dados incompletos' : attention.length ? 'Atenção nesta janela' : score >= 75 ? 'Mais tranquilo' : score >= 50 ? 'Intermediário' : 'Mais exigente';
  const note = (!complete ? `Há ${rated.length} de ${expected} horários completos para esta janela.` : `Média dos ${expected} horários previstos dentro da janela.`) + (times.length ? ` Faixa de atenção às ${times.join(', ')}.` : '');
  return { values, rows, expected, count: rated.length, score, parts, tone, label, note, attentionHours };
}
