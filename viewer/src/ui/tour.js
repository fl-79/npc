// The guided tour (owner 2026-11-13): one part of the screen at a time, lit through a dimmed page, with a note in the
// tool's window style. NEXT, BACK and SKIP; Esc skips, the arrow keys and Enter step. It opens by itself on a first visit
// and remembers being finished or skipped (this browser only); the TOUR button in the command window replays it.
// The tour opens steps the way a user does, by clicking the step names, so it never reaches a step that is not open yet.

const KEY = 'npc-tour-v1';
const $ = (s) => document.querySelector(s);
const clickStep = (name) => { const li = $(`#menu li[data-step="${name}"]`); if (li) li.click(); };

const STOPS = [
  { title: 'WELCOME', text: 'NPC V2 puts 176 simulated students and instructors into the Lasserre Building for a day of the Fall 2026 term, to see how the building is used and what could change. This tour takes about a minute. SKIP leaves it; TOUR, top left, brings it back.' },
  { target: '#cmd', title: 'THE STEPS', text: 'Three steps in order: WHEN, RUN, ANALYSE. Each opens once the one before is done, and a finished step can be clicked to go back to it. AGENT shows one person in detail.' },
  { target: '#stage', title: 'THE VIEWS', big: true, text: 'The building on the left, Level 3 in plan on the right. Drag the edge between them to resize. Click a view’s name in its corner for other floors and views; double-click it to give that view the whole space.' },
  { target: '[data-step="view"]', title: 'VIEW', text: 'The same choices as tabs: a floor, isometric or plan, one pane or two.' },
  { before: () => clickStep('day'), target: '#cases', title: '1 · WHEN', text: 'Start from a suggested test case, such as the last crit before the midterm or a Good Times Friday…' },
  { before: () => clickStep('day'), target: '#cal', title: '1 · WHEN', text: '…or pick any day of the term. Greyed days are closed or outside the term. A SITUATION adds conditions to a day, such as a snow day; A PERIOD runs a stretch of the term.' },
  { before: () => clickStep('run'), target: () => $('.choice[data-for="run-movement"]')?.closest('.rule'), title: '2 · RUN', text: 'How much the people may change the space: EVERYDAY USE, or agents rearrange WITHIN LIMITS or WITHOUT LIMITS. Every move is marked on the plan in cyan and listed in this step.' },
  { before: () => clickStep('run'), target: () => [$('#run-bar'), $('.row.goto'), $('#run-play')], title: '2 · RUN', text: 'PLAY starts the day. The bar works like a video player’s: drag ahead and the day plays under the pointer; drag back and it rebuilds to that time. Or type a time into GO TO. Changing a setting resets the run.' },
  { target: '#feed', title: 'THE FEED', text: 'What the people say and why, as it happens, with the engine’s events and design suggestions. Fold it, or drag its bottom edge to resize it.' },
  { target: '#menu li[data-step="analyse"]', title: '3 · ANALYSE', text: 'When the day ends, ANALYSE opens by itself: suggestions for collaboration and for the rest, each traced to what caused it; metrics against their goals, with ? for the details; overlays on the plan; a comparison with a saved run.' },
  { target: '#msg', title: 'MESSAGES', text: 'The tool tells you what it is doing here, one thing at a time.' },
  { after: () => clickStep('day'), title: 'READY', text: 'Try LAST CRIT in WHEN, then PLAY in RUN. Bubbles over the people show what the run records: talk, a question at a crit, an excited !! when two years meet.' },
];

let ui = null, at = 0;

function build() {
  const block = document.createElement('div'); block.className = 'tour-block';
  const spot = document.createElement('div'); spot.className = 'tour-spot';
  const note = document.createElement('div'); note.className = 'win tour-note'; note.setAttribute('role', 'dialog'); note.setAttribute('aria-live', 'polite');
  note.innerHTML = '<div class="bar"><span class="tour-count"></span><button class="tour-x" title="skip the tour (Esc)">&#10005;</button></div>'
    + '<div class="body"><h4 class="tour-title"></h4><p class="tour-text"></p>'
    + '<div class="tour-btns"><button class="tour-skip">SKIP TOUR</button><span></span><button class="tour-back">BACK</button><button class="tour-next go">NEXT</button></div></div>';
  document.body.append(block, spot, note);
  note.querySelector('.tour-x').addEventListener('click', () => end(true));
  note.querySelector('.tour-skip').addEventListener('click', () => end(true));
  note.querySelector('.tour-back').addEventListener('click', () => show(at - 1));
  note.querySelector('.tour-next').addEventListener('click', () => (at >= STOPS.length - 1 ? end(false) : show(at + 1)));
  const onKey = (e) => {
    if (!ui) return;
    if (e.key === 'Escape') { end(true); } else if (e.key === 'ArrowRight' || e.key === 'Enter') { at >= STOPS.length - 1 ? end(false) : show(at + 1); } else if (e.key === 'ArrowLeft') { show(at - 1); } else return;
    e.preventDefault(); e.stopPropagation();
  };
  window.addEventListener('keydown', onKey, true);
  const onResize = () => { if (ui) place(); };
  window.addEventListener('resize', onResize);
  return { block, spot, note, onKey, onResize };
}

/** The element or elements a stop lights, as one rectangle; null when there is none on screen. */
function rectOf(stop) {
  let t = typeof stop.target === 'function' ? stop.target() : stop.target ? $(stop.target) : null;
  const els = (Array.isArray(t) ? t : [t]).filter((el) => el && el.getClientRects().length);
  if (!els.length) return null;
  let r = null;
  for (const el of els) { const q = el.getBoundingClientRect(); if (!q.width && !q.height) continue; r = r ? { left: Math.min(r.left, q.left), top: Math.min(r.top, q.top), right: Math.max(r.right, q.right), bottom: Math.max(r.bottom, q.bottom) } : { left: q.left, top: q.top, right: q.right, bottom: q.bottom }; }
  return r;
}

function place() {
  const stop = STOPS[at], { spot, note, block } = ui, r = rectOf(stop);
  const vw = window.innerWidth, vh = window.innerHeight, pad = 8, gap = 16;
  note.style.left = '0px'; note.style.top = '0px';
  const nw = note.offsetWidth, nh = note.offsetHeight;
  if (!r) { spot.hidden = true; block.classList.add('dim'); note.style.left = `${Math.round((vw - nw) / 2)}px`; note.style.top = `${Math.round((vh - nh) / 2)}px`; return; }
  block.classList.remove('dim'); spot.hidden = false;
  const L = Math.max(2, r.left - 6), T = Math.max(2, r.top - 6), R = Math.min(vw - 2, r.right + 6), B = Math.min(vh - 2, r.bottom + 6);
  Object.assign(spot.style, { left: `${L}px`, top: `${T}px`, width: `${R - L}px`, height: `${B - T}px` });
  const clampY = (y) => Math.max(pad, Math.min(vh - nh - pad, y)), clampX = (x) => Math.max(pad, Math.min(vw - nw - pad, x));
  let x, y;
  if (stop.big) { x = L + 28; y = T + 56; }   // a large target: the note sits inside its corner
  else if (R + gap + nw <= vw - pad) { x = R + gap; y = clampY(T); }
  else if (L - gap - nw >= pad) { x = L - gap - nw; y = clampY(T); }
  else if (B + gap + nh <= vh - pad) { x = clampX(L); y = B + gap; }
  else { x = clampX(L); y = Math.max(pad, T - gap - nh); }
  note.style.left = `${Math.round(clampX(x))}px`; note.style.top = `${Math.round(clampY(y))}px`;
}

async function show(i) {
  if (!ui) return;
  at = Math.max(0, Math.min(STOPS.length - 1, i));
  const stop = STOPS[at], { note } = ui;
  if (stop.before) { stop.before(); await new Promise((r) => setTimeout(r, 120)); }
  const t = typeof stop.target === 'function' ? stop.target() : stop.target ? $(stop.target) : null;
  const first = Array.isArray(t) ? t.find(Boolean) : t;
  if (first && first.scrollIntoView && first.closest && first.closest('#side')) first.scrollIntoView({ block: 'nearest' });
  note.querySelector('.tour-count').textContent = `TOUR · ${at + 1} OF ${STOPS.length}`;
  note.querySelector('.tour-title').textContent = stop.title;
  note.querySelector('.tour-text').textContent = stop.text;
  note.querySelector('.tour-back').disabled = at === 0;
  note.querySelector('.tour-next').textContent = at === STOPS.length - 1 ? 'FINISH' : 'NEXT';
  note.querySelector('.tour-skip').style.visibility = at === STOPS.length - 1 ? 'hidden' : 'visible';
  requestAnimationFrame(place);
  note.querySelector('.tour-next').focus({ preventScroll: true });
}

function end(skipped) {
  if (!ui) return;
  const last = STOPS[at];
  try { localStorage.setItem(KEY, skipped ? 'skipped' : 'done'); } catch (e) { /* storage off: the tour may show again next visit */ }
  window.removeEventListener('keydown', ui.onKey, true); window.removeEventListener('resize', ui.onResize);
  ui.block.remove(); ui.spot.remove(); ui.note.remove(); ui = null;
  if (!skipped && last.after) last.after();
  const m = $('#msg-text'); if (m) m.textContent = skipped ? 'Tour skipped. TOUR, top left, brings it back.' : 'Tour over. Pick a day in WHEN to begin.';
}

export function startTour() { if (ui) return; ui = build(); show(0); }

/** On a first visit only (this browser): the tour opens by itself. */
export function maybeStartTour() {
  let seen = null;
  try { seen = localStorage.getItem(KEY); } catch (e) { seen = null; }
  if (!seen && !/[?&]notour\b/.test(location.search)) startTour();
}
