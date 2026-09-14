// Wire protocol between client and server. Plain JSON over WebSocket — small message
// set, one room, one game mode. Every message has a `t` (type) discriminant.

import type { WeaponId } from './constants.js';
import type { MapId } from './maps.js';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerPublicState {
  id: string;
  name: string;
  color: number;
  pos: Vec3;
  yaw: number;
  pitch: number;
  health: number;
  kills: number;
  deaths: number;
  alive: boolean;
  currentWeaponId: WeaponId;
}

// ---------- Client -> Server ----------

export interface JoinMsg {
  t: 'join';
  name: string;
  mapId: MapId;
}

export interface InputStateMsg {
  t: 'input';
  pos: Vec3;
  yaw: number;
  pitch: number;
  moving: boolean;
  ts: number;
}

export interface ShootMsg {
  t: 'shoot';
  weaponId: WeaponId;
  origin: Vec3;
  dir: Vec3;
  ts: number;
}

export interface ReloadMsg {
  t: 'reload';
  weaponId: WeaponId;
}

export interface SwitchWeaponMsg {
  t: 'switchWeapon';
  weaponId: WeaponId;
  ts: number;
}

export type ClientMessage = JoinMsg | InputStateMsg | ShootMsg | ReloadMsg | SwitchWeaponMsg;

// ---------- Server -> Client ----------

export interface WelcomeMsg {
  t: 'welcome';
  id: string;
  color: number;
  players: PlayerPublicState[];
  mapId: MapId;
  arenaHalfSize: number;
  matchEndsAt: number;
  killLimit: number;
}

export interface PlayerJoinedMsg {
  t: 'playerJoined';
  player: PlayerPublicState;
}

export interface PlayerLeftMsg {
  t: 'playerLeft';
  id: string;
}

export interface SnapshotMsg {
  t: 'snapshot';
  ts: number;
  players: Pick<PlayerPublicState, 'id' | 'pos' | 'yaw' | 'pitch' | 'health' | 'alive'>[];
}

export interface HitConfirmMsg {
  t: 'hitConfirm';
  weaponId: WeaponId;
  targetId: string;
  damage: number;
  targetHealthAfter: number;
  headshot: boolean;
}

export interface WeaponSwitchedMsg {
  t: 'weaponSwitched';
  id: string;
  weaponId: WeaponId;
}

export interface KillFeedMsg {
  t: 'kill';
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  headshot: boolean;
}

export interface DeathMsg {
  t: 'death';
  victimId: string;
  respawnAt: number;
}

export interface RespawnMsg {
  t: 'respawn';
  id: string;
  pos: Vec3;
}

export interface ScoreUpdateMsg {
  t: 'score';
  id: string;
  kills: number;
  deaths: number;
}

export interface AmmoRejectMsg {
  t: 'ammoReject';
  weaponId: WeaponId;
}

export interface MatchEndMsg {
  t: 'matchEnd';
  leaderboard: { id: string; name: string; kills: number; deaths: number }[];
}

export interface MatchStartMsg {
  t: 'matchStart';
  matchEndsAt: number;
}

export type ServerMessage =
  | WelcomeMsg
  | PlayerJoinedMsg
  | PlayerLeftMsg
  | SnapshotMsg
  | HitConfirmMsg
  | KillFeedMsg
  | DeathMsg
  | RespawnMsg
  | ScoreUpdateMsg
  | AmmoRejectMsg
  | MatchEndMsg
  | MatchStartMsg
  | WeaponSwitchedMsg;
