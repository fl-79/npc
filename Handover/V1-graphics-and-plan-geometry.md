# How V1 represented the plan and drew it in a game style

A record of the geometry and graphics side of the V1 tool (`tool/`), written for the V2 rebuild.
Nothing here is about the simulation. Sources: `tool/scripts/dxf_to_plan.py`, `tool/src/plan.js`,
`tool/src/pixel.js`, `tool/src/stage.js`, `tool/public/plan/level3-edits.json`, and the history
in `tool/BUILD-LOG.md`.

## 1. The pipeline in one view

```
Revit 2D plan DXF (mm)
  └─ dxf_to_plan.py + level3-plan-config.json      (Python, offline, once)
       └─ public/plan/level3.json                   (metres, y up; walls, rooms, doors, furniture, desks, linework)
            + level3-edits.json                     (owner's corrections, applied at load, with reasons)
            + level3-flags.json                     (furniture anomalies from check_furniture.py)
                 └─ plan.js loadPlan()              (browser: apply edits, derive helpers)
                      └─ pixel.js build()           (tile map: void / floor / wall / glass / door, columns, mullions)
                           └─ pixel.js buildStrips() (pre-rendered row strips: wall caps, faces, furniture)
                                └─ pixel.js draw()   (per frame: floor, strips in row order, people, doors)
                                     └─ stage.js     (camera, whole-number zoom, overlays, the plan-view mode)
```

Two principles held throughout: the DXF and `level3.json` are never edited by hand (every
correction lives in `level3-edits.json` with a reason), and everything drawn is either computed
from the plan or marked inferred.

## 2. Reading the Revit export (`scripts/dxf_to_plan.py`)

Input: the 2D plan DXF of Lasserre Level 3 exported from Revit, in millimetres. Libraries:
ezdxf (read, flatten arcs and splines at 4 mm, decompose blocks), shapely (buffering, unions,
regions), numpy.

Layers that mattered:

| Layer | Used for |
|---|---|
| `A-WALL` | wall linework (double lines with cavities) |
| `A-FLOR` | floor edge |
| `A-GLAZ-CURT`, `A-GLAZ-CWMG` | curtain wall and glazing, including the small mullion rectangles |
| `A-GENM` (blocks named Louver) | louvers, treated as envelope |
| `A-DOOR` | door blocks, one per door |
| `I-FURN`, `Q-CASE`, `P-SANR-FIXT`, `A-GENM`, `A-GENM-HDLN` | furniture and casework blocks |
| `S-STRS`, `S-STRS-MBND`, `A-FLOR-HRAL` | stair treads and handrails, drawing only |

What the script computes:

1. **Envelope network.** All wall, floor-edge, glazing and louver lines plus each door's bounding
   box outline are buffered by 0.22 m, unioned, then shrunk by 0.12 m. This closes the wall
   cavities and small junction gaps so the walls become one solid network. Door boxes are
   included so that doorways do not leak between rooms during this step.
2. **Rooms.** Free space is the world box minus the network. Each enclosed region over 1 m² that
   does not touch the outside is a room candidate. Rooms are named by overlap with bounds listed
   in `level3-plan-config.json` (name, type); anything unmatched becomes `Region N`, type
   `unconfirmed`. Each room keeps its polygon, holes, area and a label point.
3. **Doors.** From the door blocks: centre, bbox, width, and the axis the wall runs along (the
   longer side of the box).
4. **Furniture.** Blocks classified by family name into kinds: desk (SALA desks), chair, pinup,
   computers, table, seating, printer, bin, counter (kitchen, casework, sink, keg, bar edge),
   elevator, perimeter; monitors and louvers skipped; pieces under 0.04 m² dropped unless chairs.
   Each piece keeps id, kind, name, bbox, rotation.
5. **Desks and seats.** Every desk gets a seat: the nearest unused chair centre within about
   1.2 to 1.4 m; facing is the vector from seat to desk centre. Desks are grouped into studio
   sections by position (the 12 sections, 3 years).
6. **Linework for drawing.** Simplified polylines per layer (walls, glazing with a vertex budget,
   stairs, floor edge), furniture outlines per piece with a vertex budget, and the wall solids as
   poché polygons.
7. **Config additions.** `added_segments_m` in the config closes gaps the export lacks (one
   partition between the south office and the classroom), each with a why; they are listed in
   the output's `meta`.

Output `level3.json` (metres, y up, 3 decimals): `meta`, `walls` (solid rings), `poche`,
`linework`, `doorLines`, `furnitureLines`, `rooms` (17), `doors` (11), `furniture` (499),
`desks` (175), `columns` (5 interior, added from the plan), `zones` (kitchen and other named
areas by bounds), `entries` (stairs and lobby points), `sections`.

Lessons from this step: the DXF's walls are double lines, not solids, so a buffer-and-shrink
pass is needed before anything else; door blocks are the only reliable door geometry; room
naming by bounds overlap worked but every unnamed leftover region needs handling downstream;
block family names were good enough to classify all the furniture that mattered.

## 3. Corrections and flags, kept beside the plan

`level3-edits.json` is applied in `plan.js loadPlan()` and nothing upstream changes:

- `remove_furniture`: pieces struck out in the owner's markups (and the desks sitting in their
  boxes), each with a reason.
- `remove_doors`: by nearest centre (empty in the end; the alcove doors were restored).
- `add_walls`: wall rectangles that close openings the export shows but the building does not
  have (the office alcove to classroom openings, the south office east wall, the middle closet).
- `cut_walls`: boxes cut out of the wall solids (the short stubs in both stair halls); the
  raster, the routing grid and the plan view all honour them.
- `unused_doors`: doors kept in the drawing but never routed through (the middle closet).

`scripts/check_furniture.py` writes flags for pieces overlapping a wall or column, chairs with
nothing to sit at, pieces within 0.6 m of a door, pieces outside every room. Flags were shown as
red marks in the view until the owner reviewed them; the marks are now off behind an option but
the file stays.

Lesson: the markup rounds were the most valuable part of the geometry work. V2 should have the
corrections layer from day one, with an id for every piece and every wall segment so a markup
can be recorded as data.

## 4. From plan to tiles (`pixel.js build()`)

The world is a tile map: a 16 px tile is 0.5 m (`TILE`, `TILE_M`, `PPM` = 32 px per metre at
zoom 1). Each tile is one of void, floor, wall, glass, door, plus a room index and flags for
columns and north-south caps.

Order of operations, as it ended up after several rounds:

1. **Floor from rooms.** A tile is floor when its centre is in a room polygon and not in a hole.
   Unnamed `Region` rooms never claim tiles; where room polygons overlap (an office inside the
   studio outline) the smallest room wins. Floor style per room type: dark concrete for the
   studio, checker for the kitchen, wood for the offices, grey for the halls.
2. **Wall solids on a 10 cm raster** (five pixels per tile), from the poché rings minus the
   `cut_walls` boxes. Everything below works on this raster.
3. **Columns and pilasters** by a distance transform on the raster: a solid core at least 0.3 m
   from every edge and under a metre across is a column (`isCol`). The five interior columns are
   added from the plan. Column tiles are never turned into glass, so the facade pilasters stand
   between the panes.
4. **Wall centrelines**: the solids thinned to one pixel with Zhang-Suen, each line end pushed
   back out to the solid's edge (the thinning retracts ends). A tile is wall when at least two
   centreline pixels run through it and it has more than five solid pixels, when it is solid
   right through, or when it holds a column. Result: every wall is one tile wide, corners and
   T-junctions close because the centrelines meet, shafts come out as clean rectangles.
5. **Clean-up rules.** A tile with no more than a one-pixel sliver of solid is never a wall. A
   one-tile dead end hanging off a wall at right angles is a spur of the thinning and is dropped,
   except within a metre of a door (a jamb is a short wall). A lone floor tile outside the
   building becomes void. Void pockets shut inside the building become floor.
6. **Glazing**: tiles the glass lines cross become glass, except column tiles; the run direction
   and the line's position within the tile are kept so the glass is drawn at its real line. A
   glass run ends on the wall that hosts it: the corner tile between the run's end and the host
   becomes wall so the cap reaches over the line and no post stands in the open. A lone glass
   tile (a frame return) is not a run.
7. **Doors, hosted by a wall.** Of the tile rows (or columns) a door box covers, the host is the
   one whose wall or glass run continues past both ends of the opening; a wall meeting at a
   corner scores low. Framed doors take wall runs only; a run of glass beyond the ends makes it a
   glass-hosted door (the lobby and curtain-wall doors). Door tiles are trimmed off any crossing
   wall; the thin jamb tiles beside the opening are restored as wall.
8. **Mullions**: the 119 small closed rectangles in the glazing linework become posts, only in
   glass tiles.
9. **Studio tiles cut off** from the main body once doors are marked (the studio polygon reaches
   through a doorway into a door swing) are given to the room around them.
10. **North-south walls at their real line**: such wall tiles are drawn as a cap 10 px wide
    centred on the centreline's x, one offset per contiguous run (its mean) so the cap never jogs;
    corners, junctions, columns and east-west walls keep the full tile.

Rejected along the way, and why:

- Voting on samples per tile with local maxima: no consistent thickness, open corners, doors
  drifting a row off their wall.
- Drawing the thickened network as walls: too heavy, hid the openings.
- Drawing shafts and the middle closet as solid blocks: wrong, they keep their walls and interiors.
- Door headers as slots and grey patches: a door is drawn as a door at its own depth, nothing
  behind it.

Lesson for V2: the raster-and-thin route works but it is a workaround for not having walls as
centreline segments with a thickness. If V2 starts from a model (wall segments with thickness,
hosted doors and windows, columns as points with a size), the tile map is a direct rasterisation
and most of steps 4 to 10 disappear. Keep step 1 (rooms claim floor) and the oblique drawing rules.

## 5. Drawing the world (`pixel.js buildStrips()` and `draw()`)

The look is the front-facing oblique of 2D RPGs: the floor is a true plan, every vertical
surface shows its south face, and things are drawn in order of their feet so a person below a
wall stands in front of it and one above is hidden by it. Wall height is two tiles
(`WALL_H`), the door face sits below the header (`DOOR_H`). Everything is drawn at native size
and scaled by whole numbers.

Palette (`PAL`): dark exposed-concrete floor, near-white wall caps (the cut line) with a dark
edge, cream wall faces with a baseboard, pale blue glass with dark mullions, wood doors, ochre
and red accents. Legibility was chosen over realism.

Static layers are pre-rendered once per build:

- **Floor canvas**: tiles by room style, stair treads from the linework, the glazing as lines at
  cap height with a faint footprint on the floor.
- **One strip per tile row** holding that row's wall caps and south faces, column caps, and the
  furniture whose feet are in that row. Within a strip furniture is drawn first, then a wall or
  column whose tile centre lies at least 0.2 m inside a piece's footprint is cut out of the
  piece, so the wall wins where they overlap, while a piece south of a wall is drawn in a later
  strip and stands in front of it. A piece whose edge reaches into a wall tile is nudged out of
  it, up to 0.45 m, against the widest cap along the whole wall run; the plan's own positions are
  never changed. A face is drawn where the tile to the south is open or holds a narrow cap.
- **Furniture sprites** are procedural per kind: a top in plan and a front face below the south
  edge. Desks carry sheets, a laptop or a model and a mug; chairs have a back; pin-up boards are
  tall faces with pinned sheets; counters have bottles; sofas, printers, plotters, shelves,
  bins, plants have their own. Offices, which the export leaves empty, get an inferred layout
  (`officeLayout`: desk against the wall away from the door, chair, shelf, visitor chair,
  cabinet, plant), marked inferred.
- **Doors** are drawn live, not in strips. A door in an east-west wall (`drawFaceDoor`): the
  opening is whole tiles, the leaf its real width, the rest jamb or sidelite glass; double doors
  have two leaves; leaves slide open while someone is within a metre. A door in a north-south
  wall (`drawPlanDoor`): a post at each end unless a wall holds that end, the leaf in plan at cap
  height, the sidelite beside it, drawn at its own depth: after the walls north of it and before
  the strip of its south end, so the wall at its south end and everything further south is
  painted later and stands in front of it.

Per frame (`draw`): the floor canvas, then for each row the strip, the people whose feet are in
that row (`drawPerson`), and the doors at their depth; then the overlays in screen space
(trails, the spot-remark marker, numbered findings, the bar area after opening).

**People** are 16 by 24 sprites with four facings, a two-frame walk and a seated pose
(`personSprite`), colours per archetype and profs in a jacket, opacity 0.72 to 1.0 by mood,
dimmed when following someone else. Sprites are generated in code; drawing them from photos of
the studio was deferred.

**Camera** (`stage.js`): whole-number zooms 1/4, 1/2, 1, 2, 3, 4; fit picks the largest that
shows the whole floor; the wheel steps the zoom about the cursor; static layers are cached per
view transform. The plan-view mode (grey plan with poché, people as discs) stayed as a second
mode until the toggle bar was removed; a backup with it is in
`backups/tool-2026-10-21-with-plan-view/`.

**Inspection**: `exportMap(px)` renders the whole map without people and `exportRaster(px)`
the 10 cm raster (solids grey, centrelines red, columns blue). Reviewing full-size PNG crops in
`outputs/pixel-debug/` was far more reliable than pane screenshots for judging walls and doors.

## 6. The game chrome

- Fonts bundled locally in `public/fonts/`: Silkscreen for headings and labels, Nunito for body
  text.
- Panels as vintage computer windows: a light title band with a dark title and a collapse arrow,
  thick borders, cream fill, chunky buttons, pixel check boxes.
- Speech: a 9-slice pixel frame (stepped corners, offset shadow) as an SVG, used for every feed
  message and the corner thoughts box.
- A title screen (`intro.js`): NPC, a subtitle, a blinking start line, and one sprite walking
  real routes over the exported map at close range; then a guided tour with a red guide box.
- A UI kit page (`scripts/ui-kit.html`) and capture script for the slides.

## 7. A suggested order for V2, starting from the model

1. **Decide the model, not the drawing.** Walls as centreline segments with a thickness and a
   height; columns as points with a size; doors and windows as hosted openings on a wall segment
   (offset along it, width, leaf type); rooms as named polygons; furniture as pieces with a kind,
   a footprint, a rotation and an optional seat. Every element gets a stable id.
2. **Write the converter to that model.** Reuse the DXF reading (ezdxf, flattening, block
   decomposition, layer table above) and the buffer-and-shrink trick only to derive rooms and
   centrelines; store the centrelines, not the raster. Doors come from the door blocks and are
   snapped to the nearest wall segment at conversion time, so hosting is a property of the
   model, never guessed in the renderer.
3. **Corrections as data from the first day**: a `edits.json` keyed by element id (remove, add
   wall, cut wall, mark unused), with reasons, applied at load. Keep the flags script.
4. **Rasterise the model to tiles** directly: wall segments paint their tiles (full tile at
   junctions, thin caps at their real line elsewhere), openings clear tiles on their host, glass
   paints glass, columns paint columns, rooms paint floor. The clean-up rules of V1 (spurs,
   slivers, pockets) should not be needed.
5. **Keep the oblique drawing rules**: row strips, feet-order depth, walls cut out of furniture
   that overlaps them, doors drawn at their own depth, whole-number zoom, native-size rendering.
6. **Export the map as a PNG early** and review full-size crops before touching sprites.
7. **Sprites last**: a sprite sheet (hand-drawn or from photos) replaces the procedural set
   once the geometry is signed off; the procedural set is a fine placeholder.
