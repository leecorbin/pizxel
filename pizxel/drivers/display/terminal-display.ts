/**
 * Terminal Display Driver
 *
 * ANSI escape code terminal display (always available fallback).
 * Uses Unicode block characters for pixel rendering.
 */

import { DisplayDriver } from "../base/device-driver";
import { RGB } from "../../types";

export class TerminalDisplayDriver extends DisplayDriver {
  readonly priority = 50; // Medium priority - fallback option
  readonly name = "Terminal Display";

  private lastBuffer: RGB[][] | null = null;
  private silent: boolean = false; // Suppress output when true

  constructor() {
    super(256, 192);
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  async initialize(): Promise<void> {
    if (!this.silent) {
      // Clear screen and hide cursor
      process.stdout.write("\x1b[2J\x1b[?25l");
      process.stdout.write("\x1b[H"); // Home cursor
      console.log("PiZXel Terminal Display initialized (256×192)");
      console.log("Using Unicode block characters for rendering\n");
    }
  }

  async shutdown(): Promise<void> {
    // Show cursor and clear screen
    process.stdout.write("\x1b[?25h");
    process.stdout.write("\x1b[2J\x1b[H");
  }

  async isAvailable(): Promise<boolean> {
    // Terminal is always available
    return true;
  }

  show(): void {
    if (this.silent) return; // Skip rendering in silent mode

    // Render buffer to terminal using ANSI colors
    // Use half-blocks to double vertical resolution

    process.stdout.write("\x1b[H"); // Home cursor

    for (let y = 0; y < this.height; y += 2) {
      let line = "";

      for (let x = 0; x < this.width; x++) {
        const topPixel = this.buffer[y][x];
        const bottomPixel: RGB =
          y + 1 < this.height ? this.buffer[y + 1][x] : [0, 0, 0];

        // Use Unicode half block (▀) with foreground=top, background=bottom
        const fgColor = this.rgbToAnsi(topPixel);
        const bgColor = this.rgbToAnsi(bottomPixel, true);

        line += `${fgColor}${bgColor}▀\x1b[0m`;
      }

      process.stdout.write(line + "\n");
    }
  }

  /**
   * Convert RGB to ANSI 24-bit color escape code
   */
  private rgbToAnsi(color: RGB, background: boolean = false): string {
    const [r, g, b] = color;
    const prefix = background ? "48" : "38";
    return `\x1b[${prefix};2;${r};${g};${b}m`;
  }
}
