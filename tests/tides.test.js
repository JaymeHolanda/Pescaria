import test from 'node:test';
import assert from 'node:assert/strict';
import { findTideEvents, fishingWindow, marinePoints, isNearCabedelo } from '../src/tide-model.js';
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
