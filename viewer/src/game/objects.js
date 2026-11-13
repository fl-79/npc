// Objects that move with the run (owner 2026-11-13, research/pixel-people-and-animation.md): every animation here reads
// the simulation's state, so a light or a puff of steam means something is happening there.
//   plotters      green blink and a sheet feeding out while printing; red blink when the paper is out and someone waits
//   small printer a green blink and a page while someone prints at it
//   3D printers   an orange light and the nozzle sweeping while a print is in progress (one printer per running print)
//   kettle, coffee  steam while someone takes a break, a snack or a meal in the kitchen
//   microwave     a lit window and a turning plate while someone eats there
//   computers     a lit screen with a scrolling line while someone works at the station; a drifting dot when nobody is
//   screen, projector  slides and a beam while a lecture, a seminar or a review runs in the room
//   beer taps     a drip while an event runs in the lounge
//   desks         a laptop glowing at every desk where someone is working
import { T, PPM_Z } from './tileset.js';

const FACE = { desk: 10, table: 10, counter: 22, printer: 24, computers: 12, seating: 10, pinup: 30, bin: 8, other: 14, chair: 6, shelf: 34, screen: 21, projector: 2, fridge: 26, microwave: 5, kettle: 4, coffee_machine: 6, sink: 4, bar: 16, beer_tap: 18 };
const KINDS = new Set(['printer', 'printer3d', 'kettle', 'coffee_machine', 'microwave', 'computers', 'screen', 'projector', 'beer_tap']);
const BREAK = new Set(['break', 'snack', 'water', 'eat', 'lunch_in', 'dinner']);
const MEAL = new Set(['eat', 'lunch_in', 'dinner']);
const TALK = new Set(['lecture', 'seminar', 'review', 'crit']);
const hex = (s) => parseInt(s.slice(1), 16);

/** Where a piece is drawn in the plan, as furnitureSprite and buildStrips place it. */
function placeOf(f, tm, base) {
  const ppm = T / tm, thin = f.kind === 'pinup_wall' || f.kind === 'screen' || f.kind === 'backdrop';
  const w = Math.max(thin ? 2 : T, Math.round(f.w * ppm)), d = Math.max(thin ? 2 : 4, Math.round(f.d * ppm));
  const edge = thin && w < d;
  const faceH = edge ? 0 : (f.inferred && f.h && f.kind !== 'stall' ? Math.max(2, Math.round(f.h * PPM_Z)) : (FACE[f.kind] ?? 12));
  const lift = Math.round((f.z || 0) * PPM_Z);
  const x = Math.round(f.x / tm * T), y = Math.round((f.y + f.d) / tm * T) - (d + faceH) - lift;
  const b = base || f, row = Math.floor((b.y + b.d) / tm - 0.001);
  return { x, y, w, d, faceH, edge, depth: (row + 1) * T + 0.5, tc: (f.x + f.w / 2) / tm, tr: (f.y + f.d / 2) / tm };
}

export class ObjectFx {
  constructor(scene, L) {
    this.scene = scene; this.L = L; this.tm = L.tile_m;
    const byObject = new Map(), byId = new Map();
    for (const f of L.furniture) { if (f.object) byObject.set(f.object, f); byId.set(String(f.id), f); }
    this.pieces = L.furniture.filter((f) => KINDS.has(f.kind)).map((f) => ({ f, base: f.on_object ? byObject.get(f.on_object) : f.on_element ? byId.get(String(f.on_element)) : null, g: null }));
    // the plotters are the two north-most printers, as the world reads them (world.js, question 3)
    const printers = this.pieces.filter((p) => p.f.kind === 'printer').sort((a, b) => (a.f.r0 ?? 0) - (b.f.r0 ?? 0));
    printers.forEach((p, i) => { p.plotter = i < 2 ? i : null; });
    this.p3d = this.pieces.filter((p) => p.f.kind === 'printer3d');
    this.laptops = new Map();
    this.acc = 0;
  }
  destroy() { for (const p of this.pieces) p.g?.destroy(); for (const l of this.laptops.values()) l.destroy(); this.laptops.clear(); }

  /** Called every frame; redraws ten times a second (the animations step in whole pixels anyway). */
  update(sim, k, delta) {
    this.acc += delta; if (this.acc < 100) return; this.acc = 0;
    const t = performance.now() / 1000;
    const here = sim ? sim.agents.filter((a) => a.inside && a.k === k && a.state !== 'riding') : [];
    const near = (p, r, test) => { let n = 0; for (const a of here) if (Math.abs(a.x + 0.5 - p.tc) <= r && Math.abs(a.y + 0.5 - p.tr) <= r && test(a)) n++; return n; };
    const doing = (set) => (a) => a.state === 'doing' && set.has(a.activity);
    const prints3d = sim ? sim.agents.filter((a) => a.printDone && a.printDone > sim.time).length : 0;
    let i3d = 0;
    for (const p of this.pieces) {
      const P = placeOf(p.f, this.tm, p.base); p.tc = P.tc; p.tr = P.tr;
      if (!p.g) p.g = this.scene.add.graphics();
      const g = p.g; g.clear(); g.setDepth(P.depth);
      const px = (x, y, w, h, col, a = 1) => g.fillStyle(typeof col === 'string' ? hex(col) : col, a).fillRect(P.x + x, P.y + y, w, h);
      const blink = (hz) => Math.floor(t * hz * 2) % 2 === 0;
      switch (p.f.kind) {
        case 'printer': {
          if (p.plotter != null) {
            const busy = sim && sim.plotter.busy[p.plotter], out = sim && sim.plotter.paper <= 0 && sim.plotter.queue.length > 0;
            const led = out ? (blink(2) ? '#e0483b' : '#5a1a14') : busy ? (blink(1.5) ? '#6fe36f' : '#2f6f2f') : '#3f6f3f';
            px(P.w - 4, 2, 2, 2, led);
            if (busy) { const len = Math.floor((t * 6) % 9); px(3, P.d + P.faceH - 1, P.w - 6, Math.max(1, len), '#fbf7ec'); px(3, P.d + P.faceH - 1 + Math.max(1, len) - 1, P.w - 6, 1, '#d8d0bf'); }
          } else {
            const busy = near(p, 1.6, doing(new Set(['print', 'print_small', 'print_early']))) > 0;
            px(P.w - 4, 2, 2, 2, busy ? (blink(2) ? '#6fe36f' : '#2f6f2f') : '#3f6f3f');
            if (busy) px(4, P.d + P.faceH - 1, P.w - 8, 1 + Math.floor((t * 4) % 4), '#fbf7ec');
          }
          break;
        }
        case 'printer3d': {
          const on = sim && i3d < prints3d; i3d++;
          px(0, 0, 2, 2, on ? (blink(1) ? '#f39a3b' : '#8a4f1a') : '#4a4a52');
          if (on) { const sweep = Math.round((Math.sin(t * 3 + i3d) + 1) / 2 * Math.max(0, P.w - 3)); px(sweep, Math.floor(P.d / 2), 2, 1, '#f3c66b'); px(sweep, Math.floor(P.d / 2) + 1, 1, 1, '#e0483b', 0.8); }
          break;
        }
        case 'kettle': case 'coffee_machine': {
          if (near(p, 3.5, doing(BREAK)) === 0) break;
          for (let s = 0; s < 4; s++) { const ph = ((t * 0.8 + s / 4) % 1), yy = -3 - Math.floor(ph * 14), xx = Math.floor(P.w / 2) - 1 + Math.round(Math.sin((ph + s) * 6) * 2); px(xx, yy, ph < 0.5 ? 2 : 3, 2, '#ffffff', 0.85 * (1 - ph)); }
          if (p.f.kind === 'coffee_machine') px(1, P.d + 1, 1, 1, blink(1) ? '#6fe36f' : '#2f6f2f');
          break;
        }
        case 'microwave': {
          if (near(p, 3.5, doing(MEAL)) === 0) { px(P.w - 3, P.d + 1, 1, 1, '#3f6f3f'); break; }
          // a warm window, not the amber of an added object's outline, and a soft halo so it reads at a floor's zoom
          const ww = Math.max(4, P.w - 6), hh = Math.max(3, P.faceH);
          px(-3, P.d - 3, P.w + 6, hh + 6, '#ffd27a', 0.22);
          px(1, P.d, ww, hh, '#fff2b8', 1);
          const step = Math.floor(t * 4) % 4; px(2 + [1, 2, 1, 0][step] * Math.floor((ww - 2) / 2), P.d + 1 + Math.floor(hh / 2), 2, 1, '#c98a5e');
          px(P.w - 3, P.d + 1, 1, 1, blink(2) ? '#6fe36f' : '#2f6f2f');
          break;
        }
        case 'computers': {
          const used = near(p, 2.2, (a) => a.state === 'doing') > 0;
          const sx = P.w - 12, sy = 3;
          if (used) { px(sx, sy, 8, 5, Math.floor(t * 3) % 7 === 0 ? '#a8d8f5' : '#8fc6ea'); px(sx, sy + Math.floor(t * 5) % 5, 8, 1, '#e8f6ff'); }
          else { px(sx, sy, 8, 5, '#1f3242'); px(sx + Math.floor((t * 2) % 8), sy + Math.floor((t * 1.3) % 5), 1, 1, '#5a8fb8'); }
          break;
        }
        case 'screen': case 'projector': {
          const on = near(p, 9, doing(TALK)) >= 3;
          if (!on) break;
          if (p.f.kind === 'projector') { px(0, 0, 2, 2, blink(0.5) ? '#6fe36f' : '#2f6f2f'); break; }
          const slide = ['#e9e4d8', '#cfe3f2', '#f3e2c4', '#dcefd6'][Math.floor(t / 3) % 4];
          if (P.edge) px(0, 0, P.w, P.d, slide, 0.95); else px(1, P.d, P.w - 2, P.faceH, slide, 0.95);
          break;
        }
        case 'beer_tap': {
          if (near(p, 7, doing(new Set(['event']))) === 0) break;
          const ph = (t * 1.2) % 1; px(Math.floor(P.w / 2), P.d + 2 + Math.floor(ph * (P.faceH - 4)), 1, 2, '#f3c66b', 0.9);
          break;
        }
      }
    }
    // a laptop glowing at every desk where someone is working
    const seen = new Set();
    for (const a of here) {
      const d = a.a && a.a.desk;
      if (!(a.state === 'doing' && a.activity === 'desk_work' && d && d.k === k)) continue;
      if (a.x < d.c0 - 2 || a.x > d.c1 + 2 || a.y < d.r0 - 2 || a.y > d.r1 + 2) continue;   // working at their own desk
      // the desk's top face: its tiles, lifted by the desk's 10 px face; the laptop on the edge nearest the person
      const x0 = d.c0 * T + 3, x1 = (d.c1 + 1) * T - 9, y0 = d.r0 * T - 10 + 2, y1 = (d.r1 + 1) * T - 10 - 6;
      if (x1 < x0 || y1 < y0) continue;
      const ax = (a.x + 0.5) * T, ay = (a.y + 0.5) * T - 10;
      const lx = Math.round(Math.max(x0, Math.min(x1, ax - 3))), ly = Math.round(Math.max(y0, Math.min(y1, ay - 2)));
      let g = this.laptops.get(a.a.id); if (!g) { g = this.scene.add.graphics(); this.laptops.set(a.a.id, g); }
      g.clear().setDepth((d.r1 + 1) * T + 0.5).setVisible(true);
      const glow = (Math.floor(t * 2 + a.a.id) % 9 === 0) ? 0xd2ecfb : 0xa8d8f5;
      g.fillStyle(0x2a1f1a, 1).fillRect(lx - 1, ly - 1, 8, 6);
      g.fillStyle(glow, 1).fillRect(lx, ly, 6, 3);
      g.fillStyle(0xcfd4d8, 1).fillRect(lx, ly + 3, 6, 1);
      g.fillStyle(0xe8f6ff, 1).fillRect(lx + 1, ly + (Math.floor(t * 4 + a.a.id) % 3), 3, 1);
      seen.add(a.a.id);
    }
    for (const [id, g] of this.laptops) if (!seen.has(id)) g.setVisible(false);
  }
}
