// The building as places to be: rooms by number with their use (program/rooms.json), the pieces of
// furniture as spots an agent stands or sits at (a walkable tile beside the piece), the studio's
// desks by cohort zone (program/objects.json zones), the plotters and printers, the kitchen, the
// lounge, the washrooms by sex and level, the crit and class rooms, the shops, the entrance
// (program/building.json), and a cache of walked paths. Everything is derived from the tiles and
// the program; what is chosen by rule says so in QUESTIONS.md.
import { WALK } from './grid.js';
import { findPath, pathLength } from './path.js';

export class World {
  constructor(building, program, P) {
    this.b = building; this.P = P;
    this.program = program;              // { rooms, objects, building, cohort }
    this.levels = building.levels.map((l) => ({ ...l, grid: l.grid.clone() }));   // [{ k, name, file, grid, L }]: own grids, see FloorGrid.clone
    this.rooms = new Map();              // number -> room record
    this.roomOfTile = this.levels.map(() => null);
    this.paths = new Map();
    this.gaps = [];
    this.connectPockets();
    this.buildRooms();
    this.initCover();   // how many blocking pieces cover each tile, so a moved piece restores exactly what it uncovered (2026-11-11)
    this.buildSpots();
    this.buildEntrance();
  }
  levelOf(name) { return this.levels.find((l) => l.name === name) || null; }

  /** A pocket of floor cut off from the floor proper that holds desks is joined to it through the thinnest movable
   *  piece between them (a board or table rolled aside, at most P.layout.gaps.max_tiles tiles); the gap is logged in
   *  this.gaps and drawn in the drift overlay. Owner 2026-11-08 (question 18): the boxed desks must be accessible. */
  connectPockets() {
    const G = this.P.layout?.gaps || { max_tiles: 6 }, movable = new Set(this.P.layout?.manager?.movable_kinds || ['table', 'pinup', 'seating']);
    for (const lv of this.levels) {
      const g = lv.grid, L = lv.L, kindAt = new Map();
      for (const f of L.furniture || []) for (let r = Math.max(0, f.r0); r <= Math.min(g.rows - 1, f.r1); r++) for (let c = Math.max(0, f.c0); c <= Math.min(g.cols - 1, f.c1); c++) if (!kindAt.has(g.idx(c, r))) kindAt.set(g.idx(c, r), f.kind);
      const desks = (L.furniture || []).filter((f) => f.kind === 'desk');
      const done = new Set();
      for (let i = 0; i < g.walk.length; i++) {
        const comp = g.comp[i]; if (g.walk[i] !== WALK.FLOOR || comp === g.main || comp < 0 || done.has(comp)) continue;
        done.add(comp);
        const pocket = []; for (let j = 0; j < g.walk.length; j++) if (g.comp[j] === comp) pocket.push(j);
        if (pocket.length < 4) continue;
        const near = pocket.some((j) => { const [c, r] = g.cr(j); return desks.some((d) => c >= d.c0 - 1 && c <= d.c1 + 1 && r >= d.r0 - 1 && r <= d.r1 + 1); });
        if (!near) continue;
        // breadth-first from the pocket over movable furniture tiles until a tile of the main component
        const prev = new Map(), queue = []; for (const j of pocket) { prev.set(j, -1); queue.push([j, 0]); }
        let hit = null;
        while (queue.length && hit == null) {
          const [j, d] = queue.shift(); if (d >= G.max_tiles) continue;
          const [c, r] = g.cr(j);
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const cc = c + dc, rr = r + dr; if (!g.inb(cc, rr)) continue; const n = g.idx(cc, rr); if (prev.has(n)) continue;
            if (g.walk[n] !== WALK.NO) { if (g.comp[n] === g.main) { prev.set(n, j); hit = n; break; } continue; }
            if (!movable.has(kindAt.get(n))) continue;
            if (L.floor[rr][cc] < 1 || !(L.struct[rr][cc] === 0 || L.struct[rr][cc] === 4)) continue;
            prev.set(n, j); queue.push([n, d + 1]);
          }
        }
        if (hit == null) continue;
        const opened = []; for (let n = prev.get(hit); n != null && n >= 0 && prev.get(n) !== -1; n = prev.get(n)) opened.push(n);
        for (const n of opened) g.walk[n] = WALK.FLOOR;
        g.labelComponents();
        this.gaps.push({ k: lv.k, tiles: opened.map((n) => g.cr(n)), kind: kindAt.get(opened[0]) || 'piece', pocket: pocket.length, inferred: true });
      }
    }
  }

  /** Breadth-first from a cut-off pocket over furniture tiles of the allowed kinds (within room idx `room` when given)
   *  to the floor proper; the tiles on the way are opened and logged in this.gaps. Returns true when joined. */
  joinToMain(lv, pocket, kindAt, allowed, maxTiles, label, room) {
    const g = lv.grid, L = lv.L, prev = new Map(), queue = [];
    for (const j of pocket) { prev.set(j, -1); queue.push([j, 0]); }
    let hit = null;
    while (queue.length && hit == null) {
      const [j, d] = queue.shift(); if (d >= maxTiles) continue;
      const [c, r] = g.cr(j);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cc = c + dc, rr = r + dr; if (!g.inb(cc, rr)) continue; const n = g.idx(cc, rr); if (prev.has(n)) continue;
        if (g.walk[n] !== WALK.NO) { if (g.comp[n] === g.main) { prev.set(n, j); hit = n; break; } prev.set(n, j); queue.push([n, d]); continue; }   // another cut-off strip is walked through at no cost
        if (!allowed.has(kindAt.get(n))) continue;
        if (L.floor[rr][cc] < 1 || (room != null && L.floor[rr][cc] !== room) || !(L.struct[rr][cc] === 0 || L.struct[rr][cc] === 4)) continue;
        prev.set(n, j); queue.push([n, d + 1]);
      }
    }
    if (hit == null) return false;
    const opened = []; for (let n = prev.get(hit); n != null && n >= 0 && prev.get(n) !== -1; n = prev.get(n)) if (g.walk[n] === WALK.NO) opened.push(n);
    for (const n of opened) g.walk[n] = WALK.FLOOR;
    g.labelComponents();
    if (opened.length) this.gaps.push({ k: lv.k, tiles: opened.map((n) => g.cr(n)), kind: label || kindAt.get(opened[0]) || 'piece', pocket: pocket.length, inferred: true });
    return true;
  }

  buildRooms() {
    const prog = this.program.rooms.rooms || this.program.rooms;
    for (const lv of this.levels) {
      const L = lv.L, g = lv.grid, byIdx = new Map();
      this.roomOfTile[lv.k] = new Int16Array(g.walk.length).fill(-1);
      for (const rm of L.rooms) {
        const pr = prog[String(rm.id)] || {};
        const rec = { number: rm.number, id: rm.id, k: lv.k, level: lv.name, idx: rm.idx, use: pr.use || '', name: pr.name || (rm.name && rm.name !== 'Room' ? rm.name : ''), access: pr.access || '', hours: pr.hours || '', label: rm.label, area: rm.area_m2, tiles: [], floorTiles: [], pieces: [] };
        this.rooms.set(rm.number, rec); byIdx.set(rm.idx, rec);
      }
      // chairs in class and crit rooms are seats: their tiles are walkable, so a chair in a row of tables has a stand
      // (its own tile) and counts toward the room's capacity (2026-11-11: room 22 read 25 of its 64 chairs before)
      let seats = 0;
      for (const f of L.furniture || []) {
        if (f.kind !== 'chair') continue;
        const cc = Math.round((f.c0 + f.c1) / 2), rr = Math.round((f.r0 + f.r1) / 2); const rec = g.inb(cc, rr) ? byIdx.get(L.floor[rr][cc]) : null;
        if (!rec || !['class', 'crit'].includes(rec.use)) continue;
        for (let r = f.r0; r <= f.r1; r++) for (let c = f.c0; c <= f.c1; c++) if (g.inb(c, r) && g.walk[g.idx(c, r)] === WALK.NO && L.floor[r][c] === rec.idx) { g.walk[g.idx(c, r)] = WALK.FLOOR; seats++; }
      }
      if (seats) {
        // a strip of seats between two rows of tables is its own component when the aisle at the row's end is narrower
        // than a tile: join each such strip to the floor proper through the fewest furniture tiles (logged in gaps as 'aisle')
        g.labelComponents();
        const kindAt = new Map(), roomAt = new Map();
        for (const f of L.furniture || []) for (let r = Math.max(0, f.r0); r <= Math.min(g.rows - 1, f.r1); r++) for (let c = Math.max(0, f.c0); c <= Math.min(g.cols - 1, f.c1); c++) if (!kindAt.has(g.idx(c, r))) kindAt.set(g.idx(c, r), f.kind);
        // components are relabelled after every join, so search afresh each time until no joinable strip is left
        const failed = new Set();
        for (let guard = 0; guard < 400; guard++) {
          let start = -1, rec = null;
          for (let i = 0; i < g.walk.length; i++) {
            const comp = g.comp[i]; if (g.walk[i] !== WALK.FLOOR || comp === g.main || comp < 0 || failed.has(i)) continue;
            const [c, r] = g.cr(i); const rc = byIdx.get(L.floor[r][c]); if (!rc || !['class', 'crit'].includes(rc.use)) continue;
            start = i; rec = rc; break;
          }
          if (start < 0) break;
          const comp = g.comp[start], pocket = []; for (let j = 0; j < g.walk.length; j++) if (g.comp[j] === comp) pocket.push(j);
          if (!this.joinToMain(lv, pocket, kindAt, new Set(['table', 'chair', 'seating', 'desk']), 8, 'aisle', rec.idx)) for (const j of pocket) failed.add(j);
        }
      }
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const idx = L.floor[r][c]; if (idx < 2) continue;
        const rec = byIdx.get(idx); if (!rec) continue;
        const i = g.idx(c, r); rec.tiles.push(i); this.roomOfTile[lv.k][i] = Number(rec.number);
        if (g.walk[i] === WALK.FLOOR) rec.floorTiles.push(i);
      }
      for (const f of L.furniture || []) {
        const cc = Math.round((f.c0 + f.c1) / 2), rr = Math.round((f.r0 + f.r1) / 2);
        const idx = g.inb(cc, rr) ? L.floor[rr][cc] : 0;
        const rec = byIdx.get(idx);
        const piece = { ...f, k: lv.k, room: rec ? rec.number : null, stand: this.standingTile(lv, f) };
        if (rec) rec.pieces.push(piece);
        (this.pieces = this.pieces || []).push(piece);
      }
    }
  }
  /** A walkable tile beside a piece, nearest its centre, on the floor proper. */
  standingTile(lv, f) {
    const g = lv.grid; let best = null, bd = Infinity;
    const cx = (f.c0 + f.c1) / 2, cy = (f.r0 + f.r1) / 2;
    const own = g.inb(Math.round(cx), Math.round(cy)) ? lv.L.floor[Math.round(cy)][Math.round(cx)] : 0;
    for (let r = f.r0 - 1; r <= f.r1 + 1; r++) for (let c = f.c0 - 1; c <= f.c1 + 1; c++) {
      if (!g.inb(c, r)) continue; const i = g.idx(c, r);
      if (g.walk[i] !== WALK.FLOOR || g.comp[i] !== g.main) continue;
      const d = (c - cx) ** 2 + (r - cy) ** 2 + (own >= 2 && lv.L.floor[r][c] !== own ? 100 : 0); if (d < bd) { bd = d; best = [c, r]; }
    }
    if (!best) { // nothing beside it on the floor proper: the nearest main-component floor tile within six tiles
      for (let rad = 2; rad <= 6 && !best; rad++) for (let r = Math.round(cy) - rad; r <= Math.round(cy) + rad; r++) for (let c = Math.round(cx) - rad; c <= Math.round(cx) + rad; c++) {
        if (!g.inb(c, r)) continue; const i = g.idx(c, r); if (g.walk[i] !== WALK.FLOOR || g.comp[i] !== g.main) continue;
        const d = (c - cx) ** 2 + (r - cy) ** 2; if (d < bd) { bd = d; best = [c, r]; }
      }
    }
    return best;
  }
  roomAt(k, c, r) { const g = this.levels[k].grid; return g.inb(c, r) ? this.roomOfTile[k][g.idx(c, r)] : -1; }
  roomsOfUse(use) { return [...this.rooms.values()].filter((r) => r.use === use); }
  piecesIn(number, kinds) { const rm = this.rooms.get(String(number)); if (!rm) return []; const want = kinds ? new Set(kinds) : null; return rm.pieces.filter((p) => p.stand && (!want || want.has(p.kind))); }

  buildSpots() {
    const studio = this.roomsOfUse('studio')[0];
    this.studio = studio;
    // the studio's desks, each with its cohort zone from program/objects.json
    const zones = this.program.objects.zones?.[String(studio.id)]?.zones || [];
    // the pieces' x, y in the tile files are metres from the level's origin; the zone lines are model metres
    const [ox, oy] = studio ? this.levels[studio.k].L.origin : [0, 0];
    const zoneOf = (q) => { const p = { x: q.x + ox, y: q.y + oy }; for (const z of zones) { if (z.x_min_m != null && p.x < z.x_min_m) continue; if (z.x_max_m != null && p.x > z.x_max_m) continue; if (z.y_min_m != null && p.y < z.y_min_m) continue; if (z.y_max_m != null && p.y > z.y_max_m) continue; return Number(String(z.cohort).replace(/\D/g, '')) || 1; } return 1; };
    this.studioDesks = this.piecesIn(studio.number, ['desk']).map((p) => ({ ...p, year: zoneOf(p), owner: null, hot: false }));
    this.sideTables = this.piecesIn(studio.number, ['table']);
    const cx = this.studioDesks.reduce((s, d) => s + d.x, 0) / this.studioDesks.length, cy = this.studioDesks.reduce((s, d) => s + d.y, 0) / this.studioDesks.length;
    this.sideTables.sort((a, b) => ((a.x - cx) ** 2 + (a.y - cy) ** 2) - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
    this.pinups = this.piecesIn(studio.number, ['pinup']);
    // the print corner: the two north-most large printer pieces are the plotters, the others the small printers [question 3]
    const printers = this.piecesIn(studio.number, ['printer']).sort((a, b) => a.r0 - b.r0);
    this.plotters = printers.slice(0, 2); this.printers = printers.slice(2);
    this.computers = this.piecesIn(studio.number, ['computers']);
    // the other rooms
    const kitchen = this.roomsOfUse('kitchen')[0], lounge = this.roomsOfUse('lounge')[0];
    this.kitchen = kitchen; this.lounge = lounge;
    this.kitchenSpots = this.piecesIn(kitchen.number, ['counter', 'kettle', 'coffee_machine', 'microwave', 'fridge', 'sink']);
    this.loungeSpots = this.piecesIn(lounge.number, ['seating', 'pew_bench', 'coffee_table', 'bar', 'serving_table']);
    this.loungeFloor = lounge.floorTiles;
    // a crit room with no chairs in the tiles (room 30: the crit set was never placed) is used from its floor tiles (owner 2026-11-08, question 16)
    this.critRooms = this.roomsOfUse('crit').map((r) => { const chairs = this.piecesIn(r.number, ['chair']); const g = this.levels[r.k].grid; const floorSpots = chairs.length ? [] : r.floorTiles.filter((i) => g.comp[i] === g.main).filter((_, i) => i % 5 === 0).slice(0, 24).map((i) => { const [c, rr] = g.cr(i); return { kind: 'floor', k: r.k, room: r.number, stand: [c, rr], c0: c, r0: rr, c1: c, r1: rr, inferred: true }; }); return { room: r, tables: this.piecesIn(r.number, ['table']), chairs, spots: chairs.length ? chairs : floorSpots, screen: this.piecesIn(r.number, ['screen'])[0] || null, capacity: chairs.length || floorSpots.length }; });
    this.classRooms = this.roomsOfUse('class').map((r) => ({ room: r, chairs: this.piecesIn(r.number, ['chair']), tables: this.piecesIn(r.number, ['table']) })).filter((c) => c.chairs.length).sort((a, b) => a.chairs.length - b.chairs.length);
    this.printRoom = this.roomsOfUse('shop').find((r) => /3d/i.test(r.name)) || null;
    this.printers3d = this.printRoom ? this.piecesIn(this.printRoom.number, ['printer3d']) : [];
    this.shops = this.roomsOfUse('shop').filter((r) => r !== this.printRoom).map((r) => ({ room: r, spots: this.piecesIn(r.number, ['machine', 'table', 'cutting']) }));
    this.photo = this.roomsOfUse('photo')[0] || null;
    // washrooms by level and sex (question 1)
    this.washrooms = this.roomsOfUse('wc').map((r) => ({ room: r, k: r.k, sex: /women/i.test(r.name) ? 'women' : /men/i.test(r.name) ? 'men' : 'any', stalls: this.piecesIn(r.number, ['stall', 'urinal']), sinks: this.piecesIn(r.number, ['sink']) }));
    // offices and their desks, for the instructors (question 2)
    this.offices = this.roomsOfUse('office').map((r) => ({ room: r, desks: this.piecesIn(r.number, ['desk']) })).filter((o) => o.desks.length);
    this.offices.sort((a, b) => a.room.k - b.room.k || Number(a.room.number) - Number(b.room.number));
  }
  buildEntrance() {
    const doors = this.program.building?.entrances?.doors || [];
    const d = doors.find((x) => x.access === 'card_24_7') || doors[0];
    const lv = d ? this.levelOf(d.level) : this.levels[0];
    const g = lv.grid;
    const [c0, r0] = d ? g.fromWorld(d.at_m[0], d.at_m[1]) : [Math.floor(g.cols / 2), g.rows - 2];
    let i = g.nearest(c0, r0, [WALK.FLOOR], 6); if (i == null || g.comp[i] !== g.main) { const main = g.mainFloorTiles(); let bd = Infinity; for (const t of main) { const [c, r] = g.cr(t); const dd = (c - c0) ** 2 + (r - r0) ** 2; if (dd < bd) { bd = dd; i = t; } } }
    const [c, r] = g.cr(i);
    this.entrance = { k: lv.k, c, r, id: d?.id, access: d?.access || 'card_24_7' };
    this.businessDoors = doors.filter((x) => x.access === 'business_hours').map((x) => { const l = this.levelOf(x.level); const [cc, rr] = l.grid.fromWorld(x.at_m[0], x.at_m[1]); const j = l.grid.nearest(cc, rr, [WALK.FLOOR], 6); return j == null ? null : { k: l.k, ...(([c2, r2]) => ({ c: c2, r: r2 }))(l.grid.cr(j)), id: x.id }; }).filter(Boolean);
  }

  /** Desks to the students by cohort zone and section, contiguous; the spares are hot desks. */
  assignDesks(agents) {
    const students = agents.filter((a) => a.role === 'student');
    const byYear = {};
    for (const d of this.studioDesks) (byYear[d.year] = byYear[d.year] || []).push(d);
    for (const y of Object.keys(byYear)) byYear[y].sort((a, b) => b.y - a.y || a.x - b.x); // north first, then west
    const spare = [];
    for (const year of [1, 2, 3]) {
      const pool = byYear[year] || [];
      const who = students.filter((a) => a.year === year).sort((a, b) => a.section - b.section || a.id - b.id);
      let i = 0;
      for (const a of who) { if (i < pool.length) { pool[i].owner = a.id; a.desk = pool[i]; i++; } }
      for (; i < pool.length; i++) spare.push(pool[i]);
    }
    // anyone without a desk takes the spare nearest their year's zone (the zone lines are assumed; see QUESTIONS.md)
    for (const year of [1, 2, 3]) {
      const mine = byYear[year] || []; if (!mine.length) continue;
      const cx = mine.reduce((s, d) => s + d.x, 0) / mine.length, cy = mine.reduce((s, d) => s + d.y, 0) / mine.length;
      spare.sort((p, q) => ((p.x - cx) ** 2 + (p.y - cy) ** 2) - ((q.x - cx) ** 2 + (q.y - cy) ** 2));
      for (const a of students) if (a.year === year && !a.desk && spare.length) { const d = spare.shift(); d.owner = a.id; a.desk = d; }
    }
    for (const d of spare) d.hot = true;
    this.hotDesks = spare;
    // instructors: an office desk only for those with an office in this building (D17; owner 2026-11-08, question 2); adjuncts have none.
    // Floor order from the faculty profiles (2026-11-11, question 22): Level 2 first, then 4, then 3 (`population.instructors.office_level_order`)
    const instructors = agents.filter((a) => a.role === 'instructor');
    const order = this.P.population?.instructors?.office_level_order || ['Level 2', 'Level 4', 'Level 3'];
    const rank = (o) => { const i = order.indexOf(o.room.level); return i < 0 ? order.length : i; };
    const offices = [...this.offices].sort((a, b) => rank(a) - rank(b) || Number(a.room.number) - Number(b.room.number));
    let oi = 0;
    for (const a of instructors) { a.office = null; a.officeDesk = null; if (!a.officeHere) continue; const o = offices[oi % offices.length]; oi++; a.office = o.room.number; a.officeDesk = o.desks[0]; }
    return { assigned: students.filter((a) => a.desk).length, hot: spare.length };
  }

  /** The washroom for an agent (owner 2026-11-08, question 1): students use the nearest of Level 1 and Level 2 by the floor they are on
   *  (Level 2 from the studio, Level 1 from a lecture), of their sex where the level has one; the Level 4 rooms are the professors'. */
  washroomFor(agent, k) {
    const usable = this.washrooms.filter((w) => w.stalls.length);
    const l4 = this.levelOf('Level 4')?.k, l1 = this.levelOf('Level 1')?.k, l2 = this.levelOf('Level 2')?.k;
    const fits = (w) => w.sex === 'any' || w.sex === agent.sex;
    const rank = (w) => Math.abs(w.k - k) * 10 + (fits(w) ? 0 : 5) + (w.sex === 'any' ? 1 : 0);
    let pool;
    if (agent.role === 'instructor') pool = usable.filter((w) => w.k === l4);
    else pool = usable.filter((w) => (w.k === l1 || w.k === l2 || w.k === k) && w.k !== l4);
    if (!pool.length) pool = usable;
    return pool.sort((a, b) => rank(a) - rank(b))[0] || null;
  }
  /** A piece moved on the grid (the layout manager): footprint tiles swapped, components relabelled, the path cache cleared. */
  /** Pieces that block walking (everything but chairs, bins, lamps and the perimeter) are counted per tile, and the walk a tile
   *  would have with no piece on it is kept, so moving a piece away uncovers only what it alone covered: a footprint that
   *  overlapped a desk, a printer or another board used to open those tiles when it left (found by the sweep, 2026-11-11). */
  initCover() {
    const SKIP = new Set(['lamp', 'perimeter', 'chair', 'bin']);
    for (const lv of this.levels) {
      const g = lv.grid, L = lv.L; g.cover = new Int16Array(g.walk.length); g.walk0 = g.walk.slice();
      g.gapTiles = new Set(this.gaps.filter((x) => x.k === lv.k).flatMap((x) => x.tiles.map(([c, r]) => g.idx(c, r))));   // rolled-open tiles stay open
      const noGo = new Set((L.no_go || []).map(([c, r]) => g.idx(c, r)));
      for (const f of L.furniture || []) { if (SKIP.has(f.kind) || f.transit) continue; for (let r = Math.max(0, f.r0); r <= Math.min(g.rows - 1, f.r1); r++) for (let c = Math.max(0, f.c0); c <= Math.min(g.cols - 1, f.c1); c++) { const i = g.idx(c, r); g.cover[i]++; if (L.floor[r][c] >= 1 && (L.struct[r][c] === 0 || L.struct[r][c] === 4) && !noGo.has(i) && g.walk0[i] === WALK.NO) g.walk0[i] = WALK.FLOOR; } }
    }
    for (const p of this.pieces || []) { const g = this.levels[p.k].grid; p.gapped = false; if (g.gapTiles && g.gapTiles.size) for (let r = p.r0; r <= p.r1 && !p.gapped; r++) for (let c = p.c0; c <= p.c1; c++) if (g.inb(c, r) && g.gapTiles.has(g.idx(c, r))) { p.gapped = true; break; } }
  }
  /** The layout as loaded, kept before the first run; every later run puts it back first, so a run after a rearranging run
   *  (or a rewind) starts from the model, not from the last run's moves (2026-11-13). Desk owners are cleared for assignDesks. */
  restoreLayout() {
    if (!this.layoutHome) { this.layoutHome = { pieces: (this.pieces || []).map((p) => [p, p.c0, p.r0, p.stand && p.stand.slice()]), desks: this.studioDesks.map((d) => [d, d.stand && d.stand.slice()]), kitchenSpots: this.kitchenSpots.slice() }; }
    else {
      for (const [p, c0, r0] of this.layoutHome.pieces) if (p.c0 !== c0 || p.r0 !== r0) this.movePiece(p, c0, r0);
      for (const [p, , , st] of this.layoutHome.pieces) p.stand = st && st.slice();
      for (const [d, st] of this.layoutHome.desks) d.stand = st && st.slice();
      this.kitchenSpots = this.layoutHome.kitchenSpots.slice();   // a table the agents brought to the kitchen goes again
      this.paths.clear();
    }
    for (const d of this.studioDesks) { d.owner = null; d.hot = false; d.screened = false; }
    for (const p of this.pieces || []) { p.shared = false; p.screened = false; }   // the layout manager's marks (layout.js)
  }
  movePiece(piece, c0, r0) {
    const lv = this.levels[piece.k], g = lv.grid, w = piece.c1 - piece.c0, h = piece.r1 - piece.r0;
    if (!g.cover) this.initCover();
    for (let r = piece.r0; r <= piece.r1; r++) for (let c = piece.c0; c <= piece.c1; c++) if (g.inb(c, r)) { const i = g.idx(c, r); g.cover[i] = Math.max(0, g.cover[i] - 1); if (g.cover[i] === 0) g.walk[i] = g.walk0[i]; }
    piece.c0 = c0; piece.r0 = r0; piece.c1 = c0 + w; piece.r1 = r0 + h;
    for (let r = piece.r0; r <= piece.r1; r++) for (let c = piece.c0; c <= piece.c1; c++) if (g.inb(c, r)) { const i = g.idx(c, r); g.cover[i]++; if (!g.gapTiles || !g.gapTiles.has(i)) g.walk[i] = WALK.NO; }
    g.labelComponents(); this.paths.clear();
    piece.stand = this.standingTile(lv, piece);
    for (const d of this.studioDesks) if (d.k === piece.k && (!d.stand || g.walk[g.idx(d.stand[0], d.stand[1])] !== WALK.FLOOR)) d.stand = this.standingTile(lv, d);
  }
  /** A walked path on one level, cached; null if none. */
  path(k, from, to) {
    const key = `${k}:${from[0]},${from[1]}>${to[0]},${to[1]}`;
    if (this.paths.has(key)) return this.paths.get(key);
    const p = findPath(this.levels[k].grid, from, to);
    if (this.paths.size > 20000) this.paths.clear();
    this.paths.set(key, p); return p;
  }
  pathMetres(k, from, to) { const p = this.path(k, from, to); return p ? pathLength(p) * this.levels[k].grid.tm : Infinity; }
  /** Model metres of a tile. */
  xy(k, c, r) { return this.levels[k].grid.toWorld(c, r); }
}
