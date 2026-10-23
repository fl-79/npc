# Build log: studio day

What was asked, what came back, what was kept, changed or rejected, and why.

## 2026-10-19 to 2026-10-20: concept pivot and the plan

**Asked.** The tool is no longer "moments in a building's life" with scenario comparison. It is
the experience of a space by agents under a use, design goals and occupant types; then refined to
subjective, varied feedback with personality parameters, game-like pacing, the plan as the
stage, play/pause/stop/loop, one simulation at a time.

**Input.** A 2D plan DXF of Lasserre Level 3 exported from the user's Revit file (millimetres,
AIA layers, no room polylines because Rooms are not placed in Revit).

**What came back from the plan check.** Walls are double lines with cavities; the facade
pilasters are drawn only by the floor edge; the curtain wall has louver blocks in its gaps; door
blocks close their openings; one partition (south office to southeast classroom) is missing.
Rooms could not be polygonised from wall lines directly. Kept: close everything into solids by
buffering 22 cm and shrinking 12 cm, then take enclosed free-space regions as rooms. Rejected:
re-exporting with room polylines before building (the user wanted to proceed and correct the
plan as we go). The user confirmed ten numbered spots (offices, stair doors, service chase,
desks, glazing, kitchen partition, computer stations, classroom, 3D printers, photography) and
the Good Times bar; these are in `inputs/level3-plan-config.json`.

## 2026-10-20: first build

**Asked.** Build the tool on this plan: three years, four sections per year, 12 to 15 students
each (count the desks), one prof per section circulating for desk crits, 13:30 to 18:00 with a
slow trickle out, Friday with a share at Good Times from 18:30, varied characters with working
styles and breaks, an interface that stays friendly with that many people, remarks that stay
easy to read, minimal style first.

**Built.** `tool/`: Vite app, canvas stage, no framework.
- `scripts/dxf_to_plan.py` turns the DXF into `public/plan/level3.json`: 17 rooms, 11 doors,
  499 furniture pieces, 175 desks with seats from the nearest chair, 12 sections by balanced
  k-means on desk positions, five interior columns.
- `nav.js`: 25 cm grid, walkable inside rooms minus furniture, door openings carved across the
  wall rim, A* with string pulling. All 175 seats, the kitchen, the printer room and both stair
  doors are mutually reachable (checked in the browser).
- `cast.js`: 175 students and 12 profs with six traits, a style, arrival, leaving time, Good
  Times yes/no, break rhythm. Seeded.
- `sim.js`: state machines for students (desk, break kinds by style, out and back, leave,
  bar) and profs (nearest-first round, wait and skip, kitchen, second round, leave); mood from
  weighted events; crowding by neighbour count while walking; noise as distance to the bar
  after 18:30; snapshots every two simulated minutes so scrub, stop and loop replay exactly.
- `remarks.js`: template remarks per event and personality, each with a "because" fact; reviews
  with a computed rating.
- `stage.js`, `ui.js`: plan, discs by year, mood as fill, spotlight with trail and path, cast
  filters, feed filters, measures in the top bar, transport bar with speed and scrubber, Good
  Times share and seed, run download.

**What it showed on seed 11, 35% Good Times.** 13:53: 151 on the floor, profs starting their
rounds. 15:07: 166 on the floor, 130 at desks, 11 in crit, 13 on break. 19:30: 65 at Good
Times, 121 gone home. Profs skip desks that are empty during a kitchen or pin-up break, and the
students remark on the missed crit when they return.

**Bugs found in the browser and fixed.** The remark generator received the clock instead of
the random generator (argument order). Door openings were isolated by the buffered rim of
their own bounding box; fixed by carving the opening across the wall. Returning people were
labelled "off the floor" at the stair door; now named by the nearest door.

**Rejected for now.** Agent-to-agent avoidance (crowding is measured instead); reading the DXF
in the browser (a Python step is simpler and runs once); the Claude API for remarks in this
build (no key on the machine yet; templates make the pipeline testable without cost).

**Still unknown.** Whether 35% is the right Good Times share; the mood weights; whether profs
really do two rounds; whether the bar area east of the counter is where people actually stand.
Three spots on the plan remain unconfirmed (see the config).

**Next.** Claude API step for remarks and reviews (one call per event batch, logged with model
and prompt version), then the interface style pass.

## 2026-10-20, later: remarks about the space, needs, the food line, follow mode, learning

**Asked (user session 2, Felicia).** Comments should be about the design of the space, not the
activity. Isolate and follow one person to avoid information overload, or group people by
preference. A line for food should form before Good Times opens; think of the obstacles and
lingering each activity needs. Each agent acts independently on its own needs. Lunch traffic
should produce its own comments. Running again should differ because agents act slightly
differently and learn the space.

**Built.**
- Needs model (`sim.js`): coffee, hunger, movement, company, print, filling at trait- and
  style-dependent rates; the fullest need over its threshold decides the next break. Most
  people arrive hungry, so the kitchen is busy for the first hour.
- Capacity and lingering: kitchen crowded above seven; printer room holds two, others wait in
  the hall; a pin-up board needs a free metre in front; door traffic counted per five minutes.
- Food line from 18:10 along slots from the bar counter down the central aisle; opens 18:30;
  one served every 18 to 32 s; people whose desks the line passes get a remark.
- Remarks rewritten about the space with the measured fact embedded (distance to the kitchen,
  people per m2, aisle clearance, line length and wait, people through a door); each remark
  has a topic; most activity remarks were cut or made rare.
- Interface: "follow someone" (dim others, feed to that person, day so far), cast groups
  (focused, social, restless, noise- and crowd-sensitive, Good Times), feed by topic with
  counts and sample lines, topic click shows where remarks were made on the plan, run counter,
  "run again".
- Learning (`learn()` in `sim.js`): familiarity, visited places, lunch shift after a crowded
  kitchen, earlier line join after a long wait, a congestion cost map for crowd-sensitive
  people. "Run again" applies it; "loop" and "stop" replay exactly.

**What it showed.** Seed 11, 35% Good Times, three runs: lost on the way 9, 0, 0; kitchen
crowded remarks 83, 65, 67; printer full 24, 21, 17; the line starts 18:10, 17:59, 17:55 and
the mean wait rises 21, 30, 31 min because people learned to come earlier. 42 in the line at
its longest (the slot cap), 51 served by 19:30, 59 at the bar at close.

**Bugs found and fixed.** Fractional step sizes left the clock off the 2 s grid so minute ticks
fired sporadically; now whole steps only. The browser pane throttles animation frames when
hidden; a frame may now advance up to one real second so playback keeps its speed. Kitchen
remarks spammed (294 in one run) because that event bypassed the cooldown; now once per person
with a higher threshold and fewer coffee trips. Aisle crowding never fired; threshold lowered
and anyone lingering in the aisle counts. Bar remarks were suppressed by the cooldown right
after being served.

**Rejected.** Agent-to-agent avoidance (still measured, not resolved). Reading the facade
orientation from Revit for the glazing remarks; assumed east-west and flagged in the because
line until confirmed.

**Still unknown.** Whether 42 slots and 25 s per serving match Good Times; whether seven is the
right kitchen crowd threshold; whether the second prof round happens in practice.

**Next.** Claude API for remarks and reviews against the same events and facts; then the style
pass.

## 2026-10-20, later still: one colour for students, and a summary with next steps

**Asked.** Students need not be distinguished by year. Add a panel summarising the comments and
next steps for improving the design and layout; with each run the comments may get more
specific.

**Built.** Students are one colour (profs black); year groups dropped from the cast filters,
sections kept. `summary.js` turns a run into headline numbers, topics (people, remarks, where),
and up to six next steps, each from a rule on computed facts: kitchen peak and far sections,
printer waits, bunch-up places by nearest section and the narrowest clearance, missed crits,
food line length, wait, start time and whether it passes working desks, bar peak and density,
wrong-end trips, desks along the glazing, door peaks. The step text grows with the run number:
problem and place (run 1), trend across runs from the cast's history (run 2), sizing of the
change (run 3, with walking distances to a proposed point computed on the plan). From run two,
people who learned something say so ("Joined the line 10 minutes earlier and still waited 33").

**What it showed (seed 11, 35%).** Runs 1 to 3: kitchen peak 34, 30, 24; line start 18:10,
17:58, 17:55; mean wait 21, 29, 33 min; wrong-end trips 9, 0, 1; bunch-ups 41, 62, 79.

**Still unknown.** Bunch-ups rise across runs: the learned congestion map reroutes
crowd-sensitive people and the shorter string-pulling on those routes makes them linger near
desks. Either the map should decay or the detours should be smoothed; to decide after watching
a run. The step texts are still templates; the Claude API step should write them from the same
facts.

## 2026-10-20, evening: the drawing

**Asked.** Doors looked inaccessible (a black box with a red line). Show windows and doors
properly and make the furniture more defined. Install the "hairline" skill from GitHub to help
with the linework.

**Checked first.** Hairline (github.com/lucasmarkes/hairline, MIT) is a library of isometric,
pointer-reactive line figures for web pages plus a skill that draws new figures in that style.
It has no guidance on architectural drawing, so it was not installed; the user can add it with
`npx skills add lucasmarkes/hairline` if wanted for something else. Its one transferable idea,
stroke widths fixed in screen pixels at any zoom, was already the case here.

**Why the doors looked wrong.** To derive rooms, each door's bounding box had been added to the
wall network before thickening, which left a thin solid frame around every opening; the stage
painted that frame like a wall and drew an orange centre line across it. Routing was never
affected (openings are carved in the grid); only the picture said the door was shut.

**Built.** The converter now exports the DXF's actual linework, simplified: wall lines, floor
edge, curtain wall panels, mullions and louvers, stair treads and handrails, each door block's
frame, leaf and swing arc, and each furniture piece's outline with a vertex budget per kind
(chairs 70, desks 60, counters 120). Arcs and splines are flattened at 4 mm so the file stays at
750 KB. A separate poché is built from walls and floor edge only, with the door openings
subtracted. The stage draws in plan hierarchy with fixed screen-pixel weights: room tone,
furniture fill then furniture lines (0.6 px, chairs 0.5 px), stairs, glazing (0.75 px), floor
edge, poché, columns, door leaves and swings (0.7 px), then room names at a point inside the
room. Static layers are cached in an offscreen canvas per view and redrawn only on pan or zoom;
people, the food line and topic markers draw on top each frame. Chairs collapse to a circle
below a zoom threshold so the overview stays clean. A stacked layout now applies below 1000 px.

**Rejected.** Drawing the thickened network as walls (too heavy, and it hid the openings).
Drawing furniture as boxes (the question was exactly that they were undefined).

## 2026-10-20, night: run-first flow, brief to spec, goals, jump links, seeds

**Asked.** Run the simulation once with a Claude-specified distribution of people and
personalities, get the list of design recommendations, then play back or run a new one.
Represent the group so it stays editable while individuals stay editable too, with a text
prompt for the design goals and the group to test.

**Built.**
- `spec.js`: the group spec (use, goals with metrics, occupant types with counts, patterns,
  shares and trait ranges, pinned individuals). `makeCastFromSpec` deals desks by seed and
  draws traits within each type's ranges; pinned overrides survive regeneration. A local parse
  turns a brief into a spec without the API (numbers, shares, goal sentences by keyword).
- Brief to spec via the Claude API: a Vite dev-server middleware (`/api/spec`) reads the key
  from `.env`, calls `claude-opus-5-5` with a JSON schema output format and the server-side
  fallback default, and returns the spec plus model, prompt version, usage and request id for
  the manifest. The browser never holds the key. `/api/status` tells the UI whether a key exists.
- `runner.js`: computes a whole afternoon in 20-minute chunks so the page stays responsive,
  for one to five seeds; the first seed is the playable run; stability counts how often each
  step title and each goal verdict appears across seeds.
- `summary.js`: goals from the spec answered with measured facts and verdict thresholds; every
  step and goal carries a jump (time, place, person) into the recording.
- Interface: left panel tabs Setup (brief, spec table, goals, distribution, individuals) and
  Cast; a Run button with a seed count and progress; the Summary opens after a run with goals,
  stability and jump links; editing and pinning on the person card; the feed shows remarks up
  to the playback clock so playback reads as live.

**Checked in the browser.** Two seeds (11 and 112) computed; all six steps held in 2 of 2;
goal verdicts aggregated. A jump moved the playback to 18:53 at the bar. Playback after a run
starts from 13:30 and the feed fills with the clock. The local parse of a brief with "about
150 students" and "a third stay for Good Times" produced 60/51/39 students and a 33% share.
No key on the machine, so the Claude path is written against the documented request shape but
not yet exercised.

**Rejected.** Running the API per remark (one spec call per cast is where the model adds
something templates cannot; the facts and ranking stay computed). Storing the key in the
browser.

**Still unknown.** The verdict thresholds in `evaluateGoals` are first guesses. A hidden
browser pane throttles the chunked computation to about one chunk per second; in a visible tab
a seed takes about 15 s.

## 2026-10-21: Good Times as social behaviour, annotations, archetype cards, thoughts box

**Asked (user session 3, Felicia).** During Good Times people should split off to sit, trickle
out, and some should set up. The brief should be the use, short; design goals second; the group
as preset archetypes with an assumed distribution, an edit button, new archetypes and a focus,
not exact counts. The summary should be concise, with the areas toggled and the findings as
annotations on the plan with detail in the panel. A small box of incoming thoughts while the
program runs, paced so it is not overstimulating.

**Built.**
- Good Times (`sim.js`): seats from the plan's sofas, benches and classroom chairs plus the
  desks of people who left; a setup crew of three from 17:45 with the clearance at the counter
  measured; after 6 to 16 minutes at the bar people sit if a seat is free within 15 m (friends
  follow to the same cluster), go back to a desk for a print, or from 19:00 leave in a rising
  wave; seats are freed when people move on. New remark kinds: setup, no seat, sat down,
  splinter, late desk, leaving the party; new topic and goal metric "seating"; a "Seats within
  reach of the bar" step. The bar enclosure has no door in the export, so the crew works beside
  the counter when it cannot be reached; unreachable seats are remembered and skipped.
- Annotations (`stage.js`, `ui.js`): each next step is drawn as a numbered amber disc at the
  place its jump points to, with a short label at closer zoom; area chips in the summary show or
  hide topics; clicking a disc or a step line expands it. The summary itself is now one line per
  goal and per step, with evidence, jump and two quotes on expand, topic counts in one line, and
  the runs table folded.
- Archetype cards (`ui.js`): share bars with rebalancing, counts in small type, edit panel,
  focus (dims others on the plan, filters feed and thoughts), remove, and "add" from a sentence
  with pattern, mobility and trait hints parsed locally. The use and the goals are separate
  fields; "propose the group" sends both to the brief-to-spec step.
- Thoughts box: during compute one sampled remark every three seconds with the running count;
  during playback at most one every three seconds at the clock's pace, preferring the followed
  person or the focused group.

**What it showed (seed 11, local-parse spec of 150 students).** 40 seats near the bar (21
within 15 m); 55 people sat during the evening, none failed to find a seat because the empty
desks became the lounge; groups ended in the northeast classroom (15), the east desk rows (15)
and on the sofas in the open floor (21); 37 left Good Times before 19:30; the crew had 0.5 m
clear at the counter and 2.6 m2 behind it; the bar peak fell from about 60 standing to 22.

**Bug found and fixed.** The crew's route into the closed bar enclosure failed and was retried
every step, which stalled a run; routes are now checked first and fall back.

**Rejected.** Exact counts as the main control (kept visible and editable, but the share bar is
the interface). Making the API write remarks (still one call per group spec).

**Still unknown.** Whether the empty desks should count as seats for the goal; whether 15 m is
the right reach; mobility has no routing effect yet.

## 2026-10-21, later: the feed, the gap before Good Times, qualities, profs

**Asked (user session 4, Felicia).** Nothing shows in the feed. People jump from finishing
class to Good Times; those staying for the evening would stay in the space. The time of day
should be near the play button; the where-people-are counts matter less. Focused is not
exclusive of noise-sensitive: qualities should overlap and combine, and some could be
studio-wide, such as a deadline for a section. Profs circulate for desk crits in a changing
order and do not spend much time in the kitchen or at Good Times; the offices at either end
hold profs with an office routine.

**Why the feed was empty.** Playback restarts the recording from 13:30 and regenerates the
remarks live, so the stream only filled as the clock advanced, and the first remarks are the
quiet kind. Fixed: the run keeps its full recording and the feed, the thoughts box and the
summary read from it up to the playback clock.

**Built.**
- Good Times goers no longer leave and reappear: at their finishing time they wind down on the
  floor (visits, kitchen and pin-up more often) until the line forms; a quiet remark says so.
- Studio qualities in the spec (`studio`): deadline pressure 0 to 1 and sections under a
  deadline (fewer breaks, later leaving, more print jobs, fewer at Good Times, slower needs);
  shares who are noise-sensitive, crowd-sensitive and new to the building, drawn per person
  independently of the pattern. Sliders and section chips in Setup; the brief-to-spec schema
  and prompt carry them; the local parse reads "deadline" and "sections C, D".
- Profs: pick among the three nearest unvisited desks (order varies by run), alternate the
  entry stair by run, no kitchen round, never at the bar. Two office profs (role `office`) sit
  in the north and south offices with an office routine: coffee, a walk past the pin-ups, a
  meeting out, leave by 17:45. Drawn as squares like the profs.
- Clock moved beside the play button; the top bar keeps only people on the floor, at Good
  Times and gone home.

**Bugs found and fixed.** The office profs drew names from the same twelve surnames the profs
had used, so the unique-name loop never ended and the page hung. The printer-room wait
teleported people to a spot that could land in the photography room, from which no route
exists; every later search failed and a run took 40 s. Now the wait is a routed walk to a
spot outside the door, and a full afternoon computes in about 2.5 s.

**What it showed (seed 11, 150 students).** 47 winding down at 18:00 and no Good Times goer off
the floor; all twelve profs home by 18:00 with 7 to 13 crits each; 53 sat during the evening;
32 left the party before close; bar peak 28.

**Still unknown.** Whether the wind-down should also mean "hanging around" at the sofas before
the line; what the office profs should say about the offices (no office-specific remarks yet).

## 2026-10-21, evening: pixel-art view

**Asked.** A 2D game look like the noodle shop and bakery references: plan view with the
oblique that shows elevations head-on; the interface in the same style; conventions from
Pokemon, Zelda and Stardew Valley for desks, chairs, bars, model clutter and pin-up boards.
Evaluated first: pixel art judged the most feasible (the plan is already a grid, sprites are
small and procedural, people are cheap), isometric possible later, the painterly reference
kept for the chrome rather than the world.

**Built (`pixel.js`, a second mode of the stage).** A 16 px tile is half a metre. Tiles are
classified from the plan (void, floor by room style, wall, glass, door); walls get a dark cap
in plan and a three-tile south face with a baseboard, glazing a tall pale face with mullions,
the kitchen a checker floor, the offices wood, the halls grey, with stair treads from the
linework. Furniture sprites are procedural per kind with a top and a front face: desks with
sheets, a laptop or a model and a mug, chairs with a back, pin-up boards as tall faces with
pinned sheets, counters with bottles, sofas, printers, shelves. People are 16 by 24 sprites
with four facings, a two-frame walk and a seated pose, colours per archetype and profs in a
jacket; mood fades the sprite. Drawing is depth-sorted by tile row (walls and furniture are
pre-rendered into one strip per row) so a person below a wall is in front of it and one above
is hidden. Everything is drawn at native size and scaled by whole numbers; the wheel steps the
zoom. The panels switch to an RPG box style (thick borders, cream fill, monospace, chunky
buttons) with the view. The plan drawing stays as the other mode, since tile snapping moves
walls by up to a quarter metre.

**Still to come.** Sprites drawn from photos of the actual studio (desks, pin-up boards, the
bar and keg, the kitchen, sofas) replacing the procedural set through a sprite sheet; a pixel
font bundled locally; the thoughts box as a speech bubble in the world; door faces on
horizontal walls.

## 2026-10-21, night: doors, windows, offices, bubbles, cards, layout

**Asked (user session 5, Felicia).** Offices, doors and windows had been lost in the pixel view
and the outside elevation looked off; infer a typical office layout; show doors opening and
closing at access points; remarks as game-like speech bubbles in a different colour; drop
"sections under a deadline"; office profs adjustable like the other archetypes with the same
card components, with warnings when a mix makes no sense; the archetype name box obstructed the
name; describe types in a sentence and a short list of qualities (access, sociability) rather
than percentages; goals are access to amenities and comfortable working and collaboration
space; what is tested is a typical Friday with a total number of people; the Feed collapsible
rather than a tab so it visibly feeds the suggestions; more behaviour detail in the help; keep
the pixel view with the plan view kept as a backup; make Cast and "follow someone" clearer and
less entangled with Setup.

**Built.**
- Doors (`pixel.js`): every door knows its wall row; in horizontal walls it is a face with a
  frame, a leaf capped at a metre and any extra width drawn as a glazed sidelite; the leaf
  slides open when anyone is within a metre and closes after. In vertical walls the leaf is seen
  in plan, closed across the opening and swung into the room when open, between two frame posts.
- Windows: glass tiles on side walls draw as a pale window band in the cap, so the long facades
  read as glazing; south-facing glass keeps the tall face. The end walls seen from outside are
  concrete with a pilaster every three metres and a plinth. A true elevation would need a
  straight-on photo or an elevation DXF; asked for either.
- Offices: `officeLayout` in `plan.js` infers a desk against the wall away from the door, the
  chair facing it, a shelf, a visitor chair, a cabinet and a plant, flagged inferred; the pixel
  view draws them and the office profs sit on the inferred chair.
- Speech bubbles (`stage.js`): remarks from the last two simulated minutes appear over the
  speaker as pale-yellow boxes with a tail, in both views.
- Cards: the same layout for every archetype (name, count with a slider, a sentence, a
  qualities list, edit, focus, remove); warnings when one type is over 60 % of the studio, when
  office profs outnumber offices, when profs do not match the twelve sections, or when there are
  more students than desks. "Sections under a deadline" removed from the panel.
- Layout: Setup alone on the left; People is a button in the top bar that opens a drawer over
  the stage with the list, spotlight, follow, edit and pin; the Summary fills the right panel
  with "follow someone" in its head and a "follow <name>" button on each expanded step; the Feed
  is a drawer under the Summary, collapsed to the latest six remarks and opened to the stream
  with the because-lines. Help rewritten with the behaviours and activities.
- Goals: new metrics `access` (mean walk from a desk to the kitchen and the printers, desks
  over 35 m from one of them) and `comfort` (tight desks, bunch-ups, people within earshot of
  the bar); the defaults are now those two goals and a one-line use.

**Checked in the browser.** No errors; offices furnished with the prof at the desk; windows on
the facades; door with sidelite at the vestibule; feed drawer opens to 80 remarks; the first
card reads as a sentence with a qualities list.

**Still to come.** Real sprites from photos; an elevation for the end walls; mobility effects
in routing; office-specific remarks.

## 2026-10-22: walls first, legible palette, drawn glazing, plotters

**Asked (user session 6, Felicia).** Walls should take precedence; many were disconnected
(offices, kitchen, bar, service chase, stair cores, printer and photography rooms). Desks must
not cover columns or walls. The wall colour was too close to the floor; the real floor is dark
exposed concrete, and at this stage colour should serve legibility, not realism. Glazing
looked like glass blocks and should be the pixel version of the plan drawing, glass and
mullions. The plotters and printers by the north desks are what everyone uses, which matters
programmatically.

**Built.**
- Tiles: a tile is wall if any of nine sample points falls in the wall solids (the centre test
  let thin walls fall through the half-metre grid); wall tiles went from 244 to 499 and every
  room reads closed. Furniture sprites are clipped against a wall mask (caps and faces) when
  the strips are built, so nothing covers a wall or a column. Wall bodies are outlined only on
  their outer edges.
- Palette: dark exposed-concrete floor with faint joints, cream wall caps with a dark outline,
  tan faces with a dark baseboard, mid-grey halls, darker kitchen checker, wood offices, a
  near-black void outside. People and furniture keep their colours and now sit on a dark ground.
- Glazing: facade glass tiles are no longer blocks; the plan's own glazing linework (panels,
  mullions, louvers) is drawn on the floor layer as an ink frame with a glass-blue line, so the
  long facades read as the drawing did. South-facing glass runs (the vestibule doors) keep a
  tall face.
- Plotters: `plan.plotters` are the printer-kind pieces outside the printer room (two plotters
  and the big printer at the north end of the spine). Seventy percent of print trips go to a
  plotter, with a wait and a remark when someone is already at it; the rest go to the 3D printer
  room. The printers step in the summary names both.

**Checked.** No errors; the north core, offices, kitchen and bar enclosure read as closed
rooms; the plotters draw beside the vestibule wall; speech bubbles show over the kitchen crowd.

## 2026-10-22, later: doors in their walls, lintels, glass doors, map export

**Asked (user session 7, Felicia).** The south facade window had gone; a stray outline at the
office doors; the facade glazing not attached to the columns; the printer and photography
room doors still wrong; headers wanted over doors; desks apparently in front of the printer
room door; the service chase not enclosed; kitchen doorways too narrow and without headers;
the classroom by the kitchen unreadable at its access; the end office missing a header and its
window; and whether obstacles need an outline or the cut line was the confusion.

**Found by exporting the whole pixel map as a PNG** (new dev endpoint, outputs/pixel-debug).
The stray lines were door-frame bars drawn a metre above the wall. Door tiles were never
marked, because the opening is free space inside a room, so doors had no header and the wall
read as broken. The chase corner fell between sample points on a 10 cm wall. The south "window"
is a glazed curtain-wall door that only drew during playback. The pieces by the printer room
door are the recycling bins and waste containers from the plan, not desks.

**Built.** Wall sampling at 25 points per tile. Each door now finds the wall line it sits in
(the bbox edge with wall tiles beyond its ends) and opens only that line; horizontal-wall doors
keep the wall cap and the top of the face as a header, vertical-wall doors get a thin lintel at
cap height; glazed doors draw as glass in a frame, the rest as wood with any extra frame width
as a sidelite. Door-frame bars removed. Wall height reduced to two tiles so small rooms are not
swallowed by faces. Glass faces drawn wherever the south side is open, outside included. The
glazing linework is drawn at cap height so it meets the column caps, with a faint footprint
on the floor. The export draws doors closed so the map can be checked without a run.

**On outlines.** The cream cap is the cut line; with the dark floor it reads, and walls are
outlined only on their outer edges. The confusion was the shifted cap plus missing headers,
not the absence of outlines.

**Still open.** Non-door openings narrower than a tile (the kitchen's 0.8 m gap) snap to one
tile; a real elevation for the end walls; sprites from photos.

## 2026-10-21: one-tile walls, headers that join, no holes, fonts

**Asked (user session 8, Felicia).** Door headers were not connected to their walls; black voids in
places; a chair under a column; the stair inner core overinflated; the stairwell glazing connected
to nothing; a grey box under the exterior glazing; a pixel font for headings and a readable,
game-like face for everything else instead of Courier New.

**Found.** The headers broke because a door opened one row of a two-row-thick wall and the cap
outline treated the door tile as "not wall". The black boxes were the cap row above a glass face
(glass had no cap) and a few pockets of void the room polygons missed. Furniture was clipped by a
global wall mask even when it stood south of the column, so the column showed through it. Thin walls
took two tiles because any sample hit marked a tile. A north-south glass run drew a full face block
at its ends.

**Built (`pixel.js`, `stage.js`, `style.css`, `public/fonts/`).**
- Walls: a tile is wall when the solids cover at least 40 % of it, or when it carries more wall than
  each of its four neighbours (ties go west and north). Thin walls, the stair cores and columns are
  one tile; thick walls stay thick. Wall tiles fell from 499 to 359.
- Doors: the rows (or columns) of a door box where the wall continues past both ends are the wall's
  thickness; the leaf hangs in the southernmost row, the rows behind it stay solid, and cap outlines
  treat headers and lintels as wall, so a wall and its door read as one piece. The door is drawn at
  its real width inside the tile opening; the rest is jamb, or glass for a door with a sidelite;
  double doors have two leaves. Doors in north-south walls are a slot in the wall top with the leaf
  seen in plan, since the floor along such a wall lies under the lifted cap.
- Glass: a run's direction and the line's position in each tile are kept. East-west runs show a
  face, reaching the top of the neighbouring caps where the outside is behind them. North-south runs
  are seen edge on: a thin post at each end from the cap line to the floor, and a mullion or
  pilaster at the end of a run is a post under its cap, not a box. Glass lines crossing floor at a
  room edge count too, so the stair-hall glass walls have their posts.
- Voids: pockets of void shut inside the building become floor and take the room of a neighbour.
- Furniture: only a wall or column standing inside a piece's footprint is cut out of it; a piece
  south of a wall is drawn later and stands in front, so a chair beside a column is whole.
- Fonts: Silkscreen (pixel) for headings, the clock, tabs and buttons; Nunito (rounded, readable) for
  everything people read, including speech bubbles. Both are SIL Open Font License files served from
  `public/fonts/` (latin subsets from Google Fonts), so nothing is fetched at run time.

**Checked.** Full-size map crops in `outputs/pixel-debug/` (full4, cA2 to cK): headers continuous
over the stair, office, classroom and service-chase doors; no black pockets; the north office glass
meets the cap tops; stair cores one tile; posts at the ends of the facade and stair-hall glass;
desks and chairs whole beside columns; the lobby doors show as slots with leaf and sidelite.

**Known limit.** In this oblique a person passing through a north-south door is hidden by the
lintel for a tile or two; the four such doors are the lobby doors and the glass curtain-wall doors.

## 2026-10-21, later: walls from centrelines, hosted doors, columns back, lunch styles, conditions note, speech boxes

**Asked (user session 9, Felicia).** The markups were not being understood: walls must join at
corners with no missing corners, shafts are rectangles of consistent thickness, doors are hosted by a
wall and never float, glazing is hosted and attached, the exterior columns between the glazing had
been removed and must come back, furniture that is wrong or awkwardly placed must be flagged or
resolved rather than ignored. Also: not everyone who eats lunch needs the kitchen; the goals should
speak generally of access to amenities and comfort of working in the layout; the studio qualities
should read as generated from a text note about conditions affecting everyone; the feed and the
thoughts box should look like an RPG speech box; the cut of the walls brighter.

**Rejected (own earlier approach).** Tile voting with sample counts and local maxima. It could not
give consistent thickness or closed corners, and the door-row scoring could not tell the hosting
wall from a wall meeting it at a corner, so doors drifted a row or a column off their wall.

**Built.**
- Walls (`pixel.js build`): the wall solids are rasterised at 10 cm, thinned to one-pixel
  centrelines (Zhang-Suen), each line end pushed back out to the solid's edge, and a tile is wall
  when a centreline runs through it, when it is solid right through, or when it holds a column.
  Every wall is one tile; corners and T-junctions close because the centrelines meet; the stair
  cores, the service chase and the small rooms are clean rectangles.
- Columns: solid cores at least 0.3 m from every edge and under a metre across are columns, found
  with a distance transform on the same raster; the five interior columns are added from the plan.
  Column tiles are never turned into glass, so the facade pilasters stand between the glazing
  panels again with their caps and faces, and the glass line runs into them.
- Doors: among the tile rows (or columns) a door box covers, the host is the one whose wall or
  glass run continues past both ends of the opening (a wall meeting at a corner scores low). A run
  of glass beyond the ends makes it a glass-hosted door, drawn on the glass line with posts and the
  leaf, no cap block. The four lobby and curtain-wall doors are glass-hosted; the rest sit in walls
  with headers.
- Glazing: end posts only where nothing hosts the end; horizontal faces as before.
- Furniture flags (`tool/scripts/check_furniture.py`): pieces overlapping a wall or column, chairs
  with nothing to sit at, pieces within 0.6 m of a door, pieces outside every room, written to
  `outputs/plan-check/furniture-flags.json` and copied beside the plan as `level3-flags.json`;
  flagged pieces carry a red mark in the pixel view. 33 of 495 pieces are flagged; the ones that
  matter are listed in the reply and below.
- Lunch (`spec.js`, `sim.js`, `remarks.js`): each person has a lunch style: kitchen (3/8), food
  brought back (2/8), out and back later (2/8), packed lunch at the desk (1/8); people who do not
  use the kitchen bring food back instead. Out means 35 to 55 min off the floor; bringing food 12
  to 22 min; at the desk 12 to 20 min seated. Two remark kinds, lunchOut and lunchDesk, with the
  distance as the fact.
- Goals: spec version 2 with the general wording (access to amenities; comfort of working in this
  layout); a saved spec older than version 2 takes the new goals and use.
- Conditions note (section 3): a text note about the day replaces the bare sliders; a keyword pass
  (`parseConditions`) reads deadline, noise, crowding and the share new to the building, and the
  sliders show what was read and can be nudged. The note goes into the brief sent to the API.
- Speech boxes: a 9-slice pixel frame (stepped corners, grey offset shadow) on the thoughts box,
  with a blinking cue, and on each feed remark; the canvas bubbles are white with a black frame and
  shadow to match. Wall caps are now near white.

**Flagged furniture (from the DXF, not changed).** A chair in the doorway of the double door to
the service chase (F648, 19.6, -14.6; no desk near it). A 60x90 table in front of the photography
room door, overlapping the wall (F792, 25.8, -27.1). Two desks within 0.6 m of the double door and
the chase door (F353, F355, F357). Desks and plotters along the west and north walls overlap the
wall band by 0.1 to 0.2 m2 (pushed against pilasters). Kitchen counters 1 to 3 and the cutting
table overlap walls by 0.2 to 0.5 m2 (built-in casework drawn over the wall line). The bar edge and
its pin-up board sit outside every room polygon (on the enclosure line).

**Checked.** Full map and crops in `outputs/pixel-debug/` (full6, qA, qB, qD, pA to pE, raster
views rN, rS, rC); a full run with the lunch styles (59 kitchen, 39 bring, 36 out, 16 desk in the
first cast); the setup shows the conditions note; the feed remarks are speech boxes.

## 2026-10-21, evening: owner's corrections, mullion posts, solid shafts, chat feed, window panels

**Asked (user session 10, Felicia).** Markups: X on things to remove, a check on furniture that is
fine; the opening the DXF shows between the office alcove and the classroom should not exist; the
small exterior columns between the window panes were missing; the closet in the middle of the
floor is rarely used and should not be part of regular activity. Interface: the feed as a chat
room; all panels as vintage computer windows with an emphasised title band, collapsible rather than
closable; the plan bubbles cut sentences, so go back to the corner box as a continuously updated
highlighted comment; the trails had stopped doing anything; old-fashioned check boxes; People as a
collapsed window on the left; zooming out to the whole floor was no longer possible.

**Built.**
- Corrections (`tool/public/plan/level3-edits.json`, applied in `plan.js loadPlan`; the DXF and
  level3.json are untouched): five pieces removed (the table in front of the photography room
  door, a recycling bin by the south core, a desk and its chair south of the middle block, the
  table by the north office door); the two alcove-to-classroom doors removed and the classroom
  walls closed there with added wall rectangles; the two doors into the middle closet removed;
  the two doors into the middle closet kept in the drawing but marked unused, so no one routes
  through them. Each entry carries its reason. The other flagged pieces stay as drawn.
- (Corrected the same evening.) The elevator shafts and the middle closet were briefly drawn as
  solid blocks; the owner said no: they keep their walls and their interior, as the DXF has them.
  Enclosed pockets of void become floor, whatever their size.
- Mullions: the small closed rectangles in the glazing linework (119 of them) are drawn as thin
  posts from the cap line to the floor, so the panes read between small columns; the larger
  pilasters keep their full caps. In the pass before, the DXF's mullion rectangles were only ticks
  on the glass line and the pilaster tiles had been turned into glass; both are restored.
- Feed as a chat (`ui.js`, `style.css`): an avatar square with the initial, the name and time,
  the remark in a speech box, the fact line beneath when the feed is open.
- Window panels: Setup, People, Summary and Feed have a dark title band with three vintage
  buttons; clicking the band collapses the body. People is a collapsed window at the bottom of
  the left column; the top-bar button is gone; jumping to a person opens it.
- The corner box is the running comment: who and where, the remark in full, and a tally of the
  topics so far; a small speech mark on the plan sits over whoever is being quoted. The canvas
  bubbles are gone.
- Trails: everyone's recent path drawn faintly, the followed person's in red; the line breaks
  where a position jumps. Pixel check boxes.
- Zoom: levels 1/4, 1/2, 1, 2, 3, 4; fit picks the largest that shows the whole floor.

**Checked.** Map crops (yA to yD, full7): alcoves closed, shafts and the middle block solid, posts
between the panes; a run of 390 remarks; windows, chat feed and toggles in the browser.

**Open.** The short wall below the north shaft (the stair's side wall) is in the DXF and was
kept; the markup near it may have meant the shaft's south face, which the solid block now removes.

## 2026-10-21, late: south office east wall

**Asked (Felicia).** Remove the desk at the south office's east side and close the opening it stood in.

**Built.** In `level3-edits.json`: desk F830 and the table F795 drawn over it removed; a wall
rectangle (x 19.7 to 20.0, y -34.4 to -32.6) closes the 1.7 m gap in the office's east wall.
The DXF stays as exported; the office is enclosed on all four sides now.

## 2026-10-21, late: the short walls in both stair halls

**Asked (Felicia).** Remove the short wall between the hall wall and the elevator shaft, in both
stairwells.

**Built.** `cut_walls` in `level3-edits.json`: two boxes cut out of the wall solids when the plan
loads (the raster the pixel walls come from, the routing grid, and the plan view all honour them).
South hall: x 20.55 to 21.1, y -24.7 to -23.8. North hall: x 20.55 to 21.1, y 1.6 to 3.2. The DXF
stays as exported.

## 2026-10-21, late: spurs

**Asked (Felicia).** The south stairwell cut left a piece; one-tile nubs on walls, like the one on
the south core's north wall, should not be there in general.

**Built.** After the walls are marked, a one-tile dead end that hangs off a wall at right angles,
with little centreline in it, is dropped; it is a spur the thinning leaves where a line end is
pushed into the next tile, not a wall. A straight wall's last tile keeps, since its neighbour
continues in the same direction. Two tiles went: the remnant of the south stub and the nub on
the core wall. Checked on both cores and the full map.

## 2026-10-21, late: the vestibule windows

**Asked (Felicia).** Resolve the north office window: a stepped notch beside it and posts that
stopped short.

**Built.** A tile with no more than a one-pixel sliver of solid under it is never a wall, which
removes the two-tile spur the thinning left at the T beside the window. The spur rule now drops
any one-tile dead end at right angles to a wall, whatever centreline it carries, which removes
the frame return hanging below the south window. Mullion posts run from the cap line to the
floor line of the pane. Checked on both vestibule windows and the full map. Wall tiles within a metre of a door are left alone by the spur rule, so a short jamb between a door and a corner stays.

## 2026-10-21, late: glazing hosted at the stair halls

**Asked (Felicia).** The stair-hall glazing must be hosted by a wall at both ends; the mullion at
the wall junction and the glass-to-wall joint were loose.

**Built.** A glass run's end joins its host wall: where the wall stands one tile across from the
run's end, the corner tile between them is wall; where the wall stands beside the run's last tile,
that tile becomes the wall's end, so the cap reaches over the line. End posts are drawn only where
nothing hosts the end. Mullion posts are computed after the walls and doors and never stand in a
wall tile. Checked on both stair halls, the east facade and the full map.

## 2026-10-21, late: the classroom doors are back

**Asked (Felicia).** Doors missing at the classrooms.

**Found.** The earlier note about an opening that should not exist was about the gap in the south
office's east wall (closed two passes ago), not the doors with sidelites that lead from the
alcoves by the offices into the two classrooms. Those were real doors and had been removed, with
the classroom walls filled behind them.

**Built.** Both door removals and both wall fills are taken out of `level3-edits.json`; the two
alcove doors are back, hosted in the classrooms' west walls. Door hosting also changed: a framed door takes the wall run past its ends, whatever glass
runs nearby; only a curtain-wall door can be hosted by glass. Before that, the south alcove door
had been placed on the stair hall's glass line. Checked on both classrooms and the full map.

## 2026-10-21, late: doors in north-south walls as openings

**Asked (Felicia).** The classroom door looked as if it went into the wall; at the north one, wall
and door were drawn in the same place; it is one or the other.

**Found.** A door in a north-south wall was drawn as a slot in the wall's cap with the leaf inside
it, so the cap continued over the door. And because caps are lifted two tiles, a door that sits
at an inside corner is drawn where the crossing wall's face hangs, which read as the door going
into that wall. The door box also overlapped the crossing wall's tile by a few centimetres, so
that wall's tile had been opened too.

**Built.** No lintel over such doors: the cap stops at a post on each side and the opening between
shows floor, painted over whatever hangs behind it; the leaf and sidelite span the opening at the
same height. A door's tiles are trimmed where they fall on a crossing wall run. Checked on both
alcove doors. Then, at the owner's word, the floor patch behind the door was dropped: just the posts, the leaf and the sidelite.
Then: such doors are drawn before the strips of their own rows, so the walls around them are painted later and stand in front, as the hierarchy says (walls over doors).
Corrected the same hour: not before everything, at its own depth. The door is painted after the walls north of it and before the strip of its south end, so the southernmost wall covers the sidelite and the leaf shows over the wall behind it.

## 2026-10-21, late: the closet south of the service chase

**Asked (Felicia).** The closet should be enclosed as marked; the desk interfering with it removed.

**Found.** The closet's east and south walls are drawn so thin in the export that the 10 cm raster
kept only a sliver of them, so the tiles were dropped and the closet stood open to the east and
south; its double door floated a row below where the wall should be. A desk and its chair from the
DXF stood inside and in the doorway.

**Built.** In `level3-edits.json`: desk F357 and chair F648 removed; two wall rectangles close
the closet's east and south sides, and the double door now sits in that south wall.

## 2026-10-21, late: two tables by the north stair hall

**Asked (Felicia).** Remove the two desks west of the north stair hall's glass.

**Built.** F579 (SALA_Table_30x60in) and F602 (SALA_Table_24x64in) removed through
`level3-edits.json`.

## 2026-10-21, late: the south office floor

**Asked (Felicia).** A patch of the wrong floor inside the south office, and a post hanging below
its window outside.

**Found.** The studio's polygon and the office's overlap by a few tiles; the studio was tested
first, so those tiles took its dark floor. The post was a mullion of the vestibule's glazing
return, whose tile is no longer glass.

**Built.** Where room polygons overlap, the smallest room wins the tile. Mullion posts are drawn
only in glass tiles.
Second look: the patch was a leftover unnamed region of the converter (Region 14) lying over the office's corner, which the smallest-room rule then preferred; such regions no longer claim tiles. The post was a lone floor tile outside the facade that the office polygon's edge had caught; a floor tile with no floor beside it and void around it is void. Third look: the studio polygon itself dips into the office's corner; studio tiles cut off from the studio's connected floor now take the room around them. Fourth look, the real cause: the studio polygon reaches through the office doorway into the door's swing inside the office, so that strip was studio floor; the cut-off check now runs after the doors are marked, when the doorway no longer joins the strip to the studio, and the strip takes the office. Checked on both offices and the full map.

## 2026-10-21, late: no post where a wall holds a door's end

**Asked (Felicia).** A nub on the north core's north wall at the alcove door: make it one straight line.

**Found.** The door's end post was painted on top of the core wall's cap and stood four pixels proud of it.

**Built.** A door in a north-south wall gets a post only at an end no wall tile already holds. The bump that remained was the cap's missing top outline at the door column: door tiles no longer count as continuing a cap for outlining, so the wall line is straight.

## 2026-10-21, late: desks in front of walls; the north window's hosting

**Asked (Felicia).** Desks along the north wall should stand in front of the wall, and the north
office window should be hosted properly.

**Found.** A desk pushed against a wall overlaps the wall band by a few centimetres, and the wall
was being cut out of the desk as if it stood inside it. At the window, a one-tile return of the
glazing frame counted as a glass run, and the corner rule added a wall tile one row above the end
wall on the window's west side only, so the window looked stepped.

**Built.** A wall or column is cut out of a piece only when its tile centre lies well inside the
piece's footprint (0.2 m in); a desk against a wall is drawn in front of it. A lone glass tile is
not a run and claims no corner tile. Checked on the north end and the office window.

## 2026-10-21, late: topics as feed filters

**Asked (Felicia).** The topic links in the summary should filter the feed instead.

**Built.** The feed opens with a row of chips, "all" and each topic heard so far with its count;
a chip filters the chat to that topic and marks its places on the plan. The summary's "What people
said" row is the same chips: one click opens the feed filtered to that topic, and the active topic
shows highlighted in both places.

## 2026-10-21, late: panel arrows, no view toggle, the title, profs come back, fuller suggestions

**Asked (Felicia).** A clear expand/collapse arrow on the panels; remove the trails / room names /
dim / plan-view toggle bar for now, with a backup that keeps the plan view; the title is "Studio Day
at SALA"; nobody misses a crit just because the prof did not see them; the design suggestions need
more specifics; the panel subtitles were near white on the title bands.

**Built.**
- Backup: `backups/tool-2026-10-21-with-plan-view/` is the tool as it was, without node_modules,
  with the view toggle still in it (see its BACKUP-NOTE.md). The plan drawing itself stays in
  `stage.js` (setMode("plan")); only the toggle and the overlay bar are gone from the interface.
  Trails and room names stay on.
- Panels: one arrow at the right of each title band, down when open and right when collapsed; the
  Feed's arrow moved there too. Subtitles on the bands are ochre (#f3c66b); the top-bar subtitle is
  dark ochre (#854f0b). The brand reads "Studio Day at SALA · Lasserre Level 3 · desks, sections".
- Profs (`sim.js`): a student who is away is not skipped; the prof notes it (profLater, quiet) and
  tries that desk again once the student is back, taking whoever is at their desk first; when
  everyone left is away the prof pauses four minutes and looks again. Only when the prof leaves
  are the unreached students counted, and those still on the floor say the round ran out
  (critTimeout). The old missedCrit and profSkip paths are no longer taken.
- Suggestions (`summary.js`): every step now says what was measured, why it matters and what to
  do, with the numbers from the run, from the first run on (before, the "what to do" came only on
  the third run and some steps were a single sentence). The crit step became "Shorten the prof's
  round", with the round's length in metres and the section size.

## 2026-10-21, late: the second goal, darker titles

**Asked (Felicia).** The second default goal is about a layout that supports collaboration, working
and learning, not just comfort; the panel titles and their arrows should be darker.

**Built.** The goal reads "A layout that works for collaboration, working and learning: room to
move and to stand for a crit, desks where you can hear yourself, and places to work together"
(spec version 3; an older saved spec takes it). The title bands are light like the top bar, with
dark brown titles and arrows and dark ochre subtitles.

## 2026-10-21: a demo video for the slides

**Asked (Felicia).** A short demo video of the proof of concept for a slide, cheaply: inputs,
toggles, the simulation, the design suggestions.

**Built.** `tool/scripts/demo-video.mjs` drives the page with Playwright through the installed
Chrome (playwright-core only, no browser download) and records about a minute: the use, goals and
conditions note typed in, an archetype card opened, the People window, a run, the summary with its
first step opened and its jump into the playback, following one person at 4 min/s with the corner
comment, the feed filtered by a topic, and the evening at the bar. The recording is converted to
H.264 mp4 with the ffmpeg that ships in the imageio-ffmpeg wheel (also lent to Playwright). Output:
`outputs/demo/studio-day-demo.mp4` (1440x900, about 64 s) and the .webm original.

## 2026-10-21: the demo, faster and guided; people more solid

**Asked (Felicia).** Speed the video up; the people in the simulation are too faint; a guide box or
focal point on what is being shown next.

**Built.** People are drawn at 72 to 100 percent opacity by mood (was 45 to 100), and the others
fade only to 55 percent while someone is followed (was 35). The demo script shows a red pixel guide
box with a label that slides to each thing in turn (what is tested, goals, the conditions note and
sliders, an archetype card, People, Run, the summary, a step, the plan, the corner comment, the
feed, the evening); its pauses are shorter and the conversion runs at 1.35x, so the video is about
39 s.

## 2026-10-21: flag marks off

**Asked (Felicia).** Remove the red "!" marks but keep the flags to come back to.

**Built.** The marks are behind `stage.opts.flags`, off by default; the flags file still loads with
the plan and the check script still writes it. Setting the option true (and rebuilding the pixel
strips, or reloading) brings the marks back.

## 2026-10-21: the demo's first second cut

**Asked (Felicia).** The video flashed white with the unstyled page at the start.

**Built.** The recording starts before the page has loaded; the first second is now cut in the
conversion (the command is at the top of `demo-video.mjs`). The mp4 opens on the finished interface.

## 2026-10-23: the front door, a title screen and a tour

**Asked (Felicia).** A landing page like the start of a game: NPC as the name, a subtitle along the
lines of "design simulation test", a blinking start, a pixel person walking or tracing a path, then
how-to instructions that can be skipped or go through everything, as the demo video did.

**Built (`src/intro.js`, styles in `style.css`).**
- Title screen over the app on the first visit (or with `?intro` in the address, or the intro
  button in the top bar): "NPC" in the pixel face with a stacked shadow, "a design simulation
  test", "Studio Day at SALA · Lasserre Level 3", a blinking PRESS START, and a footer line. Behind
  it the floor itself at close range, with one person walking real routes between the stairs, the
  kitchen, a plotter, the bar and a few desks, found with the tool's own path-finder, leaving a
  red trail; the camera follows. Enter, space or a click starts; "skip the intro" and Escape go
  straight to the tool.
- The tour: nine steps on the real interface, each a red guide box with a label on the element
  (what is tested, the goals, the conditions note, the group, People, Run, the summary, the feed,
  the day's controls) and a speech-box caption with Back, Next and Skip; arrow keys work; the
  last step's button reads Start. "Take the tour" in the help panel replays the tour alone.
- Seen once, the intro stays out of the way (localStorage).

## 2026-10-23: title screen wording

**Asked (Felicia).** The subtitle is "An Occupant Simulation Tool", the prompt is "Click anywhere to
start", and the tour's captions should read as prose rather than clipped notes.

**Built.** Both lines changed; the nine captions rewritten as full sentences in one voice.

## 2026-10-23: published

**Pushed** to github.com/fl-79/npc (commit 95c1df5); the Pages site at fl-79.github.io/npc rebuilds on
push. **The claude.ai artifact** ("Studio day") is a separate copy of the built `dist/` folder and does
not follow the push; it was republished by hand as version 3 (`npm run build`, then the page and
its changed assets published to the same artifact URL). Any later change needs both: a push, and a
rebuild and republish of the artifact. The rebuild must use the relative base, `npx vite build
--base=./`, as the Pages workflow does; a plain `npm run build` writes absolute asset paths that the
artifact's page cannot reach, which is what broke version 3 (fixed in version 4).

## 2026-10-23: desks out of the wall

**Asked (Felicia).** The desks along the wall west of the south office were drawn in the wall.

**Found.** A wall tile is half a metre wide, the wall itself a fifth; those desks reach into the
tile by up to 0.3 m, so the wall's cap was painted over their edge.

**Built.** A piece whose edge reaches into a wall's tile by 0.3 m or less is drawn nudged out of
the tile; the plan's positions and seats are untouched. A wall standing well inside a footprint is
still cut out of the piece, as before. That nudge alone
was not enough: those desks reach 0.4 m into the tile because the wall's real line sits at the tile's
far edge. So north-south walls are now drawn at their real line, a cap 10 px wide centred on the
centreline's position inside the tile (corners, junctions, columns and east-west walls keep the full
tile), and furniture is nudged against that line, up to 0.45 m. Checked on the wall by the south
office, the north core and the full map.

## 2026-10-23: the plotters and tables by the north office

**Asked (Felicia).** The same collision on the wall west of the north office: plotters and tables
drawn into the wall.

**Found.** The nudge measured only the narrow caps; rows where that wall meets another keep a full
tile, and the pieces still ran into those.

**Built.** The nudge clears the widest cap over the piece's rows. Checked at both walls. Each piece clears the widest cap along the whole wall run beside it, so a column of desks along one wall stays aligned.

## 2026-10-23: narrow walls, joined and without holes

**Asked (Felicia).** A north-south wall disconnected at its end by the north office, and holes in
the wall at the office window's corners.

**Found.** Two effects of the narrow north-south caps: where a run's centreline shifted by a few
pixels between tiles the cap jogged, and where a narrow cap sat below an east-west wall, that
wall's face was not drawn (a wall tile stood south of it) and the uncovered part of the tile
showed the floor.

**Built.** A contiguous north-south run takes one cap offset, its mean. A wall draws its face when
the tile south of it is a narrow north-south wall; the narrow cap then sits over the middle of that
face. Checked at the office wall's end, the window corners, the north core and the full map.

## 2026-10-23: published again

Pushed as 968d0ea; the artifact republished as version 5 from a relative-base build.

## 2026-10-23: next steps in two groups, with who felt them

**Asked (Felicia).** Group the design suggestions into what the plan alone says and what people
experienced, the latter centred on working time (could students settle and focus?); the bar's
after-hours noise matters less; no archetype focus mode.

**Built (`summary.js`, `ui.js`).**
- Two groups under Next steps: "From how people experienced the day" and "From the plan alone ·
  geometry, before anyone walks it". Numbering runs across both; the plan-alone group holds the
  glazing step and a new "Long walks from the far sections" step (sections over 30 m from the
  kitchen or 35 m from the printer room, by the aisles), each tagged "computed from the plan".
- A new working-time step, "Protect working time at the desks": students who could not settle,
  from desks with three or more neighbours within 1.6 m, bunch-ups in their row while working, and
  no room to stand for a crit; it ranks with the kitchen, printers, aisles and crits steps.
- After-hours steps (food line, bar seats, bar noise, the exit) carry an "after hours" tag and are
  weighted down (0.4 to 0.6) so they sit below the working-day steps.
- Every experience step says who felt it, by archetype: "social students 21 of 60, restless 9 of
  45; focused not at all", from the run's own logs; a step nobody felt says nothing.
After-hours steps always sit below every working-time step, whatever their score. Checked on a run:
working time (desks, kitchen, printers, aisles, crits), then the food line after hours, then the two
plan-alone steps; the first step names focused students 50 of 70, restless 27 of 42, social 28 of 60.

## 2026-10-23: bullets, mandatory crits, the printers, more voices

**Asked (Felicia).** Keep the step details to concise bullet points. Nobody leaves until the prof
has seen them, even if the round runs over: the crit is a required part of the class. Not everyone
uses the plotters or the 3D printers, only under deadline; the letter and tabloid printers at the
north end get heavy traffic no matter what. The feed repeated the same comments for what seemed
the same archetype.

**Built.**
- Steps (`summary.js`, `ui.js`): every step is three or four short points, the last one "Do: ...".
- Crits (`sim.js`): a student does not leave or wind down before their crit, or before their
  prof has gone; after twenty minutes past their own time they say so (waitingCrit). The prof
  leaves at their time only once everyone is seen, otherwise runs over, up to ten minutes before
  the day ends; the leave note says how far over. On the test run 171 of 172 were seen and two
  profs ran over.
- Printers (`plan.js`, `spec.js`, `sim.js`): the plotters (the two Designjets) and the big letter
  printer are separate. Nearly everyone prints letter and tabloid at the big printer, a sheet
  every few hours, under two minutes at the machine, a queue when four are at it (printQueue);
  the plotters are used by 8 percent of people plus deadline pressure (up to 90 percent), the 3D
  printer room by 4 percent plus deadline. The printer step now asks for a second letter printer
  at the south core.
- Remarks (`remarks.js`): more variants for the frequent kinds, including arrive, leave, crits and
  the food line; a voice per archetype for crits, tight desks, the kitchen, the bar noise and
  friend visits (focused, social and restless each say it their way); no two remarks of a kind in
  a row with the same words, and nobody repeats themselves.
- Tuning after the first check (`sim.js`, `remarks.js`): a letter print takes 40 to 90 s and the
  queue remark needs three others at the machine (the first run had 74 printQueue remarks); the
  MORE pool had critStart and critTight twice, so the second entry silently replaced the first and
  the crits had four lines between them; merged. On the check run: 172 of 172 students seen, no
  prof over by more than five minutes, print queue peaks at five, 483 remarks with 7 to 19 distinct
  lines for the frequent kinds (crits, tight desks, the kitchen, the food line).

## 2026-10-23: nuance inside an archetype

The feed still repeated itself: with 170 speakers and five to ten lines per kind, the same line
came up thirteen times in a day (measured: the most repeated line 13 times, 483 remarks).
- `remarks.js`: a second, wider pool (MORE2) for the kinds that come up most, so most have 12 to 20
  lines now; the friend's name reaches the friend-visit lines (`sim.js` keeps `a.friendName`).
- Each person now has a voice of their own on top of the archetype, from their continuous traits
  and a hash of their id (`voiceOf`): the quiet ones (low sociability) keep the first sentence of a
  line and drop the rest; the talkative add a second thought drawn from their own situation
  (TAILS: a deadline, being new to the building, a far kitchen, a window desk at the hour it
  matters, mood, noise or crowd sensitivity, patience, the hour, distance walked, year, section);
  some fall back on a signature phrase (TICS) now and then. Tails are kept off remarks already about
  that topic.
- The last ten lines of each kind, floor-wide, are not reused; nobody repeats themselves; a short
  food-line wait (under 8 min) no longer earns a line from everyone.
- On the check run: 495 remarks, 434 distinct, the most repeated line 6 times (was 13).
