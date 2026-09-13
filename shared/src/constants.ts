// Constants shared by client (prediction/rendering) and server (authoritative simulation).
// Keep this the single source of truth — never redefine these values locally.

export const TICK_RATE_HZ = 20;
export const TICK_MS = 1000 / TICK_RATE_HZ;

export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RADIUS = 0.4;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.62;

export const MOVE_SPEED = 6.0;
export const SPRINT_MULTIPLIER = 1.5;
export const JUMP_SPEED = 7.5;
export const GRAVITY = 20.0;

export const RESPAWN_DELAY_MS = 3000;
export const MATCH_DURATION_MS = 3 * 60 * 1000;
export const KILL_LIMIT = 20;

export type WeaponId = 'rifle' | 'shotgun' | 'pistol';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;
  fireRateMs: number;
  magazineSize: number;
  reloadTimeMs: number;
  range: number;
  headshotMultiplier: number;
  switchTimeMs: number;
  /** Number of independent hitscan rays per shot (shotgun-style spread). Omitted = 1. */
  pellets?: number;
  /** Cone half-angle in degrees applied per pellet when `pellets` is set. */
  spreadDeg?: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    damage: 18,
    fireRateMs: 130,
    magazineSize: 24,
    reloadTimeMs: 1600,
    range: 100,
    headshotMultiplier: 1.6,
    switchTimeMs: 350,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    damage: 9,
    fireRateMs: 850,
    magazineSize: 6,
    reloadTimeMs: 2200,
    range: 22,
    headshotMultiplier: 1.4,
    switchTimeMs: 350,
    pellets: 8,
    spreadDeg: 6,
  },
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    damage: 14,
    fireRateMs: 200,
    magazineSize: 12,
    reloadTimeMs: 1100,
    range: 80,
    headshotMultiplier: 1.8,
    switchTimeMs: 250,
  },
} as const;

export const DEFAULT_WEAPON_ID: WeaponId = 'rifle';

export const WEAPON_IDS: WeaponId[] = ['rifle', 'shotgun', 'pistol'];

export const ARENA_HALF_SIZE = 30;

export const NETWORK = {
  inputSendHz: 20,
  snapshotSendHz: 15,
} as const;
