// Canvas rendering of the plan and the people. Minimal: white page, grey plan, people as discs.
import { BAR_START } from "./sim.js";
import { PixelRenderer, PPM } from "./pixel.js";
const ZOOMS = [0.25, 0.5, 1, 2, 3, 4];

const COLORS = { student: "#2f7fb8", prof: "#1f1f1d" };
export const colorFor = (p) => (p.role === "student" ? COLORS.student : COLORS.prof);

export class Stage {
  constructor(canvas, plan) {
    this.c = canvas; this.ctx = canvas.getContext("2d"); this.plan = plan;
    this.scale = 20; this.ox = 0; this.oy = 0; this.selected = null; this.hover = null; this.follow = false;
    this.opts = { trails: true, rooms: true, dim: false, flags: false }; // flags: the plan check's red marks; off for now, set true and rebuild the pixel strips to see them
    this.onSelect = () => {}; this.onHover = () => {}; this.onAnnotation = () => {};
    this.annotations = []; this.areaFilter = null; this.activeAnnotation = null;
    this.mode = "plan"; this.zoom = 2; this.pixel = null;
    this.resize(); window.addEventListener("resize", () => { this.resize(); this.fit(); });
    this.bindInput(); this.fit();
  }
  resize() { const r = this.c.parentElement.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; this.c.width = r.width * dpr; this.c.height = r.height * dpr; this.c.style.width = r.width + "px"; this.c.style.height = r.height + "px"; this.W = r.width; this.H = r.height; this.dpr = dpr; }
  fit() {
    const [x0, y0, x1, y1] = this.plan.meta.extent; let s = Math.min(this.W / (x1 - x0 + 2), this.H / (y1 - y0 + 2));
    if (this.mode === "pixel") { let z = ZOOMS[0]; for (const zz of ZOOMS) if (PPM * zz <= s) z = zz; this.zoom = z; s = PPM * this.zoom; }
    this.scale = s; this.ox = this.W / 2 - ((x0 + x1) / 2) * s; this.oy = this.H / 2 + ((y0 + y1) / 2) * s;
  }
  setMode(mode) {
    this.mode = mode; if (mode === "pixel" && !this.pixel) this.pixel = new PixelRenderer(this, this.plan);
    if (mode === "pixel") { this.zoom = 2; this.scale = PPM * this.zoom; } this.staticKey = null; this.fit();
  }
  // whole-number zooms for crisp pixels; below one the map is shown at a half or a quarter for the overview
  zoomStep(dir, sx, sy) { const i = ZOOMS.indexOf(this.zoom); const j = Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 2 : i) + dir)); this.setZoom(ZOOMS[j], sx, sy); }
  setZoom(z, sx, sy) { const [wx, wy] = this.toWorld(sx, sy); this.zoom = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z)); this.scale = PPM * this.zoom; this.ox = sx - wx * this.scale; this.oy = sy + wy * this.scale; }
  toScreen(x, y) { return [this.ox + x * this.scale, this.oy - y * this.scale]; }
  toWorld(sx, sy) { return [(sx - this.ox) / this.scale, (this.oy - sy) / this.scale]; }
  bindInput() {
    let drag = null;
    this.c.addEventListener("mousedown", (e) => { drag = { x: e.clientX, y: e.clientY, ox: this.ox, oy: this.oy, moved: false }; this.c.classList.add("dragging"); });
    window.addEventListener("mousemove", (e) => {
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; this.ox = drag.ox + dx; this.oy = drag.oy + dy; this.follow = false; return; }
      const r = this.c.getBoundingClientRect(); const id = this.pickAgent(e.clientX - r.left, e.clientY - r.top); if (id !== this.hover) { this.hover = id; this.onHover(id, e.clientX - r.left, e.clientY - r.top); }
    });
    window.addEventListener("mouseup", (e) => { if (!drag) return; const r = this.c.getBoundingClientRect(); if (!drag.moved && e.target === this.c) { const an = this.pickAnnotation(e.clientX - r.left, e.clientY - r.top); if (an) { this.onAnnotation(an); } else { const id = this.pickAgent(e.clientX - r.left, e.clientY - r.top); this.onSelect(id); } } drag = null; this.c.classList.remove("dragging"); });
    this.c.addEventListener("wheel", (e) => { e.preventDefault(); const r = this.c.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; if (this.mode === "pixel") { this.wheelAcc = (this.wheelAcc || 0) + e.deltaY; if (Math.abs(this.wheelAcc) >= 60) { this.zoomStep(this.wheelAcc < 0 ? 1 : -1, sx, sy); this.wheelAcc = 0; } return; } const [wx, wy] = this.toWorld(sx, sy); const f = Math.exp(-e.deltaY * 0.0015); this.scale = Math.max(4, Math.min(140, this.scale * f)); this.ox = sx - wx * this.scale; this.oy = sy + wy * this.scale; }, { passive: false });
  }
  pickAnnotation(sx, sy) {
    const r = Math.max(9, 0.45 * this.scale) + 3;
    for (const an of this.visibleAnnotations()) { const [x, y] = this.toScreen(an.x, an.y); if (Math.hypot(x - sx, y - sy) < r) return an; }
    return null;
  }
  visibleAnnotations() { return this.annotations.filter((a) => !this.areaFilter || this.areaFilter.has(a.topic)); }
  pickAgent(sx, sy) {
    if (!this.sim) return null; const [wx, wy] = this.toWorld(sx, sy); let best = null, bd = Math.max(0.45, 8 / this.scale);
    for (const a of this.sim.agents) { if (!a.onFloor) continue; const d = Math.hypot(a.x - wx, a.y - wy); if (d < bd) { bd = d; best = a.id; } }
    return best;
  }
  centerOn(x, y) { this.ox = this.W / 2 - x * this.scale; this.oy = this.H / 2 + y * this.scale; }

  // static plan layers, cached per view transform; weights are screen pixels and do not scale
  drawStatic() {
    if (!(this.W >= 2 && this.H >= 2)) { this.resize(); if (!(this.W >= 2 && this.H >= 2)) return null; this.fit(); }
    const key = `${this.scale}|${this.ox}|${this.oy}|${this.W}|${this.H}|${this.opts.rooms}`;
    if (this.staticKey === key && this.staticCanvas) return this.staticCanvas;
    this.staticKey = key;
    const off = this.staticCanvas || (this.staticCanvas = document.createElement("canvas"));
    off.width = this.c.width; off.height = this.c.height;
    const ctx = off.getContext("2d"); const plan = this.plan, s = this.scale;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, this.W, this.H);
    const P = (x, y) => this.toScreen(x, y);
    const ring = (r) => { for (let i = 0; i < r.length; i++) { const [x, y] = P(r[i][0], r[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); };
    const strokeLines = (lines, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath(); for (const l of lines) { for (let i = 0; i < l.length; i++) { const [x, y] = P(l[i][0], l[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } } ctx.stroke(); };
    // rooms other than the studio, as a faint tone
    for (const r of plan.rooms) {
      if (r.id === "R1") continue;
      ctx.beginPath(); ring(r.polygon); for (const h of r.holes) ring(h);
      ctx.fillStyle = /obstacle|elevator|service/i.test(r.type + r.name) ? "#ebeae5" : "#f6f5f1"; ctx.fill("evenodd");
    }
    // furniture: desks, tables and counters get a light fill under their linework; chairs are lines only
    const fillFor = { desk: "#f1f0eb", table: "#f1f0eb", counter: "#efe8db", printer: "#eaeef2", computers: "#eaeef2", seating: "#f1f0eb", pinup: "#edebf7", elevator: "#e6e5e0" };
    const byId = Object.fromEntries(plan.furniture.map((f) => [f.id, f]));
    for (const f of plan.furniture) { const fc = fillFor[f.kind]; if (!fc) continue; const b = f.bbox; const [x, y] = P(b[0], b[3]); ctx.fillStyle = fc; ctx.fillRect(x, y, (b[2] - b[0]) * s, (b[3] - b[1]) * s); }
    const furnLines = plan.furnitureLines || [];
    const detail = s > 7;
    strokeLines(furnLines.filter((f) => f.kind === "chair").flatMap((f) => (detail ? f.lines : f.lines.slice(0, 1))), "#9a9892", 0.5);
    strokeLines(furnLines.filter((f) => f.kind !== "chair").flatMap((f) => f.lines), "#6b6a65", 0.6);
    if (!detail) for (const f of plan.furniture) { if (f.kind !== "chair") continue; const b = f.bbox; const [x, y] = P((b[0] + b[2]) / 2, (b[1] + b[3]) / 2); ctx.beginPath(); ctx.arc(x, y, Math.max(1, 0.22 * s), 0, Math.PI * 2); ctx.strokeStyle = "#9a9892"; ctx.lineWidth = 0.5; ctx.stroke(); }
    // stairs and handrails
    strokeLines(plan.linework?.stairs || [], "#8f8e88", 0.5);
    // glazing: curtain wall panels, mullions and louvers
    strokeLines(plan.linework?.glazing || [], "#2b2b29", 0.75);
    // floor edge: slab outline and facade pilasters
    strokeLines(plan.linework?.floor_edge || [], "#2b2b29", 0.5);
    // cut walls as poche, openings already carved
    ctx.fillStyle = "#2f2f2d";
    for (const w of plan.poche || plan.walls) { ctx.beginPath(); ring(w.exterior); for (const h of w.holes) ring(h); ctx.fill("evenodd"); }
    ctx.fillStyle = "#fff"; for (const b of plan.cutWalls || []) { const [x, y] = P(b[0], b[3]); ctx.fillRect(x, y, (b[2] - b[0]) * s, (b[3] - b[1]) * s); }
    for (const c of plan.columns) { const b = c.bbox; const [x, y] = P(b[0], b[3]); ctx.fillRect(x, y, (b[2] - b[0]) * s, (b[3] - b[1]) * s); }
    // doors: frame, leaf and swing from the block linework
    strokeLines((plan.doorLines || []).flatMap((d) => d.lines), "#4a4946", 0.7);
    // room names
    if (this.opts.rooms && s > 9) {
      ctx.fillStyle = "#8a8983"; ctx.font = `${Math.max(10, Math.min(13, s * 0.5))}px system-ui`; ctx.textAlign = "center";
      for (const r of plan.rooms) { if (r.area_m2 < 4 || /Region/.test(r.name) || /obstacle|elevator|service/i.test(r.type + r.name)) continue; const c = r.label || centroid(r.polygon); const [x, y] = P(c[0], c[1]); ctx.fillText(r.name, x, y); }
      for (const z of plan.zones) { if (!/kitchen/i.test(z.name)) continue; const [x, y] = P((z.bounds[0] + z.bounds[2]) / 2, (z.bounds[1] + z.bounds[3]) / 2); ctx.fillText(z.name, x, y); }
    }
    return off;
  }

  draw(sim) {
    this.sim = sim; const ctx = this.ctx, plan = this.plan, s = this.scale;
    if (this.follow && this.selected) { const a = sim.byId[this.selected]; if (a && a.onFloor) this.centerOn(a.x, a.y); }
    if (this.mode === "pixel") { if (!(this.W >= 2 && this.H >= 2)) { this.resize(); if (!(this.W >= 2 && this.H >= 2)) return; this.fit(); } return this.pixel.draw(sim); }
    const off = this.drawStatic(); if (!off) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const P = (x, y) => this.toScreen(x, y);
    // bar area after 18:30
    if (plan.bar && sim.t >= BAR_START) { const b = plan.bar.area; const [x, y] = P(b[0], b[3]); ctx.fillStyle = "rgba(239,159,39,0.12)"; ctx.fillRect(x, y, (b[2] - b[0]) * s, (b[3] - b[1]) * s); if (this.opts.rooms && s > 9) { ctx.fillStyle = "#ba7517"; ctx.font = `${Math.max(10, Math.min(13, s * 0.5))}px system-ui`; ctx.textAlign = "center"; const [lx, ly] = P(plan.bar.center[0], plan.bar.area[3] + 0.6); ctx.fillText("Good Times", lx, ly); } }
    // food line slots while a line exists
    if (sim.queue && sim.queue.members.length && sim.queueSlots) { ctx.fillStyle = "rgba(186,117,23,0.25)"; for (let i = 0; i < Math.min(sim.queue.members.length + 2, sim.queueSlots.length); i++) { const [x, y] = P(sim.queueSlots[i][0], sim.queueSlots[i][1]); ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 0.12 * s), 0, Math.PI * 2); ctx.fill(); } }
    // people
    const sel = this.selected ? sim.byId[this.selected] : null; const selP = sel ? sim.personById[sel.id] : null;
    const r = Math.max(3, 0.3 * s);
    if (sel && sel.onFloor) {
      if (this.opts.trails && sel.trail.length > 1) { ctx.beginPath(); sel.trail.forEach(([x, y], i) => { const q = P(x, y); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); const q = P(sel.x, sel.y); ctx.lineTo(q[0], q[1]); ctx.strokeStyle = "rgba(31,31,29,0.35)"; ctx.lineWidth = 2; ctx.stroke(); }
      if (sel.path) { ctx.beginPath(); const q0 = P(sel.x, sel.y); ctx.moveTo(q0[0], q0[1]); for (let i = sel.pi; i < sel.path.length; i++) { const q = P(sel.path[i][0], sel.path[i][1]); ctx.lineTo(q[0], q[1]); } ctx.setLineDash([4, 4]); ctx.strokeStyle = "#888"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    }
    for (const a of sim.agents) {
      if (!a.onFloor) continue; const p = sim.personById[a.id]; const [x, y] = P(a.x, a.y);
      let alpha = 0.3 + 0.7 * a.mood;
      if (this.opts.followDim && sel && a !== sel) alpha *= 0.18;
      else if (this.opts.focusType && p.typeId !== this.opts.focusType) alpha *= 0.15;
      else if (this.opts.dim && selP && !(p.section === selP.section)) alpha *= 0.2;
      ctx.globalAlpha = alpha; ctx.fillStyle = colorFor(p);
      if (p.role !== "student") { ctx.fillRect(x - r, y - r, 2 * r, 2 * r); } else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (a.inCrit || a.state === "crit") { ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.strokeStyle = "#1f1f1d"; ctx.lineWidth = 1; ctx.stroke(); }
      if (s > 24 && p.role === "student") { ctx.fillStyle = "#fff"; ctx.font = `${Math.max(8, r)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.name[0], x, y + 0.5); ctx.textBaseline = "alphabetic"; }
    }
    if (sel && sel.onFloor) { const [x, y] = P(sel.x, sel.y); ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = "#1f1f1d"; ctx.lineWidth = 2; ctx.stroke(); }
    this.drawOverlays(sim);
    if (this.hover && this.hover !== this.selected) { const a = sim.byId[this.hover]; if (a && a.onFloor) { const [x, y] = P(a.x, a.y); ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.strokeStyle = "#9a9993"; ctx.lineWidth = 1.5; ctx.stroke(); } }
  }
  // overlays shared by both modes, in screen space: topic points, the followed person's trail and the numbered findings
  drawOverlays(sim) {
    const ctx = this.ctx, s = this.scale; const P = (x, y) => this.toScreen(x, y);
    if (this.topicPoints) { ctx.strokeStyle = "#ba7517"; ctx.lineWidth = 1.5; for (const [x, y] of this.topicPoints) { const q = P(x, y); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(4, 0.45 * s), 0, Math.PI * 2); ctx.stroke(); } }
    const sel = this.selected ? sim.byId[this.selected] : null;
    if (this.mode === "pixel" && this.opts.trails) {
      // everyone's recent path, faint; the followed person's in red
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,240,200,0.22)"; ctx.beginPath();
      for (const a of sim.agents) { if (!a.onFloor || a.trail.length < 2 || a === sel) continue; const tr = a.trail.slice(-24); let px = null, py = null; for (const [x, y] of tr) { const q = P(x, y); if (px != null && Math.hypot(x - px, y - py) < 2.5) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); px = x; py = y; } if (px != null && Math.hypot(a.x - px, a.y - py) < 2.5) { const q = P(a.x, a.y); ctx.lineTo(q[0], q[1]); } }
      ctx.stroke();
      if (sel && sel.onFloor && sel.trail.length > 1) { ctx.beginPath(); let px = null, py = null; for (const [x, y] of sel.trail) { const q = P(x, y); if (px != null && Math.hypot(x - px, y - py) < 2.5) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); px = x; py = y; } const q = P(sel.x, sel.y); ctx.lineTo(q[0], q[1]); ctx.strokeStyle = "rgba(201,85,63,0.7)"; ctx.lineWidth = 2; ctx.stroke(); }
    }
    if (this.mode === "pixel" && this.opts.rooms && this.zoom >= 2) {
      ctx.font = `${8 + this.zoom}px Silkscreen, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const r of this.plan.rooms) { if (r.area_m2 < 4 || /Region|elevator|chase/i.test(r.name) || r.id === "R1") continue; const c = r.label || [0, 0]; const [x, y] = P(c[0], c[1]); const w = ctx.measureText(r.name).width + 8; ctx.fillStyle = "rgba(43,32,22,0.75)"; ctx.fillRect(x - w / 2, y - 8, w, 16); ctx.fillStyle = "#f3e9d2"; ctx.fillText(r.name, x, y + 1); }
      ctx.textBaseline = "alphabetic";
    }
    // the remark shown in the corner box: a small speech mark over its speaker, so the box and the plan agree
    const sr = this.spotRemark; if (sr && sr.t <= sim.t && sr.t > sim.t - 900) { const a = sim.byId[sr.id]; if (a && a.onFloor) { const [x, y] = P(a.x, a.y); const lift = this.mode === "pixel" ? 24 * (this.zoom || 1) + 4 : 14; const bx = Math.round(x) - 7, by = Math.round(y - lift) - 12; ctx.fillStyle = "#161412"; ctx.fillRect(bx - 1, by - 1, 16, 12); ctx.fillStyle = "#ffffff"; ctx.fillRect(bx, by, 14, 10); ctx.fillStyle = "#161412"; ctx.fillRect(bx + 3, by + 4, 2, 2); ctx.fillRect(bx + 6, by + 4, 2, 2); ctx.fillRect(bx + 9, by + 4, 2, 2); ctx.fillRect(bx + 5, by + 10, 4, 2); ctx.fillRect(bx + 6, by + 12, 2, 1); } }
    // findings as numbered annotations at their place, with a short label
    const ar = Math.max(9, 0.45 * Math.min(s, 40));
    for (const an of this.visibleAnnotations()) {
      const [x, y] = P(an.x, an.y); const active = this.activeAnnotation === an.n;
      ctx.beginPath(); ctx.arc(x, y, ar, 0, Math.PI * 2); ctx.fillStyle = active ? "#854f0b" : "#f3c66b"; ctx.fill(); ctx.strokeStyle = "#854f0b"; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
      ctx.fillStyle = active ? "#fff" : "#412402"; ctx.font = `600 ${Math.max(10, ar)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(an.n), x, y + 0.5); ctx.textBaseline = "alphabetic";
      if (an.label && (s > 12 || active)) { ctx.font = `${Math.max(10, Math.min(12, s * 0.45))}px system-ui`; ctx.textAlign = "left"; const w = ctx.measureText(an.label).width; ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillRect(x + ar + 4, y - 8, w + 8, 16); ctx.fillStyle = "#412402"; ctx.fillText(an.label, x + ar + 8, y + 4); }
    }
  }
}
function centroid(ring) { let x = 0, y = 0; for (const p of ring) { x += p[0]; y += p[1]; } return [x / ring.length, y / ring.length]; }
