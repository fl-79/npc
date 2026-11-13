// Probe: who is at an event, in the lounge and on the floor by the hour on a date, with or without a situation.
// From viewer/: node test/_event.mjs [date] [situation] [seed]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
import { DayRun } from '../src/sim/engine.js';

const date = process.argv[2] || '2026-10-23', situation = process.argv[3] || 'none', seed = Number(process.argv[4] || 2026);
const { building, program, P, simParams } = loadAll();
const w = new World(building, program, P);
const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
const cal = new Calendar(program.calendar); const { ties } = initialTies(pop.agents, P);
const term = new TermLayer(w, pop, cal, P, { seed, ties }); term.run(cal.start, date);
const run = new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement: 'everyday', situation: { kind: situation } });
run.running = true;
const lounge = w.lounge, k = w.studio.k;
const rows = [];
let peakEvent = 0, peakLounge = 0;
while (!run.done) {
  run.step(1);
  if (run.time % 600 === 0) {
    const ev = run.agents.filter((x) => x.activity === 'event').length;
    const lg = lounge ? run.agents.filter((x) => x.inside && x.k === k && w.roomAt(x.k, x.c, x.r) === Number(lounge.number)).length : 0;
    if (ev > peakEvent) peakEvent = ev; if (lg > peakLounge) peakLounge = lg;
    if (run.time % 3600 === 0) rows.push(`${String(Math.floor(run.time / 3600) % 24).padStart(2, '0')}:00 floor ${run.summary().floor} event ${ev} lounge ${lg}`);
  }
}
const items = [...run.plans.values()].filter((p) => p.present).flatMap((p) => p.items.filter((i) => i.kind === 'event'));
const stays = items.map((i) => i.minutes).sort((a, b) => a - b);
console.log(date, situation, 'seed', seed, '| event items', items.length, 'stays min/median/max', stays[0], stays[Math.floor(stays.length / 2)], stays[stays.length - 1], 'grab-and-go (<= 20 min)', stays.filter((m) => m <= 20).length, '| peak at the event', peakEvent, 'peak in the lounge', peakLounge, '| event remarks', run.bus.events.filter((e) => e.kind === 'remark' && /event_join|waffle_join/.test(e.topic)).length, 'early leaves after a Friday crit', run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'friday_plans').length);
console.log(rows.filter((r) => /^(1[5-9]|2[0-3]|0[0-2]):00/.test(r)).join('\n'));
