/**
 * Canvas Display Driver
 *
 * Display driver that outputs to web browser via Canvas HTTP server.
 * Can run alongside terminal display.
 */

import { DisplayBuffer } from "../core/display-buffer";
import { CanvasServer } from "./canvas-server";

export interface CanvasDisplayOptions {
  port?: number;
  pixelSize?: number;
}

export class CanvasDisplay {
  private server: CanvasServer;
  private width: number = 256;
  private height: number = 192;
  private enabled: boolean = false;

  constructor(options: CanvasDisplayOptions = {}) {
    this.server = new CanvasServer({
      port: options.port ?? 3000,
      pixelSize: options.pixelSize ?? 3,
    });
  }

  async start(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    this.server.setDisplaySize(width, height);
    await this.server.start();
    this.enabled = true;
  }

  update(buffer: DisplayBuffer | { getBuffer: () => any }): void {
    if (!this.enabled) return;

    // Send frame to all connected clients
    this.server.sendFrame(buffer as DisplayBuffer);
  }

  async stop(): Promise<void> {
    if (!this.enabled) return;

    await this.server.stop();
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
