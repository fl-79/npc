# -*- coding: utf-8 -*-
"""Export Model: writes the open model's facts (levels, grids, walls, doors, windows,
rooms, columns, curtain walls, floors, stairs, railings, furniture, casework, other
model elements, model lines) to exports/model.json, and every exported element's
triangulated geometry to exports/meshes.json. Metres, origin at the Project Base
Point, Project North = +Y, up = +Z. Element ids are Revit element ids."""
__title__ = "Export\nModel"


import json
import math
import os
import time
import traceback
from pyrevit import revit, DB, script
from Autodesk.Revit.DB import Architecture as ARCH

doc = revit.doc
out = script.get_output()
FT = 0.3048
FT2 = 0.09290304
OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
T0 = time.time()

# ---------------------------------------------------------------- origin
pbp = DB.BasePoint.GetProjectBasePoint(doc)
origin = pbp.Position if pbp is not None else DB.XYZ.Zero
OX, OY, OZ = origin.X, origin.Y, origin.Z
sbp = DB.BasePoint.GetSurveyPoint(doc)
proj_pos = doc.ActiveProjectLocation.GetProjectPosition(DB.XYZ.Zero)

BIC = DB.BuiltInCategory
BIP = DB.BuiltInParameter


# ---------------------------------------------------------------- helpers
def eid(e):
    return int(e.Id.Value)


def idv(elem_id):
    if elem_id is None:
        return None
    v = int(elem_id.Value)
    return v if v > 0 else None


def P(xyz):
    return [round((xyz.X - OX) * FT, 3), round((xyz.Y - OY) * FT, 3), round((xyz.Z - OZ) * FT, 3)]


def V(xyz):
    return [round(xyz.X, 4), round(xyz.Y, 4), round(xyz.Z, 4)]


def L(ft):
    return None if ft is None else round(ft * FT, 3)


def pts(curve):
    try:
        return [P(p) for p in curve.Tessellate()]
    except Exception:
        return [P(curve.GetEndPoint(0)), P(curve.GetEndPoint(1))]


def loop_pts(curve_loop):
    res = []
    for c in curve_loop:
        cp = pts(c)
        if res and cp and res[-1] == cp[0]:
            cp = cp[1:]
        res.extend(cp)
    if len(res) > 1 and res[0] == res[-1]:
        res.pop()
    return res


def param(el, bip):
    try:
        p = el.get_Parameter(bip)
    except Exception:
        return None
    if p is None or not p.HasValue:
        return None
    st = p.StorageType
    if st == DB.StorageType.Double:
        return p.AsDouble()
    if st == DB.StorageType.Integer:
        return p.AsInteger()
    if st == DB.StorageType.String:
        return p.AsString()
    if st == DB.StorageType.ElementId:
        return idv(p.AsElementId())
    return None


def param_len(el, bip):
    v = param(el, bip)
    return L(v) if isinstance(v, float) else None


def param_name(el, bip):
    """Name of the element an ElementId parameter points at, or the parameter's string."""
    try:
        p = el.get_Parameter(bip)
    except Exception:
        return None
    if p is None or not p.HasValue:
        return None
    if p.StorageType == DB.StorageType.ElementId:
        return level_name_of_id(p.AsElementId())
    if p.StorageType == DB.StorageType.String:
        return p.AsString()
    return None


def safe_name(el):
    """Element name; some types (panels, mullions, column types) hide Element.Name from
    IronPython, so fall back to the base property through reflection."""
    if el is None:
        return None
    try:
        n = el.Name
        if n:
            return n
    except Exception:
        pass
    try:
        return DB.Element.Name.GetValue(el)
    except Exception:
        return None


def type_of(el):
    try:
        t = doc.GetElement(el.GetTypeId())
    except Exception:
        return None
    return t


def type_name(el):
    t = type_of(el)
    return safe_name(t) if t is not None else None


def family_name(el):
    try:
        if isinstance(el, DB.FamilyInstance):
            return el.Symbol.Family.Name
    except Exception:
        pass
    t = type_of(el)
    try:
        return t.FamilyName if t is not None else None
    except Exception:
        return None


def cat_name(el):
    try:
        return el.Category.Name if el.Category is not None else None
    except Exception:
        return None


def level_name_of_id(lid):
    """Name of the element with this ElementId (levels, phases), or None."""
    if lid is None or idv(lid) is None:
        return None
    try:
        lv = doc.GetElement(lid)
    except Exception:
        return None
    return safe_name(lv) if lv is not None else None


def bbox(el):
    try:
        bb = el.get_BoundingBox(None)
    except Exception:
        return None
    if bb is None:
        return None
    return [P(bb.Min), P(bb.Max)]


levels_sorted = []


def level_by_z(z_m):
    best = None
    for lv in levels_sorted:
        if lv["elevation_m"] <= z_m + 0.3:
            best = lv["name"]
    return best if best is not None else (levels_sorted[0]["name"] if levels_sorted else None)


def level_of(el, bb=None):
    name = None
    for bip in (BIP.FAMILY_LEVEL_PARAM, BIP.WALL_BASE_CONSTRAINT, BIP.LEVEL_PARAM,
                BIP.STAIRS_BASE_LEVEL_PARAM, BIP.INSTANCE_SCHEDULE_ONLY_LEVEL_PARAM,
                BIP.INSTANCE_REFERENCE_LEVEL_PARAM, BIP.SCHEDULE_LEVEL_PARAM):
        name = param_name(el, bip)
        if name:
            return name, "param"
    try:
        name = level_name_of_id(el.LevelId)
        if name:
            return name, "LevelId"
    except Exception:
        pass
    if bb is None:
        bb = bbox(el)
    if bb is not None:
        return level_by_z(bb[0][2]), "bbox"
    return None, "none"


def phase_names(el):
    try:
        c = level_name_of_id(el.CreatedPhaseId)
    except Exception:
        c = None
    try:
        d = level_name_of_id(el.DemolishedPhaseId)
    except Exception:
        d = None
    return c, d


def in_secondary_option(el):
    try:
        do = el.DesignOption
    except Exception:
        return False
    return do is not None and not do.IsPrimary


def common(el, bb=None):
    lvl, how = level_of(el, bb)
    c, d = phase_names(el)
    rec = {
        "id": eid(el),
        "category": cat_name(el),
        "family": family_name(el),
        "type": type_name(el),
        "level": lvl,
        "level_source": how,
        "bbox": bb if bb is not None else bbox(el),
    }
    if d:
        rec["phase_demolished"] = d
    if c:
        rec["phase_created"] = c
    try:
        if el.GroupId is not None and idv(el.GroupId):
            rec["group"] = idv(el.GroupId)
    except Exception:
        pass
    return rec


# ---------------------------------------------------------------- meshes
geo_opts = DB.Options()
geo_opts.DetailLevel = DB.ViewDetailLevel.Medium
geo_opts.IncludeNonVisibleObjects = False
geo_opts.ComputeReferences = False

mesh_parts = []
mesh_stats = {"elements": 0, "triangles": 0, "no_geometry": []}


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
        elif isinstance(g, DB.Mesh):
            acc.append(g)


def fmt(v):
    s = "%.3f" % v
    s = s.rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


geo_opts_fine = DB.Options()
geo_opts_fine.DetailLevel = DB.ViewDetailLevel.Fine
geo_opts_fine.IncludeNonVisibleObjects = False
geo_opts_fine.ComputeReferences = False


def element_mesh(el):
    """Returns (vertex_list_flat_m, tri_index_list) in export coordinates, or None.
    Tries Medium detail first and Fine when Medium yields no solids (railings)."""
    acc = []
    for o in (geo_opts, geo_opts_fine):
        try:
            geom = el.get_Geometry(o)
        except Exception:
            return None
        gather(geom, acc)
        if acc:
            break
    verts = []
    tris = []
    base = 0
    for g in acc:
        meshes = []
        if isinstance(g, DB.Solid):
            for f in g.Faces:
                try:
                    m = f.Triangulate(0.3)
                except Exception:
                    m = None
                if m is not None and m.NumTriangles > 0:
                    meshes.append(m)
        else:
            meshes.append(g)
        for m in meshes:
            n = m.Vertices.Count
            for k in range(n):
                v = m.Vertices[k]
                verts.append((v.X - OX) * FT)
                verts.append((v.Y - OY) * FT)
                verts.append((v.Z - OZ) * FT)
            for t in range(m.NumTriangles):
                tri = m.get_Triangle(t)
                tris.append(base + int(tri.get_Index(0)))
                tris.append(base + int(tri.get_Index(1)))
                tris.append(base + int(tri.get_Index(2)))
            base += n
    if not tris:
        return None
    return verts, tris


def add_mesh(el, kind, level):
    r = element_mesh(el)
    if r is None:
        mesh_stats["no_geometry"].append(eid(el))
        return False
    verts, tris = r
    mesh_stats["elements"] += 1
    mesh_stats["triangles"] += len(tris) // 3
    mesh_parts.append('{"id":%d,"kind":"%s","level":%s,"v":[%s],"i":[%s]}' % (
        eid(el), kind, json.dumps(level), ",".join(fmt(v) for v in verts), ",".join(str(i) for i in tris)))
    return True


# ---------------------------------------------------------------- collectors
def collect(bic):
    return list(DB.FilteredElementCollector(doc).OfCategory(bic).WhereElementIsNotElementType())


def model_elements(bic):
    res = []
    for el in collect(bic):
        try:
            if el.ViewSpecific:
                continue
        except Exception:
            pass
        res.append(el)
    return res


skipped = {"design_option": []}


def keep(el):
    if in_secondary_option(el):
        skipped["design_option"].append(eid(el))
        return False
    return True


data = {"meta": {}, "levels": [], "grids": [], "walls": [], "doors": [], "windows": [], "rooms": [],
        "columns": [], "curtain_walls": [], "floors": [], "stairs": [], "railings": [],
        "furniture": [], "other": [], "openings": [], "linework": [], "links": []}

# levels
# Level.ProjectElevation is relative to the internal origin (same frame as all geometry);
# Level.Elevation follows the level type's Elevation Base (Project Base Point or Survey Point).
for lv in DB.FilteredElementCollector(doc).OfClass(DB.Level):
    data["levels"].append({"id": eid(lv), "name": lv.Name, "elevation_m": round((lv.ProjectElevation - OZ) * FT, 3),
                           "elevation_internal_m": round(lv.ProjectElevation * FT, 3),
                           "elevation_revit_m": round(lv.Elevation * FT, 3)})
data["levels"].sort(key=lambda l: l["elevation_m"])
levels_sorted = data["levels"]

# grids
for g in DB.FilteredElementCollector(doc).OfClass(DB.Grid):
    try:
        c = g.Curve
        data["grids"].append({"id": eid(g), "name": g.Name, "line": pts(c)})
    except Exception:
        pass

# links
for li in DB.FilteredElementCollector(doc).OfClass(DB.RevitLinkInstance):
    data["links"].append({"id": eid(li), "name": safe_name(li)})

out.print_md("Export started: %d levels, %d grids, %d links" % (len(data["levels"]), len(data["grids"]), len(data["links"])))

# ---------------------------------------------------------------- walls
wall_curves = {}
for w in model_elements(BIC.OST_Walls):
    if not keep(w):
        continue
    bb = bbox(w)
    rec = common(w, bb)
    wt = w.WallType
    try:
        rec["is_curtain"] = wt.Kind == DB.WallKind.Curtain
    except Exception:
        rec["is_curtain"] = False
    try:
        rec["function"] = str(wt.Function)
    except Exception:
        rec["function"] = None
    rec["is_exterior"] = rec["function"] == "Exterior"
    try:
        rec["width_m"] = L(wt.Width)
    except Exception:
        rec["width_m"] = None
    loc = w.Location
    if isinstance(loc, DB.LocationCurve):
        c = loc.Curve
        wall_curves[eid(w)] = c
        rec["start"] = P(c.GetEndPoint(0))
        rec["end"] = P(c.GetEndPoint(1))
        rec["length_m"] = L(c.Length)
        if not isinstance(c, DB.Line):
            rec["curve"] = pts(c)
            rec["curve_type"] = c.GetType().Name
    else:
        rec["start"] = rec["end"] = None
        rec["no_location_curve"] = True
    rec["height_m"] = param_len(w, BIP.WALL_USER_HEIGHT_PARAM)
    rec["base_offset_m"] = param_len(w, BIP.WALL_BASE_OFFSET)
    rec["top_offset_m"] = param_len(w, BIP.WALL_TOP_OFFSET)
    rec["top_constraint"] = param_name(w, BIP.WALL_HEIGHT_TYPE)
    rec["base_constraint"] = param_name(w, BIP.WALL_BASE_CONSTRAINT)
    try:
        rec["flipped"] = w.Flipped
        o = w.Orientation
        rec["exterior_normal"] = V(o)
    except Exception:
        pass
    try:
        rec["structural"] = param(w, BIP.WALL_STRUCTURAL_SIGNIFICANT) == 1
    except Exception:
        pass
    try:
        rec["room_bounding"] = param(w, BIP.WALL_ATTR_ROOM_BOUNDING) == 1
    except Exception:
        pass
    if rec["is_curtain"]:
        cw = {"id": eid(w), "mullions": [], "panels": []}
        try:
            grid = w.CurtainGrid
            for mid in grid.GetMullionIds():
                m = doc.GetElement(mid)
                mrec = {"id": eid(m), "type": type_name(m)}
                try:
                    mc = m.LocationCurve
                    mrec["line"] = pts(mc)
                except Exception:
                    pass
                cw["mullions"].append(mrec)
            for pid in grid.GetPanelIds():
                pnl = doc.GetElement(pid)
                prec = {"id": eid(pnl), "type": type_name(pnl), "family": family_name(pnl),
                        "category": cat_name(pnl), "bbox": bbox(pnl)}
                cw["panels"].append(prec)
        except Exception:
            cw["error"] = traceback.format_exc().splitlines()[-1]
        data["curtain_walls"].append(cw)
    add_mesh(w, "wall", rec["level"])
    data["walls"].append(rec)

out.print_md("walls: %d (%d curtain)" % (len(data["walls"]), len(data["curtain_walls"])))

# curtain panels and mullions as elements (their own meshes)
for bic, kind in ((BIC.OST_CurtainWallMullions, "mullion"), (BIC.OST_CurtainWallPanels, "panel")):
    for el in model_elements(bic):
        if not keep(el):
            continue
        host = None
        try:
            if el.Host is not None:
                host = eid(el.Host)
        except Exception:
            pass
        lvl = level_of(el)[0]
        if host is None:
            # a panel or mullion not attached to a curtain wall (curtain system, sloped glazing)
            rec = common(el)
            rec["kind"] = kind
            rec["host"] = None
            data["other"].append(rec)
        add_mesh(el, kind, lvl)


# ---------------------------------------------------------------- doors and windows
def opening(el, kind):
    bb = bbox(el)
    rec = common(el, bb)
    rec["kind"] = kind
    host = None
    try:
        if el.Host is not None:
            host = eid(el.Host)
            rec["host_category"] = cat_name(el.Host)
    except Exception:
        pass
    rec["host"] = host
    loc = el.Location
    if isinstance(loc, DB.LocationPoint):
        rec["point"] = P(loc.Point)
        pt = loc.Point
    else:
        rec["point"] = None
        pt = None
    try:
        rec["facing"] = V(el.FacingOrientation)
        rec["hand"] = V(el.HandOrientation)
        rec["facing_flipped"] = el.FacingFlipped
        rec["hand_flipped"] = el.HandFlipped
        rec["mirrored"] = el.Mirrored
    except Exception:
        pass
    t = type_of(el)
    wbip = BIP.DOOR_WIDTH if kind == "door" else BIP.WINDOW_WIDTH
    hbip = BIP.DOOR_HEIGHT if kind == "door" else BIP.WINDOW_HEIGHT
    w = param_len(el, wbip)
    if w is None and t is not None:
        w = param_len(t, wbip)
    if w is None and t is not None:
        w = param_len(t, BIP.FAMILY_WIDTH_PARAM)
    h = param_len(el, hbip)
    if h is None and t is not None:
        h = param_len(t, hbip)
    if h is None and t is not None:
        h = param_len(t, BIP.FAMILY_HEIGHT_PARAM)
    rec["width_m"] = w
    rec["height_m"] = h
    rec["sill_m"] = param_len(el, BIP.INSTANCE_SILL_HEIGHT_PARAM)
    rec["head_m"] = param_len(el, BIP.INSTANCE_HEAD_HEIGHT_PARAM)
    if host in wall_curves and pt is not None:
        c = wall_curves[host]
        try:
            ir = c.Project(pt)
            rec["offset_along_host_m"] = L(c.ComputeNormalizedParameter(ir.Parameter) * c.Length) if c.IsBound else None
        except Exception:
            rec["offset_along_host_m"] = None
    try:
        if el.SuperComponent is not None:
            rec["parent"] = eid(el.SuperComponent)
    except Exception:
        pass
    add_mesh(el, kind, rec["level"])
    return rec


for el in model_elements(BIC.OST_Doors):
    if keep(el) and isinstance(el, DB.FamilyInstance):
        data["doors"].append(opening(el, "door"))
for el in model_elements(BIC.OST_Windows):
    if keep(el) and isinstance(el, DB.FamilyInstance):
        data["windows"].append(opening(el, "window"))
out.print_md("doors: %d, windows: %d" % (len(data["doors"]), len(data["windows"])))

# ---------------------------------------------------------------- rooms
sopts = DB.SpatialElementBoundaryOptions()
sopts.SpatialElementBoundaryLocation = DB.SpatialElementBoundaryLocation.Finish
for r in collect(BIC.OST_Rooms):
    if not keep(r):
        continue
    placed = r.Location is not None
    area = round(r.Area * FT2, 3)
    rec = {"id": eid(r), "number": r.Number, "name": param(r, BIP.ROOM_NAME),
           "level": r.Level.Name if r.Level else None, "area_m2": area,
           "department": param(r, BIP.ROOM_DEPARTMENT), "loops": [], "boundary_elements": []}
    try:
        rec["phase"] = level_name_of_id(r.get_Parameter(BIP.ROOM_PHASE).AsElementId())
    except Exception:
        pass
    if placed:
        rec["point"] = P(r.Location.Point)
    rec["height_m"] = L(r.UnboundedHeight) if placed else None
    rec["base_offset_m"] = param_len(r, BIP.ROOM_LOWER_OFFSET)
    rec["limit_offset_m"] = param_len(r, BIP.ROOM_UPPER_OFFSET)
    rec["upper_limit"] = param_name(r, BIP.ROOM_UPPER_LEVEL)
    loops = None
    if placed:
        try:
            loops = r.GetBoundarySegments(sopts)
        except Exception:
            loops = None
    if not placed:
        status = "not placed"
    elif area <= 0:
        status = "redundant" if loops and loops.Count > 0 else "not enclosed"
    else:
        status = "ok"
    rec["status"] = status
    if loops is not None:
        for loop in loops:
            ring = []
            belems = []
            for seg in loop:
                c = seg.GetCurve()
                cp = pts(c)
                if ring and cp and ring[-1] == cp[0]:
                    cp = cp[1:]
                ring.extend(cp)
                belems.append(idv(seg.ElementId))
            if len(ring) > 1 and ring[0] == ring[-1]:
                ring.pop()
            rec["loops"].append([[p[0], p[1]] for p in ring])
            rec["boundary_elements"].append(belems)
    rec["bbox"] = bbox(r)
    data["rooms"].append(rec)
data["rooms"].sort(key=lambda x: ((x["level"] or ""), (x["number"] or "")))
out.print_md("rooms: %d" % len(data["rooms"]))

# ---------------------------------------------------------------- columns
for bic, structural in ((BIC.OST_Columns, False), (BIC.OST_StructuralColumns, True)):
    for el in model_elements(bic):
        if not keep(el):
            continue
        bb = bbox(el)
        rec = common(el, bb)
        rec["structural"] = structural
        loc = el.Location
        if isinstance(loc, DB.LocationPoint):
            rec["point"] = P(loc.Point)
            try:
                rec["rotation_rad"] = round(loc.Rotation, 4)
            except Exception:
                pass
        elif isinstance(loc, DB.LocationCurve):
            rec["line"] = pts(loc.Curve)
            rec["slanted"] = True
        rec["base_level"] = param_name(el, BIP.FAMILY_BASE_LEVEL_PARAM)
        rec["top_level"] = param_name(el, BIP.FAMILY_TOP_LEVEL_PARAM)
        rec["base_offset_m"] = param_len(el, BIP.FAMILY_BASE_LEVEL_OFFSET_PARAM)
        rec["top_offset_m"] = param_len(el, BIP.FAMILY_TOP_LEVEL_OFFSET_PARAM)
        if rec.get("base_level"):
            rec["level"] = rec["base_level"]
        t = type_of(el)
        if t is not None:
            rec["width_m"] = param_len(t, BIP.FAMILY_WIDTH_PARAM)
        add_mesh(el, "column", rec["level"])
        data["columns"].append(rec)
out.print_md("columns: %d" % len(data["columns"]))


# ---------------------------------------------------------------- floors
def top_face_loops(el):
    try:
        geom = el.get_Geometry(geo_opts)
    except Exception:
        return []
    acc = []
    gather(geom, acc)
    res = []
    zmax = None
    for s in acc:
        if not isinstance(s, DB.Solid):
            continue
        for f in s.Faces:
            if not isinstance(f, DB.PlanarFace):
                continue
            if f.FaceNormal.Z < 0.9:
                continue
            z = f.Origin.Z
            if zmax is None or z > zmax + 0.01:
                zmax = z
                res = []
            if abs(z - zmax) <= 0.01:
                for cl in f.GetEdgesAsCurveLoops():
                    res.append([[p[0], p[1]] for p in loop_pts(cl)])
    return res


for el in model_elements(BIC.OST_Floors):
    if not keep(el):
        continue
    bb = bbox(el)
    rec = common(el, bb)
    rec["thickness_m"] = param_len(el, BIP.FLOOR_ATTR_THICKNESS_PARAM)
    rec["height_offset_m"] = param_len(el, BIP.FLOOR_HEIGHTABOVELEVEL_PARAM)
    rec["structural"] = param(el, BIP.FLOOR_PARAM_IS_STRUCTURAL) == 1
    rec["loops"] = top_face_loops(el)
    add_mesh(el, "floor", rec["level"])
    data["floors"].append(rec)
out.print_md("floors: %d" % len(data["floors"]))

# ---------------------------------------------------------------- stairs and railings
stair_ids = set()
for st in DB.FilteredElementCollector(doc).OfClass(ARCH.Stairs):
    if not keep(st):
        continue
    stair_ids.add(eid(st))
    bb = bbox(st)
    rec = common(st, bb)
    rec["base_level"] = param_name(st, BIP.STAIRS_BASE_LEVEL_PARAM)
    rec["top_level"] = param_name(st, BIP.STAIRS_TOP_LEVEL_PARAM)
    rec["base_offset_m"] = param_len(st, BIP.STAIRS_BASE_OFFSET)
    rec["top_offset_m"] = param_len(st, BIP.STAIRS_TOP_OFFSET)
    rec["level"] = rec["base_level"] or rec["level"]
    try:
        rec["multistory"] = idv(st.MultistoryStairsId)
    except Exception:
        pass
    rec["runs"] = []
    rec["landings"] = []
    try:
        for rid in st.GetStairsRuns():
            run = doc.GetElement(rid)
            # BaseElevation and TopElevation are relative to the stair's base level
            rr = {"id": eid(run), "width_m": L(run.ActualRunWidth), "risers": run.ActualRisersNumber,
                  "base_rel_m": L(run.BaseElevation), "top_rel_m": L(run.TopElevation), "bbox": bbox(run)}
            try:
                rr["path"] = loop_pts(run.GetStairsPath())
            except Exception:
                pass
            try:
                rr["footprint"] = [[p[0], p[1]] for p in loop_pts(run.GetFootprintBoundary())]
            except Exception:
                pass
            rec["runs"].append(rr)
        for lid in st.GetStairsLandings():
            ld = doc.GetElement(lid)
            lr = {"id": eid(ld), "base_rel_m": L(ld.BaseElevation), "bbox": bbox(ld)}
            try:
                lr["footprint"] = [[p[0], p[1]] for p in loop_pts(ld.GetFootprintBoundary())]
            except Exception:
                pass
            rec["landings"].append(lr)
    except Exception:
        rec["error"] = traceback.format_exc().splitlines()[-1]
    add_mesh(st, "stair", rec["level"])
    data["stairs"].append(rec)
# legacy (sketch-based) stairs and anything else in the stairs category
for el in model_elements(BIC.OST_Stairs):
    if eid(el) in stair_ids or not keep(el):
        continue
    if isinstance(el, (ARCH.StairsRun, ARCH.StairsLanding)):
        continue
    rec = common(el)
    rec["kind"] = "stair_legacy"
    rec["class"] = el.GetType().Name
    add_mesh(el, "stair", rec["level"])
    data["stairs"].append(rec)
for rl in DB.FilteredElementCollector(doc).OfClass(ARCH.Railing):
    if not keep(rl):
        continue
    rec = common(rl)
    try:
        rec["path"] = [loop_pts(cl) for cl in rl.GetPath()]
    except Exception:
        rec["path"] = None
    try:
        rec["host"] = idv(rl.HostId)
    except Exception:
        pass
    add_mesh(rl, "railing", rec["level"])
    data["railings"].append(rec)
out.print_md("stairs: %d, railings: %d" % (len(data["stairs"]), len(data["railings"])))

# ---------------------------------------------------------------- furniture and other instances
FURN_CATS = [(BIC.OST_Furniture, "furniture"), (BIC.OST_FurnitureSystems, "furniture_system"),
             (BIC.OST_Casework, "casework"), (BIC.OST_PlumbingFixtures, "plumbing"),
             (BIC.OST_SpecialityEquipment, "equipment"), (BIC.OST_GenericModel, "generic"),
             (BIC.OST_Entourage, "entourage"), (BIC.OST_Planting, "planting"),
             (BIC.OST_MechanicalEquipment, "mechanical"), (BIC.OST_ElectricalFixtures, "electrical"),
             (BIC.OST_ElectricalEquipment, "electrical"), (BIC.OST_LightingFixtures, "lighting"),
             (BIC.OST_Parking, "parking"), (BIC.OST_Site, "site")]
seen = set()
for bic, kind in FURN_CATS:
    for el in model_elements(bic):
        if eid(el) in seen or not keep(el):
            continue
        seen.add(eid(el))
        bb = bbox(el)
        rec = common(el, bb)
        rec["kind"] = kind
        loc = el.Location
        if isinstance(loc, DB.LocationPoint):
            rec["point"] = P(loc.Point)
            try:
                rec["rotation_rad"] = round(loc.Rotation, 4)
            except Exception:
                pass
        elif isinstance(loc, DB.LocationCurve):
            rec["line"] = pts(loc.Curve)
        if isinstance(el, DB.FamilyInstance):
            try:
                rec["facing"] = V(el.FacingOrientation)
                rec["hand"] = V(el.HandOrientation)
                rec["mirrored"] = el.Mirrored
            except Exception:
                pass
            try:
                tf = el.GetTransform()
                rec["rotation_rad"] = round(math.atan2(tf.BasisX.Y, tf.BasisX.X), 4)
            except Exception:
                pass
            try:
                if el.Host is not None:
                    rec["host"] = eid(el.Host)
            except Exception:
                pass
            try:
                if el.SuperComponent is not None:
                    rec["parent"] = eid(el.SuperComponent)
            except Exception:
                pass
            try:
                rec["in_place"] = el.Symbol.Family.IsInPlace
            except Exception:
                pass
        else:
            rec["class"] = el.GetType().Name
        add_mesh(el, kind, rec["level"])
        data["furniture"].append(rec)
out.print_md("furniture and instances: %d" % len(data["furniture"]))

# ---------------------------------------------------------------- other building elements
OTHER_NAMES = [("OST_Roofs", "roof"), ("OST_Ceilings", "ceiling"), ("OST_StructuralFraming", "framing"),
               ("OST_StructuralFoundation", "foundation"), ("OST_Ramps", "ramp"),
               ("OST_Topography", "topography"), ("OST_Toposolid", "toposolid"),
               ("OST_Mass", "mass"), ("OST_Cornices", "sweep"), ("OST_EdgeSlab", "slab_edge"),
               ("OST_Fascia", "fascia"), ("OST_Gutter", "gutter"), ("OST_StructConnections", "connection"),
               ("OST_Rebar", "rebar"), ("OST_Conduit", "conduit"), ("OST_PipeCurves", "pipe"),
               ("OST_DuctCurves", "duct"), ("OST_CableTray", "cable_tray"), ("OST_Sprinklers", "sprinkler"),
               ("OST_StairsRailing", "railing_other"), ("OST_Assemblies", "assembly"),
               ("OST_ElevatorsAndLifts", "elevator")]
for bic_name, kind in OTHER_NAMES:
    if not hasattr(BIC, bic_name):
        continue
    try:
        els = model_elements(getattr(BIC, bic_name))
    except Exception:
        continue
    for el in els:
        if eid(el) in seen or not keep(el):
            continue
        if isinstance(el, ARCH.Railing) or eid(el) in stair_ids:
            continue
        seen.add(eid(el))
        rec = common(el)
        rec["kind"] = kind
        rec["class"] = el.GetType().Name
        add_mesh(el, kind, rec["level"])
        data["other"].append(rec)
out.print_md("other model elements: %d" % len(data["other"]))

# ---------------------------------------------------------------- openings (shafts) and model lines
for bic_name, kind in (("OST_ShaftOpening", "shaft"), ("OST_FloorOpening", "floor_opening"),
                       ("OST_RoofOpening", "roof_opening")):
    if not hasattr(BIC, bic_name):
        continue
    try:
        els = model_elements(getattr(BIC, bic_name))
    except Exception:
        continue
    for el in els:
        if not keep(el):
            continue
        rec = common(el)
        rec["kind"] = kind
        rec["class"] = el.GetType().Name
        data["openings"].append(rec)
for el in model_elements(BIC.OST_Lines):
    if not keep(el):
        continue
    try:
        c = el.GeometryCurve
    except Exception:
        continue
    bb = bbox(el)
    style = None
    try:
        style = safe_name(el.LineStyle)
    except Exception:
        pass
    data["linework"].append({"id": eid(el), "level": level_of(el, bb)[0], "style": style, "points": pts(c)})
out.print_md("openings: %d, model lines: %d" % (len(data["openings"]), len(data["linework"])))

# ---------------------------------------------------------------- meta and write
area_setting = None
try:
    avs = DB.AreaVolumeSettings.GetAreaVolumeSettings(doc)
    area_setting = str(avs.GetSpatialElementBoundaryLocation(DB.SpatialElementType.Room))
except Exception:
    pass
phases = []
try:
    for ph in doc.Phases:
        phases.append(ph.Name)
except Exception:
    pass
data["meta"] = {
    "model": doc.Title,
    "path": doc.PathName,
    "revit": doc.Application.VersionNumber + " build " + doc.Application.VersionBuild,
    "exported": time.strftime("%Y-%m-%d %H:%M:%S"),
    "units": "m",
    "origin": "Project Base Point",
    "north": "+Y is Project North",
    "project_base_point_internal_m": [round(OX * FT, 3), round(OY * FT, 3), round(OZ * FT, 3)],
    "survey_point_internal_m": [round(sbp.Position.X * FT, 3), round(sbp.Position.Y * FT, 3), round(sbp.Position.Z * FT, 3)] if sbp is not None else None,
    "true_north_angle_rad": round(proj_pos.Angle, 6),
    "room_area_boundary_location": area_setting,
    "phases": phases,
    "skipped_secondary_design_option_ids": skipped["design_option"],
    "geometry_detail": "Medium",
    "mesh_elements": mesh_stats["elements"],
    "mesh_triangles": mesh_stats["triangles"],
    "elements_without_geometry": mesh_stats["no_geometry"],
    "seconds": round(time.time() - T0, 1),
}
data["meta"]["counts"] = dict((k, len(v)) for k, v in data.items() if isinstance(v, list))

if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
with open(os.path.join(OUT_DIR, "model.json"), "w") as f:
    json.dump(data, f, indent=None, separators=(",", ":"))
with open(os.path.join(OUT_DIR, "meshes.json"), "w") as f:
    f.write('{"units":"m","elements":[')
    f.write(",".join(mesh_parts))
    f.write("]}")
with open(os.path.join(OUT_DIR, "export-done.txt"), "w") as f:
    f.write(json.dumps(data["meta"], indent=1))

out.print_md("**Done in %.0f s.** %s" % (time.time() - T0, json.dumps(data["meta"]["counts"])))
out.print_md("Meshes: %d elements, %d triangles, %d elements without geometry" % (
    mesh_stats["elements"], mesh_stats["triangles"], len(mesh_stats["no_geometry"])))
