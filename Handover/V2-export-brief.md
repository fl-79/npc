# Brief for the V2 export chat: the whole Lasserre model out of Revit

Hand this to the new Claude Code chat together with `V1-graphics-and-plan-geometry.md`.

## Goal

One JSON file per building (or one per level, same schema) written from inside Revit 2027 by a
pyRevit or Dynamo Python script, carrying the model's facts, so that the V2 tool reads a model
and never interprets a drawing. Units: metres. Origin: Project Base Point, Project North up.
Stable Revit element ids on everything.

## Environment on this machine (checked 2026-11-03)

- Revit 2027.1 (Education), running on .NET 10, with Dynamo for Revit (PythonNet3 engine) and
  the IFC exporter.
- pyRevit 7.0.0.26278, per-user install, working: it loads at Revit start and adds its tabs.
  It took a clean uninstall and an install the user ran by double-click; an install launched
  from Claude Code's shell either left Revit unable to find the loader or crashed at setup start.
  Do not reinstall pyRevit from the shell.
- The project extension is registered in `%APPDATA%\pyRevit\pyRevit_config.ini` under `[core]`
  as `userextensions`, pointing at `V1-Test\pyrevit`. It holds `NPC.extension`, which adds an
  NPC tab with a Model panel. New buttons go in that panel as `<Name>.pushbutton\script.py`;
  pyRevit > Reload picks up new buttons (it shows no message), edits to an existing script need
  no reload.
- Scripts run in pyRevit's default engine, IronPython 2.7: Python 2 syntax and libraries, no
  f-strings, keep files ASCII. A script can opt into CPython 3 with `#! python3` on its first
  line if a library needs it.
- Revit 2027 API gotchas already hit: `ElementId.IntegerValue` is gone, use `ElementId.Value`
  (a 64-bit integer); IronPython's `json` cannot serialise that type, so wrap ids in `int()`.
  Revit internal units are feet; convert lengths by 0.3048 and areas by 0.09290304.
- Python 3.14 (miniconda) with shapely, numpy and ifcopenshell (the IFC fallback), for the
  reader side outside Revit.

## Status of the model (2026-11-03)

- The user has named the rooms. The room check (`NPC` tab > Room Check) writes
  `V1-Test\exports\rooms.json` with every room's level, number, name, area and placement status,
  and lists problems in pyRevit's output window. Its first two runs failed on the two gotchas
  above; the fixed script has not yet produced a complete file, so the room labels are unchecked.
  Run it first and resolve any not placed, not enclosed or redundant rooms before the full export.

## What the export must contain

Per level (`levels[]`: name, elevation, id), and for every element its `level`:

- `walls`: id, type, centreline start and end, width, height (unconnected or to level), is
  curtain wall, is exterior, function (interior, exterior, core shaft).
- `doors`, `windows`: id, family, type, host wall id, location point, width, height, sill
  height, facing and hand orientation, offset along the host from its start.
- `rooms`: id, name, number, level, area, boundary loops (outer and holes) from the room
  boundary segments, department or a custom zone parameter if used.
- `columns` (architectural and structural): id, location point, width, depth, rotation.
- `curtain_walls`: the wall's line plus each mullion's line and each panel's extent and type.
- `floors`: id, level, outline loops (for slab edges, voids and openings in the slab).
- `stairs`: id, base and top level, runs (path line, width, direction), landings (outline);
  `elevators` as the shaft rooms or the family instances, with the levels they serve.
- `furniture` and `casework`: id, family, type, location point, rotation, facing, bounding box
  (plan), host id if hosted. Family names verbatim; the V1 kind table (desk, chair, pinup,
  computers, table, seating, printer, bin, counter) works on those names.
- `linework` per level: stairs, floor edge, railings as polylines, for drawing only.

## Checks before export (in Revit)

- Room schedule with Area: no `Not Placed`, no `Not Enclosed`, no `Redundant` rooms on the
  exported levels. Every room has a name and a number.
- Stairs and elevator shafts named the same on every level they pass through, so levels can be
  linked by name.
- Design options closed to the primary option; one phase chosen for the export.
- Linked models noted: if any part of the building is a link, the script must walk the link.
- No in-place families standing in for furniture that matters (they have no location point).

## Then, in the V2 tool

1. Read the JSON into a model; apply `edits.json` by element id.
2. Rasterise each level to tiles directly from the model (walls paint their tiles, openings
   clear tiles on their host, rooms paint floor, columns paint columns, glass paints glass).
3. Export a full-map PNG per level and review crops before drawing anything else.
4. Keep the V1 oblique drawing rules; replace procedural sprites with a sprite sheet last.
