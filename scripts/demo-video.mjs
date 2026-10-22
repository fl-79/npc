// Records a short walkthrough of the tool as a video, for a slide: the inputs, the people window, a run,
// the summary and its jump into the playback, the feed filter, and the Good Times evening. A guide box
// moves to whatever is touched next, with a short label.
// Needs the dev server on http://localhost:5174 and the installed Chrome. Writes outputs/demo/studio-day-demo.webm.
//   node tool/scripts/demo-video.mjs
// Then speed it up and cut the first second (the page loading) with the ffmpeg from the imageio-ffmpeg wheel:
//   ffmpeg -ss 1.35 -i outputs/demo/studio-day-demo.webm -vf setpts=PTS/1.35 -r 30 -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart outputs/demo/studio-day-demo.mp4
import { chromium } from "playwright-core";
import { mkdirSync, renameSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const outDir = resolve(process.cwd(), "..", "outputs", "demo"); mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outDir, size: { width: 1440, height: 900 } }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);
const typeSlowly = async (sel, text) => { await page.fill(sel, ""); await page.type(sel, text, { delay: 16 }); await page.dispatchEvent(sel, "input"); };

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

await page.goto("http://localhost:5174/", { waitUntil: "load" });
await page.waitForFunction(() => window.__dbg && window.__dbg.stage && window.__dbg.stage.pixel);
await page.evaluate(() => { const st = window.__dbg.stage; st.setZoom(1, st.W / 2, st.H / 2); st.centerOn(17.5, -11); });
await pause(1500);

// 1. the inputs: what is tested, the goals, the conditions note read into the sliders
await guide("#use", "1 · what is being tested"); await pause(1600);
await guide("#goals", "2 · the design goals"); await pause(1800);
await page.locator("#conditions").scrollIntoViewIfNeeded(); await pause(300);
await guide("#conditions", "3 · conditions on the day, read into the sliders");
await typeSlowly("#conditions", "Review week: pin-ups on Monday, so the floor is packed and loud, and a third of the students are new to the building.");
await guide("#studio", "3 · conditions on the day, read into the sliders"); await pause(1400);

// 2. the group: the archetype cards, one opened
const cards = page.locator("#setup .card");
await cards.first().scrollIntoViewIfNeeded(); await pause(300);
await guide("#setup .card", "4 · the group: archetypes, each editable");
const toggleEdit = () => page.evaluate(() => { const b = [...document.querySelectorAll("#setup .card button")].find((x) => /edit|close/i.test(x.textContent)); if (b) b.click(); });
await toggleEdit(); await pause(300); await guide("#setup .card", "4 · the group: archetypes, each editable"); await pause(1800); await toggleEdit();
await page.locator("#setup").evaluate((el) => { el.scrollTop = 0; }); await pause(300);

// 3. people: the window on the left
await guide("#btn-people", "everyone on the floor: find, follow, edit"); await pause(600);
await page.click("#btn-people"); await pause(300); await guide("#people", "everyone on the floor: find, follow, edit"); await pause(1800); await page.click("#btn-people"); await pause(300);

// 4. run the afternoon
await guide("#btn-run", "run the afternoon"); await pause(700);
await page.click("#btn-run");
await page.waitForSelector("#progress:not(.hidden)", { timeout: 10000 }).catch(() => {}); await pause(250); await guide("#progress", "computing the whole day");
await page.waitForFunction(() => window.__dbg.sim && window.__dbg.sim.t >= 21600 && document.querySelector("#progress").classList.contains("hidden"), null, { timeout: 120000 });
await pause(600);

// 5. the summary: goals and next steps; open the first step and jump to its moment on the plan
await page.locator("#summary").evaluate((el) => { el.scrollTop = 0; }); await pause(300);
await guide("#summary", "the summary: goals answered, next steps numbered on the plan"); await pause(2200);
const step1 = page.locator("#summary .step-line").first(); await step1.scrollIntoViewIfNeeded(); await step1.click(); await pause(400);
await guide("#summary .step", "a step: the evidence, what to do, a jump into the day"); await pause(2600);
const jump = page.locator("#summary .step button.jump").first(); if (await jump.count()) { await jump.click(); await guide("#stage", "the moment behind it, on the plan"); await pause(2200); }

// 6. playback: follow one person at 4 min/s from 14:30, the corner comment and the marker over its speaker
await page.evaluate(() => { const s = document.querySelector("#scrub"); s.value = 3600; s.dispatchEvent(new Event("input", { bubbles: true })); });
await page.click("#btn-pick"); await pause(600);
await page.click('[data-speed="240"]'); await page.click("#btn-play");
await guide("#stage", "the afternoon at 4 min/s, following one person"); await pause(5000);
await guide("#thoughts", "what people say about the space, as it happens"); await pause(5000);
await page.click("#btn-play"); await pause(300);

// 7. the feed as a chat, filtered by a topic
await page.click("#feed-head"); await pause(400);
await guide("#feed-box", "the feed: every remark, filtered by topic"); await pause(1200);
const chip = page.locator("#feed .chip", { hasText: /kitchen|crits|desks/ }).first(); if (await chip.count()) { await chip.click(); await pause(1800); }

// 8. the evening at the bar: the food line forming and Good Times, seen close up
await page.evaluate(() => { const st = window.__dbg.stage; st.follow = false; st.opts.followDim = false; st.setZoom(2, st.W / 2, st.H / 2); const b = window.__dbg.plan.bar; st.centerOn(b.center[0], b.center[1] - 2); const s = document.querySelector("#scrub"); s.value = 18000; s.dispatchEvent(new Event("input", { bubbles: true })); });
await guide("#stage", "the evening: the food line, Good Times"); await page.click("#btn-play"); await pause(9000); await page.click("#btn-play");
await guide(null); await pause(800);

await context.close(); await browser.close();
const files = readdirSync(outDir).filter((f) => f.endsWith(".webm")).map((f) => ({ f, t: statSync(join(outDir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
if (files.length) { const target = join(outDir, "studio-day-demo.webm"); try { renameSync(join(outDir, files[0].f), target); } catch {} console.log("video:", target); }
