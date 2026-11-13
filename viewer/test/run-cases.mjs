// Runs the headless half of program/TEST-CASES.md (cases 1 to 10) and writes what was observed next to
// what the case expects, so the owner can verify a result by rerunning the same command: every run is
// deterministic for its seed. From viewer/:
//   node test/run-cases.mjs            all ten cases
//   node test/run-cases.mjs 2 3        cases 2 and 3 only
// Output: program/test-results/<date>/cases.json and the lines printed here; the markdown report in
// program/TEST-RESULTS-<date>.md is written from cases.json by the same script (--report).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar, hhmm } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
import { DayRun } from '../src/sim/engine.js';
import { computeMetrics } from '../src/sim/metrics.js';
import { runRules } from '../src/sim/rules.js';
import { voiceOf } from '../src/sim/remarks.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();   // local date
const OUT = path.join(ROOT, 'program', 'test-results', TODAY);
const H = 3600, M = 60;

const { building, program, P, simParams } = loadAll();
const cal = new Calendar(program.calendar);

/** A world is rebuilt per case: the layout manager moves pieces and the pocket gaps are opened on construction. */
function fresh(seed) {
  const w = new World(building, program, P);
  const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
  const { ties } = initialTies(pop.agents, P);
  return { w, pop, ties };
}

/** One day, headless, with samples of the summary at the asked times. */
function day({ date, situation = 'none', movement = 'everyday', seed = 2026, policy = {}, sampleAt = [] }) {
  const { w, pop, ties } = fresh(seed);
  const term = new TermLayer(w, pop, cal, P, { seed, ties });
  term.run(cal.start, date);
  const run = new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement, situation: { kind: situation }, policy });
  run.running = true;
  const dt = P.time.tick_s || 1, want = new Map(sampleAt.map((t) => [t, null])), samples = {};
  let ticks = 0;
  while (!run.done) {
    run.step(dt); ticks++;
    for (const [t] of want) if (!samples[t] && run.time >= t) { const s = run.summary(); samples[t] = { ...s, event: run.agents.filter((x) => x.inside && x.activity === 'event').length, lounge: run.agents.filter((x) => x.inside && x.k === w.lounge?.k && w.roomAt(x.k, x.c, x.r) === Number(w.lounge?.number)).length }; }
  }
  const hours = (run.end - 7 * H) / H;
  const m = computeMetrics(w, run.stats, pop.agents, P, hours);
  const sugg = runRules(run, m);
  const kinds = {}; for (const e of run.bus.events) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const hourly = {}; for (const h of run.stats.hourly.filter(Boolean)) hourly[h.h] = { floor: Math.round(h.floor / h.samples), building: Math.round(h.building / h.samples) };
  const lw = run.stats.queues.lift;
  return { w, pop, term, run, m, sugg, kinds, hourly, samples, ticks,
    present: [...run.plans.values()].filter((p) => p.present).length, expected: run.plans.size,
    lift: { boarded: run.lift.stats.boarded, waits: lw.length, meanWait: lw.length ? Math.round(lw.reduce((s, x) => s + x, 0) / lw.length) : 0 },
    plotter: { jobs: run.stats.queues.plotters.length, outages: run.plotter.outages, maxQueue: run.stats.maxPlotQueue ?? null },
    moves: run.layout.moves.map((mv) => ({ t: hhmm(mv.t), trigger: mv.trigger, what: mv.what, effect: mv.effect || '' })),
    vetoes: kinds.move_veto || 0, gaps: w.gaps.map((g) => `${g.kind}@L${g.k}:${g.tiles.length}`) };
}

const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const metricLine = (m) => Object.fromEntries(['C1', 'C3', 'C4', 'C6', 'F1', 'F2', 'F4', 'F8'].map((k) => [k, r2(m[k]?.value)]));
const tags = (sugg) => sugg.map((s) => s.tag);
const liveText = (sugg, tag) => (sugg.find((s) => s.tag === tag)?.text.match(/The agents tried this live[^.]*\.[^.]*\./g) || []);

const CASES = {
  1: {
    title: 'A normal Tuesday (the baseline)',
    run: () => {
      const d = day({ date: '2026-10-13', sampleAt: [13 * H + 45 * M, 14 * H, 19 * H] });
      const remarks = d.run.bus.events.filter((e) => e.kind === 'remark');
      const voices = {}; for (const e of remarks) voices[e.voice || 'even'] = (voices[e.voice || 'even'] || 0) + 1;
      const firstCrit = d.run.bus.events.find((e) => e.kind === 'crit_start');
      const samples = [/^In\.$|^Out\.$/, /^Okay so\./, /Behind already\./, /^[a-z][^A-Z]*$/];
      const found = samples.map((re) => remarks.find((e) => re.test(e.text))?.text || null);
      return {
        expected: '176 expected; floor about 44 at 09:00, 120 at 12:00, 166 at 15:00, about 70 during the 13:45 lecture (building count stays), about 30 at midnight; crits from 13:40; instructors set up at side tables; voices differ; C1 LOW, F2 HIGH, WC TRIPS fire; F1 about 16 min against 11; eleven section intros at 13:30',
        observed: { expected: d.expected, present: d.present, headcount: { '09:00': d.hourly[9], '12:00': d.hourly[12], '14:00 lecture': d.hourly[14], '15:00': d.hourly[15], '20:00': d.hourly[20], '23:00': d.hourly[23], 'midnight': d.hourly[24] },
          firstCrit: firstCrit ? hhmm(firstCrit.t) : null, critSpots: d.kinds.crit_spot || 0, intros: d.kinds.intro || 0, suggestions: tags(d.sugg), metrics: metricLine(d.m), F1deepShare: r2(d.m.F1.deepShare),
          voiceLabels: Object.keys(voices).length, voiceTop: Object.entries(voices).sort((a, b) => b[1] - a[1]).slice(0, 6), voiceSamples: { terse: found[0], chatty: found[1], anxious: found[2], loose: found[3] }, remarks: remarks.length, events: d.run.bus.events.length },
        command: 'node test/run-day.mjs 2026-10-13 none everyday 2026',
      };
    },
  },
  2: {
    title: 'The afternoon before the midterm, the agents rearranging',
    run: () => {
      const d = day({ date: '2026-10-15', movement: 'agents', sampleAt: [17 * H] });
      const paper = d.run.bus.events.filter((e) => e.kind === 'paper_out');
      return {
        expected: 'plot jobs from late morning; the queue reaches 4 or more; paper runs out after 17:00 with people giving up; boards rolled to exposed desks from noon, a side table to the plotter corner around 17:00; four moves is the budget; possibly a veto; F8 QUEUE and F2 HIGH end with "The agents tried this live"',
        observed: { present: d.present, plotJobs: d.plotter.jobs, paperOut: paper.length, firstPaperOut: paper[0] ? hhmm(paper[0].t) : null, plotQueueEvents: d.kinds.plot_queue || 0, queueAt17: d.samples[17 * H]?.plot,
          moves: d.moves, vetoes: d.vetoes, gaps: d.gaps, suggestions: tags(d.sugg), live: { 'F8 QUEUE': liveText(d.sugg, 'F8 QUEUE'), 'F2 HIGH': liveText(d.sugg, 'F2 HIGH') }, metrics: metricLine(d.m) },
        command: 'node test/run-day.mjs 2026-10-15 none agents 2026',
      };
    },
  },
  3: {
    title: 'The same day with paper at all hours (A against B)',
    run: () => {
      const a = day({ date: '2026-10-15', movement: 'agents' });
      const b = day({ date: '2026-10-15', movement: 'agents', policy: { paperAllHours: true } });
      return {
        expected: 'no paper_out events; F8 falls (the wait stays, the giving-up goes); in ANALYSE the cards show A and B',
        observed: { A_paperOut: a.kinds.paper_out || 0, B_paperOut: b.kinds.paper_out || 0, A_F8: r2(a.m.F8.value), B_F8: r2(b.m.F8.value), A_outages: a.plotter.outages, B_outages: b.plotter.outages, A_jobs: a.plotter.jobs, B_jobs: b.plotter.jobs, B_suggestions: tags(b.sugg) },
        command: 'node test/run-cases.mjs 3   (the headless day runner has no policy flag; this script passes policy.paperAllHours = true)',
      };
    },
  },
  4: {
    title: 'FREE rearrangement (the stress test)',
    run: () => {
      const d = day({ date: '2026-10-15', movement: 'free' });
      const g = d.w.levels[d.w.studio.k].grid; const floorTiles = g.walk.filter((x) => x === 1).length;
      const unresolved = d.run.agents.filter((x) => x.inside && x.state === 'walking').length;
      return {
        expected: 'more moves than case 2 (up to twelve), no vetoes; the floor stays walkable: nobody stuck, the lift count does not climb',
        observed: { moves: d.moves.length, movesList: d.moves, vetoes: d.vetoes, mainComponentShare: r2(g.componentSizes[g.main] / floorTiles), stillWalkingAtEnd: unresolved, insideAtEnd: d.run.agents.filter((x) => x.inside).length, lift: d.lift, present: d.present, metrics: metricLine(d.m) },
        command: 'node test/run-day.mjs 2026-10-15 none free 2026',
      };
    },
  },
  5: {
    title: 'Lift out of service',
    run: () => {
      const d = day({ date: '2026-10-13', situation: 'lift' });
      const liftRemarks = d.run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'lift_wait').length;
      return {
        expected: 'the LIFT count stays 0; washroom and lecture trips take the stairs; the lift wait remarks disappear; WC TRIPS still fires',
        observed: { liftBoarded: d.lift.boarded, liftWaits: d.lift.waits, liftWaitRemarks: liftRemarks, washroomTrips: d.run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'washroom_trip').length, suggestions: tags(d.sugg), headcount14: d.hourly[14], present: d.present },
        command: 'node test/run-day.mjs 2026-10-13 lift everyday 2026',
      };
    },
  },
  6: {
    title: 'Fifteen more students',
    run: () => {
      const base = day({ date: '2026-10-13' });
      const d = day({ date: '2026-10-13', situation: 'cohort' });
      const visitors = d.run.pop.agents.filter((a) => /visitor/i.test(a.name)).length;
      return {
        expected: 'Visitor 1 to 15 on hot desks; the kitchen crowds; encounters up, focus down a little',
        observed: { visitors, agentsBaseline: base.run.pop.agents.length, agentsNow: d.run.pop.agents.length, presentBaseline: base.present, presentNow: d.present, kitchenCrowdedRemarks: d.run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'kitchen_crowded').length,
          encounters: { baseline: base.run.stats.encounters, now: d.run.stats.encounters }, C4: { baseline: r2(base.m.C4.value), now: r2(d.m.C4.value) }, F1: { baseline: r2(base.m.F1.value), now: r2(d.m.F1.value) }, F2: { baseline: r2(base.m.F2.value), now: r2(d.m.F2.value) } },
        command: 'node test/run-day.mjs 2026-10-13 cohort everyday 2026',
      };
    },
  },
  7: {
    title: 'Good Times (a Friday)',
    run: () => {
      const d = day({ date: '2026-10-23', situation: 'good_times', sampleAt: [18 * H, 18 * H + 15 * M, 18 * H + 30 * M, 19 * H, 20 * H] });   // the peak is in the first half hour (owner 2026-11-12: people come at the start)
      const ev = d.run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'event_join');
      return {
        expected: 'the lounge fills from 18:00; about 50 to 60 attend by 19:00; between-year conversations rise (C6 above 0.25); the event remarks',
        observed: { atEvent: { '18:00': d.samples[18 * H]?.event, '18:15': d.samples[18 * H + 15 * M]?.event, '18:30': d.samples[18 * H + 30 * M]?.event, '19:00': d.samples[19 * H]?.event, '20:00': d.samples[20 * H]?.event }, inLounge1830: d.samples[18 * H + 30 * M]?.lounge, attendersOverTheEvening: [...d.run.plans.values()].filter((p) => p.present && p.items.some((i) => i.kind === 'event')).length, grabAndGo: [...d.run.plans.values()].filter((p) => p.present && p.items.some((i) => i.kind === 'event' && i.grab)).length, inLounge19: d.samples[19 * H]?.lounge, eventRemarks: ev.length, sampleRemark: ev[0]?.text || null, C6: r2(d.m.C6.value), between: d.run.stats.between, interactions: d.run.stats.interactions, present: d.present },
        command: 'node test/run-day.mjs 2026-10-23 good_times everyday 2026',
      };
    },
  },
  8: {
    title: 'A weekend day before the final',
    run: () => {
      const d = day({ date: '2026-12-05', situation: 'weekend' });
      const arrivals = [...d.run.plans.values()].filter((p) => p.present).map((p) => p.arrive);
      const students = d.run.pop.agents.filter((a) => a.role === 'student').length;
      return {
        expected: 'about 60% present, arrivals from 11:00, no sessions, printing, long evenings, few events',
        observed: { present: d.present, students, presentShare: r2(d.present / students), earliestArrival: arrivals.length ? hhmm(Math.min(...arrivals)) : null, critStarts: d.kinds.crit_start || 0, intros: d.kinds.intro || 0, plotJobs: d.plotter.jobs, headcount: { '12:00': d.hourly[12], '16:00': d.hourly[16], '20:00': d.hourly[20], '23:00': d.hourly[23] }, events: d.run.bus.events.length },
        command: 'node test/run-day.mjs 2026-12-05 weekend everyday 2026',
      };
    },
  },
  9: {
    title: 'The term horizon with five seeds',
    run: () => {
      const keys = ['hoursPerPerson', 'highStressShare', 'meanComfort', 'betweenYearTies'];
      const all = [];
      for (let i = 0; i < 5; i++) { const seed = 2026 + i; const { w, pop, ties } = fresh(seed); const term = new TermLayer(w, pop, cal, P, { seed, ties }); all.push(term.run(cal.start, cal.cal.term.classes_end)); }
      const weeks = all[0].map((s) => s.week);
      const perWeek = weeks.map((wk, i) => { const o = { week: wk, date: all[0][i].date }; for (const k of keys) { const vs = all.map((S) => S[i]?.[k] ?? 0).sort((a, b) => a - b); o[k] = { median: r2(vs[Math.floor(vs.length / 2)]), lo: r2(vs[0]), hi: r2(vs[vs.length - 1]) }; } return o; });
      const stress = perWeek.map((o) => o.highStressShare.median); const top = [...stress.keys()].sort((a, b) => stress[b] - stress[a]).slice(0, 3).map((i) => perWeek[i].week);
      const reviewWeeks = (cal.cal.reviews || []).map((r) => ({ name: r.name || r.kind || '', date: r.date, week: cal.week(r.date) }));
      const normal = perWeek.find((o) => o.week === 3) || perWeek[2];
      return {
        expected: 'the timeline shows hours per week, high-stress share, comfort and between-year ties with a band; stress peaks in the review weeks (6 and 14); a normal week about 42 to 50 hours and 20% high stress (E1, H1)',
        observed: { seeds: 5, weeks: perWeek.length, reviewWeeks, stressPeakWeeks: top, normalWeek: normal, byWeek: perWeek.map((o) => `${o.week}: hours ${o.hoursPerPerson.median} (${o.hoursPerPerson.lo}–${o.hoursPerPerson.hi}), stress ${o.highStressShare.median}, comfort ${o.meanComfort.median}, between ties ${o.betweenYearTies.median}`) },
        command: 'node test/run-cases.mjs 9   (five term layers, seeds 2026 to 2030, as RUN with horizon TERM and seeds 5 does)',
      };
    },
  },
  10: {
    title: 'One agent, two voices',
    run: () => {
      const d = day({ date: '2026-10-13' });
      const remarks = d.run.bus.events.filter((e) => e.kind === 'remark');
      const byAgent = new Map(); for (const e of remarks) { const id = e.agents[0]; if (!byAgent.has(id)) byAgent.set(id, []); byAgent.get(id).push(e); }
      const pickBy = (reg) => [...byAgent.entries()].filter(([id]) => voiceOf(d.pop.agents[id - 1]).primary === reg).sort((a, b) => b[1].length - a[1].length)[0];
      const T = pickBy('terse'), C = pickBy('chatty');
      const show = (pair) => pair ? { name: d.pop.agents[pair[0] - 1].name, voice: voiceOf(d.pop.agents[pair[0] - 1]).label, traits: Object.fromEntries(Object.entries(d.pop.agents[pair[0] - 1].traits).map(([k, v]) => [k, r2(v)])), remarks: pair[1].slice(0, 6).map((e) => `${hhmm(e.t)} ${e.text}`), labelsSeen: [...new Set(pair[1].map((e) => e.voice))] } : null;
      return {
        expected: 'the AGENT window shows the traits bars and the Voice line; two agents of opposite register read differently over the same hour; the label after the name is stable per agent',
        observed: { terse: show(T), chatty: show(C), agentsWithRemarks: byAgent.size, distinctLabels: [...new Set(remarks.map((e) => e.voice))].length },
        command: 'node test/run-cases.mjs 10   (the same day as case 1; in the browser pick the two names in AGENT)',
      };
    },
  },
};

function report(results) {
  const lines = [`# Test results ${TODAY} (headless cases 1 to 10)`, '',
    `Run from \`viewer/\` with \`node test/run-cases.mjs\`; every case is deterministic for seed 2026, so rerunning the command under each case gives the same numbers. The observed block is what the engine reported; the verdict is mine against the expectation in \`program/TEST-CASES.md\`. Raw results: \`program/test-results/${TODAY}/cases.json\`. Cases 11 and 12 (the avatar, OTHER without a key) are browser-only and are reported in the same folder as screenshots.`, ''];
  for (const [n, r] of Object.entries(results)) {
    lines.push(`## ${n}. ${r.title}`, '', `**Expected:** ${r.expected}`, '', `**Command:** \`${r.command}\``, '', `**Observed:**`, '', '```json', JSON.stringify(r.observed, null, 2), '```', '', `**Verdict:** ${r.verdict || 'see the observed block'}`, '');
  }
  return lines.join('\n');
}

const want = process.argv.slice(2).filter((x) => /^\d+$/.test(x)).map(Number);
const list = want.length ? want : Object.keys(CASES).map(Number);
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, 'cases.json');
const results = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const n of list) {
  const c = CASES[n]; if (!c) continue;
  const t0 = Date.now(); process.stdout.write(`case ${n}: ${c.title} … `);
  const r = c.run();
  results[n] = { title: c.title, ...r, seconds: Math.round((Date.now() - t0) / 1000), ranAt: new Date().toISOString() };
  console.log(`${results[n].seconds} s`);
  console.log(JSON.stringify(r.observed, null, 1).slice(0, 1800));
}
fs.writeFileSync(file, JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(ROOT, 'program', `TEST-RESULTS-${TODAY}.md`), report(results));
console.log(`\nwritten ${file} and program/TEST-RESULTS-${TODAY}.md`);
