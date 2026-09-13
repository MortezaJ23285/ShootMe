import type { WebSocket } from 'ws';
import { PLAYER_MAX_HEALTH, WEAPONS, WEAPON_IDS, DEFAULT_WEAPON_ID, type Vec3, type WeaponId } from '@shootme/shared';

const NAME_COLORS = [0xd97757, 0x6fbf8b, 0xe8c15a, 0x7ea6d9, 0xc98bd6, 0xef7f9a, 0x7fd6c9, 0xf0a15a];
let colorCursor = 0;

export function nextColor(): number {
  const c = NAME_COLORS[colorCursor % NAME_COLORS.length];
  colorCursor++;
  return c;
}

export class Player {
  id: string;
  ws: WebSocket;
  name: string;
  color: number;

  pos: Vec3 = { x: 0, y: 0, z: 0 };
  yaw = 0;
  pitch = 0;
  moving = false;

  health = PLAYER_MAX_HEALTH;
  alive = true;
  kills = 0;
  deaths = 0;

  currentWeaponId: WeaponId = DEFAULT_WEAPON_ID;
  switchingUntil = 0;
  ammo: Record<WeaponId, number> = makeFullAmmo();
  reloading: Record<WeaponId, boolean> = { rifle: false, shotgun: false, pistol: false };
  reloadEndsAt: Record<WeaponId, number> = { rifle: 0, shotgun: 0, pistol: 0 };
  lastShotAt: Record<WeaponId, number> = { rifle: 0, shotgun: 0, pistol: 0 };
  respawnAt = 0;

  lastInputTs = Date.now();

  constructor(id: string, ws: WebSocket, name: string, color: number) {
    this.id = id;
    this.ws = ws;
    this.name = name.slice(0, 16) || 'Player';
    this.color = color;
  }

  send(data: unknown) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  resetForRespawn(pos: Vec3) {
    this.pos = pos;
    this.health = PLAYER_MAX_HEALTH;
    this.alive = true;
    this.ammo = makeFullAmmo();
    this.reloading = { rifle: false, shotgun: false, pistol: false };
    this.switchingUntil = 0;
  }
}

function makeFullAmmo(): Record<WeaponId, number> {
  const ammo = {} as Record<WeaponId, number>;
  for (const id of WEAPON_IDS) ammo[id] = WEAPONS[id].magazineSize;
  return ammo;
}
