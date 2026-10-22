// Browser side of the brief-to-spec step. The key lives on the dev server, never here.
export async function apiStatus() {
  try { const r = await fetch("/api/status"); return await r.json(); } catch { return { hasKey: false }; }
}
export async function requestSpec(brief) {
  const r = await fetch("/api/spec", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief }) });
  const data = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}
