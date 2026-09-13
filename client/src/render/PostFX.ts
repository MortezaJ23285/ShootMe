import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Thin wrapper around Three's postprocessing composer. Bloom is tuned conservatively
// (low strength/threshold) so it only accents emissive weapon accents and muzzle
// flashes rather than producing a hazy overall glow — keeps the low-poly-plus look
// crisp instead of washed out, and keeps the cost to one extra blur pass per frame.
export class PostFX {
  readonly composer: EffectComposer;
  private bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.5, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize(width, height);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }

  render() {
    this.composer.render();
  }
}
