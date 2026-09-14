import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  MATCH_DURATION_MS,
  NETWORK,
  WEAPONS,
  WEAPON_IDS,
  DEFAULT_WEAPON_ID,
  type PlayerPublicState,
  type Vec3,
  type WeaponId,
  type MapData,
} from '@shootme/shared';
import { NetClient } from '../network/NetClient.js';
import { UIManager } from '../ui/UIManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { buildArena, setupLighting } from '../maps/ArenaBuilder.js';
import { setActiveMap } from '../physics/collision.js';
import { LocalController } from '../entities/LocalController.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import type { WeaponView } from '../weapons/WeaponView.js';
import { createWeaponView } from '../weapons/WeaponRegistry.js';
import { TracerPool } from '../effects/Tracer.js';
import { ImpactEffectPool } from '../effects/ImpactEffect.js';
import { PostFX } from '../render/PostFX.js';

interface SwitchState {
  from: WeaponId;
  to: WeaponId;
  startedAt: number;
  duration: number;
  swapped: boolean;
}

export class Game {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private postfx: PostFX;
  private clock = new THREE.Clock();

  private controller: LocalController;
  private weapons = new Map<WeaponId, WeaponView>();
  private currentWeaponId: WeaponId = DEFAULT_WEAPON_ID;
  private switching: SwitchState | null = null;
  private tracers: TracerPool;
  private impacts: ImpactEffectPool;
  private sound = new SoundManager();

  private remotePlayers = new Map<string, RemotePlayer>();
  private playerMeta = new Map<string, PlayerPublicState>();

  private myId = '';
  private myName = '';
  private alive = true;
  private health = 100;
  private kills = 0;
  private deaths = 0;
  private matchEndsAt = Date.now() + MATCH_DURATION_MS;

  private lastInputSent = 0;
  private running = false;
  private lockPromptEl: HTMLElement;
  private lastHudSignature = '';

  constructor(
    private container: HTMLElement,
    private net: NetClient,
    private ui: UIManager,
    private onExitToMenu: () => void,
    private mapData: MapData,
  ) {
    // Far plane and fog/shadow distances (set in ArenaBuilder) both scale with the
    // chosen map's size — this covers the largest map (halfSize ~85) with margin.
    this.camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.05, 400);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // No pixel-ratio cap — this game targets visual fidelity over minimum GPU support.
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    setActiveMap(mapData.boxes, mapData.halfSize);
    setupLighting(this.scene, mapData.halfSize);
    buildArena(this.scene, mapData);
    this.scene.add(this.camera); // weapon view-models are parented to the camera

    // A cheap procedural environment map so metallic PBR materials (weapon parts,
    // arena trim) have something to reflect — without one, metalness > 0 renders
    // as near-black since there's no direct specular hit most of the time.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.postfx = new PostFX(this.renderer, this.scene, this.camera, window.innerWidth, window.innerHeight);

    this.controller = new LocalController(this.camera, this.renderer.domElement);
    this.controller.setJumpCallback(() => this.sound.jump());

    for (const id of WEAPON_IDS) {
      const view = createWeaponView(id, this.camera);
      const isDefault = id === DEFAULT_WEAPON_ID;
      view.group.visible = isDefault;
      view.setSwitchProgress(isDefault ? 1 : 0);
      this.weapons.set(id, view);
    }

    this.tracers = new TracerPool(this.scene);
    this.impacts = new ImpactEffectPool(this.scene);

    this.lockPromptEl = document.createElement('div');
    this.lockPromptEl.textContent = 'Click to resume';
    Object.assign(this.lockPromptEl.style, {
      position: 'fixed',
      inset: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '20px',
      fontWeight: '700',
      background: 'rgba(10,12,16,0.35)',
      zIndex: '18',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    container.appendChild(this.lockPromptEl);
    this.lockPromptEl.addEventListener('click', () => this.controller.requestLock());

    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (!this.controller.isLocked()) {
        this.controller.requestLock();
        return;
      }
      this.tryShoot();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' || e.key.toLowerCase() === 'r') this.tryReload();
      if (e.code === 'Digit1' || e.key === '1') this.trySwitchWeapon('rifle');
      if (e.code === 'Digit2' || e.key === '2') this.trySwitchWeapon('shotgun');
      if (e.code === 'Digit3' || e.key === '3') this.trySwitchWeapon('pistol');
    });
    document.addEventListener('pointerlockchange', () => {
      this.lockPromptEl.style.display = document.pointerLockElement ? 'none' : this.alive ? 'flex' : 'none';
    });
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postfx.resize(window.innerWidth, window.innerHeight);
  }

  start(welcomePlayers: PlayerPublicState[], myId: string, myName: string, matchEndsAt: number) {
    this.myId = myId;
    this.myName = myName;
    this.matchEndsAt = matchEndsAt;
    this.running = true;

    for (const p of welcomePlayers) {
      if (p.id === myId) {
        this.controller.teleport(p.pos);
        this.health = p.health;
        this.kills = p.kills;
        this.deaths = p.deaths;
      } else {
        this.addRemote(p);
      }
    }

    this.bindNetwork();
    this.ui.showHUD();
    this.controller.requestLock();
    this.updateHudStatic();
    this.loop();
  }

  private addRemote(p: PlayerPublicState) {
    const rp = new RemotePlayer(p.id, p.name, p.color, this.scene, p.pos, p.yaw);
    rp.setAlive(p.alive);
    this.remotePlayers.set(p.id, rp);
    this.playerMeta.set(p.id, p);
  }

  private bindNetwork() {
    this.net.on('playerJoined', (msg) => {
      this.addRemote(msg.player);
    });

    this.net.on('playerLeft', (msg) => {
      const rp = this.remotePlayers.get(msg.id);
      if (rp) {
        rp.dispose(this.scene);
        this.remotePlayers.delete(msg.id);
      }
      this.playerMeta.delete(msg.id);
    });

    this.net.on('snapshot', (msg) => {
      for (const p of msg.players) {
        if (p.id === this.myId) continue;
        const rp = this.remotePlayers.get(p.id);
        if (!rp) continue;
        rp.setTarget(p.pos, p.yaw);
        rp.setAlive(p.alive);
      }
    });

    this.net.on('hitConfirm', (msg) => {
      if (msg.targetId === this.myId) {
        this.health = msg.targetHealthAfter;
        this.ui.updateHealth(this.health);
        this.ui.showDamageFlash();
        this.sound.damaged();
      }
    });

    this.net.on('kill', (msg) => {
      const meta = this.playerMeta.get(msg.victimId);
      if (meta) meta.alive = false;
      const rp = this.remotePlayers.get(msg.victimId);
      rp?.setAlive(false);

      this.ui.addKillFeed(msg.killerName, msg.victimName, msg.headshot, msg.killerId === this.myId, msg.victimId === this.myId);
      if (msg.killerId === this.myId) {
        this.sound.kill();
      }
    });

    this.net.on('death', (msg) => {
      if (msg.victimId === this.myId) {
        this.alive = false;
        this.sound.death();
        this.ui.showDeathOverlay('', msg.respawnAt - Date.now());
        document.exitPointerLock();
      }
    });

    this.net.on('respawn', (msg) => {
      const meta = this.playerMeta.get(msg.id);
      if (meta) meta.alive = true;
      if (msg.id === this.myId) {
        this.alive = true;
        this.health = 100;
        this.controller.teleport(msg.pos);
        this.ui.hideDeathOverlay();
        this.ui.updateHealth(this.health);
        this.controller.requestLock();
      } else {
        this.remotePlayers.get(msg.id)?.setAlive(true);
      }
    });

    this.net.on('score', (msg) => {
      if (msg.id === this.myId) {
        this.kills = msg.kills;
        this.deaths = msg.deaths;
        this.ui.updateKD(this.kills, this.deaths);
      }
      const meta = this.playerMeta.get(msg.id);
      if (meta) {
        meta.kills = msg.kills;
        meta.deaths = msg.deaths;
      }
    });

    this.net.on('ammoReject', () => {
      this.sound.dryFire();
    });

    this.net.on('matchStart', (msg) => {
      this.matchEndsAt = msg.matchEndsAt;
      this.kills = 0;
      this.deaths = 0;
      this.ui.updateKD(0, 0);
      this.ui.showHUD();
      this.controller.requestLock();
    });

    this.net.on('matchEnd', (msg) => {
      const rows = msg.leaderboard;
      this.ui.showMatchEnd(rows, this.myId);
      document.exitPointerLock();
    });
  }

  private updateHudStatic() {
    this.ui.updateHealth(this.health);
    this.refreshWeaponHud();
    this.ui.updateKD(this.kills, this.deaths);
  }

  private refreshWeaponHud() {
    const ammo = {} as Record<WeaponId, number>;
    const reloading = {} as Record<WeaponId, boolean>;
    for (const [id, view] of this.weapons) {
      ammo[id] = view.ammo;
      reloading[id] = view.reloading;
    }
    this.ui.updateWeaponSlots(this.currentWeaponId, ammo, reloading);
  }

  private trySwitchWeapon(id: WeaponId) {
    if (!this.alive || this.switching || id === this.currentWeaponId) return;
    const def = WEAPONS[id];
    this.switching = { from: this.currentWeaponId, to: id, startedAt: performance.now(), duration: def.switchTimeMs, swapped: false };
    this.net.send({ t: 'switchWeapon', weaponId: id, ts: Date.now() });
  }

  private updateSwitching(now: number) {
    if (!this.switching) return;
    const s = this.switching;
    const elapsed = now - s.startedAt;
    const half = s.duration / 2;

    if (elapsed < half) {
      this.weapons.get(s.from)!.setSwitchProgress(1 - elapsed / half);
    } else {
      if (!s.swapped) {
        const fromView = this.weapons.get(s.from)!;
        fromView.group.visible = false;
        fromView.setSwitchProgress(0);
        this.weapons.get(s.to)!.group.visible = true;
        s.swapped = true;
      }
      this.weapons.get(s.to)!.setSwitchProgress(Math.min(1, (elapsed - half) / half));
      if (elapsed >= s.duration) {
        this.currentWeaponId = s.to;
        this.switching = null;
      }
    }
  }

  // Small cone-jitter for cosmetic client-side pellet spread (tracers + optimistic
  // hit feedback only). The server independently jitters for authoritative hits.
  private jitterDirection(dir: THREE.Vector3, spreadDeg: number): THREE.Vector3 {
    const spreadRad = THREE.MathUtils.degToRad(spreadDeg);
    const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const trueUp = new THREE.Vector3().crossVectors(right, dir).normalize();
    const angle = Math.random() * spreadRad;
    const rot = Math.random() * Math.PI * 2;
    const sinA = Math.sin(angle);
    return dir
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(right, Math.cos(rot) * sinA)
      .addScaledVector(trueUp, Math.sin(rot) * sinA)
      .normalize();
  }

  private tryShoot() {
    if (!this.alive || this.switching) return;
    const now = performance.now();
    const weapon = this.weapons.get(this.currentWeaponId)!;
    const def = WEAPONS[this.currentWeaponId];
    if (!weapon.canFire(now)) {
      if (weapon.ammo <= 0 && !weapon.reloading) this.sound.dryFire();
      return;
    }
    weapon.fire(now);
    this.sound.shoot(this.currentWeaponId);
    this.refreshWeaponHud();

    const origin = this.camera.position.clone();
    const aimDir = this.controller.getForwardVector();

    const meshes: THREE.Object3D[] = [];
    for (const rp of this.remotePlayers.values()) {
      if (rp.alive) meshes.push(rp.group);
    }

    const pelletCount = def.pellets ?? 1;
    let hitAny = false;
    let bestHitPoint: THREE.Vector3 | null = null;

    for (let i = 0; i < pelletCount; i++) {
      const dir = def.spreadDeg ? this.jitterDirection(aimDir, def.spreadDeg) : aimDir;
      const range = Math.min(def.range, 40);
      const from = origin.clone().addScaledVector(dir, 0.4);
      const to = origin.clone().addScaledVector(dir, range);
      this.tracers.fire(from, to);

      // Optimistic local hit marker: raycast against known remote player groups for
      // instant feedback. The server remains authoritative for actual damage/kills.
      const raycaster = new THREE.Raycaster(origin, dir, 0, def.range);
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        hitAny = true;
        bestHitPoint = hits[0].point;
        this.impacts.spawn(hits[0].point);
      }
    }

    if (hitAny) {
      this.ui.showHitMarker(false);
      this.sound.hitMarker();
      void bestHitPoint;
    }

    const originMsg: Vec3 = { x: origin.x, y: origin.y, z: origin.z };
    const dirMsg: Vec3 = { x: aimDir.x, y: aimDir.y, z: aimDir.z };
    this.net.send({ t: 'shoot', weaponId: this.currentWeaponId, origin: originMsg, dir: dirMsg, ts: Date.now() });
  }

  private tryReload() {
    if (!this.alive || this.switching) return;
    const weapon = this.weapons.get(this.currentWeaponId)!;
    const def = WEAPONS[this.currentWeaponId];
    if (weapon.ammo === def.magazineSize || weapon.reloading) return;
    weapon.startReload(performance.now());
    this.sound.reload();
    this.net.send({ t: 'reload', weaponId: this.currentWeaponId });
  }

  private sendInput() {
    const now = performance.now();
    const interval = 1000 / NETWORK.inputSendHz;
    if (now - this.lastInputSent < interval) return;
    this.lastInputSent = now;

    this.net.send({
      t: 'input',
      pos: { x: this.controller.position.x, y: this.controller.position.y, z: this.controller.position.z },
      yaw: this.controller.yaw,
      pitch: this.controller.pitch,
      moving: this.controller.moving,
      ts: Date.now(),
    });
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    const now = performance.now();

    if (this.alive) {
      this.controller.update(dt);
      this.sendInput();
    }

    this.updateSwitching(now);
    for (const view of this.weapons.values()) {
      view.update(dt, now, this.controller.moving, this.controller.sprinting);
    }
    this.tracers.update(dt);
    this.impacts.update(dt);

    for (const rp of this.remotePlayers.values()) rp.update(dt);

    let sig = this.currentWeaponId;
    for (const [id, view] of this.weapons) sig += `|${id}:${view.ammo}:${view.reloading ? 1 : 0}`;
    if (sig !== this.lastHudSignature) {
      this.lastHudSignature = sig;
      this.refreshWeaponHud();
    }

    this.ui.updateTimer(this.matchEndsAt - Date.now());
    this.ui.updateScoreboard(
      [...this.playerMeta.values(), { id: this.myId, name: this.myName, kills: this.kills, deaths: this.deaths } as PlayerPublicState],
      this.myId,
    );

    this.postfx.render();
  };

  dispose() {
    this.running = false;
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.lockPromptEl.remove();
  }
}
