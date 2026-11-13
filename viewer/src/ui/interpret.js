// INTERPRET for an "other" situation (owner, 2026-11-08): the description is read by Claude with the
// user's own key, stored in this browser only (localStorage) and billed to them; without a key the
// "other" option is greyed out and the user picks from the listed situations. The reading is a
// structured situation spec the engine applies on top of the calendar (engine.js applySpec): a
// known situation it maps to, if any, plus concrete changes (extra people, presence, arrival and
// leaving shifts, extra plan items, a resource out). Nothing is invented by the engine: what the
// reading says is shown to the user before the run, and recorded in the run's events.
import Anthropic from '@anthropic-ai/sdk';

export const KEY_NAME = 'npc.claudeKey';
export function getKey() { try { return localStorage.getItem(KEY_NAME) || ''; } catch { return ''; } }
/** The one saved example (program/other-example.json): the OTHER flow without a key, for a GitHub test run (owner 2026-11-12). */
export async function loadExample() { const r = await fetch('program/other-example.json', { cache: 'no-store' }); if (!r.ok) throw new Error('no example'); return r.json(); }
export function setKey(v) { try { if (v) localStorage.setItem(KEY_NAME, v); else localStorage.removeItem(KEY_NAME); } catch { /* storage blocked: the key lives for this page only */ } }

const KNOWN = ['review', 'pinup', 'lastcrit', 'good_times', 'waffle', 'deadline', 'clash', 'paper', 'lift', 'cohort', 'weekend'];
const ITEM_KINDS = ['lecture', 'seminar', 'review', 'pinup', 'event', 'plot', 'print_small', 'lunch_out', 'offsite', 'shop', 'studio_session'];

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'summary', 'read', 'untested', 'changes'],
  properties: {
    title: { type: 'string', description: 'three to six words naming the situation' },
    summary: { type: 'string', description: 'one or two sentences on what the engine will change, in plain words' },
    read: { anyOf: [{ type: 'string', enum: KNOWN }, { type: 'null' }], description: 'the listed situation this amounts to, or null' },
    untested: { type: 'boolean', description: 'true when the description goes beyond anything the engine models; the changes are then a best approximation' },
    changes: {
      type: 'object', additionalProperties: false,
      required: ['extra_students', 'present_share', 'arrive_shift_h', 'leave_shift_h', 'lift_out', 'paper_out_at', 'shop_closed', 'add_items'],
      properties: {
        extra_students: { type: 'integer', minimum: 0, maximum: 200, description: 'visitors or extra students on the floor for the day' },
        present_share: { type: 'number', minimum: 0, maximum: 1.5, description: '1 leaves presence as planned; below 1 keeps that share of the people who planned to come; above 1 brings in that share of the people who planned to stay away' },
        arrive_shift_h: { type: 'number', minimum: -6, maximum: 6 },
        leave_shift_h: { type: 'number', minimum: -8, maximum: 8 },
        lift_out: { type: 'boolean' },
        paper_out_at: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'HH:MM when the plotter paper runs out, or null' },
        shop_closed: { type: 'boolean' },
        add_items: {
          type: 'array', maxItems: 6,
          items: { type: 'object', additionalProperties: false, required: ['kind', 'at', 'minutes', 'share', 'years'],
            properties: { kind: { type: 'string', enum: ITEM_KINDS }, at: { type: 'string', description: 'HH:MM' }, minutes: { type: 'integer', minimum: 5, maximum: 600 }, share: { type: 'number', minimum: 0, maximum: 1, description: 'share of the students of those years who take part' }, years: { type: 'array', items: { type: 'integer', enum: [1, 2, 3] } } } },
        },
      },
    },
  },
};

const SYSTEM = `You read a one-paragraph description of a situation in an architecture school's studio building and turn it into the changes an occupant simulation should make to one day. The building: a studio floor (Level 3) with 172 desks for 165 M.Arch students in three years, two plotters, a kitchen and a lounge; crit rooms and classrooms on other floors; a lift and stairs. The simulation already models studio sessions (Tue/Fri 13:30-18:00 for years 2-3, Tue/Thu/Fri for year 1), desk crits, pin-ups and reviews, lectures and seminars, lunch, printing, the shop, Good Times on Fridays 18:00-21:00, Waffle Wednesday, deadlines, plotter paper running out, the lift out of service, fifteen extra students, and weekend days. If the description amounts to one of those listed situations, set "read" to it and keep the changes small. Otherwise set "read" to null and express the situation through the changes: extra people, the share present, arrival and leaving shifts, extra activities for a share of the students, a resource out. Set "untested" to true when the description involves things the simulation cannot represent (new rooms, weather, policies it has no switch for) and approximate anyway. Be literal and modest: do not add drama the description does not contain.`;

/** The schema as structured outputs take it (2026-11-13): enums kept, which the API enforces; number, string and array
 *  limits (minimum, maximum, maxItems...) removed, which it refuses, and written into the description for the model.
 *  sanitize() enforces them on the reply. (The SDK's own helper also drops enums, so it is not used.) */
const LIMITS = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems'];
function apiSchema(node) {
  if (Array.isArray(node)) return node.map(apiSchema);
  if (!node || typeof node !== 'object') return node;
  const out = {}, notes = [];
  for (const [k, v] of Object.entries(node)) { if (LIMITS.includes(k)) notes.push(`${k} ${v}`); else out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, apiSchema(pv)])) : apiSchema(v); }
  if (node.minItems > 1) { delete out.minItems; notes.push(`minItems ${node.minItems}`); }
  if (notes.length) out.description = `${out.description ? out.description + ' ' : ''}(${notes.join(', ')})`;
  return out;
}
const API_SCHEMA = apiSchema(SCHEMA);

/** The reply held to the schema's limits, which the API cannot enforce: numbers clamped, lists cut, unknown kinds dropped. */
export function sanitize(raw) {
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const hhmm = (v) => (typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v.trim()) ? v.trim().padStart(5, '0') : null);
  const c = (raw && raw.changes) || {};
  const items = (Array.isArray(c.add_items) ? c.add_items : []).map((it) => ({
    kind: it && it.kind, at: hhmm(it && it.at), minutes: Math.round(num(it && it.minutes, 5, 600, 60)), share: num(it && it.share, 0, 1, 1),
    years: (Array.isArray(it && it.years) ? it.years : []).map(Number).filter((y) => y === 1 || y === 2 || y === 3),
  })).filter((it) => ITEM_KINDS.includes(it.kind) && it.at).map((it) => ({ ...it, years: it.years.length ? [...new Set(it.years)] : [1, 2, 3] })).slice(0, 6);
  return {
    title: String((raw && raw.title) || 'A situation').slice(0, 80), summary: String((raw && raw.summary) || ''),
    read: KNOWN.includes(raw && raw.read) ? raw.read : null, untested: !!(raw && raw.untested),
    changes: {
      extra_students: Math.round(num(c.extra_students, 0, 200, 0)), present_share: num(c.present_share, 0, 1.5, 1),
      arrive_shift_h: num(c.arrive_shift_h, -6, 6, 0), leave_shift_h: num(c.leave_shift_h, -8, 8, 0),
      lift_out: !!c.lift_out, paper_out_at: hhmm(c.paper_out_at), shop_closed: !!c.shop_closed, add_items: items,
    },
  };
}

/** The reading: a situation spec, or throws with a readable message. */
export async function interpretSituation(text, context = {}) {
  const apiKey = getKey(); if (!apiKey) throw new Error('No key saved. Save your Claude API key first, or pick a listed situation.');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const user = `Day: ${context.date || 'a studio day'}${context.info ? ` (${context.info})` : ''}.\nDescription: ${text}`;
  let msg;
  try {
    msg = await client.messages.create({
      model: 'claude-opus-5-5', max_tokens: 1500,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: API_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('the key was not accepted. Check it, or clear it and save it again.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('this key may not use the model. Check the key\'s workspace.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('too many requests on this key just now. Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('no connection to the Claude API. Check the network.');
    if (e instanceof Anthropic.APIError) throw new Error(`the Claude API answered ${e.status}: ${e.message}`);
    throw e;
  }
  if (msg.stop_reason === 'refusal') throw new Error('The reading was declined. Pick a listed situation instead.');
  if (msg.stop_reason === 'max_tokens') throw new Error('The reading ran too long. Shorten the description and try again.');
  const block = msg.content.find((b) => b.type === 'text'); if (!block) throw new Error('No reading came back.');
  const raw = JSON.parse(block.text);
  const spec = sanitize(raw);
  spec.source = { model: msg.model, usage: msg.usage ? { input: msg.usage.input_tokens, output: msg.usage.output_tokens } : null };
  return spec;
}

/** One line for the message box and the situation pane. */
export function describeSpec(spec) {
  const c = spec.changes || {}, parts = [];
  if (spec.read) parts.push(`reads as "${spec.read.replace('_', ' ')}"`);
  if (c.extra_students) parts.push(`+${c.extra_students} people`);
  if (c.present_share != null && c.present_share !== 1) parts.push(`presence ×${c.present_share}`);
  if (c.arrive_shift_h) parts.push(`arrive ${c.arrive_shift_h > 0 ? '+' : ''}${c.arrive_shift_h} h`);
  if (c.leave_shift_h) parts.push(`leave ${c.leave_shift_h > 0 ? '+' : ''}${c.leave_shift_h} h`);
  if (c.lift_out) parts.push('lift out'); if (c.paper_out_at) parts.push(`paper out ${c.paper_out_at}`); if (c.shop_closed) parts.push('shop closed');
  for (const it of c.add_items || []) parts.push(`${it.kind.replace('_', ' ')} ${it.at} ${it.minutes} min for ${(it.share * 100).toFixed(0)}% of years ${it.years.join('/')}`);
  return `${spec.title}${spec.untested ? ' (untested)' : ''}: ${parts.join(' · ') || 'no change'}.`;
}
