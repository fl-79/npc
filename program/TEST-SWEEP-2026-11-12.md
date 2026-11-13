# Sweep 2026-11-12

Run with `node test/run-sweep.mjs` from `viewer/` (full). Every run is checked against the engine invariants (nothing thrown, nobody standing still while walking for ten minutes, the studio floor connected, metrics finite and in range, the move budget kept, the lift sane, the intros matching the sections in session) and each situation against its intended effect. Raw: `program/test-results/2026-11-12/sweep.json`.

**Failures: 0**


## The grid

| Run | Present | Events | Floor 09:30 / 14:30 / 19:00 | F1 | F2 | C6 | F4 | Moves | Lift wait mean / max | Checks |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-13 none everyday s2026 | 176 | 3833 | 45 / 12 / 124 | 16.92 | 1.46 | 0.26 | 8.48 | 0 | 44 / 151 s | ok |
| 2026-10-15 none everyday s2026 | 145 | 3041 | 26 / 107 / 104 | 16.53 | 1.4 | 0.28 | 6.97 | 0 | 25 / 151 s | ok |
| 2026-10-16 none everyday s2026 | 176 | 2599 | 45 / 95 / 146 | 16.4 | 1.21 | 0.32 | 7.21 | 0 | 37 / 151 s | ok |
| 2026-11-02 none everyday s2026 | 109 | 1062 | 20 / 38 / 31 | 17.47 | 1.19 | 0.27 | 4.28 | 0 | 26 / 151 s | ok |
| 2026-11-13 none everyday s2026 | 176 | 2927 | 51 / 168 / 64 | 15.38 | 1.46 | 0.27 | 8.98 | 0 | 7 / 70 s | ok |
| 2026-12-05 none everyday s2026 | 133 | 1468 | 0 / 81 / 75 | 17.85 | 1.23 | 0.2 | 4.04 | 0 | 10 / 151 s | ok |
| 2026-10-13 none everyday s2027 | 176 | 3827 | 26 / 11 / 135 | 16.32 | 1.53 | 0.24 | 8.91 | 0 | 45 / 151 s | ok |
| 2026-10-15 none everyday s2027 | 141 | 3025 | 24 / 123 / 103 | 16.18 | 1.49 | 0.27 | 6.87 | 0 | 20 / 151 s | ok |
| 2026-10-16 none everyday s2027 | 176 | 2630 | 31 / 95 / 149 | 16.87 | 1.24 | 0.32 | 6.57 | 0 | 39 / 151 s | ok |
| 2026-11-02 none everyday s2027 | 119 | 1137 | 14 / 57 / 34 | 17.07 | 1.22 | 0.25 | 5.38 | 0 | 36 / 151 s | ok |
| 2026-11-13 none everyday s2027 | 176 | 2883 | 26 / 164 / 68 | 15.85 | 1.45 | 0.25 | 8.74 | 0 | 8 / 112 s | ok |
| 2026-12-05 none everyday s2027 | 129 | 1564 | 0 / 88 / 80 | 18.03 | 1.25 | 0.22 | 3.95 | 0 | 10 / 151 s | ok |
| 2026-10-13 none everyday s2028 | 176 | 3738 | 32 / 11 / 130 | 16.68 | 1.42 | 0.27 | 8.75 | 0 | 43 / 151 s | ok |
| 2026-10-15 none everyday s2028 | 131 | 2560 | 19 / 117 / 97 | 16.97 | 1.3 | 0.28 | 5.88 | 0 | 19 / 151 s | ok |
| 2026-10-16 none everyday s2028 | 176 | 2675 | 34 / 95 / 149 | 16.98 | 1.21 | 0.35 | 7 | 0 | 43 / 151 s | ok |
| 2026-11-02 none everyday s2028 | 125 | 1293 | 18 / 80 / 34 | 16.77 | 1.32 | 0.21 | 5.66 | 0 | 30 / 151 s | ok |
| 2026-11-13 none everyday s2028 | 176 | 2947 | 39 / 166 / 78 | 16.12 | 1.44 | 0.29 | 8.59 | 0 | 10 / 151 s | ok |
| 2026-12-05 none everyday s2028 | 117 | 1382 | 0 / 69 / 72 | 17.83 | 1.16 | 0.21 | 3.56 | 0 | 6 / 51 s | ok |
| 2026-10-15 none agents s2026 | 145 | 2944 | 26 / 109 / 106 | 16.3 | 1.45 | 0.27 | 6.57 | 4 | 17 / 151 s | ok |
| 2026-10-15 none free s2026 | 145 | 2981 | 26 / 109 / 103 | 16.45 | 1.45 | 0.26 | 6.27 | 4 | 27 / 151 s | ok |
| 2026-10-15 none agents s2027 | 141 | 3005 | 24 / 124 / 102 | 16.08 | 1.55 | 0.21 | 6.41 | 4 | 23 / 151 s | ok |
| 2026-10-15 none free s2027 | 141 | 3005 | 24 / 124 / 102 | 16.08 | 1.55 | 0.21 | 6.41 | 4 | 23 / 151 s | ok |
| 2026-10-15 none agents s2028 | 131 | 2544 | 19 / 116 / 98 | 16.57 | 1.32 | 0.26 | 5.69 | 4 | 23 / 151 s | ok |
| 2026-10-15 none free s2028 | 131 | 2564 | 19 / 116 / 97 | 16.73 | 1.33 | 0.26 | 5.66 | 4 | 24 / 151 s | ok |

## The situations (seed 2026, each on its day)

| Situation | Day | Present | Effect seen | Checks |
|---|---|---|---|---|
| review | 2026-10-16 | 176 | review; crits 151, paper out 3, lift boarded 473, at the event 19:00 20, mean leave 20:52 | ok |
| pinup | 2026-10-09 | 176 | pinup; crits 162, paper out 56, lift boarded 455, at the event 19:00 8, mean leave 20:03 | ok |
| lastcrit | 2026-10-13 | 176 | lastcrit; crits 159, paper out 0, lift boarded 441, at the event 19:00 0, mean leave 21:13 | ok |
| good_times | 2026-10-20 | 176 | good_times; crits 139, paper out 0, lift boarded 520, at the event 19:00 12, mean leave 18:44 | ok |
| waffle | 2026-10-15 | 145 | waffle; crits 42, paper out 40, lift boarded 413, at the event 19:00 0, mean leave 21:33 | ok |
| deadline | 2026-10-19 | 124 | deadline; crits 0, paper out 0, lift boarded 344, at the event 19:00 0, mean leave 19:44 | ok |
| paper | 2026-10-15 | 145 | paper; crits 42, paper out 42, lift boarded 446, at the event 19:00 0, mean leave 21:33 | ok |
| lift | 2026-10-13 | 176 | lift; crits 159, paper out 0, lift boarded 0, at the event 19:00 0, mean leave 21:13 | ok |
| cohort | 2026-10-13 | 191 | cohort; crits 174, paper out 0, lift boarded 630, at the event 19:00 0, mean leave 21:12 | ok |
| clash | 2026-10-30 | 176 | clash; crits 165, paper out 0, lift boarded 472, at the event 19:00 11, mean leave 20:39 | ok |
| weekend | 2026-10-13 | 130 | a weekend-like day; crits 113, paper out 0, lift boarded 269, at the event 19:00 0, mean leave 20:16 | ok |

## The policies

| Run | Plot jobs | Outages | F8 | Checks |
|---|---|---|---|---|
| 2026-10-15 paper at all hours | 104 | 0 | 4.15 | ok |
| 2026-10-13 shop closed | 17 | 0 | 0.36 | ok |

## Determinism

Two runs of the same seed in one process are identical in events, remarks, moves and metrics.

## The term, five seeds

| Seed | High stress: normal wk 3 | pre-midterm wk 5 | pre-final wk 13 | Hours wk 3 | Hours wk 5 | All-nighters |
|---|---|---|---|---|---|---|
| 2026 | 0.19 | 0.42 | 0.44 | 46.28 | 62.34 | 20 |
| 2027 | 0.15 | 0.39 | 0.4 | 44.88 | 61.47 | 20 |
| 2028 | 0.24 | 0.5 | 0.48 | 45.29 | 62.3 | 29 |
| 2029 | 0.18 | 0.42 | 0.41 | 45.15 | 60.22 | 17 |
| 2030 | 0.16 | 0.43 | 0.41 | 45.93 | 61.32 | 17 |

Means: normal 0.18 (target 0.2), pre-midterm 0.43 (target 0.4), pre-final 0.43.
Checks: ok
