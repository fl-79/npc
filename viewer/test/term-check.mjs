// Headless check of the term layer: one day's plans, then the whole term's weekly snapshots.
//   node test/term-check.mjs [date]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar, hhmm } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
const { building, program, P } = loadAll();
const w = new World(building, program, P);
const pop = buildPopulation(program.cohort, P, 2026); w.assignDesks(pop.agents);
const cal = new Calendar(program.calendar);
const { ties } = initialTies(pop.agents, P);
const term = new TermLayer(w, pop, cal, P, { seed: 2026, ties });
const date = process.argv[2] || '2026-10-13';
const { info, plans } = term.plansFor(date);
const present = [...plans.values()].filter((p) => p.present);
console.log(date, info.day, 'week', info.week, 'sessions', info.sessions.map((s) => s.years.join('+')).join(' '), '| present', present.length, 'of', plans.size);
const hist = {}; for (const p of present) for (let h = Math.floor(p.arrive / 3600); h < Math.ceil(p.leave / 3600); h++) hist[h] = (hist[h] || 0) + 1;
console.log('headcount by hour', Object.entries(hist).map(([h, n]) => `${h}:${n}`).join(' '));
const kinds = {}; for (const p of present) for (const it of p.items) kinds[it.kind] = (kinds[it.kind] || 0) + 1; for (const p of present) if (p.crit) kinds.crit = (kinds.crit || 0) + 1;
console.log('items', kinds);
const a = pop.agents.find((x) => plans.get(x.id).crit); const pl = plans.get(a.id);
console.log('sample', a.name, 'y' + a.year, 's' + a.section, 'arrive', hhmm(pl.arrive), 'leave', hhmm(pl.leave), 'hours', pl.hours.toFixed(1), 'crit', hhmm(pl.crit.t), pl.crit.minutes.toFixed(0) + 'min', 'items', pl.items.map((i) => `${hhmm(i.t)} ${i.kind}`).join(', '));
const snaps = term.run('2026-09-08', '2026-12-10');
for (const s of snaps) console.log(`wk ${String(s.week).padStart(2)} ${s.date}  h/wk ${s.hoursPerPerson.toFixed(1)}  stress>0.7 ${(s.highStressShare * 100).toFixed(0)}%  comfort ${s.meanComfort.toFixed(2)}  sleepDebt ${s.meanSleepDebt.toFixed(1)}  allNighters ${s.allNighters}  ties ${s.ties} strong ${s.strongTies} between ${s.betweenYearTies}  spend $${s.spend.toFixed(0)}`);
