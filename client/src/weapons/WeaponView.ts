import * as THREE from 'three';
import { WEAPONS, type WeaponId } from '@shootme/shared';

export interface WeaponView {
  readonly id: WeaponId;
  readonly group: THREE.Group;
  ammo: number;
  reloading: boolean;
  reloadEndsAt: number;
  lastShotAt: number;

  canFire(now: number): boolean;
  fire(now: number): void;
  startReload(now: number): void;
  update(dt: number, now: number, moving: boolean, sprinting: boolean): void;
  /** 1 = fully raised/deployed, 0 = fully lowered. Driven by Game's switch state machine. */
  setSwitchProgress(t: number): void;
}

// Shared behavior for every weapon: ammo/reload bookkeeping, muzzle flash, recoil
// ease, idle/movement bob, reload tilt, and the raise/lower switch transform.
// Concrete weapons subclass this and only add their own geometry + fire quirks
// (pump-slide, slide-rack, etc.) via the `onFire`/`onUpdate` hooks.
export abstract class BaseWeaponView implements WeaponView {
  readonly id: WeaponId;
  group = new THREE.Group();

  protected muzzleFlash: THREE.PointLight;
  protected muzzleSprite: THREE.Sprite;
  private muzzleTimer = 0;
  private bobT = 0;
  private recoil = 0;
  private switchT = 1;

  ammo: number;
  reloading = false;
  reloadEndsAt = 0;
  lastShotAt = -Infinity;

  /** Camera-relative resting position for this weapon (set by subclass). */
  protected basePos = new THREE.Vector3(0.32, -0.28, -0.55);
  private static readonly LOWER_OFFSET = new THREE.Vector3(0, -0.45, 0.15);

  constructor(camera: THREE.Camera, weaponId: WeaponId) {
    this.id = weaponId;
    this.ammo = WEAPONS[weaponId].magazineSize;

    this.muzzleFlash = new THREE.PointLight(0xfff2b0, 0, 4);
    const spriteMat = new THREE.SpriteMaterial({ color: 0xfff6c9, transparent: true, opacity: 0 });
    this.muzzleSprite = new THREE.Sprite(spriteMat);
    this.muzzleSprite.scale.set(0.25, 0.25, 0.25);

    camera.add(this.group);
  }

  protected addMuzzleEffects(localPos: THREE.Vector3) {
    this.muzzleFlash.position.copy(localPos);
    this.muzzleSprite.position.copy(localPos);
    this.group.add(this.muzzleFlash);
    this.group.add(this.muzzleSprite);
  }

  canFire(now: number): boolean {
    const def = WEAPONS[this.id];
    return this.switchT >= 1 && !this.reloading && this.ammo > 0 && now - this.lastShotAt >= def.fireRateMs;
  }

  fire(now: number) {
    const def = WEAPONS[this.id];
    this.lastShotAt = now;
    this.ammo = Math.max(0, this.ammo - 1);
    this.recoil = 1;
    this.muzzleTimer = 0.05;
    this.muzzleFlash.intensity = 3.5;
    (this.muzzleSprite.material as THREE.SpriteMaterial).opacity = 1;
    this.onFire(now);
    void def;
  }

  startReload(now: number) {
    const def = WEAPONS[this.id];
    if (this.reloading || this.ammo === def.magazineSize || this.switchT < 1) return;
    this.reloading = true;
    this.reloadEndsAt = now + def.reloadTimeMs;
  }

  setSwitchProgress(t: number) {
    this.switchT = THREE.MathUtils.clamp(t, 0, 1);
  }

  update(dt: number, now: number, moving: boolean, sprinting: boolean) {
    const def = WEAPONS[this.id];

    if (this.reloading && now >= this.reloadEndsAt) {
      this.reloading = false;
      this.ammo = def.magazineSize;
    }

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        this.muzzleFlash.intensity = 0;
        (this.muzzleSprite.material as THREE.SpriteMaterial).opacity = 0;
      }
    }

    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, dt * 12);

    const bobSpeed = sprinting ? 16 : 10;
    if (moving) {
      this.bobT += dt * bobSpeed;
    } else {
      this.bobT = THREE.MathUtils.lerp(this.bobT, 0, dt * 6);
    }
    const bobAmount = moving ? 0.015 : 0.006;
    const bobX = Math.sin(this.bobT) * bobAmount;
    const bobY = Math.abs(Math.cos(this.bobT)) * bobAmount * (moving ? 1.4 : 0.3);

    const lowered = BaseWeaponView.LOWER_OFFSET;
    const ease = this.switchT * this.switchT * (3 - 2 * this.switchT); // smoothstep
    this.group.position.set(
      this.basePos.x + bobX + lowered.x * (1 - ease),
      this.basePos.y + bobY + lowered.y * (1 - ease),
      this.basePos.z + this.recoil * 0.08 + lowered.z * (1 - ease),
    );
    this.group.rotation.x = -this.recoil * 0.25 - (1 - ease) * 0.4;

    const reloadProgress = this.reloading
      ? Math.min(1, (now - (this.reloadEndsAt - def.reloadTimeMs)) / def.reloadTimeMs)
      : 0;
    if (this.reloading) {
      this.group.rotation.z = Math.sin(reloadProgress * Math.PI) * 0.6;
    } else {
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, dt * 10);
    }

    this.onUpdate(dt, now);
  }

  /** Hook for weapon-specific fire animation (pump-slide, slide-rack, etc). */
  protected onFire(_now: number): void {}
  /** Hook for weapon-specific per-frame animation. */
  protected onUpdate(_dt: number, _now: number): void {}
}
