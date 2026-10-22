// Plan loading and geometry helpers. Coordinates are metres, y up (north).

export async function loadPlan(url) {
  const plan = await (await fetch(url)).json();
  // corrections confirmed by the plan's owner (level3-edits.json): pieces removed, doors removed, walls added,
  // rooms that are solid blocks. The DXF export itself is untouched; everything downstream sees the corrected plan.
  plan.edits = null;
  try {
    const ed = await (await fetch(url.replace(/\.json$/, "-edits.json"))).json(); plan.edits = ed;
    const gone = new Set((ed.remove_furniture || []).map((e) => e.id)); const goneBoxes = plan.furniture.filter((f) => gone.has(f.id)).map((f) => f.bbox);
    plan.furniture = plan.furniture.filter((f) => !gone.has(f.id));
    plan.desks = plan.desks.filter((d) => !gone.has(d.id) && !goneBoxes.some((b) => inBox(d.center[0], d.center[1], b)));
    plan.doors = plan.doors.filter((d) => !(ed.remove_doors || []).some((e) => Math.hypot(d.center[0] - e.near[0], d.center[1] - e.near[1]) < 0.4));
    for (const w of ed.add_walls || []) { const [x0, y0, x1, y1] = w.bbox; (plan.poche || plan.walls).push({ exterior: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], holes: [], added: true, why: w.why }); }
    plan.cutWalls = (ed.cut_walls || []).map((w) => w.bbox);
    for (const d of plan.doors) d.unused = (ed.unused_doors || []).some((e) => Math.hypot(d.center[0] - e.near[0], d.center[1] - e.near[1]) < 0.4);
  } catch { /* no corrections file: the plan as exported */ }
  plan.roomById = Object.fromEntries(plan.rooms.map((r) => [r.id, r]));
  plan.deskById = Object.fromEntries(plan.desks.map((d) => [d.id, d]));
  plan.roomAt = (x, y) => {
    for (const r of plan.rooms) {
      if (pointInRing([x, y], r.polygon)) {
        let inHole = false;
        for (const h of r.holes) if (pointInRing([x, y], h)) { inHole = true; break; }
        if (!inHole) return r;
      }
    }
    return null;
  };
  plan.zoneAt = (x, y) => plan.zones.find((z) => inBox(x, y, z.bounds)) || null;
  plan.placeName = (x, y) => {
    const z = plan.zoneAt(x, y); const r = plan.roomAt(x, y);
    if (z && r && r.id === "R1") return z.name;
    if (r) return r.name;
    let best = null, bd = 3; for (const d of plan.doors) { const dd = dist(d.center, [x, y]); if (dd < bd) { bd = dd; best = d; } }
    if (best) { const e = plan.entries.find((en) => dist(en.point, best.center) < 1.5); return e ? e.name.toLowerCase() : "a doorway"; }
    return "the floor";
  };
  // the bar: the counter named 'Bar edge' plus a standing area east of it
  const bar = plan.furniture.find((f) => /bar edge/i.test(f.name));
  plan.bar = bar ? { counter: bar.bbox, center: [bar.bbox[2] + 1.2, (bar.bbox[1] + bar.bbox[3]) / 2],
    area: [bar.bbox[2] + 0.4, bar.bbox[1] - 1.5, bar.bbox[2] + 4.0, bar.bbox[3] + 1.5] } : null;
  plan.kitchen = plan.zones.find((z) => /kitchen/i.test(z.name));
  plan.printerRoom = plan.rooms.find((r) => /3D printer/i.test(r.name));
  plan.photoRoom = plan.rooms.find((r) => /photograph/i.test(r.name));
  plan.pinups = plan.furniture.filter((f) => f.kind === "pinup");
  plan.plotters = plan.furniture.filter((f) => f.kind === "printer" && !(plan.printerRoom && pointInRing([(f.bbox[0] + f.bbox[2]) / 2, (f.bbox[1] + f.bbox[3]) / 2], plan.printerRoom.polygon)));
  plan.computers = plan.furniture.filter((f) => f.kind === "computers");
  plan.stairDoors = plan.entries.filter((e) => /stair/i.test(e.name));
  // the plan check's flags (tool/scripts/check_furniture.py), when they sit beside the plan: id -> notes
  try { const fl = await (await fetch(url.replace(/\.json$/, "-flags.json"))).json(); plan.flags = {}; for (const f of fl.flags || []) plan.flags[f.id] = f.notes; } catch { plan.flags = null; }
  return plan;
}

export function inBox(x, y, b) { return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]; }

export function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// A typical private office, inferred (the export has no furniture in the offices): the desk
// against the wall opposite the door, the chair facing it, a shelf along the side wall, a
// visitor chair, a cabinet and a plant. Marked inferred so the manifest can say so.
export function officeLayout(room, plan) {
  const r = ringBox(room.polygon); const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2;
  const door = plan && plan.doors ? plan.doors.reduce((best, d) => { const dd = dist(d.center, [cx, cy]); return !best || dd < best.dd ? { d, dd } : best; }, null) : null;
  const deskNorth = !door || door.d.center[1] < cy; // desk against the wall away from the door
  const dy = 0.8, gap = 0.35;
  const desk = { id: `OF-${room.id}-desk`, kind: "desk", inferred: true, bbox: deskNorth ? [cx - 0.8, r[3] - gap - dy, cx + 0.8, r[3] - gap] : [cx - 0.8, r[1] + gap, cx + 0.8, r[1] + gap + dy] };
  const chairY = deskNorth ? desk.bbox[1] - 0.55 : desk.bbox[3] + 0.55;
  const chair = { id: `OF-${room.id}-chair`, kind: "chair", inferred: true, bbox: [cx - 0.25, chairY - 0.25, cx + 0.25, chairY + 0.25], seat: [cx, chairY], facing: deskNorth ? [0, 1] : [0, -1] };
  const shelf = { id: `OF-${room.id}-shelf`, kind: "shelf", inferred: true, bbox: [r[0] + 0.25, r[1] + 1.2, r[0] + 0.65, r[3] - 1.4] };
  const visitor = { id: `OF-${room.id}-visitor`, kind: "chair", inferred: true, bbox: [cx + 1.1, chairY - 0.5, cx + 1.6, chairY] };
  const cabinet = { id: `OF-${room.id}-cab`, kind: "cabinet", inferred: true, bbox: deskNorth ? [r[2] - 0.8, r[3] - 0.95, r[2] - 0.25, r[3] - 0.35] : [r[2] - 0.8, r[1] + 0.35, r[2] - 0.25, r[1] + 0.95] };
  const plant = { id: `OF-${room.id}-plant`, kind: "plant", inferred: true, bbox: deskNorth ? [r[2] - 0.7, r[1] + 0.4, r[2] - 0.3, r[1] + 0.8] : [r[2] - 0.7, r[3] - 0.8, r[2] - 0.3, r[3] - 0.4] };
  return [desk, chair, shelf, visitor, cabinet, plant];
}
function ringBox(ring) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of ring) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }
