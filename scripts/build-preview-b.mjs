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

// Transforma a seção de janelas em cabeçalho no topo (removendo a sidebar lateral esquerda interna)
const upgradedWindowsHtml = `<section id="windowsB" class="window-section card" aria-labelledby="windowTitle">
          <div class="card-heading window-head">
            <div>
              <p class="eyebrow">JANELAS DE PESCA</p>
              <h2 id="windowTitle">Janelas sugeridas pela maré.</h2>
            </div>
            <span class="window-rule-pill">3h antes da maré alta</span>
          </div>
          <p class="window-subnote">Cada janela começa três horas antes do pico da maré alta. A nota combina vento, ondas e rajadas para indicar a facilidade da pescaria da areia.</p>
          <div id="fishingWindows" class="window-list">
            <div class="window-card skeleton"></div><div class="window-card skeleton"></div>
          </div>
        </section>`;

// Right Sidebar for Condições de Pesca: Chumbada Oficial Banner + Google AdSense seguindo os design patterns
const rightPartnerSidebarHtml = `<aside id="partnerSidebar" class="b-partner-sidebar" aria-label="Patrocinador Oficial e Publicidade">
            <article class="card partner-sidebar-card chumbada-sidebar-card">
              <div class="card-heading">
                <div>
                  <p class="eyebrow">PATROCINADOR OFICIAL</p>
                  <h3 class="partner-card-title">Chumbada Oficial</h3>
                </div>
                <span class="partner-pill">Surfcasting</span>
              </div>
              <a class="partner-logo-frame" href="https://www.instagram.com/chumbada_oficial/" target="_blank" rel="noreferrer" aria-label="Conhecer Chumbada Oficial">
                <img src="./assets/chumbada-oficial-sidebar.png" width="300" height="300" loading="lazy" alt="Chumbada Oficial — Chumbadas de Alta Performance" />
              </a>
              <div class="partner-card-body">
                <p>Chumbadas projetadas para atingir o 2º valão com máxima fixação na areia, mesmo com correnteza forte.</p>
                <a class="partner-cta-btn" href="https://www.instagram.com/chumbada_oficial/" target="_blank" rel="noreferrer">
                  <span>Conhecer Catálogo Oficial</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>

            <article class="card partner-sidebar-card adsense-sidebar-card" aria-label="Espaço Publicitário Parceiro">
              <div class="card-heading">
                <div>
                  <p class="eyebrow">PUBLICIDADE RECOMENDADA</p>
                  <h3 class="partner-card-title">Equipamento Parceiro</h3>
                </div>
                <span class="ad-tag">Anúncio</span>
              </div>
              <div class="adsense-slot-container" id="adsenseSidebarSlot">
                <!-- Tag Google AdSense pronta para veiculação de anúncios em produção -->
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-0000000000000000"
                     data-ad-slot="0000000000"
                     data-ad-format="rectangle"
                     data-full-width-responsive="true"></ins>
                <div class="native-ad-preview">
                  <span class="native-ad-eyebrow">PESCA DE PRAIA &amp; COSTEIRA</span>
                  <strong class="native-ad-title">Varas, Molinetes e Linhas</strong>
                  <p class="native-ad-text">Confira os materiais e ofertas selecionados para a sua próxima pescaria.</p>
                  <span class="native-ad-cta">Ver ofertas de parceiros ↗</span>
                </div>
              </div>
            </article>
          </aside>`;

html = replace(
  html,
  '<section class="dashboard"',
  `<div class="b-forecast-with-sidebar">\n          <div class="b-forecast-main">\n        ` +
    upgradedWindowsHtml +
    '\n\n        ' +
    solunarTackleHtml +
    '\n\n        <section class="dashboard"'
);
html = replace(html, '<section id="marinePanel"', summary + '\n\n        <section id="marinePanel"');
html = replace(
  html,
  '<section id="errorBox" class="error-box" hidden>',
  `</div>\n          ${rightPartnerSidebarHtml}\n        </div>\n        <section id="errorBox" class="error-box" hidden>`
);

html = replace(html, '<div class="legend"><span class="dot high"></span> Alta <span class="dot low"></span> Baixa</div>', '<div class="legend"><span id="tideAmplitudeBadge" class="amplitude-badge" hidden></span><span class="dot high"></span> Alta <span class="dot low"></span> Baixa</div>');
html = html.replace(/(<svg id="tideChart"[^>]*><\/svg>)/, '$1\n              <div id="chartTooltip" class="b-chart-tooltip" hidden></div>');
html = replace(html, '<div class="tide-events"', `<div id="chartTools" class="b-chart-tools" hidden><div class="b-chart-readout"><label for="chartScrub">Explore a maré hora a hora</label><output id="chartReadout" for="chartScrub">—</output></div><input id="chartScrub" type="range" min="0" max="1" value="0" step="1" aria-label="Horário na curva de maré"><div class="b-chart-legend"><span><i></i> Janelas sugeridas (3h antes da alta)</span><span><i class="solunar-bar-icon"></i> Período Solunar Maior</span><span>Toque na curva ou deslize</span></div></div>\n            <div class="tide-events"`);

// Interactive Species & Bait Catalog in its own #speciesPanel
const speciesCatalogHtml = `
        <section id="speciesCatalogSection" class="species-catalog-section" aria-labelledby="speciesCatalogTitle">
          <div class="species-catalog-header card">
            <div class="species-header-top">
              <div>
                <p class="eyebrow">GUIA DE CAMPO · <span id="speciesRegionEyebrow">LITORAL BRASILEIRO</span></p>
                <h2 id="speciesCatalogTitle">Catálogo de espécies, iscas e montagens.</h2>
                <p id="speciesRegionNote" class="species-region-note">Consulte onde cada peixe costuma encostar na praia, as iscas mais produtivas, numeração de anzol e o tamanho mínimo para pesca consciente.</p>
              </div>
              <span id="speciesCatalogCount" class="ranking-count">Carregando espécies…</span>
            </div>
            <div class="species-filters-bar">
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
          <p class="chart-note species-photo-note">Fotos: comunidade <a href="https://www.inaturalist.org/" target="_blank" rel="noreferrer">iNaturalist</a>, licenças Creative Commons, com crédito em cada foto. A lista é filtrada automaticamente pela região do local selecionado no topo.</p>
        </section>`;

const speciesPanelHtml = `

      <main id="speciesPanel" role="tabpanel" aria-labelledby="speciesTab" hidden>
        <section class="intro tips-intro species-intro" aria-labelledby="speciesTitle">
          <div><p class="eyebrow">ESPÉCIES DA SUA REGIÃO</p><h1 id="speciesTitle">Quem encosta<br><em>na sua praia.</em></h1></div>
          <div class="intro-aside"><p>Peixes comuns no trecho do litoral do local escolhido, com iscas, anzol, melhor maré e tamanho mínimo para pesca consciente.</p><p class="tips-note">Troque o local de pesca no topo e a lista se ajusta à nova região.</p></div>
        </section>${speciesCatalogHtml}
      </main>`;

html = replace(html, '</section>\n      </main>\n\n      <main id="rankingPanel"', `</section>\n      </main>${speciesPanelHtml}\n\n      <main id="rankingPanel"`);

// Replace rip-current banner with YouTube Channel recommendation for novice fishermen
const ytRecommendationHtml = `<aside class="tips-youtube-card" aria-labelledby="youtubeChannelTitle">
          <div class="tips-youtube-content">
            <div class="tips-youtube-badge">
              <span class="youtube-play-icon" aria-hidden="true">▶</span>
              <span>CANAL RECOMENDADO NO YOUTUBE · DICAS PARA NOVATOS</span>
            </div>
            <h2 id="youtubeChannelTitle">Aprenda na prática com Júlio Marinho Pesca</h2>
            <p>Canal que ajuda pescadores novatos a evoluírem na pesca de praia: arremessos, montagens de chicotes, leitura do mar, nós e equipamentos essenciais direto na areia.</p>
          </div>
          <a class="tips-youtube-btn" href="https://www.youtube.com/@juliomarinhopesca" target="_blank" rel="noreferrer" aria-label="Acessar o canal Júlio Marinho Pesca no YouTube">
            <span class="yt-btn-icon" aria-hidden="true">▶</span>
            <span>Acessar canal no YouTube ↗</span>
          </a>
        </aside>`;

const safetyAsideRegex = /<aside class="tips-safety" aria-labelledby="tipsSafetyTitle">[\s\S]*?<\/aside>/;
if (!safetyAsideRegex.test(html)) throw new Error('Bloco tips-safety não encontrado no HTML.');
html = html.replace(safetyAsideRegex, ytRecommendationHtml);

// Animated loading overlay + Standalone Footer Partner Banner (antes do <footer>)
const locationLoaderAndFooterBannerHtml = `<div id="locationLoader" class="loc-loader" role="status" aria-live="polite" hidden>
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

      <section class="footer-partner-section" aria-label="Patrocinador Oficial da Comunidade">
        <div class="footer-partner-card card">
          <div class="footer-partner-copy">
            <span class="eyebrow">⚓ PARCEIRO OFICIAL · SURFCASTING</span>
            <h3>Chumbada Oficial — Precisão e Alcance na Pesca de Praia</h3>
            <p>Apoio oficial à comunidade de pescadores do Maré Certa. Chumbadas projetadas para atingir o 2º valão com máxima fixação na areia.</p>
          </div>
          <div class="footer-partner-action">
            <a class="footer-partner-logo-box" href="https://www.instagram.com/chumbada_oficial/" target="_blank" rel="noreferrer" aria-label="Visitar Chumbada Oficial">
              <img src="./assets/chumbada-oficial-footer.png" width="220" height="70" loading="lazy" alt="Logo Chumbada Oficial" />
            </a>
            <a class="partner-cta-btn footer-cta-btn" href="https://www.instagram.com/chumbada_oficial/" target="_blank" rel="noreferrer">
              <span>Ver Catálogo ↗</span>
            </a>
          </div>
        </div>
      </section>

      <footer>`;
html = replace(html, '<footer>', locationLoaderAndFooterBannerHtml);

// Inject PRO Club Bar + Community KPIs & Fisherman Achievements into #rankingPanel
const achievementsHtml = `<section id="proClubBar" class="card pro-club-bar" aria-label="Clube Pescador PRO e Assinatura Mercado Pago">
          <div class="pro-club-copy">
            <div class="pro-club-badges">
              <span class="eyebrow">REDE SOCIAL DO PESCADOR · CLUBE PRO</span>
              <span id="proCurrentStatusPill" class="pro-status-pill is-free">🔒 Conta Gratuita (Modo Leitura no Feed)</span>
            </div>
            <h2>Publique a foto do seu troféu, responda pescadores e conquiste seguidores.</h2>
            <p>Assinantes PRO postam 1 foto otimizada por captura (AWS S3 WebP), comentam nos posts da comunidade e exibem o selo 👑 PRO por apenas <strong>R$ 5/mês no plano anual</strong> (ou R$ 15/mês avulso) via Mercado Pago.</p>
          </div>
          <div class="pro-club-actions">
            <button id="openProModalBtn" class="primary-button pro-cta-btn" type="button">⚡ Assinar PRO · R$ 5/mês</button>
            <button id="proSandboxToggleBtn" class="pro-sandbox-btn" type="button">🧪 Sandbox Local: Simular Assinante PRO Ativo</button>
          </div>
        </section>

        <section id="achievementsSection" class="b-achievements-section" aria-label="Estatísticas e Conquistas">
          <div class="b-stats-strip">
            <article class="b-stat-card card"><span class="eyebrow">PEIXES NA COMUNIDADE</span><strong id="statTotalFish">0</strong><small>Total acumulado no ranking</small></article>
            <article class="b-stat-card card"><span class="eyebrow">RELATOS NO DIÁRIO</span><strong id="statTotalRecords">0</strong><small>Pescarias registradas</small></article>
            <article class="b-stat-card card"><span class="eyebrow">ESPÉCIE EM DESTAQUE</span><strong id="statTopSpecies">—</strong><small>Mais capturada na costa</small></article>
            <article class="b-stat-card card"><span class="eyebrow">MAIOR PESO (TROFÉU)</span><strong id="statMaxWeight">—</strong><small>Recorde informado</small></article>
          </div>
          <div class="card b-badges-panel">
            <div class="card-heading">
              <div><p class="eyebrow">GAMIFICAÇÃO · CONQUISTAS DO PESCADOR</p><h2>Medalhas costeiras (Achievements)</h2></div>
              <p id="badgesSubtitle" class="ranking-count">Registre suas capturas para desbloquear</p>
            </div>
            <div id="badgesGrid" class="b-badges-grid"></div>
          </div>
        </section>`;

html = replace(html, '<div class="ranking-layout">', `${achievementsHtml}\n        <div class="ranking-layout">`);

// Add Quick Species Chips AND Trophy Photo Upload (1 Photo per Capture + WebP Compression for S3) to #captureForm
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

const trophyPhotoUploadFieldHtml = `<div class="trophy-upload-box">
                <div class="trophy-upload-top">
                  <span>📸 Foto do seu troféu (máx. 1 foto)</span>
                  <span id="photoProLockBadge" class="photo-pro-badge locked">🔒 Recurso PRO · R$ 5/mês</span>
                </div>
                <input id="capturePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                <button id="capturePhotoTriggerBtn" class="trophy-upload-btn" type="button">
                  <span>Selecionar ou Tirar Foto do Peixe</span>
                  <small>Compressão automática WebP 1080p p/ Amazon S3</small>
                </button>
                <div id="capturePhotoPreviewWrap" class="trophy-photo-preview" hidden>
                  <img id="capturePhotoPreviewImg" src="" alt="Prévia comprimida da foto do troféu" />
                  <button id="removeCapturePhotoBtn" class="text-button" type="button">Remover foto</button>
                </div>
                <small id="capturePhotoStatus" class="photo-compression-status">1 foto do troféu por captura · Compressão WebP automática p/ AWS S3</small>
              </div>
              <button class="primary-button" type="submit">Salvar captura</button>`;

html = replace(html, '<button class="primary-button" type="submit">Salvar captura</button>', trophyPhotoUploadFieldHtml);

html = replace(html, '<section id="myCapturesSection"', `<section class="b-capture-filters card" aria-labelledby="captureFiltersTitle"><div><p class="eyebrow">SEU DIÁRIO, MAIS PERTO</p><h2 id="captureFiltersTitle">Encontre uma pescaria no feed.</h2></div><form id="captureFilterForm"><label>Espécie<input id="filterSpecies" type="search" placeholder="Ex.: pampo" autocomplete="off"></label><label>Local<input id="filterLocation" type="search" placeholder="Ex.: Intermares" autocomplete="off"></label><label>De<input id="filterFrom" type="date"></label><label>Até<input id="filterTo" type="date"></label><button id="clearCaptureFilters" type="button">Limpar filtros</button></form><p id="captureFilterResult" role="status">Carregando o feed social…</p></section>\n        <section id="myCapturesSection"`);

html = replace(html, '<p class="eyebrow">DIÁRIO DA COMUNIDADE</p><h2 id="catchesTitle">Capturas recentes</h2>', '<p class="eyebrow">FEED SOCIAL DA COMUNIDADE · TROFÉUS, RESPOSTAS & SEGUIDORES</p><h2 id="catchesTitle">Feed de capturas & troféus</h2>');

// Add Shareable Trophy Card Dialog AND Mercado Pago PRO Paywall Dialog right after #accountDialog
const shareAndPaywallDialogsHtml = `\n      <dialog id="shareCardDialog" class="account-dialog share-card-dialog" aria-labelledby="shareCardTitle">
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
      </dialog>

      <dialog id="proPaywallDialog" class="account-dialog pro-paywall-dialog" aria-labelledby="proPaywallTitle">
        <button id="closeProPaywall" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="pro-paywall-head">
          <span class="pro-crown-pill">👑 CLUBE PESCADOR PRO · MERCADO PAGO</span>
          <h2 id="proPaywallTitle">Faça parte da elite da pesca costeira.</h2>
          <p id="proPaywallReason" class="pro-paywall-reason">Desbloqueie fotos de troféus, comentários no feed, seguidores e o selo Pescador PRO.</p>
        </div>

        <ul class="pro-benefits-list">
          <li>📸 <strong>1 Foto do Troféu por Captura:</strong> Upload ultrarrápido com compressão WebP automática no Amazon S3.</li>
          <li>💬 <strong>Chat &amp; Respostas nos Posts:</strong> Pergunte qual isca, anzol ou praia nos troféus de outros pescadores.</li>
          <li>➕ <strong>Seguir Pescadores &amp; Achievements:</strong> Monte sua rede costeira e exiba suas medalhas no topo do feed.</li>
          <li>👑 <strong>Selo Oficial PRO:</strong> Destaque dourado ao lado do seu nome no Ranking e nos comentários.</li>
        </ul>

        <div class="pro-plans-grid" role="group" aria-label="Escolha seu plano Mercado Pago">
          <button type="button" class="pro-plan-card selected" data-pro-plan-select="annual" aria-pressed="true">
            <span class="pro-plan-ribbon">MAIS ESCOLHIDO · ECONOMIZE 67%</span>
            <h3>Plano Anual</h3>
            <div class="pro-plan-price">
              <strong>R$ 5,00</strong>
              <span>/ mês</span>
            </div>
            <small>Cobrado R$ 60,00 / ano via PIX ou Cartão no Mercado Pago</small>
          </button>

          <button type="button" class="pro-plan-card" data-pro-plan-select="monthly" aria-pressed="false">
            <span class="pro-plan-ribbon secondary">SEM FIDELIDADE</span>
            <h3>Plano Mensal</h3>
            <div class="pro-plan-price">
              <strong>R$ 15,00</strong>
              <span>/ mês</span>
            </div>
            <small>Cobrança mensal avulsa via PIX ou Cartão no Mercado Pago</small>
          </button>
        </div>

        <div class="pro-checkout-actions">
          <button id="mpCheckoutApproveBtn" class="primary-button mp-checkout-btn" type="button">
            💳 Pagar com Mercado Pago · R$ 5/mês (R$ 60/ano PIX ou Cartão)
          </button>
          <p class="pro-mp-note">🔒 Ambiente Local de Testes (Sandbox): clique no botão acima para simular a aprovação imediata do Mercado Pago sem cobrança real.</p>
        </div>
      </dialog>`;

html = replace(html, '</dialog>', `</dialog>${shareAndPaywallDialogsHtml}`);

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
let appBCode = read('src/preview-b/app.js');
appBCode = appBCode.replace(
  /if \('serviceWorker' in navigator[\s\S]*?\}\n\}/,
  `if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      let hadSw = false;
      Promise.all(regs.map(r => { hadSw = true; return r.unregister(); })).then(() => {
        if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        if (hadSw && !sessionStorage.getItem('sw-purged-v4')) {
          sessionStorage.setItem('sw-purged-v4', '1');
          location.reload();
        }
      });
    }).catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}`
);
writeFileSync('dist/app-b.js', appBCode);

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

const swCode = `const CACHE_NAME = 'mare-certa-pwa-v4';
const IS_LOCAL = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const CORE_ASSETS = ['./', './index.html', './styles.css', './versao-b.css', './app-b.js', './preview-b.js', './marine-b.js', './tides.js', './conditions.js', './tabs.js'];
self.addEventListener('install', event => {
  if (!IS_LOCAL) {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {}));
  }
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => IS_LOCAL || k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        if (IS_LOCAL) {
          return self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => client.navigate(client.url));
          });
        }
      })
  );
});
self.addEventListener('fetch', event => {
  if (IS_LOCAL || event.request.method !== 'GET') return;
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
ranking = replace(
  ranking,
  "import { auth, database } from './firebase.js';",
  `import { auth, database } from './firebase.js';
import { filterCaptures } from './preview-b/model.js';
import {
  renderAchievementsAndStats,
  openShareCardModal,
  enhanceSocialCaptureCard,
  getPendingTrophyPhoto,
  clearPendingTrophyPhoto,
  saveLocalS3Photo,
  isUserPro,
  setProSubscription,
  openProPaywallModal
} from './preview-b/community-enhancements.js';`
);
ranking = replace(
  ranking,
  "addCell(row, String(person.rank).padStart(2, '0'), 'rank-position');",
  "const medal = person.rank === 1 ? '🥇 ' : person.rank === 2 ? '🥈 ' : person.rank === 3 ? '🥉 ' : '';\n    addCell(row, medal + String(person.rank).padStart(2, '0'), 'rank-position');"
);
ranking = replace(
  ranking,
  "await push(ref(database, 'mareCerta/captures'), capture);",
  `const pushedRef = await push(ref(database, 'mareCerta/captures'), capture);
      const pendingPhoto = getPendingTrophyPhoto();
      if (pendingPhoto && pushedRef?.key) {
        saveLocalS3Photo(pushedRef.key, pendingPhoto);
        clearPendingTrophyPhoto();
      }`
);
ranking = replace(
  ranking,
  '  card.append(title, author, details);',
  `  const shareWrap = document.createElement('div'); shareWrap.className = 'capture-share-row';
  const shareBtn = document.createElement('button'); shareBtn.type = 'button'; shareBtn.className = 'share-card-btn'; shareBtn.textContent = '📤 Compartilhar card';
  shareBtn.addEventListener('click', () => openShareCardModal(capture, profiles[capture.uid]?.displayName || capture.authorName || 'Pescador'));
  shareWrap.append(shareBtn);
  card.append(title, author, details, shareWrap);
  enhanceSocialCaptureCard(card, id, capture, profiles, captures, auth.currentUser?.uid || null);`
);

const demoSocialPostsSnippet = `  const demoCaptures = [
    ['demo-1', { uid: 'demo-fisher-1', authorName: 'Henrique Costa', species: 'Robalo-flecha', quantity: 1, weight: 4.2, date: '2026-10-24', location: 'Praia do Bessa, João Pessoa', createdAt: 1792840000000 }],
    ['demo-2', { uid: 'demo-fisher-2', authorName: 'Marcos Surfcasting', species: 'Pampo-galhudo', quantity: 3, weight: 2.6, date: '2026-10-23', location: 'Intermares, Cabedelo', createdAt: 1792800000000 }],
    ['demo-3', { uid: 'demo-fisher-3', authorName: 'Juliana Mar', species: 'Betara / Papa-terra', quantity: 5, weight: 1.8, date: '2026-10-22', location: 'Praia Grande, Ilha Comprida', createdAt: 1792750000000 }],
    ['demo-4', { uid: 'demo-fisher-4', authorName: 'Rafael Ponta da Praia', species: 'Corvina-de-linha', quantity: 2, weight: 3.5, date: '2026-10-21', location: 'Praia de Camburi, Vitória', createdAt: 1792700000000 }],
    ['demo-5', { uid: 'demo-fisher-5', authorName: 'Tiago Linha Fina', species: 'Xaréu-preto', quantity: 1, weight: 6.1, date: '2026-10-20', location: 'Farol de Itapuã, Salvador', createdAt: 1792650000000 }],
    ['demo-6', { uid: 'demo-fisher-6', authorName: 'Carlos Pesca Costeira', species: 'Sargo-de-dente', quantity: 2, weight: 2.2, date: '2026-10-19', location: 'Praia do Francês, Marechal Deodoro', createdAt: 1792600000000 }]
  ];
  const combinedWithDemos = [...all, ...demoCaptures.filter(([id]) => !captures[id])];
  const combinedCapturesMap = { ...Object.fromEntries(demoCaptures), ...captures };
  renderAchievementsAndStats(combinedCapturesMap, auth.currentUser?.uid || 'demo-fisher-1');
  const filters = { species: $('filterSpecies').value, location: $('filterLocation').value, from: $('filterFrom').value, to: $('filterTo').value };
  const filtered = filterCaptures(combinedWithDemos, filters);
  const recent = filtered.slice(0, 30);
  $('captureFilterResult').textContent = filters.from && filters.to && filters.from > filters.to ? 'Confira o período: a data inicial é posterior à final.' : filtered.length + ' publicação(ões) no feed social da comunidade.';`;

ranking = replace(ranking, '  const recent = all.slice(0, 30);', demoSocialPostsSnippet);
ranking = replace(ranking, '  const mine = all.filter(([, capture]) => capture.uid === auth.currentUser?.uid);', '  const mine = filterCaptures(all.filter(([, capture]) => capture.uid === auth.currentUser?.uid), filters);');
ranking = replace(ranking, "'Suas capturas aparecerão aqui para você editar.'", "'Nenhuma captura sua encontrada com estes filtros.'");
ranking = replace(ranking, "'As próximas capturas aparecerão aqui.'", "'Nenhuma captura encontrada. Experimente outra espécie, local ou período.'");

const blurredFeedSnippet = `  const isPro = isUserPro();
  let postIdx = 0;
  for (const [id, capture] of recent) {
    const card = captureCard(id, capture);
    if (!isPro && postIdx >= 3) {
      card.classList.add('is-blurred-post');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Publicação exclusiva para assinantes PRO. Clique para desbloquear o feed completo.');

      const lockOverlay = document.createElement('div');
      lockOverlay.className = 'blur-lock-overlay';
      lockOverlay.innerHTML = \`
        <span class="blur-lock-pill">🔒 Conteúdo Exclusivo PRO</span>
        <span class="blur-lock-sub">Clique para desbloquear o feed completo · R$ 5/mês</span>
      \`;
      card.append(lockOverlay);

      const triggerUnlock = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openProPaywallModal('feed_blur');
      };
      card.addEventListener('click', triggerUnlock);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerUnlock(e);
      });
    }
    $('recentCatches').append(card);
    postIdx++;
  }

  if (!isPro && recent.length > 3) {
    const teaser = document.createElement('article');
    teaser.className = 'feed-paywall-teaser card';
    teaser.innerHTML = \`
      <div class="feed-paywall-teaser-content">
        <div class="paywall-teaser-badge">
          <span class="teaser-crown-icon">👑</span>
          <span class="teaser-badge-text">CLUBE PESCADOR PRO · MERCADO PAGO</span>
          <span class="teaser-limit-pill">🔒 Limite gratuito atingido (3 posts exibidos)</span>
        </div>
        <h3 class="paywall-teaser-title">Desbloqueie todo o feed social, fotos de troféus e dicas de pesqueiro</h3>
        <p class="paywall-teaser-desc">Você visualizou as 3 publicações gratuitas de hoje. Assine o <strong>Clube Pescador PRO</strong> por apenas <strong>R$ 5,00/mês</strong> no plano anual via Mercado Pago para liberar todas as capturas sem censura, ver locais exatos, interagir com pescadores e publicar suas próprias fotos no Amazon S3.</p>
        <div class="feed-paywall-teaser-actions">
          <button type="button" class="primary-button paywall-teaser-cta-btn">⚡ Desbloquear Feed Completo · R$ 5/mês</button>
          <button type="button" class="feed-paywall-sandbox-btn">🧪 Sandbox Local: Simular Assinante PRO Ativo</button>
        </div>
      </div>
    \`;
    teaser.querySelector('.paywall-teaser-cta-btn').addEventListener('click', () => openProPaywallModal('feed_blur'));
    teaser.querySelector('.feed-paywall-sandbox-btn').addEventListener('click', () => {
      setProSubscription(true, 'annual');
    });
    $('recentCatches').append(teaser);
  }`;

ranking = replace(
  ranking,
  `  for (const [id, capture] of recent) {
    $('recentCatches').append(captureCard(id, capture));
  }`,
  blurredFeedSnippet
);
ranking += `\nlet filterTimer;\n$('captureFilterForm').addEventListener('submit', event => event.preventDefault());\n$('captureFilterForm').addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(renderCommunity, 150); });\n$('clearCaptureFilters').addEventListener('click', () => { clearTimeout(filterTimer); $('captureFilterForm').reset(); renderCommunity(); });\nwindow.addEventListener('mare-certa:pro-changed', () => renderCommunity());\n`;

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
