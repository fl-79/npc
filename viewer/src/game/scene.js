import Phaser from 'phaser';
import { T, PAL, USE_LABELS, buildFloor, buildContextCanvas, buildStrips, buildPeople, SKIP_KINDS } from './tileset.js';
import { buildIso, ISO } from './iso.js';
import { figureFor, buildEmotes, emotesFor, EMOTE } from './people.js';
import { ObjectFx } from './objects.js';

// Whole-number zooms, with two steps below one so a whole floor fits a small pane.
export const ZOOMS = [0.25, 0.5, 1, 2, 3, 4, 6];
/** The largest zoom step at which a W x H world fits a w x h viewport. */
export function fitZoom(W, H, w, h) {
  let best = ZOOMS[0];
  for (const z of ZOOMS) if (W * z <= w && H * z <= h) best = z;
  return best;
}
export const CONTEXT_MARGIN = 60; // tiles of surroundings drawn beyond the floor on every side (30 m)

// One Phaser scene = one level of the Lasserre building, built from exports/tiles/<level>.json.
// Drawing order is the V1 rule: the context ground, the floor, then one strip per tile row
// holding that row's wall caps, faces, doors and the furniture whose feet are in it, each at
// the depth of the row, and people at the depth of their feet, so what is further south
// stands in front.
const SEATED = new Set(['eat', 'eat_at', 'lunch_in', 'dinner', 'lecture', 'seminar']);   // drawn seated and still

export class LevelScene extends Phaser.Scene {
  constructor() { super('level'); }

  init(data) {
    this.levelFile = data.file;
    this.onReady = data.onReady;
    this.opts = Object.assign({ people: 6, labels: true, context: null, contextOn: true, view: 'plan', azimuth: 0, program: null }, data.opts || {});
    this.zoomLevel = 1;
  }

  /** The level's rooms with the owner's program (program/rooms.json) laid over: name (the use stands in for a missing one) and use. */
  roomsWithProgram(L) {
    const P = (this.opts.program && this.opts.program.rooms) || {};
    return L.rooms.map((r) => {
      const p = P[r.id];
      if (!p || p.status !== 'done') return r;
      return Object.assign({}, r, { name: p.name || USE_LABELS[p.use] || r.name, use: p.use || undefined, program: p });
    });
  }

  preload() {
    // one cache key per floor: the loader skips a key that is already cached, so a shared key would keep the first floor
    this.load.json(`tiles:${this.levelFile}`, `/exports/tiles/${this.levelFile}.json`);
  }

  create() {
    const L0 = this.cache.json.get(`tiles:${this.levelFile}`);
    const L = Object.assign({}, L0, { rooms: this.roomsWithProgram(L0) });
    this.L = L; this.furnitureHome = null; this.stripsMoved = false; this.movesDrawn = -1;   // a new floor: the furniture's home positions are read afresh
    this.cameras.main.setBackgroundColor(PAL.void);   // the ground colour takes over once the site is drawn (owner 2026-11-13: no black beyond the site)
    this.people = [];
    this.labels = [];
    this.contextImage = null;
    this.highlight = null;
    this.isoFrame = null;

    if (this.opts.view === 'iso') {
      // ---------------- the pixel isometric: one canvas, labels at their tiles, no people, no context
      const az = ((this.opts.azimuth % 4) + 4) % 4;
      const iso = buildIso(this, L, `${this.levelFile}:iso:${az}`, az);
      const placed = this.stackIso(iso, az); // the floors below and the surroundings, when asked for
      this.isoFrame = placed.frame;
      this.add.image(placed.x, placed.y, iso.key).setOrigin(0, 0).setDepth(placed.depth);
      this.worldW = placed.W; this.worldH = placed.H;
      for (const rm of L.rooms) {
        if (!rm.label) continue;
        const [u, v] = this.isoFrame.uv(rm.label[0] + 0.5, rm.label[1] + 0.5);
        const t = this.add.text(this.isoFrame.sx(u, v), this.isoFrame.sy(u, v, 0), `${rm.number || ''} ${rm.name || ''}`.trim(), {
          fontFamily: 'Silkscreen', fontSize: '8px', color: '#fcf9f2', backgroundColor: '#12181e', padding: { x: 2, y: 1 }, resolution: 1,
        }).setOrigin(0.5).setDepth(100000).setVisible(!!this.opts.labels);
        this.labels.push(t);
      }
      this.bindCamera();
      this.fit();
      if (this.onReady) this.onReady(this, L);
      return;
    }
    this.worldW = L.cols * T; this.worldH = L.rows * T;

    // ---------------- the surroundings under the floor, when the context file is there
    if (this.opts.context) {
      const M = CONTEXT_MARGIN;
      this.contextImage = this.add.image(-M * T, -M * T, buildContextCanvas(this, L, this.opts.context, `${this.levelFile}:context`, M)).setOrigin(0, 0).setDepth(-1);
      this.cameras.main.setBackgroundColor('#55614e');   // the site's ground continues beyond what is drawn
      this.contextImage.setVisible(!!this.opts.contextOn);
    }

    // ---------------- the floor, one pre-rendered canvas
    this.add.image(0, 0, buildFloor(this, L, `${this.levelFile}:floor`, { voidClear: !!this.contextImage })).setOrigin(0, 0).setDepth(0);

    // ---------------- walls, doors and furniture as row strips
    this.stripImages = buildStrips(this, L, this.levelFile).map((s) => this.add.image(0, s.top, s.key).setOrigin(0, 0).setDepth(s.depth));

    // tiles under furniture are not walkable, nor are the no-go areas (service shafts and rooms, from the owner's rule)
    this.occupied = new Set();
    for (const [c, r] of L.no_go || []) this.occupied.add(r * L.cols + c);
    this.transit = new Set(); // tiles of a transit object (the southern elevator's car): walked into whatever is painted under them
    for (const f of L.furniture) {
      if (SKIP_KINDS.has(f.kind)) continue;
      for (let r = Math.max(0, f.r0); r <= Math.min(L.rows - 1, f.r1); r++) for (let c = Math.max(0, f.c0); c <= Math.min(L.cols - 1, f.c1); c++) (f.transit ? this.transit : this.occupied).add(r * L.cols + c);
    }

    // ---------------- room labels
    for (const rm of L.rooms) {
      if (!rm.label) continue;
      const [c, r] = rm.label;
      const t = this.add.text(c * T + T / 2, r * T + T / 2, `${rm.number || ''} ${rm.name || ''}`.trim(), {
        fontFamily: 'Silkscreen', fontSize: '8px', color: '#fcf9f2', backgroundColor: '#12181e', padding: { x: 2, y: 1 }, resolution: 1,
      }).setOrigin(0.5).setDepth(100000).setVisible(!!this.opts.labels);
      this.labels.push(t);
    }

    // ---------------- placeholder people wandering the walkable tiles
    this.walkable = (c, r) => r >= 0 && r < L.rows && c >= 0 && c < L.cols && (this.transit.has(r * L.cols + c)
      || (L.floor[r][c] >= 1 && (L.struct[r][c] === 0 || L.struct[r][c] === 4) && !this.occupied.has(r * L.cols + c)));
    const spots = [];
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) if (this.walkable(c, r)) spots.push([c, r]);
    if (spots.length && this.opts.people > 0) {
      const keys = buildPeople(this, this.opts.people);
      const rng = new Phaser.Math.RandomDataGenerator(['lasserre']);
      for (let i = 0; i < this.opts.people; i++) {
        const [c, r] = spots[rng.between(0, spots.length - 1)];
        const sp = this.add.sprite(c * T + T / 2, r * T + T, keys[i % keys.length], 0).setOrigin(0.5, 1);
        sp.setDepth(r * T + T);
        const p = { sp, c, r, dir: 0, moving: false, wait: rng.between(0, 60), rng, bubble: null };
        this.people.push(p);
      }
    }
    this.remarks = ['Where is the kitchen?', 'Too loud here.', 'Nice light.', 'Need a bigger desk.', 'Crit at 3.', 'Coffee?'];

    // ---------------- the simulation's agents and the lift, drawn when a simulation runs (plan view only)
    this.sim = this.opts.sim || null;
    this.simSprites = new Map();
    this.simKeys = this.opts.view === 'plan' ? buildPeople(this, 8) : [];
    // the people's look and their bubbles (owner 2026-11-13, research/pixel-people-and-animation.md)
    this.emotes = new Map(); this.emoteQ = []; this.emoteSeen = new Map(); this.boundSim = null;
    if (this.opts.view === 'plan') buildEmotes(this);
    this.objFx = this.opts.view === 'plan' && L.furniture ? new ObjectFx(this, L) : null;   // objects that move with the run (owner 2026-11-13)
    this.events.once('shutdown', () => { if (this.boundSim && this.emoteFn) this.boundSim.bus.off(this.emoteFn); this.boundSim = null; });
    this.liftMark = null;

    this.bindCamera();
    this.fit();
    if (this.onReady) this.onReady(this, L);
  }

  /** The floor's isometric on top of the floors below it, every storey one wall height lower, standing on the
   *  surroundings drawn as a ground plane at Level 1 (the plan context canvas under the isometric's affine map).
   *  Floors above are cut away. Returns where the floor's own canvas goes and a frame shifted to match. */
  stackIso(iso, az) {
    const F = iso.frame, L = this.L, tm = L.tile_m;
    const levels = this.opts.levels;
    const me = levels ? levels.find((l) => l.file === this.levelFile) : null;
    if (!levels || !me) return { x: 0, y: 0, W: iso.W, H: iso.H, frame: F, depth: 0 };
    // the screen position, in this floor's canvas, of a model point, through this floor's tiles
    const screenOf = (frame, Lk, mx, my) => {
      const c = (mx - Lk.origin[0]) / tm, r = Lk.rows - (my - Lk.origin[1]) / tm;
      const [u, v] = frame.uv(c, r);
      return [frame.sx(u, v), frame.sy(u, v, 0)];
    };
    const ref = [L.origin[0], L.origin[1]]; // any model point will do: the maps share scale and rotation
    const [rx, ry] = screenOf(F, L, ref[0], ref[1]);
    const items = []; // { key, x, y, w, h, depth }
    for (const lv of levels) {
      if (lv.k >= me.k) continue;
      const lower = buildIso(this, lv.L, `${lv.file}:iso:${az}`, az);
      const [lx, ly] = screenOf(lower.frame, lv.L, ref[0], ref[1]);
      items.push({ key: lower.key, x: rx - lx, y: ry - ly + ISO.WALL * (me.k - lv.k), w: lower.W, h: lower.H, depth: lv.k - me.k, k: lv.k });
    }
    // the surroundings as a ground plane at Level 1: the plan context canvas under the isometric's affine map
    const ground = this.levels1Index(levels);
    if (ground != null) for (const it of items) if (it.k < ground) it.depth = -300 + it.k; // a storey below grade lies under the ground plane
    if (this.opts.context && ground != null) {
      const M = CONTEXT_MARGIN, L1 = levels[ground].L;
      const plan = buildContextCanvas(this, L1, this.opts.context, `${levels[ground].file}:context`, M);
      const src = this.textures.get(plan).getSourceImage();
      // plan pixel (px, py) -> tile (px / T - M, py / T - M) on Level 1 -> screen in Level 1's frame, then shifted like that level
      const F1 = buildIso(this, L1, `${levels[ground].file}:iso:${az}`, az).frame;
      const toScreen = (px, py) => { const [u, v] = F1.uv(px / T - M, py / T - M); return [F1.sx(u, v), F1.sy(u, v, 0)]; };
      const [ax, ay] = toScreen(0, 0), [bx, by] = toScreen(1, 0), [cx, cy] = toScreen(0, 1);
      const a = bx - ax, b = by - ay, c2 = cx - ax, d2 = cy - ay;
      const corners = [[0, 0], [src.width, 0], [0, src.height], [src.width, src.height]].map(([px, py]) => toScreen(px, py));
      const minX = Math.min(...corners.map((p) => p[0])), minY = Math.min(...corners.map((p) => p[1]));
      const maxX = Math.max(...corners.map((p) => p[0])), maxY = Math.max(...corners.map((p) => p[1]));
      const key = `${levels[ground].file}:isoground:${az}`;
      if (!this.textures.exists(key)) {
        const cv = document.createElement('canvas'); cv.width = Math.ceil(maxX - minX); cv.height = Math.ceil(maxY - minY);
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        g.setTransform(a, b, c2, d2, ax - minX, ay - minY);
        g.drawImage(src, 0, 0);
        this.textures.addCanvas(key, cv);
      }
      const [l1x, l1y] = screenOf(F1, L1, ref[0], ref[1]);
      items.push({ key, x: rx - l1x + minX, y: ry - l1y + minY + ISO.WALL * (me.k - ground), w: maxX - minX, h: maxY - minY, depth: -100 - (levels.length - ground), ground: true });
    }
    // the whole picture's extent, everything shifted so it starts at (0, 0)
    let minX = 0, minY = 0, maxX = iso.W, maxY = iso.H;
    for (const it of items) { minX = Math.min(minX, it.x); minY = Math.min(minY, it.y); maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + it.h); }
    const dx = -minX, dy = -minY;
    for (const it of items) {
      const img = this.add.image(it.x + dx, it.y + dy, it.key).setOrigin(0, 0).setDepth(it.ground ? -200 : it.depth);
      if (it.ground) { this.contextImage = img; img.setVisible(!!this.opts.contextOn); }
    }
    const frame = { ...F, sx: (u, v) => F.sx(u, v) + dx, sy: (u, v, z = 0) => F.sy(u, v, z) + dy };
    return { x: dx, y: dy, W: maxX - minX, H: maxY - minY, frame, depth: 0 };
  }
  levels1Index(levels) { const i = levels.findIndex((l) => /^level 1$/i.test(l.name)); return i < 0 ? null : i; }

  // ---------------- camera: drag or arrows pan, wheel or steps zoom through ZOOMS, fit shows the whole floor
  bindCamera() {
    const cam = this.cameras.main;
    let drag = null;
    this.input.on('pointerdown', (p) => { drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }; });
    this.input.on('pointerup', () => { drag = null; });
    this.input.on('pointermove', (p) => { if (drag && p.isDown) { cam.scrollX = drag.sx - (p.x - drag.x) / cam.zoom; cam.scrollY = drag.sy - (p.y - drag.y) / cam.zoom; } });
    this.input.on('wheel', (p, objs, dx, dy) => { this.zoomStep(dy < 0 ? 1 : -1); });
    // arrows pan; no letter keys, and nothing is swallowed while the owner types in a form field
    this.input.keyboard.disableGlobalCapture();
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT');
  }
  static typing() { const t = document.activeElement && document.activeElement.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; }
  setZoom(z) {
    this.zoomLevel = ZOOMS.includes(z) ? z : ZOOMS.reduce((a, b) => Math.abs(b - z) < Math.abs(a - z) ? b : a);
    this.cameras.main.setZoom(this.zoomLevel);
    this.events.emit('zoom', this.zoomLevel);
    return this.zoomLevel;
  }
  zoomStep(dir) {
    const i = ZOOMS.indexOf(this.zoomLevel), lo = Math.max(0, ZOOMS.indexOf(this.minZoom ?? ZOOMS[0]));   // no zooming out past the fit (owner 2026-11-13)
    return this.setZoom(ZOOMS[Math.max(lo, Math.min(ZOOMS.length - 1, i + dir))]);
  }
  /** The largest zoom at which the whole floor fits the viewport (w x h, defaults to the game size), centred. */
  fit(w, h) {
    w = w ?? this.scale.width; h = h ?? this.scale.height;
    this.minZoom = fitZoom(this.worldW, this.worldH, w - 16, h - 16);
    this.setZoom(this.minZoom);
    // the camera stays on the site: a margin of context round the floor, no further (owner 2026-11-13)
    const M = this.contextImage ? CONTEXT_MARGIN * T : 2 * T; this.cameras.main.setBounds(-M, -M, this.worldW + 2 * M, this.worldH + 2 * M);
    this.cameras.main.centerOn(this.worldW / 2, this.worldH / 2);
  }
  pan(dx, dy) { const cam = this.cameras.main; cam.scrollX += dx / cam.zoom; cam.scrollY += dy / cam.zoom; }
  /** The floor's rectangle on the stage in CSS pixels, for an overlay drawn in tile units (ANALYSE over the pixel plan, 2026-11-12). */
  planRect() { const cam = this.cameras.main, w = this.scale.width, h = this.scale.height, z = cam.zoom; if (!this.L) return null; return { left: (-cam.scrollX - w / 2) * z + w / 2, top: (-cam.scrollY - h / 2) * z + h / 2, width: this.worldW * z, height: this.worldH * z, cols: this.L.cols, rows: this.L.rows }; }
  setLabels(on) { this.labelsOn = on; for (const l of this.labels || []) l.setVisible(on); }   // may be called before create (the floor switches at load since 2026-11-12)
  setContextVisible(on) { if (this.contextImage) this.contextImage.setVisible(on); }

  /** Highlight one room (Revit id) in the current view and centre on it, at zoom 1 at least; null clears. */
  focusRoom(roomId) {
    if (this.highlight) { this.highlight.destroy(); this.highlight = null; }
    if (roomId == null) return;
    const L = this.L;
    const rm = L.rooms.find((r) => r.id === roomId);
    if (!rm) return;
    const g = this.add.graphics().setDepth(150000);
    const F = this.isoFrame;
    let sx = 0, sy = 0, n = 0;
    g.fillStyle(0xf3c66b, 0.4);
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
      if (L.floor[r][c] !== rm.idx) continue;
      if (F) {
        const [ua, va] = F.uv(c, r), [ub, vb] = F.uv(c + 1, r + 1);
        const u0 = Math.min(ua, ub), v0 = Math.min(va, vb);
        g.fillPoints([{ x: F.sx(u0, v0), y: F.sy(u0, v0) }, { x: F.sx(u0 + 1, v0), y: F.sy(u0 + 1, v0) }, { x: F.sx(u0 + 1, v0 + 1), y: F.sy(u0 + 1, v0 + 1) }, { x: F.sx(u0, v0 + 1), y: F.sy(u0, v0 + 1) }], true);
        sx += F.sx(u0 + 0.5, v0 + 0.5); sy += F.sy(u0 + 0.5, v0 + 0.5);
      } else {
        g.fillRect(c * T, r * T, T, T);
        // an outline where the neighbour is another room
        g.lineStyle(1, 0xc8502c, 1);
        const nb = (cc, rr) => rr >= 0 && rr < L.rows && cc >= 0 && cc < L.cols ? L.floor[rr][cc] : -1;
        if (nb(c, r - 1) !== rm.idx) g.lineBetween(c * T, r * T + 0.5, c * T + T, r * T + 0.5);
        if (nb(c, r + 1) !== rm.idx) g.lineBetween(c * T, r * T + T - 0.5, c * T + T, r * T + T - 0.5);
        if (nb(c - 1, r) !== rm.idx) g.lineBetween(c * T + 0.5, r * T, c * T + 0.5, r * T + T);
        if (nb(c + 1, r) !== rm.idx) g.lineBetween(c * T + T - 0.5, r * T, c * T + T - 0.5, r * T + T);
        sx += c * T + T / 2; sy += r * T + T / 2;
      }
      n++;
    }
    this.highlight = g;
    if (!n) return;
    if (this.zoomLevel < 1) this.setZoom(1);
    this.cameras.main.centerOn(sx / n, sy / n);
  }

  update(time, delta) {
    const cam = this.cameras.main, k = this.keys;
    if (k && !LevelScene.typing()) {
      const v = 4 / cam.zoom;
      if (k.LEFT.isDown) cam.scrollX -= v;
      if (k.RIGHT.isDown) cam.scrollX += v;
      if (k.UP.isDown) cam.scrollY -= v;
      if (k.DOWN.isDown) cam.scrollY += v;
    }
    if (this.sim && this.opts.view === 'plan') this.drawSim();
    if (this.objFx) this.objFx.update(this.sim, this.sim ? this.sim.b.levelIndex(this.levelFile) : -1, delta);
    const simOn = !!(this.sim && this.sim.running);
    for (const p of this.people) {
      if (p.sp.visible === simOn) p.sp.setVisible(!simOn); // the placeholder wanderers rest while a simulation runs
      if (simOn) continue;
      if (p.moving) {
        const tx = p.c * T + T / 2, ty = p.r * T + T;
        const step = (delta / 1000) * T * 2.2;
        const dx = tx - p.sp.x, dy = ty - p.sp.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= step) { p.sp.x = tx; p.sp.y = ty; p.moving = false; p.wait = p.rng.between(10, 90); p.sp.anims.stop(); p.sp.setFrame(p.dir * 3); }
        else { p.sp.x += dx / dist * step; p.sp.y += dy / dist * step; }
        p.sp.setDepth(p.sp.y);
      } else if (--p.wait <= 0) {
        const dirs = [[0, 1, 0], [-1, 0, 1], [1, 0, 2], [0, -1, 3]];
        const opts = dirs.filter(([dc, dr]) => this.walkable(p.c + dc, p.r + dr));
        if (opts.length) {
          const [dc, dr, dir] = opts[p.rng.between(0, opts.length - 1)];
          p.c += dc; p.r += dr; p.dir = dir; p.moving = true;
          p.sp.play(`${p.sp.texture.key}-walk${dir}`, true);
        } else p.wait = 30;
        if (p.rng.frac() < 0.08) this.say(p, this.remarks[p.rng.between(0, this.remarks.length - 1)]);
      }
      if (p.bubble) { p.bubble.setPosition(p.sp.x, p.sp.y - 30); }
    }
  }

  /** The agents' moves marked (owner 2026-11-13), so a move reads even after a jump in time: the old place in a dashed
   *  outline, a dashed arrow to the new place, the new place outlined and pulsing, a numbered tag that matches the RUN
   *  step's list. A move flashes an expanding ring when it first shows (live, or after a jump) and when it is picked. */
  drawMoveMarks(here, sim) {
    if (!this.moveMarks) { this.moveMarks = this.add.graphics().setDepth(195000); this.moveTags = new Map(); this.moveSeen = new Map(); }
    if (this.markRun !== sim) { this.markRun = sim; this.moveSeen.clear(); }
    const g = this.moveMarks; g.clear();
    const CY = 0x5ad1e6, now = performance.now(), pulse = 0.8 + 0.2 * Math.sin(now / 260);
    const dashLine = (x0, y0, x1, y1, a) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(L / 6)); for (let i = 0; i < n; i += 2) { const u0 = i / n, u1 = Math.min(1, (i + 1) / n); g.lineStyle(2, CY, a).lineBetween(x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0, x0 + (x1 - x0) * u1, y0 + (y1 - y0) * u1); } };
    for (const mv of here) {
      if (!this.moveSeen.has(mv.id)) this.moveSeen.set(mv.id, now);
      const w = mv.w * T, h = mv.h * T, fx = mv.from.c0 * T, fy = mv.from.r0 * T, tx = mv.to.c0 * T, ty = mv.to.r0 * T;
      dashLine(fx, fy, fx + w, fy, 0.85); dashLine(fx + w, fy, fx + w, fy + h, 0.85); dashLine(fx + w, fy + h, fx, fy + h, 0.85); dashLine(fx, fy + h, fx, fy, 0.85);
      const ax = fx + w / 2, ay = fy + h / 2, bx = tx + w / 2, by = ty + h / 2, L = Math.hypot(bx - ax, by - ay);
      if (L > 8) { const ux = (bx - ax) / L, uy = (by - ay) / L, ex = bx - ux * Math.min(w, h) / 2, ey = by - uy * Math.min(w, h) / 2; dashLine(ax, ay, ex, ey, 0.9); g.fillStyle(CY, 0.95).fillTriangle(ex, ey, ex - ux * 7 - uy * 4, ey - uy * 7 + ux * 4, ex - ux * 7 + uy * 4, ey - uy * 7 - ux * 4); }
      g.fillStyle(CY, 0.14 + 0.08 * Math.sin(now / 260)).fillRect(tx, ty, w, h);
      g.lineStyle(2, CY, pulse).strokeRect(tx - 1, ty - 1, w + 2, h + 2);
      const age = now - this.moveSeen.get(mv.id);
      if (age < 2600) { const r = age / 2600; g.lineStyle(2, CY, 1 - r).strokeRect(tx - 1 - r * 16, ty - 1 - r * 16, w + 2 + r * 32, h + 2 + r * 32); }
      let tag = this.moveTags.get(mv.id);
      if (!tag) { tag = this.add.text(0, 0, String(mv.id), { fontFamily: 'Silkscreen', fontSize: '8px', color: '#12181e', backgroundColor: '#5ad1e6', padding: { x: 2, y: 1 }, resolution: 2 }).setOrigin(0, 1).setDepth(195001); this.moveTags.set(mv.id, tag); }
      tag.setPosition(tx - 1, ty - 2);
    }
    for (const [id, t] of this.moveTags) if (!here.some((m) => m.id === id)) { t.destroy(); this.moveTags.delete(id); }
  }
  /** A move picked in the RUN step's list: the view on it, and its ring again. */
  showMove(mv) { if (!this.cameras) return; if (this.zoomLevel < 2) this.setZoom(2); this.cameras.main.centerOn((mv.to.c0 + mv.w / 2) * T, (mv.to.r0 + mv.h / 2) * T); if (this.moveSeen) this.moveSeen.set(mv.id, performance.now()); }

  /** The furniture back where the model has it (a reset run, 2026-11-13); drawSim redraws moves when a run comes back. */
  restoreFurniture() {
    if (!this.furnitureHome || !this.L) return;
    const byId = new Map(this.L.furniture.map((f) => [String(f.id), f]));
    for (const [id, home] of this.furnitureHome) { const f = byId.get(id); if (f) { f.x = home.x; f.y = home.y; } }
    if (this.stripsMoved && this.stripImages) { for (const im of this.stripImages) im.destroy(); this.stripImages = buildStrips(this, this.L, this.levelFile).map((st) => this.add.image(0, st.top, st.key).setOrigin(0, 0).setDepth(st.depth)); this.stripsMoved = false; }
    if (this.moveGfx) this.moveGfx.clear();
    if (this.moveMarks) { this.moveMarks.clear(); for (const t of this.moveTags.values()) t.destroy(); this.moveTags.clear(); this.moveSeen.clear(); }
    this.movesDrawn = -1;
  }

  /** The simulation's agents on this floor as people sprites with their number, and the lift's car marked by where it is. */
  drawSim() {
    const sim = this.sim, k = sim.b.levelIndex(this.levelFile);
    if (k == null) return;
    const lift = sim.lift, liftHere = Math.round(lift.pos) === k;
    const land = sim.b.landings[k];
    const seen = new Set();
    // the run's events as bubbles over the people (owner 2026-11-13): one per person every few seconds, a cap on screen, the
    // between-year excited bubble and the paper running out first
    if (this.boundSim !== sim) {
      if (this.boundSim && this.emoteFn) this.boundSim.bus.off(this.emoteFn);
      this.boundSim = sim; this.emoteQ = [];
      this.emoteFn = (ev) => { if (this.emoteQ.length < 300) this.emoteQ.push(ev); };
      sim.bus.on(this.emoteFn);
    }
    const now = performance.now();
    if (this.emoteQ.length) {
      const cand = [];
      for (const ev of this.emoteQ) for (const e of emotesFor(ev)) cand.push(e);
      this.emoteQ.length = 0;
      cand.sort((p, q) => q.pri - p.pri);
      for (const e of cand) {
        if (this.emotes.size >= 16 || (this.emotes.size >= 10 && e.pri < 2)) break;
        if (now - (this.emoteSeen.get(e.id) || -1e9) < 3500) continue;
        const ag = sim.byId && sim.byId.get(e.id); if (!ag || !ag.inside) continue;
        if (!(ag.state === 'riding' ? liftHere : ag.k === k)) continue;
        this.emoteSeen.set(e.id, now);
        const old = this.emotes.get(e.id); if (old) old.img.destroy();
        const img = this.add.image(0, 0, 'npc-emotes', EMOTE[e.icon]).setOrigin(0.5, 1).setDepth(200000).setVisible(false);
        this.emotes.set(e.id, { img, born: now, life: e.pri >= 2 ? 2600 : 2000 });
      }
    }
    const dropEmote = (id) => { const em = this.emotes.get(id); if (em) { em.img.destroy(); this.emotes.delete(id); } };
    // the pieces the agents moved (the layout manager): the piece itself is drawn at its new place, by rebuilding the row
    // strips with the moved furniture (owner 2026-11-12: the move must read as the table or board having moved); the old
    // place keeps a faint outline
    const moves = (sim.layout && sim.layout.moves) || [];
    if (!this.moveGfx) { this.moveGfx = this.add.graphics().setDepth(1); this.movesDrawn = -1; }
    if (moves.length !== this.movesDrawn) {
      this.movesDrawn = moves.length; this.moveGfx.clear();
      const here = moves.filter((mv) => mv.k === k);
      if (this.stripImages && this.L) {
        const tm = this.L.tile_m, byId = new Map(this.L.furniture.map((f) => [String(f.id), f]));
        if (!this.furnitureHome) this.furnitureHome = new Map(this.L.furniture.map((f) => [String(f.id), { x: f.x, y: f.y }]));
        for (const [id, home] of this.furnitureHome) { const f = byId.get(id); if (f) { f.x = home.x; f.y = home.y; } }
        let changed = false;
        for (const mv of here) { const f = byId.get(String(mv.pieceId)); if (!f) continue; f.x = mv.to.c0 * tm + ((mv.w * tm) - f.w) / 2; f.y = mv.to.r0 * tm + ((mv.h * tm) - f.d) / 2; changed = true; }
        if (changed || this.stripsMoved) { for (const im of this.stripImages) im.destroy(); this.stripImages = buildStrips(this, this.L, this.levelFile).map((st) => this.add.image(0, st.top, st.key).setOrigin(0, 0).setDepth(st.depth)); this.stripsMoved = changed; }
      }
    }
    this.drawMoveMarks(moves.filter((mv) => mv.k === k), sim);
    for (const a of sim.agents) {
      const here = a.state === 'riding' ? liftHere : a.k === k;
      let entry = this.simSprites.get(a.id);
      if (!here) { if (entry) { entry.sp.setVisible(false); entry.tx.setVisible(false); } dropEmote(a.id); continue; }
      if (!entry) {
        const key = figureFor(this, a.a || a, sim.seed ?? 0);   // a look of its own per person (owner 2026-11-13)
        const sp = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
        const tx = this.add.text(0, 0, String(a.id), { fontFamily: 'Silkscreen', fontSize: '8px', color: '#fbf7ec', resolution: 2 }).setOrigin(0.5, 1).setDepth(190000);
        entry = { sp, tx, key }; this.simSprites.set(a.id, entry);
      }
      let x, y;
      if (a.state === 'riding' && land) { // stood in the car, spread a little
        const cs = land.carTiles, g = sim.b.levels[k].grid; let cx = 0, cy = 0;
        for (const i of cs) { const [c, r] = g.cr(i); cx += c; cy += r; }
        cx /= cs.length; cy /= cs.length;
        x = (cx + 0.5) * T + ((a.id % 3) - 1) * 5; y = (cy + 1) * T + ((a.id % 2) ? 4 : -2);
      } else { x = (a.x + 0.5) * T; y = (a.y + 1) * T; }
      entry.sp.setVisible(true).setPosition(x, y).setDepth(y);
      entry.tx.setVisible(true).setPosition(x, y - 26);
      // walking, typing at a desk, seated at a table or a lecture, otherwise idling with a breath and a blink; each person on
      // its own phase and pace so a crowd never moves in step
      const anim = a.state === 'walking' || a.state === 'climbing' ? 'walk' : a.state === 'doing' && a.activity === 'desk_work' ? 'type' : a.state === 'doing' && SEATED.has(a.activity) ? 'sit' : 'idle';
      const ak = `${entry.key}-${anim}${a.face}`;
      if (entry.anim !== ak) { entry.anim = ak; entry.sp.play({ key: ak, startFrame: anim === 'walk' ? 0 : (a.id * 7) % 3 }); entry.sp.anims.timeScale = anim === 'walk' ? 1 : 0.85 + ((a.id * 37) % 31) / 100; }
      const em = this.emotes.get(a.id);
      if (em) {
        const age = now - em.born;
        if (age >= em.life) dropEmote(a.id);
        else { const t = Math.min(1, age / 180) - 1, pop = age < 180 ? 1 + 2.70158 * t * t * t + 1.70158 * t * t : 1, fade = age > em.life - 300 ? (em.life - age) / 300 : 1; em.img.setVisible(true).setScale(pop).setAlpha(fade).setPosition(Math.round(x), Math.round(y - 35 - (1 - fade) * 5)); }
      }
      seen.add(a.id);
    }
    for (const [id, entry] of this.simSprites) if (!seen.has(id)) { entry.sp.setVisible(false); entry.tx.setVisible(false); dropEmote(id); }
    // the lift's car: green when its doors are open here, amber when it is here, grey when it is elsewhere; its floor and way beside
    if (land) {
      if (!this.liftMark) {
        this.liftMark = { g: this.add.graphics().setDepth(180000), tx: this.add.text(0, 0, '', { fontFamily: 'Silkscreen', fontSize: '8px', color: '#fbf7ec', backgroundColor: '#1b1a22', padding: { x: 2, y: 1 }, resolution: 2 }).setOrigin(0.5, 1).setDepth(190001) };
      }
      const g = sim.b.levels[k].grid; let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
      for (const i of land.carTiles) { const [c, r] = g.cr(i); c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
      const col = liftHere ? (lift.state === 'open' || lift.state === 'opening' ? 0x6fd36f : 0xf3c66b) : 0x8a9096;
      const gr = this.liftMark.g; gr.clear(); gr.lineStyle(2, col, 1); gr.strokeRect(c0 * T + 1, r0 * T + 1, (c1 - c0 + 1) * T - 2, (r1 - r0 + 1) * T - 2);
      gr.lineStyle(1, 0xf3c66b, 0.9); gr.strokeRect(land.c * T + 2, land.r * T + 2, T - 4, T - 4); // the landing (door side inferred)
      const arrow = lift.dir > 0 ? '^' : lift.dir < 0 ? 'v' : '-';
      this.liftMark.tx.setText(`LIFT ${sim.b.levels[Math.round(lift.pos)]?.name} ${arrow} ${lift.passengers.length}/${lift.capacity}`).setPosition((c0 + c1 + 1) * T / 2, r0 * T - 2);
    }
  }

  /** A speech bubble over a person for a few seconds (placeholder text, not a simulation). */
  say(p, text) {
    if (p.bubble) p.bubble.destroy();
    const t = this.add.text(0, 0, text, { fontFamily: 'Nunito', fontSize: '10px', color: '#2a211a', resolution: 2 }).setOrigin(0.5, 1);
    const g = this.add.graphics();
    const w = Math.ceil(t.width) + 8, h = Math.ceil(t.height) + 6;
    g.fillStyle(0x2a211a, 1).fillRect(-w / 2 - 1, -h - 1, w + 2, h + 2);
    g.fillStyle(0xfbf7ec, 1).fillRect(-w / 2, -h, w, h);
    g.fillStyle(0x2a211a, 1).fillRect(-2, 0, 4, 2);
    g.fillStyle(0xfbf7ec, 1).fillRect(-1, -1, 2, 2);
    t.setPosition(0, -3);
    const bubble = this.add.container(p.sp.x, p.sp.y - 30, [g, t]).setDepth(200000);
    p.bubble = bubble;
    this.time.delayedCall(3200, () => { if (p.bubble === bubble) { bubble.destroy(); p.bubble = null; } });
  }
}
