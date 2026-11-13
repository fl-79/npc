# Sweep 2026-11-11

Run with `node test/run-sweep.mjs` from `viewer/` (full). Every run is checked against the engine invariants (nothing thrown, nobody standing still while walking for ten minutes, the studio floor connected, metrics finite and in range, the move budget kept, the lift sane, the intros matching the sections in session) and each situation against its intended effect. Raw: `program/test-results/2026-11-11/sweep.json`.

**Failures: 0**


## The grid

| Run | Present | Events | Floor 09:30 / 14:30 / 19:00 | F1 | F2 | C6 | F4 | Moves | Lift wait mean / max | Checks |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-13 none everyday s2026 | 176 | 3852 | 45 / 12 / 123 | 16.3 | 1.44 | 0.28 | 8.72 | 0 | 42 / 151 s | ok |
| 2026-10-15 none everyday s2026 | 145 | 3017 | 26 / 108 / 106 | 17.03 | 1.42 | 0.26 | 6.99 | 0 | 21 / 151 s | ok |
| 2026-10-16 none everyday s2026 | 176 | 3003 | 44 / 96 / 151 | 16.73 | 1.27 | 0.34 | 6.73 | 0 | 29 / 151 s | ok |
| 2026-11-02 none everyday s2026 | 109 | 1081 | 20 / 37 / 31 | 17.53 | 1.19 | 0.24 | 4.05 | 0 | 31 / 151 s | ok |
| 2026-11-13 none everyday s2026 | 176 | 3974 | 51 / 166 / 120 | 16.3 | 1.48 | 0.3 | 8.88 | 0 | 14 / 151 s | ok |
| 2026-12-05 none everyday s2026 | 133 | 1488 | 0 / 81 / 77 | 18.22 | 1.24 | 0.21 | 4.09 | 0 | 7 / 100 s | ok |
| 2026-10-13 none everyday s2027 | 176 | 3860 | 26 / 14 / 134 | 16.47 | 1.47 | 0.26 | 8.83 | 0 | 41 / 151 s | ok |
| 2026-10-15 none everyday s2027 | 141 | 3036 | 24 / 122 / 102 | 16.12 | 1.52 | 0.23 | 6.81 | 0 | 21 / 151 s | ok |
| 2026-10-16 none everyday s2027 | 176 | 3049 | 31 / 96 / 156 | 16.68 | 1.29 | 0.35 | 6.9 | 0 | 34 / 151 s | ok |
| 2026-11-02 none everyday s2027 | 119 | 1165 | 14 / 57 / 32 | 17.17 | 1.18 | 0.28 | 5.41 | 0 | 31 / 151 s | ok |
| 2026-11-13 none everyday s2027 | 176 | 3936 | 26 / 165 / 129 | 16.55 | 1.5 | 0.29 | 8.66 | 0 | 15 / 151 s | ok |
| 2026-12-05 none everyday s2027 | 129 | 1610 | 0 / 88 / 81 | 18.52 | 1.28 | 0.23 | 4.05 | 0 | 7 / 62 s | ok |
| 2026-10-13 none everyday s2028 | 176 | 3751 | 32 / 11 / 132 | 16.45 | 1.46 | 0.29 | 8.71 | 0 | 42 / 151 s | ok |
| 2026-10-15 none everyday s2028 | 131 | 2567 | 19 / 116 / 98 | 16.83 | 1.3 | 0.26 | 6.11 | 0 | 18 / 151 s | ok |
| 2026-10-16 none everyday s2028 | 176 | 3022 | 33 / 96 / 155 | 16.6 | 1.26 | 0.34 | 7.05 | 0 | 36 / 151 s | ok |
| 2026-11-02 none everyday s2028 | 125 | 1290 | 18 / 84 / 31 | 17.37 | 1.23 | 0.24 | 5.45 | 0 | 23 / 151 s | ok |
| 2026-11-13 none everyday s2028 | 176 | 3797 | 39 / 170 / 128 | 16.52 | 1.45 | 0.27 | 8.55 | 0 | 14 / 151 s | ok |
| 2026-12-05 none everyday s2028 | 117 | 1281 | 0 / 69 / 72 | 18.3 | 1.12 | 0.22 | 3.54 | 0 | 8 / 69 s | ok |
| 2026-10-15 none agents s2026 | 145 | 3013 | 26 / 107 / 105 | 16.75 | 1.37 | 0.26 | 6.53 | 4 | 24 / 151 s | ok |
| 2026-10-15 none free s2026 | 145 | 2979 | 26 / 109 / 107 | 16.88 | 1.38 | 0.28 | 6.66 | 4 | 18 / 151 s | ok |
| 2026-10-15 none agents s2027 | 141 | 3059 | 24 / 124 / 103 | 16.43 | 1.53 | 0.26 | 6.77 | 3 | 23 / 151 s | ok |
| 2026-10-15 none free s2027 | 141 | 3049 | 24 / 123 / 102 | 16.32 | 1.49 | 0.25 | 6.6 | 3 | 23 / 151 s | ok |
| 2026-10-15 none agents s2028 | 131 | 2584 | 19 / 115 / 97 | 16.8 | 1.34 | 0.28 | 5.81 | 4 | 18 / 151 s | ok |
| 2026-10-15 none free s2028 | 131 | 2549 | 19 / 117 / 98 | 16.82 | 1.31 | 0.27 | 5.91 | 3 | 19 / 151 s | ok |

## The situations (seed 2026, each on its day)

| Situation | Day | Present | Effect seen | Checks |
|---|---|---|---|---|
| review | 2026-10-16 | 176 | review; crits 151, paper out 7, lift boarded 488, at the event 19:00 33, mean leave 22:12 | ok |
| pinup | 2026-10-09 | 176 | pinup; crits 162, paper out 64, lift boarded 529, at the event 19:00 16, mean leave 21:56 | ok |
| lastcrit | 2026-10-13 | 176 | lastcrit; crits 159, paper out 0, lift boarded 493, at the event 19:00 0, mean leave 21:13 | ok |
| good_times | 2026-10-23 | 176 | good_times; crits 158, paper out 0, lift boarded 514, at the event 19:00 60, mean leave 20:52 | ok |
| waffle | 2026-10-14 | 120 | waffle; crits 0, paper out 0, lift boarded 415, at the event 19:00 0, mean leave 20:48 | ok |
| deadline | 2026-10-19 | 124 | deadline; crits 0, paper out 0, lift boarded 428, at the event 19:00 0, mean leave 20:02 | ok |
| paper | 2026-10-15 | 145 | paper; crits 42, paper out 42, lift boarded 523, at the event 19:00 0, mean leave 21:33 | ok |
| lift | 2026-10-13 | 176 | lift; crits 159, paper out 0, lift boarded 0, at the event 19:00 0, mean leave 21:13 | ok |
| cohort | 2026-10-13 | 191 | cohort; crits 173, paper out 0, lift boarded 694, at the event 19:00 0, mean leave 21:12 | ok |
| clash | 2026-10-30 | 176 | clash; crits 164, paper out 0, lift boarded 528, at the event 19:00 21, mean leave 00:11 | ok |
| weekend | 2026-10-13 | 130 | a weekend-like day; crits 113, paper out 0, lift boarded 305, at the event 19:00 0, mean leave 20:16 | ok |

## The policies

| Run | Plot jobs | Outages | F8 | Checks |
|---|---|---|---|---|
| 2026-10-15 paper at all hours | 104 | 0 | 4.53 | ok |
| 2026-10-13 shop closed | 17 | 0 | 0.12 | ok |

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
