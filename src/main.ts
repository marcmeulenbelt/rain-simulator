import './styles/main.css';
import { SceneManager } from './core/SceneManager';
import { Rain } from './effects/Rain';
import { Clouds } from './effects/Clouds';
import { Mist } from './effects/Mist';
import { Lightning } from './effects/Lightning';
import { ControlPanel } from './ui/ControlPanel';
import { DEFAULT_CONFIG } from './config/defaults';
import { isWebGLSupported, showWebGLError } from './utils/webgl';
import { ConfigChangeEvent, FpsState } from './types';

/**
 * Main application entry point
 */
class RainSimulatorApp {
  private sceneManager: SceneManager | null = null;
  private rain: Rain | null = null;
  private clouds: Clouds | null = null;
  private mist: Mist | null = null;
  private lightning: Lightning | null = null;
  private controlPanel: ControlPanel | null = null;
  private fpsState: FpsState = {
    frames: 0,
    prevTime: performance.now(),
    lastFrameTime: performance.now(),
  };
  private showFps: boolean = false;
  private cursorHideTimeout: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const container = document.getElementById('app');
    if (!container) {
      console.error('App container not found');
      return;
    }

    // Check WebGL support
    if (!isWebGLSupported()) {
      showWebGLError(container);
      return;
    }

    // Initialize scene manager
    this.sceneManager = new SceneManager(container);

    // Create effects
    this.clouds = new Clouds();
    this.mist = new Mist(DEFAULT_CONFIG.intensity);
    this.rain = new Rain(DEFAULT_CONFIG.intensity);
    this.lightning = new Lightning(
      DEFAULT_CONFIG.lightningFrequency,
      DEFAULT_CONFIG.lightningFrequency > 0
    );

    // Add effects to scene
    this.sceneManager.addEffect(this.clouds);
    this.sceneManager.addEffect(this.mist);
    this.sceneManager.addEffect(this.rain);
    this.sceneManager.addEffect(this.lightning);

    // Create control panel
    this.controlPanel = new ControlPanel({
      container,
      initialConfig: DEFAULT_CONFIG,
      onConfigChange: this.handleConfigChange.bind(this),
      onFpsToggle: this.handleFpsToggle.bind(this),
    });

    // Setup FPS tracking
    this.sceneManager.onAnimate(this.updateFps.bind(this));

    // Setup cursor auto-hiding
    this.setupCursorHiding();

    // Start animation loop
    this.sceneManager.start();
  }

  private handleConfigChange(event: ConfigChangeEvent): void {
    switch (event.property) {
      case 'intensity':
        this.rain?.setIntensity(event.value as number);
        this.mist?.setIntensity(event.value as number);
        break;
      case 'lightningFrequency':
        const frequency = event.value as number;
        this.lightning?.setFrequency(frequency);
        this.lightning?.setEnabled(frequency > 0);
        break;
      case 'windSpeed':
        this.rain?.setWindSpeed(event.value as number);
        break;
    }
  }

  private handleFpsToggle(enabled: boolean): void {
    this.showFps = enabled;
  }

  private updateFps(): void {
    if (!this.showFps || !this.controlPanel) return;

    this.fpsState.frames++;
    const now = performance.now();

    if (now - this.fpsState.prevTime >= 1000) {
      this.controlPanel.updateFps(this.fpsState.frames);
      this.fpsState.frames = 0;
      this.fpsState.prevTime = now;
    }
  }

  private setupCursorHiding(): void {
    const hideCursor = () => {
      document.body.classList.add('hide-cursor');
    };

    this.mouseMoveHandler = () => {
      document.body.classList.remove('hide-cursor');
      
      // Clear existing timeout
      if (this.cursorHideTimeout !== null) {
        clearTimeout(this.cursorHideTimeout);
      }
      
      // Set new timeout to hide cursor after 3 seconds
      this.cursorHideTimeout = window.setTimeout(hideCursor, 3000);
    };

    // Show cursor on mouse movement
    document.addEventListener('mousemove', this.mouseMoveHandler);
    
    // Initial timeout
    this.cursorHideTimeout = window.setTimeout(hideCursor, 3000);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    if (this.cursorHideTimeout !== null) {
      clearTimeout(this.cursorHideTimeout);
    }
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }
    this.controlPanel?.dispose();
    this.sceneManager?.dispose();
  }
}

// Initialize application
const app = new RainSimulatorApp();

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});

export { RainSimulatorApp };
