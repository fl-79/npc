// Step 3 RUN, wired: builds the world and the people once, runs the term layer to the picked day
// (or over the horizon), then the day run on the grid at the chosen speed, drawing the agents in
// the plan view, filling the clock and the counts, feeding the FEED, and handing the finished run
// to ANALYSE. Also the AGENT inspector and the WALK avatar.
import { Building } from '../sim/building.js';
import { World } from '../sim/world.js';
import { buildPopulation, initialTies } from '../sim/population.js';
import { Calendar, hhmm, secondsOf } from '../sim/calendar.js';
import { TermLayer } from '../sim/term.js';
import { DayRun } from '../sim/engine.js';
import { WALK } from '../sim/grid.js';
import { Feed } from './feed.js';
import { Analyse } from './analyse.js';
import { voiceOf } from '../sim/remarks.js';
import { loader } from './loader.js';
const nextTick = () => new Promise((r) => setTimeout(r, 0));
/** The term layer's walk, handing control back every ~40 ms so the loading bar moves (2026-11-13). */
async function walkTerm(term, from, to, report) {
  const g = term.runSteps(from, to); let r = g.next(), t = performance.now();
  while (!r.done) { if (report && performance.now() - t > 40) { report(r.value.i / r.value.n, r.value.date); await nextTick(); t = performance.now(); } r = g.next(); }
  return r.value;
}

const $ = (s) => document.querySelector(s);
const fetchJSON = async (p) => (await fetch(p, { cache: 'no-store' })).json();

export class RunController {
  constructor({ pixel, pixelB, planLevels, say, currentLevelK, onPixelBack }) {
    this.pixel = pixel; this.pixelB = pixelB || null; this.planLevels = planLevels; this.say = say;
    this.feed = new Feed($('#feed-list'), $('#feed-count'));
    this.analyse = new Analyse({ pixel, feed: this.feed, say, diagramEl: $('#diagram'), currentLevelK, onPixelBack });
    this.run = null; this.timer = null; this.last = 0; this.ready = null; this.snapshots = []; this.seedsDone = 0;
    this.wire();
  }
  wire() {
    const on = (id, ev, fn) => { const el = $('#' + id); if (el) el.addEventListener(ev, fn); };
    for (const id of ['run-play', 'run-pause', 'run-step', 'run-reset']) { const el = $('#' + id); if (el) el.disabled = false; }
    for (const b of document.querySelectorAll('.choice[data-for="run-speed"] button')) b.disabled = false;
    on('run-play', 'click', () => this.play());
    on('run-pause', 'click', () => this.pause());
    on('run-step', 'click', () => this.stepMinute());
    on('run-reset', 'click', () => this.reset());
    // a time of day (owner 2026-11-13): typed, or dragged on the bar; earlier than now rebuilds the day and plays it forward
    const go = () => { const el = $('#run-goto'), hint = $('#run-goto-hint'); const t = this.parseTime(el.value); if (t == null) { hint.textContent = `not a time in the run: ${this.windowText()}`; hint.classList.add('bad'); return; } hint.textContent = 'a time of day, or drag the bar'; hint.classList.remove('bad'); this.seekTo(t); };
    on('run-goto-btn', 'click', go);
    on('run-goto', 'keydown', (e) => { if (e.key === 'Enter') go(); });
    // the bar as a video player's scrubber (owner 2026-11-13): hover shows the time; press and drag moves the playhead with
    // the pointer; dragging ahead plays the run on as the pointer goes, so people move under it; dragging back waits for the
    // release and rebuilds the day to that time; a click jumps. The run pauses while scrubbing and goes on as it was.
    // Keys on the bar: arrows skip 10 minutes, Home and End, space plays and pauses.
    { const bar = $('#run-bar'), tip = $('#run-scrub'), ghost = $('#run-ghost'); let drag = false;
      if (bar) {
        const at = (e) => { const r = bar.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const [a, b] = this.window(); return { f, t: Math.round((a + f * (b - a)) / 60) * 60 }; };
        const showTip = ({ f, t }) => { tip.hidden = false; tip.style.left = `${f * 100}%`; tip.textContent = this.run ? (t < this.run.time ? `${hhmm(t)} \u25c2 back` : hhmm(t)) : `${hhmm(t)} \u25b8 start`; ghost.style.width = `${f * 100}%`; };
        bar.addEventListener('pointermove', (e) => { const p = at(e); showTip(p); if (drag) this.scrubTo(p); });
        bar.addEventListener('pointerleave', () => { if (!drag) { tip.hidden = true; ghost.style.width = '0'; } });
        bar.addEventListener('pointerdown', (e) => { drag = true; bar.setPointerCapture(e.pointerId); bar.classList.add('scrubbing'); bar.focus(); this.scrubStart(); const p = at(e); showTip(p); this.scrubTo(p); e.preventDefault(); });
        const up = (e) => { if (!drag) return; drag = false; bar.releasePointerCapture(e.pointerId); bar.classList.remove('scrubbing'); tip.hidden = true; ghost.style.width = '0'; this.scrubEnd(at(e).t); };
        bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
        bar.addEventListener('keydown', (e) => {
          const [a, b] = this.window(), now = this.run ? this.run.time : a;
          const to = e.key === 'ArrowRight' ? now + 600 : e.key === 'ArrowLeft' ? now - 600 : e.key === 'Home' ? a : e.key === 'End' ? b : null;
          if (e.key === ' ') { e.preventDefault(); if (!this.run) this.play(); else this.pause(); return; }
          if (to == null) return; e.preventDefault(); this.seekTo(Math.max(a, Math.min(b, to)));
        });
      }
    }
    // the agents' moves: a click finds one on the plan
    { const ml = $('#run-moves'); if (ml) ml.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (b) this.findMove(Number(b.dataset.mv)); }); }
    // a run belongs to its settings (owner 2026-11-13): change the movement, the seed, the day, the period or the situation and
    // the run is reset, the bar back to the start
    const check = () => setTimeout(() => { if (this.run && !this.seeking && this.runKey && this.keyOf() !== this.runKey) { this.reset(); this.say('The settings changed, so the run was reset. PLAY runs the new settings.'); } }, 0);
    for (const ev of ['click', 'change', 'input']) document.addEventListener(ev, (e) => { if (e.target.closest && e.target.closest('#steps')) check(); });
    for (const b of document.querySelectorAll('#feed .menu-rows button[data-f], #feed .menu-rows button')) { if (b.id === 'feed-pause') { b.disabled = false; b.addEventListener('click', () => { b.textContent = this.feed.togglePause() ? 'RESUME' : 'PAUSE'; }); } else if (b.id === 'feed-save') { b.disabled = false; b.addEventListener('click', () => this.feed.save()); } else { b.disabled = false; const f = { ALL: 'all', REMARKS: 'rm', EVENTS: 'ev', SUGGESTIONS: 'sg' }[b.textContent.trim()]; if (f) b.addEventListener('click', () => { for (const x of b.parentElement.querySelectorAll('button')) if (!x.id) x.classList.toggle('on', x === b); this.feed.setFilter(f); }); } }
    $('#feed-list').addEventListener('click', (e) => { const n = e.target.closest('[data-agent]'); if (n && n.dataset.agent) this.inspect(Number(n.dataset.agent)); });
    // the agent inspector
    const pick = $('#ag-pick'); if (pick) { pick.disabled = false; pick.addEventListener('change', () => this.inspect(Number(pick.value))); }
    const follow = $('#ag-follow'); if (follow) { follow.disabled = false; follow.addEventListener('click', () => { if (this.inspected) this.followAgent(this.inspected); }); }
    // the avatar
    on('av-enter', 'click', () => this.avatarEnter());
    on('av-leave', 'click', () => this.avatarLeave());
    on('av-talk', 'click', () => this.avatarTalk());
    for (const id of ['av-enter', 'av-name']) { const el = $('#' + id); if (el) { el.disabled = false; el.closest('.row')?.classList.remove('disabled'); } }
    window.addEventListener('keydown', (e) => { if (!this.avatar) return; const m = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] }[e.key.toLowerCase()]; if (m && document.activeElement?.tagName !== 'INPUT') { this.avatarMove(...m); e.preventDefault(); } if (e.key.toLowerCase() === 'e') this.avatarTalk(); });
  }
  settings() {
    const ui = window.npcUI || {};
    return { date: ui.date || '2026-10-13', seed: Number($('#seed').value) || 2026, movement: $('#run-movement').value || 'everyday', horizon: $('#run-horizon').value || 'day', spanFrom: $('#run-span-from').value || null, spanTo: $('#run-span-to').value || null, terms: Number($('#run-terms').value) || 2, seeds: Math.max(1, Number($('#run-seeds').value) || 1), situation: ui.mode === 'sit' ? { kind: $('#sit-kind').value, text: $('#sit-text').value, spec: ui.sitSpec || null } : { kind: 'none' }, policy: { access247: $('#sc-access').checked, paperAllHours: $('#sc-paper').checked, shopOpen: $('#sc-shop').checked } };
  }
  /** What a run depends on, to tell when the settings change. */
  keyOf() { const s = this.settings(); return JSON.stringify([s.date, s.seed, s.movement, s.horizon, s.spanFrom, s.spanTo, s.seeds, s.situation.kind, s.situation.text || '', s.situation.spec || null]); }
  /** The run's clock window in seconds: run_from to run_to the next morning. */
  window() { const tm = this.P?.time || { run_from: '07:00', run_to: '02:00' }; return [secondsOf(tm.run_from), secondsOf(tm.run_to) + 86400]; }
  windowText() { const [a, b] = this.window(); return `${hhmm(a)} to ${hhmm(b)}`; }
  /** A typed time of day: 14:30, 2:30 pm, 9, 01:15 (after midnight is the next morning); seconds on the run's clock, or null. */
  parseTime(txt) {
    const m = String(txt || '').trim().toLowerCase().replace(/\./g, '').match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm|a|p)?$/); if (!m) return null;
    let h = Number(m[1]); const mi = Number(m[2] || 0); if (mi > 59) return null;
    if (m[3]) { if (h < 1 || h > 12) return null; h = (h % 12) + (m[3][0] === 'p' ? 12 : 0); } else if (h > 24) return null;
    const [a, b] = this.window(); let t = (h % 24) * 3600 + mi * 60; if (t < a) t += 86400;
    return t >= a && t <= b ? t : null;
  }
  /** Jump the run to a time (owner 2026-11-13). Forward plays the run on without drawing; back rebuilds the day from the same
   *  settings and plays it forward (the run is deterministic for a seed). Paused stays paused. */
  async seekTo(t, resume) {
    if (this.seeking) return;
    if (!this.run) { await this.play(); if (!this.run) return; }
    this.seeking = true;
    const run0 = this.run, was = resume ?? run0.running; run0.running = false; if (this.timer) cancelAnimationFrame(this.timer);
    try {
      let base = 0;
      if (t < this.run.time) {
        loader.show('GOING BACK', 'the people and the term', 0.02); await nextTick();
        const { run } = await this.build(this.settings(), (f, txt) => loader.set(0.02 + 0.45 * f, txt));
        this.adopt(run); base = 0.5;
      } else loader.show('GOING FORWARD', `to ${hhmm(t)}`, 0);
      this.feed.quiet(true);
      const run = this.run, t0 = run.time, span = Math.max(1, t - t0); let last = performance.now();
      while (run.time < t && !run.done) { run.step(1); if (performance.now() - last > 40) { loader.set(base + (1 - base) * (run.time - t0) / span, `to ${hhmm(t)}: ${hhmm(run.time)}`); await nextTick(); last = performance.now(); } }
      this.feed.quiet(false);
      for (const pv of [this.pixel, this.pixelB]) { const sc = pv && pv.scene; if (sc && sc.emoteQ) sc.emoteQ.length = 0; }   // no bubbles for what was skipped
      loader.hide(); this.status();
      if (run.done) { this.finished(); return; }
      run.running = was; this.last = performance.now();
      $('#run-pause').textContent = was ? 'PAUSE' : 'RESUME'; $('#run-play').classList.toggle('on', was);
      this.say(`At ${hhmm(run.time)}${was ? ', running' : ', paused'}.`);
      if (was) this.tick();
    } catch (e) { loader.hide(0); this.feed.quiet(false); throw e; } finally { this.seeking = false; }
  }
  /** Scrubbing (the bar dragged): the run held, the feed quiet. */
  scrubStart() {
    const run = this.run;
    this.scrub = { was: run ? run.running : true, target: null, raf: null };
    if (run) { run.running = false; if (this.timer) cancelAnimationFrame(this.timer); this.feed.quiet(true); }
  }
  /** The playhead under the pointer; ahead of the run, the run plays on toward it a slice of time per frame. */
  scrubTo({ f, t }) {
    const sc = this.scrub; if (!sc) return;
    sc.target = t; $('#run-progress').style.width = `${(f * 100).toFixed(1)}%`;
    const run = this.run; if (!run || t <= run.time || sc.raf) return;
    const loop = () => {
      const s2 = this.scrub; if (!s2 || !this.run) return;
      const r = this.run, until = performance.now() + 22;
      while (r.time < s2.target && !r.done && performance.now() < until) r.step(1);
      $('#run-clock-time').textContent = hhmm(r.time);
      s2.raf = r.time < s2.target && !r.done ? requestAnimationFrame(loop) : null;
    };
    sc.raf = requestAnimationFrame(loop);
  }
  /** Released: the rest of the way forward, or back by a rebuild; the run then goes on as it was. */
  async scrubEnd(t) {
    const sc = this.scrub; this.scrub = null; if (!sc) return;
    if (sc.raf) cancelAnimationFrame(sc.raf);
    if (this.run) { this.feed.quiet(false); for (const pv of [this.pixel, this.pixelB]) { const s3 = pv && pv.scene; if (s3 && s3.emoteQ) s3.emoteQ.length = 0; } }
    if (this.run && Math.abs(t - this.run.time) < 60) { this.status(); this.run.running = sc.was; this.last = performance.now(); $('#run-pause').textContent = sc.was ? 'PAUSE' : 'RESUME'; if (sc.was) this.tick(); return; }
    await this.seekTo(t, sc.was);
  }
  /** A move from the RUN step's list, found on whichever pane shows its floor in plan. */
  findMove(id) {
    const run = this.run; if (!run) return; const mv = run.layout.moves.find((m) => m.id === id); if (!mv) return;
    for (const pv of [this.pixelB, this.pixel]) { const sc = pv && pv.scene; if (sc && sc.L && sc.opts && sc.opts.view === 'plan' && pv.visible && run.b.levelIndex(sc.levelFile) === mv.k) { sc.showMove(mv); this.say(`Move ${mv.id}, ${hhmm(mv.t)}: ${mv.what}.`); return; } }
    this.say(`Move ${mv.id} is on ${run.b.levels[mv.k].name}: show that floor in plan to see it.`);
  }
  /** A run on show: the views, the feed, the agent list. */
  adopt(run) {
    this.run = run; window.npcRun = run;
    this.pixel.setSim(run); if (this.pixelB) this.pixelB.setSim(run);
    this.feed.attach(run);
    const pick = $('#ag-pick'); if (pick) { pick.innerHTML = run.pop.agents.filter((a) => run.plans.get(a.id)?.present).map((a) => `<option value="${a.id}">${a.name} (${a.role === 'student' ? 'y' + a.year + ' s' + a.section : a.role})</option>`).join(''); pick.closest('.row')?.classList.remove('disabled'); }
  }
  /** Load the tiles and the program once. */
  async load() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      this.say('Loading the floors and the people…');
      const levels = await this.pixel.loadAllTiles();
      const [rooms, objects, building, cohort, calendar, affordances, P, simParams] = await Promise.all(['rooms', 'objects', 'building', 'cohort', 'calendar', 'affordances', 'parameters', 'simulation'].map((n) => fetchJSON(`program/${n}.json`)));
      this.P = P; this.simParams = simParams; this.program = { rooms, objects, building, cohort, calendar, affordances };
      this.building = new Building(levels, simParams); this.world = new World(this.building, this.program, P); this.cal = new Calendar(calendar);
      window.npcWorld = this.world;
    })();
    return this.ready;
  }
  /** The people for a seed, the term layer to the date, and the day run. */
  async build(s, report) {
    const say = report || (() => {});
    say(0, 'the people');
    this.world.restoreLayout();   // every run from the model's layout (2026-11-13)
    const pop = buildPopulation(this.program.cohort, this.P, s.seed); this.world.assignDesks(pop.agents);
    const { ties } = initialTies(pop.agents, this.P);
    const term = new TermLayer(this.world, pop, this.cal, this.P, { seed: s.seed, ties });
    // a span (step 1, A PERIOD): the term is built from its start as always, the snapshots kept from the span's first day, the floor plays its last
    const to = s.horizon === 'day' ? s.date : s.horizon === 'span' ? (s.spanTo || s.date) : s.horizon === 'term' ? this.cal.cal.term.classes_end : this.cal.cal.term.exams_end;
    const w1 = s.horizon === 'day' ? 0.8 : 0.48;
    let snaps = await walkTerm(term, this.cal.start, s.horizon === 'day' ? s.date : to, report && ((f, d) => say(0.1 + w1 * f, `the term, ${d}`)));
    if (s.horizon === 'span' && s.spanFrom) snaps = snaps.filter((sn) => sn.date >= s.spanFrom);
    if (s.horizon !== 'day') { term.state = new Map(); for (const a of pop.agents) term.state.set(a.id, term.initial(a)); await walkTerm(term, this.cal.start, s.date, report && ((f, d) => say(0.58 + 0.32 * f, `the state on ${s.date}, ${d}`))); } // the state as of the picked day
    say(0.92, 'the day');
    const run = new DayRun(this.world, pop, term, this.cal, this.P, this.simParams, { date: s.date, seed: s.seed, movement: s.movement, situation: s.situation, policy: s.policy });
    return { pop, term, run, snaps };
  }
  async play() {
    if (this.run && !this.run.done) { this.run.running = true; this.last = performance.now(); this.tick(); this.say('Running.'); return; }
    const s = this.settings();
    if (s.situation.kind === 'other' && !s.situation.spec) { this.say('OTHER needs a reading first: press INTERPRET (your key), or pick a listed situation.'); return; }
    loader.show('LOADING THE RUN', 'the floors and the program', 0.02);
    try { await this.play2(s); } catch (e) { loader.hide(0); throw e; }
  }
  async play2(s) {
    await this.load();
    this.runKey = this.keyOf();
    $('#run-stat').textContent = 'Building the people and the term…';
    loader.set(0.12, 'the people'); await nextTick();
    const { run, snaps } = await this.build(s, (f, t) => loader.set(0.12 + 0.82 * f, t));
    this.snapshots = snaps; this.bands = null;
    if (s.seeds > 1 && s.horizon !== 'day') {
      // the ensemble: the term layer per seed (cheap); the day run stays on the first seed
      const keys = ['hoursPerPerson', 'highStressShare', 'meanComfort', 'betweenYearTies'], all = [snaps];
      const nS = Math.min(s.seeds, 40); for (let i = 1; i < nS; i++) { loader.set(0.94, `the other seeds, ${i + 1} of ${nS}`); await nextTick(); const r2 = await this.build({ ...s, seed: s.seed + i }); all.push(r2.snaps); }
      this.bands = { n: all.length }; for (const k of keys) { const lo = [], hi = []; for (let w = 0; w < snaps.length; w++) { const vs = all.map((S) => S[w]?.[k] ?? 0).sort((a, b) => a - b); lo.push(vs[Math.floor(vs.length * 0.1)]); hi.push(vs[Math.floor(vs.length * 0.9)]); } this.bands[k] = { lo, hi }; }
    }
    this.adopt(run);
    loader.hide();
    run.running = true; this.last = performance.now();
    $('#run-play').classList.add('on'); $('#run-pause').disabled = false; $('#run-reset').disabled = false;
    document.getElementById('sum-run').textContent = `running · ${s.date}`;
    this.say(`Running ${s.date}: ${[...run.plans.values()].filter((p) => p.present).length} people expected. Show Level 3 in PLAN VIEW to watch them; the feed fills on the right.`);
    this.tick();
  }
  pause() { if (!this.run) return; this.run.running = !this.run.running; this.last = performance.now(); $('#run-pause').textContent = this.run.running ? 'PAUSE' : 'RESUME'; if (this.run.running) this.tick(); }
  stepMinute() { if (!this.run) return; for (let i = 0; i < 60 && !this.run.done; i++) this.run.step(1); this.status(); if (this.run.done) this.finished(); }
  reset() { if (this.timer) cancelAnimationFrame(this.timer); this.run = null; this.runKey = null; this.movesShown = -1; { const ml = $('#run-moves'); if (ml) { ml.hidden = true; ml.innerHTML = ''; } } this.pixel.setSim(null); if (this.pixelB) this.pixelB.setSim(null); for (const pv of [this.pixel, this.pixelB]) pv?.scene?.restoreFurniture?.(); $('#run-play').classList.remove('on'); $('#run-pause').textContent = 'PAUSE'; $('#run-clock-time').textContent = hhmm(this.window()[0]); $('#run-progress').style.width = '0%'; $('#run-stat').textContent = '—'; this.say('Reset.'); }
  tick() {
    if (!this.run || !this.run.running) return;
    const now = performance.now(), real = Math.min(0.25, (now - this.last) / 1000); this.last = now;
    const speed = Number($('#run-speed').value) || 60;
    let budget = real * speed, n = 0;
    while (budget >= 1 && !this.run.done && n < 2000) { this.run.step(1); budget -= 1; n++; }
    if (n > 0 || this.run.done) this.status();
    if (this.run.done) { this.finished(); return; }
    this.timer = requestAnimationFrame(() => this.tick());
  }
  status() {
    const s = this.run.summary();
    $('#run-clock-time').textContent = s.time; if (!this.scrub) $('#run-progress').style.width = `${(s.progress * 100).toFixed(1)}%`;
    // the agents' moves, numbered as on the plan (owner 2026-11-13)
    const mvs = this.run.layout.moves, ml = $('#run-moves');
    if (ml && mvs.length !== this.movesShown) { this.movesShown = mvs.length; ml.hidden = !mvs.length; ml.innerHTML = `<div class="sub">MOVED BY THE AGENTS \u00b7 ${mvs.length}</div>` + mvs.map((m) => `<button class="mvi" data-mv="${m.id}" title="find it on the plan"><b>${m.id}</b>${hhmm(m.t)} \u00b7 ${this.run.b.levels[m.k].name} \u00b7 ${m.what} <span class="hint">(${m.tag})</span></button>`).join(''); }
    $('#cnt-floor').textContent = s.floor; $('#cnt-building').textContent = s.building; $('#cnt-crit').textContent = s.crit; $('#cnt-plot').textContent = s.plot; $('#cnt-lift').textContent = s.lift;
    $('#run-stat').textContent = `${this.run.bus.events.length} events · ${this.run.stats.encounters} encounters · ${this.run.stats.interactions} conversations · ${this.run.stats.remarks} remarks`;
    if (this.inspected) this.inspect(this.inspected, true);
  }
  finished() {
    $('#run-play').classList.remove('on');
    document.getElementById('sum-run').textContent = `ran ${this.run.date} · ${this.run.situation.kind} · ${this.run.movement}`;
    document.querySelector('#menu li[data-step="run"]').classList.add('done');
    this.analyse.take(this.run, this.snapshots, this.bands);
    window.dispatchEvent(new CustomEvent('npc:run-done'));   // the steps after RUN open up (owner 2026-11-12)
    this.say(`The day is over: ${this.run.stats.encounters} encounters, ${this.run.stats.interactions} conversations. ANALYSE is ready.`);
  }
  // ---------------------------------------------------------------- the agent inspector
  inspect(id, quiet) {
    const run = this.run; if (!run) return; const ag = run.byId.get(id); if (!ag) return; this.inspected = id;
    const a = ag.a, st = run.term.state.get(a.id), pl = ag.plan;
    $('#ag-name').textContent = a.name; $('#ag-role').textContent = a.role === 'student' ? `year ${a.year} · section ${a.section} · desk ${a.desk ? `(${a.desk.c0}, ${a.desk.r0})` : 'none'} · ${a.chronotype}` : `${a.role} · section ${a.section} of year ${a.year} · ${a.sessional ? 'sessional, no office' : a.officeHere ? 'office ' + a.office : 'office in another building'} · crits ${a.critMode === 'spot' ? 'at a spot' : 'desk by desk'}`;
    const traits = ['O', 'C', 'E', 'A', 'N']; $('#agent-traits').innerHTML = traits.map((t) => `<div class="trait"><span>${t} ${a.traits[t].toFixed(1)}</span><div class="bar"><i style="width:${Math.round(50 + 20 * Math.max(-2.5, Math.min(2.5, a.traits[t])))}%"></i></div></div>`).join('');
    $('#ag-act').textContent = `${ag.inside ? ag.activity || ag.state : ag.gone ? 'gone' : 'not arrived'} · ${run.b.levels[ag.k].name}${ag.headphones ? ' · headphones' : ''}`;
    $('#ag-plan').textContent = pl.present ? `${hhmm(pl.arrive)}–${hhmm(pl.leave)}: ${pl.items.map((i) => `${hhmm(i.t)} ${i.kind}`).join(', ')}${pl.crit ? `, crit ${hhmm(pl.crit.t)}` : ''}` : 'not in today';
    $('#ag-needs').textContent = `hunger ${ag.needs.hunger.toFixed(2)} · thirst ${ag.needs.thirst.toFixed(2)} · washroom ${ag.needs.washroom.toFixed(2)} · sleep debt ${st ? st.sleepDebt.toFixed(1) + ' h' : '—'}`;
    $('#ag-stress').textContent = `${st ? st.stress.toFixed(2) : '—'} · urgency ${pl.urgency ? pl.urgency.toFixed(1) : '—'}`;
    $('#ag-progress').textContent = st ? `${(st.progress * 100).toFixed(0)}% toward the next review · ${st.hours.toFixed(0)} h on the floor this term · $${st.spend.toFixed(0)} spent` : '—';
    let ties = 0, strong = 0; for (const [k, v] of run.term.ties) { if (!k.split(':').map(Number).includes(a.id) || v <= 0) continue; ties++; if (v >= run.P.social.tie.strong) strong++; }
    $('#ag-social').textContent = `${st ? st.comfort.toFixed(2) : '—'} · ${ties} ties, ${strong} strong${a.mentor ? ' · mentor ' + run.names.get(a.mentor) : ''}${a.ta ? ' · TA for year ' + a.ta.year : ''}`;
    $('#ag-avail').textContent = `${run.availability(ag).toFixed(1)} · headphones ${ag.headphones ? 'on' : 'off'} · H_base ${a.H_base.toFixed(0)} h/wk · sociability ${a.sociability.toFixed(2)}`;
    const v = voiceOf(a); $('#ag-voice').textContent = `${v.label}${a.role === 'student' ? ` · office hours P ${(a.officeVisitP || 0).toFixed(2)} a week` : ''}`;
    if (!quiet) { const pick = $('#ag-pick'); if (pick) pick.value = String(id); }
  }
  followAgent(id) { const ag = this.run?.byId.get(id); if (!ag) return; const sc = this.pixel.scene; if (sc && sc.L && sc.cameras) { const T = 16; sc.cameras.main.centerOn(ag.x * T + T / 2, ag.y * T + T); } this.say(`Following ${ag.a.name} on ${this.run.b.levels[ag.k].name}.`); }
  // ---------------------------------------------------------------- the avatar: a visitor the user walks
  avatarEnter() {
    if (!this.run) { this.say('Start a run first: the avatar walks the running day.'); return; }
    const w = this.run.w, k = w.studio.k, e = w.entrance;
    const av = { id: 9999, a: { id: 9999, name: $('#av-name').value || 'Visitor', role: 'visitor', year: 0, sociability: 1, traits: { O: 0, C: 0, E: 0, A: 0, N: 0 } }, k: e.k, c: e.c, r: e.r, x: e.c, y: e.r, state: 'avatar', activity: 'walk', inside: true, gone: false, needs: { hunger: 0, thirst: 0, washroom: 0 }, rates: { hunger: 0, thirst: 0, washroom: 0 }, headphones: false, plan: { present: true, items: [], arrive: this.run.time, leave: this.run.end }, steps: [], stack: [], done: new Set(), atOwnDesk: false, avatar: true };
    this.avatar = av; this.run.agents.push(av); this.run.byId.set(av.id, av);
    $('#av-leave').disabled = false; $('#av-talk').disabled = false;
    $('#av-chat').textContent = `You are in at the south door on ${this.run.b.levels[av.k].name}. W A S D walk, E talks to the nearest person. The clock runs at the RUN speed.`;
    this.say('Avatar in. Show the floor in PLAN VIEW to see yourself.');
  }
  avatarLeave() { if (!this.avatar) return; this.run.agents = this.run.agents.filter((x) => x !== this.avatar); this.run.byId.delete(this.avatar.id); this.avatar = null; $('#av-leave').disabled = true; $('#av-talk').disabled = true; $('#av-chat').textContent = 'Out.'; }
  avatarMove(dc, dr) {
    const av = this.avatar, g = this.run.b.levels[av.k].grid;
    const c = av.c + dc, r = av.r + dr;
    if (!g.inb(c, r) || g.walk[g.idx(c, r)] === WALK.NO) return;
    av.c = c; av.r = r; av.x = c; av.y = r; av.face = dc ? (dc > 0 ? 2 : 1) : (dr > 0 ? 0 : 3);
    // the stairs: step onto a portal's entry to change floor
    for (const p of this.run.b.portals) if (p.from.k === av.k && p.from.c === c && p.from.r === r) { av.k = p.to.k; av.c = p.to.c; av.r = p.to.r; av.x = av.c; av.y = av.r; $('#av-chat').textContent = `Stairs to ${this.run.b.levels[av.k].name}.`; break; }
  }
  avatarTalk() {
    const av = this.avatar; if (!av) return;
    let best = null, bd = 9;
    for (const ag of this.run.agents) { if (ag === av || !ag.inside || ag.k !== av.k) continue; const d = Math.hypot(ag.x - av.x, ag.y - av.y); if (d < bd) { bd = d; best = ag; } }
    if (!best) { $('#av-chat').textContent += '\nNobody within four metres.'; return; }
    const last = [...this.run.bus.events].reverse().find((e) => e.kind === 'remark' && e.agents[0] === best.a.id);
    const st = this.run.term.state.get(best.a.id);
    const line = last ? `"${last.text}"` : `"${best.activity === 'desk_work' ? 'Working. Ask me after the crit.' : best.activity === 'crit' ? 'In a crit, sorry.' : 'Hi. ' + (best.a.role === 'student' ? 'Year ' + best.a.year + ', section ' + best.a.section + '.' : 'I teach section ' + best.a.section + '.')}"`;
    $('#av-chat').textContent += `\n${hhmm(this.run.time)} ${best.a.name} (${best.activity || best.state}${st ? ', stress ' + st.stress.toFixed(1) : ''}): ${line}`;
    $('#av-chat').scrollTop = $('#av-chat').scrollHeight;
  }
}
