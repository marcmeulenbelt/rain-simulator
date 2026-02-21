import * as THREE from 'three';
import { SCENE, LIGHTING, PERFORMANCE } from '../config/defaults';
import { SceneEffect, AnimateCallback } from '../types';

/**
 * Manages the Three.js scene, camera, renderer, and animation loop
 */
export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private effects: SceneEffect[] = [];
  private animateCallbacks: AnimateCallback[] = [];
  private lastFrameTime: number = performance.now();
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private resizeTimeoutId: number | null = null;

  constructor(container: HTMLElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(SCENE.FOG_COLOR, SCENE.FOG_DENSITY);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      SCENE.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      SCENE.CAMERA_NEAR,
      SCENE.CAMERA_FAR
    );
    this.camera.position.set(
      SCENE.CAMERA_POSITION.x,
      SCENE.CAMERA_POSITION.y,
      SCENE.CAMERA_POSITION.z
    );
    this.camera.rotation.set(
      SCENE.CAMERA_ROTATION.x,
      SCENE.CAMERA_ROTATION.y,
      SCENE.CAMERA_ROTATION.z
    );

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor(SCENE.FOG_COLOR);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Setup lighting
    this.setupLighting();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(
      LIGHTING.AMBIENT_COLOR,
      LIGHTING.AMBIENT_INTENSITY
    );
    this.scene.add(ambient);

    // Directional light
    const directional = new THREE.DirectionalLight(
      LIGHTING.DIRECTIONAL_COLOR,
      LIGHTING.DIRECTIONAL_INTENSITY
    );
    directional.position.set(
      LIGHTING.DIRECTIONAL_POSITION.x,
      LIGHTING.DIRECTIONAL_POSITION.y,
      LIGHTING.DIRECTIONAL_POSITION.z
    );
    this.scene.add(directional);
  }

  private handleResize = (): void => {
    // Debounce resize events to avoid excessive recalculations
    if (this.resizeTimeoutId !== null) {
      clearTimeout(this.resizeTimeoutId);
    }
    
    this.resizeTimeoutId = window.setTimeout(() => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.resizeTimeoutId = null;
    }, PERFORMANCE.RESIZE_DEBOUNCE_MS);
  };

  /**
   * Add an effect to the scene
   */
  addEffect(effect: SceneEffect): void {
    this.effects.push(effect);
    const objects = effect.getObject();
    if (Array.isArray(objects)) {
      objects.forEach(obj => this.scene.add(obj));
    } else {
      this.scene.add(objects);
    }
  }

  /**
   * Remove an effect from the scene
   */
  removeEffect(effect: SceneEffect): void {
    const index = this.effects.indexOf(effect);
    if (index !== -1) {
      this.effects.splice(index, 1);
      const objects = effect.getObject();
      if (Array.isArray(objects)) {
        objects.forEach(obj => this.scene.remove(obj));
      } else {
        this.scene.remove(objects);
      }
      effect.dispose();
    }
  }

  /**
   * Add a callback to be called each frame
   */
  onAnimate(callback: AnimateCallback): void {
    this.animateCallbacks.push(callback);
  }

  /**
   * Remove an animation callback
   */
  offAnimate(callback: AnimateCallback): void {
    const index = this.animateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.animateCallbacks.splice(index, 1);
    }
  }

  /**
   * Get the Three.js scene
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the Three.js camera
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    const elapsedTime = now / 1000;
    this.lastFrameTime = now;

    // Update all effects
    for (const effect of this.effects) {
      effect.update(deltaTime, elapsedTime);
    }

    // Call animation callbacks
    for (const callback of this.animateCallbacks) {
      callback(deltaTime, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
    
    if (this.resizeTimeoutId !== null) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    window.removeEventListener('resize', this.handleResize);

    // Dispose all effects
    for (const effect of this.effects) {
      const objects = effect.getObject();
      if (Array.isArray(objects)) {
        objects.forEach(obj => this.scene.remove(obj));
      } else {
        this.scene.remove(objects);
      }
      effect.dispose();
    }
    this.effects = [];

    // Dispose renderer
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
