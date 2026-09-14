import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Full postprocessing stack, tuned for visual fidelity over minimum GPU support
// (this game does not target low-end hardware): depth-based ambient occlusion for
// real contact shadows, bloom on emissive/muzzle-flash accents, then a light
// cinematic grade (film grain + vignette) before the final color-space pass.
export class PostFX {
  readonly composer: EffectComposer;
  private ssao: SSAOPass;
  private bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.ssao = new SSAOPass(scene, camera, width, height);
    this.ssao.kernelRadius = 12;
    this.ssao.minDistance = 0.0008;
    this.ssao.maxDistance = 0.15;
    this.composer.addPass(this.ssao);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.55, 0.82);
    this.composer.addPass(this.bloom);

    const film = new FilmPass(0.2, false);
    this.composer.addPass(film);

    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 1.1;
    vignette.uniforms.darkness.value = 1.15;
    this.composer.addPass(vignette);

    this.composer.addPass(new OutputPass());

    this.resize(width, height);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
    this.ssao.setSize(width, height);
  }

  render() {
    this.composer.render();
  }
}
