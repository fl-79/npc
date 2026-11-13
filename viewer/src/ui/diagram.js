// The analysis diagram: the vector plan of one level drawn over the stage, in the style of the
// owner's reference diagrams (graphics/Plan-diagram), with an overlay from the run's aggregates:
// activity blobs, encounter circles, walked paths by year, queue ticks, noise discs, desks by year,
// layout drift. Replaces the pixel view while a layer is lit; NONE brings the pixel view back.
const NS = 'http://www.w3.org/2000/svg';
const INK = '#111', SLAB = '#f2f2f2', ROOM = '#fff', FURN = 'rgba(0,0,0,0.28)';
const RED = '#e4473c', BLUE = '#3b5bdb', YEAR = { 1: '#2a9d6b', 2: '#3b5bdb', 3: '#e4473c', 0: '#555' };

export class Diagram {
  constructor(container) { this.el = container; this.svg = null; this.level = null; this.base = null; this.overlay = null; this.mark = null; this.scale = 1; this.pan = [0, 0]; }
  el_(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); (parent || this.svg).appendChild(e); return e; }
  show() { this.el.classList.add('on'); if (this.rectFn) this.track(); }
  hide() { this.el.classList.remove('on'); this.untrack(); }
  /** Over the pixel plan (owner 2026-11-12): the overlay sits on the faded pixel art, aligned to its camera; the base line drawing is hidden. */
  setOver(rectFn) { this.rectFn = rectFn || null; this.el.classList.toggle('over', !!this.rectFn); if (!this.rectFn) this.untrack(); }
  track() {
    const step = () => { if (!this.rectFn || !this.svg) { this.raf = null; return; } const r = this.rectFn(); if (r) { const key = `${r.left.toFixed(1)},${r.top.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`; if (key !== this.lastKey) { this.lastKey = key; this.svg.setAttribute('viewBox', `0 0 ${r.cols} ${r.rows}`); this.svg.setAttribute('preserveAspectRatio', 'none'); Object.assign(this.svg.style, { position: 'absolute', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` }); if (this.base) this.base.setAttribute('display', 'none'); } } this.raf = requestAnimationFrame(step); };
    if (!this.raf) this.raf = requestAnimationFrame(step);
  }
  untrack() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; this.lastKey = null; if (this.svg) { this.svg.removeAttribute('style'); if (this.level) { const vb = this.svg.dataset.vb; if (vb) this.svg.setAttribute('viewBox', vb); } this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); if (this.base) this.base.removeAttribute('display'); } }
  /** Draw the plan of a level (a World level record) once; cached per level file. */
  plan(world, k) {
    const lv = world.levels[k];
    if (this.level === lv.file && this.svg) return;
    this.level = lv.file; this.el.innerHTML = '';
    const { cols, rows, floor, struct, furniture, rooms } = lv.L;
    const svg = this.svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `-1 -1 ${cols + 2} ${rows + 4}`); svg.dataset.vb = `-1 -1 ${cols + 2} ${rows + 4}`; svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); this.el.appendChild(svg); this.lastKey = null;
    const defs = this.el_('defs', {});
    for (const [y, col] of Object.entries(YEAR)) { const p = this.el_('pattern', { id: `dg-h${y}`, width: 1.2, height: 1.2, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${y * 45})` }, defs); this.el_('line', { x1: 0, y1: 0, x2: 0, y2: 1.2, stroke: col, 'stroke-width': 0.12, opacity: 0.35 }, p); const m = this.el_('marker', { id: `dg-arrow${y}`, viewBox: '0 0 6 6', refX: 5, refY: 3, markerWidth: 3, markerHeight: 3, orient: 'auto' }, defs); this.el_('path', { d: 'M0,0 L6,3 L0,6 z', fill: col }, m); }
    for (const [n, col] of [['red', RED], ['blue', BLUE]]) { const gr = this.el_('radialGradient', { id: `dg-blob-${n}` }, defs); this.el_('stop', { offset: 0, 'stop-color': col, 'stop-opacity': 0.5 }, gr); this.el_('stop', { offset: 0.6, 'stop-color': col, 'stop-opacity': 0.18 }, gr); this.el_('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, gr); }
    const base = this.base = this.el_('g', { id: 'dg-base' });
    this.el_('rect', { x: -1, y: -1, width: cols + 2, height: rows + 4, fill: '#fff' }, base);
    const runs = (test) => { const out = []; for (let r = 0; r < rows; r++) { let c = 0; while (c < cols) { if (!test(r, c)) { c++; continue; } let c2 = c; while (c2 + 1 < cols && test(r, c2 + 1)) c2++; out.push([r, c, c2]); c = c2 + 1; } } return out; };
    for (const [r, c, c2] of runs((r, c) => floor[r][c] >= 1 && struct[r][c] !== 1)) this.el_('rect', { x: c, y: r, width: c2 - c + 1, height: 1, fill: floor[r][c] >= 2 ? ROOM : SLAB }, base);
    this.zones = this.el_('g', { id: 'dg-zones', opacity: 0 }, base);
    for (const [r, c, c2] of runs((r, c) => struct[r][c] === 5)) this.el_('rect', { x: c, y: r, width: c2 - c + 1, height: 1, fill: '#e6e6e6' }, base);
    for (const [r, c, c2] of runs((r, c) => struct[r][c] === 1 || struct[r][c] === 3)) this.el_('rect', { x: c, y: r, width: c2 - c + 1, height: 1, fill: INK }, base);
    for (const [r, c, c2] of runs((r, c) => struct[r][c] === 2)) this.el_('rect', { x: c + 0.3, y: r + 0.3, width: c2 - c + 0.4, height: 0.4, fill: '#8ec1d8' }, base);
    for (const f of furniture) if (f.kind !== 'elevator') this.el_('rect', { x: f.c0 + 0.1, y: f.r0 + 0.1, width: f.c1 - f.c0 + 0.8, height: f.r1 - f.r0 + 0.8, fill: 'none', stroke: FURN, 'stroke-width': 0.08 }, base);
    for (const rm of rooms) if (rm.number) this.el_('text', { x: rm.label[0] - 0.8, y: rm.label[1] + 0.5, 'font-family': 'Nunito, sans-serif', 'font-size': 1.5, fill: '#777' }, base).textContent = rm.number;
    this.el_('rect', { x: 2, y: rows + 1.2, width: 10, height: 0.5, fill: INK }, base); this.el_('text', { x: 2, y: rows + 0.8, 'font-family': 'Nunito, sans-serif', 'font-size': 1.3, fill: '#444' }, base).textContent = '0        5 m';
    const nx = cols - 2, ny = rows + 1.2; this.el_('path', { d: `M${nx},${ny} l-0.9,2.2 l0.9,-0.6 l0.9,0.6 z`, fill: INK, transform: `rotate(-62 ${nx} ${ny + 1})` }, base); this.el_('text', { x: nx - 0.5, y: ny - 0.3, 'font-family': 'Nunito, sans-serif', 'font-size': 1.3, fill: '#444' }, base).textContent = 'N';
    this.overlay = this.el_('g', { id: 'dg-overlay' });
  }
  clear() { if (this.overlay) this.overlay.innerHTML = ''; if (this.zones) this.zones.setAttribute('opacity', 0); }
  blob(c, r, rad, col) { this.el_('circle', { cx: c, cy: r, r: rad, fill: `url(#dg-blob-${col})` }, this.overlay); }
  /** Draw a layer from the run's stats on level k. */
  layer(name, run, k, opts = {}) {
    this.clear();
    const w = run.w, g = w.levels[k].grid, st = run.stats, f = st.fields[k], o = this.overlay;
    const idx = (c, r) => g.idx(c, r);
    const yearOfDesk = (d) => d.year;
    if (name === 'activity') {
      const occ = f.occ; let mx = 0; for (const v of occ) mx = Math.max(mx, v);
      for (const d of w.studioDesks) { if (d.k !== k) continue; const v = occ[idx(...d.stand)] / Math.max(1, mx); if (v > 0.45) this.blob(d.stand[0] + 0.5, d.stand[1] + 0.5, 1.4 + v * 2.4, 'red'); else if (v > 0 && v < 0.15) this.blob(d.stand[0] + 0.5, d.stand[1] + 0.5, 1.8, 'blue'); }
      for (const p of [...w.plotters, ...w.kitchenSpots.slice(0, 2), ...w.loungeSpots.slice(0, 2)]) if (p.k === k) { const v = occ[idx(...p.stand)] / Math.max(1, mx); if (v > 0.05) this.blob(p.stand[0] + 0.5, p.stand[1] + 0.5, 2.5 + v * 3, 'red'); }
    }
    if (name === 'encounters') { for (const s of st.sites.values()) { if (s.k !== k) continue; const between = s.between > s.same; this.el_('circle', { cx: s.c + 0.5, cy: s.r + 0.5, r: 0.4 + Math.sqrt(s.n) * 0.25, fill: between ? 'rgba(228,71,60,0.55)' : 'rgba(17,17,17,0.35)', stroke: between ? RED : '#111', 'stroke-width': 0.08 }, o); } }
    if (name === 'paths') {
      const smooth = (pts) => { let p = pts; for (let it = 0; it < 2; it++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1]; q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]); q.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } q.push(p[p.length - 1]); p = q; } return p; };
      let n = 0;
      for (const p of st.pathsList) { if (p.k !== k || n++ > 900) continue; const pts = smooth(p.pts.map(([c, r]) => [c + 0.5, r + 0.5])); this.el_('polyline', { points: pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '), fill: 'none', stroke: YEAR[p.year] || '#555', 'stroke-opacity': 0.35, 'stroke-width': 0.18, 'stroke-linejoin': 'round', 'marker-end': `url(#dg-arrow${p.year || 0})` }, o); }
      const hot = []; for (let i = 0; i < f.paths.length; i++) if (f.paths[i] > 0) hot.push([f.paths[i], i]); hot.sort((a, b) => b[0] - a[0]);
      const spine = hot.slice(0, 80).map(([, i]) => [i % g.cols + 0.5, Math.floor(i / g.cols) + 0.5]).sort((a, b) => a[1] - b[1]);
      if (spine.length > 2) this.el_('polyline', { points: smooth(spine).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '), fill: 'none', stroke: '#111', 'stroke-width': 0.5, 'stroke-opacity': 0.8, 'stroke-linejoin': 'round' }, o);
    }
    if (name === 'queues') { const waits = st.queues.plotters || []; const n = waits.length ? Math.round(waits.reduce((s, x) => s + x, 0) / waits.length / 60) : 0; const p = w.plotters[0]; if (p && p.k === k) { for (let i = 0; i < Math.min(30, n); i++) this.el_('rect', { x: p.stand[0] + 1.4 + i * 0.6, y: p.stand[1] - 0.2, width: 0.3, height: 1.4, fill: RED, opacity: 0.95 - i * 0.02 }, o); this.el_('text', { x: p.stand[0] + 1.4, y: p.stand[1] - 0.6, 'font-family': 'Nunito, sans-serif', 'font-size': 1.3, fill: RED }, o).textContent = `${n} min mean, ${waits.length} jobs`; } const lw = st.queues.lift || []; const land = run.b.landings[k]; if (land && lw.length) { const m = Math.round(lw.reduce((s, x) => s + x, 0) / lw.length); for (let i = 0; i < Math.min(12, Math.round(m / 10)); i++) this.el_('rect', { x: land.c - 1.5 - i * 0.6, y: land.r, width: 0.3, height: 1, fill: RED }, o); this.el_('text', { x: land.c - 8, y: land.r - 0.6, 'font-family': 'Nunito, sans-serif', 'font-size': 1.3, fill: RED }, o).textContent = `lift ${m} s mean`; } }
    if (name === 'noise') { const nz = f.noise; let mx = 0; for (const v of nz) mx = Math.max(mx, v); for (let r = 0; r < g.rows; r += 2) for (let c = 0; c < g.cols; c += 2) { const v = nz[idx(c, r)] / Math.max(1, mx); if (v > 0.12) this.blob(c + 1, r + 1, 1.5 + v * 4, 'red'); } for (const d of w.studioDesks) if (d.k === k && nz[idx(...d.stand)] / Math.max(1, mx) < 0.02 && f.occ[idx(...d.stand)] > 0) this.blob(d.stand[0] + 0.5, d.stand[1] + 0.5, 1.6, 'blue'); }
    if (name === 'years') { this.zones.setAttribute('opacity', 1); if (!this.zones.childElementCount) for (const d of w.studioDesks) if (d.k === k) this.el_('rect', { x: d.c0 - 1, y: d.r0 - 1, width: d.c1 - d.c0 + 3, height: d.r1 - d.r0 + 3, fill: `url(#dg-h${yearOfDesk(d)})` }, this.zones); for (const d of w.studioDesks) if (d.k === k) this.el_('rect', { x: d.c0 + 0.1, y: d.r0 + 0.1, width: d.c1 - d.c0 + 0.8, height: d.r1 - d.r0 + 0.8, fill: YEAR[d.year], opacity: d.hot ? 0.2 : 0.55 }, o); for (const s of st.sites.values()) if (s.k === k && s.between) this.el_('circle', { cx: s.c + 0.5, cy: s.r + 0.5, r: 0.9, fill: 'none', stroke: '#111', 'stroke-width': 0.18 }, o); }
    if (name === 'drift') { for (const mv of run.layout?.moves || []) { if (mv.k !== k) continue; this.el_('rect', { x: mv.from.c0, y: mv.from.r0, width: mv.w, height: mv.h, fill: 'none', stroke: '#111', 'stroke-width': 0.15, 'stroke-dasharray': '0.4 0.3' }, o); this.el_('rect', { x: mv.to.c0, y: mv.to.r0, width: mv.w, height: mv.h, fill: RED, opacity: 0.75 }, o); this.el_('line', { x1: mv.from.c0 + mv.w / 2, y1: mv.from.r0 + mv.h / 2, x2: mv.to.c0 + mv.w / 2, y2: mv.to.r0 + mv.h / 2, stroke: RED, 'stroke-width': 0.15 }, o); } for (const gp of run.w.gaps || []) { if (gp.k !== k) continue; for (const [c, r] of gp.tiles) this.el_('rect', { x: c, y: r, width: 1, height: 1, fill: 'none', stroke: '#777', 'stroke-width': 0.12, 'stroke-dasharray': '0.25 0.2' }, o); } if (!(run.layout?.moves || []).length) this.el_('text', { x: 2, y: 2, 'font-family': 'Nunito, sans-serif', 'font-size': 1.4, fill: '#444' }, o).textContent = `no object moved (movement: ${run.movement})${(run.w.gaps || []).filter((g) => g.k === k).length ? ' · grey dashes: a piece rolled aside for boxed-in desks' : ''}`; }
  }
  pointAt(c, r) { if (this.mark) this.mark.remove(); this.mark = this.el_('g', {}); const ring = this.el_('circle', { cx: c + 0.5, cy: r + 0.5, r: 2.2, fill: 'none', stroke: RED, 'stroke-width': 0.35 }, this.mark); ring.innerHTML = '<animate attributeName="r" values="1.6;3;1.6" dur="1.2s" repeatCount="indefinite"/>'; this.el_('circle', { cx: c + 0.5, cy: r + 0.5, r: 0.6, fill: RED }, this.mark); }
}
