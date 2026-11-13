// Probe: why the layout manager's table moves (plotter corner, kitchen overflow) do or do not fire on a date.
// From viewer/: node test/_layout.mjs [date] [seed]
import { loadAll } from './_load.mjs';
import { World } from '../src/sim/world.js';
import { buildPopulation, initialTies } from '../src/sim/population.js';
import { Calendar } from '../src/sim/calendar.js';
import { TermLayer } from '../src/sim/term.js';
import { DayRun } from '../src/sim/engine.js';

const date = process.argv[2] || '2026-10-13', seed = Number(process.argv[3] || 2026);
const { building, program, P, simParams } = loadAll();
const w = new World(building, program, P);
const pop = buildPopulation(program.cohort, P, seed); w.assignDesks(pop.agents);
const cal = new Calendar(program.calendar); const { ties } = initialTies(pop.agents, P);
const term = new TermLayer(w, pop, cal, P, { seed, ties }); term.run(cal.start, date);
const run = new DayRun(w, pop, term, cal, P, simParams, { date, seed, movement: 'agents', situation: { kind: 'none' } });
run.running = true;
let maxKitchen = 0, maxQueue = 0, peaks = 0;
const k = w.kitchen;
while (!run.done) {
  run.step(1);
  if (run.time % 60 === 0) {
    const n = k ? run.agents.filter((x) => x.inside && x.k === k.k && w.roomAt(x.k, x.c, x.r) === Number(k.number)).length : -1;
    if (n > maxKitchen) maxKitchen = n; if (n >= 6) peaks++;
    if (run.plotter.queue.length > maxQueue) maxQueue = run.plotter.queue.length;
  }
}
const L = run.layoutMgr;
console.log('date', date, 'moves', L.moves.map((m) => `${m.t / 3600} ${m.trigger}`), 'kitchenPeaks seen by the manager', L.kitchenPeaks, 'max in kitchen (minute samples)', maxKitchen, 'minutes with 6+', peaks, 'max plotter queue', maxQueue);
console.log('manager params', { check_every_min: L.P.check_every_min, max_move_tiles: L.P.max_move_tiles, triggers: L.P.triggers, cap: L.P.per_trigger_cap });
const tables = L.pieces.filter((p) => p.kind === 'table');
console.log('movable pieces by kind', L.pieces.reduce((o, p) => (o[p.kind] = (o[p.kind] || 0) + 1, o), {}), 'studio level', w.studio && w.studio.k);
if (k) {
  const g = w.levels[k.k].grid; let cx = 0, cy = 0; for (const i of k.tiles) { const [c, r] = g.cr(i); cx += c; cy += r; } cx /= k.tiles.length; cy /= k.tiles.length;
  console.log('kitchen', { number: k.number, k: k.k, tiles: k.tiles.length, centroid: [cx.toFixed(1), cy.toFixed(1)] }, 'lounge floor tiles', w.loungeFloor.length);
  console.log('tables by distance to the kitchen centroid (max allowed', L.P.max_move_tiles * 2, '):');
  for (const p of tables.map((p) => ({ id: p.id, k: p.k, c: ((p.c0 + p.c1) / 2).toFixed(1), r: ((p.r0 + p.r1) / 2).toFixed(1), gapped: !!p.gapped, d: Math.hypot((p.c0 + p.c1) / 2 - cx, (p.r0 + p.r1) / 2 - cy) })).sort((a, b) => a.d - b.d).slice(0, 6)) console.log('  ', p);
  const piece = L.nearestPiece('table', [Math.round(cx), Math.round(cy)], L.P.max_move_tiles * 2);
  const target = w.loungeFloor.map((i) => g.cr(i)).sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy))[0];
  console.log('kitchen: nearest table', piece && piece.id, 'target', target, 'spot', piece && target ? L.findSpot(piece, target, 0, 4) : null);
}
const plot = w.plotters[0];
if (plot) {
  console.log('plotter stand', plot.stand, 'k', plot.k);
  for (const p of tables.map((p) => ({ id: p.id, k: p.k, c: ((p.c0 + p.c1) / 2).toFixed(1), r: ((p.r0 + p.r1) / 2).toFixed(1), gapped: !!p.gapped, d: Math.hypot((p.c0 + p.c1) / 2 - plot.stand[0], (p.r0 + p.r1) / 2 - plot.stand[1]) })).sort((a, b) => a.d - b.d).slice(0, 4)) console.log('  ', p);
  const piece = L.nearestPiece('table', plot.stand, L.P.max_move_tiles);
  console.log('queue: nearest table', piece && piece.id, 'spot', piece ? L.findSpot(piece, plot.stand, 2, 6) : null, 'spot with wider ring', piece ? L.findSpot(piece, plot.stand, 2, 10) : null);
}
