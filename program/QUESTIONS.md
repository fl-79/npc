# Questions and suggestions from the build

Kept while building the engine behind the interface. Each question said what the engine did in the
meantime, so a run worked without the answer. The owner answered 1–21 on 2026-11-08; the answers
and what changed are below, then what is still open. Answer the open ones by number in chat; the
change is applied with a dated script and noted in BUILD-LOG.md.

## Answered 2026-11-08

| # | Question | Answer | What changed in the tool |
|---|---|---|---|
| 1 | Washrooms for the studio floor | Students use Level 2 from the studio, Level 1 from a lecture; Level 4 is the professors' | `world.washroomFor`: nearest of Level 1 and 2 by current floor, by sex; instructors to Level 4 |
| 2 | Instructors' desks | Adjuncts have no office; a permanent instructor's office may be in another building; no curriculum data | 50% sessional [A], half of the permanent with a Level 4 office [A]; sessional come for the session only (`parameters.population.instructors`) |
| 3 | Plotters and printers | Correct | — |
| 4 | Lunch split | Keep for now | — (60 / 25 / 15 stays [A]) |
| 5 | Crit sign-up order | First come first served | confirmed (C) |
| 6 | Where the shared crit spot is | Depends on noise, teaching style and space: desk by desk, or a spot the students come to | a crit mode per instructor (desk / spot, 50/50 [A]); desk mode switches to the spot when the bay is crowded or loud; the spot is the free side table nearest the section, else a free crit room on the floor |
| 7 | Pin-up days | Fine as a generalisation | confirmed (C) |
| 8 | The lecture room | Make a projection from the data | the lecture is per year group, in the smallest Level 1–2 classroom that seats the year, booked first come; none fitting means another building |
| 9 | History seminar rooms | Any day, not against lunch or studio time | a term timetable per seed: non-studio weekday, slot clear of 12:00–13:00, a crit room (Level 3 first, room 30 included) |
| 10 | Office hours | Who uses them depends on the student | P(visit per week) = 0.15 × exp(0.4 keenness − 0.3 N + 0.2 C) [A], only when the instructor has an office here and is in |
| 11 | Good Times headcount | Sure for now | — |
| 12 | The movable-objects levels | Rearrangement = the design suggestions happening in real time, by the agents | AGENTS REARRANGE: the layout manager reads the live signals every half hour and the agents move a table or board (plotter corner, screen, kitchen overflow, shared wall between years); veto, budget, cooldown, connectivity; moves traced in the SUMMARY with measured effect; FREE drops the limits |
| 13 | The elevator | No observation | stays [A] |
| 14 | The "other" situation | Not billed to the owner; the user's own key; without one, not a function: pick from the options | a key field in SITUATION (stored in this browser only); OTHER greyed out without it; INTERPRET returns a structured situation spec the engine applies and reports |
| 15 | Who counts as "between years" | Any two students of different years, TA or not | confirmed (C): the engine already did this; instructors do not count |
| 16 | Crit room 30 | Use it if it is labelled a crit room | used from its floor tiles (24 spots) in the seminar and review timetable |
| 17 | The cohort zones | One desk per student, within the general zones given | confirmed: zone first, overflow to the nearest spare desks |
| 18 | Four boxed-in desks | Make them accessible | a gap rolled open through the thinnest movable piece (a table, 4 tiles) between the pocket and the floor; logged in `world.gaps`, drawn in the drift overlay; 172 of 172 desks in use |
| 19 | Lecture rooms | Bookable first come | see 8 and 9 |
| 20 | Focus blocks | Base the focus benchmark on data | F1 benchmark 11 min median (Mark, González & Harris 2005), DeskTime 52 as the undisturbed bout; share of blocks ≥ 25 min reported |
| 21 | Headcounts | Keep if based on data and surveys | kept (they follow from E1, E3 and the plans) |

Three general instructions, also applied: the feed now speaks in trait-driven voices (register after
the name; AGENT window shows it); every research note carries the 2026-11-08 additions; test cases
for the owner are in `TEST-CASES.md`.

## Answered 2026-11-12

| # | Question | Answer | What changed in the tool |
|---|---|---|---|
| 27 | The move triggers (walkthrough stop 3) | Cap the screens: the owner wants to see what else the agents do to the space, which could have long-term implications | Owner 2026-11-12 (item 27, walkthrough stop 3): screens capped; the owner wants to see what else the agents do to the space, since that could have long-term implications. Found with `test/_layout.mjs`: under the cap nothing else moved on any day, because (a) the kitchen's nearest side table is 21 tiles away and the reach was 20, so the overflow table never fired although 6+ people were in the kitchen 13 times a day; (b) the plotter queue peaks at 3 on the eve of the midterm and the trigger was 4; (c) the first spot found for a piece was the only one tried, and for the plotter table it cut off the north offices. Engine (`layout.js`, `parameters.layout.manager` [A]): `per_trigger_cap.exposure` 2, `kitchen_reach_tiles` 30, `triggers.queue_len` 3, and a spot is tried for connectivity and standing tiles before it is chosen. The plotter table's spot search also widened from 3 m to 5 m of the plotters, since no spot within 3 m keeps the north offices connected (`test/_layout.mjs`: the queue peaks at 8 on the eve). Seed 2026 now: 2026-10-15 two screens, the kitchen table at 13:00 and the plotter table at 17:30 (517 queue-minutes spent at the table instead of standing); 2026-10-13 a screen, the kitchen table at 12:30, a screen at 15:30; 2026-10-23 a screen, the kitchen table, a screen. The shared board (C6 LOW) never fires because between-year contact sits at 0.26 to 0.28 against its 0.15 trigger. Open: the kitchen table's effect is reported as the kitchen peak before and after, which rises with the afternoon anyway; a better measure is who uses the table. Owner, later the same stop: has not seen these moves made, but wants the tool to have the opportunity to make design suggestions through the agents' moves, in addition to the suggestions at the end. Engine (`rules.js`): every kind of move that stood at the end of the day is now a suggestion of its own, tag MOVES, phrased as the permanent version of what the agents did with its measured effect (screens -> a partition or bay-end boards fixed to face the aisle; the kitchen table -> a counter in the lounge by the kitchen door; the plotter table -> a fixed layout table at the plotters; the shared board -> a shared pin-up wall between the years), each with a TRACE to the move's event, the movers' remarks and the spot. The metric rules keep their 'the agents tried this live' line. Eve of the midterm, seed 2026: three MOVES suggestions (two screens; a counter outside the kitchen; a layout table at the plotters). |
| 28 | Headcounts to compare (walkthrough stop 1) | Too many night owls on a normal Tuesday with no deadline; they would work from home; the other numbers seem fine | Owner 2026-11-12 (item 28, walkthrough stop 1): on an ordinary Tuesday with no deadline coming up there would not be that many night owls in studio; they prefer to work from home. The other headcounts seem fine. Found: the late-worker rule keyed on urgency > 1.3, which every student exceeds whenever any deadline is within a couple of weeks, so all 39 late workers stayed to 22:30-01:00 most nights; and the default day 2026-10-13 is three days before the midterm, not a plain week. Engine (`term.js`, `parameters.effort.late_nights` [A]): within 7 days of a review a late worker stays late every night; otherwise only with p 0.25, and everyone else leaves by 19:00-20:30 (E3: others leave by 18:00-20:00 outside crunch), the rest of the planned hours at home (E9). Plain Tuesday 2026-11-03 (seed 2026): planned in past 22:00 41 -> 10, past midnight 16 -> 2; the day run has 51 on the floor at 19:00, 16 at 20:00, 10 at 22:00, 2 at midnight. The midterm-week Tuesday 2026-10-13 is unchanged (case 1 bit-identical). |

## Answered 2026-11-11

| # | Question | Answer | What changed in the tool |
|---|---|---|---|
| 22 | Sessional and office shares | About 20 permanent faculty, not all teaching studio or with an office here; look for data | Data found (APR24 p. 73 and the faculty profiles): 17 full-time architecture faculty in 2024/25 and 15 adjuncts, seven of them on the three fall studios; of the 12 faculty whose profile gives an office, 9 are in Lasserre (Levels 2, 3 and 4) and 3 in CIRS. Engine: sessional share 0.6 [D*], office-here share 0.75 [D], offices on Level 2 first, then 4, then 3 |
| 32 | A weekend before the final (from test case 8) | Stress heightened, late nights and all-nighters likelier, the organised print early for fear of the plotter | Owner 2026-11-11 (item 32): before a final the stress is heightened, late nights and all-nighters are likelier, and the organised print early for fear of the plotter failing. Engine: within seven days of a review a weekend day is a working day (presence 0.7 x ramp, a full day rather than 0.8 of one, arrivals from 10:00, late workers to 23:00-02:00, the all-nighter hurdle on the eve); each student's print day is 1 + 2 x C days before the review (C = 0 the day before, C = +1 three days before, at most six), a missed day caught up on the next day in, 30% reprint on the eve, with a 'print_early' remark. Saturday 2026-12-05 (seed 2026): 133 of 165 students in, 6 on the floor at 10:00, 81 at 14:00, 63 at 20:00, 21 at midnight, 8 print jobs. Numbers [A]; the 81% presence is the one to check. |
| 33 | The high-stress share (from test case 9) | Depends on personality in a normal week; 55% before reviews is near the target, lower it; asked for the logic | Stress rule rebuilt: each day stress relaxes 15% toward a personal baseline (0.40 + 0.15 x N); the rise before a review comes from the days to that year's next review (zero two weeks out, full on the day) scaled by exp(0.5 N) with weight 0.03; the other courses' deadlines add a little through the urgency sum (0.002); sleep debt and a bad crit add as before; the constant daily push of 0.015 is gone. Probed over five seeds (test/_stress.mjs): about 18% high in a normal week (band 15-24%), 42% the week before the midterm, 36% in the review week, 43% the week before the final; the low-N third is never high, the high-N third almost always. Owner 2026-11-11: a normal week depends on personality; 55% before reviews is near the target, bring it down. |
| 23 | Lecture per year group or per section | Per year group; the section's own briefing counts as an intro | Each session opens with a 15-minute **section intro** at the instructor's spot (APR24: "desk crits, small group meetings, studio pinups"); on the week's first session the year's lecture follows it |

## Still open

24. **The veto rule** (reworded after the owner's question of 2026-11-11). Nobody moves anyone's desk:
    desks are never movable; the agents move only side tables, pin-up boards and loose seating. The veto
    is this: when two agents go to roll a board or a table to a new place, a person whose desk is within
    two tiles of that new place may object ("No. The board stays where it is."), with a chance of about a
    third, lower for agreeable people. The question is whether that objection is the right picture, or
    whether the piece simply gets moved and later moved back. Engine stays as is [A] until answered.
25. **The screen's effect.** *Resolved 2026-11-08 (my side, no answer needed).* The exposure count
    now reads one count per walker per pass (not per tile stepped), within two tiles of the desk: the
    near ring counts 1, the next ring 0.5, and a pass with a board, table or wall between desk and
    walker counts half again. A screen now reads as a reduction (33 → 4, 114 → 18 passes an hour in
    the sample days); a few still read near zero because the route itself moves one bay over, which is
    the second thing the F2 suggestion asks for. F4 is in the new unit (benchmark 6 passes an hour,
    rescaled from 15 tile-steps [A]); the exposure trigger is 20 passes an hour, a pass every three
    minutes. Still worth a look at a real bay-end board: does the route move, or do people squeeze by?
26. **Room 30 and the north-west bay.** *Answered 2026-11-11.* Room 30 is on Level 2 and is not the
    APR's 202: the largest classroom with seats on that floor is room 22, the owner's large classroom
    and pin-up space, which is what the APR says of 202. Applied (`scripts/apply_chat_2026-11-11a.py`):
    room 22 seats four a table, 64 chairs against the APR's capacity of 60; room 30 stays a crit room
    used from its floor. The other Lasserre rooms the APR names are cross-referenced in `rooms.json`
    as `apr_room` (never in a room's name):

| APR room | What the APR says | Model room | Status |
|---|---|---|---|
| 202 | held teaching room: felt pin-up walls, projector and screen, Ezo boards; class capacity raised to 60 | Level 2 room 22, the large classroom (111.5 m²) | applied: 64 chairs (four a table), capacity 60 recorded; inferred |
| 301, 309 | the two held teaching rooms on the third floor, same fit-out | Level 3 crit rooms 4 (south, 301) and 1 (north, 309) | inferred: which is which from 303A beside room 4 |
| 303A | photo documentation space for the ARCH program | Level 3 room 5, Photography room | inferred |
| 102, 104, 105 | UBC shared teaching rooms on the first floor, 105 a digital teaching space and two lecture spaces, bookable | Level 1 classrooms 12, 13, 15 | inferred; which number is which unknown |
| Room 2 | the school's shop, across the hall from Room 5 | Basement 74, Workshop (146 m²) | inferred |
| Room 5 | former thesis studio, now a shared classroom and shop extension: work-benches, a projector, 3D printers (2024), open 24/7 | Basement 75, Model assembly room (115 m²) | inferred; 5C (a shop workspace across from it) has no match |
| Room 9 | the SALA Materials Lab, the former reading room, 1000+ sq ft, for meetings, lectures, seminars, reviews | Basement 70 (104 m²) or 77 (109 m²) | candidates only; both stay flagged |
| 402 | the main office and MArch program office, fourth floor | no match; Level 4 room 55 (34 m², shared desks) the only candidate | open; Level 2 room 34 (162 m²) stays the placeholder admin office |

    Three things this raised (29–31 below). The north-west bay table is still worth a look in Revit.
29. **Room 9, the Materials Lab.** The APR's Room 9 (the former reading room, 1000+ sq ft, bookable for
    meetings, lectures, seminars and reviews) is one of the two flagged basement rooms, 70 or 77 (both
    about 105 m²), if it is in the basement at all. Which, and is it bookable by students?
30. **301 or 309.** The south crit room (4, beside the photo room) is taken as 301 and the north one (1)
    as 309, from the numbering direction only. The door signs settle it.
31. **The main office (402) and Level 2 room 34.** The APR and the website put the main office on the
    fourth floor in 402; the model has no Level 4 room of that kind except the 34 m² shared office 55,
    and the 162 m² room 34 on Level 2 is a placeholder admin office. What are rooms 34 and 55 really?
34. **Long-term changes by the agents** (owner, 2026-11-12, walkthrough stop 4). The owner's idea: a third
    plotter could be a long-term change made by an agent, not likely within a semester unless a further
    toggle beyond AGENTS REARRANGE and FREE gives the agents more freedom, allowing substantial changes
    such as new equipment or construction; each such change must be documented, since it is an equipment
    or construction cost. Proposed design, to confirm: a fourth movement level, LONG-TERM, under which the
    agents' petitions (a third plotter from F8, a washroom on the floor from WC TRIPS, a counter at the
    kitchen, a fixed partition, a shared wall) are applied as changes with a cost line each; under the
    other levels the same petitions appear in ANALYSE as suggestions with the cost line but nothing
    changes. Open: which changes are on the list; the cost of each and its source (equipment quotes,
    construction rates), flagged until sourced; whether a term run applies a change at a set week or on
    the first day; and how the added piece is drawn, since it is not in the Revit model (placeholder,
    labelled "added by the agents").
    Owner, same morning: the limit is equipment and moving things around long term, not new walls or
    plumbing, only moveable changes. So the list is a third plotter, a counter or table at the kitchen, a
    fixed-in-place but moveable partition, a shared pin-up wall on casters; the washroom is out. To take up
    after the walkthrough (reminder set for the evening of 2026-11-12).

## Suggestions

- **Put the tool folder under git** before more engine work: the patch slip that emptied two files
  on 2026-11-07 would have been a one-line revert.
- **Observation before calibration.** Three cheap counts would pin the biggest assumptions: a
  headcount on the floor at 10:00, 15:00, 20:00 and 23:00 on a normal Tuesday and the Tuesday before
  the midterm; the plotter queue length at 17:00 that week; how many people are at Good Times at
  19:00. The engine prints the same numbers (headless: `node test/run-day.mjs <date>`).
- **The personality survey** (BFI-2-S, anonymous) would replace the field and sex shifts with
  measured values; it is the single largest uncertainty in the trait population.
- **Sensitivity screening** should run on the term layer first (cheap) before anyone reads a
  number off the day run.
- **A desk map.** A photo of the desk map by the studio door would settle the zone overflow (17)
  and the instructor list (22) at once.
- **An afternoon with a stopwatch** at ten desks would settle the focus question (20) and the
  interruption rate, and give the move triggers (27) their first numbers.
