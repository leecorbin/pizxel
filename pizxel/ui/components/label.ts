/**
 * Label Component
 *
 * Static text display.
 */

import { Widget, WidgetOptions } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB } from "../../types/index";

export interface LabelOptions extends WidgetOptions {
  text: string;
  color?: RGB;
  bgColor?: RGB;
  scale?: number;
  centered?: boolean;
}

export class Label extends Widget {
  text: string;
  color: RGB;
  bgColor?: RGB;
  scale: number;
  centered: boolean;

  constructor(options: LabelOptions) {
    super(options);
    this.text = options.text;
    this.color = options.color ?? [255, 255, 255];
    this.bgColor = options.bgColor;
    this.scale = options.scale ?? 1;
    this.centered = options.centered ?? false;

    // Auto-calculate width if not specified
    if (this.width === 0) {
      this.width = this.text.length * 8 * this.scale;
    }
    if (this.height === 0) {
      this.height = 8 * this.scale;
    }
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    const pos = this.getAbsolutePosition();

    if (this.centered) {
      matrix.centeredText(this.text, pos.y, this.color, this.bgColor);
    } else {
      matrix.text(
        this.text,
        pos.x,
        pos.y,
        this.color,
        this.bgColor,
        this.scale
      );
    }
  }

  /**
   * Update label text
   */
  setText(text: string): void {
    this.text = text;
    // Recalculate width
    this.width = text.length * 8 * this.scale;
  }
}
