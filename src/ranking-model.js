import { CaptureValidationError } from './ranking-errors.js';

export function makeRanking(profiles, captures) {
  const totals = new Map();
  for (const capture of Object.values(captures || {})) {
    if (!capture || typeof capture.uid !== 'string' || !Number.isInteger(capture.quantity) || capture.quantity < 1) continue;
    if (!totals.has(capture.uid)) totals.set(capture.uid, { uid: capture.uid, name: profiles?.[capture.uid]?.displayName || 'Pescador', quantity: 0, species: new Set() });
    const total = totals.get(capture.uid);
    total.quantity += capture.quantity;
    total.species.add(String(capture.species).trim().toLocaleLowerCase('pt-BR'));
  }
  const rows = [...totals.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'pt-BR'));
  let rank = 0;
  return rows.map((row, index) => {
    if (!index || row.quantity !== rows[index - 1].quantity) rank = index + 1;
    return { ...row, rank, species: row.species.size };
  });
}

export function profileRecord(existing, requestedName, authName, timestamp) {
  return {
    displayName: requestedName || existing?.displayName || authName || 'Pescador',
    createdAt: existing?.createdAt ?? timestamp
  };
}

export function validateCapture(fields, uid, createdAt, today) {
  const species = String(fields.species || '').trim();
  const location = String(fields.location || '').trim();
  const quantity = Number(fields.quantity);
  const weight = fields.weight === '' ? 0 : Number(fields.weight);
  const date = String(fields.date || '');
  const parsed = new Date(`${date}T12:00:00Z`);
  if (species.length < 2 || species.length > 60) throw new CaptureValidationError('Informe uma espécie entre 2 e 60 caracteres.');
  if (location.length < 2 || location.length > 100) throw new CaptureValidationError('Informe o local da pescaria.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) throw new CaptureValidationError('A quantidade deve ser um número inteiro entre 1 e 1000.');
  if (!Number.isFinite(weight) || weight < 0 || weight > 10000) throw new CaptureValidationError('Informe um peso válido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date > today) throw new CaptureValidationError('Escolha uma data válida, até hoje.');
  if (!uid) throw new CaptureValidationError('Entre na sua conta para registrar uma captura.');
  return { uid, species, quantity, weight, date, location, createdAt };
}
