// Records a short close-up of people moving on the plan as PNG frames, for a GIF: the camera follows one
// person and the sim is stepped one 2 s tick per frame (headless Chrome drops frames in real-time playback).
// Needs the dev server on http://localhost:5174 and the installed Chrome.
//   node scripts/agents-gif.mjs <framesDir> [clock seconds from 13:30] [person id] [zoom] [frames]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const [out, atArg, who, zoomArg, nArg] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const at = Number(atArg || 17400), zoom = Number(zoomArg || 1.5), FRAMES = Number(nArg || 60);
const W = 520, H = 380;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5174/");
await page.waitForFunction(() => window.__dbg && window.__dbg.stage && window.__dbg.stage.pixel);
await page.click("#btn-run");
await page.waitForFunction(() => window.__dbg.sim && window.__dbg.sim.t >= 21600 && document.querySelector("#progress").classList.contains("hidden"), null, { timeout: 120000 });

await page.addStyleTag({ content: "#thoughts, #tooltip { display: none !important; }" });
await page.evaluate(([id, zoom]) => {
  const st = window.__dbg.stage;
  Object.defineProperty(st, "annotations", { get: () => [], set: () => {} });   // no numbered findings in the shot
  st.opts.followDim = false; st.opts.trails = false; st.setZoom(zoom, st.W / 2, st.H / 2);
  st.selected = id; st.follow = true;
}, [who || "S122", zoom]);
await page.evaluate((t) => { const s = document.querySelector("#scrub"); s.value = t; s.dispatchEvent(new Event("input", { bubbles: true })); }, at);

const box = await page.locator("#stage").boundingBox();
const clip = { x: box.x + (box.width - W) / 2, y: box.y + (box.height - H) / 2, width: W, height: H };
for (let i = 0; i < FRAMES; i++) {
  // the page's own sim module (same URL, same instance), one tick forward, then let the stage draw it
  await page.evaluate(async (i) => { if (i) (await import("/src/sim.js")).step(window.__dbg.sim, 2); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, i);
  await page.screenshot({ path: `${out}/f${String(i).padStart(3, "0")}.png`, clip });
}
console.log("clock", await page.evaluate(() => window.__dbg.sim.t));
await browser.close();
console.log(`${FRAMES} frames -> ${out}`);
