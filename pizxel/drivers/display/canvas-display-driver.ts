/**
 * Canvas Display Driver
 *
 * Web-based display driver using HTML Canvas + WebSockets.
 * Higher priority than terminal - preferred for development.
 */

import { DisplayDriver } from "../base/device-driver";
import { CanvasServer } from "../../display/canvas-server";
import { debugLog } from "../../core/debug";

export class CanvasDisplayDriver extends DisplayDriver {
  readonly priority = 80; // High priority - preferred for dev
  readonly name = "Canvas Display";

  private server: CanvasServer;
  private port: number;
  private pixelSize: number;
  private started: boolean = false;

  constructor() {
    super(256, 192);
    // Get port from env or use default
    this.port = parseInt(process.env.CANVAS_PORT || "3001");
    this.pixelSize = parseInt(process.env.CANVAS_PIXEL_SIZE || "3");
    this.server = new CanvasServer({
      port: this.port,
      pixelSize: this.pixelSize,
    });
  }

  async initialize(): Promise<void> {
    this.server.setDisplaySize(this.width, this.height);
    await this.server.start();
    this.started = true;

    console.log(`Canvas Display initialized`);
    console.log(`🌐 Open http://localhost:${this.port} in your browser`);
    console.log(
      `   Display: ${this.width}×${this.height} @ ${this.pixelSize}px/pixel\n`
    );
  }

  async shutdown(): Promise<void> {
    if (this.started) {
      await this.server.stop();
      this.started = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    // Canvas is always available (it's just an HTTP server)
    return true;
  }

  /** Frames go to the browser as binary RGB bytes */
  showPixels(pixels: Uint8ClampedArray): void {
    if (!this.started) return;
    this.server.sendPixels(pixels);
  }

  show(): void {
    if (!this.started) {
      console.log("[CanvasDisplayDriver] show() called but not started");
      return;
    }

    // Debug: Check buffer content
    if (process.env.PIZXEL_DEBUG) {
      const buffer = this.getBuffer();
      let nonBlackPixels = 0;
      for (let y = 0; y < this.height && y < 10; y++) {
        for (let x = 0; x < this.width && x < 10; x++) {
          const [r, g, b] = buffer[y][x];
          if (r !== 0 || g !== 0 || b !== 0) nonBlackPixels++;
        }
      }
      debugLog(
        `[CanvasDisplayDriver] show() called, buffer sample (10x10): ${nonBlackPixels} non-black pixels`
      );
    }

    // Send current buffer to all connected browser clients
    // DisplayDriver extends DisplayBuffer, so 'this' works
    this.server.sendFrame(this as any);
  }

  /**
   * Get the canvas server instance (for keyboard forwarding)
   */
  getServer(): CanvasServer {
    return this.server;
  }
}
