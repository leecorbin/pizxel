/**
 * Keyboard Input Driver
 *
 * Standard keyboard input via stdin (always available).
 */

import { InputDriver } from "../base/device-driver";
import { InputEvent } from "../../types";
import * as readline from "readline";
import { debugLog } from "../../core/debug";
import { mapKey } from "./key-map";

export class KeyboardInputDriver extends InputDriver {
  readonly priority = 50; // Medium priority - fallback option
  readonly name = "Keyboard Input";

  private rl: readline.Interface | null = null;

  async initialize(): Promise<void> {
    // Set up raw mode for key capture
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    // Listen for key presses
    process.stdin.on("data", this.handleKeyPress.bind(this));

    console.log("Keyboard input initialized");
  }

  async shutdown(): Promise<void> {
    process.stdin.removeAllListeners("data");

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  /**
   * Inject a key event (for canvas/remote input)
   */
  injectKey(key: string): void {
    debugLog(`[KeyboardInput] Injecting key: "${key}"`);
    this.handleKeyPress(key);
  }

  /**
   * Inject a browser key event with its release (for the canvas viewer,
   * which reports keyups, unlike the terminal)
   */
  injectKeyEvent(
    key: string,
    type: "keydown" | "keyup",
    repeat: boolean = false
  ): void {
    const eventKey = key === "*" && type === "keyup" ? "*" : mapKey(key);
    if (eventKey === null) return;
    debugLog(`[KeyboardInput] Injecting ${type}: "${eventKey}"`);
    this.emitEvent({
      key: eventKey,
      type,
      timestamp: Date.now(),
      repeat,
      source: "canvas",
    });
  }

  async isAvailable(): Promise<boolean> {
    // Keyboard is always available if stdin exists
    return process.stdin !== undefined;
  }

  private handleKeyPress(key: string): void {
    if (key === "\u0003") {
      // Ctrl+C
      console.log("\nExiting...");
      process.exit(0);
      return;
    }

    const eventKey = mapKey(key);
    if (eventKey === null) {
      // Unknown escape sequence
      console.log(`[KeyboardInput] Unknown key: "${key}"`);
      return;
    }

    const event: InputEvent = {
      key: eventKey,
      type: "keydown",
      timestamp: Date.now(),
      source: "keyboard",
    };

    this.emitEvent(event);
  }
}
