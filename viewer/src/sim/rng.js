// Random streams the run can repeat: every stream is keyed (the seed, an agent, a date, a
// purpose), so a day comes out the same whichever days were viewed before, and two scenarios with
// the same seed differ only by the scenario. mulberry32 underneath; normal, lognormal, gamma and
// multivariate-normal draws on top.
export function hashKey(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x85ebca6b) >>> 0; }
  return h >>> 0;
}

export class Rng {
  constructor(...key) { this.a = hashKey(...key) || 1; this.spare = null; }
  /** uniform [0, 1) */
  next() { this.a = (this.a + 0x6D2B79F5) >>> 0; let t = this.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  between(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  /** standard normal, Box-Muller */
  normal(mu = 0, sd = 1) {
    if (this.spare != null) { const z = this.spare; this.spare = null; return mu + sd * z; }
    let u, v, s;
    do { u = this.next() * 2 - 1; v = this.next() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    this.spare = v * m; return mu + sd * u * m;
  }
  lognormal(median, sigma) { return median * Math.exp(sigma * this.normal()); }
  /** gamma by Marsaglia–Tsang, shape k, scale theta */
  gamma(k, theta = 1) {
    if (k < 1) return this.gamma(k + 1, theta) * Math.pow(this.next(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) { let x, v; do { x = this.normal(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = this.next(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta; }
  }
  /** a draw from a categorical distribution {name: share} */
  category(shares) { let r = this.next(); const keys = Object.keys(shares); for (const k of keys) { r -= shares[k]; if (r < 0) return k; } return keys[keys.length - 1]; }
}

/** Multivariate normal with unit variances and the given correlation matrix (array of arrays), by Cholesky. */
export function mvnFactory(corr) {
  const n = corr.length, L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = corr[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(Math.max(1e-9, s)) : s / L[j][j];
  }
  return (rng) => { const z = Array.from({ length: n }, () => rng.normal()); return L.map((row) => row.reduce((acc, v, k) => acc + v * z[k], 0)); };
}
