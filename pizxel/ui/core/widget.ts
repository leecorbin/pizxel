/**
 * UI Widget Base Class
 *
 * All UI components extend from Widget.
 */

import { InputEvent } from "../../types/index";
import { DisplayBuffer } from "../../core/display-buffer";

export interface WidgetOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
  enabled?: boolean;
}

export abstract class Widget {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  enabled: boolean;
  focused: boolean = false;

  protected parent: Widget | null = null;
  protected children: Widget[] = [];

  constructor(options: WidgetOptions = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.visible = options.visible ?? true;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Render the widget and its children
   */
  render(matrix: DisplayBuffer): void {
    if (!this.visible) {
      return;
    }

    // Render self
    this.renderSelf(matrix);

    // Render children
    for (const child of this.children) {
      child.render(matrix);
    }
  }

  /**
   * Override this to draw the widget itself
   */
  protected abstract renderSelf(matrix: DisplayBuffer): void;

  /**
   * Handle input event
   * @returns true if event was handled
   */
  handleEvent(event: InputEvent): boolean {
    if (!this.visible || !this.enabled) {
      return false;
    }

    // Children get first chance
    for (const child of this.children) {
      if (child.handleEvent(event)) {
        return true;
      }
    }

    // Then self
    return this.handleSelfEvent(event);
  }

  /**
   * Override this to handle input
   */
  protected handleSelfEvent(event: InputEvent): boolean {
    return false;
  }

  /**
   * Add a child widget
   */
  addChild(child: Widget): void {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * Remove a child widget
   */
  removeChild(child: Widget): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  /**
   * Get absolute screen position (accounting for parent)
   */
  getAbsolutePosition(): { x: number; y: number } {
    let x = this.x;
    let y = this.y;
    let parent = this.parent;

    while (parent) {
      x += parent.x;
      y += parent.y;
      parent = parent.parent;
    }

    return { x, y };
  }

  /**
   * Check if point is inside widget bounds
   */
  containsPoint(x: number, y: number): boolean {
    const pos = this.getAbsolutePosition();
    return (
      x >= pos.x &&
      x < pos.x + this.width &&
      y >= pos.y &&
      y < pos.y + this.height
    );
  }

  /**
   * Show the widget
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Hide the widget
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.visible = !this.visible;
  }
}
