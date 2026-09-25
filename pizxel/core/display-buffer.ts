/**
 * Display Buffer with Graphics Primitives
 *
 * Provides a pixel buffer with drawing functions.
 * Ported from MatrixOS Python graphics.py.
 */

import { RGB } from "../types";
import { defaultFont } from "./font";

export class DisplayBuffer {
  // One flat RGB byte buffer (width * height * 3), row by row: no per-pixel
  // arrays to allocate, clear or garbage-collect. Clamped, so colours from
  // arithmetic (fractions, >255) come out right.
  private pixels: Uint8ClampedArray;
  private width: number;
  private height: number;
  private clipStack: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  private currentClip: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  private transformStack: Array<{ x: number; y: number }> = [];
  private currentTransform: { x: number; y: number } = { x: 0, y: 0 };

  constructor(width: number = 256, height: number = 192) {
    this.width = width;
    this.height = height;

    this.pixels = new Uint8ClampedArray(width * height * 3);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  /**
   * The pixels as flat RGB bytes (width * height * 3, row by row). This is
   * the live buffer: display drivers read it, they don't keep it.
   */
  getPixels(): Uint8ClampedArray {
    return this.pixels;
  }

  /**
   * The pixels as rows of [r, g, b] (a copy, for older code; slow, prefer
   * getPixels())
   */
  getBuffer(): RGB[][] {
    const rows: RGB[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: RGB[] = [];
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 3;
        row.push([this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]]);
      }
      rows.push(row);
    }
    return rows;
  }

  /** Characters text() draws as nothing, taking no space */
  private static readonly ZERO_WIDTH = /^[\u200B-\u200D\uFE00-\uFE0F]$/;

  /**
   * Set a single pixel
   */
  setPixel(x: number, y: number, color: RGB): void {
    // Apply transform, snapping to whole pixels (fractional coordinates, e.g.
    // from time-based movement, would otherwise index outside the buffer)
    x = Math.floor(x + this.currentTransform.x);
    y = Math.floor(y + this.currentTransform.y);

    // Check clip region first
    if (this.currentClip) {
      if (
        x < this.currentClip.x ||
        x >= this.currentClip.x + this.currentClip.width ||
        y < this.currentClip.y ||
        y >= this.currentClip.y + this.currentClip.height
      ) {
        return; // Outside clip region
      }
    }

    // Bounds checking
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const i = (y * this.width + x) * 3;
    this.pixels[i] = color[0];
    this.pixels[i + 1] = color[1];
    this.pixels[i + 2] = color[2];
  }

  /**
   * Push a clip region onto the stack
   */
  pushClipRegion(x: number, y: number, width: number, height: number): void {
    // If there's a current clip, intersect with it
    if (this.currentClip) {
      const x1 = Math.max(x, this.currentClip.x);
      const y1 = Math.max(y, this.currentClip.y);
      const x2 = Math.min(
        x + width,
        this.currentClip.x + this.currentClip.width
      );
      const y2 = Math.min(
        y + height,
        this.currentClip.y + this.currentClip.height
      );

      this.clipStack.push(this.currentClip);
      this.currentClip = {
        x: x1,
        y: y1,
        width: Math.max(0, x2 - x1),
        height: Math.max(0, y2 - y1),
      };
    } else {
      // No current clip, use the new one
      this.clipStack.push({
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
      });
      this.currentClip = { x, y, width, height };
    }
  }

  /**
   * Pop a clip region from the stack
   */
  popClipRegion(): void {
    if (this.clipStack.length > 0) {
      this.currentClip = this.clipStack.pop()!;
      // If we're back to the root clip, clear it
      if (
        this.currentClip.x === 0 &&
        this.currentClip.y === 0 &&
        this.currentClip.width === this.width &&
        this.currentClip.height === this.height
      ) {
        this.currentClip = null;
      }
    } else {
      this.currentClip = null;
    }
  }

  /**
   * Get current clip region (for testing)
   */
  getClipRegion(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this.currentClip;
  }

  /**
   * Push a coordinate transform (for scrolling)
   */
  pushTransform(x: number, y: number): void {
    this.transformStack.push({ ...this.currentTransform });
    this.currentTransform = {
      x: this.currentTransform.x + x,
      y: this.currentTransform.y + y,
    };
  }

  /**
   * Pop the last coordinate transform
   */
  popTransform(): void {
    if (this.transformStack.length > 0) {
      this.currentTransform = this.transformStack.pop()!;
    } else {
      this.currentTransform = { x: 0, y: 0 };
    }
  }

  /**
   * Get current transform (for testing)
   */
  getTransform(): { x: number; y: number } {
    return { ...this.currentTransform };
  }

  /**
   * Get pixel color at position
   */
  getPixel(x: number, y: number): RGB {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0];
    }
    const i = (y * this.width + x) * 3;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]];
  }

  /**
   * Clear entire buffer to black
   */
  clear(): void {
    this.pixels.fill(0);
  }

  /**
   * Fill entire buffer with color
   */
  fill(color: RGB = [0, 0, 0]): void {
    if (color[0] === color[1] && color[1] === color[2]) {
      this.pixels.fill(color[0]);
      return;
    }
    for (let i = 0; i < this.pixels.length; i += 3) {
      this.pixels[i] = color[0];
      this.pixels[i + 1] = color[1];
      this.pixels[i + 2] = color[2];
    }
  }

  /**
   * Darken a rectangle (e.g. behind a pause or game-over box): each channel
   * is multiplied by factor (0..1)
   */
  dim(x: number, y: number, width: number, height: number, factor: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + width));
    const y1 = Math.min(this.height, Math.floor(y + height));
    for (let row = y0; row < y1; row++) {
      let i = (row * this.width + x0) * 3;
      const end = (row * this.width + x1) * 3;
      for (; i < end; i++) {
        this.pixels[i] = this.pixels[i] * factor;
      }
    }
  }

  /**
   * Draw a line using Bresenham's algorithm
   */
  line(x0: number, y0: number, x1: number, y1: number, color: RGB): void {
    // Whole-pixel endpoints: with fractions the loop below would never end
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    if (!Number.isFinite(x0 + y0 + x1 + y1)) return;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this.setPixel(x, y, color);

      if (x === x1 && y === y1) {
        break;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Draw a rectangle
   */
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: RGB,
    fill: boolean = false
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    width = Math.round(width);
    height = Math.round(height);

    if (fill) {
      // Filled rectangle: straight into the buffer when there's no clip or
      // transform (the common case)
      if (!this.currentClip && this.currentTransform.x === 0 && this.currentTransform.y === 0) {
        const x0 = Math.max(0, x);
        const y0 = Math.max(0, y);
        const x1 = Math.min(this.width, x + width);
        const y1 = Math.min(this.height, y + height);
        const [r, g, b] = color;
        for (let row = y0; row < y1; row++) {
          let i = (row * this.width + x0) * 3;
          const end = (row * this.width + x1) * 3;
          while (i < end) {
            this.pixels[i++] = r;
            this.pixels[i++] = g;
            this.pixels[i++] = b;
          }
        }
        return;
      }
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          this.setPixel(x + dx, y + dy, color);
        }
      }
    } else {
      // Outline only
      // Top and bottom
      for (let dx = 0; dx < width; dx++) {
        this.setPixel(x + dx, y, color);
        this.setPixel(x + dx, y + height - 1, color);
      }
      // Left and right
      for (let dy = 0; dy < height; dy++) {
        this.setPixel(x, y + dy, color);
        this.setPixel(x + width - 1, y + dy, color);
      }
    }
  }

  /**
   * Draw a circle using midpoint circle algorithm
   */
  circle(
    cx: number,
    cy: number,
    radius: number,
    color: RGB,
    fill: boolean = false
  ): void {
    cx = Math.round(cx);
    cy = Math.round(cy);
    radius = Math.round(radius);

    if (fill) {
      // Filled circle - draw horizontal lines
      for (let y = -radius; y <= radius; y++) {
        const x = Math.floor(Math.sqrt(radius * radius - y * y));
        this.line(cx - x, cy + y, cx + x, cy + y, color);
      }
    } else {
      // Outline only - midpoint circle algorithm
      let x = radius;
      let y = 0;
      let err = 0;

      while (x >= y) {
        // Draw 8 octants
        this.setPixel(cx + x, cy + y, color);
        this.setPixel(cx + y, cy + x, color);
        this.setPixel(cx - y, cy + x, color);
        this.setPixel(cx - x, cy + y, color);
        this.setPixel(cx - x, cy - y, color);
        this.setPixel(cx - y, cy - x, color);
        this.setPixel(cx + y, cy - x, color);
        this.setPixel(cx + x, cy - y, color);

        if (err <= 0) {
          y += 1;
          err += 2 * y + 1;
        }
        if (err > 0) {
          x -= 1;
          err -= 2 * x + 1;
        }
      }
    }
  }

  /**
   * Draw text using ZX Spectrum font
   */
  text(
    text: string,
    x: number,
    y: number,
    color: RGB,
    bgColor?: RGB,
    scale: number = 1
  ): void {
    let cursorX = x;

    for (const char of text) {
      // Invisible joiners and emoji variation selectors take no space
      if (DisplayBuffer.ZERO_WIDTH.test(char)) continue;

      const bitmap = defaultFont.getChar(char);

      if (!bitmap) {
        // Skip unknown characters
        cursorX += defaultFont.charWidth * scale;
        continue;
      }

      // Render character bitmap
      for (let row = 0; row < 8; row++) {
        const rowBits = bitmap[row];

        for (let col = 0; col < 8; col++) {
          // Check if bit is set (1 = foreground, 0 = background)
          const bitSet = (rowBits >> (7 - col)) & 1;

          // Draw scaled pixel(s)
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cursorX + col * scale + sx;
              const py = y + row * scale + sy;

              if (bitSet) {
                this.setPixel(px, py, color);
              } else if (bgColor) {
                this.setPixel(px, py, bgColor);
              }
            }
          }
        }
      }

      cursorX += defaultFont.charWidth * scale;
    }
  }

  /**
   * Draw centered text
   */
  /**
   * Width of text in pixels, as text() draws it
   */
  measureText(text: string, scale: number = 1): number {
    let chars = 0;
    for (const char of text) {
      if (!DisplayBuffer.ZERO_WIDTH.test(char)) chars++;
    }
    return chars * defaultFont.charWidth * scale;
  }

  centeredText(text: string, y: number, color: RGB, bgColor?: RGB): void {
    const textWidth = this.measureText(text);
    const x = Math.floor((this.width - textWidth) / 2);
    this.text(text, x, y, color, bgColor);
  }
}
