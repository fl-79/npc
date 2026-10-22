// Summary of a run: what people said, by topic, and next steps for the layout. The numbers are
// computed from the run; the step texts are inferred (templates for now) and tagged as such.
// With each run the cast's history grows, and the steps get more specific: trends across runs,
// then sizing of the proposed change.
import { TOPICS } from "./remarks.js";
import { fmtClock } from "./sim.js";
import { dist } from "./plan.js";

function cellXY(sim, cell) { if (cell == null) return null; const i = cell % sim.nav.w; return sim.nav.center(i, (cell - i) / sim.nav.w); }
function firstLog(sim, kind) { let best = null; for (const a of sim.agents) for (const e of a.log) if (e.kind === kind && (!best || e.t < best.e.t)) best = { a, e }; return best; }
function jumpFor(sim, topic) {
  const S = sim.stats; const plan = sim.plan;
  const k = plan.kitchen ? [(plan.kitchen.bounds[0] + plan.kitchen.bounds[2]) / 2, (plan.kitchen.bounds[1] + plan.kitchen.bounds[3]) / 2] : null;
  switch (topic) {
    case "kitchen": return k ? { t: S.kitchenMax.t, x: k[0], y: k[1], label: `kitchen at ${fmtClock(S.kitchenMax.t)}` } : null;
    case "food line": { const s = sim.queueSlots[Math.min(10, sim.queueSlots.length - 1)]; return s && S.lineStart != null ? { t: Math.min(21599, S.lineStart + 12 * 60), x: s[0], y: s[1], label: `the line at ${fmtClock(S.lineStart + 12 * 60)}` } : null; }
    case "bar": return plan.bar ? { t: S.barMax.t, x: plan.bar.center[0], y: plan.bar.center[1], label: `the bar at ${fmtClock(S.barMax.t)}` } : null;
    case "printers": { const f = firstLog(sim, "printerBusy"); const r = plan.printerRoom; return f && r ? { t: f.e.t, x: (r.bounds ? (r.bounds[0] + r.bounds[2]) / 2 : f.a.x), y: (r.bounds ? (r.bounds[1] + r.bounds[3]) / 2 : f.a.y), id: f.a.id, label: `${sim.personById[f.a.id].name} at the printer room, ${fmtClock(f.e.t)}` } : null; }
    case "aisles": { const f = firstLog(sim, "crowd"); const xy = f && cellXY(sim, f.e.cell); return f && xy ? { t: f.e.t, x: xy[0], y: xy[1], id: f.a.id, label: `${sim.personById[f.a.id].name} stuck at ${fmtClock(f.e.t)}` } : null; }
    case "crits": { const f = firstLog(sim, "missedCrit"); const p = f && sim.personById[f.a.id]; return f ? { t: Math.max(0, f.a.missedAt || f.e.t), x: p.seat[0], y: p.seat[1], id: f.a.id, label: `${p.name}'s desk when the prof came` } : null; }
    case "seating": { const f = firstLog(sim, "noSeat") || firstLog(sim, "splinter") || firstLog(sim, "satDown"); return f ? { t: f.e.t, x: f.a.x, y: f.a.y, id: f.a.id, label: `${sim.personById[f.a.id].name} at ${fmtClock(f.e.t)}` } : null; }
    case "access": return jumpFor(sim, "kitchen");
    case "comfort": return jumpFor(sim, "aisles") || jumpFor(sim, "bar");
    case "wayfinding": { const f = firstLog(sim, "lost"); return f ? { t: Math.max(0, f.e.t - 3 * 60), x: f.a.x, y: f.a.y, id: f.a.id, label: `${sim.personById[f.a.id].name} going the wrong way` } : null; }
    case "light": { const s = sim.students.find((s) => s.glass); return s ? { t: 3 * 3600, x: s.seat[0], y: s.seat[1], id: s.id, label: `${s.name}'s desk by the glazing at 16:30` } : null; }
    case "doors": { const dm = Object.entries(S.doorMax || {}).sort((a, b) => b[1].n - a[1].n)[0]; const d = dm && plan.doors.find((x) => x.id === dm[0]); return d ? { t: dm[1].t, x: d.center[0], y: d.center[1], label: `${d.id} at ${fmtClock(dm[1].t)}` } : null; }
    default: return null;
  }
}
// the brief's goals, answered from the run
const mean = (arr) => { const v = arr.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
export function evaluateGoals(sim) {
  const S = sim.stats; const spec = sim.cast.spec; if (!spec || !spec.goals) return [];
  if (sim.t < 60 * 60) return spec.goals.map((g) => ({ text: g.text, metric: g.metric, verdict: "not run", fact: "press Run to answer this", jump: null }));
  const students = sim.students; const waits = sim.agents.filter((a) => a.queueWait != null).map((a) => a.queueWait / 60);
  const meanWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const missed = students.filter((s) => sim.byId[s.id].critsMissed).length;
  const printerWaits = students.filter((s) => sim.byId[s.id].printerWaits).length;
  const lost = sim.agents.reduce((n, a) => n + a.log.filter((e) => e.kind === "lost").length, 0);
  const noisy = students.filter((s) => sim.byId[s.id].noiseMinutes > 5).length;
  const tight = students.filter((s) => s.nearDesks >= 3).length;
  const glass = students.filter((s) => s.glass).length;
  const doorMax = Object.values(S.doorMax || {}).reduce((m, d) => Math.max(m, d.n), 0);
  const V = (ok, partly, fact) => ({ verdict: ok ? "met" : partly ? "partly" : "not met", fact });
  const by = {
    access: () => { const mk = mean(students.map((s) => s.dKitchen)), mp = mean(students.map((s) => s.dPrinter)); const far = students.filter((s) => s.dKitchen > 35 || s.dPrinter > 40).length; return V(mk < 25 && mp < 30, mk < 40 && mp < 45, `mean walk from a desk: ${Math.round(mk)} m to the kitchen, ${Math.round(mp)} m to the printers; ${far} desks over 35 m from one of them`); },
    comfort: () => { const tightShare = tight / Math.max(1, students.length); return V(tightShare < 0.1 && S.crowd < 10 && noisy === 0, tightShare < 0.3 && S.crowd < 40, `${tight} desks with three or more neighbours within 1.6 m, ${S.crowd} aisle bunch-ups (narrowest ${(S.minClearance ?? 1.2).toFixed(1)} m), ${noisy} people working within earshot of the bar`); },
    kitchen: () => V(S.kitchenMax.n < 8, S.kitchenMax.n < 14, `peak ${S.kitchenMax.n} people in ${sim.kitchenArea} m² at ${fmtClock(S.kitchenMax.t)}`),
    "food line": () => V(sim.queue.maxLen < 10 && meanWait < 8, sim.queue.maxLen < 25, `line of ${sim.queue.maxLen} at most, mean wait ${Math.round(meanWait)} min`),
    bar: () => V(noisy === 0 && S.barMax.n / Math.max(1, sim.barArea) < 1.5, noisy < 5, `${S.barMax.n} at the bar at peak, ${noisy} people working within earshot after 18:30`),
    seating: () => V(S.noSeat === 0 && S.sat > 0, S.noSeat < 6, `${sim.seatsWithin15} seats within 15 m of the bar; ${S.sat} sat down, ${S.noSeat} looked and found none; groups ended in ${Object.entries(S.splinter).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k).join(" and ") || "nowhere yet"}`),
    printers: () => V(printerWaits < 3, printerWaits < 12, `${printerWaits} people found the printer room full`),
    crits: () => V(missed <= students.length * 0.05, missed <= students.length * 0.2, `${missed} of ${students.length} missed their crit`),
    aisles: () => V(S.crowd < 10, S.crowd < 40, `${S.crowd} bunch-ups, narrowest ${(S.minClearance ?? 1.2).toFixed(1)} m`),
    wayfinding: () => V(lost < 2, lost < 8, `${lost} wrong-end trips`),
    light: () => V(glass < 10, glass < 30, `${glass} desks within 2.6 m of the glazing (orientation assumed)`),
    doors: () => V(doorMax < 10, doorMax < 16, `${doorMax} people through one door in five minutes at most`),
    desks: () => V(tight < 10, tight < 40, `${tight} desks with three or more neighbours within 1.6 m`),
  };
  return spec.goals.map((g) => { const f = g.metric && by[g.metric]; const r = f ? f() : { verdict: "not testable", fact: "no metric matches this goal yet" }; return { text: g.text, metric: g.metric, ...r, jump: g.metric ? jumpFor(sim, g.metric) : null }; });
}

export function summarize(sim) {
  const S = sim.stats; const hist = sim.cast.memory.history || [];
  const feed = (sim.recordedFeed || sim.feed).filter((r) => r.topic !== "day");
  const topics = TOPICS.filter((t) => t !== "day").map((t) => {
    const rs = feed.filter((r) => r.topic === t); if (!rs.length) return null;
    const people = new Set(rs.map((r) => r.id)).size;
    const places = {}; for (const r of rs) places[r.place] = (places[r.place] || 0) + 1;
    const where = Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
    const lows = rs.filter((r) => r.mood < 0.45).length;
    return { topic: t, count: rs.length, people, where, lows, quote: rs[rs.length - 1] };
  }).filter(Boolean).sort((a, b) => b.people - a.people);

  const students = sim.students; const run = sim.run;
  const bySection = {}; for (const s of students) (bySection[s.section] ||= []).push(s);
  const secMean = (f) => Object.entries(bySection).map(([k, v]) => [k, v.reduce((x, s) => x + (f(s) || 0), 0) / v.length]);
  const farKitchen = secMean((s) => s.dKitchen).filter(([, m]) => m > 30).sort((a, b) => b[1] - a[1]);
  const farPrinter = secMean((s) => s.dPrinter).filter(([, m]) => m > 35);
  const missed = students.filter((s) => sim.byId[s.id].critsMissed).length;
  const crowdedKitchen = students.filter((s) => sim.byId[s.id].kitchenCrowd).length;
  const waits = sim.agents.filter((a) => a.queueWait != null).map((a) => a.queueWait / 60);
  const meanWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const lineDesks = students.filter((s) => sim.byId[s.id].said.lineAtDesk).length;
  const noisy = students.filter((s) => sim.byId[s.id].noiseMinutes > 5);
  const deskNearBar = sim.plan.bar ? students.filter((s) => dist(s.seat, sim.plan.bar.center) < 12).length : 0;
  const crowdSpots = {}; for (const a of sim.agents) for (const e of a.log) if (e.kind === "crowd") crowdSpots[e.place] = (crowdSpots[e.place] || 0) + 1;
  const topCrowd = Object.entries(crowdSpots).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const printerWaits = students.filter((s) => sim.byId[s.id].printerWaits).length;
  const lost = sim.agents.reduce((n, a) => n + a.log.filter((e) => e.kind === "lost").length, 0);
  const glassDesks = students.filter((s) => s.glass).length;
  const doorMax = Object.entries(S.doorMax || {}).sort((a, b) => b[1].n - a[1].n)[0];
  const trend = (key) => hist.map((h) => h[key]);
  const fmtTrend = (arr, unit = "") => arr.map((v) => (v == null ? "–" : typeof v === "number" ? Math.round(v) + unit : v)).join(" → ");

  const steps = [];
  const profs = sim.agents.filter((x) => sim.personById[x.id].role === "prof"); const profWalk = profs.length ? Math.round(profs.reduce((x, y) => x + y.walked, 0) / profs.length) : 0;
  const sectionSize = Math.round(students.length / Math.max(1, Object.keys(bySection).length));
  if (S.kitchenMax.n >= 10 || crowdedKitchen >= 15) {
    const far = farKitchen.map(([k]) => k).join(", "); const farM = farKitchen.length ? Math.round(farKitchen.reduce((x, [, m]) => x + m, 0) / farKitchen.length) : 0;
    let detail = `The kitchen (${sim.kitchenArea} m², two counters, one kettle and one sink) peaked at ${S.kitchenMax.n} people at ${fmtClock(S.kitchenMax.t)}, and ${crowdedKitchen} people called it crowded; at that size about ${Math.max(3, Math.round(sim.kitchenArea / 1.5))} people can use it without queueing for a counter.${far ? ` Sections ${far} walk more than 30 m each way to it (${farM} m on average), so a coffee is a ten-minute round trip for them.` : ""}`;
    if (run >= 2 && hist.length) detail += ` Across runs the peak went ${fmtTrend(trend("kitchenMax").concat(S.kitchenMax.n))}: people learn to dodge the rush, the peak itself does not go away.`;
    const prop = farKitchen.length ? proposedPointDistance(sim, farKitchen.map(([k]) => k), [19.4, -30.0]) : null;
    detail += ` What to do: a second kitchen point by the south lobby, a counter of about 3 m with a kettle, a sink and a fridge, takes the south sections off this one${prop != null ? ` and cuts their walk from ${farM} m to about ${prop} m` : ""}; a third counter in the present kitchen alone would add a place to stand but not shorten anyone's walk.`;
    steps.push({ score: crowdedKitchen * 2 + S.kitchenMax.n, title: "Split the kitchen: a second point at the south end", detail, topic: "kitchen" });
  }
  if (sim.queue.maxLen >= 12) {
    let detail = `The food line reached ${sim.queue.maxLen} people, with its tail in ${sim.plan.placeName(...sim.queueSlots[Math.min(sim.queue.maxLen, sim.queueSlots.length) - 1])}, and the mean wait was ${Math.round(meanWait)} min at ${Math.round(S.serveSeconds || 25)} s per serving${lineDesks ? `; it ran past ${lineDesks} desks where people were still working` : "; by the time it formed the desks it passes were empty"}.`;
    if (run >= 2 && hist.length) detail += ` The line started ${fmtTrend(trend("lineStart").concat(S.lineStart != null ? fmtClock(S.lineStart) : null))} and the wait went ${fmtTrend(trend("meanWait").concat(meanWait), " min")}: people come earlier each time, so everyone waits longer.`;
    detail += ` What to do: a second serving point at the counter halves the wait to about ${Math.max(1, Math.round(meanWait / 2))} min, and routing the line along the east glazing instead of the aisle (about ${Math.round(sim.queue.maxLen * 0.6)} m of line at 0.6 m a person) passes no desks at all.`;
    steps.push({ score: sim.queue.maxLen + lineDesks * 2, title: "Give the food line a place that is not the desk aisle", detail, topic: "food line" });
  }
  if (S.noSeat >= 4 || (S.barMax.n >= 20 && sim.seatsWithin15 < 12)) {
    const where = Object.entries(S.splinter).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let detail = `${sim.seatsWithin15} seats within 15 m of the bar (the sofas, the benches and the classroom chairs) for ${S.barMax.n} people at the peak; ${S.noSeat} people looked for a seat and found none${where.length ? `, and the groups that did sit ended up in ${where.map(([k, n]) => `${k} (${n})`).join(", ")}` : ""}. The crew set up with ${S.setupClearance != null ? S.setupClearance.toFixed(1) + " m" : "little"} of clear floor around the counter.`;
    if (run >= 2 && hist.length) detail += ` No seat across runs: ${fmtTrend(trend("noSeat").concat(S.noSeat))}.`;
    detail += ` What to do: about ${Math.max(12, Math.round(S.barMax.n * 0.6))} seats within sight of the counter would seat the groups that now drift to the stair hall and the desks: two more sofas and a bench along the enclosure wall, or the southeast classroom (${sim.plan.rooms.find((r) => /Southeast classroom/i.test(r.name))?.area_m2 || 45} m²) opened to the bar for the evening.`;
    steps.push({ score: S.noSeat * 2 + Math.max(0, 20 - sim.seatsWithin15), title: "Seats within reach of the bar", detail, topic: "seating" });
  }
  if (noisy.length >= 5 || S.barMax.n >= 20) {
    let detail = `${S.barMax.n} people at the bar at the peak (${fmtClock(S.barMax.t)}) around a counter with ${sim.barArea} m² of open floor beside it, ${(S.barMax.n / Math.max(1, sim.barArea)).toFixed(1)} per m², so the overflow stands in the desk aisles. ${deskNearBar} desks lie within 12 m of the counter${noisy.length ? `, and ${noisy.length} people were still working at them after 18:30, ${Math.round(noisy.reduce((x, s) => x + sim.byId[s.id].noiseMinutes, 0) / noisy.length)} min each in the noise` : ""}.`;
    if (run >= 2 && hist.length) detail += ` Bar peak across runs: ${fmtTrend(trend("barMax").concat(S.barMax.n))}.`;
    detail += ` What to do: a storage wall or a 2.4 m screen between the counter and the first desk row keeps the party out of the rows; or move Good Times to the southeast classroom, ${sim.plan.rooms.find((r) => /Southeast classroom/i.test(r.name))?.area_m2 || 45} m² with a door and glazing on two sides, which holds ${S.barMax.n} standing with room to spare.`;
    steps.push({ score: noisy.length * 2 + S.barMax.n / 3, title: noisy.length ? "Put something between the bar and the desk rows" : "Give Good Times a room, not a counter in the aisle", detail, topic: "bar" });
  }
  if (printerWaits >= 3) {
    let detail = `${printerWaits} people waited to print: at the two plotters and the big printer by the north desks, which take one person at a time, or at the 3D printer room (${sim.plan.printerRoom?.area_m2} m², holds two) with the stair hall as the waiting space.${farPrinter.length ? ` Sections ${farPrinter.map(([k]) => k).join(", ")} walk more than 35 m to the room.` : ""}`;
    if (run >= 2 && hist.length) detail += ` Waits across runs: ${fmtTrend(trend("printerWaits").concat(printerWaits))}; people shift their print times, the room does not grow.`;
    detail += ` What to do: a second plotter at the south core next to the printer room, and a bench with a shelf outside the room's door, so a wait is a seat and a drawing laid flat rather than a crowd in the hall.`;
    steps.push({ score: printerWaits * 3, title: "A waiting place or a second printer room", detail, topic: "printers" });
  }
  if (topCrowd.length) {
    let detail = `People bunched most in ${topCrowd.map(([k, n]) => `${k} (${n} times)`).join(" and ")}; the narrowest clearance where it happened was ${(S.minClearance ?? 1.2).toFixed(1)} m, less than the 1.5 m two people need to pass with a model.`;
    if (run >= 2 && hist.length) detail += ` Crowd events across runs: ${fmtTrend(trend("crowd").concat(S.crowd))}; crowd-sensitive people now route around the spots, which moves the problem rather than removing it.`;
    detail += ` What to do: take one desk out of each row at the crossing point to open a 1.5 m cross aisle through the rows, between the two cores where most of the traffic to the kitchen and the printers crosses the floor.`;
    steps.push({ score: S.crowd, title: "Open a cross aisle through the desk rows", detail, topic: "aisles" });
  }
  if (missed >= 6) {
    let detail = `${missed} of ${students.length} students never got their crit: the prof's round over a section of about ${sectionSize} desks, ${profWalk} m of walking with the waits at empty desks, ran out before the end of the day. Nobody was skipped for being away; the prof came back, and still ran out of time.`;
    if (run >= 2 && hist.length) detail += ` Not reached across runs: ${fmtTrend(trend("missed").concat(missed))}.`;
    detail += ` What to do: seat a section's desks within one row pair rather than along the whole floor, so a round is ${Math.round(profWalk / 2)} m instead of ${profWalk} m; or split the crits over two afternoons.`;
    steps.push({ score: missed, title: "Shorten the prof's round", detail, topic: "crits" });
  }
  if (lost >= 3) steps.push({ score: lost * 2, title: "Tell the two ends of the floor apart", detail: `${lost} wrong-end trips to the printer room this run: it sits in the south core, and from the aisle the two cores look alike, same cream walls, same glass to the stair hall${run >= 2 ? ` (${fmtTrend(trend("lost").concat(lost))} across runs: regulars learn it, every new cohort relearns it)` : ""}. What to do: a colour band or the room names at eye height on each core's corridor face, and the printer room's name on the door you see from the aisle.`, topic: "wayfinding" });
  if (glassDesks >= 20) steps.push({ score: glassDesks / 4, title: "Shade or orient the desks along the glazing", detail: `${glassDesks} desks sit within 2.6 m of the full-height glazing; in the late afternoon that is low sun in the screen on the west side (facade orientation assumed). What to do: turn the west rows so screens face north or south, or a roller shade on the ${Math.round(glassDesks / 2)} west bays, which keeps the daylight and loses the glare.`, topic: "light" });
  if (doorMax && doorMax[1].n >= 14) steps.push({ score: doorMax[1].n, title: "Spread the exit", detail: `${doorMax[1].n} people passed ${doorMax[0]} in five minutes at ${fmtClock(doorMax[1].t)}, which is one every ${Math.round(300 / doorMax[1].n)} s through a single leaf. What to do: hold both stair doors open at the end of the day, and sign the second stair from the far end of the floor so the exit splits.`, topic: "doors" });
  steps.sort((a, b) => b.score - a.score);
  for (const s of steps) s.jump = jumpFor(sim, s.topic);
  const goals = evaluateGoals(sim);

  return {
    goals,
    run, headline: { people: sim.cast.people.length, remarks: feed.length, kitchenMax: S.kitchenMax, barMax: S.barMax, lineMax: sim.queue.maxLen, meanWait: Math.round(meanWait), missed, crowd: S.crowd, lost, meanMood: sim.agents.reduce((x, a) => x + a.mood, 0) / sim.agents.length },
    topics, steps: steps.slice(0, 6), history: hist,
  };
}

// mean walking distance from the seats of the given sections to a proposed point
function proposedPointDistance(sim, sections, point) {
  const nav = sim.nav; const tgt = nav.isFree(point[0], point[1]) ? point : nav.nearestFree(point[0], point[1], 3); if (!tgt) return "?";
  const seats = sim.students.filter((s) => sections.includes(s.section)); let L = 0, n = 0;
  for (const s of seats) { const p = nav.findPath(s.seat, tgt); if (!p) continue; let d = 0; for (let i = 1; i < p.length; i++) d += dist(p[i - 1], p[i]); L += d; n++; }
  return n ? Math.round(L / n) : "?";
}

