import * as THREE from 'three';

/**
 * Generate a procedural cloud texture
 */
export function generateCloudTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'white';

  // Draw multiple overlapping circles for cloud effect
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      40 + Math.random() * 120,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Apply blur for soft edges
  ctx.filter = 'blur(30px)';
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Generate a soft circular texture for mist particles
 */
export function generateMistTexture(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const halfSize = size / 2;
  const gradient = ctx.createRadialGradient(
    halfSize, halfSize, 0,
    halfSize, halfSize, halfSize
  );

  gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Generate a simple raindrop texture
 */
export function generateRainTexture(size: number = 32): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 4;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(170,204,255,0)');
  gradient.addColorStop(0.3, 'rgba(170,204,255,0.8)');
  gradient.addColorStop(1, 'rgba(170,204,255,0.2)');

  ctx.fillStyle = gradient;
  ctx.fillRect(size / 2 - 1, 0, 2, canvas.height);

  return new THREE.CanvasTexture(canvas);
}
