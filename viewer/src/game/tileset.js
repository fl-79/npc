// The V1 pixel look, ported to the V2 tile maps: the floor as a true plan, every vertical
// surface showing its south face two tiles tall under a near-white cap, furniture drawn per kind
// with a front face, doors with their leaves, and 16 x 24 people. Everything is drawn with
// canvas at native size (16 px = 0.5 m) and scaled by whole numbers. The drawing rules and the
// palette are those of V1 (tool/src/pixel.js), recorded in Handover/V1-graphics-and-plan-geometry.md;
// the geometry comes only from exports/tiles/<level>.json.
export const T = 16;
export const WALL_H = 2 * T;      // visual wall height, two tiles as in the references
export const DOOR_H = T + 10;     // visual door height, below the header

export const PAL = {
  // legibility first: dark exposed concrete floor, light walls, drawn glazing
  void: '#12181e', voidDot: '#1b232a',
  floor: '#5a5955', floorLine: '#64635e', floorDark: '#4e4d49',
  kitchenA: '#8c8571', kitchenB: '#a39c86', office: '#8a6a44', officeLine: '#775a39', hall: '#6e6d67', hallLine: '#64635d',
  stairLine: '#8a8578',
  wallCap: '#fcf9f2', wallEdge: '#2a211a', wallFace: '#d9ccaa', wallFaceDark: '#bfb08c', base: '#3a2e22', extFace: '#b5aea1', extFaceDark: '#948d80', pilaster: '#a39b8d',
  glass: '#9fd4ea', glassLight: '#d8f0fa', mullion: '#1c2a33', door: '#a8713f', doorDark: '#6b4424', doorLight: '#caa06a',
  wood: '#b8824e', woodTop: '#dcaa6c', woodDark: '#7d5430', paper: '#fbf7ec', ink: '#1e1a16', metal: '#9aa0a6', metalLight: '#cfd4d8',
  cushion: '#c45d4a', cushionDark: '#8e3f32', outline: '#2a211a', shade: 'rgba(20, 14, 10, 0.35)', green: '#6aa655', greenDark: '#3f6e32', amber: '#f3c66b', amberDark: '#854f0b',
};

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}
export function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
export function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** Register a canvas as a texture, replacing one of the same key (the scene restarts per floor). */
export function addCanvas(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  return key;
}

// the uses the owner can give a room in the PROGRAM window, with their display names
export const USE_LABELS = {
  studio: 'Studio', office: 'Office', admin: 'Admin / reception', meeting: 'Meeting', class: 'Classroom', crit: 'Crit / pin-up', kitchen: 'Kitchen', lounge: 'Lounge / events',
  photo: 'Photography', shop: 'Workshop / shop', wc: 'WR', storage: 'Storage', service: 'Service / mechanical', hall: 'Circulation / hall', stair: 'Stair', elevator: 'Elevator', other: 'Other',
};

// floor style by room use (the owner's program) or type (the rasteriser's guess); the rest is studio concrete
export function styleOf(room) {
  const t = (room && (room.use || room.type)) || 'room', n = (room && room.name) || '';
  if (t === 'kitchen' || /kitchen/i.test(n)) return 'kitchen';
  if (['office', 'admin', 'meeting', 'lounge'].includes(t) || /office/i.test(n)) return 'office';
  if (['hall', 'stair', 'elevator', 'service', 'wc', 'shop', 'storage', 'photo'].includes(t) || /stair|lobby|elevator|chase|printer|photo/i.test(n)) return 'hall';
  return 'studio';
}

// ---------------------------------------------------------------- the floor, one canvas
// With `voidClear` the tiles outside the slab stay transparent, so a context ground drawn
// underneath shows through; without it they take the void colour with its dots.
export function buildFloor(scene, L, key, { voidClear = false } = {}) {
  const { cols, rows } = L;
  const [c, g] = canvas(cols * T, rows * T);
  const roomByIdx = new Map(L.rooms.map((r) => [r.idx, r]));
  if (!voidClear) px(g, 0, 0, cols * T, rows * T, PAL.void);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const f = L.floor[j][i], s = L.struct[j][i], d = L.dir[j][i];
    const x = i * T, y = j * T;
    if (f === 0) { if (!voidClear && (i * 7 + j * 13) % 11 === 0) px(g, x + 7, y + 9, 2, 2, PAL.voidDot); continue; }
    const style = f >= 2 ? styleOf(roomByIdx.get(f)) : 'studio';
    if (style === 'kitchen') px(g, x, y, T, T, (i + j) % 2 ? PAL.kitchenA : PAL.kitchenB);
    else if (style === 'office') { px(g, x, y, T, T, PAL.office); px(g, x, y + ((i % 2) ? 4 : 11), T, 1, PAL.officeLine); px(g, x + 15, y, 1, T, PAL.officeLine); }
    else if (style === 'hall') { px(g, x, y, T, T, PAL.hall); px(g, x, y + 15, T, 1, PAL.hallLine); px(g, x + 15, y, 1, T, PAL.hallLine); }
    else {
      px(g, x, y, T, T, PAL.floor);
      if (i % 4 === 0) px(g, x, y, 1, T, PAL.floorLine);
      if (j % 4 === 0) px(g, x, y, T, 1, PAL.floorLine);
      if ((i * 3 + j * 5) % 17 === 0) px(g, x + 5, y + 6, 2, 1, PAL.floorDark);
      if ((i * 7 + j * 11) % 13 === 0) px(g, x + 11, y + 12, 1, 1, PAL.floorLine);
    }
    if (s === 4) { px(g, x, y, T, T, PAL.floorDark); px(g, x + 1, y + 1, T - 2, T - 2, PAL.floor); } // threshold
    if (s === 5) { // stair treads, lines across the run
      if (d === 2) for (let q = 0; q < T; q += 4) px(g, x, y + q, T, 1, PAL.stairLine);
      else for (let q = 0; q < T; q += 4) px(g, x + q, y, 1, T, PAL.stairLine);
    }
    if (s === 2) { // a faint footprint of the glazing stays on the floor
      if (d === 2) px(g, x + 7, y, 1, T, PAL.floorDark); else px(g, x, y + 7, T, 1, PAL.floorDark);
    }
  }
  return addCanvas(scene, key, c);
}

// ---------------------------------------------------------------- the urban context, one canvas
// exports/context.json (OpenStreetMap, model coordinates) drawn in the same pixel frame as the
// floor, `margin` tiles beyond it on every side: a ground, green areas, parking, water, roads
// as ribbons, neighbouring buildings as flat blocks with a south face, trees as a canopy on a
// trunk. The Lasserre footprint itself is left out: the floor stands there.
const CTX = {
  ground: '#55614e', groundDot: '#4b5645', green: '#6b8a57', greenDot: '#5f7b4c', parking: '#6b6b67', water: '#5a86a8', waterLight: '#7aa3c0',
  road: '#7d7b76', roadEdge: '#5f5d58', roadDash: '#a9a69e', path: '#8d8779',
  block: '#9a8f82', blockEdge: '#4e463e', blockFace: '#6f655a', blockFaceDark: '#5a5147',
  canopy: '#4f7d44', canopyDark: '#3b6032', trunk: '#5a4030',
};
export function buildContextCanvas(scene, L, ctx, key, margin) {
  const { cols, rows } = L, tm = L.tile_m, [x0, y0] = L.origin;
  const Wc = (cols + 2 * margin) * T, Hc = (rows + 2 * margin) * T;
  const [c, g] = canvas(Wc, Hc);
  const X = (mx) => ((mx - x0) / tm + margin) * T;
  const Y = (my) => ((y0 + rows * tm - my) / tm + margin) * T;
  const poly = (outline, fill, edge, dy = 0) => {
    if (!outline || outline.length < 3) return;
    g.beginPath();
    outline.forEach(([mx, my], i) => { const x = Math.round(X(mx)), y = Math.round(Y(my)) + dy; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath();
    g.fillStyle = fill; g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); }
  };
  px(g, 0, 0, Wc, Hc, CTX.ground);
  for (let y = 0; y < Hc; y += T) for (let x = 0; x < Wc; x += T) if (((x / T) * 7 + (y / T) * 13) % 11 === 0) px(g, x + 6, y + 9, 2, 1, CTX.groundDot);
  for (const a of ctx.areas || []) poly(a.outline, a.kind === 'parking' ? CTX.parking : CTX.green, a.kind === 'parking' ? CTX.roadEdge : CTX.greenDot);
  for (const w of ctx.water || []) { poly(w.outline, CTX.water, CTX.waterLight); }
  // roads: an edge line under a lighter ribbon, and a dash down the middle of the wide ones
  const line = (pts, width, color, dash) => {
    g.strokeStyle = color; g.lineWidth = Math.max(1, Math.round(width / tm * T)); g.lineCap = 'butt'; g.lineJoin = 'round';
    g.setLineDash(dash || []);
    g.beginPath(); pts.forEach(([mx, my], i) => { const x = Math.round(X(mx)), y = Math.round(Y(my)); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.setLineDash([]);
  };
  const roads = (ctx.roads || []).slice().sort((a, b) => (a.width_m || 0) - (b.width_m || 0));
  for (const r of roads) if (r.width_m >= 3) line(r.line, r.width_m + 0.6, CTX.roadEdge);
  for (const r of roads) line(r.line, r.width_m || 2, r.width_m >= 3 ? CTX.road : CTX.path);
  for (const r of roads) if (r.width_m >= 6) line(r.line, 0.25, CTX.roadDash, [12, 10]);
  // buildings as blocks: the face first, shifted south by a height that reads as storeys, then the roof
  for (const b of ctx.buildings || []) {
    if (b.is_lasserre) continue;
    const faceH = Math.max(T, Math.min(4 * T, Math.round(((b.height_m || 4) / 3.3) * T)));
    poly(b.outline, CTX.blockFace, CTX.blockEdge, faceH);
    poly(b.outline, CTX.blockFaceDark, null, Math.round(faceH / 2));
    poly(b.outline, CTX.block, CTX.blockEdge, 0);
  }
  for (const t of ctx.trees || []) {
    const p = t.point || t.xy || (t.x != null ? [t.x, t.y] : null);
    if (!p) continue;
    const r = Math.max(4, Math.round(((t.radius_m || t.canopy_m || 2.5) / tm) * T));
    const x = Math.round(X(p[0])), y = Math.round(Y(p[1]));
    px(g, x - 1, y, 3, r, CTX.trunk);
    g.fillStyle = CTX.canopyDark; g.beginPath(); g.arc(x, y - 2, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = CTX.canopy; g.beginPath(); g.arc(x - 1, y - 3, r - 2, 0, Math.PI * 2); g.fill();
  }
  return addCanvas(scene, key, c);
}

// ---------------------------------------------------------------- furniture sprites
// top in plan, a front face below the south edge (V1 furnitureSprite, same kinds and colours)
const FACE_H = { desk: 10, table: 10, counter: 22, printer: 24, computers: 12, seating: 10, pinup: 30, bin: 8, other: 14, chair: 6, shelf: 34, plant: 14, cabinet: 20, elevator: 34, pinup_wall: 17, screen: 21, projector: 2,
  fridge: 26, microwave: 5, kettle: 4, coffee_machine: 6, sink: 4, bar: 16, beer_tap: 18, pew_bench: 16, coffee_table: 5, serving_table: 14, stall: 14, urinal: 8, machine: 14 };
/** Pixels per metre of height in the plan view (a 2 m board stands 30 px; the isometric uses the same scale). */
export const PPM_Z = 14;
/** The mark of an object the owner added and the model lacks (program/objects.json): amber dashes round it. */
export const INFERRED = '#f3c66b';
/** Thin surfaces on a wall (felt, a screen) are drawn edge on when the wall runs north-south: a strip, no face. */
const edgeOn = (f, w, d) => (f.kind === 'pinup_wall' || f.kind === 'screen' || f.kind === 'backdrop') && w < d;
const spriteCache = new Map();
export function furnitureSprite(f, tileM) {
  const ppm = T / tileM;
  const thin = f.kind === 'pinup_wall' || f.kind === 'screen' || f.kind === 'backdrop';
  const w = Math.max(thin ? 2 : T, Math.round(f.w * ppm)), d = Math.max(thin ? 2 : 4, Math.round(f.d * ppm));
  const seed = hash(f.id);
  const key = `${f.kind}:${w}x${d}:${seed % 6}:${f.inferred ? 'i' : ''}${f.plain ? 'p' : ''}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  // an added object carries its own height, so its face is that tall; a modelled piece uses the kind's face
  const faceH = edgeOn(f, w, d) ? 0 : (f.inferred && f.h && f.kind !== 'stall' ? Math.max(2, Math.round(f.h * PPM_Z)) : (FACE_H[f.kind] ?? 12));
  const [c, g] = canvas(w, d + faceH);
  const P = (x, y, ww, hh, col) => px(g, x, y, ww, hh, col);
  switch (f.kind) {
    case 'desk': case 'table': case 'computers': case 'cutting': {
      P(0, 0, w, d, PAL.woodTop); P(0, 0, w, 1, '#eccb97'); P(0, d, w, faceH, PAL.wood); P(0, d + faceH - 2, w, 2, PAL.woodDark); P(0, d, 2, faceH, PAL.woodDark); P(w - 2, d, 2, faceH, PAL.woodDark);
      if (w >= 24) { P(3, 3, 7, 9, PAL.paper); P(4, 5, 5, 1, '#b9b2a4'); P(4, 7, 5, 1, '#b9b2a4'); }
      if (f.kind === 'computers') { P(w - 13, 2, 10, 7, PAL.ink); P(w - 12, 3, 8, 5, '#5a8fb8'); P(w - 9, 9, 2, 2, PAL.ink); }
      else if (seed % 3 === 0 && w >= 30) { P(w - 14, 3, 11, 8, '#2e2e30'); P(w - 13, 4, 9, 6, '#6ea0c8'); }
      else if (seed % 3 === 1 && w >= 30) { P(w - 12, 4, 8, 6, PAL.paper); P(w - 11, 2, 6, 2, PAL.metalLight); P(w - 9, 3, 2, 4, '#d8d2c4'); }
      if (seed % 2 === 0 && w >= 24 && d >= 12) P(Math.floor(w / 2), d - 5, 3, 3, '#c9553f');
      break;
    }
    case 'chair': { P(2, 1, w - 4, Math.max(3, d - 2), PAL.cushion); P(2, 1, w - 4, 2, PAL.cushionDark); P(2, d, w - 4, faceH, PAL.cushionDark); P(3, d + faceH - 2, 2, 2, PAL.ink); P(w - 5, d + faceH - 2, 2, 2, PAL.ink); break; }
    case 'seating': { P(0, 0, w, d, PAL.cushion); for (let x = 0; x < w; x += 12) P(x, 2, 1, d - 4, PAL.cushionDark); P(0, 0, w, 2, PAL.cushionDark); P(0, d, w, faceH, PAL.cushionDark); P(0, d + faceH - 2, w, 2, PAL.ink); break; }
    case 'pinup': {
      P(0, 0, w, d, '#7a6a55'); P(0, d, w, faceH, '#c9b48c'); P(0, d, w, 1, '#7a6a55'); P(0, d + faceH - 2, w, 2, '#7a6a55');
      let x = 2, n = 0; while (x + 6 < w) { const hh = 7 + ((seed + n) % 3) * 2; P(x, d + 3 + ((seed + n * 7) % 5), 6, hh, (seed + n) % 4 === 0 ? '#d9d9e8' : PAL.paper); P(x + 2, d + 2 + ((seed + n * 7) % 5), 1, 1, '#c9553f'); x += 8; n++; }
      break;
    }
    case 'counter': {
      if (f.plain) { P(0, 0, w, d, '#e8e9ea'); P(0, 0, w, 1, '#b7bdc3'); P(0, d, w, faceH, '#dfe3e0'); P(0, d + faceH - 3, w, 3, '#b7bdc3'); break; } // a washroom counter: plain, light
      P(0, 0, w, d, PAL.woodTop); P(0, d, w, faceH, PAL.wood); P(0, d + faceH - 3, w, 3, PAL.woodDark); for (let x = 3; x + 4 < w; x += 9) { P(x, 1, 3, 5, ['#4f8a5a', '#c9553f', '#e6c35c'][(seed + x) % 3]); P(x + 1, 0, 1, 1, PAL.ink); } break; }
    case 'printer': { P(0, 0, w, d, PAL.metalLight); P(0, d, w, faceH, PAL.metal); P(2, d + 3, w - 4, 6, '#3a3a3a'); P(4, d + 5, 2, 2, '#6fd36f'); P(0, d + faceH - 2, w, 2, '#5a5f64'); break; }
    case 'bin': { P(2, 1, w - 4, d - 1, '#4e6a7a'); P(2, d, w - 4, faceH, '#3b515e'); break; }
    case 'shelf': { P(0, 0, w, d, PAL.woodDark); P(0, d, w, faceH, PAL.wood); for (let s = 4; s < faceH - 4; s += 10) { P(1, d + s, w - 2, 1, PAL.woodDark); for (let x = 2; x + 3 < w; x += 4) P(x, d + s - 6, 3, 6, ['#c9553f', '#4f8a5a', '#5a8fb8', '#e6c35c', PAL.paper][(seed + x + s) % 5]); } P(0, d + faceH - 2, w, 2, PAL.woodDark); break; }
    case 'cabinet': { P(0, 0, w, d, PAL.metalLight); P(0, d, w, faceH, PAL.metal); P(2, d + 3, w - 4, 1, '#5a5f64'); P(2, d + 10, w - 4, 1, '#5a5f64'); P(Math.floor(w / 2) - 1, d + 5, 2, 2, PAL.ink); P(0, d + faceH - 2, w, 2, '#5a5f64'); break; }
    case 'plant': { P(3, 2, w - 6, d - 2, PAL.greenDark); P(4, 1, w - 8, d - 3, PAL.green); P(5, d, w - 10, faceH - 2, '#a3552f'); P(4, d + faceH - 3, w - 8, 3, '#7a3f22'); break; }
    case 'elevator': { // the car's top in plan, and two metal doors on its face with a call light beside
      P(0, 0, w, d, PAL.metal); P(1, 1, w - 2, d - 2, '#7f858b'); P(0, d, w, faceH, PAL.metalLight); P(0, d, w, 2, '#7c8186');
      const dw = Math.max(4, Math.floor((w - 6) / 2)); P(3, d + 3, dw, faceH - 5, '#b7bdc3'); P(3 + dw + 1, d + 3, dw, faceH - 5, '#b7bdc3'); P(3 + dw, d + 3, 1, faceH - 5, PAL.ink);
      P(3, d + 3, dw * 2 + 1, 1, PAL.ink); P(w - 2, d + 5, 1, 1, '#f3c66b'); P(0, d + faceH - 2, w, 2, '#5a5f64'); break; }
    case 'pinup_wall': { // felt fixed to the wall: a panel with pinned sheets on an east-west wall's face, an edge-on strip on a north-south wall
      if (faceH) {
        P(0, 0, w, d, '#7a6a55'); P(0, d, w, faceH, '#9c8f72'); P(0, d, w, 1, '#7a6a55'); P(0, d + faceH - 1, w, 1, '#7a6a55');
        let x = 3, n = 0; while (x + 6 < w) { P(x, d + 3 + ((seed + n * 7) % 4), 6, 7 + ((seed + n) % 3) * 2, (seed + n) % 4 === 0 ? '#d9d9e8' : PAL.paper); P(x + 2, d + 2 + ((seed + n * 7) % 4), 1, 1, '#c9553f'); x += 9; n++; }
      } else { P(0, 0, w, d, '#9c8f72'); for (let y = 2; y + 2 < d; y += 6) P(0, y, 1, 2, PAL.paper); }
      break;
    }
    case 'screen': { // the pull-down screen, drawn down: a dark housing and a white sheet, edge on when the wall runs north-south
      if (faceH) { P(0, 0, w, d, '#3a3a3a'); P(0, d, w, faceH, '#f2f2f2'); P(0, d, w, 2, '#3a3a3a'); P(1, d + faceH - 1, w - 2, 1, '#8a8a8a'); }
      else { P(0, 0, w, d, '#f2f2f2'); P(0, 0, w, 2, '#3a3a3a'); P(0, d - 2, w, 2, '#3a3a3a'); }
      break;
    }
    case 'projector': { P(0, 0, w, d, PAL.metalLight); P(0, d, w, faceH, PAL.metal); P(w - 4, 1, 3, d - 2 + faceH, '#5a8fb8'); break; }
    case 'fridge': { // a tall white box with a door seam and a handle
      P(0, 0, w, d, '#e8e9ea'); P(0, d, w, faceH, '#f4f4f4'); P(0, d, w, 1, '#b7bdc3'); P(0, d + Math.floor(faceH / 3), w, 1, '#b7bdc3'); P(w - 4, d + 4, 1, faceH - 8, '#7c8186'); P(0, d + faceH - 2, w, 2, '#b7bdc3'); break; }
    case 'microwave': { P(0, 0, w, d, '#4a4d50'); P(0, d, w, faceH, '#3a3a3a'); P(1, d + 1, Math.max(2, w - 6), faceH - 2, '#1f2a33'); P(w - 3, d + 1, 1, 1, '#6fd36f'); break; }
    case 'kettle': { P(1, 0, w - 2, d, PAL.metalLight); P(1, d, w - 2, faceH, PAL.metal); P(w - 2, 0, 1, d + 2, PAL.ink); break; }
    case 'coffee_machine': { P(0, 0, w, d, '#3a3a3a'); P(0, d, w, faceH, '#2a2a2a'); P(1, d + 1, w - 2, 2, '#c9553f'); P(2, d + faceH - 2, w - 4, 1, PAL.metalLight); break; }
    case 'sink': { P(0, 0, w, d, PAL.metalLight); const bw = Math.max(2, Math.floor((w - 3) / 2)); P(1, 1, bw, d - 2, '#8f969c'); P(2 + bw, 1, bw, d - 2, '#8f969c'); P(Math.floor(w / 2), 0, 1, 1, PAL.ink); P(0, d, w, faceH, PAL.metal); break; }
    case 'bar': { // the bar counter: a wood top, a dark front with a brass rail
      P(0, 0, w, d, PAL.woodDark); P(1, 1, w - 2, d - 2, PAL.woodTop); P(0, d, w, faceH, '#3b2a1e'); P(0, d + 2, w, 1, '#c9a24a'); P(0, d + faceH - 2, w, 2, PAL.ink); break; }
    case 'beer_tap': { // a tap tower: a metal post with two handles
      P(Math.floor(w / 2) - 1, 0, 3, d, PAL.metalLight); P(Math.floor(w / 2) - 1, d, 3, faceH, PAL.metal); P(Math.floor(w / 2) - 3, d + 2, 2, 3, '#c9553f'); P(Math.floor(w / 2) + 2, d + 2, 2, 3, PAL.ink); break; }
    case 'pew_bench': { // a church pew: the seat in plan, a high wooden back on the far side, its face towards the lounge
      P(0, 0, w, d, PAL.woodTop); P(0, 0, w, 2, PAL.woodDark); P(0, d, w, faceH, PAL.wood); P(0, d + faceH - 2, w, 2, PAL.woodDark); for (let x = 6; x < w; x += 12) P(x, d + 2, 1, faceH - 4, PAL.woodDark); break; }
    case 'serving_table': { // a bar-height serving table: a plain wood top on a dark base, a few dishes on it
      P(0, 0, w, d, PAL.woodTop); P(0, 0, w, 1, PAL.woodDark); P(0, d, w, faceH, '#3b2a1e'); P(0, d + faceH - 2, w, 2, PAL.ink);
      for (let x = 4; x + 5 < w; x += 14) { const y = 2 + ((seed + x) % Math.max(1, d - 7)); P(x, y, 5, 5, PAL.paper); P(x + 1, y + 1, 3, 3, ['#c9553f', '#e6c35c', '#4f8a5a'][(seed + x) % 3]); } break; }
    case 'printer3d': { // a small open-frame printer: a dark frame with a lit bed
      P(0, 0, w, d, '#2f2f33'); P(1, 1, w - 2, d - 2, '#8fa3b0'); P(0, d, w, faceH, '#2f2f33'); P(1, d + 1, w - 2, 1, '#6fd36f'); P(1, d + 2, w - 2, Math.max(1, faceH - 4), '#5a5f64'); break; }
    case 'backdrop': { // the drop-down backdrop, down: a white sweep to the floor under a dark roller
      if (faceH) { P(0, 0, w, d, '#3a3a3a'); P(0, d, w, faceH, '#f4f4f2'); P(0, d, w, 2, '#3a3a3a'); P(0, d + faceH - 1, w, 1, '#d8d8d4'); }
      else { P(0, 0, w, d, '#f4f4f2'); P(0, 0, w, 2, '#3a3a3a'); }
      break; }
    case 'light_stand': { // a light on a stand: a softbox head on a thin pole over a small base
      const cx = Math.floor(w / 2); P(cx - 1, Math.floor(d / 2) - 1, 3, 3, PAL.ink); P(cx, d, 1, faceH, PAL.metal); P(cx - 4, d + 1, 9, Math.min(8, faceH), '#f4f4f2'); P(cx - 3, d + 2, 7, Math.max(1, Math.min(6, faceH - 2)), '#fff6c8'); break; }
    case 'stall': { // a washroom stall: a pale floor, partition lines on three sides, the toilet against the wall, a partition face
      P(0, 0, w, d, '#d8dcd6'); P(0, 0, 1, d, '#6b7076'); P(w - 1, 0, 1, d, '#6b7076'); P(0, 0, w, 1, '#6b7076');
      const tw = Math.max(4, Math.floor(w / 3)), tx = Math.floor(w / 2 - tw / 2); P(tx, 2, tw, Math.max(4, Math.floor(d / 3)), '#f4f4f2'); P(tx + 1, 1, tw - 2, 2, '#c8ccc8');
      P(0, d, w, faceH, '#c9cfc9'); P(0, d, 1, faceH, '#6b7076'); P(w - 1, d, 1, faceH, '#6b7076'); P(1, d + faceH - 2, w - 2, 2, '#8a9096'); break; }
    case 'machine': { // a workshop machine: a dark cast base, a metal top with a blade line and a red switch
      P(0, 0, w, d, PAL.metalLight); P(1, 1, w - 2, d - 2, '#9aa0a6'); P(Math.floor(w / 2), 1, 1, d - 2, '#3a3a3a'); P(0, d, w, faceH, '#4a4d50'); P(2, d + 2, 2, 2, '#c9553f'); P(0, d + faceH - 2, w, 2, '#2f2f33'); break; }
    case 'urinal': { P(0, 0, w, d, '#f4f4f2'); P(1, 1, w - 2, d - 2, '#dfe3e0'); P(0, d, w, faceH, '#f4f4f2'); P(0, d + faceH - 1, w, 1, '#b7bdc3'); P(Math.floor(w / 2), 0, 1, 1, PAL.metal); break; }
    case 'coffee_table': { P(0, 0, w, d, PAL.woodTop); P(0, d, w, faceH, PAL.wood); P(0, d + faceH - 1, w, 1, PAL.woodDark); P(1, 1, 1, d - 2, PAL.woodDark); P(w - 2, 1, 1, d - 2, PAL.woodDark); break; }
    default: { P(0, 0, w, d, PAL.metalLight); P(0, d, w, faceH, PAL.metal); P(0, d + faceH - 2, w, 2, '#5a5f64'); P(2, 2, w - 4, 1, '#e6e8ea'); }
  }
  // a first pass on the look (owner 2026-11-12): every piece gets a one-pixel outline round its footprint and a shadow
  // along the right of its face and under it, so pieces read as objects on the floor as in the reference sheets
  if (!thin && f.kind !== 'stall' && f.kind !== 'elevator') {
    P(0, 0, w, 1, PAL.outline); P(0, 0, 1, d, PAL.outline); P(w - 1, 0, 1, d, PAL.outline); P(0, d - 1, w, 1, PAL.outline);
    if (faceH) { P(w - 1, d, 1, faceH, PAL.outline); P(0, d, 1, faceH, PAL.outline); g.fillStyle = PAL.shade; g.fillRect(1, d + faceH - 1, w - 1, 1); }
  }
  if (f.inferred) { // amber dashes round an added object, so it never passes as modelled
    const H = d + faceH;
    for (let x = 0; x < w; x += 2) { P(x, 0, 1, 1, INFERRED); P(x, H - 1, 1, 1, INFERRED); }
    for (let y = 0; y < H; y += 2) { P(0, y, 1, 1, INFERRED); P(w - 1, y, 1, 1, INFERRED); }
  }
  spriteCache.set(key, c);
  return c;
}
/** Kinds that are not drawn as pieces (the elevator is drawn since 2026-11-06, as the owner pointed it out). */
export const SKIP_KINDS = new Set(['lamp', 'perimeter']);

// ---------------------------------------------------------------- strips, one per tile row
// Each strip holds the wall caps and faces of that row, the leaves of its doors, and the furniture
// whose feet are in it. Drawn in row order so what is further south stands in front.
export function buildStrips(scene, L, prefix) {
  const { cols, rows } = L, tm = L.tile_m, W = cols * T;
  const inb = (c, r) => r >= 0 && r < rows && c >= 0 && c < cols;
  const S = (c, r) => inb(c, r) ? L.struct[r][c] : 0;
  const F = (c, r) => inb(c, r) ? L.floor[r][c] : 0;
  const D = (c, r) => inb(c, r) ? L.dir[r][c] : 0;
  const isWall = (c, r) => S(c, r) === 1 || S(c, r) === 3;
  const solid = (c, r) => isWall(c, r) || (S(c, r) === 4 && D(c, r) !== 2); // a door in an east-west wall keeps the cap as a header
  const capLike = solid;
  // a plain wall tile in a north-south run with no wall beside it is drawn at a 10 px cap, not the whole half metre
  // (a header over a door beside the tile counts as a wall beside it, so the corner over a doorway joins the header, 2026-11-13)
  const narrow = (c, r) => S(c, r) === 1 && !capLike(c - 1, r) && !capLike(c + 1, r) && (isWall(c, r - 1) || isWall(c, r + 1));
  const vglass = (c, r) => S(c, r) === 2 && D(c, r) === 2;

  const furnByRow = new Map();
  const rowOf = (f) => Math.min(rows - 1, Math.max(0, Math.floor((f.y + f.d) / tm - 0.001)));
  const byObject = new Map(), byId = new Map();
  for (const f of L.furniture) { if (f.object) byObject.set(f.object, f); byId.set(String(f.id), f); }
  for (const f of L.furniture) {
    if (SKIP_KINDS.has(f.kind)) continue;
    // a piece standing on another (a printer on the shelf, a microwave on the counter) goes in its base's strip, after it
    const base = f.on_object ? byObject.get(f.on_object) : f.on_element ? byId.get(String(f.on_element)) : null;
    const j = base ? rowOf(base) : rowOf(f);
    (furnByRow.get(j) || furnByRow.set(j, []).get(j)).push(f);
  }
  for (const list of furnByRow.values()) list.sort((a, b) => (a.z || 0) - (b.z || 0));
  const doorsByRow = new Map();
  for (const d of L.doors) {
    const tiles = d.tiles && d.tiles.length ? d.tiles : [d.tile];
    if (!tiles[0]) continue;
    const cs = tiles.map((t) => t[0]), rs = tiles.map((t) => t[1]);
    const dd = { d, c0: Math.min(...cs), c1: Math.max(...cs), r0: Math.min(...rs), r1: Math.max(...rs), ns: d.dir === 'ns' };
    const j = dd.ns ? Math.max(dd.r0, dd.r1 - 1) : dd.r0;
    (doorsByRow.get(j) || doorsByRow.set(j, []).get(j)).push(dd);
  }

  // the wall caps as one layer (owner 2026-11-13): every cap tile is shaped from its neighbours, so a corner or a junction is the
  // union of its bars rather than a full square that sticks out past a 10 px bar, and the outline is read off the whole layer
  // per pixel, so every join closes. Cap space is tile space; on screen the layer sits WALL_H higher.
  const MW = cols * T, MH = rows * T, capMask = new Uint8Array(MW * MH);
  const hdoorAt = (c, r) => S(c, r) === 4 && D(c, r) !== 2;
  const capShape = (i, j) => {   // [x0, w] within the tile
    const st = S(i, j);
    if (st === 3 || hdoorAt(i, j)) return [0, T];
    if (narrow(i, j)) return [3, 10];
    const hasW = capLike(i - 1, j), hasE = capLike(i + 1, j), vNarrow = narrow(i, j - 1) || narrow(i, j + 1);
    if (vNarrow && hasE && !hasW) return [3, 13];
    if (vNarrow && hasW && !hasE) return [0, 13];
    return [0, T];
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (!(S(i, j) === 1 || S(i, j) === 3 || hdoorAt(i, j))) continue;
    const [x0, w] = capShape(i, j);
    for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < w; xx++) capMask[(j * T + yy) * MW + i * T + x0 + xx] = 1;
  }
  const capAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? 0 : capMask[y * MW + x];
  const [tmp, tg] = canvas(1, 1);
  const strips = [];
  for (let j = 0; j < rows; j++) {
    // the strip reaches from a wall's height above its row down to the row below; a deep piece (a shelf along a
    // north-south wall) or one standing on a base further south can reach higher, so the canvas grows to hold it
    const placed = (furnByRow.get(j) || []).map((f) => {
      const spr = furnitureSprite(f, tm);
      const lift = Math.round((f.z || 0) * PPM_Z); // an object above the floor (felt on a wall, a screen, a projector) stands that much higher
      return { f, spr, x: Math.round(f.x / tm * T), yWorld: Math.round((f.y + f.d) / tm * T) - spr.height - lift };
    });
    const top = Math.min(j * T - WALL_H - T, ...placed.map((p) => p.yWorld)), h = (j + 2) * T - top;
    const [c, g] = canvas(W, h);
    let any = false;
    // furniture first; a wall or column whose tile centre lies well inside a piece's footprint is cut out of it, so the
    // wall wins there, while a piece south of a wall is drawn in a later strip and stands in front of it
    for (const { f, spr, x, yWorld } of placed) {
      any = true;
      tmp.width = spr.width; tmp.height = spr.height;
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, tmp.width, tmp.height); tg.drawImage(spr, 0, 0);
      tg.globalCompositeOperation = 'destination-out';
      const ci0 = Math.floor((f.x + 0.2) / tm), ci1 = Math.floor((f.x + f.w - 0.2) / tm), cj0 = Math.floor((f.y + 0.2) / tm), cj1 = Math.floor((f.y + f.d - 0.2) / tm);
      for (let jj = cj0; jj <= cj1; jj++) for (let ii = ci0; ii <= ci1; ii++) {
        const cx = (ii + 0.5) * tm, cy = (jj + 0.5) * tm;
        if (solid(ii, jj) && cx > f.x + 0.2 && cx < f.x + f.w - 0.2 && cy > f.y + 0.2 && cy < f.y + f.d - 0.2) tg.fillRect(ii * T - x, jj * T - WALL_H - yWorld, T, T + WALL_H);
      }
      // and no piece is drawn over a wall or a pane anywhere on screen (owner 2026-11-13): wherever a wall tile's cap and face,
      // a narrow wall's cap or a pane's line overlap the piece's drawn rectangle, the piece is cleared there and the wall shows.
      // Pieces fixed to a wall (felt, a screen, a backdrop, anything lifted above the floor) are left alone.
      const onWall = f.kind === 'pinup_wall' || f.kind === 'screen' || f.kind === 'backdrop' || f.kind === 'projector' || (f.z || 0) > 0;
      if (!onWall) {
        const wi0 = Math.floor(x / T) - 1, wi1 = Math.floor((x + spr.width - 1) / T) + 1, wj0 = Math.floor(yWorld / T) - 1, wj1 = Math.floor((yWorld + spr.height - 1) / T) + 3;
        for (let jj = wj0; jj <= wj1; jj++) for (let ii = wi0; ii <= wi1; ii++) {
          if (!inb(ii, jj)) continue; const st = S(ii, jj); if (st !== 1 && st !== 2 && st !== 3 && !(st === 4 && D(ii, jj) !== 2)) continue;
          const nsGlass = st === 2 && D(ii, jj) === 2, ns = st === 1 && narrow(ii, jj);
          const bx = nsGlass ? ii * T + 6 : ns ? ii * T + 3 : ii * T, bw = nsGlass ? 4 : ns ? 10 : T;
          const ty0 = jj * T - WALL_H - (st === 2 && F(ii, jj - 1) === 0 ? T : 0), ty1 = (jj + 1) * T;
          tg.fillRect(bx - x, ty0 - yWorld, bw, ty1 - ty0);
        }
      }
      g.drawImage(tmp, x, yWorld - top);
    }
    for (let i = 0; i < cols; i++) {
      const s = S(i, j), d = D(i, j);
      const hdoor = s === 4 && d !== 2;
      if (s !== 1 && s !== 2 && s !== 3 && !hdoor) continue;
      const x = i * T, yS = (j + 1) * T - top, cy = yS - T - WALL_H;
      // a face shows where the south side is open, and also where the tile south is a narrow north-south wall
      const south = S(i, j + 1), southNarrow = narrow(i, j + 1);
      const faceVisible = (!solid(i, j + 1) && south !== 2) || southNarrow;
      if (s === 2) {
        if (d !== 2) {
          // an east-west run of glass shows its face; with the outside behind it the face reaches the top of the caps beside it
          if (faceVisible) {
            any = true; const tall = F(i, j - 1) === 0 ? WALL_H + T : WALL_H; const y0 = yS - tall;
            px(g, x, y0, T, tall, PAL.glass); px(g, x + 2, y0 + 2, 5, tall - 6, PAL.glassLight);
            px(g, x, y0, 1, tall, PAL.mullion); px(g, x, y0, T, 1, PAL.mullion); px(g, x, yS - 1, T, 1, PAL.mullion); if (tall > WALL_H) px(g, x, y0 + T - 1, T, 1, PAL.mullion);
          }
        } else {
          // a north-south run is seen edge on: its line at cap height, and a thin post to the floor at each end
          any = true; const gx = x + 7;
          px(g, gx - 1, cy, 3, T, PAL.mullion); px(g, gx, cy, 1, T, PAL.glass); px(g, gx + 1, cy - 1, 1, T, PAL.glassLight);
          if (!vglass(i, j + 1) && !isWall(i, j + 1)) { px(g, gx - 1, yS - WALL_H, 3, WALL_H, PAL.mullion); px(g, gx + 1, yS - WALL_H + 1, 1, WALL_H - 2, PAL.glassLight); }
          if (!vglass(i, j - 1) && !isWall(i, j - 1)) px(g, gx - 1, cy, 3, WALL_H, PAL.mullion);
        }
        continue;
      }
      any = true;
      const ns = narrow(i, j); const cx0 = ns ? x + 3 : x, cw = ns ? 10 : T;
      // the cap from the layer: its body, and an edge wherever a cap pixel meets open space (so corners and junctions join)
      for (let yy = 0; yy < T; yy++) { const my = j * T + yy; let run = -1;
        for (let xx = 0; xx <= T; xx++) { const on = xx < T && capAt(x + xx, my); if (on && run < 0) run = xx; if (!on && run >= 0) { px(g, x + run, cy + yy, xx - run, 1, PAL.wallCap); run = -1; } }
        for (let xx = 0; xx < T; xx++) { const mx = x + xx; if (!capAt(mx, my)) continue; if (!capAt(mx - 1, my) || !capAt(mx + 1, my) || !capAt(mx, my - 1) || !capAt(mx, my + 1)) px(g, mx, cy + yy, 1, 1, PAL.wallEdge); }
      }
      if (ns && faceVisible) { px(g, cx0, yS - WALL_H, cw, WALL_H, PAL.wallFace); px(g, cx0, yS - WALL_H, cw, 2, PAL.wallFaceDark); px(g, cx0, yS - 3, cw, 3, PAL.base); continue; }
      if (hdoor) {
        // a door in an east-west wall: the wall continues above it as a header; the leaf is drawn below with its door
        px(g, x, yS - WALL_H, T, WALL_H - DOOR_H, PAL.wallFace); px(g, x, yS - WALL_H, T, 2, PAL.wallFaceDark); px(g, x, yS - DOOR_H - 2, T, 2, PAL.base);
        continue;
      }
      if (!faceVisible) continue;
      if (F(i, j + 1) === 0 && s !== 3) {
        // the outside: a plainer face with a pilaster now and then
        px(g, x, yS - WALL_H, T, WALL_H, PAL.extFace); px(g, x, yS - WALL_H, T, 3, PAL.extFaceDark); px(g, x, yS - 6, T, 6, PAL.extFaceDark);
        if (i % 6 === 0) { px(g, x + 2, yS - WALL_H, 5, WALL_H, PAL.pilaster); px(g, x + 6, yS - WALL_H, 1, WALL_H, PAL.extFaceDark); }
      } else {
        px(g, x, yS - WALL_H, T, WALL_H, PAL.wallFace); px(g, x, yS - WALL_H, T, 2, PAL.wallFaceDark); if (i % 3 === 0) px(g, x + 6, yS - WALL_H + 10, 1, WALL_H - 18, PAL.wallFaceDark);
        px(g, x, yS - 3, T, 3, PAL.base);
      }
    }
    for (const dd of doorsByRow.get(j) || []) { any = true; if (dd.ns) drawPlanDoor(g, dd, top, tm, isWall); else drawFaceDoor(g, dd, top, tm); }
    if (any) strips.push({ key: addCanvas(scene, `${prefix}:strip:${j}`, c), top, depth: (j + 1) * T });
  }
  return strips;
}

// a door in an east-west wall: the opening is whole tiles, the leaf its real width, the rest jamb or sidelite glass;
// a double door has two leaves
function drawFaceDoor(g, dd, top, tm) {
  const { d } = dd;
  const x0 = dd.c0 * T + 1, x1 = (dd.c1 + 1) * T - 1, w = x1 - x0;
  const yWall = (dd.r0 + 1) * T - top, h = DOOR_H;
  const name = d.family || ''; const sidelite = /sidelite/i.test(name), double = !!d.double || /double/i.test(name), glass = /glass|curtain/i.test(name);
  const leafW0 = Math.min(w, Math.max(6, Math.round((d.width_m || 0.9) / tm * T)));
  let dx0 = sidelite ? x0 : Math.round((x0 + x1) / 2 - leafW0 / 2), dx1 = dx0 + leafW0;
  if (d.leaf === false) { // a doorway without a panel: the jambs only, the opening left clear so the floor beyond shows
    px(g, x0, yWall - h, w, h, PAL.wallFace); px(g, x0, yWall - 3, w, 3, PAL.base);
    g.clearRect(dx0, yWall - h, dx1 - dx0, h); px(g, dx0, yWall - h, 1, h, PAL.wallEdge); px(g, dx1 - 1, yWall - h, 1, h, PAL.wallEdge);
    if (d.edit) for (let y = yWall - h; y < yWall; y += 2) { px(g, dx0, y, 1, 1, INFERRED); px(g, dx1 - 1, y, 1, 1, INFERRED); }
    return;
  }
  px(g, x0, yWall - h, w, h, PAL.wallFace); px(g, x0, yWall - 3, w, 3, PAL.base);
  if (sidelite) {
    const side = x1 - dx1;
    if (side > 2) { px(g, dx1, yWall - h, side, h, PAL.glass); px(g, dx1 + 2, yWall - h + 2, Math.max(1, side - 4), h - 6, PAL.glassLight); px(g, dx1, yWall - h, 1, h, PAL.mullion); px(g, x1 - 1, yWall - h, 1, h, PAL.mullion); }
  }
  px(g, dx0, yWall - h, dx1 - dx0, h, '#2a241f');
  const leaves = double ? 2 : 1, lw = Math.floor((dx1 - dx0) / leaves);
  for (let n = 0; n < leaves; n++) {
    const at = dx0 + n * lw, leafW = lw;
    if (glass) { px(g, at, yWall - h, leafW, h, PAL.mullion); px(g, at + 2, yWall - h + 2, Math.max(1, leafW - 4), h - 4, PAL.glass); px(g, at + 3, yWall - h + 3, Math.max(1, Math.floor(leafW / 3)), h - 8, PAL.glassLight); }
    else {
      px(g, at, yWall - h, leafW, h, PAL.door); px(g, at, yWall - h, leafW, 2, PAL.doorDark); px(g, at, yWall - 3, leafW, 3, PAL.doorDark);
      if (leafW > 8) { px(g, at + 2, yWall - h + 4, leafW - 4, Math.floor(h / 2) - 6, PAL.doorLight); const hx = double && n === 1 ? at + 2 : at + leafW - 4; px(g, hx, yWall - Math.floor(h / 2), 2, 3, PAL.doorDark); }
    }
  }
}
// a door in a north-south wall: a post at each end the wall does not already hold, the leaf in plan at cap height,
// the sidelite beside it; drawn in the strip before its south end so the wall there stands in front of it
function drawPlanDoor(g, dd, top, tm, isWall) {
  const { d } = dd;
  const x = dd.c0 * T + 8;
  const y0 = dd.r0 * T - WALL_H - top, y1 = (dd.r1 + 1) * T - WALL_H - top, len = y1 - y0;
  const name = d.family || ''; const sidelite = /sidelite/i.test(name), glass = /glass|curtain/i.test(name);
  if (!isWall(dd.c0, dd.r0 - 1)) { px(g, x - 8, y0 - 4, 16, 4, PAL.wallCap); px(g, x - 8, y0 - 1, 16, 1, PAL.wallEdge); }
  if (!isWall(dd.c0, dd.r1 + 1)) { px(g, x - 8, y1, 16, 4, PAL.wallCap); px(g, x - 8, y1, 16, 1, PAL.wallEdge); }
  if (d.leaf === false) return; // a doorway without a panel: the posts above are all there is
  let leafLen = len - 2;
  if (sidelite) { leafLen = Math.min(leafLen, Math.round((d.width_m || 0.9) / tm * T)); const sy = y0 + 1 + leafLen; if (y1 - 1 - sy > 2) { px(g, x - 1, sy, 4, y1 - 1 - sy, PAL.mullion); px(g, x, sy + 1, 2, y1 - 2 - sy, PAL.glass); } }
  px(g, x - 1, y0 + 1, 4, Math.max(2, leafLen), glass ? PAL.glass : PAL.door);
  px(g, x - 1, y0 + 1, 1, Math.max(2, leafLen), glass ? PAL.mullion : PAL.doorDark);
}

// ---------------------------------------------------------------- people
// 16 x 24, four facings (down, left, right, up) x three frames (stand, step, step), the V1 figure
export function buildPeople(scene, n = 6) {
  const skins = ['#f1c9a5', '#e0a97e', '#c98a5e', '#8d5a3b', '#f6d8bf'];
  const hairs = ['#2b2622', '#4a3222', '#8a5a32', '#b9b2a4', '#1f1f1f', '#6b3b2a'];
  const shirts = ['#4f7fb0', '#d9873c', '#5f9a4a', '#c9553f', '#2f8f85', '#8f5fa8', '#d6b24a', '#6b5a7a'];
  const keys = [];
  for (let i = 0; i < n; i++) {
    const key = `person${i}`;
    if (scene.textures.exists(key)) { keys.push(key); continue; } // the figure is deterministic per index, so a floor change keeps it and its animations
    const h = hash('person' + i);
    const col = { skin: skins[h % 5], hair: hairs[(h >> 3) % 6], shirt: shirts[(h >> 6) % shirts.length], pants: h % 2 ? '#2f4a7a' : '#4a4a52', jacket: '#5a4a3a', prof: (h >> 9) % 4 === 0, glasses: (h >> 5) % 4 === 0 };
    const [c, g] = canvas(16 * 3, 24 * 4);
    const dirs = ['down', 'left', 'right', 'up'];
    for (let di = 0; di < 4; di++) for (let f = 0; f < 3; f++) {
      g.save(); g.translate(f * 16, di * 24);
      const P = (x, y, w, hh, color) => px(g, x, y, w, hh, color);
      const dir = dirs[di], bob = f > 0 ? 1 : 0, la = f === 1 ? 1 : 0, lb = f === 2 ? 1 : 0; // one leg lifted per step frame
      const legY = 16;
      g.fillStyle = 'rgba(20, 14, 10, 0.35)'; g.fillRect(3, 22, 10, 2);   // a shadow under the feet (2026-11-12)
      P(4, legY + la, 3, 7 - la, col.pants); P(9, legY + lb, 3, 7 - lb, col.pants);
      P(4, 22, 3, 2, PAL.ink); P(9, 22, 3, 2, PAL.ink);
      P(3, 10 + bob, 10, 7, col.shirt); if (col.prof) { P(3, 10 + bob, 2, 7, col.jacket); P(11, 10 + bob, 2, 7, col.jacket); }
      if (dir !== 'up') { P(2, 11 + bob, 2, 4, col.skin); P(12, 11 + bob, 2, 4, col.skin); } else { P(2, 11 + bob, 2, 4, col.shirt); P(12, 11 + bob, 2, 4, col.shirt); }
      P(4, 2 + bob, 8, 8, col.skin); P(3, 1 + bob, 10, 4, col.hair); P(3, 5 + bob, 1, 3, col.hair); P(12, 5 + bob, 1, 3, col.hair);
      if (dir === 'up') P(4, 2 + bob, 8, 7, col.hair);
      else if (dir === 'down') { P(5, 6 + bob, 1, 1, PAL.ink); P(10, 6 + bob, 1, 1, PAL.ink); if (col.glasses) { P(4, 6 + bob, 3, 1, PAL.ink); P(9, 6 + bob, 3, 1, PAL.ink); } }
      else if (dir === 'left') { P(5, 6 + bob, 1, 1, PAL.ink); P(3, 4 + bob, 2, 4, col.hair); }
      else { P(10, 6 + bob, 1, 1, PAL.ink); P(11, 4 + bob, 2, 4, col.hair); }
      g.restore();
    }
    scene.textures.addSpriteSheet(key, c, { frameWidth: 16, frameHeight: 24 });
    for (let dir = 0; dir < 4; dir++) {
      const ak = `${key}-walk${dir}`;
      if (!scene.anims.exists(ak)) scene.anims.create({ key: ak, frames: [{ key, frame: dir * 3 + 1 }, { key, frame: dir * 3 }, { key, frame: dir * 3 + 2 }, { key, frame: dir * 3 }], frameRate: 6, repeat: -1 });
    }
    keys.push(key);
  }
  return keys;
}
