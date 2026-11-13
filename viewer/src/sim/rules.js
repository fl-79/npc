// The suggestion rules: each tests a metric against its benchmark (or A against B), locates the
// place on the plan that contributes most, gathers the evidence (events and remarks at that place
// and time), and fills a template. The result carries the ids, so the trace in ANALYSE can point
// back at the feed and the plan. Rule-based wording; an LLM may phrase it later.
import { hhmm } from './calendar.js';

export function runRules(run, metrics, compare = null) {
  const w = run.w, stats = run.stats, out = [];
  const g = w.levels[w.studio.k].grid;
  const sites = [...stats.sites.values()];
  const hottest = (filter) => sites.filter(filter).sort((a, b) => b.n - a.n).slice(0, 3);
  const placeOf = (s) => { const n = w.roomAt(s.k, s.c, s.r); const rm = w.rooms.get(String(n)); return rm ? (rm.name || `room ${rm.number}`) : run.b.levels[s.k].name; };
  const evidence = (pred, max = 4) => run.bus.events.filter(pred).slice(0, max).map((e) => e.id);
  const remarks = (topics, max = 3) => run.bus.events.filter((e) => e.kind === 'remark' && topics.includes(e.topic)).slice(0, max).map((e) => e.id);
  const sit = run.situation?.kind && run.situation.kind !== 'none' ? `situation: ${run.situation.kind}` : `the day as the calendar has it, ${run.date}`;
  const push = (tag, metric, text, ev, rm, spots) => out.push({ tag, metric, text, situation: sit, events: ev, remarks: rm, spots, t: run.time });

  const m = metrics;
  if (m.C6.value != null && m.C6.benchmark != null && m.C6.value < m.C6.benchmark * 0.8) {
    const spots = hottest((s) => s.between > 0);
    const names = spots.map(placeOf).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'nowhere in particular';
    push('C6 LOW', `C6 = ${m.C6.value.toFixed(2)} against ${m.C6.benchmark}`, `The years barely meet: ${(m.C6.value * 100).toFixed(0)}% of conversations cross a year, where between-year contact happens at ${names}. A shared pin-up wall on the route between the first-year middle and the third-year south would put the cohorts on the same path; the kitchen and the plotters are the only shared magnets today.`, evidence((e) => e.kind === 'conversation' && e.between), remarks(['encounter_between']), spots);
  }
  if (m.C1.benchmark != null && m.C1.value < m.C1.benchmark * 0.8) {
    push('C1 LOW', `C1 = ${m.C1.value.toFixed(0)} m against ${m.C1.benchmark} m`, `Desk-to-amenity routes share ${m.C1.value.toFixed(0)} m per pair, under the 30 m where Kabo saw a +20% effect. The plotters and the kitchen sit at the ends of the floor; a shared amenity in the middle of the central aisle would lengthen the overlap for every pair.`, evidence((e) => e.kind === 'plot_queue'), remarks(['plot_queue', 'kitchen_crowded']), hottest((s) => true));
  }
  if (m.F2.benchmark != null && m.F2.value > m.F2.benchmark * 1.3) {
    const top = [...stats.exposure.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => run.pop.agents[id - 1]).filter(Boolean);
    const spots = top.filter((a) => a.desk).map((a) => ({ k: a.desk.k, c: a.desk.stand[0], r: a.desk.stand[1], n: stats.exposure.get(a.id) }));
    push('F2 HIGH', `F2 = ${m.F2.value.toFixed(1)} per focus-hour against ${m.F2.benchmark}`, `Interruptions run at ${m.F2.value.toFixed(1)} per focus hour. The three most exposed desks sit on the central aisle; turning the bay-end boards to face the aisle, or moving the most-walked route one bay over, cuts the passers-by.`, evidence((e) => e.kind === 'conversation'), remarks(['interrupted', 'headphones_on']), spots);
  }
  if (m.F1.value != null && m.F1.benchmark != null && m.F1.value < m.F1.benchmark * 0.8 && m.F1.value > 0) {
    push('F1 SHORT', `F1 = ${m.F1.value.toFixed(0)} min against ${m.F1.benchmark} (Mark 2005; the undisturbed bout is ${m.F1.upper || 52})`, `Focus blocks last ${m.F1.value.toFixed(0)} min at the median, under the 11 min Mark, González and Harris measured between switches in offices; only ${((m.F1.deepShare || 0) * 100).toFixed(0)}% of blocks reach 25 min. Half of the cuts are conversations started by someone passing; a quiet half-day rule in review weeks, or headphones as the norm after 14:00, would lengthen the blocks.`, evidence((e) => e.kind === 'conversation'), remarks(['interrupted', 'break']), []);
  }
  if (m.F8.n > 0 && m.F8.benchmark != null && m.F8.value > m.F8.benchmark) {
    const outages = run.bus.events.filter((e) => e.kind === 'paper_out').length;
    push('F8 QUEUE', `F8 = ${m.F8.value.toFixed(0)} min mean wait against ${m.F8.benchmark} (${m.F8.n} jobs${outages ? ', ' + outages + ' gave up on paper' : ''})`, `The plotter queue ran ${m.F8.value.toFixed(0)} minutes on average${outages ? ' and paper ran out outside staffed hours' : ''}. Paper at all hours (the policy switch) removes the outage; a third plotter only pays back on review days.`, evidence((e) => e.kind === 'plot_queue' || e.kind === 'paper_out'), remarks(['plot_queue', 'paper_out', 'plot_done']), [{ k: w.plotters[0].k, c: w.plotters[0].stand[0], r: w.plotters[0].stand[1], n: m.F8.n }]);
  }
  const wc = run.bus.events.filter((e) => e.kind === 'remark' && e.topic === 'washroom_trip').length;
  if (wc > 10) push('WC TRIPS', `${wc} washroom trips off the floor`, `The studio floor has no washroom: every trip is a flight of stairs or a lift ride. Over a day that is ${wc} remarked trips and the minutes they cost. A washroom on the floor would also take the lift's peak off.`, evidence((e) => e.kind === 'remark' && e.topic === 'washroom_trip'), remarks(['washroom_trip', 'lift_wait']), []);
  // what the agents did about it themselves during the run (the layout manager, 'agents' and 'free'): the move joins the suggestion it anticipated
  const moves = run.layout?.moves || [];
  for (const sgg of out) for (const mv of moves) if (mv.tag === sgg.tag) { sgg.text += ` The agents tried this live at ${hhmm(mv.t)}: ${mv.what}; ${mv.effect || 'effect not measured'}.`; if (mv.eventId) sgg.events.unshift(mv.eventId); sgg.spots.unshift({ k: mv.k, c: mv.to.c0, r: mv.to.r0, n: 1 }); }
  // the moves as design suggestions in their own right (owner 2026-11-12, item 27): what the agents did to the space is a
  // proposal for a permanent version of it, one suggestion per kind of move that stood at the end of the day
  const byTrigger = new Map(); for (const mv of moves) { if (!byTrigger.has(mv.trigger)) byTrigger.set(mv.trigger, []); byTrigger.get(mv.trigger).push(mv); }
  const DESIGN = {
    exposure: (ms) => [`${ms.length} board${ms.length > 1 ? 's' : ''} as screens`, `${ms.length > 1 ? `${ms.length} boards ended the day` : 'A board ended the day'} on the aisle side of ${ms.length > 1 ? `${ms.length} exposed desks` : 'an exposed desk'} (passers ${ms.map((mv) => (mv.effect || '').replace('passers at that desk ', '')).filter(Boolean).join('; ')}). The agents are asking for a partition: bay-end boards fixed to face the aisle, or a low screen along the aisle side of the exposed bays, so the pin-up boards can go back to pinning up.`],
    kitchen: (ms) => ['a counter outside the kitchen', `A side table stood outside the kitchen door from ${hhmm(ms[0].t)} as an overflow counter (${ms[0].signal}). The agents are asking for counter space: a fixed counter or shelf in the lounge beside the kitchen door, or a second counter inside a kitchen sized for two.`],
    queue: (ms) => ['a layout table at the plotters', `A side table stood at the plotter corner from ${hhmm(ms[0].t)}; ${ms[0].effect || 'effect not measured'}. The agents are asking for a layout surface at the plotters: a fixed table beside them, which also keeps the queue off the aisle.`],
    between: (ms) => ['a shared wall between the years', `A board stood at the boundary between the years from ${hhmm(ms[0].t)} (${ms[0].signal}). The agents are asking for a shared wall there: a fixed pin-up surface on the route both cohorts use.`],
  };
  for (const [trigger, ms] of byTrigger) {
    const d = DESIGN[trigger] ? DESIGN[trigger](ms) : [`${ms.length} move${ms.length > 1 ? 's' : ''}`, ms.map((mv) => `At ${hhmm(mv.t)} ${mv.what} (${mv.signal}); ${mv.effect || 'effect not measured'}.`).join(' ')];
    push('MOVES', d[0], d[1], ms.map((mv) => mv.eventId).filter(Boolean), remarks(['desk_move', 'move_veto']), ms.map((mv) => ({ k: mv.k, c: mv.to.c0, r: mv.to.r0, n: 1 })));
  }
  const vetoes = run.bus.events.filter((e) => e.kind === 'move_veto');
  if (vetoes.length && !moves.length) push('LAYOUT', `${vetoes.length} proposed move${vetoes.length > 1 ? 's' : ''} vetoed`, `The agents proposed to move ${vetoes.map((e) => e.text).join('; ')}. Nothing moved: under "agents rearrange" the desk owners affected can say no.`, vetoes.map((e) => e.id), remarks(['move_veto']), []);
  if (compare) {
    const dC4 = (m.C4.value - compare.C4.value), dF1 = (m.F1.value - compare.F1.value), aA = m.F8.abandoned || 0, aB = compare.F8.abandoned || 0;
    push('A vs B', `C4 ${dC4 >= 0 ? '+' : ''}${dC4.toFixed(0)} min; F1 ${dF1 >= 0 ? '+' : ''}${dF1.toFixed(0)} min`, `Against B: contact ${dC4 >= 0 ? 'rises' : 'falls'} by ${Math.abs(dC4).toFixed(0)} min per person-day and focus ${dF1 >= 0 ? 'gains' : 'loses'} ${Math.abs(dF1).toFixed(0)} min per block. ${dC4 * dF1 < 0 ? 'A trade on the Pareto front, not an improvement.' : 'Better on both.'}${aA !== aB ? ` Plot jobs abandoned for paper: ${aA} against ${aB} in B${aA < aB ? ', the prints B lost that A keeps; the mean wait (F8) does not show this, since in B the ones who gave up stopped waiting' : ''}.` : ''}`, [], [], []);
  }
  // the suggestion itself names no one (owner 2026-11-12); the trace does, through its events and remarks
  const noNames = (t) => t.replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+'s desk/g, 'an exposed desk').replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+ vetoes/g, 'a desk owner vetoes');
  for (const sg of out) sg.text = noNames(sg.text);
  return out;
}
