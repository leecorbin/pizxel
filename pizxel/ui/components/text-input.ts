/**
 * TextInput Component
 *
 * Single-line text input with cursor, typing, and backspace support.
 */

import { Widget } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { InputEvent } from "../../types/index";

export interface TextInputOptions {
  x: number;
  y: number;
  width: number;
  placeholder?: string;
  maxLength?: number;
  textColor?: [number, number, number];
  bgColor?: [number, number, number];
  cursorColor?: [number, number, number];
  borderColor?: [number, number, number];
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export class TextInput extends Widget {
  private value: string = "";
  private cursorPos: number = 0;
  private cursorVisible: boolean = true;
  private cursorBlinkTime: number = 0;
  private readonly blinkInterval: number = 500; // ms

  private placeholder: string;
  private maxLength: number;
  private textColor: [number, number, number];
  private bgColor: [number, number, number];
  private cursorColor: [number, number, number];
  private borderColor: [number, number, number];
  private onChange?: (value: string) => void;
  private onSubmit?: (value: string) => void;

  constructor(options: TextInputOptions) {
    super({ x: options.x, y: options.y, width: options.width, height: 10 }); // 10px height (8px font + 1px padding)

    this.placeholder = options.placeholder || "";
    this.maxLength = options.maxLength || 20;
    this.textColor = options.textColor || [255, 255, 255];
    this.bgColor = options.bgColor || [0, 0, 0];
    this.cursorColor = options.cursorColor || [255, 255, 0];
    this.borderColor = options.borderColor || [0, 64, 128];
    this.onChange = options.onChange;
    this.onSubmit = options.onSubmit;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): void {
    this.value = value.substring(0, this.maxLength);
    this.cursorPos = Math.min(this.cursorPos, this.value.length);
  }

  clear(): void {
    this.value = "";
    this.cursorPos = 0;
  }

  update(deltaTime: number): void {
    // Blink cursor
    this.cursorBlinkTime += deltaTime * 1000;
    if (this.cursorBlinkTime >= this.blinkInterval) {
      this.cursorBlinkTime = 0;
      this.cursorVisible = !this.cursorVisible;
    }
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    if (!this.focused) return false;

    // Handle printable characters
    if (event.key.length === 1 && this.value.length < this.maxLength) {
      // Insert character at cursor position
      this.value =
        this.value.substring(0, this.cursorPos) +
        event.key +
        this.value.substring(this.cursorPos);
      this.cursorPos++;
      this.cursorVisible = true;
      this.cursorBlinkTime = 0;

      if (this.onChange) {
        this.onChange(this.value);
      }
      return true;
    }

    // Handle special keys
    switch (event.key) {
      case "Backspace":
        if (this.cursorPos > 0) {
          this.value =
            this.value.substring(0, this.cursorPos - 1) +
            this.value.substring(this.cursorPos);
          this.cursorPos--;
          this.cursorVisible = true;
          this.cursorBlinkTime = 0;

          if (this.onChange) {
            this.onChange(this.value);
          }
        }
        return true;

      case "Delete":
        if (this.cursorPos < this.value.length) {
          this.value =
            this.value.substring(0, this.cursorPos) +
            this.value.substring(this.cursorPos + 1);

          if (this.onChange) {
            this.onChange(this.value);
          }
        }
        return true;

      case "ArrowLeft":
        if (this.cursorPos > 0) {
          this.cursorPos--;
          this.cursorVisible = true;
          this.cursorBlinkTime = 0;
        }
        return true;

      case "ArrowRight":
        if (this.cursorPos < this.value.length) {
          this.cursorPos++;
          this.cursorVisible = true;
          this.cursorBlinkTime = 0;
        }
        return true;

      case "Home":
        this.cursorPos = 0;
        this.cursorVisible = true;
        this.cursorBlinkTime = 0;
        return true;

      case "End":
        this.cursorPos = this.value.length;
        this.cursorVisible = true;
        this.cursorBlinkTime = 0;
        return true;

      case "Enter":
        if (this.onSubmit) {
          this.onSubmit(this.value);
        }
        return true;
    }

    return false;
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

    // Draw text or placeholder
    const displayText = this.value || this.placeholder;
    const color = this.value
      ? this.textColor
      : ([64, 64, 64] as [number, number, number]);

    if (displayText) {
      // Calculate visible portion (scroll if needed)
      const charWidth = 8;
      const maxChars = Math.floor((this.width - 4) / charWidth);
      let startChar = 0;

      if (this.cursorPos > maxChars) {
        startChar = this.cursorPos - maxChars;
      }

      const visibleText = displayText.substring(
        startChar,
        startChar + maxChars
      );
      display.text(visibleText, globalX + 2, globalY + 2, color);
    }

    // Draw cursor if focused and visible
    if (this.focused && this.cursorVisible) {
      const charWidth = 8;
      const maxChars = Math.floor((this.width - 4) / charWidth);
      let startChar = 0;

      if (this.cursorPos > maxChars) {
        startChar = this.cursorPos - maxChars;
      }

      const cursorX = globalX + 2 + (this.cursorPos - startChar) * charWidth;
      const cursorY = globalY + 2;

      // Draw cursor line
      display.line(cursorX, cursorY, cursorX, cursorY + 7, this.cursorColor);
    }
  }
}
