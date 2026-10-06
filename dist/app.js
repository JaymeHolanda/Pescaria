import { conditionsSummary, hourlyDay } from './conditions.js';
import { marinePoints, findTideEvents, fishingWindow, isNearCabedelo, officialTideDay } from './tides.js';
const DEFAULT_LOCATION = { name: "João Pessoa", admin1: "Paraíba", country_code: "BR", latitude: -7.115, longitude: -34.8631 };
const state = { location: loadLocation(), weather: null, marine: null, selectedDay: 0, aborter: null };

const $ = (selector) => document.querySelector(selector);
const els = {
  locationButton: $("#locationButton"), locationPanel: $("#locationPanel"), locationName: $("#locationName"),
  searchForm: $("#searchForm"), locationSearch: $("#locationSearch"), searchResults: $("#searchResults"), useGps: $("#useGps"),
  dayStrip: $("#dayStrip"), dashboard: $("#dashboard"), selectedDate: $("#selectedDate"), tideChart: $("#tideChart"),
  tideEvents: $("#tideEvents"), fishingWindows: $("#fishingWindows"), moonName: $("#moonName"), moonPercent: $("#moonPercent"),
  moonVisual: $("#moonVisual"), windSpeed: $("#windSpeed"), windDirection: $("#windDirection"), windArrow: $("#windArrow"),
  scoreLabel: $("#scoreLabel"), scoreValue: $("#scoreValue"), scoreBar: $("#scoreBar"), scoreNote: $("#scoreNote"),
  summaryTitle: $("#summaryTitle"), summaryDate: $("#summaryDate"), summaryCards: $("#summaryCards"), scoreBreakdown: $("#scoreBreakdown"),
  tideSource: $("#tideSource"), tideReference: $("#tideReference"),
  dataStatus: $("#dataStatus"), todayLabel: $("#todayLabel"), errorBox: $("#errorBox"), errorMessage: $("#errorMessage"), retryButton: $("#retryButton")
};

function loadLocation() {
  try { return JSON.parse(localStorage.getItem("mare-certa-location")) || DEFAULT_LOCATION; }
  catch { return DEFAULT_LOCATION; }
}

function saveLocation(location) {
  state.location = location;
  localStorage.setItem("mare-certa-location", JSON.stringify(location));
  updateLocationLabel();
}

function updateLocationLabel() {
  const l = state.location;
  const region = l.admin1 || l.country_code || "";
  els.locationName.textContent = [l.name, region].filter(Boolean).join(", ");
}

function formatDate(dateString, options = {}) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options }).format(new Date(`${dateString}T12:00:00Z`));
}

function degreesToCompass(deg) {
  const names = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return names[Math.round((Number(deg) || 0) / 45) % 8];
}

function fallbackMoonPhase(dateString) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (new Date(`${dateString}T12:00:00Z`).getTime() - knownNewMoon) / 86400000;
  return ((days % 29.53058867) + 29.53058867) % 29.53058867 / 29.53058867;
}

function moonInfo(dateString, apiPhase) {
  const phase = Number.isFinite(apiPhase) ? apiPhase : fallbackMoonPhase(dateString);
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100);
  let name = "Lua nova";
  if (phase >= .0625 && phase < .1875) name = "Crescente côncava";
  else if (phase < .3125) name = "Quarto crescente";
  else if (phase < .4375) name = "Crescente gibosa";
  else if (phase < .5625) name = "Lua cheia";
  else if (phase < .6875) name = "Minguante gibosa";
  else if (phase < .8125) name = "Quarto minguante";
  else if (phase < .9375) name = "Minguante côncava";
  return { phase, illumination, name };
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Serviço indisponível (${response.status})`);
  return response.json();
}

async function loadForecast() {
  if (state.aborter) state.aborter.abort();
  state.aborter = new AbortController();
  const { latitude, longitude } = state.location;
  const common = `latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=7`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${common}&wind_speed_unit=kmh&hourly=wind_speed_10m&current=wind_speed_10m,wind_direction_10m&daily=moon_phase,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_probability_max`;
  // Include neighboring days before detecting peaks, including midnight on day 1/7.
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&timezone=auto&past_days=1&forecast_days=8&hourly=sea_level_height_msl,wave_height,wave_period&cell_selection=sea`;

  setLoading(true);
  try {
    const [weather, marine] = await Promise.all([
      fetchJson(weatherUrl, state.aborter.signal),
      fetchJson(marineUrl, state.aborter.signal)
    ]);
    state.weather = weather;
    state.marine = marine;
    state.selectedDay = 0;
    els.dataStatus.textContent = "Dados ao vivo";
    els.errorBox.hidden = true;
    renderAll();
  } catch (error) {
    if (error.name === "AbortError") return;
    state.weather = null; state.marine = null;
    els.errorMessage.textContent = error.message || "Confira sua conexão e tente novamente.";
    els.errorBox.hidden = false;
    els.dataStatus.textContent = "Atualização pendente";
    renderUnavailable();
  } finally { setLoading(false); }
}

function setLoading(loading) {
  els.dashboard.setAttribute("aria-busy", String(loading));
  els.locationButton.disabled = loading;
  if (loading) {
    els.summaryTitle.textContent = 'Atualizando o resumo…';
    els.summaryCards.replaceChildren();
    els.summaryDate.textContent = '';
    els.scoreLabel.textContent = 'Calculando'; els.scoreValue.textContent = '—'; els.scoreBar.style.width = '0%';
    els.scoreNote.textContent = 'Buscando as condições do local selecionado.';
    els.scoreBreakdown.textContent = 'Aguardando previsão.';
  }
}

function dayData(index) {
  const date = state.weather.daily.time[index];
  const official = officialTideDay(state.location, date);
  if (official) return official;
  const allPoints = marinePoints(state.marine.hourly);
  const points = allPoints.filter(p => p.time.startsWith(`${date}T`) && Number.isFinite(p.level));
  const events = findTideEvents(allPoints).filter(p => p.time.startsWith(`${date}T`));
  return { date, points, events };
}

function renderAll() {
  updateLocationLabel();
  const now = new Date();
  els.todayLabel.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
  renderDays();
  renderSelectedDay();
}

function renderDays() {
  els.dayStrip.innerHTML = state.weather.daily.time.map((date, index) => {
    const moon = moonInfo(date, state.weather.daily.moon_phase?.[index]);
    return `<button class="day-card ${index === state.selectedDay ? "active" : ""}" data-day="${index}" type="button" aria-pressed="${index === state.selectedDay}">
      <span>${index === 0 ? "Hoje" : formatDate(date, { weekday: "short" }).replace(".", "")}</span>
      <b>${formatDate(date, { day: "2-digit", month: "short" }).replace(" de ", " ")}</b>
      <small>${moon.illumination}% de lua</small>
    </button>`;
  }).join("");
  els.dayStrip.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.selectedDay = Number(button.dataset.day); renderDays(); renderSelectedDay();
  }));
}

function renderSelectedDay() {
  const index = state.selectedDay;
  const { date, points, events, official, available } = dayData(index);
  const wind = state.weather.daily.wind_speed_10m_max?.[index];
  const windSpeed = Number.isFinite(wind) ? Math.round(wind) : '—';
  const windDeg = state.weather.daily.wind_direction_10m_dominant?.[index];
  const moon = moonInfo(date, state.weather.daily.moon_phase?.[index]);
  els.tideSource.textContent = official
    ? available ? 'Horários e alturas: Marinha do Brasil / CHM, Porto de Cabedelo, tábua 2026. Fuso UTC−03. Alturas na referência local da tábua, não profundidade da água. A curva entre os extremos é interpolada e apenas ilustrativa.' : 'Tábua oficial de Cabedelo indisponível para esta data. A cobertura atual é de janeiro a dezembro de 2026; não substituímos por alturas de outra referência.'
    : `Curva estimada: Open-Meteo / modelo oceânico. Amostras horárias; picos aproximados. Fuso: ${state.marine.timezone || 'local da previsão'}. Alturas relativas ao nível médio global do mar, não ao zero da tábua oficial.`;
  els.tideReference.hidden = !isNearCabedelo(state.location);

  els.selectedDate.textContent = index === 0 ? official ? "Hoje · referência Cabedelo" : "Hoje, no seu ponto" : formatDate(date, { weekday: "long", day: "numeric", month: "long" });
  renderChart(points, events);
  renderEvents(events);
  renderWindows(events);
  els.windSpeed.textContent = windSpeed;
  els.windDirection.textContent = Number.isFinite(windDeg) ? `Vento de ${degreesToCompass(windDeg)} · ${Math.round(windDeg)}°` : 'Direção indisponível';
  els.windArrow.style.transform = `rotate(${Number.isFinite(windDeg) ? windDeg : 0}deg)`;
  els.moonName.textContent = moon.name;
  els.moonPercent.textContent = `${moon.illumination}%`;
  els.moonVisual.querySelector("span").style.opacity = Math.max(.28, moon.illumination / 100);
  renderSummary(conditionsSummary({ wind, windHours: hourlyDay(state.weather.hourly, 'wind_speed_10m', date), waves: hourlyDay(state.marine.hourly, 'wave_height', date), levels: official ? events.map(e => e.level) : points.map(p => p.level), events, rain: state.weather.daily.precipitation_probability_max?.[index], moon: moon.illumination }), date);
}

function renderChart(points, events) {
  if (!points.length) { els.tideChart.innerHTML = `<text x="380" y="120" text-anchor="middle" class="axis-label">Sem dados marítimos para este local</text>`; return; }
  const width = 760, height = 250, left = 42, right = 16, top = 25, bottom = 34;
  const values = points.map(p => p.level), min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const minutes = time => Number(time.slice(11, 13)) * 60 + Number(time.slice(14, 16));
  const xTime = time => left + minutes(time) / 1440 * (width - left - right);
  const x = i => xTime(points[i].time);
  const y = v => top + (max - v) / range * (height - top - bottom);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${height - bottom} L${x(0)},${height - bottom} Z`;
  const grid = [0, 1, 2, 3].map(i => {
    const yy = top + i * (height - top - bottom) / 3;
    const val = max - i * range / 3;
    return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" class="grid-line"/><text x="4" y="${yy+4}" class="axis-label">${val.toFixed(2)}m</text>`;
  }).join("");
  const hours = [0, 4, 8, 12, 16, 20].map(hour => {
    return `<text x="${left + hour / 24 * (width - left - right)}" y="${height-8}" text-anchor="middle" class="axis-label">${String(hour).padStart(2, '0')}:00</text>`;
  }).join("");
  const markers = events.map(event => {
    const xx = xTime(event.time), yy = y(event.level);
    return `<circle cx="${xx}" cy="${yy}" r="5" class="event-point ${event.type}"/><text x="${xx}" y="${event.type === "high" ? yy-12 : yy+20}" text-anchor="middle" class="event-label">${event.hour}</text>`;
  }).join("");
  els.tideChart.innerHTML = `<defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4de1c1" stop-opacity=".24"/><stop offset="1" stop-color="#4de1c1" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" class="tide-area"/><path d="${path}" class="tide-line"/>${markers}${hours}`;
}

function renderEvents(events) {
  if (!events.length) { els.tideEvents.innerHTML = `<p class="chart-note">Os extremos de maré não foram identificados nesta previsão.</p>`; return; }
  els.tideEvents.innerHTML = events.slice(0, 4).map(event => `<div class="tide-event ${event.type}"><span>${event.type === "high" ? "MARÉ ALTA" : "MARÉ BAIXA"}</span><strong>${event.hour}</strong><small>${event.level.toFixed(2)} m</small></div>`).join("");
}

function renderWindows(events) {
  const highs = events.filter(e => e.type === "high").slice(0, 2);
  if (!highs.length) { els.fishingWindows.innerHTML = `<div class="window-card"><span class="window-label">SEM JANELA CALCULADA</span><strong>Dados insuficientes</strong><small>Tente outro dia ou um ponto mais próximo da costa.</small></div>`; return; }
  els.fishingWindows.innerHTML = highs.map((event, i) => {
    const window = fishingWindow(event);
    const dates = window.previousDay ? `<small class="window-dates">Início em ${formatDate(window.startDate, { day: '2-digit', month: '2-digit' })} (dia anterior); fim em ${formatDate(window.endDate, { day: '2-digit', month: '2-digit' })}.</small>` : '';
    return `<div class="window-card"><span class="window-label">${i === 0 ? "PRIMEIRA JANELA" : "SEGUNDA JANELA"} SUGERIDA</span><strong>${window.startHour} — ${window.endHour}</strong>${dates}<small>${event.official ? 'Alta prevista na tábua de Cabedelo' : 'Alta estimada'} de ${event.level.toFixed(2)} m às ${event.hour}. ${event.official ? 'Referência: Marinha do Brasil.' : 'Horários aproximados.'}</small><span class="wave-lines" aria-hidden="true">≈≈</span></div>`;
  }).join("");
}

function renderSummary(summary, date) {
  els.summaryTitle.textContent = summary.headline;
  els.summaryDate.textContent = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  els.summaryCards.replaceChildren();
  for (const item of summary.cards) {
    const card = document.createElement('article'); card.className = `summary-item${item.warning ? ' summary-warning' : ''}`;
    const title = document.createElement('h3'); title.textContent = `${item.title}${item.warning ? ' · Atenção' : ''}`;
    const text = document.createElement('p'); text.textContent = item.text;
    card.append(title, text); els.summaryCards.append(card);
  }
  els.scoreValue.textContent = summary.score ?? '—';
  els.scoreLabel.textContent = summary.label;
  els.scoreBar.style.width = `${summary.score ?? 0}%`;
  els.scoreNote.textContent = summary.note;
  els.scoreBreakdown.textContent = summary.breakdown.length ? `Neste dia: ${summary.breakdown.map(p => `${p.name} ${p.points.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/${p.max}`).join(' · ')}. Soma arredondada: ${summary.score}/100.` : 'Nota indisponível: faltam dados de vento, ondas, maré ou chuva.';
}

function renderUnavailable() {
  els.tideSource.textContent = 'Sem previsão marítima carregada.'; els.tideReference.hidden = !isNearCabedelo(state.location);
  els.summaryTitle.textContent = 'Resumo indisponível'; els.summaryDate.textContent = ''; els.summaryCards.replaceChildren();
  els.scoreLabel.textContent = 'Sem dados'; els.scoreValue.textContent = '—'; els.scoreBar.style.width = '0%';
  els.scoreNote.textContent = 'Tente atualizar a previsão novamente.'; els.scoreBreakdown.textContent = 'Sem dados para calcular a nota.';
  els.windSpeed.textContent = '—'; els.windDirection.textContent = 'Direção indisponível'; els.moonName.textContent = '—'; els.moonPercent.textContent = '—';
  els.dayStrip.innerHTML = `<div class="day-card"><span>SEM DADOS</span><b>Previsão indisponível</b><small>Tente novamente</small></div>`;
  els.tideChart.innerHTML = `<text x="380" y="120" text-anchor="middle" class="axis-label">Não foi possível carregar a curva de maré</text>`;
  els.tideEvents.innerHTML = ""; els.fishingWindows.innerHTML = "";
}

async function searchLocations(term) {
  els.searchResults.innerHTML = `<p class="location-note">Buscando...</p>`;
  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=6&language=pt&format=json`);
    const results = data.results || [];
    els.searchResults.innerHTML = results.length ? results.map((item, index) => `<button type="button" class="result-button" data-result="${index}" role="option"><span><strong>${item.name}</strong><br><small>${[item.admin1, item.country].filter(Boolean).join(", ")}</small></span><span aria-hidden="true">＋</span></button>`).join("") : `<p class="location-note">Nenhum local encontrado. Tente uma cidade próxima.</p>`;
    els.searchResults.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectLocation(results[Number(button.dataset.result)])));
  } catch { els.searchResults.innerHTML = `<p class="location-note">A busca falhou. Tente novamente em instantes.</p>`; }
}

function selectLocation(location) {
  saveLocation(location); closeLocationPanel(); els.searchResults.innerHTML = ""; els.locationSearch.value = ""; loadForecast();
}

function closeLocationPanel() { els.locationPanel.hidden = true; els.locationButton.setAttribute("aria-expanded", "false"); }

els.locationButton.addEventListener("click", () => {
  const willOpen = els.locationPanel.hidden; els.locationPanel.hidden = !willOpen; els.locationButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) setTimeout(() => els.locationSearch.focus(), 0);
});
document.addEventListener("click", event => { if (!event.target.closest(".location-wrap")) closeLocationPanel(); });
els.searchForm.addEventListener("submit", event => { event.preventDefault(); const term = els.locationSearch.value.trim(); if (term.length >= 2) searchLocations(term); });
els.useGps.addEventListener("click", () => {
  if (!navigator.geolocation) return;
  els.useGps.textContent = "Localizando...";
  navigator.geolocation.getCurrentPosition(
    position => { els.useGps.textContent = "Usar minha localização atual"; selectLocation({ name: "Minha localização", admin1: "GPS", latitude: position.coords.latitude, longitude: position.coords.longitude, country_code: "BR" }); },
    () => { els.useGps.textContent = "Não foi possível acessar sua localização"; setTimeout(() => els.useGps.textContent = "Usar minha localização atual", 2500); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});
els.retryButton.addEventListener("click", loadForecast);

function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const selectSchema = { type: "object", properties: { name: { type: "string" }, latitude: { type: "number" }, longitude: { type: "number" } }, required: ["name", "latitude", "longitude"], additionalProperties: false };
  try {
    context.registerTool({
      name: "save_fishing_location", title: "Salvar local de pesca", description: "Salva uma localização por nome e coordenadas e atualiza a previsão visível.", inputSchema: selectSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) { if (!input || typeof input.name !== "string" || !Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) throw new Error("Localização inválida"); saveLocation({ ...input, admin1: "Local salvo" }); await loadForecast(); return { saved: true, location: input.name }; }
    });
    context.registerTool({
      name: "read_fishing_conditions", title: "Consultar condições de pesca", description: "Retorna um resumo das condições exibidas para o dia selecionado.", inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() { return { location: els.locationName.textContent, date: els.selectedDate.textContent, wind: `${els.windSpeed.textContent} km/h`, moon: `${els.moonName.textContent} — ${els.moonPercent.textContent}`, condition: els.scoreLabel.textContent, score: els.scoreValue.textContent }; }
    });
  } catch { /* Navegadores sem suporte simplesmente ignoram WebMCP. */ }
}

updateLocationLabel(); registerWebMcp(); loadForecast();
