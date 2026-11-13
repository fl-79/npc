import { getKey, setKey, interpretSituation, describeSpec, loadExample } from './interpret.js';
// The interface, laid out like a console RPG menu (Dragon Quest / Final Fantasy / Pokémon conventions):
//   - a COMMAND window listing the steps in order (1 VIEW, 2 DAY, 3 RUN, 4 ANALYSE, 5 WALK) and the
//     extra commands (AGENT, LOG, MODEL), with a cursor on the current line and each earlier step's
//     choice shown as a short summary on its line;
//   - one STEP window open at a time beside it; NEXT at its foot goes on to the next step, Esc or the
//     close mark goes back to the command window;
//   - a MESSAGE box along the bottom that says one thing at a time, with the "more" mark when it has
//     a second line (it mirrors the model-check status while loading);
//   - Up/Down move the cursor, Enter opens, Esc closes; the mouse does the same.
// Nothing here runs a simulation: steps 2 to 5 are empty, their controls disabled, their ids the
// contract for the engine (viewer/src/sim). What works is interface state: the view step's real
// controls (main.js), the term calendar from program/calendar.json and the day pick.

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// the core metric set of research/summary-metrics.md §5; values come later from the analysis
const CORE_METRICS = [
  ['C1', 'Path overlap', 'm per pair'],
  ['C3', 'New ties formed', 'per person-week'],
  ['C4', 'Face-to-face minutes', 'per person-day'],
  ['C6', 'Interactions between years / sections', 'share'],
  ['C7', 'Where interactions happen', 'route / desk / room'],
  ['C13', 'Help-request latency', 'min'],
  ['F1', 'Focus-block length', 'min'],
  ['F2', 'Interruptions', 'per focus-hour'],
  ['F4', 'Desk exposure', 'passes per hour at the desk'],
  ['F7 / F8', 'Wait for focus space / resources', 'min'],
  ['F11 / F12', 'KEYS self-report / motivation', 'index'],
  ['S1 / S3', 'Integration and core', 'layout'],
];

const STEP_HELP = {
  view: 'Pick the floor and the view. Greyed buttons do not apply.',
  day: 'A day from the calendar, a situation attached to one, or a period inside the semester.',
  run: 'Set the movement and the seeds, then PLAY. The feed on the right fills as it plays.',
  analyse: 'The run over time, on the plan and in numbers. Each suggestion traces back to the feed.',
  walk: 'Walk the day yourself.',
  agent: 'One agent\u2019s traits and state.',
};

const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dayName = (d) => DAYS[d.getUTCDay()];
const between = (s, a, b) => s >= a && s <= b;

// ------------------------------------------------------------------ the message box
let msgTimer = null;
export function say(text, more = '') {
  const t = $('#msg-text'), m = $('#msg .more');
  if (!t) return;
  t.textContent = text;
  m.style.visibility = more ? 'visible' : 'hidden';
  m.title = more;
  clearTimeout(msgTimer);
}

// ------------------------------------------------------------------ the calendar (step 2)
function dayInfo(cal, date) {
  const s = iso(date), dn = dayName(date), tags = [], notes = [];
  const t = cal.term;
  const inTerm = between(s, t.classes_start, t.classes_end);
  const inExams = between(s, t.exams_start, t.exams_end);
  for (const c of t.closures) {
    if ((c.date && c.date === s) || (c.from && between(s, c.from, c.to))) { tags.push('closed'); notes.push(c.name); }
  }
  const closed = tags.includes('closed');
  if (inTerm && !closed) {
    for (const ses of cal.studio.sessions) if (ses.days.includes(dn)) { tags.push('studio'); notes.push(`studio ${ses.start}–${ses.end}, year${ses.years.length > 1 ? 's' : ''} ${ses.years.join(' and ')}`); }
  }
  for (const r of cal.reviews) {
    if (r.date === s) { tags.push('review'); notes.push(r.name + (r.inferred ? ' (date assumed)' : '')); }
    if (r.last_desk_crit === s) { tags.push('lastcrit'); notes.push('last desk crit before the ' + r.name.toLowerCase()); }
  }
  for (const d of cal.other_courses.deadlines) if (d.date === s) { tags.push('deadline'); notes.push(d.name + (d.inferred ? ' (date assumed)' : '')); }
  const events = [];
  for (const e of cal.events) {
    if (e.repeat === 'weekly' && e.day === dn && inTerm && !closed) { tags.push('event'); events.push(`${e.name} ${e.start}–${e.end}`); }
    if (e.date === s) { tags.push('event'); events.push(`${e.name} ${e.start}–${e.end}` + (e.inferred ? ' (date assumed)' : '')); }
  }
  notes.push(...events);
  if (inExams) { tags.push('exams'); notes.push('exam period'); }
  if (dn === 'Sat' || dn === 'Sun') tags.push('weekend');
  const phase = cal.phases.find((p) => between(s, p.from, p.to));
  if (phase) notes.push(`phase: ${phase.name.toLowerCase()}`);
  if (!inTerm && !inExams && !tags.length) notes.push('outside the term');
  return { tags, notes, events, inTerm, inExams };
}

/** ON THIS DAY (owner 2026-11-12): the next review and the stress it brings, then what else the calendar holds. The shares are
 *  the engine's own calibration (parameters.wellbeing.stress, 2026-11-11): about one in five students over the high line in a
 *  normal week, two in five the week before a review, one in three in the review week. */
function onThisDay(cal, d, info) {
  const s = iso(d), parts = [];
  const today = cal.reviews.filter((r) => r.date === s);
  const ahead = cal.reviews.map((r) => ({ r, days: Math.round((parse(r.date) - d) / 86400000) })).filter((x) => x.days > 0).sort((a, b) => a.days - b.days);
  if (today.length) parts.push(`${today.map((r) => r.name).join(' and ')} today · stress high: the review itself, about one in three over the line this week`);
  else if (ahead.length) {
    const { r, days } = ahead[0]; const when = parse(r.date);
    const stress = days <= 7 ? 'stress high: about two in five students over the line this week' : days <= 14 ? 'stress rising: between one in five and two in five over the line' : 'stress normal: about one in five over the line';
    parts.push(`${r.name} in ${days} day${days > 1 ? 's' : ''} (${dayName(when)} ${when.getUTCDate()} ${MONTHS[when.getUTCMonth()].slice(0, 3)}) · ${stress}`);
  } else parts.push('no review ahead · stress normal: about one in five over the line');
  if (info.tags.includes('closed')) parts.push('the building is closed');
  else if (info.tags.includes('weekend')) parts.push(ahead.length && ahead[0].days <= 7 ? 'a weekend day before a review: a working day for most' : 'a weekend day: a few come in');
  else if (info.tags.includes('studio')) parts.push('a studio day: sessions 13:30 to 18:00');
  if (info.events.length) parts.push(info.events.join(' · '));
  return parts.join('\n');
}

function renderCalendar(cal, el, onPick) {
  const first = parse(cal.term.classes_start), last = parse(cal.term.exams_end);
  const lastReview = cal.reviews.map((r) => r.date).sort().slice(-1)[0] || cal.term.classes_end;
  const months = [];
  for (let m = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)); m <= last; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) months.push(m);
  el.innerHTML = '';
  for (const m of months) {
    const box = document.createElement('div'); box.className = 'month';
    box.innerHTML = `<div class="mname">${MONTHS[m.getUTCMonth()]} ${m.getUTCFullYear()}</div>`;
    const grid = document.createElement('div'); grid.className = 'cal';
    for (const d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) { const h = document.createElement('span'); h.className = 'wd'; h.textContent = d; grid.appendChild(h); }
    const pad = (m.getUTCDay() + 6) % 7;
    for (let i = 0; i < pad; i++) grid.appendChild(document.createElement('span'));
    const daysIn = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), d));
      const info = dayInfo(cal, date);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'day ' + info.tags.join(' ');
      // the engine runs every day up to the last review, which may fall after the last day of classes
      const runs = (info.inTerm || iso(date) <= lastReview) && !info.inExams && !info.tags.includes('closed');
      if (!info.inTerm && !info.inExams && iso(date) > lastReview) b.classList.add('off');
      b.dataset.date = iso(date); b.textContent = String(d); b.title = info.notes.join('; ') || '';
      // no run outside the term, on a closure or in the exam period (owner 2026-11-12): those days do not take a click
      const unavailable = !runs;
      if (unavailable) { b.disabled = true; b.classList.add('na'); b.title = (b.title ? b.title + ' · ' : '') + 'not a day the tool runs'; }
      else b.addEventListener('click', () => onPick(iso(date)));
      grid.appendChild(b);
    }
    box.appendChild(grid); el.appendChild(box);
  }
}

// ------------------------------------------------------------------ the command window and the steps
function initMenu() {
  const items = $$('#menu li[data-step]');
  const steps = $$('#steps .step');
  const MAIN = ['day', 'run', 'analyse'];   // WALK is off the sequence for now (owner 2026-11-12); its window and code stay   // VIEW is a constant, not a step (owner 2026-11-12): its tabs stay in sight, its full panel unfolds from the arrow
  const state = { open: null, last: 'day', runDone: false };
  // a step is available once the one before it is done (owner 2026-11-12): RUN once a day is picked (always), ANALYSE and WALK once a
  // run has finished; the collapsed bars are for going back, not forward
  const available = (name) => name !== 'walk' && (name === 'day' || name === 'view' || name === 'agent' || name === 'run' || state.runDone);
  const applyAvailability = () => { for (const s of steps) if (s.classList.contains('main') && !available(s.dataset.step)) { s.hidden = true; } for (const x of items) x.classList.toggle('na', !available(x.dataset.step)); };
  const cursorTo = (li) => { for (const x of items) x.classList.toggle('cur', x === li); };
  // VIEW collapses to its bar while another step is open; its arrow reopens it without leaving the step
  const viewWin = steps.find((x) => x.dataset.step === 'view');
  const foldView = (on) => { if (viewWin) viewWin.classList.toggle('folded', on); };
  // 1 VIEW is pinned: it stays open through the steps so the view can change at any point; the other
  // step windows open one at a time under it. Any command line can be chosen in any order: BACK and
  // NEXT only walk the main steps.
  function open(name) {
    if (!available(name)) { say(name === 'analyse' || name === 'walk' ? 'Run the day first; ANALYSE opens by itself when it ends.' : 'Not yet.'); return; }
    state.open = name;
    if (MAIN.includes(name)) state.last = name;
    // the main steps stay in sight as compressed bars, the open one unfolded, so the way back is a click (owner 2026-11-12)
    for (const s of steps) { if (s.classList.contains('pinned')) continue; if (s.classList.contains('main')) { s.hidden = !available(s.dataset.step); s.classList.toggle('folded', s.dataset.step !== name); } else s.hidden = s.dataset.step !== name; }
    applyAvailability();
    foldView(true);
    const feed = $('#feed'); if (feed) feed.classList.toggle('folded', !['run', 'analyse', 'walk', 'agent'].includes(name));
    for (const x of items) x.classList.toggle('open', x.dataset.step === name);
    cursorTo(items.find((x) => x.dataset.step === name));
    $('#cmd-where').textContent = name ? name.toUpperCase() : '';
    const s = steps.find((x) => x.dataset.step === name);
    // the page opens with the command window and step 1 both in view (owner 2026-11-13); later a step scrolls into view only when it is out of it
    if (s && state.opened) { const rc = s.getBoundingClientRect(); if (rc.top < 0 || rc.top > window.innerHeight - 80) s.scrollIntoView({ block: 'nearest' }); } else window.scrollTo(0, 0);
    state.opened = true;
    say(STEP_HELP[name] || '');
    window.dispatchEvent(new CustomEvent('npc:step', { detail: name }));
  }
  function close() {
    state.open = null;
    for (const s of steps) { if (s.classList.contains('pinned')) continue; if (s.classList.contains('main')) s.classList.add('folded'); else s.hidden = true; }
    for (const x of items) x.classList.remove('open');
    $('#cmd-where').textContent = '';
    say('Up, Down and Enter choose a step. Esc comes back.');
  }
  for (const li of items) {
    li.addEventListener('mouseenter', () => cursorTo(li));
    li.addEventListener('click', () => open(li.dataset.step));
  }
  for (const b of $$('[data-close]')) b.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  window.addEventListener('npc:run-done', () => { state.runDone = true; applyAvailability(); open('analyse'); });
  for (const s of steps) if (s.classList.contains('main')) s.querySelector('.bar').addEventListener('click', () => { if (s.classList.contains('folded')) open(s.dataset.step); });
  for (const b of $$('[data-back]')) b.addEventListener('click', () => open(state.last));
  for (const b of $$('[data-next]')) b.addEventListener('click', () => open(b.dataset.next));
  window.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (inField && e.key !== 'Escape') return;
    const i = items.findIndex((x) => x.classList.contains('cur'));
    const listHasKeys = !state.open;
    if (e.key === 'ArrowUp' && e.target === document.body && listHasKeys) { cursorTo(items[(i - 1 + items.length) % items.length]); e.preventDefault(); }
    else if (e.key === 'ArrowDown' && e.target === document.body && listHasKeys) { cursorTo(items[(i + 1) % items.length]); e.preventDefault(); }
    else if (e.key === 'Enter' && !state.open && i >= 0) { open(items[i].dataset.step); e.preventDefault(); }
    else if (e.key === 'Escape') { if (state.open) close(); else foldView(true); if (inField) document.activeElement.blur(); }
  });
  // the step's choice on its command line
  const sum = (id, text) => { const el = $('#' + id); if (el) el.textContent = text; const bar = $('#bar-' + id); if (bar) bar.textContent = text; };
  const viewName = $('#view-name');
  const viewSum = () => { if (!viewName.textContent) return; const t = viewName.textContent.replace(/, zoom.*$/, ''); sum('sum-view', t); sum('view-bar-sum', t); const vi = items.find((x) => x.dataset.step === 'view'); if (vi) vi.classList.add('done'); };
  if (viewName) viewSum();
  if (viewName) new MutationObserver(viewSum).observe(viewName, { childList: true, characterData: true, subtree: true });
  // the model-check status, mirrored to the message box while it loads (first line only)
  const statusEl = $('#status');
  if (statusEl) new MutationObserver(() => { if (!state.open) { const line = statusEl.innerText.split('\n').find((l) => l.trim()) || ''; if (line) say(line.slice(0, 140), statusEl.innerText.length > 140 ? statusEl.innerText : ''); } }).observe(statusEl, { childList: true, subtree: true, characterData: true });
  applyAvailability();
  return { open, close, state, sum };
}

export async function initPanels() {
  const menu = initMenu();
  // the model-check tools are for the builder: ?model shows them
  if (/[?&]model/.test(location.search)) { const m = $('#model-tools'); if (m) m.hidden = false; }
  // button choices: a few options as buttons, one lit; the hidden input keeps the id and fires change
  for (const g of $$('.choice')) {
    const input = $('#' + g.dataset.for);
    for (const b of g.querySelectorAll('button[data-v]')) b.addEventListener('click', () => {
      if (b.disabled) return;
      for (const x of g.querySelectorAll('button[data-v]')) x.classList.toggle('on', x === b);
      input.value = b.dataset.v; input.dispatchEvent(new Event('change'));
    });
  }
  const choiceText = (id) => { const b = $(`.choice[data-for="${id}"] button.on`); return b ? b.textContent : ''; };
  menu.open('day');

  // -------------------------------------------------------------- DAY: the term calendar and the pick
  let cal = null;
  try { const r = await fetch('/program/calendar.json', { cache: 'no-store' }); if (r.ok) cal = await r.json(); } catch (e) { /* none */ }
  const calEl = $('#cal'), pickEl = $('#day-pick'), pickNote = $('#day-note'), evEl = $('#sc-events');
  const state = { date: null, menu, mode: 'day', short: '', sit: 'none' };
  window.npcUI = state;
  const summarise = () => { const k = $('#sit-kind'); const o = k.options[k.selectedIndex]; const name = k.value === 'none' ? '' : (k.value === 'other' ? 'other' : o.textContent.replace(/:.*$/, '')); menu.sum('sum-day', state.mode === 'period' ? (state.spanFrom && state.spanTo ? `${fmt(state.spanFrom)} to ${fmt(state.spanTo)}` : 'a period: pick the span') : state.mode === 'sit' && name ? `${name} · ${state.short}` : state.short); };
  function pick(s) {
    state.date = s;
    for (const b of calEl.querySelectorAll('.day.sel')) b.classList.remove('sel');
    const b = calEl.querySelector(`.day[data-date="${s}"]`); if (b) b.classList.add('sel');
    const d = parse(s), info = dayInfo(cal, d);
    const label = `${dayName(d)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    pickEl.textContent = label;
    pickNote.textContent = info.notes.join(' · ') || 'an ordinary day';
    evEl.textContent = onThisDay(cal, d, info);
    for (const b of $$('#cases button')) b.classList.toggle('on', b.dataset.date === s);
    $('#run-clock-date').textContent = `${dayName(d)} ${s}`;
    $('#sit-day').textContent = label;
    state.short = `${dayName(d)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
    summarise();
    $('#menu li[data-step="day"]').classList.add('done');
    if (state.mode === 'day') say(`${label}: ${info.notes.slice(0, 2).join(', ') || 'an ordinary day'}.`);
    window.dispatchEvent(new CustomEvent('npc:day', { detail: { date: s, info } }));
  }
  if (cal) {
    renderCalendar(cal, calEl, (d) => (state.mode === 'period' ? pickSpan(d) : pick(d)));
    $('#term-name').textContent = cal.term.name;
    // the suggested test cases (owner 2026-11-12): a title and a line each, above the calendar, and marked on it
    const CASES = [
      ['NORMAL WEEK', '2026-11-03', 'a plain studio Tuesday, no review in sight'],
      ['LAST CRIT', cal.reviews[0].last_desk_crit, 'the last desk crit before the midterm'],
      ['MIDTERM EVE', '2026-10-15', 'the afternoon before the midterm: the plotters fill'],
      ['MIDTERM', cal.reviews[0].date, 'the review day: every section presents'],
      ['GOOD TIMES', '2026-10-23', 'a Friday with the evening in the lounge'],
      ['FINAL EVE', '2026-12-05', 'the Saturday before the final: a working weekend'],
      ['FINAL', cal.reviews[1].date, 'the final review, years 2 and 3'],
    ];
    const casesEl = $('#cases');
    for (const [title, date, line] of CASES) {
      const d = parse(date); const row = document.createElement('div'); row.className = 'case-row';
      const b = document.createElement('button'); b.className = 'small'; b.textContent = title; b.dataset.date = date; b.addEventListener('click', () => pick(date));
      const t = document.createElement('span'); t.className = 'hint'; t.textContent = `${dayName(d)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} · ${line}`;
      row.appendChild(b); row.appendChild(t); casesEl.appendChild(row);
      const cb = calEl.querySelector(`.day[data-date="${date}"]`); if (cb) { cb.classList.add('case'); cb.title = `${title}: ${line}`; }
    }
    state.cases = CASES;
    pick('2026-10-13');
  } else {
    calEl.innerHTML = '<div class="hint">program/calendar.json not found.</div>';
  }
  // -------------------------------------------------------------- A DAY or A SITUATION
  const sitKind = $('#sit-kind'), sitOther = $('#sit-other');
  // A PERIOD (owner 2026-11-12): a span inside the semester, picked on the calendar (first day, then last) or by a preset; the run's
  // hidden horizon inputs follow it ('span', from, to) and the day becomes the span's last day, which the floor plays once the span is built
  const lastReviewDate = cal ? cal.reviews.map((r) => r.date).sort().slice(-1)[0] : null;
  const fmt = (iso) => { const d = parse(iso); return `${dayName(d)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
  function paintSpan() {
    for (const b of calEl.querySelectorAll('.day')) { const d = b.dataset.date; b.classList.toggle('in-span', state.mode === 'period' && !!state.spanFrom && !!state.spanTo && d >= state.spanFrom && d <= state.spanTo); b.classList.toggle('span-end', state.mode === 'period' && (d === state.spanFrom || d === state.spanTo)); }
    $('#span-from').textContent = state.spanFrom ? fmt(state.spanFrom) : 'click the first day'; $('#span-to').textContent = state.spanTo ? fmt(state.spanTo) : 'then the last';
  }
  function applyPeriod() {
    const on = state.mode === 'period' && state.spanFrom && state.spanTo;
    $('#run-horizon').value = on ? 'span' : 'day'; $('#run-span-from').value = on ? state.spanFrom : ''; $('#run-span-to').value = on ? state.spanTo : ''; $('#run-horizon').dispatchEvent(new Event('change'));
    if (on && state.date !== state.spanTo) pick(state.spanTo);
    paintSpan();
  }
  function pickSpan(d) {
    if (!state.spanFrom || state.spanTo) { state.spanFrom = d; state.spanTo = null; }
    else if (d < state.spanFrom) { state.spanTo = state.spanFrom; state.spanFrom = d; }
    else state.spanTo = d;
    applyPeriod(); summarise();
    say(state.spanTo ? `${fmt(state.spanFrom)} to ${fmt(state.spanTo)}: the floor plays the last day once the span is built.` : 'Now the last day.');
  }
  const setSpan = (a, b) => { state.spanFrom = a; state.spanTo = b; applyPeriod(); summarise(); say(`${fmt(a)} to ${fmt(b)}.`); };
  if (cal) {
    $('#span-term').addEventListener('click', () => setSpan(cal.term.classes_start, lastReviewDate));
    $('#span-mid').addEventListener('click', () => setSpan(cal.term.classes_start, cal.reviews[0].date));
    $('#span-final').addEventListener('click', () => setSpan(cal.reviews[0].date, lastReviewDate));
  }
  function setMode(m) {
    const was = state.mode;
    if (m === 'period' && was !== 'period') { state.dayBeforePeriod = state.date; if (!state.spanFrom && cal) { state.spanFrom = cal.term.classes_start; state.spanTo = lastReviewDate; } }   // the day comes back when the period is left; the whole term is the first span
    state.mode = m;
    if (m !== 'period' && was === 'period' && state.dayBeforePeriod) pick(state.dayBeforePeriod);
    $('#pane-day').hidden = m === 'sit';
    $('#pane-sit').hidden = m !== 'sit';
    $('#pane-period').hidden = m !== 'period';
    $('#cases').hidden = m === 'period'; $('#cases').previousElementSibling.hidden = m === 'period';
    $('#mode-day').classList.toggle('on', m === 'day');
    $('#mode-sit').classList.toggle('on', m === 'sit');
    $('#mode-period').classList.toggle('on', m === 'period');
    applyPeriod();
    summarise();
    say(m === 'day' ? 'Pick a day on the calendar.' : m === 'sit' ? 'Pick a situation; it attaches to a day that fits.' : 'Pick the span on the calendar: the first day, then the last, or a preset.');
  }
  $('#mode-day').addEventListener('click', () => setMode('day'));
  $('#mode-sit').addEventListener('click', () => setMode('sit'));
  $('#mode-period').addEventListener('click', () => setMode('period'));
  // the day each situation attaches itself to by default (from the calendar; the user can change it)
  const attach = (kind) => {
    if (!cal) return null;
    const mid = cal.reviews[0];
    return ({ review: mid.date, pinup: '2026-10-09', lastcrit: mid.last_desk_crit, good_times: '2026-10-23', waffle: '2026-10-14', deadline: cal.other_courses.deadlines[1].date,
      paper: '2026-10-15', lift: state.date, cohort: state.date, clash: '2026-10-30', weekend: '2026-12-05', other: state.date })[kind] || state.date;
  };
  function situation() {
    const o = sitKind.options[sitKind.selectedIndex];
    const other = sitKind.value === 'other';
    sitOther.hidden = !other;
    state.sit = sitKind.value;
    if (sitKind.value !== 'none') { const d = attach(sitKind.value); if (d && d !== state.date) pick(d); }
    summarise();
    if (other) { if (!getKey()) { exampleReady.then((ex) => { if (ex && !$('#sit-text').value.trim()) { $('#sit-text').value = ex.description; $('#sit-reading').textContent = 'the saved example, not read yet'; } }); say('No key: the saved example is filled in; USE THE SAVED EXAMPLE sets it.'); } else say('Describe it; INTERPRET reads it as a known event, or untested.'); $('#sit-text').focus(); }
    else if (sitKind.value !== 'none') say(`${o.textContent}, on ${$('#sit-day').textContent}.`);
    window.dispatchEvent(new CustomEvent('npc:situation', { detail: { kind: sitKind.value, text: $('#sit-text').value, date: state.date } }));
  }
  sitKind.addEventListener('change', situation);
  // OTHER needs the user's own Claude key (owner 2026-11-08): without one the option is greyed out and the listed situations are the menu
  const keyIn = $('#sit-key'), keySave = $('#sit-key-save'), keyClear = $('#sit-key-clear'), otherOpt = $('#sit-other-opt'), interpretBtn = $('#sit-interpret'), reading = $('#sit-reading');
  // without a key OTHER still works, on the one saved example (owner 2026-11-12): the description and its reading live in
  // program/other-example.json, written by hand to the schema, so a GitHub test run needs no key and bills nobody
  let example = null; const exampleReady = loadExample().then((x) => { example = x; return x; }).catch(() => null);
  const keyState = () => { const has = !!getKey(); if (otherOpt) otherOpt.disabled = false; keyIn.hidden = has; keySave.hidden = has; keyClear.hidden = !has; $('#sit-key-note').textContent = has ? 'Key saved in this browser; OTHER is on. Each INTERPRET is one call billed to that key.' : 'Without a key, OTHER runs the one saved example below (read once, kept in the repo). Your own key reads any description live and is billed to you.'; interpretBtn.disabled = false; interpretBtn.textContent = has ? 'INTERPRET' : 'USE THE SAVED EXAMPLE'; };
  keySave.addEventListener('click', () => { setKey(keyIn.value.trim()); keyIn.value = ''; keyState(); say('Key saved in this browser only.'); });
  keyClear.addEventListener('click', () => { setKey(''); state.sitSpec = null; keyState(); say('Key removed.'); });
  keyState();
  interpretBtn.addEventListener('click', async () => {
    const text = $('#sit-text').value.trim(); if (!text) { say('Describe the situation first.'); return; }
    if (!getKey()) {
      const ex = await exampleReady; if (!ex) { reading.textContent = 'The saved example could not be loaded (program/other-example.json).'; return; }
      if (text !== ex.description.trim()) { reading.textContent = 'Without a key only the saved example can be read. Put its text back (pick OTHER again) or save a key.'; say('No key: only the saved example reads.'); return; }
      const spec = JSON.parse(JSON.stringify(ex.spec)); state.sitSpec = spec; reading.textContent = describeSpec(spec) + ' (the saved example: a hand-written reading, not a live one)';
      say('The saved example is set. RUN applies it on top of the day.'); menu.sum('sum-day', `${spec.title} · ${state.short || ''}`.trim()); return;
    }
    interpretBtn.disabled = true; reading.textContent = 'Reading…'; say('Reading the description with your key…');
    try { const spec = await interpretSituation(text, { date: state.date }); state.sitSpec = spec; reading.textContent = describeSpec(spec); say(spec.untested ? 'Untested: the reading is an approximation; the run will say what it changed.' : 'Read. RUN applies it on top of the day.'); menu.sum('sum-day', `${spec.title} · ${state.short}`); }
    catch (e) { reading.textContent = `Could not read it: ${e.message}`; say('The reading failed; the note under the text box says why.'); }
    interpretBtn.disabled = false;
  });
  $('#sit-text').addEventListener('input', () => { state.sitSpec = null; reading.textContent = '—'; });
  const RULES = { 'sc-access': '24/7 card access', 'sc-paper': 'plotter paper at all hours', 'sc-shop': 'the basement shop' };
  for (const [id, name] of Object.entries(RULES)) $('#' + id).addEventListener('change', (e) => say(`${name}: ${e.target.checked ? 'on' : 'off'}.`));
  const MOVE_NOTE = {
    everyday: 'Chairs and boards move for crits and pin-ups and return. Desks stay put.',
    agents: 'Within limits: the agents act on what they see (a table to the plotter queue, a board to screen a desk, a counter by the kitchen, a shared wall between the years), at most four moves a day, two of them screens, and the desk owners affected may veto.',
    free: 'Without limits: the same moves with no veto and a budget of twelve. Unrealistic: a stress test of the floor.',
  };
  $('#run-movement').addEventListener('change', (e) => { $('#run-movement-note').textContent = MOVE_NOTE[e.target.value]; say(MOVE_NOTE[e.target.value]); summariseRun(); });
  const HORIZON_NOTE = {
    day: 'The picked day, on the grid.',
    term: 'Every day to the final review; a snapshot each week.',
    year: 'Two terms; the cohort turns over at the turn.',
    terms: 'The calendar repeats; the cohort turns over each year.',
  };
  $('#run-horizon').addEventListener('change', (e) => { $('#run-terms').hidden = e.target.value !== 'terms'; $('#run-horizon-note').textContent = HORIZON_NOTE[e.target.value] + (e.target.value === 'day' ? '' : ' A projection, not a prediction.'); say(HORIZON_NOTE[e.target.value]); summariseRun(); });
  $('#run-seeds').addEventListener('change', (e) => { $('#an-runs').textContent = `${e.target.value} run${e.target.value > 1 ? 's' : ''}`; say(Number(e.target.value) > 1 ? `${e.target.value} seeds: the spread shows as a band in ANALYSE.` : 'One seed, one run.'); });
  function summariseRun() {
    const hv = $('#run-horizon').value; const hs = hv === 'span' ? 'a period' : hv === 'terms' ? `${$('#run-terms').value} terms` : hv === 'year' ? 'the year' : hv === 'term' ? 'the term' : 'a day';
    menu.sum('sum-run', `not run · ${hs} · ${choiceText('run-movement').toLowerCase()}`);
  }
  summariseRun();
  $('#sit-change').addEventListener('click', () => { setMode('day'); $('#cal').scrollIntoView({ block: 'nearest' }); say('Pick the day, then A SITUATION.'); });
  $('#sit-text').addEventListener('input', () => { $('#sit-reading').textContent = $('#sit-text').value.trim() ? 'not read yet' : '—'; });
  // -------------------------------------------------------------- the occupants: read, never typed
  try {
    const r = await fetch('/program/cohort.json', { cache: 'no-store' });
    if (r.ok) {
      const co = await r.json();
      const students = co.years.reduce((a, y) => a + y.students, 0), total = students + co.instructors.count;
      const by = co.years.map((y) => `${y.students} year ${y.year}`).join(' · ');
      $('#occupants').innerHTML = `<b>${total}</b> agents: ${by} · ${co.instructors.count} instructors`;
      $('#run-agents').textContent = `${total} (${students} students, ${co.instructors.count} instructors)`;
      state.agents = total;
    }
  } catch (e) { /* none */ }
  $('#seed-new').addEventListener('click', () => { $('#seed').value = String(Math.floor(Math.random() * 1e6)); say(`Seed ${$('#seed').value}: a new set of people.`); });

  // -------------------------------------------------------------- ANALYSE: the core metrics as cards, no values yet
  const GROUPS = { C: 'COLLABORATION', F: 'FOCUS', S: 'LAYOUT' };
  let lastG = '';
  $('#metrics').innerHTML = CORE_METRICS.map(([id, name, unit]) => { const g = id[0]; const head = g !== lastG ? `<div class="grp">${GROUPS[g] || ''}</div>` : ''; lastG = g; return head + `<div class="card"><div class="nm">${name}<small>${id} &middot; ${unit}</small></div><div class="v">&mdash;<small>A</small></div><div class="v b">&mdash;<small>B</small></div><div class="mbar"><em style="left:50%"></em><span style="left:50%">benchmark</span></div></div>`; }).join('');

  // -------------------------------------------------------------- AGENT: an empty inspector
  $('#agent-traits').innerHTML = ['O', 'C', 'E', 'A', 'N'].map((t) => `<div class="trait"><span>${t}</span><div class="bar"><i style="width:50%"></i></div></div>`).join('');

  menu.open('day');
  return state;
}
