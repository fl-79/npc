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
  // who felt it: the students that a step rests on, counted by archetype, the most affected first
  const who = (pred) => { const tot = {}, hit = {}; for (const s of students) { const k = s.typeName || "Students"; tot[k] = (tot[k] || 0) + 1; if (pred(s, sim.byId[s.id])) hit[k] = (hit[k] || 0) + 1; } const rows = Object.keys(tot).map((k) => [k, hit[k] || 0, tot[k], (hit[k] || 0) / tot[k]]).filter((r) => r[1] > 0).sort((x, y) => y[3] - x[3]); if (!rows.length) return ""; const none = Object.keys(tot).filter((k) => !hit[k]); const plural = (k) => k.toLowerCase().replace(/(student|prof)(?!s)/, "$1s"); return rows.map(([k, h, n]) => `${plural(k)} ${h} of ${n}`).join(", ") + (none.length ? `; ${none.map(plural).join(", ")} not at all` : "") + "."; };
  const logHas = (a2, kinds) => a2.log.some((e) => kinds.includes(e.kind));

  // ---- from how people experienced the day, during working time first; each step is a few short points
  const mk = (o) => { o.detail = o.points.join(" "); return o; };
  if (S.kitchenMax.n >= 10 || crowdedKitchen >= 15) {
    const far = farKitchen.map(([k]) => k).join(", "); const farM = farKitchen.length ? Math.round(farKitchen.reduce((x, [, m]) => x + m, 0) / farKitchen.length) : 0;
    const prop = farKitchen.length ? proposedPointDistance(sim, farKitchen.map(([k]) => k), [19.4, -30.0]) : null;
    const points = [`Kitchen peak ${S.kitchenMax.n} people at ${fmtClock(S.kitchenMax.t)}, in ${sim.kitchenArea} m² with two counters; ${crowdedKitchen} called it crowded.`];
    if (far) points.push(`Sections ${far} walk over 30 m each way (${farM} m on average).`);
    if (run >= 2 && hist.length) points.push(`Peak across runs: ${fmtTrend(trend("kitchenMax").concat(S.kitchenMax.n))}; people dodge the rush, the peak stays.`);
    points.push(`Do: a second kitchen point by the south lobby, about 3 m of counter with kettle, sink and fridge${prop != null ? `; cuts the south sections' walk from ${farM} m to about ${prop} m` : ""}.`);
    steps.push(mk({ basis: "experience", score: crowdedKitchen * 2 + S.kitchenMax.n, title: "Split the kitchen: a second point at the south end", points, topic: "kitchen", who: who((s, a2) => a2.kitchenCrowd > 0) }));
  }
  {
    const tightOnes = students.filter((s) => s.nearDesks >= 3); const bunched = students.filter((s) => sim.byId[s.id].log.some((e) => e.kind === "crowd" && /desk/i.test(e.place || ""))); const critTight = students.filter((s) => logHas(sim.byId[s.id], ["critTight"]));
    const unsettled = new Set([...tightOnes, ...bunched, ...critTight].map((s) => s.id));
    if (unsettled.size >= 8) {
      const points = [`${unsettled.size} of ${students.length} students could not settle at the desk.`, `${tightOnes.length} sit with three or more neighbours within 1.6 m; ${bunched.length} had people bunch up in their row; ${critTight.length} had under 1.0 m clear for a crit.`, `Do: one desk out of each row pair at the crossing points, end desks turned, so every row keeps a 1.5 m aisle and a metre behind each chair.`];
      steps.push(mk({ basis: "experience", score: unsettled.size * 1.5, title: "Protect working time at the desks", points, topic: "desks", who: who((s) => unsettled.has(s.id)) }));
    }
  }
  if (printerWaits >= 3) {
    const points = [`${printerWaits} people waited to print${S.printQueue ? `; the big printer by the north desks had ${S.printQueue} at it at its worst` : ""}.`, `One letter printer and two plotters at the north end serve every desk; the 3D printer room (${sim.plan.printerRoom?.area_m2} m²) holds two, with the hall as the waiting space.`];
    if (farPrinter.length) points.push(`Sections ${farPrinter.map(([k]) => k).join(", ")} walk over 35 m to the printers.`);
    if (run >= 2 && hist.length) points.push(`Waits across runs: ${fmtTrend(trend("printerWaits").concat(printerWaits))}.`);
    points.push(`Do: a second letter printer at the south core, and a shelf and bench outside the 3D printer room's door.`);
    steps.push(mk({ basis: "experience", score: printerWaits * 3, title: "A second printer at the south end", points, topic: "printers", who: who((s, a2) => a2.printerWaits > 0) }));
  }
  if (topCrowd.length) {
    const points = [`Bunch-ups mostly in ${topCrowd.map(([k, n]) => `${k} (${n})`).join(" and ")}; narrowest clearance ${(S.minClearance ?? 1.2).toFixed(1)} m, under the 1.5 m two people need to pass with a model.`];
    if (run >= 2 && hist.length) points.push(`Across runs: ${fmtTrend(trend("crowd").concat(S.crowd))}; crowd-sensitive people route around the spots, which moves the problem.`);
    points.push(`Do: a 1.5 m cross aisle through the rows between the two cores, one desk out of each row at the crossing.`);
    steps.push(mk({ basis: "experience", score: S.crowd, title: "Open a cross aisle through the desk rows", points, topic: "aisles", who: who((s, a2) => a2.crowdEvents > 0) }));
  }
  const overtime = profs.filter((x) => x.leftAt != null && x.leftAt > sim.personById[x.id].leave + 300).length;
  if (missed >= 6 || overtime >= 3) {
    const waited = students.filter((s) => sim.byId[s.id].said.waitingCrit).length;
    const points = [`${overtime} of ${profs.length} profs ran over their time to finish the round; ${missed} students were still not reached by the end of the day.`, `A round covers about ${sectionSize} desks spread along the floor, ${profWalk} m of walking plus the waits at empty desks${waited ? `; ${waited} students sat packed up, waiting their turn` : ""}.`, `Do: seat each section within one row pair so a round is about ${Math.round(profWalk / 2)} m, or split the crits over two afternoons.`];
    steps.push(mk({ basis: "experience", score: missed + overtime * 3, title: "Shorten the prof's round", points, topic: "crits", who: who((s, a2) => a2.critsMissed > 0 || a2.said.waitingCrit) }));
  }
  if (lost >= 3) steps.push(mk({ basis: "experience", score: lost * 2, title: "Tell the two ends of the floor apart", points: [`${lost} wrong-end trips to the printer room; from the aisle the two cores look alike.`, run >= 2 ? `Across runs: ${fmtTrend(trend("lost").concat(lost))}; regulars learn it, each new cohort relearns it.` : `The printer room is in the south core, with nothing on the floor saying so.`, `Do: a colour band or room names at eye height on each core, and the room's name on the door seen from the aisle.`], topic: "wayfinding", who: who((s, a2) => logHas(a2, ["lost"])) }));
  // ---- after hours: Good Times matters less than the working day, so these rank below it
  if (sim.queue.maxLen >= 12) {
    const points = [`Food line peak ${sim.queue.maxLen} people, tail in ${sim.plan.placeName(...sim.queueSlots[Math.min(sim.queue.maxLen, sim.queueSlots.length) - 1])}; mean wait ${Math.round(meanWait)} min at ${Math.round(S.serveSeconds || 25)} s a serving.`, lineDesks ? `It ran past ${lineDesks} desks where people were still working.` : `By the time it formed, the desks it passes were empty.`];
    if (run >= 2 && hist.length) points.push(`Across runs the line started ${fmtTrend(trend("lineStart").concat(S.lineStart != null ? fmtClock(S.lineStart) : null))}; the wait went ${fmtTrend(trend("meanWait").concat(meanWait), " min")}.`);
    points.push(`Do: a second serving point (wait about ${Math.max(1, Math.round(meanWait / 2))} min), and the line along the east glazing instead of the aisle.`);
    steps.push(mk({ basis: "experience", after: true, score: (sim.queue.maxLen + lineDesks * 2) * 0.5, title: "Give the food line a place that is not the desk aisle", points, topic: "food line", who: who((s, a2) => a2.queueWait != null) }));
  }
  if (S.noSeat >= 4 || (S.barMax.n >= 20 && sim.seatsWithin15 < 12)) {
    const where = Object.entries(S.splinter).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const points = [`${sim.seatsWithin15} seats within 15 m of the bar for ${S.barMax.n} people at the peak; ${S.noSeat} looked for a seat and found none.`];
    if (where.length) points.push(`Groups that did sit ended up in ${where.map(([k, n]) => `${k} (${n})`).join(", ")}.`);
    if (run >= 2 && hist.length) points.push(`No seat across runs: ${fmtTrend(trend("noSeat").concat(S.noSeat))}.`);
    points.push(`Do: about ${Math.max(12, Math.round(S.barMax.n * 0.6))} seats in sight of the counter: two more sofas and a bench, or the southeast classroom opened to the bar.`);
    steps.push(mk({ basis: "experience", after: true, score: (S.noSeat * 2 + Math.max(0, 20 - sim.seatsWithin15)) * 0.5, title: "Seats within reach of the bar", points, topic: "seating", who: who((s, a2) => a2.noSeat > 0) }));
  }
  if (noisy.length >= 5 || S.barMax.n >= 20) {
    const points = [`${S.barMax.n} at the bar at ${fmtClock(S.barMax.t)}, ${(S.barMax.n / Math.max(1, sim.barArea)).toFixed(1)} per m² of open floor beside the counter; the overflow stands in the desk aisles.`, `${deskNearBar} desks lie within 12 m of the counter${noisy.length ? `; ${noisy.length} people still worked there after 18:30` : ""}.`];
    if (run >= 2 && hist.length) points.push(`Bar peak across runs: ${fmtTrend(trend("barMax").concat(S.barMax.n))}.`);
    points.push(`Do: a storage wall or 2.4 m screen between the counter and the first row, or Good Times in the southeast classroom (${sim.plan.rooms.find((r) => /Southeast classroom/i.test(r.name))?.area_m2 || 45} m², a door, glazing on two sides).`);
    steps.push(mk({ basis: "experience", after: true, score: (noisy.length * 2 + S.barMax.n / 3) * 0.4, title: noisy.length ? "Put something between the bar and the desk rows" : "Give Good Times a room, not a counter in the aisle", points, topic: "bar", who: who((s, a2) => a2.noiseMinutes > 5) }));
  }
  if (doorMax && doorMax[1].n >= 14) steps.push(mk({ basis: "experience", after: true, score: doorMax[1].n * 0.6, title: "Spread the exit", points: [`${doorMax[1].n} people through ${doorMax[0]} in five minutes at ${fmtClock(doorMax[1].t)}, one every ${Math.round(300 / doorMax[1].n)} s through a single leaf.`, `Do: both stair doors held open at the end of the day, and the second stair signed from the far end of the floor.`], topic: "doors" }));

  // ---- from the plan alone: geometry says this before anyone walks it
  if (farKitchen.length || farPrinter.length) {
    const fk = farKitchen.map(([k, m]) => `${k} (${Math.round(m)} m)`).join(", "), fp = farPrinter.map(([k, m]) => `${k} (${Math.round(m)} m)`).join(", ");
    const points = []; if (fk) points.push(`Sections ${fk} are over 30 m from the kitchen by the aisles.`); if (fp) points.push(`Sections ${fp} are over 35 m from the printer room.`);
    points.push(`Both amenities sit at one end of a ${Math.round(sim.plan.meta.extent[3] - sim.plan.meta.extent[1])} m floor.`, `Do: a second kitchen point and printer at the other core, or swap the far sections with those nearest the cores.`);
    steps.push(mk({ basis: "plan", score: farKitchen.length * 4 + farPrinter.length * 3, title: "Long walks from the far sections", points, topic: "kitchen" }));
  }
  if (glassDesks >= 20) steps.push(mk({ basis: "plan", score: glassDesks / 4, title: "Shade or orient the desks along the glazing", points: [`${glassDesks} desks sit within 2.6 m of the full-height glazing; late afternoon means low sun in the screens on the west side (orientation assumed).`, `Do: turn the west rows so screens face north or south, or roller shades on the ${Math.round(glassDesks / 2)} west bays.`], topic: "light" }));
  // the experience steps first, by weight; the plan-alone steps after them
  steps.sort((a, b) => (a.basis !== b.basis ? (a.basis === "experience" ? -1 : 1) : (!!a.after !== !!b.after ? (a.after ? 1 : -1) : b.score - a.score)));
  for (const s of steps) s.jump = jumpFor(sim, s.topic);
  const goals = evaluateGoals(sim);

  return {
    goals,
    run, headline: { people: sim.cast.people.length, remarks: feed.length, kitchenMax: S.kitchenMax, barMax: S.barMax, lineMax: sim.queue.maxLen, meanWait: Math.round(meanWait), missed, crowd: S.crowd, lost, meanMood: sim.agents.reduce((x, a) => x + a.mood, 0) / sim.agents.length },
    topics, steps: steps.filter((s) => s.basis === "experience").slice(0, 6).concat(steps.filter((s) => s.basis === "plan").slice(0, 3)), history: hist,
  };
}

// mean walking distance from the seats of the given sections to a proposed point
function proposedPointDistance(sim, sections, point) {
  const nav = sim.nav; const tgt = nav.isFree(point[0], point[1]) ? point : nav.nearestFree(point[0], point[1], 3); if (!tgt) return "?";
  const seats = sim.students.filter((s) => sections.includes(s.section)); let L = 0, n = 0;
  for (const s of seats) { const p = nav.findPath(s.seat, tgt); if (!p) continue; let d = 0; for (let i = 1; i < p.length; i++) d += dist(p[i - 1], p[i]); L += d; n++; }
  return n ? Math.round(L / n) : "?";
}

