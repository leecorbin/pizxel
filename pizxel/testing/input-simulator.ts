/**
 * Input Simulator
 *
 * Programmatic event injection for testing.
 * Frame-perfect timing control.
 */

import { InputEvent } from "../types/index";

export class InputSimulator {
  private eventQueue: InputEvent[] = [];
  private frameCount: number = 0;

  /**
   * Inject a single key event
   */
  inject(key: string): void {
    this.eventQueue.push({
      type: "keydown",
      key: key,
      timestamp: Date.now(),
    });
  }

  /**
   * Inject a sequence of keys with delay
   */
  injectSequence(keys: string[], delayMs: number = 100): void {
    keys.forEach((key, index) => {
      setTimeout(() => this.inject(key), index * delayMs);
    });
  }

  /**
   * Simulate holding a key (repeat events)
   */
  injectRepeat(key: string, count: number, delayMs: number = 50): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.inject(key), i * delayMs);
    }
  }

  /**
   * Get pending events
   */
  pollEvents(): InputEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  /**
   * Check if events are queued
   */
  hasEvents(): boolean {
    return this.eventQueue.length > 0;
  }

  /**
   * Clear all pending events
   */
  clear(): void {
    this.eventQueue = [];
  }

  /**
   * Increment frame counter (for timing)
   */
  tick(): void {
    this.frameCount++;
  }

  getFrameCount(): number {
    return this.frameCount;
  }
}
