import test from 'node:test';
import assert from 'node:assert/strict';
import { marineRows, compass, rangeOf, windowMarine, windowMarineSummary, waveDayComparison, marineScore } from '../src/marine-model.js';
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

function windowFixture() {
  const time = Array.from({ length: 24 }, (_, hour) => `2026-10-19T${String(hour).padStart(2, '0')}:00`);
  return {
    weather: { time, wind_speed_10m: time.map((_, h) => h < 12 ? 10 : 20), wind_gusts_10m: time.map((_, h) => h < 12 ? 20 : 30), wind_direction_10m: time.map((_, h) => [359, 0, 1][h % 3]), pressure_msl: time.map((_, h) => h < 12 ? 1010 : 1020) },
    marine: { time, wave_height: time.map((_, h) => h < 12 ? .5 : 1.5), wave_direction: time.map((_, h) => [359, 0, 1][h % 3]), sea_surface_temperature: time.map((_, h) => h < 12 ? 27 : 29) }
  };
}

test('cada janela usa suas próprias médias e nota, excluindo horários de fora', () => {
  const { weather, marine } = windowFixture();
  weather.weather_code = weather.time.map((_, h) => h === 12 ? 95 : 0);
  const first = windowMarineSummary(fishingWindow({ time: '2026-10-19T11:17' }), weather, marine);
  const second = windowMarineSummary(fishingWindow({ time: '2026-10-19T23:27' }), weather, marine);
  assert.deepEqual(first.rows.map(row => row.hour), ['09:00', '10:00', '11:00']);
  assert.equal(first.values.wind_speed_10m, 10);
  assert.equal(second.values.wind_speed_10m, 20);
  assert.equal(first.values.wave_height, .5);
  assert.equal(second.values.wave_height, 1.5);
  assert.equal(first.values.pressure_msl, 1010);
  assert.equal(second.values.pressure_msl, 1020);
  assert.equal(first.values.sea_surface_temperature, 27);
  assert.equal(second.values.sea_surface_temperature, 29);
  assert.ok(first.score > second.score);
  assert.deepEqual(first.attentionHours, []);
  assert.ok(first.values.wind_direction_10m < 1 || first.values.wind_direction_10m > 359);
  assert.ok(first.values.wave_direction < 1 || first.values.wave_direction > 359);
  assert.match(first.note, /3 horários da janela/);
});

test('média da janela atravessa meia-noite e sinaliza atenção só no intervalo', () => {
  const time = ['2026-10-18T22:00', '2026-10-18T23:00', '2026-10-19T00:00', '2026-10-19T01:00', '2026-10-19T02:00'];
  const summary = windowMarineSummary(fishingWindow({ time: '2026-10-19T01:14' }),
    { time, wind_speed_10m: [99, 10, 20, 30, 99], wind_gusts_10m: [99, 20, 20, 20, 99] },
    { time, wave_height: [9, .5, 1, 1.5, 9] });
  assert.equal(summary.values.wind_speed_10m, 20);
  assert.equal(summary.values.wave_height, 1);
  assert.equal(summary.count, 3);
  assert.equal(summary.label, 'Atenção em parte da janela');
  assert.deepEqual(summary.attentionHours, ['01:00']);
});

test('cobertura mínima da janela não diminui com lacunas em ambas as fontes', () => {
  const window = fishingWindow({ time: '2026-10-19T11:17' });
  const { weather, marine } = windowFixture();
  marine.wave_height[10] = null;
  const partial = windowMarineSummary(window, weather, marine);
  assert.equal(partial.values.wave_height, null);
  assert.equal(partial.values.wind_speed_10m, 10);
  assert.equal(partial.score, null);
  const time = ['2026-10-19T09:00', '2026-10-19T11:00'];
  const missing = windowMarineSummary(window, { time, wind_speed_10m: [10, 10], wind_gusts_10m: [20, 20] }, { time, wave_height: [.5, .5] });
  assert.equal(missing.expected, 3);
  assert.equal(missing.minimumHours, 3);
  assert.equal(missing.score, null);
  assert.equal(missing.values.wind_speed_10m, null);
  assert.equal(windowMarineSummary(window, {}, {}).score, null);
});

test('limites horários exatos entram na janela e direções opostas ficam variáveis', () => {
  const { weather, marine } = windowFixture();
  weather.wind_direction_10m = weather.time.map((_, h) => h % 2 ? 180 : 0);
  const summary = windowMarineSummary(fishingWindow({ time: '2026-10-19T11:00' }), weather, marine);
  assert.deepEqual(summary.rows.map(row => row.hour), ['08:00', '09:00', '10:00', '11:00']);
  assert.equal(summary.expected, 4);
  assert.equal(summary.minimumHours, 3);
  assert.equal(summary.values.wind_direction_10m, null);
});
