/**
 * PiZXel Type Definitions
 *
 * Core type definitions for the PiZXel operating system.
 */

/**
 * RGB color tuple [red, green, blue] where each value is 0-255
 */
export type RGB = [number, number, number];

/**
 * Input event types
 */
export interface InputEvent {
  key: string; // 'ArrowUp', 'Enter', ' ' (space), etc.
  type: "keydown" | "keyup";
  timestamp: number; // Date.now()
  repeat?: boolean; // True if key held down
  source?: string; // 'keyboard', 'gpio', 'websocket'
}

/**
 * Standard input key constants
 */
export const InputKeys = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  OK: "Enter",
  ACTION: " ", // Space bar for jump/fire in games
  BACK: "Backspace",
  HOME: "Escape",
  HELP: "Tab",
} as const;

/**
 * App interface - all apps must implement these methods
 */
export interface App {
  readonly name: string;

  // Lifecycle methods
  onActivate(): void | Promise<void>;
  onDeactivate(): void;
  onUpdate(deltaTime: number): void;
  onEvent(event: InputEvent): boolean; // Return true if event handled
  render(matrix: any): void; // DisplayBuffer from core/display-buffer.ts

  // Optional lifecycle methods
  onBackgroundTick?(): void;
  onSaveState?(): any;
  onRestoreState?(state: any): void;
}

/**
 * Device driver base class interface
 */
export interface DeviceDriver {
  readonly priority: number; // Higher = preferred (0-100)
  readonly name: string;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isAvailable(): Promise<boolean>;
}

/**
 * Display driver interface
 */
export interface DisplayDriver extends DeviceDriver {
  getWidth(): number;
  getHeight(): number;
  setPixel(x: number, y: number, color: RGB): void;
  show(): void;
  clear(): void;
}

/**
 * Input driver interface
 */
export interface InputDriver extends DeviceDriver {
  onEvent(callback: (event: InputEvent) => void): void;
}

/**
 * Platform detection
 */
export type Platform =
  | "macos"
  | "linux"
  | "raspberry-pi"
  | "windows"
  | "unknown";

export interface PlatformInfo {
  platform: Platform;
  isRaspberryPi: boolean;
  hasGPIO: boolean;
  cpuInfo?: string;
}
