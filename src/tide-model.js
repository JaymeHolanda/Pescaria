// API timestamps are wall-clock times in the requested location's timezone.
import { CABEDELO_2026, CABEDELO_SOURCE } from './cabedelo-2026.js';
// UTC arithmetic here preserves those displayed dates, independent of device timezone.
const wallTime = time => Date.parse(`${time.length === 16 ? `${time}:00` : time}Z`);
export function marinePoints(hourly) {
  return (hourly?.time || []).map((time, i) => ({ time, hour: time.slice(11, 16), level: hourly.sea_level_height_msl?.[i], wave: hourly.wave_height?.[i], period: hourly.wave_period?.[i] }));
}
export function findTideEvents(points) {
  const events = [];
  for (let i = 1; i < points.length - 1; i++) {
    const value = points[i].level;
    if (!Number.isFinite(value)) continue;
    let end = i;
    while (end + 1 < points.length && points[end + 1].level === value) end++;
    const before = points[i - 1], after = points[end + 1];
    const neighbors = points.slice(i - 1, end + 2);
    const continuous = before && after && neighbors.every((p, n) => Number.isFinite(p.level) && (!n || wallTime(p.time) - wallTime(neighbors[n - 1].time) === 3600000));
    if (continuous) {
      const peak = points[Math.floor((i + end) / 2)];
      if (value > before.level && value > after.level) events.push({ ...peak, type: 'high' });
      if (value < before.level && value < after.level) events.push({ ...peak, type: 'low' });
    }
    i = end;
  }
  return events;
}
export function fishingWindow(event, hours = 3) {
  const end = new Date(wallTime(event.time));
  const start = new Date(end.getTime() - hours * 3600000);
  const startIso = start.toISOString(), endIso = end.toISOString();
  return { startDate: startIso.slice(0, 10), startHour: startIso.slice(11, 16), endDate: endIso.slice(0, 10), endHour: endIso.slice(11, 16), previousDay: startIso.slice(0, 10) !== endIso.slice(0, 10) };
}
export function isNearCabedelo({ latitude, longitude }) {
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(latitude + 6.97), dLon = radians(longitude + 34.84);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(-6.97)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 40;
}

const officialEvents = Object.entries(CABEDELO_2026).flatMap(([date, entries]) => entries.map(([hour, level]) => ({ time: `${date}T${hour}`, hour, level, official: true })));
officialEvents.forEach((event, i) => {
  const neighbor = officialEvents[i + 1] || officialEvents[i - 1];
  event.type = event.level > neighbor.level ? 'high' : 'low';
});

export function officialTideDay(location, date) {
  if (!isNearCabedelo(location)) return null;
  const events = officialEvents.filter(e => e.time.startsWith(`${date}T`));
  const points = [];
  const start = wallTime(`${date}T00:00`), end = start + 86400000;
  // Half-cosine interpolation is illustrative, not an official continuous forecast.
  for (let i = 0; i < officialEvents.length - 1; i++) {
    const a = officialEvents[i], b = officialEvents[i + 1];
    const ta = wallTime(a.time), tb = wallTime(b.time);
    if (tb < start || ta >= end) continue;
    const samples = new Set([Math.max(start, ta), Math.min(end - 60000, tb)]);
    for (let t = Math.ceil(Math.max(start, ta) / 900000) * 900000; t < Math.min(end, tb); t += 900000) samples.add(t);
    for (const t of [...samples].sort((a, b) => a - b)) {
      if (t < ta || t > tb || t < start || t >= end) continue;
      const time = new Date(t).toISOString().slice(0, 16);
      const level = t === ta ? a.level : t === tb ? b.level : a.level + (b.level - a.level) * (1 - Math.cos(Math.PI * (t - ta) / (tb - ta))) / 2;
      if (points.at(-1)?.time !== time) points.push({ time, hour: time.slice(11), level });
    }
  }
  return { date, events, points: events.length ? points : [], official: true, available: events.length > 0, source: CABEDELO_SOURCE };
}
