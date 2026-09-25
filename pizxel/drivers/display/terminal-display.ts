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

  /** The last frame drawn, for redrawing only the cells that change */
  private lastPixels: Uint8Array | null = null;

  /**
   * Show a frame given as RGB bytes: only the character cells (two pixels
   * each, one above the other) that changed are rewritten, colour codes are
   * sent only when the colour changes, and it's one write per frame (the
   * full redraw was ~1MB and 96 writes per frame)
   */
  showPixels(pixels: Uint8ClampedArray): void {
    if (this.silent) return;

    const w = this.width;
    const last = this.lastPixels;
    let out = "";
    let cursorRow = -1;
    let cursorCol = -1;
    let fg = "";
    let bg = "";

    for (let y = 0; y < this.height; y += 2) {
      const row = y / 2;
      for (let x = 0; x < w; x++) {
        const top = (y * w + x) * 3;
        const bottom = top + w * 3;
        const hasBottom = y + 1 < this.height;

        if (
          last &&
          pixels[top] === last[top] &&
          pixels[top + 1] === last[top + 1] &&
          pixels[top + 2] === last[top + 2] &&
          (!hasBottom ||
            (pixels[bottom] === last[bottom] &&
              pixels[bottom + 1] === last[bottom + 1] &&
              pixels[bottom + 2] === last[bottom + 2]))
        ) {
          continue;
        }

        if (row !== cursorRow || x !== cursorCol) {
          out += `\x1b[${row + 1};${x + 1}H`;
        }
        const newFg = `\x1b[38;2;${pixels[top]};${pixels[top + 1]};${pixels[top + 2]}m`;
        const newBg = hasBottom
          ? `\x1b[48;2;${pixels[bottom]};${pixels[bottom + 1]};${pixels[bottom + 2]}m`
          : "\x1b[48;2;0;0;0m";
        if (newFg !== fg) out += fg = newFg;
        if (newBg !== bg) out += bg = newBg;
        out += "▀";
        cursorRow = row;
        cursorCol = x + 1;
      }
    }

    if (!this.lastPixels) this.lastPixels = new Uint8Array(pixels.length);
    this.lastPixels.set(pixels);
    if (out) process.stdout.write(out + "\x1b[0m");
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
