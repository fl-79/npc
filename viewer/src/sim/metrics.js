// The core metrics (research/summary-metrics.md §5) as reductions of the aggregators, each against
// its benchmark from program/parameters.json. Nothing here reads a tick.
export function pathOverlap(world, stats, agents) {
  // Kabo: the length of walked path two agents share, desk to the amenities both use (plotters, kitchen, lounge, washroom)
  const routes = new Map();
  const targets = { plotters: world.plotters[0], kitchen: world.kitchenSpots[0], lounge: world.loungeSpots[0] || null };
  const students = agents.filter((a) => a.role === 'student' && a.desk);
  const g = world.levels[world.studio.k].grid;
  for (const a of students) { const r = {}; for (const [name, piece] of Object.entries(targets)) { if (!piece || !piece.stand) continue; const p = world.path(piece.k, a.desk.stand, piece.stand); if (p) r[name] = new Set(p.map(([c, rr]) => g.idx(c, rr))); } routes.set(a.id, r); }
  let sum = 0, n = 0;
  for (let i = 0; i < students.length; i++) for (let j = i + 1; j < students.length; j++) {
    const A = routes.get(students[i].id), B = routes.get(students[j].id); let shared = 0;
    for (const name of Object.keys(targets)) { const sa = A[name], sb = B[name]; if (!sa || !sb) continue; for (const t of sa) if (sb.has(t)) shared++; }
    sum += shared * g.tm; n++;
  }
  return n ? sum / n : 0;
}

export function computeMetrics(world, stats, agents, P, hoursRun) {
  const students = agents.filter((a) => a.role === 'student');
  const present = students.filter((a) => (stats.presence.get(a.id) || 0) > 0);
  const persons = Math.max(1, present.length);
  let f2f = 0, enc = 0, inter = 0, between = 0, newTies = 0;
  for (const p of stats.pairs.values()) { f2f += p.f2f; enc += p.enc; inter += p.inter; if (p.between && p.inter) between += p.inter; if (p.inter >= 2) newTies++; }
  const blocks = [], interruptions = []; let focusHours = 0;
  for (const a of present) { const f = stats.focus.get(a.id); if (!f) continue; blocks.push(...f.blocks); focusHours += f.focusSeconds / 3600; interruptions.push(f.interruptions); }
  blocks.sort((a, b) => a - b);
  const median = (arr) => arr.length ? arr[Math.floor(arr.length / 2)] : 0;
  const totalInterruptions = interruptions.reduce((s, x) => s + x, 0);
  const expo = []; for (const a of present) if (a.desk) expo.push((stats.exposure.get(a.id) || 0) / Math.max(0.5, (stats.deskSeconds.get(a.id) || 0) / 3600));
  const waits = stats.queues.plotters || [];
  const whereTotal = Math.max(1, stats.where.route + stats.where.desk + stats.where.room);
  const C1 = pathOverlap(world, stats, agents);
  const out = {
    C1: { id: 'C1', name: 'Path overlap', value: C1, unit: 'm shared per pair' },
    C3: { id: 'C3', name: 'New ties formed', value: newTies / persons * 1.5, unit: 'per person-week (from this day ×1.5 [A])' },
    C4: { id: 'C4', name: 'Face-to-face minutes', value: (f2f / 60) * 2 / persons, unit: 'min per person-day' },
    C6: { id: 'C6', name: 'Interactions between years', value: inter ? between / inter : 0, unit: 'share' },
    C7: { id: 'C7', name: 'Where interactions happen', value: stats.where.route / whereTotal, unit: 'route share', parts: { route: stats.where.route / whereTotal, desk: stats.where.desk / whereTotal, room: stats.where.room / whereTotal } },
    C13: { id: 'C13', name: 'Help-request latency', value: stats.help.length ? stats.help.reduce((s, x) => s + x, 0) / stats.help.length / 60 : 12, unit: 'min (not yet modelled; placeholder)' , placeholder: true },
    F1: { id: 'F1', name: 'Focus-block length', value: median(blocks) / 60, unit: 'min, median', deepShare: blocks.length ? blocks.filter((b) => b >= (P.metrics.benchmarks.F1.deep_min || 25) * 60).length / blocks.length : 0, upper: P.metrics.benchmarks.F1.upper || null, n: blocks.length },
    F2: { id: 'F2', name: 'Interruptions', value: focusHours ? totalInterruptions / focusHours : 0, unit: 'per focus-hour' },
    F4: { id: 'F4', name: 'Desk exposure', value: expo.length ? expo.reduce((s, x) => s + x, 0) / expo.length : 0, unit: 'passes per hour within 1 m of the desk' },
    F8: { id: 'F8', name: 'Wait for resources', value: waits.length ? waits.reduce((s, x) => s + x, 0) / waits.length / 60 : 0, unit: `min at the plotters, mean${stats.abandoned ? `; ${stats.abandoned} jobs abandoned for paper` : ''}`, n: waits.length, abandoned: stats.abandoned || 0 },   // the abandoned count is the loss the mean wait hides (walkthrough 2026-11-12, stop 4)
    F11: { id: 'F11', name: 'KEYS / motivation', value: null, unit: 'index (not computed: needs the self-report layer)', placeholder: true },
    S1: { id: 'S1', name: 'Integration', value: null, unit: 'space syntax (not computed: static layout analysis pending)', placeholder: true },
    counts: { present: present.length, encounters: enc, interactions: inter, between, remarks: stats.remarks, plotterJobs: waits.length, paperOutages: 0, layoutMoves: (stats.layoutMoves || []).length },
  };
  for (const k of Object.keys(out)) { const b = P.metrics.benchmarks[k]; if (b && out[k].value != null) { out[k].benchmark = b.value; out[k].scale = P.metrics.scale[k]; } }
  return out;
}
