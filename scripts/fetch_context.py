"""Fetches the urban context around the Frederic Lasserre Building (UBC, Vancouver) from
OpenStreetMap through the Overpass API and writes exports/context.json in the model's own
coordinate frame (metres, Project Base Point origin, +Y project north).

Usage:  python -I scripts/fetch_context.py [radius_m]

What it does:
1. Downloads buildings, roads and paths, green areas, water and trees within the radius.
2. Finds the Lasserre footprint by name and fits the model's Level 1 slab outline to it with a
   rotation and a translation (minimum-area rectangles of both); the rotation closest to zero
   is chosen, since project north is normally close to true north. This alignment is
   inferred and recorded in the file's meta. The user confirmed the resulting orientation
   against Main Mall and Memorial Road on 2026-11-03 (rotation -61.74 degrees).
3. Writes every feature in model coordinates so the viewer needs no geodesy.

Map data (c) OpenStreetMap contributors, ODbL. The Overpass API is free and asks for a
contact in the User-Agent; set OSM_CONTACT in the environment to override the default.
"""
import json
import math
import os
import sys
import time
import urllib.request

from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = os.path.join(HERE, "..", "exports")
RADIUS = float(sys.argv[1]) if len(sys.argv) > 1 else 320.0
LAT, LON = 49.2676, -123.2551  # Frederic Lasserre Building, 6333 Memorial Road
OVERPASS = "https://overpass-api.de/api/interpreter"
UA = "NPC-V2-model-check/0.1 (" + os.environ.get("OSM_CONTACT", "ARCH 540 student project, UBC") + ")"

QUERY = f"""
[out:json][timeout:60];
(
  way["building"](around:{RADIUS},{LAT},{LON});
  relation["building"](around:{RADIUS},{LAT},{LON});
  way["highway"](around:{RADIUS},{LAT},{LON});
  way["landuse"~"grass|forest|meadow|recreation_ground|cemetery"](around:{RADIUS},{LAT},{LON});
  way["leisure"~"park|garden|pitch|playground"](around:{RADIUS},{LAT},{LON});
  way["natural"~"wood|water|scrub|grassland"](around:{RADIUS},{LAT},{LON});
  way["amenity"="parking"](around:{RADIUS},{LAT},{LON});
  node["natural"="tree"](around:{RADIUS},{LAT},{LON});
  way["natural"="tree_row"](around:{RADIUS},{LAT},{LON});
);
out body;
>;
out skel qt;
"""


def fetch():
    req = urllib.request.Request(OVERPASS, data=("data=" + urllib.parse.quote(QUERY)).encode(), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


import urllib.parse  # noqa: E402

# ---------------------------------------------------------------- local metres (east, north)
R = 6378137.0
LAT0 = math.radians(LAT)


def to_local(lat, lon):
    x = math.radians(lon - LON) * R * math.cos(LAT0)
    y = math.radians(lat - LAT) * R
    return [x, y]


print("Fetching OpenStreetMap data within %.0f m of %.5f, %.5f ..." % (RADIUS, LAT, LON))
t0 = time.time()
data = fetch()
print("  %d elements in %.1f s" % (len(data["elements"]), time.time() - t0))

nodes = {}
ways = {}
rels = []
for el in data["elements"]:
    if el["type"] == "node":
        nodes[el["id"]] = el
    elif el["type"] == "way":
        ways[el["id"]] = el
    elif el["type"] == "relation":
        rels.append(el)


def way_coords(w):
    pts = []
    for nid in w.get("nodes", []):
        n = nodes.get(nid)
        if n is not None:
            pts.append(to_local(n["lat"], n["lon"]))
    return pts


def height_of(tags):
    h = tags.get("height")
    if h:
        try:
            return float(str(h).replace("m", "").strip()), "height tag"
        except ValueError:
            pass
    lv = tags.get("building:levels")
    if lv:
        try:
            return float(lv) * 3.3, "building:levels x 3.3"
        except ValueError:
            pass
    return 7.0, "default"


buildings, roads, areas, trees, water = [], [], [], [], []
ROAD_WIDTH = {"motorway": 12, "trunk": 11, "primary": 10, "secondary": 9, "tertiary": 8, "residential": 7,
              "unclassified": 6, "service": 4, "living_street": 6, "pedestrian": 5, "footway": 2, "path": 1.5,
              "cycleway": 2.5, "steps": 2, "track": 3}

lasserre = None
for w in ways.values():
    tags = w.get("tags", {})
    pts = way_coords(w)
    if len(pts) < 2:
        continue
    closed = pts[0] == pts[-1] and len(pts) > 3
    if "building" in tags and closed:
        h, how = height_of(tags)
        rec = {"id": w["id"], "name": tags.get("name"), "height_m": h, "height_source": how,
               "building": tags.get("building"), "outline": pts[:-1]}
        buildings.append(rec)
        if tags.get("name") and "lasserre" in tags["name"].lower():
            lasserre = rec
    elif "highway" in tags:
        roads.append({"id": w["id"], "name": tags.get("name"), "kind": tags["highway"],
                      "width_m": ROAD_WIDTH.get(tags["highway"], 4), "line": pts})
    elif closed and (tags.get("natural") == "water"):
        water.append({"id": w["id"], "outline": pts[:-1]})
    elif closed and ("landuse" in tags or "leisure" in tags or tags.get("natural") in ("wood", "scrub", "grassland") or tags.get("amenity") == "parking"):
        areas.append({"id": w["id"], "kind": tags.get("landuse") or tags.get("leisure") or tags.get("natural") or tags.get("amenity"),
                      "outline": pts[:-1]})
    if tags.get("natural") == "tree_row":
        line = LineString(pts)
        d = 0.0
        while d <= line.length:
            p = line.interpolate(d)
            trees.append({"point": [p.x, p.y], "source": "tree_row"})
            d += 8.0
for n in nodes.values():
    if n.get("tags", {}).get("natural") == "tree":
        trees.append({"point": to_local(n["lat"], n["lon"]), "source": "tree"})

# building relations (multipolygons): outer ways only
for rel in rels:
    tags = rel.get("tags", {})
    if "building" not in tags:
        continue
    outers = [way_coords(ways[m["ref"]]) for m in rel.get("members", []) if m.get("role") == "outer" and m["ref"] in ways]
    for pts in outers:
        if len(pts) > 3:
            h, how = height_of(tags)
            rec = {"id": rel["id"], "name": tags.get("name"), "height_m": h, "height_source": how,
                   "building": tags.get("building"), "outline": pts[:-1] if pts[0] == pts[-1] else pts}
            buildings.append(rec)
            if tags.get("name") and "lasserre" in tags["name"].lower():
                lasserre = rec

print("  buildings %d, roads %d, areas %d, water %d, trees %d" % (len(buildings), len(roads), len(areas), len(water), len(trees)))
if lasserre is None:
    # fall back to the building that contains the search point
    for b in buildings:
        if Polygon(b["outline"]).contains(Point(0, 0)):
            lasserre = b
            break
if lasserre is None:
    sys.exit("Lasserre footprint not found in OpenStreetMap near the search point; cannot align.")
print("  Lasserre: '%s' (%s), %d outline points, height %s" % (lasserre["name"], lasserre["id"], len(lasserre["outline"]), lasserre["height_m"]))

# ---------------------------------------------------------------- align the model to the footprint
with open(os.path.join(EXPORTS, "model.json"), encoding="utf-8") as f:
    model = json.load(f)
# the model's footprint: the union of the Level 1 and Level 2 slab outlines (largest loops)
slabs = []
for fl in model["floors"]:
    if fl["level"] in ("Level 1", "Level 2", "Level 3") and fl["loops"]:
        outer = max(fl["loops"], key=lambda l: Polygon(l).area if len(l) > 2 else 0)
        slabs.append(Polygon(outer).buffer(0))
model_fp = unary_union(slabs)


def rect_of(poly):
    r = poly.minimum_rotated_rectangle
    c = list(r.exterior.coords)[:4]
    e1 = math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1])
    e2 = math.hypot(c[2][0] - c[1][0], c[2][1] - c[1][1])
    if e1 >= e2:
        ang = math.atan2(c[1][1] - c[0][1], c[1][0] - c[0][0])
        long_, short = e1, e2
    else:
        ang = math.atan2(c[2][1] - c[1][1], c[2][0] - c[1][0])
        long_, short = e2, e1
    return ang, long_, short, r.centroid


osm_poly = Polygon(lasserre["outline"]).buffer(0)
a_osm, L_osm, S_osm, c_osm = rect_of(osm_poly)
a_mod, L_mod, S_mod, c_mod = rect_of(model_fp)
print("  model footprint %.1f x %.1f m at %.1f deg; OSM footprint %.1f x %.1f m at %.1f deg" % (
    L_mod, S_mod, math.degrees(a_mod), L_osm, S_osm, math.degrees(a_osm)))
# rotation that takes the model's long axis onto the OSM long axis, chosen closest to zero
cands = [((a_osm - a_mod) + k * math.pi) for k in (-2, -1, 0, 1, 2)]
cands = [((c + math.pi) % (2 * math.pi)) - math.pi for c in cands]
rot = min(cands, key=abs)
print("  rotation model -> true north frame: %.2f deg (inferred; alternatives differ by 180 deg)" % math.degrees(rot))

# model point -> osm local:  p_osm = R(rot) * (p - c_mod) + c_osm
# osm local -> model:        p = R(-rot) * (q - c_osm) + c_mod
cr, sr = math.cos(-rot), math.sin(-rot)


def to_model(q):
    x, y = q[0] - c_osm.x, q[1] - c_osm.y
    return [round(cr * x - sr * y + c_mod.x, 2), round(sr * x + cr * y + c_mod.y, 2)]


for b in buildings:
    b["outline"] = [to_model(p) for p in b["outline"]]
    b["is_lasserre"] = b is lasserre
for r in roads:
    r["line"] = [to_model(p) for p in r["line"]]
for a in areas + water:
    a["outline"] = [to_model(p) for p in a["outline"]]
for t in trees:
    t["point"] = to_model(t["point"])

# ground level of the context: the model's Level 1 (the street level of the real building is
# not in the model; this is the assumption)
ground = next((lv["elevation_m"] for lv in model["levels"] if lv["name"] == "Level 1"), 0.0)

out = {
    "meta": {
        "source": "OpenStreetMap via Overpass API", "attribution": "Map data (c) OpenStreetMap contributors, ODbL",
        "fetched": time.strftime("%Y-%m-%d %H:%M:%S"), "centre_latlon": [LAT, LON], "radius_m": RADIUS,
        "frame": "model coordinates (metres, Project Base Point origin, +Y project north)",
        "alignment": {
            "method": "minimum-area rectangle of the model's Level 1-3 slab outlines fitted to the OSM Lasserre footprint",
            "rotation_deg_model_to_true_north": round(math.degrees(rot), 2),
            "model_centre": [round(c_mod.x, 2), round(c_mod.y, 2)],
            "model_footprint_m": [round(L_mod, 1), round(S_mod, 1)],
            "osm_footprint_m": [round(L_osm, 1), round(S_osm, 1)],
            "inferred": True,
            "note": "The model has no shared coordinates; the rotation closest to zero was chosen, a 180 degree flip is the alternative.",
        },
        "ground_m": ground,
        "ground_note": "Context sits on the model's Level 1; the site's real slopes are not modelled.",
        "counts": {"buildings": len(buildings), "roads": len(roads), "areas": len(areas), "water": len(water), "trees": len(trees)},
    },
    "buildings": buildings, "roads": roads, "areas": areas, "water": water, "trees": trees,
}
path = os.path.join(EXPORTS, "context.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))
print("Written", path)
