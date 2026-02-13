import * as THREE from 'three';
import { SceneEffect } from '../types';
import { LIGHTING } from '../config/defaults';

/**
 * Lightning flash effect
 */
export class Lightning implements SceneEffect {
  private flash: THREE.PointLight;
  private enabled: boolean = true;
  private frequency: number = 40;
  private lastFlashTime: number = 0;
  private nextFlashTime: number = 0;

  constructor(initialFrequency: number = 40, initialEnabled: boolean = true) {
    this.frequency = initialFrequency;
    this.enabled = initialEnabled;

    // Create flash light
    this.flash = new THREE.PointLight(
      LIGHTING.FLASH_COLOR,
      0,
      LIGHTING.FLASH_DISTANCE,
      LIGHTING.FLASH_DECAY
    );
    this.flash.position.set(300, 400, 200);

    // Schedule first flash sooner (0-5 seconds) for immediate feedback
    const currentTime = performance.now() / 1000;
    this.nextFlashTime = currentTime + Math.random() * 5;
    this.lastFlashTime = currentTime;
  }

  /**
   * Enable or disable lightning
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.flash.intensity = 0;
    }
  }

  /**
   * Get enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set lightning frequency (0-80)
   */
  setFrequency(frequency: number): void {
    this.frequency = Math.max(0, Math.min(80, frequency));

    // Reschedule next flash based on new frequency
    const currentTime = performance.now() / 1000;
    const timeSinceLastFlash = currentTime - this.lastFlashTime;
    const avgInterval = 20 - (this.frequency / 80) * 19;
    const maxInterval = avgInterval * 1.3;

    if (timeSinceLastFlash > maxInterval) {
      // Waited too long, flash soon
      this.nextFlashTime = currentTime + 0.1;
    } else {
      // Reschedule based on new frequency
      this.scheduleNextFlash(currentTime);
    }
  }

  /**
   * Get current frequency
   */
  getFrequency(): number {
    return this.frequency;
  }

  private scheduleNextFlash(currentTime: number): void {
    // Simple linear calculation: 0 = 20 sec, 80 = 1 sec average (matches original exactly)
    const avgInterval = 20 - (this.frequency / 80) * 19;
    const minInterval = avgInterval * 0.7;
    const maxInterval = avgInterval * 1.3;

    // Random interval within range
    const interval = minInterval + Math.random() * (maxInterval - minInterval);

    // Occasional storm bursts - 10% chance
    const isStormBurst = Math.random() < 0.1 && this.frequency > 30;
    const burstInterval = isStormBurst ? interval * 0.3 : interval;

    this.nextFlashTime = currentTime + burstInterval;
  }

  private triggerFlash(): void {
    // Randomize position (matches original exactly)
    this.flash.position.set(
      Math.random() * 800 - 400,
      400 + Math.random() * 300,
      Math.random() * 600 - 300
    );

    // Set intensity with variation (matches original exactly)
    const intensityVariation = 0.7 + Math.random() * 0.6;
    this.flash.intensity = (800 + Math.random() * 1000) * intensityVariation;
  }

  private updateFlashDecay(deltaTime: number): void {
    if (this.flash.intensity <= 0) return;

    const normalizedIntensity = this.flash.intensity / 2000;

    // Multi-stage flicker for realism
    if (normalizedIntensity > 0.3) {
      // Early stage: frequent strong flickers
      if (Math.random() < 0.12) {
        this.flash.intensity *= 1.3 + Math.random() * 0.4;
      }
    } else if (normalizedIntensity > 0.1) {
      // Mid stage: occasional moderate flickers
      if (Math.random() < 0.06) {
        this.flash.intensity *= 1.15 + Math.random() * 0.2;
      }
    } else {
      // Late stage: rare subtle flickers
      if (Math.random() < 0.03) {
        this.flash.intensity *= 1.1 + Math.random() * 0.1;
      }
    }

    // Main decay - matches original exactly
    this.flash.intensity *= Math.pow(0.86, deltaTime * 60);
    if (this.flash.intensity < 1) {
      this.flash.intensity = 0;
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    if (!this.enabled) {
      this.flash.intensity = 0;
      return;
    }

    // Check if it's time for next flash
    if (elapsedTime >= this.nextFlashTime) {
      this.triggerFlash();
      this.lastFlashTime = elapsedTime;
      this.scheduleNextFlash(elapsedTime);
    }

    // Update flash decay
    this.updateFlashDecay(deltaTime);
  }

  getObject(): THREE.Object3D {
    return this.flash;
  }

  /**
   * Get the flash light for external manipulation
   */
  getFlash(): THREE.PointLight {
    return this.flash;
  }

  dispose(): void {
    this.flash.dispose();
  }
}
