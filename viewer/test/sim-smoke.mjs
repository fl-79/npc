// Headless run of the first simulation piece: loads the tiles of every level and the parameters,
// runs the agents for a while and prints what the elevator did. Run from viewer/:
//   node test/sim-smoke.mjs [seconds] [agents] [mode]
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Building } from '../src/sim/building.js';
import { Simulation } from '../src/sim/sim.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const tileFileOf = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const model = read('exports/model.json');
const params = read('program/simulation.json');
const levels = model.levels.filter((l) => !/roof/i.test(l.name)).map((l) => ({ name: l.name, file: tileFileOf(l.name), L: read(`exports/tiles/${tileFileOf(l.name)}.json`) }));
const b = new Building(levels, params);
console.log('levels:', b.levels.map((l) => l.name).join(', '));
console.log('stair portals:', b.portals.length, '| landings:', b.landings.map((l) => l ? `${b.levels[l.k].name} (${l.c},${l.r})` : 'none').join('; '));
for (const p of b.portals.filter((p) => p.dir > 0)) console.log(`  stairs ${b.levels[p.from.k].name} (${p.from.c},${p.from.r}) -> ${b.levels[p.to.k].name} (${p.to.c},${p.to.r}), ${p.tiles.length} tiles`);

const seconds = Number(process.argv[2] || 1800), n = Number(process.argv[3] || 12), mode = process.argv[4] || 'auto';
const sim = new Simulation(b, params, { seed: 7, mode });
sim.spawn(n);
const dt = 0.25;
for (let t = 0; t < seconds; t += dt) sim.step(dt);
const s = sim.summary();
console.log('\nafter', seconds, 's with', n, 'agents, mode', mode);
console.log(JSON.stringify(s, null, 1));
console.log('\nlast log lines:');
for (const line of sim.log.slice(-25)) console.log(' ', line);
const ok = s.trips > 0 && s.lift.boarded > 0 && s.lift.alighted > 0 && s.lift.aboard <= (params.elevator.capacity ?? 6);
console.log(ok ? '\nOK: agents travelled, the lift carried people' : '\nFAIL');
process.exit(ok ? 0 : 1);
