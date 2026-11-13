# Subjective components: what the data can't carry

Started 2026-11-05. Updated as each checklist category is confirmed. This is part of the case-study methodology record.

## What I understand you're asking for

You want a list of the factors that clearly shape how a studio supports collaborative and creative work, but that the quantitative inputs can't represent or calibrate. These are things we have no data for, things that resist measurement, or things whose meaning depends on interpretation.

For each one the note says:
1. **What it is,** and why it matters (with the source that says it matters).
2. **Why it falls outside the data-driven model:** no data, can't be measured, or depends on interpretation.
3. **What partly stands in for it already,** so we don't double-count.
4. **How you could include it subjectively.** There are four ways:
   - **Weight:** your judgment sets a multiplier on an existing parameter or metric.
   - **Scenario:** your judgment defines alternative runs to compare ("what if the cohort is guarded?").
   - **Narrative:** your judgment written into the LLM agent's persona or memory prompt.
   - **Reading the results:** your judgment applied when interpreting outputs, not inside the model.

Anything set this way is tagged **S** (subjective) in the [input registry](input-registry.md) status codes. The case study can then report which results rest on data (C/D/O), which on the modeller's assumptions (A), and which on your judgment (S).

The note is **separate from the checklist** on purpose. The checklist asks "what is the value?" This note asks "what can't be a value, and how do we handle it honestly?"

---

## 1. The work itself: design quality and creativity

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S1 | **Quality and originality of design work** | It is the actual output of a studio (Amabile: creativity = novel + appropriate) | It needs expert judgment, the "consensual assessment" of experts. An LLM judge is only a weak proxy | F13 LLM novelty score; F14 iteration count | Reading the results: the user or invited critics rate sample agent outputs. Treat F13 as exploratory |
| S2 | **What counts as "good design"** (the studio's design values) | Instructors differ in what they reward (ST Ch. 18 "epistemology"; C10 says process is folded into an overall impression) | Tacit, varies by instructor, not written down | EV14 instructor style | Narrative: each instructor agent gets a short written design stance |
| S3 | **Reflection-in-action and tacit knowing** (Schön) | This is how designers actually learn. Surprise leads to reframing | Tacit by definition. Schön: it "cannot be told" | BH11 reframe probability | Narrative plus a weight on BH11 per persona |
| S4 | **Inspiration from others' visible work** | Pinned work acts as precedent (ST Ch. 18) | The model can count exposure, but not whether the work seen was inspiring | Visibility and exposure counts (SO5) | Weight: a quality multiplier on exposure, e.g. stronger from upper years or pin-up walls |
| S5 | **Quality of crit feedback** (insight vs vague vs harsh) | A late crit with substantial changes causes crunch; harsh critique lowers motivation (KEYS) | Content can't be measured. Only time and frequency are modelled | EV3 length, EV14 style | Scenario: run with "high-quality feedback" vs "mixed" crit effects on ST3/ST4 |

## 2. Atmosphere and the felt quality of the space

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S6 | **Beauty, light, views, "inspires new thinking"** | Gensler's experience index; views restore attention (Heerwagen) | Perceived and personal. Gensler says beauty drives experience, but it can't be derived from geometry | Daylight could be computed separately | Weight per zone ("inspiring" 0–1) that affects motivation recovery when an agent works there |
| S7 | **"Vibe" / energy of the studio at night or before reviews** | The camaraderie of shared crunch (Battisto: bonds "built through commiseration"; Cuff) | Emergent and emotional; no measure | Co-presence counts at night (C9 metric) | Reading the results: interpret late-night co-presence as positive (bonding) or negative (burnout) |
| S8 | **Mess, clutter and tolerance for it** | Making needs space to "leave a mess" (Furniss); clutter also blocks circulation | Not quantified; personal tolerance varies | SP6 desk size | Scenario: "messy studio" reduces effective desk and circulation width |
| S9 | **Thermal, air and acoustic comfort as felt** | Affects how long people stay and how well they focus | We have no measured environmental data for the floor | F3 noise field (computed) | Weight per zone, or a later environmental model |
| S10 | **Territory, ownership and identity** ("my desk", the section's "corner") | Place attachment (Sailer & Penn); students "move in" (*ST* Ch. 8) | A feeling, not a count | Return-to-same-desk rate | Narrative: an attachment trait; reading the results for hot-desk vs dedicated scenarios |

## 3. People, relationships and emotions

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S11 | **Friendships, rivalries, romance, conflict** | They decide who helps whom and who sits where | Private. No data, and collecting it would be invasive | ST8 tie strength (from encounters) | Narrative: seed a few pre-existing ties per cohort (Year 2–3 cohorts know each other) |
| S12 | **Psychological safety in a section** | Whether people ask for help (Edmondson); supportive vs guarded cohort (*ST* Ch. 8) | Group-level and invisible | SO1 culture mode; AT6 help threshold | Scenario: safe vs guarded per section, from your experience |
| S13 | **Power dynamics and fear around crits and juries** | "Pedagogy of fear" (Gray 2022); value of design confused with value of self (Kellogg) | Emotional; differs by person and instructor | ST4 confidence; EV14 | Narrative per persona + instructor; reading the results for wellbeing outputs |
| S14 | **Instructor charisma, availability and personality** | Students follow some instructors more closely ("role models", Sabna 2026) | Individual and not measured | EV14 style | Narrative: describe each instructor in a sentence |
| S15 | **Sense of belonging; cultural or language barriers** | International students and newcomers (A10, OR7); "masculine and white" studio (AIAS 2002) | Lived experience; no UBC-specific data | PO6, PO7, OR7 counts | Narrative + weight: a belonging trait that lowers help-seeking initially |
| S16 | **Motivation sources** ("the calling", pride, grades, fear) | Intrinsic motivation drives creativity (Amabile) | Inner state; only proxies | ST3 motivation | Narrative per persona (already partly in the culture note) |
| S17 | **Personal life events** (illness, family, breakups) | They disrupt work (Pable, *ST* Ch. 8) | Random, private, unpredictable | — | Scenario: random disruption events at a rate you choose |

## 4. Culture and norms

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S18 | **Hustle / all-nighter status culture at UBC specifically** | The norm of hours spreading between neighbours (BH4) | Sources are US 2002–2024; UBC culture is your lived knowledge | SO6, BH4 | Weight: set the norm-contagion strength from your experience |
| S19 | **Unwritten studio rules** (music, food, who sits where, borrowing tools) | They shape daily interaction | Tacit, local, change by cohort | PL6 noise norms | Narrative: a short "studio house rules" text given to all agents |
| S20 | **Reputation and informal status** (the "strong" student whose desk people visit) | Creates attractors in the help network | Social perception | Degree centrality (emergent) | Narrative: tag 1–2 agents per section as "go-to" for a skill |

## 5. Interpretation and values (the modeller's and your choices)

| # | Component | Why it matters | Why outside the data | How to include it |
|---|---|---|---|---|
| S21 | **What "good collaboration" means for this studio** | Metric weights decide which layout "wins" | A value judgment: more contact isn't always better (Bernstein) | Reading the results: state your weighting before comparing layouts. Prefer a Pareto view to a single score |
| S22 | **Acceptable trade-off between focus and interaction** | Heerwagen's "central dilemma" | Depends on project phase and personal values | Scenario: weights by phase (early: interaction; pre-review: focus) |
| S23 | **Wellbeing vs output** | The model may show layouts that raise output by raising late hours | Ethical judgment | Reading the results: report wellbeing metrics next to output; don't optimise output alone |
| S24 | **How much the simulation should match your experience vs the literature** | US sources may not reflect UBC | Validation without full data | Reading the results: a structured gut-check (face validity) after each run, logged in the methodology log |

## 6. Space and access (added with Category D)

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S25 | **Feeling safe and comfortable alone in the building at night** | Affects who stays for all-nighters (24/7 access, D6–D7) and whether people stay in pairs | Personal and situational; affected by gender, lighting, security | Overnight presence model | Weight: a night-stay multiplier per persona/modifier; scenario with "buddy" norms |
| S26 | **Frustration when resources fail** (plotter out of paper at 2 am, no laser slot) | Adds to stress and shapes how people remember the space; can either bond people ("we're all stuck") or isolate them | Emotional meaning of the event | Queue wait and failure counts (D10 model) | Weight on the stress increment per failure; reading the results: failure events as wellbeing hotspots |
| S27 | **Headphone etiquette** (is it OK to interrupt someone wearing headphones?) | Decides whether headphones fully block contact or just raise its cost | Local norm, varies by cohort and friendship | **Now structured by the user (2026-11-05):** availability is a scale; headphones come off for groupmates or important requests unless the wearer is very focused or stressed; nobody interrupts a crit (BH30) | Remaining judgment: the multiplier values and how strictly the cohort respects headphones |
| S28 | **Desk neighbourhood quality** (who you sit next to) | Neighbours drive overhearing, help and norm contagion (BH4) | Assignment is partly social (friends ask to sit together) | Section grouping (D1, D5) | Scenario: random vs friend-clustered seating within a section |
| S29 | **Being away from the community at the off-site shop** | Making happens in another building, so making-heavy students miss studio life | The model counts absence, but not what it costs socially | Off-site trip time (BH18) | Reading the results: compare ties and overhearing for maker-heavy agents |
| S30 | **Visual and material richness of the studio** (pinned work, models, mess) | The atmosphere and "precedent library" effect (*ST* Ch. 18) | It changes daily and its quality is interpretive | Display surfaces (SP9–SP11) | Weight on display exposure; links to S4 and S8 |

## 7. Time use (added with Category E)

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S31 | **Productive vs present hours** (flow, "staring at the screen", diminishing returns late at night) | Hours in the building ≠ design progress. The AIAS myths equate them | No data on productivity per hour for design work. Quality is subjective (S1) | ST1 sleep pressure can reduce work rate | Weight: a productivity curve over sleep pressure and time of day that you shape from experience |
| S32 | **Whether home is a workable place** (roommates, space for models, commute) | Decides who works off-site vs stays late (E9) | Private and highly variable | AC6 off-site share; A12 commute | Narrative per agent ("small shared apartment, can't build models at home"); scenario on the off-site share |
| S33 | **What an all-nighter means** (badge of honour, failure, or bonding) | Changes how all-nighters affect stress and norms (AIAS 2002 "badge of honour"; Battisto) | Cultural meaning, varies by person | BH21 all-nighter decision; SO6 status culture | Weight: the stress per all-nighter and its effect on norm contagion. Scenario: base vs "intense culture" (p_event × 3) |
| S34 | **Work style as identity** ("I'm a night person", "I work best under pressure") | Students' self-concept drives the late-work choice as much as chronotype does | Self-perception, not measured | AT10 chronotype; AT11 impulsiveness | Narrative in the persona prompt |

## 8. Social life (added with Category F)

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S35 | **What makes asking a friend "easy"** (mood, closeness, not wanting to bother them) | It decides the first rung of the help ladder (F2) | Moment-to-moment social judgment | Tie strength, availability, headphones (BH9) | Narrative per agent; weight on social cost |
| S36 | **Fun and the felt community at events** (Good Times, Halloween, Waffle Wednesday) | Belonging and recovery; ties between years | The quality of the experience isn't measurable | Attendance and ties formed (BH23) | Reading the results; weight on the stress reduction per event |
| S37 | **Off-campus friendships and celebrations** | Ties formed outside the building carry back into the studio | Not observable in the model | Ties strengthen when absent together | Narrative: seed friend groups; scenario |
| S38 | **Keenness / passion for the work** | Drives curiosity and hours (F6) | An inner state, partly persona | ST3 motivation; O trait | Narrative per persona |

## 9. Money, pressure and support (added with Categories G–H)

| # | Component | Why it matters | Why outside the data | Partial stand-in | How to include it |
|---|---|---|---|---|---|
| S39 | **Money worries and how they shape design choices** (smaller models, fewer prints, guilt about spending) | Cost can limit ambition; inequity between students | Personal finances are private; spending decisions are tied to identity | EC1–EC5 spend, budget and cost saving | Weight on the budget per agent; scenario: "material subsidy" or "free printing" |
| S40 | **How "push for your best work" is heard** (motivating vs pressuring) | The same instructor message can inspire or drive crunch | Interpretive, varies by student and instructor tone | EC7 p_push; ST3 motivation | Narrative per instructor; weight on the push sensitivity |
| S41 | **Stigma and comfort around seeking formal help** | Explains the treatment gap (25% diagnosed vs 57% suspecting) | Private and cultural | EC6 uptake rate | Weight on the uptake rate; scenario: "embedded wellness peer on the floor" |

---

## Added per checklist category

| Category | New subjective components |
|---|---|
| A (cohort) | S15 belonging and cultural barriers; S11 pre-existing ties among the Year 2 newcomers who join with advanced standing |
| B (schedule) | Instructor strictness about attendance is set by style (EV14), but *how* each instructor enforces it (glances, comments, sign-in) is subjective → S14 |
| C (crits) | S5 feedback quality; S13 fear and power in reviews; S2 instructor design values; the felt pressure of having guests at the final (more external critics) → S13 |
| G–H (costs, well-being) | S39 money worries; S40 how instructor push is heard; S41 stigma around seeking help |
| J (parameters) | Not subjective in kind, but with no references the J values effectively become your judgment (status S) unless sensitivity analysis shows they don't matter |
| F (social) | S35 what makes asking "easy"; S36 felt community at events; S37 off-campus friendships; S38 keenness. Most per-agent social variation is now modelled through personality in agent-variables.md, so what remains here is the *meaning* of the interactions |
| E (time use) | S31 productive vs present hours; S32 suitability of home; S33 meaning of an all-nighter; S34 work style as identity. Your observation set the all-nighter structure (more before finals, sleeping less is common). The persona odds ratios remain your judgment (S18) |
| D (space) | S25 night safety; S26 frustration when resources fail; S27 headphone etiquette; S28 desk neighbourhood; S29 distance from community at the off-site shop; S30 visual richness. Already listed and now more relevant: S8 mess, S9 felt comfort (no quiet rooms), S10 territory (dedicated desks) |
