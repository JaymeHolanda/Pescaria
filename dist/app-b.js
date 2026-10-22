import { conditionsSummary, hourlyDay } from './conditions.js?v=e2046439115a';
import { marinePoints, findTideEvents, fishingWindow, isNearCabedelo, officialTideDay } from './tides.js?v=b51d6bc911fb';
import { renderMarinePanel, clearMarinePanel, windowMarineSummary } from './marine-b.js?v=9cbb9724b8d9';
import { clearPreview, renderPreview, forecastDays, PRESET_SPOTS, solunarPeriods, checkSolunarSync, buildHarborTideDay, fetchBrazilianHarborTides } from './preview-b.js?v=f01f01a72671';

const DEFAULT_LOCATION = { name: "João Pessoa", admin1: "Paraíba", country_code: "BR", latitude: -7.115, longitude: -34.8631 };
const state = { location: loadLocation(), favorites: loadFavorites(), weather: null, marine: null, brazilTides: null, selectedDay: 0, aborter: null };

const $ = (selector) => document.querySelector(selector);
const els = {
  locationButton: $("#locationButton"), locationPanel: $("#locationPanel"), locationName: $("#locationName"),
  searchForm: $("#searchForm"), locationSearch: $("#locationSearch"), searchResults: $("#searchResults"), useGps: $("#useGps"),
  spotQuickBar: $("#spotQuickBar"), favLocationBtn: $("#favLocationBtn"), livePill: $(".live-pill"),
  dayStrip: $("#dayStrip"), dashboard: $("#dashboard"), selectedDate: $("#selectedDate"), tideChart: $("#tideChart"),
  tideEvents: $("#tideEvents"), fishingWindows: $("#fishingWindows"), moonName: $("#moonName"), moonPercent: $("#moonPercent"),
  moonVisual: $("#moonVisual"), windSpeed: $("#windSpeed"), windDirection: $("#windDirection"), windArrow: $("#windArrow"),
  uvStrip: $(".uv-strip"), uvContext: $("#uvContext"), uvIndex: $("#uvIndex"), uvLevel: $("#uvLevel"), dayTemperature: $("#dayTemperature"),
  summaryTitle: $("#summaryTitle"), summaryDate: $("#summaryDate"), summaryCards: $("#summaryCards"),
  tideSource: $("#tideSource"),
  dataStatus: $("#dataStatus"), todayLabel: $("#todayLabel"), errorBox: $("#errorBox"), errorMessage: $("#errorMessage"), retryButton: $("#retryButton")
};

function loadLocation() {
  try { return JSON.parse(localStorage.getItem("mare-certa-location")) || DEFAULT_LOCATION; }
  catch { return DEFAULT_LOCATION; }
}

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem("mare-certa-favorites")) || []; }
  catch { return []; }
}

function isSameSpot(a, b) {
  if (!a || !b) return false;
  return Math.abs(Number(a.latitude) - Number(b.latitude)) < 0.015 && Math.abs(Number(a.longitude) - Number(b.longitude)) < 0.015;
}

function toggleFavoriteCurrentLocation() {
  const current = state.location;
  const exists = state.favorites.some(f => isSameSpot(f, current));
  if (exists) {
    state.favorites = state.favorites.filter(f => !isSameSpot(f, current));
  } else {
    state.favorites = [{ name: current.name, admin1: current.admin1 || "", country_code: current.country_code || "BR", latitude: current.latitude, longitude: current.longitude }, ...state.favorites].slice(0, 6);
  }
  try { localStorage.setItem("mare-certa-favorites", JSON.stringify(state.favorites)); } catch {}
  renderSpotQuickBar();
}

function renderSpotQuickBar() {
  if (!els.spotQuickBar) return;
  const combined = [...state.favorites.map(f => ({ ...f, isFav: true }))];
  for (const preset of PRESET_SPOTS) {
    if (!combined.some(item => isSameSpot(item, preset))) {
      combined.push(preset);
    }
  }
  const isCurrentFav = state.favorites.some(f => isSameSpot(f, state.location));
  if (els.favLocationBtn) {
    els.favLocationBtn.setAttribute("aria-pressed", String(isCurrentFav));
    els.favLocationBtn.textContent = isCurrentFav ? "★ Favorito salvo" : "☆ Favoritar praia";
  }

  els.spotQuickBar.innerHTML = combined.map((spot, idx) => {
    const active = isSameSpot(spot, state.location);
    return `<button type="button" class="spot-pill ${active ? "active" : ""}" data-spot-index="${idx}" aria-pressed="${active}">
      ${spot.isFav ? '<span class="spot-star" aria-hidden="true">★</span>' : '<span class="spot-pin" aria-hidden="true">⚓</span>'}
      <span>${spot.name}</span>
    </button>`;
  }).join("");

  els.spotQuickBar.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const chosen = combined[Number(btn.dataset.spotIndex)];
      if (chosen) selectLocation(chosen);
    });
  });
}

function saveLocation(location) {
  state.location = location;
  try { localStorage.setItem("mare-certa-location", JSON.stringify(location)); } catch {}
  updateLocationLabel();
  renderSpotQuickBar();
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
  if (phase < .0625 || phase >= .9375) name = "Lua nova";
  else if (phase < .1875) name = "Crescente côncava";
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

function cacheKey(loc) {
  return `mare-certa-cache:${Number(loc.latitude).toFixed(2)},${Number(loc.longitude).toFixed(2)}`;
}

function saveForecastCache(loc, weather, marine, brazilTides = null) {
  try {
    localStorage.setItem(cacheKey(loc), JSON.stringify({ weather, marine, brazilTides, timestamp: Date.now() }));
  } catch {}
}

function loadForecastCache(loc) {
  try {
    const raw = localStorage.getItem(cacheKey(loc));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function loadForecast() {
  if (state.aborter) state.aborter.abort();
  state.aborter = new AbortController();
  const { latitude, longitude } = state.location;
  const common = `latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=7`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${common}&past_days=1&wind_speed_unit=kmh&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation_probability,precipitation,weather_code&current=wind_speed_10m,wind_direction_10m&daily=moon_phase,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_probability_max,uv_index_max,temperature_2m_min,temperature_2m_max`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&timezone=auto&past_days=1&forecast_days=8&hourly=sea_level_height_msl,wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,sea_surface_temperature&cell_selection=sea`;

  setLoading(true);
  try {
    const [weather, marine] = await Promise.all([
      fetchJson(weatherUrl, state.aborter.signal),
      fetchJson(marineUrl, state.aborter.signal)
    ]);
    state.weather = forecastDays(weather);
    state.marine = marine;
    state.brazilTides = null;
    // Keep João Pessoa / Cabedelo strictly on the local embedded table; for other locations (RJ, SP, PE, etc.) query API Tábua de Marés
    if (!isNearCabedelo(state.location)) {
      try {
        state.brazilTides = await fetchBrazilianHarborTides(state.location, state.weather.daily.time, state.aborter.signal);
      } catch (tideErr) {
        if (tideErr?.name === "AbortError") throw tideErr;
        state.brazilTides = null;
      }
    }
    saveForecastCache(state.location, weather, marine, state.brazilTides);
    state.selectedDay = 0;
    els.dataStatus.textContent = `Atualizada às ${new Intl.DateTimeFormat('pt-BR', { timeZone: weather.timezone || 'America/Fortaleza', hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    if (els.livePill) {
      els.livePill.innerHTML = `<span></span> Previsão atualizada`;
      els.livePill.dataset.offline = "false";
    }
    els.errorBox.hidden = true;
    renderAll();
  } catch (error) {
    if (error.name === "AbortError") return;
    const cached = loadForecastCache(state.location);
    if (cached?.weather && cached?.marine) {
      state.weather = forecastDays(cached.weather);
      state.marine = cached.marine;
      state.brazilTides = cached.brazilTides || null;
      state.selectedDay = 0;
      const savedTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(cached.timestamp));
      els.dataStatus.textContent = `Modo Offline · Dados salvos em ${savedTime}`;
      if (els.livePill) {
        els.livePill.innerHTML = `<span></span> Modo Offline (Cache)`;
        els.livePill.dataset.offline = "true";
      }
      els.errorBox.hidden = true;
      renderAll();
      return;
    }
    state.weather = null; state.marine = null; state.brazilTides = null;
    els.errorMessage.textContent = error.message || "Confira sua conexão e tente novamente.";
    els.errorBox.hidden = false;
    els.dataStatus.textContent = "Atualização pendente";
    renderUnavailable();
  } finally { setLoading(false); }
}

function setLoading(loading) {
  els.dashboard.setAttribute("aria-busy", String(loading));
  els.locationButton.disabled = loading;
  els.dayStrip.querySelectorAll("button").forEach(button => { button.disabled = loading; });
  if (loading) {
    clearPreview(true);
    clearMarinePanel(true);
    els.summaryTitle.textContent = 'Atualizando o resumo…';
    els.summaryCards.replaceChildren();
    els.summaryDate.textContent = '';
  }
}

function dayData(index) {
  const date = state.weather.daily.time[index];
  const official = officialTideDay(state.location, date);
  if (official) return official;
  if (state.brazilTides) {
    const harborDay = buildHarborTideDay(state.brazilTides, date);
    if (harborDay) return harborDay;
  }
  const allPoints = marinePoints(state.marine.hourly);
  const points = allPoints.filter(p => p.time.startsWith(`${date}T`) && Number.isFinite(p.level));
  const events = findTideEvents(allPoints).filter(p => p.time.startsWith(`${date}T`));
  return { date, points, events };
}

function renderAll() {
  updateLocationLabel();
  renderSpotQuickBar();
  const now = new Date();
  els.todayLabel.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: state.weather.timezone || "America/Fortaleza" }).format(now);
  renderDays();
  renderSelectedDay();
}

function renderDays() {
  els.dayStrip.innerHTML = state.weather.daily.time.map((date, index) => {
    const moon = moonInfo(date, state.weather.daily.moon_phase?.[index]);
    const tMax = state.weather.daily.temperature_2m_max?.[index];
    const tempBadge = Number.isFinite(tMax) ? ` · ${Math.round(tMax)}°` : '';
    return `<button class="day-card ${index === state.selectedDay ? "active" : ""}" data-day="${index}" type="button" aria-pressed="${index === state.selectedDay}">
      <span>${index === 0 ? "Hoje" : formatDate(date, { weekday: "short" }).replace(".", "")}</span>
      <b>${formatDate(date, { day: "2-digit", month: "short" }).replace(" de ", " ")}${tempBadge}</b>
      <small>🌙 ${moon.illumination}% lua</small>
    </button>`;
  }).join("");
  els.dayStrip.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.selectedDay = Number(button.dataset.day); renderDays(); renderSelectedDay();
  }));
}

function renderSelectedDay() {
  const index = state.selectedDay;
  const { date, points, events, official, brazilApi, available, harborName, institution } = dayData(index);
  const wind = state.weather.daily.wind_speed_10m_max?.[index];
  const windSpeed = Number.isFinite(wind) ? Math.round(wind) : '—';
  const windDeg = state.weather.daily.wind_direction_10m_dominant?.[index];
  const uvIndex = state.weather.daily.uv_index_max?.[index];
  const temperatureMin = state.weather.daily.temperature_2m_min?.[index];
  const temperatureMax = state.weather.daily.temperature_2m_max?.[index];
  const moon = moonInfo(date, state.weather.daily.moon_phase?.[index]);
  els.tideSource.textContent = official
    ? available ? 'Horários e alturas: Marinha do Brasil / CHM, Porto de Cabedelo, tábua 2026. Fuso UTC−03. Alturas na referência local da tábua, não profundidade da água. A curva entre os extremos é interpolada e apenas ilustrativa.' : 'Tábua oficial de Cabedelo indisponível para esta data. A cobertura atual é de janeiro a dezembro de 2026; não substituímos por alturas de outra referência.'
    : brazilApi
      ? `Horários e alturas: API Tábua de Marés (tabuamare.api.br) · ${institution || 'CHM / Marinha do Brasil'} — ${harborName}. Alturas na referência local do porto. A curva entre os extremos é interpolada e ilustrativa.`
      : `Curva estimada: Open-Meteo / modelo oceânico. Amostras horárias; picos aproximados. Fuso: ${state.marine.timezone || 'local da previsão'}. Alturas relativas ao nível médio global do mar, não ao zero da tábua oficial.`;

  const shortHarbor = state.brazilTides?.matchedHarbor?.name || harborName || "porto oficial";
  els.selectedDate.textContent = index === 0
    ? official
      ? "Hoje · referência Cabedelo"
      : brazilApi
        ? `Hoje · ${shortHarbor}`
        : "Hoje, no seu ponto"
    : formatDate(date, { weekday: "long", day: "numeric", month: "long" });
  renderChart(points, events);
  renderEvents(events);
  renderWindows(events, moon, date);
  renderMarinePanel({ date, events, weather: state.weather, marine: state.marine });
  els.windSpeed.textContent = windSpeed;
  els.windDirection.textContent = Number.isFinite(windDeg) ? `Vento de ${degreesToCompass(windDeg)} · ${Math.round(windDeg)}°` : 'Direção indisponível';
  els.windArrow.style.transform = `rotate(${Number.isFinite(windDeg) ? windDeg : 0}deg)`;
  els.uvIndex.textContent = Number.isFinite(uvIndex) ? uvIndex.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—';
  els.uvContext.textContent = formatDate(date, { day: '2-digit', month: '2-digit' }) + ' · ' + els.locationName.textContent;
  els.uvLevel.textContent = !Number.isFinite(uvIndex) ? 'Indisponível' : uvIndex < 3 ? 'Baixo' : uvIndex < 6 ? 'Moderado' : uvIndex < 8 ? 'Alto' : uvIndex < 11 ? 'Muito alto' : 'Extremo';
  if (els.uvStrip) {
    els.uvStrip.dataset.tone = !Number.isFinite(uvIndex) ? 'unknown' : uvIndex < 3 ? 'low' : uvIndex < 6 ? 'moderate' : uvIndex < 8 ? 'high' : uvIndex < 11 ? 'very-high' : 'extreme';
  }
  els.dayTemperature.textContent = Number.isFinite(temperatureMin) && Number.isFinite(temperatureMax)
    ? `Mín. ${Math.round(temperatureMin)} °C · Máx. ${Math.round(temperatureMax)} °C`
    : 'Indisponível';
  els.moonName.textContent = moon.name;
  els.moonPercent.textContent = `${moon.illumination}%`;
  els.moonVisual.querySelector("span").style.opacity = Math.max(.28, moon.illumination / 100);
  renderSummary(conditionsSummary({ wind, windHours: hourlyDay(state.weather.hourly, 'wind_speed_10m', date), waves: hourlyDay(state.marine.hourly, 'wave_height', date), levels: (official || brazilApi) ? events.map(e => e.level) : points.map(p => p.level), events, rain: state.weather.daily.precipitation_probability_max?.[index], rainHours: hourlyDay(state.weather.hourly, 'precipitation_probability', date), moon: moon.illumination }), date);
  renderPreview({
    date,
    points,
    events,
    weather: state.weather,
    marine: state.marine,
    location: state.location,
    selectedDay: index,
    allDays: state.weather.daily.time.map((_, i) => dayData(i)),
    selectDate: targetDate => {
      const nextIndex = state.weather.daily.time.indexOf(targetDate);
      if (nextIndex >= 0) {
        state.selectedDay = nextIndex;
        renderDays();
        renderSelectedDay();
      }
    }
  });
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
    return `<circle cx="${xx}" cy="${yy}" r="5.5" class="event-point ${event.type}"/><text x="${xx}" y="${event.type === "high" ? yy-12 : yy+20}" text-anchor="middle" class="event-label">${event.hour} (${event.level.toFixed(1)}m)</text>`;
  }).join("");
  els.tideChart.innerHTML = `<defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4de1c1" stop-opacity=".32"/><stop offset="1" stop-color="#4de1c1" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" class="tide-area"/><path d="${path}" class="tide-line"/>${markers}${hours}`;
}

function renderEvents(events) {
  if (!events.length) { els.tideEvents.innerHTML = `<p class="chart-note">Os extremos de maré não foram identificados nesta previsão.</p>`; return; }
  els.tideEvents.innerHTML = events.slice(0, 4).map(event => `<div class="tide-event ${event.type}"><span>${event.type === "high" ? "▲ MARÉ ALTA" : "▼ MARÉ BAIXA"}</span><strong>${event.hour}</strong><small>${event.level.toFixed(2)} m</small></div>`).join("");
}

function renderWindows(events, moon, date) {
  const springTide = moon.name === 'Lua nova' || moon.name === 'Lua cheia';
  const springBadge = springTide ? '<span class="spring-tide-badge">' + moon.name + ' · Marés de sizígia</span><p class="spring-tide-note">Período associado a maior amplitude entre maré alta e baixa.</p>' : '';
  const highs = events.filter(e => e.type === "high").slice(0, 2);
  if (!highs.length) { els.fishingWindows.innerHTML = `<div class="window-card"><span class="window-label">SEM JANELA CALCULADA</span><strong>Dados insuficientes</strong><small>Tente outro dia ou um ponto mais próximo da costa.</small></div>`; return; }
  const solunar = solunarPeriods(date, moon.phase, state.location?.longitude ?? -34.8631);
  els.fishingWindows.innerHTML = highs.map((event, i) => {
    const window = fishingWindow(event);
    const wind = windowMarineSummary(window, state.weather.hourly, state.marine.hourly).values.wind_speed_10m;
    const windMean = Number.isFinite(wind) ? wind.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km/h' : 'Indisponível';
    const sync = checkSolunarSync(window, solunar);
    const syncHtml = sync ? `<span class="window-solunar-chip">⚡ ${sync.badge}</span>` : '';
    const peakNote = Number.isFinite(event.level) ? `<small class="window-peak-note">Preamar prevista: ${event.level.toFixed(2).replace('.', ',')} m às ${event.hour}</small>` : '';
    return `<div class="window-card ${springTide ? 'spring-tide-window' : ''}">${springBadge}${syncHtml}<span class="window-label">${i === 0 ? "PRIMEIRA JANELA" : "SEGUNDA JANELA"} SUGERIDA</span><strong>${window.startHour} — ${window.endHour}</strong>${peakNote}<p class="window-wind"><span aria-hidden="true">↗</span> Vento médio <b>${windMean}</b></p><span class="wave-lines" aria-hidden="true">≈≈</span></div>`;
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
}

function renderUnavailable() {
  clearPreview();
  clearMarinePanel();
  els.tideSource.textContent = 'Sem previsão marítima carregada.';
  els.summaryTitle.textContent = 'Resumo indisponível'; els.summaryDate.textContent = ''; els.summaryCards.replaceChildren();
  els.windSpeed.textContent = '—'; els.windDirection.textContent = 'Direção indisponível'; els.moonName.textContent = '—'; els.moonPercent.textContent = '—';
  els.uvContext.textContent = els.locationName.textContent; els.uvIndex.textContent = '—'; els.uvLevel.textContent = 'Índice indisponível'; els.dayTemperature.textContent = 'Indisponível';
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
if (els.favLocationBtn) {
  els.favLocationBtn.addEventListener("click", toggleFavoriteCurrentLocation);
}
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
      execute() { return { location: els.locationName.textContent, date: els.selectedDate.textContent, wind: `${els.windSpeed.textContent} km/h`, moon: `${els.moonName.textContent} — ${els.moonPercent.textContent}`, maritime: state.weather && !$('#marineContent').hidden ? { date: state.weather.daily.time[state.selectedDay], aggregation: 'média da janela selecionada', window: document.querySelector('#marineWindowTabs [aria-selected="true"]')?.textContent || null, condition: $('#marineRatingLabel').textContent, score: $('#marineGaugeValue').textContent } : null }; }
    });
  } catch { /* Navegadores sem suporte simplesmente ignoram WebMCP. */ }
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

updateLocationLabel(); renderSpotQuickBar(); registerWebMcp(); loadForecast();
