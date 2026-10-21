import { compass } from '../marine-model.js';
import { fishingWindow } from '../tide-model.js';
import { windowMarineSummary } from './window-marine-model.js';
export { windowMarineSummary } from './window-marine-model.js';

const $ = selector => document.querySelector(selector);
const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
const unit = (value, suffix, digits = 1) => Number.isFinite(value) ? `${fmt(value, digits)} ${suffix}` : 'Indisponível';
const direction = value => Number.isFinite(value) ? `de ${compass(value)} · ${fmt(value, 0)}°` : 'Direção variável ou indisponível';
const metric = (title, value, note) => `<article class="marine-metric"><h3>${title}</h3><strong>${value}</strong><p>${note}</p></article>`;
const dateLabel = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
let gaugeFrame = 0, gaugeObserver, selectedWindow = 0;

function animateGauge(score) {
  cancelAnimationFrame(gaugeFrame); gaugeObserver?.disconnect();
  const needle = $('#marineGaugeNeedle'), value = $('#marineGaugeValue');
  const from = Number.isFinite(Number(value.textContent)) ? Number(value.textContent) : 0;
  const draw = n => { needle.setAttribute('transform', `rotate(${n * 1.8} 160 150)`); value.textContent = Math.round(n); };
  needle.style.visibility = score === null ? 'hidden' : 'visible';
  if (score === null) { value.textContent = '—'; return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(score); return; }
  draw(from);
  gaugeObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    gaugeObserver.disconnect();
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 950);
      draw(from + (score - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) gaugeFrame = requestAnimationFrame(tick);
    };
    gaugeFrame = requestAnimationFrame(tick);
  }, { threshold: .25 });
  gaugeObserver.observe($('#marineGauge'));
}

export function renderMarinePanel({ date, events = [], weather, marine }) {
  const windows = events.filter(event => event.type === 'high').slice(0, 2).map(event => fishingWindow(event));
  const tabs = $('#marineWindowTabs');
  tabs.replaceChildren();
  $('#marinePanel').setAttribute('aria-busy', 'false');
  $('#marineContent').hidden = !windows.length;
  $('#marineEmpty').hidden = !!windows.length;
  if (!windows.length) { clearMarinePanel(); $('#marineEmpty').textContent = 'Sem janelas de maré disponíveis para este dia.'; return; }
  selectedWindow = Math.min(selectedWindow, windows.length - 1);
  const buttons = windows.map((window, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.id = `marineWindowTab${index}`;
    button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'marineContent');
    const title = document.createElement('span'); title.textContent = `${index + 1}ª janela`;
    const hours = document.createElement('strong'); hours.textContent = `${window.startHour} — ${window.endHour}`;
    button.append(title, hours); tabs.append(button);
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? windows.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + windows.length) % windows.length;
      select(next); buttons[next].focus();
    });
    return button;
  });
  function select(index) {
    selectedWindow = index;
    buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
    $('#marineContent').setAttribute('aria-labelledby', buttons[index].id);
    const window = windows[index], summary = windowMarineSummary(window, weather.hourly, marine.hourly), values = summary.values;
    $('#marineDate').textContent = `${dateLabel(window.startDate)} ${window.startHour} → ${dateLabel(window.endDate)} ${window.endHour} · médias do intervalo`;
    const gauge = $('#marineGauge'); gauge.dataset.tone = summary.tone;
    gauge.setAttribute('aria-label', summary.score === null ? `Nota da ${index + 1}ª janela indisponível` : `Nota média da ${index + 1}ª janela: ${summary.score} de 100. ${summary.label}`);
    animateGauge(summary.score);
    $('#marineRatingLabel').textContent = summary.label;
    $('#marineRatingNote').textContent = summary.note;
    $('#marineScoreBreakdown').textContent = summary.parts.length ? `Média das parcelas em ${summary.count} horários: ${summary.parts.map(part => `${part.name} ${fmt(part.points)}/${part.max}`).join(' · ')}. Nota arredondada: ${summary.score}/100.` : summary.note;
    $('#marineMetrics').innerHTML = [
      metric('Vento e rajadas', unit(values.wind_speed_10m, 'km/h'), `${direction(values.wind_direction_10m)}. Rajadas médias: ${unit(values.wind_gusts_10m, 'km/h')}.`),
      metric('Ondas combinadas', unit(values.wave_height, 'm'), `${direction(values.wave_direction)}. Altura significativa média na janela.`),
      metric('Período das ondas', unit(values.wave_period, 's'), `Média na janela. No swell: ${unit(values.swell_wave_period, 's')}.`),
      metric('Ondulação · swell', unit(values.swell_wave_height, 'm'), `${direction(values.swell_wave_direction)}. Altura média da ondulação.`),
      metric('Temperatura do mar', unit(values.sea_surface_temperature, '°C'), 'Média prevista na superfície durante a janela.'),
      metric('Pressão atmosférica', unit(values.pressure_msl, 'hPa', 0), 'Média ao nível do mar durante a janela.')
    ].join('');
    $('#marineFocusNote').textContent = `Ondas geradas pelo vento: ${unit(values.wind_wave_height, 'm')}. A altura combinada já inclui vento e swell; não some essas alturas.`;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $('#marineMetrics').animate([{ opacity: .4, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260 });
  }
  select(selectedWindow);
}

export function clearMarinePanel(loading = false) {
  cancelAnimationFrame(gaugeFrame); gaugeObserver?.disconnect();
  $('#marinePanel').setAttribute('aria-busy', String(loading));
  $('#marineWindowTabs').replaceChildren();
  $('#marineContent').hidden = true;
  $('#marineEmpty').hidden = false;
  $('#marineEmpty').textContent = loading ? 'Atualizando as condições de cada janela…' : 'Condições marítimas indisponíveis. Tente atualizar a previsão.';
  $('#marineDate').textContent = '';
}
