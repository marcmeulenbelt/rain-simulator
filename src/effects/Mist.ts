import * as THREE from 'three';
import { SceneEffect, MistGeometry } from '../types';
import { MIST } from '../config/defaults';
import { generateMistTexture } from '../utils/TextureGenerator';

/**
 * Atmospheric mist/fog particle effect
 */
export class Mist implements SceneEffect {
  private mist: THREE.Points;
  private geometry: MistGeometry;
  private material: THREE.PointsMaterial;
  private mistTexture: THREE.CanvasTexture;
  private intensity: number = 5;

  constructor(initialIntensity: number = 5) {
    this.intensity = initialIntensity;

    // Generate mist texture
    this.mistTexture = generateMistTexture();

    // Create geometry
    this.geometry = this.createGeometry();

    // Create material
    this.material = new THREE.PointsMaterial({
      color: MIST.COLOR,
      size: MIST.SIZE,
      map: this.mistTexture,
      transparent: true,
      opacity: MIST.INITIAL_OPACITY,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    // Create points mesh
    this.mist = new THREE.Points(this.geometry, this.material);
  }

  private createGeometry(): MistGeometry {
    const geometry = new THREE.BufferGeometry() as MistGeometry;
    const positions = new Float32Array(MIST.COUNT * 3);
    const sizes = new Float32Array(MIST.COUNT);
    const depths = new Float32Array(MIST.COUNT);

    for (let i = 0; i < MIST.COUNT; i++) {
      const idx = i * 3;
      const zPos = Math.random() * MIST.BOUNDS.z - MIST.BOUNDS.z / 2;

      positions[idx] = Math.random() * MIST.BOUNDS.x - MIST.BOUNDS.x / 2;
      positions[idx + 1] = Math.random() * MIST.BOUNDS.y - MIST.BOUNDS.y / 2;
      positions[idx + 2] = zPos;

      sizes[i] = MIST.PARTICLE_SIZE.base + Math.random() * MIST.PARTICLE_SIZE.range;
      depths[i] = (zPos + MIST.BOUNDS.z / 2) / MIST.BOUNDS.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.userData = { depths };

    return geometry;
  }

  private calculateOpacity(): number {
    const t = this.intensity / 100;
    return MIST.BASE_OPACITY + t * (MIST.MAX_OPACITY - MIST.BASE_OPACITY);
  }

  /**
   * Set mist intensity (tied to rain intensity)
   */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(100, intensity));
    this.material.opacity = this.calculateOpacity();
  }

  update(deltaTime: number, elapsedTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const depths = this.geometry.userData.depths;
    const deltaFactor = deltaTime * 60;

    for (let i = 0; i < MIST.COUNT; i++) {
      const idx = i * 3;
      const depth = depths[i];
      const parallaxFactor = 0.5 + depth * 0.5;

      // Gentle drifting motion
      positions[idx] += Math.sin(elapsedTime * 0.2 + i) * 0.1 * deltaFactor * parallaxFactor;
      positions[idx + 2] += Math.cos(elapsedTime * 0.15 + i) * 0.08 * deltaFactor * parallaxFactor;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.mist.rotation.y = elapsedTime * 0.02;
  }

  getObject(): THREE.Object3D {
    return this.mist;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mistTexture.dispose();
  }
}
