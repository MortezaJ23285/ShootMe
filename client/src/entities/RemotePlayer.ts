import * as THREE from 'three';
import { buildPlayerModel, buildNameTagCanvas } from './PlayerModel.js';

interface Snapshot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  time: number;
}

export class RemotePlayer {
  id: string;
  group: THREE.Group;
  private prev: Snapshot;
  private target: Snapshot;
  private walkT = 0;
  alive = true;

  constructor(id: string, name: string, color: number, scene: THREE.Scene, pos: { x: number; y: number; z: number }, yaw: number) {
    this.id = id;
    this.group = buildPlayerModel(color);
    this.group.add(buildNameTagCanvas(name));
    this.group.position.set(pos.x, pos.y, pos.z);
    this.group.rotation.y = yaw;
    scene.add(this.group);

    const snap = { x: pos.x, y: pos.y, z: pos.z, yaw, time: performance.now() };
    this.prev = snap;
    this.target = snap;
  }

  setTarget(pos: { x: number; y: number; z: number }, yaw: number) {
    this.prev = this.currentInterpolated();
    this.target = { x: pos.x, y: pos.y, z: pos.z, yaw, time: performance.now() + 90 };
  }

  private currentInterpolated(): Snapshot {
    const now = performance.now();
    const span = Math.max(1, this.target.time - (this.prev.time ?? this.target.time - 90));
    const t = Math.min(1, Math.max(0, (now - (this.target.time - span)) / span));
    return {
      x: THREE.MathUtils.lerp(this.prev.x, this.target.x, t),
      y: THREE.MathUtils.lerp(this.prev.y, this.target.y, t),
      z: THREE.MathUtils.lerp(this.prev.z, this.target.z, t),
      yaw: this.target.yaw,
      time: now,
    };
  }

  update(dt: number) {
    const now = performance.now();
    const span = 90;
    const startTime = this.target.time - span;
    const t = Math.min(1, Math.max(0, (now - startTime) / span));

    this.group.position.x = THREE.MathUtils.lerp(this.prev.x, this.target.x, t);
    this.group.position.y = THREE.MathUtils.lerp(this.prev.y, this.target.y, t);
    this.group.position.z = THREE.MathUtils.lerp(this.prev.z, this.target.z, t);

    let yawDiff = this.target.yaw - this.group.rotation.y;
    yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
    this.group.rotation.y += yawDiff * Math.min(1, dt * 12);

    const moved = Math.hypot(this.target.x - this.prev.x, this.target.z - this.prev.z);
    const { leftArm, rightArm, leftLeg, rightLeg } = this.group.userData.limbs as Record<string, THREE.Mesh>;
    if (moved > 0.001 && this.alive) {
      this.walkT += dt * 10;
      const swing = Math.sin(this.walkT) * 0.5;
      leftArm.rotation.x = swing;
      rightArm.rotation.x = -swing;
      leftLeg.rotation.x = -swing;
      rightLeg.rotation.x = swing;
    } else {
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, dt * 8);
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, dt * 8);
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, dt * 8);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, dt * 8);
    }
  }

  setAlive(alive: boolean) {
    this.alive = alive;
    this.group.visible = alive;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}
