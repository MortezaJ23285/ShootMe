import type { WebSocket } from 'ws';
import {
  ARENA_HALF_SIZE,
  KILL_LIMIT,
  MATCH_DURATION_MS,
  NETWORK,
  RESPAWN_DELAY_MS,
  SPAWN_POINTS,
  WEAPONS,
  type ClientMessage,
  type PlayerPublicState,
  type ServerMessage,
  type Vec3,
  type WeaponId,
} from '@shootme/shared';
import { Player, nextColor } from '../players/Player.js';
import { castHitscanRay, jitterDirection } from '../weapons/raycast.js';

function randomSpawn(existing: Player[]): { x: number; y: number; z: number } {
  let best = SPAWN_POINTS[0];
  let bestScore = -Infinity;
  const candidates = [...SPAWN_POINTS].sort(() => Math.random() - 0.5).slice(0, 5);
  for (const candidate of candidates) {
    let minDist = Infinity;
    for (const p of existing) {
      if (!p.alive) continue;
      const d = Math.hypot(p.pos.x - candidate.x, p.pos.z - candidate.z);
      minDist = Math.min(minDist, d);
    }
    const score = minDist === Infinity ? 999 : minDist;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return { x: best.x, y: best.y, z: best.z };
}

function toPublicState(p: Player): PlayerPublicState {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    pos: p.pos,
    yaw: p.yaw,
    pitch: p.pitch,
    health: p.health,
    kills: p.kills,
    deaths: p.deaths,
    alive: p.alive,
    currentWeaponId: p.currentWeaponId,
  };
}

export class Room {
  players = new Map<string, Player>();
  matchEndsAt = Date.now() + MATCH_DURATION_MS;
  matchOver = false;

  private snapshotTimer: ReturnType<typeof setInterval>;
  private matchCheckTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.snapshotTimer = setInterval(() => this.broadcastSnapshot(), 1000 / NETWORK.snapshotSendHz);
    this.matchCheckTimer = setInterval(() => this.checkMatchEnd(), 1000);
  }

  private broadcast(msg: ServerMessage, exclude?: string) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.id === exclude) continue;
      if (p.ws.readyState === p.ws.OPEN) p.ws.send(data);
    }
  }

  handleConnection(ws: WebSocket, id: string) {
    ws.on('message', (raw: Buffer) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage(id, ws, msg);
    });

    ws.on('close', () => {
      this.handleDisconnect(id);
    });
  }

  private handleMessage(id: string, ws: WebSocket, msg: ClientMessage) {
    if (msg.t === 'join') {
      this.handleJoin(id, ws, msg.name);
      return;
    }

    const player = this.players.get(id);
    if (!player) return;

    switch (msg.t) {
      case 'input':
        if (player.alive) {
          const clampedX = Math.max(-ARENA_HALF_SIZE, Math.min(ARENA_HALF_SIZE, msg.pos.x));
          const clampedZ = Math.max(-ARENA_HALF_SIZE, Math.min(ARENA_HALF_SIZE, msg.pos.z));
          player.pos = { x: clampedX, y: msg.pos.y, z: clampedZ };
          player.yaw = msg.yaw;
          player.pitch = msg.pitch;
          player.moving = msg.moving;
          player.lastInputTs = Date.now();
        }
        break;
      case 'shoot':
        this.handleShoot(player, msg.origin, msg.dir, msg.weaponId);
        break;
      case 'reload':
        this.handleReload(player, msg.weaponId);
        break;
      case 'switchWeapon':
        this.handleSwitchWeapon(player, msg.weaponId);
        break;
    }
  }

  private handleJoin(id: string, ws: WebSocket, name: string) {
    const color = nextColor();
    const player = new Player(id, ws, name, color);
    player.pos = randomSpawn([...this.players.values()]);
    this.players.set(id, player);

    player.send({
      t: 'welcome',
      id,
      color,
      players: [...this.players.values()].map(toPublicState),
      arenaHalfSize: ARENA_HALF_SIZE,
      matchEndsAt: this.matchEndsAt,
      killLimit: KILL_LIMIT,
    } satisfies ServerMessage);

    this.broadcast({ t: 'playerJoined', player: toPublicState(player) }, id);
  }

  private handleDisconnect(id: string) {
    if (this.players.delete(id)) {
      this.broadcast({ t: 'playerLeft', id });
    }
  }

  private handleReload(player: Player, weaponId: WeaponId) {
    const def = WEAPONS[weaponId];
    if (!def || weaponId !== player.currentWeaponId || !player.alive) return;
    if (player.reloading[weaponId] || player.ammo[weaponId] === def.magazineSize) return;
    if (Date.now() < player.switchingUntil) return;

    player.reloading[weaponId] = true;
    player.reloadEndsAt[weaponId] = Date.now() + def.reloadTimeMs;
    setTimeout(() => {
      if (player.reloading[weaponId]) {
        player.ammo[weaponId] = def.magazineSize;
        player.reloading[weaponId] = false;
      }
    }, def.reloadTimeMs);
  }

  private handleSwitchWeapon(player: Player, weaponId: WeaponId) {
    const def = WEAPONS[weaponId];
    if (!def || !player.alive) return;
    if (weaponId === player.currentWeaponId) return;
    if (Date.now() < player.switchingUntil) return;

    // Switching cancels any in-progress reload of the weapon being holstered.
    player.reloading[player.currentWeaponId] = false;
    player.currentWeaponId = weaponId;
    player.switchingUntil = Date.now() + def.switchTimeMs;

    this.broadcast({ t: 'weaponSwitched', id: player.id, weaponId } satisfies ServerMessage);
  }

  private handleShoot(player: Player, origin: Vec3, dir: Vec3, weaponId: WeaponId) {
    const def = WEAPONS[weaponId];
    if (!def || !player.alive || weaponId !== player.currentWeaponId) return;
    if (player.reloading[weaponId]) return;
    const now = Date.now();
    if (now < player.switchingUntil) return;
    if (now - player.lastShotAt[weaponId] < def.fireRateMs - 15) return;
    if (player.ammo[weaponId] <= 0) {
      player.send({ t: 'ammoReject', weaponId } satisfies ServerMessage);
      return;
    }

    player.lastShotAt[weaponId] = now;
    player.ammo[weaponId] -= 1;

    const targets = [...this.players.values()]
      .filter((p) => p.alive)
      .map((p) => ({ id: p.id, pos: p.pos }));

    const pelletCount = def.pellets ?? 1;
    const damagePerTarget = new Map<string, { damage: number; headshot: boolean }>();

    for (let i = 0; i < pelletCount; i++) {
      const pelletDir = def.spreadDeg ? jitterDirection(dir, def.spreadDeg) : dir;
      const hit = castHitscanRay(origin, pelletDir, def.range, targets, player.id);
      if (!hit) continue;
      const pelletDamage = Math.round(def.damage * (hit.headshot ? def.headshotMultiplier : 1));
      const existing = damagePerTarget.get(hit.targetId);
      if (existing) {
        existing.damage += pelletDamage;
        existing.headshot = existing.headshot || hit.headshot;
      } else {
        damagePerTarget.set(hit.targetId, { damage: pelletDamage, headshot: hit.headshot });
      }
    }

    for (const [targetId, { damage, headshot }] of damagePerTarget) {
      const target = this.players.get(targetId);
      if (!target || !target.alive) continue;

      target.health = Math.max(0, target.health - damage);

      this.broadcast({
        t: 'hitConfirm',
        weaponId,
        targetId: target.id,
        damage,
        targetHealthAfter: target.health,
        headshot,
      } satisfies ServerMessage);

      if (target.health <= 0) {
        this.killPlayer(player, target, headshot);
      }
    }
  }

  private killPlayer(killer: Player, victim: Player, headshot: boolean) {
    victim.alive = false;
    victim.deaths += 1;
    killer.kills += 1;
    victim.respawnAt = Date.now() + RESPAWN_DELAY_MS;

    this.broadcast({
      t: 'kill',
      killerId: killer.id,
      killerName: killer.name,
      victimId: victim.id,
      victimName: victim.name,
      headshot,
    } satisfies ServerMessage);

    this.broadcast({ t: 'death', victimId: victim.id, respawnAt: victim.respawnAt } satisfies ServerMessage);
    this.broadcast({ t: 'score', id: killer.id, kills: killer.kills, deaths: killer.deaths } satisfies ServerMessage);
    this.broadcast({ t: 'score', id: victim.id, kills: victim.kills, deaths: victim.deaths } satisfies ServerMessage);

    setTimeout(() => {
      if (!this.players.has(victim.id)) return;
      const pos = randomSpawn([...this.players.values()]);
      victim.resetForRespawn(pos);
      this.broadcast({ t: 'respawn', id: victim.id, pos } satisfies ServerMessage);
    }, RESPAWN_DELAY_MS);

    if (killer.kills >= KILL_LIMIT) {
      this.endMatch();
    }
  }

  private broadcastSnapshot() {
    if (this.players.size === 0) return;
    this.broadcast({
      t: 'snapshot',
      ts: Date.now(),
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        pos: p.pos,
        yaw: p.yaw,
        pitch: p.pitch,
        health: p.health,
        alive: p.alive,
      })),
    });
  }

  private checkMatchEnd() {
    if (this.matchOver) return;
    if (Date.now() >= this.matchEndsAt) {
      this.endMatch();
    }
  }

  private endMatch() {
    if (this.matchOver) return;
    this.matchOver = true;

    const leaderboard = [...this.players.values()]
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map((p) => ({ id: p.id, name: p.name, kills: p.kills, deaths: p.deaths }));

    this.broadcast({ t: 'matchEnd', leaderboard });

    setTimeout(() => this.restartMatch(), 8000);
  }

  private restartMatch() {
    this.matchOver = false;
    this.matchEndsAt = Date.now() + MATCH_DURATION_MS;
    for (const p of this.players.values()) {
      p.kills = 0;
      p.deaths = 0;
      p.resetForRespawn(randomSpawn([]));
    }
    this.broadcast({ t: 'matchStart', matchEndsAt: this.matchEndsAt });
    for (const p of this.players.values()) {
      this.broadcast({ t: 'respawn', id: p.id, pos: p.pos });
    }
  }
}
