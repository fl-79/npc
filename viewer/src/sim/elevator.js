// The elevator under collective control: landing calls (a floor and a direction) and car calls
// (a floor) queue up; the car keeps its direction while any call lies ahead, stopping for car
// calls and for landing calls in its direction, so it picks up people going its way; it reverses
// only when nothing is left ahead; idle, it answers the oldest call. Boarding and alighting are
// the simulation's business during the 'open' state; the car reports what it does as events.
export class Elevator {
  constructor(params, nFloors) {
    this.n = nFloors;
    this.capacity = params.capacity ?? 6;
    this.secPerFloor = params.seconds_per_floor ?? 3;
    this.doorOpen = params.door_open_seconds ?? 5;
    this.doorMove = params.door_move_seconds ?? 1.5;
    this.boardSec = params.boarding_seconds_per_person ?? 1.2;
    this.pos = 0;          // floor index, fractional while moving
    this.floor = 0;        // last whole floor
    this.dir = 0;          // +1 up, -1 down, 0 idle
    this.state = 'idle';   // idle | moving | opening | open | closing
    this.timer = 0;
    this.passengers = [];  // { agent, dest }
    this.hall = new Map(); // `${floor}:${dir}` -> time called
    this.car = new Map();  // floor -> time requested
    this.stats = { stops: 0, boarded: 0, alighted: 0, pickupsOnTheWay: 0, floorsTravelled: 0 };
    this.events = [];
  }
  get isOpenAt() { return this.state === 'open' ? this.floor : null; }
  get free() { return this.capacity - this.passengers.length; }
  hasCalls() { return this.hall.size > 0 || this.car.size > 0; }

  /** A landing call: someone at `floor` wants to go `dir` (+1 up, -1 down). */
  call(floor, dir, t) {
    const key = `${floor}:${dir}`;
    if (!this.hall.has(key)) this.hall.set(key, t);
    // the doors are open here already: hold them for someone who can board (room, and going the car's way)
    if (this.state === 'open' && this.floor === floor && this.free > 0 && (this.dir === 0 || this.dir === dir || !this.passengers.length)) this.timer = Math.max(this.timer, this.boardSec);
  }
  /** A car call: a passenger wants `floor`. */
  request(floor, t) { if (floor !== this.floor || this.state !== 'open') { if (!this.car.has(floor)) this.car.set(floor, t); } }
  /** Someone steps in while the doors are open: the doors wait for them. */
  board(agent, dest, t) {
    this.passengers.push({ agent, dest });
    this.request(dest, t);
    this.timer = Math.max(this.timer, this.boardSec);
    this.stats.boarded++;
    if (this.passengers.length > 1) this.stats.pickupsOnTheWay++;
  }
  /** The passengers for this floor step out. */
  alight() {
    const out = this.passengers.filter((p) => p.dest === this.floor);
    this.passengers = this.passengers.filter((p) => p.dest !== this.floor);
    if (out.length) { this.timer = Math.max(this.timer, this.boardSec * out.length); this.stats.alighted += out.length; }
    return out.map((p) => p.agent);
  }

  callsAhead(dir) {
    for (const f of this.car.keys()) if ((f - this.pos) * dir > 1e-6) return true;
    for (const key of this.hall.keys()) { const f = Number(key.split(':')[0]); if ((f - this.pos) * dir > 1e-6) return true; }
    return false;
  }
  /** Should the car stop at whole floor f while moving in dir? Car calls, landing calls its way, or any landing call when nothing is left beyond. */
  shouldStop(f, dir) {
    if (this.car.has(f)) return true;
    if (this.hall.has(`${f}:${dir}`) && this.free > 0) return true;
    const beyond = [...this.car.keys()].some((x) => (x - f) * dir > 0) || [...this.hall.keys()].some((key) => (Number(key.split(':')[0]) - f) * dir > 0);
    if (!beyond && this.hall.has(`${f}:${-dir}`)) return true;
    return false;
  }
  oldestCall() {
    let best = null, bt = Infinity;
    for (const [f, t] of this.car) if (t < bt) { bt = t; best = f; }
    for (const [key, t] of this.hall) if (t < bt) { bt = t; best = Number(key.split(':')[0]); }
    return best;
  }
  openAt(f, dir, t) {
    this.pos = f; this.floor = f; this.state = 'opening'; this.timer = this.doorMove;
    this.car.delete(f);
    // the landing calls here are answered only if there is room; whoever cannot board presses again (the simulation re-registers waiters)
    if (this.free > 0) { this.hall.delete(`${f}:${dir}`); if (!this.callsAhead(dir)) this.hall.delete(`${f}:${-dir}`); }
    this.stats.stops++;
    this.events.push({ t, type: 'open', floor: f, dir: this.dir });
  }

  step(dt, t) {
    this.events.length = 0;
    switch (this.state) {
      case 'opening':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'open'; this.timer = this.doorOpen; this.events.push({ t, type: 'doors_open', floor: this.floor }); }
        break;
      case 'open':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'closing'; this.timer = this.doorMove; this.events.push({ t, type: 'doors_close', floor: this.floor }); }
        break;
      case 'closing':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'idle'; this.dir = this.passengers.length ? this.dir : this.dir; this.decide(t); }
        break;
      case 'idle':
        this.decide(t);
        break;
      case 'moving': {
        const before = this.pos;
        this.pos += this.dir * dt / this.secPerFloor;
        this.stats.floorsTravelled += Math.abs(this.pos - before);
        // crossing or reaching a whole floor
        const f = this.dir > 0 ? Math.floor(this.pos + 1e-9) : Math.ceil(this.pos - 1e-9);
        const crossed = this.dir > 0 ? (before < f - 1e-9 && this.pos >= f - 1e-9) : (before > f + 1e-9 && this.pos <= f + 1e-9);
        if (crossed) {
          this.floor = f;
          if (this.shouldStop(f, this.dir) || f === 0 || f === this.n - 1) {
            if (this.shouldStop(f, this.dir)) this.openAt(f, this.dir, t);
            else if (!this.callsAhead(this.dir)) { this.pos = f; this.state = 'idle'; this.dir = 0; }
          }
          if (this.state === 'moving' && !this.callsAhead(this.dir)) { this.pos = f; this.state = 'idle'; this.dir = 0; this.decide(t); }
        }
        break;
      }
    }
  }
  /** With the doors shut: keep the direction while calls lie ahead, else reverse to calls behind, else answer the oldest call, else rest. */
  decide(t) {
    if (this.state !== 'idle') return;
    if (this.dir !== 0 && this.callsAhead(this.dir)) { this.state = 'moving'; return; }
    if (this.dir !== 0 && this.callsAhead(-this.dir)) { this.dir = -this.dir; this.state = 'moving'; return; }
    const f = this.oldestCall();
    if (f == null) { this.dir = 0; return; }
    if (Math.abs(f - this.pos) < 1e-6) {
      // a call here: open for it, facing the way it wants
      const key = [...this.hall.keys()].find((k) => Number(k.split(':')[0]) === f);
      this.dir = key ? Number(key.split(':')[1]) : 0;
      this.openAt(f, this.dir, t);
      return;
    }
    this.dir = f > this.pos ? 1 : -1;
    this.state = 'moving';
  }
}
