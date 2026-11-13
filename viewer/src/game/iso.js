import { PAL, canvas, px, addCanvas, styleOf, SKIP_KINDS, INFERRED } from './tileset.js';

// The pixel isometric of one floor, from the same tile map as the plan: a 2:1 dimetric with
// every tile a 32 x 16 diamond, walls as blocks with a near-white cap and two lit faces,
// glazing, doors and columns as blocks of their own, furniture as boxes at their plan
// footprint and height. Seen from one of four corners (azimuth 0 south-west, then clockwise,
// as the three.js scene names them). Drawn crisp by scanline fills, no anti-aliasing, so it
// scales by whole numbers like the plan. No people and no context here: the isometric is
// the geometry check.
export const ISO = { HW: 16, HH: 8, WALL: 48, DOOR: 36, PPM_Z: 14 }; // half diamond, heights in px (a storey is 48)

/** The screen frame for a floor at an azimuth: axes u (to the upper right) and v (to the upper left), origin at the nearest corner. */
export function isoFrame(L, az) {
  const { cols, rows } = L;
  const odd = az % 2 === 1;
  const nu = odd ? rows : cols, nv = odd ? cols : rows;
  // continuous tile coordinates (x east, y south, in tiles) -> (u, v)
  const uv = (x, y) => az === 0 ? [x, rows - y] : az === 1 ? [rows - y, cols - x] : az === 2 ? [cols - x, y] : [y, x];
  const x0 = nv * ISO.HW + 2, y0 = (nu + nv) * ISO.HH + ISO.WALL + 8;
  const W = (nu + nv) * ISO.HW + 4, H = y0 + ISO.HH + 8;
  const sx = (u, v) => x0 + (u - v) * ISO.HW;
  const sy = (u, v, z = 0) => y0 - (u + v) * ISO.HH - z;
  return { nu, nv, uv, W, H, sx, sy, odd, az };
}

// crisp convex polygon: one fillRect per scanline
function fillPoly(g, pts, col) {
  let yMin = Infinity, yMax = -Infinity;
  for (const [, y] of pts) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
  g.fillStyle = col;
  for (let y = Math.round(yMin); y <= Math.round(yMax); y++) {
    let xl = Infinity, xr = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if (y < Math.min(ay, by) || y > Math.max(ay, by)) continue;
      if (ay === by) { xl = Math.min(xl, ax, bx); xr = Math.max(xr, ax, bx); }
      else { const x = ax + (bx - ax) * (y - ay) / (by - ay); xl = Math.min(xl, x); xr = Math.max(xr, x); }
    }
    if (xl <= xr) g.fillRect(Math.round(xl), y, Math.round(xr) - Math.round(xl) + 1, 1);
  }
}
function line(g, a, b, col) {
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)));
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(a[0] + dx * i / n), Math.round(a[1] + dy * i / n), 1, 1);
}

/** Build the isometric canvas; returns the texture key, its size and the frame (for labels). */
export function buildIso(scene, L, key, az) {
  const F = isoFrame(L, az);
  const { cols, rows } = L, tm = L.tile_m;
  const { nu, nv } = F;
  // the tile grids in (u, v) space
  const idx = (u, v) => v * nu + u;
  const struct = new Uint8Array(nu * nv), floor = new Int16Array(nu * nv), dir = new Uint8Array(nu * nv);
  // door tiles that are doorways without a panel (an edit with leaf: false)
  const doorway = new Set();
  for (const d of L.doors) if (d.leaf === false) for (const t of (d.tiles && d.tiles.length ? d.tiles : [d.tile])) if (t) doorway.add(t[0] + ',' + t[1]);
  const open = new Uint8Array(nu * nv);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [ua, va] = F.uv(c, r), [ub, vb] = F.uv(c + 1, r + 1);
    const u = Math.min(ua, ub), v = Math.min(va, vb);
    const i = idx(u, v);
    struct[i] = L.struct[r][c]; floor[i] = L.floor[r][c]; open[i] = doorway.has(c + ',' + r) ? 1 : 0;
    const d = L.dir[r][c]; dir[i] = F.odd && d ? (d === 1 ? 2 : 1) : d; // an east-west run lies along u at even azimuths, along v at odd
  }
  const at = (u, v, arr = struct) => (u >= 0 && v >= 0 && u < nu && v < nv) ? arr[idx(u, v)] : 0;
  const wallAt = (u, v) => at(u, v) === 1 || at(u, v) === 3 || at(u, v) === 4 || at(u, v) === 2;
  const roomByIdx = new Map(L.rooms.map((r) => [r.idx, r]));

  const [c, g] = canvas(F.W, F.H);
  const P = (u, v, z = 0) => [Math.round(F.sx(u, v)), Math.round(F.sy(u, v, z))];
  const diamond = (u0, v0, u1, v1, z, fill) => fillPoly(g, [P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], fill);
  // a block: the west face (lower left), the south face (lower right), then the top; `edges` names which top
  // edges to outline (S E N W), `sides` which vertical edges (W0 at the near corner is always drawn)
  const block = (u0, v0, u1, v1, z0, z1, col, edges = 'SENW', sides = 'ab') => {
    const west = [P(u0, v0, z0), P(u0, v1, z0), P(u0, v1, z1), P(u0, v0, z1)];
    const south = [P(u0, v0, z0), P(u1, v0, z0), P(u1, v0, z1), P(u0, v0, z1)];
    const top = [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)];
    if (col.west) fillPoly(g, west, col.west);
    if (col.south) fillPoly(g, south, col.south);
    if (col.base) { fillPoly(g, [P(u0, v0, z0), P(u1, v0, z0), P(u1, v0, z0 + 3), P(u0, v0, z0 + 3)], col.base); fillPoly(g, [P(u0, v0, z0), P(u0, v1, z0), P(u0, v1, z0 + 3), P(u0, v0, z0 + 3)], col.base); }
    if (col.top) fillPoly(g, top, col.top);
    if (col.edge) {
      line(g, west[0], west[3], col.edge); // the near vertical corner
      if (sides.includes('a')) line(g, west[1], west[2], col.edge);
      if (sides.includes('b')) line(g, south[1], south[2], col.edge);
      line(g, west[0], west[1], col.edge); line(g, south[0], south[1], col.edge); // the feet
      if (edges.includes('S')) line(g, top[0], top[1], col.edge);
      if (edges.includes('E')) line(g, top[1], top[2], col.edge);
      if (edges.includes('N')) line(g, top[2], top[3], col.edge);
      if (edges.includes('W')) line(g, top[3], top[0], col.edge);
    }
  };

  // ---------------- the floor: every diamond, far to near
  for (let k = nu + nv - 2; k >= 0; k--) for (let u = Math.max(0, k - nv + 1); u <= Math.min(nu - 1, k); u++) {
    const v = k - u, i = idx(u, v), f = floor[i], s = struct[i];
    if (f === 0) continue;
    const style = f >= 2 ? styleOf(roomByIdx.get(f)) : 'studio';
    let fill = PAL.floor;
    if (style === 'kitchen') fill = (u + v) % 2 ? PAL.kitchenA : PAL.kitchenB;
    else if (style === 'office') fill = PAL.office;
    else if (style === 'hall') fill = PAL.hall;
    if (s === 5) fill = '#8a8578';
    diamond(u, v, u + 1, v + 1, 0, fill);
    if (style === 'studio' && s !== 5) {
      if (u % 4 === 0) line(g, P(u, v), P(u, v + 1), PAL.floorLine);
      if (v % 4 === 0) line(g, P(u, v), P(u + 1, v), PAL.floorLine);
    }
    if (s === 4) { line(g, P(u, v), P(u + 1, v), PAL.floorDark); line(g, P(u, v), P(u, v + 1), PAL.floorDark); }
    if (s === 5) { // treads across the run
      const alongU = dir[i] !== 2;
      for (const t of [0.25, 0.5, 0.75]) alongU ? line(g, P(u + t, v), P(u + t, v + 1), '#6e6a63') : line(g, P(u, v + t), P(u + 1, v + t), '#6e6a63');
    }
  }

  // ---------------- what stands: wall, glass, column and door tiles, and furniture boxes, far to near
  const items = [];
  // column tiles that touch are one column (a 1 m column covers 2 x 2 tiles): one block over their extent
  const seenCol = new Uint8Array(nu * nv);
  for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) {
    const s = struct[idx(u, v)];
    if (s === 1 || s === 2 || s === 4) items.push({ key: u + v, order: 1, u, v, s });
    else if (s === 3 && !seenCol[idx(u, v)]) {
      const stack = [[u, v]]; seenCol[idx(u, v)] = 1; let u0 = u, v0 = v, u1 = u, v1 = v;
      while (stack.length) {
        const [a, b] = stack.pop(); u0 = Math.min(u0, a); v0 = Math.min(v0, b); u1 = Math.max(u1, a); v1 = Math.max(v1, b);
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + da, y = b + db; if (at(x, y) === 3 && !seenCol[idx(x, y)]) { seenCol[idx(x, y)] = 1; stack.push([x, y]); } }
      }
      items.push({ key: u0 + v0, order: 1, u: u0, v: v0, s: 3, u1: u1 + 1, v1: v1 + 1 });
    }
  }
  for (const f of L.furniture) {
    if (SKIP_KINDS.has(f.kind)) continue;
    const x = f.x / tm, y = f.y / tm, w = f.w / tm, d = f.d / tm;
    const cs = [F.uv(x, y), F.uv(x + w, y), F.uv(x, y + d), F.uv(x + w, y + d)];
    const u0 = Math.min(...cs.map((p) => p[0])), u1 = Math.max(...cs.map((p) => p[0])), v0 = Math.min(...cs.map((p) => p[1])), v1 = Math.max(...cs.map((p) => p[1]));
    items.push({ key: u0 + v0, order: 2, f, u0, v0, u1, v1 });
  }
  items.sort((a, b) => b.key - a.key || a.order - b.order);
  const extS = (u, v) => at(u, v - 1, floor) === 0, extW = (u, v) => at(u - 1, v, floor) === 0;
  for (const it of items) {
    if (it.order === 1) {
      const { u, v, s } = it;
      const edges = (wallAt(u, v - 1) ? '' : 'S') + (wallAt(u + 1, v) ? '' : 'E') + (wallAt(u, v + 1) ? '' : 'N') + (wallAt(u - 1, v) ? '' : 'W');
      const sides = (wallAt(u, v + 1) ? '' : 'a') + (wallAt(u + 1, v) ? '' : 'b');
      if (s === 3) {
        block(u + 0.15, v + 0.15, it.u1 - 0.15, it.v1 - 0.15, 0, ISO.WALL, { top: PAL.wallCap, south: PAL.wallFace, west: PAL.wallFaceDark, base: PAL.base, edge: PAL.wallEdge }, 'SENW', 'ab');
      } else if (s === 1) {
        block(u, v, u + 1, v + 1, 0, ISO.WALL,
          { top: PAL.wallCap, south: extS(u, v) ? PAL.extFace : PAL.wallFace, west: extW(u, v) ? PAL.extFaceDark : PAL.wallFaceDark, base: PAL.base, edge: PAL.wallEdge }, edges, sides);
      } else if (s === 2) {
        block(u, v, u + 1, v + 1, 0, ISO.WALL, { top: PAL.mullion, south: PAL.glass, west: '#7fb5cc', edge: PAL.mullion }, edges, sides);
        // a lighter pane stripe on each face
        fillPoly(g, [P(u + 0.15, v, 6), P(u + 0.4, v, 6), P(u + 0.4, v, ISO.WALL - 6), P(u + 0.15, v, ISO.WALL - 6)], PAL.glassLight);
      } else if (s === 4) {
        if (!open[idx(u, v)]) block(u, v, u + 1, v + 1, 0, ISO.DOOR, { south: PAL.door, west: PAL.doorDark, edge: PAL.doorDark }, '', sides); // a doorway without a panel stays open below its header
        block(u, v, u + 1, v + 1, ISO.DOOR, ISO.WALL, { top: PAL.wallCap, south: PAL.wallFace, west: PAL.wallFaceDark, edge: open[idx(u, v)] ? INFERRED : PAL.wallEdge }, edges, sides);
      }
    } else {
      const { f, u0, v0, u1, v1 } = it;
      const z0 = Math.min(ISO.WALL - 6, Math.round((f.z || 0) * ISO.PPM_Z)); // an added object above the floor
      const h = f.kind === 'chair' ? 6 : f.kind === 'elevator' ? ISO.WALL - 4 : Math.max(2, Math.min(ISO.WALL - 4 - z0, Math.round((f.h || 0.7) * ISO.PPM_Z)));
      let C = {
        desk: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' }, table: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' },
        computers: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' }, cutting: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' },
        chair: { top: PAL.cushion, south: PAL.cushionDark, west: '#7a3528', edge: '#5a2a20' }, seating: { top: PAL.cushion, south: PAL.cushionDark, west: '#7a3528', edge: '#5a2a20' },
        pinup: { top: '#7a6a55', south: '#c9b48c', west: '#a8956f', edge: '#5a4d3c' }, counter: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' },
        printer: { top: PAL.metalLight, south: PAL.metal, west: '#7c8186', edge: '#5a5f64' }, bin: { top: '#5a7686', south: '#4e6a7a', west: '#3b515e', edge: '#2f4150' },
        elevator: { top: '#7f858b', south: '#b7bdc3', west: PAL.metal, edge: '#5a5f64' },
        pinup_wall: { top: '#7a6a55', south: '#9c8f72', west: '#8a7d62', edge: '#5a4d3c' }, screen: { top: '#3a3a3a', south: '#f2f2f2', west: '#dcdcdc', edge: '#3a3a3a' },
        projector: { top: PAL.metalLight, south: PAL.metal, west: '#7c8186', edge: '#5a5f64' },
        fridge: { top: '#e8e9ea', south: '#f4f4f4', west: '#d6d8da', edge: '#8a9096' }, microwave: { top: '#4a4d50', south: '#3a3a3a', west: '#2e2e2e', edge: '#1f1f1f' },
        kettle: { top: PAL.metalLight, south: PAL.metal, west: '#7c8186', edge: '#5a5f64' }, coffee_machine: { top: '#3a3a3a', south: '#2a2a2a', west: '#222', edge: '#111' },
        sink: { top: '#8f969c', south: PAL.metal, west: '#7c8186', edge: '#5a5f64' }, bar: { top: PAL.woodTop, south: '#3b2a1e', west: '#2e2017', edge: '#1f150e' },
        beer_tap: { top: PAL.metalLight, south: PAL.metal, west: '#7c8186', edge: '#5a5f64' }, pew_bench: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' },
        coffee_table: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' }, serving_table: { top: PAL.woodTop, south: '#3b2a1e', west: '#2e2017', edge: '#1f150e' },
        shelf: { top: PAL.woodTop, south: PAL.wood, west: PAL.woodDark, edge: '#5a3d20' }, printer3d: { top: '#8fa3b0', south: '#2f2f33', west: '#232326', edge: '#1a1a1c' },
        backdrop: { top: '#3a3a3a', south: '#f4f4f2', west: '#dcdcda', edge: '#3a3a3a' }, light_stand: { top: '#fff6c8', south: '#f4f4f2', west: PAL.metal, edge: '#5a5f64' },
        stall: { top: '#d8dcd6', south: '#c9cfc9', west: '#b5bbb5', edge: '#6b7076' }, urinal: { top: '#f4f4f2', south: '#e8eae6', west: '#d0d4d0', edge: '#8a9096' }, machine: { top: '#9aa0a6', south: '#4a4d50', west: '#3a3d40', edge: '#2f2f33' },
      }[f.kind] || { top: PAL.metalLight, south: PAL.metal, west: '#7c8186', edge: '#5a5f64' };
      if (f.inferred) C = { ...C, edge: INFERRED }; // the owner's added objects carry amber edges
      block(u0, v0, u1, v1, z0, z0 + h, C, 'SENW', 'ab');
      if (f.kind === 'computers' || (f.kind === 'desk' && (f.id % 3) === 0)) block(u0 + 0.3, v0 + 0.3, u0 + 0.7, v0 + 0.5, h, h + 6, { top: PAL.ink, south: '#5a8fb8', west: PAL.ink, edge: PAL.ink }, 'SENW', 'ab');
      if (f.kind === 'pinup') for (let t = 0.1; t + 0.2 <= (u1 - u0); t += 0.3) fillPoly(g, [P(u0 + t, v0, 8), P(u0 + t + 0.2, v0, 8), P(u0 + t + 0.2, v0, h - 6), P(u0 + t, v0, h - 6)], PAL.paper);
    }
  }
  return { key: addCanvas(scene, key, c), W: F.W, H: F.H, frame: F };
}
