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
  return next ? { ...next, active: next.start <= now } : null;
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
