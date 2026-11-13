// The layout manager: under "agents rearrange" (and "free") the design suggestions happen in real
// time, by the agents (owner, 2026-11-08). Every half hour of the run it reads the live aggregates
// for the same signals the suggestion rules test at the end (a plotter queue, an exposed desk, a
// crowded kitchen, the years not meeting) and, when one trips, the agents concerned move the
// nearest movable piece themselves: a side table to the plotter corner to lay sheets out on, a
// board rolled to screen an exposed desk from the aisle, a side table beside the kitchen as an
// overflow counter, a board moved to the boundary between two years' zones as a shared pin-up
// wall. Constraints (program/parameters.json layout.manager): a daily budget, a cooldown per
// piece, a veto by the desk owners the move affects (none under "free"), the floor must stay
// connected and no desk may lose its standing tile. Each move is an event with the agents who
// moved it, a remark, and a record (run.layout.moves) carrying the signal before and, at the end,
// after, so the suggestion it anticipates can say what the agents' own attempt did.
import { WALK } from './grid.js';
import { hhmm } from './calendar.js';

const M = 60, H = 3600;
const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class LayoutManager {
  constructor(run) {
    this.run = run; this.w = run.w; this.level = run.movement;
    this.P = run.P.layout.manager;
    this.moves = run.layout.moves;
    this.budget = this.level === 'free' ? this.P.budget_per_day.free : this.level === 'agents' ? this.P.budget_per_day.agents : 0;
    this.lastCheck = run.time; this.cooldown = new Map(); this.expoSnap = new Map(); this.betweenDone = false; this.kitchenPeaks = 0;
    this.pieces = this.w.studio ? this.w.studio.pieces.filter((p) => (this.P.movable_kinds || []).includes(p.kind) && p.stand) : [];
  }
  active() { return this.level !== 'everyday' && this.budget > 0; }
  /** Called every tick; does its work every check_every_min of run time. */
  tick() {
    if (!this.active()) return;
    const run = this.run; if (run.time - this.lastCheck < this.P.check_every_min * M) return;
    const windowH = (run.time - this.lastCheck) / H; this.lastCheck = run.time;
    if (this.moves.length >= this.budget) return;
    this.checkQueue(); this.checkExposure(windowH); this.checkKitchen(); this.checkBetween();
  }
  // ---------------------------------------------------------------- the signals
  checkQueue() {
    const run = this.run, pl = run.plotter; if (pl.queue.length < this.P.triggers.queue_len || run.layout.plotterTable) return;
    const plot = this.w.plotters[0]; if (!plot) return;
    const movers = pl.queue.slice(0, 2);
    const piece = this.nearestPiece('table', plot.stand, this.P.max_move_tiles); if (!piece) return;
    const to = this.findSpot(piece, plot.stand, 2, 10); if (!to) return;   // within 5 m of the plotters: no spot within 3 m keeps the north offices connected (2026-11-12)
    const mv = this.tryMove(piece, to, movers, 'queue', 'F8 QUEUE', `queue ${pl.queue.length} at the plotters`, 'a side table to the plotter corner, to lay sheets out and work while waiting', { before: pl.queue.length });
    if (mv) { run.layout.plotterTable = piece; mv.workedMin = 0; }
  }
  checkExposure(windowH) {
    const run = this.run, st = run.stats; let best = null, bestRate = 0;
    for (const d of this.w.studioDesks) {
      if (!d.owner || d.screened) continue; const o = run.byId.get(d.owner); if (!o || !o.inside || o.activity !== 'desk_work') continue;
      const now = st.exposure.get(d.owner) || 0, then = this.expoSnap.get(d.owner) || 0; this.expoSnap.set(d.owner, now);
      const rate = windowH > 0 ? (now - then) / windowH : 0;
      if (rate > bestRate) { bestRate = rate; best = d; }
    }
    for (const [id, v] of st.exposure) if (!this.expoSnap.has(id)) this.expoSnap.set(id, v);
    if (!best || bestRate < this.P.triggers.exposure_passers_per_h) return;
    const owner = run.byId.get(best.owner);
    const piece = this.nearestPiece('pinup', best.stand, this.P.max_move_tiles); if (!piece) return;
    // the aisle side: the most-walked floor tile beside the desk's standing tile
    const g = this.w.levels[best.k].grid, f = run.stats.fields[best.k].passers; let tile = null, hits = -1;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const c = best.stand[0] + dc, r = best.stand[1] + dr; if (!g.inb(c, r) || (dc === 0 && dr === 0) || g.walk[g.idx(c, r)] !== WALK.FLOOR) continue; const h = f[g.idx(c, r)]; if (h > hits) { hits = h; tile = [c, r]; } }
    if (!tile) return;
    const to = this.findSpot(piece, tile, 0, 2, best.stand); if (!to) return;
    const mv = this.tryMove(piece, to, [owner], 'exposure', 'F2 HIGH', `${bestRate.toFixed(0)} passers an hour at ${owner.a.name}'s desk`, `the board rolled to the aisle side of ${owner.a.name}'s desk as a screen`, { before: bestRate, desk: best.owner });
    if (mv) { best.screened = true; mv.exposureAt = run.stats.exposure.get(best.owner) || 0; }
  }
  checkKitchen() {
    const run = this.run, k = this.w.kitchen; if (!k || run.layout.kitchenTable) return;
    const n = run.agents.filter((x) => x.inside && x.k === k.k && this.w.roomAt(x.k, x.c, x.r) === Number(k.number)).length;
    if (n < this.P.triggers.kitchen_n) return;
    if (++this.kitchenPeaks < 2) return;
    const movers = run.agents.filter((x) => x.inside && x.k === k.k && this.w.roomAt(x.k, x.c, x.r) === Number(k.number)).slice(0, 2);
    // just outside the kitchen: the lounge floor nearest the kitchen's centroid
    const g = this.w.levels[k.k].grid; let cx = 0, cy = 0; for (const i of k.tiles) { const [c, r] = g.cr(i); cx += c; cy += r; } cx /= k.tiles.length; cy /= k.tiles.length;
    const piece = this.nearestPiece('table', [Math.round(cx), Math.round(cy)], this.P.kitchen_reach_tiles ?? this.P.max_move_tiles * 2); if (!piece) return;   // the nearest table is 21 tiles off (owner 2026-11-12, item 27)
    const target = this.w.loungeFloor.map((i) => g.cr(i)).sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy))[0]; if (!target) return;
    const to = this.findSpot(piece, target, 0, 4); if (!to) return;
    const mv = this.tryMove(piece, to, movers, 'kitchen', 'C1 LOW', `${n} people in the kitchen`, 'a side table outside the kitchen as an overflow counter', { before: n });
    if (mv) { run.layout.kitchenTable = piece; this.w.kitchenSpots.push(piece); mv.kitchenMax = 0; }
  }
  checkBetween() {
    const run = this.run; if (this.betweenDone || run.layout.sharedBoard) return;
    const [hh, mm] = this.P.triggers.between_check.split(':').map(Number); if (run.time < hh * H + mm * M) return;
    this.betweenDone = true;
    const e = run.stats.byYearEnc, share = e.between + e.same ? e.between / (e.between + e.same) : 0;
    if (share >= this.P.triggers.between_share) return;
    const cen = (y) => { const ds = this.w.studioDesks.filter((d) => d.year === y); return ds.length ? [ds.reduce((s, d) => s + d.stand[0], 0) / ds.length, ds.reduce((s, d) => s + d.stand[1], 0) / ds.length] : null; };
    const a = cen(1), b = cen(3) || cen(2); if (!a || !b) return;
    const mid = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
    const piece = this.nearestPiece('pinup', mid, this.P.max_move_tiles * 2); if (!piece) return;
    const to = this.findSpot(piece, mid, 0, 6); if (!to) return;
    const movers = run.agents.filter((x) => x.inside && x.k === this.w.studio.k && x.a.role === 'student' && x.activity !== 'crit').slice(0, 2);
    const mv = this.tryMove(piece, to, movers, 'between', 'C6 LOW', `${(share * 100).toFixed(0)}% of encounters between years by ${hhmm(run.time)}`, 'a pin-up board moved to the boundary between the years as a shared wall', { before: share });
    if (mv) { run.layout.sharedBoard = piece; piece.shared = true; }
  }
  // ---------------------------------------------------------------- the mechanics
  /** The nearest free piece of a kind; a piece already rolled aside for a gap (world.gaps) is left where it is. */
  nearestPiece(kind, at, maxTiles) {
    let best = null, bd = Infinity;
    for (const p of this.pieces) { if (p.kind !== kind || !p.stand || p.gapped) continue; if ((this.cooldown.get(p.id) || -Infinity) > this.run.time) continue; const d = Math.hypot((p.c0 + p.c1) / 2 - at[0], (p.r0 + p.r1) / 2 - at[1]); if (d < bd && d <= maxTiles) { bd = d; best = p; } }
    return best;
  }
  /** A place for the piece's footprint near a target: all tiles floor of the main component, none a standing tile in use. */
  findSpot(piece, target, rMin, rMax, keepStand) {
    const g = this.w.levels[piece.k].grid, w = piece.c1 - piece.c0, h = piece.r1 - piece.r0;
    const reserved = new Set();
    for (const d of this.w.studioDesks) if (d.stand) reserved.add(g.idx(...d.stand));
    for (const p of [...this.w.plotters, ...this.w.printers, ...this.w.computers, ...this.w.kitchenSpots]) if (p.stand && p.k === piece.k) reserved.add(g.idx(...p.stand));
    if (keepStand) reserved.add(g.idx(...keepStand));
    const cands = [];
    for (let dr = -rMax; dr <= rMax; dr++) for (let dc = -rMax; dc <= rMax; dc++) { const d = Math.hypot(dc, dr); if (d < rMin || d > rMax) continue; cands.push([target[0] + dc - Math.floor(w / 2), target[1] + dr - Math.floor(h / 2), d]); }
    cands.sort((p, q) => p[2] - q[2]);
    for (const [c0, r0] of cands) {
      let ok = true;
      for (let r = r0; r <= r0 + h && ok; r++) for (let c = c0; c <= c0 + w && ok; c++) { if (!g.inb(c, r)) { ok = false; break; } const i = g.idx(c, r); if (g.walk[i] !== WALK.FLOOR || g.comp[i] !== g.main || reserved.has(i)) ok = false; }
      if (!ok) continue;
      // a candidate must also keep the floor connected and every desk its standing tile: a trial move, then back
      // (owner 2026-11-12, item 27: the first spot used to be the only one tried, so the plotter table never found a place)
      const from = { c0: piece.c0, r0: piece.r0 }, keep = this.floorStart?.[piece.k] ?? g.componentSizes[g.main];
      this.w.movePiece(piece, c0, r0);
      const fits = g.componentSizes[g.main] >= keep * this.P.min_main_component_keep && !!piece.stand && !this.w.studioDesks.some((d) => d.owner && !d.stand);
      this.w.movePiece(piece, from.c0, from.r0);
      if (fits) return [c0, r0];
    }
    return null;
  }
  /** Propose, veto, apply, check connectivity (revert if broken), record and announce. */
  tryMove(piece, to, movers, trigger, tag, signal, what, extra) {
    const run = this.run, g = this.w.levels[piece.k].grid;
    if (this.moves.length >= this.budget) return null;   // the day's budget, checked per attempt (four signals can fire in one tick)
    // a cap per trigger (owner 2026-11-12, item 27): screens may not spend the whole budget, so the other moves get their chance
    const cap = this.P.per_trigger_cap?.[trigger];
    if (cap != null && this.moves.filter((m) => m.trigger === trigger).length >= cap) return null;
    const from = { c0: piece.c0, r0: piece.r0 }, w = piece.c1 - piece.c0 + 1, h = piece.r1 - piece.r0 + 1;
    // the desk owners the new place affects may veto (not under free)
    const affected = this.w.studioDesks.filter((d) => d.owner && d.stand && !movers.some((m) => m.a.id === d.owner) && d.stand[0] >= to[0] - 2 && d.stand[0] <= to[0] + w + 1 && d.stand[1] >= to[1] - 2 && d.stand[1] <= to[1] + h + 1).map((d) => run.byId.get(d.owner)).filter((x) => x && x.inside);
    if (this.level !== 'free' && affected.length) {
      const meanA = affected.reduce((s, x) => s + x.a.traits.A, 0) / affected.length;
      const pVeto = clip(this.P.veto.base + this.P.veto.w_A * meanA, 0.02, 0.9);
      if (run.rng.chance(pVeto)) {
        const who = affected.sort((p, q) => p.a.traits.A - q.a.traits.A)[0];
        this.cooldown.set(piece.id, run.time + this.P.cooldown_h * H);
        run.emit('move_veto', { agents: [who.a.id, ...movers.map((m) => m.a.id)], k: piece.k, c: to[0], r: to[1], place: 'the studio', text: `${who.a.name} vetoes moving the ${piece.kind} beside their desk (${signal})`, trigger, tag });
        run.remarkFor(who, 'move_veto', { what: piece.kind === 'pinup' ? 'board' : piece.kind }, `veto: P ${pVeto.toFixed(2)} from the affected owners' agreeableness (mean A ${meanA.toFixed(1)}); ${signal}`);
        return null;
      }
    }
    const mainBefore = g.componentSizes[g.main];
    this.floorStart = this.floorStart || {}; if (this.floorStart[piece.k] == null) this.floorStart[piece.k] = mainBefore;   // the floor as the day began: moves may not cut it cumulatively (sweep 2026-11-11)
    this.w.movePiece(piece, to[0], to[1]);
    const mainAfter = g.componentSizes[g.main], lostStand = this.w.studioDesks.some((d) => d.owner && !d.stand);
    if (mainAfter < this.floorStart[piece.k] * this.P.min_main_component_keep || lostStand || !piece.stand) { this.w.movePiece(piece, from.c0, from.r0); this.cooldown.set(piece.id, run.time + this.P.cooldown_h * H); return null; }
    this.cooldown.set(piece.id, run.time + this.P.cooldown_h * H);
    const mv = { id: this.moves.length + 1, t: run.time, k: piece.k, kind: piece.kind, pieceId: piece.id, from, to: { c0: to[0], r0: to[1] }, w, h, trigger, tag, signal, what, movers: movers.map((m) => m.a.id), ...extra };
    this.moves.push(mv); run.stats.layoutMoves.push(mv);
    const word = piece.kind === 'pinup' ? 'board' : piece.kind;
    const ev = run.emit('desk_move', { agents: mv.movers, k: piece.k, c: to[0], r: to[1], place: 'the studio', text: `${movers.map((m) => m.a.name).join(' and ') || 'students'} move a ${word}: ${what} (${signal})`, trigger, tag, moveId: mv.id });
    mv.eventId = ev.id;
    if (movers[0]) run.remarkFor(movers[0], 'desk_move', { what: word, where: what.replace(/^(a|the) (side table|board|pin-up board) /, '') }, `${tag} anticipated live: ${signal}; movement level ${this.level}`);
    // the movers walk to the piece's new place
    for (const m of movers) if (m.inside && m.state !== 'queue' && piece.stand) { const n = g.neighbours(g.idx(...piece.stand)).map(([i]) => g.cr(i))[0] || piece.stand; m.c = n[0]; m.r = n[1]; m.x = n[0]; m.y = n[1]; }
    return mv;
  }
  /** Per-minute effects of the moves that stand. */
  minute() {
    const run = this.run;
    if (run.layout.plotterTable) { const mv = this.moves.find((m) => m.trigger === 'queue'); if (mv) for (const ag of run.plotter.queue) if (ag.state === 'queue' && !ag.printing) mv.workedMin += 1; }
    if (run.layout.kitchenTable) { const mv = this.moves.find((m) => m.trigger === 'kitchen'); const k = this.w.kitchen; if (mv && k) mv.kitchenMax = Math.max(mv.kitchenMax, run.agents.filter((x) => x.inside && x.k === k.k && this.w.roomAt(x.k, x.c, x.r) === Number(k.number)).length); }
  }
  /** At the end: what each move did, in the signal's own unit. */
  evaluate() {
    const run = this.run, out = [];
    for (const mv of this.moves) {
      const hoursAfter = Math.max(0.25, (run.time - mv.t) / H);
      if (mv.trigger === 'exposure') { const now = run.stats.exposure.get(mv.desk) || 0; mv.after = (now - (mv.exposureAt || 0)) / hoursAfter; mv.effect = `passers at that desk ${mv.before.toFixed(0)} → ${mv.after.toFixed(0)} an hour`; }
      else if (mv.trigger === 'queue') { mv.after = mv.workedMin; mv.effect = `${mv.workedMin} queue-minutes spent at the table instead of standing`; }
      else if (mv.trigger === 'kitchen') { mv.after = mv.kitchenMax; mv.effect = `kitchen peak ${mv.before} → ${mv.kitchenMax} after the table`; }
      else if (mv.trigger === 'between') { const e = run.stats.byYearEnc; const share = e.between + e.same ? e.between / (e.between + e.same) : 0; mv.after = share; mv.effect = `between-year share ${(mv.before * 100).toFixed(0)}% → ${(share * 100).toFixed(0)}% by the end`; }
      out.push(mv);
    }
    return out;
  }
}
