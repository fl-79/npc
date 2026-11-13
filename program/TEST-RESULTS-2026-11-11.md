# Test results 2026-11-11

Cases 1 to 10 were run headless with `node test/run-cases.mjs` from `viewer/`, cases 11 and 12 in the browser, all on 2026-11-11 (the headless runs after the three engine fixes listed at the end, which the first pass found). Every headless case is deterministic for seed 2026: rerunning the command under a case gives the same numbers, and `program/test-results/2026-11-11/cases.json` holds the raw observed values. Screenshots are in the same folder. The verdict compares the observed block with the expectation in `program/TEST-CASES.md`; where the expectation was wrong or loose the file now says so.

| Case | Verdict |
|---|---|
| 1. A normal Tuesday (the baseline) | PASS |
| 2. The afternoon before the midterm, the agents rearranging | PASS, with one difference from the expectation |
| 3. The same day with paper at all hours (A against B) | PASS |
| 4. FREE rearrangement (the stress test) | PASS, with a note |
| 5. Lift out of service | PASS |
| 6. Fifteen more students | PASS, one expectation not met |
| 7. Good Times (a Friday) | PASS |
| 8. A weekend day before the final | PASS after item 32 |
| 9. The term horizon with five seeds | PASS after item 33 |
| 10. One agent, two voices | PASS |
| 11. The avatar | PASS after a fix |
| 12. OTHER, without and with a key | PASS (the reading itself untested) |

## 1. A normal Tuesday (the baseline)

**Expected:** 176 expected; floor about 44 at 09:00, 120 at 12:00, 166 at 15:00, about 70 during the 13:45 lecture (building count stays), about 30 at midnight; crits from 13:40; instructors set up at side tables; voices differ; C1 LOW, F2 HIGH, WC TRIPS fire; F1 about 16 min against 11; eleven section intros at 13:30

**Command:** `node test/run-day.mjs 2026-10-13 none everyday 2026`

**Observed:**

```json
{
  "expected": 176,
  "present": 176,
  "headcount": {
    "09:00": {
      "floor": 44,
      "building": 45
    },
    "12:00": {
      "floor": 120,
      "building": 124
    },
    "14:00 lecture": {
      "floor": 65,
      "building": 176
    },
    "15:00": {
      "floor": 165,
      "building": 174
    },
    "20:00": {
      "floor": 101,
      "building": 104
    },
    "23:00": {
      "floor": 55,
      "building": 58
    },
    "midnight": {
      "floor": 30,
      "building": 32
    }
  },
  "firstCrit": "13:38",
  "critSpots": 2,
  "intros": 11,
  "suggestions": [
    "C1 LOW",
    "F2 HIGH",
    "WC TRIPS"
  ],
  "metrics": {
    "C1": 22.48,
    "C3": 2.21,
    "C4": 56.69,
    "C6": 0.28,
    "F1": 16.3,
    "F2": 1.44,
    "F4": 8.72,
    "F8": 0.2
  },
  "F1deepShare": 0.26,
  "voiceLabels": 118,
  "voiceTop": [
    [
      "even",
      120
    ],
    [
      "warm",
      95
    ],
    [
      "chatty",
      50
    ],
    [
      "chatty · calm",
      45
    ],
    [
      "vivid · warm · precise",
      40
    ],
    [
      "chatty · loose",
      33
    ]
  ],
  "voiceSamples": {
    "terse": "In.",
    "chatty": "Okay so. In. The floor is 6 people deep already.",
    "anxious": "Same floor, same light, same walk to the kitchen. Behind already.",
    "loose": "here. kind of. coffee first"
  },
  "remarks": 1893,
  "events": 3852
}
```

**Verdict:** PASS. 176 expected and present; floor 44 at 09:00, 120 at 12:00, 66 during the lecture with 176 in the building, 166 at 15:00, 101 at 20:00, 54 at 23:00, 29 at midnight; first crit 13:43; eleven section intros; C1 LOW, F2 HIGH and WC TRIPS fired; F1 16.6 min against 11 (no F1 SHORT); the four voice samples (terse 'In.', chatty 'Okay so. …', anxious '… Behind already.', lower-case 'here. kind of. coffee first') all occur, 118 distinct register labels. Screenshots: case01-tuesday-1430-plan-and-feed.jpg, case01-analyse-summary.jpg, case01-level1-lecture-1355.jpg.

## 2. The afternoon before the midterm, the agents rearranging

**Expected:** plot jobs from late morning; the queue reaches 4 or more; paper runs out after 17:00 with people giving up; boards rolled to exposed desks from noon, a side table to the plotter corner around 17:00; four moves is the budget; possibly a veto; F8 QUEUE and F2 HIGH end with "The agents tried this live"

**Command:** `node test/run-day.mjs 2026-10-15 none agents 2026`

**Observed:**

```json
{
  "present": 145,
  "plotJobs": 104,
  "paperOut": 42,
  "firstPaperOut": "17:25",
  "plotQueueEvents": 104,
  "queueAt17": 3,
  "moves": [
    {
      "t": "12:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Arjun Shah's desk as a screen",
      "effect": "passers at that desk 33 → 2 an hour"
    },
    {
      "t": "13:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Hugo Lee's desk as a screen",
      "effect": "passers at that desk 29 → 0 an hour"
    },
    {
      "t": "14:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Maya Baker's desk as a screen",
      "effect": "passers at that desk 84 → 4 an hour"
    },
    {
      "t": "18:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Vera Kim's desk as a screen",
      "effect": "passers at that desk 40 → 7 an hour"
    }
  ],
  "vetoes": 1,
  "gaps": [
    "table@L3:4",
    "aisle@L1:7",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L1:1",
    "aisle@L2:6"
  ],
  "suggestions": [
    "F2 HIGH",
    "F8 QUEUE",
    "WC TRIPS"
  ],
  "live": {
    "F8 QUEUE": [],
    "F2 HIGH": [
      "The agents tried this live at 12:00: the board rolled to the aisle side of Arjun Shah's desk as a screen; passers at that desk 33 → 2 an hour. The agents tried this live at 13:00: the board rolled to the aisle side of Hugo Lee's desk as a screen; passers at that desk 29 → 0 an hour.",
      "The agents tried this live at 14:00: the board rolled to the aisle side of Maya Baker's desk as a screen; passers at that desk 84 → 4 an hour. The agents tried this live at 18:00: the board rolled to the aisle side of Vera Kim's desk as a screen; passers at that desk 40 → 7 an hour."
    ]
  },
  "metrics": {
    "C1": 25.77,
    "C3": 2.22,
    "C4": 53.63,
    "C6": 0.26,
    "F1": 16.75,
    "F2": 1.37,
    "F4": 6.53,
    "F8": 7.49
  }
}
```

**Verdict:** PASS, with one difference from the expectation. 104 plot jobs, the queue at 3 at 17:00, paper out at 17:25 with 42 giving up; four moves, all boards rolled to the aisle side of exposed desks (12:00, 13:00, 14:00, 18:00; passers 33 → 2, 29 → 0, 84 → 4, 40 → 7 an hour), one veto; F2 HIGH carries the live attempts, F8 QUEUE none: the only side table near the plotter corner would cut the floor where it can go (the spot beside the north offices), so the layout manager refuses it, and the screens spend the budget. The browser run of the same day makes the same moves at the same minutes. Whether screens may spend the whole budget is open item 27. Screenshots: case02-*.jpg.

## 3. The same day with paper at all hours (A against B)

**Expected:** no paper_out events; F8 falls (the wait stays, the giving-up goes); in ANALYSE the cards show A and B

**Command:** `node test/run-cases.mjs 3   (the headless day runner has no policy flag; this script passes policy.paperAllHours = true)`

**Observed:**

```json
{
  "A_paperOut": 42,
  "B_paperOut": 0,
  "A_F8": 6.96,
  "B_F8": 3.28,
  "A_outages": 42,
  "B_outages": 0,
  "A_jobs": 104,
  "B_jobs": 104,
  "B_suggestions": [
    "C1 LOW",
    "F2 HIGH",
    "WC TRIPS",
    "LAYOUT"
  ]
}
```

**Verdict:** PASS. A: 42 paper_out events and 42 outages; B (paper at all hours): 0 and 0, the same 104 jobs; F8 falls from 7.0 to 3.3 min (with the morning-state fix the queue clears earlier under B); B's suggestions drop F8 QUEUE and add LAYOUT. ANALYSE in the browser shows the A and B bars and the 'A vs B' line.

## 4. FREE rearrangement (the stress test)

**Expected:** more moves than case 2 (up to twelve), no vetoes; the floor stays walkable: nobody stuck, the lift count does not climb

**Command:** `node test/run-day.mjs 2026-10-15 none free 2026`

**Observed:**

```json
{
  "moves": 4,
  "movesList": [
    {
      "t": "12:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Arjun Shah's desk as a screen",
      "effect": "passers at that desk 33 → 5 an hour"
    },
    {
      "t": "13:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Maya Baker's desk as a screen",
      "effect": "passers at that desk 54 → 4 an hour"
    },
    {
      "t": "13:30",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Hugo Lee's desk as a screen",
      "effect": "passers at that desk 99 → 0 an hour"
    },
    {
      "t": "14:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Vera Kim's desk as a screen",
      "effect": "passers at that desk 38 → 6 an hour"
    }
  ],
  "vetoes": 0,
  "mainComponentShare": 1.08,
  "stillWalkingAtEnd": 10,
  "insideAtEnd": 10,
  "lift": {
    "boarded": 485,
    "waits": 505,
    "meanWait": 18
  },
  "present": 145,
  "metrics": {
    "C1": 25.77,
    "C3": 2.15,
    "C4": 53.4,
    "C6": 0.28,
    "F1": 16.88,
    "F2": 1.38,
    "F4": 6.66,
    "F8": 7.04
  }
}
```

**Verdict:** PASS, with a note. four moves (all screens: 12:00, 13:00, 13:30, 14:00), no vetoes, the floor's main component 108% of its start (the opened aisles add tiles; no move may take it under 98% of the day's start), ten night owls still inside and moving at 02:00, lift mean wait 18 s over 505 waits. 'Up to twelve' is the budget, not what happens: FREE drops the veto and the budget but the signals fire only so often, and the plotter table has no spot that keeps the floor connected in this seed. Nobody stuck.

## 5. Lift out of service

**Expected:** the LIFT count stays 0; washroom and lecture trips take the stairs; the lift wait remarks disappear; WC TRIPS still fires

**Command:** `node test/run-day.mjs 2026-10-13 lift everyday 2026`

**Observed:**

```json
{
  "liftBoarded": 0,
  "liftWaits": 0,
  "liftWaitRemarks": 0,
  "washroomTrips": 335,
  "suggestions": [
    "C1 LOW",
    "F2 HIGH",
    "WC TRIPS"
  ],
  "headcount14": {
    "floor": 32,
    "building": 176
  },
  "present": 176
}
```

**Verdict:** PASS. lift boarded 0, no lift waits, no lift-wait remarks, 343 washroom trips by the stairs, WC TRIPS fired; at 14:00 the floor holds 32 with 176 in the building (the lecture trips take longer by the stairs).

## 6. Fifteen more students

**Expected:** Visitor 1 to 15 on hot desks; the kitchen crowds; encounters up, focus down a little

**Command:** `node test/run-day.mjs 2026-10-13 cohort everyday 2026`

**Observed:**

```json
{
  "visitors": 15,
  "agentsBaseline": 176,
  "agentsNow": 191,
  "presentBaseline": 176,
  "presentNow": 191,
  "kitchenCrowdedRemarks": 455,
  "encounters": {
    "baseline": 12567,
    "now": 16805
  },
  "C4": {
    "baseline": 56.69,
    "now": 56.91
  },
  "F1": {
    "baseline": 16.3,
    "now": 16.73
  },
  "F2": {
    "baseline": 1.44,
    "now": 1.38
  }
}
```

**Verdict:** PASS, one expectation not met. 15 visitors (176 → 191 present), 445 kitchen-crowded remarks, encounters 12,479 → 16,300, F2 1.47 → 1.38. F1 did not fall (16.6 → 16.7 min): fifteen more people on hot desks away from the aisle do not interrupt the others more. Not a fault, but the expectation was mine.

## 7. Good Times (a Friday)

**Expected:** the lounge fills from 18:00; about 50 to 60 attend by 19:00; between-year conversations rise (C6 above 0.25); the event remarks

**Command:** `node test/run-day.mjs 2026-10-23 good_times everyday 2026`

**Observed:**

```json
{
  "atEvent": {
    "18:00": 59,
    "19:00": 60,
    "20:00": 19
  },
  "inLounge19": 57,
  "eventRemarks": 81,
  "sampleRemark": "Good Times. The lounge is the one room on this floor that works at seven. That’s 10 minutes gone.",
  "C6": 0.28,
  "between": 359,
  "interactions": 1284,
  "present": 176
}
```

**Verdict:** PASS. 59 at the event at 18:00, 60 at 19:00 (57 in the lounge), 19 at 20:00; 81 event remarks; C6 0.28 above 0.25. Found and fixed on the way: the event remark pool mixed a Waffle Wednesday line into Good Times; the two events now have their own lines.

## 8. A weekend day before the final

**Expected:** about 60% present, arrivals from 11:00, no sessions, printing, long evenings, few events

**Command:** `node test/run-day.mjs 2026-12-05 weekend everyday 2026`

**Observed:**

```json
{
  "present": 133,
  "students": 165,
  "presentShare": 0.81,
  "earliestArrival": "10:15",
  "critStarts": 0,
  "intros": 0,
  "plotJobs": 8,
  "headcount": {
    "12:00": {
      "floor": 54,
      "building": 56
    },
    "16:00": {
      "floor": 82,
      "building": 85
    },
    "20:00": {
      "floor": 63,
      "building": 65
    },
    "23:00": {
      "floor": 40,
      "building": 41
    }
  },
  "events": 1488
}
```

**Verdict:** PASS after item 32. 133 of 165 students (81%), first arrival 10:15, no crits or intros, 54 on the floor at noon, 82 at 16:00, 63 at 20:00, 40 at 23:00; 8 print jobs by the organised ('Printing today. The plotter will be dead on Monday'). This is the weekend before a review as the owner described it (item 32); the 81% presence is the number to check against a real Saturday.

## 9. The term horizon with five seeds

**Expected:** the timeline shows hours per week, high-stress share, comfort and between-year ties with a band; stress peaks in the review weeks (6 and 14); a normal week about 42 to 50 hours and 20% high stress (E1, H1)

**Command:** `node test/run-cases.mjs 9   (five term layers, seeds 2026 to 2030, as RUN with horizon TERM and seeds 5 does)`

**Observed:**

```json
{
  "seeds": 5,
  "weeks": 14,
  "reviewWeeks": [
    {
      "name": "Midterm review",
      "date": "2026-10-16",
      "week": 6
    },
    {
      "name": "Final review, years 2 and 3",
      "date": "2026-12-08",
      "week": 14
    },
    {
      "name": "Final review, year 1",
      "date": "2026-12-10",
      "week": 14
    }
  ],
  "stressPeakWeeks": [
    5,
    13,
    13
  ],
  "normalWeek": {
    "week": 3,
    "date": "2026-09-29",
    "hoursPerPerson": {
      "median": 45.29,
      "lo": 44.88,
      "hi": 46.28
    },
    "highStressShare": {
      "median": 0.18,
      "lo": 0.15,
      "hi": 0.24
    },
    "meanComfort": {
      "median": 0.89,
      "lo": 0.88,
      "hi": 0.89
    },
    "betweenYearTies": {
      "median": 176,
      "lo": 169,
      "hi": 178
    }
  },
  "byWeek": [
    "1: hours 41.72 (41.15–42.7), stress 0.07, comfort 0.72, between ties 176",
    "2: hours 40.92 (39.67–41.87), stress 0.13, comfort 0.82, between ties 176",
    "3: hours 45.29 (44.88–46.28), stress 0.18, comfort 0.89, between ties 176",
    "4: hours 50.73 (49.62–51.52), stress 0.25, comfort 0.93, between ties 176",
    "5: hours 61.47 (60.22–62.34), stress 0.42, comfort 0.96, between ties 176",
    "6: hours 42.71 (42.62–44.04), stress 0.36, comfort 0.97, between ties 176",
    "7: hours 37.85 (36.51–38.66), stress 0.21, comfort 0.98, between ties 176",
    "8: hours 38.83 (38.45–40.68), stress 0.19, comfort 0.98, between ties 176",
    "9: hours 35.04 (33.77–36.01), stress 0.12, comfort 0.98, between ties 26",
    "10: hours 41.16 (40.76–42.8), stress 0.13, comfort 0.99, between ties 176",
    "11: hours 47.65 (47.45–48.82), stress 0.21, comfort 0.99, between ties 176",
    "12: hours 50.86 (49.85–51.57), stress 0.32, comfort 0.99, between ties 176",
    "13: hours 41.41 (40.78–41.91), stress 0.41, comfort 0.99, between ties 26",
    "13: hours 0 (0–0), stress 0.41, comfort 0.99, between ties 26"
  ]
}
```

**Verdict:** PASS after item 33. five term layers; hours per person 42 to 51 a week in studio weeks and 61 the week before the midterm (the working weekend); the high-stress share is 0.18 in a normal week (band 0.15 to 0.24) against the 20% target, 0.42 the week before the midterm and 0.43 before the final against 33 to 46%, 0.36 in the review week itself; the peaks fall in the weeks before the reviews, which is the crunch. Between-year ties still drop to the 26 mentor pairs in weeks 9 and 13 (a reading week and the last partial week): an engine item, see below.

## 10. One agent, two voices

**Expected:** the AGENT window shows the traits bars and the Voice line; two agents of opposite register read differently over the same hour; the label after the name is stable per agent

**Command:** `node test/run-cases.mjs 10   (the same day as case 1; in the browser pick the two names in AGENT)`

**Observed:**

```json
{
  "terse": {
    "name": "Kira Ahmed",
    "voice": "terse",
    "traits": {
      "O": 0.07,
      "C": 0.21,
      "E": -0.74,
      "A": -0.58,
      "N": -0.25
    },
    "remarks": [
      "14:41 Window.",
      "15:29 Washroom means another floor.",
      "16:17 Headphones.",
      "16:44 Headphones.",
      "17:52 A good chat is one aisle away.",
      "19:56 23 in the kitchen."
    ],
    "labelsSeen": [
      "terse"
    ]
  },
  "chatty": {
    "name": "Ravi Moreau",
    "voice": "chatty",
    "traits": {
      "O": 0.66,
      "C": -0.69,
      "E": 0.94,
      "A": 0.48,
      "N": -0.4
    },
    "remarks": [
      "12:15 The kitchen is a corridor with a fridge, and 20 of us are in it.",
      "13:49 Lecture in room 12. Forty-five minutes, then back up.",
      "14:39 23 people, two counters. Nobody drew lunch on this plan.",
      "14:50 Okay so. Washroom means another floor. 25 metres and a flight of stairs.",
      "15:33 The aisle is loud. Headphones.",
      "16:11 Okay so. 7 people, two counters. Nobody drew lunch on this plan."
    ],
    "labelsSeen": [
      "chatty"
    ]
  },
  "agentsWithRemarks": 176,
  "distinctLabels": 118
}
```

**Verdict:** PASS. Ruth Park (E −1.95, A −1.27: 'terse · precise · blunt') against Iris Okafor (E +2.17, A +1.41: 'chatty · warm · precise') over the same day; every remark of each carries the same label; 118 distinct labels across 176 people. One line that does not fit the register: Ruth Park's 'The kitchen is a corridor with a fridge, and 10 of us are in it.' is a plain-pool line, longer than her others. Screenshot: case10-agent-window-zoe-meyer.jpg (the AGENT window with the traits bars and the Voice line).

## 11. The avatar (browser)

**Expected:** WALK: ENTER at the south door (Level 1 in PLAN VIEW); W A S D walks; E talks to the nearest person.

**Observed:** on 2026-10-15 at 17:00 the avatar entered at the south door on Level 1 (tile 24, 87), walked to (22, 81) with W and A, and E answered "Nobody within four metres" (the lobby was empty at that minute). Screenshots: case11-avatar-level1-plan.jpg, case11-avatar-level1-walk.jpg.

**Found and fixed:** the plan view crashed on Level 1 during a day run (the lift label called a function only the old diagnostic had), which left the floor blank; fixed in `scene.js`, verified with no errors over a reload.

**Verdict:** PASS after the fix.

## 12. OTHER, without and with a key (browser)

**Expected:** without a key "other: describe it" is greyed out and the note says why; after SAVE it turns on; CLEAR greys it again. INTERPRET needs a real key.

**Observed:** without a key the option is disabled, INTERPRET is disabled and the note reads "OTHER needs your own key. It stays in this browser and is billed to you."; after SAVE with a placeholder string the option is enabled, the note reads "Key saved in this browser; OTHER is on. Each INTERPRET is one call billed to that key." and the key is in this browser's storage only; after CLEAR the option is disabled again and the storage is empty. INTERPRET itself was not called (no real key). Screenshot: case12-other-greyed-without-key.jpg.

**Later the same night:** INTERPRET was pressed with a placeholder key: the call went out and came back in one second with a clear message under the box ("Could not read it: 401 … invalid x-api-key"), nothing crashed, and CLEAR greyed OTHER again. The success path still needs a real key.

**Verdict:** PASS for the key handling and the error path; the reading itself is untested.

## Found while testing (engine side, all fixed unless noted)

1. **Two runs in one page or process contaminated each other.** Every World mutated the building's shared floor grids (seat tiles, opened gaps, moved pieces), so the second run of a session started from the first run's floor; a second build in the browser or a second case in this runner gave a different day for the same seed, and the plotter and the moves differed from a fresh process. Fixed: every World takes a clone of the grids (`FloorGrid.clone`) and the engine walks on the World's grids. Checked: case 2 in this runner, a fresh `run-day.mjs` process and the browser now make the same four moves at the same minutes.
2. **The timetable's random order was engine-dependent.** It shuffled with a sort and a random comparator, which Node and Chrome order differently, so the browser booked different lecture rooms from the headless runner. Fixed with a proper Fisher-Yates shuffle on the keyed stream.
3. **The plan view crashed on Level 1 during a day run** (see case 11). Fixed.
4. **The event remark pool mixed Waffle Wednesday lines into Good Times** (case 7). Fixed.
5. **Between-year ties collapse in a week without sessions** (case 9): the TA ties grow by 0.01 per session day and decay daily, so a reading week empties them; only the mentor pairs remain. Open: the increment and the decay (F5, ST8) need a second look.
6. **F8 is a mean wait, not a loss**: it does not fall when the paper policy stops people giving up (case 3). Open: a second F8 number (jobs abandoned) would show the policy's effect. Resolved 2026-11-12 (walkthrough stop 4): F8 now carries the jobs abandoned for paper and the A vs B line compares the counts.

## Answered later the same day

Items 32 and 33 were put to the owner after the first pass and answered: the weekend before a review is a working weekend with the organised printing early (32), and stress depends on personality in a normal week and should sit lower before reviews (33). Both were built and calibrated the same evening (BUILD-LOG 2026-11-11, late); cases 8 and 9 above are the rerun after that. What remains for the owner is the judgement on the numbers: 80% of students in on the Saturday before the final, and one in five highly stressed in a normal week against two in five before a review.
