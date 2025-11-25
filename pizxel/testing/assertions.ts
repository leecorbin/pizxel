/**
 * Test Assertions
 *
 * Rich assertion library for testing.
 */

import { RGB } from "../types/index";
import { HeadlessDisplay } from "./headless-display";

export class Assertions {
  /**
   * Assert pixel color matches (with tolerance)
   */
  static assertPixelColor(
    display: HeadlessDisplay,
    x: number,
    y: number,
    expectedColor: RGB,
    tolerance: number = 10,
    message?: string
  ): void {
    const actual = display.getPixel(x, y);
    const matches =
      Math.abs(actual[0] - expectedColor[0]) <= tolerance &&
      Math.abs(actual[1] - expectedColor[1]) <= tolerance &&
      Math.abs(actual[2] - expectedColor[2]) <= tolerance;

    if (!matches) {
      throw new Error(
        message ||
          `Pixel at (${x},${y}) is [${actual.join(
            ","
          )}], expected [${expectedColor.join(",")}] ±${tolerance}`
      );
    }
  }

  /**
   * Assert color count in range
   */
  static assertColorCount(
    display: HeadlessDisplay,
    color: RGB,
    min: number,
    max?: number,
    tolerance: number = 10,
    message?: string
  ): void {
    const count = display.countColor(color, tolerance);
    const inRange =
      max === undefined ? count >= min : count >= min && count <= max;

    if (!inRange) {
      const range = max === undefined ? `>= ${min}` : `${min}-${max}`;
      throw new Error(
        message ||
          `Color [${color.join(",")}] count is ${count}, expected ${range}`
      );
    }
  }

  /**
   * Assert sprite exists
   */
  static assertSpriteExists(
    display: HeadlessDisplay,
    color: RGB,
    tolerance: number = 10,
    message?: string
  ): { x: number; y: number } {
    const sprite = display.findSprite(color, tolerance);
    if (!sprite) {
      throw new Error(
        message || `Sprite with color [${color.join(",")}] not found`
      );
    }
    return sprite;
  }

  /**
   * Assert sprite moved
   */
  static assertSpriteMoved(
    before: { x: number; y: number },
    after: { x: number; y: number },
    message?: string
  ): void {
    if (before.x === after.x && before.y === after.y) {
      throw new Error(
        message || `Sprite did not move from (${before.x},${before.y})`
      );
    }
  }

  /**
   * Assert render count in range
   */
  static assertRenderCount(
    renderCount: number,
    min: number,
    max?: number,
    message?: string
  ): void {
    const inRange =
      max === undefined
        ? renderCount >= min
        : renderCount >= min && renderCount <= max;

    if (!inRange) {
      const range = max === undefined ? `>= ${min}` : `${min}-${max}`;
      throw new Error(
        message || `Render count is ${renderCount}, expected ${range}`
      );
    }
  }

  /**
   * Assert value is true
   */
  static assertTrue(condition: boolean, message?: string): void {
    if (!condition) {
      throw new Error(message || "Assertion failed: expected true");
    }
  }

  /**
   * Assert value is false
   */
  static assertFalse(condition: boolean, message?: string): void {
    if (condition) {
      throw new Error(message || "Assertion failed: expected false");
    }
  }

  /**
   * Assert values are equal
   */
  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert value is not null/undefined
   */
  static assertNotNull<T>(
    value: T | null | undefined,
    message?: string
  ): asserts value is T {
    if (value === null || value === undefined) {
      throw new Error(message || "Value is null or undefined");
    }
  }
}
