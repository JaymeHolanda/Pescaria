import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextFishingWindow,
  countdownText,
  forecastNow,
  filterCaptures,
  dayWindowRange,
  solunarPeriods,
  checkSolunarSync,
  recommendTackle,
  tideAmplitudeInfo,
  SPECIES_CATALOG,
  filterSpeciesCatalog,
  computeAchievements,
  findNearestBrazilianHarbor,
  parseTabuaMareResponse,
  buildHarborTideDay,
  coastalRegionFor
} from '../src/preview-b/model.js';
import { parseTaxonPhoto } from '../src/preview-b/species-photos.js';

const day = (...times) => ({ events: times.map(time => ({ time, type: 'high' })) });

test('próxima janela usa o horário do local e reconhece a janela em andamento', () => {
  const days = [day('2026-10-21T13:00', '2026-10-21T23:00')];
  const active = nextFishingWindow(days, -10800, Date.parse('2026-10-21T15:00Z'));
  assert.equal(active.startHour, '10:00'); assert.equal(active.active, true);
  assert.ok(active.progress >= 0 && active.progress <= 100);
  const later = nextFishingWindow(days, -10800, Date.parse('2026-10-21T16:00Z'));
  assert.equal(later.startHour, '20:00'); assert.equal(later.active, false);
  assert.equal(forecastNow(Date.parse('2026-10-22T01:00Z'), -10800), '2026-10-21T22:00');
});

test('próxima janela atravessa a meia-noite e encerra exatamente na maré alta', () => {
  const days = [day('2026-10-22T01:00')];
  const window = nextFishingWindow(days, -10800, Date.parse('2026-10-22T02:00Z'));
  assert.equal(window.startDate, '2026-10-21'); assert.equal(window.startHour, '22:00'); assert.equal(window.active, true);
  assert.equal(nextFishingWindow(days, -10800, Date.parse('2026-10-22T04:00Z')), null);
  assert.equal(nextFishingWindow([], -10800), null);
  assert.equal(countdownText(135 * 60000), '2h 15min');
  assert.equal(countdownText(10 * 1000), '1min');
});

test('filtros combinam espécie, local e intervalo de datas sem mudar os registros', () => {
  const entries = [['one', { species: 'Pampo-galhudo', location: 'João Pessoa', date: '2026-10-12' }], ['two', { species: 'Atum', location: 'João Pessoa', date: '2026-10-20' }], ['three', { species: 'Pampo', location: 'Fortaleza', date: '2026-10-12' }]];
  assert.deepEqual(filterCaptures(entries, { species: 'PAMPO', location: 'joao', from: '2026-10-12', to: '2026-10-12' }).map(([id]) => id), ['one']);
  assert.equal(filterCaptures(entries, { from: '2026-10-21', to: '2026-10-01' }).length, 0);
  assert.equal(filterCaptures(entries).length, 3);
  assert.equal(entries.length, 3);
});

test('faixas do gráfico incluem os dois lados de uma janela que atravessa meia-noite', () => {
  const event = { time: '2026-10-22T01:00', type: 'high' };
  assert.deepEqual(dayWindowRange(event, '2026-10-21'), { start: 1320, end: 1440 });
  assert.deepEqual(dayWindowRange(event, '2026-10-22'), { start: 0, end: 60 });
  assert.equal(dayWindowRange(event, '2026-10-23'), null);
});

test('tabela solunar calcula períodos maiores e menores e identifica sincronia com a janela', () => {
  const solunar = solunarPeriods('2026-10-22', 0.0, -34.8631);
  assert.equal(solunar.majors.length, 2);
  assert.equal(solunar.minors.length, 2);
  assert.ok(solunar.score >= 88);
  assert.match(solunar.rating, /Sizígia/);

  const major0 = solunar.majors[0];
  const sync = checkSolunarSync({ startHour: major0.startHour, endHour: major0.endHour }, solunar);
  assert.equal(sync?.type, 'major');
  assert.match(sync?.badge, /Hora de Ouro/);
});

test('consultor de equipamento recomenda chumbada e montagem conforme ondas e vento', () => {
  const rough = recommendTackle({ waveHeight: 1.8, wavePeriod: 11, windSpeed: 30 });
  assert.match(rough.sinker, /120g a 150g/);
  const moderate = recommendTackle({ waveHeight: 1.0, wavePeriod: 9, windSpeed: 18 });
  assert.match(moderate.sinker, /90g a 120g/);
  const calm = recommendTackle({ waveHeight: 0.5, wavePeriod: 6, windSpeed: 10 });
  assert.match(calm.sinker, /65g a 90g/);
});

test('catálogo de espécies filtra por zona, isca e termo de busca', () => {
  assert.equal(SPECIES_CATALOG.length, 28);
  assert.ok(SPECIES_CATALOG.every(s => s.photoTaxon && Array.isArray(s.regions) && s.regions.length));
  const byBait = filterSpeciesCatalog(SPECIES_CATALOG, { bait: 'Tatuíra' });
  assert.ok(byBait.some(s => s.id === 'pampo'));
  assert.ok(byBait.some(s => s.id === 'sargo'));
  const byZone = filterSpeciesCatalog(SPECIES_CATALOG, { zone: 'beira' });
  assert.ok(byZone.every(s => s.zone === 'beira'));

  // Espécies destacadas de João Pessoa / Nordeste
  const pbSpecies = filterSpeciesCatalog(SPECIES_CATALOG, { region: 'nordeste' });
  assert.ok(pbSpecies.some(s => s.id === 'cioba'));
  assert.ok(pbSpecies.some(s => s.id === 'cavala'));
  assert.ok(pbSpecies.some(s => s.id === 'badejo'));
  assert.ok(pbSpecies.some(s => s.id === 'guarajuba'));
  assert.ok(pbSpecies.some(s => s.id === 'pitangola'));
  assert.ok(pbSpecies.some(s => s.id === 'coro'));
  assert.ok(pbSpecies.some(s => s.id === 'porquinho'));
  assert.ok(pbSpecies.some(s => s.id === 'arabaiana'));
  assert.ok(pbSpecies.some(s => s.id === 'tainha'));
});

test('região costeira vem do local escolhido e filtra as espécies', () => {
  assert.equal(coastalRegionFor({ latitude: -7.115, longitude: -34.8631, country_code: 'BR' }), 'nordeste');
  assert.equal(coastalRegionFor({ latitude: -22.9064, longitude: -43.1822 }), 'sudeste');
  assert.equal(coastalRegionFor({ latitude: -27.5969, longitude: -48.5556 }), 'sul');
  assert.equal(coastalRegionFor({ latitude: -1.45, longitude: -48.5 }), 'norte');
  assert.equal(coastalRegionFor({ latitude: -3.715, longitude: -38.4767 }), 'nordeste');
  assert.equal(coastalRegionFor({ latitude: 38.7, longitude: -9.1, country_code: 'PT' }), null);
  assert.equal(coastalRegionFor({}), null);

  const sul = filterSpeciesCatalog(SPECIES_CATALOG, { region: 'sul' });
  assert.ok(sul.some(s => s.id === 'anchova'));
  assert.ok(!sul.some(s => s.id === 'camurupim'));
  const nordeste = filterSpeciesCatalog(SPECIES_CATALOG, { region: 'nordeste' });
  assert.ok(nordeste.some(s => s.id === 'camurupim'));
  assert.ok(!nordeste.some(s => s.id === 'anchova'));
  assert.equal(filterSpeciesCatalog(SPECIES_CATALOG, { region: 'all' }).length, SPECIES_CATALOG.length);
});

test('foto do iNaturalist usa a imagem média da espécie exata e mantém o crédito', () => {
  const payload = { results: [
    { id: 1, name: 'Trachinotus carolinus', default_photo: { medium_url: 'https://x/1/medium.jpg', attribution: '(c) A' } },
    { id: 114269, name: 'Trachinotus goodei', default_photo: { url: 'https://x/2/square.jpg', attribution: '(c) Kevin Bryant, some rights reserved (CC BY-NC-SA)' } }
  ] };
  const photo = parseTaxonPhoto(payload, 'Trachinotus goodei');
  assert.equal(photo.url, 'https://x/2/medium.jpg');
  assert.match(photo.attribution, /Kevin Bryant/);
  assert.equal(photo.link, 'https://www.inaturalist.org/taxa/114269');
  assert.equal(parseTaxonPhoto({ results: [] }, 'X'), null);
  assert.equal(parseTaxonPhoto(null, 'X'), null);
});

test('conquistas e amplitude de maré calculam estatísticas e medalhas corretamente', () => {
  const amp = tideAmplitudeInfo([], [{ level: 0.3 }, { level: 2.5 }]);
  assert.equal(Number(amp.amplitude.toFixed(1)), 2.2);
  assert.match(amp.category, /Maré Viva/);

  const captures = {
    c1: { uid: 'u1', species: 'Pampo', quantity: 6, weight: 2.5, location: 'Bessa' },
    c2: { uid: 'u1', species: 'Robalo', quantity: 3, weight: 1.2, location: 'Intermares' },
    c3: { uid: 'u1', species: 'Betara', quantity: 2, weight: 0.8, location: 'Lucena' }
  };
  const stats = computeAchievements(captures, 'u1');
  assert.equal(stats.community.totalFish, 11);
  assert.equal(stats.personal.totalFish, 11);
  assert.equal(stats.personal.speciesCount, 3);
  assert.equal(stats.personal.spotsCount, 3);
  const unlockedIds = stats.badges.filter(b => b.unlocked).map(b => b.id);
  assert.deepEqual(unlockedIds, ['first-catch', 'tide-master', 'biodiversity', 'heavyweight', 'explorer']);
});

test('API Tábua de Marés localiza porto do RJ e interpola extremos oficiais', () => {
  const rj = findNearestBrazilianHarbor({ latitude: -22.9064, longitude: -43.1822 });
  assert.equal(rj?.id, 'rj03');
  assert.match(rj?.name, /Rio de Janeiro/);

  const arraial = findNearestBrazilianHarbor({ latitude: -22.9661, longitude: -42.0278 });
  assert.equal(arraial?.id, 'rj05');

  const payload = [{
    data: [{
      id: 'rj03',
      year: 2026,
      harbor_name: 'PORTO DO RIO DE JANEIRO ILHA FISCAL',
      state: 'rj',
      data_collection_institution: 'CHM',
      months: [{
        month: 10,
        days: [
          { day: 21, hours: [{ hour: '18:23:00', level: 0.42 }] },
          { day: 22, hours: [{ hour: '00:12:00', level: 1.05 }, { hour: '06:31:00', level: 0.15 }, { hour: '12:59:00', level: 1.13 }, { hour: '18:57:00', level: 0.32 }] }
        ]
      }]
    }]
  }];
  const parsed = parseTabuaMareResponse(payload);
  const tideDay = buildHarborTideDay(parsed, '2026-10-22');
  assert.equal(tideDay.brazilApi, true);
  assert.equal(tideDay.events.length, 4);
  assert.deepEqual(tideDay.events.map(e => [e.hour, e.type, e.level]), [
    ['00:12', 'high', 1.05],
    ['06:31', 'low', 0.15],
    ['12:59', 'high', 1.13],
    ['18:57', 'low', 0.32]
  ]);
  assert.ok(tideDay.points.length > 20);
});

test('São Paulo e Santos encontram porto paulista e preenchem resumo marítimo completo', async () => {
  const spInland = { name: 'São Paulo', latitude: -23.5475, longitude: -46.63611 };
  const harbor = findNearestBrazilianHarbor(spInland);
  assert.equal(harbor?.id, 'sp02');
  assert.match(harbor?.name, /Santos/);

  const { windowMarineSummary } = await import('../src/preview-b/window-marine-model.js');
  const window = { startDate: '2026-10-21', startHour: '21:59', endDate: '2026-10-22', endHour: '00:59' };
  const time = ['2026-10-21T22:00', '2026-10-21T23:00', '2026-10-22T00:00'];
  const weather = {
    time,
    wind_speed_10m: [12, 11, 10],
    wind_direction_10m: [80, 85, 90],
    wind_gusts_10m: [25, 24, 22],
    pressure_msl: [1018, 1017, 1017],
    weather_code: [1, 1, 2]
  };
  const marine = {
    time,
    wave_height: [1.3, 1.2, 1.1],
    wave_period: [9.0, 8.8, 8.5],
    wave_direction: [160, 165, 170],
    swell_wave_height: [1.0, 0.9, 0.8],
    swell_wave_period: [9.2, 9.0, 8.8],
    swell_wave_direction: [165, 168, 170],
    wind_wave_height: [0.3, 0.2, 0.2],
    sea_surface_temperature: [23.5, 23.5, 23.4]
  };

  const summary = windowMarineSummary(window, weather, marine);
  assert.equal(summary.expected, 3);
  assert.equal(summary.count, 3);
  assert.ok(Number.isFinite(summary.score));
  assert.ok(summary.score > 0 && summary.score <= 100);
  assert.notEqual(summary.label, 'Dados incompletos');
  assert.equal(Number(summary.values.wave_height.toFixed(1)), 1.2);
  assert.equal(Number(summary.values.wave_period.toFixed(1)), 8.8);
  assert.equal(Number(summary.values.swell_wave_height.toFixed(1)), 0.9);
  assert.equal(Number(summary.values.sea_surface_temperature.toFixed(1)), 23.5);
});


test('Clube PRO Mercado Pago e compressão de foto WebP para S3 validam planos e dimensões', async () => {
  const {
    PRO_PLANS,
    calculateImageDimensions,
    formatCompressionSavings,
    canUseProSocialFeature
  } = await import('../src/preview-b/model.js');

  assert.equal(PRO_PLANS.annual.priceMonthly, 8.33);
  assert.equal(PRO_PLANS.annual.billingTotal, 99.9);
  assert.equal(PRO_PLANS.monthly.priceMonthly, 14.9);
  assert.equal(PRO_PLANS.annual.discountBadge, 'MAIS ESCOLHIDO · 44% DE DESCONTO');

  const dims = calculateImageDimensions(4000, 3000, 1080);
  assert.equal(dims.width, 1080);
  assert.equal(dims.height, 810);
  assert.equal(dims.scaled, true);

  const smallDims = calculateImageDimensions(800, 600, 1080);
  assert.equal(smallDims.width, 800);
  assert.equal(smallDims.height, 600);
  assert.equal(smallDims.scaled, false);

  const summary = formatCompressionSavings(4.2 * 1024 * 1024, 84 * 1024);
  assert.match(summary, /Otimizada p\/ S3 \(WebP\)/);
  assert.match(summary, /-98%/);

  assert.equal(canUseProSocialFeature({ active: false }), false);
  assert.equal(canUseProSocialFeature({ active: true, expiresAt: Date.now() + 60000 }), true);
  assert.equal(canUseProSocialFeature({ active: true, expiresAt: Date.now() - 60000 }), false);
});


test('Perfil do pescador, seguidores reais, relato de captura e exclusão de comentários funcionam corretamente', async () => {
  const { computeAchievements } = await import('../src/preview-b/model.js');
  const {
    getFisherFollowersCount,
    toggleFollowFisher,
    deletePostComment,
    getCaptureCaption,
    saveCaptureCaption,
    getFisherExtendedProfile,
    saveFisherExtendedProfile
  } = await import('../src/preview-b/community-enhancements.js');

  // 1. Seguidores reais: pescador novo começa com 0 seguidores (e não 14 fixos)
  const newFisherState = { followersCount: { 'demo-fisher-1': 42 }, followingByMe: {} };
  assert.equal(getFisherFollowersCount('real-user-123', newFisherState), 0);
  assert.equal(getFisherFollowersCount('demo-fisher-1', newFisherState), 42);

  // Ao seguir, incrementa +1
  const followedState = { followersCount: { 'demo-fisher-1': 42 }, followingByMe: { 'real-user-123': true, 'demo-fisher-1': true } };
  assert.equal(getFisherFollowersCount('real-user-123', followedState), 1);
  assert.equal(getFisherFollowersCount('demo-fisher-1', followedState), 43);

  // 2. Maiores conquistas e medalhas costeiras no perfil
  const sampleCaptures = {
    c1: { uid: 'u1', species: 'Robalo-flecha', quantity: 2, weight: 4.5, location: 'Praia do Bessa' },
    c2: { uid: 'u1', species: 'Pampo', quantity: 5, weight: 2.1, location: 'Intermares' }
  };
  const ach = computeAchievements(sampleCaptures, 'u1');
  assert.equal(ach.personal.topSpecies, 'Pampo');
  assert.equal(ach.personal.topTrophySpecies, 'Robalo-flecha');
  assert.equal(ach.personal.maxWeight, 4.5);
  assert.equal(ach.personal.unlockedMedalsCount, 2);
  assert.equal(ach.personal.totalMedalsCount, 6);

  // 3. Relato / comentário de captura e perfil estendido com localStorage simulado
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  saveCaptureCaption('cap-99', 'Peguei na maré enchente com corrupto vivo!');
  assert.equal(getCaptureCaption('cap-99'), 'Peguei na maré enchente com corrupto vivo!');

  saveFisherExtendedProfile('u1', {
    displayName: 'Jayme Holanda',
    location: 'João Pessoa, PB',
    bio: 'Robalo 4.5kg no 2º valão',
    instagram: '@jaymepesca',
    phone: '(83) 99999-0000'
  });
  const ext = getFisherExtendedProfile('u1');
  assert.equal(ext.displayName, 'Jayme Holanda');
  assert.equal(ext.location, 'João Pessoa, PB');
  assert.equal(ext.instagram, '@jaymepesca');
  assert.equal(ext.phone, '(83) 99999-0000');

  // 4. Seguir e apagar comentário no chat
  const toggle1 = toggleFollowFisher('u1');
  assert.equal(toggle1.following, true);
  assert.equal(toggle1.followers, 1);

  const toggle2 = toggleFollowFisher('u1');
  assert.equal(toggle2.following, false);
  assert.equal(toggle2.followers, 0);

  const remainingComments = deletePostComment('demo-1', 'c-101');
  assert.equal(remainingComments.some(c => c.id === 'c-101'), false);
  assert.equal(remainingComments.some(c => c.id === 'c-102'), true);
});


test('Google AdSense e LGPD: ads.txt, Termos de Uso, Política de Privacidade e ausência da Chumbada na sidebar', async () => {
  const { readFileSync, existsSync } = await import('node:fs');

  // 1. Arquivo ads.txt
  assert.ok(existsSync('dist/ads.txt'));
  assert.ok(existsSync('ads.txt'));
  const adsTxt = readFileSync('dist/ads.txt', 'utf8');
  assert.match(adsTxt, /google\.com,\s*pub-[0-9]+,\s*DIRECT,\s*f08c47fec0942fa0/);

  // 2. Validação no HTML gerado
  const html = readFileSync('dist/index.html', 'utf8');

  // Sidebar não deve mais conter o card da Chumbada Oficial
  assert.doesNotMatch(html, /class="[^"]*chumbada-sidebar-card/);
  // Sidebar deve conter os blocos de AdSense e o card de conformidade
  assert.match(html, /id="partnerSidebar"/);
  assert.match(html, /id="adsenseTopSlot"/);
  assert.match(html, /id="adsenseSidebarSlot"/);
  assert.match(html, /class="[^"]*compliance-sidebar-card/);

  // 3. Modais de Termos de Uso e Política de Privacidade & LGPD
  assert.match(html, /id="termsDialog"/);
  assert.match(html, /id="privacyDialog"/);
  assert.match(html, /id="cookieConsentBanner"/);

  // Cláusulas obrigatórias exigidas pelo Google AdSense
  assert.match(html, /DART/);
  assert.match(html, /adssettings\.google\.com/);
  assert.match(html, /AboutAds\.info/);

  // Cláusulas da LGPD
  assert.match(html, /13\.709/);
  assert.match(html, /privacidade@marecerta\.com\.br/);
});

test('SEO Dinâmico Adaptativo por Localidade e Tags Open Graph / JSON-LD / Sitemap', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const {
    SEO_COASTAL_LOCATIONS,
    slugifyLocation,
    resolveSeoLocationBySlug,
    buildAdaptiveSeoMetadata
  } = await import('../src/preview-b/model.js');

  // 1. Verifica catálogo de localidades costeiras de alto volume (Ubersuggest)
  assert.ok(SEO_COASTAL_LOCATIONS.length >= 18);
  const recife = resolveSeoLocationBySlug('recife');
  assert.ok(recife);
  assert.equal(recife.name, 'Recife');

  const portoGalinhas = resolveSeoLocationBySlug('porto-de-galinhas');
  assert.ok(portoGalinhas);
  assert.match(portoGalinhas.name, /Porto de Galinhas/);

  const joaoPessoa = resolveSeoLocationBySlug('joao-pessoa');
  assert.ok(joaoPessoa);
  assert.equal(slugifyLocation('João Pessoa', 'Paraíba, PB'), 'joao-pessoa');

  // 2. Verifica geração de metadados adaptativos (Title, Description, Open Graph, Geo, JSON-LD)
  const seoMeta = buildAdaptiveSeoMetadata({
    location: recife,
    events: [
      { type: 'high', time: '2026-10-30T04:15', height: 2.3 },
      { type: 'low', time: '2026-10-30T10:30', height: 0.4 }
    ],
    dateString: '2026-10-30',
    moonName: 'Lua cheia',
    baseUrl: 'https://marecerta.com.br'
  });

  assert.match(seoMeta.title, /Tábua d[ae] Maré.*Recife/i);
  assert.match(seoMeta.description, /Recife/i);
  assert.match(seoMeta.description, /04:15/);
  assert.match(seoMeta.description, /10:30/);
  assert.match(seoMeta.keywords, /tabua de mare recife/i);
  assert.equal(seoMeta.canonicalUrl, 'https://marecerta.com.br/?local=recife');
  assert.equal(seoMeta.ogUrl, 'https://marecerta.com.br/?local=recife');
  assert.match(seoMeta.ogTitle, /Tábua d[ae] Maré.*Recife/i);
  assert.ok(seoMeta.jsonLd['@graph'].some(node => node['@type'] === 'WebApplication' && node.contentLocation?.['@type'] === 'Place'));
  assert.ok(seoMeta.jsonLd['@graph'].some(node => node['@type'] === 'FAQPage'));

  // 3. Verifica presença das tags Open Graph, Twitter Card, Geo, JSON-LD e Diretório Costeiro no HTML compilado
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /property="og:url"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /name="geo\.position"/);
  assert.match(html, /id="dynamicJsonLd"\s+type="application\/ld\+json"/);
  assert.match(html, /id="seoCoastalDirectory"/);
  assert.match(html, /data-seo-spot-slug="recife"/);
  assert.match(html, /data-seo-spot-slug="salvador"/);
  assert.match(html, /data-seo-spot-slug="natal"/);
  assert.match(html, /data-seo-spot-slug="porto-de-galinhas"/);

  // 4. Verifica geração de sitemap.xml e robots.txt
  assert.ok(existsSync('dist/sitemap.xml'));
  assert.ok(existsSync('dist/robots.txt'));
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  assert.match(sitemap, /\?local=recife/);
  assert.match(sitemap, /\?local=salvador/);
  assert.match(sitemap, /\?local=joao-pessoa/);
});

test('Validação Mobile & PWA: ícone enviado pelo usuário, botão no topo, Smart Banner e modal iOS/Android/Desktop', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { detectPwaPlatform } = await import('../src/preview-b/enhancements.js');

  // 1. Verifica que o ícone enviado pelo usuário está em dist/assets/pwa-app-icon.jpg
  assert.ok(existsSync('dist/assets/pwa-app-icon.jpg'));

  // 2. Verifica Web App Manifest com o novo ícone
  const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.short_name, 'Maré Certa');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.src.includes('pwa-icon-512.png') && icon.sizes === '512x512'));
  assert.ok(manifest.icons.some(icon => icon.src.includes('pwa-icon-192.png') && icon.sizes === '192x192'));

  // 3. Verifica HTML compilado: apple-touch-icon, botão no header, Smart Banner e modal de instruções
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /rel="apple-touch-icon"[^>]+pwa-app-icon\.jpg/);
  assert.match(html, /id="pwaHeaderInstallBtn"/);
  assert.match(html, /id="pwaSmartBanner"/);
  assert.match(html, /id="pwaInstallDialog"/);
  assert.match(html, /id="pwaGuideAndroid"/);
  assert.match(html, /id="pwaGuideIos"/);
  assert.match(html, /id="pwaGuideDesktop"/);

  // 4. Verifica detecção automática de plataforma (iOS / Android / Desktop)
  assert.equal(detectPwaPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(detectPwaPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), 'ios');
  assert.equal(detectPwaPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectPwaPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop');
});

test('Validação de sintaxe dos bundles JS em dist/ e Painel Admin para liberar PRO sem pagar', async () => {
  const { readFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');

  // 1. Garante que nenhum arquivo JS gerado em dist/ tenha erro de sintaxe (ex.: dist/app-b.js)
  for (const jsFile of ['dist/app-b.js', 'dist/preview-b.js', 'dist/marine-b.js', 'dist/ranking-b.js']) {
    execFileSync(process.execPath, ['--check', jsFile]);
  }

  // 2. Verifica se o evento de clique do diretório SEO não foi corrompido em dist/app-b.js
  const appB = readFileSync('dist/app-b.js', 'utf8');
  assert.match(appB, /document\.addEventListener\("click"/);
  assert.match(appB, /data-seo-spot-slug/);

  // 3. Painel Admin NÃO aparece na página pública; fica isolado em dist/admin.html com login
  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /openAdminProBtn|openAdminFromAccountBtn|adminProDialog|proSandboxToggleBtn/);
  const adminHtml = readFileSync('dist/admin.html', 'utf8');
  assert.match(adminHtml, /noindex, nofollow/);
  assert.match(adminHtml, /id="adminLoginForm"/);
  assert.match(adminHtml, /id="adminProDialog"/);
  assert.match(adminHtml, /id="adminGrantByEmailForm"/);
  assert.match(adminHtml, /id="adminUsersList"/);
  execFileSync(process.execPath, ['--check', 'dist/admin.js']);
  const { checkAdminCredentials } = await import('../src/preview-b/admin.js');
  assert.equal(checkAdminCredentials('admin', 'marecerta@2026'), true);
  assert.equal(checkAdminCredentials('admin', 'errada'), false);

  // 4. Testa funções de concessão e revogação gratuita de PRO pelo Admin
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  const {
    grantFreeProToUser,
    revokeFreeProFromUser,
    isUserAdminGrantedPro,
    isUserPro,
    getProSubscription,
    setAdminCommunityContext,
    collectAdminManageableUsers
  } = await import('../src/preview-b/community-enhancements.js');

  setAdminCommunityContext({ uid: 'u-vip-test', email: 'parceiro@pesca.com.br', displayName: 'Pedro Parceiro' }, {}, {});
  assert.equal(isUserPro('u-vip-test', 'parceiro@pesca.com.br'), false);

  // Concede PRO gratuito pelo painel de admin
  const grant = grantFreeProToUser({
    uid: 'u-vip-test',
    email: 'parceiro@pesca.com.br',
    displayName: 'Pedro Parceiro',
    roleLabel: 'Parceiro Oficial · VIP'
  });
  assert.equal(grant.active, true);
  assert.ok(isUserAdminGrantedPro('u-vip-test', 'parceiro@pesca.com.br'));
  assert.equal(isUserPro('u-vip-test', 'parceiro@pesca.com.br'), true);

  const sub = getProSubscription('u-vip-test', 'parceiro@pesca.com.br');
  assert.equal(sub.active, true);
  assert.equal(sub.isFreeGrant, true);
  assert.equal(sub.priceMonthly, 0);

  // Verifica que o usuário aparece na lista gerenciável do Admin como VIP
  const list = collectAdminManageableUsers();
  assert.ok(list.some(u => u.uid === 'u-vip-test' && u.isVipPro === true));

  // Revoga o PRO gratuito
  revokeFreeProFromUser('u-vip-test');
  assert.equal(isUserAdminGrantedPro('u-vip-test', 'parceiro@pesca.com.br'), null);
  assert.equal(isUserPro('u-vip-test', 'parceiro@pesca.com.br'), false);
});

test('Painel Admin: deleção de contas, banimentos (7d, 14d, 30d e permanente) e filtro de palavras proibidas e ilícitas', async () => {
  const { readFileSync } = await import('node:fs');
  const adminHtml = readFileSync('dist/admin.html', 'utf8');
  assert.match(adminHtml, /id="adminTotalBannedCount"/);
  assert.match(adminHtml, /data-admin-filter="banned"/);
  assert.match(adminHtml, /id="adminWordFilterForm"/);
  assert.match(adminHtml, /id="adminProhibitedWordsList"/);

  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  const {
    banUserAccount,
    unbanUserAccount,
    deleteUserAccountByAdmin,
    restoreDeletedUserAccount,
    getUserModerationStatus,
    validateTextAgainstModeration,
    addProhibitedWord,
    removeProhibitedWord,
    loadProhibitedWords
  } = await import('../src/preview-b/community-enhancements.js');

  // 1. Testa banimentos de 7, 14, 30 dias e permanente
  for (const days of [7, 14, 30]) {
    const rec = banUserAccount({ uid: `u-${days}`, email: `u${days}@teste.com`, displayName: `User ${days}`, durationDays: days });
    assert.equal(rec.status, 'banned_temp');
    assert.equal(rec.durationDays, days);
    const mod = getUserModerationStatus(`u-${days}`);
    assert.equal(mod.isRestricted, true);
    assert.equal(mod.status, 'banned_temp');
    assert.equal(mod.remainingDays, days);

    // Simula expiração futura do banimento
    const expiredMod = getUserModerationStatus(`u-${days}`, null, Date.now() + (days + 1) * 86400000);
    assert.equal(expiredMod.isRestricted, false);
    assert.equal(expiredMod.status, 'active');
  }

  // Banimento permanente e desbanimento
  const perm = banUserAccount({ uid: 'u-perm', email: 'perm@teste.com', displayName: 'Banido Perm', durationDays: 'permanent' });
  assert.equal(perm.status, 'banned_perm');
  assert.equal(getUserModerationStatus('u-perm').isRestricted, true);
  assert.equal(getUserModerationStatus('u-perm').status, 'banned_perm');
  unbanUserAccount('u-perm');
  assert.equal(getUserModerationStatus('u-perm').isRestricted, false);

  // Deleção de conta e restauração
  const del = deleteUserAccountByAdmin({ uid: 'u-del', email: 'del@teste.com', displayName: 'Conta Removida' });
  assert.equal(del.status, 'deleted');
  const delStatus = getUserModerationStatus('u-del');
  assert.equal(delStatus.isRestricted, true);
  assert.equal(delStatus.status, 'deleted');
  restoreDeletedUserAccount('u-del');
  assert.equal(getUserModerationStatus('u-del').isRestricted, false);

  // 2. Testa filtro de palavras proibidas e ilícitas (e whitelist de termos reais de pesca)
  assert.equal(validateTextAgainstModeration('Peguei 2 pampos usando isca corrupto no 2º valão!', 'relato').valid, true);
  assert.equal(validateTextAgainstModeration('Robalo-flecha na Praia de Tambaú', 'espécie').valid, true);

  const profaneCheck = validateTextAgainstModeration('Esse lugar é uma porra de praia', 'comentário');
  assert.equal(profaneCheck.valid, false);
  assert.match(profaneCheck.message, /porra/i);

  const illicitFishCheck = validateTextAgainstModeration('Hoje usamos pesca com bomba no canal', 'relato da captura');
  assert.equal(illicitFishCheck.valid, false);

  const drugsCheck = validateTextAgainstModeration('Vendo cocaina na praia', 'comentário');
  assert.equal(drugsCheck.valid, false);

  const scamCheck = validateTextAgainstModeration('Ganhe dinheiro fácil no jogo do tigrinho agora', 'bio');
  assert.equal(scamCheck.valid, false);

  // 3. Adição e remoção de palavra personalizada pelo Admin
  addProhibitedWord('rede feiticeira');
  assert.ok(loadProhibitedWords().includes('rede feiticeira'));
  assert.equal(validateTextAgainstModeration('Usando rede feiticeira na costeira', 'relato').valid, false);
  removeProhibitedWord('rede feiticeira');
  assert.equal(validateTextAgainstModeration('Usando rede feiticeira na costeira', 'relato').valid, true);
});

test('Vinculação da Localização do Perfil com o Padrão de Pesca da Main Page', async () => {
  const { resolveLocationByQuery } = await import('../src/preview-b/model.js');
  const {
    getFisherExtendedProfile,
    saveFisherExtendedProfile,
    applyLocationToMainPage
  } = await import('../src/preview-b/community-enhancements.js');
  const { readFileSync } = await import('fs');

  // 1. Resolução inteligente de localização por query
  const santos = resolveLocationByQuery('Santos');
  assert.ok(santos, 'Deve encontrar Santos');
  assert.equal(santos.name, 'Santos');
  assert.ok(santos.latitude < 0);

  const bessa = resolveLocationByQuery('Praia do Bessa');
  assert.ok(bessa, 'Deve encontrar Praia do Bessa');
  assert.equal(bessa.name, 'Praia do Bessa');

  const cabedelo = resolveLocationByQuery('Cabedelo');
  assert.ok(cabedelo, 'Deve encontrar Cabedelo');

  const rj = resolveLocationByQuery('Rio de Janeiro');
  assert.ok(rj, 'Deve encontrar Rio de Janeiro');

  // 2. Perfil herda local da main page se não configurado
  const mockSpot = { name: 'Intermares', admin1: 'Cabedelo, PB', latitude: -7.0319, longitude: -34.8375 };
  globalThis.localStorage.setItem('mare-certa-location', JSON.stringify(mockSpot));
  const defaultProfile = getFisherExtendedProfile('user-sem-local');
  assert.match(defaultProfile.location, /Intermares/);

  // 3. Salvar perfil com localização customizada e preferredLocation
  const spotSalvador = resolveLocationByQuery('Salvador');
  saveFisherExtendedProfile('user-salvador', {
    displayName: 'Pescador Baiano',
    location: 'Salvador, BA · Farol de Itapuã',
    preferredLocation: spotSalvador
  });

  const savedProfile = getFisherExtendedProfile('user-salvador');
  assert.equal(savedProfile.location, 'Salvador, BA · Farol de Itapuã');
  assert.ok(savedProfile.preferredLocation);
  assert.equal(savedProfile.preferredLocation.name, 'Salvador');

  // 4. Teste de applyLocationToMainPage
  assert.equal(applyLocationToMainPage(null), false);
  const applied = applyLocationToMainPage(spotSalvador);
  assert.equal(applied, true);
  const storedLoc = JSON.parse(globalThis.localStorage.getItem('mare-certa-location') || '{}');
  assert.equal(storedLoc.name, 'Salvador');

  // 5. Validação dos botões e vínculos no HTML do preview-b
  const indexHtml = readFileSync('dist/index.html', 'utf8');
  assert.ok(indexHtml.includes('id="myProfileForecastLinkBtn"'), 'Deve conter botão de ver previsão no perfil');
  assert.ok(indexHtml.includes('id="extUseForecastLocBtn"'), 'Deve conter botão de usar praia da previsão no formulário');
  assert.ok(indexHtml.includes('id="extSyncForecastCheckbox"'), 'Deve conter checkbox de vincular como padrão na página inicial');
  assert.ok(indexHtml.includes('id="setAsProfileDefaultLocBtn"'), 'Deve conter botão no painel de locais para salvar como padrão');

  // 6. Busca interativa de cidades para evitar erros de digitação
  const { searchCoastalLocations } = await import('../src/preview-b/model.js');
  const ubaSpots = await searchCoastalLocations('uba');
  assert.ok(ubaSpots.some(s => s.name.includes('Ubatuba')), 'Deve sugerir Ubatuba');

  const sanSpots = await searchCoastalLocations('san');
  assert.ok(sanSpots.some(s => s.name.includes('Santos')), 'Deve sugerir Santos');

  const bessaSpots = await searchCoastalLocations('bessa');
  assert.ok(bessaSpots.some(s => s.name.includes('Bessa')), 'Deve sugerir Bessa');

  assert.ok(indexHtml.includes('id="extLocationResults"'), 'Deve conter dropdown de autocomplete no perfil');
  assert.ok(indexHtml.includes('id="coastalSpotsDatalist"'), 'Deve conter datalist de cidades e praias');

  // 7. Validação dos estilos CSS em dist/versao-b.css
  const css = readFileSync('dist/versao-b.css', 'utf8');
  assert.ok(css.includes('.profile-loc-link-btn'));
  assert.ok(css.includes('.ext-loc-dropdown'));
  assert.ok(css.includes('.ext-loc-result-item'));
  assert.ok(css.includes('.autocomplete-wrapper'));
  assert.ok(css.includes('.ext-loc-preset-btn'));
  assert.ok(css.includes('.ext-sync-checkbox'));
  assert.ok(css.includes('.set-profile-loc-btn'));
});

test('Mercado Pago: links oficiais (Mensal 30d e Anual 365d), soma de 1 ano + 1 mês no upgrade e retorno ao Gratuito após expiração', async () => {
  const { readFileSync } = await import('node:fs');
  const {
    PRO_PLANS,
    PRO_PRODUCTION_PAYMENT_URLS,
    PRO_TEST_PAYMENT_URLS,
    canUseProSocialFeature,
    getProRemainingDays,
    formatProDurationLabel
  } = await import('../src/preview-b/model.js');
  const {
    setProSubscription,
    getProSubscription,
    isUserPro,
    setAdminCommunityContext,
    getFisherExtendedProfile
  } = await import('../src/preview-b/community-enhancements.js');

  // Garante que o botão antigo de ativar PRO sem pagar ("Já paguei no Mercado Pago!") foi removido do HTML
  const html = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /mpConfirmPaymentManualBtn/);

  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  // 1. Confirma links oficiais de produção ativos
  assert.equal(PRO_PRODUCTION_PAYMENT_URLS.monthly, 'https://mpago.la/2VrN9v1');
  assert.equal(PRO_PRODUCTION_PAYMENT_URLS.annual, 'https://mpago.la/2UDPJo9');
  assert.equal(PRO_PLANS.monthly.paymentUrl, 'https://mpago.la/2VrN9v1');
  assert.equal(PRO_PLANS.monthly.durationDays, 30);
  assert.equal(PRO_PLANS.annual.paymentUrl, 'https://mpago.la/2UDPJo9');
  assert.equal(PRO_PLANS.annual.durationDays, 365);

  const baseTime = 1793400000000;
  const testUser = { uid: 'fisher-mp-test', email: 'mp@marecerta.com.br', displayName: 'Pescador MP' };
  setAdminCommunityContext(testUser, {}, {});

  // Inicialmente na conta gratuita
  assert.equal(isUserPro(testUser.uid, testUser.email, baseTime), false);

  // 2. Ciclo completo do Plano MENSAL (30 dias -> volta ao gratuito no 31º dia)
  const monthlySub = setProSubscription(true, 'monthly', baseTime);
  assert.equal(monthlySub.active, true);
  assert.equal(monthlySub.planId, 'monthly');
  assert.equal(monthlySub.durationDays, 30);
  assert.equal(monthlySub.expiresAt, baseTime + 30 * 86400000);
  assert.equal(getProRemainingDays(monthlySub, baseTime), 30);

  // Verifica se o banco (extendedProfiles) gravou os 30 dias e a data de expiração
  const extMonthly = getFisherExtendedProfile(testUser.uid);
  assert.equal(extMonthly.isPro, true);
  assert.equal(extMonthly.proPlan, 'monthly');
  assert.equal(extMonthly.proDurationDays, 30);
  assert.equal(extMonthly.proExpiresAt, baseTime + 30 * 86400000);

  // Dia 15 do plano mensal: ainda ativo (restam 15 dias)
  const day15 = baseTime + 15 * 86400000;
  assert.equal(isUserPro(testUser.uid, testUser.email, day15), true);
  const subAtDay15 = getProSubscription(testUser.uid, testUser.email, day15);
  assert.equal(subAtDay15.active, true);
  assert.equal(subAtDay15.remainingDays, 15);

  // Dia 30 exato e Dia 31: expira automaticamente e volta para o plano GRATUITO
  const day30 = baseTime + 30 * 86400000;
  const day31 = baseTime + 31 * 86400000;
  assert.equal(canUseProSocialFeature(monthlySub, day30), false);
  assert.equal(isUserPro(testUser.uid, testUser.email, day30), false);
  assert.equal(isUserPro(testUser.uid, testUser.email, day31), false);
  const subAtDay31 = getProSubscription(testUser.uid, testUser.email, day31);
  assert.equal(subAtDay31.active, false);
  assert.equal(subAtDay31.expired, true);
  assert.equal(subAtDay31.remainingDays, 0);

  // 3. Ciclo completo do Plano ANUAL avulso após expiração (365 dias -> volta ao gratuito após 365 dias)
  const annualSub = setProSubscription(true, 'annual', day31);
  assert.equal(annualSub.active, true);
  assert.equal(annualSub.planId, 'annual');
  assert.equal(annualSub.durationDays, 365);
  assert.equal(annualSub.expiresAt, day31 + 365 * 86400000);
  assert.equal(getProRemainingDays(annualSub, day31), 365);

  // Verifica se o banco (extendedProfiles) gravou os 365 dias e a data de expiração
  const extAnnual = getFisherExtendedProfile(testUser.uid);
  assert.equal(extAnnual.isPro, true);
  assert.equal(extAnnual.proPlan, 'annual');
  assert.equal(extAnnual.proDurationDays, 365);
  assert.equal(extAnnual.proExpiresAt, day31 + 365 * 86400000);

  // Dia 200 do plano anual: ainda ativo (restam 165 dias)
  const annualDay200 = day31 + 200 * 86400000;
  assert.equal(isUserPro(testUser.uid, testUser.email, annualDay200), true);
  const subAtDay200 = getProSubscription(testUser.uid, testUser.email, annualDay200);
  assert.equal(subAtDay200.active, true);
  assert.equal(subAtDay200.remainingDays, 165);

  // Dia 365 exato e Dia 366 do plano anual: expira automaticamente e volta para o plano GRATUITO
  const annualDay365 = day31 + 365 * 86400000;
  const annualDay366 = day31 + 366 * 86400000;
  assert.equal(canUseProSocialFeature(annualSub, annualDay365), false);
  assert.equal(isUserPro(testUser.uid, testUser.email, annualDay365), false);
  assert.equal(isUserPro(testUser.uid, testUser.email, annualDay366), false);
  const subAtDay366 = getProSubscription(testUser.uid, testUser.email, annualDay366);
  assert.equal(subAtDay366.active, false);
  assert.equal(subAtDay366.expired, true);
  assert.equal(subAtDay366.remainingDays, 0);

  // 4. SOMA DE PLANOS (Upgrade Mensal -> Anual = 1 ano + 1 mês = 395 dias)
  const upgradeStartTime = annualDay366 + 86400000;
  const activeMonthly = setProSubscription(true, 'monthly', upgradeStartTime);
  assert.equal(activeMonthly.durationDays, 30);

  // Estando com o Mensal ativo (30 dias), compra o Anual (+365 dias) -> fica com 395 dias (1 ano + 1 mês)
  const stackedSub = setProSubscription(true, 'annual', upgradeStartTime);
  assert.equal(stackedSub.active, true);
  assert.equal(stackedSub.planId, 'annual');
  assert.equal(stackedSub.stackedFrom, 'monthly');
  assert.equal(stackedSub.durationDays, 395);
  assert.equal(stackedSub.remainingDays, 395);
  assert.equal(stackedSub.expiresAt, upgradeStartTime + 395 * 86400000);
  assert.match(formatProDurationLabel(stackedSub, upgradeStartTime), /1 ano \+ 1 mês \(395 dias\)/);

  // No dia 380 ainda está PRO (faltam 15 dias do período acumulado de 395 dias)
  const day380 = upgradeStartTime + 380 * 86400000;
  assert.equal(isUserPro(testUser.uid, testUser.email, day380), true);
  assert.equal(getProSubscription(testUser.uid, testUser.email, day380).remainingDays, 15);

  // No dia 395/396 expira e retorna ao plano Gratuito
  const day396 = upgradeStartTime + 396 * 86400000;
  assert.equal(isUserPro(testUser.uid, testUser.email, day396), false);
  assert.equal(getProSubscription(testUser.uid, testUser.email, day396).active, false);
});

test('Denúncias de comentários abusivos, suspensão pelo admin, durações customizadas de PRO (3d, 1m, 1a) e filtro do feed', async () => {
  const { readFileSync } = await import('node:fs');
  const indexHtml = readFileSync('dist/index.html', 'utf8');
  const adminHtml = readFileSync('dist/admin.html', 'utf8');
  const css = readFileSync('dist/versao-b.css', 'utf8');

  // 1. Validação visual e semântica no HTML e CSS
  assert.match(indexHtml, /Procure amigos de pesca e veja troféus/, 'Feed deve conter o novo título');
  assert.match(indexHtml, /id="filterLocationResults"/, 'Feed deve conter dropdown de autocomplete no filtro de local');
  assert.match(indexHtml, /data-lpignore="true"/, 'Filtro de local deve conter proteção contra autofill do navegador');
  assert.match(indexHtml, /id="reportCommentDialog"/, 'Deve existir modal de denúncia de comentários');
  assert.match(indexHtml, /id="reportCommentForm"/, 'Deve existir formulário de relato do ocorrido');

  assert.match(adminHtml, /id="adminReportsList"/, 'Painel Admin deve conter listagem de denúncias recebidas');
  assert.match(adminHtml, /name="vipDuration"/, 'Formulário do Admin deve conter seletor de duração');
  assert.match(adminHtml, /value="3"/, 'Duração deve ter opção de 3 dias');
  assert.match(adminHtml, /value="30"/, 'Duração deve ter opção de 30 dias (1 mês)');
  assert.match(adminHtml, /value="365"/, 'Duração deve ter opção de 365 dias (1 ano)');

  assert.match(css, /\.topbar-right-actions/, 'CSS deve conter ações à direita na topbar');
  assert.match(css, /\.social-report-comment-btn/, 'CSS deve conter estilo para o botão de denúncia de comentários');
  assert.match(css, /\.admin-reports-section/, 'CSS deve conter estilo da seção de denúncias no admin');

  // 2. Mock de storage para testes de funções
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  const {
    submitCommentReport,
    loadAdminReportsMap,
    resolveAdminReport,
    grantFreeProToUser,
    banUserAccount,
    getUserModerationStatus,
    getFisherExtendedProfile,
    isUserPro
  } = await import('../src/preview-b/community-enhancements.js');

  // 3. Teste de denúncia de comentário pelo dono da postagem / pescador
  const report = submitCommentReport({
    postId: 'post-101',
    captureTitle: 'Robalo Flecha 4.2kg',
    commentId: 'c-999',
    commentText: 'Pescador fraco, isso aí foi comprado no mercado!',
    offenderUid: 'user-troll-1',
    offenderName: 'Troll das Praias',
    reporterUid: 'user-dono-post',
    reporterName: 'Carlos Pescador',
    reason: 'Comentário ofensivo, desrespeitoso e difamatório na minha postagem.'
  });

  assert.ok(report.id.startsWith('rep-'));
  assert.equal(report.status, 'pending');
  assert.equal(report.offenderUid, 'user-troll-1');
  assert.equal(report.commentId, 'c-999');

  const mapReports = loadAdminReportsMap();
  assert.ok(mapReports[report.id]);
  assert.equal(mapReports[report.id].reason, 'Comentário ofensivo, desrespeitoso e difamatório na minha postagem.');

  // Validação: relato muito curto deve lançar erro
  assert.throws(() => {
    submitCommentReport({ reason: 'oi' });
  }, /pelo menos 3 caracteres/);

  // 4. Admin analisa no painel e aplica suspensão de 14 dias no perfil infrator
  banUserAccount({
    uid: report.offenderUid,
    displayName: report.offenderName,
    durationDays: 14,
    reason: 'Denúncia de comentário abusivo confirmada pelo administrador'
  });
  resolveAdminReport(report.id, 'resolved');

  const trollMod = getUserModerationStatus('user-troll-1');
  assert.equal(trollMod.isRestricted, true);
  assert.equal(trollMod.durationDays, 14);
  assert.equal(loadAdminReportsMap()[report.id].status, 'resolved');

  // 5. Teste de concessão de PRO no Admin com diferentes durações
  const now = 1793400000000;

  // 5.1 Concessão de 3 dias (degustação)
  const grant3d = grantFreeProToUser({
    uid: 'pescador-3d',
    email: 'teste3d@praia.com',
    displayName: 'Pescador Três Dias',
    durationDays: 3
  });
  assert.equal(grant3d.durationDays, 3);
  assert.equal(grant3d.expiresAt >= Date.now() + 3 * 86400000 - 5000, true);
  const ext3d = getFisherExtendedProfile('pescador-3d');
  assert.equal(ext3d.isPro, true);
  assert.equal(ext3d.proDurationDays, 3);
  assert.ok(ext3d.proExpiresAt);

  // 5.2 Concessão de 1 mês (30 dias)
  const grant30d = grantFreeProToUser({
    uid: 'pescador-30d',
    email: 'teste30d@praia.com',
    displayName: 'Pescador Um Mês',
    durationDays: 30
  });
  assert.equal(grant30d.durationDays, 30);
  const ext30d = getFisherExtendedProfile('pescador-30d');
  assert.equal(ext30d.isPro, true);
  assert.equal(ext30d.proDurationDays, 30);

  // 5.3 Concessão de 1 ano (365 dias)
  const grant365d = grantFreeProToUser({
    uid: 'pescador-365d',
    email: 'teste365d@praia.com',
    displayName: 'Pescador Um Ano',
    durationDays: 365
  });
  assert.equal(grant365d.durationDays, 365);
  const ext365d = getFisherExtendedProfile('pescador-365d');
  assert.equal(ext365d.isPro, true);
  assert.equal(ext365d.proDurationDays, 365);
});

test('Image Cropper (delimitador, zoom e formatos) e Pódio Top 3 com fotos em círculo e bordas de medalhas (ouro, prata e bronze)', async () => {
  const {
    sanitizeFirebaseKey,
    renderRankingPodium
  } = await import('../src/preview-b/community-enhancements.js');
  const { readFileSync } = await import('fs');

  // 1. Sanitização de chaves para o Firebase Realtime Database
  assert.equal(sanitizeFirebaseKey('jaymeholanda.dev@gmail.com'), 'jaymeholanda_dev@gmail_com');
  assert.equal(sanitizeFirebaseKey('user#1$2/3[4]5.end'), 'user_1_2_3_4_5_end');

  // 2. Presença do Cropper Modal e do Pódio no HTML gerado
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="imageCropperDialog"/);
  assert.match(html, /id="cropperViewport"/);
  assert.match(html, /id="cropperMask"/);
  assert.match(html, /id="cropperZoomRange"/);
  assert.match(html, /min="0\.7"/);
  assert.match(html, /max="3\.5"/);
  assert.match(html, /data-cropper-ratio="post"[^>]*>📸 Encaixe no Post/);
  assert.match(html, /data-cropper-ratio="1:1"[^>]*>1:1 Quadrado<\/button>/);
  assert.match(html, /id="cropperRotateBtn"/);
  assert.match(html, /id="cropperApplyBtn"/);
  assert.match(html, /id="rankingTopPodium"/);

  // 3. Renderização do Pódio Top 3 com Medalhas e Círculos
  const dummyEl = { hidden: false, innerHTML: '', querySelectorAll: () => [] };
  globalThis.document = {
    getElementById: id => (id === 'rankingTopPodium' ? dummyEl : null)
  };

  const sampleRanking = [
    { uid: 'u-1', name: 'Jayme Holanda', quantity: 15, species: 4, rank: 1 },
    { uid: 'u-2', name: 'Henrique Costa', quantity: 10, species: 3, rank: 2 },
    { uid: 'u-3', name: 'Juliana Mar', quantity: 7, species: 2, rank: 3 },
    { uid: 'u-4', name: 'Rafael Silva', quantity: 4, species: 1, rank: 4 }
  ];

  renderRankingPodium(sampleRanking, {}, {});
  assert.equal(dummyEl.hidden, false);
  assert.match(dummyEl.innerHTML, /is-gold/);
  assert.match(dummyEl.innerHTML, /is-silver/);
  assert.match(dummyEl.innerHTML, /is-bronze/);
  assert.match(dummyEl.innerHTML, /Jayme Holanda/);
  assert.match(dummyEl.innerHTML, /Henrique Costa/);
  assert.match(dummyEl.innerHTML, /Juliana Mar/);
  assert.match(dummyEl.innerHTML, /podium-avatar-ring/);

  // 4. Se o ranking estiver vazio, esconde o pódio
  renderRankingPodium([], {}, {});
  assert.equal(dummyEl.hidden, true);
});

test('Compartilhamento WhatsApp (mensagem junta com foto e link direto) e auto-redirecionamento para ranking e capturas', async () => {
  const {
    handleSharedCaptureNavigation
  } = await import('../src/preview-b/community-enhancements.js');
  const { readFileSync } = await import('fs');

  // 1. Presença apenas dos botões de Compartilhar no WhatsApp e Baixar Imagem (sem botão de copiar link nem textos redundantes)
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="nativeShareTrophyBtn"/);
  assert.match(html, /id="downloadTrophyBtn"/);
  assert.doesNotMatch(html, /id="copyShareLinkBtn"/);
  assert.doesNotMatch(html, /id="shareStatusAlert"/);
  assert.match(html, /whatsapp-share-btn/);

  // 2. Simulação de navegação por URL compartilhada (?tab=ranking&capture=cap-123#ranking)
  let clickedTab = null;
  let highlightedCard = false;
  let scrolledIntoView = false;

  const mockCard = {
    classList: {
      add: cls => { if (cls === 'highlight-shared-capture') highlightedCard = true; },
      remove: () => {}
    },
    scrollIntoView: () => { scrolledIntoView = true; }
  };

  const mockRankingTab = {
    getAttribute: attr => (attr === 'aria-selected' ? 'false' : null),
    click: () => { clickedTab = 'rankingTab'; }
  };

  const mockRankingPanel = { hidden: true };

  globalThis.window = {
    location: {
      origin: 'https://marecerta.com.br',
      pathname: '/',
      search: '?tab=ranking&capture=cap-123',
      hash: '#ranking'
    },
    addEventListener: () => {}
  };

  globalThis.document = {
    getElementById: id => {
      if (id === 'rankingTab') return mockRankingTab;
      if (id === 'rankingPanel') return mockRankingPanel;
      if (id === 'capture-card-cap-123') return mockCard;
      return null;
    },
    querySelector: sel => {
      if (sel && sel.includes('cap-123')) return mockCard;
      return null;
    }
  };

  handleSharedCaptureNavigation();

  assert.equal(clickedTab, 'rankingTab');
  assert.equal(mockRankingPanel.hidden, false);
  await new Promise(r => setTimeout(r, 160));
  assert.equal(scrolledIntoView, true);
  assert.equal(highlightedCard, true);
});

test('Edição de post: opção de apagar a imagem e opção de apagar a publicação inteira', async () => {
  const {
    setupCaptureEditPhoto,
    isPendingTrophyPhotoRemoved,
    setPendingTrophyPhotoRemoved,
    removeLocalS3Photo,
    saveLocalS3Photo,
    loadLocalS3Photos
  } = await import('../src/preview-b/community-enhancements.js');
  const { readFileSync } = await import('fs');

  // 1. Presença do botão de apagar foto e botão de apagar publicação no HTML
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="removeCapturePhotoBtn"[^>]*>🗑️ Apagar foto da captura<\/button>/);
  assert.match(html, /id="deleteCaptureInEditBtn"[^>]*>🗑️ Apagar esta publicação<\/button>/);

  // 2. Mock de elementos do formulário de edição
  let previewHidden = true;
  let previewSrc = '';
  let statusText = '';
  let removeBtnText = '';

  const mockPreviewWrap = {
    set hidden(val) { previewHidden = val; },
    get hidden() { return previewHidden; }
  };
  const mockPreviewImg = {
    set src(val) { previewSrc = val; },
    get src() { return previewSrc; }
  };
  const mockStatus = {
    set textContent(val) { statusText = val; },
    get textContent() { return statusText; },
    className: ''
  };
  const mockRemoveBtn = {
    set textContent(val) { removeBtnText = val; },
    get textContent() { return removeBtnText; }
  };

  globalThis.document = {
    getElementById: id => {
      if (id === 'capturePhotoPreviewWrap') return mockPreviewWrap;
      if (id === 'capturePhotoPreviewImg') return mockPreviewImg;
      if (id === 'capturePhotoStatus') return mockStatus;
      if (id === 'removeCapturePhotoBtn') return mockRemoveBtn;
      return null;
    }
  };

  // 3. Ao entrar na edição de captura com foto existente
  const testCapture = {
    uid: 'user-1',
    species: 'Pampo',
    photoUrl: 'https://marecerta.com.br/test-trophy.jpg'
  };

  setupCaptureEditPhoto('test-cap-1', testCapture);
  assert.equal(previewHidden, false);
  assert.equal(previewSrc, 'https://marecerta.com.br/test-trophy.jpg');
  assert.match(removeBtnText, /Apagar foto da captura/);
  assert.equal(isPendingTrophyPhotoRemoved(), false);

  // 4. Marcação de foto apagada
  setPendingTrophyPhotoRemoved(true);
  assert.equal(isPendingTrophyPhotoRemoved(), true);

  // 5. Remoção de foto do storage local
  saveLocalS3Photo('test-cap-s3', { dataUrl: 'data:image/webp;base64,123' });
  assert.ok(loadLocalS3Photos()['test-cap-s3']);
  removeLocalS3Photo('test-cap-s3');
  assert.equal(loadLocalS3Photos()['test-cap-s3'], undefined);
});

test('Criação de conta com confirmação de senha e login oficial via Google', async () => {
  const { readFileSync } = await import('fs');

  // 1. Validar elementos no HTML da aplicação (dist/index.html)
  const html = readFileSync('dist/index.html', 'utf8');

  // Campo de confirmação de senha no formulário
  assert.match(html, /<label id="confirmPasswordField" hidden>Confirmar senha/);
  assert.match(html, /name="confirmPassword"/);
  assert.match(html, /placeholder="Repita a senha para confirmar"/);

  // Botão e divisor oficial do Google
  assert.match(html, /class="auth-divider-line"><span>ou continue com<\/span><\/div>/);
  assert.match(html, /<button id="googleAuthBtn" class="google-auth-btn" type="button">/);
  assert.match(html, /id="googleAuthBtnText">Entrar com Google<\/span>/);
  assert.match(html, /class="google-svg-icon"/);

  // 2. Validar lógica no bundle compilado (dist/ranking-b.js)
  const rankingJs = readFileSync('dist/ranking-b.js', 'utf8');

  // Checagem de que as senhas precisam coincidir no cadastro
  assert.ok(
    rankingJs.includes('coincidem') && rankingJs.includes('confirmPassword'),
    'Deve conter validação e mensagem de erro quando senhas não coincidem'
  );

  // Integração com GoogleAuthProvider e signInWithPopup do Firebase
  assert.ok(
    rankingJs.includes('GoogleAuthProvider') && rankingJs.includes('signInWithPopup'),
    'Deve importar e chamar GoogleAuthProvider e signInWithPopup'
  );

  // 3. Validar estilização em dist/versao-b.css
  const css = readFileSync('dist/versao-b.css', 'utf8');
  assert.ok(css.includes('.google-auth-btn'), 'CSS deve conter estilo do botão Google');
  assert.ok(css.includes('.auth-divider-line'), 'CSS deve conter linha divisora do social login');
  assert.ok(css.includes('.auth-social-wrap'), 'CSS deve conter wrapper de login social');
});

test('Sininho de notificações com pulse continuous, navegação da galeria para o ranking e cropper preciso', async () => {
  const { readFileSync } = await import('fs');
  const {
    getUnreadNotificationsData,
    markCaptureCommentsAsRead,
    getUnreadCommentsCountForCapture,
    loadReadCommentsMap,
    saveReadCommentsMap
  } = await import('../src/preview-b/community-enhancements.js');

  // 1. Validar elementos no HTML da aplicação (dist/index.html)
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="notifBellBtn"/, 'HTML deve conter botão do sininho de notificações');
  assert.match(html, /id="notifBellBadge"/, 'HTML deve conter badge com contador do sininho');
  assert.match(html, /id="rankingTabBadge"/, 'HTML deve conter badge na aba Ranking & capturas');

  // 2. Validar CSS de notificações e pulse continuous
  const css = readFileSync('dist/versao-b.css', 'utf8');
  assert.ok(css.includes('.notif-bell-btn'), 'CSS deve conter estilo do sininho');
  assert.ok(css.includes('.notif-bell-badge'), 'CSS deve conter estilo do badge');
  assert.ok(css.includes('.pulse-continuous'), 'CSS deve conter classe de animação contínua');
  assert.ok(css.includes('@keyframes notifPulseContinuous'), 'CSS deve conter keyframes de pulso contínuo');
  assert.ok(css.includes('@keyframes notifBellSwing'), 'CSS deve conter animação de balanço do sininho');
  assert.ok(css.includes('.profile-gallery-item'), 'CSS deve conter estilo da galeria');

  // 3. Testar lógica estrita de notificações: APENAS post do próprio usuário ou menção a ele
  saveReadCommentsMap({});
  const { saveSocialState, loadSocialState } = await import('../src/preview-b/community-enhancements.js');
  const social = loadSocialState();
  social.comments['cap-jayme-1'] = [
    { id: 'c-1', author: 'Carlos Pescador', authorUid: 'uid-other', text: 'Parabéns Jayme!' }
  ];
  social.comments['demo-2'] = [
    { id: 'c-2', author: 'Juliana Mar', authorUid: 'demo-fisher-3', text: 'Comentário em post de outro pescador sem menção' }
  ];
  saveSocialState(social);

  const mockCaptures = {
    'cap-jayme-1': {
      uid: 'uid-jayme-test',
      authorName: 'Jayme Holanda',
      species: 'Pampo',
      weight: 0.5
    },
    'demo-2': {
      uid: 'demo-fisher-2',
      authorName: 'Marcos Surfcasting',
      species: 'Pampo-galhudo'
    }
  };

  const initialNotifs = getUnreadNotificationsData(mockCaptures, 'uid-jayme-test');
  assert.equal(initialNotifs.totalUnread, 1, 'Deve detectar apenas a notificação do post do Jayme, ignorando posts de terceiros');
  assert.ok(initialNotifs.unreadCaptureIds.includes('cap-jayme-1'), 'Deve listar a captura do Jayme');
  assert.ok(!initialNotifs.unreadCaptureIds.includes('demo-2'), 'NUNCA deve notificar post de terceiro (ex: Marcos Surfcasting)');

  // 4. Testar leitura de mensagens da captura
  markCaptureCommentsAsRead('cap-jayme-1', 'uid-jayme-test');
  const readAfter = getUnreadCommentsCountForCapture('cap-jayme-1', 'uid-jayme-test');
  assert.equal(readAfter, 0, 'Após ler mensagens do post, a contagem daquele post deve zerar');

  const notifsAfterRead = getUnreadNotificationsData(mockCaptures, 'uid-jayme-test');
  assert.equal(notifsAfterRead.totalUnread, 0, 'Notificações ativas do post devem cessar completamente');

  // 5. Validar que o cropper no código exporta com a ordem correta de transformações (translate antes de scale)
  const commEnhanceCode = readFileSync('src/preview-b/community-enhancements.js', 'utf8');
  const translateIdx = commEnhanceCode.indexOf('ctx.translate(cropperState.translateX * factor');
  const scaleIdx = commEnhanceCode.indexOf('ctx.scale(cropperState.scale, cropperState.scale)');
  assert.ok(translateIdx > 0 && scaleIdx > 0, 'Canvas deve conter translate e scale');
  assert.ok(translateIdx < scaleIdx, 'O translate deve ocorrer ANTES do scale no canvas para não amplificar o arrasto com zoom');
  assert.ok(commEnhanceCode.includes('destination-in'), 'Deve aplicar máscara circular para fotos de perfil');
});

test('Painel Admin: atualização automática a cada 15 segundos, botão manual e sincronização com Firebase mareCerta/profiles', async () => {
  const { readFileSync } = await import('node:fs');
  const adminHtml = readFileSync('dist/admin.html', 'utf8');

  // 1. Verifica presença dos elementos da barra de sincronização no painel administrativo isolado
  assert.match(adminHtml, /class="admin-sync-bar"/, 'Deve conter a barra de sincronização');
  assert.match(adminHtml, /id="adminSyncStatusText"/, 'Deve exibir o status da sincronização');
  assert.match(adminHtml, /id="adminSyncCountdown"/, 'Deve conter a contagem regressiva de 15s');
  assert.match(adminHtml, /id="adminRefreshNowBtn"/, 'Deve conter o botão manual Atualizar agora');
  assert.match(adminHtml, /id="adminAutoRefreshCheck"/, 'Deve conter o toggle para atualizar a cada 15s');

  // 2. Verifica funções exportadas no módulo community-enhancements.js
  const commModule = await import('../src/preview-b/community-enhancements.js');
  assert.equal(typeof commModule.refreshAdminDataFromFirebase, 'function');
  assert.equal(typeof commModule.setupAdminAutoRefresh, 'function');

  // 3. Verifica escuta de mareCerta/profiles e mareCerta/captures no código-fonte
  const commEnhanceCode = readFileSync('src/preview-b/community-enhancements.js', 'utf8');
  assert.match(commEnhanceCode, /mareCerta\/profiles/, 'Deve escutar perfis sob a raiz mareCerta/profiles');
  assert.match(commEnhanceCode, /mareCerta\/captures/, 'Deve escutar capturas sob a raiz mareCerta/captures');

  // 4. Verifica estilos CSS da barra de sincronização
  const stylesCss = readFileSync('src/preview-b/styles.css', 'utf8');
  assert.match(stylesCss, /\.admin-sync-bar/, 'CSS deve conter estilo da barra de sincronização');
  assert.match(stylesCss, /\.admin-refresh-btn/, 'CSS deve conter estilo do botão de atualização manual');
  assert.match(stylesCss, /@keyframes adminSpin/, 'CSS deve conter animação de rotação para feedback visual');
});

test('Design Patterns de comentários: ações abaixo do texto do comentário e infraestrutura de upload AWS S3 protegida', async () => {
  const { readFileSync, existsSync } = await import('node:fs');

  // 1. Verifica ordem no HTML gerado dos comentários: social-comment-body deve vir ANTES de social-comment-actions
  const commEnhanceCode = readFileSync('src/preview-b/community-enhancements.js', 'utf8');
  const bodyIdx = commEnhanceCode.indexOf('<p class="social-comment-body">${escapeHtml(c.text)}</p>');
  const actionsIdx = commEnhanceCode.indexOf('<div class="social-comment-actions">', bodyIdx);
  assert.ok(bodyIdx > 0 && actionsIdx > bodyIdx, 'O texto do comentário deve vir antes das ações de responder/denunciar/apagar');

  // 2. Verifica que .env.example existe e que o módulo s3-uploader.js existe
  assert.ok(existsSync('.env.example'), '.env.example deve existir como modelo');
  assert.ok(existsSync('backend-hostinger/s3-uploader.js'), 'backend-hostinger/s3-uploader.js deve existir');
  assert.ok(existsSync('backend-hostinger/upload_s3.php'), 'backend-hostinger/upload_s3.php deve existir');

  // 3. Verifica funções exportadas no módulo community-enhancements.js
  const commModule = await import('../src/preview-b/community-enhancements.js');
  assert.equal(typeof commModule.uploadImageToS3, 'function');
  assert.equal(typeof commModule.uploadCommunityImage, 'function');

  // 4. Garante que .env.example não contém credenciais reais
  const envExample = readFileSync('.env.example', 'utf8');
  assert.match(envExample, /AWS_ACCESS_KEY_ID=sua_access_key_aqui/);
  assert.doesNotMatch(envExample, /AKIASNXINGS2GKFRTUGR/);

  // 5. Garante que nenhuma foto é enviada para o Firebase Storage (exclusivo AWS S3 pescaimages)
  assert.doesNotMatch(commEnhanceCode, /from ['"]firebase\/storage['"]/);
  assert.equal(typeof commModule.uploadTrophyPhotoToFirebaseStorage, 'undefined');
});



