import { WeatherConfig, WeatherPreset, LightningFrequencyLabel } from '../types';

/**
 * Default weather configuration
 */
export const DEFAULT_CONFIG: WeatherConfig = {
  intensity: 25,
  lightningFrequency: 0,
  windSpeed: 0,
};

/**
 * Weather presets for quick scene changes
 */
export const PRESETS: WeatherPreset[] = [
  {
    name: 'Light Drizzle',
    description: 'Gentle, peaceful rain',
    config: { intensity: 8, lightningFrequency: 0, windSpeed: 10 },
  },
  {
    name: 'Steady Rain',
    description: 'Moderate rainfall',
    config: { intensity: 25, lightningFrequency: 0, windSpeed: 0 },
  },
  {
    name: 'Thunderstorm',
    description: 'Heavy rain with frequent lightning',
    config: { intensity: 60, lightningFrequency: 55, windSpeed: 40 },
  },
  {
    name: 'Monsoon',
    description: 'Torrential downpour',
    config: { intensity: 90, lightningFrequency: 70, windSpeed: 50 },
  },
];

/**
 * Scene configuration constants
 */
export const SCENE = {
  /** Fog density */
  FOG_DENSITY: 0.002,
  /** Fog/background color */
  FOG_COLOR: 0x0a0f1f,
  /** Camera field of view */
  CAMERA_FOV: 60,
  /** Camera near plane */
  CAMERA_NEAR: 1,
  /** Camera far plane */
  CAMERA_FAR: 2000,
  /** Camera initial position */
  CAMERA_POSITION: { x: 0, y: 0, z: 1 },
  /** Camera initial rotation */
  CAMERA_ROTATION: { x: 0.8, y: -0.12, z: 0.27 },
} as const;

/**
 * Lighting configuration
 */
export const LIGHTING = {
  AMBIENT_COLOR: 0x3a4a66,
  AMBIENT_INTENSITY: 0.7,
  DIRECTIONAL_COLOR: 0xffeedd,
  DIRECTIONAL_INTENSITY: 0.4,
  DIRECTIONAL_POSITION: { x: 100, y: 200, z: 50 },
  FLASH_COLOR: 0x88aaff,
  FLASH_DISTANCE: 800,
  FLASH_DECAY: 2,
} as const;

/**
 * Cloud configuration
 */
export const CLOUDS = {
  COUNT: 30,
  SIZE: 800,
  OPACITY: 0.55,
  Y_BASE: 600,
  Y_RANGE: 200,
  X_SPREAD: 1000,
  Z_RANGE: { min: -400, max: 200 },
  ROTATION_SPEED: 0.0003,
} as const;

/**
 * Rain configuration
 */
export const RAIN = {
  /** Base particle count at minimum intensity */
  BASE_COUNT: 3000,
  /** Maximum additional particles at full intensity */
  MAX_ADDITIONAL: 32000,
  /** Base fall speed */
  BASE_SPEED: 4.5,
  /** Speed variation range */
  SPEED_VARIATION: 3.5,
  /** Minimum speed multiplier */
  MIN_SPEED_MULT: 0.8,
  /** Maximum speed multiplier from intensity */
  MAX_SPEED_MULT: 3.5,
  /** Spatial bounds */
  BOUNDS: { x: 800, y: 1400, z: 800 },
  /** Reset height */
  RESET_Y: -400,
  /** Spawn height range */
  SPAWN_Y: { base: 600, range: 400 },
  /** Streak length range based on intensity */
  STREAK_LENGTH: { base: 8, multiplier: 15 },
  /** Rain color */
  COLOR: 0xaaccff,
  /** Base opacity */
  BASE_OPACITY: 0.5,
  /** Opacity increase at full intensity */
  OPACITY_RANGE: 0.4,
} as const;

/**
 * Mist configuration
 */
export const MIST = {
  COUNT: 2000,
  SIZE: 12,
  INITIAL_OPACITY: 0.08,
  BASE_OPACITY: 0.05,
  MAX_OPACITY: 0.20,
  BOUNDS: { x: 1600, y: 400, z: 1600 },
  COLOR: 0x556677,
  PARTICLE_SIZE: { base: 8, range: 15 },
} as const;

/**
 * Lightning configuration
 */
export const LIGHTNING = {
  /** Minimum interval at max frequency (seconds) */
  MIN_INTERVAL: 0.8,
  /** Maximum interval at min frequency (seconds) */
  MAX_INTERVAL: 20,
  /** Interval variation factor */
  INTERVAL_VARIATION: 0.4,
  /** Flash position bounds */
  POSITION_BOUNDS: { x: 1000, y: { base: 560, range: 90 }, z: { min: -400, max: 100 } },
  /** Main bolt cloud-to-ground height range */
  BOLT_Y: { cloud: { min: 560, max: 650 }, ground: { min: -350, max: -250 } },
  /** Bolt lateral jitter range */
  BOLT_JITTER: { base: 15, scale: 35 },
  /** Number of main-channel steps */
  BOLT_STEPS: { min: 12, max: 22 },
  /** Number of branches per bolt */
  BRANCH_COUNT: { min: 3, max: 8 },
  /** Flash light max intensity */
  FLASH_MAX_INTENSITY: 15000,
  /** Cloud light max intensity */
  CLOUD_MAX_INTENSITY: 6000,
  /** Storm burst probability (at high frequency) */
  STORM_BURST_CHANCE: 0.15,
  /** Minimum frequency for storm bursts */
  STORM_BURST_MIN_FREQ: 35,
  /** Screen-shake intensity factor */
  SHAKE_FACTOR: 3.5,
} as const;

/**
 * Get lightning frequency label from numeric value
 */
export function getLightningFrequencyLabel(frequency: number): LightningFrequencyLabel {
  if (frequency === 0) return 'None';
  if (frequency < 16) return 'Rare';
  if (frequency < 32) return 'Occasional';
  if (frequency < 48) return 'Medium';
  if (frequency < 64) return 'Frequent';
  return 'Very Frequent';
}

/**
 * Calculate lightning interval from frequency setting
 */
export function calculateLightningInterval(frequency: number): { min: number; max: number; avg: number } {
  const avg = LIGHTNING.MAX_INTERVAL - (frequency / 80) * (LIGHTNING.MAX_INTERVAL - LIGHTNING.MIN_INTERVAL);
  return {
    avg,
    min: avg * (1 - LIGHTNING.INTERVAL_VARIATION),
    max: avg * (1 + LIGHTNING.INTERVAL_VARIATION),
  };
}
