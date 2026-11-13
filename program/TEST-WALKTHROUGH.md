# Walkthrough of the important cases (for the session of 2026-11-12)

The plan for going through the tool together, case by case, with the run on screen. Each stop says
what to set, what to look at, what the numbers mean, and the one question you can answer from what you
see. The observed values come from `TEST-RESULTS-2026-11-11.md` and `TEST-SWEEP-2026-11-11.md`; every
run is deterministic for seed 2026, so what you see is what the report saw. About ninety minutes in all.

Start the viewer from `viewer/` with `npm run dev`. The command window on the left is the sequence:
1 VIEW, 2 DAY / SITUATION, 3 RUN, 4 ANALYSE, 5 WALK, and AGENT.

## Stop 1. A normal Tuesday, the whole day in two minutes (case 1)

- Set: VIEW Level 3, PLAN VIEW. DAY 2026-10-13 (the default). RUN: EVERYDAY USE, PLAY at 600×.
- Watch the clock and the counts under it: 44 on the floor at 09:00, 120 at 12:00, the section intros at
  13:30 (eleven huddles at the instructors' side tables), the year lectures at 13:45 (year 2 stays on
  Level 2 in room 22, years 1 and 3 go down to Level 1), 166 back by 15:00, 101 at 20:00, 29 at midnight.
- Watch the FEED: the register after each name. A terse one says "In."; a chatty one "Okay so. …"; an
  anxious one ends "Behind already."; a loose one is lower case.
- Question for you: do the five headcounts match a real Tuesday, roughly? (Open item 28.)
- Done 2026-11-12: the owner said the night count was too high for a Tuesday with no deadline (people work from home), the rest fine. Two findings: 2026-10-13 is three days before the midterm, and the late-worker rule fired every night. Fixed (`effort.late_nights`); a plain Tuesday (2026-11-03) now has 16 on the floor at 20:00 and 2 at midnight.

## Stop 2. ANALYSE on that day (case 1)

- When the clock reaches 02:00, ANALYSE. Three suggestions fire: C1 LOW (routes overlap too little for
  Kabo's effect), F2 HIGH (1.5 interruptions per focus hour), WC TRIPS (no washroom on the floor).
- Open a TRACE: the remarks behind the suggestion light up in the FEED and the spots mark on the plan.
- The metric cards: F1 focus 16.6 min against the 11 min benchmark (Mark 2005); F4 8.6 passes an hour at
  a desk against 6; C6 0.27 of conversations between years against 0.25.
- Question: which of the three suggestions would you act on first, and is the trace convincing?
- Done 2026-11-12: the owner would act on F2 HIGH (the boards) first.

## Stop 3. The agents rearrange the floor (case 2)

- DAY 2026-10-15 (the afternoon before the midterm). RUN: AGENTS REARRANGE. PLAY at 600×, then pause at
  about 14:00 and look at the plan: three boards have been rolled to the aisle side of three exposed
  desks (12:00, 13:00, 13:30); the new place is filled, the old place an outline. Resume: a fourth board at
  18:00 spends the day's budget; the side table to the plotter corner is refused in this seed because its
  only spot would cut off the north offices. Paper runs out at 17:25 and 42 people give up ("Paper's out
  and the tech left at four").
- ANALYSE: F2 HIGH ends with "The agents tried this live at …" and the measured effect (passers at that
  desk 33 → 2 an hour); F8 QUEUE has no live attempt this seed. DRIFT overlay: the moves, and in grey
  dashes the table rolled aside for the four boxed-in desks.
- Questions: are these moves ones you have seen people make? Should screens be allowed to spend the whole
  daily budget of four? (Open item 27.)
- Done 2026-11-12: capped at two (item 27). Found that nothing else could fire: the kitchen table was out of reach by one tile, the plotter trigger one above the queue's peak, and the plotter table's only tried spot cut the floor. Fixed; the day now has two screens, the kitchen overflow table at 13:00 and the plotter table at 17:30. The owner has not seen these moves made but wants them to be design suggestions in their own right: ANALYSE now carries one MOVES suggestion per kind of move, the permanent version of what the agents did.

## Stop 4. A against B: paper at all hours (case 3)

- Same day, tick "plotter paper at all hours", PLAY. No outages. ANALYSE with B = the previous run: the
  cards show A and B bars; F8 falls from 7.0 to 3.3 min; the summary carries an "A vs B" line.
- Question: is a policy switch the right level for this, or would you rather test a third plotter?
- Done 2026-11-12: run in the viewer with the agents rearranging; the mean wait did not fall (7.1 to 7.2 min) because without the policy the 42 who gave up stopped waiting; F8 now carries the abandoned count and the A vs B line compares 0 against 42. The owner's answer became item 34 (long-term moveable changes by the agents, a fourth level, costs documented), for the evening.

## Stop 5. Lift out, fifteen more, Good Times (cases 5, 6, 7), one each at 600×

- "lift out of service" on the Tuesday: the LIFT count stays 0; 343 washroom trips take the stairs; at
  14:00 only 32 are on the floor because the lecture trips take longer.
- "fifteen more students": Visitor 1 to 15 on hot desks, 445 kitchen-crowded remarks, encounters up a
  third, focus unchanged.
- "Good Times" (Friday 2026-10-23): 59 in the lounge at 18:00, 60 at 19:00, 19 at 20:00; between-year
  share 0.28.
- Question: the real Friday count at 19:00, and whether fifteen more really leaves focus alone.
- Done 2026-11-12 (after the late-night change of the morning, so the evening numbers differ from the report): lift out: 0 boarded, 335 washroom trips by the stairs, 149 on the floor at 13:27. Fifteen more: 15 visitors (191 agents), 455 kitchen-crowded remarks, 16,805 encounters, F1 16.7, F2 1.38, C6 0.28. Good Times: 95 at the event and 92 in the lounge at 18:27, 66 event remarks, C6 0.28.
- Owner: too many; people grab something and leave; Fridays empty early once the crit is done. Rebuilt the same morning: Owner 2026-11-12 (walkthrough stop 5): Good Times should not be that full (95 at the event); people may grab something and leave quickly; on Fridays people are less likely to stay to the end of studio once their desk crit is done, and with other plans they leave earlier. Found: the Good Times situation added half of everyone present for 150 minutes on top of the calendar's own Friday rule (the plain Friday already had 73 attenders, peak 53). Engine: the situation adds nothing on a day that has the event and uses the plan's own rule on any other day; a grab-and-go share of attenders (`social.events.good_times.grab_share` 0.4, 10-20 min; waffle 0.6, 8-15 min) and the rest 40 to 100% of the event, the plan's leave extended only to the end of the stay; on a Friday, `effort.friday.plans_p` 0.4 of students leave 20-60 min after their desk crit ends and skip the evening (remark `friday_plans`). All [A]. Friday 2026-10-23 (seed 2026): 57 attend over the evening, 30 of them a quick grab, 27 at the event at the peak, 15 at 19:00; 25 leave early after their crit; the floor 112 at 18:00 and 35 at 20:00. Q11's 50-60 at Good Times reads as the number who come through, not the number in the room at once; to confirm. Owner, same stop: the 50-60 are the number who come through, at the start of Good Times; arrivals now fall within 25 minutes of the start (`arrive_within_min`), giving 57 through the evening and 33 in the room at the peak.

## Stop 6. The weekend before the final (case 8, your item 32)

- DAY 2026-12-05. PLAY. 133 of 165 students come in from 10:00; 82 on the floor at 16:00, 63 at 20:00,
  40 at 23:00; eight print early ("Printing today. The plotter will be dead on Monday and everyone knows
  it."), the organised first.
- Question: is 80% in on that Saturday too many? Who is really there at 20:00 and at midnight?
- Done 2026-11-12 in the viewer: 133 of 165 students in, first arrival 10:15, no crits or intros, 85 on the floor at 14:56, 72 at 18:56, 49 at 22:07, 8 at 02:00; 8 plot jobs, 5 print-early remarks. Owner: 80% in is about right.

## Stop 7. The term and the stress (case 9, your item 33)

- RUN: horizon TERM, seeds 5, PLAY. The timeline: hours per week 42 to 51, and 61 the week before the
  midterm; the high-stress share 18% in a normal week, 42% the week before the midterm, 43% before the
  final, falling in the review week itself; the band across five seeds. The week slider reads the values.
- The logic in one line: stress relaxes toward a personal level set by neuroticism and rises with the
  days to the next review; the anxious third is almost always over the line, the calm third never.
- Question: in a normal week, one in five of your cohort highly stressed, and the week before a review
  two in five: does that match?
- Done 2026-11-12 in the viewer (five seeds, after the morning's late-night and Friday changes): hours per person 36 to 51 in studio weeks and 62 the week before the midterm; high stress 6% in week 1 rising to 19% by week 3 and 25% in week 4, 42% the week before the midterm (band 39-50 over the seeds), 38% in the review week, 10 to 18% in November, 30% two weeks before the final and 44% the week of it (band 40-48). Between-year ties still drop to 26 in weeks 9 and 13. Engine note: the last snapshot is duplicated (week 13 twice, the second with 0 h).

## Stop 8. One agent, two voices (case 10)

- AGENT: pick Ruth Park (terse · precise · blunt) and read her lines over an hour; then Iris Okafor
  (chatty · warm · precise). The traits bars and the Voice line explain the difference.
- Question: one line that does not fit its register.
- Done 2026-11-12 on the Saturday run (Iris Okafor absent that day, so Iris Ivanova, chatty, E +1.20, stood in): Ruth Park (E -1.95, A -1.27, terse - precise - blunt) 'Kettle.', '20 in the kitchen.'; Iris Ivanova 'Morning, floor! 57 of you already. Who wants coffee?', 'Finally met a first year properly. Why does that only happen at the kettle?'. Two lines that do not fit: Ruth's plain washroom line among her terse ones, and Iris's 'Listen, Washroom means another floor', an opener joined to a line without lowering its first letter (fixed the same morning). Owner: Owner 2026-11-12 (walkthrough stop 8): unless tired or with a mobility need, it is unlikely anyone takes the lift for one floor to the washroom; carrying a model is different. Engine (`engine.travelTo`, `parameters.walking` [A]): one floor is the stairs with a 5% exception, the lift with p 0.7 when the trip is to or from the plotters, the printers, the 3D printer, the shop, a review or a pin-up (a load), p 0.5 after 22:00 or with a sleep debt of 9 h or more (the median student carries 6 to 7 h in a review week, so the threshold had to sit above it), and always with a mobility need; two floors or more keep 70% lift. `population.mobility_need_share` 0.03 is a PLACEHOLDER with no data, drawn on its own random stream so the population is unchanged. Tuesday 2026-10-13 (seed 2026): one-floor trips 999 by the stairs and 56 by the lift for no reason, 38 with a need, 7 with a load, 60 of 112 tired; two-floor trips (the lectures on Level 1) 455 lift, 281 stairs; lift boarded 610 -> 580. `stats.liftChoice` keeps the count by reason. The washroom line no longer says 'if the lift comes'. The owner's main concern is that the voices stay distinct, to reflect the variation in personalities.

## Stop 9. The avatar (case 11) and OTHER (case 12), five minutes

- WALK: ENTER at the south door on Level 1, W A S D, E at the plotter corner at 17:00 on 2026-10-15.
- SITUATION: "other" is greyed out without a key; SAVE a key and it turns on; CLEAR greys it again. With
  your own key, describe a situation and INTERPRET (one call, billed to you). With a placeholder key the
  call comes back in a second with "Could not read it: 401 … invalid x-api-key"; the real reading is the
  one thing only your key can show.
- Done 2026-11-12: the avatar entered at the south door on Level 1 at 17:00 (tile 24, 87), walked to (22, 81) with W and A, and E answered 'Nobody within four metres'; the view switched to Level 1 by hand (the WALK panel says so). OTHER: greyed without a key with the note 'OTHER needs your own key'; SAVE with a placeholder turned it on and the note to 'Key saved in this browser'; CLEAR greyed it again and emptied the storage. INTERPRET itself was not pressed. Found: with the 3D building view on screen a day run crawls at about a simulated minute a second; in plan view it runs at full speed (an engine note, not fixed).

## Stop 10. What the sweep found (TEST-SWEEP-2026-11-11.md)

- Three seeds on six days under every movement level, every listed situation on its day, the two
  policies, a determinism check and the term for five seeds, each run checked against the engine's
  invariants. Final pass (after the move fixes): 39 runs, 0 failures; two runs of one seed identical; the term over five seeds 18% high stress in a normal week, 43% before the midterm and before the final, 45 and 61 hours a week.
- Done 2026-11-12: Rerun 2026-11-12 after the walkthrough's changes (late nights, move caps and reach, moves as suggestions, F8 abandoned count, events and Fridays, the lift rule): 39 runs, 0 failures; two runs of one seed identical; the term over five seeds 18% high stress in a normal week, 43% before the midterm and before the final, 45.5 and 61.5 hours a week. `program/TEST-SWEEP-2026-11-12.md`.

## What is open after the walkthrough

- Owner: 24 (the veto), 27 (the trigger numbers), 28 (headcounts), 29 to 31 (rooms), the rooms list
  (`ROOMS-TO-CONFIRM.md`), and the new judgements above (80% on the Saturday; the stress split).
- Engine: TA ties collapse in a week without sessions; F8 as a mean wait hides the giving-up; the
  INTERPRET call untested.
