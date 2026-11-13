// Probe: who is planned to stay late on a date (late-night rule, item 28). From viewer/: node test/_late.mjs <date> [date…]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
const H = 3600;
const { building, program, P } = loadAll();
for (const date of process.argv.slice(2)) {
  const seed = 2026; const w = new World(building, program, P);
  const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
  const cal = new Calendar(program.calendar); const { ties } = initialTies(pop.agents, P);
  const term = new TermLayer(w, pop, cal, P, { seed, ties }); term.run(cal.start, date);
  const { plans } = term.plansFor(date);
  let n = 0, lw = 0, lwFire = 0, u = []; const at = { '20': 0, '22': 0, '24': 0, '25.5': 0 }, atLW = { '20': 0, '22': 0, '24': 0, '25.5': 0 };
  for (const a of pop.agents) { if (a.role !== 'student') continue; const p = plans.get(a.id); if (!p.present) continue; n++; u.push(p.urgency); if (a.lateWorker) lw++; if (a.lateWorker && p.urgency > 1.3) lwFire++;
    for (const h of Object.keys(at)) if (p.leave > Number(h) * H) { at[h]++; if (a.lateWorker) atLW[h]++; } }
  u.sort((x, y) => x - y); const rev = cal.nextReview(date, 1);
  console.log(date, 'present', n, 'lateWorkers', lw, 'rule fired', lwFire, 'urgencyNorm median', u[Math.floor(u.length / 2)].toFixed(2), 'min', u[0].toFixed(2), 'days to review', rev && rev.days);
  console.log('  still planned in after 20/22/24/01:30:', at, 'of which late workers', atLW);
}
