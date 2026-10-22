"""Convert a Revit 2D plan DXF into the tool's plan JSON.

Usage:
  python dxf_to_plan.py <plan.dxf> <plan-config.json> <out.json>

Reads walls, floor edge, glazing, louvers and door blocks; closes wall cavities and small
junction gaps by buffering; derives rooms as enclosed free-space regions; classifies furniture
blocks by family name; finds a seat for every desk; groups desks into studio sections.
Everything in metres. Requires ezdxf, shapely, numpy.
"""
import sys, json, math, re
from pathlib import Path
from datetime import date
import numpy as np
import ezdxf
from ezdxf import disassemble
from shapely.geometry import LineString, Polygon, box, Point
from shapely.ops import unary_union

src, cfg_path, out_path = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
S = cfg.get("scale_to_m", 0.001)
SNAP, SHRINK = 0.22, 0.12

doc = ezdxf.readfile(src)
msp = doc.modelspace()

segs, inserts = {}, []
FLAT = 4.0  # mm, flattening distance for arcs and splines
for e in msp:
    if e.dxftype() == "INSERT":
        pts = []
        for p in disassemble.to_primitives(disassemble.recursive_decompose([e]), max_flattening_distance=FLAT):
            vs = [(v.x * S, v.y * S) for v in p.vertices()]
            if len(vs) >= 2: pts.append(vs)
        if not pts: continue
        xs = [x for vs in pts for x, _ in vs]; ys = [y for vs in pts for _, y in vs]
        inserts.append({"layer": e.dxf.layer, "name": e.dxf.name.split(" - ")[0].strip(),
                        "bbox": (min(xs), min(ys), max(xs), max(ys)), "pts": pts,
                        "rot": float(e.dxf.rotation or 0.0), "at": (e.dxf.insert.x * S, e.dxf.insert.y * S)})
    else:
        for p in disassemble.to_primitives([e], max_flattening_distance=FLAT):
            vs = [(v.x * S, v.y * S) for v in p.vertices()]
            if len(vs) >= 2: segs.setdefault(e.dxf.layer, []).append(vs)

def lines(layers, name_filter=None):
    ls = [LineString(vs) for L in layers for vs in segs.get(L, [])]
    for i in inserts:
        if i["layer"] in layers and (name_filter is None or name_filter(i["name"])):
            ls += [LineString(vs) for vs in i["pts"]]
    return ls

env = lines(["A-WALL", "A-FLOR", "A-GLAZ-CURT", "A-GLAZ-CWMG"]) + lines(["A-GENM"], lambda n: "Louver" in n)
door_ins = [i for i in inserts if i["layer"] == "A-DOOR"]
door_boxes = [box(*i["bbox"]).exterior for i in door_ins]
extra = [LineString([tuple(s["from"]), tuple(s["to"])]) for s in cfg.get("derivation", {}).get("added_segments_m", [])]
network = unary_union([g.buffer(SNAP, cap_style=2) for g in env + door_boxes + extra]).buffer(-SHRINK)
ext = cfg["extent_m"]
world = box(ext["x"][0] - 1, ext["y"][0] - 1, ext["x"][1] + 1, ext["y"][1] + 1)
free = world.difference(network)
regions = [g for g in (free.geoms if hasattr(free, "geoms") else [free]) if g.area >= 1.0 and not g.intersects(world.exterior)]
regions.sort(key=lambda g: -g.area)

# name rooms from the config by bounds overlap
def rnd(v, n=3): return round(float(v), n)
def ring(poly): return [[rnd(x), rnd(y)] for x, y in poly.exterior.coords]
rooms = []
cfg_rooms = cfg.get("rooms", [])
for k, g in enumerate(regions):
    best, score = None, 0
    for r in cfg_rooms:
        b = box(*r["bounds"]); inter = g.intersection(b).area; s = inter / max(g.union(b).area, 1e-6)
        if s > score: best, score = r, s
    name = best["name"] if best and score > 0.5 else f"Region {k+1}"
    rtype = best["type"] if best and score > 0.5 else "unconfirmed"
    lp = g.representative_point()
    rooms.append({"id": f"R{k+1}", "name": name, "type": rtype, "area_m2": rnd(g.area, 1), "label": [rnd(lp.x), rnd(lp.y)],
                  "polygon": ring(g.simplify(0.02)), "holes": [[[rnd(x), rnd(y)] for x, y in h.coords] for h in g.interiors]})

# doors: centre, width, axis
doors = []
for n, i in enumerate(door_ins):
    x0, y0, x1, y1 = i["bbox"]; w, h = x1 - x0, y1 - y0
    axis = "x" if w > h else "y"   # the wall runs along this axis
    doors.append({"id": f"D{n+1}", "name": i["name"], "center": [rnd((x0 + x1) / 2), rnd((y0 + y1) / 2)],
                  "bbox": [rnd(v) for v in i["bbox"]], "width": rnd(max(w, h), 2), "axis": axis})

# furniture classification
def kind_of(name, layer):
    n = name.lower()
    if "desk" in n and "sala" in n: return "desk"
    if "zeph" in n or "chair" in n: return "chair"
    if "pinup" in n or "pin-up" in n: return "pinup"
    if "computer stations" in n: return "computers"
    if "monitor" in n or "desktop_computer" in n: return "skip"
    if "table" in n: return "table"
    if "sofa" in n or "bench" in n: return "seating"
    if "printer" in n or "plotter" in n: return "printer"
    if "waste" in n or "recycling" in n: return "bin"
    if "kitchen" in n or "casework" in n or "sink" in n or "keg" in n: return "counter"
    if "bar edge" in n: return "counter"
    if "elevator" in n: return "elevator"
    if "mechanical floor box" in n: return "perimeter"
    if "louver" in n: return "skip"
    if layer == "A-FLOR-HRAL": return "skip"
    return "other"

furniture = []
for n, i in enumerate(inserts):
    if i["layer"] not in ("I-FURN", "Q-CASE", "P-SANR-FIXT", "A-GENM", "A-GENM-HDLN"): continue
    kind = kind_of(i["name"], i["layer"])
    if kind == "skip": continue
    x0, y0, x1, y1 = i["bbox"]
    if (x1 - x0) * (y1 - y0) < 0.04 and kind not in ("chair",): continue
    furniture.append({"id": f"F{n}", "kind": kind, "name": i["name"], "bbox": [rnd(v) for v in i["bbox"]], "rot": rnd(i["rot"], 1)})

# desks: a seat is the nearest chair centre within 1.2 m; facing = from seat toward desk centre
chairs = [f for f in furniture if f["kind"] == "chair"]
chair_c = np.array([[(c["bbox"][0] + c["bbox"][2]) / 2, (c["bbox"][1] + c["bbox"][3]) / 2] for c in chairs]) if chairs else np.zeros((0, 2))
desks = []
used = set()
for f in furniture:
    if f["kind"] != "desk": continue
    cx, cy = (f["bbox"][0] + f["bbox"][2]) / 2, (f["bbox"][1] + f["bbox"][3]) / 2
    seat = None
    if len(chair_c):
        d = np.hypot(chair_c[:, 0] - cx, chair_c[:, 1] - cy)
        order = np.argsort(d)
        for j in order:
            if d[j] > 1.4: break
            if j in used: continue
            used.add(int(j)); seat = chair_c[j]; break
    if seat is None:
        # no free chair: put the seat 0.55 m off the long side, toward the nearest open side (south by default)
        w, h = f["bbox"][2] - f["bbox"][0], f["bbox"][3] - f["bbox"][1]
        seat = np.array([cx, f["bbox"][1] - 0.55]) if w >= h else np.array([f["bbox"][0] - 0.55, cy])
    fx, fy = cx - seat[0], cy - seat[1]; L = math.hypot(fx, fy) or 1
    desks.append({"id": f["id"], "center": [rnd(cx), rnd(cy)], "seat": [rnd(seat[0]), rnd(seat[1])], "facing": [rnd(fx / L), rnd(fy / L)]})

# sections: k-means on desk centres, k from config, balanced to at most cap per section
K = int(cfg.get("sections", {}).get("count", 12)); cap = int(cfg.get("sections", {}).get("max_per_section", 15))
P = np.array([d["center"] for d in desks]); rng = np.random.default_rng(7)
# seed centroids along the long axis so clusters follow the room's geometry
order = np.argsort(P[:, 1] * 3 + P[:, 0]); C = P[order[np.linspace(0, len(P) - 1, K).astype(int)]].copy()
for _ in range(60):
    lab = np.argmin(((P[:, None, :] - C[None, :, :]) ** 2).sum(-1), axis=1)
    for k in range(K):
        if (lab == k).any(): C[k] = P[lab == k].mean(0)
# balance: move farthest members of oversize clusters to the nearest cluster with room
for _ in range(400):
    sizes = np.bincount(lab, minlength=K); big = np.where(sizes > cap)[0]
    if not len(big): break
    k = big[0]; members = np.where(lab == k)[0]
    far = members[np.argmax(((P[members] - C[k]) ** 2).sum(1))]
    dist = ((C - P[far]) ** 2).sum(1); dist[k] = 1e9
    for j in np.argsort(dist):
        if sizes[j] < cap: lab[far] = j; break
# label sections A.. by centroid order (north to south), year by thirds of that order
cent_order = np.argsort(-C[:, 1]); label_of = {int(k): i for i, k in enumerate(cent_order)}
letters = "ABCDEFGHIJKLMNOP"
for d, l in zip(desks, lab):
    s = label_of[int(l)]; d["section"] = letters[s]; d["year"] = 1 + (s * 3) // K
sizes = {letters[label_of[k]]: int((lab == k).sum()) for k in range(K)}

columns = [{"bbox": [rnd(v) for v in box(*f["bbox"]).bounds]} for f in []]
# interior column squares live on A-WALL as small closed outlines; detect as small closed polygons of the network
cols = []
for g in (network.geoms if hasattr(network, "geoms") else [network]):
    if g.area < 0.6 and g.area > 0.05:
        cols.append({"bbox": [rnd(v) for v in g.bounds]})

walls = []
for g in (network.geoms if hasattr(network, "geoms") else [network]):
    gg = g.intersection(box(ext["x"][0] - 0.5, ext["y"][0] - 0.5, ext["x"][1] + 0.5, ext["y"][1] + 0.5)).simplify(0.02)
    for q in (gg.geoms if hasattr(gg, "geoms") else [gg]):
        if q.geom_type == "Polygon" and q.area > 0.02:
            walls.append({"exterior": ring(q), "holes": [[[rnd(x), rnd(y)] for x, y in h.coords] for h in q.interiors]})

# ---- linework for drawing: simplified polylines per layer, furniture per piece with a vertex budget
def simp(vs, tol=0.012, budget=None):
    ls = LineString(vs).simplify(tol, preserve_topology=False)
    c = [[rnd(x), rnd(y)] for x, y in ls.coords]
    return c if len(c) >= 2 else None
def budgeted(polys, budget):
    polys = sorted(polys, key=lambda v: -LineString(v).length)
    out, used = [], 0
    for vs in polys:
        s = simp(vs)
        if not s: continue
        if used + len(s) > budget: 
            if used == 0: out.append(s[: max(2, budget)]); 
            break
        out.append(s); used += len(s)
    return out
def layer_lines(layers, name_filter=None, budget=None):
    res = [simp(vs) for L in layers for vs in segs.get(L, [])]
    for i in inserts:
        if i["layer"] in layers and (name_filter is None or name_filter(i["name"])):
            res += budgeted(i["pts"], budget) if budget else [simp(vs) for vs in i["pts"]]
    return [r for r in res if r]
linework = {
    "walls": layer_lines(["A-WALL"]),
    "glazing": layer_lines(["A-GLAZ-CURT", "A-GLAZ-CWMG"], budget=40) + layer_lines(["A-GENM"], lambda n: "Louver" in n, budget=20),
    "stairs": layer_lines(["S-STRS", "S-STRS-MBND", "A-FLOR-HRAL"]),
    "floor_edge": layer_lines(["A-FLOR"]),
}
door_lines = []
for n, i in enumerate(door_ins):
    door_lines.append({"id": f"D{n+1}", "lines": budgeted(i["pts"], 160)})
furn_lines = []
for f in furniture:
    ins = next((i for i in inserts if f["id"] == f"F{inserts.index(i)}"), None)
    if ins is None: continue
    budget = {"chair": 70, "desk": 60, "table": 60, "pinup": 30, "counter": 120, "printer": 80, "computers": 80, "seating": 100, "bin": 24, "elevator": 40, "other": 120}.get(f["kind"], 80)
    furn_lines.append({"id": f["id"], "kind": f["kind"], "lines": budgeted(ins["pts"], budget)})
# poche: cut walls and floor edge closed into solids, door openings carved
poche_net = unary_union([g.buffer(SNAP, cap_style=2) for g in lines(["A-WALL", "A-FLOR"])]).buffer(-SHRINK)
openings = []
for i in door_ins:
    x0, y0, x1, y1 = i["bbox"]; w, h = x1 - x0, y1 - y0
    openings.append(box(x0 + 0.08, y0 - 0.05, x1 - 0.08, y1 + 0.05) if w > h else box(x0 - 0.05, y0 + 0.08, x1 + 0.05, y1 - 0.08))
poche_net = poche_net.difference(unary_union(openings)) if openings else poche_net
poche = []
for g in (poche_net.geoms if hasattr(poche_net, "geoms") else [poche_net]):
    gg = g.simplify(0.015)
    for q in (gg.geoms if hasattr(gg, "geoms") else [gg]):
        if q.geom_type == "Polygon" and q.area > 0.02:
            poche.append({"exterior": ring(q), "holes": [[[rnd(x), rnd(y)] for x, y in h.coords] for h in q.interiors]})
print("linework:", {k: len(v) for k, v in linework.items()}, "| door lines", sum(len(d["lines"]) for d in door_lines), "| furniture pieces", len(furn_lines), "vertices", sum(len(l) for f in furn_lines for l in f["lines"]), "| poche polygons", len(poche))

out = {
    "meta": {"source": src.name, "config": cfg_path.name, "generated": date.today().isoformat(), "units": "m",
             "snap_m": SNAP, "shrink_m": SHRINK, "added_segments": cfg.get("derivation", {}).get("added_segments_m", []),
             "extent": [ext["x"][0], ext["y"][0], ext["x"][1], ext["y"][1]], "building": cfg.get("building", "")},
    "walls": walls, "poche": poche, "linework": linework, "doorLines": door_lines, "furnitureLines": furn_lines, "rooms": rooms, "doors": doors, "furniture": furniture, "desks": desks, "columns": cols,
    "zones": cfg.get("zones_in_studio", []), "entries": cfg.get("entries", []),
    "sections": {"count": K, "sizes": sizes},
}
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print(f"rooms {len(rooms)} | doors {len(doors)} | furniture {len(furniture)} | desks {len(desks)} (seats from chairs: {len(used)}) | columns {len(cols)} | walls {len(walls)}")
print("sections:", sizes)
print("rooms:", [(r['id'], r['name'], r['area_m2']) for r in rooms])
