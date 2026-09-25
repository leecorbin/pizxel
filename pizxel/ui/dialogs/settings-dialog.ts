/**
 * Settings Dialog Component
 *
 * Modal dialog for configuring app settings with form controls.
 */

import { Widget } from "../core/widget";
import { Container } from "../core/container";
import { DisplayBuffer } from "../../core/display-buffer";
import { TextInput } from "../components/text-input";
import { Button } from "../components/button";
import { InputEvent } from "../../types";

export interface SettingsField {
  key: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  type?: "text" | "password";
}

export interface SettingsDialogOptions {
  title: string;
  fields: SettingsField[];
  values: { [key: string]: string };
  onSave: (values: { [key: string]: string }) => void;
  onCancel: () => void;
}

export class SettingsDialog extends Widget {
  private container!: Container;
  private inputs: Map<string, TextInput> = new Map();
  private saveButton!: Button;
  private cancelButton!: Button;
  private focusedFieldIndex: number = 0;
  private focusedOnButton: boolean = false;
  private fields: SettingsField[];
  private title: string;
  private onSave: (values: { [key: string]: string }) => void;
  private onCancel: () => void;

  constructor(options: SettingsDialogOptions) {
    super({ x: 0, y: 0, width: 256, height: 192 });

    this.title = options.title;
    this.fields = options.fields;
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;

    this.setupDialog(options.values);
  }

  private setupDialog(values: { [key: string]: string }): void {
    // Calculate dialog dimensions
    const dialogWidth = 220;
    const dialogHeight = 90 + this.fields.length * 30; // Extra space for buttons
    const dialogX = Math.floor((256 - dialogWidth) / 2);
    const dialogY = Math.floor((192 - dialogHeight) / 2);

    // Create container
    this.container = new Container({
      x: dialogX,
      y: dialogY,
      width: dialogWidth,
      height: dialogHeight,
      bgColor: [30, 30, 30],
    });
    this.addChild(this.container);

    // Create text inputs for each field
    let yOffset = 35;
    for (let i = 0; i < this.fields.length; i++) {
      const field = this.fields[i];
      const input = new TextInput({
        x: 15,
        y: yOffset,
        width: dialogWidth - 30,
        placeholder: field.placeholder || "",
        maxLength: field.maxLength || 50,
        textColor: [255, 255, 255],
        bgColor: [20, 20, 20],
        borderColor: [0, 100, 200],
      });

      input.setValue(values[field.key] || "");

      if (i === 0) {
        input.focused = true;
      }

      this.inputs.set(field.key, input);
      this.container.addChild(input);

      yOffset += 30;
    }

    // Add Save button
    this.saveButton = new Button({
      x: 15,
      y: yOffset + 10,
      width: 95,
      height: 24,
      text: "Save",
      bgColor: [0, 120, 0],
      focusColor: [0, 200, 0],
      onPress: () => this.save(),
    });
    this.container.addChild(this.saveButton);

    // Add Cancel button
    this.cancelButton = new Button({
      x: 120,
      y: yOffset + 10,
      width: 85,
      height: 24,
      text: "Cancel",
      bgColor: [100, 0, 0],
      focusColor: [200, 0, 0],
      onPress: () => {
        // Blur all inputs before closing
        for (const input of this.inputs.values()) {
          input.focused = false;
        }
        this.onCancel();
      },
    });
    this.container.addChild(this.cancelButton);
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    const fieldKeys = Array.from(this.inputs.keys());
    const currentInput = this.inputs.get(fieldKeys[this.focusedFieldIndex]);

    // Enter to save (handle before passing to input)
    if (event.key === "Enter") {
      this.save();
      return true;
    }

    // ESC to cancel
    if (event.key === "Escape") {
      // Blur all inputs before closing
      for (const input of this.inputs.values()) {
        input.focused = false;
      }
      this.onCancel();
      return true;
    }

    // Tab to switch between fields and buttons
    if (event.key === "Tab") {
      if (this.focusedOnButton) {
        // Move from buttons back to first field
        this.saveButton.focused = false;
        this.cancelButton.focused = false;
        this.focusedOnButton = false;
        this.focusedFieldIndex = 0;
        const firstInput = this.inputs.get(fieldKeys[0]);
        if (firstInput) {
          firstInput.focused = true;
        }
      } else {
        // Check if we're on the last field
        if (this.focusedFieldIndex === this.fields.length - 1) {
          // Move to Save button
          if (currentInput) {
            currentInput.focused = false;
          }
          this.focusedOnButton = true;
          this.saveButton.focused = true;
        } else {
          // Move to next field
          if (currentInput) {
            currentInput.focused = false;
          }
          this.focusedFieldIndex++;
          const nextInput = this.inputs.get(fieldKeys[this.focusedFieldIndex]);
          if (nextInput) {
            nextInput.focused = true;
          }
        }
      }
      return true;
    }

    // Arrow keys to move between buttons
    if (this.focusedOnButton) {
      if (event.key === "ArrowLeft" && this.cancelButton.focused) {
        this.cancelButton.focused = false;
        this.saveButton.focused = true;
        return true;
      } else if (event.key === "ArrowRight" && this.saveButton.focused) {
        this.saveButton.focused = false;
        this.cancelButton.focused = true;
        return true;
      }

      // Handle button press
      if (
        this.saveButton.handleEvent(event) ||
        this.cancelButton.handleEvent(event)
      ) {
        return true;
      }
    }

    // Pass to focused input
    if (
      !this.focusedOnButton &&
      currentInput &&
      currentInput.handleEvent(event)
    ) {
      return true;
    }

    return false;
  }

  private save(): void {
    // Blur all inputs before closing to prevent lingering focus
    for (const input of this.inputs.values()) {
      input.focused = false;
    }

    const values: { [key: string]: string } = {};
    for (const [key, input] of this.inputs.entries()) {
      values[key] = input.getValue();
    }
    this.onSave(values);
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    // Dim background
    matrix.dim(0, 0, matrix.getWidth(), matrix.getHeight(), 0.3);

    const pos = this.getAbsolutePosition();
    const dialogX = this.container.x + pos.x;
    const dialogY = this.container.y + pos.y;

    // Dialog border
    matrix.rect(
      dialogX - 1,
      dialogY - 1,
      this.container.width + 2,
      this.container.height + 2,
      [255, 255, 255],
      false
    );

    // Title bar
    matrix.rect(
      dialogX,
      dialogY,
      this.container.width,
      20,
      [0, 100, 200],
      true
    );
    matrix.text(this.title, dialogX + 8, dialogY + 6, [255, 255, 255]);

    // Field labels
    let yOffset = 35;
    for (const field of this.fields) {
      matrix.text(
        field.label,
        dialogX + 15,
        dialogY + yOffset - 12,
        [180, 180, 180]
      );
      yOffset += 30;
    }

    // Instructions
    const instructY = dialogY + this.container.height - 15;
    matrix.text(
      "Tab: Next  ←→: Buttons  Enter: Save  ESC: Cancel",
      dialogX + 5,
      instructY,
      [120, 120, 120]
    );
  }

  update(deltaTime: number): void {
    // Update all inputs for cursor blinking
    for (const input of this.inputs.values()) {
      input.update(deltaTime);
    }
  }
}
