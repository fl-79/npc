"""Flag furniture in the plan that looks wrong or awkward, so it can be confirmed or fixed rather than
drawn as fact: pieces overlapping a wall or column, chairs with no desk or table near them, pieces
standing in front of a door, pieces outside every room. Nothing is changed; the list is written to
outputs/plan-check/furniture-flags.json and printed.

Run: python tool/scripts/check_furniture.py tool/public/plan/level3.json outputs/plan-check/furniture-flags.json
"""
import json, sys
sys.path.insert(0, "C:/Users/felic/AppData/Roaming/Python/Python314/site-packages")
from shapely.geometry import box, Polygon, Point
from shapely.ops import unary_union

plan = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]

solids = []
for w in plan.get("poche") or plan["walls"]:
    solids.append(Polygon(w["exterior"], w.get("holes") or []))
for c in plan["columns"]:
    solids.append(box(*c["bbox"]))
solid = unary_union(solids)
rooms = [(r, Polygon(r["polygon"], r.get("holes") or [])) for r in plan["rooms"]]
doors = [(d, box(*d["bbox"]).buffer(0.6)) for d in plan["doors"]]
furn = [f for f in plan["furniture"] if f["kind"] not in ("perimeter", "elevator")]
seats_for = ("desk", "table", "seating", "counter", "computers", "other")
anchors = [(f, box(*f["bbox"])) for f in furn if f["kind"] in seats_for]

flags = []
for f in furn:
    b = box(*f["bbox"]); c = b.centroid; notes = []
    ov = b.intersection(solid).area
    if ov > 0.03:
        notes.append(f"overlaps a wall or column by {ov:.2f} m2")
    room = next((r["name"] for r, poly in rooms if poly.contains(c)), None)
    if room is None:
        notes.append("centre outside every room")
    if f["kind"] == "chair":
        near = min((b.distance(ab) for af, ab in anchors if af is not f), default=99)
        if near > 0.9:
            notes.append(f"chair with nothing to sit at within {near:.1f} m")
    for d, zone in doors:
        if zone.intersects(b) and f["kind"] != "chair":
            notes.append(f"within 0.6 m of door {d['name'][:28]} at ({d['center'][0]:.1f}, {d['center'][1]:.1f})")
        elif zone.intersects(b):
            notes.append(f"chair within 0.6 m of door {d['name'][:28]}")
    if notes:
        flags.append({"id": f["id"], "kind": f["kind"], "name": f.get("name", ""), "centre": [round(c.x, 2), round(c.y, 2)], "room": room, "notes": notes})

json.dump({"source": sys.argv[1], "count": len(flags), "flags": flags}, open(out, "w", encoding="utf-8"), indent=1)
print(f"{len(flags)} of {len(furn)} pieces flagged")
from collections import Counter
print(Counter(n.split(" ")[0] + " " + n.split(" ")[1] for fl in flags for n in fl["notes"]))
for fl in flags:
    print(f"{fl['id']:6} {fl['kind']:9} {fl['name'][:26]:26} ({fl['centre'][0]:5.1f},{fl['centre'][1]:6.1f}) {fl['room'] or '-':22} | " + "; ".join(fl["notes"]))
