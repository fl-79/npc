// Remarks in each character's voice, about the space. Template-based in this build and tagged
// "inferred"; the "because" line carries the computed fact that triggered the remark. Every
// event maps to a topic so the feed can be read by topic instead of as a stream.
import { pick, mulberry32 } from "./rng.js";

export const TOPIC_OF = {
  printQueue: "printers", waitingCrit: "crits",
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
// more voices for the frequent kinds, and the new ones
const MORE = {
  arrive: ["In. Coat on the chair, same desk as always.", "Back on the floor. The rows look the same every Friday.", "Arrived with coffee from downstairs; the kitchen can wait.", "Here. The far end of the floor, as usual, by the glass.", "Settling in. The walk from the stairs to my desk is a warm-up."],
  leave: ["Packing up. The walk to the stairs is the longest part of leaving.", "Done for today. Out past every section to the door.", "Heading home. The floor thins from the ends inward.", "Leaving by the north stair; the south one is further from my desk than the street is.", "Off. One door, one stair, one long aisle."],
  toBar: ["Joining the line early; it already reaches the desks.", "Into the food line. It forms down the aisle because there is nowhere else for it.", "Line's started; a bar in the open floor makes the aisle the queue."],
  windDown: ["Finished, and an hour to wait for Good Times with nowhere to sit but a desk.", "Done early; the floor between now and the keg is a waiting room without chairs.", "Pens down, staying for Good Times. The sofas are taken, so it's the desk again."],
  kitchenCrowded: ["The kitchen holds four comfortably; there are {n} of us.", "Counter space for two, and a line to the kettle."],
  printQueue: ["{n} of us at the one letter printer on the floor. Every section's sheets come out of the same tray.", "Queue at the big printer again. One printer at the north end for every desk on the floor.", "The printer is a {n}-person line at four o'clock. It needs a twin at the south core."],
  waitingCrit: ["Ready to go {m} minutes ago; still waiting for the crit. The round over this section is a marathon.", "Packed up, sitting here. The prof is somewhere down the row and I'm not leaving before my turn."],
  critStart: ["Crit time. The whole row goes quiet to listen in.", "Prof's here. The aisle fills with everyone who wanted to hear this.", "My turn. Three neighbours lean back to watch.", "The prof pulls up a chair that was already someone else's.", "Crit. Three people stop working to listen; the rows don't give you a choice.", "Here's the prof. The aisle behind them is now blocked for the row."],
  critEnd: ["Useful. Also public: the aisle is a stage.", "Fair points. My neighbours now know exactly where my section is weak.", "Done. The crit happened in the aisle because the desk has no side to stand at."],
  critTight: ["The prof stood in the aisle, in the way of everyone; {w} m is not a place to stand.", "{w} m clear beside the desk. The crit becomes a traffic report.", "The prof is standing in the aisle because there is nowhere else; people squeeze past the crit.", "Crit in {w} m of clearance. Everyone passing becomes part of it.", "No side to stand on at this desk, so the crit happens over my shoulder."],
  tightDesks: ["{n} desks within reach. I know what everyone in this cluster is listening to.", "Shoulder to shoulder. Four screens, one aisle, no elbow room for a model.", "The cluster is tight enough that a chair pushed back blocks the row."],
  friendChat: ["Ten minutes at a friend's desk; the rows make that easy, at least.", "A chat across the aisle costs nothing here. The layout is good at that one thing."],
  glassDesk: ["Daylight all afternoon, then low sun straight into the screen.", "Best light on the floor at two, worst at four. Same desk.", "The glass is {d} m away; the whole section watches the weather instead of working."],
  kitchenCrowded: ["{n} people at two counters. The kettle has a line.", "Standing in the kitchen doorway with a bowl, because inside is full.", "Lunch at the same time as a hundred others, in a kitchen the size of an office."],
  kitchenFar: ["{m} metres to a kettle is a decision, not a walk.", "The kitchen is at one end of the floor. My desk is at the other. {m} m, twice a day."],
  crowd: ["{n} of us trying to pass in a {w} m aisle, one with a model.", "The aisle narrows to {w} m right where everyone crosses to the kitchen."],
  lineLong: ["{len} in the food line and it runs down the desk aisle.", "The line reaches {tail}. Good Times starts with a queue through the studio."],
  served: ["{wait} minutes for a plate. The line is the room.", "Fed after {wait} min of standing in the aisle."],
  noise: ["The bar is {d} m from my desk and I'm still working. No wall, no door, no chance.", "{n} people at the counter; the party is in my row."],
  atBar: ["Good Times, at a counter between the desks.", "The bar is the floor. Nobody designed it that way; it just happened here."],
  lost: ["Wrong core again. They look the same from the aisle.", "Went north for the printers; they are south. Nothing says which."],
  plotterBusy: ["Plotter queue at {n}. Everyone's sheets are due at the same hour.", "Waiting for the plotter with a roll under my arm, in the aisle."],
};
for (const k in MORE) T[k] = (T[k] || []).concat(MORE[k]);
// a second, wider set of lines for the kinds that come up most, so a floor of 170 does not repeat itself
const MORE2 = {
  served: ["{wait} minutes from the back of the line to a plate. The line went past four sections.", "Fed. {wait} minutes, most of it standing beside someone's model.", "Plate in hand after {wait} min. The queue was the tour of the floor nobody asked for.", "{wait} minutes, and the line doubled back through the desk rows twice.", "Got food. The wait was {wait} min; the walk back to a seat was the harder part.", "{wait} min in line. A bar with a back room would have had this done in ten.", "Served at last. {wait} minutes of shuffling past drawings pinned at eye level.", "Pizza after {wait} min. The aisle is the queue, the desks are the tables, the floor is the bar.", "{wait} minutes. The line ended at the keg and started at somebody's chair.", "The counter is one metre long; {wait} minutes is what one metre buys.", "Fed after {wait} min. The line held {len} people in a space drawn for walking."],
  friendChat: ["Dropped by {friend}'s desk. Two chairs, one aisle, an hour gone.", "Went to see {friend}. You can hear the whole conversation from the next row, so three people joined.", "A chat at {friend}'s desk. There is nowhere to stand, so I sat on the next desk.", "Five minutes with {friend} turned into a crit of my own section.", "The row is a conversation. Stopped at {friend}'s on the way to nothing in particular.", "Talked to {friend} across the aisle. No need to stand up; that is how close the desks are.", "Leaned on {friend}'s desk for a while. The model nearly went over.", "Visited {friend}. The whole row looked up; a visit here is a public event.", "A walk to {friend}'s desk is forty seconds. The walk back takes twenty minutes.", "Chatting at the far end of the row. Nobody minds; there is no quiet to disturb."],
  arrive: ["Coat on the chair, screen on, the row half full.", "In. Took the north stair and walked the whole floor to get here.", "Arrived. The desk is as I left it; the aisle is not.", "Here. Somebody has moved the chair again.", "On the floor by {clock}. Half the section already in.", "Start of a long one. The window side is bright already.", "Made it in. The core doors were propped open and the whole stair heard the floor.", "Desk, mug, headphones. The usual order.", "Up the stairs, past the printers, down the row. Sitting.", "In at the far desk. From the door it looks like a corridor with furniture.", "Arrived to a full row. The other half of the section is in the kitchen."],
  leave: ["Packing up. Out past the printers, past the kitchen, down the stairs.", "Done. Tomorrow's problem is pinned to the wall.", "Leaving the floor at {clock}. Still a dozen at the desks.", "Off home. The aisle is clear for once.", "Out. The last thing I saw was the queue at the printer.", "Leaving. The row empties from the window end first.", "Done for the day; the stairs are the only part of the floor that is ever quiet.", "Heading out. Somebody will need this chair before I reach the stair."],
  critStart: ["Prof at the desk. The row is suddenly very interested in their own screens.", "My crit. The person behind me has to stand so the prof can sit.", "Crit starting. A chair for the prof, a chair for me, no room for the drawings.", "Here's the prof. Two neighbours roll their chairs back to make a gap.", "Crit. The sheets go on the desk, the model goes on the floor, the prof stands in the aisle.", "The prof found me. The round came from the far end this time.", "Started. The section-mate across the aisle is already listening.", "Crit time. The prof leans over the partition because there is nowhere to sit.", "My turn in the round. The chair has to come from the next desk."],
  critEnd: ["Crit over. The neighbours heard it, which saves me explaining.", "Done. Three notes, one of them about the plan I thought was finished.", "That was quick. The prof is already two desks down.", "Finished. The chair goes back, the aisle reopens.", "Good one. The whole row will discuss it at the kitchen.", "Crit done. Twenty minutes, and the person behind me heard every word.", "Over. The prof stood the whole time; there was nowhere to put a second chair.", "Done. Now I know what next week is.", "Ended with a sketch on the back of my section. Fair."],
  critTight: ["Crit at a desk with {w} m beside it. I stand in the aisle and the row goes around me.", "{w} m to stand in. I lean over the drawings and the student leans back.", "Another crit in a gap of {w} m. The floor needs a place to stand, not just to sit.", "The aisle is where the teaching happens; {w} m of it.", "Stood at an angle for twenty minutes. {w} m between the desks does that.", "Nowhere to put the second chair. {w} m clear, one chair wide.", "Did the crit standing in the aisle with people passing behind me. {w} m."],
  tightDesks: ["{n} desks within reach and all of them talking.", "My elbow is in someone's model. {n} seats this close.", "Close enough to read the next screen. {n} neighbours.", "The cluster is {n} desks and one shared aisle; a chair pushed back is a roadblock.", "{n} people within a metre and a half. The row hums.", "Tight row. The chair behind me and mine meet when we both lean back.", "{n} desks in a huddle. Good for borrowing a scale rule, bad for a phone call.", "A sneeze carries three desks here."],
  kitchenCrowded: ["{n} in the kitchen at once. The kettle is the busiest fixture on the floor.", "Waited for a counter spot behind {n} others. The kitchen is a corridor.", "Kitchen at capacity. {n} people and one sink.", "Everyone's lunch is at the same hour, in a room drawn for a few.", "{n} in {area} m². The fridge door is the choke point.", "Standing in the kitchen with a bowl and nowhere to put it.", "Full kitchen; ate in the doorway.", "Two counters, {n} people, one microwave. The queue is the room."],
  glassDesk: ["{d} m from the {side} glass. The screen is unreadable from three.", "The {side} glazing is right there. The light is the best thing about the desk and the worst thing about the screen.", "Window desk. Everyone passing outside gets a look at the section.", "By the {side} glass. Blinds are not a thing this floor has.", "Sun on the desk from two. The drawings fade and so do I.", "{d} m from the window. Warm at two, bright at four, perfect at ten in the morning when I am not here.", "Glass at my back. Good for a view, bad for a screen."],
  atBar: ["At the counter. The keg is between two desks and so are we.", "Good Times. The party is in the aisle; the aisle is the party.", "Here at the bar; the sound goes the whole length of the floor.", "At the keg. The chairs are all someone's desk chairs.", "Standing at the counter with a plate and nowhere to put it down.", "The bar is open and the whole floor can hear it.", "Good Times at a counter the width of a door."],
  lineLong: ["{len} ahead and the tail is in {tail}. The line has a floor plan of its own.", "In the line, which starts at the counter and ends in {tail}.", "{len} people between me and a plate. Standing next to someone's desk.", "The line reaches {tail} already. It will reach the stairs by seven.", "Queuing past the section that is still working. {len} ahead."],
  toBar: ["Food line. It forms where the aisle is, because there is nowhere else.", "Joining the line. It already touches the first row of desks.", "Off to the line before it gets to my desk.", "Line time. The queue is a walk through everyone's work."],
  windDown: ["Finished. An hour until Good Times and nowhere to sit but a chair that is already mine.", "Done early. Waiting for the keg at the desk, which is the only seat left.", "Pens down; the floor between now and six-thirty is a waiting room.", "Work's done. The sofas went at four."],
  leaveParty: ["Leaving Good Times; {n} still at the counter. The exit runs through the party.", "Out. {n} left at the bar, the keg between the desks.", "Done for the night. The coat is at the far end, past the line.", "Heading home from the bar through the whole floor."],
  barDense: ["{n} people around one counter. The desks are the walls.", "The crowd at the bar is {n} deep and the aisle is the only room.", "{n} in {area} m². A party in a corridor."],
  crowd: ["Stuck. {n} of us in {w} m of aisle, one carrying a board.", "The aisle narrows to {w} m and everyone meets there.", "Traffic. {w} m between desks and a model coming the other way.", "Waited for the aisle to clear. {w} m is one person wide."],
  printQueue: ["{n} at the one printer. Every sheet on the floor comes out of this tray.", "Queue at the printer by the north desks. {n} of us, one machine.", "Printer line again. One letter printer for a floor this size.", "Waiting at the printer behind {n} others, standing in the north aisle.", "The printer is the busiest corner of the floor; {n} here now."],
  waitingCrit: ["Still waiting for the crit. The prof is {m} minutes behind the round.", "Packed up {m} minutes ago. Can't leave before the crit.", "Waiting. The prof is somewhere down the row; the floor is long."],
  lunchDesk: ["Lunch at the desk. {m} m to the kitchen is a trip, not a break.", "Eating over the keyboard. The kitchen is at the other end of the floor."],
  lunchOut: ["Lunch out. Down the stairs is closer than the kitchen.", "Out for lunch. The kitchen is {m} m away and full anyway."],
  noise: ["Still working, {d} m from the bar. The music reaches the window.", "The party is at the end of my row. {n} people and no wall.", "Working through Good Times. The nearest quiet is downstairs."],
  kitchenFar: ["{m} m to the kitchen. I'll make the next coffee count.", "Walked {m} m for a tea. The kitchen is in the wrong corner."],
  profLater: ["{student}'s desk is empty. Back at the end of the round; that is another length of the floor.", "No {student}. I'll come back; the kitchen is out of sight from here so I can't tell where they went."],
  profWait: ["Waiting at {student}'s desk. From the rows you cannot see the kitchen or the printers.", "{student} is away. Three minutes here is three minutes off the next desk."],
  profBreak: ["Coffee. The kitchen is a long way from the section, so this is a real break.", "Kitchen, then back for the rest of the round."],
};
for (const k in MORE2) T[k] = (T[k] || []).concat(MORE2[k]);
// a few kinds have a voice per archetype: the same thing, said as that person would say it
const VOICE = {
  focused: {
    critEnd: ["Good notes. Back to it.", "Clear, short, done. Now headphones."],
    tightDesks: ["{n} desks within reach; the noise is the problem, not the space.", "Close desks mean I hear every conversation in the row."],
    kitchenCrowded: ["Too many people in the kitchen; I'll come back when it's empty.", "Crowded kitchen. Coffee can wait an hour."],
    noise: ["Still working, {d} m from the bar. Headphones at full volume.", "The bar started and my concentration ended."],
    friendChat: ["Short chat. Back to the desk.", "Five minutes with a friend, then the drawing again."],
  },
  social: {
    critEnd: ["Good crit, and half the row got it too. We'll talk about it at the kitchen.", "Nice. The whole row chimed in; that's a crit."],
    tightDesks: ["Close desks: everyone's in on everything. I like it, mostly.", "Tight cluster, good company, no room for a model."],
    kitchenCrowded: ["Kitchen's packed. Fine by me, that's where everyone is.", "{n} people in the kitchen and it's the best conversation on the floor."],
    noise: ["Bar's going and I'm still here. Tempting.", "Working {d} m from the party. Ten more minutes, then the keg."],
    friendChat: ["A chat at a friend's desk turned into a half hour. The rows make that easy.", "Visited two desks on the way back. The floor is good for that."],
  },
  restless: {
    critEnd: ["Crit done. Need a walk.", "Good, useful, over. Off to the printer."],
    tightDesks: ["Can't push the chair back without hitting someone. Up again.", "Tight desks; I'm up every twenty minutes anyway."],
    kitchenCrowded: ["Kitchen full. Another lap of the floor, then.", "No room in the kitchen; walked to the other end instead."],
    noise: ["Bar's on. Can't sit still with that going on {d} m away.", "The party is louder than my music. Walking it off."],
    friendChat: ["Stopped at three desks on one trip to the kettle.", "A chat here, a chat there; the aisles are a social network."],
  },
};
// no two remarks of a kind in a row with the same words, floor-wide, and nobody repeats themselves
const lastText = {};
// from run two on, people can refer to what they learned
const AGAIN = {
  kitchenCrowded: ["Same as last time: {n} in the kitchen. I came later and so did everyone.", "Tried to dodge the lunch rush. The rush moved with me. {n} in {area} m² again."],
  printerBusy: ["Printed earlier this time. So did two other people. Room's full again.", "Learned to come early for the printer. Everyone learned the same thing."],
  served: ["Joined the line {early} minutes earlier than last time and still waited {wait}. The line just starts sooner.", "{wait} minutes again. Coming early doesn't fix a line through the desks."],
};

const COOLDOWN = 10 * 60;
const ALWAYS = new Set(["missedCrit", "lost", "served", "lineAtDesk"]);
const QUIET = new Set(["arrive", "leave", "toBar", "critStart", "critEnd", "friendChat", "profSkip", "profLater", "profWait", "leaveParty", "satDown", "windDown"]);
const T0 = 13.5 * 3600; // clock seconds at t = 0, as in sim.js
const clockOf = (t) => { const s = T0 + Math.max(0, t); return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`; };

// ---- nuance within an archetype: each person phrases things their own way
// A short second sentence that only this person, at this hour, would add. `not` keeps it off remarks already about that
// topic; `only` keeps it to the topics where it makes sense.
const TAILS = [
  { t: "Sheet due Monday.", when: (p) => p.deadline > 0.5 },
  { t: "Pin-up is Monday, so none of this helps.", when: (p) => p.deadline > 0.5, not: ["crits"] },
  { t: "Deadline week; everything takes longer.", when: (p) => p.deadline > 0.5 },
  { t: "Second week on this floor.", when: (p) => p.traits.familiarity < 0.3 },
  { t: "Still can't tell the two stairs apart.", when: (p) => p.traits.familiarity < 0.3, not: ["wayfinding"] },
  { t: "New here; everyone else seems to know where things are.", when: (p) => p.traits.familiarity < 0.3 },
  { t: "I know this floor by heart and it still gets me.", when: (p) => p.traits.familiarity > 0.75 },
  { t: "Same as every Friday.", when: (p) => p.traits.familiarity > 0.6 },
  { t: "The kitchen is {dk} m away on top of that.", when: (p) => p.dKitchen > 30, not: ["kitchen"] },
  { t: "At least the light is good at my desk.", when: (p, a, h) => p.glass && h < 16, not: ["light"] },
  { t: "And the sun is in the screen again.", when: (p, a, h) => p.glass && p.glass.side === "west" && h >= 16, not: ["light"] },
  { t: "Not my best Friday.", when: (p, a) => a.mood < 0.35 },
  { t: "Still a good day, somehow.", when: (p, a) => a.mood > 0.75 },
  { t: "The row is loud today.", when: (p) => p.traits.noise > 0.65, not: ["bar"] },
  { t: "Headphones back on.", when: (p) => p.traits.noise > 0.65, not: ["bar", "food line"] },
  { t: "Too many people in one place for me.", when: (p) => p.traits.crowd > 0.65, only: ["kitchen", "aisles", "food line", "bar", "printers"] },
  { t: "No patience left for it.", when: (p) => p.traits.patience < 0.3, not: ["day"] },
  { t: "Fine. I'll wait.", when: (p) => p.traits.patience > 0.75, only: ["kitchen", "printers", "food line", "crits"] },
  { t: "Nearly six.", when: (p, a, h) => h >= 17.5 && h < 18.5 },
  { t: "Early yet.", when: (p, a, h) => h < 14.5 },
  { t: "Late in the day for this.", when: (p, a, h) => h >= 17 && h < 18.5, not: ["bar", "food line"] },
  { t: "{walked} m walked already.", when: (p, a) => a.walked > 600, not: ["day"] },
  { t: "Third coffee.", when: (p, a, h) => h > 16 && p.usesKitchen, not: ["kitchen"] },
  { t: "Year {year} and it hasn't changed.", when: (p) => p.year >= 2 },
  { t: "First year; I assumed this was normal.", when: (p) => p.year === 1 },
  { t: "Section {sec} gets the worst of it.", when: (p) => p.section != null, only: ["aisles", "food line", "crits", "printers"] },
  { t: "I'll put it in the exit survey nobody reads.", when: (p) => p.traits.curiosity > 0.6, not: ["day"] },
  { t: "Someone measured this and signed it off.", when: (p) => p.traits.curiosity > 0.7, not: ["day", "crits"] },
];
// a signature each person falls back on now and then, chosen once from their id
const TICS = ["Anyway.", "Classic.", "Noted.", "Fine.", "So it goes.", "Every week.", "Someone drew this.", "Moving on.", "Honestly.", "Right.", "As usual.", "Not complaining, observing.", "Could be worse.", "Could be wider."];
const hashOf = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function voiceOf(person, agent) {
  if (agent.voice) return agent.voice;
  const r = mulberry32(hashOf(String(person.id) + "|" + (person.name || "")));
  const tr = person.traits || {};
  const so = tr.sociability == null ? 0.5 : tr.sociability;
  const v = {
    trim: Math.max(0, 0.6 - so * 0.8),          // the quiet ones keep the first sentence and drop the rest
    tailP: 0.2 + 0.5 * so,                        // the chatty ones add a second thought of their own
    tic: r() < 0.6 ? pick(r, TICS) : null, ticP: 0.18,
  };
  agent.voice = v; return v;
}
// the last few of each kind, floor-wide, so the feed does not read the same line twice in a row
const RECENT = {}; const RECENT_N = 10; let lastTail = "";
const recent = (k) => RECENT[k] || (RECENT[k] = []);
const remember = (k, text) => { const r = recent(k); r.push(text); if (r.length > RECENT_N) r.shift(); };

export function remarkFor(person, agent, ev, rng, t) {
  const pool = T[ev.kind]; if (!pool) return null;
  if (!ALWAYS.has(ev.kind) && t - agent.lastRemarkT < COOLDOWN) return null;
  const tr = person.traits || {}; const so = tr.sociability == null ? 0.5 : tr.sociability;
  const talk = 0.35 + 0.5 * so;
  if (QUIET.has(ev.kind) && rng() > talk * 0.35) return null;
  if (!ALWAYS.has(ev.kind) && !QUIET.has(ev.kind) && rng() > talk) return null;
  if (ev.kind === "served" && ev.wait < 8 && rng() > talk * 0.5) return null; // a short wait is not worth a line from everyone
  const v = voiceOf(person, agent);
  const voice = VOICE[person.style] && VOICE[person.style][ev.kind];
  const src = ev.again && AGAIN[ev.kind] && rng() < 0.6 ? AGAIN[ev.kind] : (voice && rng() < 0.4 ? voice : pool);
  const said = agent.saidTexts || (agent.saidTexts = new Set());
  const rec = recent(ev.kind);
  let text = pick(rng, src);
  for (let k = 0; k < 10 && (rec.includes(text) || said.has(text)) && src.length > 1; k++) text = pick(rng, src);
  remember(ev.kind, text); said.add(text);
  // the person's own shape: the terse keep one sentence; the talkative add a thought of their own, or their signature
  if (rng() < v.trim) { const m = text.match(/^(.{18,}?[.!?])\s+\S/); if (m) text = m[1]; }
  const h = (T0 + t) / 3600; const topic = TOPIC_OF[ev.kind] || "day";
  if (rng() < v.tailP) {
    const ok = TAILS.filter((x) => (!x.not || !x.not.includes(topic)) && (!x.only || x.only.includes(topic)) && x.when(person, agent, h));
    if (ok.length) { let tail = pick(rng, ok).t; for (let k = 0; k < 4 && tail === lastTail && ok.length > 1; k++) tail = pick(rng, ok).t; lastTail = tail; text += " " + tail; }
  } else if (v.tic && rng() < v.ticP) text += " " + v.tic;
  const fill = { clock: clockOf(t), dk: Math.round(person.dKitchen || 0), walked: Math.round((agent.walked || 0) / 50) * 50, year: person.year, sec: person.section };
  text = text.replace(/\{(\w+)\}/g, (_, k) => (ev[k] != null ? ev[k] : fill[k] != null ? fill[k] : k === "student" ? "the student" : k === "friend" ? "a friend" : ""));
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
