// The body: deterministic simulation of one studio afternoon. Every decision is a rule on computed
// facts (positions, distances, times, counts, clearances). The voices live in remarks.js.
//
// Each person acts on their own needs (coffee, hunger, movement, company, printing) that fill at
// rates set by their traits. Activities have capacity and lingering: the kitchen crowds, the
// printer room holds two, a pin-up board needs a free metre in front, a food line forms before
// Good Times opens. Runs can repeat with learning: people remember the space between runs.
import { mulberry32, rand, pick, clamp } from "./rng.js";
import { dist } from "./plan.js";
import { remarkFor, reviewFor, TOPIC_OF } from "./remarks.js";

export const T0 = 13.5 * 3600;            // clock seconds at t = 0 (13:30)
export const DURATION = 6 * 3600;         // to 19:30
export const BAR_START = 5 * 3600;        // 18:30 Good Times opens
export const LINE_START = BAR_START - 20 * 60; // food line starts forming
export const SETUP_START = BAR_START - 45 * 60; // crew sets up the bar
export const PARTY_WIND = BAR_START + 30 * 60;  // 19:00, people start trickling out of Good Times
const DT = 2;
const SNAP_EVERY = 120;
const MIN = 60;
const PRINTER_CAP = 2, KITCHEN_CROWD = 7;

export const fmtClock = (t) => { const s = T0 + Math.max(0, t); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h}:${String(m).padStart(2, "0")}`; };

export function createSim(plan, nav, cast, seed) {
  const sim = { plan, nav, cast, seed, run: 1, t: 0, rng: mulberry32(seed * 7919 + 1), agents: [], feed: [], snapshots: new Map(), done: false, byId: {}, personById: {}, queue: null, doorLog: {}, costMap: null };
  for (const p of cast.people) sim.personById[p.id] = p;
  sim.students = cast.people.filter((p) => p.role === "student");
  sim.profs = cast.people.filter((p) => p.role === "prof");
  sim.sectionStudents = {};
  for (const s of sim.students) (sim.sectionStudents[s.section] ||= []).push(s.id);
  cast.memory ||= { runs: 0, agents: {}, congestion: {} };
  // distances from each seat (computed once per cast)
  const kitchenC = plan.kitchen ? [(plan.kitchen.bounds[0] + plan.kitchen.bounds[2]) / 2, (plan.kitchen.bounds[1] + plan.kitchen.bounds[3]) / 2] : null;
  const printerC = plan.printerRoom ? nav.randomFreeInRoom(mulberry32(3), plan.printerRoom) : null;
  const pathLen = (a, b) => { if (!a || !b) return null; const p = nav.findPath(a, nav.isFree(b[0], b[1]) ? b : nav.nearestFree(b[0], b[1], 3)); if (!p) return null; let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; };
  for (const s of sim.students) { s.dKitchen = pathLen(s.seat, kitchenC); s.dPrinter = pathLen(s.seat, printerC); s.dStairs = pathLen(s.seat, entryFor(sim, s)); }
  // facade proximity (facade orientation assumed: long sides face east and west)
  const [x0, , x1] = plan.meta.extent;
  for (const s of sim.students) { const dw = s.seat[0] - x0, de = x1 - s.seat[0]; s.glass = dw < 2.6 ? { d: dw, side: "west" } : de < 2.6 ? { d: de, side: "east" } : null; }
  // desk density
  for (const s of sim.students) s.nearDesks = sim.students.filter((o) => o !== s && dist(o.seat, s.seat) < 1.6).length;
  // kitchen area and bar area
  sim.kitchenArea = plan.kitchen ? Math.round((plan.kitchen.bounds[2] - plan.kitchen.bounds[0]) * (plan.kitchen.bounds[3] - plan.kitchen.bounds[1])) : 0;
  sim.barArea = plan.bar ? Math.round((plan.bar.area[2] - plan.bar.area[0]) * (plan.bar.area[3] - plan.bar.area[1])) : 0;
  sim.queueSlots = buildQueueSlots(sim);
  sim.seats = buildSeats(sim);
  sim.seatsWithin15 = plan.bar ? sim.seats.filter((s) => dist([s.x, s.y], plan.bar.center) < 15).length : 0;
  reset(sim);
  return sim;
}

// seats people can split off to during Good Times: sofas and benches (one seat per 0.6 m),
// classroom chairs, and later the desks of people who have gone home
function buildSeats(sim) {
  const { plan, nav } = sim; const seats = [];
  for (const f of plan.furniture) {
    if (f.kind !== "seating") continue;
    const b = f.bbox; const w = b[2] - b[0], h = b[3] - b[1]; const n = Math.max(1, Math.floor(Math.max(w, h) / 0.6));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n; const cx = w >= h ? b[0] + u * w : (b[0] + b[2]) / 2; const cy = w >= h ? (b[1] + b[3]) / 2 : b[1] + u * h;
      const pt = nav.nearestFree(cx, cy, 1.2); if (pt) seats.push({ id: `${f.id}:${i}`, x: pt[0], y: pt[1], kind: "sofa", cluster: f.id, place: plan.placeName(pt[0], pt[1]) });
    }
  }
  for (const f of plan.furniture) {
    if (f.kind !== "chair") continue;
    const cx = (f.bbox[0] + f.bbox[2]) / 2, cy = (f.bbox[1] + f.bbox[3]) / 2; const r = plan.roomAt(cx, cy);
    if (!r || !/classroom/i.test(r.name)) continue;
    const pt = nav.nearestFree(cx, cy, 1.0); if (pt) seats.push({ id: f.id, x: pt[0], y: pt[1], kind: "classroom", cluster: r.id, place: r.name });
  }
  return seats;
}
function buildQueueSlots(sim) {
  const { plan, nav } = sim; if (!plan.bar) return [];
  const c = plan.bar.counter; const service = nav.nearestFree(c[2] + 0.6, (c[1] + c[3]) / 2, 2);
  const far = plan.stairDoors.length > 1 ? plan.stairDoors[1].point : plan.stairDoors[0].point;
  const path = service && nav.findPath(service, far); if (!path) return service ? [service] : [];
  const slots = [service]; let carry = 0;
  for (let i = 1; i < path.length && slots.length < 70; i++) {
    const a = path[i - 1], b = path[i]; const L = dist(a, b); let s = 0.65 - carry;
    while (s <= L && slots.length < 70) { slots.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L]); s += 0.65; }
    carry = L - (s - 0.65);
  }
  return slots;
}

export function reset(sim) {
  sim.t = 0; sim.acc = 0; sim.feed = []; sim.done = false; sim.rng.set(sim.seed * 7919 + sim.run * 31 + 1); sim.snapshots.clear();
  sim.queue = { members: [], open: false, nextServeT: 0, servedCount: 0, maxLen: 0 }; sim.doorLog = {}; sim.recordedFeed = null; sim.recordedSummary = null;
  sim.profs.forEach((p, i) => { p.entryIndex = (sim.run + i) % 2; });
  sim.stats = { kitchenMax: { n: 0, t: 0 }, barMax: { n: 0, t: 0 }, lineStart: null, serveSeconds: 25, crowd: 0, minClearance: null, doorMax: {}, noSeat: 0, sat: 0, splinter: {}, setupClearance: null, leftParty: 0, lateDesk: 0 };
  sim.bar = { taken: {}, crew: [] };
  const mem = sim.cast.memory; sim.costMap = buildCostMap(sim, mem);
  sim.agents = sim.cast.people.map((p) => {
    const m = mem.agents[p.id] || {};
    const fam = clamp(p.traits.familiarity + (m.familiarity || 0), 0.05, 0.95);
    return {
      id: p.id, x: 0, y: 0, onFloor: false, state: "off", next: null, path: null, pi: 0, until: 0, mood: 0.6, moodHist: [], lastRemarkT: -1e9,
      activity: "not here yet", place: "", workSince: 0, trail: [], returnT: null, breakKind: null, inCrit: false, familiarity: fam,
      needs: p.role !== "prof" ? { coffee: 0.2 * sim.rng(), hunger: clamp(p.hungerInit + (m.lunchShift || 0), 0, 1), move: 0.3 * sim.rng(), social: 0.3 * sim.rng(), print: p.hasPrintJob ? 0.2 + (m.printEarly || 0) * 0.3 : -1 } : null,
      visited: Object.assign({}, m.visited || {}), lineEarly: m.lineEarly || 0, avoidRush: m.kitchenRush || 0,
      critsDone: 0, critsMissed: 0, breaks: 0, walked: 0, leftAt: null, noiseMinutes: 0, barMinutes: 0, crowdEvents: 0, printerWaits: 0, kitchenCrowd: 0, queueWait: null, lineLen: null,
      seatId: null, satIn: null, noSeat: 0, setupCrew: false, barSince: 0, windDown: false, lastCrowdT: -1e9, lastNoiseT: -1e9, missedCrit: false, critIdx: 0, round: 0, visitedStudents: [], waitStudent: null, lastT: 0, said: {}, log: [], qIndex: -1, qJoinT: 0, lastDoor: null, detour: null,
    };
  });
  sim.byId = Object.fromEntries(sim.agents.map((a) => [a.id, a]));
  // the setup crew: the three most sociable Good Times goers
  const crew = sim.students.filter((s) => s.goesToBar).sort((a, b) => b.traits.sociability - a.traits.sociability).slice(0, 3);
  for (const s of crew) { sim.byId[s.id].setupCrew = true; sim.bar.crew.push(s.id); }
  snapshot(sim);
}

function buildCostMap(sim, mem) {
  const keys = Object.keys(mem.congestion || {}); if (!keys.length) return null;
  const nav = sim.nav; const cm = new Float32Array(nav.w * nav.h);
  for (const k of keys) { const idx = Number(k); const c = mem.congestion[k]; const i = idx % nav.w, j = (idx - i) / nav.w; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nav.w && jj < nav.h) cm[jj * nav.w + ii] += 1.5 * c; } }
  return cm;
}

// ---------- learning between runs: fold this run's experience into the cast memory
export function runRecord(sim) {
  const S = sim.stats; const waits = sim.agents.filter((a) => a.queueWait != null).map((a) => a.queueWait / 60);
  return { run: sim.run, kitchenMax: S.kitchenMax.n, barMax: S.barMax.n, lineMax: sim.queue.maxLen, lineStart: S.lineStart != null ? fmtClock(S.lineStart) : null, meanWait: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null, printerWaits: sim.students.filter((s) => sim.byId[s.id].printerWaits).length, noSeat: S.noSeat, sat: S.sat, crowd: S.crowd, lost: sim.agents.reduce((n, a) => n + a.log.filter((e) => e.kind === "lost").length, 0), missed: sim.students.filter((s) => sim.byId[s.id].critsMissed).length, remarks: sim.feed.length };
}
export function learn(sim) {
  const mem = sim.cast.memory; mem.runs = sim.run; (mem.history ||= []).push(runRecord(sim));
  for (const a of sim.agents) {
    const p = sim.personById[a.id]; const m = (mem.agents[a.id] ||= { familiarity: 0, visited: {}, lunchShift: 0, printEarly: 0, lineEarly: 0, kitchenRush: 0 });
    m.familiarity = Math.min(0.6, m.familiarity + 0.08);
    Object.assign(m.visited, a.visited);
    if (a.printerWaits) m.printEarly = Math.min(2, m.printEarly + 1);
    if (a.kitchenCrowd) { m.kitchenRush = Math.min(2, m.kitchenRush + 1); m.lunchShift = (sim.rng() < 0.5 ? -1 : 1) * rand(sim.rng, 0.1, 0.3); }
    if (a.queueWait != null && a.queueWait > 3 * MIN) m.lineEarly = Math.min(15 * MIN, (a.queueWait / 2) | 0);
    if (p.role === "student" && a.crowdEvents && p.traits.crowd > 0.5) for (const e of a.log) if (e.kind === "crowd" && e.cell != null) mem.congestion[e.cell] = (mem.congestion[e.cell] || 0) + 1;
  }
}
export function nextRun(sim) { learn(sim); sim.run += 1; reset(sim); }

// ---------- movement helpers
export function entryFor(sim, p) {
  const doors = sim.plan.stairDoors; if (p.entryIndex != null) return doors[p.entryIndex % doors.length].point;
  const seat = p.seat || [19, -10];
  let best = doors[0], bd = Infinity; for (const d of doors) { const dd = dist(d.point, seat); if (dd < bd) { bd = dd; best = d; } }
  return best.point;
}
function otherEntry(sim, p) { const e = entryFor(sim, p); return sim.plan.stairDoors.find((d) => d.point !== e)?.point || e; }
function spawn(sim, a, p) { const e = entryFor(sim, p); a.x = e[0]; a.y = e[1]; a.onFloor = true; a.trail = []; a.lastDoor = null; }
function goTo(sim, a, p, target, next, activity) {
  if (!target) return false;
  let tgt = sim.nav.isFree(target[0], target[1]) ? target : sim.nav.nearestFree(target[0], target[1], 2.5);
  if (!tgt) return false;
  const cm = sim.costMap && p.traits.crowd > 0.5 ? sim.costMap : null;
  let path = sim.nav.findPath([a.x, a.y], tgt, cm);
  if (!path) { const back = sim.nav.nearestFree(a.x, a.y, 1.5); if (back) { a.x = back[0]; a.y = back[1]; path = sim.nav.findPath([a.x, a.y], tgt, cm); } if (!path) return false; }
  a.path = path; a.pi = 1; a.state = "go"; a.next = next; a.activity = activity; return true;
}
function move(sim, a, p, dt) {
  let rem = p.speed * dt;
  while (rem > 0 && a.path && a.pi < a.path.length) {
    const w = a.path[a.pi]; const d = Math.hypot(w[0] - a.x, w[1] - a.y);
    if (d <= rem) { a.x = w[0]; a.y = w[1]; rem -= d; a.pi++; a.walked += d; }
    else { a.x += ((w[0] - a.x) / d) * rem; a.y += ((w[1] - a.y) / d) * rem; a.walked += rem; rem = 0; }
  }
  // door traffic
  let inDoor = null; for (const d of sim.plan.doors) { const b = d.bbox; if (a.x >= b[0] - 0.3 && a.x <= b[2] + 0.3 && a.y >= b[1] - 0.3 && a.y <= b[3] + 0.3) { inDoor = d.id; break; } }
  if (inDoor && inDoor !== a.lastDoor) { const log = (sim.doorLog[inDoor] ||= []); log.push(sim.t); while (log.length && log[0] < sim.t - 5 * MIN) log.shift(); const dm = (sim.stats.doorMax[inDoor] ||= { n: 0, t: 0 }); if (log.length > dm.n) { dm.n = log.length; dm.t = sim.t; } if (log.length > 12 && !a.said.doorBusy) { a.said.doorBusy = true; event(sim, a, p, "doorBusy", { n: log.length, because: `${log.length} people through this door in 5 min` }); } }
  a.lastDoor = inDoor;
  if (!a.path || a.pi >= a.path.length) { a.path = null; arrive(sim, a, p); }
}
function critSpot(sim, s) { const f = s.facing; const pt = [s.seat[0] + f[0] * 0.9 + f[1] * 0.6, s.seat[1] + f[1] * 0.9 - f[0] * 0.6]; return sim.nav.isFree(pt[0], pt[1]) ? pt : sim.nav.nearestFree(s.seat[0], s.seat[1], 1.6) || s.seat; }
function inZone(sim, a, b) { return a.x >= b[0] && a.x <= b[2] && a.y >= b[1] && a.y <= b[3]; }
function countIn(sim, pred) { let n = 0; for (const o of sim.agents) if (o.onFloor && pred(o)) n++; return n; }
function kitchenCount(sim) { const k = sim.plan.kitchen; return k ? countIn(sim, (o) => inZone(sim, o, k.bounds)) : 0; }
function roomCount(sim, room) { const idx = sim.plan.rooms.indexOf(room); return countIn(sim, (o) => sim.nav.roomIndexAt(o.x, o.y) === idx); }
function nearestSection(sim, x, y) { let best = null, bd = 6; for (const s of sim.students) { const d = Math.hypot(s.seat[0] - x, s.seat[1] - y); if (d < bd) { bd = d; best = s.section; } } return best; }
export function countAtBar(sim) { return countIn(sim, (o) => o.state === "bar"); }

// ---------- events, mood, remarks
function event(sim, a, p, kind, extra = {}) {
  const tr = p.traits;
  const deltas = { critStart: 0.12, back: 0.02, missedCrit: -0.12, friendChat: 0.05 + 0.06 * tr.sociability, atBar: 0.04, printerBusy: -0.05 - 0.06 * (1 - tr.patience), crowd: -0.04 - 0.04 * tr.crowd, noise: -0.03 - 0.05 * tr.noise, kitchenCrowded: -0.04 - 0.04 * tr.crowd, served: 0.08, lineAtDesk: -0.05, doorBusy: -0.03, lost: -0.05 - 0.03 * (1 - tr.patience), tightDesks: -0.03, glassDesk: 0.03 * tr.curiosity, kitchenFar: -0.02, printerFar: -0.02, pinupTight: -0.03, barDense: -0.02 * tr.crowd + 0.02 * tr.sociability, lineLong: -0.03 - 0.04 * (1 - tr.patience) };
  if (deltas[kind] != null) a.mood = clamp(a.mood + deltas[kind], 0.02, 0.98);
  const ev = { kind, ...extra, mood: a.mood };
  const cell = sim.nav.cellOf(a.x, a.y); a.log.push({ t: sim.t, kind, topic: TOPIC_OF[kind] || "day", place: sim.plan.placeName(a.x, a.y) + (kind === "crowd" && nearestSection(sim, a.x, a.y) ? ` near section ${nearestSection(sim, a.x, a.y)}` : ""), because: ev.because || "", cell: cell ? cell[1] * sim.nav.w + cell[0] : null }); if (a.log.length > 80) a.log.shift();
  const r = remarkFor(p, a, ev, sim.rng, sim.t);
  if (r) {
    a.lastRemarkT = sim.t;
    sim.feed.push({ t: sim.t, id: a.id, name: p.name, role: p.role, section: p.section, year: p.year, style: p.style, text: r.text, because: ev.because || "", place: sim.plan.placeName(a.x, a.y), mood: a.mood, kind, topic: TOPIC_OF[kind] || "day", x: a.x, y: a.y });
    if (sim.feed.length > 2000) sim.feed.splice(0, sim.feed.length - 2000);
  }
}

// ---------- break selection from needs
function chooseBreak(sim, a, p) {
  const n = a.needs; const th = p.thresholdJitter;
  const cands = [["hunger", n.hunger], ["coffee", n.coffee], ["print", n.print], ["move", n.move], ["social", n.social]].filter(([, v]) => v >= th);
  if (!cands.length) return null;
  cands.sort((x, y) => y[1] - x[1]); const need = cands[0][0];
  const plan = sim.plan, nav = sim.nav; let kind, target = null, extra = {};
  if (need === "hunger" || need === "coffee") {
    // learned: avoid the rush by waiting when the kitchen is busy
    if (a.avoidRush && kitchenCount(sim) >= 4 && sim.rng() < 0.7) { a.needs[need] = th - 0.08; return null; }
    if (need === "hunger") {
      // not everyone eats in the kitchen: some go out, some bring food back, some eat a packed lunch at the desk
      const style = p.lunch === "kitchen" && !p.usesKitchen ? "bring" : (p.lunch || "kitchen");
      if (style === "out") { kind = "lunchOut"; target = entryFor(sim, p); }
      else if (style === "bring") { kind = "lunchBring"; target = entryFor(sim, p); }
      else if (style === "desk") { kind = "lunchDesk"; target = p.seat; }
      else { kind = "lunch"; target = plan.kitchen ? nav.randomFreeIn(sim.rng, plan.kitchen.bounds) : null; }
    }
    else if (!p.usesKitchen) { kind = "outside"; target = entryFor(sim, p); }
    else { kind = "kitchen"; target = plan.kitchen ? nav.randomFreeIn(sim.rng, plan.kitchen.bounds) : null; }
  } else if (need === "print") {
    if (plan.plotters.length && sim.rng() < 0.7) { kind = "plotter"; const pl = pick(sim.rng, plan.plotters); const cx = (pl.bbox[0] + pl.bbox[2]) / 2; target = nav.nearestFree(cx, pl.bbox[1] - 0.7, 1.6) || nav.nearestFree(cx, pl.bbox[3] + 0.7, 1.6); extra.plotter = pl.id; a.plotterId = pl.id; }
    else { kind = "printer"; target = plan.printerRoom ? nav.randomFreeInRoom(sim.rng, plan.printerRoom) : null; }
  }
  else if (need === "social") {
    kind = "friend"; const ids = (sim.sectionStudents[p.section] || []).filter((id) => id !== p.id && sim.byId[id].state === "work");
    if (ids.length) { const f = sim.personById[pick(sim.rng, ids)]; target = nav.nearestFree(f.seat[0] + f.facing[1] * 0.8, f.seat[1] - f.facing[0] * 0.8, 1.5); extra.friend = f.name.split(" ")[0]; }
    else { kind = "kitchen"; target = plan.kitchen ? nav.randomFreeIn(sim.rng, plan.kitchen.bounds) : null; }
  } else {
    const r = sim.rng(); const office = p.style === "office";
    if (r < (office ? 0.5 : 0.45) && plan.pinups.length) {
      kind = "pinup";
      for (let k = 0; k < 6 && !target; k++) { const b = pick(sim.rng, plan.pinups).bbox; const c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; const spot = nav.nearestFree(c[0], c[1], 1.5); if (spot && !sim.agents.some((o) => o.onFloor && o !== a && o.state === "dwell" && dist([o.x, o.y], spot) < 0.8)) target = spot; }
      if (target && nav.clearance(target[0], target[1]) < 1.4 && !a.said.pinupTight) { a.said.pinupTight = true; extra.pinupClear = nav.clearance(target[0], target[1]); }
    } else if (r < 0.75 || office) { kind = "outside"; target = entryFor(sim, p); }
    else if (plan.computers.length) { kind = "computers"; const b = pick(sim.rng, plan.computers).bbox; target = nav.nearestFree((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 1.5); }
    else { kind = "outside"; target = entryFor(sim, p); }
  }
  if (!target) return null;
  a.needs[need] = 0; a.satisfy = need;
  return { kind, target, extra, need };
}

// ---------- arrival at a path end
function arrive(sim, a, p) {
  const t = sim.t; const plan = sim.plan, nav = sim.nav;
  switch (a.next) {
    case "work":
      a.state = "work"; a.workSince = t; a.activity = "at the desk";
      if (!a.said.deskFacts) { a.said.deskFacts = true; if (p.glass && sim.rng() < 0.7) event(sim, a, p, "glassDesk", { d: p.glass.d.toFixed(1), side: p.glass.side, because: `seat ${p.glass.d.toFixed(1)} m from the ${p.glass.side} glazing; facade orientation assumed` }); else if (p.nearDesks >= 3) event(sim, a, p, "tightDesks", { n: p.nearDesks, because: `${p.nearDesks} other seats within 1.6 m` }); }
      if (a.missedCrit) { a.missedCrit = false; event(sim, a, p, "missedCrit", { because: `prof came by at ${fmtClock(a.missedAt)} while away; the kitchen is behind the core, out of sight` }); }
      break;
    case "detour": { const real = a.detour; a.detour = null; event(sim, a, p, "lost", { because: `first visit, familiarity ${a.familiarity.toFixed(2)}; both cores look alike from the aisle` }); goTo(sim, a, p, real.target, real.next, real.activity); break; }
    case "dwell": {
      a.state = "dwell"; a.until = t + p.breakLen * (a.breakKind === "lunch" ? 1.4 : p.style === "office" && a.breakKind === "kitchen" ? 0.4 : 1);
      if (a.breakKind === "lunch" || a.breakKind === "kitchen") {
        const n = kitchenCount(sim); a.visited.kitchen = 1;
        if (n >= KITCHEN_CROWD) { a.kitchenCrowd++; a.until += 3 * MIN; if (!a.said.kitchenCrowded) { a.said.kitchenCrowded = true; event(sim, a, p, "kitchenCrowded", { n, area: sim.kitchenArea, again: sim.run > 1 && !!(sim.cast.memory.agents[a.id] || {}).kitchenRush, because: `${n} people in the kitchen (${sim.kitchenArea} m2, 2 counters) at ${fmtClock(t)}` }); } else a.mood = clamp(a.mood - 0.03, 0.02, 0.98); }
        else if (p.dKitchen > 30 && !a.said.kitchenFar) { a.said.kitchenFar = true; event(sim, a, p, "kitchenFar", { m: Math.round(p.dKitchen), because: `walking path from desk to kitchen ${Math.round(p.dKitchen)} m` }); }
      }
      if (a.breakKind === "lunchDesk") {
        a.until = t + rand(sim.rng, 12 * MIN, 20 * MIN); a.activity = "lunch at the desk";
        if (!a.said.lunchDesk && p.dKitchen > 25 && sim.rng() < 0.5) { a.said.lunchDesk = true; event(sim, a, p, "lunchDesk", { m: Math.round(p.dKitchen), because: `packed lunch at the desk; the kitchen is ${Math.round(p.dKitchen)} m away by the aisles` }); }
      }
      if (a.breakKind === "plotter") {
        a.until = t + rand(sim.rng, 4 * MIN, 9 * MIN); a.activity = "at the plotter"; a.visited.plotter = 1;
        const others = sim.agents.filter((o) => o !== a && o.onFloor && o.state === "dwell" && o.breakKind === "plotter" && o.plotterId === a.plotterId).length;
        if (others >= 1) { a.printerWaits++; if (a.printerWaits <= 2) event(sim, a, p, "plotterBusy", { n: others + 1, because: `${others + 1} people at the same plotter; two plotters and one big printer for ${sim.students.length} desks` }); a.until = t + 3 * MIN; a.activity = "waiting at the plotter"; }
      }
      if (a.breakKind === "printer") {
        const n = roomCount(sim, plan.printerRoom) - 1; a.visited.printer = 1;
        if (n >= PRINTER_CAP) { a.printerWaits++; if (a.printerWaits <= 2) event(sim, a, p, "printerBusy", { n: n + 1, area: plan.printerRoom.area_m2, again: sim.run > 1 && !!(sim.cast.memory.agents[a.id] || {}).printEarly, because: `${n + 1} people in the 3D printer room (${plan.printerRoom.area_m2} m2, one door)` }); const d = plan.doors.find((dd) => dist(dd.center, [a.x, a.y]) < 4); let spot = null;
          if (d) { const cands = d.axis === "x" ? [[d.center[0], d.center[1] + 1.3], [d.center[0], d.center[1] - 1.3]] : [[d.center[0] + 1.3, d.center[1]], [d.center[0] - 1.3, d.center[1]]]; for (const c of cands) { const f = nav.nearestFree(c[0], c[1], 1.2); if (f && nav.roomIndexAt(f[0], f[1]) !== plan.rooms.indexOf(plan.printerRoom) && nav.findPath([a.x, a.y], f)) { spot = f; break; } } }
          a.breakKind = "printerWait"; if (spot) goTo(sim, a, p, spot, "dwell", "waiting for the printer in the hall"); else { a.until = t + 4 * MIN; a.activity = "waiting for the printer"; } }
        else if (p.dPrinter > 35 && !a.said.printerFar) { a.said.printerFar = true; event(sim, a, p, "printerFar", { m: Math.round(p.dPrinter), because: `walking path from desk to the printer room ${Math.round(p.dPrinter)} m` }); }
      }
      if (a.breakKind === "printerWait") { a.until = t + 4 * MIN; a.activity = "waiting for the printer in the hall"; }
      if (a.breakKind === "pinup" && a.pinupClear != null) { event(sim, a, p, "pinupTight", { w: a.pinupClear.toFixed(1), because: `${a.pinupClear.toFixed(1)} m clear in front of the board` }); a.pinupClear = null; }
      if (a.breakKind === "friend") event(sim, a, p, "friendChat", { because: "reached a section-mate's desk" });
      break;
    }
    case "queue": a.state = "queue"; a.activity = "in the food line"; break;
    case "sit": { a.state = "sit"; a.until = t + rand(sim.rng, 10 * MIN, 30 * MIN); const s = seatById(sim, a.seatId); a.activity = s ? `sitting ${s.kind === "desk" ? "at an empty desk" : s.kind === "sofa" ? "on a sofa" : "in the classroom"}` : "sitting"; sim.stats.sat++; break; }
    case "setup": { a.state = "setup"; a.activity = "setting up Good Times"; const w = nav.clearance(a.x, a.y); if (sim.stats.setupClearance == null || w < sim.stats.setupClearance) sim.stats.setupClearance = w; const enc = sim.plan.rooms.find((r) => /bar enclosure/i.test(r.name)); event(sim, a, p, "setup", { w: w.toFixed(1), area: enc ? enc.area_m2 : 3, because: `${w.toFixed(1)} m clear where the crew works at the counter; ${enc ? enc.area_m2 : 3} m2 behind it` }); break; }
    case "bar": {
      a.state = "bar"; a.until = t + rand(sim.rng, 6 * MIN, 16 * MIN); a.activity = "at Good Times"; if (!a.barSince) a.barSince = t;
      if (!a.said.bar && t - a.lastRemarkT > 6 * MIN) { a.said.bar = true; const n = countAtBar(sim) + 1; if (n / Math.max(1, sim.barArea) > 1.5) event(sim, a, p, "barDense", { n, area: sim.barArea, because: `${n} people in ${sim.barArea} m2 around the bar` }); else event(sim, a, p, "atBar", { because: `${n} at the bar` }); }
      break;
    }
    case "off": a.onFloor = false; a.state = "off"; a.path = null; a.activity = a.returnT != null ? "out, coming back" : "left for the day"; break;
    case "crit": {
      const s = sim.personById[a.waitStudent]; const sa = sim.byId[s.id];
      if (sa.state === "work") startCrit(sim, a, p, sa, s);
      else { a.state = "wait"; a.until = t + 3 * MIN; a.activity = `waiting at ${s.name.split(" ")[0]}'s desk`; event(sim, a, p, "profWait", { student: s.name.split(" ")[0], because: `${s.name.split(" ")[0]} is ${sa.activity}; no line of sight from the desk rows to the kitchen` }); }
      break;
    }
    case "profbreak": a.state = "dwell"; a.until = t + p.breakLen; a.activity = "coffee in the kitchen"; event(sim, a, p, "profBreak", { because: `${a.critsDone} crits done, ${a.critsMissed} missed` }); break;
  }
}
function startCrit(sim, a, p, sa, s) {
  a.state = "crit"; a.until = sim.t + p.critLen; a.activity = `crit with ${s.name.split(" ")[0]}`;
  sa.inCrit = true; sa.activity = `in crit with ${p.name}`;
  const w = sim.nav.clearance(a.x, a.y);
  if (w < 1.0 && a.critsDone % 4 === 1) event(sim, a, p, "critTight", { w: w.toFixed(1), because: `${w.toFixed(1)} m clear where the prof stands for the crit` });
  event(sim, sa, s, "critStart", { because: `${p.name} at the desk, ${Math.round(p.critLen / 60)} min planned` });
}
function endCrit(sim, a, p) {
  const s = sim.personById[a.waitStudent]; const sa = sim.byId[s.id];
  sa.inCrit = false; sa.activity = "at the desk"; sa.critsDone++; a.critsDone++; a.visitedStudents.push(s.id);
  event(sim, sa, s, "critEnd", { because: `${Math.round(p.critLen / 60)} min crit` });
  a.waitStudent = null;
}

// ---------- food line
function joinLine(sim, a, p) {
  const q = sim.queue; if (!sim.queueSlots.length || q.members.length >= sim.queueSlots.length) { goTo(sim, a, p, barSpot(sim), "bar", "heading to Good Times"); return; }
  if (sim.stats.lineStart == null) sim.stats.lineStart = sim.t;
  a.qIndex = q.members.length; q.members.push(a.id); a.qJoinT = sim.t; a.lineLen = a.qIndex; q.maxLen = Math.max(q.maxLen, q.members.length);
  goTo(sim, a, p, sim.queueSlots[a.qIndex], "queue", "joining the food line");
  if (a.qIndex >= 8) event(sim, a, p, "lineLong", { len: a.qIndex, tail: sim.plan.placeName(...sim.queueSlots[a.qIndex]), because: `${a.qIndex} ahead in the line; tail in ${sim.plan.placeName(...sim.queueSlots[a.qIndex])}` });
}
function stepQueue(sim) {
  const q = sim.queue; const t = sim.t;
  if (!q.open && t >= BAR_START) { q.open = true; q.nextServeT = t; }
  if (q.open && q.members.length && t >= q.nextServeT) {
    const id = q.members.shift(); const a = sim.byId[id]; const p = sim.personById[id];
    a.queueWait = t - a.qJoinT; a.qIndex = -1; q.servedCount++;
    event(sim, a, p, "served", { wait: Math.round(a.queueWait / 60), len: a.lineLen, again: sim.run > 1 && !!(sim.cast.memory.agents[a.id] || {}).lineEarly, early: Math.round(((sim.cast.memory.agents[a.id] || {}).lineEarly || 0) / 60), because: `joined with ${a.lineLen} ahead, served after ${Math.round(a.queueWait / 60)} min` });
    goTo(sim, a, p, barSpot(sim), "bar", "food in hand, to the bar");
    q.nextServeT = t + rand(sim.rng, 18, 32);
    q.members.forEach((mid, i) => { const m = sim.byId[mid]; m.qIndex = i; if (m.state === "queue") { const s = sim.queueSlots[i]; if (dist([m.x, m.y], s) > 0.3) goTo(sim, m, sim.personById[mid], s, "queue", "in the food line"); } });
  }
}
function barSpot(sim) { const b = sim.plan.bar; return b ? sim.nav.randomFreeIn(sim.rng, b.area) : sim.nav.randomFreeIn(sim.rng, sim.plan.kitchen.bounds); }
function setupSpot(sim, a) {
  // behind the counter if the enclosure can be reached from where the agent is, else beside the counter on the open side
  const r = sim.plan.rooms.find((x) => /bar enclosure/i.test(x.name)); const pt = r && sim.nav.randomFreeInRoom(sim.rng, r);
  if (pt && a && sim.nav.findPath([a.x, a.y], pt)) return pt;
  const c = sim.plan.bar.counter; return sim.nav.nearestFree(c[2] + 0.4, c[1] + 0.3 + sim.rng() * Math.max(0.3, c[3] - c[1] - 0.6), 2) || barSpot(sim);
}
function goSetup(sim, a, p) { if (!goTo(sim, a, p, setupSpot(sim, a), "setup", "going to set up Good Times") && !goTo(sim, a, p, barSpot(sim), "setup", "going to set up Good Times")) { a.setupCrew = false; } }
function seatById(sim, id) { if (!id) return null; if (id.startsWith("desk:")) { const s = sim.personById[id.slice(5)]; return s ? { id, x: s.seat[0], y: s.seat[1], kind: "desk", cluster: "desks", place: sim.plan.placeName(s.seat[0], s.seat[1]) } : null; } return sim.seats.find((s) => s.id === id) || null; }
// free seats within 15 m of the bar: sofas first, then the classroom, then desks of people who went home
function freeSeats(sim) {
  const c = sim.plan.bar ? sim.plan.bar.center : [20, -3]; const out = [];
  const bad = sim.bar.unreachable || {};
  for (const s of sim.seats) if (!sim.bar.taken[s.id] && !bad[s.id] && dist([s.x, s.y], c) < 15) out.push(s);
  for (const st of sim.students) { const a = sim.byId[st.id]; if (a.onFloor || a.leftAt == null || a.returnT != null) continue; if (sim.bar.taken["desk:" + st.id]) continue; if (dist(st.seat, c) < 15) out.push({ id: "desk:" + st.id, x: st.seat[0], y: st.seat[1], kind: "desk", cluster: "desks", place: sim.plan.placeName(st.seat[0], st.seat[1]) }); }
  const rank = { sofa: 0, classroom: 1, desk: 2 };
  return out.sort((p, q) => rank[p.kind] - rank[q.kind] || dist([p.x, p.y], c) - dist([q.x, q.y], c));
}
function takeSeat(sim, a, p, s, label) { if (!goTo(sim, a, p, [s.x, s.y], "sit", label)) { sim.bar.unreachable = sim.bar.unreachable || {}; sim.bar.unreachable[s.id] = 1; return false; } sim.bar.taken[s.id] = a.id; a.seatId = s.id; a.satIn = s.place; sim.stats.splinter[s.place] = (sim.stats.splinter[s.place] || 0) + 1; return true; }
function leaveSeat(sim, a) { if (a.seatId) { delete sim.bar.taken[a.seatId]; a.seatId = null; } }
function afterBar(sim, a, p) {
  const t = sim.t; const tr = p.traits;
  const wind = Math.max(0, (t - PARTY_WIND) / (40 * MIN));
  if (t >= PARTY_WIND && sim.rng() < 0.2 + 0.6 * wind) { leaveSeat(sim, a); a.leftAt = t; sim.stats.leftParty++; goTo(sim, a, p, entryFor(sim, p), "off", "leaving Good Times"); event(sim, a, p, "leaveParty", { n: countAtBar(sim), because: `${Math.round((t - a.barSince) / 60)} min at Good Times, ${countAtBar(sim)} still there at ${fmtClock(t)}` }); return; }
  const pSit = 0.25 + 0.35 * (1 - tr.sociability) + 0.2 * tr.crowd;
  if (!a.seatId && sim.rng() < pSit) {
    const seats = freeSeats(sim);
    if (seats.length) {
      const s = seats[0]; if (!takeSeat(sim, a, p, s, "splitting off to sit")) { goTo(sim, a, p, barSpot(sim), "bar", "at Good Times"); return; }
      const friends = sim.agents.filter((o) => o !== a && o.state === "bar" && Math.hypot(o.x - a.x, o.y - a.y) < 3 && sim.personById[o.id].traits.sociability > 0.5).slice(0, 2);
      let n = 1; for (const f of friends) { const fs = freeSeats(sim).find((x) => x.cluster === s.cluster); if (!fs) break; if (takeSeat(sim, f, sim.personById[f.id], fs, "following to sit")) n++; }
      const m = Math.round(dist([s.x, s.y], sim.plan.bar.center));
      event(sim, a, p, n > 1 ? "splinter" : "satDown", { n, kind: s.kind, place: s.place, m, because: `${n} ${n > 1 ? "people" : "person"} to ${s.kind === "desk" ? "an empty desk" : s.kind === "sofa" ? "a sofa" : "classroom chairs"} in ${s.place}, ${m} m from the bar` });
      return;
    }
    a.noSeat++; sim.stats.noSeat++;
    if (a.noSeat === 1) event(sim, a, p, "noSeat", { n: sim.seatsWithin15, because: `${sim.seatsWithin15} seats within 15 m of the bar, all taken; ${countAtBar(sim)} standing` });
    a.mood = clamp(a.mood - 0.03 * (1 - tr.sociability), 0.02, 0.98);
  } else if (p.hasPrintJob && t < PARTY_WIND + 20 * MIN && sim.rng() < 0.06) { sim.stats.lateDesk++; goTo(sim, a, p, p.seat, "work", "back to the desk, late"); event(sim, a, p, "lateDesk", { m: Math.round(dist(p.seat, sim.plan.bar.center)), because: `print job due; ${countAtBar(sim)} at the bar ${Math.round(dist(p.seat, sim.plan.bar.center))} m from this desk` }); return; }
  goTo(sim, a, p, barSpot(sim), "bar", "at Good Times");
}

// ---------- per-agent decisions
function stepStudent(sim, a, p, dt) {
  const t = sim.t;
  if (!a.onFloor) {
    if (a.state === "off" && a.returnT == null && t >= p.arrival && a.leftAt == null) { spawn(sim, a, p); goTo(sim, a, p, p.seat, "work", "walking to the desk"); event(sim, a, p, "arrive", { because: `arrived ${fmtClock(t)}` }); }
    else if (a.state === "off" && a.returnT != null && t >= a.returnT) {
      a.returnT = null; spawn(sim, a, p);
      if (a.setupCrew && t >= SETUP_START) { a.leftAt = null; goSetup(sim, a, p); }
      else if (p.goesToBar && t >= LINE_START - a.lineEarly) { a.leftAt = null; if (t < BAR_START + 15 * MIN) joinLine(sim, a, p); else goTo(sim, a, p, barSpot(sim), "bar", "heading to Good Times"); }
      else goTo(sim, a, p, p.seat, "work", "back from a break");
    }
    return;
  }
  switch (a.state) {
    case "go": move(sim, a, p, dt); break;
    case "work": {
      if (a.inCrit) break;
      if (a.setupCrew && t >= SETUP_START) { goSetup(sim, a, p); break; }
      if (p.goesToBar && !a.setupCrew && t >= LINE_START - a.lineEarly) { joinLine(sim, a, p); event(sim, a, p, "toBar", { because: `food line forming at ${fmtClock(t)}, opens 18:30` }); break; }
      if (t >= p.leave && !p.goesToBar) { a.leftAt = t; goTo(sim, a, p, entryFor(sim, p), "off", "leaving"); event(sim, a, p, "leave", { because: `${(Math.round((t - p.arrival) / 360) / 10)} h on the floor, ${a.breaks} breaks` }); break; }
      if (t >= p.leave && p.goesToBar && !a.windDown) { a.windDown = true; a.activity = "done for the day, waiting for Good Times"; event(sim, a, p, "windDown", { because: `finished at ${fmtClock(t)}, staying for Good Times at 18:30` }); }
      const b = t % MIN === 0 ? chooseBreak(sim, a, p) : null;
      if (b) {
        a.breakKind = b.kind; a.breaks++;
        const label = { lunch: "late lunch in the kitchen", lunchOut: "out for lunch", lunchBring: "out to grab food", lunchDesk: "lunch at the desk", kitchen: "to the kitchen", pinup: "to the pin-up wall", computers: "to the computer stations", printer: "to the 3D printers", friend: "visiting a desk", outside: "going out for a bit" }[b.kind];
        if (b.kind === "outside" || b.kind === "lunchOut" || b.kind === "lunchBring") {
          a.returnT = t + (b.kind === "lunchOut" ? rand(sim.rng, 35 * MIN, 55 * MIN) : b.kind === "lunchBring" ? rand(sim.rng, 12 * MIN, 22 * MIN) : p.breakLen + 4 * MIN);
          if (b.kind === "lunchOut" && p.dStairs > 25 && !a.said.lunchOut && sim.rng() < 0.5) { a.said.lunchOut = true; event(sim, a, p, "lunchOut", { m: Math.round(p.dStairs), because: `eats out; ${Math.round(p.dStairs)} m from the desk to the stairs` }); }
          goTo(sim, a, p, b.target, "off", label);
        }
        else if (b.kind === "plotter") goTo(sim, a, p, b.target, "dwell", "to the plotters");
        else if (b.kind === "printer" && a.familiarity < 0.35 && !a.visited.printer && sim.rng() < 0.6) { a.detour = { target: b.target, next: "dwell", activity: label }; goTo(sim, a, p, otherEntry(sim, p), "detour", "looking for the printer room"); }
        else goTo(sim, a, p, b.target, "dwell", label);
        event(sim, a, p, "break", { breakKind: b.kind, ...b.extra, because: `${b.need} need full after ${Math.round((t - a.workSince) / 60)} min at the desk` });
      }
      break;
    }
    case "dwell":
      if (t >= a.until) { goTo(sim, a, p, p.seat, "work", "back to the desk"); }
      break;
    case "queue": break;
    case "bar": if (t >= a.until) afterBar(sim, a, p); break;
    case "sit": if (t >= a.until) { leaveSeat(sim, a); if (t >= PARTY_WIND && sim.rng() < 0.55) { a.leftAt = t; sim.stats.leftParty++; goTo(sim, a, p, entryFor(sim, p), "off", "leaving Good Times"); event(sim, a, p, "leaveParty", { n: countAtBar(sim), because: `sat ${Math.round((t - a.barSince) / 60)} min in ${a.satIn}; ${countAtBar(sim)} still at the bar` }); } else goTo(sim, a, p, barSpot(sim), "bar", "back to the bar"); } break;
    case "setup": if (t >= DURATION - 5 * MIN) { a.leftAt = t; goTo(sim, a, p, entryFor(sim, p), "off", "packing up"); } break;
  }
}

// the prof leaves: whoever was not reached counts as not reached, the ones still on the floor say so
function closeRound(sim, a, p) {
  for (const id of sim.sectionStudents[p.section]) { if (a.visitedStudents.includes(id)) continue; const sa = sim.byId[id]; a.critsMissed++; sa.critsMissed++; if (sa.onFloor && sa.leftAt == null) event(sim, sa, sim.personById[id], "critTimeout", { because: `prof's round over ${sim.sectionStudents[p.section].length} desks ran out at ${fmtClock(sim.t)}; ${Math.round(a.walked)} m walked` }); }
}
function stepProf(sim, a, p, dt) {
  const t = sim.t;
  if (!a.onFloor) { if (a.state === "off" && a.leftAt == null && t >= p.arrival) { spawn(sim, a, p); a.state = "idle"; event(sim, a, p, "arrive", { because: `section ${p.section}, ${sim.sectionStudents[p.section].length} students` }); } return; }
  switch (a.state) {
    case "go": move(sim, a, p, dt); break;
    case "idle": {
      if (t >= p.leave) { closeRound(sim, a, p); a.leftAt = t; goTo(sim, a, p, entryFor(sim, p), "off", "leaving"); event(sim, a, p, "leave", { because: `${a.critsDone} crits, ${a.critsMissed} not reached, ${Math.round(a.walked)} m walked` }); break; }
      // everyone in the section gets a crit: the first pass takes desks in a varying order and waits at an empty one;
      // a student who was away is tried again once they are back at the desk; when everyone left is away the prof pauses
      const ids = sim.sectionStudents[p.section].filter((id) => !a.visitedStudents.includes(id));
      const atWork = ids.filter((id) => sim.byId[id].state === "work"); const fresh = ids.filter((id) => !(a.deferred || {})[id]);
      const candidates = atWork.length ? atWork : fresh;
      if (!candidates.length) {
        if (ids.length && t < p.leave - 15 * MIN) { a.state = "pause"; a.until = t + 4 * MIN; a.activity = "waiting for people to come back to their desks"; break; }
        closeRound(sim, a, p); a.leftAt = t; goTo(sim, a, p, entryFor(sim, p), "off", "leaving"); event(sim, a, p, "leave", { because: `${a.critsDone} crits, ${a.critsMissed} not reached, ${Math.round(a.walked)} m walked` }); break;
      }
      const sorted = candidates.map((id) => [id, dist(sim.personById[id].seat, [a.x, a.y])]).sort((x, y) => x[1] - y[1]); const best = sorted[Math.min(sorted.length - 1, Math.floor(Math.pow(sim.rng(), 2) * 3))][0];
      a.waitStudent = best; goTo(sim, a, p, critSpot(sim, sim.personById[best]), "crit", `to ${sim.personById[best].name.split(" ")[0]}'s desk`);
      break;
    }
    case "pause": if (t >= a.until) a.state = "idle"; break;
    case "wait": {
      const s = sim.personById[a.waitStudent]; const sa = sim.byId[s.id];
      if (sa.state === "work") startCrit(sim, a, p, sa, s);
      else if (t >= a.until) { a.deferred = a.deferred || {}; a.deferred[s.id] = (a.deferred[s.id] || 0) + 1; event(sim, a, p, "profLater", { student: s.name.split(" ")[0], because: "desk empty for 3 min; back later" }); a.waitStudent = null; a.state = "idle"; }
      break;
    }
    case "crit": if (t >= a.until) { endCrit(sim, a, p); a.state = "idle"; } break;
    case "dwell": if (t >= a.until) a.state = "idle"; break;
  }
}

// ---------- minute tick: needs, mood, crowding, noise, line past desks, history
function minuteTick(sim) {
  const t = sim.t; const plan = sim.plan;
  const cells = new Map();
  for (const a of sim.agents) if (a.onFloor) { const k = `${Math.floor(a.x / 2)},${Math.floor(a.y / 2)}`; (cells.get(k) || cells.set(k, []).get(k)).push(a); }
  const barOn = t >= BAR_START; const barC = plan.bar ? plan.bar.center : null;
  const lineSlots = sim.queue.members.map((_, i) => sim.queueSlots[i]).filter(Boolean);
  { const kn = kitchenCount(sim); if (kn > sim.stats.kitchenMax.n) sim.stats.kitchenMax = { n: kn, t }; const bn = countAtBar(sim); if (bn > sim.stats.barMax.n) sim.stats.barMax = { n: bn, t }; }
  for (const a of sim.agents) {
    const p = sim.personById[a.id];
    if (!a.onFloor) { if (t % 300 === 0) a.moodHist.push([t, a.mood]); continue; }
    a.lastT = t;
    if (a.needs && a.state === "work") {
      const n = a.needs, tr = p.traits, st = p.style;
      const sc = p.needScale || 1; const wd = a.windDown;
      n.coffee += ((0.6 + 0.4 * (1 - tr.patience)) / 150) * sc * (wd ? 1.5 : 1);
      n.hunger += (1 / 150) * sc;
      n.move += (st === "restless" ? 1 / 30 : st === "social" ? 1 / 60 : st === "office" ? 1 / 70 : 1 / 110) * sc * (wd ? 2 : 1);
      n.social += ((0.3 + 0.7 * tr.sociability) / 70) * sc * (wd ? 3 : 1);
      if (n.print >= 0) n.print += p.hasPrintJob ? (1 / 120) * sc : 0;
    }
    const base = 0.55 + 0.2 * (p.traits.patience - 0.5);
    a.mood += (base - a.mood) * 0.03;
    if (a.state === "bar") { a.barMinutes++; a.mood += 0.01 * p.traits.sociability; }
    if (a.state === "sit") { a.barMinutes++; a.mood += 0.012; }
    if (a.state === "queue" && t - a.qJoinT > 12 * MIN) a.mood -= 0.01 * (1 - p.traits.patience);
    if (barOn && barC && a.state === "work" && dist([a.x, a.y], barC) < 12) { a.noiseMinutes++; a.mood -= 0.012 * p.traits.noise; if (t - a.lastNoiseT > 20 * MIN) { a.lastNoiseT = t; event(sim, a, p, "noise", { d: Math.round(dist([a.x, a.y], barC)), n: countAtBar(sim), because: `${countAtBar(sim)} at the bar, ${Math.round(dist([a.x, a.y], barC))} m from this desk` }); } }
    if (a.state === "work" && lineSlots.length && !a.said.lineAtDesk) { for (const s of lineSlots) if (dist(s, [a.x, a.y]) < 1.6) { a.said.lineAtDesk = true; event(sim, a, p, "lineAtDesk", { len: lineSlots.length, because: `food line of ${lineSlots.length} passes within 1.6 m of this desk` }); break; } }
    if (a.state === "go") {
      let n = 0; const ci = Math.floor(a.x / 2), cj = Math.floor(a.y / 2);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const arr = cells.get(`${ci + di},${cj + dj}`); if (arr) for (const o of arr) if (o !== a && o.state !== "work" && Math.hypot(o.x - a.x, o.y - a.y) < 1.2) n++; }
      if (n >= 2 && t - a.lastCrowdT > 20 * MIN) { a.lastCrowdT = t; a.crowdEvents++; const w = sim.nav.clearance(a.x, a.y); sim.stats.crowd++; if (sim.stats.minClearance == null || w < sim.stats.minClearance) sim.stats.minClearance = w; const near = nearestSection(sim, a.x, a.y); if (a.crowdEvents <= 2) event(sim, a, p, "crowd", { n, w: w.toFixed(1), because: `${n} others within 1.2 m, ${w.toFixed(1)} m clear between obstacles in ${plan.placeName(a.x, a.y)}${near ? ` near section ${near}` : ""}` }); else a.mood = clamp(a.mood - 0.02 * p.traits.crowd, 0.02, 0.98); }
    }
    a.mood = clamp(a.mood, 0.02, 0.98);
    if (t % 300 === 0) a.moodHist.push([t, a.mood]);
    a.place = plan.placeName(a.x, a.y);
    if (a.trail.length === 0 || Math.hypot(a.trail[a.trail.length - 1][0] - a.x, a.trail[a.trail.length - 1][1] - a.y) > 0.4) { a.trail.push([a.x, a.y]); if (a.trail.length > 60) a.trail.shift(); }
  }
}

export function step(sim, seconds) {
  // whole DT steps only, so t stays on the 2 s grid and minute ticks and snapshots fire exactly
  sim.acc = (sim.acc || 0) + seconds;
  while (sim.acc >= DT && !sim.done) {
    const dt = DT; sim.acc -= DT;
    for (const a of sim.agents) { const p = sim.personById[a.id]; if (p.role === "prof") stepProf(sim, a, p, dt); else stepStudent(sim, a, p, dt); }
    stepQueue(sim);
    sim.t += dt;
    if (sim.t % MIN === 0) minuteTick(sim);
    if (sim.t % SNAP_EVERY === 0) snapshot(sim);
    if (sim.t >= DURATION) { sim.done = true; sim.t = DURATION; }
  }
}

export function snapshot(sim) { sim.snapshots.set(sim.t, JSON.stringify({ t: sim.t, rng: sim.rng.state(), agents: sim.agents, feed: sim.feed, done: sim.done, queue: sim.queue, doorLog: sim.doorLog, stats: sim.stats, bar: sim.bar })); }
export function seekTo(sim, target) {
  target = Math.max(0, Math.min(DURATION, Math.round(target / MIN) * MIN));
  let key = -1; for (const k of sim.snapshots.keys()) if (k <= target && k > key) key = k;
  if (key < 0) reset(sim); else { const s = JSON.parse(sim.snapshots.get(key)); sim.t = s.t; sim.acc = 0; sim.rng.set(s.rng); sim.agents = s.agents; sim.feed = s.feed; sim.done = s.done; sim.queue = s.queue; sim.doorLog = s.doorLog; sim.stats = s.stats; sim.bar = s.bar; sim.byId = Object.fromEntries(sim.agents.map((a) => [a.id, a])); }
  if (sim.t < target) step(sim, target - sim.t);
}

export function measures(sim) {
  const m = { onFloor: 0, working: 0, onBreak: 0, inCrit: 0, atBar: 0, sitting: 0, inLine: 0, left: 0, profs: 0 };
  for (const a of sim.agents) {
    const p = sim.personById[a.id];
    if (!a.onFloor) { if (a.leftAt != null && a.returnT == null) m.left++; continue; }
    m.onFloor++; if (p.role === "prof") { m.profs++; continue; }
    if (a.inCrit) m.inCrit++; else if (a.state === "work") m.working++; else if (a.state === "bar" || a.state === "setup") m.atBar++; else if (a.state === "sit") m.sitting++; else if (a.state === "queue" || (a.state === "go" && a.next === "queue")) m.inLine++; else m.onBreak++;
  }
  return m;
}

export function exportRun(sim) {
  const people = sim.cast.people.map((p) => { const a = sim.byId[p.id]; return { ...p, familiarity: a.familiarity, walked: Math.round(a.walked), breaks: a.breaks, critsDone: a.critsDone, critsMissed: a.critsMissed, leftAt: a.leftAt, noiseMinutes: a.noiseMinutes, barMinutes: a.barMinutes, crowdEvents: a.crowdEvents, printerWaits: a.printerWaits, kitchenCrowd: a.kitchenCrowd, queueWait: a.queueWait, moodHist: a.moodHist, log: a.log, review: reviewFor(p, a) }; });
  return {
    manifest: { tool: "studio-day 0.2", plan: sim.plan.meta, seed: sim.seed, run: sim.run, day: "Friday 13:30 to 19:30", lineStart: "18:10", barStart: "18:30", barShare: sim.cast.barShare, people: people.length, remarks: "templates v0.2 (inferred); facts computed", learned: sim.cast.memory, exported: new Date().toISOString(), simulatedTo: fmtClock(sim.t), queue: { maxLen: sim.queue.maxLen, served: sim.queue.servedCount }, seats: { within15m: sim.seatsWithin15, noSeat: sim.stats.noSeat, sat: sim.stats.sat, where: sim.stats.splinter, leftParty: sim.stats.leftParty } },
    feed: sim.recordedFeed || sim.feed, people,
  };
}
export { reviewFor };
