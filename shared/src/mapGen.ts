// Small deterministic, parametric layout generators used to build the 15 maps in
// `maps.ts` without hand-typing hundreds of literal box coordinates. Every function
// here is pure closed-form math (no Math.random) so the client and server — two
// separate runtimes — independently compute byte-identical geometry from the same
// recipe. Ground is always an implicit infinite plane at y=0, handled by the caller.

import type { ArenaBox } from './arena.js';

export interface BoxSize {
  sx: number;
  sy: number;
  sz: number;
}

/** `count` boxes evenly spaced around a circle of `radius`. */
export function ringBoxes(count: number, radius: number, size: BoxSize, color: number): ArenaBox[] {
  const boxes: ArenaBox[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    boxes.push({ x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius, ...size, color });
  }
  return boxes;
}

/** A `cols` x `rows` grid of boxes on `spacing`, centered at the origin. */
export function gridBoxes(cols: number, rows: number, spacing: number, size: BoxSize, color: number, skipCenter = true): ArenaBox[] {
  const boxes: ArenaBox[] = [];
  const halfCols = (cols - 1) / 2;
  const halfRows = (rows - 1) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - halfCols) * spacing;
      const z = (r - halfRows) * spacing;
      if (skipCenter && Math.abs(x) < spacing * 0.6 && Math.abs(z) < spacing * 0.6) continue;
      boxes.push({ x, y: 0, z, ...size, color });
    }
  }
  return boxes;
}

/** Boxes stepping outward along all four cardinal directions from the origin. */
export function crossBoxes(armCount: number, spacing: number, size: BoxSize, color: number): ArenaBox[] {
  const boxes: ArenaBox[] = [];
  for (let i = 1; i <= armCount; i++) {
    const d = i * spacing;
    boxes.push({ x: d, y: 0, z: 0, ...size, color });
    boxes.push({ x: -d, y: 0, z: 0, ...size, color });
    boxes.push({ x: 0, y: 0, z: d, ...size, color });
    boxes.push({ x: 0, y: 0, z: -d, ...size, color });
  }
  return boxes;
}

/** Four tall boxes at the corners of a square of half-size `offset`. */
export function cornerTowers(offset: number, size: BoxSize, color: number): ArenaBox[] {
  return [
    { x: offset, y: 0, z: offset, ...size, color },
    { x: -offset, y: 0, z: offset, ...size, color },
    { x: offset, y: 0, z: -offset, ...size, color },
    { x: -offset, y: 0, z: -offset, ...size, color },
  ];
}

/** Four wall segments forming a square ring at half-size `offset` — sightline breaks. */
export function wallRing(offset: number, length: number, thickness: number, height: number, color: number): ArenaBox[] {
  return [
    { x: offset, y: 0, z: 0, sx: thickness, sy: height, sz: length, color },
    { x: -offset, y: 0, z: 0, sx: thickness, sy: height, sz: length, color },
    { x: 0, y: 0, z: offset, sx: length, sy: height, sz: thickness, color },
    { x: 0, y: 0, z: -offset, sx: length, sy: height, sz: thickness, color },
  ];
}

// Fixed, hand-picked normalized offsets (not Math.random) for an organic-reading
// scatter of cover. Reused at different `scale`s across several maps.
const SCATTER_OFFSETS: readonly [number, number][] = [
  [0.3, 0.1], [-0.4, 0.25], [0.15, -0.35], [-0.2, -0.45],
  [0.45, 0.4], [-0.45, 0.15], [0.05, 0.45], [-0.1, -0.2],
  [0.35, -0.15], [-0.35, -0.05], [0.2, 0.3], [-0.25, 0.4],
];

/** Scattered cover at fixed relative positions, scaled to the map size. */
export function scatteredBoxes(scale: number, size: BoxSize, color: number): ArenaBox[] {
  return SCATTER_OFFSETS.map(([ox, oz], i) => {
    const jitter = 1 + (i % 3) * 0.15; // deterministic small size variation for an organic feel
    return {
      x: ox * scale,
      y: 0,
      z: oz * scale,
      sx: size.sx * jitter,
      sy: size.sy,
      sz: size.sz * jitter,
      color,
    };
  });
}

/** Spawn points evenly spaced around a ring near the arena edge. */
export function ringSpawnPoints(halfSize: number, count: number): { x: number; y: number; z: number }[] {
  const radius = halfSize * 0.85;
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    points.push({ x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius });
  }
  return points;
}
