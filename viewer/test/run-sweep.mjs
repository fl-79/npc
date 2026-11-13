// A broader headless sweep than the twelve test cases: several seeds and dates under every movement
// level, every listed situation on its day, the two policies, a determinism check and the term for
// five seeds, each run checked against engine invariants (nothing thrown, nobody stuck, the floor
// connected, metrics finite and in range, the move budget kept, the lift sane) and against what the
// situation is meant to do. From viewer/:
//   node test/run-sweep.mjs            everything (about ten minutes)
//   node test/run-sweep.mjs quick      three seeds on one date, the situations, the determinism check
// Output: program/test-results/<date>/sweep.json and program/TEST-SWEEP-<date>.md
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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const d0 = new Date(); const TODAY = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
const OUT = path.join(ROOT, 'program', 'test-results', TODAY);
const H = 3600, M = 60;
const QUICK = process.argv.includes('quick');

const { building, program, P, simParams } = loadAll();
const cal = new Calendar(program.calendar);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

function fresh(seed) {
  const w = new World(building, program, P);
  const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
  const { ties } = initialTies(pop.agents, P);
  return { w, pop, ties };
}

/** One day with the invariants checked. Returns the summary and the list of failed checks. */
function day({ date, situation = 'none', movement = 'everyday', seed = 2026, policy = {}, label }) {
  const fails = [], note = (ok, what) => { if (!ok) fails.push(what); };
  const out = { label: label || `${date} ${situation} ${movement} s${seed}`, date, situation, movement, seed, policy };
  try {
    const { w, pop, ties } = fresh(seed);
    const term = new TermLayer(w, pop, cal, P, { seed, ties });
    term.run(cal.start, date);
    const run = new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement, situation: { kind: situation }, policy });
    run.running = true;
    const g = w.levels[w.studio.k].grid, floorStart = g.componentSizes[g.main];
    const last = new Map(); let stuck = 0, ticks = 0; const samples = {};
    const sampleAt = [9.5 * H, 14.5 * H, 19 * H];
    while (!run.done && ticks < 90000) {
      run.step(1); ticks++;
      if (ticks % 60 === 0) for (const ag of run.agents) { if (!ag.inside || ag.state !== 'walking') { last.delete(ag.a.id); continue; } const key = `${ag.k}:${ag.c}:${ag.r}`; const rec = last.get(ag.a.id); if (rec && rec.key === key) { rec.n++; if (rec.n === 10) stuck++; } else last.set(ag.a.id, { key, n: 1 }); }
      for (const t of sampleAt) if (!samples[t] && run.time >= t) { const s = run.summary(); samples[t] = { floor: s.floor, building: s.building, crit: s.crit, event: run.agents.filter((x) => x.inside && x.activity === 'event').length, review: run.agents.filter((x) => x.inside && (x.activity === 'review' || x.activity === 'pinup')).length }; note(s.floor <= s.building, `floor ${s.floor} > building ${s.building} at ${s.time}`); }
    }
    note(run.done, 'the run did not finish in 90000 ticks');
    const hours = (run.end - 7 * H) / H;
    const m = computeMetrics(w, run.stats, pop.agents, P, hours);
    const sugg = runRules(run, m);
    const kinds = {}; for (const e of run.bus.events) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
    let mono = true; for (let i = 1; i < run.bus.events.length; i++) if (run.bus.events[i].t < run.bus.events[i - 1].t) { mono = false; break; }
    note(mono, 'events out of time order');
    const remarks = run.bus.events.filter((e) => e.kind === 'remark');
    note(remarks.every((e) => e.text && e.voice), 'a remark without text or voice');
    for (const k of ['C1', 'C3', 'C4', 'C6', 'F1', 'F2', 'F4', 'F8']) note(Number.isFinite(m[k].value), `${k} not finite`);
    note(m.F1.value >= 3 && m.F1.value <= 60, `F1 ${r2(m.F1.value)} out of 3..60`);
    note(m.F2.value >= 0 && m.F2.value <= 6, `F2 ${r2(m.F2.value)} out of 0..6`);
    note(m.C6.value >= 0 && m.C6.value <= 1, `C6 ${r2(m.C6.value)} out of 0..1`);
    note(m.F4.value >= 0 && m.F4.value <= 60, `F4 ${r2(m.F4.value)} out of 0..60`);
    const budget = { everyday: 0, agents: P.layout.manager.budget_per_day.agents, free: P.layout.manager.budget_per_day.free }[movement];
    note(run.layout.moves.length <= budget, `${run.layout.moves.length} moves over the budget ${budget}`);
    note(g.componentSizes[g.main] >= 0.98 * floorStart, `main component ${g.componentSizes[g.main]} under 98% of ${floorStart}`);
    note(w.studioDesks.every((d) => !d.owner || d.stand), 'an owned desk without a standing tile');
    const lw = run.stats.queues.lift, meanWait = lw.length ? lw.reduce((s, x) => s + x, 0) / lw.length : 0, maxWait = lw.length ? Math.max(...lw) : 0;
    note(meanWait < 180, `lift mean wait ${Math.round(meanWait)} s`); note(maxWait < 1200, `lift max wait ${Math.round(maxWait)} s`);
    note(stuck === 0, `${stuck} agents stood still while walking for 10 minutes`);
    const insideAtEnd = run.agents.filter((x) => x.inside).length; note(insideAtEnd <= 45, `${insideAtEnd} still inside at the end`);   // the run ends at 02:00; those inside then are the ones who stay past it (deadline days, all-nighters)
    const present = [...run.plans.values()].filter((p) => p.present).length;
    const info = cal.info(date), students = pop.agents.filter((a) => a.role === 'student').length;
    const sessionYears = [1, 2, 3].filter((y) => cal.sessionFor(date, y));
    // a review day has no section intro
    if (sessionYears.length && situation === 'none' && !info.review) { const sections = pop.agents.filter((a) => a.role === 'instructor' && sessionYears.includes(a.year)).length; note((kinds.intro || 0) === sections, `${kinds.intro || 0} intros for ${sections} sections in session`); }
    if (!info.weekend && situation === 'none') note((kinds.remark || 0) > 200, 'few remarks on a weekday');
    Object.assign(out, { present, students, agents: pop.agents.length, events: run.bus.events.length, remarks: remarks.length, kinds: { intro: kinds.intro || 0, crit_start: kinds.crit_start || 0, plot_queue: kinds.plot_queue || 0, paper_out: kinds.paper_out || 0, desk_move: kinds.desk_move || 0, move_veto: kinds.move_veto || 0, conversation: kinds.conversation || 0 },
      samples: Object.fromEntries(Object.entries(samples).map(([t, s]) => [hhmm(Number(t)), s])), metrics: Object.fromEntries(['C1', 'C3', 'C4', 'C6', 'F1', 'F2', 'F4', 'F8'].map((k) => [k, r2(m[k].value)])), suggestions: sugg.map((s) => s.tag),
      moves: run.layout.moves.map((mv) => `${hhmm(mv.t)} ${mv.trigger}`), lift: { boarded: run.lift.stats.boarded, meanWait: Math.round(meanWait), maxWait: Math.round(maxWait) }, plotter: { jobs: run.stats.queues.plotters.length, outages: run.plotter.outages }, stuck, insideAtEnd, ticks,
      leaveMean: hhmm([...run.plans.values()].filter((p) => p.present).reduce((s, p) => s + p.leave, 0) / Math.max(1, present)), leaveMeanS: [...run.plans.values()].filter((p) => p.present).reduce((s, p) => s + p.leave, 0) / Math.max(1, present), arriveMin: hhmm(Math.min(...[...run.plans.values()].filter((p) => p.present).map((p) => p.arrive))), situationTitle: run.situation.title || run.situation.kind, run });
  } catch (e) { fails.push(`threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  out.fails = fails; out.ok = fails.length === 0;
  const { run, ...rest } = out; out.rest = rest; // keep the run for the situation checks, strip before saving
  return out;
}

const results = { ranAt: new Date().toISOString(), grid: [], situations: [], policies: [], determinism: null, term: null, failures: [] };
const push = (list, r) => { const { run, rest, ...save } = r; list.push(save); console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.label}  present ${r.present} events ${r.events} F1 ${r.metrics?.F1} F2 ${r.metrics?.F2} moves ${r.moves?.length}${r.fails.length ? '  -> ' + r.fails.join('; ') : ''}`); if (!r.ok) results.failures.push({ label: r.label, fails: r.fails }); return r; };

// 1. the grid: seeds x dates x movement
const seeds = QUICK ? [2026, 2027, 2028] : [2026, 2027, 2028];
const dates = QUICK ? ['2026-10-13'] : ['2026-10-13', '2026-10-15', '2026-10-16', '2026-11-02', '2026-11-13', '2026-12-05'];
console.log('\n== grid'); const base = {};
for (const seed of seeds) for (const date of dates) { const r = push(results.grid, day({ date, seed })); base[`${date}:${seed}`] = r; }
if (!QUICK) for (const seed of seeds) for (const movement of ['agents', 'free']) push(results.grid, day({ date: '2026-10-15', seed, movement }));

// 2. every listed situation on its day, with its intended effect checked against the plain day
console.log('\n== situations');
const SIT = { review: '2026-10-16', pinup: '2026-10-09', lastcrit: '2026-10-13', good_times: '2026-10-20', waffle: '2026-10-15', deadline: '2026-10-19', paper: '2026-10-15', lift: '2026-10-13', cohort: '2026-10-13', clash: '2026-10-30', weekend: '2026-10-13' };
for (const [kind, date] of Object.entries(SIT)) {
  const plain = base[`${date}:2026`] || day({ date, seed: 2026, label: `${date} none (reference)` });
  const r = day({ date, situation: kind, seed: 2026 });
  const s = r.samples || {}, ps = plain.samples || {};
  if (kind === 'review') { r.fails.push(...(r.present >= 0.9 * r.students ? [] : [`review: only ${r.present} of ${r.students} students present`])); r.fails.push(...((s['14:30']?.review || 0) > 20 ? [] : ['review: few in review at 14:30'])); }
  if (kind === 'pinup') r.fails.push(...((s['14:30']?.review || 0) > 10 ? [] : ['pinup: few at the pin-up at 14:30']));
  if (kind === 'lastcrit') r.fails.push(...((r.kinds.crit_start || 0) >= (plain.kinds?.crit_start || 0) ? [] : ['lastcrit: fewer crits than the plain day']));
  if (kind === 'good_times') r.fails.push(...((s['19:00']?.event || 0) >= 10 ? [] : [`good_times: ${s['19:00']?.event} at the event at 19:00`]));   // on a day without the event (the situation adds nothing on a Friday that has it; grab-and-go stays, 2026-11-12)
  if (kind === 'waffle') r.fails.push(...((s['09:30']?.event || 0) >= 5 ? [] : [`waffle: ${s['09:30']?.event} at the event at 09:30`]));   // on a Thursday, which has no waffles
  if (kind === 'deadline' || kind === 'clash') r.fails.push(...(r.leaveMeanS > plain.leaveMeanS ? [] : [`${kind}: mean leave ${r.leaveMean} not later than ${plain.leaveMean}`]));
  if (kind === 'paper') { const first = r.run?.bus.events.find((e) => e.kind === 'paper_out'); r.fails.push(...(first ? [] : ['paper: no paper_out event'])); r.effect += `; first paper_out ${first ? hhmm(first.t) : 'none'} (the stock runs out on this day anyway; the situation sets 18:00)`; }
  if (kind === 'lift') r.fails.push(...(r.lift?.boarded === 0 ? [] : [`lift: ${r.lift?.boarded} boarded`]));
  if (kind === 'cohort') r.fails.push(...(r.agents === plain.agents + 15 ? [] : [`cohort: ${r.agents} agents, expected ${plain.agents + 15}`]));
  if (kind === 'weekend') r.fails.push(...(r.present < plain.present && r.arriveMin >= '10:00' ? [] : [`weekend on a weekday: present ${r.present} vs ${plain.present}, first arrival ${r.arriveMin}`]));
  r.ok = r.fails.length === 0; r.effect = r.situationTitle; push(results.situations, r);
}

// 3. the policies
console.log('\n== policies');
{ const a = base['2026-10-15:2026'] || day({ date: '2026-10-15', seed: 2026 }); const b = day({ date: '2026-10-15', seed: 2026, policy: { paperAllHours: true }, label: '2026-10-15 paper at all hours' }); b.fails.push(...(b.plotter.outages === 0 ? [] : [`${b.plotter.outages} outages with paper at all hours`])); b.ok = b.fails.length === 0; push(results.policies, b);
  const c = day({ date: '2026-10-13', seed: 2026, policy: { shopOpen: false }, label: '2026-10-13 shop closed' }); const shopRemarks = c.run ? c.run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'shop').length : -1; c.fails.push(...(shopRemarks === 0 ? [] : [`${shopRemarks} shop remarks with the shop closed`])); c.ok = c.fails.length === 0; push(results.policies, c); }

// 4. determinism: the same seed twice in this process, and against the stored case 2
console.log('\n== determinism');
{ const a = day({ date: '2026-10-15', seed: 2026, movement: 'agents', label: 'determinism run A' }); const b = day({ date: '2026-10-15', seed: 2026, movement: 'agents', label: 'determinism run B' });
  const same = a.events === b.events && a.remarks === b.remarks && JSON.stringify(a.moves) === JSON.stringify(b.moves) && JSON.stringify(a.metrics) === JSON.stringify(b.metrics);
  results.determinism = { same, a: { events: a.events, remarks: a.remarks, moves: a.moves, metrics: a.metrics }, b: { events: b.events, remarks: b.remarks, moves: b.moves, metrics: b.metrics } };
  console.log(same ? 'ok   two runs of one seed are identical' : 'FAIL two runs of one seed differ'); if (!same) results.failures.push({ label: 'determinism', fails: ['two runs of one seed differ'] }); }

// 5. the term for five seeds, with its invariants
console.log('\n== term');
{ const rows = [], fails = [];
  for (let i = 0; i < 5; i++) { const seed = 2026 + i; const { w, pop, ties } = fresh(seed); const term = new TermLayer(w, pop, cal, P, { seed, ties }); const snaps = term.run(cal.start, cal.cal.term.classes_end);
    for (const s of snaps) { for (const k of ['hoursPerPerson', 'highStressShare', 'meanComfort', 'betweenYearTies']) if (!Number.isFinite(s[k])) fails.push(`seed ${seed} week ${s.week}: ${k} not finite`); if (s.hoursPerPerson < 0 || s.hoursPerPerson > 90) fails.push(`seed ${seed} week ${s.week}: hours ${r2(s.hoursPerPerson)}`); if (s.highStressShare < 0 || s.highStressShare > 1) fails.push(`seed ${seed} week ${s.week}: stress share ${s.highStressShare}`); }
    const wk = (n) => snaps.find((s) => s.week === n); rows.push({ seed, normal: r2(wk(3)?.highStressShare), preMid: r2(wk(5)?.highStressShare), preFinal: r2(wk(13)?.highStressShare), hoursNormal: r2(wk(3)?.hoursPerPerson), hoursPreMid: r2(wk(5)?.hoursPerPerson), allNighters: snaps[snaps.length - 1]?.allNighters }); }
  const mean = (k) => r2(rows.reduce((s, r) => s + (r[k] || 0), 0) / rows.length);
  const t = P.wellbeing.stress; if (Math.abs(mean('normal') - t.target_normal_share) > 0.08) fails.push(`normal-week high-stress share ${mean('normal')} against ${t.target_normal_share}`); if (Math.abs(mean('preMid') - t.target_review_share) > 0.1) fails.push(`pre-review share ${mean('preMid')} against ${t.target_review_share}`);
  results.term = { rows, means: { normal: mean('normal'), preMid: mean('preMid'), preFinal: mean('preFinal'), hoursNormal: mean('hoursNormal'), hoursPreMid: mean('hoursPreMid') }, fails }; console.log(`${fails.length ? 'FAIL' : 'ok  '} term: high stress normal ${mean('normal')} pre-midterm ${mean('preMid')} pre-final ${mean('preFinal')}; hours ${mean('hoursNormal')} / ${mean('hoursPreMid')}${fails.length ? ' -> ' + fails.join('; ') : ''}`); if (fails.length) results.failures.push({ label: 'term', fails }); }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify(results, null, 2));
const L = [`# Sweep ${TODAY}`, '', `Run with \`node test/run-sweep.mjs\` from \`viewer/\` (${QUICK ? 'quick' : 'full'}). Every run is checked against the engine invariants (nothing thrown, nobody standing still while walking for ten minutes, the studio floor connected, metrics finite and in range, the move budget kept, the lift sane, the intros matching the sections in session) and each situation against its intended effect. Raw: \`program/test-results/${TODAY}/sweep.json\`.`, '', `**Failures: ${results.failures.length}**`, ''];
for (const f of results.failures) L.push(`- ${f.label}: ${f.fails.join('; ')}`);
L.push('', '## The grid', '', '| Run | Present | Events | Floor 09:30 / 14:30 / 19:00 | F1 | F2 | C6 | F4 | Moves | Lift wait mean / max | Checks |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of results.grid) L.push(`| ${r.label} | ${r.present} | ${r.events} | ${r.samples?.['09:30']?.floor} / ${r.samples?.['14:30']?.floor} / ${r.samples?.['19:00']?.floor} | ${r.metrics?.F1} | ${r.metrics?.F2} | ${r.metrics?.C6} | ${r.metrics?.F4} | ${r.moves?.length} | ${r.lift?.meanWait} / ${r.lift?.maxWait} s | ${r.ok ? 'ok' : r.fails.join('; ')} |`);
L.push('', '## The situations (seed 2026, each on its day)', '', '| Situation | Day | Present | Effect seen | Checks |', '|---|---|---|---|---|');
for (const r of results.situations) L.push(`| ${r.situation} | ${r.date} | ${r.present} | ${r.effect}; crits ${r.kinds?.crit_start}, paper out ${r.kinds?.paper_out}, lift boarded ${r.lift?.boarded}, at the event 19:00 ${r.samples?.['19:00']?.event}, mean leave ${r.leaveMean} | ${r.ok ? 'ok' : r.fails.join('; ')} |`);
L.push('', '## The policies', '', '| Run | Plot jobs | Outages | F8 | Checks |', '|---|---|---|---|---|');
for (const r of results.policies) L.push(`| ${r.label} | ${r.plotter?.jobs} | ${r.plotter?.outages} | ${r.metrics?.F8} | ${r.ok ? 'ok' : r.fails.join('; ')} |`);
L.push('', '## Determinism', '', results.determinism.same ? 'Two runs of the same seed in one process are identical in events, remarks, moves and metrics.' : 'FAIL: two runs of the same seed differ: ' + JSON.stringify(results.determinism));
L.push('', '## The term, five seeds', '', '| Seed | High stress: normal wk 3 | pre-midterm wk 5 | pre-final wk 13 | Hours wk 3 | Hours wk 5 | All-nighters |', '|---|---|---|---|---|---|---|');
for (const r of results.term.rows) L.push(`| ${r.seed} | ${r.normal} | ${r.preMid} | ${r.preFinal} | ${r.hoursNormal} | ${r.hoursPreMid} | ${r.allNighters} |`);
L.push('', `Means: normal ${results.term.means.normal} (target ${P.wellbeing.stress.target_normal_share}), pre-midterm ${results.term.means.preMid} (target ${P.wellbeing.stress.target_review_share}), pre-final ${results.term.means.preFinal}.`, results.term.fails.length ? 'Checks: ' + results.term.fails.join('; ') : 'Checks: ok', '');
fs.writeFileSync(path.join(ROOT, 'program', `TEST-SWEEP-${TODAY}.md`), L.join('\n'));
console.log(`\nwritten program/test-results/${TODAY}/sweep.json and program/TEST-SWEEP-${TODAY}.md; failures: ${results.failures.length}`);
