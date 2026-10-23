import { loadPlan } from "./plan.js";
import { NavGrid } from "./nav.js";
import { step, reset, seekTo, nextRun, exportRun, fmtClock } from "./sim.js";
import { Stage } from "./stage.js";
import { createUI } from "./ui.js";
import { DEFAULT_SPEC, normalizeSpec, specFromBriefLocal } from "./spec.js";
import { buildSimFromSpec, computeSeries } from "./runner.js";
import { apiStatus, requestSpec } from "./api.js";
import { runIntro, runTour, shouldShowIntro } from "./intro.js";

const $ = (s) => document.querySelector(s);

const plan = await loadPlan(import.meta.env.BASE_URL + "plan/level3.json");
$("#plan-name").textContent = `Lasserre Level 3 · ${plan.desks.length} desks, ${plan.sections.count} sections`;
const nav = new NavGrid(plan, 0.25);
const stage = new Stage($("#stage"), plan);

// spec: from the last session if saved, else the default
let spec = normalizeSpec(DEFAULT_SPEC);
try { const saved = localStorage.getItem("studio-day-spec"); if (saved) spec = normalizeSpec(JSON.parse(saved)); } catch {}
// a saved spec from before the access and comfort goals existed, and not written by the user or Claude, takes the new defaults
if ((spec.version || 1) < 3 || (!spec.goals.some((g) => g.metric === "access" || g.metric === "comfort") && !/Claude|edited/.test(spec.source || ""))) { const d = normalizeSpec(DEFAULT_SPEC); spec.goals = d.goals; spec.use = d.use; spec.version = 3; }
let seed = Number($("#seed").value) || 11;
let sim = buildSimFromSpec(plan, nav, spec, seed);
let series = null; let specMeta = null;

const actions = {
  jump(j, follow) { setPlaying(false); seekTo(sim, j.t); scrub.value = sim.t; if (stage.mode === "pixel") { if (stage.zoom < 2) stage.setZoom(2, stage.W / 2, stage.H / 2); } else stage.scale = Math.max(stage.scale, 28); stage.centerOn(j.x, j.y); if (j.id) { ui.openPeople(true); ui.select(j.id, false); if (follow) ui.setFollow(true); } ui.reset(); },
  specChanged(s) { spec = normalizeSpec(s); spec.pinned = pinnedOf(); try { localStorage.setItem("studio-day-spec", JSON.stringify(spec)); } catch {} },
  pin(id, o) { spec.pinned[id] = { ...(spec.pinned[id] || {}), ...o, traits: { ...((spec.pinned[id] || {}).traits || {}), ...(o.traits || {}) } }; const p = sim.personById[id]; if (p) { Object.assign(p, o, { traits: { ...p.traits, ...(o.traits || {}) }, pinned: true }); } try { localStorage.setItem("studio-day-spec", JSON.stringify(spec)); } catch {} },
};
function pinnedOf() { return spec.pinned || {}; }

const ui = createUI(() => sim, stage, actions);
ui.setSpec(spec); ui.renderDistribution();
stage.onSelect = (id) => { if (id) ui.openPeople(true); ui.select(id, false); };
stage.onHover = (id, x, y) => { const tip = $("#tooltip"); if (!id) { tip.classList.add("hidden"); return; } const p = sim.personById[id], a = sim.byId[id]; tip.textContent = `${p.name} · ${a.activity}`; tip.style.left = x + 12 + "px"; tip.style.top = y + 12 + "px"; tip.classList.remove("hidden"); };

// API status
apiStatus().then((s) => { $("#api-status").textContent = s.hasKey ? `· Claude ${s.model} ready` : "· no API key: local parse"; });

// brief -> spec
$("#btn-brief").onclick = async () => {
  const brief = `Use: ${$("#use").value.trim()}\nGoals:\n${$("#goals").value.trim()}\nConditions on the day: ${($("#conditions") || {}).value || ""}`; if (!$("#use").value.trim()) { $("#brief-status").textContent = "write the use first"; return; }
  $("#brief-status").textContent = "asking Claude…"; $("#btn-brief").disabled = true;
  try {
    const r = await requestSpec(brief);
    spec = normalizeSpec({ ...r.spec, source: `Claude ${r.meta.model}`, pinned: pinnedOf() }); specMeta = { ...r.meta, brief };
    $("#brief-status").textContent = `spec from Claude (${r.meta.usage ? r.meta.usage.input_tokens + "+" + r.meta.usage.output_tokens + " tokens" : "ok"})${r.spec.notes ? " · assumed: " + r.spec.notes : ""}`;
  } catch (e) {
    spec = normalizeSpec({ ...specFromBriefLocal(brief), pinned: pinnedOf() }); specMeta = { model: "local parse", brief, error: String(e.message || e) };
    $("#brief-status").textContent = `local parse (${e.message || e})`;
  }
  $("#btn-brief").disabled = false; actions.specChanged(spec); ui.setSpec(spec); remake();
};
function remake() { seed = Number($("#seed").value) || 11; setPlaying(false); series = null; ui.series = null; sim = buildSimFromSpec(plan, nav, spec, seed); stage.selected = null; ui.select(null); scrub.value = 0; ui.reset(); }
$("#btn-makecast").onclick = remake;
$("#btn-newcast").onclick = remake;

// run-first: compute everything, then open the summary
$("#btn-run").onclick = async () => {
  setPlaying(false); seed = Number($("#seed").value) || 11;
  const n = Math.max(1, Math.min(5, Number($("#runs").value) || 1)); const seeds = Array.from({ length: n }, (_, i) => seed + i * 101);
  const prog = $("#progress"); prog.classList.remove("hidden"); $("#btn-run").disabled = true;
  const t0 = performance.now();
  const res = await computeSeries(plan, nav, spec, seeds, (f, s, running) => { prog.querySelector("i").style.width = Math.round(f * 100) + "%"; $("#progress-text").textContent = `computing seed ${s} · ${Math.round(f * 100)}%`; if (running) ui.sampleThought(running.feed, `gathering feedback: ${running.feed.length} remarks so far`); });
  prog.classList.add("hidden"); $("#btn-run").disabled = false; ui.hideThoughts();
  sim = res.sim; series = res; ui.series = res; scrub.value = sim.t; stage.selected = null; ui.select(null);
  ui.setTab("summary"); ui.reset();
  console.log(`computed ${n} seed(s) in ${Math.round(performance.now() - t0)} ms`);
};

// transport (playback of the recorded run)
let playing = false, loop = false, speed = 60, lastReal = performance.now(), uiTimer = 0;
const btnPlay = $("#btn-play"), scrub = $("#scrub");
function setPlaying(v) { playing = v; btnPlay.innerHTML = v ? "&#10074;&#10074;" : "&#9654;"; btnPlay.classList.toggle("on", v); }
btnPlay.onclick = () => { if (sim.done && !playing) { seekTo(sim, 0); scrub.value = 0; ui.reset(); } setPlaying(!playing); if (!playing) ui.hideThoughts(); };
$("#btn-stop").onclick = () => { setPlaying(false); seekTo(sim, 0); scrub.value = 0; ui.reset(); };
$("#btn-loop").onclick = (e) => { loop = !loop; e.currentTarget.classList.toggle("on", loop); };
$("#btn-again").onclick = () => { setPlaying(false); series = null; ui.series = null; nextRun(sim); scrub.value = 0; ui.reset(); setPlaying(true); ui.setTab("feed"); };
$("#speed").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; speed = Number(b.dataset.speed); $("#speed").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); });
scrub.addEventListener("input", () => { const target = Number(scrub.value); const was = playing; setPlaying(false); seekTo(sim, target); ui.reset(); if (was) setPlaying(true); });
window.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return; if (e.code === "Space") { e.preventDefault(); btnPlay.onclick(); } if (e.key === "Escape") ui.select(null); if (e.key === "f") stage.fit(); });
$("#btn-help").onclick = () => $("#help").classList.toggle("hidden");
$("#btn-help-close").onclick = () => $("#help").classList.add("hidden");
$("#btn-download").onclick = () => { const data = exportRun(sim); data.manifest.spec = spec; data.manifest.specMeta = specMeta; data.manifest.series = series ? { seeds: series.results.map((r) => r.seed), records: series.results.map((r) => r.record), stability: series.stability } : null; const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `studio-day_seed${seed}_run${sim.run}_${fmtClock(sim.t).replace(":", "")}.json`; a.click(); };
// trails and room names stay on; the toggle bar is out of the interface for now (kept in the dated backup)
// the pixel view is the view; the plan drawing is still in stage.js (setMode("plan")) and in the dated backup under backups/
function setStyle(mode) { stage.setMode(mode); document.body.classList.toggle("pixel", mode === "pixel"); }
setStyle("pixel");

function frame(now) {
  const real = Math.min(1.0, (now - lastReal) / 1000); lastReal = now;
  if (playing && !sim.done) { step(sim, speed * real); scrub.value = sim.t; }
  if (sim.done && playing) { if (loop) { seekTo(sim, 0); ui.reset(); } else setPlaying(false); }
  try { stage.draw(sim); uiTimer += real; if (uiTimer > 0.4) { uiTimer = 0; ui.update(playing); } }
  catch (e) { if (!window.__drawErr) { window.__drawErr = e; console.error(e); } }
  requestAnimationFrame(frame);
}
ui.update();
requestAnimationFrame(frame);
window.__dbg = { get sim() { return sim; }, get spec() { return spec; }, get series() { return series; }, nav, plan, stage };
// the front door: the title screen and the tour on the first visit (or ?intro); the intro button replays it
if (shouldShowIntro()) runIntro({ stage, plan, nav });
$("#btn-intro").onclick = () => runIntro({ stage, plan, nav });
$("#btn-tour").onclick = () => { $("#help").classList.add("hidden"); runTour({}); };
