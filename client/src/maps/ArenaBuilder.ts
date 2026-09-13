import * as THREE from 'three';
import { ARENA_BOXES, ARENA_HALF_SIZE } from '@shootme/shared';

export function buildArena(scene: THREE.Scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_HALF_SIZE * 2 + 10, ARENA_HALF_SIZE * 2 + 10),
    new THREE.MeshStandardMaterial({ color: 0x7fb069, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle grid for visual scale reference without a texture.
  const grid = new THREE.GridHelper(ARENA_HALF_SIZE * 2, 20, 0x5f9455, 0x5f9455);
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  const boxGeoCache = new Map<string, THREE.BoxGeometry>();

  for (const box of ARENA_BOXES) {
    const key = `${box.sx}_${box.sy}_${box.sz}`;
    let geo = boxGeoCache.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(box.sx, box.sy, box.sz);
      boxGeoCache.set(key, geo);
    }
    const mat = new THREE.MeshStandardMaterial({ color: box.color, roughness: 0.8, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(box.x, box.y + box.sy / 2, box.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Perimeter wall so players can visually tell where the arena ends.
  const wallHeight = 4;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9 });
  const wallThickness = 1;
  const half = ARENA_HALF_SIZE + wallThickness / 2;
  const positions: [number, number, number, number][] = [
    [0, half, ARENA_HALF_SIZE * 2 + wallThickness, wallThickness],
    [0, -half, ARENA_HALF_SIZE * 2 + wallThickness, wallThickness],
    [half, 0, wallThickness, ARENA_HALF_SIZE * 2 + wallThickness],
    [-half, 0, wallThickness, ARENA_HALF_SIZE * 2 + wallThickness],
  ];
  for (const [x, z, sx, sz] of positions) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, wallHeight, sz), wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    scene.add(mesh);
  }
}

export function setupLighting(scene: THREE.Scene) {
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a5f3a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
  sun.position.set(30, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 120;
  scene.add(sun);

  // Low-intensity fill light from the opposite side so ACES tone mapping (which
  // darkens midtones compared to no tone mapping) doesn't crush the shadow side.
  const fill = new THREE.DirectionalLight(0xbcd8ff, 0.35);
  fill.position.set(-25, 20, -30);
  scene.add(fill);

  scene.background = new THREE.Color(0xaee1ff);
  scene.fog = new THREE.Fog(0xaee1ff, 45, 95);
}
