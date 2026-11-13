# Metrics: how well a space supports collaborative and creative work

Sources: `research/2026-11-03 Collab/` plus the KEYS paper (Amabile et al. 1996) from `2026-11-03 Practice/`. Compiled 2026-11-03.

Every metric below can be computed in a simulation from at least one of these:
- **(G) Geometry**: the floor plan, a visibility graph or room graph, walking paths. Can be computed before any agents run.
- **(L) Agent logs**: position, activity state, team and role, conversations, and queue waits at each tick.
- **(S) Agent internal state or self-report**: LLM agents answering survey items, and motivation, stress and focus variables.

Numbers are the source's own. Where a number is mine (a threshold or default), it is marked **[assumed]**.

---

## 0. Problems with the source files

- **`237713056.pdf` is not Peponis et al. 2007.** It is Suckley & Nicholson (2018), *Enhancing Creativity Through Workspace Design*, a literature synthesis. Peponis is cited in it but is not in the folder. `references.md` should be corrected.
- **`rstb.2017.0239.pdf` and `rstb20170239.pdf` are the same paper** (Bernstein & Turban 2018).
- **`Assessing_the_work_environment.pdf` (KEYS) has no text layer.** It was read from the page images.
- **Minus signs are lost in the PDF text extraction.** Table cells in Bernstein & Turban and Kabo were reconstructed. Check the PDF before quoting table cells.
- **Hillier, *Space is the Machine*,** does not itself define control, choice, RRA normalisation or visibility graph analysis (VGA). Those formulas come from Hillier & Hanson 1984 and Turner et al. 2001 and are marked **[external]**.

---

## 1. Key evidence

| Finding | Number | Source |
|---|---|---|
| Path overlap (shared lengths of people's required walking routes) predicts new collaborations | **+100 ft of overlap → +19.7% (BLD1) and +19.8% (BLD2)** likelihood of a new collaboration; **+33.4% / +22.8%** grant success. Physical distance: +100 ft → −36.1% (significant in BLD1 only) | Kabo et al. 2014, 2 UMich buildings, 43,429 and 9,876 dyad-years |
| New ties are rare | 0.44–2.73% of all pairs form a new collaboration per year | Kabo, Table 2 |
| Open plan lowered face-to-face (F2F) contact | **F2F −72%** (Study 1: 5.8 → 1.7 h per person per day); **−67 to −71%** (Study 2). Email +20–56%; instant messaging +67% | Bernstein & Turban 2018, N = 52 and N = 100 |
| Desk distance barely mattered once desks were close | −0.07 F2F min per metre; desks about 2 m apart before and after the move | Bernstein & Turban |
| Communication falls off with distance | Little spontaneous contact beyond **30 m**. Being on a different floor is like being in a building 40 miles away | Allen, via Kabo and Heerwagen; Kraut et al. 1990 |
| Collaboration concentrates in nearby pairs | 82% of collaborations came from the 12% of pairs on the same floor or corridor | Kraut et al. 1990 (n = 93), via Heerwagen |
| Interaction rate depends on enclosure | **1.75–2.0 interactions per person per hour** in bullpens and pods, vs **< 0.25** in closed offices; under 1 min vs about 6 min each | Becker & Sims 2001, via Heerwagen |
| Open plan means more frequent but shorter contacts | 3× more contacts, about 3 min vs 9 min each | Boutellier et al. 2008, via Suckley |
| Most design-office interaction is unplanned | **80% unplanned**. Someone **away from their desk is read as "available"**; someone at their desk is read as busy | Backhouse & Drew 1992, via Heerwagen and Hillier |
| Interaction happens at desks more than in spaces built for it | Co-presence along routes (people visible) predicted F2F better than movement did | Rashid et al. 2004, via Heerwagen |
| Focus blocks are short | Uninterrupted work averages **< 10 min** (Reder & Schwab) or **< 30 min** (Perlow) | Heerwagen 2004 |
| Time spent with others | 20–35% of time; brief interactions last < 1 min | Heerwagen 2004 |
| Layout explains use in a weak-programme office | Integration vs space-use density **r = .83** (newspaper floor). The photocopier is a strong "magnet" outlier | Hillier Ch 7 |
| Integration predicts walking | Local (radius-3) integration vs pedestrian flow **R² = .734** | Hillier Ch 4 (Barnsbury) |
| Layout can mix or separate groups | Lab Y's corridor had about **5×** Lab X's movement and interaction at the same density. Within-group contact was saturated regardless of layout; **between-group** contact tracked integration (24 lab floors) | Hillier Ch 7 |
| Contact outside one's own project | High performers consulted 2–9 colleagues outside their project, low performers 1–2 | Allen, via Hillier |
| Shared amenities belong on routes | "The pathway seems more important than the destination." Coffee and copy points work only on well-used routes. One central print hub beats scattered machines. A kitchen can sit further away | Heerwagen; Hua et al. 2010, via Suckley |
| Choice of setting and access to focus space | High- vs low-performing workplaces: access to focus space **96% vs 26%**, relax space 94% vs 25%, informal conversation space 95% vs 39%; 94% have a choice of where to work | Gensler 2024, N = 16,040 (survey, correlational) |
| Time split between alone and together | On average **40% of time working alone**, about 40% collaborating (in person or virtual) | Gensler 2024 |
| What the work environment does for creativity | High- vs low-creativity projects (4-point scale, partial η²): **challenge .44, organisational encouragement .44, work-group support .41, freedom .40, impediments .36**, supervisor encouragement .30, **resources .20, workload pressure .05** | Amabile et al. 1996, KEYS; 141 project pairs |
| Physical space matters less than social environment for creativity | Physical effects are "weaker" than social ones but "still measureable" | Amabile 2012 |

**The main tension.** Being close helps people form ties when they meet *on the way to somewhere* (Kabo, Hillier). Being *exposed* at the desk makes people withdraw (Bernstein). Heerwagen calls the trade-off between awareness and interruption "the central dilemma". The metrics below therefore keep these separate:
- **where** an encounter happens (route or amenity vs someone's desk);
- **who** is involved (inside the group vs between groups);
- **what it costs** (whether a focus block was broken).

---

## 2. Collaboration metrics

| # | Metric | Type | How to compute | Benchmark / reading | Source |
|---|---|---|---|---|---|
| C1 | **Path overlap** per pair (and its mean or distribution) | G | Shortest walking paths from each agent's desk to the amenities it uses (WC, stair, kitchen, print/plot, model shop, crit space). Sum the length of path segments two agents share | +100 ft (≈30 m) → about +20% chance of a new tie. Compare layouts before any simulation | Kabo |
| C2 | **Realised co-traversal** | L | For each pair, the length or time both spend in the same corridor segment within Δt (e.g. 60 s **[assumed]**) | Tests C1 against actual behaviour | Kabo (suggested extension) |
| C3 | **New-tie formation rate** | L | First conversation between a previously unconnected pair, per agent per day. Also cumulative network density over time | The real-world base rate is low (0.4–2.7% of pairs per year), so in short runs use early contacts that recur | Kabo |
| C4 | **F2F conversation minutes** per agent per day, plus a pairwise matrix | L | Count an encounter when agents are facing, have line of sight, are within 10 m and take alternating turns. End it after a 5 s gap | Bernstein's corporate baseline is 5.8 h per person per day before and 1.7 after (offices, not studios) | Bernstein & Turban |
| C5 | **Interaction rate and duration** | L | Interactions per agent-hour and mean length | Open bullpen 1.75–2.0/h, < 1 min; closed office < 0.25/h, about 6 min | Becker & Sims; Boutellier |
| C6 | **Share of interactions between groups** (weak ties) | L | Interactions between agents of different studios, years or teams ÷ all interactions. Also the number of distinct out-of-group contacts per agent per week | Within-group contact saturates whatever the layout, so this is the metric that tells layouts apart. Allen: 2–9 vs 1–2 out-of-project contacts | Hillier Ch 7; Sailer & Penn; Allen |
| C7 | **Where interactions happen** | L | Share of interactions on circulation or at amenities vs at a desk vs in a dedicated room | Most real interaction is at desks (Rashid). In a well-designed layout, chance encounters move to routes and amenities | Heerwagen; Rashid |
| C8 | **Recruitment / re-routing events** | L | A moving agent sees a relevant other within X m (e.g. 8 m **[assumed]**), leaves its planned path and starts talking | Moving agents are recruitable; seated agents are "busy" | Backhouse & Drew, via Hillier |
| C9 | **Co-presence along circulation** | G+L | Mean number of agents visible from each circulation cell per tick | Predicted F2F better than movement did | Rashid, via Heerwagen |
| C10 | **Social density** | G | Number of desks or agents within 25 ft and within 50 ft walking distance of each desk | Higher density gives more friendship and information exchange, and more noise | Hua 2010; Szilagyi & Holland |
| C11 | **Floor / corridor shares** | L | Share of collaborations on the same corridor, same floor, or different floors | 36% / 46% / 18% (Kraut) | Kraut, via Heerwagen |
| C12 | **Teammate awareness** | L | Share of an agent's group it has seen or spoken to in the last N hours (e.g. N = 4 **[assumed]**) | Strong teams 97% vs weak teams 52% (Gensler survey) | Gensler |
| C13 | **Help-request latency** | L | Time from a help need arising to it being met, and from whom (peer, TA, instructor) | "Extreme collaboration" room: answers in < 1 min instead of days | Heerwagen (NASA JPL) |
| C14 | **Mixing between categories ("L-shape" test)** | L | For every space, correlate time-averaged occupancy of category A with category B (years 1 vs 4, students vs faculty). A linear scatter means mixing; an L-shaped scatter means the categories are segregated | Distinguishes a shared studio from a set of separate enclaves | Hillier Ch 5 |
| C15 | **Channel withdrawal** (optional) | L | Share of communication an agent sends digitally when it could have walked over, as a function of how many others could watch | Needed only if you want to reproduce the Bernstein effect; it has to be built into agent behaviour | Bernstein & Turban |

---

## 3. Creative and focused-work metrics

| # | Metric | Type | How to compute | Benchmark / reading | Source |
|---|---|---|---|---|---|
| F1 | **Uninterrupted focus-block length** | L | Length of each run of "focus" state ended by an external interruption. Report the median and the share of blocks ≥ 25 min **[assumed threshold]** | Offices: < 10 to < 30 min average | Heerwagen (Reder & Schwab; Perlow) |
| F2 | **Interruptions per focus-hour** | L | Count of other-initiated interruptions while an agent is in focus mode, kept separate from interruptions the agent starts itself | Interruptions harm complex tasks most | Heerwagen; Zijlstra |
| F3 | **Irrelevant-speech exposure** | G+L | A sound field from talking agents, reduced with distance and walls. Weight it higher when the listener can understand the talk (same language or project) | Meaningful nearby speech is the most distracting | Heerwagen |
| F4 | **Desk exposure** | G | For each desk: visual connectivity (isovist size), integration, distance to the integration core, and number of passes by other groups per hour | Moderate exposure lets people be recruited; high exposure costs focus. Hillier's rule: movement should pass *by* occupation spaces, not through them | Hillier Ch 7–8 |
| F5 | **Activity-depth ordering** | L | Mean integration of the places where each activity happens: movement, interaction, making, contemplative work | Target is Lab Y's order: movement < interaction < making < contemplative (interaction shallow, focus deep) | Hillier Ch 7, Table 7.1 |
| F6 | **Choice of setting** | L | Number of different settings an agent uses per day, and whether each setting fits the activity | Performance rises with choice and with the number of space types | Gensler; Suckley |
| F7 | **Focus-space availability** | L | Wait time, or the share of requests that fail, when an agent wants a quiet setting | Focus access 96% vs 26%. Also check under-use: people avoid quiet rooms that are inconvenient or socially awkward to use | Gensler; Parkin et al., via Suckley |
| F8 | **Resource queue time** | L | Wait time at plotter, laser cutter, 3D printer, model shop and pin-up wall | The KEYS "resources" scale (moderate effect, η² .20) | KEYS |
| F9 | **Workload pressure** | L/S | Remaining tasks ÷ remaining time to the deadline, plus interruptions | Model it as an inverted U: challenge-type pressure helps, overload hurts (KEYS η² only .05) | KEYS; Amabile 2012 |
| F10 | **Movement and standing time** | L | Minutes walking or standing per agent per day | Walking raises divergent thinking; rooms without seats reduce territoriality over ideas | Oppezzo & Schwartz; Knight & Baer, via Suckley |
| F11 | **KEYS self-report by agents** | S | At the end of each simulated day or week, LLM agents answer the KEYS items (4-point frequency scale). Compare scale means across layouts | Real high- vs low-creativity gaps are about 0.3–0.6 points on the 4-point scale | Amabile et al. 1996 |
| F12 | **Intrinsic motivation and affect** | S | Agent state variable: harsh critique lowers it, recognition, autonomy and progress raise it, and pressure lowers it beyond a threshold | Amabile's componential model | Amabile 2012 |
| F13 | **Output novelty × appropriateness** | S | An LLM judge, consensual-assessment style, scores design iterations or crit outputs | Treat it as an exploratory proxy, not ground truth | Amabile (consensual assessment) |
| F14 | **Process-stage dwell and iteration count** | L | Time in each stage (identify → prepare → generate → validate → communicate) and number of loops back | Creativity needs room to iterate (Furniss, Amabile) | Amabile 2012 |

---

## 4. Layout-only metrics (space syntax; no agents needed)

| # | Metric | Compute | Reading |
|---|---|---|---|
| S1 | **Global integration** (HH = 1/RRA) | Breadth-first search from every cell or room. Mean depth MD = TD/(k−1); RA = 2(MD−1)/(k−2); RRA = RA/D_k **[external]** | High = movement and co-presence hotspots, suited to pin-up, café and crit. Low = protected, suited to focus |
| S2 | **Local integration** (radius-3, or a 10–20 m metric radius **[assumed]**) | The same measure limited to r steps | Predicts desk-to-desk trips (R² .73 for pedestrians) |
| S3 | **Integration core** | The top 10% most integrated cells | Should connect, not isolate. Put magnets (printer, café) on or just beside it |
| S4 | **Intelligibility** | r² of connectivity vs global integration | Legible layout: people can find the shared places |
| S5 | **Local–global correlation** | Floor-only vs whole-building integration | Floor integration tracks *how many* between-group contacts; building integration tracks *how useful* they are (direction only; no coefficients reported) |
| S6 | **Space types a/b/c/d** | Strip dead ends (a), then tree spaces (b); rings are c (single ring) or d (multiple rings) | Desks and crit rooms work best as a-spaces off a d-complex; avoid rooms you must pass through (b) |
| S7 | **Strategic value of a social space** | Sum of the integration of the lines passing *through* the space | High values predict informal use. Seating goes *next to* the main routes, not on them |
| S8 | **Visibility-to-depth ratio** | Mean visibility ÷ mean depth | Compact and legible (about .74) vs coiled and deep (about .24) |

**Circularity warning.** If agents route by shortest path over the same graph that S1–S3 analyse, any correlation between integration and movement is partly built in. Report these as diagnostics, not as proof that the layout works. To make the layout result meaningful, give agents real destinations (desk, crit, print) and compare runs where all trips are scheduled with runs where agents move freely. That comparison is Hillier's "programme strength" test.

---

## 5. Recommended core set (12)

For a first version, these metrics are feasible, grounded in the sources, and between them cover both sides of the trade-off.

1. **C1 Path overlap.** Geometry only; strongest causal evidence.
2. **C3 New-tie formation rate.**
3. **C4 F2F minutes**, using Bernstein's encounter rule.
4. **C6 Share of interactions between groups.**
5. **C7 Where interactions happen** (route or amenity / desk / room).
6. **C13 Help-request latency.**
7. **F1 Focus-block length.** Benchmark since 2026-11-08: 11 min median (Mark, González & Harris 2005, the only field measure of uninterrupted work length), DeskTime's 52 min as the undisturbed bout and upper mark, the share of blocks of 25 min or more reported beside it (J6).
8. **F2 Interruptions per focus-hour.**
9. **F4 Desk exposure.** *2026-11-08:* the engine's count is one per walker per pass within two tiles of the desk's standing tile (near ring 1, next ring 0.5, x0.5 through a board, table or wall); the benchmark is 6 passes an hour [A], rescaled from the earlier 15 tile-steps so a normal Tuesday keeps its ratio. The isovist and integration parts of F4 are not computed.
10. **F7 / F8 Wait time for focus space and resources.** Engine note (2026-11-12): F8 as a mean wait falls when people give up and rises when a policy keeps them waiting, so the tool also reports the jobs abandoned for paper beside the wait; the A vs B verdict compares the two counts.
11. **F11 KEYS self-report by agents**, plus **F12** motivation state.
12. **S1 + S3 Integration and core**, as the layout context.

**Pareto view.** Plot collaboration (C4 or C6) against focus (F1) for each layout. A good studio layout should improve one without losing the other. A single combined score would hide that trade-off.

## 6. Validity limits to state in the write-up

- **Few of the sources studied design studios.** The offices, labs and corporate floors are proxies.
- **Gensler and KEYS are correlational self-report data.**
- **Hillier's building-scale evidence is thin:** N = 1–2 cases, and the 24-floor lab sample reports directions without coefficients.
- **Social factors outweigh spatial ones for creativity** (KEYS). Layout should mainly affect work-group support, freedom of setting, and distraction. Expect modest effect sizes.
- **Behavioural effects only appear if you build them in.** The Bernstein withdrawal and Backhouse & Drew's "away from desk = available" rule appear in a simulation only if they are coded as agent behaviour. Cite them as the reason for those rules, not as results the simulation discovered.
