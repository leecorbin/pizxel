/**
 * VStack - Vertical Stack Layout
 *
 * Arranges children vertically with optional spacing.
 */

import { Container, ContainerOptions } from "../core/container";
import { Widget } from "../core/widget";

export interface VStackOptions extends ContainerOptions {
  spacing?: number;
  alignment?: "left" | "center" | "right";
}

export class VStack extends Container {
  private spacing: number;
  private alignment: "left" | "center" | "right";

  constructor(options: VStackOptions = {}) {
    super(options);
    this.spacing = options.spacing ?? 0;
    this.alignment = options.alignment ?? "left";
  }

  /**
   * Layout children vertically
   */
  layout(): void {
    let currentY = 0;

    for (const child of this.children) {
      // Calculate X position based on alignment
      let childX = 0;

      if (this.alignment === "center") {
        childX = Math.floor((this.width - child.width) / 2);
      } else if (this.alignment === "right") {
        childX = this.width - child.width;
      }

      child.x = childX;
      child.y = currentY;

      currentY += child.height + this.spacing;
    }

    // Update container height based on content
    if (this.children.length > 0) {
      this.height = currentY - this.spacing; // Remove last spacing
    }
  }

  /**
   * Override addChild to trigger layout
   */
  addChild(child: Widget): void {
    super.addChild(child);
    this.layout();
  }

  /**
   * Override removeChild to trigger layout
   */
  removeChild(child: Widget): void {
    super.removeChild(child);
    this.layout();
  }
}
