/**
 * App Framework
 *
 * Event-driven app lifecycle with dirty flag pattern.
 * ~60fps event loop, no blocking code allowed in apps.
 */

import { App, InputEvent } from "../types";
import { DisplayBuffer } from "./display-buffer";
import { DeviceManager } from "./device-manager";

export class AppFramework {
  private activeApp: App | null = null;
  private launcherApp: App | null = null; // Reference to launcher
  private deviceManager: DeviceManager;
  private displayBuffer: DisplayBuffer;

  private running: boolean = false;
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / this.targetFPS;

  constructor(deviceManager: DeviceManager) {
    this.deviceManager = deviceManager;
    this.displayBuffer = new DisplayBuffer(
      deviceManager.getDisplay().getWidth(),
      deviceManager.getDisplay().getHeight()
    );
  }

  /**
   * Set the launcher app (used for ESC key)
   */
  setLauncher(launcher: App): void {
    this.launcherApp = launcher;
  }

  /**
   * Register and activate an app
   */
  async switchToApp(app: App): Promise<void> {
    // Deactivate current app
    if (this.activeApp) {
      this.activeApp.onDeactivate();
    }

    // Activate new app
    this.activeApp = app;
    await this.activeApp.onActivate();

    console.log(`Switched to app: ${app.name}`);
  }

  /**
   * Get the active app
   */
  getActiveApp(): App | null {
    return this.activeApp;
  }

  /**
   * Start the event loop
   */
  async run(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = Date.now();

    // Set up input handler
    this.deviceManager.onInput(this.handleInput.bind(this));

    console.log("Event loop started");

    // Start frame loop
    this.frameLoop();
  }

  /**
   * Stop the event loop
   */
  stop(): void {
    this.running = false;
    console.log("Event loop stopped");
  }

  /**
   * Main frame loop (~60fps)
   */
  private frameLoop(): void {
    if (!this.running) {
      return;
    }

    const now = Date.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = now;

    // Update active app
    if (this.activeApp) {
      this.activeApp.onUpdate(deltaTime);

      // Render if app is dirty
      if ((this.activeApp as any).dirty) {
        console.log(`[AppFramework] App is dirty, rendering...`);
        this.render();
      }
    }

    // Schedule next frame
    const elapsed = Date.now() - now;
    const delay = Math.max(0, this.frameInterval - elapsed);
    setTimeout(() => this.frameLoop(), delay);
  }

  /**
   * Render active app to display
   */
  private render(): void {
    if (!this.activeApp) {
      return;
    }

    console.log("[AppFramework] render() called");

    // Let app render to buffer
    this.activeApp.render(this.displayBuffer);

    // Copy buffer to display driver
    const display = this.deviceManager.getDisplay();
    const buffer = this.displayBuffer.getBuffer();

    console.log("[AppFramework] Copying buffer to display driver");
    for (let y = 0; y < this.displayBuffer.getHeight(); y++) {
      for (let x = 0; x < this.displayBuffer.getWidth(); x++) {
        display.setPixel(x, y, buffer[y][x]);
      }
    }

    console.log("[AppFramework] Calling display.show()");
    display.show();
  }

  /**
   * Handle input events
   */
  private handleInput(event: InputEvent): void {
    if (!this.activeApp) {
      return;
    }

    // Let app handle event
    const handled = this.activeApp.onEvent(event);

    // If app didn't handle, check for system keys
    if (!handled) {
      if (event.key === "Escape") {
        // ESC returns to launcher (or does nothing if already in launcher)
        // Only Ctrl+C (handled by OS) will exit the application
        if (this.activeApp !== this.launcherApp && this.launcherApp) {
          console.log("\nReturning to launcher...");
          this.switchToApp(this.launcherApp);
        }
        // If in launcher, ESC does nothing - user must use Ctrl+C to exit
      }
    }
  }

  /**
   * Get display buffer (for apps that need direct access)
   */
  getDisplayBuffer(): DisplayBuffer {
    return this.displayBuffer;
  }
}
