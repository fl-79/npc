# -*- coding: utf-8 -*-
"""Slab Tops: walls (basic and curtain) and columns that run into a floor slab get their top
set to the slab's underside; elements that continue through a slab are joined to it so the
slab cuts them. One transaction, not saved. Every change is written to
exports/fix-tops.json with the old and new values so it can be reviewed or undone."""

import json
import os
import time
from pyrevit import revit, DB, script

doc = revit.doc
out = script.get_output()
FT = 0.3048
OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
TOL = 0.02 / FT      # 2 cm in feet
HOLE_MAX_M2 = 60.0   # loops smaller than this on a slab's top face are openings
BIC = DB.BuiltInCategory
BIP = DB.BuiltInParameter
T0 = time.time()
pbp = DB.BasePoint.GetProjectBasePoint(doc)
OZ = pbp.Position.Z if pbp is not None else 0.0   # report elevations relative to the base point


def Zm(z_ft):
    return round((z_ft - OZ) * FT, 3)


def eid(e):
    return int(e.Id.Value)


def idv(elem_id):
    if elem_id is None:
        return None
    v = int(elem_id.Value)
    return v if v > 0 else None


def level_elev(lid):
    """Internal elevation (feet) of a level id, or None."""
    if lid is None or idv(lid) is None:
        return None
    lv = doc.GetElement(lid)
    return lv.ProjectElevation if isinstance(lv, DB.Level) else None


def pdouble(el, bip):
    p = el.get_Parameter(bip)
    if p is None or not p.HasValue:
        return None
    return p.AsDouble()


def pid(el, bip):
    p = el.get_Parameter(bip)
    if p is None or not p.HasValue:
        return None
    return p.AsElementId()


def setp(el, bip, value):
    p = el.get_Parameter(bip)
    if p is None or p.IsReadOnly:
        return False
    return p.Set(value)


geo_opts = DB.Options()
geo_opts.DetailLevel = DB.ViewDetailLevel.Medium
geo_opts.IncludeNonVisibleObjects = False


def gather(geom, acc, depth=0):
    if geom is None or depth > 6:
        return
    for g in geom:
        if isinstance(g, DB.Solid):
            if g.Faces.Size > 0:
                acc.append(g)
        elif isinstance(g, DB.GeometryInstance):
            try:
                gather(g.GetInstanceGeometry(), acc, depth + 1)
            except Exception:
                pass


def ring_area(ring):
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def top_face_rings(el):
    """Rings (feet, internal xy) of the highest upward planar faces of the element."""
    acc = []
    try:
        gather(el.get_Geometry(geo_opts), acc)
    except Exception:
        return []
    rings = []
    zmax = None
    for s in acc:
        for f in s.Faces:
            if not isinstance(f, DB.PlanarFace) or f.FaceNormal.Z < 0.9:
                continue
            z = f.Origin.Z
            if zmax is None or z > zmax + 0.01:
                zmax = z
                rings = []
            if abs(z - zmax) <= 0.01:
                for cl in f.GetEdgesAsCurveLoops():
                    ring = []
                    for c in cl:
                        for p in c.Tessellate():
                            if not ring or (abs(ring[-1][0] - p.X) > 1e-6 or abs(ring[-1][1] - p.Y) > 1e-6):
                                ring.append((p.X, p.Y))
                    if len(ring) > 2:
                        rings.append(ring)
    return rings


class Slab(object):
    def __init__(self, floor):
        self.el = floor
        self.id = eid(floor)
        lvl = doc.GetElement(floor.LevelId)
        self.level = lvl.Name if lvl else None
        self.thickness = pdouble(floor, BIP.FLOOR_ATTR_THICKNESS_PARAM) or 0.0
        offset = pdouble(floor, BIP.FLOOR_HEIGHTABOVELEVEL_PARAM) or 0.0
        self.top = (lvl.ProjectElevation if lvl else 0.0) + offset
        self.underside = self.top - self.thickness
        rings = top_face_rings(floor)
        self.outers = [r for r in rings if ring_area(r) * FT * FT >= HOLE_MAX_M2]
        self.holes = [r for r in rings if ring_area(r) * FT * FT < HOLE_MAX_M2]

    def covers(self, x, y):
        if not any(point_in_ring(x, y, r) for r in self.outers):
            return False
        return not any(point_in_ring(x, y, r) for r in self.holes)


slabs = []
for fl in DB.FilteredElementCollector(doc).OfCategory(BIC.OST_Floors).WhereElementIsNotElementType():
    if fl.ViewSpecific:
        continue
    s = Slab(fl)
    if s.outers:
        slabs.append(s)
slabs.sort(key=lambda s: s.top)
out.print_md("Slabs: " + ", ".join("%s %d (top %.2f m, %.3f m thick, %d outer %d holes)" % (
    s.level, s.id, s.top * FT, s.thickness * FT, len(s.outers), len(s.holes)) for s in slabs))


def samples_for(el):
    loc = el.Location
    if isinstance(loc, DB.LocationCurve):
        c = loc.Curve
        return [c.Evaluate(t, True) for t in (0.25, 0.5, 0.75)]
    if isinstance(loc, DB.LocationPoint):
        return [loc.Point]
    return []


def wall_span(w):
    base = level_elev(pid(w, BIP.WALL_BASE_CONSTRAINT))
    if base is None:
        return None
    base += pdouble(w, BIP.WALL_BASE_OFFSET) or 0.0
    top_lid = pid(w, BIP.WALL_HEIGHT_TYPE)
    top_lvl = level_elev(top_lid)
    if top_lvl is not None:
        top = top_lvl + (pdouble(w, BIP.WALL_TOP_OFFSET) or 0.0)
        return base, top, top_lvl, True
    top = base + (pdouble(w, BIP.WALL_USER_HEIGHT_PARAM) or 0.0)
    return base, top, None, False


def column_span(c):
    base_lvl = level_elev(pid(c, BIP.FAMILY_BASE_LEVEL_PARAM))
    top_lvl = level_elev(pid(c, BIP.FAMILY_TOP_LEVEL_PARAM))
    if base_lvl is None or top_lvl is None:
        return None
    base = base_lvl + (pdouble(c, BIP.FAMILY_BASE_LEVEL_OFFSET_PARAM) or 0.0)
    top = top_lvl + (pdouble(c, BIP.FAMILY_TOP_LEVEL_OFFSET_PARAM) or 0.0)
    return base, top, top_lvl, True


targets = []
for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall):
    targets.append(("wall", w))
for bic in (BIC.OST_Columns, BIC.OST_StructuralColumns):
    for c in DB.FilteredElementCollector(doc).OfCategory(bic).WhereElementIsNotElementType():
        if isinstance(c, DB.FamilyInstance):
            targets.append(("column", c))

changes = []
skipped = []
plan = []  # (kind, el, slab, action, span)
for kind, el in targets:
    try:
        span = wall_span(el) if kind == "wall" else column_span(el)
    except Exception as e:
        skipped.append({"id": eid(el), "kind": kind, "why": "span failed: %s" % e})
        continue
    if span is None:
        skipped.append({"id": eid(el), "kind": kind, "why": "no level constraints (in-place or slanted)"})
        continue
    base, top, top_lvl, constrained = span
    pts = samples_for(el)
    if not pts:
        skipped.append({"id": eid(el), "kind": kind, "why": "no location"})
        continue
    for s in slabs:
        if not (base < s.underside - TOL and top > s.underside + TOL):
            continue
        if not any(s.covers(p.X, p.Y) for p in pts):
            continue
        ends_in_slab = top <= s.top + TOL
        plan.append((kind, el, s, "top_to_underside" if ends_in_slab else "join", span))
        if ends_in_slab:
            break  # the slab the element ends in decides its top; a through element joins every slab it crosses

out.print_md("%d elements to change (%d skipped)" % (len(plan), len(skipped)))

with revit.Transaction("NPC: wall and column tops to slab underside", swallow_errors=True):
    for kind, el, s, action, span in plan:
        base, top, top_lvl, constrained = span
        rec = {"id": eid(el), "kind": kind, "slab": s.id, "slab_level": s.level, "action": action,
               "old_top_m": Zm(top), "underside_m": Zm(s.underside)}
        try:
            if el.Pinned:
                rec["result"] = "skipped: pinned"
                changes.append(rec)
                continue
            if idv(el.GroupId):
                rec["result"] = "skipped: in group %d" % idv(el.GroupId)
                changes.append(rec)
                continue
            if action == "top_to_underside":
                if kind == "wall":
                    if constrained:
                        old = pdouble(el, BIP.WALL_TOP_OFFSET)
                        ok = setp(el, BIP.WALL_TOP_OFFSET, s.underside - top_lvl)
                        rec["param"] = "Top Offset"
                    else:
                        old = pdouble(el, BIP.WALL_USER_HEIGHT_PARAM)
                        ok = setp(el, BIP.WALL_USER_HEIGHT_PARAM, s.underside - base)
                        rec["param"] = "Unconnected Height"
                else:
                    old = pdouble(el, BIP.FAMILY_TOP_LEVEL_OFFSET_PARAM)
                    ok = setp(el, BIP.FAMILY_TOP_LEVEL_OFFSET_PARAM, s.underside - top_lvl)
                    rec["param"] = "Top Offset"
                rec["old_value_m"] = round(old * FT, 3) if old is not None else None
                rec["result"] = "set" if ok else "failed: parameter read-only"
            else:
                if kind == "wall" and el.WallType.Kind == DB.WallKind.Curtain:
                    rec["result"] = "skipped: curtain wall continues through the slab (cannot be joined)"
                else:
                    if not DB.JoinGeometryUtils.AreElementsJoined(doc, s.el, el):
                        DB.JoinGeometryUtils.JoinGeometry(doc, s.el, el)
                    if not DB.JoinGeometryUtils.IsCuttingElementInJoin(doc, s.el, el):
                        DB.JoinGeometryUtils.SwitchJoinOrder(doc, s.el, el)
                    rec["result"] = "joined, slab cuts element"
        except Exception as e:
            rec["result"] = "failed: %s" % str(e).splitlines()[0][:160]
        changes.append(rec)

summary = {
    "model": doc.Title, "when": time.strftime("%Y-%m-%d %H:%M:%S"), "seconds": round(time.time() - T0, 1),
    "slabs": [{"id": s.id, "level": s.level, "top_m": Zm(s.top), "underside_m": Zm(s.underside)} for s in slabs],
    "planned": len(plan), "set": len([c for c in changes if c["result"] == "set"]),
    "joined": len([c for c in changes if c["result"].startswith("joined")]),
    "skipped_or_failed": len([c for c in changes if not (c["result"] == "set" or c["result"].startswith("joined"))]),
    "not_considered": skipped, "saved": False,
}
if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
with open(os.path.join(OUT_DIR, "fix-tops.json"), "w") as f:
    json.dump({"summary": summary, "changes": changes}, f, indent=1)
with open(os.path.join(OUT_DIR, "fixtops-done.txt"), "w") as f:
    f.write(json.dumps(summary, indent=1))
out.print_md("**Done in %.0f s:** %d set, %d joined, %d skipped or failed. The model is changed but not saved (Ctrl+Z undoes it)." % (
    time.time() - T0, summary["set"], summary["joined"], summary["skipped_or_failed"]))
for c in changes:
    if not (c["result"] == "set" or c["result"].startswith("joined")):
        out.print_md("- %s %d: %s" % (c["kind"], c["id"], c["result"]))
