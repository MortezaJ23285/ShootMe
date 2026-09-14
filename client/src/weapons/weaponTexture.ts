import * as THREE from 'three';

// A small procedural grunge/detail texture, generated once on a canvas and reused
// across every weapon material (same technique as PlayerModel's name-tag canvas) —
// this is what pushes the weapon materials from flat-shaded toy-look toward a more
// worn, semi-realistic surface without any external texture files.
let cached: THREE.CanvasTexture | null = null;

export function getWeaponGrungeTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() * 60 - 30;
    const v = 128 + shade;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.25})`;
    const w = Math.random() * 3 + 0.5;
    ctx.fillRect(x, y, w, w);
  }

  // A handful of longer scratch marks.
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 60; i++) {
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    const len = Math.random() * 60 + 12;
    const angle = Math.random() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(angle) * len, y0 + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Darker pitting/wear blotches for more surface variation at close range.
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 10 + 3;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 8;
  cached = texture;
  return texture;
}
