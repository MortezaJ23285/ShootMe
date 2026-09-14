import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BaseWeaponView } from './WeaponView.js';
import { getWeaponGrungeTexture } from './weaponTexture.js';

// Upgraded procedural rifle: multi-part assembly (body, vented barrel shroud, front
// sight post, rear sight ring, magazine, foregrip) with tuned PBR materials so it
// reads as a real weapon silhouette rather than a toy block, while staying pure
// procedural geometry (no external model files).
export class RifleView extends BaseWeaponView {
  constructor(camera: THREE.Camera) {
    super(camera, 'rifle');
    this.basePos.set(0.32, -0.28, -0.55);
    this.group.position.copy(this.basePos);

    const grunge = getWeaponGrungeTexture();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22262f, roughness: 0.55, metalness: 0.15, roughnessMap: grunge });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.28, metalness: 0.75, roughnessMap: grunge });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x35393f, roughness: 0.85, metalness: 0.05 });

    const body = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.15, 0.5, 3, 0.02), bodyMat);
    body.position.set(0, 0, -0.18);
    this.group.add(body);

    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 24), metalMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.005, -0.55);
    this.group.add(shroud);

    // Vent slots around the shroud for a more mechanical read at close range.
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.03), metalMat);
      const angle = (i / 6) * Math.PI * 2;
      vent.position.set(Math.sin(angle) * 0.047, 0.005 + Math.cos(angle) * 0.047, -0.55);
      vent.rotation.z = angle;
      this.group.add(vent);
    }

    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 16), metalMat);
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(0, 0.005, -0.76);
    this.group.add(barrelTip);

    const frontSight = new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.06, 0.015, 2, 0.003), metalMat);
    frontSight.position.set(0, 0.08, -0.68);
    this.group.add(frontSight);

    const rearSight = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 10, 24), metalMat);
    rearSight.position.set(0, 0.085, -0.05);
    this.group.add(rearSight);

    const magazine = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.2, 0.09, 3, 0.012), bodyMat);
    magazine.position.set(0, -0.16, -0.18);
    magazine.rotation.x = 0.15;
    this.group.add(magazine);

    const foregrip = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.1, 0.08, 3, 0.015), gripMat);
    foregrip.position.set(0, -0.1, -0.42);
    this.group.add(foregrip);

    const grip = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.22, 0.12, 3, 0.018), gripMat);
    grip.position.set(0, -0.14, -0.02);
    this.group.add(grip);

    // A couple of small bolt/screw details for close-range surface interest.
    for (const z of [-0.3, -0.06]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8), metalMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0.066, 0.02, z);
      this.group.add(screw);
    }

    const accentColor = 0x5ad1e6;
    const accent = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.02, 0.06, 2, 0.006),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.1 }),
    );
    accent.position.set(0, 0.055, -0.02);
    this.group.add(accent);

    this.addMuzzleEffects(new THREE.Vector3(0, 0.005, -0.82));
  }
}
