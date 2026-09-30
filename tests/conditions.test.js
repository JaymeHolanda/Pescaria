import test from 'node:test';
import assert from 'node:assert/strict';
import { hourlyDay, conditionsSummary } from '../src/conditions-model.js';
const base = { wind: 10, waves: [{ hour: 8, value: .5 }], levels: [0, 1.5], rain: 0, moon: 100 };
test('nota e classificação têm critérios consistentes', () => {
  const result = conditionsSummary(base);
  assert.equal(result.score, 100); assert.equal(result.label, 'Excelente');
  assert.equal(result.breakdown.reduce((sum, p) => sum + p.points, 0), 100);
});
test('alertas de vento e ondas prevalecem sobre a nota', () => {
  assert.equal(conditionsSummary({ ...base, wind: 29 }).label, 'Atenção');
  const result = conditionsSummary({ ...base, waves: [{ hour: 8, value: 2 }] });
  assert.equal(result.score, 100); assert.equal(result.label, 'Atenção');
  assert.equal(result.cards[1].warning, true);
});
test('ausência de dados não vira zero ou previsão favorável', () => {
  for (const patch of [{ wind: null }, { waves: [] }, { levels: [] }, { rain: null }]) {
    const result = conditionsSummary({ ...base, ...patch });
    assert.equal(result.score, null); assert.equal(result.label, 'Dados parciais');
  }
});
test('resumo identifica horário do vento e tendência real das ondas', () => {
  const waves = [6, 7, 8, 12, 13, 14].map(hour => ({ hour, value: hour < 12 ? .5 : 1 }));
  const result = conditionsSummary({ ...base, waves, wind: 24, windHours: [{ hour: 7, time: '07:00', value: 12 }, { hour: 15, time: '15:00', value: 24 }] });
  assert.match(result.cards[0].text, /à tarde.*15:00/);
  assert.match(result.cards[1].text, /aumentando à tarde/);
  assert.doesNotMatch(conditionsSummary(base).cards[1].text, /aumentando|diminuindo/);
});
test('horários são filtrados pelo dia e valores ausentes são descartados', () => {
  assert.deepEqual(hourlyDay({ time: ['2026-09-30T06:00', '2026-09-30T07:00', '2026-10-01T06:00'], wave_height: [1, null, 3] }, 'wave_height', '2026-09-30'), [{ hour: 6, time: '06:00', value: 1 }]);
});
