// Navigation grid over the plan and A* routing. Walkable = inside a room that is not an obstacle
// room, or inside a door opening; minus furniture footprints (chairs and small items excluded).
import { pointInRing, inBox } from "./plan.js";

const OBSTACLE_ROOMS = /obstacle|elevator|service/i;
const WALKABLE_KINDS = new Set(["chair", "bin"]);

export class NavGrid {
  constructor(plan, cell = 0.25) {
    this.plan = plan; this.cell = cell;
    const [x0, y0, x1, y1] = plan.meta.extent;
    this.x0 = x0 - 0.5; this.y0 = y0 - 0.5;
    this.w = Math.ceil((x1 - x0 + 1) / cell); this.h = Math.ceil((y1 - y0 + 1) / cell);
    this.free = new Uint8Array(this.w * this.h);
    this.room = new Int16Array(this.w * this.h).fill(-1);
    this.build();
  }
  build() {
    const { plan, cell } = this;
    const rooms = plan.rooms.map((r, i) => ({ r, i, ok: !OBSTACLE_ROOMS.test(r.type) && !OBSTACLE_ROOMS.test(r.name) }));
    const furn = plan.furniture.filter((f) => !WALKABLE_KINDS.has(f.kind) && f.kind !== "perimeter");
    const inflate = 0.08;
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const x = this.x0 + (i + 0.5) * cell, y = this.y0 + (j + 0.5) * cell;
      let ok = false, rid = -1;
      for (const d of plan.doors) {
        if (d.unused) continue; // a door the owner marked as not in use stays shut for routing
        // the door box sits in the wall network with a thin solid rim; open the passage across the wall
        const b = d.bbox; const g = 0.4;
        const bb = d.axis === "x" ? [b[0] + 0.1, b[1] - g, b[2] - 0.1, b[3] + g] : [b[0] - g, b[1] + 0.1, b[2] + g, b[3] - 0.1];
        if (inBox(x, y, bb)) { ok = true; break; }
      }
      if (!ok && (plan.cutWalls || []).some((b) => inBox(x, y, b))) { ok = true; rid = -1; }
      if (!ok) for (const { r, i: ri, ok: roomOk } of rooms) {
        if (inBox(x, y, r.bbox || (r.bbox = ringBox(r.polygon))) && pointInRing([x, y], r.polygon)) {
          let hole = false; for (const h of r.holes) if (pointInRing([x, y], h)) { hole = true; break; }
          if (!hole) { ok = roomOk; rid = ri; break; }
        }
      }
      if (ok) for (const f of furn) {
        const b = f.bbox;
        if (x >= b[0] - inflate && x <= b[2] + inflate && y >= b[1] - inflate && y <= b[3] + inflate) { ok = false; break; }
      }
      if (ok) for (const c of plan.columns) if (inBox(x, y, c.bbox)) { ok = false; break; }
      this.free[j * this.w + i] = ok ? 1 : 0; this.room[j * this.w + i] = rid;
    }
    // seats must be reachable: free the seat cell and its neighbours even if a chair box overlaps
    for (const d of plan.desks) { const c = this.cellOf(d.seat[0], d.seat[1]); if (c) this.free[c[1] * this.w + c[0]] = 1; }
  }
  cellOf(x, y) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((y - this.y0) / this.cell);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return null; return [i, j];
  }
  center(i, j) { return [this.x0 + (i + 0.5) * this.cell, this.y0 + (j + 0.5) * this.cell]; }
  isFree(x, y) { const c = this.cellOf(x, y); return !!c && this.free[c[1] * this.w + c[0]] === 1; }
  roomIndexAt(x, y) { const c = this.cellOf(x, y); return c ? this.room[c[1] * this.w + c[0]] : -1; }
  nearestFree(x, y, maxR = 2.0) {
    const c = this.cellOf(x, y); if (!c) return null;
    const R = Math.ceil(maxR / this.cell);
    let best = null, bd = Infinity;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = c[0] + di, j = c[1] + dj;
      if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
      if (this.free[j * this.w + i]) { const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i, j]; } }
    }
    return best ? this.center(best[0], best[1]) : null;
  }
  // random free point inside a box or a room polygon
  randomFreeIn(rng, box, tries = 60) {
    for (let k = 0; k < tries; k++) {
      const x = box[0] + rng() * (box[2] - box[0]), y = box[1] + rng() * (box[3] - box[1]);
      if (this.isFree(x, y)) return [x, y];
    }
    return this.nearestFree((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, 3);
  }
  randomFreeInRoom(rng, room, tries = 80) {
    const b = room.bbox || (room.bbox = ringBox(room.polygon));
    for (let k = 0; k < tries; k++) {
      const x = b[0] + rng() * (b[2] - b[0]), y = b[1] + rng() * (b[3] - b[1]);
      if (this.isFree(x, y) && pointInRing([x, y], room.polygon)) return [x, y];
    }
    return null;
  }
  lineOfSight(a, b) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) { const t = k / n; if (!this.isFree(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
    return true;
  }
  // clear width around a point: twice the distance to the nearest blocked cell, up to 3 m
  clearance(x, y) {
    const c = this.cellOf(x, y); if (!c) return 0;
    const R = Math.ceil(3 / this.cell); let bd = Infinity;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = c[0] + di, j = c[1] + dj; if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
      if (!this.free[j * this.w + i]) { const d = Math.hypot(di, dj); if (d < bd) bd = d; }
    }
    return bd === Infinity ? 3 : Math.min(3, 2 * bd * this.cell);
  }
  // A* on 8-neighbours, no corner cutting, then string-pulled. Returns [[x,y],...] or null.
  // costMap: optional Float32Array of extra cost per cell (learned congestion).
  findPath(from, to, costMap = null) {
    const s = this.cellOf(from[0], from[1]), g = this.cellOf(to[0], to[1]);
    if (!s || !g) return null;
    const W = this.w, H = this.h, free = this.free;
    const sIdx = s[1] * W + s[0], gIdx = g[1] * W + g[0];
    if (!free[sIdx] || !free[gIdx]) return null;
    const gScore = new Float32Array(W * H).fill(Infinity); const came = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H);
    const heap = new Heap(); gScore[sIdx] = 0; heap.push(sIdx, this.h8(s[0], s[1], g[0], g[1]));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    let found = false, steps = 0;
    while (heap.size()) {
      const cur = heap.pop(); if (closed[cur]) continue; closed[cur] = 1;
      if (cur === gIdx) { found = true; break; }
      if (++steps > 200000) break;
      const ci = cur % W, cj = (cur - ci) / W;
      for (const [dx, dy, cost] of dirs) {
        const ni = ci + dx, nj = cj + dy; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni; if (!free[n] || closed[n]) continue;
        if (dx && dy && (!free[cj * W + ni] || !free[nj * W + ci])) continue;
        const t = gScore[cur] + cost + (costMap ? costMap[n] : 0); if (t < gScore[n]) { gScore[n] = t; came[n] = cur; heap.push(n, t + this.h8(ni, nj, g[0], g[1])); }
      }
    }
    if (!found) return null;
    const cells = []; for (let c = gIdx; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => { const i = c % W; return this.center(i, (c - i) / W); });
    pts[0] = [from[0], from[1]]; pts[pts.length - 1] = [to[0], to[1]];
    // string pulling (kept short when a cost map is in play so learned detours survive)
    const out = [pts[0]]; let a = 0; const maxSkip = costMap ? 12 : pts.length;
    while (a < pts.length - 1) {
      let b = Math.min(pts.length - 1, a + maxSkip);
      while (b > a + 1 && !this.lineOfSight(pts[a], pts[b])) b--;
      out.push(pts[b]); a = b;
    }
    return out;
  }
  h8(i, j, gi, gj) { const dx = Math.abs(i - gi), dy = Math.abs(j - gj); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); }
}

function ringBox(ring) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of ring) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }

class Heap {
  constructor() { this.k = []; this.v = []; }
  size() { return this.k.length; }
  push(key, val) { const k = this.k, v = this.v; k.push(key); v.push(val); let i = k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (v[p] <= v[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } }
  pop() { const k = this.k, v = this.v; const top = k[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && v[l] < v[m]) m = l; if (r < k.length && v[r] < v[m]) m = r; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } } return top; }
}
