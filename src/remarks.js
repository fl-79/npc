// Remarks in each character's voice, about the space. Template-based in this build and tagged
// "inferred"; the "because" line carries the computed fact that triggered the remark. Every
// event maps to a topic so the feed can be read by topic instead of as a stream.
import { pick } from "./rng.js";

export const TOPIC_OF = {
  profLater: "crits", critTimeout: "crits",
  lunchOut: "kitchen", lunchDesk: "kitchen",
  kitchenFar: "kitchen", kitchenCrowded: "kitchen", crowd: "aisles", tightDesks: "desks", critTight: "desks", glassDesk: "light",
  printerBusy: "printers", printerFar: "printers", lost: "wayfinding", pinupTight: "pin-up", lineLong: "food line", served: "food line",
  lineAtDesk: "food line", barDense: "bar", atBar: "bar", noise: "bar", doorBusy: "doors", missedCrit: "crits", critStart: "crits", critEnd: "crits",
  profWait: "crits", profSkip: "crits", profBreak: "kitchen", arrive: "day", leave: "day", break: "day", toBar: "bar", friendChat: "desks",
  setup: "bar", noSeat: "seating", satDown: "seating", splinter: "seating", lateDesk: "bar", leaveParty: "bar", windDown: "bar", plotterBusy: "printers",
};
export const TOPICS = ["kitchen", "aisles", "desks", "light", "printers", "wayfinding", "pin-up", "food line", "bar", "seating", "doors", "crits", "day"];

const T = {
  profLater: ["{student} is away. I'll swing back; the floor is long enough that this costs me ten minutes.", "Empty desk, {student}. Back later, once more down the whole row."],
  critTimeout: ["The prof never reached my desk today. The round over our section is too long for one afternoon.", "No crit. By the time the prof got to our end of the row the day was over."],
  lunchOut: ["Lunch is a walk: {m} m to the stairs, then down and out. The kitchen was never an option.", "Out for food again. Nothing up here I'd eat, and it's {m} m just to reach the stairs."],
  lunchDesk: ["Eating at the desk. The kitchen is {m} m away and full of people warming soup.", "Sandwich over the keyboard. Walking {m} m for a counter spot is not a lunch break."],
  kitchenFar: ["{m} metres to the kettle. The kitchen is in the wrong corner of this floor.", "Coffee is a {m} m walk from my desk. Each way. Somebody planned that.", "The kitchen is behind the core, past every desk. {m} m for a tea bag."],
  kitchenCrowded: ["{n} people, two counters, {area} square metres. Nobody drew lunch on this plan.", "The kitchen is a corridor with a fridge, and {n} of us are in it.", "Late lunch, same as everyone else's, in a kitchen sized for four."],
  crowd: ["This aisle is {w} m wide and it's the only way through.", "The desk rows make a canyon. {n} of us in {w} m of aisle.", "Excuse me, excuse me, excuse me. {w} metres between the desks."],
  tightDesks: ["{n} desks within arm's reach. I can hear everyone's headphones.", "Desks this close turn the aisle into a shared chair.", "Four of us in a cluster meant for three. Good for gossip, bad for models."],
  critTight: ["Nowhere to stand for a crit without blocking the aisle. {w} m clear.", "Every crit I give stops traffic. The rows leave {w} m to stand in."],
  glassDesk: ["Full-height glass {d} m behind me. Lovely light, right up until it's in the screen.", "Window desk on the {side} side. The whole campus walks past my section.", "{d} m from the glazing. In October this is the best seat on the floor."],
  printerBusy: ["Printer room: {area} m², {n} people, one door. A cupboard with ambitions.", "A queue for a room the size of a lift. Where else would the printers go?", "{n} in the printer room already. There is no waiting space, so the hall is the waiting space."],
  printerFar: ["{m} m to the printers, at the far end, past every section.", "The printer room is at the other core. {m} metres per print check."],
  lost: ["Went to the wrong end for the printers. The two cores look identical from the aisle.", "Which core has the printers? Nothing on the floor tells you.", "Both ends of this floor look the same. Chose wrong."],
  pinupTight: ["Boards in the middle of the aisle. {w} m to step back and look at work.", "Pin-up wall at {w} m from the desks. You review from a chair.", "No room in front of the boards. Crits happen at arm's length."],
  lineLong: ["{len} people in a line for food, tail in {tail}. Nobody drew a line on this plan.", "The food line runs into the desk rows. A bar in the open floor does that.", "Queued past the year-twos still working. {len} ahead of me."],
  served: ["{wait} minutes in a line down the desk aisle for pizza. Worth it, barely.", "Served after {wait} min. The line is the only architecture Good Times has.", "{wait} minutes. The bar needs its own room, or at least its own corner."],
  lineAtDesk: ["The food line is at my desk. I'm in the line now, apparently.", "A queue runs past my chair while I'm working. Great planning.", "Can't see my screen for the queue. The bar should be behind a wall."],
  barDense: ["{n} people in {area} m² around a counter. Good Times, tight times.", "The bar is a counter in the open floor; the party spills over the desks.", "{n} of us around one counter. Fun, but the aisles are the dance floor."],
  atBar: ["This is the best part of Friday, in the worst part of the plan.", "Keg's cold, floor's warm, desks are the furniture.", "Good Times. Counter, keg, and everyone's drawings as wallpaper."],
  noise: ["Working {d} m from the bar after 6:30 is a design decision somebody made for me.", "{n} people at the bar and nothing between them and my desk.", "The bar needed a wall. I need headphones. One of those is cheaper."],
  doorBusy: ["{n} people through one door in five minutes. One door.", "The whole floor leaves through a 90 cm gap by the stairs.", "Everyone exits past the same desk. That desk is mine."],
  missedCrit: ["Missed my crit. The prof can't see the kitchen from the rows.", "Prof came by while I was at the kettle. Of course the kitchen is out of sight.", "Missed the crit. Three minutes at the far end of the floor costs you a week."],
  critStart: ["Crit. The aisle is now a classroom.", "Here we go. Everyone in the row gets to listen.", "Crit at the desk; the neighbours get a free one."],
  critEnd: ["Good crit. Three things to fix, all fair.", "That helped. Also everyone in the row heard it.", "Noted. All of it. The person next to me took notes too."],
  profWait: ["Empty desk. Can't see where {student} went from here.", "Where is {student}? Probably the kitchen; you can't tell from the rows."],
  profSkip: ["Moving on. {student} can find me, if they can find me.", "Skipping {student}. The floor is too long to come back twice."],
  profBreak: ["Kitchen. Then the second round, the long way.", "Coffee before the second lap of this floor."],
  arrive: ["Desk. Headphones. Four hours.", "Who's here? Everyone, apparently.", "Same floor, same light, same walk to the kitchen."],
  leave: ["Done enough. The long walk to the stairs.", "Leaving. One door, as usual.", "Out. The floor empties the same way it fills."],
  toBar: ["Line's forming. The bar's a counter, so the line's an aisle.", "Food line. Earlier every week.", "Joining the line before it reaches my desk."],
  friendChat: ["Solved nothing, felt better. The desks are close enough for that at least.", "A good chat is one aisle away. That's the one thing this layout gets right."],
  setup: ["Setting up the keg in {area} m² behind a counter. {w} m to turn around in.", "Two of us, one keg, no back-of-house. The bar is a counter and a wish.", "Food goes on the desks because the counter has {w} m beside it."],
  noSeat: ["{n} seats within reach of the bar and every one taken. Standing it is.", "Nowhere to sit. The sofas went in the first ten minutes.", "A party for sixty and seats for {n}. The desks are the lounge."],
  satDown: ["Found a seat in {place}, {m} m from the bar. Close enough to hear, far enough to talk.", "Sitting in {place}. The bar is {m} m away, which is about right.", "A sofa {m} m from the keg is the best furniture on this floor."],
  splinter: ["{n} of us peeled off to {place}. The party needs more than one room.", "Three of us in {place}, {m} m from the noise. This is where the evening actually happens.", "We took {place}. Somebody should design for that instead of pretending we stay at the counter."],
  lateDesk: ["Back at the desk with the party {m} m away. Rendering while everyone else drinks.", "Print job due. The bar is louder from here than it looked on the plan."],
  leaveParty: ["Heading out; {n} still at the bar. The floor empties through one door, again.", "Done. The keg is by the desks and my coat is at the other end.", "Leaving Good Times. The best bit was the sofa, not the counter."],
  plotterBusy: ["Both plotters busy and the sheet is due at five. Two plotters for a floor of {n}0.", "Queue at the plotter again. Everyone prints at the same hour because everyone pins up at the same hour.", "The plotter is a desk away from twelve sections. Of course there is a line."],
  windDown: ["Done for the day. Staying for Good Times, so the floor is the waiting room.", "Finished. Two hours to kill before the keg, and the sofas went an hour ago.", "Pens down. Nowhere to wait that is not a desk."],
  break: null,
};
// from run two on, people can refer to what they learned
const AGAIN = {
  kitchenCrowded: ["Same as last time: {n} in the kitchen. I came later and so did everyone.", "Tried to dodge the lunch rush. The rush moved with me. {n} in {area} m² again."],
  printerBusy: ["Printed earlier this time. So did two other people. Room's full again.", "Learned to come early for the printer. Everyone learned the same thing."],
  served: ["Joined the line {early} minutes earlier than last time and still waited {wait}. The line just starts sooner.", "{wait} minutes again. Coming early doesn't fix a line through the desks."],
};

const COOLDOWN = 10 * 60;
const ALWAYS = new Set(["missedCrit", "lost", "served", "lineAtDesk"]);
const QUIET = new Set(["arrive", "leave", "toBar", "critStart", "critEnd", "friendChat", "profSkip", "profLater", "profWait", "leaveParty", "satDown", "windDown"]);

export function remarkFor(person, agent, ev, rng, t) {
  const pool = T[ev.kind]; if (!pool) return null;
  if (!ALWAYS.has(ev.kind) && t - agent.lastRemarkT < COOLDOWN) return null;
  const talk = 0.35 + 0.5 * person.traits.sociability;
  if (QUIET.has(ev.kind) && rng() > talk * 0.35) return null;
  if (!ALWAYS.has(ev.kind) && !QUIET.has(ev.kind) && rng() > talk) return null;
  let text = pick(rng, ev.again && AGAIN[ev.kind] && rng() < 0.6 ? AGAIN[ev.kind] : pool);
  text = text.replace(/\{(\w+)\}/g, (_, k) => (ev[k] != null ? ev[k] : k === "student" ? "the student" : k === "friend" ? "a friend" : ""));
  return { text, because: ev.because || "" };
}

export function reviewFor(person, agent) {
  const hist = agent.moodHist;
  const mean = hist.length ? hist.reduce((s, h) => s + h[1], 0) / hist.length : agent.mood;
  const rating = Math.max(1, Math.min(5, Math.round(1 + mean * 4.4)));
  const counts = {}; for (const e of agent.log) if (e.topic !== "day") counts[e.topic] = (counts[e.topic] || 0) + 1;
  const topics = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const lines = [];
  if (person.role === "prof") {
    lines.push(`${agent.critsDone} crits, ${agent.critsMissed} desks empty when I came by, ${Math.round(agent.walked)} m walked.`);
    lines.push(agent.walked > 900 ? "The section is spread along a 49 m floor; a round is a hike." : "The section sits close together; the round went quickly.");
  } else {
    lines.push(`${agent.breaks} breaks, ${Math.round(agent.walked)} m walked, ${agent.critsDone ? "one crit" : "no crit"}${agent.critsMissed ? " and one missed" : ""}.`);
    if (agent.kitchenCrowd) lines.push("Found the kitchen full when I needed it. It is sized for a smaller floor.");
    if (agent.printerWaits) lines.push("The printer room was full; there is nowhere to wait but the hall.");
    if (agent.crowdEvents > 1) lines.push(`Got stuck in the desk aisles ${agent.crowdEvents} times.`);
    if (agent.queueWait != null) lines.push(`${Math.round(agent.queueWait / 60)} minutes in the food line through the desks.`);
    if (agent.noiseMinutes > 10) lines.push(`Worked ${Math.round(agent.noiseMinutes)} minutes within earshot of the bar. ${person.traits.noise > 0.55 ? "Not a fan." : "Didn't mind."}`);
    if (agent.noSeat) lines.push("Wanted to sit down at Good Times and found every seat within reach taken.");
    if (agent.satIn) lines.push(`Ended the evening sitting in ${agent.satIn}.`);
  }
  const change = {
    kitchen: "A bigger kitchen, or a second one at the other end.", printers: "A printer room with somewhere to wait, and a sign saying who is in it.",
    "food line": "A place for the line that isn't the desk aisle.", bar: "Something between the bar and the desks after 6:30.", seating: "Seats within reach of the bar: a lounge, not a counter in the aisle.", aisles: "Wider aisles between the desk rows.",
    desks: "A little more space between desks, or a place to stand for crits.", wayfinding: "Something that tells the two ends of the floor apart.", doors: "A second way out at the busy end.",
    light: "Blinds on the west glazing for the late afternoon.", "pin-up": "Room to step back from the pin-up boards.", crits: "A way to know when the prof is coming round.",
  }[topics[0]] || "Honestly, fine as it is.";
  return { rating, lines, change, meanMood: mean, topics: topics.slice(0, 3) };
}
