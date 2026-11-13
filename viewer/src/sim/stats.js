// The aggregators: what the analysis reads instead of the ticks. Tile fields per level (occupancy
// seconds, noise, path counts), the pair table (face-to-face seconds, encounters, interactions,
// between-year flag), the encounter sites, focus blocks and interruptions per agent, desk exposure,
// queue waits per resource, and the layout's moves. Filled by the engine as it runs.
export class Stats {
  constructor(world, pop) {
    this.w = world; this.pop = pop;
    this.fields = world.levels.map((lv) => ({ occ: new Float32Array(lv.grid.walk.length), noise: new Float32Array(lv.grid.walk.length), paths: new Float32Array(lv.grid.walk.length), passers: new Float32Array(lv.grid.walk.length) }));
    this.pairs = new Map();          // key -> { f2f, enc, inter, between, sameSection }
    this.sites = new Map();          // `${k}:${i}` -> { k, c, r, n, between, same, t0 }
    this.focus = new Map();          // agent id -> { blocks: [], interruptions, focusSeconds, current }
    this.exposure = new Map();       // agent id -> passers-by count while at desk
    this.queues = { plotters: [], lift: [], kitchen: [], printer3d: [] };   // wait seconds
    this.waits = { plotters: 0 };
    this.remarks = 0; this.encounters = 0; this.interactions = 0; this.between = 0;
    this.deskSeconds = new Map();    // agent id -> seconds at own desk
    this.presence = new Map();       // agent id -> seconds in the building
    this.hourly = [];                // headcount per hour on the studio floor and in the building
    this.where = { route: 0, desk: 0, room: 0 };
    this.help = [];                  // help latency samples (s)
    this.byYearEnc = { same: 0, between: 0 };
    this.layoutMoves = [];
    this.amenityUse = new Map();     // agent id -> Set of amenity keys used
    this.pathsList = [];             // walked paths for the overlay (thinned)
  }
  key(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
  pair(a, b) { const k = this.key(a.id, b.id); let p = this.pairs.get(k); if (!p) { p = { a: a.id, b: b.id, f2f: 0, enc: 0, inter: 0, between: a.year !== b.year, sameSection: a.year === b.year && a.section === b.section }; this.pairs.set(k, p); } return p; }
  /** Called once a minute with every agent in the building. */
  minute(agents, t) {
    const h = Math.floor(t / 3600), studioK = this.w.studio.k;
    if (!this.hourly[h]) this.hourly[h] = { h, floor: 0, building: 0, samples: 0 };
    const row = this.hourly[h]; row.samples++;
    for (const ag of agents) {
      if (!ag.inside) continue;
      row.building++; if (ag.k === studioK) row.floor++;
      const f = this.fields[ag.k]; f.occ[this.w.levels[ag.k].grid.idx(ag.c, ag.r)] += 60;
      this.presence.set(ag.a.id, (this.presence.get(ag.a.id) || 0) + 60);
      if (ag.activity === 'desk_work' && ag.atOwnDesk) this.deskSeconds.set(ag.a.id, (this.deskSeconds.get(ag.a.id) || 0) + 60);
    }
  }
  addNoise(k, c, r, amount, radius = 3) {
    const g = this.w.levels[k].grid, f = this.fields[k].noise, room = this.w.roomAt(k, c, r);
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) { const cc = c + dc, rr = r + dr; if (!g.inb(cc, rr)) continue; if (this.w.roomAt(k, cc, rr) !== room) continue; const d = Math.hypot(dc, dr); if (d > radius) continue; f[g.idx(cc, rr)] += amount / (1 + d); }
  }
  addPath(k, path, year) { const g = this.w.levels[k].grid, f = this.fields[k].paths; for (const [c, r] of path) f[g.idx(c, r)] += 1; if (path.length > 3 && this.pathsList.length < 4000) this.pathsList.push({ k, year: year || 0, pts: path.length > 60 ? path.filter((_, i) => i % 2 === 0 || i === path.length - 1) : path }); }
  encounter(a, b, k, c, r, t, seconds) {
    const p = this.pair(a, b); p.enc++;
    const g = this.w.levels[k].grid, key = `${k}:${g.idx(c, r)}`;
    let s = this.sites.get(key); if (!s) { s = { k, c, r, n: 0, between: 0, same: 0, t0: t }; this.sites.set(key, s); }
    s.n++; if (p.between) { s.between++; this.byYearEnc.between++; } else { s.same++; this.byYearEnc.same++; }
    this.encounters++;
    const room = this.w.roomAt(k, c, r);
    const atDesk = this.w.studio && room === Number(this.w.studio.number) && (a.desk && Math.abs(a.desk.stand[0] - c) + Math.abs(a.desk.stand[1] - r) <= 2 || b.desk && Math.abs(b.desk.stand[0] - c) + Math.abs(b.desk.stand[1] - r) <= 2);
    if (atDesk) this.where.desk++; else if (this.w.studio && room === Number(this.w.studio.number)) this.where.route++; else this.where.room++;
    return p;
  }
  interaction(a, b, seconds = 120) { const p = this.pair(a, b); p.inter++; p.f2f += seconds; this.interactions++; if (p.between) this.between++; }
  copresence(a, b, seconds) { const p = this.pair(a, b); p.co = (p.co || 0) + seconds; }
  focusStart(id, t) { const f = this.focusFor(id); if (f.current == null) f.current = t; }
  focusEnd(id, t, interrupted) { const f = this.focusFor(id); if (f.current != null) { const d = t - f.current; if (d >= 60) f.blocks.push(d); f.focusSeconds += d; f.current = null; } if (interrupted) f.interruptions++; }
  focusFor(id) { let f = this.focus.get(id); if (!f) { f = { blocks: [], interruptions: 0, focusSeconds: 0, current: null }; this.focus.set(id, f); } return f; }
  passer(deskOwnerId, k, c, r, w = 1) { this.exposure.set(deskOwnerId, (this.exposure.get(deskOwnerId) || 0) + w); this.fields[k].passers[this.w.levels[k].grid.idx(c, r)] += w; }
  queued(resource, seconds) { (this.queues[resource] = this.queues[resource] || []).push(seconds); }
  used(id, amenity) { let s = this.amenityUse.get(id); if (!s) { s = new Set(); this.amenityUse.set(id, s); } s.add(amenity); }
}
