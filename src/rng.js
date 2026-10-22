// Seeded random numbers (mulberry32). The state is part of the simulation state so a run can be
// snapshotted and replayed exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  const f = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.state = () => a;
  f.set = (s) => { a = s >>> 0; };
  return f;
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const rand = (r, a, b) => a + (b - a) * r();
export const randn = (r) => { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
