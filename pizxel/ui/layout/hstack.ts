/**
 * HStack - Horizontal Stack Layout
 *
 * Arranges children horizontally with optional spacing.
 */

import { Container, ContainerOptions } from "../core/container";
import { Widget } from "../core/widget";

export interface HStackOptions extends ContainerOptions {
  spacing?: number;
  alignment?: "top" | "center" | "bottom";
}

export class HStack extends Container {
  private spacing: number;
  private alignment: "top" | "center" | "bottom";

  constructor(options: HStackOptions = {}) {
    super(options);
    this.spacing = options.spacing ?? 0;
    this.alignment = options.alignment ?? "top";
  }

  /**
   * Layout children horizontally
   */
  layout(): void {
    let currentX = 0;

    for (const child of this.children) {
      // Calculate Y position based on alignment
      let childY = 0;

      if (this.alignment === "center") {
        childY = Math.floor((this.height - child.height) / 2);
      } else if (this.alignment === "bottom") {
        childY = this.height - child.height;
      }

      child.x = currentX;
      child.y = childY;

      currentX += child.width + this.spacing;
    }

    // Update container width based on content
    if (this.children.length > 0) {
      this.width = currentX - this.spacing; // Remove last spacing
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
