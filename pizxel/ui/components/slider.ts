/**
 * Slider Component
 *
 * Draggable value control with min/max range.
 */

import { Widget } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { InputEvent } from "../../types/index";

export interface SliderOptions {
  x: number;
  y: number;
  width: number;
  min?: number;
  max?: number;
  value?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  trackColor?: [number, number, number];
  fillColor?: [number, number, number];
  knobColor?: [number, number, number];
  labelColor?: [number, number, number];
  onChange?: (value: number) => void;
}

export class Slider extends Widget {
  private value: number;
  private min: number;
  private max: number;
  private step: number;
  private label: string;
  private showValue: boolean;
  private trackColor: [number, number, number];
  private fillColor: [number, number, number];
  private knobColor: [number, number, number];
  private labelColor: [number, number, number];
  private onChange?: (value: number) => void;

  constructor(options: SliderOptions) {
    super({ x: options.x, y: options.y, width: options.width, height: 20 }); // 20px height for label + slider

    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;
    this.step = options.step !== undefined ? options.step : 1;
    this.value = options.value !== undefined ? options.value : this.min;
    this.label = options.label || "";
    this.showValue = options.showValue !== undefined ? options.showValue : true;
    this.trackColor = options.trackColor || [64, 64, 64];
    this.fillColor = options.fillColor || [0, 255, 255];
    this.knobColor = options.knobColor || [255, 255, 255];
    this.labelColor = options.labelColor || [255, 255, 255];
    this.onChange = options.onChange;

    // Clamp initial value
    this.value = this.clamp(this.value);
  }

  private clamp(value: number): number {
    return Math.max(this.min, Math.min(this.max, value));
  }

  private roundToStep(value: number): number {
    return Math.round(value / this.step) * this.step;
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    const newValue = this.clamp(this.roundToStep(value));
    if (this.value !== newValue) {
      this.value = newValue;

      if (this.onChange) {
        this.onChange(this.value);
      }
    }
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    const delta = this.step;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        this.setValue(this.value - delta);
        return true;

      case "ArrowRight":
      case "ArrowUp":
        this.setValue(this.value + delta);
        return true;

      case "Home":
        this.setValue(this.min);
        return true;

      case "End":
        this.setValue(this.max);
        return true;
    }

    return false;
  }

  protected renderSelf(display: DisplayBuffer): void {
    const globalX = this.x;
    const globalY = this.y;

    let currentY = globalY;

    // Draw label and value
    if (this.label || this.showValue) {
      let text = this.label;
      if (this.showValue) {
        const valueStr = this.value.toFixed(0);
        text = text ? `${text}: ${valueStr}` : valueStr;
      }
      display.text(text, globalX, currentY, this.labelColor);
      currentY += 10;
    }

    // Calculate slider dimensions
    const sliderWidth = this.width;
    const sliderHeight = 8;
    const knobWidth = 6;

    // Draw track
    display.rect(globalX, currentY, sliderWidth, sliderHeight, this.trackColor);
    display.rect(
      globalX + 1,
      currentY + 1,
      sliderWidth - 2,
      sliderHeight - 2,
      [0, 0, 0],
      true
    );

    // Calculate fill width based on value
    const range = this.max - this.min;
    const normalizedValue = (this.value - this.min) / range;
    const fillWidth = Math.floor((sliderWidth - 2) * normalizedValue);

    // Draw fill
    if (fillWidth > 0) {
      display.rect(
        globalX + 1,
        currentY + 1,
        fillWidth,
        sliderHeight - 2,
        this.fillColor,
        true
      );
    }

    // Calculate knob position
    const knobX =
      globalX + Math.floor((sliderWidth - knobWidth) * normalizedValue);

    // Draw knob
    const knobColor: [number, number, number] = this.focused
      ? [255, 255, 0]
      : this.knobColor;
    display.rect(
      knobX,
      currentY - 1,
      knobWidth,
      sliderHeight + 2,
      knobColor,
      true
    );
  }
}
