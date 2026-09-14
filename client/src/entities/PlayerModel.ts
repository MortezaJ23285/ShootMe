import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Builds a low-poly-plus humanoid: rounded head/torso/limbs, boots, gloves, and a
// weapon nub. Used for remote players (never rendered for the local player, who is
// first-person). Rounded-box geometry replaces flat boxes for a softer, more
// "modeled" silhouette while staying pure procedural geometry.
export function buildPlayerModel(color: number): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.85 });
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.55 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.6, metalness: 0.1 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.7 });

  const head = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.09), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.7, 0.35, 4, 0.08), body);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new RoundedBoxGeometry(0.2, 0.55, 0.2, 3, 0.06);
  const leftArm = new THREE.Mesh(armGeo, body);
  leftArm.position.set(0.42, 1.2, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, body);
  rightArm.position.set(-0.42, 1.2, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Gloves/boots are parented to their limb mesh (not the group) so they follow
  // the walk-cycle rotation applied to the limb in RemotePlayer's update loop.
  const gloveGeo = new RoundedBoxGeometry(0.22, 0.12, 0.22, 3, 0.05);
  const leftGlove = new THREE.Mesh(gloveGeo, glove);
  leftGlove.position.set(0, -0.34, 0);
  leftArm.add(leftGlove);
  const rightGlove = new THREE.Mesh(gloveGeo, glove);
  rightGlove.position.set(0, -0.34, 0);
  rightArm.add(rightGlove);

  const legGeo = new RoundedBoxGeometry(0.24, 0.6, 0.24, 3, 0.06);
  const leftLeg = new THREE.Mesh(legGeo, dark);
  leftLeg.position.set(0.16, 0.48, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, dark);
  rightLeg.position.set(-0.16, 0.48, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  const bootGeo = new RoundedBoxGeometry(0.26, 0.18, 0.32, 3, 0.05);
  const leftBoot = new THREE.Mesh(bootGeo, boot);
  leftBoot.position.set(0, -0.38, 0.03);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);
  const rightBoot = new THREE.Mesh(bootGeo, boot);
  rightBoot.position.set(0, -0.38, 0.03);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);

  const weapon = new THREE.Mesh(
    new RoundedBoxGeometry(0.12, 0.14, 0.55, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.4, metalness: 0.4 }),
  );
  weapon.position.set(-0.42, 1.05, 0.35);
  weapon.name = 'weapon';
  group.add(weapon);

  // Store limb refs for a simple walk-cycle animation driven by the caller.
  // Gloves/boots are children of these meshes, so they follow automatically.
  group.userData.limbs = { leftArm, rightArm, leftLeg, rightLeg };
  group.userData.head = head;

  return group;
}

export function buildNameTagCanvas(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(15,17,21,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name.slice(0, 16), canvas.width / 2, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.35, 1);
  sprite.position.y = 2.15;
  sprite.renderOrder = 10;
  return sprite;
}
