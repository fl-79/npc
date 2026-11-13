// Probe (2026-11-13): the OTHER reading's request and reply, with the network replaced by a fake, so no key is used and
// nothing leaves the machine. Checks that the schema sent carries no limits the API refuses (minimum, maximum, maxItems),
// that a reply out of range is clamped, and that a refused key gives a readable message. From viewer/: node test/_interpret.mjs
const store = new Map([['npc.claudeKey', 'placeholder-not-a-key']]);
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
let sent = null, reply = null;
globalThis.fetch = async (url, init) => {
  sent = { url: String(url), body: JSON.parse(init.body), headers: Object.fromEntries(new Headers(init.headers)) };
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
};
const { interpretSituation } = await import('../src/ui/interpret.js');
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++; };

// 1. a reply out of range on every field
const wild = { title: 'A snow day', summary: 'Buses stop early.', read: 'not-a-listed-one', untested: true,
  changes: { extra_students: 999, present_share: 3, arrive_shift_h: -20, leave_shift_h: 20, lift_out: 'yes', paper_out_at: '25:99', shop_closed: true,
    add_items: [{ kind: 'lecture', at: '9:30', minutes: 2000, share: 4, years: [1, 5, 2, 2] }, { kind: 'party', at: '12:00', minutes: 30, share: 1, years: [3] },
      ...Array.from({ length: 8 }, () => ({ kind: 'seminar', at: '14:00', minutes: 60, share: 0.5, years: [] }))] } };
reply = { status: 200, body: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify(wild) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 900, output_tokens: 200 } } };
const spec = await interpretSituation('Snow; buses stop at 15:00.', { date: '2026-11-03' });
const s = JSON.stringify(sent.body.output_config.format.schema);
check(sent.url.endsWith('/v1/messages'), 'the request goes to /v1/messages');
check(sent.body.model === 'claude-opus-5-5' && sent.body.output_config.effort === 'low' && sent.body.output_config.format.type === 'json_schema', 'model, effort and a json_schema format');
check(!/"minimum"|"maximum"|"maxItems"|"minItems"/.test(s), 'no number or array limits in the schema sent');
check(/"enum":\["review"/.test(s) && /"enum":\["lecture"/.test(s), 'the listed situations and activity kinds are still enforced enums');
check(/\(minimum 0, maximum 200\)/.test(s), 'the limits written into the description for the model');
check(sent.headers['anthropic-dangerous-direct-browser-access'] === 'true', 'the browser header for a user\'s own key');
const c = spec.changes;
check(spec.read === null, `an unknown situation reads as none (${spec.read})`);
check(c.extra_students === 200 && c.present_share === 1.5 && c.arrive_shift_h === -6 && c.leave_shift_h === 8, `numbers clamped (${c.extra_students}, ${c.present_share}, ${c.arrive_shift_h}, ${c.leave_shift_h})`);
check(c.lift_out === true && c.paper_out_at === null && c.shop_closed === true, 'flags kept, a bad time dropped');
check(c.add_items.length === 6 && c.add_items[0].at === '09:30' && c.add_items[0].minutes === 600 && c.add_items[0].share === 1 && JSON.stringify(c.add_items[0].years) === '[1,2]', `items cut to 6 and clamped (${c.add_items.length}, ${JSON.stringify(c.add_items[0])})`);
check(!c.add_items.some((it) => it.kind === 'party') && JSON.stringify(c.add_items[1].years) === '[1,2,3]', 'an unknown kind dropped, empty years mean all');
check(spec.source && spec.source.usage && spec.source.usage.input === 900, 'usage recorded');

// 2. a refused key
reply = { status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } };
let msg = ''; try { await interpretSituation('x', {}); } catch (e) { msg = e.message; }
check(/key was not accepted/.test(msg), `a refused key: "${msg}"`);

// 3. a refusal
reply = { status: 200, body: { id: 'msg_test2', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: 'refusal', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } };
msg = ''; try { await interpretSituation('x', {}); } catch (e) { msg = e.message; }
check(/declined/.test(msg), `a refusal: "${msg}"`);

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
