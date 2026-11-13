# -*- coding: utf-8 -*-
"""Clash Check: finds pairs of model elements whose solids overlap (walls, columns,
floors, roofs, ceilings, framing, stairs, curtain panels and mullions, doors,
windows, furniture, casework, fixtures, equipment, generic models) and writes them
to exports/collisions.json with the overlap volume in m3. Pairs that are expected to
overlap (an opening and its host wall, a nested family and its parent, a panel or
mullion and its curtain wall, a railing and its stair) are left out."""
__title__ = "Clash\nCheck"


import json
import os
import time
import traceback
from pyrevit import revit, DB, script
from Autodesk.Revit.DB import Architecture as ARCH
from System.Collections.Generic import List

doc = revit.doc
out = script.get_output()
FT = 0.3048
FT3 = 0.028316846592
OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
TOUCH_M3 = 0.0005  # below this the pair only touches
T0 = time.time()

pbp = DB.BasePoint.GetProjectBasePoint(doc)
origin = pbp.Position if pbp is not None else DB.XYZ.Zero
OX, OY, OZ = origin.X, origin.Y, origin.Z
BIC = DB.BuiltInCategory

CATS = ["OST_Walls", "OST_Columns", "OST_StructuralColumns", "OST_Floors", "OST_Roofs", "OST_Ceilings",
        "OST_StructuralFraming", "OST_Stairs", "OST_StairsRailing", "OST_CurtainWallPanels",
        "OST_CurtainWallMullions", "OST_Doors", "OST_Windows", "OST_Furniture", "OST_FurnitureSystems",
        "OST_Casework", "OST_PlumbingFixtures", "OST_SpecialityEquipment", "OST_GenericModel",
        "OST_MechanicalEquipment", "OST_ElectricalFixtures", "OST_ElectricalEquipment", "OST_LightingFixtures",
        "OST_Ramps", "OST_Planting", "OST_Entourage"]


def eid(e):
    return int(e.Id.Value)


def P(xyz):
    return [round((xyz.X - OX) * FT, 3), round((xyz.Y - OY) * FT, 3), round((xyz.Z - OZ) * FT, 3)]


def cat_name(el):
    try:
        return el.Category.Name if el.Category is not None else None
    except Exception:
        return None


def safe_name(el):
    try:
        return el.Name
    except Exception:
        return None


def level_name(el):
    try:
        lid = el.LevelId
        if lid is not None and int(lid.Value) > 0:
            return doc.GetElement(lid).Name
    except Exception:
        pass
    for bip in (DB.BuiltInParameter.FAMILY_LEVEL_PARAM, DB.BuiltInParameter.WALL_BASE_CONSTRAINT,
                DB.BuiltInParameter.STAIRS_BASE_LEVEL_PARAM, DB.BuiltInParameter.LEVEL_PARAM):
        try:
            p = el.get_Parameter(bip)
            if p is not None and p.HasValue:
                e = doc.GetElement(p.AsElementId())
                if e is not None:
                    return e.Name
        except Exception:
            pass
    return None


def in_secondary_option(el):
    try:
        do = el.DesignOption
    except Exception:
        return False
    return do is not None and not do.IsPrimary


geo_opts = DB.Options()
geo_opts.DetailLevel = DB.ViewDetailLevel.Medium
geo_opts.IncludeNonVisibleObjects = False


def gather(geom, acc, depth=0):
    if geom is None or depth > 6:
        return
    for g in geom:
        if isinstance(g, DB.Solid):
            if g.Faces.Size > 0 and g.Volume > 1e-9:
                acc.append(g)
        elif isinstance(g, DB.GeometryInstance):
            try:
                gather(g.GetInstanceGeometry(), acc, depth + 1)
            except Exception:
                pass


solid_cache = {}


def solids_of(el):
    k = eid(el)
    if k in solid_cache:
        return solid_cache[k]
    acc = []
    try:
        gather(el.get_Geometry(geo_opts), acc)
    except Exception:
        pass
    solid_cache[k] = acc
    return acc


def solid_bbox(s):
    bb = s.GetBoundingBox()
    t = bb.Transform
    pts = [t.OfPoint(DB.XYZ(x, y, z)) for x in (bb.Min.X, bb.Max.X) for y in (bb.Min.Y, bb.Max.Y) for z in (bb.Min.Z, bb.Max.Z)]
    return (min(p.X for p in pts), min(p.Y for p in pts), min(p.Z for p in pts),
            max(p.X for p in pts), max(p.Y for p in pts), max(p.Z for p in pts))


def boxes_overlap(a, b, tol=0.001):
    return not (a[3] < b[0] - tol or b[3] < a[0] - tol or a[4] < b[1] - tol or b[4] < a[1] - tol or
                a[5] < b[2] - tol or b[5] < a[2] - tol)


def overlap_volume(ea, eb):
    """Sum of the intersection volumes of every solid pair, in m3, with the overlap bbox."""
    sa, sb = solids_of(ea), solids_of(eb)
    total = 0.0
    failed = 0
    box = None
    ba = [solid_bbox(s) for s in sa]
    bbx = [solid_bbox(s) for s in sb]
    for i, s1 in enumerate(sa):
        for j, s2 in enumerate(sb):
            if not boxes_overlap(ba[i], bbx[j]):
                continue
            try:
                inter = DB.BooleanOperationsUtils.ExecuteBooleanOperation(s1, s2, DB.BooleanOperationsType.Intersect)
                v = inter.Volume
                if v > 1e-9:
                    total += v
                    ob = solid_bbox(inter)
                    if box is None:
                        box = list(ob)
                    else:
                        box = [min(box[0], ob[0]), min(box[1], ob[1]), min(box[2], ob[2]),
                               max(box[3], ob[3]), max(box[4], ob[4]), max(box[5], ob[5])]
            except Exception:
                failed += 1
    if box is not None:
        box = [P(DB.XYZ(box[0], box[1], box[2])), P(DB.XYZ(box[3], box[4], box[5]))]
    return total * FT3, failed, box


def host_id(el):
    try:
        if isinstance(el, DB.FamilyInstance) and el.Host is not None:
            return eid(el.Host)
    except Exception:
        pass
    try:
        if isinstance(el, ARCH.Railing):
            return int(el.HostId.Value)
    except Exception:
        pass
    return None


def parent_id(el):
    try:
        if isinstance(el, DB.FamilyInstance) and el.SuperComponent is not None:
            return eid(el.SuperComponent)
    except Exception:
        pass
    return None


def expected(a, b):
    ia, ib = eid(a), eid(b)
    if host_id(a) == ib or host_id(b) == ia:
        return True
    if parent_id(a) == ib or parent_id(b) == ia:
        return True
    pa, pb = parent_id(a), parent_id(b)
    if pa is not None and pa == pb:
        return True  # siblings nested in the same family
    return False


# ---------------------------------------------------------------- collect
elems = []
for name in CATS:
    if not hasattr(BIC, name):
        continue
    for el in DB.FilteredElementCollector(doc).OfCategory(getattr(BIC, name)).WhereElementIsNotElementType():
        try:
            if el.ViewSpecific:
                continue
        except Exception:
            pass
        if in_secondary_option(el):
            continue
        if isinstance(el, (ARCH.StairsRun, ARCH.StairsLanding)):
            continue
        elems.append(el)
ids = List[DB.ElementId]([e.Id for e in elems])
by_id = dict((eid(e), e) for e in elems)
out.print_md("Clash check over %d elements" % len(elems))

pairs = {}
no_solid = 0
checked = 0
for n, a in enumerate(elems):
    if n % 250 == 0 and n:
        out.print_md("... %d of %d, %d pairs so far, %.0f s" % (n, len(elems), len(pairs), time.time() - T0))
    bb = a.get_BoundingBox(None)
    if bb is None:
        continue
    try:
        inter_filter = DB.ElementIntersectsElementFilter(a)
    except Exception:
        no_solid += 1
        continue
    bb_filter = DB.BoundingBoxIntersectsFilter(DB.Outline(bb.Min, bb.Max), 0.01)
    try:
        cands = DB.FilteredElementCollector(doc, ids).WherePasses(bb_filter).WherePasses(inter_filter).ToElements()
    except Exception:
        no_solid += 1
        continue
    checked += 1
    for b in cands:
        ia, ib = eid(a), eid(b)
        if ia == ib:
            continue
        key = (min(ia, ib), max(ia, ib))
        if key in pairs:
            continue
        if expected(a, b):
            continue
        pairs[key] = (a, b)

out.print_md("%d candidate pairs from %d elements with solids; measuring overlaps..." % (len(pairs), checked))

results = []
for key, (a, b) in pairs.items():
    try:
        vol, failed, box = overlap_volume(a, b)
    except Exception:
        vol, failed, box = None, 1, None
    rec = {
        "a": {"id": eid(a), "category": cat_name(a), "name": safe_name(a), "level": level_name(a)},
        "b": {"id": eid(b), "category": cat_name(b), "name": safe_name(b), "level": level_name(b)},
        "volume_m3": round(vol, 5) if vol is not None else None,
        "boolean_failures": failed,
        "box": box,
    }
    if vol is None:
        rec["kind"] = "intersects (volume unknown)"
    elif vol < TOUCH_M3:
        rec["kind"] = "touch"
    else:
        rec["kind"] = "overlap"
    results.append(rec)

results.sort(key=lambda r: -(r["volume_m3"] or 0))
summary = {"elements": len(elems), "with_solids": checked, "without_solids": no_solid,
           "pairs": len(results), "overlaps": len([r for r in results if r["kind"] == "overlap"]),
           "touches": len([r for r in results if r["kind"] == "touch"]),
           "unknown": len([r for r in results if r["kind"].startswith("intersects")]),
           "touch_threshold_m3": TOUCH_M3, "seconds": round(time.time() - T0, 1),
           "checked": time.strftime("%Y-%m-%d %H:%M:%S"), "model": doc.Title}

if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
with open(os.path.join(OUT_DIR, "collisions.json"), "w") as f:
    json.dump({"summary": summary, "pairs": results}, f, indent=1)
with open(os.path.join(OUT_DIR, "clash-done.txt"), "w") as f:
    f.write(json.dumps(summary, indent=1))

out.print_md("**Done in %.0f s.** %s" % (time.time() - T0, json.dumps(summary)))
for r in results[:40]:
    out.print_md("- %s | %s %s (%s) x %s %s (%s) | %s m3" % (
        r["kind"], r["a"]["category"], r["a"]["id"], r["a"]["level"],
        r["b"]["category"], r["b"]["id"], r["b"]["level"], r["volume_m3"]))
