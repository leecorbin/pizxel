/**
 * Test App - Moving Rectangle
 *
 * Simple app to validate the app framework:
 * - Event loop with dirty flag
 * - Input handling (arrow keys)
 * - Graphics primitives (rect)
 * - State management
 */

import { App, InputEvent, InputKeys } from "../types/index";
import { DisplayBuffer } from "../core/display-buffer";

export class TestApp implements App {
  readonly name = "Test App";

  private x: number = 50;
  private y: number = 50;
  private width: number = 20;
  private height: number = 20;
  private color: [number, number, number] = [0, 255, 0]; // Green
  private speed: number = 100; // pixels per second

  dirty: boolean = true; // Request initial render

  onActivate(): void {
    console.log("TestApp activated");
    this.dirty = true;
  }

  onDeactivate(): void {
    console.log("TestApp deactivated");
  }

  onUpdate(deltaTime: number): void {
    // Auto-move the rectangle (bounce animation)
    // Uncomment to enable:
    // this.x += this.speed * deltaTime;
    // if (this.x > 256 - this.width || this.x < 0) {
    //   this.speed = -this.speed;
    // }
    // this.dirty = true;
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") {
      return false;
    }

    let moved = false;

    switch (event.key) {
      case InputKeys.UP:
      case "w":
      case "W":
        this.y = Math.max(0, this.y - 5);
        moved = true;
        break;

      case InputKeys.DOWN:
      case "s":
      case "S":
        this.y = Math.min(192 - this.height, this.y + 5);
        moved = true;
        break;

      case InputKeys.LEFT:
      case "a":
      case "A":
        this.x = Math.max(0, this.x - 5);
        moved = true;
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        this.x = Math.min(256 - this.width, this.x + 5);
        moved = true;
        break;

      case " ":
      case InputKeys.ACTION:
        // Cycle color on space bar
        if (this.color[0] === 255) {
          this.color = [0, 255, 0]; // Green
        } else if (this.color[1] === 255) {
          this.color = [0, 0, 255]; // Blue
        } else {
          this.color = [255, 0, 0]; // Red
        }
        moved = true;
        break;
    }

    if (moved) {
      this.dirty = true;
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    // Clear screen
    matrix.clear();

    // Draw title
    matrix.text(
      "Test App - Use arrows to move, space to change color",
      4,
      4,
      [255, 255, 255]
    );

    // Draw the rectangle
    matrix.rect(this.x, this.y, this.width, this.height, this.color, true);

    // Draw some decorative elements
    matrix.circle(128, 96, 40, [128, 128, 128], false);
    matrix.line(0, 30, 256, 30, [64, 64, 64]);

    // Clear dirty flag
    this.dirty = false;
  }
}
