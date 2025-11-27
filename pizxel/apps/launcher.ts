/**
 * Launcher App - ZX Spectrum Style
 *
 * Icon grid launcher with retro aesthetics.
 * Layout optimized for 256×192 display.
 */

import { App, InputEvent, InputKeys } from "../types/index";
import { DisplayBuffer } from "../core/display-buffer";
import { AppFramework } from "../core/app-framework";
import { HelpModal, GamesPopup } from "../ui";
import { getEmojiLoader } from "../lib/emoji-loader";
import { getAudio } from "../start";
import { Sounds } from "../audio/audio";

interface AppIcon {
  name: string;
  emoji: string;
  color: [number, number, number];
  app?: App; // Reference to app instance
  category?: string; // App category (e.g., "game")
  isFolder?: boolean; // True for special folders like "Games"
}

export class LauncherApp implements App {
  readonly name = "Launcher";

  private selectedIndex: number = 0;
  private apps: AppIcon[] = [];
  private gameApps: AppIcon[] = []; // Game apps (for popup)
  private appFramework: AppFramework;
  private lastMinute: number = -1; // Track minute changes for clock
  private errorMessage: string | null = null;
  private errorTimeout: NodeJS.Timeout | null = null;
  private errorScrollOffset: number = 0; // Scroll offset for long error messages

  // Games popup
  private gamesPopup: GamesPopup;

  // Help modal
  private helpModal = HelpModal.create([
    { key: "Arrow Keys", action: "Navigate apps" },
    { key: "Enter/Space", action: "Launch app" },
    { key: "Tab", action: "Show help" },
    { key: "ESC", action: "Exit PiZXel" },
  ]);

  // Layout configuration for 256×192 with top and bottom bars (16px each)
  // Available space: 192 - 16 (top) - 16 (bottom) = 160px
  // With 3 rows: 160 / 3 = 53.3px per row
  private readonly cols = 4; // 4 columns of icons
  private readonly rows = 3; // 3 full rows
  private readonly iconSize = 48; // 48×48 icon cells
  private readonly rowSpacing = 4; // Vertical spacing between rows
  private readonly colSpacing = 8; // Horizontal spacing between columns
  private readonly startX = 16; // Left margin
  private readonly startY = 20; // Below top bar (16px + 4px spacing)

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
    this.gameApps = [];

    // Create games popup (256×192 display size)
    this.gamesPopup = new GamesPopup(256, 192);
  }

  async registerApp(
    name: string,
    emoji: string,
    color: [number, number, number],
    app: App,
    category?: string
  ): Promise<void> {
    const appIcon: AppIcon = { name, emoji, color, app, category };

    // Preload emoji into cache and wait for it
    try {
      await getEmojiLoader().getEmojiImage(emoji);
      console.log(`[Launcher] Preloaded emoji ${emoji} for ${name}`);
    } catch (err) {
      console.warn(`[Launcher] Failed to preload emoji ${emoji}:`, err);
    }

    // Games go ONLY in the Games folder, not in main launcher
    if (category === "game") {
      const existingIndex = this.gameApps.findIndex((a) => a.name === name);
      if (existingIndex >= 0) {
        this.gameApps[existingIndex] = appIcon;
      } else {
        this.gameApps.push(appIcon);
      }
    } else {
      // Non-game apps go in main launcher
      const existingIndex = this.apps.findIndex((a) => a.name === name);
      if (existingIndex >= 0) {
        this.apps[existingIndex] = appIcon;
      } else {
        this.apps.unshift(appIcon);
      }
    }

    // Update games popup if we have games
    if (this.gameApps.length > 0) {
      this.gamesPopup.setGames(
        this.gameApps.map((g) => ({
          name: g.name,
          emoji: g.emoji,
          color: g.color,
          app: g.app!,
        }))
      );

      // Add "Games" folder if not already present
      const hasFolderIcon = this.apps.some((a) => a.isFolder);
      if (!hasFolderIcon) {
        this.apps.unshift({
          name: "Games",
          emoji: "🎮",
          color: [255, 100, 0] as [number, number, number],
          isFolder: true,
        });
      }
    }

    this.dirty = true;
  }

  async onActivate(): Promise<void> {
    // Check for app crash errors
    const error = this.appFramework.getLastError();
    if (error) {
      console.log(
        `[Launcher] Displaying error: ${error.appName} - ${error.message}`
      );
      this.errorMessage = `${error.appName} - ${error.message}`;
      this.errorScrollOffset = 0; // Reset scroll

      // Clear error after 10 seconds (longer for reading)
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
      }
      this.errorTimeout = setTimeout(() => {
        this.errorMessage = null;
        this.errorTimeout = null;
        this.errorScrollOffset = 0;
        this.dirty = true;
      }, 10000);
    }

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
    // Update time display only when minute changes
    const now = new Date();
    const currentMinute = now.getMinutes();
    if (currentMinute !== this.lastMinute) {
      this.lastMinute = currentMinute;
      this.dirty = true;
    }
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

    // Games popup intercepts events when visible
    if (this.gamesPopup.isVisible()) {
      const handled = this.gamesPopup.handleEvent(event);

      if (handled) {
        // Check if user selected a game to launch
        if (event.key === InputKeys.OK || event.key === " ") {
          const selectedGame = this.gamesPopup.getSelectedGame();
          if (selectedGame && selectedGame.app) {
            console.log(`Launching game: ${selectedGame.name}`);
            this.gamesPopup.hide();
            this.appFramework.switchToApp(selectedGame.app);
          }
        }
        this.dirty = true;
        return true;
      }
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
          const audio = getAudio();
          console.log(`[Launcher] Audio available: ${audio ? "YES" : "NO"}`);
          if (audio) {
            console.log(`[Launcher] Playing SELECT sound`);
            audio.play(Sounds.SELECT);
          }
          handled = true;
        }
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        if (this.selectedIndex < this.apps.length - 1) {
          this.selectedIndex++;
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      // Error message scrolling with comma/period
      case ",":
      case "<":
        if (this.errorMessage && this.errorScrollOffset > 0) {
          this.errorScrollOffset--;
          // Reset timeout - user is actively interacting
          if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = setTimeout(() => {
              this.errorMessage = null;
              this.errorTimeout = null;
              this.errorScrollOffset = 0;
              this.dirty = true;
            }, 10000);
          }
          handled = true;
        }
        break;

      case ".":
      case ">":
        if (this.errorMessage) {
          const maxChars = 30;
          const maxOffset = Math.max(0, this.errorMessage.length - maxChars);
          if (this.errorScrollOffset < maxOffset) {
            this.errorScrollOffset++;
            // Reset timeout - user is actively interacting
            if (this.errorTimeout) {
              clearTimeout(this.errorTimeout);
              this.errorTimeout = setTimeout(() => {
                this.errorMessage = null;
                this.errorTimeout = null;
                this.errorScrollOffset = 0;
                this.dirty = true;
              }, 10000);
            }
            handled = true;
          }
        }
        break;

      case InputKeys.UP:
      case "w":
      case "W":
        if (this.selectedIndex >= this.cols) {
          this.selectedIndex -= this.cols;
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.DOWN:
      case "s":
      case "S":
        if (this.selectedIndex + this.cols < this.apps.length) {
          this.selectedIndex += this.cols;
          getAudio()?.play(Sounds.SELECT);
          handled = true;
        }
        break;

      case InputKeys.OK:
      case " ":
        // Launch selected app or open folder
        const selected = this.apps[this.selectedIndex];

        if (selected.isFolder) {
          // Open Games popup
          console.log("Opening Games folder");
          getAudio()?.play(Sounds.COIN);
          this.gamesPopup.show();
          handled = true;
        } else if (selected.app) {
          console.log(`Launching app: ${selected.name}`);
          getAudio()?.play(Sounds.COIN);
          this.appFramework.switchToApp(selected.app);
          handled = true;
        } else {
          console.log(`App not yet implemented: ${selected.name}`);
          getAudio()?.play(Sounds.ERROR);
          handled = true;
        }
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

    // Draw bottom bar
    this.drawBottomBar(matrix);

    // Draw app icons in grid
    for (let i = 0; i < this.apps.length; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;

      const x = this.startX + col * (this.iconSize + this.colSpacing);
      const y = this.startY + row * (this.iconSize + this.rowSpacing);

      this.drawIcon(matrix, this.apps[i], x, y, i === this.selectedIndex);
    }

    // Render games popup on top if visible
    this.gamesPopup.render(matrix);

    // Render help modal on top if visible
    this.helpModal.render(matrix);

    this.dirty = false;
  }

  private drawTitleBar(matrix: DisplayBuffer): void {
    // Dark background bar for header - increased brightness for visibility
    matrix.rect(0, 0, 256, 16, [50, 50, 50], true);

    // Compact header: 'pizxel' on left, time on right
    matrix.text("pizxel", 4, 4, this.textColor);

    // Show current time on right
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const timeText = `${hours}:${minutes}`;
    const timeWidth = timeText.length * 8;
    matrix.text(timeText, 256 - timeWidth - 4, 4, this.textColor);

    // No divider line - header background provides visual separation
  }

  private drawBottomBar(matrix: DisplayBuffer): void {
    const barY = 176; // Bottom bar at y=176 (16px height)

    if (this.errorMessage) {
      // Error state: red background, white text
      matrix.rect(0, barY, 256, 16, [200, 0, 0], true);

      // Show scrollable window of error message
      const maxChars = 28; // Leave room for scroll indicators
      const canScrollLeft = this.errorScrollOffset > 0;
      const canScrollRight =
        this.errorScrollOffset + maxChars < this.errorMessage.length;

      // Extract visible portion
      let message = this.errorMessage.substring(
        this.errorScrollOffset,
        this.errorScrollOffset + maxChars
      );

      // Add scroll indicators with comma/period hint
      if (canScrollLeft && canScrollRight) {
        message = "<" + message + ">";
      } else if (canScrollLeft) {
        message = "<" + message + " ";
      } else if (canScrollRight) {
        message = " " + message + ">";
      }

      const messageWidth = message.length * 8;
      const messageX = Math.floor((256 - messageWidth) / 2);
      matrix.text(message, messageX, barY + 4, [255, 255, 255]);
    } else {
      // Normal state: dark background like top bar
      matrix.rect(0, barY, 256, 16, [50, 50, 50], true);

      // Show selected app name
      if (this.apps.length > 0 && this.selectedIndex < this.apps.length) {
        const selectedApp = this.apps[this.selectedIndex];
        const appName = selectedApp.name;
        const nameWidth = appName.length * 8;
        const nameX = Math.floor((256 - nameWidth) / 2);
        matrix.text(appName, nameX, barY + 4, this.textColor);
      }
    }
  }

  private drawIcon(
    matrix: DisplayBuffer,
    icon: AppIcon,
    x: number,
    y: number,
    selected: boolean
  ): void {
    // Draw icon background (subtle)
    const bgShade: [number, number, number] = [30, 30, 45];
    matrix.rect(
      x + 1,
      y + 1,
      this.iconSize - 2,
      this.iconSize - 2,
      bgShade,
      true
    );

    // Draw selection border INSIDE for selected icon (ZX Spectrum bright colors)
    if (selected) {
      // Double border effect for selection - INSIDE the icon
      matrix.rect(
        x + 2,
        y + 2,
        this.iconSize - 4,
        this.iconSize - 4,
        this.selectedColor,
        false
      );
      matrix.rect(
        x + 3,
        y + 3,
        this.iconSize - 6,
        this.iconSize - 6,
        this.selectedColor,
        false
      );
    }

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
      console.warn(
        `[Launcher] Failed to render emoji ${icon.emoji} for ${icon.name}`
      );
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

    // No text label - app name shown in bottom bar when selected
  }
}
