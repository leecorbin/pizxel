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

  private standbyEnabled: boolean = true;

  // App whose (async) onActivate hasn't finished: it isn't updated, drawn or
  // given input until it has
  private activating: App | null = null;
  // Notification on screen at the last render (to redraw when it changes)
  private shownNotification: unknown = null;

  /**
   * Called when Escape is pressed at the launcher and nothing handles it
   * (e.g. so a web viewer can leave full screen)
   */
  onUnhandledEscape: (() => void) | null = null;

  // Frame timing (performance.now(), in ms)
  private nextFrameTime: number = 0;
  private lastRenderTime: number = 0;
  private earlyRenderQueued: boolean = false;

  // Held keys, for isKeyDown(). Keys from sources that never send keyup (the
  // terminal) are released automatically after a timeout, reset by repeats.
  private keysDown: Map<string, NodeJS.Timeout | null> = new Map();
  private lastKeyPress: Map<string, number> = new Map();

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
   * Turn automatic standby (screensaver after idle) on or off (default on)
   */
  setStandbyEnabled(enabled: boolean): void {
    this.standbyEnabled = enabled;
  }

  /**
   * Set the display's brightness (0-100), if the display supports it
   * (e.g. the Pi framebuffer). Returns whether it did.
   */
  setDisplayBrightness(percent: number): boolean {
    const display = this.deviceManager.getDisplay() as any;
    if (typeof display.setBrightness !== "function") return false;
    display.setBrightness(percent);
    return true;
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

    this.activating = app;
    try {
      await app.onActivate();
    } catch (error) {
      if (this.activating === app) this.activating = null;
      this.handleAppError(app, error);
      return;
    }
    if (this.activating === app) this.activating = null;

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
    this.lastFrameTime = performance.now();
    this.nextFrameTime = this.lastFrameTime;

    // Set up input handler
    this.deviceManager.onInput(this.handleInput.bind(this));

    // Start standby manager
    if (this.standbyEnabled) {
      this.standbyManager.start();
    }

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
    this.releaseAllKeys();
    console.log("Event loop stopped");
  }

  /**
   * Main frame loop (~60fps)
   */
  private frameLoop(): void {
    if (!this.running) {
      return;
    }

    // Monotonic clock (Date.now() jumps when the system clock is set, e.g. by
    // NTP on a Pi without an RTC). Cap the step so a stall (GC, a slow frame,
    // laptop sleep) doesn't make games jump or objects pass through walls.
    const now = performance.now();
    const deltaTime = Math.min(
      Math.max(0, (now - this.lastFrameTime) / 1000), // Convert to seconds
      AppFramework.MAX_DELTA_TIME
    );
    this.lastFrameTime = now;

    // Update notification manager
    this.notificationManager.update();

    // Process background ticks (~1/second)
    if (now - this.lastBackgroundTick >= this.backgroundTickInterval) {
      this.processBackgroundTicks();
      this.lastBackgroundTick = now;
    }

    // Redraw when a notification appears or goes, even if the app is idle
    const notification = this.notificationManager.getCurrent();
    if (notification !== this.shownNotification && this.activeApp) {
      (this.activeApp as any).dirty = true;
    }

    // Update active app (once it has finished activating)
    if (this.activeApp && this.activating !== this.activeApp) {
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

    // Schedule the next frame against a fixed deadline, so the frame rate
    // doesn't drift with the time each frame takes (or setTimeout's lateness)
    this.nextFrameTime += this.frameInterval;
    const after = performance.now();
    if (this.nextFrameTime < after - this.frameInterval) {
      this.nextFrameTime = after; // Fell more than a frame behind: catch up
    }
    setTimeout(() => this.frameLoop(), Math.max(0, this.nextFrameTime - after));
  }

  /** Largest deltaTime passed to onUpdate, in seconds */
  static readonly MAX_DELTA_TIME = 0.1;

  /**
   * Whether a key is currently held down (for smooth movement in games).
   * Single letters match either case.
   */
  isKeyDown(key: string): boolean {
    return this.keysDown.has(AppFramework.keyStateName(key));
  }

  private static keyStateName(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  private releaseAllKeys(): void {
    for (const timer of this.keysDown.values()) {
      if (timer) clearTimeout(timer);
    }
    this.keysDown.clear();
  }

  /**
   * Track held keys. Returns false for events that shouldn't go further
   * (keyups, which apps receive only via onKeyUp).
   */
  private trackKey(event: InputEvent): boolean {
    if (event.type === "keyup") {
      if (event.key === "*") {
        this.releaseAllKeys();
      } else {
        const name = AppFramework.keyStateName(event.key);
        const timer = this.keysDown.get(name);
        if (timer) clearTimeout(timer);
        this.keysDown.delete(name);
      }
      return false;
    }

    const name = AppFramework.keyStateName(event.key);
    const previous = this.keysDown.get(name);
    if (previous) clearTimeout(previous);

    // The terminal can't report key releases, so guess: a key is held briefly
    // after a press, and kept held while its auto-repeat keeps arriving
    // (presses under 600ms apart). A tap then barely lingers.
    let timer: NodeJS.Timeout | null = null;
    if (event.source === "keyboard") {
      const now = performance.now();
      const repeating = now - (this.lastKeyPress.get(name) ?? -Infinity) < 600;
      this.lastKeyPress.set(name, now);
      timer = setTimeout(() => this.keysDown.delete(name), repeating ? 100 : 150);
    }
    this.keysDown.set(name, timer);
    return true;
  }

  /**
   * Draw straight away after input that changed the screen, instead of
   * waiting for the next frame (up to a whole frame interval later)
   */
  private queueEarlyRender(): void {
    if (this.earlyRenderQueued || !this.running) return;
    this.earlyRenderQueued = true;
    setImmediate(() => {
      this.earlyRenderQueued = false;
      if (
        !this.running ||
        !this.activeApp ||
        this.activating === this.activeApp ||
        !(this.activeApp as any).dirty
      ) {
        return;
      }
      // Don't render faster than the frame rate
      if (performance.now() - this.lastRenderTime < this.frameInterval / 2) {
        return;
      }
      this.render();
    });
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
    this.lastRenderTime = performance.now();

    try {
      // Let app render to buffer
      this.activeApp.render(this.displayBuffer);

      // Render notification overlay if present
      this.notificationManager.renderOverlay(this.displayBuffer);
      this.shownNotification = this.notificationManager.getCurrent();

      // Hand the frame to the display driver
      debugLog("[AppFramework] Showing frame");
      this.deviceManager.getDisplay().showPixels(this.displayBuffer.getPixels());
    } catch (error) {
      this.handleAppError(this.activeApp!, error);
    }

    if (this.activeApp && (this.activeApp as any).dirty) {
      this.queueEarlyRender();
    }
  }

  /**
   * Handle input events
   */
  private handleInput(event: InputEvent): void {
    if (!this.activeApp) {
      return;
    }

    // Held-key state; keyups go only to apps that ask for them
    if (!this.trackKey(event)) {
      try {
        this.activeApp.onKeyUp?.(event);
      } catch (error) {
        this.handleAppError(this.activeApp, error);
      }
      return;
    }

    // Notify standby manager of input (resets idle timer / exits standby)
    const wakingFromStandby = this.standbyShowing;
    this.standbyManager.onInputEvent();

    // The key that wakes from standby only wakes; the restored app never sees
    // it (not even as a held key)
    if (wakingFromStandby) {
      const name = AppFramework.keyStateName(event.key);
      const timer = this.keysDown.get(name);
      if (timer) clearTimeout(timer);
      this.keysDown.delete(name);
      return;
    }

    // The app is still starting up
    if (this.activating === this.activeApp) {
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
          this.notificationManager.dismiss();
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
          } else if (!event.repeat) {
            // At the launcher, ESC does nothing here (Ctrl+C exits locally)
            this.onUnhandledEscape?.();
          }
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
