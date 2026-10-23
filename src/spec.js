// The group spec: the editable truth the run uses. A brief (free text) can produce it, the table
// edits it, and the individuals are generated from it by seed. Edited individuals are pinned and
// survive regeneration. Edits flow down only: brief -> spec -> people.
import { rand, pick, clamp } from "./rng.js";
import { officeLayout } from "./plan.js";

export const TRAITS = ["patience", "curiosity", "sociability", "noise", "crowd", "familiarity"];
export const PATTERNS = { focused: "focused", social: "social", restless: "restless", prof: "prof", office: "office" };
export const DEFAULT_NOTE = "An ordinary week, nothing due. The floor is lively but not loud. About a quarter of the students are new to the building and still learning where things are.";
export const DEFAULT_STUDIO = { note: DEFAULT_NOTE, deadline: 0, deadlineSections: [], noiseShare: 0.3, crowdShare: 0.3, newShare: 0.25 };

// the conditions note, read for what touches everyone: a deadline, how loud or busy the floor is, how many are new.
// A keyword pass for the prototype; the API call reads the same note.
export function parseConditions(note) {
  const n = String(note || "").toLowerCase(); const out = {};
  const share = (re, fallback) => { const m = n.match(re); if (!m) return null; const s = m[0]; const pc = s.match(/(\d+)\s*%/); if (pc) return Math.min(1, Number(pc[1]) / 100); if (/half/.test(s)) return 0.5; if (/third/.test(s)) return 0.33; if (/quarter/.test(s)) return 0.25; if (/most|majority/.test(s)) return 0.7; if (/few|handful|hardly/.test(s)) return 0.1; if (/some|several/.test(s)) return 0.3; if (/no(body| one)|none/.test(s)) return 0; return fallback; };
  const nw = share(/(\d+\s*%|half|third|quarter|most|majority|few|handful|some|several|nobody|no one|none|all)[^.]{0,40}\b(new to|first[- ]year|first week|learning where|never been)/, 0.4); if (nw != null) out.newShare = nw;
  if (/due|deadline|review (week|on|this)|pin-?up (week|on|this)|submission|crit week|hand[- ]in/.test(n)) out.deadline = /final|tomorrow|monday/.test(n) ? 0.9 : 0.6; else if (/nothing due|no deadline|ordinary|quiet week|normal week/.test(n)) out.deadline = 0;
  if (/not loud|quiet|hush|headphones/.test(n)) out.noiseShare = /hate noise|need quiet|noise[- ]sensitive/.test(n) ? 0.6 : 0.3; if (/\bloud\b|noisy|music|speakers/.test(n)) out.noiseShare = /hate noise|need quiet|noise[- ]sensitive/.test(n) ? 0.6 : 0.45;
  if (/packed|crowded|full house|everyone is in|busy/.test(n)) out.crowdShare = 0.45; if (/half empty|thin|few people|empty/.test(n)) out.crowdShare = 0.2;
  return out;
}

export const DEFAULT_SPEC = {
  version: 3,
  use: "A typical Friday studio day on Lasserre Level 3: about 175 people, desk crits, Good Times from 6:30.",
  goals: [
    { text: "Access to amenities: from any desk, the kitchen, the printers, the pin-up walls and the bar are easy to reach", metric: "access" },
    { text: "A layout that works for collaboration, working and learning: room to move and to stand for a crit, desks where you can hear yourself, and places to work together", metric: "comfort" },
  ],
  types: [
    { id: "focused", name: "Focused student", role: "student", count: 70, pattern: "focused", mobility: "walking", goesToBar: 0.25, usesKitchen: 0.6, hasPrintJob: 0.5,
      traits: { patience: [0.5, 0.9], curiosity: [0.2, 0.7], sociability: [0.1, 0.5], noise: [0.5, 0.9], crowd: [0.3, 0.8], familiarity: [0.2, 0.8] } },
    { id: "social", name: "Social student", role: "student", count: 60, pattern: "social", mobility: "walking", goesToBar: 0.55, usesKitchen: 0.75, hasPrintJob: 0.5,
      traits: { patience: [0.3, 0.8], curiosity: [0.3, 0.8], sociability: [0.6, 0.95], noise: [0.1, 0.5], crowd: [0.1, 0.5], familiarity: [0.3, 0.9] } },
    { id: "restless", name: "Restless student", role: "student", count: 45, pattern: "restless", mobility: "walking", goesToBar: 0.35, usesKitchen: 0.65, hasPrintJob: 0.5,
      traits: { patience: [0.1, 0.45], curiosity: [0.5, 0.95], sociability: [0.3, 0.8], noise: [0.3, 0.8], crowd: [0.4, 0.9], familiarity: [0.2, 0.8] } },
    { id: "prof", name: "Prof", role: "prof", count: 12, pattern: "prof", mobility: "walking", goesToBar: 0.25, usesKitchen: 1, hasPrintJob: 0,
      traits: { patience: [0.3, 0.9], curiosity: [0.4, 0.9], sociability: [0.3, 0.9], noise: [0.2, 0.8], crowd: [0.2, 0.8], familiarity: [0.9, 0.95] } },
    { id: "office", name: "Office prof", role: "office", count: 2, pattern: "office", mobility: "walking", goesToBar: 0, usesKitchen: 1, hasPrintJob: 0,
      traits: { patience: [0.4, 0.9], curiosity: [0.3, 0.8], sociability: [0.3, 0.8], noise: [0.3, 0.8], crowd: [0.2, 0.7], familiarity: [0.9, 0.95] } },
  ],
  studio: { note: DEFAULT_NOTE, deadline: 0, deadlineSections: [], noiseShare: 0.3, crowdShare: 0.3, newShare: 0.25 },
  pinned: {},
  source: "default",
};

export const METRICS = ["access", "comfort", "kitchen", "food line", "bar", "seating", "printers", "crits", "aisles", "wayfinding", "light", "doors", "desks"];

// map a goal sentence to a metric when the spec step did not set one
export function metricFor(text) {
  const t = text.toLowerCase();
  if (/access|amenit|reach|distance|close to|walk to/.test(t)) return "access";
  if (/comfort|collaborat|working space|pleasant|hear yourself|room to/.test(t)) return "comfort";
  if (/kitchen|lunch|coffee|kettle/.test(t)) return "kitchen";
  if (/line|queue|food|pizza/.test(t)) return "food line";
  if (/\bsit\b|seat|sofa|lounge|somewhere to sit/.test(t)) return "seating";
  if (/bar|good times|noise|party|loud/.test(t)) return "bar";
  if (/print/.test(t)) return "printers";
  if (/crit|prof|review/.test(t)) return "crits";
  if (/aisle|crowd|circulat|bump|narrow/.test(t)) return "aisles";
  if (/find|lost|wayfind|sign|orient/.test(t)) return "wayfinding";
  if (/light|glare|window|glaz|sun/.test(t)) return "light";
  if (/door|exit|leave/.test(t)) return "doors";
  if (/desk|spacing|space between/.test(t)) return "desks";
  return null;
}

export function normalizeSpec(raw) {
  const s = JSON.parse(JSON.stringify(raw || DEFAULT_SPEC));
  s.goals = (s.goals || []).map((g) => (typeof g === "string" ? { text: g } : g)).map((g) => ({ text: g.text, metric: METRICS.includes(g.metric) ? g.metric : metricFor(g.text) }));
  s.types = (s.types || []).map((t, i) => ({
    id: t.id || `type${i}`, name: t.name || `Type ${i + 1}`, role: t.role === "prof" || t.pattern === "prof" ? "prof" : t.role === "office" || t.pattern === "office" ? "office" : "student", count: Math.max(0, Math.round(Number(t.count) || 0)),
    pattern: PATTERNS[t.pattern] || (t.role === "prof" ? "prof" : t.role === "office" ? "office" : "focused"), mobility: t.mobility || "walking",
    goesToBar: clamp(Number(t.goesToBar ?? 0.35), 0, 1), usesKitchen: clamp(Number(t.usesKitchen ?? 0.65), 0, 1), hasPrintJob: clamp(Number(t.hasPrintJob ?? 0.5), 0, 1),
    traits: Object.fromEntries(TRAITS.map((k) => { const r = (t.traits && t.traits[k]) || [0.2, 0.8]; const lo = clamp(Number(r[0]), 0, 1), hi = clamp(Number(r[1]), 0, 1); return [k, [Math.min(lo, hi), Math.max(lo, hi)]]; })),
  }));
  if (!s.types.some((t) => t.role === "office")) s.types.push(JSON.parse(JSON.stringify(DEFAULT_SPEC.types.find((t) => t.role === "office"))));
  if (!s.types.some((t) => t.role === "prof")) s.types.push(JSON.parse(JSON.stringify(DEFAULT_SPEC.types.find((t) => t.role === "prof"))));
  const st = s.studio || {}; s.studio = { note: typeof st.note === "string" ? st.note : DEFAULT_NOTE, deadline: clamp(Number(st.deadline) || 0, 0, 1), deadlineSections: Array.isArray(st.deadlineSections) ? st.deadlineSections.map(String) : [], noiseShare: clamp(Number(st.noiseShare ?? 0.3), 0, 1), crowdShare: clamp(Number(st.crowdShare ?? 0.3), 0, 1), newShare: clamp(Number(st.newShare ?? 0.25), 0, 1) };
  s.pinned = s.pinned || {}; s.use = s.use || ""; s.source = s.source || "edited";
  return s;
}

const FIRST = ["Mira", "Tomas", "Priya", "Jun", "Amara", "Leo", "Sofia", "Kai", "Noor", "Elias", "Hana", "Mateo", "Zara", "Owen", "Yuki", "Ivan", "Leila", "Theo", "Anika", "Rafael", "Maya", "Dev", "Chloe", "Arjun", "Nadia", "Felix", "Imani", "Lucas", "Sana", "Ben", "Aiko", "Omar", "Elena", "Ravi", "Freya", "Diego", "Mei", "Jonas", "Tala", "Sam", "Ines", "Kenji", "Rosa", "Adam", "Lina", "Marco", "Esme", "Nikhil", "Greta", "Hugo", "Aya", "Caleb", "Dara", "Emil", "Farah", "Gus", "Ida", "Jorge", "Keiko", "Lars", "Maren", "Nour", "Oscar", "Pia", "Quinn", "Reza", "Siena", "Tariq", "Uma", "Vera", "Wes", "Ximena", "Yara", "Zeke", "Bea", "Cyrus", "Dalia", "Eitan", "Fynn", "Gia"];
const LAST = "ABCDEFGHJKLMNPRSTVWY";
const PROF = ["Okafor", "Lindqvist", "Marchetti", "Haddad", "Takahashi", "Delgado", "Novak", "Mensah", "Brennan", "Castellanos", "Iyer", "Søndergaard"];
const STYLE = {
  focused: { breakEvery: 100 * 60, breakSpread: 20 * 60, breakLen: 8 * 60, leaveShift: +30 * 60 },
  social: { breakEvery: 55 * 60, breakSpread: 15 * 60, breakLen: 14 * 60, leaveShift: 0 },
  restless: { breakEvery: 35 * 60, breakSpread: 10 * 60, breakLen: 6 * 60, leaveShift: -20 * 60 },
};

// Build the cast from the spec. Desks are dealt out by seed; student types fill them in order.
export function makeCastFromSpec(plan, spec, rng, seed) {
  spec = normalizeSpec(spec);
  const people = []; const used = new Set();
  const randn = () => { const u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const name = (prof) => { let n, tries = 0; do { n = prof ? "Prof. " + (tries < 24 ? pick(rng, PROF) : pick(rng, FIRST) + " " + pick(rng, LAST.split("")) + ".") : pick(rng, FIRST) + " " + pick(rng, LAST.split("")) + "."; tries++; } while (used.has(n)); used.add(n); return n; };
  const drawTraits = (t) => Object.fromEntries(TRAITS.map((k) => [k, rand(rng, t.traits[k][0], t.traits[k][1])]));
  // deal desks: shuffle, then allot to student types in spec order
  const desks = plan.desks.slice(); for (let i = desks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [desks[i], desks[j]] = [desks[j], desks[i]]; }
  let di = 0;
  for (const t of spec.types) {
    if (t.role !== "student") continue;
    for (let k = 0; k < t.count && di < desks.length; k++, di++) {
      const d = desks[di]; const S = STYLE[t.pattern] || STYLE.focused;
      const traits = drawTraits(t);
      // studio-wide qualities, independent of the pattern: anyone can be noise-sensitive, crowd-sensitive or new
      const Q = spec.studio;
      traits.noise = rng() < Q.noiseShare ? rand(rng, 0.65, 0.95) : rand(rng, 0.1, 0.55);
      traits.crowd = rng() < Q.crowdShare ? rand(rng, 0.65, 0.95) : rand(rng, 0.1, 0.55);
      traits.familiarity = rng() < Q.newShare ? rand(rng, 0.05, 0.3) : rand(rng, 0.4, 0.9);
      const dl = Math.max(Q.deadline, Q.deadlineSections.includes(d.section) ? 0.8 : 0);
      const arrival = rng() < 0.7 ? rand(rng, 0, 5 * 60) : rand(rng, 5 * 60, 50 * 60);
      const leave = clamp(rand(rng, 90 * 60, 270 * 60) + S.leaveShift + 20 * 60 * randn() + dl * 90 * 60, 60 * 60, 285 * 60);
      people.push({
        id: "S" + (plan.desks.indexOf(d) + 1), name: name(false), role: "student", typeId: t.id, typeName: t.name, year: d.year, section: d.section, deskId: d.id, seat: d.seat, facing: d.facing,
        traits, style: t.pattern, mobility: t.mobility, speed: rand(rng, 1.15, 1.45), arrival, leave,
        // nearly everyone prints letter and tabloid sheets all day; the plotters and the 3D printers see use mostly under deadline
        goesToBar: rng() < t.goesToBar * (1 - 0.6 * dl), usesKitchen: rng() < t.usesKitchen, hasPrintJob: true, prints: rng() < 0.85, usesPlotter: rng() < Math.min(0.9, 0.08 + 0.7 * dl), uses3D: rng() < Math.min(0.6, 0.04 + 0.4 * dl), deadline: dl, needScale: 1 / (1 + 0.8 * dl),
        breakEvery: (S.breakEvery + S.breakSpread * randn()) * (1 + dl), breakLen: S.breakLen * rand(rng, 0.7, 1.4),
        hungerInit: rand(rng, 0.45, 1.0), thresholdJitter: rand(rng, 0.85, 1.15),
        // how lunch happens: the kitchen, food brought back to the desk, a packed lunch at the desk, or out and back later
        lunch: pick(rng, ["kitchen", "kitchen", "kitchen", "bring", "bring", "out", "out", "desk"]),
        background: `${t.name.toLowerCase()}${dl > 0.5 ? ", deadline this week" : ""}; ${traits.familiarity < 0.3 ? "new to the building" : traits.familiarity > 0.7 ? "knows every shortcut" : "knows the floor"}${traits.noise > 0.65 ? "; needs quiet" : ""}`,
      });
    }
  }
  const sections = [...new Set(plan.desks.map((d) => d.section))].sort();
  const profTypes = spec.types.filter((t) => t.role === "prof");
  const profCount = profTypes.reduce((n, t) => n + t.count, 0);
  sections.slice(0, Math.max(0, profCount)).forEach((sec, i) => {
    const t = profTypes[Math.min(profTypes.length - 1, Math.floor((i / Math.max(1, profCount)) * profTypes.length))];
    const traits = drawTraits(t); traits.familiarity = Math.max(traits.familiarity, 0.85);
    people.push({
      id: "P" + (i + 1), name: name(true), role: "prof", typeId: t.id, typeName: t.name, section: sec, year: 1 + Math.floor((i * 3) / sections.length),
      traits, style: "prof", mobility: t.mobility, speed: rand(rng, 1.2, 1.4), arrival: rand(rng, 0, 25 * 60), leave: rand(rng, 180 * 60, 270 * 60),
      critLen: rand(rng, 7 * 60, 13 * 60), goesToBar: false, usesKitchen: true, hasPrintJob: false, breakEvery: 1e9, breakLen: 8 * 60,
      background: "circulates for desk crits",
    });
  });
  // office profs: one per office room, an office routine (coffee, a walk past the pin-ups, a meeting out)
  const offices = plan.rooms.filter((r) => /office/i.test(r.name));
  const officeTypes = spec.types.filter((t) => t.role === "office");
  let oi = 0;
  for (const t of officeTypes) for (let k = 0; k < t.count && oi < offices.length; k++, oi++) {
    const room = offices[oi]; const traits = drawTraits(t); const chair = officeLayout(room, plan).find((f) => f.seat);
    people.push({
      id: "O" + (oi + 1), name: name(true), role: "office", typeId: t.id, typeName: t.name, section: null, year: 3, deskId: room.id, seat: chair ? chair.seat : room.label, facing: chair ? chair.facing : [1, 0],
      traits, style: "office", mobility: t.mobility, speed: rand(rng, 1.1, 1.3), arrival: rand(rng, 0, 20 * 60), leave: rand(rng, 240 * 60, 258 * 60),
      goesToBar: false, usesKitchen: true, hasPrintJob: false, breakEvery: 70 * 60, breakLen: 22 * 60, hungerInit: 0.2, thresholdJitter: 1,
      background: `in the ${room.name.toLowerCase()}; office hours, a coffee, a walk past the pin-ups, one meeting out`,
    });
  }
  // pinned individuals: overrides by id survive regeneration
  for (const p of people) { const o = spec.pinned[p.id]; if (o) { Object.assign(p, o, { traits: { ...p.traits, ...(o.traits || {}) }, pinned: true }); } }
  const barShare = people.length ? people.filter((p) => p.role === "student" && p.goesToBar).length / Math.max(1, people.filter((p) => p.role === "student").length) : 0;
  return { people, sections, barShare, seed, spec };
}

// a short sentence and a list of qualities for an archetype card
export function describeType(t) {
  const P = { focused: "Works in long stretches with few breaks and mostly stays at the desk.", social: "Breaks often to visit friends and the kitchen; works best with people around.", restless: "Up every half hour: the pin-up wall, a walk, the printers.", prof: "Circulates through the section for desk crits, then leaves.", office: "Keeps office hours: coffee, a walk past the pin-ups, one meeting out." };
  const share = (v) => (v >= 0.5 ? "most" : v >= 0.2 ? "some" : v > 0 ? "a few" : "none");
  const level = (r) => { const m = (r[0] + r[1]) / 2; return m >= 0.62 ? "high" : m >= 0.4 ? "mid" : "low"; };
  const sentence = (P[t.pattern] || P.focused) + (t.role === "student" ? ` ${share(t.goesToBar)[0].toUpperCase() + share(t.goesToBar).slice(1)} stay for Good Times; ${share(t.usesKitchen)} use the kitchen; ${share(t.hasPrintJob)} have a print due.` : "");
  const qualities = [["access", t.mobility], ["sociability", level(t.traits.sociability)], ["patience", level(t.traits.patience)], ["curiosity", level(t.traits.curiosity)]];
  return { sentence, qualities };
}

// what the spec produces: counts by type and trait histograms (10 bins), for the setup panel
export function distribution(cast) {
  const byType = {}; for (const p of cast.people) byType[p.typeName || p.style] = (byType[p.typeName || p.style] || 0) + 1;
  const hist = Object.fromEntries(TRAITS.map((k) => [k, new Array(10).fill(0)]));
  for (const p of cast.people) for (const k of TRAITS) hist[k][Math.min(9, Math.floor(p.traits[k] * 10))]++;
  return { byType, hist, total: cast.people.length };
}

// a spec from a brief without the API: counts from numbers in the text, goals from sentences
export function specFromBriefLocal(brief) {
  const s = normalizeSpec(DEFAULT_SPEC); s.source = "local parse (no API key)";
  s.use = brief.split(/\n|\.\s/)[0].trim().slice(0, 200) || s.use;
  const goals = brief.split(/\n|[.;?]\s/).map((x) => x.trim()).filter((x) => /\b(want|whether|does|do|can|should|is|are|goal|check|test)\b/i.test(x) && x.length > 12).slice(0, 6);
  if (goals.length) s.goals = goals.map((g) => ({ text: g, metric: metricFor(g) }));
  const m = brief.match(/(\d{2,3})\s*(students|people|desks)/i); if (m) { const n = Number(m[1]); const total = s.types.filter((t) => t.role === "student").reduce((x, t) => x + t.count, 0); for (const t of s.types) if (t.role === "student") t.count = Math.round((t.count / total) * n); }
  const b = brief.match(/(\d{1,3})\s*%[^.]*?(good times|bar|stay)/i) || brief.match(/(good times|bar)[^.]*?(\d{1,3})\s*%/i);
  if (b) { const pct = Number(b[1].match(/\d/) ? b[1] : b[2]) / 100; for (const t of s.types) if (t.role === "student") t.goesToBar = clamp(pct, 0, 1); }
  if (/third|1\/3|a third/i.test(brief) && /good times|bar/i.test(brief)) for (const t of s.types) if (t.role === "student") t.goesToBar = 0.33;
  if (/deadline|due |review week|pin-up week|submission/i.test(brief)) s.studio.deadline = 0.7;
  const secs = brief.match(/sections?\s+([A-L](?:\s*,\s*[A-L])*)/i); if (secs) s.studio.deadlineSections = secs[1].split(/\s*,\s*/).map((x) => x.toUpperCase());
  if (/quiet|noise/i.test(brief)) s.studio.noiseShare = 0.5;
  return s;
}
