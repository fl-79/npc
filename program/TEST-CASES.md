# Test cases for the owner (2026-11-08)

Twelve runs to try the tool with, in the order that builds up the picture. Each says what to set,
what should happen, and what to write down if it does not. Start the viewer from `viewer/` with
`npm run dev` and open the page; the steps are the command window on the left. Every run is
deterministic for its seed: the same settings give the same day, so a difference you see is a
difference you made.

Speed: FAST runs a day in about half a minute; STEP advances a minute. The FEED fills as it runs;
ANALYSE fills when the clock reaches 02:00.

**Run again after the walkthrough (2026-11-12):** `program/TEST-RESULTS-2026-11-12.md` has the observed values and verdicts for all twelve cases after the morning's engine changes; cases 2, 3, 4 and 7 differ from the day before as that file explains.

**Already run once (2026-11-11):** `program/TEST-RESULTS-2026-11-11.md` has the observed values for all
twelve, with screenshots in `program/test-results/2026-11-11/`. Cases 1 to 10 rerun headless with
`node test/run-cases.mjs` from `viewer/` (one case: `node test/run-cases.mjs 3`), and the same seed
gives the same numbers in the browser; the browser is still the test for the look of it.

## 1. A normal Tuesday (the baseline)

- VIEW: Level 3, PLAN VIEW. DAY: 2026-10-13 (the default). RUN: EVERYDAY USE, horizon DAY, seed 2026, PLAY at FAST.
- Expect: 176 people expected; the floor fills from 09:00 (about 44) to 15:00 (about 166), the 13:45 lecture empties it for 45 minutes (the count drops to about 70 while the building count stays), the night ends with about 30 at midnight. At 13:30 each section gathers at its instructor's spot for fifteen minutes (eleven intro lines in the FEED), then the year's lecture or the desks (in seed 2026 year 2's lecture is in room 22 on Level 2, which seats 64; years 1 and 3 go down to Level 1, rooms 15 and 12). Crits run from 13:45; two or three instructors set up at a side table ("sets up at a side table near section …") and the rest go desk by desk.
- FEED: remarks differ in voice. Look for a terse one ("In." / "Out.") near a chatty one ("Okay so. …"), an anxious one ("Behind already.") and a lower-case one; the register shows after the name.
- ANALYSE: C1 LOW, F2 HIGH and WC TRIPS fire; F1 reads about 16 min against the 11 min benchmark (no F1 SHORT). Open a TRACE: the remarks highlight in the FEED, the spot marks on the plan.
- Write down: the five headcounts (09:00, 12:00, 15:00, 20:00, 23:00) against what you see on a real Tuesday.
- Note (2026-11-12): 2026-10-13 is three days before the midterm, so its evening is a crunch evening, not a plain one; a plain Tuesday is 2026-11-03. The owner's answer at the walkthrough: the late count was too high for a normal week (item 28, fixed in `effort.late_nights`), the rest fine.

## 2. The afternoon before the midterm, the agents rearranging

- DAY: 2026-10-15. RUN: AGENTS REARRANGE, PLAY at FAST.
- Expect: plot jobs from late morning; the plotter queue reaches 4 or more in the afternoon; paper runs out after 17:00 with people giving up ("Paper's out and the tech left at four"). Moves in the FEED: boards rolled to the aisle side of exposed desks from noon (four by 18:00 in seed 2026, the day's budget). The side table to the plotter corner needs a spot that keeps the floor connected; in seed 2026 the only spot near the corner would cut off the north offices, so the manager refuses it and F8 QUEUE fires without a live attempt. Another seed may differ. Possibly a veto ("No. The board stays where it is.").
- PLAN VIEW: the moved piece is drawn filled at its new place with an outline where it was.
- ANALYSE: F8 QUEUE and F2 HIGH each end with "The agents tried this live at …" and the measured effect (a screen reads as a reduction, 33 → 4 passes an hour, or near zero when the route moved a bay over); the DRIFT overlay shows the moves and, in grey dashes at the north-west bay, the table rolled aside for the boxed-in desks.
- Write down: whether the moves are ones you have seen people make, and which you have never seen.

- Note (2026-11-12, item 27): screens are capped at two a day and the kitchen table and plotter table can now fire; on this day seed 2026 makes two screens (12:00, 13:00), the kitchen overflow table (13:00) and the plotter table (17:30). The results of 2026-11-11 predate this.

- Note (2026-11-12): the policy toggles left the interface on the owner's note; case 3 runs headless only (`node test/run-cases.mjs 3`), which passes the policy directly.

## 3. The same day with paper at all hours (A against B)

- Keep DAY 2026-10-15, AGENTS REARRANGE. RUN: tick "plotter paper at all hours". PLAY.
- Expect: no paper_out events and no outages; F8 (the mean wait of those who waited) stays about the same, because the giving-up goes and the wait stays. ANALYSE with B = the previous run: the cards show A and B bars; the Pareto view has two points; the summary carries an "A vs B" line.
- Write down: whether a policy switch is the right level for this (it is one of the few policies the engine has).

## 4. FREE rearrangement (the stress test)

- Same day, RUN: FREE. PLAY.
- Expect: more moves (up to twelve), no vetoes, boards and tables shifting through the afternoon. The floor must stay walkable: nobody is stuck (the counts keep moving, the lift count does not climb).
- Write down: the first move that looks wrong. That is where the constraint list is short.

## 5. Lift out of service

- SITUATION: "lift out of service" (it attaches to the picked day). RUN: EVERYDAY USE. PLAY.
- Expect: the LIFT count stays 0; washroom and lecture trips take the stairs; the lift wait remarks disappear; WC TRIPS still fires.
- Write down: what the stairs are like at 13:45 when a whole year goes down to the lecture.

## 6. Fifteen more students

- SITUATION: "fifteen more students on the floor". PLAY.
- Expect: "Visitor 1–15" in the agent list, on hot desks; the kitchen crowds ("6 of us in it"); encounters up, focus down a little.
- Under AGENTS REARRANGE the kitchen trigger may fire: a table outside the kitchen.

## 7. Good Times (a Friday)

- SITUATION: "Good Times" (attaches to Friday 2026-10-23). PLAY.
- Expect: the lounge fills from 18:00; about 50–60 attend by 19:00; between-year conversations rise (C6 above 0.25); the event remarks ("the second years are actually talking to the first years").
- Write down: the real Friday count at 19:00.

- Note (2026-11-12, stop 5): the Good Times situation no longer doubles the attendance; grab-and-go stays and Friday early leaves are in. On the Friday itself 57 attend over the evening and 27 are at the event at the peak; the 2026-11-11 results (59 at 18:00, 60 at 19:00) predate this.

## 8. A weekend day before the final

- SITUATION: "a weekend day before a review" (attaches to 2026-12-05). PLAY.
- Expect (item 32, 2026-11-11): a working weekend three days before the final: about 80% of students in, arrivals from 10:00, no sessions, about 80 on the floor mid-afternoon, 60 at 20:00 and 20 at midnight, a handful of print jobs by the organised ("Printing today. The plotter will be dead on Monday"), and stress up.
- Write down: who is really in at 20:00 and at midnight on such a Saturday, and whether 80% in is too many.

## 9. The term horizon with five seeds

- DAY: any. RUN: horizon TERM, seeds 5, PLAY.
- Expect: a longer build (five term layers), then the day. ANALYSE: the timeline shows hours per week, the high-stress share, comfort and between-year ties over the weeks with a band; stress peaks in the review weeks (6 and 14); the week slider reads the values. The day run is the first seed's.
- Write down: whether 42–50 hours a week and 20% high stress in a normal week match what you know (E1, H1). After the rebuild of 2026-11-11 (item 33): about 18% high stress in a normal week, 42% the week before the midterm and 43% before the final; the hours per week run 42 to 50, and 61 the week before the midterm now that the weekend before a review is a working one.

## 10. One agent, two voices

- After a run, AGENT: pick a name from the FEED (click it) or the list. Read the traits bars and the Voice line (for example "terse · precise"); FOLLOW centres the plan on them.
- Pick a second agent with the opposite register. Compare their remarks in the FEED over the same hour.
- Write down: whether the voice reads as the trait you would expect, and one line that does not.

## 11. The avatar

- During a run, WALK: ENTER at the south door (Level 1 in PLAN VIEW). W A S D walks; step onto a stair to change floor; E talks to the nearest person: you get their last remark, or a line about what they are doing.
- Walk to the plotter corner at 17:00 on 2026-10-15 and press E a few times.

## 12. OTHER, without and with a key

- SITUATION: without a key saved, "other: describe it" is greyed out; the note says why.
- Paste your own Claude API key in the Key field and SAVE (it stays in this browser only; each INTERPRET is one call billed to that key). "other" turns on. Describe: "A guest lecture at 15:00 for all three years in the large classroom, followed by a reception in the lounge." INTERPRET.
- Expect: a one-line reading under the box (title, what changes: a lecture at 15:00 for a share of years 1/2/3, an event after). PLAY: the run_start line in the FEED lists what was applied. Try an unreadable one ("it snows") and expect "untested" with a modest change.
- CLEAR removes the key; "other" greys out again.

## What to send back

The headcounts (1, 7), the moves that looked wrong (2, 4), one voice line that did not fit (10),
and anything that was stuck or empty. Numbers against the engine's are the calibration; the rest
is the design of the tool.
