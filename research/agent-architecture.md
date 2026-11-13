# Agent architecture

Started 2026-11-05. **Status: agreed in principle by the user (2026-11-05).**

This note defines how a simulated person works: what it **is** (profile), what it **feels** (body and state), how it **thinks** (cognition) and how it **decides and acts**.
- Personality is a module inside the profile; see [personality-model.md](personality-model.md).
- Per-agent values are listed in [agent-variables.md](agent-variables.md).
- Inputs are indexed in [input-registry.md](input-registry.md).

[A] = assumed value.

## 0. Sources (agent papers in `Research/Agent/READ/`)

| Key | Paper | What we take from it |
|---|---|---|
| **GA23** | Park et al. (2023), "Generative Agents: Interactive Simulacra of Human Behavior" (Stanford, UIST) | Memory stream; retrieval by recency, importance and relevance; reflection; hierarchical planning |
| **HA23** | Wang, Chiu & Chiu (2023), "Humanoid Agents" (EMNLP demo) | System 1 (needs, emotion, closeness) alongside System 2 planning. Basic needs on a 0–10 scale (fullness, fun, health, social, energy) that drain over time and trigger re-planning. 7 basic emotions |
| **ML24** | MineLand (2024) | Physical needs (food, energy); **limited multimodal senses**; interrupting an action in progress |
| **IW25** | Wu et al. (2025), "IndoorWorld" (Autodesk Research, EMNLP Findings) | Multi-level agent profiles: **role sets the action space, capabilities and knowledge** (e.g. only receptionists can book rooms). A **task-prioritization module** improved task completion because LLM agents otherwise switch tasks without finishing |

---

## 1. The loop

```
Profile (role, traits, skills/strengths, knowledge, circumstances)
   ↓
Perceive (visibility area + earshot)  ──►  Memory stream (importance weighted by personality)
   ↓                                            ↓
State update (needs, fatigue, sleep, mood, stress, comfort, familiarity, ties, availability)
   ↓                                            ↓
Arbiter: constraints > urgent needs > utility   ◄──  Plan (day → hour → 5–15 min); Reflection
   ↓
Action (from the role's action set, at a place) → Environment → Perceive …
```

**Hybrid execution.** Every tick, the numeric layer runs:
- needs, states, movement
- deadline motivation (TMT)
- the all-nighter decision
- the availability and approach rules

The LLM layer runs only at:
- the morning plan
- re-plans triggered by events
- reflections
- conversations
- significant events (crit, resource failure)

This keeps about 165 students plus staff affordable, and keeps the numeric layer fast enough for the sensitivity screening.

---

## 2. Profile (fixed at creation)

| Element | Contents | Source |
|---|---|---|
| **Role** | Student (Y1/Y2/Y3; optional TA or mentor duties), studio instructor, visiting critic, shop technician, plotter technician (student staff), optional custodial / security | IW25 roles; Categories A, C, D |
| **Role action set** | What each role may do. Instructors: book crit rooms, give crits, run pin-ups. TAs: pre-review, discussions. Plotter tech: restock paper (staffed hours). Shop tech: run laser slots. Visiting critic: attend reviews only. Students: everything else | IW25 |
| **Personality** | Big Five traits; Whole Trait states; MBTI display | personality-model.md |
| **Skills and strengths** | Skill vector (0–1). Strengths = the agent's top 1–2 skills relative to its cohort. Makes the agent a "go-to" helper and feeds the persona narrative | agent-variables §5 |
| **Knowledge** (4 kinds) | (1) **domain**: skills / expertise; (2) **project**: progress, design decisions, feedback received; (3) **place**: where things are and how they work (plotter, shops, free rooms); (4) **who knows what** (transactive memory, Wegner 1987): who is good at Rhino, who has spare paper | IW25 "knowledge"; Wegner 1987 |
| **Circumstances** | Year, job, commute, caregiving, background | Category A |

## 3. Body and state (numeric, every tick)

### 3a. Basic physical needs
HA23 uses 0–10 needs with fixed drain rates. Here rates are grounded in physiology where possible and personalised [A]. Each need has an urgency curve: low urgency until about 60% depleted, then rising steeply. When **critical** it overrides most other activity (§5).

| Need | Drains | Refilled by | Default rate [A] | Basis |
|---|---|---|---|---|
| **Hunger / fullness** | over time awake | a meal (kitchen, desk, food run, delivery) | meal every 4–6 h; snacks in between | Ordinary meal spacing; links to E10 |
| **Thirst** | over time; faster with activity | drinking (water fountain, kitchen, own bottle) | drink every 1.5–2 h; about 2.0–2.5 L/day total water | EFSA (2010) adequate intake for adults: about 2.0 L (women) / 2.5 L (men) per day |
| **Washroom** | follows fluid intake; faster with coffee | washroom visit | about every 2.5–4 h awake (about 4–7 daytime visits); +20% with high coffee intake [A] | Daytime voiding above about 8 is clinically "increased frequency" (Haylen et al. 2010, IUGA/ICS terminology) |
| **Sleep / energy** | Borbély sleep pressure | sleep | two-process + hurdle model | Category E (done) |
| **Mental fatigue** | time on task, interruptions, noise, stress | breaks, walking, views / daylight, social chat, sleep | grows about 0.15/h of focus [A]; −50% per 15 min break with view [A] | Vigilance decrement with time on task (Warm, Parasuraman & Matthews 2008); Attention Restoration Theory (Kaplan 1995) |
| **Physical fatigue** | standing, model-making, shop work, walking | sitting, rest, sleep | grows about 0.2/h of standing or making [A] | [A] |
| **Social need** | time without interaction (faster for high E) | conversation, events | per E state (personality-model §3a) | HA23 "social"; Big Five |

**Why this matters for the architecture study:**
- Needs generate the **everyday trips** to washrooms, the kitchen, water and the stairs.
- These are exactly the destinations in Kabo et al.'s **path-overlap** metric (restrooms, elevators, kitchens), and the "magnets" in Hillier's analysis.
- Without needs, those collaboration metrics have no behavioural driver.
- Where the washrooms, kitchen and water are placed becomes a direct design lever.

### 3b. Other states
| State | Range | Notes |
|---|---|---|
| Sleep pressure / debt | Borbély | Category E |
| Stress, motivation, confidence | 0–1 | Categories E–H |
| **Mood (affect)** | valence −1…+1; arousal 0–1 | Simpler than HA23's 7 emotions. Crits, progress, events, needs and sleep shift it. Feeds the personality state layer (low valence → higher N state) |
| Comfort in the space | 0–1 | ST9 |
| **Place familiarity** | 0–1 per place / facility | Starts low for Year 1 and advanced-standing newcomers; grows with each visit. Low familiarity → longer routes, asking for directions, missed resources |
| Tie strength (people familiarity) | 0–1 per pair | ST8 |
| Focus streak | min | Work–break rhythm |
| **Availability** | 0–1 | §6, the scale you described |

## 4. Cognition (LLM, at specific moments)

From GA23, with personality hooks:
- **Perception → memory stream.** Each observation the agent can actually perceive (inside its visibility area or earshot, §7) is stored with a time, place, people and an **importance** score of 1–10 (LLM-rated).
  - **Personality hook [A]:** importance of negative events × exp(0.3·N); importance of social events × exp(0.2·E).
- **Retrieval.** Score = recency + importance + relevance (each normalised).
  - Recency decays exponentially at **0.995 per game hour** (GA23).
  - Relevance = embedding similarity to the current situation.
  - The top-k memories go into each LLM prompt.
- **Reflection.** Triggered when the summed importance of recent memories passes a threshold (GA23 used 150).
  - The LLM writes higher-level conclusions, e.g. "I do my best work in the morning", "Mina is good at Rhino" (who-knows-what knowledge), or "Crits with Prof. X make me anxious". These are stored as memories too.
  - **Personality hook:** high-O agents reflect a little more often (threshold × exp(−0.2·O)) [A].
- **Planning.** Morning: a day plan in broad blocks, fixed around scheduled obligations (studio, classes, shifts). Each block is decomposed into hourly steps, then 5–15 min actions (GA23).
  - **Re-plan** when needs, mood or stress pass a threshold, or after a significant event (HA23).
- **Conversation.** Generated by the LLM from both agents' profiles, states, closeness and retrieved memories (GA23, HA23). The result updates ties, knowledge (who-knows-what, project) and mood.

## 5. Decision: the arbiter (task prioritization)

IW25 found LLM agents switch tasks too often without finishing. So the **numeric arbiter decides *what* to do next, and the LLM decides *how*** (what to draw, what to say).

**Priority order each decision tick:**
1. **Hard constraints:** scheduled studio attendance, own crit slot, review, job shift, last transit, building events the agent is committed to.
2. **Critical needs:** washroom critical, sleep below floor (unless an all-nighter was chosen), hunger or thirst critical.
3. **Utility comparison** among:
   - task urgency from TMT (each deliverable's motivation)
   - need urgency (non-critical)
   - social desire (social need × sociability state)
   - recovery (mental or physical fatigue)
   - opportunity, e.g. a friend nearby and available, or a free laser slot
4. **Commitment bonus:** the current activity gets +20% utility for about 25 min [A]. This stops task-switching churn (IW25), with breaks handled by the work–break rhythm.

**Action** = an item from the role's action set at a suitable place. Places afford actions (Barker's behavior settings): a desk affords drawing, a kitchen eating and chatting, a crit room reviewing, a shop making.

## 6. Availability as a scale (user-specified 2026-11-05)

Availability is **continuous (0–1)**, not on/off. It is shown through **signals** that others read, and **can be negotiated**. Headphones come off for a groupmate who needs to collaborate, or when the wearer isn't too focused or stressed. Someone in a crit with their professor is not approached.

**Basis:**
- Backhouse & Drew 1992: people away from their desk or standing are read as available.
- Fogarty et al. 2005: interruptibility can be predicted from visible cues such as talking, typing or a closed door.
- Mark, Gudith & Klocke 2008: interruptions have real costs for the person interrupted.

### 6a. The target's availability A_t ∈ [0,1]
A_t = base × (1 − focus)^α × (1 − stress)^β × Π(signal multipliers), with α = 1.0 and β = 0.7 [A].

| Signal / state | Multiplier [A] | Notes |
|---|---|---|
| **In a crit / review with instructor** | **0 (hard block)** | Others wait nearby, and may overhear |
| Presenting at a pin-up | 0 | — |
| Headphones on | 0.4 | A *signal*, not a block (§6c) |
| Deep focus streak > 25 min | 0.6 | — |
| Standing / walking / at kitchen / at plotter | 1.5 | Backhouse & Drew "away from desk = available" |
| On a break / eating | 1.3 | — |
| Talking with someone else | 0.5 | Can join if both are ties |
| High sleep debt or bad mood (valence < −0.5) | 0.7 | — |

### 6b. The approacher's decision
Approach if:
- need_value × relationship × A_t ≥ θ_approach
- **need_value**: help need, collaboration need (same group / project), social desire, or information.
- **relationship**: groupmate 2.0; strong tie 1.5; acquaintance 1.0; stranger 0.6 [A].
- **θ_approach** is personal. It is higher (more reluctant) for high Agreeableness (considerate about interrupting), high Neuroticism and low comfort, and lower for high Extraversion [A].

**Result:**
- A **groupmate with a real collaboration need** will approach a headphone-wearer.
- A casual chat with a stranger won't.
- **Nobody** approaches someone in a crit: A_t = 0. They wait, or queue just behind.

### 6c. The target's response (headphones come off or not)
P(accept) = σ( relationship + request importance − 1.5·focus − 1.0·stress + 0.3·E_state ) [A]

- **Accept:** the headphones come off and an interaction starts.
- **Defer** ("give me 10 min"): a follow-up is scheduled. The approacher's memory stores a small negative-to-neutral outcome.
- **Decline:** the approacher lowers its estimate of this person's availability. Repeated declines lower tie growth.

Groupmates and strong ties are rarely refused unless focus or stress is very high. This matches what you described.

### 6d. Effects on metrics
Availability feeds directly into:
- **interruptions**, counted when a focused agent accepts (summary-metrics F2)
- **face-to-face minutes** (C4)
- **recruitment** (C8)
- the **focus–collaboration trade-off**

Layouts change availability through the signals. Circulation past desks, the kitchen and the plotter creates "standing" moments where availability is high.

## 7. Perception (limited senses)
- An agent perceives only what is inside its **visibility area** (isovist, from the floor plan) and **earshot** (about 4 m for conversation, J3).
- Headphones cut earshot to about 1 m [A].
- What isn't perceived isn't remembered. This is how the **layout reaches the agents' minds**: who they notice, which crits they overhear, whose pin-up they see (ML24 limited senses; Hillier co-presence and co-awareness).

## 8. Open items
- Calibrate the need rates against observed kitchen and washroom trip counts, if a headcount or observation session happens.
- LLM budget: the number of agents with full cognition vs simplified agents (e.g. full LLM for one focus section, numeric-only for others).
- Whether custodial and security staff are modelled. They mainly matter for overnight presence.
