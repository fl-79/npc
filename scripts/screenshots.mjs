// High-res stills of the tool for slides: the setup before a run, the afternoon mid-run, a close-up of the plan,
// and the Good Times evening. 1920x1080 at 2x, so each PNG is 3840x2160.
// Needs the tool served (dev server on :5174 by default, or pass another URL) and the installed Chrome.
// Writes outputs/screenshots/*.png.
//   node tool/scripts/screenshots.mjs [http://localhost:5174/]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const url = process.argv[2] || "http://localhost:5174/";
const outDir = resolve(process.cwd(), "..", "outputs", "screenshots"); mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const pause = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await pause(600); await page.screenshot({ path: resolve(outDir, name + ".png") }); console.log("wrote", name); };
const scrub = (t) => page.evaluate((t) => { const s = document.querySelector("#scrub"); s.value = t; s.dispatchEvent(new Event("input", { bubbles: true })); }, t);

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__dbg && window.__dbg.stage && window.__dbg.stage.pixel);
await page.evaluate(() => { const st = window.__dbg.stage; st.setZoom(1, st.W / 2, st.H / 2); st.centerOn(17.5, -11); });
await shot("1-setup");

// run the day, then sit in the middle of the afternoon
await page.click("#btn-run");
await page.waitForSelector("#progress", { state: "hidden", timeout: 60000 }).catch(() => {});
await pause(1500);
await scrub(3600);
await page.click('[data-speed="240"]'); await page.click("#btn-play"); await pause(4000); await page.click("#btn-play");
await shot("2-afternoon");

// close-up on the plan
await page.evaluate(() => { const st = window.__dbg.stage; st.follow = false; st.setZoom(2.5, st.W / 2, st.H / 2); st.centerOn(17.5, -11); });
await shot("3-plan-closeup");

// the evening at the bar
await page.evaluate(() => { const st = window.__dbg.stage; st.follow = false; st.opts.followDim = false; st.setZoom(2, st.W / 2, st.H / 2); const b = window.__dbg.plan.bar; st.centerOn(b.center[0], b.center[1] - 2); });
await scrub(18000);
await page.click("#btn-play"); await pause(5000); await page.click("#btn-play");
await shot("4-evening");

await browser.close();
