"""Rasterises every level of the Revit export into a tile map for the game view.

Usage:  python -I scripts/rasterise.py [tile_m]

Reads exports/model.json and writes exports/tiles/<level>.json and a debug PNG per level.
One tile is 0.5 m (16 px at zoom 1 in the game). Everything comes from the model: walls paint
their tiles from their centreline and width, curtain walls paint glass, doors clear their host
wall over their width, columns paint their footprint, rooms paint the floor with their index,
the slab paints the rest of the floor, stairs paint their runs and landings, furniture keeps
its plan box and a kind from its family name. Nothing is drawn that the model does not have,
except the owner's corrections and additions: program/edits.json (doors the model lacks) and
program/objects.json (objects the model lacks, placed from the room's walls), every one flagged.
"""
import json
import math
import os
import re
import struct
import sys
import zlib
from collections import Counter

from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = os.path.join(HERE, "..", "exports")
OUT = os.path.join(EXPORTS, "tiles")
TILE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
MARGIN = 2  # tiles around the level

with open(os.path.join(EXPORTS, "model.json"), encoding="utf-8") as f:
    model = json.load(f)
# the owner's corrections (program/edits.json), applied while rasterising; the export stays as it is
EDITS = []
_edits_path = os.path.join(HERE, "..", "program", "edits.json")
if os.path.exists(_edits_path):
    with open(_edits_path, encoding="utf-8") as f:
        EDITS = json.load(f).get("edits", [])
    print("edits: %d from program/edits.json" % len(EDITS))
# the owner's added objects (program/objects.json): things the building has and the model lacks
OBJECTS = []
_objects_path = os.path.join(HERE, "..", "program", "objects.json")
if os.path.exists(_objects_path):
    with open(_objects_path, encoding="utf-8") as f:
        _obj = json.load(f)
        OBJECTS = _obj.get("objects", [])
        REKIND = {str(k): v for k, v in _obj.get("rekind", {}).items()}
        BY_USE = _obj.get("by_use", {})
        ZONES = {str(k): v for k, v in _obj.get("zones", {}).items()}
    print("objects: %d, rekinds: %d, rules by use: %d, zoned rooms: %d from program/objects.json" % (len(OBJECTS), len(REKIND), len(BY_USE), len(ZONES)))
else:
    REKIND = {}
    BY_USE = {}
    ZONES = {}
# the owner's program (program/rooms.json): a room's use decides which by_use rules apply to it
PROGRAM = {}
_program_path = os.path.join(HERE, "..", "program", "rooms.json")
if os.path.exists(_program_path):
    with open(_program_path, encoding="utf-8") as f:
        PROGRAM = json.load(f).get("rooms", {})
levels = [lv for lv in model["levels"] if not re.search(r"roof", lv["name"], re.I)]
level_z = {lv["name"]: lv["elevation_m"] for lv in model["levels"]}
all_levels = model["levels"]

# ---------------------------------------------------------------- furniture kinds (the V1 table)
KINDS = [
    ("desk", r"SALA_Desk"),
    ("chair", r"Zeph|chair|Seating_"),
    ("pinup", r"Pinup"),
    ("computers", r"Computer stations|Desktop_Computer|Monitor"),
    ("table", r"Table"),
    ("seating", r"Sofa|Bench|Elm"),
    ("printer", r"plotter|Printer|Designjet"),
    ("bin", r"Waste|Recycling"),
    ("sink", r"Sink|sink"),
    ("counter", r"Kitchen|Counter|Casework|Keg|Bar edge"),
    ("elevator", r"Elevator"),
    ("cutting", r"Cutting"),
    ("lamp", r"Pendant"),
]
SKIP = r"Louver|Floor Box"


def kind_of(fam):
    fam = fam or ""
    if re.search(SKIP, fam, re.I):
        return None
    for k, pat in KINDS:
        if re.search(pat, fam, re.I):
            return k
    return "other"


# ---------------------------------------------------------------- room types (floor style)
ROOM_TYPES = [
    ("stair", r"stair"), ("elevator", r"elev|lift|shaft"), ("wc", r"wash|wc|toilet|restroom|shower"),
    ("kitchen", r"kitchen|lounge|cafe"), ("studio", r"studio"), ("crit", r"crit|pin|review"),
    ("class", r"class|seminar|lecture|theatre"), ("office", r"office|admin|reception"),
    ("hall", r"corr|hall|lobby|foyer|vest"), ("shop", r"shop|lab|work|fab|print"),
    ("service", r"stor|mech|elec|serv|jan|util"),
]


def room_type(name):
    n = (name or "").lower()
    for t, pat in ROOM_TYPES:
        if re.search(pat, n):
            return t
    return "room"


def ring_area(ring):
    a = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def polygon_of(loops):
    loops = [l for l in loops if len(l) > 2]
    if not loops:
        return None
    loops.sort(key=lambda l: -abs(ring_area(l)))
    try:
        return Polygon(loops[0], loops[1:]).buffer(0)
    except Exception:
        return None


def in_band(bb, z0, z1):
    """Does an element's bounding box reach into the storey [z0, z1)?"""
    if not bb:
        return False
    return bb[1][2] - 0.1 > z0 and bb[0][2] + 0.1 < z1


# ---------------------------------------------------------------- PNG writer (no Pillow needed)
def write_png(path, w, h, rgb_rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rgb_rows)

    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


PAL = {0: (28, 26, 34), "floor": (110, 106, 100), "wall": (240, 230, 207), "glass": (159, 211, 232),
       "column": (201, 184, 154), "door": (181, 115, 58), "stair": (143, 138, 132), "furn": (217, 164, 65)}

os.makedirs(OUT, exist_ok=True)
summary = []
for li, lv in enumerate(levels):
    name = lv["name"]
    z0 = lv["elevation_m"]
    z1 = all_levels[all_levels.index(lv) + 1]["elevation_m"] if all_levels.index(lv) + 1 < len(all_levels) else z0 + 4.0

    # extent: the slab of this level, else the walls
    slab = next((fl for fl in model["floors"] if fl["level"] == name), None)
    slab_poly = polygon_of(slab["loops"]) if slab else None
    pts = []
    for w in model["walls"]:
        if w.get("start") and in_band(w.get("bbox"), z0, z1):
            pts += [w["start"][:2], w["end"][:2]]
    if slab_poly is not None:
        b = slab_poly.bounds
        pts += [[b[0], b[1]], [b[2], b[3]]]
    if not pts:
        continue
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0 = math.floor(min(xs) / TILE) * TILE - MARGIN * TILE
    y0 = math.floor(min(ys) / TILE) * TILE - MARGIN * TILE
    cols = int(math.ceil((max(xs) - x0) / TILE)) + MARGIN
    rows = int(math.ceil((max(ys) - y0) / TILE)) + MARGIN

    def tile_of(x, y):
        """Tile column and row (row 0 is the north edge)."""
        c = int((x - x0) // TILE)
        r = rows - 1 - int((y - y0) // TILE)
        return c, r

    def centre(c, r):
        return x0 + (c + 0.5) * TILE, y0 + (rows - 1 - r + 0.5) * TILE

    floor = [[0] * cols for _ in range(rows)]      # room index + 1, or 0
    struct_ = [[0] * cols for _ in range(rows)]    # 0 open, 1 wall, 2 glass, 3 column, 4 door, 5 stair
    ddir = [[0] * cols for _ in range(rows)]       # for doors and walls: 1 runs east-west, 2 north-south
    src = [[None] * cols for _ in range(rows)]     # element id that painted the structure tile

    # floor from the slab, then rooms (index)
    rooms = []
    if slab_poly is not None:
        for r in range(rows):
            for c in range(cols):
                if slab_poly.contains(Point(*centre(c, r))):
                    floor[r][c] = 1  # slab, no room
    for rm in model["rooms"]:
        if rm["level"] != name or not rm.get("loops"):
            continue
        poly = polygon_of(rm["loops"])
        if poly is None:
            continue
        idx = len(rooms) + 2
        rooms.append({"idx": idx, "id": rm["id"], "number": rm["number"], "name": rm["name"], "type": room_type(rm["name"]),
                      "area_m2": rm["area_m2"], "label": list(tile_of(*rm["point"][:2])) if rm.get("point") else None})
        minx, miny, maxx, maxy = poly.bounds
        c0, r1 = tile_of(minx, miny)
        c1, r0 = tile_of(maxx, maxy)
        for r in range(max(0, r0), min(rows, r1 + 1)):
            for c in range(max(0, c0), min(cols, c1 + 1)):
                if poly.contains(Point(*centre(c, r))):
                    floor[r][c] = idx

    def paint_segment(p, q, width, code, eid):
        seg = LineString([p, q])
        reach = max(width / 2.0, 0.22)
        dx, dy = q[0] - p[0], q[1] - p[1]
        d = 1 if abs(dx) >= abs(dy) else 2
        minx, miny, maxx, maxy = seg.bounds
        c0, r1 = tile_of(minx - reach, miny - reach)
        c1, r0 = tile_of(maxx + reach, maxy + reach)
        for r in range(max(0, r0), min(rows, r1 + 1)):
            for c in range(max(0, c0), min(cols, c1 + 1)):
                if seg.distance(Point(*centre(c, r))) <= reach:
                    if struct_[r][c] in (0, 2) or code == 1:
                        struct_[r][c] = code
                        ddir[r][c] = d
                        src[r][c] = eid
        # and the tiles the centreline itself runs through, so a thin wall lying on a tile boundary (whose tile
        # centres are further away than its reach) still paints a continuous line
        L = seg.length
        n = max(1, int(L / (TILE / 4.0)))
        for k in range(n + 1):
            pt = seg.interpolate(k / float(n), normalized=True)
            c, r = tile_of(pt.x, pt.y)
            if 0 <= r < rows and 0 <= c < cols and (struct_[r][c] in (0, 2) or code == 1):
                struct_[r][c] = code
                ddir[r][c] = d
                src[r][c] = eid

    # walls and curtain walls in this storey
    wall_dir = {}
    wall_line = {}
    for w in model["walls"]:
        if not w.get("start") or not in_band(w.get("bbox"), z0, z1):
            continue
        pts_w = w.get("curve") or [w["start"], w["end"]]
        for i in range(len(pts_w) - 1):
            paint_segment(pts_w[i][:2], pts_w[i + 1][:2], w.get("width_m") or 0.2, 2 if w.get("is_curtain") else 1, w["id"])
        dx, dy = w["end"][0] - w["start"][0], w["end"][1] - w["start"][1]
        wall_dir[w["id"]] = ("ew" if abs(dx) >= abs(dy) else "ns", (dx, dy), w.get("width_m") or 0.2)
        wall_line[w["id"]] = (w["start"][:2], w["end"][:2])

    doors = []
    # the owner's added walls (program/edits.json add_wall): a wall the model lacks between rooms, painted one tile
    # thick on wall_on's side of the shared boundary (every open tile of that room that touches the other rooms)
    walls_added = []
    room_idx_by_id = {rm["id"]: rm["idx"] for rm in rooms}
    for e in EDITS:
        if e.get("kind") != "add_wall" or e.get("level") != name or e.get("withdrawn"):
            continue
        on = room_idx_by_id.get(e.get("wall_on"))
        if e.get("around") == "stairs":
            continue  # the stairs are painted later; these walls follow them (below)
        if False:
            painted = []
            for r in range(rows):
                for c in range(cols):
                    if floor[r][c] != on or struct_[r][c] != 0:
                        continue
                    for (dr, dc, d) in ((0, 1, 2), (0, -1, 2), (1, 0, 1), (-1, 0, 1)):
                        rn, cn = r + dr, c + dc
                        if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] == 5:
                            painted.append((r, c, d))
                            break
            for (r, c, d) in painted:
                struct_[r][c] = 1
                ddir[r][c] = d
                src[r][c] = e["id"]
            door_tiles = []
            side = e.get("door_side", "west")
            dc_, dr_ = {"west": (1, 0), "east": (-1, 0), "north": (0, 1), "south": (0, -1)}[side]  # the stair lies that way from the run
            run = [(r, c) for (r, c, d) in painted if 0 <= r + dr_ < rows and 0 <= c + dc_ < cols and struct_[r + dr_][c + dc_] == 5]
            if run:
                run.sort()
                m = len(run) // 2
                for (r, c) in run[max(0, m - 1):m + 1]:
                    struct_[r][c] = 4
                    ddir[r][c] = 2 if side in ("west", "east") else 1
                    door_tiles.append([c, r])
            walls_added.append({"id": e["id"], "tiles": [[c, r] for (r, c, d) in painted], "door": door_tiles, "edit": True, "reason": e.get("reason"), "inferred_position": True})
            if door_tiles:
                doors.append({"id": e["id"] + ".door", "family": "edit:add_wall door", "width_m": 1.0, "host": None, "dir": "ns" if side in ("west", "east") else "ew",
                              "tile": door_tiles[0], "tiles": door_tiles, "double": False, "edit": True, "leaf": True, "reason": "the doorway into the stairs from the " + side, "inferred_position": True})
            print("edit %s: %d wall tiles round the stairs of room %s, a doorway of %d tiles on the %s" % (e["id"], len(painted), e.get("wall_on"), len(door_tiles), side))
            continue
        outside = e.get("against") == "outside"
        others = set() if outside else {room_idx_by_id.get(rid) for rid in e.get("between_rooms", []) if rid != e.get("wall_on")}
        others.discard(None)
        if on is None or (not others and not outside):
            print("edit %s: rooms not on %s" % (e.get("id"), name))
            continue
        side_only = {"north": (-1, 0, 1), "south": (1, 0, 1), "west": (0, -1, 2), "east": (0, 1, 2)}.get(e.get("side"))
        painted = []
        for r in range(rows):
            for c in range(cols):
                if floor[r][c] != on or struct_[r][c] != 0:
                    continue
                for (dr, dc, d) in ([side_only] if side_only else ((0, 1, 2), (0, -1, 2), (1, 0, 1), (-1, 0, 1))):
                    rn, cn = r + dr, c + dc
                    if not (0 <= rn < rows and 0 <= cn < cols):
                        continue
                    # "outside": the edge is open (no structure) and not this room: the void, or slab beyond the room polygon
                    hit = (floor[rn][cn] != on and struct_[rn][cn] == 0) if outside else (floor[rn][cn] in others and struct_[rn][cn] == 0)
                    if hit:
                        painted.append((r, c, d))
                        break
        for (r, c, d) in painted:
            struct_[r][c] = 1
            ddir[r][c] = d
            src[r][c] = e["id"]
        walls_added.append({"id": e["id"], "tiles": [[c, r] for (r, c, d) in painted], "edit": True, "reason": e.get("reason"),
                            "inferred_position": bool(e.get("inferred_position"))})
        print("edit %s: wall of %d tiles painted on room %s's side" % (e["id"], len(painted), e.get("wall_on")))

    # doors clear their host wall over their width

    def clear_door(point, host, width, did, family, extra=None):
        o, (dx, dy), wwidth = wall_dir[host]
        L = math.hypot(dx, dy) or 1.0
        ux, uy = dx / L, dy / L
        half = (width or 0.9) / 2.0
        p = [point[0] - ux * half, point[1] - uy * half]
        q = [point[0] + ux * half, point[1] + uy * half]
        seg = LineString([p, q])
        reach = max(wwidth / 2.0, 0.22)
        minx, miny, maxx, maxy = seg.bounds
        c0, r1 = tile_of(minx - reach, miny - reach)
        c1, r0 = tile_of(maxx + reach, maxy + reach)
        tiles = []
        for r in range(max(0, r0), min(rows, r1 + 1)):
            for c in range(max(0, c0), min(cols, c1 + 1)):
                if struct_[r][c] in (1, 2) and seg.distance(Point(*centre(c, r))) <= reach:
                    struct_[r][c] = 4
                    ddir[r][c] = 1 if o == "ew" else 2
                    src[r][c] = did
                    tiles.append([c, r])
        # and the tiles the door's own line runs through: a door in a thin wall lying on a tile boundary has no tile
        # centre within its reach, but its wall was painted along that line and must open there
        n = max(1, int(seg.length / (TILE / 4.0)))
        for k in range(n + 1):
            pt = seg.interpolate(k / float(n), normalized=True)
            c, r = tile_of(pt.x, pt.y)
            if 0 <= r < rows and 0 <= c < cols and struct_[r][c] in (1, 2):
                struct_[r][c] = 4
                ddir[r][c] = 1 if o == "ew" else 2
                src[r][c] = did
                tiles.append([c, r])
        entry = {"id": did, "family": family, "width_m": width, "host": host,
                 "dir": o, "tile": list(tile_of(*point[:2])), "tiles": tiles, "double": (width or 0) > 1.4}
        if extra:
            entry.update(extra)
        doors.append(entry)

    for d in model["doors"]:
        if not d.get("point") or not in_band(d.get("bbox"), z0, z1) or d.get("host") not in wall_dir:
            continue
        clear_door(d["point"], d["host"], d.get("width_m"), d["id"], d["family"])
    # doors set in curtain walls are curtain panels in the export (the building's glass entrance doors): a panel whose
    # type or family says door opens its wall over its own width, like a door
    for cw in model.get("curtain_walls", []):
        if cw["id"] not in wall_dir:
            continue
        for pn in cw.get("panels", []) or []:
            bb = pn.get("bbox")
            pname = "%s %s" % (pn.get("family") or "", pn.get("type") or "")
            if not bb or "door" not in pname.lower() or not in_band(bb, z0, z1):
                continue
            cx, cy = (bb[0][0] + bb[1][0]) / 2.0, (bb[0][1] + bb[1][1]) / 2.0
            # the panel's box sits beside the wall's line (its own thickness); the door is where the line is
            (ax, ay), (bx, by) = wall_line[cw["id"]]
            vx, vy = bx - ax, by - ay
            t = max(0.0, min(1.0, ((cx - ax) * vx + (cy - ay) * vy) / max(1e-9, vx * vx + vy * vy)))
            px_, py_ = ax + t * vx, ay + t * vy
            pwidth = max(bb[1][0] - bb[0][0], bb[1][1] - bb[0][1])
            clear_door([px_, py_], cw["id"], pwidth, pn["id"], pname.strip(), {"curtain_panel": True})

    # the owner's edits (program/edits.json): doors the building has and the model lacks, keyed by
    # the host wall's Revit id, each with a reason; drawn as doors and marked as edits
    for e in EDITS:
        if e.get("kind") not in ("add_door", "add_opening") or e.get("level") != name:
            continue
        if e.get("host") not in wall_dir:
            print("edit %s: host wall %s is not on %s" % (e.get("id"), e.get("host"), name))
            continue
        clear_door(e["at"], e["host"], e.get("width_m", 0.9), e["id"], "edit:" + e["kind"],
                   {"edit": True, "leaf": e.get("leaf", e["kind"] == "add_door"), "reason": e.get("reason"),
                    "inferred_position": bool(e.get("inferred_position"))})

    # columns
    for col in model["columns"]:
        bb = col.get("bbox")
        if not in_band(bb, z0, z1):
            continue
        c0, r1 = tile_of(bb[0][0], bb[0][1])
        c1, r0 = tile_of(bb[1][0], bb[1][1])
        px = box(bb[0][0], bb[0][1], bb[1][0], bb[1][1])
        for r in range(max(0, r0), min(rows, r1 + 1)):
            for c in range(max(0, c0), min(cols, c1 + 1)):
                cx, cy = centre(c, r)
                if px.buffer(0.05).contains(Point(cx, cy)) or px.area < TILE * TILE and px.intersects(box(cx - TILE / 2, cy - TILE / 2, cx + TILE / 2, cy + TILE / 2)):
                    struct_[r][c] = 3
                    src[r][c] = col["id"]

    # stairs based on this level: runs and landings
    stairs = []
    for st in model["stairs"]:
        if st.get("base_level") != name:
            continue
        for run in st.get("runs", []):
            fp = run.get("footprint")
            if not fp or len(fp) < 3:
                continue
            poly = Polygon(fp).buffer(0)
            path = run.get("path") or []
            d = 1
            if len(path) >= 2:
                dx, dy = path[-1][0] - path[0][0], path[-1][1] - path[0][1]
                d = 1 if abs(dx) >= abs(dy) else 2
            minx, miny, maxx, maxy = poly.bounds
            c0, r1 = tile_of(minx, miny)
            c1, r0 = tile_of(maxx, maxy)
            for r in range(max(0, r0), min(rows, r1 + 1)):
                for c in range(max(0, c0), min(cols, c1 + 1)):
                    if poly.contains(Point(*centre(c, r))) and struct_[r][c] in (0, 5):  # never over a wall, glass or column
                        struct_[r][c] = 5
                        ddir[r][c] = d
                        src[r][c] = st["id"]
            stairs.append({"id": st["id"], "run": run["id"], "dir": d, "top_level": st.get("top_level")})
        for land in st.get("landings", []) or []:
            fp = land.get("footprint")
            if not fp or len(fp) < 3:
                continue
            poly = Polygon(fp).buffer(0)
            minx, miny, maxx, maxy = poly.bounds
            c0, r1 = tile_of(minx, miny)
            c1, r0 = tile_of(maxx, maxy)
            for r in range(max(0, r0), min(rows, r1 + 1)):
                for c in range(max(0, c0), min(cols, c1 + 1)):
                    if poly.contains(Point(*centre(c, r))) and struct_[r][c] in (0, 5):
                        struct_[r][c] = 5
                        ddir[r][c] = 0
                        src[r][c] = st["id"]

    # the owner's walls round a stair (program/edits.json add_wall around: stairs), now that the stairs are painted:
    # the room's open tiles that touch a stair tile become wall, closing the stairs off from the rest of the room;
    # a 1 m doorway with a door in the middle of the run on door_side lets people in
    for e in EDITS:
        if e.get("kind") != "add_wall" or e.get("level") != name or e.get("around") != "stairs" or e.get("withdrawn"):
            continue
        on = room_idx_by_id.get(e.get("wall_on"))
        if on is None:
            print("edit %s: room not on %s" % (e.get("id"), name))
            continue
        painted = []
        sides_wanted = e.get("sides")  # e.g. ["west"]: only tiles whose stair neighbour lies to the east (the stair is west-entered)
        dirs = {"east": (0, 1, 2), "west": (0, -1, 2), "south": (1, 0, 1), "north": (-1, 0, 1)}  # the direction from the tile to its stair neighbour
        want = [dirs[{"west": "east", "east": "west", "north": "south", "south": "north"}[sd]] for sd in sides_wanted] if sides_wanted else list(dirs.values())
        for r in range(rows):
            for c in range(cols):
                if floor[r][c] != on or struct_[r][c] != 0:
                    continue
                for (dr, dc, d) in want:
                    rn, cn = r + dr, c + dc
                    if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] == 5:
                        painted.append((r, c, d))
                        break
        for (r, c, d) in painted:
            struct_[r][c] = 1
            ddir[r][c] = d
            src[r][c] = e["id"]
        door_tiles = []
        side = e.get("door_side", "west")
        dc_, dr_ = {"west": (1, 0), "east": (-1, 0), "north": (0, 1), "south": (0, -1)}[side]  # the stair lies that way from the run
        run = [(r, c) for (r, c, d) in painted if 0 <= r + dr_ < rows and 0 <= c + dc_ < cols and struct_[r + dr_][c + dc_] == 5]
        if run:
            run.sort()
            m = len(run) // 2
            for (r, c) in run[max(0, m - 1):m + 1]:
                struct_[r][c] = 4
                ddir[r][c] = 2 if side in ("west", "east") else 1
                door_tiles.append([c, r])
        walls_added.append({"id": e["id"], "tiles": [[c, r] for (r, c, d) in painted], "door": door_tiles, "edit": True, "reason": e.get("reason"), "inferred_position": True})
        if door_tiles:
            doors.append({"id": e["id"] + ".door", "family": "edit:add_wall door", "width_m": 1.0, "host": None, "dir": "ns" if side in ("west", "east") else "ew",
                          "tile": door_tiles[0], "tiles": door_tiles, "double": False, "edit": True, "leaf": True, "reason": "the doorway into the stairs from the " + side, "inferred_position": True})
        print("edit %s: %d wall tiles round the stairs of room %s, a doorway of %d tiles on the %s" % (e["id"], len(painted), e.get("wall_on"), len(door_tiles), side))

    # furniture and fixtures with their plan box
    furniture = []
    kinds = Counter()
    for fm in model["furniture"]:
        bb = fm.get("bbox")
        if not bb or not in_band(bb, z0, z1):
            continue
        rk = REKIND.get(str(fm["id"]))
        k = rk["kind"] if rk else kind_of(fm.get("family"))
        if k is None:
            continue
        c0, r1 = tile_of(bb[0][0], bb[0][1])
        c1, r0 = tile_of(bb[1][0], bb[1][1])
        entry = {"id": fm["id"], "kind": k, "family": fm.get("family"), "type": fm.get("type"), "c0": c0, "r0": r0, "c1": c1, "r1": r1,
                 "x": round(bb[0][0] - x0, 3), "y": round(y0 + rows * TILE - bb[1][1], 3),
                 "w": round(bb[1][0] - bb[0][0], 3), "d": round(bb[1][1] - bb[0][1], 3),
                 "h": round(bb[1][2] - bb[0][2], 3), "z": round(bb[0][2] - z0, 3), "rot": fm.get("rotation_rad", 0), "inferred": False}
        if rk:  # the owner's kind for this piece; a guessed kind is marked so the views show it uncertain
            entry["rekind"] = True
            entry["reason"] = rk.get("reason")
            if rk.get("kind_inferred"):
                entry["inferred"] = True
                entry["inferred_what"] = "kind"
        furniture.append(entry)
        kinds[k] += 1

    # the owner's added objects (program/objects.json): placed from the room's walls, every entry
    # flagged inferred and naming its object id, so the views can mark it and nothing passes as modelled
    SIDES = {"north": (0, -1), "south": (0, 1), "west": (-1, 0), "east": (1, 0)}
    THIN = 0.06

    def opaque_runs(idx, side, codes=(1, 3)):
        """Contiguous runs of room tiles whose neighbour on `side` is wall or column (or the given struct codes:
        2 for glass) outside the room: (side, across, start, end) in tile indices, start..end along the wall."""
        dc, dr = SIDES[side]
        groups = {}
        for r in range(rows):
            for c in range(cols):
                if floor[r][c] != idx or struct_[r][c] != 0:
                    continue  # open floor of the room only (a room polygon reaches under its walls)
                rn, cn = r + dr, c + dc
                if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] in codes:
                    along, across = (c, r) if side in ("north", "south") else (r, c)
                    groups.setdefault(across, []).append(along)
        out_runs = []
        for across, vals in groups.items():
            vals.sort()
            start = prev = vals[0]
            for v in vals[1:] + [None]:
                if v is None or v != prev + 1:
                    out_runs.append((side, across, start, prev))
                    if v is not None:
                        start = v
                if v is not None:
                    prev = v
        return out_runs

    def run_box(run, thick, lo=None, hi=None):
        """The plan box (x, y, w, d in metres from the origin, y from the north edge) of a thin surface on the
        inside face of a run, or of the part of it between lo and hi (metres along the wall)."""
        side, across, start, end = run
        a0, a1 = start * TILE, (end + 1) * TILE
        if lo is not None:
            a0, a1 = max(a0, lo), min(a1, hi)
        if side == "north":
            return a0, across * TILE, a1 - a0, thick
        if side == "south":
            return a0, (across + 1) * TILE - thick, a1 - a0, thick
        if side == "west":
            return across * TILE, a0, thick, a1 - a0
        return (across + 1) * TILE - thick, a0, thick, a1 - a0

    def add_object(ob, oid, box_, h, z, extra):
        x, y, w, d = box_
        c0, r0 = int(x // TILE), int(y // TILE)
        c1, r1 = int((x + w - 1e-6) // TILE), int((y + d - 1e-6) // TILE)
        e = {"id": oid, "object": ob["id"], "kind": ob["kind"], "family": "program/objects.json",
             "c0": c0, "r0": r0, "c1": c1, "r1": r1, "x": round(x, 3), "y": round(y, 3), "w": round(w, 3), "d": round(d, 3),
             "h": round(h, 3), "z": round(z, 3), "rot": 0, "inferred": True, "room": ob["room"]}
        e.update(extra)
        furniture.append(e)
        kinds[ob["kind"]] += 1

    for ob in OBJECTS:
        if ob.get("level") != name:
            continue
        room = next((rm for rm in rooms if rm["id"] == ob.get("room")), None)
        if room is None:
            print("object %s: room %s is not on %s" % (ob["id"], ob.get("room"), name))
            continue
        idx, pl, kind = room["idx"], ob.get("placement", {}), ob["kind"]
        placed = 0
        if pl.get("on") == "opaque_walls":
            min_tiles = int(round(pl.get("min_run_m", 1.5) / TILE))
            z, h = pl.get("bottom_m", 0.9), pl.get("top_m", 2.1) - pl.get("bottom_m", 0.9)
            for side in SIDES:
                for n, run in enumerate(sorted(opaque_runs(idx, side), key=lambda t: (t[1], t[2]))):
                    if run[3] - run[2] + 1 < min_tiles:
                        continue
                    add_object(ob, "%s.%s%d" % (ob["id"], side[0], n), run_box(run, THIN), h, z, {"side": side})
                    placed += 1
        elif pl.get("wall") and pl.get("mount"):
            # against a wall of the room (a screen or backdrop high on it, a shelf, a table on the floor): centred on the
            # longest opaque run of that side, width_m along the wall, depth_m out from it, between bottom_m and top_m
            side = pl["wall"]
            runs_ = sorted(opaque_runs(idx, side), key=lambda t: t[3] - t[2], reverse=True)
            if runs_:
                run = runs_[0]
                a0_, a1_ = run[2] * TILE, (run[3] + 1) * TILE
                half = min(pl.get("width_m", 2.4), a1_ - a0_) / 2.0
                mid = a0_ + pl.get("along", 0.5) * (a1_ - a0_)
                mid = min(max(mid, a0_ + half), a1_ - half)
                z, h = pl.get("bottom_m", 1.0), pl.get("top_m", 2.5) - pl.get("bottom_m", 1.0)
                extra = {"side": side, "mount": pl["mount"]}
                if pl["mount"] == "high":
                    extra["state"] = "down"
                add_object(ob, ob["id"], run_box(run, pl.get("depth_m", 0.12), mid - half, mid + half), h, z, extra)
                placed = 1
        elif pl.get("on") == "object":
            # count pieces spread along the top of an added object placed before this one
            base = [fm for fm in furniture if fm.get("object") == pl.get("object")]
            if base:
                b = base[0]
                n = int(pl.get("count", 1))
                sw, sd, sh = pl.get("size_m", [0.3, 0.3, 0.3])
                along_x = b["w"] >= b["d"]
                length = b["w"] if along_x else b["d"]
                for k in range(n):
                    t = (k + 0.5) / n
                    if along_x:
                        x, y = b["x"] + t * length - sw / 2.0, b["y"] + b["d"] / 2.0 - sd / 2.0
                    else:
                        x, y = b["x"] + b["w"] / 2.0 - sw / 2.0, b["y"] + t * length - sd / 2.0
                    add_object(ob, "%s.%d" % (ob["id"], k), (x, y, sw, sd), sh, b["z"] + b["h"], {"on_object": b["object"]})
                placed = n
        elif pl.get("corner"):
            # the open tile of the room deepest into that corner, the box tucked into it
            open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
            # the room's main floor: the largest connected piece of its open tiles (a lobby cut off by a wall does not count)
            seen, comps = set(), []
            for t in open_tiles:
                if t in seen:
                    continue
                comp, stack = [], [t]
                seen.add(t)
                while stack:
                    r, c = stack.pop()
                    comp.append((r, c))
                    for nb in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                        if nb not in seen and 0 <= nb[0] < rows and 0 <= nb[1] < cols and floor[nb[0]][nb[1]] == idx and struct_[nb[0]][nb[1]] == 0:
                            seen.add(nb)
                            stack.append(nb)
                comps.append(comp)
            if comps:
                open_tiles = max(comps, key=len)
            if open_tiles:
                corner = pl["corner"]
                score = {"north_east": lambda t: t[1] - t[0], "north_west": lambda t: -t[1] - t[0],
                         "south_east": lambda t: t[1] + t[0], "south_west": lambda t: t[0] - t[1]}[corner]
                r, c = max(open_tiles, key=score)
                sw, sd, sh = pl.get("size_m", [0.7, 0.7, 1.8])
                x = (c + 1) * TILE - sw if "east" in corner else c * TILE
                y = (r + 1) * TILE - sd if "south" in corner else r * TILE
                add_object(ob, ob["id"], (x, y, sw, sd), sh, 0.0, {"corner": corner})
                placed = 1
        elif pl.get("on") == "counter":
            # on top of one of the room's modelled counters: the westmost, eastmost, northmost or southmost, at a fraction along it
            counters = [fm for fm in furniture if not fm.get("inferred") and fm["kind"] == "counter"
                        and any(floor[r][c] == idx for r in range(max(0, fm["r0"]), min(rows, fm["r1"] + 1)) for c in range(max(0, fm["c0"]), min(cols, fm["c1"] + 1)))]
            if counters:
                which = pl.get("which", "west")
                key = {"west": lambda f: f["x"], "east": lambda f: -(f["x"] + f["w"]), "north": lambda f: f["y"], "south": lambda f: -(f["y"] + f["d"])}[which]
                ctr = min(counters, key=key)
                sw, sd, sh = pl.get("size_m", [0.4, 0.4, 0.3])
                t = pl.get("at", 0.5)
                if ctr["d"] >= ctr["w"]:
                    x, y = ctr["x"] + ctr["w"] / 2.0 - sw / 2.0, ctr["y"] + t * ctr["d"] - sd / 2.0
                else:
                    x, y = ctr["x"] + t * ctr["w"] - sw / 2.0, ctr["y"] + ctr["d"] / 2.0 - sd / 2.0
                add_object(ob, ob["id"], (x, y, sw, sd), sh, ctr["h"], {"on_element": ctr["id"]})
                placed = 1
        elif pl.get("boxes"):
            # a hand-laid set: several pieces, each a box in model metres
            k = 0
            for b in pl["boxes"]:
                bx0, by0, bx1, by1 = b["box_m"]
                extra = {kk: v for kk, v in b.items() if kk not in ("kind", "box_m", "height_m", "z_m")}
                extra["placeholder"] = True
                add_object(dict(ob, kind=b["kind"]), "%s.%d" % (ob["id"], k), (bx0 - x0, y0 + rows * TILE - by1, bx1 - bx0, by1 - by0), b.get("height_m", 0.5), b.get("z_m", 0.0), extra)
                k += 1
            placed = k
        elif pl.get("box_m"):
            # a box given in model metres (x0, y0, x1, y1), the owner's own placement
            bx0, by0, bx1, by1 = pl["box_m"]
            add_object(ob, ob["id"], (bx0 - x0, y0 + rows * TILE - by1, bx1 - bx0, by1 - by0), pl.get("height_m", 0.5), pl.get("z_m", 0.0), {"plain": True} if pl.get("plain") else {})
            placed = 1
        elif pl.get("row_along_wall"):
            # as many desks as fill the longest run of that side, against the wall, a chair on the room side of each
            side = pl["row_along_wall"]
            runs_ = sorted(opaque_runs(idx, side, (1, 2, 3)), key=lambda t: t[3] - t[2], reverse=True)
            if runs_:
                run = runs_[0]
                dw, dd, dh = pl.get("desk_size_m", [1.6, 0.8, 0.73])
                cw, cd, ch = pl.get("chair_size_m", [0.6, 0.6, 0.45])
                gap = pl.get("gap_m", 0.2)
                a0, a1 = run[2] * TILE, (run[3] + 1) * TILE
                n = int((a1 - a0 + gap) // (dw + gap))
                if n > 0:
                    span = n * dw + (n - 1) * gap
                    start = (a0 + a1) / 2.0 - span / 2.0
                    OPP = {"north": "south", "south": "north", "west": "east", "east": "west"}
                    for k in range(n):
                        lo = start + k * (dw + gap)
                        dbox = run_box(run, dd, lo, lo + dw)
                        x, y, w, d = dbox
                        mid = lo + dw / 2.0
                        if side == "north":
                            cbox = (mid - cw / 2.0, y + dd + 0.1, cw, cd)
                        elif side == "south":
                            cbox = (mid - cw / 2.0, y - 0.1 - cd, cw, cd)
                        elif side == "west":
                            cbox = (x + dd + 0.1, mid - cw / 2.0, cd, cw)
                        else:
                            cbox = (x - 0.1 - cd, mid - cw / 2.0, cd, cw)
                        add_object(dict(ob, kind="desk"), "%s.%d" % (ob["id"], k), dbox, dh, 0.0, {"side": side, "facing": side, "count_unknown": True})
                        add_object(dict(ob, kind="chair"), "%s.%d.chair" % (ob["id"], k), cbox, ch, 0.0, {"side": side, "facing": side, "count_unknown": True})
                    placed = n
        elif pl.get("table_set"):
            # pairs of tables pushed together at the centre of the room's main floor, chairs round each pair
            open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
            if open_tiles:
                cx = (sum(c for r, c in open_tiles) / len(open_tiles) + 0.5) * TILE
                cy = (sum(r for r, c in open_tiles) / len(open_tiles) + 0.5) * TILE
                tw, td, th = pl.get("table_size_m", [2.29, 1.57, 0.73])
                cw, cd, ch = pl.get("chair_size_m", [0.66, 0.68, 0.45])
                pairs = int(pl.get("pairs", 1))
                pitch = td + 1.5 + 2 * cd
                y0_ = cy - (pairs * pitch - 1.5 - 2 * cd) / 2.0
                k = 0
                for pidx in range(pairs):
                    y = y0_ + pidx * pitch + cd
                    for t in range(2):
                        add_object(dict(ob, kind="table"), "%s.%d" % (ob["id"], k), (cx - tw + t * tw, y, tw, td), th, 0.0, {"count_unknown": True}); k += 1
                    for t in range(4):  # chairs along the long sides
                        x = cx - tw + (t + 0.5) * (2 * tw / 4) - cw / 2.0
                        add_object(dict(ob, kind="chair"), "%s.%d.n%d" % (ob["id"], pidx, t), (x, y - 0.1 - cd, cw, cd), ch, 0.0, {"facing": "south", "count_unknown": True})
                        add_object(dict(ob, kind="chair"), "%s.%d.s%d" % (ob["id"], pidx, t), (x, y + td + 0.1, cw, cd), ch, 0.0, {"facing": "north", "count_unknown": True})
                    add_object(dict(ob, kind="chair"), "%s.%d.w" % (ob["id"], pidx), (cx - tw - 0.1 - cd, y + td / 2.0 - cw / 2.0, cd, cw), ch, 0.0, {"facing": "east", "count_unknown": True})
                    add_object(dict(ob, kind="chair"), "%s.%d.e" % (ob["id"], pidx), (cx + tw + 0.1, y + td / 2.0 - cw / 2.0, cd, cw), ch, 0.0, {"facing": "west", "count_unknown": True})
                placed = k
        elif pl.get("table_rows"):
            # rows of tables across the room facing the screen (placed already by the crit rule) or the south wall
            open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
            if open_tiles:
                rs_ = [r for r, c in open_tiles]; cs_ = [c for r, c in open_tiles]
                X0, X1 = min(cs_) * TILE, (max(cs_) + 1) * TILE
                Y0, Y1 = min(rs_) * TILE, (max(rs_) + 1) * TILE
                screen = next((fm for fm in furniture if fm.get("room") == ob["room"] and fm["kind"] == "screen"), None)
                # the screen is placed by the crit rule after the per-room objects, so ask the rule where it will be
                front = pl.get("front") or (screen.get("side", "south") if screen else (BY_USE.get("crit", {}).get("screen_wall", {}).get(str(ob["room"])) or "south"))
                tw, td, th = pl.get("table_size_m", [2.29, 1.57, 0.73])
                cw, cd, ch = pl.get("chair_size_m", [0.66, 0.68, 0.45])
                per = int(pl.get("chairs_per_table", 3))
                clear, rgap, aisle, tgap = pl.get("front_clear_m", 1.2), pl.get("row_gap_m", 0.5), pl.get("aisle_m", 0.45), pl.get("table_gap_m", 0.3)
                along_x = front in ("north", "south")  # rows run east-west, facing north or south
                width = (X1 - X0) if along_x else (Y1 - Y0)
                depth = (Y1 - Y0) if along_x else (X1 - X0)
                pitch = td + cd + 0.1 + rgap
                n_rows = min(int(pl.get("rows_wanted", 5)), int((depth - clear + rgap) // pitch))
                per_row = int((width - 2 * aisle + tgap) // (tw + tgap))
                k = 0
                if n_rows > 0 and per_row > 0:
                    span = per_row * tw + (per_row - 1) * tgap
                    start = (width - span) / 2.0
                    for i in range(n_rows):
                        off = clear + i * pitch  # from the front wall to the table's front edge
                        for j in range(per_row):
                            a = start + j * (tw + tgap)
                            if front == "south":
                                box_ = (X0 + a, Y1 - off - td, tw, td); facing = "south"
                                chairs = [(X0 + a + (q + 0.5) * tw / per - cw / 2.0, Y1 - off - td - 0.1 - cd, cw, cd) for q in range(per)]
                            elif front == "north":
                                box_ = (X0 + a, Y0 + off, tw, td); facing = "north"
                                chairs = [(X0 + a + (q + 0.5) * tw / per - cw / 2.0, Y0 + off + td + 0.1, cw, cd) for q in range(per)]
                            elif front == "west":
                                box_ = (X0 + off, Y0 + a, td, tw); facing = "west"
                                chairs = [(X0 + off + td + 0.1, Y0 + a + (q + 0.5) * tw / per - cw / 2.0, cd, cw) for q in range(per)]
                            else:
                                box_ = (X1 - off - td, Y0 + a, td, tw); facing = "east"
                                chairs = [(X1 - off - td - 0.1 - cd, Y0 + a + (q + 0.5) * tw / per - cw / 2.0, cd, cw) for q in range(per)]
                            bx, by, bw, bd = box_
                            on_column = any(struct_[rr][cc] != 0 for rr in range(int(by // TILE), int((by + bd - 1e-6) // TILE) + 1) for cc in range(int(bx // TILE), int((bx + bw - 1e-6) // TILE) + 1) if 0 <= rr < rows and 0 <= cc < cols)
                            if on_column:
                                continue  # a column stands there: no table
                            add_object(dict(ob, kind="table"), "%s.%d.%d" % (ob["id"], i, j), box_, th, 0.0, {"row": i, "facing": facing, "count_unknown": True}); k += 1
                            for q, cb in enumerate(chairs):
                                add_object(dict(ob, kind="chair"), "%s.%d.%d.c%d" % (ob["id"], i, j, q), cb, ch, 0.0, {"row": i, "facing": facing, "count_unknown": True})
                print("table_rows %s room %s: %d rows of up to %d tables (%d wanted), %d tables and %d chairs placed, facing %s; room %.1f wide x %.1f deep, pitch %.2f m" % (
                    ob["id"], room["number"], n_rows, per_row, int(pl.get("rows_wanted", 5)), k, k * per, front, width, depth, pitch))
                placed = k
        elif pl.get("cluster"):
            # n desks in facing pairs at the centre of the room's main floor, a chair on the outer side of each
            open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
            if open_tiles:
                cx = (sum(c for r, c in open_tiles) / len(open_tiles) + 0.5) * TILE
                cy = (sum(r for r, c in open_tiles) / len(open_tiles) + 0.5) * TILE
                dw, dd, dh = pl.get("desk_size_m", [1.6, 0.8, 0.73])
                cw, cd, ch = pl.get("chair_size_m", [0.6, 0.6, 0.45])
                n = int(pl["cluster"])
                pairs = (n + 1) // 2
                total = pairs * dw + (pairs - 1) * 0.3
                k = 0
                for pidx in range(pairs):
                    x = cx - total / 2.0 + pidx * (dw + 0.3)
                    for row_ in (0, 1):
                        if k >= n:
                            break
                        y = cy - dd if row_ == 0 else cy
                        add_object(dict(ob, kind="desk"), "%s.%d" % (ob["id"], k), (x, y, dw, dd), dh, 0.0, {"facing": "south" if row_ == 0 else "north", "count_unknown": True})
                        cy_ = y - 0.1 - cd if row_ == 0 else y + dd + 0.1
                        add_object(dict(ob, kind="chair"), "%s.%d.chair" % (ob["id"], k), (x + dw / 2.0 - cw / 2.0, cy_, cw, cd), ch, 0.0, {"facing": "south" if row_ == 0 else "north", "count_unknown": True})
                        k += 1
                placed = k
        elif pl.get("ceiling"):
            side = pl.get("faces", "west")
            if pl.get("screen_object"):
                screen = next((fm for fm in furniture if fm.get("object") == pl["screen_object"]), None)
            else:
                screen = next((fm for fm in furniture if fm.get("inferred") and fm.get("room") == ob["room"] and fm["kind"] == "screen"), None)
            runs_ = sorted(opaque_runs(idx, side), key=lambda t: t[3] - t[2], reverse=True)
            if screen or runs_:
                if screen:
                    cx, cy = screen["x"] + screen["w"] / 2.0, screen["y"] + screen["d"] / 2.0
                else:
                    x, y, w, d = run_box(runs_[0], THIN)
                    cx, cy = x + w / 2.0, y + d / 2.0
                dist = pl.get("distance_m", 3.5)
                dc, dr = SIDES[side]
                cx, cy = cx - dc * dist, cy - dr * dist
                sw, sd, sh = pl.get("size_m", [0.4, 0.3, 0.15])
                add_object(ob, ob["id"], (cx - sw / 2.0, cy - sd / 2.0, sw, sd), sh, pl.get("bottom_m", 2.4), {"side": side})
                placed = 1
        if not placed:
            print("object %s (%s, room %s): nothing placed" % (ob["id"], kind, room["number"]))
        else:
            print("object %s (%s, room %s): %d piece(s), inferred position" % (ob["id"], kind, room["number"], placed))

    # rules by use (program/objects.json by_use): every room of that use in the program gets the pieces
    for use, rule in BY_USE.items():
        pl = rule.get("placement", {})
        for room in rooms:
            prog = PROGRAM.get(str(room["id"]), {})
            if prog.get("use") != use and room["id"] not in rule.get("also_rooms", []):
                continue
            area = prog.get("area_m2") or room.get("area_m2") or 0
            if rule.get("max_area_m2") and area > rule["max_area_m2"]:
                print("by_use %s: room %s (%.1f m2) is above %s m2, left for the owner" % (use, room["number"], area, rule["max_area_m2"]))
                continue
            idx = room["idx"]
            ob = {"id": "%s.%s" % (use.upper(), room["id"]), "room": room["id"], "kind": None}
            places = set(rule.get("places", []))
            if places and any(o.get("room") == room["id"] and not o.get("withdrawn") and o.get("kind") in places for o in OBJECTS):
                continue  # the room has its own pieces of the kinds this rule places (Level 3's crit rooms, washroom 38)
            if pl.get("wc_set"):
                # stalls along the opaque wall farthest from the door (or the owner's side), aligned to the corner farthest
                # from the door; a counter with sinks along another wall (the owner's, or opposite the stalls)
                ov = rule.get("rooms", {}).get(str(room["id"]), {})
                door_tiles = []
                open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
                for (r, c) in open_tiles:
                    for side, (dc, dr) in SIDES.items():
                        rn, cn = r + dr, c + dc
                        if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] == 4:
                            door_tiles.append((rn, cn))
                extra = {"rule": use, "reason": rule.get("reason"), "room_note": ov.get("note")}

                def run_mid(run):
                    side_, across, s0, e0 = run
                    m = (s0 + e0 + 1) / 2.0
                    return (across, m) if side_ in ("north", "south") else (m, across)

                def door_dist(run):
                    if not door_tiles:
                        return 0.0
                    rr, cc = run_mid(run)
                    return min(((rr - a) ** 2 + (cc - b) ** 2) ** 0.5 for (a, b) in door_tiles)

                def near_door_end(run):
                    """Which end of the run the door is nearer: 0 the start, 1 the end."""
                    if not door_tiles:
                        return 0
                    side_, across, s0, e0 = run
                    def d(along):
                        rr, cc = (across, along) if side_ in ("north", "south") else (along, across)
                        return min(((rr - a) ** 2 + (cc - b) ** 2) ** 0.5 for (a, b) in door_tiles)
                    return 0 if d(s0) <= d(e0) else 1

                all_runs = [run for side in SIDES for run in opaque_runs(idx, side)]
                sw_, sd_ = pl.get("single_stall_size_m", [0.8, 1.2]) if ov.get("single") else pl.get("stall_size_m", [0.9, 1.5])
                n_want = int(ov.get("stalls", pl.get("stalls", 4)))
                stall_boxes = []
                n_st = 0
                stall_side = None
                cands = [run for run in all_runs if (run[3] - run[2] + 1) * TILE >= sw_]
                if ov.get("stall_side"):
                    cands = [run for run in cands if run[0] == ov["stall_side"]]
                cands.sort(key=lambda run: (-door_dist(run), -(run[3] - run[2])))
                if cands:
                    run = cands[0]; stall_side = run[0]
                    a0, a1 = run[2] * TILE, (run[3] + 1) * TILE
                    n = min(n_want, int((a1 - a0) // sw_))
                    if (ov.get("align") or pl.get("align")) == "far_corner" and door_tiles:
                        start = a1 - n * sw_ if near_door_end(run) == 0 else a0
                    else:
                        start = (a0 + a1) / 2.0 - n * sw_ / 2.0
                    for k in range(n):
                        sbox = run_box(run, sd_, start + k * sw_, start + (k + 1) * sw_)
                        add_object(dict(ob, kind="stall"), "%s.stall%d" % (ob["id"], k), sbox, 2.0, 0.0, dict(extra, side=stall_side, single=bool(ov.get("single"))))
                        stall_boxes.append(sbox)
                        n_st += 1
                OPP = {"north": "south", "south": "north", "west": "east", "east": "west"}
                n_sk = 0
                scands = [run for run in all_runs if run[0] != stall_side]
                if ov.get("sink_side"):
                    scands = [run for run in scands if run[0] == ov["sink_side"]]
                    if ov.get("sink_run") == "inner":  # the run deepest into the room on that side: a partition's face, not the outer wall
                        key_ = (lambda run: -run[1]) if ov["sink_side"] in ("north", "west") else (lambda run: run[1])
                        scands.sort(key=key_)
                    else:
                        scands.sort(key=lambda run: -(run[3] - run[2]))
                else:
                    # opposite the stalls first, then longer runs; the south wall last, since the plan view hides what stands against it
                    scands.sort(key=lambda run: (1 if run[0] == "south" else 0, 0 if stall_side and run[0] == OPP[stall_side] else 1, -(run[3] - run[2])))
                pitch = pl.get("sink_pitch_m", 0.7)
                scands = [run for run in scands if (run[3] - run[2] + 1) * TILE - 0.2 >= pitch]  # a run that holds at least one sink

                def clear_of_stalls(box_, margin=0.1):
                    x, y, w, d = box_
                    return not any(x < bx + bw + margin and x + w + margin > bx and y < by + bd + margin and y + d + margin > by for (bx, by, bw, bd) in stall_boxes)

                cbox = None
                for run in scands:
                    side = run[0]
                    a0, a1 = run[2] * TILE, (run[3] + 1) * TILE
                    n = min(int(ov.get("sinks", pl.get("sinks", 3))), int((a1 - a0 - 0.2) // pitch))
                    while n > 0 and cbox is None:
                        length = n * pitch + 0.2
                        mid = (a0 + a1) / 2.0
                        # the middle of the run, then towards either end, until the counter is clear of every stall
                        for lo in [mid - length / 2.0] + [a0 + t * (a1 - a0 - length) for t in (0.0, 1.0, 0.25, 0.75)]:
                            cand = run_box(run, pl.get("counter_depth_m", 0.55), lo, lo + length)
                            if clear_of_stalls(cand):
                                cbox = cand
                                break
                        if cbox is None:
                            n -= 1  # fewer sinks, a shorter counter
                    if cbox is not None:
                        break
                if cbox is not None:
                    if True:
                        add_object(dict(ob, kind="counter"), "%s.counter" % ob["id"], cbox, pl.get("counter_height_m", 0.85), 0.0, dict(extra, side=side, plain=True))
                        kw, kd, kh = pl.get("sink_size_m", [0.45, 0.4, 0.15])
                        x, y, w, d = cbox
                        for k in range(n):
                            t = (k + 0.5) / n
                            if w >= d:
                                box_ = (x + t * w - kw / 2.0, y + d / 2.0 - kd / 2.0, kw, kd)
                            else:
                                box_ = (x + w / 2.0 - kw / 2.0, y + t * d - kd / 2.0, kw, kd)
                            add_object(dict(ob, kind="sink"), "%s.sink%d" % (ob["id"], k), box_, kh, pl.get("counter_height_m", 0.85), dict(extra, side=side))
                            n_sk += 1
                print("by_use %s: room %s (%.1f m2): %d stalls on the %s, %d sinks" % (use, room["number"], area, n_st, stall_side or "no wall", n_sk))
            if pl.get("crit_set"):
                # what Level 3's crit rooms got: felt on every opaque wall, a screen high on the short wall on the door's
                # side (else the short opaque wall), a projector facing it
                fe, sc, pr = pl.get("felt", {}), pl.get("screen", {}), pl.get("projector", {})
                door_sides = set()
                open_tiles = [(r, c) for r in range(rows) for c in range(cols) if floor[r][c] == idx and struct_[r][c] == 0]
                for side, (dc, dr) in SIDES.items():
                    for (r, c) in open_tiles:
                        rn, cn = r + dr, c + dc
                        if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] == 4:
                            door_sides.add(side)
                extra = {"rule": use, "reason": rule.get("reason")}
                n_felt = 0
                min_tiles = int(round(fe.get("min_run_m", 1.5) / TILE))
                for side in SIDES:
                    for n, run in enumerate(sorted(opaque_runs(idx, side), key=lambda t: (t[1], t[2]))):
                        if run[3] - run[2] + 1 < min_tiles:
                            continue
                        add_object(dict(ob, kind="pinup_wall"), "%s.felt.%s%d" % (ob["id"], side[0], n), run_box(run, THIN),
                                   fe.get("top_m", 2.1) - fe.get("bottom_m", 0.9), fe.get("bottom_m", 0.9), dict(extra, side=side))
                        n_felt += 1
                rs_ = [r for r, c in open_tiles]; cs_ = [c for r, c in open_tiles]
                wide = (max(cs_) - min(cs_)) >= (max(rs_) - min(rs_))
                short_sides = ["west", "east"] if wide else ["north", "south"]
                forced = rule.get("screen_wall", {}).get(str(room["id"]))  # the owner named the screen's wall
                if forced:
                    short_sides = [forced]
                    door_sides = door_sides | {forced}
                cands = []
                for side in short_sides:
                    for run in opaque_runs(idx, side):
                        if (run[3] - run[2] + 1) * TILE >= 1.5:
                            cands.append((0 if side in door_sides else 1, -(run[3] - run[2]), run))
                cands.sort()
                if not cands:  # no short opaque wall long enough: any opaque run, a guess
                    for side in SIDES:
                        for run in opaque_runs(idx, side):
                            if (run[3] - run[2] + 1) * TILE >= 1.5:
                                cands.append((2, -(run[3] - run[2]), run))
                    cands.sort()
                screen_box = None
                if cands:
                    run = cands[0][2]
                    side = run[0]
                    mid = (run[2] + run[3] + 1) * TILE / 2.0
                    half = min(sc.get("width_m", 2.4), (run[3] - run[2] + 1) * TILE) / 2.0
                    screen_box = run_box(run, sc.get("depth_m", 0.12), mid - half, mid + half)
                    add_object(dict(ob, kind="screen"), ob["id"] + ".screen", screen_box, sc.get("top_m", 2.5) - sc.get("bottom_m", 1.0), sc.get("bottom_m", 1.0),
                               dict(extra, side=side, state="down", wall_guessed=side not in door_sides))
                    x, y, w, d = screen_box
                    cx, cy = x + w / 2.0, y + d / 2.0
                    dc, dr = SIDES[side]
                    dist = pr.get("distance_m", 3.5)
                    cx, cy = cx - dc * dist, cy - dr * dist
                    sw, sd, sh = pr.get("size_m", [0.4, 0.3, 0.15])
                    add_object(dict(ob, kind="projector"), ob["id"] + ".projector", (cx - sw / 2.0, cy - sd / 2.0, sw, sd), sh, pr.get("bottom_m", 2.4), dict(extra, side=side))
                print("by_use %s: room %s (%.1f m2): %d felt runs, screen on the %s%s" % (use, room["number"], area, n_felt, cands[0][2][0] if cands else "no wall", "" if (cands and cands[0][2][0] in door_sides) else " (no door on a short wall: guessed)"))
            if pl.get("office_set"):
                # the desk along the side opposite the door (window or wall), pulled off it by the chair, so the occupant
                # faces the door; a visitor chair across the desk; shelving on another wall; on the listed levels a
                # counter along the window; sizes from the room's area
                dw, dd = pl["desk_by_area"][-1][1]
                for lim, size in pl["desk_by_area"]:
                    if area <= lim:
                        dw, dd = size
                        break
                cw, cd, ch = pl.get("chair_size_m", [0.6, 0.6, 0.45])
                OPP = {"north": "south", "south": "north", "west": "east", "east": "west"}
                door_sides = set()
                for side, (dc, dr) in SIDES.items():
                    for r in range(rows):
                        for c in range(cols):
                            if floor[r][c] == idx and struct_[r][c] == 0:
                                rn, cn = r + dr, c + dc
                                if 0 <= rn < rows and 0 <= cn < cols and struct_[rn][cn] == 4:
                                    door_sides.add(side)
                extra = {"rule": use, "reason": rule.get("reason")}
                boxes = []  # (x, y, w, d) of what is placed, to keep the shelving clear of it

                def overlaps(b, margin=0.3):
                    x, y, w, d = b
                    for (bx, by, bw, bd) in boxes:
                        if x < bx + bw + margin and x + w + margin > bx and y < by + bd + margin and y + d + margin > by:
                            return True
                    return False

                # the window counter first: the desk's chair may have to clear it
                wc = pl.get("window_counter")
                counter_depth = {}
                if wc and name in wc.get("levels", []):
                    # a glazed side: glass panes with the mullions or columns between them count as one run
                    for side in SIDES:
                        if not opaque_runs(idx, side, (2,)):
                            continue
                        for run in opaque_runs(idx, side, (2, 3)):
                            if (run[3] - run[2] + 1) * TILE < 1.0:
                                continue
                            a0, a1 = run[2] * TILE + 0.1, (run[3] + 1) * TILE - 0.1
                            box_ = run_box(run, wc.get("depth_m", 0.5), a0, a1)
                            add_object(dict(ob, kind="counter"), "%s.counter.%s" % (ob["id"], side[0]), box_, wc.get("height_m", 0.75), 0.0,
                                       dict(extra, side=side, assumption="the owner: there may be another counter along the window, on the fourth floor in particular"))
                            boxes.append(box_)
                            counter_depth[side] = wc.get("depth_m", 0.5)
                # the desk's side: opposite the door when that side fits the desk, else the longest side without a door
                runs_ = []
                for side in SIDES:
                    for run in opaque_runs(idx, side, (1, 2, 3)):
                        if (run[3] - run[2] + 1) * TILE >= dw:
                            opposite = pl.get("face_door") and any(OPP[d] == side for d in door_sides)
                            runs_.append((0 if opposite else 1, side in door_sides, -(run[3] - run[2]), run))
                if not runs_:
                    print("by_use %s: room %s has no wall long enough for a %.1f m desk" % (use, room["number"], dw))
                    continue
                runs_.sort()
                run = runs_[0][3]
                side = run[0]
                mid = (run[2] + run[3] + 1) * TILE / 2.0
                gap = 0.15 + counter_depth.get(side, 0.0)  # the chair's back off the wall, or off the window counter
                x, y, w, d = run_box(run, gap + cd, mid - cw / 2.0, mid + cw / 2.0)
                vw, vd, vh = pl.get("visitor_chair_size_m", [0.55, 0.55, 0.45])
                if side == "north":
                    cbox = (x, y + gap, w, cd); dbox = (mid - dw / 2.0, y + gap + cd, dw, dd); vbox = (mid - vw / 2.0, dbox[1] + dd + 0.15, vw, vd)
                elif side == "south":
                    cbox = (x, y, w, cd); dbox = (mid - dw / 2.0, y - dd, dw, dd); vbox = (mid - vw / 2.0, dbox[1] - 0.15 - vd, vw, vd)
                elif side == "west":
                    cbox = (x + gap, y, cd, d); dbox = (x + gap + cd, mid - dw / 2.0, dd, dw); vbox = (dbox[0] + dd + 0.15, mid - vw / 2.0, vw, vd)
                else:
                    cbox = (x, y, cd, d); dbox = (x - dd, mid - dw / 2.0, dd, dw); vbox = (dbox[0] - 0.15 - vw, mid - vw / 2.0, vw, vd)
                facing = OPP[side]
                add_object(dict(ob, kind="desk"), ob["id"] + ".desk", dbox, pl.get("desk_height_m", 0.73), 0.0, dict(extra, side=side, facing=facing))
                add_object(dict(ob, kind="chair"), ob["id"] + ".chair", cbox, ch, 0.0, dict(extra, side=side, facing=facing, seat="occupant"))
                add_object(dict(ob, kind="chair"), ob["id"] + ".visitor", vbox, vh, 0.0, dict(extra, facing=side, seat="visitor"))
                boxes += [cbox, dbox, vbox]
                # shelving: on an opaque wall that is not the desk's and has no door, at an end of the run clear of the desk
                sw, sd, sh = pl.get("shelving_size_m", [0.9, 0.35, 1.8])
                placed_shelf = False
                for s_ in sorted(SIDES, key=lambda k: (k in door_sides, k == side)):
                    if s_ == side:
                        continue
                    for run2 in sorted(opaque_runs(idx, s_), key=lambda t: -(t[3] - t[2])):
                        a0, a1 = run2[2] * TILE, (run2[3] + 1) * TILE
                        if a1 - a0 < sw:
                            continue
                        for lo in (a0 + 0.1, a1 - 0.1 - sw, (a0 + a1) / 2.0 - sw / 2.0):
                            box_ = run_box(run2, sd, lo, lo + sw)
                            if not overlaps(box_):
                                add_object(dict(ob, kind="shelf"), ob["id"] + ".shelving", box_, sh, 0.0, dict(extra, side=s_, assumption="shelving in each office, an assumption the owner asked for"))
                                boxes.append(box_)
                                placed_shelf = True
                                break
                        if placed_shelf:
                            break
                    if placed_shelf:
                        break
                print("by_use %s: room %s (%.1f m2): %.1f x %.1f m desk on the %s side facing %s%s%s, inferred position" % (
                    use, room["number"], area, dw, dd, side, facing, "" if placed_shelf else ", no room for shelving",
                    ", window counter" if counter_depth else ""))

    # cohort zones (program/objects.json zones): every desk and chair of a zoned room is tagged with its cohort, from
    # the piece's centre in model metres; the boundaries are the owner's words with assumed lines, so the tag says so
    for rid, zd in ZONES.items():
        room = next((rm for rm in rooms if str(rm["id"]) == rid), None)
        if room is None:
            continue
        idx = room["idx"]
        n_tag = Counter()
        for fm in furniture:
            if fm["kind"] not in ("desk", "chair"):
                continue
            cx = x0 + fm["x"] + fm["w"] / 2.0
            cy = y0 + rows * TILE - fm["y"] - fm["d"] / 2.0
            c, r = tile_of(cx, cy)
            if not (0 <= r < rows and 0 <= c < cols and floor[r][c] == idx):
                continue
            for z in zd.get("zones", []):
                if cx < z.get("x_min_m", -1e9) or cx > z.get("x_max_m", 1e9) or cy < z.get("y_min_m", -1e9) or cy > z.get("y_max_m", 1e9):
                    continue
                fm["cohort"] = z["cohort"]
                fm["cohort_zone"] = z.get("where")
                fm["cohort_inferred"] = bool(z.get("boundary_inferred"))
                n_tag[(z["cohort"], fm["kind"])] += 1
                break
        print("zones: room %s: %s" % (room["number"], ", ".join("%d %ss %s" % (n, k, co) for (co, k), n in sorted(n_tag.items()))))

    # no-go areas (program/objects.json global_rules.service_areas): rooms whose use is service, and enclosed floor
    # cavities without a door (a service shaft), are not occupiable; the elevator is usable and never no-go
    no_go = []
    nogo_rooms = {rm["idx"] for rm in rooms if PROGRAM.get(str(rm["id"]), {}).get("use") == "service"}  # the elevator is usable (owner)
    for fm in furniture:
        if fm["kind"] == "elevator":
            fm["transit"] = True  # the southern elevator: people may use it to move between floors
    seen = set()
    for r in range(rows):
        for c in range(cols):
            if (r, c) in seen or struct_[r][c] != 0 or floor[r][c] == 0:
                continue
            if floor[r][c] in nogo_rooms:
                no_go.append([c, r])
                continue
            if floor[r][c] != 1:
                continue
            # a slab-only open component: enclosed and doorless means a cavity
            comp, stack, enclosed, has_door = [], [(r, c)], True, False
            seen.add((r, c))
            while stack:
                a, b = stack.pop()
                comp.append((a, b))
                for nb in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= nb[0] < rows and 0 <= nb[1] < cols):
                        enclosed = False
                        continue
                    sv, fv = struct_[nb[0]][nb[1]], floor[nb[0]][nb[1]]
                    if sv == 4:
                        has_door = True
                    elif sv == 0:
                        if fv == 0:
                            enclosed = False
                        elif fv == 1:
                            if nb not in seen:
                                seen.add(nb)
                                stack.append(nb)
                        else:
                            enclosed = False  # opens on to a room
            if enclosed and not has_door and len(comp) <= 60:
                no_go += [[b, a] for (a, b) in comp]
    if no_go:
        print("no-go: %d tiles (service rooms and doorless cavities)" % len(no_go))

    out = {"level": name, "elevation_m": z0, "tile_m": TILE, "origin": [x0, y0], "cols": cols, "rows": rows,
           "legend": {"floor": "0 void, 1 slab, n>=2 room index", "struct": "0 open, 1 wall, 2 glass, 3 column, 4 door, 5 stair",
                      "dir": "1 east-west, 2 north-south"},
           "floor": floor, "struct": struct_, "dir": ddir, "src": src, "rooms": rooms, "doors": doors, "stairs": stairs,
           "walls_added": walls_added, "no_go": no_go, "furniture": furniture}
    fname = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    with open(os.path.join(OUT, fname + ".json"), "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    # debug PNG, 4 px per tile
    S = 4
    img = []
    furn_tiles = set()
    inferred_tiles = set()
    for fm in furniture:
        for r in range(max(0, fm["r0"]), min(rows, fm["r1"] + 1)):
            for c in range(max(0, fm["c0"]), min(cols, fm["c1"] + 1)):
                (inferred_tiles if fm.get("inferred") else furn_tiles).add((c, r))
    for r in range(rows):
        row = []
        for c in range(cols):
            s = struct_[r][c]
            if s == 1: col3 = PAL["wall"]
            elif s == 2: col3 = PAL["glass"]
            elif s == 3: col3 = PAL["column"]
            elif s == 4: col3 = PAL["door"]
            elif s == 5: col3 = PAL["stair"]
            elif (c, r) in inferred_tiles: col3 = (240, 190, 90)
            elif (c, r) in furn_tiles: col3 = PAL["furn"]
            elif floor[r][c] >= 2:
                fcol = PAL["floor"]; col3 = (fcol[0] + (floor[r][c] * 13) % 40, fcol[1] + (floor[r][c] * 29) % 40, fcol[2] + (floor[r][c] * 7) % 40)
            elif floor[r][c] == 1: col3 = (80, 78, 74)
            else: col3 = PAL[0]
            row += list(col3) * S
        for _ in range(S):
            img.append(row)
    write_png(os.path.join(OUT, fname + ".png"), cols * S, rows * S, img)

    counts = Counter(v for row in struct_ for v in row)
    summary.append((name, cols, rows, counts[1], counts[2], counts[3], counts[4], counts[5], len(rooms), len(doors), len(furniture), dict(kinds)))

print("%-10s %5s %5s %6s %6s %6s %6s %6s %6s %6s %6s" % ("level", "cols", "rows", "wall", "glass", "column", "door", "stair", "rooms", "doors", "furn"))
for s in summary:
    print("%-10s %5d %5d %6d %6d %6d %6d %6d %6d %6d %6d  %s" % s)
print("Written to", OUT)
