import { ARENA_BOXES, ARENA_HALF_SIZE, PLAYER_RADIUS, type ArenaBox } from '@shootme/shared';

const STAND_TOLERANCE = 0.12;

export interface MoveState {
  x: number;
  y: number;
  z: number;
}

function boxTop(box: ArenaBox): number {
  return box.y + box.sy;
}

function xzOverlap(x: number, z: number, box: ArenaBox, margin: number): boolean {
  const minX = box.x - box.sx / 2 - margin;
  const maxX = box.x + box.sx / 2 + margin;
  const minZ = box.z - box.sz / 2 - margin;
  const maxZ = box.z + box.sz / 2 + margin;
  return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
}

/** Highest walkable surface (box top or ground) under point (x,z) reachable from feetY. */
export function groundHeightAt(x: number, z: number, feetY: number): number {
  let best = 0;
  for (const box of ARENA_BOXES) {
    if (!xzOverlap(x, z, box, 0)) continue;
    const top = boxTop(box);
    if (feetY >= top - STAND_TOLERANCE && top > best) {
      best = top;
    }
  }
  return best;
}

/** Resolves horizontal movement against arena boxes the player is not currently standing on top of. */
export function resolveHorizontal(x: number, z: number, feetY: number): { x: number; z: number } {
  let nx = x;
  let nz = z;

  for (const box of ARENA_BOXES) {
    const top = boxTop(box);
    // If the player's feet are at/above this box's roof, they're standing on it (or above) — no wall collision.
    if (feetY >= top - STAND_TOLERANCE) continue;

    const minX = box.x - box.sx / 2 - PLAYER_RADIUS;
    const maxX = box.x + box.sx / 2 + PLAYER_RADIUS;
    const minZ = box.z - box.sz / 2 - PLAYER_RADIUS;
    const maxZ = box.z + box.sz / 2 + PLAYER_RADIUS;

    if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;

    // Push out along the axis of least penetration.
    const penLeft = nx - minX;
    const penRight = maxX - nx;
    const penFront = nz - minZ;
    const penBack = maxZ - nz;
    const minPen = Math.min(penLeft, penRight, penFront, penBack);

    if (minPen === penLeft) nx = minX;
    else if (minPen === penRight) nx = maxX;
    else if (minPen === penFront) nz = minZ;
    else nz = maxZ;
  }

  const clampMax = ARENA_HALF_SIZE - PLAYER_RADIUS;
  nx = Math.max(-clampMax, Math.min(clampMax, nx));
  nz = Math.max(-clampMax, Math.min(clampMax, nz));

  return { x: nx, z: nz };
}
