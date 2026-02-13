/**
 * Check if WebGL is supported in the current browser
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Check if WebGL2 is supported
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Display a fallback message when WebGL is not available
 */
export function showWebGLError(container: HTMLElement): void {
  container.innerHTML = `
    <div class="webgl-error">
      <h1>WebGL Required</h1>
      <p>This application requires WebGL to run.</p>
      <p>Please try:</p>
      <ul>
        <li>Updating your browser to the latest version</li>
        <li>Enabling hardware acceleration in your browser settings</li>
        <li>Using a different browser (Chrome, Firefox, Edge)</li>
        <li>Updating your graphics drivers</li>
      </ul>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .webgl-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a2e;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 2rem;
    }
    .webgl-error h1 {
      color: #ff6b6b;
      margin-bottom: 1rem;
    }
    .webgl-error ul {
      text-align: left;
      margin-top: 1rem;
    }
    .webgl-error li {
      margin: 0.5rem 0;
    }
  `;
  document.head.appendChild(style);
}
