// Headless day run: the term layer to the picked date, then the day on the grid, then the metrics,
// the suggestions and a sample of the feed. From viewer/:
//   node test/run-day.mjs [date] [situation] [movement] [seed]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar, hhmm } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
import { DayRun } from '../src/sim/engine.js';
import { computeMetrics } from '../src/sim/metrics.js';
import { runRules } from '../src/sim/rules.js';
import { EventBus } from '../src/sim/events.js';

const date = process.argv[2] || '2026-10-13', situation = process.argv[3] || 'none', movement = process.argv[4] || 'everyday', seed = Number(process.argv[5] || 2026);
const t0 = Date.now();
const { building, program, P, simParams } = loadAll();
const w = new World(building, program, P);
const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
const cal = new Calendar(program.calendar);
const { ties } = initialTies(pop.agents, P);
const term = new TermLayer(w, pop, cal, P, { seed, ties });
term.run(cal.start, date);                       // the slow state as of that morning
const run = new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement, situation: { kind: situation } });
run.running = true;
const dt = P.time.tick_s || 1;
let ticks = 0;
while (!run.done) { run.step(dt); ticks++; if (ticks % 3600 === 0) { const s = run.summary(); process.stdout.write(`${s.time} floor ${s.floor} building ${s.building} crit ${s.crit} plot ${s.plot} lift ${s.lift} | events ${run.bus.events.length}\n`); } }
const hours = (run.end - 7 * 3600) / 3600;
const m = computeMetrics(w, run.stats, pop.agents, P, hours);
console.log(`\nrun of ${date} (${situation}, ${movement}, seed ${seed}) in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${ticks} ticks, ${run.bus.events.length} events`);
for (const k of ['C1', 'C3', 'C4', 'C6', 'C7', 'F1', 'F2', 'F4', 'F8']) { const x = m[k]; console.log(`  ${k.padEnd(4)} ${x.name.padEnd(28)} ${x.value == null ? '—' : x.value.toFixed(2).padStart(8)}  ${x.unit}${x.benchmark != null ? `  (benchmark ${x.benchmark})` : ''}`); }
console.log('  counts', m.counts, 'C7 parts', m.C7.parts);
const kinds = {}; for (const e of run.bus.events) kinds[e.kind] = (kinds[e.kind] || 0) + 1; console.log('  events by kind', kinds);
console.log('  layout', { moves: run.layout.moves.map((mv) => `${hhmm(mv.t)} ${mv.trigger}: ${mv.what} [${mv.effect || ''}]`), vetoes: run.bus.events.filter((e) => e.kind === 'move_veto').length, gaps: w.gaps.length, situation: run.situation.title || run.situation.kind, applied: run.situation.applied });
const sugg = runRules(run, m);
console.log('\nsuggestions:'); for (const s of sugg) console.log(`  [${s.tag}] ${s.metric}\n    ${s.text}\n    evidence: ${s.events.length} events, ${s.remarks.length} remarks, spots ${s.spots.length}`);
console.log('\nfeed sample:');
const names = run.names;
for (const e of run.bus.events.filter((e) => e.kind === 'remark').filter((_, i) => i % Math.max(1, Math.floor(run.stats.remarks / 14)) === 0).slice(0, 14)) console.log(`  ${hhmm(e.t)} ${names.get(e.agents[0])} @ ${e.place}: "${e.text}"  — because ${e.because}`);
const L = run.lift, lw = run.stats.queues.lift; console.log('\nlift', { stops: L.stats.stops, boarded: L.stats.boarded, pickups: L.stats.pickupsOnTheWay, floors: Math.round(L.stats.floorsTravelled), waits: lw.length, meanWait: Math.round(lw.reduce((s, x) => s + x, 0) / Math.max(1, lw.length)), maxWait: Math.round(Math.max(0, ...lw)) }, 'plotter', { jobs: run.stats.queues.plotters.length, paper: run.plotter.paper, outages: run.plotter.outages });
const blocks = []; let nInt = 0; for (const f of run.stats.focus.values()) { blocks.push(...f.blocks); nInt += f.interruptions; } blocks.sort((a, b) => a - b); const q = (p) => blocks.length ? Math.round(blocks[Math.floor(p * (blocks.length - 1))] / 60) : 0;
console.log('focus blocks', blocks.length, 'per person', (blocks.length / Math.max(1, run.stats.focus.size)).toFixed(1), 'min p10/50/90', q(0.1), q(0.5), q(0.9), 'interruptions', nInt);
console.log('\nhourly headcount (floor/building):', run.stats.hourly.filter(Boolean).map((h) => `${h.h}:${Math.round(h.floor / h.samples)}/${Math.round(h.building / h.samples)}`).join(' '));
