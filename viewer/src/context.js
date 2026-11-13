import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KIND } from './palette.js';

// Urban context from exports/context.json (OpenStreetMap, already in model coordinates):
// neighbouring buildings as blocks, roads and paths as flat ribbons, green areas, water,
// trees as a trunk and a canopy block, on a ground plane. Shown with the whole building only.

function shapeOf(outline) {
  return new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
}

function flat(outline, y) {
  // plan polygon (x, y) -> three (x, y, -y)
  let geo;
  try { geo = new THREE.ShapeGeometry(shapeOf(outline)); } catch (e) { return null; }
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

function ribbon(line, width, y) {
  const pos = [];
  const h = width / 2;
  for (let i = 0; i + 1 < line.length; i++) {
    const [x1, y1] = line[i], [x2, y2] = line[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const nx = -dy / L * h, ny = dx / L * h;
    // quad corners in plan, then to three (x, y, -y)
    const a = [x1 + nx, y1 + ny], b = [x1 - nx, y1 - ny], c = [x2 - nx, y2 - ny], d = [x2 + nx, y2 + ny];
    for (const [p, q, r] of [[a, b, c], [a, c, d]]) pos.push(p[0], y, -p[1], q[0], y, -q[1], r[0], y, -r[1]);
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildContext(ctx, material) {
  const group = new THREE.Group();
  const g0 = ctx.meta.ground_m;
  const R = ctx.meta.radius_m + 60;
  const centre = ctx.meta.alignment.model_centre;
  const add = (geos, kind, order = 0) => {
    const list = geos.filter(Boolean);
    if (!list.length) return;
    const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material(kind));
    mesh.renderOrder = order;
    mesh.userData.context = kind;
    group.add(mesh);
  };

  // ground
  const ground = new THREE.PlaneGeometry(R * 2, R * 2);
  ground.rotateX(-Math.PI / 2);
  ground.translate(centre[0], g0 - 0.12, -centre[1]);
  add([ground], 'ctx_ground');

  add(ctx.areas.filter((a) => a.kind !== 'parking').map((a) => flat(a.outline, g0 - 0.07)), 'ctx_green');
  add(ctx.areas.filter((a) => a.kind === 'parking').map((a) => flat(a.outline, g0 - 0.06)), 'ctx_road');
  add(ctx.water.map((w) => flat(w.outline, g0 - 0.05)), 'ctx_water');
  add(ctx.roads.map((r) => ribbon(r.line, r.width_m, g0 - 0.03 + (r.width_m >= 6 ? 0.01 : 0))), 'ctx_road');

  // buildings as blocks, the Lasserre footprint itself left out (the model stands there)
  const blocks = [];
  for (const b of ctx.buildings) {
    if (b.is_lasserre) continue;
    let geo;
    try {
      geo = new THREE.ExtrudeGeometry(shapeOf(b.outline), { depth: Math.max(2.5, b.height_m), bevelEnabled: false });
    } catch (e) { continue; }
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, g0, 0);
    blocks.push(geo);
  }
  add(blocks, 'ctx_building');

  // trees: trunk and canopy blocks
  const trunks = [], canopies = [];
  for (const t of ctx.trees) {
    const [x, y] = t.point;
    const trunk = new THREE.BoxGeometry(0.5, 2.2, 0.5);
    trunk.translate(x, g0 + 1.1, -y);
    trunks.push(trunk);
    const s = 3.6;
    const canopy = new THREE.BoxGeometry(s, s, s);
    canopy.translate(x, g0 + 2.2 + s / 2, -y);
    canopies.push(canopy);
  }
  add(trunks, 'ctx_trunk');
  add(canopies, 'ctx_canopy');
  return group;
}

export const CONTEXT_KINDS = ['ctx_ground', 'ctx_green', 'ctx_road', 'ctx_water', 'ctx_building', 'ctx_trunk', 'ctx_canopy'];
export function contextKindsKnown() { return CONTEXT_KINDS.every((k) => KIND[k]); }
