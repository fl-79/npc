// People in the pixel plan (owner 2026-11-13): chibi figures drawn by code in the style the owner shared
// (research/pixel-people-and-animation.md). A big head, a one-pixel ink outline round the silhouette, two-pixel
// eyes, hair as the main shape, a shaded side. Each agent gets its own look from its id and the run's seed; the
// look is visual only and stands for no attribute of the agent.
//
// One sheet per look: 8 frames x 4 facings, 16 x 24 each.
//   frames: 0 stand, 1 step (left foot up), 2 step (right foot up), 3 breath (body down 1 px), 4 blink,
//           5 seated, 6 seated typing, 7 seated blink
//   rows:   0 down (front), 1 left, 2 right, 3 up (back) - the engine's face order
// Animations per look: walk, idle (breath and blink), type (seated, typing), sit (seated, still).
// Emote bubbles: one small sheet of icon bubbles (EMOTE) shown over a person when the run records an event.

const W = 16, H = 24, NF = 8;
const OUT = '#2a1f1a', EYE = '#1e1a16', BLUSH = '#e8907a', SHADOW = 'rgba(20, 14, 10, 0.32)';

const SKINS = ['#f6d7bd', '#f1c9a5', '#e8b48e', '#d39a6c', '#b17650', '#8a5636', '#5f3923'];
const HAIRS = ['#1d1a1a', '#2f241e', '#2f241e', '#4a3222', '#6b4429', '#8a5a32', '#b07a45', '#d9b26a', '#b4512c', '#e6dfcf', '#3b4a78', '#8f5fa8'];
const HAIR_W = [10, 14, 10, 12, 10, 8, 6, 5, 3, 2, 2, 1];          // weights: dark hair common, dyed colours rare
const GREYS = ['#8f8b85', '#bdb8ae', '#e8e4dc'];
const SHIRTS = ['#1f1f24', '#2b2b31', '#e9e4d8', '#4f7fb0', '#d9873c', '#5f9a4a', '#c9553f', '#2f8f85', '#8f5fa8', '#d6b24a', '#6b5a7a', '#e58fa3', '#7fb3d5', '#9bc48a'];
const SHIRT_W = [9, 5, 6, 4, 3, 3, 3, 3, 2, 2, 2, 2, 3, 2];        // a share in black: architecture students
const PANTS = ['#2f3a55', '#24242a', '#4a4a52', '#6b5a44', '#3f5f8a', '#7a6a55'];
const JACKETS = ['#3a3530', '#2f3a55', '#5a4a3a', '#6b6b70'];

function rng32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (r, arr, w) => { if (!w) return arr[Math.floor(r() * arr.length)]; const tot = w.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x < 0) return arr[i]; } return arr[arr.length - 1]; };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

/** A person's look: drawn at random from the person's id and the run's seed (visual only). */
export function lookFor(person, seed = 0) {
  const r = rng32(hashStr(`look:${seed}:${person.id}`));
  const staff = person.role === 'instructor';
  const longBias = person.sex === 'F' ? 0.5 : 0.15;   // a mild lean, not a rule: every style appears on everyone
  let style;
  const x = r();
  if (staff && x < 0.2) style = 'receding';
  else if (r() < longBias) style = pick(r, ['bob', 'long', 'bun', 'long'], null);
  else style = pick(r, ['crop', 'part', 'crop', 'spiky', 'curls', 'part', 'bob', 'bun'], null);
  const hair = staff && r() < 0.4 ? pick(r, GREYS) : pick(r, HAIRS, HAIR_W);
  const look = {
    skin: pick(r, SKINS), hair, style,
    shirt: pick(r, SHIRTS, SHIRT_W), pants: pick(r, PANTS), shoes: r() < 0.25 ? '#e8e4dc' : '#2a211a',
    sleeves: r() < 0.55 ? 'long' : 'short', jacket: staff && r() < 0.7 ? pick(r, JACKETS) : null,
    glasses: r() < (staff ? 0.45 : 0.22), blush: r() < 0.3, beard: person.sex !== 'F' && r() < (staff ? 0.35 : 0.1),
  };
  look.key = `npcfig-${hashStr(JSON.stringify(look)).toString(36)}`;
  return look;
}

// ---------------------------------------------------------------- one frame into a 16 x 24 buffer
function drawFrame(b, L, dir, f) {
  const put = (x, y, c) => { if (c && x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const clr = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = null; };
  // a round head: two pixels off each top corner, a narrower chin
  const corners = () => { const xr = hx0 + hw - 1; for (const [x, y] of [[hx0, hy], [hx0 + 1, hy], [hx0, hy + 1], [xr, hy], [xr - 1, hy], [xr, hy + 1], [hx0, hy + 10], [xr, hy + 10]]) clr(x, y); if (!(L.style === 'long' || L.style === 'bob') || side) { clr(hx0 + 1, hy + 10); clr(xr - 1, hy + 10); } };
  const seated = f >= 5, up = f === 3 ? 1 : seated ? 2 : 0, blink = f === 4 || f === 7, typing = f === 6;
  const stepL = f === 1, stepR = f === 2;
  const hairD = shade(L.hair, 0.72), hairHi = shade(L.hair, 1.35), shirtD = shade(L.shirt, 0.75), skinD = shade(L.skin, 0.85);
  const side = dir === 1 || dir === 2, back = dir === 3;
  const hy = 2 + up, ty = 13 + up;   // head top, torso top

  // ---- legs and shoes
  if (seated) {
    if (side) { rect(6, 20, 6, 2, L.pants); rect(10, 22, 2, 1, L.shoes); }
    else { rect(5, 20, 6, 2, L.pants); if (!back) { rect(5, 22, 2, 1, L.shoes); rect(9, 22, 2, 1, L.shoes); } }
  } else if (side) {
    if (stepL || stepR) { rect(8, 18, 3, 3, L.pants); rect(9, 21, 3, 2, L.shoes); rect(5, 18, 3, 2, shade(L.pants, 0.8)); rect(4, 20, 3, 2, L.shoes); }
    else { rect(6, 18, 4, 3, L.pants); rect(6, 21, 5, 2, L.shoes); }
  } else {
    const la = stepL ? 1 : 0, lb = stepR ? 1 : 0;
    rect(5, 18, 3, 3 - la, L.pants); rect(5, 21 - la, 3, 2, L.shoes);
    rect(8, 18, 3, 3 - lb, L.pants); rect(8, 21 - lb, 3, 2, L.shoes);
  }

  // ---- torso and arms
  if (side) {
    rect(6, ty, 5, 5, L.shirt); rect(10, ty, 1, 5, shirtD);
    if (L.jacket) { rect(6, ty, 2, 5, L.jacket); }
    // one arm, swinging with the step; forward when typing
    const ax = typing || seated ? 9 : stepL ? 9 : stepR ? 6 : 7;
    const ah = typing ? 3 : 4;
    rect(ax, ty + 1, 2, ah, L.sleeves === 'long' || L.jacket ? (L.jacket || L.shirt) : L.shirt);
    if (L.sleeves === 'short' && !L.jacket) rect(ax, ty + 3, 2, ah - 2, L.skin);
    rect(typing ? ax + 1 : ax, ty + 1 + ah, 2, 1, L.skin);
  } else {
    rect(5, ty, 6, 5, L.shirt); rect(10, ty, 1, 5, shirtD);
    if (L.jacket) { rect(5, ty, 2, 5, L.jacket); rect(9, ty, 2, 5, L.jacket); }
    if (!back) { put(7, ty, L.skin); put(8, ty, skinD); }   // the neckline
    const sleeve = L.jacket || L.shirt;
    const armL = stepR ? -1 : 0, armR = stepL ? -1 : 0;  // the opposite hand swings up
    if (seated) {   // at a desk or a table: the hands forward; typing lifts one, then the other
      const t = f === 6 ? 1 : 0;
      rect(3, ty, 2, 3, sleeve); rect(11, ty, 2, 3, sleeve);
      if (!back) { put(5, ty + 3 - t, L.skin); put(10, ty + 2 + t, L.skin); put(4, ty + 3, L.skin); put(11, ty + 3, L.skin); }
      else { put(4, ty + 3, L.skin); put(11, ty + 3, L.skin); }
    } else {
      rect(3, ty + 1 + armL, 2, 4, sleeve); rect(11, ty + 1 + armR, 2, 4, shade(sleeve, 0.85));
      if (L.sleeves === 'short' && !L.jacket) { rect(3, ty + 3 + armL, 2, 2, L.skin); rect(11, ty + 3 + armR, 2, 2, skinD); }
      rect(3, ty + 5 + armL, 2, 1, L.skin); rect(11, ty + 5 + armR, 2, 1, skinD);
    }
  }

  // ---- head: skin, then hair over it
  const hx0 = side ? 3 : 2, hw = side ? 11 : 12;
  rect(hx0, hy, hw, 11, L.skin);
  const st = L.style;
  const sideEnd = { crop: 6, part: 7, spiky: 6, curls: 8, bun: 7, bob: 10, long: 10, receding: 7 }[st];
  const hairRect = (x, y, w, h, c = L.hair) => rect(x, y, w, h, c);
  if (back) {
    if (st === 'receding') rect(hx0, hy + 4, hw, 7, L.hair);
    else rect(hx0, hy, hw, 11, L.hair);
    if (st === 'long') rect(4, ty, 8, 4, L.hair);
    rect(hx0 + hw - 2, hy + 2, 1, 7, hairD);
    put(5, hy + 1, hairHi); put(6, hy + 1, hairHi);
  } else if (side) {
    // dir 2 (right) is drawn; dir 1 is its mirror
    if (st !== 'receding') { hairRect(hx0, hy, hw - 1, 4); hairRect(hx0, hy + 4, 5, sideEnd - 3); put(hx0 + hw - 2, hy + 4, L.hair); put(hx0 + 5, hy + 4, L.hair); put(hx0 + 6, hy + 4, L.hair); }
    else { hairRect(hx0, hy + 3, 4, 5); }
    if (st === 'long' || st === 'bob') hairRect(hx0, hy + 4, 4, st === 'long' ? 11 : 8);
    put(hx0 + 5, hy + 7, skinD);                                    // the ear
    put(hx0 + hw - 2, hy + 6, blink ? null : EYE); put(hx0 + hw - 2, hy + 7, EYE);
    if (L.glasses) { put(hx0 + hw - 3, hy + 6, EYE); put(hx0 + hw - 1, hy + 6, EYE); }
    if (L.blush) put(hx0 + hw - 3, hy + 8, BLUSH);
    if (L.beard) { rect(hx0 + 6, hy + 8, hw - 6, 2, L.hair); put(hx0 + 6, hy + 7, L.hair); }
    put(hx0 + 3, hy + 1, hairHi); put(hx0 + 4, hy + 1, hairHi);
  } else {
    // front
    if (st !== 'receding') {
      hairRect(hx0, hy, hw, 4);
      // a jagged fringe
      const fringe = { crop: [1, 1, 0, 1, 0, 0, 1, 0, 1, 1], part: [1, 1, 1, 1, 1, 1, 0, 0, 0, 1], spiky: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0], curls: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1], bun: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], bob: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], long: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1] }[st];
      for (let i = 0; i < 10; i++) if (fringe[i]) put(hx0 + 1 + i, hy + 4, L.hair);
      hairRect(hx0, hy + 4, 2, sideEnd - 3); hairRect(hx0 + hw - 2, hy + 4, 2, sideEnd - 3);
      if (st === 'part') { hairRect(hx0 + 2, hy + 5, 2, 1); }
    } else { hairRect(hx0, hy + 3, 2, 4); hairRect(hx0 + hw - 2, hy + 3, 2, 4); put(hx0 + 2, hy + 3, L.hair); put(hx0 + hw - 3, hy + 3, L.hair); }
    rect(hx0 + hw - 1, hy + 1, 1, sideEnd, hairD);
    if (st !== 'receding') { put(hx0 + 3, hy + 1, hairHi); put(hx0 + 4, hy + 1, hairHi); put(hx0 + 5, hy + 2, hairHi); }
    // eyes, glasses, blush, beard
    const ey = hy + 6;
    if (blink) { put(5, ey + 1, EYE); put(10, ey + 1, EYE); } else { put(5, ey, EYE); put(5, ey + 1, EYE); put(10, ey, EYE); put(10, ey + 1, EYE); }
    if (L.glasses) { put(4, ey, EYE); put(6, ey, EYE); put(9, ey, EYE); put(11, ey, EYE); put(7, ey, EYE); put(8, ey, EYE); }
    if (L.blush) { put(4, ey + 2, BLUSH); put(11, ey + 2, BLUSH); }
    if (L.beard) { rect(4, ey + 3, 8, 2, L.hair); put(7, ey + 3, L.skin); put(8, ey + 3, L.skin); put(4, ey + 2, L.hair); put(11, ey + 2, L.hair); }
    if (st === 'long') { rect(2, ty, 2, 4, L.hair); rect(12, ty, 2, 4, hairD); }
  }
  corners();
  // hair highlights: a light band across the crown, as in the references
  if (st !== 'receding') { const hx = back ? hx0 + 3 : side ? hx0 + 2 : hx0 + 3; put(hx, hy + 1, hairHi); put(hx + 1, hy + 1, hairHi); put(hx + 2, hy + 1, hairHi); put(hx - 1, hy + 2, hairHi); put(hx + 5, hy + 1, hairHi); }
  // shapes above the head
  if (st === 'bun') rect(6, hy - 2, 4, 2, L.hair);
  if (st === 'spiky') { put(4, hy - 1, L.hair); put(7, hy - 1, L.hair); put(8, hy - 2, L.hair); put(11, hy - 1, L.hair); }
  if (st === 'curls') { rect(hx0 - 1, hy + 1, 1, 6, L.hair); rect(hx0 + hw, hy + 1, 1, 6, L.hair); rect(hx0 + 1, hy - 1, hw - 2, 1, L.hair); put(hx0 + 3, hy + 2, hairD); put(hx0 + 7, hy + 1, hairD); put(hx0 + 9, hy + 3, hairD); }
}

/** The outline: every empty pixel beside the figure turns ink; then a shadow under the feet. */
function outline(b, seated) {
  const o = b.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (b[y * W + x]) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && b[yy * W + xx];
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) o[y * W + x] = OUT;
  }
  const sx0 = seated ? 3 : 4, sx1 = seated ? 12 : 11;
  for (let x = sx0; x <= sx1; x++) if (!o[23 * W + x]) o[23 * W + x] = SHADOW;
  return o;
}

/** The sheet and the animations for a look; built once per look, kept across floors. */
export function buildFigure(scene, look) {
  const key = look.key;
  if (!scene.textures.exists(key)) {
    const c = document.createElement('canvas'); c.width = W * NF; c.height = H * 4;
    const g = c.getContext('2d');
    for (let row = 0; row < 4; row++) for (let f = 0; f < NF; f++) {
      const dir = row === 1 ? 2 : row;           // left is right mirrored
      const b = new Array(W * H).fill(null);
      drawFrame(b, look, dir, f);
      const o = outline(b, f >= 5);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const col = o[y * W + x]; if (!col) continue;
        const xx = row === 1 ? W - 1 - x : x;
        g.fillStyle = col; g.fillRect(f * W + xx, row * H + y, 1, 1);
      }
    }
    scene.textures.addSpriteSheet(key, c, { frameWidth: W, frameHeight: H });
  }
  const fr = (dir, f, duration = 0) => ({ key, frame: dir * NF + f, duration });
  for (let dir = 0; dir < 4; dir++) {
    const add = (name, frames, frameRate) => { const ak = `${key}-${name}${dir}`; if (!scene.anims.exists(ak)) scene.anims.create({ key: ak, frames, frameRate, repeat: -1 }); };
    add('walk', [fr(dir, 1), fr(dir, 0), fr(dir, 2), fr(dir, 0)], 8);
    // idle: a breath now and then, a blink every few seconds (frames carry their own durations)
    add('idle', [fr(dir, 0, 1100), fr(dir, 3, 650), fr(dir, 0, 900), fr(dir, dir === 3 ? 0 : 4, 110), fr(dir, 0, 700), fr(dir, 3, 650), fr(dir, 0, 1300)], 1000);
    // typing at a desk: hands alternate in bursts, a pause, a blink
    add('type', [fr(dir, 5, 160), fr(dir, 6, 160), fr(dir, 5, 160), fr(dir, 6, 160), fr(dir, 5, 160), fr(dir, 6, 160), fr(dir, 5, 900), fr(dir, dir === 3 ? 5 : 7, 110), fr(dir, 5, 600)], 1000);
    // seated still: eating, a lecture, a seminar
    add('sit', [fr(dir, 5, 1600), fr(dir, dir === 3 ? 5 : 7, 110), fr(dir, 5, 2100)], 1000);
  }
  return key;
}

/** The figure key for a simulation person (looks cached per run seed). */
export function figureFor(scene, person, seed) {
  scene.npcLooks = scene.npcLooks || new Map();
  const ck = `${seed}:${person.id}`;
  let look = scene.npcLooks.get(ck);
  if (!look) { look = lookFor(person, seed); scene.npcLooks.set(ck, look); }
  return buildFigure(scene, look);
}

// ---------------------------------------------------------------- emote bubbles
export const EMOTE = { talk: 0, excited: 1, q: 2, bang: 3, page: 4, check: 5, note: 6, cup: 7, z: 8, sweat: 9 };
const ICONS = {
  talk: ['       ', '       ', ' # # # ', '       ', '       '],
  excited: [' # #  #', ' # # # ', ' # #   ', '       ', ' # #   '],   // an excited '!!' (owner 2026-11-13: not a heart)
  q: ['  ###  ', ' #   # ', '    #  ', '       ', '   #   '],
  bang: ['   #   ', '   #   ', '   #   ', '       ', '   #   '],
  page: [' ####  ', ' #  ## ', ' # # # ', ' #   # ', ' ##### '],
  check: ['      #', '     # ', '#   #  ', ' # #   ', '  #    '],
  note: ['   ### ', '   # # ', '   #   ', ' ###   ', ' ##    '],
  cup: [' # #   ', '  # #  ', '#####  ', '##### #', ' ###   '],
  z: [' ##### ', '    #  ', '   #   ', '  #    ', ' ##### '],
  sweat: ['   #   ', '  ###  ', ' ##### ', ' ##### ', '  ###  '],
};
const ICON_COL = { talk: '#2a1f1a', excited: '#e07a2c', q: '#2a1f1a', bang: '#d9483b', page: '#4f6f9a', check: '#3f8f4a', note: '#7a4fa0', cup: '#8a5a32', z: '#4f6f9a', sweat: '#5aa6d8' };
const EW = 14, EH = 14;

/** The bubble sheet: a white bubble, an ink outline, a tail, an icon. */
export function buildEmotes(scene) {
  const key = 'npc-emotes';
  if (scene.textures.exists(key)) return key;
  const names = Object.keys(EMOTE);
  const c = document.createElement('canvas'); c.width = EW * names.length; c.height = EH;
  const g = c.getContext('2d');
  names.forEach((name, i) => {
    const ox = i * EW, P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(ox + x, y, w, h); };
    P(1, 0, 11, 1, OUT); P(1, 10, 11, 1, OUT); P(0, 1, 1, 9, OUT); P(12, 1, 1, 9, OUT);
    P(1, 1, 11, 9, '#fbf7ec'); P(1, 9, 11, 1, '#e6dcc3');
    P(5, 10, 3, 1, '#fbf7ec'); P(4, 10, 1, 2, OUT); P(8, 10, 1, 1, OUT); P(5, 11, 1, 1, '#fbf7ec'); P(6, 11, 2, 1, OUT); P(5, 12, 1, 1, OUT);
    ICONS[name].forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') P(3 + x, 3 + y, 1, 1, ICON_COL[name]); });
  });
  scene.textures.addSpriteSheet(key, c, { frameWidth: EW, frameHeight: EH });
  return key;
}

/** Which bubble an event earns, for whom, and how much it matters (higher shows first). */
export function emotesFor(ev) {
  const ids = ev.agents || [];
  switch (ev.kind) {
    case 'conversation': return ids.map((id) => ({ id, icon: ev.between ? 'excited' : 'talk', pri: ev.between ? 3 : 1 }));
    case 'office_visit': return ids.map((id) => ({ id, icon: 'talk', pri: 2 }));
    case 'crit_start': return ids.map((id, i) => ({ id, icon: i === 0 ? 'q' : 'talk', pri: 2 }));
    case 'crit_end': return ids.slice(0, 1).map((id) => ({ id, icon: 'check', pri: 2 }));
    case 'paper_out': return ids.map((id) => ({ id, icon: 'bang', pri: 3 }));
    case 'plot_queue': return ids.map((id) => ({ id, icon: 'page', pri: 1 }));
    case 'plot_done': return ids.map((id) => ({ id, icon: 'check', pri: 2 }));
    case 'intro': return ids.map((id) => ({ id, icon: 'bang', pri: 2 }));
    case 'remark': {
      const t = ev.topic || '';
      if (t === 'encounter' || t === 'encounter_between') return ids.map((id) => ({ id, icon: 'talk', pri: t === 'encounter_between' ? 1 : 0 }));   // a hello in passing
      const icon = t === 'headphones_on' ? 'note' : t === 'break' ? 'cup' : /late/.test(t) ? 'z' : t === 'lift_wait' || t === 'kitchen_crowded' || t === 'interrupted' || t === 'crit_wait' ? 'sweat' : t === 'paper_out' ? 'bang' : null;
      return icon ? ids.map((id) => ({ id, icon, pri: 0 })) : [];
    }
    default: return [];
  }
}
