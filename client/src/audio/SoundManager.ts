// All sounds are synthesized with WebAudio — no audio asset files needed.

import type { WeaponId } from '@shootme/shared';

const SHOOT_PROFILES: Record<WeaponId, { start: number; end: number; duration: number; noiseDuration: number; gain: number }> = {
  rifle: { start: 320, end: 90, duration: 0.09, noiseDuration: 0.05, gain: 0.22 },
  shotgun: { start: 180, end: 55, duration: 0.16, noiseDuration: 0.1, gain: 0.32 },
  pistol: { start: 420, end: 140, duration: 0.06, noiseDuration: 0.035, gain: 0.18 },
};

export class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  resume() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }

  private noiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  shoot(weaponId: WeaponId = 'rifle') {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = SHOOT_PROFILES[weaponId];

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(p.start, now);
    osc.frequency.exponentialRampToValueAtTime(p.end, now + p.duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.duration + 0.01);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + p.duration + 0.02);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, p.noiseDuration);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(p.gain * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p.noiseDuration);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  }

  reload() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now + offset);
      osc.frequency.exponentialRampToValueAtTime(300, now + offset + 0.06);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  dryFire() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  hitMarker() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  kill() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [0, 0.08, 0.16].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500 + i * 220, now + offset);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  damaged() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  death() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  jump() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
