# Methodology log

A dated record of how the simulation inputs were researched, decided and documented, for the case study. Append a new entry for each step. Don't rewrite earlier entries; correct them with a later entry.

## Note set

| Note | Role |
|---|---|
| [references.md](references.md) | The reading list as planned |
| [summary-metrics.md](summary-metrics.md) | Literature → metrics for collaborative and creative work (outputs) |
| [summary-studio-culture.md](summary-studio-culture.md) | Literature → studio culture, personas, behaviour rules (domain knowledge) |
| [studio-culture-school-checklist.md](studio-culture-school-checklist.md) | Site instance: values for UBC SALA M.Arch, confirmed one category at a time |
| [assumption-data-sources.md](assumption-data-sources.md) | Provenance: sources, calculations and models behind each value |
| [input-registry.md](input-registry.md) | Generic, reusable schema of all inputs (site- and domain-independent names) |
| [subjective-components.md](subjective-components.md) | What can't be quantified, and how the user includes it by judgment (status S) |
| methodology-log.md (this note) | Chronology of the process |

## Log

### 2026-11-03: Literature review
- **Input:** 19 PDFs in `research/2026-11-03 Collab/` (9) and `2026-11-03 Practice/` (10).
- **Method:**
  - Text extracted with `pdftotext`. The KEYS paper is a scan, so it was read from page images.
  - The two full books (Hillier, *Space is the Machine*; *Studio Teaching in Higher Education*) were read with targeted searches plus their framing chapters.
  - Four parallel reading agents each returned structured notes.
  - Key numbers were then spot-checked against the extracted text.
- **Problems found:**
  - `237713056.pdf` is Suckley & Nicholson 2018, not Peponis 2007.
  - The Schön PDF stops at p. 69, before the architecture chapter.
  - The two `rstb` files are duplicates.
  - The text extraction drops minus signs in table cells.
- **Output:** summary-metrics.md and summary-studio-culture.md.

### 2026-11-05: School-specific checklist
- Every studio-culture assumption that varies by school was turned into a fill-in checklist (categories A–J). Each item has a literature reference value, a default, and a suggested way to confirm it.

### 2026-11-05: Category A (program and cohort) confirmed
- **User confirmed:** M.Arch only, 3rd floor studied; 3 years; about 60 per year; 15 per instructor; no TA crits; no vertical studios; about 4 instructors per year; age 23–30.
- **Items the user deferred to real data** were looked up:
  - UBC M.Arch accreditation report (APR 2024)
  - CACB 2025 national statistics
  - UBC APSC facts page
  - CGPSS 2022 graduate student survey
  - UBC 2024 transportation report
- **Access problem:** web-fetch agents couldn't parse the PDFs, so they were downloaded and extracted locally. The scrambled admissions table was rebuilt by checking that male + female = total enrolled.
- **Decisions:**
  - Gender set to 58/41/1. The data overrode the 50/50 placeholder.
  - Year 1 = 45 students (from APR intake figures; the user chose this).
- Adjusted defaults are marked D*.

### 2026-11-05: Input registry created
- At the user's request, all inputs were generalized into 13 site-independent categories so the process can be repeated for other buildings and occupant groups.
- A 7-step repeatable process was written.

### 2026-11-05: Category B (schedule and course load) confirmed
- **User confirmed:**
  - Timetable: Years 2–3 Tue/Fri 13:30–18:00; Year 1 adds Thursday.
  - Attendance behaviour (trickling out; nobody leaves before their own crit).
  - Credits: studio 9, other courses 3 each. The school's 4 h/credit rule; 9 h outside work per course.
  - Project phases, review timing, cadence of other courses, team use.
- **Data:**
  - UBC 2026/27 calendar → 25 / 38 sessions after closures (calculated).
  - UBC Senate curriculum guide → 8–9 h per 3-credit course. This differs from the school rule; the difference is recorded.
- **Model:** the user asked for a statistical model of leaving studio. None exists for studios, so one was assembled from:
  - an inhomogeneous Markov presence model (Page 2008)
  - an agent-based occupancy simulator (Hong et al.)
  - utility-based scheduling (Yu 2022)
  - a Cox / Weibull hazard model
  - a single-server crit queue

  Its parameters are marked [A] until a headcount survey calibrates them.
- **Registry:** TM converted to "generic name + example names"; new inputs TM14–18, EV presence lock, BH13–15.

### 2026-11-05: Category C (crits and reviews) confirmed
- **User confirmed:**
  - 1 crit per session per project group, 15–40 min
  - FCFS sign-up sheet; everyone served
  - location: desk or central table
  - ≥2 pin-ups before each guest review
  - 3 guests, 5 + 15 min; more external critics at the final
  - informal peer crit; percentage grading
  - reviews on studio days
  - a variety of instructor styles
- **Model:**
  - Crit length is a shifted lognormal, following call-centre service-time evidence (Brown et al. 2005).
  - A Monte Carlo check (100k draws) shows a section of 15 solo students always overruns the 4.5 h session (about 5.6 h of crits).
  - This matches the user's account that solo-heavy sections run late. Whether solo crits are shorter in practice was flagged for checking.
- **Dates adjusted:** the final review moved to a studio day (Tue Dec 8 for Years 2–3; Thu Dec 10 for Year 1).
- **Registry:** EV converted to generic names (EV1–EV14). Status code S (subjective) added.
- **New note:** subjective-components.md (S1–S24). It lists factors the data can't carry and four ways for the user to include them: weight, scenario, narrative, reading the results.
- **New note:** this methodology log.

### 2026-11-05: Crit length resolved
- The user confirmed solo and group crits are about the same length.
- One crit-length distribution is used for both.
- Accepted consequence: solo-heavy sections routinely run about 1 h past 18:00.

### 2026-11-05: Category D (space and access) confirmed
- **User confirmed:**
  - dedicated desks for the semester, grouped by section
  - desks wider than 1 m with an under-desk locker
  - back-of-desk pin-up plus movable boards on casters
  - all years on floor 3; 24/7 card access; overnight work allowed
  - basement shop plus a main shop in another building, where the laser cutter is
  - 2 self-serve plotters that run out of paper after hours
  - laptops, with desktops at the plotters
  - 24/7 kitchen; isolated building with little food nearby
  - instructor-booked crit rooms shared with history seminars
  - no quiet spaces; noise-cancelling headphones common
  - building: 4 floors + basement, studio on 3, offices on 4
- **Out of scope:** desk layout (D4) comes from the user's model in the tool build.
- **Data:**
  - APR24 facilities: Lasserre's function list; the new APSC/CHBE shop (Sep 2025, about 1,004 m², roughly triples shop space); 3D printers 24/7 in Room 5; felt pin-up walls in rooms 301/309/202; 2 student plotter-tech positions.
  - SALA shop hours (old pages, inconsistent).
  - 24/7 food (*Ubyssey* 2023).
  - Office headphone surveys (24.5–75%).
- **Calculations:**
  - Plotter-tech coverage is about 8 h/week (from the position budget, with an assumed wage).
  - Pre-review plotting demand is about 225 E-sheets against about 84 sheets loaded, so a paper outage is near-certain during an evening or night crunch.
- **Models:**
  - Plotters are a 2-server queue with paper running out, unavailable until a staffed restock (queueing with "vacations", Doshi 1986).
  - Headphones are a personal state that lowers noise exposure, overhearing and approachability.
  - Off-site trips (main shop, food, library) remove the agent from the study zone.
- **Registry:** SP, RS and PL converted to generic names. New inputs: SP11 movable display objects, SP18 shared floor, RS2 staff-gated equipment, RS5 consumable stock + restock window, BH16–18.
- **Subjective note:** added S25–S30.

### 2026-11-05: Building and walking times confirmed
- The user confirmed the modelled building is the Frederic Lasserre Building.
- Walking times (user's estimates) replace the assumed values:
  - main shop: up to about 20 min
  - food street at the bus loop: about 15 min
  - library: about 5 min

### 2026-11-05: Category E (time use and behaviour) confirmed
- **User confirmed (qualitatively):**
  - hours depend on work style; review weeks increase them
  - only a portion work late
  - some come in on weekends, more near deadlines
  - printed boards and physical models are preferred
  - design takes more time than the credit hours suggest
  - off-site work at home or the library (which closes), rarely cafés
  - ramp-up depends on style and on deadlines landing in the same week
  - there is a recovery period
- **Deferred by the user to data or statistical models:** E1, E4, E5, E11. E10 (meals) was not answered and keeps its default.
- **Data found:**
  - Hershner & Chervin 2014: an architecture school with 5.7 h sleep, 2.7 all-nighters/month and 4% sleeping ≥ 7 h
  - Thacher 2008 and the Tab 2017 surveys on all-nighter prevalence
  - Lund 2010 baseline student sleep
  - NSSE 2016: architecture 22.2 h/wk of outside-class work
  - AIAS 2015/2020 studio hours (snippets; N = 55)
  - Bachman & Bachman 2006: 72 h/wk (secondary summary)
  - Chronotype distributions in student samples
  - DeskTime 52/17 work–break pattern (observational, weak)
- **Models adopted:**
  - Temporal Motivation Theory (Steel 2007) allocates effort across concurrent deadlines. Ramp-up and compounding emerge from it instead of fixed multipliers.
  - Borbély two-process sleep model plus an urgency-raised threshold, so all-nighters emerge from the agent's state.
  - Alternating renewal process for work and breaks, with Poisson interruptions.
  - Gradual recovery after reviews (Banks 2010).
- **Calibration targets:** term-mean sleep 5.7 h and 2.7 all-nighters/month (data), with a "moderate culture" alternative at half that, because the single-school US figure may overstate UBC.
- **Registry:** AC converted to generic names. New inputs: AT10–13 (chronotype, impulsiveness, value weights, baseline effort), ST1 rewritten for the two-process model, BH1 replaced with TMT, BH19–20.
- **Subjective note:** added S31–S34.

### 2026-11-05: Sleep model revised (user correction)
- **User's observation:** all-nighters are more likely before a final and possible before a midterm; many students sleep less but never pull one.
- **Why the model changed:** the earlier single-threshold model, calibrated to a monthly all-nighter rate, couldn't separate sleeping less from skipping sleep.
- **Replacement:** a **two-part (hurdle) model** (Cragg 1971; Mullahy 1986).
  - Part 1: a yes/no all-nighter decision only before milestones, with probability by event type, persona odds ratio and how far behind the agent is.
  - Part 2: otherwise, sleep shortens with deadline pressure down to a personal sleep floor. Personal differences in tolerating sleep loss follow Van Dongen 2004; partial vs total sleep loss are distinct per Van Dongen 2003.
- **Calibration** (100k simulated draws):
  - about 33% pull an all-nighter before the final, 14% before the midterm, 2% before a pin-up
  - term-mean sleep about 6.2–6.5 h
  - consistent with Thacher 2008 (about 60% ever) and Battisto's "4–6 h"
- Hershner & Chervin's 2.7/month is kept only as an upper-bound "intense culture" scenario.
- **Method note for the case study:** this is the first time first-hand experience changed the *structure* of a model, not just a parameter. It shows why the confirmation loop matters.

### 2026-11-05: Category F (social dynamics) confirmed; new tracking notes
- **User confirmed:**
  - a supportive culture, where perceived competition depends on the student
  - help ladder: friend (if easy) → TA → instructor
  - peer exchange depends on sociability and comfort, and comfort grows over time
  - heavy online use for submission, coordination and meetings
  - a volunteer mentor program between 3rd- and 1st-years, plus TA contact
  - curiosity about others' work varies
  - sleep-loss commiseration
  - unaware of any culture policy
  - events: Good Times (Fri), Waffle Wednesday, Halloween, off-campus gatherings
- **Data:** APR24 confirms the "Good Times" sponsored happy hours, the M.Arch mentorship program and the ARCHUS weekly breakfast (waffles). No named culture policy found in the APR text.
- **Models (all referenced):**
  - comfort grows with familiarity (Reis 2011)
  - ties form through proximity, friends of friends and shared foci (Festinger 1950; Kossinets & Watts 2006)
  - help-seeking by cost and perceived threat (Karabenick 2003; Edmondson 1999)
  - channel choice by media richness (Daft & Lengel 1986)
  - social comparison (Festinger 1954)
  - personality grounded in the Big Five
- **Methodological shift:** in Category F almost every answer was "depends on the individual". Per-agent variation became a first-class part of the model.
- **New notes:**
  - **agent-variables.md:** all per-agent traits, habits, states and persona biases, built in layers (personality → circumstances → persona → habits → states)
  - **README.md:** a table of contents for all notes
- **Registry:** SO converted to generic names; ST9–10, OR9, BH22–24 added. New **provenance ledger** for all 78 items A–F, with a summary:
  - the insider settled 35% of items alone and contributed to 87%
  - structural categories (A–D) were mostly settled by the insider
  - behavioural categories (E–F) needed data and models for magnitudes
  - a data-effort table per project
- **Subjective note:** added S35–S38.

### 2026-11-05: Categories G–J
- **G (costs):** deferred to data, since costs vary by term, section and course.
  - SALA fees page: at least $1,000/yr for supplies. SALA handbook: laptop up to $4,000. APR: student-owned laptops, Adobe and Rhino provided, no computer lab. SALAfab: materials sold. Carleton M.Arch: about $1,050/yr supplies. US anecdotes: $100–300 per project model, about $12 per large print.
  - Model: per-phase model and printing costs, giving a term median of about $700 (D*).
  - Costs feed a financial-stress state and cost-saving behaviour.
  - User confirmed: laptops are student-bought; material is sold in both shops.
- **H (well-being):** H1 deferred to data, H2 referred to UBC.
  - Calibration targets: about 20% of agents in high stress in normal weeks (CGPSS 2022: 21.1% fair or poor well-being) and 33–46% in review weeks (Battisto 2024 DASS).
  - UBC services listed (Counselling, Student Health, Wellness Centre, SAP 24/7, Here2Talk 24/7) plus ARCHUS wellness programs. Modelled as off-site, low uptake.
  - H3 (confirmed): instructors don't encourage all-nighters but push for the best work. Modelled as a style-dependent multiplier on the value of studio work, which raises crunch only indirectly.
- **I (persona mix):** deferred by the user.
- **J (model parameters):** kept. The user has no reference for them.
  - All J values and the other [A] parameters are labelled unreferenced.
  - Proposed method: Morris (1991) elementary-effects screening and Saltelli (2008) to find the parameters the metrics actually depend on, before refining.
- **Registry:** EC converted to generic names (EC1–EC8); provenance ledger extended to all 105 items (A–J).
  - The insider contributed to 68% of all items and settled 26% alone.
  - J is the category where insider knowledge runs out completely.
- **Other notes:** agent-variables gains money and support habits; subjective note gains S39–S41.

### 2026-11-05: Personality model proposed
- **User's request:** start from an established psychological personality model, keep it editable, and link the personality-dependent variables and subjective components to it so that one informs the other.
- **New note: personality-model.md.** It compares six models:
  - Big Five
  - HEXACO
  - BIS/BAS
  - Whole Trait Theory
  - CAPS
  - MBTI (not recommended)

  Plus add-ons: perfectionism, grit, chronotype.
- **Recommendation:** Big Five core, plus Whole Trait states and CAPS if–then rules; HEXACO as an upgrade.
- **Module design:** six swappable layers: schema, population, mapping table, states, if–then rules, LLM rendering. The mapping is log-linear in SD units, so the weights are readable and editable.
- **Mappings:** each mapping has a reference for its direction. Key ones:
  - Asendorpf & Wilpers 1998, Selfhout 2010: extraversion speeds social adaptation in a new university environment
  - Bolger & Schilling 1991: neuroticism and reactivity to stress
  - Steel 2007: conscientiousness and procrastination
  - Furnham & Strbac 2002: introverts are more distracted by noise
  - Feist 1998: openness and creativity
  - Graziano 2007: agreeableness and helping
- **Weights are [A]** and go into sensitivity screening.
- **Subjective components:** 16 of them are now personality-informed defaults; S1, S6, S9 and S21–S24 stay fully subjective.
- **Awaiting the user's choices:** base model, layers, add-ons, how personas are handled, weights.

### 2026-11-05: Personality model decisions
- **User chose:**
  - the **Big Five** as the core;
  - the **Whole Trait Theory** state layer;
  - **MBTI** layered on top because it is widely known.
- **Implementation:**
  - **States:** each tick, a state = trait + situational shifts + autocorrelated noise. The situational shifts are friends nearby, comfort, urgency, events, harsh crits and sleep debt. Behaviour parameters are computed from states.
  - **MBTI:** derived from the Big Five using the McCrae & Costa 1989 and Furnham 1996 correspondences (E→E/I, O→N/S, A→F/T, C→J/P). The optional -A/-T suffix comes from N. Borderline letters are shown lowercase.
  - **Display only.** Because of MBTI's weak psychometrics (Pittenger 2005), it doesn't drive behaviour.
- **Still open:** CAPS rules, add-ons, how personas are handled (Category I), mapping weights.

### 2026-11-05: Agent architecture agreed
- **The user's own research on agent simulation** added: basic physical needs (hunger, thirst, sleep, mental and physical fatigue, washroom), memory, retrieval, reflection, planning, role, action, task prioritization, strengths, skills, knowledge, familiarity.
- **Checked against the papers in `Research/Agent/READ/`:**
  - **Generative Agents (Park 2023):** memory stream; recency, importance and relevance retrieval; reflection; hierarchical planning.
  - **Humanoid Agents (Wang 2023):** 0–10 basic needs with drain rates; emotions; closeness; re-planning.
  - **MineLand:** physical needs; limited senses.
  - **IndoorWorld (2025):** role-based action sets and knowledge; the task-prioritization module improved task completion.
- **My additions, agreed by the user:**
  - mood (valence and arousal)
  - limited perception (visibility area and earshot)
  - availability signals
  - knowledge split into domain, project, place and who-knows-what (Wegner 1987)
  - place familiarity
- **User specification:** **availability is a scale.** Headphones can come off for a groupmate who needs to collaborate, or when the wearer isn't too focused or stressed; a student in a crit with their professor is not approached.
  - Modelled as: signal-based availability (0–1); the approacher's decision weighted by need and relationship (groupmate 2×); and the target's accept / defer / decline response.
  - References: Backhouse & Drew 1992; Fogarty et al. 2005 (interruptibility from visible cues); Mark et al. 2008 (cost of interruption).
- **Physiological grounding of needs:** EFSA 2010 water intake; Haylen 2010 voiding-frequency terminology; vigilance decrement (Warm 2008); Attention Restoration Theory (Kaplan 1995).
- **Methodological point:** needs generate the washroom, kitchen and water trips that Kabo's path-overlap metric depends on. That links agent physiology directly to the layout metrics.
- **Execution:** hybrid. The numeric layer runs every tick; the LLM is used for plans, reflections, conversations and events. The reason is cost (about 165 students plus staff) and so the sensitivity screening stays feasible.
- **New note:** agent-architecture.md. **Registry:** AT16–20, ST11–20, BH25–30; BH16 updated (headphones removable). Agent-variables §4c added. Subjective S27 now user-structured.

### 2026-11-06: Handover note
- Wrote **HANDOVER.md**. It covers:
  - reading order, plus a shortcut for builders
  - a map of how the notes relate
  - the settled decisions
  - the conventions (status codes, [A], references, generic names, update-every-note rule, append-only log)
  - open items
  - source-file caveats (web PDFs extracted to a temporary scratchpad must be re-downloaded)
  - findings about the method so far
- Linked from README.

### 2026-11-06: Handover note rewritten for a Claude Code session
- At the user's request, HANDOVER.md was reframed as instructions for the next Claude Code chat. It covers:
  - context and user goals
  - a summary of everything designed
  - the 13-note inventory, with when each note is updated
  - the confirmation loop and the update-every-note protocol
  - conventions and user preferences
  - current state and next step (Category I + personality options)
  - practical tool pitfalls: heredocs fail, use Edit; web PDFs need local pdftotext; the scratchpad doesn't persist
  - findings about the method

### Open items carried forward
- **Architecture:** calibrate need rates by observation; LLM budget (full vs numeric-only agents); whether custodial and security staff are modelled.
- **Personality:** CAPS, add-ons, persona handling, weights (personality-model.md §6).
- **Category I (persona mix):** to be elaborated by the user. It is now tied to the personality choice.
- **Run sensitivity screening** on the [A] parameters once the simulation exists.
- E10 (meals): not answered; default kept.
- Library closing time: the default of 22:00 is unverified.
- Confirm whether rooms 301/309 are the crit rooms (APR mention). This is deferred to room labelling.
- The AIAS 2020 Learning & Teaching Culture survey PDF is blocked to automated download (403). The user could download it for Category E.
- Calibrating the departure model needs a headcount survey (B3).

### 2026-11-06: Notes read into the tool session; owner corrections
- The notes were read in full by the tool-building session and compared with the tool (`program/`, `viewer/src/sim/`). Nothing in the tool was changed.
- **Owner corrections and additions:**
  - **D9 overwritten:** the 3D printers are on the 3rd floor (the studio's 3D-printing room), not in basement Room 5 as APR24 said. The APR is older than the move. Registry RS3 updated.
  - **D1 addition:** the model has about 7 more studio desks than students; the extras toward the middle of the floor are unclaimed hot desks.
  - **B5 / D14:** typically 3 other courses; many have lectures in another building; history seminars are 1.5 h and typically in the crit rooms. A ratio was needed, so a default was assumed: 1 seminar course on the floor, 2 lecture courses off site [A], with the room load and off-floor time it implies (data note D14). To confirm.
  - **Vertical circulation (SP4):** stays as the tool models it (stairs and an elevator under collective control, first come first served, with pick-ups on the way); the notes never modelled it.
  - **Room naming:** the tool keeps its own room numbers for now (its crit rooms 1 and 4 are the APR's 301 and 309). The owner wants a reminder later to reconcile them.
- **Checked against the tool's deferred questions.** Answered by the notes: crit parameters (C), the event schedule (F9), presence over time (E), floor hours (D6–D7), basement shop hours (D8), plotter model (D10), desk crit location (C5). Not answered: event headcounts (they follow from the persona and sociability draw, not a fixed number), meals (E10), shared-desk counts in the large offices, professors' office hours, the photography room, the elevator, the persona mix (I).
- **Open items carried forward:** the seminar/lecture ratio [A]; Category I; everything in the previous entry's list.

### 2026-11-07: Category I closed; traits only, no personas
- **User question:** what the persona shares (20/15/15/10…) were based on, how they relate to the Big Five draw, and whether personality alone could drive behaviour. Answer given: the shares were unsourced judgment over archetypes merged from the literature; the Big Five draw is N(0,1) per trait with assumed persona shifts of 0.2–0.8 SD; about fifteen parameters (H_base, Γ, value weights, all-nighter OR, medium preference, resource response, departure hazard, mentor role…) were set by persona rather than by traits.
- **Decision (user): traits only.** Personas are no longer an input. Each agent = Big Five draw + circumstances (Category A) + four sampled non-Big-Five variables: prior design background (A14, data), chronotype (E3 shares, shifted by C and E), keenness (baseline intrinsic motivation, [A]), making skill ([A]); perfectionism stays an optional add-on.
- **Calibration check (200k draws, numpy):** with H_base = 48 h × exp(0.25C + 0.15 keenness) × job/caregiving/commute factors, clipped 15–70 h: p10/50/90 = 25/39/60 h, 23% above 50 h, which keeps E1's floor median of about 40 h. A 40 h base gave a median of only 33 h because the circumstance factors pull it down. All-nighter odds ratio exp(−0.4C + 0.3N + 0.2 keenness) is centred on 1, lower on average than the persona ORs, so p_event was raised to final 0.32, midterm 0.13, pin-up 0.02; the population shares stay at about 33% / 14% / 2% (E4).
- **Notes updated:** personality-model.md (§5 decided, open choice 4 closed, decisions table); agent-variables.md (layer diagram, personality core, affected rows, new "Traits-only mappings" table; the persona table kept as superseded); checklist I (closed, shares superseded); assumption-data-sources.md (B3 persona hazard, E1 work-style table, E3 late workers and E4 persona odds ratios marked superseded, with the replacements); input-registry.md (AT1 not used; AT6/AT7/AT11/AT13/AC9/BH15/BH21 re-sourced; ledger I closed); README; HANDOVER; summary-studio-culture.md (personas marked descriptive).
- **Expected effect on heterogeneity:** not more total variance, a different shape. A persona mixture adds between-cluster variance and bands (hours 20–30 vs 50–65; in the draw above the mixture's SD of hours was 13.4 against 12.9 for traits only). Sampling traits directly gives one unimodal, continuous distribution per parameter with independent combinations, so more distinct individuals and fewer stereotyped bundles. The spread of each parameter is governed by the mapping weights and the sampled variables' SDs, to be checked in the sensitivity screening (J).
- **Open items carried forward:** CAPS rules, add-ons and weights (personality-model §6); the seminar/lecture ratio [A]; E10 meals; the room-number reconciliation reminder; everything else in the 2026-11-06 lists.

### 2026-11-07: Personality population model (how the trait distribution is set)
- **User question:** how to decide the personality distribution; is there statistical data; anything specific to architecture schools. The user re-confirmed: traits only, the trait combination, not personas.
- **Search (web, 12 queries plus 3 page reads):** general-population open data (IPIP-NEO 307k with age/sex/country; Open Psychometrics 1M), field effects (Feist 1998 artists vs nonartists; Vedel 2016 academic majors), sex differences (Schmitt 2008; Weisberg 2011), age trends (Soto 2011), and architecture-specific studies (MacKinnon 1958–59 IPAR architects; SUTD 2026 Big Five and design grades; single-school MBTI studies). Feist's Table 3 was read from the PDF with pdftotext.
- **Finding:** nothing architecture-specific is usable as a distribution. The elite architect study was never fully published; the student studies report no means or use MBTI. Field-level meta-analyses are the best available: design students about +0.5 SD on Openness and −0.5 SD (artists) on Conscientiousness.
- **Decision recorded:** z ~ MVN(μ, Σ) in general-population SD units; Σ from the IPIP-NEO Canada 22–32 subset (to compute; literature placeholders until then); field shift O +0.5, C −0.25 [D*]; per-agent sex shift N +0.40, A +0.35, E +0.10 for women [D]; no age shift [A]; re-centring rule so cohort-calibrated targets (E1, E4) hold. A cohort survey (BFI-2-S or IPIP-NEO-120, anonymous, about 60 responses → SE about 0.13 SD) is added to the observation programme and will replace μ and Σ.
- **Notes updated:** personality-model.md (§2 population model rewritten; references added); agent-variables.md (trait rows and a population note); assumption-data-sources.md (Category I section now holds the population model and its sources table); input-registry.md (AT15); HANDOVER.md (observation programme); checklist I (pointer).
- **Open items carried forward:** compute Σ from the IPIP-NEO data; run the cohort survey; the rest of the 2026-11-07 list.

### 2026-11-08: The owner's answers to the build's questions (program/QUESTIONS.md 1–21)
- **Answers recorded** (checklist rows carry the 2026-11-08 notes): Q1 washrooms by floor and role (C); Q2 adjuncts have no office, offices may be elsewhere, no curriculum data, so shares [A]; Q3 plotters confirmed (C); Q4 lunch kept [A]; Q5 first come confirmed (C); Q6 crit spot by noise, style and space, so crit modes (M, split [A]); Q7 pin-ups accepted (C); Q8 lecture: a projection, rooms first come (M/A); Q9 seminars any day, not against lunch or studio (C), so a timetable (M); Q10 office hours depend on the student (C), so a propensity [A]; Q11 Good Times size accepted for now; Q12 rearrangement = the agents enact the suggestions live (C, a decisive re-reading of the feature); Q13 elevator stays assumed; Q14 OTHER with the user's own key, not the owner's, otherwise greyed out (C); Q15 between students of different years, TA or not (C); Q16 room 30 is a crit room (C); Q17 one desk per student within the general zones (C); Q18 make the boxed desks accessible (C); Q19 rooms bookable first come (C); Q20 base focus on data (C), so MARK05; Q21 keep the headcounts since they derive from the data.
- **Three general instructions:** the feed must express the agents' heterogeneity (voices from traits, AT16); keep every note current; write test cases for the owner (`program/TEST-CASES.md`).
- **Notes updated:** checklist (A8, B4, B5, C3, C5, C6, C12, D1, D14, D17, E10, E11, F2, F5, F9), input-registry (PO3, TM5, SP12, SP6, PL3, new AT16), assumption-data-sources (A4/A5, B4, C5, D1, D5/D17, D14, E11 with MARK05 and GONZ04, F2, new "Layout rearrangement"), agent-variables (new section), summary-metrics (F1), HANDOVER (§5), README; `program/parameters.json` (instructors, office_hours, lecture booking, seminar scheduling, washroom_rule, F1 benchmark, movement levels, manager, gaps).
- **Findings about the method:** the owner's one-line answers mostly turned [A] into C at the level of the *rule* while leaving the *number* [A] (the sessional share, the crit-mode split, the veto probability); the registry's status code should distinguish the two. The re-reading of "rearrangement" shows a design feature can be agreed in words and understood differently; a worked example in the interface (the moves in the feed and the drift overlay) settles it faster than prose.
- **Open items carried forward:** the sessional and office shares; whether the lecture is per year or per section; the veto rule; the exposure screen's measured effect (passers fall to zero because the board takes the tile the path used: a model artefact to check); room 30's crit set and the north-west bay's table in the model; the three headcounts; the rest of the 2026-11-07 lists.

### 2026-11-08, later: open item 25 resolved (the screen's measured effect)

- **Decision:** the desk-exposure count reads one count per walker per pass within two tiles of the desk, weighted 1 / 0.5 by ring and x0.5 through a board, table or wall; F4's benchmark is rescaled to 6 passes an hour [A] and the exposure trigger set to 20 passes an hour [A]. The layout manager checks its daily budget per attempt.
- **Why:** the earlier count (tile-steps within one tile) made every screen read as a total removal, which is a property of the count, not of screens. The new count still lets the route move away (a real effect) while a board between desk and aisle reduces rather than removes.
- **Checked:** headless 2026-10-13 and 2026-10-15 under AGENTS REARRANGE: four moves each (the budget), screens 33 → 4, 51 → 5, 114 → 18, two near zero where the route moved a bay over; the plotter table 893 queue-minutes; F4 8.3 and 6.7 against 6.
- **Notes updated:** summary-metrics (F4), assumption-data-sources (layout rearrangement), `program/QUESTIONS.md` (25 resolved, 27 reworded), `program/TEST-CASES.md` (case 2), `program/parameters.json` (metrics.exposure_count, F4, exposure_passers_per_h), README §11a, BUILD-LOG.
- **Carried forward:** 22, 23, 24, 26, 27, 28 are the owner's; 27 now notes that the screen trigger takes three of the four daily moves.

### 2026-11-11: open items 22, 23, 26, 27, 28 (the owner's second round)

- **Owner's answers:** 22: about 20 permanent faculty, not all teaching studio or with an office in the building; look for data. 23: per year group, the section's own briefing counts as an intro. 24: "I don't think one agent should move another agent's desk, is that what you mean?" (a misreading: desks are never moved; the veto concerns tables and boards near a desk; reworded and left open). 26: "what floor is room 30 on" (Level 2; asked whether it is the APR's 202). 27: "I don't understand" (explained in plain words; left open). 28: keep for now.
- **Data found for 22:** APR24 p. 73: 17 full-time architecture faculty in 2024/25 (16.80 FTE, 6.22 teaching FTE; teaching is 40% or three courses a year) and 15 adjuncts (non-tenure-track, part-time, at most one course a term); seven adjunct names on the three fall studios (ARCH 500 one, ARCH 520 four, ARCH 540 two). Offices (sala.ubc.ca profiles, read 2026-11-11): of 12 architecture faculty whose profile gives an office, 9 are in Lasserre (201C, 201D, 202A x2, 205A, 205B, 309B, 414, 420) and 3 in CIRS; the APR adds that MacMillan also houses SALA faculty offices. Held teaching rooms 301, 309 and 202 in Lasserre have felt pin-up walls, projectors and screens; room 202 seats 60 (APR24, physical resources). The UBC calendar 2025/26 lists 33 sessional lecturers and adjuncts for the whole school; NAAB 2023 gives 46% full-time nationally (context only).
- **Decisions:** sessional share 0.6 [D*] (seven adjunct names on the three fall studios against eleven sections; one adjunct per section assumed); office-in-building share 0.75 [D] (9 of 12 profiles with an office); offices assigned Level 2 first, then 4, then 3 (`population.instructors.office_level_order`); a 15 min section intro at the instructor's spot opens every session [D*] (`studio.sessions.intro_min`); the lecture inside studio moves from [A] to C (APR24).
- **Method note:** the APR is readable with pypdf from the URL in HANDOVER §6; the faculty profiles give office rooms directly. A list of this term's studio instructors would still replace the share with a count.
- **Notes updated:** checklist (A8, B4), input-registry (PO3, TM4), assumption-data-sources (sources: APR24 re-read, new SALA-FAC; A4/A5; B4), agent-variables (instructor fields), HANDOVER §5, `program/QUESTIONS.md` (22, 23, 28 answered; 24, 26, 27 reworded), `program/TEST-CASES.md` (case 1), `program/parameters.json`, README §11a, BUILD-LOG.
- **Carried forward:** 24 (the veto picture), 26 (is room 30 the APR's 202; the north-west bay table), 27 (the trigger numbers), 28 (headcounts, kept).

### 2026-11-11, later: the rooms reviewed against the APR (item 26)

- **Owner:** "if room 30 is the largest classroom with seats, it's probably 202, adjust the model. At the same time, review the other rooms with the accreditation report."
- **Finding:** room 30 (Level 2, 50 m²) has no seats; the largest classroom with seats on Level 2 is room 22 (111.5 m², the owner's large classroom and pin-up space), which matches the APR's 202 (felt, screen, Ezo boards, capacity 60). Applied to room 22, not 30, under the owner's own condition; said so in the reply.
- **Decisions:** room 22 seats four a table (64 chairs; the APR's 60 is a capacity) and carries `capacity: 60`; `apr_room` cross-references on rooms 1, 4, 5, 12, 13, 15, 22, 74, 75 (all inferred); rooms 70 and 77 flagged as candidates for Room 9; rooms 34 and 55 noted against the APR's 402. Engine: chairs in class and crit rooms are seat tiles (walkable), so every chair has a stand and counts; before, room 22 read 25 of 64 and the Level 1 rooms 56 / 64 of 96, which quietly sent year 1 to Level 1.
- **Checked:** Headless after the fix: the classrooms seat 64 (room 22), 84 (15) and 96 (12 and 13), all their chairs; 26 tiles opened as aisles between table rows (10 strips on Level 1, 1 on Level 2) beside the studio's table gap, logged in world.gaps and drawn in the DRIFT overlay; seed 2026 now books year 1's lecture in room 22 on Level 2, year 2 in room 12 and year 3 in room 15. 2026-10-13: 165 present, F1 16.5 min, F2 1.45, F4 8.8, headcounts unchanged; 2026-10-15 under AGENTS REARRANGE: 142 present, four moves, two vetoes. The page loads in the browser without errors.
- **Notes updated:** input-registry (SP12), assumption-data-sources (Category D: room map), HANDOVER §5, `program/QUESTIONS.md` (26 answered with the map; 29–31 new), `program/TEST-CASES.md` (case 1), `program/rooms.json`, `program/objects.json` (O28), `program/TODO.md` regenerated, README, BUILD-LOG.
- **Carried forward:** 24, 27, 28 (owner); 29 Room 9; 30 which of 301/309; 31 the main office and room 34.

### 2026-11-11, night: the test cases run (TEST-RESULTS-2026-11-11.md)

- **Method:** the headless half of the test cases runs from one script with the expectation, the command and the observed values side by side, so the owner can rerun any case and get the same numbers; the browser half is screenshots. Verdicts are against `TEST-CASES.md`, and where the expectation was mine and wrong the file was corrected rather than the engine.
- **Findings for calibration:** the high-stress share in a normal week is 0.48 against the 0.20 of H1 (open item 33); the weekend rule empties the floor by 20:00 before the final (open item 32); between-year ties collapse to the mentor pairs in a week without sessions (the TA increment of 0.01 per session day does not survive the daily decay: F5 against ST8, to revisit); F8 as a mean wait does not show the paper policy's effect (the abandoned jobs would).
- **Findings for the method:** two runs in one session contaminated each other through shared grids, and a random-comparator sort made the browser and the headless runner book different rooms; both fixed and checked by comparing a second-in-process run, a fresh process and the browser move for move. Determinism is now a tested property, not an assumption.
- **Notes updated:** TEST-CASES (cases 2, 3, 8, 9 wording; the results pointer), QUESTIONS (32, 33), README, BUILD-LOG.

### 2026-11-11, late: items 32 and 33

- **Owner:** 32: before a final stress is heightened, late nights and all-nighters likelier, the organised print early for fear of the plotter failing. 33: did not understand "expected vs simulated"; once explained, a normal week depends on personality, 55% before reviews is near the target, lower it; "do as you're suggesting".
- **Diagnosis:** the stress rule's constant daily push had no source and dominated; the urgency signal (other courses' deadlines included) is near its cap all term, so reviews barely moved it. The review rise now comes from the days to the review.
- **Calibration:** five-seed probe (test/_stress.mjs), dials base 0.40 and review_w 0.03 chosen against H1 (20% normal, 33-46% review): 18% and 42%. The personality split (low-N third never high, high-N third almost always) is what the owner asked for and is itself a thing to check against the cohort.
- **Weekend:** the engine's weekend was mine and wrong (3 to 8 hours from a late-morning arrival, no printing); now the term plans the weekend before a review as a working day and prints early by C. Presence of 81% on the Saturday before the final is the number to check.
- **Method:** the term layer now plans the picked day without advancing it, so "the state as of that morning" is true; planFor is pure again.
- **Notes updated:** checklist (H1, E6, D10), input-registry (EC8, BH20, ST2), assumption-data-sources (H1; E6/D10 block), agent-variables, HANDOVER, QUESTIONS (32, 33 answered), TEST-CASES (8, 9), parameters.json (wellbeing.stress, effort.weekend, resources.plotters), README, BUILD-LOG, TEST-RESULTS.

### 2026-11-11, night: the sweep

- **Method:** beyond the twelve owner-facing cases, a sweep checks the engine's invariants over seeds, dates, movement levels, situations and policies, and the term over five seeds; it is the regression test to run after every engine change (`node test/run-sweep.mjs`, about ten minutes; `quick` for a short one). Final pass (after the move fixes): 39 runs, 0 failures; two runs of one seed identical; the term over five seeds 18% high stress in a normal week, 43% before the midterm and before the final, 45 and 61 hours a week.
- **Findings:** cumulative moves could cut the floor (fixed); the sweep's own checks needed three corrections, which is the usual first pass of a test harness. The situations all do what they say on their day; the clash day keeps 34 people past 02:00, which the run's end truncates (the run ends at 02:00; those inside then are the ones who stay past it).
- **Next:** the walkthrough with the owner (`program/TEST-WALKTHROUGH.md`); after it, the judgement calls (80% on the Saturday before the final; the stress split by personality) and the open engine items (TA ties in a reading week; F8 as a mean wait).

### 2026-11-12, morning: walkthrough stop 1 (item 28)

- **Owner:** too many night owls on a normal Tuesday with no deadline; they would work from home; other headcounts fine.
- **Diagnosis:** the late-night rule keyed on the urgency sum, which is above its threshold whenever any deadline is a couple of weeks out, so "late worker" meant "late every night"; and the default day is in the midterm week, which the walkthrough had called a normal Tuesday. The day the owner judges must be the day the label says.
- **Method:** rekeyed on days to the next review (as the stress rule, item 33) with a cap for everyone else on ordinary days; numbers [A] from E3's "others leave by 18:00-20:00 outside crunch". Probe `test/_late.mjs`; a plain Tuesday (2026-11-03) now empties by 20:00 with two past midnight; crunch days unchanged (case 1 bit-identical).
- **Next:** the walkthrough continues at stop 2 (ANALYSE); the sweep should be rerun after the walkthrough since the plain-day evenings changed.

### 2026-11-12, morning: walkthrough stop 3 (item 27)

- **Owner:** screens capped; the interest is in what else the agents do to the space, for its long-term implications.
- **Finding:** a cap alone changed nothing, because the other three moves could never fire in this seed: one tile of reach, one person of queue, a spot search that stopped at the first static fit, and a search ring two metres too tight. A trigger that never fires is indistinguishable from one that is off; `test/_layout.mjs` now shows each trigger's reason.
- **Method:** reach, trigger and spot search changed [A]; the trigger numbers remain assumed and are the owner's to judge once the moves are visible.
- **Next:** rerun the cases and the sweep after the walkthrough; a better effect measure for the kitchen table.

### 2026-11-12, morning: the moves as suggestions (item 27, continued)

- **Owner:** has not seen these moves made; wants the tool to be able to suggest design through the agents' moves as well as through the end-of-day rules.
- **Method:** the agents' moves are the tool's live experiments; a move that stands at the end of the day is read as a proposal for its permanent version, with the measured effect as its evidence. This keeps the two channels distinct: a metric rule says what is wrong, a MOVES suggestion says what the agents did about it and what that would be as design.
- **Limit:** the permanent versions are my wording, one per kind; the owner judges them. The effect measures are only as good as the move's own measure (the kitchen one is weak, see the previous entry).

### 2026-11-12, morning: walkthrough stop 4 (F8)

- **Finding:** a policy that stops people giving up raises the mean wait, so a mean wait alone argues against the policy. The loss has to be its own number (jobs abandoned), shown beside the wait and in the A vs B verdict.
- **Method:** no new parameter; a count the engine already had (plotter outages) made visible in the metric and the rule.

### 2026-11-12, morning: walkthrough stop 5 (events, Fridays)

- **Owner:** Good Times too full; people grab and go; Fridays empty early after the crit when people have plans.
- **Diagnosis:** a situation that re-rolls attendance on a day that already has the event doubles it; the stay was the whole event for everyone; nothing made a Friday a Friday.
- **Method:** a situation on its own calendar day is the day as it is; grab-and-go as a share with a short stay; Friday plans at the moment the crit ends, since the plan does not know the crit time in advance. Numbers [A]. The sweep tests event situations on days without the event, where the situation itself is what is tested.
- **Next:** the owner's reading of "50-60 at Good Times" (through the evening, or at once).

### 2026-11-12, morning: walkthrough stop 8 (the lift)

- **Owner:** nobody takes the lift for one floor to the washroom unless tired or with a mobility need; a model is different; the voices must stay distinct.
- **Diagnosis:** the lift was a 20% coin toss for one floor; the first rewrite keyed tiredness on a 4 h sleep debt and made things worse, since the median student carries 6 to 7 h before a review. A threshold must sit against the distribution it cuts (`term.state.sleepDebt` quantiles were read before setting 9 h).
- **Method:** the reason for each choice is counted (`stats.liftChoice`), so the rule can be checked against what people say they do. The mobility share is a placeholder with no data and is marked as such.

### 2026-11-12, late morning: the walkthrough closed

- **Method:** ten stops in the viewer with the owner, each a run on screen and one question; seven engine changes came out of the owner's answers (items 27, 28, the Good Times doubling, Friday plans, the lift, F8's abandoned count, the moves as suggestions), each applied and verified the same morning, then the sweep rerun: 0 failures over 39 runs.
- **Finding:** every change came from the owner seeing a number and saying it was wrong for a reason; the reasons (people work from home, grab and go, leave after the crit, take the stairs for one floor) are behaviour the notes had not captured. The walkthrough is the method that finds them.
- **Next:** item 34 (long-term moveable changes by the agents) this evening; the dated results file with verdicts for the rerun cases; the open engine items (between-year ties in a reading week, the duplicated last term snapshot, the kitchen table's effect measure, the 3D view's run speed).

