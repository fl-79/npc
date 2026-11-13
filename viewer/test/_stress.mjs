// Stress calibration probe: the high-stress share by week and by neuroticism tercile for a few settings. node test/_stress.mjs
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
const { building, program, P } = loadAll();
const cal = new Calendar(program.calendar);
const variants = {
  'base 0.38, review_w 0.03': { base: 0.38, review_w: 0.03 },
  'base 0.38, review_w 0.04': { base: 0.38, review_w: 0.04 },
  'base 0.40, review_w 0.03': { base: 0.40, review_w: 0.03 },
  'base 0.40, review_w 0.04': { base: 0.40, review_w: 0.04 },
};
for (const [name, over] of Object.entries(variants)) {
  const P2 = JSON.parse(JSON.stringify(P)); Object.assign(P2.wellbeing.stress, over);
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const seed = 2026 + i, w = new World(building, program, P2), pop = buildPopulation(program.cohort, P2, seed); w.assignDesks(pop.agents);
    const { ties } = initialTies(pop.agents, P2); const term = new TermLayer(w, pop, cal, P2, { seed, ties });
    const snaps = term.run(cal.start, '2026-12-07');
    const students = pop.agents.filter((a) => a.role === 'student');
    const byWeek = {}; for (const s of snaps) byWeek[s.week] = s.highStressShare;
    // by N tercile at week 3 and week 5: re-run states? use the final-state tercile shares at the end of week 3 and 5 via onDay hook is heavy; approximate with the term's state after the run for the 'now' share
    const N = students.map((a) => a.traits.N).sort((a, b) => a - b); const t1 = N[Math.floor(N.length / 3)], t2 = N[Math.floor(2 * N.length / 3)];
    const high = (f) => { const S = students.filter(f); return S.filter((a) => term.state.get(a.id).stress > P2.wellbeing.stress.high).length / S.length; };
    rows.push({ seed, w3: byWeek[3], w5: byWeek[5], w6: byWeek[6], w12: byWeek[12], endLowN: high((a) => a.traits.N <= t1), endMidN: high((a) => a.traits.N > t1 && a.traits.N <= t2), endHighN: high((a) => a.traits.N > t2) });
  }
  const m = (k) => (rows.reduce((s, r) => s + (r[k] || 0), 0) / rows.length).toFixed(2);
  console.log(`${name.padEnd(34)} normal wk3 ${m('w3')}  pre-review wk5 ${m('w5')}  review wk6 ${m('w6')}  wk12 ${m('w12')}  | end of term by N tercile low ${m('endLowN')} mid ${m('endMidN')} high ${m('endHighN')}`);
}
