import * as THREE from 'three';
import { GRAVITY, JUMP_SPEED, MOVE_SPEED, PLAYER_EYE_HEIGHT, SPRINT_MULTIPLIER } from '@shootme/shared';
import { groundHeightAt, resolveHorizontal } from '../physics/collision.js';

export class LocalController {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;

  position = new THREE.Vector3(0, 0, 0);
  velocityY = 0;
  yaw = 0;
  pitch = 0;
  grounded = true;
  moving = false;
  sprinting = false;

  private keys = new Set<string>();
  private locked = false;
  private onJump?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Track both the physical key code and the logical key so movement still works
    // if a synthetic KeyboardEvent arrives without `code` populated (e.g. some
    // automated input tools) — real keyboards populate both, so this is a pure fallback.
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.keys.add(e.key.toLowerCase());
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.keys.delete(e.key.toLowerCase());
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      const limit = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });
  }

  setJumpCallback(cb: () => void) {
    this.onJump = cb;
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  isLocked(): boolean {
    return this.locked;
  }

  teleport(pos: { x: number; y: number; z: number }) {
    this.position.set(pos.x, pos.y, pos.z);
    this.velocityY = 0;
    this.grounded = true;
  }

  update(dt: number) {
    const forward = (this.has('KeyW', 'w') ? 1 : 0) - (this.has('KeyS', 's') ? 1 : 0);
    const strafe = (this.has('KeyD', 'd') ? 1 : 0) - (this.has('KeyA', 'a') ? 1 : 0);
    this.sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('shift');
    this.moving = forward !== 0 || strafe !== 0;

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Forward vector faces -Z at yaw=0 (matches camera default look direction).
    const dirX = -sinYaw * forward + cosYaw * strafe;
    const dirZ = -cosYaw * forward - sinYaw * strafe;
    const len = Math.hypot(dirX, dirZ) || 1;

    const speed = MOVE_SPEED * (this.sprinting ? SPRINT_MULTIPLIER : 1);
    const moveX = this.moving ? (dirX / len) * speed * dt : 0;
    const moveZ = this.moving ? (dirZ / len) * speed * dt : 0;

    const resolved = resolveHorizontal(this.position.x + moveX, this.position.z + moveZ, this.position.y);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    if (this.has('Space', ' ') && this.grounded) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
      this.onJump?.();
    }

    this.velocityY -= GRAVITY * dt;
    let nextY = this.position.y + this.velocityY * dt;

    const ground = groundHeightAt(this.position.x, this.position.z, this.position.y);
    if (nextY <= ground) {
      nextY = ground;
      this.velocityY = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    this.position.y = nextY;

    this.camera.position.set(this.position.x, this.position.y + PLAYER_EYE_HEIGHT, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private has(code: string, key: string): boolean {
    return this.keys.has(code) || this.keys.has(key);
  }

  getForwardVector(): THREE.Vector3 {
    const v = new THREE.Vector3(0, 0, -1);
    v.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return v;
  }
}
