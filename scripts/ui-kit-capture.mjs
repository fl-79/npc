// Crops every control on scripts/ui-kit.html to its own transparent PNG, for how-to diagrams.
// Needs the dev server running (npm run dev). Usage: node scripts/ui-kit-capture.mjs [outDir] [url]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "../ui_kit";
const url = process.argv[3] || "http://localhost:5174/scripts/ui-kit.html";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 3 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
const ids = await page.$$eval(".kit", (els) => els.map((e) => e.id));
for (const id of ids) {
  await page.locator(`#${id}.kit`).screenshot({ path: `${out}/${id}.png`, omitBackground: true });
}
await page.screenshot({ path: `${out}/_all.png`, fullPage: true, omitBackground: true });
await browser.close();
console.log(`${ids.length} controls -> ${out}`);
