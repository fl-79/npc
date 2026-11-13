// The term as the engine reads it (program/calendar.json): what a date is (a studio day for which
// years, a review, the last desk crit, a deadline, an event, a closure, which project phase and
// which week), and helpers for clock times. Dates are ISO strings, times "HH:MM".
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (date) => DAYS[parse(date).getUTCDay()];
export function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
export function iso(d) { return d.toISOString().slice(0, 10); }
export function addDays(s, n) { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
export function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
export function hhmm(t) { return `${String(Math.floor(t / 3600) % 24).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}`; }
export function secondsOf(hm) { const [h, m] = hm.split(':').map(Number); return h * 3600 + m * 60; }
/** Seconds since midnight for a clock on the run's day; times before the run's start belong to the next morning (02:00 → 26:00). */
export function runSeconds(hm, from = '07:00') { const s = secondsOf(hm); return s < secondsOf(from) ? s + 86400 : s; }
const between = (s, a, b) => s >= a && s <= b;

export class Calendar {
  constructor(cal) { this.cal = cal; this.start = cal.term.classes_start; this.end = cal.term.exams_end; }
  /** Week number from the first week of classes (1-based). */
  week(date) { return Math.floor(daysBetween(this.start, date) / 7) + 1; }
  weeks() { return Math.ceil((daysBetween(this.start, this.cal.term.classes_end) + 1) / 7); }
  dates(from = this.start, to = this.cal.term.classes_end) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
  closed(date) { return this.cal.term.closures.some((c) => (c.date && c.date === date) || (c.from && between(date, c.from, c.to))); }
  inTerm(date) { return between(date, this.start, this.cal.term.classes_end); }
  /** The studio sessions on a date, one per year group that has one: [{ years, start, end }]. */
  sessions(date) { if (!this.inTerm(date) || this.closed(date)) return []; const dn = dayName(date); return this.cal.studio.sessions.filter((s) => s.days.includes(dn)); }
  sessionFor(date, year) { return this.sessions(date).find((s) => s.years.includes(year)) || null; }
  reviewOn(date) { return this.cal.reviews.find((r) => r.date === date) || null; }
  lastCritOn(date) { return this.cal.reviews.find((r) => r.last_desk_crit === date) || null; }
  /** The next review for a year on or after a date: { review, days }. */
  nextReview(date, year) { let best = null; for (const r of this.cal.reviews) { if (!r.years.includes(year) || r.date < date) continue; const d = daysBetween(date, r.date); if (!best || d < best.days) best = { review: r, days: d }; } return best; }
  /** Pin-ups: two before each review, one and two weeks earlier on that year's studio day [A, question 7]. */
  pinupOn(date, year) { for (const r of this.cal.reviews) { if (!r.years.includes(year)) continue; for (const w of [7, 14]) { const d = addDays(r.date, -w); const near = [d, addDays(d, -1), addDays(d, 1)].find((x) => this.sessionFor(x, year)); if (near === date) return r; } } return null; }
  deadlines(date) { return this.cal.other_courses.deadlines.filter((d) => d.date === date); }
  nextDeadline(date) { let best = null; for (const d of this.cal.other_courses.deadlines) { if (d.date < date) continue; const n = daysBetween(date, d.date); if (!best || n < best.days) best = { deadline: d, days: n }; } return best; }
  events(date) { const dn = dayName(date), out = []; for (const e of this.cal.events) { if (e.repeat === 'weekly' && e.day === dn && this.inTerm(date) && !this.closed(date)) out.push(e); if (e.date === date) out.push(e); } return out; }
  phase(date) { return this.cal.phases.find((p) => between(date, p.from, p.to)) || null; }
  weekend(date) { const dn = dayName(date); return dn === 'Sat' || dn === 'Sun'; }
  /** Everything about a date in one object. */
  info(date) {
    return { date, day: dayName(date), week: this.week(date), inTerm: this.inTerm(date), closed: this.closed(date), weekend: this.weekend(date), sessions: this.sessions(date), review: this.reviewOn(date), lastCrit: this.lastCritOn(date), deadlines: this.deadlines(date), events: this.events(date), phase: this.phase(date) };
  }
}
