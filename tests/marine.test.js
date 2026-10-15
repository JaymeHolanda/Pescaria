import test from 'node:test';
import assert from 'node:assert/strict';
import { marineRows, compass, rangeOf, windowMarine, waveDayComparison, marineScore } from '../src/marine-model.js';
import { fishingWindow } from '../src/tide-model.js';

test('alinha fontes por horário, mesmo com dia anterior e lacunas na API marítima', () => {
  const weather = { time: ['2026-10-15T00:00', '2026-10-15T01:00'], wind_speed_10m: [0, 17], pressure_msl: [1012, null] };
  const marine = { time: ['2026-10-14T23:00', '2026-10-15T01:00'], wave_height: [4, .7] };
  const rows = marineRows('2026-10-15', weather, marine);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].wind_speed_10m, 0);
  assert.equal(rows[0].wave_height, null);
  assert.equal(rows[1].wave_height, .7);
  assert.equal(rows[1].pressure_msl, null);
  assert.equal(rows[1].wind_gusts_10m, null);
  assert.equal(rangeOf(rows, 'wind_gusts_10m'), null);
});

test('direção ausente não vira norte e valores circulares são normalizados', () => {
  assert.equal(compass(null), '—'); assert.equal(compass(undefined), '—');
  assert.equal(compass(0), 'N'); assert.equal(compass(360), 'N');
  assert.equal(compass(135), 'SE'); assert.equal(compass(-90), 'O');
});

test('janela que atravessa meia-noite usa apenas suas amostras e detecta trovoadas', () => {
  const window = fishingWindow({ time: '2026-10-15T01:14' });
  const time = ['2026-10-14T22:00', '2026-10-14T23:00', '2026-10-15T00:00', '2026-10-15T01:00', '2026-10-15T02:00'];
  const result = windowMarine(window, { time, wind_speed_10m: [99, 12, 14, 16, 99], weather_code: [0, 0, 95, 0, 0] }, { time, wave_height: [9, .7, .8, .9, 9] });
  assert.deepEqual(result.wind, { min: 12, max: 16, count: 3 });
  assert.deepEqual(result.waves, { min: .7, max: .9, count: 3 });
  assert.equal(result.thunder, true);
  assert.equal(result.gust, null);
});

test('comparação diária exige cobertura e funciona na mudança de mês', () => {
  const time = ['2026-09-30', '2026-10-01'].flatMap(date => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`));
  const marine = { time, wave_height: time.map(t => t.startsWith('2026-09') ? 2 : 1) };
  assert.equal(waveDayComparison('2026-10-01', marine).change, -1);
  assert.equal(waveDayComparison('2026-10-01', { time: [time[0], time[24]], wave_height: [2, 1] }), null);
});

test('nota fica indisponível com dados ausentes e diminui com vento, ondas e rajadas', () => {
  const base = { wave_height: .5, wind_speed_10m: 10, wind_gusts_10m: 20 };
  for (const field of Object.keys(base)) {
    assert.equal(marineScore({ ...base, [field]: null }).score, null);
    assert.equal(marineScore({ ...base, [field]: -1 }).score, null);
    assert.ok(marineScore({ ...base, [field]: base[field] * 2 }).score < marineScore(base).score);
  }
  assert.equal(marineScore({ wave_height: 0, wind_speed_10m: 0, wind_gusts_10m: 0 }).score, 100);
  assert.equal(marineScore({ wave_height: 8, wind_speed_10m: 90, wind_gusts_10m: 150 }).score, 0);
  assert.equal(marineScore({ ...base, weather_code: 95 }).label, 'Atenção às condições');
  assert.equal(marineScore({ ...base, wind_gusts_10m: 40 }).label, 'Atenção às condições');
  assert.equal(marineScore({ ...base, pressure_msl: 1030, sea_surface_temperature: 30 }).score, marineScore(base).score);
});
