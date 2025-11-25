/**
 * Headless Display Adapter
 *
 * In-memory display buffer for testing without actual rendering.
 * Pure TypeScript implementation (no dependencies).
 */

import { RGB } from "../types/index";

export class HeadlessDisplay {
  private buffer: RGB[][];
  private width: number;
  private height: number;
  renderCount: number = 0;

  constructor(width: number = 256, height: number = 192) {
    this.width = width;
    this.height = height;
    this.buffer = this.createBuffer();
  }

  private createBuffer(): RGB[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => [0, 0, 0] as RGB)
    );
  }

  /**
   * Capture frame from DisplayBuffer
   */
  captureFrame(displayBuffer: any): void {
    const buffer = displayBuffer.getBuffer();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = buffer[y][x];
      }
    }
    this.renderCount++;
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
   * Count pixels matching color (with tolerance)
   */
  countColor(color: RGB, tolerance: number = 0): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.colorsMatch(this.buffer[y][x], color, tolerance)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Find centroid of sprite by color
   */
  findSprite(
    color: RGB,
    tolerance: number = 10
  ): { x: number; y: number } | null {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.colorsMatch(this.buffer[y][x], color, tolerance)) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) {
      return null;
    }

    return {
      x: Math.floor(sumX / count),
      y: Math.floor(sumY / count),
    };
  }

  /**
   * Find connected regions (blobs) of color
   */
  findBlobs(
    color: RGB,
    minSize: number = 10,
    tolerance: number = 10
  ): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    pixelCount: number;
  }> {
    const visited = Array.from({ length: this.height }, () =>
      Array(this.width).fill(false)
    );
    const blobs: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      pixelCount: number;
    }> = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (
          !visited[y][x] &&
          this.colorsMatch(this.buffer[y][x], color, tolerance)
        ) {
          const blob = this.floodFill(x, y, color, tolerance, visited);
          if (blob.pixelCount >= minSize) {
            blobs.push(blob);
          }
        }
      }
    }

    return blobs;
  }

  private floodFill(
    startX: number,
    startY: number,
    color: RGB,
    tolerance: number,
    visited: boolean[][]
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    pixelCount: number;
  } {
    const stack: Array<[number, number]> = [[startX, startY]];
    let minX = startX;
    let minY = startY;
    let maxX = startX;
    let maxY = startY;
    let count = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;

      if (
        x < 0 ||
        x >= this.width ||
        y < 0 ||
        y >= this.height ||
        visited[y][x] ||
        !this.colorsMatch(this.buffer[y][x], color, tolerance)
      ) {
        continue;
      }

      visited[y][x] = true;
      count++;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      // Check 4 neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixelCount: count,
    };
  }

  /**
   * Check if display is changing (animation detection)
   */
  isChanging(frames: number = 2): boolean {
    // This would require storing previous frames
    // For now, just return true if renderCount is increasing
    return this.renderCount > frames;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = this.createBuffer();
  }

  /**
   * Get full buffer (for snapshots)
   */
  getBuffer(): RGB[][] {
    return this.buffer.map((row) => row.map((pixel) => [...pixel] as RGB));
  }

  private colorsMatch(c1: RGB, c2: RGB, tolerance: number): boolean {
    return (
      Math.abs(c1[0] - c2[0]) <= tolerance &&
      Math.abs(c1[1] - c2[1]) <= tolerance &&
      Math.abs(c1[2] - c2[2]) <= tolerance
    );
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}
