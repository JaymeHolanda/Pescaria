import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const distFile = name => new URL(`../dist/${name}`, import.meta.url);
const revision = name => createHash('sha256').update(readFileSync(distFile(name), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

// Version module dependencies as well as the HTML entry points, so a new page
// cannot reuse old CSS or JS exports from a previous GitHub Pages deployment.
const app = readFileSync(distFile('app.js'), 'utf8').replace(/from '(\.\/)(conditions|tides|marine)\.js(?:\?v=[a-f0-9]+)?'/g,
  (_, prefix, name) => `from '${prefix}${name}.js?v=${revision(`${name}.js`)}'`);
writeFileSync(distFile('app.js'), app);
const html = readFileSync(distFile('index.html'), 'utf8').replace(/(href|src)="\.\/(styles\.css|app\.js|ranking\.js|tabs\.js)(?:\?v=[a-f0-9]+)?"/g,
  (_, attribute, name) => `${attribute}="./${name}?v=${revision(name)}"`);
writeFileSync(distFile('index.html'), html);

// Keep Pages' root entry synchronized with the canonical static page in dist.
const entry = html.replace(/(href|src)="\.\/(styles\.css\?v=[a-f0-9]+|app\.js\?v=[a-f0-9]+|ranking\.js\?v=[a-f0-9]+|tabs\.js\?v=[a-f0-9]+|assets\/[^\"]+)"/g, '$1="./dist/$2"');
writeFileSync(new URL('../index.html', import.meta.url), entry);
