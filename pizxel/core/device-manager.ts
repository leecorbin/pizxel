/**
 * Device Manager
 *
 * Manages device driver lifecycle and selection.
 * Auto-detects best available drivers based on priority.
 */

import { DisplayDriver, InputDriver } from "../drivers/base/device-driver";
import { InputEvent } from "../types";

export class DeviceManager {
  private displayDriver: DisplayDriver | null = null;
  private inputDriver: InputDriver | null = null;

  private displayDrivers: Array<new () => DisplayDriver> = [];
  private inputDrivers: Array<new () => InputDriver> = [];

  private initialized: boolean = false;

  /**
   * Register a display driver class
   */
  registerDisplayDriver(driverClass: new () => DisplayDriver): void {
    this.displayDrivers.push(driverClass);
  }

  /**
   * Register an input driver class
   */
  registerInputDriver(driverClass: new () => InputDriver): void {
    this.inputDrivers.push(driverClass);
  }

  /**
   * Use specific driver instances instead of auto-selecting from registered
   * classes (e.g. per-session drivers in server mode, or test drivers)
   */
  useDrivers(display: DisplayDriver, input: InputDriver): void {
    this.displayDriver = display;
    this.inputDriver = input;
  }

  /**
   * Initialize device manager and select best available drivers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Select and initialize display driver (unless one was provided)
    this.displayDriver ??= await this.selectDisplayDriver();
    if (!this.displayDriver) {
      throw new Error("No available display driver found");
    }

    console.log(`Selected display driver: ${this.displayDriver.name}`);
    await this.displayDriver.initialize();

    // Select and initialize input driver (unless one was provided)
    this.inputDriver ??= await this.selectInputDriver();
    if (!this.inputDriver) {
      throw new Error("No available input driver found");
    }

    console.log(`Selected input driver: ${this.inputDriver.name}`);
    await this.inputDriver.initialize();

    this.initialized = true;
  }

  /**
   * Shutdown all drivers
   */
  async shutdown(): Promise<void> {
    if (this.displayDriver) {
      await this.displayDriver.shutdown();
      this.displayDriver = null;
    }

    if (this.inputDriver) {
      await this.inputDriver.shutdown();
      this.inputDriver = null;
    }

    this.initialized = false;
  }

  /**
   * Get active display driver
   */
  getDisplay(): DisplayDriver {
    if (!this.displayDriver) {
      throw new Error("Display driver not initialized");
    }
    return this.displayDriver;
  }

  /**
   * Get active input driver
   */
  getInput(): InputDriver {
    if (!this.inputDriver) {
      throw new Error("Input driver not initialized");
    }
    return this.inputDriver;
  }

  /**
   * Register input event handler
   */
  onInput(callback: (event: InputEvent) => void): void {
    if (!this.inputDriver) {
      throw new Error("Input driver not initialized");
    }
    this.inputDriver.onEvent(callback);
  }

  /**
   * Select best available display driver based on priority
   */
  private async selectDisplayDriver(): Promise<DisplayDriver | null> {
    // Sort drivers by priority (highest first)
    const sorted = [...this.displayDrivers].sort((a, b) => {
      const aPriority = new a().priority;
      const bPriority = new b().priority;
      return bPriority - aPriority;
    });

    // Try each driver in priority order
    for (const DriverClass of sorted) {
      const driver = new DriverClass();
      if (await driver.isAvailable()) {
        return driver;
      }
    }

    return null;
  }

  /**
   * Select best available input driver based on priority
   */
  private async selectInputDriver(): Promise<InputDriver | null> {
    // Sort drivers by priority (highest first)
    const sorted = [...this.inputDrivers].sort((a, b) => {
      const aPriority = new a().priority;
      const bPriority = new b().priority;
      return bPriority - aPriority;
    });

    // Try each driver in priority order
    for (const DriverClass of sorted) {
      const driver = new DriverClass();
      if (await driver.isAvailable()) {
        return driver;
      }
    }

    return null;
  }
}
