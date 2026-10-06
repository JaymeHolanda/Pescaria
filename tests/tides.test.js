import test from 'node:test';
import assert from 'node:assert/strict';
import { findTideEvents, fishingWindow, marinePoints, isNearCabedelo, officialTideDay } from '../src/tide-model.js';
import { CABEDELO_2026 } from '../src/cabedelo-2026.js';
const joaoPessoa = { latitude: -7.115, longitude: -34.8631 };
const points = (time, level) => marinePoints({ time, sea_level_height_msl: level });
test('picos à meia-noite e às 23h usam os dias vizinhos', () => {
  assert.equal(findTideEvents(points(['2026-10-05T23:00', '2026-10-06T00:00', '2026-10-06T01:00'], [1, 2, 1]))[0].hour, '00:00');
  assert.equal(findTideEvents(points(['2026-10-06T22:00', '2026-10-06T23:00', '2026-10-07T00:00'], [1, 0, 1]))[0].type, 'low');
});
test('janela antes das 03h informa data anterior, incluindo virada de ano', () => {
  assert.deepEqual(fishingWindow({ time: '2026-01-01T02:00' }), { startDate: '2025-12-31', startHour: '23:00', endDate: '2026-01-01', endHour: '02:00', previousDay: true });
  assert.equal(fishingWindow({ time: '2026-10-06T03:00' }).previousDay, false);
  assert.equal(fishingWindow({ time: '2026-10-06T00:00' }).startHour, '21:00');
});
test('dados ausentes e lacunas não produzem falsos extremos', () => {
  assert.deepEqual(findTideEvents(points(['2026-10-06T00:00', '2026-10-06T01:00', '2026-10-06T02:00'], [1, null, 1])), []);
  assert.deepEqual(findTideEvents(points(['2026-10-06T00:00', '2026-10-06T02:00', '2026-10-06T03:00'], [1, 2, 1])), []);
  assert.deepEqual(findTideEvents(points(['2026-10-06T00:00', '2026-10-06T01:00'], [2, 1])), []);
});
test('platô é um único pico confirmado por subida e descida', () => {
  const times = [0, 1, 2, 3].map(h => `2026-10-06T0${h}:00`);
  assert.equal(findTideEvents(points(times, [1, 2, 2, 1])).length, 1);
  assert.deepEqual(findTideEvents(points(times, [1, 2, 2, 2])), []);
});
test('referência de Cabedelo só aparece na região próxima', () => {
  assert.equal(isNearCabedelo({ latitude: -7.115, longitude: -34.8631 }), true);
  assert.equal(isNearCabedelo({ latitude: -3.7172, longitude: -38.5433 }), false);
});

test('Cabedelo preserva horários e alturas oficiais, não soma offset ao modelo', () => {
  const day = officialTideDay(joaoPessoa, '2026-10-06');
  assert.deepEqual(day.events.map(e => [e.hour, e.level, e.type]), [['00:57', 2.15, 'high'], ['07:21', .47, 'low'], ['13:38', 2.13, 'high'], ['19:38', .57, 'low']]);
  assert.equal(fishingWindow(day.events[0]).startHour, '21:57');
  assert.equal(fishingWindow(day.events[0]).startDate, '2026-10-05');
  assert.equal(fishingWindow(day.events[2]).startHour, '10:38');
  for (const e of day.events) assert.equal(day.points.find(p => p.time === e.time).level, e.level);
});

test('ano inteiro tem extremos alternados e dias válidos; curva contínua atravessa meia-noite', () => {
  assert.equal(Object.keys(CABEDELO_2026).length, 365);
  let previous;
  for (const date of Object.keys(CABEDELO_2026)) {
    const day = officialTideDay(joaoPessoa, date);
    assert.equal(day.available, true);
    for (const event of day.events) {
      if (previous) assert.notEqual(previous.type, event.type);
      previous = event;
    }
    assert.ok(day.points.every(p => p.time.startsWith(date) && Number.isFinite(p.level)));
    assert.ok(day.points.every((p, i) => !i || p.time > day.points[i - 1].time));
  }
  assert.equal(officialTideDay(joaoPessoa, '2026-10-06').points[0].hour, '00:00');
  assert.equal(officialTideDay(joaoPessoa, '2026-10-06').points.at(-1).hour, '23:59');
});

test('não mistura datas sem cobertura e outros locais com a tábua de Cabedelo', () => {
  assert.equal(officialTideDay(joaoPessoa, '2027-01-01').available, false);
  assert.deepEqual(officialTideDay(joaoPessoa, '2027-01-01').points, []);
  assert.equal(officialTideDay({ latitude: -3.7172, longitude: -38.5433 }, '2026-10-06'), null);
});
