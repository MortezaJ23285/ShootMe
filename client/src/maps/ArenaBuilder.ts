import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { MapData } from '@shootme/shared';

export function buildArena(scene: THREE.Scene, map: MapData) {
  const halfSize = map.halfSize;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(halfSize * 2 + 10, halfSize * 2 + 10),
    new THREE.MeshStandardMaterial({ color: 0x7fb069, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle grid for visual scale reference without a texture.
  const grid = new THREE.GridHelper(halfSize * 2, Math.round(halfSize / 1.5), 0x5f9455, 0x5f9455);
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  const boxGeoCache = new Map<string, THREE.BufferGeometry>();

  for (const box of map.boxes) {
    const key = `${box.sx}_${box.sy}_${box.sz}`;
    let geo = boxGeoCache.get(key);
    if (!geo) {
      const bevel = Math.min(0.08, box.sx, box.sy, box.sz) * 0.15;
      geo = new RoundedBoxGeometry(box.sx, box.sy, box.sz, 2, bevel);
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
  const half = halfSize + wallThickness / 2;
  const positions: [number, number, number, number][] = [
    [0, half, halfSize * 2 + wallThickness, wallThickness],
    [0, -half, halfSize * 2 + wallThickness, wallThickness],
    [half, 0, wallThickness, halfSize * 2 + wallThickness],
    [-half, 0, wallThickness, halfSize * 2 + wallThickness],
  ];
  for (const [x, z, sx, sz] of positions) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, wallHeight, sz), wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    scene.add(mesh);
  }
}

export function setupLighting(scene: THREE.Scene, halfSize = 30) {
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a5f3a, 0.9);
  scene.add(hemi);

  // Shadow-camera bounds scale with the map so shadows cover the whole play area
  // on the biggest maps, not just a fixed radius sized for the original arena.
  const shadowExtent = halfSize + 15;
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
  sun.position.set(shadowExtent, shadowExtent * 1.5, shadowExtent * 0.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.far = shadowExtent * 3;
  scene.add(sun);

  // Low-intensity fill light from the opposite side so ACES tone mapping (which
  // darkens midtones compared to no tone mapping) doesn't crush the shadow side.
  const fill = new THREE.DirectionalLight(0xbcd8ff, 0.35);
  fill.position.set(-25, 20, -30);
  scene.add(fill);

  scene.background = new THREE.Color(0xaee1ff);
  // Fog distance scales with the map so far edges of the biggest maps aren't
  // swallowed by a fog band tuned for the original, much smaller arena.
  scene.fog = new THREE.Fog(0xaee1ff, halfSize * 1.5, halfSize * 3.2);
}
