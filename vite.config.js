import { defineConfig } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// The only paid dependency: the Claude API, called from this dev-server middleware so the key
// never reaches the browser. The key comes from tool/.env or the project root .env
// (ANTHROPIC_API_KEY=...). Without a key the app falls back to a local parse of the brief.
function readKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  for (const f of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", ".env")]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) return m[1].trim();
  }
  return null;
}

const MODEL = "claude-opus-5-5";
const PROMPT_VERSION = "brief-to-spec v1 (2026-10-20)";

const SPEC_SCHEMA = {
  type: "object",
  properties: {
    use: { type: "string", description: "One sentence: what the floor is used for on this day." },
    goals: { type: "array", items: { type: "object", properties: { text: { type: "string" }, metric: { type: "string", enum: ["access", "comfort", "kitchen", "food line", "bar", "seating", "printers", "crits", "aisles", "wayfinding", "light", "doors", "desks"] } }, required: ["text", "metric"], additionalProperties: false } },
    types: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" }, name: { type: "string" }, role: { type: "string", enum: ["student", "prof", "office"] }, count: { type: "integer" },
          pattern: { type: "string", enum: ["focused", "social", "restless", "prof", "office"] }, mobility: { type: "string", enum: ["walking", "wheelchair", "stroller", "cane"] },
          goesToBar: { type: "number" }, usesKitchen: { type: "number" }, hasPrintJob: { type: "number" },
          traits: { type: "object", properties: Object.fromEntries(["patience", "curiosity", "sociability", "noise", "crowd", "familiarity"].map((k) => [k, { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }])), required: ["patience", "curiosity", "sociability", "noise", "crowd", "familiarity"], additionalProperties: false },
        },
        required: ["id", "name", "role", "count", "pattern", "mobility", "goesToBar", "usesKitchen", "hasPrintJob", "traits"], additionalProperties: false,
      },
    },
    studio: { type: "object", description: "Studio-wide qualities independent of the patterns.", properties: { deadline: { type: "number", description: "0 to 1, how much the whole studio is under deadline" }, deadlineSections: { type: "array", items: { type: "string" }, description: "Sections A to L under a deadline" }, noiseShare: { type: "number" }, crowdShare: { type: "number" }, newShare: { type: "number", description: "share new to the building" } }, required: ["deadline", "deadlineSections", "noiseShare", "crowdShare", "newShare"], additionalProperties: false },
    notes: { type: "string", description: "What was assumed because the brief did not say." },
  },
  required: ["use", "goals", "types", "studio", "notes"], additionalProperties: false,
};

const SYSTEM = `You turn a designer's brief about one afternoon on a studio floor into a group spec for a simulation. The floor has 175 desks in 12 sections and 12 profs who do desk crits. Output only the spec.
Rules: student type counts should add up to the number of students the brief implies (default 175 if unstated); keep 12 profs unless the brief says otherwise; trait ranges are [min, max] in 0 to 1 (patience, curiosity, sociability, noise sensitivity, crowding sensitivity, familiarity with the building); goesToBar, usesKitchen and hasPrintJob are shares in 0 to 1; patterns: focused (long stretches, few breaks), social (frequent, visits friends), restless (short frequent breaks, pin-up wall); pick 2 to 5 student types that reflect the brief. Keep one prof type (role prof, pattern prof, 12) and one office type (role office, pattern office, 2) unless the brief says otherwise. Qualities that cut across patterns go in studio: deadline pressure (0 to 1, and which sections), and the shares who are noise-sensitive, crowd-sensitive, and new to the building. Goals are the designer's questions about the space, each tagged with the metric that answers it. Do not invent architecture; put assumptions in notes.`;

function specMiddleware() {
  return {
    name: "studio-day-api",
    configureServer(server) {
      server.middlewares.use("/api/status", (req, res) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ hasKey: !!readKey(), model: MODEL, promptVersion: PROMPT_VERSION })); });
      // dev only: save a PNG the page posts, for inspecting the pixel map at full size
      server.middlewares.use("/api/debug-png", async (req, res) => {
        let body = ""; for await (const chunk of req) body += chunk;
        try { const { name, dataUrl } = JSON.parse(body); const buf = Buffer.from(dataUrl.split(",")[1], "base64"); const { writeFileSync, mkdirSync } = await import("node:fs"); mkdirSync(resolve(process.cwd(), "..", "outputs", "pixel-debug"), { recursive: true }); writeFileSync(resolve(process.cwd(), "..", "outputs", "pixel-debug", (name || "map").replace(/[^a-z0-9_-]/gi, "") + ".png"), buf); res.end(JSON.stringify({ ok: true, bytes: buf.length })); }
        catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e) })); }
      });
      server.middlewares.use("/api/spec", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") { res.statusCode = 405; res.end(JSON.stringify({ error: "POST only" })); return; }
        const key = readKey(); if (!key) { res.statusCode = 400; res.end(JSON.stringify({ error: "no ANTHROPIC_API_KEY in .env" })); return; }
        let body = ""; for await (const chunk of req) body += chunk;
        let brief = ""; try { brief = JSON.parse(body).brief || ""; } catch { brief = ""; }
        if (!brief.trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: "empty brief" })); return; }
        try {
          const { default: Anthropic } = await import("@anthropic-ai/sdk");
          const client = new Anthropic({ apiKey: key });
          const params = {
            model: MODEL, max_tokens: 4000, system: SYSTEM,
            output_config: { effort: "medium", format: { type: "json_schema", schema: SPEC_SCHEMA } },
            messages: [{ role: "user", content: `Brief:\n${brief}` }],
          };
          let response;
          try { response = await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }); }
          catch (e) { if (e instanceof Anthropic.BadRequestError) response = await client.messages.create(params); else throw e; }
          if (response.stop_reason === "refusal") { res.statusCode = 422; res.end(JSON.stringify({ error: "the model declined this brief", details: response.stop_details || null })); return; }
          const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
          const spec = JSON.parse(text);
          res.end(JSON.stringify({ spec, meta: { model: response.model || MODEL, promptVersion: PROMPT_VERSION, usage: response.usage, requestId: response._request_id || null, at: new Date().toISOString() } }));
        } catch (e) {
          res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.message || e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [specMiddleware()],
  server: { port: 5174, strictPort: true },
  build: { target: "es2022" },
});
