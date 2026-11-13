# V2 handover: start here

For a new Claude Code chat that rebuilds the NPC tool (Studio Day at SALA) as V2, beginning with
the whole Lasserre building read straight from the Revit model through pyRevit. Written
2026-11-03 at the end of the V1 session.

## Read these, in this order

All paths are under
`C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\04 Assignment 2\`.

1. `V1-Test\V2-HANDOVER.md`: this file.
2. `V1-Test\V2-export-brief.md`: what the Revit export must contain, the checks before export,
   the machine's setup, the pyRevit and Revit 2027 gotchas already hit, and the model's status.
3. `V1-Test\V1-graphics-and-plan-geometry.md`: how V1 read the DXF and drew the plan in the
   pixel style, what was rejected and why, and the suggested V2 order (section 7).
4. `V1-Test\2026-10-15-PROJECT-BRIEF.md` and `ARCH540_Assignment2_Brief.pdf`: the course brief
   and the founding principles.
5. For reference only, when a V1 detail is needed: `V1-Test\tool\BUILD-LOG.md` (every decision
   with what was asked, built, rejected), `V1-Test\tool\src\pixel.js` (renderer),
   `V1-Test\tool\src\plan.js` (loading and corrections), `V1-Test\tool\scripts\dxf_to_plan.py`
   (the V1 converter), `V1-Test\tool\public\plan\level3-edits.json` (the owner's corrections,
   each with a reason; most should become unnecessary with real model data, but check each one
   against the Revit model).

## Inputs

- Revit model: `260630 - Lasserre.rvt` (Revit 2027.1). The `.0001` to `.0003` files beside it
  are Revit backups; do not use them. The file opens on a drafting view called
  `0000_OPEN/SAVE VIEW`; floor plans are under Views > Final > 2.00 (Basement, Level 1 to 4, Roof).
- Rooms are named by the user. Their check is pending (see the export brief, "Status").
- pyRevit 7.0.0 is installed and working; the project extension folder `V1-Test\pyrevit` is
  registered and adds an NPC tab with a Room Check button.

## Principles that carry over (from the project brief and the V1 session)

- Never invent architecture. Geometry comes from the model. When something is missing or looks
  wrong, flag it to the user and ask; never guess and never silently ignore it.
- Corrections live in a separate edits file keyed by Revit element id, each with a reason. The
  exported model file is never edited by hand.
- Compute what is computable; label anything inferred (for example office furniture the model
  does not have) as inferred.
- One paid dependency at most (the Claude API, key only in `.env`, never in the browser);
  everything else local and free; the tool runs in a browser from the README alone.
- Keep a build log (asked, built, rejected, checked) and a README from the first step.
- The user reviews geometry from screenshots with markups (X means remove, a check means fine).
  Read markups literally; when unsure what a mark means, ask before changing anything.
- Drawing order follows depth: what is in front (further south in the oblique view) is drawn
  last. Walls take precedence over furniture and doors where they overlap.

## Suggested first steps

1. Run Room Check (NPC tab > Model > Room Check) and read `V1-Test\exports\rooms.json`. Report
   rooms per level, problems, blank names or numbers, duplicate numbers, and whether stairs and
   shafts carry the same name on every level. Let the user fix rooms in Revit.
2. Write the full export as a second pushbutton in `NPC.extension` (walls, doors and windows
   with host ids, rooms with boundary loops, columns, curtain wall mullions and panels, floors,
   stairs, furniture and casework, linework), all levels, metres, Project Base Point origin.
   Run it, then validate the JSON outside Revit (counts per level, every door has a host wall,
   every room has a closed loop) and show the user the counts before building anything on it.
3. Draw each level from the export as a plain plan PNG for the user to check against Revit.
4. Only then rasterise to tiles and port the V1 oblique pixel style (export brief, "Then, in the
   V2 tool"; geometry notes, section 7).

## A first prompt to paste into the new chat

> I'm starting V2 of my ARCH 540 occupant simulation tool. Read
> `V1-Test\V2-HANDOVER.md` first and follow its reading order, then the export brief and the
> V1 geometry notes. Start with step 1: I will click Room Check in Revit; read the rooms file
> and report what needs fixing. Don't build the tool yet. Work in a new folder `V2` beside
> `V1-Test`, and keep a build log there from the start.
