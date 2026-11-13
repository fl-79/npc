# Handover to the next Claude Code session

Written 2026-11-06 by the previous Claude Code session. **Read this first, then [README.md](README.md) and [methodology-log.md](methodology-log.md).** This note tells you what was designed, which notes exist, the working methodology the user expects, how to update notes, and where to pick up.

---

## 1. Context

- **User:** M.Arch student, ARCH 540 Studio (UBC SALA), Fall 2026. Pronouns not stated; use they/them.
- **Project:** a tool that simulates agents (LLM-assisted plus numeric) occupying the **3rd-floor studio of the Frederic Lasserre Building**, to evaluate how well a layout supports **collaborative and creative work**.
  - The tool code lives in `Tool-V2/` (a Revit model plus a viewer; see the user's memory notes).
  - This `research/` folder is the **evidence and design basis** for the agent behaviour, and part of the case study.
- **Explicit user goals:**
  1. Agent behaviour grounded in literature and data, with **references for everything**.
  2. A **repeatable method** that works for other buildings and occupant groups.
  3. **Documenting the methodology is itself a deliverable.** Keep every note current.
- **Persistent memory:** `C:\Users\felic\.claude\projects\…Tool-V2\memory\studio-assumptions-workflow.md` holds the workflow rules below in short form.

---

## 2. What was designed (summary)

| Layer | Design | Note |
|---|---|---|
| **Outputs** | Metrics for collaboration (C1–C15), focus/creativity (F1–F14) and layout (S1–S8); a recommended core 12; report collaboration vs focus as a **Pareto view** | summary-metrics.md |
| **Domain knowledge** | Architecture studio culture from the literature: themes, 8 student + 3 staff personas, behaviour rules | summary-studio-culture.md |
| **Site instance** | All UBC values, checklist categories A–J (program, schedule, crits, space, time use, social, costs, well-being, persona mix, model parameters) | studio-culture-school-checklist.md |
| **Provenance and models** | Every source, calculation and statistical model behind the values | assumption-data-sources.md |
| **Generic schema** | Every input with a site-independent ID in 13 categories (SP, PO, OR, TM, AC, EV, RS, PL, AT, ST, BH, SO, EC); status codes; **provenance ledger** (who supplied each of 105 items); data-effort table; 7-step repeatable process | input-registry.md |
| **Agent design** | Profile (role and action set, skills and strengths, 4 kinds of knowledge); physical needs; mood; place familiarity; memory, retrieval, reflection, planning (Generative Agents); arbiter; **availability as a 0–1 scale**; limited perception; hybrid numeric + LLM execution | agent-architecture.md |
| **Personality** | **Big Five** core + **Whole Trait Theory** momentary states + **MBTI derived for display only**; log-linear trait → behaviour mapping table; swappable module | personality-model.md |
| **Per-agent variables** | Everything that differs between agents (personality, circumstances, habits, social traits, money and well-being, body and cognition, skills, states) + persona bias table | agent-variables.md |
| **Limits of data** | 41 subjective components (S1–S41) and how the user includes them by judgment: weight, scenario, narrative or interpretation | subjective-components.md |

**Statistical and behavioural models adopted** (all referenced in assumption-data-sources.md):
- **Leaving studio:** hazard / survival model (Page 2008; Cox 1972) with a crit-queue constraint.
- **Crit length:** shifted lognormal (Brown 2005).
- **Plotters:** a 2-server queue with paper running out ("vacations", Doshi 1986).
- **Effort:** Temporal Motivation Theory (Steel 2007).
- **Sleep:** Borbély two-process model plus a **two-part (hurdle) all-nighter model** (Cragg 1971; Van Dongen 2003/2004).
- **Breaks:** renewal process.
- **Social:**
  - comfort via familiarity (Reis 2011)
  - tie formation (Festinger 1950; Kossinets & Watts 2006)
  - help-seeking cost (Karabenick 2003; Edmondson 1999)
  - channel choice (Daft & Lengel 1986)
- **Interruptibility / availability:** Backhouse & Drew 1992; Fogarty 2005; Mark 2008.
- **Agents:** Generative Agents, Humanoid Agents, MineLand, IndoorWorld (papers in `../../Research/Agent/READ/`).
- **Parameter screening:** Morris 1991.

---

## 3. The notes: 13 files in `research/`

| # | File | Role | Update when |
|---|---|---|---|
| 1 | **HANDOVER.md** | This note | At handover points |
| 2 | **README.md** | Table of contents, quick lookup, checklist progress | A note is added, or a category's status changes |
| 3 | **methodology-log.md** | Dated chronology. **Append only** | **Every step** |
| 4 | references.md | Planned reading list (pre-existing) | New sources planned |
| 5 | summary-metrics.md | Outputs | Metrics change |
| 6 | summary-studio-culture.md | Literature culture and personas | Rarely (literature base) |
| 7 | studio-culture-school-checklist.md | Site values A–J | Each category the user confirms |
| 8 | assumption-data-sources.md | Sources, calculations, models per category | Each category |
| 9 | input-registry.md | Generic schema + provenance ledger | Each category; any new input |
| 10 | agent-architecture.md | Agent design | Architecture decisions |
| 11 | personality-model.md | Personality module | Personality decisions |
| 12 | agent-variables.md | Per-agent variables | Any per-agent item |
| 13 | subjective-components.md | Non-quantifiable factors | New judgment-based factors appear |

Sizes: about 47k words in total. The largest are assumption-data-sources (about 10k), input-registry (about 7k) and the checklist (about 6k).

Source PDFs: `research/2026-11-03 Collab/` (9) and `research/2026-11-03 Practice/` (10).

---

## 4. Methodology devised with the user (follow it)

### 4a. The confirmation loop (one category at a time)
1. Present a checklist category. Each item shows the literature reference value, the current default, and a blank for the user's value.
2. The user answers. Typical answers: a confirmed value, "use data", "use a statistical model", or a qualitative condition ("depends on the student").
3. For each answer:
   - **Confirmed** → record it as C.
   - **"Use data"** → search for real data. In order: institutional documents (the UBC APR 2024), national statistics (CACB, CGPSS), campus reports (calendar, transport), then the literature. Record the source, page and exact figures. Mark adjusted values D*.
   - **"Use a model"** or a described behaviour → **find an established statistical or behavioural model** and cite it. If none exists, assemble one from cited components and say that it's your adaptation.
   - **Conditional / "depends on the individual"** → make it a per-agent variable, linked to personality where possible.
4. Run quick calculations or simulations (Python, numpy) to check that defaults produce sensible results. Example: the crit overrun and all-nighter shares were both checked with 100k draws. Report the outputs.
5. Flag contradictions between the user's answers and the data. Example: the user's 50/50 gender placeholder vs APR data showing about 60% women. **Data overrides a placeholder, but say so.**
6. Accept corrections that change a model's **structure**, not only its values. Example: the single-threshold all-nighter model was replaced by a two-part model after the user observed that "many sleep less but don't pull all-nighters".

### 4b. Update protocol after each confirmed category (update ALL of these)
1. **Checklist:** fill in "Your value", add a status line (`**Category X status: confirmed DATE.**`), and mark [A] where values are assumed.
2. **assumption-data-sources.md:** a new "Category X" section with a sources table (key, citation, link, figures), calculations, models and assumptions.
3. **input-registry.md:**
   - convert that category's table to the "Generic input + Example names" format if it isn't already;
   - add new IDs;
   - update the **provenance ledger** and its summary counts.
4. **agent-variables.md:** any per-agent items, plus a row in "Added per checklist category".
5. **subjective-components.md:** new S-items, plus the per-category table.
6. **personality-model.md / agent-architecture.md:** if the answer touches personality or agent design.
7. **methodology-log.md:** a dated entry (what the user confirmed, data found, models adopted, registry changes, open items). Move resolved items out of "Open items carried forward". **Never rewrite past entries.** Mark superseded material with "Superseded (date)" in the relevant note.
8. **README.md:** checklist progress, and new notes.

### 4c. Conventions
- **Status codes:** C confirmed · D data · D* adjusted data · M model · A assumed · O observed · S subjective. **[A]** inline for every assumed number.
- **References always.** Cite models with author, year, journal, volume and pages where known. Say when a source is weak (blogs, informal surveys), secondary, or unverified.
- **Generic registry names** must not mention school, program or academia. Domain terms go in "Example names".
- **Placeholders** are flagged in notes or code, never baked into names (also a user memory rule).
- **Personality:** behaviour reads Big Five **states**, never MBTI. MBTI is display only.

### 4d. User communication preferences
- Wants **references and recorded assumptions** every time.
- Answers categories in batches. Some items are left unanswered (e.g. E10). Keep the default and list it as open.
- Values first-hand experience over US literature (US sources may not reflect UBC). Flag US/old-data limitations.
- Likes proposals with a recommendation, then decides. Ask one clear question at the end of a turn.

---

## 5. Current state and where to pick up

**Checklist progress:**
- A–H confirmed.
- I (persona mix) **closed 2026-11-07**: the user chose **traits only**. Personas are not an input; the traits-only mappings in agent-variables.md replace the persona table.
- J kept as unreferenced defaults, to be screened by sensitivity analysis.

**Personality:** Big Five + Whole Trait Theory + MBTI display decided. **Still open:** CAPS if–then rules; add-ons (perfectionism, chronotype linked to C/E); the mapping weights (including the new traits-only mappings). Personas: **decided, traits only** (2026-11-07).

**Architecture:** agreed. **Still open:** LLM budget (full vs numeric-only agents); calibrating need rates; whether custodial and security staff are modelled.

**Other open items:** E10 meals; library closing time (22:00 assumed); crit rooms (301/309?), lecture room and event locations (at room labelling); a sensitivity screening plan; an observation programme (headcounts, crit timings, plotter log, sleep / hours survey, washroom and kitchen trip counts, **a cohort personality survey: BFI-2-S or IPIP-NEO-120**); computing the IPIP-NEO Canada 22–32 correlation matrix; the AIAS 2020 survey PDF (403 to automated download; the user could fetch it).

**2026-11-08:** the owner answered the build's 21 questions (`program/QUESTIONS.md`, methodology log 2026-11-08). Applied in the tool: washrooms by floor and role; room 30 used as a crit room; the boxed desks reached through a rolled-open gap; adjunct and permanent instructors with or without an office, crit modes desk / spot with a crowding switch; office-hour visits by student; lectures and seminars booked first come from a per-seed timetable; the focus benchmark from MARK05; "agents rearrange" (the agents enact the suggestions live, traced and measured); OTHER situations read with the user's own key or greyed out; trait-driven voices in the feed. Still [A]: the sessional and office shares, the crit-mode split, the veto rule, the move triggers, lunch, Good Times size, the headcounts.

**2026-11-11:** open items 22 and 23 answered with data (methodology log 2026-11-11): the APR's faculty table and adjunct list give the sessional share (0.6 [D*]) and the faculty profiles the office share and floors (0.75 [D], Level 2 first); every session opens with a 15 min section intro at the instructor's spot [D*]. Item 25 (the screen's effect) resolved on the engine side. Still open: the veto rule (24), the move triggers (27), the headcounts (28, kept for now). Later the same day the rooms were reviewed against the APR (item 26 answered: room 22 is 202 with 64 seats; the APR room map is in QUESTIONS.md and assumption-data-sources Category D); new open items 29–31 (Room 9, 301/309, the main office 402 and room 34). The twelve test cases were run (`program/TEST-RESULTS-2026-11-11.md`); from them the owner answered 32 (the weekend before a review is a working one, the organised print early) and 33 (stress by personality in a normal week, lower before reviews): the stress rule was rebuilt on the days to the review and calibrated to H1 (18% normal, 42% pre-review).

**Likely next step:** moving from research to the tool build: mapping registry IDs to code parameters (the tool session has read all notes as of 2026-11-06; see the methodology log). Remaining personality choices: CAPS rules, add-ons, weights.

---

## 6. Practical tool notes (things that tripped up the previous session)

- **Shell:** Windows; Git Bash and PowerShell. `pdftotext` (Git Bash) works. There is **no OCR** and no `pdftoppm`. Read scanned PDFs page by page with the Read tool, or extract the images with pypdf.
- **Bash heredocs (`cat >> file << 'EOF'`) failed repeatedly** with "unexpected EOF" on long content. **Use the Edit tool to append** (anchor on the file's last lines) or Write.
- **Web PDFs:** the web-fetch agent returns raw binary for PDFs and can't parse them, but the harness **saves the PDF** to the session's `tool-results` folder. Run `pdftotext -layout` on that saved file.
  - Some sites return 403: AIAS, cdnsciencepub.
- **The extracted texts from the previous session** (APR 2024, CACB 2025, CGPSS 2022, transport report, and the 19 research PDFs) were in a **temporary scratchpad that does not persist**. Re-extract as needed:
  - research PDFs: `pdftotext -layout "research/2026-11-03 Practice/<file>.pdf" out.txt`
  - APR: download from <https://cacb.ca/wp-content/uploads/2025/06/Architecture-Program-Report-APR_University-of-British-Columbia_2024.pdf> (about 54k words). It is the best UBC-specific source: admissions table, facilities, student survey, Good Times, mentorship, wellness.
- **Known source-file problems:**
  - `237713056.pdf` = Suckley & Nicholson 2018, not Peponis 2007.
  - The Schön PDF ends at p. 69, without the Quist/Petra chapter.
  - The `rstb` files are duplicates.
  - The KEYS PDF is a scan.
  - Text extraction drops minus signs in tables.
- **Large files:** assumption-data-sources.md and input-registry.md are long. Use Grep to find section anchors before editing, rather than reading the whole file.
- **The app's planning / wrap-up tools:** keep the task list current and end each turn with a short recap; ask at most one question.

---

## 7. Findings about the method so far (for the case-study write-up)
- From the provenance ledger (105 items): the insider contributed to **68%** and settled **26%** alone.
- Structural items (categories A–D) are largely knowable by an insider. Behaviour magnitudes (E–F) needed data and models; the insider gave direction and conditions, not distributions. Model-internal parameters (J) are beyond insider knowledge and need sensitivity analysis or observation.
- Insider input can change a model's structure (the all-nighter model).
- Per project: an insider interview series (about 2–3 h), 1 institutional report, a few public statistics sources, about 25 reusable literature models, and a small observation programme.
