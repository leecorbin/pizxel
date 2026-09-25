/**
 * Standby Manager
 *
 * Manages automatic standby/screensaver activation with time-based scheduling.
 * Any app can become the standby app based on time of day and day of week.
 */

import { App } from "./types";
import { AppStorage } from "./storage";

export interface StandbySchedule {
  app: string; // App ID
  startTime: string; // "09:00" 24-hour format
  endTime: string; // "17:00"
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  priority: number; // Higher priority wins conflicts
  enabled: boolean; // Can be disabled without deleting
}

export interface StandbyConfig {
  enabled: boolean;
  idleTimeoutSeconds: number; // Seconds before standby activates
  schedules: StandbySchedule[];
  defaultApp: string; // Fallback if no schedule matches
  brightnessMultiplier: number; // Dim factor for standby (0.1-1.0)
}

export class StandbyManager {
  private config: StandbyConfig;
  private lastInputTime: number;
  private checkInterval: NodeJS.Timeout | null = null;
  private isStandbyActive: boolean = false;
  private originalApp: App | null = null;
  private storage: AppStorage;

  constructor() {
    this.lastInputTime = Date.now();
    this.storage = new AppStorage("system");
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from storage or use defaults
   */
  private loadConfig(): StandbyConfig {
    const saved = this.storage.get<StandbyConfig>("config");
    if (saved) {
      return saved;
    }

    // Default configuration
    const defaultConfig: StandbyConfig = {
      enabled: true,
      idleTimeoutSeconds: 120, // 2 minutes
      schedules: [
        {
          app: "standby",
          startTime: "00:00",
          endTime: "23:59",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          priority: 1,
          enabled: true,
        },
      ],
      defaultApp: "standby",
      brightnessMultiplier: 0.15,
    };

    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Save configuration to storage
   */
  saveConfig(config: StandbyConfig): void {
    this.config = config;
    this.storage.set("config", config);
  }

  /**
   * Get current configuration
   */
  getConfig(): StandbyConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<StandbyConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig(this.config);
  }

  /**
   * Start monitoring for idle timeout
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 1000); // Check every second
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Called whenever user input occurs
   */
  onInputEvent(): void {
    this.lastInputTime = Date.now();

    if (this.isStandbyActive) {
      this.deactivate();
    }
  }

  /**
   * Check if enough time has elapsed to activate standby
   */
  private checkIdleStatus(): void {
    if (this.isStandbyActive || !this.config.enabled) {
      return;
    }

    const idleTime = Date.now() - this.lastInputTime;
    const threshold = this.config.idleTimeoutSeconds * 1000;

    if (idleTime >= threshold) {
      this.activate();
    }
  }

  /**
   * Activate standby mode
   */
  activate(): void {
    if (this.isStandbyActive) {
      return;
    }

    const targetApp = this.getActiveStandbyApp();
    if (!targetApp) {
      console.log("[StandbyManager] No standby app configured");
      return;
    }

    console.log(`[StandbyManager] Activating standby mode: ${targetApp}`);
    this.isStandbyActive = true;

    // This will be implemented by app framework integration
    this.notifyStandbyActivation(targetApp);
  }

  /**
   * Deactivate standby mode (return to previous app)
   */
  deactivate(): void {
    if (!this.isStandbyActive) {
      return;
    }

    console.log("[StandbyManager] Deactivating standby mode");
    this.isStandbyActive = false;

    // This will be implemented by app framework integration
    this.notifyStandbyDeactivation();
  }

  /**
   * Determine which app should be active based on current time
   */
  getActiveStandbyApp(): string | null {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const currentDay = now.getDay(); // 0-6

    // Filter enabled schedules that match current day
    const matchingSchedules = this.config.schedules
      .filter((s) => s.enabled)
      .filter((s) => s.daysOfWeek.includes(currentDay))
      .filter((s) => this.isTimeInRange(currentTime, s.startTime, s.endTime));

    if (matchingSchedules.length === 0) {
      return this.config.defaultApp;
    }

    // Sort by priority (highest first)
    matchingSchedules.sort((a, b) => b.priority - a.priority);

    return matchingSchedules[0].app;
  }

  /**
   * Check if current time is within schedule range
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    // Convert time strings to minutes since midnight for comparison
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = toMinutes(current);
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    // Handle ranges that span midnight
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Add a new schedule
   */
  addSchedule(schedule: StandbySchedule): void {
    this.config.schedules.push(schedule);
    this.saveConfig(this.config);
  }

  /**
   * Remove a schedule by index
   */
  removeSchedule(index: number): void {
    if (index >= 0 && index < this.config.schedules.length) {
      this.config.schedules.splice(index, 1);
      this.saveConfig(this.config);
    }
  }

  /**
   * Update a schedule by index
   */
  updateSchedule(index: number, updates: Partial<StandbySchedule>): void {
    if (index >= 0 && index < this.config.schedules.length) {
      this.config.schedules[index] = {
        ...this.config.schedules[index],
        ...updates,
      };
      this.saveConfig(this.config);
    }
  }

  /**
   * Check if standby is currently active
   */
  isActive(): boolean {
    return this.isStandbyActive;
  }

  /**
   * Force activate standby (for testing or manual trigger)
   */
  forceActivate(): void {
    this.lastInputTime = Date.now() - this.config.idleTimeoutSeconds * 1000;
    this.activate();
  }

  /**
   * Reset idle timer (as if user just interacted)
   */
  resetIdleTimer(): void {
    this.lastInputTime = Date.now();
  }

  /**
   * Get time until standby activation (in seconds)
   */
  getTimeUntilStandby(): number {
    if (!this.config.enabled || this.isStandbyActive) {
      return -1;
    }

    const idleTime = Date.now() - this.lastInputTime;
    const threshold = this.config.idleTimeoutSeconds * 1000;
    const remaining = threshold - idleTime;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  // --- Integration points (to be implemented by AppFramework) ---

  /**
   * Notify that standby should activate (AppFramework sets the callback)
   */
  private notifyStandbyActivation(appId: string): void {
    if (this.onStandbyActivate) {
      this.onStandbyActivate(appId);
    } else {
      console.log(`[StandbyManager] Would activate app: ${appId}`);
    }
  }

  /**
   * Notify that standby should deactivate (AppFramework sets the callback)
   */
  private notifyStandbyDeactivation(): void {
    if (this.onStandbyDeactivate) {
      this.onStandbyDeactivate();
    } else {
      console.log("[StandbyManager] Would deactivate standby");
    }
  }

  /**
   * Set callback for standby activation
   */
  onStandbyActivate: ((appId: string) => void) | null = null;

  /**
   * Set callback for standby deactivation
   */
  onStandbyDeactivate: (() => void) | null = null;
}
