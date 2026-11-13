// The loading bar (owner 2026-11-13): a retro bar of cells centred on the model views while the model, the floors, the
// people and the term load. One bar for the page and for a run; the label says what is loading.
const N = 24;
let el = null, cells = [], hideTimer = null;

function ensure() {
  if (el) return el;
  el = document.getElementById('loader');
  if (!el) return null;
  const box = el.querySelector('#loader-cells');
  box.innerHTML = ''; cells = [];
  for (let i = 0; i < N; i++) { const c = document.createElement('i'); box.appendChild(c); cells.push(c); }
  return el;
}

export const loader = {
  show(title = 'LOADING', label = '', frac = 0) {
    if (!ensure()) return;
    clearTimeout(hideTimer);
    el.querySelector('#loader-title').textContent = title;
    el.hidden = false;
    this.set(frac, label);
  },
  set(frac, label) {
    if (!ensure()) return;
    const f = Math.max(0, Math.min(1, frac || 0)), k = Math.round(f * N);
    cells.forEach((c, i) => { c.className = i < k ? 'on' : i === k ? 'head' : ''; });
    el.querySelector('#loader-pct').textContent = `${Math.round(f * 100)}%`;
    if (label != null) el.querySelector('#loader-label').textContent = label;
  },
  hide(delay = 250) {
    if (!ensure()) return;
    clearTimeout(hideTimer);
    if (delay <= 0) { el.hidden = true; return; }
    this.set(1);
    hideTimer = setTimeout(() => { el.hidden = true; }, delay);
  },
};
