// The people: 165 students in years and sections and 11 instructors, built from program/cohort.json
// and program/parameters.json. Traits only, no personas (owner, 2026-11-07): a Big Five draw in
// general-population SD units with the field and sex shifts, circumstances from the site data, and
// four sampled variables (background, chronotype, keenness, making skill). Every behavioural
// parameter is a log-linear mapping of those (agent-variables.md, "Traits-only mappings"). The
// same seed gives the same people.
import { Rng, mvnFactory } from './rng.js';

const FIRST = { women: ['Mina', 'Priya', 'Ana', 'Yuki', 'Noor', 'Chloe', 'Sana', 'Lena', 'Ava', 'Ines', 'Maya', 'Tara', 'Zoe', 'Hana', 'Rosa', 'Jade', 'Leila', 'Emma', 'Aisha', 'Nina', 'Mei', 'Sara', 'Elif', 'Kira', 'Ruth', 'Dina', 'Lucy', 'Amara', 'Iris', 'Vera'], men: ['Teo', 'Jonah', 'Sol', 'Omar', 'Kai', 'Luca', 'Ravi', 'Noah', 'Ben', 'Idris', 'Theo', 'Amir', 'Eli', 'Marco', 'Jun', 'Felix', 'Sam', 'Arjun', 'Max', 'Owen', 'Ilya', 'Zane', 'Tom', 'Nico', 'Rafael', 'Karim', 'Dev', 'Hugo', 'Ezra', 'Yusuf'], nonbinary: ['Ash', 'Rowan', 'Sage', 'Quinn'] };
const SURN = ['Lee', 'Chen', 'Singh', 'Garcia', 'Okafor', 'Nguyen', 'Kim', 'Haddad', 'Rossi', 'Novak', 'Tanaka', 'Ali', 'Moreau', 'Silva', 'Park', 'Shah', 'Baker', 'Ivanova', 'Dube', 'Wong', 'Ahmed', 'Fischer', 'Reyes', 'Osei', 'Brown', 'Costa', 'Yilmaz', 'Nair', 'Meyer', 'Zhang'];

const exp = Math.exp;
const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function buildPopulation(cohort, P, seed, extra = {}) {
  const rng = new Rng(seed, 'population');
  const tp = P.population.traits;
  const corr = [[1, 0, tp.corr.E_O, 0, 0], [0, 1, 0, tp.corr.C_A, tp.corr.N_C], [tp.corr.E_O, 0, 1, 0, tp.corr.N_E], [0, tp.corr.C_A, 0, 1, tp.corr.N_A], [0, tp.corr.N_C, tp.corr.N_E, tp.corr.N_A, 1]]; // O C E A N
  const mvn = mvnFactory(corr);
  const agents = [];
  let id = 1;
  const used = new Set();
  const nameFor = (sex) => { for (let k = 0; k < 50; k++) { const n = `${rng.pick(FIRST[sex])} ${rng.pick(SURN)}`; if (!used.has(n)) { used.add(n); return n; } } return `Person ${id}`; };

  function person(role, year, section) {
    const sex = rng.category({ women: P.population.sex.women, men: P.population.sex.men, nonbinary: P.population.sex.nonbinary });
    let [O, C, E, A, N] = mvn(rng);
    if (role === 'student') { O += tp.field_shift.O; C += tp.field_shift.C; }
    if (sex === 'women') { N += tp.sex_shift_women.N; A += tp.sex_shift_women.A; E += tp.sex_shift_women.E; }
    const keen = P.population.keenness_corr_O.value * O + Math.sqrt(1 - P.population.keenness_corr_O.value ** 2) * rng.normal();
    const background = rng.category({ little: P.population.background.little, design: P.population.background.design, advanced: P.population.background.advanced });
    const making = clip(0.5 + (background === 'advanced' ? 0.2 : background === 'little' ? -0.2 : 0) + 0.15 * rng.normal(), 0.05, 0.95);
    const ch = P.population.chronotype;
    const pEvening = clip(ch.evening * exp(ch.shift_E * E + ch.shift_C * C), 0.02, 0.8);
    const chronotype = rng.chance(pEvening) ? 'evening' : rng.chance(ch.morning / (1 - pEvening)) ? 'morning' : 'intermediate';
    const job = role === 'student' ? rng.category(P.population.job_hours.shares) : 'none';
    const offCampus = rng.chance(P.population.commute.off_campus);
    const commuteMin = offCampus ? Math.round(rng.between(...P.population.commute.minutes)) : 10;
    const mode = offCampus ? rng.category(P.population.commute.modes) : 'walk_bike';
    const caregiving = rng.chance(P.population.caregiving.share);
    const international = rng.chance(P.population.international.share);
    // the mappings
    const h = P.effort.H_base;
    const H_base = role === 'student' ? clip(h.base_h * exp(h.w_C * C + h.w_keen * keen) * h.job_factor[job] * (caregiving ? h.caregiving_factor : 1) * (commuteMin > 45 ? h.long_commute_factor : 1), ...h.clip) : 35;
    const im = P.effort.impulsiveness;
    const gamma = im.base * exp(im.w_C * C + im.w_N * N);
    const vs = P.effort.value_studio_vs_other;
    const valueStudio = vs.base * exp(vs.w_keen * keen);
    const hu = P.sleep.hurdle.or;
    const allNighterOR = exp(hu.w_C * C + hu.w_N * N + hu.w_keen * keen);
    const sleepNeed = rng.normal(P.sleep.need_h.mean, P.sleep.need_h.sd);
    const sleepFloor = rng.between(...P.sleep.floor_h.range) * exp(-0.1 * keen);
    const av = P.social.availability;
    const headphonesP = clip(av.headphones_p * exp(av.headphones_w_E * E + av.headphones_w_N * N), 0.05, 0.95);
    const sociability = exp(P.social.exchange_rate_per_day.w_E * E + P.social.exchange_rate_per_day.w_A * A);
    const curiosity = exp(P.social.curiosity.w_O * O);
    const threat = exp(P.social.help.w_N * N + P.social.help.w_E * E);
    const stressGain = exp(P.wellbeing.stress.gain_w_N * N);
    const spend = P.costs.term_spend.median * exp(0.3 * making) * exp(0.4 * rng.normal());
    // office-hour visits depend on the student (owner 2026-11-08, question 10): keen, calm and conscientious students go more
    const oh = P.studio.office_hours || { p_visit_per_week: 0.15, w_keen: 0.4, w_N: -0.3, w_C: 0.2 };
    const officeVisitP = clip(oh.p_visit_per_week * exp(oh.w_keen * keen + oh.w_N * N + oh.w_C * C), 0.01, 0.8);
    const a = {
      id: id++, role, year, section, sex, name: nameFor(sex), international, job, commuteMin, mode, offCampus, caregiving, background,
      traits: { O, C, E, A, N }, chronotype, keenness: keen, making,
      H_base, gamma, valueStudio, allNighterOR, sleepNeed, sleepFloor, headphonesP, sociability, curiosity, threat, stressGain, spend, officeVisitP,
      lateWorker: chronotype === 'evening', newcomer: false, ta: false, mentorOf: null, mentor: null,
      mobilityNeed: new Rng(seed, 'mobility', id).chance(P.population.mobility_need_share ?? 0),   // own stream (owner 2026-11-12, stop 8): the lift for one floor is for a mobility need, tiredness or a load
      desk: null, office: null, style: null,
    };
    return a;
  }
  // students by year and section
  for (const y of cohort.years) {
    const per = Math.ceil(y.students / y.sections);
    for (let s = 1; s <= y.sections; s++) for (let i = 0; i < per && agents.filter((a) => a.year === y.year && a.role === 'student').length < y.students; i++) agents.push(person('student', y.year, s));
  }
  // advanced-standing newcomers in year 2 (A3): low starting comfort, no ties
  const y2 = agents.filter((a) => a.year === 2);
  for (let i = 0; i < Math.min(P.population.advanced_standing_y2.count, y2.length); i++) y2[i].newcomer = true;
  // TAs: upper years helping lower years (A6): two per year-1 section from year 3, one per year-2 section
  const y3 = agents.filter((a) => a.year === 3);
  const y1sections = cohort.years.find((y) => y.year === 1).sections, y2sections = cohort.years.find((y) => y.year === 2).sections;
  let ti = 0;
  for (let s = 1; s <= y1sections; s++) for (let k = 0; k < 2 && ti < y3.length; k++) { y3[ti].ta = { year: 1, section: s }; ti++; }
  for (let s = 1; s <= y2sections; s++) if (ti < y3.length) { y3[ti].ta = { year: 2, section: s }; ti++; }
  // mentors (F5): half of year 1 gets a year-3 mentor, tie 0.3 to start
  const y1 = agents.filter((a) => a.year === 1), mentors = y3.filter((a) => !a.ta);
  for (const m of y1) if (rng.chance(P.population.mentor_share_y1.value) && mentors.length) { const t = rng.pick(mentors); m.mentor = t.id; t.mentorOf = (t.mentorOf || []).concat(m.id); }
  // instructors: one per section, a style each (C12); sessional or permanent, an office in the building or not, a crit mode (owner 2026-11-08, questions 2 and 6)
  const styles = P.studio.instructor_style.mix, inst = P.population.instructors || { sessional_share: 0.5, office_in_building_share: 0.5, crit_mode: { desk: 0.5, spot: 0.5 } };
  for (const y of cohort.years) for (let s = 1; s <= y.sections; s++) {
    const a = person('instructor', y.year, s); a.style = rng.category(styles); a.name = `Prof. ${rng.pick(SURN)}`; a.H_base = 40;
    a.sessional = rng.chance(inst.sessional_share); a.officeHere = !a.sessional && rng.chance(inst.office_in_building_share);
    a.critMode = rng.category(inst.crit_mode);
    agents.push(a);
  }
  const byYear = {}; for (const a of agents) byYear[a.role === 'student' ? a.year : 'staff'] = (byYear[a.role === 'student' ? a.year : 'staff'] || 0) + 1;
  return { agents, byYear, seed };
}

/** Ties: a map "id:id" (lower id first) → strength 0..1; mentors start at 0.3, sections at 0.1 [A]. */
export function initialTies(agents, P) {
  const ties = new Map();
  const key = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const students = agents.filter((a) => a.role === 'student');
  for (const a of students) for (const b of students) if (a.id < b.id && a.year === b.year && a.section === b.section) ties.set(key(a.id, b.id), a.newcomer || b.newcomer ? 0.02 : 0.1);
  for (const a of students) if (a.mentor) ties.set(key(a.id, a.mentor), 0.3);
  return { ties, key };
}
