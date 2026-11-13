// The term layer: every day of the horizon, cheaply, for every agent, carrying the slow state
// (presence hours, sleep debt, stress, progress, comfort, ties, spend) and producing the day's
// plan that the day run executes on the grid. Expected values, not ticks: a viewed day never
// changes the term. Models from the research notes: Temporal Motivation Theory for effort (E12),
// the hurdle all-nighter model and the sleep floor (E4, E5), the hazard departure (B3), comfort
// through familiarity (F1), tie decay (ST8), stress calibrated to H1. Random streams are keyed by
// seed, agent and date (rng.js).
import { Rng } from './rng.js';
import { secondsOf, runSeconds, dayName } from './calendar.js';

const exp = Math.exp, clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const H = 3600, M = 60;

export class TermLayer {
  constructor(world, pop, cal, P, scenario = {}) {
    this.w = world; this.pop = pop; this.cal = cal; this.P = P; this.sc = scenario;
    this.seed = scenario.seed ?? 2026;
    this.state = new Map();
    for (const a of pop.agents) this.state.set(a.id, this.initial(a));
    this.ties = scenario.ties || new Map();
    this.snapshots = [];
    this.layout = { moves: [], week: 0 };
    this.today = null;
    this.buildTimetable();
  }
  /** Rooms booked first come for the term (owner 2026-11-08, questions 8, 9, 19): the weekly lecture per year group in the
   *  smallest classroom that seats it (none fitting: another building), and each section's 1.5 h history seminar on a
   *  weekday that is not the year's studio day, in a slot clear of lunch, in a crit room (Level 3 first, room 30 included). */
  buildTimetable() {
    const P = this.P, w = this.w, rng = new Rng(this.seed, 'timetable');
    // Fisher-Yates with the keyed stream: a sort with a random comparator is not the same in every engine (2026-11-11)
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const sessions = this.cal.cal.studio.sessions;
    const sessionOf = (y) => sessions.find((x) => x.years.includes(y));
    const years = [...new Set(this.pop.agents.filter((a) => a.role === 'student').map((a) => a.year))].sort();
    // lectures
    this.lectureRoom = {}; const takenAt = new Map();
    for (const y of shuffle([...years])) {
      const sess = sessionOf(y); if (!sess) continue;
      const n = this.pop.agents.filter((a) => a.role === 'student' && a.year === y).length;
      const key = `${sess.days[0]}:${sess.start}`; const used = takenAt.get(key) || new Set();
      const room = w.classRooms.find((c) => c.chairs.length >= n && !used.has(c.room.number)) || null;
      if (room) { used.add(room.room.number); takenAt.set(key, used); }
      this.lectureRoom[y] = room ? room.room.number : null;
    }
    // seminars
    this.seminars = {}; const slotTaken = new Set();
    const slots = (P.studio.seminar.scheduling?.slots || ['09:00', '10:30', '13:00', '14:30', '15:30']).map(secondsOf);
    const rooms = w.critRooms.filter((c) => c.spots.length).sort((a, b) => Math.abs(a.room.k - w.studio.k) - Math.abs(b.room.k - w.studio.k));
    const groups = []; for (const a of this.pop.agents) if (a.role === 'student') { const k = `${a.year}:${a.section}`; if (!groups.includes(k)) groups.push(k); }
    for (const key of shuffle(groups)) {
      const y = Number(key.split(':')[0]), sess = sessionOf(y);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].filter((d) => !sess || !sess.days.includes(d)); shuffle(days);
      let placed = null;
      const pairs = []; for (const d of days) for (const t of slots) pairs.push([d, t]); shuffle(pairs);
      for (const [d, t] of pairs) { for (const r of rooms) { const k2 = `${d}:${t}:${r.room.number}`; if (slotTaken.has(k2)) continue; slotTaken.add(k2); placed = { day: d, start: t, room: r.room.number, level: r.room.level }; break; } if (placed) break; }
      this.seminars[key] = placed;
    }
  }
  instructorOf(a) { return this.pop.agents.find((b) => b.role === 'instructor' && b.year === a.year && b.section === a.section) || null; }
  initial(a) {
    const c = this.P.social.comfort, c0 = a.role === 'instructor' ? 0.9 : a.newcomer ? c.c0.newcomer : a.year === 1 ? c.c0.y1 : c.c0.returning;
    return { comfort: clip(c0 * exp(c.w_E * a.traits.E + c.w_N * a.traits.N), 0.05, 0.95), hours: 0, stress: clip(0.3 + 0.1 * a.traits.N, 0, 1), sleepDebt: 0, progress: 0, spend: 0, allNighters: 0, weekHours: 0, lastRecovery: null, ties: 0 };
  }
  rng(a, date, purpose) { return new Rng(this.seed, a.id, date, purpose); }
  tieKey(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }

  /** TMT urgency for an agent on a date: the sum over the deadlines in reach (E12). */
  urgency(a, date) {
    const t = this.P.effort.tmt;
    let u = 0;
    const r = this.cal.nextReview(date, a.year); if (r) u += t.expectancy * a.valueStudio / (1 + a.gamma * r.days);
    const pin = this.nextPinup(date, a.year); if (pin != null) u += t.expectancy * a.valueStudio * 0.5 / (1 + a.gamma * pin);
    const d = this.cal.nextDeadline(date); if (d) u += t.expectancy * 1.0 / (1 + a.gamma * d.days);
    return u;
  }
  nextPinup(date, year) { for (let k = 0; k < 21; k++) { const d = addDaysStr(date, k); if (this.cal.pinupOn(d, year)) return k; } return null; }
  /** Urgency against a far deadline (30 days): 1 in a quiet week, about 3 a week before a review, about 8 the day before. */
  urgencyNorm(a, date) { const t = this.P.effort.tmt; const far = t.expectancy * a.valueStudio / (1 + a.gamma * 30) + t.expectancy / (1 + a.gamma * 30); return this.urgency(a, date) / far; }
  /** The effort ramp from urgency (E2, E12): ×1 far out, about ×1.3 a week before a review, about ×1.6 the day before. */
  ramp(a, date) { return clip(0.9 + 0.3 * Math.log(Math.max(1, this.urgencyNorm(a, date))), 0.8, this.P.effort.tmt.ramp_cap); }

  /** Hours the agent means to be in the building on a date: H_base per weekday, scaled by urgency, weekend, recovery, job, lectures. */
  plannedHours(a, date, info, st, rng) {
    const P = this.P;
    if (a.role === 'instructor') { const s = this.cal.sessionFor(date, a.year); if (s) return 5.5; const od = P.population.instructors?.office_days || ['Mon', 'Wed']; return a.officeHere && od.includes(dayName(date)) ? 7 : 0; }
    const base = a.H_base / 5;
    const ramp = this.ramp(a, date);
    let h = base * ramp;
    if (info.weekend) { const rev = this.cal.nextReview(date, a.year); const near = rev && rev.days <= P.effort.weekend.near_days; const p = near ? P.effort.weekend.p_near_review : P.effort.weekend.p_base; if (!rng.chance(p * (0.6 + 0.4 * ramp))) return 0; h = base * (near ? 1.0 : 0.8) * ramp; }   // a weekend before a review is a full day (owner 2026-11-11, item 32)
    if (st.lastRecovery === 1) h *= P.effort.recovery.day1; else if (st.lastRecovery === 2) h *= P.effort.recovery.day2;
    // off-site work (E9): some days are home days when nothing on the floor is scheduled
    if (!info.weekend && !this.cal.sessionFor(date, a.year) && rng.chance(P.effort.off_site_share.value * (1.2 - 0.4 * Math.min(1, ramp - 0.8)))) return 0;
    return clip(h, 0, 16);
  }
  /** Job shifts (A11): evenings and weekend days by hours category [A]. */
  jobShift(a, date, rng) {
    if (a.job === 'none') return null;
    const dn = dayName(date), r = new Rng(this.seed, a.id, 'job');
    const days = a.job === '20+' ? ['Mon', 'Wed', 'Sat', 'Sun'] : a.job === '10-20' ? [r.pick(['Mon', 'Wed', 'Thu']), r.pick(['Sat', 'Sun'])] : [r.pick(['Sat', 'Sun'])];
    if (!days.includes(dn)) return null;
    return dn === 'Sat' || dn === 'Sun' ? { from: 10 * H, to: 16 * H } : { from: 17.5 * H, to: 22 * H };
  }
  /** Other courses (B5, D14; owner 2026-11-08, question 9): the section's seminar from the term timetable (a crit room, a weekday
   *  that is not a studio day, clear of lunch), and two lectures off site on the other free weekdays [A]. */
  otherCourses(a, date) {
    if (a.role !== 'student') return [];
    const dn = dayName(date), sem = this.seminars[`${a.year}:${a.section}`];
    const out = [];
    if (sem && dn === sem.day) out.push({ kind: 'seminar', from: sem.start, minutes: this.P.studio.seminar.seminar_min, room: sem.room });
    const sess = this.cal.cal.studio.sessions.find((x) => x.years.includes(a.year));
    const free = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].filter((d) => (!sess || !sess.days.includes(d)) && (!sem || d !== sem.day));
    const lec = [free[a.section % Math.max(1, free.length)], free[(a.section + 1) % Math.max(1, free.length)]];
    if (lec.includes(dn)) out.push({ kind: 'lecture_off', from: [9 * H, 14 * H][a.section % 2], minutes: this.P.studio.seminar.lecture_min + 2 * this.P.studio.seminar.walk_min[1] });
    return out;
  }

  /** An event stay (owner 2026-11-12, walkthrough stop 5): a share grab something and leave within minutes; the rest stay a good part of it. */
  static eventStay(id, t0, t1, pe, rng) {
    const g = pe[id === 'waffle_wednesday' ? 'waffle' : id === 'good_times' ? 'good_times' : 'halloween'] || {};
    const grab = rng.chance(g.grab_share ?? 0);
    const minutes = grab ? rng.between(...(g.grab_min || [10, 20])) : clip((t1 - t0) / M * rng.between(0.4, 1), 30, 180);
    return { t: t0 + rng.between(0, (g.arrive_within_min ?? 25) * M), kind: 'event', event: id, minutes, grab };   // people come at the start (owner 2026-11-12)
  }
  /** The plan for one agent on one date. */
  planFor(a, date, info) {
    const P = this.P, st = this.state.get(a.id), rng = this.rng(a, date, 'plan');
    const hours = this.plannedHours(a, date, info, st, rng);
    const session = this.cal.sessionFor(date, a.year);
    const plan = { id: a.id, present: hours > 0, hours, arrive: null, leave: null, items: [], session: !!session, crit: null, urgency: this.urgencyNorm(a, date) };
    if (!plan.present) return plan;
    // arrival by chronotype, earlier on a studio day and when keen (E3, C3) [A]
    const base = a.chronotype === 'morning' ? 9 * H : a.chronotype === 'evening' ? 12.5 * H : 10.5 * H;
    let arrive = base + rng.normal(0, 45 * M) - 20 * M * a.traits.C;
    if (a.role === 'instructor') arrive = session ? secondsOf(session.start) - 20 * M : 9 * H;
    if (session && a.role === 'student') arrive = Math.min(arrive, secondsOf(session.start) - 10 * M + rng.normal(0, 10 * M));
    if (info.weekend && a.role === 'student') arrive = Math.max(arrive + 90 * M, 10 * H + rng.between(0, 2 * H));   // weekends start late [A] (item 32)
    arrive = clip(arrive, 7 * H, 20 * H);
    let leave = arrive + hours * H;
    if (a.role === 'student') {
      // late nights (owner 2026-11-12, item 28): without a review coming up most people go home instead; a late worker stays
      // late every night in the week before a review, otherwise only now and then, and nobody else is planned past the cap
      const LN = P.effort.late_nights, revLN = this.cal.nextReview(date, a.year), nearLN = !!(revLN && revLN.days <= LN.near_days);
      if (a.lateWorker && (nearLN || rng.chance(LN.p_normal))) leave = Math.max(leave, 22.5 * H + rng.between(0, 2.5 * H));
      else if (!nearLN) leave = Math.min(leave, LN.cap_h * H + rng.between(0, LN.cap_spread_h * H));   // the rest of the planned hours are worked at home (E9)
      if (a.mode === 'transit' && a.offCampus && !a.lateWorker) leave = Math.min(leave, 24.5 * H);
      if (a.caregiving) leave = Math.min(leave, 17.5 * H);
      const shift = this.jobShift(a, date, rng); if (shift) { leave = Math.min(leave, shift.from - 20 * M); plan.job = shift; }
    } else leave = session ? secondsOf(session.end) + 30 * M : 17 * H;
    leave = clip(leave, arrive + 30 * M, 26 * H);
    plan.arrive = Math.round(arrive); plan.leave = Math.round(leave);
    // what the day holds
    const items = plan.items;
    for (const c of this.otherCourses(a, date)) if (c.from >= arrive - 30 * M && c.from < leave) items.push({ t: c.from, kind: c.kind, minutes: c.minutes });
    if (session) {
      const s0 = secondsOf(session.start), s1 = secondsOf(session.end);
      if (info.review && info.review.years.includes(a.year)) items.push({ t: s0, kind: 'review', minutes: (s1 - s0) / M, room: null });
      else if (this.cal.pinupOn(date, a.year)) items.push({ t: s0, kind: 'pinup', minutes: 90 });
      else {
        // the section's intro at the instructor's spot (APR24 'small group meetings'; owner 2026-11-11, question 23), then the session
        const intro = P.studio.sessions.intro_min || 0;
        if (intro) items.push({ t: s0, kind: 'intro', minutes: intro });
        items.push({ t: s0 + intro * M, kind: 'studio_session', minutes: (s1 - s0) / M - intro });
        if (a.role === 'student' && dayName(date) === session.days[0]) { const room = this.lectureRoom[a.year]; items.push(room ? { t: s0 + 15 * M, kind: 'lecture', minutes: P.studio.lecture.minutes, room } : { t: s0 + 15 * M, kind: 'lecture_off', minutes: P.studio.lecture.minutes + 2 * P.studio.seminar.walk_min[0] }); }
      }
    }
    // lunch (E10, question 4) [A]
    if (arrive < 12.5 * H && leave > 13.5 * H) { const r = rng.next(); items.push({ t: 12 * H + rng.between(0, 60 * M), kind: r < 0.6 ? 'lunch_in' : r < 0.85 ? 'lunch_out' : 'lunch_skip', minutes: r < 0.6 ? 35 : 50 }); }
    if (leave > 20 * H && rng.chance(0.5)) items.push({ t: 19 * H + rng.between(0, 60 * M), kind: 'dinner', minutes: 30 });
    // printing before a pin-up or review (D10): the day before and the morning of
    const rev = this.cal.nextReview(date, a.year), pin = this.nextPinup(date, a.year);
    // printing for a review: the organised print earlier (owner 2026-11-11, item 32): the print day is 1 + 2 x C days before
    // (C = 0 the day before, C = +1 three days before, at most six), with the plotter's Monday failure in mind; a missed day is
    // caught up on the next day in; a few reprint on the eve; pin-ups print the day before as before
    const earlyDays = P.resources.plotters.print_early_days_per_C ?? 2;
    const printDayFor = clip(Math.round(1 + earlyDays * Math.max(0, a.traits.C)), 1, 6);
    const reviewId = rev ? rev.review.id : null;
    const dueNow = rev && rev.days <= printDayFor && st.printedFor !== reviewId;
    const reprint = rev && rev.days === 1 && st.printedFor === reviewId && rng.chance(P.resources.plotters.reprint_eve_p ?? 0.3);
    const pinPrint = pin != null && pin <= 1;
    const printDay = !!(dueNow || reprint || pinPrint);
    if (a.role === 'student' && (dueNow || reprint || pinPrint) && rng.chance(dueNow || reprint ? 0.9 : 0.75)) {
      items.push({ t: clip(rng.between(arrive + 1 * H, leave - 1 * H), arrive, leave), kind: 'plot', sheets: rng.int(...P.resources.plotters.sheets_per_job), early: dueNow && rev.days > 1 });
    }
    else if (a.role === 'student' && rng.chance(0.12)) items.push({ t: clip(rng.between(arrive + 1 * H, leave - 1 * H), arrive, leave), kind: 'print_small' });
    // making: shop and 3D printing by making skill (E7)
    if (a.role === 'student' && rng.chance(0.08 + 0.2 * a.making * (printDay ? 1.5 : 1))) items.push({ t: clip(rng.between(arrive + 1 * H, leave - 2 * H), arrive, leave), kind: rng.chance(0.5) ? 'print3d' : 'shop', minutes: rng.between(40, 90) });
    // events (F9)
    for (const e of info.events) {
      const pe = P.social.events, p = e.id === 'good_times' ? pe.good_times.p * a.sociability * clip(1 + pe.good_times.w_urgency * 0.25 * Math.log(Math.max(1, plan.urgency)), 0.2, 1.2) : e.id === 'waffle_wednesday' ? pe.waffle.p * a.sociability : pe.halloween.p * a.sociability;
      if (a.role === 'student' && rng.chance(clip(p, 0, 0.95))) { const t0 = runSeconds(e.start), t1 = runSeconds(e.end); const it = TermLayer.eventStay(e.id, t0, t1, pe, rng); items.push(it); plan.leave = Math.max(plan.leave, Math.min(it.t + it.minutes * M + 10 * M, 26 * H)); if (plan.arrive > t0) plan.arrive = t0 - 10 * M; }
    }
    // office hours for instructors on non-studio days; a student's visit depends on the student (owner 2026-11-08, question 10)
    if (a.role === 'instructor' && !session) items.push({ t: arrive, kind: 'office', minutes: (leave - arrive) / M });
    if (a.role === 'student' && !info.weekend) {
      const inst = this.instructorOf(a), oh = P.studio.office_hours;
      if (inst && inst.officeHere && oh && this.plannedHours(inst, date, info, this.state.get(inst.id), rng) > 0 && !this.cal.sessionFor(date, inst.year)) {
        const days = (P.population.instructors?.office_days || ['Mon', 'Wed']).length;
        if (rng.chance(a.officeVisitP / Math.max(1, days))) { const [h0, h1] = (oh.hours || ['10:00', '16:00']).map(secondsOf); const t = clip(rng.between(h0, h1), arrive, Math.max(arrive, leave - 30 * M)); items.push({ t, kind: 'office_visit', minutes: oh.minutes || 15, instructor: inst.id }); }
      }
    }
    items.sort((p, q) => p.t - q.t);
    return plan;
  }

  /** The crit order of a session: first come first served by arrival (C3, question 5). */
  critOrder(plans, date, year, section) {
    const who = this.pop.agents.filter((a) => a.role === 'student' && a.year === year && a.section === section && plans.get(a.id)?.present && plans.get(a.id).session);
    return who.sort((a, b) => plans.get(a.id).arrive - plans.get(b.id).arrive);
  }
  /** All plans for a date, with crit slots assigned per section (C1, C2). */
  plansFor(date) {
    const info = this.cal.info(date), plans = new Map();
    for (const a of this.pop.agents) plans.set(a.id, this.planFor(a, date, info));
    for (const a of this.pop.agents) {
      if (a.role !== 'instructor' || !this.cal.sessionFor(date, a.year)) continue;
      const order = this.critOrder(plans, date, a.year, a.section);
      const s = this.cal.sessionFor(date, a.year); let t = secondsOf(s.start) + (plans.get(a.id).items.some((i) => i.kind === 'lecture') ? 15 * M + this.P.studio.lecture.minutes * M : 10 * M);
      const rng = this.rng(a, date, 'crits'), c = this.P.studio.crit.length_min;
      for (const st of order) { const minutes = c.shift + rng.lognormal(c.median, c.sigma); const atDesk = (a.critMode || 'desk') === 'desk'; plans.get(st.id).crit = { t: Math.round(t), minutes, instructor: a.id, atDesk }; t += minutes * M; }
      plans.get(a.id).critRun = order.map((s2) => s2.id);
    }
    return { info, plans };
  }

  /** Run the term layer over a range of dates, updating the slow state day by day; returns the weekly snapshots. */
  run(from, to, onDay) { const g = this.runSteps(from, to, onDay); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
  /** The same walk, yielding { i, n, date } after each day so a caller can show progress (the loading bar, 2026-11-13); returns the snapshots. */
  *runSteps(from, to, onDay) {
    this.snapshots = [];
    let week = -1;
    const dates = this.cal.dates(from, to);
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const { info, plans } = this.plansFor(date);
      if (date !== to) this.advance(date, info, plans);   // the last day is planned, not advanced: the day run starts from that morning's state (2026-11-11)
      if (onDay) onDay(date, info, plans);
      const wk = this.cal.week(date);
      if (wk !== week || date === to) { if (week >= 0) this.snapshots.push(this.snapshot(date, week)); week = wk; }
      yield { i: i + 1, n: dates.length, date };
    }
    this.snapshots.push(this.snapshot(to, this.cal.week(to)));
    return this.snapshots;
  }
  /** The expected-value update of the slow state after a day. */
  advance(date, info, plans) {
    const P = this.P;
    for (const a of this.pop.agents) {
      const st = this.state.get(a.id), pl = plans.get(a.id), rng = this.rng(a, date, 'state');
      const hours = pl.present ? pl.hours : 0;
      st.hours += hours; st.weekHours += hours;
      // comfort through familiarity (F1)
      const c = P.social.comfort; st.comfort = 1 - (1 - st.comfort) * exp(-hours / (c.tau_h * exp(-c.w_E * a.traits.E - c.w_N * a.traits.N)));
      // sleep: the hurdle model on the nights before a review (E4), shortened sleep with urgency otherwise (E5)
      const rev = this.cal.nextReview(date, a.year), u = pl.urgency, lu = clip(Math.log(Math.max(1, u)) / 2, 0, 1);
      let sleep = a.sleepNeed - P.sleep.delta_urgency_h.value * lu + rng.normal(0, 0.4);
      if (a.role === 'student' && rev && rev.days === 1 && !pl.job) { const pe = rev.review.id.startsWith('final') ? P.sleep.hurdle.p_event.final : P.sleep.hurdle.p_event.midterm; const gap = clip(0.6 - st.progress, -1, 1); const logit = Math.log(pe / (1 - pe)) + Math.log(a.allNighterOR) + P.sleep.hurdle.beta_gap * gap; if (rng.chance(1 / (1 + exp(-logit)))) { sleep = 0; st.allNighters++; } }
      sleep = Math.max(sleep === 0 ? 0 : a.sleepFloor, sleep);
      st.sleepDebt = clip(0.75 * st.sleepDebt + (a.sleepNeed - sleep), 0, 16);
      if (info.review && info.review.years.includes(a.year)) st.lastRecovery = 1; else if (st.lastRecovery === 1) st.lastRecovery = 2; else st.lastRecovery = null;
      // progress toward the next review: hours done against hours needed
      const need = 36 * 7 / 5; st.progress = clip(st.progress + hours / (need * 3) + 0.01, 0, 1);
      if (info.review && info.review.years.includes(a.year)) st.progress = 0.1;
      // stress (H1): rises with urgency, sleep debt and crits; decays
      // stress relaxes toward a personal baseline (N); the rise before a review comes from the days to that review (zero
      // beyond review_window_days, full on the day), scaled by N; the other courses' deadlines push a little through the
      // urgency sum; sleep debt and a bad crit add. Calibrated to H1 (about 20% high in a normal week, about 40% the week
      // before a review) on 2026-11-11 (owner, item 33: "it may depend on their personality in a normal week").
      const sg = P.wellbeing.stress, base = clip((sg.base ?? 0.35) + (sg.base_w_N ?? 0.15) * a.traits.N, 0.05, 0.85);
      const near = rev ? clip(1 - rev.days / (sg.review_window_days ?? 14), 0, 1) : 0;
      st.stress = clip(base + (st.stress - base) * (1 - sg.decay_per_day) + (sg.drift_per_day ?? 0) + a.stressGain * ((sg.urgency_w ?? 0.002) * clip(Math.log(Math.max(1, u)), 0, 2.5) + (sg.review_w ?? 0.05) * near) + (sg.sleep_w ?? 0.001) * st.sleepDebt + (pl.crit && rng.chance(sg.crit_bad_p ?? 0.2) ? sg.crit_bad_loss : 0), 0, 1);
      // ties: decay a little each day (ST8); the day run adds the increments, the term layer the expected contact of a shared section
      if (pl.present && a.role === 'student') { const r = P.social.exchange_rate_per_day.r0 * a.sociability * st.comfort; const mates = this.pop.agents.filter((b) => b.role === 'student' && b.year === a.year && b.section === a.section && b.id !== a.id && plans.get(b.id).present); for (let k = 0; k < Math.min(mates.length, Math.round(r)); k++) { const b = rng.pick(mates); const key = this.tieKey(a.id, b.id); this.ties.set(key, clip((this.ties.get(key) || 0) + P.social.tie.increment * exp(P.social.tie.w_E * a.traits.E + P.social.tie.w_A * a.traits.A) * 0.15, 0, 1)); } }
      // spend (G): printing and materials around reviews
      if (pl.items.some((i) => i.kind === 'plot')) st.spend += P.costs.sheet_cost.value * 4 * (1 + P.costs.reprint_share.value);
      if (pl.items.some((i) => i.kind === 'plot' && i.early) && rev) st.printedFor = rev.review.id;   // printed for this review (item 32)
      if (pl.items.some((i) => i.kind === 'shop')) st.spend += 25 * (0.5 + a.making);
    }
    // mentor pairs meet about weekly, TAs see their section in class (F5): expected growth between years
    const dn = dayName(date);
    for (const a of this.pop.agents) {
      if (a.mentor && dn === 'Fri' && plans.get(a.id).present) { const k = this.tieKey(a.id, a.mentor); this.ties.set(k, clip((this.ties.get(k) || 0) + 0.04, 0, 1)); }
      if (a.ta && this.cal.sessionFor(date, a.ta.year) && plans.get(a.id).present) for (const b of this.pop.agents) if (b.role === 'student' && b.year === a.ta.year && b.section === a.ta.section) { const k = this.tieKey(a.id, b.id); this.ties.set(k, clip((this.ties.get(k) || 0) + 0.01, 0, 1)); }
    }
    for (const [k, v] of this.ties) this.ties.set(k, Math.max(0, v - P.social.tie.decay_per_day));
    if (dayName(date) === 'Sun') for (const st of this.state.values()) st.weekHours = 0;
  }
  snapshot(date, week) {
    const students = this.pop.agents.filter((a) => a.role === 'student');
    const S = students.map((a) => this.state.get(a.id));
    const mean = (f) => S.reduce((s, x) => s + f(x), 0) / S.length;
    const hoursNow = mean((s) => s.hours), hoursWeek = hoursNow - (this.lastHours || 0); this.lastHours = hoursNow;
    let strong = 0, between = 0, total = 0;
    for (const [k, v] of this.ties) { if (v <= 0) continue; total++; if (v >= this.P.social.tie.strong) strong++; const [a, b] = k.split(':').map(Number); const A = this.pop.agents[a - 1], B = this.pop.agents[b - 1]; if (A && B && A.year !== B.year) between++; }
    return { date, week, hoursPerPerson: hoursWeek, highStressShare: S.filter((s) => s.stress > this.P.wellbeing.stress.high).length / S.length, meanComfort: mean((s) => s.comfort), meanSleepDebt: mean((s) => s.sleepDebt), allNighters: S.reduce((s, x) => s + x.allNighters, 0), ties: total, strongTies: strong, betweenYearTies: between, spend: mean((s) => s.spend), layoutMoves: this.layout.moves.length };
  }
}
function addDaysStr(s, n) { const [y, m, d] = s.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n)); return dt.toISOString().slice(0, 10); }
