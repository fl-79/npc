import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
const { building, program, P } = loadAll();
const w = new World(building, program, P);
const pop = buildPopulation(program.cohort, P, 2026); w.assignDesks(pop.agents);
const cal = new Calendar(program.calendar);
const term = new TermLayer(w, pop, cal, P, { seed: 2026, ties: initialTies(pop.agents, P).ties });
console.log('lecture rooms', JSON.stringify(term.lectureRoom));
console.log('seminars', Object.entries(term.seminars).map(([k, v]) => `${k}: ${v ? v.day + ' ' + (v.start / 3600) + 'h room ' + v.room : 'none'}`).join(' | '));
const { plans } = term.plansFor('2026-10-14'); // a Wednesday
const items = {}; for (const p of plans.values()) for (const i of p.items) items[i.kind] = (items[i.kind] || 0) + 1;
console.log('Wed items', JSON.stringify(items));
const tue = term.plansFor('2026-10-13').plans; const it2 = {}; for (const p of tue.values()) for (const i of p.items) it2[i.kind] = (it2[i.kind] || 0) + 1; console.log('Tue items', JSON.stringify(it2));
const crits = [...tue.values()].filter((p) => p.crit); console.log('crits', crits.length, 'at desk', crits.filter((p) => p.crit.atDesk).length);
