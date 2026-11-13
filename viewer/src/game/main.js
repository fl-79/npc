import { PixelFloorView } from './embed.js';

// The stand-alone game view page: one floor at a time, the same pixel view the model-check
// page embeds. Keys 1 to 5 switch floors, drag or arrows pan, wheel or + and - zoom by steps.
const $ = (s) => document.querySelector(s);
const LEVELS = [['level-3', 'Level 3'], ['level-4', 'Level 4'], ['level-2', 'Level 2'], ['level-1', 'Level 1'], ['basement', 'Basement']];
let current = 'level-3';
let people = 6;
let labels = true;

const view = new PixelFloorView($('#stage'));
view.onZoom = (z) => { $('#zoom-v').textContent = z; };
view.onReady = (sc, L) => {
  const s = L.struct.flat();
  $('#status').innerHTML = `<b>${L.level}</b> &middot; ${L.cols} &times; ${L.rows} tiles of ${L.tile_m} m &middot; `
    + `${s.filter((v) => v === 1).length} wall, ${s.filter((v) => v === 2).length} glass, ${s.filter((v) => v === 3).length} column, ${s.filter((v) => v === 4).length} door tiles &middot; `
    + `${L.rooms.length} rooms, ${L.doors.length} doors, ${L.furniture.length} pieces of furniture from the model`
    + `<br><span class="hint">People and their remarks are placeholders, not a simulation.</span>`;
};

function start(file) {
  current = file;
  for (const b of document.querySelectorAll('[data-level]')) b.classList.toggle('on', b.dataset.level === file);
  view.show(file, { people, labels, contextOn: true });
}

// ---------------- chrome
const lv = $('#levels');
for (const [file, name] of LEVELS) {
  const b = document.createElement('button');
  b.textContent = name.toUpperCase();
  b.dataset.level = file;
  b.addEventListener('click', () => start(file));
  lv.appendChild(b);
}
$('#zoom-in').addEventListener('click', () => view.zoomStep(1));
$('#zoom-out').addEventListener('click', () => view.zoomStep(-1));
$('#people').addEventListener('input', (e) => { people = Number(e.target.value); $('#people-v').textContent = people; start(current); });
$('#labels').addEventListener('change', (e) => { labels = e.target.checked; view.setLabels(labels); });
for (const b of document.querySelectorAll('[data-fold]')) b.addEventListener('click', () => b.closest('.win').classList.toggle('folded'));
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '+' || e.key === '=') view.zoomStep(1);
  if (e.key === '-') view.zoomStep(-1);
  if (e.key === 'f') view.fit();
  const n = Number(e.key);
  if (n >= 1 && n <= 5) start(['basement', 'level-1', 'level-2', 'level-3', 'level-4'][n - 1]);
});

// the surroundings, when scripts/fetch_context.py has run, and the owner's room labels, when any
const get = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
Promise.all([get('exports/context.json'), get('program/rooms.json')]).then(([ctx, program]) => {
  if (ctx) view.setContext(ctx);
  if (program) view.setProgram(program);
  document.fonts.ready.then(() => start(current));
});
Object.defineProperty(window, 'npcGame', { get: () => view.game }); // for inspection from the console
