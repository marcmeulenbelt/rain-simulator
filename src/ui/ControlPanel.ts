import { WeatherConfig, ConfigChangeEvent, ControlPanelOptions } from '../types';
import { getLightningFrequencyLabel, PRESETS, validateConfigValue } from '../config/defaults';

/**
 * Format wind speed value for display with km/h unit and direction arrow
 */
function formatWindSpeed(windSpeed: number): string {
  if (windSpeed === 0) return 'Calm';
  const arrow = windSpeed < 0 ? '← ' : ' →';
  const value = Math.abs(windSpeed);
  const label = windSpeed < 0 ? `${arrow}${value} km/h` : `${value} km/h${arrow}`;
  return label;
}

/**
 * UI Control Panel for adjusting weather settings
 */
export class ControlPanel {
  private container: HTMLElement;
  private config: WeatherConfig;
  private onConfigChange: (event: ConfigChangeEvent) => void;
  private onFpsToggle: (enabled: boolean) => void;
  private panelElement: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private fpsElement: HTMLElement | null = null;
  private documentClickHandler: ((e: MouseEvent) => void) | null = null;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  
  // Cached DOM elements
  private intensitySlider: HTMLInputElement | null = null;
  private intensityValue: HTMLElement | null = null;
  private lightningSlider: HTMLInputElement | null = null;
  private lightningValue: HTMLElement | null = null;
  private windSlider: HTMLInputElement | null = null;
  private windValue: HTMLElement | null = null;
  private fpsToggle: HTMLInputElement | null = null;
  private fpsDisplay: HTMLElement | null = null;

  constructor(options: ControlPanelOptions) {
    this.container = options.container;
    this.config = { ...options.initialConfig };
    this.onConfigChange = options.onConfigChange;
    this.onFpsToggle = options.onFpsToggle;

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    // Create toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'toggle-ui';
    this.toggleButton.setAttribute('aria-label', 'Open weather controls');
    this.toggleButton.setAttribute('aria-expanded', 'false');
    this.toggleButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>';
    this.toggleButton.style.opacity = '0.6';
    this.toggleButton.style.pointerEvents = 'auto';
    this.container.appendChild(this.toggleButton);

    // Create panel
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'ui';
    this.panelElement.setAttribute('role', 'complementary');
    this.panelElement.setAttribute('aria-label', 'Weather controls');
    this.panelElement.classList.add('hidden');
    this.panelElement.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="gear" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
          Controls
        </div>
        <button id="hide-ui" class="close-btn" aria-label="Close weather controls"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="slider-group">
        <label for="intensity">Intensity: <span id="intensityVal">${this.config.intensity}</span> mm/hr</label>
        <input type="range" id="intensity" min="0" max="100" value="${this.config.intensity}" step="1" aria-label="Rain intensity">
      </div>

      <div class="slider-group">
        <label for="windSpeed">Wind Speed: <span id="windSpeedVal">${formatWindSpeed(this.config.windSpeed)}</span></label>
        <input type="range" id="windSpeed" min="-50" max="50" value="${this.config.windSpeed}" step="5" aria-label="Wind speed">
      </div>

      <div class="slider-group">
        <label for="lightningFreq">Lightning Frequency: <span id="lightningFreqVal">${getLightningFrequencyLabel(this.config.lightningFrequency)}</span></label>
        <input type="range" id="lightningFreq" min="0" max="80" value="${this.config.lightningFrequency}" step="1" aria-label="Lightning frequency">
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="fpsToggle">
        <label for="fpsToggle">Show FPS Counter</label>
      </div>

      <div class="preset-group">
        <h4>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>
          Presets
        </h4>
        <div class="preset-buttons" role="group" aria-label="Weather presets">
          ${PRESETS.map((preset, index) => `
            <button class="preset-btn" data-preset="${index}" title="${preset.description || ''}" aria-label="Apply ${preset.name} preset">
              ${preset.name}
            </button>
          `).join('')}
        </div>
      </div>
      <p class="keyboard-hint" aria-live="polite">Press <kbd>C</kbd> to open · <kbd>Esc</kbd> to close</p>
    `;
    this.container.appendChild(this.panelElement);

    // Create FPS counter
    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps';
    this.fpsElement.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg><span>-- fps</span>';
    this.container.appendChild(this.fpsElement);
    
    // Cache DOM element references
    this.cacheElements();
  }
  
  private cacheElements(): void {
    if (!this.panelElement) return;
    
    this.intensitySlider = this.panelElement.querySelector('#intensity');
    this.intensityValue = this.panelElement.querySelector('#intensityVal');
    this.lightningSlider = this.panelElement.querySelector('#lightningFreq');
    this.lightningValue = this.panelElement.querySelector('#lightningFreqVal');
    this.windSlider = this.panelElement.querySelector('#windSpeed');
    this.windValue = this.panelElement.querySelector('#windSpeedVal');
    this.fpsToggle = this.panelElement.querySelector('#fpsToggle');
    this.fpsDisplay = this.fpsElement?.querySelector('span') || null;
  }

  private attachEventListeners(): void {
    if (!this.panelElement || !this.toggleButton) return;

    this.attachPanelToggleListeners();
    this.attachSliderListeners();
    this.attachFpsToggleListener();
    this.attachPresetListeners();
  }
  
  private attachPanelToggleListeners(): void {
    if (!this.panelElement || !this.toggleButton) return;
    
    // Toggle panel visibility
    const hideBtn = this.panelElement.querySelector('#hide-ui');
    hideBtn?.addEventListener('click', () => {
      this.panelElement?.classList.add('hidden');
      this.showToggleButton();
    });

    this.toggleButton.addEventListener('click', () => {
      this.panelElement?.classList.remove('hidden');
      this.hideToggleButton();
    });

    // Close panel when clicking outside
    this.documentClickHandler = (e: MouseEvent) => {
      if (!this.panelElement?.classList.contains('hidden') &&
          !this.panelElement?.contains(e.target as Node) &&
          !this.toggleButton?.contains(e.target as Node)) {
        this.panelElement?.classList.add('hidden');
        this.showToggleButton();
      }
    };
    document.addEventListener('click', this.documentClickHandler);
    
    // Keyboard shortcuts: C = open, Escape = close
    this.keyboardHandler = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape' && !this.panelElement?.classList.contains('hidden')) {
        this.panelElement?.classList.add('hidden');
        this.showToggleButton();
      } else if ((e.key === 'c' || e.key === 'C') && !inInput && this.panelElement?.classList.contains('hidden')) {
        this.panelElement?.classList.remove('hidden');
        this.hideToggleButton();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  private attachSliderListeners(): void {
    // Intensity slider
    this.intensitySlider?.addEventListener('input', () => {
      if (!this.intensitySlider) return;
      const value = parseInt(this.intensitySlider.value);
      if (this.intensityValue) this.intensityValue.textContent = value.toString();
      this.emitChange('intensity', value);
    });

    // Lightning frequency slider
    this.lightningSlider?.addEventListener('input', () => {
      if (!this.lightningSlider) return;
      const value = parseInt(this.lightningSlider.value);
      if (this.lightningValue) this.lightningValue.textContent = getLightningFrequencyLabel(value);
      this.emitChange('lightningFrequency', value);
    });
    
    // Wind speed slider
    this.windSlider?.addEventListener('input', () => {
      if (!this.windSlider) return;
      const value = parseInt(this.windSlider.value);
      if (this.windValue) this.windValue.textContent = formatWindSpeed(value);
      this.emitChange('windSpeed', value);
    });
  }
  
  private attachFpsToggleListener(): void {
    this.fpsToggle?.addEventListener('change', () => {
      if (!this.fpsToggle) return;
      this.onFpsToggle(this.fpsToggle.checked);
      this.fpsElement?.classList.toggle('visible', this.fpsToggle.checked);
    });
  }
  
  private attachPresetListeners(): void {
    if (!this.panelElement) return;
    
    const presetButtons = this.panelElement.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-preset') || '0');
        this.applyPreset(PRESETS[index].config);

        // Update active state
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
  
  private showToggleButton(): void {
    if (this.toggleButton) {
      setTimeout(() => {
        this.toggleButton!.style.opacity = '0.6';
        this.toggleButton!.style.pointerEvents = 'auto';
        this.toggleButton!.setAttribute('aria-expanded', 'false');
      }, 100);
    }
  }
  
  private hideToggleButton(): void {
    if (this.toggleButton) {
      this.toggleButton.style.opacity = '0';
      this.toggleButton.style.pointerEvents = 'none';
      this.toggleButton.setAttribute('aria-expanded', 'true');
    }
  }

  private emitChange(property: keyof WeatherConfig, value: number | boolean): void {
    // Clamp numeric values to valid bounds before propagating
    const validated = typeof value === 'number' ? validateConfigValue(property, value) : value;
    const previousValue = this.config[property];
    this.config = { ...this.config, [property]: validated };
    this.onConfigChange({ property, value: validated, previousValue });
  }

  private applyPreset(config: WeatherConfig): void {
    // Update sliders using cached elements
    if (this.intensitySlider) this.intensitySlider.value = config.intensity.toString();
    if (this.intensityValue) this.intensityValue.textContent = config.intensity.toString();
    if (this.lightningSlider) this.lightningSlider.value = config.lightningFrequency.toString();
    if (this.lightningValue) this.lightningValue.textContent = getLightningFrequencyLabel(config.lightningFrequency);
    if (this.windSlider) this.windSlider.value = config.windSpeed.toString();
    if (this.windValue) this.windValue.textContent = formatWindSpeed(config.windSpeed);

    // Emit changes
    this.emitChange('intensity', config.intensity);
    this.emitChange('lightningFrequency', config.lightningFrequency);
    this.emitChange('windSpeed', config.windSpeed);
  }

  /**
   * Update the FPS display
   */
  updateFps(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${fps} fps`;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): WeatherConfig {
    return { ...this.config };
  }

  /**
   * Clean up event listeners and remove DOM elements.
   */
  dispose(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    this.toggleButton?.remove();
    this.panelElement?.remove();
    this.fpsElement?.remove();
  }
}
