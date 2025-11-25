/**
 * ProgressBar Component
 *
 * Visual indicator for progress/completion percentage.
 */

import { Widget } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";

export interface ProgressBarOptions {
  x: number;
  y: number;
  width: number;
  height?: number;
  value?: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  barColor?: [number, number, number];
  bgColor?: [number, number, number];
  borderColor?: [number, number, number];
  textColor?: [number, number, number];
}

export class ProgressBar extends Widget {
  private value: number; // 0-100
  private label: string;
  private showPercentage: boolean;
  private barColor: [number, number, number];
  private bgColor: [number, number, number];
  private borderColor: [number, number, number];
  private textColor: [number, number, number];

  constructor(options: ProgressBarOptions) {
    const height = options.height || 12;
    super({ x: options.x, y: options.y, width: options.width, height });

    this.value = options.value !== undefined ? options.value : 0;
    this.label = options.label || "";
    this.showPercentage =
      options.showPercentage !== undefined ? options.showPercentage : true;
    this.barColor = options.barColor || [0, 255, 0];
    this.bgColor = options.bgColor || [0, 0, 0];
    this.borderColor = options.borderColor || [64, 64, 64];
    this.textColor = options.textColor || [255, 255, 255];

    // Clamp initial value
    this.value = this.clamp(this.value);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    const newValue = this.clamp(value);
    if (this.value !== newValue) {
      this.value = newValue;
    }
  }

  increment(amount: number = 1): void {
    this.setValue(this.value + amount);
  }

  protected renderSelf(display: DisplayBuffer): void {
    const globalX = this.x;
    const globalY = this.y;

    // Draw border
    display.rect(globalX, globalY, this.width, this.height, this.borderColor);

    // Fill background
    display.rect(
      globalX + 1,
      globalY + 1,
      this.width - 2,
      this.height - 2,
      this.bgColor,
      true
    );

    // Calculate fill width
    const fillWidth = Math.floor((this.width - 2) * (this.value / 100));

    // Draw progress fill
    if (fillWidth > 0) {
      display.rect(
        globalX + 1,
        globalY + 1,
        fillWidth,
        this.height - 2,
        this.barColor,
        true
      );
    }

    // Draw label/percentage
    if (this.label || this.showPercentage) {
      let text = this.label;
      if (this.showPercentage) {
        const percentText = `${Math.round(this.value)}%`;
        text = text ? `${text} ${percentText}` : percentText;
      }

      // Center text in progress bar
      const textWidth = text.length * 8;
      const textX = globalX + Math.floor((this.width - textWidth) / 2);
      const textY = globalY + Math.floor((this.height - 8) / 2);

      display.text(text, textX, textY, this.textColor);
    }
  }
}
