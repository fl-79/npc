// The building as the simulation walks it: one FloorGrid per level, the stairs as portals from a
// level to the next (a stair's tiles on the level it starts from, the tiles over them on the level
// above), and the elevator with a landing tile on every level beside the car. Everything is
// derived from the tiles; where a choice is not in the model (which side of the car the doors
// are on) it is made by rule and said so.
import { FloorGrid, WALK } from './grid.js';
import { findPath } from './path.js';

export class Building {
  /** levels: [{ name, file, L }] from the bottom up (the roof excluded). */
  constructor(levels, params = {}) {
    const stairCost = params.walking?.stair_tile_cost ?? 2.5;
    this.levels = levels.map((l, k) => ({ ...l, k, grid: new FloorGrid(l.L, { stairCost }) }));
    this.portals = [];   // { kind: 'stair', from: { k, c, r }, to: { k, c, r }, dir: +1 | -1, id }
    this.landings = [];  // per level: { k, c, r, carTiles: [i], inferred: true } or null
    this.buildStairs();
    this.buildElevator();
  }

  /** Stair components on each level link to the tiles over them on the level above, both ways. */
  buildStairs() {
    for (const lv of this.levels) {
      const g = lv.grid, up = this.levels[lv.k + 1];
      if (!up) continue;
      const seen = new Uint8Array(g.walk.length);
      for (let i = 0; i < g.walk.length; i++) {
        if (g.walk[i] !== WALK.STAIR || seen[i]) continue;
        const comp = [], stack = [i]; seen[i] = 1;
        while (stack.length) {
          const a = stack.pop(); comp.push(a);
          const [c, r] = g.cr(a);
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const cc = c + dc, rr = r + dr;
            if (g.inb(cc, rr) && g.at(cc, rr) === WALK.STAIR && !seen[g.idx(cc, rr)]) { seen[g.idx(cc, rr)] = 1; stack.push(g.idx(cc, rr)); }
          }
        }
        if (comp.length < 4) continue;
        // the entry on this level: a floor tile beside the component, nearest its centroid
        let cx = 0, cy = 0;
        for (const a of comp) { const [c, r] = g.cr(a); cx += c; cy += r; }
        cx /= comp.length; cy /= comp.length;
        let entry = null, bestD = Infinity;
        for (const a of comp) {
          const [c, r] = g.cr(a);
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const cc = c + dc, rr = r + dr;
            if (g.at(cc, rr) !== WALK.FLOOR) continue;
            const d = (cc - cx) ** 2 + (rr - cy) ** 2;
            if (d < bestD) { bestD = d; entry = [cc, rr]; }
          }
        }
        if (!entry) continue;
        // the arrival on the level above: the walkable tile over the component's far end from the entry, else the nearest floor tile
        const ug = up.grid;
        let far = null, farD = -1;
        for (const a of comp) { const [c, r] = g.cr(a); const d = (c - entry[0]) ** 2 + (r - entry[1]) ** 2; if (d > farD) { farD = d; far = [c, r]; } }
        const [wx, wy] = g.toWorld(far[0], far[1]);
        const [uc, ur] = ug.fromWorld(wx, wy);
        let arrive = ug.nearest(uc, ur, [WALK.FLOOR], 3);
        if (arrive == null) arrive = ug.nearest(uc, ur, [WALK.FLOOR, WALK.STAIR], 6);
        if (arrive == null) continue;
        const [ac, ar] = ug.cr(arrive);
        const id = `stair:${lv.file}:${comp[0]}`;
        this.portals.push({ kind: 'stair', id, dir: 1, from: { k: lv.k, c: entry[0], r: entry[1] }, to: { k: up.k, c: ac, r: ar }, tiles: comp });
        this.portals.push({ kind: 'stair', id: id + ':down', dir: -1, from: { k: up.k, c: ac, r: ar }, to: { k: lv.k, c: entry[0], r: entry[1] }, tiles: comp });
      }
    }
  }

  /** The car's tiles on every level, and a landing beside them: the adjacent walkable tile with the most open neighbours (the door side is not in the model). */
  buildElevator() {
    for (const lv of this.levels) {
      const g = lv.grid, car = g.liftTiles;
      if (!car.length) { this.landings.push(null); continue; }
      let best = null, bestScore = -1;
      for (const a of car) {
        const [c, r] = g.cr(a);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const cc = c + dc, rr = r + dr, w = g.at(cc, rr);
          if (w !== WALK.FLOOR && w !== WALK.STAIR) continue;
          let score = w === WALK.FLOOR ? 10 : 0;
          for (const [ec, er] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g.at(cc + ec, rr + er) === WALK.FLOOR) score += 2; else if (g.at(cc + ec, rr + er) === WALK.STAIR) score += 1;
          if (score > bestScore) { bestScore = score; best = [cc, rr]; }
        }
      }
      this.landings.push(best ? { k: lv.k, c: best[0], r: best[1], carTiles: car, inferred: true } : null);
    }
  }

  levelIndex(file) { const i = this.levels.findIndex((l) => l.file === file); return i < 0 ? null : i; }

  /** The stair portal on level k going in `dir` whose entry is nearest to (c, r) by walking; null if none reachable. */
  nearestStair(k, c, r, dir) {
    const g = this.levels[k].grid;
    let best = null, bestLen = Infinity;
    for (const p of this.portals) {
      if (p.from.k !== k || p.dir !== dir) continue;
      const path = findPath(g, [c, r], [p.from.c, p.from.r]);
      if (path && path.length < bestLen) { bestLen = path.length; best = { portal: p, path }; }
    }
    return best;
  }
}
