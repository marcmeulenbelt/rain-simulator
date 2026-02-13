import { WeatherConfig, ConfigChangeEvent, ControlPanelOptions } from '../types';
import { getLightningFrequencyLabel, PRESETS } from '../config/defaults';

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
    this.toggleButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>';
    this.toggleButton.style.opacity = '0.6';
    this.toggleButton.style.pointerEvents = 'auto';
    this.container.appendChild(this.toggleButton);

    // Create panel
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'ui';
    this.panelElement.classList.add('hidden');
    this.panelElement.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="gear" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
          Controls
        </div>
        <button id="hide-ui" class="close-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="slider-group">
        <label>Intensity: <span id="intensityVal">${this.config.intensity}</span> mm/hr</label>
        <input type="range" id="intensity" min="0" max="100" value="${this.config.intensity}" step="1">
      </div>

      <div class="slider-group">
        <label>Lightning Frequency: <span id="lightningFreqVal">${getLightningFrequencyLabel(this.config.lightningFrequency)}</span></label>
        <input type="range" id="lightningFreq" min="0" max="80" value="${this.config.lightningFrequency}" step="1">
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
        <div class="preset-buttons">
          ${PRESETS.map((preset, index) => `
            <button class="preset-btn" data-preset="${index}" title="${preset.description || ''}">
              ${preset.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    this.container.appendChild(this.panelElement);

    // Create FPS counter
    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps';
    this.fpsElement.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg><span>-- fps</span>';
    this.container.appendChild(this.fpsElement);
  }

  private attachEventListeners(): void {
    if (!this.panelElement || !this.toggleButton) return;

    // Toggle panel visibility
    const hideBtn = this.panelElement.querySelector('#hide-ui');
    hideBtn?.addEventListener('click', () => {
      this.panelElement?.classList.add('hidden');
      if (this.toggleButton) {
        setTimeout(() => {
          this.toggleButton!.style.opacity = '0.6';
          this.toggleButton!.style.pointerEvents = 'auto';
        }, 100);
      }
    });

    this.toggleButton.addEventListener('click', () => {
      this.panelElement?.classList.remove('hidden');
      if (this.toggleButton) {
        this.toggleButton.style.opacity = '0';
        this.toggleButton.style.pointerEvents = 'none';
      }
    });

    // Close panel when clicking outside
    this.documentClickHandler = (e: MouseEvent) => {
      if (!this.panelElement?.classList.contains('hidden') &&
          !this.panelElement?.contains(e.target as Node) &&
          !this.toggleButton?.contains(e.target as Node)) {
        this.panelElement?.classList.add('hidden');
        if (this.toggleButton) {
          setTimeout(() => {
            this.toggleButton!.style.opacity = '0.6';
            this.toggleButton!.style.pointerEvents = 'auto';
          }, 100);
        }
      }
    };
    document.addEventListener('click', this.documentClickHandler);

    // Intensity slider
    const intensitySlider = this.panelElement.querySelector('#intensity') as HTMLInputElement;
    const intensityVal = this.panelElement.querySelector('#intensityVal');
    intensitySlider?.addEventListener('input', () => {
      const value = parseInt(intensitySlider.value);
      if (intensityVal) intensityVal.textContent = value.toString();
      this.emitChange('intensity', value);
    });

    // Lightning frequency slider
    const freqSlider = this.panelElement.querySelector('#lightningFreq') as HTMLInputElement;
    const freqVal = this.panelElement.querySelector('#lightningFreqVal');
    freqSlider?.addEventListener('input', () => {
      const value = parseInt(freqSlider.value);
      if (freqVal) freqVal.textContent = getLightningFrequencyLabel(value);
      this.emitChange('lightningFrequency', value);
    });

    // FPS toggle
    const fpsToggle = this.panelElement.querySelector('#fpsToggle') as HTMLInputElement;
    fpsToggle?.addEventListener('change', () => {
      this.onFpsToggle(fpsToggle.checked);
      this.fpsElement?.classList.toggle('visible', fpsToggle.checked);
    });

    // Preset buttons
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

  private emitChange(property: keyof WeatherConfig, value: number | boolean): void {
    const previousValue = this.config[property];
    this.config = { ...this.config, [property]: value };
    this.onConfigChange({ property, value, previousValue });
  }

  private applyPreset(config: WeatherConfig): void {
    // Update sliders
    const intensitySlider = this.panelElement?.querySelector('#intensity') as HTMLInputElement;
    const intensityVal = this.panelElement?.querySelector('#intensityVal');
    const freqSlider = this.panelElement?.querySelector('#lightningFreq') as HTMLInputElement;
    const freqVal = this.panelElement?.querySelector('#lightningFreqVal');

    if (intensitySlider) intensitySlider.value = config.intensity.toString();
    if (intensityVal) intensityVal.textContent = config.intensity.toString();
    if (freqSlider) freqSlider.value = config.lightningFrequency.toString();
    if (freqVal) freqVal.textContent = getLightningFrequencyLabel(config.lightningFrequency);

    // Emit changes
    this.emitChange('intensity', config.intensity);
    this.emitChange('lightningFrequency', config.lightningFrequency);
  }

  /**
   * Update the FPS display
   */
  updateFps(fps: number): void {
    if (this.fpsElement) {
      const span = this.fpsElement.querySelector('span');
      if (span) {
        span.textContent = `${fps} fps`;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): WeatherConfig {
    return { ...this.config };
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
    this.toggleButton?.remove();
    this.panelElement?.remove();
    this.fpsElement?.remove();
  }
}
