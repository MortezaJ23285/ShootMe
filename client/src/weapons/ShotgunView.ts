import * as THREE from 'three';
import { BaseWeaponView } from './WeaponView.js';
import { getWeaponGrungeTexture } from './weaponTexture.js';

// Shorter, thicker weapon with a pump/foregrip that racks backward and forward on
// fire — the signature animation that sells the shotgun's identity.
export class ShotgunView extends BaseWeaponView {
  private pump: THREE.Mesh;
  private pumpBaseZ: number;
  private pumpAnim = 0; // 0..1, drives the rack-back-then-forward motion

  constructor(camera: THREE.Camera) {
    super(camera, 'shotgun');
    this.basePos.set(0.3, -0.3, -0.5);
    this.group.position.copy(this.basePos);

    const grunge = getWeaponGrungeTexture();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.6, metalness: 0.1, roughnessMap: grunge });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x17140f, roughness: 0.3, metalness: 0.7, roughnessMap: grunge });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3d332a, roughness: 0.85, metalness: 0.05 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x4a3e30, roughness: 0.8, metalness: 0.05 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.4), bodyMat);
    body.position.set(0, 0, -0.1);
    this.group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.5);
    this.group.add(barrel);

    this.pumpBaseZ = -0.4;
    this.pump = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), pumpMat);
    this.pump.rotation.x = Math.PI / 2;
    this.pump.position.set(0, -0.02, this.pumpBaseZ);
    this.group.add(this.pump);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.22), gripMat);
    stock.position.set(0, -0.02, 0.16);
    this.group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), gripMat);
    grip.position.set(0, -0.13, 0.02);
    this.group.add(grip);

    const accentColor = 0xff8a3d;
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.02),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.2 }),
    );
    accent.position.set(0, 0.045, -0.68);
    this.group.add(accent);

    this.addMuzzleEffects(new THREE.Vector3(0, 0.03, -0.72));
  }

  protected onFire(): void {
    this.pumpAnim = 1;
  }

  protected onUpdate(dt: number): void {
    // Rack backward quickly, then ease forward — classic pump-action feedback.
    if (this.pumpAnim > 0) {
      this.pumpAnim = Math.max(0, this.pumpAnim - dt * 3.2);
    }
    const kick = this.pumpAnim > 0.5 ? (this.pumpAnim - 0.5) * 2 : 0;
    this.pump.position.z = this.pumpBaseZ + kick * 0.12;
  }
}
