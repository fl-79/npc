# Personality model (proposal)

Started 2026-11-05. **Status: partly decided (2026-11-05).**

### Decisions so far
| Choice | Decision |
|---|---|
| Base model | **Big Five (OCEAN)**, confirmed by user |
| Momentary states | **Whole Trait Theory layer**, confirmed by user (see §2b) |
| MBTI | **Display layer on top**, derived from the Big Five, because MBTI is better known (see §2c). It does not drive behaviour |
| CAPS if–then rules | Open. Kept as proposed default |
| Add-ons (perfectionism, chronotype link) | Open. Kept as proposed default |
| Personas: trait regions vs traits only | **Traits only**, decided by user 2026-11-07. Personas are no longer an input; they remain a reporting vocabulary (§5) |
| Mapping weights | Open. [A], to be screened |

This note proposes how agent personality is modelled. It is built as a **swappable module**, so the psychological model can be changed later without rewriting the rest of the simulation. It links personality to:
- the per-agent variables in [agent-variables.md](agent-variables.md)
- the subjective components in [subjective-components.md](subjective-components.md)

Personality then *informs* those variables. For example, introversion slows how fast comfort and sociability grow in a new environment.

References are listed at the end. Page numbers are given where I'm confident of them; check them before formal citation.

---

## 1. Candidate psychology models

| Model | Origin | How it works | Strengths for this simulation | Weaknesses |
|---|---|---|---|---|
| **Big Five / Five-Factor Model (OCEAN)** | Goldberg 1990 (lexical); Costa & McCrae 1992 (NEO-PI-R); John & Srivastava 1999 | Five broad, independent-ish dimensions, each normally distributed in the population: **O**penness, **C**onscientiousness, **E**xtraversion, **A**greeableness, **N**euroticism. Each splits into facets (e.g. BFI-2: 15 facets, Soto & John 2017). Short public-domain measures exist: IPIP (Goldberg 1999) and the 10-item TIPI (Gosling et al. 2003) | The most-validated trait model, with a large literature linking each trait to behaviour (stress, social ties, procrastination, creativity, noise sensitivity). Used in crowd simulation (Durupinar et al. 2011) and to shape LLM agents (Serapio-García et al. 2023; Jiang et al. 2024) | Traits are averages and don't say *when* behaviour changes. No explicit honesty or competitiveness dimension |
| **HEXACO** | Lee & Ashton 2004; Ashton & Lee 2007 | Six dimensions: the Big Five (somewhat rotated) plus **H**onesty-Humility (sincerity, fairness, modesty, low greed). HEXACO-60 is free | H fits the **Guarded Competitor**, idea-guarding and status seeking better than low Agreeableness alone. A drop-in extension of OCEAN | Less applied literature than the Big Five; Emotionality differs slightly from Neuroticism |
| **Reinforcement Sensitivity Theory (BIS/BAS)** | Gray 1987; Carver & White 1994 | Two motivational systems: **BAS**, sensitivity to reward (approach), and **BIS**, sensitivity to punishment or threat (avoid) | Maps directly to **crits**: reward from praise vs fear of judgment. Good for S13 (fear in reviews) and S40 (how push is heard) | Narrower. Best used as a *layer* under OCEAN, roughly BAS ≈ E and BIS ≈ N |
| **Whole Trait Theory** | Fleeson 2001; Fleeson & Jayawickreme 2015 | A trait is the **mean of a distribution of momentary states**. A person's state extraversion varies hour to hour around their trait level, pushed by the situation | **Ideal for agents:** each tick, sample a *state* from the trait plus the situation. It explains "depends on the situation" answers (Category F) | A framework, not a separate trait list. Sits on top of OCEAN or HEXACO |
| **Cognitive-Affective Personality System (CAPS)** | Mischel & Shoda 1995 | Personality as stable **if–then signatures**: *if* situation X, *then* behaviour Y. Two people with the same average can differ in which situations trigger them | Matches your conditional answers ("asks a friend *if* it's easy"). The if–then rules are a natural form for LLM prompts | Hard to parameterise from data. Best as a rule layer |
| **MBTI** | Myers-Briggs | 16 types from four dichotomies | Familiar to users | **Not recommended as the core:** poor reliability and validity, and types are artificial cuts of continuous traits (Pittenger 2005). Its scales correlate with four of the Big Five (McCrae & Costa 1989), so MBTI labels can be *displayed* on top of OCEAN if wanted |
| **Add-on narrow traits** | Perfectionism (Hewitt & Flett 1991); procrastination (Steel 2007); grit (Duckworth et al. 2007; largely C per Credé et al. 2017); chronotype (separate biological trait) | Specific constructs predicting studio-relevant behaviour | Perfectionism fits the **Devotee / perfectionist** (*ST* Ch. 8: students who "make themselves ill") | Overlap with the Big Five. Add only where they predict beyond it |

### Recommendation
- **Core: Big Five (OCEAN).**
- **Layered with:**
  - **Whole Trait Theory** for momentary states, so behaviour varies with the situation;
  - **CAPS-style if–then rules** for the conditional behaviours you described;
  - two optional add-ons, **perfectionism** and **chronotype**.
- **HEXACO** is the ready upgrade if idea-guarding and competition need their own dimension (Honesty-Humility).
- **BIS/BAS** can be derived from E and N for crit reactions, without extra parameters.

---

## 2. Modular design (so the model can be changed)

```
[1] Trait schema      → list of dimensions (OCEAN default; HEXACO = OCEAN + H; add-ons)
[2] Population model  → means, SDs, correlations; group shifts (field, sex); cohort survey replaces them
[3] Mapping table     → behavioural parameter = base × exp( Σ w_k × trait_k )   (editable weights)
[4] State layer       → momentary state = trait + situation effects + noise     (Whole Trait Theory)
[5] If–then rules     → conditional behaviours keyed to situations              (CAPS)
[6] LLM rendering     → traits → descriptive adjectives/narrative in the agent's prompt
```

- **Swapping the model** means editing [1], [2] and [3] only. The rest of the simulation reads behavioural parameters, never traits directly.
  - For example, going to HEXACO adds an H column to the mapping table and re-weights the competition rows.
- **Log-linear mapping in [3].** Traits are in SD units, so a weight w = 0.3 means +1 SD multiplies the parameter by e^0.3 ≈ 1.35. That makes every weight readable and easy to edit, and keeps parameters positive.
  - Weights are [A] unless a reference gives an effect size; sensitivity screening (Category J) will test them.
- **Population model [2], decided 2026-11-07 (user: traits only, no personas; the trait combination carries all individual variation).** Each agent's trait vector z = (O, C, E, A, N) is drawn from a multivariate normal in **general-population SD units**, z ~ MVN(μ_group, Σ):
  - **Base and correlations Σ:** from the public-domain IPIP-NEO repository (Johnson 2014; about 307,000 respondents with age, sex and country; OSF tbmh5), restricted to Canada, ages 22–32, following the norm-building procedure of Johnson & Twomey (2022). The subset still has to be computed; until then Σ uses literature-typical intercorrelations [A]: N–C −0.25, N–E −0.25, N–A −0.20, E–O +0.25, C–A +0.20, others 0. The marginal shape in these data is slightly skewed; a normal is kept for simplicity [A].
  - **Field shift (design students) [D*]:** μ_O = +0.5 SD, μ_C = −0.25 SD. Feist (1998), artists vs nonartists, 29 studies: median d = +0.47 on Openness and −0.49 on Conscientiousness, with small effects on the other dimensions. Vedel (2016), 12 studies, 13,389 students: arts and humanities majors higher on Openness (large effect) and lower on Conscientiousness. Architecture sits between art and science (Feist's scientists are higher on C), so the C shift is halved. The small artist effects on A and E are dropped [A].
  - **Sex shift [D]:** sampled per agent after sex (58% F / 41% M / 1% NB, A9): women N +0.40, A +0.35, E +0.10 SD; men 0; non-binary 0 [A]. Schmitt et al. (2008), 55 nations; Weisberg, DeYoung & Hirsh (2011). Applied per agent so the difference stays inside the cohort.
  - **Age:** no shift for 23–30 (maturation effects over this band are small; Soto et al. 2011) [A].
  - **Re-centring rule:** parameters that were calibrated to a cohort-level target (H_base median about 40 h, E1; all-nighter shares 33% / 14% / 2%, E4) multiply their base by exp(−Σ w_k μ_k), so the cohort targets hold by construction and the group shifts change only the spread and the between-agent ordering. Parameters without a cohort target (curiosity detours, tie formation, headphone use…) take the shift in full, which is the point of it.
  - **Architecture-specific evidence, reviewed and judged unusable as a distribution:** MacKinnon's 1958–59 IPAR study of 40 eminent architects (CPI, MBTI; full results never published; elite, not students); Hendra et al. (2026), 535 first-year design students at SUTD, commercial Big Five test, no means reported, Conscientiousness predicted project grades; one Big Five study of architecture students found no link to creativity and gives no norms; single-school MBTI studies (SUTD: INTJ 18%; Alexandria: intuitive types more creative; a landscape pilot: NF 63% on Keirsey). MBTI type shares cannot be converted to Big Five means.
  - **Measurement (status O when done):** an anonymous BFI-2-S (30 items, free for research) or IPIP-NEO-120 (public domain) survey of the cohort. With about 60 of 165 responding, the standard error of a trait mean is about 0.13 SD, enough to confirm or reject the ±0.5 field shift. It replaces μ and Σ above. Needs BREB approval if it feeds the thesis. Added to the observation programme.
  - **Note:** the persona shifts that this replaces (agent-variables.md, superseded table) were between 0.2 and 0.8 SD and unsourced; the field and sex shifts above are of the same order but come from meta-analyses.
- **States [4]:** e.g. state_E(t) = E + β_situation × (e.g. number of familiar people nearby, time to deadline) + ε. Behaviour at that tick uses the state, not the trait. This is how a shy agent can be talkative among close friends at Good Times.
- **LLM rendering [6]:** traits in SD units are turned into 1–2 adjectives each (using Goldberg's trait markers, e.g. high E → "outgoing, talkative"; low E → "reserved, quiet"), plus the agent's if–then rules. Serapio-García et al. (2023) and Jiang et al. (2024) show LLMs can express Big Five profiles reliably when prompted this way.

### 2b. Whole Trait Theory layer (adopted)
- **Idea (Fleeson 2001; Fleeson & Jayawickreme 2015):**
  - A trait is the *average* of a person's momentary states.
  - People vary a lot from moment to moment. Fleeson's experience-sampling studies found within-person variation in states as large as, or larger than, the differences between people.
  - So a "trait" says where someone's states usually fall, not what they do every time.
- **Per agent, per tick, for each trait k [A]:**
  - state_k(t) = trait_k + Σ_j β_jk × situation_j(t) + ε_k(t)
  - ε ~ N(0, σ_w), with σ_w = 0.8 SD, autocorrelated so states drift smoothly (e.g. AR(1), ρ = 0.9 per 15 min).
- **Situational drivers to start with [A]:**

| Situation j | Affects | β | Rationale |
|---|---|---|---|
| Number of strong ties within 5 m (friends nearby) | E | +0.3 per friend (capped at +0.9) | People act more extraverted with familiar others |
| Comfort in the space (ST9) | E (+), N (−) | +0.5 / −0.4 × (comfort − 0.5) | Newcomers act more reserved and anxious |
| Hours to the next review (urgency) | N (+), C (+), E (−) | +0.4 / +0.3 / −0.3 at ≤ 48 h | Deadline focus and stress |
| Social event (Good Times etc.) | E (+), N (−) | +0.5 / −0.2 | The setting invites sociability |
| Just received a harsh crit | N (+), E (−) | +0.6 / −0.4, decaying over about 3 h | Withdrawal after threat |
| Sleep debt > 2 h | N (+), A (−), C (−) | +0.3 / −0.2 / −0.2 | Sleep loss and mood |

- **How behaviour uses it:** every behavioural parameter in §3 is computed from the **state**, not the trait. The mapping formula is the same with trait_k replaced by state_k(t).
- **Result:** the same introverted agent is quiet at its desk among strangers in week 1, chattier at Good Times with friends in week 8, and withdrawn after a harsh crit. Over the term, its average still matches its trait.
- **Where each agent's states vary most.** The β values can be personalised later. Fleeson found people differ in *how* variable they are, so a σ_w per agent is optional.

### 2c. MBTI display layer (adopted; display only)
- **Why:** MBTI types are widely recognised, so they make agents easier to read in the viewer and the write-up ("an INFJ-ish student").
- **Caveat:** MBTI's reliability and validity are weak (Pittenger 2005). So types are **derived from the Big Five and never used to drive behaviour.**
- **Mapping:** McCrae & Costa (1989) found the four MBTI scales line up with four Big Five traits. The links are strongest for E–I and S–N, and more moderate for T–F and J–P. Furnham (1996) replicated this.

| MBTI letter | From Big Five | Rule |
|---|---|---|
| **E / I** | Extraversion | E if E > 0, else I |
| **N / S** | Openness | N if O > 0, else S |
| **F / T** | Agreeableness | F if A > 0, else T |
| **J / P** | Conscientiousness | J if C > 0, else P |
| **-T / -A** (optional) | Neuroticism | Turbulent if N > 0, Assertive if N < 0. This suffix is a popular-website convention (16Personalities), not official MBTI, but it fills the gap where MBTI has no Neuroticism scale |

- **Clarity:** show each letter's strength. If |z| < 0.25 the letter is shown lowercase (borderline), so INfJ means a weak F. This avoids pretending types are sharp boxes.
- **Trait vs state:** the displayed type comes from the **trait**. An optional "current mode" can show the **state** type (e.g. an I agent acting E at Good Times). This visualises Whole Trait Theory nicely.
- **Use in LLM prompts:** optional. If used, the type is shown *alongside* the trait adjectives, never instead of them.

---

## 3. How personality informs the agent variables

Direction: **+** means the trait raises the variable, **−** lowers it. Weights are proposed defaults [A] in log-linear SD units. Evidence column = the reference for the direction.

### 3a. Social adaptation in a new environment (your example)

| Agent variable (ID) | E | N | A | O | C | Evidence | How it enters the model |
|---|---|---|---|---|---|---|---|
| **Starting comfort** c₀ (ST9) | + 0.3 | − 0.3 | | | | Asendorpf & Wilpers 1998: in the first 18 months at university, **extraverts built peer networks faster; shy / high-N students were slower** | c₀ = c₀(group) × exp(0.3E − 0.3N) |
| **Comfort growth rate** (τ in ST9) | faster (+0.4) | slower (−0.3) | | | | Asendorpf & Wilpers 1998; Reis et al. 2011 (familiarity) | τ_i = 60 h × exp(−0.4E + 0.3N) |
| **Sociability** / peer-exchange rate (SO2) | + 0.5 | | + 0.2 | | | Selfhout et al. 2010: extraverts form more ties in a new friendship network; agreeable people are chosen more often as friends | rate = 4/day × exp(0.5E + 0.2A) × comfort |
| **Tie formation probability** (ST8) | + 0.3 | | + 0.3 | | | Selfhout et al. 2010; Asendorpf & Wilpers 1998 | per-encounter tie increment × exp(0.3E + 0.3A) |
| **Event attendance** (BH23) | + 0.5 | − 0.2 | | | | Extraversion and social activity (John & Srivastava 1999) | P × exp(0.5E − 0.2N) |
| **Help-seeking threshold** / perceived threat (AT6, F2) | − 0.3 | + 0.4 | | | | Neuroticism and evaluation threat; help-seeking avoidance (Karabenick 2003) | threat × exp(0.4N − 0.3E) |
| **Willingness to help others** | | | + 0.4 | | | Graziano et al. 2007: Agreeableness predicts helping | P(help) × exp(0.4A) |
| **Perceived competition** (ST10) | | + 0.4 | − 0.2 | | | Festinger 1954; N and social comparison | already has (1 + N); add −0.2A. **HEXACO: −0.3H** |
| **Idea sharing vs guarding** | + 0.2 | | + 0.3 | | | AIAS 2002; **HEXACO H** stronger if adopted | P(share) × exp(0.3A + 0.2E) |
| **Sleep-loss disclosure / commiseration** (F7) | + 0.3 | + 0.2 | | | | Social sharing of emotion (Rimé 2009) | P × exp(0.3E + 0.2N) |

### 3b. Work, stress and focus

| Agent variable (ID) | E | N | A | O | C | Evidence | How it enters the model |
|---|---|---|---|---|---|---|---|
| **Impulsiveness Γ** (AT11) | | + 0.1 | | | **− 0.6** | Steel 2007: Conscientiousness is among the strongest (negative) correlates of procrastination | Γ = Γ_persona × exp(−0.6C + 0.1N) |
| **Baseline weekly hours** (AT13) | | | | | + 0.2 | Poropat 2009: C and academic effort and performance | H_base × exp(0.2C) |
| **Stress reactivity** (ST2 gain) | | **+ 0.5** | | | | Bolger & Schilling 1991: neuroticism raises both exposure to and reactivity from daily stressors | stress increment × exp(0.5N) |
| **Crit impact on confidence and motivation** (ST3/ST4) | BAS + | BIS + | | | | Gray 1987; Carver & White 1994 (approach / avoid) | good crit gain × exp(0.3E); bad crit loss × exp(0.5N) |
| **Noise sensitivity** / headphone use (BH16) | **− 0.4** | + 0.2 | | | | Furnham & Strbac 2002: **introverts' performance is more impaired by background noise and music** | P(headphones) × exp(−0.4E + 0.2N) |
| **Curiosity about others' work** (F6, BH24) | | | | **+ 0.5** | | Openness and intellectual curiosity (John & Srivastava 1999) | P(detour) × exp(0.5O) |
| **Reframing after setbacks** (BH11, Schön) | | − 0.2 | | + 0.4 | | Feist 1998: Openness is the strongest personality correlate of creativity | P(reframe) × exp(0.4O − 0.2N) |
| **Chronotype** (AT10) | evening + | | | | morning + | Tsaousis 2010 meta-analysis: morningness relates to higher C; eveningness slightly to higher E | shift chronotype sampling by C and E |
| **All-nighter odds** (BH21) | | + 0.2 | | | − 0.3 | via procrastination (C) and stress (N) | OR × exp(−0.3C + 0.2N) |
| **Formal support-seeking** (EC6) | | + 0.3 | | + 0.2 | | High-N people need it more; Openness is associated with more positive help-seeking attitudes | P × exp(0.3N + 0.2O), then reduced by stigma (S41) |
| **Sensitivity to instructor push** (EC7) | | + 0.3 | | | + 0.3 | High C takes the standard on; high N feels it as pressure | multiplier × exp(0.3C + 0.3N) |
| **Perfectionism** (add-on) | | + | | | + | Hewitt & Flett 1991 | Optional trait: raises hours near reviews, lowers the sleep floor, raises stress |

### 3c. Example if–then signatures (CAPS layer)
These are written as rules and rendered into the LLM prompt. Each rule's strength scales with the traits named.
- **If** a friend is nearby and not wearing headphones, **then** ask them for help first. Strength: +E, +A, −N.
- **If** a stranger or senior is the only help source, **then** delay asking until the next desk crit. Strength: +N, −E.
- **If** surrounded by close friends (e.g. at Good Times), **then** behave more extraverted than usual. This is the Whole Trait state shift.
- **If** the crit was harsh, **then** withdraw (headphones, fewer exchanges) for the rest of the session. Strength: +N.
- **If** a review is within 48 h and progress is behind, **then** stay late. Strength: +C (duty) or −C (procrastinated, now catching up), +perfectionism.

---

## 4. Subjective components that become personality-informed

These components (from [subjective-components.md](subjective-components.md)) can't be measured from site data, but personality gives them a **structured default**. Your judgment then edits the weight rather than inventing the value from scratch.

| Subjective component | Personality-dependent? | Traits | How personality informs it |
|---|---|---|---|
| S10 territory / ownership | partly | C, N | Neat or territorial desk behaviour with high C; stronger attachment with high N |
| S11 friendships | **yes** | E, A | Seed more pre-existing ties for high E/A (Selfhout 2010) |
| S12 psychological safety (felt) | **yes** | N (−), E | Individual felt safety = cohort level × exp(−0.4N + 0.2E) |
| S13 fear around crits | **yes** | N, BIS | Crit loss weight (3b) |
| S15 belonging | **yes** | E, N | Through starting comfort and growth (3a); international/newcomer status adds to it |
| S16 motivation sources | partly | C (duty), O (interest), E (recognition) | Narrative: which motive dominates, from the highest of C/O/E |
| S25 feeling safe alone at night | partly | N | Night-stay multiplier × exp(−0.3N) |
| S27 headphone etiquette | partly | A | High A less willing to interrupt someone in headphones |
| S31 productive vs present hours | partly | C | Work rate per hour × exp(0.2C) |
| S33 meaning of an all-nighter | partly | N, perfectionism | High N: failure / stress; perfectionist: commitment |
| S34 work style as identity | **yes** | E, C, chronotype | "Night person" self-concept from chronotype and C |
| S35 what makes asking "easy" | **yes** | E, A, N | Help threshold (3a) |
| S36 felt community at events | **yes** | E | Stress relief per event × exp(0.3E) |
| S38 keenness | **yes** | O, C | Curiosity (O) and effort (C) |
| S40 how push is heard | **yes** | N, C | Motivating if C high and N low; pressuring if N high |
| S41 stigma about seeking help | partly | N, E (−) | Uptake (3b), reduced by stigma weight |
| S1 design quality, S6 beauty, S9 comfort, S21–S24 values | **no** | — | Stay fully subjective or environmental |

---

## 5. Personas in this framework (feeds Category I later)
- Personas become **regions of trait space plus circumstances**, not fixed boxes.
  - Example: the Studio Devotee is high C, high perfectionism, slightly high E and N.
  - The Guarded Competitor is low A, or low H under HEXACO.
- **Decided %s (user): traits only.** Personas are not an input. Every agent is built from (1) a Big Five draw, N(0,1) per trait, independent [A]; (2) circumstances sampled from the site data (Category A); (3) a small set of non-Big-Five variables sampled from data or marked [A]: prior design background (A14), chronotype (E3 shares, shifted by C and E), keenness (baseline intrinsic motivation, ST3, N(0,1), correlated +0.3 with O [A]), a making skill (agent-variables §5) and optionally perfectionism. Everything that the persona table used to set is now mapped from these; the replacement table is in agent-variables.md ("Traits-only mappings").
- The eight personas of the culture note stay as **descriptive labels for reading results**: after a run, agents can be clustered on traits, hours and social measures and the clusters named with the persona vocabulary. Their population shares (checklist I) are no longer needed, so **Category I is closed**.
- What this changes: the trait distribution is unimodal instead of a mixture of shifted normals; combinations are independent (a highly conscientious evening type is possible), so there are more distinct combinations and fewer stereotyped bundles; the overall spread of each behaviour parameter is set by the mapping weights and the spread of the sampled variables, not by persona bands.

## 6. Open choices (for you)
1. **Base model:** Big Five (recommended) or HEXACO (adds Honesty-Humility for competition and idea-guarding)?
2. **Layers:** use Whole Trait Theory (momentary states) and CAPS if–then rules? Recommended: yes.
3. **Add-ons:** perfectionism? Chronotype linked to C and E?
4. **Personas:** decided 2026-11-07, **traits only** (§5).
5. **Weights:** accept the proposed [A] weights for now and screen them in the sensitivity analysis?

---

## References
- Ashton, M. C. & Lee, K. (2007). Empirical, theoretical, and practical advantages of the HEXACO model of personality structure. *Personality and Social Psychology Review* 11(2): 150–166.
- Asendorpf, J. B. & Wilpers, S. (1998). Personality effects on social relationships. *Journal of Personality and Social Psychology* 74(6): 1531–1544.
- Bolger, N. & Schilling, E. A. (1991). Personality and the problems of everyday life: the role of neuroticism in exposure and reactivity to daily stressors. *Journal of Personality* 59(3): 355–386.
- Carver, C. S. & White, T. L. (1994). Behavioral inhibition, behavioral activation, and affective responses to impending reward and punishment: the BIS/BAS scales. *Journal of Personality and Social Psychology* 67(2): 319–333.
- Costa, P. T. & McCrae, R. R. (1992). *Revised NEO Personality Inventory (NEO-PI-R) professional manual*. PAR.
- Credé, M., Tynan, M. C. & Harms, P. D. (2017). Much ado about grit: a meta-analytic synthesis of the grit literature. *Journal of Personality and Social Psychology* 113(3): 492–511.
- Duckworth, A. L. et al. (2007). Grit: perseverance and passion for long-term goals. *Journal of Personality and Social Psychology* 92(6): 1087–1101.
- Durupinar, F., Pelechano, N., Allbeck, J., Güdükbay, U. & Badler, N. (2011). How the OCEAN personality model affects the perception of crowd simulations. *IEEE Transactions on Visualization and Computer Graphics*.
- Feist, G. J. (1998). A meta-analysis of personality in scientific and artistic creativity. *Personality and Social Psychology Review* 2(4): 290–309.
- Fleeson, W. (2001). Toward a structure- and process-integrated view of personality: traits as density distributions of states. *Journal of Personality and Social Psychology* 80(6): 1011–1027.
- Furnham, A. (1996). The big five versus the big four: the relationship between the Myers-Briggs Type Indicator (MBTI) and NEO-PI five factor model of personality. *Personality and Individual Differences* 21(2): 303–307.
- Fleeson, W. & Jayawickreme, E. (2015). Whole Trait Theory. *Journal of Research in Personality* 56: 82–92.
- Furnham, A. & Strbac, L. (2002). Music is as distracting as noise: the differential distraction of background music and noise on the cognitive test performance of introverts and extraverts. *Ergonomics* 45(3): 203–217.
- Goldberg, L. R. (1990). An alternative "description of personality": the Big-Five factor structure. *Journal of Personality and Social Psychology* 59(6): 1216–1229.
- Gosling, S. D., Rentfrow, P. J. & Swann, W. B. (2003). A very brief measure of the Big-Five personality domains (TIPI). *Journal of Research in Personality* 37(6): 504–528.
- Gray, J. A. (1987). *The Psychology of Fear and Stress* (2nd ed.). Cambridge University Press.
- Graziano, W. G., Habashi, M. M., Sheese, B. E. & Tobin, R. M. (2007). Agreeableness, empathy, and helping: a person × situation perspective. *Journal of Personality and Social Psychology* 93(4): 583–599.
- Guy, S. J., Kim, S., Lin, M. C. & Manocha, D. (2011). Simulating heterogeneous crowd behaviors using personality trait theory. *ACM SIGGRAPH/Eurographics Symposium on Computer Animation*.
- Hewitt, P. L. & Flett, G. L. (1991). Perfectionism in the self and social contexts. *Journal of Personality and Social Psychology* 60(3): 456–470.
- Jiang, H. et al. (2024). PersonaLLM: investigating the ability of large language models to express personality traits. *Findings of NAACL 2024*.
- John, O. P. & Srivastava, S. (1999). The Big Five trait taxonomy. In *Handbook of Personality: Theory and Research* (2nd ed.). Guilford.
- Lee, K. & Ashton, M. C. (2004). Psychometric properties of the HEXACO Personality Inventory. *Multivariate Behavioral Research* 39(2): 329–358.
- McCrae, R. R. & Costa, P. T. (1989). Reinterpreting the Myers-Briggs Type Indicator from the perspective of the five-factor model. *Journal of Personality* 57(1): 17–40.
- Mischel, W. & Shoda, Y. (1995). A cognitive-affective system theory of personality. *Psychological Review* 102(2): 246–268.
- Pittenger, D. J. (2005). Cautionary comments regarding the Myers-Briggs Type Indicator. *Consulting Psychology Journal* 57(3): 210–221.
- Poropat, A. E. (2009). A meta-analysis of the five-factor model of personality and academic performance. *Psychological Bulletin* 135(2): 322–338.
- Reis, H. T. et al. (2011). Familiarity does indeed promote attraction in live interaction. *Journal of Personality and Social Psychology* 101(3): 557–570.
- Rimé, B. (2009). Emotion elicits the social sharing of emotion. *Emotion Review* 1(1): 60–85.
- Selfhout, M. et al. (2010). Emerging late adolescent friendship networks and Big Five personality traits: a social network approach. *Journal of Personality* 78(2): 509–538.
- Serapio-García, G. et al. (2023). Personality traits in large language models. arXiv:2307.00184.
- Soto, C. J. & John, O. P. (2017). The next Big Five Inventory (BFI-2). *Journal of Personality and Social Psychology* 113(1): 117–143.
- Steel, P. (2007). The nature of procrastination. *Psychological Bulletin* 133(1): 65–94.
- Tsaousis, I. (2010). Circadian preferences and personality traits: a meta-analysis. *European Journal of Personality*.

Added 2026-11-07 (population model):
- Hendra, I., Blessing, L., Silva, A. & Ang, L. K. (2026). Exploring the link between students' Big5 personality test and design project performance. *Proceedings of the Design Society* 6: 2971–2980. doi:10.1017/pds.2026.10655.
- Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: development of the IPIP-NEO-120. *Journal of Research in Personality* 51: 78–89. Data: https://osf.io/tbmh5/.
- Johnson, J. A. & Twomey, A. (2022). Open-source personality trait norms for the United Kingdom and Ireland. https://bpb-us-e1.wpmucdn.com/sites.psu.edu/dist/1/163537/files/2023/07/UKnorms.pdf
- MacKinnon, D. W. (1962). The nature and nurture of creative talent. *American Psychologist* 17(7): 484–495. (The IPAR architects study; see Serraino, P. (2016), *The Creative Architect*, Monacelli.)
- Open-Source Psychometrics Project (2018). IPIP Big-Five Factor Markers, 1,015,342 records. https://openpsychometrics.org/_rawdata/
- Schmitt, D. P., Realo, A., Voracek, M. & Allik, J. (2008). Why can't a man be more like a woman? Sex differences in Big Five personality traits across 55 cultures. *Journal of Personality and Social Psychology* 94(1): 168–182.
- Soto, C. J., John, O. P., Gosling, S. D. & Potter, J. (2011). Age differences in personality traits from 10 to 65. *Journal of Personality and Social Psychology* 100(2): 330–348.
- Vedel, A. (2016). Big Five personality group differences across academic majors: a systematic review. *Personality and Individual Differences* 92: 1–10.
- Weisberg, Y. J., DeYoung, C. G. & Hirsh, J. B. (2011). Gender differences in personality across the ten aspects of the Big Five. *Frontiers in Psychology* 2: 178.
