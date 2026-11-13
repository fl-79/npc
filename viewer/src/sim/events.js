// The event stream: everything the run says happened, typed, timed and placed, with the agents
// involved. The log is this stream; the feed is the same stream rendered; a suggestion's trace
// points at event ids. Remarks are events of their own (kind 'remark') with a "because" line.
import { hhmm } from './calendar.js';

export class EventBus {
  constructor() { this.events = []; this.listeners = []; this.nextId = 1; }
  on(fn) { this.listeners.push(fn); }
  off(fn) { this.listeners = this.listeners.filter((f) => f !== fn); }
  emit(ev) {
    ev.id = this.nextId++;
    this.events.push(ev);
    for (const fn of this.listeners) fn(ev);
    return ev;
  }
  /** A line for the log or the feed. */
  static line(ev, names) {
    const who = (ev.agents || []).map((id) => names?.get(id) || `#${id}`).join(', ');
    return `${hhmm(ev.t)} ${ev.kind}${ev.place ? ' @' + ev.place : ''}${who ? ' [' + who + ']' : ''}${ev.text ? ' ' + ev.text : ''}`;
  }
}
