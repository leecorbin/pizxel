/**
 * Launcher App - ZX Spectrum Style
 *
 * Icon grid launcher with retro aesthetics.
 * Layout optimized for 256×192 display.
 */

import { App, InputEvent, InputKeys } from "../types/index";
import { DisplayBuffer } from "../core/display-buffer";
import { AppFramework } from "../core/app-framework";
import { HelpModal } from "../ui";
import { getEmojiLoader } from "../lib/emoji-loader";

interface AppIcon {
  name: string;
  emoji: string;
  color: [number, number, number];
  app?: App; // Reference to app instance
}

export class LauncherApp implements App {
  readonly name = "Launcher";

  private selectedIndex: number = 0;
  private apps: AppIcon[] = [];
  private appFramework: AppFramework;

  // Help modal
  private helpModal = HelpModal.create([
    { key: "Arrow Keys", action: "Navigate apps" },
    { key: "Enter/Space", action: "Launch app" },
    { key: "Tab", action: "Show help" },
    { key: "ESC", action: "Exit PiZXel" },
  ]);

  // Layout configuration for 256×192
  private readonly cols = 4; // 4 columns of icons
  private readonly rows = 3; // 3 rows of icons
  private readonly iconSize = 48; // 48×48 pixel cells (larger for better text)
  private readonly iconSpacing = 12;
  private readonly startX = 20; // Left margin
  private readonly startY = 40; // Top margin (leave room for title)

  // ZX Spectrum color palette
  private readonly bgColor: [number, number, number] = [0, 0, 0]; // Black
  private readonly textColor: [number, number, number] = [255, 255, 255]; // White
  private readonly selectedColor: [number, number, number] = [255, 255, 0]; // Bright Yellow
  private readonly borderColor: [number, number, number] = [0, 255, 255]; // Cyan

  dirty: boolean = true;

  constructor(appFramework: AppFramework) {
    this.appFramework = appFramework;

    // Apps will be registered dynamically via registerApp()
    this.apps = [];
  }

  registerApp(
    name: string,
    emoji: string,
    color: [number, number, number],
    app: App
  ): void {
    // Add or update app in launcher (insert at beginning for priority)
    const existingIndex = this.apps.findIndex((a) => a.name === name);
    if (existingIndex >= 0) {
      this.apps[existingIndex] = { name, emoji, color, app };
    } else {
      this.apps.unshift({ name, emoji, color, app });
    }
    this.dirty = true;
  }

  async onActivate(): Promise<void> {
    // Pre-load all emoji icons when launcher activates
    const emojiLoader = getEmojiLoader();
    const loadPromises = this.apps.map((app) =>
      emojiLoader.getEmojiImage(app.emoji).catch((err) => {
        console.warn(`Failed to pre-load emoji ${app.emoji}:`, err.message);
      })
    );

    // Wait for all emojis to load before marking dirty
    await Promise.all(loadPromises);
    this.dirty = true;
  }

  onDeactivate(): void {
    // Nothing to clean up
  }

  onUpdate(deltaTime: number): void {
    // Static display, no animation needed
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") {
      return false;
    }

    // Check for help key FIRST (before app logic)
    if (event.key === InputKeys.HELP || event.key === "Tab") {
      this.helpModal.toggle();
      this.dirty = true;
      return true;
    }

    // Modal intercepts events when visible
    if (this.helpModal.visible && this.helpModal.handleEvent(event)) {
      this.dirty = true;
      return true;
    }

    let handled = false;

    switch (event.key) {
      case InputKeys.LEFT:
      case "a":
      case "A":
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          handled = true;
        }
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        if (this.selectedIndex < this.apps.length - 1) {
          this.selectedIndex++;
          handled = true;
        }
        break;

      case InputKeys.UP:
      case "w":
      case "W":
        if (this.selectedIndex >= this.cols) {
          this.selectedIndex -= this.cols;
          handled = true;
        }
        break;

      case InputKeys.DOWN:
      case "s":
      case "S":
        if (this.selectedIndex + this.cols < this.apps.length) {
          this.selectedIndex += this.cols;
          handled = true;
        }
        break;

      case InputKeys.OK:
      case " ":
        // Launch selected app
        const selected = this.apps[this.selectedIndex];
        if (selected.app) {
          console.log(`Launching app: ${selected.name}`);
          this.appFramework.switchToApp(selected.app);
        } else {
          console.log(`App not yet implemented: ${selected.name}`);
        }
        handled = true;
        break;
    }

    if (handled) {
      this.dirty = true;
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    // Clear screen
    matrix.clear();

    // Draw title bar with ZX Spectrum border effect
    this.drawTitleBar(matrix);

    // Draw app icons in grid
    for (let i = 0; i < this.apps.length; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;

      const x = this.startX + col * (this.iconSize + this.iconSpacing);
      const y = this.startY + row * (this.iconSize + this.iconSpacing);

      this.drawIcon(matrix, this.apps[i], x, y, i === this.selectedIndex);
    }

    // Render help modal on top if visible
    this.helpModal.render(matrix);

    this.dirty = false;
  }

  private drawTitleBar(matrix: DisplayBuffer): void {
    // ZX Spectrum style title bar
    const titleText = "PiZXel OS";
    const titleWidth = titleText.length * 8;
    const titleX = Math.floor((256 - titleWidth) / 2);

    // Draw border line
    matrix.line(0, 0, 255, 0, this.borderColor);
    matrix.line(0, 1, 255, 1, this.borderColor);
    matrix.line(0, 30, 255, 30, this.borderColor);
    matrix.line(0, 31, 255, 31, this.borderColor);

    // Draw title text
    matrix.text(titleText, titleX, 10, this.textColor);
  }

  private drawIcon(
    matrix: DisplayBuffer,
    icon: AppIcon,
    x: number,
    y: number,
    selected: boolean
  ): void {
    // Draw selection border only for selected icon (ZX Spectrum bright colors)
    if (selected) {
      // Double border effect for selection
      matrix.rect(
        x - 2,
        y - 2,
        this.iconSize + 4,
        this.iconSize + 4,
        this.selectedColor,
        false
      );
      matrix.rect(
        x - 1,
        y - 1,
        this.iconSize + 2,
        this.iconSize + 2,
        this.selectedColor,
        false
      );
    }
    // No border for unselected icons

    // Draw icon background (subtle)
    const bgShade: [number, number, number] = [16, 16, 32];
    matrix.rect(
      x + 1,
      y + 1,
      this.iconSize - 2,
      this.iconSize - 2,
      bgShade,
      true
    );

    // Draw emoji icon (centered in cell)
    const emojiSize = 32; // Emoji render size
    const iconX = x + (this.iconSize - emojiSize) / 2;
    const iconY = y + (this.iconSize - emojiSize) / 2;

    // Try to render emoji from cache (synchronous)
    const emojiLoader = getEmojiLoader();
    const rendered = emojiLoader.renderToBufferSync(
      icon.emoji,
      matrix,
      Math.floor(iconX),
      Math.floor(iconY),
      emojiSize
    );

    // If emoji not rendered (not in cache), draw fallback
    if (!rendered) {
      matrix.rect(
        Math.floor(iconX),
        Math.floor(iconY),
        emojiSize,
        emojiSize,
        icon.color,
        true
      );
      // Draw a simple pattern inside
      const centerX = Math.floor(iconX + emojiSize / 2);
      const centerY = Math.floor(iconY + emojiSize / 2);
      matrix.circle(centerX, centerY, 10, this.bgColor, false);
    }

    // Draw app name below icon (centered, with more space)
    const maxChars = 6; // Allow up to 6 characters with larger spacing
    const displayName = icon.name.substring(0, maxChars);
    const nameX = x + (this.iconSize - displayName.length * 8) / 2;
    const nameY = y + this.iconSize + 4;
    matrix.text(
      displayName,
      Math.floor(nameX),
      Math.floor(nameY),
      selected ? this.selectedColor : this.textColor
    );
  }
}
