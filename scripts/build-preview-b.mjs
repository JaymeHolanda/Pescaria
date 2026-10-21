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
html = replace(html, '<link rel="stylesheet" href="./styles.css" />', '<link rel="stylesheet" href="./styles.css" />\n    <link rel="stylesheet" href="./versao-b.css" />');
html = replace(html, '<title>Maré Certa — planeje sua pescaria</title>', '<title>Maré Certa — sua próxima pescaria</title>');
html = replace(html, '<body>', '<body class="preview-b">');
html = html.replace(/<section class="intro" aria-labelledby="pageTitle">[\s\S]*?<\/section>/, `<section class="intro b-intro" aria-labelledby="pageTitle">
          <div class="b-hero-copy"><p class="eyebrow">AO RITMO DO MAR</p><h1 id="pageTitle">Seu próximo encontro<br><em>com o mar.</em></h1><p class="b-intro-note">A maré marca o horário. Você escolhe a próxima pescaria.</p><div class="today-line"><span id="todayLabel">Hoje</span><span id="dataStatus">Buscando dados…</span></div></div>
          <article id="nextWindow" class="b-next-window" aria-labelledby="nextWindowTitle" aria-busy="true"><div class="b-next-top"><span class="b-status-dot"></span><span>SEU PRÓXIMO HORÁRIO</span><svg viewBox="0 0 64 32" aria-hidden="true"><path d="M2 18 Q16 0 30 18 T60 18 M2 27 Q16 9 30 27 T60 27"/></svg></div><h2 id="nextWindowTitle">Buscando sua próxima janela</h2><strong id="nextWindowHours">—</strong><p id="nextWindowDate">Consultando os horários de maré…</p><div class="b-next-bottom"><span id="nextWindowCountdown">Atualizando…</span><a id="nextWindowLink" href="#windowsB" aria-label="Ver janelas da próxima maré alta">Ver esta janela <span aria-hidden="true">↘</span></a></div></article>
        </section>`);
const summary = html.match(/<section class="daily-summary card"[\s\S]*?<\/section>/)?.[0];
const windows = html.match(/<section class="window-section"[\s\S]*?<\/section>/)?.[0];
if (!summary || !windows) throw new Error('Seções de previsão não encontradas.');
html = html.replace(summary, '').replace(windows, '');
html = replace(html, '<section class="dashboard"', windows.replace('<section class="window-section"', '<section id="windowsB" class="window-section"') + '\n\n        <section class="dashboard"');
html = replace(html, '<section id="marinePanel"', summary + '\n\n        <section id="marinePanel"');
html = html.replace(/(<svg id="tideChart"[^>]*><\/svg>)/, '$1\n              <div id="chartTooltip" class="b-chart-tooltip" hidden></div>');
html = replace(html, '<div class="tide-events"', `<div id="chartTools" class="b-chart-tools" hidden><div class="b-chart-readout"><label for="chartScrub">Explore a maré</label><output id="chartReadout" for="chartScrub">—</output></div><input id="chartScrub" type="range" min="0" max="1" value="0" step="1" aria-label="Horário na curva de maré"><div class="b-chart-legend"><span><i></i> Janelas sugeridas</span><span>Toque na curva ou deslize o horário</span></div></div>\n            <div class="tide-events"`);
html = replace(html, '<section id="myCapturesSection"', `<section class="b-capture-filters card" aria-labelledby="captureFiltersTitle"><div><p class="eyebrow">SEU DIÁRIO, MAIS PERTO</p><h2 id="captureFiltersTitle">Encontre uma pescaria.</h2></div><form id="captureFilterForm"><label>Espécie<input id="filterSpecies" type="search" placeholder="Ex.: pampo" autocomplete="off"></label><label>Local<input id="filterLocation" type="search" placeholder="Ex.: Intermares" autocomplete="off"></label><label>De<input id="filterFrom" type="date"></label><label>Até<input id="filterTo" type="date"></label><button id="clearCaptureFilters" type="button">Limpar filtros</button></form><p id="captureFilterResult" role="status">Carregando o diário…</p></section>\n        <section id="myCapturesSection"`);
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

let ranking = read('src/ranking.js');
ranking = replace(ranking, "import { auth, database } from './firebase.js';", "import { auth, database } from './firebase.js';\nimport { filterCaptures } from './preview-b/model.js';");
ranking = replace(ranking, '  const recent = all.slice(0, 30);', `  const filters = { species: $('filterSpecies').value, location: $('filterLocation').value, from: $('filterFrom').value, to: $('filterTo').value };
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
