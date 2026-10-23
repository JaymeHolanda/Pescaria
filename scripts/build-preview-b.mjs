import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const read = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const protectedFiles = ['src/preview-b/base-a.html', 'src/preview-b/base-b.html', 'dist/styles.css', 'src/ranking.js', 'src/marine-view.js'];
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const originals = new Map(protectedFiles.map(file => [file, hash(file)]));
const replace = (text, from, to) => { if (!text.includes(from)) throw new Error(`Trecho não encontrado: ${from.slice(0, 80)}`); return text.replace(from, to); };

const baseAHtml = read('src/preview-b/base-a.html');
const baseHtml = read('src/preview-b/base-b.html');
let html = baseHtml;

html = replace(html, '<link rel="stylesheet" href="./styles.css" />', '<link rel="manifest" href="./manifest.webmanifest" />\n    <link rel="stylesheet" href="./styles.css" />\n    <link rel="stylesheet" href="./versao-b.css" />');
html = replace(html, '<title>Maré Certa — planeje sua pescaria</title>', '<title>Maré Certa — sua próxima pescaria</title>');
html = replace(html, '<body>', '<body class="preview-b">');
html = replace(html, '<link rel="preconnect" href="https://geocoding-api.open-meteo.com" />', '<link rel="preconnect" href="https://geocoding-api.open-meteo.com" />\n    <link rel="preconnect" href="https://api.inaturalist.org" />\n    <link rel="preconnect" href="https://inaturalist-open-data.s3.amazonaws.com" />');

// Aba própria para espécies, entre "Dicas de pesca" e "Ranking"
html = replace(html, '<button id="tipsTab" role="tab" aria-controls="tipsPanel" aria-selected="false" tabindex="-1" type="button">Dicas de pesca</button>', '<button id="tipsTab" role="tab" aria-controls="tipsPanel" aria-selected="false" tabindex="-1" type="button">Dicas de pesca</button>\n        <button id="speciesTab" role="tab" aria-controls="speciesPanel" aria-selected="false" tabindex="-1" type="button">Espécies</button>');

// Quick Spot Bar right below topbar
html = replace(html, '<nav class="view-tabs"', `<div class="spot-quick-strip" aria-label="Praias e pontos rápidos">
        <div class="spot-strip-label"><span aria-hidden="true">🧭</span><span>PRAIAS & PONTOS</span></div>
        <div id="spotQuickBar" class="spot-quick-bar" role="group" aria-label="Atalhos de praias"></div>
        <button id="favLocationBtn" class="fav-spot-btn" type="button" aria-pressed="false">☆ Favoritar praia</button>
      </div>

      <nav class="view-tabs"`);

// Upgraded Hero + Next Window with Progress Bar, Solunar Sync Badge, and Alert Reminder Button
html = html.replace(/<section class="intro" aria-labelledby="pageTitle">[\s\S]*?<\/section>/, `<section class="intro b-intro" aria-labelledby="pageTitle">
          <div class="b-hero-copy">
            <div class="b-eyebrow-row"><p class="eyebrow">AO RITMO DO MAR · SURFCASTING</p><span class="b-pro-pill">EDIÇÃO PRO</span></div>
            <h1 id="pageTitle">Seu próximo encontro<br><em>com o mar.</em></h1>
            <p class="b-intro-note">Tábua de maré oficial, períodos solunares, recomendação dinâmica de equipamento e diário de capturas em tempo real.</p>
            <div class="today-line"><span id="todayLabel">Hoje</span><span id="dataStatus">Buscando dados…</span></div>
          </div>
          <article id="nextWindow" class="b-next-window" aria-labelledby="nextWindowTitle" aria-busy="true">
            <div class="b-next-top"><span class="b-status-dot"></span><span>SEU PRÓXIMO HORÁRIO</span><svg viewBox="0 0 64 32" aria-hidden="true"><path d="M2 18 Q16 0 30 18 T60 18 M2 27 Q16 9 30 27 T60 27"/></svg></div>
            <h2 id="nextWindowTitle">Buscando sua próxima janela</h2>
            <strong id="nextWindowHours">—</strong>
            <p id="nextWindowDate">Consultando os horários de maré…</p>
            <span id="nextWindowSyncBadge" class="b-sync-badge" hidden></span>
            <div id="nextWindowProgressWrap" class="b-window-progress" hidden>
              <div class="b-progress-track"><span id="nextWindowProgressBar" style="width:0%"></span></div>
              <small id="nextWindowProgressText"></small>
            </div>
            <div class="b-next-bottom">
              <span id="nextWindowCountdown">Atualizando…</span>
              <div class="b-next-actions">
                <button id="windowAlertBtn" class="b-alert-btn" type="button" aria-pressed="false">🔔 Lembrar janela</button>
                <a id="nextWindowLink" href="#windowsB" aria-label="Ver janelas da próxima maré alta">Ver janela <span aria-hidden="true">↘</span></a>
              </div>
            </div>
          </article>
        </section>`);

const summary = html.match(/<section class="daily-summary card"[\s\S]*?<\/section>/)?.[0];
const windows = html.match(/<section class="window-section"[\s\S]*?<\/section>/)?.[0];
if (!summary || !windows) throw new Error('Seções de previsão não encontradas.');
html = html.replace(summary, '').replace(windows, '');

// Solunar & Smart Tackle Advisor Section right after windowsB
const solunarTackleHtml = `<section id="solunarTackleSection" class="b-intel-grid" aria-label="Atividade Solunar e Consultor de Equipamento">
          <article class="card b-intel-card" aria-labelledby="solunarTitle">
            <div class="card-heading">
              <div><p class="eyebrow">TABELA SOLUNAR · FASES & TRÂNSITO</p><h2 id="solunarTitle">Períodos de atividade.</h2></div>
            </div>
            <p class="b-intel-sub">Períodos Maiores (trânsito lunar) e Menores (nascer/pôr da lua). Quando coincidem com a janela da maré alta, formam a Hora de Ouro.</p>
            <div id="solunarPanelContent" class="solunar-body"><p class="empty-note">Calculando tabela solunar…</p></div>
          </article>
          <article class="card b-intel-card" aria-labelledby="tackleTitle">
            <div class="card-heading">
              <div><p class="eyebrow">CONSULTOR DE PRAIA · SURFCASTING</p><h2 id="tackleTitle">Equipamento sugerido.</h2></div>
            </div>
            <p class="b-intel-sub">Recomendação automática de chumbada, chicote e linha calculada a partir da altura das ondas, período e vento previstos para o dia.</p>
            <div id="tackleAdvisorContent" class="tackle-body"><p class="empty-note">Avaliando condições do mar…</p></div>
          </article>
        </section>`;

html = replace(html, '<section class="dashboard"', windows.replace('<section class="window-section"', '<section id="windowsB" class="window-section"') + '\n\n        ' + solunarTackleHtml + '\n\n        <section class="dashboard"');
html = replace(html, '<section id="marinePanel"', summary + '\n\n        <section id="marinePanel"');
html = replace(html, '<div class="legend"><span class="dot high"></span> Alta <span class="dot low"></span> Baixa</div>', '<div class="legend"><span id="tideAmplitudeBadge" class="amplitude-badge" hidden></span><span class="dot high"></span> Alta <span class="dot low"></span> Baixa</div>');
html = html.replace(/(<svg id="tideChart"[^>]*><\/svg>)/, '$1\n              <div id="chartTooltip" class="b-chart-tooltip" hidden></div>');
html = replace(html, '<div class="tide-events"', `<div id="chartTools" class="b-chart-tools" hidden><div class="b-chart-readout"><label for="chartScrub">Explore a maré hora a hora</label><output id="chartReadout" for="chartScrub">—</output></div><input id="chartScrub" type="range" min="0" max="1" value="0" step="1" aria-label="Horário na curva de maré"><div class="b-chart-legend"><span><i></i> Janelas sugeridas (3h antes da alta)</span><span><i class="solunar-bar-icon"></i> Período Solunar Maior</span><span>Toque na curva ou deslize</span></div></div>\n            <div class="tide-events"`);

// Interactive Species & Bait Catalog in its own #speciesPanel (filtered by the coastal region of the chosen spot)
const speciesCatalogHtml = `
        <section id="speciesCatalogSection" class="species-catalog-section" aria-labelledby="speciesCatalogTitle">
          <div class="species-catalog-header card">
            <div class="species-header-top">
              <div>
                <p class="eyebrow">GUIA DE CAMPO · <span id="speciesRegionEyebrow">LITORAL BRASILEIRO</span></p>
                <h2 id="speciesCatalogTitle">Catálogo de espécies, iscas e montagens.</h2>
                <p id="speciesRegionNote" class="species-region-note">Mostrando espécies do litoral brasileiro.</p>
              </div>
              <span id="speciesCatalogCount" class="ranking-count">Carregando espécies…</span>
            </div>
            <div class="species-filters-bar">
              <div class="species-filter-group species-region-group" role="group" aria-label="Filtrar por região do litoral">
                <button type="button" data-region-filter="auto" aria-pressed="true"><span aria-hidden="true">📍</span> <span id="speciesAutoRegionLabel">Sua região</span></button>
                <button type="button" data-region-filter="norte" aria-pressed="false">Norte</button>
                <button type="button" data-region-filter="nordeste" aria-pressed="false">Nordeste</button>
                <button type="button" data-region-filter="sudeste" aria-pressed="false">Sudeste</button>
                <button type="button" data-region-filter="sul" aria-pressed="false">Sul</button>
                <button type="button" data-region-filter="all" aria-pressed="false">Todo o litoral</button>
              </div>
              <label class="species-search-wrap">
                <span class="sr-only">Buscar espécie ou isca</span>
                <input id="speciesSearchInput" type="search" placeholder="Buscar peixe, isca ou dica (ex.: pampo, corrupto, valão)…" autocomplete="off" />
              </label>
              <div class="species-filter-group" role="group" aria-label="Filtrar por zona da praia">
                <button type="button" data-zone-filter="all" aria-pressed="true">Todas as zonas</button>
                <button type="button" data-zone-filter="beira" aria-pressed="false">Beira & 1º Valão</button>
                <button type="button" data-zone-filter="canais" aria-pressed="false">Canais & Poços</button>
                <button type="button" data-zone-filter="fundo" aria-pressed="false">2º Valão & Fundo</button>
                <button type="button" data-zone-filter="estruturas" aria-pressed="false">Estuários & Pedras</button>
              </div>
              <div class="species-filter-group" role="group" aria-label="Filtrar por isca">
                <button type="button" data-bait-filter="all" aria-pressed="true">Todas as iscas</button>
                <button type="button" data-bait-filter="Camarão" aria-pressed="false">🦐 Camarão</button>
                <button type="button" data-bait-filter="Tatuíra" aria-pressed="false">🦀 Tatuíra</button>
                <button type="button" data-bait-filter="Corrupto" aria-pressed="false">🦞 Corrupto</button>
                <button type="button" data-bait-filter="Sardinha" aria-pressed="false">🐟 Sardinha</button>
                <button type="button" data-bait-filter="Artificial" aria-pressed="false">🪝 Artificial</button>
              </div>
            </div>
          </div>
          <div id="speciesCatalogGrid" class="species-catalog-grid" aria-live="polite"></div>
          <p class="chart-note species-photo-note">Fotos: comunidade <a href="https://www.inaturalist.org/" target="_blank" rel="noreferrer">iNaturalist</a>, licenças Creative Commons, com crédito em cada foto. A distribuição regional é uma referência geral e não garante a presença da espécie.</p>
        </section>`;

const speciesPanelHtml = `

      <main id="speciesPanel" role="tabpanel" aria-labelledby="speciesTab" hidden>
        <section class="intro tips-intro species-intro" aria-labelledby="speciesTitle">
          <div><p class="eyebrow">ESPÉCIES DA SUA REGIÃO</p><h1 id="speciesTitle">Quem encosta<br><em>na sua praia.</em></h1></div>
          <div class="intro-aside"><p>Peixes comuns no trecho do litoral do local escolhido, com iscas, anzol, melhor maré e tamanho mínimo para pesca consciente.</p><p class="tips-note">Troque o local de pesca no topo e a lista se ajusta à nova região.</p></div>
        </section>${speciesCatalogHtml}
      </main>`;

html = replace(html, '</section>\n      </main>\n\n      <main id="rankingPanel"', `</section>\n      </main>${speciesPanelHtml}\n\n      <main id="rankingPanel"`);

// Animated loading overlay shown while a newly chosen fishing spot is loading
const locationLoaderHtml = `<div id="locationLoader" class="loc-loader" role="status" aria-live="polite" hidden>
        <div class="loc-loader-card">
          <div class="loc-loader-scene" aria-hidden="true">
            <svg viewBox="0 0 240 120">
              <defs><linearGradient id="locLoaderSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4de1c1" stop-opacity=".55"/><stop offset="1" stop-color="#4de1c1" stop-opacity="0"/></linearGradient></defs>
              <circle class="loc-sun" cx="196" cy="30" r="13"/>
              <path class="loc-line" d="M42 6 Q 90 20 118 58"/>
              <g class="loc-bobber"><circle cx="118" cy="60" r="7"/><path d="M111 60 h14"/></g>
              <g class="loc-fish"><path d="M0 0c8-8 22-10 34-4l9-6-2 12 2 12-9-6C22 14 8 8 0 0z" transform="translate(60 92)"/></g>
              <g class="loc-wave loc-wave-back"><path d="M-240 70 q30-12 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V120 H-240z"/></g>
              <g class="loc-wave loc-wave-front"><path d="M-240 78 q30-10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V120 H-240z"/></g>
            </svg>
          </div>
          <p class="eyebrow">ATUALIZANDO LOCAL DE PESCA</p>
          <strong id="locationLoaderName" class="loc-loader-name">—</strong>
          <ol class="loc-loader-steps">
            <li><span></span>Tábua de maré</li>
            <li><span></span>Vento &amp; ondas</li>
            <li><span></span>Janelas &amp; espécies</li>
          </ol>
          <div class="loc-loader-bar"><span></span></div>
        </div>
      </div>

      <footer>`;
html = replace(html, '<footer>', locationLoaderHtml);

// Inject Community KPIs & Fisherman Achievements into #rankingPanel
const achievementsHtml = `<section id="achievementsSection" class="b-achievements-section" aria-label="Estatísticas e Conquistas">
          <div class="b-stats-strip">
            <article class="b-stat-card card"><span class="eyebrow">PEIXES NA COMUNIDADE</span><strong id="statTotalFish">0</strong><small>Total acumulado no ranking</small></article>
            <article class="b-stat-card card"><span class="eyebrow">RELATOS NO DIÁRIO</span><strong id="statTotalRecords">0</strong><small>Pescarias registradas</small></article>
            <article class="b-stat-card card"><span class="eyebrow">ESPÉCIE EM DESTAQUE</span><strong id="statTopSpecies">—</strong><small>Mais capturada na costa</small></article>
            <article class="b-stat-card card"><span class="eyebrow">MAIOR PESO (TROFÉU)</span><strong id="statMaxWeight">—</strong><small>Recorde informado</small></article>
          </div>
          <div class="card b-badges-panel">
            <div class="card-heading">
              <div><p class="eyebrow">GAMIFICAÇÃO · CONQUISTAS DO PESCADOR</p><h2>Medalhas costeiras</h2></div>
              <p id="badgesSubtitle" class="ranking-count">Registre suas capturas para desbloquear</p>
            </div>
            <div id="badgesGrid" class="b-badges-grid"></div>
          </div>
        </section>`;

html = replace(html, '<div class="ranking-layout">', `${achievementsHtml}\n        <div class="ranking-layout">`);

// Add Quick Species Chips to #captureForm
html = replace(html, '<label>Peixe / espécie<input name="species" required maxlength="60" placeholder="Ex.: Robalo" /></label>', `<label>Peixe / espécie<input name="species" required maxlength="60" placeholder="Ex.: Robalo" /></label>
              <div id="quickSpeciesBar" class="quick-species-bar" role="group" aria-label="Escolha rápida de espécie">
                <button type="button" data-species="Pampo">Pampo</button>
                <button type="button" data-species="Betara">Betara</button>
                <button type="button" data-species="Robalo">Robalo</button>
                <button type="button" data-species="Corvina">Corvina</button>
                <button type="button" data-species="Xaréu">Xaréu</button>
                <button type="button" data-species="Sargo">Sargo</button>
                <button type="button" data-species="Bagre">Bagre</button>
              </div>`);

html = replace(html, '<section id="myCapturesSection"', `<section class="b-capture-filters card" aria-labelledby="captureFiltersTitle"><div><p class="eyebrow">SEU DIÁRIO, MAIS PERTO</p><h2 id="captureFiltersTitle">Encontre uma pescaria.</h2></div><form id="captureFilterForm"><label>Espécie<input id="filterSpecies" type="search" placeholder="Ex.: pampo" autocomplete="off"></label><label>Local<input id="filterLocation" type="search" placeholder="Ex.: Intermares" autocomplete="off"></label><label>De<input id="filterFrom" type="date"></label><label>Até<input id="filterTo" type="date"></label><button id="clearCaptureFilters" type="button">Limpar filtros</button></form><p id="captureFilterResult" role="status">Carregando o diário…</p></section>\n        <section id="myCapturesSection"`);

// Add Shareable Trophy Card Dialog right after #accountDialog
const shareDialogHtml = `\n      <dialog id="shareCardDialog" class="account-dialog share-card-dialog" aria-labelledby="shareCardTitle">
        <button id="closeShareCard" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <p class="eyebrow">TROFÉU DIGITAL · STORIES & WHATSAPP</p>
        <h2 id="shareCardTitle">Compartilhar captura</h2>
        <div class="trophy-canvas-wrap">
          <canvas id="trophyCanvas" width="1080" height="1350" aria-label="Cartão visual da captura"></canvas>
        </div>
        <div class="share-dialog-actions">
          <button id="downloadTrophyBtn" class="primary-button" type="button">⬇ Baixar Imagem (PNG)</button>
          <button id="nativeShareTrophyBtn" class="secondary-share-btn" type="button">📲 Compartilhar no WhatsApp / Redes</button>
        </div>
      </dialog>`;

html = replace(html, '</dialog>', `</dialog>${shareDialogHtml}`);

html = replace(html, 'src="./app.js"', 'src="./app-b.js"');
html = replace(html, 'src="./ranking.js"', 'src="./ranking-b.js"');
html = replace(html, 'id="marineTitle">Condições médias do dia.', 'id="marineTitle">Condições por janela.');
html = replace(html, '<p id="marineEmpty"', '<div id="marineWindowTabs" class="marine-window-tabs" role="tablist" aria-label="Condições marítimas por janela"></div>\n          <p id="marineEmpty"');
html = replace(html, 'Calculando médias de vento e mar…', 'Calculando as condições de cada janela…');
html = replace(html, '<div id="marineContent" hidden>', '<div id="marineContent" role="tabpanel" hidden>');
html = html.replace(/<details class="marine-score-details">[\s\S]*?<\/details>/, '<details class="marine-score-details"><summary>Como a nota é calculada?</summary><p>A nota de cada janela é a média das notas dos horários previstos dentro daquele intervalo de três horas. Cada horário combina ondas (até 50 pontos), vento (até 35) e rajadas (até 15).</p><p>Usamos as amostras horárias dentro do intervalo, incluindo o dia anterior quando necessário. A nota exige todos os horários completos; campos com lacunas ficam indisponíveis. Ondas ≥ 2 m, vento &gt; 28 km/h, rajadas ≥ 40 km/h ou trovoadas em qualquer horário da janela destacam atenção.</p><p>Período, direção, pressão e temperatura dão contexto e não somam pontos. O índice é experimental; não mede chance de captura nem segurança.</p><p id="marineScoreBreakdown"></p></details>');

writeFileSync('dist/versao-b.html', html);
writeFileSync('dist/versao-a.html', baseAHtml);
writeFileSync('dist/versao-b.css', read('src/preview-b/styles.css'));
writeFileSync('dist/app-b.js', read('src/preview-b/app.js'));

// Write PWA Manifest and Service Worker to dist/
const manifestJson = JSON.stringify({
  name: 'Maré Certa — Planeje sua Pescaria',
  short_name: 'Maré Certa',
  description: 'Tábua de maré oficial, janelas de pesca, tabela solunar, recomendação de equipamento e ranking de pescadores.',
  start_url: './',
  display: 'standalone',
  background_color: '#05151f',
  theme_color: '#061b2a',
  lang: 'pt-BR',
  icons: [
    {
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23061b2a'/%3E%3Cpath d='M10 33c8-10 14-10 22 0s14 10 22 0v10c-8 10-14 10-22 0s-14-10-22 0z' fill='%234de1c1'/%3E%3Ccircle cx='44' cy='18' r='8' fill='%23dff76d'/%3E%3C/svg%3E",
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }
  ]
}, null, 2);
writeFileSync('dist/manifest.webmanifest', manifestJson);

const swCode = `const CACHE_NAME = 'mare-certa-pwa-v2';
const CORE_ASSETS = ['./', './index.html', './styles.css', './versao-b.css', './app-b.js', './preview-b.js', './marine-b.js', './tides.js', './conditions.js', './tabs.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
`;
writeFileSync('dist/sw.js', swCode);

let ranking = read('src/ranking.js');
ranking = replace(ranking, "import { auth, database } from './firebase.js';", "import { auth, database } from './firebase.js';\nimport { filterCaptures } from './preview-b/model.js';\nimport { renderAchievementsAndStats, openShareCardModal } from './preview-b/community-enhancements.js';");
ranking = replace(ranking, "addCell(row, String(person.rank).padStart(2, '0'), 'rank-position');", "const medal = person.rank === 1 ? '🥇 ' : person.rank === 2 ? '🥈 ' : person.rank === 3 ? '🥉 ' : '';\n    addCell(row, medal + String(person.rank).padStart(2, '0'), 'rank-position');");
ranking = replace(ranking, '  card.append(title, author, details);', `  const shareWrap = document.createElement('div'); shareWrap.className = 'capture-share-row';
  const shareBtn = document.createElement('button'); shareBtn.type = 'button'; shareBtn.className = 'share-card-btn'; shareBtn.textContent = '📤 Compartilhar card';
  shareBtn.addEventListener('click', () => openShareCardModal(capture, profiles[capture.uid]?.displayName || 'Pescador'));
  shareWrap.append(shareBtn);
  card.append(title, author, details, shareWrap);`);
ranking = replace(ranking, '  const recent = all.slice(0, 30);', `  renderAchievementsAndStats(captures, auth.currentUser?.uid || null);
  const filters = { species: $('filterSpecies').value, location: $('filterLocation').value, from: $('filterFrom').value, to: $('filterTo').value };
  const filtered = filterCaptures(all, filters);
  const recent = filtered.slice(0, 30);
  $('captureFilterResult').textContent = filters.from && filters.to && filters.from > filters.to ? 'Confira o período: a data inicial é posterior à final.' : readyCaptures ? filtered.length + ' captura(s) encontrada(s) no diário da comunidade.' : 'Carregando o diário…';`);
ranking = replace(ranking, '  const mine = all.filter(([, capture]) => capture.uid === auth.currentUser?.uid);', '  const mine = filterCaptures(all.filter(([, capture]) => capture.uid === auth.currentUser?.uid), filters);');
ranking = replace(ranking, "'Suas capturas aparecerão aqui para você editar.'", "'Nenhuma captura sua encontrada com estes filtros.'");
ranking = replace(ranking, "'As próximas capturas aparecerão aqui.'", "'Nenhuma captura encontrada. Experimente outra espécie, local ou período.'");
ranking += `\nlet filterTimer;\n$('captureFilterForm').addEventListener('submit', event => event.preventDefault());\n$('captureFilterForm').addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(renderCommunity, 150); });\n$('clearCaptureFilters').addEventListener('click', () => { clearTimeout(filterTimer); $('captureFilterForm').reset(); renderCommunity(); });\n`;

const baseOptions = { bundle: true, format: 'esm', minify: true, logLevel: 'silent' };
await Promise.all([
  build({ ...baseOptions, entryPoints: ['src/preview-b/enhancements.js'], outfile: 'dist/preview-b.js' }),
  build({ ...baseOptions, entryPoints: ['src/preview-b/window-marine-view.js'], outfile: 'dist/marine-b.js' }),
  build({ ...baseOptions, stdin: { contents: ranking, resolveDir: resolve('src'), sourcefile: 'ranking-b.js' }, outfile: 'dist/ranking-b.js' })
]);
for (const [file, before] of originals) if (hash(file) !== before) throw new Error(`A versão A foi alterada: ${file}`);
writeFileSync('dist/index.html', html);
await import('./prepare-pages.mjs');
console.log('Versão B definida como principal: http://localhost:4173/');
console.log('Versão A arquivada em http://localhost:4173/versao-a.html');
