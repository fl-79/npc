# Research notes: table of contents

Index for the `research/` folder of the studio-simulation case study. Start here to find which note tracks what. Updated 2026-11-05.

**New here? Start with [HANDOVER.md](HANDOVER.md)**: reading order, key decisions, conventions, open items.

## The notes

| # | Note | What it tracks | Scope | Updated when |
|---|---|---|---|---|
| 1 | [references.md](references.md) | The planned reading list, with links, grouped by topic | Reading list | New sources are planned |
| 2 | [summary-metrics.md](summary-metrics.md) | **Outputs.** Metrics for how well a space supports collaborative and creative work, taken from the Collab literature. Each metric has its formula, benchmark and whether it can be computed in a simulation (collaboration C1–C15, focus/creativity F1–F14, layout S1–S8) | Generic | Metrics change |
| 3 | [summary-studio-culture.md](summary-studio-culture.md) | **Domain knowledge.** Architecture studio culture from the Practice literature: themes, the 8 student and 3 staff personas, behaviour rules, gaps | One occupant type (architecture students) | Culture findings change |
| 4 | [studio-culture-school-checklist.md](studio-culture-school-checklist.md) | **Site instance.** Every school-specific value for UBC SALA M.Arch (3rd floor, Lasserre), confirmed by you one category at a time (A–J) | One site | Each category you confirm |
| 5 | [assumption-data-sources.md](assumption-data-sources.md) | **Provenance and models.** The source, calculation or statistical model behind each value, by category: data tables, models such as the hazard departure model, the crit queue, the plotter queue, the TMT effort model and the two-part sleep model, and every assumption [A] | One site | Each category |
| 6 | [input-registry.md](input-registry.md) | **Generic schema.** Every input under a site-independent name in 13 categories (SP, PO, OR, TM, AC, EV, RS, PL, AT, ST, BH, SO, EC), with examples from other building types; status codes; the **provenance ledger** (insider vs data vs model vs assumed, for every item); the data-effort summary; the 7-step process for a new site | Reusable | Each category; new inputs |
| 7 | [agent-variables.md](agent-variables.md) | **Per-agent variables.** Personality (Big Five), circumstances, work habits, social traits, skills and dynamic states. Everything that differs from one agent to another, with distributions and persona biases | Reusable structure; studio values | Each category |
| 7a | [agent-architecture.md](agent-architecture.md) | **How an agent works.** Profile (role and action set, skills and strengths, 4 kinds of knowledge); physical needs (hunger, thirst, washroom, sleep, mental and physical fatigue, social); mood, place familiarity; cognition (memory stream, retrieval, reflection, planning); the arbiter (task prioritization); **availability as a scale** (headphones negotiable, crit = hard block); limited perception; hybrid numeric + LLM execution | Reusable | Architecture decisions |
| 7b | [personality-model.md](personality-model.md) | **Personality module.** Decided: Big Five core + Whole Trait Theory states + MBTI display layer. Candidate psychology models (Big Five, HEXACO, BIS/BAS, Whole Trait Theory, CAPS, MBTI caveats, add-ons); the swappable module design; the mapping table from traits to agent variables (log-linear weights); which subjective components personality informs; open choices | Reusable | Personality decisions |
| 8 | [subjective-components.md](subjective-components.md) | **What data can't carry.** Factors that matter but can't be quantified (S1–S34+), and how you can include them by judgment: weight, scenario, narrative or interpretation | Mostly generic | Each category |
| 9 | [methodology-log.md](methodology-log.md) | **Process record.** Dated log of every step, decision, correction and open item. Append only | This case study | Every step |
| 10 | README.md (this note) | Table of contents | — | When notes are added |
| 11 | [HANDOVER.md](HANDOVER.md) | **Handover:** what the project is, reading order, how the notes fit together, settled decisions, conventions, open items, source-file caveats, findings about the method | All | At handover points |

## Source folders

| Folder | Contents |
|---|---|
| `2026-11-03 Collab/` | 9 PDFs on collaborative / knowledge-work environments (Kabo, Bernstein & Turban ×2, Sailer & Penn, Suckley & Nicholson, Heerwagen, Gensler 2024, Amabile, Hillier) |
| `2026-11-03 Practice/` | 10 PDFs on architecture practice and studio culture (AIAS 2002 / 2004 / 2008, Battisto 2024, Schön excerpt, Sabna 2026, Gray 2022, Furniss 2020, *Studio Teaching in Higher Education*, Amabile KEYS) |

## Quick lookup: where to find…

| If you want… | Go to |
|---|---|
| A UBC value (e.g. crit length, studio hours) | Checklist (4), then the matching section of the data note (5) |
| Why a value is what it is, and its reference | Data note (5) |
| Whether a value came from you, data, a model or an assumption | Provenance ledger in the registry (6) |
| How to reuse this for another building or organisation | Registry (6), "Repeatable process" |
| What makes one agent different from another | Agent variables (7) |
| How personality drives those differences, and which psych model | Personality model (7b) |
| How an agent perceives, remembers, plans, decides; needs; availability | Agent architecture (7a) |
| What the model can't represent | Subjective components (8) |
| What was decided when, and what's still open | Methodology log (9) |
| What the simulation will measure | Metrics summary (2) |
| Personas and behaviour rules from the literature | Culture summary (3) |

## Checklist progress

| Category | Status |
|---|---|
| A Program and cohort | ✔ confirmed |
| B Schedule and course load | ✔ confirmed |
| C Crits and reviews | ✔ confirmed |
| D Space and access | ✔ confirmed |
| E Time use and behaviour | ✔ confirmed (E10 meals open) |
| F Social dynamics | ✔ confirmed (F8 unknown) |
| G Costs and resources | ✔ confirmed / data |
| H Well-being and support | ✔ confirmed / data |
| I Persona mix | closed 2026-11-07: traits only, no personas as inputs |
| J Model parameters | kept as unreferenced defaults; to be screened by sensitivity analysis |
