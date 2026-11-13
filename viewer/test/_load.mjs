// shared loader for the headless runners: the tiles of every level, the program files, the parameters
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Building } from '../src/sim/building.js';
const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '..', '..');
export const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
export const tileFileOf = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function loadAll() {
  const model = read('exports/model.json');
  const simParams = read('program/simulation.json');
  const levels = model.levels.filter((l) => !/roof/i.test(l.name)).map((l) => ({ name: l.name, file: tileFileOf(l.name), L: read(`exports/tiles/${tileFileOf(l.name)}.json`) }));
  const building = new Building(levels, simParams);
  const program = { rooms: read('program/rooms.json'), objects: read('program/objects.json'), building: read('program/building.json'), cohort: read('program/cohort.json'), calendar: read('program/calendar.json'), affordances: read('program/affordances.json') };
  const P = read('program/parameters.json');
  return { building, program, P, simParams };
}
