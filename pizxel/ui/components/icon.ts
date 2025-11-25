/**
 * Icon Component
 *
 * Display emoji or sprite-based icons.
 */

import { Widget } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";

export interface IconOptions {
  x: number;
  y: number;
  size?: number;
  emoji?: string;
  color?: [number, number, number];
  bgColor?: [number, number, number];
}

export class Icon extends Widget {
  private emoji?: string;
  private color: [number, number, number];
  private bgColor: [number, number, number];

  constructor(options: IconOptions) {
    const size = options.size || 16;
    super({ x: options.x, y: options.y, width: size, height: size });

    this.emoji = options.emoji;
    this.color = options.color || [255, 255, 255];
    this.bgColor = options.bgColor || [0, 0, 0];
  }

  setEmoji(emoji: string): void {
    this.emoji = emoji;
  }

  getEmoji(): string | undefined {
    return this.emoji;
  }

  protected renderSelf(display: DisplayBuffer): void {
    const globalX = this.x;
    const globalY = this.y;

    // Fill background
    display.rect(globalX, globalY, this.width, this.height, this.bgColor, true);

    if (this.emoji) {
      // Use emoji rendering if available
      // For now, draw a placeholder circle
      const centerX = globalX + Math.floor(this.width / 2);
      const centerY = globalY + Math.floor(this.height / 2);
      const radius = Math.floor(Math.min(this.width, this.height) / 2) - 1;

      display.circle(centerX, centerY, radius, this.color, true);
    }
  }
}
