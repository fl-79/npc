import * as THREE from 'three';
import { Scene } from './scene.js';
import { loadModel, elementAtIndex, geometryFor } from './load.js';
import { buildRooms, buildGrids } from './rooms.js';
import { buildContext } from './context.js';
import { KIND, kindInfo } from './palette.js';
import { PixelFloorView, tileFileOf } from './game/embed.js';
import { USE_LABELS } from './game/tileset.js';
import { Building } from './sim/building.js';
import { Simulation } from './sim/sim.js';
import { initPanels } from './ui/panels.js';
import { RunController } from './ui/run.js';
import { loader } from './ui/loader.js';
import { startTour, maybeStartTour } from './ui/tour.js';

const $ = (s) => document.querySelector(s);
const statusEl = $('#status');
const status = (msg) => { statusEl.innerHTML = msg; };

const scene = new Scene($('#gl'), $('#labels'));
// a floor's views are the pixel plan and pixel isometric (Phaser, from the rasterised tiles); they take over the stage then
const pixel = new PixelFloorView($('#game'));
window.npcPixel = pixel; // for inspection from the console
// the second pane's floor view (owner 2026-11-13): a floor on its own, plan or isometric, beside pane A; it shares the tiles, the
// program and the running simulation with pane A
const pixelB = new PixelFloorView($('#game-b'));
window.npcPixelB = pixelB;

// fold buttons on every window; in a narrow pane only VIEW and LEVELS start open
for (const b of document.querySelectorAll('[data-fold]')) {
  b.addEventListener('click', () => b.closest('.win').classList.toggle('folded'));
}
if (window.innerWidth < 1000) {
  for (const id of ['layers', 'rooms', 'checks', 'info']) document.getElementById(id).closest('.win').classList.add('folded');
}

function bboxToBox3(bb) {
  if (!bb) return null;
  const [a, b] = bb;
  return new THREE.Box3(new THREE.Vector3(a[0], a[2], -b[1]), new THREE.Vector3(b[0], b[2], -a[1]));
}

function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

async function main() {
  let data;
  try {
    loader.show('LOADING THE BUILDING', 'the model', 0.02);
    data = await loadModel(status, (f, t) => loader.set(f, t));
    loader.set(0.88, 'the views');
  } catch (e) {
    loader.hide(0);
    status(`<b>LOAD FAILED</b><br>${esc(e.message)}<br>Run Export Model in Revit (NPC tab) and <code>python -I scripts/validate_export.py</code>, then reload.`);
    return;
  }
  const { model, checks, elements, geomById, merged, bounds, levelIndex } = data;
  const levelZ = new Map(model.levels.map((l) => [l.name, l.elevation_m]));
  const levelNames = model.levels.map((l) => l.name);

  // ---------------------------------------------------------------- meshes
  const groupMeshes = [];
  let triangles = 0;
  for (const g of merged) {
    const mesh = new THREE.Mesh(g.geometry, scene.material(g.kind));
    mesh.userData = { span: g.span, levelIndex: g.levelIndex, kind: g.kind, ranges: g.ranges };
    if (kindInfo(g.kind).glass) mesh.renderOrder = 2;
    scene.root.add(mesh);
    groupMeshes.push(mesh);
    triangles += g.triangles;
  }

  // ---------------------------------------------------------------- rooms, grids
  const badRoomIds = new Set();
  for (const c of checks.checks || []) if (c.kind.startsWith('room_') && c.severity !== 'info') for (const id of c.ids) badRoomIds.add(id);
  const rooms = buildRooms(model, levelZ, badRoomIds);
  scene.root.add(rooms.group);
  const grids = buildGrids(model, (model.levels[0]?.elevation_m ?? 0) - 0.05);
  grids.visible = false;
  scene.root.add(grids);

  // urban context (OpenStreetMap), only with the whole building
  let context = null, contextMeta = null;
  try {
    const res = await fetch('/exports/context.json');
    if (res.ok) {
      const ctx = await res.json();
      contextMeta = ctx.meta;
      context = buildContext(ctx, (k) => scene.material(k));
      scene.root.add(context);
      pixel.setContext(ctx); pixelB.setContext(ctx);
    }
  } catch (e) { /* no context file: run scripts/fetch_context.py */ }

  // ---------------------------------------------------------------- visibility state
  const state = {
    stack: true, // a floor's isometric stands on the floors below it and the surroundings
    levelOn: new Map(levelNames.map((n) => [n, true])),
    cutAbove: null, // level index; hide everything above it
    kindOn: new Map(Object.keys(KIND).map((k) => [k, !KIND[k].off])),
    rooms: false, labels: true, allLabels: false, grids: false, context: true,
    clip: false, cutHeight: 2.6, // optional lower section cut in a floor view, this far above its level
    people: 0, // placeholder people in a floor's pixel plan (0 since 2026-11-12: a run draws the real ones; the slider is off the interface)
  };
  for (const g of merged) if (!state.kindOn.has(g.kind)) state.kindOn.set(g.kind, true);

  // A merged group is visible when any level it spans is on and its lowest level is not
  // above the cut; a room belongs to its own level only.
  function spanVisible(span) {
    if (!span || !span.length) return true;
    if (state.cutAbove != null && span[0] > state.cutAbove) return false;
    return span.some((i) => state.levelOn.get(levelNames[i]));
  }
  function applyVisibility() {
    for (const m of groupMeshes) m.visible = spanVisible(m.userData.span) && state.kindOn.get(m.userData.kind) !== false;
    // labels only on the highest visible level (the one you look down into), unless "all labels"
    let topIdx = -1, lowIdx = -1;
    for (let i = 0; i < levelNames.length; i++) if (spanVisible([i])) { topIdx = i; if (lowIdx < 0) lowIdx = i; }
    // a floor view is always the storey slice: from just under its slab to the next level
    // line, so walls and glazing through several storeys show only their part of this one;
    // the optional lower cut sections it at "Cut height" instead
    const solo = soloed();
    if (solo != null) {
      const i = levelIndex.get(solo);
      const z = levelZ.get(solo);
      const next = i + 1 < model.levels.length ? model.levels[i + 1].elevation_m : z + 50;
      scene.setClip(z - 0.95, state.clip ? Math.min(next - 0.02, z + state.cutHeight) : next - 0.02);
    } else if (scene.mode === 'game' && context && state.context) {
      // elevation: cut away the surroundings that stand between the camera and the building
      const b = visibleBounds();
      const centre = b.getCenter(new THREE.Vector3());
      const size = b.getSize(new THREE.Vector3());
      const ext = scene.azimuth % 2 === 0 ? size.z / 2 : size.x / 2;
      scene.setClip(null, null, [scene.nearPlane(centre, ext + 2)]);
    } else {
      scene.setClip(null, null);
    }
    for (const { mesh, label, room } of rooms.byId.values()) {
      const idx = levelIndex.has(room.level) ? levelIndex.get(room.level) : -1;
      const lv = idx < 0 ? true : spanVisible([idx]);
      mesh.visible = state.rooms && lv;
      label.visible = state.labels && lv && (state.allLabels || idx < 0 || idx === topIdx);
    }
    grids.visible = state.grids;
    // context: with the whole building, and in a floor's plan (game) view; not in a floor's isometric.
    // In a floor plan the context is lifted (or lowered) to that floor's level, so a basement plan
    // is not covered by ground that lies above it: the surroundings read as a map around the plan.
    if (context) {
      const solo = soloed();
      context.visible = state.context && (solo == null || scene.mode === 'game');
      context.position.y = solo != null && scene.mode === 'game' ? levelZ.get(solo) - contextMeta.ground_m : 0;
    }
  }

  // ---------------------------------------------------------------- selection and highlight
  let selectedId = null;
  function highlight(ids, { frame = true, color = 0xff3b3b, box = null } = {}) {
    scene.clearOverlay();
    const union = new THREE.Box3();
    for (const id of ids) {
      const entry = geomById.get(id);
      const rec = elements.get(id);
      if (entry) {
        const geo = geometryFor(entry);
        const flat = entry.kind === 'floor' || entry.kind === 'ceiling' || entry.kind === 'roof';
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: flat ? 0.25 : 0.7, depthTest: !flat ? false : true, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.userData.pulse = !flat;
        m.renderOrder = 10;
        scene.overlay.add(m);
        union.union(geo.boundingBox);
        color = 0xff8a3b; // second element in a pair gets orange
      } else if (rooms.byId.has(id)) {
        const r = rooms.byId.get(id);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(r.mesh.geometry), new THREE.LineBasicMaterial({ color: 0xff3b3b, depthTest: false }));
        edges.renderOrder = 10;
        scene.overlay.add(edges);
        union.union(r.box);
      } else if (rec && rec.bbox) {
        const b3 = bboxToBox3(rec.bbox);
        scene.overlay.add(new THREE.Box3Helper(b3, 0xff3b3b));
        union.union(b3);
      }
    }
    if (box) {
      const b3 = bboxToBox3(box);
      const h = new THREE.Box3Helper(b3, 0xffff3b);
      h.material.depthTest = false;
      scene.overlay.add(h);
      if (union.isEmpty()) union.copy(b3);
    }
    if (frame && !union.isEmpty()) {
      const pad = union.clone().expandByScalar(Math.max(1.5, union.getSize(new THREE.Vector3()).length() * 0.25));
      scene.frame(pad, 1.1);
    }
  }

  function describe(id) {
    const rec = elements.get(id);
    if (!rec) return `<b>ID ${id}</b><br>not in model.json (mesh only)`;
    const rows = [];
    const add = (k, v) => { if (v !== undefined && v !== null && v !== '') rows.push(`<tr><td class="k">${k}</td><td>${esc(v)}</td></tr>`); };
    add('id', rec.id); add('kind', rec.kind); add('category', rec.category); add('family', rec.family); add('type', rec.type);
    add('level', rec.level + (rec.level_source && rec.level_source !== 'param' ? ` (from ${rec.level_source})` : ''));
    if (rec.kind === 'room') { add('number', rec.number); add('name', rec.name); add('area', rec.area_m2 + ' m2'); add('status', rec.status); add('loops', rec.loops?.length); add('height', rec.height_m + ' m'); }
    if (rec.kind === 'wall') { add('width', rec.width_m + ' m'); add('height', rec.height_m + ' m'); add('length', rec.length_m + ' m'); add('function', rec.function); add('curtain', rec.is_curtain); add('base', rec.base_constraint); add('top', rec.top_constraint); }
    if (rec.kind === 'door' || rec.kind === 'window') { add('host', rec.host); add('width', rec.width_m + ' m'); add('height', rec.height_m + ' m'); add('sill', rec.sill_m + ' m'); add('offset along host', rec.offset_along_host_m + ' m'); }
    if (rec.kind === 'stair') { add('base', rec.base_level); add('top', rec.top_level); add('runs', rec.runs?.length); add('landings', rec.landings?.length); add('risers', rec.runs?.map((r) => r.risers).join(' + ')); add('run width', rec.runs?.[0]?.width_m + ' m'); }
    if (rec.span) add('spans levels', rec.span.map((i) => levelNames[i]).join(', '));
    if (rec.point) add('point', rec.point.map((v) => v.toFixed(2)).join(', '));
    if (rec.rotation_rad != null) add('rotation', (rec.rotation_rad * 180 / Math.PI).toFixed(1) + ' deg');
    if (rec.host && rec.kind !== 'door' && rec.kind !== 'window') add('host', rec.host);
    if (rec.parent) add('nested in', rec.parent);
    if (rec.phase_demolished) add('demolished', rec.phase_demolished);
    if (rec.in_place) add('in-place', 'yes');
    const related = (checks.checks || []).filter((c) => c.ids.includes(id));
    let html = `<table>${rows.join('')}</table>`;
    if (related.length) html += '<div style="margin-top:4px">' + related.map((c) => `<span class="tag ${c.severity}">${c.severity}</span>${esc(c.message)}`).join('<br>') + '</div>';
    return html;
  }

  function select(id, frame = false) {
    selectedId = id;
    for (const b of document.querySelectorAll('.item.sel')) b.classList.remove('sel');
    if (id == null) { scene.clearOverlay(); $('#info').textContent = 'Click an element.'; return; }
    $('#info').innerHTML = describe(id);
    highlight([id], { frame });
    const b = document.querySelector(`.item[data-id="${id}"]`);
    if (b) { b.classList.add('sel'); b.scrollIntoView({ block: 'nearest' }); }
  }

  // picking
  const ray = new THREE.Raycaster();
  let downAt = null;
  scene.canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  scene.canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4 || e.button !== 0) return;
    const r = scene.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, scene.camera);
    const targets = groupMeshes.filter((m) => m.visible);
    if (state.rooms) for (const { mesh } of rooms.byId.values()) if (mesh.visible) targets.push(mesh);
    // ignore hits that the section cut has clipped away
    const planes = scene.clipPlanes || [];
    const hits = ray.intersectObjects(targets, false).filter((h) => planes.every((p) => p.distanceToPoint(h.point) >= 0));
    if (!hits.length) { select(null); return; }
    const h = hits[0];
    if (h.object.userData.roomId) select(h.object.userData.roomId);
    else select(elementAtIndex(h.object.userData.ranges, h.faceIndex * 3));
  });

  // ---------------------------------------------------------------- panel: levels
  const levelsEl = $('#levels');
  // One choice: the whole building (nothing cut, nothing hidden), or a single floor plan
  // (soloed, with the section cut). The roof level has no plan, so it gets no button.
  const planLevels = levelNames.filter((n) => !/roof/i.test(n));
  pixel.setLevels(planLevels.map((n) => ({ name: n, file: tileFileOf(n) }))); // a floor's isometric stands on the floors below it
  pixelB.setLevels(planLevels.map((n) => ({ name: n, file: tileFileOf(n) }))); pixelB.tiles = pixel.tiles;   // the same tile files, fetched once
  // pane B: off by default; a floor and a view of its own
  const paneB = { on: true, level: planLevels.find((n) => /level 3/i.test(n)) || planLevels[0], mode: 'plan' };   // two panes by default: the building beside Level 3 (owner 2026-11-13)
  function syncPaneB() {
    $('#stage').classList.toggle('two', paneB.on);
    const pb = $('#pane-b'); pb.hidden = !paneB.on;
    $('#view-tabs-b').hidden = !paneB.on;
    if (paneB.on) paneB.loading = pixelB.show(tileFileOf(paneB.level), { view: paneB.mode === 'plan' ? 'plan' : 'iso', azimuth: scene.azimuth, labels: state.labels, contextOn: state.context, people: state.people, stack: state.stack });
    else pixelB.hide();
    scene.resize(); if (pixel.game) pixel.game.scale.refresh(); if (pixelB.game) pixelB.game.scale.refresh();
    setTimeout(() => { if (pixel.game) { pixel.game.scale.refresh(); pixel.fit(); } if (pixelB.game && paneB.on) { pixelB.game.scale.refresh(); pixelB.fit(); } if (!pixelActive()) frameView(); }, 60);
  }
  function setPanes(two) { paneB.on = !!two; if (paneB.max) { paneB.max = null; $('#stage').classList.remove('max-a', 'max-b'); } syncPaneB(); renderTabs(); }
  // a double click on a pane's title (owner 2026-11-13): that pane alone over the whole stage, as in Rhino; again, and the two come back.
  // With one pane on, a double click brings the second back.
  function toggleMax(p) {
    if (!paneB.on) { setPanes(true); return; }
    paneB.max = paneB.max ? null : p;
    const st = $('#stage'); st.classList.toggle('max-a', paneB.max === 'a'); st.classList.toggle('max-b', paneB.max === 'b');
    renderPaneTitles(); refreshViews();
  }
  function titleUI(sel, p) {
    const box = sel.parentElement, btn = document.createElement('button'), menu = document.createElement('div');
    btn.className = 'pt-name'; btn.title = 'click: the views; double-click: this pane alone, and back'; menu.className = 'pt-menu'; menu.hidden = true; box.append(btn, menu);
    let timer = null;   // one click waits a moment for a second, so a double click never opens the menu
    btn.addEventListener('click', () => { clearTimeout(timer); timer = setTimeout(() => { menu.hidden = !menu.hidden; }, 240); });
    btn.addEventListener('dblclick', () => { clearTimeout(timer); menu.hidden = true; toggleMax(p); });
    menu.addEventListener('click', (e) => { const o = e.target.closest('[data-v]'); if (!o) return; menu.hidden = true; sel.value = o.dataset.v; sel.dispatchEvent(new Event('change')); });
    document.addEventListener('pointerdown', (e) => { if (!box.contains(e.target)) menu.hidden = true; });
    return { sync() { const o = sel.options[sel.selectedIndex]; btn.innerHTML = `${o ? o.textContent : ''}${paneB.max === p ? ' &middot; ALONE' : ''} &#9662;`; menu.innerHTML = [...sel.options].map((x) => `<div data-v="${x.value}" class="${x.selected ? 'on' : ''}">${x.textContent}</div>`).join(''); } };
  }
  // the pane titles (owner 2026-11-13): the view's name in the pane's corner, a menu of the views
  const paneViews = (withBuilding) => { const out = []; if (withBuilding) out.push({ v: 'building|iso', t: 'BUILDING \u00b7 ISOMETRIC' }); for (const lv of model.levels.slice().reverse()) { if (!planLevels.includes(lv.name)) continue; out.push({ v: `${lv.name}|plan`, t: `${lv.name.toUpperCase()} \u00b7 PLAN` }, { v: `${lv.name}|iso`, t: `${lv.name.toUpperCase()} \u00b7 ISOMETRIC` }); } return out; };
  function renderPaneTitles() {
    const a = $('#pane-view-a'), b = $('#pane-view-b'); if (!a || !b) return;
    const curA = soloed() == null ? 'building|iso' : `${soloed()}|${scene.mode === 'game' ? 'plan' : 'iso'}`;
    a.innerHTML = paneViews(true).map((o) => `<option value="${o.v}"${o.v === curA ? ' selected' : ''}>${o.t}</option>`).join('');
    const curB = `${paneB.level}|${paneB.mode === 'plan' ? 'plan' : 'iso'}`;
    b.innerHTML = paneViews(false).map((o) => `<option value="${o.v}"${o.v === curB ? ' selected' : ''}>${o.t}</option>`).join('');
    const ui = renderPaneTitles.ui || (renderPaneTitles.ui = { a: titleUI(a, 'a'), b: titleUI(b, 'b') }); ui.a.sync(); ui.b.sync();
  }
  $('#pane-view-a').addEventListener('change', (e) => { const [lv, md] = e.target.value.split('|'); if (lv === 'building') showLevel(null); else { if (soloed() !== lv) showLevel(lv); setMode(md === 'plan' ? 'game' : 'iso'); } });
  $('#pane-view-b').addEventListener('change', (e) => { const [lv, md] = e.target.value.split('|'); paneB.level = lv; paneB.mode = md; syncPaneB(); renderTabs(); });
  const refreshViews = () => { scene.resize(); if (pixel.game) { pixel.game.scale.refresh(); } if (pixelB.game) pixelB.game.scale.refresh(); setTimeout(() => { if (pixel.game) { pixel.game.scale.refresh(); if (pixelActive()) pixel.fit(); else frameView(); } if (pixelB.game && paneB.on) { pixelB.game.scale.refresh(); pixelB.fit(); } }, 60); };
  window.addEventListener('resize', () => { if (paneB.on) syncPaneB(); else refreshViews(); });
  // the feed's bottom edge (owner 2026-11-13): drag it taller or shorter; a double click returns it to a third of the window at most
  { const feed = $('#feed'), grip = feed && feed.querySelector('.feed-grip'); let drag = false;
    if (grip) {
      grip.addEventListener('pointerdown', (e) => { drag = true; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
      grip.addEventListener('pointermove', (e) => { if (!drag) return; const top = feed.getBoundingClientRect().top; const h = Math.max(90, Math.min(window.innerHeight - top - 12, e.clientY - top + 4)); feed.style.height = `${h}px`; feed.classList.add('sized'); });
      grip.addEventListener('pointerup', (e) => { if (!drag) return; drag = false; grip.releasePointerCapture(e.pointerId); });
      grip.addEventListener('dblclick', () => { feed.style.height = ''; feed.classList.remove('sized'); });
    }
  }
  // the divider between the panes (owner 2026-11-13): drag it; the split is a share of the stage, kept between 25% and 75%
  { const dv = $('#divider'), stage = $('#stage'); let dragging = false;
    if (dv) { dv.hidden = false;
      dv.addEventListener('pointerdown', (e) => { dragging = true; dv.setPointerCapture(e.pointerId); e.preventDefault(); });
      dv.addEventListener('pointermove', (e) => { if (!dragging) return; const r = stage.getBoundingClientRect(); const share = Math.max(0.25, Math.min(0.75, (e.clientX - r.left) / r.width)); document.documentElement.style.setProperty('--split', `${(share * 100).toFixed(1)}%`); });
      dv.addEventListener('pointerup', (e) => { if (!dragging) return; dragging = false; dv.releasePointerCapture(e.pointerId); refreshViews(); });
    }
  }
  function showLevel(name) {
    for (const n of levelNames) state.levelOn.set(n, name == null || n === name);
    state.cutAbove = null;
    scene.setBuilding(name == null);
    // the whole building has one view, the isometric: no elevations
    if (name == null && scene.mode === 'game') { scene.setMode('iso'); $('#mode-iso').classList.add('on'); $('#mode-game').classList.remove('on'); }
    $('#mode-game').disabled = name == null;
    renderLevels(); applyVisibility();
    syncPixel();
    frameView();
  }
  // ---------------------------------------------------------------- the pixel views of a floor
  // One floor is always the Phaser stage: GAME VIEW its pixel plan, ISOMETRIC its pixel isometric
  // from one of four corners (TURN L / TURN R). The three.js controls that mean nothing there
  // (cut, wall height, pixel size, edges, dither) rest; the three.js stage keeps the building.
  function pixelActive() { return soloed() != null; }
  const restIds = ['wallh', 'pixel', 'edges', 'dither'];
  function syncPixel() {
    const on = pixelActive();
    const plan = on && scene.mode === 'game';
    $('#stage').classList.toggle('pixel', on);
    for (const id of restIds) { const el = $('#' + id); el.disabled = on; const row = el.closest('.row'); if (row) row.classList.toggle('disabled', on); }
    // the whole building has one view and no turning: GAME VIEW, TURN L and TURN R are for an isolated floor only
    if (!on && scene.mode === 'game') { scene.setMode('iso'); $('#mode-iso').classList.add('on'); $('#mode-game').classList.remove('on'); }
    $('#mode-game').disabled = !on;
    for (const id of ['rot-l', 'rot-r']) $('#' + id).disabled = plan || !on;
    const fitBtn = $('#fit'); if (fitBtn) fitBtn.disabled = !on;
    $('#people').disabled = !plan;
    $('#people').closest('.row').classList.toggle('disabled', !plan);
    $('#stack').disabled = !(on && !plan);
    $('#stack').closest('.row').classList.toggle('disabled', !(on && !plan));
    if (on) pixel.show(tileFileOf(soloed()), { view: plan ? 'plan' : 'iso', azimuth: scene.azimuth, labels: state.labels, contextOn: state.context, people: state.people, stack: state.stack });
    else pixel.hide();
  }
  pixel.onZoom = () => updateViewName();
  function soloed() {
    const on = levelNames.filter((n) => state.levelOn.get(n));
    return on.length === 1 ? on[0] : null;
  }
  // the view tabs under the VIEW bar: the floors and the two views, in sight through every step (owner 2026-11-12)
  function renderTabs() {
    const el = $('#view-tabs'); if (!el) return;
    el.innerHTML = '';
    const cur = soloed();
    const tab = (label, on, disabled, fn, title) => { const b = document.createElement('button'); b.textContent = label; b.className = on ? 'on' : ''; b.disabled = !!disabled; if (title) b.title = title; b.addEventListener('click', fn); el.appendChild(b); return b; };
    tab('BUILDING', cur == null, false, () => showLevel(null), 'the whole building');
    for (const lv of model.levels.slice().reverse()) { if (!planLevels.includes(lv.name)) continue; tab(lv.name.replace(/^Level /i, 'L').toUpperCase(), cur === lv.name, false, () => showLevel(lv.name), lv.name); }
    const sep = document.createElement('span'); sep.className = 'sep'; el.appendChild(sep);
    tab('ISO', scene.mode !== 'game', false, () => setMode('iso'), 'isometric');
    tab('PLAN', scene.mode === 'game', cur == null, () => setMode('game'), cur == null ? 'a floor only' : 'plan view');
    // the pane picker (owner 2026-11-13): one view, or two side by side; the second is a floor on its own
    const sep2 = document.createElement('span'); sep2.className = 'sep'; el.appendChild(sep2);
    const pl = document.createElement('span'); pl.className = 'plbl'; pl.textContent = 'PANES'; el.appendChild(pl);
    tab('ONE', !paneB.on, false, () => setPanes(false), 'one view');
    tab('TWO', paneB.on, false, () => setPanes(true), 'two views side by side');
    renderPaneTitles();
    const elB = $('#view-tabs-b'); if (!elB) return; elB.innerHTML = '';
    if (paneB.on) {
      const tabB = (label, on, fn, title) => { const b = document.createElement('button'); b.textContent = label; b.className = on ? 'on' : ''; if (title) b.title = title; b.addEventListener('click', fn); elB.appendChild(b); return b; };
      const lb = document.createElement('span'); lb.className = 'plbl'; lb.textContent = 'PANE B'; elB.appendChild(lb);
      for (const lv of model.levels.slice().reverse()) { if (!planLevels.includes(lv.name)) continue; tabB(lv.name.replace(/^Level /i, 'L').toUpperCase(), paneB.level === lv.name, () => { paneB.level = lv.name; syncPaneB(); renderTabs(); }, lv.name); }
      const sepB = document.createElement('span'); sepB.className = 'sep'; elB.appendChild(sepB);
      tabB('ISO', paneB.mode !== 'plan', () => { paneB.mode = 'iso'; syncPaneB(); renderTabs(); }, 'isometric');
      tabB('PLAN', paneB.mode === 'plan', () => { paneB.mode = 'plan'; syncPaneB(); renderTabs(); }, 'plan view');
    }
  }
  function renderLevels() {
    renderTabs();
    levelsEl.innerHTML = '';
    const cur = soloed();
    const row = document.createElement('div');
    row.className = 'row';
    const all = document.createElement('button');
    all.textContent = 'BUILDING';
    all.className = cur == null ? 'on' : '';
    all.addEventListener('click', () => showLevel(null));
    row.appendChild(all);
    for (const lv of model.levels.slice().reverse()) {
      if (!planLevels.includes(lv.name)) continue;
      const b = document.createElement('button');
      b.textContent = lv.name.toUpperCase();
      b.title = `${lv.elevation_m.toFixed(2)} m`;
      b.className = cur === lv.name ? 'on' : '';
      b.addEventListener('click', () => showLevel(lv.name));
      row.appendChild(b);
    }
    levelsEl.appendChild(row); // the explanation lives in the message box (ui/panels.js STEP_HELP)
    // the section cut is a floor-plan tool: no cut, and no cut controls, for the whole building
    const noCut = cur == null || pixelActive();
    $('#clip').disabled = noCut;
    $('#cut').disabled = noCut;
    $('#clip').closest('.row').classList.toggle('disabled', noCut);
    $('#cut').closest('.row').classList.toggle('disabled', noCut);
    updateViewName();
  }
  renderLevels();

  // ---------------------------------------------------------------- panel: layers
  const layersEl = $('#layers');
  const kindCounts = new Map();
  for (const g of merged) kindCounts.set(g.kind, (kindCounts.get(g.kind) || 0) + g.ranges.length);
  const kinds = [...kindCounts.keys()].sort((a, b) => kindInfo(a).order - kindInfo(b).order);
  for (const k of kinds) {
    const info = kindInfo(k);
    const lab = document.createElement('label');
    lab.className = 'chk';
    lab.innerHTML = `<input type="checkbox" ${state.kindOn.get(k) ? 'checked' : ''}/><span class="sw" style="background:#${info.color.toString(16).padStart(6, '0')}"></span><span>${esc(info.label)} <span class="area">${kindCounts.get(k)}</span></span>`;
    lab.querySelector('input').addEventListener('change', (e) => { state.kindOn.set(k, e.target.checked); applyVisibility(); });
    layersEl.appendChild(lab);
  }
  for (const [key, label] of [['context', 'Urban context (not in a floor isometric)'], ['rooms', 'Room floors'], ['labels', 'Room labels'], ['allLabels', 'Labels on every level'], ['grids', 'Grids']]) {
    if (key === 'context' && !context) continue;
    const lab = document.createElement('label');
    lab.className = 'chk';
    lab.innerHTML = `<input type="checkbox" ${state[key] ? 'checked' : ''}/><span>${label}</span>`;
    lab.querySelector('input').addEventListener('change', (e) => {
      state[key] = e.target.checked;
      if (key === 'labels') { $('#labels-on').checked = e.target.checked; pixel.setLabels(state.labels); }
      if (key === 'context') pixel.setContextVisible(state.context);
      applyVisibility();
      if (key === 'context' && !pixelActive()) frameView();
    });
    layersEl.appendChild(lab);
  }

  // ---------------------------------------------------------------- panel: rooms
  const roomsEl = $('#rooms');
  const byLevel = new Map();
  for (const r of model.rooms) { if (!byLevel.has(r.level)) byLevel.set(r.level, []); byLevel.get(r.level).push(r); }
  for (const lv of [...levelNames].reverse().concat([...byLevel.keys()].filter((l) => !levelNames.includes(l)))) {
    const rs = byLevel.get(lv);
    if (!rs) continue;
    const h = document.createElement('div'); h.className = 'grp'; h.textContent = `${lv} (${rs.length})`; roomsEl.appendChild(h);
    for (const r of rs) {
      const b = document.createElement('button');
      b.className = 'item'; b.dataset.id = r.id;
      const bad = badRoomIds.has(r.id) ? '<span class="tag error">!</span>' : '';
      b.innerHTML = `${bad}${esc(r.number || '?')} ${esc(r.name || '(no name)')} <span class="area">${r.area_m2} m2</span>`;
      b.addEventListener('click', () => { select(r.id, true); });
      roomsEl.appendChild(b);
    }
  }

  // ---------------------------------------------------------------- the program (room labels)
  // program/rooms.json is the owner's description of each room (name, use, access), keyed by
  // the Revit room id. It was entered in a PROGRAM window of this page on 2026-11-05 and 06 and
  // is kept up by chat since (scripts/program_todo.py lists what is still open). Here it names
  // the rooms in the ROOMS list and the pixel views, and the status window says what is open.
  let program = { meta: {}, rooms: {} };
  try { const r = await fetch('/program/rooms.json', { cache: 'no-store' }); if (r.ok) program = await r.json(); } catch (e) { /* none yet */ }
  if (!program.rooms) program.rooms = {};
  pixel.setProgram(program); pixelB.setProgram(program);
  const entryOf = (id) => program.rooms[id] || null;
  function markRooms() {
    for (const b of document.querySelectorAll('#rooms .item[data-id]')) {
      const id = Number(b.dataset.id), e = entryOf(id), r = model.rooms.find((x) => x.id === id);
      if (!r) continue;
      const bad = badRoomIds.has(id) ? '<span class="tag error">!</span>' : '';
      const tag = !e ? '' : e.status === 'done' ? (e.access ? '' : '<span class="tag flag">access?</span>') : '<span class="tag flag">later</span>';
      const shown = e && e.status === 'done' ? (e.name || USE_LABELS[e.use] || r.name) : r.name;
      b.innerHTML = `${bad}${tag}${esc(r.number || '?')} ${esc(shown || '(no name)')} <span class="area">${r.area_m2} m2</span>`;
      if (e && e.status === 'done') b.title = [USE_LABELS[e.use] || e.use, e.access, e.hours, e.who, e.notes].filter(Boolean).join(' · ');
    }
  }
  markRooms();
  // the reminder at the top of the status window, every time the page opens
  function programReminder() {
    const entries = Object.values(program.rooms);
    const flagged = entries.filter((e) => e.status === 'flagged').length;
    const noAccess = entries.filter((e) => e.status === 'done' && !e.access).length;
    const unseen = model.rooms.filter((r) => !entryOf(r.id)).length;
    if (flagged || noAccess || unseen) statusEl.insertAdjacentHTML('afterbegin', `<div><span class="tag warn">PROGRAM</span> ${[flagged ? `${flagged} room${flagged === 1 ? '' : 's'} flagged for later` : '', noAccess ? `${noAccess} without an access rule` : '', unseen ? `${unseen} never labelled` : ''].filter(Boolean).join(', ')}: see program/TODO.md and confirm by room number in chat.</div>`);
  }

  // ---------------------------------------------------------------- panel: checks
  const checksEl = $('#checks');
  const sevFilter = { error: true, warn: true, info: false };
  function renderChecks() {
    checksEl.innerHTML = '';
    const f = document.createElement('div'); f.className = 'filters';
    for (const s of ['error', 'warn', 'info']) {
      const n = (checks.checks || []).filter((c) => c.severity === s).length;
      const b = document.createElement('button'); b.className = 'small' + (sevFilter[s] ? ' on' : ''); b.textContent = `${s.toUpperCase()} ${n}`;
      b.addEventListener('click', () => { sevFilter[s] = !sevFilter[s]; renderChecks(); });
      f.appendChild(b);
    }
    checksEl.appendChild(f);
    const list = (checks.checks || []).filter((c) => sevFilter[c.severity]);
    if (!list.length) { const d = document.createElement('div'); d.className = 'hint'; d.textContent = checks.checks ? 'Nothing at this filter.' : 'checks.json not found: run scripts/validate_export.py'; checksEl.appendChild(d); }
    const order = { error: 0, warn: 1, info: 2 };
    list.sort((a, b) => order[a.severity] - order[b.severity]);
    for (const c of list) {
      const b = document.createElement('button');
      b.className = 'item';
      b.innerHTML = `<span class="tag ${c.severity}">${c.kind}</span>${esc(c.message)}`;
      b.addEventListener('click', () => {
        for (const x of document.querySelectorAll('.item.sel')) x.classList.remove('sel');
        b.classList.add('sel');
        const ids = c.ids.slice(0, 2);
        const box = c.kind === 'collision' && c.point ? [[c.point[0] - 0.5, c.point[1] - 0.5, c.point[2] - 0.5], [c.point[0] + 0.5, c.point[1] + 0.5, c.point[2] + 0.5]] : null;
        $('#info').innerHTML = `<span class="tag ${c.severity}">${c.kind}</span>${esc(c.message)}` + (ids.length ? '<hr>' + ids.map(describe).join('<hr>') : '');
        if (ids.length || box) highlight(ids, { frame: true, box });
      });
      checksEl.appendChild(b);
    }
  }
  renderChecks();

  // ---------------------------------------------------------------- view controls
  function setMode(mode) {
    $('#mode-iso').classList.toggle('on', mode === 'iso');
    $('#mode-game').classList.toggle('on', mode === 'game');
    scene.setMode(mode);
    applyVisibility();
    renderLevels();
    syncPixel();
    frameView();
    updateViewName();
  }
  function updateViewName() {
    const el = $('#view-name');
    if (!el) return;
    if (pixelActive()) { const s = pixel.scene; el.textContent = `${soloed()}, ${scene.mode === 'game' ? 'plan view' : 'pixel ' + scene.viewName()}, zoom ${s && s.L ? s.zoomLevel : '…'}`; return; }
    el.textContent = (soloed() == null ? 'Building, ' : soloed() + ', ') + scene.viewName();
  }
  // Frame the current view: a floor on its own; the whole building with a margin of
  // surroundings when the context is shown, so neighbours and streets are in the picture.
  function frameView() {
    if (pixelActive()) { pixel.fit(); return; }
    const b = visibleBounds();
    if (soloed() == null && context && state.context) b.expandByVector(new THREE.Vector3(70, 0, 70));
    scene.frame(b, soloed() == null ? 1.0 : 1.15);
  }
  function visibleBounds() {
    // the model's own extent
    const b = new THREE.Box3();
    for (const m of groupMeshes) if (m.visible) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); }
    if (b.isEmpty()) return bounds;
    // keep the frame inside the section cut
    if (scene.clipPlanes.length) {
      for (const p of scene.clipPlanes) {
        if (p.normal.y < 0) b.max.y = Math.min(b.max.y, p.constant);
        else b.min.y = Math.max(b.min.y, -p.constant);
      }
    }
    return b;
  }
  // step 2 (DAY / SITUATION) is about the studio floor: the view goes to Level 3 in plan unless it is there already (owner 2026-11-12)
  window.addEventListener('npc:step', (e) => {
    if (e.detail !== 'day') return; const studio = levelNames.find((n) => /level 3/i.test(n)); if (!studio) return;
    // step 1 keeps the studio floor's plan in one pane (owner 2026-11-13): pane B if it is on, else pane A
    if (paneB.on) { if (paneB.level !== studio || paneB.mode !== 'plan') { paneB.level = studio; paneB.mode = 'plan'; syncPaneB(); renderTabs(); } return; }
    if (soloed() !== studio) showLevel(studio); if (scene.mode !== 'game') setMode('game');
  });
  $('#mode-iso').addEventListener('click', () => setMode('iso'));
  $('#mode-game').addEventListener('click', () => setMode('game'));
  const turn = (d) => {
    // turning is for an isolated floor's isometric only; the whole building keeps its one corner
    if (!pixelActive() || scene.mode !== 'iso') return;
    scene.rotateStep(d); syncPixel(); updateViewName();
  };
  $('#stack').addEventListener('change', (e) => { state.stack = e.target.checked; if (pixelActive()) syncPixel(); });
  $('#rot-l').addEventListener('click', () => turn(1));
  $('#rot-r').addEventListener('click', () => turn(-1));
  $('#wallh').addEventListener('input', (e) => { scene.setWallScale(Number(e.target.value)); $('#wallh-v').textContent = e.target.value; });
  $('#edges').addEventListener('change', (e) => scene.setEdges(e.target.checked));
  $('#dither').addEventListener('change', (e) => scene.setPalette(e.target.checked));
  $('#labels-on').addEventListener('change', (e) => { state.labels = e.target.checked; pixel.setLabels(state.labels); applyVisibility(); });
  $('#pixel').addEventListener('input', (e) => { scene.setPixelSize(Number(e.target.value)); $('#pixel-v').textContent = e.target.value; });
  $('#clip').addEventListener('change', (e) => { state.clip = e.target.checked; applyVisibility(); });
  $('#cut').addEventListener('input', (e) => { state.cutHeight = Number(e.target.value); $('#cut-v').textContent = e.target.value; applyVisibility(); });
  { const fitBtn = $('#fit'); if (fitBtn) fitBtn.addEventListener('click', () => pixel.fit()); }
  $('#people').addEventListener('input', (e) => { state.people = Number(e.target.value); $('#people-v').textContent = state.people; if (pixelActive()) syncPixel(); });
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (pixelActive()) {
      // the pixel views: arrows pan inside Phaser; + and - step the zoom, F fits the floor, Q/E turn the isometric
      if (e.key === '+' || e.key === '=') pixel.zoomStep(1);
      else if (e.key === '-') pixel.zoomStep(-1);
      else if (e.key === 'f') pixel.fit();
      else if (e.key === 'q') turn(1);
      else if (e.key === 'e') turn(-1);
      else if (e.key === 'Escape') select(null);
      else return;
      e.preventDefault();
      return;
    }
    const step = 0.08;
    if (e.key === 'ArrowLeft' || e.key === 'a') scene.pan(-step, 0);
    else if (e.key === 'ArrowRight' || e.key === 'd') scene.pan(step, 0);
    else if (e.key === 'ArrowUp' || e.key === 'w') scene.pan(0, step);
    else if (e.key === 'ArrowDown' || e.key === 's') scene.pan(0, -step);
    else if (e.key === 'q') turn(1);
    else if (e.key === 'e') turn(-1);
    else if (e.key === '+' || e.key === '=') scene.zoomAt(1.25);
    else if (e.key === '-') scene.zoomAt(0.8);
    else if (e.key === 'Escape') select(null);
    else return;
    e.preventDefault();
  });

  // ---------------------------------------------------------------- status
  const c = model.meta.counts;
  const sev = checks.summary || {};
  const size = bounds.getSize(new THREE.Vector3());
  status(`<b>${esc(model.meta.model)}</b> &middot; exported ${esc(model.meta.exported)} &middot; ${model.levels.length} levels<br>
    ${c.walls} walls, ${c.doors} doors, ${c.windows} windows, ${c.rooms} rooms, ${c.columns} columns, ${c.floors} floors, ${c.stairs} stairs, ${c.furniture} furniture and fixtures, ${c.other} other
    &middot; ${geomById.size} meshes, ${(triangles / 1000).toFixed(0)}k triangles &middot; ${size.x.toFixed(0)} &times; ${size.z.toFixed(0)} &times; ${size.y.toFixed(0)} m<br>
    checks: <span class="tag error">${sev.error || 0} error</span> <span class="tag warn">${sev.warn || 0} warn</span> <span class="tag info">${sev.info || 0} info</span>`
    + (contextMeta ? `<br>context: ${contextMeta.counts.buildings} buildings, ${contextMeta.counts.roads} roads and paths, ${contextMeta.counts.trees} trees within ${contextMeta.radius_m} m; model turned ${contextMeta.alignment.rotation_deg_model_to_true_north}&deg; to true north (inferred from the footprint). ${esc(contextMeta.attribution)}` : ''));
  programReminder();
  initPanels(); // the interface: the command window, the steps, the message box
  // the engine behind RUN, FEED, ANALYSE, AGENT and WALK
  window.npcCtl = new RunController({ pixel, pixelB, planLevels, say: (t) => { const el = $('#msg-text'); if (el) el.textContent = t; }, currentLevelK: () => { const n = soloed(); const i = planLevels.indexOf(n); return i < 0 ? null : i; }, onPixelBack: () => syncPixel() });

  applyVisibility();
  syncPixel();
  frameView();
  syncPaneB(); renderTabs();
  // the guided tour (owner 2026-11-13): on a first visit, once the views are drawn; the TOUR button replays it
  Promise.resolve(paneB.loading).catch(() => {}).finally(() => { loader.hide(); setTimeout(maybeStartTour, 400); });
  $('#tour-btn')?.addEventListener('click', (e) => { e.stopPropagation(); startTour(); });
  const loop = () => { if (!pixelActive()) scene.render(); requestAnimationFrame(loop); };
  loop();

  // ---------------------------------------------------------------- the simulation (first piece: stairs, lift, test agents)
  // Built on the first START from every level's tiles and program/simulation.json; stepped on a timer at the chosen
  // speed whatever floor is on show; the scene draws the agents of its floor and the lift's car.
  let sim = null, building = null, simParams = null, simTimer = null, simLast = 0;
  const simEls = { start: $('#sim-start'), pause: $('#sim-pause'), reset: $('#sim-reset'), speed: $('#sim-speed'), agents: $('#sim-agents'), agentsV: $('#sim-agents-v'), mode: $('#sim-mode'), stat: $('#sim-stat'), log: $('#sim-log') };
  async function buildSim() {
    if (!simParams) simParams = await (await fetch('/program/simulation.json', { cache: 'no-store' })).json();
    if (!building) {
      const levels = [];
      for (const n of planLevels) levels.push({ name: n, file: tileFileOf(n), L: await (await fetch(`/exports/tiles/${tileFileOf(n)}.json`, { cache: 'no-store' })).json() });
      building = new Building(levels, simParams);
    }
    sim = new Simulation(building, simParams, { seed: Date.now() % 100000, mode: simEls.mode.value });
    sim.spawn(Number(simEls.agents.value));
    window.npcSim = sim;
    pixel.setSim(sim); pixelB.setSim(sim);
  }
  function simTick() {
    if (!sim || !sim.running) return;
    const now = performance.now(), real = Math.min(0.5, (now - simLast) / 1000); simLast = now;
    let dt = real * Number(simEls.speed.value);
    while (dt > 0) { const h = Math.min(0.25, dt); sim.step(h); dt -= h; }
  }
  function simStatus() {
    if (!sim) return;
    const s = sim.summary();
    const by = Object.entries(s.by).map(([k, n]) => `${n} ${k}`).join(', ');
    simEls.stat.innerHTML = `<b>${s.time}</b> &middot; ${s.agents} agents: ${by}<br>lift at <b>${esc(s.lift.level)}</b> ${s.lift.dir}, ${s.lift.state}, ${s.lift.aboard}/${simParams.elevator.capacity} aboard, ${s.lift.hallCalls} landing calls, ${s.lift.carCalls} car calls<br>`
      + `${s.lift.stops} stops, ${s.lift.boarded} boarded (${s.lift.pickupsOnTheWay} picked up on the way), ${s.lift.floorsTravelled.toFixed(0)} floors travelled<br>`
      + `${s.trips} trips: ${s.liftTrips} by lift, ${s.stairTrips} by stairs; wait for the lift ${s.avgWait.toFixed(0)} s on average, ${s.maxWait.toFixed(0)} s at most`;
    simEls.log.textContent = sim.log.slice(-10).join('\n');
  }
  simEls.start.addEventListener('click', async () => {
    if (!sim) { simEls.start.disabled = true; simEls.stat.textContent = 'Building the floors and the lift…'; await buildSim(); simEls.start.disabled = false; }
    sim.running = true; simLast = performance.now();
    if (!simTimer) { simTimer = setInterval(simTick, 100); setInterval(simStatus, 500); }
    simEls.start.classList.add('on'); simEls.pause.disabled = false; simEls.reset.disabled = false;
  });
  simEls.pause.addEventListener('click', () => { if (sim) { sim.running = !sim.running; simLast = performance.now(); simEls.pause.textContent = sim.running ? 'PAUSE' : 'RESUME'; } });
  simEls.reset.addEventListener('click', async () => { const was = sim && sim.running; await buildSim(); sim.running = !!was; simLast = performance.now(); simStatus(); });
  simEls.agents.addEventListener('input', (e) => { simEls.agentsV.textContent = e.target.value; });
  simEls.mode.addEventListener('change', () => { if (sim) sim.mode = simEls.mode.value; });
}

main();
