// The day run: one day on the tile grid, one second at a time, from the plans and the slow state
// the term layer hands over that morning. Agents arrive at the 24/7 door, walk (A* on the grid,
// the stairs or the lift between floors), do what their plan says (desk work, crits, lectures,
// seminars, lunch, printing, the shop, events), answer their needs (washroom, water, food), take
// breaks, meet (Bernstein's rule), get interrupted, put headphones on, queue at the plotters,
// and leave. Everything observable goes out as events; the aggregators fold them for the analysis.
import { WALK } from './grid.js';
import { Elevator } from './elevator.js';
import { Rng } from './rng.js';
import { EventBus } from './events.js';
import { Remarks } from './remarks.js';
import { Stats } from './stats.js';
import { TermLayer } from './term.js';
import { LayoutManager } from './layout.js';
import { hhmm, secondsOf, runSeconds, dayName } from './calendar.js';

const M = 60, H = 3600;
const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class DayRun {
  constructor(world, pop, term, cal, P, simParams, opts) {
    this.w = world; this.b = world.b; this.pop = pop; this.term = term; this.cal = cal; this.P = P;
    this.date = opts.date; this.seed = opts.seed ?? 2026;
    this.movement = ({ groups: 'agents' })[opts.movement] || opts.movement || 'everyday'; // 'groups' was the old name of 'agents'
    this.policy = Object.assign({ access247: true, paperAllHours: false, shopOpen: true }, opts.policy || {});
    this.situation = opts.situation || { kind: 'none' };
    this.info = cal.info(this.date);
    const { plans } = term.plansFor(this.date);
    this.plans = plans;
    this.applySituation();
    this.time = secondsOf(P.time.run_from); this.end = secondsOf(P.time.run_to) + 24 * H;
    this.lift = new Elevator(simParams.elevator || {}, this.b.levels.length);
    this.bus = new EventBus(); this.remarks = new Remarks(P, this.seed); this.stats = new Stats(world, pop);
    this.names = new Map(pop.agents.map((a) => [a.id, a.name]));
    this.running = false; this.done = false;
    this.speed = simParams.walking?.speed_m_per_s ?? 1.3; this.stairSec = simParams.walking?.stair_seconds_per_floor ?? 18;
    this.rng = new Rng(this.seed, this.date, 'day');
    this.agents = pop.agents.map((a) => this.runtime(a));
    this.byId = new Map(this.agents.map((ag) => [ag.a.id, ag]));
    this.plotter = { queue: [], busy: [null, null], paper: P.resources.plotters.paper_stock_sheets, outages: 0 };
    this.lastEnc = this.time; this.lastMinute = this.time; this.lastRules = this.time;
    this.pairClock = new Map();
    this.layout = { moves: [] };
    this.layoutMgr = new LayoutManager(this); // the agents' own moves under 'agents' and 'free' (owner 2026-11-08)
    this.claimedSpots = new Set();            // side tables and crit rooms taken by instructors for the session
    this.suggestions = [];
    this.log = this.bus.events;
    this.emit('run_start', { text: `${dayName(this.date)} ${this.date}: ${[...plans.values()].filter((p) => p.present).length} of ${plans.size} people expected; ${this.info.sessions.length ? 'studio day for years ' + this.info.sessions.map((s) => s.years.join(' and ')).join(', ') : 'no studio session'}${this.situation.kind !== 'none' ? '; situation: ' + this.situation.kind : ''}${this.situation.title ? ' (' + this.situation.title + ')' : ''}${this.situation.applied?.length ? '; ' + this.situation.applied.join(', ') : ''}` });
  }
  /** A situation on top of the calendar (step 2): what it changes in the plans or the resources. */
  applySituation() {
    const s = this.situation, P = this.P;
    if (!s || s.kind === 'none') return;
    const rng = new Rng(this.seed, this.date, 'situation');
    const students = () => [...this.plans.values()].filter((p) => this.pop.agents[p.id - 1].role === 'student');
    if (s.kind === 'review' || s.kind === 'pinup' || s.kind === 'lastcrit') { for (const p of students()) { if (!p.present) { p.present = true; p.arrive = 10 * H + rng.between(0, 3 * H); p.leave = 20 * H + rng.between(0, 5 * H); p.hours = (p.leave - p.arrive) / H; } p.items = p.items.filter((i) => !['studio_session', 'lecture', 'review', 'pinup'].includes(i.kind)); const t0 = 13.5 * H; p.items.push(s.kind === 'review' ? { t: t0, kind: 'review', minutes: 270 } : s.kind === 'pinup' ? { t: t0, kind: 'pinup', minutes: 90 } : { t: t0, kind: 'studio_session', minutes: 270 }); if (s.kind !== 'review' && rng.chance(0.7)) p.items.push({ t: clip(p.arrive + rng.between(0.5 * H, 3 * H), p.arrive, p.leave), kind: 'plot', sheets: rng.int(1, 4) }); p.items.sort((x, y) => x.t - y.t); } }
    // an event situation on a day that already has the event changes nothing (the plan holds it); on another day it is added with the
    // plan's own rule (p x sociability, grab-and-go share). It used to add half of everyone for 150 minutes on top (owner 2026-11-12, stop 5).
    if (s.kind === 'good_times' || s.kind === 'waffle') { const id = s.kind === 'good_times' ? 'good_times' : 'waffle_wednesday'; const has = (this.info.events || []).some((e) => e.id === id); if (!has) { const pe = this.P.social.events, t0 = id === 'good_times' ? 18 * H : 9 * H, t1 = id === 'good_times' ? 21 * H : 11 * H; for (const p of students()) { if (!p.present || p.items.some((i) => i.kind === 'event')) continue; const a = this.pop.agents[p.id - 1]; const pr = (id === 'good_times' ? pe.good_times.p : pe.waffle.p) * a.sociability; if (!rng.chance(Math.min(0.95, pr))) continue; const it = TermLayer.eventStay(id, t0, t1, pe, rng); p.items.push(it); p.leave = Math.max(p.leave, it.t + it.minutes * M + 10 * M); p.arrive = Math.min(p.arrive, t0 - 5 * M); p.items.sort((x, y) => x.t - y.t); } } }
    if (s.kind === 'deadline' || s.kind === 'clash') for (const p of students()) if (p.present) { p.leave = Math.min(26 * H, p.leave + 2 * H); p.hours += 2; if (rng.chance(0.5)) p.items.push({ t: clip(p.arrive + rng.between(1 * H, 4 * H), p.arrive, p.leave), kind: 'print_small' }); if (s.kind === 'clash' && rng.chance(0.4)) p.items.push({ t: 10 * H + rng.between(0, 2 * H), kind: 'lecture_off', minutes: 120 }); p.items.sort((x, y) => x.t - y.t); }
    if (s.kind === 'paper') this.paperOutAt = 18 * H;
    if (s.kind === 'lift') this.liftOut = true;
    if (s.kind === 'cohort') { const extra = 15; const src = students().filter((p) => p.present); for (let i = 0; i < extra && src.length; i++) { const base = rng.pick(src); const a = { ...this.pop.agents[base.id - 1], id: this.pop.agents.length + 1 + i, name: `Visitor ${i + 1}`, desk: null, extra: true }; this.pop.agents.push(a); this.plans.set(a.id, { ...base, id: a.id, items: base.items.filter((it) => it.kind !== 'plot') }); } }
    if (s.kind === 'weekend') {
      // on a real weekend the term plan already holds the weekend before a review (owner 2026-11-11, item 32: late nights, all-nighters,
      // the organised printing early); on a weekday the situation makes the day a weekend-like one with the same rules
      const dn = dayName(this.date); const wk = dn === 'Sat' || dn === 'Sun';
      if (!wk) { const W = this.P.effort.weekend; for (const p of students()) { const a = this.pop.agents[p.id - 1]; const rev = this.cal.nextReview(this.date, a.year); const near = rev && rev.days <= W.near_days; p.present = rng.chance(near ? W.p_near_review : W.p_base); if (p.present) { p.arrive = 11 * H + rng.between(0, 3 * H); p.leave = near && a.lateWorker ? 23 * H + rng.between(0, 3 * H) : p.arrive + rng.between(4 * H, 9 * H); p.hours = (p.leave - p.arrive) / H; p.items = p.items.filter((i) => ['plot', 'print_small', 'lunch_in', 'lunch_out', 'dinner'].includes(i.kind)); } } }
      this.situation.title = wk ? `${dn} ${this.date}: the weekend before a review, as the term plans it` : 'a weekend-like day';
    }
    if (s.kind === 'other') {
      if (s.spec) {
        // the reading made in the interface with the user's key: a known situation first, then the concrete changes
        const spec = s.spec, ch = spec.changes || {};
        if (spec.read && spec.read !== 'other') { this.situation = { kind: spec.read }; this.applySituation(); }
        this.situation = { kind: spec.read || 'untested', text: s.text, read: spec.read || null, spec, title: spec.title, untested: !!spec.untested, applied: [] };
        this.applySpec(ch, rng);
        return;
      }
      // headless runner only (no key): a keyword reading, flagged as such; the interface greys "other" out without a key
      const text = String(s.text || '').toLowerCase(); const read = /review|present/.test(text) ? 'review' : /pin.?up/.test(text) ? 'pinup' : /plott|paper|print/.test(text) ? 'paper' : /lift|elevator/.test(text) ? 'lift' : /party|event|good times|waffle|food/.test(text) ? 'good_times' : /more (people|students)|crowd|extra/.test(text) ? 'cohort' : null;
      this.situation = { kind: read || 'untested', text: s.text, read, title: 'keyword reading (headless)' }; if (read) { this.applySituation(); this.situation.title = 'keyword reading (headless)'; }
    }
  }
  /** The changes a situation spec asks for, on top of the plans (interpret.js SCHEMA). */
  applySpec(ch, rng) {
    const H = 3600, M = 60, applied = this.situation.applied;
    const students = [...this.plans.values()].filter((p) => this.pop.agents[p.id - 1]?.role === 'student');
    const present = () => students.filter((p) => p.present);
    if (ch.extra_students > 0) { const src = present(); for (let i = 0; i < ch.extra_students && src.length; i++) { const base = rng.pick(src); const a = { ...this.pop.agents[base.id - 1], id: this.pop.agents.length + 1, name: `Visitor ${i + 1}`, desk: null, extra: true }; this.pop.agents.push(a); this.plans.set(a.id, { ...base, id: a.id, items: base.items.filter((it) => it.kind !== 'plot' && it.kind !== 'office_visit') }); } applied.push(`${ch.extra_students} extra people`); }
    if (ch.present_share != null && ch.present_share !== 1) {
      if (ch.present_share < 1) { let n = 0; for (const p of present()) if (!rng.chance(ch.present_share)) { p.present = false; n++; } applied.push(`${n} stay away`); }
      else { let n = 0; for (const p of students) if (!p.present && rng.chance(ch.present_share - 1)) { p.present = true; p.arrive = 10 * H + rng.between(0, 3 * H); p.leave = p.arrive + rng.between(3 * H, 8 * H); p.hours = (p.leave - p.arrive) / H; p.items = []; n++; } applied.push(`${n} come in who had planned not to`); }
    }
    if (ch.arrive_shift_h) { for (const p of present()) { p.arrive = clip(p.arrive + ch.arrive_shift_h * H, 7 * H, 24 * H); if (p.leave < p.arrive + 30 * M) p.leave = p.arrive + 30 * M; } applied.push(`arrival ${ch.arrive_shift_h > 0 ? '+' : ''}${ch.arrive_shift_h} h`); }
    if (ch.leave_shift_h) { for (const p of present()) p.leave = clip(p.leave + ch.leave_shift_h * H, p.arrive + 30 * M, 26 * H); applied.push(`leaving ${ch.leave_shift_h > 0 ? '+' : ''}${ch.leave_shift_h} h`); }
    if (ch.lift_out) { this.liftOut = true; applied.push('lift out'); }
    if (ch.paper_out_at) { this.paperOutAt = runSeconds(ch.paper_out_at); applied.push(`paper out at ${ch.paper_out_at}`); }
    if (ch.shop_closed) { this.policy.shopOpen = false; applied.push('shop closed'); }
    for (const it of ch.add_items || []) {
      const t0 = runSeconds(it.at), years = it.years?.length ? it.years : [1, 2, 3]; let n = 0;
      for (const p of present()) { const a = this.pop.agents[p.id - 1]; if (!years.includes(a.year) || !rng.chance(it.share)) continue; const item = { t: t0, kind: it.kind, minutes: it.minutes }; if (it.kind === 'lecture') item.room = this.term.lectureRoom?.[a.year] || null; if (it.kind === 'event') item.event = 'other'; if (it.kind === 'plot') item.sheets = rng.int(1, 4); p.items = p.items.filter((x) => !(x.kind === it.kind && Math.abs(x.t - t0) < 2 * H)); p.items.push(item); p.items.sort((x, y) => x.t - y.t); if (p.arrive > t0 - 10 * M) p.arrive = Math.max(7 * H, t0 - 10 * M); if (p.leave < t0 + it.minutes * M) p.leave = Math.min(26 * H, t0 + it.minutes * M + 15 * M); n++; }
      applied.push(`${it.kind.replace('_', ' ')} at ${it.at} for ${n}`);
    }
  }
  emit(kind, more = {}) { return this.bus.emit({ t: this.time, kind, ...more }); }
  remarkFor(ag, kind, data, because) {
    const r = this.remarks.remark(ag.a, { kind, data, because }, this.time);
    if (!r) return null;
    this.stats.remarks++;
    return this.emit('remark', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: this.placeName(ag), text: r.text, because: r.because, topic: kind, voice: r.voice });
  }
  placeName(ag) { const n = this.w.roomAt(ag.k, ag.c, ag.r); const rm = this.w.rooms.get(String(n)); if (!rm) return this.b.levels[ag.k].name.toLowerCase(); return rm.name && rm.name !== 'Room' ? rm.name.toLowerCase() : (rm.use === 'studio' ? 'the studio' : rm.use === 'stair' ? 'the stair lobby' : `room ${rm.number}`); }

  runtime(a) {
    const plan = this.plans.get(a.id) || { present: false, items: [] };
    const needRng = new Rng(this.seed, a.id, this.date, 'needs');
    const nd = this.P.needs;
    return { a, id: a.id, plan, k: this.w.entrance.k, c: this.w.entrance.c, r: this.w.entrance.r, x: this.w.entrance.c, y: this.w.entrance.r, face: 0, inside: false, gone: !plan.present, state: 'away', activity: null, at: null, atOwnDesk: false, steps: [], path: null, pi: 0, timer: 0, waitStart: 0,
      needs: { hunger: needRng.between(0.2, 0.6), thirst: needRng.between(0.2, 0.7), washroom: needRng.between(0.1, 0.6) },
      rates: { hunger: 1 / (needRng.between(...nd.hunger_h) * H), thirst: 1 / (needRng.between(...nd.thirst_h) * H), washroom: 1 / (needRng.between(...nd.washroom_h) * H) },
      headphones: false, bout: 0, boutEnd: 0, done: new Set(), queued: null, offsiteUntil: 0, lastConvo: -Infinity, holdUntil: 0, convoWith: null, critDone: false, item: null, stack: [] };
  }

  // ------------------------------------------------------------------ the tick
  step(dt) {
    if (this.done) return;
    this.time += dt;
    this.stepLift(dt);
    for (const ag of this.agents) this.stepAgent(ag, dt);
    this.layoutMgr.tick();
    if (this.time - this.lastEnc >= this.P.time.encounter_check_s) { this.lastEnc = this.time; this.encounters(); this.servePlotters(); }
    if (this.time - this.lastMinute >= 60) { this.lastMinute = this.time; this.stats.minute(this.agents, this.time); this.noise(); this.layoutMgr.minute(); }
    if (this.time >= this.end) { this.finish(); }
  }
  finish() {
    this.done = true; this.running = false;
    for (const ag of this.agents) if (ag.inside) { this.stats.focusEnd(ag.a.id, this.time, false); }
    this.layoutMgr.evaluate();
    this.emit('run_end', { text: `the day is over: ${this.stats.encounters} encounters, ${this.stats.interactions} conversations, ${this.stats.remarks} remarks` });
  }

  // ------------------------------------------------------------------ movement between floors (the first piece's logic)
  travelTo(ag, k, c, r) {
    const diff = Math.abs(k - ag.k), steps = [];
    let via = 'walk';
    if (diff > 0) {
      const ch = this.P.walking || {}; const liftOk = !this.liftOut && this.b.landings[ag.k] && this.b.landings[k];
      // one floor is the stairs unless there is a reason (owner 2026-11-12, stop 8): a mobility need, a load (sheets, a model, shop
      // material, review boards) or tiredness (late, or a sleep debt); two floors or more mostly the lift
      const LR = ch.lift_one_floor || {}, CARRY = ['plot', 'print_small', 'print3d', 'print3d_collect', 'shop', 'review', 'pinup'];
      const st = this.term && this.term.state ? this.term.state.get(ag.a.id) : null;
      const tired = this.time >= (LR.tired_after_h ?? 22) * H || (st && st.sleepDebt >= (LR.tired_sleep_debt_h ?? 4));
      const carry = CARRY.includes(ag.activity) || CARRY.includes(ag.lastActivity);
      const pOne = ag.a.mobilityNeed ? 1 : carry ? (LR.p_carrying ?? 0.7) : tired ? (LR.p_tired ?? 0.5) : (LR.p_base ?? 0.05);
      via = !liftOk ? 'stairs' : (diff <= 1 ? (this.rng.chance(pOne) ? 'lift' : 'stairs') : (this.rng.chance(ag.a.mobilityNeed ? 1 : (ch.lift_two_floors_p ?? 0.7)) ? 'lift' : 'stairs'));
      const why = diff <= 1 ? (ag.a.mobilityNeed ? 'one_need' : carry ? 'one_carry' : tired ? 'one_tired' : 'one_plain') : 'multi';
      const LC = this.stats.liftChoice || (this.stats.liftChoice = {}); const key = `${why}_${via}`; LC[key] = (LC[key] || 0) + 1;
      if (via === 'lift') { const f = this.b.landings[ag.k], t = this.b.landings[k]; steps.push({ type: 'walk', k: ag.k, c: f.c, r: f.r }, { type: 'lift', from: ag.k, to: k, dir: k > ag.k ? 1 : -1 }, { type: 'walk', k, c, r }); }
      if (via === 'stairs') { let ck = ag.k, cc = ag.c, cr = ag.r, ok = true; const dir = k > ag.k ? 1 : -1; while (ck !== k) { const s = this.b.nearestStair(ck, cc, cr, dir); if (!s) { ok = false; break; } steps.push({ type: 'walk', k: ck, c: s.portal.from.c, r: s.portal.from.r }, { type: 'stairs', portal: s.portal }); ck = s.portal.to.k; cc = s.portal.to.c; cr = s.portal.to.r; } if (ok) steps.push({ type: 'walk', k, c, r }); else { steps.length = 0; const f = this.b.landings[ag.k], t = this.b.landings[k]; if (f && t && !this.liftOut) steps.push({ type: 'walk', k: ag.k, c: f.c, r: f.r }, { type: 'lift', from: ag.k, to: k, dir: k > ag.k ? 1 : -1 }, { type: 'walk', k, c, r }); else steps.push({ type: 'walk', k: ag.k, c: ag.c, r: ag.r }); } }
    } else steps.push({ type: 'walk', k, c, r });
    ag.steps = steps; this.startStep(ag);
  }
  startStep(ag) {
    const s = ag.steps[0];
    if (!s) { ag.state = 'arrived'; return; }
    if (s.type === 'walk') {
      if (s.k !== ag.k) { ag.steps.shift(); return this.startStep(ag); }
      if (s.c === ag.c && s.r === ag.r) { ag.steps.shift(); return this.startStep(ag); }
      const path = this.w.path(ag.k, [ag.c, ag.r], [s.c, s.r]);
      if (!path) { ag.steps = []; ag.state = 'arrived'; return; }
      this.stats.addPath(ag.k, path, ag.a.year);
      ag.path = path; ag.pi = 0; ag.state = 'walking';
      if (ag.activity === 'desk_work') { this.stats.focusEnd(ag.a.id, this.time, false); }
    } else if (s.type === 'stairs') { ag.state = 'climbing'; ag.timer = this.stairSec; }
    else if (s.type === 'lift') { ag.state = 'waiting'; ag.waitStart = this.time; this.lift.call(s.from, s.dir, this.time); }
  }
  finishStep(ag) { ag.steps.shift(); this.startStep(ag); }
  stepLift(dt) {
    const lift = this.lift;
    lift.step(dt, this.time);
    for (const e of lift.events) if (e.type === 'doors_open') { const land = this.b.landings[e.floor]; for (const ag of lift.alight()) { ag.k = e.floor; ag.c = land.c; ag.r = land.r; ag.x = ag.c; ag.y = ag.r; this.finishStep(ag); } }
    for (const ag of this.agents) if (ag.state === 'waiting') lift.call(ag.steps[0].from, ag.steps[0].dir, ag.waitStart);
    if (lift.state === 'open') {
      const waiting = this.agents.filter((ag) => ag.state === 'waiting').sort((p, q) => p.waitStart - q.waitStart);
      for (const ag of waiting) { const s = ag.steps[0]; if (s.from !== lift.floor || lift.free <= 0) continue; if (lift.dir !== 0 && lift.dir !== s.dir && lift.passengers.length) continue; if (lift.dir === 0) lift.dir = s.dir; lift.board(ag, s.to, this.time); const w = this.time - ag.waitStart; this.stats.queued('lift', w); if (w > 60) this.remarkFor(ag, 'lift_wait', { wait: Math.round(w), n: waiting.length - 1 }, `lift wait ${Math.round(w)} s at ${this.b.levels[lift.floor].name}`); ag.state = 'riding'; }
    }
  }

  // ------------------------------------------------------------------ one agent, one tick
  stepAgent(ag, dt) {
    const a = ag.a, plan = ag.plan;
    if (ag.gone) return;
    if (!ag.inside) {
      if (ag.state === 'offsite') { if (this.time >= ag.offsiteUntil) { this.enter(ag); this.next(ag); } return; }
      if (plan.present && this.time >= plan.arrive) { this.enter(ag); this.emit('arrive', { agents: [a.id], k: ag.k, c: ag.c, r: ag.r, place: 'south door', text: `${a.name} arrives` }); this.remarkFor(ag, plan.arrive > 13 * H ? 'arrive_late' : 'arrive', { hours: Math.round(plan.hours), n: this.agents.filter((x) => x.inside).length }, `planned ${plan.hours.toFixed(1)} h; arrival ${hhmm(plan.arrive)}`); this.next(ag); }
      return;
    }
    // needs grow; the lift and the stairs are handled by state
    for (const n of Object.keys(ag.needs)) ag.needs[n] += ag.rates[n] * dt * (ag.activity === 'event' && n === 'thirst' ? 0.5 : 1);
    switch (ag.state) {
      case 'walking': {
        const g = this.w.levels[ag.k].grid; let budget = dt * this.speed / g.tm;
        while (budget > 0 && ag.path && ag.pi < ag.path.length - 1) {
          const [tc, tr] = ag.path[ag.pi + 1]; const slow = g.at(tc, tr) === WALK.STAIR ? g.stairCost : 1;
          const dx = tc - ag.x, dy = tr - ag.y, d = Math.hypot(dx, dy);
          if (d < 1e-9) { ag.pi++; continue; }
          const move = Math.min(d, budget / slow); ag.x += dx / d * move; ag.y += dy / d * move; budget -= move * slow;
          ag.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
          if (move >= d - 1e-9) { ag.pi++; ag.c = tc; ag.r = tr; this.passing(ag); }
        }
        if (!ag.path || ag.pi >= ag.path.length - 1) { const last = ag.path[ag.path.length - 1]; ag.c = last[0]; ag.r = last[1]; ag.x = ag.c; ag.y = ag.r; ag.path = null; this.finishStep(ag); if (ag.state === 'arrived') this.arrived(ag); }
        break;
      }
      case 'climbing': ag.timer -= dt; if (ag.timer <= 0) { const p = ag.steps[0].portal; ag.k = p.to.k; ag.c = p.to.c; ag.r = p.to.r; ag.x = ag.c; ag.y = ag.r; this.finishStep(ag); if (ag.state === 'arrived') this.arrived(ag); } break;
      case 'riding': ag.k = Math.round(this.lift.pos); break;
      case 'waiting': if ((this.liftOut && this.time - ag.waitStart > 90) || this.time - ag.waitStart > 150) { const last = ag.steps[ag.steps.length - 1]; ag.steps = []; this.stats.queued('lift', this.time - ag.waitStart); const save = this.liftOut; this.liftOut = true; this.travelTo(ag, last.k, last.c, last.r); this.liftOut = save; } break;
      case 'arrived': this.arrived(ag); break;
      case 'doing': this.doing(ag, dt); break;
      case 'queue': this.queueing(ag, dt); break;
      default: break;
    }
    // a need that cannot wait interrupts what the agent is doing (not a crit, not a lecture, not the queue)
    if (ag.state === 'doing' && ag.activity && !['crit', 'lecture', 'seminar', 'review'].includes(ag.activity)) {
      const crit = this.P.needs.critical_fraction;
      if (ag.needs.washroom >= 1) this.interruptFor(ag, 'washroom');
      else if (ag.needs.thirst >= 1) { if (this.rng.chance(0.7)) ag.needs.thirst = 0; /* a bottle at the desk */ else this.interruptFor(ag, 'water'); }
      else if (ag.needs.hunger >= 1 && ag.activity !== 'eat') this.interruptFor(ag, 'snack');
      else if (ag.activity === 'desk_work' && ag.needs.washroom >= crit + 0.3 && this.time >= ag.boutEnd) this.interruptFor(ag, 'washroom');
    }
    if (ag.inside && this.time >= plan.leave && ag.state === 'doing' && !['crit', 'review', 'event', 'lecture', 'seminar'].includes(ag.activity) && !ag.leaving) this.leave(ag);
  }
  enter(ag) { const e = this.w.entrance; ag.inside = true; ag.k = e.k; ag.c = e.c; ag.r = e.r; ag.x = e.c; ag.y = e.r; ag.state = 'arrived'; ag.activity = null; }
  leave(ag) { ag.leaving = true; ag.stack = []; ag.item = { kind: 'leave' }; this.goTo(ag, this.w.entrance.k, this.w.entrance.c, this.w.entrance.r, 'leave'); const late = this.time > 22 * H; this.emit('leave', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: this.placeName(ag), text: `${ag.a.name} leaves` }); this.remarkFor(ag, late ? 'leave_late' : 'leave', { hours: Math.round((this.time - ag.plan.arrive) / H), n: this.agents.filter((x) => x.inside && x.activity === 'desk_work').length, clock: hhmm(this.time + 20 * M) }, `planned leave ${hhmm(ag.plan.leave)}`); }
  travelByStairs(ag) { const t = ag.steps.length ? ag.steps[ag.steps.length - 1] : null; const save = this.liftOut; this.liftOut = true; if (t) this.travelTo(ag, t.k, t.c, t.r); this.liftOut = save; }
  goTo(ag, k, c, r, activity, minutes, extra = {}) {
    ag.lastActivity = ag.activity; ag.activity = activity; ag.pending = { activity, minutes, ...extra }; ag.atOwnDesk = false;
    if (ag.state === 'doing' && ag.wasFocus) { this.stats.focusEnd(ag.a.id, this.time, false); ag.wasFocus = false; }
    this.travelTo(ag, k, c, r);
    if (ag.state === 'arrived') this.arrived(ag);
  }
  /** Reached the place: start doing the pending activity. */
  arrived(ag) {
    const p = ag.pending; ag.state = 'doing'; ag.timer = (p?.minutes ?? 5) * M; ag.activity = p?.activity || 'idle'; ag.pending = null;
    const a = ag.a;
    if (ag.activity === 'leave') { ag.inside = false; ag.gone = true; ag.state = 'away'; this.stats.focusEnd(a.id, this.time, false); return; }
    if (ag.activity === 'offsite') { ag.inside = false; ag.state = 'offsite'; ag.offsiteUntil = this.time + ag.timer; return; }
    ag.atOwnDesk = !!a.desk && ag.k === a.desk.k && ag.c === a.desk.stand[0] && ag.r === a.desk.stand[1];
    if (ag.activity === 'desk_work') { this.startBout(ag); const noise = this.noiseAt(ag); if (!ag.headphones && (noise > 2 || this.rng.chance(a.headphonesP * 0.5))) { ag.headphones = true; if (noise > 2) this.remarkFor(ag, 'headphones_on', { n: Math.round(noise) }, `noise ${noise.toFixed(1)} at the desk; P(headphones) ${a.headphonesP.toFixed(2)}`); } }
    else ag.headphones = false;
    if (ag.activity === 'crit' && a.role === 'student') this.remarkFor(ag, 'crit_start', {}, `crit slot ${hhmm(this.time)}, ${Math.round(ag.timer / M)} min`);
    if (ag.activity === 'plot') { this.joinPlotters(ag); }
    if (ag.activity === 'event') { this.remarkFor(ag, ag.eventName === 'waffle_wednesday' ? 'waffle_join' : 'event_join', {}, `event attendance (${ag.eventName || 'event'}); sociability ${a.sociability.toFixed(2)}`); this.stats.used(a.id, 'lounge'); }
    if (ag.activity === 'pinup') this.remarkFor(ag, 'pinup', {}, 'pin-up arrangement in the bay');
    if (ag.activity === 'seminar') this.remarkFor(ag, 'seminar', {}, 'history seminar in a crit room (D14)');
    if (ag.activity === 'shop') this.remarkFor(ag, 'shop', {}, 'shop trip, supervised hours');
    if (ag.activity === 'lecture') this.remarkFor(ag, 'lecture', { room: ag.room || '' }, `the year's lecture in room ${ag.room}, booked first come (B4, Q19)`);
    if (ag.activity === 'office_visit') { const inst = this.byId.get(ag.visiting); if (inst) { this.stats.interaction(a, inst.a, ag.timer); this.emit('office_visit', { agents: [a.id, inst.a.id], k: ag.k, c: ag.c, r: ag.r, place: this.placeName(ag), text: `${a.name} visits ${inst.a.name} in office hours` }); } this.remarkFor(ag, 'office_visit', {}, `office-hour visit: P(week) ${a.officeVisitP?.toFixed(2)} from keenness, N and C (Q10)`); }
    if (ag.activity === 'washroom') { this.stats.used(a.id, 'washroom'); }
    if (ag.activity === 'eat' || ag.activity === 'water' || ag.activity === 'snack') { this.stats.used(a.id, 'kitchen'); const n = this.agents.filter((x) => x.inside && x.k === ag.k && this.w.roomAt(x.k, x.c, x.r) === Number(this.w.kitchen.number)).length; if (n >= 6) this.remarkFor(ag, 'kitchen_crowded', { n }, `${n} in the kitchen`); }
    if (ag.activity === 'print3d_collect') { this.remarkFor(ag, 'print3d_collect', { done: hhmm(ag.printDone || this.time), wait: Math.round((this.time - (ag.printDone || this.time)) / M) }, 'collect delay (RS3)'); }
  }
  startBout(ag) { const b = this.P.effort.breaks; const r = new Rng(this.seed, ag.a.id, Math.floor(this.time), 'bout'); ag.boutEnd = this.time + r.gamma(b.gamma_shape, b.work_mean_min / b.gamma_shape) * M; ag.boutStart = this.time; this.stats.focusStart(ag.a.id, this.time); ag.wasFocus = true; }
  doing(ag, dt) {
    ag.timer -= dt;
    if (ag.activity === 'desk_work') {
      if (this.time >= ag.boutEnd) { this.stats.focusEnd(ag.a.id, this.time, false); ag.wasFocus = false; this.breakFor(ag); return; }
      if (ag.a.role === 'student' && ag.plan.crit && !ag.critDone && this.time >= ag.plan.crit.t - 2 * M) { this.toCrit(ag); return; }
      if (this.dueItem(ag)) return;
      return;
    }
    if (ag.activity === 'office') { if (this.dueItem(ag)) return; return; }
    if (ag.timer <= 0) { this.finished(ag); }
  }
  /** The next plan item is due: go and do it. Returns true when something started. */
  dueItem(ag) {
    const it = ag.plan.items.find((i) => !ag.done.has(i) && i.t <= this.time && i.t > this.time - 90 * M);
    if (!it) return false;
    ag.done.add(it); return this.startItem(ag, it);
  }
  startItem(ag, it) {
    const a = ag.a, w = this.w;
    const stand = (piece) => piece && piece.stand ? [piece.k, piece.stand[0], piece.stand[1]] : null;
    const pick = (arr) => arr.length ? arr[Math.floor(this.rng.next() * arr.length)] : null;
    switch (it.kind) {
      case 'studio_session': if (a.role === 'instructor') { this.critSpotFor(ag); this.instructorRound(ag); return true; } return this.toDesk(ag);
      case 'intro': {
        // the section gathers round the instructor's spot for the briefing (question 23)
        const inst = a.role === 'instructor' ? ag : this.byId.get(this.term.instructorOf(a)?.id); if (!inst) return this.toDesk(ag);
        const spot = this.critSpotFor(inst), g = w.levels[spot.k].grid;
        if (a.role === 'instructor') { this.goTo(ag, spot.k, spot.stand[0], spot.stand[1], 'intro', it.minutes); this.emit('intro', { agents: [a.id], k: spot.k, c: spot.stand[0], r: spot.stand[1], place: this.placeName({ k: spot.k, c: spot.stand[0], r: spot.stand[1] }), text: `section ${a.section} (year ${a.year}) gathers at ${a.name}'s spot for the briefing` }); this.remarkFor(ag, 'intro', { n: this.agents.filter((x) => x.a.role === 'student' && x.a.year === a.year && x.a.section === a.section && x.inside).length }, `the section's intro, ${it.minutes} min (B4, question 23)`); return true; }
        const ring = []; for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) { const c = spot.stand[0] + dc, r = spot.stand[1] + dr; if ((dc || dr) && g.inb(c, r) && g.at(c, r) === WALK.FLOOR) ring.push([c, r]); }
        if (!ring.length) return this.toDesk(ag);
        const [c, r] = ring[this.rng.int(0, ring.length - 1)];
        this.goTo(ag, spot.k, c, r, 'intro', it.minutes); if (this.rng.chance(0.15)) this.remarkFor(ag, 'intro', {}, `the section's intro at the instructor's spot (question 23)`); return true;
      }
      case 'lecture': { const room = it.room ? w.classRooms.find((c) => c.room.number === String(it.room)) : null; if (!room) { this.goTo(ag, w.entrance.k, w.entrance.c, w.entrance.r, 'offsite', it.minutes + 20); this.remarkFor(ag, 'lecture_off', { min: 10 }, 'no classroom seats the year group: the lecture is in another building (Q19)'); return true; } const s = stand(pick(room.chairs)); if (!s) return false; ag.room = room.room.number; this.goTo(ag, ...s, 'lecture', it.minutes); return true; }
      case 'seminar': { const room = (it.room && w.critRooms.find((c) => c.room.number === String(it.room))) || w.critRooms.find((c) => c.spots.length); const s = stand(pick(room ? room.spots : [])); if (!s) return false; this.goTo(ag, ...s, 'seminar', it.minutes); return true; }
      case 'lecture_off': this.goTo(ag, w.entrance.k, w.entrance.c, w.entrance.r, 'offsite', it.minutes); this.remarkFor(ag, 'lecture_off', { min: this.P.studio.seminar.walk_min[1] }, 'lecture in another building (B5)'); return true;
      case 'lunch_out': this.goTo(ag, w.entrance.k, w.entrance.c, w.entrance.r, 'offsite', it.minutes); return true;
      case 'lunch_in': { const s = stand(pick(w.kitchenSpots)); if (!s) return false; ag.stack.push({ kind: 'eat_at', minutes: 25 }); this.goTo(ag, ...s, 'eat', 8); return true; }
      case 'dinner': { const s = stand(pick(w.kitchenSpots)); if (!s) return false; this.goTo(ag, ...s, 'eat', it.minutes); return true; }
      case 'lunch_skip': return false;
      case 'plot': { const c = stand(pick(w.computers)); if (!c) return false; ag.job = { sheets: it.sheets || 2 }; ag.stack.push({ kind: 'plot_go' }); if (it.early) this.remarkFor(ag, 'print_early', {}, `printing ${this.cal.nextReview(this.date, a.year)?.days ?? '?'} days before the review: C ${a.traits.C.toFixed(1)} (item 32)`); this.goTo(ag, ...c, 'send_job', 3); return true; }
      case 'print_small': { const s = stand(pick(w.printers)); if (!s) return false; this.goTo(ag, ...s, 'print', this.P.resources.printers_small.service_min); return true; }
      case 'print3d': { const s = stand(pick(w.printers3d)); if (!s) return false; ag.printDone = this.time + this.P.resources.printer3d.slot_min * M; ag.stack.push({ kind: 'print3d_collect', at: ag.printDone + this.rng.between(...this.P.resources.printer3d.collect_delay_min) * M }); this.goTo(ag, ...s, 'print3d', 8); return true; }
      case 'shop': { if (!this.policy.shopOpen || !this.shopOpen()) return false; const sh = pick(w.shops.filter((x) => x.spots.length)); const s = stand(pick(sh ? sh.spots : [])); if (!s) return false; this.goTo(ag, ...s, 'shop', it.minutes); return true; }
      case 'event': { const tile = pick(w.loungeFloor); if (tile == null) return false; const g = w.levels[w.lounge.k].grid, [c, r] = g.cr(tile); ag.eventName = it.event || 'event'; this.goTo(ag, w.lounge.k, c, r, 'event', it.minutes); return true; }
      case 'pinup': { const bay = this.bayOf(a); const s = stand(pick(bay)); if (!s) return this.toDesk(ag); this.goTo(ag, ...s, 'pinup', it.minutes); return true; }
      case 'review': { const rooms = w.critRooms.filter((c) => c.spots.length).sort((p, q) => Math.abs(p.room.k - w.studio.k) - Math.abs(q.room.k - w.studio.k)); const room = rooms[(a.section - 1) % Math.max(1, rooms.length)]; const s = stand(pick(room ? room.spots : [])); if (!s) return this.toDesk(ag); this.goTo(ag, ...s, 'review', it.minutes); return true; }
      case 'offsite': this.goTo(ag, w.entrance.k, w.entrance.c, w.entrance.r, 'offsite', it.minutes); return true;
      case 'office_visit': { const inst = this.byId.get(it.instructor); const d = inst?.a.officeDesk; if (!inst || !inst.inside || !d) return false; const g = w.levels[d.k].grid; const n = g.neighbours(g.idx(d.stand[0], d.stand[1])).map(([i]) => g.cr(i)).find(([cc, rr]) => g.at(cc, rr) === WALK.FLOOR) || d.stand; ag.visiting = inst.a.id; this.goTo(ag, d.k, n[0], n[1], 'office_visit', it.minutes); return true; }
      case 'office': { const d = a.officeDesk; if (!d) return this.toDesk(ag); this.goTo(ag, d.k, d.stand[0], d.stand[1], 'office', it.minutes); return true; }
      default: return false;
    }
  }
  toDesk(ag) { const d = ag.a.desk || ag.a.officeDesk; if (!d) { if (ag.a.role === 'instructor') { const t = this.critSpotFor(ag); this.goTo(ag, t.k, t.stand[0], t.stand[1], 'office', 30); return true; } const t = this.w.hotDesks[0]; if (t) { this.goTo(ag, t.k, t.stand[0], t.stand[1], 'desk_work'); return true; } return false; } this.goTo(ag, d.k, d.stand[0], d.stand[1], ag.a.role === 'instructor' ? 'office' : 'desk_work'); return true; }
  bayOf(a) { const d = a.desk; if (!d) return this.w.pinups; return this.w.pinups.filter((p) => Math.abs(p.y - d.y) < 5).concat(this.w.sideTables.filter((p) => Math.abs(p.y - d.y) < 5)); }
  shopOpen() { const dn = dayName(this.date), hrs = this.P.resources.shops.basement.days; const ranges = dn === 'Fri' ? hrs.Fri : (dn === 'Sat' || dn === 'Sun') ? hrs['Sat-Sun'] : hrs['Mon-Thu']; const t = this.time % 86400; return ranges.some(([a, b]) => t >= secondsOf(a) && t <= secondsOf(b)); }
  /** What to do next, in order: the stack (follow-ups), a due item, else the default place. */
  next(ag) {
    if (ag.leaving) return;
    if (ag.stack.length) { const s = ag.stack.shift(); if (s.kind === 'eat_at') { const d = ag.a.desk; if (d) { this.goTo(ag, d.k, d.stand[0], d.stand[1], 'eat', s.minutes); return; } } if (s.kind === 'plot_go') { const p = this.w.plotters[0]; this.goTo(ag, p.k, p.stand[0], p.stand[1], 'plot'); return; } if (s.kind === 'print3d_collect') { if (this.time < s.at) { ag.stack.push(s); } else { const p = this.w.printers3d[0]; this.goTo(ag, p.k, p.stand[0], p.stand[1], 'print3d_collect', 4); return; } } }
    if (this.time >= ag.plan.leave) { this.leave(ag); return; }
    if (this.dueItem(ag)) return;
    this.toDesk(ag);
  }
  finished(ag) {
    const act = ag.activity;
    if (act === 'crit') { ag.critDone = true; this.emit('crit_end', { agents: [ag.a.id, ag.critWith], k: ag.k, c: ag.c, r: ag.r, place: this.placeName(ag), text: 'crit over' }); this.remarkFor(ag, 'crit_end', {}, 'crit over'); ag.critWith = null; const inst = this.byId.get(ag.a.id === ag.critStudent ? ag.critWith : null);
      // Friday plans (owner 2026-11-12, stop 5): once the desk crit is done, a share leave before the end of studio and skip the evening
      const F = this.P.effort.friday; if (F && ag.a.role === 'student' && dayName(this.date) === 'Fri' && this.rng.chance(F.plans_p)) { const t = this.time + this.rng.between(...F.leave_after_crit_min) * M; if (t < ag.plan.leave) { ag.plan.leave = Math.round(t); ag.plan.items = ag.plan.items.filter((i) => i.kind !== 'event' || i.t < this.time); this.remarkFor(ag, 'friday_plans', { clock: hhmm(t) }, `Friday: crit done, other plans; leaving at ${hhmm(t)} (P ${F.plans_p})`); } }
    }
    if (act === 'washroom' || act === 'water' || act === 'snack' || act === 'eat' || act === 'break' || act === 'print' || act === 'print3d' || act === 'print3d_collect' || act === 'shop' || act === 'lecture' || act === 'intro' || act === 'seminar' || act === 'event' || act === 'pinup' || act === 'review' || act === 'send_job' || act === 'plot_done') { if (act === 'event') this.emit('event_leave', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: this.placeName(ag) }); }
    if (act === 'crit' && ag.a.role === 'instructor') { this.instructorRound(ag); return; }
    this.next(ag);
  }
  breakFor(ag) {
    const b = this.P.effort.breaks, r = new Rng(this.seed, ag.a.id, Math.floor(this.time), 'break');
    const minutes = r.gamma(b.gamma_shape, b.break_mean_min / b.gamma_shape);
    const x = r.next();
    if (x < 0.2 && ag.needs.thirst > 0.5) { const s = this.w.kitchenSpots[r.int(0, this.w.kitchenSpots.length - 1)]; this.goTo(ag, s.k, s.stand[0], s.stand[1], 'water', Math.min(minutes, 6)); ag.needs.thirst = 0; }
    else if (x < 0.55) { const t = this.w.loungeFloor[r.int(0, this.w.loungeFloor.length - 1)]; const g = this.w.levels[this.w.lounge.k].grid, [c, rr] = g.cr(t); this.goTo(ag, this.w.lounge.k, c, rr, 'break', minutes); }
    else if (x < 0.75) { const s = (this.layout.sharedBoard?.stand && r.next() < 0.5) ? this.layout.sharedBoard : this.w.pinups[r.int(0, this.w.pinups.length - 1)]; this.goTo(ag, s.k, s.stand[0], s.stand[1], 'break', Math.min(minutes, 5)); }
    else { ag.state = 'doing'; ag.activity = 'break'; ag.timer = minutes * M; ag.headphones = false; }
    this.remarkFor(ag, 'break', {}, `work bout over after ${Math.round((this.time - (ag.boutStart ?? this.time)) / M)} min (renewal, E11)`);
  }
  interruptFor(ag, need) {
    const w = this.w, a = ag.a;
    if (ag.wasFocus) { this.stats.focusEnd(a.id, this.time, false); ag.wasFocus = false; }
    if (need === 'washroom') { const wc = w.washroomFor(a, ag.k); if (!wc) return; const s = wc.stalls[Math.floor(this.rng.next() * wc.stalls.length)]; const m = w.levels[ag.k].grid.tm * 10 + Math.abs(wc.k - ag.k) * 20; ag.needs.washroom = 0; this.goTo(ag, wc.k, s.stand[0], s.stand[1], 'washroom', this.rng.between(...this.P.needs.durations_min.washroom)); this.remarkFor(ag, 'washroom_trip', { m: Math.round(m), min: 8 }, `washroom on ${this.b.levels[wc.k].name} (none on the studio floor)`); }
    else if (need === 'water') { const s = w.kitchenSpots[Math.floor(this.rng.next() * w.kitchenSpots.length)]; ag.needs.thirst = 0; this.goTo(ag, s.k, s.stand[0], s.stand[1], 'water', this.rng.between(...this.P.needs.durations_min.water)); }
    else if (need === 'snack') { const s = w.kitchenSpots[Math.floor(this.rng.next() * w.kitchenSpots.length)]; ag.needs.hunger = 0.2; this.goTo(ag, s.k, s.stand[0], s.stand[1], 'snack', this.rng.between(...this.P.needs.durations_min.kitchen)); }
  }
  toCrit(ag) {
    const c = ag.plan.crit, a = ag.a; ag.critDone = true;
    const inst = this.byId.get(c.instructor);
    let atDesk = !!(c.atDesk && a.desk), moved = false;
    if (atDesk && this.bayCrowded(ag)) { atDesk = false; moved = true; }
    const spot = inst ? this.critSpotFor(inst) : this.w.sideTables[0];
    ag.critWith = c.instructor;
    if (atDesk) { ag.state = 'doing'; ag.activity = 'crit'; ag.timer = c.minutes * M; ag.headphones = false; }
    else this.goTo(ag, spot.k, spot.stand[0], spot.stand[1], 'crit', c.minutes);
    if (inst && inst.inside) {
      inst.critWith = a.id;
      if (atDesk) { const g = this.w.levels[a.desk.k].grid; const n = g.neighbours(g.idx(a.desk.stand[0], a.desk.stand[1])).map(([i]) => g.cr(i)).find(([cc, rr]) => g.at(cc, rr) === WALK.FLOOR); const [cc, rr] = n || a.desk.stand; this.goTo(inst, a.desk.k, cc, rr, 'crit', c.minutes); }
      else this.goTo(inst, spot.k, spot.stand[0], spot.stand[1], 'crit', c.minutes);
    }
    const where = atDesk ? 'desk' : spot.kind === 'table' ? 'shared table' : 'crit room';
    this.emit('crit_start', { agents: [a.id, c.instructor], k: ag.k, c: ag.c, r: ag.r, place: where, text: `desk crit ${Math.round(c.minutes)} min at the ${where}${moved ? ' (the bay was crowded or loud)' : ''}` });
    if (this.time - c.t > 10 * M) this.remarkFor(ag, 'crit_wait', { pos: 1, wait: Math.round((this.time - c.t) / M), signed: hhmm(ag.plan.arrive) }, `crit ${Math.round((this.time - c.t) / M)} min late (sign-up sheet, C3)`);
  }
  /** Three or more neighbours working within two tiles, or the noise at the desk above the threshold (C5, Q6). */
  bayCrowded(ag) { const d = ag.a.desk; if (!d) return false; const tr = this.P.layout.manager?.triggers || {}; let n = 0; for (const x of this.agents) if (x !== ag && x.inside && x.k === d.k && x.activity === 'desk_work' && Math.abs(x.x - d.stand[0]) <= 2 && Math.abs(x.y - d.stand[1]) <= 2) n++; return n >= 3 || this.noiseAt(ag) > (tr.noise_at_desk || 2); }
  /** The instructor's spot for the session: the free side table nearest the section's desks, else a free crit room on the floor, else a shared table (C5; owner 2026-11-08, question 6). */
  critSpotFor(inst) {
    if (inst.spot) return inst.spot;
    const a = inst.a, mates = this.w.studioDesks.filter((d) => d.owner && d.stand && this.pop.agents[d.owner - 1]?.year === a.year && this.pop.agents[d.owner - 1]?.section === a.section);
    const cx = mates.length ? mates.reduce((s, d) => s + d.stand[0], 0) / mates.length : 0, cy = mates.length ? mates.reduce((s, d) => s + d.stand[1], 0) / mates.length : 0;
    const free = this.w.sideTables.filter((t) => t.stand && !this.claimedSpots.has(t.id)).sort((p, q) => Math.hypot(p.stand[0] - cx, p.stand[1] - cy) - Math.hypot(q.stand[0] - cx, q.stand[1] - cy));
    let spot = free[0];
    if (!spot) { const room = this.w.critRooms.find((c) => c.room.k === this.w.studio.k && c.spots.length && !this.claimedSpots.has('room:' + c.room.number)); if (room) { spot = room.spots[0]; this.claimedSpots.add('room:' + room.room.number); } }
    if (!spot) spot = this.w.sideTables[(a.section * 3 + a.year) % Math.max(1, this.w.sideTables.length)];
    this.claimedSpots.add(spot.id); inst.spot = spot;
    if (a.critMode === 'spot') { this.emit('crit_spot', { agents: [a.id], k: spot.k, c: spot.stand[0], r: spot.stand[1], place: this.placeName({ k: spot.k, c: spot.stand[0], r: spot.stand[1] }), text: `${a.name} sets up at ${spot.kind === 'table' ? 'a side table' : 'a crit room'} near section ${a.section}'s desks; the students come over` }); this.remarkFor(inst, 'crit_spot', {}, `crit mode: spot (C5; owner 2026-11-08); the free side table nearest the section's desks`); }
    return spot;
  }
  /** The instructor between crits: to the next student's spot, or the shared table. */
  instructorRound(ag) { const run = ag.plan.critRun || []; const nextId = run.find((id) => { const s = this.byId.get(id); return s && s.inside && !s.critDone; }); const spot = this.critSpotFor(ag); if (!nextId) { this.goTo(ag, spot.k, spot.stand[0], spot.stand[1], 'office', 30); return; } const s = this.byId.get(nextId); if (ag.a.critMode === 'spot') { this.goTo(ag, spot.k, spot.stand[0], spot.stand[1], 'office', 3); return; } const target = s.a.desk ? [s.a.desk.k, s.a.desk.stand[0], s.a.desk.stand[1]] : [spot.k, ...spot.stand]; const g = this.w.levels[target[0]].grid; const n = g.neighbours(g.idx(target[1], target[2])).map(([i]) => g.cr(i)).find(([cc, rr]) => g.at(cc, rr) === WALK.FLOOR); const [cc, rr] = n || [target[1], target[2]]; this.goTo(ag, target[0], cc, rr, 'office', 3); }

  // ------------------------------------------------------------------ the plotters: two servers, paper that runs out
  joinPlotters(ag) { ag.state = 'queue'; ag.queued = this.time; this.plotter.queue.push(ag); this.stats.used(ag.a.id, 'plotters'); const tb = this.layout.plotterTable; if (tb?.stand) { const g = this.w.levels[tb.k].grid; const ns = g.neighbours(g.idx(tb.stand[0], tb.stand[1])).map(([i]) => g.cr(i)).filter(([cc, rr]) => g.at(cc, rr) === WALK.FLOOR); const t = ns[this.plotter.queue.length % Math.max(1, ns.length)]; if (t) { ag.c = t[0]; ag.r = t[1]; ag.x = t[0]; ag.y = t[1]; } } const n = this.plotter.queue.length; if (n >= 4) this.remarkFor(ag, 'plot_queue', { n }, `queue ${n} at ${hhmm(this.time)}`); this.emit('plot_queue', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: 'plotters', text: `queue ${n}, paper ${this.plotter.paper} sheets` }); }
  paperRestockOpen() { const rs = this.P.resources.plotters.restock_hours; const dn = dayName(this.date); const t = this.time % 86400; return this.policy.paperAllHours || (rs.days.includes(dn) && t >= secondsOf(rs.start) && t <= secondsOf(rs.end)); }
  servePlotters() {
    const pl = this.plotter;
    if (this.paperOutAt && this.time >= this.paperOutAt && pl.paper > 0) { pl.paper = 0; }
    if (pl.paper <= 0 && this.paperRestockOpen()) { pl.paper = this.P.resources.plotters.paper_stock_sheets; this.emit('paper_restock', { place: 'plotters', text: 'paper restocked by the technician' }); }
    for (let i = 0; i < pl.busy.length; i++) { const b = pl.busy[i]; if (b && this.time >= b.until) { pl.busy[i] = null; const ag = b.ag; ag.state = 'doing'; ag.activity = 'plot_done'; ag.timer = 30; const w = b.waited; this.stats.queued('plotters', w); this.emit('plot_done', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: 'plotters', text: `printed ${b.sheets} sheets after ${Math.round(w / M)} min in the queue` }); this.remarkFor(ag, 'plot_done', { wait: Math.round(w / M), sheets: b.sheets }, `plotter wait ${Math.round(w / M)} min`); } }
    while (pl.queue.length) {
      const free = pl.busy.findIndex((b) => !b); if (free < 0) break;
      const ag = pl.queue[0], sheets = ag.job?.sheets || 2;
      if (pl.paper < sheets) { if (!this.paperRestockOpen()) { const waited = this.time - ag.queued; if (waited > 15 * M) { pl.queue.shift(); pl.outages++; this.stats.abandoned = (this.stats.abandoned || 0) + 1; this.stats.queued('plotters', waited); this.emit('paper_out', { agents: [ag.a.id], k: ag.k, c: ag.c, r: ag.r, place: 'plotters', text: `paper out, technician off the floor; ${ag.a.name} gives up after ${Math.round(waited / M)} min` }); this.remarkFor(ag, 'paper_out', {}, 'paper stock 0 outside staffed hours (D10)'); ag.state = 'doing'; ag.activity = 'plot_done'; ag.timer = 5; } break; } break; }
      pl.queue.shift(); pl.paper -= sheets;
      const sv = this.P.resources.plotters.service_min; const minutes = Math.max(2, sv.mean + sv.sd * this.rng.normal()) * sheets / 2;
      pl.busy[free] = { ag, until: this.time + minutes * M, waited: this.time - ag.queued, sheets };
      ag.state = 'queue'; ag.printing = true;
      this.stats.addNoise(ag.k, ag.c, ag.r, 1.5, 3);
    }
  }
  queueing(ag, dt) { /* standing at the plotters; servePlotters moves them on */ if (this.time - ag.queued > 60 * M && !ag.printing) { this.plotter.queue = this.plotter.queue.filter((x) => x !== ag); ag.state = 'doing'; ag.activity = 'plot_done'; ag.timer = 5; } }

  // ------------------------------------------------------------------ meeting, passing, noise
  availability(ag) { if (!ag.inside || ['crit', 'review', 'lecture', 'seminar'].includes(ag.activity)) return 0; if (ag.state === 'walking') return 0.5; if (ag.activity === 'desk_work') return ag.headphones ? this.P.social.availability.headphones_factor : 0.6; if (ag.activity === 'office') return 0.5; return 1; }
  encounters() {
    const P = this.P.social.encounter, radius = P.radius_m / this.w.levels[0].grid.tm, dtE = this.P.time.encounter_check_s;
    const byLevel = this.w.levels.map(() => []);
    const HARD = new Set(['lecture', 'seminar', 'review', 'crit', 'washroom', 'print3d', 'print']);
    for (const ag of this.agents) if (ag.inside && ag.state !== 'riding' && ag.state !== 'climbing' && ag.state !== 'offsite' && !HARD.has(ag.activity)) byLevel[ag.k].push(ag);
    const seen = new Set();
    for (let k = 0; k < byLevel.length; k++) {
      const list = byLevel[k];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        if (A.state === 'walking' || B.state === 'walking' || A.state === 'waiting' || B.state === 'waiting') continue;
        const bothWorking = A.atOwnDesk && B.atOwnDesk; // desk neighbours side by side: co-presence, not an encounter
        if (Math.abs(A.x - B.x) > radius || Math.abs(A.y - B.y) > radius) continue;
        if (Math.hypot(A.x - B.x, A.y - B.y) > radius) continue;
        if (this.w.roomAt(k, A.c, A.r) !== this.w.roomAt(k, B.c, B.r)) continue;
        const key = this.stats.key(A.a.id, B.a.id); seen.add(key);
        const clock = (this.pairClock.get(key) || 0) + dtE; this.pairClock.set(key, clock);
        if (clock < P.min_s) continue;
        if (bothWorking) { this.stats.copresence(A.a, B.a, dtE); if (this.rng.chance(0.004 * (A.a.sociability + B.a.sociability) / 2) && this.time - A.lastConvo > 20 * M && this.time - B.lastConvo > 20 * M) { const c = Math.round((A.x + B.x) / 2), r = Math.round((A.y + B.y) / 2); this.stats.encounter(A.a, B.a, k, c, r, this.time, P.min_s); this.conversation(A, B, k, c, r); } continue; }
        if (clock - dtE < P.min_s) {
          // a new encounter: two people stationary within 3 m, facing, for 15 s or more, not both at work
          const c = Math.round((A.x + B.x) / 2), r = Math.round((A.y + B.y) / 2);
          this.stats.encounter(A.a, B.a, k, c, r, this.time, P.min_s);
          const avail = this.availability(A) * this.availability(B);
          const tie = this.term.ties.get(key) || 0;
          const working = (A.activity === 'desk_work' && A.atOwnDesk) || (B.activity === 'desk_work' && B.atOwnDesk);
          const pConvo = clip(0.12 * avail * (working ? 0.3 : 1) * (0.5 + 0.5 * (A.a.sociability + B.a.sociability) / 2) * (0.6 + tie) * (A.a.role === 'instructor' || B.a.role === 'instructor' ? 0.6 : 1) * (A.activity === 'event' || B.activity === 'event' ? 2.5 : 1), 0, 0.9);
          if (this.rng.chance(pConvo) && this.time - A.lastConvo > 8 * M && this.time - B.lastConvo > 8 * M) this.conversation(A, B, k, c, r);
        } else { this.stats.copresence(A.a, B.a, dtE); }
      }
    }
    for (const key of this.pairClock.keys()) if (!seen.has(key)) this.pairClock.delete(key);
  }
  conversation(A, B, k, c, r) {
    const t = this.P.social.tie, key = this.stats.key(A.a.id, B.a.id);
    const inc = t.increment * Math.exp(t.w_E * (A.a.traits.E + B.a.traits.E) / 2 + t.w_A * (A.a.traits.A + B.a.traits.A) / 2);
    this.term.ties.set(key, clip((this.term.ties.get(key) || 0) + inc, 0, 1));
    A.lastConvo = B.lastConvo = this.time;
    const minutes = 1 + this.rng.gamma(2, 1.5);
    this.stats.interaction(A.a, B.a, minutes * M);
    for (const x of [A, B]) if (x.activity === 'desk_work' && x.wasFocus) { this.stats.focusEnd(x.a.id, this.time, true); x.wasFocus = false; x.boutEnd = Math.max(x.boutEnd, this.time + minutes * M + 5 * M); setTimeoutish(this, x, minutes); }
    this.stats.addNoise(k, c, r, 1.0 * minutes, 3);
    const between = A.a.year !== B.a.year && A.a.role === 'student' && B.a.role === 'student';
    const where = this.placeName(A);
    this.emit('conversation', { agents: [A.a.id, B.a.id], k, c, r, place: where, text: `${A.a.name} and ${B.a.name} talk ${minutes.toFixed(0)} min${between ? ' (between years)' : ''}`, between });
    const speaker = this.rng.chance(0.5) ? A : B, other = speaker === A ? B : A;
    if (between) this.remarkFor(speaker, 'encounter_between', { year: ['', 'first', 'second', 'third'][other.a.year] }, `between-year encounter, ${minutes.toFixed(0)} min, ${where} (C6)`);
    else if (speaker.activity !== 'desk_work') this.remarkFor(speaker, 'encounter', {}, `encounter ${minutes.toFixed(0)} min at ${where}`);
    for (const x of [A, B]) if (x.activity === 'desk_work' && x !== speaker && this.rng.chance(0.3)) this.remarkFor(x, 'interrupted', {}, `interrupted at the desk by a ${minutes.toFixed(0)} min conversation (F2)`);
    // a conversation within earshot of a working neighbour interrupts them too (D16)
    for (const n of this.agents) if (n !== A && n !== B && n.inside && n.k === k && n.activity === 'desk_work' && n.wasFocus && !n.headphones && Math.hypot(n.x - c, n.y - r) <= 2 && this.rng.chance(0.3)) { this.stats.focusEnd(n.a.id, this.time, true); n.wasFocus = false; this.stats.focusStart(n.a.id, this.time + 60); if (this.rng.chance(n.a.headphonesP * 0.3)) { n.headphones = true; this.remarkFor(n, 'headphones_on', { n: 1 }, 'a conversation within earshot (D16)'); } }
  }
  /** Walking past a desk whose owner is working: exposure (F4); past a board: a curiosity detour (F6). */
  passing(ag) {
    const k = ag.k, g = this.w.levels[k].grid;
    if (k !== this.w.studio.k) return;
    // one count per pass (not per tile stepped): the near ring counts 1, the next ring out `far`,
    // and a pass with a board or wall between the desk and the walker is screened (x `screened`),
    // so a board rolled to the aisle side reduces the exposure, it does not take it to zero (open item 25)
    const X = this.P.metrics.exposure_count || { radius: 2, far: 0.5, screened: 0.5, once_s: 60 };
    for (const d of this.w.studioDesks) {
      if (!d.owner || d.owner === ag.a.id || !d.stand) continue;
      const dc = ag.c - d.stand[0], dr = ag.r - d.stand[1], dist = Math.max(Math.abs(dc), Math.abs(dr));
      if (dist > X.radius) continue;
      const o = this.byId.get(d.owner); if (!o || !o.inside || o.activity !== 'desk_work') continue;
      let wgt = dist <= 1 ? 1 : X.far;
      if (dist >= 2) { const bc = d.stand[0] + Math.sign(dc), br = d.stand[1] + Math.sign(dr); if (g.inb(bc, br) && g.walk[g.idx(bc, br)] === WALK.NO) wgt *= X.screened; }
      if (!ag.passed) ag.passed = new Map();
      const last = ag.passed.get(d.owner);
      if (last && this.time - last.t < X.once_s) { if (wgt > last.w) { this.stats.passer(d.owner, k, ag.c, ag.r, wgt - last.w); last.w = wgt; } continue; }
      ag.passed.set(d.owner, { t: this.time, w: wgt });
      this.stats.passer(d.owner, k, ag.c, ag.r, wgt);
    }
    if (ag.activity !== 'desk_work' && this.rng.chance(this.P.social.curiosity.p_detour * ag.a.curiosity * 0.02)) { for (const p of this.w.pinups) if (Math.abs(p.stand[0] - ag.c) <= 2 && Math.abs(p.stand[1] - ag.r) <= 2) { ag.detour = true; break; } }
  }
  noise() {
    for (const ag of this.agents) if (ag.inside && ag.activity === 'crit') this.stats.addNoise(ag.k, ag.c, ag.r, 0.6, 3);
    for (const b of this.plotter.busy) if (b) this.stats.addNoise(b.ag.k, b.ag.c, b.ag.r, 0.8, 3);
    for (const ag of this.agents) if (ag.inside && ag.activity === 'event') this.stats.addNoise(ag.k, ag.c, ag.r, 0.15, 4);
  }
  noiseAt(ag) { const f = this.stats.fields[ag.k].noise, g = this.w.levels[ag.k].grid; let s = 0, n = 0; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const cc = ag.c + dc, rr = ag.r + dr; if (g.inb(cc, rr)) { s += f[g.idx(cc, rr)]; n++; } } return n ? s / n / Math.max(1, (this.time - secondsOf(this.P.time.run_from)) / H) : 0; }

  /** Counts for the RUN window. */
  summary() {
    const inside = this.agents.filter((x) => x.inside), sk = this.w.studio.k;
    return { time: hhmm(this.time), floor: inside.filter((x) => x.k === sk).length, building: inside.length, crit: inside.filter((x) => x.activity === 'crit' || x.activity === 'review').length, plot: this.plotter.queue.length + this.plotter.busy.filter(Boolean).length, lift: this.agents.filter((x) => x.state === 'waiting').length, done: this.done, progress: (this.time - secondsOf(this.P.time.run_from)) / (this.end - secondsOf(this.P.time.run_from)) };
  }
}
function setTimeoutish(run, ag, minutes) { ag.state = 'doing'; ag.activity = 'talk'; ag.timer = minutes * M; ag.pending = null; ag.resumeDesk = true; }
