import { readFileSync, writeFileSync } from 'node:fs';

// Keep Pages' root entry synchronized with the canonical static page in dist.
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const entry = html.replace(/(href|src)="\.\/(styles\.css|app\.js|ranking\.js|tabs\.js|assets\/[^\"]+)"/g, '$1="./dist/$2"');
writeFileSync(new URL('../index.html', import.meta.url), entry);
