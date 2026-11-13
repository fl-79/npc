# Agent-dependent variables: personality, habits and circumstances

Started 2026-11-05. Updated with each checklist category.

This note collects every variable that **differs from one agent to another**, as opposed to site-level settings, which are the same for everyone (timetable, building hours, plotter count). These per-agent variables are what the simulation samples when it creates an agent, and what changes as an agent lives through the term.

Each row gives:
- the distribution or range
- what drives it: personality, persona, circumstance or experience
- its source
- links to the checklist item and the [input registry](input-registry.md) ID

[A] marks an assumed value.

## How an agent is built (layers)

```
Personality (Big Five, sampled)        ┐
Circumstances (sampled from site       ├─► Habits & social traits ─► Dynamic states
  population data, Category A)         │      (parameters)             (change over time)
Other sampled variables (background,   │
  chronotype, keenness, making skill)  ┘

Superseded (2026-11-07): the persona layer between circumstances and habits was removed (traits only, user decision; personality-model.md §5).
```

- **Personality** is sampled first. Since 2026-11-07 there are **no personas as inputs**: traits, circumstances and the other sampled variables map directly to the habits (see "Traits-only mappings" at the end). Where a row below still says "persona", read that table.
- **Circumstances** (job, commute, caregiving, year, newcomer status) add hard constraints.
- **Habits and social traits** are computed from personality, circumstances and the other sampled variables.
- **States** start from the traits and change during the run.

Grounding for personality: Big Five taxonomy (John & Srivastava 1999). Conscientiousness is one of the strongest correlates of (low) procrastination (Steel 2007).

---

## 1. Personality core (sampled per agent)

> **Decided 2026-11-05:**
> - **Big Five** traits, sampled per agent.
> - **Whole Trait Theory** momentary states (trait + situation + noise) drive behaviour each tick.
> - **MBTI** type is derived from the traits, for display only.
>
> Details, references and weights are in [personality-model.md](personality-model.md). The module stays swappable.

| Variable | Distribution | Drives | Source |
|---|---|---|---|
| Extraversion **E** | N(μ, 1), correlated; women +0.10 | sociability, event attendance, help-seeking ease, headphone use (−) | Big Five |
| Conscientiousness **C** | N(μ, 1), correlated; design cohort −0.25 | impulsiveness Γ (−), planning, sleep regularity | Big Five; Steel 2007 |
| Openness **O** | N(μ, 1), correlated; design cohort +0.50 | curiosity about others' work, reframing after setbacks (Schön) | Big Five |
| Neuroticism **N** | N(μ, 1), correlated; women +0.40 | stress sensitivity, perceived threat, perceived competition, crit impact | Big Five; Festinger 1954 |
| Agreeableness **A** | N(μ, 1), correlated; women +0.35 | willingness to help, guarded vs sharing behaviour | Big Five |

Population model (2026-11-07): the five traits are drawn together from a multivariate normal in general-population SD units, with a correlation matrix from the IPIP-NEO open data (Canada, 22–32; placeholder correlations until computed), a field shift for design students (Feist 1998; Vedel 2016) and a per-agent sex shift (Schmitt 2008; Weisberg 2011). Parameters calibrated to a cohort target are re-centred on the cohort means. A cohort survey (BFI-2-S or IPIP-NEO-120) replaces these when done. Details and sources: personality-model.md §2 and assumption-data-sources.md, Category I.

## 2. Circumstances (sampled from site data; Category A)

| Variable | Distribution | Effect | Checklist / registry |
|---|---|---|---|
| Year level | Y1 45 / Y2 60 / Y3 60 | schedule (TM14), comfort start, mentor role | A3; PO2 |
| Advanced-standing newcomer (Y2) | about 15 of 60 Y2 | low starting comfort, few ties | A3; OR7 |
| Section and desk | 4 (or 3) sections of 15 per year | desk neighbours, instructor | A4, D1; OR1, AT9 |
| Gender | 58 F / 41 M / 1 NB | narrative only, unless used in rules; night-safety subjective S25 | A9; PO5 |
| International | 15% | belonging (S15), away from family | A10; PO6 |
| Outside paid work | 35% none, 20% 1–9 h, 35% 10–20 h, 10% > 20 h | fixed shift windows; no all-nighter on shift nights | A11; PO10, AT8 |
| Home location / commute | 90% off campus; 60% transit / 25% car / 15% walk-bike; 30–60 min | arrival time, last-transit departure, online-meeting preference | A12; PO11, PL7 |
| Caregiving | 5% | hard departure time | A13; PO12 |
| Prior design background | 29% little or none, 46% design, 26% advanced placement | starting skills, confidence | A14; PO9 |
| Mentor program | 50% of Y1 matched with a Y3 [A] | starting tie, extra help source | F5; OR9 |
| TA role | some Y2–3 students [A] | contact with lower years | A6; OR5 |

## 3. Work habits

| Variable | Distribution / rule | Driven by | Source | Checklist / registry |
|---|---|---|---|---|
| Baseline weekly hours in the building **H_base** | about 25–60 h, median 40 | C, keenness, job, commute, caregiving (traits-only mapping) | Model 1 (TMT calibration) | E1; AT13 |
| Impulsiveness **Γ** | 0.3 × exp(−0.6C + 0.1N), about 0.1–0.9 | C (−), N (+) | Steel 2007 | E12; AT11 |
| Task value weights (studio : other) | 2 × exp(0.2 keenness) : 1, about 1.5–3 | keenness | [A] | E8; AT12 |
| Chronotype | 25% morning / 55% intermediate / 20% evening | sampled | MEQ student samples | E3; AT10 |
| Late-worker habit | evening chronotype, about 25% | chronotype (shifted by C −, E +) | Tsaousis 2010 | E3 |
| Sleep need | N(7.2, 0.6) h | sampled | Van Dongen 2004 | E5; AT14 |
| Sleep floor | U(4.0, 5.5) h | sampled; lower for Devotees | Van Dongen 2004 | E5; AT14 |
| All-nighter odds ratio | exp(−0.4C + 0.3N + 0.2 keenness), about 0.3–2.5; 0 on shift nights | C (−), N (+), keenness, job | Hurdle model [A] | E4; BH21 |
| Arrival lateness to studio | lognormal, median 5 min | C (−), commute | [A] | B3; TM17 |
| Leave right after own crit **p_imm** | 0.15 baseline | job, commute, persona | Hazard model [A] | B3; BH13 |
| Departure hazard ratio | 0.5–1.8 | persona, instructor strictness | Cox model [A] | B3; BH15 |
| Weekend propensity | 0.15 → 0.6 near reviews | persona, urgency | [A] | E6; BH20 |
| Off-site work share and place | 25%: home 70 / library 25 / café 5 | home suitability (S32), commute | [A] | E9; AC6 |
| Work / break rhythm | gamma bouts, mean 52 / 17 min | C, N | DeskTime (weak) | E11; AC7 |
| Headphone propensity while focusing | 0.6 baseline; introvert +0.2; mentor −0.2 | E (−), N (+) | Office surveys | D16; BH16 |
| Medium preference (digital vs physical) | 55 / 30 / 15 split; physical share × exp(0.3 making skill) | making skill, prior background | [A] | E7; AC3 |
| Meal habit | kitchen / desk / delivery / food run | — | [A] (E10 open) | E10; AC8 |
| Response to a failed resource (wait / elsewhere / change output) | probabilities | persona, urgency | [A] | D10; BH17 |

## 4. Social traits and habits (Category F)

| Variable | Distribution / rule | Driven by | Source | Checklist / registry |
|---|---|---|---|---|
| Sociability | E mapped to 0.3–1.7 | E | Big Five | F3; SO2 |
| Peer-exchange rate | 4/day × sociability × comfort | sociability, comfort | [A] | F3; SO2 |
| Curiosity about others' work | from O and motivation | O, ST3 | Big Five | F6; SO5, BH24 |
| Perceived competition | c₀ × (1 − confidence) × (1 − comfort) × (1 + N) | N, states | Festinger 1954 | F1; ST10 |
| Help-seeking threshold and perceived threat | f(N, 1 − comfort) | N, comfort | Edmondson 1999; Karabenick 2003 | F2; AT6, BH9 |
| Help ladder | friend (if easy) → TA → instructor (+ mentor) | ties, availability | user-confirmed | F2; BH9 |
| Channel preference (online vs in person) | task ambiguity, commute, evening | commute, E | Daft & Lengel 1986 | F4; BH22 |
| Event attendance | Good Times 0.35 / Waffle Wed 0.4 / Halloween 0.5 × sociability | E, urgency | [A] | F9; BH23 |
| Sleep-loss disclosure (commiseration) | P = 0.5 when sleep debt > 2 h | A, E | Battisto; Festinger 1954 | F7; SO6 |
| Susceptibility to the hours norm | 0.1 weight in a supportive cohort | N, persona | [A] | F7; BH4 |
| Willingness to share and help | from A; low for Guarded Competitor | A, persona | AIAS 2002 | C9, F1 |
| Crit sign-up eagerness | early arrivers sign up first | C, job, persona | C3 queue | C3; EV4 |

## 4b. Money and well-being habits (Categories G–H)

| Variable | Distribution / rule | Driven by | Source | Checklist / registry |
|---|---|---|---|---|
| Term spend on models and printing | lognormal, median $700 (10th–90th percentile $450–1,200) | persona (Maker high, CAD low), section requirements | SALA fees page; US anecdotes | G1–G2; EC1–EC2 |
| Personal budget | lower for working students and international students [A] | circumstances | CGPSS (finances a major obstacle for 35%) | G1; EC5 |
| Cost-saving propensity (fewer reprints, cheaper materials) | rises when spend exceeds budget | budget, C | [A] | G1; EC5 |
| Formal support-seeking | 0.1 per week under sustained high stress | N (+), comfort, stigma (S41) | Battisto treatment gap | H2; EC6 |
| Sensitivity to instructor push | multiplies p_push | C, N, persona (Grade Optimiser high) | [A] | H3; EC7 |

## 4c. Body, cognition and availability (from [agent-architecture.md](agent-architecture.md))

| Variable | Distribution / rule | Driven by | Source | Registry |
|---|---|---|---|---|
| Role and action set | student (Y1–3, ± TA / mentor), instructor, visiting critic, shop tech, plotter tech | Category A, C, D | IndoorWorld 2025 | AT16 |
| Need drain rates | hunger 4–6 h; thirst 1.5–2 h; washroom 2.5–4 h (± 20%, faster with coffee) | personal variation [A] | EFSA 2010; Haylen 2010 | AT19 |
| Mental-fatigue rate | about 0.15/h of focus; restored by breaks and views | N (+), noise, interruptions | Warm 2008; Kaplan 1995 | ST14 |
| Physical-fatigue rate | about 0.2/h of standing or making | persona (Maker high) | [A] | ST15 |
| Mood baseline and reactivity | valence/arousal; reactivity × exp(0.5N) | N, E | — | ST16 |
| Place familiarity start | low for Y1 and advanced-standing newcomers; high for Y2–3 | year, newcomer status | — | ST17 |
| Knowledge (4 kinds) | domain, project, place, who-knows-what | background, experience, conversations | Wegner 1987 | AT17 |
| Strengths | top 1–2 skills relative to cohort | skills | — | AT18 |
| Memory importance weighting | negative events × exp(0.3N); social × exp(0.2E) | N, E | GA23 + [A] | AT20 |
| Reflection frequency | threshold 150 × exp(−0.2·O) | O | GA23 + [A] | BH27 |
| Approach threshold | higher for high A and high N, low comfort; lower for high E | personality, comfort | Backhouse & Drew; Fogarty 2005 | BH30 |
| Interrupt acceptance | σ(relationship + importance − focus − stress + E state) | states, ties, groupmate | Mark 2008 + [A] | BH30 |
| Commitment to current task | +20% utility for about 25 min; scales with C [A] | C | IndoorWorld 2025 | BH25 |

## 5. Skills (0–1, per agent)

| Skill | Starting value | Changes with | Source |
|---|---|---|---|
| Concept / framing | by background (A14) + year | crits, reframing events | Schön; culture summary |
| Hand drawing / diagramming | by background | practice | — |
| Digital modelling / layout | by background; high for the CAD variant | practice | — |
| Physical making | by background; high for Maker | shop time | — |
| Presentation | E (+), N (−) | reviews | — |
| Time estimation | C (+); low for Year 1 | experience | Battisto ("hard to foresee") |
| Peer critique | year level, Mentor persona | giving crits | — |

## 6. Dynamic states (start from traits, change during the run)

| State | Start | Rises with | Falls with | Registry |
|---|---|---|---|---|
| Sleep pressure / sleep debt | 0 | time awake, restricted sleep | sleep; recovery nights | ST1 |
| Stress | by N | deadlines, competing commitments, harsh crits, resource failures | events, recovery, support | ST2 |
| Intrinsic motivation | by persona | progress, autonomy, good crits | harsh crits, overload | ST3 |
| Confidence | by background | good crits, progress | bad crits, comparison | ST4 |
| Task progress | 0 per deliverable | work time × skill × productivity | — | ST5 |
| Social need | by E | time alone | interaction | ST6 |
| Comfort in the space | Y2–3: 0.6; Y1 and newcomers: 0.3 (× exp(0.3E − 0.3N)) | hours on the floor, ties | (slow decay if absent) | ST9 |
| **Personality states** (E, C, O, N, A at this moment) | = traits | friends nearby, events, comfort | harsh crit, urgency, sleep debt (see personality-model §2b) | AT15 |
| MBTI type (display) | from traits; optional "current mode" from states | — | — | AT15 |
| Tie strength per pair | 0; mentor 0.3 | encounters, events, commiseration | time without contact | ST8 |
| Perceived competition | computed | low confidence, low comfort | comfort, ties | ST10 |

---

## Traits-only mappings (replaces the persona table; decided 2026-11-07)

Every parameter the persona table set is now computed from the Big Five (SD units), circumstances and four sampled variables. All weights are [A] in log-linear form (personality-model.md §2) and go into the sensitivity screening.

| Sampled variable (non-Big-Five) | Distribution | Source |
|---|---|---|
| Prior design background | 29% little / 46% design / 26% advanced | A14 (APR24) |
| Chronotype | evening 25% / morning 20% / intermediate 55%, drawn with P(evening) × exp(0.2E − 0.3C) | E3 references; Tsaousis 2010 |
| Keenness (baseline intrinsic motivation, ST3) | N(0, 1), correlated +0.3 with O | [A]; Amabile |
| Making skill | skill vector §5; higher with a design background | [A] |
| Perfectionism (optional add-on) | N(0, 1), correlated with C and N | Hewitt & Flett 1991; off by default |

| Parameter (ID) | Was set by persona | Now |
|---|---|---|
| H_base (AT13) | 20–65 h by persona | 48 h × exp(0.25C + 0.15 keenness) × job factor (none 1.0; 1–9 h 0.9; 10–20 h 0.8; >20 h 0.6) × caregiving 0.8 × commute >45 min 0.9, clipped to 15–70 h. Checked with 200k draws: p10/50/90 = 25/39/60 h, 23% above 50 h |
| Γ impulsiveness (AT11) | 0.1–0.6 | 0.3 × exp(−0.6C + 0.1N) |
| Value weight studio : other (AT12) | 1.5–3 | 2 × exp(0.2 keenness) |
| Late worker (E3) | evening type or Devotee | evening chronotype only |
| All-nighter OR (BH21) | 0.3–2.5 | exp(−0.4C + 0.3N + 0.2 keenness), centred on 1 (p10/90 = 0.5/2.0); 0 on shift nights. p_event re-calibrated to final 0.32, midterm 0.13, pin-up 0.02 so the population shares stay at about 33% / 14% / 2% (200k draws) |
| Sleep floor (AT14) | low for Devotee | U(4.0, 5.5) × exp(−0.1 keenness) |
| Headphone propensity (BH16) | 0.3–0.8 | 0.6 × exp(−0.4E + 0.2N) (already in §3b) |
| Help-seeking threshold (AT6) | persona-specific | threat × exp(0.4N − 0.3E), lower with comfort (§3a) |
| Time-norm (AT7) | persona | H_base spread over the agent's available days |
| Departure hazard ratio (BH15) | 0.5–1.8 | exp(0.3C − 0.2 keenness) × job/commute constraints |
| Leave right after own crit p_imm (BH13) | persona | 0.15 × exp(0.3C) × job/commute |
| Weekend propensity (BH20) | persona | baseline × exp(0.3 keenness), scaled by urgency |
| Medium preference (AC3) | Maker more physical | physical share × exp(0.3 making skill) |
| Response to a failed resource (BH17) | persona | by Γ and urgency: high Γ waits, low Γ goes elsewhere or changes output |
| Willingness to share / help | low for Guarded Competitor | exp(0.3A + 0.2E) and exp(0.4A) (§3a) |
| Mentor / TA role | Collaborator persona | Year 3 (or Year 2 TA) with P × exp(0.4A + 0.2E) |
| Crit sign-up eagerness (EV4) | persona | arrival time from C and chronotype |
| Susceptibility to the hours norm (BH4) | persona | exp(0.3N) |
| Sensitivity to instructor push (EC7) | Grade Optimiser high | exp(0.3C + 0.3N) (§3b) |
| Term spend (EC5) | Maker high, CAD low | median × exp(0.3 making skill) |
| Physical-fatigue rate (ST15) | Maker high | × exp(0.3 making skill) |
| Intrinsic motivation ST3 start | by persona | keenness |

## Persona biases (superseded 2026-11-07; kept for the record)

The table below was the default before the traits-only decision. It is no longer used as an input.

| Persona | E | C | O | N | A | H_base | Γ | All-nighter OR | Headphones | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 Studio Devotee | +0.3 | 0 | +0.2 | +0.2 | 0 | 50–65 | 0.3 | 2.5 | 0.6 | late worker; low sleep floor |
| S2 Balanced Planner | 0 | +0.8 | 0 | −0.3 | +0.2 | 30–40 | 0.1 | 0.3 | 0.5 | leaves early; early sign-up |
| S3 Struggling Novice | −0.2 | −0.3 | 0 | +0.5 | 0 | 35–45 | 0.6 | 1.8 | 0.6 | mostly Y1; low comfort start |
| S4 Grade Optimiser | 0 | +0.5 | −0.3 | +0.2 | 0 | 35–45 | 0.2 | 1.0 | 0.6 | seeks crits often |
| S5 Guarded Competitor | −0.2 | +0.2 | +0.2 | +0.3 | −0.6 | 40–50 | 0.3 | 1.5 | 0.8 | low sharing; harsh peer feedback |
| S6 Collaborator / Mentor | +0.8 | +0.2 | +0.3 | −0.3 | +0.6 | 35–45 | 0.3 | 1.0 | 0.4 | often Y3; mentor / TA |
| S7 Working / Commuter | 0 | +0.3 | 0 | +0.2 | 0 | 20–30 | 0.4 | 1.2 (0 on shift nights) | 0.6 | fixed windows; online meetings |
| S8 Maker / Digital | −0.2 | 0 | +0.5 | 0 | 0 | 40–50 | 0.4 | 1.3 | 0.6 (CAD) / 0.3 (Maker) | shop trips (Maker) or low visibility (CAD) |

All shifts are [A]. They are in standard-deviation units for the Big Five columns. Population shares are in checklist I.

## Added per checklist category

| Category | Agent variables added |
|---|---|
| A | year, newcomer status, section, gender, international, job, commute, caregiving, background |
| B | arrival lateness, p_imm, departure hazard ratio |
| C | crit sign-up eagerness (through arrival) |
| D | headphone propensity, response to failed resources, off-site trips |
| E | H_base, Γ, value weights, chronotype, sleep need and floor, all-nighter OR, weekend propensity, break rhythm, medium preference |
| F | sociability, curiosity, perceived competition, help threshold, channel preference, event attendance, disclosure, comfort (state), Big Five core |
| G–H | term spend, personal budget, cost-saving propensity, support-seeking, sensitivity to instructor push |
| I | closed 2026-11-07: no persona mix; traits-only mappings table above replaces the persona biases |

## Voice, office hours and instructor fields (added 2026-11-08)

The owner heard the same voice in every feed remark and asked that the heterogeneity be expressed. The remark layer (`viewer/src/sim/remarks.js`) now draws each agent's **register** from the trait z-scores it was sampled with:

| Trait | z > +0.7 | z < −0.7 | What it does to a line |
|---|---|---|---|
| E | chatty | terse | chatty: own lines, openers ("Okay so."), tails, talks 1.3×; terse: one-sentence lines, talks 0.6× |
| N | anxious | calm | anxious: worry tails ("Behind already."), own lines on queues, crits, interruptions; calm: "Fine. It is what it is." |
| A | warm | blunt | warm: "Fair enough. Happy to help."; blunt: "Whatever. Who designed this." |
| C | precise | loose | precise: clock times and minutes; loose: lower case, no full stop |
| O | vivid | — | observations about light, the floor, other people's drawings |

Registers stack (strongest first, at most three); one colouring per line; a year flavour (first years still finding things, third years weary) at a low rate; newcomers and evening types have lines of their own; instructors speak as instructors. The register label shows after the name in the FEED and in the AGENT window (AT16). It is presentation, not behaviour: no number in the run depends on it.

**Office-hours propensity** (Q10): P(visit per week) = 0.15 × exp(0.4 keenness − 0.3 N + 0.2 C) [A], only when the section's instructor has an office in this building and is in that day.

**Instructor fields** (Q2, Q6): `sessional` (60% [D*] from the APR's adjunct list, 2026-11-11; no office, present for the session only), `officeHere` (75% of the permanent [D] from the faculty profiles; an office desk on Level 2 first, then 4, then 3), `critMode` (desk / spot, 50/50 [A]; the place of the section's crits, with a crowding switch), plus the existing `style` (C12).

## Stress and the weekend before a review (rebuilt 2026-11-11)

Stress rule rebuilt: each day stress relaxes 15% toward a personal baseline (0.40 + 0.15 x N); the rise before a review comes from the days to that year's next review (zero two weeks out, full on the day) scaled by exp(0.5 N) with weight 0.03; the other courses' deadlines add a little through the urgency sum (0.002); sleep debt and a bad crit add as before; the constant daily push of 0.015 is gone. Probed over five seeds (test/_stress.mjs): about 18% high in a normal week (band 15-24%), 42% the week before the midterm, 36% in the review week, 43% the week before the final; the low-N third is never high, the high-N third almost always. Owner 2026-11-11: a normal week depends on personality; 55% before reviews is near the target, bring it down.

Owner 2026-11-11 (item 32): before a final the stress is heightened, late nights and all-nighters are likelier, and the organised print early for fear of the plotter failing. Engine: within seven days of a review a weekend day is a working day (presence 0.7 x ramp, a full day rather than 0.8 of one, arrivals from 10:00, late workers to 23:00-02:00, the all-nighter hurdle on the eve); each student's print day is 1 + 2 x C days before the review (C = 0 the day before, C = +1 three days before, at most six), a missed day caught up on the next day in, 30% reprint on the eve, with a 'print_early' remark. Saturday 2026-12-05 (seed 2026): 133 of 165 students in, 6 on the floor at 10:00, 81 at 14:00, 63 at 20:00, 21 at midnight, 8 print jobs. Numbers [A]; the 81% presence is the one to check.

## Late nights (rebuilt 2026-11-12, item 28)

Owner 2026-11-12 (item 28, walkthrough stop 1): on an ordinary Tuesday with no deadline coming up there would not be that many night owls in studio; they prefer to work from home. The other headcounts seem fine. Found: the late-worker rule keyed on urgency > 1.3, which every student exceeds whenever any deadline is within a couple of weeks, so all 39 late workers stayed to 22:30-01:00 most nights; and the default day 2026-10-13 is three days before the midterm, not a plain week. Engine (`term.js`, `parameters.effort.late_nights` [A]): within 7 days of a review a late worker stays late every night; otherwise only with p 0.25, and everyone else leaves by 19:00-20:30 (E3: others leave by 18:00-20:00 outside crunch), the rest of the planned hours at home (E9). Plain Tuesday 2026-11-03 (seed 2026): planned in past 22:00 41 -> 10, past midnight 16 -> 2; the day run has 51 on the floor at 19:00, 16 at 20:00, 10 at 22:00, 2 at midnight. The midterm-week Tuesday 2026-10-13 is unchanged (case 1 bit-identical).

## Events and Fridays (rebuilt 2026-11-12, stop 5)

Owner 2026-11-12 (walkthrough stop 5): Good Times should not be that full (95 at the event); people may grab something and leave quickly; on Fridays people are less likely to stay to the end of studio once their desk crit is done, and with other plans they leave earlier. Found: the Good Times situation added half of everyone present for 150 minutes on top of the calendar's own Friday rule (the plain Friday already had 73 attenders, peak 53). Engine: the situation adds nothing on a day that has the event and uses the plan's own rule on any other day; a grab-and-go share of attenders (`social.events.good_times.grab_share` 0.4, 10-20 min; waffle 0.6, 8-15 min) and the rest 40 to 100% of the event, the plan's leave extended only to the end of the stay; on a Friday, `effort.friday.plans_p` 0.4 of students leave 20-60 min after their desk crit ends and skip the evening (remark `friday_plans`). All [A]. Friday 2026-10-23 (seed 2026): 57 attend over the evening, 30 of them a quick grab, 27 at the event at the peak, 15 at 19:00; 25 leave early after their crit; the floor 112 at 18:00 and 35 at 20:00. Q11's 50-60 at Good Times reads as the number who come through, not the number in the room at once; to confirm. Owner, same stop: the 50-60 are the number who come through, at the start of Good Times; arrivals now fall within 25 minutes of the start (`arrive_within_min`), giving 57 through the evening and 33 in the room at the peak.

## The lift against the stairs (2026-11-12, stop 8)

Owner 2026-11-12 (walkthrough stop 8): unless tired or with a mobility need, it is unlikely anyone takes the lift for one floor to the washroom; carrying a model is different. Engine (`engine.travelTo`, `parameters.walking` [A]): one floor is the stairs with a 5% exception, the lift with p 0.7 when the trip is to or from the plotters, the printers, the 3D printer, the shop, a review or a pin-up (a load), p 0.5 after 22:00 or with a sleep debt of 9 h or more (the median student carries 6 to 7 h in a review week, so the threshold had to sit above it), and always with a mobility need; two floors or more keep 70% lift. `population.mobility_need_share` 0.03 is a PLACEHOLDER with no data, drawn on its own random stream so the population is unchanged. Tuesday 2026-10-13 (seed 2026): one-floor trips 999 by the stairs and 56 by the lift for no reason, 38 with a need, 7 with a load, 60 of 112 tired; two-floor trips (the lectures on Level 1) 455 lift, 281 stairs; lift boarded 610 -> 580. `stats.liftChoice` keeps the count by reason. The washroom line no longer says 'if the lift comes'.

