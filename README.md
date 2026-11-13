# NPC V2

An agent-based simulation of studio life in UBC's Frederic Lasserre Building, built from the Revit model. 176 students and
instructors live a day, or a stretch, of the Fall 2026 term: the tool shows how the building is used, what the people say
and why, and suggests design changes, each traced to what caused it. V1, the proof of concept, is on the `v1` branch and
at https://fl-79.github.io/npc/.

## Run it

Needs Node 18 or later. Revit is not needed: the model's export is in `exports/` (the meshes compressed).

```
cd viewer
npm install
npm run dev
```

Open the address Vite prints (http://localhost:5174). A guided tour opens on the first visit; TOUR replays it. Runs use
seed 2026 unless you change it, so results reproduce. The tool ships no API key: the OTHER situation reader works only with
a key a user saves in their own browser, and a saved example runs without one.

`research/methodology.html` is the method at a glance: open it in a browser and click to step through.

Not in the repository: the published papers and downloaded reference images used during research (copyright; the papers
are listed in `research/references.md`), and the uncompressed `exports/meshes.json`.

---

# Building it: the model check

V2 of the NPC occupant-simulation tool starts from the Revit model of the Lasserre building,
not from a drawing. This folder holds the first step: the export out of Revit through pyRevit,
the checks on that export, and a 3D viewer in the pixel-art game style used to verify that the
model reads correctly before any simulation is built on it.

```
Tool-V2/
  scripts/rasterise.py        model.json -> exports/tiles/<level>.json, the tile maps for the game view
  viewer/game.html            the game view (Phaser 3), src/game/
  pyrevit/NPC.extension/      pyRevit extension: NPC tab > Model panel (Room Check, Export Model, Clash Check)
  exports/                    what Revit writes: model.json, meshes.json, collisions.json, rooms.json
                              and what the validator derives: checks.json
  scripts/validate_export.py  checks the export outside Revit, writes exports/checks.json
  scripts/run_revit_button.ps1 clicks a pyRevit button in the running Revit (UI Automation)
  viewer/                     the browser viewer (Vite + three.js)
  BUILD-LOG.md                what was asked, built, rejected and checked, by date
```

## Requirements

- Revit 2027 with pyRevit 7 (installed by hand, see the handover; do not install it from a shell).
- Python 3 with `shapely` (optional: without it the polygon checks are skipped).
- Node.js 18 or newer for the viewer.

## 1. Register the extension (once)

`%APPDATA%\pyRevit\pyRevit_config.ini`, under `[core]`:

```
userextensions = ["C:\\...\\Tool-V2\\pyrevit"]
```

Then pyRevit tab > Reload. The NPC tab shows Room Check, Clash Check, Export Model and Slab Tops.

Slab Tops changes the model: every wall and column that runs into a floor slab gets its top set
to the slab's underside, and elements that continue through a slab are joined to it so the slab
cuts them. It is one transaction (Ctrl+Z undoes it), the file is not saved, and every change is
listed with old and new values in `exports/fix-tops.json`. Curtain walls that continue through a
slab cannot be joined and are listed as skipped.

## 2. Export from Revit

With the model open, NPC tab > Export Model. It writes `exports/model.json` (facts: levels,
walls, doors, windows, rooms with boundary loops, columns, curtain walls, floors, stairs,
railings, furniture, other elements, openings, model lines) and `exports/meshes.json`
(triangles for every element). Units are metres, origin at the Project Base Point, +Y is
Project North. NPC tab > Clash Check writes `exports/collisions.json` (pairs of overlapping
solids with the overlap volume). Both can also be started from a shell while Revit is open:

```bash
powershell -File scripts/run_revit_button.ps1 -Tab NPC -Button "Export Model" -Marker exports/export-done.txt
```

```bash
powershell -File scripts/run_revit_button.ps1 -Tab NPC -Button "Clash Check" -Marker exports/clash-done.txt
```

After a pyRevit reload the ribbon sometimes exposes only its newest button to UI Automation;
pass `-Index <n>` (the button's position in the panel, 0 = leftmost) and the script clicks it
by position instead.

## 3. Validate

```bash
python -I scripts/validate_export.py
```

Prints counts per level, rooms per level, the family table, mesh statistics and every problem
found; writes `exports/checks.json`, which the viewer lists under CHECKS.

## 4. Urban context (optional)

```bash
python -I scripts/fetch_context.py
```

Downloads the surroundings of the Frederic Lasserre Building from OpenStreetMap (buildings
with heights, roads and paths, green areas, water, trees within 320 m) and writes
`exports/context.json` in the model's own coordinates. The model has no shared coordinates,
so the script fits the Level 1 to 3 slab outline to the OpenStreetMap footprint of the
building: the rotation between project north and true north (61.7 degrees) is inferred from
that fit and recorded in the file; the orientation was confirmed by the model's owner on 2026-11-03. The context sits on
the model's Level 1; real ground slopes are not modelled. Map data (c) OpenStreetMap
contributors, ODbL. The viewer shows it with BUILDING and in a floor's plan (game) view, never in a floor's isometric (layer "Urban context").

## 5. Game view (Phaser)

```bash
python -I scripts/rasterise.py
```

Turns every level of `exports/model.json` into a tile map in `exports/tiles/<level>.json`
(0.5 m tiles, with a debug PNG beside each): walls paint their tiles from centreline and
width, curtain walls paint glass, doors clear their host wall over their width, columns paint
their footprint, rooms paint the floor with their index, the slab paints the rest, stairs paint
runs and landings, and every piece of furniture keeps its plan box and a kind from its family
name. The pixel plan is then the floor game view of the model-check page (section 6), and it
also has a page of its own at http://localhost:5174/game.html (same dev server): a Phaser 3 scene
draws the level with the V1 drawing rules and palette (`Handover/V1-graphics-and-plan-geometry.md`,
ported in `viewer/src/game/tileset.js`): the floor as a true plan (dark concrete with a grid,
wood in offices, checker in the kitchen), every wall two tiles tall with a near-white cap and a
cream south face with a baseboard, a plainer outside face with pilasters, glazing as pale blue
panes with mullions, doors with their leaves and sidelites, furniture per kind at its plan size
with a front face (desks with sheets, a laptop or a model and a mug; red chairs; pin-up boards
with pinned sheets; counters with bottles; printers; bins), room labels, and a few placeholder
people (16 by 24, four facings) wandering the walkable tiles with placeholder remarks. Drawing
order is one strip per tile row, so what is further south stands in front. Keys 1 to 5 switch
floors, drag or arrows pan, wheel or + and - zoom by whole pixels. The tiles and sprites are
drawn in code and stand in for a hand-drawn sheet.

```bash
python -I scripts/check_enclosure.py
```

writes `program/enclosure-report.md`: for every room, its open edges to other rooms, the
corridor or the outside (which side, how long, what lies beyond), rooms with no door, and
rooms whose open floor in the tiles is under half Revit's area. Run it after every rebuild;
a finding is either something the model lacks (a correction for `program/edits.json`) or a
space meant to be open (the lounge to the studio).

## 6. Model-check viewer (three.js)

```bash
cd viewer && npm install && npm run dev
```

Open the printed URL (http://localhost:5174). The page renders the model at a reduced
resolution with nearest-neighbour upscaling, pixel edges and stepped toon shading; the
"Palette + dither" option snaps colours to a fixed palette with ordered dithering.

- Two views, no orbit. BUILDING has one view and one corner: the 2:1 pixel isometric of the
  whole block with its surroundings; GAME VIEW, TURN L and TURN R are disabled for it. One
  floor is drawn from its rasterised tiles (section 5) inside the same page, the Phaser scene
  taking over the stage, with every view: ISOMETRIC is its pixel isometric
  (`viewer/src/game/iso.js`: 2:1 diamonds, walls as capped blocks, glazing, doors, columns,
  furniture as boxes at their height, from any of the four corners, TURN L and TURN R or Q and
  E), standing on the floors below it and the surroundings as a ground plane at Level 1, the
  floors above cut away ("Floors below and surroundings" in VIEW turns that off); GAME VIEW
  its pixel plan with every south face standing up, placeholder people and the urban context
  around it (the "Urban context" layer toggles it there too). Zoom goes in steps (a quarter, a half, 1, 2, 3, 4, 6 pixels per pixel); FIT FLOOR
  or F picks the largest step that shows the whole floor, and every floor opens that way. The
  three.js controls that mean nothing there (cut, wall height, pixel size, edges, dither) rest
  until BUILDING is chosen again. Drag to pan, wheel or + and - to zoom, arrow keys or WASD pan,
  Esc clears the selection.
- LEVELS: BUILDING shows everything with nothing cut; in the game view it is then an
  elevation (south, and TURN L / TURN R walk round west, north and east). A floor button
  (Basement to Level 4; the roof has no plan) shows that floor alone as the storey between
  its level and the next level line: its own slab and every wall, window,
  column or stair that passes through that storey, cut at both level lines, so exterior walls
  and glazing that run through several floors appear on each. "Lower cut" sections it at
  "Cut height" instead (default 2.6 m). The VIEW window names the current view.
- LAYERS: toggle element kinds, room labels, grids, and room floor polygons (off by default;
  every floor is one colour whether or not a room covers it).
- ROOMS: click a room to frame it. Rooms with a check against them carry a red mark in the
  list and on their label.
- CHECKS: click a check to frame and highlight the elements involved (first red, second
  orange, a yellow box at a collision).
- Click an element in the view for its Revit id, category, family, type and level.

Nothing in `exports/` is edited by hand. Corrections to the model belong in Revit, or later
in an `edits.json` keyed by element id with a reason each.

## 7. Program: the rooms' names, uses and access

`program/rooms.json` is the owner's description of every room, keyed by the Revit room id:
name (optional: the use stands in), use (studio, office, admin, meeting, classroom, crit,
kitchen, lounge, photography, shop, WC, storage, service, hall, stair, elevator, other),
access by how the school works (`campus_class`: all campus students when they have class there;
`arch_only`; `arch_class`: architecture students when they have class there; `arch_all`: all
architecture students any time, the studio; `professor`; `staff`; `bookable`; `none`), the
operation (`business` or `always`), who in words, notes, and `done` or `flagged` with a reason.
It was first entered in a PROGRAM window of the viewer (2026-11-05 and 06, since removed) and
is kept up by chat: the owner confirms a room by its number, the change is applied with a
small script that names its source (`scripts/apply_chat_<date>.py`), and a rule applied from a
general remark is marked `access_inferred` until confirmed.

```bash
python -I scripts/program_todo.py
```

regenerates `program/TODO.md`: the rooms flagged for later, the rooms labelled without an
access rule, the inferred rules to confirm, and a per-level summary. The viewer shows the
program names in the ROOMS list and on the pixel labels, a use picks the floor pattern, and the
status window counts what is still open on every load.

`program/edits.json` holds the owner's corrections to the model, keyed by Revit element id
with a reason each: `add_door` and `add_opening` name their host wall (an opening, or a door
with `leaf: false`, is a doorway without a panel, drawn open under its header), `add_wall`
names the rooms it divides and the room on whose side of their shared boundary it is painted,
one tile thick, `note` records a confirmation or a question without changing anything. `scripts/rasterise.py` applies them
when it builds the tiles, marking an inferred position as such. `exports/` is never touched.

`program/building.json` holds the building as a whole: its entrances (Level 1's six glass
double doors in the curtain walls, which the rasteriser opens as doors) and how they are
locked: the south door with 24/7 key-card access, the others locked outside business hours
with no scanner.

## 8. Objects and what agents do with them

The simulation needs to know what is in a room and what an agent can do there. The model
answers the first only for the furniture that was drawn (Level 3: the studio's desks, chairs,
boards and tables, the crit rooms' tables and chairs, the kitchen's counters, the lounge's
seating), so the description is split in three, all under `program/`, gathered room by room in
chat (Level 3 crit rooms 1 and 4 first, 2026-11-06):

- `program/affordances.json`: the catalogue of object kinds, modelled or not (desk, chair,
  table, freestanding pin-up board, pin-up wall, projection screen, projector, counter,
  printer, bin, seating, elevator, ...). Each says what an agent does there (verb, posture,
  people at once, typical minutes), whether people move it, and what it needs (a chair, a
  wall, a projector). Entries filled from general use rather than the owner's words say
  `inferred: true` until confirmed.
- `program/objects.json`: the objects the building has and the model lacks, added per room
  with a placement rule, a reason and a source, every one `inferred_position: true` (pin-up
  felt on every opaque wall of a crit room; the screen high on the wall on the door's side;
  the projector, ceiling-mounted, facing it). The rasteriser places them from the room's walls
  in the tile map and flags them `inferred` with their object id; the pixel views draw them
  with amber dashes (plan) or amber edges (isometric), so an added object never passes as
  modelled. Placement rules so far: on every opaque wall; against a named wall at a given
  mount (high, a shelf, on the floor) with a width and depth; from the ceiling facing a wall;
  in a corner of the room's main floor; on a modelled counter at a fraction along it; a count
  of pieces along the top of another added object; a box in model metres. A `by_use` rule
  applies to every room of a use in the program instead of one room: the office rule puts a
  desk sized by the room in every office up to 25 m², facing the door, with the occupant's
  chair, a visitor chair across the desk, a shelving unit on another wall and, on Level 4, a
  counter along the window; the larger offices have shared desks, number unknown, and nothing
  placed until the owner gives the count. The crit rule gives every crit room Level 3's felt,
  screen and projector; the washroom rule gives every washroom about four stalls and three
  sinks along its walls. The same file holds `rekind`, the owner's kind for
  a modelled piece whose family name misnames it (the lounge's "Bench2" is the coffee table,
  "Family4" the bar), marked and drawn amber when the kind is a guess, and the owner's rules
  for a room's modelled pieces (crit room tables on casters, moved aside or stacked top to
  top; chairs turned wall to wall; communal kitchen appliances).
- `activities` on a room's entry in `program/rooms.json`: what pulls people into the room
  and how it is arranged for it (a crit, a history seminar, a studio lecture), with the
  parameters left `pending` until the studio-culture handover notes are imported.

The objects file also holds simulation `toggles` (movable furniture, off by default: the
studio's desks and boards are on casters but not moved during the semester), `global_rules`
(service shafts and rooms are not occupiable; the rasteriser lists their tiles as `no_go` per
level and the people keep out), and `zones` (which cohort sits where in the studio; every
desk and chair carries its cohort, with the boundary lines marked inferred).

The modelled pieces need no entry: they come from the export with their Revit id, family,
footprint and height, and their kind maps them to the catalogue. `scripts/program_todo.py`
lists the inferred positions, the pending activities and the catalogue kinds to confirm.

## 9. Simulation: the first piece, stairs and the elevator

`viewer/src/sim/` is the start of the occupant simulation: how agents move about the building
between floors. It reads every level's tiles and `program/simulation.json`, where every number
(the elevator's capacity and timings, walking and stair speeds, how a trip picks stairs or
lift, the test agents) is an assumption marked as such until the owner or the handover
confirms it.

- A floor is a walkable grid (`grid.js`): floor and door tiles, stair tiles slowly, the
  elevator car's tiles as transit; furniture and no-go areas block. Routes on a floor are A*
  (`path.js`).
- The building (`building.js`) links the floors: each stair's tiles on the level it starts
  from are a portal to the tiles over its far end on the level above, and back; the elevator
  has a landing tile beside the car on every level, chosen as the walkable tile with the most
  open neighbours because the model does not say which side the doors are on.
- The elevator (`elevator.js`) runs under collective control: landing calls (floor and
  direction) and car calls queue; the car keeps its direction while calls lie ahead, stopping
  for car calls and for landing calls its way when it has room, so it picks up people going
  the same way; it reverses only when nothing is left ahead; idle, it answers the oldest call.
  Boarding at a landing is first come first served.
- The agents (`sim.js`) are test occupants for now: each picks a destination on another
  floor, goes by stairs or lift (by rule, or as the window says), stays a while, and goes
  again. Their schedules come later from the activities and the handover.

The SIMULATION window of the page starts, pauses, resets and speeds it, sets the number of
agents and the stairs-or-lift mode, and shows the counts and the log. With a floor in GAME
VIEW the agents on it are drawn as the people sprites with their number, the car is marked
(grey elsewhere, amber here, green with the doors open) with its floor, way and load, and the
landing in amber. `node test/sim-smoke.mjs [seconds] [agents] [auto|elevator|stairs]` from
`viewer/` runs it headless and prints what the lift did.

## 10. The interface (empty steps, 2026-11-07)

The page is laid out like a console RPG menu (the Dragon Quest / Final Fantasy / Pokémon grammar:
bordered windows that open one at a time, a cursor on the current line, a message box along the
bottom, Up/Down + Enter, Esc to go back):

- **The command window** (top left) lists the steps in order, 1 DAY / SITUATION · 2 RUN · 3 ANALYSE ·
  4 WALK, then one extra command, AGENT. VIEW is not a step since 2026-11-12: it is a constant
  window under the command window whose view tabs are always in sight; the tool opens on step 1
  with the studio floor in plan. The FEED window (top right) is the log. The cursor marks the current line; a step
  that has been settled shows a check and its choice on its line ("Level 3, game view", "Tue 13 Oct").
- **The VIEW window collapses to its bar** while a step is open, but its **view tabs stay in sight**
  under the bar through every step, like a modeller's view tabs (owner 2026-11-12): BUILDING, L4, L3,
  L2, L1, BASEMENT, then ISO and PLAN. The current view is named on the bar and the arrow reopens
  the full panel. Opening step 2 (DAY / SITUATION) takes the view to Level 3 in plan unless it is
  there already. A floor has two views, ISOMETRIC and PLAN VIEW (the pixel plan, called "game view"
  in sections 5 and 6 and in the code's mode name). There are no turning buttons; the isometric is
  drawn from one corner (Q and E still turn it from the keyboard; F fits the floor). A view button
  that does not apply is greyed out: for the whole BUILDING only ISOMETRIC applies, so PLAN is
  greyed. The DRAWING settings (pixel edges, palette, labels, floors below, pixel size, wall height,
  placeholder people, the cut) are off the interface since 2026-11-12; the code keeps them at their
  defaults, with placeholder people at 0 now that a run draws the real ones.
- **One other step window** is open at a time under it. BACK and NEXT at its foot walk the main
  steps in either order; any command line can be chosen directly. The close mark or Esc goes back
  to the command window; AGENT, LOG and MODEL have a back mark to the step that was open. The
  model-check status window is gone: the model summary and the LAYERS, ROOMS, CHECKS and
  SELECTED tools sit behind the MODEL command.
- **The message box** (bottom) says one thing at a time: the step's help, the picked day, the model
  summary while it loads, with a "more" mark when there is a second line.

| Step | What it will do | What works now |
|---|---|---|
| 1 VIEW | the floor (BUILDING or one level), the view (isometric, game view, turns, fit) and the drawing options | all of it (the three.js and Phaser views of sections 5 and 6) |
| 2 DAY / SITUATION | **one or the other.** A DAY: the term, the seed (the set of people), the day on the calendar and its hours, run as the calendar has it. A SITUATION: a dropdown of events the tool knows (a review day, a pin-up, the last desk crit, Good Times, Waffle Wednesday, a deadline) and stresses on the floor (plotter paper out, lift out of service, fifteen more students, a deadline clash, a weekend before a review), or **other**, which opens a text box whose description is read into a known event or marked untested (INTERPRET); the situation attaches itself to a day that fits it and CHANGE DAY moves it. Under both: the occupants, read from `program/cohort.json` and never typed | the switch, the calendar and day pick, the dropdown attaching its day, the text box for "other", the occupants line, the summary on the command line ("a review day · Fri 16 Oct") |
| 3 RUN | **the rules of the run first**: the number of agents (the cohort plus what the situation adds, read-only); **movement**, how far agents may rearrange the space (everyday use only, the default and the studio's own rule; rearrangement by groups, negotiated through a layout manager with owners' veto, hard limits on circulation and the floor norm as threshold; free rearrangement, every object movable by preference, a stress test flagged unrealistic); the policies (24/7 card access, plotter paper at all hours, the basement shop); the **horizon** (the picked day; the term; the school year with the cohort turning over; N terms) and the **ensemble** (how many seeds); then PLAY, PAUSE, STEP, RESET, speed, the clock, the day's progress and headcounts | the rules (interface state; the message box explains each), the occupant count, the summary on the command line ("not run · the term · rearrangement by groups") |
| 4 ANALYSE | in this order: the **SUMMARY** of design suggestions (one per rule that fired, each with a TRACE to its situation, metric, events and remarks; since 2026-11-12 also one **MOVES** suggestion per kind of move the agents made, the permanent version of what they did, with its measured effect); the **overlay on the plan** (activity, encounters, paths, queues, noise, by year, drift; hours; B minus A) with a DETAILS fold giving what, how, registry IDs and references; the **metrics at this week** as cards (A and B as bars with the benchmark mark); the **timeline over the horizon** with the seeds' band; the **Pareto** view; export. The overlay draws on the stage over the floor's plan in the vector style of the sample | the layout; the cards list the core set with no values |
| 5 WALK | enter the picked day as a visitor, walk, talk to the nearest agent | the layout |
| AGENT | the inspector for a clicked agent | the layout |
| FEED (window, not a command) | the agents' remarks as the run plays, the engine's events and the suggestions as their rules fire, with filters and SAVE; this is the log | the layout |
| model-check tools | for the builder only: add `?model` to the address to see the export summary, LAYERS, ROOMS, CHECKS, SELECTED and the stairs-and-lift test piece | all of it |

Short option lists (movement, horizon, speed, where, compare, the entry door) are rows of buttons
with one lit, as a console menu does it; only long lists (the situation, the overlay layer) stay
dropdowns. Hints are a few words; the message box carries the explanation. Every control with
nothing behind it is disabled; the ids are the contract the engine will be wired to (`viewer/src/ui/panels.js` holds the menu, the calendar and the
message box; the step windows are in `viewer/index.html`).

The methodology these steps serve, in short: a cheap *term layer* steps every day of the term and
carries the slow state (presence, progress, sleep debt, stress, ties, and the layout); a *day run*
simulates the picked day on the tile grid at one-second ticks from the state the term layer hands
over that morning. Rearrangement is slow, so it lives in the term layer: a *layout manager* settles
each day's move proposals by rule (ownership, the section, first come, a cooldown and a weekly
budget; circulation and egress as hard limits on the walk grid), saves a weekly snapshot, and a
longer horizon (the term, the year, N terms with the cohort turning over) projects the layout and
the metrics forward; several seeds give an ensemble and a band. Projections under the model's
rules, not predictions. Random streams are keyed by seed, agent and date, so a day is the same whichever days were
viewed before, and two scenarios with the same seed differ only by the scenario. `program/calendar.json`
holds the term dates, sessions, reviews, deadlines and events from the research notes, with every
assumed date marked `inferred`.

### A sample of the analysis

`viewer/analysis-sample.html` (open it at `/analysis-sample.html` on the dev server) shows the
form of ANALYSE's output before any engine exists, on the real Level 3 tiles with **synthetic
numbers**, marked as such in a banner. The plan is a vector diagram (SVG: flat rooms, wall lines,
furniture outlines), not pixel art, and each overlay is vector too: occupancy as circles per desk,
encounters as circles coloured same-year or between-year, paths as translucent lines (real BFS
routes from a sample of desks to the plotters, kitchen, lounge and 3D printers, darker where they
share a tile), queue ticks, noise as soft discs, desks by cohort zone, layout drift as outline,
fill and displacement. Under the overlay a DETAILS fold gives what it measures, how it is computed,
the registry IDs and the references. The right side has a SUMMARY of rule-based design suggestions
(each from a metric against its benchmark or A against B, pointing at a place on the plan), the
metrics as cards (A and B as bars with the benchmark mark and a plain-language reading, grouped
collaboration / focus / layout), the timeline over the term with a caption saying what it is, and
the Pareto view with its caption. Nothing on it is a result.

### The feed, and tracing a suggestion back

The owner's V1 had agents talk back: a remark in the agent's voice at each decision point, with a
"because" line carrying the computed fact, shown as a bubble on the plan and in a feed. V2 keeps
that as the **FEED** window (top right of the main page, open while RUN, ANALYSE, WALK or AGENT is
open): remarks, the engine's events, and a suggestion the moment its rule fires. It is what makes
the run visible while it plays. In ANALYSE every suggestion opens a **TRACE**: the situation it
came from, the metric, the events on the plan, and the agents' remarks at the time; clicking an
event or a remark marks the place on the plan and scrolls the feed to it. That chain, suggestion
to metric to event to remark to situation, is the verification. The sample page shows all of it
with a feed that plays itself.

The overlay's drawing rules come from the owner's reference diagrams in `graphics/Plan-diagram`:
heavy black wall poché on white, hairline grey furniture, one hue per reading, soft blobs for
fields (red for activity, blue for quiet), smooth thin path lines in the year's colour with an
arrowhead at the destination and one dark line through the shared corridor, faint hatched tints
for the cohort zones, a scale bar and a north arrow.

## 11. The engine (2026-11-07)

The simulation behind the steps, in `viewer/src/sim/`, built from the research notes and the
owner's decisions; every number it reads is in `program/parameters.json` under its registry ID
with a status code (C confirmed, D data, D* adjusted, M model, A assumed). Nothing is typed in
the interface. Run it headless from `viewer/`:

```bash
node test/run-day.mjs 2026-10-13 none everyday 2026
```

| Module | What it does |
|---|---|
| `rng.js` | keyed random streams (seed, agent, date, purpose): a day is the same whichever days were viewed before; the same seed gives the same people |
| `calendar.js` | the term (`program/calendar.json`): sessions, reviews, last desk crits, pin-ups, deadlines, events, closures, phases, weeks |
| `population.js` | 165 students in years and sections and 11 instructors: a Big Five draw with the field and sex shifts, circumstances, chronotype, keenness, making skill, and every behavioural parameter as a log-linear mapping (no personas); TAs, mentors, newcomers; the initial ties |
| `world.js` | rooms by number and use, every piece as a standing spot, the studio's desks by cohort zone with sections contiguous and the spares as hot desks, the plotters and printers, kitchen, lounge, washrooms by sex and level, crit and class rooms, shops, offices, the 24/7 door; a path cache |
| `term.js` | the term layer: every day, cheaply, the plan per agent (arrival by chronotype, hours from H_base and the TMT ramp, the studio session, the lecture, seminars and off-site lectures, lunch, printing before pin-ups and reviews, shop and 3D printing, events, the job shift) and the slow state (comfort, sleep by the hurdle model, sleep debt, progress, stress calibrated to about 20% high in a normal week, ties, spend); crit slots first come first served; weekly snapshots |
| `engine.js` | the day run: one second at a time on the grid; arrival at the south door; A* walking, the stairs or the lift; activities; needs (washroom on another floor, water, food); work bouts and breaks (renewal); desk crits with the instructor walking over; lectures and seminars; the plotter queue (two servers, paper that runs out outside staffed hours); encounters (Bernstein's rule), conversations, ties, interruptions, headphones, noise; situations applied on top of the calendar; the event stream and the remarks |
| `events.js`, `remarks.js` | the typed event stream and the remarks in the agent's voice with their "because" line (the V1 pattern) |
| `stats.js`, `metrics.js`, `rules.js` | the aggregators (tile fields, pair table, sites, focus blocks, exposure, queues, walked paths), the core metrics against their benchmarks, and the suggestion rules with their evidence (event and remark ids, spots) |

The interface modules in `viewer/src/ui/`: `run.js` (RUN, the AGENT inspector, the WALK avatar),
`feed.js`, `analyse.js` (summary with traces, metric cards, timeline, Pareto, export) and
`diagram.js` (the vector plan and the overlays over the stage). In the page: PLAY builds the people
and runs the term to the picked day, then the day at the chosen speed; the agents draw in a floor's
PLAN VIEW; the feed fills; when the day ends ANALYSE fills. A longer horizon runs the term layer to
the end of the term or the year for the timeline, with a band over the seeds. The previous run
becomes B. Calibration is not finished: `program/QUESTIONS.md` lists what is open.

### 11a. After the owner's answers (2026-11-08)

The owner answered the build's 21 questions (`program/QUESTIONS.md` keeps the table and the open
items 22–28; `program/TEST-CASES.md` has twelve runs to try). What the engine does differently:

- **Washrooms** by floor and role: students to Level 2 from the studio and Level 1 from a lecture, instructors to Level 4 (`world.washroomFor`).
- **Room 30** is a crit room although unfurnished: used from its floor tiles. **Four boxed-in desks** are reached through a gap the engine rolls open in the thinnest movable piece between their pocket and the floor (`world.gaps`, grey dashes in the DRIFT overlay); 172 of 172 desks in use.
- **Instructors** are sessional (no office, session only) or permanent, with or without an office in this building (Level 4); each has a **crit mode**, desk by desk or a spot the students come to, with a switch to the spot when the bay is crowded or loud. **Office-hour visits** depend on the student (keenness, N, C).
- **Lectures and seminars** are booked first come from a timetable built per seed (`term.buildTimetable`): the year's lecture in the smallest classroom that seats it, each section's seminar on a non-studio weekday clear of lunch in a crit room.
- **Focus benchmark** F1 = 11 min median (Mark, González & Harris 2005), with DeskTime's 52 as the undisturbed bout and the share of blocks ≥ 25 min beside it.
- **AGENTS REARRANGE** (the owner's reading of the rearrangement feature): the design suggestions happen live, by the agents. `sim/layout.js` reads the live signals every half hour (plotter queue, exposed desk, crowded kitchen, the years not meeting) and the agents concerned move a side table or a board, under a budget, a cooldown, a veto by the affected desk owners and a connectivity check; the move is an event with a remark, is drawn in the plan and the DRIFT overlay, and the end-of-day suggestion it anticipates reports the attempt and its measured effect. **FREE** drops the limits.
- **OTHER situations** are read with the user's own Claude key (`ui/interpret.js`, `@anthropic-ai/sdk` in the browser, the key in localStorage only); without a key the option is greyed out and the listed situations are the menu. The reading is a structured spec the engine applies (`engine.applySpec`) and lists in the run's first line.
- **Voices**: every remark is in a register drawn from the agent's traits (terse / chatty, anxious / calm, warm / blunt, precise / loose, vivid), shown after the name in the FEED and in the AGENT window.
- **Instructors from data (2026-11-11, items 22 and 23):** sessional share 0.6 from the APR's adjunct list, office-in-building share 0.75 from the faculty profiles, offices on Level 2 first; every session opens with a 15-minute **section intro** at the instructor's spot (an `intro` event and remark), then the year's lecture on the week's first session.
- **Pane titles, the default panes, the site's edge (2026-11-13, owner's notes):** each pane carries its view's name in its top-left corner as a menu, as a modeller's viewport title does (BUILDING · ISOMETRIC, LEVEL 3 · PLAN, LEVEL 3 · ISOMETRIC and so on; the VIEW window's tabs do the same); the tool opens with two panes, the building isometric in pane A and the Level 3 plan in pane B, and step 1 keeps the Level 3 plan in pane B (or in pane A when there is one pane); beyond the drawn site both views show the ground colour instead of black, a floor view cannot be zoomed out past the fit or panned off its site margin, and the building cannot be zoomed below 0.7 of its framed size.
- **Two panes (2026-11-13, owner's note):** the VIEW tabs end with PANES, ONE or TWO. With TWO the stage splits beyond the command column: pane A keeps the building or the first floor view with its tabs, pane B is a second floor view (plan or isometric of any floor) with its own tab row; both draw the same run (`PixelFloorView` instantiated twice, `pixelB` in `main.js`, the run handed to both by `run.js`). Overlays and the moved furniture stay on pane A. Two panes were chosen over four to keep a laptop comfortable.
- **The layout and the pane divider (2026-11-13, owner's notes):** the command windows sit on a cream ground on the left, the stage filling the rest. The feed floats over the stage's top-right corner, never taller than a third of the window; after a few messages its list scrolls (a column of its own was tried first and took too much room). The seam between the two panes is a handle: drag it to give one pane more room (25% to 75% of the stage); both views refit on release.
- **The feed's handle, the loading bar, a pane alone (2026-11-13, owner's notes):** drag the striped bottom edge of the feed to resize it (double-click it to reset). While the building loads, and while a run builds its people and walks the term to the day, a retro loading bar sits in the middle of the views. Click a pane's title for its menu of views; double-click it to give that view the whole stage, and double-click again to bring both back.
- **People and their bubbles (2026-11-13, owner's references):** every agent is a small chibi figure with a look of its own (hair, skin, clothes, glasses; drawn at random from the agent's id and the seed, visual only). People walk with a step cycle, breathe and blink while idle, type at their desks and sit still at a table or a lecture. Bubbles over their heads come from the run's events: an excited orange "!!" when two people from different years talk, talk dots, a question at a crit, an exclamation when the paper runs out, and more (research/pixel-people-and-animation.md).
- **Objects that move, and time you can jump (2026-11-13, owner's notes):** plotters blink and feed paper while printing (red when the paper is out), 3D printers sweep, the kettle steams, the microwave lights up, lab screens and laptops glow where people work, and the crit room's screen shows slides, each only when the run says it is in use. In RUN, type a time of day into GO TO (14:30, 2:30 pm) or drag the progress bar: forward plays the run on, back rebuilds the day with the same settings and plays it to that time (the run is deterministic for a seed). Changing the movement, the seed, the day, the period or the situation resets the run and its bar.
- **Moves you can find, a bar like a video player's (2026-11-13, owner's notes):** when the agents rearrange, every move stays marked on the plan for the rest of the run, even after a jump: the old place in a dashed cyan outline, a dashed arrow, the new place outlined and tinted, and a numbered tag. RUN lists the moves under MOVED BY THE AGENTS; click one to centre the plan on it. The progress bar works like a video player's: hover for the time, drag the knob and the run plays on under the pointer, drag back and the day rebuilds to that time on release; arrow keys skip ten minutes, space plays and pauses.
- **The methodology at a glance (2026-11-13):** `research/methodology.html` is a click-through graphic of how the simulation was made: the model, the inputs, how rooms and objects relate, the data, the agents' parameters by category, why agents, the metrics and the rules. Open it in a browser; click or press the right arrow for each step.
- **A guided tour (2026-11-13):** on a first visit the tool walks through itself in twelve short stops, lighting one part of the screen at a time: the steps, the views, WHEN, RUN, the feed, ANALYSE. SKIP TOUR or Esc leaves it at any point; the TOUR button in the NPC V2 window plays it again. Add `?notour` to the address to keep it closed (for testing).
- **Wall corners joined (2026-11-13, owner's note):** the caps are one layer, each tile shaped from its neighbours and the outline drawn per pixel round the whole layer, so corners and junctions close instead of a full square sticking out past a 10 px bar.
- **Step 1 in view at the start; walls win over furniture (2026-11-13, owner's notes):** the page opens with the command window and step 1 both in view, and a step scrolls into view only when it is out of it; in the plan no piece is drawn over a wall or a pane: wherever a wall's cap and face or a pane's line overlap a piece's drawn rectangle the piece is cleared there (`buildStrips`), pieces fixed to a wall excepted.
- **Moved furniture moves; a first pass on the plan's look; names out of the suggestions; WALK off (2026-11-12, owner's notes):** a piece the agents move is now drawn at its new place by rebuilding the row strips with the moved furniture (`LevelScene.drawSim`, the old place a faint outline), where before a flat coloured rectangle marked it; the plan's pieces carry a one-pixel outline and a shadow, people a shadow under the feet, the chairs are a muted red and the concrete has a second speckle (`tileset.js`); a design suggestion names nobody, the trace does (`rules.js` noNames); the folds show only their own arrow; WALK is off the sequence for now (its window and code stay).
- **Steps gated; ANALYSE in two groups; the graphs explained (2026-11-12, owner's notes):** a step's bar appears only once the step before it is done: RUN as soon as a day is picked, ANALYSE and WALK once a run has finished, when ANALYSE opens by itself; the greyed lines in the command window are the steps not yet reached. In ANALYSE the suggestions come in two groups, TO IMPROVE FOR COLLABORATION and OTHER DESIGN SUGGESTIONS, each with a TRACE to its situation, metric (a click goes to the card), events, agents and spots; the cards keep the ? in a fixed first column, show a one-line WHAT under the name with HOW, WHY and REFERENCE behind the ?, and carry a green or red left edge and tint for at or past the goal against short of or over it; C7 reads "no goal in the literature: compare two layouts"; C13, F11 and S1 are off the panel until they are computed (reminder set for 2026-11-13). The timeline and the contact-against-focus chart each have a one-line explanation and a MORE fold with how, why and the reference.
- **The metric cards read against a goal (2026-11-12, owner's note):** each card shows the simulated value with its unit, the goal from data or literature with its source (an assumed goal is marked [A]), the bar with the goal's mark, and a verdict in words: at the goal (within 10%), past it, short of it or over it, by the direction the metric should go; C7 is a reading with no goal, F11 and S1 are not computed. The ? fold is one short sentence each for WHAT, HOW, WHY and REFERENCE.
- **Step 1 is WHEN; the overlays over the pixel plan; the metric notes (2026-11-12, owner's notes):** step 1 is named WHEN (a day, a situation or a period), and a period is shaded light blue on the calendar with dark-blue ends, apart from the cream weekends; in ANALYSE every metric card has a ? that opens WHAT it is, HOW the engine measures it, WHY it matters and the REFERENCE with the benchmark (`METRIC_NOTES` in `analyse.js`, from `research/summary-metrics.md`); an overlay now sits on the pixel plan itself, which fades to grey under it (`#game.dim`), aligned to the plan's camera as it zooms and pans (`scene.planRect`, `Diagram.setOver`); in the isometric or the 3D building the vector plan is drawn as before.
- **A PERIOD in step 1, no horizon in RUN (2026-11-12, owner's notes):** step 1 offers A DAY, A SITUATION or A PERIOD; a period is a span inside the semester picked on the same calendar (the first day, then the last, or a preset: WHOLE TERM, TO THE MIDTERM, MIDTERM TO FINAL), built day by day from the term's start with a weekly snapshot kept from the span's first day, read in ANALYSE's timeline; the floor then plays the span's last day. The year and N terms are not offered. RUN asks only for the movement and the seeds; the "horizon" row is hidden and its inputs follow step 1 for the code.
- **The steps as an accordion, the movement groups, no policy toggles (2026-11-12, owner's notes):** the four main steps stay in sight as compressed bars with their choice on the bar, the open one unfolded, so the way back is a click on a bar; movement is EVERYDAY USE on its own and, under "agents rearrange", WITHIN LIMITS (the code's 'agents') and WITHOUT LIMITS ('free'); the policy toggles are off the interface, since 24/7 access is a fact, the basement shop keeps its own hours in the engine and the plotters run whenever they have paper (the paper stock-out is the situation); the inputs stay in the markup for the code and the headless runner, which is how test case 3 (paper at all hours, A against B) still runs.
- **The DAY panel (2026-11-12, owner's notes):** seven suggested test cases sit above the calendar, each a button with its date and a line (NORMAL WEEK Tue 3 Nov, LAST CRIT, MIDTERM EVE, MIDTERM, GOOD TIMES, FINAL EVE, FINAL), and those days are outlined on the calendar; the calendar itself has three tones only, weekday, weekend and outside the term, with a legend under it; the day's text line is gone; ON THIS DAY names the next review and the days to it with the stress it brings in the engine's own calibration (about one in five over the high line in a normal week, two in five the week before a review, one in three in the review week), then whether it is a studio day, a weekend or closed, then the calendar's events.
- **OTHER without a key, and the test seed (2026-11-12):** the tool ships no key and never bills the owner: a key is whatever the person at the browser saves, kept in that browser only. Without one, OTHER still works on the one saved example in `program/other-example.json` (a description and its reading, written by hand to the interpreter's schema and labelled as such in the interface); with a key any description is read live. The seed defaults to 2026, the seed every dated test result uses, so a run from GitHub with the defaults reproduces them.
- **The lift (2026-11-12, walkthrough stop 8):** one floor is the stairs unless the agent carries something, is tired or has a mobility need (`parameters.walking`, a placeholder share in `population.mobility_need_share`); the run keeps the choices by reason in `stats.liftChoice`.
- **Events and Fridays (2026-11-12, walkthrough stop 5):** the Good Times and Waffle situations add nothing on a day that already has the event and use the plan's own rule elsewhere; a share of attenders grab and go (`social.events.*.grab_share`); on a Friday a share of students leave soon after their desk crit and skip the evening (`effort.friday`). `test/_event.mjs` prints who is at an event by the hour.
- **F8 carries the abandoned jobs (2026-11-12, walkthrough stop 4):** the mean wait at the plotters hid the paper policy's effect, because in the run without it the 42 people who gave up stopped waiting; F8 now also reports the jobs abandoned for paper (`stats.abandoned`, on the card's unit line) and the A vs B line compares the two counts.
- **The moves as suggestions (2026-11-12, item 27):** every kind of move that stood at the end of the day is a suggestion of its own in ANALYSE (tag MOVES): what the agents did, its measured effect, and the permanent version of it (a partition, a counter by the kitchen, a layout table at the plotters, a shared wall between the years), traced to the move and the movers' remarks.
- **Move caps and reach (2026-11-12, item 27):** screens are capped at two a day (`layout.manager.per_trigger_cap`), the kitchen overflow table reaches 30 tiles, the plotter table fires at a queue of 3, and a spot is tried for connectivity before it is chosen; `test/_layout.mjs` shows why each table move does or does not fire on a date.
- **Late nights (2026-11-12, item 28):** a late worker stays past 22:30 every night only within a week of a review, otherwise one night in four; everyone else leaves by 19:00 to 20:30 on an ordinary day and works the rest at home (`parameters.effort.late_nights`). The default day 2026-10-13 is three days before the midterm; 2026-11-03 is a plain Tuesday.
- **Stress and the weekend before a review (2026-11-11, items 32 and 33):** stress relaxes toward a personality baseline and rises with the days to the year's next review (`parameters.wellbeing.stress`), calibrated to about 20% high in a normal week and 40% before a review; within a week of a review a weekend is a working day and the organised print early (`effort.weekend`, `resources.plotters.print_early_days_per_C`). The term layer plans the picked day but no longer advances it, so a day run starts from that morning's state.
- **Test cases and results:** `program/TEST-CASES.md` (twelve runs), `program/TEST-RESULTS-2026-11-11.md` (observed values, verdicts, screenshots in `program/test-results/`), and `viewer/test/run-cases.mjs` to rerun cases 1 to 10 headless and deterministically; `viewer/test/run-sweep.mjs` (rerun 2026-11-12 after the walkthrough: 39 runs, 0 failures) runs the broader sweep (three seeds on six days under every movement level, every situation, the policies, a determinism check, the term for five seeds, each run against the engine invariants) into `program/TEST-SWEEP-<date>.md`; `program/TEST-WALKTHROUGH.md` is the plan for going through the important cases with the owner.
- **Rooms to confirm:** `program/ROOMS-TO-CONFIRM.md` lists every room the tool uses on an inference, with what to check and the source; rows move to its "Confirmed" table as the owner answers (kept since 2026-11-11).
- **Rooms against the APR (2026-11-11, item 26):** room 22 is the APR's 202 (capacity 60; 64 chairs); the APR's other Lasserre rooms are cross-referenced in `rooms.json` as `apr_room` (inferred, never in a name): 301 / 309 (crit rooms 4 / 1), 303A (photo room 5), 102–105 (the Level 1 classrooms), Room 2 (workshop 74), Room 5 (model assembly 75); Room 9 and the main office 402 are open. Chairs in class and crit rooms are seat tiles, so every chair counts.
- **Desk exposure (F4)** counts one per walker per pass within two tiles of the desk (near ring 1, next ring 0.5, half again through a board, table or wall; `parameters.metrics.exposure_count`), so a screen the agents roll in reads as a reduction, not zero (open item 25, resolved).


