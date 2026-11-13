# Data behind the studio-culture assumptions

This is a running log of outside data used to set or check items in [studio-culture-school-checklist.md](studio-culture-school-checklist.md). I add to it as each category is confirmed.

Each entry gives:
- the checklist item
- the source, with a link and the page or table
- the exact figures
- how far they apply to UBC M.Arch
- the default chosen

Figures marked "(calculated)" are my own arithmetic from the source tables.

Generic input IDs (e.g. PO5 Gender distribution) are listed in [input-registry.md](input-registry.md).

## Sources used

| Key | Source | Link | Notes |
|---|---|---|---|
| **APR24** | UBC SALA, *Architecture Program Report* for CACB accreditation, 2024 | [cacb.ca PDF](https://cacb.ca/wp-content/uploads/2025/06/Architecture-Program-Report-APR_University-of-British-Columbia_2024.pdf) | Most specific source: the program describes itself. The admissions table is from the Admissions section and covers 2018–2023. The table's rows are scrambled in the text extraction. I rebuilt them by checking that male + female = total enrolled for each year (true in 5 of 6 years), but check against the PDF. **2026-11-11:** re-read with pypdf (166 pages, 55k words) for the faculty table (p. 73), the adjunct list, the physical-resources list (rooms 301, 309, 202) and the studio feedback modes |
| **SALA-FAC** | UBC SALA faculty profiles, sala.ubc.ca/people/faculty and the 18 architecture profiles, read 2026-11-11 | [sala.ubc.ca](https://sala.ubc.ca/people/faculty) | The office line under each name; 12 of 18 give one. Office shares and floors come from these |
| **CACB25** | CACB-CCCA, *2025 Annual Report on Architectural Accreditation* (academic year 2024–25) | [cacb.ca PDF](https://cacb.ca/wp-content/uploads/2025/12/CACB-CCCA_2025-Annual-Report-on-Architectural-Accreditation.pdf) | National totals across all Canadian M.Arch programs. Not broken down by school |
| **APSC** | UBC Applied Science, *Facts + Figures* page | [apsc.ubc.ca](https://apsc.ubc.ca/about/facts-figures) | SALA-wide figures for all programs, both undergraduate and graduate. No year stated |
| **GRAD** | UBC Graduate School, M.Arch program page | [grad.ubc.ca](https://www.grad.ubc.ca/prospective-students/graduate-degree-programs/master-of-architecture) | Total enrolment by year |
| **CGPSS22** | *Canadian Graduate and Professional Student Survey 2022*, national report, all students | [uregina.ca PDF](https://www.uregina.ca/institutional-research/assets/surveys/cgpss/cgpss-2022-national-all.pdf) | All graduate students in Canada, N ≈ 47,700 per item. Includes PhD and part-time students |
| **CGPSS22-UT** | CGPSS 2022, University of Toronto aggregate report | [sgs.utoronto.ca PDF](https://www.sgs.utoronto.ca/wp-content/uploads/2023/07/CGPSS-2022-aggregate-report-Final-June-26-2023.pdf) | The only version found that breaks results out for professional master's students |
| **TSR24** | UBC Vancouver *Transportation Status Report*, Fall 2024 | [planning.ubc.ca PDF](https://planning.ubc.ca/sites/default/files/2025-07/UBC2024-TransportationStatusReport.pdf) | Campus-wide trips. Does not separate out students |

**Could not access:** the AIAS 2020 *Learning & Teaching Culture* survey results (HTTP 403). According to search-result snippets only, which I have not verified:
- about 47% of students spend more than 40 h/week on studio and 38.8% spend 25–40 h;
- a 2015 AIAS survey reported 32 h/week on average.

This will be the main source for Category E if you can download the PDF yourself.

---

## Category A: Program and cohort

### A3. Cohort size per year level (you confirmed about 60)
- **GRAD:** total M.Arch enrolment was 166 (2023), 175 (2024) and 172 (2025).
- **APR24:** "approximately 180 students in the MArch program". "The Professional MArch program accepts approximately 45 students into its first year and about 15 additional students are given advanced standing into second year."
- **APR24 admissions table:**

| | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|
| Admitted to Year 1 | 34 | 41 | 47 | 48 | 49 | 47 |
| Advanced standing into Year 2 | 28 | 26 | 17 | 16 | 9 | 14 |
| Total enrolled | 62 | 67 | 64 | 64 | 58 | 61 |

- **What this means for the model:**
  - About 60 per year matches.
  - **Year 1 is smaller, about 45–48.** Year 2 adds about 10–15 students with advanced standing, so Years 2 and 3 are about 60.
  - The advanced-standing students join an existing cohort in Year 2. That is useful for the "newcomer" and social-outsider dynamics.
- **Decided by user (2026-11-05): Year 1 = 45 (3 sections), Years 2–3 = 60 (4 sections each).** Total 165, which fits GRAD's 166–175.

### A4/A5. Sections and instructors (you confirmed 15 per section, 4 instructors per year)
- **APR24, p. ~1232:** "the entire cohort (four studio sections)". This matches 4 × 15 = 60.
- **APR24:** option studios in upper years are filled by lottery and "balanced with respect to equity for student to instructor ratios, gender, academic strengths and preference".

- **2026-11-08 (Q2):** studios are sometimes taught by adjuncts who have no office; a permanent instructor's office may be in another building. No curriculum data gives the share. Model [A]: 50% sessional (no office, present for the session only); of the permanent, 50% with an office in this building (Level 4, D17), the rest off site. Where the office is matters for two things only: office-hour visits (students' trips to Level 4) and the instructor's presence on the floor outside sessions (kitchen and aisle encounters); both are small terms and are flagged [A].
- **2026-11-11 (Q22):** the owner: about 20 permanent faculty, not all teaching studio or with an office in the building, some affiliated with the undergraduate program; asked for data. APR24 p. 73: 17 full-time architecture faculty in 2024/25 (16.80 FTE, 6.22 teaching FTE; teaching is 40% or three courses a year) and 15 adjuncts (non-tenure-track, part-time, at most one course a term); seven adjunct names on the three fall studios (ARCH 500 one, ARCH 520 four, ARCH 540 two). Offices (sala.ubc.ca profiles, read 2026-11-11): of 12 architecture faculty whose profile gives an office, 9 are in Lasserre (201C, 201D, 202A x2, 205A, 205B, 309B, 414, 420) and 3 in CIRS; the APR adds that MacMillan also houses SALA faculty offices. Held teaching rooms 301, 309 and 202 in Lasserre have felt pin-up walls, projectors and screens; room 202 seats 60 (APR24, physical resources). Model: sessional share 0.6 [D*] (seven adjunct names on the three fall studios against eleven sections, one per section assumed; co-taught sections would lower it; the 2025/26 calendar lists 33 sessional lecturers and adjuncts for the whole school); office in this building 0.75 [D] (9 of 12); offices assigned Level 2 first, then 4, then 3 (6 / 2 / 1 of the nine Lasserre rooms). National context, not used: NAAB 2023 reports 46% full-time and 54% part-time or adjunct faculty across accredited US programs.

### A9. Gender split (you said 50/50 unless there is data)
The data does show otherwise:
- **APR24, entering M.Arch students 2018–2023:**
  - Female: 34, 34, 44, 45, 28, 39
  - Male: 28, 33, 20, 19, 27, 22
  - Total: **224 F vs 149 M**, so **about 60% female** (calculated).
  - It varies by year, from about 51% (2019, 2022) to about 70% (2020, 2021). No non-binary students are recorded.
  - The APR's own text says the share of women admitted "is approximately equal" to men, which these numbers don't support.
- **CACB25, national M.Arch enrolment 2024–25:** **784 women (56.6%), 586 men (42.3%), 14 non-binary (1%).**
- **APSC, all of SALA:** 65.0% women, 33.0% men, 1.4% non-binary, 0.6% undisclosed.
- **Default chosen: 58% women, 41% men, 1% non-binary.**
  - This sits between UBC's six-year mean and the national M.Arch figure.
  - In a section of 15 that is about 9 women, 6 men, and a non-binary student in roughly one section in seven.
  - If gender doesn't affect any behaviour rule, it only matters for persona naming and diversity.

### A10. International share
- **APR24 text:** "about 20% being international students".
- **APR24 table, % Canadian among enrolled:** 82%, 83%, 82%, 90%, 87%, 85%. That makes the international share **10–18%, mean about 15%** (calculated).
- **APR24:** "Approximately 30% of successful applicants are visible minorities, primarily of Asian and Iranian origin."
- **CACB25, national M.Arch:** 199 international of 1,391, **14.3%**.
- **Context:** across all UBC Vancouver graduate programs, about 38% of students are international (4,270 of 11,294, 2024/25 enrolment report, calculated). Architecture is much lower than UBC grad programs overall.
- **Default chosen: 15% international,** about 2 per section and 9 per year. Separately, about 30% visible minority among domestic and international students combined.

### A11. Working students
- **CGPSS22, all graduate students in Canada:** weekly hours of paid work unrelated to studies:
  - < 10 h (includes none): 44.4%
  - 10–20 h: 27.8%
  - 20–30 h: 8.8%
  - 30+ h: 19.1%
  - N = 47,689
  - The 30+ group is mostly part-time students who work full time.
- **CGPSS22-UT, professional master's only:** 49% < 10 h; the rest are spread across 10–20, 20–30 and 30+. The chart extraction is garbled. It roughly matches the national split.
- **Battisto 2024 (US architecture):** 44% name finances as a stressor often or always. Some students "worked two jobs".
- **Not available:** any figure for architecture specifically, or for UBC.
- **Default chosen:**
  - 55% work < 10 h, including none (say 35% none and 20% 1–9 h).
  - **35% work 10–20 h.**
  - **10% work over 20 h.**
  - **[adjusted]:** I removed the 30+ h group, because full-time M.Arch studio makes full-time jobs unlikely.
  - Please confirm against what you see.

### A12. Commuting and housing
- **CGPSS22, all graduate students:**
  - on-campus student housing 4.5% (3.2% + 1.3%)
  - off-campus housing owned by the university 1.0%
  - **other off-campus housing 87.6%**
  - other 7.0%
- **TSR24, all UBC Vancouver trips, Fall 2024:**
  - **52% of trips to and from campus by transit**, and 54% by transit, walking or cycling combined
  - 48,700 single-occupant-vehicle trips per day
  - Weekday peaks: **9–10 am arriving** and **4–5 pm leaving**
  - The report says walking and cycling stay low because of "the longer commute distances from where a majority of the campus population lives"
  - No commute times are given
  - All students have the U-Pass (2024/25, $46/month)
- **Battisto 2024:** 38% name transportation or parking as a stressor.
- **Default chosen:**
  - **About 90% live off campus**, 10% on campus or in UBC neighbourhoods.
  - Mode: **about 60% transit, 25% car, 15% walk or bike** [adjusted: students use transit more than staff].
  - **Commute time remains assumed: 30–60 min each way, median 45.**
- **How this matters for the simulation:**
  - The last bus or SkyTrain time limits late nights for transit users.
  - The 9–10 am arrival peak is when the floor fills.

### A13. Caregiving and dependents
- **CGPSS22, all graduate students:**
  - **16.4% have at least one child under 13 living with them** (8.2% one, 6.1% two, 1.7% three)
  - 8.1% have a child aged 13 or older
  - Marital status: 48.2% never married with no partner, 27.4% married, 20.9% with a domestic partner
- **Caveats:** this population is older than M.Arch students and includes PhD students and part-time students.
- **Default chosen: 5% with dependents** [adjusted down from 16% for M.Arch age]. These students have hard departure times, e.g. 17:30 for childcare pickup.

### A14. Age (you confirmed 23–30)
- **CGPSS22, all graduate students:** 21–25: 29.7%; 26–30: 30.8%; 31–35: 16.5%; 36–40: 9.1%; over 40: 13.8%.
- **APR24 student survey:**
  - 46% had a design background without advanced placement
  - **29% had little or no design experience**
  - 26% had a design background with advanced placement
- **Persona mapping:**
  - The 29% with little or no design experience map well to S3, the Struggling Novice.
  - Most of them are in Year 1.

---

## Category B: Schedule and course load

### Sources added

| Key | Source | Link |
|---|---|---|
| **CAL26** | UBC Vancouver Academic Calendar 2026/27, month pages Sep–Dec 2026 | [Sep](https://vancouver.calendar.ubc.ca/academic-year-202627/september-2026) · [Oct](https://vancouver.calendar.ubc.ca/academic-year-202627/october-2026) · [Nov](https://vancouver.calendar.ubc.ca/academic-year-202627/november-2026) · [Dec](https://vancouver.calendar.ubc.ca/academic-year-202627/december-2026) |
| **SEN-CUR** | UBC Vancouver Senate, *A Guide to Curriculum Submissions* | [senate.ubc.ca PDF](https://senate.ubc.ca/files/Guide-to-Curriculum-Submissions-for-UBC-Vancouver.pdf) |
| **SEN-FT** | UBC Calendar, *Definition of Full-Time Status* | [calendar](https://vancouver.calendar.ubc.ca/campus-wide-policies-and-regulations/definition-full-time-status-undergraduate-students) |
| **PAGE08** | Page, Robinson, Morel & Scartezzini (2008), "A generalised stochastic model for the simulation of occupant presence", *Energy and Buildings* 40(2): 83–98, doi:10.1016/j.enbuild.2007.01.018 | [record](https://infoscience.epfl.ch/items/f615f2d2-3735-4d3d-a3c3-b788eae5ca29) |
| **HONG-OS** | Chen, Hong & Luo, "An agent-based stochastic Occupancy Simulator", LBNL / *Building Simulation* | [LBNL PDF](https://simulationresearch.lbl.gov/sites/all/files/t_hong_-_an_agent-based_stochastic_occupancy_simulator.pdf) |
| **YU22** | Yu, S. (2022), "Agent-based modelling using survey data to simulate occupancy patterns and occupant interactions for workplace design", *Building and Environment* 224: 109519 | In your folder: `Research/Agent/TO READ PRIORITY/Workplace-Design-ABM.pdf` |
| **COX72** | Cox, D. R. (1972), "Regression models and life-tables", *J. Royal Statistical Society B* 34(2): 187–220 | The standard reference for proportional-hazards models |

### B1/B2. Number of sessions (calculated from CAL26)
- **Teaching period:** Tue Sep 8 to Mon Dec 7, 2026.
- **University closures:**
  - Mon Sep 7: Labour Day
  - Wed Sep 30: National Day for Truth and Reconciliation
  - Mon Oct 12: Thanksgiving
  - Mon Nov 9 – Wed Nov 11: midterm break ("Lectures and laboratories cancelled"; Nov 11 is also Remembrance Day)
- **Years 2–3 (Tue and Fri):** 25 sessions. The only lost session is **Tue Nov 10**.
- **Year 1 (Tue, Thu and Fri):** 38 sessions.
- **Exams:** Fri Dec 11 – Tue Dec 22. Residences close Wed Dec 23.

### B3. Within-session departure: proposed model and references

**What you observed.** Attendance is required, but enforcement depends on the instructor. Students leave gradually as the end time approaches, and some leave right after their crit. **No one leaves before their own desk crit, even if crits run late.**

**Is there a standard model?** No published study models students leaving a studio session. The closest established tools are:

1. **Time-varying presence models from building simulation.**
   - PAGE08 models each occupant's presence as an **inhomogeneous Markov chain**: the probability of switching between present and absent changes through the day. It reproduces arrival and departure times and intermediate absences in offices.
   - HONG-OS is an agent-based occupancy simulator built on the same idea, with schedules for each space and each occupant.
   - YU22, which is in your folder, drives actions from **time-dependent utility functions** calibrated from survey data, e.g. lunch start and end times.
2. **Survival / time-to-event (hazard) models** (COX72).
   - These model *when* an event happens (here, leaving).
   - A **baseline hazard** h₀(t) sets how the leaving rate changes over time.
   - **Covariates** multiply that rate: h(t) = h₀(t)·exp(β·x).
   - They also handle **censoring**: people still present when observation ends are counted correctly rather than dropped.
   - They are widely used for timing data such as student dropout and MOOC attrition. Using them for in-session departure is my adaptation; I found no published example.
3. **Queueing** for the crit order.
   - The instructor is a single server visiting about 15 students for about 10–15 min each.
   - The queue order sets each student's earliest possible departure.
   - This is a standard single-server queue. HONG-OS and YU22 treat meetings as scheduled events in the same way.

**Proposed model** (combines 1–3). Parameters marked [A] are assumed until observed.

- **Step 1: crit queue.**
  - At the start of the session the instructor orders the section's students (by seating route, sign-up order, or a priority rule; to be set in Category C).
  - Crit length ~ triangular(8, 12, 20) min [A]. Running late is allowed.
  - Each student's crit end time t_crit follows from the order.
  - **Hard constraint: the student cannot leave before t_crit.**
- **Step 2: leave right after the crit.**
  - Probability p_imm = 0.15 [A] that the student leaves within 0–10 min of t_crit.
  - It rises when the student has a job shift, another class or a commute constraint (Category A: A11–A13).
  - It falls when the instructor is strict.
- **Step 3: gradual departure toward the end time.**
  - Students who don't leave immediately leave at a time drawn from a hazard model, starting at t_crit.
  - Baseline hazard: **Weibull with shape k ≈ 3 [A]** (a hazard that rises toward the end), scaled so that with no covariates about 50% have left by T_end − 30 min and about 80% by T_end [A].
  - Covariates, as hazard ratios [A]:
    - instructor strictness: strict 0.5, lax 1.5
    - deadline within 72 h: 0.4, so students stay
    - persona: Studio Devotee 0.5, Balanced Planner 1.0, Working Student 1.8, Grade Optimiser 0.8. Superseded (2026-11-07): traits only; the agent's own ratio is exp(0.3C − 0.2 keenness) × job/commute constraints (agent-variables.md, traits-only mappings)
    - evening constraint, e.g. a last-transit time: 2.0
- **Step 4: after the end time.**
  - Students still present at 18:00 switch to evening presence, using a PAGE08-style Markov chain with deadline-dependent probabilities. This connects to Category E (hours in the building).
- **Step 5: arrival.**
  - Students trickle in with lognormal lateness, median 5 min, 90th percentile 20 min [A]. Arrival works as the mirror image of departure.

**Calibration (cheap).** Count the people in one section every 15 minutes from 13:30 to 19:00, ideally over 3 sessions (one normal, one before a review, one with a strict instructor). Note when each person's crit happens and when they leave. That gives a Kaplan–Meier departure curve to fit k, the scale, p_imm and the strictness hazard ratio.

### B4. Lectures inside studio time
- *ST* Ch. 5: about 1 h of each 3 h studio was lecture. *ST* Ch. 8: about 15 min mini-lectures.
- You said it varies a lot by studio, so an average is fine.
- **Default [A]: 45 min per week (about 8% of the 9 h for Years 2–3), held in a separate classroom.** Which room will be set when rooms are labelled.

- **2026-11-08 (Q8, Q19):** the owner asked for a projection from the data, with rooms bookable first come. Projection [A]: the weekly 45-minute lecture is held per year group (all sections of a year) in the week's first session, 15 minutes in; the year's coordinator books the smallest Level 1–2 classroom whose chairs seat the year (classrooms hold 18, 56, 64 and 84 in the tiles); a second year group at the same hour takes the next room; if none fits the lecture is in another building (lecture_off). In the sample seed year 1 takes room 13, years 2 and 3 rooms 15 and 12.
- **2026-11-11 (Q23):** per year group confirmed; the section's own briefing counts as an intro. APR24 (studio descriptions): "During the first five studios, lectures provide examples of contemporary and historical buildings, landscapes, and urbanisms" and "Instructors provide feedback through desk crits, small group meetings, studio pinups, and internal and public reviews". Model: every session opens with a 15 min section intro at the instructor's spot [D*: the length is assumed, the meeting is in the APR], then the lecture on the week's first session.

### B5–B7. Credit-based workload
- **SEN-CUR:** "In general, one credit represents one hour of instruction or two to three hours of laboratory time per week throughout one Winter Session [term]". It estimates the total workload of a 3-credit course at **about 8–9 hours per week of student time, including out-of-class work**. Its benchmark is 15 credits per term.
- **SEN-FT:** a standard Winter Session is 30 credits; 9 or more credits per term counts as full-time.
- **Your school rule:** 3 credits = 3 h class + 9 h outside work, which is 4 h per credit per week. This is **higher than the Senate's 8–9 h per 3 credits** (about 2.7–3 h per credit).
- **What this gives for an 18-credit M.Arch term:**

| Rule | Studio (9 cr) | 3 other courses (9 cr) | Total per week |
|---|---|---|---|
| School rule (4 h/credit) | 36 h | 36 h | **72 h** |
| Senate (2.7–3 h/credit) | 24–27 h | 24–27 h | **48–54 h** |

- **Default chosen: the school rule** (you confirmed it). Note that 72 h/week is the *expected* load. Category E will set *actual* hours. AIAS 2020, from search snippets only, reports about 47% of students spending more than 40 h/week on studio alone.
- **Confirmed by user (2026-11-05):** the 9 h of outside work is **per 3-credit course**, so the expected load is about 72 h/week.

### B10. Review dates
- Midterm "usually after Canadian Thanksgiving" (Mon Oct 12). **Default: Fri Oct 16, 2026 (week 6) [A]**. The alternative is the following week, Oct 20/23.
- Final "first or second week of December", **on a studio day** (confirmed in C11). **Default [A]:**
  - Years 2–3: Tue Dec 8, last desk crit Fri Dec 4.
  - Year 1: Thu Dec 10, last desk crit Tue Dec 8.
  - All four sections of a year review the same day in parallel rooms.
  - Dec 8–10 is after the last class day (Dec 7) and before exams (Dec 11).
- Midterm Fri Oct 16 is also a studio day, with the last desk crit on Tue Oct 13.

### B11. Deadlines in other courses
- You said the other courses run on about 1-month cycles, with an assignment near the end of each month. History courses also have weekly readings.
- **Default calendar [A]:**
  - weekly readings due before each history class
  - monthly assignments around Fri Oct 2, Fri Oct 30 and Fri Nov 27, plus a final assignment or exam in Dec 11–22
  - Sep 30 is a closure, so the September assignment moves to early October
- **Clashes this produces:**
  - Oct 30 falls 2 weeks after the midterm review
  - Nov 27 falls 1.5 weeks before the final review
  - Dec exams overlap the final review

### B13. Team work
- AIAS 2002 says group work is "most often limited to pre-design activities of research, analysis, and site documentation". This matches what you described.
- **Default [A]:**
  - site-analysis teams of 3–4
  - pairs in about 30% of sections for phases 2–3
  - otherwise individual work

---

## Category C: Crits and reviews

### Sources added

| Key | Source | Use |
|---|---|---|
| **BROWN05** | Brown, Gans, Mandelbaum, Sakov, Shen, Zeltyn & Zhao (2005), "Statistical analysis of a telephone call center: a queueing-science perspective", *J. American Statistical Association* 100(469): 36–50 | Found that human service times are close to **lognormal**. This is the precedent for modelling one-on-one consultation length as lognormal |
| **ST-HOK** | Hokanson's critique typology, cited in *Studio Teaching in Higher Education* Ch. 18 | Forms of critique, from most formal and public to least: jury → group pin-up → desk → peer |
| **GRAY22** | Gray 2022, Table 1 "Continua of Instructor Roles" (in `2026-11-03 Practice/`) | Instructor-style spectrum, from drill sergeant / critic to facilitator / nurturer |
| **AIAS02** | AIAS 2002, p. 17 (in `2026-11-03 Practice/`) | Jury seating: jurors in front, presenter standing. Visiting critics are often "not connected to the larger goals" |

### C1–C4. Desk-crit queue model
- **Unit of service:** the *project group*. A solo student, a pair or a team gets one crit per session.
  - Groups per section: 15 if all solo, about 8 if in pairs, about 4–5 for site-analysis teams of 3–4.
- **Queue discipline:**
  - First come, first served on the sign-up sheet. A group's position is set by when it arrives and signs up, using the arrival lateness model in B3.
  - Everyone is served, and overruns are allowed.
  - This is a standard single-server queue with no abandonment: nobody leaves before their crit (B3).
- **Crit length:** you gave 15 to 30–40 min. I modelled it as a **shifted lognormal, 12 + LN(median 8, σ 0.72) min**, following BROWN05's finding that service times are lognormal [A]. Simulated values (100k draws):
  - 5th percentile 14.5 min, median 20, 95th 38, mean 22.4
  - 4% of crits exceed 40 min
- **Session overrun:** the 4.5 h session is 270 min, or 225 min if a 45 min lecture is held. All values simulated.

| Groups in section | Mean total crit time | P(overrun, no lecture) | P(overrun, with lecture) |
|---|---|---|---|
| 15 (all solo) | 336 min (5.6 h) | 1.00 | 1.00 |
| 11 | 246 min | 0.18 | 0.76 |
| 8 (pairs) | 179 min | 0.00 | 0.05 |
| 4 (teams) | 89 min | 0.00 | 0.00 |

- This reproduces what you described: more solo projects means more late running.
- **Resolved (user, 2026-11-05):** solo and group crits are about the same length. One distribution is kept for both. A fully solo section therefore overruns by about 1 h, ending around 19:00 rather than 18:00. The last groups on the sign-up sheet are the ones held past the scheduled end. This feeds the departure model (B3) and evening occupancy (Category E).
- **What emerges from the model:**
  - Early arrivers get early crits and can leave early (B3 step 2).
  - The last group on the sheet stays to the end or later.
  - Expect a pattern where students who want to leave early (the Balanced Planner, the working student) arrive early. This is an assumed behaviour [A].

### C5. Crit location
- At the student's desk, or at free shared desk space near the centre of the studio. It depends on the instructor and how crowded it is.
- **Default [A]:**
  - Each instructor has a preference: 50% desk-based, 50% central table.
  - A desk crit moves to the central table if more than 2 neighbours are present within 3 m and the group has more than 1 member.
- **Why it matters:** the location decides who can overhear. The overhearing rule from the culture summary (behaviour rule 5) and BH5/BH6 in the registry apply around the crit location. A central table exposes the crit to more students than a desk in a corner.

- **2026-11-08 (Q6):** the owner: the spot depends on noise, teaching style and available space; some instructors go desk by desk within their section, others find an empty spot and the students come to them. Model: a crit mode per instructor, desk or spot (50/50 [A], replacing the per-crit 50/50 coin); a desk-mode instructor moves to the spot when the bay is crowded (three or more working neighbours within two tiles) or the noise at the desk exceeds the headphone threshold; the spot is the free side table nearest the section's desks, else a free crit room on the studio floor, else a shared table. Spot-mode instructors announce the spot in the feed and the students walk over.

### C6–C8. Pin-ups and reviews
- **Pin-ups:** at least 2 internal pin-ups or presentations before each guest review. **Default dates [A]:**
  - Before the midterm (Fri Oct 16): Fri Oct 2 and Fri Oct 9.
  - Before the final (Tue Dec 8): Fri Nov 20 and Tue Dec 1.
  - Pin-up format [A]: about 3 min presentation + about 7 min discussion per group, run by the section instructor in a pin-up area.
- **Guest reviews:**
  - 3 guests; about 5 min presentation + 15 min or more of critique, so 20–25 min per group.
  - A section of 15 solo students takes about 5–6 h, so reviews take up most of the day. Default 09:30–16:30 with a lunch break [A].
  - The audience is the section's other students, who are present and pinning up.
- **Guest mix [A]:** midterm 2 external + 1 internal; final 3 external. Matches "more external, especially at the final".
- **Arrangement:** AIAS02 describes jurors in front and the presenter standing. This is the default layout of the review room.

### C9–C10. Peer critique and grading
- Peer critique is informal (it emerges from proximity and help-seeking) except:
  - in highly individual studios, and
  - early in the process, i.e. phase 1, where a structured peer round is the default [A].
- Grading is by percentage, and process is folded into the instructor's overall impression. In the model, the grade is an end-of-project score. Because process counts, the inputs could include visible progress across crits, not only the final output [A].

### C11. Feedback lead time
- The last desk crit is the session before the review: **3 days** for Tue → Fri, **4 days** for Fri → Tue.
- Late, substantial feedback in this window triggers crunch: rule 9 in the culture summary (late crit → all-nighter) and BH10 in the registry.

### C12. Instructor style mix
- You said to assume a variety. **Default for each year's 4 instructors [A]:**
  - 1 critic/strict (GRAY22 "critic"; attendance hazard ratio 0.5)
  - 2 mixed (hazard ratio 1.0)
  - 1 facilitator (GRAY22 "facilitator"; hazard ratio 1.5)
- Style also affects:
  - the tone of crit feedback, i.e. its effect on motivation and confidence (ST3/ST4)
  - the crit location preference (C5)
  - how often peer critique is encouraged

---

## Category D: Space and access

### Sources added

| Key | Source | Link |
|---|---|---|
| **APR24-FAC** | APR24 (see Category A), Physical Resources sections. Its text extraction is in the session scratchpad | [cacb.ca PDF](https://cacb.ca/wp-content/uploads/2025/06/Architecture-Program-Report-APR_University-of-British-Columbia_2024.pdf) |
| **SALA-SHOP** | SALA workshop / fabrication guide and SALA DigiFab blog (pages of different dates) | [sala.ubc.ca guide](https://sala.ubc.ca/guides/workshop-fabrication/) · [SALA Fab blog](https://blogs.ubc.ca/salafab/) |
| **UBY23** | *The Ubyssey*, "UBC after hours" (2023 campus guide) | [ubyssey.ca](https://ubyssey.ca/guide/2023/on-campus/ubc-after-hours/) |
| **HP-SURV** | Office headphone-use surveys: CloudCover Music (1,000+ workers: 56% wear headphones regularly); RAPID / AIChE CEP 2018 (about 75% wear them in the office; 72% to block conversations); Sonarworks (24.5% wear them most of the day) | [CTV](https://www.ctvnews.ca/business/most-people-wear-headphones-at-work-even-when-not-required-survey-1.6511349) · [AIChE](https://www.aiche.org/resources/publications/cep/2018/july/editorial-tune-dont-tune-out) · [Sonarworks](https://www.sonarworks.com/what-do-people-listen-to-at-work) |
| **DOSHI86** | Doshi, B. T. (1986), "Queueing systems with vacations: a survey", *Queueing Systems* 1: 29–66 | Standard theory for servers that become unavailable for periods. The precedent for "plotter down until restocked" |

### Building (D5, D17)
- **APR24-FAC:** SALA occupies 6 buildings. The Lasserre Building "houses SALA faculty and staff offices, studios, computer work stations, printers/plotters, workshops, seminar rooms, materials library, review spaces, classrooms".
  - Your description (4 floors + basement; studio on 3; offices on 4) is consistent with this building. **Confirmed by user (2026-11-05): the modelled building is Lasserre.**
- **Walking times (confirmed by user, 2026-11-05)** replace the earlier assumptions:
  - main shop (APSC/CHBE): **up to about 20 min** each way
  - main food street at the bus loop: **about 15 min**
  - main library: **about 5 min**
- **D5:** all 3 years share the 3rd floor, with sections grouped.
  - Floor occupancy: 165 dedicated desks (45 + 60 + 60, from A3), plus instructors circulating.
  - Because sections are grouped, between-group metrics have two levels: **section** and **year** (summary-metrics C6, C14).
- **APR24-FAC:** the main library is "located very near to the Lasserre Building", so it is an off-floor focus option (D15).
- **APR24-FAC:** rooms 301, 309 and 202 got new projectors and screens, and were "skinned with acoustically absorptive felt surfaces that are also suitable for pinning", along with "select hallways".
  - Rooms 301 and 309 are likely 3rd-floor crit/seminar rooms (D14). Confirm when rooms are labelled.
  - Pinnable hallways are extra shared display surface (D3).

- **Washrooms (owner 2026-11-08, Q1):** students use the Level 2 rooms from the studio and the Level 1 rooms from a lecture; the Level 4 single rooms are the professors'. Model: the nearest of Level 1 and Level 2 by the floor the agent is on, of their sex where the level has one; instructors go to Level 4.

### Desks and storage (D1–D3)
- Dedicated desk for the semester, grouped by section; wider than 1 m; small locker under the desk; personal pin-up on the back of the desk; shared pin-up boards on casters.
- **What this means for the model:**
  - Every agent has a fixed home desk (AT9). There is no desk competition.
  - The back-of-desk pin-up makes each student's work visible to whoever walks *behind* the desk. Exposure to others' work (SO5; subjective S4) can be computed from circulation passing the back of desks.
  - The movable boards are **reconfigurable display objects**. For pin-ups (C6) they are dragged to the gathering spot. Default [A]: about 1 board per 4 students.

- **2026-11-08 (Q17, Q18):** one desk per student within the general year zones the owner gave; the overflow of a zone (the zones hold 40 / 48 / 80 desks for 60 / 60 / 45 students) takes the nearest spare desks, so about 20 third years and 12 second years sit in the middle until a desk map says otherwise. Four desks at the north-west bay were boxed in (their floor pocket cut off by a table and a board stack); the engine opens a gap by rolling aside the thinnest movable piece between the pocket and the floor (4 table tiles) and logs it (world.gaps, drawn in the drift overlay). The model should be checked at that bay.

### Access (D6, D7)
- 24/7 card access for all students. All-nighters are allowed.
- The access model doesn't restrict time. Evening and overnight presence is governed by the behaviour model (B3 step 4; Category E).

### Shops and fabrication (D8, D9)
- **Basement shop (same building):**
  - APR24-FAC: "The existing Lasserre shop will be repurposed for model-making and woodwork."
  - Superseded (2026-11-06): APR24-FAC placed "a battery of 3D printers, clamps, breaks, and other infrastructure accessible to students 24/7" in basement Room 5. **The owner: the 3D printers have since moved to the 3rd floor**, to the studio's 3D-printing room (6 or more small printers on a shelf; any architecture student may use them; students bring their own filament; people come back to collect a finished print, and a busy shelf means someone moves another student's print aside). **Overwrite: 3D printing is on the studio floor; no basement trip.** The $15 one-time fee and $35 filament roll (SALAFAB, Category G) still apply.
  - SALA-SHOP hours (Sep–Apr): Mon–Thu 9:00–12:00 and 13:00–20:30; Fri 8:30–12:00 and 13:00–16:30; weekends 10:00–14:00. This is from an older page; a newer staff page omits weekends. **Default: as listed, weekends included [D*]**.
- **Main new shop (another building):**
  - APR24-FAC: the APSC fabrication facility is an addition to the CHBE building courtyard, "opening in September 2025". It is about 1,004 m² and roughly triples SALA's shop space. It holds "most of our digital fabrication equipment", CNC, robotics, 3D printing and cutting, and a "full woodshop".
  - Hours aren't published. You said it has more hours, so the **default is Mon–Fri 9:00–21:00, Sat–Sun 10:00–17:00 [A]**.
  - Walking time from the studio: **up to about 20 min each way (confirmed)**. Default distribution: 15–20 min, uniform [A].
- **Laser cutter:** in the new shop. SALA-SHOP says it is available "during reserved time slots, only when the laser technician is on site". Default slot 30 min [A].
- **Simulation implications:**
  - A trip to the main shop takes the agent **out of the building**, so it is absent from the studio and its encounter metrics for the slot plus 30–40 min of walking (round trip).
  - Before reviews, demand for laser slots goes up. Agents who fail to get a slot either stay late in the basement shop or change their output, e.g. hand-cut models [A].

### Plotters (D10, D11): queue with paper running out
- **What you described:** 2 self-serve plotters, operated from desktop computers. Traffic is much heavier before reviews. Paper runs out outside business hours, and only the student tech can replace it.
- **APR24-FAC staffing:**
  - 2 student "GAA Printer and Plotter Technical Assistant" positions, Sep 8 – Apr 30, $5,440.80 total.
  - At an assumed $20/h, that is about 272 h, or **about 4 h/week per position, about 8 h/week combined** (calculated; wage assumed).
  - So restocking is rare even within business hours.
- **Model:** a 2-server queue in which each plotter **becomes unavailable when its paper runs out** until a tech restocks it during staffed hours. This is a "server vacation" in queueing terms (DOSHI86).
  - **Service time per student** = file setup at the desktop (2–4 min [A]) + printing (about 1–2 min per E-size sheet [A], typical large-format speed in normal quality).
  - **Paper stock:** one 36" × 150 ft roll per plotter [A] (45.7 m). An E-size sheet (30 × 42 in) uses about 1.07 m, so **about 42 sheets per roll**.
  - **Demand before a review [A]:** 60 students × 3 sheets × 1.25 (reprints) ≈ **225 sheets**, about 5.4 rolls, mostly in the last 18 h.
  - **Restocking [A]:** a tech is present 2 h/day, Mon–Fri, during business hours.
- **What the model produces:**
  - Two full rolls (about 84 sheets) cover only about **37%** of the pre-review demand.
  - If the crunch falls in the evening or at night, both plotters go down until the next staffed window.
  - Results: long queues, students waiting by the plotters (a strong but stressful "magnet" for encounters), students leaving to print elsewhere, or printing the next morning before the review.
  - This matches your account and is a good test of the stress and wellbeing metrics.
- **Variant to test:** a restock buffer, i.e. spare rolls students may load themselves. This is a policy lever.

### Kitchen and food (D12, D13)
- The student kitchen is open at all times (location from the model). It is a 24/7 social magnet (Hillier "magnets"; summary-metrics C7).
- **UBY23, 24/7 food:** McDonald's and A&W (University Village), and Avenue C self-serve store (Walter Gage residence). Pizza places close at 00:00–01:00.
- You said the building is isolated with little food nearby. **The main food street at the bus loop is about 15 min each way (confirmed)**, so a food run takes about 30 min plus the time to buy and eat. Late at night agents mainly use the kitchen (own food) or order delivery. This links to the culture note's "we all just order food" (Battisto).

### Crit rooms (D14)
- Booked mainly by instructors. They double as history discussion rooms, with pin-up surfaces and conference-room equipment.
- **Model:** a shared room calendar. History seminars and studio reviews compete for the same rooms. Pin-ups (C6) and reviews (C7) need a booking. History discussion times come from Category B11 [A].
- **Owner (2026-11-06):** history seminars are **1.5 h** and typically in these rooms. Most other courses have their lectures in **another building**, so those classes take the agent off the floor.
- **Ratio [A], to confirm:** of each student's 3 other courses (B5), **1 is a history or theory course with a 1.5 h seminar in a crit room on the floor; 2 are lecture courses held off site** (3 h/wk each, in another building). Alternative to test: 2 seminar courses and 1 lecture course.
  - Floor effect: a seminar keeps the student in the building and ends in the studio (a short walk, likely a desk visit before or after), while an off-site lecture removes the student for the class plus the walk (10–20 min each way [A]).
  - Room load [A]: 165 students in seminar groups of about 15–20 means about 9–11 seminar sessions of 1.5 h per week spread over the crit rooms, on top of pin-ups and reviews. Rooms 1 and 4 on the studio floor are the first choice; the Level 2 and basement crit rooms take the overflow [A].
  - B5's 3 h of class per course is kept: a seminar course is assumed to pair its 1.5 h seminar with a 1.5 h lecture elsewhere [A].

- **2026-11-08 (Q9, Q16, Q19):** seminars can be on any day but not against lunch or studio time; rooms are first come; room 30 is a crit room although its tables and chairs were never placed. Model: a term timetable built once per seed: each section's 1.5 h seminar on a weekday that is not the year's studio day, in a slot from 09:00, 10:30, 13:00, 14:30, 15:30 (12:00–13:00 kept free), in the first free crit room with Level 3 first; room 30 is used from its floor tiles (24 spots) until the crit set is placed in the model.

### Focus and noise (D15, D16)
- There are no quiet focus spaces. The studio is open plan, and noise will be simulated.
- **Headphones:**
  - HP-SURV: 56% of office workers wear headphones regularly, about 75% in a second survey, and 24.5% "for the most part of the day". The main reason is blocking conversations (72%).
  - Bernstein & Turban (2018) describe headphones as a sign of social withdrawal in open offices.
  - **Default [A]:** P(wearing headphones) = 0.6 while focusing, 0.1 otherwise; higher for the Introvert modifier (+0.2) and lower for the Peer Mentor (−0.2).
  - **Effects [A]:**
    - perceived noise × 0.3 (metric F3)
    - overhearing desk crits = 0 (BH5)
    - chance of being approached for help × 0.5 (approachability)
    - the "availability" cue that people use to decide whom to approach is off (C8 recruitment)
- **Trade-off this creates (testable):** headphones protect focus (F1, F2) but cut overheard learning and chance encounters (C3, C7). This is the "central dilemma" from Heerwagen 2004, now handled at the individual level.
- **Off-site focus:** the main library is about 5 min away (confirmed; APR24-FAC: "very near"). Default: 10% of focus blocks are done off-floor [A] (AC6).

---

### Layout rearrangement (SP6, PL3; owner 2026-11-07 and 2026-11-08)
- **2026-11-12 (item 27):** Owner 2026-11-12 (item 27, walkthrough stop 3): screens capped; the owner wants to see what else the agents do to the space, since that could have long-term implications. Found with `test/_layout.mjs`: under the cap nothing else moved on any day, because (a) the kitchen's nearest side table is 21 tiles away and the reach was 20, so the overflow table never fired although 6+ people were in the kitchen 13 times a day; (b) the plotter queue peaks at 3 on the eve of the midterm and the trigger was 4; (c) the first spot found for a piece was the only one tried, and for the plotter table it cut off the north offices. Engine (`layout.js`, `parameters.layout.manager` [A]): `per_trigger_cap.exposure` 2, `kitchen_reach_tiles` 30, `triggers.queue_len` 3, and a spot is tried for connectivity and standing tiles before it is chosen. The plotter table's spot search also widened from 3 m to 5 m of the plotters, since no spot within 3 m keeps the north offices connected (`test/_layout.mjs`: the queue peaks at 8 on the eve). Seed 2026 now: 2026-10-15 two screens, the kitchen table at 13:00 and the plotter table at 17:30 (517 queue-minutes spent at the table instead of standing); 2026-10-13 a screen, the kitchen table at 12:30, a screen at 15:30; 2026-10-23 a screen, the kitchen table, a screen. The shared board (C6 LOW) never fires because between-year contact sits at 0.26 to 0.28 against its 0.15 trigger. Open: the kitchen table's effect is reported as the kitchen peak before and after, which rises with the afternoon anyway; a better measure is who uses the table. Owner, later the same stop: has not seen these moves made, but wants the tool to have the opportunity to make design suggestions through the agents' moves, in addition to the suggestions at the end. Engine (`rules.js`): every kind of move that stood at the end of the day is now a suggestion of its own, tag MOVES, phrased as the permanent version of what the agents did with its measured effect (screens -> a partition or bay-end boards fixed to face the aisle; the kitchen table -> a counter in the lounge by the kitchen door; the plotter table -> a fixed layout table at the plotters; the shared board -> a shared pin-up wall between the years), each with a TRACE to the move's event, the movers' remarks and the spot. The metric rules keep their 'the agents tried this live' line. Eve of the midterm, seed 2026: three MOVES suggestions (two screens; a counter outside the kitchen; a layout table at the plotters).
- The owner's reading of the rearrangement feature (Q12): **the design suggestions happen in real time, by the agents.** Three movement levels: *everyday use* (chairs and boards move for crits and pin-ups and return), *agents rearrange* (every half hour the layout manager reads the live signals the suggestion rules test at the end: a plotter queue of four or more, a desk with 20 or more passers an hour, six or more in the kitchen twice, a between-year share under 15% at 14:00; the agents concerned move the nearest movable piece: a side table to the plotter corner, a board rolled to the aisle side of the exposed desk, a table outside the kitchen, a board to the boundary between the years' zones as a shared wall), *free* (the same without veto, budget or aisle limit). Constraints [A]: four moves a day (twelve under free), a three-hour cooldown per piece, a veto by the desk owners within two tiles of the new place with P = 0.35 − 0.15 × their mean agreeableness, the floor's main walkable component keeps 98% of its tiles, no desk loses its standing tile. Each move is an event with its movers and a remark, is drawn in the plan and the drift overlay, and carries the signal before and after; the end-of-day suggestion it anticipates reports the attempt and its measured effect. Not persisted across days yet (the term layer has no tiles).
- Literature behind the rule: Brand's "low road" buildings and Hertzberger's polyvalence (users adjust furniture when it is light and unassigned), Sailer & Penn 2009 on movable furniture in studios; the veto stands in for the floor norm (Heerwagen 2004: open plans are governed by tacit rules).
- **2026-11-08, later (open item 25):** the first run of the screen move took the passers at the screened desk to zero because the board stood on the one tile the count read. The count is now one per walker per pass within two tiles (near ring 1, next ring 0.5, x0.5 with a board, table or wall between) [A]; the exposure trigger is 20 passes an hour at one desk (a pass every three minutes) [A]; F4's benchmark 6 passes an hour [A]. In the sample days a screen reads 33 → 4 and 114 → 18 passes an hour; where the route itself moves one bay over the desk still reads near zero. The day's budget is now checked per attempt (four signals can fire in one half-hour check).

### Lasserre rooms by APR number (2026-11-11, owner's request)
The owner asked for the model's rooms to be reviewed against the accreditation report. The APR names these Lasserre rooms; the match to the model's own numbering is by use, size and position and is recorded in `program/rooms.json` as `apr_room` with status inferred, never in a room's name.

| APR room | What the APR says | Model room | Status |
|---|---|---|---|
| 202 | held teaching room: felt pin-up walls, projector and screen, Ezo boards; class capacity raised to 60 | Level 2 room 22, the large classroom (111.5 m²) | applied: 64 chairs (four a table), capacity 60 recorded; inferred |
| 301, 309 | the two held teaching rooms on the third floor, same fit-out | Level 3 crit rooms 4 (south, 301) and 1 (north, 309) | inferred: which is which from 303A beside room 4 |
| 303A | photo documentation space for the ARCH program | Level 3 room 5, Photography room | inferred |
| 102, 104, 105 | UBC shared teaching rooms on the first floor, 105 a digital teaching space and two lecture spaces, bookable | Level 1 classrooms 12, 13, 15 | inferred; which number is which unknown |
| Room 2 | the school's shop, across the hall from Room 5 | Basement 74, Workshop (146 m²) | inferred |
| Room 5 | former thesis studio, now a shared classroom and shop extension: work-benches, a projector, 3D printers (2024), open 24/7 | Basement 75, Model assembly room (115 m²) | inferred; 5C (a shop workspace across from it) has no match |
| Room 9 | the SALA Materials Lab, the former reading room, 1000+ sq ft, for meetings, lectures, seminars, reviews | Basement 70 (104 m²) or 77 (109 m²) | candidates only; both stay flagged |
| 402 | the main office and MArch program office, fourth floor | no match; Level 4 room 55 (34 m², shared desks) the only candidate | open; Level 2 room 34 (162 m²) stays the placeholder admin office |

Also from the APR: the Lasserre basement workshop and fabrication space totals 290 m²; the existing shop is being repurposed for model-making and woodwork once the new APSC/CHBE shop opens (2025); room 5C across from the shop is a 24/7 shop workspace; 12 student workstations are spread over Lasserre, MacMillan and the Annex. Engine change with it: chairs in class and crit rooms are seat tiles, so a chair in a row counts (room 22 read 25 of its chairs before).

## Category E: Time use and behaviour

You deferred most items to "data or a statistical model". This section gives the data first, then the models that turn it into agent behaviour.

### Sources added

| Key | Source | Quality |
|---|---|---|
| **HERSH14** | Hershner, S. D. & Chervin, R. D. (2014), "Causes and consequences of sleepiness among college students", *Nature and Science of Sleep* 6: 73–84 ([Dovepress](https://www.dovepress.com/causes-and-consequences-of-sleepiness-among-college-students-peer-reviewed-fulltext-article-NSS)) | Peer-reviewed review. Cites a Midwest architecture school: **average sleep 5.7 h, 2.7 all-nighters per month, only 4% sleep ≥ 7 h**. One school, older data |
| **THACH08** | Thacher, P. V. (2008), "University students and the 'all nighter'", *Behavioral Sleep Medicine* 6(1): 16–31 | Peer-reviewed, general students: about 60% have pulled at least one all-nighter |
| **TAB17** | *The Tab* student surveys, 2017: about 1,500 US students (architecture average sleep **5.28 h**, lowest of the majors listed) and about 6,000 UK students (**88%** of architecture respondents have pulled an all-nighter) ([US](https://archive.thetab.com/us/2017/02/25/official-architects-sleep-deprived-majors-america-61510) · [UK](https://thetab.com/2017/03/24/revealed-courses-pull-nighters-get-work-done-uk-36112)) | Informal media surveys. Direction only |
| **LUND10** | Lund, H. G. et al. (2010), "Sleep patterns and predictors of disturbed sleep in a large population of college students", *J. Adolescent Health* 46(2): 124–132 | General college baseline: about 7.0 h per night |
| **AIAS20** | AIAS (2020), *Faculty & Student Studio Culture Survey Results* ([PDF](https://www.aias.org/wp-content/uploads/2020/07/LTCPP-2020-Survey-Results-1.pdf), 403 to automated download) | **Only 55 student respondents.** Search snippets: 47% spend > 40 h/wk on studio, 38.8% 25–40 h; a 2015 AIAS survey averaged 32 h/wk. Unverified |
| **NSSE16** | NSSE 2016 via *The Architect's Newspaper* ([archpaper](https://www.archpaper.com/2017/02/architecture-students-longest-hours/)) | Large US undergraduate survey: architecture **22.2 h/wk** of outside-class preparation, highest of the majors |
| **BACH06** | Bachman, L. & Bachman, C. (2006), "Student perceptions of academic workload in architectural education", *JAPR* 23(4): 271–304 ([academia.edu summary](https://www.academia.edu/14515809/STUDENT_PERCEPTIONS_OF_ACADEMIC_WORKLOAD_IN_ARCHITECTURAL_EDUCATION_2006_)) | One-week hourly diaries. A secondary summary says **about 72 h/wk including job hours**. Not verified against the paper |
| **CHRONO** | Student chronotype samples using the MEQ questionnaire: Saudi 2024 (27.4% morning / 50.5% neither / 22.1% evening; [PMC11419403](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11419403/)); Russian undergraduates (17.7% / 71.2% / 9.8%; [PMC11859069](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11859069/)); review: Adan et al. (2012), *Chronobiology International* 29(9) | Peer-reviewed. Evening types are **10–25%** of students |
| **STEEL07** | Steel, P. (2007), "The nature of procrastination", *Psychological Bulletin* 133(1): 65–94. Also Steel & König (2006), *Academy of Management Review* 31(4) | **Temporal Motivation Theory (TMT)**, the core effort-allocation model |
| **ARIELY02** | Ariely, D. & Wertenbroch, K. (2002), "Procrastination, deadlines, and performance", *Psychological Science* 13(3): 219–224 | Evidence that effort clusters before deadlines |
| **BORB82** | Borbély, A. A. (1982), "A two process model of sleep regulation", *Human Neurobiology* 1: 195–204 | Sleep pressure builds while awake and is released by sleep. Basis of the energy / sleep-debt state |
| **BANKS10** | Banks, S. et al. (2010), "Neurobehavioral dynamics following chronic sleep restriction: dose-response effects of one night for recovery", *Sleep* 33(8): 1013–1026 | One recovery night doesn't fully restore performance after restricted sleep |
| **DESK14** | DeskTime / Draugiem Group (2014) observational analysis of computer-use logs ([summary](https://www.managers.org.uk/insights/news/2016/january/why-you-should-never-work-for-longer-than-52-minutes)) | **Not peer-reviewed.** The top 10% worked about **52 min, then broke for about 17 min**. Used only as a starting value |
| **MARK05** | Mark, G., González, V. M. & Harris, J. (2005), "No task left behind? Examining the nature of fragmented work", *CHI 2005*: 321–330 | Field observation of 24 information workers, 3.5 days each: 11 min 04 s per working sphere before switching; 57% of working spheres interrupted; 23 min 15 s to resume. The F1 benchmark since 2026-11-08 |
| **GONZ04** | González, V. M. & Mark, G. (2004), "Constant, constant, multi-tasking craziness", *CHI 2004*: 113–120 | About 3 min per task event, 11.5 min per working sphere; the basis of MARK05 |
| **ARIGA11** | Ariga, A. & Lleras, A. (2011), "Brief and rare mental 'breaks' keep you focused", *Cognition* 118(3): 439–443 | Peer-reviewed support for breaks countering vigilance decrement |

### Model 1: Effort allocation and ramp-up (E1, E2, E6, E8, E12)

- **Temporal Motivation Theory (STEEL07).** The motivation to work on task *i* now is:

  **U_i = (E_i × V_i) / (1 + Γ × D_i)**

  - E_i = expectancy (confidence the work will succeed; linked to ST4)
  - V_i = value of the task (studio > other courses; review > pin-up)
  - D_i = time until the deadline, in days
  - Γ = the agent's impulsiveness / procrastination tendency, a persona trait

- **Daily hours of work** = H_base(style) × g(Σ_i U_i), capped at the waking hours left after the sleep model (Model 2).
  - Summing over all open deadlines makes **compounding emerge**. A studio review in the same week as a history assignment raises ΣU more than either alone, which matches E12.
  - ARIELY02 gives the empirical support that work clusters near deadlines.

- **Work style mapped to parameters [A].** H_base is the normal-week hours in the building (E1). Γ is impulsiveness (higher means more last-minute). **Superseded (2026-11-07):** personas are no longer an input. H_base = 48 h × exp(0.25C + 0.15 keenness) × circumstance factors (clipped 15–70 h), Γ = 0.3 × exp(−0.6C + 0.1N), V(studio):V(other) = 2 × exp(0.2 keenness); 200k draws give H_base p10/50/90 = 25/39/60 h, which keeps E1's floor median of about 40 h. The table is kept for the record:

| Persona | H_base (h/wk in building) | Γ | V(studio) : V(other) |
|---|---|---|---|
| S1 Studio Devotee | 50–65 | 0.3 | 3 : 1 |
| S2 Balanced Planner | 30–40 | 0.1 | 1.5 : 1 |
| S3 Struggling Novice | 35–45 | 0.6 | 2 : 1 |
| S4 Grade Optimiser | 35–45 | 0.2 | 1.5 : 1 |
| S5 Guarded Competitor | 40–50 | 0.3 | 2.5 : 1 |
| S6 Collaborator / Mentor | 35–45 | 0.3 | 2 : 1 |
| S7 Working / Commuter | 20–30 | 0.4 | 1.5 : 1 |
| S8 Maker / Digital | 40–50 (incl. shop time) | 0.4 | 2.5 : 1 |

- **Calibration check against the data:**
  - Weighted median about **40 h/wk in the building** in a normal week.
  - AIAS 2015 (32 h/wk in studio) and AIAS 2020 (most > 25 h; 47% > 40 h) bracket this.
  - The school's credit rule expects about 72 h/wk of total work (B7). BACH06's secondary figure (about 72 h including jobs) is consistent.
  - In-building hours are lower than total work because of off-site work (E9) and class time elsewhere.
- **Design work takes more time than expected (E8, as you noted):** V(studio) > V(other) makes studio crowd out other courses, as in AIAS 2002 ("studio overrides all other classes") and Battisto.
- **Weekends (E6):** P(come in on a weekend day) = 0.15 + 0.45 × min(1, ΣU_studio / U_ref), reaching about 0.6 within 3 days of a review [A].

### Model 2: Sleep, late work and all-nighters (E3, E4, E5, E13)

- **Sleep pressure S(t)** follows BORB82's two-process model:
  - it rises while awake (time constant about 18 h) and falls during sleep (about 4 h);
  - a circadian term C(t) is shifted by **chronotype**.
- **Chronotype (E3):** sampled per agent from CHRONO, about 20% evening / 25% morning / 55% intermediate.
  - Evening types and S1 Devotees together make up the **about 25% "late workers"** you described [D*]. Superseded (2026-11-07): late workers = evening chronotypes only, drawn at 25% with P(evening) × exp(0.2E − 0.3C).
  - They have a later preferred departure; outside crunch they often stay past 22:00. Superseded (2026-11-12, item 28): Owner 2026-11-12 (item 28, walkthrough stop 1): on an ordinary Tuesday with no deadline coming up there would not be that many night owls in studio; they prefer to work from home. The other headcounts seem fine. Found: the late-worker rule keyed on urgency > 1.3, which every student exceeds whenever any deadline is within a couple of weeks, so all 39 late workers stayed to 22:30-01:00 most nights; and the default day 2026-10-13 is three days before the midterm, not a plain week. Engine (`term.js`, `parameters.effort.late_nights` [A]): within 7 days of a review a late worker stays late every night; otherwise only with p 0.25, and everyone else leaves by 19:00-20:30 (E3: others leave by 18:00-20:00 outside crunch), the rest of the planned hours at home (E9). Plain Tuesday 2026-11-03 (seed 2026): planned in past 22:00 41 -> 10, past midnight 16 -> 2; the day run has 51 on the floor at 19:00, 16 at 20:00, 10 at 22:00, 2 at midnight. The midterm-week Tuesday 2026-10-13 is unchanged (case 1 bit-identical).
- **Superseded (2026-11-05).** The first version made all-nighters emerge from a single threshold, with S(t) + C(t) against a threshold raised by urgency, calibrated to 2.7 all-nighters per month. You pointed out that **all-nighters are more likely before a final and possible before a midterm, but many students sleep less without ever pulling one.** A single threshold can't produce that pattern: it shifts everyone's sleep by the same rule and has no separate "skip sleep entirely" choice. It is replaced by the two-part model below.

#### Model 2b: Two-part (hurdle) sleep model
- **Why two parts.** Your observation describes two different behaviours:
  - **Sleep restriction:** most students sleep less.
  - **Total sleep deprivation:** a minority, mainly before finals, don't sleep at all.

  Statistics treats data like this, many zeros plus a continuous amount, with a **two-part / hurdle model**. One equation decides *whether* the zero happens; a second gives *how much* otherwise.
  - Cragg, J. G. (1971), "Some statistical models for limited dependent variables with application to the demand for durable goods", *Econometrica* 39(5): 829–844.
  - Mullahy, J. (1986), "Specification and testing of some modified count data models", *J. Econometrics* 33(3): 341–365.

  The sleep literature also treats them separately. Chronic partial restriction (e.g. 4–6 h per night) builds deficits that differ from one total-deprivation night: Van Dongen, Maislin, Mullington & Dinges (2003), "The cumulative cost of additional wakefulness", *Sleep* 26(2): 117–126.
- **Part 1, the all-nighter decision (only on the 1–2 nights before a review):**
  - P(all-nighter) = logistic( logit(p_event) + ln(OR_i) + β_gap × progress gap )
  - **p_event by event [A], re-calibrated 2026-11-07:** final 0.32 · midterm 0.13 · pin-up 0.02 · other-course deadline 0.04. (Before: 0.25 / 0.08 / 0.01 / 0.03 with persona odds ratios averaging above 1.)
  - **Per-agent odds ratio [A] (traits only, 2026-11-07):** OR_i = exp(−0.4C + 0.3N + 0.2 keenness), centred on 1, p10/90 about 0.5/2.0. 200k draws give about 33% of students pulling one before the final, 14% before the midterm and 2% before a pin-up, as before. Superseded: the persona odds ratios (Devotee 2.5 · Struggling Novice 1.8 · Guarded Competitor 1.5 · Maker 1.3 · Working 1.2 · Grade Optimiser 1.0 · Mentor 1.0 · Balanced 0.3).
  - **Progress gap:** how far behind the agent is, as a standardised score from ST5 progress vs plan. β_gap = 1.0 [A].
  - Agents with an evening shift or childcare (A11, A13) can't choose one on those nights.
- **Part 2, sleep length on every other night:**
  - sleep = max( floor_i , need_i − δ × urgency ) + noise
  - need_i ~ N(7.2, 0.6) h. Sleep need differs per person.
  - **floor_i ~ U(4.0, 5.5) h: a personal "sleep floor"** the agent won't go below without choosing an all-nighter. People differ consistently in how sleep loss affects them: Van Dongen, Baynard, Maislin & Dinges (2004), "Systematic interindividual differences in neurobehavioral impairment from sleep loss: evidence of trait-like differential vulnerability", *Sleep* 27(3): 423–433.
  - δ = 1.2 h per unit of urgency [A]. Urgency is the TMT sum ΣU (Model 1), scaled so a normal week is about 0, the week before a review about 1.5, and the night before about 3.
  - noise ~ N(0, 0.4) h.
- **Simulated results** (100k draws; my calculation):

| Situation | Mean sleep (non-all-nighter nights) | 10th–90th percentile | Share pulling an all-nighter |
|---|---|---|---|
| Normal week | about 7.0 h (need 7.2 minus everyday course load) | 6.2–7.9 h | 0 |
| Week before a review | 5.7 h | 4.9–6.6 h | 0 |
| Night before a pin-up | 4.8 h | 4.0–5.5 h | **about 2%** |
| Night before the midterm | 4.8 h | 4.0–5.5 h | **about 14%** |
| Night before the final | 4.8 h | 4.0–5.5 h | **about 33%** |

- **How this fits the data:**
  - THACH08 says about 60% of students have pulled an all-nighter at some point during university. At about 33% per final and 14% per midterm, most students reach "at least once" within 1–2 years, which fits.
  - Battisto's student averaged "four and six hours a night", which matches the restricted range.
  - The term mean comes out **about 6.2–6.5 h**: lower than general students (7.0 h, LUND10), higher than HERSH14's architecture school (5.7 h). That fits your observation that many students sleep less without skipping sleep.
  - **HERSH14's 2.7 per month is kept only as an upper-bound "intense culture" scenario** (raise p_event about 3×).
- **How it connects to the rest of the model:**
  - Part 1 and Part 2 set the *amount* of sleep. The Borbély sleep-pressure state S(t) still tracks the *effect* of that sleep (energy, work rate, mood) and the recovery afterwards (E13).
  - Agents who pull an all-nighter are on the floor through the night. This drives late-night co-presence, plotter queues (D10) and the "commiseration" bonding (subjective S7).
- **Recovery (E13):**
  - After a review, sleep debt is repaid over several nights. One night is not enough (BANKS10). Battisto's student describes "12 to 18 hours" of weekend sleep.
  - Default [A]: first night 10–12 h; presence ×0.5 on day 1 and ×0.8 on day 2; motivation dips briefly, then resets with the new project phase.

### Model 3: Breaks within a work session (E11)
- An **alternating renewal process**: a work bout of duration W ~ gamma(k = 3, mean 52 min), then a break B ~ gamma(k = 2, mean 17 min). Means from DESK14, which is weak; shapes [A]. ARIGA11 supports breaks restoring vigilance.
- **External interruptions** come on top, as a Poisson process whose rate rises with nearby noise and passing agents (Heerwagen 2004; summary-metrics F2). Headphones lower that rate (D16).
- Breaks are where most chance encounters happen: kitchen, plotter, hallway (Backhouse & Drew, via Heerwagen).
- **Calibration:** check simulated focus blocks against Heerwagen's office range (< 10–30 min uninterrupted) and adjust.

- **Focus benchmark set from data (owner 2026-11-08, Q20).** MARK05 observed information workers for 3.5 days each: 11 min 04 s on average on a "working sphere" (a project or theme) before switching, 57% of working spheres interrupted, 23 min 15 s to return after an interruption; GONZ04: about 3 min on a single task event, 11.5 min per working sphere. These are the only field numbers on uninterrupted work length; DESK14's 52 min is a self-selected top decile of software users and stays as the undisturbed bout (the renewal draw) and the upper reference. The engine's F1 benchmark is therefore **11 min (median)** with 52 as the upper mark and the share of blocks of 25 min or more (J6 threshold [A]) reported beside it. The simulated median of about 16 min sits inside Heerwagen's office range (< 10 to < 30 min) and above MARK05; a studio-floor observation (one afternoon, ten desks, a stopwatch) would decide whether the interruption rate is right.

### Where work happens (E7, E9)
- **E7 medium:** instructors want printed boards and physical models; slides are rare.
  - Time split [A]: 55% digital production, 30% physical making, 15% printing, pinning and other.
  - Physical making means time at the desk (models), in the basement shop or at the main shop (D8). The printing share loads the plotters (D10).
- **E9 off-site:** 25% of work hours are off-site [A], split home 70 / library 25 / café 5.
  - The library closes, by default at 22:00 [A]; UBC library hours vary by branch and weren't confirmable online, so check them.
  - Cafés are rare because of cost and long sessions (your note).
  - Off-site agents drop out of the floor's encounter metrics.

### E10: meals (not answered, carried over)
Default kept [A]:
- Lunch: kitchen or own food at the desk.
- Evenings: delivery or own food.
- A food-street run (15 min walk) about 1 day in 3.

Please confirm or correct.

---

### E6 and D10: the weekend before a review (added 2026-11-11, item 32)
- Owner 2026-11-11 (item 32): before a final the stress is heightened, late nights and all-nighters are likelier, and the organised print early for fear of the plotter failing. Engine: within seven days of a review a weekend day is a working day (presence 0.7 x ramp, a full day rather than 0.8 of one, arrivals from 10:00, late workers to 23:00-02:00, the all-nighter hurdle on the eve); each student's print day is 1 + 2 x C days before the review (C = 0 the day before, C = +1 three days before, at most six), a missed day caught up on the next day in, 30% reprint on the eve, with a 'print_early' remark. Saturday 2026-12-05 (seed 2026): 133 of 165 students in, 6 on the floor at 10:00, 81 at 14:00, 63 at 20:00, 21 at midnight, 8 print jobs. Numbers [A]; the 81% presence is the one to check.

### F9 and E3: Good Times attendance and Friday evenings (added 2026-11-12, stop 5)
- Owner 2026-11-12 (walkthrough stop 5): Good Times should not be that full (95 at the event); people may grab something and leave quickly; on Fridays people are less likely to stay to the end of studio once their desk crit is done, and with other plans they leave earlier. Found: the Good Times situation added half of everyone present for 150 minutes on top of the calendar's own Friday rule (the plain Friday already had 73 attenders, peak 53). Engine: the situation adds nothing on a day that has the event and uses the plan's own rule on any other day; a grab-and-go share of attenders (`social.events.good_times.grab_share` 0.4, 10-20 min; waffle 0.6, 8-15 min) and the rest 40 to 100% of the event, the plan's leave extended only to the end of the stay; on a Friday, `effort.friday.plans_p` 0.4 of students leave 20-60 min after their desk crit ends and skip the evening (remark `friday_plans`). All [A]. Friday 2026-10-23 (seed 2026): 57 attend over the evening, 30 of them a quick grab, 27 at the event at the peak, 15 at 19:00; 25 leave early after their crit; the floor 112 at 18:00 and 35 at 20:00. Q11's 50-60 at Good Times reads as the number who come through, not the number in the room at once; to confirm. Owner, same stop: the 50-60 are the number who come through, at the start of Good Times; arrivals now fall within 25 minutes of the start (`arrive_within_min`), giving 57 through the evening and 33 in the room at the peak.
### SP4: the lift against the stairs (added 2026-11-12, stop 8)
- Owner 2026-11-12 (walkthrough stop 8): unless tired or with a mobility need, it is unlikely anyone takes the lift for one floor to the washroom; carrying a model is different. Engine (`engine.travelTo`, `parameters.walking` [A]): one floor is the stairs with a 5% exception, the lift with p 0.7 when the trip is to or from the plotters, the printers, the 3D printer, the shop, a review or a pin-up (a load), p 0.5 after 22:00 or with a sleep debt of 9 h or more (the median student carries 6 to 7 h in a review week, so the threshold had to sit above it), and always with a mobility need; two floors or more keep 70% lift. `population.mobility_need_share` 0.03 is a PLACEHOLDER with no data, drawn on its own random stream so the population is unchanged. Tuesday 2026-10-13 (seed 2026): one-floor trips 999 by the stairs and 56 by the lift for no reason, 38 with a need, 7 with a load, 60 of 112 tired; two-floor trips (the lectures on Level 1) 455 lift, 281 stairs; lift boarded 610 -> 580. `stats.liftChoice` keeps the count by reason. The washroom line no longer says 'if the lift comes'.
## Category F: Social dynamics and collaboration

Most of your answers say the behaviour **depends on the individual**: their sociability, comfort, confidence and keenness. So this category mainly sets **per-agent traits and how they change over time**. These are collected in [agent-variables.md](agent-variables.md).

### Sources added

| Key | Source | Use |
|---|---|---|
| **APR24-SOC** | APR24 (Category A): student engagement and wellness passages | "sponsored happy hours (SALA's 'Good Times' events)"; "M.Arch mentorship program"; ARCHUS "weekly healthy breakfast where students prepare waffles, crepes"; termly Health and Wellness Days; student groups (FAFA, NOMAS, ILANDS). Student survey: "studio culture was consistently mentioned as fostering a creative environment" |
| **FSB50** | Festinger, L., Schachter, S. & Back, K. (1950), *Social Pressures in Informal Groups*, Harper | Classic evidence that physical proximity and shared paths predict friendship formation (the Westgate housing study) |
| **KW06** | Kossinets, G. & Watts, D. J. (2006), "Empirical analysis of an evolving social network", *Science* 311(5757): 88–90 | New ties form mostly through triadic closure (friends of friends) and shared foci (same class or place) |
| **REIS11** | Reis, H. T. et al. (2011), "Familiarity does indeed promote attraction in live interaction", *J. Personality and Social Psychology* 101(3): 557–570 | Repeated interaction increases comfort and liking. Basis of "comfort grows over time" |
| **EDM99** | Edmondson, A. (1999), "Psychological safety and learning behavior in work teams", *Administrative Science Quarterly* 44(2): 350–383 | Help-seeking depends on perceived interpersonal risk |
| **KARA03** | Karabenick, S. A. (2003), "Seeking help in large college classes: a person-centered approach", *Contemporary Educational Psychology* 28(1): 37–58 | Students differ in help-seeking style. Perceived threat and cost decide whether and from whom they seek help |
| **DL86** | Daft, R. L. & Lengel, R. H. (1986), "Organizational information requirements, media richness and structural design", *Management Science* 32(5): 554–571 | Media richness: rich, face-to-face channels for ambiguous tasks, lean, digital channels for routine ones. Basis of the online vs in-person choice |
| **BT18** | Bernstein & Turban 2018 (Collab folder) | Digital channels substitute for face-to-face contact in exposed settings |
| **FEST54** | Festinger, L. (1954), "A theory of social comparison processes", *Human Relations* 7(2): 117–140 | People judge themselves by comparing with similar others. Basis of the sleep-loss comparison (F7) and perceived competition (F1) |
| **BIG5** | John, O. P. & Srivastava, S. (1999), "The Big Five trait taxonomy", in *Handbook of Personality* (2nd ed.); Steel 2007 (Category E) | Grounds the agent traits: Extraversion → sociability; Conscientiousness → (low) procrastination, a strong negative correlate in Steel's meta-analysis; Openness → curiosity; Neuroticism → stress sensitivity and perceived threat |

### F1, F3: perceived competition, sociability, comfort over time
- **Cohort default: supportive** (SO1). Perceived competition is an individual reading:
  - perceived_competition_i = c_0 × (1 − confidence_i) × (1 − comfort_i) × (1 + N_i) [A]
  - N_i = Neuroticism (BIG5). FEST54: comparison is felt more strongly by people unsure of their own standing.
- **Comfort in the space (ST9, new state)** grows with familiarity (REIS11):
  - comfort_i(t) = 1 − (1 − c_i0) × exp(−t_i / τ) + 0.05 × (number of ties) [A]
  - t_i = hours spent on the floor. τ = 60 h [A], about 1.5 normal weeks.
  - c_i0 by group [A]: returning Year 2–3 students 0.6; Year 1 0.3; Year 2 newcomers with advanced standing (A3, OR7) 0.3.
- **Peer exchanges per day (F3):**
  - rate_i = r_0 × sociability_i × comfort_i, with r_0 = 4 per day [A]
  - sociability_i comes from Extraversion (BIG5), standard normal, mapped to 0.3–1.7.
  - The result is wide variation between agents. Quiet newcomers start low and rise over the term.
- **Who gets to know whom:**
  - Proximity and shared paths (FSB50; Kabo 2014, already in the metrics note)
  - Friends of friends and same section or year as shared foci (KW06)
  - Events as foci (F9)
  - Tie strength (ST8) increases with each interaction and decays slowly without contact [A].

### F2: help-seeking ladder
- **Your order:** a friend if it's easy, then the TA, then the instructor.
- **Model:** for each help need, the agent picks the first source on the ladder whose **cost** is below its threshold (KARA03; EDM99):
  - cost = access cost (distance, availability) + social cost (1 − tie strength) × perceived threat
  - Access cost is high if the friend is wearing headphones (D16), in a crit, or off the floor. Social cost is low for strong ties.
  - Perceived threat = f(Neuroticism, 1 − comfort).
- **Friend:** a strong tie (ST8 > 0.5 [A]) who is nearby, or online via chat.
- **TA:** an upper-year M.Arch student (A6). Reachable in class, or on the floor if their own desk is there.
- **Instructor:** only during studio sessions or by email, which is slow. The help is often deferred to the next desk crit (C1–C3).
- An agent with no friend available and high perceived threat may **not seek help at all** and keeps working alone. This matters for the Struggling Novice and Social Outsider personas.

- **Office hours (owner 2026-11-08, Q10):** who uses them depends on the student. Model [A]: P(visit per week) = 0.15 × exp(0.4 keenness − 0.3 N + 0.2 C), clipped 0.01–0.8 (sample p10/50/90 about 0.04 / 0.14 / 0.40), only when the section's instructor has an office in this building and is in that day (Mon and Wed [A]); a visit is 15 minutes at the office and counts as an interaction. Anxious students (high N) go less, in line with KARAB03's threat term.

### F4: online channels
- Submission and distribution are online. Group work is coordinated online. Meetings are online when commuting is hard or the content doesn't need in-person.
- **Channel choice (DL86):**
  - Routine coordination → online.
  - Ambiguous design discussion → in person, if the other party is co-present or the trip is cheap.
  - Commute constraints (A12) and evening hours push toward online.
- **Effect:** online exchanges build ties more weakly (×0.5 [A]) and produce no co-presence or overhearing. BT18: the digital channel substitutes for face-to-face, so face-to-face metrics (summary-metrics C4) fall as online use rises.

### F5: contact between years
- **Volunteer mentor program, 3rd-years ↔ 1st-years** (APR24-SOC: "M.Arch mentorship program").
  - Default: 50% of Year 1 students have a mentor [A].
  - A mentor pair starts with tie strength 0.3, and the mentee's help ladder includes the mentor after friends.
- **TAing (A6)** creates contact in class between Year 2–3 TAs and lower years.
- The shared floor (D5) and events (F9) add chance contact between years.
- These links are the main source of the "between-year" interactions in summary-metrics C6 and C14.

### F6: curiosity about others' work
- curiosity_i from Openness (BIG5) [A] and keenness (motivation ST3).
- A curious agent passing within 3 m of the back-of-desk pin-up or a movable board (D3) has a probability of a short detour to look, 1–3 min, proportional to curiosity_i [A].
- Viewing someone's work can lead to a conversation (a tie) and gives a small boost to idea variety (subjective S4).

### F7: comparing sleep loss
- Students compare how much sleep they've lost, and share concern about it. That is commiseration more than bragging.
- **In conversations near deadlines** (sleep debt > 2 h), agents disclose their sleep loss with probability 0.5 [A].
- **Effects:**
  - Tie strength increases a little: shared hardship bonds (Battisto: "bonds built through commiseration").
  - Each agent's work-hours norm drifts slightly toward the group (BH4, social contagion of hours, scaled by FEST54 comparison).
  - With a supportive cohort (F1), the norm effect is weak (0.1 [A]) and the bonding effect moderate.

### F8: studio culture policy
- You don't know of one. A text search of APR24 found no named studio-culture or learning-culture policy. It describes ARCHUS health and wellness initiatives, Health and Wellness Days, a Student Affairs Committee and student groups.
- AIAS 2008: 91% of US programs have such a policy, but awareness is low (59% of student leaders).
- **Model:** no explicit policy lever. Culture is carried by norms (SO) and personas.

### F9: social rituals (recurring, scheduled social magnets)
These are **time–space routines**: regular gatherings at fixed times and places that sustain ties (Sailer & Penn, in the Collab folder).

| Event | When | Draw | Model defaults [A] |
|---|---|---|---|
| **Good Times** (SALA-sponsored happy hour; APR24-SOC) | Every Friday evening, after studio (Years 2–3 studio ends 18:00) | Food free, drinks paid | Attendance P = 0.35 × sociability_i × (1 − urgency); 18:00–21:00; location to be labelled |
| **Waffle Wednesday** (ARCHUS weekly breakfast; APR24-SOC) | Every Wednesday morning | Free food | P = 0.4 × sociability_i; 9:00–11:00; a morning magnet on a non-studio day |
| **Halloween** | Ticketed, once a term (default Fri Oct 30, 2026) | Social, paid | P = 0.5 × sociability_i; evening. **Clash:** the same day as the October monthly assignments (B11) |
| **Off-campus celebrations** with friends | After reviews | Friends | Not simulated on the floor. The agent is absent; ties strengthen if attending with friends |

- Events are where **between-section and between-year ties** form (shared foci, KW06). Attending lowers stress (−0.1 [A]) and raises comfort.
- Under deadline pressure, attendance drops.

---

## Category G: Costs and resources

### Sources added

| Key | Source | Figures |
|---|---|---|
| **SALA-FEES** | SALA, *Fees, financial assistance + awards* ([sala.ubc.ca](https://sala.ubc.ca/fees-financial-assistance/)) | Books and supplies vary with "book, material/shop, and printing purchases". **Minimum expected per year: $1,000** |
| **SALA-HB25** | SALA *2025 Graduate Handbook* ([PDF](https://sala.ubc.ca/wp-content/uploads/2025/08/graduate-handbook_25W.pdf)) | A suitable laptop "may cost up to $4000"; plotters print up to 42" wide |
| **APR24-IT** | APR24 (Category A), computation section | "SALA's computation ecosystem is built around student-owned laptops". SALA "covers essential software costs like Adobe Creative Cloud and Rhino". No stand-alone computer lab |
| **SALAFAB** | SALAfab materials page ([blogs.ubc.ca](https://blogs.ubc.ca/salafab/resources/materials/)) | The shop sells materials, e.g. PLA filament roll $35. 3D printing: one-time $15. Woodshop users supply their own material (MDF the most common) |
| **US-ANEC** | Student press and guides: [Daily Orange 2022](https://www.dailyorange.com/2022/10/vpa-architecture-students-frustrations-out-of-pocket-supply-costs/), [Huntington News](https://huntnewsnu.com/87951/primary-homepage/the-unexpected-price-tag-of-being-an-architecture-major-it-definitely-becomes-a-barrier/), [Michigan Daily](https://www.michigandaily.com/news/academics/the-cost-of-creativity-art-and-architecture-students-lament-the-cost-of-class-materials/) | Model materials **$100–300 per major studio project**; about **$12 per large print**; one student about $350/semester; a first-year made about 2 models/week at about $50 each. **Anecdotal, US** |
| **CARLETON** | Carleton University, *Educational Costs* ([students.carleton.ca](https://students.carleton.ca/course-outline/educational-costs/)) | M.Arch: $1,049 expendable supplies plus $1,037 equipment per year (excluding computers). A Canadian comparison |

### Cost model per agent (G1, G2)
- You said costs vary by term, section and course requirements, and that models and printing add up.
- **Per project phase (B9) [D*]:**
  - **Models:** $100–300 for each major phase (midterm, final), $0–80 for the starter phase (US-ANEC). The Maker persona is at the top of the range; CAD-focused agents at the bottom.
  - **Printing:** at each review and pin-up, sheets = 3–6 + reprints (25% [A]) at about $10–15 per large sheet [A]. That is about $100–250 per term, and it feeds the plotter demand (D10).
- **Term total:** lognormal, **median about $700, 10th–90th percentile about $450–1,200** [D*].
  - The floor is consistent with SALA's minimum of $1,000/yr, i.e. about $500 per term.
  - It is comparable to Carleton's about $1,050/yr for supplies.
- **What costs do in the model:**
  - **Financial stress:** money stress rises when cumulative spend passes a personal budget, which is set lower for working students and international students [A]. Battisto: 44% find finances stressful. CGPSS: financial pressures are a major obstacle for 35% of Canadian graduate students.
  - **Cost-saving behaviour:** a constrained agent reprints less, uses cheaper materials or a smaller model, and makes fewer shop purchases. That changes plotter load and shop trips.
- **G3 laptops:** students own them; core software is provided (APR24-IT). Not modelled as a per-term cost. The laptop is the agent's main work tool, so there is no computer lab to queue for.
- **G4:** material is sold in both shops (SALAFAB and your answer), so "buy material" is one of the reasons for a shop trip (BH18).

---

## Category H: Well-being and support

### Sources added

| Key | Source | Figures |
|---|---|---|
| **BATT24** | Battisto et al. 2024 (Practice folder) | US architecture and landscape students: 80% often or always stressed; DASS-21 moderate+: depression 33%, anxiety 46%, stress 33%; 25% diagnosed vs 57% suspecting anxiety or depression |
| **CGPSS22-WB** | CGPSS 2022 national report (Category A), Q30 and disability items | Canadian graduate students' overall well-being: excellent 16.3%, very good 31.1%, good 29.5%, **fair 13.7%, poor 7.4%** (N = 48,074). Mental-health disability reported by **16.6%**. Financial pressures a **major obstacle for 35%**; work commitments 17.8% |
| **UBC-WB** | UBC support services ([AMS Here2Talk](https://www.ams.ubc.ca/support-services/student-resources/here2talk/); UBC Student Services summaries) | UBC Counselling Services and Student Health Service (free); Wellness Centre (UBC Life Building); UBC Student Assistance Program (24/7, phone, video or in person); Here2Talk (BC, 24/7, phone, chat or app); BC crisis lines |
| **APR24-WB** | APR24, student well-being section | ARCHUS weekly healthy breakfast; termly Health and Wellness Days with UBC Wellness Peers; Student Affairs Committee |

### H1: stress calibration targets
You said to use data. The stress state (ST2) is calibrated so that:
- **normal weeks:** about **20%** of agents are in "high stress" (stress > 0.7). That matches CGPSS's 21.1% fair or poor well-being among Canadian graduate students.
- **review weeks:** about **33–46%** are in high stress, matching BATT24's moderate+ depression and stress (33%) and anxiety (46%).

**Flag:** BATT24 is a US architecture school surveyed during COVID (Fall 2021), and CGPSS covers all graduate disciplines. UBC M.Arch probably falls in between. Your experience is the check (subjective S18 / S24).

- **2026-11-11 (item 33):** Stress rule rebuilt: each day stress relaxes 15% toward a personal baseline (0.40 + 0.15 x N); the rise before a review comes from the days to that year's next review (zero two weeks out, full on the day) scaled by exp(0.5 N) with weight 0.03; the other courses' deadlines add a little through the urgency sum (0.002); sleep debt and a bad crit add as before; the constant daily push of 0.015 is gone. Probed over five seeds (test/_stress.mjs): about 18% high in a normal week (band 15-24%), 42% the week before the midterm, 36% in the review week, 43% the week before the final; the low-N third is never high, the high-N third almost always. Owner 2026-11-11: a normal week depends on personality; 55% before reviews is near the target, bring it down.

### H2: support services
- **UBC:** Counselling Services, Student Health Service, Wellness Centre, Student Assistance Program (24/7), Here2Talk (24/7).
- **SALA:** ARCHUS wellness programs (APR24-WB).
- **Model:** the floor has no on-site support, so support is an **off-site, low-uptake action**.
  - BATT24 shows a treatment gap: 25% diagnosed vs 57% suspecting. Default: P(seek formal support | sustained high stress for more than 7 days) = 0.1 per week [A].
  - Seeking support lowers stress gradually and takes the agent off the floor for about 1 h.
  - Informal support (friends, events, F2/F9) is the main stress buffer in the model.

### H3: instructor push
- Instructors don't encourage all-nighters but push for the best work. That matches AIAS 2008's mutual-blame quote: students hold on to all-night habits while faculty resist alternative review formats.
- **Model:** an instructor "push" factor p_push multiplies the TMT value of studio work (V_studio) in the 2 weeks before a review.
  - Default by instructor style (C12): critic 1.3, mixed 1.15, facilitator 1.0 [A].
  - This raises hours and the progress gap, so it raises all-nighter odds **indirectly** through BH21. There is no explicit sleep rule.

---

## Category I: Persona mix (closed 2026-11-07) → personality population model
Closed: the user chose **traits only**. No persona shares are needed. In their place, this section records how the trait distribution is set (registry AT15; personality-model.md §2).

### Sources added

| Key | Source | Figures |
|---|---|---|
| **IPIP-NEO** | Johnson (2014), *J. Research in Personality* 51: 78–89; data at [osf.io/tbmh5](https://osf.io/tbmh5/) | About 307,000 respondents 2001–2011, mean age 25.2, 60% women, with age, sex and country; public domain. Johnson & Twomey (2022) built UK/Ireland norms from it and give the procedure for other countries and age bands |
| **OPSYCH** | Open-Source Psychometrics IPIP-FFM data, 8 Nov 2018 ([raw data](https://openpsychometrics.org/_rawdata/)) | 1,015,342 records, 50 items, no field of study. Backup for the base distribution |
| **FEIST98** | Feist (1998), *Pers. Soc. Psych. Review* 2(4): 290–309, Table 3 | Artists vs nonartists, 29 studies: median d O+ +0.47, O− −0.43, C+ −0.49, A− +0.21, E+ +0.15, N+ about +0.1. Scientists vs nonscientists: C+ about +0.5. Moderated by publication date and age |
| **VEDEL16** | Vedel (2016), *Pers. Individ. Diff.* 92: 1–10 ([BPS summary](https://www.bps.org.uk/research-digest/personality-differences-between-students-studying-different-academic-subjects)) | 12 studies, 13,389 students, 7 countries: arts/humanities lower C, higher O (large effect); medium effects on all five traits across majors. Arts not broken down by major |
| **SCHMITT08** | Schmitt, Realo, Voracek & Allik (2008), *JPSP* 94(1): 168–182 | 17,637 people, 55 nations: women higher on N, E, A and C in most nations; differences larger in more developed countries |
| **WEISBERG11** | Weisberg, DeYoung & Hirsh (2011), *Frontiers in Psychology* 2: 178 ([open access](https://www.frontiersin.org/articles/10.3389/fpsyg.2011.00178/full)) | Women higher on E, A, N at the domain level; O and C differences only at the aspect level; effects small to medium |
| **SOTO11** | Soto, John, Gosling & Potter (2011), *JPSP* 100(2): 330–348 | Age trends: C and A rise, N falls, through adulthood; small over 23–30 |
| **SUTD26** | Hendra, Blessing, Silva & Ang (2026), *Proc. Design Society* 6: 2971–2980 ([open access](https://www.cambridge.org/core/journals/proceedings-of-the-design-society/article/exploring-the-link-between-students-big5-personality-test-and-design-project-performance/1EE3A4EC3E92122472D345F1FE437FC1)) | 535 first-year design students, Singapore, commercial Big Five test; no means reported; individual and team-mean Conscientiousness predict project grades (small effects); within-team spread of C and N lowers grades (marginal) |
| **MACKINNON** | MacKinnon (1962), *American Psychologist* 17: 484–495; Serraino (2016) *The Creative Architect* ([Dwell](https://www.dwell.com/article/the-little-known-personality-study-on-the-giants-of-midcentury-architecture-5685b99c)) | 40 eminent architects at IPAR 1958–59, CPI and MBTI; full results never published; selection bias acknowledged. Not a student population |
| **MBTI-ARCH** | Single-school MBTI studies: SUTD design teams ([Cambridge](https://www.cambridge.org/core/journals/proceedings-of-the-design-society/article/exploring-the-link-between-students-mbti-personality-types-and-design-team-performance/E1FD7E1E5A8320657271FDF1FD201A81)); Alexandria University novice architecture students ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1110016822006354), 403 to automated fetch); a landscape architecture pilot (CELA) | INTJ 18% most common at SUTD; intuitive types linked to creativity in Alexandria; NF 63% in the landscape pilot (Keirsey). Small, single-school, MBTI: not convertible to Big Five means |

### The population model [D* + A]
- Trait vector z ~ MVN(μ_group, Σ) in general-population SD units; Σ from IPIP-NEO Canada 22–32 (to compute; placeholders [A]: N–C −0.25, N–E −0.25, N–A −0.20, E–O +0.25, C–A +0.20).
- Field shift for design students [D*]: O +0.5, C −0.25 (FEIST98, VEDEL16; C halved because architecture sits between art and science).
- Sex shift per agent [D]: women N +0.40, A +0.35, E +0.10 (SCHMITT08, WEISBERG11); men and non-binary 0 [A].
- Age: none [A] (SOTO11).
- Re-centring: parameters calibrated to a cohort target (E1 hours, E4 all-nighter shares) multiply their base by exp(−Σ w_k μ_k) so the targets hold; parameters without a target take the shifts in full.
- Architecture-specific evidence (MACKINNON, SUTD26, MBTI-ARCH) was reviewed and is not usable as a distribution.
- **Observation:** an anonymous BFI-2-S (30 items) or IPIP-NEO-120 survey of the cohort replaces μ and Σ (status O). About 60 responses give a standard error of about 0.13 SD per trait mean. BREB approval if used in the thesis.

---

## Category J: Model parameters (kept; unreferenced)
- You have no reference for J1–J10. They stay as defaults, marked **[A], unreferenced**.
- **Method for handling them: sensitivity analysis.** Before relying on results, run a screening analysis.
  - Vary each [A] parameter across a plausible range, one at a time, along random trajectories.
  - Rank the parameters by how much they move the core metrics (summary-metrics §5).
  - Then refine only the influential ones, through observation or your judgment.
- **References:**
  - Morris, M. D. (1991), "Factorial sampling plans for preliminary computational experiments", *Technometrics* 33(2): 161–174 (the elementary-effects / Morris screening method).
  - Saltelli, A. et al. (2008), *Global Sensitivity Analysis: The Primer*, Wiley.
- **J9** is now mostly covered by the hurdle all-nighter model (BH21). Keep 0.5 as an optional extra bump after a late crit, or drop it to avoid double counting.
- **J10:** Bernstein's 10 m face-to-face rule came from badge sensors in offices. In a dense studio, 2–3 m may better separate a conversation from simply being nearby. This is a good sensitivity candidate.
