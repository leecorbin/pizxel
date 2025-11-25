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
  private readonly cols = 5; // 5 columns of icons
  private readonly rows = 3; // 3 rows of icons
  private readonly iconSize = 40; // 40×40 pixel cells
  private readonly iconSpacing = 8;
  private readonly startX = 16; // Left margin
  private readonly startY = 40; // Top margin (leave room for title)

  // ZX Spectrum color palette
  private readonly bgColor: [number, number, number] = [0, 0, 0]; // Black
  private readonly textColor: [number, number, number] = [255, 255, 255]; // White
  private readonly selectedColor: [number, number, number] = [255, 255, 0]; // Bright Yellow
  private readonly borderColor: [number, number, number] = [0, 255, 255]; // Cyan

  dirty: boolean = true;

  constructor(appFramework: AppFramework) {
    this.appFramework = appFramework;

    // Initialize with placeholder apps (will be populated via registerApp)
    this.apps = [
      { name: "Settings", emoji: "⚙️", color: [128, 128, 255] },
      { name: "Calculator", emoji: "🔢", color: [255, 128, 0] },
      { name: "Music", emoji: "♪", color: [255, 0, 255] },
      { name: "Files", emoji: "📁", color: [255, 255, 128] },
      { name: "Games", emoji: "🎯", color: [255, 64, 64] },
      { name: "Network", emoji: "🌐", color: [64, 255, 64] },
      { name: "Terminal", emoji: "💻", color: [0, 255, 0] },
      { name: "Paint", emoji: "🎨", color: [255, 128, 255] },
      { name: "Notes", emoji: "📝", color: [255, 255, 128] },
      { name: "Help", emoji: "❓", color: [255, 128, 64] },
    ];
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

  onActivate(): void {
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
    // Draw selection border (ZX Spectrum bright colors)
    if (selected) {
      // Animated border effect
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
    } else {
      // Normal border
      matrix.rect(x, y, this.iconSize, this.iconSize, this.borderColor, false);
    }

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
    // Note: For now we'll draw a colored square as placeholder since emoji rendering
    // would require the emoji loader system. We'll represent with colored blocks.
    const iconSize = 24;
    const iconX = x + (this.iconSize - iconSize) / 2;
    const iconY = y + (this.iconSize - iconSize) / 2;

    // Draw colored square with icon color
    matrix.rect(
      Math.floor(iconX),
      Math.floor(iconY),
      iconSize,
      iconSize,
      icon.color,
      true
    );

    // Draw a simple pattern inside to make it more distinctive
    const centerX = Math.floor(iconX + iconSize / 2);
    const centerY = Math.floor(iconY + iconSize / 2);
    matrix.circle(centerX, centerY, 8, this.bgColor, false);

    // Draw app name below icon
    const nameX = x + (this.iconSize - icon.name.length * 8) / 2;
    const nameY = y + this.iconSize + 2;
    matrix.text(
      icon.name.substring(0, 5), // Truncate to fit
      Math.floor(nameX),
      Math.floor(nameY),
      selected ? this.selectedColor : this.textColor
    );
  }
}
