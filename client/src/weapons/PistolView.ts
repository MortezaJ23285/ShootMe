import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BaseWeaponView } from './WeaponView.js';
import { getWeaponGrungeTexture } from './weaponTexture.js';

// Compact sidearm held lower/tighter than the two-hand weapons. Its slide racks
// backward on fire (a simple lerp along local Z) for a distinct fire animation.
export class PistolView extends BaseWeaponView {
  private slide: THREE.Mesh;
  private slideBaseZ: number;
  private slideKick = 0;

  constructor(camera: THREE.Camera) {
    super(camera, 'pistol');
    this.basePos.set(0.24, -0.34, -0.4);
    this.group.position.copy(this.basePos);

    const grunge = getWeaponGrungeTexture();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.5, metalness: 0.2, roughnessMap: grunge });
    const slideMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.25, metalness: 0.8, roughnessMap: grunge });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x2f2f34, roughness: 0.9, metalness: 0.05 });

    const frame = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.1, 0.22, 3, 0.015), frameMat);
    frame.position.set(0, 0.02, -0.05);
    this.group.add(frame);

    this.slideBaseZ = -0.08;
    this.slide = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.06, 0.28, 3, 0.012), slideMat);
    this.slide.position.set(0, 0.08, this.slideBaseZ);
    this.group.add(this.slide);

    // Slide serrations for grip texture at the rear of the barrel.
    for (let i = 0; i < 5; i++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.083, 0.05, 0.006), slideMat);
      groove.position.set(0, 0.08, this.slideBaseZ + 0.09 + i * 0.012);
      this.group.add(groove);
    }

    const foresight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.008), slideMat);
    foresight.position.set(0, 0.11, this.slideBaseZ - 0.13);
    this.group.add(foresight);

    const grip = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.16, 0.09, 3, 0.014), gripMat);
    grip.position.set(0, -0.09, 0.03);
    grip.rotation.x = -0.25;
    this.group.add(grip);

    const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16), slideMat);
    trigger.position.set(0, -0.02, -0.02);
    this.group.add(trigger);

    const accentColor = 0xd65ae6;
    const accent = new THREE.Mesh(
      new RoundedBoxGeometry(0.06, 0.012, 0.03, 2, 0.004),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.2 }),
    );
    accent.position.set(0, 0.055, 0.02);
    this.group.add(accent);

    this.addMuzzleEffects(new THREE.Vector3(0, 0.08, -0.24));
  }

  protected onFire(): void {
    this.slideKick = 1;
  }

  protected onUpdate(dt: number): void {
    this.slideKick = THREE.MathUtils.lerp(this.slideKick, 0, dt * 18);
    this.slide.position.z = this.slideBaseZ - this.slideKick * 0.06;
  }
}
