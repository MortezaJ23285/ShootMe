import * as THREE from 'three';

interface ActiveImpact {
  mesh: THREE.Mesh;
  life: number;
}

export class ImpactEffectPool {
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];
  private active: ActiveImpact[] = [];

  constructor(scene: THREE.Scene, size = 16) {
    this.scene = scene;
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff6b5a, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  spawn(pos: THREE.Vector3) {
    const mesh = this.pool.pop();
    if (!mesh) return;
    mesh.position.copy(pos);
    mesh.scale.setScalar(1);
    mesh.visible = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
    this.active.push({ mesh, life: 0 });
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.life += dt;
      const t = item.life / 0.25;
      item.mesh.scale.setScalar(1 + t * 2.5);
      (item.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - t));
      if (t >= 1) {
        item.mesh.visible = false;
        this.pool.push(item.mesh);
        this.active.splice(i, 1);
      }
    }
  }
}
