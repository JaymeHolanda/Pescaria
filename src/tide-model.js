// API timestamps are wall-clock times in the requested location's timezone.
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
