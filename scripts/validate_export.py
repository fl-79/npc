"""Checks the Revit export outside Revit and writes exports/checks.json for the viewer.

Usage:  python -I scripts/validate_export.py [exports_dir]

Reads model.json, meshes.json and, when present, collisions.json. Prints counts per level
and every problem found. Nothing in the export is modified.
"""
import json
import math
import os
import sys
from collections import Counter, defaultdict

try:
    from shapely.geometry import Polygon, Point
    from shapely.validation import explain_validity
except ImportError:  # shapely is optional; polygon checks are skipped without it
    Polygon = None

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "exports")

with open(os.path.join(EXPORTS, "model.json"), encoding="utf-8") as f:
    model = json.load(f)
meshes = None
mesh_path = os.path.join(EXPORTS, "meshes.json")
if not os.path.exists(mesh_path) and os.path.exists(mesh_path + ".gz"):   # the repository keeps it compressed (2026-11-13)
    import gzip
    with gzip.open(mesh_path + ".gz", "rt", encoding="utf-8") as f:
        meshes = json.load(f)
if os.path.exists(mesh_path):
    with open(mesh_path, encoding="utf-8") as f:
        meshes = json.load(f)
collisions = None
coll_path = os.path.join(EXPORTS, "collisions.json")
if os.path.exists(coll_path):
    with open(coll_path, encoding="utf-8") as f:
        collisions = json.load(f)

levels = [lv["name"] for lv in model["levels"]]
level_z = {lv["name"]: lv["elevation_m"] for lv in model["levels"]}
checks = []  # {kind, severity, level, ids, message, point}


def add(kind, severity, message, ids=(), level=None, point=None):
    checks.append({"kind": kind, "severity": severity, "message": message, "ids": list(ids),
                   "level": level, "point": point})


def ring_area(ring):
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def centroid(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return [sum(xs) / len(xs), sum(ys) / len(ys)]


# ---------------------------------------------------------------- counts
print("Model:", model["meta"]["model"], "exported", model["meta"]["exported"], "in", model["meta"].get("seconds"), "s")
print("Levels:", ", ".join("%s (%.2f m)" % (lv["name"], lv["elevation_m"]) for lv in model["levels"]))
print("Counts:", json.dumps(model["meta"]["counts"]))
print()
per_level = defaultdict(Counter)
for key in ("walls", "doors", "windows", "rooms", "columns", "floors", "stairs", "railings", "furniture", "other"):
    for el in model[key]:
        per_level[el.get("level") or "(none)"][key] += 1
print("%-14s" % "level" + "".join("%9s" % k[:8] for k in ("walls", "doors", "windows", "rooms", "columns", "floors", "stairs", "railings", "furniture", "other")))
for lv in levels + [l for l in per_level if l not in levels]:
    c = per_level.get(lv)
    if not c:
        continue
    print("%-14s" % lv[:14] + "".join("%9d" % c[k] for k in ("walls", "doors", "windows", "rooms", "columns", "floors", "stairs", "railings", "furniture", "other")))
print()

# ---------------------------------------------------------------- meta flags
if model["links"]:
    add("links", "warn", "The model has %d linked models; links were not walked: %s" % (
        len(model["links"]), ", ".join(str(l["name"]) for l in model["links"])), [l["id"] for l in model["links"]])
if model["meta"].get("skipped_secondary_design_option_ids"):
    add("design_options", "info", "%d elements in secondary design options were skipped" % len(
        model["meta"]["skipped_secondary_design_option_ids"]), model["meta"]["skipped_secondary_design_option_ids"])
if len(model["meta"].get("phases", [])) > 1:
    add("phases", "info", "Model has phases %s; demolished elements are marked phase_demolished" % model["meta"]["phases"])
no_geom = model["meta"].get("elements_without_geometry", [])
known = {}
for key in ("walls", "doors", "windows", "columns", "floors", "stairs", "railings", "furniture", "other"):
    for el in model[key]:
        known[el["id"]] = el
no_geom_known = [i for i in no_geom if i in known and not known[i].get("is_curtain")]
if no_geom_known:
    kinds_ng = Counter(known[i].get("category") for i in no_geom_known)
    add("no_geometry", "warn", "%d exported elements have no solid geometry at Medium or Fine detail (not drawn): %s" % (
        len(no_geom_known), ", ".join("%d %s" % (n, k) for k, n in kinds_ng.most_common())), no_geom_known)

# ---------------------------------------------------------------- levels
for key in ("walls", "doors", "windows", "columns", "floors", "stairs", "furniture", "other"):
    missing = [el["id"] for el in model[key] if not el.get("level")]
    if missing:
        add("no_level", "warn", "%d %s have no level" % (len(missing), key), missing)
    guessed = [el["id"] for el in model[key] if el.get("level_source") == "bbox"]
    if guessed:
        add("level_from_bbox", "info", "%d %s got their level from their bounding box, not a parameter" % (len(guessed), key), guessed)

# ---------------------------------------------------------------- walls
for w in model["walls"]:
    if w.get("no_location_curve"):
        add("wall_no_curve", "warn", "Wall %d has no location curve (in-place or odd wall)" % w["id"], [w["id"]], w["level"])
    if w.get("length_m") is not None and w["length_m"] < 0.05:
        add("wall_tiny", "warn", "Wall %d is only %.3f m long" % (w["id"], w["length_m"]), [w["id"]], w["level"], w.get("start"))
    if w.get("height_m") is not None and w["height_m"] < 0.1:
        add("wall_flat", "warn", "Wall %d is only %.3f m high" % (w["id"], w["height_m"]), [w["id"]], w["level"], w.get("start"))
    if w.get("phase_demolished"):
        add("demolished", "info", "Wall %d is demolished in phase %s" % (w["id"], w["phase_demolished"]), [w["id"]], w["level"], w.get("start"))

# overlapping collinear walls on the same level (duplicates)
def seg_key(w):
    if not w.get("start") or not w.get("end"):
        return None
    (x1, y1, _), (x2, y2, _) = w["start"], w["end"]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    if L < 1e-6:
        return None
    return (x1, y1, dx / L, dy / L, L)


def collinear_overlap(a, b, tol=0.05):
    ka, kb = seg_key(a), seg_key(b)
    if ka is None or kb is None:
        return 0.0
    x1, y1, ux, uy, La = ka
    x2, y2, vx, vy, Lb = kb
    if abs(ux * vx + uy * vy) < 0.999:
        return 0.0
    # distance of b's start from a's line
    d = abs((x2 - x1) * uy - (y2 - y1) * ux)
    if d > tol:
        return 0.0
    t0 = (x2 - x1) * ux + (y2 - y1) * uy
    t1 = t0 + (vx * ux + vy * uy) * Lb
    lo, hi = max(0.0, min(t0, t1)), min(La, max(t0, t1))
    return max(0.0, hi - lo)


by_level_walls = defaultdict(list)
for w in model["walls"]:
    by_level_walls[w.get("level")].append(w)
for lv, ws in by_level_walls.items():
    for i in range(len(ws)):
        for j in range(i + 1, len(ws)):
            ov = collinear_overlap(ws[i], ws[j])
            if ov > 0.1:
                add("wall_duplicate", "warn", "Walls %d and %d run along the same line for %.2f m on %s" % (
                    ws[i]["id"], ws[j]["id"], ov, lv), [ws[i]["id"], ws[j]["id"]], lv, ws[i].get("start"))

# ---------------------------------------------------------------- doors and windows
wall_ids = {w["id"] for w in model["walls"]}
for key in ("doors", "windows"):
    for d in model[key]:
        if d.get("host") is None:
            add("opening_no_host", "warn", "%s %d (%s) has no host" % (key[:-1].title(), d["id"], d.get("family")), [d["id"]], d["level"], d.get("point"))
        elif d["host"] not in wall_ids:
            add("opening_host_not_wall", "info", "%s %d is hosted by %s %d, not a wall" % (
                key[:-1].title(), d["id"], d.get("host_category"), d["host"]), [d["id"], d["host"]], d["level"], d.get("point"))
        if d.get("width_m") is None:
            add("opening_no_width", "info", "%s %d (%s) has no width parameter" % (key[:-1].title(), d["id"], d.get("family")), [d["id"]], d["level"], d.get("point"))
        if d.get("phase_demolished"):
            add("demolished", "info", "%s %d is demolished in phase %s" % (key[:-1].title(), d["id"], d["phase_demolished"]), [d["id"]], d["level"], d.get("point"))

# ---------------------------------------------------------------- rooms
rooms = model["rooms"]
print("Rooms per level:")
for lv in levels:
    rs = [r for r in rooms if r["level"] == lv]
    if rs:
        print("  %-12s %3d rooms  %s" % (lv, len(rs), ", ".join("%s %s" % (r["number"], r["name"]) for r in rs)))
print()
nums = Counter((r["level"], r["number"]) for r in rooms)
for r in rooms:
    rid = [r["id"]]
    if r["status"] != "ok":
        add("room_" + r["status"].replace(" ", "_"), "error", "Room %s %s on %s is %s" % (r["number"], r["name"], r["level"], r["status"]), rid, r["level"], r.get("point"))
        continue
    if not r.get("name"):
        add("room_no_name", "warn", "Room %s on %s has no name" % (r["number"], r["level"]), rid, r["level"], r.get("point"))
    if not r.get("number"):
        add("room_no_number", "warn", "Room '%s' on %s has no number" % (r["name"], r["level"]), rid, r["level"], r.get("point"))
    if nums[(r["level"], r["number"])] > 1:
        add("room_duplicate_number", "warn", "Room number %s is used %d times on %s" % (r["number"], nums[(r["level"], r["number"])], r["level"]), rid, r["level"], r.get("point"))
    if not r["loops"]:
        add("room_no_loops", "error", "Room %s %s has no boundary loops" % (r["number"], r["name"]), rid, r["level"], r.get("point"))
        continue
    areas = [abs(ring_area(l)) for l in r["loops"]]
    outer_i = max(range(len(areas)), key=lambda i: areas[i])
    outer = r["loops"][outer_i]
    holes = [l for i, l in enumerate(r["loops"]) if i != outer_i]
    if len(outer) < 3:
        add("room_degenerate_loop", "error", "Room %s %s outer loop has %d points" % (r["number"], r["name"], len(outer)), rid, r["level"], r.get("point"))
        continue
    poly_area = areas[outer_i] - sum(areas[i] for i in range(len(areas)) if i != outer_i)
    r["_poly_area"] = poly_area
    if Polygon is not None:
        try:
            pg = Polygon(outer, holes)
            if not pg.is_valid:
                add("room_invalid_polygon", "warn", "Room %s %s polygon is invalid: %s" % (r["number"], r["name"], explain_validity(pg)), rid, r["level"], r.get("point"))
        except Exception as e:  # noqa
            add("room_invalid_polygon", "warn", "Room %s %s polygon failed: %s" % (r["number"], r["name"], e), rid, r["level"], r.get("point"))
    r["_outer"] = outer
    r["_holes"] = holes

# loop area against Revit's area: Revit computes the area at the wall centre or core when the
# project is set that way, while the loops are the finish faces, so a uniform ratio is expected.
ratios = [(r, r["_poly_area"] / r["area_m2"]) for r in rooms if "_poly_area" in r and r["area_m2"] > 0]
if ratios:
    med = sorted(x[1] for x in ratios)[len(ratios) // 2]
    setting = model["meta"].get("room_area_boundary_location")
    if abs(med - 1.0) > 0.01:
        add("room_area_basis", "info", "Room boundary loops (finish faces) cover a median %.1f%% of Revit's room areas (area computed at %s)" % (
            med * 100, setting or "wall centre or core, see Area and Volume Computations"))
    for r, ratio in ratios:
        if abs(ratio - med) > 0.05:
            add("room_area_mismatch", "warn", "Room %s %s: loop area %.2f m2 is %.0f%% of Revit's %.2f m2 (others are about %.0f%%): loops may be nested or not holes" % (
                r["number"], r["name"], r["_poly_area"], ratio * 100, r["area_m2"], med * 100), [r["id"]], r["level"], r.get("point"))

# rooms overlapping on the same level
if Polygon is not None:
    by_level_rooms = defaultdict(list)
    for r in rooms:
        if "_outer" in r:
            by_level_rooms[r["level"]].append(r)
    for lv, rs in by_level_rooms.items():
        polys = []
        for r in rs:
            try:
                polys.append((r, Polygon(r["_outer"], r["_holes"]).buffer(0)))
            except Exception:
                polys.append((r, None))
        for i in range(len(polys)):
            for j in range(i + 1, len(polys)):
                a, pa = polys[i]
                b, pb = polys[j]
                if pa is None or pb is None:
                    continue
                try:
                    inter = pa.intersection(pb).area
                except Exception:
                    continue
                if inter > 0.05:
                    add("room_overlap", "error", "Rooms %s %s and %s %s overlap by %.2f m2 on %s" % (
                        a["number"], a["name"], b["number"], b["name"], inter, lv), [a["id"], b["id"]], lv, a.get("point"))

# does the floor slab reach under every room and every column based on that level?
if Polygon is not None:
    slab_by_level = {}
    for fl in model["floors"]:
        loops = [l for l in fl.get("loops", []) if len(l) > 2]
        if not loops:
            continue
        loops.sort(key=lambda l: -abs(ring_area(l)))
        try:
            slab_by_level[fl["level"]] = Polygon(loops[0], loops[1:]).buffer(0)
        except Exception:
            pass
    for r in rooms:
        pg = slab_by_level.get(r["level"])
        if pg is None or "_outer" not in r:
            continue
        try:
            rp = Polygon(r["_outer"], r["_holes"]).buffer(0)
            cover = rp.intersection(pg).area / rp.area if rp.area > 0 else 1.0
        except Exception:
            continue
        if cover < 0.95:
            vertical = any(k in (r.get("name") or "").lower() for k in ("stair", "elev", "lift", "shaft"))
            add("room_no_slab", "info" if vertical else "warn", "Room %s %s on %s: the %s floor slab covers only %.0f%% of it%s" % (
                r["number"], r["name"], r["level"], r["level"], cover * 100,
                " (an opening in the slab: a stair or shaft room)" if vertical or len(r["loops"]) > 1 else ""), [r["id"]], r["level"], r.get("point"))
    for c in model["columns"]:
        pg = slab_by_level.get(c.get("level"))
        if pg is None or not c.get("point"):
            continue
        if not pg.buffer(0.3).contains(Point(c["point"][0], c["point"][1])):
            add("column_no_slab", "warn", "Column %d is based on %s at (%.1f, %.1f) where that level has no floor slab" % (
                c["id"], c["level"], c["point"][0], c["point"][1]), [c["id"]], c["level"], c.get("point"))

# stairs and shafts named the same on every level
name_levels = defaultdict(set)
for r in rooms:
    n = (r.get("name") or "").strip().lower()
    if any(k in n for k in ("stair", "elev", "lift", "shaft")):
        name_levels[r["name"]].add(r["level"])
for name, lvs in sorted(name_levels.items()):
    add("vertical_room", "info", "'%s' appears on %s" % (name, ", ".join(sorted(lvs, key=lambda l: level_z.get(l, 0)))))

# ---------------------------------------------------------------- stairs
for st in model["stairs"]:
    if st.get("kind") == "stair_legacy":
        add("stair_legacy", "info", "Stair %d is a legacy (sketch) stair: no runs or landings exported, mesh only" % st["id"], [st["id"]], st["level"])
    elif not st.get("runs"):
        add("stair_no_runs", "warn", "Stair %d has no runs" % st["id"], [st["id"]], st["level"])
    if st.get("error"):
        add("stair_error", "warn", "Stair %d: %s" % (st["id"], st["error"]), [st["id"]], st["level"])

# ---------------------------------------------------------------- furniture
inplace = [f["id"] for f in model["furniture"] if f.get("in_place")]
if inplace:
    add("in_place_family", "info", "%d furniture-like elements are in-place families (no location point)" % len(inplace), inplace)
nopoint = [f["id"] for f in model["furniture"] if f.get("point") is None and f.get("line") is None and not f.get("in_place")]
if nopoint:
    add("instance_no_point", "info", "%d family instances have no location point or line" % len(nopoint), nopoint)
fam = Counter((f["kind"], f.get("family")) for f in model["furniture"])
print("Family instances by kind and family (top 40):")
for (k, f), n in fam.most_common(40):
    print("  %4d  %-18s %s" % (n, k, f))
print()

# ---------------------------------------------------------------- meshes
if meshes is not None:
    ids_with_mesh = {m["id"] for m in meshes["elements"]}
    tri = sum(len(m["i"]) // 3 for m in meshes["elements"])
    print("Meshes: %d elements, %d triangles" % (len(meshes["elements"]), tri))
    big = sorted(meshes["elements"], key=lambda m: -len(m["i"]))[:5]
    for m in big:
        print("  heaviest: %s %d on %s, %d triangles" % (m["kind"], m["id"], m["level"], len(m["i"]) // 3))
    for key in ("walls", "doors", "windows", "columns", "floors", "stairs", "railings", "furniture", "other"):
        # a curtain wall's geometry is its panels and mullions, so it has no mesh of its own
        miss = [el["id"] for el in model[key] if el["id"] not in ids_with_mesh and not el.get("is_curtain")]
        if miss:
            add("mesh_missing", "warn", "%d %s have no mesh: %s" % (len(miss), key, ", ".join(
                "%s %s" % (el["id"], el.get("family") or el.get("type") or "") for el in model[key] if el["id"] in set(miss))[:300]), miss)
    cw_members = []
    for cw in model.get("curtain_walls", []):
        cw_members += [p["id"] for p in cw["panels"]] + [m["id"] for m in cw["mullions"]]
    miss_members = [i for i in cw_members if i not in ids_with_mesh]
    if miss_members:
        add("curtain_member_no_geometry", "info", "%d of %d curtain panels and mullions have no geometry (empty system panels, or panels replaced by doors)" % (
            len(miss_members), len(cw_members)), miss_members)
    # degenerate coordinates
    far = [m["id"] for m in meshes["elements"] if any(abs(v) > 2000 for v in m["v"][:300])]
    if far:
        add("mesh_far", "warn", "%d meshes have vertices more than 2 km from the base point" % len(far), far)

# ---------------------------------------------------------------- collisions
if collisions is not None:
    s = collisions["summary"]
    print("Collisions: %d overlaps, %d touches, %d unknown over %d elements (%s s)" % (
        s["overlaps"], s["touches"], s["unknown"], s["elements"], s["seconds"]))
    SLAB = {"Floors", "Ceilings", "Roofs"}
    VERTICAL = {"Walls", "Columns", "Structural Columns", "Curtain Wall Mullions", "Curtain Panels", "Doors", "Windows", "Stairs"}
    LOUVER = {"Generic Models"}
    CURTAIN = {"Curtain Wall Mullions", "Curtain Panels"}
    through = defaultdict(list)   # slab id -> pairs
    louvers = []
    by_pair = Counter()
    for p in collisions["pairs"]:
        if p["kind"] != "overlap":
            continue
        ca, cb = p["a"]["category"], p["b"]["category"]
        by_pair[tuple(sorted([ca, cb]))] += 1
        box = p.get("box")
        pt = [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2, (box[0][2] + box[1][2]) / 2] if box else None
        if (ca in SLAB and cb in VERTICAL) or (cb in SLAB and ca in VERTICAL):
            slab = p["a"] if ca in SLAB else p["b"]
            through[slab["id"]].append(p)
            continue
        if (ca in LOUVER and cb in CURTAIN) or (cb in LOUVER and ca in CURTAIN):
            louvers.append(p)
            continue
        fa = known.get(p["a"]["id"], {}).get("family") or ""
        fb = known.get(p["b"]["id"], {}).get("family") or ""
        add("collision", "warn", "%s %d %s (%s) overlaps %s %d %s (%s) by %.3f m3" % (
            ca, p["a"]["id"], fa, p["a"]["level"], cb, p["b"]["id"], fb, p["b"]["level"], p["volume_m3"]),
            [p["a"]["id"], p["b"]["id"]], p["a"]["level"], pt)
    for slab_id, ps in through.items():
        slab = known.get(slab_id, {})
        cats = Counter((p["a"] if p["a"]["category"] not in SLAB else p["b"])["category"] for p in ps)
        vol = sum(p["volume_m3"] for p in ps)
        others = [(p["a"] if p["a"]["category"] not in SLAB else p["b"])["id"] for p in ps]
        add("collision_through_slab", "warn", "%s %d on %s (%s m thick) is crossed by %d elements (%s), %.2f m3 in all: walls, columns or mullions run through the slab instead of stopping at it" % (
            slab.get("category", "Slab"), slab_id, slab.get("level"), slab.get("thickness_m"), len(ps),
            ", ".join("%d %s" % (n, c) for c, n in cats.most_common()), vol), [slab_id] + others, slab.get("level"))
    if louvers:
        add("collision_louvers", "info", "%d louver pieces (Generic Models) overlap curtain panels or mullions: expected if the louvers sit on the curtain wall" % len(louvers),
            sorted({p["a"]["id"] for p in louvers} | {p["b"]["id"] for p in louvers}))
    print("Overlaps by category pair:")
    for k, n in by_pair.most_common():
        print("  %4d  %s" % (n, " x ".join(k)))
else:
    add("collisions_missing", "info", "collisions.json not found: Clash Check has not run")

# ---------------------------------------------------------------- write and print
sev = Counter(c["severity"] for c in checks)
print("Checks: %d error, %d warn, %d info" % (sev["error"], sev["warn"], sev["info"]))
for c in checks:
    if c["severity"] in ("error", "warn"):
        print("  [%s] %s" % (c["severity"], c["message"]))
kinds = Counter(c["kind"] for c in checks)
print("By kind:", json.dumps(kinds))
out = {"model": model["meta"]["model"], "exported": model["meta"]["exported"], "summary": dict(sev),
       "kinds": dict(kinds), "checks": checks}
with open(os.path.join(EXPORTS, "checks.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)
print("Written", os.path.join(EXPORTS, "checks.json"))
