// Step 4 ANALYSE, wired: the summary with traces, the overlay buttons (the diagram over the stage),
// the metric cards, the timeline over the horizon (the term layer's weekly snapshots, a band over
// seeds), the Pareto view, export. Reads the run's aggregates and the term snapshots; never a tick.
import { computeMetrics } from '../sim/metrics.js';
import { runRules } from '../sim/rules.js';
import { hhmm } from '../sim/calendar.js';
import { Diagram } from './diagram.js';

const $ = (s) => document.querySelector(s);
const CARD_KEYS = ['C1', 'C3', 'C4', 'C6', 'C7', 'F1', 'F2', 'F4', 'F8'];   // C13, F11 and S1 are not computed and are off the panel for now (owner 2026-11-12; reminder set)
// What each metric is, how the engine measures it, why it matters and where it comes from (owner 2026-11-12). The sources are
// the ones in research/summary-metrics.md; the engine's own choices are marked [A].
const METRIC_NOTES = {
  C1: { unit: 'm', better: 'higher', goal: '\u2265 30 m', src: 'Kabo 2014', what: 'Metres of walking route two people share, per pair.', how: 'Shortest paths from each desk to its owner\'s amenities; the shared length per pair.', why: 'About 30 m more shared path gives a 20% higher chance of a new tie.', ref: 'Kabo et al. 2014, 2015.' },
  C3: { unit: '/wk', better: 'higher', goal: '\u2265 1 /wk [A]', src: 'Kabo; rate [A]', what: 'First conversations between strangers, per person per week.', how: 'The day\'s first-time pairs, scaled to a week \u00d71.5 [A].', why: 'New ties are the social work a studio is for.', ref: 'Kabo; the weekly goal is assumed.' },
  C4: { unit: 'min', better: 'higher', goal: '\u2265 45 min [A]', src: 'Bernstein 2018 [A]', what: 'Minutes in face-to-face conversation per person per day.', how: 'Encounters summed per person, both sides counted.', why: 'Open plans cut face-to-face time by 70% in offices; a studio should hold its own.', ref: 'Bernstein & Turban 2018 (offices); the goal is assumed.' },
  C6: { unit: 'share', better: 'higher', goal: '\u2265 0.25 [A]', src: 'Allen 1977 [A]', what: 'Share of conversations that cross a year.', how: 'Cross-year conversations over all student conversations.', why: 'Contact within a year happens anyway; across years is what layouts change.', ref: 'Allen 1977; the mentorship programme (APR 2024); the goal is assumed.' },
  C7: { unit: 'share', better: null, goal: 'no goal', src: 'Heerwagen; Rashid', what: 'Share of conversations on routes and at amenities rather than at desks.', how: 'Each conversation placed by the tile it starts on.', why: 'A layout that moves chance meetings onto routes is working harder.', ref: 'Heerwagen; Rashid. No goal.' },
  C13: { unit: 'min', better: 'lower', goal: '\u2264 15 min', src: 'Heerwagen', what: 'How long a question waits for an answer.', how: 'Not modelled: a placeholder.', why: 'Answers in under a minute in a shared room, days apart.', ref: 'Heerwagen (NASA JPL). Placeholder.' },
  F1: { unit: 'min', better: 'higher', goal: '\u2265 11 min', src: 'Mark 2005', what: 'Median length of a focused stretch at the desk.', how: 'From settling to an interruption by someone else; the median block.', why: 'Offices average about 11 minutes between switches; longer means the floor lets people work.', ref: 'Mark, Gonz\u00e1lez & Harris 2005; an undisturbed bout is about 52 min.' },
  F2: { unit: '/h', better: 'lower', goal: '\u2264 1 /h [A]', src: 'Heerwagen [A]', what: 'Interruptions by others per hour of focus.', how: 'Others\' interruptions over the hours in focus; own breaks not counted.', why: 'Interruptions cost most on complex work.', ref: 'Heerwagen; Zijlstra; the goal is assumed.' },
  F4: { unit: '/h', better: 'lower', goal: '\u2264 6 /h [A]', src: 'Hillier 1996 [A]', what: 'People passing within a metre of a desk, per hour.', how: 'One count per walker per pass; half weight beyond two tiles or behind a screen.', why: 'Movement should pass by work spaces, not through them.', ref: 'Hillier 1996; the goal is assumed.' },
  F8: { unit: 'min', better: 'lower', goal: '\u2264 5 min [A]', src: 'KEYS [A]', what: 'Mean wait at the plotters, and jobs abandoned for paper.', how: 'Every queue wait logged; the abandoned are those who gave up without paper.', why: 'Queue time is lost time before a review; the mean hides the giving-up.', ref: 'KEYS resources scale (Amabile); the goal is assumed.' },
  F11: { unit: '', better: null, goal: 'not computed', src: 'Amabile 1996', what: 'The KEYS creativity-climate score agents would report.', how: 'Needs the self-report layer.', why: 'KEYS separates high and low creativity settings by 0.3 to 0.6 points.', ref: 'Amabile et al. 1996.' },
  S1: { unit: '', better: null, goal: 'not computed', src: 'Hillier 1996', what: 'Space-syntax integration of the floor.', how: 'A static layout analysis; pending.', why: 'Movement shallow, focused work deep, is Hillier\'s order for a working floor.', ref: 'Hillier 1996.' },
};
const GROUP = { C: 'COLLABORATION', F: 'FOCUS', S: 'LAYOUT' };

export class Analyse {
  constructor(ctx) {
    this.ctx = ctx; // { pixel, feed, say, diagramEl }
    this.diagram = new Diagram(ctx.diagramEl);
    this.layer = 'none'; this.A = null; this.B = null; this.run = null; this.snapshots = []; this.bands = null;
    for (const b of document.querySelectorAll('#an-layers button')) b.addEventListener('click', () => this.setLayer(b.dataset.l));
    $('#an-export-json').addEventListener('click', () => this.export('json'));
    $('#an-export-csv').addEventListener('click', () => this.export('csv'));
    $('#an-summary').addEventListener('click', (e) => this.traceClick(e));
    $('#an-week').addEventListener('input', () => this.drawTimeline());
    const bsel = document.querySelector('.choice[data-for="an-b"]'); if (bsel) for (const b of bsel.querySelectorAll('button[data-v]')) b.disabled = false;
    $('#an-b').addEventListener('change', () => this.fillCards());
  }
  enable() { $('#an-layers').classList.remove('disabled'); for (const id of ['an-export-json', 'an-export-csv', 'an-week', 'an-band']) { const el = $('#' + id); if (el) el.disabled = false; } }
  /** A finished run: compute, and fill every part of the step. */
  take(run, snapshots, bands) {
    if (this.A) this.B = this.A; // the previous run becomes B
    // and the cards show it by default, as the A vs B rule already compares against it (walkthrough 2026-11-12, stop 4)
    if (this.B) { $('#an-b').value = 'saved'; const ch = document.querySelector('.choice[data-for="an-b"]'); if (ch) for (const btn of ch.querySelectorAll('button[data-v]')) btn.classList.toggle('on', btn.dataset.v === 'saved'); }
    this.run = run; this.snapshots = snapshots || []; this.bands = bands || null;
    const hours = (run.end - run.time) / 3600 + 1;
    this.A = { label: `${run.date} · ${run.situation.kind} · ${run.movement}`, metrics: computeMetrics(run.w, run.stats, run.pop.agents, run.P, hours), run };
    this.A.suggestions = runRules(run, this.A.metrics, this.B ? this.B.metrics : null);
    for (const s of this.A.suggestions) run.bus.emit({ t: run.time, kind: 'suggestion', tag: s.tag, text: s.text.split('. ')[0] + '.', agents: [] });
    this.enable(); this.fillSummary(); this.fillCards(); this.drawTimeline(); this.drawPareto();
    $('#an-runs').textContent = `${bands ? bands.n : 1} run${bands && bands.n > 1 ? 's' : ''}`;
    document.getElementById('sum-analyse').textContent = `${this.A.suggestions.length} suggestions · C4 ${this.A.metrics.C4.value.toFixed(0)} · F1 ${this.A.metrics.F1.value.toFixed(0)}`;
    document.querySelector('#menu li[data-step="analyse"]').classList.add('done');
  }
  fillSummary() {
    const run = this.run, names = run.names;
    const ev = (id) => run.bus.events.find((e) => e.id === id);
    // two groups (owner 2026-11-12): what to improve for collaboration, and the other design suggestions
    const isCollab = (sg) => /^C/.test(sg.tag) || (sg.tag === 'MOVES' && /kitchen|counter|shared wall|between the years/i.test(sg.text)) || (sg.tag === 'A vs B' && /contact/i.test(sg.text));
    const item = (s) => { const mid = (s.metric.match(/^([CFS]\d+)/) || [])[1]; return `<li><b>${s.tag}</b>${s.text} <details><summary>TRACE</summary><div class="trace">
      <div class="step"><b>SITUATION</b><span>${s.situation}</span></div>
      <div class="step"><b>METRIC</b><span>${mid ? `<span class="mlink" data-m="${mid}" title="go to the card">${s.metric}</span>` : s.metric}</span></div>
      <div class="step"><b>EVENTS</b><span>${s.events.map((id) => { const e = ev(id); return e ? `<span class="ev" data-ev="${id}" data-k="${e.k ?? ''}" data-c="${e.c ?? ''}" data-r="${e.r ?? ''}">${hhmm(e.t)} ${e.place || ''}: ${e.text || e.kind}</span>` : ''; }).join('<br>') || 'none'}</span></div>
      <div class="step"><b>AGENTS</b><span>${s.remarks.map((id) => { const e = ev(id); return e ? `<span class="ev" data-ev="${id}" data-k="${e.k ?? ''}" data-c="${e.c ?? ''}" data-r="${e.r ?? ''}">${names.get(e.agents[0])}, ${hhmm(e.t)}: <q>${e.text}</q></span>` : ''; }).join('<br>') || 'none'}</span></div>
      <div class="step"><b>SPOTS</b><span>${s.spots.map((p) => `<span class="ev" data-k="${p.k}" data-c="${p.c}" data-r="${p.r}">${run.b.levels[p.k].name} (${p.c}, ${p.r}) ×${p.n}</span>`).join('<br>') || 'none'}</span></div>
    </div></details></li>`; };
    const collab = this.A.suggestions.filter(isCollab), other = this.A.suggestions.filter((x) => !isCollab(x));
    const group = (title, list, empty) => `<li class="grp-head">${title}</li>` + (list.length ? list.map(item).join('') : `<li class="hint">${empty}</li>`);
    $('#an-summary').innerHTML = group('TO IMPROVE FOR COLLABORATION', collab, 'Nothing fired: the collaboration metrics are at their goals on this run.') + group('OTHER DESIGN SUGGESTIONS', other, 'Nothing fired.');
    for (const l of $('#an-summary').querySelectorAll('.mlink')) l.addEventListener('click', () => { const c = $('#card-' + l.dataset.m); if (!c) return; c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1600); });
  }
  traceClick(e) {
    const t = e.target.closest('.ev'); if (!t) return;
    if (t.dataset.ev) this.ctx.feed.highlight(Number(t.dataset.ev));
    if (t.dataset.k !== '' && t.dataset.k != null) { const k = Number(t.dataset.k), c = Number(t.dataset.c), r = Number(t.dataset.r); if (!Number.isNaN(k) && !Number.isNaN(c)) { if (this.layer === 'none') this.setLayer('encounters'); if (this.diagram.level !== this.run.w.levels[k].file) { this.diagram.plan(this.run.w, k); this.diagram.layer(this.layer, this.run, k); } this.diagram.pointAt(c, r); } }
  }
  setLayer(name) {
    this.layer = name;
    for (const b of document.querySelectorAll('#an-layers button')) b.classList.toggle('on', b.dataset.l === name);
    if (!this.run || name === 'none') { this.diagram.hide(); this.diagram.setOver(null); this.ctx.pixel.el.classList.remove('dim'); this.ctx.pixel.el.classList.toggle('on', this.ctx.pixelWasOn && name === 'none'); if (name === 'none' && this.ctx.onPixelBack) this.ctx.onPixelBack(); return; }
    const k = this.ctx.currentLevelK?.() ?? this.run.w.studio.k;
    // over the pixel plan when it is up (owner 2026-11-12): the pixel art fades to grey under the overlay; in the isometric or the
    // 3D building the vector plan is drawn as before
    const over = !!(this.ctx.pixel.isPlan && this.ctx.pixel.isPlan() && this.ctx.pixel.planRect && this.ctx.pixel.planRect());
    this.ctx.pixel.el.classList.toggle('dim', over);
    this.diagram.plan(this.run.w, k); this.diagram.layer(name, this.run, k); this.diagram.setOver(over ? () => this.ctx.pixel.planRect() : null); this.diagram.show();
    this.ctx.say(DETAILS[name].note);
    $('#an-details .d').innerHTML = `<b>WHAT</b>${DETAILS[name].what}<b>HOW</b>${DETAILS[name].how}<b>REGISTRY</b>${DETAILS[name].ids}<b>REFERENCES</b>${DETAILS[name].refs}`;
  }
  fillCards() {
    const A = this.A?.metrics, Bsel = $('#an-b').value, B = Bsel === 'saved' && this.B ? this.B.metrics : null;
    const el = $('#metrics'); if (!A) return;
    let last = ''; const fmt = (v, k) => v == null ? '—' : (k === 'C6' || k === 'C7' ? v.toFixed(2) : v.toFixed(v < 10 ? 1 : 0));
    const verdictOf = (m, note) => {
      if (!note || m.value == null || m.placeholder) return ['', ''];
      if (m.benchmark == null || !note.better) return ['no goal in the literature: compare two layouts', 'na'];
      const ratio = m.value / m.benchmark;
      if (Math.abs(ratio - 1) <= 0.1) return ['at the goal', 'ok'];
      const good = note.better === 'higher' ? m.value > m.benchmark : m.value < m.benchmark;
      return good ? ['past the goal', 'ok'] : [note.better === 'higher' ? 'short of the goal' : 'over the goal', 'bad'];
    };
    el.innerHTML = CARD_KEYS.map((k) => {
      const m = A[k]; if (!m) return ''; const g = k[0]; const head = g !== last ? `<div class="grp">${GROUP[g]}</div>` : ''; last = g;
      const sc = m.scale || [0, 1]; const p = (v) => `${Math.max(0, Math.min(100, ((v - sc[0]) / (sc[1] - sc[0])) * 100))}%`; const bv = B ? B[k]?.value : null;
      const note = METRIC_NOTES[k] || {}; const unit = note.unit || ''; const [verdict, vcls] = verdictOf(m, note);
      const sim = m.value == null ? '\u2014' : `${fmt(m.value, k)} ${unit}`;
      return head + `<div class="card ${vcls}" id="card-${k}">
        <button type="button" class="q" data-q="${k}" title="how, why, reference">?</button>
        <div class="nm">${m.name}<small>${k} · ${note.what || ''}</small></div>
        <div class="v"><b>${sim}</b><small>simulated${bv != null ? ` · B ${fmt(bv, k)} ${unit}` : ''}</small></div>
        <div class="v g"><b>${note.goal || (m.benchmark != null ? `${m.benchmark} ${unit}` : '—')}</b><small>goal · ${note.src || ''}</small></div>
        <div class="mbar">${m.value != null ? `<i class="a" style="left:0; width:${p(m.value)}; height:4px"></i>` : ''}${bv != null ? `<i class="b" style="left:0; width:${p(bv)}; height:4px"></i>` : ''}${m.benchmark != null ? `<em style="left:${p(m.benchmark)}"></em><span style="left:${p(m.benchmark)}">goal</span>` : ''}</div>
        ${verdict ? `<div class="verdict ${vcls}">${verdict}</div>` : ''}
        ${note.how ? `<div class="note" id="mnote-${k}" hidden><b>HOW</b> ${note.how} <b>WHY</b> ${note.why} <b>REFERENCE</b> ${note.ref}</div>` : ''}
      </div>`;
    }).join('');
    for (const b of el.querySelectorAll('button.q')) b.addEventListener('click', () => { const n = el.querySelector('#mnote-' + b.dataset.q); if (n) { n.hidden = !n.hidden; b.classList.toggle('on', !n.hidden); } });
  }
  drawTimeline() {
    const cv = $('#an-timeline'); if (!cv) return; const tl = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 22;
    tl.fillStyle = '#fff'; tl.fillRect(0, 0, W, H);
    const S = this.snapshots; if (!S.length) { tl.fillStyle = '#5a4d44'; tl.font = '7px Silkscreen, monospace'; tl.fillText('A DAY HAS NO TIMELINE: PICK A PERIOD IN STEP 1', 6, 14); return; }
    const n = S.length, x = (i) => pad + (i / Math.max(1, n - 1)) * (W - pad - 6);
    const series = [['hoursPerPerson', '#c8502c', 60, 'hours/wk'], ['highStressShare', '#c0392b', 1, 'stress>0.7'], ['meanComfort', '#4f8a4a', 1, 'comfort'], ['betweenYearTies', '#2f6fb2', Math.max(1, ...S.map((s) => s.betweenYearTies)), 'between-year ties']];
    const wk = Number($('#an-week').value); $('#an-week').max = String(n - 1); if (wk > n - 1) $('#an-week').value = String(n - 1);
    for (const [key, col, max, label] of series) {
      const y = (v) => H - 14 - (v / max) * (H - 22);
      if (this.bands && this.bands[key]) { tl.fillStyle = col.replace(')', ',0.15)').replace('#', 'rgba(').replace(/rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/, (m, a, b, c) => `rgba(${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(c, 16)}`); tl.beginPath(); this.bands[key].hi.forEach((v, i) => tl.lineTo(x(i), y(v))); for (let i = n - 1; i >= 0; i--) tl.lineTo(x(i), y(this.bands[key].lo[i])); tl.closePath(); tl.fill(); }
      tl.strokeStyle = col; tl.lineWidth = 1.5; tl.beginPath(); S.forEach((s, i) => tl.lineTo(x(i), y(s[key] || 0))); tl.stroke();
    }
    const sel = Math.min(n - 1, Number($('#an-week').value)); tl.fillStyle = 'rgba(217,201,163,0.6)'; tl.fillRect(x(sel) - 3, 4, 6, H - 18);
    tl.fillStyle = '#5a4d44'; tl.font = '7px Silkscreen, monospace'; for (let i = 0; i < n; i += Math.ceil(n / 14)) tl.fillText(String(S[i].week), x(i) - 3, H - 4);
    tl.fillText('H/WK  STRESS  COMFORT  TIES', pad, 9);
    const s = S[sel]; $('#an-week-v').textContent = `wk ${s.week} · ${s.date} · ${s.hoursPerPerson.toFixed(0)} h · stress ${(s.highStressShare * 100).toFixed(0)}% · ties ${s.betweenYearTies}`;
  }
  drawPareto() {
    const cv = $('#an-pareto'); if (!cv) return; const pa = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 22;
    pa.fillStyle = '#fff'; pa.fillRect(0, 0, W, H);
    const px = (v) => pad + (v / 90) * (W - pad - 6), py = (v) => H - 14 - (v / 80) * (H - 22);
    const pts = [[this.A, '#2b2420']]; if (this.B) pts.push([this.B, '#c8502c']);
    for (const [R, col] of pts) { const c4 = R.metrics.C4.value || 0, f1 = R.metrics.F1.value || 0; pa.fillStyle = col; pa.beginPath(); pa.arc(px(c4), py(f1), 3.5, 0, Math.PI * 2); pa.fill(); pa.font = '6px Silkscreen, monospace'; pa.fillText((R === this.A ? 'A ' : 'B ') + R.label.slice(0, 26).toUpperCase(), px(c4) + 6, py(f1) - 4); }
    pa.fillStyle = '#5a4d44'; pa.font = '6px Silkscreen, monospace'; pa.fillText('CONTACT (C4) →', W - 70, H - 4); pa.save(); pa.translate(8, 70); pa.rotate(-Math.PI / 2); pa.fillText('FOCUS (F1) →', 0, 0); pa.restore();
  }
  export(kind) {
    const A = this.A; if (!A) return;
    const rows = CARD_KEYS.filter((k) => A.metrics[k]).map((k) => ({ id: k, name: A.metrics[k].name, A: A.metrics[k].value, B: this.B ? this.B.metrics[k]?.value : null, benchmark: A.metrics[k].benchmark ?? null, unit: A.metrics[k].unit }));
    const text = kind === 'json' ? JSON.stringify({ run: A.label, metrics: rows, suggestions: A.suggestions, snapshots: this.snapshots, counts: A.metrics.counts }, null, 1) : ['id,name,A,B,benchmark,unit', ...rows.map((r) => [r.id, r.name, r.A, r.B, r.benchmark, r.unit].map((v) => `"${v == null ? '' : v}"`).join(','))].join('\n');
    const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `npc-analysis-${A.run.date}.${kind}`; a.click();
  }
}

const DETAILS = {
  activity: { note: 'Where the floor was busy (red) and where it stayed quiet (blue).', what: 'How long each desk and amenity was occupied over the run.', how: 'Agent-minutes per tile; a red blob where a desk or an amenity is in the top half, a blue blob at desks with long quiet occupation.', ids: 'AC9 · ST11 · F1', refs: 'the Schindler-plan convention (warm = activity, cool = retreat)' },
  encounters: { note: 'Where people met face to face; red when the pair came from different years.', what: 'Encounter sites and their counts.', how: 'Bernstein’s rule: two people stationary within 3 m in the same room for 15 s or more, outside crits, lectures and washrooms. Desk neighbours sitting side by side count as co-presence, not an encounter.', ids: 'C4 · C6 · C7 · BH30', refs: 'Bernstein & Turban 2018; Festinger 1950; Kossinets & Watts 2006' },
  paths: { note: 'The routes walked, by year, and the corridor most of them share.', what: 'Walked paths and their overlap.', how: 'Every A* route of the day, thinned, in the walker’s year colour; the dark line runs through the tiles the most routes share. The overlap length per pair is Kabo’s metric (C1).', ids: 'C1 · SP4 · RS1', refs: 'Kabo et al. 2014; Allen 1977; Hillier 1996' },
  queues: { note: 'Minutes waited at the plotters and seconds at the lift.', what: 'Queues.', how: 'The plotters are a two-server queue whose paper runs out outside staffed hours; the lift is under collective control. One tick per minute (plotters) or ten seconds (lift).', ids: 'F8 · RS4 · D10', refs: 'Doshi 1986' },
  noise: { note: 'Sound from talk and the printers; headphones go on in the red.', what: 'Noise exposure.', how: 'Each conversation, crit and printing job adds to the tiles around it inside the room; the field is drawn as soft discs. Quiet occupied desks in blue.', ids: 'F2 · BH16 · PL6 · D16', refs: 'Furnham & Strbac 2002; Mark 2008' },
  years: { note: 'Desks by cohort zone; rings where years met.', what: 'Who sits where, by year, and where the years meet.', how: 'The owner’s cohort zones (program/objects.json) as hatched tints; a ring at each between-year encounter.', ids: 'C6 · OR1 · SO4', refs: 'Sailer & Penn 2009; Kossinets & Watts 2006' },
  drift: { note: 'Objects the agents moved during the run, and the gaps opened for boxed-in desks.', what: 'Layout drift.', how: 'Under AGENTS REARRANGE the agents act on the same signals the suggestion rules test, as they happen: a table to the plotter queue, a board to screen an exposed desk, a table outside a crowded kitchen, a board between the years. Start as a dashed outline, now filled, the displacement as a line; each move is traced in the SUMMARY with its measured effect. Grey dashes: a board or table rolled aside at the start so a boxed-in desk can be reached. Under EVERYDAY USE nothing but chairs moves.', ids: 'SP6 · PL3', refs: 'owner, 2026-11-07 (movement levels) and 2026-11-08 (agents enact the suggestions live)' },
};
