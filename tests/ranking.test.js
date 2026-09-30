import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRanking, validateCapture, profileRecord } from '../src/ranking-model.js';
import { explainError, localDate, CaptureValidationError } from '../src/ranking-errors.js';

test('erros de captura mostram a etapa, permissões e validação sem mensagem genérica', () => {
  for (const code of ['PERMISSION_DENIED', 'permission_denied', 'permission-denied', 'database/permission-denied']) {
    assert.match(explainError({ code }, 'Gravação da captura'), /Gravação da captura: O Firebase recusou/);
  }
  assert.equal(explainError(new CaptureValidationError('Escolha uma data válida.')), 'Escolha uma data válida.');
  assert.match(explainError(new TypeError('Falha de teste')), /TypeError.*Falha de teste/);
  assert.match(explainError({ code: 'UNAVAILABLE' }), /temporariamente indisponível/);
});

test('data do formulário tem formato ISO independente do idioma', () => {
  assert.equal(localDate(new Date(2026, 8, 3, 23, 59)), '2026-09-03');
});
test('recuperar perfil preserva createdAt e mantém o nome salvo', () => {
  assert.deepEqual(profileRecord({ displayName: 'Jayme', createdAt: 10 }, undefined, undefined, 30), { displayName: 'Jayme', createdAt: 10 });
  assert.deepEqual(profileRecord({ displayName: 'Jayme', createdAt: 10 }, 'Jayme Holanda', undefined, 30), { displayName: 'Jayme Holanda', createdAt: 10 });
  assert.deepEqual(profileRecord(null, 'Jayme', undefined, 30), { displayName: 'Jayme', createdAt: 30 });
});
test('ranking soma peixes, une espécies e compartilha posições em empates', () => {
  const rows = makeRanking({ a: { displayName: 'Ana' }, b: { displayName: 'Beto' }, c: { displayName: 'Caio' } }, {
    x: { uid: 'a', species: 'Robalo', quantity: 2 }, y: { uid: 'a', species: ' robalo ', quantity: 3 },
    z: { uid: 'b', species: 'Tilápia', quantity: 5 }, w: { uid: 'c', species: 'Atum', quantity: 1 }
  });
  assert.deepEqual(rows.map(x => [x.name, x.quantity, x.species, x.rank]), [['Ana', 5, 1, 1], ['Beto', 5, 1, 1], ['Caio', 1, 1, 3]]);
});
test('uma captura excluída sai do total', () => {
  assert.equal(makeRanking({}, { a: { uid: 'x', species: 'Atum', quantity: 4 } })[0].quantity, 4);
  assert.deepEqual(makeRanking({}, {}), []);
});
test('captura exige identidade, quantidade inteira e data real', () => {
  const data = { species: 'Robalo', quantity: '2', weight: '', date: '2026-09-30', location: 'Fortaleza' };
  assert.equal(validateCapture(data, 'uid', 1, '2026-09-30').quantity, 2);
  for (const patch of [{ quantity: '1.5' }, { date: '2026-02-30' }, { date: '2026-10-01' }, { species: '' }, { weight: '-1' }]) assert.throws(() => validateCapture({ ...data, ...patch }, 'uid', 1, '2026-09-30'));
  assert.throws(() => validateCapture(data, '', 1, '2026-09-30'));
});
