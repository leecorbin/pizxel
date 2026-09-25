/**
 * Session Drivers
 *
 * Display and input drivers for one server-mode session. The display packs
 * each changed frame into raw RGB24 for the session's WebSockets; the input
 * takes browser KeyboardEvent.key values from them.
 */

import { DisplayDriver, InputDriver } from "../drivers/base/device-driver";
import { mapKey } from "../drivers/input/key-map";

export class SessionDisplayDriver extends DisplayDriver {
  readonly priority = 0;
  readonly name = "Session Display";

  private lastFrame: Buffer | null = null;

  /** Called with each frame that differs from the previous one */
  onFrame: ((frame: Buffer) => void) | null = null;

  async initialize(): Promise<void> {}

  async shutdown(): Promise<void> {
    this.onFrame = null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  show(): void {
    const frame = Buffer.allocUnsafe(this.width * this.height * 3);
    let i = 0;
    for (let y = 0; y < this.height; y++) {
      const row = this.buffer[y];
      for (let x = 0; x < this.width; x++) {
        const [r, g, b] = row[x];
        frame[i++] = r;
        frame[i++] = g;
        frame[i++] = b;
      }
    }

    if (this.lastFrame && frame.equals(this.lastFrame)) {
      return;
    }
    this.lastFrame = frame;
    this.onFrame?.(frame);
  }

  /** The most recent frame (for viewers that connect later) */
  getLastFrame(): Buffer | null {
    return this.lastFrame;
  }
}

export class SessionInputDriver extends InputDriver {
  readonly priority = 0;
  readonly name = "Session Input";

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Map a browser KeyboardEvent.key value to a PiZXel key, or null if it
   * isn't one apps can use
   */
  static toEventKey(key: string): string | null {
    const eventKey = mapKey(key);
    if (eventKey === null) return null;

    // Drop other control characters (they have no meaning to apps)
    if (eventKey.length === 1 && eventKey.charCodeAt(0) < 0x20) return null;
    return eventKey;
  }

  /** A browser keydown (repeat: the browser's auto-repeat) */
  handleKey(key: string, repeat: boolean = false): void {
    const eventKey = SessionInputDriver.toEventKey(key);
    if (eventKey === null) return;

    this.emitEvent({
      key: eventKey,
      type: "keydown",
      timestamp: Date.now(),
      repeat,
      source: "websocket",
    });
  }

  /** A browser keyup ("*" releases every key) */
  handleKeyUp(key: string): void {
    const eventKey = key === "*" ? "*" : SessionInputDriver.toEventKey(key);
    if (eventKey === null) return;

    this.emitEvent({
      key: eventKey,
      type: "keyup",
      timestamp: Date.now(),
      source: "websocket",
    });
  }
}
