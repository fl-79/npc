// One floor as a walkable grid, from the rasterised tiles (exports/tiles/<level>.json): open floor
// and doors are walkable, stair tiles are walkable but slow, the elevator car's tiles are transit,
// furniture and the owner's no-go areas are not walkable. Coordinates: tile (c, r) with row 0 the
// north edge, and model metres (x east, y north) through the tile file's origin.
export const WALK = { NO: 0, FLOOR: 1, STAIR: 2, LIFT: 3 };
// chairs and bins do not block: people push past a chair (it is movable in use), so a bay stays connected to the floor
const SKIP_KINDS = new Set(['lamp', 'perimeter', 'chair', 'bin']);

export class FloorGrid {
  constructor(L, { stairCost = 2.5 } = {}) {
    this.L = L;
    this.cols = L.cols; this.rows = L.rows; this.tm = L.tile_m;
    this.x0 = L.origin[0]; this.y0 = L.origin[1];
    this.stairCost = stairCost;
    const n = this.cols * this.rows;
    this.walk = new Uint8Array(n);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const f = L.floor[r][c], s = L.struct[r][c], i = r * this.cols + c;
      if (f >= 1 && (s === 0 || s === 4)) this.walk[i] = WALK.FLOOR;
      else if (s === 5) this.walk[i] = WALK.STAIR;
    }
    this.liftTiles = [];
    for (const f of L.furniture || []) {
      if (SKIP_KINDS.has(f.kind)) continue;
      for (let r = Math.max(0, f.r0); r <= Math.min(this.rows - 1, f.r1); r++) for (let c = Math.max(0, f.c0); c <= Math.min(this.cols - 1, f.c1); c++) {
        const i = r * this.cols + c;
        if (f.transit) { this.walk[i] = WALK.LIFT; this.liftTiles.push(i); }
        else if (this.walk[i] !== WALK.LIFT) this.walk[i] = WALK.NO;
      }
    }
    for (const [c, r] of L.no_go || []) if (this.inb(c, r)) this.walk[r * this.cols + c] = WALK.NO;
    this.labelComponents();
  }
  /** A copy with its own walk and component arrays: a World mutates its grids (seat tiles, gaps, moved pieces), so every
   *  World takes a clone of the building's grids and two runs in one page or process cannot contaminate each other (2026-11-11). */
  clone() {
    const g = Object.create(FloorGrid.prototype); Object.assign(g, this);
    g.walk = this.walk.slice(); g.comp = this.comp.slice(); g.componentSizes = [...(this.componentSizes || [])]; g.liftTiles = [...this.liftTiles];
    return g;
  }
  /** Connected pieces of the passable tiles (eight-way); `main` is the largest, the floor proper, where agents spawn and go. */
  labelComponents() {
    const n = this.walk.length;
    this.comp = new Int32Array(n).fill(-1);
    const sizes = [];
    for (let i = 0; i < n; i++) {
      if (this.walk[i] === WALK.NO || this.comp[i] >= 0) continue;
      const id = sizes.length, stack = [i]; this.comp[i] = id; let size = 0;
      while (stack.length) { const a = stack.pop(); size++; for (const [j] of this.neighbours(a)) if (this.comp[j] < 0) { this.comp[j] = id; stack.push(j); } }
      sizes.push(size);
    }
    this.main = sizes.length ? sizes.indexOf(Math.max(...sizes)) : -1;
    this.componentSizes = sizes;
  }
  /** Floor tiles of the main component. */
  mainFloorTiles() { const out = []; for (let i = 0; i < this.walk.length; i++) if (this.walk[i] === WALK.FLOOR && this.comp[i] === this.main) out.push(i); return out; }
  inb(c, r) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols; }
  idx(c, r) { return r * this.cols + c; }
  cr(i) { return [i % this.cols, Math.floor(i / this.cols)]; }
  at(c, r) { return this.inb(c, r) ? this.walk[r * this.cols + c] : WALK.NO; }
  passable(i) { return this.walk[i] !== WALK.NO; }
  cost(i) { return this.walk[i] === WALK.STAIR ? this.stairCost : 1; }
  /** The centre of tile (c, r) in model metres. */
  toWorld(c, r) { return [this.x0 + (c + 0.5) * this.tm, this.y0 + (this.rows - r - 0.5) * this.tm]; }
  /** The tile holding model point (x, y). */
  fromWorld(x, y) { return [Math.floor((x - this.x0) / this.tm), this.rows - 1 - Math.floor((y - this.y0) / this.tm)]; }
  /** Eight neighbours, no cutting of corners past a blocked tile: [index, stepLength]. */
  neighbours(i) {
    const [c, r] = this.cr(i), out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dc && !dr) continue;
      const cc = c + dc, rr = r + dr;
      if (!this.inb(cc, rr) || this.walk[rr * this.cols + cc] === WALK.NO) continue;
      if (dc && dr && (this.at(c + dc, r) === WALK.NO || this.at(c, r + dr) === WALK.NO)) continue;
      out.push([rr * this.cols + cc, dc && dr ? Math.SQRT2 : 1]);
    }
    return out;
  }
  /** All tiles of a kind, as indices. */
  tilesOf(kind) { const out = []; for (let i = 0; i < this.walk.length; i++) if (this.walk[i] === kind) out.push(i); return out; }
  /** The nearest passable tile of the given kinds to (c, r), by breadth-first search over passable tiles and, failing that, over all tiles within `radius`. */
  nearest(c, r, kinds, radius = 6) {
    const want = new Set(kinds);
    if (this.inb(c, r) && want.has(this.at(c, r))) return this.idx(c, r);
    let best = null, bestD = Infinity;
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const cc = c + dc, rr = r + dr;
      if (!this.inb(cc, rr) || !want.has(this.at(cc, rr))) continue;
      const d = dc * dc + dr * dr;
      if (d < bestD) { bestD = d; best = this.idx(cc, rr); }
    }
    return best;
  }
}
