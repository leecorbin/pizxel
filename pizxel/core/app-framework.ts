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
   * Register and activate an app
   */
  switchToApp(app: App): void {
    // Deactivate current app
    if (this.activeApp) {
      this.activeApp.onDeactivate();
    }

    // Activate new app
    this.activeApp = app;
    this.activeApp.onActivate();

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

    // Let app render to buffer
    this.activeApp.render(this.displayBuffer);

    // Copy buffer to display driver
    const display = this.deviceManager.getDisplay();
    const buffer = this.displayBuffer.getBuffer();

    for (let y = 0; y < this.displayBuffer.getHeight(); y++) {
      for (let x = 0; x < this.displayBuffer.getWidth(); x++) {
        display.setPixel(x, y, buffer[y][x]);
      }
    }

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
        console.log("\nExiting...");
        this.stop();
        this.deviceManager.shutdown().then(() => process.exit(0));
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
