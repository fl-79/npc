// The FEED window: the agents' remarks as the run plays, the engine's events, and suggestions as
// their rules fire. Filters, pause, save. Items carry the event id so a trace can point back here.
import { hhmm } from '../sim/calendar.js';

const YEAR = { 1: '#2a9d6b', 2: '#3b5bdb', 3: '#e4473c', 0: '#5a4d44' };
const SHOW = new Set(['remark', 'crit_start', 'paper_out', 'paper_restock', 'plot_queue', 'arrive', 'leave', 'conversation', 'run_start', 'run_end', 'event_leave', 'suggestion', 'intro', 'desk_move', 'move_veto', 'crit_spot', 'office_visit']);

export class Feed {
  constructor(el, countEl) { this.el = el; this.countEl = countEl; this.items = []; this.filter = 'all'; this.paused = false; this.names = null; this.pop = null; this.pending = []; this.max = 400; }
  attach(run) {
    this.run = run; this.names = run.names; this.pop = run.pop; this.items = []; this.el.innerHTML = '';
    run.bus.on((ev) => { if (!SHOW.has(ev.kind)) return; if (ev.kind === 'arrive' || ev.kind === 'leave' || ev.kind === 'conversation') { if (ev.kind === 'conversation' && !ev.between) return; if ((ev.kind === 'arrive' || ev.kind === 'leave') && ev.id % 9 !== 0) return; } this.push(ev); });
  }
  kindOf(ev) { return ev.kind === 'remark' ? 'rm' : ev.kind === 'suggestion' ? 'sg' : 'ev'; }
  push(ev) {
    const it = { ev, kind: this.kindOf(ev), html: this.html(ev) };
    this.items.push(it); if (this.items.length > this.max) this.items.shift();
    if (this.quietOn) return;   // a jump in time: items kept, drawn once at the end
    if (this.paused) { this.pending.push(it); return; }
    this.append(it);
  }
  append(it) {
    if (this.filter !== 'all' && it.kind !== this.filter) return;
    const d = document.createElement('div'); d.innerHTML = it.html; const node = d.firstElementChild; this.el.appendChild(node);
    while (this.el.children.length > this.max) this.el.removeChild(this.el.firstChild);
    this.el.scrollTop = this.el.scrollHeight;
    if (this.countEl) this.countEl.textContent = String(this.items.length);
  }
  html(ev) {
    const a = ev.agents && ev.agents.length ? this.pop.agents[ev.agents[0] - 1] : null;
    if (ev.kind === 'remark') return `<div class="rm" data-ev="${ev.id}" data-agent="${a ? a.id : ''}"><div class="who"><span><i style="background:${YEAR[a ? (a.role === 'student' ? a.year : 0) : 0]}"></i><b class="name" data-agent="${a ? a.id : ''}">${a ? a.name : '?'}</b>${a ? (a.role === 'student' ? ' · YEAR ' + a.year : ' · ' + a.role) : ''}${ev.voice ? ' · <em class="voice">' + ev.voice + '</em>' : ''}</span><span>${hhmm(ev.t)} · ${(ev.place || '').toUpperCase()}</span></div>${ev.text}<div class="bc"><b>BECAUSE</b> ${ev.because || ''}</div></div>`;
    if (ev.kind === 'suggestion') return `<div class="rm sg" data-ev="${ev.id}"><div class="who"><span>SUGGESTION · ${ev.tag}</span><span>${hhmm(ev.t)} · rule fired</span></div>${ev.text}</div>`;
    const who = (ev.agents || []).map((id) => this.names.get(id)).filter(Boolean).join(', ');
    return `<div class="rm ev" data-ev="${ev.id}"><div class="who"><span>EVENT · ${ev.kind.replace(/_/g, ' ').toUpperCase()}</span><span>${hhmm(ev.t)}${ev.place ? ' · ' + ev.place.toUpperCase() : ''}</span></div>${ev.text || who}</div>`;
  }
  quiet(on) { this.quietOn = on; if (!on) { this.el.innerHTML = ''; for (const it of this.items) this.append(it); } }
  setFilter(f) { this.filter = f; this.el.innerHTML = ''; for (const it of this.items) this.append(it); }
  togglePause() { this.paused = !this.paused; if (!this.paused) { for (const it of this.pending) this.append(it); this.pending = []; } return this.paused; }
  highlight(evId) { const node = this.el.querySelector(`[data-ev="${evId}"]`); if (!node) return false; node.classList.add('hi'); node.scrollIntoView({ block: 'center' }); setTimeout(() => node.classList.remove('hi'), 2500); return true; }
  save() { const blob = new Blob([JSON.stringify(this.run.bus.events, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `npc-run-${this.run.date}-events.json`; a.click(); }
}
