/**
 * Test Runner
 *
 * High-level API for testing PiZXel apps.
 * "Puppeteer for PiZXel"
 */

import { HeadlessDisplay } from "./headless-display";
import { InputSimulator } from "./input-simulator";
import { Assertions } from "./assertions";
import { RGB } from "../types/index";
import { DisplayBuffer } from "../core/display-buffer";

export class TestRunner {
  display: HeadlessDisplay;
  input: InputSimulator;
  private appInstance: any;
  private running: boolean = false;
  private frameLoopHandle: any;
  private startTime: number = 0;
  private maxDuration: number;
  private matrix: DisplayBuffer = new DisplayBuffer(256, 192);

  constructor(maxDuration: number = 10.0) {
    this.display = new HeadlessDisplay();
    this.input = new InputSimulator();
    this.maxDuration = maxDuration * 1000; // Convert to ms
  }

  /**
   * Start running an app for testing
   */
  async start(appClass: any): Promise<void> {
    this.appInstance = new appClass();
    this.appInstance.onActivate();
    this.running = true;
    this.startTime = Date.now();

    // Start frame loop
    this.frameLoop();
  }

  /**
   * Frame loop (~60fps)
   */
  private frameLoop(): void {
    if (!this.running) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.startTime;

    // Check timeout
    if (elapsed >= this.maxDuration) {
      this.stop();
      return;
    }

    // Process any injected events
    const events = this.input.pollEvents();
    for (const event of events) {
      this.appInstance.onEvent(event);
    }

    // Update app
    this.appInstance.onUpdate(1 / 60); // ~16.67ms

    // Render if dirty, into a real DisplayBuffer (kept across frames, as
    // the framework does), so every drawing method works in tests
    if (this.appInstance.dirty) {
      const displayBuffer = this.matrix;
      this.appInstance.render(displayBuffer);
      this.display.captureFrame(displayBuffer);
    }

    this.input.tick();

    // Schedule next frame
    this.frameLoopHandle = setTimeout(() => this.frameLoop(), 16); // ~60fps
  }

  /**
   * Stop the test runner
   */
  stop(): void {
    this.running = false;
    if (this.frameLoopHandle) {
      clearTimeout(this.frameLoopHandle);
    }
    if (this.appInstance) {
      this.appInstance.onDeactivate();
    }
  }

  /**
   * Wait for specified time (continues running event loop)
   */
  async wait(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Wait until condition is true or timeout
   */
  async waitUntil(
    condition: () => boolean,
    timeoutSeconds: number = 5
  ): Promise<boolean> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      if (condition()) {
        return true;
      }
      await this.wait(0.1);
    }

    return false;
  }

  /**
   * Inject input event
   */
  inject(key: string): void {
    this.input.inject(key);
  }

  /**
   * Inject sequence of keys
   */
  injectSequence(keys: string[], delayMs: number = 100): void {
    this.input.injectSequence(keys, delayMs);
  }

  /**
   * Get pixel color
   */
  pixelAt(x: number, y: number): RGB {
    return this.display.getPixel(x, y);
  }

  /**
   * Count pixels of color
   */
  countColor(color: RGB, tolerance: number = 10): number {
    return this.display.countColor(color, tolerance);
  }

  /**
   * Find sprite by color
   */
  findSprite(
    color: RGB,
    tolerance: number = 10
  ): { x: number; y: number } | null {
    return this.display.findSprite(color, tolerance);
  }

  /**
   * Snapshot for visual regression testing
   */
  snapshot(name: string): RGB[][] {
    return this.display.getBuffer();
  }

  // Re-export assertions for convenience
  assertPixelColor = Assertions.assertPixelColor;
  assertColorCount = Assertions.assertColorCount;
  assertSpriteExists = Assertions.assertSpriteExists;
  assertSpriteMoved = Assertions.assertSpriteMoved;
  assertRenderCount = Assertions.assertRenderCount;
  assertTrue = Assertions.assertTrue;
  assertFalse = Assertions.assertFalse;
  assertEqual = Assertions.assertEqual;
  assertNotNull = Assertions.assertNotNull;
}
