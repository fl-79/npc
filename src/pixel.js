// Pixel-art renderer: the plan as a 16 px tile map in the front-facing oblique of 2D RPGs. The
// floor is a true plan; every vertical surface shows its south face; people and furniture are
// drawn in order of their feet so a person below a wall stands in front of it and one above is
// hidden by it. Doors open as people pass. Everything is drawn at native resolution and scaled
// by whole numbers.
import { pointInRing, inBox, officeLayout } from "./plan.js";
import { BAR_START } from "./sim.js";

export const TILE = 16;            // px per tile
export const TILE_M = 0.5;         // metres per tile
export const PPM = TILE / TILE_M;  // px per metre at zoom 1
const WALL_H = 2 * TILE;           // visual wall height (two tiles, as in the references)
const DOOR_H = TILE + 10;          // visual door height, below the header

export const PAL = {
  // legibility first: dark exposed concrete floor, light walls, drawn glazing
  void: "#12181e", voidDot: "#1b232a",
  floor: "#5a5955", floorLine: "#64635e", floorDark: "#4e4d49",
  kitchenA: "#8c8571", kitchenB: "#a39c86", office: "#8a6a44", officeLine: "#775a39", hall: "#6e6d67", hallLine: "#64635d",
  wallCap: "#fcf9f2", wallEdge: "#2a211a", wallFace: "#d9ccaa", wallFaceDark: "#bfb08c", base: "#3a2e22", extFace: "#b5aea1", extFaceDark: "#948d80", pilaster: "#a39b8d",
  glass: "#9fd4ea", glassLight: "#d8f0fa", mullion: "#1c2a33", door: "#a8713f", doorDark: "#6b4424", doorLight: "#caa06a",
  wood: "#b8824e", woodTop: "#dcaa6c", woodDark: "#7d5430", paper: "#fbf7ec", ink: "#1e1a16", metal: "#9aa0a6", metalLight: "#cfd4d8",
  cushion: "#d2644f", cushionDark: "#9c4537", green: "#6aa655", greenDark: "#3f6e32", amber: "#f3c66b", amberDark: "#854f0b",
};

export class PixelRenderer {
  constructor(stage, plan) {
    this.stage = stage; this.plan = plan;
    const [x0, y0, x1, y1] = plan.meta.extent;
    this.x0 = Math.floor(x0 / TILE_M) * TILE_M - TILE_M * 2; this.y1 = Math.ceil(y1 / TILE_M) * TILE_M + TILE_M * 2;
    this.cols = Math.ceil((x1 - this.x0) / TILE_M) + 2; this.rows = Math.ceil((this.y1 - y0) / TILE_M) + 2;
    this.W = this.cols * TILE; this.H = this.rows * TILE;
    this.spriteCache = new Map(); this.last = new Map();
    this.build();
  }
  nx(x) { return Math.round((x - this.x0) * PPM); }
  ny(y) { return Math.round((this.y1 - y) * PPM); }

  // ---------- tiles
  col(x) { return Math.max(0, Math.min(this.cols - 1, Math.floor((x - this.x0) / TILE_M))); }
  row(y) { return Math.max(0, Math.min(this.rows - 1, Math.floor((this.y1 - y) / TILE_M))); }
  build() {
    const plan = this.plan; const cols = this.cols, rows = this.rows; const N = cols * rows;
    const kind = new Uint8Array(N); // 0 void, 1 floor, 2 wall, 3 glass, 4 door
    const room = new Int16Array(N).fill(-1);
    // unnamed leftover regions of the converter never claim a tile; the room they lie in does
    const rooms = plan.rooms.map((r) => ({ r, bbox: ringBox(r.polygon), skip: /^Region/i.test(r.name || "") }));
    const poche = (plan.poche || plan.walls).map((w) => ({ w, bbox: ringBox(w.exterior) }));
    const inPoche = (x, y) => { for (const { w, bbox } of poche) { if (inBox(x, y, bbox) && pointInRing([x, y], w.exterior)) { let hole = false; for (const h of w.holes) if (pointInRing([x, y], h)) { hole = true; break; } if (!hole) return true; } } for (const c of plan.columns) if (inBox(x, y, c.bbox)) return true; return false; };
    // where room polygons overlap (an office inside the studio's outline), the smallest room wins
    const inRoom = (x, y) => { let best = -1, bestA = Infinity; for (let q = 0; q < rooms.length; q++) { const { r, bbox, skip } = rooms[q]; if (inBox(x, y, bbox) && pointInRing([x, y], r.polygon)) { let hole = false; for (const h of r.holes) if (pointInRing([x, y], h)) { hole = true; break; } const area = r.area_m2 || ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])); if (!hole && area < bestA) { best = skip ? -2 : q; bestA = area; } } } return best; };
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = this.x0 + (i + 0.5) * TILE_M, y = this.y1 - (j + 0.5) * TILE_M; const idx = j * cols + i;
      let ri = inRoom(x, y); if (ri === -1) for (const [dx, dy] of NB) { ri = inRoom(x + dx * 0.2, y + dy * 0.2); if (ri !== -1) break; }
      room[idx] = ri >= 0 ? ri : -1; kind[idx] = ri !== -1 ? 1 : 0; // -2: floor of a leftover region, room filled in later from its neighbours
    }
    // ---- the wall solids on a 10 cm raster, five pixels to a tile
    const S = 5, R = TILE_M / S; const gw = cols * S, gh = rows * S; const G = new Uint8Array(gw * gh);
    const cut = plan.cutWalls || []; // wall pieces the owner struck out
    for (let py = 0; py < gh; py++) for (let px = 0; px < gw; px++) { const x = this.x0 + (px + 0.5) * R, y = this.y1 - (py + 0.5) * R; G[py * gw + px] = inPoche(x, y) && !cut.some((b) => inBox(x, y, b)) ? 1 : 0; }
    const Gat = (px, py) => (px >= 0 && py >= 0 && px < gw && py < gh) ? G[py * gw + px] : 0;
    // distance, in pixels, to the nearest open pixel
    const D = new Uint16Array(gw * gh);
    for (let py = 0; py < gh; py++) for (let px = 0; px < gw; px++) { const o = py * gw + px; if (!G[o]) { D[o] = 0; continue; } let d = 999; if (px > 0) d = Math.min(d, D[o - 1] + 1); if (py > 0) d = Math.min(d, D[o - gw] + 1); D[o] = Math.min(d, 999); }
    for (let py = gh - 1; py >= 0; py--) for (let px = gw - 1; px >= 0; px--) { const o = py * gw + px; if (!G[o]) continue; let d = D[o]; if (px < gw - 1) d = Math.min(d, D[o + 1] + 1); if (py < gh - 1) d = Math.min(d, D[o + gw] + 1); D[o] = d; }
    // columns and pilasters: solid cores at least 0.3 m from every edge, under a metre across
    const isCol = new Uint8Array(N); const seen = new Uint8Array(gw * gh); const DTH = 3; this.colComps = [];
    for (let o0 = 0; o0 < gw * gh; o0++) {
      if (seen[o0] || D[o0] < DTH) continue; const st = [o0]; seen[o0] = 1; let n = 0, sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      while (st.length) { const o = st.pop(); const px = o % gw, py = (o - px) / gw; n++; sx += px; sy += py; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (const [dx, dy] of NB) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= gw || qy >= gh) continue; const q = qy * gw + qx; if (!seen[q] && D[q] >= DTH) { seen[q] = 1; st.push(q); } } }
      const w = x1 - x0 + 1, h = y1 - y0 + 1; this.colComps.push({ n, w, h, cx: sx / n, cy: sy / n });
      if (w <= 2 * S && h <= 2 * S) { const ci = Math.floor(sx / n / S), cj = Math.floor(sy / n / S); isCol[cj * cols + ci] = 1; }
    }
    for (const c of plan.columns) isCol[this.row((c.bbox[1] + c.bbox[3]) / 2) * cols + this.col((c.bbox[0] + c.bbox[2]) / 2)] = 1;
    // ---- wall centrelines: the solids thinned to one pixel, each line end pushed back out to the solid's edge
    const K = G.slice(); let changed = true; const del = [];
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        del.length = 0;
        for (let py = 1; py < gh - 1; py++) for (let px = 1; px < gw - 1; px++) {
          const o = py * gw + px; if (!K[o]) continue;
          const p2 = K[o - gw], p3 = K[o - gw + 1], p4 = K[o + 1], p5 = K[o + gw + 1], p6 = K[o + gw], p7 = K[o + gw - 1], p8 = K[o - 1], p9 = K[o - gw - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
          let A = 0; if (!p2 && p3) A++; if (!p3 && p4) A++; if (!p4 && p5) A++; if (!p5 && p6) A++; if (!p6 && p7) A++; if (!p7 && p8) A++; if (!p8 && p9) A++; if (!p9 && p2) A++; if (A !== 1) continue;
          if (pass === 0 ? (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) : (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0)) del.push(o);
        }
        for (const o of del) K[o] = 0; if (del.length) changed = true;
      }
    }
    const ends = [];
    for (let py = 1; py < gh - 1; py++) for (let px = 1; px < gw - 1; px++) { const o = py * gw + px; if (!K[o]) continue; let n = 0, nx = 0, ny = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (K[o + dy * gw + dx]) { n++; nx = dx; ny = dy; } } if (n === 1) ends.push([px, py, -nx, -ny]); }
    for (const [px, py, dx, dy] of ends) for (let s = 1; s <= 3; s++) { const qx = px + dx * s, qy = py + dy * s; if (Gat(qx, qy)) K[qy * gw + qx] = 1; else break; }
    this.raster = { G, K, D, gw, gh, S };
    // a tile is wall when a centreline runs through it, when it is solid through, or when it holds a column
    const cnt = new Uint8Array(N), solidCnt = new Uint8Array(N);
    for (let py = 0; py < gh; py++) for (let px = 0; px < gw; px++) { const o = py * gw + px; const idx = Math.floor(py / S) * cols + Math.floor(px / S); if (K[o]) cnt[idx]++; if (G[o]) solidCnt[idx]++; }
    // a tile with no more than a one-pixel sliver of solid in it cannot carry a wall, whatever the thinning left there
    for (let idx = 0; idx < N; idx++) if ((cnt[idx] >= 2 && solidCnt[idx] > S) || solidCnt[idx] >= S * S || isCol[idx]) kind[idx] = 2;
    // nubs: a one-tile dead end hanging off a wall at right angles is a spur of the thinning, not a wall; drop it
    { const W = (i, j) => i >= 0 && j >= 0 && i < cols && j < rows && kind[j * cols + i] === 2; const drop = [];
      const nearDoor = (i, j) => { const x = this.x0 + (i + 0.5) * TILE_M, y = this.y1 - (j + 0.5) * TILE_M; return plan.doors.some((d) => inBox(x, y, [d.bbox[0] - 1.0, d.bbox[1] - 1.0, d.bbox[2] + 1.0, d.bbox[3] + 1.0])); };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const idx = j * cols + i; if (kind[idx] !== 2 || isCol[idx] || nearDoor(i, j)) continue; // a jamb beside a door is a short wall, not a spur
        const nb = NB.filter(([di, dj]) => W(i + di, j + dj)); if (nb.length !== 1) continue; const [di, dj] = nb[0]; const ni = i + di, nj = j + dj;
        const perp = di !== 0 ? (W(ni, nj - 1) || W(ni, nj + 1)) : (W(ni - 1, nj) || W(ni + 1, nj)); const along = W(ni + di, nj + dj);
        if (perp && !along) drop.push(idx); }
      for (const idx of drop) kind[idx] = 1; this.nubsDropped = drop.length; }
    this.isCol = isCol;
    // a lone floor tile outside the building, caught by a room polygon's edge, is outside
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const idx = j * cols + i; if (kind[idx] !== 1) continue; let fl = 0, vd = 0; for (const [di, dj] of NB) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) { vd++; continue; } const k = kind[jj * cols + ii]; if (k === 1) fl++; else if (k === 0) vd++; } if (fl === 0 && vd >= 2) { kind[idx] = 0; room[idx] = -1; } }
    // ---- the glazing: tiles the glass lines cross become glass, except the columns that host it; the run's direction
    // and the line's position in the tile are kept; a line crossing plain floor counts only at a room edge
    const Kd = (i, j) => (i >= 0 && j >= 0 && i < cols && j < rows) ? kind[j * cols + i] : 0;
    const Rm = (i, j) => (i >= 0 && j >= 0 && i < cols && j < rows) ? room[j * cols + i] : -1;
    const hLen = new Float32Array(N), vLen = new Float32Array(N), posSum = new Float32Array(N), posCnt = new Uint16Array(N);
    for (const l of (plan.linework?.glazing || [])) for (let s = 1; s < l.length; s++) {
      const [ax, ay] = l[s - 1], [bx, by] = l[s]; const len = Math.hypot(bx - ax, by - ay); if (len < 1e-6) continue;
      const horiz = Math.abs(bx - ax) >= Math.abs(by - ay); const n = Math.max(1, Math.ceil(len / 0.2));
      for (let q = 0; q <= n; q++) {
        const x = ax + ((bx - ax) * q) / n, y = ay + ((by - ay) * q) / n; const i = Math.floor((x - this.x0) / TILE_M), j = Math.floor((this.y1 - y) / TILE_M);
        if (!(i >= 0 && j >= 0 && i < cols && j < rows)) continue; const idx = j * cols + i; const k0 = kind[idx];
        if (isCol[idx]) continue;
        if (k0 === 0 && !NB.some(([di, dj]) => Kd(i + di, j + dj) === 1)) continue;
        if (k0 === 1 && !NB.some(([di, dj]) => { const kk = Kd(i + di, j + dj); return kk !== 1 || Rm(i + di, j + dj) !== room[idx]; })) continue;
        kind[idx] = 3; if (horiz) hLen[idx] += len / n; else { vLen[idx] += len / n; posSum[idx] += (x - this.x0) * PPM - i * TILE; posCnt[idx]++; }
      }
    }
    this.glassAxis = new Int8Array(N).fill(-1); this.glassX = new Uint8Array(N).fill(8);
    for (let idx = 0; idx < N; idx++) if (kind[idx] === 3) { this.glassAxis[idx] = hLen[idx] >= vLen[idx] ? 0 : 1; if (posCnt[idx]) this.glassX[idx] = Math.max(1, Math.min(TILE - 2, Math.round(posSum[idx] / posCnt[idx]))); }
    // a glass run ends on the wall that hosts it: where that wall stands one tile across from the run's end, the
    // corner tile between them is wall too, so the line ends on a cap and not on a post in the open
    for (let idx = 0; idx < N; idx++) { if (kind[idx] !== 3) continue; const i = idx % cols, j = (idx - i) / cols; const v = this.glassAxis[idx] === 1;
      // a lone glass tile (a frame return at a window's corner) is not a run and claims no corner
      if (v ? (Kd(i, j - 1) !== 3 && Kd(i, j + 1) !== 3) : (Kd(i - 1, j) !== 3 && Kd(i + 1, j) !== 3)) continue;
      for (const [di, dj] of (v ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]])) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue; const k2 = kind[jj * cols + ii]; if (k2 !== 1 && k2 !== 0) continue;
        const W2 = (a, b) => a >= 0 && b >= 0 && a < cols && b < rows && kind[b * cols + a] === 2;
        const beside = v ? [[ii - 1, jj], [ii + 1, jj]] : [[ii, jj - 1], [ii, jj + 1]]; if (beside.some(([a, b]) => W2(a, b))) { kind[jj * cols + ii] = 2; continue; }
        // the host wall stands beside the run's last tile: that tile becomes the wall's end, so the cap reaches over the line
        const flank = v ? [[i - 1, j], [i + 1, j]] : [[i, j - 1], [i, j + 1]]; if (flank.some(([a, b]) => W2(a, b))) kind[idx] = 2; } }
    // pockets of void shut inside the building are floor the room polygons missed, not holes in the slab
    const reach = new Uint8Array(N); const stack = [];
    for (let i = 0; i < cols; i++) stack.push(i, (rows - 1) * cols + i); for (let j = 0; j < rows; j++) stack.push(j * cols, j * cols + cols - 1);
    while (stack.length) { const idx = stack.pop(); if (reach[idx] || kind[idx] !== 0) continue; reach[idx] = 1; const i = idx % cols, j = (idx - i) / cols; if (i > 0) stack.push(idx - 1); if (i < cols - 1) stack.push(idx + 1); if (j > 0) stack.push(idx - cols); if (j < rows - 1) stack.push(idx + cols); }
    { const seenP = new Uint8Array(N); for (let s0 = 0; s0 < N; s0++) { if (kind[s0] !== 0 || reach[s0] || seenP[s0]) continue; const comp = [s0]; seenP[s0] = 1; for (let q = 0; q < comp.length; q++) { const idx = comp[q]; const i = idx % cols, j = (idx - i) / cols; for (const [di, dj] of NB) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue; const n2 = jj * cols + ii; if (kind[n2] === 0 && !reach[n2] && !seenP[n2]) { seenP[n2] = 1; comp.push(n2); } } } for (const idx of comp) kind[idx] = 1; } }
    for (let pass = 0; pass < 4; pass++) for (let idx = 0; idx < N; idx++) { if ((kind[idx] !== 1 && kind[idx] !== 3) || room[idx] >= 0) continue; const i = idx % cols, j = (idx - i) / cols; for (const [di, dj] of NB) { const r = Rm(i + di, j + dj); if (r >= 0 && Kd(i + di, j + dj) !== 2) { room[idx] = r; break; } } }
    // ---- doors, hosted by the wall they sit in: of the tile rows (or columns) the door box covers, the one whose wall
    // or glass line continues past both ends of the opening; a run of glass beyond the ends makes it a glass door
    this.doorTile = new Int16Array(N).fill(-1);
    this.doors = plan.doors.map((d, n) => {
      const bb = d.bbox; const glass = /glass|curtain/i.test(d.name || ""); const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
      const runAt = (i, j, horiz) => { const k = Kd(i, j); if (k === 2) { const across = horiz ? (Kd(i, j - 1) === 2 || Kd(i, j + 1) === 2) : (Kd(i - 1, j) === 2 || Kd(i + 1, j) === 2); return [across ? 0.35 : 1, 0]; } if (k === 3) return [0, this.glassAxis[j * cols + i] === (horiz ? 0 : 1) ? 1 : 0.35]; return [0, 0]; };
      if (d.axis === "x") {
        const i0 = this.col(bb[0] + 0.05), i1 = this.col(bb[2] - 0.05); const jc = this.row(cy); let best = jc, bestS = -1, bestG = 0;
        for (let j = this.row(bb[3] + 0.1); j <= this.row(bb[1] - 0.1); j++) { let sw = 0, sg = 0; for (const e of [i0 - 1, i0 - 2, i1 + 1, i1 + 2]) { const [w, g] = runAt(e, j, true); sw += w; sg += g; } const s = glass ? sw + sg : sw; if (s > bestS || (s === bestS && Math.abs(j - jc) < Math.abs(best - jc))) { best = j; bestS = s; bestG = sg - sw; } }
        const j = best; const host = glass && bestG > 0 ? "glass" : "wall";
        // the door box can overlap the crossing wall's tile by a few centimetres: that tile stays wall
        const crossX = (i) => Kd(i, j) === 2 && (Kd(i, j - 1) === 2 || Kd(i, j + 1) === 2); let ia = i0, ib = i1; while (ia < ib && crossX(ia)) ia++; while (ib > ia && crossX(ib)) ib--;
        for (let i = ia; i <= ib; i++) { const idx = j * cols + i; if (isCol[idx]) continue; kind[idx] = 4; this.doorTile[idx] = n; }
        // the jambs: a thin wall's last tile beside the opening can carry only a few solid pixels; it is wall all the same
        if (host === "wall") for (const e of [ia - 1, ib + 1]) { if (e < 0 || e >= cols) continue; const idx = j * cols + e; if (kind[idx] === 1 && solidCnt[idx] >= 2) kind[idx] = 2; }
        return { d, n, glass, host, axis: "x", row: j, i0: ia, i1: ib, open: 0 };
      } else {
        const j0 = this.row(bb[3] - 0.05), j1 = this.row(bb[1] + 0.05); const ic = this.col(cx); let best = ic, bestS = -1, bestG = 0;
        for (let i = this.col(bb[0] - 0.1); i <= this.col(bb[2] + 0.1); i++) { let sw = 0, sg = 0; for (const e of [j0 - 1, j0 - 2, j1 + 1, j1 + 2]) { const [w, g] = runAt(i, e, false); sw += w; sg += g; } const s = glass ? sw + sg : sw; if (s > bestS || (s === bestS && Math.abs(i - ic) < Math.abs(best - ic))) { best = i; bestS = s; bestG = sg - sw; } }
        const i = best; const host = glass && bestG > 0 ? "glass" : "wall";
        const crossY = (j) => Kd(i, j) === 2 && (Kd(i - 1, j) === 2 || Kd(i + 1, j) === 2); let ja = j0, jb = j1; while (ja < jb && crossY(ja)) ja++; while (jb > ja && crossY(jb)) jb--;
        for (let j = ja; j <= jb; j++) { const idx = j * cols + i; if (isCol[idx]) continue; kind[idx] = 4; this.doorTile[idx] = n; }
        if (host === "wall") for (const e of [ja - 1, jb + 1]) { if (e < 0 || e >= rows) continue; const idx = e * cols + i; if (kind[idx] === 1 && solidCnt[idx] >= 2) kind[idx] = 2; }
        return { d, n, glass, host, axis: "y", col: i, c0: i, c1: i, j0: ja, j1: jb, open: 0 };
      }
    });
    // mullions: the small closed rectangles in the glazing linework, each a post between two panes
    const mull = new Map();
    for (const l of (plan.linework?.glazing || [])) for (let s = 1; s < l.length; s++) { const [ax, ay] = l[s - 1], [bx, by] = l[s]; const len = Math.hypot(bx - ax, by - ay); if (len > 0.25) continue; const mx = (ax + bx) / 2, my = (ay + by) / 2; const key = Math.round(mx / 0.2) + "," + Math.round(my / 0.2); const m = mull.get(key) || { sx: 0, sy: 0, n: 0 }; m.sx += mx; m.sy += my; m.n++; mull.set(key, m); }
    this.mullions = []; const seenM = [];
    for (const m of mull.values()) { const x = m.sx / m.n, y = m.sy / m.n; if (seenM.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 0.3)) continue; seenM.push([x, y]); const i = this.col(x), j = this.row(y); if (kind[j * cols + i] !== 3) continue; this.mullions.push({ x, y, i, j }); }
    // the studio floor is one connected body; studio tiles cut off from it once the doors are marked (the studio polygon
    // reaches through a doorway into the door's swing inside an office) belong to the room around them
    { const big = plan.rooms.findIndex((r) => r.id === "R1"); if (big >= 0) { const seenC = new Uint8Array(N); const comps = [];
      for (let s0 = 0; s0 < N; s0++) { if (seenC[s0] || kind[s0] !== 1 || room[s0] !== big) continue; const comp = [s0]; seenC[s0] = 1; for (let q = 0; q < comp.length; q++) { const idx = comp[q]; const i = idx % cols, j = (idx - i) / cols; for (const [di, dj] of NB) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue; const n2 = jj * cols + ii; if (!seenC[n2] && kind[n2] === 1 && room[n2] === big) { seenC[n2] = 1; comp.push(n2); } } } comps.push(comp); }
      comps.sort((a, b) => b.length - a.length); for (const comp of comps.slice(1)) for (const idx of comp) room[idx] = -1;
      for (let pass = 0; pass < 4; pass++) for (let idx = 0; idx < N; idx++) { if (kind[idx] !== 1 || room[idx] >= 0) continue; const i = idx % cols, j = (idx - i) / cols; for (const [di, dj] of NB) { const r = Rm(i + di, j + dj); if (r >= 0 && r !== big && Kd(i + di, j + dj) === 1) { room[idx] = r; break; } } } } }
    this.kind = kind; this.room = room;
    this.doorAxis = new Int8Array(N).fill(-1);
    for (let idx = 0; idx < N; idx++) { const n = this.doorTile[idx]; if (n >= 0) this.doorAxis[idx] = this.doors[n].axis === "x" ? 0 : 1; }
    this.roomStyle = plan.rooms.map((r) => /kitchen/i.test(r.name) ? "kitchen" : /office/i.test(r.name) ? "office" : /stair|lobby|elevator|chase|printer|photo/i.test(r.name) ? "hall" : /classroom/i.test(r.name) ? "class" : "studio");
    this.officeFurniture = []; for (const r of plan.rooms) if (/office/i.test(r.name)) this.officeFurniture.push(...officeLayout(r, plan));
    this.buildFloor(); this.buildStrips();
  }
  buildFloor() {
    const c = document.createElement("canvas"); c.width = this.W; c.height = this.H; const g = c.getContext("2d");
    g.fillStyle = PAL.void; g.fillRect(0, 0, this.W, this.H);
    const kz = this.plan.kitchen; const kb = kz && kz.bounds;
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const k = this.kind[j * this.cols + i]; const x = i * TILE, y = j * TILE;
      if (k === 0) { if ((i * 7 + j * 13) % 11 === 0) { g.fillStyle = PAL.voidDot; g.fillRect(x + 7, y + 9, 2, 2); } continue; }
      const ri = this.room[j * this.cols + i]; const style = ri >= 0 ? this.roomStyle[ri] : "studio";
      const wx = this.x0 + (i + 0.5) * TILE_M, wy = this.y1 - (j + 0.5) * TILE_M;
      const inKitchen = kb && inBox(wx, wy, kb);
      if (inKitchen || style === "kitchen") { g.fillStyle = (i + j) % 2 ? PAL.kitchenA : PAL.kitchenB; g.fillRect(x, y, TILE, TILE); }
      else if (style === "office") { g.fillStyle = PAL.office; g.fillRect(x, y, TILE, TILE); g.fillStyle = PAL.officeLine; g.fillRect(x, y + ((i % 2) ? 4 : 11), TILE, 1); g.fillRect(x + 15, y, 1, TILE); }
      else if (style === "hall") { g.fillStyle = PAL.hall; g.fillRect(x, y, TILE, TILE); g.fillStyle = PAL.hallLine; g.fillRect(x, y + 15, TILE, 1); g.fillRect(x + 15, y, 1, TILE); }
      else { g.fillStyle = PAL.floor; g.fillRect(x, y, TILE, TILE); g.fillStyle = PAL.floorLine; if (i % 4 === 0) g.fillRect(x, y, 1, TILE); if (j % 4 === 0) g.fillRect(x, y, TILE, 1); if ((i * 3 + j * 5) % 17 === 0) { g.fillStyle = PAL.floorDark; g.fillRect(x + 5, y + 6, 2, 1); } }
      if (k === 4) { g.fillStyle = PAL.floorDark; g.fillRect(x, y, TILE, TILE); g.fillStyle = PAL.floor; g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2); }
    }
    g.strokeStyle = "#8a8578"; g.lineWidth = 1; g.beginPath();
    for (const l of (this.plan.linework?.stairs || [])) { for (let s = 0; s < l.length; s++) { const x = this.nx(l[s][0]) + 0.5, y = this.ny(l[s][1]) + 0.5; s ? g.lineTo(x, y) : g.moveTo(x, y); } }
    g.stroke();
    this.floor = c;
    // the glazing drawn as lines at cap height, so it meets the wall caps; a faint footprint stays on the floor
    const gl = document.createElement("canvas"); gl.width = this.W; gl.height = this.H; const gg = gl.getContext("2d");
    const drawOn = (ctx2, color, dx, dy, w) => { ctx2.strokeStyle = color; ctx2.lineWidth = w; ctx2.beginPath(); for (const l of (this.plan.linework?.glazing || [])) { for (let s = 0; s < l.length; s++) { const x = this.nx(l[s][0]) + 0.5 + dx, y = this.ny(l[s][1]) + 0.5 + dy; s ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y); } } ctx2.stroke(); };
    drawOn(g, PAL.floorDark, 0, 0, 1);
    drawOn(gg, PAL.mullion, 0, -WALL_H + 1, 3); drawOn(gg, PAL.glass, 0, -WALL_H, 1); drawOn(gg, PAL.glassLight, 1, -WALL_H - 1, 1);
    this.glazing = gl;
  }
  // one strip per tile row: wall caps and faces of that row, and furniture whose feet are in it
  buildStrips() {
    const strips = []; const cols = this.cols, rows = this.rows; const kind = this.kind;
    const K = (i, j) => (i >= 0 && j >= 0 && i < cols && j < rows) ? kind[j * cols + i] : 0;
    const solid = (i, j) => K(i, j) === 2 || (K(i, j) === 4 && this.doorAxis[j * cols + i] === 0);
    const capLike = (i, j) => solid(i, j); // a door in a north-south wall is an opening in the cap, so the cap is outlined against it
    const vglass = (i, j) => K(i, j) === 3 && this.glassAxis[j * cols + i] === 1;
    const furnByRow = new Map();
    const allFurn = this.plan.furniture.filter((f) => f.kind !== "perimeter" && f.kind !== "elevator").concat(this.officeFurniture);
    for (const f of allFurn) { const j = Math.min(rows - 1, Math.max(0, Math.floor((this.y1 - f.bbox[1]) / TILE_M))); (furnByRow.get(j) || furnByRow.set(j, []).get(j)).push(f); }
    const tmp = document.createElement("canvas"); const tg = tmp.getContext("2d");
    for (let j = 0; j < rows; j++) {
      const top = j * TILE - WALL_H - TILE; const h = WALL_H + 3 * TILE;
      const c = document.createElement("canvas"); c.width = this.W; c.height = h; const g = c.getContext("2d");
      let any = false;
      // furniture first; a wall or column standing inside a piece's footprint is cut out of it, so the wall wins there,
      // while a piece south of a wall is drawn later and stands in front of it, as it should
      for (const f of furnByRow.get(j) || []) {
        any = true; const spr = this.furnitureSprite(f); const x = this.nx(f.bbox[0]); const yWorld = this.ny(f.bbox[1]) - spr.height;
        tmp.width = spr.width; tmp.height = spr.height; tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, tmp.width, tmp.height); tg.drawImage(spr, 0, 0);
        tg.globalCompositeOperation = "destination-out";
        // only a wall or column whose tile centre lies well inside the piece's footprint is cut out of it; a desk pushed
        // against a wall merely touches the wall's edge and is drawn in front of it, as it stands
        const ci0 = this.col(f.bbox[0] + 0.2), ci1 = this.col(f.bbox[2] - 0.2), cj0 = this.row(f.bbox[3] - 0.2), cj1 = this.row(f.bbox[1] + 0.2);
        for (let jj = cj0; jj <= cj1; jj++) for (let ii = ci0; ii <= ci1; ii++) { const cx = this.x0 + (ii + 0.5) * TILE_M, cy = this.y1 - (jj + 0.5) * TILE_M; if (solid(ii, jj) && inBox(cx, cy, [f.bbox[0] + 0.2, f.bbox[1] + 0.2, f.bbox[2] - 0.2, f.bbox[3] - 0.2])) tg.fillRect(ii * TILE - x, (jj + 1) * TILE - TILE - WALL_H - yWorld, TILE, TILE + WALL_H); }
        g.drawImage(tmp, x, yWorld - top);
        // a piece the plan check flagged (overlapping a wall, blocking a door, a chair with nothing to sit at) carries a red mark
        // the plan check's flags stay loaded (plan.flags, level3-flags.json) but are drawn only when stage.opts.flags is on
        if (this.stage.opts.flags && this.plan.flags && this.plan.flags[f.id]) { const mx = x + spr.width - 7, my = yWorld - top - 3; g.fillStyle = PAL.wallEdge; g.fillRect(mx - 1, my - 1, 9, 9); g.fillStyle = "#e0342c"; g.fillRect(mx, my, 7, 7); g.fillStyle = "#fff"; g.fillRect(mx + 3, my + 1, 1, 3); g.fillRect(mx + 3, my + 5, 1, 1); }
      }
      for (let i = 0; i < cols; i++) {
        const idx = j * cols + i; const k = kind[idx]; const hdoor = k === 4 && this.doorAxis[idx] === 0; if (k !== 2 && k !== 3 && !hdoor) continue;
        const x = i * TILE; const yS = (j + 1) * TILE - top; const cy = yS - TILE - WALL_H;
        const south = K(i, j + 1); const faceVisible = !solid(i, j + 1) && south !== 3;
        if (k === 3) {
          if (this.glassAxis[idx] === 0) {
            // an east-west run of glass shows its face; with the outside behind it the face reaches the top of the caps beside it
            if (faceVisible) { any = true; const tall = K(i, j - 1) === 0 ? WALL_H + TILE : WALL_H; const y0 = yS - tall;
              g.fillStyle = PAL.glass; g.fillRect(x, y0, TILE, tall); g.fillStyle = PAL.glassLight; g.fillRect(x + 2, y0 + 2, 5, tall - 6);
              g.fillStyle = PAL.mullion; g.fillRect(x, y0, 1, tall); g.fillRect(x, y0, TILE, 1); g.fillRect(x, yS - 1, TILE, 1); if (tall > WALL_H) g.fillRect(x, y0 + TILE - 1, TILE, 1); }
          } else {
            // a north-south run is seen edge on: only its ends show, as a thin post from the cap line down to the floor
            const gx = x + this.glassX[idx];
            if (!vglass(i, j + 1) && K(i, j + 1) !== 2) { any = true; g.fillStyle = PAL.mullion; g.fillRect(gx - 1, yS - WALL_H, 3, WALL_H); g.fillStyle = PAL.glassLight; g.fillRect(gx + 1, yS - WALL_H + 1, 1, WALL_H - 2); }
            if (!vglass(i, j - 1) && K(i, j - 1) !== 2) { any = true; g.fillStyle = PAL.mullion; g.fillRect(gx - 1, cy, 3, WALL_H); }
          }
          continue;
        }
        any = true;
        // the cap, outlined on its outer edges only, so a wall and the headers over its doors read as one piece
        g.fillStyle = PAL.wallCap; g.fillRect(x, cy, TILE, TILE); g.fillStyle = PAL.wallEdge;
        if (!capLike(i, j - 1)) g.fillRect(x, cy, TILE, 1); if (!capLike(i, j + 1)) g.fillRect(x, cy + TILE - 1, TILE, 1); if (!capLike(i - 1, j)) g.fillRect(x, cy, 1, TILE); if (!capLike(i + 1, j)) g.fillRect(x + TILE - 1, cy, 1, TILE);
        if (hdoor) {
          // a door in an east-west wall: the wall continues above it as a header; the leaf is drawn each frame below
          g.fillStyle = PAL.wallFace; g.fillRect(x, yS - WALL_H, TILE, WALL_H - DOOR_H); g.fillStyle = PAL.wallFaceDark; g.fillRect(x, yS - WALL_H, TILE, 2); g.fillStyle = PAL.base; g.fillRect(x, yS - DOOR_H - 2, TILE, 2);
          continue;
        }
        if (!faceVisible) continue;
        if (south === 0 && !this.isCol[idx]) {
          g.fillStyle = PAL.extFace; g.fillRect(x, yS - WALL_H, TILE, WALL_H); g.fillStyle = PAL.extFaceDark; g.fillRect(x, yS - WALL_H, TILE, 3); g.fillRect(x, yS - 6, TILE, 6);
          if (i % 6 === 0) { g.fillStyle = PAL.pilaster; g.fillRect(x + 2, yS - WALL_H, 5, WALL_H); g.fillStyle = PAL.extFaceDark; g.fillRect(x + 6, yS - WALL_H, 1, WALL_H); }
        } else {
          g.fillStyle = PAL.wallFace; g.fillRect(x, yS - WALL_H, TILE, WALL_H); g.fillStyle = PAL.wallFaceDark; g.fillRect(x, yS - WALL_H, TILE, 2); if (i % 3 === 0) g.fillRect(x + 6, yS - WALL_H + 10, 1, WALL_H - 18);
          g.fillStyle = PAL.base; g.fillRect(x, yS - 3, TILE, 3);
        }
      }
      // mullions of this row: a thin post from the cap line to the floor, a small cap on top
      for (const mu of this.mullions) { if (mu.j !== j) continue; any = true; const mx = this.nx(mu.x) - 2, yS = (j + 1) * TILE - top; const my = this.ny(mu.y) - top; const horiz = this.glassAxis[j * cols + mu.i] === 0; const yb = horiz ? yS : my; const yt = my - WALL_H; g.fillStyle = PAL.pilaster; g.fillRect(mx, yt, 4, yb - yt); g.fillStyle = PAL.extFaceDark; g.fillRect(mx + 3, yt, 1, yb - yt); g.fillStyle = PAL.mullion; g.fillRect(mx - 1, yt - 3, 6, 4); g.fillStyle = PAL.base; g.fillRect(mx, yb - 2, 4, 2); }
      // doors in north-south walls: one lintel across the opening at cap height, so the wall top reads continuous
      for (const dd of this.doors) { if (true) continue; if (dd.axis !== "y" || dd.host === "glass" || j < dd.j0 || j > dd.j1) continue; any = true; const xa = dd.c0 * TILE, xb = (dd.c1 + 1) * TILE; const cy = (j + 1) * TILE - top - TILE - WALL_H; g.fillStyle = PAL.wallCap; g.fillRect(xa, cy, xb - xa, TILE); g.fillStyle = PAL.wallEdge; if (!capLike(dd.c0 - 1, j)) g.fillRect(xa, cy, 1, TILE); if (!capLike(dd.c1 + 1, j)) g.fillRect(xb - 1, cy, 1, TILE); }
      strips.push(any ? { c, top } : null);
    }
    this.strips = strips;
  }

  // ---------- furniture sprites: top in plan, a front face below the south edge
  furnitureSprite(f) {
    const key = f.id; if (this.spriteCache.has(key)) return this.spriteCache.get(key);
    const w = Math.max(TILE, Math.round((f.bbox[2] - f.bbox[0]) * PPM)), d = Math.max(4, Math.round((f.bbox[3] - f.bbox[1]) * PPM));
    const faceH = { desk: 10, table: 10, counter: 22, printer: 24, computers: 12, seating: 10, pinup: 30, bin: 8, other: 14, chair: 6, shelf: 34, plant: 14, cabinet: 20 }[f.kind] ?? 12;
    const c = document.createElement("canvas"); c.width = w; c.height = d + faceH; const g = c.getContext("2d");
    const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    const seed = hash(f.id);
    switch (f.kind) {
      case "desk": case "table": case "computers": {
        px(0, 0, w, d, PAL.woodTop); px(0, 0, w, 1, "#eccb97"); px(0, d, w, faceH, PAL.wood); px(0, d + faceH - 2, w, 2, PAL.woodDark); px(0, d, 2, faceH, PAL.woodDark); px(w - 2, d, 2, faceH, PAL.woodDark);
        if (w >= 24) { px(3, 3, 7, 9, PAL.paper); px(4, 5, 5, 1, "#b9b2a4"); px(4, 7, 5, 1, "#b9b2a4"); }
        if (f.kind === "computers") { px(w - 13, 2, 10, 7, PAL.ink); px(w - 12, 3, 8, 5, "#5a8fb8"); px(w - 9, 9, 2, 2, PAL.ink); }
        else if (seed % 3 === 0 && w >= 30) { px(w - 14, 3, 11, 8, "#2e2e30"); px(w - 13, 4, 9, 6, "#6ea0c8"); }
        else if (seed % 3 === 1 && w >= 30) { px(w - 12, 4, 8, 6, PAL.paper); px(w - 11, 2, 6, 2, PAL.metalLight); px(w - 9, 3, 2, 4, "#d8d2c4"); }
        if (seed % 2 === 0 && w >= 24 && d >= 12) { px(Math.floor(w / 2), d - 5, 3, 3, "#c9553f"); }
        break;
      }
      case "chair": { px(2, 1, w - 4, Math.max(3, d - 2), PAL.cushion); px(2, 1, w - 4, 2, PAL.cushionDark); px(2, d, w - 4, faceH, PAL.cushionDark); px(3, d + faceH - 2, 2, 2, PAL.ink); px(w - 5, d + faceH - 2, 2, 2, PAL.ink); break; }
      case "seating": { px(0, 0, w, d, PAL.cushion); for (let x = 0; x < w; x += 12) px(x, 2, 1, d - 4, PAL.cushionDark); px(0, 0, w, 2, PAL.cushionDark); px(0, d, w, faceH, PAL.cushionDark); px(0, d + faceH - 2, w, 2, PAL.ink); break; }
      case "pinup": {
        px(0, 0, w, d, "#7a6a55"); px(0, d, w, faceH, "#c9b48c"); px(0, d, w, 1, "#7a6a55"); px(0, d + faceH - 2, w, 2, "#7a6a55");
        let x = 2; let n = 0; while (x + 6 < w) { const hh = 7 + ((seed + n) % 3) * 2; px(x, d + 3 + ((seed + n * 7) % 5), 6, hh, (seed + n) % 4 === 0 ? "#d9d9e8" : PAL.paper); px(x + 2, d + 2 + ((seed + n * 7) % 5), 1, 1, "#c9553f"); x += 8; n++; }
        break;
      }
      case "counter": { px(0, 0, w, d, PAL.woodTop); px(0, d, w, faceH, PAL.wood); px(0, d + faceH - 3, w, 3, PAL.woodDark); for (let x = 3; x + 4 < w; x += 9) { px(x, 1, 3, 5, ["#4f8a5a", "#c9553f", "#e6c35c"][(seed + x) % 3]); px(x + 1, 0, 1, 1, PAL.ink); } break; }
      case "printer": { px(0, 0, w, d, PAL.metalLight); px(0, d, w, faceH, PAL.metal); px(2, d + 3, w - 4, 6, "#3a3a3a"); px(4, d + 5, 2, 2, "#6fd36f"); px(0, d + faceH - 2, w, 2, "#5a5f64"); break; }
      case "bin": { px(2, 1, w - 4, d - 1, "#4e6a7a"); px(2, d, w - 4, faceH, "#3b515e"); break; }
      case "shelf": { px(0, 0, w, d, PAL.woodDark); px(0, d, w, faceH, PAL.wood); for (let s = 4; s < faceH - 4; s += 10) { px(1, d + s, w - 2, 1, PAL.woodDark); for (let x = 2; x + 3 < w; x += 4) px(x, d + s - 6, 3, 6, ["#c9553f", "#4f8a5a", "#5a8fb8", "#e6c35c", PAL.paper][(seed + x + s) % 5]); } px(0, d + faceH - 2, w, 2, PAL.woodDark); break; }
      case "cabinet": { px(0, 0, w, d, PAL.metalLight); px(0, d, w, faceH, PAL.metal); px(2, d + 3, w - 4, 1, "#5a5f64"); px(2, d + 10, w - 4, 1, "#5a5f64"); px(Math.floor(w / 2) - 1, d + 5, 2, 2, PAL.ink); px(0, d + faceH - 2, w, 2, "#5a5f64"); break; }
      case "plant": { px(3, 2, w - 6, d - 2, PAL.greenDark); px(4, 1, w - 8, d - 3, PAL.green); px(5, d, w - 10, faceH - 2, "#a3552f"); px(4, d + faceH - 3, w - 8, 3, "#7a3f22"); break; }
      default: { px(0, 0, w, d, PAL.metalLight); px(0, d, w, faceH, PAL.metal); px(0, d + faceH - 2, w, 2, "#5a5f64"); px(2, 2, w - 4, 1, "#e6e8ea"); }
    }
    this.spriteCache.set(key, c); return c;
  }

  // ---------- character sprites: 16 x 24, four facings, two walk frames, a seated pose
  personSprite(p, dir, frame, seated, followed) {
    const col = this.colorsFor(p); const key = `${col.key}|${dir}|${frame}|${seated ? 1 : 0}|${followed ? 1 : 0}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key);
    const c = document.createElement("canvas"); c.width = 16; c.height = 24; const g = c.getContext("2d");
    const px = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
    const legY = seated ? 17 : 16; const bob = !seated && frame === 1 ? 1 : 0;
    if (!seated) { px(4, legY + bob, 3, 7 - bob, col.pants); px(9, legY + (1 - bob), 3, 6 + bob, col.pants); px(4, 22, 3, 2, PAL.ink); px(9, 22, 3, 2, PAL.ink); }
    else { px(3, 17, 10, 4, col.pants); px(3, 21, 4, 2, PAL.ink); px(9, 21, 4, 2, PAL.ink); }
    px(3, 10 + bob, 10, 7, col.shirt); if (p.role !== "student") { px(3, 10 + bob, 2, 7, col.jacket); px(11, 10 + bob, 2, 7, col.jacket); }
    if (dir !== "up") { px(2, 11 + bob, 2, 4, col.skin); px(12, 11 + bob, 2, 4, col.skin); } else { px(2, 11 + bob, 2, 4, col.shirt); px(12, 11 + bob, 2, 4, col.shirt); }
    px(4, 2 + bob, 8, 8, col.skin); px(3, 1 + bob, 10, 4, col.hair); px(3, 5 + bob, 1, 3, col.hair); px(12, 5 + bob, 1, 3, col.hair);
    if (dir === "up") px(4, 2 + bob, 8, 7, col.hair);
    else if (dir === "down") { px(5, 6 + bob, 1, 1, PAL.ink); px(10, 6 + bob, 1, 1, PAL.ink); if (followed || col.glasses) { px(4, 6 + bob, 3, 1, followed ? "#c9553f" : PAL.ink); px(9, 6 + bob, 3, 1, followed ? "#c9553f" : PAL.ink); } }
    else if (dir === "left") { px(5, 6 + bob, 1, 1, PAL.ink); px(3, 4 + bob, 2, 4, col.hair); if (followed) px(4, 6 + bob, 3, 1, "#c9553f"); }
    else { px(10, 6 + bob, 1, 1, PAL.ink); px(11, 4 + bob, 2, 4, col.hair); if (followed) px(9, 6 + bob, 3, 1, "#c9553f"); }
    this.spriteCache.set(key, c); return c;
  }
  colorsFor(p) {
    const h = hash(p.id);
    const skins = ["#f1c9a5", "#e0a97e", "#c98a5e", "#8d5a3b", "#f6d8bf"]; const hairs = ["#2b2622", "#4a3222", "#8a5a32", "#b9b2a4", "#1f1f1f", "#6b3b2a"];
    const shirts = { focused: "#4f7fb0", social: "#d9873c", restless: "#5f9a4a", prof: "#3a3a3a", office: "#6b5a7a" }; const alt = ["#c9553f", "#2f8f85", "#8f5fa8", "#d6b24a"];
    const shirt = p.role === "student" ? (h % 3 === 0 ? alt[(h >> 2) % alt.length] : shirts[p.style] || "#4f7fb0") : shirts[p.role === "prof" ? "prof" : "office"];
    return { key: `${skins[h % 5]}${hairs[(h >> 3) % 6]}${shirt}${p.role}`, skin: skins[h % 5], hair: hairs[(h >> 3) % 6], shirt, pants: h % 2 ? "#2f4a7a" : "#4a4a52", jacket: "#5a4a3a", glasses: (h >> 5) % 4 === 0 };
  }

  // ---------- frame
  draw(sim) {
    const st = this.stage; const ctx = st.ctx; const z = st.zoom || 2;
    if (!(st.W >= 2 && st.H >= 2)) return;
    const nw = Math.ceil(st.W / z) + 1, nh = Math.ceil(st.H / z) + 1;
    if (!this.frame || this.frame.width !== nw || this.frame.height !== nh) { this.frame = document.createElement("canvas"); this.frame.width = nw; this.frame.height = nh; }
    const g = this.frame.getContext("2d"); g.imageSmoothingEnabled = false;
    const vx = (x) => this.nx(x) - this.nx(0) + Math.round(st.ox / z), vy = (y) => this.ny(y) - this.ny(0) + Math.round(st.oy / z);
    g.fillStyle = PAL.void; g.fillRect(0, 0, nw, nh);
    const fx = vx(this.x0), fy = vy(this.y1);
    g.drawImage(this.floor, fx, fy);
    if (this.plan.bar && sim.t >= BAR_START) { const b = this.plan.bar.area; g.fillStyle = "rgba(243,198,107,0.22)"; g.fillRect(vx(b[0]), vy(b[3]), (b[2] - b[0]) * PPM, (b[3] - b[1]) * PPM); }
    if (sim.queue && sim.queue.members.length && sim.queueSlots) { g.fillStyle = PAL.amberDark; for (let i = 0; i < Math.min(sim.queue.members.length + 2, sim.queueSlots.length); i++) { const s = sim.queueSlots[i]; g.fillRect(vx(s[0]) - 1, vy(s[1]) - 1, 2, 2); } }
    // door states: open while someone is within a metre
    for (const dd of this.doors) { let near = false; for (const a of sim.agents) { if (!a.onFloor) continue; if (Math.hypot(a.x - dd.d.center[0], a.y - dd.d.center[1]) < 1.0) { near = true; break; } } dd.open = near ? Math.min(1, dd.open + 0.2) : Math.max(0, dd.open - 0.1); }
    const agents = []; const sel = st.selected;
    for (const a of sim.agents) if (a.onFloor) { const p = sim.personById[a.id]; const j = Math.floor((this.y1 - a.y) / TILE_M); agents.push({ a, p, j, y: a.y }); }
    agents.sort((p, q) => p.j - q.j || q.y - p.y);
    let ai = 0; const now = performance.now();
    const firstRow = Math.max(0, Math.floor((fy < 0 ? -fy : 0) / TILE) - 4), lastRow = Math.min(this.rows - 1, Math.ceil((nh - fy) / TILE) + 1);
    for (let j = 0; j < this.rows; j++) {
      if (j >= firstRow && j <= lastRow) { const s = this.strips[j]; if (s) g.drawImage(s.c, fx, fy + s.top); for (const dd of this.doors) { if (dd.axis === "x" && dd.row === j) this.drawFaceDoor(g, dd, vx, vy); else if (dd.axis === "y" && dd.j1 - 1 === j) this.drawPlanDoor(g, dd, vx, vy); } }
      while (ai < agents.length && agents[ai].j === j) { const { a, p } = agents[ai++]; if (j < firstRow || j > lastRow) continue; this.drawPerson(g, a, p, vx, vy, now, sel); }
      while (ai < agents.length && agents[ai].j < j) ai++;
    }
    g.drawImage(this.glazing, fx, fy);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, st.W, st.H);
    ctx.drawImage(this.frame, 0, 0, nw, nh, 0, 0, nw * z, nh * z);
    ctx.imageSmoothingEnabled = true;
    st.drawOverlays(sim);
  }
  // a door in an east-west wall: the opening is whole tiles, the door its real width; what is left of the opening is
  // jamb, or glass for a door with a sidelite; a double door has two leaves; the leaves slide open as people pass
  drawFaceDoor(g, dd, vx, vy) {
    const x0 = vx(this.x0 + dd.i0 * TILE_M) + 1, x1 = vx(this.x0 + (dd.i1 + 1) * TILE_M) - 1; const w = x1 - x0;
    const yWall = vy(this.y1 - (dd.row + 1) * TILE_M); const h = DOOR_H; const open = dd.open;
    const bb = dd.d.bbox; let dx0 = Math.max(x0, vx(bb[0])), dx1 = Math.min(x1, vx(bb[2])); if (dx1 - dx0 < 6) { dx0 = x0; dx1 = x1; }
    const name = dd.d.name || ""; const sidelite = /sidelite/i.test(name); const double = /double/i.test(name);
    g.fillStyle = PAL.wallFace; g.fillRect(x0, yWall - h, w, h); g.fillStyle = PAL.base; g.fillRect(x0, yWall - 3, w, 3);
    if (sidelite) {
      const leafMax = Math.min(dx1 - dx0, Math.round(1.0 * PPM)); const side = dx1 - dx0 - leafMax;
      if (side > 2) { g.fillStyle = PAL.glass; g.fillRect(dx0 + leafMax, yWall - h, side, h); g.fillStyle = PAL.glassLight; g.fillRect(dx0 + leafMax + 2, yWall - h + 2, Math.max(1, side - 4), h - 6); g.fillStyle = PAL.mullion; g.fillRect(dx0 + leafMax, yWall - h, 1, h); g.fillRect(dx0 + leafMax + side - 1, yWall - h, 1, h); }
      dx1 = dx0 + leafMax;
    }
    g.fillStyle = "#2a241f"; g.fillRect(dx0, yWall - h, dx1 - dx0, h);
    const leaves = double ? 2 : 1; const lw = Math.floor((dx1 - dx0) / leaves);
    for (let n = 0; n < leaves; n++) {
      const lx = dx0 + n * lw; const leafW = Math.max(4, Math.round(lw * (1 - open * 0.85))); const at = double && n === 1 ? lx + lw - leafW : lx;
      if (dd.glass) { g.fillStyle = PAL.mullion; g.fillRect(at, yWall - h, leafW, h); g.fillStyle = PAL.glass; g.fillRect(at + 2, yWall - h + 2, Math.max(1, leafW - 4), h - 4); g.fillStyle = PAL.glassLight; g.fillRect(at + 3, yWall - h + 3, Math.max(1, Math.floor(leafW / 3)), h - 8); }
      else { g.fillStyle = PAL.door; g.fillRect(at, yWall - h, leafW, h); g.fillStyle = PAL.doorDark; g.fillRect(at, yWall - h, leafW, 2); g.fillRect(at, yWall - 3, leafW, 3); if (leafW > 8) { g.fillStyle = PAL.doorLight; g.fillRect(at + 2, yWall - h + 4, leafW - 4, Math.floor(h / 2) - 6); g.fillStyle = PAL.doorDark; const hx = double && n === 1 ? at + 2 : at + leafW - 4; g.fillRect(hx, yWall - Math.floor(h / 2), 2, 3); } }
    }
  }
  // a door in a north-south wall: a post at each end, the leaf in plan at cap height, the sidelite beside it. It is drawn
  // at its own depth: after the walls north of it, before the strip of its south end, so the wall at its south end and
  // everything further south is painted later and stands in front of it
  drawPlanDoor(g, dd, vx, vy) {
    const x = vx(this.x0 + (dd.col + 0.5) * TILE_M); const y0 = vy(this.y1 - dd.j0 * TILE_M) - WALL_H, y1 = vy(this.y1 - (dd.j1 + 1) * TILE_M) - WALL_H; const len = y1 - y0;
    const open = dd.open; const sidelite = /sidelite/i.test(dd.d.name || ""); const wallHost = dd.host !== "glass";
    if (wallHost) {
      // the door alone: a post at an end the wall does not already hold, the leaf and the sidelite; nothing painted behind it
      const cols = this.cols; const wallAt = (j) => j >= 0 && j < this.rows && this.kind[j * cols + dd.col] === 2;
      if (!wallAt(dd.j0 - 1)) { g.fillStyle = PAL.wallCap; g.fillRect(x - 8, y0 - 4, 16, 4); g.fillStyle = PAL.wallEdge; g.fillRect(x - 8, y0 - 1, 16, 1); }
      if (!wallAt(dd.j1 + 1)) { g.fillStyle = PAL.wallCap; g.fillRect(x - 8, y1, 16, 4); g.fillStyle = PAL.wallEdge; g.fillRect(x - 8, y1, 16, 1); } }
    else { g.fillStyle = PAL.mullion; g.fillRect(x - 2, y0 - 1, 5, 3); g.fillRect(x - 2, y1 - 2, 5, 3); }
    let leafLen = len - 2; if (sidelite) { leafLen = Math.min(leafLen, Math.round(1.0 * PPM)); const sy = y0 + 1 + leafLen; if (y1 - 1 - sy > 2) { g.fillStyle = PAL.mullion; g.fillRect(x - 1, sy, 4, y1 - 1 - sy); g.fillStyle = PAL.glass; g.fillRect(x, sy + 1, 2, y1 - 2 - sy); } }
    if (open < 0.5) { g.fillStyle = dd.glass ? PAL.glass : PAL.door; g.fillRect(x - 1, y0 + 1, 4, Math.max(2, Math.round(leafLen * (1 - open)))); g.fillStyle = dd.glass ? PAL.mullion : PAL.doorDark; g.fillRect(x - 1, y0 + 1, 1, Math.max(2, Math.round(leafLen * (1 - open)))); }
    else { const side = this.x0 + dd.col * TILE_M > (this.x0 + this.cols * TILE_M / 2) ? -1 : 1; const l = Math.round(leafLen * Math.min(1, (open - 0.5) * 2 + 0.3)); g.fillStyle = dd.glass ? PAL.glass : PAL.door; g.fillRect(side > 0 ? x + 1 : x - l - 1, y0 + 1, l, 4); }
  }
  drawPerson(g, a, p, vx, vy, now, sel) {
    const last = this.last.get(a.id) || { x: a.x, y: a.y, dir: p.facing ? facingOf(p.facing[0], p.facing[1]) : "down", t: now };
    const dx = a.x - last.x, dy = a.y - last.y; let dir = last.dir;
    const moving = Math.hypot(dx, dy) > 0.01 && (a.state === "go");
    if (moving) dir = facingOf(dx, dy); else if ((a.state === "work" || a.state === "sit") && p.facing) dir = facingOf(p.facing[0], p.facing[1]);
    this.last.set(a.id, { x: a.x, y: a.y, dir, t: now });
    const seated = a.state === "work" || a.state === "sit" || a.inCrit || (a.state === "dwell" && a.breakKind === "lunchDesk");
    const frame = moving ? Math.floor(now / 160) % 2 : 0;
    const spr = this.personSprite(p, dir, frame, seated, sel === a.id);
    const x = vx(a.x) - 8, y = vy(a.y) - 24;
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x + 3, y + 22, 10, 2);
    // people stay solid: mood only tints the lower end a little, and the others fade gently while someone is followed
    let alpha = 0.72 + 0.28 * a.mood; const st = this.stage;
    if (st.opts.followDim && sel && a.id !== sel) alpha *= 0.55; else if (st.opts.focusType && p.typeId !== st.opts.focusType) alpha *= 0.45;
    g.globalAlpha = alpha; g.drawImage(spr, x, y); g.globalAlpha = 1;
    if (a.inCrit || a.state === "crit") { g.fillStyle = PAL.amber; g.fillRect(x + 6, y - 4, 4, 3); }
    if (sel === a.id) { g.fillStyle = "#c9553f"; g.fillRect(x + 7, y - 7, 2, 2); g.fillRect(x + 6, y - 5, 4, 1); }
  }
}

// the 10 cm raster: solids grey, centrelines red, column tiles blue, for checking
export function exportRaster(px) {
  const { G, K, gw, gh, S } = px.raster; const c = document.createElement("canvas"); c.width = gw * 2; c.height = gh * 2; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  for (let py = 0; py < gh; py++) for (let px2 = 0; px2 < gw; px2++) { const o = py * gw + px2; if (G[o]) { g.fillStyle = "#bbb"; g.fillRect(px2 * 2, py * 2, 2, 2); } }
  for (let j = 0; j < px.rows; j++) for (let i = 0; i < px.cols; i++) { const idx = j * px.cols + i; if (px.isCol[idx]) { g.fillStyle = "rgba(60,120,220,0.45)"; g.fillRect(i * S * 2, j * S * 2, S * 2, S * 2); } else if (px.kind[idx] === 2) { g.fillStyle = "rgba(240,200,60,0.35)"; g.fillRect(i * S * 2, j * S * 2, S * 2, S * 2); } else if (px.kind[idx] === 4) { g.fillStyle = "rgba(60,200,120,0.5)"; g.fillRect(i * S * 2, j * S * 2, S * 2, S * 2); } }
  for (let py = 0; py < gh; py++) for (let px2 = 0; px2 < gw; px2++) { const o = py * gw + px2; if (K[o]) { g.fillStyle = "#d22"; g.fillRect(px2 * 2, py * 2, 2, 2); } }
  return c;
}
// the whole map without people, for inspection
export function exportMap(px) {
  const c = document.createElement("canvas"); c.width = px.W; c.height = px.H; const g = c.getContext("2d");
  g.drawImage(px.floor, 0, 0);
  const vx = (x) => px.nx(x), vy = (y) => px.ny(y);
  for (let j = 0; j < px.rows; j++) { const s = px.strips[j]; if (s) g.drawImage(s.c, 0, s.top); for (const dd of px.doors) { if (dd.axis === "x" && dd.row === j) px.drawFaceDoor(g, dd, vx, vy); else if (dd.axis === "y" && dd.j1 - 1 === j) px.drawPlanDoor(g, dd, vx, vy); } }
  g.drawImage(px.glazing, 0, 0);
  return c;
}
function facingOf(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "up" : "down"); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function ringBox(ring) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of ring) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }
