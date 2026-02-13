import * as THREE from 'three';

/**
 * Weather configuration options
 */
export interface WeatherConfig {
  /** Rain intensity from 0 (none) to 100 (torrential) */
  intensity: number;
  /** Lightning frequency from 0 (none) to 80 (very frequent) */
  lightningFrequency: number;
}

/**
 * Data attached to particle system geometries
 */
export interface ParticleSystemData {
  velocities: Float32Array;
  depths: Float32Array;
}

/**
 * Weather preset definition
 */
export interface WeatherPreset {
  name: string;
  config: WeatherConfig;
  description?: string;
}

/**
 * Lightning frequency labels
 */
export type LightningFrequencyLabel = 'None' | 'Rare' | 'Occasional' | 'Medium' | 'Frequent' | 'Very Frequent';

/**
 * Animation loop callback signature
 */
export type AnimateCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Scene effect interface - all weather effects must implement this
 */
export interface SceneEffect {
  /** Update the effect each frame */
  update(deltaTime: number, elapsedTime: number): void;
  /** Clean up resources */
  dispose(): void;
  /** Get the Three.js object(s) for this effect */
  getObject(): THREE.Object3D | THREE.Object3D[];
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  property: keyof WeatherConfig;
  value: number | boolean;
  previousValue: number | boolean;
}

/**
 * UI control panel options
 */
export interface ControlPanelOptions {
  container: HTMLElement;
  initialConfig: WeatherConfig;
  onConfigChange: (event: ConfigChangeEvent) => void;
  onFpsToggle: (enabled: boolean) => void;
}

/**
 * FPS counter state
 */
export interface FpsState {
  frames: number;
  prevTime: number;
  lastFrameTime: number;
}

/**
 * Cloud particle with depth metadata
 */
export interface CloudMesh extends THREE.Mesh {
  userData: {
    depth: number;
  };
}

/**
 * Rain geometry with velocity/depth data
 */
export interface RainGeometry extends THREE.BufferGeometry {
  userData: ParticleSystemData;
}

/**
 * Mist geometry with depth data
 */
export interface MistGeometry extends THREE.BufferGeometry {
  userData: {
    depths: Float32Array;
  };
}

/**
 * Scene manager initialization options
 */
export interface SceneManagerOptions {
  container: HTMLElement;
  initialConfig: WeatherConfig;
}

/**
 * Lightning flash state
 */
export interface LightningState {
  lastFlashTime: number;
  nextFlashTime: number;
  flash: THREE.PointLight;
}
