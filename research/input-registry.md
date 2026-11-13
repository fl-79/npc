# Input registry: generalized simulation inputs

This note lists every input the simulation uses and gives each one a **site-independent name and category**. The same list can then be filled in for any building and occupant group: an architecture studio, an office, a research lab, a library or a makerspace.

## How the notes relate

| Note | Role | Specific to |
|---|---|---|
| **input-registry.md** (this note) | The generic schema: what inputs exist, their type, unit and category | Nothing. Reusable |
| [studio-culture-school-checklist.md](studio-culture-school-checklist.md) | The **instance**: values for one site (UBC SALA M.Arch, 3rd floor) | One site |
| [assumption-data-sources.md](assumption-data-sources.md) | **Provenance**: the source behind each instance value | One site |
| [summary-studio-culture.md](summary-studio-culture.md) | **Domain knowledge**: personas and behaviour rules for one occupant culture | One occupant type (architecture students) |
| [summary-metrics.md](summary-metrics.md) | **Outputs**: metrics, mostly generic | Generic |
| [subjective-components.md](subjective-components.md) | **Judgment**: what data can't carry, and how the user includes it (status S) | Mostly generic; examples are studio-specific |
| [methodology-log.md](methodology-log.md) | **Process record**: dated steps and decisions | One case study |
| [agent-variables.md](agent-variables.md) | **Per-agent variables**: personality, circumstances, habits, social traits, skills, states | Reusable structure |
| [README.md](README.md) | Table of contents for all notes | — |
| [agent-architecture.md](agent-architecture.md) | **How an agent works**: profile, needs and states, cognition (memory, reflection, planning), arbiter, availability, perception | Reusable |
| [personality-model.md](personality-model.md) | **Personality module**: Big Five + Whole Trait states + MBTI display | Reusable |

For a new site, copy the checklist, keep this registry, and fill in the values. Only the domain-knowledge note (personas and culture) needs fresh research.

## Status codes, used for every input in every instance

| Code | Meaning |
|---|---|
| **C** | Confirmed by the user or client from first-hand knowledge |
| **D** | Taken from data; source logged in the provenance note |
| **D*** | From data, but adjusted (the reason is logged) |
| **A** | Assumed: placeholder or modeller judgment |
| **O** | Observed on site, e.g. from a counting session |
| **S** | Subjective: set by the user's judgment, not by data. See [subjective-components.md](subjective-components.md) |

**Naming rule.** The generic input name must not depend on the school, the program or academia. Domain-specific names (credits, desk crit, studio) belong in the examples column only.
- **TM** (time and schedule), **EV** (events and evaluations), **SP** (space and geometry), **RS** (resources and amenities), **PL** (policies and access), **AC** (activities and tasks), **SO** (social structure) and **EC** (economic and external) are already converted to the "Generic input + Example names" format.
- The other tables are converted as their checklist category is confirmed.

## Input categories

| Code | Category | What it describes |
|---|---|---|
| **SP** | Space and geometry | The physical layout being studied, and its context |
| **PO** | Population | Who the occupants are and how many |
| **OR** | Organisation | How occupants are grouped and supervised |
| **TM** | Time and schedule | Calendars, timetables, cycles |
| **AC** | Activities and tasks | What occupants do, and the work they must produce |
| **EV** | Events and evaluations | Scheduled interactions with stakes (reviews, meetings) |
| **RS** | Resources and amenities | Shared equipment and facilities that attract people or form queues |
| **PL** | Policies and access | Rules about where and when people may be |
| **AT** | Agent traits | Fixed per-agent attributes, set at creation |
| **ST** | Agent states | Variables that change during the run |
| **BH** | Behaviour rules and parameters | How states and context become actions |
| **SO** | Social structure and culture | Group-level norms and network properties |
| **EC** | Economic / external constraints | Pressures from outside the building |

---

## SP: Space and geometry

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| SP1 | **Study zone** (analysed in detail, metrics computed) | floors / zones | studio floor · office floor · lab wing | 3rd floor (A1) |
| SP2 | **Context zones** (modelled for circulation and trips only) | floors / zones / buildings | other floors · lobby · off-site facilities | Floors B, 1, 2, 4; shop building; food; library (D17) |
| SP3 | **Floor-plan geometry** (walls, openings, doors, furniture) | BIM/CAD → grid / graph | Revit model · CAD plan | Revit model; layout from model (D4) |
| SP4 | **Vertical circulation** and capacity | location; persons/min | stairs, lifts **2026-11-12 (stop 8):** one floor by the stairs unless a load, tiredness or a mobility need (`walking.lift_one_floor`); two floors 70% lift [A] | From model |
| SP5 | **Entrances / exits** and their access control | location; card yes/no | card-access doors · reception | 24/7 card (D6) |
| SP6 | **Assigned workstation inventory**: count, size, grouping | n; m²; group | dedicated desk · assigned desk · bench **2026-11-08:** year zones hold 40/48/80 desks for 60/60/45; overflow to the nearest spare; four boxed-in desks reached through a gap rolled open (Q17, Q18) | 165 desks > 1 m wide, grouped by section (D1, D2, D5) |
| SP7 | **Workstation arrangement** | pattern + cluster size | rows · pods · benching | From model (D4) |
| SP8 | **Workstation enclosure** | partition height; door | open desk · cubicle | Open plan (D16) |
| SP9 | **Personal display surface** and which side it faces | m²; orientation | back-of-desk pin-up · personal whiteboard | Back of desk (D3) |
| SP10 | **Fixed shared display surfaces** | n; m²; location | pinnable felt walls · project walls | Felt hallways; rooms 301/309/202 (D3, APR) |
| SP11 | **Movable display / furniture objects** | n; who moves them | pin-up boards on casters · mobile whiteboards | Movable boards, about 1 per 4 students [A] (D3) |
| SP12 | **Bookable rooms**: count, capacity, equipment, who books, shared users | n; seats; booking rule | crit rooms · meeting rooms · seminar rooms **2026-11-08:** booked first come; room 30 included although unfurnished (Q16, Q19); the year lecture takes the smallest classroom that seats the year (Q8) **2026-11-11:** room 22 is the APR's 202 (capacity 60; 64 chairs placed); every chair in a class or crit room now counts (seat tiles), so the classrooms seat 64 / 84 / 96 / 96 and the crit rooms their full chair sets; the APR's room map is in QUESTIONS.md item 26 | Instructor-booked; shared with 1.5 h history seminars (D14) |
| SP13 | **Focus / quiet spaces** (on the floor, or off-site with travel time) | n; capacity; travel time | quiet room · phone booth · library | None on the floor; library 5 min walk (D15) |
| SP14 | **Social / food spaces** (on site) | n; location; hours | kitchen · break room · café | Student kitchen, 24/7 (D12) |
| SP15 | **Personal storage** | volume; type | under-desk locker · locker bank | Small under-desk locker (D2) |
| SP16 | **Acoustic model** (absorption, propagation) | dB per wall / surface | felt panels · ceiling tiles | Open plan; felt in some rooms and hallways (D16, APR) |
| SP17 | **Sight-line-blocking objects** | height | monitors · tall shelves · boards | Movable boards, models (from model) |
| SP18 | **Space shared across groups and levels** | rule | all years on one floor, grouped · neighbourhoods | All years share floor 3; sections grouped (D5) |

## PO: Population

| ID | Generic input | Type / unit | Studio instance | Other contexts |
|---|---|---|---|---|
| PO1 | Occupant type(s) simulated | list | M.Arch students (A1) | Employees, researchers, patrons |
| PO2 | **Occupant count per group level** | n | 45 / 60 / 60 by year (A3) | Headcount by department |
| PO3 | Supervisor / staff count and type | n; permanent vs contract | About 11 instructors (A8) **2026-11-08:** sessional vs permanent 50/50 [A]; an office in this building for half of the permanent [A]; crit mode desk / spot 50/50 [A] (Q2, Q6) **2026-11-11 (Q22):** sessional 0.6 [D*] (APR24: 7 adjunct names on the three fall studios against 11 sections); office in this building 0.75 [D] (9 of 12 faculty profiles with an office are in Lasserre), on Level 2 first | Managers, PIs, librarians |
| PO4 | Visitor population (non-resident: reviewers, guests) | n per day or event | C8 | Clients, visitors |
| PO5 | Gender distribution | % per category | 58/41/1 (A9) | Any |
| PO6 | International / newcomer-to-country share | % | 15% (A10) | Any |
| PO7 | Visible-minority / cultural-diversity share | % | about 30% (A10) | Any |
| PO8 | Age distribution | range or distribution | 23–30 (A14) | Any |
| PO9 | Prior experience / expertise distribution | % per level | 29% / 46% / 26% background (A14) | Seniority bands |
| PO10 | Share with outside paid work, and hours | % per band; h/wk | A11 | Second jobs |
| PO11 | Commute: home location share, mode split, commute time | %; min | A12 | Any |
| PO12 | Share with caregiving duties | % | 5% (A13) | Any |
| PO13 | Occupant types to exclude from detailed metrics | list | Accessory floors (A1) | — |

## OR: Organisation

| ID | Generic input | Type / unit | Studio instance | Other contexts |
|---|---|---|---|---|
| OR1 | **Primary group** (unit of supervision) and its size | name; n | Studio section, 15 (A4) | Team, lab group |
| OR2 | **Supervision ratio** | occupants per supervisor | 15:1 (A5) | Span of control |
| OR3 | Group hierarchy levels | ordered list | Year → section | Division → department → team |
| OR4 | Cross-level mixing (do groups mix across levels?) | yes/no; how | No vertical studios (A7) | Cross-functional teams |
| OR5 | Peer-support roles (seniors helping juniors) | role definition | Upper-year TAs (A6) | Mentors, buddies |
| OR6 | Group assignment method | rule | Option-studio lottery (A7) | Org chart |
| OR7 | Newcomer influx (joining an existing group mid-stream) | n; when | About 15 advanced-standing students into Year 2 (A3) | New hires |
| OR8 | **Work-unit size by phase** (team / pair / individual) | team size per phase; % | Site-analysis teams of 3–4, then pairs or individual (B13) | Project teams vs individual tasks |
| OR9 | **Mentoring pairs across levels** | coverage %; pairing rule | 3rd ↔ 1st-year volunteer mentors (F5) | Buddy / onboarding mentor |

## TM: Time and schedule

Generic names describe the *kind* of input. The domain-specific name used in each setting is in the **Example names** column.

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| TM1 | **Scheduled group time in home space**, per week, per group level | h/wk by group | studio hours · core hours · lab meeting time · library programme hours | Y2–3: 9 h; Y1: 13.5 h (B1) |
| TM2 | **Recurring timetable** (days and time blocks per group) | weekly pattern | studio Tue/Fri 13:30–18:00 · team days · shift roster · class timetable | B2 |
| TM3 | **Presence obligation during scheduled blocks** and how strictly it is enforced | required / optional; strictness 0–1 by supervisor | mandatory studio attendance · in-office days · lab shift | Required; strictness depends on the instructor (B3) |
| TM4 | **Whole-group instruction share and its location** | % of scheduled time; room | studio lecture in a classroom · all-hands · lab safety briefing | 45 min/wk in another room [A] (B4) **2026-11-11:** lecture in studio confirmed by APR24 (C); a 15 min section intro at the instructor's spot opens each session [D*] (Q23) |
| TM5 | **Competing scheduled commitments elsewhere** | n; h/wk | other courses · other projects or meetings · teaching duties **2026-11-08:** the seminar timetable is built per seed, first come, on non-studio weekdays clear of lunch (Q9) | 3 courses, 9 h/wk; 1 seminar course on site, 2 lecture courses off site [A] (B5, D14) |
| TM6 | **Workload allocation units** per commitment | units per commitment | credits · FTE % · project allocation % · billable hours | Studio 9 cr; others 3 cr each (B6) |
| TM7 | **Expected effort per allocation unit** (in-session + outside) | h per unit per week | credit-hour rule · contracted hours · expected weekly effort | 4 h/credit (school rule) vs 2.7–3 h (Senate) (B7) |
| TM8 | **Operating calendar**: period start and end, closures, breaks, exam or blackout periods | dates | term dates and holidays · fiscal calendar and statutory holidays · facility shutdowns | Fall 2026: Sep 8 – Dec 7; closures Sep 30, Oct 12, Nov 9–11; exams Dec 11–22 (B8) |
| TM9 | **Work-cycle structure**: number, length and dependency of work phases | phases; weeks; builds-on links | starter → midterm → final project · sprints · grant stages | 3 phases; the final builds on the midterm (B9) |
| TM10 | **Milestone / evaluation calendar** | dates | midterm and final reviews · release dates · board meetings | Oct 16 [A]; Dec 8–11 [A] (B10) |
| TM11 | **Cadence of competing commitments** (period, offset, minor recurring tasks) | period; due day; minor-task frequency | monthly assignments + weekly readings · month-end reporting · weekly status reports | about monthly, end of month; weekly readings (B11) |
| TM12 | **Deadline clustering**: concurrent milestones across commitments | count per week | review week + other course due dates · quarter-end crunch | late Oct, late Nov – early Dec (B11) |
| TM13 | **Intensive events** (short and high-intensity) | length; team size | charrette · hackathon · sprint week | None (B12) |
| TM14 | **Group-level schedule variation** (different timetables by level) | per group | Year 1 vs Years 2–3 · department-specific days | Y1 has an extra Thursday (B1) |
| TM15 | **Daily arrival and departure distributions** (outside scheduled blocks) | time distributions | badge-in / badge-out data · occupancy counts | E3; TSR24 peaks 9–10 am / 4–5 pm |
| TM16 | **Within-session departure model**: leaving early relative to scheduled end | hazard model; p_immediate; hazard ratios | trickling out of studio · leaving meetings early · leaving a library before closing | Weibull hazard after the crit; hard constraint: not before own crit (B3) |
| TM17 | **Within-session arrival lateness** | distribution | late to studio · late to meetings | lognormal, median 5 min [A] |
| TM18 | **Weekend and after-hours occupancy** | % of weekday | weekend studio use · overtime | E6 |

## AC: Activities and tasks

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| AC1 | **Activity types** | list | design/focus, making, digital, discussion, crit, break, move · focus, meet, call · bench work | Studio list (E7) |
| AC2 | **Activity time budget** | % per activity | studio vs other courses · Gensler work modes (40% alone) | Studio crowds out others; V weight (E8) |
| AC3 | **Work medium split** and **required deliverable format** | %; format | printed boards + physical model · slides · prototypes · reports | 55% digital / 30% physical / 15% print + pin [A]; printed + physical required (E7) |
| AC4 | **Task process stages** | stages | design phases · Amabile stages · workflow stages | B9 phases |
| AC5 | **Deliverables per period** | n; type | B9 | 3 project phases |
| AC6 | **Off-site work share and location mix** (with closing times and cost barriers) | %; location shares | home / library / café · remote / hybrid | 25% off-site: home 70 / library 25 (closes about 22:00) / café 5 [A] (E9) |
| AC7 | **Work–break rhythm** | renewal process; bout and break distributions | work bouts and breaks · pomodoro | gamma(mean 52) / gamma(mean 17) min (E11) |
| AC8 | **Meal behaviour** | location and timing distribution | kitchen · desk · delivery · food run | Default kept; not answered (E10) |
| AC9 | **Weekly effort level by work style** | h/wk in study zone | hours in studio · in-office hours | Traits-only mapping, median about 40 h (E1; AT13) |

## EV: Events and evaluations

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| EV1 | **One-on-one feedback frequency**, per work unit per session | count per session | desk crit · 1:1 check-in · supervisor meeting · clinic consult | 1 per studio session per project group (C1) |
| EV2 | **Unit of feedback service** (individual or group) | individual / work unit | per project group · per team · per patient | Solo, pair or team = 1 group (C1) |
| EV3 | **One-on-one duration distribution** | distribution, min | crit length · meeting length · service time | 12 + LN(8, 0.72): median 20, 95th 38 min (C2) |
| EV4 | **Queue discipline for one-on-ones** | FCFS sign-up / circulate / priority / appointment | sign-up sheet · office-hours queue · ticket queue | FCFS sign-up, then followed in order (C3) |
| EV5 | **Coverage and overrun rule** (is everyone served? may the session overrun?) | all-served yes/no; overrun allowed yes/no | every group critted · every ticket closed | All served; overruns allowed (C4) |
| EV6 | **Presence lock until own one-on-one is done** | hard constraint yes/no | won't leave before own crit · waiting for an appointment | Yes (B3, C4) |
| EV7 | **One-on-one location rule** | place choice + conditions | at desk vs central table · supervisor office vs desk · consult room | Desk or central shared table, by instructor and crowding (C5) |
| EV8 | **Rehearsal / interim group sessions before major evaluations** | count before each major event; format; length | pin-up · internal presentation · dry run · design review | ≥2 before each guest review (C6) |
| EV9 | **Major evaluation event format**: panel size, presentation and discussion time per unit, audience | n panellists; min; audience | guest review / jury · client presentation · stage-gate review | 3 guests; 5 + 15 min (C7) |
| EV10 | **Panel composition** (internal vs external evaluators) | ratio by event | internal/external critics · client vs in-house reviewers | More external, especially at the final (C8) |
| EV11 | **Peer-feedback formality**, and the conditions that make it formal | informal / formal; triggers | peer crit · code review · lab-meeting critique | Informal; formal early in a project or in individual studios (C9) |
| EV12 | **Evaluation scheme** (scale; whether process counts) | scale; process weight | percentage grade · performance rating · go/no-go | Percentage; process folded into overall impression (C10) |
| EV13 | **Feedback-to-milestone lead time** | days | last desk crit → review · final check-in → launch | 3–4 days (session before the review) (C11) |
| EV14 | **Supervisor style distribution** | shares on a spectrum | critic ↔ facilitator (Gray 2022) · directive ↔ coaching | 1 critic, 2 mixed, 1 facilitator per year [A] (C12) |

## RS: Resources and amenities

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| RS1 | **Shared production facility**: location (on site / off site), opening hours, travel time | location; schedule; min | model shop · workshop · lab instruments · makerspace | Basement shop (hours from SALA) + main shop in another building, up to 20 min walk (D8) |
| RS2 | **Staff-gated equipment** (usable only when staff are present) with booked slots | slot length; staffed hours | laser cutter · CNC · specialist instrument | Laser in new shop, booked when a tech is present (D9) |
| RS3 | **Self-serve equipment open 24/7** | n; location | 3D printers · vending · self-checkout | 3D printers on the studio floor (D9; moved from the basement, owner 2026-11-06) |
| RS4 | **Shared output devices**: count, location, service time | n; min/job | plotters · printers · copiers | 2 self-serve plotters (D10) |
| RS5 | **Consumable stock per device**, and the **restock window** (who restocks, when) | units per load; staffed hours | plotter paper · toner · reagents · stock shelf | about 42 E-sheets per roll; student tech about 8 h/wk (D10) |
| RS6 | **Computing provision** (personal vs shared) | own / shared | laptops · desktop at device · lab PCs | Laptops; desktops run the plotters (D11) |
| RS7 | **Off-site food / amenity access**: hours and travel time | locations; hours; min | 24 h food nearby · cafeteria · delivery | Some 24 h on campus; food street at bus loop 15 min walk (D13) |
| RS8 | **Material supply** | on site yes/no | material store · stockroom | G4 |
| RS9 | **Amenity placement relative to routes** (magnets) | geometry | printer · kitchen · coffee point | From model (Hillier) |

## PL: Policies and access

| ID | Generic input | Type / unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| PL1 | **Building access hours and method** | schedule; card yes/no | 24/7 card access · business hours · badge | 24/7 card, all students (D6) |
| PL2 | **Overnight occupancy policy** | allowed / discouraged / banned | all-nighters allowed · night shift · lockout | Allowed (D7) |
| PL3 | **Workstation assignment policy** and its duration | dedicated / hot / shared; period | desk for the semester · hot-desking **2026-11-08:** movement levels everyday / agents rearrange / free: under the second the agents enact the design suggestions live, with veto, budget and connectivity limits (Q12) | Dedicated for the semester (D1) |
| PL4 | **Room booking authority** (who may book; priority between user groups) | rule | instructor-booked crit rooms · room-booking system | Instructors book; shared with history seminars (D14) |
| PL5 | **Written behaviour-norms policy** (and occupants' awareness of it) | exists; awareness % | studio culture policy · code of conduct | F8 |
| PL6 | **Noise norms and personal noise protection** | rule; prevalence | headphone culture · quiet zones · library rules | Noise-cancelling headphones common; P = 0.6 while focusing [D*] (D16) |
| PL7 | **External transport service hours** | time | last bus / SkyTrain | A12 |

## AT: Agent traits (fixed per agent)

| ID | Generic input | Type / unit | Notes |
|---|---|---|---|
| AT1 | Persona / archetype and its population share | category; % | **Not used since 2026-11-07** (traits only). Personas are a reporting vocabulary; see AT15 and agent-variables.md |
| AT2 | Demographics (PO5–PO12 drawn per agent) | attributes | Sampled from the PO distributions |
| AT3 | Skill vector | 0–1 per skill | Studio skills: concept, hand drawing, digital, making, presenting, time estimation, peer crit |
| AT4 | Expertise / domain | category | For weak-tie and complementarity metrics |
| AT5 | Introversion / noise sensitivity | 0–1 | Heerwagen; the anxious-presenter modifier |
| AT6 | Help-seeking threshold | 0–1 | Edmondson; from N, E and comfort (traits-only mapping) |
| AT7 | Time-norm (preferred hours) | h/day | From H_base (AT13) and available days |
| AT8 | Hard constraints (job shifts, childcare pickup, transit) | time windows | From PO10–PO12, PL7 |
| AT9 | Home workstation | location | From SP6 / PL3 |
| AT10 | **Chronotype** (morning / intermediate / evening) | category **2026-11-12:** late nights only within 7 days of a review (else p 0.25), others leave by 19:00-20:30 (item 28, `effort.late_nights`) | Student MEQ samples: evening 10–25%. Gives the about 25% "late workers" with Devotees (E3) |
| AT11 | **Impulsiveness / procrastination Γ** (TMT) | ≥ 0 | 0.3 × exp(−0.6C + 0.1N), about 0.1–0.9 [A] (E12) |
| AT12 | **Task value weights** (how each commitment is valued) | ratio | Studio : other courses 1.5–3 : 1 [A] (E8) |
| AT13 | **Baseline effort H_base** (work style) | h/wk | 48 h × exp(0.25C + 0.15 keenness) × circumstance factors, clipped 15–70 [A] (E1) |
| AT15 | **Personality module**: trait schema, population distribution, trait → parameter mapping weights, state layer, if–then rules, display type | trait vector (SD units); weight table | **Big Five + Whole Trait Theory states (C); MBTI derived for display (C)**; HEXACO optional upgrade. **Population (2026-11-07): MVN in general-population SD units; Σ from IPIP-NEO open data (D, to compute); field shift O +0.5 / C −0.25 (D*); sex shift per agent (D); cohort survey to replace (O, planned).** No personas. See personality-model.md §2. Swappable |
| AT16 | **Voice register** (how the agent's remarks read) and **office-hours propensity** | registers from trait z-scores; P per week | **Added 2026-11-08.** Terse / chatty from E, anxious / calm from N, warm / blunt from A, precise / loose from C, vivid from O (abs z > 0.7, strongest first), a year flavour, instructors' own lines (remarks.js). P(office visit per week) = 0.15 × exp(0.4 keenness − 0.3 N + 0.2 C) [A] | Any: the register makes heterogeneity legible in a feed |
| AT16 | **Role and its action set** (what each role may do, its capabilities) | role; action list | Student (Y1–3, +TA/mentor), instructor, visiting critic, shop tech, plotter tech (IndoorWorld 2025; agent-architecture §2) |
| AT17 | **Knowledge (4 kinds)**: domain, project, place, who-knows-what | vectors / memory | Wegner 1987 transactive memory; agent-architecture §2 |
| AT18 | **Strengths** (top skills relative to cohort) | skill IDs | Derived from AT3 |
| AT19 | **Need parameters** per agent (drain rates, critical thresholds) | rates | Hunger 4–6 h, thirst 1.5–2 h, washroom 2.5–4 h, fatigue rates [A] (agent-architecture §3a) |
| AT20 | **Memory parameters** (importance weighting by personality, reflection threshold) | weights; threshold | Generative Agents: decay 0.995/game-hour, threshold 150; N and E hooks [A] |
| AT14 | **Sleep need and sleep floor** (personal differences in tolerating sleep loss; Van Dongen 2004) | h | need N(7.2, 0.6); floor U(4.0, 5.5) (E5) |

## ST: Agent states (change over time)

| ID | Generic input | Range | Driven by |
|---|---|---|---|
| ST1 | Energy / sleep pressure (two-process model, Borbély 1982) | S(t) 0–1; sleep debt in h | Rises while awake, falls in sleep; circadian term shifted by chronotype (E3–E5) |
| ST2 | Stress | 0–1 **2026-11-11:** baseline 0.40 + 0.15 N, review nearness x 0.03 x exp(0.5 N), no constant drift (item 33) | Deadlines, workload, critique |
| ST3 | Intrinsic motivation | 0–1 | Feedback, autonomy, progress (Amabile) |
| ST4 | Confidence | 0–1 | Crit outcomes |
| ST5 | Task progress per deliverable | 0–1 | Work time × skill |
| ST6 | Social need | 0–1 | Time since last interaction |
| ST7 | Current activity and focus streak | category; min | Behaviour loop |
| ST8 | Relationship / tie strength per pair | 0–1 | Encounters (Kabo, Hillier), proximity (Festinger 1950), friends of friends (Kossinets & Watts 2006), events; online contact ×0.5 (F) |
| ST9 | **Comfort in the space** (familiarity) | 0–1 | Grows with hours on the floor and number of ties (Reis 2011); start value by cohort (F1, F3) |
| ST10 | **Perceived competition** | 0–1 | f(confidence, comfort, neuroticism) (F1) |
| ST11 | **Hunger / fullness** | 0–1 | Meals; urgency rises steeply past 60% depleted |
| ST12 | **Thirst** | 0–1 | Water / kitchen; EFSA 2010 daily intake |
| ST13 | **Washroom need** | 0–1 | Follows fluid and coffee intake; Haylen 2010 |
| ST14 | **Mental fatigue** | 0–1 | Time on task, interruptions, noise (Warm 2008); restored by breaks and views (Kaplan 1995) |
| ST15 | **Physical fatigue** | 0–1 | Standing, making, walking [A] |
| ST16 | **Mood** (valence, arousal) | −1…1; 0–1 | Crits, progress, events, needs, sleep |
| ST17 | **Place familiarity** per facility | 0–1 | Grows with visits; low for Y1 and newcomers |
| ST18 | **Availability** (signal-based, negotiable) | 0–1 | agent-architecture §6 |
| ST19 | **Memory stream and reflections** | records | Generative Agents 2023 |
| ST20 | **Current plan** (day → hour → 5–15 min) | plan tree | Generative Agents 2023; re-plan triggers (Humanoid Agents 2023) |

## BH: Behaviour rule parameters (generic; values set per instance in checklist J)

| ID | Generic input | Unit | Studio default (J) |
|---|---|---|---|
| BH1 | **Effort allocation across concurrent deadlines** (Temporal Motivation Theory, Steel 2007): U_i = E_i·V_i / (1 + Γ·D_i); daily hours = H_base · g(ΣU) | function + parameters | Replaces the fixed ×1.5 / ×2–3 multipliers; compounding emerges (E2, E12) |
| BH2 | Need-sacrifice order under pressure | ordered list | sleep → meals → exercise → hygiene → social |
| BH3 | Probability of missing a deliverable under stress | p | 0.1 (J8) |
| BH4 | Norm contagion weight (copying neighbours' hours) | 0–1 | assumed |
| BH5 | Overheard-supervision learning fraction | 0–1 | 0.2–0.3 (J2) |
| BH6 | Overhearing radius | m | 4 (J3) |
| BH7 | Recruitment range (availability while moving) | m | 8 (J4) |
| BH8 | Face-to-face detection rule | m; s | ≤10 m, 5 s gap (J10) |
| BH9 | **Help-seeking ladder and cost rule**: first source whose access + social cost is below threshold | ordered list; cost function | friend (if easy) → TA → instructor; mentor added for Y1 mentees; may not seek help at all (F2) |
| BH22 | **Channel choice** (in-person vs online) by task ambiguity, co-presence and commute (media richness, Daft & Lengel 1986) | rule | Routine → online; design discussion → in person if cheap (F4) |
| BH23 | **Event attendance** by sociability and urgency | P(attend) | Good Times 0.35×soc×(1−urgency); Waffle Wed 0.4×soc; Halloween 0.5×soc [A] (F9) |
| BH24 | **Browsing detour** to view displayed work, by curiosity | P per pass; min | Within 3 m of a pin-up; 1–3 min [A] (F6) |
| BH25 | **Arbiter** (task prioritization): constraints > critical needs > utility (task urgency, needs, social, recovery, opportunity) + commitment bonus | rule + weights | +20% for 25 min [A] (IndoorWorld 2025; agent-architecture §5) |
| BH26 | **Memory retrieval scoring** (recency + importance + relevance) | weights | Generative Agents 2023 |
| BH27 | **Reflection trigger** (summed importance threshold) | threshold | 150 (GA23); × exp(−0.2·O) [A] |
| BH28 | **Planning hierarchy and re-plan triggers** | levels; thresholds | Day → hour → 5–15 min; re-plan on needs, mood or events |
| BH29 | **Perception limits** (visibility area, earshot; headphones shrink earshot) | m | 4 m; 1 m with headphones [A] (MineLand limited senses) |
| BH30 | **Approach decision and response** (availability scale; groupmate and tie overrides; crit = hard block; accept / defer / decline) | function | agent-architecture §6 (Backhouse & Drew 1992; Fogarty et al. 2005; Mark et al. 2008) |
| BH10 | Late-feedback crunch probability | p | 0.5 (J9) |
| BH11 | Reflect / reframe probability after setback | p | by experience (Schön) |
| BH12 | Recovery after a deadline (gradual repayment of sleep debt) | nights; presence multipliers | First night 10–12 h; presence ×0.5 / ×0.8 on days 1–2 [A] (E13; Banks 2010) |
| BH19 | **Sleep-reduction rule** (part 2 of the hurdle model): sleep = max(floor, need − δ·urgency) + noise | need, floor, δ | need N(7.2, 0.6); floor U(4.0, 5.5); δ 1.2 [A] (E5) |
| BH21 | **Total-deprivation decision** (part 1 of the hurdle model): P(all-nighter) on the nights before a milestone, by event type, per-agent odds ratio (from C, N, keenness) and progress gap | p_event; OR; β | final 0.32, midterm 0.13, pin-up 0.02 with OR centred on 1 → about 33% / 14% / 2% of students (E4; re-calibrated 2026-11-07) |
| BH20 | **Off-peak-day presence** (weekends) as a function of urgency | p **2026-11-11:** 0.7 within seven days of a review, a full day, arrivals from 10:00 [A] (item 32) | 0.15 → 0.6 near reviews [A] (E6) |
| BH13 | Probability of leaving immediately after one-on-one | p | 0.15 [A] (B3) |
| BH14 | Departure hazard shape and scale (baseline) | Weibull k; % gone by end | k ≈ 3; 50% gone by T−30, 80% by T [A] (B3) |
| BH15 | Departure hazard ratios (supervisor strictness, deadline proximity, agent traits, external constraint) | multipliers | 0.5 / 1.5; 0.4; 0.5–1.8; 2.0 [A] (B3) |
| BH16 | **Personal noise-protection use** and its effects (noise exposure, overhearing, approachability) | p by state; multipliers | P = 0.6 while focusing; noise ×0.3; earshot 1 m; availability ×0.4. **Removable** for groupmates / important requests (BH30) [A] (D16) |
| BH17 | **Response to an unavailable resource** (wait / go elsewhere / change output / come back later) | probabilities | Plotter out of paper; no laser slot [A] (D9, D10) |
| BH18 | **Off-site trip behaviour** (travel time, absence from study zone) | min; frequency | Main shop trips, food runs, library focus 10% [A] (D8, D13, D15) |

## SO: Social structure and culture

| ID | Generic input | Type | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| SO1 | **Group culture mode** (supportive ↔ guarded) at group level; individual perception layered on top | spectrum + per-agent modifier | studio culture · team climate · psychological safety | Supportive; perceived competition varies by confidence and comfort (F1) |
| SO2 | **Peer exchange rate** as a function of sociability and comfort | per person per day | peer help · desk visits · coffee chats | r₀ = 4/day × sociability × comfort [A] (F3) |
| SO3 | **Digital channel use** (what goes online, and when in-person is replaced) | channel rules | course site + group chat · Slack/Teams · lab chat | Submissions and coordination online; meetings online when commuting is hard (F4) |
| SO4 | **Structured cross-level programs** (mentoring, TAing) | coverage %; initial tie strength | mentor program · buddy system · onboarding mentor | 3rd ↔ 1st-year volunteer mentors (50% of Y1 [A]); TA contact (F5) |
| SO5 | **Learning from visible work** (interest in others' displayed work) | per-agent curiosity | browsing pin-ups · demo walls · poster sessions | Curiosity-driven detours (F6) |
| SO6 | **Social comparison topic and its tone** (bragging ↔ commiseration) | topic; tone; norm weight | sleep-loss talk · overtime talk | Sleep-loss commiseration; weak norm effect 0.1 [A] (F7) |
| SO7 | **Recurring social events** (time–space routines): when, where, cost, draw | schedule; P(attend) | Good Times Fri · Waffle Wed · Halloween · Friday drinks · lab tea | Weekly Fri evening + Wed morning + Halloween (F9) |
| SO8 | **Written culture policy** (as a lever) | exists / unknown | studio-culture policy · code of conduct | Unknown; no lever (F8) |
| SO9 | Baseline stress prevalence | % | — | H1 (Battisto 80%) |

## EC: Economic and external constraints

| ID | Generic input | Unit | Example names (studio · office · lab · other) | Studio instance |
|---|---|---|---|---|
| EC1 | **Out-of-pocket production cost** per work phase | $/phase; distribution | model materials · prototyping · lab consumables | $100–300 per major phase; term median about $700 [D*] (G1) |
| EC2 | **Output cost per unit** | $/unit | large-format prints · copies | about $10–15 per large sheet [A] (G2) |
| EC3 | **Personal equipment and who pays** | owner; $ | student laptop · company laptop | Student-owned, up to $4,000; software provided (G3) |
| EC4 | **On-site sale of consumables** | yes/no; where | shop material sales · supply store | Sold in both shops (G4) |
| EC5 | **Personal budget and cost-saving behaviour** | $ budget; rules | fewer reprints · cheaper materials | Budget lower for working and international students [A] |
| EC6 | **Support services** (on/off site, hours, uptake) | list; P(use) | counselling · EAP · wellness centre | UBC services off-site; uptake 0.1/wk under sustained stress [A] (H2) |
| EC7 | **Supervisor pressure on output quality** | multiplier on task value | "push for best work" · performance targets | p_push 1.0–1.3 by style [A] (H3) |
| EC8 | **Stress-prevalence calibration targets** | % high stress by period | survey wellbeing benchmarks **2026-11-11:** met after the rebuild: 18% normal, 42% pre-review (five seeds) | about 20% normal; 33–46% review weeks [D*] (H1) |

---

## Provenance ledger: who supplied each input (UBC instance)

This section tracks, for every checklist item, **where its value came from**. It shows how much detail someone familiar with the space can provide, and how much outside data, modelling and observation the simulation still needs.

**Codes:**
- **C**: confirmed by the insider (you)
- **D**: from data
- **D***: from data, adjusted
- **M**: from a statistical or behavioural model, with a literature reference
- **A**: modeller's assumption, parameter still open
- **S**: subjective judgment
- **?**: unknown

**Knowledge source** (who could supply it in a new project):
- **Ins**: insider / occupant
- **Doc**: institutional documents (accreditation report, calendar, policies)
- **Stat**: public statistics (national bodies, surveys, transport reports)
- **Lit**: literature / established model
- **Obs**: on-site observation
- **Geo**: the building model

| Item | Status | Knowledge source | Item | Status | Knowledge source |
|---|---|---|---|---|---|
| A1 scope | C | Ins | D1 desk assignment | C | Ins |
| A2 year levels | C | Ins | D2 desk / storage | C | Ins, Geo |
| A3 cohort size | C + D | Ins, Doc | D3 display surfaces | C + D | Ins, Doc |
| A4 group size | C | Ins | D4 layout | — | Geo |
| A5 supervision ratio | C | Ins | D5 shared floor | C | Ins |
| A6 peer-support roles | C | Ins | D6 access hours | C | Ins |
| A7 cross-level mixing | C | Ins | D7 overnight | C | Ins |
| A8 supervisors | C | Ins | D8 shops | C + D + A | Ins, Doc |
| A9 gender | D | Doc, Stat | D9 staff-gated equipment | C + D + A | Ins, Doc |
| A10 international | D | Doc, Stat | D10 plotters | C + D + M | Ins, Doc, Lit |
| A11 outside work | D* | Stat | D11 computing | C | Ins |
| A12 commute | D + A | Stat | D12 kitchen | C | Ins |
| A13 caregiving | D* | Stat | D13 food | C + D | Ins, Stat |
| A14 age / background | C + D | Ins, Doc | D14 bookable rooms | C | Ins |
| B1 scheduled hours | C | Ins | D15 focus spaces | C | Ins |
| B2 timetable | C + D | Ins, Doc | D16 noise / headphones | C + D + M | Ins, Stat, Lit |
| B3 presence / departure | C + M | Ins, Lit | D17 building | C | Ins |
| B4 instruction share | C + A | Ins | E1 weekly hours | C + D* + M | Ins, Stat, Lit |
| B5 competing commitments | C | Ins | E2 review-week hours | C + M | Ins, Lit |
| B6 workload units | C | Ins | E3 late workers | C + D* | Ins, Lit |
| B7 effort per unit | C + D | Ins, Doc | E4 all-nighters | C + M | Ins, Lit |
| B8 calendar | C + D | Ins, Doc | E5 sleep | D* + M | Lit |
| B9 phases | C + A | Ins | E6 weekends | C + A | Ins |
| B10 milestone dates | C + A | Ins | E7 work medium | C + A | Ins |
| B11 other deadlines | C + A | Ins | E8 crowd-out | C + D | Ins, Doc |
| B12 intensives | C | Ins | E9 off-site work | C + A | Ins |
| B13 team size | C + A | Ins | E10 meals | A | — (open) |
| C1 feedback frequency | C | Ins | E11 breaks | M | Lit (weak) |
| C2 feedback length | C + M | Ins, Lit | E12 ramp-up | C + M | Ins, Lit |
| C3 queue order | C | Ins | E13 recovery | C + D + A | Ins, Lit |
| C4 coverage / overrun | C + M | Ins, Lit | F1 culture / competition | C + M | Ins, Lit |
| C5 feedback location | C + A | Ins | F2 help ladder | C + M | Ins, Lit |
| C6 rehearsals | C + A | Ins | F3 peer exchange | C + M + A | Ins, Lit |
| C7 review format | C | Ins | F4 online channels | C + M | Ins, Lit |
| C8 panel mix | C + A | Ins | F5 cross-level programs | C + D + A | Ins, Doc |
| C9 peer feedback | C | Ins | F6 curiosity | C + A | Ins |
| C10 evaluation | C | Ins | F7 comparison | C + A | Ins |
| C11 lead time | C | Ins | F8 culture policy | ? + D | Doc |
| C12 supervisor styles | C + A | Ins | F9 social events | C + D + A | Ins, Doc |
| G1 materials cost | D* + M | Doc, Stat | H1 stress level | D + M | Stat, Lit |
| G2 printing cost | D* + A | Stat | H2 support services | D | Doc |
| G3 computing cost | C + D | Ins, Doc | H3 supervisor push | C + M + A | Ins |
| G4 material supply | C + D | Ins, Doc | I1–I10 persona mix | closed 2026-11-07: traits only | Ins |
| J1–J10 model parameters | A (unreferenced) | — (sensitivity analysis) | | | |

### What the ledger shows (my tally)

| Measure | A–F (78 items) | All A–J (105 items) |
|---|---|---|
| Items with any insider input (C) | 68 (87%) | 71 (68%) |
| Items fully settled by the insider alone | 27 (35%) | 27 (26%) |
| Items using institutional or public data (D) | 24 (31%) | 30 (29%) |
| Items needing a statistical or behavioural model (M) | 15 (19%) | 18 (17%) |
| Items marked A in the ledger (most M items also contain assumed parameters) | 22 (28%) | 44 (42%) |
| Unknown or unanswered | 2 (F8, E10) | 2 |

- **G–H (costs, well-being):** you deferred most of these to data. The data is mainly institutional and statistical: SALA fee and handbook pages, CGPSS and Battisto.
- **I (persona mix):** closed 2026-11-07; the user chose traits only, so no persona shares are needed. Four extra sampled variables take their place (background D, chronotype D, keenness A, making skill A).
- **J (model parameters):** you have no reference for any of them. The model-internal parameters are where insider knowledge runs out completely, so they need **sensitivity analysis or observation**, not interviews.

**Pattern: the insider's detail drops as the questions move from structure to behaviour.**
- **Categories A–D** (who, how many, when, where, what rules): the insider settled about half the items outright: 27 of 56.
  - This knowledge is **structural and categorical**: timetables, rules, ordering, locations, typical formats.
- **Categories E–F** (time use, social behaviour): no item was settled by the insider alone.
  - The answers became **qualitative and conditional**: "depends on the student", "more likely near deadlines".
  - Turning these into numbers needed **distributions, rates and probabilities from data or models**.
  - Insiders are good at the *direction* and *conditions* of a behaviour, not its *magnitude* or *spread*.
- **Implication for repeating the process:**
  - An insider interview (about 2–3 h) can fix the structure: roughly categories A–D plus the qualitative shape of E–F.
  - Behaviour magnitudes need a literature model plus a little calibration data.

### Data needed per project (from this case)

| Data type | Used here | Effort | Replaceable by |
|---|---|---|---|
| Insider interview, one category at a time | about 78 answers, 6 sessions | Low–medium | Several insiders, to average out individual bias |
| Institutional documents | 1 accreditation report (APR), academic calendar, Senate guide, shop pages | Low (public) | Org charts, HR data, facility manuals |
| Public statistics | CACB enrolment, CGPSS graduate survey, campus transport report | Low | Census, industry surveys |
| Literature / models | about 25 papers (presence, hazard, queueing, TMT, sleep, networks, help-seeking, Big Five) | Medium (reusable across projects) | — |
| **On-site observation (not yet done)** | Recommended: headcounts every 15 min (B3), timing of desk crits (C2), plotter queue log before a review (D10), a short sleep / hours survey (E1–E5) | Medium | Sensors, badge data, Wi-Fi logs |
| Building model | Revit model (D4, all space syntax metrics) | Already available | Any BIM/CAD |

---

## Outputs (metrics) are generic too

All metric IDs in [summary-metrics.md](summary-metrics.md) are already site-independent:
- C1–C15: collaboration
- F1–F14: focus / creativity
- S1–S8: layout

To compute them, a site must supply:
- **SP3** for geometry metrics (S1–S8, C1, C10, F4)
- **OR1** group membership, for between-group metrics (C6, C14)
- **AT4** expertise, for complementarity
- the event log produced by running the simulation

## Repeatable process for a new site

1. **Scope:** set SP1/SP2 (what is studied vs context) and PO1 (occupant type).
2. **Copy the checklist** and relabel each item to the site's terms using the "Other contexts" column. Drop the rows that don't apply.
3. **Fill confirmed values (C)** with the client or an insider, one category at a time.
4. **Look up data (D)** for anything the client defers. Standard sources to check:
   - accreditation or institutional reports (program self-studies)
   - national statistics (professional bodies, census, national surveys)
   - occupant surveys (Gensler, CGPSS)
   - transport reports
   - published workplace studies

   Log each value in the provenance note with its source, page and any adjustment.
5. **Domain research:** personas, culture and behaviour rules for the occupant type. This is the only step that has to start fresh, because a lab or an office has different archetypes than a studio.
6. **Leave the rest as assumed (A)** and list those items for sensitivity analysis. They are the first parameters to vary.
7. **Observe (O)** if possible: a short occupancy count, or an interview round, to validate TM12, AC2 and EV1.
