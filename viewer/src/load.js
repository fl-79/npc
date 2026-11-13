import * as THREE from 'three';
import { kindInfo } from './palette.js';

// Revit export: X east, Y north, Z up (metres). three.js: Y up. We map (X, Y, Z) -> (X, Z, -Y),
// so north is -Z on screen and plan views read with north up.
export function toWorld(p) {
  return new THREE.Vector3(p[0], p[2], -p[1]);
}

async function fetchJSON(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get('x-unpacked-length')) || (res.headers.get('content-encoding') ? 0 : Number(res.headers.get('content-length'))) || 0;   // a gzip file's own size is not what the reader counts
  if (!res.body || !onProgress) return res.json();
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress(got, total);
  }
  const blob = new Blob(chunks);
  return JSON.parse(await blob.text());
}

/**
 * Loads model.json, meshes.json, checks.json and builds one merged BufferGeometry per
 * (level, kind). Each merged mesh keeps a sorted range table so a picked face maps back to
 * a Revit element id, and every element keeps its own vertex arrays for highlighting.
 */
const nextTick = () => new Promise((r) => setTimeout(r, 0));   // lets the loading bar paint before a long synchronous step
export async function loadModel(status, progress = () => {}) {
  status('loading model.json'); progress(0.03, 'the model');
  const model = await fetchJSON('/exports/model.json');
  status('loading meshes.json'); progress(0.12, 'the building');
  const meshes = await fetchJSON('/exports/meshes.json', (got, total) => {
    status(`loading meshes.json ${(got / 1e6).toFixed(1)} MB${total ? ' / ' + (total / 1e6).toFixed(1) : ''}`);
    progress(0.12 + 0.6 * (total ? Math.min(1, got / total) : 0), `the building, ${(got / 1e6).toFixed(1)} MB`);
  });
  let checks = { checks: [], summary: {} };
  try { checks = await fetchJSON('/exports/checks.json'); } catch (e) { /* validator not run yet */ }

  status('indexing elements'); progress(0.75, 'the elements'); await nextTick();
  const elements = new Map(); // id -> record from model.json (+ kind)
  const lists = [
    ['walls', 'wall'], ['doors', 'door'], ['windows', 'window'], ['columns', 'column'], ['floors', 'floor'],
    ['stairs', 'stair'], ['railings', 'railing'], ['furniture', null], ['other', null], ['openings', null],
  ];
  for (const [key, kind] of lists) {
    for (const rec of model[key] || []) {
      rec.kind = rec.kind || kind;
      rec.list = key;
      elements.set(rec.id, rec);
    }
  }
  for (const cw of model.curtain_walls || []) {
    for (const m of cw.mullions) { m.kind = 'mullion'; m.host = cw.id; m.list = 'mullions'; if (!elements.has(m.id)) elements.set(m.id, m); }
    for (const p of cw.panels) { p.kind = p.kind || 'panel'; p.host = cw.id; p.list = 'panels'; if (!elements.has(p.id)) elements.set(p.id, p); }
  }
  for (const r of model.rooms) { r.kind = 'room'; r.list = 'rooms'; elements.set(r.id, r); }

  status('building geometry'); progress(0.82, 'the geometry'); await nextTick();
  const levelIndex = new Map(model.levels.map((l, i) => [l.name, i]));
  // Level bands: an element belongs to every level whose band [elevation, next elevation) its
  // geometry reaches into, so a column from Basement to Level 4 shows on each of those levels.
  const bands = model.levels.map((l, i) => [l.elevation_m, i + 1 < model.levels.length ? model.levels[i + 1].elevation_m : l.elevation_m + 50]);
  // A floor view is the storey between its level and the next: everything whose geometry
  // reaches into that band belongs to it (an exterior wall or curtain wall through three
  // storeys shows on each, clipped to the storey). A slab belongs only to its own level, so the
  // slab above never caps a plan. An element without geometry in any band takes the level
  // its base sits on.
  const levelFromZ = (zmin) => {
    let best = 0;
    for (let i = 0; i < bands.length; i++) if (bands[i][0] <= zmin + 0.35) best = i;
    return best;
  };
  const spanOf = (zmin, zmax, kind, m, rec) => {
    if (kind === 'floor' || kind === 'ceiling' || kind === 'roof') {
      const name = m.level || (rec && rec.level);
      return [name && levelIndex.has(name) ? levelIndex.get(name) : levelFromZ(zmax - 0.3)];
    }
    const s = [];
    for (let i = 0; i < bands.length; i++) if (zmax - 0.1 > bands[i][0] && zmin + 0.1 < bands[i][1]) s.push(i);
    return s.length ? s : [levelFromZ(zmin)];
  };
  const groups = new Map(); // key span|kind -> {span, kind, pos[], idx[], ranges[]}
  const geomById = new Map(); // id -> {v, i}
  const bounds = new THREE.Box3();
  const tmp = new THREE.Vector3();
  for (const m of meshes.elements) {
    const rec = elements.get(m.id);
    const kind = (rec && rec.kind) || m.kind || 'other';
    if (rec && !rec.kind) rec.kind = kind;
    const v = m.v;
    let zmin = Infinity, zmax = -Infinity;
    for (let k = 2; k < v.length; k += 3) { if (v[k] < zmin) zmin = v[k]; if (v[k] > zmax) zmax = v[k]; }
    const span = spanOf(zmin, zmax, kind, m, rec);
    const key = `${span.join(',')}|${kind}`;
    let g = groups.get(key);
    if (!g) { g = { span, kind, pos: [], idx: [], ranges: [], vcount: 0 }; groups.set(key, g); }
    const base = g.vcount;
    for (let k = 0; k < v.length; k += 3) {
      const x = v[k], y = v[k + 2], z = -v[k + 1];
      g.pos.push(x, y, z);
      tmp.set(x, y, z);
      bounds.expandByPoint(tmp);
    }
    const start = g.idx.length;
    for (let k = 0; k < m.i.length; k++) g.idx.push(base + m.i[k]);
    g.ranges.push({ id: m.id, start, count: m.i.length });
    g.vcount += v.length / 3;
    geomById.set(m.id, { v, i: m.i, kind, level: m.level, span, zmin, zmax });
    if (rec) rec.span = span;
  }

  const merged = [];
  for (const g of groups.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    geo.setIndex(g.idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    merged.push({ span: g.span, levelIndex: g.span[0], kind: g.kind, geometry: geo, ranges: g.ranges, triangles: g.idx.length / 3 });
    g.pos = null; g.idx = null;
  }
  merged.sort((a, b) => (a.levelIndex - b.levelIndex) || (kindInfo(a.kind).order - kindInfo(b.kind).order));

  return { model, checks, elements, geomById, merged, bounds, levelIndex };
}

// Which element does an index offset in a merged geometry belong to?
export function elementAtIndex(ranges, indexOffset) {
  let lo = 0, hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = ranges[mid];
    if (indexOffset < r.start) hi = mid - 1;
    else if (indexOffset >= r.start + r.count) lo = mid + 1;
    else return r.id;
  }
  return null;
}

export function geometryFor(entry) {
  const pos = new Float32Array(entry.v.length);
  for (let k = 0; k < entry.v.length; k += 3) {
    pos[k] = entry.v[k]; pos[k + 1] = entry.v[k + 2]; pos[k + 2] = -entry.v[k + 1];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(entry.i);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}
