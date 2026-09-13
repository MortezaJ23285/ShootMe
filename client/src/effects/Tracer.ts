import * as THREE from 'three';

interface ActiveTracer {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

// Small object pool of line-like beams for bullet tracers — avoids per-shot allocation churn.
export class TracerPool {
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];
  private active: ActiveTracer[] = [];
  private geo = new THREE.CylinderGeometry(0.015, 0.015, 1, 5);
  private mat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.9 });

  constructor(scene: THREE.Scene, size = 40) {
    this.scene = scene;
    for (let i = 0; i < size; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat.clone());
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  fire(from: THREE.Vector3, to: THREE.Vector3) {
    const mesh = this.pool.pop();
    if (!mesh) return;

    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    mesh.scale.set(1, length, 1);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.visible = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;

    this.active.push({ mesh, life: 0, maxLife: 0.06 });
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.life += dt;
      const alpha = 1 - t.life / t.maxLife;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, alpha * 0.9);
      if (t.life >= t.maxLife) {
        t.mesh.visible = false;
        this.pool.push(t.mesh);
        this.active.splice(i, 1);
      }
    }
  }
}
