import * as THREE from 'three';
import { SceneEffect } from '../types';
import { CLOUDS } from '../config/defaults';
import { generateCloudTexture } from '../utils/TextureGenerator';

/** Cloud mesh with depth metadata */
interface CloudMeshData {
  depth: number;
}

/**
 * Animated cloud layer effect
 */
export class Clouds implements SceneEffect {
  private clouds: THREE.Mesh[] = [];
  private cloudTexture: THREE.CanvasTexture;
  private cloudMaterial: THREE.MeshLambertMaterial;
  private cloudGeometry: THREE.PlaneGeometry;

  constructor() {
    // Generate procedural cloud texture
    this.cloudTexture = generateCloudTexture();

    // Create shared geometry and material
    this.cloudGeometry = new THREE.PlaneGeometry(CLOUDS.SIZE, CLOUDS.SIZE);
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: CLOUDS.OPACITY,
    });

    // Create cloud meshes
    this.createClouds();
  }

  private createClouds(): void {
    for (let i = 0; i < CLOUDS.COUNT; i++) {
      const cloud = new THREE.Mesh(this.cloudGeometry, this.cloudMaterial);

      const zPos = Math.random() * (CLOUDS.Z_RANGE.max - CLOUDS.Z_RANGE.min) + CLOUDS.Z_RANGE.min;

      cloud.position.set(
        Math.random() * CLOUDS.X_SPREAD - CLOUDS.X_SPREAD / 2,
        CLOUDS.Y_BASE + Math.random() * CLOUDS.Y_RANGE,
        zPos
      );

      cloud.rotation.x = 1.16;
      cloud.rotation.y = -0.12 + (Math.random() - 0.5) * 0.1;
      cloud.rotation.z = Math.random() * Math.PI * 2;

      // Store depth for parallax (normalized 0-1)
      const userData: CloudMeshData = {
        depth: (zPos - CLOUDS.Z_RANGE.min) / (CLOUDS.Z_RANGE.max - CLOUDS.Z_RANGE.min),
      };
      cloud.userData = userData;

      this.clouds.push(cloud);
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    const deltaFactor = deltaTime * 60; // Normalize to 60fps

    for (const cloud of this.clouds) {
      const depth = (cloud.userData as CloudMeshData).depth;
      const parallaxFactor = 0.4 + depth * 0.6;

      // Rotate slowly
      cloud.rotation.z -= CLOUDS.ROTATION_SPEED * deltaFactor * parallaxFactor;

      // Gentle horizontal drift
      cloud.position.x += Math.sin(elapsedTime * 0.1 + cloud.position.z) * 0.05 * deltaFactor * parallaxFactor;
    }
  }

  getObject(): THREE.Object3D[] {
    return this.clouds;
  }

  dispose(): void {
    this.cloudGeometry.dispose();
    this.cloudMaterial.dispose();
    this.cloudTexture.dispose();
    this.clouds = [];
  }
}
