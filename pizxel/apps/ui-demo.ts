/**
 * UI Demo App
 *
 * Demonstrates all UI controls: TextInput, Toggle, Slider, ProgressBar, and layouts.
 */

import { App, InputEvent } from "../types";
import { DisplayBuffer } from "../core/display-buffer";
import {
  Panel,
  Label,
  TextInput,
  Toggle,
  Slider,
  ProgressBar,
  VStack,
  Spacer,
  HelpModal,
  HelpItem,
} from "../ui";

export class UIDemo implements App {
  name: string = "UI Demo";
  private panel: Panel;
  private nameInput: TextInput;
  private soundToggle: Toggle;
  private volumeSlider: Slider;
  private progressBar: ProgressBar;
  private statusLabel: Label;
  private helpModal: HelpModal | null = null;

  private focusIndex: number = 0;
  private focusableWidgets: Array<TextInput | Toggle | Slider> = [];

  constructor() {
    // No super call needed for interface

    // Create panel
    this.panel = new Panel({
      x: 10,
      y: 10,
      width: 236,
      height: 172,
      borderColor: [0, 255, 255],
    });

    // Create layout
    const layout = new VStack({
      x: 5,
      y: 15,
      spacing: 8,
    });

    // Title
    const titleLabel = new Label({
      x: 0,
      y: 0,
      text: "Configure Settings:",
      color: [255, 255, 0],
    });
    layout.addChild(titleLabel);

    layout.addChild(new Spacer({ minHeight: 4 }));

    // Name input
    this.nameInput = new TextInput({
      x: 0,
      y: 0,
      width: 180,
      placeholder: "Enter name...",
      maxLength: 15,
      onChange: (value) => this.updateStatus(`Name: ${value}`),
    });
    layout.addChild(this.nameInput);
    this.focusableWidgets.push(this.nameInput);

    // Sound toggle
    this.soundToggle = new Toggle({
      x: 0,
      y: 0,
      label: "Sound",
      initialState: true,
      onChange: (state) => this.updateStatus(`Sound: ${state ? "ON" : "OFF"}`),
    });
    layout.addChild(this.soundToggle);
    this.focusableWidgets.push(this.soundToggle);

    // Volume slider
    this.volumeSlider = new Slider({
      x: 0,
      y: 0,
      width: 180,
      min: 0,
      max: 100,
      value: 75,
      label: "Volume",
      onChange: (value) => this.updateStatus(`Volume: ${value}%`),
    });
    layout.addChild(this.volumeSlider);
    this.focusableWidgets.push(this.volumeSlider);

    layout.addChild(new Spacer({ minHeight: 4 }));

    // Progress bar
    this.progressBar = new ProgressBar({
      x: 0,
      y: 0,
      width: 180,
      value: 0,
      label: "Loading",
    });
    layout.addChild(this.progressBar);

    layout.addChild(new Spacer({ minHeight: 4 }));

    // Status label
    this.statusLabel = new Label({
      x: 0,
      y: 0,
      text: "Ready",
      color: [0, 255, 0],
    });
    layout.addChild(this.statusLabel);

    this.panel.addChild(layout);

    // Set initial focus
    this.focusableWidgets[0].focused = true;
  }

  private updateStatus(text: string): void {
    this.statusLabel.setText(text);
  }

  private updateFocus(): void {
    // Clear all focus
    this.focusableWidgets.forEach((w) => (w.focused = false));

    // Set new focus
    this.focusableWidgets[this.focusIndex].focused = true;
  }

  onActivate(): void {
    console.log("UIDemo activated");
  }

  onDeactivate(): void {
    console.log("UIDemo deactivated");
  }

  onUpdate(deltaTime: number): void {
    // Update progress bar
    const currentValue = this.progressBar.getValue();
    if (currentValue < 100) {
      this.progressBar.setValue(currentValue + deltaTime * 10);
    } else {
      this.progressBar.setValue(0);
    }

    // Update text input cursor blink
    if (this.nameInput.focused) {
      this.nameInput.update(deltaTime);
    }
  }

  onEvent(event: InputEvent): boolean {
    // Check for help modal
    if (event.key === "Tab") {
      this.showHelp();
      return true;
    }

    // If modal is open, let it handle events
    if (this.helpModal) {
      const handled = this.helpModal.handleEvent(event);
      if (handled && !this.helpModal.visible) {
        this.helpModal = null;
      }
      return handled;
    }

    // Tab between focusable widgets
    if (event.key === "ArrowDown") {
      this.focusIndex = (this.focusIndex + 1) % this.focusableWidgets.length;
      this.updateFocus();
      return true;
    }

    if (event.key === "ArrowUp") {
      this.focusIndex =
        (this.focusIndex - 1 + this.focusableWidgets.length) %
        this.focusableWidgets.length;
      this.updateFocus();
      return true;
    }

    // Pass event to focused widget
    const focused = this.focusableWidgets[this.focusIndex];
    return focused.handleEvent(event);
  }

  private showHelp(): void {
    const helpItems: HelpItem[] = [
      { key: "↑↓", action: "Switch control" },
      { key: "←→", action: "Adjust slider" },
      { key: "Space", action: "Toggle switch" },
      { key: "Enter", action: "Submit input" },
      { key: "Backspace", action: "Delete character" },
      { key: "Tab", action: "Show this help" },
      { key: "Esc", action: "Exit app" },
    ];

    this.helpModal = HelpModal.create(helpItems, "UI Demo Help");
  }

  render(display: DisplayBuffer): void {
    display.clear();

    // Render panel and all children
    this.panel.render(display);

    // Render help modal on top
    if (this.helpModal) {
      this.helpModal.render(display);
    }
  }
}

// Entry point for standalone execution
export function run(): void {
  const app = new UIDemo();
  // Would integrate with app framework here
  console.log("UIDemo created");
}
