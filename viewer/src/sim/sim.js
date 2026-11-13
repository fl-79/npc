// The first simulation piece: agents that move about the building, between floors by the stairs
// or the elevator, with the elevator under collective control. The agents here are test
// occupants with no schedule: each picks a destination on another floor, goes there, stays a
// while, picks the next. Everything they walk on comes from the tiles; every number from
// program/simulation.json, marked there as assumed.
import { WALK } from './grid.js';
import { findPath } from './path.js';
import { Elevator } from './elevator.js';

// a small deterministic generator (mulberry32) so a run can be repeated
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class Simulation {
  constructor(building, params, { seed = 1, mode = 'auto' } = {}) {
    this.b = building;
    this.p = params;
    this.rand = rng(seed);
    this.mode = mode;                  // auto | stairs | elevator
    this.lift = new Elevator(params.elevator || {}, building.levels.length);
    this.agents = [];
    this.time = 0;
    this.running = false;
    this.log = [];
    this.stats = { trips: 0, stairTrips: 0, liftTrips: 0, waitTotal: 0, waits: 0, maxWait: 0 };
    this.speed = (params.walking?.speed_m_per_s ?? 1.3);
    this.stairSec = params.walking?.stair_seconds_per_floor ?? 18;
    this.nextId = 1;
  }
  say(msg) { this.log.push(`${this.clock()}  ${msg}`); if (this.log.length > 60) this.log.shift(); }
  clock() { const s = Math.floor(this.time); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  levelName(k) { return this.b.levels[k].name; }

  randomFloorTile(k) {
    const g = this.b.levels[k].grid, tiles = g.mainFloorTiles();
    return g.cr(tiles[Math.floor(this.rand() * tiles.length)]);
  }
  spawn(n) {
    for (let i = 0; i < n; i++) {
      const k = Math.floor(this.rand() * this.b.levels.length);
      const [c, r] = this.randomFloorTile(k);
      const a = { id: this.nextId++, k, c, r, x: c, y: r, face: 0, state: 'idle', steps: [], path: null, pi: 0, timer: this.rand() * 10, via: null, waitStart: 0, trip: null };
      this.agents.push(a);
      this.newGoal(a);
    }
  }
  /** A destination on another floor, and the route to it. */
  newGoal(a) {
    let k;
    do k = Math.floor(this.rand() * this.b.levels.length); while (k === a.k && this.b.levels.length > 1);
    const [c, r] = this.randomFloorTile(k);
    this.plan(a, k, c, r);
  }
  /** The steps from where the agent stands to (k, c, r): walks, stairs hop by hop, or the lift. */
  plan(a, k, c, r) {
    const diff = Math.abs(k - a.k);
    let via = 'walk';
    if (diff > 0) {
      if (this.mode === 'stairs') via = 'stairs';
      else if (this.mode === 'elevator') via = 'lift';
      else {
        const ch = this.p.choice || {};
        const short = diff <= (ch.stairs_if_floors_at_most ?? 1);
        via = short ? (this.rand() < (ch.stairs_share_short ?? 0.8) ? 'stairs' : 'lift') : (this.rand() < (ch.elevator_share_long ?? 0.7) ? 'lift' : 'stairs');
      }
    }
    const steps = [];
    if (via === 'lift') {
      const from = this.b.landings[a.k], to = this.b.landings[k];
      if (!from || !to) via = 'stairs';
      else {
        steps.push({ type: 'walk', k: a.k, c: from.c, r: from.r });
        steps.push({ type: 'lift', from: a.k, to: k, dir: k > a.k ? 1 : -1 });
        steps.push({ type: 'walk', k, c, r });
      }
    }
    if (via === 'stairs') {
      // hop by hop: on each level the nearest stair going the right way
      let ck = a.k, cc = a.c, cr = a.r, ok = true;
      const dir = k > a.k ? 1 : -1;
      while (ck !== k) {
        const s = this.b.nearestStair(ck, cc, cr, dir);
        if (!s) { ok = false; break; }
        steps.push({ type: 'walk', k: ck, c: s.portal.from.c, r: s.portal.from.r });
        steps.push({ type: 'stairs', portal: s.portal });
        ck = s.portal.to.k; cc = s.portal.to.c; cr = s.portal.to.r;
      }
      if (ok) steps.push({ type: 'walk', k, c, r });
      else { steps.length = 0; const from = this.b.landings[a.k], to = this.b.landings[k]; if (from && to) { via = 'lift'; steps.push({ type: 'walk', k: a.k, c: from.c, r: from.r }, { type: 'lift', from: a.k, to: k, dir: k > a.k ? 1 : -1 }, { type: 'walk', k, c, r }); } }
    }
    if (via === 'walk') steps.push({ type: 'walk', k, c, r });
    const dw = this.p.agents?.dwell_seconds || [20, 90];
    steps.push({ type: 'dwell', seconds: dw[0] + this.rand() * (dw[1] - dw[0]) });
    a.steps = steps; a.via = via; a.trip = { start: this.time, via, from: a.k, to: k };
    this.say(`#${a.id} ${this.levelName(a.k)} -> ${this.levelName(k)} by ${via === 'lift' ? 'the lift' : via === 'stairs' ? 'the stairs' : 'foot'}`);
    this.startStep(a);
  }
  startStep(a) {
    const s = a.steps[0];
    if (!s) { this.newGoal(a); return; }
    if (s.type === 'walk') {
      if (s.k !== a.k) { a.steps.shift(); this.startStep(a); return; }
      const g = this.b.levels[a.k].grid;
      const path = findPath(g, [a.c, a.r], [s.c, s.r]);
      if (!path) {
        // stuck off the floor proper: back to it, and a new goal next tick (never a recursion)
        this.say(`#${a.id} cannot reach the goal on ${this.levelName(a.k)}; moved back to the floor`);
        [a.c, a.r] = this.randomFloorTile(a.k); a.x = a.c; a.y = a.r; a.steps = []; a.state = 'dwelling'; a.timer = 1; a.trip = null;
        return;
      }
      a.path = path; a.pi = 0; a.state = 'walking';
    } else if (s.type === 'stairs') {
      a.state = 'climbing'; a.timer = this.stairSec;
    } else if (s.type === 'lift') {
      a.state = 'waiting'; a.waitStart = this.time;
      this.lift.call(s.from, s.dir, this.time);
      this.say(`#${a.id} presses ${s.dir > 0 ? 'up' : 'down'} at ${this.levelName(s.from)}`);
    } else if (s.type === 'dwell') {
      a.state = 'dwelling'; a.timer = s.seconds;
      if (a.trip) { this.stats.trips++; if (a.trip.via === 'lift') this.stats.liftTrips++; else if (a.trip.via === 'stairs') this.stats.stairTrips++; a.trip = null; }
    }
  }
  finishStep(a) { a.steps.shift(); this.startStep(a); }

  step(dt) {
    this.time += dt;
    const lift = this.lift;
    lift.step(dt, this.time);
    for (const e of lift.events) {
      if (e.type === 'doors_open') {
        // passengers for this floor step out onto the landing
        const land = this.b.landings[e.floor];
        for (const a of lift.alight()) {
          a.k = e.floor; a.c = land.c; a.r = land.r; a.x = a.c; a.y = a.r;
          this.say(`#${a.id} steps out at ${this.levelName(e.floor)}`);
          this.finishStep(a);
        }
      }
    }
    // waiting agents keep their call registered (a full car may have wiped it) and board when the doors are open at
    // their floor and the car goes their way (or has no way yet)
    for (const a of this.agents) if (a.state === 'waiting') lift.call(a.steps[0].from, a.steps[0].dir, a.waitStart);
    if (lift.state === 'open') {
      // first come first served at the landing: the longest waiter steps in first
      const waiting = this.agents.filter((a) => a.state === 'waiting').sort((p, q) => p.waitStart - q.waitStart);
      for (const a of waiting) {
        const s = a.steps[0];
        if (s.from !== lift.floor || lift.free <= 0) continue;
        if (lift.dir !== 0 && lift.dir !== s.dir && lift.passengers.length) continue;
        if (lift.dir === 0) lift.dir = s.dir;
        lift.board(a, s.to, this.time);
        const w = this.time - a.waitStart;
        this.stats.waitTotal += w; this.stats.waits++; this.stats.maxWait = Math.max(this.stats.maxWait, w);
        a.state = 'riding';
        this.say(`#${a.id} boards at ${this.levelName(lift.floor)} for ${this.levelName(s.to)} after ${Math.round(w)} s${lift.passengers.length > 1 ? ' (' + lift.passengers.length + ' aboard)' : ''}`);
      }
    }
    for (const a of this.agents) {
      switch (a.state) {
        case 'walking': {
          const g = this.b.levels[a.k].grid;
          let budget = dt * this.speed / g.tm; // tiles this tick
          while (budget > 0 && a.path && a.pi < a.path.length - 1) {
            const [tc, tr] = a.path[a.pi + 1];
            const slow = g.at(tc, tr) === WALK.STAIR ? g.stairCost : 1;
            const dx = tc - a.x, dy = tr - a.y, d = Math.hypot(dx, dy);
            if (d < 1e-9) { a.pi++; continue; }
            const move = Math.min(d, budget / slow);
            a.x += dx / d * move; a.y += dy / d * move; budget -= move * slow;
            a.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
            if (move >= d - 1e-9) { a.pi++; a.c = tc; a.r = tr; }
          }
          if (!a.path || a.pi >= a.path.length - 1) { const last = a.path[a.path.length - 1]; a.c = last[0]; a.r = last[1]; a.x = a.c; a.y = a.r; a.path = null; this.finishStep(a); }
          break;
        }
        case 'climbing':
          a.timer -= dt;
          if (a.timer <= 0) { const p = a.steps[0].portal; a.k = p.to.k; a.c = p.to.c; a.r = p.to.r; a.x = a.c; a.y = a.r; this.say(`#${a.id} ${p.dir > 0 ? 'climbs' : 'descends'} to ${this.levelName(a.k)}`); this.finishStep(a); }
          break;
        case 'dwelling':
          a.timer -= dt;
          if (a.timer <= 0) this.finishStep(a);
          break;
        case 'riding': {
          const land = this.b.landings[lift.floor]; // drawn at the car's place while riding
          a.k = Math.round(lift.pos); break;
        }
        default: break;
      }
    }
  }
  /** Counts for the window. */
  summary() {
    const by = {};
    for (const a of this.agents) by[a.state] = (by[a.state] || 0) + 1;
    const l = this.lift;
    return {
      time: this.clock(), agents: this.agents.length, by,
      lift: { level: this.levelName(Math.round(l.pos)), pos: l.pos, dir: l.dir > 0 ? 'up' : l.dir < 0 ? 'down' : 'idle', state: l.state, aboard: l.passengers.length, hallCalls: l.hall.size, carCalls: l.car.size, ...l.stats },
      trips: this.stats.trips, stairTrips: this.stats.stairTrips, liftTrips: this.stats.liftTrips,
      avgWait: this.stats.waits ? this.stats.waitTotal / this.stats.waits : 0, maxWait: this.stats.maxWait,
    };
  }
}
