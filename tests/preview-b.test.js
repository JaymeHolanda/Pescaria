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

  assert.equal(PRO_PLANS.annual.priceMonthly, 5);
  assert.equal(PRO_PLANS.annual.billingTotal, 60);
  assert.equal(PRO_PLANS.monthly.priceMonthly, 15);

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
