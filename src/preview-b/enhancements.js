import {
  nextFishingWindow,
  countdownText,
  forecastNow,
  dayWindowRange,
  PRESET_SPOTS,
  solunarPeriods,
  checkSolunarSync,
  recommendTackle,
  tideAmplitudeInfo,
  SPECIES_CATALOG,
  filterSpeciesCatalog
} from './model.js';

export {
  forecastDays,
  PRESET_SPOTS,
  solunarPeriods,
  checkSolunarSync,
  recommendTackle,
  tideAmplitudeInfo,
  SPECIES_CATALOG,
  filterSpeciesCatalog
} from './model.js';

const $ = selector => document.querySelector(selector);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const decimal = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const svgNode = (tag, attrs) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
};

let countdownTimer;
let activeAlertWindowKey = null;
const previousNumbers = new Map();
const metricFrames = new Map();

export function clearPreview(loading = false) {
  clearInterval(countdownTimer);
  const nw = $('#nextWindow');
  if (nw) {
    nw.setAttribute('aria-busy', String(loading));
    nw.dataset.active = 'false';
  }
  if ($('#nextWindowTitle')) $('#nextWindowTitle').textContent = loading ? 'Buscando sua próxima janela' : 'Janela indisponível';
  if ($('#nextWindowHours')) $('#nextWindowHours').textContent = '—';
  if ($('#nextWindowDate')) $('#nextWindowDate').textContent = loading ? 'Consultando os horários de maré…' : 'Tente atualizar a previsão.';
  if ($('#nextWindowCountdown')) $('#nextWindowCountdown').textContent = loading ? 'Atualizando…' : 'Sem dados';
  if ($('#nextWindowProgressWrap')) $('#nextWindowProgressWrap').hidden = true;
  if ($('#nextWindowSyncBadge')) $('#nextWindowSyncBadge').hidden = true;
  if ($('#nextWindowLink')) $('#nextWindowLink').onclick = event => event.preventDefault();
  if ($('#chartTools')) $('#chartTools').hidden = true;
  if ($('#chartTooltip')) $('#chartTooltip').hidden = true;
  for (const frame of metricFrames.values()) cancelAnimationFrame(frame);
  metricFrames.clear();
  previousNumbers.clear();
}

function renderCountdown(allDays, weather, selectDate, currentSolunar) {
  clearInterval(countdownTimer);
  const update = () => {
    const offset = weather.utc_offset_seconds || 0, now = Date.now();
    const next = nextFishingWindow(allDays, offset, now);
    const nw = $('#nextWindow');
    if (!nw) return;
    nw.setAttribute('aria-busy', 'false');
    if (!next) {
      $('#nextWindowTitle').textContent = 'Sem próxima janela calculada';
      $('#nextWindowHours').textContent = '—';
      $('#nextWindowDate').textContent = 'Não há horários futuros na previsão disponível.';
      $('#nextWindowCountdown').textContent = 'Dados insuficientes';
      nw.dataset.active = 'false';
      if ($('#nextWindowProgressWrap')) $('#nextWindowProgressWrap').hidden = true;
      if ($('#nextWindowSyncBadge')) $('#nextWindowSyncBadge').hidden = true;
      $('#nextWindowLink').onclick = null;
      return;
    }
    $('#nextWindowTitle').textContent = next.active ? 'Janela de pesca em andamento!' : 'Sua próxima janela ideal';
    $('#nextWindowHours').textContent = `${next.startHour} — ${next.endHour}`;
    const label = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    const dateLabel = next.previousDay ? `${label(next.startDate)} → ${label(next.endDate)}` : next.startDate === forecastNow(now, offset).slice(0, 10) ? 'Hoje' : label(next.startDate);
    const peakText = Number.isFinite(next.peakLevel) ? ` · Preamar ${decimal(next.peakLevel)} m` : '';
    $('#nextWindowDate').textContent = `${dateLabel} · horário local${peakText}`;
    $('#nextWindowCountdown').textContent = `${next.active ? 'Encerra' : 'Começa'} em ${countdownText((next.active ? next.end : next.start) - now)}`;
    nw.dataset.active = String(next.active);

    const progWrap = $('#nextWindowProgressWrap');
    const progBar = $('#nextWindowProgressBar');
    const progText = $('#nextWindowProgressText');
    if (progWrap && progBar && progText) {
      if (next.active) {
        progWrap.hidden = false;
        progBar.style.width = `${next.progress}%`;
        progText.textContent = `${next.progress}% da janela concluída · Maré enchendo rumo ao pico`;
      } else {
        const diffHours = Math.max(0, (next.start - now) / 3600000);
        const prepPct = Math.round(Math.max(8, Math.min(95, (1 - Math.min(diffHours, 12) / 12) * 100)));
        progWrap.hidden = false;
        progBar.style.width = `${prepPct}%`;
        progText.textContent = diffHours <= 2 ? 'Prepare o material! Menos de 2h para o início' : 'Contagem regressiva para a enchente';
      }
    }

    const syncBadge = $('#nextWindowSyncBadge');
    if (syncBadge && currentSolunar) {
      const sync = checkSolunarSync(next, currentSolunar);
      if (sync) {
        syncBadge.hidden = false;
        syncBadge.textContent = `⚡ ${sync.badge} (${sync.period})`;
      } else {
        syncBadge.hidden = true;
      }
    }

    $('#nextWindowLink').onclick = () => selectDate(next.endDate);

    const alertBtn = $('#windowAlertBtn');
    if (alertBtn) {
      const windowKey = `${next.startDate}-${next.startHour}`;
      const isArmed = activeAlertWindowKey === windowKey;
      alertBtn.setAttribute('aria-pressed', String(isArmed));
      alertBtn.textContent = isArmed ? '🔔 Alerta ativo para esta janela' : '🔔 Lembrar janela';
      alertBtn.onclick = async () => {
        if (activeAlertWindowKey === windowKey) {
          activeAlertWindowKey = null;
          alertBtn.setAttribute('aria-pressed', 'false');
          alertBtn.textContent = '🔔 Lembrar janela';
          showToast('Lembrete da janela desativado.');
          return;
        }
        if ('Notification' in window && Notification.permission === 'default') {
          try { await Notification.requestPermission(); } catch {}
        }
        activeAlertWindowKey = windowKey;
        alertBtn.setAttribute('aria-pressed', 'true');
        alertBtn.textContent = '🔔 Alerta ativo para esta janela';
        showToast(`Alerta programado para a janela ${next.startHour} — ${next.endHour}!`);
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Maré Certa · Lembrete Ativado', {
              body: `Janela monitorada: ${next.startHour} às ${next.endHour} (${dateLabel}). Boa pescaria!`
            });
          } catch {}
        }
      };
    }
  };
  update();
  countdownTimer = setInterval(update, 15000);
}

export function showToast(text) {
  let toast = $('#bToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bToast';
    toast.className = 'b-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 3400);
}

function animateNumbers() {
  for (const id of ['windSpeed', 'uvIndex', 'moonPercent']) {
    const element = document.getElementById(id);
    if (!element) continue;
    const text = element.textContent;
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

function interactiveChart({ date, points, events = [], allDays, weather, solunar }) {
  const chart = $('#tideChart'), tools = $('#chartTools'), tooltip = $('#chartTooltip'), slider = $('#chartScrub');
  if (!chart || !tools || !tooltip || !slider) return;
  tools.hidden = !points.length;
  tooltip.hidden = true;
  chart.onpointermove = null;
  chart.onpointerleave = null;
  if (!points.length) return;

  const ampBadge = $('#tideAmplitudeBadge');
  if (ampBadge) {
    const amp = tideAmplitudeInfo(points, events);
    if (amp) {
      ampBadge.hidden = false;
      ampBadge.textContent = `Amplitude: ${decimal(amp.amplitude)} m · ${amp.category}`;
    } else {
      ampBadge.hidden = true;
    }
  }

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
    bands.append(svgNode('rect', { x: start, y: top, width: Math.max(0, end - start), height: bottom - top, rx: 6, class: 'chart-window-band' }));
  }

  if (solunar?.majors) {
    for (const major of solunar.majors) {
      if (major.endMin > major.startMin) {
        const sx = left + major.startMin / 1440 * (right - left);
        const ex = left + major.endMin / 1440 * (right - left);
        bands.append(svgNode('rect', { x: sx, y: bottom - 5, width: Math.max(4, ex - sx), height: 4, rx: 2, class: 'chart-solunar-bar' }));
      }
    }
  }

  const defs = chart.querySelector('defs');
  if (defs) defs.after(bands);

  const nowLocal = forecastNow(Date.now(), weather.utc_offset_seconds || 0);
  if (nowLocal.startsWith(date)) {
    chart.append(svgNode('line', { x1: x(nowLocal), x2: x(nowLocal), y1: top, y2: bottom, class: 'chart-now', 'aria-hidden': 'true' }));
  }
  const crosshair = svgNode('line', { y1: top, y2: bottom, class: 'chart-crosshair', 'aria-hidden': 'true' });
  const dot = svgNode('circle', { r: 5.5, class: 'chart-inspect-dot', 'aria-hidden': 'true' });
  chart.append(crosshair, dot);
  slider.max = points.length - 1;
  let selected = points.reduce((best, p, i) => Math.abs(minute(p.time) - 720) < Math.abs(minute(points[best].time) - 720) ? i : best, 0);

  const getTideTrend = idx => {
    const prev = points[Math.max(0, idx - 1)];
    const next = points[Math.min(points.length - 1, idx + 1)];
    if (!prev || !next) return '';
    const diff = next.level - prev.level;
    if (Math.abs(diff) < 0.015) return ' · Estofa';
    return diff > 0 ? ' · Enchendo ↑' : ' · Vazando ↓';
  };

  const show = (index, floating = false) => {
    selected = Math.max(0, Math.min(points.length - 1, index));
    const p = points[selected], xx = x(p.time), yy = y(p.level);
    const trend = getTideTrend(selected);
    const label = `${p.time.slice(11, 16)} · ${decimal(p.level)} m${trend}`;
    crosshair.setAttribute('x1', xx);
    crosshair.setAttribute('x2', xx);
    dot.setAttribute('cx', xx);
    dot.setAttribute('cy', yy);
    slider.value = selected;
    slider.setAttribute('aria-valuetext', label);
    $('#chartReadout').textContent = label;
    tooltip.textContent = label;
    tooltip.hidden = !floating;
    if (floating) {
      const bounds = chart.getBoundingClientRect(), wrap = chart.parentElement.getBoundingClientRect();
      tooltip.style.left = `${Math.max(85, Math.min(wrap.width - 85, bounds.left - wrap.left + xx / 760 * bounds.width))}px`;
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
    const line = chart.querySelector('.tide-line');
    if (line && typeof line.getTotalLength === 'function') {
      const length = line.getTotalLength();
      line.animate([{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length }, { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 }], { duration: 700, easing: 'ease-out' });
    }
    const area = chart.querySelector('.tide-area');
    if (area && typeof area.animate === 'function') {
      area.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
    }
  }
}

function renderSolunarAndTackle({ date, weather, marine, location, selectedDay = 0 }) {
  const solunarEl = $('#solunarPanelContent');
  const tackleEl = $('#tackleAdvisorContent');
  if (!solunarEl && !tackleEl) return;

  const moonPhase = weather?.daily?.moon_phase?.[selectedDay] ?? 0;
  const solunar = solunarPeriods(date, moonPhase, location?.longitude ?? -34.8631);

  if (solunarEl) {
    solunarEl.innerHTML = `
      <div class="solunar-header-row">
        <div class="solunar-score-pill">
          <span class="solunar-score-num">${solunar.score}%</span>
          <div>
            <strong>Atividade ${solunar.rating}</strong>
            <small>Baseado no trânsito lunar e alinhamento solar</small>
          </div>
        </div>
      </div>
      <div class="solunar-periods-grid">
        ${solunar.majors.map(m => `
          <div class="solunar-period-card major">
            <span class="solunar-tag">⚡ PERÍODO MAIOR · 2H</span>
            <strong>${m.startHour} — ${m.endHour}</strong>
            <small>${m.label}</small>
          </div>
        `).join('')}
        ${solunar.minors.map(m => `
          <div class="solunar-period-card minor">
            <span class="solunar-tag">🌙 PERÍODO MENOR · 1H</span>
            <strong>${m.startHour} — ${m.endHour}</strong>
            <small>${m.label}</small>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (tackleEl) {
    const dayPrefix = `${date}T`;
    const waveTimes = marine?.hourly?.time || [];
    const dayWaves = [];
    const dayPeriods = [];
    waveTimes.forEach((t, i) => {
      if (t.startsWith(dayPrefix)) {
        const w = marine.hourly.wave_height?.[i];
        const p = marine.hourly.wave_period?.[i];
        if (Number.isFinite(w)) dayWaves.push(w);
        if (Number.isFinite(p)) dayPeriods.push(p);
      }
    });
    const avgWave = dayWaves.length ? dayWaves.reduce((a, b) => a + b, 0) / dayWaves.length : null;
    const avgPeriod = dayPeriods.length ? dayPeriods.reduce((a, b) => a + b, 0) / dayPeriods.length : null;
    const maxWind = weather?.daily?.wind_speed_10m_max?.[selectedDay] ?? null;

    const tackle = recommendTackle({ waveHeight: avgWave, wavePeriod: avgPeriod, windSpeed: maxWind });
    tackleEl.innerHTML = `
      <div class="tackle-status-banner">
        <span class="tackle-condition-badge">🌊 ${tackle.condition}</span>
      </div>
      <div class="tackle-grid">
        <div class="tackle-item">
          <span class="tackle-label">⚓ CHUMBADA IDEAL</span>
          <strong>${tackle.sinker}</strong>
          <p>${tackle.sinkerNote}</p>
        </div>
        <div class="tackle-item">
          <span class="tackle-label">🪝 CHICOTE & PERNADAS</span>
          <strong>${tackle.rig}</strong>
          <p>${tackle.rigNote}</p>
        </div>
        <div class="tackle-item">
          <span class="tackle-label">🧵 LINHA & ARRANQUE</span>
          <strong>${tackle.line}</strong>
          <p>${tackle.strategy}</p>
        </div>
      </div>
    `;
  }

  return solunar;
}

export function initSpeciesCatalogUI() {
  const container = $('#speciesCatalogGrid');
  const searchInput = $('#speciesSearchInput');
  const zoneButtons = document.querySelectorAll('[data-zone-filter]');
  const baitButtons = document.querySelectorAll('[data-bait-filter]');
  const countEl = $('#speciesCatalogCount');
  if (!container) return;

  let currentZone = 'all';
  let currentBait = 'all';
  let currentQuery = '';

  const renderCatalog = () => {
    const filtered = filterSpeciesCatalog(SPECIES_CATALOG, {
      query: currentQuery,
      zone: currentZone,
      bait: currentBait
    });
    if (countEl) {
      countEl.textContent = `${filtered.length} espécie${filtered.length === 1 ? '' : 's'} de praia listada${filtered.length === 1 ? '' : 's'}`;
    }
    if (!filtered.length) {
      container.innerHTML = `<p class="empty-note">Nenhuma espécie encontrada para este filtro. Tente limpar a busca.</p>`;
      return;
    }
    container.innerHTML = filtered.map(sp => `
      <article class="species-card card">
        <div class="species-card-top">
          <span class="species-zone-badge">${sp.zoneLabel}</span>
          <span class="species-size-badge" title="Tamanho mínimo recomendado para preservação">📏 Mín. ${sp.minSize}</span>
        </div>
        <h3>${sp.name}</h3>
        <p class="species-scientific"><em>${sp.scientific}</em></p>
        <div class="species-baits">
          <small>ISCAS RECOMENDADAS</small>
          <div class="species-bait-pills">
            ${sp.baits.map(b => `<span class="bait-pill">${b}</span>`).join('')}
          </div>
        </div>
        <div class="species-specs">
          <div><small>ANZOL / MONTAGEM</small><strong>${sp.hook}</strong></div>
          <div><small>MELHOR MOMENTO</small><strong>${sp.bestTide}</strong></div>
        </div>
        <p class="species-tip">💡 <strong>Dica de praia:</strong> ${sp.tip}</p>
      </article>
    `).join('');
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentQuery = searchInput.value;
      renderCatalog();
    });
  }
  zoneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentZone = btn.dataset.zoneFilter;
      zoneButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      renderCatalog();
    });
  });
  baitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentBait = btn.dataset.baitFilter;
      baitButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      renderCatalog();
    });
  });

  renderCatalog();
}

export function renderPreview(data) {
  const solunar = renderSolunarAndTackle({
    date: data.date,
    weather: data.weather,
    marine: data.marine,
    location: data.location,
    selectedDay: data.selectedDay || 0
  });
  renderCountdown(data.allDays, data.weather, data.selectDate, solunar);
  interactiveChart({ ...data, solunar });
  animateNumbers();
  if (!reduced()) {
    for (const node of document.querySelectorAll('#fishingWindows .window-card, #summaryCards .summary-item')) {
      if (typeof node.animate === 'function') {
        node.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350, easing: 'ease-out' });
      }
    }
  }
  const strip = $('#dayStrip'), active = strip?.querySelector('.active');
  if (active && strip.scrollWidth > strip.clientWidth) {
    strip.scrollTo({ left: active.offsetLeft - strip.offsetLeft - (strip.clientWidth - active.clientWidth) / 2, behavior: reduced() ? 'instant' : 'smooth' });
  }
}

const resetHolo = card => {
  if (!card) return;
  card.style.setProperty('--tilt-x', '0deg');
  card.style.setProperty('--tilt-y', '0deg');
  card.style.setProperty('--holo-x', '50%');
  card.style.setProperty('--holo-y', '50%');
};

if (typeof document !== 'undefined') {
  document.addEventListener('pointermove', event => {
    if (reduced() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const card = event.target.closest('.spring-tide-window');
    if (!card) return;
    const box = card.getBoundingClientRect(), x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
    card.style.setProperty('--holo-x', `${x * 100}%`);
    card.style.setProperty('--holo-y', `${y * 100}%`);
    card.style.setProperty('--tilt-x', `${(0.5 - y) * 9}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * 11}deg`);
  });
  document.addEventListener('pointerout', event => {
    const card = event.target.closest('.spring-tide-window');
    if (card && !card.contains(event.relatedTarget)) resetHolo(card);
  });
  initSpeciesCatalogUI();
}
