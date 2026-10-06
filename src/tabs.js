export const TAB_NAMES = ['forecast', 'tips', 'ranking'];
export function initTabs(doc) {
  const get = id => doc.getElementById(id);
  function select(name) {
    for (const tab of TAB_NAMES) {
      const active = tab === name;
      get(`${tab}Tab`).setAttribute('aria-selected', String(active));
      get(`${tab}Tab`).tabIndex = active ? 0 : -1;
      get(`${tab}Panel`).hidden = !active;
    }
  }
  TAB_NAMES.forEach((name, index) => {
    get(`${name}Tab`).addEventListener('click', () => select(name));
    get(`${name}Tab`).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? TAB_NAMES.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TAB_NAMES.length) % TAB_NAMES.length;
      const next = TAB_NAMES[nextIndex];
      select(next); get(`${next}Tab`).focus();
    });
  });
}
// Navigation remains available even if the community's Firebase module fails.
if (typeof document !== 'undefined') initTabs(document);
