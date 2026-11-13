// A* over a FloorGrid: the shortest walk from one tile to another on one floor, eight directions,
// stair tiles costing more. Returns the tiles as [c, r] from the start to the goal, or null.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) {
    const a = this.a; a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

export function findPath(grid, start, goal) {
  const s = grid.idx(start[0], start[1]), g = grid.idx(goal[0], goal[1]);
  if (!grid.passable(s) || !grid.passable(g)) return null;
  const [gc, gr] = grid.cr(g);
  const h = (i) => { const [c, r] = grid.cr(i); const dx = Math.abs(c - gc), dy = Math.abs(r - gr); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
  const dist = new Map([[s, 0]]), prev = new Map(), closed = new Set();
  const open = new Heap(); open.push(h(s), s);
  while (open.size) {
    const [, i] = open.pop();
    if (closed.has(i)) continue;
    if (i === g) {
      const path = []; let k = g;
      while (k !== undefined) { path.push(grid.cr(k)); k = prev.get(k); }
      return path.reverse();
    }
    closed.add(i);
    const di = dist.get(i);
    for (const [j, len] of grid.neighbours(i)) {
      if (closed.has(j)) continue;
      const nd = di + len * grid.cost(j);
      if (nd < (dist.get(j) ?? Infinity)) { dist.set(j, nd); prev.set(j, i); open.push(nd + h(j), j); }
    }
  }
  return null;
}

/** The walking length of a path in tiles (diagonals as root two). */
export function pathLength(path) {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += (path[i][0] !== path[i - 1][0] && path[i][1] !== path[i - 1][1]) ? Math.SQRT2 : 1;
  return n;
}
