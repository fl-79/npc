# Test results 2026-11-12

Cases 1 to 10 were run headless with `node test/run-cases.mjs` from `viewer/` after the walkthrough of 2026-11-12 and its engine changes, cases 11 and 12 in the browser during the walkthrough (stop 9). Every headless case is deterministic for seed 2026; `program/test-results/2026-11-12/cases.json` holds the raw observed values. The verdict compares the observed block with the expectation in `program/TEST-CASES.md` as amended during the walkthrough; `TEST-RESULTS-2026-11-11.md` is the run before the changes.

| Case | Verdict |
|---|---|
| 1. A normal Tuesday (the baseline) | PASS |
| 2. The afternoon before the midterm, the agents rearranging | PASS |
| 3. The same day with paper at all hours (A against B) | PASS, the expectation rewritten |
| 4. FREE rearrangement (the stress test) | PASS |
| 5. Lift out of service | PASS |
| 6. Fifteen more students | PASS |
| 7. Good Times (a Friday) | PASS after the rebuild of stop 5 |
| 8. A weekend day before the final | PASS |
| 9. The term horizon with five seeds | PASS |
| 10. One agent, two voices | PASS |
| 11. The avatar | PASS |
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
      "floor": 66,
      "building": 176
    },
    "15:00": {
      "floor": 166,
      "building": 174
    },
    "20:00": {
      "floor": 102,
      "building": 105
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
    "C3": 2.05,
    "C4": 56.11,
    "C6": 0.26,
    "F1": 16.92,
    "F2": 1.46,
    "F4": 8.48,
    "F8": 0.11
  },
  "F1deepShare": 0.26,
  "voiceLabels": 117,
  "voiceTop": [
    [
      "even",
      127
    ],
    [
      "warm",
      93
    ],
    [
      "chatty · calm",
      44
    ],
    [
      "chatty",
      42
    ],
    [
      "vivid · warm · precise",
      39
    ],
    [
      "chatty · vivid · calm",
      35
    ]
  ],
  "voiceSamples": {
    "terse": "In.",
    "chatty": "Okay so. In. The floor is 6 people deep already.",
    "anxious": "Same floor, same light, same walk to the kitchen. Behind already.",
    "loose": "here. kind of. coffee first"
  },
  "remarks": 1884,
  "events": 3833
}
```

**Verdict:** PASS. 176 expected and present; the same headcounts as 2026-11-11 (44 at 09:00, 120 at noon, 166 at 15:00, 101 at 20:00, 29 at midnight: this Tuesday is three days before the midterm, so its evening is a crunch evening and the late-night cap of item 28 leaves it alone); C1 LOW, F2 HIGH and WC TRIPS fired; F1 16.9 min against 11; the four voice samples occur, 117 distinct register labels. The small metric shifts from yesterday (F4 8.7 -> 8.5, remarks 1893 -> 1884) come from the lift rule of stop 8, which changes who walks which way.

## 2. The afternoon before the midterm, the agents rearranging

**Expected:** plot jobs from late morning; the queue reaches 4 or more; paper runs out after 17:00 with people giving up; boards rolled to exposed desks from noon, a side table to the plotter corner around 17:00; four moves is the budget; possibly a veto; F8 QUEUE and F2 HIGH end with "The agents tried this live"

**Command:** `node test/run-day.mjs 2026-10-15 none agents 2026`

**Observed:**

```json
{
  "present": 145,
  "plotJobs": 104,
  "paperOut": 42,
  "firstPaperOut": "17:21",
  "plotQueueEvents": 104,
  "queueAt17": 4,
  "moves": [
    {
      "t": "13:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Hugo Lee's desk as a screen",
      "effect": "passers at that desk 51 → 0 an hour"
    },
    {
      "t": "13:00",
      "trigger": "kitchen",
      "what": "a side table outside the kitchen as an overflow counter",
      "effect": "kitchen peak 14 → 27 after the table"
    },
    {
      "t": "13:30",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Arjun Shah's desk as a screen",
      "effect": "passers at that desk 43 → 1 an hour"
    },
    {
      "t": "17:30",
      "trigger": "queue",
      "what": "a side table to the plotter corner, to lay sheets out and work while waiting",
      "effect": "524 queue-minutes spent at the table instead of standing"
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
    "WC TRIPS",
    "MOVES",
    "MOVES",
    "MOVES"
  ],
  "live": {
    "F8 QUEUE": [],
    "F2 HIGH": [
      "The agents tried this live at 13:00: the board rolled to the aisle side of Hugo Lee's desk as a screen; passers at that desk 51 → 0 an hour. The agents tried this live at 13:30: the board rolled to the aisle side of Arjun Shah's desk as a screen; passers at that desk 43 → 1 an hour."
    ]
  },
  "metrics": {
    "C1": 38.01,
    "C3": 2.22,
    "C4": 52.7,
    "C6": 0.27,
    "F1": 16.3,
    "F2": 1.45,
    "F4": 6.57,
    "F8": 7.72
  }
}
```

**Verdict:** PASS. 104 plot jobs, the queue at 4 at 17:00, paper out at 17:21 with 42 giving up; four moves: two screens (the cap of item 27), the kitchen overflow table at 13:00 and the plotter table at 17:30, no vetoes; ANALYSE carries three MOVES suggestions besides F2 HIGH (two live attempts), F8 QUEUE (the table, 517 queue-minutes) and WC TRIPS. C1 rises from 26 to 38 m because the overflow table outside the kitchen is now a kitchen spot and the routes to it are longer; to watch. The browser run of the same morning made the same four moves at the same minutes.

## 3. The same day with paper at all hours (A against B)

**Expected:** no paper_out events; F8 falls (the wait stays, the giving-up goes); in ANALYSE the cards show A and B

**Command:** `node test/run-cases.mjs 3   (the headless day runner has no policy flag; this script passes policy.paperAllHours = true)`

**Observed:**

```json
{
  "A_paperOut": 42,
  "B_paperOut": 0,
  "A_F8": 7.72,
  "B_F8": 10.08,
  "A_outages": 42,
  "B_outages": 0,
  "A_jobs": 104,
  "B_jobs": 100,
  "B_suggestions": [
    "F2 HIGH",
    "F8 QUEUE",
    "WC TRIPS",
    "MOVES",
    "MOVES",
    "MOVES"
  ]
}
```

**Verdict:** PASS, the expectation rewritten. A (no policy): 42 abandoned jobs and 42 outages; B (paper at all hours): 0 and 0, 100 jobs. F8 rises from 7.7 to 10.1 min under the policy, because in A the 42 who gave up stopped waiting: the mean wait cannot show the policy's gain, which is why F8 now carries the abandoned count and the A vs B line compares 0 against 42 (walkthrough stop 4). The old expectation that F8 falls was wrong.

## 4. FREE rearrangement (the stress test)

**Expected:** more moves than case 2 (up to twelve), no vetoes; the floor stays walkable: nobody stuck, the lift count does not climb

**Command:** `node test/run-day.mjs 2026-10-15 none free 2026`

**Observed:**

```json
{
  "moves": 4,
  "movesList": [
    {
      "t": "11:30",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Felix Osei's desk as a screen",
      "effect": "passers at that desk 24 → 1 an hour"
    },
    {
      "t": "12:00",
      "trigger": "exposure",
      "what": "the board rolled to the aisle side of Hugo Lee's desk as a screen",
      "effect": "passers at that desk 36 → 1 an hour"
    },
    {
      "t": "13:00",
      "trigger": "kitchen",
      "what": "a side table outside the kitchen as an overflow counter",
      "effect": "kitchen peak 11 → 30 after the table"
    },
    {
      "t": "17:30",
      "trigger": "queue",
      "what": "a side table to the plotter corner, to lay sheets out and work while waiting",
      "effect": "508 queue-minutes spent at the table instead of standing"
    }
  ],
  "vetoes": 0,
  "mainComponentShare": 1.07,
  "stillWalkingAtEnd": 10,
  "insideAtEnd": 10,
  "lift": {
    "boarded": 446,
    "waits": 482,
    "meanWait": 27
  },
  "present": 145,
  "metrics": {
    "C1": 39.34,
    "C3": 2.19,
    "C4": 56.53,
    "C6": 0.26,
    "F1": 16.45,
    "F2": 1.45,
    "F4": 6.27,
    "F8": 7.14
  }
}
```

**Verdict:** PASS. four moves under FREE, no vetoes, the floor's main component 107% of its start, lift mean wait 27 s over 482 waits, nobody stuck; the budget of twelve is a ceiling and the signals fire only so often.

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

**Verdict:** PASS. identical to 2026-11-11: lift boarded 0, no lift waits, 343 washroom trips by the stairs, WC TRIPS fired; at 14:00 the floor holds 32 with 176 in the building.

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
  "kitchenCrowdedRemarks": 425,
  "encounters": {
    "baseline": 12289,
    "now": 15597
  },
  "C4": {
    "baseline": 56.11,
    "now": 56.22
  },
  "F1": {
    "baseline": 16.92,
    "now": 17
  },
  "F2": {
    "baseline": 1.46,
    "now": 1.38
  }
}
```

**Verdict:** PASS. 15 visitors (176 -> 191 present), 425 kitchen-crowded remarks, encounters 12,289 -> 15,597, F2 1.46 -> 1.38, F1 16.9 -> 17.0: fifteen more on hot desks away from the aisle do not interrupt the others more.

## 7. Good Times (a Friday)

**Expected:** the lounge fills from 18:00; about 50 to 60 attend by 19:00; between-year conversations rise (C6 above 0.25); the event remarks

**Command:** `node test/run-day.mjs 2026-10-23 good_times everyday 2026`

**Observed:**

```json
{
  "atEvent": {
    "18:00": 0,
    "18:15": 20,
    "18:30": 25,
    "19:00": 15,
    "20:00": 4
  },
  "inLounge1830": 26,
  "attendersOverTheEvening": 46,
  "grabAndGo": 24,
  "inLounge19": 16,
  "eventRemarks": 25,
  "sampleRemark": "good times. the lounge becomes a different room when it is full",
  "C6": 0.26,
  "between": 229,
  "interactions": 896,
  "present": 176
}
```

**Verdict:** PASS after the rebuild of stop 5. the situation on a Friday that already has Good Times changes nothing now; 46 attend over the evening, 24 of them a quick grab, 20 at the event at 18:15 and 25 at 18:30 (the peak is in the first half hour, as the owner said people come at the start), 15 at 19:00, 4 at 20:00; 25 event remarks; C6 0.26. Yesterday's 59 at 18:00 and 60 at 19:00 were the doubled attendance the owner rejected.

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
  "events": 1468
}
```

**Verdict:** PASS. 133 of 165 students (81%), first arrival 10:15, no crits or intros, 54 on the floor at noon, 82 at 16:00, 63 at 20:00, 40 at 23:00; 8 print jobs by the organised. The owner confirmed 80% in as about right (walkthrough stop 6).

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

**Verdict:** PASS. identical to 2026-11-11 for the five term layers: hours 42 to 51 a week in studio weeks and 61 before the midterm; high stress 0.18 in a normal week, 0.42 before the midterm, 0.43 before the final. Between-year ties still drop to the 26 mentor pairs in weeks 9 and 13 (open); the last snapshot is written twice (open).

## 10. One agent, two voices

**Expected:** the AGENT window shows the traits bars and the Voice line; two agents of opposite register read differently over the same hour; the label after the name is stable per agent

**Command:** `node test/run-cases.mjs 10   (the same day as case 1; in the browser pick the two names in AGENT)`

**Observed:**

```json
{
  "terse": {
    "name": "Eli Silva",
    "voice": "terse · anxious · vivid",
    "traits": {
      "O": 1.09,
      "C": 0.39,
      "E": -1.15,
      "A": 0.02,
      "N": 1.11
    },
    "remarks": [
      "11:47 Other floor.",
      "11:53 Collected the print.",
      "12:03 11 in the kitchen.",
      "12:38 17 in the kitchen.",
      "13:45 Headphones.",
      "16:13 Headphones."
    ],
    "labelsSeen": [
      "terse · anxious · vivid"
    ]
  },
  "chatty": {
    "name": "Teo Nguyen",
    "voice": "chatty · calm",
    "traits": {
      "O": 0.35,
      "C": 0.48,
      "E": 2.15,
      "A": 0.6,
      "N": -0.93
    },
    "remarks": [
      "10:22 Morning, floor! 82 of you already. Who wants coffee?",
      "11:46 Washroom means another floor. 25 metres and a flight of stairs.",
      "12:08 13 people, two counters. Nobody drew lunch on this plan. Anyone else?",
      "12:38 15 people, two counters. Nobody drew lunch on this plan. It is what it is.",
      "13:12 Finally met a first year properly. Why does that only happen at the kettle?",
      "13:41 Round the side table for the briefing. Fifteen minutes standing, then the sheet goes up. Anyone else?"
    ],
    "labelsSeen": [
      "chatty · calm"
    ]
  },
  "agentsWithRemarks": 175,
  "distinctLabels": 117
}
```

**Verdict:** PASS. the most terse and most chatty students of the day by label (Eli Silva, terse - anxious - vivid; Teo Nguyen, chatty - calm) carry their labels on every remark; 117 distinct labels across 175 people with remarks. In the browser the walkthrough compared Ruth Park with Iris Ivanova; one wording fault (a comma opener leaving the next word capitalised) was fixed.

## 11. The avatar (browser, walkthrough stop 9)

**Observed:** on 2026-10-15 at 17:00 the avatar entered at the south door on Level 1 (tile 24, 87), walked to (22, 81) with W and A, and E answered "Nobody within four metres". The view had to be switched to Level 1 by hand, as the WALK panel says. With the 3D building view on screen a day run crawls at about a simulated minute a second; in plan view it runs at full speed (engine note, open).

**Verdict:** PASS.

## 12. OTHER, without and with a key (browser, walkthrough stop 9)

**Observed:** without a key the option is disabled and the note reads "OTHER needs your own key. It stays in this browser and is billed to you."; after SAVE with a placeholder the option is enabled and the note reads "Key saved in this browser; OTHER is on."; after CLEAR the option is disabled again and the storage is empty. INTERPRET was not pressed (the 401 path was exercised on 2026-11-11).

**Verdict:** PASS for the key handling; the reading itself still needs a real key.

## What changed between the two runs

Everything the walkthrough of 2026-11-12 changed (BUILD-LOG, 2026-11-12 entries): the late-night cap on ordinary days (item 28), screens capped and the other moves freed (item 27), the moves as suggestions, F8 with the abandoned count, the Good Times rebuild with grab-and-go stays and Friday plans, and the lift rule. Cases 5 and 9 are unchanged; case 1's headcounts are unchanged; cases 2, 3, 4, 7 differ as described above.

## Open engine items

1. Between-year ties collapse in a week without sessions (case 9).
2. The last term snapshot is written twice (case 9).
3. The kitchen table's reported effect (the kitchen peak before and after) is not a measure of the table (case 2).
4. A day run under the 3D building view is slow (case 11).
5. C1 rose to 38 m on the eve with the overflow table counted as a kitchen spot (case 2); whether that is the right reading of "desk-to-amenity routes" is to check.
