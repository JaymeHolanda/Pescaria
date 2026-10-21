import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const distFile = name => new URL(`../dist/${name}`, import.meta.url);
const revision = name => createHash('sha256').update(readFileSync(distFile(name), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

// Refresh module URLs so GitHub Pages does not reuse an older forecast bundle.
for (const appName of ['app.js', 'app-b.js']) {
  if (!existsSync(distFile(appName))) continue;
  const app = readFileSync(distFile(appName), 'utf8').replace(/from '(\.\/)(conditions|tides|marine|marine-b|preview-b)\.js(?:\?v=[a-f0-9]+)?'/g,
    (_, prefix, name) => `from '${prefix}${name}.js?v=${revision(`${name}.js`)}'`);
  writeFileSync(distFile(appName), app);
}

// Keep both design versions cache-safe and point the root Pages entry at B.
for (const pageName of ['index.html', 'versao-a.html', 'versao-b.html']) {
  if (!existsSync(distFile(pageName))) continue;
  const page = readFileSync(distFile(pageName), 'utf8').replace(/(href|src)="\.\/(styles\.css|versao-b\.css|app(?:-b)?\.js|ranking(?:-b)?\.js|tabs\.js)(?:\?v=[a-f0-9]+)?"/g,
    (_, attribute, name) => `${attribute}="./${name}?v=${revision(name)}"`).replace(/[ \t]+(?=\r?\n)/g, '');
  writeFileSync(distFile(pageName), page);
}

const html = readFileSync(distFile('index.html'), 'utf8');
const entry = html.replace(/(href|src)="\.\/(styles\.css\?v=[a-f0-9]+|versao-b\.css\?v=[a-f0-9]+|app(?:-b)?\.js\?v=[a-f0-9]+|ranking(?:-b)?\.js\?v=[a-f0-9]+|tabs\.js\?v=[a-f0-9]+|assets\/[^\"]+)"/g, '$1="./dist/$2"');
writeFileSync(new URL('../index.html', import.meta.url), entry);
