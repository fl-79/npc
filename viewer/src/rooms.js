import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { KIND } from './palette.js';

const FLOOR_COLOR = KIND.floor.color;

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Room floors as flat polygons a few centimetres above the level, tinted by room type, with
 * a CSS label at the room point. Returns {group, labels, byId} where byId maps room id to
 * {mesh, label, box, room}.
 */
export function buildRooms(model, levelZ, badIds) {
  const group = new THREE.Group();
  const byId = new Map();
  for (const room of model.rooms) {
    if (!room.loops || !room.loops.length) continue;
    const areas = room.loops.map((l) => Math.abs(ringArea(l)));
    let outerI = 0;
    for (let i = 1; i < areas.length; i++) if (areas[i] > areas[outerI]) outerI = i;
    const outer = room.loops[outerI];
    if (outer.length < 3) continue;
    const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    room.loops.forEach((l, i) => {
      if (i !== outerI && l.length >= 3) shape.holes.push(new THREE.Path(l.map(([x, y]) => new THREE.Vector2(x, y))));
    });
    let geo;
    try { geo = new THREE.ShapeGeometry(shape); } catch (e) { continue; }
    geo.rotateX(-Math.PI / 2); // (x, y, 0) -> (x, 0, -y): plan north becomes -Z
    const z = (levelZ.get(room.level) ?? 0) + (room.base_offset_m || 0) + 0.03;
    geo.translate(0, z, 0);
    geo.computeBoundingBox();
    // every floor reads as one colour whether or not a room covers it; a flagged room is marked
    // by its label and its outline when selected, not by a tint
    const bad = badIds.has(room.id);
    const mat = new THREE.MeshBasicMaterial({ color: FLOOR_COLOR, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { roomId: room.id, level: room.level };
    mesh.renderOrder = 1;
    group.add(mesh);

    const el = document.createElement('div');
    el.className = 'room-label' + (bad ? ' bad' : '');
    el.textContent = `${room.number || '?'} ${room.name || '(no name)'}`;
    const label = new CSS2DObject(el);
    const p = room.point ? new THREE.Vector3(room.point[0], z + 0.3, -room.point[1]) : geo.boundingBox.getCenter(new THREE.Vector3()).setY(z + 0.3);
    label.position.copy(p);
    label.userData = { roomId: room.id, level: room.level };
    group.add(label);
    byId.set(room.id, { mesh, label, box: geo.boundingBox.clone(), room });
  }
  return { group, byId };
}

/** Grid lines as thin lines on the lowest level, for orientation. */
export function buildGrids(model, z) {
  const pts = [];
  for (const g of model.grids || []) {
    const l = g.line;
    for (let i = 0; i + 1 < l.length; i++) {
      pts.push(l[i][0], z, -l[i][1], l[i + 1][0], z, -l[i + 1][1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x6a6075 }));
  const group = new THREE.Group();
  group.add(lines);
  for (const g of model.grids || []) {
    const el = document.createElement('div');
    el.className = 'room-label';
    el.textContent = g.name;
    const lab = new CSS2DObject(el);
    const p = g.line[0];
    lab.position.set(p[0], z, -p[1]);
    group.add(lab);
  }
  return group;
}
