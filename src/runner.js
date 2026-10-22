// Run-first: compute a whole afternoon (or several seeds) in chunks so the page stays responsive,
// then hand back records and step lists for the Summary. The playable run is the first seed.
import { createSim, step, DURATION, runRecord } from "./sim.js";
import { summarize } from "./summary.js";
import { makeCastFromSpec } from "./spec.js";
import { mulberry32 } from "./rng.js";

const CHUNK = 20 * 60; // simulated seconds per chunk

export function buildSimFromSpec(plan, nav, spec, seed) {
  const cast = makeCastFromSpec(plan, spec, mulberry32(seed), seed);
  return createSim(plan, nav, cast, seed);
}

// run one sim to the end, calling onProgress(fraction) between chunks
export function computeRun(sim, onProgress) {
  return new Promise((resolve) => {
    const tick = () => {
      if (sim.done) { onProgress && onProgress(1); resolve(sim); return; }
      step(sim, CHUNK); onProgress && onProgress(sim.t / DURATION);
      setTimeout(tick, 0);
    };
    tick();
  });
}

// run the spec on several seeds; returns { sims: [playable first], results: [{seed, record, summary}] }
export async function computeSeries(plan, nav, spec, seeds, onProgress) {
  const results = []; let playable = null;
  for (let i = 0; i < seeds.length; i++) {
    const sim = buildSimFromSpec(plan, nav, spec, seeds[i]);
    await computeRun(sim, (f) => onProgress && onProgress((i + f) / seeds.length, seeds[i], sim));
    sim.recordedFeed = sim.feed.slice(); const summary = summarize(sim); sim.recordedSummary = summary;
    results.push({ seed: seeds[i], record: runRecord(sim), summary, goals: summary.goals, steps: summary.steps });
    if (!playable) playable = sim; else { sim.snapshots.clear(); }
  }
  return { sim: playable, results, stability: stability(results) };
}

// how often each step title and each goal verdict appears across seeds
export function stability(results) {
  const n = results.length; const steps = {}; const goals = {};
  for (const r of results) {
    for (const s of r.steps) { const e = (steps[s.title] ||= { title: s.title, topic: s.topic, count: 0, details: [] }); e.count++; e.details.push(s.detail); }
    for (const g of r.goals || []) { const e = (goals[g.text] ||= { text: g.text, metric: g.metric, verdicts: {} }); e.verdicts[g.verdict] = (e.verdicts[g.verdict] || 0) + 1; }
  }
  return { n, steps: Object.values(steps).sort((a, b) => b.count - a.count), goals: Object.values(goals) };
}
