// Probe (2026-11-13): a run rebuilt from the same settings and played forward reaches the same state as one played straight
// through, also after a rearranging run has moved furniture in the shared world (World.restoreLayout). This is what the
// RUN step's "go to a time" relies on to go back. From viewer/: node test/_rewind.mjs [movement] [hh:mm]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar, secondsOf } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
import { DayRun } from '../src/sim/engine.js';

const movement = process.argv[2] || 'free', at = process.argv[3] || '15:00', date = '2026-10-13', seed = 2026;
const { building, program, P, simParams } = loadAll();
const w = new World(building, program, P);
const cal = new Calendar(program.calendar);
const build = () => {
  w.restoreLayout();
  const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
  const { ties } = initialTies(pop.agents, P);
  const term = new TermLayer(w, pop, cal, P, { seed, ties }); term.run(cal.start, date);
  return new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement, situation: { kind: 'none' } });
};
const fingerprint = (run) => JSON.stringify({ t: run.time, ev: run.bus.events.length, enc: run.stats.encounters, conv: run.stats.interactions, moves: run.layout.moves.length,
  pos: run.agents.map((a) => [a.state, a.activity, a.k, a.c, a.r]).slice(0, 200) });
const T = secondsOf(at);
const go = (run, t) => { while (run.time < t && !run.done) run.step(1); return run; };
const a = go(build(), T); const fa = fingerprint(a);
const late = go(build(), 24 * 3600); const movedLate = late.layout.moves.length;   // a whole day of moves left in the world
const b = go(build(), T); const fb = fingerprint(b);
console.log(`movement ${movement}, at ${at}: straight ${a.bus.events.length} events, ${a.layout.moves.length} moves; a day with ${movedLate} moves in between; rebuilt ${b.bus.events.length} events, ${b.layout.moves.length} moves`);
console.log(fa === fb ? 'SAME state: a rebuilt run reaches the straight run exactly' : 'DIFFERENT state');
process.exit(fa === fb ? 0 : 1);
