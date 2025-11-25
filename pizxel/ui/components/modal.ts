/**
 * Modal Component
 *
 * Popup overlay with semi-transparent background.
 * Traps focus when visible.
 */

import { Container, ContainerOptions } from "../core/container";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB, InputEvent, InputKeys } from "../../types/index";
import { Label } from "./label";

export interface ModalOptions extends ContainerOptions {
  title?: string;
  titleColor?: RGB;
  overlayColor?: RGB;
  overlayAlpha?: number;
  dismissOnEscape?: boolean;
  content?: Container;
  centerX?: boolean;
  centerY?: boolean;
}

export class Modal extends Container {
  title?: string;
  titleColor: RGB;
  overlayColor: RGB;
  overlayAlpha: number;
  dismissOnEscape: boolean;
  content?: Container;

  private centerX: boolean;
  private centerY: boolean;

  constructor(options: ModalOptions = {}) {
    // Default modal size and position
    const width = options.width ?? 200;
    const height = options.height ?? 150;
    const x = options.x ?? (256 - width) / 2; // Center by default
    const y = options.y ?? (192 - height) / 2;

    super({
      ...options,
      x,
      y,
      width,
      height,
      bgColor: options.bgColor ?? [32, 32, 64], // Dark blue
      visible: options.visible ?? false, // Hidden by default
    });

    this.title = options.title;
    this.titleColor = options.titleColor ?? [255, 255, 0]; // Yellow
    this.overlayColor = options.overlayColor ?? [0, 0, 0];
    this.overlayAlpha = options.overlayAlpha ?? 0.5;
    this.dismissOnEscape = options.dismissOnEscape ?? true;
    this.content = options.content;
    this.centerX = options.centerX ?? true;
    this.centerY = options.centerY ?? true;

    if (this.content) {
      this.addChild(this.content);
    }

    // Recalculate position if centering
    if (this.centerX) {
      this.x = (256 - this.width) / 2;
    }
    if (this.centerY) {
      this.y = (192 - this.height) / 2;
    }
  }

  render(matrix: DisplayBuffer): void {
    if (!this.visible) {
      return;
    }

    // Draw semi-transparent overlay (darken background)
    this.renderOverlay(matrix);

    // Draw modal background
    const pos = this.getAbsolutePosition();
    if (this.bgColor) {
      matrix.rect(pos.x, pos.y, this.width, this.height, this.bgColor, true);
    }

    // Draw title if specified
    if (this.title) {
      this.renderTitle(matrix);
    }

    // Draw border
    this.renderBorder(matrix);

    // Render children (with clipping)
    // TODO: Implement proper clipping by creating a sub-buffer
    // For now, children render normally but we document the need
    for (const child of this.children) {
      if (child.visible) {
        child.render(matrix);
      }
    }
  }

  private renderOverlay(matrix: DisplayBuffer): void {
    // Darken background by drawing semi-transparent black
    // Since we don't have alpha blending, we'll just draw a pattern
    for (let y = 0; y < 192; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        matrix.setPixel(x, y, this.overlayColor);
      }
    }
  }

  private renderTitle(matrix: DisplayBuffer): void {
    if (!this.title) return;

    const pos = this.getAbsolutePosition();

    // Title bar background
    matrix.rect(pos.x + 2, pos.y + 2, this.width - 4, 14, [0, 64, 128], true);

    // Title text (centered)
    const titleX = pos.x + (this.width - this.title.length * 8) / 2;
    matrix.text(this.title, Math.floor(titleX), pos.y + 5, this.titleColor);

    // Separator line
    matrix.line(
      pos.x + 2,
      pos.y + 16,
      pos.x + this.width - 2,
      pos.y + 16,
      [0, 255, 255]
    );
  }

  private renderBorder(matrix: DisplayBuffer): void {
    const pos = this.getAbsolutePosition();

    // Double border for emphasis
    matrix.rect(pos.x, pos.y, this.width, this.height, [0, 255, 255], false);
    matrix.rect(
      pos.x + 1,
      pos.y + 1,
      this.width - 2,
      this.height - 2,
      [0, 255, 255],
      false
    );
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    // Check if ESC key should dismiss
    if (
      this.dismissOnEscape &&
      event.type === "keydown" &&
      event.key === InputKeys.HOME
    ) {
      this.hide();
      return true;
    }

    return false;
  }

  /**
   * Override handleEvent to intercept close button presses
   */
  handleEvent(event: InputEvent): boolean {
    if (!this.visible || !this.enabled) {
      return false;
    }

    // Check if Enter/Space was pressed (for close button)
    if (
      event.type === "keydown" &&
      (event.key === InputKeys.OK ||
        event.key === InputKeys.ACTION ||
        event.key === " ")
    ) {
      // Let children handle it first (button will process it)
      for (const child of this.children) {
        if (child.handleEvent(event)) {
          // Button handled it, now dismiss modal
          this.hide();
          return true;
        }
      }
    }

    // Otherwise use default handling (children then self)
    return super.handleEvent(event);
  }
}
