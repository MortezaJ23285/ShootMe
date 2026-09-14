import { PLAYER_HEIGHT, PLAYER_RADIUS, Vec3, type ArenaBox } from '@shootme/shared';

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// Slab method ray-AABB intersection. Returns entry distance or null.
function rayIntersectsBox(origin: Vec3, dir: Vec3, box: ArenaBox): number | null {
  const minX = box.x - box.sx / 2;
  const maxX = box.x + box.sx / 2;
  const minY = box.y;
  const maxY = box.y + box.sy;
  const minZ = box.z - box.sz / 2;
  const maxZ = box.z + box.sz / 2;

  let tMin = -Infinity;
  let tMax = Infinity;

  const axes: Array<['x' | 'y' | 'z', number, number]> = [
    ['x', minX, maxX],
    ['y', minY, maxY],
    ['z', minZ, maxZ],
  ];

  for (const [axis, lo, hi] of axes) {
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin >= 0 ? tMin : tMax >= 0 ? tMax : null;
}

// Ray vs. a finite vertical cylinder spanning the player's full standing height —
// a much closer approximation of a humanoid hitbox than a single sphere, and one
// that correctly gets hit by a level shot at any height between feet and head.
function rayIntersectsPlayer(origin: Vec3, dir: Vec3, playerPos: Vec3): { dist: number; headshot: boolean } | null {
  const radius = PLAYER_RADIUS * 1.3;
  const feetY = playerPos.y;
  const headY = playerPos.y + PLAYER_HEIGHT;

  const ox = origin.x - playerPos.x;
  const oz = origin.z - playerPos.z;

  const a = dir.x * dir.x + dir.z * dir.z;
  const b = 2 * (ox * dir.x + oz * dir.z);
  const c = ox * ox + oz * oz - radius * radius;

  let t: number | null = null;

  if (a < 1e-8) {
    // Ray is (near-)vertical — no side-wall intersection with the cylinder possible.
    if (c > 0) return null;
    t = 0;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t0 = (-b - sqrtDisc) / (2 * a);
    const t1 = (-b + sqrtDisc) / (2 * a);
    for (const candidate of [t0, t1]) {
      if (candidate < 0) continue;
      const hitY = origin.y + dir.y * candidate;
      if (hitY >= feetY && hitY <= headY) {
        t = candidate;
        break;
      }
    }
    if (t === null) return null;
  }

  const hitY = origin.y + dir.y * t;
  const headThreshold = feetY + PLAYER_HEIGHT * 0.85;
  return { dist: t, headshot: hitY >= headThreshold };
}

// Applies a small random cone-shaped jitter to a direction vector for shotgun-style
// pellet spread. `spreadDeg` is the cone's half-angle.
export function jitterDirection(dir: Vec3, spreadDeg: number): Vec3 {
  const n = normalize(dir);
  const spreadRad = (spreadDeg * Math.PI) / 180;

  // Build an arbitrary basis perpendicular to n.
  const up = Math.abs(n.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const right = normalize({
    x: n.y * up.z - n.z * up.y,
    y: n.z * up.x - n.x * up.z,
    z: n.x * up.y - n.y * up.x,
  });
  const trueUp = {
    x: n.y * right.z - n.z * right.y,
    y: n.z * right.x - n.x * right.z,
    z: n.x * right.y - n.y * right.x,
  };

  const angle = Math.random() * spreadRad;
  const rot = Math.random() * Math.PI * 2;
  const sinA = Math.sin(angle);
  const offsetX = Math.cos(rot) * sinA;
  const offsetY = Math.sin(rot) * sinA;
  const cosA = Math.cos(angle);

  return normalize({
    x: n.x * cosA + right.x * offsetX + trueUp.x * offsetY,
    y: n.y * cosA + right.y * offsetX + trueUp.y * offsetY,
    z: n.z * cosA + right.z * offsetX + trueUp.z * offsetY,
  });
}

export interface RaycastTarget {
  id: string;
  pos: Vec3;
}

export interface RaycastHit {
  targetId: string;
  distance: number;
  headshot: boolean;
}

// Casts a ray from origin in dir (normalized) up to maxRange, ignoring `excludeId`.
// Returns the nearest player hit, or null if a wall was hit first or nothing was hit.
// `arenaBoxes` must be the calling Room's own map — with multiple concurrently
// running Rooms (one per map), a shared/global box list would occlude shots
// against the wrong map's walls.
export function castHitscanRay(
  origin: Vec3,
  rawDir: Vec3,
  maxRange: number,
  targets: RaycastTarget[],
  excludeId: string,
  arenaBoxes: ArenaBox[],
): RaycastHit | null {
  const dir = normalize(rawDir);

  let nearestWallDist = Infinity;
  for (const box of arenaBoxes) {
    const d = rayIntersectsBox(origin, dir, box);
    if (d !== null && d < nearestWallDist) nearestWallDist = d;
  }

  let best: RaycastHit | null = null;
  for (const target of targets) {
    if (target.id === excludeId) continue;
    const hit = rayIntersectsPlayer(origin, dir, target.pos);
    if (!hit || hit.dist > maxRange || hit.dist > nearestWallDist) continue;
    if (!best || hit.dist < best.distance) {
      best = { targetId: target.id, distance: hit.dist, headshot: hit.headshot };
    }
  }
  return best;
}
