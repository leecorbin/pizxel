/**
 * App Framework
 *
 * Event-driven app lifecycle with dirty flag pattern.
 * ~60fps event loop, no blocking code allowed in apps.
 */

import { App, InputEvent } from "../types";
import { DisplayBuffer } from "./display-buffer";
import { DeviceManager } from "./device-manager";
import { NotificationManager } from "./notification-manager";
import { StandbyManager } from "../standby-manager";
import { debugLog } from "./debug";

export class AppFramework {
  private activeApp: App | null = null;
  private launcherApp: App | null = null; // Reference to launcher
  private deviceManager: DeviceManager;
  private displayBuffer: DisplayBuffer;
  private notificationManager: NotificationManager;
  private standbyManager: StandbyManager;

  private running: boolean = false;
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / this.targetFPS;

  private lastError: { appName: string; message: string } | null = null;
  private registeredApps: Map<string, App> = new Map();
  private appsById: Map<string, App> = new Map(); // Scanned apps, opened or not
  private lastBackgroundTick: number = 0;
  private backgroundTickInterval: number = 1000; // 1 second

  private appBeforeStandby: App | null = null; // Save app to return to
  private standbyShowing: boolean = false; // A standby app was switched to

  constructor(deviceManager: DeviceManager) {
    this.deviceManager = deviceManager;
    this.displayBuffer = new DisplayBuffer(
      deviceManager.getDisplay().getWidth(),
      deviceManager.getDisplay().getHeight()
    );
    this.notificationManager = new NotificationManager();
    this.standbyManager = new StandbyManager();

    // Wire up standby callbacks
    this.standbyManager.onStandbyActivate = (appId: string) => {
      this.activateStandby(appId);
    };
    this.standbyManager.onStandbyDeactivate = () => {
      this.deactivateStandby();
    };
  }

  /**
   * Set the frame rate (default 60fps)
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * Set the launcher app (used for ESC key)
   */
  setLauncher(launcher: App): void {
    this.launcherApp = launcher;
  }

  /**
   * Make an app findable by id (its directory name, e.g. "standby") without
   * activating it. Used for standby and other lookups of never-opened apps.
   */
  registerAppId(id: string, app: App): void {
    this.appsById.set(id, app);
  }

  /**
   * Find an app by id or name: exact match first, then case-insensitive
   */
  findApp(idOrName: string): App | null {
    const exact =
      this.appsById.get(idOrName) ?? this.registeredApps.get(idOrName);
    if (exact) {
      return exact;
    }

    const wanted = idOrName.toLowerCase();
    for (const [id, app] of this.appsById) {
      if (id.toLowerCase() === wanted || app.name.toLowerCase() === wanted) {
        return app;
      }
    }
    for (const app of this.registeredApps.values()) {
      if (app.name.toLowerCase() === wanted) {
        return app;
      }
    }
    return null;
  }

  /**
   * Register and activate an app
   */
  async switchToApp(app: App): Promise<void> {
    // Deactivate current app
    if (this.activeApp) {
      this.activeApp.onDeactivate();
    }

    // Clear last error when switching apps
    this.lastError = null;

    // Register app if not already registered
    if (!this.registeredApps.has(app.name)) {
      this.registeredApps.set(app.name, app);
    }

    // Activate new app
    this.activeApp = app;

    // Wire up request_foreground callback
    (app as any).request_foreground = (message?: string) => {
      this.notificationManager.requestForeground(
        app,
        message || "Needs attention",
        "urgent"
      );
    };

    await this.activeApp.onActivate();

    console.log(`Switched to app: ${app.name}`);
  }

  /**
   * Forget an app (e.g. uninstalled), returning to the launcher if it's open
   */
  async unregisterApp(app: App): Promise<void> {
    if (this.activeApp === app && this.launcherApp) {
      await this.switchToApp(this.launcherApp);
    }
    if (this.appBeforeStandby === app) {
      this.appBeforeStandby = null;
    }
    if (this.registeredApps.get(app.name) === app) {
      this.registeredApps.delete(app.name);
    }
    for (const [id, known] of this.appsById) {
      if (known === app) {
        this.appsById.delete(id);
      }
    }
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

    // Start standby manager
    this.standbyManager.start();

    console.log("Event loop started");

    // Start frame loop
    this.frameLoop();
  }

  /**
   * Stop the event loop
   */
  stop(): void {
    this.running = false;
    this.standbyManager.stop();
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

    // Update notification manager
    this.notificationManager.update();

    // Process background ticks (~1/second)
    if (now - this.lastBackgroundTick >= this.backgroundTickInterval) {
      this.processBackgroundTicks();
      this.lastBackgroundTick = now;
    }

    // Update active app
    if (this.activeApp) {
      try {
        this.activeApp.onUpdate(deltaTime);

        // Render if app is dirty
        if ((this.activeApp as any).dirty) {
          debugLog(`[AppFramework] App is dirty, rendering...`);
          this.render();
        }
      } catch (error) {
        this.handleAppError(this.activeApp, error);
      }
    }

    // Schedule next frame
    const elapsed = Date.now() - now;
    const delay = Math.max(0, this.frameInterval - elapsed);
    setTimeout(() => this.frameLoop(), delay);
  }

  /**
   * Process background ticks for inactive apps
   */
  private processBackgroundTicks(): void {
    for (const app of this.registeredApps.values()) {
      // Skip active app (gets onUpdate calls)
      if (app === this.activeApp) {
        continue;
      }

      // Call onBackgroundTick if implemented
      if (app.onBackgroundTick) {
        try {
          app.onBackgroundTick();
        } catch (error) {
          console.error(
            `[AppFramework] Background tick error in "${app.name}":`,
            error
          );
        }
      }
    }
  }

  /**
   * Render active app to display
   */
  private render(): void {
    if (!this.activeApp) {
      return;
    }

    debugLog("[AppFramework] render() called");

    try {
      // Let app render to buffer
      this.activeApp.render(this.displayBuffer);

      // Render notification overlay if present
      this.notificationManager.renderOverlay(this.displayBuffer);

      // Copy buffer to display driver
      const display = this.deviceManager.getDisplay();
      const buffer = this.displayBuffer.getBuffer();

      debugLog("[AppFramework] Copying buffer to display driver");
      for (let y = 0; y < this.displayBuffer.getHeight(); y++) {
        for (let x = 0; x < this.displayBuffer.getWidth(); x++) {
          display.setPixel(x, y, buffer[y][x]);
        }
      }

      debugLog("[AppFramework] Calling display.show()");
      display.show();
    } catch (error) {
      this.handleAppError(this.activeApp!, error);
    }
  }

  /**
   * Handle input events
   */
  private handleInput(event: InputEvent): void {
    if (!this.activeApp) {
      return;
    }

    // Notify standby manager of input (resets idle timer / exits standby)
    const wakingFromStandby = this.standbyShowing;
    this.standbyManager.onInputEvent();

    // The key that wakes from standby only wakes; the restored app never sees it
    if (wakingFromStandby) {
      return;
    }

    try {
      // Check if notification is showing and Enter is pressed
      const notification = this.notificationManager.getCurrent();
      if (notification && event.key === "Enter") {
        // Switch to the app that requested foreground
        const requestingApp = this.notificationManager.getRequestingApp();
        if (requestingApp && requestingApp !== this.activeApp) {
          console.log(
            `[AppFramework] Switching to requesting app: ${requestingApp.name}`
          );
          this.switchToApp(requestingApp);
          return;
        }
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
    } catch (error) {
      this.handleAppError(this.activeApp!, error);
    }
  }

  /**
   * Activate standby mode
   */
  private async activateStandby(appId: string): Promise<void> {
    console.log(`[AppFramework] Activating standby: ${appId}`);

    // Find standby app (by id or name, opened or not)
    const standbyApp = this.findApp(appId);
    if (!standbyApp) {
      console.error(`[AppFramework] Standby app "${appId}" not found`);
      return;
    }

    // Save current app to return to later
    this.appBeforeStandby = this.activeApp;
    this.standbyShowing = true;

    // Switch to standby app
    await this.switchToApp(standbyApp);

    // Call standby-specific activation if app supports it
    if ((standbyApp as any).onStandbyActivate) {
      (standbyApp as any).onStandbyActivate();
    }
  }

  /**
   * Deactivate standby mode (return to previous app)
   */
  private async deactivateStandby(): Promise<void> {
    // Nothing to undo if no standby app was shown (e.g. it wasn't found)
    if (!this.standbyShowing) {
      return;
    }
    this.standbyShowing = false;

    console.log("[AppFramework] Deactivating standby");

    // Call standby-specific deactivation if current app supports it
    if (this.activeApp && (this.activeApp as any).onStandbyDeactivate) {
      (this.activeApp as any).onStandbyDeactivate();
    }

    // Return to previous app (or launcher if none)
    const targetApp = this.appBeforeStandby || this.launcherApp;
    if (targetApp) {
      await this.switchToApp(targetApp);
    }

    this.appBeforeStandby = null;
  }

  /**
   * Get the standby manager (for configuration UI)
   */
  getStandbyManager(): StandbyManager {
    return this.standbyManager;
  }

  /**
   * Handle app crash - return to launcher with error message
   */
  private handleAppError(app: App, error: any): void {
    console.error(`[AppFramework] App "${app.name}" crashed:`, error);

    // Store error for launcher to display
    this.lastError = {
      appName: app.name,
      message: error?.message || String(error),
    };

    // Return to launcher if we have one and we're not already in it
    if (this.launcherApp && app !== this.launcherApp) {
      console.log("[AppFramework] Returning to launcher due to error...");
      this.switchToApp(this.launcherApp);
    } else {
      // If launcher itself crashed or no launcher, just stop
      console.error("[AppFramework] Fatal error - no recovery possible");
      this.stop();
    }
  }

  /**
   * Get and clear last error (for launcher to display)
   */
  getLastError(): { appName: string; message: string } | null {
    const error = this.lastError;
    this.lastError = null;
    return error;
  }

  /**
   * Get display buffer (for apps that need direct access)
   */
  getDisplayBuffer(): DisplayBuffer {
    return this.displayBuffer;
  }
}
