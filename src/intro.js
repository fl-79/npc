// The front door: a title screen in the game's idiom, then a tour that points at the real interface.
// Title: "NPC", a subtitle, a blinking PRESS START, and behind it one person walking real paths across
// the floor at close range, leaving a trail. Start opens the tour: a red guide box slides to each part of
// the tool with a caption; Next, Back, Skip. Shown on the first visit, on ?intro, or from the intro button.
import { exportMap, TILE_M, PPM } from "./pixel.js";

const STEPS = [
  { sel: "#use", title: "What is being tested", text: "Start with one line about the day you want to test: what kind of day it is, roughly how many people are in, and what happens. By default it is a typical Friday on Lasserre Level 3, with about 175 people, desk crits through the afternoon, and Good Times from 6:30." },
  { sel: "#goals", title: "The design goals", text: "Write one goal per line. At the end of a run, each goal is answered with a measurement: how easily every desk reaches the amenities, and whether the layout supports collaboration, working and learning." },
  { sel: "#conditions", title: "Conditions on the day", text: "Describe anything that affects everyone on the floor: a review coming up, a loud or busy week, how many people are new to the building. The sliders underneath show what was read from your note, and you can adjust them.", scroll: true },
  { sel: "#setup .card", title: "The group", text: "The people are generated from archetypes. Each card gives a count, a short description and the qualities that shape behaviour. You can edit a card, add a new archetype from a sentence, or let the API propose the whole group from your brief.", scroll: true },
  { sel: "#btn-people", title: "People", text: "This window lists everyone on the floor by name. Find a person, spotlight them, follow their day on the plan, or pin a change to them." },
  { sel: "#btn-run", title: "Run", text: "Run computes the whole afternoon before anything plays, for one seed or several. Run again keeps the same people, who remember the space from last time; New cast draws a different group." },
  { sel: "#summary", title: "The summary", text: "After a run, the summary answers each goal with the numbers behind it, then lists next steps for the layout. Each step is numbered on the plan, explains what was measured and what to do about it, and jumps to the moment it came from." },
  { sel: "#feed-box", title: "The feed", text: "The feed collects every remark people make about the space, as a chat. Filter it by topic or by who is speaking. While the day plays, the box in the corner of the plan shows remarks as they happen." },
  { sel: "#transport", title: "The day", text: "Play, pause, change the speed and scrub through the afternoon. Click anyone on the plan to follow them; the trails show where everyone has been." },
];

export function shouldShowIntro() { try { if (location.search.includes("intro")) return true; return localStorage.getItem("npc-intro") !== "seen"; } catch { return true; } }

export function runIntro({ stage, plan, nav, onDone }) {
  const px = stage.pixel; if (!px) { onDone?.(); return; }
  const map = exportMap(px);
  const root = document.createElement("div"); root.id = "intro"; root.innerHTML = `
    <canvas id="intro-canvas"></canvas>
    <div class="intro-shade"></div>
    <div class="intro-title">
      <div class="intro-npc">NPC</div>
      <div class="intro-sub">An Occupant Simulation Tool</div>
      <div class="intro-sub2">Studio Day at SALA · Lasserre Level 3</div>
      <button class="intro-start" id="intro-start">Click anywhere to start</button>
      <div class="intro-hint">or press Enter · <a id="intro-skip">skip the intro</a></div>
    </div>
    <div class="intro-foot">UBC ARCH 540 · a proof of concept · the plan is real, the people are not</div>`;
  document.body.appendChild(root);

  // ---- the walker: a person on real paths between real places, the camera on them
  const cv = root.querySelector("#intro-canvas"); const g = cv.getContext("2d");
  const places = [];
  for (const e of plan.entries || []) if (/stair/i.test(e.name)) places.push(e.point);
  if (plan.kitchen) places.push([(plan.kitchen.bounds[0] + plan.kitchen.bounds[2]) / 2, (plan.kitchen.bounds[1] + plan.kitchen.bounds[3]) / 2]);
  for (const pl of (plan.plotters || []).slice(0, 1)) places.push([(pl.bbox[0] + pl.bbox[2]) / 2, pl.bbox[1] - 0.8]);
  if (plan.bar) places.push(plan.bar.center);
  for (const d of (plan.desks || []).filter((_, i) => i % 37 === 0).slice(0, 4)) places.push(d.seat);
  const free = (p) => nav.nearestFree(p[0], p[1], 2.5) || p;
  const person = { id: "intro-walker", role: "student", style: "social", typeId: "social" };
  let path = null, seg = 0, segT = 0, pos = null, dir = "down", trail = [], target = -1; const SPEED = 1.5; // m/s on screen
  const nextPath = () => { for (let k = 0; k < 8; k++) { const i = Math.floor(Math.random() * places.length); if (i === target || places.length < 2) continue; const from = pos || free(places[(i + 1) % places.length]); const p = nav.findPath(from, free(places[i])); if (p && p.length > 1) { target = i; path = p; seg = 0; segT = 0; pos = [p[0][0], p[0][1]]; return; } } path = null; };
  nextPath();
  let last = performance.now(); let zoom = 3; let raf = 0; let frameN = 0;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; zoom = innerWidth > 1100 ? 3 : 2; };
  resize(); addEventListener("resize", resize);
  const draw = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; frameN++;
    if (path) {
      const a = path[seg], b = path[seg + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6; segT += (SPEED * dt) / len;
      while (segT >= 1) { segT -= 1; seg++; if (seg >= path.length - 1) { seg = path.length - 2; segT = 1; trail.length = 0; nextPath(); break; } }
      if (path) { const a2 = path[seg], b2 = path[seg + 1]; pos = [a2[0] + (b2[0] - a2[0]) * segT, a2[1] + (b2[1] - a2[1]) * segT]; const dx = b2[0] - a2[0], dy = b2[1] - a2[1]; dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "up" : "down"); if (!trail.length || Math.hypot(trail[trail.length - 1][0] - pos[0], trail[trail.length - 1][1] - pos[1]) > 0.3) trail.push([pos[0], pos[1]]); }
    } else nextPath();
    const p = pos || [17, -10];
    // the camera: the walker a little below centre, so the title has the upper half
    const cx = Math.round(px.nx(p[0])), cy = Math.round(px.ny(p[1]));
    const ox = Math.round(cv.width / 2 - cx * zoom), oy = Math.round(cv.height * 0.62 - cy * zoom);
    g.imageSmoothingEnabled = false; g.fillStyle = "#12181e"; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(map, ox, oy, map.width * zoom, map.height * zoom);
    if (trail.length > 1) { g.strokeStyle = "rgba(201,85,63,0.85)"; g.lineWidth = Math.max(2, zoom); g.beginPath(); trail.forEach(([x, y], i) => { const sx = ox + px.nx(x) * zoom, sy = oy + px.ny(y) * zoom; i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.lineTo(ox + cx * zoom, oy + cy * zoom); g.stroke(); }
    const spr = px.personSprite(person, dir, Math.floor(now / 160) % 2, false, false);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(ox + (cx - 5) * zoom, oy + (cy - 2) * zoom, 10 * zoom, 2 * zoom);
    g.drawImage(spr, ox + (cx - 8) * zoom, oy + (cy - 24) * zoom, 16 * zoom, 24 * zoom);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  // ---- start, skip, keys
  const finish = () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("keydown", onKey); root.remove(); try { localStorage.setItem("npc-intro", "seen"); } catch {} onDone?.(); };
  const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); begin(); } if (e.key === "Escape") finish(); };
  addEventListener("keydown", onKey);
  root.querySelector("#intro-skip").addEventListener("click", (e) => { e.stopPropagation(); finish(); });
  root.querySelector("#intro-start").addEventListener("click", (e) => { e.stopPropagation(); begin(); });
  root.querySelector(".intro-title").addEventListener("click", (e) => { if (e.target.closest("a, button")) return; begin(); });
  root.querySelector(".intro-shade").addEventListener("click", begin);
  let began = false;
  function begin() { if (began) return; began = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("keydown", onKey); root.remove(); runTour({ onDone: () => { try { localStorage.setItem("npc-intro", "seen"); } catch {} onDone?.(); } }); }
}

// ---- the tour: the guide box on the real interface, a caption with Back, Next, Skip
export function runTour({ onDone }) {
  const $ = (s) => document.querySelector(s);
  const guide = document.createElement("div"); guide.id = "tour-guide"; guide.innerHTML = "<b></b>"; document.body.appendChild(guide);
  const cap = document.createElement("div"); cap.id = "tour-cap"; cap.className = "speech"; document.body.appendChild(cap);
  let i = 0;
  const place = () => {
    const s = STEPS[i]; const el = $(s.sel);
    if (el && s.scroll) el.scrollIntoView({ block: "center" });
    const r = el ? el.getBoundingClientRect() : null;
    if (r && r.width > 0) { const pad = 6; guide.style.left = (r.left - pad) + "px"; guide.style.top = (r.top - pad) + "px"; guide.style.width = (r.width + 2 * pad - 6) + "px"; guide.style.height = (r.height + 2 * pad - 6) + "px"; guide.style.opacity = "1"; guide.classList.toggle("low", r.top < 50); guide.querySelector("b").textContent = `${i + 1} · ${s.title}`; }
    else guide.style.opacity = "0";
    // the caption sits where it covers the least: bottom centre, or top centre when the target is low on the screen
    cap.classList.toggle("top", !!(r && r.top > innerHeight * 0.55));
    cap.innerHTML = `<div class="tour-n">${i + 1} / ${STEPS.length} · <b>${s.title}</b></div><div class="tour-text">${s.text}</div><div class="tour-btns"><button class="tour-back" ${i === 0 ? "disabled" : ""}>Back</button><button class="tour-next primary">${i === STEPS.length - 1 ? "Start" : "Next"}</button><button class="tour-skip">Skip the tour</button></div>`;
    cap.querySelector(".tour-back").onclick = () => { if (i > 0) { i--; place(); } };
    cap.querySelector(".tour-next").onclick = () => { if (i < STEPS.length - 1) { i++; place(); } else end(); };
    cap.querySelector(".tour-skip").onclick = end;
  };
  const onKey = (e) => { if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") { e.preventDefault(); if (i < STEPS.length - 1) { i++; place(); } else end(); } else if (e.key === "ArrowLeft") { if (i > 0) { i--; place(); } } else if (e.key === "Escape") end(); };
  const onResize = () => place();
  addEventListener("keydown", onKey); addEventListener("resize", onResize);
  function end() { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); guide.remove(); cap.remove(); onDone?.(); }
  place();
}
