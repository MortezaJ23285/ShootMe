import * as THREE from 'three';
import type { WeaponId } from '@shootme/shared';
import type { WeaponView } from './WeaponView.js';
import { RifleView } from './RifleView.js';
import { ShotgunView } from './ShotgunView.js';
import { PistolView } from './PistolView.js';

export function createWeaponView(id: WeaponId, camera: THREE.Camera): WeaponView {
  switch (id) {
    case 'rifle':
      return new RifleView(camera);
    case 'shotgun':
      return new ShotgunView(camera);
    case 'pistol':
      return new PistolView(camera);
  }
}
