import { nextFishingWindow, countdownText, forecastNow, dayWindowRange } from './model.js';
export { forecastDays } from './model.js';

const $ = selector => document.querySelector(selector);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const decimal = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const svgNode = (tag, attrs) => { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); return el; };
let countdownTimer;
const previousNumbers = new Map();
const metricFrames = new Map();

export function clearPreview(loading = false) {
  clearInterval(countdownTimer);
  $('#nextWindow').setAttribute('aria-busy', String(loading));
  $('#nextWindowTitle').textContent = loading ? 'Buscando sua próxima janela' : 'Janela indisponível';
  $('#nextWindowHours').textContent = '—';
  $('#nextWindowDate').textContent = loading ? 'Consultando os horários de maré…' : 'Tente atualizar a previsão.';
  $('#nextWindowCountdown').textContent = loading ? 'Atualizando…' : 'Sem dados';
  $('#nextWindow').dataset.active = 'false';
  $('#nextWindowLink').onclick = event => event.preventDefault();
  $('#chartTools').hidden = true;
  $('#chartTooltip').hidden = true;
  for (const frame of metricFrames.values()) cancelAnimationFrame(frame);
  metricFrames.clear(); previousNumbers.clear();
}

function renderCountdown(allDays, weather, selectDate) {
  clearInterval(countdownTimer);
  const update = () => {
    const offset = weather.utc_offset_seconds || 0, now = Date.now();
    const next = nextFishingWindow(allDays, offset, now);
    $('#nextWindow').setAttribute('aria-busy', 'false');
    if (!next) {
      $('#nextWindowTitle').textContent = 'Sem próxima janela calculada';
      $('#nextWindowHours').textContent = '—';
      $('#nextWindowDate').textContent = 'Não há horários futuros na previsão disponível.';
      $('#nextWindowCountdown').textContent = 'Dados insuficientes';
      $('#nextWindow').dataset.active = 'false';
      $('#nextWindowLink').onclick = null;
      return;
    }
    $('#nextWindowTitle').textContent = next.active ? 'Sua janela está em andamento' : 'Sua próxima janela';
    $('#nextWindowHours').textContent = `${next.startHour} — ${next.endHour}`;
    const label = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    const dateLabel = next.previousDay ? `${label(next.startDate)} → ${label(next.endDate)}` : next.startDate === forecastNow(now, offset).slice(0, 10) ? 'Hoje' : label(next.startDate);
    $('#nextWindowDate').textContent = `${dateLabel} · horário local da previsão`;
    $('#nextWindowCountdown').textContent = `${next.active ? 'Encerra' : 'Começa'} em ${countdownText((next.active ? next.end : next.start) - now)}`;
    $('#nextWindow').dataset.active = String(next.active);
    $('#nextWindowLink').onclick = () => selectDate(next.endDate);
  };
  update(); countdownTimer = setInterval(update, 15000);
}

function animateNumbers() {
  for (const id of ['windSpeed', 'uvIndex', 'moonPercent']) {
    const element = document.getElementById(id), text = element.textContent;
    const target = Number.parseFloat(text.replace(',', '.'));
    const before = previousNumbers.get(id);
    cancelAnimationFrame(metricFrames.get(id));
    previousNumbers.set(id, target);
    if (!Number.isFinite(target) || !Number.isFinite(before) || before === target || reduced()) continue;
    const suffix = text.endsWith('%') ? '%' : '', precision = text.includes(',') ? 1 : 0, start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 450);
      const value = before + (target - before) * (1 - Math.pow(1 - progress, 3));
      element.textContent = value.toLocaleString('pt-BR', { maximumFractionDigits: precision }) + suffix;
      if (progress < 1) metricFrames.set(id, requestAnimationFrame(tick)); else element.textContent = text;
    };
    metricFrames.set(id, requestAnimationFrame(tick));
  }
}

function interactiveChart({ date, points, allDays, weather }) {
  const chart = $('#tideChart'), tools = $('#chartTools'), tooltip = $('#chartTooltip'), slider = $('#chartScrub');
  tools.hidden = !points.length; tooltip.hidden = true;
  chart.onpointermove = null; chart.onpointerleave = null;
  if (!points.length) return;
  const left = 42, right = 744, top = 25, bottom = 216;
  const levels = points.map(p => p.level), min = Math.min(...levels), max = Math.max(...levels), span = max - min || 1;
  const minute = time => Number(time.slice(11, 13)) * 60 + Number(time.slice(14, 16));
  const x = time => left + minute(time) / 1440 * (right - left);
  const y = level => top + (max - level) / span * (bottom - top);
  const bands = svgNode('g', { class: 'chart-window-bands', 'aria-hidden': 'true' });
  for (const event of allDays.flatMap(day => day.events).filter(e => e.type === 'high')) {
    const range = dayWindowRange(event, date);
    if (!range) continue;
    const start = left + range.start / 1440 * (right - left), end = left + range.end / 1440 * (right - left);
    bands.append(svgNode('rect', { x: start, y: top, width: Math.max(0, end - start), height: bottom - top, rx: 5, class: 'chart-window-band' }));
  }
  chart.querySelector('defs').after(bands);
  const nowLocal = forecastNow(Date.now(), weather.utc_offset_seconds || 0);
  if (nowLocal.startsWith(date)) chart.append(svgNode('line', { x1: x(nowLocal), x2: x(nowLocal), y1: top, y2: bottom, class: 'chart-now', 'aria-hidden': 'true' }));
  const crosshair = svgNode('line', { y1: top, y2: bottom, class: 'chart-crosshair', 'aria-hidden': 'true' });
  const dot = svgNode('circle', { r: 5, class: 'chart-inspect-dot', 'aria-hidden': 'true' });
  chart.append(crosshair, dot);
  slider.max = points.length - 1;
  let selected = points.reduce((best, p, i) => Math.abs(minute(p.time) - 720) < Math.abs(minute(points[best].time) - 720) ? i : best, 0);
  const show = (index, floating = false) => {
    selected = Math.max(0, Math.min(points.length - 1, index));
    const p = points[selected], xx = x(p.time), yy = y(p.level), label = `${p.time.slice(11, 16)} · ${decimal(p.level)} m`;
    crosshair.setAttribute('x1', xx); crosshair.setAttribute('x2', xx); dot.setAttribute('cx', xx); dot.setAttribute('cy', yy);
    slider.value = selected; slider.setAttribute('aria-valuetext', label);
    $('#chartReadout').textContent = label;
    tooltip.textContent = label; tooltip.hidden = !floating;
    if (floating) {
      const bounds = chart.getBoundingClientRect(), wrap = chart.parentElement.getBoundingClientRect();
      tooltip.style.left = `${Math.max(70, Math.min(wrap.width - 70, bounds.left - wrap.left + xx / 760 * bounds.width))}px`;
      tooltip.style.top = `${bounds.top - wrap.top + yy / 250 * bounds.height - 14}px`;
    }
  };
  slider.oninput = () => show(Number(slider.value));
  chart.onpointermove = event => {
    const bounds = chart.getBoundingClientRect(), mx = (event.clientX - bounds.left) / bounds.width * 760;
    const index = points.reduce((best, p, i) => Math.abs(x(p.time) - mx) < Math.abs(x(points[best].time) - mx) ? i : best, 0);
    show(index, true);
  };
  chart.onpointerleave = () => { tooltip.hidden = true; };
  show(selected);
  if (!reduced()) {
    const line = chart.querySelector('.tide-line'), length = line.getTotalLength();
    line.animate([{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length }, { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 }], { duration: 700, easing: 'ease-out' });
    chart.querySelector('.tide-area').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
  }
}

export function renderPreview(data) {
  renderCountdown(data.allDays, data.weather, data.selectDate);
  interactiveChart(data);
  animateNumbers();
  if (!reduced()) {
    for (const node of document.querySelectorAll('#fishingWindows .window-card, #summaryCards .summary-item')) node.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350, easing: 'ease-out' });
  }
  const strip = $('#dayStrip'), active = strip.querySelector('.active');
  if (active && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: active.offsetLeft - strip.offsetLeft - (strip.clientWidth - active.clientWidth) / 2, behavior: reduced() ? 'instant' : 'smooth' });
}

const resetHolo = card => { if (!card) return; card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); card.style.setProperty('--holo-x', '50%'); card.style.setProperty('--holo-y', '50%'); };
document.addEventListener('pointermove', event => {
  if (reduced() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const card = event.target.closest('.spring-tide-window');
  if (!card) return;
  const box = card.getBoundingClientRect(), x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--holo-x', `${x * 100}%`); card.style.setProperty('--holo-y', `${y * 100}%`);
  card.style.setProperty('--tilt-x', `${(0.5 - y) * 9}deg`); card.style.setProperty('--tilt-y', `${(x - 0.5) * 11}deg`);
});
document.addEventListener('pointerout', event => { const card = event.target.closest('.spring-tide-window'); if (card && !card.contains(event.relatedTarget)) resetHolo(card); });
