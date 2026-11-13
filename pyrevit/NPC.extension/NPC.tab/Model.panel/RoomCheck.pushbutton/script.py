# -*- coding: utf-8 -*-
"""Room check: writes every room in the open model to exports/rooms.json
(level, number, name, area in m2, placement status) and lists the problems."""
__title__ = "Room\nCheck"
__author__ = "NPC tool"

import json
import os
from pyrevit import revit, DB, script

doc = revit.doc
out = script.get_output()
FT2_TO_M2 = 0.09290304
FT_TO_M = 0.3048
OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"


def param_str(el, bip):
    p = el.get_Parameter(bip)
    return p.AsString() if p and p.HasValue else None


levels = []
for lv in DB.FilteredElementCollector(doc).OfClass(DB.Level):
    levels.append({"id": int(lv.Id.Value), "name": lv.Name, "elevation_m": round(lv.Elevation * FT_TO_M, 3)})
levels.sort(key=lambda l: l["elevation_m"])

opts = DB.SpatialElementBoundaryOptions()
rooms = []
for r in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_Rooms).WhereElementIsNotElementType():
    placed = r.Location is not None
    area_m2 = round(r.Area * FT2_TO_M2, 2)
    if not placed:
        status = "not placed"
    elif area_m2 <= 0:
        loops = r.GetBoundarySegments(opts)
        status = "redundant" if loops and loops.Count > 0 else "not enclosed"
    else:
        status = "ok"
    rooms.append({
        "id": int(r.Id.Value),
        "level": r.Level.Name if r.Level else None,
        "number": r.Number,
        "name": param_str(r, DB.BuiltInParameter.ROOM_NAME),
        "area_m2": float(area_m2),
        "status": status,
        "department": param_str(r, DB.BuiltInParameter.ROOM_DEPARTMENT),
    })
rooms.sort(key=lambda x: ((x["level"] or ""), (x["number"] or "")))

if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
path = os.path.join(OUT_DIR, "rooms.json")
with open(path, "w") as f:
    json.dump({"model": doc.Title, "levels": levels, "rooms": rooms}, f, indent=1)

problems = [x for x in rooms if x["status"] != "ok" or not x["name"] or not x["number"]]
out.print_md("**{} rooms on {} levels, {} with a problem.** Written to `{}`".format(len(rooms), len(levels), len(problems), path))
for x in problems:
    out.print_md("- {} | {} | {} | {}".format(x["level"], x["number"], x["name"], x["status"]))
