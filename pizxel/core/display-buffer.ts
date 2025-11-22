/**
 * Display Buffer with Graphics Primitives
 *
 * Provides a pixel buffer with drawing functions.
 * Ported from MatrixOS Python graphics.py.
 */

import { RGB } from "../types";

export class DisplayBuffer {
  private buffer: RGB[][];
  private width: number;
  private height: number;

  constructor(width: number = 256, height: number = 192) {
    this.width = width;
    this.height = height;

    // Initialize buffer
    this.buffer = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => [0, 0, 0] as RGB)
    );
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  /**
   * Get the raw buffer (for display drivers)
   */
  getBuffer(): RGB[][] {
    return this.buffer;
  }

  /**
   * Set a single pixel
   */
  setPixel(x: number, y: number, color: RGB): void {
    // Bounds checking
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    this.buffer[y][x] = color;
  }

  /**
   * Get pixel color at position
   */
  getPixel(x: number, y: number): RGB {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0];
    }
    return this.buffer[y][x];
  }

  /**
   * Clear entire buffer to black
   */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = [0, 0, 0];
      }
    }
  }

  /**
   * Fill entire buffer with color
   */
  fill(color: RGB = [0, 0, 0]): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = color;
      }
    }
  }

  /**
   * Draw a line using Bresenham's algorithm
   */
  line(x0: number, y0: number, x1: number, y1: number, color: RGB): void {
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
    if (fill) {
      // Filled rectangle
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
   * Draw text (will be implemented after font is ported)
   */
  text(
    text: string,
    x: number,
    y: number,
    color: RGB,
    bgColor?: RGB,
    scale: number = 1
  ): void {
    // TODO: Implement after font system is ported
    console.log(`text() not yet implemented: "${text}" at (${x}, ${y})`);
  }

  /**
   * Draw centered text
   */
  centeredText(text: string, y: number, color: RGB, bgColor?: RGB): void {
    // Assume 8-pixel wide characters
    const textWidth = text.length * 8;
    const x = Math.floor((this.width - textWidth) / 2);
    this.text(text, x, y, color, bgColor);
  }
}
