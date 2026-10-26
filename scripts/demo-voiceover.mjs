// Records the walkthrough timed to the voice-over (Downloads/New Recording 2.m4a), in real time: every step waits for
// its second in the video. The recording is cut after "right-hand panel" (57.9 s) and a GAP of silence is put in, so
// the whole afternoon plays out close up before the voice comes back; voice times after the cut are shifted by GAP,
// which is measured from the playback (headless playback runs a little slower than the clock).
// Needs the dev server on http://localhost:5174 and the installed Chrome. Writes outputs/demo/studio-day-voiceover.webm
// and studio-day-voiceover.timing.json (where the video's 0 sits in the webm, the cut, the gap) for the mux:
//   node tool/scripts/demo-voiceover.mjs
import { chromium } from "playwright-core";
import { mkdirSync, renameSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const CUT = 57.9; let GAP = 30; // GAP is set once the day has played out
const v = (a) => (a < CUT ? a : a + GAP); // voice time -> video time

const outDir = resolve(process.cwd(), "..", "outputs", "demo"); mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outDir, size: { width: 1440, height: 900 } }, deviceScaleFactor: 1 });
const page = await context.newPage(); const pageAt = Date.now();
let T0 = 0;
const atV = async (t) => { const ms = T0 + t * 1000 - Date.now(); if (ms > 0) await page.waitForTimeout(ms); }; // video time, for the pause
const at = async (a) => { const ms = T0 + v(a) * 1000 - Date.now(); if (ms > 0) await page.waitForTimeout(ms); else if (ms < -400) console.log(`late at ${a}s by ${(-ms / 1000).toFixed(2)}s`); };
const st = (fn, arg) => page.evaluate(fn, arg);

// the guide: a pixel box with a label that slides to the element being shown
const guide = async (selector, label) => page.evaluate(([selector, label]) => {
  let g = document.querySelector("#demo-guide");
  if (!g) { g = document.createElement("div"); g.id = "demo-guide"; g.innerHTML = `<i></i><b></b>`; document.body.appendChild(g);
    const css = document.createElement("style"); css.textContent = `#demo-guide{position:fixed;z-index:9999;pointer-events:none;border:3px solid #c9553f;box-shadow:0 0 0 3px #fff8e8,0 0 0 6px #c9553f,4px 4px 0 6px rgba(43,32,22,.35);transition:left .45s ease,top .45s ease,width .45s ease,height .45s ease,opacity .3s;opacity:0}#demo-guide b{position:absolute;left:-3px;top:-34px;background:#c9553f;color:#fff8e8;font:12px "Silkscreen",monospace;padding:5px 9px;border:3px solid #fff8e8;white-space:nowrap}#demo-guide.low b{top:auto;bottom:-34px}`; document.head.appendChild(css); }
  const el = selector ? document.querySelector(selector) : null;
  if (!el) { g.style.opacity = "0"; return; }
  const r = el.getBoundingClientRect(); const pad = 6;
  g.style.left = (r.left - pad) + "px"; g.style.top = (r.top - pad) + "px"; g.style.width = (r.width + 2 * pad - 6) + "px"; g.style.height = (r.height + 2 * pad - 6) + "px"; g.style.opacity = "1";
  g.classList.toggle("low", r.top < 50); g.querySelector("b").textContent = label || "";
}, [selector, label]);
const scrubTo = (t) => st((t) => { const s = document.querySelector("#scrub"); s.value = t; s.dispatchEvent(new Event("input", { bubbles: true })); }, t);
const openStep = async (re, label) => { // close any open step, open the one whose title matches, and show its number on the plan
  await st(() => document.querySelectorAll("#summary .step-line.open").forEach((e) => e.click()));
  const line = page.locator("#summary .step-line", { hasText: re }).first(); if (!(await line.count())) { console.log("no step for", re); return; }
  await line.scrollIntoViewIfNeeded(); await line.click(); await page.waitForTimeout(150);
  const n = Number(await line.getAttribute("data-n"));
  await st((n) => { const s = window.__dbg.stage; const a = (s.annotations || []).find((x) => x.n === n); if (a) { s.follow = false; s.setZoom(2, s.W / 2, s.H / 2); s.centerOn(a.x, a.y); } }, n);
  await guide(`#summary .step-line[data-n="${n}"]`, label);
};

// the title screen opens the video
await page.goto("http://localhost:5174/?intro", { waitUntil: "load" });
await page.waitForFunction(() => window.__dbg && window.__dbg.stage && window.__dbg.stage.pixel && document.querySelector("#intro-skip"));
await page.waitForTimeout(400); T0 = Date.now();

// 0-10 · "This tool explores the potential of AI agents..." over the title
await at(9.6); await page.click("#intro-skip"); await page.waitForTimeout(200);
await st(() => { const s = window.__dbg.stage; s.setZoom(1, s.W / 2, s.H / 2); s.centerOn(17.5, -11); });

// 10-20 · the Lasserre third floor, any geometry later
await at(10.3); await guide("#stage", "Lasserre · level 3 studios, from the Revit model");
await at(15.8); await guide("#stage", "the goal: any geometry the user brings in");

// 21-35 · the inputs: use, goals, special cases, deadline pressure
await at(21.3); await page.locator("#use").scrollIntoViewIfNeeded(); await guide("#use", "1 · a description of the use");
await at(25.5); await guide("#goals", "2 · the design goals");
await at(26.8); await page.locator("#conditions").scrollIntoViewIfNeeded(); await guide("#conditions", "3 · special cases on the day");
await at(29.6); await page.locator('#studio input[data-k="deadline"]').scrollIntoViewIfNeeded(); await guide('#studio label.studio-row', "deadline pressure: more traffic in the studios");
await at(30.6);
for (let i = 1; i <= 16; i++) { await st((val) => { const r = document.querySelector('#studio input[data-k="deadline"]'); r.value = val; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }, i * 5); await page.waitForTimeout(90); }
await guide('#studio label.studio-row', "deadline pressure: more traffic in the studios");

// 36-45 · the archetypes, one opened for its parameters
await at(36.1); await page.locator("#setup .card").first().scrollIntoViewIfNeeded(); await guide("#setup .card", "4 · archetypes generated from the input");
const toggleEdit = () => st(() => { const b = [...document.querySelectorAll("#setup .card button")].find((x) => /edit|close/i.test(x.textContent)); if (b) b.click(); });
await at(39.2); await toggleEdit(); await page.waitForTimeout(250); await guide("#setup .card", "access needs · familiarity · preferences");
await at(43.4); await toggleEdit(); await st(() => { document.querySelector("#setup").scrollTop = 0; });

// 44-58 · run, then play: follow one person close up, the comments as they happen, the summary on the right
await guide("#btn-run", "run the afternoon"); await page.waitForTimeout(300);
await page.click("#btn-run");
await page.waitForSelector("#progress:not(.hidden)", { timeout: 10000 }).catch(() => {}); await guide("#progress", "computing the whole day");
await page.waitForFunction(() => window.__dbg.sim && window.__dbg.sim.t >= 21600 && document.querySelector("#progress").classList.contains("hidden"), null, { timeout: 120000 });
await at(46.6); await scrubTo(0); await page.click("#btn-pick"); await page.waitForTimeout(150);
await st(() => { const s = window.__dbg.stage; s.setZoom(2, s.W / 2, s.H / 2); });
await page.click('[data-speed="600"]'); await page.click("#btn-play");
await guide("#stage", "playing the afternoon, 13:30 to 19:30, following one person");
await at(49.0); await guide("#thoughts", "comments from the agents as they happen");
await at(52.0); await guide("#summary", "summarized into design suggestions");
// the voice pauses here while the day plays out (video times)
for (const [t, sel, label] of [[57, "#stage", "the whole afternoon, close up · 10 min/s"], [62, "#thoughts", "what people say about the space"], [67, "#stage", "the whole afternoon, close up · 10 min/s"], [72, "#thoughts", "what people say about the space"]]) { await atV(t); await guide(sel, label); }
// 17:45 on: leave the follow and look at the bar as the evening starts
await page.waitForFunction(() => window.__dbg.sim.t >= 15900, null, { timeout: 60000 }).catch(() => {});
await st(() => { const s = window.__dbg.stage; s.follow = false; s.opts.followDim = false; s.setZoom(2, s.W / 2, s.H / 2); const b = window.__dbg.plan.bar; s.centerOn(b.center[0], b.center[1] - 2); });
await guide("#stage", "the evening: the food line and Good Times");
await page.waitForFunction(() => window.__dbg.sim.t >= 21540, null, { timeout: 60000 }).catch(() => {});
await st(() => { if (document.querySelector("#btn-play").textContent.trim() !== "▶") document.querySelector("#btn-play").click(); });
GAP = Math.max(GAP, (Date.now() - T0) / 1000 + 1.5 - CUT); console.log("day finished; voice resumes at", v(CUT).toFixed(2), "s, gap", GAP.toFixed(2));

// 59-66 · a new seed, and running again
await at(59.4); await st(() => { const s = window.__dbg.stage; s.setZoom(1, s.W / 2, s.H / 2); s.centerOn(17.5, -11); });
await guide("#seed", "the seed");
await at(61.6); await page.fill("#seed", ""); await page.type("#seed", "27", { delay: 120 });
await at(62.6); await guide("#btn-again", "run again: the agents remember the space");

// 69-79 · the feedback: kitchen, aisle width, glare at the window desks
await at(69.1); await st(() => { document.querySelector("#summary").scrollTop = 0; }); await guide("#summary", "the feedback");
await at(73.4); await openStep(/kitchen/i, "the location of the kitchen");
await at(74.7); await openStep(/cross aisle|aisle/i, "the aisle width");
await at(77.1); await openStep(/glaz|window|shade/i, "glare from the windows at the desks");

// 81-104 · what comes next, over the evening on the whole floor
await at(81.2); await st(() => document.querySelectorAll("#summary .step-line.open").forEach((e) => e.click()));
await st(() => { const s = window.__dbg.stage; s.follow = false; s.setZoom(1, s.W / 2, s.H / 2); s.centerOn(17.5, -11); });
await scrubTo(16200); await page.click('[data-speed="240"]'); await page.click("#btn-play");
await guide("#stage", "next: longer simulations");
await at(88.2); await guide("#stage", "next: how would the agents alter the space?");
await at(92.5); await guide("#stage", "next: how many parameters make unique experiences?");
await at(101.8); await guide(null);
await at(104.0); await page.click("#btn-play");

await context.close(); await browser.close();
const files = readdirSync(outDir).filter((f) => f.endsWith(".webm") && f !== "studio-day-demo.webm").map((f) => ({ f, t: statSync(join(outDir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
const offset = ((T0 - pageAt) / 1000).toFixed(2);
if (files.length) { const target = join(outDir, "studio-day-voiceover.webm"); try { renameSync(join(outDir, files[0].f), target); } catch {} console.log("video:", target, "offset:", offset); }
writeFileSync(join(outDir, "studio-day-voiceover.timing.json"), JSON.stringify({ offset: Number(offset), cut: CUT, gap: Number(GAP.toFixed(2)) }));
