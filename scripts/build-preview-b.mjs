import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

html = replace(html, '<link rel="stylesheet" href="./styles.css" />', '<link rel="manifest" href="./manifest.webmanifest" />\n    <link rel="apple-touch-icon" sizes="180x180" href="./assets/pwa-app-icon.jpg" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n    <meta name="apple-mobile-web-app-title" content="Maré Certa" />\n    <link rel="stylesheet" href="./styles.css" />\n    <link rel="stylesheet" href="./versao-b.css" />');
html = replace(
  html,
  '<meta name="description" content="Maré Certa reúne marés, vento e lua para você planejar a próxima pescaria." />',
  `<meta id="dynamicSeoDescription" name="description" content="Consulte a Tábua de Maré hoje e amanhã em Recife, Salvador, Natal, João Pessoa, Porto de Galinhas, Cabedelo, Maragogi, Maceió, Vitória, Vila Velha e todo o litoral brasileiro. Horários de preamar, baixa-mar, tabela solunar e pesca de praia." />
    <meta id="dynamicSeoKeywords" name="keywords" content="tábua da maré, tabua de mare recife, tabua de mare salvador, tabua de mare natal, tábua da maré em joão pessoa, tabua da mare porto de galinhas, tábua da maré cabedelo, tábua da maré maragogi, tábua da maré maceió, tabua de mare vitoria, tabua de mare vila velha, tabua de maré hoje, tábua da maré para amanhã, maré certa" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="author" content="Maré Certa" />
    <link id="dynamicCanonicalLink" rel="canonical" href="https://marecerta.com.br/?local=joao-pessoa" />

    <!-- Open Graph / Facebook / WhatsApp / Google Discover -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Maré Certa" />
    <meta property="og:locale" content="pt_BR" />
    <meta id="ogTitle" property="og:title" content="Tábua de Maré João Pessoa, PB Hoje e Amanhã | Horários e Pesca — Maré Certa" />
    <meta id="ogDescription" property="og:description" content="Consulte a Tábua da Maré hoje e amanhã com horários oficiais de maré alta e baixa, tabela solunar, ondas, vento e melhores janelas de pesca costeira." />
    <meta id="ogUrl" property="og:url" content="https://marecerta.com.br/?local=joao-pessoa" />
    <meta id="ogImage" property="og:image" content="https://marecerta.com.br/assets/chumbada-oficial-banner.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta id="ogImageAlt" property="og:image:alt" content="Tábua de Maré Hoje e Amanhã — Previsão Costeira e Solunar Maré Certa" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta id="twitterTitle" name="twitter:title" content="Tábua de Maré João Pessoa, PB Hoje e Amanhã | Horários e Pesca — Maré Certa" />
    <meta id="twitterDescription" name="twitter:description" content="Consulte a Tábua da Maré hoje e amanhã com horários oficiais de maré alta e baixa, tabela solunar, ondas e pesca de praia." />
    <meta id="twitterImage" name="twitter:image" content="https://marecerta.com.br/assets/chumbada-oficial-banner.png" />

    <!-- Geo Meta Tags Dinâmicas para SEO Local -->
    <meta name="geo.region" content="BR" />
    <meta id="geoPlacename" name="geo.placename" content="João Pessoa, PB, Brasil" />
    <meta id="geoPosition" name="geo.position" content="-7.115;-34.8631" />
    <meta id="geoIcbm" name="ICBM" content="-7.115, -34.8631" />

    <!-- Schema.org JSON-LD Dinâmico (WebApplication + Place + FAQPage) -->
    <script id="dynamicJsonLd" type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            "name": "Maré Certa — Tábua da Maré e Previsão de Pesca",
            "url": "https://marecerta.com.br/",
            "applicationCategory": "WeatherApplication",
            "operatingSystem": "Web, Android, iOS",
            "inLanguage": "pt-BR",
            "description": "Tábua de maré oficial para Recife, Salvador, Natal, João Pessoa, Porto de Galinhas, Cabedelo, Maragogi, Maceió, Vitória, Vila Velha e todo o litoral brasileiro."
          }
        ]
      }
    </script>`
);
html = replace(html, '<title>Maré Certa — planeje sua pescaria</title>', '<title>Tábua de Maré João Pessoa, PB Hoje e Amanhã | Horários e Pesca — Maré Certa</title>');
html = replace(html, '<body>', '<body class="preview-b">');
html = replace(html, '<link rel="preconnect" href="https://geocoding-api.open-meteo.com" />', '<link rel="preconnect" href="https://geocoding-api.open-meteo.com" />\n    <link rel="preconnect" href="https://api.inaturalist.org" />\n    <link rel="preconnect" href="https://inaturalist-open-data.s3.amazonaws.com" />');

// Aba própria para espécies, entre "Dicas de pesca" e "Ranking"
html = replace(html, '<button id="tipsTab" role="tab" aria-controls="tipsPanel" aria-selected="false" tabindex="-1" type="button">Dicas de pesca</button>', '<button id="tipsTab" role="tab" aria-controls="tipsPanel" aria-selected="false" tabindex="-1" type="button">Dicas de pesca</button>\n        <button id="speciesTab" role="tab" aria-controls="speciesPanel" aria-selected="false" tabindex="-1" type="button">Espécies</button>');

// Topbar right actions: Notif Bell + PWA Install App Button + Live Status Pill
html = replace(
  html,
  '<div class="live-pill"><span></span> Previsão atualizada</div>',
  `<div class="topbar-right-actions">
          <button id="notifBellBtn" class="notif-bell-btn" type="button" aria-label="Notificações de mensagens nos seus troféus" title="Notificações de comentários">
            <span class="bell-icon" aria-hidden="true">🔔</span>
            <span id="notifBellBadge" class="notif-bell-badge" hidden>0</span>
          </button>
          <button id="pwaHeaderInstallBtn" class="pwa-header-install-btn" type="button" aria-label="Instalar aplicativo Maré Certa na tela inicial">
            <svg class="pwa-header-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v10m0 0l-3.5-3.5m3.5 3.5l3.5-3.5M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
            </svg>
            <span>Instalar app</span>
          </button>
          <div class="live-pill"><span></span> Previsão atualizada</div>
        </div>`
);

// Ranking Tab com Badge de Notificações
html = replace(
  html,
  '<button id="rankingTab" role="tab" aria-controls="rankingPanel" aria-selected="false" tabindex="-1" type="button">Ranking & capturas</button>',
  '<button id="rankingTab" role="tab" aria-controls="rankingPanel" aria-selected="false" tabindex="-1" type="button"><span>Ranking & capturas</span><span id="rankingTabBadge" class="ranking-tab-badge" hidden>0</span></button>'
);

// Smart App Banner & Quick Spot Bar right below topbar
html = replace(html, '<nav class="view-tabs"', `<aside id="pwaSmartBanner" class="pwa-smart-banner" aria-label="Instalar aplicativo Maré Certa na tela inicial" hidden>
        <div class="pwa-smart-banner-left">
          <img src="./assets/pwa-app-icon.jpg" width="46" height="46" alt="Ícone do App Maré Certa" class="pwa-smart-banner-icon" />
          <div class="pwa-smart-banner-text">
            <div class="pwa-smart-banner-badges">
              <span class="pwa-free-tag">APP OFICIAL · GRÁTIS</span>
              <span class="pwa-stars" aria-label="Avaliação 5 estrelas">★★★★★</span>
            </div>
            <strong>Maré Certa na sua Tela Inicial</strong>
            <p>Acesse a tábua de maré em 1 toque, em tela cheia e sem ocupar memória do celular.</p>
          </div>
        </div>
        <div class="pwa-smart-banner-actions">
          <button id="pwaBannerInstallBtn" class="primary-button pwa-banner-cta" type="button">Adicionar à Tela Inicial</button>
          <button id="pwaBannerDismissBtn" class="pwa-banner-close" type="button" aria-label="Fechar sugestão de aplicativo">×</button>
        </div>
      </aside>

      <div class="spot-quick-strip" aria-label="Praias e pontos rápidos">
        <div class="spot-strip-label"><span aria-hidden="true">🧭</span><span>PRAIAS & PONTOS</span></div>
        <div id="spotQuickBar" class="spot-quick-bar" role="group" aria-label="Atalhos de praias"></div>
        <button id="favLocationBtn" class="fav-spot-btn" type="button" aria-pressed="false">☆ Favoritar praia</button>
      </div>

      <nav class="view-tabs"`);

// Upgraded Hero + Next Window with Progress Bar, Solunar Sync Badge, and Alert Reminder Button
html = html.replace(/<section class="intro" aria-labelledby="pageTitle">[\s\S]*?<\/section>/, `<section class="intro b-intro" aria-labelledby="pageTitle">
          <div class="b-hero-copy">
            <div class="b-eyebrow-row"><p class="eyebrow">AO RITMO DO MAR · SURFCASTING</p><span id="heroProPill" class="b-pro-pill is-free">VERSÃO GRATUITA</span></div>
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

// Right Sidebar for Condições de Pesca: Google AdSense Units + Compliance & Transparência (Termos de Uso, Política de Privacidade e LGPD)
const rightPartnerSidebarHtml = `<aside id="partnerSidebar" class="b-partner-sidebar" aria-label="Espaço Publicitário Google AdSense e Conformidade">
            <!-- Bloco 1: Google AdSense Destaque Topo -->
            <article class="card partner-sidebar-card adsense-sidebar-card adsense-top-card" aria-label="Espaço Publicitário Google AdSense">
              <div class="card-heading">
                <div>
                  <p class="eyebrow">GOOGLE ADSENSE</p>
                  <h3 class="partner-card-title">Publicidade Recomendada</h3>
                </div>
                <span class="ad-tag">Anúncio</span>
              </div>
              <div class="adsense-slot-container" id="adsenseTopSlot">
                <!-- Tag Google AdSense: substitua data-ad-client e data-ad-slot após a aprovação -->
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-0000000000000000"
                     data-ad-slot="0000000001"
                     data-ad-format="rectangle"
                     data-full-width-responsive="true"></ins>
                <div class="native-ad-preview">
                  <span class="native-ad-eyebrow">EQUIPAMENTOS DE PESCA &amp; PRAIA</span>
                  <strong class="native-ad-title">Iscas, Acessórios e Materiais</strong>
                  <p class="native-ad-text">Anúncios relevantes do Google AdSense selecionados para a sua pescaria de praia e costeira.</p>
                  <span class="native-ad-cta">Anúncios Google ↗</span>
                </div>
              </div>
            </article>

            <!-- Bloco 2: Google AdSense Equipamentos e Varas -->
            <article class="card partner-sidebar-card adsense-sidebar-card adsense-secondary-card" aria-label="Espaço Publicitário Parceiro">
              <div class="card-heading">
                <div>
                  <p class="eyebrow">OFERTAS DE SURFCASTING</p>
                  <h3 class="partner-card-title">Equipamento Parceiro</h3>
                </div>
                <span class="ad-tag">Anúncio</span>
              </div>
              <div class="adsense-slot-container" id="adsenseSidebarSlot">
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-0000000000000000"
                     data-ad-slot="0000000002"
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

            <!-- Bloco 3: Transparência Google AdSense, Termos de Uso e LGPD -->
            <article class="card partner-sidebar-card compliance-sidebar-card" aria-label="Conformidade Google AdSense e LGPD">
              <div class="card-heading">
                <div>
                  <p class="eyebrow">GOOGLE ADSENSE &amp; LGPD</p>
                  <h3 class="partner-card-title">Privacidade &amp; Termos</h3>
                </div>
                <span class="compliance-pill">Conformidade</span>
              </div>
              <div class="compliance-card-body">
                <p>O Maré Certa opera em conformidade com as diretrizes de editores do <strong>Google AdSense</strong> e a <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18)</strong>.</p>
                <div class="compliance-links-group">
                  <button type="button" class="compliance-link-btn" data-open-legal="terms">
                    <span class="legal-icon" aria-hidden="true">📜</span>
                    <span>Termos de Uso do Serviço</span>
                  </button>
                  <button type="button" class="compliance-link-btn" data-open-legal="privacy">
                    <span class="legal-icon" aria-hidden="true">🔒</span>
                    <span>Política de Privacidade (LGPD)</span>
                  </button>
                  <button type="button" class="compliance-link-btn" data-open-legal="cookies">
                    <span class="legal-icon" aria-hidden="true">🍪</span>
                    <span>Preferências de Cookies AdSense</span>
                  </button>
                </div>
                <small class="compliance-ad-note">Cookies DART/DoubleClick são utilizados pelo Google para veicular anúncios personalizados aos pescadores.</small>
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

      <section id="seoCoastalDirectory" class="seo-coastal-section card" aria-labelledby="seoDynamicLocationTitle">
        <div class="seo-coastal-header">
          <div>
            <span class="eyebrow">🌊 DIRETÓRIO DE MARÉS DO BRASIL · INDEXAÇÃO ADAPTATIVA</span>
            <h2 id="seoDynamicLocationTitle">Tábua da Maré em João Pessoa, PB Hoje e Amanhã</h2>
            <p id="seoDynamicLocationText" class="seo-coastal-summary">Acompanhe a tábua de maré atualizada para João Pessoa (PB) com horários exatos de preamar e baixa-mar, altura das ondas, velocidade do vento e tabela solunar completa para planejar sua pescaria de praia (surfcasting) hoje e nos próximos 7 dias.</p>
          </div>
          <span class="seo-live-badge">✓ Dados Marítimos &amp; DHN</span>
        </div>

        <div class="seo-spots-block">
          <h3 class="seo-spots-subtitle">Tábua da Maré nas Principais Praias e Capitais Costeiras</h3>
          <nav class="seo-spots-grid" aria-label="Links diretos para a Tábua de Maré por cidade">
            <a href="?local=recife" class="seo-spot-link" data-seo-spot-slug="recife"><strong>Tábua de Maré Recife</strong><small>Pernambuco · PE</small></a>
            <a href="?local=salvador" class="seo-spot-link" data-seo-spot-slug="salvador"><strong>Tábua de Maré Salvador</strong><small>Bahia · BA</small></a>
            <a href="?local=natal" class="seo-spot-link" data-seo-spot-slug="natal"><strong>Tábua de Maré Natal</strong><small>Rio Grande do Norte · RN</small></a>
            <a href="?local=joao-pessoa" class="seo-spot-link is-active" data-seo-spot-slug="joao-pessoa" aria-current="page"><strong>Tábua da Maré em João Pessoa</strong><small>Paraíba · PB</small></a>
            <a href="?local=porto-de-galinhas" class="seo-spot-link" data-seo-spot-slug="porto-de-galinhas"><strong>Tábua da Maré Porto de Galinhas</strong><small>Ipojuca · PE</small></a>
            <a href="?local=cabedelo" class="seo-spot-link" data-seo-spot-slug="cabedelo"><strong>Tábua da Maré Cabedelo</strong><small>Intermares · PB</small></a>
            <a href="?local=maragogi" class="seo-spot-link" data-seo-spot-slug="maragogi"><strong>Tábua da Maré Maragogi</strong><small>Alagoas · AL</small></a>
            <a href="?local=maceio" class="seo-spot-link" data-seo-spot-slug="maceio"><strong>Tábua da Maré Maceió</strong><small>Alagoas · AL</small></a>
            <a href="?local=vitoria" class="seo-spot-link" data-seo-spot-slug="vitoria"><strong>Tábua de Maré Vitória</strong><small>Espírito Santo · ES</small></a>
            <a href="?local=vila-velha" class="seo-spot-link" data-seo-spot-slug="vila-velha"><strong>Tábua de Maré Vila Velha</strong><small>Espírito Santo · ES</small></a>
            <a href="?local=barra-de-sao-miguel" class="seo-spot-link" data-seo-spot-slug="barra-de-sao-miguel"><strong>Tábua da Maré Barra de São Miguel</strong><small>Alagoas · AL</small></a>
            <a href="?local=sao-luis" class="seo-spot-link" data-seo-spot-slug="sao-luis"><strong>Tábua da Maré São Luís</strong><small>Maranhão · MA</small></a>
            <a href="?local=sao-miguel-dos-milagres" class="seo-spot-link" data-seo-spot-slug="sao-miguel-dos-milagres"><strong>Tábua da Maré São Miguel dos Milagres</strong><small>Alagoas · AL</small></a>
            <a href="?local=sao-jose-de-ribamar" class="seo-spot-link" data-seo-spot-slug="sao-jose-de-ribamar"><strong>Tábua da Maré São José de Ribamar</strong><small>Maranhão · MA</small></a>
            <a href="?local=sao-francisco-do-sul" class="seo-spot-link" data-seo-spot-slug="sao-francisco-do-sul"><strong>Tábua da Maré São Francisco do Sul</strong><small>Santa Catarina · SC</small></a>
            <a href="?local=gaibu" class="seo-spot-link" data-seo-spot-slug="gaibu"><strong>Tábua da Maré Gaibu</strong><small>Cabo de Sto. Agostinho · PE</small></a>
            <a href="?local=praia-grande-sp" class="seo-spot-link" data-seo-spot-slug="praia-grande-sp"><strong>Tábua da Maré Praia Grande SP</strong><small>Litoral Sul · SP</small></a>
            <a href="?local=sao-vicente" class="seo-spot-link" data-seo-spot-slug="sao-vicente"><strong>Tábua da Maré São Vicente</strong><small>Baixada Santista · SP</small></a>
            <a href="?local=vera-cruz" class="seo-spot-link" data-seo-spot-slug="vera-cruz"><strong>Tábua da Maré Vera Cruz</strong><small>Itaparica · BA</small></a>
            <a href="?local=santos" class="seo-spot-link" data-seo-spot-slug="santos"><strong>Tábua da Maré Santos</strong><small>São Paulo · SP</small></a>
            <a href="?local=rio-de-janeiro" class="seo-spot-link" data-seo-spot-slug="rio-de-janeiro"><strong>Tábua da Maré Rio de Janeiro</strong><small>Rio de Janeiro · RJ</small></a>
          </nav>
        </div>

        <div class="seo-faq-grid">
          <article class="seo-faq-card">
            <h4>Como consultar a tábua da maré para hoje e para amanhã?</h4>
            <p>Basta escolher sua praia ou cidade acima (como Recife, Salvador, Natal, João Pessoa ou Porto de Galinhas) e alternar entre os dias da semana no seletor superior para ver todos os horários de maré cheia (preamar) e maré seca (baixa-mar).</p>
          </article>
          <article class="seo-faq-card">
            <h4>Qual a melhor maré para pesca de praia (surfcasting)?</h4>
            <p>As 3 horas de maré enchente antes do pico da preamar costumam concentrar a maior atividade alimentar nos canais e no 1º e 2º valão, especialmente quando sincronizadas com períodos solunares maiores.</p>
          </article>
        </div>
      </section>

      <section class="footer-partner-section" aria-label="Espaço para parceiros e patrocinadores">
        <div class="footer-partner-card card">
          <div class="footer-partner-copy">
            <span class="eyebrow">⚓ ESPAÇO PARA PARCEIROS · SURFCASTING</span>
            <h3>Sua empresa aqui — Anuncie para pescadores de todo o litoral</h3>
            <p>Divulgue sua loja, marca ou serviço de pesca para uma comunidade apaixonada pelo mar. Destaque sua empresa neste espaço e alcance pescadores que consultam a tábua de maré todos os dias.</p>
          </div>
          <div class="footer-partner-action">
            <a class="footer-partner-logo-box" href="https://wa.me/5583988841996?text=Ol%C3%A1!%20Tenho%20interesse%20em%20anunciar%20no%20Mar%C3%A9%20Certa." target="_blank" rel="noreferrer" aria-label="Seu logo aqui — fale conosco">
              <span style="display:flex;align-items:center;justify-content:center;min-width:150px;height:52px;border:1px dashed rgba(77,225,193,.45);border-radius:10px;color:#9bbcc7;font:700 .8rem Manrope,sans-serif;">SEU LOGO AQUI</span>
            </a>
            <a class="partner-cta-btn footer-cta-btn" href="https://wa.me/5583988841996?text=Ol%C3%A1!%20Tenho%20interesse%20em%20anunciar%20no%20Mar%C3%A9%20Certa." target="_blank" rel="noreferrer">
              <span>Quero anunciar ↗</span>
            </a>
          </div>
        </div>
      </section>

      <footer>`;

const oldFooterInnerHtml = `<div class="brand footer-brand">MARÉ <b>CERTA</b></div>
        <p>Dados meteorológicos e marítimos por <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> e DWD.</p>
        <p>Previsões costeiras são estimativas. Consulte avisos locais antes de sair.</p>`;

const enrichedFooterInnerHtml = `<div class="footer-layout">
          <div class="footer-brand-col">
            <div class="brand footer-brand">MARÉ <b>CERTA</b></div>
            <p>Dados meteorológicos e marítimos por <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> e DWD. Previsões costeiras são estimativas informativas. Consulte avisos oficiais da Capitania dos Portos e Defesa Civil antes de sair.</p>
            <p class="footer-compliance-text">Plataforma em conformidade com a <strong>LGPD (Lei 13.709/18)</strong> e as <strong>Políticas para Parceiros e Editores do Google AdSense</strong>.</p>
          </div>
          <nav class="footer-legal-nav" aria-label="Informações Institucionais e Jurídicas">
            <span class="footer-legal-title">INSTITUCIONAL &amp; LGPD</span>
            <button type="button" class="footer-legal-link" data-open-legal="terms">Termos de Uso do Serviço</button>
            <button type="button" class="footer-legal-link" data-open-legal="privacy">Política de Privacidade (LGPD)</button>
            <button type="button" class="footer-legal-link" data-open-legal="cookies">Diretrizes de Cookies AdSense</button>
            <a href="mailto:privacidade@marecerta.com.br" class="footer-legal-link">Encarregado DPO (Contato) ↗</a>
            <a href="https://wa.me/5583988841996" target="_blank" rel="noreferrer" class="footer-legal-link">📞 Parcerias: (83) 9 8884-1996</a>
          </nav>
        </div>`;

html = replace(html, '<footer>', locationLoaderAndFooterBannerHtml);
html = replace(html, oldFooterInnerHtml, enrichedFooterInnerHtml);
html = replace(
  html,
  '<p class="location-note">O local escolhido fica salvo neste aparelho.</p>',
  `<p class="location-note">O local escolhido fica salvo neste aparelho.</p>
            <button id="setAsProfileDefaultLocBtn" class="set-profile-loc-btn" type="button" hidden>⚓ Salvar esta praia como padrão no meu perfil</button>`
);

// Inject PRO Club Bar + Community KPIs & Fisherman Achievements into #rankingPanel
const achievementsHtml = `<section id="proClubBar" class="card pro-club-bar" aria-label="Clube Pescador PRO e Assinatura Mercado Pago">
          <div class="pro-club-copy">
            <div class="pro-club-badges">
              <span class="eyebrow">REDE SOCIAL DO PESCADOR · CLUBE PRO</span>
              <span id="proCurrentStatusPill" class="pro-status-pill is-free">🔒 Conta Gratuita (Modo Leitura no Feed)</span>
            </div>
            <h2>Faça parte da nossa família de pescadores e compartilhe seus troféus.</h2>
            <p>Conecte-se com quem ama a pesca costeira: poste fotos dos seus melhores peixes, troque dicas de isca e praia nos comentários, acompanhe amigos de areia e destaque sua jornada com o selo oficial da comunidade.</p>
          </div>
          <div class="pro-club-actions">
            <button id="openProModalBtn" class="primary-button pro-cta-btn" type="button">⚡ Assinar PRO · R$ 8,33/mês</button>
            <button id="openAdminProBtn" class="admin-panel-trigger-btn" type="button">🛡️ Painel Admin: Liberar PRO Grátis</button>
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
html = replace(html, '<div class="table-scroll">', '<div id="rankingTopPodium" class="ranking-top-podium" hidden></div>\n            <div class="table-scroll">');

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

const trophyPhotoUploadFieldHtml = `<label>Comentário / relato da captura (opcional)
                <textarea id="captureCommentInput" name="captureComment" rows="2" maxlength="300" placeholder="Conte como foi a pescaria: isca usada, maré, distância do arremesso ou detalhe especial…"></textarea>
              </label>
              <div class="trophy-upload-box">
                <div class="trophy-upload-top">
                  <span>📸 Foto do seu troféu</span>
                  <span id="photoProLockBadge" class="photo-pro-badge locked">🔒 Recurso da Família PRO</span>
                </div>
                <input id="capturePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                <button id="capturePhotoTriggerBtn" class="trophy-upload-btn" type="button">
                  <span>Selecionar ou Tirar Foto do Peixe</span>
                  <small>Mostre seu troféu para toda a nossa família de pescadores</small>
                </button>
                <div id="capturePhotoPreviewWrap" class="trophy-photo-preview" hidden>
                  <img id="capturePhotoPreviewImg" src="" alt="Prévia da foto do troféu" />
                  <button id="removeCapturePhotoBtn" class="text-button is-danger-text" type="button">🗑️ Apagar foto da captura</button>
                </div>
                <small id="capturePhotoStatus" class="photo-compression-status">Compartilhe a foto da sua pescaria com a comunidade</small>
              </div>
              <div class="capture-form-actions-row">
                <button class="primary-button" type="submit">Salvar captura</button>
                <button id="deleteCaptureInEditBtn" class="text-button is-danger-text delete-capture-edit-btn" type="button" hidden>🗑️ Apagar esta publicação</button>
              </div>`;

html = replace(html, '<button class="primary-button" type="submit">Salvar captura</button>', trophyPhotoUploadFieldHtml);
html = replace(html, '<button id="cancelCaptureEdit" class="text-button" type="button" hidden>Cancelar edição</button>', '<button id="cancelCaptureEdit" class="text-button" type="button" hidden>Cancelar edição</button>');

html = replace(html, '<section id="myCapturesSection"', `<section class="b-capture-filters card" aria-labelledby="captureFiltersTitle"><div><p class="eyebrow">SEU DIÁRIO, MAIS PERTO</p><h2 id="captureFiltersTitle">Procure amigos de pesca e veja troféus</h2></div><form id="captureFilterForm"><label>Espécie<input id="filterSpecies" type="search" placeholder="Ex.: pampo" autocomplete="off"></label><label>Local<div class="autocomplete-wrapper"><input id="filterLocation" type="search" placeholder="Ex.: Intermares, Santos..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-form-type="other" /><div id="filterLocationResults" class="ext-loc-dropdown" hidden role="listbox"></div></div></label><label>De<input id="filterFrom" type="date"></label><label>Até<input id="filterTo" type="date"></label><button id="clearCaptureFilters" type="button">Limpar filtros</button></form><p id="captureFilterResult" role="status">Carregando o feed social…</p></section>\n        <section id="myCapturesSection"`);

html = replace(html, '<p class="eyebrow">DIÁRIO DA COMUNIDADE</p><h2 id="catchesTitle">Capturas recentes</h2>', '<p class="eyebrow">FEED SOCIAL DA COMUNIDADE · TROFÉUS, RESPOSTAS & SEGUIDORES</p><h2 id="catchesTitle">Feed de capturas & troféus</h2>');

const coastalDatalistHtml = `<datalist id="coastalSpotsDatalist">
  <option value="Praia do Bessa · João Pessoa, PB"></option>
  <option value="Intermares · Cabedelo, PB"></option>
  <option value="Santos · São Paulo, SP"></option>
  <option value="Ubatuba · São Paulo, SP"></option>
  <option value="Guarujá · São Paulo, SP"></option>
  <option value="São Sebastião · São Paulo, SP"></option>
  <option value="Ilhabela · São Paulo, SP"></option>
  <option value="Praia Grande · São Paulo, SP"></option>
  <option value="Bertioga · São Paulo, SP"></option>
  <option value="Copacabana · Rio de Janeiro, RJ"></option>
  <option value="Arraial do Cabo · Rio de Janeiro, RJ"></option>
  <option value="Búzios · Rio de Janeiro, RJ"></option>
  <option value="Angra dos Reis · Rio de Janeiro, RJ"></option>
  <option value="Niterói · Rio de Janeiro, RJ"></option>
  <option value="Recife · Pernambuco, PE"></option>
  <option value="Porto de Galinhas · Pernambuco, PE"></option>
  <option value="Fernando de Noronha · Pernambuco, PE"></option>
  <option value="Salvador · Bahia, BA"></option>
  <option value="Ilhéus · Bahia, BA"></option>
  <option value="Porto Seguro · Bahia, BA"></option>
  <option value="Florianópolis · Santa Catarina, SC"></option>
  <option value="Balneário Camboriú · Santa Catarina, SC"></option>
  <option value="Itajaí · Santa Catarina, SC"></option>
  <option value="Natal · Rio Grande do Norte, RN"></option>
  <option value="Pipa · Rio Grande do Norte, RN"></option>
  <option value="Fortaleza · Ceará, CE"></option>
  <option value="Vitória · Espírito Santo, ES"></option>
  <option value="Vila Velha · Espírito Santo, ES"></option>
  <option value="Guarapari · Espírito Santo, ES"></option>
  <option value="Maceió · Alagoas, AL"></option>
  <option value="Maragogi · Alagoas, AL"></option>
</datalist>`;

html = replace(html, '<label>Local<input name="location" maxlength="100" required placeholder="Praia, rio ou cidade" /></label>', `<label>Local<input name="location" list="coastalSpotsDatalist" maxlength="100" required placeholder="Praia, rio ou cidade (busque a praia)" /></label>${coastalDatalistHtml}`);

// Upgrade #accountProfile inside #accountDialog into a Complete Fisherman Profile
const richAccountProfileHtml = `<div id="accountProfile" class="rich-account-profile" hidden>
          <div id="myRichProfileContainer" class="my-rich-profile">
            <div class="my-profile-header-card">
              <div class="my-profile-avatar-col">
                <div id="myProfileAvatarPreview" class="my-profile-avatar-box">
                  <span class="my-profile-avatar-initials">P</span>
                </div>
                <input id="myProfileAvatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                <button id="myProfileAvatarBtn" class="profile-avatar-upload-btn" type="button">📷 Foto do perfil</button>
              </div>
              <div class="my-profile-main-info">
                <p class="eyebrow">PERFIL DO PESCADOR · SUA CONTA</p>
                <div class="my-profile-title-row">
                  <h2 id="profileName"></h2>
                  <span id="myProfileProBadge" class="free-member-badge">🔒 GRATUITO</span>
                </div>
                <p id="profileEmail" class="my-profile-email"></p>
                <div class="my-profile-loc-container">
                  <p id="myProfileLocationBadge" class="my-profile-loc">📍 Adicione sua localidade abaixo</p>
                  <button type="button" id="myProfileForecastLinkBtn" class="profile-loc-link-btn" title="Abrir previsão da praia no Início" hidden>🎣 Ver previsão no Início</button>
                </div>
                <p id="myProfileBioLine" class="my-profile-bio">🏆 Destaque suas maiores conquistas na pesca.</p>
                <div id="myProfileSocialLinksBar" class="fisher-profile-socials" hidden></div>
              </div>
            </div>

            <div class="fisher-profile-stats-bar">
              <div class="profile-stat-box">
                <strong id="myProfileFollowersCount">0</strong>
                <span>Seguidores</span>
              </div>
              <div class="profile-stat-box">
                <strong id="myProfileFollowingCount">0</strong>
                <span>Seguindo</span>
              </div>
              <div class="profile-stat-box">
                <strong id="myProfileMedalsCount">0 / 6</strong>
                <span>Medalhas Costeiras</span>
              </div>
              <div class="profile-stat-box">
                <strong id="myProfileBestWeight">—</strong>
                <span>Maior Troféu</span>
              </div>
            </div>

            <details class="profile-edit-accordion" open>
              <summary>✏️ Editar Perfil, Localidade, Redes Sociais &amp; Telefone</summary>
              <form id="extendedProfileForm" class="extended-profile-form" autocomplete="off">
                <div class="form-grid">
                  <label>Nome público
                    <input name="extDisplayName" maxlength="40" minlength="2" required placeholder="Seu nome no ranking e feed" />
                  </label>
                  <div class="form-group-loc">
                    <label for="extLocationInput">Localidade (Cidade / Praia principal)
                      <div class="input-with-action-row">
                        <div class="autocomplete-wrapper">
                          <input name="extLocation" id="extLocationInput" type="search" maxlength="80" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-form-type="other" placeholder="Digite para buscar praia ou cidade (Ex.: Santos, Bessa, Ubatuba...)" />
                          <div id="extLocationResults" class="ext-loc-dropdown" hidden role="listbox"></div>
                        </div>
                        <button type="button" id="extUseForecastLocBtn" class="ext-loc-preset-btn" title="Preencher com o local atual selecionado na Previsão">📍 Praia Atual</button>
                      </div>
                    </label>
                    <label class="ext-sync-checkbox">
                      <input type="checkbox" id="extSyncForecastCheckbox" name="syncWithForecast" checked />
                      <span>⚓ Vincular como local padrão de pesca na tela inicial</span>
                    </label>
                  </div>
                </div>
                <label>Maiores conquistas / Bio do pescador
                  <input name="extBio" maxlength="160" placeholder="Ex.: Robalo de 4,5 kg no 2º valão · Surfcasting" />
                </label>
                <div class="form-grid">
                  <label>Instagram (opcional)
                    <input name="extInstagram" maxlength="60" placeholder="Ex.: @seu_instagram" />
                  </label>
                  <label>YouTube / TikTok / Outra rede (opcional)
                    <input name="extSocial2" maxlength="60" placeholder="Ex.: @seucanal" />
                  </label>
                </div>
                <label>Telefone / WhatsApp (opcional do perfil)
                  <input name="extPhone" type="tel" maxlength="25" placeholder="Ex.: (83) 99999-9999 (opcional)" />
                </label>
                <div class="extended-profile-actions">
                  <button class="primary-button" type="submit">💾 Salvar dados do perfil</button>
                  <span id="extendedProfileSavedMsg" class="profile-saved-pill" hidden>✓ Perfil atualizado!</span>
                </div>
              </form>
            </details>

            <section class="profile-section-block">
              <div class="profile-section-head">
                <h3>🏆 Maiores Conquistas &amp; Medalhas Costeiras (Achievements)</h3>
              </div>
              <div id="myProfileAchievementsSummary" class="profile-records-row"></div>
              <div id="myProfileMedalsList" class="profile-medals-strip"></div>
            </section>

            <section class="profile-section-block">
              <div class="profile-section-head">
                <div>
                  <h3>📸 Galeria das Fotos Postadas &amp; Troféus</h3>
                  <small id="myProfileGalleryCount" class="profile-gallery-count">0 foto(s)</small>
                </div>
                <div>
                  <input id="myProfileTrophyInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
                  <button id="addProfileTrophyBtn" class="secondary-share-btn profile-add-trophy-btn" type="button">➕ Adicionar foto de troféu</button>
                </div>
              </div>
              <div id="myProfileGalleryGrid" class="profile-gallery-grid"></div>
            </section>
          </div>

          <form id="profileForm" hidden><label>Nome público<input name="displayName" required minlength="2" maxlength="40" autocomplete="nickname" /></label><button class="primary-button" type="submit">Concluir perfil</button></form>
          <p id="profileStatus" class="form-message" role="status"></p>
          <div class="account-bottom-actions">
            <button id="openAdminFromAccountBtn" class="admin-panel-trigger-btn" type="button">🛡️ Painel Admin: Selecionar Pessoas PRO Sem Pagar</button>
            <button id="logoutButton" class="text-button logout-outline-btn" type="button">Sair da conta</button>
          </div>
        </div>`;

html = html.replace(/<div id="accountProfile" hidden>[\s\S]*?<\/div>/, richAccountProfileHtml);

const enhancedAuthFormHtml = `<form id="authForm">
            <label id="nameField" hidden>Nome público<input name="displayName" maxlength="40" minlength="2" autocomplete="nickname" /></label>
            <label>E-mail<input name="email" type="email" required autocomplete="email" /></label>
            <label>Senha<input name="password" type="password" minlength="6" required autocomplete="current-password" /></label>
            <label id="confirmPasswordField" hidden>Confirmar senha<input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Repita a senha para confirmar" /></label>
            <button id="authSubmit" class="primary-button" type="submit">Entrar</button>
            <div class="auth-social-wrap">
              <div class="auth-divider-line"><span>ou continue com</span></div>
              <button id="googleAuthBtn" class="google-auth-btn" type="button">
                <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span id="googleAuthBtnText">Entrar com Google</span>
              </button>
            </div>
          </form>`;

html = replace(html, '<form id="authForm"><label id="nameField" hidden>Nome público<input name="displayName" maxlength="40" minlength="2" autocomplete="nickname" /></label><label>E-mail<input name="email" type="email" required autocomplete="email" /></label><label>Senha<input name="password" type="password" minlength="6" required autocomplete="current-password" /></label><button id="authSubmit" class="primary-button" type="submit">Entrar</button></form>', enhancedAuthFormHtml);

// Add Fisherman Public Profile Dialog, Shareable Trophy Card Dialog AND Mercado Pago PRO Paywall Dialog right after #accountDialog
const shareAndPaywallDialogsHtml = `\n      <dialog id="fisherProfileDialog" class="account-dialog fisher-profile-dialog" aria-labelledby="fisherProfileTitle">
        <button id="closeFisherProfile" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <p class="eyebrow">PERFIL DO PESCADOR · COMUNIDADE MARÉ CERTA</p>
        <div id="fisherProfileBody" class="fisher-profile-body"></div>
      </dialog>

      <dialog id="shareCardDialog" class="account-dialog share-card-dialog" aria-labelledby="shareCardTitle">
        <button id="closeShareCard" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <p class="eyebrow">TROFÉU DIGITAL · STORIES & WHATSAPP</p>
        <h2 id="shareCardTitle">Compartilhar captura</h2>
        <div class="trophy-canvas-wrap">
          <canvas id="trophyCanvas" width="1080" height="1350" aria-label="Cartão visual da captura"></canvas>
        </div>
        <div class="share-dialog-actions">
          <button id="nativeShareTrophyBtn" class="primary-button whatsapp-share-btn" type="button">🟢 Compartilhar no WhatsApp</button>
          <button id="downloadTrophyBtn" class="secondary-share-btn" type="button">⬇ Baixar Imagem</button>
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
          <li>📸 <strong>Fotos dos seus Troféus:</strong> Compartilhe suas capturas em foto para inspirar toda a nossa família de pescadores.</li>
          <li>💬 <strong>Resenha &amp; Dicas nos Posts:</strong> Troque experiências, pergunte sobre iscas e praias e comente nos troféus dos amigos.</li>
          <li>➕ <strong>Seguir Pescadores &amp; Conquistas:</strong> Acompanhe amigos de pesca de praia e exiba suas medalhas no topo do feed.</li>
          <li>👑 <strong>Selo Oficial PRO:</strong> Destaque dourado de apoiador ao lado do seu nome no Ranking e nos relatos.</li>
        </ul>

        <div class="pro-plans-grid" role="group" aria-label="Escolha seu plano Mercado Pago">
          <button type="button" class="pro-plan-card selected" data-pro-plan-select="annual" aria-pressed="true">
            <span class="pro-plan-ribbon">MAIS ESCOLHIDO · 44% DE DESCONTO</span>
            <h3>Plano Anual</h3>
            <div class="pro-plan-price">
              <strong>R$ 8,33</strong>
              <span>/ mês</span>
            </div>
            <small>Cobrado R$ 99,90 / ano via PIX ou Cartão no Mercado Pago</small>
          </button>

          <button type="button" class="pro-plan-card" data-pro-plan-select="monthly" aria-pressed="false">
            <span class="pro-plan-ribbon secondary">SEM FIDELIDADE</span>
            <h3>Plano Mensal</h3>
            <div class="pro-plan-price">
              <strong>R$ 14,90</strong>
              <span>/ mês</span>
            </div>
            <small>Cobrança mensal avulsa via PIX ou Cartão no Mercado Pago</small>
          </button>
        </div>

        <div class="pro-checkout-actions">
          <button id="mpCheckoutApproveBtn" class="mp-custom-checkout-btn" type="button" aria-label="Pague com Mercado Pago">
            <span class="mp-btn-action-label" id="mpBtnActionLabel">Pague com</span>
            <span class="mp-btn-brand-pill">
              <img src="./assets/mercado-pago-logo.png" alt="Mercado Pago" class="mp-btn-brand-img" />
            </span>
          </button>
          <div id="mpSelectedPlanSummary" class="mp-selected-plan-summary">
            Plano Anual selecionado: <strong>R$ 8,33/mês</strong> (R$ 99,90/ano via PIX ou Cartão em até 12x)
          </div>
        </div>
      </dialog>

      <!-- Dialog de Enquadramento e Zoom de Imagens (Cropper) -->
      <dialog id="imageCropperDialog" class="account-dialog image-cropper-dialog" aria-labelledby="cropperTitle">
        <button id="closeImageCropperBtn" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="cropper-head">
          <span class="compliance-badge">✂️ ENQUADRAMENTO &amp; ZOOM</span>
          <h2 id="cropperTitle">Ajustar e Enquadrar Foto</h2>
          <p id="cropperSubtitle" class="cropper-subtitle">Enquadramento 100% proporcional ao post. Use o zoom e arraste para posicionar o peixe perfeitamente.</p>
        </div>

        <div class="cropper-viewport-wrap">
          <div id="cropperViewport" class="cropper-viewport" role="region" aria-label="Área de corte da imagem">
            <img id="cropperImg" class="cropper-img" alt="Foto para ajuste" draggable="false" />
            <div id="cropperMask" class="cropper-mask is-rect" data-ratio="post">
              <div class="cropper-grid-lines">
                <span class="grid-line-h h1"></span>
                <span class="grid-line-h h2"></span>
                <span class="grid-line-v v1"></span>
                <span class="grid-line-v v2"></span>
              </div>
            </div>
          </div>
          <div class="cropper-drag-hint"><span>✥ Arraste para mover · Use a roda do mouse ou o controle abaixo para zoom</span></div>
        </div>

        <div class="cropper-controls-bar">
          <div class="cropper-zoom-row">
            <span class="zoom-label">🔍 Zoom:</span>
            <button type="button" id="cropperZoomOutBtn" class="cropper-tool-btn" title="Diminuir zoom" aria-label="Diminuir zoom">−</button>
            <input type="range" id="cropperZoomRange" min="0.7" max="3.5" step="0.02" value="1" aria-label="Nível de zoom da imagem" />
            <button type="button" id="cropperZoomInBtn" class="cropper-tool-btn" title="Aumentar zoom" aria-label="Aumentar zoom">+</button>
            <span id="cropperZoomValue" class="zoom-val-badge">1.0x</span>
          </div>

          <div class="cropper-extra-tools">
            <div id="cropperRatioOptions" class="cropper-ratio-group" hidden>
              <span class="ratio-label">Formato:</span>
              <button type="button" class="cropper-ratio-btn active" data-cropper-ratio="post" aria-pressed="true">📸 Encaixe no Post (100%)</button>
              <button type="button" class="cropper-ratio-btn" data-cropper-ratio="1:1" aria-pressed="false">1:1 Quadrado</button>
            </div>
            <button type="button" id="cropperRotateBtn" class="cropper-tool-btn cropper-rotate-btn" title="Girar 90 graus">↷ Girar 90°</button>
            <button type="button" id="cropperResetBtn" class="cropper-tool-btn cropper-reset-btn" title="Centralizar foto">↺ Centralizar</button>
          </div>
        </div>

        <div class="cropper-actions-footer">
          <button type="button" id="cropperCancelBtn" class="text-button">Cancelar</button>
          <button type="button" id="cropperApplyBtn" class="primary-button cropper-apply-btn">✓ Confirmar e Aplicar Foto</button>
        </div>
      </dialog>

      <!-- Dialog de Termos de Uso -->
      <dialog id="termsDialog" class="account-dialog legal-dialog" aria-labelledby="termsDialogTitle">
        <button id="closeTermsDialog" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="legal-dialog-head">
          <span class="compliance-badge">DOCUMENTO OFICIAL · MARÉ CERTA</span>
          <h2 id="termsDialogTitle">Termos de Uso do Serviço</h2>
          <p class="legal-dialog-meta">Última atualização: Outubro de 2026 · Válido para a plataforma web e aplicativo PWA.</p>
        </div>
        <div class="legal-dialog-content">
          <section>
            <h3>1. Aceitação dos Termos</h3>
            <p>Ao acessar, navegar ou utilizar a plataforma Maré Certa, você concorda expressamente com as disposições destes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer termo, recomendamos não utilizar os serviços.</p>
          </section>

          <section>
            <h3>2. Natureza Informativa e Estimativa das Previsões</h3>
            <p>O Maré Certa é uma ferramenta digital desenvolvida para auxiliar pescadores amadores e esportivos no planejamento de suas jornadas de pesca costeira e surfcasting. As informações de tábuas de maré, alturas de preamar e baixa-mar, períodos solunares, ventos, ondas e janelas de pesca baseiam-se em modelos matemáticos e dados públicos (como Marinha do Brasil/DHN, Open-Meteo e DWD).</p>
            <p class="legal-callout"><strong>Atenção à Segurança:</strong> Todas as previsões são estimativas e não substituem avisos de ressaca da Capitania dos Portos, da Defesa Civil ou a observação direta das condições reais do mar. A segurança na beira da praia, costão ou em embarcações é de exclusiva responsabilidade de cada pescador.</p>
          </section>

          <section>
            <h3>3. Diário de Capturas e Diretrizes da Comunidade</h3>
            <p>A comunidade Maré Certa promove a pesca esportiva consciente. Ao registrar pescarias e compartilhar troféus, o usuário compromete-se a:</p>
            <ul>
              <li>Fornecer informações verídicas sobre espécies, datas, locais e pesos informados;</li>
              <li>Respeitar integralmente a legislação ambiental brasileira (Lei nº 9.605/98), os períodos de defeso vigentes e os tamanhos mínimos de captura estipulados pelo IBAMA e Ministério da Pesca e Aquicultura;</li>
              <li>Não publicar imagens contendo violência gratuita contra animais, descarte inadequado de lixo na praia ou condutas predatórias;</li>
              <li>Manter postura respeitosa nos comentários dos posts, sendo vedado qualquer conteúdo de assédio, preconceito, ódio ou publicidade não autorizada (spam).</li>
            </ul>
            <p>A moderação reserva-se o direito de remover registros e comentários incompatíveis com estas diretrizes e suspender contas reincidentes.</p>
          </section>

          <section>
            <h3>4. Propriedade Intelectual e Licença de Imagens</h3>
            <p>Todo o design, algoritmo das janelas de pesca, marcas e identidade visual pertencem ao Maré Certa. O pescador mantém todos os direitos autorais sobre as fotografias de capturas que enviar, concedendo à plataforma uma licença não exclusiva, gratuita e mundial para exibi-las no Feed da Comunidade, na Galeria de Troféus e nos Cards de Histórias gerados para redes sociais.</p>
          </section>

          <section>
            <h3>5. Publicidade, Google AdSense e Clube PRO</h3>
            <p>A gratuidade da consulta de marés e das funcionalidades essenciais é viabilizada pela veiculação de anúncios publicitários em parceria com o <strong>Google AdSense</strong>. Ao utilizar a versão gratuita, você reconhece e aceita a exibição desses anúncios. Assinantes do Clube Pescador PRO contam com recursos sociais ampliados, mantendo-se sujeitos às mesmas diretrizes de uso ético da comunidade.</p>
          </section>

          <section>
            <h3>6. Alterações nos Termos e Foro</h3>
            <p>Estes termos podem ser atualizados a qualquer momento para refletir novas funcionalidades ou adequações legais. Eventuais controvérsias serão dirimidas no foro da Comarca de João Pessoa, Estado da Paraíba, com renúncia a qualquer outro.</p>
          </section>
        </div>
        <div class="legal-dialog-footer">
          <button id="termsAgreeBtn" class="primary-button" type="button">Entendi e Aceito os Termos</button>
        </div>
      </dialog>

      <!-- Dialog de Política de Privacidade e LGPD -->
      <dialog id="privacyDialog" class="account-dialog legal-dialog" aria-labelledby="privacyDialogTitle">
        <button id="closePrivacyDialog" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="legal-dialog-head">
          <span class="compliance-badge">LGPD · LEI 13.709/2018 · GOOGLE ADSENSE</span>
          <h2 id="privacyDialogTitle">Política de Privacidade &amp; Proteção de Dados</h2>
          <p class="legal-dialog-meta">Transparência total sobre como tratamos seus dados e utilizamos cookies do Google AdSense.</p>
        </div>
        <div class="legal-dialog-content">
          <section>
            <h3>1. Identificação do Controlador e Encarregado (DPO)</h3>
            <p>A plataforma <strong>Maré Certa</strong> atua como controladora dos dados pessoais tratados no âmbito de seus serviços. Para dúvidas, solicitações ou exercício de direitos de privacidade, entre em contato diretamente com nosso Encarregado de Proteção de Dados pelo canal: <a href="mailto:privacidade@marecerta.com.br">privacidade@marecerta.com.br</a>.</p>
          </section>

          <section>
            <h3>2. Dados Pessoais Coletados e Finalidades</h3>
            <p>Coletamos apenas as informações estritamente necessárias para o funcionamento do serviço e da comunidade de pescadores:</p>
            <ul>
              <li><strong>Dados de Autenticação:</strong> E-mail, nome público de pescador e credencial criptografada para acesso à conta (via Firebase Auth);</li>
              <li><strong>Dados do Perfil do Pescador:</strong> Localidade preferida (cidade/praia), biografia curta, foto de perfil, redes sociais e telefone/WhatsApp (opcionais, configurados livremente pelo titular);</li>
              <li><strong>Dados de Pescarias e Capturas:</strong> Espécie capturada, quantidade, peso estimado, data, praia/ponto de pesca, relato da pescaria e fotografia do troféu;</li>
              <li><strong>Dados Técnicos e Preferências Locais:</strong> Endereço IP anonimizado, dados analíticos de desempenho e ponto de pesca selecionado para salvar em seu navegador via <code>localStorage</code>.</li>
            </ul>
          </section>

          <section class="legal-highlight-box">
            <h3>3. Google AdSense, Cookies de Publicidade e Tecnologias de Terceiros</h3>
            <p>Para financiar a infraestrutura gratuita de tábuas de maré, o Maré Certa utiliza o programa de publicidade <strong>Google AdSense</strong>. De acordo com as políticas do Google para editores e a legislação vigente, informamos que:</p>
            <ul>
              <li><strong>Cookies de Terceiros:</strong> O Google, como fornecedor terceirizado, utiliza cookies (incluindo o cookie DART / DoubleClick) para veicular anúncios neste site;</li>
              <li><strong>Anúncios Personalizados:</strong> Com esses cookies, o Google e seus parceiros podem veicular anúncios para você com base nas suas visitas ao Maré Certa e/ou a outros sites na Internet;</li>
              <li><strong>Como Desativar a Publicidade Personalizada:</strong> Você pode desativar anúncios personalizados do Google a qualquer momento acessando a página oficial de <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">Configurações de Anúncios do Google (Google Ads Settings) ↗</a>. Alternativamente, você pode desativar o uso de cookies de fornecedores terceiros acessando o portal de autorregulamentação <a href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">AboutAds.info ↗</a>.</li>
            </ul>
          </section>

          <section>
            <h3>4. Bases Legais e Direitos do Titular (LGPD)</h3>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (Art. 18 da Lei Federal nº 13.709/2018), todo pescador titular de dados tem o direito de, a qualquer momento:</p>
            <ul>
              <li><strong>Confirmar a existência</strong> de tratamento e acessar os dados associados à sua conta;</li>
              <li><strong>Corrigir</strong> dados incompletos, inexatos ou desatualizados diretamente na aba do seu Perfil;</li>
              <li><strong>Solicitar a eliminação</strong> de suas capturas, fotos ou o cancelamento integral de sua conta (botão de excluir captura no diário ou por e-mail ao DPO);</li>
              <li><strong>Revogar o consentimento</strong> a qualquer momento sobre cookies de publicidade não essenciais.</li>
            </ul>
          </section>

          <section>
            <h3>5. Armazenamento Seguro e Otimização</h3>
            <p>Os dados são transmitidos com criptografia SSL/TLS e processados sob regras estritas de segurança em nuvem. As fotos de troféus enviadas passam por compressão WebP de alta eficiência diretamente no navegador do usuário, reduzindo consumo de dados de internet móvel na praia.</p>
          </section>
        </div>
        <div class="legal-dialog-footer">
          <button id="privacyAgreeBtn" class="primary-button" type="button">Entendi a Política de Privacidade</button>
        </div>
      </dialog>

      <!-- Banner de Consentimento de Cookies da LGPD -->
      <aside id="cookieConsentBanner" class="cookie-consent-banner" aria-label="Aviso de Privacidade e Cookies LGPD" hidden>
        <div class="cookie-banner-content">
          <div class="cookie-banner-text">
            <span class="cookie-banner-icon" aria-hidden="true">🍪</span>
            <p>
              <strong>Privacidade e cookies no Maré Certa:</strong> Utilizamos cookies essenciais e tecnologias do <strong>Google AdSense</strong> para personalizar anúncios de pesca e analisar audiência, de acordo com a <strong>LGPD (Lei 13.709/18)</strong>.
            </p>
          </div>
          <div class="cookie-banner-actions">
            <button type="button" class="cookie-btn-link" data-open-legal="privacy">Privacidade (LGPD)</button>
            <button type="button" class="cookie-btn-link" data-open-legal="terms">Termos de Uso</button>
            <button type="button" id="acceptAllCookiesBtn" class="primary-button cookie-btn-accept">Aceitar e Continuar</button>
          </div>
        </div>
      </aside>

      <!-- Modal de Instalação do Aplicativo (PWA / Adicionar à Tela de Início) -->
      <dialog id="pwaInstallDialog" class="account-dialog pwa-install-dialog" aria-labelledby="pwaInstallDialogTitle">
        <button id="closePwaInstallDialog" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="pwa-dialog-hero">
          <div class="pwa-homescreen-Preview">
            <div class="pwa-app-icon-showcase">
              <img src="./assets/pwa-app-icon.jpg" width="96" height="96" alt="Ícone do Aplicativo Maré Certa na Tela Inicial" />
              <span class="pwa-icon-label">Maré Certa</span>
            </div>
          </div>
          <div class="pwa-dialog-copy">
            <span class="eyebrow">📲 WEB APP OFICIAL · ACESSO RÁPIDO NA PRAIA</span>
            <h2 id="pwaInstallDialogTitle">Salve o Maré Certa na sua Tela Inicial</h2>
            <p>Tenha o aplicativo oficial com o ícone exclusivo na home do seu celular ou computador. Abre em tela cheia, carrega instantaneamente na areia e não consome espaço de armazenamento.</p>
          </div>
        </div>

        <div id="pwaNativePromptBox" class="pwa-native-prompt-box" hidden>
          <button id="pwaTriggerNativeBtn" class="primary-button pwa-native-cta-btn" type="button">
            ⚡ Instalar Aplicativo Agora (1 Toque)
          </button>
          <small>Instalação direta verificada pelo navegador</small>
        </div>

        <div class="pwa-platform-tabs" role="tablist" aria-label="Instruções por sistema">
          <button type="button" class="pwa-plat-tab is-active" data-pwa-tab="android" role="tab" aria-selected="true">🤖 Android (Chrome)</button>
          <button type="button" class="pwa-plat-tab" data-pwa-tab="ios" role="tab" aria-selected="false">🍎 iPhone / iPad (Safari)</button>
          <button type="button" class="pwa-plat-tab" data-pwa-tab="desktop" role="tab" aria-selected="false">💻 Computador</button>
        </div>

        <div id="pwaGuideAndroid" class="pwa-guide-panel" data-pwa-panel="android">
          <ol class="pwa-steps-list">
            <li>
              <span class="pwa-step-num">1</span>
              <div>
                <strong>Toque no menu do navegador (⋮)</strong>
                <p>No canto superior direito do Google Chrome ou Samsung Internet, toque nos três pontinhos.</p>
              </div>
            </li>
            <li>
              <span class="pwa-step-num">2</span>
              <div>
                <strong>Escolha "Instalar aplicativo" ou "Adicionar à tela inicial"</strong>
                <p>O ícone do peixe do <strong>Maré Certa</strong> será exibido na confirmação.</p>
              </div>
            </li>
            <li>
              <span class="pwa-step-num">3</span>
              <div>
                <strong>Confirme em "Instalar"</strong>
                <p>Pronto! O app ficará salvo junto aos seus aplicativos favoritos na tela inicial.</p>
              </div>
            </li>
          </ol>
        </div>

        <div id="pwaGuideIos" class="pwa-guide-panel" data-pwa-panel="ios" hidden>
          <ol class="pwa-steps-list">
            <li>
              <span class="pwa-step-num">1</span>
              <div>
                <strong>Toque no botão Compartilhar <span class="pwa-inline-badge">􀈂 Compartilhar ⬆️</span></strong>
                <p>Na barra inferior do Safari (iPhone) ou superior (iPad), toque no ícone de quadrado com uma seta para cima.</p>
              </div>
            </li>
            <li>
              <span class="pwa-step-num">2</span>
              <div>
                <strong>Role a lista e toque em "Adicionar à Tela de Início" <span class="pwa-inline-badge">＋ Adicionar à Tela de Início</span></strong>
                <p>Você verá o ícone azul do peixe e o nome <strong>Maré Certa</strong>.</p>
              </div>
            </li>
            <li>
              <span class="pwa-step-num">3</span>
              <div>
                <strong>Toque em "Adicionar" no canto superior direito</strong>
                <p>O aplicativo aparecerá imediatamente na home do seu iPhone!</p>
              </div>
            </li>
          </ol>
        </div>

        <div id="pwaGuideDesktop" class="pwa-guide-panel" data-pwa-panel="desktop" hidden>
          <ol class="pwa-steps-list">
            <li>
              <span class="pwa-step-num">1</span>
              <div>
                <strong>Clique no ícone de instalação na barra de endereços 🖥️</strong>
                <p>No Chrome ou Edge, clique no ícone de computador com uma seta (ao lado da estrela de favoritos no topo).</p>
              </div>
            </li>
            <li>
              <span class="pwa-step-num">2</span>
              <div>
                <strong>Confirme em "Instalar" ou use <kbd>Ctrl</kbd> + <kbd>D</kbd> para Favoritar</strong>
                <p>O Maré Certa abrirá em uma janela dedicada e criará um atalho na sua Área de Trabalho ou Barra de Tarefas.</p>
              </div>
            </li>
          </ol>
        </div>

        <div class="pwa-dialog-footer">
          <div class="pwa-benefits-pills">
            <span>✓ Ícone exclusivo na Home</span>
            <span>✓ Tela cheia sem barras</span>
            <span>✓ Rápido na praia</span>
          </div>
          <button id="pwaDialogDoneBtn" class="primary-button" type="button">Entendi, obrigado!</button>
        </div>
      </dialog>

      <!-- Diálogo de Denúncia de Comentário Abusivo ao Admin -->
      <dialog id="reportCommentDialog" class="account-dialog report-dialog" aria-labelledby="reportCommentDialogTitle">
        <button id="closeReportCommentDialog" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="report-dialog-head">
          <span class="compliance-badge">🛡️ MODERAÇÃO E SEGURANÇA DA COMUNIDADE</span>
          <h2 id="reportCommentDialogTitle">Denunciar Comentário ao Administrador</h2>
          <p class="legal-dialog-meta">Relate ofensas, desrespeito, ameaças, spam ou pesca irregular. Sua denúncia será analisada diretamente pelo Administrador no painel de controle.</p>
        </div>
        <div class="report-comment-preview card">
          <small>Comentário a ser denunciado:</small>
          <blockquote id="reportTargetCommentText">""</blockquote>
          <div class="report-target-author">Autor: <strong id="reportTargetAuthorName">Pescador</strong></div>
        </div>
        <form id="reportCommentForm" class="report-comment-form">
          <input type="hidden" name="reportPostId" id="reportPostIdInput" />
          <input type="hidden" name="reportCommentId" id="reportCommentIdInput" />
          <input type="hidden" name="reportOffenderUid" id="reportOffenderUidInput" />
          <input type="hidden" name="reportOffenderName" id="reportOffenderNameInput" />
          <label for="reportReasonInput">Descreva o que ocorreu (motivo da denúncia) *
            <textarea id="reportReasonInput" name="reportReason" rows="3" required placeholder="Escreva detalhadamente o ocorrido para análise do administrador..."></textarea>
          </label>
          <div class="report-dialog-actions">
            <button type="button" id="cancelReportBtn" class="text-button">Cancelar</button>
            <button type="submit" class="primary-button is-danger-btn">🚩 Enviar Denúncia ao Admin</button>
          </div>
        </form>
      </dialog>

      <!-- Painel Administrativo: Gestão de Contas PRO / VIP Sem Custo -->
      <dialog id="adminProDialog" class="account-dialog admin-pro-dialog" aria-labelledby="adminProDialogTitle">
        <button id="closeAdminProDialog" class="close-dialog" type="button" aria-label="Fechar">×</button>
        <div class="admin-dialog-head">
          <div class="admin-head-badges">
            <span class="compliance-badge">🛡️ CONTA DE ADMINISTRADOR · GESTÃO DE COMUNIDADE</span>
            <span class="admin-zero-cost-pill">👑 Liberação PRO 100% Gratuita (R$ 0)</span>
          </div>
          <h2 id="adminProDialogTitle">Painel Admin — Selecionar Pessoas Premium Sem Pagar</h2>
          <p class="legal-dialog-meta">Conceda ou revogue o acesso <strong>Clube Pescador PRO (Cortesia / VIP)</strong> para pescadores parceiros, amigos, embaixadores ou membros da comunidade sem necessidade de pagamento no Mercado Pago.</p>
        </div>

        <div class="admin-sync-bar" role="region" aria-label="Sincronização em tempo real">
          <div class="admin-sync-info">
            <span class="admin-sync-dot" aria-hidden="true"></span>
            <span id="adminSyncStatusText">Sincronização em tempo real ativa</span>
            <span id="adminSyncCountdown" class="admin-sync-countdown">· Atualizando em 15s</span>
          </div>
          <div class="admin-sync-actions">
            <button id="adminRefreshNowBtn" class="admin-refresh-btn" type="button" title="Buscar novas contas e capturas no Firebase agora">
              <span class="refresh-icon" aria-hidden="true">🔄</span> <span>Atualizar agora</span>
            </button>
            <label class="admin-auto-refresh-toggle" title="Ativar ou pausar atualização automática a cada 15 segundos">
              <input type="checkbox" id="adminAutoRefreshCheck" checked />
              <span>A cada 15s</span>
            </label>
          </div>
        </div>

        <div class="admin-kpi-strip">
          <div class="admin-kpi-box">
            <strong id="adminTotalUsersCount">0</strong>
            <span>Pescadores na Lista</span>
          </div>
          <div class="admin-kpi-box is-gold">
            <strong id="adminTotalVipCount">0</strong>
            <span>Com PRO Grátis Ativo</span>
          </div>
          <div class="admin-kpi-box is-danger">
            <strong id="adminTotalBannedCount">0</strong>
            <span>Banidos / Excluídos</span>
          </div>
          <div class="admin-kpi-box is-danger">
            <strong id="adminTotalReportsCount">0</strong>
            <span>Denúncias Pendentes</span>
          </div>
          <div class="admin-kpi-box">
            <strong id="adminMyCurrentStatus">Padrão</strong>
            <span>Sua Conta Atual</span>
          </div>
        </div>

        <div class="admin-self-quick-bar">
          <div>
            <strong>⚡ Atalho para sua própria conta</strong>
            <small>Libere ou teste o status PRO Cortesia imediatamente no seu usuário atual.</small>
          </div>
          <button id="adminGrantCurrentMeBtn" class="primary-button admin-self-btn" type="button">
            👑 Liberar PRO Grátis na Minha Conta Atual
          </button>
        </div>

        <form id="adminGrantByEmailForm" class="admin-grant-form">
          <div class="admin-form-title">➕ Adicionar / Pré-Aprovar Pessoa por Nome ou E-mail</div>
          <div class="admin-form-grid">
            <label>Nome do pescador(a)
              <input name="vipName" maxlength="50" placeholder="Ex.: João Pescador" required />
            </label>
            <label>E-mail da conta (ou identificador)
              <input name="vipEmail" type="text" maxlength="80" placeholder="Ex.: joao@email.com" required />
            </label>
            <label>Categoria da Cortesia
              <select name="vipRole">
                <option value="PRO Cortesia (Liberado pelo Admin)">👑 PRO Cortesia (Sem Custo)</option>
                <option value="Parceiro Oficial · VIP">⚓ Parceiro Oficial · VIP</option>
                <option value="Embaixador Maré Certa">🏆 Embaixador Maré Certa</option>
                <option value="Convidado da Família PRO">🎣 Convidado da Família PRO</option>
              </select>
            </label>
            <label>Duração do Premium
              <select name="vipDuration">
                <option value="3">3 dias (Degustação)</option>
                <option value="30">1 mês (30 dias)</option>
                <option value="365" selected>1 ano (365 dias)</option>
                <option value="3650">Vitalício / Cortesia Indeterminada</option>
              </select>
            </label>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="primary-button">👑 Conceder Premium Sem Pagar</button>
            <span id="adminGrantFeedback" class="profile-saved-pill" hidden>✓ Acesso PRO Cortesia liberado!</span>
          </div>
        </form>

        <div class="admin-users-section">
          <div class="admin-users-toolbar">
            <input id="adminUserSearchInput" type="search" placeholder="🔍 Buscar pescador por nome, e-mail ou praia…" autocomplete="off" />
            <div class="admin-filter-pills" role="group" aria-label="Filtrar usuários">
              <button type="button" class="admin-filter-btn is-active" data-admin-filter="all" aria-pressed="true">Todos</button>
              <button type="button" class="admin-filter-btn" data-admin-filter="vip" aria-pressed="false">👑 Com PRO Grátis</button>
              <button type="button" class="admin-filter-btn" data-admin-filter="free" aria-pressed="false">🔒 Contas Gratuitas</button>
              <button type="button" class="admin-filter-btn" data-admin-filter="banned" aria-pressed="false">🚫 Banidos / Excluídos</button>
            </div>
          </div>
          <div id="adminUsersList" class="admin-users-list" role="region" aria-live="polite"></div>
        </div>

        <section class="admin-word-filter-section" aria-labelledby="adminWordFilterTitle">
          <div class="admin-word-filter-head">
            <div>
              <h3 id="adminWordFilterTitle">🛡️ Filtro Automático de Palavras Proibidas e Ilícitas</h3>
              <p class="legal-dialog-meta">Postagens, relatos de captura, perfis e comentários contendo palavrões, pesca predatória (bomba, rede de arrasto, defeso), golpes ou drogas são bloqueados automaticamente.</p>
            </div>
            <span id="adminBlockedWordsCount" class="admin-source-tag">0 termos bloqueados</span>
          </div>
          <form id="adminWordFilterForm" class="admin-word-filter-form">
            <input name="blockedWord" type="text" maxlength="40" placeholder="Adicionar palavra ou expressão proibida (ex.: tarrafa ilegal)…" required />
            <button type="submit" class="primary-button">➕ Bloquear Termo</button>
            <span id="adminWordFilterFeedback" class="profile-saved-pill" hidden>✓ Termo adicionado!</span>
          </form>
          <div id="adminProhibitedWordsList" class="admin-prohibited-words-list" aria-label="Lista de palavras bloqueadas"></div>
        </section>

        <section class="admin-reports-section" aria-labelledby="adminReportsTitle">
          <div class="admin-reports-head">
            <div>
              <h3 id="adminReportsTitle">🚨 Denúncias de Comentários Recebidas</h3>
              <p class="legal-dialog-meta">Comentários denunciados por donos de postagens e pescadores da comunidade. Veja o autor, o comentário, o relato do ocorrido e aplique a punição cabível.</p>
            </div>
            <span id="adminReportsCountBadge" class="admin-source-tag">0 denúncias</span>
          </div>
          <div id="adminReportsList" class="admin-reports-list" role="region" aria-live="polite"></div>
        </section>

        <div class="legal-dialog-footer">
          <button id="adminProDoneBtn" class="primary-button" type="button">Concluir e Fechar Painel</button>
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

// Painel Admin: removido da página pública e movido para dist/admin.html (página isolada com login)
const adminBlockMatch = html.match(/\s*<!-- Painel Administrativo[\s\S]*?<\/dialog>/);
if (!adminBlockMatch) throw new Error('Bloco do Painel Admin não encontrado.');
html = html.replace(adminBlockMatch[0], '');
html = replace(html, '\n            <button id="openAdminProBtn" class="admin-panel-trigger-btn" type="button">🛡️ Painel Admin: Liberar PRO Grátis</button>', '');
html = replace(html, '\n            <button id="proSandboxToggleBtn" class="pro-sandbox-btn" type="button">🧪 Sandbox Local: Simular Assinante PRO Ativo</button>', '');
html = replace(html, '\n            <button id="openAdminFromAccountBtn" class="admin-panel-trigger-btn" type="button">🛡️ Painel Admin: Selecionar Pessoas PRO Sem Pagar</button>', '');

const adminPanelSection = adminBlockMatch[0]
  .replace(/<!-- Painel Administrativo[^>]*-->/, '')
  .replace('<dialog id="adminProDialog" class="account-dialog admin-pro-dialog"', '<section id="adminProDialog" class="card admin-pro-page-panel"')
  .replace(/<button id="closeAdminProDialog"[^>]*>×<\/button>/, '')
  .replace('<button id="adminProDoneBtn" class="primary-button" type="button">Concluir e Fechar Painel</button>', '<button id="adminLogoutBtn" class="text-button logout-outline-btn" type="button">Sair do painel admin</button>')
  .replace(/<\/dialog>\s*$/, '</section>');

const adminHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#061b2a" />
    <title>Admin · Maré Certa</title>
    <link rel="icon" href="./assets/pwa-app-icon.jpg" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="stylesheet" href="./versao-b.css" />
  </head>
  <body class="preview-b admin-page">
    <div class="shell admin-shell">
      <header class="topbar">
        <span class="brand"><span>MARÉ <b>CERTA</b></span></span>
        <span class="live-pill"><span></span> Área restrita · Administração</span>
      </header>

      <section id="adminLoginCard" class="card admin-login-card" aria-labelledby="adminLoginTitle">
        <span class="eyebrow">🛡️ ACESSO RESTRITO</span>
        <h1 id="adminLoginTitle">Login do Administrador</h1>
        <form id="adminLoginForm" class="admin-login-form">
          <label>Usuário<input name="adminUser" autocomplete="username" required /></label>
          <label>Senha<input name="adminPass" type="password" autocomplete="current-password" required /></label>
          <button class="primary-button" type="submit">Entrar no painel</button>
          <p id="adminLoginError" class="form-message is-error" role="alert" hidden>Usuário ou senha inválidos.</p>
        </form>
      </section>

      <main id="adminPanelArea" hidden>
        ${adminPanelSection}
      </main>
    </div>
    <script type="module" src="./admin.js"></script>
  </body>
</html>
`;
writeFileSync('dist/admin.html', adminHtml);
mkdirSync('dist/admin', { recursive: true });
writeFileSync('dist/admin/index.html', adminHtml.replace('src="./admin.js"', 'src="/admin.js"'));

writeFileSync('dist/versao-b.html', html);
writeFileSync('dist/versao-a.html', baseAHtml);
writeFileSync('dist/versao-b.css', read('src/preview-b/styles.css'));
let appBCode = read('src/preview-b/app.js');
appBCode = replace(
  appBCode,
  `if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}`,
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
  name: 'Maré Certa — Tábua da Maré e Pesca',
  short_name: 'Maré Certa',
  description: 'Tábua de maré oficial, janelas de pesca, tabela solunar, recomendação de equipamento e ranking de pescadores.',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#0047ab',
  theme_color: '#061b2a',
  lang: 'pt-BR',
  categories: ['weather', 'sports', 'lifestyle'],
  icons: [
    {
      src: './assets/pwa-icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: './assets/pwa-icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: './assets/pwa-icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ]
}, null, 2);
writeFileSync('dist/manifest.webmanifest', manifestJson);

// Write ads.txt for Google AdSense compliance in dist/ and root
const adsTxtContent = `# ads.txt - Maré Certa (Oficial)
# Configuração IAB Tech Lab para Google AdSense
# Substitua pub-0000000000000000 pelo seu ID de editor após a aprovação da conta AdSense.
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
`;
writeFileSync('dist/ads.txt', adsTxtContent);
writeFileSync('ads.txt', adsTxtContent);

// Write sitemap.xml & robots.txt for Google Indexing of all high-volume coastal locations
const seoSlugsForSitemap = [
  'recife',
  'salvador',
  'natal',
  'joao-pessoa',
  'porto-de-galinhas',
  'cabedelo',
  'maragogi',
  'maceio',
  'vitoria',
  'vila-velha',
  'barra-de-sao-miguel',
  'sao-luis',
  'sao-miguel-dos-milagres',
  'sao-jose-de-ribamar',
  'sao-francisco-do-sul',
  'gaibu',
  'praia-grande-sp',
  'sao-vicente',
  'vera-cruz',
  'santos',
  'rio-de-janeiro'
];
const todayIso = new Date().toISOString().slice(0, 10);
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://marecerta.com.br/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
${seoSlugsForSitemap
  .map(
    slug => `  <url>
    <loc>https://marecerta.com.br/?local=${slug}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
writeFileSync('dist/sitemap.xml', sitemapXml);
writeFileSync('sitemap.xml', sitemapXml);

const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://marecerta.com.br/sitemap.xml
`;
writeFileSync('dist/robots.txt', robotsTxt);
writeFileSync('robots.txt', robotsTxt);

const swCode = `const CACHE_NAME = 'mare-certa-pwa-v5';
const IS_LOCAL = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const CORE_ASSETS = ['./', './index.html', './styles.css', './versao-b.css', './app-b.js', './preview-b.js', './marine-b.js', './tides.js', './conditions.js', './tabs.js', './assets/pwa-app-icon.jpg'];
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
  "import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';",
  "import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';"
);
ranking = replace(
  ranking,
  "import { ref, runTransaction, onValue, push, remove, serverTimestamp } from 'firebase/database';",
  "import { ref, runTransaction, onValue, push, remove, serverTimestamp, update } from 'firebase/database';"
);
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
  openProPaywallModal,
  getCaptureCaption,
  saveCaptureCaption,
  getFisherExtendedProfile,
  saveFisherExtendedProfile,
  compressTrophyPhoto,
  renderMyAccountProfile,
  openFisherProfileModal,
  setAdminCommunityContext,
  renderAdminProPanel,
  validateTextAgainstModeration,
  getUserModerationStatus,
  uploadTrophyPhotoToFirebaseStorage,
  applyLocationToMainPage,
  resolveLocationByQuery,
  openImageCropper,
  renderRankingPodium,
  handleSharedCaptureNavigation,
  setupCaptureEditPhoto,
  isPendingTrophyPhotoRemoved,
  setPendingTrophyPhotoRemoved,
  removeLocalS3Photo
} from './preview-b/community-enhancements.js';`
);
ranking = replace(
  ranking,
  `async function ensureProfile(user, requestedName) {
  const path = ref(database, \`mareCerta/profiles/\${user.uid}\`);
  // Login and the auth observer can run together. Preserve createdAt atomically.
  await runTransaction(path, existing => profileRecord(existing, requestedName, user.displayName, serverTimestamp()), { applyLocally: false });
  profileReady = true;
  renderAccount(user);
  message('profileStatus', 'Perfil salvo no ranking.');
}`,
  `async function ensureProfile(user, requestedName) {
  const path = ref(database, \`mareCerta/profiles/\${user.uid}\`);
  const finalName = requestedName || user.displayName || 'Pescador';
  const finalEmail = user.email || '';
  await runTransaction(path, existing => ({
    displayName: finalName,
    createdAt: existing?.createdAt ?? serverTimestamp()
  }), { applyLocally: false });
  try {
    saveFisherExtendedProfile(user.uid, {
      displayName: finalName,
      email: finalEmail
    });
  } catch {}
  profileReady = true;
  renderAccount(user);
  message('profileStatus', 'Perfil salvo no ranking.');
}`
);
ranking = replace(
  ranking,
  `function setMode(next) {
  mode = next;
  $('nameField').hidden = next !== 'signup';
  $('authForm').elements.displayName.required = next === 'signup';
  $('authForm').elements.password.autocomplete = next === 'signup' ? 'new-password' : 'current-password';
  $('loginMode').setAttribute('aria-pressed', String(next === 'login'));
  $('signupMode').setAttribute('aria-pressed', String(next === 'signup'));
  $('authSubmit').textContent = next === 'signup' ? 'Criar conta' : 'Entrar';
  $('resetPassword').hidden = next !== 'login'; message('authMessage', '');
}`,
  `function setMode(next) {
  mode = next;
  $('nameField').hidden = next !== 'signup';
  $('authForm').elements.displayName.required = next === 'signup';
  if ($('confirmPasswordField')) {
    $('confirmPasswordField').hidden = next !== 'signup';
    if ($('authForm').elements.confirmPassword) {
      $('authForm').elements.confirmPassword.required = next === 'signup';
    }
  }
  $('authForm').elements.password.autocomplete = next === 'signup' ? 'new-password' : 'current-password';
  $('loginMode').setAttribute('aria-pressed', String(next === 'login'));
  $('signupMode').setAttribute('aria-pressed', String(next === 'signup'));
  $('authSubmit').textContent = next === 'signup' ? 'Criar conta' : 'Entrar';
  if ($('googleAuthBtnText')) {
    $('googleAuthBtnText').textContent = next === 'signup' ? 'Criar conta com Google' : 'Entrar com Google';
  }
  $('resetPassword').hidden = next !== 'login'; message('authMessage', '');
}`
);
ranking = replace(
  ranking,
  "if (signup && (name.length < 2 || name.length > 40)) return message('authMessage', 'Informe um nome entre 2 e 40 caracteres.', true);",
  `if (signup && (name.length < 2 || name.length > 40)) return message('authMessage', 'Informe um nome entre 2 e 40 caracteres.', true);
  if (signup) {
    const pwd = form.elements.password.value;
    const confirmPwd = form.elements.confirmPassword ? form.elements.confirmPassword.value : '';
    if (pwd !== confirmPwd) {
      return message('authMessage', 'As senhas informadas não coincidem. Digite a mesma senha nos dois campos para confirmar.', true);
    }
    const nameMod = validateTextAgainstModeration(name, 'nome');
    if (!nameMod.valid) return message('authMessage', nameMod.message, true);
  }
  const emailModStatus = getUserModerationStatus(null, form.elements.email.value.trim());
  if (emailModStatus.isRestricted) return message('authMessage', emailModStatus.message, true);`
);
ranking = replace(
  ranking,
  "if (name.length < 2 || name.length > 40) return message('profileStatus', 'Informe um nome entre 2 e 40 caracteres.', true);",
  "if (name.length < 2 || name.length > 40) return message('profileStatus', 'Informe um nome entre 2 e 40 caracteres.', true);\n  const profMod = validateTextAgainstModeration(name, 'nome do perfil');\n  if (!profMod.valid) return message('profileStatus', profMod.message, true);"
);
ranking = replace(
  ranking,
  "const fields = Object.fromEntries(captureFields.map(name => [name, form.elements.namedItem(name).value]));",
  `const userModStatus = getUserModerationStatus(user.uid, user.email);
    if (userModStatus.isRestricted) throw new CaptureValidationError(userModStatus.message);
    const fields = Object.fromEntries(captureFields.map(name => [name, form.elements.namedItem(name).value]));
    const speciesMod = validateTextAgainstModeration(fields.species, 'espécie');
    if (!speciesMod.valid) throw new CaptureValidationError(speciesMod.message);
    const locationMod = validateTextAgainstModeration(fields.location, 'local / praia');
    if (!locationMod.valid) throw new CaptureValidationError(locationMod.message);
    const captionVal = $('captureCommentInput') ? $('captureCommentInput').value : '';
    const captionMod = validateTextAgainstModeration(captionVal, 'relato da captura');
    if (!captionMod.valid) throw new CaptureValidationError(captionMod.message);`
);
ranking = replace(
  ranking,
  "const ranking = makeRanking(profiles, captures);",
  `const activeCapturesForRanking = Object.fromEntries(Object.entries(captures).filter(([, cap]) => !getUserModerationStatus(cap?.uid).isRestricted));
  const ranking = makeRanking(profiles, activeCapturesForRanking);
  renderRankingPodium(ranking, profiles, captures, auth.currentUser?.uid || null);`
);
ranking = replace(
  ranking,
  "addCell(row, `${person.name}${person.uid === auth.currentUser?.uid ? ' (você)' : ''}`);",
  `const extP = getFisherExtendedProfile(person.uid, profiles?.[person.uid]);
    const av = extP?.avatarUrl || profiles?.[person.uid]?.avatarUrl || '';
    const inits = (person.name || 'Pescador').trim().split(/\\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || 'P').join('');
    const mClass = person.rank === 1 ? 'is-gold' : person.rank === 2 ? 'is-silver' : person.rank === 3 ? 'is-bronze' : 'is-default';
    const isProM = isUserPro(person.uid, profiles?.[person.uid]?.email);
    const isU = person.uid === auth.currentUser?.uid;
    const tdFisher = document.createElement('td');
    tdFisher.className = 'ranking-fisher-td';
    tdFisher.innerHTML = '<div class="ranking-fisher-cell"><div class="ranking-avatar-wrap ' + mClass + '">' +
      (av ? '<img src="' + av + '" class="ranking-avatar-img" alt="' + person.name + '" />' : '<span class="ranking-avatar-fallback ' + mClass + '">' + inits + '</span>') +
      '</div><div class="ranking-fisher-info"><strong class="ranking-name-label">' + person.name + '</strong>' + (isU ? ' <small class="ranking-you-tag">(você)</small>' : '') +
      (isProM ? '<span class="pro-member-badge mini">👑 PRO</span>' : '') + '</div></div>';
    row.append(tdFisher);`
);
ranking = replace(
  ranking,
  "try { const local = JSON.parse(localStorage.getItem('mare-certa-location')); if (local?.name) form.elements.location.value = local.name; } catch {}",
  "try { const ext = auth.currentUser ? getFisherExtendedProfile(auth.currentUser.uid) : null; const local = JSON.parse(localStorage.getItem('mare-certa-location') || 'null'); form.elements.location.value = ext?.location || local?.name || ''; } catch {}"
);
ranking = replace(
  ranking,
  "$('cancelCaptureEdit').hidden = true;",
  `$('cancelCaptureEdit').hidden = true;
  if ($('deleteCaptureInEditBtn')) $('deleteCaptureInEditBtn').hidden = true;
  if ($('captureCommentInput')) $('captureCommentInput').value = '';
  setPendingTrophyPhotoRemoved(false);
  clearPendingTrophyPhoto();`
);
ranking = replace(
  ranking,
  "for (const name of captureFields) form.elements.namedItem(name).value = capture[name] ?? '';",
  `for (const name of captureFields) form.elements.namedItem(name).value = capture[name] ?? '';
  if ($('captureCommentInput')) $('captureCommentInput').value = getCaptureCaption(id, capture);
  if ($('deleteCaptureInEditBtn')) $('deleteCaptureInEditBtn').hidden = false;
  setupCaptureEditPhoto(id, capture);`
);
ranking = replace(
  ranking,
  "if (!result.committed) throw new CaptureValidationError('Esta captura não está mais disponível para edição.');",
  `if (!result.committed) throw new CaptureValidationError('Esta captura não está mais disponível para edição.');
      const editCaptionVal = $('captureCommentInput') ? $('captureCommentInput').value.trim().slice(0, 300) : '';
      if ($('captureCommentInput')) {
        saveCaptureCaption(edit.id, editCaptionVal);
        update(ref(database, 'mareCerta/captures/' + edit.id), { caption: editCaptionVal }).catch(() => {});
      }
      if (isPendingTrophyPhotoRemoved()) {
        removeLocalS3Photo(edit.id);
        update(ref(database, 'mareCerta/captures/' + edit.id), { photoUrl: null }).catch(() => {});
        setPendingTrophyPhotoRemoved(false);
      } else {
        const pendingPhotoEdit = getPendingTrophyPhoto();
        if (pendingPhotoEdit) {
          saveLocalS3Photo(edit.id, pendingPhotoEdit);
          uploadTrophyPhotoToFirebaseStorage(edit.id, pendingPhotoEdit.dataUrl).then(url => {
            const finalPhotoUrl = url || pendingPhotoEdit.dataUrl;
            if (finalPhotoUrl) update(ref(database, 'mareCerta/captures/' + edit.id), { photoUrl: finalPhotoUrl }).catch(() => {});
          }).catch(() => {
            if (pendingPhotoEdit.dataUrl) update(ref(database, 'mareCerta/captures/' + edit.id), { photoUrl: pendingPhotoEdit.dataUrl }).catch(() => {});
          });
          clearPendingTrophyPhoto();
        }
      }`
);
ranking = replace(
  ranking,
  `$('cancelCaptureEdit').addEventListener('click', () => {`,
  `const delEditBtn = $('deleteCaptureInEditBtn');
if (delEditBtn) {
  delEditBtn.addEventListener('click', async () => {
    if (!editingCapture || savingCapture) return;
    const captureIdToDelete = editingCapture.id;
    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm('⚠️ Tem certeza que deseja apagar esta publicação do seu diário e do ranking?\\n\\nEsta ação excluirá o registro e a foto permanentemente.')
      : true;
    if (!confirmed) return;
    delEditBtn.disabled = true;
    message('captureMessage', 'Apagando publicação...');
    try {
      await remove(ref(database, 'mareCerta/captures/' + captureIdToDelete));
      removeLocalS3Photo(captureIdToDelete);
      resetCaptureEditor();
      message('captureMessage', 'Publicação apagada com sucesso.');
    } catch (err) {
      message('captureMessage', explain(err), true);
      delEditBtn.disabled = false;
    }
  });
}
$('cancelCaptureEdit').addEventListener('click', () => {`
);
ranking = replace(
  ranking,
  "addCell(row, String(person.rank).padStart(2, '0'), 'rank-position');",
  "const medal = person.rank === 1 ? '🥇 ' : person.rank === 2 ? '🥈 ' : person.rank === 3 ? '🥉 ' : '';\n    addCell(row, medal + String(person.rank).padStart(2, '0'), 'rank-position');\n    row.style.cursor = 'pointer';\n    row.title = 'Clique para ver o perfil completo deste pescador';\n    row.addEventListener('click', () => openFisherProfileModal(person.uid, profiles, captures, auth.currentUser?.uid || null));"
);
ranking = replace(
  ranking,
  "await push(ref(database, 'mareCerta/captures'), capture);",
  `const pushedRef = await push(ref(database, 'mareCerta/captures'), capture);
      const newCaptionVal = $('captureCommentInput') ? $('captureCommentInput').value.trim().slice(0, 300) : '';
      if ($('captureCommentInput') && pushedRef?.key) {
        saveCaptureCaption(pushedRef.key, newCaptionVal);
        if (newCaptionVal) update(ref(database, 'mareCerta/captures/' + pushedRef.key), { caption: newCaptionVal }).catch(() => {});
      }
      const pendingPhoto = getPendingTrophyPhoto();
      if (pendingPhoto && pushedRef?.key) {
        saveLocalS3Photo(pushedRef.key, pendingPhoto);
        uploadTrophyPhotoToFirebaseStorage(pushedRef.key, pendingPhoto.dataUrl).then(url => {
          const finalPhotoUrl = url || pendingPhoto.dataUrl;
          if (finalPhotoUrl) update(ref(database, 'mareCerta/captures/' + pushedRef.key), { photoUrl: finalPhotoUrl }).catch(() => {});
        }).catch(() => {
          if (pendingPhoto.dataUrl) update(ref(database, 'mareCerta/captures/' + pushedRef.key), { photoUrl: pendingPhoto.dataUrl }).catch(() => {});
        });
        clearPendingTrophyPhoto();
      }`
);
ranking = replace(
  ranking,
  '  card.append(title, author, details);',
  `  const shareWrap = document.createElement('div'); shareWrap.className = 'capture-share-row';
  const shareBtn = document.createElement('button'); shareBtn.type = 'button'; shareBtn.className = 'share-card-btn'; shareBtn.textContent = '📤 Compartilhar captura';
  shareBtn.addEventListener('click', () => openShareCardModal(capture, profiles[capture.uid]?.displayName || capture.authorName || 'Pescador', id));
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
  const combinedWithDemosRaw = [...all, ...demoCaptures.filter(([id]) => !captures[id])];
  const combinedWithDemos = combinedWithDemosRaw.filter(([, cap]) => !getUserModerationStatus(cap?.uid).isRestricted);
  const combinedCapturesMap = { ...Object.fromEntries(demoCaptures), ...captures };
  setAdminCommunityContext(auth.currentUser, profiles, combinedCapturesMap);
  renderAdminProPanel();
  renderAchievementsAndStats(combinedCapturesMap, auth.currentUser?.uid || 'demo-fisher-1');
  if (auth.currentUser) {
    renderMyAccountProfile(auth.currentUser, profiles, combinedCapturesMap);
    if ($('setAsProfileDefaultLocBtn')) $('setAsProfileDefaultLocBtn').hidden = false;
    try {
      const ext = getFisherExtendedProfile(auth.currentUser.uid);
      if (ext?.location || ext?.preferredLocation) {
        const target = ext.preferredLocation || resolveLocationByQuery(ext.location);
        const cur = JSON.parse(localStorage.getItem('mare-certa-location') || 'null');
        if (target && (!cur || cur.name === 'João Pessoa') && !sessionStorage.getItem('mare-certa-loc-synced-' + auth.currentUser.uid)) {
          sessionStorage.setItem('mare-certa-loc-synced-' + auth.currentUser.uid, '1');
          applyLocationToMainPage(target);
        }
      }
    } catch {}
  }
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
        <span class="blur-lock-sub">Clique para desbloquear o feed completo · R$ 8,33/mês</span>
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
        <h3 class="paywall-teaser-title">Faça parte da nossa família de pescadores</h3>
        <p class="paywall-teaser-desc">Aproveite todo o feed social sem limites: veja as fotos de todos os troféus da costa, troque dicas nos comentários com outros pescadores e publique suas próprias capturas para fortalecer a nossa comunidade.</p>
        <div class="feed-paywall-teaser-actions">
          <button type="button" class="primary-button paywall-teaser-cta-btn">⚡ Desbloquear Feed Completo · R$ 8,33/mês</button>
        </div>
      </div>
    \`;
    teaser.querySelector('.paywall-teaser-cta-btn').addEventListener('click', () => openProPaywallModal('feed_blur'));
    $('recentCatches').append(teaser);
  }
  handleSharedCaptureNavigation();`;

ranking = replace(
  ranking,
  `  for (const [id, capture] of recent) {
    $('recentCatches').append(captureCard(id, capture));
  }`,
  blurredFeedSnippet
);
ranking += `\nlet filterTimer;
$('captureFilterForm').addEventListener('submit', event => event.preventDefault());
$('captureFilterForm').addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(renderCommunity, 150); });
$('clearCaptureFilters').addEventListener('click', () => { clearTimeout(filterTimer); $('captureFilterForm').reset(); renderCommunity(); });
window.addEventListener('mare-certa:pro-changed', () => renderCommunity());
window.addEventListener('mare-certa:moderation-changed', () => renderCommunity());

if ($('myProfileAvatarBtn') && $('myProfileAvatarInput')) {
  $('myProfileAvatarBtn').addEventListener('click', () => $('myProfileAvatarInput').click());
  $('myProfileAvatarInput').addEventListener('change', () => {
    const file = $('myProfileAvatarInput').files?.[0];
    const user = auth.currentUser;
    if (!file || !user) return;
    openImageCropper({
      file,
      shape: 'circle',
      title: 'Ajustar Foto do Perfil',
      subtitle: 'Arraste a foto e use o zoom para centralizar seu rosto ou foto de pescaria perfeitamente no círculo.',
      onCropComplete: cropped => {
        saveFisherExtendedProfile(user.uid, { avatarUrl: cropped.dataUrl });
        renderCommunity();
        message('profileStatus', '✓ Foto do perfil atualizada e enquadrada com sucesso!');
        $('myProfileAvatarInput').value = '';
      },
      onCancel: () => {
        $('myProfileAvatarInput').value = '';
      }
    });
  });
}

if ($('addProfileTrophyBtn') && $('myProfileTrophyInput')) {
  $('addProfileTrophyBtn').addEventListener('click', () => $('myProfileTrophyInput').click());
  $('myProfileTrophyInput').addEventListener('change', () => {
    const file = $('myProfileTrophyInput').files?.[0];
    const user = auth.currentUser;
    if (!file || !user) return;
    openImageCropper({
      file,
      shape: 'rect',
      title: 'Enquadrar Foto para sua Galeria',
      subtitle: 'Foto completa preservada. Arraste e use o zoom caso queira aproximar o peixe.',
      onCropComplete: cropped => {
        const currentExt = getFisherExtendedProfile(user.uid, profiles?.[user.uid]);
        const extraTrophyPhotos = [
          {
            id: 'trophy-' + Date.now(),
            dataUrl: cropped.dataUrl,
            title: 'Troféu do Pescador',
            date: today().split('-').reverse().join('/')
          },
          ...(currentExt.extraTrophyPhotos || [])
        ];
        saveFisherExtendedProfile(user.uid, { extraTrophyPhotos });
        renderCommunity();
        message('profileStatus', '✓ Foto adicionada à sua galeria de troféus!');
        $('myProfileTrophyInput').value = '';
      },
      onCancel: () => {
        $('myProfileTrophyInput').value = '';
      }
    });
  });
}

if ($('extendedProfileForm')) {
  $('extendedProfileForm').addEventListener('submit', async event => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const form = event.currentTarget;
    const newName = String(form.elements.extDisplayName?.value || '').trim();
    const locationVal = String(form.elements.extLocation?.value || '').trim();
    const bioVal = String(form.elements.extBio?.value || '').trim();
    const instagramVal = String(form.elements.extInstagram?.value || '').trim();
    const social2Val = String(form.elements.extSocial2?.value || '').trim();
    const phoneVal = String(form.elements.extPhone?.value || '').trim();

    if (newName.length < 2 || newName.length > 40) {
      message('profileStatus', 'Informe um nome público entre 2 e 40 caracteres.', true);
      return;
    }

    const userMod = getUserModerationStatus(user.uid, user.email);
    if (userMod.isRestricted) {
      message('profileStatus', userMod.message, true);
      return;
    }

    for (const [val, label] of [
      [newName, 'nome público'],
      [locationVal, 'cidade / praia'],
      [bioVal, 'bio / especialidade']
    ]) {
      const check = validateTextAgainstModeration(val, label);
      if (!check.valid) {
        message('profileStatus', check.message, true);
        return;
      }
    }

    const syncWithForecast = form.elements.syncWithForecast ? form.elements.syncWithForecast.checked : true;
    let targetLoc = form._selectedSpot || null;
    if (!targetLoc && locationVal) {
      targetLoc = resolveLocationByQuery(locationVal);
      if (!targetLoc) {
        try {
          const cur = JSON.parse(localStorage.getItem('mare-certa-location') || 'null');
          if (cur && (cur.name.toLowerCase().includes(locationVal.toLowerCase()) || locationVal.toLowerCase().includes(cur.name.toLowerCase()))) {
            targetLoc = cur;
          }
        } catch {}
      }
      if (!targetLoc) {
        targetLoc = {
          name: locationVal.split(/[·,]/)[0].trim(),
          admin1: locationVal.split(/[·,]/)[1]?.trim() || 'Brasil',
          country_code: 'BR',
          latitude: -7.115,
          longitude: -34.8631
        };
      }
    }

    saveFisherExtendedProfile(user.uid, {
      displayName: newName,
      email: user.email || '',
      location: locationVal,
      preferredLocation: targetLoc,
      bio: bioVal,
      instagram: instagramVal,
      social2: social2Val,
      phone: phoneVal
    });

    if (syncWithForecast && targetLoc) {
      try {
        localStorage.setItem('mare-certa-last-active-uid', user.uid);
        applyLocationToMainPage(targetLoc);
      } catch {}
    }

    try {
      if (newName !== user.displayName) {
        await updateProfile(user, { displayName: newName });
      }
      await ensureProfile(user, newName);
    } catch {}

    $('profileName').textContent = newName;
    $('accountButton').textContent = newName;
    const savedPill = $('extendedProfileSavedMsg');
    if (savedPill) {
      savedPill.hidden = false;
      setTimeout(() => { savedPill.hidden = true; }, 3500);
    }
    message('profileStatus', '✓ Perfil completo atualizado e vinculado à tela inicial!');
    renderCommunity();
  });
}

if ($('setAsProfileDefaultLocBtn')) {
  $('setAsProfileDefaultLocBtn').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
      $('accountButton')?.click();
      return;
    }
    try {
      const curLoc = JSON.parse(localStorage.getItem('mare-certa-location') || 'null');
      if (curLoc?.name) {
        const locLabel = curLoc.admin1 ? (curLoc.name + ' · ' + curLoc.admin1) : curLoc.name;
        saveFisherExtendedProfile(user.uid, {
          location: locLabel,
          preferredLocation: curLoc
        });
        localStorage.setItem('mare-certa-last-active-uid', user.uid);
        const btn = $('setAsProfileDefaultLocBtn');
        const origText = btn.textContent;
        btn.textContent = '✓ Praia salva como padrão no seu perfil!';
        setTimeout(() => { btn.textContent = origText; }, 3000);
        renderCommunity();
      }
    } catch {}
  });
}

const googleBtn = $('googleAuthBtn');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    message('authMessage', 'Conectando ao Google...');
    googleBtn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result?.user;
      if (user) {
        const gName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pescador');
        await ensureProfile(user, gName);
        if (user.photoURL) {
          const curExt = getFisherExtendedProfile(user.uid);
          if (!curExt?.avatarUrl) {
            saveFisherExtendedProfile(user.uid, { avatarUrl: user.photoURL });
          }
        }
        renderAccount(user);
        $('accountDialog').close();
        message('captureMessage', 'Conta Google conectada com sucesso! Bem-vindo(a), ' + gName + '.');
      }
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        message('authMessage', 'Login com Google cancelado.');
      } else {
        message('authMessage', explain(error), true);
      }
    } finally {
      googleBtn.disabled = false;
    }
  });
}
`;

const baseOptions = { bundle: true, format: 'esm', minify: true, logLevel: 'silent' };
await Promise.all([
  build({ ...baseOptions, entryPoints: ['src/preview-b/enhancements.js'], outfile: 'dist/preview-b.js' }),
  build({ ...baseOptions, entryPoints: ['src/preview-b/window-marine-view.js'], outfile: 'dist/marine-b.js' }),
  build({ ...baseOptions, entryPoints: ['src/preview-b/admin.js'], outfile: 'dist/admin.js' }),
  build({ ...baseOptions, stdin: { contents: ranking, resolveDir: resolve('src'), sourcefile: 'ranking-b.js' }, outfile: 'dist/ranking-b.js' })
]);
for (const [file, before] of originals) if (hash(file) !== before) throw new Error(`A versão A foi alterada: ${file}`);
writeFileSync('dist/index.html', html);
await import('./prepare-pages.mjs');
console.log('Versão B definida como principal: http://localhost:4173/');
console.log('Versão A arquivada em http://localhost:4173/versao-a.html');
