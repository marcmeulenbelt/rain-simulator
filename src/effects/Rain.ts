import * as THREE from 'three';
import { SceneEffect, RainGeometry } from '../types';
import { RAIN } from '../config/defaults';

/**
 * Rain particle system effect
 */
export class Rain implements SceneEffect {
  private rain: THREE.LineSegments | null = null;
  private geometry: RainGeometry | null = null;
  private material: THREE.LineBasicMaterial | null = null;
  private intensity: number = 0;
  private windSpeed: number = 0;
  private container: THREE.Group;

  constructor(initialIntensity: number = 5) {
    this.container = new THREE.Group();
    this.setIntensity(initialIntensity);
  }

  /**
   * Set rain intensity (0-100)
   */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(100, intensity));
    this.rebuild();
  }

  /**
   * Set wind speed (-100 to 100, negative = left, positive = right)
   */
  setWindSpeed(windSpeed: number): void {
    this.windSpeed = Math.max(-50, Math.min(50, windSpeed));
  }

  /**
   * Get current intensity
   */
  getIntensity(): number {
    return this.intensity;
  }

  private rebuild(): void {
    // Dispose old geometry/material
    this.disposeRain();

    if (this.intensity === 0) {
      return;
    }

    const t = this.intensity / 100;
    const density = Math.pow(t, 2.0) * 2.2 + 0.15;
    const particleCount = Math.round(RAIN.BASE_COUNT + RAIN.MAX_ADDITIONAL * density);

    // Create position and velocity data
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const depths = new Float32Array(particleCount);

    const speedMult = RAIN.MIN_SPEED_MULT + t * RAIN.MAX_SPEED_MULT;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const xPos = Math.random() * RAIN.BOUNDS.x - RAIN.BOUNDS.x / 2;
      const yPos = Math.random() * RAIN.BOUNDS.y - 400;
      const zPos = Math.random() * RAIN.BOUNDS.z - RAIN.BOUNDS.z / 2;

      positions[idx] = xPos;
      positions[idx + 1] = yPos;
      positions[idx + 2] = zPos;

      const baseVel = -(RAIN.BASE_SPEED + Math.random() * RAIN.SPEED_VARIATION);
      velocities[i] = baseVel * (0.85 + Math.random() * 0.3) * speedMult;
      depths[i] = (zPos + RAIN.BOUNDS.z / 2) / RAIN.BOUNDS.z;
    }

    // Create streak positions (2 points per streak)
    const streakLength = RAIN.STREAK_LENGTH.base + t * RAIN.STREAK_LENGTH.multiplier;
    const streakPositions = new Float32Array(particleCount * 6);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 6;
      const posIdx = i * 3;

      // Start of streak
      streakPositions[idx] = positions[posIdx];
      streakPositions[idx + 1] = positions[posIdx + 1];
      streakPositions[idx + 2] = positions[posIdx + 2];

      // End of streak
      streakPositions[idx + 3] = positions[posIdx];
      streakPositions[idx + 4] = positions[posIdx + 1] - streakLength;
      streakPositions[idx + 5] = positions[posIdx + 2];
    }

    // Create geometry
    this.geometry = new THREE.BufferGeometry() as RainGeometry;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    this.geometry.userData = { velocities, depths };

    // Create material
    this.material = new THREE.LineBasicMaterial({
      color: RAIN.COLOR,
      transparent: true,
      opacity: RAIN.BASE_OPACITY + t * RAIN.OPACITY_RANGE,
      blending: THREE.AdditiveBlending,
    });

    // Create line segments
    this.rain = new THREE.LineSegments(this.geometry, this.material);
    this.container.add(this.rain);
  }

  private disposeRain(): void {
    if (this.rain) {
      this.container.remove(this.rain);
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.rain = null;
  }

  update(deltaTime: number, elapsedTime: number): void {
    if (!this.rain || !this.geometry || this.intensity === 0) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const { velocities, depths } = this.geometry.userData;
    const t = this.intensity / 100;
    const streakLength = RAIN.STREAK_LENGTH.base + t * RAIN.STREAK_LENGTH.multiplier;
    const speedMult = RAIN.MIN_SPEED_MULT + t * RAIN.MAX_SPEED_MULT;
    const deltaFactor = deltaTime * 60; // Normalize to 60fps

    for (let i = 0; i < velocities.length; i++) {
      const idx = i * 6;
      const depth = depths[i] || 0.5;

      // Apply gravity
      velocities[i] -= (0.05 + Math.random() * 0.008) * deltaFactor;

      // Parallax: closer drops fall faster
      const parallaxFactor = 0.3 + depth * 0.7;

      // Compute per-frame velocity components (before deltaFactor, for direction only)
      // Multiplier calibrated so 100 km/h wind ≈ 70-75° from vertical (near-horizontal),
      // matching real rain physics (terminal velocity ~7 m/s vs 28 m/s wind)
      const vx = this.windSpeed * 0.35 * parallaxFactor;
      const vy = velocities[i] * parallaxFactor; // negative (falling)

      // Horizontal wind drift per frame (includes subtle variation)
      const windVariation = Math.sin(elapsedTime * 0.3 + i * 0.1) * 0.15 * depth;
      const totalWind = (vx + windVariation) * deltaFactor;

      // Update head position
      positions[idx] += totalWind;                          // head X
      positions[idx + 1] += vy * deltaFactor;               // head Y (falling)

      // Orient the streak along the velocity vector so the line
      // matches the actual direction of travel.
      // tail = head - normalize(velocity) * streakLength
      const speed = Math.sqrt(vx * vx + vy * vy);
      const dirX = speed > 0 ? vx / speed : 0;
      const dirY = speed > 0 ? vy / speed : -1;

      positions[idx + 3] = positions[idx] - dirX * streakLength;   // tail X
      positions[idx + 4] = positions[idx + 1] - dirY * streakLength; // tail Y
      // Z stays the same for both vertices

      // Wrap horizontally: if a drop drifts past the bounds, move it to the opposite side
      const halfX = RAIN.BOUNDS.x / 2;
      if (positions[idx] > halfX) {
        const shift = -RAIN.BOUNDS.x;
        positions[idx] += shift;
        positions[idx + 3] += shift;
      } else if (positions[idx] < -halfX) {
        const shift = RAIN.BOUNDS.x;
        positions[idx] += shift;
        positions[idx + 3] += shift;
      }

      // Reset when below view
      if (positions[idx + 1] < RAIN.RESET_Y) {
        // Spawn upwind so drops drift into view rather than away from it
        const windOffset = -this.windSpeed * 3;
        const newX = Math.random() * RAIN.BOUNDS.x - RAIN.BOUNDS.x / 2 + windOffset;
        const newZ = Math.random() * RAIN.BOUNDS.z - RAIN.BOUNDS.z / 2;

        positions[idx] = newX;
        positions[idx + 1] = RAIN.SPAWN_Y.base + Math.random() * RAIN.SPAWN_Y.range;
        positions[idx + 2] = newZ;
        positions[idx + 3] = newX - dirX * streakLength;
        positions[idx + 4] = positions[idx + 1] - dirY * streakLength;
        positions[idx + 5] = newZ;

        velocities[i] = -(RAIN.BASE_SPEED + Math.random() * 4) * speedMult;
        depths[i] = (newZ + RAIN.BOUNDS.z / 2) / RAIN.BOUNDS.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  getObject(): THREE.Object3D {
    return this.container;
  }

  dispose(): void {
    this.disposeRain();
  }
}
