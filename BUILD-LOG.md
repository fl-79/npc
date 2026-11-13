# Build log: NPC V2

What was asked, what was built, what was rejected or left open, and what was checked.
Paths are relative to `Tool-V2/` unless written in full.

## 2026-11-03: geometry export and the first 3D pixel view

**Asked.** Rebuild the tool as V2 from the Revit model (`260630 - Lasserre.rvt`, Revit 2027.1)
through pyRevit. At this stage only verify that the model can be read and shown in the pixel-art
game style: a 3D view with orbiting and a navigation panel. Check the geometry for collisions and
the rooms for boundary problems. Flag anything uncertain; never invent architecture.

**Read first.** `Handover/V2-HANDOVER.md`, `Handover/V2-export-brief.md`,
`Handover/V1-graphics-and-plan-geometry.md`.

**Setup found on the machine.** Revit 2027.1 open on the model (drafting view `0000_OPEN/SAVE
VIEW`), pyRevit 7.0.0 loaded with the V1 `NPC.extension` (one button, Room Check). Python 3.14
with shapely and numpy, Node 24. The Revit ribbon is reachable from outside through Windows UI
Automation (tab buttons and pushbuttons expose an Invoke pattern), so pyRevit Reload and the NPC
buttons can be clicked from a script without a hand on the mouse.

**Built.**
- `pyrevit/NPC.extension` replaces the V1 extension in `%APPDATA%\pyRevit\pyRevit_config.ini`
  (`userextensions`); the previous config is kept as `pyRevit_config.ini.2026-11-03.bak`. Three
  buttons on the NPC tab, Model panel:
  - Room Check: the V1 script, writing to `exports/rooms.json` here.
  - Export Model: `exports/model.json` (levels, grids, walls with centrelines and widths,
    doors and windows with host and offset along it, rooms with boundary loops and the elements
    that bound them, columns, curtain walls with mullion lines and panel boxes, floors with
    top-face loops, stairs with runs and landings, railings, furniture and every other family
    instance with point, rotation and bounding box, other building elements, shaft openings,
    model lines) and `exports/meshes.json` (every exported element triangulated from its Revit
    geometry at Medium detail). Metres, origin at the Project Base Point, +Y is Project North.
    Elements in secondary design options are skipped and their ids listed in `meta`.
  - Clash Check: `exports/collisions.json`, every pair of model elements whose solids overlap,
    with the overlap volume (solid boolean intersection) and the overlap box. Pairs that are
    meant to overlap (opening and host wall, nested family and parent, siblings in one family,
    panel or mullion and curtain wall, railing and stair) are left out. Under 0.0005 m3 counts
    as a touch, not an overlap.
- `scripts/run_revit_button.ps1`: clicks a pyRevit button through UI Automation and waits for
  the script's done-marker file.
- `scripts/validate_export.py`: checks the export outside Revit (counts per level, room loops
  closed and valid, rooms overlapping on a level, blank names and numbers, duplicate numbers,
  doors and windows without a host, elements without a level or without geometry, stair and
  shaft names across levels) and writes `exports/checks.json` for the viewer.
- `viewer/`: Vite and three.js, no framework. Low-resolution render with nearest-neighbour
  upscale and depth and normal edges (`RenderPixelatedPass`), a toon material with stepped
  shading, an optional limited-palette pass with ordered dithering. Orbit, pan and zoom; level
  filter with a cut-above mode; category toggles; room floors tinted and labelled; a checks list
  (collisions, room problems) that focuses the camera and highlights the elements; click an
  element for its id, category, family, type and level. Fonts are the V1 Silkscreen and Nunito
  files, loaded locally.

**Checked.** Export runs in about 40 s (2846 meshes, 3.24 M triangles, 117 MB of JSON);
Clash Check in 150 s over 3157 elements. The viewer loads the full export and holds a steady
frame at pixel size 3. Level solo, section cut, room labels, check framing, element picking,
perspective switch and the palette pass were exercised in the browser.

**What the export says about the model (2026-11-03).**
- Levels: Basement -3.69, Level 1 0.00, Level 2 4.01, Level 3 7.55, Level 4 11.66, Roof
  14.76 m. Plan extent about 22 x 49 m. Grids 1 to 9 and A to D.
- The whole model sits 614 m below Revit's internal origin, and the Project Base Point and
  Survey Point were moved down with it (both at internal z = -614 m). The export is relative
  to the Project Base Point, so Level 1 reads 0. Revit's `Level.Elevation` already follows the
  base point here; the export uses `Level.ProjectElevation` so levels and geometry share one
  frame (the first run had levels 614 m above the geometry for that reason).
- 403 walls (159 curtain walls carrying 1357 mullions and 472 panels, 136 of them empty or
  replaced by doors), 124 doors all hosted, 0 windows, 202 columns, 5 floors, 8 stairs (two
  cores, four flights each, 3 runs and 2 landings per flight), 18 railings, 581 furniture and
  fixture instances, 1 roof with geometry and 1 without, 1 ceiling, 1 fascia. No links, no
  secondary design options. Phases Existing and New Construction; rooms are in Existing.
- Every wall type has function Exterior, so interior and exterior cannot be told apart from
  the type; a later pass can use room boundaries instead.
- Rooms: 77, all placed and enclosed, none redundant, numbered 1 to 77 (Level 3: 1 to 11,
  Level 1: 12 to 18, Level 2: 19 to 40, Level 4: 41 to 69, Basement: 70 to 77). Every room
  is still named `Room` and no department is set. Revit computes room areas at the wall
  centre (Area and Volume Computations), the exported loops are the finish faces, so loop
  areas are a uniform 95% of Revit's; five small rooms (5, 6, 31, 66, 67) sit at 87 to 90%,
  which the perimeter-to-area ratio of a small room explains. Six rooms have one hole; one
  (74, Basement) has eight.
- Furniture is on Level 3 almost alone (543 of 581 instances); Level 2 has 35, the others
  one each. 16 in-place families (kitchen counters, bar edge, benches, recycling, pendants)
  are on Level 3; they have geometry but no location point.
- Collisions: 702 overlapping pairs, 541 touching pairs. 508 of the overlaps are walls,
  mullions, panels, columns and doors running through the floor slabs; the Level 2 and
  Level 4 slabs are 864 mm thick and the Level 4 slab is a plain rectangle with two holes.
  42 are stacked columns overlapping the column below (Level 1 on Basement, Level 2 on
  Level 1). 50 are desks overlapping desks, 5 desks in walls, 4 casework in furniture, 4
  columns in furniture, 4 columns in doors, 4 stairs in walls, 4 walls in the ceiling. 40
  louver pieces overlap curtain members, which is expected.
- The 16 stair railings return no solid geometry at Medium or Fine detail; one roof
  (`Roofs 1`) has none either. Both are listed, not drawn.

**Rejected.** Writing the export in the room-check button (a second button keeps the quick
check quick). Grouping meshes by base level only (multi-storey columns and the slab above
then vanished or capped a soloed level); meshes are grouped by the levels they span and a
section cut does the rest. A global renderer clip (it also clipped highlights). Dithering the
empty background.

**Left open, for the user.** Room names in Revit. Whether the 864 mm slabs and the walls
through them are intended. The stacked duplicate columns. The desk overlaps on Level 3 (the
V1 markups removed some of these; an `edits.json` keyed by id is the place for them). The
railings without geometry. The 614 m offset of the model from the internal origin.

## 2026-11-03, later: slab tops and the two views

**Asked.** Fix the walls and columns that intersect the slabs: they should be joined to the
slab underside. Remove orbiting; the viewer gets two views only, an isometric and a game view
like the classic pixel examples the user attached (a 2:1 isometric room; a top-down RPG plan
with every south face standing up).

**Built.**
- NPC tab > Slab Tops (`pyrevit/.../SlabTops.pushbutton`): for every wall (basic and
  curtain) and column, finds the floor slabs whose footprint covers it (top-face loops, holes
  respected) and whose underside lies between its base and top. An element that ends inside
  that slab gets its top set to the underside (Top Offset for a level-constrained wall or
  column, Unconnected Height otherwise); an element that continues above the slab is joined to
  it with the slab cutting. One transaction, the file is not saved; `exports/fix-tops.json`
  lists every change with the old and new values. Run on the model: 235 tops set, 128 joins
  (48 walls and 102 columns crossing intermediate slabs), 32 curtain walls that span several
  levels skipped because a curtain wall cannot be joined. The same convention was already in
  the model for 34 walls (Level 2 to the Level 4 underside with Top Offset -0.864), so the fix
  follows what the user had started by hand.
- Viewer: `OrbitControls` removed. ISOMETRIC is a fixed orthographic camera at azimuth 45 deg
  and elevation 30 deg (the 2:1 pixel isometric), turned in quarter steps only. GAME VIEW is an
  oblique projection: the camera looks straight down and the world is sheared so a metre of
  height moves a surface north on screen by "Wall height" metres (default 0.5), which puts
  every south face under its top edge and draws anything further south in front, exactly the
  V1 drawing order but done by the depth buffer. Pan by dragging, zoom at the cursor, keys for
  pan, quarter turns, fit. Entering the game view with nothing hidden solos Level 3.
- `scripts/run_revit_button.ps1`: after a pyRevit reload the ribbon exposes only its newest
  button to UI Automation (the others are virtualised items without peers; Realize does not
  help); `-Index n` clicks a panel item by its position instead. pyRevit's Search palette was
  tried as a route and did not take the typed command.

**Checked.** Re-exported after the fix (41 s) and re-ran the clash check (164 s): overlapping
pairs went from 702 to 302. Walls through slabs 153 to 2 (ids 1229087 and 1304187, 0.11 and
0.01 m3, both joined walls with a sliver left), columns through slabs 79 to 1 (1213475,
0.01 m3), doors in slabs 21 to 9. Of the 112 slab overlaps left, 96 are mullions and panels of
the 32 skipped multi-storey curtain walls. Everything not about slabs is unchanged: 50 desk
overlaps, 42 stacked columns, louvers on the curtain wall, and so on. In
the viewer, Level 3 soloed with the section cut off shows the Level 4 slab resting on the
walls and glazing with nothing poking through its top; the columns and walls that continue to
the roof still pass it, cut by the join. Both views exercised in the browser; the game view of
Level 3 reads as a plan with desk fronts and wall faces.

**Rejected.** Attach Top/Base (no API). Global renderer clipping (clips highlights). Splitting
the 32 multi-storey curtain walls per level: a bigger model change, left to the user.

**Left open, for the user.** Save the model in Revit once the Slab Tops result looks right
(Ctrl+Z reverts it before saving). The 32 curtain walls through slabs. Everything listed on
2026-11-03 above that is not about slabs.

## 2026-11-03, later still: building or one floor, one floor colour

**Asked.** Keep only the isometric and the game view; the level choice is the whole building
or one floor soloed; every floor the same colour whether or not a room is placed on it.

**Built.** The LEVELS window is a row of buttons (BUILDING, then each level); a level shows
that floor alone with the section cut, nothing else. Per-level ticks and CUT are gone. Room
polygons no longer tint the floor by room type: they are the slab colour, off by default, and
a flagged room is marked by its label and the checks list only. In a pane narrower than
1000 px the LAYERS, ROOMS, CHECKS and SELECTED windows start folded so the view stays visible.

**Then (same day).** Asked: BUILDING shows the whole building with no cutting planes; no Roof
button, only the floor plans; with BUILDING the game view and the turns show elevations; and
why the basement looks empty. Built: the section cut now exists only when one floor is chosen;
the Roof level has no button (its elements still show in BUILDING); in BUILDING the game view
is a straight orthographic elevation from the south and TURN L / TURN R go round west, north
and east; the VIEW window names the current view. Checked in the browser pane: south and
east elevations, Basement plan. The basement is not missing from the export (59 walls, 28
doors, 8 rooms, 32 columns, 2 stairs, 1 floor): the model has almost nothing inside it (one
elevator, no partitions beyond the eight rooms), and the Cut height slider in the pane had
been moved to 0.5 m, which sliced every wall to a half-metre stub in the plan view. Reset to
2.6 m the basement walls and doors read as on the other floors.

**Then.** Asked: no cut height for the whole building, which should read enclosed; and the
plan information (walls, furniture) seemed lost. Found: the pane was on Level 1 with the
section cut switched off, and the Level 2 slab, 864 mm thick, reached down into the Level 1
band and so belonged to Level 1 too; seen from above it covered the whole plan. Built: a slab
(floor, ceiling, roof) now belongs only to the level its top sits on, so a plan is never
covered by the slab above even with the cut off; the cut checkbox and slider are disabled in
BUILDING; the roof is on by default so BUILDING shows the enclosed volume. Nothing was lost
from the export; the counts in the status line are unchanged.

**Then.** Asked: a floor view shows only that floor plate and what is hosted on it, nothing
from the floors below or above; and two markups, missing floor in the basement and columns
standing clear of the Level 1 plan. Built: an element belongs to exactly one floor, its Revit
level (base level for walls, columns and stairs; the host wall's level for doors, panels and
mullions; the slab's own level), so a basement-to-Level 4 column appears only in the Basement
view. The validator checks whether each level's slab reaches under its rooms and its columns.
Found in the model: the Basement slab has a notch cut out of its north-west corner, so room
70 has a floor under only 6% of it, and two basement columns (1209642, 1211417) stand in that
notch with no slab under them. The stair rooms (17, 18, 39, 40, 7, 8) sit over the slab
openings, which is expected and listed as info. The Level 1 columns are all on the Level 1
plate; what showed north of the plan was the oblique projection of the 11.7 m columns with
the cut switched off (a column that tall draws 5.8 m up the screen at Wall height 0.5).

**Then.** Asked: the exterior walls and windows had gone from the floor views; a floor view
must include them, bounded between its two levels. Built: a floor view is the storey slice
between its level and the next level line. Everything whose geometry reaches into that band
belongs to it (walls, curtain walls, columns, stairs through several storeys show their part
of this one, cut at both level lines); a slab belongs only to its own level. The cut is
always the storey; the "Lower cut" checkbox sections it at "Cut height" instead and is off by
default. This replaces the by-Revit-level rule of the previous entry.

## 2026-11-03, evening: urban context

**Asked.** Add the surrounding urban context to the whole-building views (isometric and
elevations), not to the floor views. The building is the Frederic Lasserre Building at UBC.

**Built.** `scripts/fetch_context.py` pulls OpenStreetMap through the Overpass API (one
request, 38 s): 81 buildings with heights (height tag, else levels x 3.3 m, else 7 m), 470
roads and paths, 59 green and parking areas, 4 water bodies, 123 trees within 320 m. The
model has no shared coordinates, so the script fits the minimum-area rectangle of the Level 1
to 3 slab outlines (49.5 x 24.1 m) to the OSM footprint of the building (49.5 x 23.0 m): the
rotation between project north and true north comes out at 61.7 degrees, the candidate
closest to zero; the 180 degree alternative is noted. All features are written in model
coordinates to `exports/context.json`, with the alignment and its "inferred" flag in meta.
`viewer/src/context.js` draws them as blocks (buildings), ribbons (roads), flat polygons
(green, water, parking), trunk-and-canopy blocks (trees) on a ground plane at Level 1, in
muted colours; the Lasserre footprint itself is left out since the model stands there. Shown
only with BUILDING; a layer toggle turns it off; the status line carries the counts, the
inferred rotation and the OpenStreetMap attribution.

**Left open.** The ground is flat at Level 1 (the real site slopes); the 180 degree
alternative if the facade reads the wrong way round against Main Mall and Memorial Road.

**Then.** The user confirmed the inferred orientation (the building sits correctly against
Main Mall and Memorial Road), asked for the context in the game view and after turns, and
for FIT to go. Built: every view change (BUILDING or floor, ISOMETRIC or GAME VIEW, a turn)
frames itself: a floor on its own, the building with 70 m of surroundings on each side when
the context is on. FIT and the F key are gone. The confirmation is noted in the fetch
script and the README.
In the elevations the neighbours that stand between the camera and the building hid the
facade, so an elevation now clips away everything nearer the camera than the building's own
near face (plus 2 m), as an elevation drawing does; what is beside and behind stays.

**Then.** Asked: the context shows in the whole-building views and in the floor plan (game)
views; the only place it is hidden is a floor's isometric. Built: the context group is
exempt from the storey clip (it is ground and neighbours, not part of a storey) and is
visible unless a floor is shown in the isometric. Neighbouring blocks in a floor plan are
seen from above with their fronts, as the game view draws everything.

**Then.** The basement plan was hidden by the context, whose ground sits at Level 1, 3.7 m
above the basement floor. Built: in a floor's plan view the context group is moved to that
floor's level (ground just under the slab), so the surroundings read as a map around the
plan for every floor, below ground included. The whole-building views keep the context at
Level 1.

## 2026-11-03, night: the game view

**Asked.** Implement whichever of the pixel-art skill or Phaser best attains the retro game
style of the `Graphics/` references (top-down RPG rooms with wall faces under light caps,
patterned floors, furniture with fronts, chunky people with speech bubbles; a Kairosoft-style
isometric office; a Smallville-like town).

**Built.** Phaser 3.90 (MIT, npm) for the game interface; the pixel-art skill is left for the
sprite sheet once the geometry is signed off.
- `scripts/rasterise.py`: every level to a 0.5 m tile map from the model alone (walls from
  centreline and width, curtain walls as glass, doors clearing their host over their width,
  columns, rooms by index, slab, stairs, furniture boxes with a kind from the V1 family
  table). Multi-storey walls appear on every storey they pass. 1.4 s for five levels; a
  debug PNG per level.
- `viewer/game.html` and `viewer/src/game/`: a Phaser scene per level. Floor as a tilemap
  (style by room type: concrete, parquet, checker, tile, carpet, hall, service), every wall,
  glass, door, column and stair tile as an image at the depth of its bottom edge, furniture
  as an image at its plan size with a front face, people as 16 x 24 sprites with a
  four-direction walk, depth by feet, so what is further south stands in front. Procedural
  tileset and sprites drawn on canvas at true pixel size, one-pixel outlines, caps light and
  faces dark. Six placeholder people wander walkable tiles and say placeholder lines; the
  status line says so. Canvas renderer, integer zoom, fold-away chrome in the same vintage
  windows.

**Checked.** Level 3 in the browser: desks with chairs, pin-up boards, counters, sofas, the
elevator, glazing, doors, the stair cores, room labels, people with bubbles. Other levels
switch with keys 1 to 5.

**Rejected or fixed on the way.** Two canvas-drawing bugs (argument order in the pixel
helper, patterns bleeding across sheet cells) made walls and furniture invisible at first.
WebGL was not the cause; the canvas renderer is kept for crispness.

**Left open.** All rooms are still named "Room", so every floor is concrete; room types (and
so floor patterns) follow once the rooms are named in Revit. Furniture rotation is not drawn
(boxes are axis-aligned bounding boxes). A hand-drawn sheet (pixel-art skill) replaces the
procedural tiles later. No simulation: the people are placeholders.

### 2026-11-03, late: game view failed to load on a fresh open

Opening `/game.html` fresh showed "loading…" forever. Phaser auto-started the level scene from the
`scene:` config before the page had chosen a floor, so the scene asked for `exports/tiles/undefined.json`
(404) and threw in `create`. Fix in `viewer/src/game/main.js`: the scene is added with
`game.scene.add('level', LevelScene, false)` and only started once the fonts are ready and a floor is
chosen; `start()` restarts it when it is already running or loading. Verified: fresh load fetches only
`tiles/level-3.json`, keys and the ZOOM buttons work.

### 2026-11-03, afternoon: the game view gets the V1 graphics

The first Phaser tileset was a fresh, simpler rewrite (one-tile walls, flat boxes for furniture) and
did not look like the iterated V1 renderer. `viewer/src/game/tileset.js` now ports V1's `pixel.js`
drawing rules and palette onto the V2 tile maps, nothing else changed upstream:

- The floor is one pre-rendered canvas: V1's dark concrete with a grid every four tiles, office
  wood, kitchen checker, hall grey, a darker threshold under door tiles, stair treads across the
  run, a faint footprint under glazing, dots in the void.
- One strip per tile row (as V1 `buildStrips`), each a Phaser image at the depth of its row: wall
  caps (near-white, outlined on outer edges only so runs read as one piece; north-south runs at a
  10 px cap), faces two tiles tall where the south side is open (cream with a baseboard inside, the
  plainer outside face with a pilaster every six tiles, headers over east-west doors), east-west
  glazing as panes with a highlight and mullions reaching the cap top on the outside, north-south
  glazing edge-on as a line at cap height with posts at the ends.
- Doors from `L.doors`: east-west leaves at their real width with a sidelite where the family says
  so and two leaves for double doors; north-south doors as a leaf in plan at cap height with posts
  where no wall holds the end, drawn in the strip before their south end.
- Furniture sprites per kind, V1's set and colours, drawn into the strip of the row their feet
  are in; a wall whose tile centre lies well inside a piece's footprint is cut out of the piece.
  Lamps and the elevator are not drawn (the shaft walls stand for it).
- People are V1's 16 by 24 figure (jacket for one in four, glasses for some), three frames.

Fixed on the way: switching floors rebuilt the people textures while their walk animations still
pointed at the removed ones (a `sourceSize` of null); the textures are deterministic per index and
are now kept across floors. Screenshots 12 to 14. Verified on Level 3 at zoom 2 and 3; the
basement after the fix.

Two more things found while checking floor changes, both in place now:

- Changing floors did nothing: the scene loaded every floor's JSON under one cache key, and
  Phaser's loader skips a key that is already cached, so a restart got the first floor's tiles
  again (it had only ever seemed to work because the very first load had failed). The key is now
  per floor (`tiles:<file>`).
- The first floor could start before the game had booted (the scene list is empty until then),
  which threw on fast loads; `main.js` now waits for both the fonts and Phaser's ready event.
Verified: Basement, Level 1 and Level 3 in turn, people walking, no errors.

### 2026-11-03, evening: the pixel plan inside the model-check interface

The user wants yesterday's interface (BUILDING or one floor; ISOMETRIC or GAME VIEW; turns for
the building) with the V1 graphics, and a way to zoom out to a whole floor. Done:

- `viewer/src/game/embed.js`: `PixelFloorView`, a Phaser game in a hidden `#game` container
  inside the stage of `index.html`. When one floor is shown in GAME VIEW, `main.js` adds
  `pixel` to the stage (the three.js canvas and labels hide), shows that floor's tiles
  (`tileFileOf("Level 3")` = `level-3`), and rests the controls that mean nothing there
  (turns, cut, wall height, pixel size, edges, dither). Any other choice hides it and sleeps
  the game loop. Room labels, the urban-context layer and a new "Placeholder people" slider
  reach through to it. The three.js shear game view of a floor is no longer reachable; the
  building's game view (elevations) and both isometrics are as before.
- `scene.js`: zoom steps `ZOOMS = [0.25, 0.5, 1, 2, 3, 4, 6]`; `fit()` picks the largest that
  shows the whole floor and centres it, and every floor opens fitted; FIT FLOOR button and F.
  Camera binding (drag, wheel, arrows) moved into the scene so both pages share it.
- `tileset.js`: `buildContextCanvas` draws `exports/context.json` in the floor's pixel frame,
  60 tiles (30 m) beyond it on every side: ground with dots, green areas, parking, water, roads
  as edged ribbons with a dash on the wide ones, neighbouring buildings as flat blocks with a
  south face scaled by their height, trees as a canopy on a trunk; the Lasserre footprint left
  out. The floor canvas leaves the void transparent so the ground shows through.
- `game.html` now uses the same `PixelFloorView` and shows the context too.

Verified in the pane: Level 3 and the Basement open fitted at a quarter zoom with the context
around them (screenshots 15 and 16: fitted, and zoom 2); + and - step the zoom, FIT FLOOR
returns; ISOMETRIC and BUILDING bring the three.js stage back; no errors. The in-app browser's
key presses did not reach the page in this test, so the key handler was checked by dispatching
the events; the buttons and wheel are the same code path.

### 2026-11-05: no elevations; the isolated floors get a pixel isometric

The user asked to remove the game view for the whole building and to add an isometric view for
each isolated floor (Basement to Level 4). Done:

- BUILDING now has one view, the three.js isometric of the whole block with its context; the
  GAME VIEW button is greyed with it, and choosing BUILDING while in the game view switches to
  ISOMETRIC. The elevation code stays in `scene.js` but is not reachable.
- `viewer/src/game/iso.js`: a pixel isometric of one floor from the same tile map as the plan.
  A 2:1 dimetric: every 0.5 m tile a 32 x 16 diamond, a storey 48 px; walls as blocks with the
  V1 cap and two faces (south lit, west shaded, a baseboard, the plainer outside face where the
  tile beyond is void), caps outlined on their outer edges only; glazing as blocks with a pane
  stripe and mullion edges; doors as a lower block under a header; columns merged over the tiles
  they cover and drawn as one block; furniture as boxes at their plan footprint and export height
  (chairs kept low), with a screen on computers and some desks and pinned sheets on pin-up
  boards; room labels at their tiles. Seen from one of four corners (azimuth 0 south-west, then
  clockwise, the three.js names), by mapping the tile grid into (u, v) axes; TURN L / TURN R and
  Q / E rebuild it from the next corner. Drawn crisp by scanline fills, no anti-aliasing. No
  people and no context in the isometric. Painter's order: the floor first, then everything
  standing by its nearest corner (u + v), far to near.
- `scene.js` takes `view` ("plan" or "iso") and `azimuth`; `fit` uses the drawn world size, so
  the isometric opens fitted as well. `embed.js` restarts the scene when the floor, view, corner
  or people count changes.
- `main.js`: one floor is always the Phaser stage now (ISOMETRIC = pixel isometric, GAME VIEW =
  pixel plan); the three.js controls that mean nothing there rest, turns rest in the plan.

Verified: Level 3 isometric opens fitted at a quarter zoom, turns to the south-east corner and
back to a quarter, zoom 2 detail is crisp (screenshots 17 and 18); GAME VIEW keeps people and
context; BUILDING is the three.js isometric with the game view greyed; no errors.

### 2026-11-05, later: the PROGRAM window

The user wants to describe the program for the simulation: each room's name, use and who may
enter, room by room and floor by floor, with the option to skip a room, have it flagged, and be
reminded of it later; the influential rooms first, service rooms afterwards. Built:

- `viewer/index.html` has a PROGRAM window; `main.js` runs it. The queue is the export's 77
  rooms ordered Level 1, 2, 3, 4, then Basement, largest first. Each room shows its level,
  number, area and id, and a form: name, use (a list that maps to the floor patterns), access
  (open, students and staff, staff only, restricted group, limited hours, nobody), who and when,
  notes. SAVE & NEXT (or Enter in a text field) keeps the entry and moves to the next room not
  yet opened; SKIP & FLAG keeps it on the FLAGGED FOR LATER list with an optional reason; BACK
  and NEXT step without saving; DEFER SMALL flags every unopened room under 8 m² at once.
- Stepping to a room shows its floor (the current view, plan or isometric) and lights the room
  in amber (`LevelScene.focusRoom`: tiles in the plan with an outline against other rooms,
  diamonds in the isometric), at zoom 1 at least, and selects it so the SELECTED window shows
  its Revit data.
- Saving goes through the dev server: `vite.config.js` serves `/program/*` from `../program`
  and takes a POST of the whole file at `/program/rooms.json`, writing `program/rooms.json` and
  regenerating `program/TODO.md` (the flagged rooms as a checklist). Local only, nothing leaves
  the machine; the export is untouched; the file is keyed by Revit room id.
- The labels feed back: a labelled room's name replaces "Room" on its label in the pixel views,
  its use picks the floor pattern (studio concrete, office wood, kitchen checker, hall grey), and
  the ROOMS list marks rooms done or later. Every page load puts a PROGRAM line at the top of the
  status window with the counts flagged and not yet labelled.
- Typing in the form no longer triggers the view keys (text areas and selects are excluded).

Verified in the pane with a test label and a test flag on Level 1 (written, reloaded, shown on
the label and in TODO.md), then removed so the owner starts from an empty program.

### 2026-11-05, evening: PROGRAM window corrections from first use

- Phaser's keyboard plugin listened to W, A, S, D and the arrows on the whole window, so typing
  in the form moved the map. The letter keys are gone; the arrows stay, but the plugin no longer
  captures events (`disableGlobalCapture`) and the camera ignores them while an input, select or
  text area has the focus.
- A room saved without a name now shows its use as its name (labels, ROOMS list).
- Access is now the school's own set: all campus students when they have class there;
  architecture students only; architecture students when they have class there; all architecture
  students any time (studio); professor office; staff only; bookable for classes or clubs; nobody.
  A separate OPERATION field holds business hours or 24/7. The "who" field keeps optional details.
  Stored as `access` and `hours` in `program/rooms.json`.

### 2026-11-06: the program moves to chat; first corrections to the model

The owner entered uses for 73 of the 77 rooms in the PROGRAM window and asked for it to be
removed: the rest is confirmed by room number in chat. Also from chat: room 10 on Level 3 is
the student lounge (Good Times and Waffle Times happen there); the door between it and the
kitchen (room 9) is missing from the model; the southern stairwell has an elevator; room 31 on
Level 2 is the women's washroom (not an office); room 5 on Level 3 is for photographing models;
room 6 holds the 3D printers; room 22 on Level 2 is a large classroom that also serves as crit
space; the studio needs card access (architecture students, professors, staff); crit rooms are
for architecture; the ground-floor lecture halls are more for other campus students.

- `scripts/apply_chat_2026-11-06.py` (run once) folded those into `program/rooms.json`, each
  entry naming its source. Blank access rules that follow from the general remarks (crit →
  architecture students with a class; studio → all architecture students; Level 1 classrooms →
  campus students with a class) were filled and marked `access_inferred` with the remark, so
  they can be confirmed. The owner's explicit entries were not touched. The file as it was
  before the script is kept as `program/rooms.before-chat-2026-11-06.json`.
- `program/edits.json` starts the corrections file the handover asked for: E1 adds the lounge
  to kitchen door on wall 1229097 (position inferred: the middle of the wall, 0.9 m); N1 records
  that the model already has the elevator in the south core on every level, so nothing changes.
  `scripts/rasterise.py` reads the edits and draws an added door like any other (flagged
  `edit: true` in the tiles); the export is untouched. The tiles were rebuilt.
- The pixel views now draw the elevator car (metal top, two doors on its face; a block in the
  isometric) instead of leaving the shaft empty, since the owner looked for it.
- New uses `lounge` (wood floor) and `photo` (hall grey).
- `scripts/program_todo.py` regenerates `program/TODO.md`: flagged rooms, rooms labelled
  without an access rule, rooms with an inferred rule, rooms without an operation, and a
  per-level summary. It replaces the panel's reminder; the viewer's status window still shows
  the counts on every load, and the ROOMS list shows the program names with `later` and
  `access?` marks.
- Removed: the PROGRAM window, its form code, the POST endpoint in `vite.config.js` (the
  folder is served read-only now), the form styles.

### 2026-11-06, later: washroom names

From chat: washrooms are "Men's WR" or "Women's WR" when the gender is known, "WR" when not.
`scripts/apply_chat_2026-11-06b.py` renamed every room with use `wc` that way (14 and 38 Men's
WR; 16 and 31 Women's WR; 66 and 67 WR), and the WR use label is "WR" in the viewer so an
unnamed washroom reads the same.

### 2026-11-06, evening: objects and activities, starting with the Level 3 crit rooms

Asked: outline the objects in the model (Level 3 first) and how agents interact with them,
knowing that some are not modelled (pin-up boards, projectors in the crit rooms). The export
was counted per room: the studio holds nearly everything (172 desks, 206 chairs, 36 boards, 27
tables, 20 computer stations, printers, bins, sofas); crit room 1 has one classroom table (a
3 cm placeholder family), a computer station and 20 chairs; crit room 4 two tables and 11
chairs; the kitchen two counters; the lounge a sofa, two benches and the keg fridge; offices 2
and 3, the photography room 5 and the 3D-printing room 6 are empty; there is no projector,
screen or wall pin-up anywhere.

Method chosen (README section 8): three layers under `program/`, all the owner's.
`affordances.json` is the catalogue of kinds and what an agent does with each; `objects.json`
adds what the model lacks, per room, with a placement rule and `inferred_position: true`;
`activities` on the room entry in `rooms.json` say what pulls people in and how the room is
arranged. Modelled pieces need no entry. Spots (where an agent sits or stands) will be derived
in code from these, never typed in.

From the owner, for both crit rooms: pin-up felt fixed directly to every opaque wall; a
projector in each room, its screen descending from a housing high on the short wall on the
door's side (the west wall in both); tables on casters, rolled aside or stacked top to top for
presentations; chairs turned and shifted as the groups cycle wall to wall; between crits,
chairs round the tables for history seminars and other classes, studio lectures and internal
slide presentations. The crit session's own parameters come from the studio-culture handover
notes, not read yet (the owner will import all handover notes later): recorded as `pending`.
Room 1's door into the kitchen (room 9) is confirmed, and room 9 opens on to the lounge (10).

- `program/affordances.json`: 15 kinds; pin-up wall, screen, projector, chair and the crit
  room table rules from the owner; the rest filled from general use and marked `inferred`.
- `program/objects.json`: O1 to O6 (pin-up walls, screens, projectors for rooms 1 and 4) and
  the furniture rules for both rooms.
- `scripts/apply_chat_2026-11-06c.py` (run once): three activities (crit, seminar, lecture)
  and notes on rooms 1 and 4.
- `scripts/rasterise.py` reads `program/objects.json` and places each object from the room's
  open floor tiles and the wall or column tiles beside them: felt as a 6 cm surface on the
  inside face of every opaque run of 1.5 m or more (runs end at doors and glass), the screen
  centred on the longest opaque run of its wall, the projector on the screen's centre line
  3.5 m into the room. Every placed piece is `inferred: true` with its object id and a `z`
  (height above the floor). Level 3 gets 10 pieces; the debug PNG shows them amber.
- The pixel plan draws felt on an east-west wall as a panel with pinned sheets on the wall's
  face, and edge on (a strip) on a north-south wall; the screen as a housing and a white sheet;
  the projector as a small box at ceiling height; every added object with amber dashes. The
  isometric draws them as blocks at their height with amber edges. Checked in the pane: felt on
  the far walls shows, felt on the walls nearest the camera stays behind them (compared the
  isometric with and without the added objects pixel by pixel).
- `scripts/program_todo.py` adds an "Objects and activities" section to `program/TODO.md`.
- Screenshots 19 to 21 (room 1 plan, rooms 1 and 4 isometric).

Open: the crit activity's parameters (handover import), the rest of Level 3 room by room
(lounge, kitchen, photography, 3D printing, offices, the studio's rules), then the other
floors; a run of the catalogue with the owner to confirm the general-use entries.

### 2026-11-06, night: kitchen and student lounge (Level 3 rooms 9 and 10)

From the owner, with a plan screenshot of the lounge: the door from crit room 1 leads through
a pass-through doorway with no panel in the wall across the kitchen (the model shows that wall
unbroken, a dead end one metre deep); the doorway from the kitchen to the lounge has no panel
either; counters along both kitchen walls (modelled), a fridge in the north-east corner, the
sink in the middle of the west counter (modelled), a microwave on each counter, kettles, a
coffee machine and other tabletop appliances, communal and not used by everyone. In the lounge:
a fridge in the north-east corner; the bar on the west side against the full-height service
shaft (the doorless enclosure in the model), two beers on tap, a counter longer than modelled;
church-pew benches with a high back against the studio desks on the south edge; a couch with a
coffee table in front (the model's "Bench2").

- `program/edits.json`: E1 is now a doorway without a leaf; E2 adds the pass-through opening
  in wall 1229363 on the centre line of door 1230417 (position inferred: in line, width taken
  from that door); N2 records the service shaft (walls 1232203, 1232024, 1231820, 1231709), no
  change. New edit kind `add_opening`; `leaf: false` on a door entry means no panel.
- `program/objects.json` (schema 2): O7 to O13 (kitchen fridge, two microwaves, kettle,
  coffee machine, lounge fridge, pew bench) with three new placement rules: a room corner (on
  the room's main floor, so the kitchen's cut-off lobby does not count), on a modelled counter
  at a fraction along it, and a box in model metres (the pew along the north edge of desks
  1359773 to 1359775). A `rekind` table gives the owner's kind to modelled pieces the family
  name misnames: 1360412 coffee table, 1359220 bar, 1360331 and 1360332 beer taps (kind
  inferred, drawn amber). Rules: communal appliances; the bar longer than modelled.
- `program/affordances.json`: sink, fridge, microwave, kettle, coffee machine, bar, beer tap,
  pew bench, coffee table. `use_share` on the communal appliances is pending.
- `scripts/apply_chat_2026-11-06d.py` (run once): notes and activities on rooms 9 (heat food
  and make drinks; event preparation, pending) and 10 (Good Times, Waffle Times, everyday
  lounge use, all with their parameters pending).
- `scripts/rasterise.py`: `add_opening`, the leaf flag, the sink as its own kind, rekinds
  (with a `z` for every piece), the three placements. Level 3: 19 inferred pieces.
- Viewer: a doorway without a leaf is drawn open under its header in the plan (jambs amber
  when it is an edit) and in the isometric; sprites and iso colours for the nine new kinds (the
  pew with its high back, the bar with a brass rail, the tap tower, the white fridge).
- `scripts/program_todo.py` lists inferred rekinds. Screenshots 22 and 23.

Still to ask: the long 1 m high piece along the kitchen wall (Family5) and the 2.3 m piece
along the glass (Family9), whether the UOKR124 pieces are the taps, how long the bar is, the
open south and west edges, what Good Times and Waffle Times are (when, how many, who, served
from where), everyday use, and the access and hours of both rooms.

### 2026-11-06, night, later: lounge answers

From the owner: the long piece along the kitchen wall is a kitchen- or bar-height serving
table; the taps are the two squares with a small faucet behind the bar (the UOKR124 pieces,
no longer a guess); the piece along the glass north of the couch is another couch or bench;
the bar counter extends to match the shaft wall while leaving a pass-through to get behind it;
the lounge is open to the studio with nothing marking the edge but the back of the pew bench
and the backs of the studio desks; everyday use is lunch, social space and group work; the
Good Times and Waffle Times schedule comes with the handover document; the entire floor is
behind key card from the stairwell.

- `program/objects.json`: rekinds 1359756 serving_table and 1359762 seating; the taps' kind
  is the owner's now; O14 carries the bar counter 0.46 m south to the shaft wall's end over the
  keg fridge, with the pass-through read as the existing gap between the counter's north end
  and the bench (inferred, noted); rules for the bar and the open edges.
- `program/affordances.json`: serving_table (its use at events inferred); beer_tap confirmed.
- `scripts/apply_chat_2026-11-06e.py` (run once): `floor_access` note on all eleven Level 3
  rooms; kitchen and lounge access `arch_all`, marked inferred from the floor-wide key card;
  the lounge's everyday activity and the two events' pending notes updated; notes extended.
- Viewer: serving table sprite and iso colour. Screenshot 24.

Open: the event schedule (handover import); the hours of the floor (24/7 was not stated);
the rest of Level 3 (photography 5, 3D printing 6, offices 2 and 3, the studio's own rules).

### 2026-11-06, night, later still: photography room (5) and 3D-printing room (6)

The model has two empty 2.5 m square windowless cells against the east side by the stair core,
the 3D-printing room entered from the studio and the photography room entered only through it.
From the owner: on the wall opposite the window (the west wall; the east wall covers the window)
a shelf with at least six small 3D printers; any architecture student may use them and brings
their own filament; people come back to collect once the print ends; unforeseen problems stop
prints; when the printers are very busy a student moves another's work aside. The photography
room has a backdrop that drops down, a table and some lights, nothing else.

- `program/affordances.json`: shelf, 3D printer (start a print, collect, move another's work
  aside; print duration and failure share pending), backdrop, photo light (two assumed); the
  table gains the photographing use.
- `program/objects.json`: O15 shelf on the west wall of room 6 (size assumed), O16 six
  printers spread along it, O17 backdrop on the south wall of room 5 (the wall is assumed:
  opposite the door), O18 the table in front of it, O19 and O20 two lights either side (count
  and places assumed). Two placement rules: against a wall at any mount (high, shelf, floor)
  with a depth, and count pieces along the top of another added object.
- `scripts/apply_chat_2026-11-06f.py` (run once): room 6 access `arch_all` (the owner's: any
  architecture student), room 5 `arch_all` inferred from the floor key card and the route
  through room 6; notes and the print and photograph activities, parameters pending.
- Viewer: sprites and iso colours for the printer, backdrop and light; an added object's face
  is as tall as its own height. Two drawing fixes the shelf exposed: a piece standing on
  another is drawn in its base's strip after it (printers on the shelf, microwaves on the
  counters), and a strip's canvas now grows upward to hold a deep piece or a raised one
  instead of clipping it. Screenshots 25 to 27.

### 2026-11-06, night: a desk in every individual office, all floors

The owner: the offices on all floors are likely individual offices; put a desk in each based on
the size of the room, and ask when unsure. The program has 43 offices (14 on Level 2, 2 on
Level 3, 27 on Level 4), all empty in the model.

- `program/objects.json` gains `by_use`: a rule that applies to every room of a use in the
  program. The office rule puts a desk sized by the room's area (1.4 by 0.7 m up to 12 m2,
  1.6 by 0.8 up to 18, 1.8 by 0.8 up to 25) along the longest opaque wall that has no door,
  pulled off the wall by a chair's depth, with the chair between wall and desk so the occupant
  faces the room; every piece is flagged inferred (which wall, the sizes and the facing are
  assumed). Offices above 25 m2 are left for the owner: rooms 32 (28 m2), 33 (55), 34 (162),
  35 (56) on Level 2 and 55 (34) on Level 4 may be shared or something else. 38 offices got a
  desk and chair.
- `scripts/rasterise.py` reads the program's uses and applies the rules by use after the
  per-room objects.
- `scripts/apply_chat_2026-11-06g.py` (run once): an office-work activity on the 38 offices
  (occupant, hours and office-hours visits pending) and a note on the 5 larger ones.
- Checked on Level 4 in the plan: a desk and chair in every office, against the wall away
  from the door. Screenshot 28.

Open: what the five large "offices" are; whether the offices are professors' (access
`professor`) and their hours; the studio's own rules on Level 3; then the other floors' rooms.

### 2026-11-06, night: offices, second word

From the owner: the large offices have shared desks, number unknown; in the individual offices
the desks usually face the door; on the fourth floor in particular there may be another counter
along the window; a visitor chair at the desk; some shelving in each, as an assumption.

- The office rule in `program/objects.json` now puts the desk along the side opposite the
  door (window or wall), pulled off it by the chair, so the occupant faces the door; a visitor
  chair across the desk; a 0.9 m shelving unit on an opaque wall without a door, at an end of
  its run clear of the desk; and on Level 4 a 0.5 m counter along the glazed side (panes and
  mullions as one run), with the occupant's chair pulled clear of it. Every piece is flagged
  inferred; the shelving and the counter carry the owner's words as `assumption`. 38 offices:
  38 desks, 76 chairs, 38 shelving units, 18 window counters (the Level 4 offices with glass).
- Rooms 32, 33, 34, 35 (Level 2) and 55 (Level 4): "shared desks, number unknown" as a rule in
  objects.json and a note and a pending shared-office activity in rooms.json; nothing placed.
- `scripts/apply_chat_2026-11-06h.py` (run once) updated the notes and activities.
- `scripts/rasterise.py`: edge runs take the struct codes to match (walls, glass, columns).
- Checked on Levels 4 and 2 in the plan. A piece right against a south wall (Level 2 room 25's
  chair) stands behind that wall's face in the plan view, the V1 projection's nature; the
  isometric shows it. Screenshot 29.

Open: the count of shared desks in the five large offices; the offices' access (professor or
staff) and hours; the studio's own rules on Level 3; the other floors' rooms.

### 2026-11-06, night: offices are professors'; two Level 2 walls the model lacks

From the owner: the offices are professors', business hours, the professor and their guests;
room 32 has desks along the north wall (game view north up); room 33 just needs some desks to
show the program; a wall should divide rooms 31 and 30, with a small kitchenette on room 30's
side; the wall between room 38 and rooms 36, 37 and 35 is missing.

- `scripts/apply_chat_2026-11-06i.py` (run once): all 43 offices `professor`, `business`,
  who "the professor and their guests"; notes on rooms 30, 31, 32, 33, 38.
- `program/edits.json`: new kind `add_wall`, a wall between rooms painted one tile thick on
  the `wall_on` room's side of the shared boundary. E3 between the women's washroom (31) and
  crit room 30, on the washroom's side (9 tiles); E4 between the men's washroom (38) and rooms
  36, 37, 35, on the washroom's side (10 tiles). Both positions inferred (thickness and exact
  line not given); the tiles name the edit in `src`, and the tile file lists them under
  `walls_added`. Both washrooms keep their doors from the west corridor.
- `program/objects.json`: O21 a 1.8 m kitchenette counter on room 30's side of the new wall
  (size and contents assumed); O22 desks along room 32's north wall, as many 1.6 m desks as fill
  it (four), each with a chair on the room side; O23 four desks in two facing pairs at the
  centre of room 33. Both counts stand in for the real ones (`count_unknown`). Two placement
  rules: a row along a wall, a cluster at the centre.
- Checked on Level 2 in the plan. Screenshots 30 to 32.

Open: the real desk counts in rooms 32, 33, 34, 35 and 55 (nothing yet in 34, 35, 55); the
studio's own rules on Level 3; the other floors' rooms; the handover import.

### 2026-11-06, night: the studio's rules

From the owner: the studio's desks and pin-up boards are on casters, not typically moved during
the semester, but the simulation gets a toggle that makes them movable; the board at the end of
each bay is more a divider; presence over time and the cohort ratios come with the handover;
the eastern desks and the southernmost area are third years, the middle first years, the
northernmost second years, generally; the four tall pieces along the lounge edge are the pews;
beside the plotters at the north end there are three large printers (8.5x11 and 11x17); the
desktop computers mid-floor are primarily for printing to the plotters; all of it is used by
all students, so printing is concentrated in that one area for the whole floor; service shafts,
closets and similar service areas are not occupiable.

- `program/objects.json`: `toggles.movable_furniture` (off by default); rules for the studio
  (desks and boards: casters, movable by toggle, the board a divider; the printing area); the
  pews rekinded from the four 'Family7' pieces (1359757 to 1359760) and the added O13 withdrawn;
  O24 to O26 the three printers west of the plotters (places assumed); `zones` for the studio:
  year 3 east of x 18.5 m and south of y -19, year 1 between y -19 and -3, year 2 north of y -3,
  the lines assumed as thirds of the length; `global_rules.service_areas`.
- `scripts/rasterise.py`: every desk and chair of a zoned room carries `cohort`, its zone and
  `cohort_inferred` (Level 3: 40 desks year 1, 44 year 2, 88 year 3); a `no_go` list per level
  of tiles nobody may occupy: rooms whose use is service or elevator, and enclosed floor
  cavities without a door (the shaft behind the lounge bar, 11 tiles; smaller cavities on the
  other floors). The viewer's people treat them as occupied.
- `program/affordances.json`: printer (plotters and printers, all students), computers (send a
  print), the pin-up board as divider, the desk's casters and zone, the pews modelled.
- `scripts/apply_chat_2026-11-06j.py` (run once): the studio's notes and three activities
  (desk work by cohort, printing, desk crit), parameters pending with the handover.
- The printers first landed inside office 2 (a tile dump misread); moved to the studio side of
  the partition and checked. Screenshots 33 and 34.

Open: what the two 5 cm casework tops near the large tables are (ids 1360052, 1360064, at
counter height), and the two small 'Family11' pieces on something at 0.9 m beside the plotters
(1360036, 1360037); the cohort ratios, presence over time and crit parameters (handover).

### 2026-11-06, night: the southern elevator is usable

From the owner: people should be allowed to use the southern elevator. `global_rules.elevator`
in `program/objects.json` says so; the no-go rule now covers service rooms and doorless
cavities only; the rasteriser flags the elevator car `transit` on every level, and the viewer's
people may walk into it (the car is the one modelled piece whose tiles are not occupied). The
elevator's affordance names the owner as its source.
The car's tiles have no slab under them (the shaft is void in the model) and are ringed by walls
and stair tiles, so the walkable rule takes a transit tile whatever is painted under it. The
wandering placeholder people still do not reach it, since stair tiles are not walkable for
them; reachability of the elevator and the stairs is the simulation's path model, to come.

### 2026-11-06, night: the first simulation piece, stairs and the elevator

Asked: build the elevator and stair path model as the first simulation piece, with the
elevator serving people first come first served and picking up people on the way when they go
the same way. Nothing of the simulation existed before this; the viewer only had placeholder
wanderers on one floor.

- `program/simulation.json`: the parameters, every number marked assumed until the owner or
  the handover confirms it: the elevator (capacity 6, 3 s per floor, doors 5 s open and 1.5 s
  to move, 1.2 s per person boarding, collective control), walking (1.3 m/s, 18 s per floor on
  the stairs), the stairs-or-lift choice (stairs for one floor 80 % of the time, the lift for
  more 70 %), and the test agents (12, dwelling 20 to 90 s between trips).
- `viewer/src/sim/grid.js`: a floor as a walkable grid from its tiles: floor and door tiles
  walk, stair tiles walk slowly, the elevator car's tiles are transit, furniture and no-go
  tiles block; eight directions without cutting corners; the floor's connected pieces, agents
  living on the largest.
- `viewer/src/sim/path.js`: A* on a floor.
- `viewer/src/sim/building.js`: the levels bottom to top; each stair's tiles on the level it
  starts from become a portal to the tiles over its far end on the level above, with an entry
  tile beside it, and the reverse portal down (46 portals: two cores on every level, three runs
  each); the elevator's landing on every level is the walkable tile beside the car with the
  most open neighbours, since the model does not say which side the doors are on (inferred).
- `viewer/src/sim/elevator.js`: collective control. Landing calls carry a floor and a
  direction, car calls a floor; the car keeps its direction while any call lies ahead, stopping
  for car calls and for landing calls its way when it has room, so it picks up people going
  the same way; it reverses only when nothing is left ahead, and idle it answers the oldest
  call. Doors are held for someone who can board; a full car wipes nobody's call (the waiters
  press again) and is not held open by people it cannot take.
- `viewer/src/sim/sim.js`: the agents and the loop. A test agent picks a destination on
  another floor, chooses stairs or lift by the rule (or the window's setting), walks the A*
  path, climbs hop by hop or presses the button and waits, boards first come first served
  when the doors open at its floor and the car goes its way, steps out at its floor, walks on,
  dwells, repeats. A log of what each agent and the lift do, and counts.
- `viewer/test/sim-smoke.mjs`: a headless run in Node (`node test/sim-smoke.mjs 3600 12 auto`
  from viewer/). An hour with 12 agents: 276 trips, 146 by lift, 43 of 147 boardings picked up
  on the way, wait 52 s on average and 240 s at most, the car busy all the time (doors take 8 s
  a stop). 30 agents on the lift alone saturate it (wait 288 s on average): the demand of the
  test agents is far above the building's, and the handover's presence will replace it.
- The page: a SIMULATION window (START, PAUSE, RESET, speed 1x/5x/20x, agents, stairs or lift
  by rule / lift only / stairs only, the counts and the last log lines). The scene draws the
  agents of the floor on show as the people sprites with their number, those in the car at the
  car's place when it is on that floor, and marks the car (grey elsewhere, amber here, green
  with the doors open) with its floor, way and load, and the landing tile in amber. The
  placeholder wanderers rest while a simulation runs.
- Bugs found by the smoke test on the way: an agent spawned in a closed pocket re-planned
  without end (spawn and goals now on the floor's main piece, a failed plan waits a tick); the
  full-car call wipe and door hold above; boarding order by agent number (now by waiting time).
- Checked in the pane on Level 3: the car marked in the south core with "LIFT Basement v 1/6",
  an agent waiting at the landing, the window counting. Screenshots 35 and 36.

Open: the elevator's real capacity and timings; the door side of the car; whether the stairs
are walked at the assumed pace; the agents' schedules (activities and the handover) in place
of random trips; drawing the agents in the isometric.

### 2026-11-06, night: the other crit rooms by rule

From the owner: the smaller crit rooms in the basement and on the second floor are similar to
the ones on the third floor, and the same interactions are enough for now.

- `program/objects.json` by_use `crit`: every crit room without its own felt, screen or
  projector gets Level 3's set: pin-up felt on every opaque wall, a screen high on the short
  wall on the door's side (room 21 has no door and no short opaque wall in the model, so its
  screen went on the north wall, marked guessed), a projector facing it. Rooms 19, 21 and 30
  on Level 2 and 72 and 73 in the Basement. Tables and chairs are not placed (number unknown).
- `scripts/apply_chat_2026-11-06k.py` (run once): Level 3's crit, seminar and lecture
  activities on those five rooms, and a note.
- `scripts/rasterise.py`: the crit set; a by_use rule skips a room only when the room's own
  objects are of the kinds the rule places (room 30 has the kitchenette and still got its set).
- Checked on Level 2 room 30 in the plan: felt on the north wall and beside the kitchenette on
  the new west wall, the screen edge on above the counter, the projector mid-room.
  Screenshot 37.

### 2026-11-06, night: tables and bookings for rooms 21, 22, 72, 73

From the owner: rooms 21 and 22 (Level 2) and 72 and 73 (Basement) have the same tables as the
third floor crit rooms; they are booked for reviews or for a class lecture or discussion, and
student organizations or clubs can use them too.

- `program/objects.json`: O27 to O30, a `table_set` placement: pairs of the Level 3 crit
  rooms' SALA 60x90 in tables pushed together at the room's centre with ten chairs round each
  pair, one pair in 21, 72 and 73, two in the large classroom 22; the counts stand in
  (`count_unknown`). Rules for the four rooms: tables on casters, stackable, chairs turned
  wall to wall, as on Level 3. Room 22 joins the crit rule (`also_rooms`): felt on its opaque
  walls, a screen (on the south wall, guessed: no door on a short wall), a projector.
- `scripts/apply_chat_2026-11-06l.py` (run once): the four rooms' access `bookable`, who
  "booked for reviews, class lectures and discussions; also student organizations and clubs",
  and three activities (review, class, club meeting) with parameters pending.
- Checked on Level 2 room 22 in the plan. Screenshot 38.

Rooms 19 and 30 keep the crit set without tables and their inferred access, as the owner did
not list them.

### 2026-11-06, night: room 19 matches; room 22 in rows

From the owner: room 19 should match rooms 21, 72 and 73; room 22 should have rows of the same
tables with more chairs, at least five rows if possible, to see how that fits.

- Room 19: a stand-in pair of the Level 3 tables (O31), the casters rules, access bookable and
  the review, class and club activities (`scripts/apply_chat_2026-11-06m.py`, run once).
- Room 22: a `table_rows` placement: rows of tables across the room facing the screen's wall
  (south, guessed), three chairs behind each table, as many rows and tables per row as the
  room allows. Five rows do not fit: a 1.57 m table and a chair row need 2.25 m before any
  gap, and the room is 11.5 m deep. With 1.2 m clear at the front and 0.5 m behind each chair
  row three rows fit; with 1.0 m and 0.3 m four rows fit, three tables each, 36 chairs. Set to
  the tight four, every count marked as following from the room, not the owner.
- Checked on Level 2 in the plan: four rows of three tables, chairs behind, facing the screen wall. Screenshot 39.

### 2026-11-06, night: room 22 turned

From the owner: rotate the tables 90 degrees; the drop-down projector screen is on the wall
opposite the window, so the rows are long ones.

- The crit rule takes `screen_wall` per room: room 22's screen is on the east wall, opposite
  the glazed west wall; the projector faces it.
- Room 22's rows now run north to south facing east, the tables' 2.29 m side along the row,
  four tables a row along the 11.5 m depth, chairs on the west side of each table. Across the
  8.5 m width a row needs 2.35 m plus a gap: with 0.85 m clear in front of the screen and
  0.3 m behind each chair row three rows fit, the last against the window; set so (three rows
  of four, 36 chairs). A per-room layout reads the rule's screen wall when it runs before the
  rule has placed the screen.
- Checked on Level 2 in the plan: three long rows of four tables, chairs on the west side, the screen on the east wall. Screenshot 40.

### 2026-11-06, night: room 22's tables half as deep

From the owner: the tables should be half the depth, so more rows fit; they are on casters.
Room 22's tables are now 2.29 by 0.78 m (rule and O28): four rows of four with 48 chairs fit
across the 8.5 m width with 0.85 m clear at the screen and 0.3 m behind each chair row; five
would leave no space to walk behind a row.
- Checked on Level 2 in the plan: four long rows of four shallow tables, chairs on the west side, facing the east wall. Screenshot 41.

### 2026-11-06, night: room 15, the lecture set-up

From the owner: room 15 is a lecture set-up, two projection screens on the long wall opposite
the doors, a speaker's laptop in the middle between them, and rows of tables and chairs facing
them like room 22.

- `program/objects.json` O32 to O38: two screens high on the east wall at three and seven
  tenths of its length, the speaker's table centred between them against the wall with a
  laptop on it, two ceiling projectors each facing its screen, and rows of the shallow tables
  on casters facing east: four rows of up to five tables, 20 tables and 60 chairs, with 1.3 m
  clear in front for the speaker. Three new placement options: `along` for a piece at a point
  of a wall, `screen_object` for a projector aimed at one of several screens, `front` for rows
  in a room without a screen rule; a table that would stand on a column is left out.
- `scripts/apply_chat_2026-11-06n.py` (run once): the room's note and a lecture activity
  (class sizes, timetable and other bookings pending).
- Checked on Level 1 in the plan: four rows of five tables facing the east wall, the speaker's table with the laptop between the screens, the projectors mid-room. Screenshot 42.

### 2026-11-06, night: room 15 condensed; rooms 12 and 13

From the owner: condense room 15, less space or smaller tables, so the four rows fit with room
to spare; rooms 12 and 13 both have two projection screens on the short wall opposite the door
and several rows of lecture seating with tables not as deep as a typical desk, the count
unknown and to be estimated from the size.

- Room 15: tables 1.8 by 0.6 m, 0.15 m between tables, 0.25 m behind each chair row: four
  rows of seven, 28 tables and 84 chairs, 1.3 m clear in front.
- Rooms 12 and 13 (O39a to g, O40a to g): two screens high on the short wall opposite the
  doors (room 12's north wall, its doors being on the south; room 13's south wall, its doors on
  the north), a speaker's table with a laptop between them assumed as in room 15, two ceiling
  projectors, and rows of the same shallow tables facing the screens: eight rows of four,
  32 tables and 96 chairs in each. All counts follow from the rule and the room's size.
- `scripts/apply_chat_2026-11-06o.py` (run once): notes and a lecture activity on 12 and 13
  (class sizes, timetable, other bookings and the west side's glazing or wall pending).
- Checked on Level 1 at half zoom: the three lecture rooms in rows facing their screens. Screenshot 43.

### 2026-11-06, night: solid west walls on Level 1; shallower lecture tables

From the owner: the west side of rooms 12 and 13 is a solid wall; their tables could be less
deep, like room 15's, so a bit of the floor still shows.

- `program/edits.json` E5 and E6: `add_wall` against the outside on the west side of rooms 12
  and 13, painted one tile thick on the room's side wherever its west edge had no structure
  (the model had a strip of slab there and then nothing); thickness and line not given. The
  walkable grid no longer lets anyone out of the building there.
- Rooms 12 and 13: tables 1.8 by 0.45 m with 0.4 m of floor behind each chair row: eight rows
  of four in room 12 (32 tables, 96 chairs), nine rows of four in room 13 (36 tables, 108
  chairs), by the rule.
- With the new west wall taking half a metre of each room, the rows hold three tables: room 12: 8 rows, 24 tables, 72 chairs; room 13: 9 rows, 27 tables, 81 chairs. Checked on Level 1 room 13 in the plan. Screenshot 44.

### 2026-11-06, night: room 13's north wall

From the owner: room 13's north edge is a wall with the two doors in it. `program/edits.json`
E7 paints it on the room's side of the edge wherever it was open; the two modelled doors stay
as openings. Room 13 is now closed on every side.

### 2026-11-06, night: the washrooms by rule

From the owner: design the washrooms, approximately four stalls and three sinks.

- `program/objects.json` by_use `wc`: stalls 0.9 by 1.5 m along the longest opaque wall
  without a door, each with its toilet against the wall, and a 0.55 m counter with sinks along
  another wall, opposite the stalls where it can be; fewer where the wall is shorter. The six
  washrooms: 14 and 16 (Level 1) four stalls and three sinks; 31 (Level 2) three stalls and
  three sinks; 38 (Level 2) three stalls and one sink, its free walls being short; 66 and 67
  (Level 4, 8 m2) two stalls and three sinks. Counts approximate by the owner's word, walls
  by rule, sizes assumed.
- `program/affordances.json`: stall (use, 2 to 6 min, one at a time); the sink's washroom use.
- `scripts/apply_chat_2026-11-06p.py` (run once): a washroom activity on the six rooms
  (frequency and urinals pending).
- Viewer: a stall sprite (pale floor, partitions, the toilet) and its iso colours.
- Checked on Level 1 room 16 in the plan: four stalls along the north wall with their toilets; the sink counter on the south wall stands behind that wall's face in this projection. Screenshot 45.

### 2026-11-06, night: the washrooms, second pass

From the owner: in 31 the stalls along the wall farthest from the door, the sinks on the small
partition facing the stalls; in 38 the stalls where they make sense without blocking the door,
the small U-shaped space would work; on Level 1 the stalls at the corner, or in 14 against the
back wall like 31; 66 and 67 are probably single washrooms by their size.

- The washroom rule now puts the stalls along the opaque wall farthest from the door tiles,
  aligned to the end farthest from the door, with per-room overrides: 31 stalls on the south
  wall and sinks on the partition's south face (`sink_run: inner`); 14 stalls on the east wall
  and the sink on the partition facing them; 16 stalls along the north wall at its east
  corner; 66 and 67 single, one toilet and one sink each. A sink run must hold at least one
  sink or the next wall is tried.
- Room 38 by hand (O41 to O45): the U-shaped pocket north of the main space as one larger
  stall, two stalls against the west wall of the main space facing east, a counter with two
  sinks against the south wall, all clear of the west door lobby and the east door; the rule
  skips the room since it has its own pieces (rules now name the kinds they place).
- Counts now: 14 three stalls and one sink; 16 four and three; 31 three and three; 38 three and two; 66 and 67 one and one. Checked 31 and 38 on Level 2 in the plan. Screenshots 46 and 47.

### 2026-11-06, night: the stair closed off; washrooms, third pass

From the owner: the small room beside stair 18 is unknown but should not be open to the stair,
the stair is separate; 38 looked wrong with the sink blocking circulation (smaller stalls
against the wall, or a urinal per the code); no sinks on top of stalls in 66 and 67; in 16 the
sink could not be seen and may have been under a stall.

- `program/edits.json` E8: `add_wall` round the stairs of room 18 on Level 1: every open tile
  of the room that touches a stair tile becomes wall (16 tiles), with a 1 m doorway and door
  cut in the middle of the west run so the stairs are entered from the lobby (place assumed).
  The two pockets east of the stairs end up enclosed without a door and count as service
  space. The rasteriser applies these walls after it paints the stairs.
- Room 38 re-laid (O41 to O46): two 0.75 by 1.2 m stalls side by side in the U-shaped pocket,
  two urinals on the west wall of the main space, one sink on a counter against the east wall
  south of the east door; the path from the west door lobby to the east door is clear. New
  kind `urinal` (affordance, sprite, iso colour).
- The washroom rule: a sink counter is placed only where it is clear of every stall, moving
  along its wall or to another wall, with fewer sinks if need be; the single washrooms 66 and
  67 get a 0.8 by 1.2 m toilet space; the sinks avoid the south wall when another wall will
  do, since the plan view hides what stands against it (room 16's three sinks were there, not
  under a stall; now one sink on the east wall where it shows). Washroom counters are plain.
- Counts now: 14 three stalls and one sink; 16 four and one; 31 three and three; 38 two stalls,
  two urinals, one sink; 66 and 67 one and one.
- Checked: Level 1 stair 18 walled off from the lobby with its door and from the east pockets (now not walkable); room 38 at zoom 3; room 31 with its plain counter. Screenshots 48 and 49.

### 2026-11-06, night: the stair enclosure put right; three translation errors fixed; an enclosure audit

The owner marked the Level 1 south stair: the walls I had added east of the stairs would block
them, and the stair's north end stood open to the corridor; and asked for a recheck of all the
geometry between rooms and why such errors from model to pixel occur. Three causes, all in
`scripts/rasterise.py`, all fixed:

- A thin wall (the model's 165 mm partitions) lying on a tile boundary has no tile centre within
  its painting reach (0.22 m against 0.25 m to the centres), so stretches of it vanished. Walls
  now also paint every tile their centreline runs through. Wall tiles rose by a fifth on every
  level (Level 1 from 329 to 420). The same for doors: a door in such a wall cleared nothing,
  which is why room 13's two doors had no tiles; a door now opens the tiles its own line runs
  through as well. Every door on every level has tiles now.
- Stair runs painted over whatever was there, including the wall at a stair's end, which is
  how the south core's north end was open to the corridor on every level. Stairs now paint only
  open tiles.
- Stair landings were not painted at all (the export has them); the spaces east of the Level 1
  south stair that I took for pockets were its landings. Landings are painted as stair tiles.

Edit E8 now closes the stair off from the lobby only (`sides: ["west"]`, 6 tiles, a 1 m door),
as the owner's markup shows; the landings stay open to the runs.

`scripts/check_enclosure.py` writes `program/enclosure-report.md`: for every room, the open
edges to other rooms, the corridor or the outside (side, length, what lies beyond), rooms with
no door, and rooms whose open floor in the tiles is under half Revit's area. After the fixes
the only findings are the lounge's open sides to the studio (meant), Basement shop 74 without
a door (asked), and Level 3 office 3, whose only door tile sits in the corner where its north
and east walls meet and does not reach the room: a wall-corner door in the model, to look at.
Checked the Level 1 south stair in the plan against the owner's markup. Screenshot 50.
Correction: after the door fix Level 3 office 3's door opens into the room, so the audit's findings are the lounge's open sides and shop 74 only.

### 2026-11-06, night: the lobby wall withdrawn; room 34 as a placeholder office

The owner marked the Level 1 south stair again: the wall between the lobby and the stairs
blocks the runs, which are entered from the lobby. Edit E8 is withdrawn (kept in the file with
the reason; the rasteriser skips a withdrawn edit). The gap it was meant to close was the
stair-over-wall fault, fixed earlier today, so nothing is lost: room 18 is enclosed by the
model's own walls, and the stairs are reached from the lobby as before.

Room 34 on Level 2 (162 m2, L-shaped, 'office'): the owner asked for it to be populated like
an academic administrative office as a placeholder, and noted as such. `program/objects.json`
O47, a `boxes` placement of 32 hand-laid pieces in model metres: a reception counter inside the
east door with the receptionist's and two visitors' chairs, six workstations in three facing
pairs, a meeting table with six chairs, three shelving units along the north wall, a printer,
a waiting bench in the middle part, two desks in the south part. Every piece carries
`placeholder: true`. `scripts/apply_chat_2026-11-06q.py` (run once): use admin, access staff,
a PLACEHOLDER note, and three activities (administrative work, a visit to the reception, a
meeting) with their parameters pending. The office rule leaves the room alone, as before,
being over 25 m2.
- Checked: Level 1 stair 18 with the runs open to the lobby and the core closed by the model's walls; room 34 with its placeholder layout. The enclosure audit still finds only the lounge and shop 74. Screenshots 51 and 52.

From the owner: a placeholder is flagged in the code or in a note, never in the room name. Room 34's name is "Administrative office"; the note and every piece keep the flag.

### 2026-11-06, night: the Basement shops

From the owner: no game view for the whole building (a general note: the page already offers
BUILDING as the isometric only, the GAME VIEW button disabled for it); there are unknowns in
the Basement; 74 is the workshop, more wood tools and one metal bending tool; 75 is the
assembly room for models; both have hours since they need supervision; the other rooms will
be confirmed later.

- `program/objects.json` O48 (room 74, 13 pieces): workbenches along the north wall and
  mid-room, a table saw with room round it, a band saw, a drill press and a sander towards the
  east wall, the metal brake and a dust collector on the south wall, material racks on the east
  wall. O49 (room 75, 22 pieces): six assembly tables with a stool on each long side, material
  shelving on the north wall, a cutting table. The kinds are the owner's; the tool list beyond
  "wood tools and one metal bending tool", the counts and every place are assumed and say so.
  New kind `machine` (affordance, sprite, iso colour), each piece naming its tool.
- `scripts/apply_chat_2026-11-06r.py` (run once): 74 "Workshop" and 75 "Model assembly room",
  access architecture students under supervision, hours business, activities (a workshop
  session, model assembly) with their parameters pending. Rooms 70, 71, 76 and 77 stay
  flagged. Room 74 still has no door in the model and its west side is open to the outside in
  the tiles, as the Basement's west edge is along 70, 74 and 77: to confirm, like Level 1's.
- Checked in the Basement plan: the workshop's benches and machines, the assembly room's six tables with stools; the GAME VIEW button is disabled for BUILDING. The Basement's west edge along 74 is a wall now (the thin-wall fix), so only 74's door remains open. Screenshots 53 and 54.

### 2026-11-06, night: the building view's controls; a floor on the floors below; the entrances

From the owner: with the whole building, GAME VIEW turned it into the elevation; GAME VIEW,
TURN L and TURN R must not be options for the building view, while an isolated floor has every
view. Could a floor's isometric show the rest of the building below that floor's cut and the
context? And the south door in the game view is the one with 24/7 key-card access; the other
doors lock and have no scanner.

- The page: the three buttons are disabled whenever the whole building is on show (on load
  too, which was the gap: the earlier code only disabled GAME VIEW when a level button was
  clicked), the keys Q and E do nothing then, and the building keeps its one corner.
- A floor's isometric now stands on the floors below it: each lower floor's isometric is built
  (cached per floor and corner) and placed one wall height lower per storey, aligned through a
  shared model point; the surroundings are the plan context canvas drawn under the
  isometric's affine map as a ground plane at Level 1, with storeys below grade under it;
  floors above are cut away. A VIEW checkbox, "Floors below and surroundings (floor
  isometric)", on by default. The first show of a high floor builds several isometrics and
  takes a few seconds; after that they are cached. `embed.js` fetches every level's tiles once.
- `program/building.json`: the entrances. Level 1's six entrance doors are glass double doors
  set in the curtain walls (family Doors_Dbl_Glass_1), four on the east line and two on the
  west; they are curtain panels in the export, not doors, so the walkable grid had no way in.
  The rasteriser now opens a curtain wall over a panel whose type or family says door (six on
  Level 1, flagged `curtain_panel`). The southernmost, 1290443 in the east line near the south
  end, is taken as "the south door" with 24/7 card access, inferred and to confirm; the other
  five are locked outside business hours with no scanner.
- Two slips on the way, both caught: the new curtain-door loop reused the level's variable
  `name`, so one rebuild wrote every level under the name of a glass panel (the stray file is
  removed, the variable renamed); and a glass door panel's box sits beside its wall's line, so
  the door is now opened where the line is (the panel's centre projected onto the wall). All six
  entrance doors have four door tiles each. Enclosure audit unchanged: the lounge and shop 74.
- Checked: Level 2 and Level 3 isometrics standing on the floors below and the ground
  (screenshots 55 and 56); the building's three buttons disabled on load.

### 2026-11-06, night: the 24/7 door confirmed

From the owner: the 24/7 card door is the door to stair 18 from the outside. That is the
glazed double door in the south glazing of stair 18's lobby (1290443), the one taken as "the
south door": confirmed, no longer inferred. The tiles show what lies beyond it: Level 1's south
end, and mirrored its north end, is slab with a row of columns and no walls, a covered area
under the floors above, outside the envelope; the lobbies open onto it. `program/building.json`
now lists two outside doors on the stair lobbies (the south one with the card, the north one
locked outside business hours), the two west doors in the model at rooms 12 and 13 (to
confirm, since the owner called that wall solid), and the lobbies' two corridor doors as
interior glazed doors, not entrances.

### 2026-11-07: the research notes read in; traits only; the empty simulation interface

The research notes (`research/`, 13 files) were read in full and checked against the tool. No
tool edits came from that. Three owner facts were recorded in the notes: the 3D printers are on
the 3rd floor (the notes had them in the basement from the 2024 accreditation report), the 7
spare studio desks toward the middle are unclaimed hot desks, and history seminars (1.5 h) are
held in the crit rooms while most other-course lectures are in another building. Two design
decisions were taken in the notes, not the tool: agents are built from a Big Five draw plus
circumstances and four sampled variables (no personas as inputs), and the trait population is
a multivariate normal in general-population units with a design-field shift and a per-agent sex
shift from meta-analyses, to be replaced by a cohort survey.

Then the methodology for the tool was settled in chat (two time scales: a term layer over every
day of the term and a day run on the grid for the picked day; inputs, outputs, state; an avatar
later) and the interface was built empty:

- `viewer/index.html`: a left column (`#side`) with the title window and SCENARIO, RUN, ANALYSIS,
  AGENT, AVATAR and LOG; the right column keeps the model-check windows. The SIMULATION window
  of the first piece moved into RUN under "TEST PIECE: STAIRS AND LIFT" with its ids unchanged.
- `viewer/src/ui/panels.js`: draws the term calendar from `program/calendar.json` (studio days
  shaded, closures struck, reviews in red, last desk crits outlined, deadlines and events dotted,
  exams greyed), handles the day pick and the quick picks (normal week, last crit, midterm,
  final, Good Times), fills the metric table with the core set, and folds the lower windows in a
  narrow pane. Everything else is disabled with a "not wired yet" hint.
- `program/calendar.json`: the Fall 2026 term from the notes (B1, B2, B8–B11, C11, F9): dates,
  closures, sessions by year, reviews and last desk crits, phases, other-course deadlines, Good
  Times, Waffle Wednesday, Halloween, shop and business hours. Assumed dates carry `inferred`.
- `viewer/src/style.css`: the left column and the calendar, clock, metric table, trait bars.

Checked in the browser: no console errors; the calendar renders with the marks; picking a day
updates the description and the RUN clock; the test piece still starts. Screenshots 57–60.

### 2026-11-07, later: the interface as a console menu, in steps

The owner's design notes on the first empty interface: no model-check window; the work runs in
steps (pick a view, then the day, then run, then analyse); format it like the menus of vintage
Nintendo pixel-art games. The conventions taken from those games (Dragon Quest's command window,
Final Fantasy's cursor and cascading windows, Pokémon's START menu and text box, SimCity SNES's
advisor messages): one bordered window per task, opened in place and closed with B; a vertical
command list with a cursor on the current line; earlier choices shown on their lines; a message
box along the bottom that says one thing at a time with a "more" mark; no hover states, no
scrollbars; a bitmap font on a pixel grid.

- `viewer/index.html` rebuilt: a command window (`#cmd`) with 1 VIEW, 2 DAY, 3 RUN, 4 ANALYSE,
  5 WALK and the commands AGENT, LOG, MODEL; one step window open at a time (`#steps`); the
  message box (`#msg`) along the bottom. The model-check status window is gone: `#status` and
  the LAYERS / ROOMS / CHECKS / SELECTED boxes live behind MODEL. VIEW now holds the floor list
  (`#levels`, still drawn by main.js), the view buttons and the drawing options; every id main.js
  uses is unchanged, so the views and the test piece work as before.
- `viewer/src/ui/panels.js`: the menu (cursor, open, close, NEXT, Up/Down/Enter/Esc), the
  step summaries on the command lines (the view name and the picked day, with a check), the
  message box with the step help and the mirrored model status, the calendar and the day pick.
- `viewer/src/style.css`: windows with a double border; the command list with a blinking cursor;
  the message box; the LEVELS hint text dropped from main.js (the message box carries it).

Checked in the browser: no console errors; the steps open and close by click and by key; the
VIEW line reads "Level 2, game view: pixel plan" after the floor and view are picked; the DAY
line reads the picked day; the test piece runs from RUN. Screenshots 61–65.

### 2026-11-07, later still: back between steps, the view at every step, greyed buttons

Owner's notes on the menu: steps must go back as well as forward; the view must be changeable
throughout the steps; a view that does not apply (GAME VIEW for the whole building) should be
absent or greyed.

- `viewer/index.html`: 1 VIEW is pinned (`.step.pinned`, "stays open" in its bar, no close mark);
  its drawing options sit behind a DRAWING fold (`#view-drawing`). Every other main step has
  BACK and NEXT at its foot; WALK has BACK only; AGENT, LOG and MODEL have a back mark in the
  bar that returns to the step that was open.
- `viewer/src/ui/panels.js`: the pinned window is never hidden; opening another step folds the
  drawing options, opening VIEW unfolds them; `state.last` remembers the main step for the
  extras' back; Esc closes the open step or folds the drawing; Up/Down/Enter work on the list
  while only VIEW is open.
- `viewer/src/style.css`: `button:disabled` is drawn greyed (main.js already disabled GAME VIEW,
  TURN L, TURN R, FIT FLOOR, the people slider and the stack box where they do not apply, but
  the buttons had no disabled look); BACK is the lighter button on the left, NEXT the dark one
  on the right.

Checked in the browser: BUILDING greys GAME VIEW, the turns and FIT; Level 3 game view greys
the turns; BACK from RUN opens DAY with the view line reading "Level 3, game view: pixel plan";
the back mark in AGENT returns to DAY. Screenshots 66–68.

### 2026-11-07, evening: VIEW collapses, PLAN VIEW, no turns, the stress test made explicit

Owner's notes: VIEW should collapse while the other steps are used, with a drop-down arrow to
reopen it; "game view" should be called plan view; turning is not needed; where does the user
enter the stress-test situation, and where is the toggle that lets agents move objects.

- `viewer/index.html`: VIEW's bar has a fold arrow and names the current view; the DRAWING
  sub-fold is gone (the whole window collapses). GAME VIEW reads PLAN VIEW; TURN L / TURN R are
  hidden (their ids stay, Q and E still turn the isometric). Step 2 is now DAY AND SCENARIO and
  its lower half is the stress test: a Situation preset (none, review-day crowd, plotter paper
  runs out at 18:00, lift out of service, an event in the lounge, fifteen more students,
  deadline clash, custom), ADD EVENT (what, where, when, who), AGENTS MAY MOVE OBJECTS (desks and
  pin-up boards on casters, crit-room tables on casters, chairs) and POLICY (24/7 access,
  plotter paper at all hours, basement shop). The movable toggle maps to
  `program/objects.json` `toggles.movable_furniture`, off by default as the owner set it.
- `viewer/src/ui/panels.js`: opening another step adds `folded` to VIEW; the arrow (the generic
  fold handler in main.js) reopens it in place; choosing VIEW unfolds it; the view summary also
  goes to VIEW's bar.
- `viewer/src/main.js`: the view name reads "plan view".

Checked in the browser: opening DAY collapses VIEW to "1 · VIEW  Level 3, plan view ▼"; the
arrow reopens it with DAY still open; no console errors. Screenshots 69–71.

### 2026-11-07, night: DAY and SITUATION as two steps

Owner's note: the day and the situation are two separate options; the situation is a dropdown
of events attached to the picked day, with "other" opening a text box whose description is read
into an existing event or taken as an entirely untested situation.

- `viewer/index.html`: the steps are now 1 VIEW · 2 DAY · 3 SITUATION · 4 RUN · 5 ANALYSE ·
  6 WALK. DAY keeps the calendar, the hours, the cohort and "on this day, from the calendar".
  SITUATION shows the day it is attached to (CHANGE DAY goes back), a Test dropdown in two
  groups, events from the calendar (review day, pin-up, last desk crit, Good Times, Waffle
  Wednesday, a deadline) and stresses on the floor (plotter paper runs out, lift out of service,
  fifteen more students, a deadline clash, a weekend before a review), plus "other: describe
  it", which opens a text box with INTERPRET and a reading line; then when and where, AGENTS
  MAY MOVE OBJECTS and POLICY. BACK and NEXT re-chained.
- `viewer/src/ui/panels.js`: the situation step in the main order; choosing a test writes its
  name on the command line and marks the step done; "other" shows the text box and the message
  box explains INTERPRET; the picked day labels the situation step.

Checked in the browser: picking "lift out of service" writes it on the SITUATION line; "other"
opens the text box; CHANGE DAY returns to DAY; no console errors. Screenshots 72–73.

### 2026-11-07, late: a day OR a situation, one step with a switch

Owner's correction: the day and the situation are alternatives, not one after the other. Step 2
is now DAY OR SITUATION with a two-way switch at its top. A DAY shows the calendar and runs the
day as the calendar has it. A SITUATION shows the dropdown (events from the calendar, stresses on
the floor, other with the text box); a pick attaches itself to a day that fits it from
`program/calendar.json` (a review day to the midterm review, the last desk crit to its date, Good
Times to a Friday, a deadline to the October assignment, a weekend before a review to Sat Dec 5,
the floor stresses to the day already picked), shown as "On Fri 16 October 2026" with CHANGE DAY,
which switches to the calendar and back. The command line reads "a review day · Fri 16 Oct" in
situation mode and the plain day otherwise. The cohort, the move-objects toggles and the policies
sit under both. Steps renumbered: 3 RUN, 4 ANALYSE, 5 WALK.

Files: `viewer/index.html` (the step rebuilt), `viewer/src/ui/panels.js` (the switch, the
attaching, the summary), `viewer/src/style.css` (the switch row). Checked in the browser: the
attach, CHANGE DAY to Tue Oct 20 and back, other opening the text box; no console errors.
Screenshots 74–76.

### 2026-11-07, later: the occupants are read, the rules sit in RUN, the test piece in MODEL

Owner's notes: the number of occupants is the number of agents and must not be editable; where
is the toggle that lets agents move things (it sat below the calendar in step 2, greyed, and was
missed).

- `program/cohort.json` (new): the cohort from the confirmed checklist (45 / 60 / 60 students
  in 3 / 4 / 4 sections, 11 instructors), the optional staff, the 172 studio desks with 7
  unclaimed hot desks. The interface reads it; nothing about it is typed.
- Step 2 shows OCCUPANTS as a line, "176 agents: 45 year 1 · 60 year 2 · 60 year 3 · 11
  instructors", in place of the cohort inputs.
- RUN opens with RULES OF THE RUN: the agent count (read-only), "May move" with the three boxes
  (desks and pin-up boards on casters, crit-room tables on casters, chairs; the first two off,
  as `toggles.movable_furniture` in program/objects.json), "Policy" with the three boxes, and
  the mode; the transport, clock and headcounts follow under RUN. The boxes are live interface
  state and the message box confirms each change.
- The stairs-and-lift test piece, with its "Test agents" slider, moved out of RUN into MODEL as
  a diagnostic sub-window; its ids are unchanged and it still runs.

Checked in the browser: RUN reads "Agents 176 (165 students, 11 instructors)"; ticking "desks
and pin-up boards" says "Agents may move desks and pin-up boards."; START in MODEL still runs
the test piece; no console errors. Screenshots 77–78.

### 2026-11-07, night: movement levels, a horizon, an ensemble, a timeline

Owner's design, agreed in chat: moving objects is two things. Everyday movement (chairs, tables
and boards moved for activities and returned home) is how the school works and is always on.
Rearrangement by preference is a slow, social process that must not become agents undoing each
other: a layout manager settles proposals by rule (benefit to the mover against cost to those
affected; owners may veto; circulation and egress are hard limits on the walk grid; the floor norm
is the threshold; ownership, section, first come, a cooldown and a weekly budget settle conflicts).
Because it is slow, it lives in the term layer, which makes longer horizons and projections
possible: the term, the school year with the cohort turning over, N terms; weekly snapshots; an
ensemble of seeds for a spread. Projections under the model's rules, not predictions.

- `viewer/index.html`: RUN's rules now hold Movement (everyday use only, the default; rearrangement
  by groups; free rearrangement, flagged unrealistic) with a note, the policies, Horizon (the
  picked day, the term, the school year, N terms with a count) and Ensemble (seeds). The mode
  select is gone: a day runs on the grid, a longer horizon runs the term layer. ANALYSE gained a
  TIMELINE OVER THE HORIZON (a week slider, a curves placeholder, the band box, the run count)
  and "layout drift" in the overlay list; the metric table is "at this week".
- `viewer/src/ui/panels.js`: the movement level and the horizon write their explanation under
  the control and in the message box; the command line reads "not run · the term ·
  rearrangement by groups".
- The three move boxes are gone; the engine will read the level and the mobility records to be
  added to `program/objects.json` (class, home, owner, effort, norm per object).

Checked in the browser: the selects, the summary line, the timeline block; no console errors.
Screenshots 79–80.

### 2026-11-07, late night: button choices, less text

Owner's notes: short option lists should be multiple-choice buttons, not dropdowns; too much
text makes the interface hard to use.

- Button choices (`.choice`, one lit, a hidden input keeps the id and fires `change`): movement
  (EVERYDAY USE / BY GROUPS / FREE), horizon (A DAY / THE TERM / THE YEAR / N TERMS), speed,
  the situation's where, the comparison in ANALYSE, the entry door in WALK. The situation list
  and the overlay layer stay dropdowns (12 and 9 options).
- Text cut to a few words everywhere: the step help lines, the movement and horizon notes, the
  situation notes, the occupants line, the timeline and Pareto captions, the walk, agent, log and
  test-piece hints; the closing hints of ANALYSE removed. The message box carries one short line.

Checked in the browser: the choices set their hidden inputs and the summary line; no console
errors. Screenshots 81–82.

Incident while applying this: the patch helper opened the target for writing before the patch
function ran, so a failed anchor emptied `viewer/index.html` and then `viewer/src/ui/panels.js`.
Both were rebuilt by replaying every patch of the day from a saved base copy
(`scratchpad/replay_index.py`, `scratchpad/replay_panels.py`), checked in the browser and
syntax-checked with node. The project is not under git; a memory note now says to compute the
patched text before opening the file.

### 2026-11-07, later: a sample of the analysis

The owner asked what the analysis looks like, numerical or an overlay. `viewer/analysis-sample.html`
answers with both, on the real Level 3 tiles and with made-up numbers (a banner says so): seven
overlays (occupancy, encounters, paths and overlap, queues, noise, by year, drift), the core metric
table with A and B against the notes' benchmarks and an in-range / watch chip, a 14-week timeline
with the review weeks shaded and a 20-seed band, and a Pareto view of three scenarios. The paths
are real BFS routes on the walk grid from a sample of desks to the plotters, the kitchen, the
lounge and the 3D printers; everything else is synthetic. The page is a design target for the
ANALYSE step, not a result. Screenshots 83–86.

### 2026-11-07, later: the sample as a vector diagram, with details, a summary and readable metrics

Owner's notes on the sample: the overlay need not be pixel art, vector diagrammatic is fine; a
details dropdown with the references per overlay; a summary with design suggestions; metrics
easier to read; what are the timeline graph and the Pareto view.

`viewer/analysis-sample.html` rebuilt: the plan is SVG (room fills from tile runs, wall lines,
furniture outlines, room numbers) and every overlay is vector (circles, translucent polylines,
soft discs, ticks, arrows). Each overlay carries a DETAILS fold with what it measures, how it is
computed, the registry IDs it feeds and its references (Bernstein & Turban 2018, Kabo 2014,
Hillier, Allen, Mark 2008, Furnham & Strbac 2002, Doshi 1986, Kossinets & Watts 2006, Sailer &
Penn 2009, Festinger 1950). A SUMMARY window lists five rule-based suggestions, each from a
metric against its benchmark or from A against B and naming the place on the plan (sample text).
The metrics are cards grouped collaboration / focus / layout: name, A and B as big numbers, a bar
for each with the benchmark as a green mark, and a one-line reading. The timeline and the Pareto
view each have a "what this is" caption, and the Pareto view draws the front. Screenshots 87–90.

### 2026-11-07, night: the overlay drawn like the reference diagrams; the feed and the trace

The owner put five plan diagrams in `graphics/Plan-diagram` and asked for their lineweights,
contrast and colouring in the overlay; and asked to bring back V1's "chat", agents' comments
live, so a design suggestion can be traced to the situations behind it (the verification) and
the run can be seen playing.

What the diagrams share: walls as heavy black poché on white (or a single hue's densest hatch);
hairline grey for everything else in the plan; one hue per reading; movement as smooth coloured
lines with small arrowheads, one colour per actor or group, loops and dwell drawn as loops; an
aggregate flow as one darker, heavier line; fields as soft blobs (red for warmth or activity,
blue for cold or retreat) or as hatch density; zones as faint tinted blocks with a pattern;
hairline circles at nodes; a legend, a scale bar, a north arrow.

- `viewer/analysis-sample.html` redrawn to those rules: white ground, black wall runs, 0.08 grey
  furniture outlines, Nunito room numbers, a 5 m scale bar and a north arrow turned to the
  model's rotation; ACTIVITY as red and blue radial blobs; ENCOUNTERS as hairline-outlined
  circles; PATHS as Chaikin-smoothed BFS routes in the year's colour with arrowhead markers and
  one dark line through the most-shared tiles; NOISE as soft discs; BY YEAR as hatched tints
  (`<pattern>`) under the plan; DRIFT as dashed start, filled now, displacement line.
- The feed, in the sample: a FEED window that plays itself (the clock advances, one item every
  2.6 s): remarks in the agent's voice with a "because" line (the V1 pattern, `remarks.js`),
  the engine's events, and suggestions as their rules fire; filters ALL / REMARKS / EVENTS /
  SUGGESTIONS. Each summary suggestion has a TRACE fold: situation, metric, events, remarks;
  clicking an event or remark pulses a mark on the plan and scrolls the feed to it.
- The main page: a FEED window top right (`#feed`, `viewer/index.html`), collapsed until RUN,
  ANALYSE, WALK or AGENT opens; empty with its filters; ids are the contract for the engine.

Checked in the browser: the overlays draw, the feed plays, a trace click marks the plan and
highlights the feed item; the main page opens the feed on RUN; no new console errors.
Screenshots 91–94.

### 2026-11-07, night: MODEL and LOG dropped from the command list

Owner's notes: the model check is not for the user; where something overlaps with the feed, keep
the feed. The command list is now 1 VIEW · 2 DAY / SITUATION · 3 RUN · 4 ANALYSE · 5 WALK and
AGENT. LOG is gone: the FEED window is the log (its filters, plus SAVE). MODEL is gone from the
list: the model-check tools (`#model-tools`: the export summary, LAYERS, ROOMS, CHECKS, SELECTED,
the stairs-and-lift test piece) stay in the page for main.js, hidden, and show only with `?model`
in the address, for the builder. AGENT stays as the one extra command and will also open from a
name in the feed. Files: `viewer/index.html`, `viewer/src/ui/panels.js`.

### 2026-11-07, night: the sample's design brought into step 4

Owner's question: where are the analysis diagrams, the final metrics and the design suggestions
in the empty interface. The overlay controls, a metric table, the timeline and the Pareto view
were in step 4; the summary with suggestions and the details fold were only in the sample. Step
4 ANALYSE now reads, top to bottom: SUMMARY (suggestions with TRACE, empty until a run), OVERLAY
ON THE PLAN (the seven layers as button choices, hours, a "B minus A" box, a DETAILS fold),
METRICS AT THIS WEEK as cards (A and B bars, benchmark mark; filled with the core set, no
values), the B choice, TIMELINE OVER THE HORIZON, PARETO, export. The overlay itself will draw
on the stage over the floor's plan, in the vector style of `analysis-sample.html`. Files:
`viewer/index.html`, `viewer/src/ui/panels.js` (cards), `viewer/src/style.css`.

### 2026-11-07, night: the window bars broken by a class clash, fixed

Owner's note: the VIEW and FEED fold arrows and the close marks had left their windows. Cause:
the metric cards' bar was styled with the class `bar`, the same class as every window's title
bar, so each title bar became 8 px high and white with its spans absolutely placed. The metric
bar is now `mbar` in `viewer/src/style.css`, `viewer/src/ui/panels.js` and
`viewer/analysis-sample.html`. A browser audit then measured every element of every visible
window against its box in each step (VIEW, DAY, SITUATION with "other", RUN, ANALYSE, WALK,
AGENT, the FEED): nothing outside, no text past the margin.

### 2026-11-07, night: the engine behind the interface

Built the simulation from the notes and the decisions of the day: `program/parameters.json`
(every number under its registry ID with a status code), `program/QUESTIONS.md` (what the build
was unsure of, and suggestions), and under `viewer/src/sim/`: rng, calendar, population (traits
only), world (spots, desks by zone, resources, washrooms by sex, the 24/7 door, a path cache),
term (plans and the slow state, weekly snapshots), engine (the day run), events and remarks,
stats, metrics, rules. Under `viewer/src/ui/`: run (RUN, AGENT, WALK), feed, analyse, diagram.
Headless runners in `viewer/test/`: world-check, term-check, run-day.

Things found and fixed on the way: chairs and bins blocked the walk grid so whole bays were
cut off (they are now walked past); the tile files' furniture coordinates are local to the
level's origin, so the cohort zones were read in the wrong frame; a piece's standing tile must be
on the floor proper and in its own room (the plotters' was in office 2); desk neighbours side by
side counted as face-to-face all day (now co-presence; encounters need two people stationary
within 3 m outside crits, lectures and washrooms, and conversations with a working neighbour are
rare); water trips swamped the kitchen (a bottle at the desk 70% of the time); long lift waits
(a stairs fallback after 150 s). Calibration of the term layer: hours per week about 42–50
(E1 median 40), high stress 22% in a normal week and 45–55% in review weeks (H1: 20% and
33–46%), all-nighters 12% before the midterm (E4: 14%); the day run's focus blocks are still
short (median 16 min against 52) because breaks, needs, crits and conversations all cut them.

Checked in the browser: PLAY builds and runs; a day computes in about 27 s when stepped flat
out; the feed fills with remarks, events and suggestions; ANALYSE shows four suggestions with
traces, the metric cards, and the paths and encounters overlays on the stage; the plan view draws
the agents; the avatar enters, walks and talks; the inspector fills from a name in the feed.
No console errors from the new modules. Screenshots 100–103.

### 2026-11-08: the owner's answers applied; agents rearrange; voices; test cases

The owner answered the 21 questions of `program/QUESTIONS.md` and gave three general instructions
(the feed must express the agents' heterogeneity; keep the notes current; write test cases). Applied
with dated scripts (`parameters.json` meta 2026-11-08):

- World: washrooms by floor and role (Q1); room 30 used from its floor tiles (Q16); the four boxed-in
  desks at the north-west bay reached by rolling a table aside, 4 tiles, logged in `world.gaps` (Q18);
  instructors' offices only for those with an office here, Level 4 first (Q2); `movePiece` for the
  layout manager.
- People: sessional / permanent / office-here flags and a crit mode per instructor (Q2, Q6);
  office-hour propensity per student (Q10).
- Term: a per-seed timetable (Q8, Q9, Q19): the year's lecture in the smallest classroom that seats
  it (year 1 room 13, years 2 and 3 rooms 15 and 12 in seed 2026), each section's seminar on a
  non-studio weekday clear of lunch in a crit room, Level 3 first; office visits planned; crit place
  by the instructor's mode.
- Engine: lectures and seminars to the booked rooms; crit spots (the free side table nearest the
  section, else a free crit room on the floor) with a crowding switch; office visits; the layout
  manager (`sim/layout.js`) under AGENTS REARRANGE and FREE (Q12: the owner's reading is that the
  agents enact the suggestions live): triggers, moves, veto, budget, cooldown, connectivity, effect
  measured, moves traced into the suggestions (`rules.js`); situation specs from INTERPRET applied
  (`applySpec`); the keyword matcher kept for the headless runner only.
- Metrics: F1 benchmark 11 min (Mark 2005), deep-block share (Q20).
- Remarks: registers from traits, one colouring per line, year flavour, instructors' lines; the
  register in the feed and the AGENT window.
- Interface: AGENTS REARRANGE replaces BY GROUPS; a key field in SITUATION, OTHER greyed out without
  a key (Q14: the user's key, never the owner's); INTERPRET calls Claude through the SDK in the
  browser and shows the reading; the plan view draws moved pieces; DRIFT shows moves and gaps.
- Notes: checklist rows, registry (new AT16), data sources (MARK05, GONZ04, layout rearrangement),
  agent-variables, summary-metrics, HANDOVER, methodology log 2026-11-08; `program/QUESTIONS.md`
  rewritten with the answers and open items 22–28; `program/TEST-CASES.md` new.

Headless, 2026-10-15 under AGENTS REARRANGE, seed 2026: 145 present, 107 plotter jobs, paper out
after 17:00 (45 gave up), three moves (a board screening an exposed desk at 13:30 and another at
17:00, a side table to the plotter corner at 17:00: 646 queue-minutes spent at it), no veto; F1
16 min against 11; the suggestions F2 HIGH and F8 QUEUE carry "The agents tried this live". Known
artefact (open item 25): the screen takes the passers at that desk to zero. Checked in the browser (2026-10-15, AGENTS REARRANGE): the page loads without errors, OTHER is greyed out with the key field shown, the movement buttons read EVERYDAY USE / AGENTS REARRANGE / FREE, the run completes (2976 events, 1403 remarks), the feed shows the register after each name (chatty, precise, blunt, loose, vivid and their combinations), the AGENT window shows the voice line, one move happened in this run (the side table to the plotter corner, 433 queue-minutes at it) and F8 QUEUE carries the live attempt. The browser run made one move where the headless run made three; the runs should be deterministic across both, so this is a check to make (the level list the browser loads may differ from the headless loader's).

Tooling note: long quoted heredocs fail to parse in the Bash tool here; scripts are written with the
Write tool and run with `python -I`.

### 2026-11-08, later: open item 25 (the screen's effect) resolved

The exposure count read tile-steps within one tile of the desk's standing tile, so a board rolled onto
that tile took the count to zero. Now `engine.passing` counts one per walker per pass within two
tiles, weighted 1 in the near ring, 0.5 in the next, and half again when a board, table or wall sits
between the desk and the walker (`metrics.exposure_count` [A]); `stats.passer` takes the weight. F4's
benchmark is 6 passes an hour (rescaled from 15 tile-steps so the normal Tuesday keeps its ratio, 8.3
against 6) and the exposure trigger 20 passes an hour. The layout manager's budget is checked per
attempt (`tryMove`), where before four signals in one half-hour check could pass it (five moves on a
budget of four). Headless 2026-10-15 under AGENTS REARRANGE: four moves, screens 33 → 4, 40 → 0,
66 → 4 passes an hour, the plotter table 893 queue-minutes, one veto; 2026-10-13: four screens,
41 → 0, 51 → 5, 51 → 1, 114 → 18. The near-zero cases are the route moving one bay over, which the
F2 suggestion also asks for. Notes: summary-metrics, assumption-data-sources, methodology log,
QUESTIONS (25 resolved, 27 reworded), TEST-CASES case 2, README §11a.

### 2026-11-11: open items 22, 23 applied from data; 24, 26, 27 reworded; 28 kept

The owner answered the second round (`program/QUESTIONS.md`). Item 22 asked for data: the 2024 APR
(re-read with pypdf from the HANDOVER link) gives 17 full-time architecture faculty and 15 adjuncts
in 2024/25, seven adjunct names on the three fall studios; the sala.ubc.ca profiles give offices for
12 of 18 architecture faculty, nine in Lasserre on Levels 2, 3 and 4 and three in CIRS. Applied:
`population.instructors` sessional_share 0.6 [D*], office_in_building_share 0.75 [D], new
office_level_order Level 2 / 4 / 3 (`world.assignDesks`); seed 2026 gives 4 sessional and 4 offices
on Level 2 among the 11 instructors. Item 23: a 15 min **section intro** at the instructor's spot
opens every session (`studio.sessions.intro_min`; `term` item `intro`, engine case, `intro` event
and remarks for students and instructors, shown in the FEED); the lecture follows on the week's
first session. Item 24 was a misreading (desks are never moved) and is reworded; 26 answered (room
30 is on Level 2) with a question back (is it the APR's room 202, which seats 60); 27 explained in
plain words; 28 kept.

Headless, 2026-10-13 everyday, seed 2026: 165 present, 11 intro events, F1 16.5 min, F2 1.47, F4
8.5 passes an hour, C6 0.28; headcounts unchanged within two or three people. Headless 2026-10-15 under AGENTS REARRANGE: 142 present (three fewer: the sessional draw changed), 3 intro events (the Thursday session is year 1's), four moves (three screens 33 → 2, 40 → 0, 34 → 2 passes an hour; the plotter table 685 queue-minutes), three vetoes; F1 16.6, F2 1.33, F4 7.5.

### 2026-11-11, later: room 22 as the APR's 202; the rooms reviewed against the APR; seat tiles

The owner: if room 30 is the largest classroom with seats it is probably 202; review the other rooms
with the accreditation report. Room 30 has no seats; the largest classroom with seats on Level 2 is
room 22, the owner's large classroom and pin-up space, which is what the APR says of 202. Applied with
`scripts/apply_chat_2026-11-11a.py`: O28 seats four a table (64 chairs in four rows; the APR's 60 is a
capacity, recorded on the room), `apr_room` cross-references (inferred) on rooms 1, 4, 5, 12, 13, 15,
22, 74, 75; 70 and 77 flagged as candidates for Room 9 (the Materials Lab); 34 and 55 noted against
the main office 402. Tiles rebuilt (`rasterise.py`), enclosure check clean, TODO regenerated.

Found on the way: `world.piecesIn` only counted pieces with a standing tile, and a chair in a row of
tables has none, so room 22 read 25 of its chairs and rooms 12 / 13 read 56 / 64 of 96; year 1's
lecture was going to Level 1 on that count. Chairs in class and crit rooms are now seat tiles
(walkable, `buildRooms`), so each chair stands on its own tile and counts; the crit rooms' chair sets
count in full too. Headless after the fix: the classrooms seat 64 (room 22), 84 (15) and 96 (12 and 13), all their chairs; 26 tiles opened as aisles between table rows (10 strips on Level 1, 1 on Level 2) beside the studio's table gap, logged in world.gaps and drawn in the DRIFT overlay; seed 2026 now books year 1's lecture in room 22 on Level 2, year 2 in room 12 and year 3 in room 15. 2026-10-13: 165 present, F1 16.5 min, F2 1.45, F4 8.8, headcounts unchanged; 2026-10-15 under AGENTS REARRANGE: 142 present, four moves, two vetoes. The page loads in the browser without errors.

### 2026-11-11, evening: the list of rooms to confirm

At the owner's request `program/ROOMS-TO-CONFIRM.md` keeps the fourteen rooms the tool uses on an
inference (the APR cross-references, room 30, the flagged basement rooms, rooms 34 and 55, the
north-west bay table, the instructors' offices), each with what to check and the source; answered rows
move to its Confirmed table. A one-time reminder is scheduled in the desktop app for 2026-11-12 09:00
(it runs when the app is open, or on the next launch).

### 2026-11-11, night: the twelve test cases run; four engine fixes

The owner asked whether the test cases could be run in a verifiable way. `viewer/test/run-cases.mjs`
runs cases 1 to 10 headless (deterministic per seed; `program/test-results/<date>/cases.json` plus
`program/TEST-RESULTS-<date>.md` with the expectation, the command, the observed block and a
verdict); cases 11 and 12 were driven in the browser with screenshots. Results: 1, 5, 7, 10, 11, 12
pass; 2, 4, 6 pass with the expectation corrected; 3 passes once F8 is read as a mean wait; 8 fails on
the evening (the weekend rule empties the floor by 20:00, no printing: open item 32); 9 is a check
(hours fit E1, the high-stress share runs at 48% against 20%: open item 33; between-year ties collapse
in a week without sessions).

Found and fixed while testing: (1) every World mutated the building's shared floor grids, so a second
run in the same page or process started from the first run's floor and gave a different day for the
same seed; `FloorGrid.clone` and the engine walking on the World's grids; the headless runner, a fresh
process and the browser now make the same moves at the same minutes. (2) The timetable shuffled with a
random comparator, which Node and Chrome order differently; Fisher-Yates on the keyed stream (this
changes the seed's lecture rooms: year 1 now in 15, year 2 in 22, year 3 in 12). (3) The plan view
crashed on Level 1 during a day run (`scene.js` lift label called the old diagnostic's levelName).
(4) The event remark pool mixed Waffle Wednesday into Good Times (`waffle_join`). Open on the engine
side: TA ties decay to nothing in a reading week (F5 / ST8); F8 as a mean wait hides the giving-up.

### 2026-11-11, late: items 32 and 33 applied (the stress rule rebuilt; the weekend before a review)

Item 33: the owner asked for the logic, said a normal week should depend on personality and that 55%
before reviews was near the target. Found: a constant daily push of 0.015 lifted everyone 0.10 above
their baseline, and the review rise went through the capped urgency sum, which reads 4.7 in a normal
September week and 6.3 the day before the midterm, so reviews barely showed. Rebuilt (`term.js`): no
drift; baseline 0.40 + 0.15 N; the rise from the days to the year's next review (nearness, zero two
weeks out) x 0.03 x exp(0.5 N); urgency 0.002; all dials in `parameters.wellbeing.stress`. Probed
with `test/_stress.mjs` over five seeds: 18% high in a normal week (15-24), 42% the week before the
midterm, 36% in the review week, 43% before the final; low-N third never high, high-N third almost
always.

Item 32: within seven days of a review a weekend is a working day (presence 0.7 x ramp, a full day,
arrivals from 10:00, late workers late, the all-nighter hurdle on the eve), and the organised print
early (print day 1 + 2 x C days before, catch-up when absent, 30% reprint on the eve, a `print_early`
remark). The `weekend` situation defers to the term plan on a real weekend. Two engine changes with
it: `planFor` no longer mutates state (the printed-for flag moves to `advance`), and the term layer
plans the picked day but does not advance it, so a day run starts from that morning's state (it used
to start from the evening's). Saturday 2026-12-05: 133 of 165 in, 63 on the floor at 20:00, 21 at
midnight, 8 print jobs. Browser check clean. Test cases rerun; TEST-RESULTS updated.

### 2026-11-11, night: the sweep, the walkthrough plan, and three more fixes

The owner asked for more thorough testing and a walkthrough the next day. `viewer/test/run-sweep.mjs`
runs three seeds on six days (a normal Tuesday, the midterm eve, the review day, a Monday without a
session, a Friday, the Saturday before the final) under every movement level, every listed situation
on its day with its intended effect checked against the plain day, the two policies, a determinism
check (the same seed twice in one process) and the term for five seeds, each run against the engine
invariants: nothing thrown, nobody standing still while walking for ten minutes, the studio floor
connected, metrics finite and in range, the move budget kept, the lift sane, the section intros
matching the sections in session. Output `program/TEST-SWEEP-2026-11-11.md` and `sweep.json`.
Final pass (after the move fixes): 39 runs, 0 failures; two runs of one seed identical; the term over five seeds 18% high stress in a normal week, 43% before the midterm and before the final, 45 and 61 hours a week.

Fixed from the sweep's passes: (1) the layout manager checked connectivity against the floor before
each move, so several moves could cut it cumulatively; it now checks against the floor as the day
began. (2) `world.movePiece` cleared a piece's whole footprint when it left, including tiles shared with
a desk, a printer or another board, which opened them to walking; every blocking piece is now counted
per tile (`initCover`, `cover` and `walk0` on the grid) and a leaving piece uncovers only what it alone
covered. (3) The table the engine rolls aside for the four boxed-in desks was itself movable: the
agents moved it and put it back, which closed the gap and cut the pocket off (seed 2028, 2.4% of the
floor); rolled-open gap tiles now stay open whatever covers them and a gapped piece is left alone by the
layout manager. A move and its revert now leave the grid bit-identical. Three of the first pass's failures
were the sweep's own checks (a review day has no section intro; the paper situation on a day where
the stock runs out anyway; a mean leave after midnight compared as text), corrected. In the browser:
the TERM horizon with five seeds builds (14 weekly snapshots, bands over five seeds) and the ANALYSE
timeline and week slider read the values; INTERPRET with a placeholder key returns a clear 401 message
in a second (the success path still needs a real key). `program/TEST-WALKTHROUGH.md` is the plan for
the walkthrough (ten stops, about ninety minutes); the 09:00 reminder now points at it as well.

### 2026-11-12, morning: walkthrough stop 1, item 28 (late nights on an ordinary day)

The walkthrough started with case 1 in the viewer (Level 3, plan view, 2026-10-13, everyday use,
600x). The owner's answer to the headcounts: on a normal Tuesday with no deadline coming up there
would not be that many night owls, they prefer to work from home; the other numbers seem fine.
Found with `test/_late.mjs` (a probe of who is planned past 20:00, 22:00, midnight and 01:30):
(1) the late-worker rule fired when urgencyNorm > 1.3, and the median student sits at 4 to 6
whenever any deadline is within a couple of weeks (0.98 on 2026-11-03), so all 39 late workers
stayed to 22:30-01:00 most nights; (2) 2026-10-13, the default day, is three days before the midterm,
so case 1's evening was a crunch evening. Rebuilt in `term.js` with `parameters.effort.late_nights`
[A]: within 7 days of a review a late worker stays late every night, otherwise with p 0.25; everyone
else is capped at 19:00 plus up to 1.5 h on a day with no review in that window (E3: others leave by
18:00-20:00 outside crunch; the rest of the planned hours at home, E9). Plain Tuesday 2026-11-03:
planned past 22:00 41 -> 10, past midnight 16 -> 2; the day run 51 on the floor at 19:00, 16 at 20:00,
10 at 22:00, 2 at midnight, F1 16.8, F2 1.40, F4 8.4, C6 0.27. Days within a week of a review are
untouched: case 1 rerun bit-identical to 2026-11-11 (`test-results/2026-11-12/cases.json`).
Notes: QUESTIONS (28 answered), TEST-CASES (case 1 note), TEST-WALKTHROUGH, checklist E3, registry
AT10, assumption-data-sources (Model 2), agent-variables, README.

### 2026-11-12, morning: walkthrough stop 3, item 27 (the screens capped; the other moves freed)

The owner asked what a screen is (a pin-up board rolled to the aisle side of an exposed desk) and
chose to cap them: they want to see what else the agents do to the space, which could have long-term
implications. `per_trigger_cap.exposure` 2 in `tryMove`. Under the cap nothing else moved on four
dates, so `test/_layout.mjs` was written to say why each table move does or does not fire: the
kitchen's nearest side table is 21 tiles off against a reach of 20 (6+ in the kitchen was seen 13
times that day); the plotter queue peaks at 3 on the eve against a trigger of 4; and `findSpot`
returned the first static fit only, which for the plotter table cuts off the north offices, so the
move was always reverted. Changed: `kitchen_reach_tiles` 30, `queue_len` 3, and `findSpot` tries each
candidate with a trial move (connectivity and standing tiles) before choosing it, all [A]. Seed 2026:
2026-10-15 two screens and the kitchen table at 13:00; 2026-10-13 a screen, the kitchen table at
12:30, a screen at 15:30; 2026-10-23 a screen, the kitchen table, a screen. The plotter table then
still did not fire on the eve, where the queue peaks at 8: no spot within 3 m of the plotters keeps the
north offices connected, so the search ring widened to 5 m and the table now goes over at 17:30 (517
queue-minutes spent at the table instead of standing). The shared board never fires because
between-year contact is above its trigger. Open: the kitchen table's reported effect
(kitchen peak before and after) is not a measure of the table. TEST-RESULTS-2026-11-11 cases 2 and 4
predate this; the cases and the sweep are to be rerun after the walkthrough.

### 2026-11-12, morning: the moves as design suggestions (item 27, continued)

The owner has not seen these moves made in the studio but wants the tool to have the opportunity to
make design suggestions through the agents' moves, in addition to the suggestions at the end. In
`rules.js` the single LAYOUT line for unmatched moves is replaced by one suggestion per kind of move
that stood at the end of the day, tag MOVES: the move as the agents made it, its measured effect, and
the permanent version of it (screens: bay-end boards fixed to face the aisle or a low screen along the
exposed bays; the kitchen table: a counter or shelf in the lounge by the kitchen door; the plotter
table: a fixed layout table at the plotters; the shared board: a shared pin-up wall between the
years), each traced to the move's event, the movers' remarks and the spot. The metric rules keep
their "the agents tried this live" line, so a move appears twice when it answers a metric: once as
evidence, once as a proposal. The vetoes line stays under LAYOUT. Eve of the midterm, seed 2026:
three MOVES suggestions. Wording is rule-based, like the rest.

### 2026-11-12, morning: walkthrough stop 4, F8 and the abandoned jobs

Stop 4 in the viewer (paper at all hours against the plain eve, both with the agents rearranging):
no outages and the same jobs, but the mean wait at the plotters did not fall (7.1 min without the
policy, 8.5 with it, headless case 3 of 2026-11-12), because without the policy the 42 who gave up
stopped waiting, and the A vs B line called the comparison "a trade on the Pareto front" on contact
and focus alone. This was the open engine item from the test cases (F8 as a mean wait hides the
giving-up). Fixed: `stats.abandoned` counts the paper_out events; `metrics.F8.abandoned` carries it
and the card's unit line reads "; N jobs abandoned for paper"; the A vs B rule compares the two
counts and says that the mean wait cannot show it. Browser: the second run's ANALYSE shows the line.
Also: the cards showed B only after "A SAVED RUN" was pressed, while the A vs B line already compared
against the previous run; the selector now defaults to the saved run when there is one.

### 2026-11-12, morning: walkthrough stop 5, Good Times and Fridays

Stop 5 ran lift out (0 boarded, 335 washroom trips by the stairs), fifteen more (15 visitors, 455
kitchen-crowded remarks, focus unchanged) and Good Times, which showed 95 at the event. The owner:
too many; people grab something and leave quickly; on Fridays people leave early once the desk crit
is done if they have other plans. Found with `test/_event.mjs`: the situation override in `engine.js`
added half of everyone present for 150 minutes on top of the calendar's own Friday rule, which alone
gave 73 attenders and a peak of 53. Rebuilt: the situation adds nothing on a day that has the event
and uses the plan's rule (p x sociability) on any other day; `TermLayer.eventStay` gives a grab-and-go
share (`social.events.good_times.grab_share` 0.4, 10-20 min; waffle 0.6, 8-15 min) and the rest 40 to
100% of the event, and the plan's leave is extended only to the end of the stay (it used to be the end
of the event for everyone); at crit end on a Friday `effort.friday.plans_p` 0.4 of students leave 20-60
min later and drop the evening item, with a `friday_plans` remark. All [A]. Friday 2026-10-23: 57
attend over the evening (30 a quick grab), 27 at the event at the peak, 25 early leaves, the floor 112
at 18:00 and 35 at 20:00. The sweep's event situations now sit on days without the event (Tuesday
2026-10-20 for Good Times, Thursday 2026-10-15 for waffles) with thresholds 10 and 5 at the event.
The owner: the 50-60 come through, at the start of Good Times; arrivals now fall within 25 minutes of
the start (`social.events.good_times.arrive_within_min`): 57 through the evening, 33 at the peak.

### 2026-11-12, morning: walkthrough stops 6 and 7

Stop 6 (the Saturday before the final): 133 of 165 in from 10:15, 72 on the floor at 19:00, 49 at
22:00, 8 at 02:00, 8 print jobs; the owner confirms 80% in as about right (checklist E6). Stop 7 (the
term, five seeds, in the browser): hours 36 to 51 a week in studio weeks and 62 before the midterm;
high stress 6% in week 1, 19% by week 3, 42% the week before the midterm (band 39-50), 38% in the
review week, 10 to 18% through November, 30% and 44% in the two weeks to the final. The normal-week
share now sits under the 20% target in the early and late weeks since the late-night cap (fewer hours,
less sleep debt); the first weeks start low because stress relaxes from a cold start. Open engine
items: the last term snapshot is duplicated (week 13 twice, the second with 0 hours); between-year ties
still collapse in weeks 9 and 13.

### 2026-11-12, morning: walkthrough stop 8, the voices and the lift

Stop 8 compared Ruth Park (terse, precise, blunt) with Iris Ivanova (chatty) in the AGENT window on
the Saturday run. Fixed: a chatty opener ending in a comma left the next word capitalised ("Listen,
Washroom means..."); the line now continues in lower case unless it starts with "I" (checked over
sixteen such lines headless). The owner, on Ruth's plain washroom line "back in 8 minutes if the lift
comes": Owner 2026-11-12 (walkthrough stop 8): unless tired or with a mobility need, it is unlikely anyone takes the lift for one floor to the washroom; carrying a model is different. Engine (`engine.travelTo`, `parameters.walking` [A]): one floor is the stairs with a 5% exception, the lift with p 0.7 when the trip is to or from the plotters, the printers, the 3D printer, the shop, a review or a pin-up (a load), p 0.5 after 22:00 or with a sleep debt of 9 h or more (the median student carries 6 to 7 h in a review week, so the threshold had to sit above it), and always with a mobility need; two floors or more keep 70% lift. `population.mobility_need_share` 0.03 is a PLACEHOLDER with no data, drawn on its own random stream so the population is unchanged. Tuesday 2026-10-13 (seed 2026): one-floor trips 999 by the stairs and 56 by the lift for no reason, 38 with a need, 7 with a load, 60 of 112 tired; two-floor trips (the lectures on Level 1) 455 lift, 281 stairs; lift boarded 610 -> 580. `stats.liftChoice` keeps the count by reason. The washroom line no longer says 'if the lift comes'.
The owner's main concern is that the voices stay distinct. Engine note: the register's own line is
used 70% of the time when the register has one for the topic, the plain pool otherwise, coloured by an opener or
tail; so a register without a line for a topic sounds plain there.

### 2026-11-12, late morning: walkthrough stops 9 and 10

Stop 9: the avatar (south door, Level 1, W A S D, E: nobody within four metres at 17:00) and OTHER (greyed
without a key, on after SAVE, greyed after CLEAR, the storage empty) as in the test. Found: with the 3D
building view on screen a day run crawls at about a simulated minute a second, while plan view runs
at full speed (engine note, not fixed). Stop 10: the sweep rerun. Rerun 2026-11-12 after the walkthrough's changes (late nights, move caps and reach, moves as suggestions, F8 abandoned count, events and Fridays, the lift rule): 39 runs, 0 failures; two runs of one seed identical; the term over five seeds 18% high stress in a normal week, 43% before the midterm and before the final, 45.5 and 61.5 hours a week. `program/TEST-SWEEP-2026-11-12.md`.
The twelve cases were rerun headless the same morning and `program/TEST-RESULTS-2026-11-12.md` carries
the observed values and verdicts: all PASS; cases 2, 3, 4 and 7 differ from the day before as the
file explains (the moves under the cap, F8 under the policy, Good Times after the rebuild), cases 5 and
9 are unchanged. Case 7 now samples 18:15 and 18:30, where the Good Times peak is, and counts the
attenders from the plans. Open from the rerun: C1 rose to 38 m on the eve once the overflow table
counted as a kitchen spot; whether that reads "desk-to-amenity routes" rightly is to check.

### 2026-11-12, midday: the VIEW panel (owner's interface notes)

The owner, after the walkthrough: FIT FLOOR does nothing visible and is not needed; the view should
go to the third-floor studio by itself when step 2 opens; the VIEW panel should stay available
through the other steps, like a modeller's view tabs; the greyed DRAWING section and the placeholder
people slider should leave the interface but stay in the code. Done: the FIT FLOOR button is gone (F
still fits the floor from the keyboard); a row of view tabs sits under the VIEW bar and stays in sight
when the panel folds (BUILDING, L4, L3, L2, L1, BASEMENT, then ISO and PLAN, mirroring the panel's
buttons, `renderTabs` in `main.js`); opening step 2 fires an `npc:step` event and the view goes to
Level 3 in plan unless it is there already; the DRAWING block is hidden in `index.html` (the scene
still reads the controls at their defaults) and placeholder people default to 0, since a run draws
the real people. Checked in the browser: no console errors, the tabs switch floor and view from inside
step 2, and the folded panel keeps the tabs. README's interface paragraph updated.

### 2026-11-12, midday: VIEW a constant, the steps start at DAY; OTHER without a key

The owner: VIEW should not be a step but a constant, with DAY / SITUATION as step 1; and the tool
should run from GitHub for testing on one default seed without using the owner's API credits. Done:
the menu is 1 DAY / SITUATION, 2 RUN, 3 ANALYSE, 4 WALK, AGENT; the VIEW window keeps its tabs in
sight and folds its full panel, which the arrow reopens (`panels.js`: MAIN without 'view', the tool
opens on 'day', which also takes the view to the Level 3 plan); the DAY panel's BACK to VIEW is gone.
Two faults from opening on the floor at load: a stale menu reference (guarded) and `setLabels` called
before the pixel scene had built its labels (guarded, the flag kept). OTHER: the tool has never held a
key (whoever saves one in their browser is billed, nobody else); without one the option is no longer
greyed but runs the one saved example in `program/other-example.json`, a description and its
reading written by hand to the schema and labelled a saved example in the interface; the text box is
prefilled with it when OTHER is picked without a key, and the button reads USE THE SAVED EXAMPLE. The
seed stays 2026 by default, the seed of every dated result, so a GitHub run reproduces them.

### 2026-11-12, afternoon: the DAY panel (owner's notes)

The owner: a legend for the calendar colours, or only weekday, weekend and the suggested test cases;
the test-case buttons more intuitive, above the calendar or with a short title; the day's text
description removed; ON THIS DAY should say whether a midterm or final is near and whether stress is
higher. Done in `index.html`, `panels.js` and `style.css`: SUGGESTED TEST CASES above the calendar,
seven rows (NORMAL WEEK now Tue 3 Nov, a plain Tuesday, since Tue 13 Oct is the midterm week; LAST
CRIT; MIDTERM EVE; MIDTERM; GOOD TIMES; FINAL EVE; FINAL), each a button with its date and a line, the
days outlined on the calendar; the calendar in three tones (weekday white, weekend shaded, outside the
term greyed) with a legend; the day's note line hidden (its text still goes to the tooltip); ON THIS
DAY from `onThisDay()`: the next review and the days to it, the stress it brings in the engine's own
calibration words (one in five, two in five within a week, one in three on the review day), studio
day or weekend or closed, then the events. The default day stays Tue 13 Oct, which now reads
"Midterm review in 3 days · stress high". Checked in the browser on four days.

### 2026-11-12, afternoon: unavailable days take no click

The owner: prevent clicking the greyed-out days (holidays, before and after the term). The calendar's
day buttons outside the term, on a closure and in the exam period are now disabled (`renderCalendar`),
drawn at 60% with a plain cursor and a tooltip "not a day the tool runs". The days after the last day
of classes up to the last review (8 to 10 Dec) stay available, since the engine runs to the final review
and FINAL is one of the suggested cases. Checked: 26 days disabled, every suggested case clickable.

### 2026-11-12, afternoon: the steps as an accordion, the movement groups, no policy toggles

The owner: the other steps should keep a compressed panel while the user moves on, for an intuitive
way back; movement should separate everyday use from the agents' two scales of freedom, with related
names; the policy toggles make no sense (24/7 access is a fact, the shop keeps its hours, the plotters
run while they have paper). Done: the four main steps stay in sight as bars with their choice on the
bar and the open one unfolded (`panels.js` open/close, `.step.main`), a click on a bar reopens the
step and NEXT/BACK still walk them; movement reads EVERYDAY USE apart and, under "agents rearrange",
WITHIN LIMITS ('agents') and WITHOUT LIMITS ('free'), with the notes rewritten; the policy row is
hidden (the inputs stay for `run.js` and the headless runner; test case 3 is headless only now). A
`[hidden]` rule was needed, since the rows' flex display beat the attribute. The owner also asked what
"horizon" means and proposed a one-day against a-period choice; answered in the session, not built.

### 2026-11-12, afternoon: A PERIOD in step 1, no horizon in RUN

The owner asked what "horizon" meant and why a day is picked if a horizon follows; the answer was
that a period run ignored the picked day except as the day played at the end. Rebuilt: step 1 offers A
DAY, A SITUATION or A PERIOD (THE TERM, THE YEAR, N TERMS); choosing a period sets the run's hidden
horizon inputs, moves the day to the last review (the span's last day, which the floor plays once the
span is built) and shows "Ends on"; back on A DAY the horizon is a day again. The RUN step's horizon
row and note are hidden; its bar summary reads the hidden input. STEP_HELP and README updated.

### 2026-11-12, afternoon: the period as a span on the calendar

The owner: a period should be a span inside the semester picked on the calendar shown under A DAY;
the year and N terms are not options. Done: A PERIOD keeps the calendar, hides the suggested cases,
and takes two clicks (first day, then last; a click before the first swaps them) or a preset (WHOLE
TERM, TO THE MIDTERM, MIDTERM TO FINAL); the span is shaded on the calendar with its ends outlined;
the run's hidden inputs carry horizon 'span' with from and to, the day becomes the span's last day,
and `run.js` builds the term from its start as always and keeps the snapshots from the span's first
day. ANALYSE's empty-timeline line now says to pick a period in step 1. The year and N terms buttons
are gone from the interface (the code paths stay).

### 2026-11-12, afternoon: WHEN, the span colour, the metric notes, the overlays over the pixel art

The owner: the span's colour was too close to the weekend fill; step 1 should be named for the time
parameter; the metrics need units or an explanation of what, how, why and the reference; the overlays
should sit on the pixel art, faded or in black and white. Done: step 1 is WHEN (menu, bar, BACK);
the span is light blue with dark-blue ends (`--span`, `--span-end`) and the legend has a swatch; each
metric card carries a ? that folds open WHAT, HOW, WHY and REFERENCE (`METRIC_NOTES` in `analyse.js`,
written from `research/summary-metrics.md`, the engine's own choices marked [A]); and when the pixel
plan is up an overlay is drawn over it with the pixel canvas at 85% grey and 50% opacity
(`#game.dim`), the SVG aligned to the plan's camera every frame (`LevelScene.planRect`,
`Diagram.setOver` and `track`), its own line drawing hidden; in the isometric or the 3D building the
vector plan is drawn as before. Checked in the browser: ACTIVITY over the Tuesday run sits on the
desks; the C1 note opens; the WHEN bar and the blue span show.

### 2026-11-12, afternoon: the metric cards against a goal

The owner: the metrics need a comparison for whether the number is good, the descriptions more
concise, the units closer to the number; a goal from data and literature against what is simulated.
Done in `analyse.js` (`METRIC_NOTES` carries unit, direction, goal text and source; `fillCards`
rebuilt): a card reads name, the simulated value with its unit (and B's when a saved run is B), the
goal with its source, the bar with the goal's mark, and a verdict (at the goal within 10%, past it,
short of it, over it; "no goal: a reading" for C7; none for the placeholders). The notes are one
sentence each. Tuesday 13 Oct: C1 22 m short of 30 m; C3 2.1 /wk, C4 56 min, F1 17 min past their
goals; C6 0.26 at 0.25; F2 1.5 /h and F4 8.5 /h over their goals; F8 0.1 min past. Goals that are the
engine's own choice are marked [A] on the card.

### 2026-11-12, evening: the steps gated, ANALYSE regrouped and explained

The owner's notes: later steps should not show until the step before is done, and ANALYSE should
pop up when the run ends; what is AGENT in the command window; drop the uncomputed metrics and
remind later; the ? kept moving; "A READING" on C7 was unclear; mark clearly what meets the goal;
a short description with a fold for the rest; the graphs need explanations; the suggestions as two
summaries, collaboration and the rest, each traceable to events, agents and metrics. Done:
`panels.js` gates the steps (`available`, `applyAvailability`; RUN once a day is picked, ANALYSE and
WALK on `npc:run-done`, which `run.js` fires at the end of a run, and ANALYSE then opens); the menu
greys the steps not reached. `analyse.js`: CARD_KEYS without C13, F11 and S1 (reminder task
`uncomputed-metrics-reminder`, 2026-11-13); the ? in a fixed first column of the card grid; a WHAT line
under the name, HOW, WHY and REFERENCE behind the ?; the card's left edge and tint green or red by the
verdict; C7 "no goal in the literature: compare two layouts"; the summary in two groups by rule (C
rules, the MOVES about the kitchen counter or the shared wall, and an A vs B on contact count as
collaboration), each trace with a metric link that scrolls to the card and flashes it, and the remarks
row renamed AGENTS. `index.html`: the timeline is "over the period", the Pareto view is "contact
against focus", each with a one-line hint and a MORE fold (how, why, reference).

### 2026-11-12, evening: names out, folds, WALK off; the furniture test; a first pass on the look

The owner: no names in the suggestion itself (the trace keeps them); only the fold's own arrow; WALK
off for now; test that moving furniture works; iterate on the plan view's graphic style. Done:
`rules.js` strips names from every suggestion text (the F2 line says "the three most exposed desks",
the MOVES line "two exposed desks", a veto "a desk owner vetoes"); the TRACE, DETAILS and MORE folds
drop the extra arrow; WALK is hidden from the command window and the sequence (`panels.js` MAIN,
`available`), its window and code stay. The furniture test found that a moved piece was shown as a
flat coloured rectangle at its new place while its own sprite stayed in the pre-rendered row strip;
now `drawSim` moves the piece in the level's furniture list (home positions kept) and rebuilds the
row strips, so the board or table is drawn where it went, with a faint outline where it was; strips
and homes reset per floor. Checked on the midterm eve within limits: four moves, the strips rebuilt,
the board beside the aisle desk and the table in the lounge drawn as pieces. The first pass on the
look (`tileset.js`): a one-pixel outline round each piece's footprint and a shadow along the right
of its face and under it, a shadow under every person's feet, the chairs a muted red, a second
lighter speckle on the concrete. The reference sheets in `Graphics/` (warm, outlined pixel interiors)
are the direction; the next passes are the owner's call.

### 2026-11-13, morning: step 1 in view at the start; walls win over furniture

The owner: step 1 should be expanded to begin with; no desk or other piece may overlap a wall. Found:
step 1 was open at load but the page had scrolled to it, leaving the command window off the top;
and in the oblique a piece's plan is drawn a face-height above its footprint, so a piece against a
wall climbed into the wall's foot, and a piece whose Revit box reached into a wall tile was drawn
over the cap. Done: `panels.js` opens the page scrolled to the top and later scrolls a step into
view only when it is out of it; `buildStrips` clears every piece wherever a wall tile's cap and face,
a narrow wall's cap or a pane's line overlap the piece's drawn rectangle, so the wall shows through
(pieces fixed to a wall, felt, screens, backdrops, projectors and anything lifted, are left alone).
Checked in the browser at zoom 2 on the kitchen, the north bay under the lounge and the west bays.

### 2026-11-13, morning: the wall caps as one layer, corners joined

The owner: clean up the walls so the corners join. Cause: a north-south wall is a 10 px cap, an
east-west wall a full tile, and a corner or junction tile was a full square, so the square stuck out
3 px past the bar on the side with no wall; and each tile outlined its own edges, so joins showed
notches. `buildStrips` now rasterises the caps as one mask in tile space, shaping every tile from its
neighbours (a corner is the union of its two bars; a narrow run stays 10 px; headers over doors and
columns stay full), and draws the outline per pixel wherever a cap pixel meets open space, so every
corner and T-junction closes. The faces below are unchanged. Checked at zoom 2 on the north offices,
the middle core and the south rooms; console clean.

The owner then pointed at the top of the middle core, where the wall over the doorway did not meet the
bar beside it: the tile next to a door's header counted as having no wall beside it and so was drawn
as a 10 px bar with a 3 px gap to the header. `narrow` now counts a header as a wall beside the tile,
so the corner over a doorway is shaped to join it.

### 2026-11-13, morning: two panes

The owner asked for tiled views as in a modeller, two panes for a laptop. Done: a second
`PixelFloorView` on a second container (`#pane-b`, `#game-b`) sharing the tiles, the program, the
context and the run with pane A (`run.js` hands the run to both); the VIEW tabs end with PANES ONE |
TWO, and with TWO a second tab row for pane B (the floors, ISO and PLAN); in `#stage.two` pane A's
canvas, labels, floor view and overlay sit in the left half of the stage beyond the command column
(`--panel-w`), pane B in the right half with a rule between; the three.js scene and both Phaser games
are resized and refitted on the switch and on a window resize. The building stays pane A only;
overlays and moved furniture draw in pane A. Checked at 1400 px: pane A Level 3 plan beside pane B's
Level 3 isometric, pane B on Level 1 in plan, pane A on the building, and a run drawing its agents in
both panes; console clean.
Also checked: the ACTIVITY overlay stays aligned on pane A in two-pane mode (the diagram shares pane
A's left offset). Seen on the way, open: the pixel isometric of a floor draws no agents during a run
(the plan does), so a pane on ISO shows the empty floor while the run plays.

### 2026-11-13, morning: pane titles, the default panes, the site's edge and the zoom floor

The owner: a view title in each pane's corner that switches the view, as in Rhino, besides the VIEW
window; two panes by default with the building isometric and the third floor; the WHEN step keeping
the third floor in a pane; no black beyond the site; a limit on zooming out so the building never
becomes a speck and not too much site is drawn in plan. Done: a `.pane-title` select in each pane's
top-left corner (`renderPaneTitles` in `main.js`, kept in step with the tabs); `paneB.on` true by
default with Level 3 in plan while pane A opens on the building; the `npc:step` handler leaves pane A
alone when pane B holds the Level 3 plan; in `game/scene.js` the camera background turns to the site's
ground colour once the context is drawn, the fit zoom becomes the floor's minimum zoom and the camera
is bounded to the floor plus its 60-tile context margin; in `scene.js` the three.js background is the
same ground colour and the orthographic zoom floor is 0.7 of the framed view. Checked at 1400 px:
the defaults, the titles switching pane A to Level 1 plan and pane B to the Level 3 isometric and back,
zooming out stopped at the fit, console clean.


### 2026-11-13, morning: three columns, the pane divider, a cream ground

The owner: the edge between the panes dragged to give one view more room; the feed a panel of its own
on the right instead of a window over the model; the ground behind the command windows nearer the
windows' cream than black. Done: the page is three columns. The command windows sit on a cream ground
(`html, body` background), the stage runs between `--panel-w` and `--feed-w`, and the feed fills the
right column (320 px, 260 px below 1440 px wide, a 30 px upright bar when folded; a
`MutationObserver` on the feed's fold sets `body.feed-folded` and refreshes the views). The panes
split the stage at `--split`; a `#divider` on the seam is dragged with pointer events, kept between 25%
and 75%, and on release the three.js view resizes and both floor views refresh and refit
(`refreshViews` in `main.js`). Checked at 1400 and 1366 px: the divider moved to 70% with both canvases
resized, the feed opening pushed the stage in rather than covering it, the message bar stays within
the stage, console clean.

### 2026-11-13, morning: the feed floats again, a third of the window at most

The owner: the feed column took too much room; let it overlap the model but never grow past a third of
the window, scrolling after a few messages. Done: `--feed-w` is 0, so the stage runs from the command
column to the right edge; `#feed` floats at the top right (300 px wide, `max-height: 33vh`), its body a
flex column whose list takes the remaining height and scrolls; the fold observer that refitted the
views is removed. Checked at 1366 x 768 with 30 test lines: the feed stopped at 253 px of a 256 px cap
and its list scrolled; the pane divider and the cream ground are unchanged.

### 2026-11-13, morning: the feed's handle, a loading bar, a pane alone

The owner: the feed resizable from its bottom edge; a retro loading bar centred on the model views
while the building and the people load; a double click on a pane's title giving that view the whole
stage, as in Rhino. Done:
- The feed ends in a striped grip; dragging it sets the feed's height (90 px up to the window's foot)
  and lifts the third-of-the-window cap; a double click on the grip returns the default.
- `src/ui/loader.js`: one bar of 24 cells in a cream window, centred on the stage, the last cell
  blinking, a percentage and a line saying what loads. On page load it follows `loadModel` (the model,
  the meshes by bytes, the elements, the geometry, the views) and hides once pane B's floor is drawn.
  On RUN it follows the floors and the program, the people, the term walk day by day, and the day.
  To let it move during the term walk, `TermLayer.runSteps` is a generator of the same walk (yielding
  after each day) and `run()` drains it, so results are unchanged; `RunController.build` is async and
  hands control back every ~40 ms (`walkTerm`). `play()` is split into `play` and `play2` so a failure
  hides the bar.
- The pane titles are now a name button with a menu (the hidden selects keep the change handlers).
  One click waits 240 ms for a second; a double click toggles `max-a` / `max-b` on the stage: pane A
  widens to the whole stage with pane B hidden at its size, or pane B is laid over the whole stage with
  pane A hidden at its size, so no view is ever resized to zero. The title reads "· ALONE" while
  maximised. With one pane on, a double click brings the second back; PANES ONE/TWO clears it.
Checked at 1366 x 768: the bar at page load and on a Tue 13 Oct run (2% to 100% through the term's
days, hidden as the run started), the menu on one click, both panes maximised and restored, the feed
dragged to 505 px, console clean; `test/run-day.mjs` runs as before.

### 2026-11-13, midday: people drawn in the references' style, animated, with bubbles

The owner shared three references (a sheet of chibi characters, a top-down shop and a clinic) and
asked for the people to be studied and replicated and for animation that brings the run to life.
The study is `research/pixel-people-and-animation.md`. The figures are original, drawn by code in
that style; no reference character is copied. Done:
- `src/game/people.js`: a 16 x 24 chibi per person, from the person's id and the run's seed (visual
  only): a round 12-pixel head, two-pixel eyes, eight hair styles with a crown highlight and a shaded
  side, seven skin tones, natural, grey and rare dyed hair, shirts with a shaded side (a share in
  black), short or long sleeves, open jackets for most instructors, glasses, blush, beards, and an
  outline pass that inks every empty pixel beside the figure, then a shadow under the feet. Eight
  frames by four facings (left mirrors right): stand, two steps, breath, blink, seated, seated typing,
  seated blink.
- Animations: walk (step, stand, step, stand at 8 fps), idle (a one-pixel breath and a 110 ms blink
  every few seconds), type (hands alternating in bursts with a pause and a blink) for desk work, and
  sit (still, blinking) for eating, lectures and seminars. Each person starts at its own frame and
  runs at 0.85 to 1.15 of the pace, so a crowd never moves in step. `scene.js` switches animation only
  when the state changes.
- Bubbles: a 14 x 14 sheet of ten icon bubbles; the plan scene listens to the run's event bus and
  shows a heart for a between-year conversation, talk dots, ?, !, a page, a check, a note, a cup, Z
  and a sweat drop by event and remark topic (table in the study). One bubble per person every 3.5 s,
  ten on screen (sixteen for the important ones), a pop with overshoot, a hold, then a rise and a
  fade. `EventBus.off` is new; the scene unhooks on shutdown and when the run changes.
Checked at 1366 x 768: a contact sheet of twelve looks in three facings and of the frames, then a Tue
13 Oct run on Level 3 with people typing at desks, idling in the lounge and walking, and talk and
heart bubbles at 11:48; switching floors keeps the bus at two listeners; console clean;
`test/run-day.mjs` unchanged. Not built: ambient object animation (screens, the plotters' busy light,
the kettle), the next step in the study.

### 2026-11-13, afternoon: an excited bubble, objects that move, a jump in time, a reset on new settings

The owner: an excited bubble instead of the heart; animate the objects; let the user drag the run to a time or type one;
reset the run's bar when the kind of run changes. Done:
- The between-year bubble is an orange "!!" (`EMOTE.excited`), the heart is gone.
- `src/game/objects.js` (`ObjectFx`, made by the plan scene, redrawn ten times a second): plotters, small printers, 3D printers,
  kettle and coffee machine, microwaves, lab computers, the crit room's screen and projector, the beer taps and a laptop on
  every desk in use. Every effect reads the run (the plotter queue and paper, `printDone`, activities within a few tiles),
  table in `research/pixel-people-and-animation.md`. Overlays sit at their piece's row depth, so people further south stand
  in front, and follow pieces the agents move.
- RUN: a GO TO box (14:30, 2:30 pm, 9, 01:15 for after midnight; anything outside 07:00 to 02:00 is refused with a hint) and a
  draggable progress bar with the time under the pointer. `RunController.seekTo` plays forward without drawing (the feed
  quiet, redrawn once at the end; skipped bubbles dropped) with the loading bar; going back rebuilds the day from the same
  settings and plays forward. Paused stays paused. `adopt(run)` gathers what a run on show needs.
- Going back needs the world as the model has it, and it was not: the layout manager's moves, the kitchen spot it adds,
  the `shared` and `screened` marks and desk owners stayed in the shared `World` from one run to the next, so a second run
  after a rearranging run started from moved furniture (a bug before today too). `World.restoreLayout` keeps the loaded
  layout before the first run and puts it back at the start of every build. `test/_rewind.mjs` checks it: a run rebuilt
  after a whole day of moves and played to 15:00 (WITHOUT LIMITS) or 18:00 (WITHIN LIMITS) reaches the straight run's state
  exactly (events, encounters, moves, every agent's place and activity); EVERYDAY to 11:00 too.
- A run belongs to its settings: any click, change or typing in the steps that changes the date, seed, movement, period,
  seeds or situation resets the run (bar back to 07:00, furniture back in the views via `restoreFurniture`).
Checked at 1366 x 768: GO TO 14:00 from no run in 8.2 s (build included), back to 9:30 in 3.9 s, a bad time refused, the bar
dragged to 60% landing at 18:24, WITHIN LIMITS resetting the run, the kitchen at 12:40 with a lit microwave and steam, a busy
plotter blinking and feeding at 12:50, 55 laptops glowing; console clean; `test/run-day.mjs` unchanged (3833 events).

### 2026-11-13, afternoon: the agents' moves marked; the bar as a scrubber

The owner: a way to see what the agents moved even after fast-forwarding; dragging the run like a video player. Done:
- `LevelScene.drawMoveMarks` draws every move on the floor for the rest of the run: the old place as a dashed cyan outline,
  a dashed arrow, the new place with a pulsing outline and a light tint, and a numbered tag. A move flashes an expanding ring
  when it first shows, live or after a jump, so a jump over the morning ends with the morning's moves flashing. Cyan is used
  for nothing else on the plan. `restoreFurniture` clears the marks.
- RUN lists the moves (MOVED BY THE AGENTS, number, time, floor, what, the signal tag); a click centres whichever pane shows
  that floor in plan and flashes the move (`findMove`, `showMove`); the message says which floor to show if none does.
- The progress bar: a knob at the playhead, a taller bar in use, the time and a lighter fill under the pointer on hover
  ("back" or "start" when that applies). Pressing pauses the run (`scrubStart`); dragging ahead plays the run toward the
  pointer 22 ms a frame (`scrubTo`), so people move under it; dragging back waits for the release and rebuilds
  (`scrubEnd` to `seekTo(t, resume)`); the run then goes on as it was. Keys on the bar: arrows skip 10 minutes, Home, End,
  space plays and pauses.
Checked at 1366 x 768: WITHOUT LIMITS to 16:00 listed three moves (two boards rolled to the aisle as screens, a side table
outside the kitchen); a click centred the plan on move 3 with its ring, tag and arrow; a scrub ahead in 30-minute steps kept
up within 200 ms each; back to 08:54 rebuilt and resumed; a real drag to 16:30 and an arrow key to 16:40; console clean.

### 2026-11-13, afternoon: a first methodology graphic

The owner asked for a graphic of the methodology (the inputs, the sources, the agent design) brief enough to read at a
glance. Draft: `research/methodology-graphic.svg` (1600 x 932), generated by `research/make_methodology_graphic.py`, so
the text is edited there and the script rerun. Five windows in the tool's style, left to right: THE MODEL (Revit export
counts, checks, the 0.5 m tiles, the rule that geometry comes only from the model), WHAT I PUT IN (room program, 61 added
objects, 10 edits, the cohort, the calendar, about 78 checklist answers, 34 questions with 29 settled), WHAT THE DATA
SAYS (UBC sources and the key papers, each with the one number it supplies; the 105-item ledger: 71 insider, 30 data,
44 assumed), THE AGENTS (five of the tool's own pixel people, traits, states, decisions, remarks, the term layer over the
day run, the three rearranging levels), WHAT COMES OUT (the computed metrics, suggestions with traces, the feed and the
bubbles). Below: the rules held to and the checks (12 of 12 cases, 39-run sweep, stress 18% against 20% and 43% against
40%). The facts come from the project's notes, gathered by a reading pass over research/ and program/; the footer names
what is not done yet (on-site observation, sensitivity analysis). Fonts: Silkscreen and Nunito from Google Fonts, so
the SVG needs a connection to show them; offline it falls back to Courier and Segoe UI.

### 2026-11-13, afternoon: the methodology graphic as a click-through

The owner: remove the CHECKED window; expand the agent parameters by category (personality, needs and so on); show the
object relations they set up; add a short description of each metric with its source and why it matters; summarise how
agents make a simulation with many work types and schedules possible; animate it so each step appears on a click and the
earlier ones fade. Done: `research/methodology.html` replaces the static SVG of this morning (deleted with its script).
A 1920 x 1080 page that scales to the window, in eight steps: 1 the model, 2 what I put in, 3 how rooms and objects relate
(use to activities, affordances, the 61 added objects, by-use rules, pieces on pieces, movable pieces, zones, renamed
pieces), 4 what the data says with the 105-item ledger, 5 the agents in eight cards (personality, rhythm and life, studio
drive, social, needs through the day, carried day to day, role, traits shape rates) with five of the tool's own people,
6 why agents, 7 what comes out (eight metrics with what each measures, why it matters and where it comes from, from
`analyse.js`), 8 the rules held to. Click, space or the right arrow shows the next step, which slides in while the earlier
ones fade to 38% (hover brings one back); the left arrow goes back, Home starts again, End or A shows all; the squares in
the top corner jump to a step. Printing shows every step. Checked at 1600 x 900: every window fits its text, and step 3
shows steps 1 and 2 faded.
- Fix the same afternoon (owner: text off the window in step 7): the metric table could not wrap and ran 27 px past its
  window, and steps 1, 4 and 5 ran a few pixels past their bottoms. The table now has fixed columns that wrap; step 7 is
  wider (668 px) and step 6 narrower with shorter lines; steps 1, 4 and 5 are tighter and row B is 10 px taller. A check
  of every window's scroll size against its box finds no overflow, with the web fonts or with the fallback fonts
  (Segoe UI and Courier New).

### 2026-11-13, afternoon: a guided tour in the tool

The owner asked for a tutorial in the tool that walks through the steps and can be skipped. `src/ui/tour.js`: twelve stops
(welcome; the steps; the two views, their titles and divider; VIEW; WHEN's test cases; the calendar, situations and
periods; RUN's movement levels; PLAY, the scrubber and GO TO; the feed; ANALYSE; the message box; ready). Each stop dims the
page but for the part it is about, outlined in a pulsing accent border, with a note in the tool's window style beside it
(right, left, below or above, whichever fits; inside the corner of a large target). NEXT, BACK, SKIP TOUR and a close box;
Enter or the right arrow steps, the left arrow goes back, Esc skips; while the tour is open its keys do not reach the views.
The tour opens steps by clicking their names, as a user would, and ends on WHEN. It opens by itself on a first visit, once
the views are drawn, and remembers being finished or skipped in this browser (`localStorage` key `npc-tour-v1`; storage
off means it can show again); `?notour` in the address keeps it closed; a TOUR button in the NPC V2 window replays it.
Checked at 1366 x 768: it opened on a first visit, every stop lit its part with the note beside it, FINISH stored "done"
and left WHEN open, a reload kept it closed, TOUR reopened it and Esc skipped it; console clean.

### 2026-11-13, afternoon: V2 on GitHub; the methodology as an artifact

The owner asked for V2 on the GitHub repository V1 used, as a new version, and for the methodology graphic as an artifact
to present. Done:
- `fl-79/npc`: V1 kept on the branch `v1` and the tag `v1.0` (commit c4643d2); `main` is now V2 (tag `v2.0`, release
  "NPC V2"). Tool-V2 is a git working copy of that repository from today. V1's Pages workflow is not in V2, so pushing
  V2 deployed nothing and https://fl-79.github.io/npc/ still serves V1.
- Left out by `.gitignore`: `viewer/node_modules`, the published papers in `research/2026-11-03 Collab` and
  `research/2026-11-03 Practice` and the downloaded reference images in `Graphics/` (copyright; the papers are listed in
  `research/references.md`), `.claude/`, and `exports/meshes.json` (112 MB, over GitHub's 100 MB limit). The repository
  keeps `exports/meshes.json.gz` (22 MB); the dev server sends it gzip-encoded when the plain file is absent, with its
  unpacked size for the loading bar, and `scripts/validate_export.py` reads it too. Checked: the building loaded from the
  compressed file with the plain one moved aside, and a fresh clone ran `test/run-day.mjs` to the same 3833 events.
- The README opens with what V2 is and how to run it (Node 18+, no Revit needed, seed 2026, no API key shipped).
- Ten files carry the owner's local folder path (the pyRevit buttons' export destination and the export logs).
- `research/methodology.html` gains a FULL SCREEN button (F) for presenting and a 16 px margin round the fitted page;
  the same page is published as a private artifact, "NPC V2 Methodology".

### 2026-11-13, afternoon: both versions on the site, newest first

The owner: a new intro, both versions as links, newest first; https://fl-79.github.io/npc/ showed only V1. Done:
- `pages/index.html`: the site's front page in the tool's style, the intro paragraph, then V2 (latest: open, how it was made,
  code) and V1 (proof of concept: open, code on the v1 branch).
- `.github/workflows/pages.yml` on main builds both: V2 from `viewer/` with `--base=./` and its `exports/` and `program/`
  copied beside it at `v2/`; V1 from the `v1` branch as it was at `v1/`; the front page at the root and
  `research/methodology.html` as `methodology.html`.
- V2 as a static site: every `/exports/` and `/program/` fetch is relative now (the same code runs under the dev server
  at / and under /npc/v2/), and `fetchJSON` falls back to `meshes.json.gz` and unpacks it in the browser
  (`DecompressionStream`) when no server does; it checks the gzip header, so a server that already unpacked it is fine.
- The README opens with the same intro and links, V2 first.
Checked with the site assembled and served locally: the front page; V2 loading the building from the compressed file and
running to 12:30 with 123 people in; V1's title screen and plan files from v1/ (its `/api/status` call misses on any static
host, as on the old site); the methodology page.
