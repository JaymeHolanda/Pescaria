import test from 'node:test';
import assert from 'node:assert/strict';
import { nextFishingWindow, countdownText, forecastNow, filterCaptures, dayWindowRange } from '../src/preview-b/model.js';
const day = (...times) => ({ events: times.map(time => ({ time, type: 'high' })) });

test('próxima janela usa o horário do local e reconhece a janela em andamento', () => {
  const days = [day('2026-10-21T13:00', '2026-10-21T23:00')];
  const active = nextFishingWindow(days, -10800, Date.parse('2026-10-21T15:00Z'));
  assert.equal(active.startHour, '10:00'); assert.equal(active.active, true);
  const later = nextFishingWindow(days, -10800, Date.parse('2026-10-21T16:00Z'));
  assert.equal(later.startHour, '20:00'); assert.equal(later.active, false);
  assert.equal(forecastNow(Date.parse('2026-10-22T01:00Z'), -10800), '2026-10-21T22:00');
});

test('próxima janela atravessa a meia-noite e encerra exatamente na maré alta', () => {
  const days = [day('2026-10-22T01:00')];
  const window = nextFishingWindow(days, -10800, Date.parse('2026-10-22T02:00Z'));
  assert.equal(window.startDate, '2026-10-21'); assert.equal(window.startHour, '22:00'); assert.equal(window.active, true);
  assert.equal(nextFishingWindow(days, -10800, Date.parse('2026-10-22T04:00Z')), null);
  assert.equal(nextFishingWindow([], -10800), null);
  assert.equal(countdownText(135 * 60000), '2h 15min');
  assert.equal(countdownText(10 * 1000), '1min');
});

test('filtros combinam espécie, local e intervalo de datas sem mudar os registros', () => {
  const entries = [['one', { species: 'Pampo-galhudo', location: 'João Pessoa', date: '2026-10-12' }], ['two', { species: 'Atum', location: 'João Pessoa', date: '2026-10-20' }], ['three', { species: 'Pampo', location: 'Fortaleza', date: '2026-10-12' }]];
  assert.deepEqual(filterCaptures(entries, { species: 'PAMPO', location: 'joao', from: '2026-10-12', to: '2026-10-12' }).map(([id]) => id), ['one']);
  assert.equal(filterCaptures(entries, { from: '2026-10-21', to: '2026-10-01' }).length, 0);
  assert.equal(filterCaptures(entries).length, 3);
  assert.equal(entries.length, 3);
});

test('faixas do gráfico incluem os dois lados de uma janela que atravessa meia-noite', () => {
  const event = { time: '2026-10-22T01:00', type: 'high' };
  assert.deepEqual(dayWindowRange(event, '2026-10-21'), { start: 1320, end: 1440 });
  assert.deepEqual(dayWindowRange(event, '2026-10-22'), { start: 0, end: 60 });
  assert.equal(dayWindowRange(event, '2026-10-23'), null);
});
