/**
 * Button Component
 *
 * Clickable button with callback.
 */

import { Widget, WidgetOptions } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB, InputEvent, InputKeys } from "../../types/index";

export interface ButtonOptions extends WidgetOptions {
  text: string;
  color?: RGB;
  bgColor?: RGB;
  focusColor?: RGB;
  onPress?: () => void;
}

export class Button extends Widget {
  text: string;
  color: RGB;
  bgColor: RGB;
  focusColor: RGB;
  onPress?: () => void;

  constructor(options: ButtonOptions) {
    super(options);
    this.text = options.text;
    this.color = options.color ?? [255, 255, 255];
    this.bgColor = options.bgColor ?? [64, 64, 64];
    this.focusColor = options.focusColor ?? [255, 255, 0]; // Yellow
    this.onPress = options.onPress;

    // Auto-calculate dimensions if not specified
    if (this.width === 0) {
      this.width = this.text.length * 8 + 16; // Padding
    }
    if (this.height === 0) {
      this.height = 20;
    }
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    const pos = this.getAbsolutePosition();

    // Background
    const bg = this.focused ? this.focusColor : this.bgColor;
    matrix.rect(pos.x, pos.y, this.width, this.height, bg, true);

    // Border
    const borderColor: RGB = this.focused ? [255, 255, 255] : [128, 128, 128];
    matrix.rect(pos.x, pos.y, this.width, this.height, borderColor, false);

    // Text (centered)
    const textColor: RGB = this.focused ? [0, 0, 0] : this.color;
    const textX = pos.x + (this.width - this.text.length * 8) / 2;
    const textY = pos.y + (this.height - 8) / 2;
    matrix.text(this.text, Math.floor(textX), Math.floor(textY), textColor);
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    if (!this.focused) {
      return false;
    }

    if (
      event.type === "keydown" &&
      (event.key === InputKeys.OK || event.key === InputKeys.ACTION)
    ) {
      if (this.onPress) {
        this.onPress();
      }
      return true;
    }

    return false;
  }
}
