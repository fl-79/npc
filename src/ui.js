// Panels: setup (use, goals, studio, archetype cards, individuals) on the left; the People drawer
// over the stage (list, spotlight, follow, edit, pin); the Summary on the right with findings
// numbered on the plan and the Feed as a drawer beneath it; a paced thoughts box.
import { fmtClock, measures, reviewFor } from "./sim.js";
import { TOPICS } from "./remarks.js";
import { colorFor } from "./stage.js";
import { summarize } from "./summary.js";
import { TRAITS, PATTERNS, normalizeSpec, metricFor, distribution, describeType, parseConditions } from "./spec.js";
const feedOf = (sim) => sim.recordedFeed || sim.feed;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const GROUPS = [
  ["all", "All", () => true],
  ["students", "Students", (p) => p.role === "student"],
  ["profs", "Profs", (p) => p.role !== "student"],
  ["noise", "Noise-sensitive", (p) => p.traits.noise > 0.62],
  ["crowd", "Crowd-sensitive", (p) => p.traits.crowd > 0.62],
  ["bar", "Good Times", (p) => p.goesToBar],
  ["pinned", "Pinned", (p) => p.pinned],
  ["onbreak", "On break now", (p, a) => a.onFloor && (a.state === "dwell" || (a.state === "go" && a.next === "dwell"))],
  ["low", "Low mood", (p, a) => a.mood < 0.4],
];
const PATTERN_TRAITS = {
  focused: { patience: [0.5, 0.9], curiosity: [0.2, 0.7], sociability: [0.1, 0.5], noise: [0.5, 0.9], crowd: [0.3, 0.8], familiarity: [0.2, 0.8] },
  social: { patience: [0.3, 0.8], curiosity: [0.3, 0.8], sociability: [0.6, 0.95], noise: [0.1, 0.5], crowd: [0.1, 0.5], familiarity: [0.3, 0.9] },
  restless: { patience: [0.1, 0.45], curiosity: [0.5, 0.95], sociability: [0.3, 0.8], noise: [0.3, 0.8], crowd: [0.4, 0.9], familiarity: [0.2, 0.8] },
  prof: { patience: [0.3, 0.9], curiosity: [0.4, 0.9], sociability: [0.3, 0.9], noise: [0.2, 0.8], crowd: [0.2, 0.8], familiarity: [0.9, 0.95] },
  office: { patience: [0.4, 0.9], curiosity: [0.3, 0.8], sociability: [0.3, 0.8], noise: [0.3, 0.8], crowd: [0.2, 0.7], familiarity: [0.9, 0.95] },
};

export function createUI(getSim, stage, actions) {
  const ui = { filter: "all", search: "", scope: "all", view: "stream", topic: null, selected: null, series: null, editing: false, spec: null, focusType: null, openCards: {}, openSteps: {}, areas: null, feedOpen: false, lastCastKey: "", lastFeedKey: "", lastSpotKey: "", thoughts: { shown: new Set(), lastAt: -1e9, lastTopic: null } };
  const sections = [...new Set(getSim().cast.people.map((p) => p.section).filter(Boolean))].sort();
  const fdiv = $("#cast-filters");
  fdiv.innerHTML = GROUPS.map(([k, l]) => `<button data-f="${k}" class="${k === "all" ? "on" : ""}">${l}</button>`).join("") + `<select id="sec-filter"><option value="">section</option>${sections.map((s) => `<option value="sec:${s}">${s}</option>`).join("")}</select>`;
  fdiv.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ui.filter = b.dataset.f; $("#sec-filter").value = ""; fdiv.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); renderCast(true); renderFeed(true); });
  $("#sec-filter").addEventListener("change", (e) => { if (e.target.value) { ui.filter = e.target.value; fdiv.querySelectorAll("button").forEach((x) => x.classList.remove("on")); renderCast(true); renderFeed(true); } });
  $("#cast-search").addEventListener("input", (e) => { ui.search = e.target.value.toLowerCase(); renderCast(true); });
  $("#feed-scope").addEventListener("change", (e) => { ui.scope = e.target.value; renderFeed(true); });
  $("#feed-view").addEventListener("change", (e) => { ui.view = e.target.value; if (ui.view === "topics") ui.topic = null; stage.topicPoints = null; renderFeed(true); });
  $("#feed-controls").addEventListener("click", (e) => e.stopPropagation());
  $("#feed-head").addEventListener("click", () => setFeedOpen(!ui.feedOpen));
  $("#cast-list").addEventListener("click", (e) => { const row = e.target.closest(".row"); if (row && row.dataset.id) select(row.dataset.id, true); });
  $("#feed").addEventListener("click", (e) => {
    const tp = e.target.closest(".topic-row"); if (tp) { ui.topic = tp.dataset.topic; ui.view = "stream"; $("#feed-view").value = "stream"; renderFeed(true); return; }
    const clr = e.target.closest(".clear-topic"); if (clr) { ui.topic = null; stage.topicPoints = null; renderFeed(true); return; }
    const ch = e.target.closest(".chip"); if (ch) { ui.topic = ch.dataset.topic || null; if (!ui.topic) stage.topicPoints = null; ui.view = "stream"; $("#feed-view").value = "stream"; renderFeed(true); lastSummaryAt = -1e9; ui.update(false); return; }
    const row = e.target.closest(".remark"); if (row) select(row.dataset.id, true);
  });
  $("#btn-people").addEventListener("click", () => openPeople(!ui.peopleOpen));
  for (const h of document.querySelectorAll(".win-head[data-win]")) h.addEventListener("click", (e) => { if (e.target.closest("button, select, input")) return; const body = $("#" + h.dataset.win); body.classList.toggle("collapsed"); const c = body.classList.contains("collapsed"); h.classList.toggle("collapsed", c); const ar = h.querySelector(".win-arrow"); if (ar) ar.textContent = c ? "▸" : "▾"; });
  $("#summary").addEventListener("click", (e) => {
    const j = e.target.closest(".jump"); if (j) { actions.jump(JSON.parse(j.dataset.jump), j.classList.contains("follow")); return; }
    const area = e.target.closest(".area"); if (area) { toggleArea(area.dataset.area); return; }
    const st = e.target.closest(".step-line"); if (st) { const n = Number(st.dataset.n); ui.openSteps[n] = !ui.openSteps[n]; stage.activeAnnotation = ui.openSteps[n] ? n : null; renderSummary(true); return; }
    const tp = e.target.closest(".sum-topic"); if (tp) { ui.topic = tp.dataset.topic; ui.view = "stream"; $("#feed-view").value = "stream"; setFeedOpen(true); renderFeed(true); return; }
    const runs = e.target.closest(".runs-toggle"); if (runs) { ui.showRuns = !ui.showRuns; renderSummary(true); }
  });
  stage.onAnnotation = (an) => { ui.openSteps[an.n] = true; stage.activeAnnotation = an.n; renderSummary(true); const el = $(`#summary .step-line[data-n="${an.n}"]`); if (el) el.scrollIntoView({ block: "nearest" }); };
  $("#person-select").addEventListener("change", (e) => { if (e.target.value) { openPeople(true); select(e.target.value, true); } });
  $("#btn-pick").addEventListener("click", () => {
    const sim = getSim(); let best = null, bs = -1;
    for (const p of sim.cast.people) { if (p.role !== "student") continue; if (ui.focusType && p.typeId !== ui.focusType) continue; const a = sim.byId[p.id]; const score = a.log.filter((l) => l.topic !== "day").length + (a.onFloor ? 2 : 0) + sim.rng() * 0.5; if (score > bs) { bs = score; best = p.id; } }
    if (best) { openPeople(true); select(best, true); setFollow(true); }
  });
  // archetype cards
  $("#cards").addEventListener("input", (e) => readCards(e));
  $("#cards").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return; const i = Number(b.dataset.i);
    if (b.dataset.act === "edit") { ui.openCards[i] = !ui.openCards[i]; renderCards(); }
    else if (b.dataset.act === "focus") { const t = ui.spec.types[i]; ui.focusType = ui.focusType === t.id ? null : t.id; stage.opts.focusType = ui.focusType; renderCards(); renderFeed(true); }
    else if (b.dataset.act === "del") { ui.spec.types.splice(i, 1); rebalance(null); renderCards(); actions.specChanged(ui.spec); }
  });
  $("#btn-addtype").addEventListener("click", () => {
    const text = $("#newtype").value.trim(); if (!text) return;
    const t = text.toLowerCase(); const pattern = /office/.test(t) ? "office" : /prof|tutor|instructor/.test(t) ? "prof" : /social|chatty|talk/.test(t) ? "social" : /restless|fidget|move|pin-up/.test(t) ? "restless" : "focused";
    const mobility = /wheelchair/.test(t) ? "wheelchair" : /stroller|pram/.test(t) ? "stroller" : /cane|walker/.test(t) ? "cane" : "walking";
    const m = t.match(/(\d{1,3})/); const count = m ? Number(m[1]) : 10;
    const name = text.replace(/\d+/g, "").replace(/\b(students?|people|a|an|of|with|who|the)\b/gi, " ").trim().split(/\s+/).slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "New type";
    const traits = JSON.parse(JSON.stringify(PATTERN_TRAITS[pattern]));
    if (/noise|quiet/.test(t)) traits.noise = [0.7, 0.95]; if (/crowd|space/.test(t)) traits.crowd = [0.7, 0.95]; if (/new|first.year|unfamiliar|visitor/.test(t)) traits.familiarity = [0.05, 0.3];
    ui.spec.types.push({ id: "type" + Date.now(), name, role: pattern === "prof" ? "prof" : pattern === "office" ? "office" : "student", count, pattern, mobility, goesToBar: pattern === "prof" || pattern === "office" ? 0 : 0.35, usesKitchen: 0.65, hasPrintJob: 0.5, traits });
    rebalance(ui.spec.types.length - 1); $("#newtype").value = ""; renderCards(); actions.specChanged(ui.spec);
  });
  $("#studio").addEventListener("input", (e) => readStudio(e));
  $("#goals").addEventListener("input", () => { ui.spec.goals = $("#goals").value.split("\n").map((x) => x.trim()).filter(Boolean).map((text) => ({ text, metric: metricFor(text) })); actions.specChanged(ui.spec); });
  $("#use").addEventListener("input", () => { ui.spec.use = $("#use").value.trim(); actions.specChanged(ui.spec); });

  function openPeople(on) { ui.peopleOpen = on; $("#people").classList.toggle("collapsed", !on); $("#btn-people").classList.toggle("collapsed", !on); const ar = $("#btn-people .win-arrow"); if (ar) ar.textContent = on ? "▾" : "▸"; if (on) { renderCast(true); $("#people").scrollIntoView({ block: "nearest" }); } }
  function setFeedOpen(on) { ui.feedOpen = on; $("#feed-box").classList.toggle("open", on); $("#feed-arrow").textContent = on ? "▾" : "▸"; renderFeed(true); }

  // ---------- setup: studio, archetype cards, distribution, individuals
  function studentTarget() { const s = ui.spec; return s.types.filter((t) => t.role === "student").reduce((n, t) => n + t.count, 0) || getSim().plan.desks.length; }
  function rebalance(keepIndex) {
    const s = ui.spec; const target = ui.studentTarget || studentTarget(); ui.studentTarget = target;
    const st = s.types.map((t, i) => [t, i]).filter(([t]) => t.role === "student");
    const kept = keepIndex != null ? s.types[keepIndex] : null; const keptCount = kept && kept.role === "student" ? Math.min(kept.count, target) : 0;
    const others = st.filter(([t]) => t !== kept); const sum = others.reduce((n, [t]) => n + t.count, 0); const rest = Math.max(0, target - keptCount);
    if (others.length) { let acc = 0; others.forEach(([t], k) => { const v = sum > 0 ? Math.round((t.count / sum) * rest) : Math.round(rest / others.length); t.count = k === others.length - 1 ? Math.max(0, rest - acc) : v; acc += t.count; }); }
    if (kept && kept.role === "student") kept.count = keptCount;
  }
  function setSpec(spec) { ui.spec = normalizeSpec(spec); ui.studentTarget = studentTarget(); $("#use").value = ui.spec.use; $("#goals").value = ui.spec.goals.map((g) => g.text).join("\n"); renderStudio(); renderCards(); }
  function renderStudio() {
    const s = ui.spec.studio;
    const row = (label, key) => `<label class="studio-row"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(s[key] * 100)}" data-k="${key}"><b>${Math.round(s[key] * 100)}%</b></label>`;
    // a note about the day, read for what touches everyone; the sliders show what was read and can be nudged
    $("#studio").innerHTML = `<textarea id="conditions" rows="3" placeholder="Anything about this day that touches everyone: a review coming up, a loud week, how many are new to the floor.">${esc(s.note || "")}</textarea><div class="muted small" id="cond-status">read from the note · drawn per person, whatever their archetype · nudge if needed</div>` + row("deadline pressure", "deadline") + row("noise-sensitive", "noiseShare") + row("crowd-sensitive", "crowdShare") + row("new to the building", "newShare");
  }
  function readStudio(e) {
    if (e.target.id === "conditions") { ui.spec.studio.note = e.target.value; Object.assign(ui.spec.studio, parseConditions(e.target.value)); for (const inp of $("#studio").querySelectorAll("input[type=range]")) { inp.value = Math.round(ui.spec.studio[inp.dataset.k] * 100); inp.nextElementSibling.textContent = inp.value + "%"; } $("#cond-status").textContent = "read from the note · nudge if needed"; actions.specChanged(ui.spec); return; }
    const k = e.target.dataset.k; if (!k) return; $("#cond-status").textContent = "nudged by hand"; ui.spec.studio[k] = Math.max(0, Math.min(1, Number(e.target.value) / 100)); e.target.nextElementSibling.textContent = Math.round(ui.spec.studio[k] * 100) + "%"; if (!ui.spec.source.includes("edited")) ui.spec.source += ", edited"; actions.specChanged(ui.spec); }
  function renderCards() {
    const s = ui.spec; const target = ui.studentTarget || studentTarget(); const plan = getSim().plan;
    $("#cards").innerHTML = s.types.map((t, i) => {
      const share = t.role === "student" ? Math.round((t.count / Math.max(1, target)) * 100) : null; const open = !!ui.openCards[i]; const focus = ui.focusType === t.id; const d = describeType(t);
      const head = `<div class="card-head"><input type="text" value="${esc(t.name)}" data-f="name" data-i="${i}" class="card-name" title="rename"><span class="muted small"><input type="number" min="0" max="200" value="${t.count}" data-f="count" data-i="${i}" class="n"> ${t.role === "student" ? `people · ${share}%` : t.role === "prof" ? "profs" : "in the offices"}</span></div>`;
      const bar = `<input type="range" min="0" max="${t.role === "student" ? 100 : t.role === "prof" ? 12 : 4}" value="${t.role === "student" ? share : t.count}" data-f="${t.role === "student" ? "share" : "count"}" data-i="${i}" class="share" title="${t.role === "student" ? "share of students" : "count"}">`;
      const desc = `<div class="card-desc">${esc(d.sentence)}</div><div class="qualities">${d.qualities.map(([k, v]) => `<span>${esc(k)} <b>${esc(v)}</b></span>`).join("")}</div>`;
      const acts = `<div class="card-actions"><button data-act="edit" data-i="${i}" class="${open ? "on" : ""}">${open ? "done" : "edit"}</button><button data-act="focus" data-i="${i}" class="${focus ? "on" : ""}">${focus ? "focused" : "focus"}</button>${s.types.length > 1 ? `<button data-act="del" data-i="${i}" title="remove">×</button>` : ""}</div>`;
      const edit = open ? `<div class="card-edit"><label>pattern <select data-f="pattern" data-i="${i}">${Object.keys(PATTERNS).map((p) => `<option ${p === t.pattern ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>access <select data-f="mobility" data-i="${i}">${["walking", "wheelchair", "stroller", "cane"].map((p) => `<option ${p === t.mobility ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>Good Times % <input type="number" min="0" max="100" value="${Math.round(t.goesToBar * 100)}" data-f="goesToBar" data-i="${i}" class="n"></label><label>kitchen % <input type="number" min="0" max="100" value="${Math.round(t.usesKitchen * 100)}" data-f="usesKitchen" data-i="${i}" class="n"></label><label>prints % <input type="number" min="0" max="100" value="${Math.round(t.hasPrintJob * 100)}" data-f="hasPrintJob" data-i="${i}" class="n"></label>${["patience", "curiosity", "sociability"].map((k) => `<label>${k} <span class="rng"><input type="number" min="0" max="1" step="0.05" value="${t.traits[k][0]}" data-trait="${k}" data-j="0" data-i="${i}"><input type="number" min="0" max="1" step="0.05" value="${t.traits[k][1]}" data-trait="${k}" data-j="1" data-i="${i}"></span></label>`).join("")}<div class="muted small" style="grid-column:1/3">noise, crowding and familiarity come from the studio sliders above</div></div>` : "";
      return `<div class="card ${focus ? "focus" : ""}">${head}${bar}${desc}${acts}${edit}</div>`;
    }).join("");
    const students = target; const profs = s.types.filter((t) => t.role === "prof").reduce((n, t) => n + t.count, 0); const office = s.types.filter((t) => t.role === "office").reduce((n, t) => n + t.count, 0);
    $("#spec-source").textContent = `${s.source} · ${students} students, ${profs} profs, ${office} in offices`;
    const warn = []; const offices = plan.rooms.filter((r) => /office/i.test(r.name)).length; const secs = plan.sections.count;
    for (const t of s.types) if (t.role === "student" && t.count / Math.max(1, target) > 0.6) warn.push(`Most of the studio is ${t.name.toLowerCase()}: a bias toward one working style.`);
    if (office > offices) warn.push(`Only ${offices} offices on this floor; ${office - offices} office prof${office - offices > 1 ? "s have" : " has"} nowhere to sit.`);
    if (profs < secs) warn.push(`${secs} sections and ${profs} profs: ${secs - profs} section${secs - profs > 1 ? "s get" : " gets"} no crit.`);
    if (profs > secs) warn.push(`${profs} profs for ${secs} sections: the extra ones have no section.`);
    if (students > plan.desks.length) warn.push(`${students} students for ${plan.desks.length} desks: ${students - plan.desks.length} have no desk.`);
    $("#warnings").innerHTML = warn.map((w) => `<div class="warn">⚠ ${esc(w)}</div>`).join("");
  }
  function readCards(e) {
    const el = e.target; const i = Number(el.dataset.i); const t = ui.spec.types[i]; if (!t) return; const f = el.dataset.f;
    if (el.dataset.trait) { t.traits[el.dataset.trait][Number(el.dataset.j)] = Math.max(0, Math.min(1, Number(el.value) || 0)); }
    else if (f === "name") t.name = el.value;
    else if (f === "count") { t.count = Math.max(0, Math.round(Number(el.value) || 0)); if (t.role === "student") rebalance(i); if (el.type === "number") renderCards(); else renderCards(); }
    else if (f === "share") { const target = ui.studentTarget || studentTarget(); t.count = Math.round((Number(el.value) / 100) * target); rebalance(i); renderCards(); }
    else if (f === "pattern") { t.pattern = el.value; t.role = el.value === "prof" ? "prof" : el.value === "office" ? "office" : "student"; renderCards(); }
    else if (f === "mobility") { t.mobility = el.value; renderCards(); }
    else if (f) { t[f] = Math.max(0, Math.min(1, (Number(el.value) || 0) / 100)); }
    if (!ui.spec.source.includes("edited")) ui.spec.source += ", edited";
    actions.specChanged(ui.spec);
  }
  function renderDistribution() {
    const sim = getSim(); const d = distribution(sim.cast);
    const hists = ["patience", "sociability", "noise", "crowd"].map((k) => { const h = d.hist[k]; const m = Math.max(1, ...h); return `<div class="hist-box"><div class="muted small">${k}</div><div class="hist-bars">${h.map((v) => `<i style="height:${Math.round((v / m) * 22) + 1}px"></i>`).join("")}</div></div>`; }).join("");
    $("#distribution").innerHTML = `<div class="muted small">${d.total} people this cast: ${Object.entries(d.byType).map(([k, n]) => `${esc(k)} ${n}`).join(" · ")}</div><div class="hists">${hists}</div>`;
    const sel = $("#person-select"); const cur = sel.value;
    sel.innerHTML = `<option value="">pick a person</option>` + sim.cast.people.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}">${esc(p.name)}${p.pinned ? " ●" : ""} · ${esc(p.role === "prof" ? "prof " + p.section : p.typeName || p.style)}</option>`).join("");
    sel.value = cur;
  }

  // ---------- people list
  function matches(p, a) {
    if (ui.search && !p.name.toLowerCase().includes(ui.search)) return false;
    if (ui.focusType && p.typeId !== ui.focusType) return false;
    const f = ui.filter; if (f.startsWith("sec:")) return p.section === f.slice(4);
    const g = GROUPS.find((x) => x[0] === f); return g ? g[2](p, a) : true;
  }
  function renderCast(force) {
    if (!ui.peopleOpen) return;
    const sim = getSim(); const rows = []; let n = 0;
    for (const p of sim.cast.people) { const a = sim.byId[p.id]; if (!matches(p, a)) continue; n++; if (rows.length < 80) rows.push({ p, a }); }
    const key = rows.map(({ p, a }) => p.id + a.state + (a.mood * 10 | 0) + (p.id === ui.selected)).join("|") + n;
    if (!force && key === ui.lastCastKey) return; ui.lastCastKey = key;
    $("#cast-count").textContent = `${n} of ${sim.cast.people.length}`;
    $("#cast-list").innerHTML = rows.map(({ p, a }) => `<div class="row ${p.id === ui.selected ? "sel" : ""}" data-id="${p.id}"><span class="dot ${p.role}" style="background:${colorFor(p)};opacity:${0.3 + 0.7 * a.mood}"></span><span class="name">${esc(p.name)}${p.pinned ? " ●" : ""}</span><span class="state">${esc(shortState(a))}</span></div>`).join("") + (n > rows.length ? `<div class="row muted">and ${n - rows.length} more; narrow the group</div>` : "");
  }
  function shortState(a) { if (!a.onFloor) return a.leftAt != null && a.returnT == null ? "left" : a.returnT != null ? "out" : "not yet"; if (a.inCrit || a.state === "crit") return "crit"; if (a.state === "bar") return "bar"; if (a.state === "sit") return "sitting"; if (a.state === "setup") return "setting up"; if (a.state === "queue") return "in line"; if (a.state === "work") return "desk"; if (a.state === "dwell") return "break"; if (a.state === "wait") return "waiting"; return "walking"; }

  // ---------- spotlight, follow, editing
  function setFollow(on) {
    stage.follow = on; stage.opts.followDim = on;
    if (on) { ui.scope = "spotlight"; $("#feed-scope").value = "spotlight"; } else if (ui.scope === "spotlight") { ui.scope = "all"; $("#feed-scope").value = "all"; }
    renderSpotlight(true); renderFeed(true);
  }
  function select(id, center) {
    ui.selected = id; stage.selected = id; ui.editing = false; const sim = getSim();
    if (!id) setFollow(false);
    if (id && center) { const a = sim.byId[id]; if (a && a.onFloor) stage.centerOn(a.x, a.y); else { const p = sim.personById[id]; if (p && p.seat) stage.centerOn(p.seat[0], p.seat[1]); } }
    $("#person-select").value = id || "";
    renderCast(true); renderSpotlight(true); renderFeed(true);
  }
  function renderSpotlight(force) {
    const box = $("#spotlight"); const sim = getSim();
    if (!ui.selected) { box.classList.add("hidden"); return; }
    const p = sim.personById[ui.selected], a = sim.byId[ui.selected]; if (!p || !a) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const key = p.id + a.state + a.activity + (a.mood * 50 | 0) + sim.done + stage.follow + a.log.length + ui.editing + p.pinned; if (!force && key === ui.lastSpotKey) return; ui.lastSpotKey = key;
    const tr = ui.editing
      ? TRAITS.map((k) => `<div class="trait"><span style="width:62px">${k}</span><input type="range" min="0" max="1" step="0.05" value="${(k === "familiarity" ? a.familiarity : p.traits[k]).toFixed(2)}" data-edit="${k}"></div>`).join("") + `<div class="trait"><span style="width:62px">pattern</span><select data-edit="style">${["focused", "social", "restless"].map((s) => `<option ${s === p.style ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="trait"><span style="width:62px">Good Times</span><input type="checkbox" data-edit="goesToBar" ${p.goesToBar ? "checked" : ""}></div>`
      : Object.entries(p.traits).map(([k, v]) => `<div class="trait"><span style="width:62px">${k}</span><span class="bar"><i style="width:${Math.round((k === "familiarity" ? a.familiarity : v) * 100)}%"></i></span></div>`).join("");
    const rv = sim.done || (!a.onFloor && a.leftAt != null && a.returnT == null) ? reviewFor(p, a) : null;
    const day = a.log.filter((l) => l.topic !== "day" || l.kind === "arrive" || l.kind === "leave").slice(-10).reverse();
    box.innerHTML = `<h3>${esc(p.name)}${p.pinned ? ' <span class="muted">● pinned</span>' : ""}</h3><div class="meta">${p.role === "prof" ? `prof, section ${p.section}` : p.role === "office" ? "office prof" : `${esc(p.typeName || p.style)}, section ${p.section}`}<br>${esc(p.background)}</div>
      <div><b>${esc(a.activity)}</b> <span class="muted">· ${esc(a.onFloor ? sim.plan.placeName(a.x, a.y) : "")}</span></div>
      <canvas class="spark" id="spark"></canvas>
      <div class="traits ${ui.editing ? "editing" : ""}">${tr}</div>
      <div class="muted">walked ${Math.round(a.walked)} m · ${a.breaks} breaks · ${a.critsDone} crit${a.critsMissed ? ` · ${a.critsMissed} missed` : ""}${p.goesToBar ? " · Good Times: yes" : ""}${a.queueWait != null ? ` · line ${Math.round(a.queueWait / 60)} min` : ""}${a.satIn ? ` · sat in ${esc(a.satIn)}` : ""}</div>
      <div class="spot-actions"><button id="btn-follow" class="${stage.follow ? "on" : ""}">${stage.follow ? "following" : "follow"}</button>${p.role === "student" ? (ui.editing ? `<button id="btn-save">save and pin</button><button id="btn-cancel">cancel</button>` : `<button id="btn-edit">edit</button>`) : ""}<button id="btn-unselect">close</button></div>
      ${ui.editing ? `<div class="muted small">Changes apply to the next run or new cast; the group stays as it is.</div>` : ""}
      ${day.length && !ui.editing ? `<div class="day"><div class="muted">Day so far</div>${day.map((l) => `<div class="day-row"><span class="muted">${fmtClock(l.t)}</span> <span class="topic-tag">${esc(l.topic)}</span> ${esc(l.because || l.kind)}</div>`).join("")}</div>` : ""}
      ${rv && !ui.editing ? `<div class="review"><div class="stars">${"★".repeat(rv.rating)}${"☆".repeat(5 - rv.rating)} <span class="muted">from mean mood ${rv.meanMood.toFixed(2)} (computed)</span></div>${rv.lines.map((l) => `<div>${esc(l)}</div>`).join("")}<div class="muted">Would change: ${esc(rv.change)}</div><span class="tag infer">inferred</span></div>` : ""}`;
    $("#btn-follow").onclick = () => setFollow(!stage.follow);
    $("#btn-unselect").onclick = () => select(null);
    const ed = $("#btn-edit"); if (ed) ed.onclick = () => { ui.editing = true; renderSpotlight(true); };
    const cancel = $("#btn-cancel"); if (cancel) cancel.onclick = () => { ui.editing = false; renderSpotlight(true); };
    const save = $("#btn-save"); if (save) save.onclick = () => {
      const o = { traits: {} }; box.querySelectorAll("[data-edit]").forEach((el) => { const k = el.dataset.edit; if (k === "style") o.style = el.value; else if (k === "goesToBar") o.goesToBar = el.checked; else o.traits[k] = Number(el.value); });
      actions.pin(p.id, o); ui.editing = false; renderSpotlight(true); renderDistribution();
    };
    drawSpark($("#spark"), a);
  }
  function drawSpark(cv, a) {
    const dpr = window.devicePixelRatio || 1; const w = cv.clientWidth || 240, h = 34; cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext("2d"); c.scale(dpr, dpr);
    c.strokeStyle = "#e6e5e0"; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    const pts = a.moodHist.concat([[getSim().t, a.mood]]); if (pts.length < 2) return;
    c.beginPath(); pts.forEach(([t, m], i) => { const x = (t / 21600) * w, y = h - 2 - m * (h - 4); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = "#1f1f1d"; c.lineWidth = 1.5; c.stroke();
  }

  // ---------- feed drawer
  function inScope(sim, r) {
    const s = ui.scope; const p = sim.personById[r.id];
    if (ui.focusType && p.typeId !== ui.focusType && s !== "spotlight") return false;
    if (s === "spotlight") return r.id === ui.selected;
    if (s === "group") return matches(p, sim.byId[r.id]);
    if (s === "profs") return r.role !== "student";
    if (s === "low") return r.mood < 0.4;
    return true;
  }
  function renderFeed(force) {
    const sim = getSim(); const feed = feedOf(sim);
    $("#feed-count").textContent = feed.length ? `${feed.filter((r) => r.t <= sim.t).length} of ${feed.length} remarks` : "";
    if (ui.view === "topics") {
      const counts = {}, latest = {}, people = {};
      for (const r of feed) { if (!inScope(sim, r) || r.topic === "day") continue; counts[r.topic] = (counts[r.topic] || 0) + 1; (latest[r.topic] ||= []).unshift(r); (people[r.topic] ||= new Set()).add(r.id); }
      const key = "topics" + JSON.stringify(counts) + ui.scope; if (!force && key === ui.lastFeedKey) return; ui.lastFeedKey = key;
      const rows = TOPICS.filter((t) => counts[t]).sort((a, b) => counts[b] - counts[a]);
      $("#feed").innerHTML = rows.map((t) => `<div class="topic-row" data-topic="${t}"><div class="who"><b>${esc(t)}</b> <span class="muted">${counts[t]} remarks · ${people[t].size} people</span></div>${latest[t].slice(0, 2).map((r) => `<div class="text">"${esc(r.text)}" <span class="muted">${esc(r.name)}</span></div>`).join("")}</div>`).join("") || `<div class="remark muted">No remarks about the space yet. Press Run.</div>`;
      return;
    }
    const limit = ui.feedOpen ? 80 : 6;
    const items = []; for (let i = feed.length - 1; i >= 0 && items.length < limit; i--) { const r = feed[i]; if (r.t > sim.t) continue; if (!inScope(sim, r)) continue; if (ui.topic && r.topic !== ui.topic) continue; items.push(r); }
    const key = (items[0] ? items[0].t + items[0].id : "") + items.length + ui.scope + ui.selected + ui.topic + ui.feedOpen; if (!force && key === ui.lastFeedKey) return; ui.lastFeedKey = key;
    stage.topicPoints = ui.topic ? feed.filter((r) => r.topic === ui.topic && inScope(sim, r)).map((r) => [r.x, r.y]) : null;
    // topic chips: a filter for the chat; the active topic is also marked on the plan
    const counts = {}; for (const r of feed) { if (r.t > sim.t || r.topic === "day" || !inScope(sim, r)) continue; counts[r.topic] = (counts[r.topic] || 0) + 1; }
    const present = TOPICS.filter((tp) => counts[tp]);
    const head = `<div class="feed-filters"><button class="chip ${ui.topic ? "" : "on"}" data-topic="">all</button>${present.map((tp) => `<button class="chip ${ui.topic === tp ? "on" : ""}" data-topic="${tp}">${esc(tp)} <b>${counts[tp]}</b></button>`).join("")}</div>`;
    // a chat: an avatar square with the initial, the name and time, the remark in a speech box; the fact line when open
    $("#feed").innerHTML = head + (items.map((r) => `<div class="remark msg" data-id="${r.id}"><span class="avatar ${r.role}" style="background:${colorFor(sim.personById[r.id])}">${esc(r.name[0])}</span><div class="msg-body"><div class="who"><b>${esc(r.name)}</b> <span class="muted">${fmtClock(r.t)} · ${esc(r.place)}</span><span class="topic-tag">${esc(r.topic)}</span></div><div class="bubble"><div class="text">${esc(r.text)}</div>${ui.feedOpen && r.because ? `<div class="because">because: ${esc(r.because)}</div>` : ""}</div></div></div>`).join("") || `<div class="remark muted">Nothing here yet.</div>`);
  }

  // ---------- summary: concise, with findings as annotations on the plan
  let lastSummaryAt = -1e9;
  function toggleArea(area) { if (!ui.areas) ui.areas = new Set(stage.annotations.map((a) => a.topic)); if (ui.areas.has(area)) ui.areas.delete(area); else ui.areas.add(area); stage.areaFilter = ui.areas; renderSummary(true); }
  function renderSummary(force) {
    const now = performance.now(); if (!force && now - lastSummaryAt < 5000) return; lastSummaryAt = now;
    const sim = getSim(); const S = sim.recordedSummary && sim.recordedSummary.run === sim.run ? sim.recordedSummary : summarize(sim); const h = S.headline; const series = ui.series;
    stage.annotations = S.steps.map((s, i) => s.jump ? { n: i + 1, x: s.jump.x, y: s.jump.y, topic: s.topic, label: shortLabel(s) } : null).filter(Boolean);
    const topicsPresent = [...new Set(stage.annotations.map((a) => a.topic))];
    if (ui.areas) { for (const t of topicsPresent) if (!ui.areasSeen?.has(t)) ui.areas.add(t); } ui.areasSeen = new Set(topicsPresent); stage.areaFilter = ui.areas;
    const jumpBtn = (j) => (j ? `<button class="jump" data-jump='${esc(JSON.stringify(j))}' title="Jump the playback there">▶ ${esc(j.label)}</button>${j.id ? `<button class="jump follow" data-jump='${esc(JSON.stringify(j))}' title="Jump there and follow this person">follow ${esc((sim.personById[j.id] || {}).name || "them")}</button>` : ""}` : "");
    const glyph = (v) => ({ met: "✓", partly: "◐", "not met": "✗", "not run": "·", "not testable": "?" }[v] || "·");
    const nOf = (text, kind) => { if (!series || series.stability.n < 2) return ""; if (kind === "goal") { const e = series.stability.goals.find((x) => x.text === text); return e ? ` <span class="muted">${Object.entries(e.verdicts).map(([k, v]) => `${k} ${v}/${series.stability.n}`).join(", ")}</span>` : ""; } const e = series.stability.steps.find((x) => x.title === text); return ` <span class="muted">${e ? e.count : 0}/${series.stability.n}</span>`; };
    const areas = topicsPresent.length ? `<div class="areas">show: ${topicsPresent.map((t) => `<button class="area ${!ui.areas || ui.areas.has(t) ? "on" : ""}" data-area="${t}">${esc(t)}</button>`).join("")}</div>` : "";
    const goals = S.goals.length ? S.goals.map((g) => `<div class="goal-line ${g.verdict.replace(/ /g, "-")}"><span class="glyph">${glyph(g.verdict)}</span><span class="gtext">${esc(g.text)}${nOf(g.text, "goal")}</span>${g.jump && sim.t > 3600 ? `<button class="jump mini" data-jump='${esc(JSON.stringify(g.jump))}' title="${esc(g.fact)}">▶</button>` : ""}</div><div class="goal-fact muted">${esc(g.fact)}</div>`).join("") : `<div class="goal-line muted">No goals yet. Add them in Setup.</div>`;
    const quotes = (topic) => feedOf(sim).filter((r) => r.topic === topic).slice(-2).map((r) => `<div class="quote">"${esc(r.text)}" <span class="muted">${esc(r.name)}, ${fmtClock(r.t)}</span></div>`).join("");
    // two groups: what people experienced during the day (working time first, after hours below), and what the plan alone says
    let lastBasis = null;
    const steps = S.steps.length ? S.steps.map((s, i) => { const n = i + 1; const open = !!ui.openSteps[n]; let head = ""; if (s.basis !== lastBasis) { lastBasis = s.basis; head = `<div class="step-group muted small">${s.basis === "plan" ? "From the plan alone · geometry, before anyone walks it" : "From how people experienced the day"}</div>`; } return `${head}<div class="step-line ${open ? "open" : ""}" data-n="${n}"><span class="num">${n}</span><span class="stitle">${esc(s.title)}${nOf(s.title, "step")}${s.after ? ` <span class="tag after">after hours</span>` : ""}</span><span class="muted">${open ? "▾" : "▸"}</span></div>${open ? `<div class="step-body">${s.points ? `<ul class="points">${s.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>` : `<div class="detail">${esc(s.detail)}</div>`}${s.who ? `<div class="who-felt"><b>Who felt it:</b> ${esc(s.who)}</div>` : ""}${jumpBtn(s.jump)}${quotes(s.topic)}<span class="tag infer">${s.basis === "plan" ? "computed from the plan" : "inferred from the run"}</span></div>` : ""}`; }).join("") : `<div class="goal-line muted">Nothing to recommend yet. Press Run.</div>`;
    const topics = S.topics.length ? `<div class="sum-topics">${S.topics.map((t) => `<button class="chip sum-topic ${ui.topic === t.topic ? "on" : ""}" data-topic="${t.topic}" title="Filter the feed to this topic">${esc(t.topic)} <b>${t.count}</b></button>`).join("")}</div>` : "";
    const rows = (series ? series.results.map((r) => ({ ...r.record, run: `seed ${r.seed}` })) : []).concat(S.history.map((r) => ({ ...r, run: `run ${r.run}` })));
    const runs = rows.length ? `<div class="runs-toggle muted small">${ui.showRuns ? "▾" : "▸"} ${rows.length} other run${rows.length === 1 ? "" : "s"}</div>${ui.showRuns ? `<div class="hist"><table><tr><th>run</th><th>kitchen</th><th>line</th><th>from</th><th>wait</th><th>printer</th><th>no seat</th><th>bunch</th><th>lost</th><th>missed</th></tr>${rows.map((r) => `<tr><td>${esc(r.run)}</td><td>${r.kitchenMax}</td><td>${r.lineMax}</td><td>${r.lineStart ?? "–"}</td><td>${r.meanWait != null ? Math.round(r.meanWait) : "–"}</td><td>${r.printerWaits}</td><td>${r.noSeat ?? "–"}</td><td>${r.crowd}</td><td>${r.lost}</td><td>${r.missed}</td></tr>`).join("")}</table></div>` : ""}` : "";
    $("#summary").innerHTML = `<div class="sum-head"><b>Run ${S.run}</b> <span class="muted">· ${fmtClock(sim.t)} · ${h.people} people${series && series.stability.n > 1 ? ` · ${series.stability.n} seeds` : ""} · ${h.remarks} remarks</span></div>${areas}<div class="sum-section">Goals</div>${goals}<div class="sum-section">Next steps <span class="muted">numbered on the plan</span></div>${steps}<div class="sum-section">What people said <span class="muted">a topic filters the feed</span></div>${topics || `<div class="muted small" style="padding:0 8px">Nothing yet.</div>`}${runs}`;
  }
  function shortLabel(s) { const j = s.jump; return j ? j.label.replace(/^(the |a )/, "") : s.topic; }

  // ---------- thoughts box: one remark at a time, paced
  function showThought(r, note) {
    const box = $("#thoughts"); if (!r) { if (note) { box.classList.remove("hidden"); box.innerHTML = `<div class="muted small">${esc(note)}</div>`; } return; }
    box.classList.remove("hidden"); stage.spotRemark = r;
    // the running comment: the remark in full, who and where, and the tally of what people have said so far
    const sim = getSim(); const feed = sim.recordedFeed || sim.feed; const tally = {}; for (const q of feed) { if (q.t > sim.t || q.topic === "day") continue; tally[q.topic] = (tally[q.topic] || 0) + 1; }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(" · ");
    box.innerHTML = `<div class="th-who"><b>${esc(r.name)}</b> <span class="muted">${esc(r.place)} · ${fmtClock(r.t)}${note ? ` · ${esc(note)}` : ""}</span></div><div class="th-text">${esc(r.text)}</div>${top ? `<div class="th-tally muted small">so far: ${esc(top)}</div>` : ""}`;
    box.classList.remove("pulse"); void box.offsetWidth; box.classList.add("pulse");
  }
  function tickThoughts(playing) {
    const th = ui.thoughts; const now = performance.now(); if (now - th.lastAt < 3000) return;
    const sim = getSim(); if (!playing) return;
    let pick = null; const feed = feedOf(sim);
    for (let i = feed.length - 1; i >= 0 && !pick; i--) { const r = feed[i]; if (r.t > sim.t || r.topic === "day") continue; if (th.shown.has(r.t + r.id)) break; if (ui.selected && stage.follow && r.id !== ui.selected) continue; if (ui.focusType && sim.personById[r.id].typeId !== ui.focusType) continue; pick = r; }
    if (!pick) return; th.shown.add(pick.t + pick.id); th.lastAt = now; showThought(pick);
  }
  ui.showThought = showThought; ui.tickThoughts = tickThoughts;
  ui.sampleThought = (feed, note) => { const th = ui.thoughts; const now = performance.now(); if (now - th.lastAt < 3000 || !feed.length) return; const cands = feed.filter((r) => r.topic !== "day" && r.topic !== th.lastTopic); const r = cands[Math.floor(Math.random() * cands.length)] || feed[feed.length - 1]; th.lastTopic = r.topic; th.lastAt = now; showThought(r, note); };
  ui.hideThoughts = () => $("#thoughts").classList.add("hidden");

  function renderMeasures() {
    const sim = getSim(); const m = measures(sim);
    $("#clock").textContent = "Fri " + fmtClock(sim.t);
    $("#run-label").textContent = `run ${sim.run}`;
    $("#measures").innerHTML = `<span><b>${m.onFloor}</b> on the floor</span>${m.inLine + m.atBar + m.sitting ? `<span><b>${m.inLine + m.atBar + m.sitting}</b> at Good Times</span>` : ""}<span class="muted">${m.left} gone home</span>`;
  }
  ui.select = select; ui.setFollow = setFollow; ui.openPeople = openPeople; ui.setFeedOpen = setFeedOpen; ui.setSpec = setSpec; ui.renderDistribution = renderDistribution;
  ui.setTab = () => {}; ui.setLeftTab = () => {};
  ui.update = (playing) => { renderMeasures(); renderCast(false); renderSpotlight(false); renderFeed(false); renderSummary(false); tickThoughts(playing); };
  ui.reset = () => { ui.lastCastKey = ""; ui.lastFeedKey = ""; ui.lastSpotKey = ""; ui.openSteps = {}; stage.activeAnnotation = null; stage.topicPoints = null; lastSummaryAt = -1e9; ui.thoughts.shown.clear(); renderDistribution(); ui.update(false); };
  return ui;
}
