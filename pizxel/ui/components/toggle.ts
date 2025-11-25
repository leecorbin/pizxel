/**
 * Toggle Component
 *
 * On/off switch with visual state indication.
 */

import { Widget } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { InputEvent } from "../../types/index";

export interface ToggleOptions {
  x: number;
  y: number;
  label?: string;
  initialState?: boolean;
  onColor?: [number, number, number];
  offColor?: [number, number, number];
  labelColor?: [number, number, number];
  onChange?: (state: boolean) => void;
}

export class Toggle extends Widget {
  private state: boolean;
  private label: string;
  private onColor: [number, number, number];
  private offColor: [number, number, number];
  private labelColor: [number, number, number];
  private onChange?: (state: boolean) => void;

  constructor(options: ToggleOptions) {
    const labelWidth = options.label ? options.label.length * 8 + 4 : 0;
    super({ x: options.x, y: options.y, width: labelWidth + 24, height: 12 }); // 24px for toggle switch

    this.state =
      options.initialState !== undefined ? options.initialState : false;
    this.label = options.label || "";
    this.onColor = options.onColor || [0, 255, 0];
    this.offColor = options.offColor || [64, 64, 64];
    this.labelColor = options.labelColor || [255, 255, 255];
    this.onChange = options.onChange;
  }

  getState(): boolean {
    return this.state;
  }

  setState(state: boolean): void {
    if (this.state !== state) {
      this.state = state;

      if (this.onChange) {
        this.onChange(this.state);
      }
    }
  }

  toggle(): void {
    this.setState(!this.state);
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    if (event.key === "Enter" || event.key === " ") {
      this.toggle();
      return true;
    }

    return false;
  }

  protected renderSelf(display: DisplayBuffer): void {
    const globalX = this.x;
    const globalY = this.y;

    // Draw label
    if (this.label) {
      display.text(this.label, globalX, globalY + 2, this.labelColor);
    }

    // Calculate toggle position
    const labelWidth = this.label ? this.label.length * 8 + 4 : 0;
    const toggleX = globalX + labelWidth;
    const toggleY = globalY;

    // Draw toggle background
    const bgColor = this.state ? this.onColor : this.offColor;
    display.rect(
      toggleX,
      toggleY,
      24,
      12,
      this.focused ? [255, 255, 0] : bgColor
    );
    display.rect(toggleX + 1, toggleY + 1, 22, 10, bgColor, true);

    // Draw toggle knob
    const knobX = this.state ? toggleX + 13 : toggleX + 2;
    const knobColor: [number, number, number] = [255, 255, 255];
    display.rect(knobX, toggleY + 2, 9, 8, knobColor, true);
  }
}
