import { compass, windowMarine, windowMarineSummary } from './marine-model.js';

const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const unit = (value, suffix, digits = 1) => Number.isFinite(value) ? `${fmt(value, digits)} ${suffix}` : 'Indisponível';
const direction = value => Number.isFinite(value) ? `de ${compass(value)} · ${fmt(value, 0)}°` : 'Direção variável ou indisponível';
const span = (range, suffix) => range ? `${fmt(range.min) === fmt(range.max) ? fmt(range.min) : `${fmt(range.min)}–${fmt(range.max)}`} ${suffix}` : 'indisponível';

function metric(title, value, note) {
  return `<article class="marine-metric"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>`;
}

const dateLabel = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

export function renderMarinePanel({ weather, marine, windows = [] }) {
  const panel = document.querySelector('#marinePanel');
  panel.setAttribute('aria-busy', 'false');
  const tabs = document.querySelector('#marineTabs');
  tabs.replaceChildren();
  tabs.hidden = !windows.length;
  document.querySelector('#marineContent').hidden = !windows.length;
  const empty = document.querySelector('#marineEmpty');
  empty.hidden = !!windows.length;
  if (!windows.length) {
    panel.removeAttribute('data-window');
    document.querySelector('#marineTitle').textContent = 'Condições médias por janela.';
    document.querySelector('#marineDate').textContent = '';
    empty.textContent = 'Sem janela de pesca calculada para este dia. Escolha outra data ou atualize a previsão.';
    return;
  }

  const buttons = [0, 1].map(index => {
    const button = document.createElement('button');
    button.type = 'button'; button.id = `marineWindowTab${index}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'marineContent');
    button.dataset.window = String(index + 1);
    button.disabled = !windows[index];
    const label = document.createElement('span');
    label.textContent = index === 0 ? 'Primeira janela' : 'Segunda janela';
    const hours = document.createElement('small');
    hours.textContent = windows[index] ? `${windows[index].startHour} — ${windows[index].endHour}${windows[index].previousDay ? ' · início no dia anterior' : ''}` : 'Indisponível neste dia';
    button.append(label, hours); tabs.append(button);
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = windows.length < 2 || event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
      select(next); buttons[next].focus();
    });
    return button;
  });
  function select(index) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    panel.dataset.window = String(index + 1);
    document.querySelector('#marineContent').setAttribute('aria-labelledby', buttons[index].id);
    document.querySelector('#marineTitle').textContent = `Condições médias da ${index === 0 ? 'primeira' : 'segunda'} janela.`;
    renderWindow(windows[index], weather, marine);
  }
  select(0);
}

function renderWindow(window, weather, marine) {
  const summary = windowMarineSummary(window, weather.hourly, marine.hourly);
  const values = summary.values;
  document.querySelector('#marineDate').textContent = `${dateLabel(window.startDate)} às ${window.startHour} — ${dateLabel(window.endDate)} às ${window.endHour}${window.previousDay ? ' · início no dia anterior' : ''} · horário local`;
  const gauge = document.querySelector('#marineGauge');
  gauge.dataset.tone = summary.tone;
  gauge.setAttribute('aria-label', summary.score === null ? 'Nota marítima média da janela indisponível' : `Nota marítima média da janela: ${summary.score} de 100. ${summary.label}`);
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
    metric('Período das ondas', unit(values.wave_period, 's'), `Média na janela. No swell: ${unit(values.swell_wave_period, 's')}.`),
    metric('Ondulação · swell', unit(values.swell_wave_height, 'm'), `${direction(values.swell_wave_direction)}. Altura média da ondulação gerada à distância.`),
    metric('Temperatura do mar', unit(values.sea_surface_temperature, '°C'), 'Média na janela, na superfície da célula oceânica.'),
    metric('Pressão atmosférica', unit(values.pressure_msl, 'hPa', 0), 'Média na janela ao nível do mar.')
  ].join('');

  document.querySelector('#marineFocusNote').textContent = Number.isFinite(values.wind_wave_height)
    ? `Ondas geradas pelo vento: média na janela de ${fmt(values.wind_wave_height)} m. A altura combinada já inclui vento e swell; não some essas alturas.`
    : 'A altura combinada inclui vento e swell. Esses valores não devem ser somados.';
}

export function clearMarinePanel(loading = false) {
  document.querySelector('#marinePanel').setAttribute('aria-busy', String(loading));
  document.querySelector('#marineContent').hidden = true;
  document.querySelector('#marineTabs').hidden = true;
  document.querySelector('#marineTabs').replaceChildren();
  document.querySelector('#marinePanel').removeAttribute('data-window');
  document.querySelector('#marineTitle').textContent = 'Condições médias por janela.';
  const empty = document.querySelector('#marineEmpty');
  empty.hidden = false; empty.textContent = loading ? 'Atualizando médias de vento e mar…' : 'Previsão marítima indisponível. Tente atualizar novamente.';
  document.querySelector('#marineDate').textContent = '';
}

export function marineWindowText(window, weather, marine) {
  const data = windowMarine(window, weather, marine);
  if (![data.wind, data.waves, data.gust].some(Boolean)) return 'Sem previsão marítima horária neste intervalo.';
  return `Amostras no intervalo: vento ${span(data.wind, 'km/h')}; rajadas até ${data.gust ? unit(data.gust.max, 'km/h') : '—'}; ondas ${span(data.waves, 'm')}; período ${span(data.period, 's')}.${data.thunder ? ' Trovoadas previstas.' : ''}`;
}
