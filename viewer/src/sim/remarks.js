// Remarks in the agent's voice at decision points, template-based (the V1 pattern), each with a
// "because" line carrying the computed fact that triggered it. Since 2026-11-08 the voice follows
// the agent's traits (owner: the heterogeneity must be heard in the feed): every agent has a
// register drawn from the Big Five z-scores it was sampled with (terse or chatty from E, anxious
// or calm from N, warm or blunt from A, precise or loose from C, vivid from O), the year adds a
// flavour, instructors speak as instructors. A register picks from its own lines when it has
// them, otherwise it colours the plain line with an opener or a tail. A cooldown per agent keeps
// the feed readable; sociable agents talk more, terse ones less. Nothing here is a result: it is
// how the engine explains what it did, so a suggestion can be traced to what people were doing.
import { Rng } from './rng.js';
import { hhmm } from './calendar.js';

// ------------------------------------------------------------------ the plain lines
const T = {
  arrive: ['Desk. Headphones. {hours} hours to go.', 'In. The floor is {n} people deep already.', 'Same floor, same light, same walk to the kitchen.'],
  arrive_late: ['Late start. Everyone else got the good chairs.', 'Afternoon arrival; the plotters will be busy by the time I need them.'],
  leave: ['Done enough. The long walk to the stairs.', 'Leaving; {n} still at their desks.', 'Out. The floor empties the same way it fills.'],
  leave_late: ['{hours} hours. The lift is faster than my legs now.', 'Last ones out again. The night bus is at {clock}.'],
  friday_plans: ['Crit done. It is Friday and I have plans; out by {clock}.', 'Notes taken, Friday saved. Leaving at {clock}.', 'The crit is over and so is my week. {clock}.'],
  crit_start: ['Crit. The aisle is now a classroom.', 'Here we go. Everyone in the row gets to listen.', 'Crit at the shared table; at least the neighbours are spared.'],
  crit_end: ['Good crit. Three things to fix, all fair.', 'That helped. Also everyone in the row heard it.', 'Noted. All of it. The person next to me took notes too.'],
  crit_wait: ['Number {pos} on the sheet. {wait} minutes to kill, and nowhere quiet to do it.', 'Waiting for the prof. Signed up at {signed}, still {pos} ahead of me.'],
  plot_queue: ['{n} of us at two plotters and the sheet is due. Same hour as everyone.', 'Queue at the plotter again. Everyone prints at the same hour because everyone pins up at the same hour.'],
  paper_out: ['Paper’s out and the tech left at four. Printing tomorrow, then.', 'Both plotters, no paper, nobody with the key. Fifteen minutes gone.'],
  print_early: ['Printing today. The plotter will be dead on Monday and everyone knows it.', 'Sheets out early. The queue the night before is where good drawings go to die.', 'Printed with days to spare. Now I can change my mind about the section.'],
  plot_done: ['Printed. {wait} minutes in the line for {sheets} sheets.', 'Sheets in hand. The corner was a crowd for {wait} minutes.'],
  headphones_on: ['Headphones on. {n} conversations within three metres.', 'The aisle is loud. Headphones.'],
  interrupted: ['Lost the thread. Third time this hour.', 'A question from the next desk. Fair, but the render is forgotten.'],
  encounter_between: ['A {year} year asked about the plotter settings while the kettle boiled. Told them.', 'Talked to a {year} year at the printers. Easier than finding the TA.'],
  encounter: ['Solved nothing, felt better. The desks are close enough for that at least.', 'A good chat is one aisle away. That’s the one thing this layout gets right.'],
  kitchen_crowded: ['{n} people, two counters. Nobody drew lunch on this plan.', 'The kitchen is a corridor with a fridge, and {n} of us are in it.'],
  washroom_trip: ['Washroom means another floor. {m} metres and a flight of stairs.', 'Down a floor for the washroom; back in {min} minutes.'],
  lift_wait: ['{wait} seconds for the lift. The stairs would have been faster.', 'Waiting for the lift with {n} others. We all pressed the button.'],
  event_join: ['Good Times. Free food, a keg, and the second years are actually talking to the first years.', 'Good Times. The lounge is the one room on this floor that works at seven.'],
  waffle_join: ['Waffles. The one morning the lounge is full before ten.', 'Waffle Wednesday. Ten minutes, a plate, and half the first years I had not met.'],
  pinup: ['Boards into the aisle, chairs around. The aisle is a room now.', 'Pin-up. Standing room only between the bays.'],
  lecture_off: ['Off to the other building for the lecture. {min} minutes each way.', 'Lecture across campus. The desk stays warm.'],
  lecture: ['Lecture in room {room}. Forty-five minutes, then back up.', 'Down to room {room} with the whole year. The lift will not take us all.'],
  intro: ['Round the side table for the briefing. Fifteen minutes standing, then the sheet goes up.', 'Section huddle. Same announcements as the email, but we all came.', 'Intro at the table: the week’s plan, the review date, who prints when.'],
  seminar: ['Seminar in the crit room. Someone’s review is set up in the corner.', 'History seminar at the crit tables; the projector is for us this time.'],
  print3d_collect: ['Print was done at {done}; nobody told me. {wait} minutes on the shelf.', 'Collected the print. Someone had moved it aside; the shelf is full again.'],
  shop: ['Basement shop. Supervised hours only, so now or never.', 'Down to the shop with the model. The lift was quicker with the box.'],
  desk_move: ['Rolled the {what} over to {where}. Nobody asked; nobody minded.', 'Moved the {what}: {where}. Took two of us and a minute.'],
  move_veto: ['They wanted to move the {what} next to my desk. No.', 'Said no to the {what} coming here. I sit here all day.'],
  office_visit: ['Up to the prof’s office. Fifteen minutes and a straight answer.', 'Office hours. Quieter than asking in the crit.'],
  crit_spot: ['The prof has set up at the side table. We go to them this time.'],
  break: ['Window. Five minutes of campus instead of a screen.', 'Kettle, then back. The kitchen is the only reason to stand up.'],
};

// ------------------------------------------------------------------ the registers
// each has lines of its own for the common kinds, plus openers and tails that colour a plain line
const R = {
  terse: {
    lines: { arrive: ['In.', 'Desk.'], leave: ['Out.', 'Done.'], break: ['Kettle.', 'Air.'], interrupted: ['Lost it.', 'Again.'], headphones_on: ['Headphones.'], plot_queue: ['{n} in the line.'], washroom_trip: ['Other floor.'], crit_start: ['Crit.'], crit_end: ['Fine. Three fixes.'], encounter: ['Talked. Back.'], encounter_between: ['A {year} year. Plotter question.'], lift_wait: ['{wait} s. Stairs next time.'], kitchen_crowded: ['{n} in the kitchen.'], leave_late: ['{hours} hours. Out.'], arrive_late: ['Afternoon.'], plot_done: ['Printed.'], lecture: ['Room {room}.'] },
    rate: 0.6,
  },
  chatty: {
    openers: ['Okay so.', 'Right,', 'Honestly,', 'Listen,'], tails: ['Anyone else?', 'Told half the row already.', 'Ask me about it later!'],
    lines: { arrive: ['Morning, floor! {n} of you already. Who wants coffee?', 'In! Who else is here? {hours} hours, let’s go.'], break: ['Break. Going to find out what everyone is working on.', 'Kettle run; taking orders.'], encounter: ['Talked for ages. Worth it. The aisle is the best room on this floor.', 'Ran into half the section at the printers. Best twenty minutes of the day.'], encounter_between: ['Finally met a {year} year properly. Why does that only happen at the kettle?'], interrupted: ['Someone asked me something, so of course we talked for ten minutes.'], leave: ['Leaving! {n} of you still here, be good.'], plot_queue: ['{n} of us in the plotter line. Good. Nobody has a quiet word otherwise.'], event_join: ['Good Times! This is the only hour the years actually mix.'] },
    rate: 1.3,
  },
  anxious: {
    openers: ['Ugh.', 'Oh no.', 'I knew it.'], tails: ['Not ideal.', 'I should have come earlier.', 'This is going to cost me tonight.', 'Behind already.'],
    lines: { arrive: ['In. Everyone looks further along than me.', '{hours} hours. Not enough. Never enough.'], plot_queue: ['{n} people ahead of me and the sheet is due. Of course.'], paper_out: ['No paper. No tech. The review is tomorrow. Breathing.'], interrupted: ['Lost the thread again. I can’t afford to lose the thread.'], crit_wait: ['{wait} minutes waiting for the prof and I can’t work while I wait.'], crit_start: ['Crit. Everyone in the row will hear what’s wrong with it.'], crit_end: ['Three things to fix. Three. Before Friday.'], headphones_on: ['Headphones on. Too loud to think, and I need to think.'], leave_late: ['{hours} hours and it is still not right.'], washroom_trip: ['Another floor for the washroom. Ten minutes I don’t have.'] },
    rate: 1.0,
  },
  calm: {
    tails: ['Fine.', 'It is what it is.', 'No rush.'],
    lines: { arrive: ['In. {hours} hours, same as any day.'], interrupted: ['A question. Answered it. Back to it.'], plot_queue: ['{n} in the line. It moves.'], paper_out: ['No paper. Tomorrow, then.'], crit_end: ['Fair points. Will fix them.'], leave_late: ['{hours} hours. Enough.'] },
    rate: 0.9,
  },
  warm: {
    tails: ['Fair enough.', 'They were nice about it.', 'No harm done.', 'Happy to help.'],
    lines: { interrupted: ['A question from the next desk. Glad they asked.'], encounter_between: ['A {year} year needed the plotter settings. Walked them through it.'], move_veto: ['They want the {what} by my desk. I’d rather not, but let’s talk.'], crit_end: ['Good crit. Kind, and right.'], encounter: ['A chat with the neighbour. We both needed it.'] },
    rate: 1.0,
  },
  blunt: {
    tails: ['Whatever.', 'Not my problem.', 'Pointless.', 'Who designed this.'],
    lines: { interrupted: ['Someone talking at me. I did not ask.'], headphones_on: ['Headphones. Stop talking.'], kitchen_crowded: ['{n} in a kitchen built for two. Genius.'], washroom_trip: ['No washroom on the studio floor. Who signed that off.'], move_veto: ['No. The {what} stays where it is.'], crit_end: ['Crit over. Half of it I knew.'], plot_queue: ['{n} in the line. Two plotters for 165 people.'] },
    rate: 1.0,
  },
  precise: {
    tails: ['Back at the desk by {next}.', 'That’s {mins} minutes gone.', 'Logging it.'],
    lines: { arrive: ['{clock}. Desk. {hours} hours planned; the list is on the screen.'], break: ['Break, {mins} minutes, then the section drawings.'], plot_done: ['{sheets} sheets, {wait} minutes in the line. Budgeted ten.'], crit_wait: ['Slot was {signed}; it is {clock}. {wait} minutes late.'], lift_wait: ['{wait} seconds for the lift. The stairs take forty.'], leave: ['{clock}. Done for today; tomorrow’s list is written.'] },
    rate: 1.0,
  },
  loose: {
    lower: true, tails: ['eh', 'later maybe', 'we’ll see'],
    lines: { arrive: ['here. kind of. coffee first'], break: ['wandering. will come back'], plot_queue: ['{n} in the plotter line, might just print tomorrow'], interrupted: ['someone talked to me, fine, the render can wait'], leave: ['done. ish.'], crit_end: ['crit done. notes somewhere'] },
    rate: 0.9,
  },
  vivid: {
    tails: ['The north light is good at this hour, though.', 'This floor hums at four.', 'The aisle looks like a street from up here.', 'Someone pinned a plan upside down and it works better.'],
    lines: { break: ['Walking the boards. Someone’s section cut is better than mine and I want to know why.'], encounter: ['A chat about a drawing that wasn’t mine. Came back with an idea.'], event_join: ['Good Times. The lounge becomes a different room when it is full.'], arrive: ['In. The floor smells of cut card and coffee; {n} people and a hum.'] },
    rate: 1.0,
  },
};
// instructors have their own lines for the kinds they emit
const I = {
  arrive: ['In for the session. Sheet on the board, pen in hand.', 'Here. The sign-up sheet is already full.'],
  intro: ['{n} of them round the table. The plan for the week, then the sheet.', 'Briefing first. Fifteen minutes, everyone standing, then desks.'],
  leave: ['Last crit done. Out before the floor turns into night.', 'Leaving them to it.'],
  crit_end: ['Next on the sheet.', 'Good conversation. Now the next desk.'],
  lift_wait: ['{wait} seconds for the lift. The stairs, then.'],
  washroom_trip: ['Up to the fourth floor.'],
  office_visit: ['A student at the door. Fifteen minutes well spent.'],
  crit_spot: ['Set up at the side table; the students come to me. The bay is too loud for a crit.', 'Table by the bay, sheet on it. Next.'],
  desk_move: ['Pulled a table over so the students come to me. The bay was too loud.'],
};
const YEAR_TAILS = { 1: ['Still learning where everything is.', 'Is it always like this?', 'The third years make it look easy.'], 2: ['Second time through this.', 'Last year’s section would have laughed.'], 3: ['Third year of this floor.', 'Same as last term, louder.', 'Ten months to go.'] };
const NEWCOMER = ['New here. Nobody told me about the plotters.', 'Still finding the kitchen.'];
const EVENING_LATE = ['Mornings are for other people.', 'My day starts when the light goes.'];

const QUIET = new Set(['arrive', 'leave', 'break', 'crit_start', 'crit_end', 'encounter', 'seminar', 'shop', 'lecture']);
const ALWAYS = new Set(['paper_out', 'print3d_collect', 'desk_move', 'move_veto', 'pinup', 'office_visit', 'crit_spot']);

/** The registers an agent speaks in, strongest trait first, and a label for the inspector and the feed. */
export function voiceOf(a) {
  const t = a.traits || { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const cand = [];
  if (t.E > 0.7) cand.push(['chatty', t.E]); else if (t.E < -0.7) cand.push(['terse', -t.E]);
  if (t.N > 0.7) cand.push(['anxious', t.N]); else if (t.N < -0.7) cand.push(['calm', -t.N]);
  if (t.A > 0.7) cand.push(['warm', t.A]); else if (t.A < -0.7) cand.push(['blunt', -t.A]);
  if (t.C > 0.7) cand.push(['precise', t.C]); else if (t.C < -0.7) cand.push(['loose', -t.C]);
  if (t.O > 0.7) cand.push(['vivid', t.O]);
  cand.sort((p, q) => q[1] - p[1]);
  const regs = cand.map((c) => c[0]).slice(0, 3);
  return { regs, primary: regs[0] || 'plain', label: regs.length ? regs.join(' · ') : 'even', rate: regs.reduce((r, k) => r * (R[k].rate || 1), 1) };
}

export class Remarks {
  constructor(P, seed) { this.P = P; this.seed = seed; this.last = new Map(); this.cooldown = 10 * 60; this.voices = new Map(); }
  voice(a) { let v = this.voices.get(a.id); if (!v) { v = voiceOf(a); this.voices.set(a.id, v); } return v; }
  /** A remark for an agent at an event, or null (cooldown, quietness). `ev.because` carries the fact. */
  remark(agent, ev, t) {
    const pool = T[ev.kind]; if (!pool) return null;
    const last = this.last.get(agent.id) ?? -Infinity;
    if (!ALWAYS.has(ev.kind) && t - last < this.cooldown) return null;
    const rng = new Rng(this.seed, agent.id, Math.floor(t), ev.kind);
    const v = this.voice(agent);
    const talk = (0.35 + 0.4 * Math.min(1.5, agent.sociability || 1)) * v.rate;
    if (QUIET.has(ev.kind) && !rng.chance(talk * 0.3)) return null;
    if (!QUIET.has(ev.kind) && !ALWAYS.has(ev.kind) && !rng.chance(Math.min(0.95, talk))) return null;
    const data = Object.assign({ clock: hhmm(t), next: hhmm(t + 20 * 60), mins: 5 + Math.floor(rng.next() * 10) }, ev.data || {});
    const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : ''));
    let text;
    if (agent.role === 'instructor' && I[ev.kind]) text = fill(rng.pick(I[ev.kind]));
    else {
      // the primary register's own line when it has one (70%), else the plain line coloured by the registers
      const own = R[v.primary]?.lines?.[ev.kind];
      if (own && rng.chance(0.7)) text = fill(rng.pick(own));
      else {
        text = fill(rng.pick(pool));
        // one colouring at most: an opener or a tail from the strongest register that offers one
        // (after a comma opener the line continues in lower case, walkthrough 2026-11-12, stop 8)
        for (const k of v.regs) { const reg = R[k]; if (reg.openers && rng.chance(0.3)) { const op = rng.pick(reg.openers); const lower = op.endsWith(',') && /^[A-Z](?=[a-z ])/.test(text) && !/^I\b/.test(text); text = `${op} ${lower ? text[0].toLowerCase() + text.slice(1) : text}`; break; } if (reg.tails && rng.chance(0.35)) { text = `${text} ${fill(rng.pick(reg.tails))}`; break; } }
      }
      if (agent.role === 'student') {
        if (agent.newcomer && rng.chance(0.15)) text += ' ' + rng.pick(NEWCOMER);
        else if (YEAR_TAILS[agent.year] && rng.chance(0.07)) text += ' ' + rng.pick(YEAR_TAILS[agent.year]);
        if (ev.kind === 'arrive_late' && agent.chronotype === 'evening' && rng.chance(0.4)) text += ' ' + rng.pick(EVENING_LATE);
      }
      if (v.regs.includes('loose')) text = text.toLowerCase().replace(/\.\s*$/, '');
      if (v.primary === 'terse') text = text.split(/(?<=\.)\s/)[0];
    }
    this.last.set(agent.id, t);
    return { text, because: ev.because || '', voice: v.label };
  }
}
