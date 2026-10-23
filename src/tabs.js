export const TAB_NAMES = ['forecast', 'tips', 'ranking'];
// Abas opcionais só entram na navegação se existirem no HTML (a versão A não tem "Espécies").
const TAB_ORDER = ['forecast', 'tips', 'species', 'ranking'];
export function initTabs(doc) {
  const get = id => doc.getElementById(id);
  const names = TAB_ORDER.filter(name => TAB_NAMES.includes(name) || (get(`${name}Tab`) && get(`${name}Panel`)));
  function select(name) {
    for (const tab of names) {
      const active = tab === name;
      get(`${tab}Tab`).setAttribute('aria-selected', String(active));
      get(`${tab}Tab`).tabIndex = active ? 0 : -1;
      get(`${tab}Panel`).hidden = !active;
    }
  }
  names.forEach((name, index) => {
    get(`${name}Tab`).addEventListener('click', () => select(name));
    get(`${name}Tab`).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length;
      const next = names[nextIndex];
      select(next); get(`${next}Tab`).focus();
    });
  });
}
// Navigation remains available even if the community's Firebase module fails.
if (typeof document !== 'undefined') initTabs(document);
