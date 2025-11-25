/**
 * Keyboard Input Driver
 *
 * Standard keyboard input via stdin (always available).
 */

import { InputDriver } from "../base/device-driver";
import { InputEvent } from "../../types";
import * as readline from "readline";

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
    console.log(`[KeyboardInput] Injecting key: "${key}"`);
    this.handleKeyPress(key);
  }

  async isAvailable(): Promise<boolean> {
    // Keyboard is always available if stdin exists
    return process.stdin !== undefined;
  }

  private handleKeyPress(key: string): void {
    // Map key codes to event keys
    let eventKey: string;

    switch (key) {
      // Terminal escape sequences
      case "\u001b[A":
      case "ArrowUp":
        eventKey = "ArrowUp";
        break;
      case "\u001b[B":
      case "ArrowDown":
        eventKey = "ArrowDown";
        break;
      case "\u001b[C":
      case "ArrowRight":
        eventKey = "ArrowRight";
        break;
      case "\u001b[D":
      case "ArrowLeft":
        eventKey = "ArrowLeft";
        break;
      case "\r":
      case "\n":
      case "Enter":
        eventKey = "Enter";
        break;
      case " ":
      case "Space":
        eventKey = " ";
        break;
      case "\u007f":
      case "\b":
      case "Backspace":
        eventKey = "Backspace";
        break;
      case "\u001b":
      case "Escape":
        eventKey = "Escape";
        break;
      case "\t":
      case "Tab":
        eventKey = "Tab";
        break;
      case "\u0003": // Ctrl+C
        console.log("\nExiting...");
        process.exit(0);
        return;
      default:
        // Single character key
        if (key.length === 1) {
          eventKey = key;
        } else {
          // Unknown escape sequence
          console.log(`[KeyboardInput] Unknown key: "${key}"`);
          return;
        }
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
