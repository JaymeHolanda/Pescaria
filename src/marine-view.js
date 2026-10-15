import { marineRows, compass, rangeOf, windowMarine, dailyMarineSummary } from './marine-model.js';

const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const unit = (value, suffix, digits = 1) => Number.isFinite(value) ? `${fmt(value, digits)} ${suffix}` : 'Indisponível';
const direction = value => Number.isFinite(value) ? `de ${compass(value)} · ${fmt(value, 0)}°` : 'Direção variável ou indisponível';
const span = (range, suffix) => range ? `${fmt(range.min) === fmt(range.max) ? fmt(range.min) : `${fmt(range.min)}–${fmt(range.max)}`} ${suffix}` : 'indisponível';

function metric(title, value, note) {
  return `<article class="marine-metric"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>`;
}

export function renderMarinePanel({ date, weather, marine }) {
  const rows = marineRows(date, weather.hourly, marine.hourly);
  const panel = document.querySelector('#marinePanel');
  panel.setAttribute('aria-busy', 'false');
  document.querySelector('#marineContent').hidden = !rows.length;
  document.querySelector('#marineEmpty').hidden = !!rows.length;
  if (!rows.length) return;

  const summary = dailyMarineSummary(rows);
  const values = summary.values;
  document.querySelector('#marineDate').textContent = `${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))} · médias de 0h a 23h`;
  const gauge = document.querySelector('#marineGauge');
  gauge.dataset.tone = summary.tone;
  gauge.setAttribute('aria-label', summary.score === null ? 'Nota marítima média do dia indisponível' : `Nota marítima média do dia: ${summary.score} de 100. ${summary.label}`);
  document.querySelector('#marineGaugeValue').textContent = summary.score ?? '—';
  document.querySelector('#marineGaugeNeedle').setAttribute('transform', `rotate(${(summary.score ?? 0) * 1.8} 160 150)`);
  document.querySelector('#marineGaugeNeedle').style.visibility = summary.score === null ? 'hidden' : 'visible';
  document.querySelector('#marineRatingLabel').textContent = summary.label;
  document.querySelector('#marineRatingNote').textContent = summary.note;
  document.querySelector('#marineScoreBreakdown').textContent = summary.parts.length
    ? `Média das parcelas em ${summary.count} horários: ${summary.parts.map(part => `${part.name} ${fmt(part.points)}/${part.max}`).join(' · ')}. Nota média arredondada: ${summary.score ?? 'indisponível'}/100.`
    : summary.note;
  document.querySelector('#marineMetrics').innerHTML = [
    metric('Vento e rajadas', unit(values.wind_speed_10m, 'km/h'), `${direction(values.wind_direction_10m)}. Rajadas médias: ${unit(values.wind_gusts_10m, 'km/h')}.`),
    metric('Ondas combinadas', unit(values.wave_height, 'm'), `${direction(values.wave_direction)}. Altura significativa média.`),
    metric('Período das ondas', unit(values.wave_period, 's'), `Média diária. No swell: ${unit(values.swell_wave_period, 's')}.`),
    metric('Ondulação · swell', unit(values.swell_wave_height, 'm'), `${direction(values.swell_wave_direction)}. Altura média da ondulação gerada à distância.`),
    metric('Temperatura do mar', unit(values.sea_surface_temperature, '°C'), 'Média diária prevista na superfície da célula oceânica.'),
    metric('Pressão atmosférica', unit(values.pressure_msl, 'hPa', 0), 'Média diária ao nível do mar.')
  ].join('');

  const windWaves = rangeOf(rows, 'wind_wave_height');
  document.querySelector('#marineFocusNote').textContent = windWaves
    ? `Ondas geradas pelo vento: média diária de ${fmt(rows.map(row => row.wind_wave_height).filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / windWaves.count)} m. A altura combinada já inclui vento e swell; não some essas alturas.`
    : 'A altura combinada inclui vento e swell. Esses valores não devem ser somados.';
}

export function clearMarinePanel(loading = false) {
  document.querySelector('#marinePanel').setAttribute('aria-busy', String(loading));
  document.querySelector('#marineContent').hidden = true;
  const empty = document.querySelector('#marineEmpty');
  empty.hidden = false; empty.textContent = loading ? 'Atualizando médias de vento e mar…' : 'Previsão marítima indisponível. Tente atualizar novamente.';
  document.querySelector('#marineDate').textContent = '';
}

export function marineWindowText(window, weather, marine) {
  const data = windowMarine(window, weather, marine);
  if (![data.wind, data.waves, data.gust].some(Boolean)) return 'Sem previsão marítima horária neste intervalo.';
  return `Amostras no intervalo: vento ${span(data.wind, 'km/h')}; rajadas até ${data.gust ? unit(data.gust.max, 'km/h') : '—'}; ondas ${span(data.waves, 'm')}; período ${span(data.period, 's')}.${data.thunder ? ' Trovoadas previstas.' : ''}`;
}
