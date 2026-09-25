/**
 * On-Screen Keyboard Demo
 *
 * Demonstrates the virtual keyboard component.
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { OnScreenKeyboard } from "../../ui";

export class KeyboardDemoApp implements App {
  readonly name = "Keyboard Demo";
  dirty = true;

  private keyboard: OnScreenKeyboard;
  private message = "";
  private showKeyboard = false;

  constructor() {
    this.keyboard = new OnScreenKeyboard({
      x: 0,
      y: 0,
      width: 256,
      maxLength: 50,
      placeholder: "Type something...",
      initialText: "",
      onKeyPress: (key) => {
        console.log("Key pressed:", key);
        this.dirty = true;
      },
      onDismiss: () => {
        this.showKeyboard = false;
        this.message = `You typed: "${this.keyboard.getText()}"`;
        this.dirty = true;
        console.log("Keyboard dismissed");
      },
    });

    this.keyboard.focused = true;
  }

  onActivate(): void {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {
    // Update keyboard animation
    this.keyboard.update(deltaTime);
    if (this.keyboard.isAnimating()) {
      this.dirty = true;
    }
  }

  onEvent(event: InputEvent): boolean {
    // Toggle keyboard with space
    if (event.type === "keydown" && event.key === " " && !this.showKeyboard) {
      this.showKeyboard = true;
      this.keyboard.show();
      this.message = "";
      this.dirty = true;
      return true;
    }

    // Let keyboard handle events when visible
    if (this.showKeyboard && this.keyboard.handleEvent(event)) {
      this.dirty = true;
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Title
    matrix.text("ON-SCREEN KEYBOARD", 8, 8, [255, 255, 0]);
    matrix.text("Mobile-Style Demo", 8, 18, [150, 150, 150]);

    // Instructions
    if (!this.showKeyboard) {
      const instrY = 50;
      matrix.text("Press SPACE to show", 8, instrY, [200, 200, 200]);
      matrix.text("keyboard", 8, instrY + 10, [200, 200, 200]);

      // Show last message
      if (this.message) {
        const msgY = 80;
        matrix.rect(4, msgY, 248, 14, [0, 64, 0], true);
        matrix.text(this.message, 8, msgY + 3, [0, 255, 0]);
      }

      // Bottom instructions
      matrix.text("Arrows: Navigate keys", 8, 150, [128, 128, 128]);
      matrix.text("Space/Enter: Select", 8, 160, [128, 128, 128]);
      matrix.text("ESC: Dismiss keyboard", 8, 170, [128, 128, 128]);
    } else {
      // Show hint above keyboard
      matrix.text("ESC to dismiss", 8, 100, [150, 150, 150]);
    }

    // Render keyboard (slides up from bottom)
    if (this.showKeyboard || this.keyboard.isAnimating()) {
      this.keyboard.render(matrix);
    }

    this.dirty = false;
  }

  canBePaused(): boolean {
    return true;
  }

  supportsBackgroundExecution(): boolean {
    return false;
  }
}

export function run(context: any) {
  const app = new KeyboardDemoApp();
  context.registerApp(app);
  context.switchToApp(app);
  context.run();
}
