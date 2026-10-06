import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initTabs, TAB_NAMES } from '../src/tabs.js';

function fixture() {
  const elements = {};
  for (const name of TAB_NAMES) {
    elements[`${name}Tab`] = { attributes: {}, listeners: {}, setAttribute(k, v) { this.attributes[k] = v; }, addEventListener(k, fn) { this.listeners[k] = fn; }, focus() { this.focused = true; } };
    elements[`${name}Panel`] = { hidden: name !== 'forecast' };
  }
  initTabs({ getElementById: id => elements[id] });
  return elements;
}
test('dicas ficam entre previsão e ranking, com apenas um painel ativo', () => {
  assert.deepEqual(TAB_NAMES, ['forecast', 'tips', 'ranking']);
  const els = fixture();
  for (const selected of TAB_NAMES) {
    els[`${selected}Tab`].listeners.click();
    for (const name of TAB_NAMES) {
      assert.equal(els[`${name}Panel`].hidden, name !== selected);
      assert.equal(els[`${name}Tab`].attributes['aria-selected'], String(name === selected));
      assert.equal(els[`${name}Tab`].tabIndex, name === selected ? 0 : -1);
    }
  }
});
test('setas, Home e End navegam as três abas e movem foco', () => {
  const els = fixture();
  for (const [from, key, to] of [['forecast', 'ArrowRight', 'tips'], ['tips', 'ArrowRight', 'ranking'], ['ranking', 'ArrowRight', 'forecast'], ['forecast', 'ArrowLeft', 'ranking'], ['tips', 'Home', 'forecast'], ['tips', 'End', 'ranking']]) {
    let prevented = false;
    els[`${from}Tab`].listeners.keydown({ key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(els[`${to}Panel`].hidden, false);
    assert.equal(els[`${to}Tab`].focused, true);
  }
});
test('HTML local e Pages têm imagem correta e não exibem chance de captura', () => {
  for (const path of ['../dist/index.html', '../index.html']) {
    const html = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /catchProbability|CHANCE DE CAPTURA/);
    assert.ok(html.indexOf('id="forecastTab"') < html.indexOf('id="tipsTab"'));
    assert.ok(html.indexOf('id="tipsTab"') < html.indexOf('id="rankingTab"'));
    assert.match(html, path.includes('dist') ? /src="\.\/assets\/valoes-praia.jpg"/ : /src="\.\/dist\/assets\/valoes-praia.jpg"/);
    assert.match(html, /Não entre nos canais/);
  }
});
