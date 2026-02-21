import * as THREE from 'three';
import { SceneEffect } from '../types';
import { LIGHTNING } from '../config/defaults';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single segment of a lightning bolt channel */
interface BoltSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  brightness: number; // 0-1 – main channel is 1, branches fade
  width: number;
}

/** Types of lightning events */
const enum StrikeType {
  /** Cloud-to-ground bolt with visible branching geometry */
  CloudToGround,
  /** Diffuse illumination within the cloud layer */
  Sheet,
  /** Faint glow on the distant horizon */
  HeatLightning,
}

/** Phases a single strike goes through */
const enum StrikePhase {
  Leader,       // dim bolt builds downward
  ReturnStroke, // intense bright flash
  Restrike,     // 0-3 secondary flashes
  Afterglow,    // lingering cloud illumination
  Done,
}

/** Full state for one active lightning event */
interface ActiveStrike {
  type: StrikeType;
  phase: StrikePhase;
  phaseTime: number;       // seconds spent in current phase
  phaseDuration: number;   // how long current phase lasts
  restrikeCount: number;   // remaining restrikes
  intensity: number;       // current overall brightness 0-1
  peakIntensity: number;   // max brightness for this strike
  originX: number;         // world X of strike origin
  originZ: number;         // world Z
  distance: number;        // 0-1 how far away (affects sound delay & brightness)
  segments: BoltSegment[]; // bolt geometry data (empty for sheet / heat)
  boltObject: THREE.LineSegments | null;
  glowObject: THREE.LineSegments | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─── Lightning system ───────────────────────────────────────────────────────

/**
 * Realistic atmospheric lightning system.
 *
 * Generates procedural branching bolts, sheet lightning inside clouds, and
 * distant heat-lightning flashes.  Each strike progresses through leader →
 * return-stroke → optional restrikes → afterglow phases.
 */
export class Lightning implements SceneEffect {
  // Container for all lightning objects
  private group: THREE.Group = new THREE.Group();

  // Lights
  private flashLight: THREE.PointLight;       // intense point for CG strikes
  private cloudLight: THREE.PointLight;       // soft wide light inside cloud layer
  private ambientBoost: THREE.AmbientLight;   // uniform scene-wide illumination
  private hemiBoost: THREE.HemisphereLight;   // sky/ground gradient for even cloud lighting

  // State
  private enabled: boolean = true;
  private frequency: number = 40;
  private lastStrikeTime: number = 0;
  private nextStrikeTime: number = 0;
  private activeStrikes: ActiveStrike[] = [];

  // Rumble / screen-shake
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0;

  constructor(initialFrequency: number = 40, initialEnabled: boolean = true) {
    this.frequency = initialFrequency;
    this.enabled = initialEnabled;

    // Main flash point light (CG bolts) — extended range, very low decay for maximum reach
    this.flashLight = new THREE.PointLight(0xaabbff, 0, 3500, 0.9);
    this.flashLight.position.set(0, 450, 0);
    this.group.add(this.flashLight);

    // Cloud interior illumination — wide soft glow with extended range
    this.cloudLight = new THREE.PointLight(0x99aaee, 0, 5000, 0.6);
    this.cloudLight.position.set(0, 620, 0);
    this.group.add(this.cloudLight);

    // Scene-wide uniform ambient boost — primary cloud illumination source
    this.ambientBoost = new THREE.AmbientLight(0x8899cc, 0);
    this.group.add(this.ambientBoost);

    // Hemisphere light: sky-color floods cloud layer evenly from above
    this.hemiBoost = new THREE.HemisphereLight(0x99aadd, 0x223344, 0);
    this.group.add(this.hemiBoost);

    // Schedule first strike soon so there's immediate feedback
    const now = performance.now() / 1000;
    this.nextStrikeTime = now + randomRange(1, 4);
    this.lastStrikeTime = now;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAllStrikes();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setFrequency(frequency: number): void {
    this.frequency = Math.max(0, Math.min(80, frequency));
    const now = performance.now() / 1000;
    const waited = now - this.lastStrikeTime;
    const avg = this.averageInterval();
    if (waited > avg * 1.3) {
      this.nextStrikeTime = now + randomRange(0.05, 0.3);
    } else {
      this.scheduleNextStrike(now);
    }
  }

  getFrequency(): number {
    return this.frequency;
  }

  getFlash(): THREE.PointLight {
    return this.flashLight;
  }

  // ── SceneEffect interface ───────────────────────────────────────────────

  update(deltaTime: number, elapsedTime: number): void {
    if (!this.enabled) {
      this.clearAllStrikes();
      return;
    }

    // Trigger new strikes
    if (elapsedTime >= this.nextStrikeTime) {
      this.triggerStrike();
      this.lastStrikeTime = elapsedTime;
      this.scheduleNextStrike(elapsedTime);

      // Storm bursts: when frequency high, 15 % chance of a rapid follow-up
      if (this.frequency > 35 && Math.random() < 0.15) {
        this.nextStrikeTime = elapsedTime + randomRange(0.15, 0.6);
      }
    }

    // Update active strikes
    this.updateStrikes(deltaTime);

    // Update screen shake
    this.updateShake(deltaTime);
  }

  getObject(): THREE.Object3D {
    return this.group;
  }

  dispose(): void {
    this.clearAllStrikes();
    this.flashLight.dispose();
    this.cloudLight.dispose();
    this.ambientBoost.dispose();
    this.hemiBoost.dispose();
  }

  // ── Scheduling ──────────────────────────────────────────────────────────

  private averageInterval(): number {
    // frequency 0 → ~20s, frequency 80 → ~0.8s
    return 20 - (this.frequency / 80) * 19.2;
  }

  private scheduleNextStrike(now: number): void {
    const avg = this.averageInterval();
    const interval = randomRange(avg * 0.6, avg * 1.4);
    this.nextStrikeTime = now + interval;
  }

  // ── Strike creation ─────────────────────────────────────────────────────

  private triggerStrike(): void {
    // Choose strike type based on weighted random
    const roll = Math.random();
    let type: StrikeType;
    if (roll < 0.45) {
      type = StrikeType.CloudToGround;
    } else if (roll < 0.78) {
      type = StrikeType.Sheet;
    } else {
      type = StrikeType.HeatLightning;
    }

    const distance = type === StrikeType.HeatLightning
      ? randomRange(0.7, 1.0)
      : randomRange(0.0, 0.6);

    const originX = randomRange(-500, 500);
    const originZ = randomRange(-400, 100);

    const peakIntensity = (1 - distance * 0.35) * randomRange(0.85, 1.0);

    const strike: ActiveStrike = {
      type,
      phase: StrikePhase.Leader,
      phaseTime: 0,
      phaseDuration: type === StrikeType.CloudToGround ? randomRange(0.04, 0.1) : randomRange(0.05, 0.12),
      restrikeCount: type === StrikeType.CloudToGround ? Math.floor(randomRange(0, 3.5)) : 0,
      intensity: 0,
      peakIntensity,
      originX,
      originZ,
      distance,
      segments: [],
      boltObject: null,
      glowObject: null,
    };

    // Generate bolt geometry for CG strikes
    if (type === StrikeType.CloudToGround) {
      strike.segments = this.generateBolt(originX, originZ);
      this.createBoltMesh(strike);
    }

    this.activeStrikes.push(strike);
  }

  // ── Procedural bolt generation ──────────────────────────────────────────

  private generateBolt(originX: number, originZ: number): BoltSegment[] {
    const segments: BoltSegment[] = [];
    const cloudY = randomRange(560, 650);
    const groundY = randomRange(-350, -250);
    const totalHeight = cloudY - groundY;

    // Main channel — jagged path from cloud to ground
    const mainSteps = Math.floor(randomRange(12, 22));
    const stepY = totalHeight / mainSteps;
    const mainPoints: THREE.Vector3[] = [];

    let cx = originX;
    let cz = originZ;
    for (let i = 0; i <= mainSteps; i++) {
      const y = cloudY - stepY * i;
      // Lateral jitter increases toward ground
      const jitterScale = 15 + (i / mainSteps) * 35;
      if (i > 0 && i < mainSteps) {
        cx += randomRange(-jitterScale, jitterScale);
        cz += randomRange(-jitterScale * 0.5, jitterScale * 0.5);
      }
      mainPoints.push(new THREE.Vector3(cx, y, cz));
    }

    // Build main-channel segments
    for (let i = 0; i < mainPoints.length - 1; i++) {
      segments.push({
        start: mainPoints[i],
        end: mainPoints[i + 1],
        brightness: 1.0,
        width: LIGHTNING.MAIN_BOLT_WIDTH,
      });
    }

    // Branches
    const branchCount = Math.floor(randomRange(3, 8));
    for (let b = 0; b < branchCount; b++) {
      // Pick a random point along the main channel (upper 70 %)
      const anchorIdx = Math.floor(randomRange(1, mainPoints.length * 0.7));
      const anchor = mainPoints[anchorIdx].clone();

      const branchSteps = Math.floor(randomRange(LIGHTNING.BRANCH_STEP_RANGE.min, LIGHTNING.BRANCH_STEP_RANGE.max));
      const branchDir = Math.random() < 0.5 ? -1 : 1;
      let bx = anchor.x;
      let by = anchor.y;
      let bz = anchor.z;

      const branchBrightness = randomRange(LIGHTNING.BRANCH_BRIGHTNESS_RANGE.min, LIGHTNING.BRANCH_BRIGHTNESS_RANGE.max);

      let prev = anchor.clone();
      for (let s = 0; s < branchSteps; s++) {
        bx += branchDir * randomRange(LIGHTNING.BRANCH_DIR_RANGE.min, LIGHTNING.BRANCH_DIR_RANGE.max);
        by -= randomRange(LIGHTNING.BRANCH_DROP_RANGE.min, LIGHTNING.BRANCH_DROP_RANGE.max);
        bz += randomRange(LIGHTNING.BRANCH_DRIFT_RANGE.min, LIGHTNING.BRANCH_DRIFT_RANGE.max);
        const next = new THREE.Vector3(bx, by, bz);
        segments.push({
          start: prev.clone(),
          end: next.clone(),
          brightness: branchBrightness * (1 - s / branchSteps),
          width: LIGHTNING.BRANCH_WIDTH * (1 - s / branchSteps * 0.6),
        });
        prev = next;
      }
    }

    return segments;
  }

  private createBoltMesh(strike: ActiveStrike): void {
    const segs = strike.segments;
    if (segs.length === 0) return;

    // Core bolt (bright thin line)
    const positions = new Float32Array(segs.length * 6);
    const colors = new Float32Array(segs.length * 6);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const idx = i * 6;
      positions[idx] = s.start.x;
      positions[idx + 1] = s.start.y;
      positions[idx + 2] = s.start.z;
      positions[idx + 3] = s.end.x;
      positions[idx + 4] = s.end.y;
      positions[idx + 5] = s.end.z;

      // Color: hot white core, slightly blue tinted branches
      const b = s.brightness;
      colors[idx]     = lerp(0.55, 1.0, b);
      colors[idx + 1] = lerp(0.55, 1.0, b);
      colors[idx + 2] = 1.0;
      colors[idx + 3] = lerp(0.55, 1.0, b);
      colors[idx + 4] = lerp(0.55, 1.0, b);
      colors[idx + 5] = 1.0;
    }

    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    coreGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const coreMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });

    const coreLine = new THREE.LineSegments(coreGeo, coreMat);
    strike.boltObject = coreLine;
    this.group.add(coreLine);

    // Outer glow (wider, dimmer, more diffuse)
    const glowGeo = new THREE.BufferGeometry();
    const glowPositions = new Float32Array(positions.length);
    const glowColors = new Float32Array(colors.length);

    // Offset glow slightly outward for a bloom effect
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const idx = i * 6;
      const jx = randomRange(-2, 2);
      const jz = randomRange(-2, 2);
      glowPositions[idx]     = s.start.x + jx;
      glowPositions[idx + 1] = s.start.y;
      glowPositions[idx + 2] = s.start.z + jz;
      glowPositions[idx + 3] = s.end.x + jx;
      glowPositions[idx + 4] = s.end.y;
      glowPositions[idx + 5] = s.end.z + jz;

      const b = s.brightness * 0.7;
      glowColors[idx]     = lerp(0.4, 0.85, b);
      glowColors[idx + 1] = lerp(0.4, 0.8, b);
      glowColors[idx + 2] = 1.0;
      glowColors[idx + 3] = lerp(0.4, 0.85, b);
      glowColors[idx + 4] = lerp(0.4, 0.8, b);
      glowColors[idx + 5] = 1.0;
    }

    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));

    const glowMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });

    const glowLine = new THREE.LineSegments(glowGeo, glowMat);
    strike.glowObject = glowLine;
    this.group.add(glowLine);
  }

  // ── Per-frame strike updating ───────────────────────────────────────────

  private updateStrikes(dt: number): void {
    let totalFlash = 0;
    let totalCloud = 0;
    let totalAmbient = 0;
    let flashX = 0, flashZ = 0;
    let cloudX = 0, cloudZ = 0;
    let weightSum = 0;

    for (let i = this.activeStrikes.length - 1; i >= 0; i--) {
      const s = this.activeStrikes[i];
      s.phaseTime += dt;

      // Phase transitions
      if (s.phaseTime >= s.phaseDuration) {
        this.advancePhase(s);
        if (s.phase === StrikePhase.Done) {
          this.removeStrikeMesh(s);
          this.activeStrikes.splice(i, 1);
          continue;
        }
      }

      // Calculate intensity based on phase
      this.updateStrikeIntensity(s);

      // Accumulate lighting contributions
      const contrib = s.intensity * s.peakIntensity;

      if (s.type === StrikeType.CloudToGround) {
        totalFlash += contrib * 1.3;
        totalCloud += contrib * 0.6;
        flashX += s.originX * contrib;
        flashZ += s.originZ * contrib;
        weightSum += contrib;
      } else if (s.type === StrikeType.Sheet) {
        totalCloud += contrib * 0.8;
        cloudX += s.originX * contrib;
        cloudZ += s.originZ * contrib;
        weightSum += contrib;
      } else {
        // Heat lightning — faint ambient only
        totalCloud += contrib * 0.25;
      }

      totalAmbient += contrib * 0.75;

      // Update bolt mesh opacity
      this.updateBoltVisuals(s);
    }

    // Apply lighting effects
    this.applyLightingEffects(totalFlash, totalCloud, totalAmbient, dt);
    this.updateLightPositions(flashX, flashZ, cloudX, cloudZ, weightSum);
  }
  
  private applyLightingEffects(totalFlash: number, totalCloud: number, totalAmbient: number, dt: number): void {
    // Apply accumulated lighting — extreme multipliers for intense flashes
    let flashIntensity = totalFlash * LIGHTNING.FLASH_CONTRIBUTION;
    let cloudIntensity = totalCloud * LIGHTNING.CLOUD_CONTRIBUTION;

    // Original-style per-frame multi-stage flicker / spike
    flashIntensity = this.applyFlashFlicker(flashIntensity, dt);
    cloudIntensity = this.applyCloudFlicker(cloudIntensity, dt);

    this.flashLight.intensity = Math.min(flashIntensity, LIGHTNING.FLASH_MAX_INTENSITY);
    this.cloudLight.intensity = Math.min(cloudIntensity, LIGHTNING.CLOUD_MAX_INTENSITY);

    // Uniform lighting: pushed to much higher levels for true dazzling effect
    const ambientLevel = Math.min(totalAmbient * LIGHTNING.AMBIENT_MULTIPLIER, LIGHTNING.MAX_AMBIENT_BOOST);
    this.ambientBoost.intensity = ambientLevel;
    this.hemiBoost.intensity = ambientLevel * LIGHTNING.HEMI_BOOST_FACTOR;
  }
  
  private applyFlashFlicker(flashIntensity: number, dt: number): number {
    if (flashIntensity <= 0) return flashIntensity;
    
    const normalized = flashIntensity / 4000; // rough 0-1

    if (normalized > LIGHTNING.FLASH_BRIGHT_THRESHOLD) {
      // Bright phase: frequent strong spikes
      if (Math.random() < LIGHTNING.BRIGHT_FLICKER_CHANCE) {
        flashIntensity *= LIGHTNING.BRIGHT_FLICKER_RANGE.min + Math.random() * LIGHTNING.BRIGHT_FLICKER_RANGE.max;
      }
    } else if (normalized > LIGHTNING.FLASH_MID_THRESHOLD) {
      // Mid phase: occasional moderate spikes
      if (Math.random() < LIGHTNING.MID_FLICKER_CHANCE) {
        flashIntensity *= LIGHTNING.MID_FLICKER_RANGE.min + Math.random() * LIGHTNING.MID_FLICKER_RANGE.max;
      }
    } else {
      // Late phase: rare subtle spikes
      if (Math.random() < LIGHTNING.LATE_FLICKER_CHANCE) {
        flashIntensity *= LIGHTNING.LATE_FLICKER_RANGE.min + Math.random() * LIGHTNING.LATE_FLICKER_RANGE.max;
      }
    }

    // Apply exponential decay
    flashIntensity *= Math.pow(LIGHTNING.FLASH_DECAY_RATE, dt * 60);
    return flashIntensity;
  }
  
  private applyCloudFlicker(cloudIntensity: number, dt: number): number {
    if (cloudIntensity <= 0) return cloudIntensity;
    
    // Cloud point light gets a softer version of the flicker
    if (Math.random() < LIGHTNING.CLOUD_FLICKER_CHANCE) {
      cloudIntensity *= LIGHTNING.CLOUD_FLICKER_RANGE.min + Math.random() * LIGHTNING.CLOUD_FLICKER_RANGE.max;
    }
    cloudIntensity *= Math.pow(LIGHTNING.CLOUD_DECAY_RATE, dt * 60);
    return cloudIntensity;
  }
  
  private updateLightPositions(flashX: number, flashZ: number, cloudX: number, cloudZ: number, weightSum: number): void {
    if (weightSum > 0) {
      this.flashLight.position.set(flashX / weightSum, 450, flashZ / weightSum);
      this.cloudLight.position.set(
        cloudX / weightSum + randomRange(-LIGHTNING.POSITION_JITTER.x, LIGHTNING.POSITION_JITTER.x),
        620 + randomRange(-LIGHTNING.POSITION_JITTER.y, LIGHTNING.POSITION_JITTER.y),
        cloudZ / weightSum + randomRange(-LIGHTNING.POSITION_JITTER.z, LIGHTNING.POSITION_JITTER.z)
      );
    }
  }

  private advancePhase(s: ActiveStrike): void {
    s.phaseTime = 0;

    switch (s.phase) {
      case StrikePhase.Leader:
        s.phase = StrikePhase.ReturnStroke;
        s.phaseDuration = randomRange(0.06, 0.18);
        // Trigger screen shake for close CG bolts
        if (s.type === StrikeType.CloudToGround && s.distance < 0.4) {
          this.shakeIntensity = (1 - s.distance) * s.peakIntensity * LIGHTNING.SHAKE_FACTOR;
          this.shakeDecay = randomRange(1.5, 3.0);
        }
        break;

      case StrikePhase.ReturnStroke:
        if (s.restrikeCount > 0) {
          s.phase = StrikePhase.Restrike;
          s.phaseDuration = randomRange(0.04, 0.14);
          s.restrikeCount--;
          // Jitter bolt slightly for restrike
          this.jitterBoltSegments(s);
        } else {
          s.phase = StrikePhase.Afterglow;
          s.phaseDuration = randomRange(0.5, 1.2);
        }
        break;

      case StrikePhase.Restrike:
        if (s.restrikeCount > 0 && Math.random() < 0.7) {
          s.phaseDuration = randomRange(0.04, 0.14);
          s.restrikeCount--;
          this.jitterBoltSegments(s);
        } else {
          s.phase = StrikePhase.Afterglow;
          s.phaseDuration = randomRange(0.5, 1.2);
        }
        break;

      case StrikePhase.Afterglow:
        s.phase = StrikePhase.Done;
        break;
    }
  }

  private updateStrikeIntensity(s: ActiveStrike): void {
    const t = Math.min(s.phaseTime / s.phaseDuration, 1);

    switch (s.phase) {
      case StrikePhase.Leader:
        // Dim build-up
        s.intensity = t * 0.25;
        break;
      case StrikePhase.ReturnStroke:
        // Blinding peak — stays very bright through most of the phase
        s.intensity = 1.0 - t * t * 0.1;
        break;
      case StrikePhase.Restrike:
        // Sharp bright re-flash
        s.intensity = (1.0 - t * 0.2) * randomRange(0.65, 0.95);
        break;
      case StrikePhase.Afterglow:
        // Lingering glow, slower fade
        s.intensity = (1 - t) * (1 - t) * 0.45;
        break;
      default:
        s.intensity = 0;
    }
  }

  private updateBoltVisuals(s: ActiveStrike): void {
    if (!s.boltObject || !s.glowObject) return;

    const mat = s.boltObject.material as THREE.LineBasicMaterial;
    const glowMat = s.glowObject.material as THREE.LineBasicMaterial;

    const viz = s.intensity * s.peakIntensity;

    if (s.phase === StrikePhase.Afterglow || s.phase === StrikePhase.Done) {
      // Bolt invisible during afterglow — only ambient light remains
      mat.opacity = 0;
      glowMat.opacity = 0;
    } else {
      // Bolt visuals punch hard — fully saturated core with wide glow
      mat.opacity = Math.min(viz * 1.8, 1.0);
      glowMat.opacity = Math.min(viz * 1.1, 0.85);
    }
  }

  /** Randomly perturb bolt segments for restrike variation */
  private jitterBoltSegments(s: ActiveStrike): void {
    if (!s.boltObject) return;

    const posAttr = s.boltObject.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < arr.length; i += 3) {
      arr[i]     += randomRange(-LIGHTNING.SEGMENT_JITTER.x, LIGHTNING.SEGMENT_JITTER.x);  // x
      arr[i + 2] += randomRange(-LIGHTNING.SEGMENT_JITTER.z, LIGHTNING.SEGMENT_JITTER.z);  // z
    }
    posAttr.needsUpdate = true;
  }

  // ── Screen shake ────────────────────────────────────────────────────────

  private updateShake(dt: number): void {
    if (this.shakeIntensity <= 0.01) {
      this.shakeIntensity = 0;
      // Reset the group position if it was shaking
      this.group.position.set(0, 0, 0);
      return;
    }

    this.group.position.set(
      randomRange(-this.shakeIntensity, this.shakeIntensity),
      randomRange(-this.shakeIntensity * 0.5, this.shakeIntensity * 0.5),
      0
    );

    this.shakeIntensity *= Math.pow(LIGHTNING.SHAKE_DECAY_RATE, dt * this.shakeDecay);
  }

  // ── Cleanup helpers ─────────────────────────────────────────────────────

  private removeStrikeMesh(s: ActiveStrike): void {
    if (s.boltObject) {
      this.group.remove(s.boltObject);
      s.boltObject.geometry.dispose();
      (s.boltObject.material as THREE.Material).dispose();
      s.boltObject = null;
    }
    if (s.glowObject) {
      this.group.remove(s.glowObject);
      s.glowObject.geometry.dispose();
      (s.glowObject.material as THREE.Material).dispose();
      s.glowObject = null;
    }
  }

  private clearAllStrikes(): void {
    for (const s of this.activeStrikes) {
      this.removeStrikeMesh(s);
    }
    this.activeStrikes.length = 0;
    this.flashLight.intensity = 0;
    this.cloudLight.intensity = 0;
    this.ambientBoost.intensity = 0;
    this.hemiBoost.intensity = 0;
    this.shakeIntensity = 0;
    this.group.position.set(0, 0, 0);
  }
}
