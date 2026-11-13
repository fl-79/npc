// Colours per element kind and per room type. Legibility over realism (the V1 rule).
export const KIND = {
  wall:      { label: 'Walls',          color: 0xf1e6cf, order: 0 },
  panel:     { label: 'Glass panels',   color: 0x9fd3e8, order: 1, glass: true },
  mullion:   { label: 'Mullions',       color: 0x3b3f4a, order: 2 },
  door:      { label: 'Doors',          color: 0xb5733a, order: 3 },
  window:    { label: 'Windows',        color: 0x7fb9d6, order: 4, glass: true },
  floor:     { label: 'Floors',         color: 0x6f6a66, order: 5 },
  column:    { label: 'Columns',        color: 0xc9b89a, order: 6 },
  stair:     { label: 'Stairs',         color: 0x8f8a84, order: 7 },
  railing:   { label: 'Railings',       color: 0x4a4440, order: 8 },
  furniture: { label: 'Furniture',      color: 0xd9a441, order: 9 },
  furniture_system: { label: 'Furniture systems', color: 0xd9a441, order: 10 },
  casework:  { label: 'Casework',       color: 0x9c6b3c, order: 11 },
  plumbing:  { label: 'Plumbing',       color: 0xe8eef2, order: 12 },
  equipment: { label: 'Equipment',      color: 0x5fa8a0, order: 13 },
  generic:   { label: 'Generic models', color: 0xa07cc5, order: 14 },
  lighting:  { label: 'Lighting',       color: 0xfff1a8, order: 15 },
  electrical:{ label: 'Electrical',     color: 0xd0d0d0, order: 16 },
  mechanical:{ label: 'Mechanical',     color: 0x8aa0b8, order: 17 },
  entourage: { label: 'Entourage',      color: 0xc77da0, order: 18 },
  planting:  { label: 'Planting',       color: 0x5c9a4e, order: 19 },
  roof:      { label: 'Roofs',          color: 0x7a4a3a, order: 20 },
  ceiling:   { label: 'Ceilings',       color: 0xf7f3ea, order: 21, off: true },
  framing:   { label: 'Framing',        color: 0x8c6f52, order: 22 },
  foundation:{ label: 'Foundations',    color: 0x5c5956, order: 23 },
  ramp:      { label: 'Ramps',          color: 0x8f8a84, order: 24 },
  topography:{ label: 'Topography',     color: 0x6c8a4a, order: 25, off: true },
  toposolid: { label: 'Toposolid',      color: 0x6c8a4a, order: 26, off: true },
  elevator:  { label: 'Elevators',      color: 0x6c7a8a, order: 27 },
  other:     { label: 'Other',          color: 0xb0a8c0, order: 40 },
  // urban context (OpenStreetMap), muted so the model stays the subject
  ctx_ground:   { label: 'Context ground',    color: 0x2e342f, order: 60, context: true },
  ctx_green:    { label: 'Context green',     color: 0x3d6338, order: 61, context: true },
  ctx_road:     { label: 'Context roads',     color: 0x3b3b45, order: 62, context: true },
  ctx_water:    { label: 'Context water',     color: 0x355a73, order: 63, context: true },
  ctx_building: { label: 'Context buildings', color: 0x5c6170, order: 64, context: true },
  ctx_trunk:    { label: 'Context trunks',    color: 0x5a3d2a, order: 65, context: true },
  ctx_canopy:   { label: 'Context trees',     color: 0x4c7f42, order: 66, context: true },
};

export function kindInfo(kind) {
  return KIND[kind] || KIND.other;
}

// Room type by name keywords: floor tint and label.
const ROOM_TYPES = [
  ['stair', 0x7d7a86], ['elev', 0x6c7a8a], ['lift', 0x6c7a8a], ['shaft', 0x55525c],
  ['wash', 0x9fc8c8], ['wc', 0x9fc8c8], ['toilet', 0x9fc8c8], ['restroom', 0x9fc8c8], ['shower', 0x9fc8c8],
  ['kitchen', 0xd9c27a], ['lounge', 0xd9b07a], ['cafe', 0xd9b07a],
  ['studio', 0x5a5650], ['crit', 0x8a7a9a], ['pin', 0x8a7a9a], ['review', 0x8a7a9a],
  ['class', 0x7a9ab8], ['seminar', 0x7a9ab8], ['lecture', 0x7a9ab8], ['theatre', 0x7a9ab8],
  ['office', 0xb08a5a], ['admin', 0xb08a5a], ['reception', 0xb08a5a],
  ['corr', 0x9c9a94], ['hall', 0x9c9a94], ['lobby', 0xa8a39a], ['foyer', 0xa8a39a], ['vest', 0xa8a39a],
  ['shop', 0x8aa06a], ['lab', 0x8aa06a], ['work', 0x8aa06a], ['fab', 0x8aa06a], ['print', 0x8aa06a],
  ['stor', 0x7a7266], ['mech', 0x6a6a72], ['elec', 0x6a6a72], ['serv', 0x6a6a72], ['jan', 0x6a6a72], ['util', 0x6a6a72],
  ['library', 0xa88a6a], ['read', 0xa88a6a], ['gallery', 0xc8c0b0], ['exhib', 0xc8c0b0],
];

export function roomColor(name) {
  const n = (name || '').toLowerCase();
  for (const [k, c] of ROOM_TYPES) if (n.includes(k)) return c;
  return 0x8f9aa0;
}
