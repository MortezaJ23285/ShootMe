import * as THREE from 'three';

// Builds a simple low-poly humanoid: head, torso, arms, legs, weapon nub.
// Used for remote players (never rendered for the local player, who is first-person).
export function buildPlayerModel(color: number): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.9 });
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.6 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), body);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
  const leftArm = new THREE.Mesh(armGeo, body);
  leftArm.position.set(0.42, 1.12, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, body);
  rightArm.position.set(-0.42, 1.12, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, dark);
  leftLeg.position.set(0.16, 0.4, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, dark);
  rightLeg.position.set(-0.16, 0.4, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.4, metalness: 0.4 }),
  );
  weapon.position.set(-0.42, 1.05, 0.35);
  weapon.name = 'weapon';
  group.add(weapon);

  // Store limb refs for a simple walk-cycle animation driven by the caller.
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
